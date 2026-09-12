const fs = require('fs');
let code = fs.readFileSync('pages/FAQ.tsx', 'utf8');

const newFAQS = `const FAQS = [
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
];`;

const faqsRegex = /const FAQS = \[\s*\{[\s\S]*?\}\s*\];/;
code = code.replace(faqsRegex, newFAQS);

// Make sure Breadcrumbs component imported and added to layout if not already
if (!code.includes('<Breadcrumbs')) {
    code = code.replace(
        `<div className="text-center mb-12">`,
        `<div className="text-center mb-12">\n            <div className="flex justify-center mb-6">\n              <Breadcrumbs theme="light" items={[{ label: 'Trang chủ', path: '/' }, { label: 'Hỏi đáp (FAQ)' }]} />\n            </div>`
    );
}

fs.writeFileSync('pages/FAQ.tsx', code);
