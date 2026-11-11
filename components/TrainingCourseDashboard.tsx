import React, { useState, useEffect } from 'react';
import { 
  Plus, 
  Search, 
  Edit3, 
  Trash2, 
  Eye, 
  EyeOff, 
  Image as ImageIcon, 
  Upload, 
  Calendar, 
  Clock, 
  MapPin, 
  Video, 
  Users, 
  Award, 
  FileSpreadsheet, 
  FileText, 
  CheckCircle2, 
  AlertCircle, 
  Sparkles, 
  X,
  ExternalLink,
  DollarSign
} from 'lucide-react';
import { collection, doc, setDoc, deleteDoc, onSnapshot, getDocs } from 'firebase/firestore';
import { db } from '../firebase';
import { TrainingCourse } from '../types';
import { DEFAULT_TRAINING_COURSES, getMergedTrainingCourses, formatPriceSubmit } from '../constants';
import { generateTenDigitId, toTenDigitId } from '../utils/idGenerator';
import { useToast } from '../contexts/ToastContext';
import { ReceiptModal, ReceiptData } from './ReceiptModal';

const PRESET_COVERS = [
  { label: 'An toàn thực phẩm', url: 'https://images.unsplash.com/photo-1556910103-1c02745aae4d?auto=format&fit=crop&q=80&w=800' },
  { label: 'HACCP Kiểm soát mối nguy', url: 'https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?auto=format&fit=crop&q=80&w=800' },
  { label: 'Đánh giá viên ISO 22000', url: 'https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?auto=format&fit=crop&q=80&w=800' },
  { label: 'Bếp ăn một chiều / Nhà hàng', url: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&q=80&w=800' },
  { label: 'Sản xuất F&B công nghiệp', url: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&q=80&w=800' }
];

export const TrainingCourseDashboard: React.FC = () => {
  const toast = useToast();
  const [activeTab, setActiveTab] = useState<'list' | 'create' | 'registrations' | 'analytics'>('list');
  const [trainingCourses, setTrainingCourses] = useState<TrainingCourse[]>(() => getMergedTrainingCourses([], { includeInactive: true }));
  const [searchQuery, setSearchQuery] = useState('');
  const [editingCourseId, setEditingCourseId] = useState<string | null>(null);

  // Form states (đăng bìa như khóa thường)
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('An toàn thực phẩm');
  const [price, setPrice] = useState('299.000đ');
  const [originalPrice, setOriginalPrice] = useState('600.000đ');
  const [duration, setDuration] = useState('1 ngày (8 tiết)');
  const [trainingFormat, setTrainingFormat] = useState<'zoom' | 'direct' | 'both' | 'inhouse'>('both');
  const [startDate, setStartDate] = useState('Chủ Nhật hàng tuần (08:30 - 16:30)');
  const [scheduleDetails, setScheduleDetails] = useState('Sáng: 08:30 - 11:30 | Chiều: 13:30 - 16:30');
  const [venueAddress, setVenueAddress] = useState('Số 18 Nguyễn Cơ Thạch, Nam Từ Liêm, Hà Nội / Trực tuyến Zoom');
  const [instructor, setInstructor] = useState('ThS. Nguyễn Văn Thành (Chuyên gia QMS & ATTP)');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState<'active' | 'inactive'>('active');
  const [imageUrlInput, setImageUrlInput] = useState('');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [benefitsText, setBenefitsText] = useState('Chứng nhận hoàn thành có mã tra cứu 10 số điện tử\nBộ biểu mẫu hồ sơ ATTP mẫu\nTư vấn giải đáp trực tiếp cùng chuyên gia');

  // Registrations state
  const [registrations, setRegistrations] = useState<any[]>([]);
  const [selectedReceipt, setSelectedReceipt] = useState<Partial<ReceiptData> | null>(null);
  const [isReceiptModalOpen, setIsReceiptModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // 1. Lắng nghe Firestore collection 'training_courses' theo thời gian thực
  useEffect(() => {
    let unsub = () => {};
    try {
      unsub = onSnapshot(collection(db, 'training_courses'), (snapshot) => {
        const fsList: TrainingCourse[] = [];
        snapshot.forEach((docSnap) => {
          fsList.push({ id: docSnap.id, ...docSnap.data() } as TrainingCourse);
        });

        const merged = getMergedTrainingCourses(fsList, { includeInactive: true });
        setTrainingCourses(merged);
        localStorage.setItem('training_courses_cache', JSON.stringify(merged));
      }, (err) => {
        console.warn('Lỗi snapshot training_courses:', err);
      });
    } catch (e) {
      console.warn('Không thể lắng nghe snapshot training_courses:', e);
    }

    return () => unsub();
  }, []);

  // 2. Lắng nghe danh sách học viên đăng ký khóa đào tạo
  useEffect(() => {
    let unsubRegs = () => {};
    try {
      unsubRegs = onSnapshot(collection(db, 'live_course_registrations'), (snapshot) => {
        const list: any[] = [];
        snapshot.forEach((docSnap) => {
          list.push({ id: docSnap.id, ...docSnap.data() });
        });
        setRegistrations(list.sort((a, b) => new Date(b.registeredAt || 0).getTime() - new Date(a.registeredAt || 0).getTime()));
      }, (err) => {
        console.warn('Lỗi đọc live_course_registrations:', err);
      });
    } catch (e) {}

    return () => unsubRegs();
  }, []);

  // Handle Cover Image file selection (Base64)
  const handleImageFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      toast.showToast('Kích thước ảnh không được vượt quá 5MB!', 'error');
      return;
    }

    setImageFile(file);
    const reader = new FileReader();
    reader.onloadend = () => {
      setImageUrlInput(reader.result as string);
      toast.showToast(`Đã chọn ảnh: ${file.name}`, 'info');
    };
    reader.readAsDataURL(file);
  };

  const resetForm = () => {
    setEditingCourseId(null);
    setTitle('');
    setCategory('An toàn thực phẩm');
    setPrice('299.000đ');
    setOriginalPrice('600.000đ');
    setDuration('1 ngày (8 tiết)');
    setTrainingFormat('both');
    setStartDate('Chủ Nhật hàng tuần (08:30 - 16:30)');
    setScheduleDetails('Sáng: 08:30 - 11:30 | Chiều: 13:30 - 16:30');
    setVenueAddress('Số 18 Nguyễn Cơ Thạch, Nam Từ Liêm, Hà Nội / Trực tuyến Zoom');
    setInstructor('ThS. Nguyễn Văn Thành (Chuyên gia QMS & ATTP)');
    setDescription('');
    setStatus('active');
    setImageUrlInput('');
    setImageFile(null);
    setBenefitsText('Chứng nhận hoàn thành có mã tra cứu 10 số điện tử\nBộ biểu mẫu hồ sơ ATTP mẫu\nTư vấn giải đáp trực tiếp cùng chuyên gia');
  };

  const handleEditCourse = (course: TrainingCourse) => {
    setEditingCourseId(course.id);
    setTitle(course.title);
    setCategory(course.category || 'An toàn thực phẩm');
    setPrice(course.price || '299.000đ');
    setOriginalPrice(course.originalPrice || '600.000đ');
    setDuration(course.duration || '1 ngày (8 tiết)');
    setTrainingFormat(course.trainingFormat || 'both');
    setStartDate(course.startDate || 'Chủ Nhật hàng tuần');
    setScheduleDetails(course.scheduleDetails || '');
    setVenueAddress(course.venueAddress || '');
    setInstructor(course.instructor || '');
    setDescription(course.description || '');
    setStatus(course.status || 'active');
    setImageUrlInput(course.image || '');
    setImageFile(null);
    setBenefitsText(Array.isArray(course.benefits) ? course.benefits.join('\n') : '');
    setActiveTab('create');
  };

  const handleSaveCourse = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      toast.showToast('Vui lòng nhập Tiêu đề khóa đào tạo!', 'error');
      return;
    }

    setIsSubmitting(true);
    const targetId = editingCourseId || generateTenDigitId();
    const nowIso = new Date().toISOString();

    const benefits = benefitsText.split('\n').map(b => b.trim()).filter(Boolean);
    const finalCover = imageUrlInput.trim() || 'https://images.unsplash.com/photo-1556910103-1c02745aae4d?auto=format&fit=crop&q=80&w=800';

    const courseData: TrainingCourse = {
      id: targetId,
      title: title.trim(),
      category: category.trim(),
      price: formatPriceSubmit(price),
      originalPrice: originalPrice.trim() ? formatPriceSubmit(originalPrice) : '',
      duration: duration.trim(),
      trainingFormat,
      startDate: startDate.trim(),
      scheduleDetails: scheduleDetails.trim(),
      venueAddress: venueAddress.trim(),
      instructor: instructor.trim(),
      description: description.trim(),
      image: finalCover,
      status,
      benefits: benefits.length > 0 ? benefits : ['Cấp chứng nhận hoàn thành chuẩn quốc tế', 'Giáo trình chi tiết đính kèm'],
      updatedAt: nowIso,
      createdAt: nowIso
    };

    try {
      // 1. Lưu Firestore 'training_courses'
      await setDoc(doc(db, 'training_courses', targetId), courseData, { merge: true });

      // 2. Cập nhật cache cục bộ
      const updatedList = trainingCourses.some(c => c.id === targetId)
        ? trainingCourses.map(c => c.id === targetId ? courseData : c)
        : [courseData, ...trainingCourses];

      setTrainingCourses(updatedList);
      localStorage.setItem('training_courses_cache', JSON.stringify(updatedList));

      toast.showToast(editingCourseId ? 'Đã cập nhật khóa đào tạo thành công!' : 'Đã đăng khóa đào tạo mới thành công!', 'success');
      resetForm();
      setActiveTab('list');
    } catch (err: any) {
      console.error('Lỗi lưu khóa đào tạo:', err);
      toast.showToast('Có lỗi xảy ra khi lưu khóa đào tạo!', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleStatus = async (course: TrainingCourse) => {
    const newStatus = course.status === 'active' ? 'inactive' : 'active';
    try {
      await setDoc(doc(db, 'training_courses', course.id), { status: newStatus, updatedAt: new Date().toISOString() }, { merge: true });
      setTrainingCourses(prev => prev.map(c => c.id === course.id ? { ...c, status: newStatus } : c));
      toast.showToast(newStatus === 'active' ? `Đã kích hoạt khóa "${course.title}"` : `Đã ẩn khóa "${course.title}"`, 'info');
    } catch (e) {
      toast.showToast('Không thể cập nhật trạng thái', 'error');
    }
  };

  const handleDeleteCourse = async (course: TrainingCourse) => {
    if (!window.confirm(`Bạn có chắc chắn muốn xóa khóa đào tạo "${course.title}"?`)) return;
    try {
      await deleteDoc(doc(db, 'training_courses', course.id));
      setTrainingCourses(prev => prev.filter(c => c.id !== course.id));
      toast.showToast(`Đã xóa khóa đào tạo "${course.title}"`, 'success');
    } catch (e) {
      toast.showToast('Lỗi khi xóa khóa đào tạo', 'error');
    }
  };

  // Export registrations CSV
  const handleExportCsv = () => {
    if (registrations.length === 0) {
      toast.showToast('Chưa có học viên nào để xuất dữ liệu!', 'info');
      return;
    }

    const headers = ['Mã Hồ Sơ', 'Họ Tên Học Viên', 'Số Điện Thoại', 'Email', 'Doanh Nghiệp / Cơ Sở', 'Khóa Đào Tạo', 'Hình Thức', 'Học Phí', 'Lịch Đào Tạo', 'Ngày Đăng Ký'];
    const rows = registrations.map(r => [
      `#${r.id}`,
      `"${r.studentName || ''}"`,
      `"${r.phone || ''}"`,
      `"${r.email || ''}"`,
      `"${r.companyName || ''}"`,
      `"${r.courseTitle || ''}"`,
      `"${r.trainingType === 'zoom' ? 'Zoom' : 'Trực tiếp'}"`,
      `"${r.price || ''}"`,
      `"${r.startDate || ''}"`,
      `"${new Date(r.registeredAt).toLocaleString('vi-VN')}"`
    ]);

    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Danh_Sach_Hoc_Vien_Dao_Tao_${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    toast.showToast('Đã xuất file Excel / CSV danh sách học viên!', 'success');
  };

  const handleOpenReceipt = (reg: any) => {
    setSelectedReceipt({
      receiptNo: toTenDigitId(reg.id),
      studentName: reg.studentName || 'Học viên',
      phone: reg.phone || '',
      email: reg.email || '',
      companyName: reg.companyName || 'Cá nhân',
      courseTitle: reg.courseTitle || 'Khóa Đào Tạo Trực Tiếp',
      amount: reg.price || '299.000đ',
      trainingType: reg.trainingType === 'zoom' ? 'Trực tuyến Zoom' : 'Trực tiếp Hội trường',
      issueDate: new Date().toISOString().slice(0, 10)
    });
    setIsReceiptModalOpen(true);
  };

  const filteredCourses = trainingCourses.filter(c => 
    c.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.id.includes(searchQuery)
  );

  return (
    <div className="space-y-8 animate-fade-in text-slate-800">
      {/* Top Banner Header */}
      <div className="bg-gradient-to-r from-slate-900 via-teal-950 to-[#007c76] rounded-3xl p-6 sm:p-8 text-white shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-6 relative overflow-hidden">
        <div className="space-y-2 z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-teal-400/20 text-teal-300 border border-teal-400/30 text-xs font-black uppercase tracking-wider">
            <Award className="w-3.5 h-3.5" />
            <span>Phân hệ Quản Trị Đào Tạo Thực Chiến</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
            Quản Lý Khóa Đào Tạo (Trực Tiếp &amp; Zoom)
          </h2>
          <p className="text-teal-100/90 text-xs sm:text-sm max-w-2xl font-medium">
            Đăng ảnh bìa, thiết lập lịch khai giảng, học phí linh hoạt và quản lý danh sách học viên đăng ký tham gia các khóa đào tạo chuyên sâu.
          </p>
        </div>

        <div className="flex items-center gap-3 z-10 shrink-0">
          {activeTab !== 'create' ? (
            <button
              type="button"
              onClick={() => {
                resetForm();
                setActiveTab('create');
              }}
              className="px-5 py-3 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black rounded-xl text-xs uppercase tracking-wider transition-all shadow-lg shadow-emerald-500/20 flex items-center gap-2 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Đăng Khóa Đào Tạo Mới</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={() => {
                resetForm();
                setActiveTab('list');
              }}
              className="px-5 py-3 bg-white/10 hover:bg-white/20 text-white font-bold rounded-xl text-xs uppercase tracking-wider transition cursor-pointer"
            >
              Quay lại danh sách
            </button>
          )}
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex border-b border-slate-200 gap-3 overflow-x-auto text-xs font-black uppercase tracking-wider">
        <button
          type="button"
          onClick={() => setActiveTab('list')}
          className={`pb-3 px-4 border-b-2 transition flex items-center gap-2 cursor-pointer whitespace-nowrap ${
            activeTab === 'list'
              ? 'border-[#007c76] text-[#007c76]'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Calendar className="w-4 h-4" />
          <span>Danh Sách Khóa Đào Tạo ({trainingCourses.length})</span>
        </button>

        <button
          type="button"
          onClick={() => {
            if (activeTab !== 'create') resetForm();
            setActiveTab('create');
          }}
          className={`pb-3 px-4 border-b-2 transition flex items-center gap-2 cursor-pointer whitespace-nowrap ${
            activeTab === 'create'
              ? 'border-[#007c76] text-[#007c76]'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Edit3 className="w-4 h-4" />
          <span>{editingCourseId ? 'Chỉnh Sửa Khóa Đào Tạo' : 'Đăng Bìa & Khóa Đào Tạo Mới'}</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('registrations')}
          className={`pb-3 px-4 border-b-2 transition flex items-center gap-2 cursor-pointer whitespace-nowrap ${
            activeTab === 'registrations'
              ? 'border-[#007c76] text-[#007c76]'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>Học Viên Đăng Ký ({registrations.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('analytics')}
          className={`pb-3 px-4 border-b-2 transition flex items-center gap-2 cursor-pointer whitespace-nowrap ${
            activeTab === 'analytics'
              ? 'border-[#007c76] text-[#007c76]'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Sparkles className="w-4 h-4 text-amber-500" />
          <span>Báo Cáo &amp; Thống Kê Doanh Thu</span>
        </button>
      </div>

      {/* TAB 1: DANH SÁCH KHÓA ĐÀO TẠO */}
      {activeTab === 'list' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="relative w-full sm:w-96">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Tìm khóa đào tạo theo tên, danh mục, ID..."
                className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-medium focus:border-[#007c76] focus:ring-2 focus:ring-[#007c76]/10 outline-none"
              />
            </div>

            <div className="text-xs font-bold text-slate-500">
              Hiển thị: <strong className="text-slate-800">{filteredCourses.length}</strong> khóa đào tạo
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-6">
            {filteredCourses.map((course) => {
              const isActive = course.status === 'active';
              return (
                <div
                  key={course.id}
                  className={`bg-white rounded-3xl border overflow-hidden shadow-sm transition-all hover:shadow-md flex flex-col justify-between ${
                    isActive ? 'border-slate-200' : 'border-slate-300 opacity-75'
                  }`}
                >
                  <div>
                    {/* Bìa Khóa Đào Tạo */}
                    <div className="relative h-48 sm:h-52 w-full overflow-hidden bg-slate-100">
                      <img
                        src={course.image}
                        alt={course.title}
                        className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-300"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1556910103-1c02745aae4d?auto=format&fit=crop&q=80&w=800';
                        }}
                      />
                      <div className="absolute top-3 left-3 flex flex-wrap gap-1.5">
                        <span className="px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-slate-900/80 text-white backdrop-blur-md">
                          {course.category}
                        </span>
                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider backdrop-blur-md ${
                          course.trainingFormat === 'zoom'
                            ? 'bg-blue-600/90 text-white'
                            : course.trainingFormat === 'direct'
                            ? 'bg-amber-600/90 text-white'
                            : 'bg-emerald-600/90 text-white'
                        }`}>
                          {course.trainingFormat === 'zoom' ? 'Zoom HD' : course.trainingFormat === 'direct' ? 'Hội trường' : 'Trực tiếp & Zoom'}
                        </span>
                      </div>

                      <div className="absolute top-3 right-3">
                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider shadow-sm ${
                          isActive ? 'bg-emerald-500 text-white' : 'bg-slate-500 text-white'
                        }`}>
                          {isActive ? 'Tuyển sinh' : 'Tạm ẩn'}
                        </span>
                      </div>

                      <div className="absolute bottom-3 right-3 bg-white/95 backdrop-blur-md px-3 py-1 rounded-xl shadow-md border border-slate-200 font-mono text-[11px] font-black text-slate-700">
                        ID: {toTenDigitId(course.id)}
                      </div>
                    </div>

                    {/* Nội dung chi tiết */}
                    <div className="p-5 space-y-3">
                      <h3 className="font-black text-base text-slate-900 leading-snug line-clamp-2">
                        {course.title}
                      </h3>

                      <p className="text-xs text-slate-600 line-clamp-2 font-medium">
                        {course.description}
                      </p>

                      <div className="pt-2 border-t border-slate-100 space-y-1.5 text-xs text-slate-600 font-medium">
                        <div className="flex items-center gap-2">
                          <Calendar className="w-3.5 h-3.5 text-[#007c76] shrink-0" />
                          <span className="truncate">Lịch học: <strong>{course.startDate}</strong></span>
                        </div>
                        {course.instructor && (
                          <div className="flex items-center gap-2">
                            <Users className="w-3.5 h-3.5 text-[#007c76] shrink-0" />
                            <span className="truncate">Giảng viên: <strong>{course.instructor}</strong></span>
                          </div>
                        )}
                        {course.venueAddress && (
                          <div className="flex items-center gap-2">
                            <MapPin className="w-3.5 h-3.5 text-[#007c76] shrink-0" />
                            <span className="truncate">Địa điểm: {course.venueAddress}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Footer & Actions */}
                  <div className="p-5 pt-0">
                    <div className="flex items-center justify-between pb-3 pt-3 border-t border-slate-100">
                      <div>
                        <span className="text-[10px] text-slate-400 font-bold block uppercase">Học phí đào tạo</span>
                        <div className="flex items-center gap-2">
                          <span className="text-lg font-black text-[#007c76]">{course.price}</span>
                          {course.originalPrice && course.originalPrice !== course.price && (
                            <span className="text-xs text-slate-400 line-through font-bold">
                              {course.originalPrice}
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleToggleStatus(course)}
                          className={`p-2 rounded-xl text-xs font-bold transition cursor-pointer border ${
                            isActive
                              ? 'bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100'
                              : 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                          }`}
                          title={isActive ? 'Ẩn khóa học' : 'Kích hoạt khóa học'}
                        >
                          {isActive ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>

                        <button
                          type="button"
                          onClick={() => handleEditCourse(course)}
                          className="p-2 bg-slate-100 hover:bg-teal-50 text-slate-700 hover:text-[#007c76] border border-slate-200 rounded-xl text-xs font-bold transition cursor-pointer"
                          title="Sửa khóa đào tạo"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>

                        <button
                          type="button"
                          onClick={() => handleDeleteCourse(course)}
                          className="p-2 bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 rounded-xl text-xs font-bold transition cursor-pointer"
                          title="Xóa khóa đào tạo"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 2: THÊM / SỬA KHÓA ĐÀO TẠO (ĐĂNG BÌA NHƯ KHÓA THƯỜNG) */}
      {activeTab === 'create' && (
        <form onSubmit={handleSaveCourse} className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-10 shadow-sm space-y-8 max-w-4xl mx-auto">
          <div>
            <h3 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              {editingCourseId ? 'Chỉnh Sửa Thông Tin Khóa Đào Tạo' : 'Đăng Bìa & Thiết Lập Khóa Đào Tạo Mới'}
            </h3>
            <p className="text-xs sm:text-sm text-slate-500 font-medium mt-1">
              Đăng tải ảnh bìa, đặt học phí tùy chỉnh và cấu hình chi tiết buổi tập huấn trực tiếp / Zoom.
            </p>
          </div>

          {/* PHẦN 1: ĐĂNG ẢNH BÌA NHƯ KHÓA THƯỜNG */}
          <div className="p-6 bg-slate-50 rounded-2xl border border-slate-200 space-y-4">
            <div className="flex items-center gap-2">
              <ImageIcon className="w-5 h-5 text-[#007c76]" />
              <h4 className="font-black text-sm uppercase tracking-wider text-slate-900">
                Ảnh Bìa Khóa Đào Tạo (Cover Image)
              </h4>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-700 block">
                  Đường dẫn URL ảnh bìa trực tiếp:
                </label>
                <input
                  type="text"
                  value={imageUrlInput}
                  onChange={e => setImageUrlInput(e.target.value)}
                  placeholder="https://images.unsplash.com/photo-..."
                  className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-medium focus:border-[#007c76] focus:ring-2 focus:ring-[#007c76]/10 outline-none"
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-700 block">
                  Hoặc tải ảnh từ thiết bị:
                </label>
                <label className="flex items-center justify-center gap-2 px-4 py-2.5 bg-white border-2 border-dashed border-teal-300 hover:border-[#007c76] rounded-xl text-xs font-bold text-[#007c76] cursor-pointer transition">
                  <Upload className="w-4 h-4" />
                  <span>{imageFile ? imageFile.name : 'Chọn file ảnh JPG, PNG, WEBP (tối đa 5MB)'}</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageFileChange}
                    className="hidden"
                  />
                </label>
              </div>
            </div>

            {/* Gợi ý ảnh bìa mẫu */}
            <div className="space-y-1.5 pt-2">
              <span className="text-[11px] font-bold text-slate-500 block">Gợi ý ảnh bìa mẫu tiêu chuẩn:</span>
              <div className="flex flex-wrap gap-2">
                {PRESET_COVERS.map(preset => (
                  <button
                    key={preset.label}
                    type="button"
                    onClick={() => setImageUrlInput(preset.url)}
                    className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-white hover:bg-teal-50 border border-slate-200 text-slate-700 hover:text-[#007c76] transition cursor-pointer"
                  >
                    + {preset.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Khung Xem Trước Ảnh Bìa (Live Preview) */}
            {imageUrlInput.trim() && (
              <div className="mt-4 p-4 bg-white rounded-2xl border border-teal-200 flex flex-col sm:flex-row items-center gap-4">
                <img
                  src={imageUrlInput}
                  alt="Xem trước ảnh bìa"
                  className="w-44 h-28 object-cover rounded-xl border border-slate-200 shadow-sm shrink-0"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1556910103-1c02745aae4d?auto=format&fit=crop&q=80&w=800';
                  }}
                />
                <div className="flex-1 space-y-1 text-center sm:text-left">
                  <span className="text-[10px] font-black uppercase tracking-wider text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded">
                    Ảnh bìa đã chọn
                  </span>
                  <p className="text-xs font-mono text-slate-500 truncate max-w-md">
                    {imageUrlInput.startsWith('data:') ? 'Ảnh cục bộ Base64 sẵn sàng lưu' : imageUrlInput}
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      setImageUrlInput('');
                      setImageFile(null);
                    }}
                    className="text-xs font-bold text-red-600 hover:underline inline-flex items-center gap-1 cursor-pointer pt-1"
                  >
                    <X className="w-3.5 h-3.5" />
                    <span>Xóa ảnh bìa này</span>
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* PHẦN 2: THÔNG TIN CHI TIẾT KHÓA ĐÀO TẠO */}
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1 sm:col-span-2">
                <label className="text-xs font-black uppercase tracking-wider text-slate-700">
                  Tiêu đề khóa đào tạo <span className="text-red-500">*</span>:
                </label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  placeholder="VD: Tập huấn An toàn Vệ sinh Thực phẩm Bếp ăn Doanh nghiệp"
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-900 focus:bg-white focus:border-[#007c76] focus:ring-2 focus:ring-[#007c76]/10 outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-black uppercase tracking-wider text-slate-700">
                  Chuyên mục / Lĩnh vực:
                </label>
                <select
                  value={category}
                  onChange={e => setCategory(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:bg-white focus:border-[#007c76] outline-none"
                >
                  <option value="An toàn thực phẩm">An toàn thực phẩm</option>
                  <option value="HACCP">HACCP &amp; Codex</option>
                  <option value="ISO">ISO 22000 / ISO 9001</option>
                  <option value="Bếp ăn & Nhà hàng">Bếp ăn &amp; Nhà hàng</option>
                  <option value="QA/QC Chuyên sâu">QA/QC Chuyên sâu</option>
                  <option value="Doanh nghiệp F&B">Doanh nghiệp F&amp;B</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-black uppercase tracking-wider text-slate-700">
                  Hình thức tổ chức:
                </label>
                <select
                  value={trainingFormat}
                  onChange={e => setTrainingFormat(e.target.value as any)}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:bg-white focus:border-[#007c76] outline-none"
                >
                  <option value="both">Cả hai (Trực tiếp &amp; Online Zoom)</option>
                  <option value="zoom">Chỉ học Online qua Zoom HD</option>
                  <option value="direct">Chỉ học Trực tiếp Hội trường</option>
                  <option value="inhouse">Đào tạo tận nơi tại Doanh nghiệp</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-black uppercase tracking-wider text-slate-700">
                  Học phí áp dụng:
                </label>
                <input
                  type="text"
                  value={price}
                  onChange={e => setPrice(e.target.value)}
                  placeholder="VD: 299.000đ hoặc 499.000đ"
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-black text-[#007c76] focus:bg-white focus:border-[#007c76] outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-black uppercase tracking-wider text-slate-700">
                  Học phí gốc (Niêm yết):
                </label>
                <input
                  type="text"
                  value={originalPrice}
                  onChange={e => setOriginalPrice(e.target.value)}
                  placeholder="VD: 600.000đ"
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-500 focus:bg-white focus:border-[#007c76] outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-black uppercase tracking-wider text-slate-700">
                  Lịch khai giảng:
                </label>
                <input
                  type="text"
                  value={startDate}
                  onChange={e => setStartDate(e.target.value)}
                  placeholder="VD: Chủ Nhật hàng tuần (08:30 - 16:30)"
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:bg-white focus:border-[#007c76] outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-black uppercase tracking-wider text-slate-700">
                  Thời lượng chương trình:
                </label>
                <input
                  type="text"
                  value={duration}
                  onChange={e => setDuration(e.target.value)}
                  placeholder="VD: 1 ngày (8 tiết) hoặc 2 buổi tối"
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:bg-white focus:border-[#007c76] outline-none"
                />
              </div>

              <div className="space-y-1 sm:col-span-2">
                <label className="text-xs font-black uppercase tracking-wider text-slate-700">
                  Địa điểm tổ chức hoặc link Zoom:
                </label>
                <input
                  type="text"
                  value={venueAddress}
                  onChange={e => setVenueAddress(e.target.value)}
                  placeholder="VD: Số 18 Nguyễn Cơ Thạch, Nam Từ Liêm, Hà Nội hoặc Phòng Zoom FAST"
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:bg-white focus:border-[#007c76] outline-none"
                />
              </div>

              <div className="space-y-1 sm:col-span-2">
                <label className="text-xs font-black uppercase tracking-wider text-slate-700">
                  Giảng viên / Chuyên gia đào tạo:
                </label>
                <input
                  type="text"
                  value={instructor}
                  onChange={e => setInstructor(e.target.value)}
                  placeholder="VD: ThS. Nguyễn Văn Thành (Chuyên gia QMS 15 năm kinh nghiệm)"
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:bg-white focus:border-[#007c76] outline-none"
                />
              </div>

              <div className="space-y-1 sm:col-span-2">
                <label className="text-xs font-black uppercase tracking-wider text-slate-700">
                  Mô tả &amp; Mục tiêu khóa đào tạo:
                </label>
                <textarea
                  rows={3}
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  placeholder="Tóm tắt nội dung trọng tâm của khóa đào tạo..."
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:bg-white focus:border-[#007c76] outline-none"
                />
              </div>

              <div className="space-y-1 sm:col-span-2">
                <label className="text-xs font-black uppercase tracking-wider text-slate-700">
                  Quyền lợi học viên (Mỗi dòng 1 mục):
                </label>
                <textarea
                  rows={3}
                  value={benefitsText}
                  onChange={e => setBenefitsText(e.target.value)}
                  placeholder="Chứng nhận hoàn thành mã số 10 số điện tử&#10;Tài liệu mẫu biểu kèm theo"
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:bg-white focus:border-[#007c76] outline-none font-mono"
                />
              </div>

              <div className="space-y-1 sm:col-span-2">
                <label className="text-xs font-black uppercase tracking-wider text-slate-700">
                  Trạng thái khóa đào tạo:
                </label>
                <div className="flex gap-4 pt-1">
                  <label className="flex items-center gap-2 text-xs font-bold text-emerald-800 cursor-pointer">
                    <input
                      type="radio"
                      name="status"
                      checked={status === 'active'}
                      onChange={() => setStatus('active')}
                      className="accent-[#007c76]"
                    />
                    <span>Đang tuyển sinh (Công khai trên hệ thống)</span>
                  </label>
                  <label className="flex items-center gap-2 text-xs font-bold text-slate-500 cursor-pointer">
                    <input
                      type="radio"
                      name="status"
                      checked={status === 'inactive'}
                      onChange={() => setStatus('inactive')}
                      className="accent-[#007c76]"
                    />
                    <span>Tạm ngưng tuyển sinh (Ẩn khỏi trang chủ)</span>
                  </label>
                </div>
              </div>
            </div>
          </div>

          {/* Form Submit Buttons */}
          <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t border-slate-200">
            <button
              type="button"
              onClick={() => {
                resetForm();
                setActiveTab('list');
              }}
              className="py-3 px-6 rounded-xl border border-slate-300 text-slate-700 font-bold text-xs uppercase tracking-wider hover:bg-slate-50 transition cursor-pointer"
            >
              Hủy bỏ
            </button>

            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 py-3.5 bg-[#007c76] hover:bg-[#005c56] text-white font-black text-xs uppercase tracking-wider rounded-xl shadow-lg shadow-[#007c76]/20 transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>{editingCourseId ? 'Lưu Thay Đổi Khóa Đào Tạo' : 'Đăng Bìa & Khởi Tạo Khóa Đào Tạo'}</span>
            </button>
          </div>
        </form>
      )}

      {/* TAB 3: DANH SÁCH HỌC VIÊN ĐĂNG KÝ */}
      {activeTab === 'registrations' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div>
              <h3 className="text-lg font-black text-slate-900">
                Danh Sách Hồ Sơ Đăng Ký Khóa Đào Tạo
              </h3>
              <p className="text-xs text-slate-500 font-medium">
                Tổng cộng: <strong className="text-slate-800">{registrations.length}</strong> học viên đã gửi yêu cầu tham gia.
              </p>
            </div>

            <button
              type="button"
              onClick={handleExportCsv}
              className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-black uppercase tracking-wider transition flex items-center gap-2 cursor-pointer shadow-sm"
            >
              <FileSpreadsheet className="w-4 h-4" />
              <span>Xuất File Excel (CSV)</span>
            </button>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase font-black text-[10px] tracking-wider">
                  <tr>
                    <th className="py-3 px-4">Mã hồ sơ</th>
                    <th className="py-3 px-4">Học viên</th>
                    <th className="py-3 px-4">SĐT / Zalo</th>
                    <th className="py-3 px-4">Khóa đào tạo</th>
                    <th className="py-3 px-4">Hình thức</th>
                    <th className="py-3 px-4">Lịch học</th>
                    <th className="py-3 px-4">Học phí</th>
                    <th className="py-3 px-4 text-center">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {registrations.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-12 text-center text-slate-400">
                        Chưa có học viên nào đăng ký khóa đào tạo.
                      </td>
                    </tr>
                  ) : (
                    registrations.map(reg => (
                      <tr key={reg.id} className="hover:bg-teal-50/40 transition">
                        <td className="py-3 px-4 font-mono font-bold text-slate-700">
                          #{toTenDigitId(reg.id)}
                        </td>
                        <td className="py-3 px-4">
                          <span className="font-black text-slate-900 block">{reg.studentName}</span>
                          <span className="text-[11px] text-slate-500">{reg.companyName || 'Cá nhân'}</span>
                        </td>
                        <td className="py-3 px-4 font-mono font-bold text-slate-800">
                          {reg.phone}
                        </td>
                        <td className="py-3 px-4 font-bold text-[#007c76] max-w-[200px] truncate">
                          {reg.courseTitle}
                        </td>
                        <td className="py-3 px-4">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${
                            reg.trainingType === 'zoom' 
                              ? 'bg-blue-100 text-blue-800' 
                              : reg.trainingType === 'direct'
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-teal-100 text-[#007c76]'
                          }`}>
                            {reg.trainingTypeLabel || (reg.trainingType === 'zoom' ? 'Zoom HD' : 'Trực tiếp')}
                          </span>
                          {reg.participantCount > 1 && (
                            <span className="block text-[10px] font-bold text-slate-500 mt-0.5">
                              ({reg.participantCount} học viên)
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-slate-600 text-xs">
                          {reg.startDate}
                        </td>
                        <td className="py-3 px-4 font-black text-emerald-700">
                          {reg.totalPrice || reg.price || '299.000đ'}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => handleOpenReceipt(reg)}
                              className="px-2.5 py-1 bg-slate-100 hover:bg-teal-50 text-slate-700 hover:text-[#007c76] border border-slate-200 rounded-lg font-bold text-[11px] transition inline-flex items-center gap-1 cursor-pointer"
                              title="Tạo biên lai thu học phí"
                            >
                              <FileText className="w-3 h-3 text-[#007c76]" />
                              <span>Biên lai</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: DASHBOARD THỐNG KÊ & BÁO CÁO DOANH THU */}
      {activeTab === 'analytics' && (
        <div className="space-y-8 animate-fade-in">
          {/* Top Metrics Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-teal-50 text-[#007c76] flex items-center justify-center shrink-0 border border-teal-100">
                <Calendar className="w-6 h-6" />
              </div>
              <div>
                <span className="text-[11px] font-black uppercase text-slate-400 block tracking-wider">Tổng Khóa Đào Tạo</span>
                <span className="text-2xl font-black text-slate-900">{trainingCourses.length} khóa</span>
                <span className="text-[10px] text-emerald-600 font-bold block mt-0.5">
                  {trainingCourses.filter(c => c.status === 'active').length} khóa đang hoạt động
                </span>
              </div>
            </div>

            <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0 border border-amber-100">
                <Users className="w-6 h-6" />
              </div>
              <div>
                <span className="text-[11px] font-black uppercase text-slate-400 block tracking-wider">Tổng Học Viên Đăng Ký</span>
                <span className="text-2xl font-black text-slate-900">{registrations.length} lượt</span>
                <span className="text-[10px] text-slate-500 font-bold block mt-0.5">
                  Zoom: {registrations.filter(r => r.trainingType === 'zoom').length} | Hội trường: {registrations.filter(r => r.trainingType === 'direct').length}
                </span>
              </div>
            </div>

            <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0 border border-emerald-100">
                <DollarSign className="w-6 h-6" />
              </div>
              <div>
                <span className="text-[11px] font-black uppercase text-slate-400 block tracking-wider">Tổng Doanh Thu Đào Tạo</span>
                <span className="text-2xl font-black text-emerald-700">
                  {registrations.reduce((sum, r) => sum + (parseInt(r.price?.replace(/[^\d]/g, '') || '299000', 10) || 0), 0).toLocaleString('vi-VN')}đ
                </span>
                <span className="text-[10px] text-emerald-600 font-bold block mt-0.5">Tự động tính từ các hồ sơ đăng ký</span>
              </div>
            </div>

            <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 border border-blue-100">
                <Award className="w-6 h-6" />
              </div>
              <div>
                <span className="text-[11px] font-black uppercase text-slate-400 block tracking-wider">Mức Học Phí Trung Bình</span>
                <span className="text-2xl font-black text-slate-900">
                  {registrations.length > 0 
                    ? Math.round(registrations.reduce((sum, r) => sum + (parseInt(r.price?.replace(/[^\d]/g, '') || '299000', 10) || 0), 0) / registrations.length).toLocaleString('vi-VN')
                    : '299.000'}đ
                </span>
                <span className="text-[10px] text-slate-400 font-bold block mt-0.5">Trọn gói chứng nhận 10 số</span>
              </div>
            </div>
          </div>

          {/* Detailed Breakdown */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Phân tích theo hình thức học */}
            <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
              <h4 className="font-black text-slate-900 text-base flex items-center justify-between">
                <span>Phân Phối Theo Hình Thức Đào Tạo</span>
                <span className="text-xs font-bold text-slate-400">Zoom vs Hội Trường</span>
              </h4>

              <div className="space-y-4 pt-2">
                <div>
                  <div className="flex justify-between text-xs font-bold mb-1.5">
                    <span className="text-emerald-700 flex items-center gap-1">
                      <Video className="w-3.5 h-3.5" /> Trực Tuyến Online Zoom
                    </span>
                    <span className="text-slate-800">
                      {registrations.filter(r => r.trainingType === 'zoom').length} học viên (
                      {registrations.length > 0 ? Math.round((registrations.filter(r => r.trainingType === 'zoom').length / registrations.length) * 100) : 0}%)
                    </span>
                  </div>
                  <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                      style={{ width: `${registrations.length > 0 ? (registrations.filter(r => r.trainingType === 'zoom').length / registrations.length) * 100 : 50}%` }}
                    />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-xs font-bold mb-1.5">
                    <span className="text-[#007c76] flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5" /> Trực Tiếp Tại Hội Trường
                    </span>
                    <span className="text-slate-800">
                      {registrations.filter(r => r.trainingType === 'direct').length} học viên (
                      {registrations.length > 0 ? Math.round((registrations.filter(r => r.trainingType === 'direct').length / registrations.length) * 100) : 0}%)
                    </span>
                  </div>
                  <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-[#007c76] rounded-full transition-all duration-500"
                      style={{ width: `${registrations.length > 0 ? (registrations.filter(r => r.trainingType === 'direct').length / registrations.length) * 100 : 50}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Phân tích theo khóa đào tạo popular */}
            <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
              <h4 className="font-black text-slate-900 text-base flex items-center justify-between">
                <span>Top Khóa Đào Tạo Được Đăng Ký Nhiều Nhất</span>
                <span className="text-xs font-bold text-[#007c76]">Chuyên đề nổi bật</span>
              </h4>

              <div className="space-y-3 pt-1">
                {trainingCourses.slice(0, 4).map((tc, idx) => {
                  const regCount = registrations.filter(r => r.courseId === tc.id || r.courseTitle === tc.title).length;
                  return (
                    <div key={tc.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-2xl border border-slate-100">
                      <div className="flex items-center gap-3 truncate pr-2">
                        <span className="w-6 h-6 rounded-full bg-[#007c76]/10 text-[#007c76] font-black text-xs flex items-center justify-center shrink-0">
                          #{idx + 1}
                        </span>
                        <span className="font-bold text-xs text-slate-800 truncate">{tc.title}</span>
                      </div>
                      <div className="text-right shrink-0">
                        <span className="font-black text-xs text-[#007c76]">{regCount} lượt</span>
                        <span className="text-[10px] text-slate-400 block font-bold">{tc.price}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal Biên Lai Thu Học Phí */}
      <ReceiptModal
        isOpen={isReceiptModalOpen}
        onClose={() => setIsReceiptModalOpen(false)}
        initialData={selectedReceipt}
      />
    </div>
  );
};

export default TrainingCourseDashboard;
