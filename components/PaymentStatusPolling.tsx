import React, { useState, useEffect, useRef } from 'react';
import { Course } from '../types';
import { auth, db } from '../firebase';
import { doc, setDoc } from 'firebase/firestore';
import { formatVND, getVietQrUrl } from '../utils/qrService';
import { authDebugger } from '../utils/authDebugger';

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

  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [isCheckingPayment, setIsCheckingPayment] = useState<boolean>(false);
  const [isTimeout, setIsTimeout] = useState<boolean>(false);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const safeSetState = <T,>(setter: React.Dispatch<React.SetStateAction<T>>, value: T | ((prev: T) => T)) => {
    if (isMountedRef.current) {
      setter(value);
    }
  };

  const transferMemo = `FAST ${paymentCode || 'TEST'}`;
  const vietQrUrl = getVietQrUrl({
    bankId: config.bankId || 'acb',
    accountNo: config.accountNo,
    accountName: config.accountName,
    amount,
    memo: transferMemo,
    template: 'compact2',
  });

  const copyText = (text: string, fieldName: string) => {
    navigator.clipboard.writeText(text);
    safeSetState(setCopiedField, fieldName);
    setTimeout(() => {
      safeSetState(setCopiedField, null);
    }, 2000);
  };

  const checkPaymentStatus = async () => {
    if (isTimeout || !isMountedRef.current) return;
    safeSetState(setIsCheckingPayment, true);
    try {
      const queryParam = orderId ? `orderId=${encodeURIComponent(orderId)}` : `paymentCode=${encodeURIComponent(paymentCode)}`;
      const res = await fetch(`/api/check-payment?${queryParam}`);
      const data = await res.json();
      
      if (data.success && (data.status === 'PAID' || data.status === 'completed')) {
        console.log(`[PaymentStatusPolling] SUCCESS: Payment verified for code ${paymentCode}, order ${orderId}`);
        
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
            console.warn("[PaymentStatusPolling] Firestore purchase record write warning:", e);
          }
        }
        localStorage.setItem(`course_unlocked_${course.id}`, 'true');
        setTimeout(() => {
          if (isMountedRef.current) {
            onSuccess();
          }
        }, 1000);
      }
    } catch (err: any) {
      console.warn("[PaymentStatusPolling] Check payment polling error:", err);
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
      safeSetState(setIsTimeout, true);
    }, 180000); // 3 minutes timeout

    return () => {
      clearInterval(interval);
      clearTimeout(timeoutTimer);
    };
  }, [orderId, paymentCode, isTimeout]);

  if (isTimeout) {
    return (
      <div className="space-y-6 text-center animate-in fade-in zoom-in duration-300 py-4">
        <div className="w-20 h-20 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center mx-auto shadow-inner border-2 border-amber-200">
          <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>
        <div className="space-y-2">
          <h3 className="text-2xl font-black text-slate-900 uppercase tracking-tight">Giao Dịch Hết Thời Gian Chờ</h3>
          <p className="text-slate-600 font-medium text-sm max-w-sm mx-auto leading-relaxed">
            Hệ thống chưa nhận được thông tin chuyển khoản trong thời gian quy định (3 phút).
          </p>
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
            onClick={onRetry}
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
    <div className="space-y-5 animate-in fade-in zoom-in duration-300">
      {/* Header */}
      <div className="text-center space-y-1">
        <h3 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">Thanh Toán Chuyển Khoản Mã QR</h3>
        <p className="text-slate-500 font-medium text-xs sm:text-sm">
          Sử dụng ứng dụng ngân hàng bất kỳ để quét mã và chuyển khoản
        </p>
      </div>

      {/* Horizontal Layout Container (Side-by-side QR + Bank Account Details) */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-5 items-stretch bg-slate-50/70 p-5 rounded-3xl border border-slate-200 shadow-xs">
        {/* Left Column: Pure QR Code */}
        <div className="md:col-span-5 flex flex-col items-center justify-center bg-white p-4 rounded-2xl border-2 border-[#007c76] shadow-md">
          <div className="w-52 h-52 sm:w-60 sm:h-60 relative flex items-center justify-center">
            <img
              src={vietQrUrl}
              alt="Mã QR thanh toán ACB"
              className="w-full h-full object-contain rounded-xl"
            />
          </div>
          <span className="text-[11px] font-black uppercase text-[#007c76] tracking-wider mt-3 bg-teal-50 px-3 py-1 rounded-full border border-teal-100">
            Quét mã để tự động điền
          </span>
        </div>

        {/* Right Column: Bank Account Details Card */}
        <div className="md:col-span-7 flex flex-col justify-between bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-3">
          <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
            <span className="font-black uppercase text-xs text-slate-900 tracking-wider">Thông tin tài khoản</span>
            <span className="text-xs font-bold text-[#007c76] bg-teal-50 px-2.5 py-0.5 rounded-md border border-teal-200">ACB Bank</span>
          </div>

          <div className="space-y-3 text-xs">
            {/* Bank Name */}
            <div className="flex justify-between items-center bg-slate-50/80 p-2.5 rounded-xl border border-slate-100">
              <span className="text-slate-500 font-medium">Ngân hàng:</span>
              <span className="font-extrabold text-slate-800">{config.bankName} (Á Châu)</span>
            </div>

            {/* Account Name */}
            <div className="flex justify-between items-center bg-slate-50/80 p-2.5 rounded-xl border border-slate-100">
              <span className="text-slate-500 font-medium">Chủ tài khoản:</span>
              <span className="font-extrabold text-slate-900 uppercase text-right truncate max-w-[200px]">{config.accountName}</span>
            </div>

            {/* Account Number */}
            <div className="flex justify-between items-center bg-slate-50/80 p-2.5 rounded-xl border border-slate-100">
              <span className="text-slate-500 font-medium">Số tài khoản:</span>
              <div className="flex items-center gap-2">
                <span className="font-mono font-black text-[#007c76] text-sm">{config.accountNo}</span>
                <button
                  type="button"
                  onClick={() => copyText(config.accountNo, 'accNo')}
                  className="text-[10px] bg-teal-100 hover:bg-teal-200 text-teal-900 px-2.5 py-1 rounded-lg font-bold uppercase transition-colors cursor-pointer"
                >
                  {copiedField === 'accNo' ? '✓ Đã chép' : 'Sao chép'}
                </button>
              </div>
            </div>

            {/* Amount */}
            <div className="flex justify-between items-center bg-slate-50/80 p-2.5 rounded-xl border border-slate-100">
              <span className="text-slate-500 font-medium">Số tiền thanh toán:</span>
              <div className="flex items-center gap-2">
                <span className="font-black text-[#007c76] text-base">{formatVND(amount)}</span>
                <button
                  type="button"
                  onClick={() => copyText(String(amount), 'amount')}
                  className="text-[10px] bg-teal-100 hover:bg-teal-200 text-teal-900 px-2.5 py-1 rounded-lg font-bold uppercase transition-colors cursor-pointer"
                >
                  {copiedField === 'amount' ? '✓ Đã chép' : 'Sao chép'}
                </button>
              </div>
            </div>

            {/* Transfer Memo */}
            <div className="flex justify-between items-center bg-teal-50/60 p-2.5 rounded-xl border border-teal-200">
              <span className="text-teal-900 font-bold">Nội dung chuyển khoản:</span>
              <div className="flex items-center gap-2">
                <span className="font-mono font-black text-[#007c76] text-sm select-all">{transferMemo}</span>
                <button
                  type="button"
                  onClick={() => copyText(transferMemo, 'memo')}
                  className="text-[10px] bg-[#007c76] hover:bg-[#00605b] text-white px-2.5 py-1 rounded-lg font-bold uppercase transition-colors cursor-pointer shadow-xs"
                >
                  {copiedField === 'memo' ? '✓ Đã chép' : 'Sao chép'}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="flex justify-end pt-1">
        <button
          type="button"
          onClick={onBack}
          className="px-6 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-2xl font-bold uppercase text-xs tracking-wider transition-all cursor-pointer"
        >
          Quay lại
        </button>
      </div>
    </div>
  );
};
