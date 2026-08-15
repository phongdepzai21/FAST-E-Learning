
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

export const DEFAULT_LESSONS: Array<{ title: string; videoUrl: string }> = [
  { title: "Phân tích bối cảnh tổ chức và quản lý chất lượng", videoUrl: "https://www.w3schools.com/html/mov_bbb.mp4" },
  { title: "Xây dựng chính sách an toàn thực phẩm & tiêu chuẩn ISO", videoUrl: "https://www.w3schools.com/html/mov_bbb.mp4" },
  { title: "Hoạch định hệ thống quản lý và 7 nguyên tắc HACCP", videoUrl: "https://www.dropbox.com/scl/fi/qv5982actdgxnzifug9sw/07-nguyen-tac-haccp.mp4?rlkey=c4gd6hqpoovsepfm04rmlulzi&st=808zm8fm&raw=1" },
  { title: "Quản lý rủi ro và đánh giá cơ hội cải tiến", videoUrl: "https://www.w3schools.com/html/mov_bbb.mp4" }
];

export const extractLessonsFlat = (rawCurr: any): Array<{ title: string; videoUrl: string }> => {
  if (!rawCurr) return DEFAULT_LESSONS;
  if (!Array.isArray(rawCurr)) {
    if (typeof rawCurr === 'object' && rawCurr.lessons && Array.isArray(rawCurr.lessons)) {
      return extractLessonsFlat(rawCurr.lessons);
    }
    return DEFAULT_LESSONS;
  }

  const result: Array<{ title: string; videoUrl: string }> = [];

  rawCurr.forEach((item: any, itemIdx: number) => {
    if (!item) return;

    // Case 1: item is a chapter object with a .lessons array
    if (Array.isArray(item.lessons)) {
      item.lessons.forEach((l: any, lIdx: number) => {
        if (!l) return;
        const title = (typeof l === 'string' ? l : (l?.title || `Bài học ${lIdx + 1}`)).trim();
        const videoUrl = typeof l === 'object' && l?.videoUrl 
          ? String(l.videoUrl).trim() 
          : "https://www.w3schools.com/html/mov_bbb.mp4";
        result.push({ title, videoUrl });
      });
    } 
    // Case 2: item is a direct lesson object { title, videoUrl }
    else if (typeof item === 'object') {
      const title = (item.title || `Bài học ${itemIdx + 1}`).trim();
      const videoUrl = item.videoUrl 
        ? String(item.videoUrl).trim() 
        : "https://www.w3schools.com/html/mov_bbb.mp4";
      result.push({ title, videoUrl });
    }
    // Case 3: item is a string
    else if (typeof item === 'string' && item.trim()) {
      result.push({
        title: item.trim(),
        videoUrl: "https://www.w3schools.com/html/mov_bbb.mp4"
      });
    }
  });

  return result.length > 0 ? result : DEFAULT_LESSONS;
};

// Video embed detection helper for YouTube, DoodStream, Streamwish, Streamtape, Filemoon, Dropbox, Drive, Vimeo, Loom, Dailymotion, Bilibili, and HTML5 native video
export function getVideoEmbedInfo(url: string, autoPlay: boolean = false): { isEmbed: boolean; embedUrl: string } {
  if (!url) {
    return { isEmbed: false, embedUrl: "https://www.w3schools.com/html/mov_bbb.mp4" };
  }
  let cleanUrl = String(url).trim();

  // 0. Extract src from raw <iframe> tags if user pasted iframe embed code
  const iframeSrcMatch = cleanUrl.match(/<iframe[^>]*\ssrc=["']([^"']+)["'][^>]*>/i);
  if (iframeSrcMatch && iframeSrcMatch[1]) {
    cleanUrl = iframeSrcMatch[1].trim();
  }

  // Remove wrapping quotes if any
  cleanUrl = cleanUrl.replace(/^["']|["']$/g, '').trim();

  // 1. YouTube check (watch, embed, shorts, youtu.be, m.youtube, live, youtube-nocookie)
  const ytMatch = cleanUrl.match(/(?:youtube(?:-nocookie)?\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?|shorts|live)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/i);
  if (ytMatch && ytMatch[1]) {
    const videoId = ytMatch[1];
    const apParam = autoPlay ? '1' : '0';
    
    // Check for timestamp (t=120 or t=2m30s or start=120)
    let startParam = '';
    const tMatch = cleanUrl.match(/[?&](?:t|start)=([0-9hms]+)/i);
    if (tMatch && tMatch[1]) {
      const rawT = tMatch[1];
      if (/^\d+$/.test(rawT)) {
        startParam = `&start=${rawT}`;
      } else {
        let totalSeconds = 0;
        const h = rawT.match(/(\d+)h/i);
        const m = rawT.match(/(\d+)m/i);
        const s = rawT.match(/(\d+)s/i);
        if (h) totalSeconds += parseInt(h[1], 10) * 3600;
        if (m) totalSeconds += parseInt(m[1], 10) * 60;
        if (s) totalSeconds += parseInt(s[1], 10);
        if (totalSeconds > 0) startParam = `&start=${totalSeconds}`;
      }
    }

    return {
      isEmbed: true,
      embedUrl: `https://www.youtube.com/embed/${videoId}?autoplay=${apParam}&rel=0&enablejsapi=1&playsinline=1${startParam}`
    };
  }

  // 2. DoodStream (dood.to, dood.so, dood.ws, dood.la, dood.sh, doodstream.com, ds2play.com, dood.re, dood.cx, doods.pro, dood.wf)
  if (/dood\.|doodstream\.|ds2play\./i.test(cleanUrl)) {
    const codeMatch = cleanUrl.match(/(?:dood\.[a-z]+|doodstream\.com|ds2play\.com)\/(?:[edv]\/)?([a-zA-Z0-9_-]+)/i);
    if (codeMatch && codeMatch[1]) {
      return {
        isEmbed: true,
        embedUrl: `https://dood.to/e/${codeMatch[1]}`
      };
    }
    return { isEmbed: true, embedUrl: cleanUrl };
  }

  // 4. Streamwish / Strwish / Wishembed (streamwish.to, streamwish.com, strwish.com, swish.to, wishembed.pro)
  if (/streamwish|strwish|wishembed/i.test(cleanUrl)) {
    const codeMatch = cleanUrl.match(/(?:streamwish\.[a-z]+|strwish\.[a-z]+|wishembed\.[a-z]+)\/(?:[efv]\/)?([a-zA-Z0-9_-]+)/i);
    if (codeMatch && codeMatch[1]) {
      return {
        isEmbed: true,
        embedUrl: `https://streamwish.to/e/${codeMatch[1]}`
      };
    }
    return { isEmbed: true, embedUrl: cleanUrl };
  }

  // 5. Streamtape (streamtape.com, streamtape.to, streamtape.net, streamta.pe)
  if (/streamtape|streamta\.pe/i.test(cleanUrl)) {
    const codeMatch = cleanUrl.match(/(?:streamtape\.[a-z]+|streamta\.pe)\/(?:[ve]\/)?([a-zA-Z0-9_-]+)/i);
    if (codeMatch && codeMatch[1]) {
      return {
        isEmbed: true,
        embedUrl: `https://streamtape.com/e/${codeMatch[1]}`
      };
    }
    return { isEmbed: true, embedUrl: cleanUrl };
  }

  // 6. Filemoon (filemoon.sx, filemoon.to, filemoon.in, filemoon.top)
  if (/filemoon\./i.test(cleanUrl)) {
    const codeMatch = cleanUrl.match(/filemoon\.[a-z]+\/(?:[edv]\/)?([a-zA-Z0-9_-]+)/i);
    if (codeMatch && codeMatch[1]) {
      return {
        isEmbed: true,
        embedUrl: `https://filemoon.sx/e/${codeMatch[1]}`
      };
    }
    return { isEmbed: true, embedUrl: cleanUrl };
  }

  // 7. Google Drive check (view, preview, open?id=)
  const driveMatch = cleanUrl.match(/drive\.google\.com\/(?:file\/d\/([a-zA-Z0-9_-]+)|open\?id=([a-zA-Z0-9_-]+))/i);
  if (driveMatch) {
    const fileId = driveMatch[1] || driveMatch[2];
    if (fileId) {
      return {
        isEmbed: true,
        embedUrl: `https://drive.google.com/file/d/${fileId}/preview`
      };
    }
  }

  // 8. Vimeo check
  const vimeoMatch = cleanUrl.match(/vimeo\.com\/(?:video\/)?([0-9]+)/i);
  if (vimeoMatch && vimeoMatch[1]) {
    const apParam = autoPlay ? '1' : '0';
    return {
      isEmbed: true,
      embedUrl: `https://player.vimeo.com/video/${vimeoMatch[1]}?autoplay=${apParam}`
    };
  }

  // 9. Loom check
  const loomMatch = cleanUrl.match(/loom\.com\/share\/([a-zA-Z0-9]+)/i);
  if (loomMatch && loomMatch[1]) {
    return {
      isEmbed: true,
      embedUrl: `https://www.loom.com/embed/${loomMatch[1]}`
    };
  }

  // 10. Dailymotion
  const dailyMatch = cleanUrl.match(/(?:dailymotion\.com\/(?:video|embed\/video)\/|dai\.ly\/)([a-zA-Z0-9]+)/i);
  if (dailyMatch && dailyMatch[1]) {
    return {
      isEmbed: true,
      embedUrl: `https://www.dailymotion.com/embed/video/${dailyMatch[1]}`
    };
  }

  // 11. Bilibili
  const biliMatch = cleanUrl.match(/bilibili\.com\/video\/([a-zA-Z0-9]+)/i);
  if (biliMatch && biliMatch[1]) {
    return {
      isEmbed: true,
      embedUrl: `https://player.bilibili.com/player.html?bvid=${biliMatch[1]}&autoplay=${autoPlay ? '1' : '0'}`
    };
  }

  // 12. Ok.ru
  const okMatch = cleanUrl.match(/ok\.ru\/(?:video|videoembed)\/([0-9]+)/i);
  if (okMatch && okMatch[1]) {
    return {
      isEmbed: true,
      embedUrl: `https://ok.ru/videoembed/${okMatch[1]}`
    };
  }

  // 13. Dropbox check - convert to raw direct streaming MP4 link for native video tag
  if (cleanUrl.includes('dropbox.com') || cleanUrl.includes('dropboxusercontent.com')) {
    let directUrl = cleanUrl.replace('www.dropbox.com', 'dl.dropboxusercontent.com');
    if (!directUrl.includes('raw=1') && !directUrl.includes('dl=1')) {
      directUrl += (directUrl.includes('?') ? '&' : '?') + 'raw=1';
    }
    return { isEmbed: false, embedUrl: directUrl };
  }

  // 14. Check if it's already an embed URL (e.g. /embed/, /preview, /player/, /e/)
  if (cleanUrl.includes('/embed/') || cleanUrl.includes('/preview') || cleanUrl.includes('/player/') || cleanUrl.includes('/e/')) {
    return { isEmbed: true, embedUrl: cleanUrl };
  }

  // 15. Native HTML5 video (.mp4, .webm, .ogg, .mov, .m4v, direct streams)
  return { isEmbed: false, embedUrl: cleanUrl };
}

export const formatPriceSubmit = (rawPrice: string): string => {
  if (!rawPrice) return 'Miễn phí';
  const clean = String(rawPrice).trim();
  if (!clean) return 'Miễn phí';
  const lower = clean.toLowerCase();
  if (
    lower === 'miễn phí' || 
    lower === 'free' || 
    lower === '0đ' || 
    lower === '0' ||
    lower === '0 vnd'
  ) {
    return 'Miễn phí';
  }

  // 1. Check for 'b', 'tỷ', 'ty' suffix (billion)
  if (/(?:tỷ|ty|b)$/i.test(lower)) {
    const numPart = lower.replace(/(?:tỷ|ty|b)$/i, '').replace(/,/g, '.').replace(/[^\d.]/g, '');
    const val = parseFloat(numPart);
    if (!isNaN(val) && val > 0) {
      return Math.round(val * 1000000000).toLocaleString('vi-VN') + 'đ';
    }
  }

  // 2. Check for 'tr', 'triệu', 'trieu', 'm' suffix (million)
  if (/(?:tr|triệu|trieu|m)$/i.test(lower)) {
    const numPart = lower.replace(/(?:tr|triệu|trieu|m)$/i, '').replace(/,/g, '.').replace(/[^\d.]/g, '');
    const val = parseFloat(numPart);
    if (!isNaN(val) && val > 0) {
      return Math.round(val * 1000000).toLocaleString('vi-VN') + 'đ';
    }
  }

  // 3. Check for 'k', 'nghìn', 'ngàn', 'ngan' suffix (thousand)
  if (/(?:nghìn|ngàn|ngan|k)$/i.test(lower)) {
    const numPart = lower.replace(/(?:nghìn|ngàn|ngan|k)$/i, '').replace(/,/g, '.').replace(/[^\d.]/g, '');
    const val = parseFloat(numPart);
    if (!isNaN(val) && val > 0) {
      return Math.round(val * 1000).toLocaleString('vi-VN') + 'đ';
    }
  }

  // 4. If string ends with đ or vnd (e.g. "2.000.000đ" or "599.000đ")
  if (lower.endsWith('đ') || lower.endsWith('vnd')) {
    const digitsAndDots = clean.replace(/[^\d.,]/g, '');
    const numPart = digitsAndDots.replace(/\./g, '').replace(/,/g, '.');
    const val = parseFloat(numPart);
    if (!isNaN(val) && val > 0) {
      return Math.round(val).toLocaleString('vi-VN') + 'đ';
    }
  }

  // 5. Plain numbers or dotted numbers without suffix
  const digitsOnly = clean.replace(/[^\d]/g, '');
  if (/^\d+$/.test(digitsOnly) && digitsOnly.length > 0) {
    const num = parseInt(digitsOnly, 10);
    if (num === 0) return 'Miễn phí';
    if (num > 0 && num < 10) {
      // e.g., plain "2" -> 2.000.000đ
      return (num * 1000000).toLocaleString('vi-VN') + 'đ';
    }
    if (num >= 10 && num < 1000) {
      // e.g., plain "599" -> 599.000đ
      return (num * 1000).toLocaleString('vi-VN') + 'đ';
    }
    return num.toLocaleString('vi-VN') + 'đ';
  }

  return clean;
};

export const getMergedCourses = (firestoreCourses: Course[] = []): Course[] => {
  const parseTime = (val: any): number => {
    if (!val) return 0;
    if (typeof val === 'number') return val;
    if (typeof val === 'string') {
      const parsed = Date.parse(val);
      return isNaN(parsed) ? 0 : parsed;
    }
    if (val && typeof val.toDate === 'function') {
      return val.toDate().getTime();
    }
    if (val && val.seconds) {
      return val.seconds * 1000;
    }
    return 0;
  };

  const applyOverlay = (existing: Course, overlay: Partial<Course>): Course => {
    return {
      ...existing,
      ...(overlay.title ? { title: overlay.title } : {}),
      ...(overlay.price !== undefined && overlay.price !== null && overlay.price !== '' ? { price: formatPriceSubmit(overlay.price) } : {}),
      ...(overlay.image ? { image: overlay.image } : {}),
      ...(overlay.category ? { category: overlay.category } : {}),
      ...(overlay.description !== undefined ? { description: overlay.description } : {}),
      ...(overlay.status ? { status: overlay.status } : {}),
      ...(overlay.curriculum && Array.isArray(overlay.curriculum) && overlay.curriculum.length > 0 ? { curriculum: overlay.curriculum } : {}),
      ...(overlay.authorEmail !== undefined ? { authorEmail: overlay.authorEmail } : {}),
      ...(overlay.updatedAt ? { updatedAt: overlay.updatedAt } : {}),
    };
  };

  // 1. Base map initialized from hardcoded COURSES
  const combinedMap = new Map<string, Course>();
  COURSES.forEach(c => {
    combinedMap.set(c.id, {
      ...c,
      status: c.status || 'active',
      price: formatPriceSubmit(c.price)
    });
  });

  // 2. Map of LocalStorage courses
  const localMap = new Map<string, Course>();
  try {
    const localStr = localStorage.getItem('local_custom_courses');
    if (localStr) {
      const localList: Course[] = JSON.parse(localStr);
      localList.forEach(lc => {
        if (lc && lc.id) {
          localMap.set(lc.id, lc);
        }
      });
    }
  } catch (e) {}

  // 3. Map of Firestore courses
  const firestoreMap = new Map<string, Course>();
  firestoreCourses.forEach(fc => {
    if (fc && fc.id) {
      firestoreMap.set(fc.id, fc);
    }
  });

  // All unique IDs across hardcoded, Firestore, and LocalStorage
  const allIds = new Set<string>([
    ...combinedMap.keys(),
    ...firestoreMap.keys(),
    ...localMap.keys()
  ]);

  allIds.forEach(id => {
    const base = combinedMap.get(id);
    const fc = firestoreMap.get(id);
    const lc = localMap.get(id);

    let winner: Course;

    // FIRESTORE IS CLOUD MASTER SOURCE OF TRUTH:
    if (fc) {
      const baseDoc = base ? applyOverlay(base, fc) : { ...fc, price: formatPriceSubmit(fc.price || '') };
      if (lc) {
        const fcTime = parseTime(fc.updatedAt || fc.createdAt);
        const lcTime = parseTime(lc.updatedAt || lc.createdAt);
        // Only prioritize local if local edit is strictly newer
        if (lcTime > fcTime && (lcTime - fcTime) < 300000) {
          winner = applyOverlay(baseDoc, lc);
        } else {
          winner = applyOverlay(baseDoc, fc);
        }
      } else {
        winner = baseDoc;
      }
    } else if (lc) {
      winner = base ? applyOverlay(base, lc) : { ...lc, price: formatPriceSubmit(lc.price || '') };
    } else if (base) {
      winner = base;
    } else {
      return;
    }

    combinedMap.set(id, winner);
  });

  return Array.from(combinedMap.values());
};
