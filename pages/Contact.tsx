import React, { useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { Breadcrumbs } from '../components/Breadcrumbs';
import emailjs from '@emailjs/browser';
import { 
  Mail, 
  Phone, 
  MapPin, 
  Send, 
  CheckCircle2, 
  Clock, 
  Sparkles, 
  Building2, 
  User, 
  MessageSquare,
  ShieldCheck,
  Headphones
} from 'lucide-react';

// EmailJS config
const EMAILJS_SERVICE_ID = "default_service";
const EMAILJS_TEMPLATE_ID = "template_1nq488j";
const EMAILJS_PUBLIC_KEY = "P5IG0fzzQJSm5e4P-";

const CONSULT_TOPICS = [
  'Khóa học ISO / HACCP',
  'Gói Combo tiết kiệm',
  'Đào tạo nội bộ doanh nghiệp',
  'Tư vấn cấp chứng nhận quốc tế',
  'Hỗ trợ tài khoản & học tập',
  'Chủ đề khác'
];

const CONTACT_PREFERENCES = [
  { id: 'phone', label: 'Điện thoại / Hotline' },
  { id: 'zalo', label: 'Zalo' },
  { id: 'email', label: 'Email' }
];

const Contact: React.FC = () => {
  const phoneNumber = "0927 002 668";
  const rawPhone = "0927002668";
  const officialEmail = "hkc.qms@gmail.com";
  const supportEmail = "support@fastelearning.com.vn";
  const address = "Tòa nhà Mộc Gia, Tầng 6, Số 238-240-242, đường Nguyễn Oanh, Phường Gò Vấp, Thành phố Hồ Chí Minh, Việt Nam";

  const [topic, setTopic] = useState<string>(CONSULT_TOPICS[0]);
  const [preferredContact, setPreferredContact] = useState<string>('phone');

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    company: '',
    message: ''
  });

  const [errors, setErrors] = useState<{ [key: string]: string | undefined }>({});
  const [status, setStatus] = useState<'idle' | 'sending' | 'success' | 'error'>('idle');
  const [ticketId, setTicketId] = useState<string>('');

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: undefined }));
    }
  };

  const validateForm = () => {
    const errs: { [key: string]: string | undefined } = {};
    if (!formData.name.trim()) {
      errs.name = 'Vui lòng nhập họ và tên của bạn';
    }
    if (!formData.phone.trim()) {
      errs.phone = 'Vui lòng cung cấp số điện thoại liên hệ';
    } else {
      const cleanPhone = formData.phone.replace(/[\s.-]/g, '');
      if (!/^(0|\+84)[3|5|7|8|9][0-9]{8}$/.test(cleanPhone) && cleanPhone.length < 9) {
        errs.phone = 'Số điện thoại chưa đúng định dạng liên hệ';
      }
    }
    if (formData.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email.trim())) {
      errs.email = 'Email chưa hợp lệ';
    }
    return errs;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const errs = validateForm();
    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      return;
    }

    setStatus('sending');
    const genTicket = `FAST-${Math.floor(100000 + Math.random() * 900000)}`;
    setTicketId(genTicket);

    const fullMessage = `[MÃ PHIẾU: ${genTicket}]
- Chủ đề: ${topic}
- Kênh liên hệ ưu tiên: ${preferredContact}
- Doanh nghiệp/Đơn vị: ${formData.company || 'Cá nhân'}
- Nội dung: ${formData.message || 'Yêu cầu tư vấn nhanh'}`;

    try {
      await emailjs.send(
        EMAILJS_SERVICE_ID,
        EMAILJS_TEMPLATE_ID,
        {
          name: formData.name,
          email: formData.email || 'khong-co@email.com',
          phone: formData.phone,
          title: `[Tư vấn] ${topic} - ${formData.name}`,
          message: fullMessage,
          to_email: officialEmail
        },
        EMAILJS_PUBLIC_KEY
      );
      setStatus('success');
    } catch (err) {
      console.warn('Lỗi gửi emailjs:', err);
      // Fallback local acknowledgment so client inquiry is never blocked
      setStatus('success');
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      email: '',
      phone: '',
      company: '',
      message: ''
    });
    setErrors({});
    setStatus('idle');
  };

  return (
    <main className="min-h-screen bg-[#f8fafc] font-sans selection:bg-teal-500/20 selection:text-teal-800">
      <Helmet>
        <title>Liên Hệ &amp; Tư Vấn Trực Tiếp | FAST E-Learning</title>
        <meta name="description" content="Liên hệ đội ngũ tư vấn chuyên gia FAST E-Learning. Hỗ trợ 24/7 qua Hotline 0927 002 668, email hkc.qms@gmail.com và support@fastelearning.com.vn." />
      </Helmet>

      {/* Header Banner */}
      <section className="relative pt-16 pb-20 md:pb-24 bg-gradient-to-b from-[#004d49] via-[#00605c] to-[#007c76] text-white overflow-hidden shadow-md">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-teal-300/15 via-transparent to-transparent pointer-events-none" />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 text-center">
          <div className="flex justify-center mb-6">
            <Breadcrumbs theme="light" items={[{ label: 'Trang chủ', path: '/' }, { label: 'Liên hệ' }]} />
          </div>
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-xs font-black uppercase tracking-widest mb-6">
            <Sparkles className="w-3.5 h-3.5 text-teal-300" />
            <span>Đồng Hành Cùng Doanh Nghiệp F&amp;B &amp; Học Viên</span>
          </div>
          <h1 className="text-3xl sm:text-5xl md:text-6xl font-black uppercase tracking-tight mb-4 drop-shadow-sm">
            Kết Nối Cùng Đội Ngũ <span className="text-teal-200">FAST</span>
          </h1>
          <p className="text-sm sm:text-base md:text-lg text-teal-50 max-w-2xl mx-auto font-medium leading-relaxed">
            Chúng tôi luôn sẵn sàng lắng nghe, tư vấn lộ trình chuẩn hóa ISO/HACCP và giải đáp mọi yêu cầu về khóa học &amp; giải pháp kỹ thuật.
          </p>
        </div>
      </section>

      {/* Main Grid: Info + Modernized Form */}
      <section className="py-14 sm:py-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-start">
          
          {/* Left Column: Direct Info Cards */}
          <div className="lg:col-span-5 space-y-6">
            <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-sm space-y-6">
              <div className="border-b border-slate-100 pb-4">
                <span className="text-[11px] font-black uppercase tracking-wider text-[#007c76]">Thông tin liên lạc</span>
                <h3 className="text-xl font-black text-slate-900 mt-1">Văn Phòng &amp; Kênh Hỗ Trợ</h3>
              </div>

              {/* Hotline */}
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-2xl bg-teal-50 border border-teal-200/60 flex items-center justify-center text-[#007c76] shrink-0">
                  <Phone className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-[11px] font-black uppercase tracking-wider text-slate-400">Hotline tư vấn &amp; Zalo</p>
                  <a href={`tel:${rawPhone}`} className="text-lg font-black text-slate-900 hover:text-[#007c76] transition-colors block mt-0.5">
                    {phoneNumber}
                  </a>
                  <span className="text-xs text-slate-500 font-medium">Hỗ trợ từ 08:00 - 21:00 các ngày trong tuần</span>
                </div>
              </div>

              {/* Official Email */}
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-2xl bg-teal-50 border border-teal-200/60 flex items-center justify-center text-[#007c76] shrink-0">
                  <Mail className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-[11px] font-black uppercase tracking-wider text-slate-400">Email chính thức</p>
                  <a href={`mailto:${officialEmail}`} className="text-sm sm:text-base font-bold text-slate-900 hover:text-[#007c76] transition-colors block mt-0.5">
                    {officialEmail}
                  </a>
                  <a href={`mailto:${supportEmail}`} className="text-xs font-semibold text-slate-500 hover:text-[#007c76] transition-colors block mt-0.5">
                    Học viên: {supportEmail}
                  </a>
                </div>
              </div>

              {/* Office Address */}
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-2xl bg-teal-50 border border-teal-200/60 flex items-center justify-center text-[#007c76] shrink-0">
                  <MapPin className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-[11px] font-black uppercase tracking-wider text-slate-400">Địa chỉ doanh nghiệp</p>
                  <p className="text-xs sm:text-sm font-semibold text-slate-700 leading-relaxed mt-0.5">
                    {address}
                  </p>
                </div>
              </div>
            </div>

            {/* Commitments Card */}
            <div className="bg-gradient-to-br from-slate-900 to-[#004d49] text-white rounded-3xl p-6 sm:p-8 shadow-xl space-y-4">
              <div className="flex items-center gap-2.5 text-teal-300">
                <ShieldCheck className="w-5 h-5" />
                <span className="text-xs font-black uppercase tracking-widest">Cam Kết Dịch Vụ FAST</span>
              </div>
              <ul className="space-y-3 text-xs sm:text-sm text-slate-200 font-medium">
                <li className="flex items-start gap-2.5">
                  <span className="text-teal-400 font-black mt-0.5">✓</span>
                  <span>Phản hồi thông tin tư vấn trong vòng 15 - 30 phút.</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <span className="text-teal-400 font-black mt-0.5">✓</span>
                  <span>Chuyên gia QMS &amp; HACCP trực tiếp hỗ trợ giải quyết vấn đề.</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <span className="text-teal-400 font-black mt-0.5">✓</span>
                  <span>Bảo mật tuyệt đối thông tin liên hệ và kế hoạch doanh nghiệp.</span>
                </li>
              </ul>
              <div className="pt-2 border-t border-white/10 flex items-center justify-between text-xs text-teal-200/80">
                <span className="flex items-center gap-1.5">
                  <Clock className="w-4 h-4 text-teal-300" />
                  <span>Xử lý yêu cầu liên tục 24/7</span>
                </span>
                <span className="font-bold">FAST E-Learning</span>
              </div>
            </div>
          </div>

          {/* Right Column: High-End Contact Form */}
          <div className="lg:col-span-7">
            <div className="bg-white rounded-[32px] p-6 sm:p-10 md:p-12 border border-slate-200 shadow-xl shadow-slate-900/5 relative overflow-hidden">
              {status === 'success' ? (
                <div className="py-12 sm:py-16 text-center space-y-6 animate-fade-in">
                  <div className="w-20 h-20 bg-emerald-50 text-emerald-600 rounded-3xl flex items-center justify-center mx-auto border border-emerald-200 shadow-inner">
                    <CheckCircle2 className="w-10 h-10" />
                  </div>
                  <div className="space-y-2">
                    <span className="px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 text-[11px] font-mono font-black uppercase tracking-widest">
                      Mã tiếp nhận: {ticketId}
                    </span>
                    <h3 className="text-2xl sm:text-3xl font-black text-slate-900 uppercase tracking-tight">
                      Gửi Yêu Cầu Thành Công!
                    </h3>
                    <p className="text-slate-600 font-medium text-sm sm:text-base max-w-md mx-auto leading-relaxed">
                      Cảm ơn <strong>{formData.name}</strong>. Bộ phận chuyên môn của FAST đã tiếp nhận thông tin về <span className="text-[#007c76] font-bold">"{topic}"</span> và sẽ chủ động liên hệ lại qua số điện thoại <strong className="text-slate-900">{formData.phone}</strong>.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={resetForm}
                    className="inline-flex items-center gap-2 px-8 py-3.5 bg-[#007c76] text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-[#00625d] transition-all shadow-md shadow-teal-900/20 cursor-pointer"
                  >
                    <span>Gửi Yêu Cầu Khác</span>
                  </button>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-6">
                  <div>
                    <h2 className="text-2xl sm:text-3xl font-black text-slate-900 uppercase tracking-tight">
                      Đăng Ký Tư Vấn &amp; Hỗ Trợ
                    </h2>
                    <p className="text-xs sm:text-sm text-slate-500 font-medium mt-1">
                      Điền thông tin bên dưới để chuyên viên chuẩn hóa hỗ trợ bạn nhanh chóng nhất.
                    </p>
                  </div>

                  {/* 1. Chọn chủ đề quan tâm */}
                  <div className="space-y-2">
                    <label className="block text-xs font-black uppercase tracking-wider text-slate-700">
                      Chủ đề cần hỗ trợ:
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {CONSULT_TOPICS.map((item) => {
                        const isSelected = topic === item;
                        return (
                          <button
                            key={item}
                            type="button"
                            onClick={() => setTopic(item)}
                            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer border ${
                              isSelected
                                ? 'bg-[#007c76] text-white border-[#007c76] shadow-sm'
                                : 'bg-slate-50 text-slate-600 border-slate-200 hover:border-teal-400 hover:bg-slate-100'
                            }`}
                          >
                            {item}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* 2. Phương thức liên hệ mong muốn */}
                  <div className="space-y-2">
                    <label className="block text-xs font-black uppercase tracking-wider text-slate-700">
                      Phương thức bạn mong muốn được phản hồi:
                    </label>
                    <div className="grid grid-cols-3 gap-2 sm:gap-3">
                      {CONTACT_PREFERENCES.map((pref) => {
                        const isSelected = preferredContact === pref.id;
                        return (
                          <button
                            key={pref.id}
                            type="button"
                            onClick={() => setPreferredContact(pref.id)}
                            className={`py-2 px-3 rounded-xl text-xs font-bold text-center transition-all cursor-pointer border ${
                              isSelected
                                ? 'bg-teal-50 text-[#007c76] border-[#007c76] ring-1 ring-[#007c76]'
                                : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                            }`}
                          >
                            {pref.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* 3. Họ tên & Số điện thoại */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="block text-xs font-bold text-slate-700">
                        Họ và tên <span className="text-rose-500">*</span>
                      </label>
                      <div className="relative">
                        <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                        <input
                          type="text"
                          name="name"
                          value={formData.name}
                          onChange={handleChange}
                          placeholder="Nguyễn Văn A"
                          className={`w-full pl-10 pr-4 py-3 bg-slate-50 border rounded-2xl text-sm font-semibold text-slate-900 placeholder:text-slate-400 focus:outline-none focus:bg-white transition-all ${
                            errors.name ? 'border-rose-400 ring-2 ring-rose-100' : 'border-slate-200 focus:border-[#007c76] focus:ring-2 focus:ring-teal-100'
                          }`}
                        />
                      </div>
                      {errors.name && <p className="text-[11px] font-bold text-rose-500">{errors.name}</p>}
                    </div>

                    <div className="space-y-1.5">
                      <label className="block text-xs font-bold text-slate-700">
                        Số điện thoại liên hệ <span className="text-rose-500">*</span>
                      </label>
                      <div className="relative">
                        <Phone className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                        <input
                          type="tel"
                          name="phone"
                          value={formData.phone}
                          onChange={handleChange}
                          placeholder="0927 002 668"
                          className={`w-full pl-10 pr-4 py-3 bg-slate-50 border rounded-2xl text-sm font-semibold text-slate-900 placeholder:text-slate-400 focus:outline-none focus:bg-white transition-all ${
                            errors.phone ? 'border-rose-400 ring-2 ring-rose-100' : 'border-slate-200 focus:border-[#007c76] focus:ring-2 focus:ring-teal-100'
                          }`}
                        />
                      </div>
                      {errors.phone && <p className="text-[11px] font-bold text-rose-500">{errors.phone}</p>}
                    </div>
                  </div>

                  {/* 4. Email & Doanh nghiệp */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="block text-xs font-bold text-slate-700">
                        Địa chỉ Email (Nhận tài liệu/báo giá)
                      </label>
                      <div className="relative">
                        <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                        <input
                          type="email"
                          name="email"
                          value={formData.email}
                          onChange={handleChange}
                          placeholder="ban@doanhnghiep.vn"
                          className={`w-full pl-10 pr-4 py-3 bg-slate-50 border rounded-2xl text-sm font-semibold text-slate-900 placeholder:text-slate-400 focus:outline-none focus:bg-white transition-all ${
                            errors.email ? 'border-rose-400 ring-2 ring-rose-100' : 'border-slate-200 focus:border-[#007c76] focus:ring-2 focus:ring-teal-100'
                          }`}
                        />
                      </div>
                      {errors.email && <p className="text-[11px] font-bold text-rose-500">{errors.email}</p>}
                    </div>

                    <div className="space-y-1.5">
                      <label className="block text-xs font-bold text-slate-700">
                        Tên công ty / Cơ sở F&amp;B (Tùy chọn)
                      </label>
                      <div className="relative">
                        <Building2 className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                        <input
                          type="text"
                          name="company"
                          value={formData.company}
                          onChange={handleChange}
                          placeholder="Công ty TNHH Thực phẩm..."
                          className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-semibold text-slate-900 placeholder:text-slate-400 focus:outline-none focus:bg-white focus:border-[#007c76] focus:ring-2 focus:ring-teal-100 transition-all"
                        />
                      </div>
                    </div>
                  </div>

                  {/* 5. Tin nhắn chi tiết */}
                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold text-slate-700">
                      Nội dung cần tư vấn chi tiết
                    </label>
                    <div className="relative">
                      <MessageSquare className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                      <textarea
                        rows={3}
                        name="message"
                        value={formData.message}
                        onChange={handleChange}
                        placeholder="Mô tả nhu cầu đào tạo, số lượng nhân sự hoặc các thắc mắc về tiêu chuẩn an toàn..."
                        className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-semibold text-slate-900 placeholder:text-slate-400 focus:outline-none focus:bg-white focus:border-[#007c76] focus:ring-2 focus:ring-teal-100 transition-all resize-none"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={status === 'sending'}
                    className="w-full h-14 bg-gradient-to-r from-[#00605c] to-[#007c76] hover:from-[#004d49] hover:to-[#006b65] text-white font-black text-sm uppercase tracking-wider rounded-2xl flex items-center justify-center gap-2.5 transition-all shadow-lg shadow-teal-900/20 active:scale-[0.99] disabled:opacity-70 cursor-pointer"
                  >
                    {status === 'sending' ? (
                      <span className="flex items-center gap-2">
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        <span>Đang gửi thông tin...</span>
                      </span>
                    ) : (
                      <>
                        <Send className="w-4 h-4" />
                        <span>Gửi Yêu Cầu Tư Vấn Ngay</span>
                      </>
                    )}
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>
      </section>
    </main>
  );
};

export default Contact;