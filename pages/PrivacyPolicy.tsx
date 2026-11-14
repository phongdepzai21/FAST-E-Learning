import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import {
  Search,
  ChevronDown,
  ChevronUp,
  Link2,
  Check,
  ShieldCheck,
  Database,
  Cookie,
  FileText
} from 'lucide-react';
import { useToast } from '../contexts/ToastContext';

type HubTab = 'policy' | 'data-matrix' | 'cookies';

interface PolicyExample {
  title: string;
  body: string;
}

interface PolicySection {
  id: string;
  number: string;
  title: string;
  summary: string;
  keywords: string;
  paragraphs: string[];
  bullets?: { label?: string; text: string }[];
  examples?: PolicyExample[];
  note?: string;
}

interface PrivacyPreferences {
  essential: boolean;
  learningProgress: boolean;
  analytics: boolean;
  notifications: boolean;
  updatedAt: string;
}

const DEFAULT_PREFERENCES: PrivacyPreferences = {
  essential: true,
  learningProgress: true,
  analytics: true,
  notifications: true,
  updatedAt: new Date().toISOString()
};

const POLICY_SECTIONS: PolicySection[] = [
  {
    id: 'gioi-thieu',
    number: '01',
    title: 'Giới thiệu, Bên kiểm soát dữ liệu & Phạm vi áp dụng',
    summary:
      'Xác định chủ thể pháp lý chịu trách nhiệm xử lý dữ liệu cá nhân và phạm vi áp dụng trên toàn bộ hệ sinh thái FAST E-Learning.',
    keywords: 'công ty tnhh tư vấn fast mst 0314568146 phạm vi áp dụng fastelearning dpo',
    paragraphs: [
      'Khi bạn sử dụng dịch vụ học trực tuyến, tham gia khóa đào tạo Zoom/hội trường, sử dụng bộ công cụ kiểm toán và danh mục kiểm tra tiêu chuẩn (ISO 22000, HACCP, An toàn thực phẩm) hoặc giao dịch trên nền tảng FAST E-Learning, bạn tin tưởng giao phó thông tin cá nhân của mình cho chúng tôi. Chúng tôi hiểu rằng đây là trách nhiệm pháp lý và đạo đức nghề nghiệp quan trọng nhất.',
      'Chính sách Quyền riêng tư này giải thích minh bạch cách chúng tôi thu thập, sử dụng, chia sẻ, bảo vệ dữ liệu và các công cụ giúp bạn kiểm soát hoàn toàn thông tin của mình — tương đương chuẩn mực minh bạch của các nền tảng công nghệ toàn cầu (Google, Meta) và tuân thủ nghiêm ngặt Luật Bảo vệ dữ liệu cá nhân số 91/2025/QH15 (có hiệu lực từ 01/01/2026) cùng Nghị định 13/2023/NĐ-CP của Chính phủ Việt Nam.'
    ],
    bullets: [
      {
        label: 'Bên kiểm soát dữ liệu (Data Controller)',
        text: 'CÔNG TY TNHH TƯ VẤN FAST (FAST CONSULTING COMPANY LIMITED) — Mã số thuế: 0314568146.'
      },
      {
        label: 'Trụ sở chính',
        text: 'Tòa nhà Mộc Gia, Tầng 6, Số 238-240-242 đường Nguyễn Oanh, Phường Gò Vấp, Thành phố Hồ Chí Minh, Việt Nam.'
      },
      {
        label: 'Phạm vi áp dụng',
        text: 'Áp dụng cho website fastelearning.com.vn, hệ thống lớp học trực tuyến (Classroom), cổng đăng ký khóa đào tạo trực tiếp/Zoom, cổng thanh toán VietQR, hệ thống cấp và tra cứu chứng nhận 10 chữ số, cùng các kênh hỗ trợ học viên chính thức.'
      },
      {
        label: 'Ngoại lệ phạm vi',
        text: 'Không áp dụng cho website của bên thứ ba được liên kết từ nền tảng (chẳng hạn trang mạng xã hội Facebook, LinkedIn, Zalo hoặc ứng dụng ngân hàng của bạn); các trang đó chịu sự điều chỉnh bởi chính sách riêng của họ.'
      }
    ]
  },
  {
    id: 'du-lieu-thu-thap',
    number: '02',
    title: 'Thông tin chúng tôi thu thập',
    summary:
      'Phân loại chi tiết dữ liệu bạn cung cấp trực tiếp (tên, email), thông tin xác thực Facebook / Google, dữ liệu học tập và dữ liệu giao dịch.',
    keywords: 'thu thập dữ liệu họ tên email số điện thoại facebook login public_profile xác thực otp tiến độ video ip thanh toán giao dịch vietqr',
    paragraphs: [
      'FAST E-Learning chỉ thu thập các thông tin thực sự cần thiết, tương xứng với mục đích xác thực tài khoản, cung ứng khóa học, quản lý tiến độ học tập, đối soát giao dịch và phát hành chứng nhận hoàn thành. Các nhóm dữ liệu cụ thể bao gồm:'
    ],
    bullets: [
      {
        label: '1. Họ tên, Email & Thông tin liên hệ',
        text: 'Họ và tên đầy đủ (họ tên hiển thị trên tài khoản và in trên Giấy chứng nhận hoàn thành), địa chỉ email xác thực, số điện thoại / Zalo (nhận mã OTP, thông báo lịch lớp học và hỗ trợ kỹ thuật), cùng tên doanh nghiệp/đơn vị công tác (nếu đăng ký cho tổ chức).'
      },
      {
        label: '2. Thông tin xác thực Facebook (Facebook Login) & Google / Email',
        text: 'Khi bạn chọn "Tiếp tục với Facebook" hoặc liên kết Facebook vào tài khoản hiện có, FAST E-Learning chỉ yêu cầu hai quyền cơ bản từ Meta/Facebook là public_profile (tên hiển thị, ảnh đại diện công khai và mã định danh người dùng Facebook trên ứng dụng) và email (địa chỉ email do Facebook cung cấp nếu bạn cho phép). Dữ liệu xác thực này được liên kết cùng một Firebase UID duy nhất với tài khoản Google Sign-In hoặc Email/Mật khẩu của bạn. Chúng tôi tuyệt đối không yêu cầu quyền đăng bài, danh sách bạn bè hay tin nhắn cá nhân trên Facebook.'
      },
      {
        label: '3. Dữ liệu học tập & Đánh giá năng lực',
        text: 'Danh sách khóa học đã ghi danh hoặc mở khóa, lịch sử đăng ký khóa đào tạo trực tuyến/trực tiếp, tiến độ hoàn thành từng bài giảng, mốc thời gian dừng video (timestamp), ghi chú cá nhân trong lớp học, bài làm và điểm kiểm tra trắc nghiệm cuối khóa cùng mã Giấy chứng nhận hoàn thành 10 chữ số.'
      },
      {
        label: '4. Dữ liệu giao dịch & Thanh toán (VietQR / ACB)',
        text: 'Mã đơn đăng ký/đơn hàng 10 chữ số, tên khóa học hoặc gói dịch vụ đã chọn, số lượng học viên, số tiền thanh toán (VNĐ), nội dung chuyển khoản định danh qua VietQR / ngân hàng ACB, thời điểm và trạng thái đối soát giao dịch (chờ xác nhận, đã kích hoạt, hoàn tiền). Chúng tôi không thu thập và không lưu trữ số thẻ ngân hàng, mã CVV hay mật khẩu e-Banking.'
      },
      {
        label: '5. Dữ liệu kỹ thuật & An toàn phiên truy cập',
        text: 'Địa chỉ IP kết nối, loại trình duyệt/thiết bị, dấu thời gian đăng nhập và tín hiệu chống bot của Google reCAPTCHA v3 nhằm bảo vệ tài khoản khỏi hành vi truy cập trái phép hoặc chia sẻ phiên bất thường.'
      }
    ],
    examples: [
      {
        title: 'Ví dụ minh họa: Khi bạn đăng nhập hoặc liên kết bằng Facebook Login',
        body: 'Hệ thống nhận tên hiển thị, ảnh đại diện công khai (public_profile) và email từ Facebook thông qua cổng xác thực bảo mật Firebase Authentication (https://fast-e-learning.firebaseapp.com/__/auth/handler). Nếu email trùng với tài khoản Google hoặc Email/Mật khẩu bạn đã dùng trước đó, bạn có thể liên kết chúng về chung một Firebase UID để giữ nguyên toàn bộ khóa học và tiến độ đã có.'
      },
      {
        title: 'Ví dụ minh họa: Khi bạn đăng ký Khóa đào tạo hoặc mua khóa học VietQR',
        body: 'Hệ thống ghi nhận họ tên, email, số điện thoại, tên khóa học và mã đơn 10 số để đối soát giao dịch chuyển khoản ngân hàng ACB, gửi đường link phòng học Zoom về mục Thông báo tài khoản và mở khóa bài giảng ngay lập tức.'
      }
    ]
  },
  {
    id: 'muc-dich-va-co-so-phap-ly',
    number: '03',
    title: 'Mục đích sử dụng & Cơ sở pháp lý xử lý dữ liệu',
    summary:
      'Mỗi hoạt động xử lý dữ liệu cá nhân đều dựa trên ít nhất một cơ sở pháp lý rõ ràng theo Luật Bảo vệ dữ liệu cá nhân 91/2025/QH15.',
    keywords: 'mục đích cơ sở pháp lý hợp đồng đồng ý nghĩa vụ thuế kế toán 91/2025/qh15',
    paragraphs: [
      'Chúng tôi không xử lý dữ liệu cá nhân ngoài phạm vi bạn đã được thông báo. Dữ liệu của bạn được sử dụng dựa trên bốn cơ sở pháp lý chính theo quy định của pháp luật Việt Nam:'
    ],
    bullets: [
      {
        label: 'Thực hiện nghĩa vụ hợp đồng cung ứng dịch vụ đào tạo',
        text: 'Khởi tạo tài khoản học viên, kích hoạt quyền truy cập khóa học ngay sau khi đối soát thanh toán, lưu đồng bộ tiến độ học giữa các thiết bị, gửi link lớp học trực tuyến và cấp/tra cứu chứng nhận.'
      },
      {
        label: 'Dựa trên sự đồng ý minh thị (Explicit Consent) của bạn',
        text: 'Gửi thông báo về khóa đào tạo mới, cập nhật học liệu bổ sung, phản hồi yêu cầu tư vấn ISO/HACCP hoặc ghi nhớ các tùy chọn không thiết yếu trên trình duyệt. Bạn có quyền rút lại sự đồng ý bất cứ lúc nào.'
      },
      {
        label: 'Tuân thủ nghĩa vụ pháp lý bắt buộc',
        text: 'Lưu trữ chứng từ giao dịch tài chính, biên lai học phí phục vụ kê khai thuế, kiểm toán kế toán và cung cấp thông tin theo yêu cầu bằng văn bản hợp pháp từ cơ quan nhà nước có thẩm quyền.'
      },
      {
        label: 'Bảo vệ lợi ích hợp pháp & an toàn hệ thống',
        text: 'Ngăn chặn gian lận thanh toán, phát hiện hành vi chia sẻ tài khoản trái phép (quét phiên đồng thời), bảo vệ bản quyền video bài giảng và chống tấn công tự động (spam/DDoS).'
      }
    ]
  },
  {
    id: 'cookie-va-luu-tru-cuc-bo',
    number: '04',
    title: 'Cookie, Bộ nhớ cục bộ (Local Storage) & Công nghệ tương tự',
    summary:
      'Giải thích cách nền tảng sử dụng cookie phiên và bộ nhớ trình duyệt để duy trì đăng nhập, bảo mật reCAPTCHA và lưu nhanh tiến độ học.',
    keywords: 'cookie localstorage sessionstorage recaptcha firebase auth tùy chọn trình duyệt',
    paragraphs: [
      'Giống như Google và Meta, FAST E-Learning sử dụng cookie và công nghệ lưu trữ cục bộ trên trình duyệt (localStorage, sessionStorage) để website hoạt động ổn định, tải nhanh và ghi nhớ trạng thái học tập của bạn ngay cả khi mạng không ổn định.'
    ],
    bullets: [
      {
        label: 'Nhóm 1 — Thiết yếu & Xác thực (Bắt buộc)',
        text: 'Duy trì phiên đăng nhập Firebase Auth / OTP, bảo vệ biểu mẫu khỏi bot qua Google reCAPTCHA v3 và giữ giỏ đăng ký khóa học.'
      },
      {
        label: 'Nhóm 2 — Trải nghiệm & Tiến độ học tập',
        text: 'Lưu tạm vị trí video đang xem, ghi chú bài giảng, danh sách khóa học đã xem gần đây và thông báo link lớp học chưa đọc.'
      },
      {
        label: 'Nhóm 3 — Tùy biến giao diện & Hiệu suất',
        text: 'Ghi nhớ chế độ hiển thị, bộ lọc danh mục khóa học và tối ưu bộ nhớ đệm giúp trang web phản hồi tức thì.'
      },
      {
        label: 'Kiểm soát của bạn',
        text: 'Bạn có thể bật/tắt các nhóm bộ nhớ tùy chọn ngay tại tab "Công nghệ & Cookie" trên trang này hoặc xóa cookie trực tiếp trong phần Cài đặt của trình duyệt (Chrome, Safari, Edge, Firefox).'
      }
    ]
  },
  {
    id: 'chia-se-va-ben-thu-ba',
    number: '05',
    title: 'Cách chúng tôi chia sẻ thông tin & Các bên xử lý thứ ba',
    summary:
      'Cam kết không bán dữ liệu cá nhân; chỉ chia sẻ tối thiểu cho đối tác hạ tầng kỹ thuật và ngân hàng đối soát theo hợp đồng bảo mật.',
    keywords: 'chia sẻ bên thứ ba firebase google cloud acb vietqr zoom resend không bán dữ liệu',
    paragraphs: [
      'CÔNG TY TNHH TƯ VẤN FAST khẳng định KHÔNG BAO GIỜ bán, cho thuê hoặc trao đổi thông tin cá nhân của học viên cho bất kỳ bên môi giới quảng cáo hay tổ chức tiếp thị bên ngoài nào.',
      'Để vận hành hệ thống học trực tuyến và đối soát thanh toán tự động, chúng tôi chỉ ủy thác một phần dữ liệu cần thiết cho các đơn vị cung cấp hạ tầng công nghệ uy tín (Sub-processors) dưới sự ràng buộc bảo mật nghiêm ngặt:'
    ],
    bullets: [
      {
        label: 'Google LLC / Firebase (Authentication & Cloud Firestore)',
        text: 'Cung cấp hạ tầng xác thực tài khoản an toàn (Google, Email/Mật khẩu, Facebook Login), lưu trữ đám mây được mã hóa và dịch vụ Google reCAPTCHA v3 chống gửi biểu mẫu rác.'
      },
      {
        label: 'Meta Platforms, Inc. (Facebook Login OAuth)',
        text: 'Chỉ xử lý quy trình xác thực đăng nhập/liên kết tài khoản khi bạn chủ động bấm nút "Tiếp tục với Facebook" với quyền tối thiểu public_profile và email.'
      },
      {
        label: 'Ngân hàng TMCP Á Châu (ACB) & Cổng VietQR',
        text: 'Tiếp nhận thông tin đối soát giao dịch chuyển khoản (mã đơn hàng 10 số và số tiền) để kích hoạt khóa học tự động trong vài giây.'
      },
      {
        label: 'Nền tảng lớp học trực tuyến (Zoom / Google Meet)',
        text: 'Khi bạn đăng ký Khóa đào tạo trực tuyến, tên và email học viên có thể được dùng để cấp quyền vào phòng học và điểm danh buổi đào tạo.'
      },
      {
        label: 'Dịch vụ gửi Email giao dịch (Resend / SMTP)',
        text: 'Chỉ xử lý địa chỉ email và nội dung phản hồi khi bạn gửi yêu cầu hỗ trợ, yêu cầu xóa dữ liệu, nhận mã OTP hoặc nhận xác nhận đăng ký.'
      },
      {
        label: 'Yêu cầu pháp lý bắt buộc',
        text: 'Chỉ tiết lộ khi có trát, quyết định hành chính hoặc yêu cầu hợp pháp bằng văn bản từ Tòa án, Cơ quan Công an hoặc Cơ quan Thuế Việt Nam.'
      }
    ]
  },
  {
    id: 'chuyen-du-lieu-xuyen-bien-gioi',
    number: '06',
    title: 'Lưu trữ đám mây & Chuyển dữ liệu ra nước ngoài',
    summary:
      'Minh bạch về vị trí lưu trữ máy chủ đám mây toàn cầu và các biện pháp bảo vệ tương đương khi truyền dữ liệu xuyên biên giới.',
    keywords: 'chuyển dữ liệu nước ngoài cloud đám mây singapore mỹ mã hóa',
    paragraphs: [
      'Hệ thống cơ sở dữ liệu Firestore và hạ tầng lưu trữ đám mây của nền tảng được đặt tại các trung tâm dữ liệu đạt chuẩn quốc tế (ISO/IEC 27001, SOC 2 Type II) tại khu vực Châu Á - Thái Bình Dương hoặc Hoa Kỳ thuộc mạng lưới Google Cloud.',
      'Theo quy định của Luật Bảo vệ dữ liệu cá nhân 91/2025/QH15 và Nghị định 13/2023/NĐ-CP, mọi luồng chuyển dữ liệu phục vụ vận hành đám mây đều được mã hóa đầu cuối khi truyền tải, giới hạn theo nguyên tắc tối thiểu dữ liệu (Data Minimization) và kèm theo hồ sơ đánh giá tác động xử lý/chuyển dữ liệu theo quy định.'
    ]
  },
  {
    id: 'thoi-gian-luu-tru',
    number: '07',
    title: 'Thời gian lưu trữ & Tiêu chí xóa bỏ dữ liệu',
    summary:
      'Quy định rõ thời hạn lưu giữ theo từng loại dữ liệu và cơ chế tự động xóa hoặc ẩn danh hóa khi hết mục đích.',
    keywords: 'thời gian lưu trữ xóa dữ liệu ẩn danh 10 năm kế toán chứng nhận',
    paragraphs: [
      'Chúng tôi chỉ lưu giữ dữ liệu cá nhân trong khoảng thời gian cần thiết để hoàn thành mục đích thu thập hoặc theo thời hạn bắt buộc của pháp luật Việt Nam. Bạn có thể xem chi tiết thời hạn cụ thể tại tab "Minh bạch dữ liệu & Lưu trữ".'
    ],
    bullets: [
      {
        label: 'Hồ sơ tài khoản & tiến độ học tập',
        text: 'Lưu giữ trong suốt thời gian tài khoản còn hoạt động để đảm bảo quyền học trọn đời/theo gói của bạn; bị xóa hoặc ẩn danh hóa trong tối đa 30 ngày kể từ khi yêu cầu xóa tài khoản được xác minh hợp lệ.'
      },
      {
        label: 'Hồ sơ chứng từ thanh toán & thuế',
        text: 'Lưu trữ tối thiểu 10 năm theo quy định của Luật Kế toán Việt Nam đối với chứng từ tài chính và hóa đơn giao dịch.'
      },
      {
        label: 'Hồ sơ cấp & tra cứu Giấy chứng nhận 10 số',
        text: 'Lưu giữ phục vụ xác minh tính xác thực của chứng nhận cho doanh nghiệp tuyển dụng hoặc đoàn thanh tra, trừ khi chủ thể dữ liệu yêu cầu hủy bỏ bằng văn bản.'
      },
      {
        label: 'Dữ liệu OTP & nhật ký phiên tạm thời',
        text: 'Mã xác thực OTP tự động hết hiệu lực sau 5–10 phút; nhật ký lỗi kỹ thuật tự động luân chuyển và xóa định kỳ.'
      }
    ]
  },
  {
    id: 'bao-mat-du-lieu',
    number: '08',
    title: 'Biện pháp bảo vệ kỹ thuật & Ứng phó sự cố dữ liệu',
    summary:
      'Các lớp phòng thủ đa tầng bảo vệ tài khoản học viên, cơ sở dữ liệu và quy trình xử lý khẩn cấp nếu phát sinh sự cố.',
    keywords: 'bảo mật ssl tls 256 bit firestore rules phân quyền ứng phó sự cố 72 giờ',
    paragraphs: [
      'Bảo mật là nền tảng thiết kế cốt lõi của FAST E-Learning. Chúng tôi áp dụng đồng thời các hàng rào kỹ thuật và quy trình quản trị nội bộ:'
    ],
    bullets: [
      {
        label: 'Mã hóa đường truyền & lưu trữ',
        text: 'Toàn bộ kết nối giữa trình duyệt của bạn và máy chủ sử dụng giao thức HTTPS (TLS 1.2/1.3 với mã hóa 256-bit); thông tin xác thực được xử lý qua chuẩn OAuth 2.0 và hàm băm mật mã một chiều.'
      },
      {
        label: 'Phân quyền chặt chẽ (Zero-Trust Access Control)',
        text: 'Cơ sở dữ liệu áp dụng quy tắc bảo mật theo tầng vai trò (Học viên / Giảng viên / Quản trị viên). Học viên chỉ đọc và ghi được hồ sơ, khóa học và thông báo của chính email mình.'
      },
      {
        label: 'Kiểm soát phiên đồng thời & bảo vệ chống tấn công',
        text: 'Tích hợp cơ chế giới hạn tốc độ truy vấn, chống tự động dò quét và Google reCAPTCHA v3 trên các biểu mẫu công khai.'
      },
      {
        label: 'Quy trình ứng phó sự cố trong 72 giờ',
        text: 'Nếu phát hiện sự cố vi phạm an toàn dữ liệu cá nhân, đội ngũ kỹ thuật sẽ cô lập vùng ảnh hưởng ngay lập tức, khắc phục lỗ hổng, ghi nhận biên bản kỹ thuật và thông báo cho người dùng bị ảnh hưởng cũng như cơ quan chức năng trong thời hạn luật định (tối đa 72 giờ).'
      }
    ]
  },
  {
    id: 'quyen-cua-ban',
    number: '09',
    title: 'Quyền của bạn đối với dữ liệu cá nhân & Cách thực hiện',
    summary:
      'Bạn có toàn quyền xem, tải về, chỉnh sửa, hạn chế xử lý, rút lại sự đồng ý hoặc yêu cầu xóa dữ liệu cá nhân bất kỳ lúc nào.',
    keywords: 'quyền chủ thể dữ liệu truy cập chỉnh sửa xóa rút lại đồng ý xuất dữ liệu khiếu nại',
    paragraphs: [
      'Theo Điều 9 Nghị định 13/2023/NĐ-CP và Luật Bảo vệ dữ liệu cá nhân 91/2025/QH15, bạn có đầy đủ các quyền sau đây đối với dữ liệu cá nhân của mình:'
    ],
    bullets: [
      {
        label: '1. Quyền được biết & Quyền đồng ý / Rút lại sự đồng ý',
        text: 'Bạn được thông báo trước khi dữ liệu được xử lý và có quyền rút lại sự đồng ý đối với các thông báo tùy chọn hoặc xử lý không bắt buộc.'
      },
      {
        label: '2. Quyền truy cập & Xuất bản sao dữ liệu (Data Portability)',
        text: 'Bạn có quyền xem lại toàn bộ thông tin hồ sơ, lịch sử khóa học, chứng nhận và tải xuống bản sao dữ liệu dạng tệp có cấu trúc (JSON).'
      },
      {
        label: '3. Quyền yêu cầu chỉnh sửa dữ liệu',
        text: 'Cập nhật họ tên, số điện thoại hoặc tên đơn vị công tác khi có thay đổi để bảo đảm thông tin trên chứng nhận hoàn thành chính xác.'
      },
      {
        label: '4. Quyền yêu cầu xóa dữ liệu (Quyền được lãng quên)',
        text: 'Bạn có thể tự xóa tài khoản trực tiếp tại mục Cài đặt tài khoản -> Bảo mật, thu hồi quyền ứng dụng trên Facebook, hoặc gửi yêu cầu xóa tài khoản & toàn bộ dữ liệu liên quan theo hướng dẫn chi tiết tại trang Hướng dẫn xóa dữ liệu (/data-deletion), ngoại trừ chứng từ tài chính bắt buộc phải lưu theo Luật Kế toán.'
      },
      {
        label: '5. Quyền hạn chế xử lý, phản đối & yêu cầu bồi thường / khiếu nại',
        text: 'Yêu cầu tạm ngừng xử lý dữ liệu đang tranh chấp hoặc gửi khiếu nại tới Bộ phận Bảo vệ Dữ liệu của chúng tôi hoặc cơ quan chuyên trách bảo vệ dữ liệu cá nhân theo luật định.'
      }
    ],
    note: 'Thời hạn phản hồi yêu cầu: Bộ phận Bảo vệ Dữ liệu (DPO) xác nhận tiếp nhận trong vòng 24 giờ làm việc và hoàn tất xử lý yêu cầu xóa/chỉnh sửa dữ liệu hợp lệ trong vòng 72 giờ (tối đa 15–30 ngày đối với trường hợp cần đối soát kỹ thuật).'
  },
  {
    id: 'quyen-rieng-tu-tre-em',
    number: '10',
    title: 'Quyền riêng tư đối với trẻ em & người chưa thành niên',
    summary:
      'Quy định về độ tuổi tối thiểu tham gia nền tảng và cơ chế gỡ bỏ nếu phát hiện trẻ em đăng ký không có sự đồng ý của phụ huynh.',
    keywords: 'trẻ em người chưa thành niên 16 tuổi phụ huynh người giám hộ',
    paragraphs: [
      'Các khóa đào tạo về hệ thống quản lý chất lượng, ISO 22000, HACCP và an toàn thực phẩm tại FAST E-Learning được thiết kế dành cho người đi làm, sinh viên chuyên ngành và doanh nghiệp từ đủ 16 tuổi trở lên.',
      'Chúng tôi không chủ đích thu thập dữ liệu cá nhân của trẻ em dưới 16 tuổi mà không có sự đồng ý rõ ràng của cha mẹ hoặc người giám hộ hợp pháp. Nếu bạn là phụ huynh/người giám hộ và phát hiện con em mình đã cung cấp thông tin cá nhân khi chưa được phép, vui lòng liên hệ ngay tới email support@fastelearning.com.vn để chúng tôi tiến hành xác minh và xóa bỏ dữ liệu kịp thời.'
    ]
  },
  {
    id: 'giao-dich-ban-quyen-chung-nhan',
    number: '11',
    title: 'Liên kết với Điều khoản dịch vụ, Thanh toán & Bản quyền',
    summary:
      'Tóm tắt các nguyên tắc bảo mật tài khoản, quy định hoàn tiền trong 7 ngày, bản quyền bài giảng và giá trị pháp lý của chứng nhận.',
    keywords: 'điều khoản sử dụng hoàn tiền 7 ngày bản quyền sở hữu trí tuệ chứng nhận 80%',
    paragraphs: [
      'Chính sách Quyền riêng tư này là một phần không thể tách rời của Điều khoản Dịch vụ FAST E-Learning. Khi sử dụng dịch vụ, các nguyên tắc bảo vệ hệ sinh thái sau được áp dụng song song:'
    ],
    bullets: [
      {
        label: 'Bảo mật tài khoản cá nhân',
        text: 'Mỗi tài khoản chỉ cấp cho một cá nhân duy nhất. Nghiêm cấm chia sẻ tài khoản hoặc đăng nhập tập thể; hệ thống tự động cảnh báo/tạm khóa khi phát hiện nhiều phiên đồng thời bất thường để bảo vệ dữ liệu học tập của chính bạn.'
      },
      {
        label: 'Chính sách hoàn tiền minh bạch',
        text: 'Hoàn trả 100% học phí trong vòng 7 ngày nếu khóa học chưa được kích hoạt/chưa mở xem bài giảng, hoặc hoàn 100% trong 24 giờ đối với giao dịch chuyển thừa/trùng lặp sau khi đối soát.'
      },
      {
        label: 'Sở hữu trí tuệ & Chứng nhận hoàn thành',
        text: 'Toàn bộ video, slide và bộ đề trắc nghiệm thuộc bản quyền của Công ty TNHH Tư Vấn FAST. Học viên hoàn thành tối thiểu 80% tiến độ và đạt điểm kiểm tra từ 80% trở lên sẽ được cấp Giấy chứng nhận hoàn thành khóa học (Certificate of Completion) có mã tra cứu 10 số.'
      }
    ]
  },
  {
    id: 'thay-doi-chinh-sach',
    number: '12',
    title: 'Cập nhật & Thay đổi đối với Chính sách này',
    summary:
      'Cam kết không tự ý thu hẹp quyền của người dùng và luôn thông báo minh bạch trước khi thay đổi các điều khoản quan trọng.',
    keywords: 'cập nhật chính sách phiên bản thông báo thay đổi lịch sử',
    paragraphs: [
      'Chúng tôi có thể cập nhật Chính sách Quyền riêng tư này định kỳ để phản ánh những cải tiến về tính năng, công nghệ bảo mật mới hoặc điều chỉnh theo quy định pháp luật hiện hành tại Việt Nam.',
      'Chúng tôi sẽ không thu hẹp quyền lợi của bạn theo Chính sách này nếu chưa thông báo rõ ràng. Mọi thay đổi trọng yếu sẽ được công bố ngày hiệu lực ở đầu trang này, đồng thời gửi thông báo trực tiếp tới chuông Thông báo tài khoản và địa chỉ email đăng ký của học viên trước khi áp dụng.'
    ]
  },
  {
    id: 'lien-he-dpo',
    number: '13',
    title: 'Thông tin liên hệ Bộ phận Bảo vệ Dữ liệu (DPO) & Giải quyết khiếu nại',
    summary:
      'Kênh liên hệ trực tiếp với cán bộ phụ trách bảo vệ dữ liệu cá nhân và bộ phận hỗ trợ của Công ty TNHH Tư Vấn FAST.',
    keywords: 'liên hệ dpo hotline 0927002668 email support@fastelearning.com.vn hkc.qms@gmail.com',
    paragraphs: [
      'Nếu bạn có bất kỳ câu hỏi, góp ý, yêu cầu thực thi quyền chủ thể dữ liệu hoặc khiếu nại nào liên quan đến Chính sách & Quyền riêng tư này, xin vui lòng liên hệ trực tiếp với chúng tôi qua các kênh chính thức dưới đây:'
    ],
    bullets: [
      {
        label: 'Đơn vị chủ quản',
        text: 'CÔNG TY TNHH TƯ VẤN FAST (FAST CONSULTING CO., LTD) — MST: 0314568146'
      },
      {
        label: 'Email Bộ phận Bảo vệ Dữ liệu & Hỗ trợ',
        text: 'support@fastelearning.com.vn · hkc.qms@gmail.com'
      },
      {
        label: 'Đường dây nóng / Zalo hỗ trợ',
        text: '0927 002 668 (Thứ 2 – Thứ 7, 08:00 – 17:30)'
      },
      {
        label: 'Địa chỉ tiếp nhận văn bản trực tiếp',
        text: 'Tòa nhà Mộc Gia, Tầng 6, Số 238-240-242 đường Nguyễn Oanh, Phường Gò Vấp, Thành phố Hồ Chí Minh, Việt Nam'
      }
    ]
  }
];

const DATA_MATRIX_ROWS = [
  {
    category: 'Họ tên, Email & Liên hệ',
    fields: 'Họ và tên, địa chỉ Email, Số điện thoại / Zalo, Đơn vị công tác',
    purpose: 'Tạo tài khoản, xác thực OTP, cấp chứng nhận đúng tên và gửi thông báo link lớp học',
    legalBasis: 'Thực hiện hợp đồng & Sự đồng ý',
    retention: 'Suốt thời gian tài khoản hoạt động (+ tối đa 30 ngày sau yêu cầu xóa)'
  },
  {
    category: 'Thông tin xác thực Facebook, Google & Phiên',
    fields: 'Firebase UID, Facebook App-scoped ID, tên & ảnh đại diện Facebook (public_profile), email Facebook (nếu cấp), ảnh đại diện Google, thời điểm đăng nhập, IP',
    purpose: 'Đăng nhập 1 chạm / liên kết đa phương thức chung 1 tài khoản, ngăn chia sẻ tài khoản bất thường',
    legalBasis: 'Thực hiện hợp đồng & Lợi ích bảo mật hợp pháp',
    retention: 'Trong thời gian liên kết; xóa ngay khi gỡ kết nối hoặc xóa tài khoản'
  },
  {
    category: 'Dữ liệu học tập & Chứng nhận',
    fields: 'Khóa học đã ghi danh, tiến độ video, ghi chú học viên, bài thi trắc nghiệm, mã chứng nhận 10 số',
    purpose: 'Đồng bộ tiến độ đa thiết bị, chấm điểm tự động và tra cứu xác thực chứng nhận',
    legalBasis: 'Thực hiện hợp đồng đào tạo',
    retention: 'Tiến độ lưu theo tài khoản; Mã chứng nhận lưu để tra cứu xác thực'
  },
  {
    category: 'Dữ liệu giao dịch & Đối soát VietQR',
    fields: 'Mã đơn 10 số, tên khóa học/gói, số lượng học viên, số tiền (VNĐ), nội dung chuyển khoản ACB/VietQR, trạng thái đối soát',
    purpose: 'Kích hoạt khóa học tự động trong 1–3 giây, xuất biên nhận & xử lý hoàn tiền',
    legalBasis: 'Nghĩa vụ pháp lý (Luật Kế toán & Thuế)',
    retention: '10 năm theo quy định chứng từ kế toán'
  },
  {
    category: 'Tư vấn & Yêu cầu xóa dữ liệu',
    fields: 'Mã tiếp nhận 10 số, chủ đề, email/tài khoản, nội dung yêu cầu xóa dữ liệu (/data-deletion)',
    purpose: 'Phản hồi tư vấn ISO/HACCP hoặc tiếp nhận & thực thi yêu cầu xóa tài khoản/dữ liệu cá nhân',
    legalBasis: 'Sự đồng ý & Tuân thủ Luật 91/2025/QH15',
    retention: '24 tháng kể từ ngày đóng hồ sơ xử lý'
  }
];

const SUBPROCESSOR_ROWS = [
  {
    provider: 'Google LLC (Firebase Auth & Cloud Firestore)',
    role: 'Xác thực OAuth 2.0 & Cơ sở dữ liệu đám mây mã hóa',
    dataShared: 'Email, tên hiển thị, UID, tiến độ học tập, đăng ký khóa học',
    location: 'Hạ tầng Google Cloud (Châu Á / Hoa Kỳ)'
  },
  {
    provider: 'Meta Platforms, Inc. (Facebook Login)',
    role: 'Xác thực đăng nhập / liên kết tài khoản Facebook',
    dataShared: 'Quyền public_profile (tên, ảnh đại diện, ID ứng dụng) và email (nếu người dùng cấp)',
    location: 'Toàn cầu (Meta Privacy Policy)'
  },
  {
    provider: 'Google reCAPTCHA v3',
    role: 'Bảo vệ biểu mẫu đăng ký và liên hệ khỏi bot spam',
    dataShared: 'Tín hiệu trình duyệt, hành vi tương tác & điểm đánh giá rủi ro',
    location: 'Toàn cầu (Google Privacy Policy)'
  },
  {
    provider: 'Ngân hàng TMCP Á Châu (ACB) / VietQR',
    role: 'Đối soát giao dịch chuyển khoản ngân hàng tự động',
    dataShared: 'Mã tham chiếu 10 số, số tiền giao dịch, thời gian thanh toán',
    location: 'Việt Nam'
  },
  {
    provider: 'Zoom Video Communications / Google Meet',
    role: 'Tổ chức lớp học trực tuyến tương tác theo lịch đào tạo',
    dataShared: 'Link phòng học, tên & email học viên khi tham gia lớp trực tuyến',
    location: 'Toàn cầu'
  }
];

const COOKIE_REGISTRY = [
  {
    key: 'firebase:authUser / fast_session_user',
    provider: 'FAST E-Learning & Firebase',
    category: 'Thiết yếu',
    duration: 'Theo phiên / 30 ngày',
    purpose: 'Duy trì trạng thái đăng nhập hợp lệ của tài khoản Google, Facebook hoặc OTP.'
  },
  {
    key: '_GRECAPTCHA',
    provider: 'Google reCAPTCHA v3',
    category: 'Bảo mật (Thiết yếu)',
    duration: '6 tháng',
    purpose: 'Phân tích lưu lượng tự động để chống spam ở biểu mẫu liên hệ và đăng ký.'
  },
  {
    key: 'course_notifications_* & viewed_courses_*',
    provider: 'FAST E-Learning',
    category: 'Chức năng học tập',
    duration: 'Lưu cục bộ đến khi xóa',
    purpose: 'Đồng bộ thông báo link lớp học, khóa học đã xem và trạng thái đã đọc.'
  },
  {
    key: 'fast_privacy_preferences',
    provider: 'FAST E-Learning',
    category: 'Tùy chọn quyền riêng tư',
    duration: '12 tháng',
    purpose: 'Ghi nhớ lựa chọn bật/tắt cookie và thông báo do bạn thiết lập.'
  }
];

const PrivacyPolicy: React.FC = () => {
  const location = useLocation();
  const toast = useToast();

  const [activeTab, setActiveTab] = useState<HubTab>('policy');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeSectionId, setActiveSectionId] = useState<string>(POLICY_SECTIONS[0].id);
  const [expandedExamples, setExpandedExamples] = useState<Record<string, boolean>>({});
  const [copiedAnchorId, setCopiedAnchorId] = useState<string | null>(null);

  // Privacy preferences state
  const [preferences, setPreferences] = useState<PrivacyPreferences>(() => {
    try {
      const saved = localStorage.getItem('fast_privacy_preferences');
      if (saved) {
        return { ...DEFAULT_PREFERENCES, ...JSON.parse(saved), essential: true };
      }
    } catch {
      // ignore storage errors
    }
    return DEFAULT_PREFERENCES;
  });

  const sectionRefs = useRef<Record<string, HTMLElement | null>>({});

  // Scroll to hash if linked directly like /chinh-sach-bao-mat#quyen-cua-ban
  useEffect(() => {
    if (location.hash) {
      const targetId = location.hash.replace('#', '');
      const matchingSection = POLICY_SECTIONS.find((s) => s.id === targetId);
      if (matchingSection) {
        setActiveTab('policy');
        setActiveSectionId(targetId);
        setTimeout(() => {
          sectionRefs.current[targetId]?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 120);
      }
    }
  }, [location.hash]);

  const filteredSections = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return POLICY_SECTIONS;
    return POLICY_SECTIONS.filter(
      (sec) =>
        sec.title.toLowerCase().includes(q) ||
        sec.summary.toLowerCase().includes(q) ||
        sec.keywords.toLowerCase().includes(q) ||
        sec.paragraphs.some((p) => p.toLowerCase().includes(q)) ||
        (sec.bullets && sec.bullets.some((b) => b.text.toLowerCase().includes(q) || (b.label && b.label.toLowerCase().includes(q))))
    );
  }, [searchQuery]);

  // Track visible section while scrolling in Policy view
  useEffect(() => {
    if (activeTab !== 'policy') return;

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
  }, [activeTab, filteredSections]);

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
    const basePath = location.pathname || '/privacy-policy';
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

  const toggleExample = (key: string) => {
    setExpandedExamples((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleSavePreferences = () => {
    const updated = { ...preferences, essential: true, updatedAt: new Date().toISOString() };
    setPreferences(updated);
    try {
      localStorage.setItem('fast_privacy_preferences', JSON.stringify(updated));
    } catch {
      // ignore storage errors
    }
    toast.showToast('Đã lưu thiết lập quyền riêng tư & cookie trên thiết bị này.', 'success');
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100 select-text transition-colors duration-200">
      <Helmet>
        <title>Chính sách & Quyền riêng tư | FAST E-Learning</title>
        <meta
          name="description"
          content="Chính sách quyền riêng tư của FAST E-Learning: minh bạch việc thu thập tên, email, thông tin xác thực Facebook Login, dữ liệu học tập và dữ liệu giao dịch."
        />
        <link rel="canonical" href="https://fastelearning.com.vn/privacy-policy" />
      </Helmet>

      {/* Top Editorial Header Banner */}
      <section className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-10 pb-0">
          <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 pb-8">
            <div className="max-w-3xl space-y-3">
              <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-xs font-medium text-slate-500 dark:text-slate-400">
                <span className="text-[#007c76] dark:text-teal-400 font-semibold">
                  Trung tâm An toàn & Quyền riêng tư
                </span>
                <span aria-hidden="true">·</span>
                <span className="tabular-nums">Có hiệu lực: 01/01/2026</span>
                <span aria-hidden="true">·</span>
                <span className="tabular-nums">Cập nhật: 14/11/2026</span>
                <span aria-hidden="true">·</span>
                <span>Tuân thủ Luật 91/2025/QH15</span>
              </div>

              <h1
                className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-slate-900 dark:text-white leading-tight"
                style={{ textWrap: 'balance' }}
              >
                Chính sách & Quyền riêng tư
              </h1>

              <p className="text-base sm:text-lg text-slate-600 dark:text-slate-300 leading-relaxed max-w-2xl">
                Minh bạch về tên, email, thông tin xác thực Facebook, dữ liệu học tập và dữ liệu giao dịch mà FAST E-Learning thu thập, cách bảo mật và quyền kiểm soát của bạn.
              </p>
            </div>

            {/* Utility Actions */}
            <div className="flex flex-wrap items-center gap-3 print:hidden">
              <Link
                to="/terms"
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:border-[#007c76] hover:text-[#007c76] dark:hover:text-teal-400 transition-colors whitespace-nowrap shrink-0"
              >
                <FileText className="w-4 h-4" />
                <span>Điều khoản dịch vụ</span>
              </Link>
              <Link
                to="/data-deletion"
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:border-[#007c76] hover:text-[#007c76] dark:hover:text-teal-400 transition-colors whitespace-nowrap shrink-0"
              >
                <ShieldCheck className="w-4 h-4" />
                <span>Hướng dẫn xóa dữ liệu</span>
              </Link>
            </div>
          </div>

          {/* Google / Meta-style Horizontal Hub Navigation Tabs */}
          <nav
            aria-label="Phân mục Chính sách & Quyền riêng tư"
            className="flex items-center gap-2 sm:gap-6 overflow-x-auto no-scrollbar border-t border-slate-100 dark:border-slate-800 pt-1 print:hidden"
          >
            {[
              { id: 'policy' as HubTab, label: 'Chính sách quyền riêng tư', icon: ShieldCheck },
              { id: 'data-matrix' as HubTab, label: 'Minh bạch dữ liệu & Lưu trữ', icon: Database },
              { id: 'cookies' as HubTab, label: 'Công nghệ & Cookie', icon: Cookie }
            ].map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={`relative flex items-center gap-2 py-3.5 px-1 text-xs sm:text-sm font-semibold whitespace-nowrap shrink-0 transition-colors cursor-pointer ${
                    isActive
                      ? 'text-[#007c76] dark:text-teal-400'
                      : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{tab.label}</span>
                  {isActive && (
                    <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#007c76] dark:bg-teal-400 rounded-t" />
                  )}
                </button>
              );
            })}
          </nav>
        </div>
      </section>

      {/* Main Content Workspace */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 lg:py-12">
        {/* TAB 1: FULL 13-SECTION PRIVACY POLICY */}
        {activeTab === 'policy' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-start">
            {/* Sticky Left Table of Contents + Search */}
            <aside className="lg:col-span-4 lg:sticky lg:top-28 space-y-5 print:hidden">
              <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 space-y-4">
                <div className="space-y-1.5">
                  <label
                    htmlFor="privacy-search-input"
                    className="block text-xs font-semibold text-slate-600 dark:text-slate-300"
                  >
                    Tìm nhanh trong chính sách
                  </label>
                  <div className="relative">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      id="privacy-search-input"
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Tìm kiếm"
                      className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs sm:text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-[#007c76] focus:ring-2 focus:ring-[#007c76]/15"
                    />
                  </div>
                </div>

                <div className="border-t border-slate-100 dark:border-slate-800 pt-4">
                  <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-3">
                    Mục lục ({filteredSections.length} / {POLICY_SECTIONS.length} điều khoản)
                  </p>
                  <ul className="space-y-1 max-h-[420px] overflow-y-auto custom-scrollbar pr-1">
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

            {/* Editorial Reading Column */}
            <article className="lg:col-span-8 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 sm:p-10 lg:p-12 space-y-12">
              {/* Executive Plain-Language Summary Card */}
              <div className="p-6 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h2 className="text-base font-bold text-slate-900 dark:text-white">
                    Tóm tắt điểm cốt lõi dành cho người học
                  </h2>
                  <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
                    Đọc nhanh trong 60 giây
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                  <div>
                    <p className="font-semibold text-slate-900 dark:text-white mb-1">Không bán dữ liệu</p>
                    <p>Thông tin cá nhân của bạn không bao giờ được bán hoặc cho thuê cho bên quảng cáo thứ ba.</p>
                  </div>
                  <div>
                    <p className="font-semibold text-slate-900 dark:text-white mb-1">Tối thiểu & Minh bạch</p>
                    <p>Chỉ thu thập tên, email, thông tin xác thực Facebook/Google (public_profile, email), dữ liệu học tập và dữ liệu giao dịch VietQR để phục vụ học tập và cấp chứng nhận.</p>
                  </div>
                  <div>
                    <p className="font-semibold text-slate-900 dark:text-white mb-1">Toàn quyền kiểm soát & Xóa dữ liệu</p>
                    <p>
                      Bạn có thể chỉnh sửa hồ sơ hoặc gửi yêu cầu xóa tài khoản và dữ liệu bất kỳ lúc nào tại{' '}
                      <Link to="/data-deletion" className="text-[#007c76] dark:text-teal-400 font-semibold underline underline-offset-2">
                        Hướng dẫn xóa dữ liệu
                      </Link>.
                    </p>
                  </div>
                  <div>
                    <p className="font-semibold text-slate-900 dark:text-white mb-1">Bảo mật chuẩn quốc tế</p>
                    <p>Mã hóa TLS 256-bit, phân quyền theo vai trò tài khoản và tuân thủ Luật 91/2025/QH15.</p>
                  </div>
                </div>
              </div>

              {/* 13 Policy Sections */}
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
                        className="p-2 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-400 hover:text-[#007c76] hover:border-[#007c76] transition-colors shrink-0 cursor-pointer print:hidden"
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

                      {sec.examples && sec.examples.length > 0 && (
                        <div className="pt-2 space-y-2.5">
                          {sec.examples.map((ex, exIdx) => {
                            const exKey = `${sec.id}-${exIdx}`;
                            const isExpanded = !!expandedExamples[exKey];
                            return (
                              <div
                                key={exKey}
                                className="rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/70 dark:bg-slate-800/40 overflow-hidden"
                              >
                                <button
                                  type="button"
                                  onClick={() => toggleExample(exKey)}
                                  className="w-full px-4 py-3 text-left flex items-center justify-between gap-3 text-xs sm:text-sm font-semibold text-slate-800 dark:text-slate-200 hover:bg-slate-100/70 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                                >
                                  <span>{ex.title}</span>
                                  {isExpanded ? (
                                    <ChevronUp className="w-4 h-4 text-slate-400 shrink-0" />
                                  ) : (
                                    <ChevronDown className="w-4 h-4 text-slate-400 shrink-0" />
                                  )}
                                </button>
                                {isExpanded && (
                                  <div className="px-4 pb-3.5 pt-1 text-xs sm:text-sm text-slate-600 dark:text-slate-300 border-t border-slate-200/70 dark:border-slate-700/70 leading-relaxed">
                                    {ex.body}
                                  </div>
                                )}
                              </div>
                            );
                          })}
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
        )}

        {/* TAB 2: DATA TRANSPARENCY & RETENTION MATRIX (Google Data Safety + Meta Data Table style) */}
        {activeTab === 'data-matrix' && (
          <div className="space-y-10">
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 sm:p-8 space-y-6">
              <div className="space-y-2 max-w-3xl">
                <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
                  Bảng minh bạch phân loại dữ liệu & Thời hạn lưu trữ
                </h2>
                <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                  Tổng hợp chi tiết từng danh mục dữ liệu phát sinh trên FAST E-Learning, mục đích sử dụng hợp pháp và chu kỳ lưu trữ tương ứng theo quy chuẩn công bố của Google, Meta và Luật 91/2025/QH15.
                </p>
              </div>

              <div className="overflow-x-auto border border-slate-200 dark:border-slate-700 rounded-xl">
                <table className="w-full text-left border-collapse text-xs sm:text-sm">
                  <thead>
                    <tr className="bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white">
                      <th className="p-4 font-semibold">Nhóm dữ liệu</th>
                      <th className="p-4 font-semibold">Trường thông tin cụ thể</th>
                      <th className="p-4 font-semibold">Mục đích xử lý</th>
                      <th className="p-4 font-semibold">Cơ sở pháp lý</th>
                      <th className="p-4 font-semibold">Thời gian lưu trữ</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 dark:divide-slate-800 text-slate-600 dark:text-slate-300">
                    {DATA_MATRIX_ROWS.map((row, idx) => (
                      <tr key={idx} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 align-top">
                        <td className="p-4 font-semibold text-slate-900 dark:text-white whitespace-nowrap">
                          {row.category}
                        </td>
                        <td className="p-4">{row.fields}</td>
                        <td className="p-4">{row.purpose}</td>
                        <td className="p-4">{row.legalBasis}</td>
                        <td className="p-4 tabular-nums">{row.retention}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Sub-processors Table */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 sm:p-8 space-y-6">
              <div className="space-y-2 max-w-3xl">
                <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
                  Danh sách các Bên xử lý dữ liệu thứ ba (Sub-processors)
                </h2>
                <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                  Các đối tác hạ tầng kỹ thuật và ngân hàng được ủy quyền xử lý phần dữ liệu tối thiểu phục vụ vận hành hệ thống.
                </p>
              </div>

              <div className="overflow-x-auto border border-slate-200 dark:border-slate-700 rounded-xl">
                <table className="w-full text-left border-collapse text-xs sm:text-sm">
                  <thead>
                    <tr className="bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white">
                      <th className="p-4 font-semibold">Đối tác hạ tầng</th>
                      <th className="p-4 font-semibold">Vai trò vận hành</th>
                      <th className="p-4 font-semibold">Phạm vi dữ liệu trao đổi</th>
                      <th className="p-4 font-semibold">Khu vực xử lý</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 dark:divide-slate-800 text-slate-600 dark:text-slate-300">
                    {SUBPROCESSOR_ROWS.map((row, idx) => (
                      <tr key={idx} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 align-top">
                        <td className="p-4 font-semibold text-slate-900 dark:text-white">{row.provider}</td>
                        <td className="p-4">{row.role}</td>
                        <td className="p-4">{row.dataShared}</td>
                        <td className="p-4 whitespace-nowrap">{row.location}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: COOKIES & LOCAL STORAGE TECHNOLOGIES */}
        {activeTab === 'cookies' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            <div className="lg:col-span-5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 sm:p-8 space-y-6">
              <div className="space-y-2">
                <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                  Quản lý tùy chọn Cookie & Bộ nhớ cục bộ
                </h2>
                <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                  Điều chỉnh các nhóm lưu trữ trình duyệt phù hợp với nhu cầu của bạn. Cookie thiết yếu luôn hoạt động để bảo vệ phiên đăng nhập.
                </p>
              </div>

              <div className="divide-y divide-slate-200 dark:divide-slate-800">
                <div className="py-4 flex items-start justify-between gap-4">
                  <div className="space-y-1">
                    <p className="text-sm font-semibold text-slate-900 dark:text-white">
                      Cookie & Xác thực Thiết yếu (Luôn bật)
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Cần thiết cho đăng nhập Google/OTP, đối soát thanh toán và chống bot reCAPTCHA.
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    checked={true}
                    disabled
                    aria-label="Cookie thiết yếu"
                    className="mt-1 h-4 w-4 accent-[#007c76] cursor-not-allowed"
                  />
                </div>

                <div className="py-4 flex items-start justify-between gap-4">
                  <div className="space-y-1">
                    <label htmlFor="pref-learning" className="text-sm font-semibold text-slate-900 dark:text-white cursor-pointer">
                      Ghi nhớ tiến độ & học liệu cục bộ
                    </label>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Lưu vị trí video đang học, ghi chú cá nhân và khóa học đã xem gần đây.
                    </p>
                  </div>
                  <input
                    id="pref-learning"
                    type="checkbox"
                    checked={preferences.learningProgress}
                    onChange={(e) =>
                      setPreferences((prev) => ({ ...prev, learningProgress: e.target.checked }))
                    }
                    className="mt-1 h-4 w-4 accent-[#007c76] cursor-pointer"
                  />
                </div>

                <div className="py-4 flex items-start justify-between gap-4">
                  <div className="space-y-1">
                    <label htmlFor="pref-notif" className="text-sm font-semibold text-slate-900 dark:text-white cursor-pointer">
                      Thông báo link lớp học & cập nhật khóa
                    </label>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Hiển thị thông báo tức thì trên chuông tài khoản khi có link Zoom hoặc bài mới.
                    </p>
                  </div>
                  <input
                    id="pref-notif"
                    type="checkbox"
                    checked={preferences.notifications}
                    onChange={(e) =>
                      setPreferences((prev) => ({ ...prev, notifications: e.target.checked }))
                    }
                    className="mt-1 h-4 w-4 accent-[#007c76] cursor-pointer"
                  />
                </div>

                <div className="py-4 flex items-start justify-between gap-4">
                  <div className="space-y-1">
                    <label htmlFor="pref-analytics" className="text-sm font-semibold text-slate-900 dark:text-white cursor-pointer">
                      Đo lường hiệu năng & tối ưu trải nghiệm
                    </label>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Ghi nhận lỗi tải trang ẩn danh nhằm cải thiện tốc độ phát video và giao diện.
                    </p>
                  </div>
                  <input
                    id="pref-analytics"
                    type="checkbox"
                    checked={preferences.analytics}
                    onChange={(e) =>
                      setPreferences((prev) => ({ ...prev, analytics: e.target.checked }))
                    }
                    className="mt-1 h-4 w-4 accent-[#007c76] cursor-pointer"
                  />
                </div>
              </div>

              <button
                type="button"
                onClick={handleSavePreferences}
                className="w-full py-3 px-5 rounded-xl bg-[#007c76] hover:bg-[#00645f] text-white text-sm font-semibold transition-colors cursor-pointer"
              >
                Lưu tùy chọn cookie của tôi
              </button>
            </div>

            <div className="lg:col-span-7 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 sm:p-8 space-y-6">
              <div className="space-y-2">
                <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                  Danh mục khóa Cookie & Local Storage đang sử dụng
                </h2>
                <p className="text-sm text-slate-600 dark:text-slate-300">
                  Mỗi khóa lưu trữ được công khai minh bạch tên định danh, đơn vị đặt khóa, thời hạn và mục đích kỹ thuật.
                </p>
              </div>

              <div className="overflow-x-auto border border-slate-200 dark:border-slate-700 rounded-xl">
                <table className="w-full text-left border-collapse text-xs sm:text-sm">
                  <thead>
                    <tr className="bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white">
                      <th className="p-3.5 font-semibold">Tên khóa / Cơ chế</th>
                      <th className="p-3.5 font-semibold">Phân loại</th>
                      <th className="p-3.5 font-semibold">Thời hạn</th>
                      <th className="p-3.5 font-semibold">Mục đích</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 dark:divide-slate-800 text-slate-600 dark:text-slate-300">
                    {COOKIE_REGISTRY.map((item, idx) => (
                      <tr key={idx} className="align-top">
                        <td className="p-3.5 font-mono text-xs text-slate-900 dark:text-white">
                          <div>{item.key}</div>
                          <div className="font-sans text-[11px] text-slate-400 mt-0.5">{item.provider}</div>
                        </td>
                        <td className="p-3.5 whitespace-nowrap font-medium">{item.category}</td>
                        <td className="p-3.5 whitespace-nowrap tabular-nums">{item.duration}</td>
                        <td className="p-3.5">{item.purpose}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PrivacyPolicy;
