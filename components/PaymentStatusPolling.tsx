import React, { useState, useEffect } from 'react';
import { Course } from '../types';
import { auth, db } from '../firebase';
import { doc, setDoc } from 'firebase/firestore';
import { formatVND, getVietQrUrl } from '../utils/qrService';

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
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [pollingCountdown, setPollingCountdown] = useState<number>(5);
  const [isCheckingPayment, setIsCheckingPayment] = useState<boolean>(false);
  const [statusMessage, setStatusMessage] = useState<string>('Đang chờ giao dịch từ ngân hàng ACB...');
  
  // Timeout / Payment Failed states (3 minutes / 180 seconds timeout)
  const [secondsElapsed, setSecondsElapsed] = useState<number>(0);
  const [isTimeout, setIsTimeout] = useState<boolean>(false);

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
    setCopiedField(fieldName);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const checkPaymentStatus = async () => {
    if (isTimeout) return;
    setIsCheckingPayment(true);
    try {
      const queryParam = orderId ? `orderId=${encodeURIComponent(orderId)}` : `paymentCode=${encodeURIComponent(paymentCode)}`;
      const res = await fetch(`/api/check-payment?${queryParam}`);
      const data = await res.json();
      
      if (data.success && (data.status === 'PAID' || data.status === 'completed')) {
        setStatusMessage('Thanh toán thành công! Đang kích hoạt khóa học...');
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
          } catch (e) {
            console.warn("Firestore purchase record write warning:", e);
          }
        }
        localStorage.setItem(`course_unlocked_${course.id}`, 'true');
        setTimeout(() => {
          onSuccess();
        }, 1000);
      } else {
        setStatusMessage('Đang chờ giao dịch từ ngân hàng ACB (Chưa nhận được chuyển khoản)...');
      }
    } catch (err) {
      console.warn("Check payment polling error:", err);
      setStatusMessage('Đang kết nối lại với máy chủ kiểm tra thanh toán...');
    } finally {
      setIsCheckingPayment(false);
    }
  };

  // Poll every 5 seconds and track timeout (180 seconds)
  useEffect(() => {
    if (isTimeout) return;

    const interval = setInterval(() => {
      setPollingCountdown(5);
      checkPaymentStatus();
    }, 5000);

    const countdownTimer = setInterval(() => {
      setPollingCountdown(prev => (prev > 1 ? prev - 1 : 5));
      setSecondsElapsed(prev => {
        const next = prev + 1;
        if (next >= 180) {
          setIsTimeout(true);
        }
        return next;
      });
    }, 1000);

    return () => {
      clearInterval(interval);
      clearInterval(countdownTimer);
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
            Hệ thống chưa nhận được thông tin chuyển khoản từ ngân hàng trong thời gian quy định (3 phút). Đơn hàng tạm thời hết hạn.
          </p>
        </div>

        <div className="bg-amber-50 p-4 rounded-2xl border border-amber-200 text-xs text-amber-900 font-medium">
          Nếu bạn đã chuyển khoản thành công nhưng chưa được duyệt, vui lòng bấm <strong>Thử lại thanh toán</strong> để hệ thống tạo mã giao dịch mới hoặc liên hệ hỗ trợ.
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
            <span>Thử lại thanh toán (Retry)</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in zoom-in duration-300">
      {/* Header */}
      <div className="text-center space-y-1">
        <div className="inline-flex items-center gap-2 px-3 py-1 bg-teal-50 border border-teal-200/60 rounded-full text-[#007c76] font-extrabold text-[11px] uppercase tracking-wider mb-1">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
          Đã xác thực OTP - Chờ thanh toán ACB
        </div>
        <h3 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">Quét Mã QR Chuyển Khoản</h3>
        <p className="text-slate-500 font-medium text-xs sm:text-sm">
          Sử dụng ứng dụng ngân hàng bất kỳ để quét mã và thanh toán tự động
        </p>
      </div>

      {/* Live Polling Status Indicator */}
      <div className="bg-white p-4 rounded-2xl border-2 border-teal-200 shadow-sm flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="relative flex h-3.5 w-3.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-emerald-500"></span>
          </div>
          <div>
            <span className="text-xs font-black text-slate-900 block">Đang lắng nghe giao dịch SePay / ACB</span>
            <span className="text-[11px] text-teal-700 font-medium">{statusMessage} (Tự động quét sau {pollingCountdown}s)</span>
          </div>
        </div>
        <button
          type="button"
          onClick={checkPaymentStatus}
          disabled={isCheckingPayment}
          className="px-3.5 py-2 bg-[#007c76] hover:bg-[#00605b] text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all shadow-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
        >
          {isCheckingPayment ? (
            <>
              <svg className="animate-spin h-3.5 w-3.5 text-white" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <span>Đang kiểm tra...</span>
            </>
          ) : (
            <span>Kiểm tra ngay</span>
          )}
        </button>
      </div>

      {/* Progress bar */}
      <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
        <div 
          className="bg-gradient-to-r from-teal-500 to-[#007c76] h-full transition-all duration-1000 ease-linear rounded-full"
          style={{ width: `${(pollingCountdown / 5) * 100}%` }}
        ></div>
      </div>

      {/* QR Code and Instructions */}
      <div className="flex flex-col sm:flex-row items-center gap-5 sm:gap-6 justify-center bg-gradient-to-br from-slate-50 to-teal-50/30 p-5 rounded-2xl border border-slate-200 shadow-xs">
        <div className="relative w-52 h-52 sm:w-60 sm:h-60 bg-white p-3 rounded-2xl shadow-md border-2 border-[#007c76] shrink-0 flex items-center justify-center transition-transform duration-300 hover:scale-[1.02]">
          <img
            src={vietQrUrl}
            alt="Mã QR thanh toán ACB"
            className="w-full h-full object-contain rounded-xl"
          />
        </div>

        <div className="text-left space-y-2.5 text-xs text-slate-700 flex-1 w-full">
          <div className="font-black text-slate-900 uppercase tracking-wider text-xs border-b border-slate-200/80 pb-1.5 flex items-center justify-between">
            <span>Thông tin chuyển khoản</span>
            <span className="text-[10px] bg-teal-100 text-teal-900 px-2 py-0.5 rounded-md font-bold">{config.bankName}</span>
          </div>
          <p>
            <strong>1.</strong> Mở ứng dụng ngân hàng ACB hoặc app bất kỳ.
          </p>
          <p>
            <strong>2.</strong> Chọn <strong>"Quét mã QR"</strong> và quét mã bên cạnh.
          </p>
          <p>
            <strong>3.</strong> Nội dung chuyển khoản bắt buộc:
          </p>
          <div className="flex items-center gap-2 pt-0.5">
            <span className="bg-white px-3 py-2 rounded-xl border border-teal-200 font-mono font-black text-[#007c76] text-sm select-all shadow-xs">
              {transferMemo}
            </span>
            <button
              type="button"
              onClick={() => copyText(transferMemo, 'memo')}
              className="px-3 py-2 bg-teal-100 hover:bg-teal-200 text-teal-900 rounded-xl font-black text-[10px] uppercase transition-colors cursor-pointer"
            >
              {copiedField === 'memo' ? '✓ Đã chép' : 'Sao chép'}
            </button>
          </div>
        </div>
      </div>

      {/* Bank Account Details Card */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 text-xs space-y-2.5 shadow-xs">
        <div className="flex justify-between items-center pb-2 border-b border-slate-100">
          <span className="text-slate-400 font-medium">Ngân hàng:</span>
          <span className="font-extrabold text-slate-800">{config.bankName} (Á Châu)</span>
        </div>
        <div className="flex justify-between items-center pb-2 border-b border-slate-100">
          <span className="text-slate-400 font-medium">Số tài khoản:</span>
          <span className="font-mono font-black text-[#007c76] text-sm flex items-center gap-2">
            {config.accountNo}
            <button
              type="button"
              onClick={() => copyText(config.accountNo, 'accNo')}
              className="text-[10px] bg-slate-100 hover:bg-slate-200 text-slate-700 px-2 py-0.5 rounded-lg font-bold uppercase transition-colors cursor-pointer"
            >
              {copiedField === 'accNo' ? '✓ Đã chép' : 'Sao chép'}
            </button>
          </span>
        </div>
        <div className="flex justify-between items-center pb-2 border-b border-slate-100">
          <span className="text-slate-400 font-medium">Chủ tài khoản:</span>
          <span className="font-extrabold text-slate-800 uppercase">{config.accountName}</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-slate-400 font-medium">Số tiền:</span>
          <span className="font-black text-[#007c76] text-base flex items-center gap-2">
            {formatVND(amount)}
            <button
              type="button"
              onClick={() => copyText(String(amount), 'amount')}
              className="text-[10px] bg-slate-100 hover:bg-slate-200 text-slate-700 px-2 py-0.5 rounded-lg font-bold uppercase transition-colors cursor-pointer"
            >
              {copiedField === 'amount' ? '✓ Đã chép' : 'Sao chép'}
            </button>
          </span>
        </div>
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
          onClick={checkPaymentStatus}
          disabled={isCheckingPayment}
          className="flex-1 py-3.5 bg-[#007c76] hover:bg-[#00605b] text-white rounded-2xl font-black uppercase text-xs tracking-wider transition-all shadow-md shadow-teal-700/20 active:scale-98 cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {isCheckingPayment ? (
            <>
              <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <span>Đang kiểm tra...</span>
            </>
          ) : (
            'Đã chuyển khoản thành công'
          )}
        </button>
      </div>

      <p className="text-[10px] text-center text-slate-400 font-medium">
        Hệ thống tự động kích hoạt khóa học vào phòng học ngay khi giao dịch được hệ thống ACB ghi nhận.
      </p>
    </div>
  );
};
