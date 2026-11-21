import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { db, auth } from '../firebase';
import { doc, setDoc } from 'firebase/firestore';
import { useToast } from '../contexts/ToastContext';
import { DirectRegistration } from '../types';
import { getVietQrUrl } from '../utils/qrService';
import { getFastSessionUser } from '../utils/sessionAuth';
import { addTrainingLinkNotification } from '../utils/courseNotificationService';
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
  Landmark,
  KeyRound,
  LogIn,
  Bell
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
  const navigate = useNavigate();

  const [studentName, setStudentName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [trainingType, setTrainingType] = useState<'zoom' | 'direct'>('zoom');
  const [startDate, setStartDate] = useState(defaultStartDate);
  const [customStartDate, setCustomStartDate] = useState('');
  const [notes, setNotes] = useState('');
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [createdReg, setCreatedReg] = useState<DirectRegistration | null>(null);
  const [accountProvisioned, setAccountProvisioned] = useState<{
    email: string;
    autoCreated: boolean;
    alreadyExists: boolean;
  } | null>(null);

  if (!isOpen) return null;

  const isUserLoggedIn = !!(auth.currentUser || getFastSessionUser());

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
    if (!acceptedTerms) {
      toast.error('Vui lòng đồng ý với Điều khoản sử dụng trước khi đăng ký!');
      return;
    }

    setIsSubmitting(true);
    const regId = `direct-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const finalStartDate = startDate === 'Lịch theo yêu cầu riêng của cơ sở / doanh nghiệp' && customStartDate.trim()
      ? customStartDate.trim()
      : startDate;
    const cleanPhoneForOrder = phone.replace(/[^\d]/g, '').slice(-6) || '199000';
    const fastMemoCode = `FAST199K${cleanPhoneForOrder}`;

    const cleanEmail = email.toLowerCase().trim();
    const resolvedLink = trainingType === 'zoom'
      ? 'https://zoom.us/j/84920268888'
      : 'https://maps.google.com/?q=18+Nguyen+Co+Thach+Nam+Tu+Liem+Ha+Noi';
    const trainingTypeLabel = trainingType === 'zoom' ? 'Online qua Zoom HD' : 'Trực tiếp tại Hội trường';
    const nowIso = new Date().toISOString();

    const regPayload: DirectRegistration & Record<string, any> = {
      id: regId,
      studentName: studentName.trim(),
      studentEmail: cleanEmail,
      email: cleanEmail,
      userEmail: cleanEmail,
      phone: phone.trim(),
      companyName: companyName.trim() || undefined,
      courseId: 'attp-truc-tiep',
      courseTitle,
      price,
      totalPrice: price,
      trainingType,
      trainingTypeLabel,
      startDate: finalStartDate,
      meetingLink: resolvedLink,
      zoomLink: trainingType === 'zoom' ? 'https://zoom.us/j/84920268888' : undefined,
      zoomMeetingId: trainingType === 'zoom' ? '849 2026 8888' : undefined,
      zoomPasscode: trainingType === 'zoom' ? '2FAST2026' : undefined,
      registeredAt: nowIso,
      status: 'pending',
      paymentStatus: 'PENDING',
      paymentCode: fastMemoCode,
      paymentMemo: fastMemoCode,
      paymentBank: 'ACB',
      paymentAccountNo: '0989499568',
      notes: notes.trim() || undefined
    };

    const venueAddress = trainingType === 'direct'
      ? 'Số 18 Nguyễn Cơ Thạch, Nam Từ Liêm, Hà Nội (Hội trường đào tạo FAST)'
      : 'Phòng học trực tuyến Zoom HD';
    const shortRegCode = regId.replace(/[^a-zA-Z0-9]/g, '').slice(-8).toUpperCase();
    const isOfflineMode = trainingType === 'direct';
    const checkInTime = isOfflineMode
      ? 'Có mặt trước giờ khai giảng 15–30 phút để check-in điểm danh & nhận tài liệu'
      : 'Mở link Zoom trước giờ khai giảng 15 phút để kiểm tra âm thanh & điểm danh';
    const checklist = isOfflineMode
      ? [
          'Có mặt tại hội trường trước 15–30 phút để làm thủ tục điểm danh vào lớp',
          'Mang theo CCCD/CMND (bản gốc hoặc ảnh VNeID) để đối chiếu cấp chứng nhận',
          `Cung cấp mã hồ sơ #${shortRegCode} hoặc email đăng ký tại quầy đón tiếp`,
          'Chuẩn bị sổ tay ghi chép và hồ sơ mẫu cơ sở (nếu cần giảng viên góp ý)'
        ]
      : [
          'Tham gia phòng Zoom trước 15 phút để kiểm tra loa, micro và đường truyền',
          'Đổi tên hiển thị Zoom theo cú pháp: Họ và tên - Số điện thoại',
          'Chuẩn bị sổ tay ghi chép và tài liệu thực hành trong quá trình học'
        ];

    const notifId = `training_${regId}`;
    const notificationPayload = {
      id: notifId,
      title: isOfflineMode
        ? `Chuẩn bị vào học Offline: ${courseTitle}`
        : `Chuẩn bị vào học Zoom: ${courseTitle}`,
      message: isOfflineMode
        ? `Khóa học trực tiếp tại hội trường đã sẵn sàng (${finalStartDate}). Địa điểm: ${venueAddress}. Vui lòng có mặt trước 15–30 phút, mang theo CCCD/CMND và mã hồ sơ #${shortRegCode} để điểm danh.`
        : `Phòng học Zoom HD cho khóa "${courseTitle}" đã sẵn sàng (${finalStartDate}). Vui lòng vào lớp trước 15 phút và đổi tên theo Họ tên - SĐT để điểm danh.`,
      type: 'training_link',
      courseId: 'attp-truc-tiep',
      courseTitle,
      registrationId: regId,
      link: resolvedLink,
      startDate: finalStartDate,
      venueAddress: isOfflineMode ? venueAddress : '',
      trainingType,
      trainingTypeLabel,
      checkInTime,
      checklist,
      userEmail: cleanEmail,
      isRead: false,
      createdAt: nowIso
    };

    try {
      // 0. Create SePay FAST order for automatic reconciliation
      await fetch('/api/create-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          courseId: 'attp-truc-tiep',
          courseTitle,
          amount: 199000,
          email: cleanEmail,
          registrationId: regId,
          orderType: 'direct_training',
          studentName: studentName.trim(),
          phone: phone.trim(),
          requestedPaymentCode: fastMemoCode
        })
      }).catch(() => {});

      // 1. Save to Firestore direct_course_registrations & course_registrations & user notifications
      await Promise.all([
        setDoc(doc(db, 'direct_course_registrations', regId), regPayload, { merge: true }),
        setDoc(doc(db, 'course_registrations', regId), {
          ...regPayload,
          type: 'DIRECT_TRAINING_199K'
        }, { merge: true }),
        setDoc(doc(db, 'users', cleanEmail, 'notifications', notifId), notificationPayload, { merge: true })
      ]).catch(() => {});

      addTrainingLinkNotification({
        id: notifId,
        userEmail: cleanEmail,
        courseId: 'attp-truc-tiep',
        courseTitle,
        link: resolvedLink,
        registrationId: regId,
        startDate: finalStartDate,
        venueAddress: isOfflineMode ? venueAddress : undefined,
        trainingType,
        trainingTypeLabel,
        title: notificationPayload.title,
        message: notificationPayload.message,
        checkInTime,
        checklist
      });

      // 2. Push to server endpoint & auto-provision account
      let provisionedInfo: { email: string; autoCreated: boolean; alreadyExists: boolean } | null = null;
      try {
        const regRes = await fetch('/api/direct-registrations', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...regPayload, notification: notificationPayload })
        });
        if (regRes.ok) {
          const regJson = await regRes.json().catch(() => null);
          if (regJson?.accountProvisioned?.email) {
            provisionedInfo = regJson.accountProvisioned;
          }
        }
      } catch (err) {
        console.warn('Server sync note:', err);
      }

      if (!provisionedInfo && cleanEmail) {
        try {
          const provRes = await fetch('/api/auth/auto-provision-account', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              email: cleanEmail,
              fullName: studentName.trim(),
              phone: phone.trim(),
              registration: regPayload,
              notification: notificationPayload
            })
          });
          if (provRes.ok) {
            const provJson = await provRes.json().catch(() => null);
            if (provJson?.email) {
              provisionedInfo = {
                email: provJson.email,
                autoCreated: !!provJson.autoCreated,
                alreadyExists: !!provJson.alreadyExists
              };
            }
          }
        } catch {}
      }

      setAccountProvisioned(
        provisionedInfo || {
          email: cleanEmail,
          autoCreated: !isUserLoggedIn,
          alreadyExists: isUserLoggedIn
        }
      );
      setCreatedReg(regPayload);
      setIsSuccess(true);
      toast.success('Đăng ký thành công! Tài khoản và lịch trình học đã sẵn sàng.');
    } catch (err: any) {
      console.error('Lỗi đăng ký:', err);
      toast.error(`Lỗi khi gửi đăng ký: ${err.message || 'Vui lòng thử lại'}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const cleanPhoneForTransfer = phone.replace(/[^\d]/g, '').slice(-6) || '199000';
  const qrTransferContent = `FAST199K${cleanPhoneForTransfer}`;
  const bankAccountNo = '0989499568';
  const bankAccountName = 'CONG TY TNHH TU VAN FAST';
  const qrUrl = getVietQrUrl({
    bankId: 'ACB',
    accountNo: bankAccountNo,
    accountName: bankAccountName,
    amount: 199000,
    memo: qrTransferContent,
    template: 'compact2'
  });

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
            <div className="space-y-6 text-center py-2">
              <div className="w-14 h-14 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto shadow-inner">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <div>
                <h3 className="text-xl font-black text-gray-800">
                  Đăng Ký Khóa Học Thành Công!
                </h3>
                <p className="text-xs sm:text-sm text-gray-600 mt-1 max-w-md mx-auto">
                  Chào mừng <strong>{createdReg.studentName}</strong>! Hệ thống đã ghi nhận lịch trình <strong>{createdReg.startDate}</strong> cho bạn.
                </p>
              </div>

              {/* Auto-provisioned Account & OTP CTA */}
              {(() => {
                const provisionedEmail = accountProvisioned?.email || (createdReg as any).studentEmail || email.toLowerCase().trim();
                const otpSetupUrl = `/account?otpSetup=1&email=${encodeURIComponent(provisionedEmail)}&name=${encodeURIComponent(createdReg.studentName)}&regId=${encodeURIComponent(createdReg.id)}`;
                if (isUserLoggedIn) return null;
                return (
                  <div className="p-4 rounded-2xl bg-teal-50 border border-teal-200 text-left flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="space-y-1 text-xs text-slate-700">
                      <p className="font-bold text-slate-900 flex items-center gap-1.5">
                        <KeyRound className="w-4 h-4 text-[#007c76] shrink-0" />
                        <span>
                          {accountProvisioned?.autoCreated === false
                            ? 'Thông báo lịch học đã gửi vào tài khoản của bạn'
                            : 'Tài khoản học viên đã được tạo sẵn & gửi về email'}
                        </span>
                      </p>
                      <p className="text-slate-600">
                        Email: <strong className="text-[#007c76]">{provisionedEmail}</strong>. Bấm đăng nhập OTP và thêm mật khẩu để xem sẵn thông báo lịch trình học.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        onClose();
                        navigate(otpSetupUrl, {
                          state: {
                            otpAccountSetup: true,
                            email: provisionedEmail,
                            name: createdReg.studentName,
                            registrationId: createdReg.id
                          }
                        });
                      }}
                      className="px-4 py-2.5 rounded-xl bg-[#007c76] hover:bg-[#00625d] text-white text-xs font-bold transition-colors cursor-pointer flex items-center justify-center gap-1.5 shrink-0"
                    >
                      <LogIn className="w-3.5 h-3.5" />
                      <span>Đăng nhập OTP &amp; Thêm mật khẩu</span>
                    </button>
                  </div>
                );
              })()}

              {/* Info Box (no copy buttons) */}
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
                <div className="flex items-center justify-between text-xs">
                  <span className="text-gray-500 font-bold uppercase tracking-wider">Lịch khai giảng:</span>
                  <span className="font-bold text-gray-800 text-right">{createdReg.startDate}</span>
                </div>
              </div>

              {/* Read-Only VietQR ACB Payment Block (no copy, no download QR, no check tx) */}
              <div
                className="bg-slate-50 rounded-2xl border border-slate-200 overflow-hidden text-left select-none"
                onCopy={(e) => e.preventDefault()}
                onContextMenu={(e) => e.preventDefault()}
              >
                <div className="px-4 py-3 bg-white border-b border-slate-200 flex items-center justify-between text-xs">
                  <span className="font-bold text-slate-800 flex items-center gap-1.5">
                    <Landmark className="w-4 h-4 text-[#007c76]" />
                    <span>Thông tin thanh toán ACB (chỉ xem)</span>
                  </span>
                  <span className="font-bold text-[#007c76] tabular-nums">{price}</span>
                </div>

                <div className="p-4 grid grid-cols-1 sm:grid-cols-12 gap-4 items-center">
                  <div className="sm:col-span-5 flex flex-col items-center">
                    <div className="w-40 h-40 bg-white p-2 rounded-xl border border-slate-200 flex items-center justify-center">
                      <img
                        src={qrUrl}
                        alt="VietQR ACB 0989499568"
                        referrerPolicy="no-referrer"
                        draggable={false}
                        onError={(e) => {
                          (e.currentTarget as HTMLImageElement).style.display = 'none';
                        }}
                        className="w-full h-full object-contain pointer-events-none"
                      />
                    </div>
                    <span className="mt-2 inline-flex items-center gap-1 text-[11px] text-slate-500 font-medium">
                      <QrCode className="w-3.5 h-3.5 text-[#007c76]" />
                      Quét QR bằng App ngân hàng
                    </span>
                  </div>

                  <div className="sm:col-span-7 bg-white rounded-xl border border-slate-200 divide-y divide-slate-100 text-xs overflow-hidden">
                    <div className="px-3.5 py-2.5 flex items-center justify-between gap-2">
                      <span className="text-slate-500">Ngân hàng</span>
                      <span className="font-semibold text-slate-900">ACB (Á Châu)</span>
                    </div>
                    <div className="px-3.5 py-2.5 flex items-center justify-between gap-2">
                      <span className="text-slate-500">Chủ TK</span>
                      <span className="font-semibold text-slate-900">{bankAccountName}</span>
                    </div>
                    <div className="px-3.5 py-2.5 flex items-center justify-between gap-2">
                      <span className="text-slate-500">Số tài khoản ACB</span>
                      <span className="font-mono font-bold text-slate-900 text-sm tabular-nums">{bankAccountNo}</span>
                    </div>
                    <div className="px-3.5 py-2.5 flex items-center justify-between gap-2">
                      <span className="text-slate-500">Số tiền</span>
                      <span className="font-bold text-[#007c76] text-sm tabular-nums">{price}</span>
                    </div>
                    <div className="px-3.5 py-3 bg-teal-50/70 flex items-center justify-between gap-2">
                      <span className="text-[#007c76] font-semibold">Nội dung</span>
                      <span className="font-mono font-bold text-slate-900 text-sm">{qrTransferContent}</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-3">
                <button
                  type="button"
                  onClick={() => {
                    const provisionedEmail = accountProvisioned?.email || (createdReg as any).studentEmail || email.toLowerCase().trim();
                    const otpSetupUrl = `/account?otpSetup=1&email=${encodeURIComponent(provisionedEmail)}&name=${encodeURIComponent(createdReg.studentName)}&regId=${encodeURIComponent(createdReg.id)}`;
                    onClose();
                    if (isUserLoggedIn) {
                      navigate('/account');
                    } else {
                      navigate(otpSetupUrl, {
                        state: {
                          otpAccountSetup: true,
                          email: provisionedEmail,
                          name: createdReg.studentName,
                          registrationId: createdReg.id
                        }
                      });
                    }
                  }}
                  className="flex-1 py-3 px-4 bg-[#007c76] hover:bg-[#005f5b] text-white rounded-xl text-xs font-bold transition-all shadow-md cursor-pointer flex items-center justify-center gap-2"
                >
                  {isUserLoggedIn ? (
                    <>
                      <Bell className="w-4 h-4" />
                      <span>Xem thông báo &amp; lịch học</span>
                    </>
                  ) : (
                    <>
                      <LogIn className="w-4 h-4" />
                      <span>Đăng nhập OTP &amp; Thêm mật khẩu</span>
                    </>
                  )}
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="py-3 px-5 border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-bold transition-all cursor-pointer"
                >
                  Đóng
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

              {/* Terms of Service acceptance */}
              <div className={`p-3 rounded-xl border transition-colors ${acceptedTerms ? 'bg-teal-50/50 border-teal-200' : 'bg-gray-50 border-gray-200'}`}>
                <label className="flex items-start gap-2.5 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={acceptedTerms}
                    onChange={(e) => setAcceptedTerms(e.target.checked)}
                    className="mt-0.5 w-4 h-4 rounded border-gray-300 text-[#007c76] focus:ring-[#007c76] shrink-0 cursor-pointer accent-[#007c76]"
                  />
                  <span className="text-xs font-semibold text-gray-700 leading-relaxed">
                    Tôi đã đọc và đồng ý với{' '}
                    <a
                      href="/dieu-khoan-su-dung"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[#007c76] font-extrabold underline hover:text-[#005f5b]"
                    >
                      Điều khoản sử dụng
                    </a>{' '}
                    &amp;{' '}
                    <a
                      href="/privacy-policy"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[#007c76] font-extrabold underline hover:text-[#005f5b]"
                    >
                      Chính sách bảo mật
                    </a>{' '}
                    của FAST E-Learning.
                  </span>
                </label>
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
                  disabled={isSubmitting || !acceptedTerms}
                  className="px-6 py-2.5 rounded-xl bg-[#007c76] hover:bg-[#005f5b] text-white text-xs font-black uppercase tracking-wider shadow-md shadow-[#007c76]/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer flex items-center gap-2"
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
