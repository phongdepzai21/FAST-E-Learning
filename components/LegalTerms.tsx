import React, { useState, useEffect } from 'react';

interface LegalTermsProps {
  defaultSection?: string;
}

export const LegalTerms: React.FC<LegalTermsProps> = ({ defaultSection = 'terms' }) => {
  const [activeSection, setActiveSection] = useState(defaultSection);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    if (defaultSection) {
      setActiveSection(defaultSection);
    }
  }, [defaultSection]);

  const sections = [
    { id: 'owner', label: '1. Thông tin chủ sở hữu', category: 'Pháp lý', keywords: 'mst chủ sở hữu địa chỉ điện thoại hotline email đại diện phong' },
    { id: 'terms', label: '2. Điều khoản sử dụng', category: 'Thỏa thuận', keywords: 'chia sẻ tài khoản quay màn hình phát tán khóa tài khoản' },
    { id: 'transaction', label: '3. Điều kiện giao dịch', category: 'Mua bán', keywords: 'quyền học phí 599k kích hoạt đơn hàng xác nhận tcvn haccp' },
    { id: 'payment', label: '4. Chính sách thanh toán', category: 'Giao dịch', keywords: 'vietqr qr ngân hàng đối soát sai nội dung thiếu thừa' },
    { id: 'refund', label: '5. Hoàn tiền & Hủy khóa', category: 'Giao dịch', keywords: 'bồi hoàn nhầm lẫn kích hoạt hủy đơn lỗi hệ thống' },
    { id: 'data-protection', label: '6. Bảo vệ dữ liệu cá nhân', category: 'Riêng tư', keywords: '91/2025/qh15 luật 2026 google login firebase sepay thu thập' },
    { id: 'security', label: '7. Chính sách bảo mật', category: 'Riêng tư', keywords: 'https ssl mã hóa phiên đăng nhập rò rỉ cơ sở dữ liệu' },
    { id: 'intellectual-property', label: '8. Sở hữu trí tuệ', category: 'Bản quyền', keywords: 'video slide bài giảng câu hỏi test bản quyền logo fast' },
    { id: 'complaints', label: '9. Giải quyết khiếu nại', category: 'Hỗ trợ', keywords: 'khiếu nại quy trình email phản hồi bồi thường 12 giờ' },
    { id: 'certificate', label: '10. Quy định về chứng nhận', category: 'Đào tạo', keywords: 'chứng nhận hoàn thành tốt nghiệp trắc nghiệm 80% văn bằng' },
  ];

  const filteredSections = sections.filter(sec => 
    sec.label.toLowerCase().includes(searchTerm.toLowerCase()) ||
    sec.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
    sec.keywords.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const updateDate = "04 tháng 10 năm 2026";

  return (
    <div className="bg-slate-50 min-h-screen py-12 font-sans text-slate-700">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        
        {/* Interactive Compliance Banner */}
        <div className="bg-white p-6 md:p-8 rounded-3xl border border-gray-150 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-black uppercase rounded-lg">
                Verified Compliant 2026
              </span>
              <span className="text-[10px] text-gray-400 font-bold">Luật E-Commerce & Luật 91/2025/QH15</span>
            </div>
            <h2 className="text-xl md:text-2xl font-black text-slate-900 uppercase tracking-tight">
              Trung tâm Điều khoản & Dữ liệu Pháp lý
            </h2>
            <p className="text-xs text-gray-400 font-semibold">
              Tra cứu đầy đủ quy chuẩn, nghĩa vụ học viên và pháp lý vận hành của Công ty TNHH FAST Consulting Việt Nam.
            </p>
          </div>
        </div>

        {/* 2 Columns Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* Navigation & Live Search Sidebar */}
          <div className="lg:col-span-4 bg-white p-6 rounded-3xl border border-gray-150 shadow-sm space-y-4">
            <div className="space-y-1.5">
              <label className="text-[10px] font-black uppercase text-gray-400 tracking-wider">Bộ tìm kiếm thông minh</label>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Tìm từ khóa (Ví dụ: hoàn tiền, VIP, MST...)"
                className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold focus:outline-none focus:border-teal-500 text-slate-800"
              />
            </div>

            <div className="border-t border-gray-100 pt-3">
              <span className="text-[10px] font-black uppercase text-gray-400 tracking-wider block mb-2">Danh mục văn bản pháp quy</span>
              
              <div className="flex flex-col gap-2 max-h-[420px] overflow-y-auto pr-1">
                {filteredSections.map((sec) => {
                  const isActive = activeSection === sec.id;
                  return (
                    <button
                      key={sec.id}
                      onClick={() => setActiveSection(sec.id)}
                      className={`w-full text-left p-3 rounded-xl transition-all flex justify-between items-center group cursor-pointer ${
                        isActive 
                          ? 'bg-[#007c76] text-white font-black shadow-md scale-[1.01]' 
                          : 'bg-gray-50 hover:bg-gray-100 text-slate-700 font-bold'
                      }`}
                    >
                      <div className="space-y-0.5">
                        <p className="text-xs truncate max-w-[210px]">{sec.label}</p>
                        <p className={`text-[8px] font-black uppercase ${isActive ? 'text-teal-100' : 'text-gray-400'}`}>
                          {sec.category}
                        </p>
                      </div>
                      <span className={`text-[10px] transition-transform group-hover:translate-x-1 ${isActive ? 'text-white' : 'text-gray-300'}`}>
                        ➔
                      </span>
                    </button>
                  );
                })}
                
                {filteredSections.length === 0 && (
                  <p className="text-xs italic text-gray-400 text-center py-4 font-semibold">Không tìm thấy tài liệu phù hợp.</p>
                )}
              </div>
            </div>
          </div>

          {/* Dynamic Content Renderer */}
          <div className="lg:col-span-8 bg-white p-6 md:p-12 rounded-3xl border border-gray-150 shadow-sm text-slate-700 space-y-6 leading-relaxed">
            
            {/* 1. THÔNG TIN CHỦ SỞ HỮU */}
            {activeSection === 'owner' && (
              <div className="space-y-6 animate-in fade-in duration-300">
                <div className="border-b border-gray-100 pb-4">
                  <h2 className="text-2xl font-black text-slate-900 uppercase">1. Thông tin chủ sở hữu</h2>
                  <p className="text-xs text-gray-400 font-bold mt-1">Cập nhật lần cuối: Ngày {updateDate}</p>
                </div>
                
                <div className="space-y-4 text-xs md:text-sm">
                  <div className="space-y-2">
                    <h3 className="font-extrabold text-slate-950 border-l-4 border-teal-500 pl-3">1.1. Thông tin pháp lý website</h3>
                    <p><strong>Tên website thương mại:</strong> FAST Elearning</p>
                    <p><strong>Địa chỉ tên miền:</strong> fastelearning.com.vn</p>
                    <p><strong>Loại hình:</strong> Website thương mại điện tử cung ứng dịch vụ đào tạo & tư vấn trực tuyến</p>
                  </div>

                  <div className="space-y-2 pt-2">
                    <h3 className="font-extrabold text-slate-950 border-l-4 border-teal-500 pl-3">1.2. Pháp nhân chủ sở hữu doanh nghiệp</h3>
                    <p><strong>Tên doanh nghiệp chính thức:</strong> Công ty TNHH FAST Consulting Việt Nam</p>
                    <p><strong>Mã số thuế / Mã số doanh nghiệp:</strong> 0317829140 (Cấp bởi Sở Kế hoạch và Đầu tư)</p>
                    <p><strong>Địa chỉ trụ sở chính:</strong> Tòa nhà FAST Tower, Số 12 Khuất Duy Tiến, Quận Thanh Xuân, Thành phố Hà Nội, Việt Nam</p>
                    <p><strong>Số điện thoại hỗ trợ:</strong> 0903 456 789 / 024 3356 7890</p>
                    <p><strong>Email chính thức:</strong> support@fastelearning.com.vn</p>
                  </div>

                  <div className="space-y-2 pt-2">
                    <h3 className="font-extrabold text-slate-950 border-l-4 border-teal-500 pl-3">1.3. Đại diện trước pháp luật</h3>
                    <p><strong>Họ và tên:</strong> Nguyễn Thanh Phong</p>
                    <p><strong>Chức danh:</strong> Giám đốc điều hành (CEO)</p>
                    <p><strong>Hòm thư điện tử liên hệ trực tiếp:</strong> h1h4phong@gmail.com</p>
                  </div>
                </div>
              </div>
            )}

            {/* 2. ĐIỀU KHOẢN SỬ DỤNG */}
            {activeSection === 'terms' && (
              <div className="space-y-6 animate-in fade-in duration-300">
                <div className="border-b border-gray-100 pb-4">
                  <h2 className="text-2xl font-black text-slate-900 uppercase">2. Điều khoản sử dụng</h2>
                  <p className="text-xs text-gray-400 font-bold mt-1">Cập nhật lần cuối: Ngày {updateDate}</p>
                </div>

                <div className="space-y-4 text-xs md:text-sm text-slate-600">
                  <section className="space-y-2">
                    <h3 className="font-extrabold text-slate-950 border-l-4 border-teal-500 pl-3">2.1. Điều kiện tạo tài khoản</h3>
                    <p>Người học cần đăng ký tài khoản bằng thông tin email cá nhân thực tế và tự chịu trách nhiệm bảo mật thông tin đăng nhập.</p>
                  </section>

                  <section className="space-y-2">
                    <h3 className="font-extrabold text-slate-950 border-l-4 border-teal-500 pl-3">2.2. Tuyệt đối nghiêm cấm chia sẻ tài khoản</h3>
                    <ul className="list-disc pl-5 space-y-1">
                      <li>Tài khoản cấp cho cá nhân học viên đăng ký, tuyệt đối không được chuyển nhượng, chia sẻ thông tin đăng nhập cho người khác sử dụng chung.</li>
                      <li>Nghiêm cấm hành vi bán lại quyền truy cập hoặc cấu hình một tài khoản dùng chung cho tập thể.</li>
                      <li><strong>FAST Elearning sử dụng cơ chế bảo mật quét phiên đồng thời</strong>. Tài khoản phát hiện đăng nhập song song bất thường từ nhiều vị trí IP địa lý khác nhau sẽ bị hệ thống tự động khóa tạm thời để bảo vệ nội dung đào tạo.</li>
                    </ul>
                  </section>

                  <section className="space-y-2">
                    <h3 className="font-extrabold text-slate-950 border-l-4 border-teal-500 pl-3">2.3. Nghiêm cấm ghi hình & phát tán video</h3>
                    <ul className="list-disc pl-5 space-y-1">
                      <li>Tất cả bài giảng video, slide định hướng, tài liệu HACCP, biểu mẫu ISO đều là tài sản bảo quyền của FAST Consulting.</li>
                      <li>Học viên tuyệt đối <strong>không được dùng phần mềm quay phim màn hình, sao chép nguồn phát, tải lậu video học hoặc phát tán video</strong> lên các diễn đàn công cộng.</li>
                      <li>Không được bán lại tài liệu, mẫu quy chuẩn hay các câu hỏi bài test ôn tập dưới mọi hình thức thương mại.</li>
                    </ul>
                  </section>

                  <section className="space-y-2">
                    <h3 className="font-extrabold text-slate-950 border-l-4 border-teal-500 pl-3">2.4. Quy định khóa tài khoản vi phạm</h3>
                    <p>Hệ thống có quyền chấm dứt vĩnh viễn quyền học của tài khoản phát hiện vi phạm bản quyền hay chia sẻ tài nguyên phi pháp mà không có nghĩa vụ phải hoàn trả lại học phí.</p>
                  </section>
                </div>
              </div>
            )}

            {/* 3. ĐIỀU KIỆN GIAO DỊCH */}
            {activeSection === 'transaction' && (
              <div className="space-y-6 animate-in fade-in duration-300">
                <div className="border-b border-gray-100 pb-4">
                  <h2 className="text-2xl font-black text-slate-900 uppercase">3. Điều kiện giao dịch</h2>
                  <p className="text-xs text-gray-400 font-bold mt-1">Cập nhật lần cuối: Ngày {updateDate}</p>
                </div>

                <div className="space-y-4 text-xs md:text-sm text-slate-600">
                  <section className="space-y-2">
                    <h3 className="font-extrabold text-slate-950 border-l-4 border-teal-500 pl-3">3.1. Bản chất sản phẩm bán</h3>
                    <p>
                      FAST Elearning bán <strong>quyền truy cập trực tuyến không giới hạn thời gian (hoặc có giới hạn theo gói) vào nội dung bài giảng video và biểu mẫu chuẩn tương ứng</strong>.
                    </p>
                    <div className="p-4 bg-teal-50 border border-teal-200 rounded-2xl text-[#007c76] font-bold text-xs">
                      ⚠️ LƯU Ý QUAN TRỌNG: Học phí 599.000 VNĐ (Ví dụ: Khóa HACCP TCVN) là để mua quyền tham gia khóa đào tạo kiến thức trực tuyến, KHÔNG bao gồm mua "bán sẵn Chứng chỉ". Học viên bắt buộc phải trải qua quá trình làm bài kiểm tra trắc nghiệm nghiêm túc đạt điều kiện tiêu chuẩn mới được cấp Giấy chứng nhận hoàn thành tương thích.
                    </div>
                  </section>

                  <section className="space-y-2">
                    <h3 className="font-extrabold text-slate-950 border-l-4 border-teal-500 pl-3">3.2. Thông tin giá dịch vụ</h3>
                    <ul className="list-disc pl-5 space-y-1">
                      <li>Giá hiển thị trên website là giá trọn gói bằng Việt Nam Đồng (VNĐ).</li>
                      <li>Giá đã bao gồm đầy đủ thuế GTGT, chi phí chấm bài trắc nghiệm tự động và phí cấp giấy chứng nhận bản mềm (Digital Certificate).</li>
                    </ul>
                  </section>

                  <section className="space-y-2">
                    <h3 className="font-extrabold text-slate-950 border-l-4 border-teal-500 pl-3">3.3. Quy trình mua hàng & Kích hoạt</h3>
                    <p>
                      Khách hàng chọn khóa học ➔ Đăng ký thông tin (Email + Số điện thoại) ➔ Thanh toán chuyển khoản tự động qua mã QR ➔ Hệ thống SePay băm khớp thông tin tự động trong 1-3 giây ➔ Khóa học được kích hoạt vĩnh viễn trên tài khoản.
                    </p>
                  </section>
                </div>
              </div>
            )}

            {/* 4. CHÍNH SÁCH THANH TOÁN */}
            {activeSection === 'payment' && (
              <div className="space-y-6 animate-in fade-in duration-300">
                <div className="border-b border-gray-100 pb-4">
                  <h2 className="text-2xl font-black text-slate-900 uppercase">4. Chính sách thanh toán</h2>
                  <p className="text-xs text-gray-400 font-bold mt-1">Cập nhật lần cuối: Ngày {updateDate}</p>
                </div>

                <div className="space-y-4 text-xs md:text-sm text-slate-600">
                  <section className="space-y-2">
                    <h3 className="font-extrabold text-slate-950 border-l-4 border-teal-500 pl-3">4.1. Cổng chuyển khoản ngân hàng tự động (VietQR)</h3>
                    <p>Chúng tôi cung ứng hệ thống quét mã QR tự động từ đối tác SePay kết nối thẳng vào ngân hàng thụ hưởng của doanh nghiệp. Quá trình thanh toán diễn ra hoàn toàn khép kín và an toàn.</p>
                  </section>

                  <section className="space-y-2">
                    <h3 className="font-extrabold text-slate-950 border-l-4 border-teal-500 pl-3">4.2. Quy định xử lý khi xảy ra lỗi thanh toán</h3>
                    <div className="space-y-3 pt-1">
                      <div className="p-3.5 bg-gray-50 border border-gray-150 rounded-2xl">
                        <p className="font-extrabold text-slate-800 text-xs uppercase tracking-wide">● Thanh toán sai nội dung chuyển khoản:</p>
                        <p className="text-xs text-gray-500 mt-1">Hệ thống SePay sẽ tự động ghi nhận vào mục log xử lý thủ công. Bạn vui lòng chụp hóa đơn và liên hệ trực tiếp cho Hotline 0903 456 789 để nhân viên kích hoạt khóa học thủ công cho bạn trong 5 phút.</p>
                      </div>
                      
                      <div className="p-3.5 bg-gray-50 border border-gray-150 rounded-2xl">
                        <p className="font-extrabold text-slate-800 text-xs uppercase tracking-wide">● Chuyển khoản thiếu tiền:</p>
                        <p className="text-xs text-gray-500 mt-1">Khóa học chưa thể kích hoạt tự động. Bạn cần bổ sung chuyển nốt số tiền còn thiếu, hoặc yêu cầu hỗ trợ hoàn tiền phần giao dịch lỗi.</p>
                      </div>

                      <div className="p-3.5 bg-gray-50 border border-gray-150 rounded-2xl">
                        <p className="font-extrabold text-slate-800 text-xs uppercase tracking-wide">● Thanh toán thừa tiền / Trùng lặp:</p>
                        <p className="text-xs text-gray-500 mt-1">Hệ thống kích hoạt khóa học ngay lập tức, và bộ phận kế toán sẽ hoàn trả lại phần tiền thừa cho bạn vào tài khoản ngân hàng gốc trong vòng 24 giờ.</p>
                      </div>
                    </div>
                  </section>
                </div>
              </div>
            )}

            {/* 5. HOÀN TIỀN */}
            {activeSection === 'refund' && (
              <div className="space-y-6 animate-in fade-in duration-300">
                <div className="border-b border-gray-100 pb-4">
                  <h2 className="text-2xl font-black text-slate-900 uppercase">5. Chính sách hoàn tiền & Hủy khóa học</h2>
                  <p className="text-xs text-gray-400 font-bold mt-1">Cập nhật lần cuối: Ngày {updateDate}</p>
                </div>

                <div className="space-y-4 text-xs md:text-sm text-slate-600">
                  <p>FAST Elearning áp dụng quy chế hoàn trả học phí rõ ràng, tôn trọng Luật bảo vệ người tiêu dùng:</p>
                  
                  <div className="border border-gray-200 rounded-2xl overflow-hidden shadow-sm">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="bg-slate-100 border-b border-gray-200 text-slate-800 font-extrabold">
                          <th className="p-3 border-r border-gray-200">Trường hợp cụ thể</th>
                          <th className="p-3">Phương án giải quyết</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200 font-medium">
                        <tr>
                          <td className="p-3 border-r border-gray-200 bg-slate-50/50 font-bold">Chưa kích hoạt khóa học (Chưa học)</td>
                          <td className="p-3 text-slate-600">Hỗ trợ hoàn tiền 100% trong vòng 7 ngày kể từ lúc thanh toán thành công.</td>
                        </tr>
                        <tr>
                          <td className="p-3 border-r border-gray-200 bg-slate-50/50 font-bold">Đã kích hoạt & học bài</td>
                          <td className="p-3 text-slate-600">Không hỗ trợ bồi hoàn học phí sau khi tài khoản đã bấm mở xem video bài học.</td>
                        </tr>
                        <tr>
                          <td className="p-3 border-r border-gray-200 bg-slate-50/50 font-bold">Chuyển tiền trùng lặp</td>
                          <td className="p-3 text-slate-600">Hoàn lại 100% số tiền chuyển thừa trong 24 giờ sau khi đối soát đối ứng.</td>
                        </tr>
                        <tr>
                          <td className="p-3 border-r border-gray-200 bg-slate-50/50 font-bold">Lỗi kỹ thuật nghiêm trọng phía FAST</td>
                          <td className="p-3 text-slate-600">Bồi hoàn đầy đủ tiền học phí nếu lỗi hệ thống kéo dài quá 48 giờ liên tục.</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* 6. BẢO VỆ DỮ LIỆU CÁ NHÂN */}
            {activeSection === 'data-protection' && (
              <div className="space-y-6 animate-in fade-in duration-300">
                <div className="border-b border-gray-100 pb-4">
                  <h2 className="text-2xl font-black text-slate-900 uppercase">6. Bảo vệ dữ liệu cá nhân (Luật 91/2025/QH15)</h2>
                  <p className="text-xs text-gray-400 font-bold mt-1">Cập nhật lần cuối: Ngày {updateDate}</p>
                </div>

                <div className="space-y-4 text-xs md:text-sm text-slate-600">
                  <div className="p-4 bg-indigo-50 border border-indigo-200 text-indigo-950 rounded-2xl text-xs font-semibold leading-relaxed">
                    📜 CAM KẾT PHÁP LÝ: FAST Elearning hoàn toàn tuân thủ và vận hành theo **Luật Bảo vệ dữ liệu cá nhân số 91/2025/QH15** của Quốc hội nước Cộng hòa Xã hội Chủ nghĩa Việt Nam (Chính thức có hiệu lực thi hành từ ngày 01/01/2026).
                  </div>

                  <section className="space-y-2">
                    <h3 className="font-extrabold text-slate-950 border-l-4 border-teal-500 pl-3">6.1. Các dữ liệu thu thập thực tế</h3>
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
                    <h3 className="font-extrabold text-slate-950 border-l-4 border-teal-500 pl-3">6.2. Thu thập dữ liệu để làm gì?</h3>
                    <p>Khởi tạo định danh tài khoản duy nhất, kích hoạt quyền khóa học tự động, cấp mã xác nhận OTP bảo mật và phát hành chứng nhận hoàn thành khi đủ điều kiện tốt nghiệp.</p>
                  </section>

                  <section className="space-y-2">
                    <h3 className="font-extrabold text-slate-950 border-l-4 border-teal-500 pl-3">6.3. Khai báo các bên xử lý dữ liệu (Bên thứ ba)</h3>
                    <p>Để vận hành thực tế hệ thống, FAST Elearning chia sẻ dữ liệu cần thiết với các đơn vị hạ tầng uy tín bao gồm:</p>
                    <ul className="list-disc pl-5 space-y-1 text-xs text-slate-500">
                      <li><strong>Google / Firebase</strong>: Hạ tầng lưu trữ đám mây, Cơ sở dữ liệu Firestore và Cơ chế xác thực tài khoản an toàn toàn cầu.</li>
                      <li><strong>SePay API Gateway</strong>: Đơn vị trung gian công nghệ hỗ trợ băm chữ ký đối soát dữ liệu ngân hàng tự động.</li>
                      <li><strong>Các hệ thống Hosting, CDN lưu trữ video bài giảng</strong>.</li>
                    </ul>
                  </section>
                </div>
              </div>
            )}

            {/* 7. CHÍNH SÁCH BẢO MẬT */}
            {activeSection === 'security' && (
              <div className="space-y-6 animate-in fade-in duration-300">
                <div className="border-b border-gray-100 pb-4">
                  <h2 className="text-2xl font-black text-slate-900 uppercase">7. Chính sách bảo mật</h2>
                  <p className="text-xs text-gray-400 font-bold mt-1">Cập nhật lần cuối: Ngày {updateDate}</p>
                </div>

                <div className="space-y-4 text-xs md:text-sm text-slate-600">
                  <section className="space-y-2">
                    <h3 className="font-extrabold text-slate-950 border-l-4 border-teal-500 pl-3">7.1. Mã hóa kết nối HTTPS bảo mật</h3>
                    <p>Mọi luồng dữ liệu truyền phát giữa thiết bị người dùng và máy chủ FAST Elearning đều được mã hóa bằng tiêu chuẩn mã hóa SSL/TLS 256-bit tiên tiến, ngăn chặn tuyệt đối nguy cơ nghe lén thông tin.</p>
                  </section>

                  <section className="space-y-2">
                    <h3 className="font-extrabold text-slate-950 border-l-4 border-teal-500 pl-3">7.2. Quản lý phiên và mã khóa bảo mật</h3>
                    <p>Mật khẩu người dùng được lưu trữ dưới thuật toán mã hóa một chiều phức tạp phía Firebase Auth. Nhân viên FAST Elearning hoàn toàn không thể xem được mật khẩu thô của bạn.</p>
                  </section>
                </div>
              </div>
            )}

            {/* 8. SỞ HỮU TRÍ TUỆ */}
            {activeSection === 'intellectual-property' && (
              <div className="space-y-6 animate-in fade-in duration-300">
                <div className="border-b border-gray-100 pb-4">
                  <h2 className="text-2xl font-black text-slate-900 uppercase">8. Chính sách Sở hữu trí tuệ</h2>
                  <p className="text-xs text-gray-400 font-bold mt-1">Cập nhật lần cuối: Ngày {updateDate}</p>
                </div>

                <div className="space-y-4 text-xs md:text-sm text-slate-600">
                  <section className="space-y-2">
                    <h3 className="font-extrabold text-slate-950 border-l-4 border-teal-500 pl-3">8.1. Phạm vi bảo hộ bản quyền sở hữu trí tuệ</h3>
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
                    <h3 className="font-extrabold text-slate-950 border-l-4 border-teal-500 pl-3">8.2. Giới hạn quyền sử dụng</h3>
                    <p>Học viên chỉ được quyền sử dụng các tài nguyên đào tạo này phục vụ cho việc tự ôn tập, nghiên cứu và học tập cá nhân. Nghiêm cấm sử dụng để thương mại hóa hoặc nhượng lại cho bên thứ ba khi chưa có sự đồng ý chính thức từ phía FAST Consulting.</p>
                  </section>
                </div>
              </div>
            )}

            {/* 9. GIẢI QUYẾT KHIẾU NẠI */}
            {activeSection === 'complaints' && (
              <div className="space-y-6 animate-in fade-in duration-300">
                <div className="border-b border-gray-100 pb-4">
                  <h2 className="text-2xl font-black text-slate-900 uppercase">9. Giải quyết khiếu nại</h2>
                  <p className="text-xs text-gray-400 font-bold mt-1">Cập nhật lần cuối: Ngày {updateDate}</p>
                </div>

                <div className="space-y-4 text-xs md:text-sm text-slate-600">
                  <p>FAST Elearning ưu tiên tiếp nhận và xử lý khiếu nại trên tinh thần trách nhiệm cao nhất:</p>
                  
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
                    <h3 className="font-extrabold text-slate-950 border-l-4 border-teal-500 pl-3">9.2. Kênh thông tin tiếp nhận chính thức</h3>
                    <p>Mọi thắc mắc vui lòng gửi về hòm thư điện tử hỗ trợ hoặc đường dây nóng:</p>
                    <ul className="list-disc pl-5 space-y-1">
                      <li><strong>Email:</strong> support@fastelearning.com.vn</li>
                      <li><strong>Điện thoại:</strong> 0903 456 789</li>
                    </ul>
                  </section>
                </div>
              </div>
            )}

            {/* 10. CHỨNG NHẬN */}
            {activeSection === 'certificate' && (
              <div className="space-y-6 animate-in fade-in duration-300">
                <div className="border-b border-gray-100 pb-4">
                  <h2 className="text-2xl font-black text-slate-900 uppercase">10. Quy định về Chứng nhận tốt nghiệp</h2>
                  <p className="text-xs text-gray-400 font-bold mt-1">Cập nhật lần cuối: Ngày {updateDate}</p>
                </div>

                <div className="space-y-4 text-xs md:text-sm text-slate-600">
                  <section className="space-y-2">
                    <h3 className="font-extrabold text-slate-950 border-l-4 border-teal-500 pl-3">10.1. Bản chất pháp lý của Giấy chứng nhận</h3>
                    <p>
                      Giấy chứng nhận được cấp trực tuyến là <strong>"Giấy chứng nhận hoàn thành khóa học" (Certificate of Completion) do FAST Elearning tự cấp</strong>.
                    </p>
                    <p className="text-xs bg-amber-50 border border-amber-200 p-4 rounded-2xl text-amber-800 leading-relaxed font-semibold">
                      ⚠️ TUYÊN BỐ MIỄN TRỪ: Giấy chứng nhận hoàn thành của chúng tôi thể hiện việc bạn đã nghiên cứu nghiêm túc, vượt qua bài kiểm tra trắc nghiệm chuẩn chỉnh về HACCP, ISO tương ứng. Chứng nhận này KHÔNG phải là văn bằng giáo dục nghề nghiệp hay "Chứng chỉ do Nhà nước/Bộ Công Thương cấp trực tiếp" dưới dạng pháp quy bắt buộc. Bạn không được dùng tên các cơ quan quản lý Nhà nước khi nói về tính pháp lý của chứng nhận này.
                    </p>
                  </section>

                  <section className="space-y-2">
                    <h3 className="font-extrabold text-slate-950 border-l-4 border-teal-500 pl-3">10.2. Điều kiện cấp giấy chứng nhận</h3>
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
export default LegalTerms;
