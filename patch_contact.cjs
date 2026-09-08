const fs = require('fs');
let code = fs.readFileSync('pages/Contact.tsx', 'utf8');

const targetMainStart = '<main className="bg-gray-50 py-20 font-sans animate-fade-in">';
const targetMainEnd = '</main>';

const newMain = `<main className="min-h-screen bg-[#f8fafc] font-sans selection:bg-[#007c76]/20 selection:text-[#007c76]">
      {/* Header Section */}
      <section className="pt-24 pb-16 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <div className="max-w-3xl">
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-black text-gray-900 tracking-tighter leading-none mb-6">
                Liên Hệ Với <span className="text-[#007c76]">Chúng Tôi</span>
            </h1>
            <p className="text-gray-600 text-lg md:text-xl font-medium leading-relaxed max-w-2xl">
                Bạn có thắc mắc về khóa học hoặc cần tư vấn về các chứng chỉ ISO/HACCP? Đội ngũ FAST luôn sẵn sàng hỗ trợ bạn tối ưu hóa quy trình An toàn thực phẩm.
            </p>
        </div>
      </section>

      {/* Main Content Section */}
      <section className="pb-32 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-20 items-start">
            
            {/* Left: Contact Info */}
            <div className="lg:col-span-5 space-y-10">
                <div className="group flex items-start gap-6">
                    <a href={gmailLink} target="_blank" rel="noreferrer" className="shrink-0 w-16 h-16 bg-white border border-gray-100 rounded-2xl flex items-center justify-center shadow-sm group-hover:border-[#007c76]/30 group-hover:shadow-md transition-all">
                        <img 
                            src="https://upload.wikimedia.org/wikipedia/commons/7/7e/Gmail_icon_%282020%29.svg" 
                            alt="Gmail" 
                            className="w-8 h-8 object-contain group-hover:scale-110 transition-transform"
                            loading="lazy"
                            decoding="async"
                        />
                    </a>
                    <div>
                        <p className="text-[11px] text-gray-400 font-black uppercase tracking-widest mb-1.5">Email hỗ trợ 24/7</p>
                        <a href={gmailLink} target="_blank" rel="noreferrer" className="text-xl font-black text-gray-900 hover:text-[#007c76] transition-colors">{email}</a>
                    </div>
                </div>

                <div className="group flex items-start gap-6">
                    <div className="shrink-0 w-16 h-16 bg-white border border-gray-100 rounded-2xl flex items-center justify-center shadow-sm group-hover:border-[#007c76]/30 group-hover:shadow-md transition-all">
                        <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-8 h-8 text-[#007c76] group-hover:scale-110 transition-transform">
                            <circle cx="12" cy="12" r="12" fill="currentColor" fillOpacity="0.1"/>
                            <path d="M16.5 13.5C15.7 13.5 15 13.4 14.3 13.1C14.1 13.1 13.9 13.1 13.7 13.3L12.4 14.6C10.7 13.8 9.2 12.3 8.4 10.6L9.7 9.3C9.9 9.1 9.9 8.9 9.9 8.7C9.6 8 9.5 7.3 9.5 6.5C9.5 6.2 9.3 6 9 6H7C6.7 6 6.5 6.2 6.5 6.5C6.5 12 11 16.5 16.5 16.5C16.8 16.5 17 16.3 17 16V14C17 13.7 16.8 13.5 16.5 13.5Z" fill="currentColor"/>
                        </svg>
                    </div>
                    <div>
                        <p className="text-[11px] text-gray-400 font-black uppercase tracking-widest mb-1.5">Hotline tư vấn nhanh</p>
                        <a href={\`tel:\${rawPhone}\`} className="text-xl font-black text-gray-900 hover:text-[#007c76] transition-colors">{phoneNumber}</a>
                    </div>
                </div>

                <div className="group flex items-start gap-6">
                    <div className="shrink-0 w-16 h-16 bg-white border border-gray-100 rounded-2xl flex items-center justify-center shadow-sm group-hover:border-[#007c76]/30 group-hover:shadow-md transition-all">
                        <svg viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg" className="w-8 h-8 text-[#007c76] opacity-80 group-hover:scale-110 transition-transform">
                            <path d="M12 2C8.13 2 5 5.13 5 9C5 14.25 12 22 12 22C12 22 19 14.25 19 9C19 5.13 15.87 2 12 2ZM12 11.5C10.62 11.5 9.5 10.38 9.5 9C9.5 7.62 10.62 6.5 12 6.5C13.38 6.5 14.5 7.62 14.5 9C14.5 10.38 13.38 11.5 12 11.5Z"/>
                        </svg>
                    </div>
                    <div>
                        <p className="text-[11px] text-gray-400 font-black uppercase tracking-widest mb-1.5">Địa chỉ văn phòng</p>
                        <p className="text-lg font-bold text-gray-900 leading-snug">
                            Tòa Mộc Gia, tầng 6<br/>
                            Số 238-240-242 đường Nguyễn Oanh<br/>
                            Phường Gò Vấp, TP HCM, Việt Nam
                        </p>
                    </div>
                </div>
            </div>

            {/* Right: Form Form */}
            <div className="lg:col-span-7">
                <div className="bg-white p-8 md:p-12 rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-gray-100 relative overflow-hidden">
                    {status === 'success' ? (
                        <div className="flex flex-col items-center justify-center py-16 text-center animate-fade-in">
                            <div className="w-20 h-20 bg-[#007c76]/10 text-[#007c76] rounded-full flex items-center justify-center mb-6">
                                <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" /></svg>
                            </div>
                            <h2 className="text-2xl font-black text-gray-900 mb-3 uppercase tracking-tight">Gửi yêu cầu thành công!</h2>
                            <p className="text-gray-500 font-medium mb-8 max-w-sm mx-auto">
                                Cảm ơn <strong className="text-gray-900">{formData.name}</strong>. Đội ngũ FAST đã nhận được thông tin và sẽ liên hệ với bạn trong vòng 15 phút.
                            </p>
                            <button 
                                onClick={resetForm}
                                className="inline-flex items-center justify-center px-8 py-4 bg-gray-50 text-gray-900 rounded-xl font-black text-xs uppercase tracking-widest hover:bg-gray-100 transition-colors"
                            >
                                Gửi yêu cầu khác
                            </button>
                        </div>
                    ) : (
                        <>
                            <div className="mb-10">
                                <h2 className="text-2xl font-black text-gray-900 tracking-tight mb-2">Đăng ký tư vấn</h2>
                                <p className="text-sm font-bold text-gray-400 uppercase tracking-widest">Chúng tôi sẽ phản hồi trong vòng 15 phút.</p>
                            </div>
                            
                            <form onSubmit={handleSubmit} className="space-y-5">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                    <div>
                                        <input 
                                            type="text" 
                                            name="name"
                                            value={formData.name}
                                            onChange={handleChange}
                                            className={\`w-full bg-gray-50 border px-5 py-4 rounded-xl font-medium text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-4 transition-all \${errors.name ? 'border-red-200 focus:border-red-400 focus:ring-red-100 bg-red-50/50' : 'border-gray-100 focus:border-[#007c76] focus:ring-[#007c76]/10'}\`}
                                            placeholder="Họ và tên của bạn" 
                                            disabled={status === 'sending'}
                                        />
                                        {errors.name && <p className="text-red-500 text-[11px] font-bold mt-1.5 ml-1">{errors.name}</p>}
                                    </div>
                                    <div>
                                        <input 
                                            type="tel" 
                                            name="phone"
                                            value={formData.phone}
                                            onChange={handleChange}
                                            className={\`w-full bg-gray-50 border px-5 py-4 rounded-xl font-medium text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-4 transition-all \${errors.phone ? 'border-red-200 focus:border-red-400 focus:ring-red-100 bg-red-50/50' : 'border-gray-100 focus:border-[#007c76] focus:ring-[#007c76]/10'}\`}
                                            placeholder="Số điện thoại liên hệ" 
                                            disabled={status === 'sending'}
                                        />
                                        {errors.phone && <p className="text-red-500 text-[11px] font-bold mt-1.5 ml-1">{errors.phone}</p>}
                                    </div>
                                </div>

                                <div>
                                    <input 
                                        type="email" 
                                        name="email"
                                        value={formData.email}
                                        onChange={handleChange}
                                        className={\`w-full bg-gray-50 border px-5 py-4 rounded-xl font-medium text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-4 transition-all \${errors.email ? 'border-red-200 focus:border-red-400 focus:ring-red-100 bg-red-50/50' : 'border-gray-100 focus:border-[#007c76] focus:ring-[#007c76]/10'}\`}
                                        placeholder="Địa chỉ Email" 
                                        disabled={status === 'sending'}
                                    />
                                    {errors.email && <p className="text-red-500 text-[11px] font-bold mt-1.5 ml-1">{errors.email}</p>}
                                </div>

                                <div>
                                    <textarea 
                                        rows={4} 
                                        name="message"
                                        value={formData.message}
                                        onChange={handleChange}
                                        className={\`w-full bg-gray-50 border px-5 py-4 rounded-xl font-medium text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-4 transition-all resize-none \${errors.message ? 'border-red-200 focus:border-red-400 focus:ring-red-100 bg-red-50/50' : 'border-gray-100 focus:border-[#007c76] focus:ring-[#007c76]/10'}\`}
                                        placeholder="Khóa học hoặc dịch vụ bạn đang quan tâm..."
                                        disabled={status === 'sending'}
                                    ></textarea>
                                    {errors.message && <p className="text-red-500 text-[11px] font-bold mt-1.5 ml-1">{errors.message}</p>}
                                </div>

                                {status === 'error' && (
                                    <div className="p-4 bg-red-50 text-red-600 rounded-xl text-sm font-bold border border-red-100 flex items-center gap-3">
                                        <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                        Có lỗi xảy ra khi gửi. Vui lòng kiểm tra kết nối mạng hoặc gọi hotline trực tiếp.
                                    </div>
                                )}

                                <button 
                                    type="submit" 
                                    disabled={status === 'sending'}
                                    className="w-full bg-[#007c76] text-white py-4 rounded-xl font-black text-sm uppercase tracking-widest hover:bg-[#006963] active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
                                >
                                    {status === 'sending' ? (
                                    <>
                                        <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                        </svg>
                                        <span>Đang gửi...</span>
                                    </>
                                    ) : (
                                    <>
                                        <span>Gửi Yêu Cầu Ngay</span>
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>
                                    </>
                                    )}
                                </button>
                            </form>
                        </>
                    )}
                </div>
            </div>
        </div>
      </section>
    </main>`;

const startIndex = code.indexOf(targetMainStart);
const endIndex = code.lastIndexOf(targetMainEnd) + targetMainEnd.length;

if (startIndex !== -1 && endIndex !== -1) {
    const finalCode = code.substring(0, startIndex) + newMain + code.substring(endIndex);
    fs.writeFileSync('pages/Contact.tsx', finalCode);
    console.log('Patched Contact.tsx successfully');
} else {
    console.error('Could not find boundaries');
}
