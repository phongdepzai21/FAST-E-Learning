import React, { useEffect, useState } from 'react';
import { X, ShieldAlert, Eye, Lock, AlertTriangle, FileText, CheckCircle, Stamp } from 'lucide-react';

interface SecureDocViewerModalProps {
  isOpen: boolean;
  onClose: () => void;
  documentTitle?: string;
  documentSubtitle?: string;
}

export const SecureDocViewerModal: React.FC<SecureDocViewerModalProps> = ({
  isOpen,
  onClose,
  documentTitle = 'Mẫu Hồ Sơ Xin Cấp Giấy Chứng Nhận Cơ Sở Đủ Điều Kiện ATTP',
  documentSubtitle = 'Ban hành kèm theo Nghị định số 15/2018/NĐ-CP và Thông tư hướng dẫn chuyên ngành ATTP'
}) => {
  const [activeTab, setActiveTab] = useState<'form1' | 'form2' | 'checklist'>('form1');
  const [showCopyNotice, setShowCopyNotice] = useState(false);

  // Chặn phím tắt In ấn (Ctrl+P, Cmd+P) và Lưu file (Ctrl+S, Cmd+S)
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && (e.key === 'p' || e.key === 'P' || e.key === 's' || e.key === 'S')) {
        e.preventDefault();
        e.stopPropagation();
        setShowCopyNotice(true);
        setTimeout(() => setShowCopyNotice(false), 3000);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/80 backdrop-blur-md p-2 sm:p-4 overflow-y-auto print:hidden select-none"
      onContextMenu={(e) => {
        e.preventDefault();
        setShowCopyNotice(true);
        setTimeout(() => setShowCopyNotice(false), 2500);
      }}
      style={{ userSelect: 'none', WebkitUserSelect: 'none' }}
    >
      {/* Toast cảnh báo khi cố gắng in hoặc copy */}
      {showCopyNotice && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-[110] bg-red-600 text-white px-5 py-3 rounded-2xl shadow-2xl flex items-center gap-3 text-xs sm:text-sm font-black uppercase tracking-wider animate-bounce">
          <AlertTriangle className="w-5 h-5 text-amber-200" />
          <span>Tài liệu bảo mật: Chức năng Tải về và In ấn đã bị khóa theo quy định!</span>
        </div>
      )}

      <div className="bg-white rounded-3xl max-w-4xl w-full border border-slate-200 shadow-2xl overflow-hidden my-4 sm:my-8 flex flex-col max-h-[92vh] relative">
        {/* Header Thanh trạng thái Bảo mật */}
        <div className="bg-gradient-to-r from-slate-900 via-teal-950 to-slate-900 text-white px-6 py-4 flex items-center justify-between border-b border-teal-500/30">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-teal-500/20 text-teal-300 flex items-center justify-center border border-teal-400/30">
              <Lock className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  Chế độ xem an toàn
                </span>
                <span className="text-[10px] text-red-400 font-bold uppercase tracking-wider flex items-center gap-1">
                  <ShieldAlert className="w-3 h-3" />
                  Cấm in &amp; tải về
                </span>
              </div>
              <h3 className="text-sm sm:text-base font-black truncate max-w-md sm:max-w-xl text-slate-100">
                {documentTitle}
              </h3>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 text-slate-200 hover:text-white flex items-center justify-center transition cursor-pointer"
            title="Đóng cửa sổ"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Cảnh báo bản quyền & điều khoản bảo mật */}
        <div className="bg-amber-50 border-b border-amber-200 px-6 py-2.5 flex items-center justify-between text-[11px] sm:text-xs text-amber-900 font-medium">
          <div className="flex items-center gap-2">
            <Eye className="w-4 h-4 text-amber-600 shrink-0" />
            <span>
              <strong>Chỉ xem trực tuyến:</strong> Tài liệu phục vụ tham khảo chuẩn hóa hồ sơ nội bộ FAST CONSULTING. Mọi hành vi chụp màn hình hoặc in ấn phục vụ phát tán thương mại đều bị nghiêm cấm.
            </span>
          </div>
          <span className="hidden md:inline-block font-mono text-amber-800 font-bold bg-amber-100 px-2 py-0.5 rounded text-[10px]">
            ID: {Math.floor(1000000000 + Math.random() * 9000000000)}
          </span>
        </div>

        {/* Tab chuyển các biểu mẫu */}
        <div className="flex border-b border-slate-200 bg-slate-50 px-6 pt-3 gap-2 overflow-x-auto text-xs font-bold">
          <button
            type="button"
            onClick={() => setActiveTab('form1')}
            className={`pb-2.5 px-4 border-b-2 transition flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
              activeTab === 'form1'
                ? 'border-[#007c76] text-[#007c76] font-black'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Mẫu 01: Đơn Đề Nghị Cấp Giấy Chứng Nhận</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('form2')}
            className={`pb-2.5 px-4 border-b-2 transition flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
              activeTab === 'form2'
                ? 'border-[#007c76] text-[#007c76] font-black'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Stamp className="w-3.5 h-3.5" />
            <span>Mẫu 02a: Thuyết Minh Cơ Sở Vật Chất</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('checklist')}
            className={`pb-2.5 px-4 border-b-2 transition flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
              activeTab === 'checklist'
                ? 'border-[#007c76] text-[#007c76] font-black'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <CheckCircle className="w-3.5 h-3.5" />
            <span>Danh mục Hồ Sơ Bắt Buộc Kèm Theo</span>
          </button>
        </div>

        {/* Khung Nội dung Tài liệu có Watermark */}
        <div className="flex-1 overflow-y-auto p-6 sm:p-10 relative bg-[#fafafa]">
          {/* Watermark mờ chống chụp sao chép */}
          <div className="absolute inset-0 pointer-events-none select-none flex flex-wrap items-center justify-around opacity-[0.04] text-slate-900 font-black text-2xl uppercase tracking-widest rotate-[-25deg] overflow-hidden">
            <span>FAST CONSULTING</span>
            <span>CHỈ XEM TRỰC TUYẾN</span>
            <span>KHÔNG SAO CHÉP</span>
            <span>BẢN QUYỀN FAST</span>
            <span>FAST CONSULTING</span>
            <span>CHỈ XEM TRỰC TUYẾN</span>
            <span>KHÔNG IN ẤN</span>
          </div>

          {activeTab === 'form1' && (
            <div className="bg-white p-6 sm:p-10 rounded-2xl shadow-sm border border-slate-200 text-slate-800 space-y-6 text-sm leading-relaxed max-w-3xl mx-auto relative z-10">
              <div className="text-center space-y-1">
                <p className="font-bold text-xs uppercase tracking-wider">CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM</p>
                <p className="font-bold text-xs">Độc lập - Tự do - Hạnh phúc</p>
                <div className="w-32 h-[1px] bg-slate-400 mx-auto my-1"></div>
                <p className="text-xs text-slate-400 italic pt-2">............., ngày ..... tháng ..... năm 202...</p>
              </div>

              <div className="text-center pt-2">
                <h2 className="text-lg sm:text-xl font-black uppercase text-slate-900 tracking-tight">
                  ĐƠN ĐỀ NGHỊ
                </h2>
                <h3 className="text-sm font-bold uppercase text-[#007c76]">
                  Cấp Giấy chứng nhận cơ sở đủ điều kiện an toàn thực phẩm
                </h3>
                <p className="text-xs text-slate-500 italic mt-1">
                  (Dành cho cơ sở sản xuất, kinh doanh thực phẩm theo Nghị định 15/2018/NĐ-CP)
                </p>
              </div>

              <div className="space-y-4 pt-4 border-t border-slate-200 text-xs sm:text-sm">
                <p>
                  <strong>Kính gửi:</strong> Chi cục An toàn vệ sinh thực phẩm / Ban Quản lý An toàn thực phẩm tỉnh/thành phố ........................................
                </p>

                <div className="space-y-2">
                  <p>1. Tên cơ sở/doanh nghiệp đề nghị: <span className="text-slate-400 italic">....................................................................................</span></p>
                  <p>2. Tên chủ cơ sở / Người đại diện theo pháp luật: <span className="text-slate-400 italic">..................................................................</span></p>
                  <p>3. Số CMND/CCCD/Hộ chiếu: <span className="text-slate-400 italic">...........................</span> Ngày cấp: <span className="text-slate-400 italic">............</span> Nơi cấp: <span className="text-slate-400 italic">........................</span></p>
                  <p>4. Địa chỉ trụ sở chính: <span className="text-slate-400 italic">...................................................................................................................</span></p>
                  <p>5. Địa chỉ xưởng sản xuất / bếp ăn / cơ sở kinh doanh: <span className="text-slate-400 italic">....................................................................</span></p>
                  <p>6. Số điện thoại liên hệ: <span className="text-slate-400 italic">.......................................</span> Email: <span className="text-slate-400 italic">.........................................................</span></p>
                  <p>7. Giấy chứng nhận đăng ký kinh doanh / Mã số thuế: <span className="text-slate-400 italic">..................................................................</span></p>
                  <p>8. Ngành nghề, nhóm sản phẩm thực phẩm đăng ký: <span className="text-slate-400 italic">.......................................................................</span></p>
                </div>

                <div className="p-4 bg-teal-50/70 rounded-xl border border-teal-200 text-xs text-teal-900 space-y-1.5">
                  <p className="font-bold">Hồ sơ kèm theo đơn đề nghị gồm có:</p>
                  <ul className="list-disc list-inside space-y-1">
                    <li>Bản thuyết minh về cơ sở vật chất, trang thiết bị, dụng cụ bảo đảm điều kiện ATTP (Mẫu 02a).</li>
                    <li>Bản sao Giấy chứng nhận đăng ký doanh nghiệp hoặc Hộ kinh doanh cá thể.</li>
                    <li>Giấy xác nhận đủ sức khỏe của chủ cơ sở và nhân sự trực tiếp tiếp xúc với thực phẩm.</li>
                    <li>Danh sách xác nhận tập huấn kiến thức An toàn thực phẩm của các nhân sự.</li>
                  </ul>
                </div>

                <p className="italic text-xs text-slate-600">
                  Chúng tôi xin cam kết hoàn toàn chịu trách nhiệm về tính trung thực, chính xác của hồ sơ và thực hiện nghiêm chỉnh các quy định của pháp luật về an toàn thực phẩm.
                </p>

                <div className="flex justify-between items-start pt-6">
                  <div className="text-center text-xs text-slate-500">
                    <p className="font-bold">NGƯỜI LẬP HỒ SƠ</p>
                    <p className="italic">(Ký và ghi rõ họ tên)</p>
                  </div>
                  <div className="text-center text-xs">
                    <p className="font-bold uppercase text-slate-900">ĐẠI DIỆN HỢP PHÁP CỦA CƠ SỞ</p>
                    <p className="italic text-slate-500">(Ký, ghi rõ họ tên và đóng dấu)</p>
                    <div className="h-20"></div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'form2' && (
            <div className="bg-white p-6 sm:p-10 rounded-2xl shadow-sm border border-slate-200 text-slate-800 space-y-6 text-sm leading-relaxed max-w-3xl mx-auto relative z-10">
              <div className="text-center space-y-1">
                <p className="font-bold text-xs uppercase tracking-wider">MẪU SỐ 02a: BẢN THUYẾT MINH</p>
                <h2 className="text-base sm:text-lg font-black uppercase text-slate-900 pt-1">
                  VỀ CƠ SỞ VẬT CHẤT, TRANG THIẾT BỊ, DỤNG CỤ BẢO ĐẢM ĐIỀU KIỆN VỆ SINH AN TOÀN THỰC PHẨM
                </h2>
              </div>

              <div className="space-y-4 pt-4 border-t border-slate-200 text-xs sm:text-sm">
                <div>
                  <h4 className="font-black text-[#007c76] uppercase">I. Vị trí địa điểm, môi trường xung quanh</h4>
                  <p className="text-slate-600 mt-1">
                    Cơ sở được bố trí cách xa các nguồn ô nhiễm (bãi rác, cống rãnh hở, khu xử lý chất thải công nghiệp). Mặt bằng không bị ngập úng, có hàng rào ngăn cách rõ ràng.
                  </p>
                </div>

                <div>
                  <h4 className="font-black text-[#007c76] uppercase">II. Bố trí dây chuyền sản xuất một chiều (Bếp ăn một chiều)</h4>
                  <p className="text-slate-600 mt-1">
                    Quy trình vận hành tuân thủ nguyên tắc 1 chiều khép kín:
                    <strong> Tiếp nhận nguyên liệu thô &rarr; Sơ chế &rarr; Chế biến nhiệt &rarr; Chia suất / Đóng gói &rarr; Xuất xưởng</strong>.
                    Đường đi của nguyên liệu sống và thực phẩm chín hoàn toàn không giao cắt nhau.
                  </p>
                </div>

                <div>
                  <h4 className="font-black text-[#007c76] uppercase">III. Hệ thống cấp - thoát nước &amp; xử lý rác</h4>
                  <p className="text-slate-600 mt-1">
                    - Nguồn nước sinh hoạt và chế biến đạt quy chuẩn QCVN 01-1:2018/BYT có kết quả xét nghiệm định kỳ.
                    - Cống thoát nước có nắp lưới ngăn côn trùng, độ dốc thoát nước chuẩn không ứ đọng mùi.
                    - Thùng rác có nắp đậy kín, đạp chân mở nắp và được thu gom xử lý trong ngày.
                  </p>
                </div>

                <div>
                  <h4 className="font-black text-[#007c76] uppercase">IV. Trang thiết bị, dụng cụ và phương tiện bảo quản</h4>
                  <p className="text-slate-600 mt-1">
                    - Bàn sơ chế và chế biến làm từ inox 304 không gỉ, dễ làm sạch và khử trùng.
                    - Dao, thớt phân biệt rõ màu sắc hoặc ký hiệu: Đỏ (thịt sống), Xanh (rau củ), Trắng (thực phẩm chín).
                    - Hệ thống tủ đông (&le; -18&deg;C) và tủ mát (0 - 5&deg;C) có nhiệt kế theo dõi nhiệt độ mỗi ca làm việc.
                  </p>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'checklist' && (
            <div className="bg-white p-6 sm:p-10 rounded-2xl shadow-sm border border-slate-200 text-slate-800 space-y-5 text-sm leading-relaxed max-w-3xl mx-auto relative z-10">
              <h2 className="text-base sm:text-lg font-black uppercase text-slate-900 text-center">
                DANH MỤC THẨM ĐỊNH HỒ SƠ CẤP CHỨNG NHẬN CƠ SỞ ĐỦ ĐIỀU KIỆN ATTP
              </h2>
              <p className="text-xs text-center text-slate-500 italic">
                Các tài liệu doanh nghiệp cần chuẩn bị sẵn trước khi đoàn thanh tra liên ngành về kiểm tra thực tế
              </p>

              <div className="space-y-3 pt-3">
                {[
                  { id: '1', title: 'Giấy chứng nhận đăng ký doanh nghiệp / Hộ kinh doanh có ngành nghề thực phẩm', status: 'Bắt buộc' },
                  { id: '2', title: 'Đơn đề nghị cấp Giấy chứng nhận cơ sở đủ điều kiện ATTP theo Mẫu số 01', status: 'Bắt buộc' },
                  { id: '3', title: 'Bản thuyết minh cơ sở vật chất, trang thiết bị dụng cụ theo Mẫu 02a', status: 'Bắt buộc' },
                  { id: '4', title: 'Sơ đồ mặt bằng cơ sở và thuyết minh quy trình chế biến một chiều', status: 'Bắt buộc' },
                  { id: '5', title: 'Giấy khám sức khỏe theo Thông tư 14/2013/TT-BYT (còn hiệu lực trong 12 tháng)', status: 'Bắt buộc' },
                  { id: '6', title: 'Giấy xác nhận tập huấn kiến thức an toàn thực phẩm của các nhân sự', status: 'Bắt buộc' },
                  { id: '7', title: 'Hợp đồng và hóa đơn chứng minh nguồn gốc nguyên liệu thực phẩm đầu vào', status: 'Bắt buộc' },
                  { id: '8', title: 'Phiếu kiểm nghiệm định kỳ nguồn nước ăn uống & mẫu thực phẩm thành phẩm', status: 'Bắt buộc' }
                ].map((item) => (
                  <div key={item.id} className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs">
                    <div className="flex items-center gap-3">
                      <span className="w-6 h-6 rounded-lg bg-teal-100 text-[#007c76] font-black flex items-center justify-center shrink-0">
                        {item.id}
                      </span>
                      <span className="font-bold text-slate-800">{item.title}</span>
                    </div>
                    <span className="px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 font-black text-[10px] shrink-0">
                      {item.status}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer Thanh điều hướng & Gợi ý */}
        <div className="bg-slate-100 px-6 py-4 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2 text-slate-600 font-medium text-center sm:text-left">
            <Lock className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>Chuyên gia FAST tư vấn trọn gói hoàn thiện hồ sơ và đồng hành tiếp đoàn thẩm định: <strong>0927 002 668</strong></span>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              type="button"
              onClick={onClose}
              className="w-full sm:w-auto px-6 py-2.5 bg-[#007c76] hover:bg-[#005f5b] text-white rounded-xl font-bold uppercase tracking-wider text-xs transition cursor-pointer shadow-sm"
            >
              Đóng cửa sổ xem
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SecureDocViewerModal;
