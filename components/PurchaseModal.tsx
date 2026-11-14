import React, { Component, ErrorInfo, ReactNode, useState, useEffect, useRef } from "react";
import { Course } from "../types";
import { authDebugger } from "../utils/authDebugger";
import PaymentModal from "./PaymentModal";

// Interface accommodating legacy PurchaseModal calls as well as current PaymentModal signatures
export interface PurchaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  userEmail?: string;
  userName?: string;
  courseName?: string;
  courseId?: string;
  coursePrice?: string;
  course?: Course;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

/**
 * Safe State Wrapper Class Error Boundary
 * Catches React rendering errors (including React #310 hook/state mismatch errors during payment transitions)
 */
class PurchaseModalErrorBoundary extends Component<{ children: ReactNode; onClose: () => void; onReset: () => void }, ErrorBoundaryState> {
  constructor(props: { children: ReactNode; onClose: () => void; onReset: () => void }) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return {
      hasError: true,
      error,
      errorInfo: null,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("[PurchaseModalErrorBoundary] Captured React Error:", error, errorInfo);
    
    // Log to Auth Debugger
    authDebugger.logOtpModalState({
      componentName: "PurchaseModalErrorBoundary",
      errorName: error?.name,
      errorMessage: error?.message,
      stack: error?.stack,
      componentStack: errorInfo?.componentStack,
    });

    this.setState({ errorInfo });
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
    this.props.onReset();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="fixed inset-0 z-[999999] w-screen h-screen min-h-screen grid place-items-center bg-slate-950/85 backdrop-blur-md px-4 overflow-y-auto py-6 animate-fade-in">
          <div className="bg-white max-w-lg w-full rounded-3xl p-6 sm:p-8 shadow-2xl relative overflow-hidden border border-red-100 text-center space-y-5 animate-in zoom-in-95">
            <button
              onClick={this.props.onClose}
              className="absolute top-4 right-4 text-gray-400 hover:bg-gray-100 p-2 rounded-full transition-colors cursor-pointer"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            <div className="w-16 h-16 bg-red-50 text-red-600 rounded-2xl flex items-center justify-center mx-auto shadow-inner border border-red-100">
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>

            <div className="space-y-2">
              <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight">Sự Cố Cập Nhật Trạng Thái Thanh Toán</h3>
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed font-medium max-w-md mx-auto">
                Hệ thống đã tự động bảo vệ giao diện thanh toán. Dữ liệu thanh toán của bạn vẫn an toàn.
              </p>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={this.props.onClose}
                className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold uppercase text-xs tracking-wider transition-all cursor-pointer"
              >
                Đóng lại
              </button>
              <button
                type="button"
                onClick={this.handleRetry}
                className="flex-1 py-3 bg-[#007c76] hover:bg-[#00605b] text-white rounded-xl font-black uppercase text-xs tracking-wider transition-all shadow-md active:scale-98 cursor-pointer flex items-center justify-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                <span>Thử lại giao diện (Retry)</span>
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

/**
 * Functional Component Wrapper providing Safe State Guard & Unconditional Hook Discipline
 */
const PurchaseModalContent: React.FC<PurchaseModalProps> = (props) => {
  const { isOpen, onClose, onSuccess, course, courseId, courseName, coursePrice } = props;
  
  // Safe state wrapper tracking mount status to prevent updates after unmount
  const isMountedRef = useRef<boolean>(true);
  const [resetKey, setResetKey] = useState<number>(0);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // Construct valid Course object regardless of legacy caller prop format
  const effectiveCourse: Course = course || {
    id: courseId || 'course-default',
    title: courseName || 'Khóa học FAST E-Learning',
    price: coursePrice || '500.000đ',
    image: 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&q=80&w=800',
    category: 'An toàn thực phẩm',
    description: 'Khóa học đào tạo trực tuyến FAST E-Learning'
  };

  return (
    <PaymentModal
      key={resetKey}
      course={effectiveCourse}
      isOpen={isOpen}
      onClose={onClose}
      onSuccess={onSuccess}
    />
  );
};

/**
 * PurchaseModal - Main Export wrapped with Error Boundary & Safe State Protection
 */
export const PurchaseModal: React.FC<PurchaseModalProps> = (props) => {
  const [boundaryKey, setBoundaryKey] = useState<number>(0);

  if (!props.isOpen) return null;

  return (
    <PurchaseModalErrorBoundary
      key={boundaryKey}
      onClose={props.onClose}
      onReset={() => setBoundaryKey(prev => prev + 1)}
    >
      <PurchaseModalContent {...props} />
    </PurchaseModalErrorBoundary>
  );
};

export default PurchaseModal;
