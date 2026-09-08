import React, { useState } from 'react';

const FAQS = [
  {
    question: "Chứng nhận HACCP có bắt buộc đối với doanh nghiệp thực phẩm?",
    answer: "Tại Việt Nam và nhiều quốc gia khác, HACCP (hoặc tiêu chuẩn tương đương như ISO 22000) là yêu cầu pháp lý bắt buộc đối với hầu hết các cơ sở sản xuất và chế biến thực phẩm nhằm đảm bảo an toàn vệ sinh từ trang trại đến bàn ăn."
  },
  {
    question: "Khóa học ISO 22000 và HACCP phù hợp với những ai?",
    answer: "Khóa học được thiết kế tối ưu cho sinh viên ngành công nghệ thực phẩm, nhân viên QA/QC, quản lý sản xuất, chủ cơ sở kinh doanh F&B, và bất kỳ ai muốn nắm vững hệ thống quản lý an toàn thực phẩm chuyên nghiệp."
  },
  {
    question: "Học trực tuyến trên FAST E-Learning có được cấp chứng chỉ uy tín không?",
    answer: "Hoàn toàn có. Sau khi hoàn thành 100% lộ trình bài giảng và vượt qua bài thi trắc nghiệm đánh giá năng lực cuối khóa, học viên sẽ được cấp chứng chỉ bản cứng/bản mềm hợp lệ và có giá trị sử dụng trên toàn quốc."
  },
  {
    question: "Làm thế nào để đăng ký học và kích hoạt khóa học?",
    answer: "Bạn chỉ cần chọn khóa học mục tiêu, nhấp 'Đăng ký ngay' và hoàn tất thanh toán. Ngay sau khi hệ thống xác nhận thanh toán thành công (thường mất 1-2 phút), khóa học sẽ tự động được kích hoạt trên tài khoản của bạn."
  }
];

const FAQ: React.FC = () => {
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  return (
    <main className="min-h-screen bg-[#f8fafc] font-sans selection:bg-[#007c76]/20 selection:text-[#007c76] pt-24 pb-32">
      <section className="px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto">
        <div className="text-center mb-12">
            <h1 className="text-4xl md:text-5xl font-black text-gray-900 tracking-tighter mb-4">Câu Hỏi Thường Gặp <span className="text-[#007c76]">(FAQ)</span></h1>
            <p className="text-gray-500 font-medium text-lg">Giải đáp nhanh những thắc mắc phổ biến về chứng chỉ ISO/HACCP và lộ trình đào tạo.</p>
        </div>
        
        <div className="space-y-4">
            {FAQS.map((faq, index) => {
                const isOpen = openFaq === index;
                return (
                    <div 
                        key={index} 
                        className={`border rounded-2xl overflow-hidden transition-all duration-300 ${isOpen ? 'bg-white border-[#007c76]/20 shadow-[0_8px_30px_rgb(0,124,118,0.08)]' : 'bg-transparent border-gray-200 hover:border-[#007c76]/30'}`}
                    >
                        <button 
                            className="w-full text-left px-6 py-5 flex items-center justify-between gap-4 focus:outline-none"
                            onClick={() => setOpenFaq(isOpen ? null : index)}
                        >
                            <span className={`font-bold text-lg transition-colors ${isOpen ? 'text-[#007c76]' : 'text-gray-900'}`}>
                                {faq.question}
                            </span>
                            <div className={`shrink-0 w-8 h-8 rounded-full flex items-center justify-center transition-all duration-300 ${isOpen ? 'bg-[#007c76]/10 text-[#007c76] rotate-180' : 'bg-gray-100 text-gray-500'}`}>
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 9l-7 7-7-7" />
                                </svg>
                            </div>
                        </button>
                        
                        <div 
                            className={`overflow-hidden transition-all duration-300 ease-in-out ${isOpen ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'}`}
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
                );
            })}
        </div>
      </section>
    </main>
  );
};

export default FAQ;
