import { authDebugger } from '../utils/authDebugger';

export interface OtpVerificationLog {
  action: 'send_request' | 'verify_request' | 'modal_toggle' | 'timer_event';
  timestamp: string;
  payload: any;
  status: 'pending' | 'success' | 'failure';
}

/**
 * Diagnostic logger specifically wrapping the OTP/EmailJS verification lifecycle steps.
 */
export const otpLogger = {
  /**
   * Wraps and logs the fetch call (which represents client-side EmailJS proxy dispatch).
   */
  wrapOtpSend: async (
    email: string,
    name: string,
    sendFetchPromise: () => Promise<Response>
  ): Promise<any> => {
    const timestamp = new Date().toISOString();
    console.log(`[OTPLogger:EmailJS_Send] [${timestamp}] Starting OTP send request for:`, { email, name });
    
    authDebugger.logEmailJsFlow({
      step: 'initiation',
      email,
      recipientName: name
    });

    const startTime = Date.now();
    try {
      authDebugger.logEmailJsFlow({
        step: 'fetching',
        email
      });

      const response = await sendFetchPromise();
      const durationMs = Date.now() - startTime;
      const status = response.status;
      const data = await response.json().catch(() => null);

      console.log(`[OTPLogger:EmailJS_Send] [${new Date().toISOString()}] Server responded with status:`, status, data);

      if (response.ok && data?.success) {
        authDebugger.logEmailJsFlow({
          step: 'resolved',
          email,
          status,
          success: true,
          fallbackOtp: data.fallback ? data.otp : undefined,
          durationMs,
          payload: data
        });

        if (data.fallback && data.otp) {
          authDebugger.logEmailJsFlow({
            step: 'fallback_triggered',
            email,
            fallbackOtp: data.otp,
            durationMs,
            payload: data
          });
        }
        return { success: true, data };
      } else {
        const errorMsg = data?.error || `Failed with HTTP status ${status}`;
        authDebugger.logEmailJsFlow({
          step: 'rejected',
          email,
          status,
          error: errorMsg,
          durationMs,
          payload: data
        });
        return { success: false, error: errorMsg };
      }
    } catch (err: any) {
      const durationMs = Date.now() - startTime;
      const errorMsg = err?.message || String(err);
      console.error(`[OTPLogger:EmailJS_Send] Promise execution failed:`, err);
      authDebugger.logEmailJsFlow({
        step: 'rejected',
        email,
        error: errorMsg,
        durationMs
      });
      return { success: false, error: errorMsg };
    }
  },

  /**
   * Logs modal visibility state toggling explicitly.
   */
  logModalToggle: (modalName: string, isVisible: boolean, triggerSource: string, extra?: any) => {
    const timestamp = new Date().toISOString();
    console.log(
      `%c[OTPLogger:ModalToggle] [${timestamp}] ${modalName} visibility changed to: ${String(isVisible).toUpperCase()} (Triggered via ${triggerSource})`,
      `color: ${isVisible ? '#0d9488' : '#e11d48'}; font-weight: bold; font-size: 11px;`
    );
    authDebugger.logModalToggle(modalName, isVisible, triggerSource, extra);
  },

  /**
   * Custom hook/handler to log state-settlers in lifecycle loops.
   */
  logAuthListenerEvent: (user: any, authResolved: boolean, message: string) => {
    const timestamp = new Date().toISOString();
    console.log(
      `%c[OTPLogger:AuthListener] [${timestamp}] ${message}`,
      'color: #3b82f6; font-weight: bold;',
      {
        uid: user?.uid || null,
        email: user?.email || null,
        authResolved
      }
    );
    authDebugger.logAuthListenerEvent(user, authResolved, message);
  }
};
