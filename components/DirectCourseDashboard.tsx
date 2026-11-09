import React, { useState, useEffect, useMemo } from 'react';
import { db } from '../firebase';
import { collection, onSnapshot, doc, setDoc, deleteDoc, query, orderBy } from 'firebase/firestore';
import { useToast } from '../contexts/ToastContext';
import { DirectRegistration } from '../types';
import { UPCOMING_START_DATES, DirectRegistrationModal } from './DirectRegistrationModal';
import {
  Video,
  MapPin,
  Calendar,
  Search,
  Plus,
  Trash2,
  CheckCircle,
  Copy,
  Users,
  DollarSign,
  Download,
  Filter,
  Check,
  Send,
  Building,
  GraduationCap
} from 'lucide-react';

export const DirectCourseDashboard: React.FC = () => {
  const toast = useToast();

  const [registrations, setRegistrations] = useState<DirectRegistration[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | 'zoom' | 'direct'>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'confirmed'>('all');
  const [dateFilter, setDateFilter] = useState<string>('all');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  // Default Zoom configuration
  const [zoomConfig, setZoomConfig] = useState({
    meetingId: '849 2026 8888',
    passcode: '2FAST2026',
    link: 'https://zoom.us/j/84920268888'
  });
  const [showConfigModal, setShowConfigModal] = useState(false);

  // 1. Real-time Firestore Listener for Direct Registrations
  useEffect(() => {
    setIsLoading(true);
    let unsubFirestore: (() => void) | null = null;

    try {
      const q = query(collection(db, 'direct_course_registrations'), orderBy('registeredAt', 'desc'));
      unsubFirestore = onSnapshot(q, (snapshot) => {
        const list: DirectRegistration[] = [];
        snapshot.forEach((docSnap) => {
          list.push({ id: docSnap.id, ...docSnap.data() } as DirectRegistration);
        });
        setRegistrations(list);
        setIsLoading(false);
      }, (err) => {
        console.warn('Lỗi Firestore direct_course_registrations, chuyển sang fetch server:', err);
        fetchFromServer();
      });
    } catch (e) {
      fetchFromServer();
    }

    function fetchFromServer() {
      fetch('/api/direct-registrations')
        .then(res => res.json())
        .then(data => {
          if (data && Array.isArray(data.records)) {
            setRegistrations(data.records);
          }
        })
        .catch(() => {})
        .finally(() => setIsLoading(false));
    }

    return () => {
      if (unsubFirestore) unsubFirestore();
    };
  }, []);

  // Update status (e.g. Duyệt / Xác nhận tham gia)
  const handleUpdateStatus = async (regId: string, newStatus: 'pending' | 'confirmed') => {
    try {
      const target = registrations.find(r => r.id === regId);
      if (!target) return;
      const updated = { ...target, status: newStatus };

      setRegistrations(prev => prev.map(r => r.id === regId ? updated : r));

      await Promise.all([
        setDoc(doc(db, 'direct_course_registrations', regId), { status: newStatus }, { merge: true }),
        fetch('/api/direct-registrations/sync', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'upsert', record: updated })
        })
      ]);

      toast.success(`Đã cập nhật trạng thái học viên ${target.studentName} sang: ${newStatus === 'confirmed' ? 'Đã duyệt' : 'Chờ xác nhận'}`);
    } catch (err: any) {
      toast.error(`Lỗi cập nhật: ${err.message}`);
    }
  };

  // Delete registration
  const handleDelete = async (reg: DirectRegistration) => {
    if (!window.confirm(`Bạn có chắc chắn muốn xóa học viên "${reg.studentName}" khỏi danh sách lớp không?`)) {
      return;
    }
    try {
      setRegistrations(prev => prev.filter(r => r.id !== reg.id));

      await Promise.all([
        deleteDoc(doc(db, 'direct_course_registrations', reg.id)).catch(() => {}),
        fetch('/api/direct-registrations/sync', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'delete', recordId: reg.id })
        })
      ]);

      toast.success(`Đã xóa học viên "${reg.studentName}" thành công.`);
    } catch (err: any) {
      toast.error(`Lỗi khi xóa: ${err.message}`);
    }
  };

  // Copy Zalo Invite Message
  const handleCopyZaloMessage = (reg: DirectRegistration) => {
    const msg = `Kính gửi Anh/Chị ${reg.studentName},
2FAST E-Learning xin gửi thông tin tham gia "${reg.courseTitle}":
- Học phí: ${reg.price} (Đã xác nhận)
- Ngày bắt đầu: ${reg.startDate}
${reg.trainingType === 'zoom' ? `- Hình thức: Online qua Zoom
- ID Phòng: ${reg.zoomMeetingId || zoomConfig.meetingId}
- Mật mã: ${reg.zoomPasscode || zoomConfig.passcode}
- Link vào học: ${reg.zoomLink || zoomConfig.link}` : `- Hình thức: Trực tiếp tại Hội trường Trung tâm Đào tạo 2FAST`}
Hotline hỗ trợ: 0927 002 668. Trân trọng!`;

    navigator.clipboard.writeText(msg);
    toast.success('Đã sao chép nội dung tin nhắn gửi học viên qua Zalo / Email!');
  };

  // Export CSV
  const handleExportCSV = () => {
    if (registrations.length === 0) {
      toast.error('Không có dữ liệu để xuất!');
      return;
    }
    const headers = ['Mã ĐK', 'Họ tên', 'Số điện thoại', 'Email', 'Cơ sở/Công ty', 'Khóa học', 'Hình thức', 'Ngày bắt đầu', 'Học phí', 'Trạng thái', 'Thời gian ĐK'];
    const rows = registrations.map(r => [
      r.id,
      `"${r.studentName}"`,
      `"${r.phone}"`,
      `"${r.studentEmail}"`,
      `"${r.companyName || ''}"`,
      `"${r.courseTitle}"`,
      `"${r.trainingType === 'zoom' ? 'Zoom Online' : 'Trực tiếp'}"`,
      `"${r.startDate}"`,
      `"${r.price}"`,
      `"${r.status === 'confirmed' ? 'Đã duyệt' : 'Chờ xác nhận'}"`,
      `"${new Date(r.registeredAt).toLocaleString('vi-VN')}"`
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `danh_sach_hoc_vien_attp_199k_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('Đã xuất danh sách lớp học thành công!');
  };

  // Filters
  const filteredList = useMemo(() => {
    return registrations.filter(r => {
      const matchSearch =
        r.studentName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.phone.includes(searchQuery) ||
        r.studentEmail.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (r.companyName && r.companyName.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchType = typeFilter === 'all' || r.trainingType === typeFilter;
      const matchStatus = statusFilter === 'all' || r.status === statusFilter;
      const matchDate = dateFilter === 'all' || r.startDate.includes(dateFilter);

      return matchSearch && matchType && matchStatus && matchDate;
    });
  }, [registrations, searchQuery, typeFilter, statusFilter, dateFilter]);

  // Metrics
  const stats = useMemo(() => {
    const total = registrations.length;
    const zoomCount = registrations.filter(r => r.trainingType === 'zoom').length;
    const directCount = registrations.filter(r => r.trainingType === 'direct').length;
    const confirmedCount = registrations.filter(r => r.status === 'confirmed').length;
    const totalRevenue = registrations.reduce((sum, r) => {
      const num = parseInt(r.price.replace(/[^\d]/g, ''), 10) || 199000;
      return sum + num;
    }, 0);

    return { total, zoomCount, directCount, confirmedCount, totalRevenue };
  }, [registrations]);

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      
      {/* 1. Header & Title Banner */}
      <div className="bg-gradient-to-r from-[#007c76] to-[#005f5b] rounded-3xl p-6 sm:p-8 text-white shadow-md flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-amber-400 text-slate-900 rounded-full text-xs font-black uppercase tracking-wider mb-2">
            <GraduationCap className="w-3.5 h-3.5" /> Bảng Dashboard Khóa Đào Tạo Trực Tiếp & Zoom
          </div>
          <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
            Khóa Đào Tạo An Toàn Vệ Sinh Thực Phẩm 199K
          </h2>
          <p className="text-teal-100 text-xs sm:text-sm mt-1 max-w-2xl font-medium">
            Quản lý học viên đăng ký các lớp đào tạo trực tiếp tại cơ sở và lớp tập huấn tương tác qua phòng học Zoom.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="px-4 py-2.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-xs uppercase tracking-wider shadow-lg flex items-center gap-2 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Thêm Học Viên Mới</span>
          </button>

          <button
            onClick={handleExportCSV}
            className="px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs uppercase tracking-wider border border-white/20 flex items-center gap-2 transition-all cursor-pointer"
          >
            <Download className="w-4 h-4" />
            <span>Xuất Danh Sách CSV</span>
          </button>
        </div>
      </div>

      {/* 2. Stat Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4">
        <div className="bg-white p-4 rounded-2xl border border-gray-150 shadow-2xs">
          <div className="flex items-center gap-2 text-gray-400 text-xs font-bold uppercase tracking-wider mb-1">
            <Users className="w-4 h-4 text-[#007c76]" /> Tổng Học Viên
          </div>
          <p className="text-2xl font-black text-gray-800">{stats.total} <span className="text-xs text-gray-400 font-semibold">người</span></p>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-gray-150 shadow-2xs">
          <div className="flex items-center gap-2 text-gray-400 text-xs font-bold uppercase tracking-wider mb-1">
            <Video className="w-4 h-4 text-blue-600" /> Học Qua Zoom
          </div>
          <p className="text-2xl font-black text-blue-600">{stats.zoomCount} <span className="text-xs text-gray-400 font-semibold">người</span></p>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-gray-150 shadow-2xs">
          <div className="flex items-center gap-2 text-gray-400 text-xs font-bold uppercase tracking-wider mb-1">
            <MapPin className="w-4 h-4 text-emerald-600" /> Học Trực Tiếp
          </div>
          <p className="text-2xl font-black text-emerald-600">{stats.directCount} <span className="text-xs text-gray-400 font-semibold">người</span></p>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-gray-150 shadow-2xs">
          <div className="flex items-center gap-2 text-gray-400 text-xs font-bold uppercase tracking-wider mb-1">
            <CheckCircle className="w-4 h-4 text-amber-500" /> Đã Xác Nhận
          </div>
          <p className="text-2xl font-black text-amber-500">{stats.confirmedCount} <span className="text-xs text-gray-400 font-semibold">người</span></p>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-gray-150 shadow-2xs col-span-2 lg:col-span-1">
          <div className="flex items-center gap-2 text-gray-400 text-xs font-bold uppercase tracking-wider mb-1">
            <DollarSign className="w-4 h-4 text-[#007c76]" /> Doanh Thu Lớp
          </div>
          <p className="text-xl font-black text-[#007c76]">{stats.totalRevenue.toLocaleString('vi-VN')}đ</p>
        </div>
      </div>

      {/* 3. Toolbar: Search & Filters */}
      <div className="bg-white p-4 rounded-2xl border border-gray-150 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Tìm theo tên học viên, số điện thoại, email, cơ sở..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs sm:text-sm font-semibold text-gray-800 focus:outline-none focus:bg-white focus:border-[#007c76]"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Training type filter */}
          <div className="inline-flex p-1 bg-gray-100 rounded-xl text-xs font-bold border border-gray-200">
            <button
              onClick={() => setTypeFilter('all')}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${typeFilter === 'all' ? 'bg-white text-gray-800 shadow-xs' : 'text-gray-500'}`}
            >
              Tất cả ({registrations.length})
            </button>
            <button
              onClick={() => setTypeFilter('zoom')}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1 ${typeFilter === 'zoom' ? 'bg-white text-blue-600 shadow-xs' : 'text-gray-500'}`}
            >
              <Video className="w-3.5 h-3.5" /> Zoom ({stats.zoomCount})
            </button>
            <button
              onClick={() => setTypeFilter('direct')}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1 ${typeFilter === 'direct' ? 'bg-white text-emerald-600 shadow-xs' : 'text-gray-500'}`}
            >
              <MapPin className="w-3.5 h-3.5" /> Trực tiếp ({stats.directCount})
            </button>
          </div>

          {/* Status filter */}
          <select
            value={statusFilter}
            onChange={(e: any) => setStatusFilter(e.target.value)}
            className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold text-gray-700 focus:outline-none focus:border-[#007c76]"
          >
            <option value="all">Trạng thái: Tất cả</option>
            <option value="pending">Chờ xác nhận</option>
            <option value="confirmed">Đã duyệt / Xác nhận</option>
          </select>
        </div>
      </div>

      {/* 4. Table Listing */}
      <div className="bg-white rounded-3xl border border-gray-150 shadow-2xs overflow-hidden">
        {isLoading ? (
          <div className="py-20 text-center space-y-3">
            <div className="w-8 h-8 border-4 border-[#007c76] border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Đang nạp danh sách học viên...</p>
          </div>
        ) : filteredList.length === 0 ? (
          <div className="py-20 text-center space-y-3 p-6">
            <GraduationCap className="w-12 h-12 text-gray-300 mx-auto" />
            <h4 className="text-base font-extrabold text-gray-700">Chưa có học viên nào trong danh mục đã chọn</h4>
            <p className="text-xs text-gray-400 max-w-sm mx-auto">
              Học viên khi bấm đăng ký khóa học trực tiếp / Zoom 199k từ trang chủ hoặc danh mục khóa học sẽ hiển thị tức thì tại đây.
            </p>
            <button
              onClick={() => setIsAddModalOpen(true)}
              className="px-4 py-2 bg-[#007c76] hover:bg-[#005f5b] text-white rounded-xl text-xs font-bold transition-all cursor-pointer inline-flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" /> Thêm học viên mẫu
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-gray-50/80 border-b border-gray-150 text-[11px] font-black uppercase tracking-wider text-gray-400">
                  <th className="py-3.5 px-4">Tên Khóa Học</th>
                  <th className="py-3.5 px-4">Học Viên & Liên Hệ</th>
                  <th className="py-3.5 px-4">Hình Thức</th>
                  <th className="py-3.5 px-4">Ngày Bắt Đầu</th>
                  <th className="py-3.5 px-4">Thông Tin Phòng Zoom</th>
                  <th className="py-3.5 px-4">Học Phí</th>
                  <th className="py-3.5 px-4">Trạng Thái</th>
                  <th className="py-3.5 px-4 text-right">Thao Tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredList.map((reg) => {
                  const isZoom = reg.trainingType === 'zoom';
                  const isConfirmed = reg.status === 'confirmed';

                  return (
                    <tr key={reg.id} className="hover:bg-gray-50/70 transition-colors">
                      {/* Course Title */}
                      <td className="py-4 px-4 font-bold text-gray-800 max-w-[200px]">
                        <span className="text-[#007c76] line-clamp-2">{reg.courseTitle}</span>
                        <span className="text-[10px] text-gray-400 font-mono block mt-0.5">ID: {reg.id}</span>
                      </td>

                      {/* Student info */}
                      <td className="py-4 px-4">
                        <p className="font-black text-gray-900 text-sm">{reg.studentName}</p>
                        <p className="text-gray-600 font-semibold text-[11px] mt-0.5">SĐT: {reg.phone}</p>
                        <p className="text-gray-400 text-[10px]">{reg.studentEmail}</p>
                        {reg.companyName && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 mt-1 bg-gray-100 text-gray-700 rounded text-[10px] font-medium">
                            <Building className="w-3 h-3 text-gray-400" /> {reg.companyName}
                          </span>
                        )}
                      </td>

                      {/* Training type */}
                      <td className="py-4 px-4">
                        {isZoom ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-blue-50 text-blue-700 border border-blue-200 rounded-lg font-black text-[10px] uppercase">
                            <Video className="w-3 h-3" /> Zoom Online
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-lg font-black text-[10px] uppercase">
                            <MapPin className="w-3 h-3" /> Trực Tiếp
                          </span>
                        )}
                      </td>

                      {/* Start Date */}
                      <td className="py-4 px-4">
                        <span className="inline-flex items-center gap-1.5 text-gray-800 font-bold">
                          <Calendar className="w-3.5 h-3.5 text-gray-400" /> {reg.startDate}
                        </span>
                      </td>

                      {/* Zoom details */}
                      <td className="py-4 px-4 max-w-[200px]">
                        {isZoom ? (
                          <div className="space-y-1">
                            <div className="font-mono text-[11px] text-gray-800">
                              ID: <strong>{reg.zoomMeetingId || zoomConfig.meetingId}</strong>
                            </div>
                            <div className="font-mono text-[10px] text-gray-500">
                              Pass: <strong>{reg.zoomPasscode || zoomConfig.passcode}</strong>
                            </div>
                            <button
                              onClick={() => handleCopyZaloMessage(reg)}
                              title="Sao chép tin nhắn Zalo gửi học viên"
                              className="inline-flex items-center gap-1 text-[10px] text-[#007c76] hover:underline font-bold cursor-pointer"
                            >
                              <Copy className="w-3 h-3" /> Copy tin nhắn Zalo
                            </button>
                          </div>
                        ) : (
                          <span className="text-gray-400 italic text-[11px]">Học tại Hội trường Trung tâm</span>
                        )}
                      </td>

                      {/* Price */}
                      <td className="py-4 px-4 font-black text-amber-600 text-sm">
                        {reg.price}
                      </td>

                      {/* Status */}
                      <td className="py-4 px-4">
                        <button
                          onClick={() => handleUpdateStatus(reg.id, isConfirmed ? 'pending' : 'confirmed')}
                          className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider inline-flex items-center gap-1 cursor-pointer transition-all ${
                            isConfirmed
                              ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200'
                              : 'bg-amber-100 text-amber-800 hover:bg-amber-200'
                          }`}
                        >
                          {isConfirmed ? <Check className="w-3 h-3" /> : null}
                          {isConfirmed ? 'Đã duyệt' : 'Chờ duyệt'}
                        </button>
                      </td>

                      {/* Actions */}
                      <td className="py-4 px-4 text-right">
                        <div className="inline-flex items-center gap-1.5 justify-end">
                          <button
                            onClick={() => handleCopyZaloMessage(reg)}
                            title="Gửi / Sao chép tin nhắn Zalo"
                            className="p-1.5 rounded-lg bg-teal-50 hover:bg-teal-100 text-[#007c76] transition-all cursor-pointer"
                          >
                            <Send className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(reg)}
                            title="Xóa học viên"
                            className="p-1.5 rounded-lg bg-red-50 hover:bg-red-100 text-red-600 transition-all cursor-pointer"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add Modal */}
      {isAddModalOpen && (
        <DirectRegistrationModal
          isOpen={isAddModalOpen}
          onClose={() => setIsAddModalOpen(false)}
        />
      )}
    </div>
  );
};
