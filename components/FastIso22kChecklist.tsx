import React, { useState, useEffect, useRef, useMemo } from 'react';
import { auth, db } from '../firebase';
import { doc, getDoc, setDoc, onSnapshot } from 'firebase/firestore';
import { useToast } from '../contexts/ToastContext';
import { useSmoothScrollTo } from '../hooks/useSmoothScrollTo';
import {
  Check,
  X,
  Minus,
  AlertTriangle,
  Search,
  ChevronDown,
  RotateCcw,
  Save,
  History,
  FolderOpen,
  Trash2,
  Printer,
  FileSpreadsheet,
  FileCode2,
  FileWarning,
  ClipboardCheck,
  Cloud,
  RefreshCw,
  ShieldCheck,
  CheckCheck,
} from 'lucide-react';

enum IsoOperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  GET = 'get',
  WRITE = 'write',
}

function logIsoFirestoreError(error: unknown, operationType: IsoOperationType, path: string) {
  const info = {
    error: error instanceof Error ? error.message : String(error),
    operationType,
    path,
    authInfo: {
      userId: auth.currentUser?.uid || null,
      email: auth.currentUser?.email || null,
      emailVerified: auth.currentUser?.emailVerified ?? null,
    },
  };
  console.warn('[FastIso22k:Firestore]', JSON.stringify(info));
}

function isMeaningfulIsoSession(data: Record<string, any> | null | undefined): boolean {
  if (!data || typeof data !== 'object') return false;
  if (data._isExplicitReset) return true;
  const textKeys = [
    'clientName',
    'contactName',
    'contactPhone',
    'leadAuditor',
    'auditType',
    'auditAddress',
    'fsmsScope',
    'auditDate',
    'reportNo',
  ];
  if (textKeys.some((k) => typeof data[k] === 'string' && data[k].trim() !== '')) {
    return true;
  }
  return Object.keys(data).some(
    (k) =>
      (k.startsWith('comp_') || k.startsWith('sev_') || k.startsWith('cmt_') || k.startsWith('capa_')) &&
      Boolean(data[k])
  );
}

function escapeHtml(raw: string): string {
  return String(raw || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function formatDateVN(isoDate?: string): string {
  if (!isoDate) return '—';
  const parts = isoDate.split('-');
  return parts.length === 3 ? `${parts[2]}/${parts[1]}/${parts[0]}` : isoDate;
}

export interface ChecklistItem {
  id: string;
  clause: string;
  text: string;
}

export interface ChecklistSection {
  section: string;
  items: ChecklistItem[];
}

// Complete standard clauses from ISO 22000:2018 checklist
export const ISO22K_CHECKLIST_DATA: ChecklistSection[] = [
  {
    section: 'ĐIỀU KHOẢN 4: BỐI CẢNH CỦA TỔ CHỨC',
    items: [
      { id: '4.1', clause: 'Điều khoản 4.1', text: 'Hiểu tổ chức và bối cảnh của tổ chức. Tổ chức đã xác định các vấn đề nội bộ và bên ngoài liên quan đến mục đích của mình và ảnh hưởng đến khả năng đạt được kết quả dự kiến của FSMS chưa?' },
      { id: '4.2.a', clause: 'Điều khoản 4.2', text: 'Hiểu nhu cầu và mong đợi của các bên quan tâm. Tổ chức đã xác định các bên quan tâm có liên quan đến FSMS chưa?' },
      { id: '4.2.b', clause: 'Điều khoản 4.2', text: 'Tổ chức đã xác định các yêu cầu có liên quan của các bên quan tâm đối với FSMS chưa?' },
      { id: '4.3', clause: 'Điều khoản 4.3', text: 'Xác định phạm vi của FSMS. Phạm vi có xác định rõ các sản phẩm, dịch vụ, quá trình và địa điểm sản xuất được bao gồm trong FSMS không?' },
      { id: '4.4', clause: 'Điều khoản 4.4', text: 'Hệ thống quản lý an toàn thực phẩm. Tổ chức đã thiết lập, thực hiện, duy trì, cập nhật và cải tiến liên tục FSMS, bao gồm các quá trình cần thiết và sự tương tác của chúng chưa?' },
    ],
  },
  {
    section: 'ĐIỀU KHOẢN 5: SỰ LÃNH ĐẠO',
    items: [
      { id: '5.1.a', clause: 'Điều khoản 5.1', text: 'Sự lãnh đạo và cam kết. Lãnh đạo cao nhất có thể hiện sự cam kết đối với FSMS bằng cách đảm bảo chính sách an toàn thực phẩm và các mục tiêu được thiết lập không?' },
      { id: '5.1.b', clause: 'Điều khoản 5.1', text: 'Lãnh đạo cao nhất có đảm bảo sự tích hợp các yêu cầu của FSMS vào các quá trình kinh doanh của tổ chức không?' },
      { id: '5.2.1', clause: 'Điều khoản 5.2.1', text: 'Chính sách an toàn thực phẩm. Chính sách có phù hợp với mục đích và bối cảnh của tổ chức, cung cấp khuôn khổ để thiết lập và xem xét các mục tiêu FSMS không?' },
      { id: '5.2.2', clause: 'Điều khoản 5.2.2', text: 'Truyền đạt chính sách an toàn thực phẩm. Chính sách có được truyền đạt, thấu hiểu và áp dụng ở mọi cấp trong tổ chức cũng như có sẵn cho các bên quan tâm liên quan không?' },
      { id: '5.3', clause: 'Điều khoản 5.3', text: 'Vai trò, trách nhiệm và quyền hạn. Lãnh đạo cao nhất đã phân công, truyền đạt trách nhiệm và quyền hạn chưa? Có bổ nhiệm Trưởng nhóm an toàn thực phẩm không?' },
    ],
  },
  {
    section: 'ĐIỀU KHOẢN 6: HOẠCH ĐỊNH',
    items: [
      { id: '6.1.1', clause: 'Điều khoản 6.1.1', text: 'Hành động giải quyết rủi ro và cơ hội. Khi hoạch định FSMS, tổ chức đã xem xét các vấn đề nội bộ/bên ngoài và các bên quan tâm để xác định rủi ro và cơ hội cần giải quyết chưa?' },
      { id: '6.1.2', clause: 'Điều khoản 6.1.2', text: 'Tổ chức đã lên kế hoạch hành động để giải quyết các rủi ro và cơ hội này, cũng như cách thức tích hợp, thực hiện và đánh giá tính hiệu lực của chúng chưa?' },
      { id: '6.2.1', clause: 'Điều khoản 6.2.1', text: 'Mục tiêu FSMS. Tổ chức đã thiết lập các mục tiêu an toàn thực phẩm nhất quán với chính sách, có thể đo lường, được theo dõi và cập nhật không?' },
      { id: '6.2.2', clause: 'Điều khoản 6.2.2', text: 'Khi hoạch định cách thức đạt được mục tiêu, tổ chức đã xác định: cần làm gì, nguồn lực nào, ai chịu trách nhiệm, thời hạn và cách thức đánh giá kết quả chưa?' },
      { id: '6.3', clause: 'Điều khoản 6.3', text: 'Hoạch định sự thay đổi. Khi có sự thay đổi đối với FSMS, tổ chức có thực hiện thay đổi một cách có kế hoạch không?' },
    ],
  },
  {
    section: 'ĐIỀU KHOẢN 7: HỖ TRỢ',
    items: [
      { id: '7.1.1', clause: 'Điều khoản 7.1.1', text: 'Nguồn lực chung. Tổ chức đã xác định và cung cấp nguồn lực cần thiết cho việc thiết lập, duy trì và cải tiến liên tục FSMS chưa?' },
      { id: '7.1.2', clause: 'Điều khoản 7.1.2', text: 'Con người. Tổ chức đã cung cấp đủ nhân sự có năng lực để vận hành FSMS một cách có hiệu lực chưa?' },
      { id: '7.1.3', clause: 'Điều khoản 7.1.3', text: 'Cơ sở hạ tầng. Tổ chức có cung cấp và duy trì cơ sở hạ tầng cần thiết (nhà xưởng, thiết bị, vận tải, CNTT) không?' },
      { id: '7.1.4', clause: 'Điều khoản 7.1.4', text: 'Môi trường làm việc. Tổ chức đã xác định, cung cấp và duy trì môi trường làm việc phù hợp để đảm bảo an toàn thực phẩm chưa?' },
      { id: '7.1.6', clause: 'Điều khoản 7.1.6', text: 'Tổ chức có đánh giá, lựa chọn và giám sát các nhà cung cấp bên ngoài (nguyên liệu, dịch vụ) để đảm bảo không ảnh hưởng đến an toàn thực phẩm không?' },
      { id: '7.2', clause: 'Điều khoản 7.2', text: 'Năng lực. Đảm bảo nhân sự có năng lực (dựa trên giáo dục, đào tạo hoặc kinh nghiệm), và lưu giữ thông tin văn bản làm bằng chứng chưa?' },
      { id: '7.3', clause: 'Điều khoản 7.3', text: 'Nhận thức. Các cá nhân làm việc có nhận thức được chính sách ATTP, mục tiêu FSMS liên quan đến công việc của họ không?' },
      { id: '7.4', clause: 'Điều khoản 7.4', text: 'Trao đổi thông tin. Tổ chức đã xác định các hoạt động trao đổi thông tin nội bộ và bên ngoài (trao đổi cái gì, khi nào, với ai, như thế nào) chưa?' },
      { id: '7.5', clause: 'Điều khoản 7.5', text: 'Thông tin được văn bản hóa. FSMS có bao gồm hệ thống tạo lập, cập nhật và kiểm soát tài liệu rõ ràng không?' },
    ],
  },
  {
    section: 'ĐIỀU KHOẢN 8: THỰC HIỆN',
    items: [
      { id: '8.1.1', clause: 'Điều khoản 8.1', text: 'Hoạch định và kiểm soát thực hiện. Tổ chức có hoạch định, thực hiện, kiểm soát các quá trình cần thiết để đáp ứng các yêu cầu về việc tạo ra sản phẩm an toàn không?' },
      { id: '8.2.1', clause: 'Điều khoản 8.2.1', text: 'Chương trình tiên quyết (PRP). Tổ chức có thiết lập, áp dụng và cập nhật các PRP để ngăn ngừa/giảm bớt ô nhiễm vào sản phẩm không?' },
      { id: '8.3.1', clause: 'Điều khoản 8.3', text: 'Hệ thống truy xuất nguồn gốc. Hệ thống có khả năng nhận diện nguyên vật liệu đầu vào và tuyến phân phối sản phẩm đầu ra không?' },
      { id: '8.4.1', clause: 'Điều khoản 8.4', text: 'Ứng phó khẩn cấp. Tổ chức có đảm bảo sẵn sàng ứng phó với các tình huống khẩn cấp (cháy, ngập lụt, cúp điện...) ảnh hưởng đến ATTP không?' },
      { id: '8.5.1', clause: 'Điều khoản 8.5.1', text: 'Phân tích mối nguy. Đội ATTP có tiến hành phân tích mối nguy để xác định các mối nguy cần kiểm soát không?' },
      { id: '8.5.2', clause: 'Điều khoản 8.5.2', text: 'Nhận diện & Đánh giá mối nguy. Tất cả các mối nguy có được đánh giá rủi ro dựa trên mức độ nghiêm trọng và khả năng xảy ra không?' },
      { id: '8.5.4', clause: 'Điều khoản 8.5.4', text: 'Kế hoạch kiểm soát mối nguy (HACCP/OPRP). Kế hoạch có bao gồm: Giới hạn tới hạn/Tiêu chí hành động, Giám sát, Hành động khắc phục không?' },
      { id: '8.7', clause: 'Điều khoản 8.7', text: 'Kiểm soát thiết bị đo lường. Thiết bị đo lường được chỉ định là đáng tin cậy, được hiệu chuẩn định kỳ hoặc kiểm tra không?' },
      { id: '8.8', clause: 'Điều khoản 8.8', text: 'Thẩm tra (Verification). Tổ chức có lập lịch và thực hiện các hoạt động thẩm tra để chứng minh PRPs và Kế hoạch HACCP/OPRP được tuân thủ không?' },
      { id: '8.9.3', clause: 'Điều khoản 8.9.3', text: 'Hành động khắc phục. Tổ chức có tiến hành phân tích nguyên nhân gốc rễ để ngăn ngừa lỗi tái diễn không?' },
      { id: '8.9.5', clause: 'Điều khoản 8.9.5', text: 'Thu hồi sản phẩm (Recall). Tổ chức có quy trình thu hồi lô sản phẩm không an toàn không? Có diễn tập thu hồi không?' },
    ],
  },
  {
    section: 'ĐIỀU KHOẢN 9: ĐÁNH GIÁ KẾT QUẢ HOẠT ĐỘNG',
    items: [
      { id: '9.1.1', clause: 'Điều khoản 9.1.1', text: 'Theo dõi, đo lường, phân tích và đánh giá. Tổ chức có xác định những gì cần theo dõi, phương pháp, thời điểm và cách thức phân tích kết quả chưa?' },
      { id: '9.1.2', clause: 'Điều khoản 9.1.2', text: 'Phân tích và đánh giá dữ liệu. Tổ chức có đánh giá thông tin phát sinh từ quá trình theo dõi, đo lường (kể cả kết quả thẩm tra PRPs và HACCP) không?' },
      { id: '9.2.1', clause: 'Điều khoản 9.2.1', text: 'Đánh giá nội bộ. Tổ chức có tiến hành đánh giá nội bộ theo các khoảng thời gian được hoạch định để cung cấp thông tin xem FSMS có phù hợp không?' },
      { id: '9.2.2', clause: 'Điều khoản 9.2.2', text: 'Chương trình đánh giá nội bộ có đảm bảo tính khách quan và công bằng không (người đánh giá không tự đánh giá công việc của mình)?' },
      { id: '9.3.1', clause: 'Điều khoản 9.3.1', text: 'Xem xét của lãnh đạo. Lãnh đạo cao nhất có tiến hành xem xét FSMS theo định kỳ để đảm bảo sự phù hợp, thỏa đáng và hiệu lực liên tục không?' },
      { id: '9.3.3', clause: 'Điều khoản 9.3.3', text: 'Đầu ra xem xét của lãnh đạo có bao gồm các quyết định về cơ hội cải tiến, nhu cầu thay đổi đối với FSMS và nguồn lực không?' },
    ],
  },
  {
    section: 'ĐIỀU KHOẢN 10: CẢI TIẾN',
    items: [
      { id: '10.1.1', clause: 'Điều khoản 10.1.1', text: 'Sự không phù hợp và hành động khắc phục. Khi sự không phù hợp xảy ra, tổ chức có hành động để kiểm soát, khắc phục và xử lý hệ quả không?' },
      { id: '10.1.2', clause: 'Điều khoản 10.1.2', text: 'Tổ chức có đánh giá nhu cầu hành động nhằm loại bỏ nguyên nhân gốc rễ của sự không phù hợp để nó không tái diễn không?' },
      { id: '10.2', clause: 'Điều khoản 10.2', text: 'Cải tiến liên tục. Lãnh đạo cao nhất có đảm bảo tổ chức liên tục nâng cao tính hiệu lực của FSMS thông qua xem xét lãnh đạo, đánh giá nội bộ, hành động khắc phục không?' },
      { id: '10.3', clause: 'Điều khoản 10.3', text: 'Cập nhật Hệ thống quản lý ATTP. Tổ chức có đánh giá FSMS định kỳ để đảm bảo các mối nguy đã được kiểm soát một cách phù hợp và cập nhật chưa?' },
    ],
  },
];

const LOCAL_CURRENT_KEY = 'fast_iso22000_full_current';
const LOCAL_CURRENT_TS_KEY = 'fast_iso22000_full_ts';
const LOCAL_CRM_KEY = 'fast_iso22000_full_crm';
const LOCAL_CRM_TS_KEY = 'fast_iso22000_full_crm_ts';

const AUDIT_TYPES = [
  'Đánh giá Khảo sát (Gap Assessment)',
  'Đánh giá nội bộ ISO 22000:2018',
  'Đánh giá Chứng nhận (Stage 1 / Stage 2)',
  'Đánh giá Giám sát định kỳ (Surveillance)',
  'Thẩm tra khắc phục (Follow-up CAPA)',
];

type IsoCompliance = 'Y' | 'N' | 'NI' | 'NA';

export const FastIso22kChecklist: React.FC = () => {
  const toast = useToast();

  // Client & Audit Form State
  const [clientName, setClientName] = useState<string>('');
  const [contactName, setContactName] = useState<string>('');
  const [contactPhone, setContactPhone] = useState<string>('');
  const [leadAuditor, setLeadAuditor] = useState<string>('');
  const [auditType, setAuditType] = useState<string>('');
  const [auditAddress, setAuditAddress] = useState<string>('');
  const [fsmsScope, setFsmsScope] = useState<string>('');
  const [auditDate, setAuditDate] = useState<string>('');
  const [reportNo, setReportNo] = useState<string>('');

  // Checklist Item States
  const [compliance, setCompliance] = useState<Record<string, string>>({});
  const [severities, setSeverities] = useState<Record<string, string>>({});
  const [comments, setComments] = useState<Record<string, string>>({});
  const [capa, setCapa] = useState<Record<string, string>>({});

  // Search, Filters & UI state
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'UNRATED' | IsoCompliance>('ALL');
  const [openSections, setOpenSections] = useState<number[]>([0, 1, 2, 3, 4, 5, 6]);
  const [isCrmOpen, setIsCrmOpen] = useState<boolean>(false);
  const [isReportOpen, setIsReportOpen] = useState<boolean>(false);
  const [reportMode, setReportMode] = useState<'nc' | 'all'>('nc');
  const [crmRecords, setCrmRecords] = useState<Record<string, any>>({});

  // Sync status
  const [syncStatus, setSyncStatus] = useState<'synced' | 'saving' | 'offline'>('synced');
  const [lastSyncedAt, setLastSyncedAt] = useState<string>('');
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
  } | null>(null);

  const { scrollTo: scrollToIsoSection } = useSmoothScrollTo({
    offset: 16,
    detectDynamicReveal: true,
  });

  useSmoothScrollTo({
    targetId: 'iso22k-crm-panel',
    triggerKey: isCrmOpen,
    enabled: isCrmOpen,
    offset: 16,
    detectDynamicReveal: true,
  });

  useSmoothScrollTo({
    targetId: 'iso22k-report-panel',
    triggerKey: isReportOpen,
    enabled: isReportOpen,
    offset: 16,
    detectDynamicReveal: true,
  });

  // Sync guards
  const tabWriterIdRef = useRef<string>(
    `iso22k_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
  );
  const hasHydratedRef = useRef<boolean>(false);
  const hasUserEditedRef = useRef<boolean>(false);
  const isApplyingRemoteRef = useRef<boolean>(false);
  const lastLocalTsRef = useRef<number>(Number(localStorage.getItem(LOCAL_CURRENT_TS_KEY) || 0));
  const lastCrmTsRef = useRef<number>(Number(localStorage.getItem(LOCAL_CRM_TS_KEY) || 0));
  const crmRecordsRef = useRef<Record<string, any>>({});
  crmRecordsRef.current = crmRecords;
  const activeCrmIdRef = useRef<string | null>(null);
  const latestPayloadRef = useRef<Record<string, any> | null>(null);

  // Computed metrics
  const metrics = useMemo(() => {
    let total = 0;
    let yCount = 0;
    let nCount = 0;
    let niCount = 0;
    let naCount = 0;
    let majorCount = 0;
    let minorCount = 0;
    let obsCount = 0;

    ISO22K_CHECKLIST_DATA.forEach((sec) => {
      sec.items.forEach((it) => {
        total++;
        const val = compliance[it.id];
        if (val === 'Y') yCount++;
        else if (val === 'N') nCount++;
        else if (val === 'NI') niCount++;
        else if (val === 'NA') naCount++;

        const sev = severities[it.id];
        if (sev === 'Major') majorCount++;
        else if (sev === 'Minor') minorCount++;
        else if (sev === 'Observation') obsCount++;
        else if (val === 'N') minorCount++;
      });
    });

    const completed = yCount + nCount + niCount + naCount;
    const progressPct = total > 0 ? Math.round((completed / total) * 100) : 0;
    const applicable = yCount + nCount + niCount;
    const compliancePct = applicable > 0 ? Math.round((yCount / applicable) * 100) : 100;

    let readiness = 'Chưa đánh giá';
    if (applicable > 0) {
      if (majorCount === 0 && nCount <= 3 && compliancePct >= 90) readiness = 'Sẵn sàng chứng nhận';
      else if (majorCount === 0 && compliancePct >= 75) readiness = 'Cần khắc phục điểm nhẹ';
      else readiness = 'Cần rà soát lại FSMS';
    }

    return {
      total,
      completed,
      unrated: total - completed,
      yCount,
      nCount,
      niCount,
      naCount,
      majorCount,
      minorCount,
      obsCount,
      progressPct,
      compliancePct,
      readiness,
    };
  }, [compliance, severities]);

  const applyStateData = (data: Record<string, any>) => {
    if (!data || typeof data !== 'object') return;
    isApplyingRemoteRef.current = true;
    hasUserEditedRef.current = false;
    activeCrmIdRef.current = data._loadedFromCrmId || null;

    setClientName(data.clientName || '');
    setContactName(data.contactName || '');
    setContactPhone(data.contactPhone || '');
    setLeadAuditor(data.leadAuditor || '');
    setAuditType(data.auditType || '');
    setAuditAddress(data.auditAddress || '');
    setFsmsScope(data.fsmsScope || '');
    setAuditDate(data.auditDate || '');
    setReportNo(data.reportNo || '');

    const newComp: Record<string, string> = {};
    const newSev: Record<string, string> = {};
    const newCmt: Record<string, string> = {};
    const newCapa: Record<string, string> = {};

    Object.keys(data).forEach((key) => {
      if (key.startsWith('comp_') && data[key]) {
        newComp[key.slice(5)] = String(data[key]);
      } else if (key.startsWith('sev_') && data[key]) {
        newSev[key.slice(4)] = String(data[key]);
      } else if (key.startsWith('cmt_') && data[key]) {
        newCmt[key.slice(4)] = String(data[key]);
      } else if (key.startsWith('capa_') && data[key]) {
        newCapa[key.slice(5)] = String(data[key]);
      }
    });

    setCompliance(newComp);
    setSeverities(newSev);
    setComments(newCmt);
    setCapa(newCapa);

    queueMicrotask(() => {
      isApplyingRemoteRef.current = false;
    });
  };

  const persistSessionToCloudAndServer = async (payload: Record<string, any>, keepalive = false) => {
    const cleanPayload = { ...payload };
    let firestoreOk = false;
    let serverOk = false;

    try {
      await setDoc(doc(db, 'fast_iso22k_crm', 'current_session'), cleanPayload);
      firestoreOk = true;
    } catch (err) {
      logIsoFirestoreError(err, IsoOperationType.WRITE, 'fast_iso22k_crm/current_session');
    }

    try {
      const res = await fetch('/api/fast-iso22k/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(cleanPayload),
        keepalive,
      });
      serverOk = res.ok;
    } catch {}

    setSyncStatus(firestoreOk || serverOk ? 'synced' : 'offline');
    if (firestoreOk || serverOk) {
      setLastSyncedAt(
        new Date().toLocaleTimeString('vi-VN', {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
        })
      );
    }

    return { firestoreOk, serverOk };
  };

  // Initial Load + Real-time Bidirectional Sync (LocalStorage + Server API + Cloud Firestore)
  useEffect(() => {
    let active = true;
    try {
      const savedLocal = localStorage.getItem(LOCAL_CURRENT_KEY);
      if (savedLocal) {
        const parsed = JSON.parse(savedLocal);
        if (isMeaningfulIsoSession(parsed)) {
          applyStateData(parsed);
        } else {
          lastLocalTsRef.current = 0;
          localStorage.removeItem(LOCAL_CURRENT_KEY);
          localStorage.removeItem(LOCAL_CURRENT_TS_KEY);
        }
      } else {
        lastLocalTsRef.current = 0;
      }
    } catch (e) {
      console.warn('[FastIso22k] Local load error:', e);
      lastLocalTsRef.current = 0;
    }

    try {
      const savedCrm = localStorage.getItem(LOCAL_CRM_KEY);
      if (savedCrm) {
        const parsedCrm = JSON.parse(savedCrm);
        if (parsedCrm && typeof parsedCrm === 'object') {
          setCrmRecords(parsedCrm);
          crmRecordsRef.current = parsedCrm;
        }
      }
    } catch {}

    hasHydratedRef.current = true;

    const applyRemoteSessionIfNewer = (data: Record<string, any> | null | undefined) => {
      if (!active || !data || typeof data !== 'object') return;
      if (data._writerId && data._writerId === tabWriterIdRef.current) return;
      if (hasUserEditedRef.current) return;

      const remoteTs = Number(data._lastUpdated || 0);
      const meaningful = isMeaningfulIsoSession(data);
      const shouldApply =
        remoteTs > lastLocalTsRef.current ||
        (lastLocalTsRef.current === 0 && meaningful);

      if (shouldApply && (meaningful || lastLocalTsRef.current > 0)) {
        lastLocalTsRef.current = remoteTs || Date.now();
        applyStateData(data);
        setSyncStatus('synced');
        setLastSyncedAt(
          new Date().toLocaleTimeString('vi-VN', {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
          })
        );
        try {
          localStorage.setItem(LOCAL_CURRENT_KEY, JSON.stringify(data));
          localStorage.setItem(LOCAL_CURRENT_TS_KEY, String(lastLocalTsRef.current));
        } catch {}
      }
    };

    const applyRemoteCrmIfNewer = (
      records: Record<string, any> | null | undefined,
      remoteTsRaw: unknown,
      writerId?: string
    ) => {
      if (!active || !records || typeof records !== 'object') return;
      if (writerId && writerId === tabWriterIdRef.current) return;

      const remoteTs = Number(remoteTsRaw || 0);
      const remoteCount = Object.keys(records).length;
      const localCount = Object.keys(crmRecordsRef.current).length;

      if (remoteCount === 0 && remoteTs === 0 && localCount > 0) return;

      const shouldApply =
        remoteTs > lastCrmTsRef.current ||
        (lastCrmTsRef.current === 0 && remoteCount > 0);

      if (shouldApply) {
        lastCrmTsRef.current = remoteTs || Date.now();
        crmRecordsRef.current = records;
        setCrmRecords(records);
        try {
          localStorage.setItem(LOCAL_CRM_KEY, JSON.stringify(records));
          localStorage.setItem(LOCAL_CRM_TS_KEY, String(lastCrmTsRef.current));
        } catch {}
      }
    };

    // Server API Preload
    fetch('/api/fast-iso22k/session', { cache: 'no-store' })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.session) applyRemoteSessionIfNewer(data.session);
      })
      .catch(() => {});

    fetch('/api/fast-iso22k/crm', { cache: 'no-store' })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.records) applyRemoteCrmIfNewer(data.records, data._lastUpdated);
      })
      .catch(() => {});

    // Firestore Real-time Listeners
    const unsubSession = onSnapshot(
      doc(db, 'fast_iso22k_crm', 'current_session'),
      (snap) => {
        if (!active || !snap.exists()) return;
        applyRemoteSessionIfNewer(snap.data());
      },
      (err) => logIsoFirestoreError(err, IsoOperationType.GET, 'fast_iso22k_crm/current_session')
    );

    const unsubCrm = onSnapshot(
      doc(db, 'fast_iso22k_crm', 'database'),
      (snap) => {
        if (!active || !snap.exists()) return;
        const data = snap.data();
        if (data?.records && typeof data.records === 'object') {
          applyRemoteCrmIfNewer(data.records, data._lastUpdated, data._writerId);
        }
      },
      (err) => logIsoFirestoreError(err, IsoOperationType.GET, 'fast_iso22k_crm/database')
    );

    return () => {
      active = false;
      unsubSession();
      unsubCrm();
    };
  }, []);

  const buildStateDataObject = (timestamp = Date.now()) => {
    const data: Record<string, any> = {
      clientName,
      contactName,
      contactPhone,
      leadAuditor,
      auditType,
      auditAddress,
      fsmsScope,
      auditDate,
      reportNo,
      _progress: `${metrics.progressPct}%`,
      _compliancePct: `${metrics.compliancePct}%`,
      _completed: metrics.completed,
      _total: metrics.total,
      _lastUpdated: timestamp,
      _writerId: tabWriterIdRef.current,
      ...(activeCrmIdRef.current ? { _loadedFromCrmId: activeCrmIdRef.current } : {}),
    };

    Object.keys(compliance).forEach((id) => {
      if (compliance[id]) data[`comp_${id}`] = compliance[id];
    });
    Object.keys(severities).forEach((id) => {
      if (severities[id]) data[`sev_${id}`] = severities[id];
    });
    Object.keys(comments).forEach((id) => {
      if (comments[id]) data[`cmt_${id}`] = comments[id];
    });
    Object.keys(capa).forEach((id) => {
      if (capa[id]) data[`capa_${id}`] = capa[id];
    });

    return data;
  };

  // Debounced Auto-Save ONLY after actual user edits
  useEffect(() => {
    if (!hasHydratedRef.current || isApplyingRemoteRef.current || !hasUserEditedRef.current) return;

    setSyncStatus('saving');
    const snapshotPayload = buildStateDataObject(Date.now());
    latestPayloadRef.current = snapshotPayload;

    const timer = setTimeout(async () => {
      if (!hasUserEditedRef.current) return;
      hasUserEditedRef.current = false;
      const nowTs = Date.now();
      lastLocalTsRef.current = nowTs;
      const data = { ...snapshotPayload, _lastUpdated: nowTs };
      latestPayloadRef.current = data;

      try {
        localStorage.setItem(LOCAL_CURRENT_KEY, JSON.stringify(data));
        localStorage.setItem(LOCAL_CURRENT_TS_KEY, String(nowTs));
      } catch {}

      await persistSessionToCloudAndServer(data);
    }, 350);

    return () => clearTimeout(timer);
  }, [
    clientName,
    contactName,
    contactPhone,
    leadAuditor,
    auditType,
    auditAddress,
    fsmsScope,
    auditDate,
    reportNo,
    compliance,
    severities,
    comments,
    capa,
    metrics.progressPct,
    metrics.compliancePct,
    metrics.completed,
    metrics.total,
  ]);

  // Flush pending edits on unload, hide, or unmount
  useEffect(() => {
    const flushIfDirty = () => {
      if (hasUserEditedRef.current && latestPayloadRef.current) {
        hasUserEditedRef.current = false;
        const nowTs = Date.now();
        lastLocalTsRef.current = nowTs;
        const data = { ...latestPayloadRef.current, _lastUpdated: nowTs };
        try {
          localStorage.setItem(LOCAL_CURRENT_KEY, JSON.stringify(data));
          localStorage.setItem(LOCAL_CURRENT_TS_KEY, String(nowTs));
        } catch {}
        void persistSessionToCloudAndServer(data, true);
      }
    };

    const handleVisibility = () => {
      if (document.visibilityState === 'hidden') flushIfDirty();
    };

    window.addEventListener('beforeunload', flushIfDirty);
    window.addEventListener('pagehide', flushIfDirty);
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      window.removeEventListener('beforeunload', flushIfDirty);
      window.removeEventListener('pagehide', flushIfDirty);
      document.removeEventListener('visibilitychange', handleVisibility);
      flushIfDirty();
    };
  }, []);

  const markDirty = () => {
    if (!isApplyingRemoteRef.current) {
      hasUserEditedRef.current = true;
    }
  };

  // New Client Action
  const newClient = () => {
    setConfirmDialog({
      isOpen: true,
      title: 'Tạo hồ sơ đánh giá ISO 22000:2018 mới',
      message: "Tạo mới sẽ xóa trắng form hiện tại (hãy chắc chắn bạn đã 'Lưu CRM' nếu cần giữ dữ liệu). Tiếp tục?",
      onConfirm: () => {
        const resetTs = Date.now();
        lastLocalTsRef.current = resetTs;
        hasUserEditedRef.current = false;
        isApplyingRemoteRef.current = true;
        activeCrmIdRef.current = null;

        const resetObj: Record<string, any> = {
          clientName: '',
          contactName: '',
          contactPhone: '',
          leadAuditor: '',
          auditType: '',
          auditAddress: '',
          fsmsScope: '',
          auditDate: '',
          reportNo: '',
          _progress: '0%',
          _compliancePct: '100%',
          _completed: 0,
          _total: metrics.total,
          _lastUpdated: resetTs,
          _writerId: tabWriterIdRef.current,
          _isExplicitReset: true,
        };

        try {
          localStorage.setItem(LOCAL_CURRENT_KEY, JSON.stringify(resetObj));
          localStorage.setItem(LOCAL_CURRENT_TS_KEY, String(resetTs));
        } catch {}

        setClientName('');
        setContactName('');
        setContactPhone('');
        setLeadAuditor('');
        setAuditType('');
        setAuditAddress('');
        setFsmsScope('');
        setAuditDate('');
        setReportNo('');
        setCompliance({});
        setSeverities({});
        setComments({});
        setCapa({});
        setIsReportOpen(false);
        latestPayloadRef.current = resetObj;

        queueMicrotask(() => {
          isApplyingRemoteRef.current = false;
        });

        void persistSessionToCloudAndServer(resetObj);
        toast.info('Đã làm mới biểu mẫu ISO 22000:2018.');
        scrollToIsoSection('#iso22k-client-form');
      },
    });
  };

  // Save to CRM Action (merges safely with remote Firestore + server CRM)
  const saveToCRM = async () => {
    if (!clientName || !clientName.trim()) {
      toast.warning("Vui lòng điền ít nhất 'Tên Khách Hàng' trước khi lưu vào CRM!");
      scrollToIsoSection('#iso22k-client-form');
      return;
    }

    setSyncStatus('saving');
    const nowTs = Date.now();
    const currentData = buildStateDataObject(nowTs);
    const recordId = activeCrmIdRef.current || `${clientName.trim()}_${auditDate || nowTs}`;
    activeCrmIdRef.current = recordId;
    currentData._progress = `${metrics.progressPct}%`;
    currentData._compliancePct = `${metrics.compliancePct}%`;
    currentData._savedAt = new Date().toLocaleString('vi-VN');
    currentData._loadedFromCrmId = recordId;

    let latestRemoteRecords: Record<string, any> = {};
    let latestRemoteTs = 0;
    try {
      const remoteSnap = await getDoc(doc(db, 'fast_iso22k_crm', 'database'));
      if (remoteSnap.exists() && remoteSnap.data()?.records && typeof remoteSnap.data()?.records === 'object') {
        latestRemoteRecords = remoteSnap.data()!.records;
        latestRemoteTs = Number(remoteSnap.data()?._lastUpdated || 0);
      }
    } catch {}

    if (Object.keys(latestRemoteRecords).length === 0) {
      try {
        const res = await fetch('/api/fast-iso22k/crm', { cache: 'no-store' });
        if (res.ok) {
          const json = await res.json();
          if (json?.records && typeof json.records === 'object') {
            latestRemoteRecords = json.records;
            latestRemoteTs = Number(json._lastUpdated || 0);
          }
        }
      } catch {}
    }

    const mergedBase =
      latestRemoteTs > lastCrmTsRef.current
        ? { ...latestRemoteRecords }
        : { ...latestRemoteRecords, ...crmRecordsRef.current };

    const updatedCrm = {
      ...mergedBase,
      [recordId]: currentData,
    };

    lastCrmTsRef.current = nowTs;
    crmRecordsRef.current = updatedCrm;
    setCrmRecords(updatedCrm);
    try {
      localStorage.setItem(LOCAL_CRM_KEY, JSON.stringify(updatedCrm));
      localStorage.setItem(LOCAL_CRM_TS_KEY, String(nowTs));
    } catch {}

    let cloudSaved = false;
    let serverSaved = false;

    try {
      await setDoc(doc(db, 'fast_iso22k_crm', 'database'), {
        records: updatedCrm,
        _lastUpdated: nowTs,
        _writerId: tabWriterIdRef.current,
      });
      cloudSaved = true;
    } catch (e) {
      logIsoFirestoreError(e, IsoOperationType.WRITE, 'fast_iso22k_crm/database');
    }

    try {
      const res = await fetch('/api/fast-iso22k/crm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          records: updatedCrm,
          _lastUpdated: nowTs,
          _writerId: tabWriterIdRef.current,
        }),
      });
      serverSaved = res.ok;
    } catch {}

    hasUserEditedRef.current = false;
    lastLocalTsRef.current = nowTs;
    try {
      localStorage.setItem(LOCAL_CURRENT_KEY, JSON.stringify(currentData));
      localStorage.setItem(LOCAL_CURRENT_TS_KEY, String(nowTs));
    } catch {}
    await persistSessionToCloudAndServer(currentData);

    if (cloudSaved || serverSaved) {
      toast.success(`Đã lưu & đồng bộ hồ sơ "${clientName.trim()}" vào CRM thành công!`);
    } else {
      toast.warning('Đã lưu cục bộ, nhưng chưa thể đồng bộ lên máy chủ lúc này.');
    }
  };

  // Load Record from CRM
  const loadRecord = (id: string) => {
    const rec = crmRecordsRef.current[id];
    if (!rec) return;
    setConfirmDialog({
      isOpen: true,
      title: 'Tải hồ sơ từ CRM',
      message: `Tải dữ liệu của "${rec.clientName || 'khách hàng'}" sẽ ghi đè lên form làm việc hiện tại. Tiếp tục?`,
      onConfirm: () => {
        const nowTs = Date.now();
        lastLocalTsRef.current = nowTs;
        hasUserEditedRef.current = false;
        const syncedRec = {
          ...rec,
          _loadedFromCrmId: id,
          _lastUpdated: nowTs,
          _writerId: tabWriterIdRef.current,
        };
        applyStateData(syncedRec);
        latestPayloadRef.current = syncedRec;
        try {
          localStorage.setItem(LOCAL_CURRENT_KEY, JSON.stringify(syncedRec));
          localStorage.setItem(LOCAL_CURRENT_TS_KEY, String(nowTs));
        } catch {}
        void persistSessionToCloudAndServer(syncedRec);
        setIsCrmOpen(false);
        toast.success(`Đã tải hồ sơ: ${rec.clientName || id}`);
        scrollToIsoSection('#iso22k-client-form');
      },
    });
  };

  // Delete Record from CRM
  const deleteRecord = (id: string) => {
    const targetName = crmRecordsRef.current[id]?.clientName || 'khách hàng này';
    setConfirmDialog({
      isOpen: true,
      title: 'Xóa dữ liệu CRM',
      message: `Bạn có chắc chắn muốn xóa hồ sơ "${targetName}" khỏi hệ thống CRM?`,
      onConfirm: async () => {
        setSyncStatus('saving');
        const nowTs = Date.now();
        let baseRecords: Record<string, any> = { ...crmRecordsRef.current };
        try {
          const remoteSnap = await getDoc(doc(db, 'fast_iso22k_crm', 'database'));
          if (remoteSnap.exists() && remoteSnap.data()?.records && typeof remoteSnap.data()?.records === 'object') {
            const remoteTs = Number(remoteSnap.data()?._lastUpdated || 0);
            baseRecords =
              remoteTs >= lastCrmTsRef.current
                ? { ...remoteSnap.data()!.records }
                : { ...remoteSnap.data()!.records, ...baseRecords };
          }
        } catch {}

        const updated = { ...baseRecords };
        delete updated[id];
        if (activeCrmIdRef.current === id) {
          activeCrmIdRef.current = null;
        }

        lastCrmTsRef.current = nowTs;
        crmRecordsRef.current = updated;
        setCrmRecords(updated);
        try {
          localStorage.setItem(LOCAL_CRM_KEY, JSON.stringify(updated));
          localStorage.setItem(LOCAL_CRM_TS_KEY, String(nowTs));
        } catch {}

        let cloudOk = false;
        let serverOk = false;

        try {
          await setDoc(doc(db, 'fast_iso22k_crm', 'database'), {
            records: updated,
            _lastUpdated: nowTs,
            _writerId: tabWriterIdRef.current,
          });
          cloudOk = true;
        } catch (e) {
          logIsoFirestoreError(e, IsoOperationType.DELETE, 'fast_iso22k_crm/database');
        }

        try {
          const res = await fetch('/api/fast-iso22k/crm', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              records: updated,
              _lastUpdated: nowTs,
              _writerId: tabWriterIdRef.current,
            }),
          });
          serverOk = res.ok;
        } catch {}

        setSyncStatus(cloudOk || serverOk ? 'synced' : 'offline');
        toast.success(`Đã xóa hồ sơ "${targetName}" khỏi CRM.`);
      },
    });
  };

  // Filtered Checklist Sections
  const filteredSections = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    return ISO22K_CHECKLIST_DATA.map((sec, sIdx) => {
      const matchedItems = sec.items.filter((it) => {
        const compVal = compliance[it.id] || '';
        if (statusFilter === 'UNRATED' && compVal) return false;
        if (statusFilter !== 'ALL' && statusFilter !== 'UNRATED' && compVal !== statusFilter) {
          return false;
        }
        if (q) {
          return (
            it.clause.toLowerCase().includes(q) ||
            it.text.toLowerCase().includes(q) ||
            it.id.toLowerCase().includes(q) ||
            sec.section.toLowerCase().includes(q)
          );
        }
        return true;
      });
      return {
        ...sec,
        sIdx,
        matchedItems,
      };
    });
  }, [searchQuery, statusFilter, compliance]);

  const handleMarkRemainingPass = () => {
    const toMark: string[] = [];
    filteredSections.forEach((sec) => {
      sec.matchedItems.forEach((it) => {
        if (!compliance[it.id]) toMark.push(it.id);
      });
    });
    if (toMark.length === 0) {
      toast.info('Tất cả điều khoản đang hiển thị đều đã được đánh giá.');
      return;
    }
    markDirty();
    setCompliance((prev) => {
      const next = { ...prev };
      toMark.forEach((id) => {
        next[id] = 'Y';
      });
      return next;
    });
    toast.success(`Đã đánh dấu Đạt (Y) cho ${toMark.length} điều khoản còn lại.`);
  };

  const toggleAllSections = (open: boolean) => {
    if (open) {
      setOpenSections(ISO22K_CHECKLIST_DATA.map((_, i) => i));
    } else {
      setOpenSections([]);
    }
  };

  const toggleSection = (idx: number) => {
    setOpenSections((prev) =>
      prev.includes(idx) ? prev.filter((i) => i !== idx) : [...prev, idx]
    );
  };

  // Report Findings Computed
  const reportRows = useMemo(() => {
    const rows: Array<{
      id: string;
      clause: string;
      section: string;
      text: string;
      status: string;
      statusLabel: string;
      severity: string;
      notes: string;
      capaText: string;
      isIssue: boolean;
    }> = [];

    ISO22K_CHECKLIST_DATA.forEach((sec) => {
      sec.items.forEach((item) => {
        const comp = compliance[item.id] || '';
        const sev = severities[item.id] || '';
        const notes = comments[item.id] || '';
        const capaText = capa[item.id] || '';

        const isIssue =
          sev === 'Major' ||
          sev === 'Minor' ||
          sev === 'Observation' ||
          comp === 'N' ||
          comp === 'NI';

        if (reportMode === 'nc' && !isIssue) return;

        const statusLabel =
          comp === 'Y'
            ? 'Đạt (Y)'
            : comp === 'N'
              ? 'Không đạt (N)'
              : comp === 'NI'
                ? 'Cần cải thiện (NI)'
                : comp === 'NA'
                  ? 'N/A'
                  : 'Chưa đánh giá';

        const effectiveSev =
          sev || (comp === 'N' ? 'Minor' : comp === 'NI' ? 'Observation' : '—');

        rows.push({
          id: item.id,
          clause: item.clause,
          section: sec.section,
          text: item.text,
          status: comp || '—',
          statusLabel,
          severity: effectiveSev,
          notes,
          capaText,
          isIssue,
        });
      });
    });

    return rows;
  }, [compliance, severities, comments, capa, reportMode]);

  const openReport = (mode: 'nc' | 'all') => {
    setReportMode(mode);
    if (mode === 'nc') {
      const hasIssues =
        Object.keys(compliance).some((k) => compliance[k] === 'N' || compliance[k] === 'NI') ||
        Object.keys(severities).some((k) => Boolean(severities[k]));
      if (!hasIssues) {
        toast.info(
          'Hoàn hảo! Chưa có lỗi nào được phân loại (Major/Minor/Observation hoặc "N / NI").'
        );
        return;
      }
    }
    setIsReportOpen(true);
    scrollToIsoSection('#iso22k-report-panel');
  };

  const handlePrintReport = () => {
    document.body.classList.add('printing-iso22k-report');
    const cleanup = () => {
      document.body.classList.remove('printing-iso22k-report');
      window.removeEventListener('afterprint', cleanup);
    };
    window.addEventListener('afterprint', cleanup);
    setTimeout(() => {
      window.print();
      setTimeout(cleanup, 1200);
    }, 120);
  };

  const handleExportCsv = () => {
    const bom = '\uFEFF';
    const headers = [
      'Dieu khoan',
      'Noi dung yeu cau',
      'Ket qua',
      'Phan loai loi',
      'Bang chung & Ghi chu',
      'Hanh dong khac phuc (CAPA)',
    ];
    const csvCell = (val: string) => `"${String(val || '').replace(/"/g, '""')}"`;
    const lines = [
      headers.map(csvCell).join(','),
      ...reportRows.map((r) =>
        [r.clause, r.text, r.statusLabel, r.severity, r.notes, r.capaText]
          .map(csvCell)
          .join(',')
      ),
    ];
    const blob = new Blob([bom + lines.join('\r\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ISO22000_2018_${(clientName || 'FastConsulting').replace(/\s+/g, '_')}_${auditDate || 'report'}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Đã xuất file Excel (.csv) báo cáo ISO 22000:2018.');
  };

  const handleDownloadHtml = () => {
    const title =
      reportMode === 'all'
        ? 'BÁO CÁO ĐÁNH GIÁ TOÀN DIỆN ISO 22000:2018'
        : 'BÁO CÁO KẾT QUẢ ĐÁNH GIÁ & HÀNH ĐỘNG KHẮC PHỤC (NCR & CAPA) — ISO 22000:2018';

    const rowsHtml = reportRows
      .map(
        (r) => `
      <tr>
        <td style="text-align:center;font-weight:700;">${escapeHtml(r.clause)}</td>
        <td>${escapeHtml(r.text)}</td>
        <td style="text-align:center;font-weight:700;">${escapeHtml(r.statusLabel)}</td>
        <td style="text-align:center;">${escapeHtml(r.severity)}</td>
        <td>${escapeHtml(r.notes || '—')}</td>
        <td>${escapeHtml(r.capaText || '—')}</td>
      </tr>`
      )
      .join('');

    const htmlDoc = `<!DOCTYPE html><html lang="vi"><head><meta charset="UTF-8"><title>${title}</title>
    <style>
      body{font-family:'Segoe UI',sans-serif;color:#1e293b;padding:28px;max-width:1100px;margin:0 auto;}
      h1{color:#005c56;font-size:20px;margin:4px 0 12px;}
      .meta{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;border:1px solid #cbd5e1;padding:12px;border-radius:8px;margin-bottom:16px;font-size:13px;}
      table{width:100%;border-collapse:collapse;font-size:12.5px;}
      th,td{border:1px solid #cbd5e1;padding:8px;vertical-align:top;text-align:left;}
      th{background:#005c56;color:#fff;text-align:center;}
    </style></head><body>
      <div style="text-align:center;border-bottom:2px solid #005c56;padding-bottom:10px;margin-bottom:14px;">
        <div style="font-size:11px;font-weight:700;color:#007c76;letter-spacing:1.2px;">FAST CONSULTING · FOOD ALL STANDARD &amp; TRAINING</div>
        <h1>${title}</h1>
      </div>
      <div class="meta">
        <div><strong>Khách hàng:</strong> ${escapeHtml(clientName || '—')}</div>
        <div><strong>Người liên hệ:</strong> ${escapeHtml(contactName || '—')}</div>
        <div><strong>Điện thoại:</strong> ${escapeHtml(contactPhone || '—')}</div>
        <div><strong>Lead Auditor:</strong> ${escapeHtml(leadAuditor || '—')}</div>
        <div><strong>Loại đánh giá:</strong> ${escapeHtml(auditType || '—')}</div>
        <div><strong>Ngày đánh giá:</strong> ${escapeHtml(formatDateVN(auditDate))}</div>
        <div><strong>Phạm vi:</strong> ${escapeHtml(fsmsScope || '—')}</div>
        <div><strong>Số Report:</strong> ${escapeHtml(reportNo || '—')}</div>
        <div><strong>Địa chỉ:</strong> ${escapeHtml(auditAddress || '—')}</div>
      </div>
      <table>
        <thead>
          <tr>
            <th style="width:12%;">Điều khoản</th>
            <th style="width:28%;">Nội dung Yêu cầu</th>
            <th style="width:10%;">Kết quả</th>
            <th style="width:11%;">Phân loại</th>
            <th style="width:19%;">Bằng chứng &amp; Ghi chú</th>
            <th style="width:20%;">Hành động khắc phục (CAPA)</th>
          </tr>
        </thead>
        <tbody>${rowsHtml}</tbody>
      </table>
    </body></html>`;

    const blob = new Blob([htmlDoc], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ISO22000_Report_${(clientName || 'FastConsulting').replace(/\s+/g, '_')}_${auditDate || 'report'}.html`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Đã tải xuống báo cáo HTML.');
  };

  return (
    <div className="fast-iso22k-root space-y-6 text-slate-800">
      {/* Top Action & Sync Status Bar */}
      <div className="iso22k-main-checklist bg-white rounded-2xl border border-slate-200 p-4 md:p-5 shadow-xs flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2.5">
            <span className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-[#005c56]">
              <ShieldCheck className="w-4 h-4 text-[#007c76]" />
              ISO 22000:2018 · FSMS Full Audit
            </span>
            <span className="text-slate-300">|</span>
            <span
              className={`inline-flex items-center gap-1.5 text-xs font-semibold ${
                syncStatus === 'synced'
                  ? 'text-emerald-700'
                  : syncStatus === 'saving'
                    ? 'text-amber-600'
                    : 'text-slate-500'
              }`}
            >
              {syncStatus === 'saving' ? (
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Cloud className="w-3.5 h-3.5" />
              )}
              {syncStatus === 'synced'
                ? `Đã đồng bộ Cloud${lastSyncedAt ? ` (${lastSyncedAt})` : ''}`
                : syncStatus === 'saving'
                  ? 'Đang đồng bộ Cloud...'
                  : 'Chế độ lưu cục bộ (Offline)'}
            </span>
          </div>
          <h3 className="text-lg md:text-xl font-black text-slate-900 tracking-tight">
            Đánh Giá Tiêu Chuẩn ISO 22000:2018 (43 Điều Khoản Full Version)
          </h3>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={newClient}
            className="px-3.5 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold inline-flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Tạo mới
          </button>
          <button
            type="button"
            onClick={saveToCRM}
            className="px-4 py-2 rounded-xl bg-[#007c76] hover:bg-[#005c56] text-white text-xs font-bold inline-flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
          >
            <Save className="w-3.5 h-3.5" />
            Lưu CRM
          </button>
          <button
            type="button"
            onClick={() => setIsCrmOpen((v) => !v)}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold inline-flex items-center gap-1.5 border transition-colors cursor-pointer ${
              isCrmOpen
                ? 'bg-slate-900 text-white border-slate-900'
                : 'bg-slate-50 hover:bg-slate-100 text-slate-800 border-slate-200'
            }`}
          >
            <History className="w-3.5 h-3.5" />
            {isCrmOpen ? 'Ẩn Dữ liệu CRM' : `Dữ liệu CRM (${Object.keys(crmRecords).length})`}
          </button>
        </div>
      </div>

      {/* KPI Summary Cards */}
      <div className="iso22k-main-checklist grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
        <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs">
          <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
            Tiến độ đánh giá
          </div>
          <div className="mt-1 flex items-baseline justify-between">
            <span className="text-2xl font-black text-slate-900 tabular-nums">
              {metrics.progressPct}%
            </span>
            <span className="text-xs font-semibold text-slate-500 tabular-nums">
              {metrics.completed} / {metrics.total} điều khoản
            </span>
          </div>
          <div className="mt-2.5 h-1.5 w-full rounded-full bg-slate-100 overflow-hidden">
            <div
              className="h-full bg-[#007c76] transition-all duration-300"
              style={{ width: `${metrics.progressPct}%` }}
            />
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs">
          <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
            Phù hợp tiêu chuẩn (Y)
          </div>
          <div className="mt-1 flex items-baseline justify-between">
            <span className="text-2xl font-black text-emerald-700 tabular-nums">
              {metrics.yCount}
            </span>
            <span className="text-xs font-semibold text-slate-400 tabular-nums">
              N/A: {metrics.naCount}
            </span>
          </div>
          <p className="mt-1.5 text-[11px] text-slate-500 font-medium">
            Chưa đánh giá: <strong className="tabular-nums text-slate-700">{metrics.unrated}</strong>
          </p>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs">
          <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
            Phân loại NCR (N / NI)
          </div>
          <div className="mt-1 flex items-baseline justify-between">
            <span className="text-2xl font-black text-rose-600 tabular-nums">
              {metrics.nCount + metrics.niCount}
            </span>
            <span className="text-xs font-semibold text-slate-500 tabular-nums">
              N: {metrics.nCount} · NI: {metrics.niCount}
            </span>
          </div>
          <p className="mt-1.5 text-[11px] text-slate-500 font-medium tabular-nums">
            Major: {metrics.majorCount} · Minor: {metrics.minorCount} · Obs: {metrics.obsCount}
          </p>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs">
          <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
            Tỷ lệ tuân thủ FSMS
          </div>
          <div className="mt-1 flex items-baseline justify-between">
            <span className="text-2xl font-black text-[#005c56] tabular-nums">
              {metrics.compliancePct}%
            </span>
          </div>
          <p
            className={`mt-1.5 text-[11px] font-bold truncate ${
              metrics.nCount > 20 ? 'text-rose-600' : 'text-slate-700'
            }`}
            title={metrics.readiness}
          >
            {metrics.nCount > 20 ? 'Cảnh báo >20 lỗi "N" — cần rà soát' : metrics.readiness}
          </p>
        </div>
      </div>

      {/* Client & Audit Info Form */}
      <div
        id="iso22k-client-form"
        className="iso22k-main-checklist bg-white rounded-2xl border border-slate-200 p-5 md:p-6 shadow-xs space-y-4"
      >
        <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <ClipboardCheck className="w-4 h-4 text-[#007c76]" />
            <h4 className="text-sm font-black uppercase tracking-wider text-slate-900">
              Thông Tin Khách Hàng &amp; Chuyên Gia Đánh Giá
            </h4>
          </div>
          {activeCrmIdRef.current && (
            <span className="text-[11px] font-semibold text-[#005c56] bg-teal-50 px-2.5 py-1 rounded-lg border border-teal-200">
              Đang chỉnh sửa CRM: {activeCrmIdRef.current}
            </span>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div>
            <label htmlFor="iso-clientName" className="block text-xs font-bold text-slate-700 mb-1.5">
              Tên Khách Hàng <span className="text-rose-500">*</span>
            </label>
            <input
              id="iso-clientName"
              type="text"
              placeholder="Tên doanh nghiệp / nhà máy..."
              value={clientName}
              onChange={(e) => {
                markDirty();
                setClientName(e.target.value);
              }}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 bg-white text-sm text-slate-900 focus:border-[#007c76] focus:ring-2 focus:ring-[#007c76]/15 outline-none"
            />
          </div>

          <div>
            <label htmlFor="iso-contactName" className="block text-xs font-bold text-slate-700 mb-1.5">
              Tên người liên hệ
            </label>
            <input
              id="iso-contactName"
              type="text"
              placeholder="Họ tên đại diện..."
              value={contactName}
              onChange={(e) => {
                markDirty();
                setContactName(e.target.value);
              }}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 bg-white text-sm text-slate-900 focus:border-[#007c76] focus:ring-2 focus:ring-[#007c76]/15 outline-none"
            />
          </div>

          <div>
            <label htmlFor="iso-contactPhone" className="block text-xs font-bold text-slate-700 mb-1.5">
              Số điện thoại liên hệ
            </label>
            <input
              id="iso-contactPhone"
              type="text"
              placeholder="09xx xxx xxx"
              value={contactPhone}
              onChange={(e) => {
                markDirty();
                setContactPhone(e.target.value);
              }}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 bg-white text-sm text-slate-900 focus:border-[#007c76] focus:ring-2 focus:ring-[#007c76]/15 outline-none"
            />
          </div>

          <div>
            <label htmlFor="iso-leadAuditor" className="block text-xs font-bold text-slate-700 mb-1.5">
              Chuyên gia đánh giá (Lead Auditor)
            </label>
            <input
              id="iso-leadAuditor"
              type="text"
              placeholder="Họ tên chuyên gia đánh giá..."
              value={leadAuditor}
              onChange={(e) => {
                markDirty();
                setLeadAuditor(e.target.value);
              }}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 bg-white text-sm text-slate-900 focus:border-[#007c76] focus:ring-2 focus:ring-[#007c76]/15 outline-none"
            />
          </div>

          <div>
            <label htmlFor="iso-auditType" className="block text-xs font-bold text-slate-700 mb-1.5">
              Loại đánh giá
            </label>
            <select
              id="iso-auditType"
              value={auditType}
              onChange={(e) => {
                markDirty();
                setAuditType(e.target.value);
              }}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 bg-white text-sm text-slate-900 focus:border-[#007c76] focus:ring-2 focus:ring-[#007c76]/15 outline-none"
            >
              <option value="">-- Chọn Loại Đánh Giá --</option>
              {AUDIT_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="iso-auditDate" className="block text-xs font-bold text-slate-700 mb-1.5">
              Ngày đánh giá
            </label>
            <input
              id="iso-auditDate"
              type="date"
              value={auditDate}
              onChange={(e) => {
                markDirty();
                setAuditDate(e.target.value);
              }}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 bg-white text-sm text-slate-900 focus:border-[#007c76] focus:ring-2 focus:ring-[#007c76]/15 outline-none"
            />
          </div>

          <div>
            <label htmlFor="iso-reportNo" className="block text-xs font-bold text-slate-700 mb-1.5">
              Số Report
            </label>
            <input
              id="iso-reportNo"
              type="text"
              placeholder="VD: ISO22K-2026-01"
              value={reportNo}
              onChange={(e) => {
                markDirty();
                setReportNo(e.target.value);
              }}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 bg-white text-sm text-slate-900 focus:border-[#007c76] focus:ring-2 focus:ring-[#007c76]/15 outline-none"
            />
          </div>

          <div>
            <label htmlFor="iso-fsmsScope" className="block text-xs font-bold text-slate-700 mb-1.5">
              Phạm vi (Scope)
            </label>
            <input
              id="iso-fsmsScope"
              type="text"
              placeholder="Sản phẩm / quá trình thuộc phạm vi FSMS..."
              value={fsmsScope}
              onChange={(e) => {
                markDirty();
                setFsmsScope(e.target.value);
              }}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 bg-white text-sm text-slate-900 focus:border-[#007c76] focus:ring-2 focus:ring-[#007c76]/15 outline-none"
            />
          </div>

          <div>
            <label htmlFor="iso-auditAddress" className="block text-xs font-bold text-slate-700 mb-1.5">
              Địa chỉ đánh giá
            </label>
            <input
              id="iso-auditAddress"
              type="text"
              placeholder="Địa điểm sản xuất / kinh doanh..."
              value={auditAddress}
              onChange={(e) => {
                markDirty();
                setAuditAddress(e.target.value);
              }}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 bg-white text-sm text-slate-900 focus:border-[#007c76] focus:ring-2 focus:ring-[#007c76]/15 outline-none"
            />
          </div>
        </div>
      </div>

      {/* Inline CRM History Panel */}
      {isCrmOpen && (
        <div
          id="iso22k-crm-panel"
          className="iso22k-main-checklist bg-white rounded-2xl border-2 border-[#007c76] p-5 md:p-6 shadow-md space-y-4"
        >
          <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-200">
            <div className="flex items-center gap-2">
              <History className="w-4 h-4 text-[#007c76]" />
              <h4 className="text-sm font-black uppercase tracking-wider text-slate-900">
                Thống Kê Khách Hàng (CRM) — ISO 22000:2018 ({Object.keys(crmRecords).length} hồ sơ)
              </h4>
            </div>
            <button
              type="button"
              onClick={() => setIsCrmOpen(false)}
              className="px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-xs font-bold text-slate-700 cursor-pointer"
            >
              Đóng bảng CRM
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[700px] text-xs">
              <thead>
                <tr className="bg-slate-50 border-y border-slate-200 text-slate-600 uppercase font-bold">
                  <th className="py-2.5 px-3">Ngày đánh giá</th>
                  <th className="py-2.5 px-3">Tên Khách Hàng</th>
                  <th className="py-2.5 px-3">Loại đánh giá</th>
                  <th className="py-2.5 px-3 text-center">Tiến độ</th>
                  <th className="py-2.5 px-3 text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {Object.keys(crmRecords).length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-slate-500">
                      Chưa có dữ liệu khách hàng nào được lưu trữ.
                    </td>
                  </tr>
                ) : (
                  Object.keys(crmRecords)
                    .sort((a, b) => Number(crmRecords[b]?._lastUpdated || 0) - Number(crmRecords[a]?._lastUpdated || 0))
                    .map((recId) => {
                      const rec = crmRecords[recId];
                      return (
                        <tr key={recId} className="hover:bg-slate-50/70">
                          <td className="py-2.5 px-3 tabular-nums text-slate-600">
                            {rec.auditDate
                              ? formatDateVN(rec.auditDate)
                              : rec._savedAt
                                ? rec._savedAt.split(' ')[1] || rec._savedAt
                                : 'N/A'}
                          </td>
                          <td className="py-2.5 px-3 font-bold text-slate-900">
                            {rec.clientName || recId}
                          </td>
                          <td className="py-2.5 px-3 text-slate-700">{rec.auditType || 'N/A'}</td>
                          <td className="py-2.5 px-3 text-center font-bold text-[#005c56] tabular-nums">
                            {rec._progress || '0%'}
                          </td>
                          <td className="py-2.5 px-3 text-right whitespace-nowrap space-x-2">
                            <button
                              type="button"
                              onClick={() => loadRecord(recId)}
                              className="px-2.5 py-1 rounded-lg border border-[#007c76] text-[#005c56] hover:bg-teal-50 font-bold inline-flex items-center gap-1 cursor-pointer"
                            >
                              <FolderOpen className="w-3 h-3" />
                              Tải
                            </button>
                            <button
                              type="button"
                              onClick={() => deleteRecord(recId)}
                              className="px-2.5 py-1 rounded-lg border border-rose-200 text-rose-600 hover:bg-rose-50 font-bold inline-flex items-center gap-1 cursor-pointer"
                            >
                              <Trash2 className="w-3 h-3" />
                              Xóa
                            </button>
                          </td>
                        </tr>
                      );
                    })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Search, Status Filters & Action Toolbar */}
      <div className="iso22k-main-checklist bg-white rounded-2xl border border-slate-200 p-4 shadow-xs space-y-3">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div className="relative flex-1 min-w-[240px]">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Tìm kiếm điều khoản (8.5.4, PRP, truy xuất, thẩm tra)..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 rounded-xl border border-slate-300 bg-white text-sm text-slate-900 focus:border-[#007c76] focus:ring-2 focus:ring-[#007c76]/15 outline-none"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => toggleAllSections(true)}
              className="px-3 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-xs font-bold text-slate-700 cursor-pointer"
            >
              Mở rộng tất cả
            </button>
            <button
              type="button"
              onClick={() => toggleAllSections(false)}
              className="px-3 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-xs font-bold text-slate-700 cursor-pointer"
            >
              Thu gọn tất cả
            </button>
            <button
              type="button"
              onClick={handleMarkRemainingPass}
              className="px-3 py-2 rounded-xl border border-emerald-200 bg-emerald-50 hover:bg-emerald-100 text-xs font-bold text-emerald-800 inline-flex items-center gap-1.5 cursor-pointer"
            >
              <CheckCheck className="w-3.5 h-3.5" />
              Đạt phần còn lại
            </button>
            <button
              type="button"
              onClick={() => openReport('all')}
              className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              Báo cáo Toàn diện
            </button>
            <button
              type="button"
              onClick={() => openReport('nc')}
              className="px-3.5 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer"
            >
              <FileWarning className="w-3.5 h-3.5" />
              Báo cáo Lỗi &amp; CAPA
            </button>
          </div>
        </div>

        {/* Status Filter Pills */}
        <div className="flex flex-wrap items-center gap-1.5 pt-1">
          {(
            [
              { id: 'ALL', label: `Tất cả (${metrics.total})` },
              { id: 'UNRATED', label: `Chưa chấm (${metrics.unrated})` },
              { id: 'Y', label: `Đạt - Y (${metrics.yCount})` },
              { id: 'N', label: `Lỗi - N (${metrics.nCount})` },
              { id: 'NI', label: `Cải thiện - NI (${metrics.niCount})` },
              { id: 'NA', label: `N/A (${metrics.naCount})` },
            ] as const
          ).map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setStatusFilter(tab.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                statusFilter === tab.id
                  ? 'bg-[#007c76] text-white'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Inline NCR & CAPA / Comprehensive Report Panel */}
      {isReportOpen && (
        <div
          id="iso22k-report-panel"
          className="bg-white text-slate-900 rounded-2xl border-2 border-[#007c76] p-5 md:p-7 shadow-lg space-y-5"
        >
          <div className="print:hidden flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-slate-200">
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => setReportMode('nc')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold cursor-pointer ${
                  reportMode === 'nc'
                    ? 'bg-amber-600 text-white'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                Báo cáo NCR &amp; CAPA
              </button>
              <button
                type="button"
                onClick={() => setReportMode('all')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold cursor-pointer ${
                  reportMode === 'all'
                    ? 'bg-[#007c76] text-white'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                Toàn bộ 43 Điều khoản
              </button>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={handlePrintReport}
                className="px-3.5 py-2 rounded-xl bg-[#007c76] hover:bg-[#005c56] text-white text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer"
              >
                <Printer className="w-3.5 h-3.5" />
                In Báo Cáo (PDF)
              </button>
              <button
                type="button"
                onClick={handleExportCsv}
                className="px-3.5 py-2 rounded-xl border border-emerald-600 text-emerald-700 hover:bg-emerald-50 text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer"
              >
                <FileSpreadsheet className="w-3.5 h-3.5" />
                Xuất Excel (.csv)
              </button>
              <button
                type="button"
                onClick={handleDownloadHtml}
                className="px-3.5 py-2 rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-50 text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer"
              >
                <FileCode2 className="w-3.5 h-3.5" />
                Tải HTML
              </button>
              <button
                type="button"
                onClick={() => setIsReportOpen(false)}
                className="px-3 py-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 text-xs font-bold cursor-pointer"
              >
                Đóng
              </button>
            </div>
          </div>

          <div className="text-center border-b-2 border-[#007c76] pb-3">
            <div className="text-[11px] font-bold uppercase tracking-widest text-[#007c76]">
              FAST CONSULTING · FOOD ALL STANDARD &amp; TRAINING
            </div>
            <h2 className="text-lg md:text-xl font-black text-slate-900 mt-1">
              {reportMode === 'all'
                ? 'BÁO CÁO ĐÁNH GIÁ TOÀN DIỆN TIÊU CHUẨN ISO 22000:2018'
                : 'BÁO CÁO KẾT QUẢ ĐÁNH GIÁ & HÀNH ĐỘNG KHẮC PHỤC (NCR & CAPA)'}
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 p-3.5 rounded-xl border border-slate-200 text-xs bg-white">
            <div><strong>Khách hàng:</strong> {clientName || '—'}</div>
            <div><strong>Người liên hệ:</strong> {contactName || '—'}</div>
            <div><strong>Điện thoại:</strong> {contactPhone || '—'}</div>
            <div><strong>Lead Auditor:</strong> {leadAuditor || '—'}</div>
            <div><strong>Loại đánh giá:</strong> {auditType || '—'}</div>
            <div><strong>Ngày đánh giá:</strong> {formatDateVN(auditDate)}</div>
            <div><strong>Phạm vi (Scope):</strong> {fsmsScope || '—'}</div>
            <div><strong>Số Report:</strong> {reportNo || '—'}</div>
            <div><strong>Địa chỉ:</strong> {auditAddress || '—'}</div>
          </div>

          <div className="flex flex-wrap items-center justify-around gap-3 p-3 rounded-xl border border-slate-200 text-xs font-bold bg-slate-50/70 tabular-nums">
            <span>Tổng lỗi (NCR/NI): {metrics.majorCount + metrics.minorCount + metrics.obsCount}</span>
            <span className="text-rose-600">Major: {metrics.majorCount}</span>
            <span className="text-amber-600">Minor: {metrics.minorCount}</span>
            <span className="text-sky-600">Observation: {metrics.obsCount}</span>
            <span className="text-[#005c56]">Tỷ lệ tuân thủ: {metrics.compliancePct}%</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-xs">
              <thead>
                <tr className="bg-[#005c56] text-white">
                  <th className="p-2.5 border border-[#005c56] w-[11%] text-center">Điều khoản</th>
                  <th className="p-2.5 border border-[#005c56] w-[27%] text-left">Nội dung Yêu cầu</th>
                  <th className="p-2.5 border border-[#005c56] w-[10%] text-center">Kết quả</th>
                  <th className="p-2.5 border border-[#005c56] w-[11%] text-center">Phân loại</th>
                  <th className="p-2.5 border border-[#005c56] w-[20%] text-left">Bằng chứng &amp; Ghi chú</th>
                  <th className="p-2.5 border border-[#005c56] w-[21%] text-left">Hành động khắc phục (CAPA)</th>
                </tr>
              </thead>
              <tbody>
                {reportRows.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-6 text-center border border-slate-200 text-slate-500">
                      Không có điều khoản nào khớp điều kiện báo cáo hiện tại.
                    </td>
                  </tr>
                ) : (
                  reportRows.map((r) => (
                    <tr key={r.id} className={r.isIssue ? 'bg-rose-50/30' : 'bg-white'}>
                      <td className="p-2.5 border border-slate-200 text-center font-bold text-[#005c56]">
                        {r.clause}
                      </td>
                      <td className="p-2.5 border border-slate-200 text-slate-800">{r.text}</td>
                      <td className="p-2.5 border border-slate-200 text-center font-bold">
                        {r.statusLabel}
                      </td>
                      <td className="p-2.5 border border-slate-200 text-center font-bold">
                        {r.severity}
                      </td>
                      <td className="p-2.5 border border-slate-200 text-slate-700">{r.notes || '—'}</td>
                      <td className="p-2.5 border border-slate-200 text-slate-700">{r.capaText || '—'}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div className="grid grid-cols-2 gap-8 pt-8 text-center text-xs">
            <div>
              <div className="font-bold text-slate-900">ĐẠI DIỆN KHÁCH HÀNG</div>
              <div className="italic text-slate-500 mt-0.5 mb-12">(Ký và ghi rõ họ tên)</div>
              <div className="font-bold text-slate-800">{contactName || '........................................'}</div>
            </div>
            <div>
              <div className="font-bold text-slate-900">CHUYÊN GIA ĐÁNH GIÁ (LEAD AUDITOR)</div>
              <div className="italic text-slate-500 mt-0.5 mb-12">(Ký và ghi rõ họ tên)</div>
              <div className="font-bold text-slate-800">{leadAuditor || '........................................'}</div>
            </div>
          </div>
        </div>
      )}

      {/* Checklist Accordion Sections */}
      <div id="checklistContainer" className="iso22k-main-checklist space-y-4">
        {filteredSections.map((sec) => {
          if (sec.matchedItems.length === 0) return null;
          const isOpen = openSections.includes(sec.sIdx);
          const secTotal = sec.items.length;
          const secDone = sec.items.filter((it) => Boolean(compliance[it.id])).length;
          const secNc = sec.items.filter(
            (it) => compliance[it.id] === 'N' || compliance[it.id] === 'NI'
          ).length;

          return (
            <div
              key={sec.section}
              className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden"
            >
              <button
                type="button"
                onClick={() => toggleSection(sec.sIdx)}
                className="w-full px-5 py-4 bg-slate-50/80 hover:bg-teal-50/40 flex items-center justify-between gap-3 text-left transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <ChevronDown
                    className={`w-4 h-4 text-[#005c56] shrink-0 transition-transform ${
                      isOpen ? 'rotate-0' : '-rotate-90'
                    }`}
                  />
                  <span className="text-sm font-black text-slate-900 truncate">
                    {sec.section}
                  </span>
                </div>
                <div className="flex items-center gap-2 shrink-0 text-xs font-bold tabular-nums">
                  {secNc > 0 && (
                    <span className="px-2 py-0.5 rounded-md bg-rose-50 text-rose-700 border border-rose-200">
                      {secNc} NC/NI
                    </span>
                  )}
                  <span className="px-2.5 py-0.5 rounded-md bg-teal-50 text-[#005c56] border border-teal-200">
                    {secDone}/{secTotal}
                  </span>
                </div>
              </button>

              {isOpen && (
                <div className="divide-y divide-slate-200">
                  {sec.matchedItems.map((item) => {
                    const currentComp = compliance[item.id] || '';
                    const currentSev = severities[item.id] || '';
                    const currentCmt = comments[item.id] || '';
                    const currentCapa = capa[item.id] || '';
                    const isIssue = currentComp === 'N' || currentComp === 'NI';

                    return (
                      <div
                        key={item.id}
                        className={`p-4 md:p-5 grid grid-cols-1 lg:grid-cols-12 gap-4 transition-colors ${
                          isIssue ? 'bg-rose-50/25' : 'bg-white'
                        }`}
                      >
                        {/* Left: Clause & Text */}
                        <div className="lg:col-span-5 space-y-2">
                          <div className="flex items-center gap-2">
                            <span className="px-2.5 py-0.5 rounded-md bg-teal-50 border border-teal-200 text-[#005c56] text-xs font-black">
                              {item.clause}
                            </span>
                            {isIssue && (
                              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-rose-600">
                                <AlertTriangle className="w-3.5 h-3.5" />
                                Cần hành động CAPA
                              </span>
                            )}
                          </div>
                          <p className="text-sm text-slate-800 leading-relaxed font-medium">
                            {item.text}
                          </p>
                        </div>

                        {/* Middle: Compliance Rating Buttons */}
                        <div className="lg:col-span-3 flex flex-col justify-start gap-2">
                          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                            Đánh giá Tuân thủ
                          </span>
                          <div className="grid grid-cols-4 lg:grid-cols-2 gap-1.5">
                            {(
                              [
                                { val: 'Y', label: 'Y · Đạt', active: 'bg-emerald-600 text-white border-emerald-600', icon: Check },
                                { val: 'N', label: 'N · Lỗi', active: 'bg-rose-600 text-white border-rose-600', icon: X },
                                { val: 'NI', label: 'NI · Cải thiện', active: 'bg-amber-500 text-white border-amber-500', icon: AlertTriangle },
                                { val: 'NA', label: 'N/A', active: 'bg-slate-600 text-white border-slate-600', icon: Minus },
                              ] as const
                            ).map((opt) => {
                              const Icon = opt.icon;
                              const selected = currentComp === opt.val;
                              return (
                                <button
                                  key={opt.val}
                                  type="button"
                                  onClick={() => {
                                    markDirty();
                                    setCompliance((prev) => ({
                                      ...prev,
                                      [item.id]: prev[item.id] === opt.val ? '' : opt.val,
                                    }));
                                  }}
                                  className={`px-2.5 py-2 rounded-xl border text-xs font-bold inline-flex items-center justify-center gap-1 transition-all cursor-pointer ${
                                    selected
                                      ? opt.active
                                      : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-200'
                                  }`}
                                >
                                  <Icon className="w-3.5 h-3.5 shrink-0" />
                                  <span>{opt.label}</span>
                                </button>
                              );
                            })}
                          </div>
                        </div>

                        {/* Right: Severity, Evidence & CAPA */}
                        <div className="lg:col-span-4 space-y-2">
                          <select
                            value={currentSev}
                            onChange={(e) => {
                              markDirty();
                              setSeverities((prev) => ({ ...prev, [item.id]: e.target.value }));
                            }}
                            className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white text-xs text-slate-800 focus:border-[#007c76] outline-none"
                          >
                            <option value="">-- Chọn Phân loại lỗi --</option>
                            <option value="Major">Major (Lỗi Nặng)</option>
                            <option value="Minor">Minor (Lỗi Nhẹ)</option>
                            <option value="Observation">Observation (Quan sát)</option>
                          </select>

                          <textarea
                            rows={2}
                            placeholder="Bằng chứng / Ghi chú đánh giá (Evidence & Notes)..."
                            value={currentCmt}
                            onChange={(e) => {
                              markDirty();
                              setComments((prev) => ({ ...prev, [item.id]: e.target.value }));
                            }}
                            className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-white text-xs text-slate-800 focus:border-[#007c76] outline-none resize-y"
                          />

                          <textarea
                            rows={2}
                            placeholder="Hành động khắc phục (CAPA)..."
                            value={currentCapa}
                            onChange={(e) => {
                              markDirty();
                              setCapa((prev) => ({ ...prev, [item.id]: e.target.value }));
                            }}
                            className="w-full px-3 py-2 rounded-lg border border-sky-200 bg-sky-50/40 text-xs text-slate-800 focus:border-sky-500 outline-none resize-y"
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Custom Confirm Dialog */}
      {confirmDialog && confirmDialog.isOpen && (
        <div
          className="fixed inset-0 z-50 bg-slate-900/55 backdrop-blur-xs flex items-center justify-center p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) setConfirmDialog(null);
          }}
        >
          <div className="bg-white rounded-2xl border border-slate-200 max-w-md w-full p-6 shadow-2xl space-y-4">
            <h4 className="text-base font-black text-slate-900">{confirmDialog.title}</h4>
            <p className="text-sm text-slate-600 leading-relaxed">{confirmDialog.message}</p>
            <div className="flex justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setConfirmDialog(null)}
                className="px-4 py-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-xs font-bold text-slate-700 cursor-pointer"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                onClick={() => {
                  const fn = confirmDialog.onConfirm;
                  setConfirmDialog(null);
                  fn();
                }}
                className="px-4 py-2 rounded-xl bg-[#007c76] hover:bg-[#005c56] text-white text-xs font-bold cursor-pointer"
              >
                Xác nhận
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FastIso22kChecklist;
