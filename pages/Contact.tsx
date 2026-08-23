import React, { useState } from 'react';
import emailjs from '@emailjs/browser';

// --- CẤU HÌNH EMAILJS (Sử dụng chung key với PaymentModal) ---
const EMAILJS_SERVICE_ID = "service_q86r4ap"; 
const EMAILJS_TEMPLATE_ID = "template_1nq488j"; 
const EMAILJS_PUBLIC_KEY = "P5IG0fzzQJSm5e4P-"; 
const TARGET_EMAIL = "hkc.qms@gmail.com";

const Contact: React.FC = () => {
  const phoneNumber = "0927 002 668";
  const rawPhone = "0927002668";
  const email = "hkc.qms@gmail.com";
  const gmailLink = "https://mail.google.com/mail/u/0/?fs=1&to=hkc.qms@gmail.com&su=Li%C3%AAn+h%E1%BB%87+t%E1%BB%AB+website+HKC&body=Xin+ch%C3%A0o,+t%C3%B4i+mu%E1%BB%91n+%C4%91%C6%B0%E1%BB%A3c+h%E1%BB%97+tr%E1%BB%A3.&tf=cm";

  // Form State - Added Email
  const [formData, setFormData] = useState({
    name: '',
    email: '', 
    phone: '',
    message: ''
  });
  
  // Validation Errors State
  const [errors, setErrors] = useState<{name?: string; email?: string; phone?: string; message?: string}>({});

  const [status, setStatus] = useState<'idle' | 'sending' | 'success' | 'error'>('idle');

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    // Xóa lỗi khi người dùng bắt đầu nhập lại
    if (errors[e.target.name as keyof typeof errors]) {
        setErrors({ ...errors, [e.target.name]: undefined });
    }
  };

  const validateForm = () => {
      const newErrors: {name?: string; email?: string; phone?: string; message?: string} = {};
      
      if (!formData.name.trim()) {
          newErrors.name = "Vui lòng nhập họ và tên.";
      }

      // Validate Email
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!formData.email.trim()) {
          newErrors.email = "Vui lòng nhập địa chỉ Email.";
      } else if (!emailRegex.test(formData.email)) {
          newErrors.email = "Địa chỉ Email không hợp lệ.";
      }

      // Regex cho số điện thoại Việt Nam: 10 số, bắt đầu bằng 03, 05, 07, 08, 09
      const phoneRegex = /^(0)(3[2-9]|5[6|8|9]|7[0|6-9]|8[0-6|8|9]|9[0-4|6-9])[0-9]{7}$/;
      const cleanPhone = formData.phone.replace(/\s/g, '');

      if (!cleanPhone) {
          newErrors.phone = "Vui lòng nhập số điện thoại.";
      } else if (!phoneRegex.test(cleanPhone)) {
          newErrors.phone = "Số điện thoại không hợp lệ (Vui lòng nhập 10 số, đúng đầu số nhà mạng).";
      }

      if (!formData.message.trim()) {
          newErrors.message = "Vui lòng nhập nội dung cần tư vấn.";
      }

      setErrors(newErrors);
      return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Kiểm tra validation trước khi gửi
    if (!validateForm()) return;

    setStatus('sending');

    // Chuẩn bị dữ liệu gửi đi
    // Lưu ý: Mapping fields để tận dụng Template ID hiện có (hoặc template Contact chuẩn)
    const templateParams = {
        to_email: TARGET_EMAIL,        
        to_name: "Admin FAST",
        
        // Thông tin người gửi
        from_name: formData.name,      
        from_email: formData.email,
        phone_number: formData.phone,
        message: formData.message,

        // Fallback mapping cho template OTP cũ (nếu dùng chung)
        // Map Email + Phone vào otp_code để hiển thị rõ trong email
        otp_code: `${formData.phone} - ${formData.email}`,      
        // Map nội dung vào course_name
        course_name: formData.message, 
        
        reply_to: formData.email       
    };

    emailjs.send(EMAILJS_SERVICE_ID, EMAILJS_TEMPLATE_ID, templateParams, EMAILJS_PUBLIC_KEY)
      .then((response) => {
         console.log('SUCCESS!', response.status, response.text);
         setStatus('success');
      }, (err) => {
         console.error('FAILED...', err);
         setStatus('error');
      });
  };

  const resetForm = () => {
      setFormData({ name: '', email: '', phone: '', message: '' });
      setStatus('idle');
      setErrors({});
  };

  return (
    <main className="bg-gray-50 py-20 font-sans animate-fade-in">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-20">
          <div>
            <h1 className="text-4xl font-bold text-[#007b6f] mb-8">Liên Hệ Với Chúng Tôi</h1>
            <p className="text-gray-600 mb-12 text-lg leading-relaxed font-medium">
              Bạn có thắc mắc về khóa học hoặc cần tư vấn về các chứng chỉ ISO/HACCP? 
              Đội ngũ FAST luôn sẵn sàng hỗ trợ bạn tối ưu hóa quy trình An toàn thực phẩm.
            </p>

            <div className="space-y-12">
              <div className="flex items-center space-x-8">
                <a href={gmailLink} target="_blank" rel="noreferrer" className="w-20 h-20 bg-white rounded-3xl flex items-center justify-center shadow-lg p-5 overflow-hidden flex-shrink-0 hover:scale-105 transition-transform border border-gray-50">
                  <img 
                    src="https://upload.wikimedia.org/wikipedia/commons/7/7e/Gmail_icon_%282020%29.svg" 
                    alt="Gmail" 
                    className="w-full h-full object-contain"
                    loading="lazy"
                    decoding="async"
                  />
                </a>
                <div>
                  <p className="text-xs text-gray-400 uppercase tracking-widest mb-1 font-bold">Email hỗ trợ 24/7</p>
                  <a href={gmailLink} target="_blank" rel="noreferrer" className="text-gray-700 text-2xl hover:text-[#007b6f] font-black">{email}</a>
                </div>
              </div>

              <div className="flex items-center space-x-8">
                <div className="w-20 h-20 bg-white rounded-3xl flex items-center justify-center shadow-lg p-4 flex-shrink-0 hover:scale-105 transition-transform">
                  <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-12 h-12">
                    <circle cx="12" cy="12" r="12" fill="#007b6f" fillOpacity="0.1"/>
                    <path d="M16.5 13.5C15.7 13.5 15 13.4 14.3 13.1C14.1 13.1 13.9 13.1 13.7 13.3L12.4 14.6C10.7 13.8 9.2 12.3 8.4 10.6L9.7 9.3C9.9 9.1 9.9 8.9 9.9 8.7C9.6 8 9.5 7.3 9.5 6.5C9.5 6.2 9.3 6 9 6H7C6.7 6 6.5 6.2 6.5 6.5C6.5 12 11 16.5 16.5 16.5C16.8 16.5 17 16.3 17 16V14C17 13.7 16.8 13.5 16.5 13.5Z" fill="#007b6f"/>
                  </svg>
                </div>
                <div>
                  <p className="text-xs text-gray-400 uppercase tracking-widest mb-1 font-bold">Hotline tư vấn nhanh</p>
                  <a href={`tel:${rawPhone}`} className="text-[#374151] text-4xl font-normal hover:text-[#007b6f] tracking-tighter">{phoneNumber}</a>
                </div>
              </div>

              <div className="flex items-center space-x-8">
                <div className="w-20 h-20 bg-white rounded-3xl flex items-center justify-center shadow-lg p-5 flex-shrink-0 hover:scale-105 transition-transform">
                   <svg viewBox="0 0 24 24" fill="#007b6f" xmlns="http://www.w3.org/2000/svg" className="w-full h-full opacity-60">
                      <path d="M12 2C8.13 2 5 5.13 5 9C5 14.25 12 22 12 22C12 22 19 14.25 19 9C19 5.13 15.87 2 12 2ZM12 11.5C10.62 11.5 9.5 10.38 9.5 9C9.5 7.62 10.62 6.5 12 6.5C13.38 6.5 14.5 7.62 14.5 9C14.5 10.38 13.38 11.5 12 11.5Z"/>
                   </svg>
                </div>
                <div>
                  <p className="text-xs text-gray-400 uppercase tracking-widest mb-1 font-bold">Địa chỉ văn phòng</p>
                  <p className="text-gray-700 text-2xl leading-tight font-black">Tòa Mộc Gia, tầng 6 số 238-240-242 đường Nguyễn Oanh, Phường Gò vấp, TP HCM, Việt Nam</p>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white p-12 rounded-[40px] shadow-2xl border-t-[12px] border-[#007b6f] flex flex-col justify-center min-h-[600px] relative overflow-hidden">
            
            {status === 'success' ? (
                // --- SUCCESS UI STATE (REPLACES FORM) ---
                <div className="absolute inset-0 z-10 bg-white flex flex-col items-center justify-center p-12 animate-in zoom-in-95 duration-500 text-center">
                    <div className="w-24 h-24 bg-green-100 text-green-600 rounded-full flex items-center justify-center mb-6 shadow-lg shadow-green-200">
                        <svg className="w-12 h-12 animate-bounce" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" /></svg>
                    </div>
                    <h2 className="text-3xl font-black text-[#007b6f] mb-4 uppercase">Gửi yêu cầu thành công!</h2>
                    <p className="text-gray-500 text-lg mb-8 max-w-sm">
                        Cảm ơn <strong>{formData.name}</strong>. Đội ngũ FAST đã nhận được thông tin và sẽ liên hệ với bạn trong vòng 15 phút.
                    </p>
                    <button 
                        onClick={resetForm}
                        className="bg-gray-100 text-gray-600 px-8 py-4 rounded-2xl font-black uppercase tracking-widest hover:bg-[#007b6f] hover:text-white transition-all shadow-md"
                    >
                        Gửi yêu cầu khác
                    </button>
                    
                    {/* Decorative confetti or background elements */}
                    <div className="absolute -bottom-10 -right-10 w-40 h-40 bg-green-50 rounded-full blur-3xl -z-10"></div>
                    <div className="absolute top-10 left-10 w-20 h-20 bg-[#007b6f]/10 rounded-full blur-2xl -z-10"></div>
                </div>
            ) : (
                // --- FORM STATE ---
                <>
                    <h2 className="text-3xl font-black text-[#374151] mb-2">Đăng ký tư vấn</h2>
                    <p className="text-gray-500 mb-8 font-bold uppercase tracking-wider text-sm">Chúng tôi sẽ phản hồi trong vòng 15 phút.</p>
                    
                    <form onSubmit={handleSubmit} className="space-y-6 relative z-10">
                    <div>
                        <input 
                        type="text" 
                        name="name"
                        value={formData.name}
                        onChange={handleChange}
                        className={`w-full bg-gray-50 border-2 p-6 outline-none rounded-2xl transition-all font-bold text-lg placeholder-gray-400 ${errors.name ? 'border-red-400 focus:border-red-500 bg-red-50' : 'border-gray-100 focus:border-[#007b6f]'}`}
                        placeholder="Họ và tên của bạn" 
                        disabled={status === 'sending'}
                        />
                        {errors.name && <p className="text-red-500 text-xs font-bold mt-2 ml-2 flex items-center gap-1"><svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>{errors.name}</p>}
                    </div>

                    <div>
                        <input 
                        type="email" 
                        name="email"
                        value={formData.email}
                        onChange={handleChange}
                        className={`w-full bg-gray-50 border-2 p-6 outline-none rounded-2xl transition-all font-bold text-lg placeholder-gray-400 ${errors.email ? 'border-red-400 focus:border-red-500 bg-red-50' : 'border-gray-100 focus:border-[#007b6f]'}`}
                        placeholder="Địa chỉ Email" 
                        disabled={status === 'sending'}
                        />
                        {errors.email && <p className="text-red-500 text-xs font-bold mt-2 ml-2 flex items-center gap-1"><svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>{errors.email}</p>}
                    </div>
                    
                    <div>
                        <input 
                        type="tel" 
                        name="phone"
                        value={formData.phone}
                        onChange={handleChange}
                        className={`w-full bg-gray-50 border-2 p-6 outline-none rounded-2xl transition-all font-bold text-lg placeholder-gray-400 ${errors.phone ? 'border-red-400 focus:border-red-500 bg-red-50' : 'border-gray-100 focus:border-[#007b6f]'}`}
                        placeholder="Số điện thoại liên hệ" 
                        disabled={status === 'sending'}
                        />
                        {errors.phone && <p className="text-red-500 text-xs font-bold mt-2 ml-2 flex items-center gap-1"><svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>{errors.phone}</p>}
                    </div>

                    <div>
                        <textarea 
                        rows={4} 
                        name="message"
                        value={formData.message}
                        onChange={handleChange}
                        className={`w-full bg-gray-50 border-2 p-6 outline-none rounded-2xl transition-all resize-none font-bold text-lg placeholder-gray-400 ${errors.message ? 'border-red-400 focus:border-red-500 bg-red-50' : 'border-gray-100 focus:border-[#007b6f]'}`}
                        placeholder="Khóa học hoặc dịch vụ bạn đang quan tâm..."
                        disabled={status === 'sending'}
                        ></textarea>
                        {errors.message && <p className="text-red-500 text-xs font-bold mt-2 ml-2 flex items-center gap-1"><svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>{errors.message}</p>}
                    </div>

                    {status === 'error' && (
                        <div className="p-4 bg-red-50 text-red-600 rounded-xl text-center font-bold border border-red-200 animate-[shake_0.5s_ease-in-out]">
                        Có lỗi xảy ra khi gửi. Vui lòng kiểm tra kết nối mạng hoặc gọi hotline trực tiếp.
                        </div>
                    )}

                    <button 
                        type="submit" 
                        disabled={status === 'sending'}
                        className="w-full bg-[#007b6f] text-white py-6 rounded-2xl font-black text-2xl hover:bg-[#005f56] shadow-[0_10px_30px_rgba(0,123,111,0.3)] transition-all transform hover:-translate-y-1 uppercase tracking-widest flex items-center justify-center disabled:opacity-70 disabled:cursor-not-allowed disabled:transform-none"
                    >
                        {status === 'sending' ? (
                        <>
                            <svg className="animate-spin -ml-1 mr-3 h-6 w-6 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            ĐANG GỬI...
                        </>
                        ) : 'GỬI YÊU CẦU NGAY'}
                    </button>
                    </form>
                </>
            )}
          </div>
        </div>
      </div>
    </main>
  );
};

export default Contact;