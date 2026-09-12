const fs = require('fs');
let code = fs.readFileSync('pages/FAQ.tsx', 'utf8');

const targetMain = `<main className="min-h-screen bg-[#f8fafc] font-sans selection:bg-[#007c76]/20 selection:text-[#007c76] pt-24 pb-32">
      <Helmet>
        <title>Hỏi Đáp (FAQ) | FAST E-Learning</title>
      </Helmet>
      <section className="px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto">
        <div className="text-center mb-12">
            <div className="flex justify-center mb-6">
              <Breadcrumbs theme="light" items={[{ label: 'Trang chủ', path: '/' }, { label: 'Hỏi đáp (FAQ)' }]} />
            </div>
            <h1 className="text-4xl md:text-5xl font-black text-gray-900 tracking-tighter mb-4">Câu Hỏi Thường Gặp <span className="text-[#007c76]">(FAQ)</span></h1>
            <p className="text-gray-500 font-medium text-lg">Giải đáp nhanh những thắc mắc phổ biến về chứng chỉ ISO/HACCP và lộ trình đào tạo.</p>
        </div>`;

const newMain = `<main className="min-h-screen bg-[#f8fafc] font-sans selection:bg-teal-500/20 selection:text-teal-700 pb-32">
      <Helmet>
        <title>Hỏi Đáp (FAQ) | FAST E-Learning</title>
      </Helmet>
      
      {/* Hero Section */}
      <section className="relative pt-20 pb-24 md:pb-32 overflow-hidden bg-white border-b border-slate-100">
        <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-teal-50 rounded-full blur-3xl -mr-[300px] -mt-[300px] pointer-events-none"></div>
        <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-emerald-50 rounded-full blur-3xl -ml-[300px] -mb-[300px] pointer-events-none"></div>
        
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 text-center">
          <div className="flex justify-center mb-8">
            <Breadcrumbs theme="dark" items={[{ label: 'Trang chủ', path: '/' }, { label: 'Hỏi đáp (FAQ)' }]} />
          </div>
          
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-slate-50 border border-slate-200 text-slate-700 text-sm font-bold uppercase tracking-widest mb-8 shadow-sm">
            <span className="text-teal-600">💡</span> Trung tâm hỗ trợ
          </div>

          <h1 className="text-4xl md:text-5xl lg:text-6xl font-black text-slate-900 uppercase tracking-tighter mb-6">
            Câu Hỏi <span className="text-transparent bg-clip-text bg-gradient-to-r from-teal-600 to-emerald-500">Thường Gặp</span>
          </h1>
          <p className="text-lg md:text-xl text-slate-500 max-w-2xl mx-auto font-medium leading-relaxed">
            Giải đáp chi tiết mọi thắc mắc của bạn về lộ trình học tập, chứng chỉ ISO/HACCP và dịch vụ tư vấn doanh nghiệp tại FAST.
          </p>
        </div>
      </section>

      {/* FAQ Accordion Section */}
      <section className="px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto relative z-20 -mt-10">`;

code = code.replace(targetMain, newMain);

const targetAccordion = `                return (
                    <div 
                        key={index} 
                        className={\`border rounded-2xl overflow-hidden transition-all duration-300 \${isOpen ? 'bg-white border-[#007c76]/20 shadow-[0_8px_30px_rgb(0,124,118,0.08)]' : 'bg-transparent border-gray-200 hover:border-[#007c76]/30'}\`}
                    >
                        <button 
                            className="w-full text-left px-6 py-5 flex items-center justify-between gap-4 focus:outline-none"
                            onClick={() => setOpenFaq(isOpen ? null : index)}
                        >
                            <span className={\`font-bold text-lg transition-colors \${isOpen ? 'text-[#007c76]' : 'text-gray-900'}\`}>
                                {faq.question}
                            </span>
                            <div className={\`shrink-0 w-8 h-8 rounded-full flex items-center justify-center transition-all duration-300 \${isOpen ? 'bg-[#007c76]/10 text-[#007c76] rotate-180' : 'bg-gray-100 text-gray-500'}\`}>
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 9l-7 7-7-7" />
                                </svg>
                            </div>
                        </button>
                        
                        <div 
                            className={\`overflow-hidden transition-all duration-300 ease-in-out \${isOpen ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'}\`}
                        >
                            <div className="px-6 pb-6 pt-2">
                                <div className="p-4 bg-gray-50/50 rounded-xl border border-gray-100">
                                    <p className="text-gray-600 leading-relaxed font-medium">
                                        {faq.answer}
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                );`;

const newAccordion = `                return (
                    <div 
                        key={index} 
                        className={\`rounded-[24px] overflow-hidden transition-all duration-300 border \${isOpen ? 'bg-white border-teal-200 shadow-[0_20px_40px_-15px_rgba(13,148,136,0.1)]' : 'bg-white border-slate-100 hover:border-teal-200/50 hover:shadow-sm'}\`}
                    >
                        <button 
                            className="w-full text-left px-6 md:px-8 py-6 flex items-center justify-between gap-6 focus:outline-none"
                            onClick={() => setOpenFaq(isOpen ? null : index)}
                        >
                            <span className={\`font-black text-lg md:text-xl transition-colors leading-snug \${isOpen ? 'text-teal-700' : 'text-slate-800'}\`}>
                                {faq.question}
                            </span>
                            <div className={\`shrink-0 w-10 h-10 rounded-2xl flex items-center justify-center transition-all duration-300 \${isOpen ? 'bg-teal-500 text-white rotate-180 shadow-md' : 'bg-slate-50 text-slate-400'}\`}>
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M19 9l-7 7-7-7" />
                                </svg>
                            </div>
                        </button>
                        
                        <div 
                            className={\`overflow-hidden transition-all duration-300 ease-in-out \${isOpen ? 'max-h-[500px] opacity-100' : 'max-h-0 opacity-0'}\`}
                        >
                            <div className="px-6 md:px-8 pb-8 pt-2">
                                <div className="p-6 bg-slate-50 rounded-2xl border border-slate-100 relative">
                                    <div className="absolute top-0 left-6 w-12 h-1 bg-teal-500 rounded-b-full"></div>
                                    <p className="text-slate-600 leading-relaxed font-medium text-base md:text-lg">
                                        {faq.answer}
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                );`;
                
code = code.replace(targetAccordion, newAccordion);

const targetBottom = `        </div>
      </section>
    </main>`;

const newBottom = `        </div>
      </section>

      {/* CTA Bottom Section */}
      <section className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 mt-16">
        <div className="bg-slate-900 rounded-[32px] p-8 md:p-12 text-center relative overflow-hidden shadow-2xl">
          <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1557804506-669a67965ba0?auto=format&fit=crop&q=80')] opacity-10 bg-cover bg-center mix-blend-overlay"></div>
          <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-8">
            <div className="text-left">
              <h2 className="text-2xl md:text-3xl font-black text-white mb-2 tracking-tight">Bạn không tìm thấy câu trả lời?</h2>
              <p className="text-slate-400 font-medium text-base">Đội ngũ chuyên gia của FAST luôn sẵn sàng hỗ trợ bạn 24/7.</p>
            </div>
            <a href="tel:0927002668" className="w-full md:w-auto bg-teal-500 text-slate-950 py-4 px-8 rounded-2xl font-black text-sm md:text-base hover:bg-teal-400 transition-all uppercase tracking-widest shrink-0 shadow-lg shadow-teal-500/20 flex items-center justify-center gap-2">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" /></svg>
              Liên hệ ngay
            </a>
          </div>
        </div>
      </section>
    </main>`;

code = code.replace(targetBottom, newBottom);

fs.writeFileSync('pages/FAQ.tsx', code);
