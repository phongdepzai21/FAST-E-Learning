import React, { useState, useEffect, useRef, useMemo } from 'react';
import { db } from '../firebase';
import { doc, setDoc, onSnapshot } from 'firebase/firestore';

// Checklist Data Structure for ISO 22000:2018 (FSMS - Hệ Thống Quản Lý An Toàn Thực Phẩm)
export const ISO22K_CHECKLIST_DATA = [
  {
    section: "4. BỐI CẢNH CỦA TỔ CHỨC (CONTEXT OF THE ORGANIZATION)",
    items: [
      { id: "4.1", text: "Tổ chức đã xác định các vấn đề bên ngoài và nội bộ liên quan đến mục đích và ảnh hưởng đến khả năng đạt được kết quả dự kiến của FSMS." },
      { id: "4.2", text: "Xác định các bên quan tâm (Cơ quan quản lý, khách hàng, đối tác, người tiêu dùng) và các yêu cầu liên quan của họ đối với an toàn thực phẩm." },
      { id: "4.3", text: "Xác định phạm vi của hệ thống FSMS (sản phẩm, quá trình, địa điểm sản xuất) được lưu giữ dưới dạng thông tin văn bản." },
      { id: "4.4", text: "Thiết lập, áp dụng, duy trì, cập nhật và cải tiến liên tục hệ thống quản lý an toàn thực phẩm theo các yêu cầu của tiêu chuẩn ISO 22000:2018." }
    ]
  },
  {
    section: "5. SỰ LÃNH ĐẠO (LEADERSHIP & COMMITMENT)",
    items: [
      { id: "5.1", text: "Lãnh đạo cao nhất thể hiện sự cam kết đối với FSMS: đảm bảo nguồn lực, truyền đạt tầm quan trọng của an toàn thực phẩm và hỗ trợ các vai trò liên quan." },
      { id: "5.2.1", text: "Thiết lập, thực hiện và duy trì chính sách an toàn thực phẩm phù hợp với mục đích và bối cảnh của tổ chức, tạo khung cho các mục tiêu ATTP." },
      { id: "5.2.2", text: "Chính sách an toàn thực phẩm được truyền đạt, thấu hiểu và áp dụng ở mọi cấp trong tổ chức; sẵn có cho các bên quan tâm thích hợp." },
      { id: "5.3", text: "Lãnh đạo cao nhất phân công trách nhiệm, quyền hạn và chỉ định Trưởng nhóm an toàn thực phẩm (Food Safety Team Leader)." }
    ]
  },
  {
    section: "6. HOẠCH ĐỊNH (PLANNING FOR THE FSMS)",
    items: [
      { id: "6.1", text: "Hoạch định các hành động giải quyết các rủi ro và cơ hội để đảm bảo FSMS đạt kết quả dự kiến, ngăn ngừa tác động tiêu cực và đạt cải tiến liên tục." },
      { id: "6.2", text: "Thiết lập các mục tiêu an toàn thực phẩm đo lường được tại các phòng ban, chức năng liên quan và lập kế hoạch thực hiện để đạt được mục tiêu." },
      { id: "6.3", text: "Hoạch định các thay đổi đối với FSMS một cách có hệ thống, duy trì tính toàn vẹn của hệ thống khi có sự thay đổi." }
    ]
  },
  {
    section: "7. HỖ TRỢ (SUPPORT - NGUỒN LỰC, NĂNG LỰC & TRUYỀN THÔNG)",
    items: [
      { id: "7.1.1", text: "Xác định và cung cấp đầy đủ nguồn lực cần thiết (nhân lực, cơ sở hạ tầng, môi trường làm việc) để vận hành và cải tiến FSMS." },
      { id: "7.1.5", text: "Kiểm soát các yếu tố và quá trình được cung cấp từ bên ngoài (nhà cung cấp nguyên liệu, dịch vụ thuê ngoài, gia công)." },
      { id: "7.2", text: "Xác định năng lực cần thiết của nhân sự ảnh hưởng đến ATTP; tổ chức đào tạo hoặc các biện pháp nâng cao năng lực và lưu giữ hồ sơ." },
      { id: "7.3", text: "Đảm bảo nhân sự nhận thức được chính sách ATTP, mục tiêu cá nhân, sự đóng góp vào hiệu lực FSMS và hậu quả của việc không tuân thủ." },
      { id: "7.4", text: "Thiết lập cơ chế trao đổi thông tin bên ngoài (nhà cung cấp, khách hàng, cơ quan chức năng) và trao đổi thông tin nội bộ kịp thời." },
      { id: "7.5", text: "Kiểm soát thông tin dạng văn bản (quy trình, hướng dẫn, biểu mẫu hồ sơ): phê duyệt, phân phối, lưu trữ, bảo vệ và kiểm soát thay đổi." }
    ]
  },
  {
    section: "8. VẬN HÀNH (OPERATION - PRPs, OPRP & HACCP PLAN)",
    items: [
      { id: "8.1", text: "Hoạch định, thực hiện và kiểm soát các quá trình cần thiết để đáp ứng yêu cầu an toàn thực phẩm và thực hiện các hành động xác định tại Mục 6." },
      { id: "8.2", text: "Thiết lập, áp dụng và duy trì các chương trình tiên quyết (PRPs) phù hợp với quy mô và bản chất hoạt động (nhà xưởng, vệ sinh, thiết bị, kiểm soát côn trùng)." },
      { id: "8.3", text: "Thiết lập và áp dụng hệ thống truy xuất nguồn gốc có khả năng xác định sản phẩm từ nhà cung cấp trực tiếp đến khách hàng trực tiếp (nguyên tắc 1 bước trước - 1 bước sau)." },
      { id: "8.4", text: "Thiết lập và duy trì quy trình xử lý các tình huống khẩn cấp và sự cố có khả năng ảnh hưởng đến an toàn thực phẩm." },
      { id: "8.5.1", text: "Thu thập thông tin sơ bộ (mô tả nguyên liệu, sản phẩm cuối cùng, mục đích sử dụng) và xây dựng sơ đồ lưu trình được xác nhận thực tế tại hiện trường." },
      { id: "8.5.2", text: "Tiến hành phân tích mối nguy (sinh học, hóa học, vật lý, chất gây dị ứng) và xác định mức độ chấp nhận được đối với từng mối nguy." },
      { id: "8.5.3", text: "Lựa chọn và phân loại các biện pháp kiểm soát thành Chương trình tiên quyết vận hành (OPRP) hoặc Điểm kiểm soát tới hạn (CCP)." },
      { id: "8.5.4", text: "Xây dựng Kế hoạch kiểm soát mối nguy (Hazard Control Plan): thiết lập giới hạn tới hạn/tiêu chí hành động, hệ thống giám sát, hành động khắc phục cho OPRP và CCP." },
      { id: "8.7", text: "Kiểm soát việc theo dõi và đo lường: thiết bị đo lường dùng cho OPRP và CCP được hiệu chuẩn/kiểm định định kỳ và có hồ sơ lưu giữ." },
      { id: "8.8", text: "Kiểm tra xác nhận (Verification) liên quan đến PRPs và Kế hoạch kiểm soát mối nguy được hoạch định và thực hiện bởi người có thẩm quyền." },
      { id: "8.9", text: "Kiểm soát sự không phù hợp: xử lý sản phẩm có khả năng không an toàn, đánh giá để giải phóng lô hàng, thu hồi/rút sản phẩm khỏi thị trường." }
    ]
  },
  {
    section: "9. ĐÁNH GIÁ KẾT QUẢ HOẠT ĐỘNG (PERFORMANCE EVALUATION)",
    items: [
      { id: "9.1", text: "Xác định phương pháp theo dõi, đo lường, phân tích và đánh giá để kiểm chứng mức độ thỏa mãn các yêu cầu của FSMS." },
      { id: "9.2", text: "Tiến hành đánh giá nội bộ theo các khoảng thời gian đã hoạch định; đánh giá viên có tính khách quan và độc lập với công việc được đánh giá." },
      { id: "9.3", text: "Lãnh đạo cao nhất tiến hành xem xét định kỳ hệ thống quản lý an toàn thực phẩm để đảm bảo tính phù hợp, thỏa đáng và hiệu lực liên tục." }
    ]
  },
  {
    section: "10. CẢI TIẾN (IMPROVEMENT & CONTINUAL UPDATING)",
    items: [
      { id: "10.1", text: "Khi có sự không phù hợp, tổ chức tiến hành hành động khắc phục (CAPA): xác định nguyên nhân gốc rễ, thực hiện hành động và đánh giá hiệu lực." },
      { id: "10.2", text: "Cải tiến liên tục tính phù hợp, thỏa đáng và hiệu lực của FSMS thông qua truyền thông, xem xét của lãnh đạo, đánh giá nội bộ và phân tích dữ liệu." },
      { id: "10.3", text: "Lãnh đạo cao nhất đảm bảo FSMS được cập nhật liên tục dựa trên các thay đổi về khoa học kỹ thuật, quy định pháp luật và thông tin phản hồi." }
    ]
  }
];

export const FastIso22kChecklist: React.FC = () => {
  // Client Form State
  const [clientName, setClientName] = useState<string>('');
  const [auditType, setAuditType] = useState<string>('');
  const [auditAddress, setAuditAddress] = useState<string>('');
  const [fsmsScope, setFsmsScope] = useState<string>('');
  const [contactPhone, setContactPhone] = useState<string>('');
  const [auditDate, setAuditDate] = useState<string>('');
  const [reportNo, setReportNo] = useState<string>('');

  // Checklist Item States: key is item.id (e.g. '4.1', '8.5.4')
  const [compliance, setCompliance] = useState<Record<string, string>>({});
  const [severities, setSeverities] = useState<Record<string, string>>({});
  const [comments, setComments] = useState<Record<string, string>>({});

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
      const savedLocal = localStorage.getItem('fast_iso22k_current');
      if (savedLocal) {
        const parsed = JSON.parse(savedLocal);
        applyStateData(parsed);
      }
    } catch (e) {
      console.warn('[FastIso22k] Local load error:', e);
    }

    try {
      const savedCrm = localStorage.getItem('fast_iso22k_crm');
      if (savedCrm) {
        setCrmRecords(JSON.parse(savedCrm));
      }
    } catch (e) {}

    // B. Firestore Real-time Listeners (multi-user / multi-tab cloud sync)
    const unsubSession = onSnapshot(doc(db, 'fast_iso22k_crm', 'current_session'), (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        if (data && data._lastUpdated) {
          const localTimestamp = localStorage.getItem('fast_iso22k_current_ts');
          if (!localTimestamp || Number(data._lastUpdated) > Number(localTimestamp)) {
            applyStateData(data);
            localStorage.setItem('fast_iso22k_current', JSON.stringify(data));
            localStorage.setItem('fast_iso22k_current_ts', String(data._lastUpdated));
          }
        }
      }
    }, (err) => console.warn('[FastIso22k] Session listener error:', err));

    const unsubCrm = onSnapshot(doc(db, 'fast_iso22k_crm', 'database'), (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        if (data && data.records) {
          setCrmRecords(data.records);
          localStorage.setItem('fast_iso22k_crm', JSON.stringify(data.records));
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
      if (key.startsWith('comp_iso_')) {
        const id = key.replace('comp_iso_', '');
        newComp[id] = data[key];
      } else if (key.startsWith('sev_iso_')) {
        const id = key.replace('sev_iso_', '');
        newSev[id] = data[key];
      } else if (key.startsWith('cmt_iso_')) {
        const id = key.replace('cmt_iso_', '');
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
      if (compliance[id]) data[`comp_iso_${id}`] = compliance[id];
    });
    Object.keys(severities).forEach((id) => {
      if (severities[id]) data[`sev_iso_${id}`] = severities[id];
    });
    Object.keys(comments).forEach((id) => {
      if (comments[id]) data[`cmt_iso_${id}`] = comments[id];
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
      localStorage.setItem('fast_iso22k_current', JSON.stringify(data));
      localStorage.setItem('fast_iso22k_current_ts', String(data._lastUpdated));

      // 2. Cloud Firestore Sync
      try {
        await setDoc(doc(db, 'fast_iso22k_crm', 'current_session'), data, { merge: true });
      } catch (err) {
        console.warn('[FastIso22k] Cloud save error:', err);
      }
    }, 400);
  };

  // New Client Action
  const newClient = () => {
    if (window.confirm("Tạo mới sẽ xóa form hiện tại (hãy chắc chắn bạn đã nhấn 'Lưu CRM'). Tiếp tục?")) {
      localStorage.removeItem('fast_iso22k_current');
      localStorage.removeItem('fast_iso22k_current_ts');
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
        setDoc(doc(db, 'fast_iso22k_crm', 'current_session'), {
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
    localStorage.setItem('fast_iso22k_crm', JSON.stringify(updatedCrm));

    // Sync to Cloud Firestore
    try {
      await setDoc(doc(db, 'fast_iso22k_crm', 'database'), {
        records: updatedCrm,
        _lastUpdated: Date.now()
      }, { merge: true });
    } catch (e) {
      console.warn('[FastIso22k] CRM Cloud sync error:', e);
    }

    alert("Đã lưu thông tin khách hàng vào CRM ISO 22000 thành công!");
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
        localStorage.setItem('fast_iso22k_current', JSON.stringify(rec));
        localStorage.setItem('fast_iso22k_current_ts', String(Date.now()));
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
    if (window.confirm("Xóa khách hàng này khỏi CRM?")) {
      const updated = { ...crmRecords };
      delete updated[id];
      setCrmRecords(updated);
      localStorage.setItem('fast_iso22k_crm', JSON.stringify(updated));

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

  // Generate Defect Report Window (Non-Conformity Report for ISO 22000:2018)
  const generateReport = () => {
    const data = getCurrentStateDataObject();

    let majorCount = 0;
    let minorCount = 0;
    let obsCount = 0;
    let reportRows = '';

    ISO22K_CHECKLIST_DATA.forEach((section) => {
      section.items.forEach((item) => {
        const severity = data[`sev_iso_${item.id}`];
        const notes = data[`cmt_iso_${item.id}`] || '';
        const status = data[`comp_iso_${item.id}`] || 'Chưa đánh giá';

        if (severity === 'Major' || severity === 'Minor' || severity === 'Observation') {
          if (severity === 'Major') majorCount++;
          if (severity === 'Minor') minorCount++;
          if (severity === 'Observation') obsCount++;

          const badgeColor = severity === 'Major' ? '#d9534f' : (severity === 'Minor' ? '#f0ad4e' : '#0275d8');

          reportRows += `
            <tr>
                <td style="text-align:center;"><strong>Điều ${item.id}</strong></td>
                <td>${item.text}</td>
                <td style="text-align:center;"><strong>${status}</strong></td>
                <td style="text-align:center; color:${badgeColor}; font-weight:bold;">${severity}</td>
                <td>${notes}</td>
            </tr>
          `;
        }
      });
    });

    if (!reportRows) {
      alert("Không có lỗi nào được phân loại (Major/Minor/Observation) để xuất báo cáo!");
      return;
    }

    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert("Vui lòng cho phép mở cửa sổ popup để xuất báo cáo in!");
      return;
    }

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
          <meta charset="UTF-8">
          <title>Báo Cáo Lỗi Đánh Giá ISO 22000:2018 - FAST CONSULTING</title>
          <style>
              body { font-family: 'Segoe UI', Arial, sans-serif; padding: 20px; color: #333; line-height: 1.5; }
              h1 { color: #007c76; text-align: center; border-bottom: 2px solid #007c76; padding-bottom: 10px; font-size: 20px; }
              .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-bottom: 20px; background: #f4f8f8; padding: 15px; border-radius: 8px; border: 1px solid #ccc; font-size: 14px; }
              .info-grid div { margin-bottom: 5px; }
              .summary { display: flex; justify-content: space-around; margin: 20px 0; padding: 15px; border: 1px solid #ccc; border-radius: 8px; font-size: 15px; font-weight: bold; background: #fff; }
              .badge-major { color: #d9534f; } .badge-minor { color: #f0ad4e; } .badge-obs { color: #0275d8; }
              table { width: 100%; border-collapse: collapse; margin-top: 20px; font-size: 13px; }
              th, td { border: 1px solid #000; padding: 10px; text-align: left; }
              th { background-color: #007c76; color: white; text-align: center; }
              @media print { body { padding: 0; } .info-grid { background: transparent; border: none; padding: 0; } }
          </style>
      </head>
      <body>
          <h1>BÁO CÁO KẾT QUẢ ĐÁNH GIÁ ISO 22000:2018 (NON-CONFORMITY REPORT)</h1>
          <div class="info-grid">
              <div><strong>Khách hàng:</strong> ${data.clientName || '...........................................'}</div>
              <div><strong>Loại đánh giá:</strong> ${data.auditType || '...........................................'}</div>
              <div><strong>Ngày đánh giá:</strong> ${data.auditDate || '...........................................'}</div>
              <div><strong>Địa chỉ:</strong> ${data.auditAddress || '...........................................'}</div>
              <div><strong>Phạm vi FSMS:</strong> ${data.fsmsScope || '...........................................'}</div>
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
                      <th style="width: 8%;">Điều khoản</th>
                      <th style="width: 35%;">Yêu cầu & Hướng dẫn (ISO 22000:2018)</th>
                      <th style="width: 10%;">Đánh giá</th>
                      <th style="width: 15%;">Phân loại</th>
                      <th style="width: 32%;">Bằng chứng & Ghi chú</th>
                  </tr>
              </thead>
              <tbody>
                  ${reportRows}
              </tbody>
          </table>
          
          <div style="margin-top: 50px; display: flex; justify-content: space-around;">
              <div style="text-align: center;">
                  <strong>Đại diện Khách Hàng</strong><br><br><br><br>
                  .......................................
              </div>
              <div style="text-align: center;">
                  <strong>Chuyên gia đánh giá (Lead Auditor)</strong><br><br><br><br>
                  .......................................
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
  }, [searchQuery]);

  return (
    <div className="fast-iso22k-wrapper">
      {/* Scoped CSS matching HACCP checklist exactly */}
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
          grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
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
          min-height: 60px;
          padding: 10px;
          border: 1px solid var(--border-color);
          border-radius: 4px;
          resize: vertical;
          font-family: inherit;
          background-color: #fff;
          color: #333;
        }

        .fast-iso22k-wrapper textarea:focus,
        .fast-iso22k-wrapper .severity-select:focus {
          outline: none;
          border-color: var(--primary);
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

        /* Print CSS */
        @media print {
          body { background: #fff !important; color: #000 !important; font-size: 12pt !important; }
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
          .fast-iso22k-wrapper textarea,
          .fast-iso22k-wrapper .severity-select { border: none !important; border-bottom: 1px dotted #ccc !important; resize: none !important; min-height: auto !important; padding: 2px !important; }
          .fast-iso22k-wrapper .severity-select { -webkit-appearance: none !important; -moz-appearance: none !important; appearance: none !important; }
          .fast-iso22k-wrapper .radio-label input { display: none !important; }
          .fast-iso22k-wrapper .radio-label { flex-direction: row !important; font-size: 14px !important; }
          .fast-iso22k-wrapper .radio-label input:checked + span { font-weight: bold !important; text-decoration: underline !important; }
          .fast-iso22k-wrapper .radio-label input:not(:checked) + span { display: none !important; }
        }
      `}</style>

      {/* Header */}
      <header>
        <div className="header-container">
          <div className="brand-info">
            <h1>FAST CONSULTING</h1>
            <p>Checklist đánh giá ISO 22000:2018 (FSMS)</p>
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
              placeholder="Tìm kiếm tiêu chuẩn, điều khoản, quy trình..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <div className="btn-group">
            <button className="btn-outline" onClick={() => toggleAll(true)}>Mở rộng tất cả</button>
            <button className="btn-outline" onClick={() => toggleAll(false)}>Thu gọn tất cả</button>
            <button className="btn-primary" onClick={() => window.print()}>🖨 In Checklist</button>
            <button className="btn-warning" onClick={generateReport}>📄 Xuất Báo Cáo Lỗi</button>
          </div>
        </div>

        {/* Progress Tracker */}
        <div className="progress-container">
          <div className="progress-header">
            <span>Tiến độ đánh giá ISO 22000:</span>
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
                          Yêu cầu & Hướng dẫn (ISO 22000:2018)<br />
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
                              <strong>Điều {item.id}. </strong>
                              {item.text}
                            </td>
                            <td>
                              <div className="radio-group">
                                {(['Y', 'N', 'NI', 'NA'] as const).map((opt) => (
                                  <label key={opt} className="radio-label">
                                    <input
                                      type="radio"
                                      name={`comp_iso_${item.id}`}
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
                                name={`sev_iso_${item.id}`}
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
                                name={`cmt_iso_${item.id}`}
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
              Thống Kê Khách Hàng ISO 22000 (CRM)
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
    </div>
  );
};

export default FastIso22kChecklist;
