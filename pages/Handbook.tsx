import React, { useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { Breadcrumbs } from '../components/Breadcrumbs';
import { 
  ShieldAlert, 
  Thermometer, 
  Info, 
  Target, 
  AlertTriangle, 
  ShieldCheck,
  Sparkles,
  BookOpen,
  ArrowRight,
  Flame,
  CheckCircle2,
  Clock,
  Layers,
  Search,
  Droplets
} from 'lucide-react';

interface HandbookProps {
  embed?: boolean;
}

const Handbook: React.FC<HandbookProps> = ({ embed }) => {
  const [activeTab, setActiveTab] = useState<'temperature' | 'storage' | 'cooking' | 'handling' | 'who5keys' | 'hygiene'>('temperature');
  
  // Interactive Danger Zone Calculator
  const [testTemp, setTestTemp] = useState<number>(35);

  const getTempStatus = (temp: number) => {
    if (temp < 0) {
      return {
        level: 'safe-freeze',
        label: 'Ngăn đông an toàn (Dưới 0°C)',
        color: 'text-sky-600 bg-sky-50 border-sky-200',
        advice: 'Vi khuẩn bị ức chế phát triển hoàn toàn. Thời gian bảo quản lâu dài.'
      };
    }
    if (temp >= 0 && temp <= 4) {
      return {
        level: 'safe-chill',
        label: 'Ngăn mát tối ưu (0°C - 4°C)',
        color: 'text-teal-700 bg-teal-50 border-teal-200',
        advice: 'Nhiệt độ bảo quản lạnh tiêu chuẩn. Vi khuẩn nhân đôi rất chậm.'
      };
    }
    if (temp > 4 && temp < 60) {
      return {
        level: 'danger',
        label: 'VÙNG NGUY HIỂM TỚI HẠN (5°C - 60°C)',
        color: 'text-rose-700 bg-rose-50 border-rose-300 ring-2 ring-rose-400/40 animate-pulse',
        advice: 'Vi khuẩn nhân đôi mỗi 20 phút! Áp dụng nghiêm ngặt quy tắc 2 giờ / 4 giờ.'
      };
    }
    return {
      level: 'safe-hot',
      label: 'Giữ nóng an toàn (Trên 60°C)',
      color: 'text-amber-700 bg-amber-50 border-amber-200',
      advice: 'Thực phẩm giữ nóng trên bàn phục vụ hoặc bếp nấu. Đạt tiêu chuẩn an toàn.'
    };
  };

  const currentStatus = getTempStatus(testTemp);

  const navItems = [
    { id: 'temperature', label: 'Vùng nhiệt độ nguy hiểm', icon: Thermometer, badge: 'Cốt lõi' },
    { id: 'storage', label: 'Bảo quản & Tủ lạnh (FIFO)', icon: ShieldAlert, badge: 'Kho lạnh' },
    { id: 'cooking', label: 'Nhiệt độ đun nấu cốt lõi', icon: Target, badge: 'Chế biến' },
    { id: 'handling', label: 'Quy tắc 4 bước an toàn', icon: AlertTriangle, badge: 'Sơ chế' },
    { id: 'who5keys', label: '5 Chìa khóa vàng WHO', icon: ShieldCheck, badge: 'Tiêu chuẩn' },
    { id: 'hygiene', label: 'Vệ sinh & SSOP kiểm soát', icon: Droplets, badge: 'Vệ sinh' },
  ];

  return (
    <div className={embed ? "bg-slate-50" : "min-h-screen bg-slate-50 font-sans selection:bg-teal-500/20 selection:text-teal-800"}>
      <Helmet>
        <title>Cẩm Nang An Toàn Thực Phẩm Thực Chiến | FAST E-Learning</title>
        <meta name="description" content="Cẩm nang quy chuẩn an toàn thực phẩm, vùng nhiệt độ nguy hiểm, kiểm soát nhiệt độ lõi, vệ sinh SSOP và 5 nguyên tắc vàng của Tổ chức Y tế Thế giới (WHO)." />
      </Helmet>

      {/* Hero Header Banner */}
      {!embed && (
        <section className="relative pt-16 pb-20 md:pb-24 bg-gradient-to-b from-[#004d49] via-[#00605c] to-[#007c76] text-white overflow-hidden shadow-md">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-teal-300/15 via-transparent to-transparent pointer-events-none" />
          
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 text-center">
            <div className="flex justify-center mb-6">
              <Breadcrumbs theme="light" items={[{ label: 'Trang chủ', path: '/' }, { label: 'Cẩm nang ATTP' }]} />
            </div>

            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-xs font-black uppercase tracking-widest mb-6">
              <BookOpen className="w-3.5 h-3.5 text-teal-300" />
              <span>Sổ Tay Kỹ Thuật Kiểm Soát Chất Lượng Thực Phẩm</span>
            </div>

            <h1 className="text-3xl sm:text-5xl md:text-6xl font-black uppercase tracking-tight mb-4 drop-shadow-sm">
              Cẩm Nang <span className="text-teal-200">An Toàn Thực Phẩm</span>
            </h1>

            <p className="text-sm sm:text-base md:text-lg text-teal-50 max-w-2xl mx-auto font-medium leading-relaxed">
              Tổng hợp thực chiến về quy chuẩn nhiệt độ, lưu trữ phân tầng tủ lạnh, phòng ngừa nhiễm khuẩn chéo và hướng dẫn kiểm soát dành cho cơ sở F&amp;B.
            </p>
          </div>
        </section>
      )}

      {/* Main Content Layout */}
      <section className={embed ? "py-4 animate-fade-in" : "py-12 sm:py-16"}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col lg:flex-row gap-8 lg:gap-10">
          
          {/* Left Navigation Sidebar */}
          <div className="w-full lg:w-1/3 xl:w-1/4">
            <div className="sticky top-28 bg-white rounded-3xl p-4 shadow-sm border border-slate-200/80 space-y-2">
              <div className="px-3 py-2 border-b border-slate-100 flex items-center justify-between">
                <span className="text-[11px] font-black uppercase tracking-wider text-slate-400">Mục lục cẩm nang</span>
                <span className="text-[10px] font-bold text-[#007c76] bg-teal-50 px-2 py-0.5 rounded-md">6 Chuyên đề</span>
              </div>

              <nav className="space-y-1.5 pt-1">
                {navItems.map((item) => {
                  const isActive = activeTab === item.id;
                  const Icon = item.icon;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setActiveTab(item.id as any)}
                      className={`w-full flex items-center justify-between px-4 py-3 rounded-2xl font-bold text-xs sm:text-sm transition-all text-left cursor-pointer border ${
                        isActive
                          ? 'bg-[#007c76] text-white border-[#007c76] shadow-md shadow-teal-900/10'
                          : 'bg-transparent text-slate-700 border-transparent hover:bg-slate-50 hover:text-slate-900'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-white' : 'text-[#007c76]'}`} />
                        <span className="leading-tight">{item.label}</span>
                      </div>
                      <span className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded ${
                        isActive ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-500'
                      }`}>
                        {item.badge}
                      </span>
                    </button>
                  );
                })}
              </nav>

              <div className="mt-4 p-3.5 bg-gradient-to-br from-slate-900 to-[#004d49] text-white rounded-2xl text-xs space-y-2">
                <div className="flex items-center gap-2 font-bold text-teal-300">
                  <Sparkles className="w-4 h-4" />
                  <span>Chuẩn hóa chuyên sâu?</span>
                </div>
                <p className="text-[11px] text-slate-200 leading-snug">
                  Đăng ký khóa học ISO 22000 hoặc HACCP trên FAST để nhận Giấy chứng nhận hoàn thành bản cứng chính quy.
                </p>
              </div>
            </div>
          </div>

          {/* Right Content Pane */}
          <div className="w-full lg:w-2/3 xl:w-3/4">
            
            {/* 1. VÙNG NHIỆT ĐỘ NGUY HIỂM */}
            {activeTab === 'temperature' && (
              <div className="space-y-8 animate-fade-in">
                <div className="bg-white rounded-3xl p-6 sm:p-10 border border-slate-200/80 shadow-sm space-y-6">
                  <div>
                    <span className="text-[11px] font-black uppercase tracking-wider text-[#007c76]">Chuyên đề 01</span>
                    <h2 className="text-2xl sm:text-3xl font-black text-slate-900 uppercase tracking-tight mt-1">
                      Vùng Nhiệt Độ Nguy Hiểm (Danger Zone: 5°C - 60°C)
                    </h2>
                    <p className="text-slate-600 text-sm sm:text-base leading-relaxed mt-2">
                      Hầu hết các vi sinh vật gây ngộ độc thực phẩm (Salmonella, E. coli, Bacillus cereus, S. aureus) phát triển và nhân đôi bùng nổ trong khoảng <strong>5°C đến 60°C</strong>.
                    </p>
                  </div>

                  {/* Interactive Quick Temperature Tester */}
                  <div className="p-6 bg-slate-50 rounded-2xl border border-slate-200 space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <Thermometer className="w-5 h-5 text-[#007c76]" />
                        <span className="text-xs font-black uppercase tracking-wider text-slate-800">
                          Thử nghiệm tra cứu nhanh nhiệt độ thực phẩm:
                        </span>
                      </div>
                      <span className="text-lg font-black text-[#007c76] font-mono">{testTemp}°C ({(testTemp * 9/5 + 32).toFixed(1)}°F)</span>
                    </div>

                    <input 
                      type="range" 
                      min="-20" 
                      max="100" 
                      value={testTemp} 
                      onChange={(e) => setTestTemp(Number(e.target.value))}
                      className="w-full accent-[#007c76] cursor-pointer"
                    />

                    <div className={`p-4 rounded-xl border text-xs sm:text-sm font-semibold flex items-start gap-3 ${currentStatus.color}`}>
                      <Info className="w-5 h-5 shrink-0 mt-0.5" />
                      <div>
                        <strong className="block text-sm">{currentStatus.label}</strong>
                        <span>{currentStatus.advice}</span>
                      </div>
                    </div>
                  </div>

                  {/* Rule 2h / 4h */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-black text-slate-900 uppercase tracking-tight">
                      Quy Tắc Vàng 2 Giờ / 4 Giờ (2h / 4h Rule)
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="p-5 rounded-2xl bg-teal-50/80 border border-teal-200 space-y-2">
                        <span className="px-2.5 py-1 rounded-lg bg-teal-700 text-white font-black text-xs uppercase">
                          Dưới 2 Giờ
                        </span>
                        <p className="text-xs font-semibold text-slate-700 leading-relaxed">
                          Thực phẩm trong vùng nguy hiểm dưới 2h có thể dùng ngay hoặc làm lạnh trở lại dưới 5°C.
                        </p>
                      </div>

                      <div className="p-5 rounded-2xl bg-amber-50/80 border border-amber-200 space-y-2">
                        <span className="px-2.5 py-1 rounded-lg bg-amber-600 text-white font-black text-xs uppercase">
                          Từ 2 Đến 4 Giờ
                        </span>
                        <p className="text-xs font-semibold text-slate-700 leading-relaxed">
                          Bắt buộc sử dụng hoặc chế biến ngay. <strong>Không được phép tái làm lạnh</strong>.
                        </p>
                      </div>

                      <div className="p-5 rounded-2xl bg-rose-50/80 border border-rose-200 space-y-2">
                        <span className="px-2.5 py-1 rounded-lg bg-rose-600 text-white font-black text-xs uppercase">
                          Trên 4 Giờ
                        </span>
                        <p className="text-xs font-semibold text-slate-700 leading-relaxed">
                          <strong>Bắt buộc tiêu hủy ngay lập tức</strong>. Nguy cơ tích tụ ngoại độc tố vi khuẩn nguy hiểm.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* 2. BẢO QUẢN & TỦ LẠNH */}
            {activeTab === 'storage' && (
              <div className="space-y-8 animate-fade-in">
                <div className="bg-white rounded-3xl p-6 sm:p-10 border border-slate-200/80 shadow-sm space-y-6">
                  <div>
                    <span className="text-[11px] font-black uppercase tracking-wider text-[#007c76]">Chuyên đề 02</span>
                    <h2 className="text-2xl sm:text-3xl font-black text-slate-900 uppercase tracking-tight mt-1">
                      Nguyên Tắc Phân Tầng Tủ Lạnh &amp; Quản Lý FIFO
                    </h2>
                    <p className="text-slate-600 text-sm sm:text-base leading-relaxed mt-2">
                      Sắp xếp đúng quy chuẩn từ trên xuống dưới nhằm triệt tiêu hoàn toàn rủi ro nước tiết từ thịt sống rò rỉ xuống các thực phẩm chín ăn liền.
                    </p>
                  </div>

                  {/* Fridge Stack Visualization */}
                  <div className="space-y-3">
                    <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-start gap-4">
                      <div className="w-8 h-8 rounded-xl bg-emerald-600 text-white font-black text-sm flex items-center justify-center shrink-0">
                        1
                      </div>
                      <div>
                        <h4 className="text-sm font-extrabold text-emerald-950">Ngăn trên cùng: Thực phẩm ăn liền &amp; Đã nấu chín</h4>
                        <p className="text-xs text-emerald-900/80 mt-0.5">Thức ăn chín, salad đã trộn, bánh ngọt, sữa chua, phô mai và thực phẩm hộp kín.</p>
                      </div>
                    </div>

                    <div className="p-4 rounded-2xl bg-blue-50 border border-blue-200 flex items-start gap-4">
                      <div className="w-8 h-8 rounded-xl bg-blue-600 text-white font-black text-sm flex items-center justify-center shrink-0">
                        2
                      </div>
                      <div>
                        <h4 className="text-sm font-extrabold text-blue-950">Ngăn giữa: Thủy hải sản &amp; Thịt nguyên khối tươi</h4>
                        <p className="text-xs text-blue-900/80 mt-0.5">Cá fillet, tôm, mực, bít tết bò đã sơ chế trong khay lót có nắp đậy.</p>
                      </div>
                    </div>

                    <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 flex items-start gap-4">
                      <div className="w-8 h-8 rounded-xl bg-amber-600 text-white font-black text-sm flex items-center justify-center shrink-0">
                        3
                      </div>
                      <div>
                        <h4 className="text-sm font-extrabold text-amber-950">Ngăn kế dưới: Thịt xay &amp; Trứng tươi</h4>
                        <p className="text-xs text-amber-900/80 mt-0.5">Thịt bò/heo xay nhuyễn, hỗn hợp thịt viên sơ chế cần nấu kỹ.</p>
                      </div>
                    </div>

                    <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 flex items-start gap-4">
                      <div className="w-8 h-8 rounded-xl bg-rose-600 text-white font-black text-sm flex items-center justify-center shrink-0">
                        4
                      </div>
                      <div>
                        <h4 className="text-sm font-extrabold text-rose-950">Ngăn dưới cùng: Thịt gia cầm sống (Gà, Vịt)</h4>
                        <p className="text-xs text-rose-900/80 mt-0.5">Nguy cơ nhiễm Salmonella cao nhất; bắt buộc đặt đáy tủ để ngăn nước tiết rớt xuống.</p>
                      </div>
                    </div>
                  </div>

                  {/* FIFO / FEFO Principles */}
                  <div className="p-5 bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
                    <h4 className="text-sm font-black uppercase text-slate-800">Quy tắc FIFO (First In - First Out) &amp; FEFO (First Expired - First Out)</h4>
                    <p className="text-xs text-slate-600 leading-relaxed">
                      Luôn dán nhãn ngày nhận hàng, ngày mở bao bì và hạn sử dụng trên mọi khay chứa. Xếp hàng mới nhập vào phía sau, kéo hàng cũ/hạn gần ra phía trước để sử dụng trước.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* 3. NHIỆT ĐỘ ĐUN NẤU */}
            {activeTab === 'cooking' && (
              <div className="space-y-8 animate-fade-in">
                <div className="bg-white rounded-3xl p-6 sm:p-10 border border-slate-200/80 shadow-sm space-y-6">
                  <div>
                    <span className="text-[11px] font-black uppercase tracking-wider text-[#007c76]">Chuyên đề 03</span>
                    <h2 className="text-2xl sm:text-3xl font-black text-slate-900 uppercase tracking-tight mt-1">
                      Nhiệt Độ Đun Nấu Cốt Lõi (Internal Cooking Core Temp)
                    </h2>
                    <p className="text-slate-600 text-sm sm:text-base leading-relaxed mt-2">
                      Đo bằng nhiệt kế xiên tâm tại điểm dày nhất của miếng thịt. Nhiệt độ tối thiểu phải duy trì trong ít nhất 15 giây.
                    </p>
                  </div>

                  <div className="overflow-x-auto rounded-2xl border border-slate-200">
                    <table className="w-full text-left text-xs sm:text-sm">
                      <thead className="bg-slate-100/80 text-slate-700 uppercase font-black text-[11px] border-b border-slate-200">
                        <tr>
                          <th className="py-3.5 px-4">Thực phẩm</th>
                          <th className="py-3.5 px-4">Nhiệt độ tối thiểu</th>
                          <th className="py-3.5 px-4">Lưu ý an toàn</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-slate-700 font-medium">
                        <tr className="hover:bg-slate-50/60">
                          <td className="py-3.5 px-4 font-bold text-slate-900">🍗 Gia cầm (Gà, Vịt, Ngỗng), Thịt nhồi, Thức ăn hâm nóng lại</td>
                          <td className="py-3.5 px-4 font-black text-[#007c76]">74°C (165°F)</td>
                          <td className="py-3.5 px-4 text-xs text-slate-500">Giữ ít nhất 15 giây; không ăn tái</td>
                        </tr>
                        <tr className="hover:bg-slate-50/60">
                          <td className="py-3.5 px-4 font-bold text-slate-900">🥩 Thịt xay (Heo xay, Bò xay), Xúc xích tươi</td>
                          <td className="py-3.5 px-4 font-black text-[#007c76]">68°C (155°F)</td>
                          <td className="py-3.5 px-4 text-xs text-slate-500">Vi khuẩn phân bố đều khắp khối thịt xay</td>
                        </tr>
                        <tr className="hover:bg-slate-50/60">
                          <td className="py-3.5 px-4 font-bold text-slate-900">🐟 Thủy hải sản (Cá, Tôm, Cua), Bít tết bò nguyên miếng</td>
                          <td className="py-3.5 px-4 font-black text-[#007c76]">63°C (145°F)</td>
                          <td className="py-3.5 px-4 text-xs text-slate-500">Thịt đục đều màu, vảy cá dễ tách rời</td>
                        </tr>
                        <tr className="hover:bg-slate-50/60">
                          <td className="py-3.5 px-4 font-bold text-slate-900">🍲 Rau củ quả nấu giữ nóng, Thức ăn giữ nhiệt buffet</td>
                          <td className="py-3.5 px-4 font-black text-[#007c76]">60°C (135°F)</td>
                          <td className="py-3.5 px-4 text-xs text-slate-500">Duy trì trên 60°C liên tục khi phục vụ</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* 4. QUY TẮC XỬ LÝ 4 BƯỚC */}
            {activeTab === 'handling' && (
              <div className="space-y-8 animate-fade-in">
                <div className="bg-white rounded-3xl p-6 sm:p-10 border border-slate-200/80 shadow-sm space-y-6">
                  <div>
                    <span className="text-[11px] font-black uppercase tracking-wider text-[#007c76]">Chuyên đề 04</span>
                    <h2 className="text-2xl sm:text-3xl font-black text-slate-900 uppercase tracking-tight mt-1">
                      Quy Tắc 4 Bước Cơ Bản Trong Bếp Vận Hành
                    </h2>
                    <p className="text-slate-600 text-sm sm:text-base leading-relaxed mt-2">
                      Chiến lược 4 phòng tuyến giúp cơ sở kinh doanh F&amp;B vượt qua mọi kỳ thanh kiểm tra của Ban Quản lý ATTP.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
                      <div className="w-8 h-8 rounded-lg bg-teal-600 text-white font-black text-xs flex items-center justify-center">1</div>
                      <h4 className="text-sm font-black text-slate-900">Làm Sạch (Clean)</h4>
                      <p className="text-xs text-slate-600 leading-relaxed">
                        Rửa tay tối thiểu 20 giây bằng xà phòng. Vệ sinh và khử trùng bề mặt thớt, dao và bàn chế biến trước và sau khi làm việc.
                      </p>
                    </div>

                    <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
                      <div className="w-8 h-8 rounded-lg bg-blue-600 text-white font-black text-xs flex items-center justify-center">2</div>
                      <h4 className="text-sm font-black text-slate-900">Tách Biệt (Separate)</h4>
                      <p className="text-xs text-slate-600 leading-relaxed">
                        Quy định thớt màu riêng: Thớt đỏ (Thịt sống), Thớt xanh lam (Hải sản sống), Thớt vàng (Thịt chín), Thớt xanh lá (Rau củ).
                      </p>
                    </div>

                    <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
                      <div className="w-8 h-8 rounded-lg bg-amber-600 text-white font-black text-xs flex items-center justify-center">3</div>
                      <h4 className="text-sm font-black text-slate-900">Nấu Chín (Cook)</h4>
                      <p className="text-xs text-slate-600 leading-relaxed">
                        Đảm bảo nhiệt độ tâm thực phẩm đạt chuẩn tối thiểu. Tuyệt đối không phục vụ thức ăn nấu chưa tới ngưỡng diệt khuẩn.
                      </p>
                    </div>

                    <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
                      <div className="w-8 h-8 rounded-lg bg-indigo-600 text-white font-black text-xs flex items-center justify-center">4</div>
                      <h4 className="text-sm font-black text-slate-900">Làm Lạnh (Chill)</h4>
                      <p className="text-xs text-slate-600 leading-relaxed">
                        Hạ nhiệt nhanh từ 60°C xuống 20°C trong 2 giờ và tiếp tục từ 20°C xuống dưới 5°C trong 4 giờ sau đó trước khi cất tủ.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* 5. 5 NGUYÊN TẮC WHO */}
            {activeTab === 'who5keys' && (
              <div className="space-y-8 animate-fade-in">
                <div className="bg-white rounded-3xl p-6 sm:p-10 border border-slate-200/80 shadow-sm space-y-6">
                  <div>
                    <span className="text-[11px] font-black uppercase tracking-wider text-[#007c76]">Chuyên đề 05</span>
                    <h2 className="text-2xl sm:text-3xl font-black text-slate-900 uppercase tracking-tight mt-1">
                      5 Chìa Khóa Vàng Của WHO (World Health Organization)
                    </h2>
                    <p className="text-slate-600 text-sm sm:text-base leading-relaxed mt-2">
                      Khuyến nghị toàn cầu về ngăn chặn các bệnh truyền nhiễm qua đường thực phẩm.
                    </p>
                  </div>

                  <div className="space-y-3.5">
                    {[
                      { num: 1, title: 'Giữ vệ sinh sạch sẽ', desc: 'Rửa tay thường xuyên, khử khuẩn bề mặt trang thiết bị và bảo vệ khu vực chế biến khỏi côn trùng gây hại.' },
                      { num: 2, title: 'Để riêng thực phẩm sống và chín', desc: 'Sử dụng bao bì và dụng cụ riêng biệt; không dùng chung dao thớt thái đồ sống cho đồ ăn ngay.' },
                      { num: 3, title: 'Nấu chín kỹ thức ăn', desc: 'Đun sôi súp và các món hầm đạt trên 70°C. Với thịt, đảm bảo nước thịt trong, không còn sắc đỏ hồng.' },
                      { num: 4, title: 'Bảo quản thực phẩm ở nhiệt độ an toàn', desc: 'Không để thức ăn ở nhiệt độ phòng quá 2 giờ. Bảo quản tủ lạnh dưới 5°C và giữ nóng trên 60°C.' },
                      { num: 5, title: 'Sử dụng nước và nguyên liệu an toàn', desc: 'Kiểm soát xuất xứ nguồn nguyên liệu có hóa đơn truy xuất; sử dụng nước sạch đạt QCVN ăn uống.' },
                    ].map((keyItem) => (
                      <div key={keyItem.num} className="p-4 rounded-2xl bg-teal-50/50 border border-teal-150 flex items-start gap-4">
                        <div className="w-8 h-8 rounded-xl bg-[#007c76] text-white font-black text-sm flex items-center justify-center shrink-0">
                          {keyItem.num}
                        </div>
                        <div>
                          <h4 className="text-sm font-extrabold text-slate-900">{keyItem.title}</h4>
                          <p className="text-xs text-slate-600 leading-relaxed mt-0.5">{keyItem.desc}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* 6. VỆ SINH & SSOP */}
            {activeTab === 'hygiene' && (
              <div className="space-y-8 animate-fade-in">
                <div className="bg-white rounded-3xl p-6 sm:p-10 border border-slate-200/80 shadow-sm space-y-6">
                  <div>
                    <span className="text-[11px] font-black uppercase tracking-wider text-[#007c76]">Chuyên đề 06</span>
                    <h2 className="text-2xl sm:text-3xl font-black text-slate-900 uppercase tracking-tight mt-1">
                      Quy Chuẩn Vệ Sinh Cơ Sở &amp; Cá Nhân (SSOP)
                    </h2>
                    <p className="text-slate-600 text-sm sm:text-base leading-relaxed mt-2">
                      Quy chuẩn kiểm soát vệ sinh môi trường làm việc, nguồn nước và sức khỏe nhân viên thao tác.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs sm:text-sm">
                    <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-1.5">
                      <span className="font-bold text-[#007c76]">1. Nước tiếp xúc thực phẩm:</span>
                      <p className="text-slate-600">Kiểm tra chỉ tiêu vi sinh và clo dư định kỳ theo quy chuẩn QCVN 01-1:2018/BYT.</p>
                    </div>

                    <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-1.5">
                      <span className="font-bold text-[#007c76]">2. Vệ sinh bề mặt tiếp xúc:</span>
                      <p className="text-slate-600">Làm sạch cơ học bằng chất tẩy rửa, xả nước sạch và khử trùng bằng dung dịch nồng độ chuẩn.</p>
                    </div>

                    <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-1.5">
                      <span className="font-bold text-[#007c76]">3. Ngăn ngừa nhiễm bẩn chéo:</span>
                      <p className="text-slate-600">Bố trí dòng di chuyển một chiều (One-way Flow) từ khu vực nguyên liệu thô đến thành phẩm.</p>
                    </div>

                    <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-1.5">
                      <span className="font-bold text-[#007c76]">4. Sức khỏe người thao tác:</span>
                      <p className="text-slate-600">Khám sức khỏe định kỳ; nhân viên có vết thương hở hoặc bệnh truyền nhiễm bắt buộc đổi vị trí.</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

          </div>
        </div>
      </section>
    </div>
  );
};

export default Handbook;
