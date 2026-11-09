import React, { useState, useEffect, useMemo } from 'react';
import { db, auth } from '../firebase';
import { collection, onSnapshot, doc, setDoc, deleteDoc } from 'firebase/firestore';
import { useToast } from '../contexts/ToastContext';
import { Course } from '../types';
import { getMergedCourses, DEFAULT_FEATURED_COURSE_IDS } from '../constants';
import {
  getCachedFeaturedCourseIds,
  saveFeaturedCourseIds,
  subscribeToFeaturedCourseIds
} from '../utils/featuredCoursesService';
import { ReceiptModal } from './ReceiptModal';
import { TeacherAddCourseModal } from './TeacherAddCourseModal';
import {
  Star,
  CheckCircle2,
  AlertCircle,
  ArrowUp,
  ArrowDown,
  Trash2,
  Plus,
  Search,
  RefreshCw,
  Video,
  MapPin,
  Calendar,
  Phone,
  Mail,
  User,
  Copy,
  Download,
  Filter,
  Flame,
  Check,
  FileText,
  BookOpen,
  Webhook,
  Zap,
  ShieldCheck,
  Sparkles
} from 'lucide-react';

export const FeaturedCoursesDashboard: React.FC = () => {
  const toast = useToast();
  const [activeSubTab, setActiveSubTab] = useState<'featured-manager' | 'registrations' | 'teacher-courses' | 'webhook-receipt'>('featured-manager');

  // Master courses data
  const [allCourses, setAllCourses] = useState<Course[]>(() => getMergedCourses([]));
  const [featuredIds, setFeaturedIds] = useState<string[]>(() => getCachedFeaturedCourseIds());
  const [isSaving, setIsSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  // Registrations state
  const [registrations, setRegistrations] = useState<any[]>([]);
  const [isLoadingRegs, setIsLoadingRegs] = useState(true);
  const [regSearch, setRegSearch] = useState('');
  const [regStatusFilter, setRegStatusFilter] = useState<string>('all');
  const [regTypeFilter, setRegTypeFilter] = useState<string>('all');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Modals state
  const [isReceiptOpen, setIsReceiptOpen] = useState(false);
  const [receiptInitialData, setReceiptInitialData] = useState<any>(null);
  const [isTeacherModalOpen, setIsTeacherModalOpen] = useState(false);

  // Webhook Test simulation state
  const [webhookPhone, setWebhookPhone] = useState('');
  const [webhookAmount, setWebhookAmount] = useState('199000');
  const [webhookContent, setWebhookContent] = useState('LIVE199K 0987654321 CHUYEN KHOAN HOAN TAT');
  const [isSimulatingWebhook, setIsSimulatingWebhook] = useState(false);

  // Sync toàn bộ khóa học
  const refreshCourses = () => {
    fetch('/api/courses')
      .then(res => res.json())
      .then(data => {
        if (data && Array.isArray(data.courses) && data.courses.length > 0) {
          setAllCourses(getMergedCourses(data.courses));
        }
      })
      .catch(() => {});
  };

  useEffect(() => {
    refreshCourses();
  }, []);

  // Lắng nghe 5 khóa nổi bật thời gian thực
  useEffect(() => {
    const unsub = subscribeToFeaturedCourseIds((ids) => {
      setFeaturedIds(ids);
    });
    return () => unsub();
  }, []);

  // Lắng nghe danh sách học viên đăng ký từ Firestore & Server
  useEffect(() => {
    let unsub1 = () => {};
    let unsub2 = () => {};

    const loadLocalOrServer = async () => {
      try {
        const res = await fetch('/api/direct-registrations');
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data.records)) {
            setRegistrations(data.records);
          }
        }
      } catch (e) {}
      setIsLoadingRegs(false);
    };

    try {
      unsub1 = onSnapshot(collection(db, 'live_course_registrations'), (snap) => {
        const list: any[] = [];
        snap.forEach(d => list.push({ id: d.id, ...d.data() }));
        if (list.length >= 0) {
          setRegistrations(prev => {
            const map = new Map<string, any>();
            list.forEach(item => map.set(item.id, item));
            return Array.from(map.values()).sort((a, b) => new Date(b.registeredAt || 0).getTime() - new Date(a.registeredAt || 0).getTime());
          });
        }
        setIsLoadingRegs(false);
      }, () => {
        loadLocalOrServer();
      });

      unsub2 = onSnapshot(collection(db, 'direct_course_registrations'), (snap) => {
        const list: any[] = [];
        snap.forEach(d => list.push({ id: d.id, ...d.data() }));
        if (list.length >= 0) {
          setRegistrations(prev => {
            const map = new Map<string, any>();
            list.forEach(item => map.set(item.id, item));
            return Array.from(map.values()).sort((a, b) => new Date(b.registeredAt || 0).getTime() - new Date(a.registeredAt || 0).getTime());
          });
        }
        setIsLoadingRegs(false);
      }, () => {
        loadLocalOrServer();
      });
    } catch {
      loadLocalOrServer();
    }

    return () => {
      unsub1();
      unsub2();
    };
  }, []);

  // Map ID thành Course
  const courseMap = useMemo(() => {
    const map = new Map<string, Course>();
    allCourses.forEach(c => {
      if (c && c.id) map.set(c.id, c);
    });
    return map;
  }, [allCourses]);

  // Danh sách các khóa đang là nổi bật theo thứ tự
  const activeFeaturedCourses = useMemo(() => {
    return featuredIds.map(id => courseMap.get(id)).filter(Boolean) as Course[];
  }, [featuredIds, courseMap]);

  // Các danh mục có trong hệ thống
  const categories = useMemo(() => {
    const set = new Set<string>();
    allCourses.forEach(c => {
      if (c.category) set.add(c.category);
    });
    return Array.from(set);
  }, [allCourses]);

  // Lọc danh sách kho khóa học
  const filteredCatalog = useMemo(() => {
    return allCourses.filter(c => {
      if (!c || !c.id) return false;
      if (c.status === 'draft' || c.status === 'inactive') return false;
      if (c.id === 'khoa-vip' || c.id.startsWith('combo-')) return false;

      const term = searchTerm.toLowerCase().trim();
      const matchSearch = !term || c.title.toLowerCase().includes(term) || (c.category && c.category.toLowerCase().includes(term));
      const matchCategory = selectedCategory === 'all' || c.category === selectedCategory;
      return matchSearch && matchCategory;
    });
  }, [allCourses, searchTerm, selectedCategory]);

  // Bật / Tắt công tắc nổi bật cho 1 khóa học
  const handleToggleFeatured = async (courseId: string) => {
    let updated: string[];
    if (featuredIds.includes(courseId)) {
      updated = featuredIds.filter(id => id !== courseId);
      toast.showToast(`Đã tắt trạng thái nổi bật cho khóa học này (${updated.length}/5)`, 'info');
    } else {
      if (featuredIds.length >= 5) {
        toast.showToast('Đã đủ 5 khóa học nổi bật. Vui lòng tắt bớt 1 khóa trước khi bật khóa này!', 'error');
        return;
      }
      updated = [...featuredIds, courseId];
      toast.showToast(`Đã bật trạng thái nổi bật (${updated.length}/5)`, 'success');
    }
    setFeaturedIds(updated);
    await saveFeaturedCourseIds(updated, auth.currentUser?.email || 'admin');
  };

  // Di chuyển thứ tự lên
  const handleMoveUp = async (index: number) => {
    if (index <= 0) return;
    const copy = [...featuredIds];
    const temp = copy[index];
    copy[index] = copy[index - 1];
    copy[index - 1] = temp;
    setFeaturedIds(copy);
    await saveFeaturedCourseIds(copy, auth.currentUser?.email || 'admin');
  };

  // Di chuyển thứ tự xuống
  const handleMoveDown = async (index: number) => {
    if (index >= featuredIds.length - 1) return;
    const copy = [...featuredIds];
    const temp = copy[index];
    copy[index] = copy[index + 1];
    copy[index + 1] = temp;
    setFeaturedIds(copy);
    await saveFeaturedCourseIds(copy, auth.currentUser?.email || 'admin');
  };

  // Khôi phục 5 khóa mặc định
  const handleResetDefaults = async () => {
    if (window.confirm('Khôi phục danh sách 5 khóa nổi bật chuẩn mặc định của FAST?')) {
      setFeaturedIds([...DEFAULT_FEATURED_COURSE_IDS]);
      await saveFeaturedCourseIds([...DEFAULT_FEATURED_COURSE_IDS], auth.currentUser?.email || 'admin');
      toast.showToast('Đã khôi phục 5 khóa học nổi bật mặc định!', 'info');
    }
  };

  // XÓA TẤT CẢ ĐĂNG KÝ (Xóa sạch 4 bản ghi cũ)
  const handleClearAllRegistrations = async () => {
    if (!window.confirm('⚠️ XÁC NHẬN XÓA SẠCH TẤT CẢ DỮ LIỆU ĐĂNG KÝ KHÓA ĐÀO TẠO (Bao gồm 4 bản ghi cũ)? Hành động này không thể hoàn tác.')) {
      return;
    }

    try {
      setRegistrations([]);
      const res = await fetch('/api/admin/clear-registrations', { method: 'POST' });
      if (res.ok) {
        toast.showToast('Đã xóa sạch tất cả bản ghi đăng ký khóa học!', 'success');
      } else {
        toast.showToast('Đã xóa trên giao diện cục bộ!', 'info');
      }
    } catch (e: any) {
      toast.showToast('Lỗi khi xóa đăng ký: ' + e?.message, 'error');
    }
  };

  // Cập nhật trạng thái học viên
  const handleUpdateStatus = async (recordId: string, newStatus: 'confirmed' | 'pending' | 'cancelled') => {
    try {
      const updatedList = registrations.map(r => r.id === recordId ? { ...r, status: newStatus } : r);
      setRegistrations(updatedList);

      await setDoc(doc(db, 'live_course_registrations', recordId), { status: newStatus }, { merge: true });
      await setDoc(doc(db, 'direct_course_registrations', recordId), { status: newStatus }, { merge: true });

      toast.showToast(`Đã chuyển trạng thái sang "${newStatus === 'confirmed' ? 'Đã duyệt' : newStatus === 'cancelled' ? 'Hủy' : 'Chờ xử lý'}"!`, 'success');
    } catch (e: any) {
      toast.showToast('Lỗi cập nhật trạng thái: ' + e?.message, 'error');
    }
  };

  // Mở Biên lai cho 1 học viên
  const handleOpenReceiptForReg = (reg: any) => {
    setReceiptInitialData({
      studentName: reg.studentName || '',
      phone: reg.phone || '',
      email: reg.email || '',
      companyName: reg.companyName || '',
      courseTitle: reg.courseTitle || 'Đào tạo An toàn Thực phẩm 199K',
      amount: reg.price || '199.000đ',
      issueDate: reg.registeredAt ? new Date(reg.registeredAt).toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10),
      receiptNo: `BL-FAST-${reg.id ? reg.id.slice(-6).toUpperCase() : Date.now().toString().slice(-6)}`
    });
    setIsReceiptOpen(true);
  };

  // Mô phỏng Webhook Chuyển khoản thành công
  const handleSimulateWebhook = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!webhookContent.trim()) {
      toast.showToast('Vui lòng nhập nội dung tin nhắn chuyển khoản!', 'error');
      return;
    }

    setIsSimulatingWebhook(true);
    try {
      const res = await fetch('/api/webhook/payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          transactionId: `FT${Date.now()}`,
          amount: parseInt(webhookAmount) || 199000,
          content: webhookContent,
          accountNo: '0927002668',
          gateway: 'MBBank'
        })
      });

      const data = await res.json();
      if (data && data.success) {
        toast.showToast('Webhook chuyển tiền thành công! Hệ thống đã tự động duyệt học viên.', 'success');
      } else {
        toast.showToast('Đã gửi Webhook nhưng chưa tìm thấy SĐT/Họ tên trùng khớp trong danh sách.', 'info');
      }
    } catch (err: any) {
      toast.showToast('Lỗi gửi Webhook: ' + err?.message, 'error');
    } finally {
      setIsSimulatingWebhook(false);
    }
  };

  // Sao chép tin nhắn Zalo gửi học viên
  const handleCopyZaloMessage = (reg: any) => {
    const isZoom = reg.trainingType === 'zoom';
    const msg = `Kính gửi Anh/Chị ${reg.studentName},\nViện Đào Tạo FAST E-Learning xin gửi thông tin tham gia lớp đào tạo "${reg.courseTitle}" (Học phí 199.000đ):\n- Thời gian khai giảng: ${reg.startDate}\n${isZoom ? `- Phòng học Zoom Meeting ID: ${reg.zoomMeetingId || '849 2700 2668'}\n- Passcode: ${reg.zoomPasscode || 'FAST199K'}` : `- Địa điểm: Số 18 Nguyễn Cơ Thạch, Nam Từ Liêm, Hà Nội`}\n- Hotline hỗ trợ kỹ thuật: 0927 002 668\nTrân trọng đón tiếp Anh/Chị!`;
    navigator.clipboard.writeText(msg);
    setCopiedId(reg.id);
    toast.showToast('Đã chép nội dung tin nhắn gửi học viên qua Zalo!', 'success');
    setTimeout(() => setCopiedId(null), 2500);
  };

  // Xuất file CSV danh sách học viên
  const handleExportCsv = () => {
    if (registrations.length === 0) {
      toast.showToast('Không có dữ liệu đăng ký để xuất file!', 'error');
      return;
    }

    const headers = ['Mã Đăng Ký', 'Họ Tên Học Viên', 'Số Điện Thoại', 'Email', 'Đơn Vị', 'Tên Khóa Học', 'Hình Thức', 'Ngày Khai Giảng', 'Trạng Thái', 'Thời Gian Đăng Ký'];
    const rows = registrations.map(r => [
      `"${r.id || ''}"`,
      `"${r.studentName || ''}"`,
      `"${r.phone || ''}"`,
      `"${r.email || ''}"`,
      `"${r.companyName || ''}"`,
      `"${r.courseTitle || ''}"`,
      `"${r.trainingType === 'zoom' ? 'Zoom Online' : 'Trực tiếp Hội trường'}"`,
      `"${r.startDate || ''}"`,
      `"${r.status === 'confirmed' ? 'Đã xác nhận' : r.status === 'cancelled' ? 'Đã hủy' : 'Chờ duyệt'}"`,
      `"${r.registeredAt ? new Date(r.registeredAt).toLocaleString('vi-VN') : ''}"`
    ]);

    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Danh_Sach_Hoc_Vien_Live_199K_${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    toast.showToast('Đã tải xuống file danh sách học viên!', 'success');
  };

  // Lọc danh sách học viên
  const filteredRegistrations = useMemo(() => {
    return registrations.filter(r => {
      const term = regSearch.toLowerCase().trim();
      const matchSearch = !term ||
        (r.studentName && r.studentName.toLowerCase().includes(term)) ||
        (r.phone && r.phone.includes(term)) ||
        (r.courseTitle && r.courseTitle.toLowerCase().includes(term)) ||
        (r.companyName && r.companyName.toLowerCase().includes(term));

      const matchStatus = regStatusFilter === 'all' || r.status === regStatusFilter;
      const matchType = regTypeFilter === 'all' || r.trainingType === regTypeFilter;
      return matchSearch && matchStatus && matchType;
    });
  }, [registrations, regSearch, regStatusFilter, regTypeFilter]);

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider bg-teal-50 text-[#007c76] border border-teal-200">
            <Flame className="w-4 h-4 text-amber-500 animate-pulse" />
            Bảng Quản Trị Khóa Nổi Bật & Biên Lai Webhook (FAST Admin)
          </div>
          <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
            Quản Lý Khóa Học & Đăng Ký Lớp 199K
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 max-w-xl">
            Bật/Tắt trạng thái nổi bật cho 5 khóa học hàng ngang, quản lý đăng ký học viên, thêm khóa học mới cho Giảng viên và cấu hình Webhook chuyển khoản.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-3 shrink-0">
          <button
            type="button"
            onClick={() => setIsTeacherModalOpen(true)}
            className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs uppercase tracking-wider shadow-md transition flex items-center gap-1.5 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>GV Thêm Khóa Mới</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setReceiptInitialData(null);
              setIsReceiptOpen(true);
            }}
            className="px-4 py-2.5 rounded-xl bg-[#007c76] hover:bg-[#005c56] text-white font-black text-xs uppercase tracking-wider shadow-md transition flex items-center gap-1.5 cursor-pointer"
          >
            <FileText className="w-4 h-4" />
            <span>Tạo Biên Lai Nhanh</span>
          </button>
        </div>
      </div>

      {/* Navigation Sub-tabs */}
      <div className="flex flex-wrap border-b border-slate-200 gap-4 sm:gap-6">
        <button
          type="button"
          onClick={() => setActiveSubTab('featured-manager')}
          className={`pb-3 font-black text-xs sm:text-sm uppercase tracking-wider transition-all border-b-2 cursor-pointer flex items-center gap-2 ${
            activeSubTab === 'featured-manager'
              ? 'border-[#007c76] text-[#007c76]'
              : 'border-transparent text-slate-400 hover:text-slate-700'
          }`}
        >
          <Star className="w-4 h-4" />
          <span>Khóa Nổi Bật 5 Cột ({featuredIds.length}/5)</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveSubTab('registrations')}
          className={`pb-3 font-black text-xs sm:text-sm uppercase tracking-wider transition-all border-b-2 cursor-pointer flex items-center gap-2 ${
            activeSubTab === 'registrations'
              ? 'border-[#007c76] text-[#007c76]'
              : 'border-transparent text-slate-400 hover:text-slate-700'
          }`}
        >
          <User className="w-4 h-4" />
          <span>Danh Sách Học Viên ({registrations.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveSubTab('teacher-courses')}
          className={`pb-3 font-black text-xs sm:text-sm uppercase tracking-wider transition-all border-b-2 cursor-pointer flex items-center gap-2 ${
            activeSubTab === 'teacher-courses'
              ? 'border-[#007c76] text-[#007c76]'
              : 'border-transparent text-slate-400 hover:text-slate-700'
          }`}
        >
          <BookOpen className="w-4 h-4" />
          <span>Mục Cho Giảng Viên</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveSubTab('webhook-receipt')}
          className={`pb-3 font-black text-xs sm:text-sm uppercase tracking-wider transition-all border-b-2 cursor-pointer flex items-center gap-2 ${
            activeSubTab === 'webhook-receipt'
              ? 'border-[#007c76] text-[#007c76]'
              : 'border-transparent text-slate-400 hover:text-slate-700'
          }`}
        >
          <Webhook className="w-4 h-4" />
          <span>Webhook & Tạo Biên Lai</span>
        </button>
      </div>

      {/* TAB 1: CẤU HÌNH KHÓA HỌC NỔI BẬT DÀN HÀNG NGANG 5 CỘT HIỆN ĐẠI */}
      {activeSubTab === 'featured-manager' && (
        <div className="space-y-8 animate-fade-in">
          {/* HÀNG NGANG 5 CỘT KHÓA NỔI BẬT */}
          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <span className={`w-8 h-8 rounded-full flex items-center justify-center font-black text-xs ${
                  featuredIds.length === 5 ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                }`}>
                  {featuredIds.length}/5
                </span>
                <div>
                  <h3 className="text-base sm:text-lg font-black text-slate-900 flex items-center gap-2">
                    <span>5 Khóa Học Nổi Bật Hiển Thị Hàng Ngang</span>
                    <Sparkles className="w-4 h-4 text-amber-500" />
                  </h3>
                  <p className="text-xs text-slate-500">
                    Bật/Tắt trực tiếp bên dưới hoặc kéo di chuyển thứ tự. Dữ liệu đồng bộ tự động lên Firestore.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={handleResetDefaults}
                className="px-3.5 py-1.5 rounded-xl border border-slate-300 text-slate-700 font-bold text-xs hover:bg-slate-50 transition flex items-center gap-1.5 cursor-pointer self-start sm:self-center"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Reset Mặc Định</span>
              </button>
            </div>

            {/* DÀN HÀNG NGANG CHIA 5 CỘT (Modern 5-Column Grid Layout) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
              {activeFeaturedCourses.map((c, index) => (
                <div
                  key={c.id}
                  className="p-4 rounded-2xl border-2 border-teal-200 bg-teal-50/40 flex flex-col justify-between space-y-3 relative group hover:shadow-md transition"
                >
                  <div className="flex items-center justify-between">
                    <span className="w-6 h-6 rounded-full bg-[#007c76] text-white font-black text-[11px] flex items-center justify-center shadow-xs">
                      #{index + 1}
                    </span>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        disabled={index === 0}
                        onClick={() => handleMoveUp(index)}
                        title="Đẩy sang trái"
                        className="p-1 rounded bg-white hover:bg-slate-100 text-slate-600 disabled:opacity-20 cursor-pointer"
                      >
                        <ArrowUp className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        disabled={index === activeFeaturedCourses.length - 1}
                        onClick={() => handleMoveDown(index)}
                        title="Đẩy sang phải"
                        className="p-1 rounded bg-white hover:bg-slate-100 text-slate-600 disabled:opacity-20 cursor-pointer"
                      >
                        <ArrowDown className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  <img
                    src={c.image}
                    alt={c.title}
                    className="w-full h-24 rounded-xl object-cover border border-slate-200"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?auto=format&fit=crop&q=80&w=200';
                    }}
                  />

                  <div className="space-y-1 min-w-0 flex-1">
                    <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded bg-white text-slate-700 border border-slate-200 inline-block">
                      {c.category || 'ATTP'}
                    </span>
                    <h4 className="font-black text-xs text-slate-900 line-clamp-2 leading-snug">
                      {c.title}
                    </h4>
                  </div>

                  {/* Nút Công Tắt Bật/Tắt Trạng Thái Nổi Bật */}
                  <button
                    type="button"
                    onClick={() => handleToggleFeatured(c.id)}
                    className="w-full py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-[11px] uppercase tracking-wider flex items-center justify-center gap-1.5 transition cursor-pointer shadow-xs"
                  >
                    <Star className="w-3.5 h-3.5 fill-current text-amber-300" />
                    <span>NỔI BẬT (ON)</span>
                  </button>
                </div>
              ))}

              {/* Ô trống nếu chưa đủ 5 khóa */}
              {Array.from({ length: Math.max(0, 5 - activeFeaturedCourses.length) }).map((_, i) => (
                <div
                  key={`empty-${i}`}
                  className="p-4 rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50/50 flex flex-col items-center justify-center text-center text-slate-400 space-y-2 min-h-[220px]"
                >
                  <Star className="w-8 h-8 text-slate-300" />
                  <p className="text-xs font-bold">Vị trí #{activeFeaturedCourses.length + i + 1} trống</p>
                  <p className="text-[10px]">Nhấn Bật bên dưới để thêm</p>
                </div>
              ))}
            </div>
          </div>

          {/* SECTION 2: KHO TẤT CẢ KHÓA HỌC ĐỂ BẬT/TẮT NỔI BẬT */}
          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm space-y-5">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h3 className="text-lg font-black text-slate-900">
                  Kho Tất Cả Khóa Học ({filteredCatalog.length}) - Bật/Tắt Nổi Bật
                </h3>
                <p className="text-xs text-slate-500">
                  Nhấp vào nút công tắc để Bật/Tắt trạng thái Nổi Bật cho bất kỳ khóa học nào.
                </p>
              </div>

              {/* Lọc & Tìm kiếm */}
              <div className="flex flex-wrap items-center gap-2.5">
                <div className="relative">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Tìm tên khóa học..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#007c76] w-48 sm:w-60"
                  />
                </div>

                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#007c76]"
                >
                  <option value="all">Tất cả danh mục</option>
                  {categories.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Bảng danh sách khóa học */}
            <div className="border border-slate-200 rounded-2xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-black uppercase tracking-wider text-[11px]">
                      <th className="py-3.5 px-4">Khóa học</th>
                      <th className="py-3.5 px-4">Danh mục</th>
                      <th className="py-3.5 px-4">Học phí gốc</th>
                      <th className="py-3.5 px-4">Trạng thái Nổi Bật</th>
                      <th className="py-3.5 px-4 text-right">Bật / Tắt Nổi Bật</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredCatalog.map((c) => {
                      const isFeatured = featuredIds.includes(c.id);
                      return (
                        <tr key={c.id} className={`hover:bg-slate-50/80 transition ${isFeatured ? 'bg-teal-50/40' : ''}`}>
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-3">
                              <img
                                src={c.image}
                                alt={c.title}
                                className="w-10 h-10 rounded-xl object-cover shrink-0 border border-slate-200"
                                onError={(e) => {
                                  (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?auto=format&fit=crop&q=80&w=200';
                                }}
                              />
                              <div className="min-w-0">
                                <span className="font-black text-slate-900 block truncate max-w-xs sm:max-w-md">
                                  {c.title}
                                </span>
                                <span className="font-mono text-[10px] text-slate-400">ID: {c.id}</span>
                              </div>
                            </div>
                          </td>

                          <td className="py-3 px-4">
                            <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-bold text-[10px]">
                              {c.category || 'ATTP'}
                            </span>
                          </td>

                          <td className="py-3 px-4 font-black text-slate-800">
                            {c.price || 'Miễn phí'}
                          </td>

                          <td className="py-3 px-4">
                            {isFeatured ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-100 text-emerald-800 border border-emerald-300">
                                <Star className="w-3.5 h-3.5 fill-current text-amber-500" />
                                Nổi bật (#{featuredIds.indexOf(c.id) + 1})
                              </span>
                            ) : (
                              <span className="text-slate-400 text-[11px] font-medium">Bình thường</span>
                            )}
                          </td>

                          <td className="py-3 px-4 text-right">
                            <button
                              type="button"
                              onClick={() => handleToggleFeatured(c.id)}
                              className={`px-3.5 py-1.5 rounded-xl font-bold text-xs transition flex items-center gap-1.5 ml-auto cursor-pointer ${
                                isFeatured
                                  ? 'bg-red-50 text-red-600 border border-red-200 hover:bg-red-100'
                                  : 'bg-[#007c76] text-white hover:bg-[#005c56] shadow-xs'
                              }`}
                            >
                              <Star className={`w-3.5 h-3.5 ${isFeatured ? 'fill-current text-red-500' : ''}`} />
                              <span>{isFeatured ? 'TẮT NỔI BẬT' : 'BẬT NỔI BẬT'}</span>
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: DANH SÁCH HỌC VIÊN ĐĂNG KÝ & NÚT XÓA SẠCH DỮ LIỆU CŨ */}
      {activeSubTab === 'registrations' && (
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm space-y-6 animate-fade-in">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h3 className="text-lg font-black text-slate-900">
                Danh Sách Học Viên Đăng Ký Đào Tạo Trực Tiếp (199K)
              </h3>
              <p className="text-xs text-slate-500">
                Theo dõi, duyệt thanh toán, xuất Biên lai và có nút Xóa sạch tất cả dữ liệu đăng ký cũ theo yêu cầu.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              <button
                type="button"
                onClick={handleClearAllRegistrations}
                className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white font-black text-xs uppercase tracking-wider shadow-md transition flex items-center gap-1.5 cursor-pointer"
              >
                <Trash2 className="w-4 h-4" />
                <span>Xóa Sạch Tất Cả Đăng Ký Cũ</span>
              </button>

              <button
                type="button"
                onClick={handleExportCsv}
                className="px-4 py-2 rounded-xl border border-slate-300 text-slate-700 font-bold text-xs uppercase tracking-wider hover:bg-slate-50 transition flex items-center gap-1.5 cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Xuất Excel/CSV</span>
              </button>
            </div>
          </div>

          {/* Filter Bar */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3 bg-slate-50 rounded-2xl border border-slate-200">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Tìm tên, SĐT, cơ sở..."
                value={regSearch}
                onChange={(e) => setRegSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#007c76]"
              />
            </div>

            <select
              value={regStatusFilter}
              onChange={(e) => setRegStatusFilter(e.target.value)}
              className="px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#007c76]"
            >
              <option value="all">Tất cả trạng thái</option>
              <option value="pending">Chờ duyệt thanh toán</option>
              <option value="confirmed">Đã duyệt / Đã thanh toán</option>
              <option value="cancelled">Đã hủy</option>
            </select>

            <select
              value={regTypeFilter}
              onChange={(e) => setRegTypeFilter(e.target.value)}
              className="px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#007c76]"
            >
              <option value="all">Tất cả hình thức</option>
              <option value="zoom">Online Zoom</option>
              <option value="direct">Trực tiếp Hội trường</option>
            </select>
          </div>

          {/* Bảng Học Viên */}
          {isLoadingRegs ? (
            <div className="p-12 text-center text-slate-400 space-y-3">
              <div className="w-8 h-8 border-4 border-[#007c76] border-t-transparent rounded-full animate-spin mx-auto" />
              <p className="text-xs font-bold">Đang tải hồ sơ đăng ký...</p>
            </div>
          ) : filteredRegistrations.length === 0 ? (
            <div className="p-12 text-center border-2 border-dashed border-slate-200 rounded-2xl text-slate-400 space-y-2">
              <p className="font-bold">Danh sách đăng ký hiện đang trống (Đã xóa hết bản ghi cũ).</p>
              <p className="text-xs">Khi học viên đăng ký mới qua form 199k, hồ sơ sẽ tự động hiển thị tại đây.</p>
            </div>
          ) : (
            <div className="border border-slate-200 rounded-2xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-black uppercase tracking-wider text-[11px]">
                      <th className="py-3.5 px-4">Học viên / Liên hệ</th>
                      <th className="py-3.5 px-4">Khóa học đăng ký</th>
                      <th className="py-3.5 px-4">Lịch & Hình thức</th>
                      <th className="py-3.5 px-4">Học phí</th>
                      <th className="py-3.5 px-4">Trạng thái</th>
                      <th className="py-3.5 px-4 text-right">Thao tác</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredRegistrations.map((reg) => (
                      <tr key={reg.id} className="hover:bg-slate-50/80 transition">
                        <td className="py-3 px-4">
                          <div className="space-y-0.5">
                            <span className="font-black text-slate-900 block text-sm">{reg.studentName}</span>
                            <div className="flex items-center gap-2 text-slate-500 font-medium">
                              <Phone className="w-3 h-3 text-[#007c76]" />
                              <span>{reg.phone}</span>
                            </div>
                            {reg.companyName && (
                              <span className="text-[10px] text-slate-400 block truncate max-w-[200px]">
                                {reg.companyName}
                              </span>
                            )}
                          </div>
                        </td>

                        <td className="py-3 px-4">
                          <span className="font-bold text-slate-800 block line-clamp-2 max-w-xs">
                            {reg.courseTitle}
                          </span>
                          <span className="font-mono text-[10px] text-slate-400">#{reg.id?.slice(-8)}</span>
                        </td>

                        <td className="py-3 px-4">
                          <div className="space-y-1">
                            <span className="font-bold text-slate-700 block text-[11px]">
                              {reg.startDate}
                            </span>
                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-black uppercase ${
                              reg.trainingType === 'zoom' ? 'bg-teal-50 text-[#007c76]' : 'bg-emerald-50 text-emerald-800'
                            }`}>
                              {reg.trainingType === 'zoom' ? <Video className="w-3 h-3" /> : <MapPin className="w-3 h-3" />}
                              {reg.trainingType === 'zoom' ? 'Online Zoom' : 'Trực tiếp'}
                            </span>
                          </div>
                        </td>

                        <td className="py-3 px-4 font-black text-[#007c76]">
                          {reg.price || '199.000đ'}
                        </td>

                        <td className="py-3 px-4">
                          <select
                            value={reg.status || 'pending'}
                            onChange={(e) => handleUpdateStatus(reg.id, e.target.value as any)}
                            className={`px-2.5 py-1 rounded-xl text-xs font-bold border outline-none cursor-pointer ${
                              reg.status === 'confirmed'
                                ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                                : reg.status === 'cancelled'
                                ? 'bg-red-50 text-red-700 border-red-300'
                                : 'bg-amber-50 text-amber-800 border-amber-300'
                            }`}
                          >
                            <option value="pending">⏳ Chờ duyệt</option>
                            <option value="confirmed">✓ Đã duyệt</option>
                            <option value="cancelled">✗ Đã hủy</option>
                          </select>
                        </td>

                        <td className="py-3 px-4 text-right space-x-2">
                          <button
                            type="button"
                            onClick={() => handleOpenReceiptForReg(reg)}
                            className="px-2.5 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-bold text-xs transition inline-flex items-center gap-1 cursor-pointer"
                          >
                            <FileText className="w-3.5 h-3.5 text-[#007c76]" />
                            <span>Biên Lai</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => handleCopyZaloMessage(reg)}
                            className="px-2.5 py-1.5 rounded-xl border border-teal-200 bg-teal-50 hover:bg-teal-100 text-[#007c76] font-bold text-xs transition inline-flex items-center gap-1 cursor-pointer"
                          >
                            <Copy className="w-3.5 h-3.5" />
                            <span>{copiedId === reg.id ? 'Đã chép!' : 'Tin Zalo'}</span>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 3: MỤC RIÊNG CHO GIẢNG VIÊN THÊM KHÓA HỌC MỚI */}
      {activeSubTab === 'teacher-courses' && (
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm space-y-6 animate-fade-in">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
            <div>
              <h3 className="text-lg font-black text-slate-900 flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-[#007c76]" />
                <span>Dành Cho Giảng Viên / Admin Đăng Khóa Học Mới</span>
              </h3>
              <p className="text-xs text-slate-500">
                Tải lên và xuất bản bài giảng, khóa học trực tiếp mới trên hệ thống FAST E-Learning.
              </p>
            </div>

            <button
              type="button"
              onClick={() => setIsTeacherModalOpen(true)}
              className="px-5 py-2.5 bg-[#007c76] hover:bg-[#005c56] text-white font-black text-xs uppercase tracking-wider rounded-xl shadow-md transition flex items-center gap-2 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Thêm Khóa Học Mới Ngay</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {allCourses.slice(0, 9).map(c => (
              <div key={c.id} className="p-4 rounded-2xl border border-slate-200 bg-slate-50/50 flex flex-col justify-between space-y-3">
                <div className="flex items-start gap-3">
                  <img src={c.image} alt={c.title} className="w-14 h-14 rounded-xl object-cover border border-slate-200" />
                  <div className="min-w-0 flex-1">
                    <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded bg-white text-slate-700 border border-slate-200 inline-block mb-1">
                      {c.category || 'ATTP'}
                    </span>
                    <h4 className="font-black text-xs text-slate-900 line-clamp-2">{c.title}</h4>
                  </div>
                </div>

                <div className="flex items-center justify-between text-xs pt-2 border-t border-slate-200">
                  <span className="font-bold text-[#007c76]">{c.price}</span>
                  <button
                    type="button"
                    onClick={() => handleToggleFeatured(c.id)}
                    className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase ${
                      featuredIds.includes(c.id) ? 'bg-amber-100 text-amber-800' : 'bg-white border border-slate-200 text-slate-700'
                    }`}
                  >
                    {featuredIds.includes(c.id) ? '⭐ Đang Nổi Bật' : '+ Bật Nổi Bật'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 4: WEBHOOK & TẠO BIÊN LAI NHANH */}
      {activeSubTab === 'webhook-receipt' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-fade-in">
          {/* Cấu hình Webhook */}
          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm space-y-5">
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-[#007c76]">
                <Webhook className="w-4 h-4 text-emerald-600" />
                <span>Cấu Hình & Test Webhook Ngân Hàng</span>
              </div>
              <h3 className="text-lg font-black text-slate-900">Webhook Tự Động Duyệt Chuyển Khoản</h3>
              <p className="text-xs text-slate-500">
                Đăng ký URL Webhook dưới đây vào hệ thống Casso hoặc VietQR để tự động xác nhận chuyển tiền.
              </p>
            </div>

            <div className="p-3.5 bg-slate-900 text-white rounded-2xl font-mono text-xs space-y-1">
              <span className="text-slate-400 text-[10px] block">Webhook Production Endpoint:</span>
              <span className="text-emerald-400 font-bold block break-all">
                https://ais-dev-dafarqvpnahvaovgrtcg6d-145100924001.asia-southeast1.run.app/api/webhook/payment
              </span>
            </div>

            <form onSubmit={handleSimulateWebhook} className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-3 text-xs">
              <h4 className="font-black text-slate-800 flex items-center gap-1.5">
                <Zap className="w-4 h-4 text-amber-500" />
                <span>Thử nghiệm kích hoạt Webhook Chuyển Tiền:</span>
              </h4>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Cú pháp tin nhắn chuyển khoản (Memo/NDCK):</label>
                <input
                  type="text"
                  value={webhookContent}
                  onChange={(e) => setWebhookContent(e.target.value)}
                  placeholder="LIVE199K 0987654321 CHUYEN KHOAN HOAN TAT"
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl font-mono text-slate-900"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Số tiền chuyển khoản (VNĐ):</label>
                <input
                  type="number"
                  value={webhookAmount}
                  onChange={(e) => setWebhookAmount(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl font-mono text-slate-900"
                />
              </div>

              <button
                type="submit"
                disabled={isSimulatingWebhook}
                className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs uppercase tracking-wider rounded-xl transition cursor-pointer disabled:opacity-50"
              >
                {isSimulatingWebhook ? 'Đang gửi...' : 'Bắn Webhook Thử Nghiệm'}
              </button>
            </form>
          </div>

          {/* Công cụ Tạo Biên Lai Nhập Nhanh */}
          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm space-y-5 flex flex-col justify-between">
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-[#007c76]">
                <FileText className="w-4 h-4 text-[#007c76]" />
                <span>Công Cụ Tạo Biên Lai Thu Học Phí</span>
              </div>
              <h3 className="text-lg font-black text-slate-900">Xuất Biên Lai Nhanh Cho Khách Hàng</h3>
              <p className="text-xs text-slate-500">
                Chỉ cần nhập Email, SĐT, Họ tên học viên hoặc Cơ sở Doanh nghiệp, hệ thống sẽ tự động xuất Biên lai chuẩn mẫu Viện Đào Tạo FAST E-Learning.
              </p>
            </div>

            <div className="p-6 bg-teal-50/50 border border-teal-200 rounded-2xl space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-[#007c76] text-white flex items-center justify-center font-black text-xl shadow-md">
                  BL
                </div>
                <div>
                  <h4 className="font-black text-slate-900 text-sm">Biên Lai Điện Tử FAST 199K</h4>
                  <p className="text-xs text-slate-600">Có sẵn địa chỉ, hotline và con dấu Viện Đào Tạo</p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  setReceiptInitialData(null);
                  setIsReceiptOpen(true);
                }}
                className="w-full py-3.5 bg-[#007c76] hover:bg-[#005c56] text-white font-black text-xs uppercase tracking-widest rounded-2xl shadow-lg shadow-[#007c76]/20 transition cursor-pointer"
              >
                Mở Giao Diện Nhập & In Biên Lai
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL BIÊN LAI */}
      <ReceiptModal
        isOpen={isReceiptOpen}
        onClose={() => setIsReceiptOpen(false)}
        initialData={receiptInitialData}
      />

      {/* MODAL GIẢNG VIÊN THÊM KHÓA HỌC */}
      <TeacherAddCourseModal
        isOpen={isTeacherModalOpen}
        onClose={() => setIsTeacherModalOpen(false)}
        onCourseAdded={() => refreshCourses()}
      />
    </div>
  );
};

export default FeaturedCoursesDashboard;
