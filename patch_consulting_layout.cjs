const fs = require('fs');

const code = `import React from 'react'; 
import { Helmet } from 'react-helmet-async';
import { Breadcrumbs } from '../components/Breadcrumbs';
import { CONSULTING_SERVICES } from '../constants';
import { Link } from "react-router-dom";

const Consulting: React.FC = () => {
  const steps = [
    { step: '01', label: 'Khảo sát thực tế', desc: 'Đánh giá hiện trạng cơ sở, nhận diện khoảng cách so với các tiêu chuẩn chuẩn mực.' },
    { step: '02', label: 'Lập phương án', desc: 'Xây dựng kế hoạch tối ưu chi phí, thời gian và thiết lập lộ trình cho nhân sự.' },
    { step: '03', label: 'Đào tạo & Áp dụng', desc: 'Hướng dẫn nhân sự chuẩn hóa quy trình làm việc và hoàn thiện hệ thống hồ sơ.' },
    { step: '04', label: 'Đánh giá & Cấp chứng nhận', desc: 'Đồng hành trong quá trình đánh giá, hỗ trợ xử lý sự cố đến khi nhận chứng chỉ.' }
  ];

  return (
    <main className="bg-white min-h-screen font-sans">
      <Helmet>
        <title>Tư vấn doanh nghiệp | FAST E-Learning</title>
      </Helmet>

      {/* ASYMMETRIC HERO SECTION */}
      <section className="relative pt-24 pb-20 lg:pt-32 lg:pb-32 overflow-hidden bg-[#020617] text-white">
        {/* Background elements */}
        <div className="absolute top-0 right-0 w-full md:w-1/2 h-full opacity-30 lg:opacity-50">
          <div className="absolute inset-0 bg-gradient-to-r from-[#020617] via-[#020617]/80 to-transparent z-10"></div>
          <div className="absolute inset-0 bg-gradient-to-t from-[#020617] to-transparent z-10"></div>
          <img src="https://images.unsplash.com/photo-1552664730-d307ca884978?auto=format&fit=crop&q=80" alt="Consulting Team" className="w-full h-full object-cover object-center" />
        </div>
        <div className="absolute top-1/4 left-0 w-96 h-96 bg-teal-500/20 rounded-full blur-[120px] pointer-events-none"></div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-20">
          <div className="max-w-3xl">
            <div className="mb-8">
              <Breadcrumbs theme="dark" items={[{ label: 'Trang chủ', path: '/' }, { label: 'Tư vấn doanh nghiệp' }]} />
            </div>
            
            <h1 className="text-5xl lg:text-7xl font-black mb-6 tracking-tight leading-[1.1]">
              Nâng tầm <span className="text-teal-400">Chất lượng</span><br/> Doanh nghiệp
            </h1>
            
            <p className="text-lg lg:text-xl text-slate-300 mb-10 max-w-2xl font-medium leading-relaxed">
              Giải pháp chuyên sâu giúp thiết lập hệ thống chuẩn quốc tế, tối ưu hóa quy trình vận hành và chinh phục các giấy chứng nhận khắt khe nhất từ cơ quan chức năng.
            </p>
            
            <div className="flex flex-wrap items-center gap-4">
              <Link to="/lien-he" className="bg-teal-500 hover:bg-teal-400 text-slate-950 font-black px-8 py-4 rounded-xl transition-all shadow-[0_0_20px_rgba(20,184,166,0.3)] hover:shadow-[0_0_30px_rgba(20,184,166,0.5)] active:scale-95">
                Nhận tư vấn ngay
              </Link>
              <a href="#services" className="px-8 py-4 rounded-xl font-bold text-white hover:bg-white/10 transition-all border border-white/20 active:scale-95">
                Khám phá dịch vụ
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* STICKY SIDEBAR SERVICES LAYOUT */}
      <section id="services" className="py-24 lg:py-32 bg-slate-50 border-b border-slate-200 relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16">
            
            {/* Left Sticky Header */}
            <div className="lg:col-span-4 relative">
              <div className="lg:sticky lg:top-32">
                <span className="text-teal-600 font-bold uppercase tracking-widest text-sm mb-3 block">Dịch vụ cốt lõi</span>
                <h2 className="text-4xl lg:text-5xl font-black text-slate-900 mb-6 leading-tight tracking-tight">Giải Pháp <br/>Đo Ni Đóng Giày</h2>
                <div className="w-12 h-1.5 bg-teal-500 mb-6 rounded-full"></div>
                <p className="text-slate-600 font-medium text-lg leading-relaxed">
                  Từ chứng nhận Vệ sinh an toàn thực phẩm đến hệ thống quản lý chuẩn ISO, chúng tôi thiết kế lộ trình riêng biệt phù hợp với quy mô và đặc thù của từng doanh nghiệp.
                </p>
              </div>
            </div>

            {/* Right Scrolling Cards */}
            <div className="lg:col-span-8 space-y-8 lg:space-y-12">
              {CONSULTING_SERVICES.map((service, idx) => (
                <div key={service.id} className="bg-white rounded-[32px] p-8 md:p-12 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100 hover:border-teal-200 hover:shadow-xl transition-all duration-300 group">
                  <div className="flex flex-col md:flex-row gap-8 lg:gap-10">
                    {/* Icon & Number */}
                    <div className="shrink-0">
                      <div className="w-16 h-16 rounded-2xl bg-teal-50 flex items-center justify-center text-teal-600 group-hover:bg-teal-500 group-hover:text-white transition-all duration-300 shadow-inner mb-4">
                         {service.icon === 'shield' ? (
                            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                            </svg>
                          ) : (
                            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                            </svg>
                          )}
                      </div>
                      <div className="text-5xl font-black text-slate-100 group-hover:text-teal-50 transition-colors duration-300">0{idx + 1}</div>
                    </div>

                    {/* Content */}
                    <div className="flex-1">
                      <h3 className="text-2xl md:text-3xl font-black text-slate-900 mb-4 tracking-tight">{service.title}</h3>
                      <p className="text-slate-600 mb-8 font-medium leading-relaxed">{service.description}</p>
                      
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-6 border-t border-slate-100">
                        {service.features.map((feature, i) => (
                          <div key={i} className="flex items-start gap-3">
                            <div className="mt-1 shrink-0 w-5 h-5 rounded-full bg-teal-50 flex items-center justify-center text-teal-600 group-hover:bg-teal-100 transition-colors">
                              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" />
                              </svg>
                            </div>
                            <span className="text-sm font-bold text-slate-700 leading-snug">{feature}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

          </div>
        </div>
      </section>

      {/* VERTICAL TIMELINE PROCESS */}
      <section className="py-24 lg:py-32 bg-white overflow-hidden relative">
        <div className="absolute top-0 right-0 w-[800px] h-[800px] bg-slate-50 rounded-full blur-3xl -mr-[400px] -mt-[400px] pointer-events-none"></div>
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="text-center mb-20">
            <span className="text-teal-600 font-bold uppercase tracking-widest text-sm mb-3 block">Tiến trình chuẩn</span>
            <h2 className="text-4xl md:text-5xl font-black text-slate-900 mb-6 tracking-tight">Lộ Trình Triển Khai</h2>
            <p className="text-slate-500 font-medium text-lg max-w-2xl mx-auto">Từng bước minh bạch, bài bản và cam kết đồng hành cùng doanh nghiệp cho đến khi nhận được chứng nhận.</p>
          </div>

          <div className="relative">
            {/* Center Line for Desktop */}
            <div className="hidden md:block absolute left-1/2 top-0 bottom-0 w-1 bg-slate-100 -translate-x-1/2 rounded-full"></div>
            {/* Left Line for Mobile */}
            <div className="md:hidden absolute left-6 top-8 bottom-8 w-1 bg-slate-100 rounded-full"></div>

            <div className="space-y-12 md:space-y-0">
              {steps.map((item, idx) => {
                const isEven = idx % 2 === 0;
                return (
                  <div key={idx} className={\`relative flex flex-col md:flex-row items-center \${isEven ? 'md:flex-row-reverse' : ''} md:h-48\`}>
                    {/* Mobile Node */}
                    <div className="md:hidden absolute left-6 top-6 w-8 h-8 -translate-x-1/2 bg-white border-4 border-teal-500 rounded-full shadow-md z-10 flex items-center justify-center">
                       <div className="w-2 h-2 bg-teal-500 rounded-full"></div>
                    </div>

                    {/* Desktop Node */}
                    <div className="hidden md:flex absolute left-1/2 w-12 h-12 -translate-x-1/2 bg-white border-4 border-teal-500 rounded-full shadow-lg z-10 items-center justify-center">
                      <span className="font-black text-teal-600 text-sm">{item.step}</span>
                    </div>

                    {/* Content Box */}
                    <div className={\`w-full pl-16 md:pl-0 md:w-1/2 \${isEven ? 'md:pl-16 lg:pl-24' : 'md:pr-16 lg:pr-24 text-left md:text-right'}\`}>
                      <div className={\`bg-slate-50 p-6 md:p-8 rounded-[24px] border border-slate-100 hover:shadow-[0_10px_30px_rgb(0,0,0,0.06)] hover:border-teal-200 transition-all duration-300 group relative overflow-hidden\`}>
                        <div className={\`absolute top-0 w-1.5 h-full bg-teal-500 transition-all \${isEven ? 'left-0' : 'right-0 hidden md:block'}\`}></div>
                        <div className="md:hidden absolute top-0 left-0 w-1.5 h-full bg-teal-500 transition-all"></div>
                        
                        <div className={\`text-5xl font-black text-slate-200 mb-3 group-hover:text-teal-100 transition-colors \${isEven ? '' : 'md:text-right'}\`}>{item.step}</div>
                        <h4 className="text-xl font-black text-slate-900 mb-3">{item.label}</h4>
                        <p className="text-slate-600 font-medium leading-relaxed">{item.desc}</p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {/* FULL WIDTH CTA */}
      <section className="relative py-24 bg-[#064e3b] overflow-hidden">
        {/* Subtle pattern background */}
        <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)', backgroundSize: '32px 32px' }}></div>
        <div className="absolute top-0 left-1/2 w-full h-full bg-gradient-to-b from-transparent to-black/20 -translate-x-1/2 pointer-events-none"></div>
        
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10">
          <h2 className="text-4xl md:text-5xl font-black text-white mb-6 leading-tight tracking-tight">Sẵn Sàng Nâng Tầm Doanh Nghiệp?</h2>
          <p className="text-teal-100/90 text-lg md:text-xl font-medium mb-10 max-w-2xl mx-auto leading-relaxed">
            Liên hệ ngay với chuyên gia FAST để được phân tích thực trạng và nhận bản kế hoạch tối ưu chi phí, hoàn toàn miễn phí.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <a href="tel:0927002668" className="w-full sm:w-auto bg-white text-teal-950 py-4 px-10 rounded-2xl font-black text-lg hover:scale-105 transition-all duration-300 flex items-center justify-center gap-3 shadow-[0_10px_30px_rgba(255,255,255,0.15)]">
              <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M20.01 15.38c-1.23 0-2.42-.2-3.53-.56a.977.977 0 00-1.01.24l-1.57 1.97c-2.83-1.35-5.48-3.9-6.89-6.83l1.95-1.66c.27-.28.35-.67.24-1.02-.37-1.11-.56-2.3-.56-3.53 0-.54-.45-.99-.99-.99H4.19C3.65 3 3 3.24 3 3.99 3 13.28 10.73 21 20.01 21c.71 0 .99-.63.99-1.18v-3.45c0-.54-.45-.99-.99-.99z"/></svg>
              0927 002 668
            </a>
            <Link to="/lien-he" className="w-full sm:w-auto bg-white/10 text-white border border-white/20 py-4 px-10 rounded-2xl font-black text-lg hover:bg-white/20 transition-colors flex items-center justify-center backdrop-blur-sm">
              Gửi yêu cầu ngay
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
};

export default Consulting;
`
fs.writeFileSync('pages/Consulting.tsx', code);
