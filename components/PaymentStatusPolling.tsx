import React, { useState, useEffect, useRef } from 'react';
import { Course } from '../types';
import { auth, db } from '../firebase';
import { doc, setDoc } from 'firebase/firestore';
import { formatVND, getVietQrUrl } from '../utils/qrService';
import { paymentLogger, ERROR_CODES } from '../utils/paymentLogger';

interface PaymentStatusPollingProps {
  course: Course;
  paymentCode: string;
  orderId: string;
  amount: number;
  config: {
    bankName: string;
    accountNo: string;
    accountName: string;
    bankId: string;
  };
  onSuccess: () => void;
  onBack: () => void;
  onRetry: () => void;
}

export const PaymentStatusPolling: React.FC<PaymentStatusPollingProps> = ({
  course,
  paymentCode,
  orderId,
  amount,
  config,
  onSuccess,
  onBack,
  onRetry,
}) => {
  // Safe State Guard: Prevent unmounted state updates
  const isMountedRef = useRef<boolean>(true);

  const [isCheckingPayment, setIsCheckingPayment] = useState<boolean>(false);
  const [isTimeout, setIsTimeout] = useState<boolean>(false);
  const [activeErrorCode, setActiveErrorCode] = useState<string | null>(null);
  const [showLogs, setShowLogs] = useState<boolean>(false);

  useEffect(() => {
    isMountedRef.current = true;
    paymentLogger.logTransition('PROCESSING', `Bắt đầu quét tự động trạng thái đơn hàng (Order: ${orderId || paymentCode})`);
    return () => {
      isMountedRef.current = false;
    };
  }, [orderId, paymentCode]);

  const safeSetState = <T,>(setter: React.Dispatch<React.SetStateAction<T>>, value: T | ((prev: T) => T)) => {
    if (isMountedRef.current) {
      setter(value);
    }
  };

  const cleanPaymentCode = paymentCode ? paymentCode.trim().toUpperCase() : 'FASTTEST';
  const transferMemo = cleanPaymentCode.startsWith('FAST') ? cleanPaymentCode : `FAST${cleanPaymentCode}`;
  const vietQrUrl = getVietQrUrl({
    bankId: config.bankId || 'acb',
    accountNo: config.accountNo,
    accountName: config.accountName,
    amount,
    memo: transferMemo,
    template: 'compact2',
  });

  const checkPaymentStatus = async () => {
    if (isTimeout || !isMountedRef.current) return;
    safeSetState(setIsCheckingPayment, true);
    try {
      const queryParam = orderId ? `orderId=${encodeURIComponent(orderId)}` : `paymentCode=${encodeURIComponent(paymentCode)}`;
      const res = await fetch(`/api/check-payment?${queryParam}`);
      
      if (!res.ok && res.status >= 500) {
        paymentLogger.logTransition('FAILED', `Lỗi máy chủ HTTP ${res.status}`, 'ERR_NETWORK_DISCONNECTED_503');
        safeSetState(setActiveErrorCode, 'ERR_NETWORK_DISCONNECTED_503');
      }

      const data = await res.json();
      
      if (data.success && (data.status === 'PAID' || data.status === 'completed')) {
        paymentLogger.logTransition('SUCCESS', `Thanh toán hợp lệ và xác nhận thành công từ ACB.`);
        safeSetState(setActiveErrorCode, null);

        const user = auth.currentUser;
        const userEmail = (user?.email || localStorage.getItem('user_email') || '').toLowerCase().trim();
        if (userEmail && course.id) {
          try {
            const docRef = doc(db, 'users', userEmail, 'purchased_courses', course.id);
            await setDoc(docRef, {
              courseId: course.id,
              courseTitle: course.title,
              purchasedAt: new Date().toISOString(),
              price: course.price || formatVND(amount),
              status: 'active',
              progress: 0,
              claimedVia: 'SEPAY_AUTO_POLL',
            }, { merge: true });
          } catch (e: any) {
            console.warn("[PaymentStatusPolling] Firestore write error:", e);
            paymentLogger.logTransition('FAILED', `Lỗi ghi dữ liệu mở khóa vào Firestore: ${e.message}`, 'ERR_FIRESTORE_WRITE_500');
            safeSetState(setActiveErrorCode, 'ERR_FIRESTORE_WRITE_500');
          }
        }
        localStorage.setItem(`course_unlocked_${course.id}`, 'true');
        setTimeout(() => {
          if (isMountedRef.current) {
            onSuccess();
          }
        }, 1000);
      } else if (data.status === 'NOT_FOUND') {
        paymentLogger.logTransition('FAILED', 'Không tìm thấy đơn hàng trên máy chủ', 'ERR_ORDER_NOT_FOUND_404');
        safeSetState(setActiveErrorCode, 'ERR_ORDER_NOT_FOUND_404');
      }
    } catch (err: any) {
      console.warn("[PaymentStatusPolling] Check payment polling error:", err);
      paymentLogger.logTransition('PROCESSING', `Đang thử kết nối lại với máy chủ check-payment: ${err.message}`);
    } finally {
      safeSetState(setIsCheckingPayment, false);
    }
  };

  // Poll silently every 5 seconds in background
  useEffect(() => {
    if (isTimeout) return;

    const interval = setInterval(() => {
      checkPaymentStatus();
    }, 5000);

    const timeoutTimer = setTimeout(() => {
      paymentLogger.logTransition('FAILED', 'Hết thời gian 3 phút chờ thanh toán ACB', 'ERR_PAYMENT_TIMEOUT_408');
      safeSetState(setActiveErrorCode, 'ERR_PAYMENT_TIMEOUT_408');
      safeSetState(setIsTimeout, true);
    }, 180000); // 3 minutes timeout

    return () => {
      clearInterval(interval);
      clearTimeout(timeoutTimer);
    };
  }, [orderId, paymentCode, isTimeout]);

  const errorDetails = activeErrorCode ? ERROR_CODES[activeErrorCode] : null;

  if (isTimeout) {
    return (
      <div className="space-y-6 text-center animate-in fade-in zoom-in duration-300 py-4">
        <div className="w-20 h-20 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center mx-auto shadow-inner border-2 border-amber-200">
          <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>
        <div className="space-y-2">
          <span className="px-3 py-1 bg-amber-100 text-amber-900 rounded-full text-xs font-mono font-bold">
            MÃ LỖI: {activeErrorCode || 'ERR_PAYMENT_TIMEOUT_408'}
          </span>
          <h3 className="text-2xl font-black text-slate-900 uppercase tracking-tight">Giao Dịch Hết Thời Gian Chờ</h3>
          <p className="text-slate-600 font-medium text-sm max-w-sm mx-auto leading-relaxed">
            {errorDetails?.description || 'Hệ thống chưa nhận được thông tin chuyển khoản trong thời gian quy định (3 phút).'}
          </p>
        </div>

        <div className="bg-amber-50 p-4 rounded-2xl border border-amber-200 text-xs text-amber-900 font-medium text-left space-y-1">
          <p className="font-bold text-amber-950">Giải pháp khắc phục:</p>
          <p>{errorDetails?.solution || 'Vui lòng kiểm tra lại app ngân hàng hoặc bấm nút "Thử lại mã QR mới".'}</p>
        </div>

        <div className="flex gap-3 pt-2">
          <button
            type="button"
            onClick={onBack}
            className="flex-1 py-3.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-2xl font-black uppercase text-xs tracking-wider transition-all cursor-pointer"
          >
            Quay lại
          </button>
          <button
            type="button"
            onClick={() => {
              paymentLogger.logTransition('INITIAL', 'Người dùng bấm thử lại thanh toán');
              onRetry();
            }}
            className="flex-1 py-3.5 bg-amber-600 hover:bg-amber-700 text-white rounded-2xl font-black uppercase text-xs tracking-wider transition-all shadow-md shadow-amber-600/20 active:scale-98 cursor-pointer flex items-center justify-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            <span>Thử lại mã QR mới</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 text-center animate-in fade-in zoom-in duration-300 py-2">
      {/* Header Title */}
      <div className="space-y-2">
        <h3 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">Mã QR Thanh Toán Ngân Hàng</h3>
        
        {/* Animated Live Status Badge */}
        <div className="inline-flex items-center gap-2.5 px-4 py-2 bg-teal-50 border border-teal-200/80 rounded-full text-[#007c76] font-black text-xs sm:text-sm shadow-xs">
          <span className="relative flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-teal-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-[#007c76]"></span>
          </span>
          <span>Trạng thái: Đang tự động lắng nghe giao dịch SePay...</span>
        </div>
      </div>

      {/* Error Banner if error code detected */}
      {activeErrorCode && errorDetails && (
        <div className="bg-red-50 border-2 border-red-200 p-4 rounded-2xl text-left space-y-1 animate-in fade-in">
          <div className="flex items-center justify-between">
            <span className="font-mono text-xs font-black text-red-700">{errorDetails.code}</span>
            <span className="text-[10px] bg-red-200 text-red-900 px-2 py-0.5 rounded font-bold uppercase">Lỗi chẩn đoán</span>
          </div>
          <h4 className="font-bold text-red-900 text-sm">{errorDetails.title}</h4>
          <p className="text-xs text-red-700">{errorDetails.description}</p>
          <p className="text-xs text-slate-700 font-semibold pt-1">👉 Hướng dẫn: {errorDetails.solution}</p>
        </div>
      )}

      {/* Centered Large QR Code Display */}
      <div className="flex flex-col items-center justify-center">
        <div className="p-5 sm:p-7 bg-white rounded-3xl border-3 border-[#007c76] shadow-xl max-w-sm sm:max-w-md w-full mx-auto space-y-4 relative group">
          {/* Huge QR Code Image */}
          <div className="w-full aspect-square relative flex items-center justify-center p-2 bg-white rounded-2xl overflow-hidden border border-slate-100 shadow-inner">
            <img
              src={vietQrUrl}
              alt="Mã QR thanh toán ACB"
              className="w-full h-full object-contain rounded-xl transform transition-transform group-hover:scale-102"
            />
          </div>

          <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs sm:text-sm font-bold text-slate-700 px-1">
            <span className="text-slate-500 uppercase tracking-wider text-[11px] font-black">Số tiền cần quét:</span>
            <span className="font-black text-[#007c76] text-lg sm:text-2xl">{formatVND(amount)}</span>
          </div>
        </div>
      </div>

      {/* Collapsible Diagnostic State Transition Logs */}
      <div className="border border-slate-200 rounded-2xl overflow-hidden bg-white text-xs max-w-md mx-auto">
        <button
          type="button"
          onClick={() => setShowLogs(prev => !prev)}
          className="w-full px-4 py-2 bg-slate-50 hover:bg-slate-100 flex items-center justify-between font-bold text-slate-700 transition-colors cursor-pointer"
        >
          <span className="flex items-center gap-2 text-[11px]">
            <span className="w-2 h-2 rounded-full bg-teal-500"></span>
            Nhật ký hệ thống (Payment Logs)
          </span>
          <span className="text-[10px] text-slate-400 uppercase font-mono font-bold">
            {showLogs ? 'Ẩn nhật ký ▲' : 'Xem nhật ký ▼'}
          </span>
        </button>
        {showLogs && (
          <div className="p-3 border-t border-slate-200 space-y-2 max-h-48 overflow-y-auto font-mono text-[11px] bg-slate-900 text-slate-200 text-left">
            {paymentLogger.getLogs().length === 0 ? (
              <p className="text-slate-500 italic">Chưa có bản ghi chuyển trạng thái...</p>
            ) : (
              paymentLogger.getLogs().map((log) => (
                <div key={log.id} className="border-b border-slate-800 pb-1.5 last:border-0">
                  <div className="flex items-center justify-between text-teal-400">
                    <span>[{log.timestamp}] {log.fromState} ➔ {log.toState}</span>
                    {log.errorCode && <span className="text-amber-400 font-bold">{log.errorCode}</span>}
                  </div>
                  <p className="text-slate-300 text-[10px] mt-0.5">{log.details}</p>
                </div>
              ))
            )}
          </div>
        )}
      </div>

      <div className="flex justify-center pt-1">
        <button
          type="button"
          onClick={onBack}
          className="px-8 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-2xl font-black uppercase text-xs tracking-wider transition-all cursor-pointer shadow-xs active:scale-98"
        >
          Quay lại
        </button>
      </div>
    </div>
  );
};

export default PaymentStatusPolling;
