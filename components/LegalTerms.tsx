import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Search, Link2, Check, ShieldCheck, Trash2 } from 'lucide-react';
import { useToast } from '../contexts/ToastContext';

interface LegalTermsProps {
  defaultSection?: string;
}

interface TermSection {
  id: string;
  number: string;
  title: string;
  summary: string;
  keywords: string;
  paragraphs: string[];
  bullets?: { label?: string; text: string }[];
  table?: {
    headers: [string, string];
    rows: [string, string][];
  };
  note?: string;
}

const TERM_SECTIONS: TermSection[] = [
  {
    id: 'dang-ky',
    number: '01',
    title: 'Quy định về Đăng ký tài khoản & Đăng ký khóa đào tạo',
    summary:
      'Điều kiện đăng ký tài khoản học viên qua Email/Mật khẩu, Google hoặc Facebook và quy trình ghi danh các khóa đào tạo trực tuyến / trực tiếp.',
    keywords: 'đăng ký tài khoản facebook google email mật khẩu khóa đào tạo zoom trực tiếp 16 tuổi uid',
    paragraphs: [
      'Người dùng đủ từ 16 tuổi trở lên có thể đăng ký tài khoản tại FAST E-Learning bằng Email/Mật khẩu, Google Sign-In hoặc Facebook Login ("Tiếp tục với Facebook"). Khi đăng ký, bạn cam kết cung cấp trung thực họ và tên, địa chỉ email và số điện thoại liên hệ để hệ thống gửi thông báo lớp học, hỗ trợ đối soát và in chính xác thông tin trên Giấy chứng nhận hoàn thành.',
      'Mỗi học viên chỉ nên sử dụng một tài khoản định danh duy nhất (Firebase UID). Trường hợp bạn đã có tài khoản bằng Google hoặc Email/Mật khẩu, bạn có thể liên kết thêm phương thức đăng nhập Facebook trong mục Cài đặt tài khoản -> Thông tin cá nhân & Liên kết để giữ nguyên toàn bộ khóa học và tiến độ đã có.'
    ],
    bullets: [
      {
        label: 'Đăng ký tài khoản học viên',
        text: 'Thông tin đăng nhập (bao gồm phiên Google/Facebook hoặc OTP) mang tính cá nhân. Nếu đăng ký cho nhân sự doanh nghiệp, mỗi học viên phải có tài khoản và họ tên riêng để ghi nhận điểm kiểm tra và cấp chứng nhận cá nhân.'
      },
      {
        label: 'Đăng ký khóa đào tạo trực tiếp / Zoom',
        text: 'Khi hoàn tất biểu mẫu đăng ký khóa đào tạo (/khoa-dao-tao), hệ thống cấp mã hồ sơ 10 chữ số, ghi nhận lịch tham dự và gửi đường link lớp học / thông báo xác nhận trực tiếp vào mục Thông báo tài khoản của bạn.'
      }
    ]
  },
  {
    id: 'mua-khoa-hoc',
    number: '02',
    title: 'Quy định về Mua khóa học & Điều kiện giao dịch',
    summary:
      'Bản chất dịch vụ học liệu số, thông tin học phí niêm yết và quy trình mua khóa học — kích hoạt quyền truy cập trên hệ thống.',
    keywords: 'mua khóa học điều kiện giao dịch quyền truy cập học phí vnđ chứng nhận 599k kích hoạt',
    paragraphs: [
      'FAST E-Learning cung cấp quyền truy cập trực tuyến (theo thời hạn khóa học hoặc trọn đời theo gói công bố) vào hệ thống bài giảng video, học liệu, biểu mẫu kiểm toán ISO/HACCP/ATTP và bài kiểm tra trắc nghiệm tương ứng.',
      'Quy trình mua khóa học chuẩn gồm 4 bước: (1) Chọn khóa học hoặc gói đào tạo phù hợp -> (2) Xác nhận thông tin học viên (Họ tên, Email, Số điện thoại) -> (3) Thực hiện thanh toán qua mã VietQR ngân hàng -> (4) Hệ thống đối soát tự động trong 1–3 giây và mở khóa bài giảng ngay trên tài khoản.'
    ],
    bullets: [
      {
        label: 'Minh bạch học phí & hóa đơn',
        text: 'Mọi mức giá niêm yết bằng Đồng Việt Nam (VNĐ) là giá trọn gói, đã bao gồm chi phí lưu trữ bài giảng, chấm bài trắc nghiệm tự động và cấp Giấy chứng nhận hoàn thành bản mềm (Digital Certificate).'
      },
      {
        label: 'Không mua bán sẵn Giấy chứng nhận',
        text: 'Học phí mua khóa học dùng để tiếp cận chương trình đào tạo và hệ thống đánh giá kiến thức, KHÔNG phải là giao dịch mua bán chứng nhận. Học viên cần học tối thiểu 80% thời lượng bài giảng và đạt từ 80% điểm kiểm tra trắc nghiệm trở lên mới đủ điều kiện nhận Giấy chứng nhận.'
      }
    ]
  },
  {
    id: 'thanh-toan',
    number: '03',
    title: 'Chính sách Thanh toán & Xử lý sự cố chuyển khoản',
    summary:
      'Phương thức thanh toán qua VietQR / Ngân hàng TMCP Á Châu (ACB) và cơ chế xử lý các trường hợp chuyển sai nội dung, thiếu hoặc thừa tiền.',
    keywords: 'thanh toán vietqr acb chuyển khoản sai nội dung thiếu thừa trùng lặp đối soát',
    paragraphs: [
      'Nền tảng tích hợp cổng chuyển khoản ngân hàng tự động VietQR kết nối trực tiếp với tài khoản thụ hưởng của Công ty TNHH Tư Vấn FAST tại Ngân hàng TMCP Á Châu (ACB). Nội dung chuyển khoản chứa mã đơn hàng 10 chữ số để kích hoạt khóa học hoàn toàn tự động.'
    ],
    bullets: [
      {
        label: 'Chuyển khoản sai hoặc thiếu nội dung định danh',
        text: 'Hệ thống ghi nhận giao dịch vào nhật ký chờ đối soát. Học viên vui lòng chụp biên lai chuyển khoản và liên hệ Hotline/Zalo 0927 002 668 hoặc email support@fastelearning.com.vn để đội ngũ kỹ thuật kiểm tra và kích hoạt thủ công trong vòng 5–15 phút.'
      },
      {
        label: 'Chuyển khoản thiếu số tiền học phí',
        text: 'Đơn hàng chưa thể kích hoạt tự động. Học viên cần chuyển bổ sung phần tiền còn thiếu kèm đúng mã đơn hoặc yêu cầu hoàn trả lại phần giao dịch chưa hoàn tất.'
      },
      {
        label: 'Chuyển khoản thừa tiền hoặc thanh toán trùng lặp',
        text: 'Khóa học vẫn được kích hoạt ngay lập tức và bộ phận kế toán sẽ hoàn trả 100% số tiền thừa/trùng về tài khoản ngân hàng gốc của học viên trong vòng 24 giờ làm việc.'
      }
    ]
  },
  {
    id: 'hoan-tien',
    number: '04',
    title: 'Chính sách Hoàn tiền & Hủy khóa học',
    summary:
      'Quy định rõ các trường hợp được hoàn trả 100% học phí, điều kiện áp dụng trong 7 ngày và trách nhiệm xử lý khi phát sinh lỗi kỹ thuật.',
    keywords: 'hoàn tiền hủy khóa học 7 ngày 24 giờ 48 giờ chuyển trùng chưa kích hoạt',
    paragraphs: [
      'FAST E-Learning áp dụng chính sách hoàn tiền minh bạch, tuân thủ Luật Bảo vệ quyền lợi người tiêu dùng theo từng tình huống cụ thể dưới đây:'
    ],
    table: {
      headers: ['Trường hợp yêu cầu hoàn tiền / hủy khóa', 'Phương án giải quyết'],
      rows: [
        [
          'Chưa kích hoạt hoặc chưa mở xem video bài giảng',
          'Hoàn tiền 100% học phí trong vòng 7 ngày kể từ thời điểm thanh toán thành công.'
        ],
        [
          'Đã kích hoạt và đã bấm mở xem nội dung bài học',
          'Không hỗ trợ hoàn học phí sau khi tài khoản đã truy cập vào nội dung số, trừ trường hợp lỗi kỹ thuật phía hệ thống.'
        ],
        [
          'Thanh toán trùng lặp hoặc chuyển thừa tiền',
          'Hoàn trả 100% khoản tiền trùng/thừa về tài khoản nguồn trong vòng 24 giờ làm việc sau khi đối soát.'
        ],
        [
          'Lỗi kỹ thuật nghiêm trọng từ phía FAST',
          'Hoàn trả 100% học phí nếu sự cố kỹ thuật hệ thống khiến học viên không thể học kéo dài quá 48 giờ liên tục.'
        ],
        [
          'Khóa đào tạo trực tiếp/Zoom bị hủy hoặc dời lịch từ phía FAST',
          'Học viên được chọn hoàn tiền 100% hoặc bảo lưu sang lịch khai giảng kế tiếp theo nguyện vọng.'
        ]
      ]
    },
    note: 'Để gửi yêu cầu hoàn tiền, vui lòng gửi email tới support@fastelearning.com.vn hoặc gọi Hotline 0927 002 668 kèm mã đơn hàng 10 chữ số và ảnh chụp biên lai giao dịch.'
  },
  {
    id: 'su-dung-tai-khoan',
    number: '05',
    title: 'Quy định Sử dụng tài khoản & Bảo vệ bản quyền',
    summary:
      'Nguyên tắc sử dụng tài khoản cá nhân, nghiêm cấm chia sẻ tài khoản, ghi hình/phát tán học liệu và biện pháp xử lý vi phạm.',
    keywords: 'sử dụng tài khoản chia sẻ quay màn hình bản quyền sở hữu trí tuệ khóa tài khoản bảo mật',
    paragraphs: [
      'Mỗi tài khoản FAST E-Learning chỉ cấp quyền sử dụng cho một (01) cá nhân duy nhất tương ứng với thông tin đăng ký. Người dùng tự chịu trách nhiệm bảo mật thiết bị, email, phiên đăng nhập Google/Facebook và mã OTP của mình.'
    ],
    bullets: [
      {
        label: 'Nghiêm cấm chia sẻ, cho mượn hoặc bán lại tài khoản',
        text: 'Tuyệt đối không chia sẻ thông tin đăng nhập cho nhiều người dùng chung hoặc chuyển nhượng tài khoản dưới mọi hình thức. Hệ thống có cơ chế kiểm soát phiên đồng thời để bảo vệ tài khoản và có thể tạm khóa tự động khi phát hiện truy cập song song bất thường từ nhiều thiết bị/IP.'
      },
      {
        label: 'Nghiêm cấm quay màn hình, tải lậu & phát tán học liệu',
        text: 'Toàn bộ video bài giảng, slide, tài liệu quy trình HACCP/ISO, bộ câu hỏi trắc nghiệm và giao diện thương hiệu đều thuộc quyền sở hữu trí tuệ của Công ty TNHH Tư Vấn FAST. Nghiêm cấm hành vi quay phim màn hình, tải trái phép hoặc phát tán/thương mại hóa học liệu ra bên ngoài.'
      },
      {
        label: 'Chấm dứt quyền sử dụng do vi phạm & Quyền tự xóa tài khoản',
        text: 'Tài khoản vi phạm nghiêm trọng quy định bản quyền hoặc chia sẻ trái phép có thể bị khóa vĩnh viễn mà không được hoàn phí. Ngược lại, nếu không còn nhu cầu sử dụng dịch vụ, bạn có toàn quyền yêu cầu xóa tài khoản và dữ liệu cá nhân bất kỳ lúc nào tại trang Hướng dẫn xóa dữ liệu (/data-deletion).'
      }
    ]
  },
  {
    id: 'chung-nhan-va-khieu-nai',
    number: '06',
    title: 'Chứng nhận hoàn thành, Bảo mật dữ liệu & Giải quyết khiếu nại',
    summary:
      'Giá trị pháp lý của Giấy chứng nhận hoàn thành, cam kết bảo vệ dữ liệu theo Luật 91/2025/QH15 và kênh tiếp nhận khiếu nại chính thức.',
    keywords: 'chứng nhận 80% khiếu nại bảo mật dữ liệu 91/2025/qh15 doanh nghiệp mst 0314568146',
    paragraphs: [
      'Giấy chứng nhận được cấp sau khi hoàn thành >= 80% thời lượng bài giảng và đạt >= 80% điểm kiểm tra trắc nghiệm là "Giấy chứng nhận hoàn thành khóa học" (Certificate of Completion) do FAST E-Learning cấp kèm mã tra cứu 10 chữ số, không phải văn bằng giáo dục nghề nghiệp hay chứng chỉ hành nghề do cơ quan Nhà nước trực tiếp cấp.',
      'Việc thu thập và bảo vệ tên, email, thông tin xác thực Facebook/Google, dữ liệu học tập và dữ liệu giao dịch được quy định chi tiết tại Chính sách & Quyền riêng tư (/privacy-policy) tuân thủ Luật Bảo vệ dữ liệu cá nhân số 91/2025/QH15.'
    ],
    bullets: [
      {
        label: 'Đơn vị chủ quản vận hành',
        text: 'CÔNG TY TNHH TƯ VẤN FAST (FAST CONSULTING COMPANY LIMITED) — MST: 0314568146 · Tòa nhà Mộc Gia, Tầng 6, Số 238-240-242 đường Nguyễn Oanh, Phường Gò Vấp, TP. Hồ Chí Minh.'
      },
      {
        label: 'Kênh tiếp nhận khiếu nại & hỗ trợ (rà soát trong 12 giờ)',
        text: 'Email hỗ trợ: support@fastelearning.com.vn · Email doanh nghiệp: hkc.qms@gmail.com · Hotline / Zalo: 0927 002 668.'
      }
    ]
  }
];

export const LegalTerms: React.FC<LegalTermsProps> = ({ defaultSection }) => {
  const location = useLocation();
  const toast = useToast();
  const [searchTerm, setSearchTerm] = useState('');
  const [activeSectionId, setActiveSectionId] = useState<string>(defaultSection && TERM_SECTIONS.some(s => s.id === defaultSection) ? defaultSection : TERM_SECTIONS[0].id);
  const [copiedAnchorId, setCopiedAnchorId] = useState<string | null>(null);
  const sectionRefs = useRef<Record<string, HTMLElement | null>>({});

  useEffect(() => {
    if (location.hash) {
      const targetId = location.hash.replace('#', '');
      const match = TERM_SECTIONS.find((s) => s.id === targetId);
      if (match) {
        setActiveSectionId(targetId);
        setTimeout(() => {
          sectionRefs.current[targetId]?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 120);
      }
    }
  }, [location.hash]);

  const filteredSections = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    if (!q) return TERM_SECTIONS;
    return TERM_SECTIONS.filter(
      (sec) =>
        sec.title.toLowerCase().includes(q) ||
        sec.summary.toLowerCase().includes(q) ||
        sec.keywords.toLowerCase().includes(q) ||
        sec.paragraphs.some((p) => p.toLowerCase().includes(q)) ||
        (sec.bullets && sec.bullets.some((b) => b.text.toLowerCase().includes(q) || (b.label && b.label.toLowerCase().includes(q))))
    );
  }, [searchTerm]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.find((entry) => entry.isIntersecting);
        if (visible?.target?.id) {
          setActiveSectionId(visible.target.id);
        }
      },
      { rootMargin: '-120px 0px -65% 0px', threshold: 0.05 }
    );

    filteredSections.forEach((sec) => {
      const el = sectionRefs.current[sec.id];
      if (el) observer.observe(el);
    });

    return () => observer.disconnect();
  }, [filteredSections]);

  const handleJumpToSection = (id: string) => {
    setActiveSectionId(id);
    const el = sectionRefs.current[id];
    if (el) {
      const yOffset = -110;
      const y = el.getBoundingClientRect().top + window.scrollY + yOffset;
      window.scrollTo({ top: y, behavior: 'smooth' });
    }
  };

  const handleCopyAnchor = async (id: string) => {
    const basePath = location.pathname || '/terms';
    const url = `${window.location.origin}${basePath}#${id}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopiedAnchorId(id);
      toast.showToast('Đã sao chép đường liên kết tới điều khoản này.', 'success');
      setTimeout(() => setCopiedAnchorId(null), 2000);
    } catch {
      toast.showToast('Không thể sao chép liên kết tự động.', 'error');
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100 select-text transition-colors duration-200">
      {/* Top Editorial Header Banner */}
      <section className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-10 pb-8">
          <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6">
            <div className="max-w-3xl space-y-3">
              <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-xs font-medium text-slate-500 dark:text-slate-400">
                <span className="text-[#007c76] dark:text-teal-400 font-semibold">
                  Pháp lý & Thỏa thuận người dùng
                </span>
                <span aria-hidden="true">·</span>
                <span className="tabular-nums">Có hiệu lực: 01/01/2026</span>
                <span aria-hidden="true">·</span>
                <span className="tabular-nums">Cập nhật: 14/11/2026</span>
                <span aria-hidden="true">·</span>
                <span>CÔNG TY TNHH TƯ VẤN FAST</span>
              </div>

              <h1
                className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-slate-900 dark:text-white leading-tight"
                style={{ textWrap: 'balance' }}
              >
                Điều khoản dịch vụ
              </h1>

              <p className="text-base sm:text-lg text-slate-600 dark:text-slate-300 leading-relaxed max-w-2xl">
                Quy định đầy đủ về việc đăng ký tài khoản & khóa đào tạo, mua khóa học, thanh toán VietQR, chính sách hoàn tiền và nguyên tắc sử dụng tài khoản tại FAST E-Learning.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <Link
                to="/privacy-policy"
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:border-[#007c76] hover:text-[#007c76] dark:hover:text-teal-400 transition-colors whitespace-nowrap shrink-0"
              >
                <ShieldCheck className="w-4 h-4" />
                <span>Chính sách quyền riêng tư</span>
              </Link>
              <Link
                to="/data-deletion"
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:border-[#007c76] hover:text-[#007c76] dark:hover:text-teal-400 transition-colors whitespace-nowrap shrink-0"
              >
                <Trash2 className="w-4 h-4" />
                <span>Hướng dẫn xóa dữ liệu</span>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Main Content Workspace */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 lg:py-12">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-start">
          {/* Left Sticky Table of Contents + Search */}
          <aside className="lg:col-span-4 lg:sticky lg:top-28 space-y-5">
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 space-y-4">
              <div className="space-y-1.5">
                <label
                  htmlFor="terms-search-input"
                  className="block text-xs font-semibold text-slate-600 dark:text-slate-300"
                >
                  Tìm nhanh điều khoản
                </label>
                <div className="relative">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    id="terms-search-input"
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Ví dụ: hoàn tiền, VietQR, đăng ký..."
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs sm:text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-[#007c76] focus:ring-2 focus:ring-[#007c76]/15"
                  />
                </div>
              </div>

              <div className="border-t border-slate-100 dark:border-slate-800 pt-4">
                <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-3">
                  Mục lục ({filteredSections.length} / {TERM_SECTIONS.length} điều khoản)
                </p>
                <ul className="space-y-1">
                  {filteredSections.map((sec) => {
                    const isCurrent = activeSectionId === sec.id;
                    return (
                      <li key={sec.id}>
                        <button
                          type="button"
                          onClick={() => handleJumpToSection(sec.id)}
                          className={`w-full text-left px-3 py-2 rounded-lg text-xs leading-snug transition-colors cursor-pointer flex items-start gap-2.5 ${
                            isCurrent
                              ? 'bg-[#007c76]/10 text-[#007c76] dark:text-teal-300 font-semibold'
                              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/70 hover:text-slate-900 dark:hover:text-white'
                          }`}
                        >
                          <span className="tabular-nums font-mono text-[11px] opacity-75 shrink-0 mt-0.5">
                            {sec.number}.
                          </span>
                          <span>{sec.title}</span>
                        </button>
                      </li>
                    );
                  })}
                  {filteredSections.length === 0 && (
                    <li className="py-4 text-center text-xs text-slate-400">
                      Không tìm thấy điều khoản khớp từ khóa.
                    </li>
                  )}
                </ul>
              </div>
            </div>
          </aside>

          {/* Main Editorial Reading Column */}
          <article className="lg:col-span-8 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 sm:p-10 lg:p-12 space-y-10">
            <div className="p-6 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-4">
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                Tóm tắt nhanh quyền và nghĩa vụ
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                <div>
                  <p className="font-semibold text-slate-900 dark:text-white mb-1">Đăng ký & Sử dụng tài khoản</p>
                  <p>Hỗ trợ Email, Google và Facebook Login; mỗi tài khoản phục vụ một cá nhân và không được chia sẻ trái phép.</p>
                </div>
                <div>
                  <p className="font-semibold text-slate-900 dark:text-white mb-1">Mua khóa học & Thanh toán</p>
                  <p>Niêm yết trọn gói VNĐ, thanh toán chuyển khoản VietQR/ACB đối soát tự động kích hoạt trong 1–3 giây.</p>
                </div>
                <div>
                  <p className="font-semibold text-slate-900 dark:text-white mb-1">Chính sách hoàn tiền</p>
                  <p>Hoàn 100% trong 7 ngày nếu chưa mở học bài giảng, hoặc trong 24 giờ đối với giao dịch chuyển thừa/trùng.</p>
                </div>
                <div>
                  <p className="font-semibold text-slate-900 dark:text-white mb-1">Chứng nhận &amp; Quyền riêng tư</p>
                  <p>Cấp chứng nhận điện tử sau khi đạt điều kiện (từ 80% tiến độ &amp; điểm thi trở lên); bảo vệ dữ liệu theo Luật 91/2025/QH15.</p>
                </div>
              </div>
            </div>

            <div className="divide-y divide-slate-200 dark:divide-slate-800">
              {filteredSections.map((sec, idx) => (
                <section
                  key={sec.id}
                  id={sec.id}
                  ref={(el) => {
                    sectionRefs.current[sec.id] = el;
                  }}
                  className={idx === 0 ? 'pb-10 space-y-5' : 'py-10 space-y-5'}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="space-y-1.5">
                      <div className="text-xs font-semibold text-[#007c76] dark:text-teal-400 tabular-nums">
                        Điều khoản {sec.number}
                      </div>
                      <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white leading-snug">
                        {sec.title}
                      </h2>
                      <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
                        {sec.summary}
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleCopyAnchor(sec.id)}
                      title="Sao chép liên kết tới mục này"
                      className="p-2 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-400 hover:text-[#007c76] hover:border-[#007c76] transition-colors shrink-0 cursor-pointer"
                    >
                      {copiedAnchorId === sec.id ? (
                        <Check className="w-4 h-4 text-emerald-600" />
                      ) : (
                        <Link2 className="w-4 h-4" />
                      )}
                    </button>
                  </div>

                  <div className="max-w-3xl space-y-4 text-sm sm:text-[15px] text-slate-700 dark:text-slate-300 leading-relaxed">
                    {sec.paragraphs.map((p, pIdx) => (
                      <p key={pIdx}>{p}</p>
                    ))}

                    {sec.bullets && (
                      <ul className="space-y-3 pt-1">
                        {sec.bullets.map((b, bIdx) => (
                          <li
                            key={bIdx}
                            className="pl-4 border-l border-slate-200 dark:border-slate-700 space-y-0.5"
                          >
                            {b.label && (
                              <p className="font-semibold text-slate-900 dark:text-white">
                                {b.label}
                              </p>
                            )}
                            <p className="text-slate-600 dark:text-slate-300">{b.text}</p>
                          </li>
                        ))}
                      </ul>
                    )}

                    {sec.table && (
                      <div className="overflow-x-auto border border-slate-200 dark:border-slate-700 rounded-xl mt-2">
                        <table className="w-full text-left border-collapse text-xs sm:text-sm">
                          <thead>
                            <tr className="bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white">
                              <th className="p-3.5 font-semibold">{sec.table.headers[0]}</th>
                              <th className="p-3.5 font-semibold">{sec.table.headers[1]}</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-200 dark:divide-slate-800 text-slate-600 dark:text-slate-300">
                            {sec.table.rows.map(([caseLabel, resolution], rIdx) => (
                              <tr key={rIdx} className="align-top">
                                <td className="p-3.5 font-semibold text-slate-900 dark:text-white w-2/5">
                                  {caseLabel}
                                </td>
                                <td className="p-3.5">{resolution}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}

                    {sec.note && (
                      <div className="p-4 rounded-xl bg-[#007c76]/[0.05] dark:bg-teal-950/30 border border-[#007c76]/20 text-xs sm:text-sm text-slate-700 dark:text-teal-200 leading-relaxed">
                        {sec.note}
                      </div>
                    )}
                  </div>
                </section>
              ))}
            </div>
          </article>
        </div>
      </div>
    </div>
  );
};

export default LegalTerms;
