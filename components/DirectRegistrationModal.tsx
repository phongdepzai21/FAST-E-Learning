import React, { useState } from 'react';
import { db } from '../firebase';
import { collection, doc, setDoc } from 'firebase/firestore';
import { useToast } from '../contexts/ToastContext';
import { DirectRegistration } from '../types';
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
  Clock
} from 'lucide-react';

interface DirectRegistrationModalProps {
  isOpen: boolean;
  onClose: () => void;
  courseTitle?: string;
  price?: string;
  defaultStartDate?: string;
}

export const UPCOMING_START_DATES = [
  '15/11/2026 - Tối Chủ Nhật (19:30 qua Zoom)',
  '22/11/2026 - Sáng Chủ Nhật (08:30 Trực tiếp tại Hội trường)',
  '29/11/2026 - Tối Chủ Nhật (19:30 qua Zoom)',
  '06/12/2026 - Tối Chủ Nhật (19:30 qua Zoom)',
  'Lịch theo yêu cầu riêng của cơ sở / doanh nghiệp'
];

export const DirectRegistrationModal: React.FC<DirectRegistrationModalProps> = ({
  isOpen,
  onClose,
  courseTitle = 'Khóa Đào Tạo An Toàn Vệ Sinh Thực Phẩm (Trực Tiếp / Zoom)',
  price = '199.000đ',
  defaultStartDate = UPCOMING_START_DATES[0]
}) => {
  const toast = useToast();

  const [studentName, setStudentName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [trainingType, setTrainingType] = useState<'zoom' | 'direct'>('zoom');
  const [startDate, setStartDate] = useState(defaultStartDate);
  const [customStartDate, setCustomStartDate] = useState('');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [createdReg, setCreatedReg] = useState<DirectRegistration | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!studentName.trim()) {
      toast.error('Vui lòng nhập họ và tên học viên!');
      return;
    }
    if (!phone.trim()) {
      toast.error('Vui lòng nhập số điện thoại để nhận thông báo lớp!');
      return;
    }
    if (!email.trim()) {
      toast.error('Vui lòng nhập email nhận tài liệu và phòng Zoom!');
      return;
    }

    setIsSubmitting(true);
    const regId = `direct-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const finalStartDate = startDate === 'Lịch theo yêu cầu riêng của cơ sở / doanh nghiệp' && customStartDate.trim()
      ? customStartDate.trim()
      : startDate;

    const regPayload: DirectRegistration = {
      id: regId,
      studentName: studentName.trim(),
      studentEmail: email.toLowerCase().trim(),
      phone: phone.trim(),
      companyName: companyName.trim() || undefined,
      courseId: 'attp-truc-tiep',
      courseTitle,
      price,
      trainingType,
      startDate: finalStartDate,
      zoomLink: trainingType === 'zoom' ? 'https://zoom.us/j/84920268888' : undefined,
      zoomMeetingId: trainingType === 'zoom' ? '849 2026 8888' : undefined,
      zoomPasscode: trainingType === 'zoom' ? '2FAST2026' : undefined,
      registeredAt: new Date().toISOString(),
      status: 'pending',
      notes: notes.trim() || undefined
    };

    try {
      // 1. Save to Firestore direct_course_registrations & course_registrations
      await Promise.all([
        setDoc(doc(db, 'direct_course_registrations', regId), regPayload, { merge: true }),
        setDoc(doc(db, 'course_registrations', regId), {
          ...regPayload,
          type: 'DIRECT_TRAINING_199K'
        }, { merge: true })
      ]);

      // 2. Push to server endpoint
      try {
        await fetch('/api/direct-registrations', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(regPayload)
        });
      } catch (err) {
        console.warn('Server sync note:', err);
      }

      setCreatedReg(regPayload);
      setIsSuccess(true);
      toast.success('Đăng ký khóa học thành công! Cán bộ phụ trách sẽ liên hệ ngay.');
    } catch (err: any) {
      console.error('Lỗi đăng ký:', err);
      toast.error(`Lỗi khi gửi đăng ký: ${err.message || 'Vui lòng thử lại'}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const cleanPhoneForTransfer = phone.replace(/[^\d]/g, '').slice(-6) || '199K';
  const qrTransferContent = `ATTP199K ${cleanPhoneForTransfer}`;
  const qrUrl = `https://img.vietqr.io/image/970422-0927002668-compact2.png?amount=199000&addInfo=${encodeURIComponent(qrTransferContent)}&accountName=CONG%20TY%20TNHH%20TIEU%20CHUAN%20CHAT%20LUONG%202FAST`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200 overflow-y-auto">
      <div className="relative w-full max-w-2xl bg-white rounded-3xl shadow-2xl border border-gray-150 overflow-hidden my-8">
        
        {/* Header */}
        <div className="bg-gradient-to-r from-[#007c76] to-[#005f5b] p-6 text-white relative">
          <button
            onClick={onClose}
            className="absolute top-5 right-5 p-2 rounded-full bg-white/10 hover:bg-white/20 transition-all text-white cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
          
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-amber-400 text-slate-900 rounded-full text-xs font-black uppercase tracking-wider mb-2">
            <Sparkles className="w-3.5 h-3.5" /> Khóa Đào Tạo Trực Tiếp & Online Zoom
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-white leading-snug">
            Đăng Ký Khóa Đào Tạo An Toàn Vệ Sinh Thực Phẩm
          </h2>
          <div className="flex items-center gap-3 mt-2 text-teal-100 text-xs sm:text-sm font-semibold">
            <span>Học phí ưu đãi đặc biệt:</span>
            <span className="text-lg sm:text-xl font-black text-amber-300">{price}</span>
            <span className="line-through text-teal-300 text-xs">499.000đ</span>
            <span className="px-2 py-0.5 rounded bg-emerald-500/30 text-emerald-200 text-[10px] font-bold">Tiết kiệm 60%</span>
          </div>
        </div>

        {/* Modal Content */}
        <div className="p-6 sm:p-8 max-h-[80vh] overflow-y-auto custom-scrollbar">
          {isSuccess && createdReg ? (
            <div className="space-y-6 text-center py-4">
              <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto shadow-inner">
                <CheckCircle2 className="w-10 h-10" />
              </div>
              <div>
                <h3 className="text-xl font-black text-gray-800">
                  Đăng Ký Khóa Học Thành Công!
                </h3>
                <p className="text-xs sm:text-sm text-gray-500 mt-1 max-w-md mx-auto">
                  Chào mừng <strong>{createdReg.studentName}</strong>! FAST đã ghi nhận thông tin đăng ký của bạn cho lớp <strong>{createdReg.startDate}</strong>.
                </p>
              </div>

              {/* Info Box */}
              <div className="bg-teal-50/60 p-5 rounded-2xl border border-teal-200 text-left space-y-3">
                <div className="flex items-center justify-between text-xs pb-2 border-b border-teal-200/60">
                  <span className="text-gray-500 font-bold uppercase tracking-wider">Mã đăng ký:</span>
                  <span className="font-mono font-black text-[#007c76]">{createdReg.id}</span>
                </div>
                <div className="flex items-center justify-between text-xs pb-2 border-b border-teal-200/60">
                  <span className="text-gray-500 font-bold uppercase tracking-wider">Hình thức:</span>
                  <span className="font-bold text-gray-800 flex items-center gap-1.5">
                    {createdReg.trainingType === 'zoom' ? (
                      <>
                        <Video className="w-3.5 h-3.5 text-blue-600" /> Trực tuyến qua phòng học Zoom
                      </>
                    ) : (
                      <>
                        <MapPin className="w-3.5 h-3.5 text-emerald-600" /> Trực tiếp tại Hội trường Trung tâm
                      </>
                    )}
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs pb-2 border-b border-teal-200/60">
                  <span className="text-gray-500 font-bold uppercase tracking-wider">Lịch khai giảng:</span>
                  <span className="font-bold text-gray-800">{createdReg.startDate}</span>
                </div>

                {createdReg.trainingType === 'zoom' && (
                  <div className="p-3 bg-white rounded-xl border border-teal-200 space-y-1.5">
                    <p className="text-[11px] font-black text-teal-800 uppercase tracking-wide flex items-center gap-1">
                      <Video className="w-3.5 h-3.5 text-[#007c76]" /> Thông tin phòng học Zoom:
                    </p>
                    <p className="text-xs text-gray-700">
                      ID Cuộc họp: <strong className="font-mono text-[#007c76]">{createdReg.zoomMeetingId}</strong>
                    </p>
                    <p className="text-xs text-gray-700">
                      Mật mã (Passcode): <strong className="font-mono text-[#007c76]">{createdReg.zoomPasscode}</strong>
                    </p>
                    <div className="pt-1">
                      <button
                        type="button"
                        onClick={() => {
                          navigator.clipboard.writeText(`Zoom ID: ${createdReg.zoomMeetingId} | Passcode: ${createdReg.zoomPasscode} | Link: ${createdReg.zoomLink}`);
                          toast.success('Đã sao chép thông tin phòng Zoom!');
                        }}
                        className="text-[11px] text-[#007c76] hover:underline font-bold inline-flex items-center gap-1 cursor-pointer"
                      >
                        <Copy className="w-3 h-3" /> Sao chép thông tin phòng Zoom
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* VietQR Quick Payment */}
              <div className="bg-gray-50 p-5 rounded-2xl border border-gray-200 text-center space-y-3">
                <p className="text-xs font-black uppercase tracking-wider text-gray-700 flex items-center justify-center gap-1.5">
                  <QrCode className="w-4 h-4 text-[#007c76]" /> Quét mã VietQR chuyển khoản học phí ({price})
                </p>
                <div className="w-44 h-44 mx-auto bg-white p-2 rounded-xl border border-gray-200 shadow-sm flex items-center justify-center">
                  <img src={qrUrl} alt="VietQR" className="w-full h-full object-contain" />
                </div>
                <p className="text-[11px] text-gray-500">
                  Nội dung chuyển khoản: <span className="font-mono font-bold text-gray-800 bg-gray-200 px-2 py-0.5 rounded">{qrTransferContent}</span>
                </p>
              </div>

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 py-3 bg-[#007c76] hover:bg-[#005f5b] text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all shadow-md cursor-pointer"
                >
                  Hoàn tất & Đóng
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              
              {/* Option 1: Chọn hình thức học */}
              <div className="space-y-2">
                <label className="text-xs font-black text-gray-700 uppercase tracking-wider flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-[#007c76]" /> Chọn hình thức học:
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <label
                    onClick={() => setTrainingType('zoom')}
                    className={`p-4 rounded-2xl border-2 flex items-center gap-3 cursor-pointer transition-all ${
                      trainingType === 'zoom'
                        ? 'border-[#007c76] bg-teal-50/50 text-[#007c76] shadow-sm'
                        : 'border-gray-200 hover:border-gray-300 text-gray-600'
                    }`}
                  >
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                      trainingType === 'zoom' ? 'bg-[#007c76] text-white' : 'bg-gray-100 text-gray-500'
                    }`}>
                      <Video className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-xs font-black">Học Online Qua Zoom</p>
                      <p className="text-[11px] text-gray-400">Tương tác trực tiếp cùng chuyên gia</p>
                    </div>
                  </label>

                  <label
                    onClick={() => setTrainingType('direct')}
                    className={`p-4 rounded-2xl border-2 flex items-center gap-3 cursor-pointer transition-all ${
                      trainingType === 'direct'
                        ? 'border-[#007c76] bg-teal-50/50 text-[#007c76] shadow-sm'
                        : 'border-gray-200 hover:border-gray-300 text-gray-600'
                    }`}
                  >
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                      trainingType === 'direct' ? 'bg-[#007c76] text-white' : 'bg-gray-100 text-gray-500'
                    }`}>
                      <MapPin className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-xs font-black">Học Trực Tiếp Tại Cơ Sở</p>
                      <p className="text-[11px] text-gray-400">Thực hành hiện trường & nhận bằng</p>
                    </div>
                  </label>
                </div>
              </div>

              {/* Option 2: Chọn ngày bắt đầu / Lịch khai giảng */}
              <div className="space-y-1.5">
                <label className="text-xs font-black text-gray-700 uppercase tracking-wider flex items-center gap-1.5">
                  <Calendar className="w-4 h-4 text-[#007c76]" /> Chọn Ngày Bắt Đầu / Lịch Khai Giảng:
                </label>
                <select
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-xs sm:text-sm font-semibold text-gray-800 focus:outline-none focus:bg-white focus:border-[#007c76]"
                >
                  {UPCOMING_START_DATES.map((date, idx) => (
                    <option key={idx} value={date}>{date}</option>
                  ))}
                </select>
                {startDate === 'Lịch theo yêu cầu riêng của cơ sở / doanh nghiệp' && (
                  <input
                    type="text"
                    placeholder="Nhập ngày dự kiến bạn mong muốn bắt đầu (VD: 18/11/2026)..."
                    value={customStartDate}
                    onChange={(e) => setCustomStartDate(e.target.value)}
                    className="w-full mt-2 px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs text-gray-800 focus:outline-none focus:bg-white focus:border-[#007c76]"
                  />
                )}
              </div>

              {/* Student details form */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-600 flex items-center gap-1">
                    <User className="w-3.5 h-3.5 text-gray-400" /> Họ và tên học viên *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Nguyễn Văn A"
                    value={studentName}
                    onChange={(e) => setStudentName(e.target.value)}
                    className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs sm:text-sm font-semibold text-gray-800 focus:outline-none focus:bg-white focus:border-[#007c76]"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-600 flex items-center gap-1">
                    <Phone className="w-3.5 h-3.5 text-gray-400" /> Số điện thoại / Zalo *
                  </label>
                  <input
                    type="tel"
                    required
                    placeholder="0912 345 678"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs sm:text-sm font-semibold text-gray-800 focus:outline-none focus:bg-white focus:border-[#007c76]"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-600 flex items-center gap-1">
                    <Mail className="w-3.5 h-3.5 text-gray-400" /> Email nhận link Zoom & tài liệu *
                  </label>
                  <input
                    type="email"
                    required
                    placeholder="hocvien@gmail.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs sm:text-sm font-semibold text-gray-800 focus:outline-none focus:bg-white focus:border-[#007c76]"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-600 flex items-center gap-1">
                    <Building className="w-3.5 h-3.5 text-gray-400" /> Tên cơ sở / Nhà hàng / Doanh nghiệp
                  </label>
                  <input
                    type="text"
                    placeholder="Cơ sở kinh doanh thực phẩm ABC"
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs sm:text-sm font-semibold text-gray-800 focus:outline-none focus:bg-white focus:border-[#007c76]"
                  />
                </div>
              </div>

              {/* Notes */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-600">Ghi chú hoặc câu hỏi muốn chuyên gia giải đáp:</label>
                <textarea
                  rows={2}
                  placeholder="Nhập yêu cầu đào tạo cụ thể hoặc số lượng học viên nếu đăng ký nhóm..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs text-gray-800 focus:outline-none focus:bg-white focus:border-[#007c76]"
                />
              </div>

              {/* Action Buttons */}
              <div className="pt-2 flex items-center justify-end gap-3 border-t border-gray-150">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-5 py-2.5 rounded-xl border border-gray-200 text-xs font-bold text-gray-600 hover:bg-gray-50 cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-6 py-2.5 rounded-xl bg-[#007c76] hover:bg-[#005f5b] text-white text-xs font-black uppercase tracking-wider shadow-md shadow-[#007c76]/20 transition-all disabled:opacity-50 cursor-pointer flex items-center gap-2"
                >
                  {isSubmitting ? 'Đang gửi đăng ký...' : `Xác Nhận Đăng Ký (${price})`}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
