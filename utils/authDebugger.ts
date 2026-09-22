/**
 * Diagnostic Utility & Real-Time Event Store for Authentication, OTP Visibility, and EmailJS Flows.
 * Tracks and broadcasts real-time state for development diagnostics.
 */

export interface OtpDebugInfo {
  componentName: string;
  isOpen: boolean;
  otpFormVisible: boolean;
  userInputLength: number;
  hasNotice: boolean;
  hasError: boolean;
  countdown: number;
  extra?: any;
}

export interface EmailJsFlowInfo {
  step: 'initiation' | 'fetching' | 'resolved' | 'rejected' | 'fallback_triggered';
  email: string;
  recipientName?: string;
  success?: boolean;
  status?: number;
  error?: string;
  fallbackOtp?: string;
  durationMs?: number;
  payload?: any;
}

export interface DiagnosticLogEntry {
  id: string;
  timestamp: string;
  category: 'auth' | 'modal' | 'emailjs' | 'anomaly' | 'system';
  level: 'info' | 'success' | 'warn' | 'error';
  title: string;
  details?: string;
  payload?: any;
  durationMs?: number;
}

export interface ModalRecord {
  componentName: string;
  isOpen: boolean;
  otpFormVisible: boolean;
  userInputLength: number;
  hasNotice: boolean;
  hasError: boolean;
  countdown: number;
  lastUpdated: string;
  triggerSource?: string;
}

export interface PromiseRecord {
  id: string;
  startTime: number;
  timestamp: string;
  email: string;
  recipientName?: string;
  step: 'initiation' | 'fetching' | 'resolved' | 'rejected' | 'fallback_triggered';
  status?: number;
  success?: boolean;
  error?: string;
  fallbackOtp?: string;
  durationMs?: number;
  payload?: any;
}

export interface DiagnosticState {
  auth: {
    status: 'initializing' | 'logged_in' | 'logged_out' | 'error';
    authResolved: boolean;
    currentUser: {
      uid: string;
      email: string | null;
      displayName: string | null;
      emailVerified: boolean;
      providerId?: string;
      lastLoginAt?: string;
    } | null;
    lastUpdated: string;
    eventsCount: number;
  };
  modals: {
    activeModals: Record<string, ModalRecord>;
    history: Array<{
      id: string;
      timestamp: string;
      modalName: string;
      isVisible: boolean;
      triggerSource: string;
    }>;
    anomalies: Array<{
      id: string;
      timestamp: string;
      severity: 'warn' | 'error';
      message: string;
      componentName: string;
    }>;
  };
  emailjs: {
    activeCount: number;
    totalRequests: number;
    successCount: number;
    rejectedCount: number;
    fallbackCount: number;
    avgDurationMs: number;
    recentPromises: PromiseRecord[];
  };
  logs: DiagnosticLogEntry[];
}

// Initial state snapshot
const initialState: DiagnosticState = {
  auth: {
    status: 'initializing',
    authResolved: false,
    currentUser: null,
    lastUpdated: new Date().toISOString(),
    eventsCount: 0,
  },
  modals: {
    activeModals: {},
    history: [],
    anomalies: [],
  },
  emailjs: {
    activeCount: 0,
    totalRequests: 0,
    successCount: 0,
    rejectedCount: 0,
    fallbackCount: 0,
    avgDurationMs: 0,
    recentPromises: [],
  },
  logs: [],
};

// Singleton reactive state container
class DiagnosticStore {
  private state: DiagnosticState = { ...initialState };
  private subscribers: Set<(state: DiagnosticState) => void> = new Set();
  private maxLogs = 200;
  private pendingStartTimes: Map<string, number> = new Map();

  constructor() {
    // Add initial startup log
    this.addLog({
      category: 'system',
      level: 'info',
      title: 'Khởi tạo Diagnostic Hub Dev Mode',
      details: 'Hệ thống giám sát Auth Listener, OTP Modal & EmailJS Promise bắt đầu hoạt động.',
      payload: { mode: typeof import.meta !== 'undefined' ? import.meta.env?.MODE : 'development' }
    });
  }

  public getState(): DiagnosticState {
    return this.state;
  }

  public subscribe(callback: (state: DiagnosticState) => void): () => void {
    this.subscribers.add(callback);
    callback(this.state);
    return () => {
      this.subscribers.delete(callback);
    };
  }

  private notify() {
    // Clone state shallowly to trigger React updates
    const snapshot = { ...this.state };
    this.subscribers.forEach((cb) => {
      try {
        cb(snapshot);
      } catch (err) {
        console.error('[DiagnosticStore:SubscriberError]', err);
      }
    });

    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent('dev_auth_diagnostic_update', { detail: snapshot })
      );
    }
  }

  private addLog(entry: Omit<DiagnosticLogEntry, 'id' | 'timestamp'>) {
    const newLog: DiagnosticLogEntry = {
      id: `log-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      timestamp: new Date().toISOString(),
      ...entry,
    };
    this.state.logs = [newLog, ...this.state.logs.slice(0, this.maxLogs - 1)];
  }

  // --- 1. AUTH LISTENER TRACKING ---
  public logAuthListenerEvent(user: any, authResolved: boolean, message: string) {
    const timestamp = new Date().toISOString();
    const isUserPresent = !!user;

    const currentAuthUser = user
      ? {
          uid: user.uid,
          email: user.email,
          displayName: user.displayName,
          emailVerified: !!user.emailVerified,
          providerId: user.providerData?.[0]?.providerId || user.providerId,
          lastLoginAt: user.metadata?.lastSignInTime || timestamp,
        }
      : null;

    this.state.auth = {
      status: isUserPresent ? 'logged_in' : 'logged_out',
      authResolved,
      currentUser: currentAuthUser,
      lastUpdated: timestamp,
      eventsCount: this.state.auth.eventsCount + 1,
    };

    this.addLog({
      category: 'auth',
      level: isUserPresent ? 'success' : 'info',
      title: `Auth Listener: ${isUserPresent ? 'Đăng nhập thành công' : 'Chưa xác thực / Đã đăng xuất'}`,
      details: message,
      payload: {
        user: currentAuthUser,
        authResolved,
      },
    });

    this.notify();
  }

  // --- 2. OTP MODAL STATE & VISIBILITY TRACKING ---
  public logOtpModalState(info: OtpDebugInfo) {
    const timestamp = new Date().toISOString();
    const existing = this.state.modals.activeModals[info.componentName];

    this.state.modals.activeModals[info.componentName] = {
      componentName: info.componentName,
      isOpen: info.isOpen,
      otpFormVisible: info.otpFormVisible,
      userInputLength: info.userInputLength,
      hasNotice: info.hasNotice,
      hasError: info.hasError,
      countdown: info.countdown,
      lastUpdated: timestamp,
      triggerSource: info.extra?.triggerSource || existing?.triggerSource || 'React State Change',
    };

    // Anomaly Check 1: Modal Open, OTP form hidden while countdown active
    if (info.isOpen && !info.otpFormVisible && info.countdown > 0) {
      const anomalyMsg = `[Bất thường] Modal "${info.componentName}" đang mở nhưng form OTP bị ẩn khi bộ đếm cooldown (${info.countdown}s) vẫn đang chạy.`;
      this.state.modals.anomalies.unshift({
        id: `anom-${Date.now()}`,
        timestamp,
        severity: 'warn',
        message: anomalyMsg,
        componentName: info.componentName,
      });
      this.addLog({
        category: 'anomaly',
        level: 'warn',
        title: `Cảnh báo giao diện OTP: ${info.componentName}`,
        details: anomalyMsg,
        payload: info,
      });
    }

    // Anomaly Check 2: Modal Closed but OTP Form flag is True
    if (!info.isOpen && info.otpFormVisible) {
      const anomalyMsg = `[Bất thường] Form OTP của "${info.componentName}" được đặt cờ hiển thị (showOtpForm=true) nhưng Modal cha đang đóng (isOpen=false).`;
      this.state.modals.anomalies.unshift({
        id: `anom-${Date.now()}`,
        timestamp,
        severity: 'warn',
        message: anomalyMsg,
        componentName: info.componentName,
      });
      this.addLog({
        category: 'anomaly',
        level: 'warn',
        title: `Cảnh báo logic Modal: ${info.componentName}`,
        details: anomalyMsg,
        payload: info,
      });
    }

    this.notify();
  }

  public logModalToggle(modalName: string, isVisible: boolean, triggerSource: string, extra?: any) {
    const timestamp = new Date().toISOString();

    this.state.modals.history.unshift({
      id: `toggle-${Date.now()}`,
      timestamp,
      modalName,
      isVisible,
      triggerSource,
    });

    // Update active modal record
    const existing = this.state.modals.activeModals[modalName] || {
      componentName: modalName,
      isOpen: isVisible,
      otpFormVisible: isVisible,
      userInputLength: 0,
      hasNotice: false,
      hasError: false,
      countdown: 0,
      lastUpdated: timestamp,
    };

    this.state.modals.activeModals[modalName] = {
      ...existing,
      isOpen: isVisible,
      triggerSource,
      lastUpdated: timestamp,
    };

    this.addLog({
      category: 'modal',
      level: isVisible ? 'info' : 'info',
      title: `Chuyển trạng thái Modal: ${modalName} ➔ ${isVisible ? 'HIỆN (OPEN)' : 'ẨN (CLOSED)'}`,
      details: `Nguồn kích hoạt: ${triggerSource}`,
      payload: { modalName, isVisible, triggerSource, extra },
    });

    this.notify();
  }

  // --- 3. EMAILJS & OTP PROMISE RESOLUTION TRACKING ---
  public logEmailJsFlow(info: EmailJsFlowInfo) {
    const timestamp = new Date().toISOString();
    const promiseKey = info.email.toLowerCase();

    let durationMs: number | undefined;

    if (info.step === 'initiation' || info.step === 'fetching') {
      if (!this.pendingStartTimes.has(promiseKey)) {
        this.pendingStartTimes.set(promiseKey, Date.now());
      }
      this.state.emailjs.activeCount = Math.max(1, this.state.emailjs.activeCount + 1);
    } else {
      const startTime = this.pendingStartTimes.get(promiseKey);
      if (startTime) {
        durationMs = Date.now() - startTime;
        this.pendingStartTimes.delete(promiseKey);
      }
      this.state.emailjs.activeCount = Math.max(0, this.state.emailjs.activeCount - 1);
      this.state.emailjs.totalRequests += 1;

      if (info.step === 'resolved') {
        this.state.emailjs.successCount += 1;
      } else if (info.step === 'rejected') {
        this.state.emailjs.rejectedCount += 1;
      } else if (info.step === 'fallback_triggered') {
        this.state.emailjs.fallbackCount += 1;
      }

      if (durationMs) {
        const totalReq = this.state.emailjs.totalRequests;
        this.state.emailjs.avgDurationMs = Math.round(
          (this.state.emailjs.avgDurationMs * (totalReq - 1) + durationMs) / totalReq
        );
      }
    }

    const promiseRecord: PromiseRecord = {
      id: `req-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`,
      startTime: this.pendingStartTimes.get(promiseKey) || Date.now(),
      timestamp,
      email: info.email,
      recipientName: info.recipientName,
      step: info.step,
      status: info.status,
      success: info.success,
      error: info.error,
      fallbackOtp: info.fallbackOtp,
      durationMs: durationMs || info.durationMs,
      payload: info.payload,
    };

    this.state.emailjs.recentPromises = [
      promiseRecord,
      ...this.state.emailjs.recentPromises.slice(0, 49),
    ];

    let logTitle = `EmailJS/OTP [${info.step.toUpperCase()}] ➔ ${info.email}`;
    let logLevel: DiagnosticLogEntry['level'] = 'info';

    if (info.step === 'resolved') {
      logTitle = `✅ EmailJS Promise Đã Giải Quyết (HTTP ${info.status || 200}) ➔ ${info.email}`;
      logLevel = 'success';
    } else if (info.step === 'rejected') {
      logTitle = `❌ EmailJS Promise Thất Bại / Từ Chối ➔ ${info.email}`;
      logLevel = 'error';
    } else if (info.step === 'fallback_triggered') {
      logTitle = `⚠️ Kích hoạt OTP Dự Phòng Nội Bộ (Server Fallback) ➔ ${info.email}`;
      logLevel = 'warn';
    }

    this.addLog({
      category: 'emailjs',
      level: logLevel,
      title: logTitle,
      details: info.error ? `Lỗi: ${info.error}` : `Thời gian xử lý: ${durationMs ? `${durationMs}ms` : 'Đang xử lý...'}`,
      payload: { ...info, durationMs },
      durationMs,
    });

    this.notify();
  }

  // Debug Auth and OTP Sync compatibility method
  public debugAuthAndOtpSync(user: any, authResolved: boolean, otpPending: boolean) {
    if (otpPending && !user) {
      const anomalyMsg = `[Bất thường] OTP đang ở trạng thái Pending nhưng người dùng chưa có phiên xác thực hợp lệ!`;
      this.addLog({
        category: 'anomaly',
        level: 'error',
        title: 'Lỗi đồng bộ Auth & OTP Context',
        details: anomalyMsg,
        payload: { user, authResolved, otpPending },
      });
      this.notify();
    }
  }

  // Utility to clear logs
  public clearLogs() {
    this.state.logs = [];
    this.state.modals.history = [];
    this.state.modals.anomalies = [];
    this.state.emailjs.recentPromises = [];
    this.addLog({
      category: 'system',
      level: 'info',
      title: 'Đã xóa toàn bộ nhật ký chẩn đoán',
      details: 'Bảng theo dõi đã được làm mới.',
    });
    this.notify();
  }

  // Developer Test Tool: Dispatch real test OTP send
  public async testDispatchOtpSend(email: string, name: string): Promise<any> {
    this.logEmailJsFlow({
      step: 'initiation',
      email,
      recipientName: name,
    });

    const startTime = Date.now();
    try {
      this.logEmailJsFlow({
        step: 'fetching',
        email,
      });

      const response = await fetch('/api/otp/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, name }),
      });

      const durationMs = Date.now() - startTime;
      const status = response.status;
      const data = await response.json().catch(() => null);

      if (response.ok && data?.success) {
        this.logEmailJsFlow({
          step: 'resolved',
          email,
          status,
          success: true,
          fallbackOtp: data.fallback ? data.otp : undefined,
          durationMs,
          payload: data,
        });

        if (data.fallback && data.otp) {
          this.logEmailJsFlow({
            step: 'fallback_triggered',
            email,
            fallbackOtp: data.otp,
            durationMs,
            payload: data,
          });
        }
        return { success: true, data, durationMs };
      } else {
        const errorMsg = data?.error || `HTTP Error ${status}`;
        this.logEmailJsFlow({
          step: 'rejected',
          email,
          status,
          error: errorMsg,
          durationMs,
          payload: data,
        });
        return { success: false, error: errorMsg, durationMs };
      }
    } catch (err: any) {
      const durationMs = Date.now() - startTime;
      const errorMsg = err?.message || String(err);
      this.logEmailJsFlow({
        step: 'rejected',
        email,
        error: errorMsg,
        durationMs,
      });
      return { success: false, error: errorMsg, durationMs };
    }
  }
}

// Export singleton instance
export const authDebugger = new DiagnosticStore();
