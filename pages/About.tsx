
import React from 'react';
import { TEAM, SOCIAL_ICONS } from '../constants';

const About: React.FC = () => {
  const linkedinLink = "https://www.linkedin.com/company/96365912/";

  return (
    <main className="pb-20 animate-fade-in">
      <section className="bg-[#007c76] py-16 md:py-24 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-3xl md:text-5xl font-black text-white mb-6 uppercase tracking-tight">Về Chúng Tôi</h1>
          <p className="text-base md:text-xl text-white/95 max-w-4xl mx-auto leading-relaxed font-medium">
            FAST E-Learning là nền tảng tiên phong tại Việt Nam trong lĩnh vực đào tạo trực tuyến 
            về An toàn thực phẩm và Quản lý chất lượng. Chúng tôi cam kết mang lại giá trị thực tiễn 
            cho cá nhân và doanh nghiệp thông qua các khóa học đạt chuẩn quốc tế.
          </p>
          <div className="w-20 h-1.5 bg-white/30 mx-auto mt-8 rounded-full"></div>
        </div>
      </section>

      <section className="py-16 md:py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 md:gap-16 items-center">
            <div className="order-2 md:order-1">
              <div className="relative rounded-[32px] overflow-hidden shadow-2xl border-4 border-gray-50 group">
                <img 
                  src="https://images.unsplash.com/photo-1556910103-1c02745aae4d?auto=format&fit=crop&q=80&w=800" 
                  alt="Sứ mệnh đào tạo FAST" 
                  className="w-full h-full object-cover transform group-hover:scale-105 transition-transform duration-700"
                  loading="lazy"
                  decoding="async"
                />
                <div className="absolute inset-0 bg-[#007c76]/10 group-hover:bg-transparent transition-colors"></div>
              </div>
            </div>
            <div className="space-y-6 md:space-y-8 order-1 md:order-2">
              <h2 className="text-3xl md:text-4xl font-black text-[#007c76] uppercase tracking-tight">Sứ mệnh của FAST</h2>
              <p className="text-gray-600 text-base md:text-lg leading-relaxed font-medium">
                Nâng cao nhận thức và trình độ chuyên môn của đội ngũ nhân lực trong ngành thực phẩm Việt Nam, 
                góp phần xây dựng một cộng đồng sản xuất và kinh doanh thực phẩm An toàn thực phẩm, bền vững.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4">
                <div className="p-5 bg-gray-50 rounded-2xl border border-gray-100 hover:border-[#007b6f]/30 transition-colors">
                  <h4 className="font-black text-[#007b6f] mb-2 uppercase text-sm tracking-wider">Chuyên nghiệp</h4>
                  <p className="text-sm text-gray-500 font-medium">Đội ngũ chuyên gia giàu kinh nghiệm thực chiến từ các tập đoàn lớn.</p>
                </div>
                <div className="p-5 bg-gray-50 rounded-2xl border border-gray-100 hover:border-[#007b6f]/30 transition-colors">
                  <h4 className="font-black text-[#007b6f] mb-2 uppercase text-sm tracking-wider">Tận tâm</h4>
                  <p className="text-sm text-gray-500 font-medium">Luôn đồng hành cùng học viên đến khi hoàn thành chứng chỉ và áp dụng thành công.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="bg-[#007c76] py-16 md:py-24 text-white relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-white/5 rounded-full blur-3xl -mr-32 -mt-32 pointer-events-none"></div>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="text-center mb-16 space-y-4">
            <h2 className="text-3xl md:text-5xl font-black uppercase tracking-tight">Đội ngũ Chuyên gia</h2>
            <div className="w-16 h-1.5 bg-white/30 mx-auto rounded-full"></div>
            <p className="text-white/80 font-medium max-w-2xl mx-auto">Những người dẫn dắt và định hình chất lượng đào tạo tại FAST</p>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-10 md:gap-12">
            {TEAM.map((member, idx) => (
              <div key={idx} className="flex flex-col items-center group">
                <div className="relative mb-8">
                    <div className="w-48 h-48 md:w-56 md:h-56 rounded-full overflow-hidden border-4 border-white/20 group-hover:border-white transition-all duration-500 relative shadow-2xl z-10">
                    <img 
                        src={member.image} 
                        alt={`Chuyên gia ${member.name}`} 
                        className="w-full h-full object-cover transform group-hover:scale-110 transition-all duration-700" 
                        loading="lazy"
                        decoding="async"
                    />
                    </div>
                    <div className="absolute inset-0 rounded-full border border-white/20 scale-110 group-hover:scale-125 transition-transform duration-500"></div>
                </div>
                <h4 className="text-xl md:text-2xl font-black text-white group-hover:text-green-200 transition-colors uppercase tracking-wide">{member.name}</h4>
                <p className="text-white/70 font-bold text-sm md:text-base mt-2">{member.role}</p>
                <div className="mt-6 flex space-x-3 opacity-0 translate-y-4 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-300">
                   <a href="https://www.facebook.com/hethongquanlychatluongfast" target="_blank" rel="noreferrer" className="w-10 h-10 flex items-center justify-center bg-black/20 rounded-xl hover:bg-black/40 text-white transition-all shadow-lg hover:-translate-y-1">
                     <img src={SOCIAL_ICONS.facebook} alt="Facebook" className="w-5 h-5 object-contain brightness-0 invert" loading="lazy" decoding="async" />
                   </a>
                   <a href={linkedinLink} target="_blank" rel="noreferrer" className="w-10 h-10 flex items-center justify-center bg-black/20 rounded-xl hover:bg-black/40 text-white transition-all shadow-lg hover:-translate-y-1">
                     <img src={SOCIAL_ICONS.linkedin} alt="LinkedIn" className="w-5 h-5 object-contain brightness-0 invert" loading="lazy" decoding="async" />
                   </a>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
};

export default About;
