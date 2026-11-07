/**
 * Payment State Logger & Diagnostic Utility for PurchaseModal & PaymentModal
 * Captures state transitions (Pending -> OTP_Verifying -> Processing -> Success / Failed)
 * and resolves specific error codes for transparency.
 */

export type PaymentState = 'INITIAL' | 'PENDING' | 'OTP_VERIFYING' | 'PROCESSING' | 'SUCCESS' | 'FAILED';

export interface PaymentStateLog {
  id: string;
  timestamp: string;
  fromState: PaymentState;
  toState: PaymentState;
  details: string;
  errorCode?: string;
  payload?: any;
}

export interface ErrorCodeInfo {
  code: string;
  title: string;
  description: string;
  solution: string;
}

export const ERROR_CODES: Record<string, ErrorCodeInfo> = {
  ERR_PAYMENT_TIMEOUT_408: {
    code: 'ERR_PAYMENT_TIMEOUT_408',
    title: 'Giao Dịch Hết Thời Gian Chờ (408)',
    description: 'Hệ thống chưa nhận được thông tin chuyển khoản từ ACB trong thời gian 3 phút.',
    solution: 'Kiểm tra lại lịch sử chuyển khoản app ngân hàng hoặc bấm "Thử lại mã QR mới".',
  },
  ERR_NETWORK_DISCONNECTED_503: {
    code: 'ERR_NETWORK_DISCONNECTED_503',
    title: 'Lỗi Kết Nối Máy Chủ (503)',
    description: 'Không thể kết nối đến API /api/check-payment do kết nối mạng gián đoạn.',
    solution: 'Vui lòng kiểm tra lại kết nối Wi-Fi/4G và bấm "Kiểm tra ngay".',
  },
  ERR_ORDER_NOT_FOUND_404: {
    code: 'ERR_ORDER_NOT_FOUND_404',
    title: 'Không Tìm Thấy Đơn Hàng (404)',
    description: 'Mã thanh toán hoặc đơn hàng chưa được khởi tạo thành công trên hệ thống.',
    solution: 'Bấm "Quay lại" và mở lại modal để khởi tạo đơn hàng mới.',
  },
  ERR_INVALID_OTP_400: {
    code: 'ERR_INVALID_OTP_400',
    title: 'Mã OTP Không Hợp Lệ (400)',
    description: 'Mã xác thực OTP 6 số nhập vào không chính xác hoặc đã quá 10 phút hết hạn.',
    solution: 'Kiểm tra lại email hoặc bấm "Gửi lại mã OTP mới".',
  },
  ERR_FIRESTORE_WRITE_500: {
    code: 'ERR_FIRESTORE_WRITE_500',
    title: 'Lỗi Kích Hoạt Quyền Học (500)',
    description: 'Thanh toán đã ghi nhận nhưng lỗi kết nối khi ghi dữ liệu truy cập khóa học.',
    solution: 'Đừng lo lắng, dữ liệu thanh toán đã lưu. Vui lòng tải lại trang hoặc liên hệ hỗ trợ.',
  },
  ERR_REACT_310_HANDLED: {
    code: 'ERR_REACT_310_HANDLED',
    title: 'Sự Cố Đồng Bộ Trạng Thái UI (R310)',
    description: 'Xung đột vòng đời React Hook trong quá trình chuyển đổi giao diện.',
    solution: 'Safe State Wrapper đã bảo vệ an toàn. Bấm "Thử lại giao diện".',
  },
};

class PaymentLoggerStore {
  private logs: PaymentStateLog[] = [];
  private currentState: PaymentState = 'INITIAL';
  private currentErrorCode: string | null = null;
  private listeners: Set<() => void> = new Set();

  public getCurrentState(): PaymentState {
    return this.currentState;
  }

  public getCurrentErrorCode(): string | null {
    return this.currentErrorCode;
  }

  public getLogs(): PaymentStateLog[] {
    return [...this.logs];
  }

  public subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify() {
    this.listeners.forEach((cb) => cb());
  }

  public logTransition(
    toState: PaymentState,
    details: string,
    errorCode?: string,
    payload?: any
  ) {
    const fromState = this.currentState;
    this.currentState = toState;
    if (errorCode) {
      this.currentErrorCode = errorCode;
    } else if (toState === 'SUCCESS' || toState === 'INITIAL') {
      this.currentErrorCode = null;
    }

    const logEntry: PaymentStateLog = {
      id: `plog-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      timestamp: new Date().toLocaleTimeString('vi-VN'),
      fromState,
      toState,
      details,
      errorCode,
      payload,
    };

    this.logs.unshift(logEntry);
    if (this.logs.length > 50) this.logs.pop();

    console.log(`[PaymentLogger] State Transition: [${fromState}] ➔ [${toState}] | Details: ${details} ${errorCode ? `| Code: ${errorCode}` : ''}`);
    this.notify();
  }

  public reset(initialState: PaymentState = 'INITIAL') {
    this.currentState = initialState;
    this.currentErrorCode = null;
    this.logs = [];
    this.notify();
  }
}

export const paymentLogger = new PaymentLoggerStore();
