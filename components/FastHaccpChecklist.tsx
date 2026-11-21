import React, { useState, useEffect, useRef, useMemo } from 'react';
import { auth, db } from '../firebase';
import { doc, setDoc, onSnapshot, getDoc } from 'firebase/firestore';
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

// Checklist Data Structure — preserved export for ecosystem compatibility
export const CHECKLIST_DATA = [
  {
    section: 'I. THIẾT KẾ CƠ SỞ VẬT CHẤT VÀ THIẾT BỊ (DESIGN OF FACILITIES AND EQUIPMENT)',
    items: [
      { id: 'I.1', text: 'Cơ sở sản xuất thực phẩm không được đặt ở nơi có mối đe dọa đến an toàn thực phẩm hoặc sự phù hợp mà không thể kiểm soát được bằng các biện pháp hợp lý.' },
      { id: 'I.2', text: 'Nằm cách xa các khu vực ô nhiễm môi trường và hoạt động công nghiệp, khu vực dễ bị ngập lụt, khu vực dễ bị côn trùng và động vật gây hại xâm nhập.' },
      { id: 'I.3', text: 'Thiết kế và bố trí phải cho phép bảo trì và làm sạch đầy đủ, giảm thiểu hoặc ngăn ngừa lây nhiễm chéo thông qua luồng di chuyển của nhân sự và nguyên vật liệu.' },
      { id: 'I.4', text: 'Bề mặt tường, vách ngăn và sàn phải làm bằng vật liệu không thấm nước, dễ làm sạch và khử trùng. Tường và vách ngăn phải nhẵn đến độ cao phù hợp.' },
      { id: 'I.5', text: 'Hệ thống thoát nước và xử lý chất thải phải đầy đủ, được bảo trì tốt, thiết kế để tránh làm ô nhiễm thực phẩm hoặc nguồn cung cấp nước.' },
      { id: 'I.6', text: 'Nhà vệ sinh và khu vực rửa tay phải đầy đủ, thiết kế hợp vệ sinh, lý tưởng nhất là vòi nước không vận hành bằng tay. Không dùng bồn rửa tay để rửa thực phẩm hoặc dụng cụ.' },
    ],
  },
  {
    section: 'II. ĐÀO TẠO VÀ NĂNG LỰC (TRAINING AND COMPETENCE)',
    items: [
      { id: 'II.1', text: 'Tất cả nhân sự phải nhận thức được vai trò và trách nhiệm của họ trong việc bảo vệ thực phẩm khỏi ô nhiễm hoặc hư hỏng.' },
      { id: 'II.2', text: 'Chương trình đào tạo phải bao gồm: bản chất các mối nguy, cách thức sản xuất, xử lý và đóng gói, điều kiện bảo quản.' },
      { id: 'II.3', text: 'Hồ sơ đào tạo (Refresher training) phải được duy trì. Các chương trình đào tạo cần được xem xét và cập nhật định kỳ.' },
    ],
  },
  {
    section: 'III. BẢO TRÌ, LÀM SẠCH VÀ KIỂM SOÁT ĐỘNG VẬT GÂY HẠI (MAINTENANCE, CLEANING AND PEST CONTROL)',
    items: [
      { id: 'III.1', text: 'Cơ sở và thiết bị phải được bảo trì để tạo điều kiện thuận lợi cho các quy trình làm sạch/khử trùng và ngăn ngừa ô nhiễm.' },
      { id: 'III.2', text: 'Hóa chất làm sạch và khử trùng phải được lưu trữ cẩn thận, tránh xa thực phẩm, đựng trong các vật chứa có nhận dạng rõ ràng để tránh ô nhiễm.' },
      { id: 'III.3', text: 'Các lỗ hổng, cống rãnh và những nơi động vật gây hại dễ xâm nhập phải được che chắn (ví dụ: màn lưới chống côn trùng).' },
      { id: 'III.4', text: 'Chất thải phải được thu gom, lưu trữ trong các thùng có nắp đậy, chống động vật gây hại và không được để tích tụ tràn lan trong khu vực xử lý thực phẩm.' },
    ],
  },
  {
    section: 'IV. VỆ SINH CÁ NHÂN (PERSONAL HYGIENE)',
    items: [
      { id: 'IV.1', text: 'Nhân sự mắc bệnh hoặc nghi ngờ mang mầm bệnh có khả năng lây truyền qua thực phẩm không được vào khu vực xử lý thực phẩm.' },
      { id: 'IV.2', text: 'Các vết xước và vết thương phải được băng kín bằng băng chống thấm nước và nếu cần thiết phải đeo găng tay.' },
      { id: 'IV.3', text: 'Cấm hút thuốc, khạc nhổ, nhai, ăn, uống, hắt hơi hoặc ho trên thực phẩm không được bảo vệ. Không mang trang sức, móng tay giả/lông mi giả vào khu sản xuất.' },
    ],
  },
  {
    section: 'V. KIỂM SOÁT VẬN HÀNH (CONTROL OF OPERATION)',
    items: [
      { id: 'V.1', text: 'Lập Lưu đồ quy trình (Flow diagram) thể hiện trình tự và sự tương tác của tất cả các bước trong quá trình vận hành, và phải được xác nhận thực tế tại hiện trường.' },
      { id: 'V.2', text: 'Thực phẩm sống, chưa chế biến phải được tách biệt với thực phẩm ăn liền (bằng vật lý hoặc thời gian), kết hợp làm sạch và khử trùng hiệu quả ở giữa các bước.' },
      { id: 'V.3', text: 'Có hệ thống kiểm soát vật liệu ngoại lai (kính, kim loại, nhựa, xương, gỗ). Sử dụng máy dò kim loại, tia X (nếu cần).' },
      { id: 'V.4', text: 'Hệ thống quản lý chất gây dị ứng (Allergen management) phải được áp dụng từ khâu tiếp nhận, chế biến đến bảo quản để tránh lây nhiễm chéo.' },
      { id: 'V.5', text: 'Thủ tục thu hồi (Recall procedures): Phải có quy trình thu hồi sản phẩm lỗi, không an toàn khỏi thị trường một cách nhanh chóng và hiệu quả.' },
    ],
  },
  {
    section: 'VI. CODEX - HACCP (12 BƯỚC & 7 NGUYÊN TẮC THẨM TRA)',
    items: [
      { id: 'VI.1', text: 'Thành lập đội HACCP đa ngành và xác định phạm vi (Bước 1).' },
      { id: 'VI.2', text: 'Mô tả đầy đủ về sản phẩm (thành phần, aw, pH, đóng gói, thời hạn sử dụng) (Bước 2).' },
      { id: 'VI.3', text: 'Tiến hành phân tích mối nguy (Hazard Analysis) để xác định các mối nguy đáng kể và biện pháp kiểm soát (Bước 6/Nguyên tắc 1).' },
      { id: 'VI.4', text: 'Xác định các Điểm kiểm soát tới hạn - CCPs (Bước 7/Nguyên tắc 2). Có thể sử dụng Cây quyết định (Decision tree).' },
      { id: 'VI.5', text: 'Thiết lập các Giới hạn tới hạn (Critical limits) đã được xác nhận giá trị sử dụng cho mỗi CCP (Bước 8/Nguyên tắc 3).' },
      { id: 'VI.6', text: 'Thiết lập hệ thống Giám sát (Monitoring system) cho từng CCP (Bước 9/Nguyên tắc 4).' },
      { id: 'VI.7', text: 'Thiết lập Hành động khắc phục (Corrective actions) bằng văn bản để xử lý khi có sự sai lệch tại CCP (Bước 10/Nguyên tắc 5).' },
      { id: 'VI.8', text: 'Thẩm định kế hoạch HACCP và quy trình Kiểm tra xác nhận (Verification procedures) (Bước 11/Nguyên tắc 6).' },
      { id: 'VI.9', text: 'Thiết lập hệ thống tài liệu và lưu trữ hồ sơ HACCP phù hợp (Bước 12/Nguyên tắc 7).' },
    ],
  },
];

enum HaccpOperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  GET = 'get',
  WRITE = 'write',
}

function logHaccpFirestoreError(
  error: unknown,
  operationType: HaccpOperationType,
  path: string | null
) {
  const errInfo = {
    error: error instanceof Error ? error.message : String(error),
    operationType,
    path,
    authInfo: {
      userId: auth.currentUser?.uid || null,
      email: auth.currentUser?.email || null,
      emailVerified: auth.currentUser?.emailVerified ?? null,
    },
  };
  console.warn('[FastHaccp:Firestore]', JSON.stringify(errInfo));
}

const LOCAL_CURRENT_KEY = 'fast_haccp_current';
const LOCAL_CURRENT_TS_KEY = 'fast_haccp_current_ts';
const LOCAL_CRM_KEY = 'fast_haccp_crm';
const LOCAL_CRM_TS_KEY = 'fast_haccp_crm_ts';

const AUDIT_TYPES = [
  'Thẩm tra HACCP định kỳ',
  'Đánh giá Khảo sát & Tiền thẩm định',
  'Thẩm tra xác nhận (Verification Audit)',
  'Thẩm tra hành động khắc phục (Follow-up CAPA)',
  'Đánh giá Chứng nhận HACCP Codex / TCVN 5603',
];

const VERIFICATION_METHODS = [
  'Kiểm tra hiện trường + Hồ sơ CCP/PRP',
  'Phỏng vấn đội HACCP + Xác nhận lưu đồ',
  'Thẩm tra kết quả kiểm nghiệm & Hiệu chuẩn',
  'Thẩm định lại giới hạn tới hạn (Validation)',
];

const ITEM_VERIFICATION_METHODS = [
  'Quan sát hiện trường',
  'Xem xét hồ sơ CCP/PRP',
  'Phỏng vấn nhân sự',
  'Kiểm tra số liệu hiệu chuẩn',
  'Thẩm định / Kiểm nghiệm mẫu',
];

type HaccpCompliance = 'Y' | 'N' | 'NI' | 'NA';

function isMeaningfulHaccpSession(data: Record<string, any> | null | undefined): boolean {
  if (!data || typeof data !== 'object') return false;
  if (data._isExplicitReset) return true;
  const textKeys = [
    'clientName',
    'contactName',
    'contactPhone',
    'leadAuditor',
    'auditType',
    'verificationMethod',
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
      (k.startsWith('comp_') ||
        k.startsWith('sev_') ||
        k.startsWith('cmt_') ||
        k.startsWith('verif_') ||
        k.startsWith('capa_')) &&
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

export const FastHaccpChecklist: React.FC = () => {
  const toast = useToast();

  // Client & Verification Metadata State
  const [clientName, setClientName] = useState<string>('');
  const [contactName, setContactName] = useState<string>('');
  const [contactPhone, setContactPhone] = useState<string>('');
  const [leadAuditor, setLeadAuditor] = useState<string>('');
  const [auditType, setAuditType] = useState<string>('');
  const [verificationMethod, setVerificationMethod] = useState<string>('');
  const [auditAddress, setAuditAddress] = useState<string>('');
  const [fsmsScope, setFsmsScope] = useState<string>('');
  const [auditDate, setAuditDate] = useState<string>(() => new Date().toISOString().split('T')[0]);
  const [reportNo, setReportNo] = useState<string>('');

  // Checklist Item States
  const [compliance, setCompliance] = useState<Record<string, string>>({});
  const [severities, setSeverities] = useState<Record<string, string>>({});
  const [comments, setComments] = useState<Record<string, string>>({});
  const [verifications, setVerifications] = useState<Record<string, string>>({});
  const [capa, setCapa] = useState<Record<string, string>>({});

  // Custom Items imported via Fast Dev
  const [customSections, setCustomSections] = useState<any[]>([]);

  // Filters & UI State
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'UNRATED' | HaccpCompliance>('ALL');
  const [openSections, setOpenSections] = useState<number[]>([0, 1, 2, 3, 4, 5, 6]);
  const [isCrmOpen, setIsCrmOpen] = useState<boolean>(false);
  const [crmRecords, setCrmRecords] = useState<Record<string, any>>({});
  const [isReportOpen, setIsReportOpen] = useState<boolean>(false);
  const [reportType, setReportType] = useState<'comprehensive' | 'non_conformity'>('comprehensive');

  // Sync Status UI
  const [syncStatus, setSyncStatus] = useState<'synced' | 'saving' | 'offline'>('synced');
  const [lastSyncedAt, setLastSyncedAt] = useState<string>('');
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
  } | null>(null);

  // Smooth scrolling hooks
  const { scrollTo: scrollToHaccpSection } = useSmoothScrollTo({
    offset: 16,
    detectDynamicReveal: true,
  });

  useSmoothScrollTo({
    targetId: 'haccp-crm-panel',
    triggerKey: isCrmOpen,
    enabled: isCrmOpen,
    offset: 16,
    detectDynamicReveal: true,
  });

  useSmoothScrollTo({
    targetId: 'haccp-report-panel',
    triggerKey: isReportOpen,
    enabled: isReportOpen,
    offset: 16,
    detectDynamicReveal: true,
  });

  // Sync Refs
  const tabWriterIdRef = useRef<string>(
    `haccp_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
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

  // Combine default checklist with any custom items from Fast Dev
  const allSections = useMemo(() => {
    if (customSections.length > 0) {
      return [
        ...CHECKLIST_DATA,
        {
          section: 'VII. TIÊU CHUẨN BỔ SUNG TỪ FAST DEV (CUSTOM REQUIREMENTS)',
          items: customSections.map((item, idx) => ({
            id: item.code || `DEV.${idx + 1}`,
            text: item.standard || item.text || '',
          })),
        },
      ];
    }
    return CHECKLIST_DATA;
  }, [customSections]);

  // Metrics & KPIs
  const metrics = useMemo(() => {
    let total = 0;
    let yCount = 0;
    let nCount = 0;
    let niCount = 0;
    let naCount = 0;
    let majorCount = 0;
    let minorCount = 0;
    let obsCount = 0;

    allSections.forEach((sec) => {
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

    let rank = 'Chưa đánh giá';
    if (applicable > 0) {
      if (compliancePct >= 90 && nCount === 0) rank = 'Đạt chuẩn HACCP (Tốt)';
      else if (compliancePct >= 75) rank = 'Cơ bản đạt (Cần khắc phục)';
      else rank = 'Không đạt (Cần hành động ngay)';
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
      rank,
    };
  }, [allSections, compliance, severities]);

  const applyStateData = (data: Record<string, any>) => {
    if (!data || typeof data !== 'object') return;
    isApplyingRemoteRef.current = true;
    hasUserEditedRef.current = false;
    activeCrmIdRef.current = data._loadedFromCrmId || null;

    setClientName(String(data.clientName || ''));
    setContactName(String(data.contactName || ''));
    setContactPhone(String(data.contactPhone || ''));
    setLeadAuditor(String(data.leadAuditor || ''));
    setAuditType(String(data.auditType || ''));
    setVerificationMethod(String(data.verificationMethod || ''));
    setAuditAddress(String(data.auditAddress || ''));
    setFsmsScope(String(data.fsmsScope || ''));
    setAuditDate(String(data.auditDate || ''));
    setReportNo(String(data.reportNo || ''));

    const newComp: Record<string, string> = {};
    const newSev: Record<string, string> = {};
    const newCmt: Record<string, string> = {};
    const newVerif: Record<string, string> = {};
    const newCapa: Record<string, string> = {};

    Object.keys(data).forEach((key) => {
      if (key.startsWith('comp_') && data[key]) {
        newComp[key.slice(5)] = String(data[key]);
      } else if (key.startsWith('sev_') && data[key]) {
        newSev[key.slice(4)] = String(data[key]);
      } else if (key.startsWith('cmt_') && data[key]) {
        newCmt[key.slice(4)] = String(data[key]);
      } else if (key.startsWith('verif_') && data[key]) {
        newVerif[key.slice(6)] = String(data[key]);
      } else if (key.startsWith('capa_') && data[key]) {
        newCapa[key.slice(5)] = String(data[key]);
      }
    });

    setCompliance(newComp);
    setSeverities(newSev);
    setComments(newCmt);
    setVerifications(newVerif);
    setCapa(newCapa);

    queueMicrotask(() => {
      isApplyingRemoteRef.current = false;
    });
  };

  const persistSessionToCloudAndServer = async (
    payload: Record<string, any>,
    keepalive = false
  ) => {
    const cleanPayload = { ...payload };
    let firestoreOk = false;
    let serverOk = false;

    try {
      await setDoc(doc(db, 'fast_haccp_crm', 'current_session'), cleanPayload);
      firestoreOk = true;
    } catch (err) {
      logHaccpFirestoreError(err, HaccpOperationType.WRITE, 'fast_haccp_crm/current_session');
    }

    try {
      const res = await fetch('/api/fast-haccp/session', {
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

  // Initial Load + Real-time Bidirectional Sync (Local + Server + Cloud Firestore + Fast Dev custom items)
  useEffect(() => {
    let active = true;

    try {
      const savedLocal = localStorage.getItem(LOCAL_CURRENT_KEY);
      if (savedLocal) {
        const parsed = JSON.parse(savedLocal);
        if (isMeaningfulHaccpSession(parsed)) {
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
      console.warn('[FastHaccp] Local load error:', e);
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

    try {
      const rawCustom = localStorage.getItem('FAST_HACCP_CUSTOM_ITEMS_V1');
      if (rawCustom) {
        const parsedCustom = JSON.parse(rawCustom);
        if (Array.isArray(parsedCustom) && parsedCustom.length > 0) {
          setCustomSections(parsedCustom);
        }
      }
    } catch {}

    hasHydratedRef.current = true;

    const handleFastDevUpdate = (e: any) => {
      const items = e?.detail?.items;
      if (Array.isArray(items)) {
        setCustomSections(items);
      }
    };
    window.addEventListener('haccp_items_updated', handleFastDevUpdate);

    const applyRemoteSessionIfNewer = (data: Record<string, any> | null | undefined) => {
      if (!active || !data || typeof data !== 'object') return;
      if (data._writerId && data._writerId === tabWriterIdRef.current) return;
      if (hasUserEditedRef.current) return;

      const remoteTs = Number(data._lastUpdated || 0);
      const meaningful = isMeaningfulHaccpSession(data);
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
    fetch('/api/fast-haccp/session', { cache: 'no-store' })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.session) {
          applyRemoteSessionIfNewer(data.session);
        }
      })
      .catch(() => {});

    fetch('/api/fast-haccp/crm', { cache: 'no-store' })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.records) {
          applyRemoteCrmIfNewer(data.records, data._lastUpdated);
        }
      })
      .catch(() => {});

    // Cloud Firestore Listeners
    const unsubSession = onSnapshot(
      doc(db, 'fast_haccp_crm', 'current_session'),
      (snap) => {
        if (!active || !snap.exists()) return;
        applyRemoteSessionIfNewer(snap.data());
      },
      (err) => logHaccpFirestoreError(err, HaccpOperationType.GET, 'fast_haccp_crm/current_session')
    );

    const unsubCrm = onSnapshot(
      doc(db, 'fast_haccp_crm', 'database'),
      (snap) => {
        if (!active || !snap.exists()) return;
        const data = snap.data();
        if (data?.records && typeof data.records === 'object') {
          applyRemoteCrmIfNewer(data.records, data._lastUpdated, data._writerId);
        }
      },
      (err) => logHaccpFirestoreError(err, HaccpOperationType.GET, 'fast_haccp_crm/database')
    );

    const unsubCustom = onSnapshot(
      doc(db, 'fast_haccp_crm', 'active_session'),
      (snap) => {
        if (!active || !snap.exists()) return;
        const data = snap.data();
        const remoteCustom = Array.isArray(data?.customItems)
          ? data.customItems
          : Array.isArray(data?.active?.customItems)
            ? data.active.customItems
            : null;
        if (remoteCustom) {
          setCustomSections(remoteCustom);
          try {
            localStorage.setItem('FAST_HACCP_CUSTOM_ITEMS_V1', JSON.stringify(remoteCustom));
          } catch {}
        }
      },
      () => {}
    );

    return () => {
      active = false;
      window.removeEventListener('haccp_items_updated', handleFastDevUpdate);
      unsubSession();
      unsubCrm();
      unsubCustom();
    };
  }, []);

  const buildStateDataObject = (timestamp = Date.now()) => {
    const data: Record<string, any> = {
      clientName,
      contactName,
      contactPhone,
      leadAuditor,
      auditType,
      verificationMethod,
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
    Object.keys(verifications).forEach((id) => {
      if (verifications[id]) data[`verif_${id}`] = verifications[id];
    });
    Object.keys(capa).forEach((id) => {
      if (capa[id]) data[`capa_${id}`] = capa[id];
    });

    return data;
  };

  // Debounced auto-save after real user interaction
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
    verificationMethod,
    auditAddress,
    fsmsScope,
    auditDate,
    reportNo,
    compliance,
    severities,
    comments,
    verifications,
    capa,
    metrics.progressPct,
    metrics.compliancePct,
    metrics.completed,
    metrics.total,
  ]);

  // Flush pending edits on unload / tab switch / unmount
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

  // New Session / Reset Form
  const newClient = () => {
    setConfirmDialog({
      isOpen: true,
      title: 'Tạo hồ sơ HACCP & Thẩm tra mới',
      message: "Tạo mới sẽ xóa trắng biểu mẫu hiện tại (hãy chắc chắn bạn đã 'Lưu CRM' nếu cần giữ dữ liệu). Tiếp tục?",
      onConfirm: () => {
        const resetTs = Date.now();
        lastLocalTsRef.current = resetTs;
        hasUserEditedRef.current = false;
        isApplyingRemoteRef.current = true;
        activeCrmIdRef.current = null;

        const today = new Date().toISOString().split('T')[0];
        const resetObj: Record<string, any> = {
          clientName: '',
          contactName: '',
          contactPhone: '',
          leadAuditor: '',
          auditType: '',
          verificationMethod: '',
          auditAddress: '',
          fsmsScope: '',
          auditDate: today,
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
        setVerificationMethod('');
        setAuditAddress('');
        setFsmsScope('');
        setAuditDate(today);
        setReportNo('');
        setCompliance({});
        setSeverities({});
        setComments({});
        setVerifications({});
        setCapa({});
        setIsReportOpen(false);
        latestPayloadRef.current = resetObj;

        queueMicrotask(() => {
          isApplyingRemoteRef.current = false;
        });

        void persistSessionToCloudAndServer(resetObj);
        toast.info('Đã tạo biểu mẫu HACCP & Thẩm tra mới.');
        scrollToHaccpSection('#haccp-client-form');
      },
    });
  };

  // Save to CRM
  const saveToCRM = async () => {
    if (!clientName || !clientName.trim()) {
      toast.warning("Vui lòng điền ít nhất 'Tên Khách Hàng / Cơ sở' trước khi lưu vào CRM!");
      scrollToHaccpSection('#haccp-client-form');
      return;
    }

    setSyncStatus('saving');
    const nowTs = Date.now();
    const recordId = activeCrmIdRef.current || `${clientName.trim()}_${auditDate || nowTs}`;
    activeCrmIdRef.current = recordId;

    const currentData = buildStateDataObject(nowTs);
    currentData._progress = `${metrics.progressPct}%`;
    currentData._compliancePct = `${metrics.compliancePct}%`;
    currentData._savedAt = new Date().toLocaleString('vi-VN');
    currentData._loadedFromCrmId = recordId;

    let latestRemoteRecords: Record<string, any> = {};
    let latestRemoteTs = 0;
    try {
      const remoteSnap = await getDoc(doc(db, 'fast_haccp_crm', 'database'));
      if (remoteSnap.exists() && remoteSnap.data()?.records && typeof remoteSnap.data()?.records === 'object') {
        latestRemoteRecords = remoteSnap.data()!.records;
        latestRemoteTs = Number(remoteSnap.data()?._lastUpdated || 0);
      }
    } catch {}

    if (Object.keys(latestRemoteRecords).length === 0) {
      try {
        const res = await fetch('/api/fast-haccp/crm', { cache: 'no-store' });
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
      await setDoc(doc(db, 'fast_haccp_crm', 'database'), {
        records: updatedCrm,
        _lastUpdated: nowTs,
        _writerId: tabWriterIdRef.current,
      });
      cloudSaved = true;
    } catch (e) {
      logHaccpFirestoreError(e, HaccpOperationType.WRITE, 'fast_haccp_crm/database');
    }

    try {
      const res = await fetch('/api/fast-haccp/crm', {
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
      toast.warning('Đã lưu cục bộ, nhưng chưa thể đồng bộ lên Cloud lúc này.');
    }
  };

  // Load Record from CRM
  const loadRecord = (id: string) => {
    const rec = crmRecordsRef.current[id];
    if (!rec) return;
    setConfirmDialog({
      isOpen: true,
      title: 'Tải hồ sơ HACCP từ CRM',
      message: `Tải dữ liệu của "${rec.clientName || 'khách hàng'}" sẽ thay thế dữ liệu trên biểu mẫu hiện tại. Tiếp tục?`,
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
        scrollToHaccpSection('#haccp-client-form');
      },
    });
  };

  // Delete Record from CRM
  const deleteRecord = (id: string) => {
    const targetName = crmRecordsRef.current[id]?.clientName || 'hồ sơ này';
    setConfirmDialog({
      isOpen: true,
      title: 'Xóa hồ sơ CRM',
      message: `Bạn có chắc chắn muốn xóa hồ sơ "${targetName}" khỏi hệ thống CRM?`,
      onConfirm: async () => {
        setSyncStatus('saving');
        const nowTs = Date.now();
        let baseRecords: Record<string, any> = { ...crmRecordsRef.current };
        try {
          const remoteSnap = await getDoc(doc(db, 'fast_haccp_crm', 'database'));
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
          await setDoc(doc(db, 'fast_haccp_crm', 'database'), {
            records: updated,
            _lastUpdated: nowTs,
            _writerId: tabWriterIdRef.current,
          });
          cloudOk = true;
        } catch (e) {
          logHaccpFirestoreError(e, HaccpOperationType.DELETE, 'fast_haccp_crm/database');
        }

        try {
          const res = await fetch('/api/fast-haccp/crm', {
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
    return allSections.map((sec, sIdx) => {
      const matchedItems = sec.items.filter((it) => {
        const compVal = compliance[it.id] || '';
        if (statusFilter === 'UNRATED' && compVal) return false;
        if (statusFilter !== 'ALL' && statusFilter !== 'UNRATED' && compVal !== statusFilter) {
          return false;
        }
        if (q) {
          return (
            it.id.toLowerCase().includes(q) ||
            it.text.toLowerCase().includes(q) ||
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
  }, [allSections, searchQuery, statusFilter, compliance]);

  // Batch mark all remaining visible unrated items as Y
  const handleMarkRemainingPass = () => {
    const toMark: string[] = [];
    filteredSections.forEach((sec) => {
      sec.matchedItems.forEach((it) => {
        if (!compliance[it.id]) toMark.push(it.id);
      });
    });
    if (toMark.length === 0) {
      toast.info('Tất cả mục đang hiển thị đều đã được đánh giá.');
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
    toast.success(`Đã đánh dấu Đạt (Y) cho ${toMark.length} mục còn lại.`);
  };

  const toggleAllSections = (open: boolean) => {
    if (open) {
      setOpenSections(allSections.map((_, i) => i));
    } else {
      setOpenSections([]);
    }
  };

  const toggleSection = (idx: number) => {
    setOpenSections((prev) =>
      prev.includes(idx) ? prev.filter((i) => i !== idx) : [...prev, idx]
    );
  };

  // Report Rows Computed
  const reportRows = useMemo(() => {
    const rows: Array<{
      section: string;
      id: string;
      text: string;
      status: string;
      statusLabel: string;
      severity: string;
      verifMethod: string;
      notes: string;
      capaText: string;
      isIssue: boolean;
    }> = [];

    allSections.forEach((sec) => {
      sec.items.forEach((it) => {
        const comp = compliance[it.id] || '';
        const sev = severities[it.id] || '';
        const notes = comments[it.id] || '';
        const verifMethod = verifications[it.id] || verificationMethod || 'Kiểm tra hiện trường';
        const capaText = capa[it.id] || '';

        const isIssue =
          comp === 'N' ||
          comp === 'NI' ||
          sev === 'Major' ||
          sev === 'Minor' ||
          sev === 'Observation';

        if (reportType === 'non_conformity' && !isIssue) return;

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
          section: sec.section,
          id: it.id,
          text: it.text,
          status: comp || '—',
          statusLabel,
          severity: effectiveSev,
          verifMethod,
          notes,
          capaText,
          isIssue,
        });
      });
    });

    return rows;
  }, [allSections, compliance, severities, comments, verifications, verificationMethod, capa, reportType]);

  const openReport = (type: 'comprehensive' | 'non_conformity') => {
    setReportType(type);
    if (type === 'non_conformity') {
      const hasIssues = Object.keys(compliance).some(
        (k) => compliance[k] === 'N' || compliance[k] === 'NI'
      ) || Object.keys(severities).some((k) => Boolean(severities[k]));
      if (!hasIssues) {
        toast.info('Tuyệt vời! Chưa ghi nhận điểm Không phù hợp (N / NI) hoặc lỗi phân loại nào.');
        return;
      }
    }
    setIsReportOpen(true);
    scrollToHaccpSection('#haccp-report-panel');
  };

  const handlePrintReport = () => {
    document.body.classList.add('printing-haccp-report');
    const cleanup = () => {
      document.body.classList.remove('printing-haccp-report');
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
      'Hang muc',
      'Ma muc',
      'Yeu cau / Tieu chuan HACCP',
      'Ket qua',
      'Muc do loi',
      'Phuong phap tham tra',
      'Bang chung / Ghi chu',
      'Hanh dong khac phuc (CAPA)',
    ];
    const csvCell = (val: string) => `"${String(val || '').replace(/"/g, '""')}"`;
    const lines = [
      headers.map(csvCell).join(','),
      ...reportRows.map((r) =>
        [
          r.section,
          r.id,
          r.text,
          r.statusLabel,
          r.severity,
          r.verifMethod,
          r.notes,
          r.capaText,
        ]
          .map(csvCell)
          .join(',')
      ),
    ];
    const blob = new Blob([bom + lines.join('\r\n')], {
      type: 'text/csv;charset=utf-8;',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `HACCP_Verification_${(clientName || 'FastConsulting').replace(/\s+/g, '_')}_${auditDate || 'report'}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Đã xuất file Excel (.csv) báo cáo HACCP & Thẩm tra.');
  };

  const handleDownloadHtml = () => {
    const title =
      reportType === 'comprehensive'
        ? 'BÁO CÁO THẨM TRA & ĐÁNH GIÁ HACCP TOÀN DIỆN'
        : 'BÁO CÁO ĐIỂM KHÔNG PHÙ HỢP & HÀNH ĐỘNG KHẮC PHỤC (NC & CAPA)';

    const rowsHtml = reportRows
      .map(
        (r) => `
      <tr>
        <td style="text-align:center;font-weight:700;">${escapeHtml(r.id)}</td>
        <td><strong>${escapeHtml(r.section)}</strong><br/>${escapeHtml(r.text)}</td>
        <td style="text-align:center;font-weight:700;">${escapeHtml(r.statusLabel)}</td>
        <td style="text-align:center;">${escapeHtml(r.severity)}</td>
        <td><em>${escapeHtml(r.verifMethod)}</em><br/>${escapeHtml(r.notes || '—')}</td>
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
        <div><strong>Đại diện cơ sở:</strong> ${escapeHtml(contactName || '—')}</div>
        <div><strong>Điện thoại:</strong> ${escapeHtml(contactPhone || '—')}</div>
        <div><strong>Chuyên gia thẩm tra:</strong> ${escapeHtml(leadAuditor || '—')}</div>
        <div><strong>Loại thẩm tra:</strong> ${escapeHtml(auditType || '—')}</div>
        <div><strong>Ngày thẩm tra:</strong> ${escapeHtml(formatDateVN(auditDate))}</div>
        <div><strong>Phương pháp thẩm tra:</strong> ${escapeHtml(verificationMethod || '—')}</div>
        <div><strong>Phạm vi:</strong> ${escapeHtml(fsmsScope || '—')}</div>
        <div><strong>Số hồ sơ:</strong> ${escapeHtml(reportNo || '—')}</div>
      </div>
      <table>
        <thead>
          <tr>
            <th style="width:7%;">Mã</th>
            <th style="width:30%;">Hạng mục &amp; Yêu cầu HACCP</th>
            <th style="width:11%;">Kết quả</th>
            <th style="width:10%;">Mức độ</th>
            <th style="width:21%;">Thẩm tra &amp; Bằng chứng</th>
            <th style="width:21%;">Khắc phục (CAPA)</th>
          </tr>
        </thead>
        <tbody>${rowsHtml}</tbody>
      </table>
    </body></html>`;

    const blob = new Blob([htmlDoc], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `HACCP_Report_${(clientName || 'FastConsulting').replace(/\s+/g, '_')}_${auditDate || 'report'}.html`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Đã tải xuống báo cáo HTML.');
  };

  return (
    <div className="fast-haccp-root space-y-6 text-slate-800">
      {/* Top Action & Sync Status Bar */}
      <div className="haccp-main-checklist bg-white rounded-2xl border border-slate-200 p-4 md:p-5 shadow-xs flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2.5">
            <span className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-[#005c56]">
              <ShieldCheck className="w-4 h-4 text-[#007c76]" />
              Codex HACCP 2022 &amp; TCVN 5603
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
            HACCP Checklist &amp; Thẩm Tra Hệ Thống An Toàn Thực Phẩm
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

      {/* KPI Metrics Strip */}
      <div className="haccp-main-checklist grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
        <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs">
          <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
            Tiến độ thẩm tra
          </div>
          <div className="mt-1 flex items-baseline justify-between">
            <span className="text-2xl font-black text-slate-900 tabular-nums">
              {metrics.progressPct}%
            </span>
            <span className="text-xs font-semibold text-slate-500 tabular-nums">
              {metrics.completed} / {metrics.total} mục
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
            Đạt yêu cầu (Y)
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
            Chưa chấm: <strong className="tabular-nums text-slate-700">{metrics.unrated}</strong> mục
          </p>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs">
          <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
            Không phù hợp (N / NI)
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
            Major: {metrics.majorCount} · Minor: {metrics.minorCount}
          </p>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs">
          <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
            Tỷ lệ tuân thủ
          </div>
          <div className="mt-1 flex items-baseline justify-between">
            <span className="text-2xl font-black text-[#005c56] tabular-nums">
              {metrics.compliancePct}%
            </span>
          </div>
          <p className="mt-1.5 text-[11px] font-bold text-slate-700 truncate" title={metrics.rank}>
            {metrics.rank}
          </p>
        </div>
      </div>

      {/* Metadata Form: Khách hàng, Chuyên gia & Kế hoạch Thẩm tra */}
      <div
        id="haccp-client-form"
        className="haccp-main-checklist bg-white rounded-2xl border border-slate-200 p-5 md:p-6 shadow-xs space-y-4"
      >
        <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <ClipboardCheck className="w-4 h-4 text-[#007c76]" />
            <h4 className="text-sm font-black uppercase tracking-wider text-slate-900">
              Thông Tin Cơ Sở &amp; Hồ Sơ Thẩm Tra HACCP
            </h4>
          </div>
          {activeCrmIdRef.current && (
            <span className="text-[11px] font-semibold text-[#005c56] bg-teal-50 px-2.5 py-1 rounded-lg border border-teal-200">
              Đang chỉnh sửa hồ sơ CRM: {activeCrmIdRef.current}
            </span>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              Tên Khách Hàng / Nhà máy <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              placeholder="VD: Công ty TNHH Thực phẩm ABC..."
              value={clientName}
              onChange={(e) => {
                markDirty();
                setClientName(e.target.value);
              }}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 bg-white text-sm text-slate-900 focus:border-[#007c76] focus:ring-2 focus:ring-[#007c76]/15 outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              Đại diện cơ sở / QA Phụ trách
            </label>
            <input
              type="text"
              placeholder="Họ tên đại diện cơ sở..."
              value={contactName}
              onChange={(e) => {
                markDirty();
                setContactName(e.target.value);
              }}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 bg-white text-sm text-slate-900 focus:border-[#007c76] focus:ring-2 focus:ring-[#007c76]/15 outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              Số điện thoại liên hệ
            </label>
            <input
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
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              Chuyên gia Thẩm tra (Lead Auditor)
            </label>
            <input
              type="text"
              placeholder="Tên chuyên gia thẩm tra..."
              value={leadAuditor}
              onChange={(e) => {
                markDirty();
                setLeadAuditor(e.target.value);
              }}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 bg-white text-sm text-slate-900 focus:border-[#007c76] focus:ring-2 focus:ring-[#007c76]/15 outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              Hình thức Đánh giá / Thẩm tra
            </label>
            <select
              value={auditType}
              onChange={(e) => {
                markDirty();
                setAuditType(e.target.value);
              }}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 bg-white text-sm text-slate-900 focus:border-[#007c76] focus:ring-2 focus:ring-[#007c76]/15 outline-none"
            >
              <option value="">-- Chọn Hình Thức Thẩm Tra --</option>
              {AUDIT_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              Phương pháp Thẩm tra chính
            </label>
            <select
              value={verificationMethod}
              onChange={(e) => {
                markDirty();
                setVerificationMethod(e.target.value);
              }}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 bg-white text-sm text-slate-900 focus:border-[#007c76] focus:ring-2 focus:ring-[#007c76]/15 outline-none"
            >
              <option value="">-- Chọn Phương Pháp Thẩm Tra --</option>
              {VERIFICATION_METHODS.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              Ngày Thẩm tra
            </label>
            <input
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
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              Số Hồ sơ / Report No.
            </label>
            <input
              type="text"
              placeholder="VD: HACCP-VER-2026-01"
              value={reportNo}
              onChange={(e) => {
                markDirty();
                setReportNo(e.target.value);
              }}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 bg-white text-sm text-slate-900 focus:border-[#007c76] focus:ring-2 focus:ring-[#007c76]/15 outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              Phạm vi áp dụng (Scope / Dòng sản phẩm)
            </label>
            <input
              type="text"
              placeholder="VD: Dây chuyền chế biến thủy sản đông lạnh..."
              value={fsmsScope}
              onChange={(e) => {
                markDirty();
                setFsmsScope(e.target.value);
              }}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 bg-white text-sm text-slate-900 focus:border-[#007c76] focus:ring-2 focus:ring-[#007c76]/15 outline-none"
            />
          </div>

          <div className="md:col-span-2 lg:col-span-3">
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              Địa chỉ cơ sở / Nhà xưởng
            </label>
            <input
              type="text"
              placeholder="Số nhà, Khu công nghiệp, Tỉnh/Thành phố..."
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
          id="haccp-crm-panel"
          className="haccp-main-checklist bg-white rounded-2xl border-2 border-[#007c76] p-5 md:p-6 shadow-md space-y-4"
        >
          <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-200">
            <div className="flex items-center gap-2">
              <History className="w-4 h-4 text-[#007c76]" />
              <h4 className="text-sm font-black uppercase tracking-wider text-slate-900">
                Lịch Sử Hồ Sơ CRM — HACCP &amp; Thẩm Tra ({Object.keys(crmRecords).length})
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
            <table className="w-full text-left border-collapse min-w-[720px] text-xs">
              <thead>
                <tr className="bg-slate-50 border-y border-slate-200 text-slate-600 uppercase font-bold">
                  <th className="py-2.5 px-3">Ngày thẩm tra</th>
                  <th className="py-2.5 px-3">Tên Khách Hàng</th>
                  <th className="py-2.5 px-3">Chuyên gia</th>
                  <th className="py-2.5 px-3">Hình thức</th>
                  <th className="py-2.5 px-3 text-center">Tiến độ</th>
                  <th className="py-2.5 px-3 text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {Object.keys(crmRecords).length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-slate-500">
                      Chưa có hồ sơ HACCP nào được lưu trong CRM.
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
                            {formatDateVN(rec.auditDate)}
                          </td>
                          <td className="py-2.5 px-3 font-bold text-slate-900">
                            {rec.clientName || recId}
                          </td>
                          <td className="py-2.5 px-3 text-slate-700">{rec.leadAuditor || '—'}</td>
                          <td className="py-2.5 px-3 text-slate-700">{rec.auditType || '—'}</td>
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

      {/* Search, Filter & Report Toolbar */}
      <div className="haccp-main-checklist bg-white rounded-2xl border border-slate-200 p-4 shadow-xs space-y-3">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div className="relative flex-1 min-w-[240px]">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Tìm kiếm mã mục (VI.4), từ khóa CCP, dị ứng, vệ sinh..."
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
              Mở tất cả
            </button>
            <button
              type="button"
              onClick={() => toggleAllSections(false)}
              className="px-3 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-xs font-bold text-slate-700 cursor-pointer"
            >
              Thu gọn
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
              onClick={() => openReport('comprehensive')}
              className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              Báo cáo Toàn diện
            </button>
            <button
              type="button"
              onClick={() => openReport('non_conformity')}
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

      {/* Inline Report Panel (White, Print-Ready) */}
      {isReportOpen && (
        <div
          id="haccp-report-panel"
          className="bg-white text-slate-900 rounded-2xl border-2 border-[#007c76] p-5 md:p-7 shadow-lg space-y-5"
        >
          <div className="print:hidden flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-slate-200">
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => setReportType('comprehensive')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold cursor-pointer ${
                  reportType === 'comprehensive'
                    ? 'bg-[#007c76] text-white'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                Báo cáo Toàn diện
              </button>
              <button
                type="button"
                onClick={() => setReportType('non_conformity')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold cursor-pointer ${
                  reportType === 'non_conformity'
                    ? 'bg-amber-600 text-white'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                Chỉ điểm Lỗi &amp; CAPA
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

          <div id="haccpReportPrintArea" className="space-y-4">
            <div className="text-center border-b-2 border-[#007c76] pb-3">
              <div className="text-[11px] font-bold uppercase tracking-widest text-[#007c76]">
                FAST CONSULTING · FOOD ALL STANDARD &amp; TRAINING
              </div>
              <h2 className="text-lg md:text-xl font-black text-slate-900 mt-1">
                {reportType === 'comprehensive'
                  ? 'BÁO CÁO KẾT QUẢ THẨM TRA & ĐÁNH GIÁ HACCP TOÀN DIỆN'
                  : 'BÁO CÁO ĐIỂM KHÔNG PHÙ HỢP & HÀNH ĐỘNG KHẮC PHỤC (NC & CAPA)'}
              </h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 p-3.5 rounded-xl border border-slate-200 text-xs bg-white">
              <div><strong>Khách hàng:</strong> {clientName || '—'}</div>
              <div><strong>Đại diện cơ sở:</strong> {contactName || '—'}</div>
              <div><strong>Điện thoại:</strong> {contactPhone || '—'}</div>
              <div><strong>Chuyên gia thẩm tra:</strong> {leadAuditor || '—'}</div>
              <div><strong>Hình thức thẩm tra:</strong> {auditType || '—'}</div>
              <div><strong>Ngày thẩm tra:</strong> {formatDateVN(auditDate)}</div>
              <div><strong>Phương pháp thẩm tra:</strong> {verificationMethod || '—'}</div>
              <div><strong>Phạm vi:</strong> {fsmsScope || '—'}</div>
              <div><strong>Số hồ sơ:</strong> {reportNo || '—'}</div>
              <div className="sm:col-span-2 lg:col-span-3"><strong>Địa chỉ:</strong> {auditAddress || '—'}</div>
            </div>

            <div className="flex flex-wrap items-center justify-around gap-3 p-3 rounded-xl border border-slate-200 text-xs font-bold bg-slate-50/70 tabular-nums">
              <span className="text-emerald-700">Đạt (Y): {metrics.yCount}</span>
              <span className="text-rose-600">Không đạt (N): {metrics.nCount}</span>
              <span className="text-amber-600">Cần cải thiện (NI): {metrics.niCount}</span>
              <span className="text-slate-600">N/A: {metrics.naCount}</span>
              <span className="text-[#005c56]">Tỷ lệ tuân thủ: {metrics.compliancePct}%</span>
              <span className="text-rose-700">Major: {metrics.majorCount}</span>
              <span className="text-amber-700">Minor: {metrics.minorCount}</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-xs">
                <thead>
                  <tr className="bg-[#005c56] text-white">
                    <th className="p-2.5 border border-[#005c56] w-[8%] text-center">Mã</th>
                    <th className="p-2.5 border border-[#005c56] w-[28%] text-left">Hạng mục &amp; Yêu cầu HACCP</th>
                    <th className="p-2.5 border border-[#005c56] w-[11%] text-center">Kết quả</th>
                    <th className="p-2.5 border border-[#005c56] w-[10%] text-center">Mức độ</th>
                    <th className="p-2.5 border border-[#005c56] w-[22%] text-left">Thẩm tra &amp; Bằng chứng</th>
                    <th className="p-2.5 border border-[#005c56] w-[21%] text-left">Khắc phục (CAPA)</th>
                  </tr>
                </thead>
                <tbody>
                  {reportRows.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="p-6 text-center border border-slate-200 text-slate-500">
                        Không có mục nào khớp điều kiện báo cáo hiện tại.
                      </td>
                    </tr>
                  ) : (
                    reportRows.map((r) => (
                      <tr key={r.id} className={r.isIssue ? 'bg-rose-50/30' : 'bg-white'}>
                        <td className="p-2.5 border border-slate-200 text-center font-bold text-[#005c56]">
                          {r.id}
                        </td>
                        <td className="p-2.5 border border-slate-200">
                          <div className="text-[10px] font-bold uppercase text-slate-400 mb-0.5">
                            {r.section}
                          </div>
                          <div className="text-slate-800">{r.text}</div>
                        </td>
                        <td className="p-2.5 border border-slate-200 text-center font-bold">
                          {r.statusLabel}
                        </td>
                        <td className="p-2.5 border border-slate-200 text-center font-semibold">
                          {r.severity}
                        </td>
                        <td className="p-2.5 border border-slate-200">
                          <div className="text-[11px] font-semibold text-[#005c56] mb-0.5">
                            {r.verifMethod}
                          </div>
                          <div className="text-slate-700">{r.notes || '—'}</div>
                        </td>
                        <td className="p-2.5 border border-slate-200 text-slate-700">
                          {r.capaText || '—'}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            <div className="grid grid-cols-2 gap-8 pt-8 text-center text-xs">
              <div>
                <div className="font-bold text-slate-900">ĐẠI DIỆN CƠ SỞ / NHÀ MÁY</div>
                <div className="italic text-slate-500 mt-0.5 mb-12">(Ký và ghi rõ họ tên)</div>
                <div className="font-bold text-slate-800">{contactName || '........................................'}</div>
              </div>
              <div>
                <div className="font-bold text-slate-900">CHUYÊN GIA THẨM TRA (LEAD AUDITOR)</div>
                <div className="italic text-slate-500 mt-0.5 mb-12">(Ký và ghi rõ họ tên)</div>
                <div className="font-bold text-slate-800">{leadAuditor || '........................................'}</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Checklist Accordion Sections */}
      <div className="haccp-main-checklist space-y-4">
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
                    const currentVerif = verifications[item.id] || '';
                    const currentCapa = capa[item.id] || '';
                    const isIssue = currentComp === 'N' || currentComp === 'NI';

                    return (
                      <div
                        key={item.id}
                        className={`p-4 md:p-5 grid grid-cols-1 lg:grid-cols-12 gap-4 transition-colors ${
                          isIssue ? 'bg-rose-50/25' : 'bg-white'
                        }`}
                      >
                        {/* Left: Code & Requirement */}
                        <div className="lg:col-span-5 space-y-2">
                          <div className="flex items-center gap-2">
                            <span className="px-2 py-0.5 rounded-md bg-teal-50 border border-teal-200 text-[#005c56] text-xs font-black tabular-nums">
                              {item.id}
                            </span>
                            {isIssue && (
                              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-rose-600">
                                <AlertTriangle className="w-3.5 h-3.5" />
                                Cần thẩm tra khắc phục
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

                        {/* Right: Verification Method, Severity, Evidence & CAPA */}
                        <div className="lg:col-span-4 space-y-2">
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            <select
                              value={currentVerif}
                              onChange={(e) => {
                                markDirty();
                                setVerifications((prev) => ({ ...prev, [item.id]: e.target.value }));
                              }}
                              className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white text-xs text-slate-800 focus:border-[#007c76] outline-none"
                            >
                              <option value="">-- Phương pháp thẩm tra --</option>
                              {ITEM_VERIFICATION_METHODS.map((m) => (
                                <option key={m} value={m}>
                                  {m}
                                </option>
                              ))}
                            </select>

                            <select
                              value={currentSev}
                              onChange={(e) => {
                                markDirty();
                                setSeverities((prev) => ({ ...prev, [item.id]: e.target.value }));
                              }}
                              className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white text-xs text-slate-800 focus:border-[#007c76] outline-none"
                            >
                              <option value="">-- Phân loại lỗi --</option>
                              <option value="Major">Major (Lỗi nặng)</option>
                              <option value="Minor">Minor (Lỗi nhẹ)</option>
                              <option value="Observation">Observation (Quan sát)</option>
                            </select>
                          </div>

                          <textarea
                            rows={2}
                            placeholder="Kết quả thẩm tra / Bằng chứng ghi nhận thực tế..."
                            value={currentCmt}
                            onChange={(e) => {
                              markDirty();
                              setComments((prev) => ({ ...prev, [item.id]: e.target.value }));
                            }}
                            className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-white text-xs text-slate-800 focus:border-[#007c76] outline-none resize-y"
                          />

                          <textarea
                            rows={2}
                            placeholder="Hành động khắc phục & phòng ngừa (CAPA)..."
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

      {/* Inline Confirmation Dialog */}
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

export default FastHaccpChecklist;
