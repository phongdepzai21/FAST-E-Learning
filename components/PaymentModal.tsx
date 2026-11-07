import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Course } from '../types';
import { auth, db } from '../firebase';
import { ADMIN_EMAILS } from '../constants';
import { doc, setDoc, onSnapshot } from 'firebase/firestore';
import { parseNumericPrice, formatVND, getPaymentConfig } from '../utils/qrService';
import { sendOtp, verifyOtp } from '../utils/otpService';
import { PaymentStatusPolling } from './PaymentStatusPolling';

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
  const [config, setConfig] = useState(getPaymentConfig);
  const [paymentCode, setPaymentCode] = useState<string>('');
  const [orderId, setOrderId] = useState<string>('');
  
  // Transition State: After successful OTP verification, show PaymentStatusPolling
  const [showPaymentPolling, setShowPaymentPolling] = useState(false);
  
  // OTP States
  const [showOtpForm, setShowOtpForm] = useState(false);
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

    // Reset states when modal toggles
    setShowOtpForm(false);
    setShowPaymentPolling(false);
    setUserInputOtp('');
    setOtpError('');
    setOtpNotice('');
    setOtpCountdown(0);
    setOrderId('');

    if (isOpen) {
      const email = (user?.email || (typeof localStorage !== 'undefined' ? localStorage.getItem('user_email') : '') || 'hocvien@gmail.com').trim().toLowerCase();
      const amount = parseNumericPrice(course.price);

      if (amount > 0) {
        fetch('/api/create-order', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            courseId: course.id,
            courseTitle: course.title,
            amount,
            email,
            userId: user?.uid || ''
          })
        })
        .then(res => res.json())
        .then(data => {
          if (data.success && data.paymentCode) {
            setPaymentCode(data.paymentCode);
            if (data.orderId) setOrderId(data.orderId);
            if (data.bankAccount) {
              setConfig(prev => ({
                ...prev,
                accountNo: data.bankAccount,
                bankName: data.bankCode || 'ACB',
                accountName: data.bankAccountName || prev.accountName
              }));
            }
          }
        })
        .catch(err => {
          console.warn("[PaymentModal] Create order API error, fallback to random code:", err);
          const chars = '0123456789';
          let result = '';
          for (let i = 0; i < 6; i++) {
            result += chars.charAt(Math.floor(Math.random() * chars.length));
          }
          setPaymentCode(result);
        });
      } else {
        setPaymentCode('FREE');
      }
    }
  }, [isOpen, course.id, course.price]);

  // Real-time listener for automated payment detection and course activation
  useEffect(() => {
    if (!isOpen) return;

    const user = auth.currentUser;
    const email = (user?.email || (typeof localStorage !== 'undefined' ? localStorage.getItem('user_email') : '') || '').trim().toLowerCase();
    if (!email) return;

    const docRef = doc(db, 'users', email, 'purchased_courses', course.id);
    const unsubscribe = onSnapshot(docRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        if (data.status === 'active') {
          localStorage.setItem(`course_unlocked_${course.id}`, 'true');
          setIsCompleted(true);
          setTimeout(() => {
            onSuccess();
            setIsCompleted(false);
          }, 1200);
        }
      }
    }, (err) => {
      console.warn("[PaymentModal:RealtimeSync] Auto-listener subscription warning:", err);
    });

    return () => unsubscribe();
  }, [isOpen, course.id, onSuccess]);

  if (!isOpen) return null;

  const numericAmount = parseNumericPrice(course.price);
  const isFreeCourse = numericAmount === 0;

  const handleConfirmTransfer = async () => {
    setIsVerifying(true);
    setOtpError('');
    setOtpNotice('');
    setUserInputOtp('');
    const user = auth.currentUser;
    const email = (user?.email || (typeof localStorage !== 'undefined' ? localStorage.getItem('user_email') : '') || 'hocvien@gmail.com').trim();

    try {
      const result = await sendOtp({
        email,
        name: user?.displayName || 'Học viên',
        flow: 'purchase'
      });

      if (result.success) {
        setShowOtpForm(true);
        setOtpNotice(result.message || `Mã xác thực OTP đã được gửi đến email ${email}.`);
        setOtpCountdown(60);
        if (result.fallback && result.otp) {
          setUserInputOtp(result.otp);
        }
      } else {
        setOtpError(result.error || "Không thể gửi mã OTP qua email lúc này.");
      }
    } catch (err: any) {
      setOtpError(err?.message || "Lỗi kết nối tới máy chủ gửi mã OTP.");
    }
    setIsVerifying(false);
  };

  const handleResendOtp = async () => {
    if (otpCountdown > 0) return;
    setOtpError('');
    setOtpNotice('');
    setIsVerifying(true);
    const user = auth.currentUser;
    const email = (user?.email || (typeof localStorage !== 'undefined' ? localStorage.getItem('user_email') : '') || 'hocvien@gmail.com').trim();

    try {
      const result = await sendOtp({
        email,
        name: user?.displayName || 'Học viên',
        flow: 'purchase'
      });

      if (result.success) {
        setOtpNotice(result.message || `Mã OTP mới đã được gửi lại thành công đến email ${email}.`);
        setOtpCountdown(60);
        if (result.fallback && result.otp) {
          setUserInputOtp(result.otp);
        }
      } else {
        setOtpError(result.error || "Không thể gửi lại mã OTP lúc này.");
      }
    } catch (err: any) {
      setOtpError(err?.message || "Lỗi kết nối khi gửi lại OTP.");
    }
    setIsVerifying(false);
  };

  const handleVerifyOtp = async () => {
    if (userInputOtp.length !== 6) {
      setOtpError("Vui lòng nhập đầy đủ mã OTP 6 chữ số từ email của bạn.");
      return;
    }
    setIsVerifying(true);
    setOtpError('');

    const user = auth.currentUser;
    const email = (user?.email || (typeof localStorage !== 'undefined' ? localStorage.getItem('user_email') : '') || 'hocvien@gmail.com').trim();

    try {
      const verifyRes = await verifyOtp({
        email,
        otp: userInputOtp,
        flow: 'purchase'
      });

      if (verifyRes.success) {
        setOtpError('');
        setShowOtpForm(false);
        // Seamlessly transition to PaymentStatusPolling component without forcing a page reload!
        setShowPaymentPolling(true);
      } else {
        setOtpError(verifyRes.error || "Mã OTP không chính xác hoặc đã hết hạn.");
      }
    } catch (err) {
      setOtpError("Lỗi kết nối khi xác thực mã OTP.");
    }
    setIsVerifying(false);
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
      } catch (e) {}
    }
    setIsVerifying(false);
    setIsCompleted(true);
    setTimeout(() => {
      onSuccess();
      setIsCompleted(false);
    }, 800);
  };

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = '';
      };
    }
  }, [isOpen]);

  return (
    <div className="fixed inset-0 z-[999999] w-screen h-screen min-h-screen grid place-items-center bg-slate-950/85 backdrop-blur-md px-4 overflow-y-auto py-6 animate-fade-in">
      <div className="bg-white max-w-xl w-full rounded-3xl p-6 sm:p-8 shadow-2xl relative overflow-hidden animate-in zoom-in-95 duration-300 border border-slate-100">
        <button
          onClick={onClose}
          disabled={isVerifying || isCompleted}
          className="absolute top-5 right-5 text-gray-400 hover:bg-gray-100 p-2.5 rounded-full transition-colors z-20 disabled:opacity-50 cursor-pointer"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        {!isCompleted ? (
          <div>
            {showPaymentPolling ? (
              /* Seamlessly transition to PaymentStatusPolling component after OTP verification */
              <PaymentStatusPolling
                course={course}
                paymentCode={paymentCode}
                orderId={orderId}
                amount={numericAmount}
                config={{
                  bankName: config.bankName,
                  accountNo: config.accountNo,
                  accountName: config.accountName,
                  bankId: config.bankId,
                }}
                onSuccess={() => {
                  setIsCompleted(true);
                  setTimeout(() => {
                    onSuccess();
                    setIsCompleted(false);
                  }, 1200);
                }}
                onBack={() => setShowPaymentPolling(false)}
              />
            ) : (
              <div className="space-y-6 relative z-10">
                {/* Header */}
                <div className="text-center space-y-1">
                  <div className="inline-flex items-center gap-2 px-3 py-1 bg-teal-50 border border-teal-200/60 rounded-full text-[#007c76] font-extrabold text-[11px] uppercase tracking-wider mb-1">
                    <span className="w-2 h-2 rounded-full bg-[#007c76] animate-pulse"></span>
                    FAST E-Learning Secure Checkout
                  </div>
                  <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">Thanh Toán Đăng Ký Khóa Học</h2>
                  <p className="text-slate-500 font-medium text-xs sm:text-sm">
                    {showOtpForm ? "Xác thực bảo mật tài khoản học viên" : "Xác nhận đơn hàng và mở khóa học"}
                  </p>
                </div>

                {/* Course Information Card */}
                <div className="bg-gradient-to-r from-slate-50 to-teal-50/40 p-4 rounded-2xl border border-slate-200/80 flex items-center justify-between shadow-xs">
                  <div className="flex-1 min-w-0 pr-3">
                    <span className="text-[10px] font-black uppercase text-teal-700 bg-teal-100 px-2 py-0.5 rounded-md">Khóa học đăng ký</span>
                    <h3 className="font-bold text-slate-900 text-sm sm:text-base truncate mt-1">{course.title}</h3>
                    <p className="text-xs font-semibold text-slate-400 mt-0.5">
                      Mã đơn: <span className="font-mono text-slate-600 font-bold">{paymentCode || 'FAST...'}</span>
                    </p>
                  </div>
                  <div className="text-right">
                    <div className="text-[10px] uppercase font-bold text-slate-400">Học phí</div>
                    <div className="text-[#007c76] font-black text-lg sm:text-xl whitespace-nowrap">
                      {isFreeCourse ? 'Miễn phí' : formatVND(numericAmount)}
                    </div>
                  </div>
                </div>

                {/* OTP Verification Form */}
                {showOtpForm ? (
                  <div className="bg-white p-6 sm:p-7 rounded-3xl border border-slate-200/80 shadow-lg space-y-5 text-center animate-in zoom-in-95">
                    <div className="w-16 h-16 bg-teal-50 text-[#007c76] rounded-2xl flex items-center justify-center mx-auto mb-1 shadow-inner border border-teal-100">
                      <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                      </svg>
                    </div>
                    <h4 className="font-black text-slate-900 text-lg uppercase tracking-tight">Xác thực mã OTP bảo mật</h4>
                    <p className="text-xs sm:text-sm text-slate-500 font-medium px-2">
                      Mã xác thực 6 chữ số đã được gửi qua email đến <strong className="text-slate-800">{targetEmail}</strong>. Vui lòng nhập mã để chuyển đến màn hình quét QR thanh toán.
                    </p>
                    <div className="pt-1">
                      {otpNotice && (
                        <div className="mb-4 p-3 bg-teal-50 border border-teal-200 text-[#007c76] text-xs font-semibold rounded-xl text-center animate-in fade-in">
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
                        placeholder="• • • • • •"
                        className="w-full text-center text-3xl tracking-[0.5em] font-black font-mono text-[#007c76] bg-slate-50 border-2 border-slate-200 focus:border-[#007c76] focus:ring-4 focus:ring-[#007c76]/10 rounded-2xl py-3.5 outline-none transition-all placeholder:tracking-normal placeholder:text-xl placeholder:font-medium placeholder:text-slate-300 disabled:opacity-75"
                      />
                      {otpError && (
                        <p className="text-red-500 text-xs font-bold mt-2.5 animate-in slide-in-from-top-1">{otpError}</p>
                      )}

                      {/* Visual loading status indicator */}
                      <div className="mt-4 w-full">
                        {isVerifying ? (
                          <div className="space-y-2">
                            <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden relative">
                              <div className="h-full bg-gradient-to-r from-teal-500 to-[#007c76] rounded-full animate-pulse w-full"></div>
                            </div>
                            <div className="flex items-center justify-center gap-2 text-xs font-bold text-[#007c76] animate-pulse">
                              <svg className="animate-spin h-3.5 w-3.5 text-[#007c76]" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                              </svg>
                              <span>Đang xác thực mã OTP bảo mật...</span>
                            </div>
                          </div>
                        ) : (
                          <div className="h-1.5 w-full bg-slate-100/50 rounded-full"></div>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-xs px-2 pt-1 pb-1">
                      <span className="text-slate-400 font-bold uppercase tracking-wider">Không nhận được mã?</span>
                      <button
                        type="button"
                        onClick={handleResendOtp}
                        disabled={otpCountdown > 0 || isVerifying}
                        className={`font-black uppercase tracking-wider cursor-pointer transition-colors ${otpCountdown > 0 || isVerifying ? 'text-slate-300 cursor-not-allowed' : 'text-[#007c76] hover:underline'}`}
                      >
                        Gửi lại {otpCountdown > 0 ? `(${otpCountdown}s)` : ''}
                      </button>
                    </div>

                    <div className="flex gap-3 pt-2">
                      <button
                        type="button"
                        onClick={() => setShowOtpForm(false)}
                        disabled={isVerifying}
                        className="flex-1 py-3.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-2xl font-bold uppercase text-xs tracking-wider transition-all cursor-pointer disabled:opacity-50"
                      >
                        Quay lại
                      </button>
                      <button
                        type="button"
                        onClick={handleVerifyOtp}
                        disabled={userInputOtp.length !== 6 || isVerifying}
                        className="flex-1 py-3.5 bg-[#007c76] hover:bg-[#00605b] text-white rounded-2xl font-black uppercase text-xs tracking-wider transition-all shadow-md shadow-teal-700/20 active:scale-98 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                      >
                        {isVerifying ? (
                          <>
                            <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            <span>Đang xác thực...</span>
                          </>
                        ) : (
                          'Xác nhận mã OTP'
                        )}
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    {/* Special VIP/Admin Instant Claim Box */}
                    {isVipOrAdmin && !isFreeCourse && (
                      <div className="p-4 bg-gradient-to-r from-amber-500/10 via-yellow-500/10 to-amber-500/10 border-2 border-amber-400/40 rounded-2xl flex flex-col gap-2.5">
                        <div className="flex items-center justify-between">
                          <span className="px-2.5 py-1 bg-amber-500 text-slate-950 font-black text-[10px] uppercase tracking-wider rounded-md shadow-xs">
                            Đặc quyền VIP / Admin
                          </span>
                          <span className="text-xs font-bold text-amber-900">Mở khóa miễn phí ngay</span>
                        </div>
                        <p className="text-xs text-amber-800 leading-relaxed font-medium">
                          Tài khoản của bạn có quyền thành viên VIP hoặc Quản trị hệ thống. Bạn có thể kích hoạt khóa học này ngay lập tức.
                        </p>
                        <button
                          type="button"
                          onClick={handleInstantVipClaim}
                          disabled={isVerifying}
                          className="w-full py-3 bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-slate-950 font-black rounded-xl text-xs uppercase tracking-widest transition-all shadow-md shadow-amber-500/20 active:scale-98 flex items-center justify-center gap-2 cursor-pointer"
                        >
                          <span>👑 Nhận Khóa Học Ngay (Đặc quyền VIP/Admin)</span>
                        </button>
                      </div>
                    )}

                    {/* If Course is 100% Free */}
                    {isFreeCourse ? (
                      <div className="bg-emerald-50 p-7 rounded-3xl border border-emerald-200 text-center space-y-4 shadow-sm">
                        <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-2xl flex items-center justify-center mx-auto shadow-inner border border-emerald-200">
                          <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" />
                          </svg>
                        </div>
                        <div>
                          <h4 className="font-black text-emerald-900 text-lg">Khóa học này hoàn toàn Miễn Phí!</h4>
                          <p className="text-xs sm:text-sm text-emerald-700 mt-1">
                            Bạn không cần thanh toán bất kỳ chi phí nào. Bấm nút bên dưới để mở khóa và vào phòng học ngay.
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={handleInstantVipClaim}
                          disabled={isVerifying}
                          className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl font-black uppercase text-xs sm:text-sm tracking-wider transition-all shadow-lg shadow-emerald-700/20 active:scale-98 cursor-pointer"
                        >
                          {isVerifying ? 'Đang mở khóa...' : 'Bắt đầu học ngay (Miễn phí)'}
                        </button>
                      </div>
                    ) : (
                      /* Initial button to request OTP before payment QR display */
                      <div className="pt-2">
                        <button
                          type="button"
                          onClick={handleConfirmTransfer}
                          disabled={isVerifying}
                          className="w-full py-4 bg-gradient-to-r from-teal-600 to-[#007c76] hover:from-teal-700 hover:to-[#00605b] text-white rounded-2xl font-black uppercase text-xs sm:text-sm tracking-wider transition-all shadow-lg shadow-teal-700/25 active:scale-98 cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2.5"
                        >
                          {isVerifying ? (
                            <>
                              <svg className="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                              </svg>
                              <span>Đang gửi mã xác thực OTP...</span>
                            </>
                          ) : (
                            <>
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                              </svg>
                              <span>Xác thực OTP & Hiển thị mã QR thanh toán</span>
                            </>
                          )}
                        </button>
                        <p className="text-[11px] text-center text-slate-400 font-medium mt-3">
                          Hệ thống sẽ gửi mã xác thực OTP 6 số đến email đăng nhập của bạn để bảo mật giao dịch.
                        </p>
                      </div>
                    )}
                  </>
                )}
              </div>
            )}
          </div>
        ) : (
          <div className="py-10 text-center space-y-5 animate-in fade-in zoom-in duration-500 relative z-10">
            <div className="w-24 h-24 bg-emerald-100 rounded-full flex items-center justify-center mx-auto text-emerald-600 mb-2 border-4 border-emerald-50 shadow-inner">
              <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <div className="space-y-2">
              <h3 className="text-2xl sm:text-3xl font-black text-slate-900 uppercase tracking-tight">Thanh Toán & Mở Khóa Thành Công!</h3>
              <p className="text-slate-500 font-medium text-sm max-w-sm mx-auto">
                Hệ thống SePay / ACB đã xác nhận giao dịch thành công. Đang chuyển vào phòng học trực tuyến...
              </p>
            </div>
            <div className="pt-2">
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-50 text-emerald-700 rounded-full text-xs font-bold animate-pulse">
                <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                Đang chuyển vào phòng học...
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PaymentModal;
