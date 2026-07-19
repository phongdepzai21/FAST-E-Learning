
import React from 'react';
// Fix: Standardize Link import from react-router-dom
import { Link } from "react-router-dom";

const Hero: React.FC = () => {
  const heroBaseUrl = "https://images.unsplash.com/photo-1504674900247-0877df9cc836";
  
  // OPTIMIZATION: Explicitly requested WebP format and slightly lower quality for faster load
  const srcSet = `
    ${heroBaseUrl}?fm=webp&fit=crop&q=50&w=640 640w,
    ${heroBaseUrl}?fm=webp&fit=crop&q=50&w=1024 1024w,
    ${heroBaseUrl}?fm=webp&fit=crop&q=50&w=1920 1920w
  `;

  return (
    <section className="relative min-h-[500px] md:h-[700px] overflow-hidden flex items-center bg-gray-900">
      <img
        src={`${heroBaseUrl}?fm=webp&fit=crop&q=50&w=1920`}
        srcSet={srcSet}
        sizes="100vw"
        alt="Đào tạo An toàn thực phẩm chuyên nghiệp"
        className="absolute inset-0 w-full h-full object-cover opacity-80"
        // OPTIMIZATION: Critical LCP element must be eager loaded
        loading="eager"
        decoding="sync"
        // @ts-ignore
        fetchPriority="high"
      />
      <div className="absolute inset-0 bg-gradient-to-r from-black/90 via-black/40 to-transparent"></div>
      
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full py-12 md:py-0">
        <div className="max-w-4xl text-white space-y-6 md:space-y-10 animate-fade-in">
          <div className="space-y-4 md:space-y-6">
            <div className="flex items-center space-x-3">
              <span className="inline-block bg-primary text-primary-foreground px-3 py-1.5 md:px-5 md:py-2 text-[10px] md:text-sm font-black uppercase tracking-[0.2em] rounded-full shadow-lg shadow-primary/30">
                Nền tảng FAST E-Learning
              </span>
            </div>
            
            <h1 className="flex flex-col text-3xl sm:text-5xl md:text-6xl lg:text-7xl font-black uppercase tracking-tighter leading-tight space-y-1 md:space-y-2">
              <span className="text-white leading-none">
                Nền Tảng
              </span>
              <span className="text-primary leading-none">
                Đào Tạo
              </span>
              <span className="text-white leading-none">
                Chuyên Nghiệp
              </span>
            </h1>

            <p className="text-base sm:text-lg md:text-2xl text-gray-200 font-medium leading-relaxed max-w-2xl md:max-w-3xl pt-4">
              Giải pháp học trực tuyến chuẩn quốc tế ISO, HACCP dành cho cá nhân và doanh nghiệp thực phẩm tại Việt Nam.
            </p>
          </div>
          
          <div className="flex flex-col sm:flex-row gap-4 md:gap-6 pt-2">
            <Link 
              to="/account" 
              className="group bg-primary text-primary-foreground px-8 py-4 md:px-14 md:py-6 rounded-2xl font-black uppercase tracking-[0.2em] text-sm md:text-base shadow-2xl shadow-primary/40 hover:brightness-110 hover:-translate-y-1 transition-all flex items-center justify-center gap-3"
            >
              ĐĂNG NHẬP NGAY
            </Link>
          </div>
        </div>
      </div>
      
      <div className="absolute bottom-0 right-0 w-1/3 h-full bg-gradient-to-l from-primary/10 to-transparent pointer-events-none"></div>
    </section>
  );
};

export default Hero;
