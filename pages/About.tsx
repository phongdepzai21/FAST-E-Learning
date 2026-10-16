import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import { Breadcrumbs } from '../components/Breadcrumbs';
import { TEAM, SOCIAL_ICONS } from '../constants';
import { 
  Award, 
  Target, 
  Shield, 
  Key, 
  CheckCircle2, 
  Zap, 
  Compass, 
  Users, 
  BookOpen, 
  Heart, 
  Check, 
  Building,
  TrendingUp,
  Cpu,
  Layers
} from 'lucide-react';

const About: React.FC = () => {
  const linkedinLink = "https://www.linkedin.com/company/96365912/";
  const [clientSlide, setClientSlide] = useState<number>(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setClientSlide(prev => (prev === 0 ? 1 : 0));
    }, 6000);
    return () => clearInterval(timer);
  }, []);

  return (
    <main className="pb-20 animate-fade-in bg-slate-50/50">
      <Helmet>
        <title>Về Chúng Tôi | FAST Consulting</title>
      </Helmet>

      {/* Hero Banner Section */}
      <section className="bg-gradient-to-br from-[#007c76] to-[#005f5a] py-20 md:py-28 text-white relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_30%,rgba(255,255,255,0.08),transparent)] pointer-events-none"></div>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10">
          <div className="flex justify-center mb-6">
            <Breadcrumbs theme="dark" items={[{ label: 'Trang chủ', path: '/' }, { label: 'Về chúng tôi' }]} />
          </div>
          <h1 className="text-3xl md:text-6xl font-black text-white mb-6 uppercase tracking-tight">
            VỀ CHÚNG TÔI
          </h1>
          <p className="text-lg md:text-2xl text-[#e6f4f3] max-w-4xl mx-auto leading-relaxed font-semibold">
            FAST Consulting — Đơn vị tư vấn quản lý vận hành chuyên sâu cho ngành F&B và Nông nghiệp công nghệ cao hàng đầu tại Việt Nam.
          </p>
          <div className="w-20 h-1.5 bg-amber-400 mx-auto mt-8 rounded-full shadow-sm"></div>
        </div>
      </section>

      {/* Section 1: Thư ngỏ của Giám Đốc (Mrs. Dung Trần) */}
      <section className="py-16 md:py-24 bg-white relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 md:gap-16 items-center">
            {/* Left Column: Image & Bio */}
            <div className="lg:col-span-5 flex flex-col items-center">
              <div className="relative group">
                <div className="absolute inset-0 bg-gradient-to-tr from-[#007c76] to-cyan-400 rounded-3xl rotate-3 scale-102 blur-sm opacity-20 group-hover:rotate-6 transition-all duration-500"></div>
                <div className="relative rounded-3xl overflow-hidden border-4 border-gray-50 shadow-2xl z-10 w-full max-w-[380px] aspect-[4/5] bg-slate-100">
                  <img 
                    src="https://2fast.com.vn/wp-content/uploads/2024/10/av_01-1.jpg" 
                    alt="Mrs. Dung Trần - Founder & Lead Auditor" 
                    className="w-full h-full object-cover transform group-hover:scale-105 transition-transform duration-700"
                    loading="lazy"
                    decoding="async"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/10 to-transparent flex flex-col justify-end p-6">
                    <span className="text-amber-400 text-xs font-black uppercase tracking-widest mb-1">Founder & Lead Auditor</span>
                    <h3 className="text-white text-xl font-black uppercase tracking-wide">Mrs. Dung Trần</h3>
                    <p className="text-slate-300 text-xs font-medium">BSI Training Academy Certified FSSC 22000 Lead Auditor</p>
                  </div>
                </div>
              </div>

              {/* Badges and Qualifications Grid */}
              <div className="grid grid-cols-2 gap-2 mt-6 w-full max-w-[380px]">
                <div className="bg-slate-50 border border-slate-100 rounded-xl p-3 text-center">
                  <span className="block text-xs font-black text-[#007c76] uppercase tracking-wider">ISO 22000</span>
                  <span className="text-[10px] text-slate-500 font-bold">Lead Auditor</span>
                </div>
                <div className="bg-slate-50 border border-slate-100 rounded-xl p-3 text-center">
                  <span className="block text-xs font-black text-[#007c76] uppercase tracking-wider">ISO 27001</span>
                  <span className="text-[10px] text-slate-500 font-bold">Lead Auditor</span>
                </div>
                <div className="bg-slate-50 border border-slate-100 rounded-xl p-3 text-center col-span-2">
                  <span className="block text-xs font-black text-[#007c76] uppercase tracking-wider">FSSC 22000 & BRCGS</span>
                  <span className="text-[10px] text-slate-500 font-bold">Chuyên gia tư vấn & Đánh giá cấp cao</span>
                </div>
              </div>
            </div>

            {/* Right Column: Message details */}
            <div className="lg:col-span-7 space-y-6 md:space-y-8 text-slate-800">
              <span className="text-[#007c76] text-xs md:text-sm font-black uppercase tracking-widest bg-emerald-50 px-3.5 py-1.5 rounded-full inline-block">
                Kính gửi Quý Đối tác và Khách hàng
              </span>
              <h2 className="text-2xl md:text-4xl font-black text-slate-900 leading-tight uppercase">
                Giao Thoa Giữa Chuẩn Mực Quốc Tế & Thực Tiễn Thực Chiến
              </h2>
              
              <div className="space-y-4 text-slate-600 text-sm md:text-base leading-relaxed font-medium">
                <p>
                  Trong bối cảnh thị trường toàn cầu hóa đầy biến động, an toàn thực phẩm và hiệu quả vận hành không còn là "lựa chọn", mà đã trở thành sinh mệnh sống còn của doanh nghiệp. Tuy nhiên, việc đạt được các tiêu chuẩn quốc tế chưa bao giờ là dễ dàng.
                </p>
                <p>
                  FAST Consulting ra đời từ sự giao thoa đặc biệt giữa hai góc nhìn cốt lõi:
                </p>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 my-6">
                  <div className="p-4 bg-emerald-50/50 border-l-4 border-[#007c76] rounded-r-xl">
                    <strong className="block text-[#007c76] text-sm uppercase mb-1">Góc nhìn Khắt khe, Chuẩn mực</strong>
                    <span className="text-xs text-slate-600">Của một Chuyên gia đánh giá trưởng (Lead Auditor) quốc tế lâu năm.</span>
                  </div>
                  <div className="p-4 bg-cyan-50/50 border-l-4 border-cyan-500 rounded-r-xl">
                    <strong className="block text-cyan-600 text-sm uppercase mb-1">Góc nhìn Thấu cảm, Thực tế</strong>
                    <span className="text-xs text-slate-600">Của một người trực tiếp quản lý và vận hành nhà máy F&B thực chiến.</span>
                  </div>
                </div>

                <p className="font-bold text-slate-800 border-l-2 border-amber-500 pl-3">
                  "Chúng tôi không mang đến cho bạn những tập hồ sơ dày cộp chỉ để 'đối phó' với các kỳ kiểm tra. Chúng tôi đến để cùng bạn thực hiện chiến lược 'Breakdown to Breakthrough' — phá vỡ những điểm nghẽn cũ để nâng tầm doanh nghiệp."
                </p>
              </div>

              <div className="pt-4 flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-[#007c76]/10 flex items-center justify-center text-[#007c76]">
                  <Award className="w-6 h-6" />
                </div>
                <div>
                  <h5 className="font-black text-slate-900 uppercase text-sm tracking-wider">Trần Thị Mỹ Dung</h5>
                  <p className="text-xs text-slate-500 font-bold">Giám Đốc, FAST Consulting</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Section 2: Core Philosophy (Lean - Kaizen - Simply - Efficient) */}
      <section className="py-16 md:py-24 bg-slate-900 text-white relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_20%,rgba(0,124,118,0.15),transparent)] pointer-events-none"></div>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="text-center mb-16 space-y-4">
            <span className="text-emerald-400 text-xs font-black uppercase tracking-widest">Triết Lý Của Chúng Tôi</span>
            <h2 className="text-3xl md:text-5xl font-black uppercase tracking-tight text-white">4 Trụ Cột Vận Hành FAST</h2>
            <p className="text-slate-400 max-w-2xl mx-auto text-sm md:text-base font-medium">Kim chỉ nam chuyển hóa mọi tiêu chuẩn quốc tế phức tạp thành giải pháp tinh gọn, dễ làm.</p>
            <div className="w-16 h-1 bg-amber-400 mx-auto rounded-full mt-4"></div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {[
              {
                title: 'Tinh Gọn (Lean)',
                desc: 'Loại bỏ lãng phí, tối ưu hóa mọi nguồn lực hiện có để tạo ra giá trị thiết thực nhất.',
                icon: <Zap className="w-6 h-6 text-emerald-400" />,
                badge: 'LEAN'
              },
              {
                title: 'Cải Tiến (Kaizen)',
                desc: 'Không ngừng thay đổi, nâng cấp và cải tiến nhỏ mỗi ngày để kiến tạo bước nhảy vọt lớn.',
                icon: <TrendingUp className="w-6 h-6 text-orange-400" />,
                badge: 'KAIZEN'
              },
              {
                title: 'Đơn Giản (Simply)',
                desc: 'Chuyển hóa mọi bộ quy trình, tiêu chuẩn phức tạp thành hướng dẫn trực quan, dễ làm.',
                icon: <Compass className="w-6 h-6 text-cyan-400" />,
                badge: 'SIMPLY'
              },
              {
                title: 'Hiệu Quả (Efficient)',
                desc: 'Vận hành dựa trên kết quả thực tiễn, số liệu rõ ràng và có thể đo lường chính xác.',
                icon: <CheckCircle2 className="w-6 h-6 text-amber-400" />,
                badge: 'EFFICIENT'
              }
            ].map((pillar, idx) => (
              <div key={idx} className="bg-slate-950/70 border border-slate-800 rounded-3xl p-6 space-y-4 hover:border-emerald-500/40 hover:bg-slate-950 transition-all duration-300 group flex flex-col justify-between">
                <div className="space-y-4">
                  <div className="w-12 h-12 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-center group-hover:scale-110 transition-transform">
                    {pillar.icon}
                  </div>
                  <h3 className="text-lg font-black text-white uppercase tracking-wide group-hover:text-emerald-400 transition-colors">
                    {pillar.title}
                  </h3>
                  <p className="text-slate-400 text-xs md:text-sm leading-relaxed font-semibold">
                    {pillar.desc}
                  </p>
                </div>
                <div className="pt-4 border-t border-slate-800/40 text-[10px] font-black tracking-widest text-[#007c76]">
                  {pillar.badge}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Section 3: Operating Values & Quality Policy */}
      <section className="py-16 md:py-24 bg-white relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            {/* Left Block: Operating Values list */}
            <div className="space-y-6 md:space-y-8">
              <span className="text-[#007c76] text-xs font-black uppercase tracking-widest bg-emerald-50 px-3.5 py-1.5 rounded-full inline-block">
                Chính Sách Chất Lượng
              </span>
              <h2 className="text-2xl md:text-4xl font-black text-slate-900 leading-tight uppercase">
                Cam Kết Mang Lại Giá Trị Bền Vững Cho Khách Hàng
              </h2>
              <p className="text-slate-500 font-medium text-sm md:text-base leading-relaxed">
                Chúng tôi không chỉ đồng hành để doanh nghiệp đạt chuẩn thẩm định chất lượng, mà còn xây dựng một "hệ điều hành" doanh nghiệp vững chắc, nơi văn hóa cải tiến liên tục thấm sâu vào từng nhân sự.
              </p>

              <div className="space-y-4">
                {[
                  {
                    title: 'Sự Thấu Cảm (Empathy)',
                    desc: 'Chúng tôi lắng nghe tận cùng để hiểu rõ "điểm nghẽn" thực tế của doanh nghiệp trước khi đưa ra giải pháp.',
                    color: 'bg-emerald-50 text-[#007c76]'
                  },
                  {
                    title: 'Sự Tinh Gọn (Lean)',
                    desc: 'Chuyển hóa các tiêu chuẩn kỹ thuật phức tạp thành các hành động đơn giản, dễ vận hành cho nhân viên trực tiếp sản xuất.',
                    color: 'bg-cyan-50 text-cyan-600'
                  },
                  {
                    title: 'Sự Cam Kết (Commitment)',
                    desc: 'Đồng hành kề vai sát cánh cùng đội ngũ nhân sự doanh nghiệp cho đến khi hệ thống đạt hiệu quả bứt phá thực sự.',
                    color: 'bg-amber-50 text-amber-600'
                  }
                ].map((item, idx) => (
                  <div key={idx} className="flex gap-4 p-4 rounded-2xl bg-slate-50 border border-slate-100 hover:shadow-md transition-shadow">
                    <div className={`w-10 h-10 rounded-xl shrink-0 flex items-center justify-center font-black ${item.color}`}>
                      {idx + 1}
                    </div>
                    <div>
                      <h4 className="font-black text-slate-900 text-sm md:text-base uppercase tracking-wider">{item.title}</h4>
                      <p className="text-xs md:text-sm text-slate-500 leading-relaxed font-semibold mt-1">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Right Block: Standardized parameters */}
            <div className="bg-slate-50 border border-slate-150 rounded-3xl p-6 md:p-8 space-y-6">
              <h3 className="text-lg font-black text-slate-900 uppercase tracking-wide border-b border-slate-200 pb-3">
                Tiêu Chí Hoạt Động Của Chuyên Gia FAST
              </h3>

              <div className="space-y-4">
                {[
                  { title: '1. Chuẩn mực (Standardized)', text: 'Tuân thủ nghiêm ngặt các tiêu chuẩn quốc tế khắt khe nhất (ISO, BRC, FSSC).' },
                  { title: '2. Đúng hẹn (Punctual)', text: 'Tôn trọng tối đa thời gian và đảm bảo tiến độ triển khai cam kết với khách hàng.' },
                  { title: '3. Thân thiện (Approachable)', text: 'Lắng nghe, chia sẻ và đồng cảm với mọi trăn trở trong vận hành của doanh nghiệp.' },
                  { title: '4. Chuyên nghiệp (Professional)', text: 'Tác phong chuyên nghiệp, minh bạch và chịu trách nhiệm cao nhất với sản phẩm đầu ra.' },
                  { title: '5. Cầu thị (Receptive)', text: 'Không ngừng tiếp thu các đóng góp phản hồi và liên tục cải tiến dịch vụ.' }
                ].map((crit, idx) => (
                  <div key={idx} className="flex gap-3">
                    <Check className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                    <div>
                      <strong className="text-xs md:text-sm text-slate-800 font-bold block">{crit.title}</strong>
                      <span className="text-xs text-slate-500 font-medium">{crit.text}</span>
                    </div>
                  </div>
                ))}
              </div>

              <div className="p-4 bg-emerald-600 rounded-2xl text-center text-white">
                <span className="block text-xs font-black uppercase tracking-widest text-emerald-100">Chứng nhận Uy tín</span>
                <span className="block text-lg font-black mt-0.5">100% TRUSTED & CERTIFIED</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Section 4: Main Services Overview (Nhóm dịch vụ chính) */}
      <section className="py-16 md:py-24 bg-slate-50 relative overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16 space-y-4">
            <span className="text-[#007c76] text-xs font-black uppercase tracking-widest">Danh mục Hoạt Động</span>
            <h2 className="text-3xl md:text-5xl font-black uppercase tracking-tight text-slate-900">Mảng Dịch Vụ Chủ Chốt</h2>
            <div className="w-16 h-1 bg-[#007c76] mx-auto rounded-full mt-4"></div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[
              {
                title: 'Tư vấn Thiết lập Hệ thống Quản lý',
                desc: 'Hệ thống chuẩn mực toàn diện: FSSC 22000, BRCGS, ISO 22000, ISO 9001, ISO 14001, ISO 45001, ISO 27001.',
                icon: <Shield className="w-6 h-6 text-[#007c76]" />
              },
              {
                title: 'Nông nghiệp Công nghệ cao',
                desc: 'Đồng hành tư vấn và đánh giá đạt chuẩn VietGAP, GlobalG.A.P, Canh tác Hữu cơ (Organic) không hóa chất xuất khẩu.',
                icon: <Compass className="w-6 h-6 text-emerald-600" />
              },
              {
                title: 'Vận hành Xuất sắc & Cải tiến',
                desc: 'Ứng dụng OKRs, tư vấn Tinh gọn hiện trường, cải tiến Kaizen chuỗi cung ứng, nâng cao năng lực quản trị doanh nghiệp.',
                icon: <Cpu className="w-6 h-6 text-cyan-600" />
              },
              {
                title: 'Bồi dưỡng Nội bộ Chuyên sâu',
                desc: 'Bồi dưỡng nghiệp vụ QA/QC, R&D, kiểm soát chất lượng, sản xuất tinh gọn cho F&B, nhà hàng, siêu thị, Central Kitchen.',
                icon: <BookOpen className="w-6 h-6 text-indigo-600" />
              },
              {
                title: 'Hỗ trợ Vận hành Toàn diện',
                desc: 'Hoàn thiện hồ sơ FDA, GACC, đăng ký GCN cơ sở đủ ĐK ATTP, tự công bố sản phẩm và đánh giá khách hàng bí mật.',
                icon: <Layers className="w-6 h-6 text-purple-600" />
              },
              {
                title: 'Đánh giá Nội bộ & Bên thứ 2',
                desc: 'Rà soát hiện trạng thực tế, đánh giá rủi ro hệ thống sản xuất và nhà xưởng, phát hiện kịp thời các điểm nghẽn.',
                icon: <CheckCircle2 className="w-6 h-6 text-pink-600" />
              }
            ].map((service, idx) => (
              <div key={idx} className="bg-white border border-slate-100 rounded-3xl p-6 space-y-4 hover:shadow-xl hover:-translate-y-1 transition-all duration-300 flex flex-col justify-between">
                <div className="space-y-3">
                  <div className="w-12 h-12 rounded-2xl bg-slate-50 flex items-center justify-center">
                    {service.icon}
                  </div>
                  <h3 className="text-md md:text-lg font-black text-slate-900 uppercase tracking-wide">
                    {service.title}
                  </h3>
                  <p className="text-xs md:text-sm text-slate-500 leading-relaxed font-semibold">
                    {service.desc}
                  </p>
                </div>
                <div className="pt-4 text-xs font-black text-[#007c76] uppercase tracking-wider">
                  Xem chi tiết &rarr;
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Section 5: Đội ngũ Chuyên gia */}
      <section className="bg-gradient-to-br from-[#007c76] to-[#005f5a] py-16 md:py-24 text-white relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-white/5 rounded-full blur-3xl -mr-32 -mt-32 pointer-events-none"></div>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="text-center mb-16 space-y-4">
            <span className="text-emerald-300 text-xs font-black uppercase tracking-widest">Đội ngũ Cốt Cán</span>
            <h2 className="text-3xl md:text-5xl font-black uppercase tracking-tight">Ban Thường Trực Dự Án</h2>
            <div className="w-16 h-1.5 bg-amber-400 mx-auto rounded-full"></div>
            <p className="text-white/80 font-bold max-w-2xl mx-auto text-xs md:text-sm leading-relaxed">
              Chúng tôi không chỉ là những người tư vấn lý thuyết suông; chúng tôi là những Chuyên gia Đánh giá trưởng (Lead Auditor) quốc tế và những nhà quản lý trực tiếp lăn lộn tại hiện trường nhà máy.
            </p>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-10 md:gap-12 max-w-4xl mx-auto">
            {TEAM.map((member, idx) => (
              <div key={idx} className="flex flex-col items-center group">
                <div className="relative mb-8">
                  <div className="w-48 h-48 md:w-56 md:h-56 rounded-full overflow-hidden border-4 border-white/20 group-hover:border-white transition-all duration-500 relative shadow-2xl z-10 bg-slate-800">
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
                <h4 className="text-xl md:text-2xl font-black text-white group-hover:text-emerald-300 transition-colors uppercase tracking-wide">
                  {member.name}
                </h4>
                <p className="text-white/70 font-bold text-sm md:text-base mt-2">{member.role}</p>
                <p className="text-xs text-emerald-200 mt-1.5 font-bold tracking-wider uppercase bg-emerald-950/40 px-3 py-1 rounded-full border border-emerald-800/40">
                  Chuyên gia tư vấn cấp cao
                </p>
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

      {/* Section 6: OUR CLIENTS (Slide 1 & Slide 2 theo mẫu thực tế) */}
      <section className="py-16 md:py-24 bg-white relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Header đúng chuẩn hình ảnh cung cấp: OUR CLIENTS với thanh gạch ngang màu xanh đậm */}
          <div className="text-center mb-10 md:mb-14">
            <h2 className="text-2xl md:text-4xl font-extrabold text-[#0f2d4a] tracking-wider uppercase font-sans">
              OUR CLIENTS
            </h2>
            <div className="w-12 h-1 bg-[#0f2d4a] mx-auto mt-2"></div>
          </div>

          {/* Client Logos Grid / Slider Container */}
          <div className="relative overflow-hidden">
            <div 
              className="flex transition-transform duration-700 ease-in-out"
              style={{ transform: `translateX(-${clientSlide * 100}%)` }}
            >
              {/* SLIDE 1: MIXUE, Phúc Lộc Thọ, Hảo Hương, Rau Má Mix, Tường An, Đảo Hải Sản */}
              <div className="w-full shrink-0">
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4 md:gap-5 items-stretch">
                  {/* Card 1: MIXUE */}
                  <div className="bg-white border border-gray-200 hover:border-gray-300 rounded-none p-3 sm:p-5 flex items-center justify-center h-32 sm:h-36 md:h-44 transition-all duration-300 hover:shadow-md group">
                    <div className="bg-[#df1e26] text-white px-3 py-2 rounded-md flex items-center gap-2 shadow-xs w-full max-w-[140px] justify-center">
                      <div className="w-7 h-7 bg-white rounded-full flex items-center justify-center shrink-0 border border-red-100">
                        <span className="text-sm leading-none select-none">⛄</span>
                      </div>
                      <div className="flex flex-col text-left leading-none">
                        <span className="text-sm font-black tracking-wider text-white">MIXUE</span>
                        <span className="text-[6.5px] font-bold text-red-100 uppercase tracking-tight mt-0.5 whitespace-nowrap">
                          SINCE 1997 · ICE CREAM & TEA
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Card 2: Cơm Tấm Phúc Lộc Thọ */}
                  <div className="bg-white border border-gray-200 hover:border-gray-300 rounded-none p-3 sm:p-5 flex items-center justify-center h-32 sm:h-36 md:h-44 transition-all duration-300 hover:shadow-md group">
                    <div className="bg-[#30160b] text-white px-2.5 py-2 rounded-lg border border-amber-600/30 flex flex-col items-center justify-center text-center shadow-xs w-full max-w-[140px]">
                      <div className="flex items-center gap-1 leading-none">
                        <span className="text-[9.5px] font-black text-[#e8b960] tracking-tight">Phúc Lộc Thọ</span>
                        <span className="text-[6px] bg-[#e8b960] text-[#30160b] font-black px-0.5 py-0.2 rounded font-mono">Since 2005</span>
                      </div>
                      <div className="text-sm sm:text-base font-black text-white tracking-wider my-0.5 leading-tight font-serif">
                        CƠM TẤM
                      </div>
                      <div className="text-[6.5px] font-extrabold text-[#e8b960] tracking-wide uppercase whitespace-nowrap">
                        Hệ Thống Phủ Khắp Sài Gòn
                      </div>
                    </div>
                  </div>

                  {/* Card 3: Hảo Hương */}
                  <div className="bg-white border border-gray-200 hover:border-gray-300 rounded-none p-3 sm:p-5 flex items-center justify-center h-32 sm:h-36 md:h-44 transition-all duration-300 hover:shadow-md group">
                    <div className="flex flex-col items-center justify-center text-center">
                      <svg className="w-12 sm:w-14 h-6 sm:h-7 text-[#d82a1e]" viewBox="0 0 64 32" fill="none">
                        <path d="M16 26 A16 16 0 0 1 48 26 Z" fill="url(#sunGrad1)" />
                        <line x1="32" y1="4" x2="32" y2="8" stroke="#d82a1e" strokeWidth="2.5" strokeLinecap="round" />
                        <line x1="20" y1="7" x2="23" y2="11" stroke="#d82a1e" strokeWidth="2.5" strokeLinecap="round" />
                        <line x1="44" y1="7" x2="41" y2="11" stroke="#d82a1e" strokeWidth="2.5" strokeLinecap="round" />
                        <line x1="10" y1="15" x2="15" y2="17" stroke="#d82a1e" strokeWidth="2.5" strokeLinecap="round" />
                        <line x1="54" y1="15" x2="49" y2="17" stroke="#d82a1e" strokeWidth="2.5" strokeLinecap="round" />
                        <defs>
                          <linearGradient id="sunGrad1" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#ff7a18" />
                            <stop offset="100%" stopColor="#d82a1e" />
                          </linearGradient>
                        </defs>
                      </svg>
                      <span className="text-sm sm:text-base font-black text-[#d82a1e] tracking-tight mt-1 font-serif italic whitespace-nowrap">
                        Hảo Hương
                      </span>
                    </div>
                  </div>

                  {/* Card 4: Rau Má Mix */}
                  <div className="bg-white border border-gray-200 hover:border-gray-300 rounded-none p-3 sm:p-5 flex items-center justify-center h-32 sm:h-36 md:h-44 transition-all duration-300 hover:shadow-md group">
                    <div className="flex flex-col items-center justify-center text-center">
                      <svg className="w-9 sm:w-10 h-9 sm:h-10" viewBox="0 0 48 48" fill="none">
                        <path d="M24 6 C12 6, 8 16, 10 24 C12 30, 18 34, 24 32 C30 34, 36 30, 38 24 C40 16, 36 6, 24 6 Z" fill="#1b9e4b" />
                        <path d="M24 32 C23 37, 21 42, 19 45" stroke="#167a39" strokeWidth="2" strokeLinecap="round" />
                        <circle cx="21" cy="35" r="1.5" fill="#3cd070" />
                        <circle cx="25" cy="38" r="1.8" fill="#3cd070" />
                        <circle cx="27" cy="42" r="1.3" fill="#3cd070" />
                      </svg>
                      <span className="text-[8.5px] font-bold text-[#1a5d30] tracking-wider -mt-0.5">raumamix®</span>
                      <div className="text-xs sm:text-sm font-black tracking-tight leading-none mt-0.5">
                        <span className="text-[#1a5d30]">RAU MÁ</span>
                        <span className="text-[#b2c825] ml-1">mix</span>
                      </div>
                    </div>
                  </div>

                  {/* Card 5: Tường An */}
                  <div className="bg-white border border-gray-200 hover:border-gray-300 rounded-none p-3 sm:p-5 flex items-center justify-center h-32 sm:h-36 md:h-44 transition-all duration-300 hover:shadow-md group">
                    <div className="bg-[#ffeb00] px-3 py-2 rounded-xs flex flex-col items-center justify-center text-center shadow-2xs w-full max-w-[120px]">
                      <svg className="w-9 sm:w-10 h-6 sm:h-7 text-[#d81d24]" viewBox="0 0 48 32" fill="currentColor">
                        <path d="M12 24 C10 20, 8 14, 12 10 C16 6, 26 6, 32 8 C36 9, 40 12, 42 16 C41 18, 38 18, 36 17 C34 20, 32 24, 30 26 L26 26 L27 20 L23 20 L23 26 L17 26 L18 19 L13 19 Z" />
                        <circle cx="15" cy="11" r="1" fill="#ffeb00" />
                        <path d="M8 15 C6 18, 5 21, 5 23" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                      </svg>
                      <span className="text-xs sm:text-sm font-black text-[#d81d24] font-serif italic tracking-tight -mt-0.5 whitespace-nowrap">
                        Tường An®
                      </span>
                    </div>
                  </div>

                  {/* Card 6: Đảo Hải Sản */}
                  <div className="bg-white border border-gray-200 hover:border-gray-300 rounded-none p-3 sm:p-5 flex items-center justify-center h-32 sm:h-36 md:h-44 transition-all duration-300 hover:shadow-md group">
                    <div className="bg-[#009fe3] px-2.5 py-3 rounded-xs flex items-center justify-center text-center shadow-2xs w-full max-w-[125px]">
                      <div className="flex items-center font-black text-white text-xs sm:text-sm tracking-wider whitespace-nowrap">
                        <span>D</span>
                        <span className="text-amber-300 text-[9px] mx-0.5">★</span>
                        <span>OHAISAN</span>
                        <span className="text-[7px] align-super ml-0.5">®</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* SLIDE 2: Tường An, Đảo Hải Sản, Biofresh, Tri Kien Food, Hương Việt Xưa, Thao Tien Foods */}
              <div className="w-full shrink-0">
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4 md:gap-5 items-stretch">
                  {/* Card 1: Tường An */}
                  <div className="bg-white border border-gray-200 hover:border-gray-300 rounded-none p-3 sm:p-5 flex items-center justify-center h-32 sm:h-36 md:h-44 transition-all duration-300 hover:shadow-md group">
                    <div className="bg-[#ffeb00] px-3 py-2 rounded-xs flex flex-col items-center justify-center text-center shadow-2xs w-full max-w-[120px]">
                      <svg className="w-9 sm:w-10 h-6 sm:h-7 text-[#d81d24]" viewBox="0 0 48 32" fill="currentColor">
                        <path d="M12 24 C10 20, 8 14, 12 10 C16 6, 26 6, 32 8 C36 9, 40 12, 42 16 C41 18, 38 18, 36 17 C34 20, 32 24, 30 26 L26 26 L27 20 L23 20 L23 26 L17 26 L18 19 L13 19 Z" />
                        <circle cx="15" cy="11" r="1" fill="#ffeb00" />
                        <path d="M8 15 C6 18, 5 21, 5 23" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                      </svg>
                      <span className="text-xs sm:text-sm font-black text-[#d81d24] font-serif italic tracking-tight -mt-0.5 whitespace-nowrap">
                        Tường An®
                      </span>
                    </div>
                  </div>

                  {/* Card 2: Đảo Hải Sản */}
                  <div className="bg-white border border-gray-200 hover:border-gray-300 rounded-none p-3 sm:p-5 flex items-center justify-center h-32 sm:h-36 md:h-44 transition-all duration-300 hover:shadow-md group">
                    <div className="bg-[#009fe3] px-2.5 py-3 rounded-xs flex items-center justify-center text-center shadow-2xs w-full max-w-[125px]">
                      <div className="flex items-center font-black text-white text-xs sm:text-sm tracking-wider whitespace-nowrap">
                        <span>D</span>
                        <span className="text-amber-300 text-[9px] mx-0.5">★</span>
                        <span>OHAISAN</span>
                        <span className="text-[7px] align-super ml-0.5">®</span>
                      </div>
                    </div>
                  </div>

                  {/* Card 3: BIOFRESH */}
                  <div className="bg-white border border-gray-200 hover:border-gray-300 rounded-none p-3 sm:p-5 flex items-center justify-center h-32 sm:h-36 md:h-44 transition-all duration-300 hover:shadow-md group">
                    <div className="w-16 h-16 sm:w-18 sm:h-18 rounded-full bg-[#11242c] border-2 border-emerald-400/40 p-1 flex flex-col items-center justify-center text-center relative shadow-xs">
                      <div className="text-[6px] font-black text-white tracking-[0.2em] uppercase leading-none mb-0.5">BIOFRESH</div>
                      <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-[#1b3a47] flex items-center justify-center relative">
                        <span className="text-emerald-400 text-sm sm:text-base font-black font-sans leading-none">B</span>
                        <span className="absolute -top-0.5 -right-0.5 text-[8px] text-emerald-300">🍃</span>
                      </div>
                      <div className="text-[4.5px] font-bold text-emerald-200 uppercase tracking-tighter leading-none mt-0.5 whitespace-nowrap">
                        EST 2010 · FARM TO FACTORY
                      </div>
                    </div>
                  </div>

                  {/* Card 4: TRI KIEN FOOD */}
                  <div className="bg-white border border-gray-200 hover:border-gray-300 rounded-none p-3 sm:p-5 flex items-center justify-center h-32 sm:h-36 md:h-44 transition-all duration-300 hover:shadow-md group">
                    <div className="flex flex-col items-center justify-center text-center">
                      <div className="w-8 h-8 sm:w-9 sm:h-9 border-2 border-[#8b4513] rounded-md rotate-45 flex items-center justify-center mb-1 shadow-2xs">
                        <div className="-rotate-45 font-black text-[#167a39] text-xs leading-none">
                          1K
                        </div>
                      </div>
                      <span className="text-[10px] sm:text-xs font-black text-[#167a39] uppercase tracking-wider whitespace-nowrap">
                        TRI KIEN FOOD
                      </span>
                    </div>
                  </div>

                  {/* Card 5: HƯƠNG VIỆT XƯA */}
                  <div className="bg-white border border-gray-200 hover:border-gray-300 rounded-none p-3 sm:p-5 flex items-center justify-center h-32 sm:h-36 md:h-44 transition-all duration-300 hover:shadow-md group">
                    <div className="flex flex-col items-center justify-center text-center">
                      <svg className="w-8 sm:w-9 h-10 sm:h-11" viewBox="0 0 40 48" fill="none">
                        <defs>
                          <linearGradient id="dropGrad2" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#f39c12" />
                            <stop offset="60%" stopColor="#e67e22" />
                            <stop offset="100%" stopColor="#d35400" />
                          </linearGradient>
                        </defs>
                        <path d="M20 2 C20 2, 6 22, 6 32 A14 14 0 0 0 34 32 C34 22, 20 2, 20 2 Z" fill="url(#dropGrad2)" />
                        <ellipse cx="20" cy="34" rx="7" ry="1.5" fill="#2c1a0e" />
                        <path d="M19 28 L21 34" stroke="#2c1a0e" strokeWidth="1.2" />
                        <circle cx="20" cy="27" r="1.5" fill="#2c1a0e" />
                      </svg>
                      <span className="text-[10px] sm:text-xs font-black text-[#8b4513] uppercase tracking-wide font-serif mt-0.5 whitespace-nowrap">
                        HƯƠNG VIỆT XƯA
                      </span>
                    </div>
                  </div>

                  {/* Card 6: THAO TIEN FOODS */}
                  <div className="bg-white border border-gray-200 hover:border-gray-300 rounded-none p-3 sm:p-5 flex items-center justify-center h-32 sm:h-36 md:h-44 transition-all duration-300 hover:shadow-md group">
                    <div className="flex flex-col items-center justify-center text-center">
                      <span className="text-[5.5px] sm:text-[6px] font-bold text-slate-500 uppercase tracking-tight leading-none mb-1">
                        IMPORTING THE BEST QUALITY MEAT & POULTRY
                      </span>
                      <div className="flex gap-1 my-1">
                        <span className="w-2.5 h-1.5 bg-[#f39c12] rounded-xs" />
                        <span className="w-2.5 h-1.5 bg-[#2ecc71] rounded-xs" />
                        <span className="w-2.5 h-1.5 bg-[#e74c3c] rounded-xs" />
                        <span className="w-2.5 h-1.5 bg-[#3498db] rounded-xs" />
                      </div>
                      <span className="text-[10px] sm:text-xs font-black text-slate-900 uppercase tracking-wider mt-0.5 whitespace-nowrap">
                        THAO TIEN FOODS
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Dấu chấm chuyển trang (Pagination Dots) đúng chuẩn hình mẫu: chấm vàng / chấm xám */}
          <div className="flex items-center justify-center gap-2.5 mt-8 md:mt-10">
            <button
              type="button"
              onClick={() => setClientSlide(0)}
              aria-label="Xem trang 1"
              className={`w-3.5 h-3.5 rounded-full transition-all duration-300 cursor-pointer ${
                clientSlide === 0 
                  ? 'bg-amber-400 ring-2 ring-amber-300/50 scale-110' 
                  : 'bg-gray-300 hover:bg-gray-400'
              }`}
            />
            <button
              type="button"
              onClick={() => setClientSlide(1)}
              aria-label="Xem trang 2"
              className={`w-3.5 h-3.5 rounded-full transition-all duration-300 cursor-pointer ${
                clientSlide === 1 
                  ? 'bg-amber-400 ring-2 ring-amber-300/50 scale-110' 
                  : 'bg-gray-300 hover:bg-gray-400'
              }`}
            />
          </div>

          {/* Partner Certification bodies */}
          <div className="mt-16 pt-12 border-t border-slate-100">
            <h4 className="text-center text-xs font-black text-slate-400 uppercase tracking-widest mb-8">
              Đối tác Chuyên môn & Hiệp hội Chứng nhận Toàn cầu
            </h4>
            <div className="flex flex-wrap justify-center items-center gap-8 md:gap-16">
              {[
                { name: 'BSI Group', logo: 'https://upload.wikimedia.org/wikipedia/commons/4/4e/BSI_Group_logo.svg' },
                { name: 'DNV', logo: 'https://upload.wikimedia.org/wikipedia/commons/2/23/DNV_logo.svg' },
                { name: 'Bureau Veritas', logo: 'https://upload.wikimedia.org/wikipedia/commons/8/87/Bureau_Veritas_logo.svg' }
              ].map((partner, idx) => (
                <div 
                  key={idx} 
                  className="h-12 flex items-center justify-center filter grayscale opacity-50 hover:grayscale-0 hover:opacity-100 transition-all duration-300"
                  title={partner.name}
                >
                  <img 
                    src={partner.logo} 
                    alt={partner.name} 
                    className="max-h-8 md:max-h-10 object-contain"
                    loading="lazy"
                    decoding="async"
                  />
                </div>
              ))}
            </div>
          </div>

        </div>
      </section>
    </main>
  );
};

export default About;
