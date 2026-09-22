import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Course } from '../types';
import { auth, db } from '../firebase';
import { ADMIN_EMAILS } from '../constants';
import { doc, setDoc } from 'firebase/firestore';
import { authDebugger } from '../utils/authDebugger';
import { otpLogger } from '../auth/otp-logger';
import { sendOtp, verifyOtp } from '../utils/otpService';
import {
  parseNumericPrice,
  formatVND,
  getVietQrUrl,
  generatePaymentMemo,
  getPaymentConfig,
} from '../utils/qrService';

interface PaymentModalProps {
  course: Course;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const PaymentModal: React.FC<PaymentModalProps> = ({ course, isOpen, onClose, onSuccess }) => {
  const navigate = useNavigate();
  const [isVerifying, setIsVerifying] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);
  const [isVipOrAdmin, setIsVipOrAdmin] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [config, setConfig] = useState(getPaymentConfig);
  
  // OTP States
  const [showOtpForm, setShowOtpForm] = useState(false);
  const [generatedOtp, setGeneratedOtp] = useState<string>('');
  const [userInputOtp, setUserInputOtp] = useState<string>('');
  const [otpError, setOtpError] = useState<string>('');
  const [otpNotice, setOtpNotice] = useState<string>('');
  const [otpCountdown, setOtpCountdown] = useState<number>(0);
  const otpInputRef = useRef<HTMLInputElement>(null);

  const targetEmail = (auth.currentUser?.email || (typeof localStorage !== 'undefined' ? localStorage.getItem('user_email') : '') || 'hocvien@gmail.com').trim();

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (otpCountdown > 0) {
      timer = setTimeout(() => setOtpCountdown(prev => prev - 1), 1000);
    }
    return () => clearTimeout(timer);
  }, [otpCountdown]);

  useEffect(() => {
    if (showOtpForm && isOpen) {
      const timer = setTimeout(() => {
        otpInputRef.current?.focus();
      }, 150);
      return () => clearTimeout(timer);
    }
  }, [showOtpForm, isOpen]);

  useEffect(() => {
    setConfig(getPaymentConfig());
    const user = auth.currentUser;
    if (user && user.email) {
      const email = user.email.toLowerCase();
      let isPrivileged = ADMIN_EMAILS.includes(email);
      if (!isPrivileged) {
        const localRolesStr = localStorage.getItem(`user_roles_${email}`);
        if (localRolesStr) {
          try {
            const localRoles = JSON.parse(localRolesStr);
            if (localRoles.isVip || localRoles.isAdmin) isPrivileged = true;
          } catch (e) {}
        }
      }
      setIsVipOrAdmin(isPrivileged);
    } else {
      setIsVipOrAdmin(false);
    }

    // Reset OTP states when modal toggles open/closed to ensure clean state
    setShowOtpForm(false);
    setUserInputOtp('');
    setOtpError('');
    setOtpNotice('');
    setOtpCountdown(0);
  }, [isOpen]);

  // Diagnostic Hook: Trace PaymentModal state transitions in real-time
  useEffect(() => {
    authDebugger.logOtpModalState({
      componentName: "PaymentModal",
      isOpen,
      otpFormVisible: showOtpForm,
      userInputLength: userInputOtp.length,
      hasNotice: !!otpNotice,
      hasError: !!otpError,
      countdown: otpCountdown,
    });
  }, [isOpen, showOtpForm, userInputOtp, otpNotice, otpError, otpCountdown]);

  if (!isOpen) return null;

  const numericAmount = parseNumericPrice(course.price);
  const isFreeCourse = numericAmount === 0;
  const transferMemo = generatePaymentMemo(course.id, course.title);

  const vietQrUrl = getVietQrUrl({
    bankId: config.bankId,
    accountNo: config.accountNo,
    accountName: config.accountName,
    amount: numericAmount,
    memo: transferMemo,
    template: 'compact2',
  });

  const currentQrUrl = vietQrUrl;
  const copyText = (text: string, fieldName: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(fieldName);
    setTimeout(() => setCopiedField(null), 2000);
  };


  const handleConfirmTransfer = async () => {
    console.log("[PaymentModal:ConfirmTransfer] Starting transfer confirmation & OTP send request...");
    setIsVerifying(true);
    setOtpError('');
    setOtpNotice('');
    setUserInputOtp('');
    const user = auth.currentUser;
    const email = (user?.email || (typeof localStorage !== 'undefined' ? localStorage.getItem('user_email') : '') || 'hocvien@gmail.com').trim();
    console.log("[PaymentModal:ConfirmTransfer] User details:", {
      email,
      displayName: user?.displayName,
      uid: user?.uid
    });

    authDebugger.logEmailJsFlow({
      step: 'initiation',
      email,
      recipientName: user?.displayName || 'Học viên'
    });

    try {
      console.log("[PaymentModal:ConfirmTransfer] Dispatching OTP send via otpService...");
      const result = await sendOtp({
        email,
        name: user?.displayName || 'Học viên',
        flow: 'purchase'
      });

      if (result.success) {
        console.log("[PaymentModal:ConfirmTransfer] SUCCESS: OTP sent successfully. Toggling showOtpForm to TRUE.");
        otpLogger.logModalToggle("PaymentModal_OTPForm", true, "ConfirmTransfer_Success_Event");
        setShowOtpForm(true);
        const noticeMsg = result.message || `Mã xác thực OTP đã được gửi đến email ${email}. Vui lòng kiểm tra hộp thư (cả thư rác/Spam) để lấy mã.`;
        setOtpNotice(noticeMsg);
        setOtpCountdown(60);
        console.log("[PaymentModal:ConfirmTransfer] States updated: showOtpForm=true, otpNotice set, countdown=60.");

        if (result.fallback && result.otp) {
          console.log("[PaymentModal:ConfirmTransfer] FALLBACK mode triggered. Autofilling userInputOtp with:", result.otp);
          setUserInputOtp(result.otp);
        }
      } else {
        console.warn("[PaymentModal:ConfirmTransfer] FAILED: Negative status:", result.error);
        setOtpError(result.error || "Không thể gửi mã OTP qua email lúc này. Vui lòng kiểm tra lại địa chỉ email.");
      }
    } catch (err: any) {
      console.error("[PaymentModal:ConfirmTransfer] EXCEPTION thrown:", err);
      setOtpError(err?.message || "Lỗi kết nối tới máy chủ gửi mã OTP. Vui lòng thử lại.");
    }
    setIsVerifying(false);
    console.log("[PaymentModal:ConfirmTransfer] Completed confirm transfer process. isVerifying set to false.");
  };

  const handleResendOtp = async () => {
    console.log("[PaymentModal:ResendOtp] Starting OTP resend request...");
    if (otpCountdown > 0) {
      console.warn("[PaymentModal:ResendOtp] Aborted: Cooldown timer still active:", otpCountdown);
      return;
    }
    setOtpError('');
    setOtpNotice('');
    setIsVerifying(true);
    const user = auth.currentUser;
    const email = (user?.email || (typeof localStorage !== 'undefined' ? localStorage.getItem('user_email') : '') || 'hocvien@gmail.com').trim();
    console.log("[PaymentModal:ResendOtp] User details:", { email });

    try {
      console.log("[PaymentModal:ResendOtp] Dispatching resend via otpService...");
      const result = await sendOtp({
        email,
        name: user?.displayName || 'Học viên',
        flow: 'purchase'
      });

      if (result.success) {
        console.log("[PaymentModal:ResendOtp] SUCCESS: Resend successful.");
        setOtpNotice(result.message || `Mã OTP mới đã được gửi lại thành công đến email ${email}.`);
        setOtpCountdown(60);
        if (result.fallback && result.otp) {
          console.log("[PaymentModal:ResendOtp] FALLBACK mode triggered during resend. Autofilling userInputOtp with:", result.otp);
          setUserInputOtp(result.otp);
        }
      } else {
        console.warn("[PaymentModal:ResendOtp] FAILED:", result.error);
        setOtpError(result.error || "Không thể gửi lại mã OTP lúc này.");
      }
    } catch (err: any) {
      console.error("[PaymentModal:ResendOtp] EXCEPTION thrown:", err);
      setOtpError(err?.message || "Lỗi kết nối khi gửi lại OTP.");
    }
    setIsVerifying(false);
    console.log("[PaymentModal:ResendOtp] Completed OTP resend process. isVerifying set to false.");
  };

  const handleVerifyOtp = async () => {
    console.log("[PaymentModal:VerifyOtp] Starting OTP verification process for entered digits:", userInputOtp);
    if (userInputOtp.length !== 6) {
      console.warn("[PaymentModal:VerifyOtp] Aborted: Invalid userInputOtp length:", userInputOtp.length);
      setOtpError("Vui lòng nhập đầy đủ mã OTP 6 chữ số từ email của bạn.");
      return;
    }
    setIsVerifying(true);
    setOtpError('');

    const user = auth.currentUser;
    const email = (user?.email || (typeof localStorage !== 'undefined' ? localStorage.getItem('user_email') : '') || 'hocvien@gmail.com').trim();
    console.log("[PaymentModal:VerifyOtp] Verification details:", { email, otp: userInputOtp });

    try {
      console.log("[PaymentModal:VerifyOtp] Dispatching verify via otpService...");
      const verifyRes = await verifyOtp({
        email,
        otp: userInputOtp,
        flow: 'purchase'
      });

      if (verifyRes.success) {
        console.log("[PaymentModal:VerifyOtp] SUCCESS: OTP verified successfully. Provisioning course:", course.id);
        // Save course unlock to Firestore & localStorage
        if (user && user.email && course.id) {
          try {
            const userEmail = user.email.toLowerCase();
            const docRef = doc(db, 'users', userEmail, 'purchased_courses', course.id);
            console.log("[PaymentModal:VerifyOtp] Writing purchase details to Firestore at path:", `users/${userEmail}/purchased_courses/${course.id}`);
            await setDoc(
              docRef,
              {
                courseId: course.id,
                courseTitle: course.title,
                purchasedAt: new Date().toISOString(),
                price: course.price || 'Đã thanh toán',
                status: 'active',
                progress: 0,
                claimedVia: 'VIETQR_OTP_CONFIRM',
              },
              { merge: true }
            );
            console.log("[PaymentModal:VerifyOtp] Firestore write completed successfully.");
          } catch (e) {
            console.error('[PaymentModal:VerifyOtp] Firestore write error:', e);
          }
        }
        localStorage.setItem(`course_unlocked_${course.id}`, 'true');
        console.log("[PaymentModal:VerifyOtp] LocalStorage updated: course_unlocked for", course.id, "set to true.");

        setOtpError('');
        setIsCompleted(true);
        console.log("[PaymentModal:VerifyOtp] Transitioning to complete. Scheduling modal closure in 1500ms.");
        setTimeout(() => {
          console.log("[PaymentModal:VerifyOtp] Timer elapsed. Triggering onSuccess callback and resetting completeness state.");
          onSuccess();
          setIsCompleted(false);
        }, 1500);
      } else {
        console.warn("[PaymentModal:VerifyOtp] FAILED: OTP verification failed. Result:", verifyRes);
        setOtpError(verifyRes.error || "Mã OTP không chính xác hoặc đã hết hạn. Vui lòng kiểm tra lại email.");
      }
    } catch (err) {
      console.error("[PaymentModal:VerifyOtp] EXCEPTION thrown during fetch verification:", err);
      setOtpError("Lỗi kết nối khi xác thực mã OTP. Vui lòng thử lại.");
    }
    setIsVerifying(false);
    console.log("[PaymentModal:VerifyOtp] Completed OTP verification flow. isVerifying set to false.");
  };

  const handleInstantVipClaim = async () => {
    setIsVerifying(true);
    const user = auth.currentUser;
    if (user && user.email && course.id) {
      try {
        const userEmail = user.email.toLowerCase();
        const docRef = doc(db, 'users', userEmail, 'purchased_courses', course.id);
        await setDoc(
          docRef,
          {
            courseId: course.id,
            courseTitle: course.title,
            purchasedAt: new Date().toISOString(),
            price: course.price || 'Miễn phí',
            status: 'active',
            progress: 0,
            claimedVia: isFreeCourse ? 'FREE_ACCESS' : 'VIP_INSTANT_CLAIM',
          },
          { merge: true }
        );
        localStorage.setItem(`course_unlocked_${course.id}`, 'true');
      } catch (e) {
        console.warn('Instant claim warning:', e);
      }
    }
    setIsVerifying(false);
    setIsCompleted(true);
    setTimeout(() => {
      onSuccess();
      setIsCompleted(false);
    }, 800);
  };

  return (
    <div className="fixed inset-0 z-[200] grid place-items-center bg-black/70 backdrop-blur-md px-4 overflow-y-auto py-6">
      <div className="bg-white max-w-lg w-full rounded-3xl p-5 sm:p-7 shadow-2xl relative overflow-hidden animate-in zoom-in-95 duration-300">
        <button
          onClick={onClose}
          disabled={isVerifying || isCompleted}
          className="absolute top-4 right-4 text-gray-400 hover:bg-gray-100 p-2 rounded-full transition-colors z-10 disabled:opacity-50 cursor-pointer"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        {!isCompleted ? (
          <div className="space-y-5 relative z-10">
            <div className="text-center">
              <h2 className="text-2xl font-black text-gray-800 uppercase tracking-tight">Thanh toán khóa học</h2>
              <p className="text-gray-500 font-medium text-xs sm:text-sm mt-1">Xác nhận đơn hàng và quét mã QR để mở khóa ngay</p>
            </div>

            {/* Course Information Summary */}
            <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200/80 flex items-center justify-between">
              <div className="flex-1 min-w-0 pr-3">
                <h3 className="font-bold text-gray-800 text-sm truncate">{course.title}</h3>
                <p className="text-xs font-semibold tracking-wider text-gray-400 mt-0.5">
                  Mã KH: {course.id.slice(0, 8).toUpperCase()}
                </p>
              </div>
              <div className="text-[#007c76] font-black text-lg whitespace-nowrap">
                {isFreeCourse ? 'Miễn phí' : formatVND(numericAmount)}
              </div>
            </div>

            {/* OTP Verification Form */}
            {showOtpForm ? (
              <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm space-y-5 text-center animate-in zoom-in-95">
                <div className="w-16 h-16 bg-teal-50 text-[#007c76] rounded-full flex items-center justify-center mx-auto mb-2">
                  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                </div>
                <h4 className="font-black text-gray-800 text-lg uppercase tracking-tight">Nhập mã xác thực OTP</h4>
                <p className="text-sm text-gray-500 font-medium px-4">
                  Một mã xác thực 6 số đã được gửi đến email <strong className="text-gray-800">{targetEmail}</strong>. Vui lòng kiểm tra hộp thư (và thư rác) để tiếp tục.
                </p>
                <div className="pt-2">
                  {otpNotice && (
                    <div className="mb-3 p-2.5 bg-teal-50 border border-teal-200 text-[#007c76] text-xs font-semibold rounded-xl text-center animate-in fade-in">
                      {otpNotice}
                    </div>
                  )}
                  <input
                    ref={otpInputRef}
                    type="text"
                    maxLength={6}
                    value={userInputOtp}
                    disabled={isVerifying}
                    onChange={(e) => {
                      setUserInputOtp(e.target.value.replace(/[^0-9]/g, ''));
                      setOtpError('');
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && userInputOtp.length === 6 && !isVerifying) {
                        e.preventDefault();
                        handleVerifyOtp();
                      }
                    }}
                    placeholder="Nhập 6 số OTP"
                    className="w-full text-center text-2xl tracking-[0.5em] font-black font-mono text-[#007c76] bg-gray-50 border-2 border-gray-200 focus:border-[#007c76] focus:ring-4 focus:ring-[#007c76]/10 rounded-xl py-3 outline-none transition-all placeholder:tracking-normal placeholder:text-base placeholder:font-medium placeholder:text-gray-300 disabled:opacity-75"
                  />
                  {otpError && (
                    <p className="text-red-500 text-xs font-bold mt-2 animate-in slide-in-from-top-1">{otpError}</p>
                  )}

                  {/* Visual status indicator / loading spinner / progress bar inside the OTP input component */}
                  <div className="mt-4 w-full">
                    {isVerifying ? (
                      <div className="space-y-2">
                        <div className="h-1.5 w-full bg-gray-100 rounded-full overflow-hidden relative">
                          <div className="h-full bg-gradient-to-r from-teal-500 to-[#007c76] rounded-full animate-pulse w-full"></div>
                        </div>
                        <div className="flex items-center justify-center gap-2 text-xs font-bold text-[#007c76] animate-pulse">
                          <svg className="animate-spin h-3.5 w-3.5 text-[#007c76]" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          <span>Đang thực hiện xác thực bảo mật OTP...</span>
                        </div>
                      </div>
                    ) : (
                      <div className="h-1.5 w-full bg-gray-100/50 rounded-full"></div>
                    )}
                  </div>
                </div>

                <div className="flex items-center justify-between text-xs px-2 pt-1 pb-1">
                  <span className="text-gray-400 font-bold uppercase tracking-wider">Chưa nhận được mã?</span>
                  <button
                    type="button"
                    onClick={handleResendOtp}
                    disabled={otpCountdown > 0 || isVerifying}
                    className={`font-black uppercase tracking-wider cursor-pointer transition-colors ${otpCountdown > 0 || isVerifying ? 'text-gray-300 cursor-not-allowed' : 'text-[#007c76] hover:underline'}`}
                  >
                    Gửi lại {otpCountdown > 0 ? `(${otpCountdown}s)` : ''}
                  </button>
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    onClick={() => setShowOtpForm(false)}
                    disabled={isVerifying}
                    className="flex-1 py-3 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-xl font-bold uppercase text-xs tracking-wider transition-all cursor-pointer disabled:opacity-50"
                  >
                    Quay lại
                  </button>
                  <button
                    onClick={handleVerifyOtp}
                    disabled={userInputOtp.length !== 6 || isVerifying}
                    className="flex-1 py-3 bg-[#007c76] hover:bg-[#00605b] text-white rounded-xl font-black uppercase text-xs tracking-wider transition-all shadow-md active:scale-98 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {isVerifying ? (
                      <>
                        <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        <span>Đang xử lý...</span>
                      </>
                    ) : (
                      'Xác nhận'
                    )}
                  </button>
                </div>
              </div>
            ) : (
              <>

            {/* Special VIP/Admin Instant Claim Box */}
            {isVipOrAdmin && !isFreeCourse && (
              <div className="p-3.5 bg-gradient-to-r from-amber-500/10 via-yellow-500/10 to-amber-500/10 border-2 border-amber-400/40 rounded-2xl flex flex-col gap-2">
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 bg-amber-500 text-slate-950 font-black text-[10px] uppercase tracking-wider rounded-md">
                    Đặc quyền VIP / Admin
                  </span>
                  <span className="text-xs font-bold text-amber-900">Mở khóa miễn phí ngay</span>
                </div>
                <p className="text-xs text-amber-800 leading-relaxed font-medium">
                  Tài khoản của bạn có quyền thành viên VIP hoặc Quản trị. Bạn có thể nhận trực tiếp khóa học này mà không cần chuyển khoản.
                </p>
                <button
                  type="button"
                  onClick={handleInstantVipClaim}
                  disabled={isVerifying}
                  className="w-full py-2.5 bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-slate-950 font-black rounded-xl text-xs uppercase tracking-widest transition-all shadow-md shadow-amber-500/20 active:scale-98 flex items-center justify-center gap-2 cursor-pointer"
                >
                  <span>👑 Nhận Khóa Học Ngay (Miễn phí VIP)</span>
                </button>
              </div>
            )}

            {/* If Course is 100% Free */}
            {isFreeCourse ? (
              <div className="bg-emerald-50 p-6 rounded-2xl border border-emerald-200 text-center space-y-4">
                <div className="w-14 h-14 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto shadow-inner">
                  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <div>
                  <h4 className="font-black text-emerald-900 text-base">Khóa học này hoàn toàn Miễn Phí!</h4>
                  <p className="text-xs text-emerald-700 mt-1">
                    Bạn không cần thanh toán bất kỳ chi phí nào. Bấm nút bên dưới để mở khóa và vào học ngay.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleInstantVipClaim}
                  disabled={isVerifying}
                  className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-black uppercase text-sm tracking-wider transition-all shadow-lg shadow-emerald-700/20 active:scale-98 cursor-pointer"
                >
                  {isVerifying ? 'Đang mở khóa...' : 'Bắt đầu học ngay (Miễn phí)'}
                </button>
              </div>
            ) : (
              /* Dynamic QR Payment Box */
              <div className="bg-gradient-to-br from-teal-50/60 via-slate-50 to-pink-50/40 p-4 sm:p-5 rounded-2xl border border-teal-200/70 space-y-4">
                {/* Method Switcher */}

                {/* QR Code and Instructions */}
                <div className="flex flex-col sm:flex-row items-center gap-4 sm:gap-6 justify-center">
                  <div className="relative w-44 h-44 bg-white p-2 rounded-2xl shadow-md border-2 border-teal-200 shrink-0 flex items-center justify-center">
                    <img
                      src={currentQrUrl}
                      alt={`Mã QR ${formatVND(numericAmount)}`}
                      className="w-full h-full object-contain rounded-lg"
                    />
                  </div>

                  <div className="text-left space-y-2 text-xs text-slate-700 flex-1 w-full">
                    <p>
                      <strong>Bước 1:</strong> Mở app Ngân hàng bất kỳ.
                    </p>
                    <p>
                      <strong>Bước 2:</strong> Chọn <strong>"Quét Mã QR"</strong> và quét mã bên cạnh.
                    </p>
                    <p>
                      <strong>Bước 3:</strong> Số tiền <strong>{formatVND(numericAmount)}</strong> và nội dung sẽ được điền tự động:
                    </p>
                    <div className="flex items-center gap-2">
                      <span className="bg-white px-2.5 py-1.5 rounded-lg border border-teal-200 font-mono font-bold text-[#007c76] text-xs">
                        {transferMemo}
                      </span>
                      <button
                        type="button"
                        onClick={() => copyText(transferMemo, 'memo')}
                        className="px-2 py-1 bg-teal-100 text-teal-800 rounded font-semibold text-[10px] hover:bg-teal-200 cursor-pointer"
                      >
                        {copiedField === 'memo' ? '✓ Đã chép' : 'Sao chép'}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Account Details Box */}
                <div className="bg-white/90 p-3.5 rounded-xl border border-teal-100 text-xs space-y-1.5">
                      <div className="flex justify-between items-center">
                        <span className="text-slate-500">Ngân hàng:</span>
                        <span className="font-bold text-slate-800">{config.bankName}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-slate-500">Số tài khoản:</span>
                        <span className="font-mono font-bold text-[#007c76] flex items-center gap-1.5">
                          {config.accountNo}
                          <button
                            type="button"
                            onClick={() => copyText(config.accountNo, 'accNo')}
                            className="text-[10px] bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded hover:bg-slate-200 cursor-pointer"
                          >
                            {copiedField === 'accNo' ? '✓ Đã chép' : 'Copy'}
                          </button>
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-slate-500">Chủ tài khoản:</span>
                        <span className="font-bold text-slate-800 uppercase">{config.accountName}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-slate-500">Số tiền:</span>
                        <span className="font-bold text-[#007c76] flex items-center gap-1.5">
                          {formatVND(numericAmount)}
                          <button
                            type="button"
                            onClick={() => copyText(String(numericAmount), 'amount')}
                            className="text-[10px] bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded hover:bg-slate-200 cursor-pointer"
                          >
                            {copiedField === 'amount' ? '✓ Đã chép' : 'Copy'}
                          </button>
                        </span>
                      </div>
                </div>

                {/* Action Buttons */}
                  <button
                    onClick={handleConfirmTransfer}
                    disabled={isVerifying}
                    className="w-full py-3.5 bg-[#007c76] hover:bg-[#00605b] text-white rounded-xl font-black uppercase text-xs sm:text-sm tracking-wider transition-all disabled:opacity-75 disabled:cursor-not-allowed flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-teal-900/10 active:scale-98"
                  >
                    {isVerifying ? (
                      <>
                        <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path
                            className="opacity-75"
                            fill="currentColor"
                            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                          ></path>
                        </svg>
                        Đang xác nhận thanh toán...
                      </>
                    ) : (
                      'Tôi Đã Quét Mã & Chuyển Khoản'
                    )}
                  </button>
                <p className="text-[10px] text-center text-gray-400 font-medium">
                  Hệ thống tự động kích hoạt khóa học vào phòng học ngay sau khi quét mã thành công.
                </p>
              </div>
            )}
            </>
          )}
          </div>
        ) : (
          <div className="py-8 text-center space-y-4 animate-in fade-in zoom-in duration-500 relative z-10">
            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto text-green-500 mb-6 border-4 border-green-50 shadow-inner">
              <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h3 className="text-2xl font-black text-gray-800 uppercase tracking-tight">Mở khóa thành công!</h3>
            <p className="text-gray-500 font-medium text-sm">
              Hệ thống đã kích hoạt khóa học vào tài khoản của bạn. Đang tải vào phòng học...
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default PaymentModal;

