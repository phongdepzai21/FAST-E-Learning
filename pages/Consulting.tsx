
import React from 'react';
import { CONSULTING_SERVICES } from '../constants';
// Fix: Use standard Link export from react-router-dom
import { Link } from "react-router-dom";

const Consulting: React.FC = () => {
  return (
    <main className="bg-white">
      {/* Hero Section */}
      <section className="bg-gray-50 py-20 border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-4xl md:text-5xl font-black text-[#007b6f] mb-6 uppercase tracking-tight">Dịch Vụ Tư Vấn Chuyên Sâu</h1>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto font-medium">
            FAST mang đến giải pháp toàn diện giúp doanh nghiệp chuẩn hóa quy trình, 
            vượt qua mọi kỳ đánh giá và khẳng định chất lượng trên thị trường.
          </p>
          <div className="w-24 h-1.5 bg-[#007b6f] mx-auto mt-8"></div>
        </div>
      </section>

      {/* Services Grid */}
      <section className="py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
            {CONSULTING_SERVICES.map((service) => (
              <div key={service.id} className="bg-white rounded-[40px] p-10 shadow-2xl border border-gray-100 flex flex-col hover:shadow-teal-500/10 transition-all group">
                <div className="w-20 h-20 bg-[#007b6f]/10 rounded-2xl flex items-center justify-center mb-8 group-hover:bg-[#007b6f] transition-colors">
                  {service.icon === 'shield' ? (
                    <svg className="w-10 h-10 text-[#007b6f] group-hover:text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                    </svg>
                  ) : (
                    <svg className="w-10 h-10 text-[#007b6f] group-hover:text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                    </svg>
                  )}
                </div>
                <h2 className="text-3xl font-black text-[#374151] mb-6">{service.title}</h2>
                <p className="text-gray-600 text-lg mb-8 font-medium leading-relaxed">
                  {service.description}
                </p>
                <ul className="space-y-4 mb-10">
                  {service.features.map((feature, idx) => (
                    <li key={idx} className="flex items-start space-x-3 text-gray-700 font-bold">
                      <svg className="w-6 h-6 text-[#007b6f] shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                      </svg>
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
                <Link to="/lien-he" className="mt-auto inline-flex items-center justify-center bg-[#007b6f] text-white py-5 px-8 rounded-2xl font-black text-xl hover:bg-[#005f56] transition-all shadow-xl uppercase tracking-widest">
                  Nhận Báo Giá Ngay
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Process Section */}
      <section className="py-24 bg-[#007b6f] text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-20">
            <h2 className="text-4xl font-black mb-4 uppercase">Quy Trình Làm Việc Tại FAST</h2>
            <p className="text-white/80 font-medium">Chuyên nghiệp - Tận tâm - Cam kết hiệu quả 100%</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            {[
              { step: '01', label: 'Khảo sát thực tế', desc: 'Đánh giá hiện trạng cơ sở và quy trình.' },
              { step: '02', label: 'Lập phương án', desc: 'Xây dựng kế hoạch tối ưu chi phí & thời gian.' },
              { step: '03', label: 'Triển khai đào tạo', desc: 'Hướng dẫn nhân sự và hoàn thiện hồ sơ.' },
              { step: '04', label: 'Đánh giá & Cấp chứng chỉ', desc: 'Hỗ trợ đến khi nhận kết quả thành công.' }
            ].map((item, i) => (
              <div key={i} className="relative group">
                <div className="text-6xl font-black text-white/10 absolute -top-10 -left-4 group-hover:text-white/20 transition-colors">
                  {item.step}
                </div>
                <div className="relative pt-4">
                  <h4 className="text-xl font-black mb-3">{item.label}</h4>
                  <p className="text-white/70 font-medium leading-relaxed">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ CTA */}
      <section className="py-24 text-center">
        <div className="max-w-4xl mx-auto px-4">
          <h2 className="text-3xl font-black text-gray-800 mb-6">Bạn vẫn còn thắc mắc?</h2>
          <p className="text-gray-600 mb-10 text-lg font-medium">
            Mỗi doanh nghiệp đều có đặc thù riêng. Hãy để chuyên gia của chúng tôi hỗ trợ tư vấn miễn phí cho trường hợp của bạn.
          </p>
          <div className="flex flex-col sm:flex-row justify-center items-center space-y-4 sm:space-y-0 sm:space-x-6">
            <a href="tel:0898419149" className="w-full sm:w-auto bg-[#007b6f] text-white py-5 px-10 rounded-2xl font-black text-lg hover:shadow-2xl transition-all uppercase tracking-widest">
              GỌI HOTLINE: 0898 419 149
            </a>
            <Link to="/lien-he" className="w-full sm:w-auto border-4 border-[#007b6f] text-[#007b6f] py-4 px-10 rounded-2xl font-black text-lg hover:bg-gray-50 transition-all uppercase tracking-widest">
              ĐỂ LẠI TIN NHẮN
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
};

export default Consulting;
