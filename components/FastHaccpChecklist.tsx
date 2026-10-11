import React, { useState, useEffect, useMemo, useRef } from 'react';
import { db, auth } from '../firebase';
import { doc, setDoc, onSnapshot } from 'firebase/firestore';
import { useCloudSync } from '../utils/cloudSyncUtility';
import { useToast } from '../contexts/ToastContext';
import { 
  Building2, 
  FileText, 
  CheckCircle2, 
  AlertCircle, 
  Clock, 
  Search, 
  Printer, 
  Download, 
  Copy, 
  RotateCcw, 
  ChevronDown, 
  ChevronUp, 
  Plus, 
  Trash2, 
  Edit3, 
  Check, 
  FileSpreadsheet, 
  Send,
  Calendar,
  Layers,
  Shield,
  HelpCircle,
  MapPin,
  User,
  Share2,
  Cloud,
  Database,
  Upload,
  AlertTriangle,
  XCircle,
  ShieldCheck,
  ShieldAlert,
  Sliders,
  Code
} from 'lucide-react';

interface LocalSyncInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'value' | 'onCommit'> {
  value: string;
  onCommit: (val: string) => void;
  className?: string;
}

const LocalSyncInput: React.FC<LocalSyncInputProps> = ({ value, onCommit, className, ...props }) => {
  const [localVal, setLocalVal] = useState(value);
  const isFocused = useRef(false);

  useEffect(() => {
    if (!isFocused.current) {
      setLocalVal(value);
    }
  }, [value]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      onCommit(localVal);
    }
  };

  const handleFocus = () => {
    isFocused.current = true;
  };

  const handleBlur = () => {
    isFocused.current = false;
    onCommit(localVal);
  };

  return (
    <input
      {...props}
      value={localVal}
      onChange={(e) => setLocalVal(e.target.value)}
      onKeyDown={handleKeyDown}
      onFocus={handleFocus}
      onBlur={handleBlur}
      className={className}
    />
  );
};

export interface HaccpChecklistItem {
  id: string;
  code: string;
  group: 'preliminary' | 'principles' | 'prp' | 'custom';
  groupLabel: string;
  category: string;
  standard: string;
  defectDesc: string;
  isCcp?: boolean;
  severity: 'Critical' | 'Major' | 'Minor';
  legalRef?: string;
}

export interface HaccpItemState {
  status: 'pass' | 'fail' | 'na' | 'pending';
  note: string;
  capa: string;
  deadline?: string;
  personInCharge?: string;
}

export interface SavedHaccpRecord {
  id: string;
  facilityName: string;
  teamLeader: string;
  auditorName: string;
  auditDate: string;
  productScope: string;
  contactPhone: string;
  facilityAddress: string;
  itemsState: Record<string, HaccpItemState>;
  customItems?: HaccpChecklistItem[];
  totalScore: number;
  passCount: number;
  failCount: number;
  criticalFailCount: number;
  status: 'Đạt chuẩn HACCP' | 'Cần hành động khắc phục (CAPA)' | 'Đang đánh giá';
  updatedAt: string;
}

// 12 Bước & 7 Nguyên tắc HACCP Codex & TCVN chuẩn mực
const DEFAULT_HACCP_ITEMS: HaccpChecklistItem[] = [
  // 5 BƯỚC SƠ BỘ (PRELIMINARY STEPS)
  {
    id: 'H-STEP1',
    code: 'B01',
    group: 'preliminary',
    groupLabel: '5 Bước Sơ Bộ HACCP',
    category: '1. Thành lập Đội HACCP',
    standard: 'Đội HACCP được thành lập bằng văn bản quyết định, bao gồm đủ các thành viên đa chức năng (Sản xuất, QA/QC, Bảo trì, Kho, Vệ sinh) và có chứng chỉ đào tạo HACCP.',
    defectDesc: 'Không có quyết định thành lập đội HACCP, thiếu thành phần chuyên môn hoặc thành viên chưa qua đào tạo nhận thức & đánh giá HACCP.',
    severity: 'Major',
    legalRef: 'Codex HACCP Step 1 / TCVN 5603'
  },
  {
    id: 'H-STEP2',
    code: 'B02',
    group: 'preliminary',
    groupLabel: '5 Bước Sơ Bộ HACCP',
    category: '2. Mô tả sản phẩm',
    standard: 'Bản mô tả sản phẩm đầy đủ thành phần nguyên liệu, tính chất lý hóa (pH, aw, độ ẩm), quy cách bao gói, điều kiện bảo quản, hạn sử dụng và phương thức phân phối.',
    defectDesc: 'Bản mô tả sản phẩm sơ sài, thiếu các thông số an toàn thực phẩm trọng yếu hoặc không cập nhật khi thay đổi công thức/nguyên liệu.',
    severity: 'Major',
    legalRef: 'Codex HACCP Step 2'
  },
  {
    id: 'H-STEP3',
    code: 'B03',
    group: 'preliminary',
    groupLabel: '5 Bước Sơ Bộ HACCP',
    category: '3. Xác định mục đích sử dụng',
    standard: 'Xác định rõ mục đích sử dụng sản phẩm (dùng ngay, qua nấu chín...) và đối tượng người tiêu dùng dự kiến, đặc biệt các nhóm nhạy cảm (trẻ em, người già, người dị ứng).',
    defectDesc: 'Không xác định đối tượng người tiêu dùng hoặc không cảnh báo thành phần gây dị ứng trên nhãn mác sản phẩm.',
    severity: 'Major',
    legalRef: 'Codex HACCP Step 3'
  },
  {
    id: 'H-STEP4',
    code: 'B04',
    group: 'preliminary',
    groupLabel: '5 Bước Sơ Bộ HACCP',
    category: '4. Thiết lập sơ đồ quy trình',
    standard: 'Sơ đồ lưu trình công nghệ bao quát toàn bộ các bước từ tiếp nhận nguyên liệu, sơ chế, chế biến, đóng gói, bảo quản đến xuất xưởng, bao gồm dòng vào và dòng thải.',
    defectDesc: 'Sơ đồ công nghệ thiếu bước gia công, bỏ sót đường hồi lưu nguyên liệu hoặc không thể hiện các điểm kiểm soát chất lượng.',
    severity: 'Major',
    legalRef: 'Codex HACCP Step 4'
  },
  {
    id: 'H-STEP5',
    code: 'B05',
    group: 'preliminary',
    groupLabel: '5 Bước Sơ Bộ HACCP',
    category: '5. Thẩm tra sơ đồ tại hiện trường',
    standard: 'Đội HACCP đã kiểm tra, đối chiếu và thẩm tra thực địa sơ đồ lưu trình tại từng công đoạn trong mọi ca sản xuất, có biên bản xác nhận ký duyệt.',
    defectDesc: 'Sơ đồ trên giấy không khớp với mặt bằng thực tế hoặc chưa thẩm tra thực địa khi có sự cải tiến thiết bị.',
    severity: 'Major',
    legalRef: 'Codex HACCP Step 5'
  },

  // 7 NGUYÊN TẮC HACCP (HACCP PRINCIPLES)
  {
    id: 'H-PRIN1',
    code: 'NT01',
    group: 'principles',
    groupLabel: '7 Nguyên Tắc Cốt Lõi',
    category: 'Nguyên tắc 1: Phân tích mối nguy',
    standard: 'Bảng phân tích mối nguy liệt kê toàn diện các mối nguy Sinh học (B), Hóa học (C), Vật lý (P), Dị ứng (A) ở từng bước, đánh giá mức độ nghiêm trọng & khả năng xảy ra.',
    defectDesc: 'Bỏ sót mối nguy vi sinh vật gây bệnh, tồn dư hóa chất BVTV/kim loại nặng hoặc thiếu biện pháp kiểm soát tương ứng.',
    severity: 'Critical',
    legalRef: 'Codex Principle 1'
  },
  {
    id: 'H-PRIN2',
    code: 'NT02',
    group: 'principles',
    groupLabel: '7 Nguyên Tắc Cốt Lõi',
    category: 'Nguyên tắc 2: Xác định điểm CCP',
    standard: 'Sử dụng Cây quyết định CCP (CCP Decision Tree) để xác định chuẩn xác các Điểm kiểm soát tới hạn. Hồ sơ thể hiện rõ lý do chọn hoặc không chọn CCP.',
    defectDesc: 'Xác định sai điểm CCP (thiếu điểm tới hạn diệt khuẩn hoặc lạm dụng quá nhiều điểm không kiểm soát nổi).',
    isCcp: true,
    severity: 'Critical',
    legalRef: 'Codex Principle 2'
  },
  {
    id: 'H-PRIN3',
    code: 'NT03',
    group: 'principles',
    groupLabel: '7 Nguyên Tắc Cốt Lõi',
    category: 'Nguyên tắc 3: Thiết lập Giới hạn tới hạn',
    standard: 'Mỗi CCP có các Giới hạn tới hạn (Critical Limits) định lượng rõ ràng (Nhiệt độ tâm >= 75°C, Thời gian >= 3 phút, Nhiệt độ kho lạnh <= 4°C, v.v.) có căn cứ khoa học/pháp lý.',
    defectDesc: 'Giới hạn tới hạn định tính mơ hồ, không đo lường được hoặc không đủ cơ sở chứng minh tiêu diệt được mối nguy.',
    isCcp: true,
    severity: 'Critical',
    legalRef: 'Codex Principle 3'
  },
  {
    id: 'H-PRIN4',
    code: 'NT04',
    group: 'principles',
    groupLabel: '7 Nguyên Tắc Cốt Lõi',
    category: 'Nguyên tắc 4: Hệ thống giám sát CCP',
    standard: 'Quy định cụ thể: Giám sát cái gì (What), bằng cách nào (How), tần suất bao lâu (Frequency), và ai là người chịu trách nhiệm giám sát ký xác nhận (Who).',
    defectDesc: 'Nhật ký giám sát CCP bị bỏ trống, tần suất giám sát gián đoạn hoặc người giám sát chưa được huấn luyện vận hành thiết bị đo.',
    isCcp: true,
    severity: 'Critical',
    legalRef: 'Codex Principle 4'
  },
  {
    id: 'H-PRIN5',
    code: 'NT05',
    group: 'principles',
    groupLabel: '7 Nguyên Tắc Cốt Lõi',
    category: 'Nguyên tắc 5: Hành động khắc phục (CAPA)',
    standard: 'Quy trình CAPA quy định rõ hành động xử lý tức thời khi CCP vượt ngưỡng: cô lập lô hàng không phù hợp, hiệu chỉnh thiết bị, xác định nguyên nhân gốc rễ và phê duyệt xuất hủy/tái chế.',
    defectDesc: 'Khi xảy ra sự cố vượt ngưỡng an toàn, cơ sở không cô lập sản phẩm hoặc để lọt sản phẩm lỗi ra thị trường mà không ghi chép.',
    isCcp: true,
    severity: 'Critical',
    legalRef: 'Codex Principle 5'
  },
  {
    id: 'H-PRIN6',
    code: 'NT06',
    group: 'principles',
    groupLabel: '7 Nguyên Tắc Cốt Lõi',
    category: 'Nguyên tắc 6: Thủ tục thẩm tra (Verification)',
    standard: 'Có lịch thẩm tra định kỳ: hiệu chuẩn nhiệt kế/áp kế/cân điện tử, gửi mẫu kiểm nghiệm vi sinh phòng Lab đạt chuẩn ISO 17025, và tổ chức đánh giá nội bộ tối thiểu 1 lần/năm.',
    defectDesc: 'Thiết bị đo CCP không có tem hiệu chuẩn, không có kết quả xét nghiệm định kỳ hoặc không thực hiện đánh giá nội bộ.',
    severity: 'Major',
    legalRef: 'Codex Principle 6'
  },
  {
    id: 'H-PRIN7',
    code: 'NT07',
    group: 'principles',
    groupLabel: '7 Nguyên Tắc Cốt Lõi',
    category: 'Nguyên tắc 7: Thiết lập hồ sơ & tài liệu',
    standard: 'Toàn bộ kế hoạch HACCP, SOP, SSOP, biểu mẫu giám sát CCP, báo cáo thẩm tra và hồ sơ đào tạo được lưu trữ ngăn nắp, dễ truy xuất và bảo lưu tối thiểu 2 năm.',
    defectDesc: 'Hồ sơ ghi chép hồi tố (chép bù số liệu), thất lạc nhật ký giám sát CCP hoặc không có người có thẩm quyền ký soát xét.',
    severity: 'Major',
    legalRef: 'Codex Principle 7'
  },

  // CHƯƠNG TRÌNH TIÊN QUYẾT PRP & VỆ SINH SSOP (PRE-REQUISITE PROGRAMS)
  {
    id: 'H-PRP1',
    code: 'PRP01',
    group: 'prp',
    groupLabel: 'Chương Trình Tiên Quyết (PRP/SSOP)',
    category: 'An toàn nguồn nước & Nước đá',
    standard: 'Nguồn nước tiếp xúc trực tiếp với thực phẩm và làm đá viên đạt chuẩn QCVN 01-1:2018/BYT, có kết quả xét nghiệm hóa lý & vi sinh định kỳ 6 tháng/lần.',
    defectDesc: 'Không có phiếu kiểm nghiệm nước định kỳ hoặc hệ thống lọc nước/bồn chứa không được súc rửa bảo dưỡng theo lịch.',
    severity: 'Critical',
    legalRef: 'QCVN 01-1:2018/BYT'
  },
  {
    id: 'H-PRP2',
    code: 'PRP02',
    group: 'prp',
    groupLabel: 'Chương Trình Tiên Quyết (PRP/SSOP)',
    category: 'Vệ sinh bề mặt tiếp xúc & Dụng cụ',
    standard: 'Các bề mặt tiếp xúc trực tiếp thực phẩm (thớt, bàn inox, dao kéo, băng tải) làm từ vật liệu an toàn, không rỉ sét, được vệ sinh và khử trùng đúng nồng độ trước và sau ca.',
    defectDesc: 'Thớt gỗ mục nát, bàn chế biến bám cặn hữu cơ tích tụ hoặc không có quy trình khử trùng dụng cụ giữa các công đoạn chín - sống.',
    severity: 'Major',
    legalRef: 'SSOP 2 / Luật ATTP'
  },
  {
    id: 'H-PRP3',
    code: 'PRP03',
    group: 'prp',
    groupLabel: 'Chương Trình Tiên Quyết (PRP/SSOP)',
    category: 'Ngăn ngừa nhiễm chéo',
    standard: 'Bố trí mặt bằng nguyên tắc một chiều: phân chia tách biệt tuyệt đối giữa khu sơ chế sống, chế biến nhiệt, làm nguội và đóng gói thành phẩm. Luồng khí sạch và thoát nước phù hợp.',
    defectDesc: 'Đường đi của nguyên liệu sống cắt ngang thành phẩm chín, nhân viên khu bẩn tự do đi vào khu sạch gây nhiễm chéo vi sinh.',
    severity: 'Critical',
    legalRef: 'SSOP 3'
  },
  {
    id: 'H-PRP4',
    code: 'PRP04',
    group: 'prp',
    groupLabel: 'Chương Trình Tiên Quyết (PRP/SSOP)',
    category: 'Vệ sinh cá nhân & Sức khỏe nhân sự',
    standard: 'Nhân viên mặc đầy đủ BHLĐ (nón trùm tóc, khẩu trang, tạp dề, găng tay khi tiếp xúc trực tiếp thực phẩm ăn ngay), rửa tay đúng quy trình, có thẻ xanh khám sức khỏe còn hạn.',
    defectDesc: 'Nhân viên đeo trang sức khi chế biến, không đeo khẩu trang/trùm tóc hoặc có vết thương hở tiếp xúc với thực phẩm.',
    severity: 'Major',
    legalRef: 'SSOP 4'
  },
  {
    id: 'H-PRP5',
    code: 'PRP05',
    group: 'prp',
    groupLabel: 'Chương Trình Tiên Quyết (PRP/SSOP)',
    category: 'Kiểm soát côn trùng & Động vật gây hại (Pest Control)',
    standard: 'Cơ sở có hợp đồng kiểm soát côn trùng hoặc quy trình bẫy đèn diệt ruồi muỗi, bẫy chuột, lưới chắn côn trùng tại cửa sổ/lỗ thông gió, sơ đồ bẫy và nhật ký theo dõi.',
    defectDesc: 'Phát hiện phân chuột, gián hoặc xác côn trùng trong khu vực chế biến; cửa thông gió không có lưới chắn côn trùng.',
    severity: 'Critical',
    legalRef: 'SSOP 8 / Codex'
  },
  {
    id: 'H-PRP6',
    code: 'PRP06',
    group: 'prp',
    groupLabel: 'Chương Trình Tiên Quyết (PRP/SSOP)',
    category: 'Kiểm soát nguyên liệu đầu vào & Truy xuất',
    standard: 'Nguyên liệu thực phẩm có hóa đơn chứng từ chứng minh nguồn gốc rõ ràng, kiểm tra cảm quan & nhiệt độ tiếp nhận, nhãn mác đầy đủ và mã lô truy xuất ngược được trong 24 giờ.',
    defectDesc: 'Nguyên liệu không rõ nguồn gốc, hết hạn sử dụng hoặc không thể truy xuất nguồn gốc nhà cung cấp khi xảy ra sự cố.',
    severity: 'Critical',
    legalRef: 'Nghị định 15/2018/NĐ-CP'
  }
];

const getTodayDateString = () => {
  const today = new Date();
  const y = today.getFullYear();
  const m = String(today.getMonth() + 1).padStart(2, '0');
  const d = String(today.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

export const FastHaccpChecklist: React.FC = () => {
  const { success: showSuccessToast, error: showErrorToast, warning: showWarningToast } = useToast();

  const [activeTab, setActiveTab] = useState<'audit' | 'database' | 'report'>('audit');
  const [activeGroupFilter, setActiveGroupFilter] = useState<'all' | 'preliminary' | 'principles' | 'prp' | 'custom'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pass' | 'fail' | 'na' | 'pending'>('all');
  
  // HTML Code Importer Modal State
  const [showImportModal, setShowImportModal] = useState(false);
  const [htmlInputCode, setHtmlInputCode] = useState('');
  const [importSummary, setImportSummary] = useState<string | null>(null);

  // Facility Metadata
  const [facilityName, setFacilityName] = useState('Nhà máy / Cơ sở Chế biến Thực phẩm FAST');
  const [teamLeader, setTeamLeader] = useState('');
  const [auditorName, setAuditorName] = useState('Chuyên gia HACCP FAST');
  const [auditDate, setAuditDate] = useState(getTodayDateString());
  const [productScope, setProductScope] = useState('Sản xuất & Chế biến Thực phẩm ăn ngay / Đóng gói');
  const [contactPhone, setContactPhone] = useState('');
  const [facilityAddress, setFacilityAddress] = useState('');

  // Item states: record of itemId -> state
  const [itemsState, setItemsState] = useState<Record<string, HaccpItemState>>({});
  const [customItems, setCustomItems] = useState<HaccpChecklistItem[]>([]);

  // Cloud Sync for Database (Saved Audits History)
  const [database, setDatabase, isDbSaving, dbSyncStatus] = useCloudSync<SavedHaccpRecord[]>(
    'fast_haccp_crm',
    'database',
    'FAST_HACCP_DATABASE_HISTORY_V1',
    []
  );

  // Cloud Sync for Active Form Session
  const [activeSession, setActiveSession, isSessionSaving, sessionSyncStatus] = useCloudSync<{
    facilityName: string;
    teamLeader: string;
    auditorName: string;
    auditDate: string;
    productScope: string;
    contactPhone: string;
    facilityAddress: string;
    itemsState: Record<string, HaccpItemState>;
    customItems: HaccpChecklistItem[];
  }>(
    'fast_haccp_crm',
    'active_session',
    'FAST_HACCP_ACTIVE_SESSION_V1',
    {
      facilityName: 'Nhà máy / Cơ sở Chế biến Thực phẩm FAST',
      teamLeader: '',
      auditorName: 'Chuyên gia HACCP FAST',
      auditDate: getTodayDateString(),
      productScope: 'Sản xuất & Chế biến Thực phẩm ăn ngay / Đóng gói',
      contactPhone: '',
      facilityAddress: '',
      itemsState: {},
      customItems: []
    }
  );

  // Sync back from activeSession on initial load
  useEffect(() => {
    if (activeSession) {
      if (activeSession.facilityName) setFacilityName(activeSession.facilityName);
      if (activeSession.teamLeader) setTeamLeader(activeSession.teamLeader);
      if (activeSession.auditorName) setAuditorName(activeSession.auditorName);
      if (activeSession.auditDate) setAuditDate(activeSession.auditDate);
      if (activeSession.productScope) setProductScope(activeSession.productScope);
      if (activeSession.contactPhone) setContactPhone(activeSession.contactPhone);
      if (activeSession.facilityAddress) setFacilityAddress(activeSession.facilityAddress);
      if (activeSession.itemsState) setItemsState(activeSession.itemsState);
      if (activeSession.customItems && Array.isArray(activeSession.customItems)) {
        setCustomItems(activeSession.customItems);
      }
    }
  }, [activeSession]);

  // Save changes to activeSession debounced
  const triggerActiveSessionSave = () => {
    setActiveSession({
      facilityName,
      teamLeader,
      auditorName,
      auditDate,
      productScope,
      contactPhone,
      facilityAddress,
      itemsState,
      customItems
    });
  };

  // Combined Items
  const allItems = useMemo(() => {
    return [...DEFAULT_HACCP_ITEMS, ...customItems];
  }, [customItems]);

  // Statistics calculation
  const stats = useMemo(() => {
    let pass = 0;
    let fail = 0;
    let criticalFail = 0;
    let na = 0;
    let pending = 0;

    allItems.forEach(item => {
      const state = itemsState[item.id];
      if (!state || state.status === 'pending') {
        pending++;
      } else if (state.status === 'pass') {
        pass++;
      } else if (state.status === 'fail') {
        fail++;
        if (item.severity === 'Critical') criticalFail++;
      } else if (state.status === 'na') {
        na++;
      }
    });

    const evaluated = pass + fail;
    const score = evaluated > 0 ? Math.round((pass / evaluated) * 100) : 100;
    const isPassed = criticalFail === 0 && score >= 85;

    return {
      total: allItems.length,
      pass,
      fail,
      criticalFail,
      na,
      pending,
      score,
      isPassed
    };
  }, [allItems, itemsState]);

  // Handlers for Checklist State
  const setItemStatus = (itemId: string, status: 'pass' | 'fail' | 'na' | 'pending') => {
    setItemsState(prev => {
      const updated = {
        ...prev,
        [itemId]: {
          ...(prev[itemId] || { note: '', capa: '' }),
          status
        }
      };
      return updated;
    });
    setTimeout(triggerActiveSessionSave, 100);
  };

  const setItemNote = (itemId: string, note: string) => {
    setItemsState(prev => ({
      ...prev,
      [itemId]: {
        ...(prev[itemId] || { status: 'pending', capa: '' }),
        note
      }
    }));
    setTimeout(triggerActiveSessionSave, 300);
  };

  const setItemCapa = (itemId: string, capa: string) => {
    setItemsState(prev => ({
      ...prev,
      [itemId]: {
        ...(prev[itemId] || { status: 'pending', note: '' }),
        capa
      }
    }));
    setTimeout(triggerActiveSessionSave, 300);
  };

  // Quick Action: Mark all filtered as Pass
  const handleMarkAllFilteredPass = () => {
    setItemsState(prev => {
      const next = { ...prev };
      filteredItems.forEach(item => {
        next[item.id] = {
          ...(next[item.id] || { note: '', capa: '' }),
          status: 'pass'
        };
      });
      return next;
    });
    showSuccessToast('Đã đánh dấu Đạt cho toàn bộ mục đang hiển thị');
    setTimeout(triggerActiveSessionSave, 100);
  };

  // Reset form
  const handleResetForm = () => {
    if (window.confirm('Bạn có chắc chắn muốn làm mới toàn bộ bảng đánh giá HACCP này không?')) {
      setItemsState({});
      setFacilityName('Nhà máy / Cơ sở Chế biến Thực phẩm FAST');
      setTeamLeader('');
      setProductScope('Sản xuất & Chế biến Thực phẩm ăn ngay / Đóng gói');
      setContactPhone('');
      setFacilityAddress('');
      triggerActiveSessionSave();
      showSuccessToast('Đã làm mới form đánh giá HACCP');
    }
  };

  // Save to Database History
  const handleSaveToDatabase = () => {
    if (!facilityName.trim()) {
      showErrorToast('Vui lòng nhập tên cơ sở đánh giá');
      return;
    }

    const newRecord: SavedHaccpRecord = {
      id: `HACCP-${Date.now()}`,
      facilityName,
      teamLeader,
      auditorName,
      auditDate,
      productScope,
      contactPhone,
      facilityAddress,
      itemsState,
      customItems,
      totalScore: stats.score,
      passCount: stats.pass,
      failCount: stats.fail,
      criticalFailCount: stats.criticalFail,
      status: stats.criticalFail > 0 
        ? 'Cần hành động khắc phục (CAPA)' 
        : (stats.score >= 85 ? 'Đạt chuẩn HACCP' : 'Cần hành động khắc phục (CAPA)'),
      updatedAt: new Date().toLocaleString('vi-VN')
    };

    setDatabase(prev => [newRecord, ...(prev || [])]);
    showSuccessToast(`Đã lưu kết quả kiểm toán HACCP cho cơ sở: ${facilityName}`);
    setActiveTab('database');
  };

  // Load Record from Database
  const handleLoadRecord = (record: SavedHaccpRecord) => {
    setFacilityName(record.facilityName || '');
    setTeamLeader(record.teamLeader || '');
    setAuditorName(record.auditorName || '');
    setAuditDate(record.auditDate || getTodayDateString());
    setProductScope(record.productScope || '');
    setContactPhone(record.contactPhone || '');
    setFacilityAddress(record.facilityAddress || '');
    setItemsState(record.itemsState || {});
    if (record.customItems) {
      setCustomItems(record.customItems);
    }
    showSuccessToast(`Đã tải hồ sơ: ${record.facilityName}`);
    setActiveTab('audit');
    setTimeout(triggerActiveSessionSave, 200);
  };

  // Delete Record from Database
  const handleDeleteRecord = (id: string) => {
    if (window.confirm('Xóa bản lưu kiểm toán này khỏi cơ sở dữ liệu?')) {
      setDatabase(prev => (prev || []).filter(item => item.id !== id));
      showSuccessToast('Đã xóa bản ghi kiểm toán');
    }
  };

  // Print view
  const handlePrint = () => {
    window.print();
  };

  // Intelligent HTML Checklist Importer Parser
  const handleImportHtml = () => {
    if (!htmlInputCode.trim()) {
      showErrorToast('Vui lòng dán mã HTML checklist vào khung bên dưới');
      return;
    }

    try {
      const parser = new DOMParser();
      const doc = parser.parseFromString(htmlInputCode, 'text/html');

      const extractedItems: HaccpChecklistItem[] = [];
      const extractedStates: Record<string, HaccpItemState> = {};

      // 1. Try finding table rows <tr>
      const rows = doc.querySelectorAll('tr');
      if (rows && rows.length > 0) {
        let counter = 1;
        rows.forEach(row => {
          const cells = row.querySelectorAll('td, th');
          if (cells.length >= 2) {
            const firstText = cells[0].textContent?.trim() || '';
            const secondText = cells[1].textContent?.trim() || '';
            const thirdText = cells.length > 2 ? cells[2].textContent?.trim() : '';

            // Skip obvious headers
            if (firstText.toLowerCase().includes('stt') || firstText.toLowerCase().includes('tiêu chuẩn') || firstText.toLowerCase().includes('nội dung')) {
              return;
            }

            if (secondText.length > 3 || firstText.length > 3) {
              const code = `CUSTOM-${String(counter).padStart(2, '0')}`;
              const standard = secondText.length > 3 ? secondText : firstText;
              const category = cells.length > 2 && thirdText ? thirdText : 'Tiêu chuẩn từ HTML';

              // Check if checkbox exists in row
              const checkbox = row.querySelector('input[type="checkbox"]');
              const isChecked = checkbox ? (checkbox as HTMLInputElement).checked : false;

              extractedItems.push({
                id: `H-IMPORT-${counter}-${Date.now()}`,
                code,
                group: 'custom',
                groupLabel: 'Danh mục nhập từ HTML',
                category: category.slice(0, 50),
                standard,
                defectDesc: 'Không tuân thủ yêu cầu kiểm soát theo biểu mẫu checklist nhập.',
                severity: 'Major',
                legalRef: 'Biểu mẫu nhập người dùng'
              });

              if (isChecked) {
                extractedStates[`H-IMPORT-${counter}-${Date.now()}`] = {
                  status: 'pass',
                  note: 'Đã tích chọn trong file HTML gốc',
                  capa: ''
                };
              }

              counter++;
            }
          }
        });
      }

      // 2. If table rows yielded few items, try list items <li> or elements with checkboxes
      if (extractedItems.length === 0) {
        const listItems = doc.querySelectorAll('li, div.item, div.checklist-item, label');
        let counter = 1;
        listItems.forEach(el => {
          const text = el.textContent?.trim() || '';
          if (text.length > 10 && text.length < 300) {
            const code = `IMP-${String(counter).padStart(2, '0')}`;
            const checkbox = el.querySelector('input[type="checkbox"]');
            const isChecked = checkbox ? (checkbox as HTMLInputElement).checked : false;
            const itemId = `H-IMPORT-${counter}-${Date.now()}`;

            extractedItems.push({
              id: itemId,
              code,
              group: 'custom',
              groupLabel: 'Danh mục nhập từ HTML',
              category: 'Mục kiểm tra nhập từ HTML',
              standard: text,
              defectDesc: 'Chưa đạt yêu cầu theo danh mục kiểm tra đính kèm.',
              severity: 'Major',
              legalRef: 'File HTML đính kèm'
            });

            if (isChecked) {
              extractedStates[itemId] = {
                status: 'pass',
                note: 'Tích chọn trong file',
                capa: ''
              };
            }

            counter++;
          }
        });
      }

      if (extractedItems.length === 0) {
        showWarningToast('Không tìm thấy cấu trúc bảng/danh sách chuẩn trong đoạn HTML. Đã chuyển sang thêm nội dung mẫu.');
        return;
      }

      // Merge into customItems and itemsState
      setCustomItems(prev => [...prev, ...extractedItems]);
      setItemsState(prev => ({ ...prev, ...extractedStates }));
      setImportSummary(`Đã nạp thành công ${extractedItems.length} tiêu chuẩn kiểm tra từ file HTML vào hệ thống!`);
      showSuccessToast(`Đã nạp ${extractedItems.length} mục kiểm tra từ HTML`);
      setShowImportModal(false);
      setHtmlInputCode('');
      setTimeout(triggerActiveSessionSave, 200);
    } catch (err) {
      console.error('Lỗi khi phân tích mã HTML:', err);
      showErrorToast('Lỗi phân tích mã HTML. Vui lòng kiểm tra lại định dạng tệp.');
    }
  };

  // Filtered items
  const filteredItems = useMemo(() => {
    return allItems.filter(item => {
      // Group filter
      if (activeGroupFilter !== 'all' && item.group !== activeGroupFilter) {
        return false;
      }

      // Status filter
      if (statusFilter !== 'all') {
        const itemState = itemsState[item.id];
        const currentStatus = itemState?.status || 'pending';
        if (currentStatus !== statusFilter) return false;
      }

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchCode = item.code.toLowerCase().includes(q);
        const matchCategory = item.category.toLowerCase().includes(q);
        const matchStd = item.standard.toLowerCase().includes(q);
        const matchLegal = item.legalRef ? item.legalRef.toLowerCase().includes(q) : false;
        if (!matchCode && !matchCategory && !matchStd && !matchLegal) return false;
      }

      return true;
    });
  }, [allItems, activeGroupFilter, statusFilter, searchQuery, itemsState]);

  return (
    <div className="space-y-6">
      {/* 1. Header Hero Banner (Screen Only) */}
      <div className="fast-audit-screen-only bg-gradient-to-br from-[#005c56] via-[#006e66] to-[#007c76] rounded-3xl p-6 md:p-8 text-white shadow-xl relative overflow-hidden border border-teal-500/20">
        <div className="absolute top-0 right-0 w-96 h-96 bg-white/5 rounded-full blur-3xl -mr-24 -mt-24 pointer-events-none"></div>
        <div className="relative z-10 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-xl bg-teal-400/20 border border-teal-300/30 text-teal-200 text-xs font-black uppercase tracking-wider shadow-xs">
              <ShieldCheck className="w-3.5 h-3.5 text-teal-300" />
              <span>Tiêu Chuẩn Quốc Tế Codex & TCVN</span>
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
              <span className="text-white/80">{sessionSyncStatus}</span>
            </div>
            <h1 className="text-2xl md:text-3xl font-black uppercase tracking-tight text-white flex items-center gap-3">
              HACCP Checklist & Thẩm Tra An Toàn
            </h1>
            <p className="text-teal-100/90 text-xs md:text-sm font-medium max-w-2xl leading-relaxed">
              Hệ thống thẩm tra toàn diện 12 bước & 7 nguyên tắc cốt lõi, xác định điểm kiểm soát tới hạn (CCP) và giám sát chương trình tiên quyết (PRP / SSOP).
            </p>
          </div>

          {/* Quick Actions */}
          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            <button
              onClick={() => setShowImportModal(true)}
              className="px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 text-white font-bold text-xs uppercase tracking-wider transition-all flex items-center gap-2 shadow-xs cursor-pointer active:scale-95"
              title="Nhập dữ liệu bảng kiểm từ file HTML"
            >
              <Code className="w-4 h-4 text-teal-300" />
              <span>Nhập Mã HTML</span>
            </button>

            <button
              onClick={handleSaveToDatabase}
              className="px-4 py-2.5 rounded-xl bg-teal-400 hover:bg-teal-300 text-teal-950 font-black text-xs uppercase tracking-wider transition-all flex items-center gap-2 shadow-lg shadow-teal-950/20 active:scale-95 cursor-pointer"
            >
              <Database className="w-4 h-4" />
              <span>Lưu Cơ Sở Dữ Liệu</span>
            </button>

            <button
              onClick={handlePrint}
              className="px-3.5 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 text-white font-bold text-xs transition-all flex items-center gap-1.5 cursor-pointer active:scale-95"
              title="In phiếu thẩm tra"
            >
              <Printer className="w-4 h-4" />
              <span className="hidden sm:inline">In Phiếu</span>
            </button>
          </div>
        </div>

        {/* Real-time KPI Stats Bar */}
        <div className="mt-6 pt-6 border-t border-white/10 grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3 text-center">
          <div className="bg-white/10 backdrop-blur-xs rounded-2xl p-3 border border-white/10">
            <span className="text-[10px] font-bold text-teal-200 uppercase tracking-wider block">Điểm Tuân Thủ</span>
            <span className={`text-xl sm:text-2xl font-black ${stats.score >= 85 ? 'text-emerald-300' : 'text-amber-300'}`}>
              {stats.score}%
            </span>
          </div>

          <div className="bg-white/10 backdrop-blur-xs rounded-2xl p-3 border border-white/10">
            <span className="text-[10px] font-bold text-teal-200 uppercase tracking-wider block">Đạt Chuẩn</span>
            <span className="text-xl sm:text-2xl font-black text-emerald-300">
              {stats.pass} <span className="text-xs font-normal text-white/60">/{stats.total}</span>
            </span>
          </div>

          <div className="bg-white/10 backdrop-blur-xs rounded-2xl p-3 border border-white/10">
            <span className="text-[10px] font-bold text-teal-200 uppercase tracking-wider block">Lỗi Cần CAPA</span>
            <span className={`text-xl sm:text-2xl font-black ${stats.fail > 0 ? 'text-rose-300' : 'text-white'}`}>
              {stats.fail}
            </span>
          </div>

          <div className="bg-white/10 backdrop-blur-xs rounded-2xl p-3 border border-white/10">
            <span className="text-[10px] font-bold text-teal-200 uppercase tracking-wider block">Lỗi Trọng Yếu CCP</span>
            <span className={`text-xl sm:text-2xl font-black ${stats.criticalFail > 0 ? 'text-red-400 animate-pulse' : 'text-white'}`}>
              {stats.criticalFail}
            </span>
          </div>

          <div className="bg-white/10 backdrop-blur-xs rounded-2xl p-3 border border-white/10">
            <span className="text-[10px] font-bold text-teal-200 uppercase tracking-wider block">Chưa Đánh Giá</span>
            <span className="text-xl sm:text-2xl font-black text-white/90">
              {stats.pending}
            </span>
          </div>

          <div className="bg-white/10 backdrop-blur-xs rounded-2xl p-3 border border-white/10 col-span-2 sm:col-span-1">
            <span className="text-[10px] font-bold text-teal-200 uppercase tracking-wider block">Kết Luận</span>
            <span className={`text-xs sm:text-sm font-black block mt-1 ${stats.isPassed ? 'text-emerald-300' : 'text-amber-300'}`}>
              {stats.isPassed ? 'ĐẠT CHUẨN HACCP' : 'CẦN KHẮC PHỤC'}
            </span>
          </div>
        </div>
      </div>

      {/* 2. Navigation Tabs (Screen Only) */}
      <div className="fast-audit-screen-only bg-white p-2 rounded-2xl border border-gray-200 shadow-xs flex items-center justify-between gap-2 overflow-x-auto custom-scrollbar">
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setActiveTab('audit')}
            className={`px-4 py-2.5 rounded-xl font-black text-xs uppercase tracking-wider transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === 'audit'
                ? 'bg-[#007c76] text-white shadow-md shadow-teal-700/20'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            <Sliders className="w-4 h-4" />
            <span>Bảng Kiểm Toán ({allItems.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('database')}
            className={`px-4 py-2.5 rounded-xl font-black text-xs uppercase tracking-wider transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === 'database'
                ? 'bg-[#007c76] text-white shadow-md shadow-teal-700/20'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            <Database className="w-4 h-4" />
            <span>Lịch Sử Hồ Sơ ({database?.length || 0})</span>
          </button>

          <button
            onClick={() => setActiveTab('report')}
            className={`px-4 py-2.5 rounded-xl font-black text-xs uppercase tracking-wider transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === 'report'
                ? 'bg-amber-600 text-white shadow-md shadow-amber-600/20'
                : 'text-amber-900 bg-amber-50 hover:bg-amber-100 border border-amber-200'
            }`}
          >
            <FileText className="w-4 h-4" />
            <span>Báo Cáo Thẩm Tra & CAPA</span>
          </button>
        </div>

        {/* Global Reset Button */}
        <button
          onClick={handleResetForm}
          className="px-3 py-2 rounded-xl text-gray-500 hover:text-rose-600 hover:bg-rose-50 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shrink-0"
          title="Làm mới phiếu đánh giá hiện tại"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span className="hidden md:inline">Làm mới form</span>
        </button>
      </div>

      {/* TAB 1: BẢNG KIỂM TOÁN CHÍNH */}
      {activeTab === 'audit' && (
        <div className="space-y-6">
          {/* Facility Info Card */}
          <div className="fast-audit-screen-only bg-white p-5 md:p-6 rounded-3xl border border-gray-200 shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <h3 className="text-sm font-black text-gray-800 uppercase tracking-wide flex items-center gap-2">
                <Building2 className="w-4 h-4 text-[#007c76]" />
                <span>Thông Tin Cơ Sở & Phạm Vi Đánh Giá HACCP</span>
              </h3>
              <span className="text-[11px] font-bold text-gray-400">Tự động đồng bộ đám mây</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <div>
                <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider block mb-1">
                  Tên Doanh Nghiệp / Cơ Sở
                </label>
                <LocalSyncInput
                  value={facilityName}
                  onCommit={(val) => {
                    setFacilityName(val);
                    triggerActiveSessionSave();
                  }}
                  placeholder="Ví dụ: Công ty TNHH Chế biến Thực phẩm FAST"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-gray-50 border border-gray-200 text-sm font-bold text-gray-800 focus:bg-white focus:border-[#007c76] focus:ring-2 focus:ring-[#007c76]/20 outline-none transition-all"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider block mb-1">
                  Đội Trưởng HACCP / Người Phụ Trách
                </label>
                <LocalSyncInput
                  value={teamLeader}
                  onCommit={(val) => {
                    setTeamLeader(val);
                    triggerActiveSessionSave();
                  }}
                  placeholder="Họ và tên người phụ trách an toàn"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-gray-50 border border-gray-200 text-sm font-bold text-gray-800 focus:bg-white focus:border-[#007c76] focus:ring-2 focus:ring-[#007c76]/20 outline-none transition-all"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider block mb-1">
                  Chuyên Viên / Đánh Giá Viên
                </label>
                <LocalSyncInput
                  value={auditorName}
                  onCommit={(val) => {
                    setAuditorName(val);
                    triggerActiveSessionSave();
                  }}
                  placeholder="Tên chuyên viên đánh giá"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-gray-50 border border-gray-200 text-sm font-bold text-gray-800 focus:bg-white focus:border-[#007c76] focus:ring-2 focus:ring-[#007c76]/20 outline-none transition-all"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider block mb-1">
                  Ngày Thực Hiện Đánh Giá
                </label>
                <input
                  type="date"
                  value={auditDate}
                  onChange={(e) => {
                    setAuditDate(e.target.value);
                    triggerActiveSessionSave();
                  }}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-gray-50 border border-gray-200 text-sm font-bold text-gray-800 focus:bg-white focus:border-[#007c76] focus:ring-2 focus:ring-[#007c76]/20 outline-none transition-all"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider block mb-1">
                  Số Điện Thoại Liên Hệ
                </label>
                <LocalSyncInput
                  value={contactPhone}
                  onCommit={(val) => {
                    setContactPhone(val);
                    triggerActiveSessionSave();
                  }}
                  placeholder="09xx xxx xxx"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-gray-50 border border-gray-200 text-sm font-bold text-gray-800 focus:bg-white focus:border-[#007c76] focus:ring-2 focus:ring-[#007c76]/20 outline-none transition-all"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider block mb-1">
                  Phạm Vi Sản Phẩm Áp Dụng
                </label>
                <LocalSyncInput
                  value={productScope}
                  onCommit={(val) => {
                    setProductScope(val);
                    triggerActiveSessionSave();
                  }}
                  placeholder="Dây chuyền chế biến, nhóm sản phẩm..."
                  className="w-full px-3.5 py-2.5 rounded-xl bg-gray-50 border border-gray-200 text-sm font-bold text-gray-800 focus:bg-white focus:border-[#007c76] focus:ring-2 focus:ring-[#007c76]/20 outline-none transition-all"
                />
              </div>
            </div>
          </div>

          {/* Filter Bar & Search */}
          <div className="fast-audit-screen-only bg-white p-4 rounded-2xl border border-gray-200 shadow-xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
            {/* Search Box */}
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Tìm kiếm theo mã (B01, NT02...), từ khóa tiêu chuẩn, CCP..."
                className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-gray-50 border border-gray-200 text-xs font-bold text-gray-700 focus:bg-white focus:border-[#007c76] outline-none transition-all"
              />
            </div>

            {/* Filter Buttons */}
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mr-1">Nhóm:</span>
              {[
                { id: 'all', label: 'Tất cả' },
                { id: 'preliminary', label: '5 Bước Sơ Bộ' },
                { id: 'principles', label: '7 Nguyên Tắc' },
                { id: 'prp', label: 'PRP & SSOP' },
                ...(customItems.length > 0 ? [{ id: 'custom', label: `Nhập HTML (${customItems.length})` }] : [])
              ].map(grp => (
                <button
                  key={grp.id}
                  onClick={() => setActiveGroupFilter(grp.id as any)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    activeGroupFilter === grp.id
                      ? 'bg-[#007c76] text-white shadow-2xs'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {grp.label}
                </button>
              ))}

              <button
                onClick={handleMarkAllFilteredPass}
                className="ml-2 px-3 py-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 text-xs font-black transition-all flex items-center gap-1 cursor-pointer"
                title="Đánh dấu toàn bộ mục đang lọc là Đạt"
              >
                <Check className="w-3.5 h-3.5" />
                <span>Đạt Tất Cả</span>
              </button>
            </div>
          </div>

          {/* Main Checklist Items Table */}
          <div className="bg-white rounded-3xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-gray-50/90 border-b border-gray-200 text-[11px] font-black text-gray-600 uppercase tracking-wider">
                    <th className="py-3.5 px-4 w-16 text-center">Mã</th>
                    <th className="py-3.5 px-4 w-44">Hạng Mục & Nhóm</th>
                    <th className="py-3.5 px-4 min-w-[280px]">Yêu Cầu Tiêu Chuẩn Chuẩn Mực</th>
                    <th className="py-3.5 px-4 w-28 text-center">Phân Loại</th>
                    <th className="py-3.5 px-4 w-52 text-center">Đánh Giá Hiện Trường</th>
                    <th className="py-3.5 px-4 min-w-[220px]">Ghi Chú & Khắc Phục (CAPA)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-150 text-xs">
                  {filteredItems.map((item, idx) => {
                    const state = itemsState[item.id] || { status: 'pending', note: '', capa: '' };
                    const isPassed = state.status === 'pass';
                    const isFailed = state.status === 'fail';
                    const isNa = state.status === 'na';

                    return (
                      <tr 
                        key={item.id} 
                        className={`transition-colors ${
                          isFailed 
                            ? 'bg-rose-50/40 hover:bg-rose-50/70' 
                            : isPassed 
                              ? 'bg-emerald-50/20 hover:bg-emerald-50/40' 
                              : 'hover:bg-gray-50/70'
                        }`}
                      >
                        {/* 1. Code Badge */}
                        <td className="py-4 px-3 text-center align-top">
                          <span className={`inline-block px-2 py-1 rounded-md font-black text-[11px] tracking-wide ${
                            item.isCcp 
                              ? 'bg-red-100 text-red-800 border border-red-300 ring-1 ring-red-400' 
                              : 'bg-teal-50 text-[#007c76] border border-teal-200'
                          }`}>
                            {item.code}
                          </span>
                          {item.isCcp && (
                            <span className="block mt-1 text-[9px] font-black text-red-600 uppercase tracking-tight">
                              CCP ⚠️
                            </span>
                          )}
                        </td>

                        {/* 2. Group & Category */}
                        <td className="py-4 px-4 align-top">
                          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-0.5">
                            {item.groupLabel}
                          </span>
                          <span className="font-black text-gray-900 block leading-snug">
                            {item.category}
                          </span>
                          {item.legalRef && (
                            <span className="text-[10px] text-teal-700 bg-teal-50 px-1.5 py-0.5 rounded mt-1 inline-block font-semibold">
                              {item.legalRef}
                            </span>
                          )}
                        </td>

                        {/* 3. Standard Description */}
                        <td className="py-4 px-4 align-top space-y-1.5">
                          <p className="font-bold text-gray-800 leading-relaxed">
                            {item.standard}
                          </p>
                          <div className="p-2 rounded-xl bg-gray-50 border border-gray-200/80 text-[11px] text-gray-500 leading-normal">
                            <span className="font-bold text-rose-700">Dấu hiệu lỗi: </span>
                            {item.defectDesc}
                          </div>
                        </td>

                        {/* 4. Severity Badge */}
                        <td className="py-4 px-4 align-top text-center">
                          <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${
                            item.severity === 'Critical'
                              ? 'bg-rose-100 text-rose-800 border border-rose-200'
                              : item.severity === 'Major'
                                ? 'bg-amber-100 text-amber-800 border border-amber-200'
                                : 'bg-blue-100 text-blue-800 border border-blue-200'
                          }`}>
                            {item.severity === 'Critical' && <AlertTriangle className="w-3 h-3 text-rose-600" />}
                            {item.severity}
                          </span>
                        </td>

                        {/* 5. Evaluation Buttons */}
                        <td className="py-4 px-4 align-top text-center">
                          <div className="grid grid-cols-3 gap-1.5">
                            <button
                              type="button"
                              onClick={() => setItemStatus(item.id, 'pass')}
                              className={`py-2 px-1 rounded-xl font-black text-[11px] transition-all flex flex-col items-center justify-center gap-1 cursor-pointer ${
                                isPassed
                                  ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/30 ring-2 ring-emerald-500'
                                  : 'bg-gray-100 text-gray-600 hover:bg-emerald-50 hover:text-emerald-700'
                              }`}
                            >
                              <CheckCircle2 className="w-4 h-4" />
                              <span>Đạt</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => setItemStatus(item.id, 'fail')}
                              className={`py-2 px-1 rounded-xl font-black text-[11px] transition-all flex flex-col items-center justify-center gap-1 cursor-pointer ${
                                isFailed
                                  ? 'bg-rose-600 text-white shadow-md shadow-rose-600/30 ring-2 ring-rose-500'
                                  : 'bg-gray-100 text-gray-600 hover:bg-rose-50 hover:text-rose-700'
                              }`}
                            >
                              <XCircle className="w-4 h-4" />
                              <span>Lỗi</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => setItemStatus(item.id, 'na')}
                              className={`py-2 px-1 rounded-xl font-black text-[11px] transition-all flex flex-col items-center justify-center gap-1 cursor-pointer ${
                                isNa
                                  ? 'bg-gray-700 text-white shadow-md'
                                  : 'bg-gray-100 text-gray-400 hover:bg-gray-200 hover:text-gray-700'
                              }`}
                            >
                              <span className="text-xs">N/A</span>
                              <span className="text-[9px]">K/A</span>
                            </button>
                          </div>
                        </td>

                        {/* 6. Notes & CAPA */}
                        <td className="py-4 px-4 align-top space-y-2">
                          <div>
                            <input
                              type="text"
                              value={state.note}
                              onChange={(e) => setItemNote(item.id, e.target.value)}
                              placeholder="Ghi chú hiện trường, bằng chứng..."
                              className="w-full px-2.5 py-1.5 rounded-lg bg-gray-50 border border-gray-200 text-xs text-gray-700 focus:bg-white focus:border-[#007c76] outline-none"
                            />
                          </div>

                          {(isFailed || state.capa) && (
                            <div className="animate-fade-in">
                              <input
                                type="text"
                                value={state.capa}
                                onChange={(e) => setItemCapa(item.id, e.target.value)}
                                placeholder="Hành động khắc phục (CAPA) & Thời hạn..."
                                className="w-full px-2.5 py-1.5 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-900 font-bold focus:bg-white focus:border-rose-400 outline-none placeholder-rose-300"
                              />
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {filteredItems.length === 0 && (
              <div className="p-12 text-center text-gray-400 font-medium space-y-2">
                <Search className="w-8 h-8 mx-auto text-gray-300" />
                <p>Không tìm thấy mục kiểm tra nào phù hợp với bộ lọc</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: LỊCH SỬ CƠ SỞ DỮ LIỆU ĐÃ LƯU */}
      {activeTab === 'database' && (
        <div className="space-y-4">
          <div className="bg-white p-5 rounded-3xl border border-gray-200 shadow-xs flex items-center justify-between">
            <div>
              <h3 className="text-base font-black text-gray-800 uppercase tracking-wide">
                Hồ Sơ Kiểm Toán HACCP Đã Lưu ({database?.length || 0})
              </h3>
              <p className="text-xs text-gray-500 font-medium">
                Toàn bộ lịch sử các đợt kiểm tra, audit cơ sở được đồng bộ đám mây Firestore thời gian thực.
              </p>
            </div>
            <span className="text-xs font-bold text-teal-700 bg-teal-50 px-3 py-1 rounded-xl border border-teal-200">
              {dbSyncStatus}
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {(database || []).map(record => (
              <div 
                key={record.id}
                className="bg-white p-5 rounded-3xl border border-gray-200 shadow-xs hover:border-[#007c76] hover:shadow-lg transition-all space-y-4 relative overflow-hidden"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">
                      {record.auditDate}
                    </span>
                    <h4 className="text-base font-black text-gray-900 line-clamp-1">
                      {record.facilityName}
                    </h4>
                  </div>
                  <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider shrink-0 ${
                    record.status === 'Đạt chuẩn HACCP'
                      ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                      : 'bg-rose-100 text-rose-800 border border-rose-200'
                  }`}>
                    {record.status}
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-2 py-2 border-y border-gray-100 text-center">
                  <div>
                    <span className="text-[10px] text-gray-400 block font-bold">Điểm</span>
                    <span className="text-lg font-black text-[#007c76]">{record.totalScore}%</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-gray-400 block font-bold">Đạt</span>
                    <span className="text-lg font-black text-emerald-600">{record.passCount}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-gray-400 block font-bold">Lỗi CCP</span>
                    <span className={`text-lg font-black ${record.criticalFailCount > 0 ? 'text-rose-600' : 'text-gray-400'}`}>
                      {record.criticalFailCount}
                    </span>
                  </div>
                </div>

                <div className="text-xs text-gray-500 space-y-1">
                  <p><span className="font-bold text-gray-700">Đội trưởng:</span> {record.teamLeader || 'Chưa cập nhật'}</p>
                  <p><span className="font-bold text-gray-700">Đánh giá viên:</span> {record.auditorName}</p>
                  <p className="line-clamp-1"><span className="font-bold text-gray-700">Phạm vi:</span> {record.productScope}</p>
                </div>

                <div className="flex items-center justify-between pt-2">
                  <button
                    onClick={() => handleLoadRecord(record)}
                    className="px-4 py-2 rounded-xl bg-teal-50 hover:bg-[#007c76] text-[#007c76] hover:text-white font-black text-xs transition-all cursor-pointer"
                  >
                    Xem & Chỉnh Sửa
                  </button>

                  <button
                    onClick={() => handleDeleteRecord(record.id)}
                    className="p-2 rounded-xl text-gray-400 hover:text-rose-600 hover:bg-rose-50 transition-all cursor-pointer"
                    title="Xóa bản ghi"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>

          {(!database || database.length === 0) && (
            <div className="bg-white p-16 rounded-3xl border border-gray-200 text-center space-y-3">
              <Database className="w-12 h-12 mx-auto text-gray-300" />
              <h4 className="text-base font-black text-gray-700">Chưa có bản ghi lưu trữ nào</h4>
              <p className="text-xs text-gray-400 max-w-sm mx-auto">
                Sau khi kiểm tra cơ sở, bấm nút "Lưu Cơ Sở Dữ Liệu" ở thanh trên cùng để lưu trữ lịch sử đánh giá vào đám mây.
              </p>
            </div>
          )}
        </div>
      )}

      {/* TAB 3: BÁO CÁO THẨM TRA & CAPA (XUẤT IN ẤN CHUẨN MỰC) */}
      {activeTab === 'report' && (
        <div className="space-y-6">
          <div className="bg-white p-6 md:p-8 rounded-3xl border border-gray-200 shadow-sm space-y-6 print:border-none print:shadow-none">
            {/* Header Report */}
            <div className="text-center pb-6 border-b border-gray-200">
              <span className="text-xs font-black text-[#007c76] uppercase tracking-[0.2em] block mb-1">
                FAST E-LEARNING & CONSULTING QUALITY MANAGEMENT
              </span>
              <h2 className="text-2xl font-black text-gray-900 uppercase">
                Biên Bản Đánh Giá & Thẩm Tra Hệ Thống HACCP
              </h2>
              <p className="text-xs text-gray-500 font-medium mt-1">
                Tiêu chuẩn đối sánh: TCVN 5603:2023 / Codex Alimentarius HACCP System
              </p>
            </div>

            {/* Info Table */}
            <div className="grid grid-cols-2 gap-4 text-xs">
              <div className="space-y-1.5 p-4 rounded-2xl bg-gray-50 border border-gray-100">
                <p><span className="font-bold text-gray-700">Cơ sở được đánh giá:</span> {facilityName}</p>
                <p><span className="font-bold text-gray-700">Người đại diện / Đội trưởng:</span> {teamLeader || 'Chưa cập nhật'}</p>
                <p><span className="font-bold text-gray-700">Địa chỉ:</span> {facilityAddress || 'Chưa cập nhật'}</p>
                <p><span className="font-bold text-gray-700">Số điện thoại:</span> {contactPhone || 'Chưa cập nhật'}</p>
              </div>

              <div className="space-y-1.5 p-4 rounded-2xl bg-gray-50 border border-gray-100">
                <p><span className="font-bold text-gray-700">Ngày đánh giá:</span> {auditDate}</p>
                <p><span className="font-bold text-gray-700">Đánh giá viên FAST:</span> {auditorName}</p>
                <p><span className="font-bold text-gray-700">Phạm vi công nhận:</span> {productScope}</p>
                <p><span className="font-bold text-gray-700">Tổng điểm tuân thủ:</span> <strong className="text-[#007c76]">{stats.score}%</strong></p>
              </div>
            </div>

            {/* Executive Summary */}
            <div className={`p-4 rounded-2xl border ${stats.isPassed ? 'bg-emerald-50 border-emerald-200 text-emerald-900' : 'bg-rose-50 border-rose-200 text-rose-900'}`}>
              <h4 className="font-black text-sm uppercase mb-1">
                Kết Luận Chung: {stats.isPassed ? 'ĐẠT ĐIỀU KIỆN CHUẨN HÓA HACCP' : 'CHƯA ĐẠT - YÊU CẦU HOÀN THIỆN CAPA'}
              </h4>
              <p className="text-xs font-medium leading-relaxed">
                {stats.isPassed
                  ? `Cơ sở đáp ứng đầy đủ ${stats.pass}/${stats.total} tiêu chuẩn kiểm soát. Không phát hiện điểm không phù hợp trọng yếu tại các điểm kiểm soát tới hạn (CCP). Hệ thống đủ điều kiện xem xét cấp Giấy chứng nhận.`
                  : `Phát hiện ${stats.fail} điểm không phù hợp, trong đó có ${stats.criticalFail} điểm trọng yếu cần xử lý ngay lập tức theo phiếu hành động khắc phục đính kèm.`}
              </p>
            </div>

            {/* CAPA Table */}
            <div className="space-y-3">
              <h4 className="text-sm font-black text-gray-900 uppercase">
                Danh Sách Điểm Không Phù Hợp & Kế Hoạch Khắc Phục (CAPA)
              </h4>

              <div className="overflow-x-auto border border-gray-200 rounded-2xl">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-gray-100 text-gray-700 font-bold uppercase text-[10px]">
                      <th className="p-3 w-16 text-center">Mã</th>
                      <th className="p-3 w-48">Hạng mục kiểm tra</th>
                      <th className="p-3">Thực trạng hiện trường (Defect)</th>
                      <th className="p-3">Hành động khắc phục (CAPA)</th>
                      <th className="p-3 w-28 text-center">Mức độ</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-150">
                    {allItems
                      .filter(it => itemsState[it.id]?.status === 'fail')
                      .map(item => (
                        <tr key={item.id} className="bg-rose-50/20">
                          <td className="p-3 text-center font-bold text-rose-700">{item.code}</td>
                          <td className="p-3 font-bold text-gray-800">{item.category}</td>
                          <td className="p-3 text-gray-600">{itemsState[item.id]?.note || item.defectDesc}</td>
                          <td className="p-3 font-semibold text-rose-900">{itemsState[item.id]?.capa || 'Cần lập phương án khắc phục chi tiết'}</td>
                          <td className="p-3 text-center">
                            <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase bg-rose-100 text-rose-800">
                              {item.severity}
                            </span>
                          </td>
                        </tr>
                      ))}
                    {allItems.filter(it => itemsState[it.id]?.status === 'fail').length === 0 && (
                      <tr>
                        <td colSpan={5} className="p-8 text-center text-gray-400 font-medium">
                          Tuyệt vời! Không có điểm không phù hợp nào cần khắc phục.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Signatures */}
            <div className="pt-8 grid grid-cols-2 text-center text-xs">
              <div className="space-y-16">
                <p className="font-bold text-gray-700 uppercase">Đại Diện Cơ Sở / Đội Trưởng HACCP</p>
                <p className="text-gray-400 italic">(Ký và ghi rõ họ tên)</p>
              </div>

              <div className="space-y-16">
                <p className="font-bold text-gray-700 uppercase">Chuyên Viên Đánh Giá FAST</p>
                <p className="text-gray-400 italic">(Ký và ghi rõ họ tên)</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 3. HTML Code Importer Modal (Screen Only) */}
      {showImportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-fade-in">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 shadow-2xl border border-gray-200 space-y-4 max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <div className="flex items-center gap-2 text-[#007c76]">
                <Code className="w-5 h-5" />
                <h3 className="text-base font-black uppercase tracking-tight text-gray-900">
                  Nhập Mã Từ File "haccp checklist.html"
                </h3>
              </div>
              <button
                onClick={() => setShowImportModal(false)}
                className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-500 flex items-center justify-center font-bold"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-gray-500 font-medium leading-relaxed">
              Dán nội dung mã nguồn HTML từ tệp <code className="bg-gray-100 px-1 py-0.5 rounded font-mono text-teal-800">haccp checklist.html</code> hoặc chọn tệp từ máy tính của bạn. Hệ thống sẽ tự động bóc tách các mục kiểm tra, bảng tiêu chuẩn và đồng bộ lên đám mây.
            </p>

            {/* File Input Option */}
            <div className="flex items-center gap-3">
              <label className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gray-100 hover:bg-teal-50 hover:text-[#007c76] text-xs font-bold cursor-pointer border border-gray-200 transition-all">
                <Upload className="w-4 h-4" />
                <span>Chọn file .html từ máy</span>
                <input
                  type="file"
                  accept=".html,.htm"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      const reader = new FileReader();
                      reader.onload = (evt) => {
                        const content = evt.target?.result as string;
                        if (content) {
                          setHtmlInputCode(content);
                          showSuccessToast(`Đã đọc nội dung từ file: ${file.name}`);
                        }
                      };
                      reader.readAsText(file);
                    }
                  }}
                />
              </label>
              <span className="text-xs text-gray-400">hoặc dán trực tiếp đoạn mã vào ô dưới:</span>
            </div>

            {/* Textarea */}
            <div className="flex-1 min-h-[220px]">
              <textarea
                value={htmlInputCode}
                onChange={(e) => setHtmlInputCode(e.target.value)}
                placeholder="Dán mã <table>...</table> hoặc toàn bộ nội dung file HTML vào đây..."
                className="w-full h-full min-h-[200px] p-4 rounded-2xl bg-gray-50 border border-gray-200 font-mono text-xs text-gray-800 focus:bg-white focus:border-[#007c76] outline-none custom-scrollbar"
              />
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-3 pt-3 border-t border-gray-100">
              <button
                type="button"
                onClick={() => setShowImportModal(false)}
                className="px-4 py-2.5 rounded-xl text-gray-500 hover:bg-gray-100 font-bold text-xs"
              >
                Hủy bỏ
              </button>

              <button
                type="button"
                onClick={handleImportHtml}
                className="px-5 py-2.5 rounded-xl bg-[#007c76] hover:bg-[#005c56] text-white font-black text-xs uppercase tracking-wider flex items-center gap-2 shadow-lg shadow-teal-700/20 active:scale-95"
              >
                <Check className="w-4 h-4" />
                <span>Phân Tích & Bổ Sung Tiêu Chuẩn</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FastHaccpChecklist;
