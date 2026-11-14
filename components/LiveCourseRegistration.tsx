import React, { useState, useEffect, useMemo } from 'react';
import { db, auth } from '../firebase';
import { collection, doc, setDoc } from 'firebase/firestore';
import { useToast } from '../contexts/ToastContext';
import { Course } from '../types';
import { getMergedCourses } from '../constants';
import { getCachedFeaturedCourseIds, subscribeToFeaturedCourseIds, filterFeaturedCourses } from '../utils/featuredCoursesService';
import { getPaymentConfig, getVietQrUrl } from '../utils/qrService';
import { generateTenDigitId } from '../utils/idGenerator';
import {
  X,
  Video,
  MapPin,
  Calendar,
  User,
  Phone,
  Mail,
  Building,
  CheckCircle2,
  QrCode,
  ShieldCheck,
  Sparkles,
  Copy,
  Clock,
  Award,
  ChevronRight,
  BookOpen,
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
    label: 'Tối Chủ Nhật (19:30 - 21:30) • Trực tuyến qua Zoom',
    type: 'zoom' as const,
    note: 'Tương tác trực tiếp cùng chuyên gia, giải đáp câu hỏi thực tế'
  },
  {
    id: 'direct-sun-morning',
    label: 'Sáng Chủ Nhật (08:30 - 11:30) • Trực tiếp Hội trường',
    type: 'direct' as const,
    note: 'Tập huấn trực tiếp tại Hội trường trung tâm FAST (Cấp giấy tại lớp)'
  },
  {
    id: 'zoom-sat-evening',
    label: 'Tối Thứ Bảy (19:30 - 21:30) • Trực tuyến qua Zoom',
    type: 'zoom' as const,
    note: 'Thực hành phân tích mối nguy & tình huống kiểm tra ATTP'
  },
  {
    id: 'custom-schedule',
    label: 'Lịch riêng theo yêu cầu của cơ sở / doanh nghiệp',
    type: 'direct' as const,
    note: 'FAST cử chuyên gia tập huấn tận nơi cho đoàn từ 3 người'
  }
];

export const LiveCourseRegistration: React.FC<LiveCourseRegistrationProps> = ({
  isOpen = true,
  onClose,
  preselectedCourseId,
  isStandalonePage = false
}) => {
  const toast = useToast();

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
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [createdRecord, setCreatedRecord] = useState<any | null>(null);

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

  // Cấu hình ngân hàng VietQR
  const paymentConfig = useMemo(() => getPaymentConfig(), []);
  const tuitionAmount = 199000;
  const tuitionFormatted = '199.000đ';

  const cleanPhoneMemo = useMemo(() => {
    const digits = phone.replace(/[^\d]/g, '');
    const courseCode = selectedCourse?.id?.replace(/[^a-zA-Z0-9]/g, '').slice(0, 6).toUpperCase() || 'LIVE';
    return `LIVE199K ${digits || 'SDT'} ${courseCode}`;
  }, [phone, selectedCourse?.id]);

  const vietQrUrl = useMemo(() => {
    return getVietQrUrl({
      bankId: paymentConfig.bankId || 'MB',
      accountNo: paymentConfig.accountNo || '0927002668',
      accountName: paymentConfig.accountName || 'CONG TY TNHH TU VAN FAST',
      amount: tuitionAmount,
      memo: cleanPhoneMemo,
      template: 'compact2'
    });
  }, [paymentConfig, cleanPhoneMemo, tuitionAmount]);

  const handleCopy = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    toast.showToast(`Đã sao chép ${field}!`, 'success');
    setTimeout(() => setCopiedField(null), 2000);
  };

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

    if (!selectedCourse) {
      toast.showToast('Vui lòng chọn 1 trong 5 khóa học nổi bật', 'error');
      return;
    }

    setIsSubmitting(true);
    const regId = generateTenDigitId();
    const chosenSchedule = customDate ? `Ngày riêng: ${customDate} (${trainingType === 'zoom' ? 'Zoom' : 'Trực tiếp'})` : scheduleChoice;

    const registrationData = {
      id: regId,
      studentName: studentName.trim(),
      phone: phone.trim(),
      email: email.trim() || (auth.currentUser?.email || ''),
      companyName: companyName.trim() || 'Cá nhân / Tự do',
      courseId: selectedCourse.id,
      courseTitle: selectedCourse.title,
      price: tuitionFormatted,
      trainingType,
      startDate: chosenSchedule,
      notes: notes.trim(),
      registeredAt: new Date().toISOString(),
      status: 'pending',
      paymentCode: cleanPhoneMemo,
      paymentMethod: 'vietqr',
      zoomMeetingId: '849 2700 2668',
      zoomPasscode: 'FAST199K',
      venueAddress: 'Tòa nhà FAST E-Learning, Số 18 Phố Nguyễn Cơ Thạch, Nam Từ Liêm, Hà Nội'
    };

    try {
      // 1. Lưu Firestore live_course_registrations & direct_course_registrations
      try {
        await setDoc(doc(db, 'live_course_registrations', regId), registrationData);
        await setDoc(doc(db, 'direct_course_registrations', regId), registrationData);
      } catch (err) {
        console.warn('Lỗi ghi Firestore (tiếp tục lưu qua server):', err);
      }

      // 2. Gửi API lưu vào backend server & backup đĩa cứng
      try {
        await fetch('/api/direct-registrations', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(registrationData)
        });
      } catch (err) {
        console.warn('Lỗi API server:', err);
      }

      setCreatedRecord(registrationData);
      setIsSuccess(true);
      toast.showToast('Đăng ký khóa đào tạo trực tiếp thành công!', 'success');
    } catch (error: any) {
      console.error('Lỗi khi gửi đăng ký:', error);
      toast.showToast('Có lỗi xảy ra khi lưu đăng ký. Vui lòng thử lại!', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResetForm = () => {
    setIsSuccess(false);
    setCreatedRecord(null);
    setNotes('');
  };

  if (!isOpen && !isStandalonePage) return null;

  // Render Màn hình Thành công (Confirmation Screen)
  if (isSuccess && createdRecord) {
    return (
      <div className={isStandalonePage ? 'max-w-4xl mx-auto p-4 md:p-8 animate-fade-in' : 'p-6 md:p-8 text-center animate-fade-in'}>
        <div className="bg-white rounded-3xl border border-emerald-100 shadow-2xl p-6 sm:p-10 text-center max-w-2xl mx-auto space-y-6">
          <div className="w-20 h-20 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto shadow-inner animate-bounce">
            <CheckCircle2 className="w-10 h-10" />
          </div>

          <div className="space-y-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider bg-emerald-50 text-emerald-700 border border-emerald-200">
              <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
              Đăng ký thành công • Học phí: {tuitionFormatted}
            </span>
            <h3 className="text-2xl sm:text-3xl font-black text-gray-900 leading-tight">
              Chào mừng {createdRecord.studentName}!
            </h3>
            <p className="text-sm text-gray-600 max-w-md mx-auto">
              Hệ thống FAST E-Learning đã ghi nhận hồ sơ đăng ký khóa đào tạo trực tiếp của bạn.
            </p>
          </div>

          {/* Chi tiết phiếu đăng ký */}
          <div className="bg-slate-50 rounded-2xl p-5 border border-slate-200 text-left space-y-3.5 text-xs sm:text-sm">
            <div className="flex justify-between items-center pb-2.5 border-b border-slate-200">
              <span className="text-slate-500 font-bold">Khóa học đăng ký:</span>
              <span className="font-black text-[#007c76] text-right truncate max-w-[240px]">{createdRecord.courseTitle}</span>
            </div>
            <div className="flex justify-between items-center pb-2.5 border-b border-slate-200">
              <span className="text-slate-500 font-bold">Lịch đào tạo:</span>
              <span className="font-black text-slate-800 text-right">{createdRecord.startDate}</span>
            </div>
            <div className="flex justify-between items-center pb-2.5 border-b border-slate-200">
              <span className="text-slate-500 font-bold">Hình thức:</span>
              <span className="font-black text-emerald-700 flex items-center gap-1">
                {createdRecord.trainingType === 'zoom' ? <Video className="w-4 h-4" /> : <MapPin className="w-4 h-4" />}
                {createdRecord.trainingType === 'zoom' ? 'Trực tuyến Zoom' : 'Trực tiếp Hội trường'}
              </span>
            </div>
            <div className="flex justify-between items-center pb-2.5 border-b border-slate-200">
              <span className="text-slate-500 font-bold">Số điện thoại / Zalo:</span>
              <span className="font-black text-slate-900">{createdRecord.phone}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-500 font-bold">Mã số hồ sơ:</span>
              <span className="font-mono font-black text-xs text-slate-800 bg-white px-2.5 py-1 rounded border border-slate-200">
                #{createdRecord.id}
              </span>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 pt-2">
            <button
              type="button"
              onClick={handleResetForm}
              className="flex-1 py-3 px-4 rounded-xl border border-gray-300 text-gray-700 font-bold text-xs uppercase tracking-wider hover:bg-gray-50 transition"
            >
              Đăng ký thêm khóa khác
            </button>
            {onClose && (
              <button
                type="button"
                onClick={onClose}
                className="flex-1 py-3 px-4 rounded-xl bg-[#007c76] hover:bg-[#00605b] text-white font-black text-xs uppercase tracking-wider shadow-lg shadow-[#007c76]/20 transition"
              >
                Đóng thông báo
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

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
                      <h4 className={`text-xs font-black line-clamp-2 leading-snug ${isSelected ? 'text-[#007c76]' : 'text-slate-800'}`}>
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
                Email nhận chứng nhận
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  placeholder="hocvien@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm font-bold text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#007c76]"
                />
              </div>
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

        {/* BƯỚC 4: THANH TOÁN VIETQR 199.000Đ */}
        <div className="p-5 sm:p-6 bg-slate-50 rounded-2xl border border-slate-200 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-200">
            <div>
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">Học phí đào tạo trực tiếp</span>
              <span className="text-2xl font-black text-[#007c76]">{tuitionFormatted}</span>
            </div>
            <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200 w-fit">
              ✓ Đã bao gồm giáo trình, bài test & cấp chứng nhận
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-12 gap-5 items-center">
            {/* Ảnh mã VietQR */}
            <div className="md:col-span-5 flex flex-col items-center">
              <div className="bg-white p-3 rounded-2xl border border-slate-200 shadow-md">
                <img
                  src={vietQrUrl}
                  alt="VietQR 199k"
                  className="w-48 h-48 object-contain rounded-lg"
                />
              </div>
              <span className="text-[10px] font-bold text-slate-400 mt-1.5 flex items-center gap-1">
                <QrCode className="w-3 h-3 text-[#007c76]" /> Quét mã thanh toán tức thì
              </span>
            </div>

            {/* Chi tiết chuyển khoản */}
            <div className="md:col-span-7 space-y-2.5 text-xs">
              <div className="bg-white p-3 rounded-xl border border-slate-200 flex items-center justify-between">
                <div>
                  <span className="text-[10px] text-slate-400 font-bold block">Ngân hàng thụ hưởng</span>
                  <span className="font-bold text-slate-800">{paymentConfig.bankName || 'MB Bank'}</span>
                </div>
              </div>

              <div className="bg-white p-3 rounded-xl border border-slate-200 flex items-center justify-between">
                <div>
                  <span className="text-[10px] text-slate-400 font-bold block">Số tài khoản</span>
                  <span className="font-mono font-black text-slate-900 text-sm">{paymentConfig.accountNo || '0927002668'}</span>
                </div>
                <button
                  type="button"
                  onClick={() => handleCopy(paymentConfig.accountNo || '0927002668', 'số tài khoản')}
                  className="px-2.5 py-1 text-[11px] rounded bg-slate-100 hover:bg-slate-200 font-bold text-slate-700 flex items-center gap-1 cursor-pointer"
                >
                  <Copy className="w-3 h-3" />
                  <span>{copiedField === 'số tài khoản' ? 'Đã chép' : 'Sao chép'}</span>
                </button>
              </div>

              <div className="bg-white p-3 rounded-xl border border-slate-200 flex items-center justify-between">
                <div>
                  <span className="text-[10px] text-slate-400 font-bold block">Chủ tài khoản</span>
                  <span className="font-black text-slate-800 uppercase text-xs">{paymentConfig.accountName || 'CÔNG TY TNHH TƯ VẤN FAST'}</span>
                </div>
              </div>

              <div className="bg-teal-50/70 p-3 rounded-xl border border-teal-200 flex items-center justify-between">
                <div>
                  <span className="text-[10px] text-teal-800 font-bold block">Nội dung chuyển khoản (Memo)</span>
                  <span className="font-mono font-black text-[#007c76] text-xs sm:text-sm">{cleanPhoneMemo}</span>
                </div>
                <button
                  type="button"
                  onClick={() => handleCopy(cleanPhoneMemo, 'nội dung chuyển khoản')}
                  className="px-2.5 py-1 text-[11px] rounded bg-[#007c76] text-white hover:bg-[#00605b] font-bold flex items-center gap-1 cursor-pointer shadow-xs"
                >
                  <Copy className="w-3 h-3" />
                  <span>{copiedField === 'nội dung chuyển khoản' ? 'Đã chép' : 'Sao chép'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Nút gửi đăng ký */}
        <div className="pt-2">
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-4 px-6 bg-gradient-to-r from-emerald-600 via-teal-600 to-[#007c76] hover:from-emerald-700 hover:to-[#005c56] text-white rounded-2xl font-black text-sm uppercase tracking-wider shadow-xl shadow-teal-700/20 transition-all transform hover:scale-[1.01] active:scale-98 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
          >
            {isSubmitting ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>Đang ghi nhận hồ sơ...</span>
              </>
            ) : (
              <>
                <span>Xác Nhận Đăng Ký Khóa Đào Tạo (199.000đ)</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
          <p className="text-center text-[11px] text-slate-400 font-medium mt-2.5">
            Bảo mật thông tin học viên 100% • Hỗ trợ xuất hóa đơn VAT theo yêu cầu của cơ sở doanh nghiệp.
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
