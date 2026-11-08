import React, { useState, useEffect, useRef, useMemo } from 'react';
import { db } from '../firebase';
import { doc, setDoc, onSnapshot } from 'firebase/firestore';

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

  // CRM Modal State
  const [isCrmOpen, setIsCrmOpen] = useState<boolean>(false);
  const [crmRecords, setCrmRecords] = useState<Record<string, any>>({});

  // Sync state debounce ref
  const saveTimeoutRef = useRef<any>(null);

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

  // 1. Initial Load & Listen to LocalStorage + Firestore Sync
  useEffect(() => {
    // A. Load local state
    try {
      const savedLocal = localStorage.getItem('fast_iso22000_full_current');
      if (savedLocal) {
        const parsed = JSON.parse(savedLocal);
        applyStateData(parsed);
      }
    } catch (e) {
      console.warn('[FastIso22k] Local load error:', e);
    }

    try {
      const savedCrm = localStorage.getItem('fast_iso22000_full_crm');
      if (savedCrm) {
        setCrmRecords(JSON.parse(savedCrm));
      }
    } catch (e) {}

    // B. Firestore Real-time Listeners (multi-user / multi-tab cloud sync)
    const unsubSession = onSnapshot(doc(db, 'fast_iso22k_crm', 'current_session'), (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        if (data && data._lastUpdated) {
          const localTimestamp = localStorage.getItem('fast_iso22000_full_ts');
          if (!localTimestamp || Number(data._lastUpdated) > Number(localTimestamp)) {
            applyStateData(data);
            localStorage.setItem('fast_iso22000_full_current', JSON.stringify(data));
            localStorage.setItem('fast_iso22000_full_ts', String(data._lastUpdated));
          }
        }
      }
    }, (err) => console.warn('[FastIso22k] Session listener error:', err));

    const unsubCrm = onSnapshot(doc(db, 'fast_iso22k_crm', 'database'), (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        if (data && data.records) {
          setCrmRecords(data.records);
          localStorage.setItem('fast_iso22000_full_crm', JSON.stringify(data.records));
        }
      }
    }, (err) => console.warn('[FastIso22k] CRM listener error:', err));

    return () => {
      unsubSession();
      unsubCrm();
    };
  }, []);

  // Helper to apply state data object into React state
  const applyStateData = (data: Record<string, any>) => {
    if (!data) return;
    if (data.clientName !== undefined) setClientName(data.clientName || '');
    if (data.contactName !== undefined) setContactName(data.contactName || '');
    if (data.contactPhone !== undefined) setContactPhone(data.contactPhone || '');
    if (data.leadAuditor !== undefined) setLeadAuditor(data.leadAuditor || '');
    if (data.auditType !== undefined) setAuditType(data.auditType || '');
    if (data.auditAddress !== undefined) setAuditAddress(data.auditAddress || '');
    if (data.fsmsScope !== undefined) setFsmsScope(data.fsmsScope || '');
    if (data.auditDate !== undefined) setAuditDate(data.auditDate || '');
    if (data.reportNo !== undefined) setReportNo(data.reportNo || '');

    const newComp: Record<string, string> = {};
    const newSev: Record<string, string> = {};
    const newCmt: Record<string, string> = {};
    const newCapa: Record<string, string> = {};

    Object.keys(data).forEach((key) => {
      if (key.startsWith('comp_')) {
        const id = key.replace('comp_', '');
        newComp[id] = data[key];
      } else if (key.startsWith('sev_')) {
        const id = key.replace('sev_', '');
        newSev[id] = data[key];
      } else if (key.startsWith('cmt_')) {
        const id = key.replace('cmt_', '');
        newCmt[id] = data[key];
      } else if (key.startsWith('capa_')) {
        const id = key.replace('capa_', '');
        newCapa[id] = data[key];
      }
    });

    setCompliance(newComp);
    setSeverities(newSev);
    setComments(newCmt);
    setCapa(newCapa);
  };

  // Compile current state data into object matching attached HTML key names
  const getCurrentStateDataObject = () => {
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
      _lastUpdated: Date.now()
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

  // Save state debounced
  const triggerSaveState = () => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    saveTimeoutRef.current = setTimeout(async () => {
      const data = getCurrentStateDataObject();
      // 1. LocalStorage
      localStorage.setItem('fast_iso22000_full_current', JSON.stringify(data));
      localStorage.setItem('fast_iso22000_full_ts', String(data._lastUpdated));

      // 2. Cloud Firestore Sync
      try {
        await setDoc(doc(db, 'fast_iso22k_crm', 'current_session'), data, { merge: true });
      } catch (err) {
        console.warn('[FastIso22k] Cloud save error:', err);
      }
    }, 300);
  };

  // New Client Action (Reset)
  const newClient = () => {
    if (window.confirm("Tạo mới sẽ xóa trắng form hiện tại (hãy chắc chắn bạn đã 'Lưu CRM' nếu cần). Tiếp tục?")) {
      localStorage.removeItem('fast_iso22000_full_current');
      localStorage.removeItem('fast_iso22000_full_ts');
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

      // Reset Cloud Session
      try {
        setDoc(doc(db, 'fast_iso22k_crm', 'current_session'), {
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
          _lastUpdated: Date.now()
        });
      } catch (e) {}
    }
  };

  // Save to CRM Action
  const saveToCRM = async () => {
    const currentData = getCurrentStateDataObject();
    if (!currentData || !currentData.clientName || !currentData.clientName.trim()) {
      alert("Vui lòng điền ít nhất 'Tên Khách Hàng' trước khi lưu vào CRM!");
      return;
    }

    const recordId = `${currentData.clientName.trim()}_${new Date().getTime()}`;
    currentData._progress = `${progressPercentage}%`;
    currentData._savedAt = new Date().toLocaleString('vi-VN');

    const updatedCrm = {
      ...crmRecords,
      [recordId]: currentData
    };

    setCrmRecords(updatedCrm);
    localStorage.setItem('fast_iso22000_full_crm', JSON.stringify(updatedCrm));

    // Sync to Cloud Firestore
    try {
      await setDoc(doc(db, 'fast_iso22k_crm', 'database'), {
        records: updatedCrm,
        _lastUpdated: Date.now()
      }, { merge: true });
    } catch (e) {
      console.warn('[FastIso22k] CRM Cloud sync error:', e);
    }

    alert("Đã lưu thông tin phiên đánh giá vào CRM thành công!");
  };

  // Open CRM Modal
  const openCRM = () => {
    setIsCrmOpen(true);
  };

  // Close CRM Modal
  const closeCRM = () => {
    setIsCrmOpen(false);
  };

  // Load Record from CRM
  const loadRecord = (id: string) => {
    if (window.confirm("Tải dữ liệu này sẽ ghi đè lên form làm việc hiện tại. Tiếp tục?")) {
      const rec = crmRecords[id];
      if (rec) {
        applyStateData(rec);
        localStorage.setItem('fast_iso22000_full_current', JSON.stringify(rec));
        localStorage.setItem('fast_iso22000_full_ts', String(Date.now()));
        try {
          setDoc(doc(db, 'fast_iso22k_crm', 'current_session'), {
            ...rec,
            _lastUpdated: Date.now()
          }, { merge: true });
        } catch (e) {}
        closeCRM();
      }
    }
  };

  // Delete Record from CRM
  const deleteRecord = async (id: string) => {
    if (window.confirm("Bạn có chắc chắn muốn xóa dữ liệu khách hàng này khỏi hệ thống CRM?")) {
      const updated = { ...crmRecords };
      delete updated[id];
      setCrmRecords(updated);
      localStorage.setItem('fast_iso22000_full_crm', JSON.stringify(updated));

      // Sync to Cloud Firestore
      try {
        await setDoc(doc(db, 'fast_iso22k_crm', 'database'), {
          records: updated,
          _lastUpdated: Date.now()
        });
      } catch (e) {}
    }
  };

  // Toggle All Sections Open / Closed
  const toggleAll = (isOpen: boolean) => {
    const detailsList = document.querySelectorAll('.fast-iso22k-wrapper details');
    detailsList.forEach((d) => {
      (d as HTMLDetailsElement).open = isOpen;
    });
  };

  // Xuất Báo Cáo Lỗi & CAPA (NCR & CAPA Report Window Print matching attached HTML)
  const generateReport = () => {
    const data = getCurrentStateDataObject();

    let majorCount = 0;
    let minorCount = 0;
    let obsCount = 0;
    let reportRows = '';

    ISO22K_CHECKLIST_DATA.forEach((section) => {
      section.items.forEach((item) => {
        const severity = data[`sev_${item.id}`];
        const notes = data[`cmt_${item.id}`] || '';
        const itemCapa = data[`capa_${item.id}`] || '';
        const status = data[`comp_${item.id}`] || 'Chưa đánh giá';

        if (severity === 'Major' || severity === 'Minor' || severity === 'Observation') {
          if (severity === 'Major') majorCount++;
          if (severity === 'Minor') minorCount++;
          if (severity === 'Observation') obsCount++;

          const badgeColor = severity === 'Major' ? '#d9534f' : (severity === 'Minor' ? '#f0ad4e' : '#0275d8');

          reportRows += `
            <tr>
                <td style="text-align:center;"><strong>${item.clause}</strong></td>
                <td>${item.text}</td>
                <td style="text-align:center;"><strong>${status}</strong></td>
                <td style="text-align:center; color:${badgeColor}; font-weight:bold;">${severity}</td>
                <td>${notes}</td>
                <td>${itemCapa}</td>
            </tr>
          `;
        }
      });
    });

    if (!reportRows) {
      alert("Hoàn hảo! Không có lỗi nào được phân loại (Major/Minor/Observation) để xuất báo cáo.");
      return;
    }

    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert("Vui lòng cấp quyền mở tab mới để xuất báo cáo!");
      return;
    }

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
          <meta charset="UTF-8">
          <title>Báo Cáo NCR & CAPA - FAST CONSULTING</title>
          <style>
              body { font-family: 'Segoe UI', Arial, sans-serif; padding: 20px; color: #333; line-height: 1.5; }
              h1 { color: #007c76; text-align: center; border-bottom: 2px solid #007c76; padding-bottom: 10px; margin-bottom: 25px; font-size: 20px;}
              .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-bottom: 20px; background: #f4f8f8; padding: 15px; border-radius: 8px; border: 1px solid #ccc; font-size: 14px; }
              .info-grid div { margin-bottom: 5px; }
              .summary { display: flex; justify-content: space-around; margin: 20px 0; padding: 15px; border: 1px solid #ccc; border-radius: 8px; font-size: 15px; font-weight: bold; background: #fff; }
              .badge-major { color: #d9534f; } .badge-minor { color: #f0ad4e; } .badge-obs { color: #0275d8; }
              table { width: 100%; border-collapse: collapse; margin-top: 20px; font-size: 13px; }
              th, td { border: 1px solid #000; padding: 10px; text-align: left; vertical-align: top; }
              th { background-color: #007c76; color: white; text-align: center; }
              @media print { 
                  body { padding: 0; } 
                  .info-grid { background: transparent; border: none; padding: 0; } 
                  table { page-break-inside: auto; }
                  tr { page-break-inside: avoid; page-break-after: auto; }
              }
          </style>
      </head>
      <body>
          <h1>BÁO CÁO KẾT QUẢ ĐÁNH GIÁ VÀ HÀNH ĐỘNG KHẮC PHỤC (NCR & CAPA REPORT)</h1>
          <div class="info-grid">
              <div><strong>Khách hàng:</strong> ${data.clientName || '...........................................'}</div>
              <div><strong>Tên liên hệ:</strong> ${data.contactName || '...........................................'}</div>
              <div><strong>Điện thoại:</strong> ${data.contactPhone || '...........................................'}</div>
              <div><strong>Chuyên gia (Lead Auditor):</strong> ${data.leadAuditor || '...........................................'}</div>
              <div><strong>Loại đánh giá:</strong> ${data.auditType || '...........................................'}</div>
              <div><strong>Ngày đánh giá:</strong> ${data.auditDate || '...........................................'}</div>
              <div><strong>Địa chỉ:</strong> ${data.auditAddress || '...........................................'}</div>
              <div><strong>Phạm vi (Scope):</strong> ${data.fsmsScope || '...........................................'}</div>
              <div><strong>Số Report:</strong> ${data.reportNo || '...........................................'}</div>
          </div>

          <div class="summary">
              <span>Tổng số lỗi phát hiện: ${majorCount + minorCount + obsCount}</span>
              <span class="badge-major">Major: ${majorCount}</span>
              <span class="badge-minor">Minor: ${minorCount}</span>
              <span class="badge-obs">Observation: ${obsCount}</span>
          </div>

          <table>
              <thead>
                  <tr>
                      <th style="width: 10%;">Điều khoản</th>
                      <th style="width: 25%;">Nội dung Yêu cầu</th>
                      <th style="width: 7%;">Kết quả</th>
                      <th style="width: 10%;">Phân loại</th>
                      <th style="width: 24%;">Bằng chứng & Ghi chú</th>
                      <th style="width: 24%;">Hành động khắc phục (CAPA)</th>
                  </tr>
              </thead>
              <tbody>
                  ${reportRows}
              </tbody>
          </table>
          
          <div style="margin-top: 50px; display: flex; justify-content: space-around;">
              <div style="text-align: center;">
                  <strong>Đại diện Khách Hàng</strong><br>
                  <i>(Ký và ghi rõ họ tên)</i><br><br><br><br>
                  <strong>${data.contactName || '.......................................'}</strong>
              </div>
              <div style="text-align: center;">
                  <strong>Chuyên gia đánh giá (Lead Auditor)</strong><br>
                  <i>(Ký và ghi rõ họ tên)</i><br><br><br><br>
                  <strong>${data.leadAuditor || '.......................................'}</strong>
              </div>
          </div>
      </body>
      </html>
    `);
    printWindow.document.close();
    setTimeout(() => {
      printWindow.print();
    }, 500);
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
          overflow: hidden;
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
        <div className="client-section">
          <div className="client-header">
            <h2>Thông Tin Khách Hàng & Chuyên Gia</h2>
            <div className="btn-group">
              <button className="btn-danger" onClick={newClient}>➕ Tạo mới</button>
              <button className="btn-primary" onClick={saveToCRM}>💾 Lưu CRM</button>
              <button className="btn-info" onClick={openCRM}>📊 Dữ liệu CRM</button>
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

        {/* Checklist Sections */}
        <div id="checklistContainer">
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

      {/* CRM Modal */}
      {isCrmOpen && (
        <div id="crmModal" className="modal" onClick={(e) => {
          if (e.target === e.currentTarget) closeCRM();
        }}>
          <div className="modal-content">
            <span className="close" onClick={closeCRM}>&times;</span>
            <h2 style={{ marginBottom: '20px', color: 'var(--primary-dark)', fontWeight: 'bold', fontSize: '20px' }}>
              Thống Kê Khách Hàng (CRM) - ISO 22000
            </h2>
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
                          <td>{rec._progress || '0%'}</td>
                          <td>
                            <button
                              className="btn-outline"
                              style={{ padding: '5px 10px', fontSize: '12px', marginRight: '6px' }}
                              onClick={() => loadRecord(recId)}
                            >
                              Tải
                            </button>
                            <button
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
        </div>
      )}

      {/* Footer */}
      <footer>
        <p className="footer-brand">FAST CONSULTING - Food All Standard & Training</p>
        <p>&copy; Bản quyền của FAST. Tất cả các quyền được bảo lưu.</p>
      </footer>
    </div>
  );
};

export default FastIso22kChecklist;
