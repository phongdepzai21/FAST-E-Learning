import React, { useState, useEffect, useMemo } from 'react';
import { 
  X, 
  CheckCircle2, 
  Calendar, 
  MapPin, 
  Video, 
  Phone, 
  Mail, 
  Building2, 
  User, 
  Sparkles, 
  QrCode, 
  ShieldCheck, 
  FileText,
  Copy,
  Users,
  Minus,
  Plus,
  Info,
  ChevronRight,
  Check
} from 'lucide-react';
import { TrainingCourse } from '../types';
import { generateTenDigitId, toTenDigitId } from '../utils/idGenerator';
import { db, auth } from '../firebase';
import { doc, setDoc } from 'firebase/firestore';
import { useToast } from '../contexts/ToastContext';

interface TrainingRegistrationModalProps {
  isOpen: boolean;
  onClose: () => void;
  course: TrainingCourse | null;
}

export const TrainingRegistrationModal: React.FC<TrainingRegistrationModalProps> = ({
  isOpen,
  onClose,
  course
}) => {
  const toast = useToast();

  // Form inputs
  const [studentName, setStudentName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [participantCount, setParticipantCount] = useState<number>(1);
  const [extraStudents, setExtraStudents] = useState<string>('');
  const [trainingType, setTrainingType] = useState<'zoom' | 'direct' | 'both' | 'inhouse'>('both');
  const [notes, setNotes] = useState('');

  // UI state
  const [copiedMemo, setCopiedMemo] = useState(false);
  const [copiedStk, setCopiedStk] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [createdRecord, setCreatedRecord] = useState<any>(null);

  // Sync user info and default format on open
  useEffect(() => {
    if (isOpen) {
      if (auth.currentUser) {
        setStudentName(auth.currentUser.displayName || '');
        setEmail(auth.currentUser.email || '');
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
  }, [isOpen, course]);

  if (!isOpen || !course) return null;

  // Calculate pricing based on single course price and attendee count
  const unitPriceNumeric = useMemo(() => {
    const rawDigits = (course.price || '').replace(/[^\d]/g, '');
    const num = parseInt(rawDigits, 10);
    return isNaN(num) || num <= 0 ? 299000 : num;
  }, [course.price]);

  const totalNumericPrice = unitPriceNumeric * Math.max(1, participantCount);
  const formattedTotalPrice = totalNumericPrice.toLocaleString('vi-VN') + 'đ';

  const cleanPhone = phone.replace(/[^\d]/g, '').slice(-6) || 'HOCVIEN';
  const transferMemo = `DAOTAO ${cleanPhone} ${toTenDigitId(course.id).slice(-4)}`;
  const qrUrl = `https://img.vietqr.io/image/970422-0927002668-compact2.png?amount=${totalNumericPrice}&addInfo=${encodeURIComponent(transferMemo)}&accountName=VIEN%20DAO%20TAO%20FAST`;

  const copyToClipboard = (text: string, type: 'memo' | 'stk') => {
    navigator.clipboard.writeText(text);
    if (type === 'memo') {
      setCopiedMemo(true);
      setTimeout(() => setCopiedMemo(false), 2000);
      toast.showToast('Đã sao chép nội dung chuyển khoản!', 'success');
    } else {
      setCopiedStk(true);
      setTimeout(() => setCopiedStk(false), 2000);
      toast.showToast('Đã sao chép số tài khoản!', 'success');
    }
  };

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

    if (email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
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

    const regData = {
      id: regId,
      userId: auth.currentUser?.uid || null,
      userEmail: auth.currentUser?.email || email.trim(),
      studentName: studentName.trim(),
      phone: phone.trim(),
      email: email.trim() || (auth.currentUser?.email || ''),
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
      venueAddress: course.venueAddress || 'Số 18 Nguyễn Cơ Thạch, Nam Từ Liêm, Hà Nội / Zoom HD',
      notes: notes.trim(),
      paymentMethod: 'vietqr',
      paymentMemo: transferMemo,
      status: 'pending',
      registeredAt: nowIso,
      updatedAt: nowIso
    };

    try {
      // 1. Save to Firestore collection live_course_registrations
      await setDoc(doc(db, 'live_course_registrations', regId), regData);

      // 2. Post to backend server endpoint (non-blocking fallback)
      fetch('/api/direct-registrations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(regData)
      }).catch(() => {});

      setCreatedRecord(regData);
      setIsSuccess(true);
      toast.showToast('Đăng ký khóa học thành công! Vui lòng hoàn tất thanh toán học phí.', 'success');
    } catch (err: any) {
      console.error('Lỗi lưu đăng ký khóa học:', err);
      toast.showToast('Không thể gửi đăng ký. Vui lòng kiểm tra lại kết nối mạng!', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReset = () => {
    setIsSuccess(false);
    setCreatedRecord(null);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/80 backdrop-blur-md overflow-y-auto print:hidden">
      <div className="bg-white rounded-3xl max-w-2xl w-full border border-slate-200 shadow-2xl overflow-hidden my-6 animate-fade-in relative text-slate-800">
        
        {/* Header Header Bar */}
        <div className="bg-gradient-to-r from-slate-900 via-teal-950 to-[#007c76] p-5 sm:p-6 text-white flex items-center justify-between border-b border-teal-500/30">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-2xl bg-white/10 flex items-center justify-center border border-white/20 shrink-0 shadow-inner">
              <Sparkles className="w-5 h-5 text-teal-300" />
            </div>
            <div className="min-w-0">
              <span className="text-[10px] font-black uppercase tracking-widest text-teal-300 block">
                Đăng Ký Khóa Đào Tạo Trực Tiếp &amp; Zoom
              </span>
              <h3 className="font-black text-base text-white truncate">
                {course.title}
              </h3>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition cursor-pointer shrink-0 ml-2"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Screen 2: Registration Success & Payment Details */}
        {isSuccess && createdRecord ? (
          <div className="p-6 sm:p-8 space-y-6 max-h-[85vh] overflow-y-auto">
            {/* Success Banner */}
            <div className="text-center space-y-3">
              <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-2xl flex items-center justify-center mx-auto shadow-inner animate-bounce">
                <CheckCircle2 className="w-9 h-9" />
              </div>
              <div>
                <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-[11px] font-black uppercase tracking-wider bg-emerald-50 text-emerald-800 border border-emerald-200">
                  Mã đăng ký: #{createdRecord.id}
                </span>
                <h3 className="text-xl sm:text-2xl font-black text-slate-900 uppercase mt-2">
                  Đăng ký thành công!
                </h3>
                <p className="text-xs sm:text-sm text-slate-600 max-w-md mx-auto mt-1">
                  Cảm ơn <strong className="text-slate-900">{createdRecord.studentName}</strong>. Hệ thống đã lưu giữ chỗ cho bạn. Vui lòng chuyển khoản học phí để xác nhận giữ chỗ chính thức.
                </p>
              </div>
            </div>

            {/* Registration Summary Card */}
            <div className="bg-slate-50 rounded-2xl p-4 sm:p-5 border border-slate-200 space-y-2.5 text-xs sm:text-sm">
              <div className="flex justify-between items-center pb-2 border-b border-slate-200">
                <span className="text-slate-500 font-bold">Khóa đào tạo:</span>
                <span className="font-black text-[#007c76] text-right truncate max-w-[240px] sm:max-w-[320px]">{createdRecord.courseTitle}</span>
              </div>
              <div className="flex justify-between items-center pb-2 border-b border-slate-200">
                <span className="text-slate-500 font-bold">Hình thức học:</span>
                <span className="font-black text-emerald-700 flex items-center gap-1.5">
                  {createdRecord.trainingType === 'zoom' ? <Video className="w-4 h-4" /> : <MapPin className="w-4 h-4" />}
                  {createdRecord.trainingTypeLabel}
                </span>
              </div>
              <div className="flex justify-between items-center pb-2 border-b border-slate-200">
                <span className="text-slate-500 font-bold">Số lượng học viên:</span>
                <span className="font-bold text-slate-800">{createdRecord.participantCount} học viên</span>
              </div>
              <div className="flex justify-between items-center pb-2 border-b border-slate-200">
                <span className="text-slate-500 font-bold">Lịch khai giảng:</span>
                <span className="font-bold text-slate-800">{createdRecord.startDate}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500 font-bold">Tổng học phí:</span>
                <span className="font-black text-emerald-700 text-base">{createdRecord.totalPrice}</span>
              </div>
            </div>

            {/* VietQR Bank Transfer Card */}
            <div className="p-4 sm:p-5 bg-teal-50/60 rounded-2xl border border-teal-200/80 space-y-4">
              <div className="flex items-center gap-2 text-[#007c76] font-black uppercase text-xs">
                <QrCode className="w-4 h-4" />
                <span>Thanh Toán Chuyển Khoản Qua VietQR</span>
              </div>

              <div className="flex flex-col sm:flex-row items-center gap-4">
                <div className="bg-white p-2 rounded-xl border border-teal-200 shadow-sm shrink-0">
                  <img
                    src={qrUrl}
                    alt="VietQR Chuyển khoản"
                    className="w-36 h-36 object-contain"
                  />
                </div>

                <div className="space-y-2.5 text-xs flex-1 w-full">
                  <div className="bg-white p-2.5 rounded-xl border border-slate-200 flex justify-between items-center">
                    <div>
                      <span className="text-[10px] text-slate-400 font-bold uppercase block">Ngân hàng &amp; STK</span>
                      <strong className="font-mono text-slate-900 font-black text-sm">MB Bank: 0927 002 668</strong>
                      <span className="text-[10px] text-slate-500 block">VIEN DAO TAO FAST</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => copyToClipboard('0927002668', 'stk')}
                      className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-bold text-[11px] transition flex items-center gap-1 cursor-pointer"
                    >
                      {copiedStk ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copiedStk ? 'Đã chép' : 'Sao chép'}</span>
                    </button>
                  </div>

                  <div className="bg-amber-50 p-2.5 rounded-xl border border-amber-200 flex justify-between items-center">
                    <div>
                      <span className="text-[10px] text-amber-700 font-black uppercase block">Nội dung chuyển khoản (bắt buộc)</span>
                      <strong className="font-mono text-amber-950 font-black text-sm bg-yellow-200/70 px-1.5 py-0.5 rounded">
                        {transferMemo}
                      </strong>
                    </div>
                    <button
                      type="button"
                      onClick={() => copyToClipboard(transferMemo, 'memo')}
                      className="px-2.5 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg font-bold text-[11px] transition flex items-center gap-1 cursor-pointer shadow-xs"
                    >
                      {copiedMemo ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copiedMemo ? 'Đã chép' : 'Chép cú pháp'}</span>
                    </button>
                  </div>
                </div>
              </div>

              <div className="text-[11px] text-slate-500 bg-white/80 p-3 rounded-xl border border-teal-100 flex items-start gap-2">
                <Info className="w-4 h-4 text-[#007c76] shrink-0 mt-0.5" />
                <span>
                  Sau khi hoàn tất thanh toán, bộ phận học vụ FAST E-Learning sẽ kiểm tra và gửi xác nhận qua Zalo SĐT <strong className="text-slate-800 font-mono">{createdRecord.phone}</strong> kèm đường dẫn phòng Zoom và giáo trình chi tiết.
                </span>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="pt-2 flex flex-col sm:flex-row gap-3">
              <button
                type="button"
                onClick={handleReset}
                className="w-full py-3.5 bg-[#007c76] hover:bg-[#005c56] text-white font-black text-xs uppercase tracking-wider rounded-xl transition cursor-pointer shadow-lg shadow-[#007c76]/20 flex items-center justify-center gap-2"
              >
                <span>Hoàn Tất &amp; Đóng Thông Báo</span>
              </button>
            </div>
          </div>
        ) : (
          /* Form Đăng Ký Khóa Học */
          <form onSubmit={handleSubmit} className="p-5 sm:p-7 space-y-5 max-h-[80vh] overflow-y-auto">
            {/* Tóm tắt khóa học & ảnh bìa */}
            <div className="flex items-center gap-4 p-3.5 rounded-2xl bg-teal-50/60 border border-teal-200/80">
              <img
                src={course.image}
                alt={course.title}
                className="w-24 h-16 object-cover rounded-xl border border-slate-200 shadow-xs shrink-0"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1556910103-1c02745aae4d?auto=format&fit=crop&q=80&w=800';
                }}
              />
              <div className="flex-1 min-w-0 space-y-0.5">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-black uppercase text-[#007c76]">{course.category || 'Đào tạo ATTP'}</span>
                  <span className="text-[10px] bg-white text-slate-600 px-2 py-0.5 rounded-full font-bold border border-slate-200">
                    Lịch: {course.startDate || 'Chủ Nhật hàng tuần'}
                  </span>
                </div>
                <h4 className="text-sm font-black text-slate-900 truncate">{course.title}</h4>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-black text-emerald-700">{course.price}</span>
                  {course.originalPrice && course.originalPrice !== course.price && (
                    <span className="text-xs text-slate-400 line-through font-bold">{course.originalPrice}</span>
                  )}
                  <span className="text-[10px] text-slate-500 font-medium">({course.duration || '1 ngày'})</span>
                </div>
              </div>
            </div>

            {/* Select Hình thức tham gia (Zoom / Offline Direct) */}
            <div className="space-y-2">
              <label className="text-xs font-black uppercase tracking-wider text-slate-700 block">
                Hình thức học tập mong muốn:
              </label>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button
                  type="button"
                  disabled={course.trainingFormat === 'direct'}
                  onClick={() => setTrainingType('zoom')}
                  className={`p-3.5 rounded-2xl border text-left transition flex items-center gap-3 cursor-pointer ${
                    trainingType === 'zoom'
                      ? 'border-[#007c76] bg-teal-50/80 shadow-xs text-[#007c76] ring-2 ring-[#007c76]/20'
                      : 'border-slate-200 hover:border-slate-300 text-slate-600'
                  } ${course.trainingFormat === 'direct' ? 'opacity-50 cursor-not-allowed bg-slate-100' : ''}`}
                >
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                    trainingType === 'zoom' ? 'bg-[#007c76] text-white' : 'bg-slate-100 text-slate-600'
                  }`}>
                    <Video className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="font-black text-xs block">Online qua Zoom HD</span>
                    <span className="text-[10px] opacity-80 block">Học tại nhà, tương tác 1-1</span>
                  </div>
                </button>

                <button
                  type="button"
                  disabled={course.trainingFormat === 'zoom'}
                  onClick={() => setTrainingType('direct')}
                  className={`p-3.5 rounded-2xl border text-left transition flex items-center gap-3 cursor-pointer ${
                    trainingType === 'direct'
                      ? 'border-[#007c76] bg-teal-50/80 shadow-xs text-[#007c76] ring-2 ring-[#007c76]/20'
                      : 'border-slate-200 hover:border-slate-300 text-slate-600'
                  } ${course.trainingFormat === 'zoom' ? 'opacity-50 cursor-not-allowed bg-slate-100' : ''}`}
                >
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                    trainingType === 'direct' ? 'bg-[#007c76] text-white' : 'bg-slate-100 text-slate-600'
                  }`}>
                    <MapPin className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="font-black text-xs block">Trực tiếp tại Hội trường</span>
                    <span className="text-[10px] opacity-80 block">Thực hành hiện trường &amp; mẫu</span>
                  </div>
                </button>
              </div>
            </div>

            {/* Controls Số lượng học viên */}
            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="space-y-0.5 text-center sm:text-left">
                <span className="text-xs font-black uppercase text-slate-800 block">Số lượng học viên đăng ký</span>
                <span className="text-[11px] text-slate-500 font-medium block">
                  Đơn giá: <strong className="text-slate-800">{course.price}</strong> / học viên
                </span>
              </div>

              <div className="flex items-center gap-3 bg-white px-3 py-1.5 rounded-xl border border-slate-200 shadow-xs">
                <button
                  type="button"
                  onClick={() => setParticipantCount(prev => Math.max(1, prev - 1))}
                  className="w-7 h-7 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center justify-center transition cursor-pointer font-bold"
                >
                  <Minus className="w-3.5 h-3.5" />
                </button>
                <span className="w-8 text-center font-black text-sm text-slate-900 font-mono">
                  {participantCount}
                </span>
                <button
                  type="button"
                  onClick={() => setParticipantCount(prev => Math.min(50, prev + 1))}
                  className="w-7 h-7 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center justify-center transition cursor-pointer font-bold"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Form Thông tin học viên */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-black uppercase tracking-wider text-slate-700 block">
                  Thông tin học viên đăng ký:
                </label>
                <span className="text-[10px] text-slate-400 font-bold">* Bắt buộc điền</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <span className="text-[11px] font-bold text-slate-600">Họ và tên học viên chính *</span>
                  <div className="relative">
                    <User className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      required
                      value={studentName}
                      onChange={e => setStudentName(e.target.value)}
                      placeholder="Nguyễn Văn A"
                      className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:bg-white focus:border-[#007c76] outline-none"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <span className="text-[11px] font-bold text-slate-600">Số điện thoại / Zalo *</span>
                  <div className="relative">
                    <Phone className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="tel"
                      required
                      value={phone}
                      onChange={e => setPhone(e.target.value)}
                      placeholder="0912 345 678"
                      className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:bg-white focus:border-[#007c76] outline-none font-mono"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <span className="text-[11px] font-bold text-slate-600">Email nhận link Zoom &amp; tài liệu</span>
                  <div className="relative">
                    <Mail className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="email"
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      placeholder="hocvien@email.com"
                      className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:bg-white focus:border-[#007c76] outline-none"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <span className="text-[11px] font-bold text-slate-600">Tên Doanh nghiệp / Cơ sở</span>
                  <div className="relative">
                    <Building2 className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      value={companyName}
                      onChange={e => setCompanyName(e.target.value)}
                      placeholder="Công ty F&amp;B / Cơ sở kinh doanh"
                      className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:bg-white focus:border-[#007c76] outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* Thêm ô danh sách học viên bổ sung nếu đăng ký > 1 người */}
              {participantCount > 1 && (
                <div className="space-y-1 pt-1 animate-fade-in">
                  <span className="text-[11px] font-bold text-slate-600">
                    Họ tên {participantCount - 1} học viên bổ sung (Mỗi học viên 1 dòng):
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
                <span className="text-[11px] font-bold text-slate-600">Ghi chú / Yêu cầu đặc biệt (nếu có)</span>
                <input
                  type="text"
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  placeholder="VD: Cần xuất hóa đơn VAT / Cần hỗ trợ thi sớm..."
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:bg-white focus:border-[#007c76] outline-none"
                />
              </div>
            </div>

            {/* Total Fee & Submit Button */}
            <div className="pt-2 border-t border-slate-200 space-y-3">
              <div className="flex items-center justify-between text-xs sm:text-sm">
                <span className="font-bold text-slate-600 uppercase">Tổng học phí thanh toán:</span>
                <span className="font-black text-emerald-700 text-lg sm:text-xl font-mono">
                  {formattedTotalPrice}
                </span>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-4 bg-[#007c76] hover:bg-[#005c56] text-white font-black text-xs uppercase tracking-widest rounded-xl transition shadow-lg shadow-[#007c76]/20 cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2"
              >
                <CheckCircle2 className="w-4.5 h-4.5 text-teal-200" />
                <span>{isSubmitting ? 'Đang khởi tạo hồ sơ...' : `Xác Nhận Đăng Ký (${formattedTotalPrice})`}</span>
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

export default TrainingRegistrationModal;
