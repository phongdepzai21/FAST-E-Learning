
import { NavLink, Course, TeamMember } from './types';

export const ADMIN_EMAILS = [
  'h1h4phong@gmail.com',
  'hkc.qms@gmail.com',
  'trdung153@gmail.com',
  'lediem.ngo@gmail.com',
  // Thêm các email admin khác vào đây
];

export const TEACHER_EMAILS = [
  'h1h4phong@gmail.com',
  'hkc.qms@gmail.com',
  'trdung153@gmail.com',
  'lediem.ngo@gmail.com',
  // Thêm các email giáo viên khác vào đây
];

export const NAV_LINKS: NavLink[] = [
  { label: 'Trang chủ', path: '/' },
  { label: 'Khóa học', path: '/khoa-hoc' },
  { label: 'Tư vấn', path: '/tu-van' },
  { label: 'Cẩm nang', path: '/cam-nang' },
  { label: 'Về chúng tôi', path: '/ve-chung-toi' },
  { label: 'Liên hệ', path: '/lien-he' },
  { label: 'Tài khoản', path: '/account' },
];

export interface ConsultingService {
  id: string;
  title: string;
  description: string;
  icon: string;
  features: string[];
}

export const CONSULTING_SERVICES: ConsultingService[] = [
  {
    id: 'food-safety',
    title: 'Tư vấn An toàn thực phẩm',
    description: 'Hỗ trợ doanh nghiệp hoàn thiện quy trình sản xuất, kinh doanh đáp ứng các tiêu chuẩn khắt khe nhất của Bộ Y tế và cơ quan chức năng.',
    icon: 'shield',
    features: [
      'Hồ sơ cấp Giấy chứng nhận cơ sở đủ điều kiện An toàn thực phẩm',
      'Đào tạo kiến thức An toàn thực phẩm cho nhân viên',
      'Tư vấn thiết kế bếp ăn một chiều chuẩn quy định',
      'Kiểm soát nguồn gốc nguyên liệu đầu vào'
    ]
  },
  {
    id: 'haccp-tcvn',
    title: 'Tư vấn HACCP / TCVN',
    description: 'Xây dựng hệ thống quản lý chất lượng theo tiêu chuẩn quốc tế HACCP và tiêu chuẩn Việt Nam (TCVN) cho mọi loại hình doanh nghiệp thực phẩm.',
    icon: 'clipboard',
    features: [
      'Phân tích mối nguy và điểm kiểm soát tới hạn',
      'Xây dựng kế hoạch HACCP chi tiết',
      'Chuẩn hóa quy trình vận hành tiêu chuẩn (SOP)',
      'Hỗ trợ đánh giá và cấp chứng chỉ quốc tế'
    ]
  }
];

export const COURSES: Course[] = [
  {
    id: 'test-course-2k',
    title: 'Test System Payment',
    price: '199.000đ',
    image: 'https://images.unsplash.com/photo-1563986768609-322da13575f3?auto=format&fit=crop&q=80&w=800',
    category: 'Testing',
    description: 'Khóa học dùng để kiểm thử hệ thống thanh toán và kích hoạt tự động với giá 199.000đ.'
  },
  {
    id: 'haccp-tcvn',
    title: 'Khóa học HACCP TCVN',
    price: '599.000đ',
    image: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?auto=format&fit=crop&q=80&w=800',
    category: 'HACCP',
    description: 'Nắm vững nguyên tắc phân tích mối nguy và kiểm soát điểm tới hạn theo tiêu chuẩn Việt Nam.'
  },
  {
    id: 'iso-14001',
    title: 'ISO 14001 - Hệ thống quản lý môi trường',
    price: '599.000đ',
    image: 'https://images.unsplash.com/photo-1500651230702-0e2d8a49d4ad?auto=format&fit=crop&q=80&w=800',
    category: 'ISO',
    description: 'Xây dựng và vận hành hệ thống quản lý môi trường bền vững cho doanh nghiệp sản xuất.'
  },
  {
    id: 'iso-9001',
    title: 'ISO 9001 - Hệ thống quản lý chất lượng',
    price: '599.000đ',
    image: 'https://images.unsplash.com/photo-1513104890138-7c749659a591?auto=format&fit=crop&q=80&w=800',
    category: 'ISO',
    description: 'Tiêu chuẩn vàng về quản lý chất lượng, giúp tối ưu hóa quy trình và nâng cao sự hài lòng của khách hàng.'
  },
  {
    id: 'iso-22000',
    title: 'ISO 22000 - Quản lý An toàn thực phẩm',
    price: '599.000đ',
    image: 'https://images.unsplash.com/photo-1533777857889-4be7c70b33f7?auto=format&fit=crop&q=80&w=800',
    category: 'ISO',
    description: 'Tích hợp ISO 9001 và HACCP để đảm bảo An toàn thực phẩm trong toàn bộ chuỗi cung ứng.'
  },
  {
    id: 'iso-18000',
    title: 'ISO 18000 - Quản lý an toàn và sức khỏe nghề nghiệp',
    price: '599.000đ',
    image: 'https://images.unsplash.com/photo-1521737604893-d14cc237f11d?auto=format&fit=crop&q=80&w=800',
    category: 'ISO',
    description: 'Bảo vệ nguồn nhân lực và giảm thiểu rủi ro tai nạn lao động trong môi trường chuyên nghiệp.'
  },
  {
    id: 'basic-principles',
    title: 'Các Nguyên Tắc Cơ Bản',
    price: '0đ',
    image: 'https://images.unsplash.com/photo-1556910103-1c02745aae4d?auto=format&fit=crop&q=80&w=800',
    category: 'Kiến thức chung',
    description: '5 nguyên tắc vàng về an toàn thực phẩm từ tổ chức Y Tế Thế Giới (WHO).'
  },
  {
    id: 'oem-project',
    title: 'Triển khai dự án OEM chuyên nghiệp',
    price: '599.000đ',
    image: 'https://images.unsplash.com/photo-1563227812-0ea4c22e6cc8?auto=format&fit=crop&q=80&w=800',
    category: 'Sản xuất',
    description: 'Hướng dẫn quy trình gia công thực phẩm, từ lựa chọn nhà máy đến quản lý chất lượng sản phẩm.'
  },
  {
    id: 'supplier-mgmt',
    title: 'Chương trình quản lý nhà cung cấp',
    price: '599.000đ',
    image: 'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?auto=format&fit=crop&q=80&w=800',
    category: 'Quản trị',
    description: 'Xây dựng tiêu chí đánh giá và kiểm soát chất lượng nguyên liệu từ nguồn cung cấp.'
  },
  {
    id: 'cost-control-supply',
    title: 'Kiểm soát chi phí mua hàng và nhà cung cấp',
    price: '599.000đ',
    image: 'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?auto=format&fit=crop&q=80&w=800',
    category: 'Quản trị',
    description: 'Chiến lược tối ưu hóa chi phí thu mua, đánh giá năng lực nhà cung cấp và quản lý rủi ro chuỗi cung ứng.'
  },
  {
    id: 'gemba',
    title: 'Gemba - Cải tiến hiện trường sản xuất',
    price: '399.000đ',
    image: 'https://images.unsplash.com/photo-1552664730-d307ca884978?auto=format&fit=crop&q=80&w=800',
    category: 'Lean',
    description: 'Phương pháp quan sát và cải tiến trực tiếp tại nơi làm việc để tối đa hóa hiệu suất.'
  },
  {
    id: 'qa-qc-pro',
    title: 'Chuyên gia quản lý chất lượng QA/QC',
    price: '499.000đ',
    image: 'https://images.unsplash.com/photo-1582719508461-905c673771fd?auto=format&fit=crop&q=80&w=800',
    category: 'QA/QC',
    description: 'Đào tạo kỹ năng kiểm soát chất lượng thực tế dành cho nhân viên QA/QC tại các nhà máy.'
  },
  {
    id: 'quan-tri-san-xuat',
    title: 'Quản trị sản xuất chuyên nghiệp',
    price: '599.000đ',
    image: 'https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?auto=format&fit=crop&q=80&w=800',
    category: 'Sản xuất',
    description: 'Tối ưu hóa nguồn lực, nâng cao năng suất và tinh gọn quy trình vận hành dành cho ban giám đốc, quản lý xưởng và nhà máy.'
  },
  {
    id: 'vietgap',
    title: 'VietGAP - Thực hành sản xuất nông nghiệp tốt',
    price: '499.000đ',
    image: 'https://images.unsplash.com/photo-1530595467537-0b5996c41f2d?auto=format&fit=crop&q=80&w=800',
    category: 'VietGAP',
    description: 'Xây dựng tiêu chuẩn thực hành nông nghiệp tốt tại Việt Nam, nâng cao năng suất, vệ sinh an toàn dịch bệnh cho nông sản sạch.'
  },
  {
    id: 'halal',
    title: 'Halal - Tiêu chuẩn thực phẩm Hồi giáo',
    price: '599.000đ',
    image: 'https://images.unsplash.com/photo-1580476262798-bddd9f4b7369?auto=format&fit=crop&q=80&w=800',
    category: 'Sản xuất',
    description: 'Kiến thức cốt lõi và hướng dẫn áp dụng tiêu chuẩn Halal để sản phẩm tiếp cận thị trường Hồi giáo toàn cầu.'
  },
  {
    id: 'truy-xuat-nguon-goc',
    title: 'Truy xuất nguồn gốc sản phẩm',
    price: '499.000đ',
    image: 'https://images.unsplash.com/photo-1601598851547-4302969d0614?auto=format&fit=crop&q=80&w=800',
    category: 'Quản trị',
    description: 'Xây dựng hệ thống theo dõi và minh bạch thông tin vòng đời sản phẩm từ nông trại đến bàn ăn.'
  }
];

export const TEAM: TeamMember[] = [
  {
    name: 'Bà Trần Dung',
    role: 'CEO',
    image: 'https://2fast.com.vn/wp-content/uploads/2024/10/av_01-1.jpg'
  },
  {
    name: 'Bà Trang Nguyễn',
    role: 'Giám đốc Giải pháp Thực phẩm',
    image: 'https://2fast.com.vn/wp-content/uploads/2024/10/av_03.jpg'
  }
];

export const SOCIAL_ICONS = {
  facebook: 'https://upload.wikimedia.org/wikipedia/commons/b/b8/2021_Facebook_icon.svg',
  gmail: 'https://upload.wikimedia.org/wikipedia/commons/7/7e/Gmail_icon_%282020%29.svg',
  google: 'https://upload.wikimedia.org/wikipedia/commons/c/c1/Google_%22G%22_logo.svg',
  instagram: 'https://upload.wikimedia.org/wikipedia/commons/e/e7/Instagram_logo_2016.svg',
  linkedin: 'https://upload.wikimedia.org/wikipedia/commons/8/81/LinkedIn_icon.svg',
  whatsapp: 'https://upload.wikimedia.org/wikipedia/commons/6/6b/WhatsApp.svg',
  zalo: 'https://upload.wikimedia.org/wikipedia/commons/9/91/Icon_of_Zalo.svg',
  phone: 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/cd/Phone_icon_green.svg/1024px-Phone_icon_green.svg.png',
  location: 'https://upload.wikimedia.org/wikipedia/commons/4/4a/Circle-icons-location.svg'
};

export const COLORS = {
  primary: '#007c76',
  secondary: '#f3f4f6',
  white: '#ffffff',
  dark: '#374151'
};
