import React, { useState, useEffect } from 'react';
import { ExternalLink, Phone, ChevronDown, ChevronUp, Clock, Share2, Printer, Search, Clipboard, FileText, Database, Plus, Trash2, Edit } from 'lucide-react';

interface ChecklistDoc {
  id: string;
  stt: string;
  name: string;
  guidance: string;
  legalRef?: string;
  badgeCount: string;
  badgeType: 'original' | 'copy';
  statusText: string;
  details: string;
}

const CHECKLIST_DOCS: ChecklistDoc[] = [
  {
    id: 'doc-1',
    stt: '01',
    name: 'Đơn đề nghị cấp Giấy chứng nhận cơ sở đủ điều kiện ATTP',
    guidance: 'Theo Mẫu số 01 Phụ lục I ban hành kèm theo Nghị định số 155/2018/NĐ-CP của Chính phủ.',
    legalRef: 'Biểu mẫu chuẩn: Mẫu số 01 - NĐ 155/2018/NĐ-CP',
    badgeCount: '01 Bản chính',
    badgeType: 'original',
    statusText: 'Bắt buộc',
    details: 'FAST hỗ trợ khách hàng kê khai đầy đủ thông tin loại hình kinh doanh (quán ăn, bếp ăn tập thể, căn tin...), địa chỉ thực tế và quy mô phục vụ.'
  },
  {
    id: 'doc-2',
    stt: '02',
    name: 'Giấy chứng nhận đăng ký kinh doanh / Giấy chứng nhận đăng ký doanh nghiệp',
    guidance: 'Bản sao Giấy phép ĐKKD hoặc Giấy phép thành lập có đăng ký ngành nghề kinh doanh dịch vụ ăn uống hoặc chế biến thực phẩm phù hợp.',
    badgeCount: '01 Bản sao',
    badgeType: 'copy',
    statusText: 'Bắt buộc',
    details: 'Địa chỉ kinh doanh trên giấy phép phải trùng khớp chính xác 100% với địa chỉ thực tế nơi đặt cơ sở chế biến, bếp nấu.'
  },
  {
    id: 'doc-3',
    stt: '03',
    name: 'Bản thuyết minh về cơ sở vật chất, trang thiết bị, dụng cụ bảo đảm điều kiện ATTP',
    guidance: 'Bao gồm: Bản vẽ sơ đồ thiết kế mặt bằng cơ sở theo nguyên tắc 1 chiều; Bản mô tả quy trình chế biến, bảo quản; Bản kê khai trang thiết bị, dụng cụ chuyên dùng.',
    badgeCount: '01 Bản chính',
    badgeType: 'original',
    statusText: 'Bắt buộc',
    details: 'FAST khảo sát trực tiếp mặt bằng, tư vấn ngăn chia khu vực sạch - bẩn, hướng dẫn trang bị bồn rửa tay, thùng rác đạp chân, lưới chống côn trùng.'
  },
  {
    id: 'doc-4',
    stt: '04',
    name: 'Giấy xác nhận đủ sức khỏe của chủ cơ sở và người trực tiếp sản xuất, kinh doanh',
    guidance: 'Giấy khám sức khỏe theo Thông tư Bộ Y tế cấp bởi cơ sở y tế tuyến Quận/Huyện trở lên (hoặc phòng khám đa khoa đủ điều kiện khám sức khỏe thẻ xanh/sổ hồng).',
    badgeCount: '01 Bản sao / bản gốc',
    badgeType: 'copy',
    statusText: 'Bắt buộc',
    details: 'Cần đầy đủ cho toàn bộ nhân viên tham gia chế biến, phụ bếp, chia suất. Kết quả khám không mắc các bệnh truyền nhiễm đường ruột (tả, lỵ, thương hàn, viêm gan A, E...).'
  },
  {
    id: 'doc-5',
    stt: '05',
    name: 'Danh sách người sản xuất, kinh doanh đã được tập huấn kiến thức an toàn thực phẩm',
    guidance: 'Danh sách trích ngang các nhân sự đã hoàn thành khóa đào tạo, kiểm tra kiến thức về an toàn vệ sinh thực phẩm có ký tên và xác nhận của chủ cơ sở.',
    badgeCount: '01 Bản chính',
    badgeType: 'original',
    statusText: 'Bắt buộc',
    details: 'FAST hỗ trợ tổ chức bộ tài liệu câu hỏi ôn tập, hướng dẫn chủ cơ sở tổ chức kiểm tra và lập bảng danh sách hợp thức hóa đúng chuẩn Sở ATTP.'
  }
];

const getTodayDateString = () => {
  const today = new Date();
  const y = today.getFullYear();
  const m = String(today.getMonth() + 1).padStart(2, '0');
  const d = String(today.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

export const FastFoodSafetyManagement: React.FC = () => {
  const [db, setDb] = useState<any[]>([]);
  const [currentCustomerId, setCurrentCustomerId] = useState<string>('');
  
  // Fields for currently active profile
  const [fastStaff, setFastStaff] = useState<string>('');
  const [custName, setCustName] = useState<string>('');
  const [custContact, setCustContact] = useState<string>('');
  const [custPhone, setCustPhone] = useState<string>('');
  const [custLocation, setCustLocation] = useState<string>('');
  const [custOrderDate, setCustOrderDate] = useState<string>(getTodayDateString());
  const [custStatus, setCustStatus] = useState<string>('Đang chuẩn bị hồ sơ');
  const [custSubmitDate, setCustSubmitDate] = useState<string>('');
  const [custTargetDate, setCustTargetDate] = useState<string>('');
  const [custInspectDate, setCustInspectDate] = useState<string>('');
  const [custCertDate, setCustCertDate] = useState<string>('');
  const [custCertNumber, setCustCertNumber] = useState<string>('');
  const [custExpireDate, setCustExpireDate] = useState<string>('');
  const [checklist, setChecklist] = useState<Record<string, boolean>>({});

  // Toolbars & search
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [filterPendingOnly, setFilterPendingOnly] = useState<boolean>(false);
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    'sec-checklist': true,
    'sec-process': true,
    'sec-methods': false,
    'sec-technical': false,
    'sec-legal': false
  });
  const [syncStatus, setSyncStatus] = useState<string>('Tự động đồng bộ');

  // Load database and initial profile state
  useEffect(() => {
    const savedActive = localStorage.getItem('FAST_ATTP_1013855_ACTIVE_CUSTOMER_V2');
    if (savedActive) {
      try {
        const data = JSON.parse(savedActive);
        setCurrentCustomerId(data.id || '');
        setFastStaff(data.fastStaff || '');
        setCustName(data.name || '');
        setCustContact(data.contact || '');
        setCustPhone(data.phone || '');
        setCustLocation(data.location || '');
        setCustOrderDate(data.orderDate || getTodayDateString());
        setCustStatus(data.status || 'Đang chuẩn bị hồ sơ');
        setCustSubmitDate(data.submitDate || '');
        setCustTargetDate(data.targetDate || '');
        setCustInspectDate(data.inspectDate || '');
        setCustCertDate(data.certDate || '');
        setCustCertNumber(data.certNumber || '');
        setCustExpireDate(data.expireDate || '');
        setChecklist(data.checklist || {});
      } catch (e) {
        resetForm();
      }
    } else {
      resetForm();
    }

    const savedDb = localStorage.getItem('FAST_ATTP_1013855_CRM_DATABASE_V2');
    if (savedDb) {
      try {
        setDb(JSON.parse(savedDb));
      } catch (e) {
        setDb([]);
      }
    }
  }, []);

  const resetForm = () => {
    setCurrentCustomerId('cust_' + Date.now());
    setFastStaff('');
    setCustName('');
    setCustContact('');
    setCustPhone('');
    setCustLocation('');
    setCustOrderDate(getTodayDateString());
    setCustStatus('Đang chuẩn bị hồ sơ');
    setCustSubmitDate('');
    setCustTargetDate('');
    setCustInspectDate('');
    setCustCertDate('');
    setCustCertNumber('');
    setCustExpireDate('');
    setChecklist({});
  };

  // Sync active profile state automatically to localStorage
  useEffect(() => {
    if (!custName && !fastStaff && !custContact && !custPhone && !custLocation) return;
    const activeData = {
      id: currentCustomerId || ('cust_' + Date.now()),
      fastStaff,
      name: custName,
      contact: custContact,
      phone: custPhone,
      location: custLocation,
      orderDate: custOrderDate,
      status: custStatus,
      submitDate: custSubmitDate,
      targetDate: custTargetDate,
      inspectDate: custInspectDate,
      certDate: custCertDate,
      certNumber: custCertNumber,
      expireDate: custExpireDate,
      checklist
    };
    localStorage.setItem('FAST_ATTP_1013855_ACTIVE_CUSTOMER_V2', JSON.stringify(activeData));
    setSyncStatus('Đã lưu nháp');
  }, [
    currentCustomerId,
    fastStaff,
    custName,
    custContact,
    custPhone,
    custLocation,
    custOrderDate,
    custStatus,
    custSubmitDate,
    custTargetDate,
    custInspectDate,
    custCertDate,
    custCertNumber,
    custExpireDate,
    checklist
  ]);

  // Date and Business Day Logic
  const calculateBusinessDays = (startDateStr: string, numBusinessDays = 20) => {
    if (!startDateStr) return '';
    const parts = startDateStr.split('-');
    if (parts.length !== 3) return '';
    
    let date = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
    let added = 0;
    
    while (added < numBusinessDays) {
      date.setDate(date.getDate() + 1);
      const day = date.getDay();
      if (day !== 0 && day !== 6) {
        added++;
      }
    }

    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  };

  const calculateCalendarDays = (startDateStr: string, numDays = 20) => {
    if (!startDateStr) return '';
    const parts = startDateStr.split('-');
    if (parts.length !== 3) return '';
    
    let date = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
    date.setDate(date.getDate() + numDays);

    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  };

  const handleFastSubmitDateChange = (date: string, mode: 'business' | 'calendar' = 'business') => {
    setCustSubmitDate(date);
    if (date) {
      const deadline = mode === 'business' ? calculateBusinessDays(date, 20) : calculateCalendarDays(date, 20);
      setCustTargetDate(deadline);
      if (custStatus === 'Đang chuẩn bị hồ sơ') {
        setCustStatus('Đã nộp Sở - Chờ thẩm định');
      }
    }
  };

  const handleCertDateChange = (date: string) => {
    setCustCertDate(date);
    if (date) {
      const parts = date.split('-');
      if (parts.length === 3) {
        let expDate = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
        expDate.setFullYear(expDate.getFullYear() + 3);
        const y = expDate.getFullYear();
        const m = String(expDate.getMonth() + 1).padStart(2, '0');
        const d = String(expDate.getDate()).padStart(2, '0');
        setCustExpireDate(`${y}-${m}-${d}`);
        setCustStatus('Đã cấp Giấy chứng nhận ATTP');
      }
    }
  };

  // Checklist Actions
  const handleDocCheck = (id: string, checked: boolean) => {
    const updatedChecklist = { ...checklist, [id]: checked };
    setChecklist(updatedChecklist);

    // Save update inside CRM DB also if matching customer exists
    if (currentCustomerId) {
      const updatedDb = db.map(c => {
        if (c.id === currentCustomerId) {
          const count = Object.values(updatedChecklist).filter(Boolean).length;
          return {
            ...c,
            completedCount: count,
            rate: Math.round((count / 5) * 100),
            checklist: updatedChecklist,
            updatedAt: new Date().toLocaleString('vi-VN')
          };
        }
        return c;
      });
      setDb(updatedDb);
      localStorage.setItem('FAST_ATTP_1013855_CRM_DATABASE_V2', JSON.stringify(updatedDb));
    }
  };

  const handleSaveActiveCustomer = () => {
    if (!custName) {
      alert('Vui lòng nhập Tên Khách Hàng / Cơ Sở trước khi lưu vào bảng CRM.');
      return;
    }

    const checkedCount = Object.values(checklist).filter(Boolean).length;
    const customerRecord = {
      id: currentCustomerId || ('cust_' + Date.now()),
      fastStaff: fastStaff || 'Chưa phân công',
      name: custName,
      contact: custContact || 'Chưa có',
      phone: custPhone || 'Chưa có',
      location: custLocation || 'Chưa cung cấp',
      orderDate: custOrderDate,
      status: custStatus,
      submitDate: custSubmitDate,
      targetDate: custTargetDate,
      inspectDate: custInspectDate,
      certDate: custCertDate,
      certNumber: custCertNumber || 'Chưa cấp',
      expireDate: custExpireDate,
      completedCount: checkedCount,
      totalDocs: 5,
      rate: Math.round((checkedCount / 5) * 100),
      checklist,
      updatedAt: new Date().toLocaleString('vi-VN')
    };

    let updatedDb = [...db];
    const existingIndex = updatedDb.findIndex(c => c.id === customerRecord.id);
    if (existingIndex >= 0) {
      updatedDb[existingIndex] = customerRecord;
    } else {
      updatedDb.unshift(customerRecord);
    }

    setDb(updatedDb);
    localStorage.setItem('FAST_ATTP_1013855_CRM_DATABASE_V2', JSON.stringify(updatedDb));
    setSyncStatus('Đã lưu CRM ✓');
    alert(`Đã lưu thành công hồ sơ toàn trình "${custName}" vào Cơ sở dữ liệu FAST CRM.`);
  };

  const handleCreateNewCustomer = () => {
    if (window.confirm('Tạo hồ sơ khách hàng mới? Form nhập và checklist sẽ được làm mới hoàn toàn.')) {
      resetForm();
      setSyncStatus('Đã tạo mới');
    }
  };

  const handleLoadCustomerToActive = (id: string) => {
    const found = db.find(c => c.id === id);
    if (!found) return;

    setCurrentCustomerId(found.id);
    setFastStaff(found.fastStaff || '');
    setCustName(found.name || '');
    setCustContact(found.contact || '');
    setCustPhone(found.phone || '');
    setCustLocation(found.location || '');
    setCustOrderDate(found.orderDate || '');
    setCustStatus(found.status || 'Đang chuẩn bị hồ sơ');
    setCustSubmitDate(found.submitDate || '');
    setCustTargetDate(found.targetDate || '');
    setCustInspectDate(found.inspectDate || '');
    setCustCertDate(found.certDate || '');
    setCustCertNumber(found.certNumber !== 'Chưa cấp' ? found.certNumber || '' : '');
    setCustExpireDate(found.expireDate || '');
    setChecklist(found.checklist || {});

    setSyncStatus('Đang xem: ' + found.name);
    const formEl = document.querySelector('.customer-profile-card');
    if (formEl) formEl.scrollIntoView({ behavior: 'smooth' });
  };

  const handleDeleteCustomerRecord = (id: string) => {
    const target = db.find(c => c.id === id);
    const name = target ? target.name : 'này';

    if (window.confirm(`Bạn có chắc chắn muốn xóa hồ sơ "${name}" khỏi cơ sở dữ liệu CRM?`)) {
      const newDb = db.filter(c => c.id !== id);
      setDb(newDb);
      localStorage.setItem('FAST_ATTP_1013855_CRM_DATABASE_V2', JSON.stringify(newDb));
      if (currentCustomerId === id) {
        resetForm();
      }
    }
  };

  // Export functions
  const handleExportToExcel = () => {
    if (db.length === 0) {
      alert('Chưa có dữ liệu khách hàng nào trong FAST CRM để xuất file Excel.');
      return;
    }

    let csv = '\uFEFF'; // UTF-8 BOM
    csv += 'STT,Nhân Viên,Tên Khách Hàng,Người Liên Hệ,Số Điện Thoại,Địa Điểm Cơ Sở,Ngày Order,Checklist hs,Tỷ Lệ %,Trạng Thái hs,Ngày Nộp,Hạn Thủ Tục (20N),Ngày Thẩm Định,Ngày GCN,Số GCN,Ngày Hết Hạn (+3 năm),Thời Gian Cập Nhật\n';

    db.forEach((c, idx) => {
      const esc = (val: string) => `"${(val || '').toString().replace(/"/g, '""')}"`;
      const progress = `"${c.completedCount || 0}/5"`;
      const rate = `"${c.rate || 0}%"`;

      csv += `${idx + 1},${esc(c.fastStaff)},${esc(c.name)},${esc(c.contact)},${esc(c.phone)},${esc(c.location)},${esc(c.orderDate)},${progress},${rate},${esc(c.status)},${esc(c.submitDate)},${esc(c.targetDate)},${esc(c.inspectDate)},${esc(c.certDate)},${esc(c.certNumber)},${esc(c.expireDate)},${esc(c.updatedAt)}\n`;
    });

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `FAST_CRM_ATTP_1013855_${Date.now()}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleExportBackupJSON = () => {
    const blob = new Blob([JSON.stringify(db, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `FAST_Backup_CRM_ATTP_${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleExportClientChecklistPDF = () => {
    const originalTitle = document.title;
    const safeName = custName ? custName.replace(/[^a-zA-Z0-9\u00C0-\u1EF9]/g, '_') : 'KhachHang';
    document.title = 'FAST_Danh_Muc_Ho_So_ATTP_' + safeName;
    document.body.classList.add('print-client-checklist-only');
    
    setOpenSections(prev => ({ ...prev, 'sec-checklist': true }));

    window.print();

    setTimeout(() => {
      document.body.classList.remove('print-client-checklist-only');
      document.title = originalTitle;
    }, 1000);
  };

  const handleCopyClientMessage = () => {
    const greeting = custName ? `KÍNH GỬI: ${custName.toUpperCase()}` : 'KÍNH GỬI QUÝ KHÁCH HÀNG';
    const contactLine = custContact ? `\n- Người liên hệ: ${custContact}` : '';
    const phoneLine = custPhone ? `\n- Số điện thoại: ${custPhone}` : '';
    const locLine = custLocation ? `\n- Địa điểm cơ sở: ${custLocation}` : '';
    const staffLine = fastStaff ? `\n- Chuyên viên FAST phụ trách: ${fastStaff}` : '';

    const text = `${greeting}${contactLine}${phoneLine}${locLine}
--------------------------------------------------
FAST CONSULTING trân trọng gửi Quý khách Danh mục hồ sơ pháp lý cần chuẩn bị để tiến hành thủ tục "Cấp Giấy chứng nhận cơ sở đủ điều kiện An toàn thực phẩm" (Mã TTHC: 1.013855 - Sở An toàn thực phẩm TP.HCM):

1. ĐƠN ĐỀ NGHỊ CẤP GIẤY CHỨNG NHẬN CƠ SỞ ĐỦ ĐIỀU KIỆN ATTP
   • Số lượng: 01 bản chính (Ký tên, đóng dấu).
   • Mẫu chuẩn: Mẫu số 01 Phụ lục I - Nghị định 155/2018/NĐ-CP (FAST hỗ trợ soạn thảo).

2. GIẤY CHỨNG NHẬN ĐĂNG KÝ KINH DOANH / ĐĂNG KÝ DOANH NGHIỆP
   • Số lượng: 01 bản sao (Công chứng hoặc đóng mộc treo cơ sở).
   • Yêu cầu: Ngành nghề kinh doanh dịch vụ ăn uống/chế biến thực phẩm phù hợp; địa chỉ trùng khớp địa điểm thực tế.

3. BẢN THUYẾT MINH CƠ SỞ VẬT CHẤT, TRANG THIẾT BỊ, DỤNG CỤ
   • Số lượng: 01 bản chính.
   • Yêu cầu: Sơ đồ mặt bằng bếp 1 chiều, bản mô tả quy trình chế biến, bản kê khai thiết bị (FAST trực tiếp khảo sát và vẽ sơ đồ).

4. GIẤY XÁC NHẬN ĐỦ SỰC KHỎE CỦA CHỦ CƠ SỞ & NGƯỜI CHẾ BIẾN
   • Số lượng: 01 bản sao / gốc (Còn hiệu lực trong vòng 12 tháng).
   • Yêu cầu: Khám tại cơ sở y tế tuyến Quận/Huyện trở lên theo đúng chuẩn Bộ Y tế.

5. DANH SÁCH NHÂN SỰ ĐÃ TẬP HUẤN KIẾN THỨC AN TOÀN THỰC PHẨM
   • Số lượng: 01 bản chính (Có chữ ký và đóng dấu của chủ cơ sở).
   • Yêu cầu: FAST hỗ trợ tài liệu đào tạo, bộ đề kiểm tra và biểu mẫu chuẩn theo quy định.

LƯU Ý NGHIỆP VỤ TỪ FAST CONSULTING:
- Quý khách chỉ cần chuẩn bị 01 bộ hồ sơ giấy tờ.
- FAST sẽ đồng hành hỗ trợ setup trực tiếp tại cơ sở: Phân luồng bếp 1 chiều, chuẩn bị sổ kiểm thực 3 bước, bộ lưu mẫu thức ăn 24h và hỗ trợ tiếp Đoàn thẩm định của Sở ATTP TP.HCM.
--------------------------------------------------
THÔNG TIN LIÊN HỆ & TƯ VẤN 24/7:${staffLine}
- Hotline FAST: 0927 002 668
- FAST CONSULTING • Food All Standard & Training`;

    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(() => {
        alert('Đã sao chép thành công Danh mục hồ sơ ATTP! Bạn có thể dán (Paste) vào Zalo hoặc Email để gửi ngay cho khách hàng.');
      }).catch(() => fallbackCopy(text));
    } else {
      fallbackCopy(text);
    }
  };

  const fallbackCopy = (text: string) => {
    const ta = document.createElement('textarea');
    ta.value = text;
    document.body.appendChild(ta);
    ta.select();
    document.execCommand('copy');
    document.body.removeChild(ta);
    alert('Đã sao chép thành công Danh mục hồ sơ ATTP! Bạn có thể dán (Paste) vào Zalo hoặc Email để gửi ngay cho khách hàng.');
  };

  const formatDateVN = (dateStr: string) => {
    if (!dateStr) return '-';
    if (dateStr.includes('-')) {
      const p = dateStr.split('-');
      if (p.length === 3) return `${p[2]}/${p[1]}/${p[0]}`;
    }
    return dateStr;
  };

  const toggleSection = (sectionId: string) => {
    setOpenSections(prev => ({ ...prev, [sectionId]: !prev[sectionId] }));
  };

  // KPI Calculations
  const totalCount = db.length;
  const draftCount = db.filter(c => (c.status || '').includes('chuẩn bị')).length;
  const submittedCount = db.filter(c => (c.status || '').includes('Đã nộp')).length;
  const inspectCount = db.filter(c => (c.status || '').includes('thẩm định')).length;
  const completedCount = db.filter(c => (c.status || '').includes('Đã cấp') || (c.status || '').includes('hoàn thành')).length;

  const checkedCount = Object.values(checklist).filter(Boolean).length;
  const percentComplete = Math.round((checkedCount / 5) * 100);

  // Search logic
  const filteredDocs = CHECKLIST_DOCS.filter(doc => {
    const q = searchQuery.toLowerCase();
    const matches = doc.name.toLowerCase().includes(q) || doc.guidance.toLowerCase().includes(q) || (doc.details || '').toLowerCase().includes(q);
    if (filterPendingOnly && checklist[doc.id]) return false;
    return matches;
  });

  return (
    <div className="fast-attp-root space-y-6">
      {/* SCREEN VIEW (Hidden when printing checklist) */}
      <div className="ad-profile-screen-only space-y-6">
        
        {/* Header Banner */}
        <div className="bg-gradient-to-r from-[#005c56] to-[#007c76] rounded-3xl p-6 md:p-8 text-white shadow-lg relative overflow-hidden">
          <div className="absolute top-0 right-0 w-80 h-80 bg-white/5 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none"></div>
          <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
            <div>
              <div className="flex flex-wrap items-center gap-2 mb-2">
                <span className="px-3 py-1 rounded-full bg-white/10 text-teal-200 text-xs font-bold uppercase tracking-wider">
                  Mã TTHC: 1.013855 &bull; CẤP TỈNH
                </span>
                <span className="px-3 py-1 rounded-full bg-white/10 text-teal-200 text-xs font-bold uppercase tracking-wider">
                  Quy định chi tiết: NĐ 155/2018/NĐ-CP
                </span>
              </div>
              <h1 className="text-2xl md:text-3xl font-black uppercase tracking-tight">
                Cấp Giấy Chứng Nhận An Toàn Thực Phẩm
              </h1>
              <p className="text-teal-100/90 text-xs md:text-sm font-medium mt-1 max-w-2xl">
                Quản lý toàn trình hồ sơ ATTP cho dịch vụ ăn uống, cơ sở sản xuất thực phẩm thuộc Bộ Y tế - Sở An toàn thực phẩm TP.HCM.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              <a
                href="https://dichvucong.gov.vn/thu-tuc-hanh-chinh/019d2bff-2d33-76fe-bd90-4f37b18e4401"
                target="_blank"
                rel="noopener noreferrer"
                className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-xs uppercase tracking-wider shadow transition-all flex items-center gap-1.5"
              >
                <ExternalLink className="w-4 h-4" />
                Cổng DVC Quốc Gia
              </a>
              <a
                href="tel:0927002668"
                className="px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl font-bold text-xs uppercase tracking-wider shadow transition-all flex items-center gap-1.5"
              >
                <Phone className="w-4 h-4" />
                Hotline: 0927 002 668
              </a>
            </div>
          </div>
        </div>

        {/* Specifications Grid */}
        <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
          <div className="p-3.5 bg-gradient-to-br from-teal-50/80 to-emerald-50/40 border-l-4 border-l-[#005c56] rounded-r-xl shadow-xs">
            <div className="font-bold text-gray-500 uppercase text-[10px] tracking-wider">Cơ quan thẩm quyền</div>
            <div className="font-black text-gray-800 text-sm mt-0.5">Sở An toàn thực phẩm TP.HCM</div>
          </div>

          <div className="p-3.5 bg-gradient-to-br from-amber-50/80 to-orange-50/40 border-l-4 border-l-amber-500 rounded-r-xl shadow-xs">
            <div className="font-bold text-gray-500 uppercase text-[10px] tracking-wider">Thời hạn giải quyết</div>
            <div className="font-black text-amber-900 text-sm mt-0.5">20 ngày làm việc (SLA FAST)</div>
          </div>

          <div className="p-3.5 bg-gradient-to-br from-emerald-50/80 to-teal-50/40 border-l-4 border-l-emerald-500 rounded-r-xl shadow-xs">
            <div className="font-bold text-gray-500 uppercase text-[10px] tracking-wider">Lệ phí nhà nước</div>
            <div className="font-black text-emerald-800 text-sm mt-0.5">250.000 - 1.250.000 VNĐ</div>
          </div>

          <div className="p-3.5 bg-gradient-to-br from-sky-50/80 to-blue-50/40 border-l-4 border-l-blue-600 rounded-r-xl shadow-xs">
            <div className="font-bold text-gray-500 uppercase text-[10px] tracking-wider">Kết quả &amp; Pháp lý</div>
            <div className="font-black text-blue-900 text-sm mt-0.5">Giấy chứng nhận ATTP (03 năm)</div>
          </div>
        </div>

        {/* CRM Dashboard KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          <div className="bg-gradient-to-b from-teal-50/60 to-white p-4 rounded-2xl border border-teal-500/30 shadow-sm transition-transform hover:scale-[1.02]">
            <div className="text-[10px] font-black uppercase tracking-wider text-teal-800">TỔNG KHÁCH HÀNG / ORDER</div>
            <div className="text-3xl font-black text-teal-900 my-1">{totalCount}</div>
            <div className="text-[11px] font-semibold text-teal-700/80">Hồ sơ trong hệ thống</div>
          </div>

          <div className="bg-gradient-to-b from-amber-50/60 to-white p-4 rounded-2xl border border-amber-400/30 shadow-sm transition-transform hover:scale-[1.02]">
            <div className="text-[10px] font-black uppercase tracking-wider text-amber-800">ĐANG CHUẨN BỊ HỒ SƠ</div>
            <div className="text-3xl font-black text-amber-700 my-1">{draftCount}</div>
            <div className="text-[11px] font-semibold text-amber-700/80">Chưa nộp Sở</div>
          </div>

          <div className="bg-gradient-to-b from-sky-50/60 to-white p-4 rounded-2xl border border-blue-400/30 shadow-sm transition-transform hover:scale-[1.02]">
            <div className="text-[10px] font-black uppercase tracking-wider text-blue-800">ĐẦ ĐÃ NỘP SỞ (ĐẾM NGƯỢC 20N)</div>
            <div className="text-3xl font-black text-blue-700 my-1">{submittedCount}</div>
            <div className="text-[11px] font-semibold text-blue-700/80">Đang thụ lý hồ sơ</div>
          </div>

          <div className="bg-gradient-to-b from-purple-50/60 to-white p-4 rounded-2xl border border-purple-400/30 shadow-sm transition-transform hover:scale-[1.02]">
            <div className="text-[10px] font-black uppercase tracking-wider text-purple-800">ĐANG THẨM ĐỊNH TẠI BẾP</div>
            <div className="text-3xl font-black text-purple-700 my-1">{inspectCount}</div>
            <div className="text-[11px] font-semibold text-purple-700/80">Đoàn kiểm tra chuẩn bị</div>
          </div>

          <div className="bg-gradient-to-b from-emerald-50/60 to-white p-4 rounded-2xl border border-emerald-500/30 shadow-sm transition-transform hover:scale-[1.02]">
            <div className="text-[10px] font-black uppercase tracking-wider text-emerald-800">ĐÃ CẤP GIẤY CHỨNG NHẬN</div>
            <div className="text-3xl font-black text-emerald-700 my-1">{completedCount}</div>
            <div className="text-[11px] font-semibold text-emerald-700/80">Cơ sở hợp pháp đạt chuẩn</div>
          </div>
        </div>

        {/* CRM Customers Table */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="p-4 bg-gray-50 border-b border-gray-200 flex flex-wrap justify-between items-center gap-3">
            <div className="flex items-center gap-2 font-bold text-sm text-[#005c56] uppercase tracking-wide">
              <Database className="w-4 h-4 text-[#005c56]" />
              Cơ sở dữ liệu theo dõi toàn trình (FAST CRM - ATTP)
            </div>
            <div className="flex gap-2">
              <button onClick={handleExportToExcel} className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs uppercase tracking-wider transition-all flex items-center gap-1">
                <FileText className="w-3.5 h-3.5" /> Export Excel
              </button>
              <button onClick={handleExportBackupJSON} className="px-3.5 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-bold text-xs uppercase tracking-wider transition-all flex items-center gap-1">
                Sao Lưu JSON
              </button>
              <button onClick={handleCreateNewCustomer} className="px-3.5 py-1.5 bg-[#005c56] hover:bg-[#00423e] text-white rounded-xl font-bold text-xs uppercase tracking-wider transition-all flex items-center gap-1">
                <Plus className="w-3.5 h-3.5" /> Tạo Hồ Sơ Khách Mới
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left border-collapse min-w-[1600px]">
              <thead>
                <tr className="bg-slate-50 border-b border-gray-200 text-gray-700 font-bold uppercase tracking-wider">
                  <th className="p-3 text-center w-12">STT</th>
                  <th className="p-3 w-32">Nhân Viên</th>
                  <th className="p-3 w-48">Tên Khách Hàng</th>
                  <th className="p-3 w-36">Người Liên Hệ</th>
                  <th className="p-3 w-32">Số Điện Thoại</th>
                  <th className="p-3">Địa Điểm Cơ Sở</th>
                  <th className="p-3 w-24">Ngày Order</th>
                  <th className="p-3 w-24 text-center">Checklist</th>
                  <th className="p-3 w-36 text-center">Trạng Thái</th>
                  <th className="p-3 w-24">Ngày Nộp</th>
                  <th className="p-3 w-28">Hạn Thủ Tục (20N)</th>
                  <th className="p-3 w-28">Ngày Thẩm Định</th>
                  <th className="p-3 w-24">Ngày GCN</th>
                  <th className="p-3 w-32">Số GCN</th>
                  <th className="p-3 w-32">Ngày Hết Hạn</th>
                  <th className="p-3 w-20 text-center">Thao Tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {db.length === 0 ? (
                  <tr>
                    <td colSpan={16} className="p-8 text-center text-gray-400 font-medium">
                      Chưa có dữ liệu khách hàng nào trong FAST CRM. Hãy điền thông tin và nhấn "Lưu Vào Thống Kê" ở form dưới.
                    </td>
                  </tr>
                ) : (
                  db.map((c, index) => {
                    const isActive = c.id === currentCustomerId;
                    let pillBg = 'bg-amber-50 text-amber-700 border-amber-200';
                    if ((c.status || '').includes('Đã nộp')) pillBg = 'bg-blue-50 text-blue-700 border-blue-200';
                    else if ((c.status || '').includes('thẩm định')) pillBg = 'bg-purple-50 text-purple-700 border-purple-200';
                    else if ((c.status || '').includes('Đã cấp') || (c.status || '').includes('hoàn thành')) pillBg = 'bg-green-50 text-green-700 border-green-200';
                    else if ((c.status || '').includes('khắc phục') || (c.status || '').includes('bổ sung')) pillBg = 'bg-red-50 text-red-700 border-red-200';

                    return (
                      <tr key={c.id} className={`hover:bg-slate-50 transition-all ${isActive ? 'bg-teal-50/50 font-semibold' : ''}`}>
                        <td className="p-3 text-center text-gray-400 font-bold">{String(index + 1).padStart(2, '0')}</td>
                        <td className="p-3 text-teal-800 font-bold">{c.fastStaff || 'Chưa gán'}</td>
                        <td className="p-3 font-bold text-gray-900">{c.name}</td>
                        <td className="p-3 text-gray-800">{c.contact || '-'}</td>
                        <td className="p-3">
                          {c.phone && c.phone !== 'Chưa có' ? (
                            <a href={`tel:${c.phone.replace(/\s+/g, '')}`} className="text-[#007c76] hover:underline font-bold flex items-center gap-1">
                              <Phone className="w-3 h-3" /> {c.phone}
                            </a>
                          ) : '-'}
                        </td>
                        <td className="p-3 text-gray-600 truncate max-w-xs" title={c.location}>{c.location}</td>
                        <td className="p-3 text-gray-500">{formatDateVN(c.orderDate)}</td>
                        <td className="p-3 text-center font-bold text-gray-800">{c.completedCount || 0}/5</td>
                        <td className="p-3 text-center">
                          <span className={`px-2.5 py-1 rounded-full text-[10.5px] font-bold border ${pillBg}`}>
                            {c.status || 'Đang chuẩn bị'}
                          </span>
                        </td>
                        <td className="p-3 text-teal-700 font-bold">{formatDateVN(c.submitDate)}</td>
                        <td className="p-3 text-amber-600 font-bold">{formatDateVN(c.targetDate)}</td>
                        <td className="p-3 text-purple-700 font-bold">{formatDateVN(c.inspectDate)}</td>
                        <td className="p-3 text-green-700 font-bold">{formatDateVN(c.certDate)}</td>
                        <td className="p-3 font-mono font-bold">{c.certNumber || '-'}</td>
                        <td className="p-3 text-red-600 font-black">{formatDateVN(c.expireDate)}</td>
                        <td className="p-3 text-center flex items-center justify-center gap-1.5">
                          <button onClick={() => handleLoadCustomerToActive(c.id)} className="p-1 text-gray-400 hover:text-teal-600 hover:bg-white rounded transition-all">
                            <Edit className="w-4 h-4" />
                          </button>
                          <button onClick={() => handleDeleteCustomerRecord(c.id)} className="p-1 text-gray-400 hover:text-red-600 hover:bg-white rounded transition-all">
                            <Trash2 className="w-4 h-4" />
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

        {/* Form nhập liệu & Hồ sơ chi tiết */}
        <div className="bg-white p-6 rounded-2xl border-2 border-[#005c56]/30 shadow-xs space-y-4">
          <div className="flex flex-wrap items-center justify-between border-b border-dashed border-gray-200 pb-3 gap-2">
            <div className="flex items-center gap-2">
              <Clipboard className="w-5 h-5 text-[#005c56]" />
              <h2 className="text-sm font-black uppercase text-[#005c56] tracking-wide">
                Cập Nhật Hồ Sơ Khách Hàng (FAST CRM - ATTP)
              </h2>
            </div>
            <span className="text-[11.5px] font-bold text-green-700 bg-green-50 px-2.5 py-1 rounded-full border border-green-200 flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              {syncStatus}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
            <div>
              <label className="block font-bold text-gray-700 mb-1">
                Nhân Viên Phụ Trách: <span className="text-red-500">*</span>
              </label>
              <div className="relative flex items-center">
                <span className="absolute left-3 text-gray-400 pointer-events-none flex items-center justify-center"><Search className="w-4 h-4" /></span>
                <input type="text" value={fastStaff} onChange={(e) => setFastStaff(e.target.value)} className="w-full pl-9 pr-3 py-2 bg-[#f4f8f8] border border-[#d2dedd] rounded-xl focus:ring-1 focus:ring-teal-500 focus:bg-white focus:border-teal-500 outline-none text-xs min-h-[38px] transition-all text-gray-800 font-medium" placeholder="Tên nhân viên FAST..." />
              </div>
            </div>

            <div>
              <label className="block font-bold text-gray-700 mb-1">
                Tên Khách Hàng / Cơ Sở: <span className="text-red-500">*</span>
              </label>
              <div className="relative flex items-center">
                <span className="absolute left-3 text-gray-400 pointer-events-none flex items-center justify-center"><FileText className="w-4 h-4" /></span>
                <input type="text" value={custName} onChange={(e) => setCustName(e.target.value)} className="w-full pl-9 pr-3 py-2 bg-[#f4f8f8] border border-[#d2dedd] rounded-xl focus:ring-1 focus:ring-teal-500 focus:bg-white focus:border-teal-500 outline-none text-xs min-h-[38px] transition-all text-gray-800 font-medium" placeholder="Tên công ty / bếp ăn / nhà hàng..." />
              </div>
            </div>

            <div>
              <label className="block font-bold text-gray-700 mb-1">
                Người Liên Hệ: <span className="text-red-500">*</span>
              </label>
              <div className="relative flex items-center">
                <span className="absolute left-3 text-gray-400 pointer-events-none flex items-center justify-center"><Search className="w-4 h-4" /></span>
                <input type="text" value={custContact} onChange={(e) => setCustContact(e.target.value)} className="w-full pl-9 pr-3 py-2 bg-[#f4f8f8] border border-[#d2dedd] rounded-xl focus:ring-1 focus:ring-teal-500 focus:bg-white focus:border-teal-500 outline-none text-xs min-h-[38px] transition-all text-gray-800 font-medium" placeholder="Họ tên người liên hệ..." />
              </div>
            </div>

            <div>
              <label className="block font-bold text-gray-700 mb-1">
                Số Điện Thoại: <span className="text-red-500">*</span>
              </label>
              <div className="relative flex items-center">
                <span className="absolute left-3 text-gray-400 pointer-events-none flex items-center justify-center"><Phone className="w-4 h-4" /></span>
                <input type="text" value={custPhone} onChange={(e) => setCustPhone(e.target.value)} className="w-full pl-9 pr-3 py-2 bg-[#f4f8f8] border border-[#d2dedd] rounded-xl focus:ring-1 focus:ring-teal-500 focus:bg-white focus:border-teal-500 outline-none text-xs min-h-[38px] transition-all text-gray-800 font-medium" placeholder="Số điện thoại di động..." />
              </div>
            </div>

            <div className="sm:col-span-2">
              <label className="block font-bold text-gray-700 mb-1">
                Địa Điểm Cơ Sở / Địa Chỉ Bếp Ăn: <span className="text-red-500">*</span>
              </label>
              <div className="relative flex items-center">
                <span className="absolute left-3 text-gray-400 pointer-events-none flex items-center justify-center"><Search className="w-4 h-4" /></span>
                <input type="text" value={custLocation} onChange={(e) => setCustLocation(e.target.value)} className="w-full pl-9 pr-3 py-2 bg-[#f4f8f8] border border-[#d2dedd] rounded-xl focus:ring-1 focus:ring-teal-500 focus:bg-white focus:border-teal-500 outline-none text-xs min-h-[38px] transition-all text-gray-800 font-medium" placeholder="Số nhà, tên đường, Phường, Quận..." />
              </div>
            </div>

            <div>
              <label className="block font-bold text-gray-700 mb-1">
                Ngày Order / Tiếp Nhận: <span className="text-red-500">*</span>
              </label>
              <div className="relative flex items-center">
                <span className="absolute left-3 text-gray-400 pointer-events-none flex items-center justify-center"><Clock className="w-4 h-4" /></span>
                <input type="date" value={custOrderDate} onChange={(e) => setCustOrderDate(e.target.value)} className="w-full pl-9 pr-3 py-2 bg-[#f4f8f8] border border-[#d2dedd] rounded-xl focus:ring-1 focus:ring-teal-500 focus:bg-white focus:border-teal-500 outline-none text-xs min-h-[38px] transition-all text-gray-800 font-medium" />
              </div>
            </div>

            <div>
              <label className="block font-bold text-gray-700 mb-1">Trạng Thái Hồ Sơ:</label>
              <div className="relative flex items-center">
                <span className="absolute left-3 text-gray-400 pointer-events-none flex items-center justify-center"><Clock className="w-4 h-4" /></span>
                <select value={custStatus} onChange={(e) => setCustStatus(e.target.value)} className="w-full pl-9 pr-3 py-2 bg-[#f4f8f8] border border-[#d2dedd] rounded-xl focus:ring-1 focus:ring-teal-500 focus:bg-white focus:border-teal-500 outline-none text-xs min-h-[38px] transition-all text-gray-800 font-medium">
                  <option value="Đang chuẩn bị hồ sơ">🟡 Đang chuẩn bị hồ sơ &amp; Cơ sở</option>
                  <option value="Đã nộp Sở - Chờ thẩm định">🔵 Đã nộp Sở - Chờ thẩm định</option>
                  <option value="Đang thẩm định thực tế">🟣 Đang thẩm định thực tế tại bếp</option>
                  <option value="Đã thẩm định đạt - Chờ cấp">🟢 Đã thẩm định đạt - Chờ ký cấp Giấy</option>
                  <option value="Đã cấp Giấy chứng nhận ATTP">✅ Đã cấp Giấy chứng nhận ATTP</option>
                  <option value="Cần khắc phục cơ sở">🔴 Cần bổ sung / Khắc phục cơ sở</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block font-bold text-gray-700 mb-1">
                Ngày Nộp (Sở ATTP): <span className="text-red-500">*</span>
              </label>
              <div className="relative flex items-center">
                <span className="absolute left-3 text-gray-400 pointer-events-none flex items-center justify-center"><Clock className="w-4 h-4" /></span>
                <input type="date" value={custSubmitDate} onChange={(e) => handleFastSubmitDateChange(e.target.value, 'business')} className="w-full pl-9 pr-3 py-2 bg-[#f4f8f8] border border-[#d2dedd] rounded-xl focus:ring-1 focus:ring-teal-500 focus:bg-white focus:border-teal-500 outline-none text-xs min-h-[38px] transition-all text-gray-800 font-medium" />
              </div>
            </div>

            <div>
              <label className="block font-bold text-gray-700 mb-1 flex justify-between">
                <span>Hạn Thủ Tục (20N)</span>
                <span onClick={() => handleFastSubmitDateChange(custSubmitDate, 'business')} className="text-[#007c76] hover:underline cursor-pointer font-bold">Tính +20N</span>
              </label>
              <div className="relative flex items-center">
                <span className="absolute left-3 text-gray-400 pointer-events-none flex items-center justify-center"><Clock className="w-4 h-4" /></span>
                <input type="date" value={custTargetDate} onChange={(e) => setCustTargetDate(e.target.value)} className="w-full pl-9 pr-3 py-2 bg-[#f4f8f8] border border-[#d2dedd] rounded-xl focus:ring-1 focus:ring-teal-500 focus:bg-white focus:border-teal-500 outline-none text-xs min-h-[38px] transition-all text-gray-800 font-medium" />
              </div>
            </div>

            <div>
              <label className="block font-bold text-gray-700 mb-1">Ngày Thẩm Định Thực Tế:</label>
              <div className="relative flex items-center">
                <span className="absolute left-3 text-gray-400 pointer-events-none flex items-center justify-center"><Clock className="w-4 h-4" /></span>
                <input type="date" value={custInspectDate} onChange={(e) => setCustInspectDate(e.target.value)} className="w-full pl-9 pr-3 py-2 bg-[#f4f8f8] border border-[#d2dedd] rounded-xl focus:ring-1 focus:ring-teal-500 focus:bg-white focus:border-teal-500 outline-none text-xs min-h-[38px] transition-all text-gray-800 font-medium" />
              </div>
            </div>

            <div>
              <label className="block font-bold text-gray-700 mb-1 flex justify-between">
                <span>Ngày Cấp GCN</span>
                <span onClick={() => handleCertDateChange(custCertDate)} className="text-[#007c76] hover:underline cursor-pointer font-bold">Tính +3 Năm</span>
              </label>
              <div className="relative flex items-center">
                <span className="absolute left-3 text-gray-400 pointer-events-none flex items-center justify-center"><Clock className="w-4 h-4" /></span>
                <input type="date" value={custCertDate} onChange={(e) => handleCertDateChange(e.target.value)} className="w-full pl-9 pr-3 py-2 bg-[#f4f8f8] border border-[#d2dedd] rounded-xl focus:ring-1 focus:ring-teal-500 focus:bg-white focus:border-teal-500 outline-none text-xs min-h-[38px] transition-all text-gray-800 font-medium" />
              </div>
            </div>

            <div>
              <label className="block font-bold text-gray-700 mb-1">Số GCN / Mã Biên Nhận:</label>
              <div className="relative flex items-center">
                <span className="absolute left-3 text-gray-400 pointer-events-none flex items-center justify-center"><FileText className="w-4 h-4" /></span>
                <input type="text" value={custCertNumber} onChange={(e) => setCustCertNumber(e.target.value)} className="w-full pl-9 pr-3 py-2 bg-[#f4f8f8] border border-[#d2dedd] rounded-xl focus:ring-1 focus:ring-teal-500 focus:bg-white focus:border-teal-500 outline-none text-xs min-h-[38px] transition-all text-gray-800 font-medium" placeholder="1234/2026/ATTP-CN..." />
              </div>
            </div>

            <div>
              <label className="block font-bold text-gray-700 mb-1">Ngày Hết Hạn (+3 năm):</label>
              <div className="relative flex items-center">
                <span className="absolute left-3 text-gray-400 pointer-events-none flex items-center justify-center"><Clock className="w-4 h-4" /></span>
                <input type="date" value={custExpireDate} onChange={(e) => setCustExpireDate(e.target.value)} className="w-full pl-9 pr-3 py-2 bg-[#f4f8f8] border border-[#d2dedd] rounded-xl focus:ring-1 focus:ring-teal-500 focus:bg-white focus:border-teal-500 outline-none text-xs min-h-[38px] transition-all text-gray-800 font-medium" />
              </div>
            </div>
          </div>

          <div className="flex flex-wrap justify-between items-center mt-6 pt-4 border-t border-dashed border-gray-200 gap-2">
            <span className="text-xs text-gray-500">
              * Nhấn <strong>"Lưu Vào Thống Kê"</strong> để ghi nhớ bản ghi toàn trình hoặc cập nhật vào bảng CRM.
            </span>
            <button onClick={handleSaveActiveCustomer} className="px-5 py-2.5 bg-[#005c56] hover:bg-[#00423e] text-white rounded-xl font-bold text-xs uppercase tracking-wider flex items-center gap-1.5 shadow-sm transition-all hover:scale-105">
              Lưu Vào Thống Kê
            </button>
          </div>
        </div>

        {/* Global Toolbar */}
        <div className="bg-[#fafcfc] p-4 rounded-2xl border border-gray-200 flex flex-wrap justify-between items-center gap-4">
          <div className="relative flex-1 min-w-[260px] max-w-md">
            <Search className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Tìm nhanh tên giấy tờ, quy định..."
              className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-xl text-xs outline-none focus:ring-1 focus:ring-teal-500 bg-white"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setFilterPendingOnly(!filterPendingOnly)}
              className={`px-3 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                filterPendingOnly 
                  ? 'bg-[#005c56] text-white shadow-sm' 
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              <Clock className="w-3.5 h-3.5" />
              {filterPendingOnly ? 'Đang lọc: Chưa có' : 'Chỉ xem chưa có'}
            </button>

            <button
              onClick={() => {
                const anyClosed = Object.values(openSections).some(v => !v);
                const updated: Record<string, boolean> = {};
                Object.keys(openSections).forEach(k => { updated[k] = anyClosed; });
                setOpenSections(updated);
              }}
              className="px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-xs font-bold transition-all"
            >
              Mở/Thu gọn
            </button>

            <button
              onClick={handleCopyClientMessage}
              className="px-3.5 py-2 bg-sky-600 hover:bg-sky-700 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-sm"
              title="Sao chép tin nhắn để gửi khách qua Zalo"
            >
              <Share2 className="w-3.5 h-3.5" />
              Sao Chép Gửi Zalo
            </button>

            <button
              onClick={handleExportClientChecklistPDF}
              className="px-3.5 py-2 bg-[#005c56] hover:bg-[#00423e] text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-sm"
              title="In riêng bảng checklist hồ sơ theo yêu cầu"
            >
              <Printer className="w-3.5 h-3.5" />
              Xuất PDF Gửi Khách
            </button>
          </div>
        </div>

        {/* Progress Tracker Bar */}
        <div className="bg-white border border-gray-200 p-4 rounded-2xl shadow-xs relative">
          <div className="flex justify-between items-center mb-2">
            <span className="text-xs font-bold text-gray-700 flex items-center gap-1.5">
              <Clock className="w-4 h-4 text-[#005c56]" />
              Tiến độ chuẩn bị hồ sơ pháp lý ATTP
            </span>
            <span className={`text-xs font-black ${percentComplete === 100 ? 'text-green-600' : 'text-[#005c56]'}`}>
              Đã chuẩn bị: {checkedCount}/5 mục ({percentComplete}%) {percentComplete === 100 && ' - Đầy đủ!'}
            </span>
          </div>
          <div className="w-full h-2.5 bg-gray-100 rounded-full overflow-hidden">
            <div className="h-full bg-gradient-to-r from-[#005c56] to-emerald-400 transition-all duration-300" style={{ width: `${percentComplete}%` }}></div>
          </div>
        </div>

        {/* 5 Accordion Content Sections */}
        <div className="space-y-4">
          
          {/* Accordion 1: Checklist hồ sơ */}
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
            <button onClick={() => toggleSection('sec-checklist')} className="w-full p-4 bg-gray-50 hover:bg-gray-100 flex items-center justify-between text-left transition-all border-b border-gray-200">
              <div className="flex items-center gap-2.5">
                <span className="w-6 h-6 rounded-full bg-[#005c56] text-white font-bold text-xs flex items-center justify-center">1</span>
                <span className="font-bold text-sm text-gray-800">Danh Mục Hồ Sơ Khách Hàng Cần Cung Cấp (05 Hạng Mục Bắt Buộc)</span>
              </div>
              {openSections['sec-checklist'] ? <ChevronUp className="w-4 h-4 text-gray-500" /> : <ChevronDown className="w-4 h-4 text-gray-500" />}
            </button>

            {openSections['sec-checklist'] && (
              <div className="p-5">
                <div className="overflow-x-auto rounded-xl border border-gray-200">
                  <table className="w-full text-xs text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-50 border-b border-gray-200 text-gray-700 font-bold uppercase tracking-wider">
                        <th className="p-3 text-center w-16">Đã có</th>
                        <th className="p-3 text-center w-12">STT</th>
                        <th className="p-3 w-[45%]">Tên hồ sơ / Tài liệu cần cung cấp</th>
                        <th className="p-3 w-[20%]">Quy cách &amp; Số lượng</th>
                        <th className="p-3">Hướng dẫn &amp; Tiêu chuẩn thẩm định</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {filteredDocs.map((doc) => {
                        const isChecked = !!checklist[doc.id];
                        return (
                          <tr key={doc.id} className={`hover:bg-slate-50/50 transition-all ${isChecked ? 'bg-emerald-50/20 text-gray-500' : ''}`}>
                            <td className="p-3 text-center">
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={(e) => handleDocCheck(doc.id, e.target.checked)}
                                className="w-4 h-4 accent-[#005c56] cursor-pointer"
                              />
                            </td>
                            <td className="p-3 text-center font-bold text-gray-400">{doc.stt}</td>
                            <td className="p-3">
                              <div className={`font-bold text-sm ${isChecked ? 'line-through text-gray-400' : 'text-teal-900'}`}>{doc.name}</div>
                              <div className="text-gray-500 mt-1">{doc.guidance}</div>
                              {doc.legalRef && <div className="text-[#005c56] font-semibold mt-1 text-[11px]">{doc.legalRef}</div>}
                            </td>
                            <td className="p-3">
                              <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${doc.badgeType === 'original' ? 'bg-emerald-50 text-green-700 border border-green-200' : 'bg-blue-50 text-blue-700 border border-blue-200'}`}>
                                {doc.badgeCount}
                              </span>
                              <div className="text-gray-400 mt-1 text-[11px]">Đầy đủ hồ sơ gốc</div>
                            </td>
                            <td className="p-3">
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-red-50 text-red-700 border border-red-200">
                                {doc.statusText}
                              </span>
                              <div className="text-gray-600 mt-1 leading-relaxed">{doc.details}</div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                <div className="bg-amber-50 border-l-4 border-amber-500 p-4 rounded-r-xl text-amber-950 text-xs mt-4 leading-relaxed">
                  <strong>Lưu ý nghiệp vụ từ FAST CONSULTING:</strong> Khách hàng chuẩn bị <strong>01 bộ hồ sơ hoàn chỉnh</strong> theo danh mục trên. Ngoài hồ sơ giấy tờ, cơ quan chức năng sẽ thành lập Đoàn thẩm định trực tiếp tại cơ sở trong vòng 15 ngày làm việc kể từ khi nhận đủ hồ sơ hợp lệ.
                </div>
              </div>
            )}
          </div>

          {/* Accordion 2: Quy trình 20 ngày */}
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
            <button onClick={() => toggleSection('sec-process')} className="w-full p-4 bg-gray-50 hover:bg-gray-100 flex items-center justify-between text-left transition-all border-b border-gray-200">
              <div className="flex items-center gap-2.5">
                <span className="w-6 h-6 rounded-full bg-[#005c56] text-white font-bold text-xs flex items-center justify-center">2</span>
                <span className="font-bold text-sm text-gray-800">Trình Tự Thực Hiện &amp; Cơ Chế Thẩm Định 20 Ngày Làm Việc</span>
              </div>
              {openSections['sec-process'] ? <ChevronUp className="w-4 h-4 text-gray-500" /> : <ChevronDown className="w-4 h-4 text-gray-500" />}
            </button>

            {openSections['sec-process'] && (
              <div className="p-5">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                  <div className="p-4 bg-gray-50 rounded-xl border-t-4 border-t-blue-600">
                    <div className="text-[10px] font-black uppercase text-blue-600 tracking-wider mb-1">Bước 1: Nộp hồ sơ &amp; Thẩm xét hình thức (05 ngày)</div>
                    <div className="font-bold text-sm text-gray-800 mb-1">Tiếp nhận hồ sơ trực tuyến</div>
                    <p className="text-gray-600 leading-relaxed">
                      Cơ sở nộp 01 bộ hồ sơ trực tuyến qua Cổng Dịch vụ công hoặc trực tiếp tại Sở An toàn thực phẩm TP.HCM. Trong thời hạn <strong>05 ngày làm việc</strong>, nếu hồ sơ chưa hợp lệ, Sở ra thông báo hướng dẫn hoàn thiện.
                    </p>
                  </div>

                  <div className="p-4 bg-gray-50 rounded-xl border-t-4 border-t-amber-600">
                    <div className="text-[10px] font-black uppercase text-amber-600 tracking-wider mb-1">Bước 2: Thẩm định thực tế tại cơ sở (Trong vòng 15 ngày)</div>
                    <div className="font-bold text-sm text-gray-800 mb-1">Kiểm tra trực tiếp cơ sở</div>
                    <p className="text-gray-600 leading-relaxed">
                      Sở thành lập Đoàn thẩm định từ 3 - 5 thành viên kiểm tra thực tế: nguyên tắc bếp 1 chiều, nguồn nước, trang thiết bị, giấy khám sức khỏe và hồ sơ lưu mẫu thực phẩm 24h.
                    </p>
                  </div>

                  <div className="p-4 bg-green-50 rounded-xl border-t-4 border-t-green-600">
                    <div className="text-[10px] font-black uppercase text-green-700 tracking-wider mb-1">Bước 3: Cấp Giấy chứng nhận ATTP (Tổng 20 ngày)</div>
                    <div className="font-bold text-sm text-green-900 mb-1">Giấy phép có giá trị 03 năm</div>
                    <p className="text-green-800 leading-relaxed">
                      Nếu kết quả thẩm định "Đạt", Sở cấp Giấy chứng nhận ATTP trong vòng <strong>05 ngày làm việc</strong> tiếp theo. Trường hợp "Khắc phục", cơ sở có tối đa 30 ngày để hoàn thiện.
                    </p>
                  </div>
                </div>

                <div className="p-3.5 bg-green-50 border border-green-200 rounded-xl text-xs text-green-950 mt-4 leading-relaxed">
                  <strong>Nguyên tắc vàng khi thẩm định:</strong> Đoàn thẩm định chú trọng kiểm tra: (1) Sổ kiểm thực 3 bước và lưu mẫu thức ăn; (2) Hợp đồng/hóa đơn nguyên liệu đầu vào; (3) Tủ kính bảo quản thức ăn chín; (4) Thùng rác có nắp đậy và đạp chân; (5) Dụng cụ gắp thực phẩm chín riêng biệt.
                </div>
              </div>
            )}
          </div>

          {/* Accordion 3: Phương thức & Lệ phí */}
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
            <button onClick={() => toggleSection('sec-methods')} className="w-full p-4 bg-gray-50 hover:bg-gray-100 flex items-center justify-between text-left transition-all border-b border-gray-200">
              <div className="flex items-center gap-2.5">
                <span className="w-6 h-6 rounded-full bg-[#005c56] text-white font-bold text-xs flex items-center justify-center">3</span>
                <span className="font-bold text-sm text-gray-800">Phương Thức Tiếp Nhận Hồ Sơ &amp; Biểu Mức Lệ Phí Thẩm Định</span>
              </div>
              {openSections['sec-methods'] ? <ChevronUp className="w-4 h-4 text-gray-500" /> : <ChevronDown className="w-4 h-4 text-gray-500" />}
            </button>

            {openSections['sec-methods'] && (
              <div className="p-5 text-xs text-gray-700 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="p-4 bg-white border border-gray-200 rounded-xl">
                    <h4 className="font-bold text-sm text-blue-900 mb-2 flex items-center gap-1.5">
                      <ExternalLink className="w-4 h-4" /> 1. Nộp Trực Tuyến (Online)
                    </h4>
                    <p className="leading-relaxed">
                      <strong>Cổng nộp trực tiếp:</strong> <a href="https://dichvucong.gov.vn/thu-tuc-hanh-chinh/019d2bff-2d33-76fe-bd90-4f37b18e4401" target="_blank" rel="noopener noreferrer" className="text-blue-600 font-bold hover:underline">Trang thủ tục 1.013855 - Cổng DVC Quốc Gia</a>. Scan màu file gốc định dạng PDF/PNG tải lên hệ thống.
                    </p>
                  </div>

                  <div className="p-4 bg-white border border-gray-200 rounded-xl">
                    <h4 className="font-bold text-sm text-gray-900 mb-2 flex items-center gap-1.5">
                      <FileText className="w-4 h-4" /> 2. Nộp Trực Tiếp Tại Một Cửa
                    </h4>
                    <p className="leading-relaxed">
                      <strong>Địa chỉ:</strong> Bộ phận Tiếp nhận &amp; Trả kết quả Sở An toàn thực phẩm TP.HCM (Số 57 Trương Định, P. Võ Thị Sáu, Q.3, TP.HCM). Giờ hành chính từ Thứ 2 đến Thứ 6.
                    </p>
                  </div>

                  <div className="p-4 bg-white border border-[#005c56]/30 rounded-xl">
                    <h4 className="font-bold text-sm text-teal-900 mb-2 flex items-center gap-1.5">
                      <Database className="w-4 h-4" /> 3. Biểu Phí Thẩm Định Cơ Sở (TT 67/2021/TT-BTC)
                    </h4>
                    <ul className="space-y-1 text-gray-600">
                      <li>• Bếp ăn tập thể &gt; 200 suất; suất ăn sẵn: <strong>1.250.000 VNĐ/lần</strong>.</li>
                      <li>• Dịch vụ ăn uống phục vụ &gt;= 200 suất: <strong>500.000 VNĐ/lần</strong>.</li>
                      <li>• Cửa hàng ăn uống phục vụ &lt; 200 suất: <strong>350.000 VNĐ/lần</strong>.</li>
                      <li>• Cửa hàng ăn uống nhỏ lẻ: <strong>250.000 VNĐ/lần</strong>.</li>
                    </ul>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Accordion 4: Quy chuẩn kỹ thuật */}
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
            <button onClick={() => toggleSection('sec-technical')} className="w-full p-4 bg-gray-50 hover:bg-gray-100 flex items-center justify-between text-left transition-all border-b border-gray-200">
              <div className="flex items-center gap-2.5">
                <span className="w-6 h-6 rounded-full bg-[#005c56] text-white font-bold text-xs flex items-center justify-center">4</span>
                <span className="font-bold text-sm text-gray-800">Quy Chuẩn Kỹ Thuật Cơ Sở Vật Chất &amp; Nguyên Tắc Bếp Một Chiều</span>
              </div>
              {openSections['sec-technical'] ? <ChevronUp className="w-4 h-4 text-gray-500" /> : <ChevronDown className="w-4 h-4 text-gray-500" />}
            </button>

            {openSections['sec-technical'] && (
              <div className="p-5 text-xs text-gray-700 leading-relaxed">
                <ul className="space-y-3 list-disc pl-5">
                  <li><strong>Nguyên tắc bếp 1 chiều:</strong> Quy trình vận hành đi theo một chiều duy nhất: <em>Khu tiếp nhận nguyên liệu &rarr; Khu sơ chế thô &rarr; Khu chế biến nhiệt/nấu &rarr; Khu chia soạn thức ăn chín &rarr; Khu rửa dụng cụ bát đĩa riêng</em>. Tuyệt đối không để thực phẩm sống và chín đi chéo nhau.</li>
                  <li><strong>Nguồn nước sử dụng:</strong> Nguồn nước ăn uống và chế biến thực phẩm phải bảo đảm đạt quy chuẩn kỹ thuật quốc gia về chất lượng nước sạch sử dụng cho mục đích sinh hoạt (QCVN 01-1:2018/BYT).</li>
                  <li><strong>Trang thiết bị chống nhiễm bẩn:</strong> Có lưới chống ruồi, muỗi, chuột bọ ở toàn bộ cửa thông gió và cửa ra vào khu bếp. Thùng rác đạp chân, có lót túi nilon và được thu gom thường xuyên.</li>
                  <li><strong>Lưu mẫu thức ăn 24 giờ:</strong> Cơ sở phục vụ từ 30 suất ăn trở lên phải thực hiện ghi sổ kiểm thực 3 bước và lưu mẫu thức ăn tối thiểu 24 giờ trong tủ lạnh chuyên dụng ở nhiệt độ 2°C - 8°C với lượng mẫu tối thiểu 100g/món (150ml đối với món lỏng).</li>
                  <li><strong>Trang phục bảo hộ lao động:</strong> Người chế biến phải mặc đồng phục sạch sẽ, đeo tạp dề, đội mũ trùm tóc, đeo khẩu trang và găng tay khi tiếp xúc trực tiếp với thực phẩm ăn ngay.</li>
                </ul>
              </div>
            )}
          </div>

          {/* Accordion 5: Căn cứ pháp lý */}
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
            <button onClick={() => toggleSection('sec-legal')} className="w-full p-4 bg-gray-50 hover:bg-gray-100 flex items-center justify-between text-left transition-all border-b border-gray-200">
              <div className="flex items-center gap-2.5">
                <span className="w-6 h-6 rounded-full bg-[#005c56] text-white font-bold text-xs flex items-center justify-center">5</span>
                <span className="font-bold text-sm text-gray-800">Hệ Thống Căn Cứ Pháp Lý Ban Hành</span>
              </div>
              {openSections['sec-legal'] ? <ChevronUp className="w-4 h-4 text-gray-500" /> : <ChevronDown className="w-4 h-4 text-gray-500" />}
            </button>

            {openSections['sec-legal'] && (
              <div className="p-5 text-xs text-gray-700">
                <div className="divide-y divide-gray-100">
                  <div className="py-2.5 flex justify-between items-center">
                    <span className="font-semibold text-gray-800">Luật An toàn thực phẩm năm 2010</span>
                    <span className="px-2 py-0.5 rounded bg-teal-50 text-[#005c56] font-mono font-bold text-[11px]">55/2010/QH12</span>
                  </div>
                  <div className="py-2.5 flex justify-between items-center">
                    <span className="font-semibold text-gray-800">Nghị định sửa đổi, bổ sung quy định liên quan đến điều kiện đầu tư kinh doanh thuộc Bộ Y tế</span>
                    <span className="px-2 py-0.5 rounded bg-teal-50 text-[#005c56] font-mono font-bold text-[11px]">155/2018/NĐ-CP</span>
                  </div>
                  <div className="py-2.5 flex justify-between items-center">
                    <span className="font-semibold text-gray-800">Nghị định quy định về phân quyền, phân cấp trong lĩnh vực y tế</span>
                    <span className="px-2 py-0.5 rounded bg-teal-50 text-[#005c56] font-mono font-bold text-[11px]">148/2025/NĐ-CP</span>
                  </div>
                  <div className="py-2.5 flex justify-between items-center">
                    <span className="font-semibold text-gray-800">Thông tư quy định mức thu, chế độ thu, nộp, quản lý và sử dụng phí trong công tác an toàn thực phẩm</span>
                    <span className="px-2 py-0.5 rounded bg-teal-50 text-[#005c56] font-mono font-bold text-[11px]">67/2021/TT-BTC</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* PRINT VIEW ONLY (Using native running footer via semantic table) */}
      <table id="ad-checklist-print-area" className="hidden print:table bg-white text-gray-900 w-full border-collapse">
        <tbody>
          <tr>
            <td className="p-0 border-none">
              <div id="ad-checklist-print-content" className="flex flex-col justify-start">
                {/* Header */}
                <div className="border-b-2 border-[#005c56] pb-3 mb-4 flex justify-between items-center">
                  <div>
                    <div className="text-[11px] font-black uppercase text-[#005c56] tracking-wider">
                      FAST CONSULTING &bull; FOOD ALL STANDARD & TRAINING
                    </div>
                    <h1 className="text-xl font-black text-gray-900 uppercase mt-0.5 tracking-tight">
                      BẢNG CHECKLIST HỒ SƠ AN TOÀN THỰC PHẨM (MÃ 1.013855)
                    </h1>
                    <p className="text-[11px] text-gray-500 italic mt-0.5">
                      Thủ tục cấp Giấy chứng nhận cơ sở đủ điều kiện vệ sinh an toàn thực phẩm - Sở ATTP TP.HCM
                    </p>
                  </div>
                  <div className="text-right text-[10.5px] text-gray-500">
                    <div>Mã TTHC: <strong>1.013855</strong></div>
                    <div>SLA: <strong>20 Ngày làm việc</strong></div>
                    <div>Hotline: <strong>0927 002 668</strong></div>
                  </div>
                </div>

                {/* Profile Print Table */}
                <div className="border border-gray-300 rounded-lg p-3 mb-4 bg-gray-50/70 text-xs">
                  <table className="w-full border-collapse">
                    <tbody>
                      <tr>
                        <td className="py-1 px-2 font-bold text-[#005c56] w-1/4">Nhân Viên Phụ Trách:</td>
                        <td className="py-1 px-2 font-black text-gray-900 w-1/4">{fastStaff || 'Dung Trần (FAST)'}</td>
                        <td className="py-1 px-2 font-bold text-[#005c56] w-1/4">Tên Khách Hàng / Đơn Vị:</td>
                        <td className="py-1 px-2 font-black text-gray-900 w-1/4">{custName || 'Chưa cung cấp'}</td>
                      </tr>
                      <tr>
                        <td className="py-1 px-2 font-bold text-[#005c56]">Người Liên Hệ:</td>
                        <td className="py-1 px-2 text-gray-800">{custContact || '-'}</td>
                        <td className="py-1 px-2 font-bold text-[#005c56]">Số Điện Thoại:</td>
                        <td className="py-1 px-2 text-gray-800">{custPhone || '-'}</td>
                      </tr>
                      <tr>
                        <td className="py-1 px-2 font-bold text-[#005c56]">Địa Chỉ Bếp Ăn / Cơ Sở:</td>
                        <td className="py-1 px-2 text-gray-800" colSpan={3}>{custLocation || 'Chưa cung cấp'}</td>
                      </tr>
                      <tr>
                        <td className="py-1 px-2 font-bold text-[#005c56]">Ngày Order:</td>
                        <td className="py-1 px-2 text-gray-800">{formatDateVN(custOrderDate)}</td>
                        <td className="py-1 px-2 font-bold text-[#005c56]">Trạng Thái Hồ Sơ:</td>
                        <td className="py-1 px-2 text-gray-800">{custStatus}</td>
                      </tr>
                      <tr>
                        <td className="py-1 px-2 font-bold text-[#005c56]">Ngày FAST Nộp:</td>
                        <td className="py-1 px-2 text-gray-800">{formatDateVN(custSubmitDate)}</td>
                        <td className="py-1 px-2 font-bold text-[#005c56]">Hạn Giải Quyết (20N):</td>
                        <td className="py-1 px-2 font-black text-amber-700">{formatDateVN(custTargetDate)}</td>
                      </tr>
                      <tr>
                        <td className="py-1 px-2 font-bold text-[#005c56]">Ngày Thẩm Định:</td>
                        <td className="py-1 px-2 text-gray-800">{formatDateVN(custInspectDate)}</td>
                        <td className="py-1 px-2 font-bold text-[#005c56]">Số Giấy Chứng Nhận:</td>
                        <td className="py-1 px-2 font-black text-gray-900">{custCertNumber || '-'}</td>
                      </tr>
                      <tr>
                        <td className="py-1 px-2 font-bold text-[#005c56]">Ngày Cấp GCN:</td>
                        <td className="py-1 px-2 text-gray-800">{formatDateVN(custCertDate)}</td>
                        <td className="py-1 px-2 font-bold text-red-600">Ngày Hết Hạn (+3 năm):</td>
                        <td className="py-1 px-2 font-black text-red-600">{formatDateVN(custExpireDate)}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                {/* Checklist items list */}
                <div className="mb-4">
                  <table className="w-full text-xs text-left border-collapse border border-gray-300">
                    <thead>
                      <tr className="bg-gray-100 border-b border-gray-300">
                        <th className="p-2 border border-gray-300 w-16 text-center">Đã Có</th>
                        <th className="p-2 border border-gray-300 w-12 text-center">STT</th>
                        <th className="p-2 border border-gray-300">Tên Hồ Sơ / Tài Liệu Cần Cung Cấp</th>
                        <th className="p-2 border border-gray-300 w-24">Quy Cách</th>
                        <th className="p-2 border border-gray-300">Yêu Cầu &amp; Ghi Chú Của FAST</th>
                      </tr>
                    </thead>
                    <tbody>
                      {CHECKLIST_DOCS.map((doc) => {
                        const isChecked = !!checklist[doc.id];
                        return (
                          <tr key={doc.id} className="border-b border-gray-300">
                            <td className="p-2 border border-gray-300 text-center font-bold text-base">
                              {isChecked ? '✓' : '[  ]'}
                            </td>
                            <td className="p-2 border border-gray-300 text-center font-bold text-gray-400">{doc.stt}</td>
                            <td className="p-2 border border-gray-300">
                              <div className="font-bold text-gray-900">{doc.name}</div>
                              <div className="text-[10px] text-gray-500 italic mt-0.5">{doc.guidance}</div>
                            </td>
                            <td className="p-2 border border-gray-300 text-[10.5px]">
                              {doc.badgeCount}
                            </td>
                            <td className="p-2 border border-gray-300 text-[10.5px] text-gray-600 leading-snug">
                              {doc.details}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Signatures block */}
                <div className="grid grid-cols-2 gap-4 text-center mt-6 text-xs page-break-inside-avoid">
                  <div className="flex flex-col items-center justify-between min-h-[110px]">
                    <div>
                      <p className="font-bold uppercase tracking-wider text-gray-800">ĐẠI DIỆN KHÁCH HÀNG / DOANH NGHIỆP</p>
                      <p className="text-[10px] text-gray-500 italic">(Ký, ghi rõ họ tên &amp; đóng dấu)</p>
                    </div>
                    <div className="font-bold text-gray-900 border-t border-gray-400 pt-1 w-44">
                      {custContact || 'Khách hàng'}
                    </div>
                  </div>

                  <div className="flex flex-col items-center justify-between min-h-[110px]">
                    <div>
                      <p className="font-bold uppercase tracking-wider text-[#005c56]">CHUYÊN VIÊN FAST TIẾP NHẬN HỒ SƠ</p>
                      <p className="text-[10px] text-gray-500 italic">(Ký &amp; ghi rõ họ tên)</p>
                    </div>
                    <div className="font-bold text-gray-900 border-t border-gray-400 pt-1 w-44">
                      {fastStaff || 'Dung Trần (FAST)'}
                    </div>
                  </div>
                </div>
              </div>
            </td>
          </tr>
        </tbody>

        <tfoot>
          <tr>
            <td className="p-0 border-none">
              <div id="attp-print-footer" className="pt-3 border-t border-gray-300">
                <div className="text-center space-y-1">
                  <div className="text-[#005c56] font-black text-[11px] uppercase tracking-wider">
                    FAST CONSULTING • FOOD ALL STANDARD &amp; TRAINING
                  </div>
                  <div className="text-gray-700 text-[10.5px]">
                    Dịch vụ tư vấn Doanh nghiệp và Tư vấn hệ thống Quản lý chất lượng
                  </div>
                  <div className="text-gray-900 font-bold text-[10.5px]">
                    Tổng đài Tư vấn &amp; Tiếp nhận hồ sơ: <span className="text-red-600 font-black">0927 002 668</span>
                  </div>
                  <div className="text-gray-400 text-[9px] mt-1">
                    © 2026 FAST CONSULTING.
                  </div>
                </div>
              </div>
            </td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
};

export default FastFoodSafetyManagement;
