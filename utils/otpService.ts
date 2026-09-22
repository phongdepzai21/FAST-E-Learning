import { otpLogger } from '../auth/otp-logger';
import { authDebugger } from './authDebugger';

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

const EMAILJS_CREDENTIALS = [
  {
    serviceId: "default_service",
    templateId: "template_1nq488j",
    publicKey: "P5IG0fzzQJSm5e4P-"
  },
  ...(typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_EMAILJS_PUBLIC_KEY && import.meta.env.VITE_EMAILJS_PUBLIC_KEY !== "5XW2wWLI4bXG9aVEo" ? [{
    serviceId: import.meta.env.VITE_EMAILJS_SERVICE_ID || "default_service",
    templateId: import.meta.env.VITE_EMAILJS_TEMPLATE_ID || "template_1nq488j",
    publicKey: import.meta.env.VITE_EMAILJS_PUBLIC_KEY
  }] : [])
];

const OTP_EXPIRY_MS = 15 * 60 * 1000; // 15 minutes

function getClientOtpStorageKey(email: string, flow: string): string {
  return `_client_otp_${email.toLowerCase().trim()}_${flow}`;
}

/**
 * Universal Client-Side Direct EmailJS Sender
 */
async function sendClientDirectEmail(email: string, name: string, otp: string): Promise<boolean> {
  for (const cred of EMAILJS_CREDENTIALS) {
    try {
      const payload = {
        service_id: cred.serviceId,
        template_id: cred.templateId,
        user_id: cred.publicKey,
        template_params: {
          to_name: name || "Học viên",
          to_email: email,
          otp_code: otp,
          course_name: "FAST E-Learning"
        }
      };

      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 7000);

      const res = await fetch("https://api.emailjs.com/api/v1.0/email/send", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json"
        },
        body: JSON.stringify(payload),
        signal: controller.signal
      }).finally(() => clearTimeout(timeout));

      if (res.ok) {
        console.log(`[otpService:ClientDirect] Email sent successfully via ${cred.serviceId} to ${email}`);
        return true;
      }
    } catch (err) {
      console.warn(`[otpService:ClientDirect] Failed with ${cred.serviceId}:`, err);
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
 * 2. If server returns HTML or 404, verifies against client-side record.
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
    console.warn('[otpService] Server verify failed, falling back to client-side verification:', netErr);
  }

  if (isServerJson && serverData) {
    if (serverData.success) {
      return { success: true, message: serverData.message || 'Xác thực OTP thành công!' };
    }
    return { success: false, error: serverData.error || 'Mã OTP không chính xác hoặc đã hết hạn.' };
  }

  // --- CLIENT-SIDE VERIFICATION FALLBACK ---
  try {
    const storageKey = getClientOtpStorageKey(email, flow);
    const raw = sessionStorage.getItem(storageKey) || localStorage.getItem(storageKey);

    if (!raw) {
      return { success: false, error: 'Mã OTP đã hết hạn hoặc chưa được tạo. Vui lòng gửi lại mã.' };
    }

    const record = JSON.parse(raw);
    if (!record || !record.otp) {
      return { success: false, error: 'Dữ liệu OTP không hợp lệ. Vui lòng gửi lại mã.' };
    }

    if (Date.now() > record.expiresAt) {
      return { success: false, error: 'Mã OTP đã hết hạn (sau 15 phút). Vui lòng yêu cầu mã mới.' };
    }

    if (record.attempts >= 5) {
      return { success: false, error: 'Bạn đã nhập sai mã quá 5 lần. Vui lòng yêu cầu mã mới.' };
    }

    if (record.otp.trim() === inputOtp) {
      // Clear after successful verification
      try {
        sessionStorage.removeItem(storageKey);
        localStorage.removeItem(storageKey);
      } catch (e) {}

      authDebugger.logEmailJsFlow({
        step: 'resolved',
        email,
        success: true,
        payload: { flow, mode: 'client_otp_verified' }
      });

      return { success: true, message: 'Xác thực OTP thành công!' };
    } else {
      record.attempts = (record.attempts || 0) + 1;
      try {
        sessionStorage.setItem(storageKey, JSON.stringify(record));
        localStorage.setItem(storageKey, JSON.stringify(record));
      } catch (e) {}

      const remaining = Math.max(0, 5 - record.attempts);
      return {
        success: false,
        error: `Mã OTP không chính xác. Bạn còn ${remaining} lần thử.`
      };
    }
  } catch (err: any) {
    console.error('[otpService] Client verify exception:', err);
    return { success: false, error: 'Có lỗi khi xác thực mã OTP. Vui lòng thử lại.' };
  }
}
