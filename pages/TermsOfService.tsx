import React from 'react';

const TermsOfService: React.FC = () => {
  return (
    <div className="bg-gray-50 min-h-screen py-12 md:py-20 font-sans">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Header Section */}
        <div className="text-center mb-12">
          <span className="text-[#007c76] text-xs md:text-sm font-black uppercase tracking-widest bg-[#007c76]/10 px-4 py-2 rounded-full">
            Pháp lý & Quy định
          </span>
          <h1 className="text-3xl md:text-5xl font-black text-gray-900 tracking-tight mt-4 mb-3">
            ĐIỀU KHOẢN SỬ DỤNG
          </h1>
          <p className="text-sm md:text-base text-gray-500 font-medium">
            Cập nhật lần cuối: Ngày 17 tháng 06 năm 2026
          </p>
        </div>

        {/* Content Card */}
        <div className="bg-white rounded-3xl p-6 md:p-12 shadow-sm border border-gray-100 text-gray-700 space-y-8 leading-relaxed">
          
          <section id="introduction">
            <h2 className="text-lg md:text-xl font-black text-gray-900 uppercase tracking-wider border-l-4 border-[#007c76] pl-3 mb-4">
              1. Chấp thuận Điều khoản
            </h2>
            <p className="mb-3 text-sm md:text-base">
              Chào mừng bạn đến với <strong>FAST E-Learning</strong> (thuộc hệ sinh thái FAST Consulting). Bằng việc truy cập, đăng ký tài khoản, hoặc tham gia học tập các khóa bài giảng trên nền tảng của chúng tôi, bạn đồng ý tuân thủ và bị ràng buộc bởi các điều khoản, điều kiện sử dụng dưới đây cùng với Chính sách bảo mật của chúng tôi.
            </p>
            <p className="text-sm md:text-base">
              Nếu bạn không đồng ý với bất kỳ phần nào của các điều khoản này, vui lòng ngừng sử dụng mọi dịch vụ và trang web FAST E-Learning ngay lập tức.
            </p>
          </section>

          <section id="accounts">
            <h2 className="text-lg md:text-xl font-black text-gray-900 uppercase tracking-wider border-l-4 border-[#007c76] pl-3 mb-4">
              2. Đăng ký & Bảo mật Tài khoản
            </h2>
            <div className="space-y-2 text-sm md:text-base">
              <p>
                Để sử dụng một số chức năng và tham gia các khóa đào tạo chuyên sâu (bao gồm cả quyền lợi thành viên VIP), người dùng cần cung cấp đầy đủ và chính xác thông tin đăng nhập bao gồm Email, Họ và tên và các trường liên quan.
              </p>
              <ul className="list-disc pl-5 space-y-1 text-gray-600">
                <li>Bạn có trách nhiệm bảo mật thông tin đăng nhập của riêng mình.</li>
                <li>Không chia sẻ hoặc cho mượn tài khoản học tập của mình cho người khác dưới mọi hình thức thương mại hay phi thương mại.</li>
                <li>Chúng tôi có quyền tạm khóa hoặc đình chỉ vĩnh viễn tài khoản nếu phát hiện bất kỳ hành vi bất thường, đăng nhập song song đồng thời từ nhiều thiết bị không khớp với phiên của một người dùng.</li>
              </ul>
            </div>
          </section>

          <section id="intellectual-property">
            <h2 className="text-lg md:text-xl font-black text-gray-900 uppercase tracking-wider border-l-4 border-[#007c76] pl-3 mb-4">
              3. Quyền sở hữu trí tuệ
            </h2>
            <p className="mb-3 text-sm md:text-base">
              Toàn bộ nội dung bài giảng, hình ảnh minh họa, tài liệu ISO, HACCP, QA/QC, tài liệu PDF, cấu trúc bài tập, các video hướng dẫn và mã nguồn trang web đều thuộc quyền sở hữu trí tuệ độc quyền của <strong>FAST Consulting & FAST E-Learning</strong>.
            </p>
            <p className="text-sm md:text-base text-gray-600">
              Nghiêm cấm tuyệt đối mọi hành vi sao chép, tải về (download) trái phép để chia sẻ công khai, phân phối, thương mại hóa hoặc giảng dạy lại nội dung bài giảng khi chưa có văn bản chấp thuận chính thức từ đại diện pháp luật của chúng tôi. Mọi hành vi vi phạm sẽ bị xử lý theo Luật Sở hữu trí tuệ nước Cộng hòa Xã hội Chủ nghĩa Việt Nam và luật pháp quốc tế.
            </p>
          </section>

          <section id="payments">
            <h2 className="text-lg md:text-xl font-black text-gray-900 uppercase tracking-wider border-l-4 border-[#007c76] pl-3 mb-4">
              4. Giao dịch & Học phí
            </h2>
            <div className="space-y-2 text-sm md:text-base">
              <p>
                FAST E-Learning cung cấp các dịch vụ học miễn phí và các gói trả phí nâng cấp thành viên VIP hoặc đăng ký mua từng khóa học đơn lẻ.
              </p>
              <ul className="list-disc pl-5 space-y-1 text-gray-600">
                <li><strong>Giá trị học phí:</strong> Giá của các khóa học được minh thị rõ ràng trên website. Giá này đã bao gồm quyền truy cập vĩnh viễn hoặc giới hạn tùy thuộc vào chính sách cụ thể của từng khóa học đó.</li>
                <li><strong>Thanh toán chuyển khoản:</strong> Người dùng thanh toán học phí qua ví điện tử hoặc cổng chuyển khoản ngân hàng tự động. Giao dịch hợp lệ sẽ được hệ thống quét và kích hoạt khóa học/VIP tự động trong vài phút.</li>
                <li><strong>Chính sách hoàn trả học phí:</strong> Do đặc thù sản phẩm số (bài giảng video và tài liệu tải ngay khi kích hoạt), học phí đã nộp sẽ không được hoàn trả sau khi tài khoản đã kích hoạt thành công quyền truy cập nội dung bài học.</li>
              </ul>
            </div>
          </section>

          <section id="disclaimer">
            <h2 className="text-lg md:text-xl font-black text-gray-900 uppercase tracking-wider border-l-4 border-[#007c76] pl-3 mb-4">
              5. Miễn trừ trách nhiệm về Đào tạo & Tư vấn
            </h2>
            <p className="mb-3 text-sm md:text-base">
              Chúng tôi luôn cam kết cung cấp kiến thức cập nhật, chuẩn chỉnh nhất theo quy định hiện hành của Bộ Y tế, các tiêu chuẩn Codex, TCVN và ISO. Tuy nhiên, FAST E-Learning làm rõ rằng:
            </p>
            <p className="text-sm md:text-base text-gray-600">
              Các khóa học trực tuyến cung cấp nền tảng kiến thức và hướng dẫn áp dụng. Việc doanh nghiệp hoặc cơ sở của bạn có đạt chứng nhận đủ điều kiện An toàn thực phẩm hay chứng chỉ ISO/HACCP thực tế kiểm duyệt hay không phụ thuộc trực tiếp vào quá trình vận hành, cơ sở vật chất và thẩm định thực phẩm của chính đơn vị bạn cũng như quyết định từ phía cơ quan Nhà nước có thẩm quyền kiểm tra. Chúng tôi không bao hàm cam kết pháp lý hoặc chịu trách nhiệm tài chính liên quan đến kết quả thanh kiểm tra thực tế của cơ sở học viên.
            </p>
          </section>

          <section id="modifications">
            <h2 className="text-lg md:text-xl font-black text-gray-900 uppercase tracking-wider border-l-4 border-[#007c76] pl-3 mb-4">
              6. Thay đổi điều khoản
            </h2>
            <p className="text-sm md:text-base">
              Chúng tôi có quyền điều chỉnh, sửa đổi các Điều khoản sử dụng này bất cứ lúc nào để phù hợp với quy định mới của pháp luật và xu hướng vận hành của hệ thống. Những thay đổi sẽ lập tức có hiệu lực ngay khi xuất bản trên trang này. Bạn được khuyến khích xem lại trang này định kỳ để cập nhật thông tin mới nhất.
            </p>
          </section>

          <div className="border-t border-gray-100 pt-8 flex flex-col md:flex-row items-center justify-between text-xs md:text-sm text-gray-400 font-bold gap-4">
            <span>FAST E-Learning - Nâng tầm chuẩn mực</span>
            <div className="flex gap-4">
              <span>Đại diện pháp lý: FAST Consulting Co., Ltd</span>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
};

export default TermsOfService;
