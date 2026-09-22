import React, { useState, useEffect, useRef } from "react";
import { auth } from "../firebase";
import { sendOtp, verifyOtp } from "../utils/otpService";

interface PurchaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  userEmail: string;
  userName: string;
  courseName: string;
}

const PurchaseModal: React.FC<PurchaseModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  userEmail,
  userName,
  courseName,
}) => {
  const [otpSent, setOtpSent] = useState(false);
  const [otpCode, setOtpCode] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [error, setError] = useState("");
  const [infoMessage, setInfoMessage] = useState("");
  const [cooldownTimer, setCooldownTimer] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  // Determine active reliable email
  const effectiveEmail = (
    userEmail ||
    auth.currentUser?.email ||
    (typeof localStorage !== 'undefined' ? localStorage.getItem('user_email') : '') ||
    'hocvien@gmail.com'
  ).trim();

  useEffect(() => {
    if (isOpen) {
      setOtpSent(false);
      setOtpCode("");
      setError("");
      setInfoMessage("");
      setIsSending(false);
      setIsVerifying(false);
      setCooldownTimer(0);
    }
  }, [isOpen]);

  useEffect(() => {
    if (otpSent && isOpen) {
      const timer = setTimeout(() => {
        inputRef.current?.focus();
      }, 150);
      return () => clearTimeout(timer);
    }
  }, [otpSent, isOpen]);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (cooldownTimer > 0) {
      timer = setTimeout(() => setCooldownTimer(c => c - 1), 1000);
    }
    return () => { if (timer) clearTimeout(timer); };
  }, [cooldownTimer]);

  const handleSendOtp = async () => {
    setIsSending(true);
    setError("");
    setInfoMessage("");
    setOtpCode("");

    try {
      const result = await sendOtp({
        email: effectiveEmail,
        name: userName || 'Học viên',
        flow: 'purchase'
      });

      if (result.success) {
        setOtpSent(true);
        setCooldownTimer(30);
        if (result.fallback && result.otp) {
          setOtpCode(result.otp);
          setInfoMessage(result.message || `Mã OTP đã được khởi tạo tự động (Chế độ dự phòng). Mã xác nhận của bạn là: ${result.otp}`);
        } else {
          setInfoMessage(result.message || `Mã OTP đã được gửi đến email ${effectiveEmail}. Vui lòng kiểm tra hộp thư (cả thư rác/Spam) để lấy mã.`);
        }
      } else {
        setError(result?.error || "Không thể gửi mã OTP qua email lúc này. Vui lòng kiểm tra lại địa chỉ email.");
      }
    } catch (err: any) {
      console.error("[PurchaseModal:SendOtp] Error:", err);
      setError(err?.message || "Lỗi kết nối khi gửi mã xác thực. Vui lòng thử lại.");
    } finally {
      setIsSending(false);
    }
  };

  const handleVerify = async () => {
    if (otpCode.length !== 6) {
      setError("Vui lòng nhập đầy đủ mã OTP 6 số từ email của bạn.");
      return;
    }
    
    setError("");
    setIsVerifying(true);

    try {
      const result = await verifyOtp({
        email: effectiveEmail,
        otp: otpCode,
        flow: 'purchase'
      });

      if (result.success) {
        onSuccess();
      } else {
        setError(result.error || "Mã OTP không chính xác hoặc đã hết hạn. Vui lòng kiểm tra lại email.");
      }
    } catch (err: any) {
      console.error("[PurchaseModal:Verify] Error:", err);
      setError(err?.message || "Lỗi kết nối máy chủ xác minh OTP. Vui lòng thử lại.");
    } finally {
      setIsVerifying(false);
    }
  };

  if (!isOpen) return null;

  const isWorking = isSending || isVerifying;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm px-4">
      <div className="bg-white rounded-3xl w-full max-w-md p-6 sm:p-8 shadow-2xl relative overflow-hidden">
        
        {/* Progress Bar */}
        <div className={`absolute top-0 left-0 right-0 h-1.5 bg-blue-50 transition-opacity duration-300 ${isWorking ? 'opacity-100' : 'opacity-0'}`}>
          <div className="h-full bg-[#007c76] w-full origin-left animate-[pulse_1.5s_ease-in-out_infinite]" style={{ animation: 'progress-indeterminate 1.5s infinite linear', transformOrigin: '0% 50%' }}>
            <style>{`
              @keyframes progress-indeterminate {
                0% { transform: translateX(-100%) scaleX(0.2); }
                50% { transform: translateX(0%) scaleX(0.5); }
                100% { transform: translateX(100%) scaleX(0.2); }
              }
            `}</style>
          </div>
        </div>

        <button
          onClick={onClose}
          disabled={isWorking}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
        >
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        <div className="text-center mb-6 mt-2">
          <div className="w-16 h-16 bg-teal-50 rounded-full flex items-center justify-center mx-auto mb-4 relative">
            {isWorking && (
              <div className="absolute inset-0 border-4 border-[#007c76] border-t-transparent rounded-full animate-spin"></div>
            )}
            <svg className="w-8 h-8 text-[#007c76] relative z-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            Xác minh danh tính
          </h2>
          <p className="text-gray-600 text-sm">
            Bạn đang đăng ký gói: <br />
            <span className="font-semibold text-gray-800">
              {courseName}
            </span>
          </p>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-600 text-xs font-bold rounded-xl text-center">
            {error}
          </div>
        )}

        {infoMessage && (
          <div className="mb-4 p-3 bg-teal-50 border border-teal-200 text-[#007c76] text-xs font-semibold rounded-xl text-center">
            {infoMessage}
          </div>
        )}

        {!otpSent ? (
          <div className="space-y-4">
            <p className="text-sm text-gray-600 text-center">
              Nhấn nút bên dưới để nhận mã xác minh OTP gửi đến tài khoản email{" "}
              <b className="text-gray-800">{effectiveEmail}</b> của bạn.
            </p>
            <button
              onClick={handleSendOtp}
              disabled={isSending}
              className="w-full py-3.5 px-4 bg-[#007c76] hover:bg-[#00605b] text-white font-bold uppercase text-xs tracking-wider rounded-2xl transition-all shadow-lg shadow-teal-900/10 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 cursor-pointer active:scale-98"
            >
              {isSending ? (
                <>
                  <svg className="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Đang gửi OTP...
                </>
              ) : (
                "Gửi mã OTP"
              )}
            </button>
          </div>
        ) : (
          <div className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1 text-center">
                Nhập mã OTP (6 số)
              </label>
              <input
                ref={inputRef}
                type="text"
                maxLength={6}
                value={otpCode}
                onChange={(e) => {
                  setOtpCode(e.target.value.replace(/\D/g, ""));
                  setError("");
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && otpCode.length === 6 && !isVerifying) {
                    e.preventDefault();
                    handleVerify();
                  }
                }}
                placeholder="000000"
                disabled={isVerifying}
                className="w-full text-center text-3xl font-bold tracking-[0.5em] py-3 border-2 border-gray-200 rounded-2xl focus:ring-4 focus:ring-teal-100 focus:border-[#007c76] transition-all outline-none disabled:bg-gray-50 disabled:text-gray-400 font-mono"
              />
            </div>
            <button
              onClick={handleVerify}
              disabled={otpCode.length !== 6 || isVerifying}
              className="w-full py-3.5 px-4 bg-[#007c76] hover:bg-[#00605b] text-white font-bold uppercase text-xs tracking-wider rounded-2xl transition-all shadow-lg shadow-teal-900/10 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 cursor-pointer active:scale-98"
            >
              {isVerifying ? (
                <>
                  <svg className="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Đang xác minh...
                </>
              ) : (
                "Xác nhận & Tiếp tục"
              )}
            </button>
            <div className="flex items-center justify-center pt-1">
              <button
                type="button"
                onClick={handleSendOtp}
                disabled={isWorking || cooldownTimer > 0}
                className="text-xs font-bold text-[#007c76] hover:underline transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
              >
                {cooldownTimer > 0 
                  ? (cooldownTimer > 60 ? `Thử lại sau ${Math.ceil(cooldownTimer / 60)} phút` : `Gửi lại mã OTP (${cooldownTimer}s)`) 
                  : "Chưa nhận được? Gửi lại mã OTP"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PurchaseModal;

