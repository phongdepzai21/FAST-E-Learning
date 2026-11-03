import React, { useState, useMemo, useEffect } from 'react';
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
  Droplets,
  Printer,
  Refrigerator,
  UtensilsCrossed,
  FileText,
  BadgeCheck,
  Play,
  RotateCcw,
  ExternalLink,
  ChevronRight
} from 'lucide-react';
import { Link } from 'react-router-dom';

interface HandbookProps {
  embed?: boolean;
}

type TabType = 'temperature' | 'storage' | 'cooking' | 'handling' | 'who5keys' | 'hygiene';

const Handbook: React.FC<HandbookProps> = ({ embed }) => {
  const [activeTab, setActiveTab] = useState<TabType>('temperature');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Interactive Danger Zone Calculator
  const [testTemp, setTestTemp] = useState<number>(37);
  
  // Interactive Handwash Timer
  const [washTimeLeft, setWashTimeLeft] = useState<number>(20);
  const [isWashing, setIsWashing] = useState<boolean>(false);

  useEffect(() => {
    let interval: any = null;
    if (isWashing && washTimeLeft > 0) {
      interval = setInterval(() => {
        setWashTimeLeft(prev => prev - 1);
      }, 1000);
    } else if (washTimeLeft === 0) {
      setIsWashing(false);
    }
    return () => clearInterval(interval);
  }, [isWashing, washTimeLeft]);

  const startHandwashTimer = () => {
    setWashTimeLeft(20);
    setIsWashing(true);
  };

  const resetHandwashTimer = () => {
    setIsWashing(false);
    setWashTimeLeft(20);
  };

  // Refrigerator active tier state
  const [selectedFridgeTier, setSelectedFridgeTier] = useState<number>(1);

  // Cutting Board Color state
  const [selectedBoard, setSelectedBoard] = useState<'red' | 'blue' | 'yellow' | 'green' | 'white' | 'brown'>('red');

  const getTempStatus = (temp: number) => {
    if (temp < 0) {
      return {
        level: 'safe-freeze',
        badge: 'Đông đá an toàn',
        label: 'Ngăn đông an toàn (Dưới 0°C)',
        color: 'text-sky-700 bg-sky-50 border-sky-300 ring-1 ring-sky-300',
        advice: 'Vi khuẩn bị đóng băng và ngừng nhân bản hoàn toàn. Thời gian bảo quản thịt cá kéo dài từ 3 đến 6 tháng.',
        pathogen: 'Tất cả vi khuẩn rơi vào trạng thái ngủ đông, không sản sinh độc tố.',
        action: 'Duy trì nhiệt độ âm sâu ≤ -18°C cho kho lạnh công nghiệp.'
      };
    }
    if (temp >= 0 && temp <= 4) {
      return {
        level: 'safe-chill',
        badge: 'Ngăn mát tối ưu',
        label: 'Ngăn mát chuẩn HACCP (0°C - 4°C)',
        color: 'text-teal-800 bg-teal-50 border-teal-300 ring-1 ring-teal-300',
        advice: 'Nhiệt độ bảo quản lạnh tiêu chuẩn theo Codex. Tốc độ phân chia tế bào vi khuẩn cực kỳ chậm.',
        pathogen: 'Hầu hết vi khuẩn gây thối rữa bị ức chế, riêng Listeria monocytogenes có thể phát triển chậm.',
        action: 'Kiểm tra nhiệt độ tủ ít nhất 2 lần/ngày (ca sáng và ca chiều).'
      };
    }
    if (temp > 4 && temp < 60) {
      return {
        level: 'danger',
        badge: 'VÙNG NGUY HIỂM TỚI HẠN',
        label: 'VÙNG NGUY HIỂM TỚI HẠN (5°C - 60°C)',
        color: 'text-rose-700 bg-rose-50 border-rose-300 ring-2 ring-rose-400/50 animate-pulse',
        advice: 'Nhiệt độ kích hoạt nhân bản vi khuẩn bùng nổ! Số lượng vi sinh vật nhân đôi sau mỗi 20 phút.',
        pathogen: 'Salmonella, E. coli O157:H7, S. aureus, Bacillus cereus tiết ngoại độc tố gây nôn mửa cấp.',
        action: 'Áp dụng nghiêm ngặt quy tắc 2 giờ / 4 giờ. Tuyệt đối không để thức ăn nguội tự nhiên qua 2h.'
      };
    }
    return {
      level: 'safe-hot',
      badge: 'Giữ nóng an toàn',
      label: 'Giữ nóng phục vụ an toàn (Trên 60°C)',
      color: 'text-amber-800 bg-amber-50 border-amber-300 ring-1 ring-amber-300',
      advice: 'Thực phẩm giữ nóng trên bàn buffet hoặc tủ giữ nhiệt. Đạt tiêu chuẩn an toàn vi sinh.',
      pathogen: 'Vi khuẩn sinh dưỡng bị tiêu diệt hoặc không có khả năng nhân bản.',
      action: 'Duy trì nhiệt độ hâm nóng liên tục ≥ 60°C, khuấy đều định kỳ để nhiệt phân bổ đồng đều.'
    };
  };

  const currentStatus = getTempStatus(testTemp);

  const navItems = [
    { id: 'temperature', label: 'Vùng nhiệt độ nguy hiểm', icon: Thermometer, badge: 'Cốt lõi' },
    { id: 'storage', label: 'Phân tầng tủ lạnh & FIFO', icon: Refrigerator, badge: 'Kho lạnh' },
    { id: 'cooking', label: 'Nhiệt độ đun nấu cốt lõi', icon: Target, badge: 'Chế biến' },
    { id: 'handling', label: 'Quy tắc 4 bước an toàn', icon: UtensilsCrossed, badge: 'Sơ chế' },
    { id: 'who5keys', label: '5 Chìa khóa vàng WHO', icon: ShieldCheck, badge: 'Tiêu chuẩn' },
    { id: 'hygiene', label: 'Vệ sinh & SSOP kiểm soát', icon: Droplets, badge: 'Vệ sinh' },
  ];

  const boardConfigs = {
    red: {
      colorName: 'Đỏ (Red)',
      bgColor: 'bg-rose-600',
      textColor: 'text-rose-700',
      badgeBg: 'bg-rose-100 text-rose-800 border-rose-200',
      target: 'Thịt đỏ tươi sống (Bò, Heo, Cừu)',
      rules: 'Dùng dao thái riêng; vệ sinh và khử trùng bề mặt ngay sau khi sơ chế trước khi chuyển công đoạn.'
    },
    blue: {
      colorName: 'Xanh lam (Blue)',
      bgColor: 'bg-blue-600',
      textColor: 'text-blue-700',
      badgeBg: 'bg-blue-100 text-blue-800 border-blue-200',
      target: 'Thủy hải sản tươi sống (Cá, Tôm, Mực, Cua)',
      rules: 'Nguy cơ chứa vi khuẩn Vibrio parahaemolyticus và dị nguyên hải sản. Không dùng chung với thịt gia súc.'
    },
    yellow: {
      colorName: 'Vàng (Yellow)',
      bgColor: 'bg-amber-400',
      textColor: 'text-amber-800',
      badgeBg: 'bg-amber-100 text-amber-900 border-amber-200',
      target: 'Thịt gia cầm sống (Gà, Vịt, Ngan)',
      rules: 'Nguy cơ Salmonella và Campylobacter cao nhất. Bắt buộc để thớt tại khu sơ chế gia cầm chuyên biệt.'
    },
    green: {
      colorName: 'Xanh lá (Green)',
      bgColor: 'bg-emerald-600',
      textColor: 'text-emerald-700',
      badgeBg: 'bg-emerald-100 text-emerald-800 border-emerald-200',
      target: 'Rau củ quả tươi & Salad ăn sống',
      rules: 'Dùng cho thực phẩm không gia nhiệt lại. Dụng cụ phải vô trùng tuyệt đối để không lây nhiễm vi sinh.'
    },
    white: {
      colorName: 'Trắng (White)',
      bgColor: 'bg-slate-200',
      textColor: 'text-slate-700',
      badgeBg: 'bg-slate-100 text-slate-800 border-slate-300',
      target: 'Thực phẩm chín ăn liền, Bánh mì, Phô mai',
      rules: 'Dùng cho đồ ăn sẵn phục vụ trực tiếp cho khách. Nhân viên bắt buộc đeo găng tay khi thao tác.'
    },
    brown: {
      colorName: 'Nâu (Brown)',
      bgColor: 'bg-amber-800',
      textColor: 'text-amber-900',
      badgeBg: 'bg-amber-100 text-amber-900 border-amber-300',
      target: 'Thịt đã nấu chín (Bò kho, Heo quay, Gà luộc)',
      rules: 'Phân định riêng với thớt trắng để tránh lây nhiễm chéo giữa món mặn và món tráng miệng.'
    }
  };

  const fridgeTiers = [
    {
      tier: 1,
      name: 'Tầng 1 (Trên cùng)',
      category: 'Thực phẩm ăn liền & Đã chế biến chín',
      temp: '1°C - 3°C',
      items: ['Thức ăn nấu chín đóng hộp', 'Salad trộn sẵn', 'Bánh kem, phô mai, sữa chua', 'Nước sốt đã nấu'],
      criticalReason: 'Không có thực phẩm tươi sống nào phía trên có thể nhỏ giọt xuống làm bẩn đồ chín.',
      badgeClass: 'bg-emerald-100 text-emerald-800 border-emerald-200'
    },
    {
      tier: 2,
      name: 'Tầng 2 (Ngăn giữa trên)',
      category: 'Thủy hải sản tươi sống nguyên con / fillet',
      temp: '0°C - 2°C',
      items: ['Cá hồi fillet', 'Tôm sú tươi khay đậy', 'Mực ống đã làm sạch', 'Ngao, sò, ốc'],
      criticalReason: 'Hải sản có nhiệt độ nấu an toàn thấp nhất (63°C), đặt trên các loại thịt cần nhiệt độ cao hơn.',
      badgeClass: 'bg-sky-100 text-sky-800 border-sky-200'
    },
    {
      tier: 3,
      name: 'Tầng 3 (Ngăn giữa dưới)',
      category: 'Thịt gia súc nguyên khối (Bò, Heo)',
      temp: '1°C - 3°C',
      items: ['Bít tết bò', 'Thịt thăn heo', 'Sườn cừu tươi', 'Thịt tẩm ướp sơ chế'],
      criticalReason: 'Nhiệt độ nấu an toàn 63°C - 68°C. Khay chứa có rãnh hứng nước tiết tránh tràn.',
      badgeClass: 'bg-blue-100 text-blue-800 border-blue-200'
    },
    {
      tier: 4,
      name: 'Tầng 4 (Ngăn gần đáy)',
      category: 'Thịt xay nhuyễn & Trứng tươi',
      temp: '0°C - 2°C',
      items: ['Bò xay làm burger', 'Thịt heo xay làm nem', 'Trứng gà tươi nguyên vỏ'],
      criticalReason: 'Thịt xay có diện tích bề mặt nhiễm khuẩn lớn, cần nhiệt nấu 68°C - 71°C.',
      badgeClass: 'bg-amber-100 text-amber-800 border-amber-200'
    },
    {
      tier: 5,
      name: 'Tầng 5 (Đáy tủ lạnh)',
      category: 'Thịt gia cầm sống (Gà, Vịt, Ngan)',
      temp: '0°C - 2°C',
      items: ['Gà nguyên con tươi', 'Đùi cánh gà sống', 'Vịt làm sạch', 'Gia cầm ướp sẵn'],
      criticalReason: 'Nguy cơ cao nhất về Salmonella & Campylobacter (nhiệt độ nấu 74°C). Đặt đáy tủ để nước tiết không thể rơi xuống bất cứ món nào.',
      badgeClass: 'bg-rose-100 text-rose-800 border-rose-200'
    }
  ];

  return (
    <div className={embed ? "bg-[#f8fafc]" : "min-h-screen bg-[#f8fafc] font-sans text-slate-800"}>
      <Helmet>
        <title>Cẩm Nang An Toàn Thực Phẩm Thực Chiến | FAST E-Learning</title>
        <meta name="description" content="Cẩm nang thực hành an toàn thực phẩm: vùng nhiệt độ nguy hiểm, nhiệt độ tâm đun nấu, phân tầng tủ lạnh chuẩn HACCP/FIFO và 5 chìa khóa vàng WHO." />
      </Helmet>

      {/* Hero Header Banner */}
      {!embed && (
        <section className="relative pt-16 pb-20 md:pb-28 bg-gradient-to-br from-[#004f4a] via-[#006e67] to-[#007c76] text-white overflow-hidden shadow-xl">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(255,255,255,0.15),transparent_40%)] pointer-events-none" />
          <div className="absolute -bottom-24 -right-24 w-96 h-96 bg-teal-400/10 rounded-full blur-3xl pointer-events-none" />

          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 text-center">
            <div className="flex justify-center mb-6">
              <Breadcrumbs theme="light" items={[{ label: 'Trang chủ', path: '/' }, { label: 'Cẩm nang ATTP' }]} />
            </div>

            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/15 backdrop-blur-md border border-white/25 text-xs font-black uppercase tracking-widest mb-6 shadow-sm">
              <Sparkles className="w-4 h-4 text-yellow-300" />
              <span>Sổ Tay Kỹ Thuật An Toàn &amp; Kiểm Soát Chất Lượng F&amp;B</span>
            </div>

            <h1 className="text-3xl sm:text-5xl md:text-6xl font-black uppercase tracking-tight mb-4 leading-tight">
              Cẩm Nang <span className="text-yellow-300">An Toàn Thực Phẩm</span>
            </h1>

            <p className="text-sm sm:text-base md:text-lg text-teal-100 max-w-2xl mx-auto font-medium leading-relaxed mb-8">
              Bộ quy chuẩn thực chiến về kiểm soát nhiệt độ lõi, phân tầng kho lạnh, sơ chế dao thớt một chiều và phòng ngừa ngộ độc theo tiêu chuẩn WHO &amp; CODEX.
            </p>

            {/* Quick Stat Highlights */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 max-w-4xl mx-auto pt-2">
              <div className="bg-white/10 backdrop-blur-md rounded-2xl p-3.5 border border-white/15">
                <span className="block text-2xl font-black text-yellow-300">5°C - 60°C</span>
                <span className="text-[11px] font-bold text-teal-100 uppercase tracking-wider">Vùng nhiệt nguy hiểm</span>
              </div>
              <div className="bg-white/10 backdrop-blur-md rounded-2xl p-3.5 border border-white/15">
                <span className="block text-2xl font-black text-white">74°C / 15s</span>
                <span className="text-[11px] font-bold text-teal-100 uppercase tracking-wider">Nhiệt tâm gia cầm</span>
              </div>
              <div className="bg-white/10 backdrop-blur-md rounded-2xl p-3.5 border border-white/15">
                <span className="block text-2xl font-black text-yellow-300">2h / 4h</span>
                <span className="text-[11px] font-bold text-teal-100 uppercase tracking-wider">Quy tắc vàng hủy bỏ</span>
              </div>
              <div className="bg-white/10 backdrop-blur-md rounded-2xl p-3.5 border border-white/15">
                <span className="block text-2xl font-black text-white">6 Màu Thớt</span>
                <span className="text-[11px] font-bold text-teal-100 uppercase tracking-wider">Chuẩn hóa màu HACCP</span>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Navigation Pills Bar */}
      <section className="sticky top-20 z-30 bg-white/95 backdrop-blur-md border-b border-slate-200/80 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5">
          <div className="flex items-center justify-between gap-4">
            <div className="flex overflow-x-auto no-scrollbar gap-2 py-1 flex-1">
              {navItems.map((item) => {
                const isActive = activeTab === item.id;
                const Icon = item.icon;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setActiveTab(item.id as any)}
                    className={`whitespace-nowrap px-4 py-2.5 rounded-2xl font-bold text-xs uppercase tracking-wider transition-all duration-200 flex items-center gap-2 cursor-pointer border ${
                      isActive
                        ? 'bg-[#007c76] text-white border-[#007c76] shadow-md shadow-teal-900/15 scale-[1.02]'
                        : 'bg-slate-100 hover:bg-slate-200/70 text-slate-700 border-transparent hover:text-slate-900'
                    }`}
                  >
                    <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-[#007c76]'}`} />
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </div>

            <button
              onClick={() => window.print()}
              className="hidden lg:flex items-center gap-1.5 px-3.5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-2xl text-xs font-black uppercase tracking-wider transition cursor-pointer border border-slate-200/80"
              title="In sổ tay cẩm nang"
            >
              <Printer className="w-4 h-4 text-slate-600" />
              <span>In Sổ Tay</span>
            </button>
          </div>
        </div>
      </section>

      {/* Main Content Area */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-12 space-y-12">

        {/* 1. CHUYÊN ĐỀ 01: VÙNG NHIỆT ĐỘ NGUY HIỂM */}
        {activeTab === 'temperature' && (
          <div className="space-y-8 animate-fade-in">
            <div className="bg-white rounded-[32px] p-6 sm:p-10 border border-slate-200/80 shadow-sm space-y-8">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-6">
                <div>
                  <span className="inline-block px-3 py-1 bg-teal-50 text-[#007c76] border border-teal-200 rounded-lg text-[11px] font-black uppercase tracking-wider mb-2">
                    Chuyên đề 01 • Trọng tâm kiểm soát vi sinh
                  </span>
                  <h2 className="text-2xl sm:text-3xl font-black text-slate-900 uppercase tracking-tight">
                    Vùng Nhiệt Độ Nguy Hiểm (The Danger Zone: 5°C - 60°C)
                  </h2>
                  <p className="text-slate-600 text-sm sm:text-base leading-relaxed mt-1">
                    Tại khoảng nhiệt độ từ 5°C đến 60°C, các chủng vi khuẩn nguy hiểm nhất (Salmonella, E. coli, Bacillus cereus, S. aureus) sinh sôi và nhân đôi số lượng bùng nổ theo cấp số nhân sau mỗi 20 phút.
                  </p>
                </div>
              </div>

              {/* Interactive Danger Zone Tester */}
              <div className="bg-gradient-to-br from-slate-50 to-teal-50/40 rounded-3xl p-6 sm:p-8 border border-slate-200 space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-10 h-10 rounded-2xl bg-[#007c76] text-white flex items-center justify-center shadow-md">
                      <Thermometer className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-sm font-black text-slate-900 uppercase tracking-wide">
                        Bộ Thử Nghiệm Tương Tác Nhiệt Độ Thực Phẩm
                      </h3>
                      <p className="text-xs text-slate-500 font-medium">Kéo thanh trượt để kiểm tra mức độ an toàn và hành động khắc phục</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 bg-white px-4 py-2 rounded-2xl border border-slate-200 shadow-2xs">
                    <span className="text-xs font-bold text-slate-500 uppercase">Nhiệt độ đo:</span>
                    <span className="text-xl font-black text-[#007c76] font-mono">{testTemp}°C</span>
                    <span className="text-xs font-semibold text-slate-400">({(testTemp * 9/5 + 32).toFixed(1)}°F)</span>
                  </div>
                </div>

                {/* Slider */}
                <div className="space-y-2">
                  <div className="relative">
                    <input 
                      type="range" 
                      min="-20" 
                      max="100" 
                      value={testTemp} 
                      onChange={(e) => setTestTemp(Number(e.target.value))}
                      className="w-full h-3 bg-gradient-to-r from-sky-400 via-teal-400 via-rose-500 to-amber-500 rounded-lg appearance-none cursor-pointer accent-[#007c76]"
                    />
                  </div>
                  <div className="flex justify-between text-[11px] font-black text-slate-400 uppercase tracking-wider px-1">
                    <span>-20°C (Đông đá)</span>
                    <span className="text-teal-700 font-black">0°C - 4°C (Mát)</span>
                    <span className="text-rose-600 font-black">5°C - 60°C (NGUY HIỂM)</span>
                    <span className="text-amber-700 font-black">&gt;60°C (Giữ nóng)</span>
                    <span>100°C (Sôi)</span>
                  </div>
                </div>

                {/* Status Box Card */}
                <div className={`p-5 rounded-2xl border ${currentStatus.color} space-y-2.5 transition-all duration-300`}>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black uppercase tracking-widest">{currentStatus.badge}</span>
                    <span className="text-xs font-bold text-slate-600 font-mono">Trạng thái: {currentStatus.label}</span>
                  </div>
                  <p className="text-sm font-bold text-slate-800 leading-snug">
                    {currentStatus.advice}
                  </p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2 text-xs border-t border-black/10">
                    <div>
                      <strong className="block text-slate-900 font-black uppercase text-[10px]">Cảnh báo vi sinh:</strong>
                      <span className="text-slate-700 font-medium">{currentStatus.pathogen}</span>
                    </div>
                    <div>
                      <strong className="block text-slate-900 font-black uppercase text-[10px]">Hành động vận hành:</strong>
                      <span className="text-slate-700 font-medium">{currentStatus.action}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* 2h / 4h Golden Rule Infographic */}
              <div className="space-y-4 pt-2">
                <div className="flex items-center gap-2">
                  <Clock className="w-5 h-5 text-[#007c76]" />
                  <h3 className="text-lg font-black text-slate-900 uppercase tracking-tight">
                    Quy Tắc Vàng 2 Giờ / 4 Giờ (The 2-Hour / 4-Hour Rule)
                  </h3>
                </div>
                <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                  Khi thực phẩm giàu đạm hoặc thức ăn đã nấu chín rơi vào vùng nguy hiểm (5°C - 60°C), nhân viên bếp bắt buộc áp dụng mốc thời gian sau để đưa ra quyết định xử lý:
                </p>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                  <div className="p-6 rounded-3xl bg-teal-50 border border-teal-200/80 space-y-3 relative overflow-hidden">
                    <div className="w-10 h-10 rounded-2xl bg-teal-600 text-white font-black text-sm flex items-center justify-center">
                      &lt;2h
                    </div>
                    <h4 className="text-base font-black text-teal-950 uppercase">Dưới 2 Giờ</h4>
                    <p className="text-xs text-teal-900/90 font-medium leading-relaxed">
                      Thực phẩm an toàn để <strong>sử dụng ngay</strong> hoặc <strong>làm lạnh trở lại</strong> xuống dưới 5°C để lưu trữ dùng tiếp.
                    </p>
                    <div className="text-[10px] font-black uppercase text-teal-800 bg-teal-100/80 px-2.5 py-1 rounded-md inline-block">
                      ✓ Đạt chuẩn tiếp tục lưu
                    </div>
                  </div>

                  <div className="p-6 rounded-3xl bg-amber-50 border border-amber-200/80 space-y-3 relative overflow-hidden">
                    <div className="w-10 h-10 rounded-2xl bg-amber-600 text-white font-black text-sm flex items-center justify-center">
                      2-4h
                    </div>
                    <h4 className="text-base font-black text-amber-950 uppercase">Từ 2 Đến 4 Giờ</h4>
                    <p className="text-xs text-amber-900/90 font-medium leading-relaxed">
                      Bắt buộc phải <strong>sử dụng hoặc phục vụ ngay lập tức</strong>. Tuyệt đối <strong>không được phép</strong> tái cấp đông hoặc cất lại vào tủ lạnh.
                    </p>
                    <div className="text-[10px] font-black uppercase text-amber-800 bg-amber-100/80 px-2.5 py-1 rounded-md inline-block">
                      ⚠️ Phục vụ ngay • Cấm cất lại
                    </div>
                  </div>

                  <div className="p-6 rounded-3xl bg-rose-50 border border-rose-200/80 space-y-3 relative overflow-hidden">
                    <div className="w-10 h-10 rounded-2xl bg-rose-600 text-white font-black text-sm flex items-center justify-center">
                      &gt;4h
                    </div>
                    <h4 className="text-base font-black text-rose-950 uppercase">Trên 4 Giờ</h4>
                    <p className="text-xs text-rose-900/90 font-medium leading-relaxed">
                      <strong>Bắt buộc tiêu hủy ngay lập tức</strong> vào thùng rác hữu cơ. Vi khuẩn đã sinh sản và tiết độc tố bền nhiệt (nấu sôi lại vẫn gây ngộ độc).
                    </p>
                    <div className="text-[10px] font-black uppercase text-rose-800 bg-rose-100/80 px-2.5 py-1 rounded-md inline-block">
                      ❌ Tiêu hủy bắt buộc
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 2. CHUYÊN ĐỀ 02: PHÂN TẦNG TỦ LẠNH & FIFO */}
        {activeTab === 'storage' && (
          <div className="space-y-8 animate-fade-in">
            <div className="bg-white rounded-[32px] p-6 sm:p-10 border border-slate-200/80 shadow-sm space-y-8">
              <div>
                <span className="inline-block px-3 py-1 bg-teal-50 text-[#007c76] border border-teal-200 rounded-lg text-[11px] font-black uppercase tracking-wider mb-2">
                  Chuyên đề 02 • Kiểm soát kho lạnh
                </span>
                <h2 className="text-2xl sm:text-3xl font-black text-slate-900 uppercase tracking-tight">
                  Nguyên Tắc Phân Tầng Tủ Lạnh 5 Tầng &amp; Quản Lý FIFO
                </h2>
                <p className="text-slate-600 text-sm sm:text-base leading-relaxed mt-1">
                  Xếp thực phẩm đúng thứ tự từ trên xuống dưới dựa theo <strong>nhiệt độ nấu chín an toàn tối thiểu</strong> để triệt tiêu hoàn toàn rủi ro nước thịt sống nhỏ giọt làm ô nhiễm thức ăn chín.
                </p>
              </div>

              {/* Interactive Fridge Visualizer */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                <div className="lg:col-span-6 space-y-3">
                  <div className="text-xs font-black uppercase tracking-wider text-slate-400 px-1">
                    Nhấp chọn từng tầng để xem chi tiết lưu trữ:
                  </div>

                  {fridgeTiers.map((tier) => {
                    const isSelected = selectedFridgeTier === tier.tier;
                    return (
                      <div
                        key={tier.tier}
                        onClick={() => setSelectedFridgeTier(tier.tier)}
                        className={`p-4 rounded-2xl border-2 transition-all cursor-pointer flex items-center justify-between gap-3 ${
                          isSelected
                            ? 'border-[#007c76] bg-teal-50/60 shadow-md scale-[1.01]'
                            : 'border-slate-200 hover:border-teal-200 bg-white hover:bg-slate-50'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div className={`w-8 h-8 rounded-xl font-black text-xs flex items-center justify-center shrink-0 ${
                            isSelected ? 'bg-[#007c76] text-white' : 'bg-slate-100 text-slate-700'
                          }`}>
                            {tier.tier}
                          </div>
                          <div>
                            <div className="text-xs font-bold text-slate-400 uppercase">{tier.name}</div>
                            <div className="text-sm font-black text-slate-900">{tier.category}</div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <span className="text-xs font-mono font-bold text-[#007c76] bg-white px-2 py-0.5 rounded-md border border-slate-200 shrink-0">
                            {tier.temp}
                          </span>
                          <ChevronRight className={`w-4 h-4 text-slate-400 transition-transform ${isSelected ? 'translate-x-1 text-[#007c76]' : ''}`} />
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Fridge Tier Details Display */}
                <div className="lg:col-span-6 bg-slate-50 rounded-3xl p-6 sm:p-8 border border-slate-200 space-y-5">
                  {(() => {
                    const activeTier = fridgeTiers.find(t => t.tier === selectedFridgeTier) || fridgeTiers[0];
                    return (
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <span className={`text-[10px] font-black uppercase px-2.5 py-1 rounded-lg border ${activeTier.badgeClass}`}>
                            {activeTier.name}
                          </span>
                          <span className="text-xs font-mono font-black text-[#007c76]">Nhiệt độ: {activeTier.temp}</span>
                        </div>

                        <h3 className="text-xl font-black text-slate-900 leading-snug">
                          {activeTier.category}
                        </h3>

                        <div className="space-y-2">
                          <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Thực phẩm cho phép đặt tại tầng này:</span>
                          <ul className="space-y-1.5">
                            {activeTier.items.map((item, idx) => (
                              <li key={idx} className="flex items-center gap-2 text-xs font-bold text-slate-700 bg-white p-2.5 rounded-xl border border-slate-200/80">
                                <span className="w-1.5 h-1.5 rounded-full bg-[#007c76]" />
                                <span>{item}</span>
                              </li>
                            ))}
                          </ul>
                        </div>

                        <div className="p-4 bg-teal-50/70 border border-teal-200 rounded-2xl text-xs space-y-1">
                          <strong className="text-[#007c76] font-black uppercase text-[10px] block">Lý do kỹ thuật bắt buộc:</strong>
                          <p className="text-slate-700 font-semibold leading-relaxed">
                            {activeTier.criticalReason}
                          </p>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              </div>

              {/* FIFO & FEFO Principles */}
              <div className="p-6 bg-teal-50/60 rounded-3xl border border-teal-200/80 space-y-3">
                <div className="flex items-center gap-2 text-teal-900 font-black text-sm uppercase">
                  <Layers className="w-4 h-4 text-[#007c76]" />
                  <span>Quy Tắc Quản Trị Hàng Hóa: FIFO (Nhập Trước - Xuất Trước) &amp; FEFO (Hết Hạn Trước - Xuất Trước)</span>
                </div>
                <p className="text-xs sm:text-sm text-slate-700 font-medium leading-relaxed">
                  Mọi hộp thực phẩm bảo quản trong kho lạnh phải được dán nhãn 3 thông tin bắt buộc: <strong>Tên thực phẩm</strong>, <strong>Ngày giờ nhập/mở bao bì</strong>, và <strong>Hạn sử dụng tối đa</strong>. Hàng mới nhập luôn xếp ở phía trong, hàng cũ kéo ra phía ngoài để nhân viên sử dụng trước.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* 3. CHUYÊN ĐỀ 03: NHIỆT ĐỘ ĐUN NẤU */}
        {activeTab === 'cooking' && (
          <div className="space-y-8 animate-fade-in">
            <div className="bg-white rounded-[32px] p-6 sm:p-10 border border-slate-200/80 shadow-sm space-y-8">
              <div>
                <span className="inline-block px-3 py-1 bg-teal-50 text-[#007c76] border border-teal-200 rounded-lg text-[11px] font-black uppercase tracking-wider mb-2">
                  Chuyên đề 03 • Tiêu chuẩn nhiệt tâm
                </span>
                <h2 className="text-2xl sm:text-3xl font-black text-slate-900 uppercase tracking-tight">
                  Nhiệt Độ Đun Nấu Cốt Lõi (Minimum Internal Cooking Core Temp)
                </h2>
                <p className="text-slate-600 text-sm sm:text-base leading-relaxed mt-1">
                  Đo bằng nhiệt kế xiên tâm vô trùng cắm sâu vào tâm hình học (điểm dày nhất) của khối thực phẩm. Nhiệt độ tối thiểu phải được duy trì liên tục trong ít nhất <strong>15 giây</strong>.
                </p>
              </div>

              <div className="overflow-x-auto rounded-3xl border border-slate-200 shadow-2xs">
                <table className="w-full text-left text-xs sm:text-sm">
                  <thead className="bg-slate-100/80 text-slate-700 uppercase font-black text-[11px] border-b border-slate-200">
                    <tr>
                      <th className="py-4 px-5">Loại Thực Phẩm</th>
                      <th className="py-4 px-5">Nhiệt Độ Tâm Tối Thiểu</th>
                      <th className="py-4 px-5">Thời Gian Giữ Nhiệt</th>
                      <th className="py-4 px-5">Cảm Quan Kiểm Chứng</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700 font-medium">
                    <tr className="hover:bg-teal-50/30 transition">
                      <td className="py-4 px-5 font-bold text-slate-900 flex items-center gap-2">
                        <span className="text-xl">🍗</span>
                        <span>Gia cầm (Gà, Vịt, Ngan), Đồ nhồi thịt, Thức ăn hâm nóng lại</span>
                      </td>
                      <td className="py-4 px-5 font-black text-rose-600 text-base">74°C (165°F)</td>
                      <td className="py-4 px-5 font-semibold text-slate-500">Giữ ≥ 15 giây</td>
                      <td className="py-4 px-5 text-xs text-slate-600">Nước thịt trong suốt, xương không ứa huyết</td>
                    </tr>
                    <tr className="hover:bg-teal-50/30 transition">
                      <td className="py-4 px-5 font-bold text-slate-900 flex items-center gap-2">
                        <span className="text-xl">🥩</span>
                        <span>Thịt xay nhuyễn (Bò xay, Heo xay), Xúc xích tươi</span>
                      </td>
                      <td className="py-4 px-5 font-black text-amber-600 text-base">68°C (155°F)</td>
                      <td className="py-4 px-5 font-semibold text-slate-500">Giữ ≥ 15 giây</td>
                      <td className="py-4 px-5 text-xs text-slate-600">Thịt chuyển màu nâu đều, không còn vân hồng</td>
                    </tr>
                    <tr className="hover:bg-teal-50/30 transition">
                      <td className="py-4 px-5 font-bold text-slate-900 flex items-center gap-2">
                        <span className="text-xl">🐟</span>
                        <span>Thủy hải sản (Cá, Tôm, Cua, Mực), Thịt gia súc nguyên miếng</span>
                      </td>
                      <td className="py-4 px-5 font-black text-[#007c76] text-base">63°C (145°F)</td>
                      <td className="py-4 px-5 font-semibold text-slate-500">Giữ ≥ 15 giây</td>
                      <td className="py-4 px-5 text-xs text-slate-600">Thịt cá đục đều màu, thớ thịt tách rời tự nhiên</td>
                    </tr>
                    <tr className="hover:bg-teal-50/30 transition">
                      <td className="py-4 px-5 font-bold text-slate-900 flex items-center gap-2">
                        <span className="text-xl">🍲</span>
                        <span>Thực phẩm giữ nóng phục vụ tiệc buffet</span>
                      </td>
                      <td className="py-4 px-5 font-black text-emerald-600 text-base">≥ 60°C (135°F)</td>
                      <td className="py-4 px-5 font-semibold text-slate-500">Duy trì liên tục</td>
                      <td className="py-4 px-5 text-xs text-slate-600">Khuấy đều, kiểm tra nhiệt kế định kỳ mỗi 2h</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* 4. CHUYÊN ĐỀ 04: QUY TẮC 4 BƯỚC & BỘ THỚT 6 MÀU */}
        {activeTab === 'handling' && (
          <div className="space-y-8 animate-fade-in">
            <div className="bg-white rounded-[32px] p-6 sm:p-10 border border-slate-200/80 shadow-sm space-y-8">
              <div>
                <span className="inline-block px-3 py-1 bg-teal-50 text-[#007c76] border border-teal-200 rounded-lg text-[11px] font-black uppercase tracking-wider mb-2">
                  Chuyên đề 04 • Quy tắc vận hành sơ chế
                </span>
                <h2 className="text-2xl sm:text-3xl font-black text-slate-900 uppercase tracking-tight">
                  Quy Chuẩn Thớt 6 Màu HACCP &amp; 4 Tuyến Phòng Vệ Bếp
                </h2>
                <p className="text-slate-600 text-sm sm:text-base leading-relaxed mt-1">
                  Mỗi màu thớt chuyên dụng cho một nhóm thực phẩm nhất định để ngăn ngừa <strong>nhiễm khuẩn chéo (Cross-Contamination)</strong> giữa đồ sống và đồ ăn chín.
                </p>
              </div>

              {/* Cutting Board Color Selector */}
              <div className="space-y-4">
                <span className="text-xs font-black uppercase tracking-wider text-slate-400">
                  Chọn màu thớt để xem quy định phân công thực phẩm:
                </span>

                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                  {(Object.keys(boardConfigs) as Array<keyof typeof boardConfigs>).map((key) => {
                    const cfg = boardConfigs[key];
                    const isSelected = selectedBoard === key;
                    return (
                      <button
                        key={key}
                        onClick={() => setSelectedBoard(key)}
                        className={`p-3.5 rounded-2xl border-2 text-center transition-all cursor-pointer flex flex-col items-center gap-2 ${
                          isSelected
                            ? 'border-[#007c76] bg-teal-50 shadow-md scale-105'
                            : 'border-slate-200 hover:border-slate-300 bg-white'
                        }`}
                      >
                        <div className={`w-10 h-7 rounded-lg shadow-sm border border-black/10 ${cfg.bgColor}`} />
                        <span className="text-xs font-black text-slate-800 uppercase">{cfg.colorName}</span>
                      </button>
                    );
                  })}
                </div>

                {/* Selected Board Detail Box */}
                {(() => {
                  const currentBoard = boardConfigs[selectedBoard];
                  return (
                    <div className="p-6 rounded-3xl bg-slate-50 border border-slate-200 space-y-3">
                      <div className="flex items-center gap-2.5">
                        <div className={`w-4 h-4 rounded-full ${currentBoard.bgColor}`} />
                        <span className="text-sm font-black text-slate-900 uppercase">
                          Thớt Màu {currentBoard.colorName}
                        </span>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${currentBoard.badgeBg}`}>
                          Chuyên biệt
                        </span>
                      </div>
                      <div>
                        <strong className="block text-xs font-black uppercase text-slate-400">Thực phẩm áp dụng:</strong>
                        <p className="text-sm font-extrabold text-slate-900 mt-0.5">{currentBoard.target}</p>
                      </div>
                      <div>
                        <strong className="block text-xs font-black uppercase text-slate-400">Nguyên tắc thao tác:</strong>
                        <p className="text-xs text-slate-600 font-semibold leading-relaxed mt-0.5">{currentBoard.rules}</p>
                      </div>
                    </div>
                  );
                })()}
              </div>

              {/* 4 Defensive Steps */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-4">
                <div className="p-5 rounded-2xl bg-teal-50 border border-teal-200 space-y-2">
                  <div className="w-8 h-8 rounded-xl bg-teal-600 text-white font-black text-sm flex items-center justify-center">1</div>
                  <h4 className="text-sm font-black text-slate-900 uppercase">Làm Sạch (Clean)</h4>
                  <p className="text-xs text-slate-600 leading-relaxed font-medium">Rửa tay xà phòng tối thiểu 20 giây; khử khuẩn dao thớt trước và sau mỗi ca sơ chế.</p>
                </div>
                <div className="p-5 rounded-2xl bg-blue-50 border border-blue-200 space-y-2">
                  <div className="w-8 h-8 rounded-xl bg-blue-600 text-white font-black text-sm flex items-center justify-center">2</div>
                  <h4 className="text-sm font-black text-slate-900 uppercase">Tách Biệt (Separate)</h4>
                  <p className="text-xs text-slate-600 leading-relaxed font-medium">Bố trí luồng đi một chiều, sử dụng dao thớt màu riêng, tuyệt đối không thái đồ chín trên thớt đồ sống.</p>
                </div>
                <div className="p-5 rounded-2xl bg-amber-50 border border-amber-200 space-y-2">
                  <div className="w-8 h-8 rounded-xl bg-amber-600 text-white font-black text-sm flex items-center justify-center">3</div>
                  <h4 className="text-sm font-black text-slate-900 uppercase">Nấu Chín (Cook)</h4>
                  <p className="text-xs text-slate-600 leading-relaxed font-medium">Đảm bảo nhiệt tâm đạt chuẩn (Gia cầm ≥ 74°C, Thịt xay ≥ 68°C, Hải sản ≥ 63°C).</p>
                </div>
                <div className="p-5 rounded-2xl bg-indigo-50 border border-indigo-200 space-y-2">
                  <div className="w-8 h-8 rounded-xl bg-indigo-600 text-white font-black text-sm flex items-center justify-center">4</div>
                  <h4 className="text-sm font-black text-slate-900 uppercase">Làm Lạnh (Chill)</h4>
                  <p className="text-xs text-slate-600 leading-relaxed font-medium">Hạ nhiệt nhanh xuống dưới 5°C trong vòng 2 giờ đối với thức ăn nguội trước khi đóng hộp lưu trữ.</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 5. CHUYÊN ĐỀ 05: 5 CHÌA KHÓA VÀNG WHO */}
        {activeTab === 'who5keys' && (
          <div className="space-y-8 animate-fade-in">
            <div className="bg-white rounded-[32px] p-6 sm:p-10 border border-slate-200/80 shadow-sm space-y-8">
              <div>
                <span className="inline-block px-3 py-1 bg-teal-50 text-[#007c76] border border-teal-200 rounded-lg text-[11px] font-black uppercase tracking-wider mb-2">
                  Chuyên đề 05 • Chuẩn mực quốc tế
                </span>
                <h2 className="text-2xl sm:text-3xl font-black text-slate-900 uppercase tracking-tight">
                  5 Chìa Khóa Vàng An Toàn Thực Phẩm Của WHO
                </h2>
                <p className="text-slate-600 text-sm sm:text-base leading-relaxed mt-1">
                  Khuyến nghị cốt lõi của Tổ chức Y tế Thế giới (WHO) giúp các cơ sở F&amp;B loại trừ đến 95% nguy cơ bùng phát ngộ độc tập thể.
                </p>
              </div>

              <div className="space-y-4">
                {[
                  {
                    num: '01',
                    title: 'Giữ vệ sinh sạch sẽ',
                    desc: 'Rửa tay trước khi chạm vào thực phẩm và sau khi đi vệ sinh. Rửa sạch và khử trùng mọi bề mặt, trang thiết bị tiếp xúc thức ăn. Bảo vệ khu vực bếp khỏi côn trùng, sâu bọ và động vật gây hại.',
                    tip: 'Rửa tay 6 bước tối thiểu 20 giây bằng xà phòng sát khuẩn.'
                  },
                  {
                    num: '02',
                    title: 'Để riêng thực phẩm sống và thực phẩm chín',
                    desc: 'Tách riêng thịt, gia cầm và hải sản sống khỏi các thực phẩm khác. Sử dụng dao, thớt, dụng cụ và khay chứa riêng biệt cho đồ sống và đồ ăn liền.',
                    tip: 'Không bao giờ để thức ăn chín vào đĩa vừa đựng thịt sống chưa rửa.'
                  },
                  {
                    num: '03',
                    title: 'Nấu chín kỹ thức ăn',
                    desc: 'Đun sôi súp và các món hầm đạt trên 70°C. Với thịt và gia cầm, đảm bảo nước thịt trong suốt, không còn màu hồng hoặc máu đọng.',
                    tip: 'Hâm nóng lại thức ăn chín phải đạt nhiệt tâm tối thiểu 74°C.'
                  },
                  {
                    num: '04',
                    title: 'Bảo quản thực phẩm ở nhiệt độ an toàn',
                    desc: 'Không để thức ăn đã nấu chín ở nhiệt độ phòng quá 2 giờ. Giữ lạnh toàn bộ thực phẩm đã nấu và dễ hư hỏng ở nhiệt độ dưới 5°C. Giữ nóng thức ăn trên 60°C khi phục vụ.',
                    tip: 'Không rã đông thực phẩm ở nhiệt độ phòng; luôn rã đông trong ngăn mát tủ lạnh.'
                  },
                  {
                    num: '05',
                    title: 'Sử dụng nước sạch và nguyên liệu an toàn',
                    desc: 'Sử dụng nguồn nước sạch đạt chuẩn nước ăn uống QCVN. Chọn thực phẩm tươi, lành lặn. Chọn thực phẩm đã qua chế biến an toàn như sữa tiệt trùng. Rửa sạch rau củ quả dưới vòi nước chảy.',
                    tip: 'Tuyệt đối không dùng thực phẩm quá hạn sử dụng ghi trên bao bì.'
                  }
                ].map((item) => (
                  <div key={item.num} className="p-6 rounded-3xl bg-slate-50 border border-slate-200/90 flex flex-col md:flex-row items-start gap-5 hover:border-teal-300 transition">
                    <div className="w-12 h-12 rounded-2xl bg-[#007c76] text-white font-black text-lg flex items-center justify-center shrink-0 shadow-md">
                      {item.num}
                    </div>
                    <div className="space-y-1.5 flex-1">
                      <h4 className="text-base font-black text-slate-900 uppercase">{item.title}</h4>
                      <p className="text-xs sm:text-sm text-slate-600 leading-relaxed font-medium">{item.desc}</p>
                      <div className="pt-1">
                        <span className="text-[11px] font-bold text-[#007c76] bg-teal-50 px-2.5 py-1 rounded-lg border border-teal-200 inline-block">
                          💡 Mẹo thực chiến: {item.tip}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* 6. CHUYÊN ĐỀ 06: VỆ SINH & SSOP */}
        {activeTab === 'hygiene' && (
          <div className="space-y-8 animate-fade-in">
            <div className="bg-white rounded-[32px] p-6 sm:p-10 border border-slate-200/80 shadow-sm space-y-8">
              <div>
                <span className="inline-block px-3 py-1 bg-teal-50 text-[#007c76] border border-teal-200 rounded-lg text-[11px] font-black uppercase tracking-wider mb-2">
                  Chuyên đề 06 • Quy trình kiểm soát SSOP
                </span>
                <h2 className="text-2xl sm:text-3xl font-black text-slate-900 uppercase tracking-tight">
                  Quy Trình Vệ Sinh Cá Nhân &amp; Khử Trùng Hóa Chất (SSOP)
                </h2>
                <p className="text-slate-600 text-sm sm:text-base leading-relaxed mt-1">
                  Kiểm soát nồng độ hóa chất khử trùng đạt ngưỡng PPM diệt khuẩn và đồng hồ đếm ngược 20 giây rửa tay tiêu chuẩn Bộ Y tế.
                </p>
              </div>

              {/* Handwash Interactive 20-Second Timer */}
              <div className="bg-teal-50/70 rounded-3xl p-6 sm:p-8 border border-teal-200 flex flex-col md:flex-row items-center justify-between gap-6">
                <div className="space-y-2 text-center md:text-left">
                  <div className="inline-flex items-center gap-1.5 text-xs font-black uppercase text-[#007c76]">
                    <Droplets className="w-4 h-4" />
                    <span>Bộ đếm giờ rửa tay vô trùng 20 giây</span>
                  </div>
                  <h3 className="text-xl font-black text-slate-900">Quy Trình Rửa Tay 6 Bước Tiêu Chuẩn</h3>
                  <p className="text-xs text-slate-600 max-w-md font-medium">
                    Tối thiểu 20 giây cọ xát với xà phòng: Lòng bàn tay, mu bàn tay, kẽ ngón tay, ngón cái, đầu ngón tay và cổ tay dưới vòi nước chảy.
                  </p>
                </div>

                <div className="flex items-center gap-4 shrink-0">
                  <div className="w-24 h-24 rounded-full bg-white border-4 border-[#007c76] flex flex-col items-center justify-center shadow-lg">
                    <span className="text-3xl font-black text-[#007c76] font-mono leading-none">
                      {washTimeLeft}s
                    </span>
                    <span className="text-[9px] font-bold text-slate-400 uppercase mt-1">Thời gian</span>
                  </div>

                  <div className="flex flex-col gap-2">
                    <button
                      type="button"
                      onClick={startHandwashTimer}
                      disabled={isWashing}
                      className="px-5 py-2.5 bg-[#007c76] hover:bg-[#00605c] disabled:opacity-50 text-white rounded-xl text-xs font-black uppercase tracking-wider transition shadow-sm cursor-pointer flex items-center gap-1.5"
                    >
                      <Play className="w-3.5 h-3.5" />
                      <span>{isWashing ? 'Đang đếm...' : 'Bắt đầu 20s'}</span>
                    </button>
                    <button
                      type="button"
                      onClick={resetHandwashTimer}
                      className="px-5 py-2.5 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-xl text-xs font-black uppercase tracking-wider transition cursor-pointer flex items-center gap-1.5"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>Đặt lại</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Chemical Sanitizer Concentration Table */}
              <div className="space-y-4">
                <h3 className="text-lg font-black text-slate-900 uppercase tracking-tight">
                  Nồng Độ Pha Chế Dung Dịch Khử Trùng Tiêu Chuẩn (PPM)
                </h3>

                <div className="overflow-x-auto rounded-3xl border border-slate-200 shadow-2xs">
                  <table className="w-full text-left text-xs sm:text-sm">
                    <thead className="bg-slate-100/80 text-slate-700 uppercase font-black text-[11px] border-b border-slate-200">
                      <tr>
                        <th className="py-4 px-5">Hóa Chất Khử Trùng</th>
                        <th className="py-4 px-5">Nồng Độ Chuẩn (PPM)</th>
                        <th className="py-4 px-5">Thời Gian Tiếp Xúc</th>
                        <th className="py-4 px-5">Mục Đích Sử Dụng</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-slate-700 font-medium">
                      <tr className="hover:bg-slate-50/60">
                        <td className="py-4 px-5 font-bold text-slate-900">Clo hoạt tính (Sodium Hypochlorite / Javen)</td>
                        <td className="py-4 px-5 font-black text-[#007c76]">100 - 200 PPM</td>
                        <td className="py-4 px-5 font-semibold text-slate-500">Tối thiểu 60 giây</td>
                        <td className="py-4 px-5 text-xs text-slate-600">Khử trùng thớt, dao, bề mặt bàn inox tiếp xúc thực phẩm</td>
                      </tr>
                      <tr className="hover:bg-slate-50/60">
                        <td className="py-4 px-5 font-bold text-slate-900">Hợp chất amoni bậc bốn (Quat - Quaternary Ammonium)</td>
                        <td className="py-4 px-5 font-black text-[#007c76]">200 - 400 PPM</td>
                        <td className="py-4 px-5 font-semibold text-slate-500">Tối thiểu 30 giây</td>
                        <td className="py-4 px-5 text-xs text-slate-600">Khử trùng thiết bị không gây ăn mòn kim loại, không mùi</td>
                      </tr>
                      <tr className="hover:bg-slate-50/60">
                        <td className="py-4 px-5 font-bold text-slate-900">Cồn thực phẩm (Ethanol 70°)</td>
                        <td className="py-4 px-5 font-black text-[#007c76]">70% (Không pha loãng)</td>
                        <td className="py-4 px-5 font-semibold text-slate-500">Tự khô tự nhiên</td>
                        <td className="py-4 px-5 text-xs text-slate-600">Xịt sát khuẩn găng tay, dao cắt bánh và đồ ăn ngay trước khi phục vụ</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Bottom Callout Banner */}
        <div className="bg-gradient-to-r from-slate-900 via-[#004f4a] to-[#007c76] rounded-[36px] p-8 sm:p-12 text-white flex flex-col md:flex-row items-center justify-between gap-8 shadow-xl">
          <div className="space-y-2 text-center md:text-left">
            <span className="text-yellow-300 text-xs font-black uppercase tracking-widest">Đào Tạo &amp; Cấp Chứng Chỉ FAST</span>
            <h3 className="text-2xl sm:text-3xl font-black uppercase tracking-tight leading-tight">
              Bạn Cần Đào Tạo Chuẩn Hóa <br className="hidden sm:block" />
              Cho Đội Ngũ Bếp &amp; Nhân Viên?
            </h3>
            <p className="text-teal-100 text-xs sm:text-sm font-medium max-w-xl">
              Học viện FAST cung cấp các chương trình đào tạo ISO 22000, HACCP và Cấp Giấy chứng nhận tập huấn kiến thức An toàn thực phẩm chính quy.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto shrink-0">
            <Link
              to="/khoa-hoc"
              className="w-full sm:w-auto px-8 py-4 bg-yellow-400 hover:bg-yellow-300 text-slate-950 rounded-2xl font-black text-xs uppercase tracking-widest transition-all shadow-lg hover:scale-105 text-center cursor-pointer"
            >
              Xem Khóa Học Ngay
            </Link>
            <Link
              to="/lien-he"
              className="w-full sm:w-auto px-6 py-4 bg-white/10 hover:bg-white/20 text-white rounded-2xl font-black text-xs uppercase tracking-widest transition-all border border-white/20 text-center cursor-pointer"
            >
              Tư Vấn Doanh Nghiệp
            </Link>
          </div>
        </div>

      </main>
    </div>
  );
};

export default Handbook;
