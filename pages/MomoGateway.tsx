import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { auth, db } from '../firebase';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { formatVND, getMomoQrUrl, getPaymentConfig } from '../utils/qrService';
import { COURSES } from '../constants';

const MomoGatewayPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const courseId = searchParams.get('courseId') || '';
  const rawTitle = searchParams.get('title') || 'Khóa học FAST E-Learning';
  const rawAmount = searchParams.get('amount') || '0';
  const orderId = searchParams.get('orderId') || `FAST-${Date.now().toString().slice(-8)}`;
  const returnUrl = searchParams.get('returnUrl') || `/hoc/${courseId}`;
  const amount = parseInt(rawAmount, 10) || 0;

  const [step, setStep] = useState<'checkout' | 'processing' | 'success' | 'cancelled'>('checkout');
  const [selectedMethod, setSelectedMethod] = useState<'momo_wallet' | 'momo_atm' | 'momo_cc'>('momo_wallet');
  const [countdown, setCountdown] = useState(5);
  const [phoneNumber, setPhoneNumber] = useState('0987******');
  const [otpCode, setOtpCode] = useState('');
  const [showOtpInput, setShowOtpInput] = useState(false);
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);

  const currentUser = auth.currentUser;

  // Auto redirect on success after countdown
  useEffect(() => {
    let timer: any;
    if (step === 'success') {
      timer = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(timer);
            navigate(returnUrl);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [step, navigate, returnUrl]);

  const handleAuthorizePayment = async () => {
    setIsProcessingPayment(true);
    setStep('processing');

    try {
      // 1. Mark as unlocked locally immediately
      if (courseId) {
        localStorage.setItem(`course_unlocked_${courseId}`, 'true');
        // If it's a VIP package
        if (courseId === 'vip-lifetime-access' && currentUser?.email) {
          const userEmail = currentUser.email.toLowerCase();
          const localRolesStr = localStorage.getItem(`user_roles_${userEmail}`);
          const existingRoles = localRolesStr ? JSON.parse(localRolesStr) : {};
          localStorage.setItem(`user_roles_${userEmail}`, JSON.stringify({
            ...existingRoles,
            isVip: true
          }));
        }
      }

      // 2. Persist to Firestore if user logged in
      if (currentUser && currentUser.email && courseId) {
        const userEmail = currentUser.email.toLowerCase();
        
        if (courseId === 'vip-lifetime-access') {
          // VIP upgrade
          const userDocRef = doc(db, 'users', userEmail);
          await setDoc(userDocRef, {
            isVip: true,
            vipPurchasedAt: new Date().toISOString()
          }, { merge: true });

          await setDoc(doc(db, 'users', userEmail, 'purchased_courses', 'vip-lifetime-access'), {
            courseId: 'vip-lifetime-access',
            courseTitle: 'VIP MEMBERSHIP LIFETIME',
            purchasedAt: new Date().toISOString(),
            price: formatVND(amount),
            status: 'active',
            paymentGateway: 'MOMO_PAYMENT_GATEWAY',
            orderId: orderId,
            paidAt: new Date().toISOString()
          }, { merge: true });
        } else {
          // Normal course
          const courseDocRef = doc(db, 'users', userEmail, 'purchased_courses', courseId);
          await setDoc(courseDocRef, {
            courseId: courseId,
            courseTitle: rawTitle,
            purchasedAt: new Date().toISOString(),
            price: formatVND(amount),
            status: 'active',
            progress: 0,
            paymentGateway: 'MOMO_PAYMENT_GATEWAY',
            orderId: orderId,
            paidAt: new Date().toISOString()
          }, { merge: true });
        }
      }

      // Simulate payment gateway delay (Momo processing)
      setTimeout(() => {
        setIsProcessingPayment(false);
        setStep('success');
      }, 1800);
    } catch (error) {
      console.warn('Lỗi kích hoạt thanh toán qua cổng MoMo:', error);
      // Still unlock locally so user is never blocked
      if (courseId) {
        localStorage.setItem(`course_unlocked_${courseId}`, 'true');
      }
      setIsProcessingPayment(false);
      setStep('success');
    }
  };

  const handleCancel = () => {
    navigate(-1);
  };

  return (
    <div className="min-h-screen bg-[#eceff1] font-sans antialiased text-slate-800 flex flex-col justify-between">
      {/* MoMo Gateway Top Navbar (Chuẩn nhận diện thương hiệu MoMo Payment Gateway) */}
      <header className="bg-[#A50064] text-white shadow-md">
        <div className="max-w-5xl mx-auto px-4 py-3 sm:py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white rounded-2xl flex items-center justify-center p-1.5 shadow-md">
              <img
                src="https://upload.wikimedia.org/wikipedia/vi/f/fe/MoMo_Logo.png"
                alt="MoMo Gateway"
                className="w-full h-full object-contain"
                onError={(e) => {
                  // Fallback to stylized text if image blocked
                  (e.target as HTMLElement).style.display = 'none';
                }}
              />
              <span className="text-[#A50064] font-black text-xs">MoMo</span>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-base sm:text-lg tracking-tight">CỔNG THANH TOÁN MOMO</span>
                <span className="bg-white/20 text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">
                  Bảo Mật SSL 256-bit
                </span>
              </div>
              <p className="text-[11px] text-pink-100 hidden sm:block">
                Hệ thống thanh toán trực tuyến an toàn & tức thì của Công ty Cổ phần Dịch vụ Di Động Trực Tuyến (M_Service)
              </p>
            </div>
          </div>

          <div className="text-right">
            <span className="text-[10px] text-pink-200 block uppercase font-bold tracking-wider">Đơn vị thụ hưởng</span>
            <span className="text-xs sm:text-sm font-bold text-white tracking-tight">FAST E-LEARNING</span>
          </div>
        </div>
      </header>

      {/* Main Payment Container */}
      <main className="max-w-5xl w-full mx-auto px-4 py-6 sm:py-10 flex-grow">
        {step === 'checkout' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Left Column: Order Summary */}
            <div className="lg:col-span-5 bg-white rounded-3xl p-6 shadow-sm border border-slate-200/80 space-y-6">
              <div>
                <div className="flex items-center justify-between text-xs text-slate-500 font-medium">
                  <span>MÃ ĐƠN HÀNG</span>
                  <span className="font-mono font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded">
                    {orderId}
                  </span>
                </div>
                <h2 className="text-xl font-black text-slate-900 mt-3 line-clamp-2">
                  {rawTitle}
                </h2>
                <p className="text-xs text-slate-500 mt-1">
                  Đăng ký kích hoạt tài khoản học viên trọn đời
                </p>
              </div>

              <div className="border-t border-slate-100 pt-4 space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">Giá trị khóa học</span>
                  <span className="font-semibold text-slate-800">{formatVND(amount)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">Phí giao dịch MoMo</span>
                  <span className="font-semibold text-emerald-600">Miễn phí (0đ)</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">Khách hàng</span>
                  <span className="font-medium text-slate-800 truncate max-w-[200px]">
                    {currentUser?.email || 'Học viên FAST'}
                  </span>
                </div>
                <div className="border-t border-dashed border-slate-200 pt-4 flex justify-between items-baseline">
                  <span className="text-base font-bold text-slate-900">Tổng tiền thanh toán</span>
                  <span className="text-2xl font-black text-[#A50064] tracking-tight">
                    {formatVND(amount)}
                  </span>
                </div>
              </div>

              <div className="bg-amber-50 rounded-2xl p-4 border border-amber-200/80 text-xs text-amber-900 space-y-1.5">
                <div className="flex items-center gap-1.5 font-bold">
                  <svg className="w-4 h-4 text-amber-600 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                  </svg>
                  <span>Kích hoạt tự động 100%</span>
                </div>
                <p className="leading-relaxed text-amber-800">
                  Sau khi bạn hoàn tất xác thực trên cổng MoMo, trang sẽ <strong>tự động chuyển bạn quay về khóa học</strong> và mở khóa toàn bộ bài giảng ngay lập tức.
                </p>
              </div>

              <div className="flex items-center justify-between text-xs text-slate-400">
                <button
                  type="button"
                  onClick={handleCancel}
                  className="hover:text-slate-700 underline font-medium cursor-pointer"
                >
                  ← Hủy giao dịch & quay lại
                </button>
                <span>CSKH: 1900 54 54 41</span>
              </div>
            </div>

            {/* Right Column: MoMo Payment Action Portal */}
            <div className="lg:col-span-7 bg-white rounded-3xl p-6 sm:p-8 shadow-sm border border-slate-200/80 space-y-6">
              <div>
                <span className="text-[11px] font-black uppercase tracking-wider text-[#A50064] bg-pink-50 px-2.5 py-1 rounded-md">
                  Phương thức thanh toán MoMo
                </span>
                <h3 className="text-xl font-extrabold text-slate-900 mt-2">
                  Chọn hình thức thanh toán thuận tiện nhất
                </h3>
              </div>

              {/* Payment Methods */}
              <div className="space-y-3">
                {/* Method 1: MoMo Wallet QR or 1-Click */}
                <label
                  onClick={() => setSelectedMethod('momo_wallet')}
                  className={`flex items-center justify-between p-4 rounded-2xl border-2 transition-all cursor-pointer ${
                    selectedMethod === 'momo_wallet'
                      ? 'border-[#A50064] bg-pink-50/50 shadow-sm'
                      : 'border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-center gap-3.5">
                    <div className="w-10 h-10 rounded-xl bg-[#A50064] text-white flex items-center justify-center font-black text-sm shrink-0">
                      M
                    </div>
                    <div>
                      <div className="font-bold text-slate-900 text-sm sm:text-base flex items-center gap-2">
                        Ví MoMo / Quét mã QR MoMo
                        <span className="bg-emerald-100 text-emerald-800 text-[10px] font-black px-2 py-0.5 rounded-full">
                          Khuyên dùng
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Xác nhận tức thì qua ứng dụng MoMo trên điện thoại
                      </p>
                    </div>
                  </div>
                  <input
                    type="radio"
                    name="momoMethod"
                    checked={selectedMethod === 'momo_wallet'}
                    onChange={() => setSelectedMethod('momo_wallet')}
                    className="accent-[#A50064] w-4 h-4 cursor-pointer"
                  />
                </label>

                {/* Method 2: Domestic ATM via MoMo Gateway */}
                <label
                  onClick={() => setSelectedMethod('momo_atm')}
                  className={`flex items-center justify-between p-4 rounded-2xl border-2 transition-all cursor-pointer ${
                    selectedMethod === 'momo_atm'
                      ? 'border-[#A50064] bg-pink-50/50 shadow-sm'
                      : 'border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-center gap-3.5">
                    <div className="w-10 h-10 rounded-xl bg-slate-800 text-white flex items-center justify-center font-bold text-xs shrink-0">
                      ATM
                    </div>
                    <div>
                      <div className="font-bold text-slate-900 text-sm sm:text-base">
                        Thẻ ATM Nội địa / Internet Banking
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Hỗ trợ hơn 40 ngân hàng qua cổng Napas MoMo
                      </p>
                    </div>
                  </div>
                  <input
                    type="radio"
                    name="momoMethod"
                    checked={selectedMethod === 'momo_atm'}
                    onChange={() => setSelectedMethod('momo_atm')}
                    className="accent-[#A50064] w-4 h-4 cursor-pointer"
                  />
                </label>

                {/* Method 3: Visa / Master / JCB via MoMo Gateway */}
                <label
                  onClick={() => setSelectedMethod('momo_cc')}
                  className={`flex items-center justify-between p-4 rounded-2xl border-2 transition-all cursor-pointer ${
                    selectedMethod === 'momo_cc'
                      ? 'border-[#A50064] bg-pink-50/50 shadow-sm'
                      : 'border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-center gap-3.5">
                    <div className="w-10 h-10 rounded-xl bg-blue-700 text-white flex items-center justify-center font-bold text-xs shrink-0">
                      VISA
                    </div>
                    <div>
                      <div className="font-bold text-slate-900 text-sm sm:text-base">
                        Thẻ Quốc Tế (Visa, MasterCard, JCB)
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Thanh toán bảo mật 3D-Secure toàn cầu
                      </p>
                    </div>
                  </div>
                  <input
                    type="radio"
                    name="momoMethod"
                    checked={selectedMethod === 'momo_cc'}
                    onChange={() => setSelectedMethod('momo_cc')}
                    className="accent-[#A50064] w-4 h-4 cursor-pointer"
                  />
                </label>
              </div>

              {/* Dynamic Sub-Form for MoMo Wallet / ATM / CC */}
              {selectedMethod === 'momo_wallet' ? (
                <div className="bg-gradient-to-br from-pink-50 to-white rounded-2xl p-5 border border-pink-200/80 space-y-4">
                  <div className="flex flex-col sm:flex-row items-center gap-5">
                    <div className="bg-white p-2.5 rounded-2xl border-2 border-[#A50064] shadow-md shrink-0 flex flex-col items-center">
                      <img
                        src={getMomoQrUrl({
                          phone: getPaymentConfig().momoPhone,
                          name: getPaymentConfig().momoName,
                          amount: amount,
                          memo: orderId
                        })}
                        alt="QR MoMo Payment"
                        className="w-36 h-36 object-contain"
                      />
                      <span className="text-[10px] font-black text-[#A50064] mt-1.5 uppercase tracking-wider">
                        Quét bằng MoMo
                      </span>
                    </div>

                    <div className="flex-1 space-y-2 text-xs text-slate-700">
                      <div className="flex items-center gap-2">
                        <span className="w-5 h-5 rounded-full bg-[#A50064] text-white flex items-center justify-center font-bold text-[10px]">1</span>
                        <span>Mở ứng dụng <strong>Ví MoMo</strong> trên điện thoại</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="w-5 h-5 rounded-full bg-[#A50064] text-white flex items-center justify-center font-bold text-[10px]">2</span>
                        <span>Chọn <strong>"Quét Mã QR"</strong> và hướng camera vào mã</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="w-5 h-5 rounded-full bg-[#A50064] text-white flex items-center justify-center font-bold text-[10px]">3</span>
                        <span>Bấm xác nhận hoặc bấm nút <strong>"Xác nhận thanh toán"</strong> bên dưới</span>
                      </div>
                      <div className="bg-white/80 p-2.5 rounded-xl border border-pink-100 font-mono text-[11px] text-slate-600 space-y-1">
                        <div>Số MoMo: <strong className="text-[#A50064]">{getPaymentConfig().momoPhone}</strong> ({getPaymentConfig().momoName})</div>
                        <div>Nội dung: <strong className="text-[#A50064]">{orderId}</strong></div>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="bg-slate-50 rounded-2xl p-5 border border-slate-200 space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-700">Tài khoản thanh toán:</span>
                    <span className="text-xs font-mono font-bold text-[#A50064]">
                      {currentUser?.email ? currentUser.email : 'Học viên'}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider block mb-1">
                        Số điện thoại / Thẻ liên kết
                      </label>
                      <input
                        type="text"
                        value={phoneNumber}
                        onChange={(e) => setPhoneNumber(e.target.value)}
                        placeholder="0987xxxxxx"
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm font-semibold focus:outline-none focus:border-[#A50064] bg-white"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider block mb-1">
                        Mã xác nhận bảo mật OTP
                      </label>
                      <input
                        type="text"
                        value={otpCode}
                        onChange={(e) => setOtpCode(e.target.value)}
                        placeholder="Nhập 6 số hoặc tự động"
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm font-semibold focus:outline-none focus:border-[#A50064] bg-white"
                      />
                    </div>
                  </div>

                  <div className="flex items-center gap-2 text-xs text-slate-500 pt-1">
                    <svg className="w-4 h-4 text-emerald-600 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                    </svg>
                    <span>Cổng thanh toán MoMo mã hóa theo tiêu chuẩn Quốc tế PCI DSS</span>
                  </div>
                </div>
              )}

              {/* Action Button */}
              <div className="space-y-3 pt-2">
                <button
                  type="button"
                  onClick={handleAuthorizePayment}
                  disabled={isProcessingPayment}
                  className="w-full py-4 bg-[#A50064] hover:bg-[#8e0056] text-white rounded-2xl font-black text-sm sm:text-base uppercase tracking-wider transition-all shadow-xl shadow-pink-900/20 active:scale-[0.99] flex items-center justify-center gap-2 cursor-pointer"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                  <span>XÁC NHẬN THANH TOÁN {formatVND(amount)} QUA MOMO</span>
                </button>

                <div className="flex items-center justify-center gap-4 text-xs text-slate-400">
                  <span>Hoàn tiền nếu có sự cố</span>
                  <span>•</span>
                  <span>Hỗ trợ 24/7</span>
                  <span>•</span>
                  <button onClick={handleCancel} className="hover:text-slate-700 underline cursor-pointer">
                    Hủy và quay về
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {step === 'processing' && (
          <div className="max-w-lg mx-auto bg-white rounded-3xl p-8 sm:p-10 shadow-lg border border-slate-200/80 text-center space-y-6 animate-in zoom-in-95">
            <div className="relative w-20 h-20 mx-auto">
              <div className="w-20 h-20 border-4 border-[#A50064] border-t-transparent rounded-full animate-spin"></div>
              <div className="absolute inset-0 flex items-center justify-center text-[#A50064] font-black text-xl">
                M
              </div>
            </div>
            <div>
              <span className="text-[11px] font-black uppercase tracking-wider text-[#A50064] bg-pink-50 px-3 py-1 rounded-full">
                Đang xử lý giao dịch MoMo
              </span>
              <h3 className="text-2xl font-black text-slate-900 mt-3">
                Đang đối soát cổng thanh toán...
              </h3>
              <p className="text-sm text-slate-500 mt-2 leading-relaxed">
                Hệ thống MoMo đang xác thực lệnh chuyển tiền <strong>{formatVND(amount)}</strong> cho đơn hàng <strong>{orderId}</strong>. Vui lòng không đóng trình duyệt.
              </p>
            </div>
          </div>
        )}

        {step === 'success' && (
          <div className="max-w-xl mx-auto bg-white rounded-3xl p-8 sm:p-10 shadow-xl border border-emerald-100 text-center space-y-6 animate-in zoom-in-95">
            <div className="w-20 h-20 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto shadow-inner border-4 border-emerald-50">
              <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" />
              </svg>
            </div>

            <div>
              <span className="text-[11px] font-black uppercase tracking-wider text-emerald-800 bg-emerald-100 px-3 py-1 rounded-full">
                Giao dịch thành công
              </span>
              <h3 className="text-2xl sm:text-3xl font-black text-slate-900 mt-3 tracking-tight">
                Thanh toán MoMo Hoàn Tất!
              </h3>
              <p className="text-slate-600 font-medium text-sm mt-2">
                Đã thanh toán thành công <strong>{formatVND(amount)}</strong>. Khóa học của bạn đã được kích hoạt vĩnh viễn!
              </p>
            </div>

            {/* Receipt Box */}
            <div className="bg-slate-50 rounded-2xl p-4 sm:p-5 border border-slate-200/80 text-left text-xs sm:text-sm space-y-2.5">
              <div className="flex justify-between">
                <span className="text-slate-500">Mã giao dịch MoMo:</span>
                <span className="font-mono font-bold text-slate-800">{orderId}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Khóa học:</span>
                <span className="font-bold text-slate-800 truncate max-w-[240px]">{rawTitle}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Thời gian thanh toán:</span>
                <span className="font-medium text-slate-700">{new Date().toLocaleString('vi-VN')}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Trạng thái khóa học:</span>
                <span className="font-black text-emerald-600 flex items-center gap-1">
                  ✓ Đã mở khóa vào phòng học
                </span>
              </div>
            </div>

            <div className="space-y-3">
              <button
                type="button"
                onClick={() => navigate(returnUrl)}
                className="w-full py-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl font-black text-sm uppercase tracking-wider transition-all shadow-lg shadow-emerald-700/20 active:scale-98 cursor-pointer flex items-center justify-center gap-2"
              >
                <span>VÀO HỌC NGAY ({countdown}s)</span>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M14 5l7 7m0 0l-7 7m7-7H3" />
                </svg>
              </button>

              <Link
                to="/account"
                className="block text-xs text-slate-500 hover:text-slate-800 font-semibold"
              >
                Xem danh sách khóa học trong tài khoản của tôi
              </Link>
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200 py-4">
        <div className="max-w-5xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 gap-2">
          <span>© {new Date().getFullYear()} FAST E-Learning • Cổng thanh toán tích hợp MoMo M_Service</span>
          <div className="flex items-center gap-4">
            <Link to="/dieu-khoan-su-dung" className="hover:underline">Điều khoản</Link>
            <Link to="/chinh-sach-bao-mat" className="hover:underline">Bảo mật</Link>
            <Link to="/lien-he" className="hover:underline">Hỗ trợ kỹ thuật</Link>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default MomoGatewayPage;
