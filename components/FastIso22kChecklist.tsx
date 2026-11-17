import React, { useState, useEffect, useRef, useMemo } from 'react';
import { auth, db } from '../firebase';
import { doc, getDoc, setDoc, onSnapshot } from 'firebase/firestore';
import { useToast } from '../contexts/ToastContext';
import { useSmoothScrollTo } from '../hooks/useSmoothScrollTo';

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

export interface ChecklistItem {
  id: string;
  clause: string;
  text: string;
}

export interface ChecklistSection {
  section: string;
  items: ChecklistItem[];
}

// Complete 43 standard clauses from the user's attached ISO 22000:2018 checklist
export const ISO22K_CHECKLIST_DATA: ChecklistSection[] = [
  {
    section: "ĐIỀU KHOẢN 4: BỐI CẢNH CỦA TỔ CHỨC",
    items: [
      { id: "4.1", clause: "Điều khoản 4.1", text: "Hiểu tổ chức và bối cảnh của tổ chức. Tổ chức đã xác định các vấn đề nội bộ và bên ngoài liên quan đến mục đích của mình và ảnh hưởng đến khả năng đạt được kết quả dự kiến của FSMS chưa?" },
      { id: "4.2.a", clause: "Điều khoản 4.2", text: "Hiểu nhu cầu và mong đợi của các bên quan tâm. Tổ chức đã xác định các bên quan tâm có liên quan đến FSMS chưa?" },
      { id: "4.2.b", clause: "Điều khoản 4.2", text: "Tổ chức đã xác định các yêu cầu có liên quan của các bên quan tâm đối với FSMS chưa?" },
      { id: "4.3", clause: "Điều khoản 4.3", text: "Xác định phạm vi của FSMS. Phạm vi có xác định rõ các sản phẩm, dịch vụ, quá trình và địa điểm sản xuất được bao gồm trong FSMS không?" },
      { id: "4.4", clause: "Điều khoản 4.4", text: "Hệ thống quản lý an toàn thực phẩm. Tổ chức đã thiết lập, thực hiện, duy trì, cập nhật và cải tiến liên tục FSMS, bao gồm các quá trình cần thiết và sự tương tác của chúng chưa?" }
    ]
  },
  {
    section: "ĐIỀU KHOẢN 5: SỰ LÃNH ĐẠO",
    items: [
      { id: "5.1.a", clause: "Điều khoản 5.1", text: "Sự lãnh đạo và cam kết. Lãnh đạo cao nhất có thể hiện sự cam kết đối với FSMS bằng cách đảm bảo chính sách an toàn thực phẩm và các mục tiêu được thiết lập không?" },
      { id: "5.1.b", clause: "Điều khoản 5.1", text: "Lãnh đạo cao nhất có đảm bảo sự tích hợp các yêu cầu của FSMS vào các quá trình kinh doanh của tổ chức không?" },
      { id: "5.2.1", clause: "Điều khoản 5.2.1", text: "Chính sách an toàn thực phẩm. Chính sách có phù hợp với mục đích và bối cảnh của tổ chức, cung cấp khuôn khổ để thiết lập và xem xét các mục tiêu FSMS không?" },
      { id: "5.2.2", clause: "Điều khoản 5.2.2", text: "Truyền đạt chính sách an toàn thực phẩm. Chính sách có được truyền đạt, thấu hiểu và áp dụng ở mọi cấp trong tổ chức cũng như có sẵn cho các bên quan tâm liên quan không?" },
      { id: "5.3", clause: "Điều khoản 5.3", text: "Vai trò, trách nhiệm và quyền hạn. Lãnh đạo cao nhất đã phân công, truyền đạt trách nhiệm và quyền hạn chưa? Có bổ nhiệm Trưởng nhóm an toàn thực phẩm không?" }
    ]
  },
  {
    section: "ĐIỀU KHOẢN 6: HOẠCH ĐỊNH",
    items: [
      { id: "6.1.1", clause: "Điều khoản 6.1.1", text: "Hành động giải quyết rủi ro và cơ hội. Khi hoạch định FSMS, tổ chức đã xem xét các vấn đề nội bộ/bên ngoài và các bên quan tâm để xác định rủi ro và cơ hội cần giải quyết chưa?" },
      { id: "6.1.2", clause: "Điều khoản 6.1.2", text: "Tổ chức đã lên kế hoạch hành động để giải quyết các rủi ro và cơ hội này, cũng như cách thức tích hợp, thực hiện và đánh giá tính hiệu lực của chúng chưa?" },
      { id: "6.2.1", clause: "Điều khoản 6.2.1", text: "Mục tiêu FSMS. Tổ chức đã thiết lập các mục tiêu an toàn thực phẩm nhất quán với chính sách, có thể đo lường, được theo dõi và cập nhật không?" },
      { id: "6.2.2", clause: "Điều khoản 6.2.2", text: "Khi hoạch định cách thức đạt được mục tiêu, tổ chức đã xác định: cần làm gì, nguồn lực nào, ai chịu trách nhiệm, thời hạn và cách thức đánh giá kết quả chưa?" },
      { id: "6.3", clause: "Điều khoản 6.3", text: "Hoạch định sự thay đổi. Khi có sự thay đổi đối với FSMS, tổ chức có thực hiện thay đổi một cách có kế hoạch không?" }
    ]
  },
  {
    section: "ĐIỀU KHOẢN 7: HỖ TRỢ",
    items: [
      { id: "7.1.1", clause: "Điều khoản 7.1.1", text: "Nguồn lực chung. Tổ chức đã xác định và cung cấp nguồn lực cần thiết cho việc thiết lập, duy trì và cải tiến liên tục FSMS chưa?" },
      { id: "7.1.2", clause: "Điều khoản 7.1.2", text: "Con người. Tổ chức đã cung cấp đủ nhân sự có năng lực để vận hành FSMS một cách có hiệu lực chưa?" },
      { id: "7.1.3", clause: "Điều khoản 7.1.3", text: "Cơ sở hạ tầng. Tổ chức có cung cấp và duy trì cơ sở hạ tầng cần thiết (nhà xưởng, thiết bị, vận tải, CNTT) không?" },
      { id: "7.1.4", clause: "Điều khoản 7.1.4", text: "Môi trường làm việc. Tổ chức đã xác định, cung cấp và duy trì môi trường làm việc phù hợp để đảm bảo an toàn thực phẩm chưa?" },
      { id: "7.1.6", clause: "Điều khoản 7.1.6", text: "Tổ chức có đánh giá, lựa chọn và giám sát các nhà cung cấp bên ngoài (nguyên liệu, dịch vụ) để đảm bảo không ảnh hưởng đến an toàn thực phẩm không?" },
      { id: "7.2", clause: "Điều khoản 7.2", text: "Năng lực. Đảm bảo nhân sự có năng lực (dựa trên giáo dục, đào tạo hoặc kinh nghiệm), và lưu giữ thông tin văn bản làm bằng chứng chưa?" },
      { id: "7.3", clause: "Điều khoản 7.3", text: "Nhận thức. Các cá nhân làm việc có nhận thức được chính sách ATTP, mục tiêu FSMS liên quan đến công việc của họ không?" },
      { id: "7.4", clause: "Điều khoản 7.4", text: "Trao đổi thông tin. Tổ chức đã xác định các hoạt động trao đổi thông tin nội bộ và bên ngoài (trao đổi cái gì, khi nào, với ai, như thế nào) chưa?" },
      { id: "7.5", clause: "Điều khoản 7.5", text: "Thông tin được văn bản hóa. FSMS có bao gồm hệ thống tạo lập, cập nhật và kiểm soát tài liệu rõ ràng không?" }
    ]
  },
  {
    section: "ĐIỀU KHOẢN 8: THỰC HIỆN",
    items: [
      { id: "8.1.1", clause: "Điều khoản 8.1", text: "Hoạch định và kiểm soát thực hiện. Tổ chức có hoạch định, thực hiện, kiểm soát các quá trình cần thiết để đáp ứng các yêu cầu về việc tạo ra sản phẩm an toàn không?" },
      { id: "8.2.1", clause: "Điều khoản 8.2.1", text: "Chương trình tiên quyết (PRP). Tổ chức có thiết lập, áp dụng và cập nhật các PRP để ngăn ngừa/giảm bớt ô nhiễm vào sản phẩm không?" },
      { id: "8.3.1", clause: "Điều khoản 8.3", text: "Hệ thống truy xuất nguồn gốc. Hệ thống có khả năng nhận diện nguyên vật liệu đầu vào và tuyến phân phối sản phẩm đầu ra không?" },
      { id: "8.4.1", clause: "Điều khoản 8.4", text: "Ứng phó khẩn cấp. Tổ chức có đảm bảo sẵn sàng ứng phó với các tình huống khẩn cấp (cháy, ngập lụt, cúp điện...) ảnh hưởng đến ATTP không?" },
      { id: "8.5.1", clause: "Điều khoản 8.5.1", text: "Phân tích mối nguy. Đội ATTP có tiến hành phân tích mối nguy để xác định các mối nguy cần kiểm soát không?" },
      { id: "8.5.2", clause: "Điều khoản 8.5.2", text: "Nhận diện & Đánh giá mối nguy. Tất cả các mối nguy có được đánh giá rủi ro dựa trên mức độ nghiêm trọng và khả năng xảy ra không?" },
      { id: "8.5.4", clause: "Điều khoản 8.5.4", text: "Kế hoạch kiểm soát mối nguy (HACCP/OPRP). Kế hoạch có bao gồm: Giới hạn tới hạn/Tiêu chí hành động, Giám sát, Hành động khắc phục không?" },
      { id: "8.7", clause: "Điều khoản 8.7", text: "Kiểm soát thiết bị đo lường. Thiết bị đo lường được chỉ định là đáng tin cậy, được hiệu chuẩn định kỳ hoặc kiểm tra không?" },
      { id: "8.8", clause: "Điều khoản 8.8", text: "Thẩm tra (Verification). Tổ chức có lập lịch và thực hiện các hoạt động thẩm tra để chứng minh PRPs và Kế hoạch HACCP/OPRP được tuân thủ không?" },
      { id: "8.9.3", clause: "Điều khoản 8.9.3", text: "Hành động khắc phục. Tổ chức có tiến hành phân tích nguyên nhân gốc rễ để ngăn ngừa lỗi tái diễn không?" },
      { id: "8.9.5", clause: "Điều khoản 8.9.5", text: "Thu hồi sản phẩm (Recall). Tổ chức có quy trình thu hồi lô sản phẩm không an toàn không? Có diễn tập thu hồi không?" }
    ]
  },
  {
    section: "ĐIỀU KHOẢN 9: ĐÁNH GIÁ KẾT QUẢ HOẠT ĐỘNG",
    items: [
      { id: "9.1.1", clause: "Điều khoản 9.1.1", text: "Theo dõi, đo lường, phân tích và đánh giá. Tổ chức có xác định những gì cần theo dõi, phương pháp, thời điểm và cách thức phân tích kết quả chưa?" },
      { id: "9.1.2", clause: "Điều khoản 9.1.2", text: "Phân tích và đánh giá dữ liệu. Tổ chức có đánh giá thông tin phát sinh từ quá trình theo dõi, đo lường (kể cả kết quả thẩm tra PRPs và HACCP) không?" },
      { id: "9.2.1", clause: "Điều khoản 9.2.1", text: "Đánh giá nội bộ. Tổ chức có tiến hành đánh giá nội bộ theo các khoảng thời gian được hoạch định để cung cấp thông tin xem FSMS có phù hợp không?" },
      { id: "9.2.2", clause: "Điều khoản 9.2.2", text: "Chương trình đánh giá nội bộ có đảm bảo tính khách quan và công bằng không (người đánh giá không tự đánh giá công việc của mình)?" },
      { id: "9.3.1", clause: "Điều khoản 9.3.1", text: "Xem xét của lãnh đạo. Lãnh đạo cao nhất có tiến hành xem xét FSMS theo định kỳ để đảm bảo sự phù hợp, thỏa đáng và hiệu lực liên tục không?" },
      { id: "9.3.3", clause: "Điều khoản 9.3.3", text: "Đầu ra xem xét của lãnh đạo có bao gồm các quyết định về cơ hội cải tiến, nhu cầu thay đổi đối với FSMS và nguồn lực không?" }
    ]
  },
  {
    section: "ĐIỀU KHOẢN 10: CẢI TIẾN",
    items: [
      { id: "10.1.1", clause: "Điều khoản 10.1.1", text: "Sự không phù hợp và hành động khắc phục. Khi sự không phù hợp xảy ra, tổ chức có hành động để kiểm soát, khắc phục và xử lý hệ quả không?" },
      { id: "10.1.2", clause: "Điều khoản 10.1.2", text: "Tổ chức có đánh giá nhu cầu hành động nhằm loại bỏ nguyên nhân gốc rễ của sự không phù hợp để nó không tái diễn không?" },
      { id: "10.2", clause: "Điều khoản 10.2", text: "Cải tiến liên tục. Lãnh đạo cao nhất có đảm bảo tổ chức liên tục nâng cao tính hiệu lực của FSMS thông qua xem xét lãnh đạo, đánh giá nội bộ, hành động khắc phục không?" },
      { id: "10.3", clause: "Điều khoản 10.3", text: "Cập nhật Hệ thống quản lý ATTP. Tổ chức có đánh giá FSMS định kỳ để đảm bảo các mối nguy đã được kiểm soát một cách phù hợp và cập nhật chưa?" }
    ]
  }
];

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

  // Checklist Item States: key is item.id (e.g. '4.1', '8.5.4')
  const [compliance, setCompliance] = useState<Record<string, string>>({});
  const [severities, setSeverities] = useState<Record<string, string>>({});
  const [comments, setComments] = useState<Record<string, string>>({});
  const [capa, setCapa] = useState<Record<string, string>>({});

  // Search filter
  const [searchQuery, setSearchQuery] = useState<string>('');

  // CRM & Report Panel State
  const [isCrmOpen, setIsCrmOpen] = useState<boolean>(false);
  const [isReportOpen, setIsReportOpen] = useState<boolean>(false);

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
  const [crmRecords, setCrmRecords] = useState<Record<string, any>>({});
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
  } | null>(null);

  // Sync guards to avoid stale closures, mount overwrites, and infinite echo loops
  const tabWriterIdRef = useRef<string>(`iso22k_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`);
  const hasHydratedRef = useRef<boolean>(false);
  const hasUserEditedRef = useRef<boolean>(false);
  const isApplyingRemoteRef = useRef<boolean>(false);
  const lastLocalTsRef = useRef<number>(Number(localStorage.getItem('fast_iso22000_full_ts') || 0));
  const lastCrmTsRef = useRef<number>(Number(localStorage.getItem('fast_iso22000_full_crm_ts') || 0));
  const crmRecordsRef = useRef<Record<string, any>>({});
  crmRecordsRef.current = crmRecords;
  const activeCrmIdRef = useRef<string | null>(null);
  const latestPayloadRef = useRef<Record<string, any> | null>(null);

  // Total items count
  const totalItemsCount = useMemo(() => {
    return ISO22K_CHECKLIST_DATA.reduce((acc, sec) => acc + sec.items.length, 0);
  }, []);

  // Completed items count & N-count
  const { completedItemsCount, nCount } = useMemo(() => {
    let completed = 0;
    let n = 0;
    Object.keys(compliance).forEach((k) => {
      if (compliance[k]) {
        completed++;
        if (compliance[k] === 'N') n++;
      }
    });
    return { completedItemsCount: completed, nCount: n };
  }, [compliance]);

  // Percentage
  const progressPercentage = useMemo(() => {
    if (totalItemsCount === 0) return 0;
    return Math.round((completedItemsCount / totalItemsCount) * 100);
  }, [completedItemsCount, totalItemsCount]);

  // Helper to apply state data object into React state cleanly
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

  // Persist session to both Firestore and Server API without overwriting deleted keys
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

    return { firestoreOk, serverOk };
  };

  // 1. Initial Load & Listen to LocalStorage + Server API + Firestore Real-time Sync
  useEffect(() => {
    let active = true;
    try {
      const savedLocal = localStorage.getItem('fast_iso22000_full_current');
      if (savedLocal) {
        const parsed = JSON.parse(savedLocal);
        if (isMeaningfulIsoSession(parsed)) {
          applyStateData(parsed);
        } else {
          // Discard stale empty non-reset placeholder so cloud/server can restore real data
          lastLocalTsRef.current = 0;
          localStorage.removeItem('fast_iso22000_full_current');
          localStorage.removeItem('fast_iso22000_full_ts');
        }
      } else {
        lastLocalTsRef.current = 0;
      }
    } catch (e) {
      console.warn('[FastIso22k] Local load error:', e);
      lastLocalTsRef.current = 0;
    }

    try {
      const savedCrm = localStorage.getItem('fast_iso22000_full_crm');
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
        try {
          localStorage.setItem('fast_iso22000_full_current', JSON.stringify(data));
          localStorage.setItem('fast_iso22000_full_ts', String(lastLocalTsRef.current));
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

      // Never wipe local records with an un-timestamped empty object from cold server disk
      if (remoteCount === 0 && remoteTs === 0 && localCount > 0) return;

      const shouldApply =
        remoteTs > lastCrmTsRef.current ||
        (lastCrmTsRef.current === 0 && remoteCount > 0);

      if (shouldApply) {
        lastCrmTsRef.current = remoteTs || Date.now();
        crmRecordsRef.current = records;
        setCrmRecords(records);
        try {
          localStorage.setItem('fast_iso22000_full_crm', JSON.stringify(records));
          localStorage.setItem('fast_iso22000_full_crm_ts', String(lastCrmTsRef.current));
        } catch {}
      }
    };

    // Server API Preload
    fetch('/api/fast-iso22k/session', { cache: 'no-store' })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.session) {
          applyRemoteSessionIfNewer(data.session);
        }
      })
      .catch(() => {});

    fetch('/api/fast-iso22k/crm', { cache: 'no-store' })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.records) {
          applyRemoteCrmIfNewer(data.records, data._lastUpdated);
        }
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

  // Compile current state data into object
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
      _progress: `${progressPercentage}%`,
      _completed: completedItemsCount,
      _total: totalItemsCount,
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

  // Reactive debounced auto-save ONLY after actual user edits (never on initial mount/hydration!)
  useEffect(() => {
    if (!hasHydratedRef.current || isApplyingRemoteRef.current || !hasUserEditedRef.current) return;

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
        localStorage.setItem('fast_iso22000_full_current', JSON.stringify(data));
        localStorage.setItem('fast_iso22000_full_ts', String(nowTs));
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
    progressPercentage,
    completedItemsCount,
    totalItemsCount
  ]);

  // Flush any pending unsaved edits when switching tabs or unloading the page
  useEffect(() => {
    const flushIfDirty = () => {
      if (hasUserEditedRef.current && latestPayloadRef.current) {
        hasUserEditedRef.current = false;
        const nowTs = Date.now();
        lastLocalTsRef.current = nowTs;
        const data = { ...latestPayloadRef.current, _lastUpdated: nowTs };
        try {
          localStorage.setItem('fast_iso22000_full_current', JSON.stringify(data));
          localStorage.setItem('fast_iso22000_full_ts', String(nowTs));
        } catch {}
        void persistSessionToCloudAndServer(data, true);
      }
    };

    window.addEventListener('beforeunload', flushIfDirty);
    return () => {
      window.removeEventListener('beforeunload', flushIfDirty);
      flushIfDirty();
    };
  }, []);

  // Mark form dirty synchronously when user interacts with any field
  const triggerSaveState = () => {
    if (!isApplyingRemoteRef.current) {
      hasUserEditedRef.current = true;
    }
  };

  // New Client Action (Reset via inline confirmation)
  const newClient = () => {
    setConfirmDialog({
      isOpen: true,
      title: 'Tạo hồ sơ đánh giá mới',
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
          _completed: 0,
          _total: totalItemsCount,
          _lastUpdated: resetTs,
          _writerId: tabWriterIdRef.current,
          _isExplicitReset: true,
        };

        try {
          localStorage.setItem('fast_iso22000_full_current', JSON.stringify(resetObj));
          localStorage.setItem('fast_iso22000_full_ts', String(resetTs));
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
        toast.showToast('Đã làm mới biểu mẫu ISO 22000:2018.', 'info');
        scrollToIsoSection('#iso22k-client-form');
      }
    });
  };

  // Save to CRM Action (merges cleanly with latest remote CRM map)
  const saveToCRM = async () => {
    if (!clientName || !clientName.trim()) {
      toast.showToast("Vui lòng điền ít nhất 'Tên Khách Hàng' trước khi lưu vào CRM!", 'warning');
      scrollToIsoSection('#iso22k-client-form');
      return;
    }

    const nowTs = Date.now();
    const currentData = buildStateDataObject(nowTs);
    const recordId = activeCrmIdRef.current || `${clientName.trim()}_${nowTs}`;
    activeCrmIdRef.current = recordId;
    currentData._progress = `${progressPercentage}%`;
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

    const mergedBase =
      latestRemoteTs > lastCrmTsRef.current
        ? { ...latestRemoteRecords }
        : { ...latestRemoteRecords, ...crmRecordsRef.current };

    const updatedCrm = {
      ...mergedBase,
      [recordId]: currentData
    };

    lastCrmTsRef.current = nowTs;
    crmRecordsRef.current = updatedCrm;
    setCrmRecords(updatedCrm);
    try {
      localStorage.setItem('fast_iso22000_full_crm', JSON.stringify(updatedCrm));
      localStorage.setItem('fast_iso22000_full_crm_ts', String(nowTs));
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
        })
      });
      serverSaved = res.ok;
    } catch {}

    // Also update current session with the linked CRM record ID
    hasUserEditedRef.current = false;
    lastLocalTsRef.current = nowTs;
    try {
      localStorage.setItem('fast_iso22000_full_current', JSON.stringify(currentData));
      localStorage.setItem('fast_iso22000_full_ts', String(nowTs));
    } catch {}
    void persistSessionToCloudAndServer(currentData);

    if (cloudSaved || serverSaved) {
      toast.showToast(`Đã lưu & đồng bộ hồ sơ "${clientName.trim()}" vào CRM thành công!`, 'success');
    } else {
      toast.showToast('Đã lưu cục bộ, nhưng không thể đồng bộ lên máy chủ lúc này.', 'warning');
    }
  };

  // Toggle CRM Table Panel (scroll handled reactively by useSmoothScrollTo)
  const openCRM = () => {
    setIsCrmOpen(true);
    scrollToIsoSection('#iso22k-crm-panel');
  };

  const closeCRM = () => {
    setIsCrmOpen(false);
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
          localStorage.setItem('fast_iso22000_full_current', JSON.stringify(syncedRec));
          localStorage.setItem('fast_iso22000_full_ts', String(nowTs));
        } catch {}
        void persistSessionToCloudAndServer(syncedRec);
        closeCRM();
        toast.showToast(`Đã tải hồ sơ: ${rec.clientName || id}`, 'success');
        scrollToIsoSection('#iso22k-client-form');
      }
    });
  };

  // Delete Record from CRM (Firestore + Server disk without merge:true so deletion persists)
  const deleteRecord = (id: string) => {
    const targetName = crmRecordsRef.current[id]?.clientName || 'khách hàng này';
    setConfirmDialog({
      isOpen: true,
      title: 'Xóa dữ liệu CRM',
      message: `Bạn có chắc chắn muốn xóa hồ sơ "${targetName}" khỏi hệ thống CRM?`,
      onConfirm: async () => {
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
          localStorage.setItem('fast_iso22000_full_crm', JSON.stringify(updated));
          localStorage.setItem('fast_iso22000_full_crm_ts', String(nowTs));
        } catch {}

        try {
          await setDoc(doc(db, 'fast_iso22k_crm', 'database'), {
            records: updated,
            _lastUpdated: nowTs,
            _writerId: tabWriterIdRef.current,
          });
        } catch (e) {
          logIsoFirestoreError(e, IsoOperationType.DELETE, 'fast_iso22k_crm/database');
        }

        try {
          await fetch('/api/fast-iso22k/crm', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              records: updated,
              _lastUpdated: nowTs,
              _writerId: tabWriterIdRef.current,
            })
          });
        } catch {}

        toast.showToast(`Đã xóa hồ sơ "${targetName}" khỏi CRM.`, 'success');
      }
    });
  };

  // Toggle All Sections Open / Closed
  const toggleAll = (isOpen: boolean) => {
    const detailsList = document.querySelectorAll('.fast-iso22k-wrapper details');
    detailsList.forEach((d) => {
      (d as HTMLDetailsElement).open = isOpen;
    });
  };

  // Compute NCR & CAPA findings reactively
  const reportFindings = useMemo(() => {
    const rows: Array<{
      id: string;
      clause: string;
      text: string;
      status: string;
      severity: 'Major' | 'Minor' | 'Observation';
      notes: string;
      capaText: string;
    }> = [];
    let majorCount = 0;
    let minorCount = 0;
    let obsCount = 0;

    ISO22K_CHECKLIST_DATA.forEach((section) => {
      section.items.forEach((item) => {
        const sev = severities[item.id] as 'Major' | 'Minor' | 'Observation' | '' | undefined;
        const status = compliance[item.id] || 'Chưa đánh giá';
        const effectiveSev: 'Major' | 'Minor' | 'Observation' | null =
          sev === 'Major' || sev === 'Minor' || sev === 'Observation'
            ? sev
            : status === 'N'
              ? 'Minor'
              : null;

        if (effectiveSev) {
          if (effectiveSev === 'Major') majorCount++;
          if (effectiveSev === 'Minor') minorCount++;
          if (effectiveSev === 'Observation') obsCount++;

          rows.push({
            id: item.id,
            clause: item.clause,
            text: item.text,
            status,
            severity: effectiveSev,
            notes: comments[item.id] || '',
            capaText: capa[item.id] || '',
          });
        }
      });
    });

    return {
      rows,
      majorCount,
      minorCount,
      obsCount,
      totalDefects: majorCount + minorCount + obsCount,
    };
  }, [compliance, severities, comments, capa]);

  // Xuất Báo Cáo Lỗi & CAPA inline (no window.open popup blocking) + auto-scroll
  const generateReport = () => {
    if (reportFindings.rows.length === 0) {
      toast.showToast(
        'Hoàn hảo! Chưa có lỗi nào được phân loại (Major/Minor/Observation hoặc "N") để xuất báo cáo.',
        'info'
      );
      return;
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

  // Filtered Checklist Sections
  const filteredSections = useMemo(() => {
    if (!searchQuery.trim()) {
      return ISO22K_CHECKLIST_DATA.map(sec => ({ ...sec, visible: true, matchedItemIds: new Set(sec.items.map(it => it.id)) }));
    }
    const q = searchQuery.toLowerCase().trim();
    return ISO22K_CHECKLIST_DATA.map(sec => {
      const matched = new Set<string>();
      sec.items.forEach(it => {
        if (it.clause.toLowerCase().includes(q) || it.text.toLowerCase().includes(q) || it.id.toLowerCase().includes(q)) {
          matched.add(it.id);
        }
      });
      return {
        ...sec,
        visible: matched.size > 0,
        matchedItemIds: matched
      };
    });
  }, [searchQuery]);

  return (
    <div className="fast-iso22k-wrapper">
      {/* Scoped CSS from attached HTML */}
      <style>{`
        .fast-iso22k-wrapper {
          --primary: #007c76;
          --primary-dark: #005a56;
          --primary-light: #e6f2f1;
          --bg-color: #f4f8f8;
          --text-main: #333333;
          --text-muted: #666666;
          --border-color: #cccccc;
          --accent-red: #d9534f;
          --accent-green: #5cb85c;
          --accent-blue: #0275d8;
          --accent-orange: #f0ad4e;
          --white: #ffffff;
          --shadow: 0 4px 6px rgba(0, 0, 0, 0.05);
          --radius: 8px;
          --font-family: 'Segoe UI', -apple-system, Roboto, sans-serif;
          font-family: var(--font-family);
          background-color: var(--bg-color);
          color: var(--text-main);
          line-height: 1.6;
          border-radius: var(--radius);
          overflow-x: clip;
        }

        .fast-iso22k-wrapper * {
          box-sizing: border-box;
        }

        /* Header */
        .fast-iso22k-wrapper header {
          background-color: var(--primary);
          color: var(--white);
          padding: 20px;
          box-shadow: var(--shadow);
          position: sticky;
          top: 0;
          z-index: 50;
        }

        .fast-iso22k-wrapper .header-container {
          max-width: 1200px;
          margin: 0 auto;
          display: flex;
          justify-content: space-between;
          align-items: center;
          flex-wrap: wrap;
          gap: 15px;
        }

        .fast-iso22k-wrapper .brand-info h1 {
          font-size: 24px;
          margin-bottom: 5px;
          font-weight: bold;
          color: #ffffff;
        }

        .fast-iso22k-wrapper .brand-info p {
          font-size: 14px;
          opacity: 0.9;
          font-weight: 500;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          color: #ffffff;
        }

        .fast-iso22k-wrapper .hotline {
          background-color: var(--accent-red);
          color: var(--white) !important;
          padding: 10px 20px;
          border-radius: 50px;
          text-decoration: none;
          font-weight: bold;
          display: inline-flex;
          align-items: center;
          gap: 8px;
          transition: background 0.3s;
        }

        .fast-iso22k-wrapper .hotline:hover {
          background-color: #c9302c;
        }

        /* Container & Action Bar */
        .fast-iso22k-wrapper .container {
          max-width: 1200px;
          margin: 30px auto;
          padding: 0 20px;
        }

        .fast-iso22k-wrapper .action-bar {
          background: var(--white);
          padding: 15px 20px;
          border-radius: var(--radius);
          box-shadow: var(--shadow);
          display: flex;
          gap: 15px;
          margin-bottom: 25px;
          flex-wrap: wrap;
          align-items: center;
          justify-content: space-between;
        }

        .fast-iso22k-wrapper .search-box {
          flex: 1;
          min-width: 250px;
        }

        .fast-iso22k-wrapper .search-box input {
          width: 100%;
          padding: 10px 15px;
          border: 1px solid var(--border-color);
          border-radius: var(--radius);
          font-size: 15px;
          outline: none;
          transition: border-color 0.2s;
          background-color: #fff;
          color: #333;
        }

        .fast-iso22k-wrapper .search-box input:focus {
          border-color: var(--primary);
          box-shadow: 0 0 0 2px var(--primary-light);
        }

        .fast-iso22k-wrapper .btn-group {
          display: flex;
          gap: 10px;
          flex-wrap: wrap;
        }

        .fast-iso22k-wrapper button {
          padding: 10px 15px;
          border: none;
          border-radius: var(--radius);
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
        }

        .fast-iso22k-wrapper .btn-primary {
          background: var(--primary);
          color: var(--white);
        }

        .fast-iso22k-wrapper .btn-primary:hover {
          background: var(--primary-dark);
        }

        .fast-iso22k-wrapper .btn-outline {
          background: var(--white);
          color: var(--primary);
          border: 1px solid var(--primary);
        }

        .fast-iso22k-wrapper .btn-outline:hover {
          background: var(--primary-light);
        }

        .fast-iso22k-wrapper .btn-danger {
          background: var(--accent-red);
          color: var(--white);
        }

        .fast-iso22k-wrapper .btn-danger:hover {
          background: #c9302c;
        }

        .fast-iso22k-wrapper .btn-info {
          background: var(--accent-blue);
          color: var(--white);
        }

        .fast-iso22k-wrapper .btn-info:hover {
          background: #025aa5;
        }

        .fast-iso22k-wrapper .btn-warning {
          background: var(--accent-orange);
          color: var(--white);
        }

        .fast-iso22k-wrapper .btn-warning:hover {
          background: #ec971f;
        }

        /* Progress Tracker */
        .fast-iso22k-wrapper .progress-container {
          background: var(--white);
          padding: 20px;
          border-radius: var(--radius);
          box-shadow: var(--shadow);
          margin-bottom: 25px;
        }

        .fast-iso22k-wrapper .progress-header {
          display: flex;
          justify-content: space-between;
          margin-bottom: 10px;
          font-weight: bold;
        }

        .fast-iso22k-wrapper .progress-bar-bg {
          background: var(--border-color);
          height: 12px;
          border-radius: 10px;
          overflow: hidden;
        }

        .fast-iso22k-wrapper .progress-bar-fill {
          background: var(--accent-green);
          height: 100%;
          transition: width 0.4s ease;
        }

        /* Audit Info Form */
        .fast-iso22k-wrapper .client-section {
          background: var(--white);
          padding: 20px;
          border-radius: var(--radius);
          box-shadow: var(--shadow);
          margin-bottom: 25px;
        }

        .fast-iso22k-wrapper .client-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 15px;
          flex-wrap: wrap;
          gap: 10px;
        }

        .fast-iso22k-wrapper .client-header h2 {
          font-size: 18px;
          color: var(--primary-dark);
          font-weight: bold;
        }

        .fast-iso22k-wrapper .audit-info {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
          gap: 15px;
        }

        .fast-iso22k-wrapper .form-group {
          display: flex;
          flex-direction: column;
          gap: 5px;
        }

        .fast-iso22k-wrapper .form-group label {
          font-weight: 600;
          font-size: 14px;
          color: var(--text-main);
        }

        .fast-iso22k-wrapper .form-group input,
        .fast-iso22k-wrapper .form-group select {
          width: 100%;
          padding: 10px;
          border: 1px solid var(--border-color);
          border-radius: 4px;
          font-family: inherit;
          background-color: #fff;
          color: #333;
        }

        .fast-iso22k-wrapper .form-group select:focus,
        .fast-iso22k-wrapper .form-group input:focus {
          outline: none;
          border-color: var(--primary);
        }

        /* Checklist Sections */
        .fast-iso22k-wrapper details {
          background: var(--white);
          margin-bottom: 15px;
          border-radius: var(--radius);
          box-shadow: var(--shadow);
          overflow: hidden;
        }

        .fast-iso22k-wrapper summary {
          padding: 15px 20px;
          background: var(--primary-light);
          font-weight: bold;
          font-size: 16px;
          cursor: pointer;
          list-style: none;
          display: flex;
          align-items: center;
          color: var(--primary-dark);
          user-select: none;
        }

        .fast-iso22k-wrapper summary::-webkit-details-marker {
          display: none;
        }

        .fast-iso22k-wrapper summary::before {
          content: '▶';
          display: inline-block;
          margin-right: 10px;
          transition: transform 0.3s;
          font-size: 12px;
        }

        .fast-iso22k-wrapper details[open] summary::before {
          transform: rotate(90deg);
        }

        .fast-iso22k-wrapper .table-responsive {
          overflow-x: auto;
          -webkit-overflow-scrolling: touch;
        }

        .fast-iso22k-wrapper table {
          width: 100%;
          border-collapse: collapse;
          min-width: 800px;
        }

        .fast-iso22k-wrapper th,
        .fast-iso22k-wrapper td {
          padding: 12px 15px;
          border: 1px solid var(--border-color);
          text-align: left;
          vertical-align: top;
        }

        .fast-iso22k-wrapper th {
          background: var(--bg-color);
          font-weight: bold;
          text-align: center;
        }

        .fast-iso22k-wrapper .col-req { width: 45%; }
        .fast-iso22k-wrapper .col-comp { width: 20%; text-align: center; }
        .fast-iso22k-wrapper .col-ev { width: 35%; }

        .fast-iso22k-wrapper .clause-badge {
          display: inline-block;
          background-color: var(--primary-light);
          color: var(--primary-dark);
          padding: 4px 10px;
          border-radius: 4px;
          font-size: 13px;
          font-weight: bold;
          margin-bottom: 8px;
          border: 1px solid #c2e0df;
        }

        .fast-iso22k-wrapper .radio-group {
          display: flex;
          justify-content: center;
          gap: 15px;
        }

        .fast-iso22k-wrapper .radio-label {
          display: flex;
          flex-direction: column;
          align-items: center;
          cursor: pointer;
          font-size: 13px;
          font-weight: 600;
        }

        .fast-iso22k-wrapper .radio-label input {
          width: 18px;
          height: 18px;
          margin-bottom: 4px;
          cursor: pointer;
          accent-color: var(--primary);
        }

        .fast-iso22k-wrapper .severity-select {
          width: 100%;
          padding: 8px;
          margin-bottom: 8px;
          border: 1px solid var(--border-color);
          border-radius: 4px;
          font-family: inherit;
          background-color: #fff;
          color: #333;
        }

        .fast-iso22k-wrapper textarea {
          width: 100%;
          min-height: 70px;
          padding: 10px;
          border: 1px solid var(--border-color);
          border-radius: 4px;
          resize: vertical;
          font-family: inherit;
          margin-bottom: 8px;
          background-color: #fff;
          color: #333;
        }

        .fast-iso22k-wrapper textarea:focus,
        .fast-iso22k-wrapper .severity-select:focus {
          outline: none;
          border-color: var(--primary);
        }

        .fast-iso22k-wrapper .capa-input {
          border-left: 3px solid var(--accent-blue);
          background-color: #f8fbff;
        }

        .fast-iso22k-wrapper .capa-input:focus {
          border-color: var(--accent-blue);
        }

        /* CRM Modal */
        .fast-iso22k-wrapper .modal {
          display: flex;
          position: fixed;
          z-index: 10000;
          left: 0;
          top: 0;
          width: 100%;
          height: 100%;
          overflow: auto;
          background-color: rgba(0,0,0,0.6);
          align-items: center;
          justify-content: center;
          padding: 20px;
        }

        .fast-iso22k-wrapper .modal-content {
          background-color: #fefefe;
          padding: 24px;
          border: 1px solid #888;
          width: 100%;
          max-width: 900px;
          border-radius: var(--radius);
          box-shadow: 0 10px 25px rgba(0,0,0,0.2);
          max-height: 90vh;
          overflow-y: auto;
        }

        .fast-iso22k-wrapper .close {
          color: #aaa;
          float: right;
          font-size: 28px;
          font-weight: bold;
          cursor: pointer;
        }

        .fast-iso22k-wrapper .close:hover {
          color: black;
        }

        .fast-iso22k-wrapper .crm-table th,
        .fast-iso22k-wrapper .crm-table td {
          text-align: center;
        }

        /* Footer */
        .fast-iso22k-wrapper footer {
          background-color: var(--primary-dark);
          color: var(--white);
          text-align: center;
          padding: 25px 20px;
          margin-top: 40px;
          font-size: 14px;
        }

        .fast-iso22k-wrapper footer p {
          margin: 5px 0;
        }

        .fast-iso22k-wrapper footer .footer-brand {
          font-size: 16px;
          font-weight: bold;
          letter-spacing: 0.5px;
        }

        /* Print CSS */
        @media print {
          body { background: #fff !important; color: #000 !important; font-size: 12pt !important; display: block !important; }
          .fast-iso22k-wrapper header,
          .fast-iso22k-wrapper .action-bar,
          .fast-iso22k-wrapper .progress-container,
          .fast-iso22k-wrapper .client-header .btn-group {
            display: none !important;
          }
          .fast-iso22k-wrapper .container { margin: 0 !important; padding: 0 !important; max-width: 100% !important; }
          .fast-iso22k-wrapper .client-section,
          .fast-iso22k-wrapper details { box-shadow: none !important; border: none !important; margin-bottom: 10px !important; }
          .fast-iso22k-wrapper details[open] summary { border-bottom: 2px solid #000 !important; background: #eee !important; -webkit-print-color-adjust: exact !important; color: #000 !important; }
          .fast-iso22k-wrapper summary::before { display: none !important; }
          .fast-iso22k-wrapper table { page-break-inside: avoid !important; border: 1px solid #000 !important; margin-bottom: 15px !important; }
          .fast-iso22k-wrapper th,
          .fast-iso22k-wrapper td { border: 1px solid #000 !important; }
          .fast-iso22k-wrapper th { background: #f0f0f0 !important; -webkit-print-color-adjust: exact !important; }
          .fast-iso22k-wrapper .clause-badge { border: 1px solid #000 !important; color: #000 !important; background: #fff !important; }
          .fast-iso22k-wrapper textarea,
          .fast-iso22k-wrapper .severity-select { border: none !important; border-bottom: 1px dotted #ccc !important; resize: none !important; min-height: auto !important; padding: 2px !important; margin-bottom: 5px !important; background-color: #fff !important; }
          .fast-iso22k-wrapper .severity-select { -webkit-appearance: none !important; -moz-appearance: none !important; appearance: none !important; }
          .fast-iso22k-wrapper .radio-label input { display: none !important; }
          .fast-iso22k-wrapper .radio-label { flex-direction: row !important; font-size: 14px !important; }
          .fast-iso22k-wrapper .radio-label input:checked + span { font-weight: bold !important; text-decoration: underline !important; }
          .fast-iso22k-wrapper .radio-label input:not(:checked) + span { display: none !important; }
          .fast-iso22k-wrapper footer { background-color: #fff !important; color: #000 !important; padding: 10px 0 !important; border-top: 1px solid #000 !important; margin-top: 20px !important; font-size: 10pt !important; }
        }
      `}</style>

      {/* Header */}
      <header>
        <div className="header-container">
          <div className="brand-info">
            <h1>FAST CONSULTING</h1>
            <p>Checklist Đánh Giá Tiêu Chuẩn ISO 22000:2018 (Full Version)</p>
          </div>
          <a href="tel:0927002668" className="hotline">📞 0927 002 668</a>
        </div>
      </header>

      <div className="container">
        {/* Action Bar */}
        <div className="action-bar">
          <div className="search-box">
            <input
              type="text"
              id="searchInput"
              placeholder="Tìm kiếm tiêu chuẩn, điều khoản, từ khóa..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <div className="btn-group">
            <button className="btn-outline" onClick={() => toggleAll(true)}>Mở rộng tất cả</button>
            <button className="btn-outline" onClick={() => toggleAll(false)}>Thu gọn tất cả</button>
            <button className="btn-primary" onClick={() => window.print()}>🖨 In Checklist</button>
            <button className="btn-warning" onClick={generateReport}>📄 Xuất Báo Cáo Lỗi & CAPA</button>
          </div>
        </div>

        {/* Progress Tracker */}
        <div className="progress-container">
          <div className="progress-header">
            <span>Tiến độ đánh giá:</span>
            <span id="progressText">
              Đã hoàn thành: {completedItemsCount} / {totalItemsCount} mục ({progressPercentage}%)
              {nCount > 20 && (
                <span style={{ color: 'var(--accent-red)', fontWeight: 'bold', marginLeft: '10px' }}>
                  (Cảnh báo: Lớn hơn 20 lỗi "N" - Yêu cầu rà soát lại!)
                </span>
              )}
            </span>
          </div>
          <div className="progress-bar-bg">
            <div
              className="progress-bar-fill"
              id="progressBar"
              style={{ width: `${progressPercentage}%` }}
            />
          </div>
        </div>

        {/* Client & CRM Info */}
        <div id="iso22k-client-form" className="client-section iso22k-main-checklist">
          <div className="client-header">
            <h2>Thông Tin Khách Hàng & Chuyên Gia</h2>
            <div className="btn-group">
              <button type="button" className="btn-danger" onClick={newClient}>➕ Tạo mới</button>
              <button type="button" className="btn-primary" onClick={saveToCRM}>💾 Lưu CRM</button>
              <button type="button" className="btn-info" onClick={() => (isCrmOpen ? closeCRM() : openCRM())}>
                📊 {isCrmOpen ? 'Ẩn Dữ liệu CRM' : `Dữ liệu CRM (${Object.keys(crmRecords).length})`}
              </button>
            </div>
          </div>
          <div className="audit-info">
            <div className="form-group">
              <label htmlFor="clientName">Tên Khách Hàng:</label>
              <input
                type="text"
                id="clientName"
                className="save-state"
                value={clientName}
                onChange={(e) => {
                  setClientName(e.target.value);
                  triggerSaveState();
                }}
              />
            </div>
            <div className="form-group">
              <label htmlFor="contactName">Tên người liên hệ:</label>
              <input
                type="text"
                id="contactName"
                className="save-state"
                value={contactName}
                onChange={(e) => {
                  setContactName(e.target.value);
                  triggerSaveState();
                }}
              />
            </div>
            <div className="form-group">
              <label htmlFor="contactPhone">Số điện thoại liên hệ:</label>
              <input
                type="text"
                id="contactPhone"
                className="save-state"
                value={contactPhone}
                onChange={(e) => {
                  setContactPhone(e.target.value);
                  triggerSaveState();
                }}
              />
            </div>
            <div className="form-group">
              <label htmlFor="leadAuditor">Chuyên gia đánh giá (Lead Auditor):</label>
              <input
                type="text"
                id="leadAuditor"
                className="save-state"
                value={leadAuditor}
                onChange={(e) => {
                  setLeadAuditor(e.target.value);
                  triggerSaveState();
                }}
              />
            </div>
            <div className="form-group">
              <label htmlFor="auditType">Loại đánh giá:</label>
              <select
                id="auditType"
                className="save-state"
                value={auditType}
                onChange={(e) => {
                  setAuditType(e.target.value);
                  triggerSaveState();
                }}
              >
                <option value="">-- Chọn Loại Đánh Giá --</option>
                <option value="Đánh giá Khảo sát">Đánh giá Khảo sát</option>
                <option value="Đánh giá nội bộ">Đánh giá nội bộ</option>
                <option value="Đánh giá Chứng Nhận">Đánh giá Chứng Nhận</option>
                <option value="Đánh giá giám sát">Đánh giá giám sát</option>
              </select>
            </div>
            <div className="form-group">
              <label htmlFor="auditAddress">Địa chỉ đánh giá:</label>
              <input
                type="text"
                id="auditAddress"
                className="save-state"
                value={auditAddress}
                onChange={(e) => {
                  setAuditAddress(e.target.value);
                  triggerSaveState();
                }}
              />
            </div>
            <div className="form-group">
              <label htmlFor="fsmsScope">Phạm vi (Scope):</label>
              <input
                type="text"
                id="fsmsScope"
                className="save-state"
                value={fsmsScope}
                onChange={(e) => {
                  setFsmsScope(e.target.value);
                  triggerSaveState();
                }}
              />
            </div>
            <div className="form-group">
              <label htmlFor="auditDate">Ngày đánh giá:</label>
              <input
                type="date"
                id="auditDate"
                className="save-state"
                value={auditDate}
                onChange={(e) => {
                  setAuditDate(e.target.value);
                  triggerSaveState();
                }}
              />
            </div>
            <div className="form-group">
              <label htmlFor="reportNo">Số Report:</label>
              <input
                type="text"
                id="reportNo"
                className="save-state"
                value={reportNo}
                onChange={(e) => {
                  setReportNo(e.target.value);
                  triggerSaveState();
                }}
              />
            </div>
          </div>
        </div>

        {/* Inline CRM Table Panel (smooth auto-scroll target) */}
        {isCrmOpen && (
          <div
            id="iso22k-crm-panel"
            className="client-section iso22k-main-checklist"
            style={{ border: '2px solid #0275d8', background: '#ffffff' }}
          >
            <div className="client-header" style={{ borderBottom: '1px solid #e2e8f0', paddingBottom: '12px' }}>
              <h2>Thống Kê Khách Hàng (CRM) - ISO 22000:2018 ({Object.keys(crmRecords).length} hồ sơ)</h2>
              <button type="button" className="btn-outline" onClick={closeCRM}>✕ Đóng bảng CRM</button>
            </div>
            <div className="table-responsive">
              <table className="crm-table" id="crmTable">
                <thead>
                  <tr>
                    <th>Ngày đánh giá</th>
                    <th>Tên Khách Hàng</th>
                    <th>Loại đánh giá</th>
                    <th>Tiến độ</th>
                    <th>Thao tác</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.keys(crmRecords).length === 0 ? (
                    <tr>
                      <td colSpan={5} style={{ padding: '20px', textAlign: 'center', color: '#666' }}>
                        Chưa có dữ liệu khách hàng nào được lưu trữ.
                      </td>
                    </tr>
                  ) : (
                    Object.keys(crmRecords).map((recId) => {
                      const rec = crmRecords[recId];
                      return (
                        <tr key={recId}>
                          <td>{rec.auditDate || (rec._savedAt ? rec._savedAt.split(' ')[1] : 'N/A')}</td>
                          <td><strong>{rec.clientName}</strong></td>
                          <td>{rec.auditType || 'N/A'}</td>
                          <td><strong>{rec._progress || '0%'}</strong></td>
                          <td>
                            <button
                              type="button"
                              className="btn-outline"
                              style={{ padding: '5px 10px', fontSize: '12px', marginRight: '6px' }}
                              onClick={() => loadRecord(recId)}
                            >
                              Tải
                            </button>
                            <button
                              type="button"
                              className="btn-danger"
                              style={{ padding: '5px 10px', fontSize: '12px' }}
                              onClick={() => deleteRecord(recId)}
                            >
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

        {/* Inline NCR & CAPA Report Panel (White background, printable, auto-scroll target) */}
        {isReportOpen && (
          <div
            id="iso22k-report-panel"
            style={{
              background: '#ffffff',
              color: '#1e293b',
              borderRadius: '12px',
              border: '2px solid #007c76',
              padding: '24px',
              marginBottom: '25px',
              boxShadow: '0 8px 24px rgba(0,0,0,0.06)',
            }}
          >
            <div
              className="print:hidden"
              style={{
                display: 'flex',
                flexWrap: 'wrap',
                justifyContent: 'space-between',
                alignItems: 'center',
                gap: '10px',
                borderBottom: '1px solid #cbd5e1',
                paddingBottom: '14px',
                marginBottom: '18px',
              }}
            >
              <span style={{ fontWeight: 800, fontSize: '15px', color: '#007c76' }}>
                BÁO CÁO KẾT QUẢ ĐÁNH GIÁ &amp; CAPA — ISO 22000:2018
              </span>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                <button type="button" className="btn-primary" onClick={handlePrintReport}>
                  🖨 In Báo Cáo (Nền trắng)
                </button>
                <button type="button" className="btn-outline" onClick={() => setIsReportOpen(false)}>
                  ✕ Đóng Báo Cáo
                </button>
              </div>
            </div>

            <div style={{ textAlign: 'center', borderBottom: '2px solid #007c76', paddingBottom: '12px', marginBottom: '18px' }}>
              <div style={{ fontSize: '11px', fontWeight: 700, color: '#007c76', letterSpacing: '1.5px', textTransform: 'uppercase' }}>
                FAST CONSULTING · FOOD ALL STANDARD &amp; TRAINING
              </div>
              <h2 style={{ fontSize: '19px', fontWeight: 800, color: '#0f172a', margin: '6px 0 0' }}>
                BÁO CÁO KẾT QUẢ ĐÁNH GIÁ &amp; HÀNH ĐỘNG KHẮC PHỤC (NCR &amp; CAPA)
              </h2>
            </div>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                gap: '10px',
                background: '#ffffff',
                border: '1px solid #cbd5e1',
                borderRadius: '8px',
                padding: '14px',
                marginBottom: '16px',
                fontSize: '13px',
              }}
            >
              <div><strong>Khách hàng:</strong> {clientName || '........................................'}</div>
              <div><strong>Người liên hệ:</strong> {contactName || '........................................'}</div>
              <div><strong>Điện thoại:</strong> {contactPhone || '........................................'}</div>
              <div><strong>Lead Auditor:</strong> {leadAuditor || '........................................'}</div>
              <div><strong>Loại đánh giá:</strong> {auditType || '........................................'}</div>
              <div><strong>Ngày đánh giá:</strong> {auditDate || '........................................'}</div>
              <div><strong>Địa chỉ:</strong> {auditAddress || '........................................'}</div>
              <div><strong>Phạm vi (Scope):</strong> {fsmsScope || '........................................'}</div>
              <div><strong>Số Report:</strong> {reportNo || '........................................'}</div>
            </div>

            <div
              style={{
                display: 'flex',
                flexWrap: 'wrap',
                justifyContent: 'space-around',
                gap: '12px',
                padding: '12px',
                border: '1px solid #cbd5e1',
                borderRadius: '8px',
                background: '#ffffff',
                fontWeight: 700,
                fontSize: '14px',
                marginBottom: '18px',
              }}
            >
              <span>Tổng số lỗi phát hiện: {reportFindings.totalDefects}</span>
              <span style={{ color: '#d9534f' }}>Major: {reportFindings.majorCount}</span>
              <span style={{ color: '#d97706' }}>Minor: {reportFindings.minorCount}</span>
              <span style={{ color: '#0275d8' }}>Observation: {reportFindings.obsCount}</span>
            </div>

            <div className="table-responsive">
              <table style={{ width: '100%', borderCollapse: 'collapse', background: '#ffffff' }}>
                <thead>
                  <tr>
                    <th style={{ width: '11%', background: '#007c76', color: '#ffffff' }}>Điều khoản</th>
                    <th style={{ width: '27%', background: '#007c76', color: '#ffffff' }}>Nội dung Yêu cầu</th>
                    <th style={{ width: '8%', background: '#007c76', color: '#ffffff' }}>Kết quả</th>
                    <th style={{ width: '11%', background: '#007c76', color: '#ffffff' }}>Phân loại</th>
                    <th style={{ width: '21%', background: '#007c76', color: '#ffffff' }}>Bằng chứng &amp; Ghi chú</th>
                    <th style={{ width: '22%', background: '#007c76', color: '#ffffff' }}>Hành động khắc phục (CAPA)</th>
                  </tr>
                </thead>
                <tbody>
                  {reportFindings.rows.map((r) => {
                    const sevColor =
                      r.severity === 'Major' ? '#d9534f' : r.severity === 'Minor' ? '#d97706' : '#0275d8';
                    return (
                      <tr key={r.id}>
                        <td style={{ textAlign: 'center', fontWeight: 700 }}>{r.clause}</td>
                        <td>{r.text}</td>
                        <td style={{ textAlign: 'center', fontWeight: 700 }}>{r.status}</td>
                        <td style={{ textAlign: 'center', fontWeight: 700, color: sevColor }}>{r.severity}</td>
                        <td>{r.notes || '—'}</td>
                        <td>{r.capaText || '—'}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div style={{ marginTop: '36px', display: 'flex', justifyContent: 'space-around', textAlign: 'center', fontSize: '13px' }}>
              <div>
                <strong>Đại diện Khách Hàng</strong><br />
                <i>(Ký và ghi rõ họ tên)</i><br /><br /><br />
                <strong>{contactName || '.......................................'}</strong>
              </div>
              <div>
                <strong>Chuyên gia đánh giá (Lead Auditor)</strong><br />
                <i>(Ký và ghi rõ họ tên)</i><br /><br /><br />
                <strong>{leadAuditor || '.......................................'}</strong>
              </div>
            </div>
          </div>
        )}

        {/* Checklist Sections */}
        <div id="checklistContainer" className="iso22k-main-checklist">
          {filteredSections.map((sec, sIdx) => {
            if (!sec.visible) return null;
            return (
              <details key={sIdx} open className="checklist-section">
                <summary>{sec.section}</summary>
                <div className="table-responsive">
                  <table data-section={sIdx}>
                    <thead>
                      <tr>
                        <th className="col-req">
                          Yêu cầu & Hướng dẫn<br />
                          <small>(Requirements & Guidelines)</small>
                        </th>
                        <th className="col-comp">
                          Đánh giá Tuân thủ<br />
                          <small>(Y / N / NI / N/A)</small>
                        </th>
                        <th className="col-ev">
                          Phân loại, Ghi chú & CAPA<br />
                          <small>(Severity, Comments & Corrective Actions)</small>
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {sec.items.map((item) => {
                        if (!sec.matchedItemIds.has(item.id)) return null;
                        const currentComp = compliance[item.id] || '';
                        const currentSev = severities[item.id] || '';
                        const currentCmt = comments[item.id] || '';
                        const currentCapa = capa[item.id] || '';

                        return (
                          <tr
                            key={item.id}
                            className="check-item"
                            data-id={item.id}
                            data-clause={item.clause}
                            data-text={item.text}
                          >
                            <td className="req-text">
                              <span className="clause-badge">{item.clause}</span><br />
                              {item.text}
                            </td>
                            <td>
                              <div className="radio-group">
                                {(['Y', 'N', 'NI', 'NA'] as const).map((opt) => (
                                  <label key={opt} className="radio-label">
                                    <input
                                      type="radio"
                                      name={`comp_${item.id}`}
                                      value={opt}
                                      className="save-state radio-req"
                                      checked={currentComp === opt}
                                      onChange={() => {
                                        setCompliance((prev) => ({ ...prev, [item.id]: opt }));
                                        triggerSaveState();
                                      }}
                                    />
                                    <span>{opt === 'NA' ? 'N/A' : opt}</span>
                                  </label>
                                ))}
                              </div>
                            </td>
                            <td>
                              <select
                                className="save-state severity-select"
                                name={`sev_${item.id}`}
                                value={currentSev}
                                onChange={(e) => {
                                  setSeverities((prev) => ({ ...prev, [item.id]: e.target.value }));
                                  triggerSaveState();
                                }}
                              >
                                <option value="">-- Chọn Phân loại lỗi --</option>
                                <option value="Major">Major (Lỗi Nặng)</option>
                                <option value="Minor">Minor (Lỗi Nhẹ)</option>
                                <option value="Observation">Observation (Quan sát)</option>
                              </select>
                              <textarea
                                className="save-state"
                                name={`cmt_${item.id}`}
                                placeholder="Bằng chứng / Ghi chú (Notes)..."
                                value={currentCmt}
                                onChange={(e) => {
                                  setComments((prev) => ({ ...prev, [item.id]: e.target.value }));
                                  triggerSaveState();
                                }}
                              />
                              <textarea
                                className="save-state capa-input"
                                name={`capa_${item.id}`}
                                placeholder="Hành động khắc phục (CAPA)..."
                                value={currentCapa}
                                onChange={(e) => {
                                  setCapa((prev) => ({ ...prev, [item.id]: e.target.value }));
                                  triggerSaveState();
                                }}
                              />
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </details>
            );
          })}
        </div>
      </div>

      {/* Custom Confirm Dialog (bypasses blocked native confirm popups) */}
      {confirmDialog && confirmDialog.isOpen && (
        <div
          className="modal"
          onClick={(e) => {
            if (e.target === e.currentTarget) setConfirmDialog(null);
          }}
        >
          <div className="modal-content" style={{ maxWidth: '420px', background: '#ffffff', borderRadius: '16px', padding: '24px' }}>
            <h3 style={{ fontSize: '16px', fontWeight: 800, color: '#0f172a', marginBottom: '10px' }}>
              {confirmDialog.title}
            </h3>
            <p style={{ fontSize: '13px', color: '#475569', lineHeight: 1.5, marginBottom: '20px' }}>
              {confirmDialog.message}
            </p>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button type="button" className="btn-outline" onClick={() => setConfirmDialog(null)}>
                Hủy bỏ
              </button>
              <button
                type="button"
                className="btn-primary"
                onClick={() => {
                  const fn = confirmDialog.onConfirm;
                  setConfirmDialog(null);
                  fn();
                }}
              >
                Xác nhận
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="iso22k-main-checklist">
        <p className="footer-brand">FAST CONSULTING - Food All Standard & Training</p>
        <p>&copy; Bản quyền của FAST. Tất cả các quyền được bảo lưu.</p>
      </footer>
    </div>
  );
};

export default FastIso22kChecklist;
