import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { doc, getDoc, setDoc, onSnapshot } from 'firebase/firestore';
import {
  CheckCircle2,
  ArrowLeft,
  Calendar,
  KeyRound,
  LogIn,
  Bell,
  Mail,
  ExternalLink,
  ShieldCheck,
  QrCode,
  Landmark,
  RefreshCw,
  MapPin,
  Clock
} from 'lucide-react';
import { auth, db } from '../firebase';
import { getPaymentConfig, getVietQrUrl, formatVND } from '../utils/qrService';
import { ERROR_CODES } from '../utils/paymentLogger';
import {
  addTrainingLinkNotification,
  getPreClassPreparationMeta
} from '../utils/courseNotificationService';
import { getFastSessionUser } from '../utils/sessionAuth';
import { useToast } from '../contexts/ToastContext';

interface CheckoutPayload {
  registration: any;
  orderId: string;
  paymentCode: string;
  amount: number;
  courseId: string;
  courseTitle: string;
  courseImage?: string;
  studentName: string;
  email: string;
  phone: string;
  trainingType?: string;
  trainingTypeLabel: string;
  startDate: string;
  scheduleDetails?: string;
  venueAddress?: string;
  meetingLink: string;
}

interface PostPaymentSummary {
  accountEmail: string;
  accountProvisioned?: {
    autoCreated?: boolean;
    alreadyExists?: boolean;
    email?: string;
  };
  otpDispatched: boolean;
  otpEmailSent: boolean;
  otpFallback?: boolean;
  otp?: string;
  otpMessage?: string;
  registration?: any;
  notification?: any;
}

const SESSION_STORAGE_KEY = 'fast_pending_training_checkout';

function normalizeFastCode(raw?: string): string {
  const cleaned = String(raw || '').trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
  if (!cleaned) return '';
  return cleaned.startsWith('FAST') ? cleaned : `FAST${cleaned}`;
}

export const TrainingPayment: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const toast = useToast();
  const isMountedRef = useRef<boolean>(true);
  const completedTriggeredRef = useRef<boolean>(false);

  const [checkout, setCheckout] = useState<CheckoutPayload | null>(null);
  const [isLoadingOrder, setIsLoadingOrder] = useState<boolean>(true);
  const [loadError, setLoadError] = useState<string>('');
  const [qrLoadError, setQrLoadError] = useState<boolean>(false);
  const [isTimeout, setIsTimeout] = useState<boolean>(false);
  const [activeErrorCode, setActiveErrorCode] = useState<string | null>(null);
  const [retrySeed, setRetrySeed] = useState<number>(0);

  const [isPaid, setIsPaid] = useState<boolean>(false);
  const [isFinalizingPostPayment, setIsFinalizingPostPayment] = useState<boolean>(false);
  const [postPaymentResult, setPostPaymentResult] = useState<PostPaymentSummary | null>(null);
  const [postPaymentError, setPostPaymentError] = useState<string>('');

  const paymentConfig = useMemo(() => getPaymentConfig(), []);
  const bankId = paymentConfig.bankId || 'ACB';
  const accountNo = paymentConfig.accountNo === '0989499568' ? paymentConfig.accountNo : '0989499568';
  const accountName = paymentConfig.accountName || 'CONG TY TNHH TU VAN FAST';
  const bankNameDisplay = 'ACB · Ngân hàng TMCP Á Châu';

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // Restore checkout payload from location.state, sessionStorage, or Firestore/API via query params
  useEffect(() => {
    let cancelled = false;

    const restoreCheckout = async () => {
      setIsLoadingOrder(true);
      setLoadError('');

      const statePayload = (location.state as { checkoutPayload?: CheckoutPayload } | null)?.checkoutPayload;
      if (statePayload && (statePayload.paymentCode || statePayload.orderId)) {
        try {
          sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(statePayload));
        } catch {}
        if (!cancelled) {
          setCheckout(statePayload);
          setIsLoadingOrder(false);
        }
        return;
      }

      const paramRegId = (searchParams.get('regId') || '').trim();
      const paramOrderId = (searchParams.get('orderId') || '').trim();
      const paramCode = normalizeFastCode(searchParams.get('code') || '');

      try {
        const storedRaw = sessionStorage.getItem(SESSION_STORAGE_KEY);
        if (storedRaw) {
          const parsed = JSON.parse(storedRaw) as CheckoutPayload;
          const matchesQuery =
            (!paramRegId || parsed.registration?.id === paramRegId) &&
            (!paramCode || normalizeFastCode(parsed.paymentCode) === paramCode);
          if (parsed && (parsed.paymentCode || parsed.orderId) && matchesQuery) {
            if (!cancelled) {
              setCheckout(parsed);
              setIsLoadingOrder(false);
            }
            return;
          }
        }
      } catch {}

      if (paramRegId || paramOrderId || paramCode) {
        try {
          let regData: any = null;
          if (paramRegId) {
            const snap = await getDoc(doc(db, 'live_course_registrations', paramRegId)).catch(() => null);
            if (snap && snap.exists()) {
              regData = { id: snap.id, ...snap.data() };
            }
          }

          if (!regData && (paramOrderId || paramCode)) {
            const q = paramOrderId
              ? `orderId=${encodeURIComponent(paramOrderId)}`
              : `paymentCode=${encodeURIComponent(paramCode)}`;
            const res = await fetch(`/api/check-payment?${q}`).catch(() => null);
            if (res && res.ok) {
              const info = await res.json().catch(() => null);
              if (info?.success) {
                regData = {
                  id: paramRegId || info.registrationId || `reg-${Date.now()}`,
                  orderId: info.orderId || paramOrderId,
                  paymentCode: info.paymentCode || paramCode,
                  courseId: info.courseId || '',
                  courseTitle: info.courseTitle || 'Khóa đào tạo Online - Offline',
                  totalNumericPrice: info.amount || 199000,
                  totalPrice: formatVND(info.amount || 199000),
                  email: info.email || '',
                  userEmail: info.email || '',
                  studentName: info.studentName || 'Học viên FAST',
                  phone: info.phone || '',
                  trainingTypeLabel: 'Online Zoom & Trực tiếp',
                  startDate: 'Theo lịch khóa học',
                  scheduleDetails: 'Sáng 08:30 - 11:30 | Chiều 13:30 - 16:30',
                  meetingLink: 'https://zoom.us/j/84927002668',
                  paymentStatus: info.status === 'PAID' || info.status === 'completed' ? 'PAID' : 'PENDING',
                  status: info.status === 'PAID' || info.status === 'completed' ? 'confirmed' : 'pending'
                };
              }
            }
          }

          if (regData) {
            const restored: CheckoutPayload = {
              registration: regData,
              orderId: regData.orderId || paramOrderId,
              paymentCode: normalizeFastCode(regData.paymentCode || regData.paymentMemo || paramCode),
              amount: Number(regData.totalNumericPrice) || 199000,
              courseId: regData.courseId || '',
              courseTitle: regData.courseTitle || 'Khóa đào tạo Online - Offline',
              courseImage: regData.courseImage || '',
              studentName: regData.studentName || 'Học viên FAST',
              email: (regData.userEmail || regData.email || '').toLowerCase().trim(),
              phone: regData.phone || '',
              trainingType: regData.trainingType || undefined,
              trainingTypeLabel: regData.trainingTypeLabel || 'Online Zoom & Trực tiếp',
              startDate: regData.startDate || 'Theo lịch khóa học',
              scheduleDetails: regData.scheduleDetails || 'Sáng 08:30 - 11:30 | Chiều 13:30 - 16:30',
              venueAddress: regData.venueAddress || '',
              meetingLink: regData.meetingLink || regData.zoomLink || 'https://zoom.us/j/84927002668',
            };
            if (!cancelled) {
              setCheckout(restored);
              setIsLoadingOrder(false);
            }
            return;
          }
        } catch {}
      }

      if (!cancelled) {
        setLoadError('Không tìm thấy thông tin đơn đăng ký khóa đào tạo. Vui lòng đăng ký lại khóa học.');
        setIsLoadingOrder(false);
      }
    };

    restoreCheckout();
    return () => {
      cancelled = true;
    };
  }, [location.state, searchParams]);

  const completePostPaymentProvisioning = useCallback(
    async (payload: CheckoutPayload) => {
      if (completedTriggeredRef.current) return;
      completedTriggeredRef.current = true;

      if (!isMountedRef.current) return;
      setIsPaid(true);
      setIsFinalizingPostPayment(true);
      setPostPaymentError('');

      try {
        const res = await fetch('/api/training/complete-post-payment', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            registrationId: payload.registration?.id || '',
            orderId: payload.orderId || '',
            paymentCode: payload.paymentCode || '',
            fallbackRecord: {
              ...(payload.registration || {}),
              id: payload.registration?.id || '',
              orderId: payload.orderId,
              paymentCode: payload.paymentCode,
              email: payload.email,
              userEmail: payload.email,
              studentName: payload.studentName,
              phone: payload.phone,
              courseId: payload.courseId,
              courseTitle: payload.courseTitle,
              trainingTypeLabel: payload.trainingTypeLabel,
              startDate: payload.startDate,
              scheduleDetails: payload.scheduleDetails,
              venueAddress: payload.venueAddress,
              meetingLink: payload.meetingLink,
              totalNumericPrice: payload.amount,
              totalPrice: formatVND(payload.amount),
            }
          })
        });

        const data = await res.json().catch(() => null);
        if (!res.ok || !data?.success) {
          throw new Error(data?.error || 'Không thể hoàn tất tạo tài khoản & gửi OTP sau thanh toán.');
        }

        const resolvedEmail = String(data.accountEmail || payload.email || '').toLowerCase().trim();
        addTrainingLinkNotification({
          id: `training_${payload.registration?.id || payload.paymentCode}`,
          userEmail: resolvedEmail || undefined,
          courseId: payload.courseId,
          courseTitle: payload.courseTitle,
          courseImage: payload.courseImage,
          link: payload.meetingLink,
          registrationId: payload.registration?.id || '',
          startDate: payload.startDate,
          scheduleDetails: payload.scheduleDetails,
          venueAddress: payload.venueAddress,
          trainingType: payload.trainingType || payload.registration?.trainingType,
          trainingTypeLabel: payload.trainingTypeLabel,
        });

        try {
          sessionStorage.removeItem(SESSION_STORAGE_KEY);
        } catch {}

        if (isMountedRef.current) {
          setPostPaymentResult(data as PostPaymentSummary);
          toast.showToast('Thanh toán thành công! Đã tạo tài khoản và gửi mã OTP.', 'success');
        }
      } catch (err: any) {
        completedTriggeredRef.current = false;
        if (isMountedRef.current) {
          setPostPaymentError(err?.message || 'Lỗi kết nối khi hoàn tất gửi OTP.');
        }
      } finally {
        if (isMountedRef.current) {
          setIsFinalizingPostPayment(false);
        }
      }
    },
    [toast]
  );

  // Trigger immediately if restored order is already PAID
  useEffect(() => {
    if (!checkout || completedTriggeredRef.current) return;
    if (checkout.registration?.paymentStatus === 'PAID' || checkout.registration?.status === 'confirmed') {
      completePostPaymentProvisioning(checkout);
    }
  }, [checkout, completePostPaymentProvisioning]);

  // Listen to Firestore + poll /api/check-payment every 4.5s + 3-minute timeout
  useEffect(() => {
    if (!checkout || isPaid || isTimeout) return;

    let unsubFirestore = () => {};
    if (checkout.registration?.id) {
      try {
        unsubFirestore = onSnapshot(doc(db, 'live_course_registrations', checkout.registration.id), (snap) => {
          if (!snap.exists() || !isMountedRef.current || completedTriggeredRef.current) return;
          const data = snap.data();
          if (data?.paymentStatus === 'PAID' || data?.status === 'confirmed') {
            completePostPaymentProvisioning(checkout);
          }
        });
      } catch {}
    }

    const checkStatus = async () => {
      if (!isMountedRef.current || completedTriggeredRef.current || isTimeout) return;
      try {
        const q = checkout.orderId
          ? `orderId=${encodeURIComponent(checkout.orderId)}`
          : `paymentCode=${encodeURIComponent(checkout.paymentCode)}`;
        const res = await fetch(`/api/check-payment?${q}`);
        if (!res.ok && res.status >= 500) {
          if (isMountedRef.current) setActiveErrorCode('ERR_NETWORK_DISCONNECTED_503');
          return;
        }
        const data = await res.json().catch(() => null);
        if (data?.success && (data.status === 'PAID' || data.status === 'completed')) {
          if (isMountedRef.current) setActiveErrorCode(null);
          completePostPaymentProvisioning(checkout);
        } else if (data?.status === 'NOT_FOUND') {
          if (isMountedRef.current) setActiveErrorCode('ERR_ORDER_NOT_FOUND_404');
        }
      } catch {}
    };

    checkStatus();
    const pollInterval = setInterval(checkStatus, 4500);
    const timeoutTimer = setTimeout(() => {
      if (!completedTriggeredRef.current && isMountedRef.current) {
        setActiveErrorCode('ERR_PAYMENT_TIMEOUT_408');
        setIsTimeout(true);
      }
    }, 180000);

    return () => {
      unsubFirestore();
      clearInterval(pollInterval);
      clearTimeout(timeoutTimer);
    };
  }, [checkout, isPaid, isTimeout, retrySeed, completePostPaymentProvisioning]);

  const handleRetryNewQr = async () => {
    if (!checkout) return;
    setIsTimeout(false);
    setActiveErrorCode(null);
    setQrLoadError(false);

    const newSuffix = `${Date.now().toString().slice(-6)}${Math.floor(10 + Math.random() * 89)}`;
    const fallbackFast = `FAST${newSuffix}`;

    let nextOrderId = checkout.orderId;
    let nextCode = fallbackFast;

    try {
      const res = await fetch('/api/create-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          courseId: checkout.courseId,
          courseTitle: checkout.courseTitle,
          amount: checkout.amount,
          email: checkout.email,
          userId: auth.currentUser?.uid || '',
          registrationId: checkout.registration?.id || '',
          orderType: 'direct_training',
          studentName: checkout.studentName,
          phone: checkout.phone,
          requestedPaymentCode: fallbackFast
        })
      });
      if (res.ok) {
        const json = await res.json().catch(() => null);
        if (json?.success && json.paymentCode) {
          nextCode = normalizeFastCode(json.paymentCode);
          nextOrderId = json.orderId || nextOrderId;
        }
      }
    } catch {}

    const updatedCheckout: CheckoutPayload = {
      ...checkout,
      orderId: nextOrderId,
      paymentCode: nextCode,
      registration: {
        ...(checkout.registration || {}),
        orderId: nextOrderId,
        paymentCode: nextCode,
        paymentMemo: nextCode,
      }
    };

    if (checkout.registration?.id) {
      setDoc(
        doc(db, 'live_course_registrations', checkout.registration.id),
        { orderId: nextOrderId, paymentCode: nextCode, paymentMemo: nextCode, updatedAt: new Date().toISOString() },
        { merge: true }
      ).catch(() => {});
    }

    try {
      sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(updatedCheckout));
    } catch {}

    setCheckout(updatedCheckout);
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        if (nextOrderId) next.set('orderId', nextOrderId);
        next.set('code', nextCode);
        return next;
      },
      { replace: true }
    );
    setRetrySeed((s) => s + 1);
  };

  const sessionUser = getFastSessionUser();
  const currentLoggedEmail = (auth.currentUser?.email || sessionUser?.email || '').toLowerCase().trim();
  const finalEmail = (postPaymentResult?.accountEmail || checkout?.email || '').toLowerCase().trim();
  const isSameUserLoggedIn = Boolean(currentLoggedEmail && finalEmail && currentLoggedEmail === finalEmail);

  const activeCode = normalizeFastCode(checkout?.paymentCode) || 'FAST00000000';
  const vietQrUrl = checkout
    ? getVietQrUrl({
        bankId,
        accountNo,
        accountName,
        amount: checkout.amount,
        memo: activeCode,
        template: 'compact2',
      })
    : '';

  const errorDetails = activeErrorCode ? ERROR_CODES[activeErrorCode] : null;

  return (
    <main className="min-h-screen bg-[#f8fafc] py-8 sm:py-12 px-4 sm:px-6 lg:px-8">
      <Helmet>
        <title>Thanh toán đăng ký khóa đào tạo | FAST E-Learning</title>
        <meta name="description" content="Cổng thanh toán VietQR ACB & SePay cho khóa đào tạo Online - Offline tại FAST E-Learning." />
      </Helmet>

      <div className="max-w-3xl mx-auto">
        {isLoadingOrder ? (
          <div className="bg-white rounded-3xl p-10 shadow-xl border border-slate-100 text-center space-y-4">
            <div className="w-10 h-10 border-4 border-[#007c76] border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-sm font-bold text-slate-500 uppercase tracking-wider">Đang tải thông tin thanh toán...</p>
          </div>
        ) : loadError || !checkout ? (
          <div className="bg-white rounded-3xl p-8 sm:p-10 shadow-xl border border-slate-100 text-center space-y-5">
            <div className="w-16 h-16 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto border border-amber-200">
              <QrCode className="w-8 h-8" />
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900">Không tìm thấy đơn thanh toán</h1>
            <p className="text-sm text-slate-600 max-w-md mx-auto">
              {loadError || 'Phiên đăng ký đã hết hạn hoặc đường dẫn thanh toán không hợp lệ.'}
            </p>
            <div className="flex flex-wrap justify-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => navigate('/khoa-dao-tao')}
                className="px-6 py-3 rounded-2xl bg-[#007c76] hover:bg-[#00605b] text-white text-xs sm:text-sm font-black uppercase tracking-wider transition-colors cursor-pointer"
              >
                Quay lại Khóa đào tạo
              </button>
              <button
                type="button"
                onClick={() => navigate('/dang-ky-truc-tiep')}
                className="px-6 py-3 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs sm:text-sm font-bold transition-colors cursor-pointer"
              >
                Đăng ký trực tiếp
              </button>
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-2xl border border-slate-100 space-y-6 animate-fade-in">
            {/* Checkout Top Header matching PaymentModal */}
            <div className="text-center space-y-1">
              <div className="inline-flex items-center gap-2 px-3 py-1 bg-teal-50 border border-teal-200/60 rounded-full text-[#007c76] font-extrabold text-[11px] uppercase tracking-wider mb-1">
                <span className="w-2 h-2 rounded-full bg-[#007c76] animate-pulse" />
                FAST E-Learning Secure Checkout
              </div>
              <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
                {isPaid ? 'Thanh Toán Thành Công!' : 'Thanh Toán Đăng Ký Khóa Học'}
              </h1>
              <p className="text-slate-500 font-medium text-xs sm:text-sm">
                {isPaid
                  ? 'Hệ thống SePay / ACB đã xác nhận giao dịch & kích hoạt tài khoản tự động'
                  : 'Quét mã VietQR ACB bên dưới để hoàn tất đăng ký & nhận tài khoản OTP'}
              </p>
            </div>

            {/* Course Info Summary Card matching PaymentModal */}
            <div className="bg-gradient-to-r from-slate-50 to-teal-50/40 p-4 sm:p-5 rounded-2xl border border-slate-200/80 flex items-center justify-between gap-4 shadow-xs">
              <div className="flex-1 min-w-0">
                <span className="text-[10px] font-black uppercase text-teal-700 bg-teal-100 px-2 py-0.5 rounded-md">
                  Khóa đào tạo Online - Offline
                </span>
                <h2 className="w-full font-bold text-slate-900 text-sm sm:text-base leading-[1.45] break-words [overflow-wrap:break-word] mt-1">
                  {checkout.courseTitle}
                </h2>
                <p className="text-xs font-semibold text-slate-500 mt-1">
                  Mã đơn: <span className="font-mono text-slate-800 font-bold">{activeCode}</span>
                  <span className="mx-1.5" aria-hidden="true">·</span>
                  <span>{checkout.trainingTypeLabel}</span>
                </p>
              </div>
              <div className="text-right shrink-0">
                <div className="text-[10px] uppercase font-bold text-slate-400">Học phí</div>
                <div className="text-[#007c76] font-black text-lg sm:text-xl whitespace-nowrap tabular-nums">
                  {formatVND(checkout.amount)}
                </div>
              </div>
            </div>

            {/* State 1: Paid & Post-Payment Provisioning Complete */}
            {isPaid ? (
              <div className="space-y-6 animate-in fade-in zoom-in duration-300">
                {isFinalizingPostPayment ? (
                  <div className="py-10 text-center space-y-4">
                    <div className="w-12 h-12 border-4 border-[#007c76] border-t-transparent rounded-full animate-spin mx-auto" />
                    <p className="text-sm font-bold text-slate-700">
                      Đang khởi tạo tài khoản tự động, lưu lịch trình &amp; gửi mã OTP...
                    </p>
                  </div>
                ) : postPaymentError ? (
                  <div className="p-6 rounded-2xl bg-red-50 border border-red-200 text-center space-y-4">
                    <p className="text-sm font-bold text-red-800">{postPaymentError}</p>
                    <button
                      type="button"
                      onClick={() => completePostPaymentProvisioning(checkout)}
                      className="px-6 py-3 rounded-2xl bg-[#007c76] hover:bg-[#00605b] text-white text-xs font-black uppercase tracking-wider cursor-pointer inline-flex items-center gap-2"
                    >
                      <RefreshCw className="w-4 h-4" />
                      <span>Thử khởi tạo lại OTP &amp; Tài khoản</span>
                    </button>
                  </div>
                ) : (
                  <>
                    {/* Success Badge */}
                    <div className="bg-emerald-50/90 border border-emerald-200 rounded-3xl p-6 text-center space-y-3">
                      <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto border-4 border-white shadow-sm">
                        <CheckCircle2 className="w-9 h-9" />
                      </div>
                      <h3 className="text-lg sm:text-xl font-black text-slate-900 uppercase tracking-tight">
                        Đăng ký &amp; Thanh toán hoàn tất!
                      </h3>
                      <p className="text-xs sm:text-sm text-slate-600 max-w-lg mx-auto leading-relaxed">
                        Hệ thống đã tự động khởi tạo tài khoản học viên, lưu sẵn thông báo lịch học và phát hành mã xác thực OTP 6 chữ số gửi về email của bạn.
                      </p>
                    </div>

                    {/* Auto-created Account & OTP Box */}
                    <div className="bg-teal-50/70 border border-teal-200 rounded-2xl p-5 space-y-4">
                      <div className="flex items-start gap-3">
                        <div className="w-10 h-10 rounded-xl bg-[#007c76] text-white flex items-center justify-center shrink-0">
                          <KeyRound className="w-5 h-5" />
                        </div>
                        <div className="min-w-0 flex-1 space-y-1">
                          <span className="text-xs font-black uppercase tracking-wider text-[#007c76] block">
                            Tài khoản tự tạo &amp; Mã OTP đăng nhập
                          </span>
                          <p className="text-xs sm:text-sm text-slate-700 leading-relaxed">
                            Email tài khoản: <strong className="text-slate-900 break-all">{finalEmail}</strong>
                          </p>
                          <p className="text-xs text-slate-600 leading-relaxed flex items-center gap-1.5">
                            <Mail className="w-3.5 h-3.5 text-[#007c76] shrink-0" />
                            <span>
                              {postPaymentResult?.otpEmailSent
                                ? `Mã OTP 6 số đã được gửi tới email ${finalEmail}. Hãy kiểm tra hộp thư đến (hoặc Spam).`
                                : postPaymentResult?.otpFallback && postPaymentResult?.otp
                                  ? `Mã OTP 6 số của bạn đã được tạo tự động:`
                                  : `Mã OTP xác thực đã sẵn sàng cho tài khoản ${finalEmail}.`}
                            </span>
                          </p>
                        </div>
                      </div>

                      {postPaymentResult?.otpFallback && postPaymentResult?.otp && (
                        <div className="bg-white border-2 border-[#007c76]/30 rounded-2xl p-4 text-center space-y-1">
                          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block">
                            Mã OTP đăng nhập 6 chữ số
                          </span>
                          <div className="font-mono text-3xl font-black tracking-[0.35em] text-[#007c76]">
                            {postPaymentResult.otp}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Saved Pre-Class Preparation Summary */}
                    {(() => {
                      const prepMeta = getPreClassPreparationMeta({
                        courseTitle: checkout.courseTitle,
                        registrationId: checkout.registration?.id || '',
                        startDate: checkout.startDate,
                        scheduleDetails: checkout.scheduleDetails,
                        venueAddress: checkout.venueAddress,
                        trainingType: checkout.trainingType || checkout.registration?.trainingType,
                        trainingTypeLabel: checkout.trainingTypeLabel,
                        link: checkout.meetingLink,
                      });
                      return (
                        <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 space-y-3 text-xs sm:text-sm">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <div className="flex items-center gap-2 font-bold text-slate-900">
                              <Calendar className="w-4 h-4 text-[#007c76]" />
                              <span>Thông báo chuẩn bị vào học đã lưu trong tài khoản</span>
                            </div>
                            <span
                              className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                                prepMeta.isOffline
                                  ? 'bg-amber-100 text-amber-900'
                                  : 'bg-teal-100 text-teal-900'
                              }`}
                            >
                              {prepMeta.badgeLabel}
                            </span>
                          </div>

                          <p className="text-slate-600">
                            <strong className="text-slate-800">{checkout.studentName}</strong> · {prepMeta.formatLabel}
                          </p>
                          <p className="text-slate-600">
                            Thời gian: <strong className="text-slate-800">{checkout.startDate}</strong>
                            {checkout.scheduleDetails ? ` · ${checkout.scheduleDetails}` : ''}
                          </p>

                          {prepMeta.isOffline && (
                            <div className="flex items-start gap-2 bg-white border border-amber-200/80 rounded-xl p-3 text-xs text-slate-700">
                              <MapPin className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                              <div>
                                <span className="font-bold text-slate-900 block">Địa điểm hội trường:</span>
                                <span>{prepMeta.venueAddress}</span>
                              </div>
                            </div>
                          )}

                          <div className="bg-white border border-slate-200/80 rounded-xl p-3.5 space-y-2">
                            <div className="flex items-center gap-1.5 text-xs font-bold text-[#007c76]">
                              <Clock className="w-3.5 h-3.5 shrink-0" />
                              <span>{prepMeta.checkInTime}</span>
                            </div>
                            <ul className="space-y-1 text-xs text-slate-600 list-disc pl-4">
                              {prepMeta.checklist.slice(0, 3).map((item, idx) => (
                                <li key={idx}>{item}</li>
                              ))}
                            </ul>
                          </div>

                          <div className="pt-0.5">
                            <a
                              href={prepMeta.actionLink}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1.5 text-xs font-bold text-[#007c76] hover:underline"
                            >
                              <span>{prepMeta.actionLabel}</span>
                              <ExternalLink className="w-3.5 h-3.5 shrink-0" />
                            </a>
                          </div>
                        </div>
                      );
                    })()}

                    {/* Primary CTA */}
                    <div className="flex flex-col sm:flex-row gap-3 pt-1">
                      <button
                        type="button"
                        onClick={() => {
                          if (isSameUserLoggedIn) {
                            navigate('/account');
                          } else {
                            const regIdParam = checkout.registration?.id || '';
                            const targetUrl = `/account?otpSetup=1&email=${encodeURIComponent(finalEmail)}&name=${encodeURIComponent(checkout.studentName)}&regId=${encodeURIComponent(regIdParam)}&otpReady=1`;
                            navigate(targetUrl, {
                              state: {
                                otpAccountSetup: true,
                                email: finalEmail,
                                name: checkout.studentName,
                                registrationId: regIdParam,
                                otpReady: true,
                                fallbackOtp: postPaymentResult?.otp || undefined
                              }
                            });
                          }
                        }}
                        className="flex-1 py-4 px-6 bg-[#007c76] hover:bg-[#00605b] text-white rounded-2xl font-black uppercase text-xs sm:text-sm tracking-wider transition-all shadow-lg shadow-teal-700/20 flex items-center justify-center gap-2 cursor-pointer"
                      >
                        {isSameUserLoggedIn ? (
                          <>
                            <Bell className="w-4 h-4" />
                            <span>Xem thông báo &amp; lịch học</span>
                          </>
                        ) : (
                          <>
                            <LogIn className="w-4 h-4" />
                            <span>Đăng nhập OTP</span>
                          </>
                        )}
                      </button>
                      <button
                        type="button"
                        onClick={() => navigate('/khoa-dao-tao')}
                        className="py-4 px-6 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-2xl font-bold text-xs sm:text-sm transition-colors cursor-pointer"
                      >
                        Về danh sách khóa học
                      </button>
                    </div>
                  </>
                )}
              </div>
            ) : isTimeout ? (
              /* State 2: Timeout Screen matching PaymentStatusPolling */
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
                  <h2 className="text-2xl font-black text-slate-900 uppercase tracking-tight">Giao Dịch Hết Thời Gian Chờ</h2>
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
                    onClick={() => navigate(-1)}
                    className="flex-1 py-3.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-2xl font-black uppercase text-xs tracking-wider transition-all cursor-pointer"
                  >
                    Quay lại
                  </button>
                  <button
                    type="button"
                    onClick={handleRetryNewQr}
                    className="flex-1 py-3.5 bg-amber-600 hover:bg-amber-700 text-white rounded-2xl font-black uppercase text-xs tracking-wider transition-all shadow-md shadow-amber-600/20 active:scale-98 cursor-pointer flex items-center justify-center gap-2"
                  >
                    <RefreshCw className="w-4 h-4" />
                    <span>Thử lại mã QR mới</span>
                  </button>
                </div>
              </div>
            ) : (
              /* State 3: Waiting for SePay Payment — Read-Only QR & Transfer Info */
              <div className="space-y-6 text-center animate-in fade-in zoom-in duration-300 py-1">
                <div className="space-y-2.5">
                  <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
                    Mã QR Thanh Toán Ngân Hàng
                  </h2>
                  <div className="inline-flex items-center gap-2.5 px-4 py-2 bg-teal-50 border border-teal-200/80 rounded-full text-[#007c76] font-black text-xs sm:text-sm shadow-xs">
                    <span className="relative flex h-3 w-3">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-teal-400 opacity-75" />
                      <span className="relative inline-flex rounded-full h-3 w-3 bg-[#007c76]" />
                    </span>
                    <span>Trạng thái: Đang tự động lắng nghe giao dịch SePay...</span>
                  </div>
                </div>

                {activeErrorCode && errorDetails && (
                  <div className="bg-red-50 border-2 border-red-200 p-4 rounded-2xl text-left space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-xs font-black text-red-700">{errorDetails.code}</span>
                      <span className="text-[10px] bg-red-200 text-red-900 px-2 py-0.5 rounded font-bold uppercase">Lỗi chẩn đoán</span>
                    </div>
                    <h4 className="font-bold text-red-900 text-sm">{errorDetails.title}</h4>
                    <p className="text-xs text-red-700">{errorDetails.description}</p>
                    <p className="text-xs text-slate-700 font-semibold pt-1">Hướng dẫn: {errorDetails.solution}</p>
                  </div>
                )}

                {/* Centered Read-Only VietQR Display (NO copy button, NO download QR button, NO manual check) */}
                <div
                  className="p-5 sm:p-7 bg-white rounded-3xl border-3 border-[#007c76] shadow-xl max-w-md w-full mx-auto space-y-4 select-none"
                  onCopy={(e) => e.preventDefault()}
                  onContextMenu={(e) => e.preventDefault()}
                >
                  <div className="flex items-center justify-between text-xs pb-2 border-b border-slate-100">
                    <span className="font-bold text-slate-800 flex items-center gap-1.5">
                      <Landmark className="w-4 h-4 text-[#007c76]" />
                      <span>VietQR · ACB</span>
                    </span>
                    <span className="font-mono font-bold text-slate-700 tabular-nums">{accountNo}</span>
                  </div>

                  <div className="w-full aspect-square relative flex items-center justify-center p-2 bg-white rounded-2xl overflow-hidden border border-slate-100 shadow-inner">
                    {!qrLoadError ? (
                      <img
                        src={vietQrUrl}
                        alt={`Mã QR thanh toán ACB ${accountNo}`}
                        referrerPolicy="no-referrer"
                        draggable={false}
                        onError={() => setQrLoadError(true)}
                        className="w-full h-full object-contain rounded-xl pointer-events-none"
                      />
                    ) : (
                      <div className="text-center space-y-2 p-4 text-slate-500">
                        <QrCode className="w-12 h-12 mx-auto text-[#007c76]" />
                        <p className="text-xs font-semibold text-slate-700">Quét hoặc nhập thông tin chuyển khoản</p>
                        <p className="text-xs">
                          STK ACB <span className="font-mono font-bold text-slate-900">{accountNo}</span> · Nội dung{' '}
                          <span className="font-mono font-bold text-[#007c76]">{activeCode}</span>
                        </p>
                      </div>
                    )}
                  </div>

                  <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs sm:text-sm font-bold text-slate-700 px-1">
                    <span className="text-slate-500 uppercase tracking-wider text-[11px] font-black">Số tiền cần quét:</span>
                    <span className="font-black text-[#007c76] text-lg sm:text-2xl tabular-nums">
                      {formatVND(checkout.amount)}
                    </span>
                  </div>
                </div>

                {/* Read-Only Transfer Details Card (NO copy buttons) */}
                <div
                  className="max-w-md mx-auto bg-slate-50 rounded-2xl border border-slate-200 overflow-hidden text-left select-none"
                  onCopy={(e) => e.preventDefault()}
                >
                  <div className="px-4 py-3 bg-white border-b border-slate-200 flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-900">Thông tin chuyển khoản (chỉ xem)</span>
                    <span className="text-[11px] font-semibold text-[#007c76] flex items-center gap-1">
                      <ShieldCheck className="w-3.5 h-3.5" /> Tự động SePay
                    </span>
                  </div>
                  <div className="divide-y divide-slate-200/80 text-xs sm:text-sm">
                    <div className="px-4 py-2.5 flex items-center justify-between gap-3">
                      <span className="text-slate-500">Ngân hàng</span>
                      <span className="font-semibold text-slate-900 text-right">{bankNameDisplay}</span>
                    </div>
                    <div className="px-4 py-2.5 flex items-center justify-between gap-3">
                      <span className="text-slate-500">Số tài khoản</span>
                      <span className="font-mono font-bold text-slate-900 tabular-nums">{accountNo}</span>
                    </div>
                    <div className="px-4 py-2.5 flex items-center justify-between gap-3">
                      <span className="text-slate-500">Chủ tài khoản</span>
                      <span className="font-semibold text-slate-900 text-right">{accountName}</span>
                    </div>
                    <div className="px-4 py-2.5 flex items-center justify-between gap-3">
                      <span className="text-slate-500">Số tiền</span>
                      <span className="font-bold text-[#007c76] tabular-nums">{formatVND(checkout.amount)}</span>
                    </div>
                    <div className="px-4 py-3 bg-teal-50/80 flex items-center justify-between gap-3">
                      <span className="font-semibold text-[#007c76]">Nội dung chuyển khoản</span>
                      <span className="font-mono font-black text-base text-slate-900 tracking-wide">{activeCode}</span>
                    </div>
                  </div>
                </div>

                <div className="flex justify-center pt-1">
                  <button
                    type="button"
                    onClick={() => navigate(-1)}
                    className="px-8 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-2xl font-black uppercase text-xs tracking-wider transition-all cursor-pointer shadow-xs inline-flex items-center gap-2"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    <span>Quay lại</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </main>
  );
};

export default TrainingPayment;
