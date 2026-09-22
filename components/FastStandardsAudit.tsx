import React, { useState, useEffect, useMemo } from 'react';
import { ALL_AUDIT_ITEMS, AuditItem, AuditItemState, VAL_METHODS_LIST, IMP_METHODS_LIST } from '../data/fastStandardsData';
import { 
  ClipboardCheck, 
  CheckCircle2, 
  AlertTriangle, 
  XCircle, 
  FileText, 
  Printer, 
  Download, 
  RotateCcw, 
  ShieldCheck, 
  Building2, 
  UserCheck, 
  Sparkles, 
  UtensilsCrossed, 
  HeartHandshake, 
  Wrench, 
  Users, 
  Timer, 
  ShieldAlert,
  ArrowRight,
  Filter,
  Check,
  AlertCircle
} from 'lucide-react';

const STORAGE_KEY = 'FAST_AUDIT_STATE_SAVE_V1';

export const FastStandardsAudit: React.FC = () => {
  const [activeSubTab, setActiveSubTab] = useState<string>('library');
  const [clientName, setClientName] = useState<string>('Chuỗi Cửa Hàng / Nhà Hàng FAST');
  const [managerName, setManagerName] = useState<string>('');
  const [businessModel, setBusinessModel] = useState<string>('Chuỗi Nhà Hàng (F&B Chain)');
  const [auditorName, setAuditorName] = useState<string>('Dung Trần (FAST CONSULTING)');
  const [auditDate, setAuditDate] = useState<string>(() => new Date().toLocaleDateString('vi-VN'));

  // Filter states for pillars
  const [filterAccuracy, setFilterAccuracy] = useState<string>('all');
  const [filterCleanliness, setFilterCleanliness] = useState<string>('all');
  const [filterHospitality, setFilterHospitality] = useState<string>('all');
  const [filterMaintenance, setFilterMaintenance] = useState<string>('all');
  const [filterPeople, setFilterPeople] = useState<string>('all');
  const [filterProduct, setFilterProduct] = useState<string>('all');
  const [filterSafety, setFilterSafety] = useState<string>('all');
  const [filterSpeed, setFilterSpeed] = useState<string>('all');

  // Report filters
  const [filterReportPillar, setFilterReportPillar] = useState<string>('all');
  const [filterReportType, setFilterReportType] = useState<string>('all');

  // Audit state map
  const [auditState, setAuditState] = useState<Record<string, AuditItemState>>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (e) {}

    const init: Record<string, AuditItemState> = {};
    ALL_AUDIT_ITEMS.forEach(item => {
      init[item.id] = {
        status: 'pass',
        note: '',
        capa: '',
        valMethod: '',
        valNotes: '',
        impMethod: '',
        impNotes: ''
      };
    });
    return init;
  });

  // Save to localStorage on state changes
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(auditState));
    } catch (e) {}
  }, [auditState]);

  const updateItemStatus = (id: string, status: 'pass' | 'fail' | 'na') => {
    setAuditState(prev => ({
      ...prev,
      [id]: {
        ...prev[id],
        status
      }
    }));
  };

  const updateItemField = (id: string, field: keyof AuditItemState, value: string) => {
    setAuditState(prev => ({
      ...prev,
      [id]: {
        ...prev[id],
        [field]: value
      }
    }));
  };

  const handleNoteChange = (id: string, val: string, itemType: string) => {
    const trimmed = val.trim();
    const lower = trimmed.toLowerCase();

    let newStatus: 'pass' | 'fail' | 'na' = auditState[id]?.status || 'pass';

    if (lower === 'k/a' || lower === 'ka' || lower === 'n/a' || lower === 'na' || lower.includes('không áp dụng') || lower.includes('khong ap dung')) {
      newStatus = 'na';
    } else if (itemType !== 'Observation') {
      if (trimmed.length > 0) {
        newStatus = 'fail';
      }
    }

    setAuditState(prev => ({
      ...prev,
      [id]: {
        ...prev[id],
        note: val,
        status: newStatus
      }
    }));
  };

  const quickSet = (id: string, status: 'pass' | 'fail' | 'na') => {
    const item = ALL_AUDIT_ITEMS.find(i => i.id === id);
    setAuditState(prev => {
      const current = prev[id] || { status: 'pass', note: '', capa: '', valMethod: '', valNotes: '', impMethod: '', impNotes: '' };
      let newNote = current.note;

      if (status === 'fail') {
        if (!newNote || newNote.trim() === '') {
          newNote = 'Phát hiện: ' + (item?.defect || 'Không đạt tiêu chuẩn');
        }
      } else if (status === 'pass') {
        newNote = '';
      } else if (status === 'na') {
        if (!newNote || newNote.trim() === '') {
          newNote = 'Không áp dụng tại cơ sở';
        }
      }

      return {
        ...prev,
        [id]: {
          ...current,
          status,
          note: newNote
        }
      };
    });
  };

  const resetAllAudit = () => {
    if (window.confirm('Bạn có chắc chắn muốn làm mới toàn bộ kết quả đánh giá để bắt đầu đợt đánh giá mới?')) {
      const init: Record<string, AuditItemState> = {};
      ALL_AUDIT_ITEMS.forEach(item => {
        init[item.id] = {
          status: 'pass',
          note: '',
          capa: '',
          valMethod: '',
          valNotes: '',
          impMethod: '',
          impNotes: ''
        };
      });
      setAuditState(init);
      try {
        localStorage.removeItem(STORAGE_KEY);
      } catch (e) {}
    }
  };

  // Calculations for Report
  const { totalDeduction, majorCount, minorCount, obsCount, failedItems, finalScore, hasMajor, isPassed } = useMemo(() => {
    let deduction = 0;
    let major = 0;
    let minor = 0;
    let obs = 0;
    const fails: (AuditItem & AuditItemState)[] = [];

    ALL_AUDIT_ITEMS.forEach(item => {
      const st = auditState[item.id] || { status: 'pass', note: '', capa: '', valMethod: '', valNotes: '', impMethod: '', impNotes: '' };
      if (st.status === 'fail') {
        deduction += item.pts;
        if (item.type === 'Major') major++;
        else if (item.type === 'Minor') minor++;
        else obs++;

        const matchPillar = filterReportPillar === 'all' || item.pillar === filterReportPillar;
        const matchType = filterReportType === 'all' || item.type === filterReportType;

        if (matchPillar && matchType) {
          fails.push({ ...item, ...st });
        }
      }
    });

    const score = Math.max(0, 100 - deduction);
    const majorCheck = major > 0;
    const passed = score >= 80 && !majorCheck;

    return {
      totalDeduction: deduction,
      majorCount: major,
      minorCount: minor,
      obsCount: obs,
      failedItems: fails,
      finalScore: score,
      hasMajor: majorCheck,
      isPassed: passed
    };
  }, [auditState, filterReportPillar, filterReportType]);

  const handleNativePrint = () => {
    setActiveSubTab('report');
    setTimeout(() => {
      window.print();
    }, 200);
  };

  const handleExportPDF = () => {
    setActiveSubTab('report');
    setFilterReportPillar('all');
    setFilterReportType('all');
    setTimeout(() => {
      window.print();
    }, 250);
  };

  // Render pillar checklist table
  const renderPillarTable = (pillarName: string, filterVal: string) => {
    const items = ALL_AUDIT_ITEMS.filter(it => {
      if (it.pillar !== pillarName) return false;
      if (filterVal !== 'all' && it.group !== filterVal) return false;
      return true;
    });

    return (
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-[#007c76] text-white font-bold">
                <th className="p-3 w-14 text-center border-r border-teal-700/50">Mã</th>
                <th className="p-3 w-1/3 border-r border-teal-700/50">Tiêu chuẩn Đạt</th>
                <th className="p-3 w-1/3 border-r border-teal-700/50">Tiêu chuẩn Không Đạt (Defect) &amp; Tham chiếu</th>
                <th className="p-3 w-16 text-center border-r border-teal-700/50">Trừ</th>
                <th className="p-3 w-36 text-center border-r border-teal-700/50">Đánh giá</th>
                <th className="p-3 min-w-[200px]">Ghi chú / Bằng chứng</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {items.map((item, idx) => {
                const st = auditState[item.id] || { status: 'pass', note: '', capa: '', valMethod: '', valNotes: '', impMethod: '', impNotes: '' };
                const isFail = st.status === 'fail';
                const isNa = st.status === 'na';

                return (
                  <tr key={item.id} className={`hover:bg-teal-50/30 transition-colors ${isFail ? 'bg-red-50/40' : isNa ? 'bg-gray-50/50' : idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/20'}`}>
                    <td className="p-3 text-center font-bold text-gray-700 border-r border-gray-100">{item.id}</td>
                    <td className="p-3 border-r border-gray-100">
                      <div className="font-semibold text-gray-800 leading-snug">{item.std}</div>
                      <div className="text-[11px] text-gray-400 mt-1">Nhóm: {item.group}</div>
                    </td>
                    <td className="p-3 border-r border-gray-100">
                      <div className="text-red-700 font-medium italic text-[11.5px] leading-relaxed">{item.defect}</div>
                      <span className="inline-block mt-1.5 px-2 py-0.5 rounded bg-gray-100 text-gray-600 text-[10px] font-bold border border-gray-200">
                        {item.ref}
                      </span>
                    </td>
                    <td className="p-3 text-center font-black text-red-600 border-r border-gray-100">-{item.pts}</td>
                    <td className="p-3 border-r border-gray-100">
                      <div className="flex items-center justify-center gap-2">
                        <label className={`flex items-center gap-1 px-2 py-1 rounded cursor-pointer text-xs font-bold transition-all ${st.status === 'pass' ? 'bg-green-100 text-green-800 ring-1 ring-green-400' : 'text-gray-500 hover:bg-gray-100'}`}>
                          <input 
                            type="radio" 
                            name={`radio_${item.id}`} 
                            checked={st.status === 'pass'} 
                            onChange={() => updateItemStatus(item.id, 'pass')} 
                            className="w-3.5 h-3.5 text-green-600 accent-green-600"
                          />
                          Đạt
                        </label>
                        <label className={`flex items-center gap-1 px-2 py-1 rounded cursor-pointer text-xs font-bold transition-all ${st.status === 'fail' ? 'bg-red-100 text-red-800 ring-1 ring-red-400' : 'text-gray-500 hover:bg-gray-100'}`}>
                          <input 
                            type="radio" 
                            name={`radio_${item.id}`} 
                            checked={st.status === 'fail'} 
                            onChange={() => updateItemStatus(item.id, 'fail')} 
                            className="w-3.5 h-3.5 text-red-600 accent-red-600"
                          />
                          Lỗi
                        </label>
                        <label className={`flex items-center gap-1 px-2 py-1 rounded cursor-pointer text-xs font-bold transition-all ${st.status === 'na' ? 'bg-gray-200 text-gray-800 ring-1 ring-gray-400' : 'text-gray-500 hover:bg-gray-100'}`}>
                          <input 
                            type="radio" 
                            name={`radio_${item.id}`} 
                            checked={st.status === 'na'} 
                            onChange={() => updateItemStatus(item.id, 'na')} 
                            className="w-3.5 h-3.5 text-gray-600 accent-gray-600"
                          />
                          K/A
                        </label>
                      </div>
                    </td>
                    <td className="p-3">
                      <input 
                        type="text" 
                        value={st.note} 
                        onChange={(e) => handleNoteChange(item.id, e.target.value, item.type)}
                        placeholder={item.type === 'Observation' ? 'Ghi chú / nhận xét...' : 'Nhập bằng chứng (tự động ghi Lỗi)...'} 
                        className="w-full px-2.5 py-1.5 border border-gray-300 rounded text-xs focus:ring-1 focus:ring-teal-500 focus:border-teal-500 outline-none"
                      />
                      <div className="flex items-center gap-1.5 mt-1.5">
                        <button 
                          type="button" 
                          onClick={() => quickSet(item.id, 'pass')} 
                          className="px-2 py-0.5 text-[10.5px] font-bold rounded bg-green-50 text-green-700 hover:bg-green-100 border border-green-200"
                          title="Đánh dấu Đạt"
                        >
                          ✓ Đạt
                        </button>
                        <button 
                          type="button" 
                          onClick={() => quickSet(item.id, 'fail')} 
                          className="px-2 py-0.5 text-[10.5px] font-bold rounded bg-red-50 text-red-700 hover:bg-red-100 border border-red-200"
                          title="Điền lỗi & Ghi Lỗi"
                        >
                          ⚡ Ghi Lỗi
                        </button>
                        <button 
                          type="button" 
                          onClick={() => quickSet(item.id, 'na')} 
                          className="px-2 py-0.5 text-[10.5px] font-bold rounded bg-gray-100 text-gray-700 hover:bg-gray-200 border border-gray-300"
                          title="Không áp dụng"
                        >
                          K/A
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-[#005c56] to-[#007c76] rounded-3xl p-6 md:p-8 text-white shadow-lg relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-white/5 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none"></div>
        <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 text-teal-200 text-xs font-bold uppercase tracking-wider mb-2">
              <ShieldCheck className="w-4 h-4 text-teal-300" />
              FAST CONSULTING &bull; DÀNH RIÊNG QUẢN TRỊ VIÊN
            </div>
            <h1 className="text-2xl md:text-3xl font-black uppercase tracking-tight">
              Hệ Thống Thư Viện &amp; Đánh Giá Tiêu Chuẩn FAST
            </h1>
            <p className="text-teal-100/90 text-xs md:text-sm font-medium mt-1 max-w-2xl">
              Đánh giá toàn diện 8 trụ cột Vận hành &amp; An toàn thực phẩm (265 tiêu chuẩn chuẩn hóa ISO &amp; HACCP Codex).
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              onClick={handleExportPDF}
              className="px-4 py-2.5 bg-white text-[#005c56] hover:bg-teal-50 rounded-xl font-bold text-xs uppercase tracking-wider shadow transition-all flex items-center gap-1.5"
            >
              <Download className="w-4 h-4" />
              Xuất Báo Cáo PDF
            </button>
            <button
              onClick={handleNativePrint}
              className="px-4 py-2.5 bg-teal-800/80 hover:bg-teal-900 text-white rounded-xl font-bold text-xs uppercase tracking-wider border border-white/20 transition-all flex items-center gap-1.5"
            >
              <Printer className="w-4 h-4" />
              In Báo Cáo
            </button>
            <button
              onClick={resetAllAudit}
              className="px-3 py-2.5 bg-red-600/80 hover:bg-red-700 text-white rounded-xl font-bold text-xs uppercase tracking-wider transition-all flex items-center gap-1.5"
              title="Làm mới lại toàn bộ tiêu chuẩn đánh giá"
            >
              <RotateCcw className="w-4 h-4" />
              Làm mới
            </button>
          </div>
        </div>
      </div>

      {/* Navigation Sub-Tabs */}
      <div className="bg-white p-2 rounded-2xl border border-gray-200 shadow-sm flex items-center gap-1.5 overflow-x-auto custom-scrollbar">
        {[
          { id: 'library', label: 'Thư Viện', icon: Building2, count: null },
          { id: 'accuracy', label: 'Accuracy', icon: CheckCircle2, count: 20 },
          { id: 'cleanliness', label: 'Cleanliness', icon: Sparkles, count: 55 },
          { id: 'hospitality', label: 'Hospitality', icon: HeartHandshake, count: 21 },
          { id: 'maintenance', label: 'Maintenance', icon: Wrench, count: 54 },
          { id: 'people', label: 'People', icon: Users, count: 10 },
          { id: 'product', label: 'Product', icon: UtensilsCrossed, count: 61 },
          { id: 'safety', label: 'Safety', icon: ShieldAlert, count: 19 },
          { id: 'speed', label: 'Speed', icon: Timer, count: 25 },
          { id: 'report', label: 'Báo Cáo & CAPA', icon: FileText, count: null, highlight: true }
        ].map(tab => {
          const Icon = tab.icon;
          const isActive = activeSubTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveSubTab(tab.id)}
              className={`px-3.5 py-2.5 rounded-xl font-bold text-xs uppercase tracking-wider whitespace-nowrap transition-all flex items-center gap-1.5 ${
                isActive
                  ? tab.highlight 
                    ? 'bg-amber-600 text-white shadow-md shadow-amber-600/30'
                    : 'bg-[#007c76] text-white shadow-md shadow-[#007c76]/30'
                  : tab.highlight
                    ? 'bg-amber-50 text-amber-800 hover:bg-amber-100 border border-amber-200'
                    : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{tab.label}</span>
              {tab.count !== null && (
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${isActive ? 'bg-white/20 text-white' : 'bg-gray-200 text-gray-700'}`}>
                  {tab.count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* TAB 1: THƯ VIỆN TỔNG QUAN */}
      {activeSubTab === 'library' && (
        <div className="space-y-6">
          {/* Metadata Controls */}
          <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                Đơn vị được đánh giá (Auditee):
              </label>
              <input
                type="text"
                value={clientName}
                onChange={(e) => setClientName(e.target.value)}
                placeholder="VD: Cửa hàng tiện lợi / Siêu thị ABC..."
                className="w-full px-3 py-2 border border-gray-300 rounded-xl text-xs font-semibold focus:ring-1 focus:ring-teal-500 outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                Quản lý cơ sở (Store Manager):
              </label>
              <input
                type="text"
                value={managerName}
                onChange={(e) => setManagerName(e.target.value)}
                placeholder="Họ tên Quản lý cơ sở..."
                className="w-full px-3 py-2 border border-gray-300 rounded-xl text-xs font-semibold focus:ring-1 focus:ring-teal-500 outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                Mô hình kinh doanh:
              </label>
              <select
                value={businessModel}
                onChange={(e) => setBusinessModel(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-xl text-xs font-semibold focus:ring-1 focus:ring-teal-500 outline-none bg-white"
              >
                <option>Chuỗi Nhà Hàng (F&B Chain)</option>
                <option>Cửa Hàng Tiện Lợi (Convenience Store)</option>
                <option>Siêu Thị (Supermarket)</option>
                <option>Chuỗi Thức Ăn Nhanh (Fast Food)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                Chuyên gia đánh giá (Lead Auditor):
              </label>
              <input
                type="text"
                value={auditorName}
                onChange={(e) => setAuditorName(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-xl text-xs font-semibold focus:ring-1 focus:ring-teal-500 outline-none"
              />
            </div>
          </div>

          {/* 8 Pillar Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
            {[
              { id: 'accuracy', title: 'FAST Accuracy', count: 20, desc: 'Độ chính xác vận hành, khẩu phần & thu ngân', color: 'from-teal-600 to-emerald-600' },
              { id: 'cleanliness', title: 'FAST Cleanliness', count: 55, desc: 'Vệ sinh cơ sở, thiết bị & SSOP', color: 'from-blue-600 to-cyan-600' },
              { id: 'hospitality', title: 'FAST Hospitality', count: 21, desc: 'Dịch vụ, văn hóa & trải nghiệm khách hàng', color: 'from-purple-600 to-indigo-600' },
              { id: 'maintenance', title: 'FAST Maintenance', count: 54, desc: 'Bảo trì thiết bị, cơ sở hạ tầng & kiểm định', color: 'from-amber-600 to-orange-600' },
              { id: 'people', title: 'FAST People', count: 10, desc: 'Đào tạo, nhân sự & phân công', color: 'from-emerald-600 to-teal-700' },
              { id: 'product', title: 'FAST Product', count: 61, desc: 'Chất lượng, nhiệt độ, bảo quản & HSD', color: 'from-rose-600 to-red-600' },
              { id: 'safety', title: 'FAST Safety', count: 19, desc: 'An toàn thực phẩm, CCP, bồn rửa tay & y tế', color: 'from-red-600 to-orange-700' },
              { id: 'speed', title: 'FAST Speed', count: 25, desc: 'Tốc độ phục vụ, điều phối & quản trị thời gian', color: 'from-sky-600 to-blue-700' },
            ].map(p => {
              // Count NCs for this pillar
              const pillarFullName = p.title;
              const ncCount = ALL_AUDIT_ITEMS.filter(it => it.pillar === pillarFullName && auditState[it.id]?.status === 'fail').length;

              return (
                <div key={p.id} className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm hover:shadow-md transition-all flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <span className="text-xs font-black uppercase text-[#007c76] tracking-wider">{p.title}</span>
                      <span className="px-2 py-0.5 rounded-full bg-teal-50 text-teal-700 text-[10px] font-black border border-teal-200">
                        {p.count} mục
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 font-medium italic mb-4 min-h-[36px]">{p.desc}</p>
                    
                    <div className="flex items-center gap-2 mb-4 p-2.5 rounded-xl bg-gray-50 border border-gray-100 text-xs">
                      <span className="font-bold text-gray-700">Lỗi phát hiện:</span>
                      <span className={`font-black ${ncCount > 0 ? 'text-red-600' : 'text-green-600'}`}>
                        {ncCount} lỗi
                      </span>
                    </div>
                  </div>

                  <button
                    onClick={() => setActiveSubTab(p.id)}
                    className="w-full py-2.5 px-3 bg-gray-100 hover:bg-[#007c76] hover:text-white text-gray-700 rounded-xl text-xs font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-1.5"
                  >
                    <span>Vào đánh giá</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 2: ACCURACY */}
      {activeSubTab === 'accuracy' && (
        <div className="space-y-4">
          <div className="bg-white p-4 rounded-2xl border border-gray-200 flex flex-wrap items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-black text-gray-800 uppercase tracking-tight">Trụ cột: FAST Accuracy</h2>
              <p className="text-xs text-gray-500">20 tiêu chuẩn về độ chính xác món ăn, định lượng, bill và thu ngân</p>
            </div>
            <div className="flex items-center gap-2">
              <label className="text-xs font-bold text-gray-600">Lọc nhóm:</label>
              <select 
                value={filterAccuracy} 
                onChange={(e) => setFilterAccuracy(e.target.value)}
                className="px-3 py-1.5 border border-gray-300 rounded-xl text-xs font-semibold bg-white outline-none"
              >
                <option value="all">-- Xem tất cả 20 mục --</option>
                <option value="01 Tất cả các món ăn đều sẵn sàng/không có sản phẩm không được phép">01 Tất cả các món ăn đều sẵn sàng/không có sản phẩm không được phép</option>
                <option value="02 Thu ngân chính xác">02 Thu ngân chính xác</option>
                <option value="03 Sản phẩm được phục vụ đúng tiêu chuẩn">03 Sản phẩm được phục vụ đúng tiêu chuẩn</option>
              </select>
            </div>
          </div>
          {renderPillarTable('FAST Accuracy', filterAccuracy)}
        </div>
      )}

      {/* TAB 3: CLEANLINESS */}
      {activeSubTab === 'cleanliness' && (
        <div className="space-y-4">
          <div className="bg-white p-4 rounded-2xl border border-gray-200 flex flex-wrap items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-black text-gray-800 uppercase tracking-tight">Trụ cột: FAST Cleanliness</h2>
              <p className="text-xs text-gray-500">55 tiêu chuẩn vệ sinh, khử trùng bồn 3 bước, kiểm soát côn trùng dịch hại</p>
            </div>
            <div className="flex items-center gap-2">
              <label className="text-xs font-bold text-gray-600">Lọc nhóm:</label>
              <select 
                value={filterCleanliness} 
                onChange={(e) => setFilterCleanliness(e.target.value)}
                className="px-3 py-1.5 border border-gray-300 rounded-xl text-xs font-semibold bg-white outline-none"
              >
                <option value="all">-- Xem tất cả 55 mục --</option>
                <option value="01 Khu vực bếp và các thiết bị sạch sẽ">01 Khu vực bếp và các thiết bị sạch sẽ</option>
                <option value="02 Hệ thống vệ sinh đầy đủ và hiệu quả">02 Hệ thống vệ sinh đầy đủ và hiệu quả</option>
                <option value="05 Khu vực phục vụ sạch sẽ và ấm cúng">05 Khu vực phục vụ sạch sẽ và ấm cúng</option>
                <option value="03 Bên ngoài nhà hàng sạch sẽ">03 Bên ngoài nhà hàng sạch sẽ</option>
                <option value="04 Nhà vệ sinh sạch sẽ và có đủ giấy/xà phòng">04 Nhà vệ sinh sạch sẽ và có đủ giấy/xà phòng</option>
              </select>
            </div>
          </div>
          {renderPillarTable('FAST Cleanliness', filterCleanliness)}
        </div>
      )}

      {/* TAB 4: HOSPITALITY */}
      {activeSubTab === 'hospitality' && (
        <div className="space-y-4">
          <div className="bg-white p-4 rounded-2xl border border-gray-200 flex flex-wrap items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-black text-gray-800 uppercase tracking-tight">Trụ cột: FAST Hospitality</h2>
              <p className="text-xs text-gray-500">21 tiêu chuẩn trải nghiệm khách hàng, chào đón, diện mạo nhân viên</p>
            </div>
            <div className="flex items-center gap-2">
              <label className="text-xs font-bold text-gray-600">Lọc nhóm:</label>
              <select 
                value={filterHospitality} 
                onChange={(e) => setFilterHospitality(e.target.value)}
                className="px-3 py-1.5 border border-gray-300 rounded-xl text-xs font-semibold bg-white outline-none"
              >
                <option value="all">-- Xem tất cả 21 mục --</option>
                <option value="01 Các khách hàng đều được tôn trọng">01 Các khách hàng đều được tôn trọng</option>
                <option value="03 Nhân viên thân thiện, ân cần và thạo việc">03 Nhân viên thân thiện, ân cần và thạo việc</option>
                <option value="02 Nhân viên có ngoại hình và tư cách tốt">02 Nhân viên có ngoại hình và tư cách tốt</option>
              </select>
            </div>
          </div>
          {renderPillarTable('FAST Hospitality', filterHospitality)}
        </div>
      )}

      {/* TAB 5: MAINTENANCE */}
      {activeSubTab === 'maintenance' && (
        <div className="space-y-4">
          <div className="bg-white p-4 rounded-2xl border border-gray-200 flex flex-wrap items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-black text-gray-800 uppercase tracking-tight">Trụ cột: FAST Maintenance</h2>
              <p className="text-xs text-gray-500">54 tiêu chuẩn bảo trì, nhiệt độ tủ lạnh/tủ nóng, hệ thống thoát nước</p>
            </div>
            <div className="flex items-center gap-2">
              <label className="text-xs font-bold text-gray-600">Lọc nhóm:</label>
              <select 
                value={filterMaintenance} 
                onChange={(e) => setFilterMaintenance(e.target.value)}
                className="px-3 py-1.5 border border-gray-300 rounded-xl text-xs font-semibold bg-white outline-none"
              >
                <option value="all">-- Xem tất cả 54 mục --</option>
                <option value="03 Thiết bị được duy trì và hoạt động tốt">03 Thiết bị được duy trì và hoạt động tốt</option>
                <option value="01 Tòa nhà/bảng hiệu được bảo trì tốt">01 Tòa nhà/bảng hiệu được bảo trì tốt</option>
                <option value="02 POP và các vật dụng hỗ trợ bán hàng được duy trì và sử dụng">02 POP và các vật dụng hỗ trợ bán hàng được duy trì và sử dụng</option>
              </select>
            </div>
          </div>
          {renderPillarTable('FAST Maintenance', filterMaintenance)}
        </div>
      )}

      {/* TAB 6: PEOPLE */}
      {activeSubTab === 'people' && (
        <div className="space-y-4">
          <div className="bg-white p-4 rounded-2xl border border-gray-200 flex flex-wrap items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-black text-gray-800 uppercase tracking-tight">Trụ cột: FAST People</h2>
              <p className="text-xs text-gray-500">10 tiêu chuẩn về đào tạo nhân viên, phân công ca làm việc, cẩm nang SOP</p>
            </div>
            <div className="flex items-center gap-2">
              <label className="text-xs font-bold text-gray-600">Lọc nhóm:</label>
              <select 
                value={filterPeople} 
                onChange={(e) => setFilterPeople(e.target.value)}
                className="px-3 py-1.5 border border-gray-300 rounded-xl text-xs font-semibold bg-white outline-none"
              >
                <option value="all">-- Xem tất cả 10 mục --</option>
                <option value="01 Con người">01 Con người</option>
              </select>
            </div>
          </div>
          {renderPillarTable('FAST People', filterPeople)}
        </div>
      )}

      {/* TAB 7: PRODUCT */}
      {activeSubTab === 'product' && (
        <div className="space-y-4">
          <div className="bg-white p-4 rounded-2xl border border-gray-200 flex flex-wrap items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-black text-gray-800 uppercase tracking-tight">Trụ cột: FAST Product</h2>
              <p className="text-xs text-gray-500">61 tiêu chuẩn nhiệt độ bảo quản, nấu chín, lây nhiễm chéo, nhãn MRD</p>
            </div>
            <div className="flex items-center gap-2">
              <label className="text-xs font-bold text-gray-600">Lọc nhóm:</label>
              <select 
                value={filterProduct} 
                onChange={(e) => setFilterProduct(e.target.value)}
                className="px-3 py-1.5 border border-gray-300 rounded-xl text-xs font-semibold bg-white outline-none"
              >
                <option value="all">-- Xem tất cả 61 mục --</option>
                <option value="05 Quy trình bảo quản đúng quy định">05 Quy trình bảo quản đúng quy định</option>
                <option value="04 Thực phẩm được nấu chín hoàn toàn và có hương vị, hình thức đúng tiêu chuẩn">04 Thực phẩm được nấu chín hoàn toàn và có hương vị, hình thức đúng tiêu chuẩn</option>
                <option value="01 Tất cả các món ăn đều được chế biến theo đúng tiêu chuẩn">01 Tất cả các món ăn đều được chế biến theo đúng tiêu chuẩn</option>
                <option value="02 Nguyên liệu đúng và tươi ngon">02 Nguyên liệu đúng và tươi ngon</option>
                <option value="03 Quy trình làm dough theo tiêu chuẩn">03 Quy trình làm dough theo tiêu chuẩn</option>
                <option value="06 Nhiệt độ sản phẩm khi phục vụ được duy trì đúng tiêu chuẩn">06 Nhiệt độ sản phẩm khi phục vụ được duy trì đúng tiêu chuẩn</option>
              </select>
            </div>
          </div>
          {renderPillarTable('FAST Product', filterProduct)}
        </div>
      )}

      {/* TAB 8: SAFETY */}
      {activeSubTab === 'safety' && (
        <div className="space-y-4">
          <div className="bg-white p-4 rounded-2xl border border-gray-200 flex flex-wrap items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-black text-gray-800 uppercase tracking-tight">Trụ cột: FAST Safety</h2>
              <p className="text-xs text-gray-500">19 tiêu chuẩn An toàn thực phẩm cốt lõi, bồn rửa tay, y tế &amp; sức khỏe</p>
            </div>
            <div className="flex items-center gap-2">
              <label className="text-xs font-bold text-gray-600">Lọc nhóm:</label>
              <select 
                value={filterSafety} 
                onChange={(e) => setFilterSafety(e.target.value)}
                className="px-3 py-1.5 border border-gray-300 rounded-xl text-xs font-semibold bg-white outline-none"
              >
                <option value="all">-- Xem tất cả 19 mục --</option>
                <option value="01 An toàn">01 An toàn</option>
              </select>
            </div>
          </div>
          {renderPillarTable('FAST Safety', filterSafety)}
        </div>
      )}

      {/* TAB 9: SPEED */}
      {activeSubTab === 'speed' && (
        <div className="space-y-4">
          <div className="bg-white p-4 rounded-2xl border border-gray-200 flex flex-wrap items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-black text-gray-800 uppercase tracking-tight">Trụ cột: FAST Speed</h2>
              <p className="text-xs text-gray-500">25 tiêu chuẩn thời gian phục vụ món, giao hàng, điều phối ca cao điểm</p>
            </div>
            <div className="flex items-center gap-2">
              <label className="text-xs font-bold text-gray-600">Lọc nhóm:</label>
              <select 
                value={filterSpeed} 
                onChange={(e) => setFilterSpeed(e.target.value)}
                className="px-3 py-1.5 border border-gray-300 rounded-xl text-xs font-semibold bg-white outline-none"
              >
                <option value="all">-- Xem tất cả 25 mục --</option>
                <option value="01 Tốc độ phục vụ đạt tiêu chuẩn">01 Tốc độ phục vụ đạt tiêu chuẩn</option>
                <option value="02 Có quản lý tốc độ phục vụ">02 Có quản lý tốc độ phục vụ</option>
              </select>
            </div>
          </div>
          {renderPillarTable('FAST Speed', filterSpeed)}
        </div>
      )}

      {/* TAB 10: BÁO CÁO & CAPA */}
      {activeSubTab === 'report' && (
        <div className="space-y-6" id="fastAuditReportSection">
          {/* Audit Header Section */}
          <div className="bg-white p-6 rounded-2xl border-2 border-[#007c76] shadow-sm">
            <div className="border-b-2 border-[#007c76] pb-3 mb-4">
              <h2 className="text-lg md:text-xl font-black text-[#007c76] uppercase tracking-wide">
                BÁO CÁO KẾT QUẢ ĐÁNH GIÁ HỆ THỐNG AN TOÀN THỰC PHẨM &amp; VẬN HÀNH
              </h2>
              <p className="text-xs text-gray-500 font-medium italic mt-1">
                Bản quyền FAST CONSULTING - Food All Standards &amp; Training | Chuyên gia Đánh giá Trưởng: Dung Trần
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-2 text-xs">
              <div className="py-1 border-b border-dashed border-gray-200 flex justify-between">
                <span className="font-bold text-[#005c56]">Đơn vị được đánh giá (Auditee):</span>
                <span className="font-semibold text-gray-900">{clientName || 'Chưa nhập tên khách hàng'}</span>
              </div>
              <div className="py-1 border-b border-dashed border-gray-200 flex justify-between">
                <span className="font-bold text-[#005c56]">Chuyên gia đánh giá (Lead Auditor):</span>
                <span className="font-semibold text-gray-900">{auditorName}</span>
              </div>
              <div className="py-1 border-b border-dashed border-gray-200 flex justify-between">
                <span className="font-bold text-[#005c56]">Quản lý cơ sở (Store Manager):</span>
                <span className="font-semibold text-gray-900">{managerName || 'Chưa nhập tên quản lý'}</span>
              </div>
              <div className="py-1 border-b border-dashed border-gray-200 flex justify-between">
                <span className="font-bold text-[#005c56]">Ngày đánh giá:</span>
                <span className="font-semibold text-gray-900">{auditDate}</span>
              </div>
              <div className="py-1 border-b border-dashed border-gray-200 flex justify-between">
                <span className="font-bold text-[#005c56]">Mô hình kinh doanh:</span>
                <span className="font-semibold text-gray-900">{businessModel}</span>
              </div>
              <div className="py-1 border-b border-dashed border-gray-200 flex justify-between">
                <span className="font-bold text-[#005c56]">Phạm vi đánh giá:</span>
                <span className="font-semibold text-gray-900">8 Trụ Cột Vận Hành &amp; ATTP (265 Tiêu chuẩn)</span>
              </div>
            </div>
          </div>

          {/* Score & Finding KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            {/* Score box */}
            <div className={`p-5 rounded-2xl bg-white border-l-4 shadow-sm text-center ${isPassed ? 'border-l-green-500' : 'border-l-red-500'}`}>
              <div className="text-[11px] font-black uppercase tracking-wider text-gray-500">ĐIỂM ĐÁNH GIÁ TỔNG</div>
              <div className="text-3xl font-black text-[#007c76] my-1">{finalScore}%</div>
              <div className={`text-xs font-bold ${isPassed ? 'text-green-600' : 'text-red-600'}`}>
                {isPassed ? 'ĐẠT YÊU CẦU (>= 80%)' : hasMajor ? 'KHÔNG ĐẠT (CÓ MAJOR)' : 'KHÔNG ĐẠT (< 80%)'}
              </div>
            </div>

            {/* Total NCs */}
            <div className="p-5 rounded-2xl bg-white border-l-4 border-l-gray-400 shadow-sm text-center">
              <div className="text-[11px] font-black uppercase tracking-wider text-gray-500">TỔNG LỖI (NCs)</div>
              <div className="text-3xl font-black text-gray-800 my-1">
                {ALL_AUDIT_ITEMS.filter(it => auditState[it.id]?.status === 'fail').length}
              </div>
              <div className="text-[11px] text-gray-400">Cần khắc phục (CAPA)</div>
            </div>

            {/* Major */}
            <div className="p-5 rounded-2xl bg-red-600 text-white shadow-sm text-center">
              <div className="text-[11px] font-black uppercase tracking-wider text-red-100">MAJOR (Trọng yếu)</div>
              <div className="text-3xl font-black my-1">{majorCount}</div>
              <div className="text-[10px] bg-red-700/60 rounded px-2 py-0.5 inline-block">&ge; 1 lỗi: Auto Failed</div>
            </div>

            {/* Minor */}
            <div className="p-5 rounded-2xl bg-amber-500 text-white shadow-sm text-center">
              <div className="text-[11px] font-black uppercase tracking-wider text-amber-100">MINOR (Thứ yếu)</div>
              <div className="text-3xl font-black my-1">{minorCount}</div>
              <div className="text-[10px] text-amber-100">Khắc phục trong 7 ngày</div>
            </div>

            {/* Obs */}
            <div className="p-5 rounded-2xl bg-sky-600 text-white shadow-sm text-center">
              <div className="text-[11px] font-black uppercase tracking-wider text-sky-100">OBSERVATION (Lưu ý)</div>
              <div className="text-3xl font-black my-1">{obsCount}</div>
              <div className="text-[10px] text-sky-100">Khắc phục trong 30 ngày</div>
            </div>
          </div>

          {/* Auto Failed Alert */}
          {hasMajor && (
            <div className="bg-red-50 border border-red-200 border-l-4 border-l-red-600 p-4 rounded-xl text-red-900 text-xs leading-relaxed flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
              <div>
                <strong>⚠️ TIÊU CHUẨN ĐÁNH GIÁ (AUTO FAILED):</strong> Cơ sở có phát hiện <strong>{majorCount} điểm không phù hợp mức Trọng yếu (Major / Critical)</strong>. Theo quy chế đánh giá QMS &amp; An toàn thực phẩm, cơ sở bị đánh giá <strong>KHÔNG ĐẠT</strong> (Tiêu chuẩn đạt: Điểm &ge; 80% và không có lỗi Major). Cơ sở bắt buộc phải thực hiện ngay hành động khắc phục (CAPA) trong vòng 36 giờ và hoàn tất thẩm tra trước kỳ đánh giá tiếp theo.
              </div>
            </div>
          )}

          {/* Findings Filter Bar */}
          <div className="bg-white p-4 rounded-2xl border border-gray-200 flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-teal-600" />
              <span className="text-xs font-black uppercase text-gray-800 tracking-wider">Danh Sách Điểm Không Phù Hợp &amp; CAPA</span>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-bold text-gray-600">Trụ cột:</span>
                <select
                  value={filterReportPillar}
                  onChange={(e) => setFilterReportPillar(e.target.value)}
                  className="px-2.5 py-1.5 border border-gray-300 rounded-lg text-xs font-semibold bg-white outline-none"
                >
                  <option value="all">-- Tất cả 8 trụ cột --</option>
                  <option value="FAST Accuracy">FAST Accuracy</option>
                  <option value="FAST Cleanliness">FAST Cleanliness</option>
                  <option value="FAST Hospitality">FAST Hospitality</option>
                  <option value="FAST Maintenance">FAST Maintenance</option>
                  <option value="FAST People">FAST People</option>
                  <option value="FAST Product">FAST Product</option>
                  <option value="FAST Safety">FAST Safety</option>
                  <option value="FAST Speed">FAST Speed</option>
                </select>
              </div>

              <div className="flex items-center gap-1.5">
                <span className="text-xs font-bold text-gray-600">Phân loại:</span>
                <select
                  value={filterReportType}
                  onChange={(e) => setFilterReportType(e.target.value)}
                  className="px-2.5 py-1.5 border border-gray-300 rounded-lg text-xs font-semibold bg-white outline-none"
                >
                  <option value="all">-- Tất cả phân loại --</option>
                  <option value="Major">Major (Trọng yếu)</option>
                  <option value="Minor">Minor (Thứ yếu)</option>
                  <option value="Observation">Observation (Lưu ý)</option>
                </select>
              </div>
            </div>
          </div>

          {/* Findings Table */}
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse min-w-[950px]">
                <thead>
                  <tr className="bg-[#007c76] text-white font-bold">
                    <th className="p-3 w-12 text-center border-r border-teal-700/50">STT</th>
                    <th className="p-3 w-28 border-r border-teal-700/50">Trụ cột</th>
                    <th className="p-3 w-24 text-center border-r border-teal-700/50">Phân loại</th>
                    <th className="p-3 w-14 text-center border-r border-teal-700/50">Trừ</th>
                    <th className="p-3 w-1/4 border-r border-teal-700/50">Chi tiết NC &amp; Bằng chứng</th>
                    <th className="p-3 w-1/5 border-r border-teal-700/50">Hành động &amp; Hạn CAPA</th>
                    <th className="p-3 w-1/6 border-r border-teal-700/50">Phương pháp &amp; Thẩm tra (Validation)</th>
                    <th className="p-3 w-1/6">Phương án Cải tiến (Improvement)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {failedItems.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="p-8 text-center text-green-700 font-bold bg-green-50/50">
                        ✓ Chưa phát hiện điểm không phù hợp nào theo bộ lọc đang chọn.
                      </td>
                    </tr>
                  ) : (
                    failedItems.map((f, idx) => {
                      let badgeClass = 'bg-sky-100 text-sky-800 border-sky-300';
                      let capaDeadline = 'Khắc phục trong 30 ngày';
                      if (f.type === 'Major') {
                        badgeClass = 'bg-red-100 text-red-800 border-red-300';
                        capaDeadline = 'Khắc phục trong 36 giờ';
                      } else if (f.type === 'Minor') {
                        badgeClass = 'bg-amber-100 text-amber-800 border-amber-300';
                        capaDeadline = 'Khắc phục trong 7 ngày';
                      }

                      return (
                        <tr key={f.id} className="hover:bg-gray-50/60 transition-colors">
                          <td className="p-3 text-center font-bold text-gray-700 border-r border-gray-100">{idx + 1}</td>
                          <td className="p-3 border-r border-gray-100">
                            <span className="font-bold text-[#007c76] text-[11px] block">{f.pillar}</span>
                            <span className="text-[10px] text-gray-400 font-mono">[{f.id}]</span>
                          </td>
                          <td className="p-3 text-center border-r border-gray-100">
                            <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-black border ${badgeClass}`}>
                              {f.type}
                            </span>
                          </td>
                          <td className="p-3 text-center font-black text-red-600 border-r border-gray-100">-{f.pts}</td>
                          <td className="p-3 border-r border-gray-100">
                            <div className="font-bold text-gray-800 leading-snug">{f.defect}</div>
                            <span className="inline-block mt-1 px-1.5 py-0.2 rounded bg-gray-100 text-gray-500 text-[10px] font-bold border border-gray-200">
                              {f.ref}
                            </span>
                            <div className="mt-1 text-gray-600 italic text-[11px]">
                              Bằng chứng: <strong>{f.note || 'Chưa ghi chú'}</strong>
                            </div>
                          </td>
                          <td className="p-3 border-r border-gray-100">
                            <textarea
                              value={f.capa}
                              onChange={(e) => updateItemField(f.id, 'capa', e.target.value)}
                              placeholder="Nhập hành động khắc phục (HĐKP)..."
                              className="w-full p-2 border border-gray-300 rounded text-xs min-h-[50px] outline-none focus:ring-1 focus:ring-teal-500"
                            />
                            <div className="text-[10.5px] font-bold text-amber-700 mt-1">
                              Hạn: {capaDeadline}
                            </div>
                          </td>
                          <td className="p-3 border-r border-gray-100">
                            <select
                              value={f.valMethod}
                              onChange={(e) => updateItemField(f.id, 'valMethod', e.target.value)}
                              className="w-full p-1.5 border border-gray-300 rounded text-[11px] mb-1.5 outline-none bg-white font-medium"
                            >
                              <option value="">-- Chọn phương pháp thẩm tra --</option>
                              {VAL_METHODS_LIST.map(opt => (
                                <option key={opt} value={opt}>{opt}</option>
                              ))}
                            </select>
                            <textarea
                              value={f.valNotes}
                              onChange={(e) => updateItemField(f.id, 'valNotes', e.target.value)}
                              placeholder="Ghi chú kết quả thẩm tra / Nhập phương pháp khác..."
                              className="w-full p-1.5 border border-gray-300 rounded text-xs min-h-[42px] outline-none focus:ring-1 focus:ring-teal-500"
                            />
                          </td>
                          <td className="p-3">
                            <select
                              value={f.impMethod}
                              onChange={(e) => updateItemField(f.id, 'impMethod', e.target.value)}
                              className="w-full p-1.5 border border-gray-300 rounded text-[11px] mb-1.5 outline-none bg-white font-medium"
                            >
                              <option value="">-- Chọn phương án cải tiến --</option>
                              {IMP_METHODS_LIST.map(opt => (
                                <option key={opt} value={opt}>{opt}</option>
                              ))}
                            </select>
                            <textarea
                              value={f.impNotes}
                              onChange={(e) => updateItemField(f.id, 'impNotes', e.target.value)}
                              placeholder="Ghi chú đề xuất cải tiến / Lộ trình triển khai..."
                              className="w-full p-1.5 border border-gray-300 rounded text-xs min-h-[42px] outline-none focus:ring-1 focus:ring-teal-500"
                            />
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Signature Block */}
          <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm grid grid-cols-1 md:grid-cols-2 gap-8 text-center">
            <div className="flex flex-col items-center justify-between min-h-[140px]">
              <div>
                <p className="font-black text-xs uppercase tracking-wider text-gray-800">ĐẠI DIỆN ĐƠN VỊ ĐƯỢC ĐÁNH GIÁ (AUDITEE)</p>
                <p className="text-[11px] text-gray-500 italic mt-0.5">(Ký, ghi rõ họ tên &amp; Chức vụ)</p>
              </div>
              <div className="font-bold text-xs text-gray-900 border-t border-gray-300 pt-2 w-48">
                {managerName || 'Store Manager'}
              </div>
            </div>

            <div className="flex flex-col items-center justify-between min-h-[140px]">
              <div>
                <p className="font-black text-xs uppercase tracking-wider text-[#007c76]">CHUYÊN GIA ĐÁNH GIÁ TRƯỞNG (LEAD AUDITOR)</p>
                <p className="text-[11px] text-gray-500 italic mt-0.5">(Ký &amp; ghi rõ họ tên)</p>
              </div>
              <div className="font-bold text-xs text-gray-900 border-t border-gray-300 pt-2 w-48">
                {auditorName}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
export default FastStandardsAudit;
