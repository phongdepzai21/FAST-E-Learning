import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  X,
  MapPin,
  Video,
  Phone,
  Mail,
  Building2,
  User,
  Minus,
  Plus,
  ArrowRight,
  Calendar
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { TrainingCourse } from '../types';
import { generateTenDigitId } from '../utils/idGenerator';
import { getPaymentConfig, formatVND } from '../utils/qrService';
import { db, auth } from '../firebase';
import { doc, setDoc } from 'firebase/firestore';
import { useToast } from '../contexts/ToastContext';
import { getFastSessionUser } from '../utils/sessionAuth';

interface TrainingRegistrationModalProps {
  isOpen: boolean;
  onClose: () => void;
  course: TrainingCourse | null;
}

function buildFastCodeFromSeed(seed: string): string {
  const cleaned = (seed || '').replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
  const base = cleaned.slice(-8).padStart(8, '8');
  return `FAST${base}`;
}

export const TrainingRegistrationModal: React.FC<TrainingRegistrationModalProps> = ({
  isOpen,
  onClose,
  course
}) => {
  const toast = useToast();
  const navigate = useNavigate();
  const isMountedRef = useRef(true);

  // Form inputs
  const [studentName, setStudentName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [participantCount, setParticipantCount] = useState<number>(1);
  const [extraStudents, setExtraStudents] = useState<string>('');
  const [trainingType, setTrainingType] = useState<'zoom' | 'direct' | 'both' | 'inhouse'>('both');
  const [notes, setNotes] = useState('');

  // Submission state
  const [isSubmitting, setIsSubmitting] = useState(false);

  const paymentConfig = useMemo(() => getPaymentConfig(), [isOpen]);
  const accountNo = paymentConfig.accountNo === '0989499568' ? paymentConfig.accountNo : '0989499568';

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // Sync user info and default format on open / course change
  useEffect(() => {
    if (isOpen) {
      const sessionUser = getFastSessionUser();
      const effectiveUser = auth.currentUser || sessionUser;
      if (effectiveUser) {
        setStudentName(prev => prev || effectiveUser.displayName || '');
        setEmail(prev => prev || effectiveUser.email || '');
      }
      if (course) {
        if (course.trainingFormat === 'zoom') {
          setTrainingType('zoom');
        } else if (course.trainingFormat === 'direct') {
          setTrainingType('direct');
        } else if (course.trainingFormat === 'inhouse') {
          setTrainingType('inhouse');
        } else {
          setTrainingType('both');
        }
      }
    }
  }, [isOpen, course?.id]);

  // Calculate pricing unconditionally (before early return) to respect Rules of Hooks
  const unitPriceNumeric = useMemo(() => {
    const rawDigits = (course?.price || '').replace(/[^\d]/g, '');
    const num = parseInt(rawDigits, 10);
    return isNaN(num) || num <= 0 ? 299000 : num;
  }, [course?.price]);

  if (!isOpen || !course) return null;

  const totalNumericPrice = unitPriceNumeric * Math.max(1, participantCount);
  const formattedTotalPrice = formatVND(totalNumericPrice);

  const sessionUser = getFastSessionUser();
  const isUserLoggedIn = !!(auth.currentUser || sessionUser);

  const getTrainingTypeLabel = (type: string) => {
    switch (type) {
      case 'zoom':
        return 'Online qua Zoom HD';
      case 'direct':
        return 'Trực tiếp tại Hội trường';
      case 'inhouse':
        return 'Đào tạo In-house Doanh nghiệp';
      default:
        return 'Kết hợp Online Zoom & Trực tiếp';
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!studentName.trim() || studentName.trim().length < 2) {
      toast.showToast('Vui lòng nhập họ và tên học viên chính xác!', 'error');
      return;
    }

    const cleanPhoneDigits = phone.replace(/[^\d]/g, '');
    if (!cleanPhoneDigits || cleanPhoneDigits.length < 9) {
      toast.showToast('Vui lòng nhập số điện thoại / Zalo hợp lệ (tối thiểu 9 số)!', 'error');
      return;
    }

    const currentSessionUser = getFastSessionUser();
    const accountEmail = (
      email.trim() ||
      auth.currentUser?.email ||
      currentSessionUser?.email ||
      ''
    ).toLowerCase().trim();

    if (!accountEmail) {
      toast.showToast('Vui lòng nhập Email để hệ thống tự động tạo tài khoản và gửi lịch học!', 'error');
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(accountEmail)) {
      toast.showToast('Email không đúng định dạng. Vui lòng kiểm tra lại!', 'error');
      return;
    }

    setIsSubmitting(true);
    const regId = generateTenDigitId();
    const nowIso = new Date().toISOString();

    const additionalNames = extraStudents
      .split('\n')
      .map(s => s.trim())
      .filter(Boolean);

    const resolvedMeetingLink =
      course.meetingLink?.trim() ||
      (trainingType === 'direct'
        ? 'https://maps.google.com/?q=18+Nguyen+Co+Thach+Nam+Tu+Liem+Ha+Noi'
        : 'https://zoom.us/j/84927002668');

    // Create SePay-recognized FAST payment order via /api/create-order (fallback to FAST + 8 digits from regId)
    const fallbackFastCode = buildFastCodeFromSeed(regId);
    let resolvedOrderId = '';
    let resolvedPaymentCode = fallbackFastCode;

    try {
      const orderRes = await fetch('/api/create-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          courseId: course.id,
          courseTitle: course.title,
          amount: totalNumericPrice,
          email: accountEmail || `${cleanPhoneDigits}@fast-training.local`,
          userId: auth.currentUser?.uid || '',
          registrationId: regId,
          orderType: 'direct_training',
          studentName: studentName.trim(),
          phone: phone.trim(),
          requestedPaymentCode: fallbackFastCode
        })
      });
      if (orderRes.ok) {
        const orderJson = await orderRes.json();
        if (orderJson.success && orderJson.paymentCode) {
          resolvedPaymentCode = String(orderJson.paymentCode).trim().toUpperCase();
          if (!resolvedPaymentCode.startsWith('FAST')) {
            resolvedPaymentCode = `FAST${resolvedPaymentCode}`;
          }
          resolvedOrderId = orderJson.orderId || '';
        }
      }
    } catch (err) {
      console.warn('Create order fallback for training registration:', err);
    }

    const regData = {
      id: regId,
      orderId: resolvedOrderId,
      userId: auth.currentUser?.uid || null,
      userEmail: accountEmail,
      studentName: studentName.trim(),
      phone: phone.trim(),
      email: email.trim() || accountEmail,
      companyName: companyName.trim() || 'Cá nhân / Tự do',
      additionalStudents: additionalNames,
      courseId: course.id,
      courseTitle: course.title,
      category: course.category || 'An toàn thực phẩm',
      trainingType,
      trainingTypeLabel: getTrainingTypeLabel(trainingType),
      participantCount: Math.max(1, participantCount),
      unitPrice: course.price,
      totalPrice: formattedTotalPrice,
      totalNumericPrice,
      startDate: course.startDate || 'Theo lịch khóa học',
      scheduleDetails: course.scheduleDetails || 'Sáng 08:30 - 11:30 | Chiều 13:30 - 16:30',
      venueAddress:
        trainingType === 'direct'
          ? (course.venueAddress || 'Số 18 Nguyễn Cơ Thạch, Nam Từ Liêm, Hà Nội').replace(/\s*\/\s*Zoom\s*HD/gi, '').trim()
          : (course.venueAddress || 'Phòng học trực tuyến Zoom HD'),
      meetingLink: resolvedMeetingLink,
      zoomLink: resolvedMeetingLink,
      notes: notes.trim(),
      paymentMethod: 'sepay_acb_vietqr',
      paymentCode: resolvedPaymentCode,
      paymentMemo: resolvedPaymentCode,
      paymentBank: 'ACB',
      paymentAccountNo: accountNo,
      paymentStatus: 'PENDING',
      status: 'pending',
      registeredAt: nowIso,
      updatedAt: nowIso
    };

    try {
      await setDoc(doc(db, 'live_course_registrations', regId), regData).catch((err) => {
        console.warn('Firestore live_course_registrations fallback:', err);
      });

      await fetch('/api/direct-registrations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...regData, deferAccountUntilPaid: true })
      }).catch(() => {});

      const checkoutPayload = {
        registration: regData,
        orderId: resolvedOrderId,
        paymentCode: resolvedPaymentCode,
        amount: totalNumericPrice,
        courseId: course.id,
        courseTitle: course.title,
        courseImage: course.image || '',
        studentName: studentName.trim(),
        email: accountEmail,
        phone: phone.trim(),
        trainingTypeLabel: regData.trainingTypeLabel,
        startDate: regData.startDate,
        scheduleDetails: regData.scheduleDetails,
        venueAddress: regData.venueAddress,
        meetingLink: resolvedMeetingLink
      };

      try {
        sessionStorage.setItem('fast_pending_training_checkout', JSON.stringify(checkoutPayload));
      } catch {}

      onClose();
      const q = new URLSearchParams({
        regId,
        code: resolvedPaymentCode
      });
      if (resolvedOrderId) q.set('orderId', resolvedOrderId);
      navigate(`/thanh-toan-dao-tao?${q.toString()}`, { state: { checkoutPayload } });
    } catch (err: any) {
      console.error('Lỗi lưu đăng ký khóa học:', err);
      toast.showToast('Không thể khởi tạo đơn thanh toán. Vui lòng kiểm tra lại kết nối mạng!', 'error');
    } finally {
      if (isMountedRef.current) setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-950/75 backdrop-blur-sm overflow-y-auto print:hidden">
      <div className="bg-white rounded-2xl max-w-2xl w-full border border-slate-200 shadow-2xl overflow-hidden my-4 relative text-slate-900 transition-all">
        {/* Clean Top Modal Header */}
        <div className="px-6 py-4 sm:px-8 sm:py-5 bg-slate-900 text-white flex items-center justify-between gap-4 border-b border-slate-800">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2 text-xs text-teal-300 font-medium">
              <span>Đào tạo trực tiếp &amp; Zoom</span>
              <span aria-hidden="true">·</span>
              <span>Bước 1/2: Thông tin đăng ký</span>
            </div>
            <h3 className="font-bold text-base sm:text-lg text-white leading-snug mt-0.5 break-words [overflow-wrap:break-word]">
              {course.title}
            </h3>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Đóng cửa sổ"
            className="w-10 h-10 rounded-xl bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors cursor-pointer shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Đăng Ký Khóa Học */}
        <form onSubmit={handleSubmit} className="p-5 sm:p-7 space-y-5 max-h-[82vh] overflow-y-auto">
            {/* Course summary header */}
            <div className="flex items-center gap-4 pb-4 border-b border-slate-100">
              <img
                src={course.image}
                alt={course.title}
                referrerPolicy="no-referrer"
                className="w-24 h-16 object-cover rounded-xl border border-slate-200 shrink-0"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = 'none';
                }}
              />
              <div className="flex-1 min-w-0 space-y-1">
                <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                  <span className="font-semibold text-[#007c76]">{course.category || 'Đào tạo ATTP'}</span>
                  <span aria-hidden="true">·</span>
                  <span className="inline-flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5 text-slate-400" />
                    {course.startDate || 'Chủ Nhật hàng tuần'}
                  </span>
                  <span aria-hidden="true">·</span>
                  <span>{course.duration || '1 ngày'}</span>
                </div>
                <h4 className="w-full text-sm sm:text-base font-bold text-slate-900 leading-[1.45] break-words [overflow-wrap:break-word]">
                  {course.title}
                </h4>
                <div className="flex items-baseline gap-2">
                  <span className="text-sm font-bold text-[#007c76] tabular-nums">{course.price}</span>
                  {course.originalPrice && course.originalPrice !== course.price && (
                    <span className="text-xs text-slate-400 line-through tabular-nums">{course.originalPrice}</span>
                  )}
                </div>
              </div>
            </div>

            {/* Hình thức học */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-700 block">
                Hình thức học tập mong muốn
              </label>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button
                  type="button"
                  disabled={course.trainingFormat === 'direct'}
                  onClick={() => setTrainingType('zoom')}
                  className={`p-3.5 rounded-xl border text-left transition-colors flex items-center gap-3 cursor-pointer ${
                    trainingType === 'zoom'
                      ? 'border-[#007c76] bg-teal-50/70 text-[#007c76]'
                      : 'border-slate-200 hover:border-slate-300 text-slate-700'
                  } ${course.trainingFormat === 'direct' ? 'opacity-50 cursor-not-allowed bg-slate-100' : ''}`}
                >
                  <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${
                    trainingType === 'zoom' ? 'bg-[#007c76] text-white' : 'bg-slate-100 text-slate-600'
                  }`}>
                    <Video className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="font-bold text-xs block">Online qua Zoom HD</span>
                    <span className="text-[11px] text-slate-500 block">Học trực tuyến, tương tác 1-1</span>
                  </div>
                </button>

                <button
                  type="button"
                  disabled={course.trainingFormat === 'zoom'}
                  onClick={() => setTrainingType('direct')}
                  className={`p-3.5 rounded-xl border text-left transition-colors flex items-center gap-3 cursor-pointer ${
                    trainingType === 'direct'
                      ? 'border-[#007c76] bg-teal-50/70 text-[#007c76]'
                      : 'border-slate-200 hover:border-slate-300 text-slate-700'
                  } ${course.trainingFormat === 'zoom' ? 'opacity-50 cursor-not-allowed bg-slate-100' : ''}`}
                >
                  <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${
                    trainingType === 'direct' ? 'bg-[#007c76] text-white' : 'bg-slate-100 text-slate-600'
                  }`}>
                    <MapPin className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="font-bold text-xs block">Trực tiếp tại Hội trường</span>
                    <span className="text-[11px] text-slate-500 block">Thực hành hiện trường &amp; mẫu</span>
                  </div>
                </button>
              </div>
            </div>

            {/* Số lượng học viên */}
            <div className="bg-slate-50 px-4 py-3.5 rounded-xl border border-slate-200 flex items-center justify-between gap-3">
              <div>
                <span className="text-xs font-bold text-slate-800 block">Số lượng học viên đăng ký</span>
                <span className="text-xs text-slate-500 tabular-nums">
                  Đơn giá: <strong className="text-slate-800">{course.price}</strong> / học viên
                </span>
              </div>

              <div className="flex items-center gap-2 bg-white px-2.5 py-1 rounded-xl border border-slate-200">
                <button
                  type="button"
                  onClick={() => setParticipantCount(prev => Math.max(1, prev - 1))}
                  className="w-8 h-8 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center justify-center transition-colors cursor-pointer"
                >
                  <Minus className="w-3.5 h-3.5" />
                </button>
                <span className="w-8 text-center font-bold text-sm text-slate-900 font-mono tabular-nums">
                  {participantCount}
                </span>
                <button
                  type="button"
                  onClick={() => setParticipantCount(prev => Math.min(50, prev + 1))}
                  className="w-8 h-8 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center justify-center transition-colors cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Thông tin học viên */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-700">Thông tin học viên</label>
                <span className="text-xs text-slate-400">* Bắt buộc</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <span className="text-xs font-medium text-slate-600">Họ và tên học viên chính *</span>
                  <div className="relative">
                    <User className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      required
                      value={studentName}
                      onChange={e => setStudentName(e.target.value)}
                      placeholder="Nguyễn Văn A"
                      className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm font-semibold text-slate-900 focus:bg-white focus:border-[#007c76] outline-none"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <span className="text-xs font-medium text-slate-600">Số điện thoại / Zalo *</span>
                  <div className="relative">
                    <Phone className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="tel"
                      required
                      value={phone}
                      onChange={e => setPhone(e.target.value)}
                      placeholder="0912 345 678"
                      className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm font-semibold text-slate-900 focus:bg-white focus:border-[#007c76] outline-none font-mono"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <span className="text-xs font-medium text-slate-600">
                    Email nhận lịch học &amp; tài khoản *
                  </span>
                  <div className="relative">
                    <Mail className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      placeholder="hocvien@email.com"
                      className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm font-semibold text-slate-900 focus:bg-white focus:border-[#007c76] outline-none"
                    />
                  </div>
                  {!isUserLoggedIn && (
                    <span className="text-[11px] text-[#007c76] block">
                      Tài khoản sẽ tự động tạo sẵn theo email này để nhận OTP &amp; lịch học.
                    </span>
                  )}
                </div>

                <div className="space-y-1">
                  <span className="text-xs font-medium text-slate-600">Tên Doanh nghiệp / Cơ sở</span>
                  <div className="relative">
                    <Building2 className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      value={companyName}
                      onChange={e => setCompanyName(e.target.value)}
                      placeholder="Công ty F&amp;B / Cơ sở kinh doanh"
                      className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm font-semibold text-slate-900 focus:bg-white focus:border-[#007c76] outline-none"
                    />
                  </div>
                </div>
              </div>

              {participantCount > 1 && (
                <div className="space-y-1 pt-1">
                  <span className="text-xs font-medium text-slate-600">
                    Họ tên {participantCount - 1} học viên bổ sung (Mỗi học viên 1 dòng)
                  </span>
                  <textarea
                    rows={2}
                    value={extraStudents}
                    onChange={e => setExtraStudents(e.target.value)}
                    placeholder={`Học viên 2: Trần Thị B\nHọc viên 3: Lê Văn C...`}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:bg-white focus:border-[#007c76] outline-none"
                  />
                </div>
              )}

              <div className="space-y-1">
                <span className="text-xs font-medium text-slate-600">Ghi chú / Yêu cầu đặc biệt (tùy chọn)</span>
                <input
                  type="text"
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  placeholder="VD: Cần xuất hóa đơn VAT / Cần hỗ trợ thi sớm..."
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:bg-white focus:border-[#007c76] outline-none"
                />
              </div>
            </div>

            {/* Footer Summary & Submit */}
            <div className="pt-4 border-t border-slate-200 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2 text-xs sm:text-sm">
                <div className="text-slate-500">
                  <span>Thanh toán tự động ACB · SePay </span>
                  <span className="font-mono font-semibold text-slate-700">({accountNo})</span>
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-xs text-slate-500">Tổng học phí:</span>
                  <span className="font-bold text-[#007c76] text-lg sm:text-xl font-mono tabular-nums">
                    {formattedTotalPrice}
                  </span>
                </div>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-3.5 px-6 bg-[#007c76] hover:bg-[#00625d] text-white font-semibold text-sm rounded-xl transition-colors cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2"
              >
                <span>{isSubmitting ? 'Đang chuyển sang trang thanh toán...' : `Tiếp tục thanh toán (${formattedTotalPrice})`}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </form>
      </div>
    </div>
  );
};

export default TrainingRegistrationModal;
