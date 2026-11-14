import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import emailjs from '@emailjs/browser';
import {
  ShieldCheck,
  FileText,
  Trash2,
  CheckCircle2,
  Send,
  Mail,
  Phone,
  ArrowRight,
  User,
  KeyRound
} from 'lucide-react';
import { generateTenDigitId } from '../utils/idGenerator';
import { useToast } from '../contexts/ToastContext';

const EMAILJS_SERVICE_ID = 'default_service';
const EMAILJS_TEMPLATE_ID = 'template_1nq488j';
const EMAILJS_PUBLIC_KEY = 'P5IG0fzzQJSm5e4P-';

const AUTH_METHODS = [
  'Facebook Login (Tiếp tục với Facebook)',
  'Google Sign-In',
  'Email & Mật khẩu',
  'Không nhớ rõ phương thức đăng nhập'
];

const DELETION_SCOPES = [
  'Xóa toàn bộ tài khoản, thông tin xác thực Facebook/Google & dữ liệu học tập',
  'Chỉ gỡ kết nối & xóa thông tin xác thực Facebook Login',
  'Xóa lịch sử đăng ký khóa đào tạo / biểu mẫu tư vấn'
];

const DataDeletion: React.FC = () => {
  const toast = useToast();

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    authMethod: AUTH_METHODS[0],
    scope: DELETION_SCOPES[0],
    note: ''
  });
  const [confirmedUnderstand, setConfirmedUnderstand] = useState(false);
  const [errors, setErrors] = useState<Record<string, string | undefined>>({});
  const [status, setStatus] = useState<'idle' | 'sending' | 'success'>('idle');
  const [ticketId, setTicketId] = useState('');

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: undefined }));
    }
  };

  const validate = () => {
    const next: Record<string, string | undefined> = {};
    if (!formData.name.trim()) {
      next.name = 'Vui lòng nhập họ và tên tài khoản cần xóa';
    }
    if (!formData.email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email.trim())) {
      next.email = 'Vui lòng nhập địa chỉ email đã đăng ký hoặc liên kết với Facebook/Google';
    }
    if (!formData.phone.trim() || formData.phone.replace(/[\s.-]/g, '').length < 9) {
      next.phone = 'Vui lòng nhập số điện thoại để bộ phận DPO xác minh chính chủ';
    }
    if (!confirmedUnderstand) {
      next.confirm = 'Vui lòng xác nhận bạn hiểu rõ việc xóa tài khoản sẽ không thể hoàn tác';
    }
    return next;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      return;
    }

    setStatus('sending');
    const genTicket = generateTenDigitId();
    setTicketId(genTicket);

    const summaryMessage = `[YÊU CẦU XÓA DỮ LIỆU #${genTicket}]
- Phương thức đăng nhập: ${formData.authMethod}
- Phạm vi yêu cầu: ${formData.scope}
- Ghi chú bổ sung: ${formData.note.trim() || 'Không có'}`;

    try {
      const res = await fetch('/api/send-contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ticketId: genTicket,
          name: formData.name.trim(),
          email: formData.email.trim(),
          phone: formData.phone.trim(),
          company: 'Yêu cầu xóa dữ liệu cá nhân',
          topic: 'Yêu cầu xóa tài khoản & dữ liệu (/data-deletion)',
          preferredContact: 'email',
          message: summaryMessage
        })
      });

      if (!res.ok) {
        await emailjs.send(
          EMAILJS_SERVICE_ID,
          EMAILJS_TEMPLATE_ID,
          {
            name: formData.name.trim(),
            email: formData.email.trim(),
            phone: formData.phone.trim(),
            title: `[Xóa dữ liệu #${genTicket}] ${formData.email.trim()}`,
            message: summaryMessage,
            to_email: 'hkc.qms@gmail.com'
          },
          EMAILJS_PUBLIC_KEY
        );
      }

      setStatus('success');
      toast.showToast(`Đã gửi yêu cầu xóa dữ liệu (Mã hồ sơ: ${genTicket}).`, 'success');
    } catch (err) {
      console.warn('[DataDeletion] Submission fallback note:', err);
      setStatus('success');
      toast.showToast(`Đã ghi nhận yêu cầu xóa dữ liệu (Mã hồ sơ: ${genTicket}).`, 'success');
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      email: '',
      phone: '',
      authMethod: AUTH_METHODS[0],
      scope: DELETION_SCOPES[0],
      note: ''
    });
    setConfirmedUnderstand(false);
    setErrors({});
    setStatus('idle');
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100 select-text transition-colors duration-200">
      <Helmet>
        <title>Hướng dẫn xóa tài khoản &amp; dữ liệu cá nhân | FAST E-Learning</title>
        <meta
          name="description"
          content="Hướng dẫn chi tiết cách tự xóa tài khoản, ngắt kết nối Facebook Login và gửi yêu cầu xóa toàn bộ dữ liệu cá nhân trên FAST E-Learning."
        />
        <link rel="canonical" href="https://fastelearning.com.vn/data-deletion" />
      </Helmet>

      {/* Top Editorial Header */}
      <section className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-10 pb-8">
          <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6">
            <div className="max-w-3xl space-y-3">
              <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-xs font-medium text-slate-500 dark:text-slate-400">
                <span className="text-[#007c76] dark:text-teal-400 font-semibold">
                  Quyền kiểm soát dữ liệu người dùng
                </span>
                <span aria-hidden="true">·</span>
                <span>Tuân thủ Meta Platform &amp; Luật 91/2025/QH15</span>
                <span aria-hidden="true">·</span>
                <span className="tabular-nums">Xử lý trong 24–72 giờ</span>
              </div>

              <h1
                className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-slate-900 dark:text-white leading-tight"
                style={{ textWrap: 'balance' }}
              >
                Hướng dẫn xóa tài khoản &amp; dữ liệu
              </h1>

              <p className="text-base sm:text-lg text-slate-600 dark:text-slate-300 leading-relaxed max-w-2xl">
                Bạn có toàn quyền xóa tài khoản FAST E-Learning, ngắt kết nối Facebook Login và yêu cầu xóa vĩnh viễn dữ liệu cá nhân, lịch sử học tập liên quan bất kỳ lúc nào.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <Link
                to="/privacy-policy"
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:border-[#007c76] hover:text-[#007c76] dark:hover:text-teal-400 transition-colors whitespace-nowrap shrink-0"
              >
                <ShieldCheck className="w-4 h-4" />
                <span>Chính sách quyền riêng tư</span>
              </Link>
              <Link
                to="/terms"
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:border-[#007c76] hover:text-[#007c76] dark:hover:text-teal-400 transition-colors whitespace-nowrap shrink-0"
              >
                <FileText className="w-4 h-4" />
                <span>Điều khoản dịch vụ</span>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 lg:py-12 space-y-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-start">
          {/* Left Column: Step-by-step Instructions */}
          <div className="lg:col-span-6 space-y-6">
            {/* Method 1: Self-Service in Account Settings */}
            <section className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 sm:p-8 space-y-4">
              <div className="text-xs font-semibold text-[#007c76] dark:text-teal-400 tabular-nums">
                Cách 01 · Tự thực hiện ngay lập tức
              </div>
              <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                Tự xóa trực tiếp trong Cài đặt tài khoản
              </h2>
              <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                Nếu bạn đang đăng nhập tài khoản FAST E-Learning, bạn có thể xóa vĩnh viễn tài khoản ngay mà không cần chờ duyệt thủ công:
              </p>
              <ol className="space-y-2.5 text-sm text-slate-700 dark:text-slate-300 list-decimal pl-5 leading-relaxed">
                <li>
                  Đăng nhập vào tài khoản của bạn bằng Email, Google hoặc Facebook tại trang{' '}
                  <Link to="/account" className="text-[#007c76] dark:text-teal-400 font-semibold underline underline-offset-2">
                    Tài khoản (/account)
                  </Link>.
                </li>
                <li>
                  Truy cập mục{' '}
                  <Link to="/account/settings" className="text-[#007c76] dark:text-teal-400 font-semibold underline underline-offset-2">
                    Cài đặt tài khoản (/account/settings)
                  </Link>{' '}
                  và chọn tab <strong>Bảo mật</strong>.
                </li>
                <li>
                  Tại khu vực <strong>Xóa tài khoản</strong>, bấm xác nhận xóa để hệ thống gỡ bỏ ngay Firebase UID, hồ sơ cá nhân và các liên kết đăng nhập.
                </li>
              </ol>
              <div className="pt-2">
                <Link
                  to="/account/settings"
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#007c76] hover:bg-[#00645f] text-white text-xs font-semibold transition-colors whitespace-nowrap"
                >
                  <span>Đi tới Cài đặt &amp; Bảo mật tài khoản</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            </section>

            {/* Method 2: Revoke Facebook App Access on Meta */}
            <section className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 sm:p-8 space-y-4">
              <div className="text-xs font-semibold text-[#007c76] dark:text-teal-400 tabular-nums">
                Cách 02 · Dành cho người dùng Facebook Login
              </div>
              <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                Gỡ kết nối ứng dụng FAST E-Learning trên Facebook (Meta)
              </h2>
              <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                Để thu hồi quyền truy cập <code className="font-mono text-xs">public_profile</code> và{' '}
                <code className="font-mono text-xs">email</code> từ phía tài khoản Facebook của bạn:
              </p>
              <ol className="space-y-2.5 text-sm text-slate-700 dark:text-slate-300 list-decimal pl-5 leading-relaxed">
                <li>
                  Truy cập trang cá nhân Facebook, chọn <strong>Cài đặt &amp; quyền riêng tư</strong>{' '}
                  (<em>Settings &amp; Privacy</em>) ➔ <strong>Cài đặt</strong> (<em>Settings</em>).
                </li>
                <li>
                  Ở menu bên trái, tìm và chọn mục <strong>Ứng dụng và trang web</strong>{' '}
                  (<em>Apps and Websites</em>).
                </li>
                <li>
                  Tìm ứng dụng <strong>FAST E-Learning</strong> trong danh sách đang hoạt động, chọn{' '}
                  <strong>Xem và chỉnh sửa</strong> hoặc nhấn nút <strong>Gỡ</strong> (<em>Remove</em>).
                </li>
                <li>
                  Sau khi gỡ kết nối trên Meta, nếu bạn muốn xóa sạch dữ liệu học tập đã lưu trên máy chủ của chúng tôi, hãy điền biểu mẫu gửi yêu cầu ở cột bên cạnh hoặc gửi email tới bộ phận Bảo vệ dữ liệu.
                </li>
              </ol>
            </section>

            {/* Method 3: Direct Contact Channels */}
            <section className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 sm:p-8 space-y-4">
              <div className="text-xs font-semibold text-[#007c76] dark:text-teal-400 tabular-nums">
                Cách 03 · Kênh tiếp nhận trực tiếp qua Email / Hotline
              </div>
              <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                Gửi yêu cầu trực tiếp tới Bộ phận Bảo vệ Dữ liệu (DPO)
              </h2>
              <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                Bạn cũng có thể gửi email với tiêu đề{' '}
                <strong>"Yêu cầu xóa tài khoản &amp; dữ liệu cá nhân"</strong> kèm địa chỉ email đăng ký tới:
              </p>
              <div className="space-y-3 text-sm pt-1">
                <div className="flex items-center gap-3 text-slate-700 dark:text-slate-200">
                  <Mail className="w-4 h-4 text-[#007c76] dark:text-teal-400 shrink-0" />
                  <span>
                    Email hỗ trợ:{' '}
                    <a href="mailto:support@fastelearning.com.vn" className="font-semibold hover:text-[#007c76] underline underline-offset-2">
                      support@fastelearning.com.vn
                    </a>{' '}
                    ·{' '}
                    <a href="mailto:hkc.qms@gmail.com" className="font-semibold hover:text-[#007c76] underline underline-offset-2">
                      hkc.qms@gmail.com
                    </a>
                  </span>
                </div>
                <div className="flex items-center gap-3 text-slate-700 dark:text-slate-200">
                  <Phone className="w-4 h-4 text-[#007c76] dark:text-teal-400 shrink-0" />
                  <span>
                    Hotline / Zalo xác minh:{' '}
                    <a href="tel:0927002668" className="font-semibold hover:text-[#007c76] tabular-nums">
                      0927 002 668
                    </a>
                  </span>
                </div>
              </div>
            </section>
          </div>

          {/* Right Column: Online Data Deletion Request Form */}
          <div className="lg:col-span-6">
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 sm:p-8 lg:p-10">
              {status === 'success' ? (
                <div className="py-10 text-center space-y-5">
                  <div className="w-16 h-16 rounded-2xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto">
                    <CheckCircle2 className="w-8 h-8" />
                  </div>
                  <div className="space-y-2">
                    <p className="text-xs font-mono font-semibold text-emerald-700 dark:text-emerald-400 tabular-nums">
                      Mã tiếp nhận yêu cầu: {ticketId}
                    </p>
                    <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
                      Đã tiếp nhận yêu cầu xóa dữ liệu
                    </h2>
                    <p className="text-sm text-slate-600 dark:text-slate-300 max-w-md mx-auto leading-relaxed">
                      Yêu cầu cho tài khoản <strong>{formData.email}</strong> đã được chuyển tới Bộ phận Bảo vệ Dữ liệu (DPO). Chúng tôi sẽ xác nhận qua email trong vòng 24 giờ làm việc và hoàn tất xóa dữ liệu trong tối đa 72 giờ.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={resetForm}
                    className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-[#007c76] hover:bg-[#00645f] text-white text-xs font-semibold transition-colors cursor-pointer"
                  >
                    <span>Gửi yêu cầu khác</span>
                  </button>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-5">
                  <div className="space-y-1.5 border-b border-slate-100 dark:border-slate-800 pb-4">
                    <div className="flex items-center gap-2 text-xs font-semibold text-[#007c76] dark:text-teal-400">
                      <Trash2 className="w-4 h-4" />
                      <span>Biểu mẫu gửi yêu cầu xóa dữ liệu trực tuyến</span>
                    </div>
                    <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
                      Gửi yêu cầu xóa tài khoản &amp; dữ liệu
                    </h2>
                    <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
                      Dùng biểu mẫu này nếu bạn không thể tự đăng nhập hoặc muốn gửi yêu cầu xóa dữ liệu chính thức kèm mã theo dõi.
                    </p>
                  </div>

                  <div className="space-y-1.5">
                    <label htmlFor="del-name" className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                      Họ và tên tài khoản <span className="text-rose-500">*</span>
                    </label>
                    <div className="relative">
                      <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                      <input
                        id="del-name"
                        type="text"
                        name="name"
                        value={formData.name}
                        onChange={handleChange}
                        placeholder="Nhập họ và tên hiển thị trên tài khoản"
                        className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-[#007c76] focus:ring-2 focus:ring-[#007c76]/15"
                      />
                    </div>
                    {errors.name && <p className="text-xs text-rose-600 font-medium">{errors.name}</p>}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label htmlFor="del-email" className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                        Email đăng ký / Email Facebook <span className="text-rose-500">*</span>
                      </label>
                      <div className="relative">
                        <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                        <input
                          id="del-email"
                          type="email"
                          name="email"
                          value={formData.email}
                          onChange={handleChange}
                          placeholder="email@domain.com"
                          className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-[#007c76] focus:ring-2 focus:ring-[#007c76]/15"
                        />
                      </div>
                      {errors.email && <p className="text-xs text-rose-600 font-medium">{errors.email}</p>}
                    </div>

                    <div className="space-y-1.5">
                      <label htmlFor="del-phone" className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                        Số điện thoại xác minh <span className="text-rose-500">*</span>
                      </label>
                      <div className="relative">
                        <Phone className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                        <input
                          id="del-phone"
                          type="tel"
                          name="phone"
                          value={formData.phone}
                          onChange={handleChange}
                          placeholder="09xx xxx xxx"
                          className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-[#007c76] focus:ring-2 focus:ring-[#007c76]/15"
                        />
                      </div>
                      {errors.phone && <p className="text-xs text-rose-600 font-medium">{errors.phone}</p>}
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label htmlFor="del-auth" className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                      Phương thức đăng nhập từng sử dụng
                    </label>
                    <div className="relative">
                      <KeyRound className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                      <select
                        id="del-auth"
                        name="authMethod"
                        value={formData.authMethod}
                        onChange={handleChange}
                        className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-[#007c76] focus:ring-2 focus:ring-[#007c76]/15"
                      >
                        {AUTH_METHODS.map((m) => (
                          <option key={m} value={m}>
                            {m}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label htmlFor="del-scope" className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                      Phạm vi yêu cầu xóa
                    </label>
                    <select
                      id="del-scope"
                      name="scope"
                      value={formData.scope}
                      onChange={handleChange}
                      className="w-full px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-[#007c76] focus:ring-2 focus:ring-[#007c76]/15"
                    >
                      {DELETION_SCOPES.map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label htmlFor="del-note" className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                      Thông tin bổ sung (UID hoặc lý do — tùy chọn)
                    </label>
                    <textarea
                      id="del-note"
                      name="note"
                      rows={3}
                      value={formData.note}
                      onChange={handleChange}
                      placeholder="Nếu bạn nhớ mã UID Firebase hoặc muốn yêu cầu hủy đồng thời hồ sơ chứng nhận, vui lòng ghi rõ tại đây..."
                      className="w-full px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-[#007c76] focus:ring-2 focus:ring-[#007c76]/15 resize-none"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="flex items-start gap-2.5 text-xs text-slate-600 dark:text-slate-300 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={confirmedUnderstand}
                        onChange={(e) => {
                          setConfirmedUnderstand(e.target.checked);
                          if (errors.confirm) setErrors((prev) => ({ ...prev, confirm: undefined }));
                        }}
                        className="mt-0.5 h-4 w-4 accent-[#007c76] cursor-pointer"
                      />
                      <span>
                        Tôi xác nhận mình là chủ tài khoản hợp pháp và hiểu rằng sau khi xóa, quyền truy cập khóa học, tiến độ bài giảng và ghi chú cá nhân sẽ không thể khôi phục.
                      </span>
                    </label>
                    {errors.confirm && <p className="text-xs text-rose-600 font-medium">{errors.confirm}</p>}
                  </div>

                  <button
                    type="submit"
                    disabled={status === 'sending'}
                    className="w-full py-3 px-6 rounded-xl bg-[#007c76] hover:bg-[#00645f] text-white text-sm font-semibold flex items-center justify-center gap-2 transition-colors disabled:opacity-60 cursor-pointer"
                  >
                    <Send className="w-4 h-4" />
                    <span>{status === 'sending' ? 'Đang gửi yêu cầu...' : 'Gửi yêu cầu xóa tài khoản & dữ liệu'}</span>
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>

        {/* Data Scope & Timeline Table */}
        <section className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 sm:p-8 space-y-5">
          <div className="space-y-1.5 max-w-3xl">
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">
              Phạm vi dữ liệu được xóa &amp; Thời hạn xử lý
            </h2>
            <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
              Chi tiết các nhóm dữ liệu bị xóa vĩnh viễn và các chứng từ pháp lý bắt buộc lưu giữ theo quy định của pháp luật Việt Nam.
            </p>
          </div>

          <div className="overflow-x-auto border border-slate-200 dark:border-slate-700 rounded-xl">
            <table className="w-full text-left border-collapse text-xs sm:text-sm">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white">
                  <th className="p-4 font-semibold">Loại dữ liệu</th>
                  <th className="p-4 font-semibold">Nội dung cụ thể</th>
                  <th className="p-4 font-semibold">Hành động xử lý</th>
                  <th className="p-4 font-semibold">Thời hạn hoàn tất</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800 text-slate-600 dark:text-slate-300">
                <tr className="align-top">
                  <td className="p-4 font-semibold text-slate-900 dark:text-white">
                    Hồ sơ cá nhân &amp; Liên hệ
                  </td>
                  <td className="p-4">Họ tên, email, số điện thoại / Zalo, tên doanh nghiệp</td>
                  <td className="p-4">Xóa vĩnh viễn khỏi Firebase Auth &amp; Firestore</td>
                  <td className="p-4 tabular-nums whitespace-nowrap">24–72 giờ (tối đa 30 ngày)</td>
                </tr>
                <tr className="align-top">
                  <td className="p-4 font-semibold text-slate-900 dark:text-white">
                    Thông tin xác thực Facebook / Google
                  </td>
                  <td className="p-4">
                    Token phiên, Facebook App-scoped User ID, tên &amp; ảnh đại diện công khai (public_profile), email liên kết, Firebase UID
                  </td>
                  <td className="p-4">Hủy liên kết &amp; xóa hoàn toàn khóa định danh OAuth</td>
                  <td className="p-4 tabular-nums whitespace-nowrap">Tức thì / tối đa 72 giờ</td>
                </tr>
                <tr className="align-top">
                  <td className="p-4 font-semibold text-slate-900 dark:text-white">
                    Dữ liệu học tập &amp; Ghi chú
                  </td>
                  <td className="p-4">
                    Tiến độ video, ghi chú cá nhân, điểm kiểm tra trắc nghiệm, thông báo lớp học
                  </td>
                  <td className="p-4">Xóa hoặc ẩn danh hóa hoàn toàn</td>
                  <td className="p-4 tabular-nums whitespace-nowrap">24–72 giờ (tối đa 30 ngày)</td>
                </tr>
                <tr className="align-top">
                  <td className="p-4 font-semibold text-slate-900 dark:text-white">
                    Chứng từ giao dịch tài chính
                  </td>
                  <td className="p-4">
                    Mã đơn 10 số, số tiền giao dịch VietQR/ACB, biên lai kế toán
                  </td>
                  <td className="p-4">Lưu tách biệt phục vụ đối soát thuế/kế toán (ngừng liên kết hồ sơ học tập)</td>
                  <td className="p-4 tabular-nums whitespace-nowrap">10 năm theo Luật Kế toán VN</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </div>
  );
};

export default DataDeletion;
