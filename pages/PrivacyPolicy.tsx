import React from 'react';

const PrivacyPolicy: React.FC = () => {
  return (
    <div className="bg-gray-50 min-h-screen py-12 md:py-20 font-sans">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Header Section */}
        <div className="text-center mb-12">
          <span className="text-[#007c76] text-xs md:text-sm font-black uppercase tracking-widest bg-[#007c76]/10 px-4 py-2 rounded-full">
            Bảo mật & Quyền riêng tư
          </span>
          <h1 className="text-3xl md:text-5xl font-black text-gray-900 tracking-tight mt-4 mb-3">
            CHÍNH SÁCH BẢO MẬT
          </h1>
          <p className="text-sm md:text-base text-gray-500 font-medium">
            Cập nhật lần cuối: Ngày 17 tháng 06 năm 2026
          </p>
        </div>

        {/* Content Card */}
        <div className="bg-white rounded-3xl p-6 md:p-12 shadow-sm border border-gray-100 text-gray-700 space-y-8 leading-relaxed">
          
          <section id="general">
            <h2 className="text-lg md:text-xl font-black text-gray-900 uppercase tracking-wider border-l-4 border-[#007c76] pl-3 mb-4">
              1. Cam kết Chung về Bảo mật
            </h2>
            <p className="text-sm md:text-base">
              Hệ thống đào tạo trực tuyến <strong>FAST E-Learning</strong> tôn trọng tuyệt đối quyền riêng tư và cam kết bảo vệ thông tin cá nhân của học viên, người dùng và các đối tác liên quan. Chính sách bảo mật này mô tả cách chúng tôi thu thập, lưu trữ, sử dụng và chia sẻ thông tin cá nhân để người dùng hoàn toàn an tâm đồng hành học tập cùng FAST.
            </p>
          </section>

          <section id="information-collection">
            <h2 className="text-lg md:text-xl font-black text-gray-900 uppercase tracking-wider border-l-4 border-[#007c76] pl-3 mb-4">
              2. Những thông tin chúng tôi thu thập
            </h2>
            <div className="space-y-2 text-sm md:text-base">
              <p>
                Để cung cấp trải nghiệm tùy biến tốt nhất và đảm bảo hiệu quả quản lý lớp học trực tuyến, hệ thống sẽ thu thập thông tin cụ thể:
              </p>
              <ul className="list-disc pl-5 space-y-1 text-gray-600">
                <li><strong>Thông tin định danh cá nhân:</strong> Địa chỉ Email, Họ và tên được thiết lập bởi người dùng hoặc hệ thống đăng nhập Google Sign-In / Firebase Authentication.</li>
                <li><strong>Thông tin thanh toán:</strong> Nhật ký chuyển khoản hỗ trợ nâng cấp tài khoản VIP hoặc mua bài giảng bao gồm Tên chủ tài khoản ngân hàng, số tiền và nội dung chuyển khoản để xác thực.</li>
                <li><strong>Thông tin tiến trình học tập:</strong> Lưu trữ tự động các bài học đã hoàn thành, tiến độ của từng chương học, nhằm tối ưu dữ liệu học viên không bị thất thoát khi chuyển đổi thiết bị.</li>
              </ul>
            </div>
          </section>

          <section id="information-usage">
            <h2 className="text-lg md:text-xl font-black text-gray-900 uppercase tracking-wider border-l-4 border-[#007c76] pl-3 mb-4">
              3. Mục đích sử dụng thông tin
            </h2>
            <div className="space-y-2 text-sm md:text-base">
              <p>
                Dữ liệu cá nhân khách hàng chỉ thu thập cho các mục tiêu chính thống liên quan đến dịch vụ của FAST E-Learning:
              </p>
              <ul className="list-disc pl-5 space-y-1 text-gray-600">
                <li>Cung cấp và vận hành các khóa học trực tuyến.</li>
                <li>Hỗ trợ học viên tra cứu tiến trình làm bài test, nộp bài, xem lại lịch sử thanh toán học phí.</li>
                <li>Gửi thông báo về cập nhật chương trình học, các tài liệu biểu mẫu ISO mới nhất hoặc các khóa học mới hữu ích.</li>
                <li>Giải đáp thắc mắc, hỗ trợ kỹ thuật nhanh chóng cho học viên khi gặp sự cố đăng nhập hoặc lỗi bài giảng thông qua liên hệ Zalo, Email.</li>
              </ul>
            </div>
          </section>

          <section id="data-retention">
            <h2 className="text-lg md:text-xl font-black text-gray-900 uppercase tracking-wider border-l-4 border-[#007c76] pl-3 mb-4">
              4. Bảo vệ & Lưu trữ An toàn Dữ liệu
            </h2>
            <p className="mb-3 text-sm md:text-base">
              Dữ liệu của học viên được lưu trữ trực tuyến an toàn thông qua cơ sở dữ liệu đám mây <strong>Firebase Firestore</strong> của Google. Các kết nối truyền tải dữ liệu luôn được mã hóa đồng bộ an toàn qua chuẩn HTTPS.
            </p>
            <p className="text-sm md:text-base text-gray-600">
              Chỉ những nhân sự có thẩm quyền (bao gồm Quản trị viên hệ thống và Giáo viên chủ quản khóa học) mới được cấp quyền truy cập thông tin tương ứng của học viên để chuẩn bị giáo án và tổ chức đào tạo hiệu quả. Chúng tôi cam kết tuyệt đối: <strong>Không bán, không cho thuê, không trao đổi thông tin khách hàng cho bất kỳ bên thứ ba nào</strong> vì mục đích thương mại phi pháp.
            </p>
          </section>

          <section id="cookies">
            <h2 className="text-lg md:text-xl font-black text-gray-900 uppercase tracking-wider border-l-4 border-[#007c76] pl-3 mb-4">
              5. Quản lý cookies trên trình duyệt
            </h2>
            <p className="text-sm md:text-base">
              Hệ thống sử dụng cookies và các cơ chế dữ liệu cục bộ chuẩn (như LocalStorage, SessionStorage) nhằm duy trì trạng thái đăng nhập, ghi nhớ ngôn ngữ, giao diện tự chọn giúp việc tương tác khóa học mượt mà hơn. Học viên hoàn toàn có quyền từ chối cookie bằng cách điều chỉnh cấu hình phần cài đặt bảo mật trên trình duyệt của riêng mình.
            </p>
          </section>

          <section id="user-rights">
            <h2 className="text-lg md:text-xl font-black text-gray-900 uppercase tracking-wider border-l-4 border-[#007c76] pl-3 mb-4">
              6. Quyền tiếp cận & Sửa đổi của Học viên
            </h2>
            <p className="text-sm md:text-base">
              Học viên có quyền đăng nhập vào mục Hồ Sơ cá nhân trên FAST E-Learning để kiểm tra thông tin cá nhân hiện hành, chỉnh sửa thông tin hiển thị hoặc yêu cầu chúng tôi xóa bỏ vĩnh viễn mọi logs thông tin cũ khỏi cơ sở dữ liệu Firebase bằng cách liên hệ ban hỗ trợ qua Email <strong>hkc.qms@gmail.com</strong>.
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

export default PrivacyPolicy;
