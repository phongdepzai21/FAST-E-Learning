const fs = require('fs');
const newContent = `import React from 'react'; 
import { Helmet } from 'react-helmet-async';
import { Breadcrumbs } from '../components/Breadcrumbs';
import { CONSULTING_SERVICES } from '../constants';
import { Link } from "react-router-dom";

const Consulting: React.FC = () => {
  return (
    <main className="bg-[#f8fafc] min-h-screen pb-24">
      <Helmet>
        <title>Tư vấn doanh nghiệp | FAST E-Learning</title>
      </Helmet>

      {/* Hero Section */}
      <section className="relative pt-20 pb-32 overflow-hidden bg-white">
        <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-gray-200 to-transparent"></div>
        <div className="absolute top-0 right-0 w-[800px] h-[800px] bg-teal-50 rounded-full blur-3xl -mr-[400px] -mt-[400px] pointer-events-none opacity-50"></div>
        
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 text-center">
          <div className="flex justify-center mb-8">
            <Breadcrumbs theme="dark" items={[{ label: 'Trang chủ', path: '/' }, { label: 'Tư vấn doanh nghiệp' }]} />
          </div>
          
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-teal-50 border border-teal-100 text-teal-800 text-sm font-bold uppercase tracking-widest mb-8">
            <span className="w-2 h-2 rounded-full bg-teal-500 animate-pulse"></span>
            Giải pháp chuyên sâu
          </div>

          <h1 className="text-4xl md:text-6xl lg:text-7xl font-black text-slate-900 uppercase tracking-tighter leading-tight mb-8">
            <span className="block mb-2">Chuẩn Hóa Quy Trình</span>
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-teal-600 to-emerald-500">
              Vươn Tầm Quốc Tế
            </span>
          </h1>

          <p className="text-lg md:text-xl text-slate-500 max-w-3xl mx-auto font-medium leading-relaxed mb-12">
            FAST mang đến giải pháp toàn diện giúp doanh nghiệp xây dựng hệ thống quản lý chất lượng vững chắc, 
            vượt qua mọi kỳ đánh giá và khẳng định uy tín thương hiệu trên thị trường.
          </p>
        </div>
      </section>

      {/* Services Section */}
      <section className="relative z-20 -mt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {CONSULTING_SERVICES.map((service, idx) => (
              <div key={service.id} className="bg-white rounded-[32px] p-8 md:p-12 shadow-[0_20px_40px_-15px_rgba(0,0,0,0.05)] border border-slate-100 group hover:-translate-y-2 transition-all duration-500 flex flex-col h-full">
                
                <div className="flex items-start justify-between mb-10">
                  <div className="w-20 h-20 rounded-2xl bg-slate-50 flex items-center justify-center text-teal-600 group-hover:bg-teal-600 group-hover:text-white transition-colors duration-500 shadow-inner">
                    {service.icon === 'shield' ? (
                      <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                      </svg>
                    ) : (
                      <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                      </svg>
                    )}
                  </div>
                  <span className="text-6xl font-black text-slate-50 opacity-50 group-hover:opacity-100 group-hover:text-teal-50 transition-colors duration-500">
                    0{idx + 1}
                  </span>
                </div>

                <h2 className="text-3xl md:text-4xl font-black text-slate-900 mb-6 tracking-tight leading-tight">
                  {service.title}
                </h2>
                
                <p className="text-slate-500 text-base md:text-lg mb-10 font-medium leading-relaxed">
                  {service.description}
                </p>

                <div className="mt-auto">
                  <div className="h-px w-full bg-slate-100 mb-8"></div>
                  <ul className="space-y-4 mb-10">
                    {service.features.map((feature, i) => (
                      <li key={i} className="flex items-start gap-4">
                        <div className="w-6 h-6 rounded-full bg-teal-50 flex items-center justify-center shrink-0 mt-0.5 group-hover:bg-teal-100 transition-colors">
                          <svg className="w-3.5 h-3.5 text-teal-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" />
                          </svg>
                        </div>
                        <span className="text-slate-700 font-bold leading-relaxed">{feature}</span>
                      </li>
                    ))}
                  </ul>

                  <Link to="/lien-he" className="flex items-center justify-center w-full bg-slate-900 text-white py-5 px-8 rounded-2xl font-black text-sm md:text-base hover:bg-teal-600 transition-all duration-300 uppercase tracking-widest gap-3 shadow-[0_10px_20px_-10px_rgba(0,0,0,0.2)] hover:shadow-[0_10px_20px_-10px_rgba(13,148,136,0.4)]">
                    Nhận Báo Giá Ngay
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 8l4 4m0 0l-4 4m4-4H3" /></svg>
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Process Section - Sophisticated Timeline */}
      <section className="pt-32 pb-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-20">
            <h2 className="text-3xl md:text-5xl font-black text-slate-900 mb-6 uppercase tracking-tight">Quy Trình Triển Khai</h2>
            <div className="w-16 h-1.5 bg-teal-600 mx-auto rounded-full mb-6"></div>
            <p className="text-slate-500 font-medium text-lg max-w-2xl mx-auto">
              Lộ trình bài bản, tinh gọn, cam kết đồng hành cùng doanh nghiệp cho đến khi đạt kết quả chứng nhận.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-8">
            {[
              { step: '01', label: 'Khảo sát thực tế', desc: 'Đánh giá hiện trạng cơ sở, nhận diện khoảng cách so với tiêu chuẩn.' },
              { step: '02', label: 'Lập phương án', desc: 'Xây dựng kế hoạch tối ưu chi phí, thời gian và nguồn lực.' },
              { step: '03', label: 'Đào tạo & Áp dụng', desc: 'Hướng dẫn nhân sự chuẩn hóa quy trình và hoàn thiện hồ sơ.' },
              { step: '04', label: 'Đánh giá & Cấp chứng nhận', desc: 'Hỗ trợ xử lý điểm không phù hợp đến khi nhận chứng chỉ.' }
            ].map((item, i) => (
              <div key={i} className="relative group bg-white rounded-[24px] p-8 border border-slate-100 hover:border-teal-200 transition-all duration-300 shadow-sm hover:shadow-xl">
                <div className="text-6xl font-black text-slate-50 group-hover:text-teal-50 transition-colors duration-300 mb-6">
                  {item.step}
                </div>
                <h4 className="text-xl font-black text-slate-900 mb-4">{item.label}</h4>
                <p className="text-slate-500 font-medium leading-relaxed">{item.desc}</p>
                
                {/* Connecting Line (Hidden on Mobile, Visible on Desktop) */}
                {i < 3 && (
                  <div className="hidden lg:block absolute top-16 -right-4 w-8 h-[2px] bg-slate-100 group-hover:bg-teal-200 transition-colors duration-300 z-10"></div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-slate-900 rounded-[40px] p-10 md:p-16 text-center relative overflow-hidden shadow-2xl">
          <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1557804506-669a67965ba0?auto=format&fit=crop&q=80')] opacity-10 bg-cover bg-center mix-blend-overlay"></div>
          <div className="relative z-10">
            <h2 className="text-3xl md:text-5xl font-black text-white mb-6 tracking-tight">Cần giải pháp riêng biệt?</h2>
            <p className="text-slate-300 mb-10 text-lg md:text-xl font-medium max-w-2xl mx-auto">
              Mỗi doanh nghiệp đều có đặc thù riêng. Hãy để chuyên gia của chúng tôi hỗ trợ tư vấn hoàn toàn miễn phí.
            </p>
            <div className="flex flex-col sm:flex-row justify-center items-center gap-4">
              <a href="tel:0927002668" className="w-full sm:w-auto bg-teal-500 text-slate-950 py-4 px-8 rounded-2xl font-black text-sm md:text-base hover:bg-teal-400 transition-all uppercase tracking-widest flex items-center justify-center gap-3">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" /></svg>
                0927 002 668
              </a>
              <Link to="/lien-he" className="w-full sm:w-auto bg-white/10 text-white backdrop-blur-md border border-white/20 py-4 px-8 rounded-2xl font-black text-sm md:text-base hover:bg-white/20 transition-all uppercase tracking-widest">
                Để Lại Thông Tin
              </Link>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
};

export default Consulting;
`;

fs.writeFileSync('pages/Consulting.tsx', newContent);
