import React, { useState } from 'react'; 
import { Helmet } from 'react-helmet-async';
import { Breadcrumbs } from '../components/Breadcrumbs';

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
  },
  {
    question: "Thời hạn của Giấy chứng nhận Cơ sở đủ điều kiện An toàn thực phẩm là bao lâu?",
    answer: "Theo quy định pháp luật Việt Nam, Giấy chứng nhận Cơ sở đủ điều kiện An toàn thực phẩm có thời hạn hiệu lực là 03 năm. Trước khi hết hạn 06 tháng, cơ sở phải nộp hồ sơ xin cấp lại nếu muốn tiếp tục kinh doanh."
  },
  {
    question: "Khóa học có giới hạn thời gian truy cập hay không?",
    answer: "Tại FAST E-Learning, khi bạn đăng ký thành công một khóa học, bạn sẽ có quyền truy cập trọn đời (Lifetime Access). Bạn có thể quay lại ôn tập bất cứ lúc nào và luôn được cập nhật các nội dung bài giảng mới nhất miễn phí."
  },
  {
    question: "Hệ thống có hỗ trợ học tập trên điện thoại hoặc máy tính bảng không?",
    answer: "Nền tảng FAST E-Learning được thiết kế chuẩn Responsive, hoạt động mượt mà và tối ưu giao diện trên cả điện thoại thông minh (smartphone), máy tính bảng (tablet) và máy tính cá nhân (PC/Laptop)."
  },
  {
    question: "Chi phí đăng ký khóa học đã bao gồm lệ phí thi và cấp chứng chỉ chưa?",
    answer: "Tất cả chi phí niêm yết trên website đều là trọn gói. Bạn sẽ không phải đóng thêm bất kỳ khoản phí nào cho việc làm bài thi cuối khóa và nhận chứng chỉ bản mềm."
  },
  {
    question: "Nếu tôi thi không đạt bài thi cuối khóa, tôi có được thi lại không?",
    answer: "Chắc chắn rồi. Nếu chưa đạt điểm yêu cầu ở bài kiểm tra cuối khóa, bạn có thể ôn tập lại các bài giảng bị hổng kiến thức và thực hiện thi lại nhiều lần cho đến khi đạt tiêu chuẩn cấp chứng chỉ."
  },
  {
    question: "FAST có hỗ trợ dịch vụ tư vấn doanh nghiệp lấy chứng nhận quốc tế không?",
    answer: "Có, ngoài nền tảng tự học E-Learning, FAST còn cung cấp dịch vụ Tư vấn trọn gói chuyên sâu cho các doanh nghiệp cần thiết lập hệ thống và đánh giá lấy các chứng nhận như ISO 22000, HACCP, FSSC 22000, FDA..."
  },
  {
    question: "Giấy chứng nhận HACCP và ISO 22000 có gì khác biệt?",
    answer: "HACCP chủ yếu tập trung vào việc nhận diện, đánh giá và kiểm soát các mối nguy liên quan đến an toàn thực phẩm. Trong khi đó, ISO 22000 là một tiêu chuẩn rộng hơn, bao gồm cả nguyên lý HACCP kết hợp với các hệ thống quản lý rủi ro và các chương trình tiên quyết (PRPs), giúp quản lý quy trình ở mức độ vĩ mô và toàn diện hơn."
  }
];

const FAQ: React.FC = () => {
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  return (
    <main className="min-h-screen bg-[#f8fafc] font-sans selection:bg-teal-500/20 selection:text-teal-700 pb-32">
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
      <section className="px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto relative z-20 -mt-10">
        
        <div className="space-y-4">
            {FAQS.map((faq, index) => {
                const isOpen = openFaq === index;
                return (
                    <div 
                        key={index} 
                        className={`rounded-[24px] overflow-hidden transition-all duration-300 border ${isOpen ? 'bg-white border-teal-200 shadow-[0_20px_40px_-15px_rgba(13,148,136,0.1)]' : 'bg-white border-slate-100 hover:border-teal-200/50 hover:shadow-sm'}`}
                    >
                        <button 
                            className="w-full text-left px-6 md:px-8 py-6 flex items-center justify-between gap-6 focus:outline-none"
                            onClick={() => setOpenFaq(isOpen ? null : index)}
                        >
                            <span className={`font-black text-lg md:text-xl transition-colors leading-snug ${isOpen ? 'text-teal-700' : 'text-slate-800'}`}>
                                {faq.question}
                            </span>
                            <div className={`shrink-0 w-10 h-10 rounded-2xl flex items-center justify-center transition-all duration-300 ${isOpen ? 'bg-teal-500 text-white rotate-180 shadow-md' : 'bg-slate-50 text-slate-400'}`}>
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M19 9l-7 7-7-7" />
                                </svg>
                            </div>
                        </button>
                        
                        <div 
                            className={`overflow-hidden transition-all duration-300 ease-in-out ${isOpen ? 'max-h-[500px] opacity-100' : 'max-h-0 opacity-0'}`}
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
                );
            })}
        </div>
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
    </main>
  );
};

export default FAQ;
