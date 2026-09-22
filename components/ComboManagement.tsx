import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, doc, setDoc, deleteDoc, onSnapshot } from 'firebase/firestore';
import { Course } from '../types';
import { getMergedCourses } from '../constants';
import { useToast } from '../contexts/ToastContext';
import { broadcastComboUpdate } from '../utils/courseSyncService';
import { LivePriceQrPreview } from './LivePriceQrPreview';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Layers,
  Crown,
  Award,
  Shield,
  Search,
  Plus,
  Trash2,
  Edit,
  Save,
  ArrowLeft,
  Check,
  X,
  RefreshCw,
  Eye,
  EyeOff,
  AlertCircle,
  Sparkles,
  CheckCircle2,
  QrCode,
  BookOpen,
  CheckSquare,
  Square,
  HelpCircle
} from 'lucide-react';

export interface ComboItem {
  id: string;
  title: string;
  price: string;
  image: string;
  description: string;
  courseIds: string[];
  benefits?: string[];
  status?: 'active' | 'inactive';
  updatedAt?: string;
}

const DEFAULT_COMBOS: ComboItem[] = [
  {
    id: 'combo-basic',
    title: 'Gói Combo Basic (Nhập Môn Thực Phẩm)',
    price: '1.200.000đ',
    image: 'https://images.unsplash.com/photo-1556910103-1c02745aae4d?auto=format&fit=crop&q=80&w=800',
    description: 'Gói Combo Basic: Học trọn gói các kiến thức cơ bản về HACCP, 5 nguyên tắc vàng của WHO và các tiêu chuẩn kiểm soát chất lượng sơ bộ.',
    courseIds: ['basic-principles', 'truy-xuat-nguon-goc'],
    benefits: ['Tài liệu biểu mẫu SOP đính kèm', 'Cấp chứng nhận hoàn thành'],
    status: 'active'
  },
  {
    id: 'combo-pro',
    title: 'Gói Combo Pro (Chuyên Gia Vận Hành)',
    price: '1.800.000đ',
    image: 'https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?auto=format&fit=crop&q=80&w=800',
    description: 'Gói Combo Pro: Học chuyên sâu dành cho kỹ sư vận hành nhà máy gồm đầy đủ các khóa ISO (ISO 9001, ISO 14001, ISO 22000), nâng cao tối đa năng lực sản xuất.',
    courseIds: ['iso-9001', 'iso-14001', 'iso-22000'],
    benefits: ['Tài liệu biểu mẫu SOP đính kèm', 'Cấp chứng nhận hoàn thành'],
    status: 'active'
  }
];

const PRESET_BENEFITS = [
  'Tài liệu biểu mẫu SOP đính kèm',
  'Cấp chứng nhận hoàn thành',
  'Hỗ trợ giải đáp chuyên gia 24/7',
  'Truy cập khóa học trọn đời',
  'Tặng kèm toàn bộ slide bài giảng',
  'Bộ video bài giảng thực tế HD'
];

export const ComboManagement: React.FC = () => {
  const toast = useToast();

  // Navigation tabs: 'list' | 'add' | 'edit'
  const [activeTab, setActiveTab] = useState<'list' | 'add' | 'edit'>('list');

  // Main data states
  const [courses, setCourses] = useState<Course[]>([]);
  const [combos, setCombos] = useState<ComboItem[]>(() => {
    try {
      const cached = localStorage.getItem('combo_cache_all');
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {}
    return DEFAULT_COMBOS;
  });

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSaving, setIsSaving] = useState<boolean>(false);

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');

  // Editing / Creating states
  const [editingComboId, setEditingComboId] = useState<string>('');
  const [title, setTitle] = useState('');
  const [price, setPrice] = useState('1.200.000đ');
  const [image, setImage] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState<'active' | 'inactive'>('active');
  const [selectedCourseIds, setSelectedCourseIds] = useState<string[]>([]);
  const [benefits, setBenefits] = useState<string[]>([]);
  const [benefitInput, setBenefitInput] = useState('');
  const [courseSearchFilter, setCourseSearchFilter] = useState('');

  // Live QR Code Modal
  const [qrModalCombo, setQrModalCombo] = useState<ComboItem | null>(null);

  // Confirmation Modal
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    confirmText?: string;
    onConfirm: () => void;
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {}
  });

  // 1. Sync Courses & Combos in Real-Time
  useEffect(() => {
    // Sync available courses (filter out VIP/combos)
    const allCoursesList = getMergedCourses([]);
    const selectable = allCoursesList.filter(
      c => c.id !== 'khoa-vip' && c.id !== 'combo-basic' && c.id !== 'combo-pro' && c.category !== 'Gói VIP'
    );
    setCourses(selectable);

    let deletedIds: string[] = [];
    try {
      const delStr = localStorage.getItem('deleted_combo_ids');
      if (delStr) deletedIds = JSON.parse(delStr);
    } catch (e) {}

    const syncCombosData = (fsCombos?: ComboItem[]) => {
      let currentList = fsCombos;
      if (!currentList) {
        try {
          const cached = localStorage.getItem('combo_cache_all');
          if (cached) currentList = JSON.parse(cached);
        } catch (e) {}
      }

      // Merge defaults with DB
      const mergedDefaults = DEFAULT_COMBOS.map(def => {
        const found = (currentList || []).find(c => c.id === def.id);
        return found ? { ...def, ...found } : def;
      });

      const defaultIds = DEFAULT_COMBOS.map(d => d.id);
      const customCombos = (currentList || []).filter(c => !defaultIds.includes(c.id));

      const all = [...mergedDefaults, ...customCombos].filter(c => !deletedIds.includes(c.id));
      setCombos(all);
      setIsLoading(false);
    };

    // Auto-sync any locally cached combos to Firestore Cloud if not yet in Firestore
    const syncLocalCombosToFirestore = async (currentFsList: ComboItem[]) => {
      try {
        const cached = localStorage.getItem('combo_cache_all');
        if (!cached) return;
        const localList: ComboItem[] = JSON.parse(cached);
        if (!Array.isArray(localList) || localList.length === 0) return;

        const defaultIds = DEFAULT_COMBOS.map(d => d.id);
        const fsMap = new Map(currentFsList.map(c => [c.id, c]));
        let syncedCount = 0;

        for (const localCombo of localList) {
          if (!localCombo || !localCombo.id || defaultIds.includes(localCombo.id) || deletedIds.includes(localCombo.id)) continue;
          const fsCombo = fsMap.get(localCombo.id);
          const localTime = new Date(localCombo.updatedAt || 0).getTime();
          const fsTime = fsCombo ? new Date(fsCombo.updatedAt || 0).getTime() : 0;

          if (!fsCombo || localTime > fsTime) {
            const payload: any = {
              id: String(localCombo.id),
              title: String(localCombo.title || '').trim(),
              price: String(localCombo.price || '').trim(),
              image: String(localCombo.image || ''),
              description: String(localCombo.description || '').trim(),
              status: localCombo.status || 'active',
              courseIds: Array.isArray(localCombo.courseIds) ? localCombo.courseIds : [],
              benefits: Array.isArray(localCombo.benefits) ? localCombo.benefits : [],
              updatedAt: localCombo.updatedAt || new Date().toISOString()
            };
            await setDoc(doc(db, 'combos', localCombo.id), payload, { merge: true });
            syncedCount++;
          }
        }
        if (syncedCount > 0) {
          console.log(`Đã tự động đồng bộ ${syncedCount} gói combo từ máy lên cơ sở dữ liệu Cloud Firestore.`);
        }
      } catch (e) {
        console.warn("Lỗi auto-sync local combo sang cloud:", e);
      }
    };

    // Listen to Firestore
    const unsub = onSnapshot(collection(db, 'combos'), (snapshot) => {
      const dbCombos: ComboItem[] = [];
      snapshot.forEach((docSnap) => {
        dbCombos.push({ id: docSnap.id, ...docSnap.data() } as ComboItem);
      });
      syncCombosData(dbCombos);
      syncLocalCombosToFirestore(dbCombos);
    }, (err) => {
      console.warn("Lỗi snapshot Firestore combos:", err);
      syncCombosData();
    });

    // Listen to local BroadcastChannel and SSE updates
    const handleSyncEvent = () => {
      try {
        const delStr = localStorage.getItem('deleted_combo_ids');
        if (delStr) deletedIds = JSON.parse(delStr);
      } catch (e) {}
      syncCombosData();
    };

    window.addEventListener('combos_updated', handleSyncEvent);
    window.addEventListener('storage', handleSyncEvent);

    return () => {
      unsub();
      window.removeEventListener('combos_updated', handleSyncEvent);
      window.removeEventListener('storage', handleSyncEvent);
    };
  }, []);

  // Helper: Open Add Mode
  const handleOpenAdd = () => {
    setEditingComboId('');
    setTitle('');
    setPrice('1.200.000đ');
    setImage('https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&q=80&w=800');
    setDescription('');
    setStatus('active');
    setSelectedCourseIds([]);
    setBenefits(['Tài liệu biểu mẫu SOP đính kèm', 'Cấp chứng nhận hoàn thành']);
    setBenefitInput('');
    setCourseSearchFilter('');
    setActiveTab('add');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Helper: Open Edit Mode
  const handleOpenEdit = (combo: ComboItem) => {
    setEditingComboId(combo.id);
    setTitle(combo.title);
    setPrice(combo.price);
    setImage(combo.image || 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&q=80&w=800');
    setDescription(combo.description || '');
    setStatus(combo.status || 'active');
    setSelectedCourseIds(combo.courseIds || []);
    setBenefits(combo.benefits || ['Tài liệu biểu mẫu SOP đính kèm', 'Cấp chứng nhận hoàn thành']);
    setBenefitInput('');
    setCourseSearchFilter('');
    setActiveTab('edit');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Save / Update Combo
  const handleSaveCombo = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    if (!title.trim()) {
      toast.error('Vui lòng nhập tên gói combo!');
      return;
    }
    if (!price.trim()) {
      toast.error('Vui lòng nhập học phí gói combo!');
      return;
    }

    setIsSaving(true);
    const targetId = editingComboId || `combo-custom-${Date.now()}`;
    const now = new Date().toISOString();

    const comboData: ComboItem = {
      id: targetId,
      title: title.trim(),
      price: price.trim(),
      image: image.trim() || 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&q=80&w=800',
      description: description.trim(),
      status,
      courseIds: targetId === 'khoa-vip' ? [] : selectedCourseIds,
      benefits: benefits.filter(b => b.trim().length > 0),
      updatedAt: now
    };

    try {
      // 1. Optimistic Local State
      setCombos(prev => {
        const idx = prev.findIndex(c => c.id === targetId);
        if (idx >= 0) {
          const updated = [...prev];
          updated[idx] = comboData;
          return updated;
        }
        return [...prev, comboData];
      });

      // 2. Broadcast across tabs and server push via SSE
      await broadcastComboUpdate('upsert', { comboId: targetId, combo: comboData });

      // 3. Save to Firestore with timeout fallback
      const firestorePromise = setDoc(doc(db, 'combos', targetId), comboData, { merge: true });
      const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 2500));

      try {
        await Promise.race([firestorePromise, timeoutPromise]);
      } catch (fErr: any) {
        if (fErr.message === 'timeout') {
          console.warn(`[Combo Save] Firestore write timed out for ${targetId}, saved locally.`);
        } else {
          console.warn(`[Combo Save] Firestore write error:`, fErr);
        }
      }

      toast.success(editingComboId ? `Đã cập nhật gói combo "${title}" thành công!` : `Đã thêm gói combo mới "${title}" thành công!`);
      setActiveTab('list');
    } catch (err: any) {
      console.error('Lỗi khi lưu combo:', err);
      toast.error(`Có lỗi xảy ra: ${err.message || 'Không thể lưu combo'}`);
    } finally {
      setIsSaving(false);
    }
  };

  // Toggle Combo Status (Active / Inactive)
  const handleToggleStatus = async (combo: ComboItem, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();

    const newStatus: 'active' | 'inactive' = combo.status === 'inactive' ? 'active' : 'inactive';
    const comboId = combo.id;

    // Optimistic local update
    setCombos(prev => prev.map(c => c.id === comboId ? { ...c, status: newStatus } : c));

    // Broadcast across all tabs & SSE
    await broadcastComboUpdate('status', { comboId, status: newStatus });

    try {
      await setDoc(doc(db, 'combos', comboId), { status: newStatus, updatedAt: new Date().toISOString() }, { merge: true });
      toast.success(`Đã đổi trạng thái gói "${combo.title}" sang: ${newStatus === 'active' ? 'Đang hiện' : 'Đã ẩn'}`);
    } catch (err) {
      console.warn("Lỗi lưu trạng thái combo Firestore:", err);
    }
  };

  // Bulk Status Update
  const handleBulkStatusChange = async (targetStatus: 'active' | 'inactive') => {
    const updatedCombos = combos.map(c => ({ ...c, status: targetStatus }));
    setCombos(updatedCombos);

    await broadcastComboUpdate('sync_all', { combos: updatedCombos });

    for (const c of combos) {
      try {
        await setDoc(doc(db, 'combos', c.id), { status: targetStatus, updatedAt: new Date().toISOString() }, { merge: true });
      } catch (e) {}
    }

    toast.success(`Đã ${targetStatus === 'active' ? 'kích hoạt hiện tất cả' : 'ẩn tất cả'} gói combo!`);
  };

  // Delete Combo
  const promptDeleteCombo = (combo: ComboItem, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();

    const isSystemCombo = ['combo-basic', 'combo-pro', 'khoa-vip'].includes(combo.id);

    setConfirmModal({
      isOpen: true,
      title: isSystemCombo ? 'Cảnh báo xóa gói Combo hệ thống' : 'Xác nhận xóa gói Combo',
      message: isSystemCombo
        ? `Gói "${combo.title}" là gói mặc định của hệ thống. Bạn có chắc chắn muốn xóa khỏi giao diện học viên không?`
        : `Bạn có chắc chắn muốn xóa vĩnh viễn gói combo "${combo.title}" khỏi hệ thống?`,
      confirmText: 'Xác nhận xóa',
      onConfirm: async () => {
        setConfirmModal(prev => ({ ...prev, isOpen: false }));
        setIsSaving(true);
        try {
          // Optimistic local removal
          setCombos(prev => prev.filter(c => c.id !== combo.id));

          // Broadcast deletion
          await broadcastComboUpdate('delete', { comboId: combo.id });

          // Firestore delete
          await deleteDoc(doc(db, 'combos', combo.id));

          toast.success(`Đã xóa thành công gói combo "${combo.title}"!`);
          if (activeTab === 'edit' && editingComboId === combo.id) {
            setActiveTab('list');
          }
        } catch (err: any) {
          console.error("Lỗi khi xóa combo:", err);
          toast.error(`Lỗi khi xóa: ${err.message}`);
        } finally {
          setIsSaving(false);
        }
      }
    });
  };

  // Course Selector Helpers
  const handleToggleCourse = (courseId: string) => {
    if (editingComboId === 'khoa-vip') return;
    setSelectedCourseIds(prev =>
      prev.includes(courseId) ? prev.filter(id => id !== courseId) : [...prev, courseId]
    );
  };

  const handleSelectAllCourses = () => {
    if (editingComboId === 'khoa-vip') return;
    setSelectedCourseIds(courses.map(c => c.id));
  };

  const handleDeselectAllCourses = () => {
    if (editingComboId === 'khoa-vip') return;
    setSelectedCourseIds([]);
  };

  // Benefit Helpers
  const handleAddBenefit = (textToAdd?: string) => {
    const val = (textToAdd || benefitInput).trim();
    if (!val) return;
    if (benefits.includes(val)) {
      toast.error('Quyền lợi này đã được thêm!');
      return;
    }
    setBenefits(prev => [...prev, val]);
    if (!textToAdd) setBenefitInput('');
  };

  const handleRemoveBenefit = (idx: number) => {
    setBenefits(prev => prev.filter((_, i) => i !== idx));
  };

  // Filter combos for list view
  const filteredCombos = combos.filter(c => {
    const matchesSearch =
      c.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (c.description && c.description.toLowerCase().includes(searchQuery.toLowerCase()));

    const isComboActive = c.status !== 'inactive';
    const matchesStatus =
      statusFilter === 'all'
        ? true
        : statusFilter === 'active'
        ? isComboActive
        : !isComboActive;

    return matchesSearch && matchesStatus;
  });

  const activeCount = combos.filter(c => c.status !== 'inactive').length;
  const inactiveCount = combos.filter(c => c.status === 'inactive').length;

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* 1. TOP HEADER & TABS NAVIGATION */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6 pb-6 border-b border-gray-150">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl sm:text-3xl font-black text-gray-800 uppercase tracking-tight flex items-center gap-3">
              <Layers className="w-8 h-8 text-[#007c76] shrink-0" />
              Hệ thống Quản lý Gói Combo Đào Tạo
            </h1>
            <span className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full text-[10px] font-extrabold uppercase tracking-wider">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              Đồng bộ thời gian thực
            </span>
          </div>
          <p className="text-gray-400 text-xs font-bold uppercase tracking-wider mt-1">
            Bảng điều khiển cho Quản trị viên & Giáo viên • Tạo gói combo, định giá VietQR và liên kết khóa học
          </p>
        </div>

        {/* Action / Mode Tabs */}
        <div className="flex items-center gap-2 bg-gray-100 p-1.5 rounded-2xl border border-gray-200 self-start md:self-auto shrink-0">
          <button
            type="button"
            onClick={() => setActiveTab('list')}
            className={`px-4 py-2.5 rounded-xl font-black text-xs uppercase tracking-wider transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === 'list'
                ? 'bg-white text-[#007c76] shadow-sm'
                : 'text-gray-500 hover:text-gray-800'
            }`}
          >
            <Layers className="w-4 h-4" />
            <span>Danh sách Combo ({combos.length})</span>
          </button>

          <button
            type="button"
            onClick={handleOpenAdd}
            className={`px-4 py-2.5 rounded-xl font-black text-xs uppercase tracking-wider transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === 'add'
                ? 'bg-[#007c76] text-white shadow-md shadow-[#007c76]/20'
                : 'bg-white/80 hover:bg-white text-[#007c76]'
            }`}
          >
            <Plus className="w-4 h-4" />
            <span>Thêm Combo Mới</span>
          </button>
        </div>
      </div>

      {/* 2. TAB VIEW: LIST OF COMBOS */}
      {activeTab === 'list' && (
        <motion.div
          key="combo-list-view"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.2 }}
          className="space-y-6"
        >
          {/* Search, Status Filters & Bulk Actions Toolbar */}
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-white p-4 sm:p-5 rounded-[28px] border border-gray-150 shadow-sm">
            {/* Search Input */}
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 text-gray-400 absolute left-4 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Tìm kiếm gói combo theo tên, mã ID hoặc mô tả..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-11 pr-10 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs sm:text-sm font-semibold text-gray-700 placeholder-gray-400 focus:outline-none focus:bg-white focus:border-[#007c76] transition-all"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-1"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Status Filter Buttons */}
            <div className="flex flex-wrap items-center gap-2">
              <div className="inline-flex p-1 bg-gray-100 rounded-xl border border-gray-200 text-xs font-bold">
                <button
                  type="button"
                  onClick={() => setStatusFilter('all')}
                  className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                    statusFilter === 'all'
                      ? 'bg-white text-gray-800 shadow-xs'
                      : 'text-gray-500 hover:text-gray-800'
                  }`}
                >
                  Tất cả ({combos.length})
                </button>
                <button
                  type="button"
                  onClick={() => setStatusFilter('active')}
                  className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
                    statusFilter === 'active'
                      ? 'bg-white text-emerald-700 shadow-xs'
                      : 'text-gray-500 hover:text-gray-800'
                  }`}
                >
                  <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                  Đang hiện ({activeCount})
                </button>
                <button
                  type="button"
                  onClick={() => setStatusFilter('inactive')}
                  className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
                    statusFilter === 'inactive'
                      ? 'bg-white text-gray-700 shadow-xs'
                      : 'text-gray-500 hover:text-gray-800'
                  }`}
                >
                  <span className="w-2 h-2 rounded-full bg-gray-400"></span>
                  Đã ẩn ({inactiveCount})
                </button>
              </div>

              {/* Bulk Action Buttons */}
              <div className="flex items-center gap-1.5 ml-auto sm:ml-0">
                <button
                  type="button"
                  onClick={() => handleBulkStatusChange('active')}
                  title="Hiện tất cả gói combo cho học viên"
                  className="px-3 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-xl text-[11px] font-bold uppercase tracking-wider flex items-center gap-1.5 transition-all cursor-pointer"
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Hiện tất cả</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleBulkStatusChange('inactive')}
                  title="Ẩn tất cả gói combo khỏi giao diện"
                  className="px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-600 border border-gray-200 rounded-xl text-[11px] font-bold uppercase tracking-wider flex items-center gap-1.5 transition-all cursor-pointer"
                >
                  <EyeOff className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Ẩn tất cả</span>
                </button>
              </div>
            </div>
          </div>

          {/* Table Container */}
          {isLoading ? (
            <div className="py-24 flex flex-col items-center justify-center gap-4 bg-white rounded-[32px] border border-gray-150">
              <RefreshCw className="w-8 h-8 text-[#007c76] animate-spin" />
              <p className="text-gray-400 text-xs font-bold uppercase tracking-wider animate-pulse">
                Đang nạp danh sách gói combo...
              </p>
            </div>
          ) : filteredCombos.length === 0 ? (
            <div className="text-center py-20 bg-white rounded-[32px] border border-gray-150 p-8 space-y-4">
              <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto text-gray-400">
                <Layers className="w-8 h-8" />
              </div>
              <h3 className="text-base font-extrabold text-gray-700 uppercase tracking-tight">
                Không tìm thấy gói combo nào
              </h3>
              <p className="text-gray-400 text-xs max-w-md mx-auto">
                {searchQuery
                  ? `Không có kết quả khớp với từ khóa "${searchQuery}". Hãy thử tìm kiếm bằng từ khóa khác.`
                  : 'Chưa có gói combo nào trong danh mục đã chọn.'}
              </p>
              <button
                type="button"
                onClick={handleOpenAdd}
                className="px-5 py-2.5 bg-[#007c76] hover:bg-[#005f5b] text-white text-xs font-bold uppercase tracking-wider rounded-xl transition-all inline-flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                Tạo gói Combo đầu tiên
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-[28px] border border-gray-150 bg-white shadow-sm custom-scrollbar pb-1">
              <table className="w-full text-left border-collapse min-w-[980px] whitespace-nowrap">
                <thead>
                  <tr className="bg-gray-50/80 border-b border-gray-150 text-gray-500 text-[10px] sm:text-xs font-bold uppercase tracking-widest whitespace-nowrap">
                    <th className="py-4 px-6 whitespace-nowrap">Ảnh bìa</th>
                    <th className="py-4 px-6 min-w-[280px] whitespace-nowrap">Tiêu đề Gói Combo</th>
                    <th className="py-4 px-6 whitespace-nowrap">Học phí (VNĐ)</th>
                    <th className="py-4 px-6 whitespace-nowrap">Khóa liên kết</th>
                    <th className="py-4 px-6 whitespace-nowrap">Quyền lợi</th>
                    <th className="py-4 px-6 text-center whitespace-nowrap">Trạng thái</th>
                    <th className="py-4 px-6 text-right whitespace-nowrap">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredCombos.map((combo) => {
                    const isSystemCombo = ['combo-basic', 'combo-pro', 'khoa-vip'].includes(combo.id);
                    const isActive = combo.status !== 'inactive';
                    const isVip = combo.id === 'khoa-vip' || combo.id.includes('vip');
                    const isPro = combo.id === 'combo-pro' || combo.id.includes('pro');

                    return (
                      <tr
                        key={combo.id}
                        className="hover:bg-[#007c76]/[0.035] transition-all duration-200 text-xs sm:text-sm text-gray-700 whitespace-nowrap group/row"
                      >
                        {/* 1. Thumbnail */}
                        <td className="py-4 px-6">
                          <div className="relative w-16 h-11 rounded-xl overflow-hidden border border-gray-200 shadow-2xs group-hover/row:scale-105 transition-transform">
                            <img
                              src={combo.image}
                              alt={combo.title}
                              className="w-full h-full object-cover"
                              onError={(e) => {
                                (e.target as HTMLImageElement).src =
                                  'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&q=80&w=800';
                              }}
                            />
                            {isVip && (
                              <span className="absolute top-0.5 right-0.5 bg-amber-500 text-white p-0.5 rounded shadow">
                                <Crown className="w-2.5 h-2.5" />
                              </span>
                            )}
                          </div>
                        </td>

                        {/* 2. Title & ID */}
                        <td className="py-4 px-6 min-w-[280px]">
                          <div className="flex items-center gap-2">
                            <span className="font-extrabold text-gray-900 group-hover/row:text-[#007c76] transition-colors leading-snug">
                              {combo.title}
                            </span>
                            {isSystemCombo && (
                              <span className="px-2 py-0.5 bg-amber-50 text-amber-700 border border-amber-200 rounded-md text-[9px] font-bold uppercase tracking-wider">
                                Mặc định
                              </span>
                            )}
                          </div>
                          <span className="text-[10px] font-bold text-gray-400 block mt-1 uppercase tracking-wider">
                            ID: {combo.id}
                          </span>
                        </td>

                        {/* 3. Price & VietQR Button */}
                        <td className="py-4 px-6">
                          <div className="flex items-center gap-2">
                            <span className="font-extrabold text-[#007c76] text-sm sm:text-base">
                              {combo.price}
                            </span>
                            <button
                              type="button"
                              onClick={() => setQrModalCombo(combo)}
                              title="Xem mã QR thanh toán VietQR"
                              className="p-1.5 bg-[#007c76]/10 hover:bg-[#007c76]/20 text-[#007c76] rounded-lg transition-all cursor-pointer"
                            >
                              <QrCode className="w-4 h-4" />
                            </button>
                          </div>
                        </td>

                        {/* 4. Linked Courses Count */}
                        <td className="py-4 px-6">
                          <span
                            className={`px-3 py-1.5 rounded-xl text-[11px] font-extrabold border inline-flex items-center gap-1.5 ${
                              isVip
                                ? 'bg-amber-50 text-amber-800 border-amber-200'
                                : 'bg-gray-100 text-gray-700 border-gray-200'
                            }`}
                          >
                            <BookOpen className="w-3.5 h-3.5" />
                            {combo.id === 'khoa-vip' ? 'Toàn bộ khóa học' : `${combo.courseIds?.length || 0} khóa học`}
                          </span>
                        </td>

                        {/* 5. Benefits Summary */}
                        <td className="py-4 px-6">
                          <span className="text-xs font-bold text-gray-600">
                            {combo.benefits?.length || 0} quyền lợi
                          </span>
                        </td>

                        {/* 6. Status Toggle */}
                        <td className="py-4 px-6 text-center">
                          <button
                            type="button"
                            onClick={(e) => handleToggleStatus(combo, e)}
                            className={`px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-wider inline-flex items-center gap-1.5 border transition-all cursor-pointer ${
                              isActive
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                                : 'bg-gray-100 text-gray-500 border-gray-200 hover:bg-gray-200'
                            }`}
                          >
                            <span
                              className={`w-2 h-2 rounded-full ${
                                isActive ? 'bg-emerald-500' : 'bg-gray-400'
                              }`}
                            ></span>
                            {isActive ? 'Đang hiện' : 'Đã ẩn'}
                          </button>
                        </td>

                        {/* 7. Action Buttons */}
                        <td className="py-4 px-6 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              type="button"
                              onClick={() => handleOpenEdit(combo)}
                              className="px-3.5 py-2 bg-teal-50 hover:bg-teal-100 text-[#007c76] border border-teal-200/60 rounded-xl text-xs font-extrabold uppercase tracking-wider flex items-center gap-1.5 transition-all cursor-pointer"
                            >
                              <Edit className="w-3.5 h-3.5" />
                              <span>Sửa</span>
                            </button>

                            <button
                              type="button"
                              onClick={(e) => promptDeleteCombo(combo, e)}
                              className="px-3.5 py-2 bg-red-50 hover:bg-red-100 text-red-600 border border-transparent hover:border-red-200 rounded-xl text-xs font-extrabold uppercase tracking-wider flex items-center gap-1.5 transition-all cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                              <span>Xóa</span>
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
        </motion.div>
      )}

      {/* 3. TAB VIEW: ADD OR EDIT COMBO FORM */}
      {(activeTab === 'add' || activeTab === 'edit') && (
        <motion.div
          key="combo-form-view"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.25 }}
        >
          <form onSubmit={handleSaveCombo} className="space-y-8">
            {/* Header info banner */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#007c76]/[0.06] border border-[#007c76]/20 p-5 rounded-3xl">
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setActiveTab('list')}
                  className="p-2.5 bg-white hover:bg-gray-100 text-gray-700 border border-gray-200 rounded-xl transition-all cursor-pointer"
                >
                  <ArrowLeft className="w-5 h-5" />
                </button>
                <div>
                  <h2 className="text-lg sm:text-xl font-black text-gray-800 uppercase tracking-tight">
                    {activeTab === 'add' ? 'Tạo Gói Combo Đào Tạo Mới' : `Chỉnh sửa Gói: ${title || 'Chưa đặt tên'}`}
                  </h2>
                  <p className="text-gray-500 text-xs font-medium">
                    Điền các thông tin chi tiết, liên kết khóa học và cấu hình quyền lợi bên dưới
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setActiveTab('list')}
                  className="px-4 py-2.5 bg-white hover:bg-gray-50 text-gray-700 border border-gray-200 rounded-xl text-xs font-bold uppercase tracking-wider transition-all"
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-6 py-2.5 bg-[#007c76] hover:bg-[#005f5b] text-white rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-2 shadow-md shadow-[#007c76]/20 transition-all cursor-pointer disabled:opacity-50"
                >
                  {isSaving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  <span>{activeTab === 'add' ? 'Tạo Gói Combo' : 'Lưu Thay Đổi'}</span>
                </button>
              </div>
            </div>

            {/* Form Two-Column Layout */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
              {/* LEFT COLUMN: Main Info & VietQR Preview (7 cols) */}
              <div className="lg:col-span-7 space-y-6">
                {/* 1. Basic Information Card */}
                <div className="bg-white p-6 sm:p-8 rounded-[32px] border border-gray-150 shadow-sm space-y-6">
                  <h3 className="text-base font-black text-gray-800 uppercase tracking-tight flex items-center gap-2">
                    <span className="w-1.5 h-5 bg-[#007c76] rounded-full"></span>
                    Thông Tin Cơ Bản Gói Combo
                  </h3>

                  <div className="space-y-4">
                    {/* Title */}
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-gray-400 mb-2">
                        Tên / Tiêu Đề Gói Combo <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        placeholder="Ví dụ: Gói Combo Basic (Nhập Môn Thực Phẩm)"
                        className="w-full px-4 py-3.5 bg-gray-50 border border-gray-200 rounded-2xl font-bold text-gray-800 text-sm focus:outline-none focus:bg-white focus:border-[#007c76] focus:ring-1 focus:ring-[#007c76] transition-all"
                      />
                    </div>

                    {/* Price & Status Row */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-gray-400 mb-2">
                          Học Phí Combo (VNĐ) <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          required
                          value={price}
                          onChange={(e) => setPrice(e.target.value)}
                          placeholder="Ví dụ: 1.200.000đ"
                          className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl font-black text-[#007c76] text-sm focus:outline-none focus:bg-white focus:border-[#007c76] focus:ring-1 focus:ring-[#007c76] transition-all"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-gray-400 mb-2">
                          Trạng Thái Hiển Thị
                        </label>
                        <select
                          value={status}
                          onChange={(e) => setStatus(e.target.value as any)}
                          className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl font-bold text-gray-700 text-sm focus:outline-none focus:bg-white focus:border-[#007c76] transition-all"
                        >
                          <option value="active">🟢 Đang hiện (Hiển thị cho học viên)</option>
                          <option value="inactive">⚪ Đã ẩn (Chỉ lưu nội bộ)</option>
                        </select>
                      </div>
                    </div>

                    {/* Image URL & Thumbnail Preview */}
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-gray-400 mb-2">
                        Đường dẫn Ảnh Bìa (URL)
                      </label>
                      <div className="flex gap-3">
                        <input
                          type="text"
                          value={image}
                          onChange={(e) => setImage(e.target.value)}
                          placeholder="https://images.unsplash.com/..."
                          className="flex-grow px-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl text-xs sm:text-sm font-medium text-gray-700 focus:outline-none focus:bg-white focus:border-[#007c76] transition-all"
                        />
                        {image && (
                          <div className="w-12 h-11 rounded-xl overflow-hidden border border-gray-200 shrink-0">
                            <img
                              src={image}
                              alt="Preview"
                              className="w-full h-full object-cover"
                              onError={(e) => {
                                (e.target as HTMLImageElement).src =
                                  'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&q=80&w=800';
                              }}
                            />
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Description */}
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-gray-400 mb-2">
                        Mô Tả Gói Combo
                      </label>
                      <textarea
                        rows={3}
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        placeholder="Mô tả tóm tắt nội dung, đối tượng phù hợp và giá trị gói combo mang lại..."
                        className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl text-xs sm:text-sm font-medium text-gray-700 focus:outline-none focus:bg-white focus:border-[#007c76] transition-all leading-relaxed"
                      />
                    </div>
                  </div>
                </div>

                {/* 2. Benefits Builder Card */}
                <div className="bg-white p-6 sm:p-8 rounded-[32px] border border-gray-150 shadow-sm space-y-6">
                  <div className="flex items-center justify-between">
                    <h3 className="text-base font-black text-gray-800 uppercase tracking-tight flex items-center gap-2">
                      <span className="w-1.5 h-5 bg-[#007c76] rounded-full"></span>
                      Quyền Lợi Đi Kèm ({benefits.length})
                    </h3>
                  </div>

                  {/* Add Benefit Input */}
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={benefitInput}
                      onChange={(e) => setBenefitInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleAddBenefit();
                        }
                      }}
                      placeholder="Nhập quyền lợi mới (ví dụ: Hỗ trợ 1-1 chuyên gia)..."
                      className="flex-grow px-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl text-xs sm:text-sm font-medium text-gray-700 focus:outline-none focus:bg-white focus:border-[#007c76]"
                    />
                    <button
                      type="button"
                      onClick={() => handleAddBenefit()}
                      className="px-5 bg-[#007c76] hover:bg-[#005f5b] text-white rounded-2xl font-black text-xs uppercase tracking-wider flex items-center gap-1.5 transition-all cursor-pointer"
                    >
                      <Plus className="w-4 h-4" />
                      <span>Thêm</span>
                    </button>
                  </div>

                  {/* Quick Preset Tags */}
                  <div>
                    <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-2">
                      Gợi ý quyền lợi nhanh (Click để thêm):
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {PRESET_BENEFITS.map((preset, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => handleAddBenefit(preset)}
                          className="px-3 py-1.5 bg-gray-100 hover:bg-[#007c76]/10 hover:text-[#007c76] text-gray-600 rounded-xl text-xs font-semibold border border-gray-200 transition-all cursor-pointer flex items-center gap-1"
                        >
                          <Plus className="w-3 h-3 opacity-60" />
                          <span>{preset}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Current Added Benefits Chips */}
                  <div className="space-y-2 pt-2 border-t border-gray-100">
                    <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">
                      Danh sách quyền lợi hiện tại:
                    </p>
                    {benefits.length === 0 ? (
                      <p className="text-xs text-gray-400 italic py-2">Chưa thêm quyền lợi nào.</p>
                    ) : (
                      <div className="flex flex-wrap gap-2">
                        {benefits.map((b, idx) => (
                          <div
                            key={idx}
                            className="inline-flex items-center gap-2 px-3 py-1.5 bg-[#007c76]/10 text-[#007c76] border border-[#007c76]/20 rounded-xl text-xs font-bold"
                          >
                            <Check className="w-3.5 h-3.5 text-[#007c76]" />
                            <span>{b}</span>
                            <button
                              type="button"
                              onClick={() => handleRemoveBenefit(idx)}
                              className="text-red-400 hover:text-red-600 ml-1 cursor-pointer"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* 3. Embedded Live VietQR Code Preview */}
                <div className="bg-white p-6 sm:p-8 rounded-[32px] border border-gray-150 shadow-sm space-y-4">
                  <h3 className="text-base font-black text-gray-800 uppercase tracking-tight flex items-center gap-2">
                    <QrCode className="w-5 h-5 text-[#007c76]" />
                    Xem Trước Mã QR Thanh Toán VietQR Tự Động
                  </h3>
                  <p className="text-gray-400 text-xs font-medium">
                    Mã QR thanh toán ngân hàng sẽ tự động cập nhật theo học phí và tên gói combo đã nhập.
                  </p>
                  <div className="pt-2">
                    <LivePriceQrPreview
                      price={price}
                      onPriceChange={(newPrice) => setPrice(newPrice)}
                      courseId={editingComboId || 'COMBO-NEW'}
                      courseTitle={title || 'Gói Combo Học Tập'}
                    />
                  </div>
                </div>
              </div>

              {/* RIGHT COLUMN: Linking Courses (5 cols) */}
              <div className="lg:col-span-5 space-y-6">
                <div className="bg-white p-6 sm:p-8 rounded-[32px] border border-gray-150 shadow-sm space-y-6 sticky top-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-base font-black text-gray-800 uppercase tracking-tight flex items-center gap-2">
                        <BookOpen className="w-5 h-5 text-[#007c76]" />
                        Liên Kết Khóa Học
                      </h3>
                      <p className="text-gray-400 text-xs font-bold uppercase tracking-wider mt-0.5">
                        Đã chọn: {editingComboId === 'khoa-vip' ? 'Toàn bộ khóa' : `${selectedCourseIds.length} / ${courses.length} khóa`}
                      </p>
                    </div>

                    {editingComboId !== 'khoa-vip' && (
                      <div className="flex items-center gap-2 text-xs font-extrabold">
                        <button
                          type="button"
                          onClick={handleSelectAllCourses}
                          className="text-[#007c76] hover:underline uppercase tracking-wider cursor-pointer"
                        >
                          Chọn hết
                        </button>
                        <span className="text-gray-300">|</span>
                        <button
                          type="button"
                          onClick={handleDeselectAllCourses}
                          className="text-gray-400 hover:underline uppercase tracking-wider cursor-pointer"
                        >
                          Bỏ chọn
                        </button>
                      </div>
                    )}
                  </div>

                  {editingComboId === 'khoa-vip' ? (
                    <div className="bg-amber-50 border-2 border-dashed border-amber-300 rounded-3xl p-6 text-center text-amber-900 space-y-3">
                      <Crown className="w-10 h-10 text-amber-500 mx-auto" />
                      <h4 className="font-extrabold uppercase text-sm">Gói VIP Đặc Quyền Toàn Diện</h4>
                      <p className="text-xs font-semibold leading-relaxed text-amber-800/80">
                        Gói Combo VIP tự động mở khóa toàn bộ khóa học hiện có và các khóa học mới được thêm vào hệ thống trong tương lai.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {/* Search Courses Filter */}
                      <div className="relative">
                        <Search className="w-3.5 h-3.5 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                        <input
                          type="text"
                          placeholder="Lọc danh sách khóa học..."
                          value={courseSearchFilter}
                          onChange={(e) => setCourseSearchFilter(e.target.value)}
                          className="w-full pl-9 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-medium text-gray-700 focus:outline-none focus:bg-white focus:border-[#007c76]"
                        />
                      </div>

                      {/* Course Selection List */}
                      <div className="max-h-[500px] overflow-y-auto custom-scrollbar divide-y divide-gray-100 border border-gray-150 rounded-2xl p-1 bg-gray-50/50">
                        {courses
                          .filter(c => c.title.toLowerCase().includes(courseSearchFilter.toLowerCase()))
                          .map((course) => {
                            const isChecked = selectedCourseIds.includes(course.id);
                            return (
                              <button
                                key={course.id}
                                type="button"
                                onClick={() => handleToggleCourse(course.id)}
                                className={`w-full p-3 flex items-center justify-between text-left rounded-xl transition-all cursor-pointer group ${
                                  isChecked
                                    ? 'bg-[#007c76]/[0.08] text-gray-900 font-bold'
                                    : 'hover:bg-white text-gray-600'
                                }`}
                              >
                                <div className="flex items-center gap-3 min-w-0 pr-2">
                                  <img
                                    src={course.image}
                                    alt={course.title}
                                    className="w-12 h-8 object-cover rounded-lg border border-gray-200 shrink-0"
                                    onError={(e) => {
                                      (e.target as HTMLImageElement).src =
                                        'https://images.unsplash.com/photo-1513104890138-7c749659a591';
                                    }}
                                  />
                                  <div className="min-w-0">
                                    <p className="text-xs font-bold leading-snug truncate group-hover:text-[#007c76] transition-colors">
                                      {course.title}
                                    </p>
                                    <p className="text-[10px] text-gray-400 font-medium">
                                      {course.price} • ID: {course.id}
                                    </p>
                                  </div>
                                </div>

                                <div className="shrink-0">
                                  {isChecked ? (
                                    <CheckSquare className="w-5 h-5 text-[#007c76]" />
                                  ) : (
                                    <Square className="w-5 h-5 text-gray-300 group-hover:text-gray-400" />
                                  )}
                                </div>
                              </button>
                            );
                          })}
                      </div>
                    </div>
                  )}

                  {/* Form Action Controls */}
                  <div className="pt-4 border-t border-gray-150 space-y-3">
                    <button
                      type="submit"
                      disabled={isSaving}
                      className="w-full py-4 bg-[#007c76] hover:bg-[#005f5b] text-white rounded-2xl font-black uppercase tracking-wider text-xs sm:text-sm flex items-center justify-center gap-2 shadow-lg shadow-[#007c76]/20 transition-all active:scale-98 disabled:opacity-50 cursor-pointer"
                    >
                      {isSaving ? <RefreshCw className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                      <span>{activeTab === 'add' ? 'Tạo gói Combo Mới' : 'Lưu Thay Đổi Gói Combo'}</span>
                    </button>

                    {activeTab === 'edit' && (
                      <button
                        type="button"
                        onClick={() => {
                          const combo = combos.find(c => c.id === editingComboId);
                          if (combo) promptDeleteCombo(combo);
                        }}
                        className="w-full py-3 bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 rounded-2xl font-bold uppercase tracking-wider text-xs flex items-center justify-center gap-2 transition-all cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4" />
                        <span>Xóa Gói Combo Này</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </form>
        </motion.div>
      )}

      {/* 4. MODAL: LIVE VIETQR PREVIEW MODAL */}
      <AnimatePresence>
        {qrModalCombo && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-[32px] p-6 sm:p-8 max-w-lg w-full border border-gray-200 shadow-2xl space-y-6 relative"
            >
              <div className="flex items-center justify-between pb-4 border-b border-gray-150">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 bg-[#007c76]/10 text-[#007c76] rounded-xl">
                    <QrCode className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-black text-gray-800 text-base uppercase tracking-tight">
                      Mã QR VietQR: {qrModalCombo.title}
                    </h3>
                    <p className="text-gray-400 text-xs font-semibold">
                      Học phí: {qrModalCombo.price}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setQrModalCombo(null)}
                  className="p-2 text-gray-400 hover:text-gray-600 rounded-xl hover:bg-gray-100 transition-all cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <LivePriceQrPreview
                price={qrModalCombo.price}
                courseId={qrModalCombo.id}
                courseTitle={qrModalCombo.title}
                readOnly={true}
              />

              <div className="flex justify-end pt-2">
                <button
                  type="button"
                  onClick={() => setQrModalCombo(null)}
                  className="px-6 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-extrabold text-xs uppercase tracking-wider rounded-xl transition-all cursor-pointer"
                >
                  Đóng cửa sổ
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 5. MODAL: CONFIRMATION DIALOG */}
      <AnimatePresence>
        {confirmModal.isOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-[32px] p-6 sm:p-8 max-w-md w-full border border-gray-200 shadow-2xl space-y-6"
            >
              <div className="w-12 h-12 rounded-2xl bg-red-50 text-red-500 flex items-center justify-center mx-auto">
                <AlertCircle className="w-6 h-6" />
              </div>

              <div className="text-center space-y-2">
                <h3 className="text-lg font-black text-gray-900 uppercase tracking-tight">
                  {confirmModal.title}
                </h3>
                <p className="text-xs text-gray-500 leading-relaxed font-medium">
                  {confirmModal.message}
                </p>
              </div>

              <div className="flex items-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
                  className="flex-1 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-bold text-xs uppercase tracking-wider transition-all cursor-pointer"
                >
                  Hủy bỏ
                </button>
                <button
                  type="button"
                  onClick={confirmModal.onConfirm}
                  className="flex-1 py-3 bg-red-600 hover:bg-red-700 text-white rounded-xl font-black text-xs uppercase tracking-wider shadow-md shadow-red-600/20 transition-all cursor-pointer"
                >
                  {confirmModal.confirmText || 'Xác nhận'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default ComboManagement;
