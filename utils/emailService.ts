import emailjs from '@emailjs/browser';

export const sendOtpViaEmailJS = async (toEmail: string, toName: string, otpCode: string): Promise<{ success: boolean; reason?: 'MISSING_KEYS' | 'FAILED'; error?: string }> => {
  const serviceId = import.meta.env.VITE_EMAILJS_SERVICE_ID || "service_rzb3ipm";
  const templateId = import.meta.env.VITE_EMAILJS_TEMPLATE_ID || "template_1nq488j";
  const publicKey = import.meta.env.VITE_EMAILJS_PUBLIC_KEY || "P5IG0fzzQJSm5e4P-";

  if (!serviceId || !templateId || !publicKey) {
    console.warn("EmailJS keys are missing. Falling back...");
    return { success: false, reason: 'MISSING_KEYS' };
  }

  try {
    const templateParams = {
      to_name: toName,
      otp_code: otpCode,
      to_email: toEmail,
    };

    await emailjs.send(serviceId, templateId, templateParams, publicKey);
    return { success: true };
  } catch (err: any) {
    console.error("EmailJS dispatch failed:", err);
    return { 
      success: false, 
      reason: 'FAILED', 
      error: err?.text || err?.message || String(err) 
    };
  }
};
