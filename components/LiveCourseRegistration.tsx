import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { db, auth } from '../firebase';
import { doc, setDoc } from 'firebase/firestore';
import { useToast } from '../contexts/ToastContext';
import { Course } from '../types';
import { getMergedCourses } from '../constants';
import { getCachedFeaturedCourseIds, subscribeToFeaturedCourseIds, filterFeaturedCourses } from '../utils/featuredCoursesService';
import { getPaymentConfig, formatVND } from '../utils/qrService';
import { generateTenDigitId } from '../utils/idGenerator';
import { getFastSessionUser } from '../utils/sessionAuth';
import {
  X,
  Video,
  MapPin,
  Calendar,
  User,
  Phone,
  Mail,
  Building,
  ArrowRight,
  Flame,
  Check
} from 'lucide-react';

export interface LiveCourseRegistrationProps {
  isOpen?: boolean;
  onClose?: () => void;
  preselectedCourseId?: string;
  isStandalonePage?: boolean;
}

export const PRESET_TRAINING_SCHEDULES = [
  {
    id: 'zoom-sun-evening',
    label: 'Chủ Nhật, 22/11/2026 (19:30 - 21:30) • Trực tuyến qua Zoom',
    type: 'zoom' as const,
    note: 'Tương tác trực tiếp cùng chuyên gia, giải đáp câu hỏi thực tế'
  },
  {
    id: 'direct-sun-morning',
    label: 'Chủ Nhật, 22/11/2026 (08:30 - 11:30) • Trực tiếp Hội trường',
    type: 'direct' as const,
    note: 'Tập huấn trực tiếp tại Hội trường trung tâm FAST (Cấp giấy tại lớp)'
  },
  {
    id: 'zoom-sat-evening',
    label: 'Thứ Bảy, 28/11/2026 (19:30 - 21:30) • Trực tuyến qua Zoom',
    type: 'zoom' as const,
    note: 'Thực hành phân tích mối nguy & tình huống kiểm tra ATTP'
  },
  {
    id: 'custom-schedule',
    label: 'Lịch riêng theo yêu cầu của cơ sở / doanh nghiệp',
    type: 'direct' as const,
    note: 'FAST cử chuyên gia tập huấn tận nơi theo ngày giờ thỏa thuận cho đoàn từ 3 người'
  }
];

export const LiveCourseRegistration: React.FC<LiveCourseRegistrationProps> = ({
  isOpen = true,
  onClose,
  preselectedCourseId,
  isStandalonePage = false
}) => {
  const toast = useToast();
  const navigate = useNavigate();

  // State danh sách toàn bộ khóa học và 5 khóa nổi bật
  const [allCourses, setAllCourses] = useState<Course[]>(() => getMergedCourses([]));
  const [featuredCourseIds, setFeaturedCourseIds] = useState<string[]>(() => getCachedFeaturedCourseIds());

  // Form states
  const [selectedCourseId, setSelectedCourseId] = useState<string>('');
  const [scheduleChoice, setScheduleChoice] = useState<string>(PRESET_TRAINING_SCHEDULES[0].label);
  const [customDate, setCustomDate] = useState<string>('');
  const [trainingType, setTrainingType] = useState<'zoom' | 'direct'>('zoom');
  const [studentName, setStudentName] = useState<string>('');
  const [phone, setPhone] = useState<string>('');
  const [email, setEmail] = useState<string>('');
  const [companyName, setCompanyName] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [sessionRegId] = useState<string>(() => generateTenDigitId());
  const isMountedRef = useRef<boolean>(true);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // Sync toàn bộ khóa học từ API nếu có
  useEffect(() => {
    fetch('/api/courses')
      .then(res => res.json())
      .then(data => {
        if (data && Array.isArray(data.courses) && data.courses.length > 0) {
          setAllCourses(getMergedCourses(data.courses));
        }
      })
      .catch(() => {});
  }, []);

  // Lắng nghe 5 khóa nổi bật thời gian thực
  useEffect(() => {
    const unsub = subscribeToFeaturedCourseIds((ids) => {
      setFeaturedCourseIds(ids);
    });
    return () => unsub();
  }, []);

  // Lấy chính xác 5 khóa học nổi bật
  const featuredCourses = useMemo(() => {
    return filterFeaturedCourses(allCourses, featuredCourseIds);
  }, [allCourses, featuredCourseIds]);

  // Tự động chọn khóa học mặc định từ 5 khóa nổi bật
  useEffect(() => {
    if (preselectedCourseId && featuredCourses.some(c => c.id === preselectedCourseId)) {
      setSelectedCourseId(preselectedCourseId);
    } else if (featuredCourses.length > 0 && !selectedCourseId) {
      setSelectedCourseId(featuredCourses[0].id);
    }
  }, [featuredCourses, preselectedCourseId, selectedCourseId]);

  // Thông tin khóa học đang chọn
  const selectedCourse = useMemo(() => {
    return featuredCourses.find(c => c.id === selectedCourseId) || featuredCourses[0];
  }, [featuredCourses, selectedCourseId]);

  // Tự điền thông tin người dùng nếu đã đăng nhập
  useEffect(() => {
    const curUser = auth.currentUser;
    if (curUser) {
      if (curUser.displayName && !studentName) setStudentName(curUser.displayName);
      if (curUser.email && !email) setEmail(curUser.email);
    }
  }, [studentName, email]);

  // Cấu hình ngân hàng VietQR (ACB · 0989499568)
  const paymentConfig = useMemo(() => getPaymentConfig(), []);
  const accountNo = paymentConfig.accountNo === '0989499568' ? paymentConfig.accountNo : '0989499568';
  const tuitionAmount = 199000;
  const tuitionFormatted = formatVND(tuitionAmount);

  // Mã nội dung chuyển khoản luôn bắt đầu bằng FAST (1 từ liền mạch 12 ký tự để SePay nhận diện 100%)
  const fastPaymentCode = useMemo(() => {
    const suffix = sessionRegId.replace(/[^A-Z0-9]/gi, '').slice(-8).toUpperCase().padStart(8, '8');
    return `FAST${suffix}`;
  }, [sessionRegId]);

  const currentSessionUser = getFastSessionUser();
  const isUserLoggedIn = !!(auth.currentUser || currentSessionUser);

  const handleSubmitRegistration = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!studentName.trim()) {
      toast.showToast('Vui lòng nhập họ và tên học viên', 'error');
      return;
    }

    if (!phone.trim() || phone.trim().length < 9) {
      toast.showToast('Vui lòng nhập số điện thoại hợp lệ (tối thiểu 9 số)', 'error');
      return;
    }

    const sessionUser = getFastSessionUser();
    const normalizedEmail = (email.trim() || auth.currentUser?.email || sessionUser?.email || '').toLowerCase().trim();
    if (!normalizedEmail) {
      toast.showToast('Vui lòng nhập email để hệ thống tự động tạo tài khoản và gửi lịch học', 'error');
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
      toast.showToast('Email không đúng định dạng. Vui lòng kiểm tra lại!', 'error');
      return;
    }

    if (!selectedCourse) {
      toast.showToast('Vui lòng chọn 1 trong 5 khóa học nổi bật', 'error');
      return;
    }

    setIsSubmitting(true);
    const regId = sessionRegId;
    const chosenSchedule = customDate ? `Ngày riêng: ${customDate} (${trainingType === 'zoom' ? 'Zoom' : 'Trực tiếp'})` : scheduleChoice;
    const cleanPhoneDigits = phone.replace(/[^\d]/g, '');

    let resolvedOrderId = '';
    let resolvedPaymentCode = fastPaymentCode;

    try {
      const orderRes = await fetch('/api/create-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          courseId: selectedCourse.id,
          courseTitle: selectedCourse.title,
          amount: tuitionAmount,
          email: normalizedEmail || `${cleanPhoneDigits}@fast-training.local`,
          userId: auth.currentUser?.uid || '',
          registrationId: regId,
          orderType: 'direct_training',
          studentName: studentName.trim(),
          phone: phone.trim(),
          requestedPaymentCode: fastPaymentCode
        })
      });
      if (orderRes.ok) {
        const orderJson = await orderRes.json();
        if (orderJson.success && orderJson.paymentCode) {
          resolvedPaymentCode = String(orderJson.paymentCode).trim().toUpperCase();
          if (!resolvedPaymentCode.startsWith('FAST')) resolvedPaymentCode = `FAST${resolvedPaymentCode}`;
          resolvedOrderId = orderJson.orderId || '';
        }
      }
    } catch (err) {
      console.warn('Create order fallback:', err);
    }

    const resolvedMeetingLink =
      trainingType === 'direct'
        ? 'https://maps.google.com/?q=18+Nguyen+Co+Thach+Nam+Tu+Liem+Ha+Noi'
        : 'https://zoom.us/j/84927002668';
    const trainingTypeLabel = trainingType === 'zoom' ? 'Online qua Zoom HD' : 'Trực tiếp tại Hội trường';
    const nowIso = new Date().toISOString();

    const registrationData = {
      id: regId,
      orderId: resolvedOrderId,
      studentName: studentName.trim(),
      phone: phone.trim(),
      email: normalizedEmail,
      userEmail: normalizedEmail,
      companyName: companyName.trim() || 'Cá nhân / Tự do',
      courseId: selectedCourse.id,
      courseTitle: selectedCourse.title,
      price: tuitionFormatted,
      totalPrice: tuitionFormatted,
      totalNumericPrice: tuitionAmount,
      trainingType,
      trainingTypeLabel,
      startDate: chosenSchedule,
      notes: notes.trim(),
      registeredAt: nowIso,
      status: 'pending',
      paymentStatus: 'PENDING',
      paymentCode: resolvedPaymentCode,
      paymentMemo: resolvedPaymentCode,
      paymentBank: 'ACB',
      paymentAccountNo: accountNo,
      paymentMethod: 'sepay_acb_vietqr',
      meetingLink: resolvedMeetingLink,
      zoomLink: resolvedMeetingLink,
      zoomMeetingId: '849 2700 2668',
      zoomPasscode: 'FAST199K',
      venueAddress: 'Tòa nhà FAST E-Learning, Số 18 Phố Nguyễn Cơ Thạch, Nam Từ Liêm, Hà Nội'
    };

    const notifId = `training_${regId}`;
    const notificationPayload = {
      id: notifId,
      title: `Thông báo lịch học: ${selectedCourse.title}`,
      message: `Đăng ký #${regId} thành công (${trainingTypeLabel}). Lịch trình: ${chosenSchedule}. Mã thanh toán: ${resolvedPaymentCode}. Link/Địa điểm: ${resolvedMeetingLink}`,
      type: 'training_link',
      courseId: selectedCourse.id,
      courseTitle: selectedCourse.title,
      courseImage: selectedCourse.image || '',
      registrationId: regId,
      link: resolvedMeetingLink,
      startDate: chosenSchedule,
      venueAddress: registrationData.venueAddress,
      trainingTypeLabel,
      userEmail: normalizedEmail,
      isRead: false,
      createdAt: nowIso
    };

    try {
      try {
        await setDoc(doc(db, 'live_course_registrations', regId), registrationData);
        await setDoc(doc(db, 'direct_course_registrations', regId), registrationData);
      } catch (err) {
        console.warn('Lỗi ghi Firestore (tiếp tục lưu qua server):', err);
      }

      await fetch('/api/direct-registrations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...registrationData, deferAccountUntilPaid: true })
      }).catch((err) => {
        console.warn('Lỗi API server:', err);
      });

      const checkoutPayload = {
        registration: registrationData,
        orderId: resolvedOrderId,
        paymentCode: resolvedPaymentCode,
        amount: tuitionAmount,
        courseId: selectedCourse.id,
        courseTitle: selectedCourse.title,
        courseImage: selectedCourse.image || '',
        studentName: studentName.trim(),
        email: normalizedEmail,
        phone: phone.trim(),
        trainingTypeLabel,
        startDate: chosenSchedule,
        scheduleDetails: 'Sáng 08:30 - 11:30 | Tối 19:30 - 21:30',
        venueAddress: registrationData.venueAddress,
        meetingLink: resolvedMeetingLink
      };

      try {
        sessionStorage.setItem('fast_pending_training_checkout', JSON.stringify(checkoutPayload));
      } catch {}

      if (onClose) onClose();
      const q = new URLSearchParams({
        regId,
        code: resolvedPaymentCode
      });
      if (resolvedOrderId) q.set('orderId', resolvedOrderId);
      navigate(`/thanh-toan-dao-tao?${q.toString()}`, { state: { checkoutPayload } });
    } catch (error: any) {
      console.error('Lỗi khi gửi đăng ký:', error);
      toast.showToast('Có lỗi xảy ra khi khởi tạo thanh toán. Vui lòng thử lại!', 'error');
    } finally {
      if (isMountedRef.current) setIsSubmitting(false);
    }
  };

  if (!isOpen && !isStandalonePage) return null;

  // Render form đăng ký chính
  const content = (
    <div className="bg-white rounded-[32px] overflow-hidden border border-slate-100 shadow-2xl">
      {/* Header Modal / Page */}
      <div className="bg-gradient-to-r from-emerald-900 via-teal-900 to-[#005c56] p-6 sm:p-8 text-white relative overflow-hidden">
        <div className="absolute -right-10 -bottom-10 w-64 h-64 bg-emerald-400/10 rounded-full blur-2xl pointer-events-none" />
        
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="absolute top-5 right-5 w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition border border-white/20 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        )}

        <div className="space-y-2 relative z-10 pr-8">
          <div className="inline-flex items-center gap-2 bg-emerald-500/20 border border-emerald-400/40 px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider text-emerald-200">
            <Flame className="w-3.5 h-3.5 text-yellow-300 animate-pulse" />
            Đào Tạo Trực Tiếp & Online Zoom • Chỉ 199.000đ
          </div>
          <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight leading-snug">
            Đăng Ký Khóa Đào Tạo An Toàn Thực Phẩm
          </h2>
          <p className="text-emerald-100 text-xs sm:text-sm font-medium leading-relaxed max-w-2xl">
            Tập huấn chuẩn Bộ Y Tế & Codex • Cấp chứng nhận hoàn thành khóa học • Lựa chọn 1 trong 5 khóa đào tạo nổi bật nhất dưới đây.
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmitRegistration} className="p-6 sm:p-8 space-y-8">
        {/* BƯỚC 1: CHỌN TRONG 5 KHÓA HỌC NỔI BẬT */}
        <div className="space-y-3.5">
          <div className="flex items-center justify-between">
            <label className="text-xs sm:text-sm font-black text-slate-900 uppercase tracking-wider flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-[#007c76] text-white flex items-center justify-center text-xs">1</span>
              <span>Chọn 1 trong 5 khóa học nổi bật</span>
              <span className="text-red-500">*</span>
            </label>
            <span className="text-[11px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
              Đồng giá 199.000đ
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
            {featuredCourses.map((c, idx) => {
              const isSelected = selectedCourse?.id === c.id;
              return (
                <div
                  key={c.id || idx}
                  onClick={() => setSelectedCourseId(c.id)}
                  className={`p-3.5 rounded-2xl border-2 transition-all cursor-pointer relative flex flex-col justify-between group ${
                    isSelected
                      ? 'border-[#007c76] bg-teal-50/50 shadow-md ring-2 ring-[#007c76]/20'
                      : 'border-slate-200 hover:border-teal-300 bg-white hover:bg-slate-50/60'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <img
                      src={c.image}
                      alt={c.title}
                      className="w-14 h-14 rounded-xl object-cover shrink-0 shadow-xs border border-slate-100"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?auto=format&fit=crop&q=80&w=200';
                      }}
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 mb-1">
                        <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded bg-slate-100 text-slate-700">
                          {c.category || 'ATTP'}
                        </span>
                        <span className="text-[9px] font-bold text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">
                          ⭐ Nổi bật #{idx + 1}
                        </span>
                      </div>
                      <h4 className={`w-full text-xs font-black leading-[1.45] break-words [overflow-wrap:break-word] ${isSelected ? 'text-[#007c76]' : 'text-slate-800'}`}>
                        {c.title}
                      </h4>
                    </div>
                  </div>

                  <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-xs">
                    <div className="flex items-baseline gap-1.5">
                      <span className="text-[10px] text-slate-400 line-through font-medium">{c.price || '599.000đ'}</span>
                      <span className="font-black text-[#007c76]">199.000đ</span>
                    </div>

                    <div className={`w-5 h-5 rounded-full flex items-center justify-center transition-all ${
                      isSelected ? 'bg-[#007c76] text-white shadow-xs' : 'border border-slate-300 bg-white'
                    }`}>
                      {isSelected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* BƯỚC 2: CHỌN NGÀY VÀ HÌNH THỨC ĐÀO TẠO */}
        <div className="space-y-4 pt-2 border-t border-slate-100">
          <label className="text-xs sm:text-sm font-black text-slate-900 uppercase tracking-wider flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-[#007c76] text-white flex items-center justify-center text-xs">2</span>
            <span>Chọn ngày đào tạo & Hình thức học</span>
            <span className="text-red-500">*</span>
          </label>

          {/* Chọn Hình thức */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setTrainingType('zoom')}
              className={`p-4 rounded-2xl border-2 flex items-center gap-3.5 text-left transition cursor-pointer ${
                trainingType === 'zoom'
                  ? 'border-[#007c76] bg-teal-50/70 text-[#007c76] shadow-sm'
                  : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300'
              }`}
            >
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                trainingType === 'zoom' ? 'bg-[#007c76] text-white' : 'bg-slate-100 text-slate-500'
              }`}>
                <Video className="w-5 h-5" />
              </div>
              <div>
                <span className="font-black text-xs sm:text-sm block">Trực Tuyến Qua Zoom</span>
                <span className="text-[11px] text-slate-500 font-medium">Tương tác trực tiếp 1-1, học tại nhà</span>
              </div>
            </button>

            <button
              type="button"
              onClick={() => setTrainingType('direct')}
              className={`p-4 rounded-2xl border-2 flex items-center gap-3.5 text-left transition cursor-pointer ${
                trainingType === 'direct'
                  ? 'border-[#007c76] bg-teal-50/70 text-[#007c76] shadow-sm'
                  : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300'
              }`}
            >
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                trainingType === 'direct' ? 'bg-[#007c76] text-white' : 'bg-slate-100 text-slate-500'
              }`}>
                <MapPin className="w-5 h-5" />
              </div>
              <div>
                <span className="font-black text-xs sm:text-sm block">Trực Tiếp Hội Trường</span>
                <span className="text-[11px] text-slate-500 font-medium">Hội trường trung tâm hoặc cơ sở cơ quan</span>
              </div>
            </button>
          </div>

          {/* Lựa chọn lịch đào tạo */}
          <div className="space-y-2">
            <span className="text-xs font-bold text-slate-700">Các ca khai giảng sắp tới:</span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {PRESET_TRAINING_SCHEDULES.map((preset) => {
                const isSelected = !customDate && scheduleChoice === preset.label;
                return (
                  <div
                    key={preset.id}
                    onClick={() => {
                      setScheduleChoice(preset.label);
                      setCustomDate('');
                      setTrainingType(preset.type);
                    }}
                    className={`p-3 rounded-xl border text-xs cursor-pointer transition flex items-start gap-2.5 ${
                      isSelected
                        ? 'border-[#007c76] bg-teal-50 text-[#007c76] font-black'
                        : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <Calendar className={`w-4 h-4 shrink-0 mt-0.5 ${isSelected ? 'text-[#007c76]' : 'text-slate-400'}`} />
                    <div className="min-w-0">
                      <p className="font-bold leading-tight">{preset.label}</p>
                      <p className="text-[10px] text-slate-500 mt-0.5">{preset.note}</p>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Hoặc chọn ngày cụ thể bằng date picker */}
            <div className="pt-2">
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-500 font-medium">Hoặc chỉ định ngày cụ thể:</span>
                <input
                  type="date"
                  value={customDate}
                  min={new Date().toISOString().split('T')[0]}
                  onChange={(e) => setCustomDate(e.target.value)}
                  className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#007c76]"
                />
              </div>
            </div>
          </div>
        </div>

        {/* BƯỚC 3: THÔNG TIN HỌC VIÊN & LIÊN HỆ */}
        <div className="space-y-4 pt-2 border-t border-slate-100">
          <label className="text-xs sm:text-sm font-black text-slate-900 uppercase tracking-wider flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-[#007c76] text-white flex items-center justify-center text-xs">3</span>
            <span>Thông tin liên hệ nhận tài liệu & phòng học</span>
            <span className="text-red-500">*</span>
          </label>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Họ và tên học viên <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  required
                  placeholder="Ví dụ: Nguyễn Văn An"
                  value={studentName}
                  onChange={(e) => setStudentName(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm font-bold text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#007c76]"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Số điện thoại / Zalo <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <Phone className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="tel"
                  required
                  placeholder="09xx xxx xxx (nhận link Zoom & tài liệu)"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm font-bold text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#007c76]"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Email nhận lịch học &amp; tài khoản <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  required
                  placeholder="hocvien@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm font-bold text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#007c76]"
                />
              </div>
              {!isUserLoggedIn && (
                <p className="text-[11px] text-[#007c76] mt-1 font-medium">
                  Hệ thống tự động tạo tài khoản theo email này để nhận OTP &amp; xem lịch học.
                </p>
              )}
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Cơ sở / Doanh nghiệp / Nhà hàng
              </label>
              <div className="relative">
                <Building className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Tên nhà hàng, bếp ăn hoặc cá nhân"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm font-bold text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#007c76]"
                />
              </div>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Ghi chú hoặc câu hỏi trước buổi học (tùy chọn)
            </label>
            <textarea
              rows={2}
              placeholder="Ví dụ: Cơ sở muốn hỏi thêm về thủ tục xin giấy chứng nhận ATTP bếp ăn..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#007c76]"
            />
          </div>
        </div>

        {/* Nút chuyển sang trang thanh toán */}
        <div className="pt-2">
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-4 px-6 bg-gradient-to-r from-emerald-600 via-teal-600 to-[#007c76] hover:from-emerald-700 hover:to-[#005c56] text-white rounded-2xl font-black text-sm uppercase tracking-wider shadow-xl shadow-teal-700/20 transition-all transform hover:scale-[1.01] active:scale-98 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
          >
            {isSubmitting ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>Đang chuyển sang trang thanh toán...</span>
              </>
            ) : (
              <>
                <span>Tiếp tục thanh toán ({tuitionFormatted})</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
          <p className="text-center text-[11px] text-slate-400 font-medium mt-2.5">
            Thanh toán tự động ACB / SePay • Sau khi hoàn tất, hệ thống tự động tạo tài khoản &amp; gửi mã OTP.
          </p>
        </div>
      </form>
    </div>
  );

  if (isStandalonePage) {
    return (
      <main className="min-h-screen bg-[#f8fafc] py-10 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto">
          {content}
        </div>
      </main>
    );
  }

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 animate-in fade-in">
      <div className="relative w-full max-w-4xl my-8">
        {content}
      </div>
    </div>
  );
};

export default LiveCourseRegistration;
