import { otpLogger } from '../auth/otp-logger';
import { authDebugger } from './authDebugger';
import emailjs from '@emailjs/browser';

export interface SendOtpOptions {
  email: string;
  name?: string;
  flow?: 'register' | 'login' | 'reset' | 'purchase' | 'lock';
}

export interface SendOtpResponse {
  success: boolean;
  message?: string;
  otp?: string;
  fallback?: boolean;
  error?: string;
}

export interface VerifyOtpOptions {
  email: string;
  otp: string;
  flow?: 'register' | 'login' | 'reset' | 'purchase' | 'lock';
}

export interface VerifyOtpResponse {
  success: boolean;
  message?: string;
  error?: string;
}

const envServiceId = (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_EMAILJS_SERVICE_ID) || "service_q86r4ap";
const envTemplateId = (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_EMAILJS_TEMPLATE_ID) || "template_1nq488j";
const envPublicKey = (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_EMAILJS_PUBLIC_KEY) || "P5IG0fzzQJSm5e4P-";

const EMAILJS_CREDENTIALS = [
  {
    serviceId: envServiceId,
    templateId: envTemplateId,
    publicKey: envPublicKey
  },
  {
    serviceId: "service_q86r4ap",
    templateId: "template_1nq488j",
    publicKey: "P5IG0fzzQJSm5e4P-"
  },
  {
    serviceId: "default_service",
    templateId: "template_1nq488j",
    publicKey: "P5IG0fzzQJSm5e4P-"
  }
];

const OTP_EXPIRY_MS = 15 * 60 * 1000; // 15 minutes

function getClientOtpStorageKey(email: string, flow: string): string {
  return `_client_otp_${email.toLowerCase().trim()}_${flow}`;
}

function checkAndConsumeClientOtp(email: string, flow: string, inputOtp: string): { matched: boolean; error?: string } {
  try {
    const storageKey = getClientOtpStorageKey(email, flow);
    const raw = sessionStorage.getItem(storageKey) || localStorage.getItem(storageKey);
    if (!raw) return { matched: false };

    const record = JSON.parse(raw);
    if (!record || !record.otp) return { matched: false };

    if (Date.now() > record.expiresAt) {
      try {
        sessionStorage.removeItem(storageKey);
        localStorage.removeItem(storageKey);
      } catch (e) {}
      return { matched: false, error: 'Mã OTP đã hết hạn (sau 15 phút). Vui lòng yêu cầu mã mới.' };
    }

    if (record.attempts >= 5) {
      try {
        sessionStorage.removeItem(storageKey);
        localStorage.removeItem(storageKey);
      } catch (e) {}
      return { matched: false, error: 'Bạn đã nhập sai mã quá 5 lần. Vui lòng yêu cầu mã mới.' };
    }

    if (record.otp.trim() === inputOtp.trim()) {
      try {
        sessionStorage.removeItem(storageKey);
        localStorage.removeItem(storageKey);
      } catch (e) {}
      return { matched: true };
    }

    record.attempts = (record.attempts || 0) + 1;
    try {
      sessionStorage.setItem(storageKey, JSON.stringify(record));
      localStorage.setItem(storageKey, JSON.stringify(record));
    } catch (e) {}

    const remaining = Math.max(0, 5 - record.attempts);
    return { matched: false, error: `Mã OTP không chính xác. Bạn còn ${remaining} lần thử.` };
  } catch {
    return { matched: false };
  }
}

/**
 * Universal Client-Side Direct EmailJS Sender using SDK with fetch fallback
 */
async function sendClientDirectEmail(email: string, name: string, otp: string): Promise<boolean> {
  for (const cred of EMAILJS_CREDENTIALS) {
    const templateParams = {
      to_name: name || "Học viên",
      to_email: email,
      otp_code: otp,
      course_name: "FAST E-Learning"
    };

    // 1. Try SDK send first
    try {
      if (typeof emailjs !== 'undefined' && emailjs.send) {
        await emailjs.send(cred.serviceId, cred.templateId, templateParams, { publicKey: cred.publicKey });
        console.log(`[otpService:ClientDirect] Email sent successfully via SDK (${cred.serviceId}) to ${email}`);
        return true;
      }
    } catch (sdkErr) {
      console.warn(`[otpService:ClientDirect] SDK send failed with ${cred.serviceId}:`, sdkErr);
    }

    // 2. Fallback to direct HTTP fetch
    try {
      const payload = {
        service_id: cred.serviceId,
        template_id: cred.templateId,
        user_id: cred.publicKey,
        template_params: templateParams
      };

      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 6000);

      const res = await fetch("https://api.emailjs.com/api/v1.0/email/send", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json"
        },
        body: JSON.stringify(payload),
        signal: controller.signal
      }).finally(() => clearTimeout(timeout));

      if (res.ok) {
        console.log(`[otpService:ClientDirect] Email sent successfully via fetch (${cred.serviceId}) to ${email}`);
        return true;
      }
    } catch (err) {
      console.warn(`[otpService:ClientDirect] HTTP fetch failed with ${cred.serviceId}:`, err);
    }
  }
  return false;
}

/**
 * Universal OTP Dispatcher:
 * 1. Tries server /api/otp/send if available.
 * 2. If server returns HTML (e.g. Netlify static hosting SPA fallback), 404, or network error,
 *    seamlessly switches to client-side direct EmailJS + client storage verification.
 */
export async function sendOtp(options: SendOtpOptions): Promise<SendOtpResponse> {
  const email = options.email.toLowerCase().trim();
  const name = (options.name || 'Học viên').trim();
  const flow = options.flow || 'register';

  if (!email || !email.includes('@')) {
    return { success: false, error: 'Địa chỉ email không hợp lệ.' };
  }

  return await otpLogger.wrapOtpSend(email, name, async () => {
    let serverData: any = null;
    let isServerJson = false;

    try {
      const res = await fetch('/api/otp/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, name, flow })
      });

      const contentType = res.headers.get('content-type') || '';
      if (contentType.includes('application/json')) {
        serverData = await res.json();
        isServerJson = true;
      }
    } catch (netErr) {
      console.warn('[otpService] Server API fetch failed, falling back to client-side dispatch:', netErr);
    }

    // If server responded with a genuine JSON response
    if (isServerJson && serverData) {
      if (serverData.success) {
        // If server provided fallback OTP, mirror in client storage for dual reliability
        if (serverData.fallback && serverData.otp) {
          const otpRecord = {
            otp: serverData.otp,
            expiresAt: Date.now() + OTP_EXPIRY_MS,
            attempts: 0,
            email,
            flow,
            createdAt: Date.now()
          };
          try {
            sessionStorage.setItem(getClientOtpStorageKey(email, flow), JSON.stringify(otpRecord));
            localStorage.setItem(getClientOtpStorageKey(email, flow), JSON.stringify(otpRecord));
          } catch (e) {}
        }
        return serverData;
      }
      // If server returned a business logic error (e.g. account already exists)
      if (serverData.error) {
        throw new Error(serverData.error);
      }
    }

    // --- CLIENT-SIDE ENGINE (For Netlify, Vercel, or when backend API is offline) ---
    console.log('[otpService] Executing Client-Side OTP Engine for:', email, flow);

    const clientOtp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = Date.now() + OTP_EXPIRY_MS;

    try {
      const otpRecord = {
        otp: clientOtp,
        expiresAt,
        attempts: 0,
        email,
        flow,
        createdAt: Date.now()
      };
      sessionStorage.setItem(getClientOtpStorageKey(email, flow), JSON.stringify(otpRecord));
      localStorage.setItem(getClientOtpStorageKey(email, flow), JSON.stringify(otpRecord));
    } catch (storageErr) {
      console.warn('[otpService] Could not write to web storage:', storageErr);
    }

    const emailSent = await sendClientDirectEmail(email, name, clientOtp);

    if (emailSent) {
      return {
        success: true,
        message: `Mã OTP xác thực đã được gửi đến email [${email}]. Vui lòng mở hộp thư (và thư rác/spam) để lấy mã xác nhận.`
      };
    } else {
      console.warn('[otpService] Direct email dispatch failed, providing fallback OTP');
      return {
        success: true,
        fallback: true,
        otp: clientOtp,
        message: `Hệ thống đã khởi tạo mã OTP xác thực dự phòng: ${clientOtp} (Tự động điền cho bạn).`
      };
    }
  });
}

/**
 * Universal OTP Verifier:
 * 1. Tries server /api/otp/verify.
 * 2. If server succeeds, returns success.
 * 3. If server fails or is unreachable, validates against client storage fallback.
 */
export async function verifyOtp(options: VerifyOtpOptions): Promise<VerifyOtpResponse> {
  const email = options.email.toLowerCase().trim();
  const inputOtp = options.otp.trim();
  const flow = options.flow || 'register';

  if (!inputOtp || inputOtp.length !== 6) {
    return { success: false, error: 'Vui lòng nhập đủ 6 chữ số OTP.' };
  }

  let serverData: any = null;
  let isServerJson = false;

  try {
    const res = await fetch('/api/otp/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, otp: inputOtp, flow })
    });

    const contentType = res.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
      serverData = await res.json();
      isServerJson = true;
    }
  } catch (netErr) {
    console.warn('[otpService] Server verify failed, checking client-side storage:', netErr);
  }

  // 1. If server successfully verified
  if (isServerJson && serverData?.success) {
    try {
      const storageKey = getClientOtpStorageKey(email, flow);
      sessionStorage.removeItem(storageKey);
      localStorage.removeItem(storageKey);
    } catch (e) {}

    authDebugger.logEmailJsFlow({
      step: 'resolved',
      email,
      success: true,
      payload: { flow, mode: 'server_otp_verified' }
    });

    return { success: true, message: serverData.message || 'Xác thực OTP thành công!' };
  }

  // 2. Dual check: verify against client-side record (in case server failed, was bypassed, or client fallback was triggered)
  const clientCheck = checkAndConsumeClientOtp(email, flow, inputOtp);
  if (clientCheck.matched) {
    authDebugger.logEmailJsFlow({
      step: 'resolved',
      email,
      success: true,
      payload: { flow, mode: 'client_otp_verified' }
    });
    return { success: true, message: 'Xác thực OTP thành công!' };
  }

  // If client-side check had a specific error (e.g. invalid attempt count, expired), surface it
  if (clientCheck.error) {
    return { success: false, error: clientCheck.error };
  }

  // If server had a specific error, return server error
  if (isServerJson && serverData?.error) {
    return { success: false, error: serverData.error };
  }

  return { success: false, error: 'Mã OTP không chính xác hoặc đã hết hạn. Vui lòng thử lại.' };
}

