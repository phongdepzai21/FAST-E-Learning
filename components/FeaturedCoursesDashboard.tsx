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
  Check
} from 'lucide-react';

export const FeaturedCoursesDashboard: React.FC = () => {
  const toast = useToast();
  const [activeSubTab, setActiveSubTab] = useState<'featured-manager' | 'registrations'>('featured-manager');

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

  // Sync toàn bộ khóa học
  useEffect(() => {
    fetch('/api/courses')
      .then(res => res.json())
      .then(data => {
        if (data && Array.isArray(data.courses) && data.courses.length > 0) {
          setAllCourses(getMergedCourses(data.courses));
        }
      })
      .catch(() => {});
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
      // 1. Snapshot từ live_course_registrations
      unsub1 = onSnapshot(collection(db, 'live_course_registrations'), (snap) => {
        const list: any[] = [];
        snap.forEach(d => list.push({ id: d.id, ...d.data() }));
        if (list.length > 0) {
          setRegistrations(prev => {
            const map = new Map<string, any>();
            list.forEach(item => map.set(item.id, item));
            prev.forEach(item => { if (!map.has(item.id)) map.set(item.id, item); });
            return Array.from(map.values()).sort((a, b) => new Date(b.registeredAt || 0).getTime() - new Date(a.registeredAt || 0).getTime());
          });
        }
        setIsLoadingRegs(false);
      }, () => {
        loadLocalOrServer();
      });

      // 2. Snapshot từ direct_course_registrations
      unsub2 = onSnapshot(collection(db, 'direct_course_registrations'), (snap) => {
        const list: any[] = [];
        snap.forEach(d => list.push({ id: d.id, ...d.data() }));
        if (list.length > 0) {
          setRegistrations(prev => {
            const map = new Map<string, any>();
            list.forEach(item => map.set(item.id, item));
            prev.forEach(item => { if (!map.has(item.id)) map.set(item.id, item); });
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

  // Thêm khóa vào top 5
  const handleAddFeatured = (courseId: string) => {
    if (featuredIds.includes(courseId)) return;
    if (featuredIds.length >= 5) {
      toast.showToast('Đã đủ 5 khóa học nổi bật. Vui lòng bỏ bớt 1 khóa trước khi thêm mới!', 'error');
      return;
    }
    const updated = [...featuredIds, courseId];
    setFeaturedIds(updated);
    toast.showToast(`Đã thêm khóa học vào danh sách nổi bật (${updated.length}/5)`, 'info');
  };

  // Bỏ khóa khỏi top 5
  const handleRemoveFeatured = (courseId: string) => {
    const updated = featuredIds.filter(id => id !== courseId);
    setFeaturedIds(updated);
    toast.showToast(`Đã bỏ khóa học khỏi danh sách nổi bật (${updated.length}/5)`, 'info');
  };

  // Di chuyển thứ tự lên
  const handleMoveUp = (index: number) => {
    if (index <= 0) return;
    const copy = [...featuredIds];
    const temp = copy[index];
    copy[index] = copy[index - 1];
    copy[index - 1] = temp;
    setFeaturedIds(copy);
  };

  // Di chuyển thứ tự xuống
  const handleMoveDown = (index: number) => {
    if (index >= featuredIds.length - 1) return;
    const copy = [...featuredIds];
    const temp = copy[index];
    copy[index] = copy[index + 1];
    copy[index + 1] = temp;
    setFeaturedIds(copy);
  };

  // Lưu cấu hình vào Firestore và Server
  const handleSaveConfig = async () => {
    if (featuredIds.length === 0) {
      toast.showToast('Vui lòng chọn ít nhất 1 khóa học nổi bật!', 'error');
      return;
    }

    setIsSaving(true);
    const res = await saveFeaturedCourseIds(featuredIds, auth.currentUser?.email || 'admin');
    setIsSaving(false);

    if (res.success) {
      toast.showToast('Đã lưu và đồng bộ thành công 5 khóa học nổi bật!', 'success');
    } else {
      toast.showToast(res.error || 'Có lỗi khi lưu cấu hình', 'error');
    }
  };

  // Khôi phục 5 khóa mặc định
  const handleResetDefaults = () => {
    if (window.confirm('Khôi phục danh sách 5 khóa nổi bật chuẩn mặc định của FAST?')) {
      setFeaturedIds([...DEFAULT_FEATURED_COURSE_IDS]);
      toast.showToast('Đã khôi phục 5 khóa học nổi bật mặc định!', 'info');
    }
  };

  // Cập nhật trạng thái học viên
  const handleUpdateStatus = async (recordId: string, newStatus: 'confirmed' | 'pending' | 'cancelled') => {
    try {
      const updatedList = registrations.map(r => r.id === recordId ? { ...r, status: newStatus } : r);
      setRegistrations(updatedList);

      // Cập nhật Firestore
      await setDoc(doc(db, 'live_course_registrations', recordId), { status: newStatus }, { merge: true });
      await setDoc(doc(db, 'direct_course_registrations', recordId), { status: newStatus }, { merge: true });

      // Cập nhật API server
      fetch('/api/direct-registrations/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'upsert', record: { id: recordId, status: newStatus } })
      }).catch(() => {});

      toast.showToast(`Đã chuyển trạng thái sang "${newStatus === 'confirmed' ? 'Đã duyệt' : newStatus === 'cancelled' ? 'Hủy' : 'Chờ xử lý'}"!`, 'success');
    } catch (e: any) {
      toast.showToast('Lỗi cập nhật trạng thái: ' + e?.message, 'error');
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
      {/* Top Banner & Control */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider bg-teal-50 text-[#007c76] border border-teal-200">
            <Flame className="w-4 h-4 text-amber-500 animate-pulse" />
            Quản Lý Khóa Học Nổi Bật & Lớp Trực Tiếp (199K)
          </div>
          <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
            Cấu Hình 5 Khóa Học Nổi Bật
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 max-w-xl">
            Tùy biến 5 khóa học xuất hiện trong biểu mẫu đăng ký học trực tiếp 199k của học viên. Mọi thay đổi đồng bộ thời gian thực xuyên suốt toàn hệ thống.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-3 shrink-0">
          <button
            type="button"
            onClick={handleResetDefaults}
            className="px-4 py-2.5 rounded-xl border border-slate-300 text-slate-700 font-bold text-xs uppercase tracking-wider hover:bg-slate-50 transition flex items-center gap-1.5 cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Mặc định</span>
          </button>

          <button
            type="button"
            onClick={handleSaveConfig}
            disabled={isSaving}
            className="px-6 py-2.5 rounded-xl bg-[#007c76] hover:bg-[#005c56] text-white font-black text-xs uppercase tracking-wider shadow-lg shadow-[#007c76]/20 transition flex items-center gap-2 cursor-pointer disabled:opacity-50"
          >
            {isSaving ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <Check className="w-4 h-4" />
            )}
            <span>Lưu Cấu Hình (5 Khóa)</span>
          </button>
        </div>
      </div>

      {/* Sub Tabs Switcher */}
      <div className="flex border-b border-slate-200 gap-6">
        <button
          type="button"
          onClick={() => setActiveSubTab('featured-manager')}
          className={`pb-3 font-black text-sm uppercase tracking-wider transition-all border-b-2 cursor-pointer flex items-center gap-2 ${
            activeSubTab === 'featured-manager'
              ? 'border-[#007c76] text-[#007c76]'
              : 'border-transparent text-slate-400 hover:text-slate-700'
          }`}
        >
          <Star className="w-4 h-4" />
          <span>Cấu hình 5 Khóa Nổi Bật ({featuredIds.length}/5)</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveSubTab('registrations')}
          className={`pb-3 font-black text-sm uppercase tracking-wider transition-all border-b-2 cursor-pointer flex items-center gap-2 ${
            activeSubTab === 'registrations'
              ? 'border-[#007c76] text-[#007c76]'
              : 'border-transparent text-slate-400 hover:text-slate-700'
          }`}
        >
          <User className="w-4 h-4" />
          <span>Danh Sách Học Viên Đăng Ký ({registrations.length})</span>
        </button>
      </div>

      {/* TAB 1: CẤU HÌNH 5 KHÓA HỌC NỔI BẬT */}
      {activeSubTab === 'featured-manager' && (
        <div className="space-y-8 animate-fade-in">
          {/* SECTION 1: 5 KHÓA HỌC ĐANG CHỌN */}
          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <span className={`w-8 h-8 rounded-full flex items-center justify-center font-black text-xs ${
                  featuredIds.length === 5 ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                }`}>
                  {featuredIds.length}/5
                </span>
                <div>
                  <h3 className="text-base sm:text-lg font-black text-slate-900">
                    5 Khóa Học Đang Được Chọn Làm Nổi Bật
                  </h3>
                  <p className="text-xs text-slate-500">
                    Thứ tự dưới đây quyết định thứ tự xuất hiện trên form đăng ký 199k của học viên.
                  </p>
                </div>
              </div>

              {featuredIds.length === 5 ? (
                <span className="text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-3 py-1 rounded-full flex items-center gap-1.5 w-fit">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Đã chọn đủ 5 khóa nổi bật
                </span>
              ) : (
                <span className="text-xs font-bold text-amber-700 bg-amber-50 border border-amber-200 px-3 py-1 rounded-full flex items-center gap-1.5 w-fit">
                  <AlertCircle className="w-3.5 h-3.5" />
                  Cần chọn đủ 5 khóa (Hiện có {featuredIds.length} khóa)
                </span>
              )}
            </div>

            {activeFeaturedCourses.length === 0 ? (
              <div className="p-8 text-center border-2 border-dashed border-slate-200 rounded-2xl text-slate-400">
                Chưa có khóa học nào được chọn. Vui lòng nhấn nút "+ Chọn làm nổi bật" từ danh sách bên dưới!
              </div>
            ) : (
              <div className="space-y-3">
                {activeFeaturedCourses.map((c, index) => (
                  <div
                    key={c.id}
                    className="p-4 rounded-2xl border-2 border-teal-100 bg-teal-50/30 flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition hover:border-[#007c76]/50 shadow-2xs"
                  >
                    <div className="flex items-center gap-3.5 min-w-0">
                      <span className="w-7 h-7 rounded-full bg-[#007c76] text-white font-black text-xs flex items-center justify-center shrink-0 shadow-xs">
                        #{index + 1}
                      </span>
                      <img
                        src={c.image}
                        alt={c.title}
                        className="w-12 h-12 rounded-xl object-cover shrink-0 border border-slate-200"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?auto=format&fit=crop&q=80&w=200';
                        }}
                      />
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded bg-white text-slate-700 border border-slate-200">
                            {c.category || 'ISO'}
                          </span>
                          <span className="text-xs font-black text-[#007c76]">
                            Giá gốc: {c.price || '599.000đ'}
                          </span>
                        </div>
                        <h4 className="font-black text-sm text-slate-900 truncate">
                          {c.title}
                        </h4>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 self-end sm:self-center shrink-0">
                      <button
                        type="button"
                        disabled={index === 0}
                        onClick={() => handleMoveUp(index)}
                        title="Đẩy lên trước"
                        className="p-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                      >
                        <ArrowUp className="w-4 h-4" />
                      </button>

                      <button
                        type="button"
                        disabled={index === activeFeaturedCourses.length - 1}
                        onClick={() => handleMoveDown(index)}
                        title="Đẩy xuống sau"
                        className="p-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                      >
                        <ArrowDown className="w-4 h-4" />
                      </button>

                      <button
                        type="button"
                        onClick={() => handleRemoveFeatured(c.id)}
                        title="Hủy nổi bật"
                        className="p-2 rounded-xl border border-red-200 bg-red-50 hover:bg-red-100 text-red-600 transition cursor-pointer ml-1"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* SECTION 2: KHO TẤT CẢ KHÓA HỌC TRONG HỆ THỐNG */}
          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm space-y-5">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h3 className="text-lg font-black text-slate-900">
                  Kho Khóa Học Trong Hệ Thống ({filteredCatalog.length})
                </h3>
                <p className="text-xs text-slate-500">
                  Tìm kiếm và nhấn chọn để thay thế hoặc bổ sung vào 5 khóa nổi bật
                </p>
              </div>

              {/* Bộ lọc & Tìm kiếm */}
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
                      <th className="py-3 px-4">Khóa học</th>
                      <th className="py-3 px-4">Danh mục</th>
                      <th className="py-3 px-4">Giá gốc</th>
                      <th className="py-3 px-4">Trạng thái nổi bật</th>
                      <th className="py-3 px-4 text-right">Thao tác</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredCatalog.map((c) => {
                      const isFeatured = featuredIds.includes(c.id);
                      return (
                        <tr key={c.id} className={`hover:bg-slate-50/80 transition ${isFeatured ? 'bg-teal-50/30' : ''}`}>
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
                              {c.category || 'ISO'}
                            </span>
                          </td>
                          <td className="py-3 px-4 font-black text-slate-800">
                            {c.price || 'Miễn phí'}
                          </td>
                          <td className="py-3 px-4">
                            {isFeatured ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-100 text-emerald-800 border border-emerald-300">
                                <Star className="w-3 h-3 fill-current text-amber-500" />
                                Nổi bật (#{featuredIds.indexOf(c.id) + 1})
                              </span>
                            ) : (
                              <span className="text-slate-400 text-[11px] font-medium">Chưa chọn</span>
                            )}
                          </td>
                          <td className="py-3 px-4 text-right">
                            {isFeatured ? (
                              <button
                                type="button"
                                onClick={() => handleRemoveFeatured(c.id)}
                                className="px-3 py-1.5 rounded-xl border border-red-200 bg-red-50 hover:bg-red-100 text-red-600 font-bold text-xs transition cursor-pointer"
                              >
                                Bỏ nổi bật
                              </button>
                            ) : (
                              <button
                                type="button"
                                disabled={featuredIds.length >= 5}
                                onClick={() => handleAddFeatured(c.id)}
                                className={`px-3 py-1.5 rounded-xl font-bold text-xs transition flex items-center gap-1 ml-auto cursor-pointer ${
                                  featuredIds.length >= 5
                                    ? 'bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed'
                                    : 'bg-[#007c76] hover:bg-[#005c56] text-white shadow-xs'
                                }`}
                              >
                                <Plus className="w-3.5 h-3.5" />
                                <span>Chọn nổi bật</span>
                              </button>
                            )}
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

      {/* TAB 2: DANH SÁCH HỌC VIÊN ĐĂNG KÝ */}
      {activeSubTab === 'registrations' && (
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm space-y-6 animate-fade-in">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h3 className="text-lg font-black text-slate-900">
                Danh Sách Học Viên Đăng Ký Đào Tạo Trực Tiếp (199K)
              </h3>
              <p className="text-xs text-slate-500">
                Theo dõi, xác nhận chuyển khoản và gửi thông tin link phòng Zoom cho học viên
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              <button
                type="button"
                onClick={handleExportCsv}
                className="px-4 py-2 rounded-xl border border-slate-300 text-slate-700 font-bold text-xs uppercase tracking-wider hover:bg-slate-50 transition flex items-center gap-1.5 cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Xuất file Excel/CSV</span>
              </button>
            </div>
          </div>

          {/* Filters Bar */}
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
              <option value="pending">Chờ xác nhận thanh toán</option>
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

          {/* Bảng học viên */}
          {isLoadingRegs ? (
            <div className="p-12 text-center text-slate-400 space-y-3">
              <div className="w-8 h-8 border-4 border-[#007c76] border-t-transparent rounded-full animate-spin mx-auto" />
              <p className="text-xs font-bold">Đang tải hồ sơ đăng ký...</p>
            </div>
          ) : filteredRegistrations.length === 0 ? (
            <div className="p-12 text-center border-2 border-dashed border-slate-200 rounded-2xl text-slate-400 space-y-2">
              <p className="font-bold">Chưa có học viên đăng ký phù hợp bộ lọc.</p>
              <p className="text-xs">Khi học viên đăng ký qua form 199k, hồ sơ sẽ hiển thị tại đây.</p>
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

                        <td className="py-3 px-4 text-right">
                          <button
                            type="button"
                            onClick={() => handleCopyZaloMessage(reg)}
                            className="px-3 py-1.5 rounded-xl border border-teal-200 bg-teal-50 hover:bg-teal-100 text-[#007c76] font-bold text-xs transition flex items-center gap-1.5 ml-auto cursor-pointer"
                          >
                            <Copy className="w-3.5 h-3.5" />
                            <span>{copiedId === reg.id ? 'Đã chép!' : 'Chép tin Zalo'}</span>
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
    </div>
  );
};

export default FeaturedCoursesDashboard;
