import React, { useState, useEffect, useRef, useMemo } from 'react';
import { db } from '../firebase';
import { doc, setDoc, onSnapshot, getDoc } from 'firebase/firestore';

// Checklist Data Structure from user's exact specification
export const CHECKLIST_DATA = [
  {
    section: "I. THIẾT KẾ CƠ SỞ VẬT CHẤT VÀ THIẾT BỊ (DESIGN OF FACILITIES AND EQUIPMENT)",
    items: [
      { id: "I.1", text: "Cơ sở sản xuất thực phẩm không được đặt ở nơi có mối đe dọa đến an toàn thực phẩm hoặc sự phù hợp mà không thể kiểm soát được bằng các biện pháp hợp lý." },
      { id: "I.2", text: "Nằm cách xa các khu vực ô nhiễm môi trường và hoạt động công nghiệp, khu vực dễ bị ngập lụt, khu vực dễ bị côn trùng và động vật gây hại xâm nhập." },
      { id: "I.3", text: "Thiết kế và bố trí phải cho phép bảo trì và làm sạch đầy đủ, giảm thiểu hoặc ngăn ngừa lây nhiễm chéo thông qua luồng di chuyển của nhân sự và nguyên vật liệu." },
      { id: "I.4", text: "Bề mặt tường, vách ngăn và sàn phải làm bằng vật liệu không thấm nước, dễ làm sạch và khử trùng. Tường và vách ngăn phải nhẵn đến độ cao phù hợp." },
      { id: "I.5", text: "Hệ thống thoát nước và xử lý chất thải phải đầy đủ, được bảo trì tốt, thiết kế để tránh làm ô nhiễm thực phẩm hoặc nguồn cung cấp nước." },
      { id: "I.6", text: "Nhà vệ sinh và khu vực rửa tay phải đầy đủ, thiết kế hợp vệ sinh, lý tưởng nhất là vòi nước không vận hành bằng tay. Không dùng bồn rửa tay để rửa thực phẩm hoặc dụng cụ." }
    ]
  },
  {
    section: "II. ĐÀO TẠO VÀ NĂNG LỰC (TRAINING AND COMPETENCE)",
    items: [
      { id: "II.1", text: "Tất cả nhân sự phải nhận thức được vai trò và trách nhiệm của họ trong việc bảo vệ thực phẩm khỏi ô nhiễm hoặc hư hỏng." },
      { id: "II.2", text: "Chương trình đào tạo phải bao gồm: bản chất các mối nguy, cách thức sản xuất, xử lý và đóng gói, điều kiện bảo quản." },
      { id: "II.3", text: "Hồ sơ đào tạo (Refresher training) phải được duy trì. Các chương trình đào tạo cần được xem xét và cập nhật định kỳ." }
    ]
  },
  {
    section: "III. BẢO TRÌ, LÀM SẠCH VÀ KIỂM SOÁT ĐỘNG VẬT GÂY HẠI (MAINTENANCE, CLEANING AND PEST CONTROL)",
    items: [
      { id: "III.1", text: "Cơ sở và thiết bị phải được bảo trì để tạo điều kiện thuận lợi cho các quy trình làm sạch/khử trùng và ngăn ngừa ô nhiễm." },
      { id: "III.2", text: "Hóa chất làm sạch và khử trùng phải được lưu trữ cẩn thận, tránh xa thực phẩm, đựng trong các vật chứa có nhận dạng rõ ràng để tránh ô nhiễm." },
      { id: "III.3", text: "Các lỗ hổng, cống rãnh và những nơi động vật gây hại dễ xâm nhập phải được che chắn (ví dụ: màn lưới chống côn trùng)." },
      { id: "III.4", text: "Chất thải phải được thu gom, lưu trữ trong các thùng có nắp đậy, chống động vật gây hại và không được để tích tụ tràn lan trong khu vực xử lý thực phẩm." }
    ]
  },
  {
    section: "IV. VỆ SINH CÁ NHÂN (PERSONAL HYGIENE)",
    items: [
      { id: "IV.1", text: "Nhân sự mắc bệnh hoặc nghi ngờ mang mầm bệnh có khả năng lây truyền qua thực phẩm không được vào khu vực xử lý thực phẩm." },
      { id: "IV.2", text: "Các vết xước và vết thương phải được băng kín bằng băng chống thấm nước và nếu cần thiết phải đeo găng tay." },
      { id: "IV.3", text: "Cấm hút thuốc, khạc nhổ, nhai, ăn, uống, hắt hơi hoặc ho trên thực phẩm không được bảo vệ. Không mang trang sức, móng tay giả/lông mi giả vào khu sản xuất." }
    ]
  },
  {
    section: "V. KIỂM SOÁT VẬN HÀNH (CONTROL OF OPERATION)",
    items: [
      { id: "V.1", text: "Lập Lưu đồ quy trình (Flow diagram) thể hiện trình tự và sự tương tác của tất cả các bước trong quá trình vận hành, và phải được xác nhận thực tế tại hiện trường." },
      { id: "V.2", text: "Thực phẩm sống, chưa chế biến phải được tách biệt với thực phẩm ăn liền (bằng vật lý hoặc thời gian), kết hợp làm sạch và khử trùng hiệu quả ở giữa các bước." },
      { id: "V.3", text: "Có hệ thống kiểm soát vật liệu ngoại lai (kính, kim loại, nhựa, xương, gỗ). Sử dụng máy dò kim loại, tia X (nếu cần)." },
      { id: "V.4", text: "Hệ thống quản lý chất gây dị ứng (Allergen management) phải được áp dụng từ khâu tiếp nhận, chế biến đến bảo quản để tránh lây nhiễm chéo." },
      { id: "V.5", text: "Thủ tục thu hồi (Recall procedures): Phải có quy trình thu hồi sản phẩm lỗi, không an toàn khỏi thị trường một cách nhanh chóng và hiệu quả." }
    ]
  },
  {
    section: "VI. CODEX - HACCP (CÁC BƯỚC HACCP)",
    items: [
      { id: "VI.1", text: "Thành lập đội HACCP đa ngành và xác định phạm vi (Bước 1)." },
      { id: "VI.2", text: "Mô tả đầy đủ về sản phẩm (thành phần, aw, pH, đóng gói, thời hạn sử dụng) (Bước 2)." },
      { id: "VI.3", text: "Tiến hành phân tích mối nguy (Hazard Analysis) để xác định các mối nguy đáng kể và biện pháp kiểm soát (Bước 6/Nguyên tắc 1)." },
      { id: "VI.4", text: "Xác định các Điểm kiểm soát tới hạn - CCPs (Bước 7/Nguyên tắc 2). Có thể sử dụng Cây quyết định (Decision tree)." },
      { id: "VI.5", text: "Thiết lập các Giới hạn tới hạn (Critical limits) đã được xác nhận giá trị sử dụng cho mỗi CCP (Bước 8/Nguyên tắc 3)." },
      { id: "VI.6", text: "Thiết lập hệ thống Giám sát (Monitoring system) cho từng CCP (Bước 9/Nguyên tắc 4)." },
      { id: "VI.7", text: "Thiết lập Hành động khắc phục (Corrective actions) bằng văn bản để xử lý khi có sự sai lệch tại CCP (Bước 10/Nguyên tắc 5)." },
      { id: "VI.8", text: "Thẩm định kế hoạch HACCP và quy trình Kiểm tra xác nhận (Verification procedures) (Bước 11/Nguyên tắc 6)." },
      { id: "VI.9", text: "Thiết lập hệ thống tài liệu và lưu trữ hồ sơ HACCP phù hợp (Bước 12/Nguyên tắc 7)." }
    ]
  }
];

export const FastHaccpChecklist: React.FC = () => {
  // Client Form State
  const [clientName, setClientName] = useState<string>('');
  const [auditType, setAuditType] = useState<string>('');
  const [auditAddress, setAuditAddress] = useState<string>('');
  const [fsmsScope, setFsmsScope] = useState<string>('');
  const [contactPhone, setContactPhone] = useState<string>('');
  const [auditDate, setAuditDate] = useState<string>('');
  const [reportNo, setReportNo] = useState<string>('');

  // Checklist Item States: key is item.id (e.g. 'I.1')
  const [compliance, setCompliance] = useState<Record<string, string>>({});
  const [severities, setSeverities] = useState<Record<string, string>>({});
  const [comments, setComments] = useState<Record<string, string>>({});

  // Custom Items imported via Fast Dev
  const [customSections, setCustomSections] = useState<any[]>([]);

  // Search filter
  const [searchQuery, setSearchQuery] = useState<string>('');

  // CRM Modal State
  const [isCrmOpen, setIsCrmOpen] = useState<boolean>(false);
  const [crmRecords, setCrmRecords] = useState<Record<string, any>>({});

  // Report Modal State (Toàn Diện & Không Phù Hợp)
  const [isReportOpen, setIsReportOpen] = useState<boolean>(false);
  const [reportType, setReportType] = useState<'comprehensive' | 'non_conformity'>('comprehensive');

  // Sync state debounce ref
  const saveTimeoutRef = useRef<any>(null);

  // Combine default checklist with any custom items from Fast Dev
  const allSections = useMemo(() => {
    if (customSections.length > 0) {
      return [
        ...CHECKLIST_DATA,
        {
          section: "VII. TIÊU CHUẨN BỔ SUNG TỪ FAST DEV (CUSTOM REQUIREMENTS)",
          items: customSections.map((item, idx) => ({
            id: item.code || `DEV.${idx + 1}`,
            text: item.standard || item.text || ''
          }))
        }
      ];
    }
    return CHECKLIST_DATA;
  }, [customSections]);

  // Total items count
  const totalItemsCount = useMemo(() => {
    return allSections.reduce((acc, sec) => acc + sec.items.length, 0);
  }, [allSections]);

  // Completed items count
  const completedItemsCount = useMemo(() => {
    return Object.keys(compliance).filter(k => compliance[k]).length;
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
      const savedLocal = localStorage.getItem('fast_haccp_current');
      if (savedLocal) {
        const parsed = JSON.parse(savedLocal);
        applyStateData(parsed);
      }
    } catch (e) {
      console.warn('[FastHaccp] Local load error:', e);
    }

    try {
      const savedCrm = localStorage.getItem('fast_haccp_crm');
      if (savedCrm) {
        setCrmRecords(JSON.parse(savedCrm));
      }
    } catch (e) {}

    // B. Check custom items from Fast Dev
    try {
      const rawCustom = localStorage.getItem('FAST_HACCP_CUSTOM_ITEMS_V1');
      if (rawCustom) {
        const parsedCustom = JSON.parse(rawCustom);
        if (Array.isArray(parsedCustom) && parsedCustom.length > 0) {
          setCustomSections(parsedCustom);
        }
      }
    } catch {}

    // C. Listen to Fast Dev updates
    const handleFastDevUpdate = (e: any) => {
      const items = e?.detail?.items;
      if (Array.isArray(items)) {
        setCustomSections(items);
      }
    };
    window.addEventListener('haccp_items_updated', handleFastDevUpdate);

    // D. Firestore Real-time Listeners (for multi-user / multi-tab cloud sync)
    const unsubSession = onSnapshot(doc(db, 'fast_haccp_crm', 'current_session'), (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        if (data && data._lastUpdated) {
          // If remote update is newer than local, merge
          const localTimestamp = localStorage.getItem('fast_haccp_current_ts');
          if (!localTimestamp || Number(data._lastUpdated) > Number(localTimestamp)) {
            applyStateData(data);
            localStorage.setItem('fast_haccp_current', JSON.stringify(data));
            localStorage.setItem('fast_haccp_current_ts', String(data._lastUpdated));
          }
        }
      }
    }, (err) => console.warn('[FastHaccp] Session listener error:', err));

    const unsubCrm = onSnapshot(doc(db, 'fast_haccp_crm', 'database'), (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        if (data && data.records) {
          setCrmRecords(data.records);
          localStorage.setItem('fast_haccp_crm', JSON.stringify(data.records));
        }
      }
    }, (err) => console.warn('[FastHaccp] CRM listener error:', err));

    return () => {
      window.removeEventListener('haccp_items_updated', handleFastDevUpdate);
      unsubSession();
      unsubCrm();
    };
  }, []);

  // Helper to apply state data object into React state
  const applyStateData = (data: Record<string, any>) => {
    if (!data) return;
    if (data.clientName !== undefined) setClientName(data.clientName || '');
    if (data.auditType !== undefined) setAuditType(data.auditType || '');
    if (data.auditAddress !== undefined) setAuditAddress(data.auditAddress || '');
    if (data.fsmsScope !== undefined) setFsmsScope(data.fsmsScope || '');
    if (data.contactPhone !== undefined) setContactPhone(data.contactPhone || '');
    if (data.auditDate !== undefined) setAuditDate(data.auditDate || '');
    if (data.reportNo !== undefined) setReportNo(data.reportNo || '');

    const newComp: Record<string, string> = {};
    const newSev: Record<string, string> = {};
    const newCmt: Record<string, string> = {};

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
      }
    });

    setCompliance(newComp);
    setSeverities(newSev);
    setComments(newCmt);
  };

  // Compile current state data into object
  const getCurrentStateDataObject = () => {
    const data: Record<string, any> = {
      clientName,
      auditType,
      auditAddress,
      fsmsScope,
      contactPhone,
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
      localStorage.setItem('fast_haccp_current', JSON.stringify(data));
      localStorage.setItem('fast_haccp_current_ts', String(data._lastUpdated));

      // 2. Cloud Firestore Sync
      try {
        await setDoc(doc(db, 'fast_haccp_crm', 'current_session'), data, { merge: true });
      } catch (err) {
        console.warn('[FastHaccp] Cloud save error:', err);
      }
    }, 400);
  };

  // New Client Action
  const newClient = () => {
    if (window.confirm("Tạo mới sẽ xóa form hiện tại (hãy chắc chắn bạn đã nhấn 'Lưu CRM'). Tiếp tục?")) {
      localStorage.removeItem('fast_haccp_current');
      localStorage.removeItem('fast_haccp_current_ts');
      setClientName('');
      setAuditType('');
      setAuditAddress('');
      setFsmsScope('');
      setContactPhone('');
      setAuditDate('');
      setReportNo('');
      setCompliance({});
      setSeverities({});
      setComments({});

      // Reset Cloud Session
      try {
        setDoc(doc(db, 'fast_haccp_crm', 'current_session'), {
          clientName: '',
          auditType: '',
          auditAddress: '',
          fsmsScope: '',
          contactPhone: '',
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
      alert("Vui lòng điền 'Tên Khách Hàng' trước khi lưu CRM!");
      return;
    }

    const recordId = `${currentData.clientName.trim()}_${currentData.auditDate || 'nodate'}`;
    currentData._progress = `${progressPercentage}%`;

    const updatedCrm = {
      ...crmRecords,
      [recordId]: currentData
    };

    setCrmRecords(updatedCrm);
    localStorage.setItem('fast_haccp_crm', JSON.stringify(updatedCrm));

    // Sync to Cloud Firestore
    try {
      await setDoc(doc(db, 'fast_haccp_crm', 'database'), {
        records: updatedCrm,
        _lastUpdated: Date.now()
      }, { merge: true });
    } catch (e) {
      console.warn('[FastHaccp] CRM Cloud sync error:', e);
    }

    alert("Đã lưu thông tin khách hàng vào CRM thành công!");
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
    if (window.confirm("Tải dữ liệu này sẽ ghi đè lên form hiện tại. Tiếp tục?")) {
      const rec = crmRecords[id];
      if (rec) {
        applyStateData(rec);
        localStorage.setItem('fast_haccp_current', JSON.stringify(rec));
        localStorage.setItem('fast_haccp_current_ts', String(Date.now()));
        try {
          setDoc(doc(db, 'fast_haccp_crm', 'current_session'), {
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
    if (window.confirm("Xóa khách hàng này khỏi CRM?")) {
      const updated = { ...crmRecords };
      delete updated[id];
      setCrmRecords(updated);
      localStorage.setItem('fast_haccp_crm', JSON.stringify(updated));

      // Sync to Cloud Firestore
      try {
        await setDoc(doc(db, 'fast_haccp_crm', 'database'), {
          records: updated,
          _lastUpdated: Date.now()
        });
      } catch (e) {}
    }
  };

  // Toggle All Sections Open / Closed
  const toggleAll = (isOpen: boolean) => {
    const detailsList = document.querySelectorAll('.fast-haccp-wrapper details');
    detailsList.forEach((d) => {
      (d as HTMLDetailsElement).open = isOpen;
    });
  };

  // Computed statistics for Comprehensive & Non-Conformity reports
  const reportStats = useMemo(() => {
    let compliantCount = 0;
    let nonCompliantCount = 0;
    let naCount = 0;
    let unassessedCount = 0;
    let majorCount = 0;
    let minorCount = 0;
    let obsCount = 0;

    const defectItems: any[] = [];
    const allDetailedItems: any[] = [];

    allSections.forEach(section => {
      section.items.forEach(item => {
        const comp = compliance[item.id] || '';
        const sev = severities[item.id] || '';
        const cmt = comments[item.id] || '';

        if (comp === 'Đạt') compliantCount++;
        else if (comp === 'Không đạt') nonCompliantCount++;
        else if (comp === 'N/A') naCount++;
        else unassessedCount++;

        if (sev === 'Major') majorCount++;
        if (sev === 'Minor') minorCount++;
        if (sev === 'Observation') obsCount++;

        const isDefect = sev === 'Major' || sev === 'Minor' || sev === 'Observation' || comp === 'Không đạt';
        const itemObj = {
          sectionTitle: section.section,
          id: item.id,
          text: item.text,
          status: comp || 'Chưa đánh giá',
          severity: sev || '—',
          notes: cmt
        };

        allDetailedItems.push(itemObj);
        if (isDefect) {
          defectItems.push(itemObj);
        }
      });
    });

    const evaluatedTotal = compliantCount + nonCompliantCount + naCount;
    const rate = evaluatedTotal > 0 ? Math.round((compliantCount / evaluatedTotal) * 100) : 0;

    return {
      compliantCount,
      nonCompliantCount,
      naCount,
      unassessedCount,
      majorCount,
      minorCount,
      obsCount,
      totalDefects: majorCount + minorCount + obsCount,
      rate,
      defectItems,
      allDetailedItems
    };
  }, [allSections, compliance, severities, comments]);

  // Open In-App Report Modal
  const openReportModal = (type: 'comprehensive' | 'non_conformity') => {
    setReportType(type);
    setIsReportOpen(true);
  };

  // Close Report Modal
  const closeReportModal = () => {
    setIsReportOpen(false);
  };

  // Print Report Handler
  const handlePrintReport = () => {
    document.body.classList.add('haccp-report-printing');
    window.print();
    setTimeout(() => {
      document.body.classList.remove('haccp-report-printing');
    }, 1200);
  };

  // Download Standalone HTML Report
  const handleDownloadHtml = () => {
    const isComp = reportType === 'comprehensive';
    const items = isComp ? reportStats.allDetailedItems : reportStats.defectItems;

    let rowsHtml = '';
    items.forEach(item => {
      const sevColor = item.severity === 'Major' ? '#d9534f' : (item.severity === 'Minor' ? '#f0ad4e' : (item.severity === 'Observation' ? '#0275d8' : '#777'));
      const statusColor = item.status === 'Đạt' ? '#2e7d32' : (item.status === 'Không đạt' ? '#d32f2f' : '#666');
      rowsHtml += `
        <tr>
          <td style="text-align:center; font-weight:bold;">${item.id}</td>
          <td>${item.text}</td>
          <td style="text-align:center; font-weight:bold; color:${statusColor};">${item.status}</td>
          <td style="text-align:center; font-weight:bold; color:${sevColor};">${item.severity}</td>
          <td>${item.notes || '—'}</td>
        </tr>
      `;
    });

    const fullHtml = `<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8">
  <title>${isComp ? 'Báo Cáo Toàn Diện HACCP Codex 2022' : 'Báo Cáo Điểm Không Phù Hợp (NC & CAPA)'} - ${clientName || 'FAST CONSULTING'}</title>
  <style>
    body { font-family: 'Segoe UI', Arial, sans-serif; padding: 30px; color: #222; line-height: 1.5; background: #fff; }
    h1 { color: #007c76; text-align: center; border-bottom: 2px solid #007c76; padding-bottom: 12px; font-size: 22px; text-transform: uppercase; margin-bottom: 20px; }
    .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 20px; background: #f8fbfa; padding: 16px; border-radius: 8px; border: 1px solid #d9e5e4; font-size: 13px; }
    .kpis { display: flex; justify-content: space-around; gap: 10px; margin: 20px 0; padding: 14px; background: #eef6f5; border: 1px solid #b2d7d4; border-radius: 8px; font-weight: bold; font-size: 13px; text-align: center; }
    .kpis div span { display: block; font-size: 18px; color: #007c76; margin-top: 4px; }
    table { width: 100%; border-collapse: collapse; margin-top: 20px; font-size: 12px; }
    th, td { border: 1px solid #999; padding: 8px 10px; text-align: left; }
    th { background: #007c76; color: #fff; text-align: center; }
    .signatures { margin-top: 50px; display: flex; justify-content: space-around; text-align: center; font-size: 13px; }
    .sig-box { width: 40%; }
    @media print { body { padding: 0; } }
  </style>
</head>
<body>
  <h1>${isComp ? 'BÁO CÁO KẾT QUẢ ĐÁNH GIÁ TOÀN DIỆN (CODEX 2022)' : 'BÁO CÁO ĐIỂM KHÔNG PHÙ HỢP (NON-CONFORMITY REPORT)'}</h1>
  <div class="grid">
    <div><strong>Khách hàng / Doanh nghiệp:</strong> ${clientName || '...........................................'}</div>
    <div><strong>Loại đánh giá:</strong> ${auditType || '...........................................'}</div>
    <div><strong>Ngày đánh giá:</strong> ${auditDate || '...........................................'}</div>
    <div><strong>Số Report:</strong> ${reportNo || '...........................................'}</div>
    <div><strong>Địa chỉ:</strong> ${auditAddress || '...........................................'}</div>
    <div><strong>Phạm vi hệ thống:</strong> ${fsmsScope || '...........................................'}</div>
  </div>

  <div class="kpis">
    <div>TỔNG TIÊU CHUẨN<span>${totalItemsCount}</span></div>
    <div>TỶ LỆ TUÂN THỦ<span>${reportStats.rate}%</span></div>
    <div>ĐẠT<span>${reportStats.compliantCount}</span></div>
    <div>KHÔNG ĐẠT<span>${reportStats.nonCompliantCount}</span></div>
    <div>MAJOR<span>${reportStats.majorCount}</span></div>
    <div>MINOR<span>${reportStats.minorCount}</span></div>
    <div>OBSERVATION<span>${reportStats.obsCount}</span></div>
  </div>

  <table>
    <thead>
      <tr>
        <th style="width: 8%;">Mã</th>
        <th style="width: 40%;">Tiêu chuẩn Codex 2022</th>
        <th style="width: 12%;">Đánh giá</th>
        <th style="width: 12%;">Mức độ</th>
        <th style="width: 28%;">Bằng chứng & Ghi chú</th>
      </tr>
    </thead>
    <tbody>
      ${rowsHtml || '<tr><td colspan="5" style="text-align:center; padding: 20px;">Không có điểm không phù hợp nào. 100% tuân thủ tiêu chuẩn.</td></tr>'}
    </tbody>
  </table>

  <div class="signatures">
    <div class="sig-box">
      <strong>ĐẠI DIỆN KHÁCH HÀNG</strong><br>
      <em>(Ký, ghi rõ họ tên & đóng dấu)</em><br><br><br><br><br>
      .........................................................
    </div>
    <div class="sig-box">
      <strong>TRƯỞNG ĐOÀN ĐÁNH GIÁ (LEAD AUDITOR)</strong><br>
      <em>(Ký và ghi rõ họ tên)</em><br><br><br><br><br>
      .........................................................
    </div>
  </div>
</body>
</html>`;

    const blob = new Blob([fullHtml], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Bao_Cao_HACCP_${(clientName || 'FAST').replace(/\s+/g, '_')}_${reportType}.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Export to Excel / CSV
  const handleExportExcel = () => {
    const isComp = reportType === 'comprehensive';
    const items = isComp ? reportStats.allDetailedItems : reportStats.defectItems;

    let csv = '\uFEFF';
    csv += `"BÁO CÁO ĐÁNH GIÁ HACCP CODEX 2022 - ${isComp ? 'TOÀN DIỆN' : 'ĐIỂM KHÔNG PHÙ HỢP'}"\n`;
    csv += `"Khách hàng:","${(clientName || '').replace(/"/g, '""')}","Loại đánh giá:","${(auditType || '').replace(/"/g, '""')}"\n`;
    csv += `"Ngày đánh giá:","${auditDate || ''}","Số Report:","${(reportNo || '').replace(/"/g, '""')}"\n`;
    csv += `"Địa chỉ:","${(auditAddress || '').replace(/"/g, '""')}","Phạm vi:","${(fsmsScope || '').replace(/"/g, '""')}"\n\n`;
    csv += `"Mã điều khoản","Nội dung tiêu chuẩn","Kết quả","Phân loại lỗi","Bằng chứng / Ghi chú"\n`;

    items.forEach(item => {
      const cleanText = (item.text || '').replace(/"/g, '""');
      const cleanNotes = (item.notes || '').replace(/"/g, '""');
      csv += `"${item.id}","${cleanText}","${item.status}","${item.severity}","${cleanNotes}"\n`;
    });

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Bao_Cao_HACCP_${(clientName || 'FAST').replace(/\s+/g, '_')}_${reportType}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };


  // Filtered Checklist Sections
  const filteredSections = useMemo(() => {
    if (!searchQuery.trim()) {
      return allSections.map(sec => ({ ...sec, visible: true, matchedItemIds: new Set(sec.items.map(it => it.id)) }));
    }
    const q = searchQuery.toLowerCase().trim();
    return allSections.map(sec => {
      const matched = new Set<string>();
      sec.items.forEach(it => {
        if (it.id.toLowerCase().includes(q) || it.text.toLowerCase().includes(q)) {
          matched.add(it.id);
        }
      });
      return {
        ...sec,
        visible: matched.size > 0,
        matchedItemIds: matched
      };
    });
  }, [allSections, searchQuery]);

  return (
    <div className="fast-haccp-wrapper">
      {/* Scoped CSS matching user's exact specification */}
      <style>{`
        .fast-haccp-wrapper {
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

        .fast-haccp-wrapper * {
          box-sizing: border-box;
        }

        /* Header */
        .fast-haccp-wrapper header {
          background-color: var(--primary);
          color: var(--white);
          padding: 20px;
          box-shadow: var(--shadow);
          position: sticky;
          top: 0;
          z-index: 50;
        }

        .fast-haccp-wrapper .header-container {
          max-width: 1200px;
          margin: 0 auto;
          display: flex;
          justify-content: space-between;
          align-items: center;
          flex-wrap: wrap;
          gap: 15px;
        }

        .fast-haccp-wrapper .brand-info h1 {
          font-size: 24px;
          margin-bottom: 5px;
          font-weight: bold;
          color: #ffffff;
        }

        .fast-haccp-wrapper .brand-info p {
          font-size: 14px;
          opacity: 0.9;
          font-weight: 500;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          color: #ffffff;
        }

        .fast-haccp-wrapper .hotline {
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

        .fast-haccp-wrapper .hotline:hover {
          background-color: #c9302c;
        }

        /* Container & Action Bar */
        .fast-haccp-wrapper .container {
          max-width: 1200px;
          margin: 30px auto;
          padding: 0 20px;
        }

        .fast-haccp-wrapper .action-bar {
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

        .fast-haccp-wrapper .search-box {
          flex: 1;
          min-width: 250px;
        }

        .fast-haccp-wrapper .search-box input {
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

        .fast-haccp-wrapper .search-box input:focus {
          border-color: var(--primary);
          box-shadow: 0 0 0 2px var(--primary-light);
        }

        .fast-haccp-wrapper .btn-group {
          display: flex;
          gap: 10px;
          flex-wrap: wrap;
        }

        .fast-haccp-wrapper button {
          padding: 10px 15px;
          border: none;
          border-radius: var(--radius);
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
        }

        .fast-haccp-wrapper .btn-primary {
          background: var(--primary);
          color: var(--white);
        }

        .fast-haccp-wrapper .btn-primary:hover {
          background: var(--primary-dark);
        }

        .fast-haccp-wrapper .btn-outline {
          background: var(--white);
          color: var(--primary);
          border: 1px solid var(--primary);
        }

        .fast-haccp-wrapper .btn-outline:hover {
          background: var(--primary-light);
        }

        .fast-haccp-wrapper .btn-danger {
          background: var(--accent-red);
          color: var(--white);
        }

        .fast-haccp-wrapper .btn-danger:hover {
          background: #c9302c;
        }

        .fast-haccp-wrapper .btn-info {
          background: var(--accent-blue);
          color: var(--white);
        }

        .fast-haccp-wrapper .btn-info:hover {
          background: #025aa5;
        }

        .fast-haccp-wrapper .btn-warning {
          background: var(--accent-orange);
          color: var(--white);
        }

        .fast-haccp-wrapper .btn-warning:hover {
          background: #ec971f;
        }

        /* Progress Tracker */
        .fast-haccp-wrapper .progress-container {
          background: var(--white);
          padding: 20px;
          border-radius: var(--radius);
          box-shadow: var(--shadow);
          margin-bottom: 25px;
        }

        .fast-haccp-wrapper .progress-header {
          display: flex;
          justify-content: space-between;
          margin-bottom: 10px;
          font-weight: bold;
        }

        .fast-haccp-wrapper .progress-bar-bg {
          background: var(--border-color);
          height: 12px;
          border-radius: 10px;
          overflow: hidden;
        }

        .fast-haccp-wrapper .progress-bar-fill {
          background: var(--accent-green);
          height: 100%;
          transition: width 0.4s ease;
        }

        /* Audit Info Form */
        .fast-haccp-wrapper .client-section {
          background: var(--white);
          padding: 20px;
          border-radius: var(--radius);
          box-shadow: var(--shadow);
          margin-bottom: 25px;
        }

        .fast-haccp-wrapper .client-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 15px;
          flex-wrap: wrap;
          gap: 10px;
        }

        .fast-haccp-wrapper .client-header h2 {
          font-size: 18px;
          color: var(--primary-dark);
          font-weight: bold;
        }

        .fast-haccp-wrapper .audit-info {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
          gap: 15px;
        }

        .fast-haccp-wrapper .form-group {
          display: flex;
          flex-direction: column;
          gap: 5px;
        }

        .fast-haccp-wrapper .form-group label {
          font-weight: 600;
          font-size: 14px;
          color: var(--text-main);
        }

        .fast-haccp-wrapper .form-group input,
        .fast-haccp-wrapper .form-group select {
          width: 100%;
          padding: 10px;
          border: 1px solid var(--border-color);
          border-radius: 4px;
          font-family: inherit;
          background-color: #fff;
          color: #333;
        }

        .fast-haccp-wrapper .form-group select:focus,
        .fast-haccp-wrapper .form-group input:focus {
          outline: none;
          border-color: var(--primary);
        }

        /* Checklist Sections */
        .fast-haccp-wrapper details {
          background: var(--white);
          margin-bottom: 15px;
          border-radius: var(--radius);
          box-shadow: var(--shadow);
          overflow: hidden;
        }

        .fast-haccp-wrapper summary {
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

        .fast-haccp-wrapper summary::-webkit-details-marker {
          display: none;
        }

        .fast-haccp-wrapper summary::before {
          content: '▶';
          display: inline-block;
          margin-right: 10px;
          transition: transform 0.3s;
          font-size: 12px;
        }

        .fast-haccp-wrapper details[open] summary::before {
          transform: rotate(90deg);
        }

        .fast-haccp-wrapper .table-responsive {
          overflow-x: auto;
          -webkit-overflow-scrolling: touch;
        }

        .fast-haccp-wrapper table {
          width: 100%;
          border-collapse: collapse;
          min-width: 800px;
        }

        .fast-haccp-wrapper th,
        .fast-haccp-wrapper td {
          padding: 12px 15px;
          border: 1px solid var(--border-color);
          text-align: left;
          vertical-align: top;
        }

        .fast-haccp-wrapper th {
          background: var(--bg-color);
          font-weight: bold;
          text-align: center;
        }

        .fast-haccp-wrapper .col-req { width: 45%; }
        .fast-haccp-wrapper .col-comp { width: 20%; text-align: center; }
        .fast-haccp-wrapper .col-ev { width: 35%; }

        .fast-haccp-wrapper .radio-group {
          display: flex;
          justify-content: center;
          gap: 15px;
        }

        .fast-haccp-wrapper .radio-label {
          display: flex;
          flex-direction: column;
          align-items: center;
          cursor: pointer;
          font-size: 13px;
          font-weight: 600;
        }

        .fast-haccp-wrapper .radio-label input {
          width: 18px;
          height: 18px;
          margin-bottom: 4px;
          cursor: pointer;
          accent-color: var(--primary);
        }

        .fast-haccp-wrapper .severity-select {
          width: 100%;
          padding: 8px;
          margin-bottom: 8px;
          border: 1px solid var(--border-color);
          border-radius: 4px;
          font-family: inherit;
          background-color: #fff;
          color: #333;
        }

        .fast-haccp-wrapper textarea {
          width: 100%;
          min-height: 60px;
          padding: 10px;
          border: 1px solid var(--border-color);
          border-radius: 4px;
          resize: vertical;
          font-family: inherit;
          background-color: #fff;
          color: #333;
        }

        .fast-haccp-wrapper textarea:focus,
        .fast-haccp-wrapper .severity-select:focus {
          outline: none;
          border-color: var(--primary);
        }

        /* CRM Modal */
        .fast-haccp-wrapper .modal {
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

        .fast-haccp-wrapper .modal-content {
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

        .fast-haccp-wrapper .close {
          color: #aaa;
          float: right;
          font-size: 28px;
          font-weight: bold;
          cursor: pointer;
        }

        .fast-haccp-wrapper .close:hover {
          color: black;
        }

        .fast-haccp-wrapper .crm-table th,
        .fast-haccp-wrapper .crm-table td {
          text-align: center;
        }

        /* Print CSS */
        @media print {
          body { background: #fff !important; color: #000 !important; font-size: 12pt !important; }
          .fast-haccp-wrapper header,
          .fast-haccp-wrapper .action-bar,
          .fast-haccp-wrapper .progress-container,
          .fast-haccp-wrapper .client-header .btn-group {
            display: none !important;
          }
          .fast-haccp-wrapper .container { margin: 0 !important; padding: 0 !important; max-width: 100% !important; }
          .fast-haccp-wrapper .client-section,
          .fast-haccp-wrapper details { box-shadow: none !important; border: none !important; margin-bottom: 10px !important; }
          .fast-haccp-wrapper details[open] summary { border-bottom: 2px solid #000 !important; background: #eee !important; -webkit-print-color-adjust: exact !important; color: #000 !important; }
          .fast-haccp-wrapper summary::before { display: none !important; }
          .fast-haccp-wrapper table { page-break-inside: avoid !important; border: 1px solid #000 !important; margin-bottom: 15px !important; }
          .fast-haccp-wrapper th,
          .fast-haccp-wrapper td { border: 1px solid #000 !important; }
          .fast-haccp-wrapper th { background: #f0f0f0 !important; -webkit-print-color-adjust: exact !important; }
          .fast-haccp-wrapper textarea,
          .fast-haccp-wrapper .severity-select { border: none !important; border-bottom: 1px dotted #ccc !important; resize: none !important; min-height: auto !important; padding: 2px !important; }
          .fast-haccp-wrapper .severity-select { -webkit-appearance: none !important; -moz-appearance: none !important; appearance: none !important; }
          .fast-haccp-wrapper .radio-label input { display: none !important; }
          .fast-haccp-wrapper .radio-label { flex-direction: row !important; font-size: 14px !important; }
          .fast-haccp-wrapper .radio-label input:checked + span { font-weight: bold !important; text-decoration: underline !important; }
          .fast-haccp-wrapper .radio-label input:not(:checked) + span { display: none !important; }

          /* Dedicated in-modal print styles */
          body.haccp-report-printing * {
            visibility: hidden !important;
          }
          body.haccp-report-printing #haccpReportPrintArea,
          body.haccp-report-printing #haccpReportPrintArea * {
            visibility: visible !important;
          }
          body.haccp-report-printing #haccpReportPrintArea {
            position: fixed !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            margin: 0 !important;
            padding: 20px !important;
            background: #fff !important;
            color: #000 !important;
            z-index: 9999999 !important;
          }
        }
      `}</style>

      {/* Header */}
      <header>
        <div className="header-container">
          <div className="brand-info">
            <h1>FAST CONSULTING</h1>
            <p>Checklist đánh giá HACCP CODEX 2022</p>
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
              placeholder="Tìm kiếm tiêu chuẩn, quy trình, từ khóa..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <div className="btn-group">
            <button className="btn-outline" onClick={() => toggleAll(true)}>Mở rộng tất cả</button>
            <button className="btn-outline" onClick={() => toggleAll(false)}>Thu gọn tất cả</button>
            <button className="btn-primary" onClick={() => openReportModal('comprehensive')}>📑 Xuất Báo Cáo Toàn Diện</button>
            <button className="btn-warning" onClick={() => openReportModal('non_conformity')}>⚠️ Báo Cáo Không Phù Hợp</button>
            <button className="btn-outline" onClick={() => window.print()}>🖨 In Checklist</button>
          </div>
        </div>

        {/* Progress Tracker */}
        <div className="progress-container">
          <div className="progress-header">
            <span>Tiến độ đánh giá:</span>
            <span id="progressText">
              Đã hoàn thành: {completedItemsCount} / {totalItemsCount} mục ({progressPercentage}%)
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
            <h2>Thông Tin Khách Hàng</h2>
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
              <label htmlFor="fsmsScope">Phạm vi FSMS (Audit Scope):</label>
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
              <label htmlFor="reportNo">Report (Số báo cáo):</label>
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

        {/* Checklist Container */}
        <div id="checklistContainer">
          {filteredSections.map((section, sIndex) => {
            if (!section.visible) return null;
            return (
              <details key={sIndex} open className="checklist-section">
                <summary>{section.section}</summary>
                <div className="table-responsive">
                  <table data-section={sIndex}>
                    <thead>
                      <tr>
                        <th className="col-req">
                          Yêu cầu & Hướng dẫn<br />
                          <small>(Requirements & Guidelines)</small>
                        </th>
                        <th className="col-comp">
                          Tuân thủ<br />
                          <small>(Y / N / NI / N/A)</small>
                        </th>
                        <th className="col-ev">
                          Phân loại & Ghi chú<br />
                          <small>(Severity & Comments)</small>
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {section.items.map((item: any) => {
                        if (section.matchedItemIds && !section.matchedItemIds.has(item.id)) {
                          return null;
                        }
                        const currentComp = compliance[item.id] || '';
                        const currentSev = severities[item.id] || '';
                        const currentCmt = comments[item.id] || '';

                        return (
                          <tr key={item.id} className="check-item" data-id={item.id} data-text={item.text}>
                            <td className="req-text">
                              <strong>{item.id}. </strong>
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
                                        setCompliance(prev => ({ ...prev, [item.id]: opt }));
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
                                  setSeverities(prev => ({ ...prev, [item.id]: e.target.value }));
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
                                placeholder="Nhập bằng chứng / ghi chú..."
                                value={currentCmt}
                                onChange={(e) => {
                                  setComments(prev => ({ ...prev, [item.id]: e.target.value }));
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
          if ((e.target as HTMLElement).id === 'crmModal') {
            closeCRM();
          }
        }}>
          <div className="modal-content">
            <span className="close" onClick={closeCRM}>&times;</span>
            <h2 style={{ marginBottom: '20px', color: 'var(--primary-dark)', fontWeight: 'bold' }}>
              Thống Kê Khách Hàng (CRM)
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
                      <td colSpan={5}>Chưa có dữ liệu khách hàng nào.</td>
                    </tr>
                  ) : (
                    Object.keys(crmRecords).map((id) => {
                      const record = crmRecords[id];
                      return (
                        <tr key={id}>
                          <td>{record.auditDate || 'N/A'}</td>
                          <td><strong>{record.clientName}</strong></td>
                          <td>{record.auditType || 'N/A'}</td>
                          <td>{record._progress || '0%'}</td>
                          <td>
                            <div style={{ display: 'flex', gap: '5px', justifyContent: 'center' }}>
                              <button
                                className="btn-outline"
                                style={{ padding: '5px 10px', fontSize: '12px' }}
                                onClick={() => loadRecord(id)}
                              >
                                Tải
                              </button>
                              <button
                                className="btn-danger"
                                style={{ padding: '5px 10px', fontSize: '12px' }}
                                onClick={() => deleteRecord(id)}
                              >
                                Xóa
                              </button>
                            </div>
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

      {/* Comprehensive & Non-Conformity Report In-App Modal */}
      {isReportOpen && (
        <div id="reportModal" className="modal" onClick={(e) => {
          if ((e.target as HTMLElement).id === 'reportModal') {
            closeReportModal();
          }
        }}>
          <div className="modal-content" style={{ maxWidth: '1050px', padding: '24px' }}>
            {/* Top Toolbar (Excluded from print) */}
            <div className="no-print" style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: '12px', borderBottom: '1px solid #ddd', paddingBottom: '16px', marginBottom: '20px' }}>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  type="button"
                  onClick={() => setReportType('comprehensive')}
                  style={{
                    padding: '8px 16px',
                    borderRadius: '6px',
                    border: '1px solid #007c76',
                    background: reportType === 'comprehensive' ? '#007c76' : '#fff',
                    color: reportType === 'comprehensive' ? '#fff' : '#007c76',
                    fontWeight: 'bold',
                    fontSize: '13px',
                    cursor: 'pointer'
                  }}
                >
                  📑 Báo Cáo Toàn Diện (Codex 2022)
                </button>
                <button
                  type="button"
                  onClick={() => setReportType('non_conformity')}
                  style={{
                    padding: '8px 16px',
                    borderRadius: '6px',
                    border: '1px solid #f0ad4e',
                    background: reportType === 'non_conformity' ? '#f0ad4e' : '#fff',
                    color: reportType === 'non_conformity' ? '#fff' : '#8a6d3b',
                    fontWeight: 'bold',
                    fontSize: '13px',
                    cursor: 'pointer'
                  }}
                >
                  ⚠️ Báo Cáo Điểm Không Phù Hợp ({reportStats.totalDefects})
                </button>
              </div>

              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <button
                  type="button"
                  onClick={handlePrintReport}
                  style={{
                    padding: '8px 14px',
                    borderRadius: '6px',
                    background: '#0275d8',
                    color: '#fff',
                    border: 'none',
                    fontWeight: 'bold',
                    fontSize: '13px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px'
                  }}
                >
                  🖨️ In / Xuất PDF
                </button>
                <button
                  type="button"
                  onClick={handleDownloadHtml}
                  style={{
                    padding: '8px 14px',
                    borderRadius: '6px',
                    background: '#5cb85c',
                    color: '#fff',
                    border: 'none',
                    fontWeight: 'bold',
                    fontSize: '13px',
                    cursor: 'pointer'
                  }}
                >
                  📥 Tải File HTML
                </button>
                <button
                  type="button"
                  onClick={handleExportExcel}
                  style={{
                    padding: '8px 14px',
                    borderRadius: '6px',
                    background: '#2e7d32',
                    color: '#fff',
                    border: 'none',
                    fontWeight: 'bold',
                    fontSize: '13px',
                    cursor: 'pointer'
                  }}
                >
                  📊 Xuất Excel (CSV)
                </button>
                <button
                  type="button"
                  onClick={closeReportModal}
                  style={{
                    padding: '8px 14px',
                    borderRadius: '6px',
                    background: '#eee',
                    color: '#333',
                    border: '1px solid #ccc',
                    fontWeight: 'bold',
                    fontSize: '13px',
                    cursor: 'pointer'
                  }}
                >
                  ✕ Đóng
                </button>
              </div>
            </div>

            {/* Printable Area */}
            <div id="haccpReportPrintArea">
              <div style={{ textAlign: 'center', borderBottom: '2px solid #007c76', paddingBottom: '12px', marginBottom: '20px' }}>
                <div style={{ color: '#007c76', fontSize: '14px', fontWeight: 'bold', letterSpacing: '2px' }}>FAST CONSULTING QUALITY MANAGEMENT</div>
                <h1 style={{ color: '#005a56', fontSize: '22px', margin: '8px 0', textTransform: 'uppercase' }}>
                  {reportType === 'comprehensive'
                    ? 'BÁO CÁO KẾT QUẢ ĐÁNH GIÁ HACCP TOÀN DIỆN (CODEX 2022)'
                    : 'BÁO CÁO ĐIỂM KHÔNG PHÙ HỢP & HÀNH ĐỘNG KHẮC PHỤC (NC & CAPA)'}
                </h1>
                <div style={{ fontSize: '12px', color: '#666' }}>
                  Tiêu chuẩn: CXC 1-1969 (Rev. 2022) • General Principles of Food Hygiene
                </div>
              </div>

              {/* Audit Header Info Grid */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '12px',
                background: '#f4f8f8',
                padding: '16px',
                borderRadius: '8px',
                border: '1px solid #d2dedd',
                fontSize: '13px',
                marginBottom: '20px'
              }}>
                <div><strong>Khách Hàng / Cơ Sở:</strong> {clientName || '...................................................'}</div>
                <div><strong>Loại hình đánh giá:</strong> {auditType || 'Đánh giá định kỳ'}</div>
                <div><strong>Ngày đánh giá:</strong> {auditDate || 'Chưa chọn'}</div>
                <div><strong>Mã số báo cáo (Report No):</strong> {reportNo || 'HACCP-2026-001'}</div>
                <div><strong>Địa chỉ cơ sở:</strong> {auditAddress || '...................................................'}</div>
                <div><strong>Phạm vi FSMS:</strong> {fsmsScope || 'Sản xuất & kinh doanh thực phẩm'}</div>
                <div><strong>Điện thoại liên hệ:</strong> {contactPhone || '...................................................'}</div>
                <div><strong>Trưởng đoàn đánh giá:</strong> FAST Lead Auditor</div>
              </div>

              {/* Summary Metrics Bar */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(110px, 1fr))',
                gap: '10px',
                background: '#fff',
                padding: '14px',
                borderRadius: '8px',
                border: '1px solid #ccc',
                textAlign: 'center',
                marginBottom: '20px',
                fontSize: '12px',
                fontWeight: 'bold'
              }}>
                <div style={{ borderRight: '1px solid #eee' }}>
                  <div style={{ color: '#666', fontSize: '11px' }}>TỔNG MỤC</div>
                  <div style={{ fontSize: '18px', color: '#007c76' }}>{totalItemsCount}</div>
                </div>
                <div style={{ borderRight: '1px solid #eee' }}>
                  <div style={{ color: '#666', fontSize: '11px' }}>TỶ LỆ TUÂN THỦ</div>
                  <div style={{ fontSize: '18px', color: '#2e7d32' }}>{reportStats.rate}%</div>
                </div>
                <div style={{ borderRight: '1px solid #eee' }}>
                  <div style={{ color: '#666', fontSize: '11px' }}>ĐẠT (PASS)</div>
                  <div style={{ fontSize: '18px', color: '#5cb85c' }}>{reportStats.compliantCount}</div>
                </div>
                <div style={{ borderRight: '1px solid #eee' }}>
                  <div style={{ color: '#666', fontSize: '11px' }}>KHÔNG ĐẠT</div>
                  <div style={{ fontSize: '18px', color: '#d9534f' }}>{reportStats.nonCompliantCount}</div>
                </div>
                <div style={{ borderRight: '1px solid #eee' }}>
                  <div style={{ color: '#666', fontSize: '11px' }}>LỖI MAJOR</div>
                  <div style={{ fontSize: '18px', color: '#d9534f' }}>{reportStats.majorCount}</div>
                </div>
                <div style={{ borderRight: '1px solid #eee' }}>
                  <div style={{ color: '#666', fontSize: '11px' }}>LỖI MINOR</div>
                  <div style={{ fontSize: '18px', color: '#f0ad4e' }}>{reportStats.minorCount}</div>
                </div>
                <div>
                  <div style={{ color: '#666', fontSize: '11px' }}>OBSERVATION</div>
                  <div style={{ fontSize: '18px', color: '#0275d8' }}>{reportStats.obsCount}</div>
                </div>
              </div>

              {/* View 1: Comprehensive Report */}
              {reportType === 'comprehensive' && (
                <div>
                  <h3 style={{ fontSize: '15px', color: '#007c76', fontWeight: 'bold', marginBottom: '10px' }}>
                    Chi Tiết Đánh Giá Toàn Diện (30 Điều Khoản Codex 2022)
                  </h3>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                    <thead>
                      <tr style={{ background: '#007c76', color: '#fff' }}>
                        <th style={{ width: '8%', padding: '8px', border: '1px solid #005a56', textAlign: 'center' }}>Mã</th>
                        <th style={{ width: '42%', padding: '8px', border: '1px solid #005a56' }}>Yêu cầu & Nội dung tiêu chuẩn Codex 2022</th>
                        <th style={{ width: '14%', padding: '8px', border: '1px solid #005a56', textAlign: 'center' }}>Đánh giá</th>
                        <th style={{ width: '12%', padding: '8px', border: '1px solid #005a56', textAlign: 'center' }}>Phân loại</th>
                        <th style={{ width: '24%', padding: '8px', border: '1px solid #005a56' }}>Bằng chứng / Ghi chú</th>
                      </tr>
                    </thead>
                    <tbody>
                      {reportStats.allDetailedItems.map((item, idx) => {
                        const sevColor = item.severity === 'Major' ? '#d9534f' : (item.severity === 'Minor' ? '#f0ad4e' : (item.severity === 'Observation' ? '#0275d8' : '#666'));
                        const compColor = item.status === 'Đạt' ? '#2e7d32' : (item.status === 'Không đạt' ? '#d32f2f' : '#555');
                        return (
                          <tr key={idx} style={{ background: idx % 2 === 0 ? '#fff' : '#fcfcfc' }}>
                            <td style={{ padding: '8px', border: '1px solid #ddd', textAlign: 'center', fontWeight: 'bold' }}>{item.id}</td>
                            <td style={{ padding: '8px', border: '1px solid #ddd' }}>{item.text}</td>
                            <td style={{ padding: '8px', border: '1px solid #ddd', textAlign: 'center', fontWeight: 'bold', color: compColor }}>{item.status}</td>
                            <td style={{ padding: '8px', border: '1px solid #ddd', textAlign: 'center', fontWeight: 'bold', color: sevColor }}>{item.severity}</td>
                            <td style={{ padding: '8px', border: '1px solid #ddd', color: '#444' }}>{item.notes || '—'}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}

              {/* View 2: Non-Conformity & CAPA Report */}
              {reportType === 'non_conformity' && (
                <div>
                  <h3 style={{ fontSize: '15px', color: '#d9534f', fontWeight: 'bold', marginBottom: '10px' }}>
                    Danh Sách Điểm Không Phù Hợp & Kế Hoạch Khắc Phục (CAPA)
                  </h3>

                  {reportStats.defectItems.length === 0 ? (
                    <div style={{
                      padding: '30px',
                      background: '#e8f5e9',
                      border: '2px solid #81c784',
                      borderRadius: '8px',
                      textAlign: 'center',
                      color: '#2e7d32',
                      margin: '20px 0'
                    }}>
                      <div style={{ fontSize: '32px', marginBottom: '8px' }}>🎉</div>
                      <div style={{ fontSize: '16px', fontWeight: 'bold' }}>100% TUÂN THỦ TIÊU CHUẨN (ZERO NON-CONFORMITY)</div>
                      <p style={{ fontSize: '13px', marginTop: '6px', color: '#388e3c' }}>
                        Cơ sở không phát hiện bất kỳ điểm không phù hợp (Major / Minor) nào trong kỳ đánh giá. Hệ thống quản lý an toàn thực phẩm vận hành hoàn toàn đạt chuẩn Codex 2022.
                      </p>
                    </div>
                  ) : (
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                      <thead>
                        <tr style={{ background: '#d9534f', color: '#fff' }}>
                          <th style={{ width: '8%', padding: '8px', border: '1px solid #b52b27', textAlign: 'center' }}>Mã</th>
                          <th style={{ width: '30%', padding: '8px', border: '1px solid #b52b27' }}>Yêu cầu tiêu chuẩn</th>
                          <th style={{ width: '12%', padding: '8px', border: '1px solid #b52b27', textAlign: 'center' }}>Phân loại</th>
                          <th style={{ width: '25%', padding: '8px', border: '1px solid #b52b27' }}>Hiện trạng / Bằng chứng lỗi</th>
                          <th style={{ width: '25%', padding: '8px', border: '1px solid #b52b27' }}>Biện pháp khắc phục (CAPA) & Hạn chót</th>
                        </tr>
                      </thead>
                      <tbody>
                        {reportStats.defectItems.map((item, idx) => {
                          const badgeColor = item.severity === 'Major' ? '#d9534f' : (item.severity === 'Minor' ? '#f0ad4e' : '#0275d8');
                          return (
                            <tr key={idx}>
                              <td style={{ padding: '8px', border: '1px solid #ddd', textAlign: 'center', fontWeight: 'bold' }}>{item.id}</td>
                              <td style={{ padding: '8px', border: '1px solid #ddd' }}>{item.text}</td>
                              <td style={{ padding: '8px', border: '1px solid #ddd', textAlign: 'center', fontWeight: 'bold', color: badgeColor }}>{item.severity}</td>
                              <td style={{ padding: '8px', border: '1px solid #ddd', color: '#d32f2f' }}>{item.notes || 'Không đáp ứng đầy đủ yêu cầu hiện trường'}</td>
                              <td style={{ padding: '8px', border: '1px solid #ddd', color: '#333' }}>
                                <div>• Khắc phục triệt để lỗi cơ sở</div>
                                <div>• Hạn chót: <strong>15 ngày làm việc</strong></div>
                                <div>• Trách nhiệm: Ban ATTP cơ sở</div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  )}
                </div>
              )}

              {/* Signatures & Approvals */}
              <div style={{ marginTop: '50px', display: 'flex', justifyContent: 'space-around', textAlign: 'center', fontSize: '13px' }}>
                <div style={{ width: '40%' }}>
                  <strong>ĐẠI DIỆN CƠ SỞ / KHÁCH HÀNG</strong><br />
                  <span style={{ fontSize: '11px', color: '#666' }}>(Ký, ghi rõ họ tên và đóng dấu)</span><br /><br /><br /><br /><br />
                  ...............................................................
                </div>
                <div style={{ width: '40%' }}>
                  <strong>TRƯỞNG ĐOÀN ĐÁNH GIÁ (LEAD AUDITOR)</strong><br />
                  <span style={{ fontSize: '11px', color: '#666' }}>(Ký và ghi rõ họ tên)</span><br /><br /><br /><br /><br />
                  ...............................................................
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FastHaccpChecklist;
