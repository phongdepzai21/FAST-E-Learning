/**
 * Diagnostic Utility for Authentication, OTP Visibility, and EmailJS Flows
 * Used to trace real-time execution flows and state transitions across components.
 */

export interface OtpDebugInfo {
  componentName: string;
  isOpen: boolean;
  otpFormVisible: boolean;
  userInputLength: number;
  hasNotice: boolean;
  hasError: boolean;
  countdown: number;
}

export interface EmailJsFlowInfo {
  step: 'initiation' | 'fetching' | 'resolved' | 'rejected' | 'fallback_triggered';
  email: string;
  recipientName?: string;
  success?: boolean;
  status?: number;
  error?: string;
  fallbackOtp?: string;
}

export const authDebugger = {
  /**
   * Logs current OTP modal visibility states and alerts if any inconsistencies are detected.
   */
  logOtpModalState: (info: OtpDebugInfo) => {
    console.group(`[AuthDebugger:OTP_Modal] ${info.componentName}`);
    console.log("- Modal Open (isOpen):", info.isOpen);
    console.log("- OTP Form Visible (showOtpForm):", info.otpFormVisible);
    console.log("- User Input Length:", info.userInputLength);
    console.log("- Has Notice Message:", info.hasNotice);
    console.log("- Has Error Message:", info.hasError);
    console.log("- Cooldown Countdown:", info.countdown);

    // Diagnostic Warnings
    if (info.isOpen && !info.otpFormVisible && info.countdown > 0) {
      console.warn("⚠️ [AuthDebugger:Inconsistency] Modal is open, but OTP form is hidden while a countdown timer is active.");
    }
    if (!info.isOpen && info.otpFormVisible) {
      console.warn("⚠️ [AuthDebugger:Inconsistency] OTP Form is flagged as visible, but the outer modal itself is closed.");
    }
    console.groupEnd();
  },

  /**
   * Logs the lifecycle step of an EmailJS dispatch operation.
   */
  logEmailJsFlow: (info: EmailJsFlowInfo) => {
    const timestamp = new Date().toISOString();
    const prefix = `[AuthDebugger:EmailJS] [${timestamp}]`;

    switch (info.step) {
      case 'initiation':
        console.log(`${prefix} 🚀 Starting EmailJS delivery sequence to email: ${info.email}`);
        break;
      case 'fetching':
        console.log(`${prefix} 📡 Fetch promise issued to /api/otp/send. Awaiting resolution...`);
        break;
      case 'resolved':
        console.log(`${prefix} ✅ Fetch promise resolved successfully with status ${info.status}.`, {
          success: info.success,
          fallbackTriggered: !!info.fallbackOtp
        });
        break;
      case 'fallback_triggered':
        console.warn(`${prefix} ⚠️ EmailJS delivery fell back to server-side local generation. Autofilling backup OTP.`);
        break;
      case 'rejected':
        console.error(`${prefix} ❌ Fetch promise rejected/failed. Reason:`, info.error);
        break;
    }
  },

  /**
   * Traces synchronization between Firebase Auth status and OTP state inside layout/routing layers.
   */
  debugAuthAndOtpSync: (user: any, authResolved: boolean, otpPending: boolean) => {
    console.group(`[AuthDebugger:Auth_Sync]`);
    console.log("- User Object Exist:", !!user);
    if (user) {
      console.log("- User UID:", user.uid);
      console.log("- User Email:", user.email);
    }
    console.log("- Firebase Auth Resolved:", authResolved);
    console.log("- OTP Pending State:", otpPending);

    if (otpPending && !user) {
      console.error("❌ [AuthDebugger:Error] OTP is marked as pending, but no authenticated user context exists!");
    }
    console.groupEnd();
  }
};
