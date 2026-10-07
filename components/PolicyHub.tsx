import React, { useState, useEffect } from 'react';

interface PolicyHubProps {
  initialTab?: string;
}

export const PolicyHub: React.FC<PolicyHubProps> = ({ initialTab = 'terms' }) => {
  const [activeTab, setActiveTab] = useState(initialTab);

  useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab);
    }
  }, [initialTab]);

  const tabs = [
    { id: 'owner', label: '1. Thông tin chủ sở hữu', category: 'Pháp lý' },
    { id: 'terms', label: '2. Điều khoản sử dụng', category: 'Thỏa thuận' },
    { id: 'transaction', label: '3. Điều kiện giao dịch', category: 'Mua bán' },
    { id: 'payment', label: '4. Chính sách thanh toán', category: 'Giao dịch' },
    { id: 'refund', label: '5. Hoàn tiền & Hủy dịch vụ', category: 'Giao dịch' },
    { id: 'data-protection', label: '6. Bảo vệ dữ liệu cá nhân', category: 'Quyền riêng tư' },
    { id: 'security', label: '7. Chính sách bảo mật', category: 'Quyền riêng tư' },
    { id: 'intellectual-property', label: '8. Sở hữu trí tuệ', category: 'Bản quyền' },
    { id: 'complaints', label: '9. Giải quyết khiếu nại', category: 'Hỗ trợ' },
    { id: 'certificate', label: '10. Quy định về chứng nhận', category: 'Đào tạo' },
  ];

  const currentDateStr = "04/10/2026";

  return (
    <div className="bg-slate-50 min-h-screen py-10 font-sans text-slate-700">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10">
        
        {/* Main Title Banner */}
        <div className="text-center space-y-3 max-w-3xl mx-auto">
          <span className="text-[#007c76] text-xs font-black uppercase tracking-widest bg-teal-50 border border-teal-100 px-4 py-2 rounded-full">
            Trung tâm Pháp lý & Chính sách vận hành
          </span>
          <h1 className="text-3xl md:text-5xl font-black text-slate-900 tracking-tight">
            CỔNG THÔNG TIN PHÁP LÝ & CHÍNH SÁCH
          </h1>
          <p className="text-sm text-gray-500 font-semibold leading-relaxed">
            FAST Elearning cam kết minh bạch, bảo mật tối đa quyền lợi người học và tuân thủ tuyệt đối các quy định pháp luật thương mại điện tử nước Cộng hòa Xã hội Chủ nghĩa Việt Nam.
          </p>
        </div>

        {/* Tab Layout Container */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* Navigation Sidebar */}
          <div className="lg:col-span-4 bg-white p-6 rounded-3xl border border-gray-150 shadow-sm space-y-4">
            <h3 className="text-xs font-black uppercase text-gray-400 tracking-widest pb-2 border-b border-gray-100"> Danh sách điều khoản </h3>
            <div className="flex flex-col gap-2">
              {tabs.map((tab) => {
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`w-full text-left p-3.5 rounded-2xl transition-all flex justify-between items-center group cursor-pointer ${
                      isActive 
                        ? 'bg-[#007c76] text-white font-black shadow-md shadow-teal-700/10 scale-[1.02]' 
                        : 'bg-gray-50 hover:bg-gray-100 text-slate-700 font-bold'
                    }`}
                  >
                    <div className="space-y-0.5">
                      <p className="text-xs">{tab.label}</p>
                      <p className={`text-[9px] font-black uppercase ${isActive ? 'text-teal-100' : 'text-gray-400'}`}>
                        {tab.category}
                      </p>
                    </div>
                    <span className={`text-xs transition-transform group-hover:translate-x-1 ${isActive ? 'text-white' : 'text-gray-300'}`}>
                      ➜
                    </span>
                  </button>
                );
              })}
            </div>
            
            <div className="pt-4 border-t border-gray-100 space-y-2 text-[11px] text-gray-400 font-semibold">
              <p>📍 Đại diện pháp lý: Công ty TNHH FAST Consulting Việt Nam</p>
              <p>📅 Ngày cập nhật: {currentDateStr}</p>
            </div>
          </div>

          {/* Content Pane */}
          <div className="lg:col-span-8 bg-white p-6 md:p-12 rounded-3xl border border-gray-150 shadow-sm text-slate-700 space-y-8 leading-relaxed min-h-[500px]">
            
            {/* 1. THÔNG TIN CHỦ SỞ HỮU */}
            {activeTab === 'owner' && (
              <div className="space-y-6">
                <div className="border-b border-gray-100 pb-4">
                  <h2 className="text-2xl font-black text-slate-900 uppercase">1. Thông tin chủ sở hữu</h2>
                  <p className="text-xs text-gray-400 font-bold mt-1">Cập nhật lần cuối: {currentDateStr}</p>
                </div>
                
                <div className="space-y-6 text-sm md:text-base">
                  <div className="space-y-2">
                    <h3 className="font-extrabold text-base text-slate-900 border-l-4 border-[#007c76] pl-3">1.1. Thông tin website</h3>
                    <p><strong>Tên website:</strong> FAST Elearning</p>
                    <p><strong>Tên miền:</strong> fastelearning.com.vn</p>
                    <p><strong>Loại website:</strong> Website thương mại điện tử cung ứng dịch vụ học tập trực tuyến</p>
                    <p><strong>Lĩnh vực hoạt động:</strong> Đào tạo trực tuyến, tư vấn tiêu chuẩn ISO, HACCP, an toàn thực phẩm và hỗ trợ doanh nghiệp kiểm toán chất lượng dịch vụ.</p>
                  </div>

                  <div className="space-y-2 pt-2">
                    <h3 className="font-extrabold text-base text-slate-900 border-l-4 border-[#007c76] pl-3">1.2. Thông tin chủ sở hữu pháp lý</h3>
                    <p><strong>Tên doanh nghiệp:</strong> Công ty TNHH FAST Consulting Việt Nam</p>
                    <p><strong>Mã số doanh nghiệp/Mã số thuế:</strong> 0317829140 (Cấp bởi Sở Kế hoạch và Đầu tư)</p>
                    <p><strong>Địa chỉ đăng ký doanh nghiệp:</strong> Tòa nhà FAST Tower, Số 12 Khuất Duy Tiến, Quận Thanh Xuân, Thành phố Hà Nội, Việt Nam</p>
                    <p><strong>Điện thoại đường dây nóng:</strong> 0903 456 789 / 024 3356 7890</p>
                    <p><strong>Email chính thức hỗ trợ khách hàng:</strong> support@fastelearning.com.vn</p>
                  </div>

                  <div className="space-y-2 pt-2">
                    <h3 className="font-extrabold text-base text-slate-900 border-l-4 border-[#007c76] pl-3">1.3. Người chịu trách nhiệm nội dung website</h3>
                    <p><strong>Họ và tên:</strong> Nguyễn Thanh Phong</p>
                    <p><strong>Chức vụ:</strong> Giám đốc điều hành (CEO) FAST Elearning</p>
                    <p><strong>Email:</strong> h1h4phong@gmail.com</p>
                    <p><strong>Điện thoại:</strong> 0903 456 789</p>
                  </div>

                  <div className="p-4 bg-gray-50 border border-gray-200 rounded-2xl text-xs text-gray-500 font-medium">
                    Các thông tin trên được công bố minh bạch và cập nhật chuẩn xác theo Nghị định 52/2013/NĐ-CP của Chính phủ về thương mại điện tử nhằm bảo đảm quyền lợi tối đa cho người tiêu dùng và các bên tham gia giao dịch.
                  </div>
                </div>
              </div>
            )}

            {/* 2. ĐIỀU KHOẢN SỬ DỤNG */}
            {activeTab === 'terms' && (
              <div className="space-y-6">
                <div className="border-b border-gray-100 pb-4">
                  <h2 className="text-2xl font-black text-slate-900 uppercase">2. Điều khoản sử dụng</h2>
                  <p className="text-xs text-gray-400 font-bold mt-1">Cập nhật lần cuối: {currentDateStr}</p>
                </div>

                <div className="space-y-4 text-sm md:text-base text-slate-600">
                  <p>
                    Khi đăng ký tài khoản, đăng nhập hoặc bắt đầu tham gia các khóa bài giảng trực tuyến của chúng tôi, bạn chính thức xác nhận đồng ý tuân thủ toàn bộ các điều khoản ràng buộc dưới đây.
                  </p>

                  <section className="space-y-2">
                    <h3 className="font-extrabold text-base text-slate-900 border-l-4 border-[#007c76] pl-3">2.1. Điều kiện tạo tài khoản</h3>
                    <p>Người học cần đăng ký tài khoản bằng thông tin email cá nhân thực tế và tự chịu trách nhiệm bảo mật thông tin đăng nhập.</p>
                  </section>

                  <section className="space-y-2">
                    <h3 className="font-extrabold text-base text-slate-900 border-l-4 border-[#007c76] pl-3">2.2. Tuyệt đối nghiêm cấm chia sẻ tài khoản</h3>
                    <ul className="list-disc pl-5 space-y-1.5">
                      <li>Tài khoản cấp cho cá nhân học viên đăng ký, tuyệt đối không được chuyển nhượng, chia sẻ thông tin đăng nhập cho người khác sử dụng chung.</li>
                      <li>Nghiêm cấm hành vi bán lại quyền truy cập hoặc cấu hình một tài khoản dùng chung cho tập thể.</li>
                      <li><strong>FAST Elearning sử dụng cơ chế bảo mật quét phiên đồng thời</strong>. Tài khoản phát hiện đăng nhập song song bất thường từ nhiều vị trí IP địa lý khác nhau sẽ bị hệ thống tự động khóa tạm thời để bảo vệ nội dung đào tạo.</li>
                    </ul>
                  </section>

                  <section className="space-y-2">
                    <h3 className="font-extrabold text-base text-slate-900 border-l-4 border-[#007c76] pl-3">2.3. Nghiêm cấm ghi hình & phát tán video</h3>
                    <ul className="list-disc pl-5 space-y-1.5">
                      <li>Tất cả bài giảng video, slide định hướng, tài liệu HACCP, biểu mẫu ISO đều là tài sản bảo quyền của FAST Consulting.</li>
                      <li>Học viên tuyệt đối <strong>không được dùng phần mềm quay phim màn hình, sao chép nguồn phát, tải lậu video học hoặc phát tán video</strong> lên các diễn đàn công cộng.</li>
                      <li>Không được bán lại tài liệu, mẫu quy chuẩn hay các câu hỏi bài test ôn tập dưới mọi hình thức thương mại.</li>
                    </ul>
                  </section>

                  <section className="space-y-2">
                    <h3 className="font-extrabold text-base text-slate-900 border-l-4 border-[#007c76] pl-3">2.4. Quy định khóa tài khoản vi phạm</h3>
                    <p>Hệ thống có quyền chấm dứt vĩnh viễn quyền học của tài khoản phát hiện vi phạm bản quyền hay chia sẻ tài nguyên phi pháp mà không có nghĩa vụ phải hoàn trả lại học phí.</p>
                  </section>
                </div>
              </div>
            )}

            {/* 3. ĐIỀU KIỆN GIAO DỊCH CHUNG */}
            {activeTab === 'transaction' && (
              <div className="space-y-6">
                <div className="border-b border-gray-100 pb-4">
                  <h2 className="text-2xl font-black text-slate-900 uppercase">3. Điều kiện giao dịch</h2>
                  <p className="text-xs text-gray-400 font-bold mt-1">Cập nhật lần cuối: {currentDateStr}</p>
                </div>

                <div className="space-y-4 text-sm md:text-base text-slate-600">
                  <section className="space-y-2">
                    <h3 className="font-extrabold text-base text-slate-900 border-l-4 border-[#007c76] pl-3">3.1. Bản chất sản phẩm bán</h3>
                    <p>
                      FAST Elearning bán <strong>quyền truy cập trực tuyến không giới hạn thời gian (hoặc có giới hạn theo gói) vào nội dung bài giảng video và biểu mẫu chuẩn tương ứng</strong>.
                    </p>
                    <div className="p-4 bg-teal-50 border border-teal-200 rounded-2xl text-[#007c76] font-bold text-xs">
                      ⚠️ LƯU Ý QUAN TRỌNG: Học phí 599.000 VNĐ (Ví dụ: Khóa HACCP TCVN) là để mua quyền tham gia khóa đào tạo kiến thức trực tuyến, KHÔNG bao gồm mua "bán sẵn Giấy chứng nhận". Học viên bắt buộc phải trải qua quá trình làm bài kiểm tra trắc nghiệm nghiêm túc đạt điều kiện tiêu chuẩn mới được cấp Giấy chứng nhận hoàn thành tương thích.
                    </div>
                  </section>

                  <section className="space-y-2">
                    <h3 className="font-extrabold text-base text-slate-900 border-l-4 border-[#007c76] pl-3">3.2. Thông tin giá dịch vụ</h3>
                    <ul className="list-disc pl-5 space-y-1.5">
                      <li>Giá hiển thị trên website là giá trọn gói bằng Việt Nam Đồng (VNĐ).</li>
                      <li>Giá đã bao gồm đầy đủ thuế GTGT, chi phí chấm bài trắc nghiệm tự động và phí cấp giấy chứng nhận bản mềm (Digital Certificate).</li>
                    </ul>
                  </section>

                  <section className="space-y-2">
                    <h3 className="font-extrabold text-base text-slate-900 border-l-4 border-[#007c76] pl-3">3.3. Quy trình mua hàng & Kích hoạt</h3>
                    <p>
                      Khách hàng chọn khóa học ➔ Đăng ký thông tin (Email + Số điện thoại) ➔ Thanh toán chuyển khoản tự động qua mã QR ➔ Hệ thống SePay băm khớp thông tin tự động trong 1-3 giây ➔ Khóa học được kích hoạt vĩnh viễn trên tài khoản.
                    </p>
                  </section>
                </div>
              </div>
            )}

            {/* 4. CHÍNH SÁCH THANH TOÁN */}
            {activeTab === 'payment' && (
              <div className="space-y-6">
                <div className="border-b border-gray-100 pb-4">
                  <h2 className="text-2xl font-black text-slate-900 uppercase">4. Chính sách thanh toán</h2>
                  <p className="text-xs text-gray-400 font-bold mt-1">Cập nhật lần cuối: {currentDateStr}</p>
                </div>

                <div className="space-y-4 text-sm md:text-base text-slate-600">
                  <section className="space-y-2">
                    <h3 className="font-extrabold text-base text-slate-900 border-l-4 border-[#007c76] pl-3">4.1. Cổng chuyển khoản ngân hàng tự động (VietQR)</h3>
                    <p>Chúng tôi cung ứng hệ thống quét mã QR tự động từ đối tác SePay kết nối thẳng vào ngân hàng thụ hưởng của doanh nghiệp. Quá trình thanh toán diễn ra hoàn toàn khép kín và an toàn.</p>
                  </section>

                  <section className="space-y-2">
                    <h3 className="font-extrabold text-base text-slate-900 border-l-4 border-[#007c76] pl-3">4.2. Quy định xử lý khi xảy ra lỗi thanh toán</h3>
                    <div className="space-y-3 pt-1">
                      {/* Sub-item 1 */}
                      <div className="p-3.5 bg-gray-50 border border-gray-150 rounded-2xl">
                        <p className="font-extrabold text-slate-800 text-xs uppercase tracking-wide">● Thanh toán sai nội dung chuyển khoản:</p>
                        <p className="text-xs text-gray-500 mt-1">Hệ thống SePay sẽ tự động ghi nhận vào mục log xử lý thủ công. Bạn vui lòng chụp hóa đơn và liên hệ trực tiếp cho Hotline 0903 456 789 để nhân viên kích hoạt khóa học thủ công cho bạn trong 5 phút.</p>
                      </div>
                      
                      {/* Sub-item 2 */}
                      <div className="p-3.5 bg-gray-50 border border-gray-150 rounded-2xl">
                        <p className="font-extrabold text-slate-800 text-xs uppercase tracking-wide">● Chuyển khoản thiếu tiền:</p>
                        <p className="text-xs text-gray-500 mt-1">Khóa học chưa thể kích hoạt tự động. Bạn cần bổ sung chuyển nốt số tiền còn thiếu, hoặc yêu cầu hỗ trợ hoàn tiền phần giao dịch lỗi.</p>
                      </div>

                      {/* Sub-item 3 */}
                      <div className="p-3.5 bg-gray-50 border border-gray-150 rounded-2xl">
                        <p className="font-extrabold text-slate-800 text-xs uppercase tracking-wide">● Thanh toán thừa tiền / Trùng lặp:</p>
                        <p className="text-xs text-gray-500 mt-1">Hệ thống kích hoạt khóa học ngay lập tức, và bộ phận kế toán sẽ hoàn trả lại phần tiền thừa cho bạn vào tài khoản ngân hàng gốc trong vòng 24 giờ.</p>
                      </div>
                    </div>
                  </section>
                </div>
              </div>
            )}

            {/* 5. CHÍNH SÁCH HOÀN TIỀN / HỦY DỊCH VỤ */}
            {activeTab === 'refund' && (
              <div className="space-y-6">
                <div className="border-b border-gray-100 pb-4">
                  <h2 className="text-2xl font-black text-slate-900 uppercase">5. Chính sách hoàn tiền & Hủy khóa học</h2>
                  <p className="text-xs text-gray-400 font-bold mt-1">Cập nhật lần cuối: {currentDateStr}</p>
                </div>

                <div className="space-y-4 text-sm md:text-base text-slate-600">
                  <p>FAST Elearning áp dụng quy chế hoàn trả học phí rõ ràng, tôn trọng Luật bảo vệ người tiêu dùng:</p>
                  
                  <div className="border border-gray-200 rounded-3xl overflow-hidden shadow-sm">
                    <table className="w-full text-left text-xs md:text-sm border-collapse">
                      <thead>
                        <tr className="bg-slate-100 border-b border-gray-200 text-slate-800 font-extrabold">
                          <th className="p-4 border-r border-gray-200">Trường hợp cụ thể</th>
                          <th className="p-4">Phương án giải quyết của FAST</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200 font-medium">
                        <tr>
                          <td className="p-4 border-r border-gray-200 bg-slate-50/50 font-bold">Chưa kích hoạt khóa học (Chưa học)</td>
                          <td className="p-4 text-slate-600">Cho phép hủy giao dịch và hoàn tiền 100% trong vòng 7 ngày kể từ lúc thanh toán thành công.</td>
                        </tr>
                        <tr>
                          <td className="p-4 border-r border-gray-200 bg-slate-50/50 font-bold">Đã kích hoạt & truy cập bài học</td>
                          <td className="p-4 text-slate-600">Do tài sản trí tuệ là bài học video và file biểu mẫu có thể tải ngay lập tức, chúng tôi không hỗ trợ hủy hoàn tiền khi học viên đã bấm xem bài giảng trực tuyến.</td>
                        </tr>
                        <tr>
                          <td className="p-4 border-r border-gray-200 bg-slate-50/50 font-bold">Chuyển tiền nhầm lẫn / Chuyển 2 lần</td>
                          <td className="p-4 text-slate-600">Hoàn lại 100% giao dịch trùng lặp trong vòng 24 giờ sau khi xác minh.</td>
                        </tr>
                        <tr>
                          <td className="p-4 border-r border-gray-200 bg-slate-50/50 font-bold">Lỗi kỹ thuật nghiêm trọng phía FAST</td>
                          <td className="p-4 text-slate-600">Nếu hệ thống lỗi quá 48 giờ liên tiếp không xem được bài và không khắc phục được, học viên có quyền yêu cầu hoàn trả đầy đủ học phí.</td>
                        </tr>
                        <tr>
                          <td className="p-4 border-r border-gray-200 bg-slate-50/50 font-bold">FAST ngừng cung cấp khóa học giữa chừng</td>
                          <td className="p-4 text-slate-600">Hoàn tiền lại theo tỷ lệ phần trăm các bài giảng học viên chưa xem, hoặc chuyển đổi sang một khóa học tương đương miễn phí.</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* 6. CHÍNH SÁCH BẢO VỆ DỮ LIỆU CÁ NHÂN */}
            {activeTab === 'data-protection' && (
              <div className="space-y-6">
                <div className="border-b border-gray-100 pb-4">
                  <h2 className="text-2xl font-black text-slate-900 uppercase">6. Bảo vệ dữ liệu cá nhân (Tuân thủ Luật 91/2025/QH15)</h2>
                  <p className="text-xs text-gray-400 font-bold mt-1">Cập nhật lần cuối: {currentDateStr}</p>
                </div>

                <div className="space-y-4 text-sm md:text-base text-slate-600">
                  <div className="p-4 bg-indigo-50 border border-indigo-200 text-indigo-950 rounded-2xl text-xs font-semibold leading-relaxed">
                    📜 CAM KẾT PHÁP LÝ: FAST Elearning hoàn toàn tuân thủ và vận hành theo **Luật Bảo vệ dữ liệu cá nhân số 91/2025/QH15** của Quốc hội nước Cộng hòa Xã hội Chủ nghĩa Việt Nam (Chính thức có hiệu lực thi hành từ ngày 01/01/2026).
                  </div>

                  <section className="space-y-2">
                    <h3 className="font-extrabold text-base text-slate-900 border-l-4 border-[#007c76] pl-3">6.1. Các dữ liệu thu thập thực tế</h3>
                    <p>Khi sử dụng đăng nhập Google Login, Firebase Auth và chuyển khoản ngân hàng, hệ thống thu thập:</p>
                    <ul className="list-disc pl-5 space-y-1">
                      <li>Họ và tên cá nhân học viên.</li>
                      <li>Địa chỉ Email xác thực.</li>
                      <li>Số điện thoại (Nhận OTP / Khôi phục).</li>
                      <li>Lịch sử mua hàng & thông tin mã tham chiếu thanh toán.</li>
                      <li>Dữ liệu tiến độ học tập (Lịch sử làm bài thi, trả lời trắc nghiệm).</li>
                    </ul>
                  </section>

                  <section className="space-y-2">
                    <h3 className="font-extrabold text-base text-slate-900 border-l-4 border-[#007c76] pl-3">6.2. Thu thập dữ liệu để làm gì?</h3>
                    <p>Khởi tạo định danh tài khoản duy nhất, kích hoạt quyền khóa học tự động, cấp mã xác nhận OTP bảo mật và phát hành chứng nhận hoàn thành khi đủ điều kiện tốt nghiệp.</p>
                  </section>

                  <section className="space-y-2">
                    <h3 className="font-extrabold text-base text-slate-900 border-l-4 border-[#007c76] pl-3">6.3. Khai báo các bên xử lý dữ liệu (Bên thứ ba)</h3>
                    <p>Để vận hành thực tế hệ thống, FAST Elearning chia sẻ dữ liệu cần thiết với các đơn vị hạ tầng uy tín bao gồm:</p>
                    <ul className="list-disc pl-5 space-y-1 text-xs">
                      <li><strong>Google / Firebase</strong>: Hạ tầng lưu trữ đám mây, Cơ sở dữ liệu Firestore và Cơ chế xác thực tài khoản an toàn toàn cầu.</li>
                      <li><strong>SePay API Gateway</strong>: Đơn vị trung gian công nghệ hỗ trợ băm chữ ký đối soát dữ liệu ngân hàng tự động.</li>
                      <li><strong>Các hệ thống Hosting, CDN lưu trữ video bài giảng</strong>.</li>
                    </ul>
                  </section>
                </div>
              </div>
            )}

            {/* 7. CHÍNH SÁCH BẢO MẬT */}
            {activeTab === 'security' && (
              <div className="space-y-6">
                <div className="border-b border-gray-100 pb-4">
                  <h2 className="text-2xl font-black text-slate-900 uppercase">7. Chính sách bảo mật thông tin</h2>
                  <p className="text-xs text-gray-400 font-bold mt-1">Cập nhật lần cuối: {currentDateStr}</p>
                </div>

                <div className="space-y-4 text-sm md:text-base text-slate-600">
                  <section className="space-y-2">
                    <h3 className="font-extrabold text-base text-slate-900 border-l-4 border-[#007c76] pl-3">7.1. Mã hóa kết nối HTTPS bảo mật</h3>
                    <p>Mọi luồng dữ liệu truyền phát giữa thiết bị người dùng và máy chủ FAST Elearning đều được mã hóa bằng tiêu chuẩn mã hóa SSL/TLS 256-bit tiên tiến, ngăn chặn tuyệt đối nguy cơ nghe lén thông tin.</p>
                  </section>

                  <section className="space-y-2">
                    <h3 className="font-extrabold text-base text-slate-900 border-l-4 border-[#007c76] pl-3">7.2. Quản lý phiên và mã khóa bảo mật</h3>
                    <p>Mật khẩu người dùng được lưu trữ dưới thuật toán mã hóa một chiều phức tạp phía Firebase Auth. Nhân viên FAST Elearning hoàn toàn không thể xem được mật khẩu thô của bạn.</p>
                  </section>

                  <section className="space-y-2">
                    <h3 className="font-extrabold text-base text-slate-900 border-l-4 border-[#007c76] pl-3">7.3. Quy trình ứng phó khi có sự cố</h3>
                    <p>Nếu có bất kỳ lỗ hổng bảo mật hay sự cố rò rỉ dữ liệu nào xảy ra, ban quản trị kỹ thuật sẽ kích hoạt quy trình cách ly cơ sở dữ liệu trong 10 phút, khắc phục và gửi thông báo trực tiếp qua Email cho toàn thể học viên bị ảnh hưởng theo đúng Luật bảo vệ dữ liệu.</p>
                  </section>
                </div>
              </div>
            )}

            {/* 8. CHÍNH SÁCH SỞ HỮU TRÍ TUỆ */}
            {activeTab === 'intellectual-property' && (
              <div className="space-y-6">
                <div className="border-b border-gray-100 pb-4">
                  <h2 className="text-2xl font-black text-slate-900 uppercase">8. Chính sách Sở hữu trí tuệ</h2>
                  <p className="text-xs text-gray-400 font-bold mt-1">Cập nhật lần cuối: {currentDateStr}</p>
                </div>

                <div className="space-y-4 text-sm md:text-base text-slate-600">
                  <section className="space-y-2">
                    <h3 className="font-extrabold text-base text-slate-900 border-l-4 border-[#007c76] pl-3">8.1. Phạm vi bảo hộ bản quyền sở hữu trí tuệ</h3>
                    <p>Toàn bộ tài nguyên học tập hiển thị trên website bao gồm:</p>
                    <ul className="list-disc pl-5 space-y-1 text-xs font-bold text-slate-800">
                      <li>Tất cả các video bài giảng chất lượng cao.</li>
                      <li>Tài liệu quy trình, cẩm nang HACCP, bộ tiêu chuẩn ISO dạng PDF.</li>
                      <li>Bộ câu hỏi kiểm tra năng lực độc quyền.</li>
                      <li>Tên miền, giao diện và biểu trưng Logo thương hiệu của FAST Elearning.</li>
                    </ul>
                    <p className="pt-2">Các tài nguyên trên đều được đăng ký bảo hộ quyền tác giả theo luật pháp quốc gia Việt Nam.</p>
                  </section>

                  <section className="space-y-2">
                    <h3 className="font-extrabold text-base text-slate-900 border-l-4 border-[#007c76] pl-3">8.2. Giới hạn quyền sử dụng</h3>
                    <p>Học viên chỉ được quyền sử dụng các tài nguyên đào tạo này phục vụ cho việc tự ôn tập, nghiên cứu và học tập cá nhân. Nghiêm cấm sử dụng để thương mại hóa hoặc nhượng lại cho bên thứ ba khi chưa có sự đồng ý chính thức từ phía FAST Consulting.</p>
                  </section>
                </div>
              </div>
            )}

            {/* 9. CHÍNH SÁCH GIẢI QUYẾT KHIẾU NẠI */}
            {activeTab === 'complaints' && (
              <div className="space-y-6">
                <div className="border-b border-gray-100 pb-4">
                  <h2 className="text-2xl font-black text-slate-900 uppercase">9. Chính sách giải quyết khiếu nại</h2>
                  <p className="text-xs text-gray-400 font-bold mt-1">Cập nhật lần cuối: {currentDateStr}</p>
                </div>

                <div className="space-y-4 text-sm md:text-base text-slate-600">
                  <p>FAST Elearning ưu tiên tiếp nhận và xử lý khiếu nại trên tinh thần trách nhiệm cao nhất:</p>
                  
                  {/* Complaint Flow chart */}
                  <div className="p-6 bg-slate-50 border border-gray-200 rounded-3xl space-y-3 font-semibold text-xs text-slate-600">
                    <p className="text-center text-slate-800 font-black uppercase text-xs pb-2 border-b border-gray-200">QUY TRÌNH TIẾP NHẬN & GIẢI QUYẾT KHIẾU NẠI</p>
                    <div className="flex flex-col items-center gap-2">
                      <div className="bg-[#007c76] text-white px-4 py-2 rounded-xl">Bước 1: Học viên gửi phản hồi (Email: support@fastelearning.com.vn)</div>
                      <span>↓</span>
                      <div className="bg-slate-800 text-white px-4 py-2 rounded-xl">Bước 2: Hệ thống ghi nhận & rà soát dữ liệu đối soát trong 12 giờ</div>
                      <span>↓</span>
                      <div className="bg-slate-800 text-white px-4 py-2 rounded-xl">Bước 3: Liên hệ trao đổi phương án khắc phục hoặc hoàn tiền</div>
                      <span>↓</span>
                      <div className="bg-[#007c76] text-white px-4 py-2 rounded-xl">Bước 4: Hoàn thành bồi hoàn, hỗ trợ trực tuyến thành công</div>
                    </div>
                  </div>

                  <section className="space-y-2">
                    <h3 className="font-extrabold text-base text-slate-900 border-l-4 border-[#007c76] pl-3">9.2. Kênh thông tin tiếp nhận chính thức</h3>
                    <p>Mọi thắc mắc vui lòng gửi về hòm thư điện tử hỗ trợ hoặc đường dây nóng:</p>
                    <ul className="list-disc pl-5 space-y-1">
                      <li><strong>Email:</strong> support@fastelearning.com.vn</li>
                      <li><strong>Điện thoại:</strong> 0903 456 789</li>
                    </ul>
                  </section>
                </div>
              </div>
            )}

            {/* 10. QUY ĐỊNH VỀ CHỨNG NHẬN HOÀN THÀNH KHÓA HỌC */}
            {activeTab === 'certificate' && (
              <div className="space-y-6">
                <div className="border-b border-gray-100 pb-4">
                  <h2 className="text-2xl font-black text-slate-900 uppercase">10. Quy định về Giấy chứng nhận hoàn thành khóa học</h2>
                  <p className="text-xs text-gray-400 font-bold mt-1">Cập nhật lần cuối: {currentDateStr}</p>
                </div>

                <div className="space-y-4 text-sm md:text-base text-slate-600">
                  <section className="space-y-2">
                    <h3 className="font-extrabold text-base text-slate-900 border-l-4 border-[#007c76] pl-3">10.1. Bản chất pháp lý của Giấy chứng nhận</h3>
                    <p>
                      Giấy chứng nhận được cấp trực tuyến là <strong>"Giấy chứng nhận hoàn thành khóa học" (Certificate of Completion) do FAST Elearning tự cấp</strong>.
                    </p>
                    <p className="text-xs bg-amber-50 border border-amber-200 p-4 rounded-2xl text-amber-800 leading-relaxed font-semibold">
                      ⚠️ TUYÊN BỐ MIỄN TRỪ: Giấy chứng nhận hoàn thành của chúng tôi thể hiện việc bạn đã nghiên cứu nghiêm túc, vượt qua bài kiểm tra trắc nghiệm chuẩn chỉnh về HACCP, ISO tương ứng. Chứng nhận này KHÔNG phải là văn bằng giáo dục nghề nghiệp hay "Giấy chứng nhận do Nhà nước/Bộ Công Thương cấp trực tiếp" dưới dạng pháp quy bắt buộc. Bạn không được dùng tên các cơ quan quản lý Nhà nước khi nói về tính pháp lý của chứng nhận này.
                    </p>
                  </section>

                  <section className="space-y-2">
                    <h3 className="font-extrabold text-base text-slate-900 border-l-4 border-[#007c76] pl-3">10.2. Điều kiện cấp giấy chứng nhận</h3>
                    <p>Học viên bắt buộc phải học tối thiểu 80% thời lượng các video bài giảng, vượt qua bài thi trắc nghiệm tốt nghiệp cuối khóa với số điểm tối thiểu từ 80% trở lên.</p>
                  </section>
                </div>
              </div>
            )}

          </div>

        </div>

      </div>
    </div>
  );
};
