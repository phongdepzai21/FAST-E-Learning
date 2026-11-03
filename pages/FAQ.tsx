import React, { useState, useMemo } from 'react';
import { Helmet } from 'react-helmet-async';
import { Breadcrumbs } from '../components/Breadcrumbs';
import { 
  Search, 
  HelpCircle, 
  ChevronDown, 
  Sparkles, 
  ShieldCheck, 
  BookOpen, 
  CreditCard, 
  Award, 
  PhoneCall, 
  Mail, 
  FileText,
  Clock,
  Layers,
  Send,
  CheckCircle2
} from 'lucide-react';

interface FaqItem {
  id: string;
  category: 'general' | 'payment' | 'certificate' | 'standards' | 'technical';
  categoryLabel: string;
  question: string;
  answer: string;
}

const FAQS: FaqItem[] = [
  {
    id: 'faq-1',
    category: 'general',
    categoryLabel: 'Tổng quan & Học tập',
    question: "Nền tảng FAST E-Learning là gì và đào tạo những lĩnh vực nào?",
    answer: "FAST E-Learning là hệ thống đào tạo trực tuyến chuẩn hóa chuyên sâu về Hệ thống Quản lý Chất lượng (QMS), Tiêu chuẩn An toàn thực phẩm (ISO 22000, HACCP, FSSC 22000, VietGAP, GMP) và các quy chuẩn vận hành F&B dành cho kỹ sư, sinh viên công nghệ thực phẩm và các cơ sở sản xuất kinh doanh trên toàn quốc."
  },
  {
    id: 'faq-2',
    category: 'payment',
    categoryLabel: 'Thanh toán & Kích hoạt',
    question: "Sau khi quét mã VietQR tự động, khóa học được kích hoạt trong bao lâu?",
    answer: "Hệ thống FAST tích hợp cổng đối soát giao dịch tự động SePay. Ngay sau khi bạn hoàn tất lệnh chuyển khoản quét mã VietQR chuẩn xác, hệ thống sẽ tự động băm đối soát và kích hoạt khóa học vào tài khoản của bạn chỉ trong vòng 1 đến 3 giây mà không cần chờ duyệt thủ công."
  },
  {
    id: 'faq-3',
    category: 'certificate',
    categoryLabel: 'Chứng nhận hoàn thành',
    question: "Chứng nhận hoàn thành được cấp như thế nào? Có nhận chứng nhận online không?",
    answer: "Học viên nhận chứng nhận ngay và liền (không nhận chứng nhận online) sau khi hoàn tất các bài học và đạt kết quả kiểm tra năng lực cuối khóa. Giấy chứng nhận bản cứng chính quy mang dấu mộc chứng thực của FAST Consulting, có số hiệu quản lý định danh và có giá trị chuyên môn trên toàn quốc."
  },
  {
    id: 'faq-4',
    category: 'general',
    categoryLabel: 'Tổng quan & Học tập',
    question: "Khóa học có bị giới hạn thời gian học không? Tôi có được xem lại trọn đời?",
    answer: "Tại FAST E-Learning, toàn bộ khóa học đã mua đều có quyền truy cập vĩnh viễn (Lifetime Access). Bạn có thể học lại bất cứ lúc nào, trên mọi thiết bị và luôn được tự động cập nhật miễn phí khi ban giảng huấn bổ sung tài liệu hoặc video cập nhật tiêu chuẩn mới."
  },
  {
    id: 'faq-5',
    category: 'general',
    categoryLabel: 'Tổng quan & Học tập',
    question: "Tôi có thể theo dõi danh sách các khóa học mình đã xem qua ở đâu?",
    answer: "Hệ thống tự động ghi nhận lịch sử duyệt học của bạn. Bạn chỉ cần đăng nhập và vào trang 'Tài khoản' -> chọn mục 'Khóa học đã xem' trên thanh điều hướng để xem lại tất cả bài giảng và khóa đào tạo mà bạn đã từng tìm hiểu."
  },
  {
    id: 'faq-6',
    category: 'general',
    categoryLabel: 'Gói Combo',
    question: "Gói Combo tiết kiệm trong trang Khóa học hoạt động như thế nào?",
    answer: "Các gói Combo (như Combo Basic Nhập môn thực phẩm, Combo Pro Chuyên gia vận hành) tích hợp trọn bộ nhiều khóa học then chốt với học phí ưu đãi tiết kiệm từ 30% đến 50% so với mua lẻ. Bạn có thể bấm nút 'Ẩn / Hiện danh sách khóa học' ngay trên từng thẻ combo để xem cụ thể các bài giảng đính kèm."
  },
  {
    id: 'faq-7',
    category: 'technical',
    categoryLabel: 'Thiết bị & Nền tảng',
    question: "Tôi có thể học trên điện thoại hoặc máy tính bảng được không?",
    answer: "Có. Giao diện FAST E-Learning được tối ưu hiển thị mượt mà trên mọi thiết bị: từ máy tính để bàn (PC), laptop đến điện thoại thông minh (iPhone, Android) và iPad/Tablet. Video bài giảng được truyền tải ổn định với công nghệ tối ưu băng thông."
  },
  {
    id: 'faq-8',
    category: 'certificate',
    categoryLabel: 'Chứng nhận hoàn thành',
    question: "Nếu bài kiểm tra cuối khóa chưa đạt điểm yêu cầu thì có được thi lại không?",
    answer: "Chắc chắn có. FAST hướng tới mục tiêu người học thực sự nắm vững kiến thức. Nếu chưa đạt điểm tối thiểu, bạn có thể xem lại các học phần chưa vững và thực hiện thi lại nhiều lần hoàn toàn miễn phí cho đến khi tự tin đạt chuẩn."
  },
  {
    id: 'faq-9',
    category: 'standards',
    categoryLabel: 'Tiêu chuẩn ISO & HACCP',
    question: "Sự khác biệt cốt lõi giữa HACCP và ISO 22000 là gì? Tôi nên học khóa nào trước?",
    answer: "HACCP tập trung vào phương pháp nhận diện mối nguy và kiểm soát các điểm tới hạn (CCP) trực tiếp tại dây chuyền chế biến. ISO 22000 bao gồm nguyên lý HACCP cộng thêm hệ thống quản trị rủi ro cấp cao (HLS), văn hóa an toàn và các chương trình tiên quyết (PRP). Nếu mới bắt đầu, bạn nên học HACCP trước, sau đó nâng cao lên ISO 22000."
  },
  {
    id: 'faq-10',
    category: 'payment',
    categoryLabel: 'Thanh toán & Kích hoạt',
    question: "Nếu tôi chuyển khoản sai nội dung hoặc sai số tiền thì giải quyết như thế nào?",
    answer: "Đừng lo lắng, dữ liệu chuyển khoản của bạn luôn được lưu trữ an toàn trong sổ cái ngân hàng. Bạn chỉ cần liên hệ Hotline/Zalo 0989 499 579 hoặc email hkc.qms@gmail.com, cung cấp ảnh biên lai chuyển khoản để tư vấn viên kích hoạt bổ sung cho bạn ngay lập tức."
  },
  {
    id: 'faq-11',
    category: 'payment',
    categoryLabel: 'Hóa đơn Doanh nghiệp',
    question: "FAST có hỗ trợ xuất hóa đơn VAT điện tử cho doanh nghiệp đăng ký học không?",
    answer: "Có. FAST Consulting cung cấp đầy đủ hợp đồng đào tạo, nghiệm thu và hóa đơn giá trị gia tăng (VAT) hợp lệ theo đúng mã số thuế doanh nghiệp 0314568146. Vui lòng ghi chú thông tin xuất hóa đơn khi thanh toán hoặc gửi yêu cầu qua email chính thức."
  },
  {
    id: 'faq-12',
    category: 'standards',
    categoryLabel: 'Doanh nghiệp & Đào tạo',
    question: "Doanh nghiệp có thể đặt khóa đào tạo nội bộ theo yêu cầu riêng không?",
    answer: "Hoàn toàn được. FAST thường xuyên triển khai các gói đào tạo tại cơ sở (In-house Training) kết hợp đánh giá thực địa (Audit Gap Analysis) cho các chuỗi nhà hàng, chuỗi F&B, xưởng chế biến và nhà máy xuất khẩu thực phẩm."
  },
  {
    id: 'faq-13',
    category: 'technical',
    categoryLabel: 'Tài khoản & Hỗ trợ',
    question: "Tôi bị quên mã OTP hoặc gặp vấn đề đăng nhập thì cần làm gì?",
    answer: "Hệ thống hỗ trợ gửi mã xác thực đăng nhập qua Email bảo mật. Nếu không thấy trong Hộp thư đến (Inbox), bạn vui lòng kiểm tra thêm mục Thư rác (Spam) hoặc liên hệ đội ngũ kỹ thuật qua hotline 0989 499 579 để được hỗ trợ trong vài phút."
  },
  {
    id: 'faq-14',
    category: 'general',
    categoryLabel: 'Đội ngũ Giảng viên',
    question: "Đội ngũ giảng viên và chuyên gia xây dựng nội dung gồm những ai?",
    answer: "Nội dung đào tạo được trực tiếp biên soạn và giảng dạy bởi đội ngũ chuyên gia giàu kinh nghiệm thực chiến từ FAST Consulting, các Trưởng đoàn đánh giá chứng nhận QMS/FSMS và giảng viên thỉnh giảng đầu ngành công nghệ thực phẩm tại Việt Nam."
  },
  {
    id: 'faq-15',
    category: 'general',
    categoryLabel: 'Tài liệu học tập',
    question: "Khóa học có đi kèm cẩm nang và tài liệu thực hành không?",
    answer: "Mỗi khóa học đều đính kèm bộ tài liệu slide bài giảng, hướng dẫn kiểm soát nhiệt độ, quy chuẩn vệ sinh nhà xưởng và cẩm nang hướng dẫn kiểm soát thực tế để học viên có thể tải về ứng dụng trực tiếp tại đơn vị của mình."
  },
  {
    id: 'faq-16',
    category: 'technical',
    categoryLabel: 'Bảo mật thông tin',
    question: "Thông tin cá nhân và dữ liệu học tập của tôi được bảo mật như thế nào?",
    answer: "Toàn bộ dữ liệu trên FAST E-Learning được mã hóa SSL/TLS 256-bit chuẩn quốc tế và tuân thủ nghiêm ngặt Luật Bảo vệ Dữ liệu Cá nhân số 91/2025/QH15. FAST cam kết không chia sẻ hoặc cung cấp thông tin học viên cho bất kỳ bên thứ ba nào."
  }
];

const CATEGORIES = [
  { id: 'all', label: 'Tất cả câu hỏi' },
  { id: 'general', label: 'Tổng quan & Học tập' },
  { id: 'payment', label: 'Thanh toán & Kích hoạt' },
  { id: 'certificate', label: 'Chứng nhận hoàn thành' },
  { id: 'standards', label: 'Tiêu chuẩn ISO & HACCP' },
  { id: 'technical', label: 'Kỹ thuật & Hỗ trợ' }
];

const FAQ: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [openFaqId, setOpenFaqId] = useState<string | null>(FAQS[0].id);

  // Quick feedback question form state
  const [userQuestion, setUserQuestion] = useState({
    name: '',
    contact: '',
    questionText: ''
  });
  const [submitStatus, setSubmitStatus] = useState<'idle' | 'submitted'>('idle');

  const filteredFaqs = useMemo(() => {
    return FAQS.filter(item => {
      const matchesCategory = selectedCategory === 'all' || item.category === selectedCategory;
      const cleanSearch = searchTerm.trim().toLowerCase();
      const matchesSearch = !cleanSearch || 
        item.question.toLowerCase().includes(cleanSearch) || 
        item.answer.toLowerCase().includes(cleanSearch) ||
        item.categoryLabel.toLowerCase().includes(cleanSearch);
      return matchesCategory && matchesSearch;
    });
  }, [searchTerm, selectedCategory]);

  const toggleFaq = (id: string) => {
    setOpenFaqId(prev => (prev === id ? null : id));
  };

  const handleAskSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!userQuestion.questionText.trim()) return;
    setSubmitStatus('submitted');
  };

  return (
    <main className="min-h-screen bg-[#f8fafc] font-sans selection:bg-teal-500/20 selection:text-teal-800 pb-28">
      <Helmet>
        <title>Câu Hỏi Thường Gặp (FAQ) | FAST E-Learning</title>
        <meta name="description" content="Giải đáp chi tiết hơn 16 câu hỏi phổ biến về khóa học ISO, HACCP, hình thức cấp chứng nhận bản cứng, học phí, phương thức thanh toán VietQR và hỗ trợ kỹ thuật tại FAST." />
      </Helmet>

      {/* Hero Banner with Search */}
      <section className="relative pt-16 pb-20 md:pb-24 bg-gradient-to-b from-[#004d49] via-[#00605c] to-[#007c76] text-white overflow-hidden shadow-md">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-teal-300/15 via-transparent to-transparent pointer-events-none" />
        
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 text-center">
          <div className="flex justify-center mb-6">
            <Breadcrumbs theme="light" items={[{ label: 'Trang chủ', path: '/' }, { label: 'Hỏi đáp (FAQ)' }]} />
          </div>

          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-xs font-black uppercase tracking-widest mb-6">
            <HelpCircle className="w-3.5 h-3.5 text-teal-300" />
            <span>Trung Tâm Trợ Giúp &amp; Giải Đáp Thắc Mắc</span>
          </div>

          <h1 className="text-3xl sm:text-5xl md:text-6xl font-black uppercase tracking-tight mb-4 drop-shadow-sm">
            Câu Hỏi <span className="text-teal-200">Thường Gặp</span>
          </h1>

          <p className="text-sm sm:text-base md:text-lg text-teal-50 max-w-2xl mx-auto font-medium leading-relaxed mb-8">
            Tìm kiếm nhanh câu trả lời chuẩn xác về lộ trình đào tạo, thanh toán tự động, hình thức nhận chứng nhận và chính sách hỗ trợ học viên.
          </p>

          {/* Interactive Search Box */}
          <div className="max-w-2xl mx-auto relative">
            <div className="relative flex items-center">
              <Search className="w-5 h-5 text-slate-400 absolute left-4.5 pointer-events-none" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Nhập từ khóa cần tìm: chứng nhận, thanh toán, HACCP, kích hoạt..."
                className="w-full pl-12 pr-10 py-4 bg-white text-slate-900 placeholder:text-slate-400 rounded-2xl font-semibold text-sm sm:text-base shadow-xl focus:outline-none focus:ring-4 focus:ring-teal-300/40 transition-all"
              />
              {searchTerm && (
                <button
                  type="button"
                  onClick={() => setSearchTerm('')}
                  className="absolute right-3.5 text-xs font-bold text-slate-400 hover:text-slate-600 px-2 py-1 rounded-lg bg-slate-100 cursor-pointer"
                >
                  Xóa
                </button>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Categories Filter Strip */}
      <section className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 -mt-6 relative z-20">
        <div className="bg-white rounded-2xl p-2 shadow-lg border border-slate-200/80 flex items-center gap-1.5 overflow-x-auto no-scrollbar">
          {CATEGORIES.map((cat) => {
            const isSelected = selectedCategory === cat.id;
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => setSelectedCategory(cat.id)}
                className={`px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider whitespace-nowrap transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-[#007c76] text-white shadow-sm'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                }`}
              >
                {cat.label}
              </button>
            );
          })}
        </div>
      </section>

      {/* Main FAQ Accordion List */}
      <section className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 mt-10">
        <div className="flex items-center justify-between mb-6">
          <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">
            Hiển thị <span className="font-black text-slate-900">{filteredFaqs.length}</span> câu hỏi
            {searchTerm && <span> cho từ khóa "{searchTerm}"</span>}
          </div>
          {searchTerm && (
            <button
              onClick={() => { setSearchTerm(''); setSelectedCategory('all'); }}
              className="text-xs font-bold text-[#007c76] hover:underline cursor-pointer"
            >
              Xem tất cả
            </button>
          )}
        </div>

        {filteredFaqs.length === 0 ? (
          <div className="bg-white rounded-3xl p-12 text-center border border-slate-200 space-y-4">
            <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mx-auto text-slate-400">
              <HelpCircle className="w-8 h-8" />
            </div>
            <h3 className="text-lg font-bold text-slate-800">Không tìm thấy câu hỏi phù hợp</h3>
            <p className="text-sm text-slate-500 max-w-sm mx-auto">
              Hãy thử tìm với các từ khóa khác như "chứng nhận", "thanh toán", "ISO" hoặc gửi câu hỏi trực tiếp cho đội ngũ hỗ trợ.
            </p>
            <button
              onClick={() => setSearchTerm('')}
              className="px-6 py-2.5 bg-[#007c76] text-white rounded-xl text-xs font-bold uppercase tracking-wider hover:bg-[#00605c] transition"
            >
              Xóa bộ lọc tìm kiếm
            </button>
          </div>
        ) : (
          <div className="space-y-3.5">
            {filteredFaqs.map((faq, index) => {
              const isOpen = openFaqId === faq.id;
              return (
                <div
                  key={faq.id}
                  className={`bg-white rounded-2xl border transition-all duration-200 overflow-hidden ${
                    isOpen
                      ? 'border-[#007c76] shadow-md ring-1 ring-[#007c76]/20'
                      : 'border-slate-200/80 hover:border-slate-300'
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => toggleFaq(faq.id)}
                    className="w-full p-5 sm:p-6 text-left flex items-start justify-between gap-4 cursor-pointer"
                  >
                    <div className="space-y-1">
                      <span className="inline-block text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md bg-teal-50 text-[#007c76] border border-teal-200/60">
                        {faq.categoryLabel}
                      </span>
                      <h3 className={`text-base sm:text-lg font-extrabold leading-snug transition-colors ${
                        isOpen ? 'text-[#007c76]' : 'text-slate-900'
                      }`}>
                        {faq.question}
                      </h3>
                    </div>
                    <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 transition-transform duration-200 ${
                      isOpen ? 'bg-[#007c76] text-white rotate-180' : 'bg-slate-100 text-slate-500'
                    }`}>
                      <ChevronDown className="w-4 h-4" />
                    </div>
                  </button>

                  {isOpen && (
                    <div className="px-5 sm:px-6 pb-6 pt-1 text-slate-600 text-sm sm:text-base leading-relaxed border-t border-slate-100">
                      <div className="p-4 bg-slate-50 rounded-xl border border-slate-200/60">
                        <p>{faq.answer}</p>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Ask a Question / Quick Support Section */}
      <section className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 mt-16">
        <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-[#004d49] rounded-3xl p-8 sm:p-12 text-white shadow-xl relative overflow-hidden">
          <div className="absolute right-0 top-0 w-96 h-96 bg-teal-500/10 rounded-full blur-3xl pointer-events-none" />

          <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            <div className="lg:col-span-7 space-y-4">
              <span className="px-3 py-1 rounded-full bg-teal-500/20 text-teal-300 text-xs font-black uppercase tracking-widest border border-teal-500/30">
                Chưa Có Câu Trả Lời Bạn Cần?
              </span>
              <h2 className="text-2xl sm:text-3xl font-black uppercase tracking-tight">
                Gửi Thắc Mắc Cho Chuyên Gia FAST
              </h2>
              <p className="text-slate-300 text-sm leading-relaxed">
                Đội ngũ cố vấn và giảng viên QMS sẵn sàng giải đáp kỹ thuật, hỗ trợ thủ tục cấp chứng nhận và tư vấn quy trình miễn phí.
              </p>
              
              <div className="pt-2 flex flex-wrap gap-4 text-xs font-bold text-teal-200">
                <a href="tel:0989499579" className="flex items-center gap-2 hover:text-white transition">
                  <PhoneCall className="w-4 h-4 text-teal-300" />
                  <span>Hotline: 0989 499 579</span>
                </a>
                <a href="mailto:hkc.qms@gmail.com" className="flex items-center gap-2 hover:text-white transition">
                  <Mail className="w-4 h-4 text-teal-300" />
                  <span>hkc.qms@gmail.com</span>
                </a>
                <a href="mailto:support@fastelearning.com.vn" className="flex items-center gap-2 hover:text-white transition">
                  <Mail className="w-4 h-4 text-teal-300" />
                  <span>support@fastelearning.com.vn</span>
                </a>
              </div>
            </div>

            <div className="lg:col-span-5 bg-white/10 backdrop-blur-md rounded-2xl p-6 border border-white/20">
              {submitStatus === 'submitted' ? (
                <div className="py-6 text-center space-y-3">
                  <CheckCircle2 className="w-12 h-12 text-teal-300 mx-auto" />
                  <h4 className="text-lg font-black uppercase">Đã Tiếp Nhận!</h4>
                  <p className="text-xs text-slate-200">
                    Cảm ơn bạn. Chuyên viên FAST sẽ phản hồi qua thông tin liên hệ trong thời gian sớm nhất.
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      setSubmitStatus('idle');
                      setUserQuestion({ name: '', contact: '', questionText: '' });
                    }}
                    className="text-xs font-bold text-teal-300 underline mt-2 cursor-pointer"
                  >
                    Gửi câu hỏi khác
                  </button>
                </div>
              ) : (
                <form onSubmit={handleAskSubmit} className="space-y-3">
                  <h3 className="text-sm font-black uppercase tracking-wider text-teal-200">Đặt câu hỏi nhanh:</h3>
                  <input
                    type="text"
                    required
                    value={userQuestion.name}
                    onChange={(e) => setUserQuestion({ ...userQuestion, name: e.target.value })}
                    placeholder="Họ và tên của bạn"
                    className="w-full px-3.5 py-2.5 bg-slate-950/60 border border-slate-700 rounded-xl text-xs font-medium text-white placeholder:text-slate-400 focus:outline-none focus:border-teal-400"
                  />
                  <input
                    type="text"
                    required
                    value={userQuestion.contact}
                    onChange={(e) => setUserQuestion({ ...userQuestion, contact: e.target.value })}
                    placeholder="Số điện thoại hoặc Email"
                    className="w-full px-3.5 py-2.5 bg-slate-950/60 border border-slate-700 rounded-xl text-xs font-medium text-white placeholder:text-slate-400 focus:outline-none focus:border-teal-400"
                  />
                  <textarea
                    rows={2}
                    required
                    value={userQuestion.questionText}
                    onChange={(e) => setUserQuestion({ ...userQuestion, questionText: e.target.value })}
                    placeholder="Nội dung câu hỏi bạn cần giải đáp..."
                    className="w-full px-3.5 py-2.5 bg-slate-950/60 border border-slate-700 rounded-xl text-xs font-medium text-white placeholder:text-slate-400 focus:outline-none focus:border-teal-400 resize-none"
                  />
                  <button
                    type="submit"
                    className="w-full py-2.5 bg-[#007c76] hover:bg-[#00928b] text-white rounded-xl text-xs font-black uppercase tracking-wider transition shadow-md flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>Gửi Câu Hỏi</span>
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>
      </section>
    </main>
  );
};

export default FAQ;
