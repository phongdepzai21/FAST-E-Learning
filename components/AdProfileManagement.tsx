import React, { useState, useEffect, useMemo } from 'react';
import { db } from '../firebase';
import { doc, setDoc, onSnapshot } from 'firebase/firestore';
import { 
  Building2, 
  FileText, 
  CheckCircle2, 
  AlertCircle, 
  Clock, 
  ExternalLink, 
  Phone, 
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
  Database
} from 'lucide-react';

interface CustomerRecord {
  id: string;
  fastStaff: string;
  name: string;
  phone: string;
  location: string;
  orderDate: string;
  submitDate: string;
  targetDate: string;
  actualDate: string;
  status: string;
  receipt: string;
  completedCount: number;
  totalDocs: number;
  rate: number;
  checklist: Record<string, boolean>;
  images?: string[];
  updatedAt: string;
}

const CRM_DB_KEY = 'FAST_CUSTOMER_CRM_DATABASE_1.004650_V1';
const CUST_ACTIVE_KEY = 'FAST_CUSTOMER_DATA_1.004650_ACTIVE_V1';

const INITIAL_DOCS = [
  {
    id: 'doc-1',
    name: 'Văn bản thông báo sản phẩm quảng cáo',
    guidance: 'Theo Mẫu số 01 Phụ lục III ban hành kèm Thông tư số 13/2023/TT-BVHTTDL ngày 30/10/2023 của Bộ trưởng Bộ Văn hóa, Thể thao và Du lịch.',
    legalRef: 'Mẫu chuẩn: Mẫu số 01 Thông tư 13/2023/TT-BVHTTDL',
    qty: '01 Bản chính (Ký tên & đóng dấu)',
    type: 'Bắt buộc',
    badge: 'original',
    desc: 'FAST hỗ trợ khách hàng soạn thảo và điền thông tin nội dung, kích thước, địa điểm, thời gian treo và đơn vị thực hiện.'
  },
  {
    id: 'doc-2',
    name: 'Bản phối cảnh vị trí đặt bảng quảng cáo',
    guidance: 'Hình ảnh mô phỏng không gian thực tế đặt bảng quảng cáo hoặc vị trí treo băng-rôn thể hiện rõ hướng nhìn, kích thước tương quan với cảnh quan xung quanh.',
    legalRef: 'Yêu cầu quy chuẩn vị trí',
    qty: '01 Bản chính (Ảnh chụp in màu rõ nét)',
    type: 'Bắt buộc',
    badge: 'original',
    desc: 'Chụp rõ tầm nhìn phía trước, không che khuất biển báo giao thông hay đèn tín hiệu.'
  },
  {
    id: 'doc-3',
    name: 'Ma-két (Maquette) sản phẩm quảng cáo in màu',
    guidance: 'Có chữ ký của người kinh doanh dịch vụ quảng cáo hoặc người quảng cáo (trường hợp tự thực hiện). Nếu người quảng cáo là tổ chức thì phải có đóng dấu của tổ chức.',
    legalRef: 'Quy chuẩn tiếng Việt',
    qty: '01 Bản chính (In màu khổ A4 hoặc A3)',
    type: 'Bắt buộc',
    badge: 'original',
    desc: 'Chữ viết tiếng Việt phải nằm phía trên hoặc kích thước lớn hơn tiếng nước ngoài (khổ chữ nước ngoài không quá 3/4 chữ tiếng Việt).'
  },
  {
    id: 'doc-4',
    name: 'Văn bản chứng minh quyền sở hữu hoặc quyền sử dụng địa điểm quảng cáo',
    guidance: 'Hợp đồng thuê mặt bằng, hợp đồng thuê bảng/vị trí đặt biển hoặc văn bản đồng ý cho phép sử dụng địa điểm quảng cáo đối với băng-rôn của chủ sở hữu/quản lý vị trí.',
    legalRef: 'Hợp đồng địa điểm',
    qty: '01 Bản chính (Hoặc bản sao chứng thực)',
    type: 'Bắt buộc',
    badge: 'original',
    desc: 'Hợp đồng thuê địa điểm phải còn hiệu lực đầy đủ trong suốt thời gian thông báo thực hiện quảng cáo.'
  },
  {
    id: 'doc-5',
    name: 'Giấy tờ chứng minh sự hợp chuẩn, hợp quy hoặc điều kiện quảng cáo',
    guidance: 'Bản sao giấy tờ chứng minh sự hợp chuẩn, hợp quy của sản phẩm, hàng hoá, dịch vụ theo quy định pháp luật hoặc giấy tờ chứng minh đủ điều kiện để quảng cáo theo quy định tại Điều 20 của Luật Quảng cáo.',
    legalRef: 'Điều 20 Luật Quảng cáo 2012',
    qty: '01 Bản sao (Bản sao chứng thực hoặc mộc treo)',
    type: 'Bắt buộc',
    badge: 'copy',
    desc: 'Theo từng ngành hàng (Ví dụ: Thực phẩm chức năng cần Giấy xác nhận nội dung quảng cáo; Mỹ phẩm cần Phiếu công bố...).'
  },
  {
    id: 'doc-6',
    name: 'Giấy phép xây dựng công trình quảng cáo (nếu thuộc diện cấp phép)',
    guidance: 'Bản sao Giấy phép xây dựng đối với bảng quảng cáo đứng độc lập có diện tích một mặt từ 40m² trở lên, hoặc bảng gắn vào công trình đô thị có diện tích từ 20m² trở lên theo quy định tại Khoản 2 Điều 31 Luật Quảng cáo.',
    legalRef: 'Khoản 2 Điều 31 Luật Quảng cáo',
    qty: '01 Bản sao (Kèm bản vẽ kỹ thuật)',
    type: 'Khi có bảng tấm lớn',
    badge: 'optional',
    desc: 'Chỉ áp dụng với bảng Pano/Billboard cỡ lớn ngoài trời. Băng-rôn hoặc bảng biển hiệu nhỏ gắn tường không yêu cầu mục này.'
  },
  {
    id: 'doc-7',
    name: 'Văn bản về việc tổ chức sự kiện (nếu quảng cáo cho sự kiện)',
    guidance: 'Bản sao văn bản về việc tổ chức sự kiện của đơn vị tổ chức trong trường hợp quảng cáo cho sự kiện, chương trình hội chợ, thể thao, biểu diễn hoặc chính sách xã hội.',
    legalRef: 'Sự kiện được phê duyệt',
    qty: '01 Bản sao hợp lệ',
    type: 'Khi quảng cáo sự kiện',
    badge: 'optional',
    desc: 'Chỉ áp dụng khi nội dung trên băng-rôn hoặc bảng quảng cáo thông báo cho một sự kiện cụ thể có xin phép trước.'
  }
];

export const AdProfileManagement: React.FC = () => {
  // Database states
  const [database, setDatabase] = useState<CustomerRecord[]>(() => {
    try {
      const raw = localStorage.getItem(CRM_DB_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch (e) {
      return [];
    }
  });

  // Current active customer form
  const [currentId, setCurrentId] = useState<string | null>(null);
  const [fastStaff, setFastStaff] = useState<string>('');
  const [custName, setCustName] = useState<string>('');
  const [custPhone, setCustPhone] = useState<string>('');
  const [custLocation, setCustLocation] = useState<string>('');
  const [orderDate, setOrderDate] = useState<string>(() => new Date().toISOString().slice(0, 10));
  const [submitDate, setSubmitDate] = useState<string>('');
  const [targetDate, setTargetDate] = useState<string>('');
  const [actualDate, setActualDate] = useState<string>('');
  const [custStatus, setCustStatus] = useState<string>('Đang chuẩn bị hồ sơ');
  const [custReceipt, setCustReceipt] = useState<string>('');

  // 7 checklist docs state
  const [checklist, setChecklist] = useState<Record<string, boolean>>({});

  // Attached images state (Base64)
  const [images, setImages] = useState<string[]>([]);

  // UI state
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [filterPendingOnly, setFilterPendingOnly] = useState<boolean>(false);
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    secChecklist: true,
    secProcess: true,
    secMethods: false,
    secTechnical: false,
    secLegal: false
  });
  const [syncStatus, setSyncStatus] = useState<string>('Đã đồng bộ');
  const [cloudSynced, setCloudSynced] = useState<boolean>(true);
  const [isCloudSaving, setIsCloudSaving] = useState<boolean>(false);

  // Synchronize with Cloud Firestore and Server Disk API
  useEffect(() => {
    let unsubscribe: (() => void) | undefined;
    try {
      const docRef = doc(db, 'ad_profile_crm', 'database');
      unsubscribe = onSnapshot(docRef, (docSnap) => {
        if (docSnap.exists()) {
          const data = docSnap.data();
          if (Array.isArray(data?.records) && data.records.length > 0) {
            setDatabase(data.records);
            setCloudSynced(true);
            try {
              localStorage.setItem(CRM_DB_KEY, JSON.stringify(data.records));
            } catch (e) {}
          }
        }
      }, (err) => {
        console.warn('Firestore onSnapshot fallback notice:', err);
      });
    } catch (e) {
      console.warn('Firestore initialization notice:', e);
    }

    // Secondary sync from server disk
    fetch('/api/ad-profiles')
      .then(res => res.json())
      .then(data => {
        if (data?.success && Array.isArray(data.records) && data.records.length > 0) {
          setDatabase(prev => (prev.length === 0 ? data.records : prev));
          setCloudSynced(true);
        }
      })
      .catch(() => {});

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, []);

  // Persist to local storage, Cloud Firestore & Server Disk API
  const persistDatabase = async (newDb: CustomerRecord[]) => {
    setIsCloudSaving(true);
    setDatabase(newDb);

    // 1. LocalStorage
    try {
      localStorage.setItem(CRM_DB_KEY, JSON.stringify(newDb));
    } catch (e) {}

    // 2. Cloud Firestore
    try {
      await setDoc(doc(db, 'ad_profile_crm', 'database'), {
        records: newDb,
        updatedAt: new Date().toISOString()
      }, { merge: true });
      setCloudSynced(true);
    } catch (err) {
      console.warn('Firestore sync notice:', err);
    }

    // 3. Server Disk API
    try {
      await fetch('/api/ad-profiles/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'sync_all', records: newDb })
      });
      setCloudSynced(true);
    } catch (err) {}

    setIsCloudSaving(false);
  };

  // Load last active customer
  useEffect(() => {
    try {
      const saved = localStorage.getItem(CUST_ACTIVE_KEY);
      if (saved) {
        const d = JSON.parse(saved);
        setCurrentId(d.id || null);
        setFastStaff(d.fastStaff || '');
        setCustName(d.name || '');
        setCustPhone(d.phone || '');
        setCustLocation(d.location || '');
        setOrderDate(d.orderDate || new Date().toISOString().slice(0, 10));
        setSubmitDate(d.submitDate || '');
        setTargetDate(d.targetDate || '');
        setActualDate(d.actualDate || '');
        setCustStatus(d.status || 'Đang chuẩn bị hồ sơ');
        setCustReceipt(d.receipt || '');
        setChecklist(d.checklist || {});
        setImages(d.images || []);
      }
    } catch (e) {}
  }, []);

  // Save active draft
  const saveActiveDraft = () => {
    const active = {
      id: currentId || ('cust_' + Date.now()),
      fastStaff,
      name: custName,
      phone: custPhone,
      location: custLocation,
      orderDate,
      submitDate,
      targetDate,
      actualDate,
      status: custStatus,
      receipt: custReceipt,
      checklist,
      images
    };
    try {
      localStorage.setItem(CUST_ACTIVE_KEY, JSON.stringify(active));
      setSyncStatus('Đã lưu nháp');
      setTimeout(() => setSyncStatus('Tự động đồng bộ CSDL'), 2000);
    } catch (e) {}
  };

  // Auto calculate business days (+5 working days skipping Sat, Sun)
  const calculateBusinessDays = (startDateStr: string, numBusinessDays = 5) => {
    if (!startDateStr) return '';
    const parts = startDateStr.split('-');
    if (parts.length !== 3) return '';
    
    const date = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
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

  const calculateCalendarDays = (startDateStr: string, numDays = 5) => {
    if (!startDateStr) return '';
    const parts = startDateStr.split('-');
    if (parts.length !== 3) return '';
    
    const date = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
    date.setDate(date.getDate() + numDays);

    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  };

  const handleFastSubmitDateChange = (mode: 'business' | 'calendar' = 'business') => {
    if (!submitDate) return;
    const deadline = mode === 'business' ? calculateBusinessDays(submitDate, 5) : calculateCalendarDays(submitDate, 5);
    setTargetDate(deadline);
    if (custStatus === 'Đang chuẩn bị hồ sơ') {
      setCustStatus('Đã nộp Sở - Chờ 5 ngày');
    }
    saveActiveDraft();
  };

  // Toggle checkbox
  const handleChecklistToggle = (docId: string) => {
    const updated = {
      ...checklist,
      [docId]: !checklist[docId]
    };
    setChecklist(updated);
    
    // Auto update in database if record is saved
    if (currentId) {
      const idx = database.findIndex(c => c.id === currentId);
      if (idx >= 0) {
        const checkedCount = Object.values(updated).filter(Boolean).length;
        const newDb = [...database];
        newDb[idx] = {
          ...newDb[idx],
          checklist: updated,
          completedCount: checkedCount,
          rate: Math.round((checkedCount / 7) * 100),
          updatedAt: new Date().toLocaleString('vi-VN')
        };
        persistDatabase(newDb);
      }
    }
    saveActiveDraft();
  };

  // Reset checklist for current customer
  const resetChecklist = () => {
    if (window.confirm('Bạn có chắc chắn muốn làm mới toàn bộ 7 mục hồ sơ của khách hàng hiện tại?')) {
      setChecklist({});
      saveActiveDraft();
    }
  };

  // Save Customer to CRM DB
  const saveCustomerToCRM = () => {
    if (!custName.trim()) {
      alert('Vui lòng nhập Tên Khách Hàng / Doanh Nghiệp trước khi lưu vào danh sách.');
      return;
    }

    const checkedCount = Object.values(checklist).filter(Boolean).length;
    const recId = currentId || ('cust_' + Date.now());

    const newRecord: CustomerRecord = {
      id: recId,
      fastStaff: fastStaff.trim() || 'Chưa phân công',
      name: custName.trim(),
      phone: custPhone.trim() || 'Chưa có',
      location: custLocation.trim() || 'Chưa cung cấp',
      orderDate,
      submitDate,
      targetDate,
      actualDate,
      status: custStatus,
      receipt: custReceipt.trim(),
      completedCount: checkedCount,
      totalDocs: 7,
      rate: Math.round((checkedCount / 7) * 100),
      checklist,
      images,
      updatedAt: new Date().toLocaleString('vi-VN')
    };

    setCurrentId(recId);

    const idx = database.findIndex(c => c.id === recId);
    let newDb: CustomerRecord[];
    if (idx >= 0) {
      newDb = [...database];
      newDb[idx] = newRecord;
    } else {
      newDb = [newRecord, ...database];
    }

    persistDatabase(newDb);
    saveActiveDraft();
    alert(`Đã lưu và đồng bộ thành công hồ sơ khách hàng "${custName.trim()}" vào cơ sở dữ liệu FAST!`);
  };

  // New Customer creation
  const handleNewCustomer = () => {
    if (window.confirm('Tạo một hồ sơ khách hàng mới? Dữ liệu trên form hiện tại sẽ được đặt lại.')) {
      const newId = 'cust_' + Date.now();
      setCurrentId(newId);
      setFastStaff('');
      setCustName('');
      setCustPhone('');
      setCustLocation('');
      setOrderDate(new Date().toISOString().slice(0, 10));
      setSubmitDate('');
      setTargetDate('');
      setActualDate('');
      setCustStatus('Đang chuẩn bị hồ sơ');
      setCustReceipt('');
      setChecklist({});
      setImages([]);
      saveActiveDraft();
    }
  };

  // Load customer into form
  const loadCustomer = (c: CustomerRecord) => {
    setCurrentId(c.id);
    setFastStaff(c.fastStaff || '');
    setCustName(c.name || '');
    setCustPhone(c.phone || '');
    setCustLocation(c.location || '');
    setOrderDate(c.orderDate || '');
    setSubmitDate(c.submitDate || '');
    setTargetDate(c.targetDate || '');
    setActualDate(c.actualDate || '');
    setCustStatus(c.status || 'Đang chuẩn bị hồ sơ');
    setCustReceipt(c.receipt || '');
    setChecklist(c.checklist || {});
    setImages(c.images || []);
    saveActiveDraft();
    window.scrollTo({ top: 300, behavior: 'smooth' });
  };

  // Image Upload and Remove Handlers
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    Array.from(files).forEach(file => {
      if (!file.type.startsWith('image/')) {
        alert('Vui lòng chỉ tải lên các tệp tin hình ảnh.');
        return;
      }
      if (file.size > 5 * 1024 * 1024) {
        alert('Kích thước ảnh vượt quá 5MB. Vui lòng chọn ảnh nhỏ hơn.');
        return;
      }

      const reader = new FileReader();
      reader.onloadend = () => {
        if (typeof reader.result === 'string') {
          setImages(prev => {
            const updated = [...prev, reader.result as string];
            // Save active draft
            setTimeout(() => saveActiveDraft(), 50);
            return updated;
          });
        }
      };
      reader.readAsDataURL(file);
    });
  };

  const handleRemoveImage = (index: number) => {
    setImages(prev => {
      const updated = prev.filter((_, idx) => idx !== index);
      setTimeout(() => saveActiveDraft(), 50);
      return updated;
    });
  };

  // Delete customer
  const deleteCustomer = (id: string, name: string) => {
    if (window.confirm(`Bạn có chắc chắn muốn xóa hồ sơ khách hàng "${name}" khỏi cơ sở dữ liệu?`)) {
      const newDb = database.filter(c => c.id !== id);
      persistDatabase(newDb);
      if (currentId === id) {
        handleNewCustomer();
      }
    }
  };

  // Print function: specifically prints ONLY the checklist table
  const handlePrintChecklistOnly = () => {
    document.body.classList.add('printing-ad-checklist');
    const cleanUp = () => {
      document.body.classList.remove('printing-ad-checklist');
      window.removeEventListener('afterprint', cleanUp);
    };
    window.addEventListener('afterprint', cleanUp);
    setTimeout(() => {
      window.print();
      setTimeout(cleanUp, 2500);
    }, 150);
  };

  // KPI Calculations
  const stats = useMemo(() => {
    const total = database.length;
    let draft = 0;
    let submitted = 0;
    let completed = 0;

    database.forEach(c => {
      const s = c.status || '';
      if (s.includes('chuẩn bị')) draft++;
      else if (s.includes('Đã nộp')) submitted++;
      else if (s.includes('hoàn thành')) completed++;
      else draft++;
    });

    const slaRate = total > 0 ? Math.round(((completed + submitted) / total) * 100) : 100;

    return { total, draft, submitted, completed, slaRate };
  }, [database]);

  // Checklist completion count
  const checkedDocsCount = useMemo(() => {
    return Object.values(checklist).filter(Boolean).length;
  }, [checklist]);

  const progressPercent = Math.round((checkedDocsCount / 7) * 100);

  // Copy Zalo message
  const copyZaloMessage = () => {
    const staffLine = fastStaff ? `\n- Chuyên viên FAST phụ trách: ${fastStaff}` : '';
    const phoneLine = custPhone ? `\n- Số điện thoại: ${custPhone}` : '';
    const locLine = custLocation ? `\n- Địa điểm / Vị trí: ${custLocation}` : '';
    const greeting = custName ? `KÍNH GỬI: ${custName.toUpperCase()}` : 'KÍNH GỬI QUÝ KHÁCH HÀNG';

    const msg = `${greeting}${phoneLine}${locLine}
--------------------------------------------------
FAST CONSULTING trân trọng gửi Quý khách Danh mục hồ sơ cần chuẩn bị cho "Thủ tục tiếp nhận hồ sơ thông báo sản phẩm quảng cáo trên bảng quảng cáo, băng-rôn" (Mã TTHC: 1.004650):

1. VĂN BẢN THÔNG BÁO SẢN PHẨM QUẢNG CÁO
   • Số lượng: 01 bản chính (Ký tên, đóng dấu).
   • Hướng dẫn: FAST hỗ trợ soạn thảo nội dung, kích thước, địa điểm, thời gian treo theo Mẫu số 01 Thông tư 13/2023/TT-BVHTTDL.

2. BẢN PHỐI CẢNH VỊ TRÍ ĐẶT BẢNG / BĂNG-RÔN
   • Số lượng: 01 bản in màu rõ nét.
   • Hướng dẫn: Chụp rõ tầm nhìn phía trước, không che khuất biển báo giao thông hay đèn tín hiệu.

3. MA-KÉT (MAQUETTE) SẢN PHẨM QUẢNG CÁO
   • Số lượng: 01 bản in màu khổ A4 hoặc A3 (Ký tên, đóng dấu).
   • Hướng dẫn: Chữ tiếng Việt nằm phía trên hoặc kích thước lớn hơn tiếng nước ngoài (chữ nước ngoài <= 3/4 chữ tiếng Việt).

4. GIẤY TỜ CHỨNG MINH QUYỀN SỞ HỮU / SỬ DỤNG ĐỊA ĐIỂM
   • Số lượng: 01 bản chính hoặc sao y công chứng.
   • Hướng dẫn: Hợp đồng thuê mặt bằng, thuê bảng hoặc văn bản đồng ý cho phép sử dụng địa điểm (còn hạn hiệu lực).

5. GIẤY TỜ CHỨNG MINH ĐIỀU KIỆN QUẢNG CÁO / HỢP CHUẨN, HỢP QUY
   • Số lượng: 01 bản sao chứng thực hoặc mộc treo.
   • Hướng dẫn: Theo ngành hàng (VD: Xác nhận nội dung QC thực phẩm chức năng, Phiếu công bố mỹ phẩm, ĐKKD...).

6. GIẤY PHÉP XÂY DỰNG CÔNG TRÌNH QUẢNG CÁO (NẾU THUỘC DIỆN CẤP PHÉP)
   • Số lượng: 01 bản sao kèm bản vẽ kỹ thuật.
   • Hướng dẫn: Chỉ áp dụng bảng đứng độc lập >= 40m2 hoặc bảng gắn công trình >= 20m2.

7. VĂN BẢN TỔ CHỨC SỰ KIỆN (NẾU QUẢNG CÁO SỰ KIỆN)
   • Số lượng: 01 bản sao hợp lệ (chỉ áp dụng khi quảng cáo sự kiện cụ thể).

LƯU Ý TỪ FAST CONSULTING:
- Quý khách chỉ cần chuẩn bị 01 bộ hồ sơ.
- Bản scan hoặc ảnh chụp gửi FAST cần rõ nét, phẳng góc, quét từ bản gốc để FAST thẩm tra nộp trực tuyến ngay.
--------------------------------------------------
THÔNG TIN LIÊN HỆ & TIẾP NHẬN 24/7:${staffLine}
- Hotline FAST: 0927 002 668
- FAST CONSULTING • Food All Standard & Training`;

    navigator.clipboard.writeText(msg).then(() => {
      alert('Đã sao chép thành công tin nhắn danh mục hồ sơ! Bạn có thể dán (Paste) vào Zalo / Email để gửi ngay cho khách hàng.');
    }).catch(() => {
      alert('Không thể sao chép tự động. Vui lòng cho phép quyền truy cập Clipboard.');
    });
  };

  // Export Excel CSV
  const exportToExcel = () => {
    if (database.length === 0) {
      alert('Chưa có dữ liệu khách hàng nào để xuất file Excel.');
      return;
    }

    let csv = '\uFEFF';
    csv += 'STT,Nhân Viên FAST Phụ Trách,Tên Khách Hàng / Đơn Vị,Số Điện Thoại,Địa Điểm Cơ Sở / Vị Trí,Ngày Order,Ngày FAST Nộp Hồ Sơ,Hạn Quy Định (05N),Ngày Thực Tế Hoàn Thành,Số Biên Nhận / Mã Hồ Sơ,Tiến Độ Checklist,Tỷ Lệ %,Trạng Thái Tiến Độ,Thời Gian Cập Nhật\n';

    database.forEach((c, idx) => {
      const staff = `"${(c.fastStaff || '').replace(/"/g, '""')}"`;
      const name = `"${(c.name || '').replace(/"/g, '""')}"`;
      const phone = `"${(c.phone || '').replace(/"/g, '""')}"`;
      const loc = `"${(c.location || '').replace(/"/g, '""')}"`;
      const oDate = `"${c.orderDate || ''}"`;
      const sDate = `"${c.submitDate || ''}"`;
      const tDate = `"${c.targetDate || ''}"`;
      const aDate = `"${c.actualDate || ''}"`;
      const receipt = `"${c.receipt || ''}"`;
      const progress = `"${c.completedCount || 0}/7"`;
      const rate = `"${c.rate || 0}%"`;
      const status = `"${c.status || ''}"`;
      const updated = `"${c.updatedAt || ''}"`;

      csv += `${idx + 1},${staff},${name},${phone},${loc},${oDate},${sDate},${tDate},${aDate},${receipt},${progress},${rate},${status},${updated}\n`;
    });

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `FAST_CRM_QuangCao_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const toggleSection = (key: string) => {
    setOpenSections(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  const toggleAllSections = () => {
    const anyClosed = Object.values(openSections).some(v => !v);
    const updated: Record<string, boolean> = {};
    Object.keys(openSections).forEach(k => {
      updated[k] = anyClosed;
    });
    setOpenSections(updated);
  };

  return (
    <div>
      {/* SCREEN VIEW (Hidden when printing checklist) */}
      <div className="ad-profile-screen-only space-y-6">
        {/* Header Banner */}
        <div className="bg-gradient-to-r from-[#005c56] to-[#00423e] rounded-3xl p-6 md:p-8 text-white shadow-lg relative overflow-hidden">
          <div className="absolute top-0 right-0 w-80 h-80 bg-white/5 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none"></div>
          <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
            <div>
              <div className="flex flex-wrap items-center gap-2 mb-2">
                <span className="px-3 py-1 rounded-full bg-white/10 text-teal-200 text-xs font-bold uppercase tracking-wider">
                  Mã TTHC: 1.004650 &bull; CẤP TỈNH
                </span>
                <span className="px-3 py-1 rounded-full bg-white/10 text-teal-200 text-xs font-bold uppercase tracking-wider">
                  QĐ: 190/QĐ-BVHTTDL
                </span>
                <span className="px-3 py-1 rounded-full bg-emerald-400/20 text-emerald-200 border border-emerald-300/30 text-xs font-bold flex items-center gap-1.5">
                  <span className={`w-2 h-2 rounded-full ${isCloudSaving ? 'bg-amber-400 animate-spin' : 'bg-emerald-400 animate-pulse'}`}></span>
                  {isCloudSaving ? 'Đang Lưu Trữ CSDL...' : 'Đã Đồng Bộ CSDL Đám Mây'}
                </span>
              </div>
              <h1 className="text-2xl md:text-3xl font-black uppercase tracking-tight">
                Quản Lý Toàn Trình Hồ Sơ Quảng Cáo Bảng &amp; Băng-Rôn
              </h1>
              <p className="text-teal-100/90 text-xs md:text-sm font-medium mt-1 max-w-2xl">
                Hệ thống quản trị hồ sơ, đếm ngược thời hạn thụ lý 05 ngày làm việc và giám sát cơ sở dữ liệu khách hàng FAST CONSULTING.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              <a
                href="https://dichvucong.gov.vn"
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
        <div className="p-3.5 bg-gradient-to-br from-indigo-50/80 to-purple-50/40 border-l-4 border-l-indigo-600 rounded-r-xl shadow-xs">
          <div className="font-bold text-indigo-950/70 uppercase text-[10px] tracking-wider">Cơ quan thẩm quyền</div>
          <div className="font-black text-indigo-950 text-sm mt-0.5">Sở Văn hóa &amp; Thể thao / Sở VHTTDL</div>
        </div>

        <div className="p-3.5 bg-gradient-to-br from-amber-50/80 to-orange-50/40 border-l-4 border-l-amber-500 rounded-r-xl shadow-xs">
          <div className="font-bold text-amber-950/70 uppercase text-[10px] tracking-wider">Thời hạn giải quyết</div>
          <div className="font-black text-amber-900 text-sm mt-0.5">05 ngày làm việc (SLA FAST)</div>
        </div>

        <div className="p-3.5 bg-gradient-to-br from-emerald-50/80 to-teal-50/40 border-l-4 border-l-emerald-500 rounded-r-xl shadow-xs">
          <div className="font-bold text-emerald-950/70 uppercase text-[10px] tracking-wider">Lệ phí nhà nước</div>
          <div className="font-black text-emerald-800 text-sm mt-0.5">Miễn phí 100% (0 VNĐ)</div>
        </div>

        <div className="p-3.5 bg-gradient-to-br from-sky-50/80 to-blue-50/40 border-l-4 border-l-blue-600 rounded-r-xl shadow-xs">
          <div className="font-bold text-blue-950/70 uppercase text-[10px] tracking-wider">Kết quả &amp; Pháp lý</div>
          <div className="font-black text-blue-900 text-sm mt-0.5">Mã KQ.G16.000416 (Mặc nhiên hiệu lực)</div>
        </div>
      </div>

      {/* CRM Dashboard KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="bg-gradient-to-b from-teal-50/60 to-white p-4 rounded-2xl border-2 border-teal-500/40 shadow-sm transition-transform hover:scale-[1.02]">
          <div className="text-[10.5px] font-black uppercase tracking-wider text-teal-800">TỔNG KHÁCH HÀNG / ORDER</div>
          <div className="text-3xl font-black text-teal-900 my-1">{stats.total}</div>
          <div className="text-[11px] font-semibold text-teal-700/80">Hồ sơ trong hệ thống</div>
        </div>

        <div className="bg-gradient-to-b from-amber-50/60 to-white p-4 rounded-2xl border-2 border-amber-400 shadow-sm transition-transform hover:scale-[1.02]">
          <div className="text-[10.5px] font-black uppercase tracking-wider text-amber-800">ĐANG CHUẨN BỊ HỒ SƠ</div>
          <div className="text-3xl font-black text-amber-700 my-1">{stats.draft}</div>
          <div className="text-[11px] font-semibold text-amber-700/80">Chưa nộp Sở</div>
        </div>

        <div className="bg-gradient-to-b from-sky-50/60 to-white p-4 rounded-2xl border-2 border-blue-400 shadow-sm transition-transform hover:scale-[1.02]">
          <div className="text-[10.5px] font-black uppercase tracking-wider text-blue-800">ĐÃ NỘP SỞ (ĐẾM NGƯỢC 5N)</div>
          <div className="text-3xl font-black text-blue-700 my-1">{stats.submitted}</div>
          <div className="text-[11px] font-semibold text-blue-700/80">Đang trong thời hạn thụ lý</div>
        </div>

        <div className="bg-gradient-to-b from-emerald-50/60 to-white p-4 rounded-2xl border-2 border-emerald-500 shadow-sm transition-transform hover:scale-[1.02]">
          <div className="text-[10.5px] font-black uppercase tracking-wider text-emerald-800">HOÀN THÀNH / HIỆU LỰC</div>
          <div className="text-3xl font-black text-emerald-700 my-1">{stats.completed}</div>
          <div className="text-[11px] font-semibold text-emerald-700/80">Mặc nhiên được phép treo</div>
        </div>

        <div className="bg-gradient-to-br from-emerald-600 to-teal-700 text-white p-4 rounded-2xl shadow-md shadow-teal-700/20 transition-transform hover:scale-[1.02]">
          <div className="text-[10.5px] font-black uppercase tracking-wider text-emerald-100">TỶ LỆ ĐÚNG HẠN SLA</div>
          <div className="text-3xl font-black text-white my-1 drop-shadow-sm">{stats.slaRate}%</div>
          <div className="text-[11px] font-medium text-emerald-100">Chỉ số cam kết FAST</div>
        </div>
      </div>

      {/* CRM Database Table */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="p-4 bg-gray-50 border-b border-gray-200 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-[#005c56]" />
            <h2 className="text-xs font-black uppercase text-gray-800 tracking-wider">
              Cơ Sở Dữ Liệu Theo Dõi Toàn Trình (FAST CRM)
            </h2>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={exportToExcel}
              className="px-3 py-1.5 bg-green-700 hover:bg-green-800 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              Xuất File Excel (CSV)
            </button>
            <button
              onClick={handleNewCustomer}
              className="px-3 py-1.5 bg-[#005c56] hover:bg-[#00423e] text-white rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all"
            >
              <Plus className="w-3.5 h-3.5" />
              + Tạo Hồ Sơ Khách Mới
            </button>
          </div>
        </div>

        <div className="overflow-x-auto max-h-[300px]">
          <table className="w-full text-left text-xs border-collapse min-w-[980px]">
            <thead className="sticky top-0 bg-teal-50/90 text-[#005c56] font-bold z-10 border-b border-teal-200">
              <tr>
                <th className="p-2.5 text-center w-12">STT</th>
                <th className="p-2.5 w-32">Nhân Viên FAST</th>
                <th className="p-2.5">Tên Khách Hàng / Đơn Vị</th>
                <th className="p-2.5 w-28">Số Điện Thoại</th>
                <th className="p-2.5">Địa Điểm / Vị Trí</th>
                <th className="p-2.5 w-24">Ngày Order</th>
                <th className="p-2.5 w-24">Ngày Nộp</th>
                <th className="p-2.5 w-24">Hạn QĐ</th>
                <th className="p-2.5 w-24">Thực Tế</th>
                <th className="p-2.5 text-center w-20">Checklist</th>
                <th className="p-2.5 text-center w-36">Trạng Thái</th>
                <th className="p-2.5 text-center w-20">Thao Tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {database.length === 0 ? (
                <tr>
                  <td colSpan={12} className="p-6 text-center text-gray-400 font-medium italic">
                    Chưa có hồ sơ nào. Nhập thông tin phía dưới và nhấn "Lưu Vào Thống Kê" để tạo mới.
                  </td>
                </tr>
              ) : (
                database.map((c, idx) => {
                  const isCurrent = c.id === currentId;
                  let pillClass = 'bg-amber-100 text-amber-800 border-amber-300';
                  if (c.status.includes('Đã nộp')) pillClass = 'bg-blue-100 text-blue-800 border-blue-300';
                  else if (c.status.includes('hoàn thành')) pillClass = 'bg-green-100 text-green-800 border-green-300';
                  else if (c.status.includes('Chậm') || c.status.includes('bổ sung')) pillClass = 'bg-red-100 text-red-800 border-red-300';

                  return (
                    <tr key={c.id} className={`hover:bg-teal-50/30 transition-colors ${isCurrent ? 'bg-teal-50/70 font-semibold' : ''}`}>
                      <td className="p-2.5 text-center font-bold text-gray-600">{idx + 1}</td>
                      <td className="p-2.5 text-gray-700 font-semibold">{c.fastStaff || 'Chưa gán'}</td>
                      <td className="p-2.5 font-bold text-gray-900">{c.name}</td>
                      <td className="p-2.5">
                        {c.phone && c.phone !== 'Chưa có' ? (
                           <a href={`tel:${c.phone}`} className="text-[#005c56] hover:underline font-semibold flex items-center gap-1">
                            <Phone className="w-3 h-3" />
                            {c.phone}
                          </a>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>
                      <td className="p-2.5 text-gray-600">{c.location}</td>
                      <td className="p-2.5 text-gray-600">{c.orderDate || '-'}</td>
                      <td className="p-2.5 font-semibold text-[#005c56]">{c.submitDate || '-'}</td>
                      <td className="p-2.5 font-semibold text-amber-700">{c.targetDate || '-'}</td>
                      <td className="p-2.5 font-semibold text-green-700">{c.actualDate || '-'}</td>
                      <td className="p-2.5 text-center font-bold">{c.completedCount || 0}/7</td>
                      <td className="p-2.5 text-center">
                        <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-black border ${pillClass}`}>
                          {c.status}
                        </span>
                      </td>
                      <td className="p-2.5 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => loadCustomer(c)}
                            className="p-1 text-gray-500 hover:text-teal-700 hover:bg-teal-50 rounded"
                            title="Sửa / Xem chi tiết"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => deleteCustomer(c.id, c.name)}
                            className="p-1 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded"
                            title="Xóa hồ sơ"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
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

      {/* Customer Record Edit Form */}
      <div className="bg-white p-6 rounded-2xl border-2 border-[#005c56]/40 shadow-sm space-y-4">
        <div className="flex flex-wrap items-center justify-between border-b border-dashed border-gray-200 pb-3 gap-2">
          <div className="flex items-center gap-2">
            <User className="w-5 h-5 text-[#005c56]" />
            <h2 className="text-sm font-black uppercase text-gray-800 tracking-wide">
              Quản Lý Toàn Trình Hồ Sơ Khách Hàng
            </h2>
          </div>
          <span className="text-[11px] font-bold text-green-700 bg-green-50 px-2.5 py-1 rounded-full border border-green-200 flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5" />
            {syncStatus}
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
          <div>
            <label className="block font-bold text-gray-700 mb-1">
              Nhân Viên FAST Phụ Trách: <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={fastStaff}
              onChange={(e) => { setFastStaff(e.target.value); saveActiveDraft(); }}
              placeholder="Nhập họ tên chuyên viên FAST..."
              className="w-full px-3 py-2 border border-gray-300 rounded-xl focus:ring-1 focus:ring-teal-500 outline-none"
            />
          </div>

          <div>
            <label className="block font-bold text-gray-700 mb-1">
              Tên Khách Hàng / Doanh Nghiệp: <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={custName}
              onChange={(e) => { setCustName(e.target.value); saveActiveDraft(); }}
              placeholder="Nhập tên khách hàng / công ty..."
              className="w-full px-3 py-2 border border-gray-300 rounded-xl focus:ring-1 focus:ring-teal-500 outline-none font-semibold"
            />
          </div>

          <div>
            <label className="block font-bold text-gray-700 mb-1">
              Số Điện Thoại Khách Hàng: <span className="text-red-500">*</span>
            </label>
            <input
              type="tel"
              value={custPhone}
              onChange={(e) => { setCustPhone(e.target.value); saveActiveDraft(); }}
              placeholder="VD: 0912 345 678..."
              className="w-full px-3 py-2 border border-gray-300 rounded-xl focus:ring-1 focus:ring-teal-500 outline-none"
            />
          </div>

          <div>
            <label className="block font-bold text-gray-700 mb-1">
              Địa Điểm Cơ Sở / Vị Trí QC: <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={custLocation}
              onChange={(e) => { setCustLocation(e.target.value); saveActiveDraft(); }}
              placeholder="Địa chỉ, tuyến đường treo..."
              className="w-full px-3 py-2 border border-gray-300 rounded-xl focus:ring-1 focus:ring-teal-500 outline-none"
            />
          </div>

          <div>
            <label className="block font-bold text-gray-700 mb-1">
              Mốc 1: Ngày Order / Tiếp Nhận: <span className="text-red-500">*</span>
            </label>
            <input
              type="date"
              value={orderDate}
              onChange={(e) => { setOrderDate(e.target.value); saveActiveDraft(); }}
              className="w-full px-3 py-2 border border-gray-300 rounded-xl focus:ring-1 focus:ring-teal-500 outline-none"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="font-bold text-gray-700">
                Mốc 2: Ngày FAST Nộp Hồ Sơ:
              </label>
              <a 
                href="https://dichvucong.gov.vn" 
                target="_blank" 
                rel="noopener noreferrer" 
                className="text-[10px] text-blue-600 hover:underline flex items-center gap-0.5 font-bold"
              >
                Cổng DVC <ExternalLink className="w-2.5 h-2.5" />
              </a>
            </div>
            <input
              type="date"
              value={submitDate}
              onChange={(e) => { setSubmitDate(e.target.value); }}
              onBlur={() => handleFastSubmitDateChange('business')}
              className="w-full px-3 py-2 border border-gray-300 rounded-xl focus:ring-1 focus:ring-teal-500 outline-none"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="font-bold text-gray-700">
                Mốc 3: Hạn Theo Quy Định (05N):
              </label>
              <div className="flex gap-1 text-[10px]">
                <button
                  type="button"
                  onClick={() => handleFastSubmitDateChange('business')}
                  className="px-1.5 py-0.5 bg-teal-50 text-teal-700 rounded border border-teal-200 hover:bg-teal-100 font-bold"
                  title="Tính 5 ngày làm việc (trừ T7, CN)"
                >
                  +5N làm việc
                </button>
                <button
                  type="button"
                  onClick={() => handleFastSubmitDateChange('calendar')}
                  className="px-1.5 py-0.5 bg-amber-50 text-amber-700 rounded border border-amber-200 hover:bg-amber-100 font-bold"
                  title="Tính 5 ngày lịch"
                >
                  +5N lịch
                </button>
              </div>
            </div>
            <input
              type="date"
              value={targetDate}
              onChange={(e) => { setTargetDate(e.target.value); saveActiveDraft(); }}
              className="w-full px-3 py-2 border border-gray-300 rounded-xl focus:ring-1 focus:ring-teal-500 outline-none font-semibold text-amber-700"
            />
          </div>

          <div>
            <label className="block font-bold text-gray-700 mb-1">
              Mốc 4: Ngày Thực Tế Hoàn Thành:
            </label>
            <input
              type="date"
              value={actualDate}
              onChange={(e) => { setActualDate(e.target.value); saveActiveDraft(); }}
              className="w-full px-3 py-2 border border-gray-300 rounded-xl focus:ring-1 focus:ring-teal-500 outline-none font-semibold text-green-700"
            />
          </div>

          <div>
            <label className="block font-bold text-gray-700 mb-1">
              Trạng Thái Tiến Độ Toàn Trình:
            </label>
            <select
              value={custStatus}
              onChange={(e) => { setCustStatus(e.target.value); saveActiveDraft(); }}
              className="w-full px-3 py-2 border border-gray-300 rounded-xl focus:ring-1 focus:ring-teal-500 outline-none bg-white font-semibold"
            >
              <option value="Đang chuẩn bị hồ sơ">🟡 Đang chuẩn bị hồ sơ (Drafting)</option>
              <option value="Đã nộp Sở - Chờ 5 ngày">🔵 Đã nộp Sở - Chờ 5 ngày làm việc</option>
              <option value="Đã hoàn thành đúng hạn">🟢 Đã hoàn thành / Mặc nhiên hiệu lực</option>
              <option value="Chậm trễ / Cần bổ sung">🔴 Chậm trễ / Cần bổ sung giải trình</option>
            </select>
          </div>

          <div>
            <label className="block font-bold text-gray-700 mb-1">
              Số Biên Nhận / Mã Hồ Sơ DVC:
            </label>
            <input
              type="text"
              value={custReceipt}
              onChange={(e) => { setCustReceipt(e.target.value); saveActiveDraft(); }}
              placeholder="VD: H01.2026.00416..."
              className="w-full px-3 py-2 border border-gray-300 rounded-xl focus:ring-1 focus:ring-teal-500 outline-none"
            />
          </div>

          <div className="sm:col-span-2 flex items-end justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={handleNewCustomer}
              className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-bold transition-all text-xs"
            >
              + Tạo mới
            </button>
            <button
              type="button"
              onClick={saveCustomerToCRM}
              className="px-5 py-2 bg-[#005c56] hover:bg-[#00423e] text-white rounded-xl font-black transition-all text-xs shadow-md shadow-teal-700/20"
            >
              Lưu Vào Thống Kê
            </button>
          </div>
        </div>
      </div>

      {/* Khối đính kèm hình ảnh minh họa (Phối cảnh & Ma-két) */}
      <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm space-y-4">
        <div className="flex items-center gap-2 border-b border-gray-100 pb-3">
          <Layers className="w-5 h-5 text-[#005c56]" />
          <h3 className="font-bold text-sm text-gray-800 uppercase tracking-wide">
            Đính Kèm Ảnh Thực Tế / Ma-két / Phối Cảnh (Đính kèm cuối bản in)
          </h3>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Uploader Box */}
          <div className="border-2 border-dashed border-gray-200 hover:border-[#005c56] rounded-2xl p-6 transition-all bg-gray-50/50 flex flex-col items-center justify-center text-center group cursor-pointer relative min-h-[160px]">
            <input 
              type="file" 
              multiple 
              accept="image/*" 
              onChange={handleImageUpload}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" 
            />
            <div className="space-y-2 pointer-events-none">
              <div className="w-12 h-12 bg-teal-50 rounded-full flex items-center justify-center mx-auto text-[#005c56] group-hover:scale-110 transition-transform">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
                </svg>
              </div>
              <div>
                <p className="text-xs font-bold text-gray-700">Chọn hoặc Kéo thả ảnh vào đây</p>
                <p className="text-[11px] text-gray-500 mt-1">Hỗ trợ các file ảnh JPEG, PNG, WEBP. Tối đa 5MB/ảnh.</p>
              </div>
            </div>
          </div>

          {/* Preview Grid */}
          <div className="flex flex-col justify-center">
            {images.length === 0 ? (
              <div className="text-center py-8 text-gray-400 text-xs italic bg-gray-50 rounded-2xl border border-dashed border-gray-200">
                Chưa có hình ảnh đính kèm. Hãy tải lên ảnh phối cảnh hoặc bản vẽ maquette để tự động đính kèm vào cuối bản in.
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-3">
                {images.map((imgBase64, index) => (
                  <div key={index} className="group relative aspect-square bg-gray-100 rounded-xl overflow-hidden border border-gray-200 shadow-sm hover:shadow-md transition-all">
                    <img 
                      src={imgBase64} 
                      alt={`Ảnh đính kèm ${index + 1}`} 
                      className="w-full h-full object-cover"
                      referrerPolicy="no-referrer"
                    />
                    <button
                      type="button"
                      onClick={() => handleRemoveImage(index)}
                      className="absolute top-1.5 right-1.5 bg-red-600 hover:bg-red-700 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity shadow-lg z-20 cursor-pointer"
                      title="Xóa ảnh này"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                    <div className="absolute bottom-0 inset-x-0 bg-black/60 text-white text-[9px] font-bold text-center py-0.5">
                      Ảnh {index + 1}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Sticky Progress Bar */}
      <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-sm sticky top-0 z-20">
        <div className="flex items-center justify-between text-xs font-bold mb-2">
          <span className="text-gray-700 flex items-center gap-1.5">
            <CheckCircle2 className="w-4 h-4 text-[#005c56]" />
            Tiến độ chuẩn bị hồ sơ khách hàng ({custName || 'Khách hàng hiện tại'})
          </span>
          <span className={`font-black ${progressPercent === 100 ? 'text-green-600' : 'text-[#005c56]'}`}>
            Đã chuẩn bị: {checkedDocsCount}/7 mục ({progressPercent}%) {progressPercent === 100 && '✓ Hoàn thành'}
          </span>
        </div>
        <div className="w-full bg-gray-100 rounded-full h-3 overflow-hidden">
          <div 
            className="h-full bg-gradient-to-r from-[#005c56] to-green-500 rounded-full transition-all duration-300"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      {/* Toolbar & Filters */}
      <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-sm flex flex-wrap items-center justify-between gap-3">
        <div className="relative flex-1 min-w-[240px] max-w-md">
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Tìm nhanh tên giấy tờ, quy định..."
            className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-xl text-xs outline-none focus:ring-1 focus:ring-teal-500"
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
            onClick={toggleAllSections}
            className="px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-xs font-bold transition-all"
          >
            Mở/Thu gọn
          </button>

          <button
            onClick={copyZaloMessage}
            className="px-3.5 py-2 bg-sky-600 hover:bg-sky-700 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-sm"
            title="Sao chép tin nhắn để gửi khách qua Zalo"
          >
            <Share2 className="w-3.5 h-3.5" />
            Sao Chép Gửi Zalo
          </button>

          <button
            onClick={handlePrintChecklistOnly}
            className="px-3.5 py-2 bg-[#005c56] hover:bg-[#00423e] text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-sm"
            title="In riêng bảng checklist hồ sơ theo yêu cầu"
          >
            <Printer className="w-3.5 h-3.5" />
            In Bảng Checklist (PDF)
          </button>
        </div>
      </div>

      {/* Accordion 1: Danh Mục Hồ Sơ Khách Hàng Cần Cung Cấp */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        <button
          onClick={() => toggleSection('secChecklist')}
          className="w-full p-4 bg-teal-50/50 hover:bg-teal-50 flex items-center justify-between text-left transition-all border-b border-gray-200"
        >
          <div className="flex items-center gap-2.5">
            <span className="w-6 h-6 rounded-full bg-[#005c56] text-white font-bold text-xs flex items-center justify-center">1</span>
            <span className="font-bold text-sm text-gray-800">
              Danh Mục Hồ Sơ Khách Hàng Cần Cung Cấp (07 Hạng Mục)
            </span>
          </div>
          {openSections.secChecklist ? <ChevronUp className="w-4 h-4 text-gray-500" /> : <ChevronDown className="w-4 h-4 text-gray-500" />}
        </button>

        {openSections.secChecklist && (
          <div className="p-5 space-y-4">
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl flex flex-wrap items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2 text-amber-900 font-semibold">
                <FileText className="w-4 h-4 text-amber-600" />
                <span>Xuất danh mục gửi khách hàng qua Zalo hoặc in bảng checklist gửi đính kèm hợp đồng.</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={copyZaloMessage}
                  className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold flex items-center gap-1 shadow-sm"
                >
                  <Copy className="w-3.5 h-3.5" />
                  Sao Chép Gửi Zalo
                </button>
                <button
                  onClick={handlePrintChecklistOnly}
                  className="px-3 py-1.5 bg-[#005c56] hover:bg-[#00423e] text-white rounded-lg font-bold flex items-center gap-1 shadow-sm"
                  title="In trực tiếp bảng checklist hồ sơ"
                >
                  <Printer className="w-3.5 h-3.5" />
                  In Bảng Checklist
                </button>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-gray-100 text-gray-700 font-bold border-b border-gray-200">
                    <th className="p-3 text-center w-14">Đã có</th>
                    <th className="p-3 text-center w-12">STT</th>
                    <th className="p-3 w-2/5">Tên hồ sơ / Tài liệu cần cung cấp</th>
                    <th className="p-3 w-1/5">Quy cách &amp; Số lượng</th>
                    <th className="p-3">Hướng dẫn &amp; Lưu ý từ chuyên viên</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {INITIAL_DOCS.filter(doc => {
                    const isChecked = !!checklist[doc.id];
                    if (filterPendingOnly && isChecked) return false;
                    if (searchQuery) {
                      const q = searchQuery.toLowerCase();
                      const matchName = doc.name.toLowerCase().includes(q);
                      const matchGuide = doc.guidance.toLowerCase().includes(q);
                      return matchName || matchGuide;
                    }
                    return true;
                  }).map((doc, idx) => {
                    const isChecked = !!checklist[doc.id];

                    return (
                      <tr key={doc.id} className={`transition-all ${isChecked ? 'bg-emerald-50/70 border-l-4 border-l-emerald-500' : 'hover:bg-teal-50/30'}`}>
                        <td className="p-3 text-center">
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => handleChecklistToggle(doc.id)}
                            className="w-4 h-4 rounded text-emerald-600 accent-emerald-600 cursor-pointer"
                          />
                        </td>
                        <td className="p-3 text-center font-black text-gray-700">{idx + 1}</td>
                        <td className="p-3">
                          <div className={`font-bold text-sm ${isChecked ? 'text-emerald-950 font-black' : 'text-gray-900'} leading-snug`}>
                            {doc.name} {isChecked && <span className="text-emerald-600 text-xs ml-1 font-bold">✓ Đã đủ hồ sơ</span>}
                          </div>
                          <div className="text-[11.5px] text-gray-600 mt-1 leading-relaxed">{doc.guidance}</div>
                          <span className="inline-block mt-1.5 text-[10px] font-bold text-[#005c56] bg-teal-50 px-2.5 py-0.5 rounded-md border border-teal-200">
                            {doc.legalRef}
                          </span>
                        </td>
                        <td className="p-3">
                          <span className={`inline-block px-2.5 py-1 rounded-lg text-[11px] font-bold border shadow-2xs ${
                            doc.badge === 'original' ? 'bg-emerald-100 text-emerald-900 border-emerald-300' :
                            doc.badge === 'copy' ? 'bg-blue-100 text-blue-900 border-blue-300' :
                            'bg-amber-100 text-amber-900 border-amber-300'
                          }`}>
                            {doc.qty}
                          </span>
                        </td>
                        <td className="p-3">
                          <span className={`inline-block px-2 py-0.5 rounded-md text-[10px] font-black uppercase mb-1 ${
                            doc.type === 'Bắt buộc' ? 'bg-rose-100 text-rose-800 border border-rose-300' : 'bg-purple-100 text-purple-800 border border-purple-300'
                          }`}>
                            {doc.type}
                          </span>
                          <div className="text-[11.5px] text-gray-600 leading-snug">{doc.desc}</div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="p-3 bg-gray-50 border border-gray-200 rounded-xl text-xs text-gray-600 leading-relaxed">
              <strong>Lưu ý từ Chuyên viên FAST:</strong> Khách hàng chỉ cần chuẩn bị <strong>01 bộ hồ sơ</strong>. Bản chụp hoặc scan gửi FAST để nộp trực tuyến cần rõ nét, đủ 4 góc, quét từ bản gốc để không bị cơ quan chức năng yêu cầu giải trình.
            </div>
          </div>
        )}
      </div>

      {/* Accordion 2: Trình Tự Thực Hiện */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        <button
          onClick={() => toggleSection('secProcess')}
          className="w-full p-4 bg-gray-50 hover:bg-gray-100 flex items-center justify-between text-left transition-all border-b border-gray-200"
        >
          <div className="flex items-center gap-2.5">
            <span className="w-6 h-6 rounded-full bg-[#005c56] text-white font-bold text-xs flex items-center justify-center">2</span>
            <span className="font-bold text-sm text-gray-800">
              Trình Tự Thực Hiện &amp; Nguyên Tắc Hậu Kiểm 05 Ngày Làm Việc
            </span>
          </div>
          {openSections.secProcess ? <ChevronUp className="w-4 h-4 text-gray-500" /> : <ChevronDown className="w-4 h-4 text-gray-500" />}
        </button>

        {openSections.secProcess && (
          <div className="p-5 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
              <div className="p-4 bg-gray-50 rounded-xl border-t-4 border-t-[#005c56]">
                <div className="text-[10px] font-black uppercase text-[#005c56] tracking-wider mb-1">Bước 1: Nộp hồ sơ</div>
                <div className="font-bold text-sm text-gray-800 mb-1">Gửi trước 15 ngày</div>
                <p className="text-gray-600 leading-relaxed">
                  Tổ chức, cá nhân gửi 01 bộ hồ sơ thông báo đến Sở VHTTDL / Sở VHTT trước khi thực hiện quảng cáo ít nhất <strong>15 ngày</strong>.
                </p>
              </div>

              <div className="p-4 bg-gray-50 rounded-xl border-t-4 border-t-teal-600">
                <div className="text-[10px] font-black uppercase text-teal-600 tracking-wider mb-1">Bước 2: Cấp biên nhận</div>
                <div className="font-bold text-sm text-gray-800 mb-1">Xác nhận ngày tiếp nhận</div>
                <p className="text-gray-600 leading-relaxed">
                  Cơ quan quản lý kiểm tra thành phần hồ sơ và cấp giấy biên nhận trực tiếp hoặc biên nhận điện tử qua Cổng dịch vụ công.
                </p>
              </div>

              <div className="p-4 bg-green-50 rounded-xl border-t-4 border-t-green-600">
                <div className="text-[10px] font-black uppercase text-green-700 tracking-wider mb-1">Bước 3: Thời hạn 05 ngày</div>
                <div className="font-bold text-sm text-green-900 mb-1">Mặc nhiên được chấp thuận</div>
                <p className="text-green-800 leading-relaxed">
                  Trong thời hạn <strong>05 ngày làm việc</strong>, nếu cơ quan không có văn bản trả lời thì tổ chức mặc nhiên được thực hiện quảng cáo đã thông báo.
                </p>
              </div>
            </div>

            <div className="p-3 bg-green-50 border border-green-200 rounded-xl text-xs text-green-900 leading-relaxed">
              <strong>Ý nghĩa pháp lý:</strong> Thủ tục thông báo sản phẩm quảng cáo không cấp Giấy phép mà thực hiện theo cơ chế hậu kiểm. Hết thời hạn 05 ngày làm việc nếu không có văn bản từ chối (Mã: KQ.G16.000416), việc treo bảng hoặc băng-rôn là hoàn toàn hợp lệ.
            </div>
          </div>
        )}
      </div>

      {/* Accordion 3: 3 Cách Thức Tiếp Nhận Hồ Sơ */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        <button
          onClick={() => toggleSection('secMethods')}
          className="w-full p-4 bg-gray-50 hover:bg-gray-100 flex items-center justify-between text-left transition-all border-b border-gray-200"
        >
          <div className="flex items-center gap-2.5">
            <span className="w-6 h-6 rounded-full bg-[#005c56] text-white font-bold text-xs flex items-center justify-center">3</span>
            <span className="font-bold text-sm text-gray-800">
              3 Cách Thức Tiếp Nhận Hồ Sơ &amp; Mức Lệ Phí
            </span>
          </div>
          {openSections.secMethods ? <ChevronUp className="w-4 h-4 text-gray-500" /> : <ChevronDown className="w-4 h-4 text-gray-500" />}
        </button>

        {openSections.secMethods && (
          <div className="p-5">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
              <div className="p-4 rounded-xl border border-blue-200 bg-blue-50/40">
                <div className="font-bold text-sm text-blue-900 mb-1">1. Nộp Trực Tuyến (Online)</div>
                <p className="text-gray-700 leading-relaxed">
                  <strong>Cổng nộp:</strong> Cổng Dịch vụ công Quốc gia (dichvucong.gov.vn) hoặc Cổng DVC cấp Tỉnh.
                </p>
                <p className="text-gray-700 mt-1"><strong>Thời hạn:</strong> 05 ngày làm việc.</p>
                <p className="text-green-700 font-bold mt-1">Lệ phí: Miễn phí 100%.</p>
                <a
                  href="https://dichvucong.gov.vn"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-3 inline-flex items-center gap-1 text-xs font-bold text-blue-600 hover:underline"
                >
                  Truy cập nộp hồ sơ <ExternalLink className="w-3 h-3" />
                </a>
              </div>

              <div className="p-4 rounded-xl border border-gray-200 bg-gray-50">
                <div className="font-bold text-sm text-gray-800 mb-1">2. Qua Bưu Chính</div>
                <p className="text-gray-700 leading-relaxed">
                  <strong>Nơi nhận:</strong> Bộ phận Tiếp nhận &amp; Trả kết quả Sở VHTT / Sở VHTTDL.
                </p>
                <p className="text-gray-700 mt-1"><strong>Thời hạn:</strong> 05 ngày làm việc từ khi nhận bưu phẩm.</p>
                <p className="text-green-700 font-bold mt-1">Lệ phí: Miễn phí (chỉ trả cước bưu điện).</p>
              </div>

              <div className="p-4 rounded-xl border border-gray-200 bg-gray-50">
                <div className="font-bold text-sm text-gray-800 mb-1">3. Nộp Trực Tiếp Một Cửa</div>
                <p className="text-gray-700 leading-relaxed">
                  <strong>Địa điểm:</strong> Trung tâm Phục vụ Hành chính công cấp Tỉnh/Thành phố.
                </p>
                <p className="text-gray-700 mt-1"><strong>Thời hạn:</strong> 05 ngày làm việc.</p>
                <p className="text-green-700 font-bold mt-1">Lệ phí: Miễn phí 100%.</p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Accordion 4: Quy Định Kỹ Thuật */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        <button
          onClick={() => toggleSection('secTechnical')}
          className="w-full p-4 bg-gray-50 hover:bg-gray-100 flex items-center justify-between text-left transition-all border-b border-gray-200"
        >
          <div className="flex items-center gap-2.5">
            <span className="w-6 h-6 rounded-full bg-[#005c56] text-white font-bold text-xs flex items-center justify-center">4</span>
            <span className="font-bold text-sm text-gray-800">
              Quy Định Kỹ Thuật Treo Băng-Rôn &amp; Bảng Quảng Cáo Cần Biết
            </span>
          </div>
          {openSections.secTechnical ? <ChevronUp className="w-4 h-4 text-gray-500" /> : <ChevronDown className="w-4 h-4 text-gray-500" />}
        </button>

        {openSections.secTechnical && (
          <div className="p-5 text-xs text-gray-700 leading-relaxed space-y-2">
            <ul className="list-disc pl-5 space-y-1.5">
              <li><strong>Thời hạn treo tối đa:</strong> Băng-rôn quảng cáo chỉ được treo trong thời hạn không quá <strong>15 ngày</strong>. Hết hạn bắt buộc phải tháo dỡ hoàn toàn.</li>
              <li><strong>Giới hạn số lượng băng-rôn:</strong> Tuyên truyền chính sách xã hội tối đa 100 cái; quảng cáo thương mại tối đa 30 cái cho một hoạt động trên một địa bàn quận/huyện.</li>
              <li><strong>Nội dung bắt buộc:</strong> Phải thể hiện rõ ràng tên, địa chỉ, số điện thoại của đơn vị thực hiện hoặc người quảng cáo ở mép dưới của băng-rôn.</li>
              <li><strong>Quy định về tiếng nước ngoài:</strong> Tiếng Việt bắt buộc phải đặt phía trên hoặc có kích thước lớn hơn tiếng nước ngoài (chữ nước ngoài không quá 3/4 kích thước chữ tiếng Việt).</li>
              <li><strong>Tỷ lệ logo tài trợ:</strong> Đối với hoạt động chính sách xã hội có tài trợ, logo nhãn hàng phải đặt ở dưới cùng và diện tích không quá <strong>20%</strong> diện tích băng-rôn.</li>
              <li><strong>Vị trí cấm treo:</strong> Không được chăng ngang đường giao thông, không gắn vào dải phân cách, trụ điện, cột đèn tín hiệu, cây xanh đô thị hoặc che khuất biển chỉ dẫn.</li>
            </ul>
          </div>
        )}
      </div>

      {/* Accordion 5: Căn Cứ Pháp Lý */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        <button
          onClick={() => toggleSection('secLegal')}
          className="w-full p-4 bg-gray-50 hover:bg-gray-100 flex items-center justify-between text-left transition-all border-b border-gray-200"
        >
          <div className="flex items-center gap-2.5">
            <span className="w-6 h-6 rounded-full bg-[#005c56] text-white font-bold text-xs flex items-center justify-center">5</span>
            <span className="font-bold text-sm text-gray-800">
              Hệ Thống Căn Cứ Pháp Lý Ban Hành
            </span>
          </div>
          {openSections.secLegal ? <ChevronUp className="w-4 h-4 text-gray-500" /> : <ChevronDown className="w-4 h-4 text-gray-500" />}
        </button>

        {openSections.secLegal && (
          <div className="p-5 text-xs text-gray-700 space-y-2">
            <div className="divide-y divide-gray-100">
              <div className="py-2 flex justify-between items-center">
                <span className="font-semibold text-gray-800">Luật Quảng cáo năm 2012</span>
                <span className="px-2 py-0.5 rounded bg-teal-50 text-[#005c56] font-mono font-bold text-[11px]">16/2012/QH13</span>
              </div>
              <div className="py-2 flex justify-between items-center">
                <span className="font-semibold text-gray-800">Nghị định quy định chi tiết thi hành một số điều của Luật Quảng cáo</span>
                <span className="px-2 py-0.5 rounded bg-teal-50 text-[#005c56] font-mono font-bold text-[11px]">342/2025/NĐ-CP</span>
              </div>
              <div className="py-2 flex justify-between items-center">
                <span className="font-semibold text-gray-800">Thông tư của Bộ trưởng BVHTTDL sửa đổi, bổ sung quy định liên quan đến giấy tờ công dân</span>
                <span className="px-2 py-0.5 rounded bg-teal-50 text-[#005c56] font-mono font-bold text-[11px]">13/2023/TT-BVHTTDL</span>
              </div>
              <div className="py-2 flex justify-between items-center">
                <span className="font-semibold text-gray-800">Quyết định công bố TTHC thuộc phạm vi quản lý của Bộ Văn hóa, Thể thao và Du lịch</span>
                <span className="px-2 py-0.5 rounded bg-teal-50 text-[#005c56] font-mono font-bold text-[11px]">190/QĐ-BVHTTDL</span>
              </div>
            </div>
          </div>
        )}
      </div>
      </div>

      {/* PHẦN CHUYÊN DÙNG ĐỂ IN BẢNG CHECKLIST (Chỉ xuất hiện khi in / xuất PDF) */}
      <div id="ad-checklist-print-area" className="hidden print:block bg-white text-gray-900 p-6">
        {/* Header */}
        <div className="border-b-2 border-[#005c56] pb-3 mb-4 flex justify-between items-center">
          <div>
            <div className="text-[11px] font-black uppercase text-[#005c56] tracking-wider">
              FAST CONSULTING &bull; FOOD ALL STANDARD & TRAINING
            </div>
            <h1 className="text-xl font-black text-gray-900 uppercase mt-0.5 tracking-tight">
              BẢNG CHECKLIST HỒ SƠ THÔNG BÁO SẢN PHẨM QUẢNG CÁO
            </h1>
            <p className="text-[11px] text-gray-500 italic mt-0.5">
              Thủ tục tiếp nhận hồ sơ thông báo sản phẩm quảng cáo trên bảng quảng cáo, băng-rôn (Mã TTHC: 1.004650)
            </p>
          </div>
          <div className="text-right text-[10.5px] text-gray-500">
            <div>Mã TTHC: <strong>1.004650</strong></div>
            <div>QĐ: <strong>190/QĐ-BVHTTDL</strong></div>
            <div>Hotline: <strong>0927 002 668</strong></div>
          </div>
        </div>

        {/* Thông tin hồ sơ khách hàng */}
        <div className="border border-gray-300 rounded-lg p-3 mb-4 bg-gray-50/70 text-xs">
          <table className="w-full border-collapse">
            <tbody>
              <tr>
                <td className="py-1 px-2 font-bold text-[#005c56] w-1/4">Tên Khách Hàng / Đơn Vị:</td>
                <td className="py-1 px-2 font-black text-gray-900 w-1/4">{custName || 'Chưa cung cấp'}</td>
                <td className="py-1 px-2 font-bold text-[#005c56] w-1/4">Chuyên Viên FAST Phụ Trách:</td>
                <td className="py-1 px-2 font-black text-gray-900 w-1/4">{fastStaff || 'Chưa phân công'}</td>
              </tr>
              <tr>
                <td className="py-1 px-2 font-bold text-[#005c56]">Số Điện Thoại:</td>
                <td className="py-1 px-2 text-gray-800">{custPhone || 'Chưa có'}</td>
                <td className="py-1 px-2 font-bold text-[#005c56]">Ngày Tiếp Nhận (Order):</td>
                <td className="py-1 px-2 text-gray-800">{orderDate || '-'}</td>
              </tr>
              <tr>
                <td className="py-1 px-2 font-bold text-[#005c56]">Địa Điểm Cơ Sở / Vị Trí:</td>
                <td className="py-1 px-2 text-gray-800">{custLocation || 'Chưa cung cấp'}</td>
                <td className="py-1 px-2 font-bold text-[#005c56]">Hạn Xử Lý Theo Quy Định (05N):</td>
                <td className="py-1 px-2 font-black text-amber-700">{targetDate || '-'}</td>
              </tr>
              <tr>
                <td className="py-1 px-2 font-bold text-[#005c56]">Tiến Độ Chuẩn Bị Hồ Sơ:</td>
                <td className="py-1 px-2 font-black text-green-700" colSpan={3}>
                  Đã chuẩn bị: {Object.values(checklist).filter(Boolean).length}/7 mục ({Math.round((Object.values(checklist).filter(Boolean).length / 7) * 100)}%) - {custStatus}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Bảng checklist 07 tài liệu */}
        <table className="w-full border-collapse border border-gray-400 text-xs mb-4">
          <thead>
            <tr className="bg-gray-100 text-gray-900 font-bold border-b border-gray-400">
              <th className="border border-gray-400 p-2 text-center w-10">STT</th>
              <th className="border border-gray-400 p-2 text-center w-24">Tình Trạng</th>
              <th className="border border-gray-400 p-2 w-2/5">Tên Hồ Sơ / Tài Liệu Cần Cung Cấp</th>
              <th className="border border-gray-400 p-2 w-1/5">Quy Cách &amp; Số Lượng</th>
              <th className="border border-gray-400 p-2">Hướng Dẫn &amp; Căn Cứ Pháp Lý</th>
            </tr>
          </thead>
          <tbody>
            {INITIAL_DOCS.map((doc, idx) => {
              const isChecked = !!checklist[doc.id];
              return (
                <tr key={doc.id} className="border-b border-gray-300">
                  <td className="border border-gray-300 p-2 text-center font-bold">{idx + 1}</td>
                  <td className="border border-gray-300 p-2 text-center">
                    {isChecked ? (
                      <span className="font-bold text-green-700">[ ✓ ] Đã có</span>
                    ) : (
                      <span className="text-gray-400 font-mono">[ &nbsp;&nbsp; ] Chưa có</span>
                    )}
                  </td>
                  <td className="border border-gray-300 p-2">
                    <div className="font-bold text-gray-900">{doc.name}</div>
                    <div className="text-[10.5px] text-gray-600 mt-0.5">{doc.legalRef}</div>
                  </td>
                  <td className="border border-gray-300 p-2 text-[11px]">
                    <div className="font-semibold text-gray-800">{doc.qty}</div>
                    <div className="text-[10px] text-gray-500 uppercase mt-0.5">{doc.type}</div>
                  </td>
                  <td className="border border-gray-300 p-2 text-[11px] text-gray-700 leading-relaxed">
                    {doc.guidance}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {/* Hướng dẫn & Lưu ý */}
        <div className="p-3 border border-gray-300 rounded bg-gray-50/50 text-[11px] text-gray-700 mb-6 leading-relaxed">
          <strong>Lưu ý từ Chuyên viên FAST CONSULTING:</strong> Khách hàng chỉ cần chuẩn bị <strong>01 bộ hồ sơ đầy đủ</strong> theo danh mục trên. Các bản chụp hoặc bản scan gửi FAST để nộp trực tuyến cần rõ nét, đủ 4 góc, quét từ bản gốc để không bị cơ quan chức năng yêu cầu giải trình lại.
        </div>

        {/* Khối chữ ký bàn giao */}
        <div className="grid grid-cols-2 gap-8 text-center text-xs mt-6 pt-4 border-t border-gray-300">
          <div className="flex flex-col items-center justify-between min-h-[110px]">
            <div>
              <p className="font-bold uppercase tracking-wider text-gray-800">ĐẠI DIỆN KHÁCH HÀNG / DOANH NGHIỆP</p>
              <p className="text-[10px] text-gray-500 italic">(Ký, ghi rõ họ tên &amp; đóng dấu)</p>
            </div>
            <div className="font-bold text-gray-900 border-t border-gray-400 pt-1 w-44">
              {custName || 'Khách hàng'}
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

        {/* Khối Bảng Ảnh Đính Kèm Cuối Bản In */}
        {images.length > 0 && (
          <div className="mt-8 pt-5 border-t border-gray-300 page-break-before-always">
            <div className="text-center mb-4">
              <h3 className="text-sm font-black uppercase text-gray-900 tracking-wide">
                DANH MỤC HÌNH ẢNH ĐÍNH KÈM HỒ SƠ QUẢNG CÁO
              </h3>
              <p className="text-[10px] text-gray-500 italic mt-0.5">
                (Hình ảnh phối cảnh vị trí đặt bảng và ma-két sản phẩm quảng cáo in màu)
              </p>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              {images.map((imgBase64, index) => (
                <div key={index} className="border border-gray-300 rounded-lg p-2 bg-white flex flex-col items-center">
                  <div className="w-full h-64 bg-gray-50 rounded overflow-hidden flex items-center justify-center">
                    <img 
                      src={imgBase64} 
                      alt={`Ảnh đính kèm ${index + 1}`} 
                      className="max-w-full max-h-full object-contain"
                      referrerPolicy="no-referrer"
                    />
                  </div>
                  <div className="text-[10px] font-bold text-gray-700 mt-2 text-center">
                    HÌNH KHẢO SÁT / MA-KÉT SỐ {index + 1}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Khung Nhận Diện Thương Hiệu FAST CONSULTING (Ảnh đính kèm cuối bản in) */}
        <div className="mt-8 pt-5 border-t-2 border-gray-200 flex flex-col items-center justify-center text-center space-y-1">
          <div className="text-[#005c56] font-black text-xs uppercase tracking-wider">
            FAST CONSULTING &bull; FOOD ALL STANDARD &amp; TRAINING
          </div>
          <div className="text-gray-700 font-medium text-[11px]">
            Dịch vụ tư vấn Doanh nghiệp và Tư vấn hệ thống Quản lý chất lượng
          </div>
          <div className="text-[11px] text-gray-800 font-semibold">
            Tổng đài Tư vấn &amp; Tiếp nhận hồ sơ: <span className="text-red-600 font-black">0927 002 668</span>
          </div>
          <div className="text-gray-400 text-[10px] pt-0.5">
            &copy; 2026 FAST CONSULTING.
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdProfileManagement;
