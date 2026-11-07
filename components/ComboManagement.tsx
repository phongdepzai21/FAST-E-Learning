import React, { useState, useEffect, useMemo } from 'react';
import { db } from '../firebase';
import { collection, doc, setDoc, deleteDoc, onSnapshot } from 'firebase/firestore';
import { Course } from '../types';
import { getMergedCourses } from '../constants';
import { useToast } from '../contexts/ToastContext';
import { broadcastComboUpdate } from '../utils/courseSyncService';
import { LivePriceQrPreview } from './LivePriceQrPreview';
import { AnimatedPriceCounter } from './AnimatedPriceCounter';
import { motion, AnimatePresence } from 'motion/react';
import {
  Layers,
  Crown,
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
  QrCode,
  BookOpen,
  CheckSquare,
  Square,
  LayoutGrid,
  Table as TableIcon,
  Sparkles,
  ChevronDown,
  ChevronUp,
  Tag
} from 'lucide-react';

export interface ComboItem {
  id: string;
  title: string;
  price: string;
  originalPrice?: string;
  savings?: string;
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
    benefits: ['Tài liệu hướng dẫn chuyên sâu đính kèm', 'Cấp chứng nhận hoàn thành', 'Hỗ trợ giải đáp 24/7'],
    status: 'active'
  },
  {
    id: 'combo-pro',
    title: 'Gói Combo Pro (Chuyên Gia Vận Hành)',
    price: '1.800.000đ',
    image: 'https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?auto=format&fit=crop&q=80&w=800',
    description: 'Gói Combo Pro: Học chuyên sâu dành cho kỹ sư vận hành nhà máy gồm đầy đủ các khóa ISO (ISO 9001, ISO 14001, ISO 22000), nâng cao tối đa năng lực sản xuất.',
    courseIds: ['iso-9001', 'iso-14001', 'iso-22000'],
    benefits: ['Tài liệu hướng dẫn chuyên sâu đính kèm', 'Cấp chứng nhận hoàn thành', 'Hỗ trợ trực tiếp từ Chuyên gia', 'Truy cập khóa học trọn đời'],
    status: 'active'
  }
];

const PRESET_BENEFITS = [
  'Tài liệu hướng dẫn chuyên sâu đính kèm',
  'Cấp chứng nhận hoàn thành',
  'Hỗ trợ giải đáp chuyên gia 24/7',
  'Truy cập khóa học trọn đời',
  'Tặng kèm toàn bộ slide bài giảng',
  'Bộ video bài giảng thực tế HD'
];

const UNSPLASH_IMAGE_PRESETS = [
  { title: 'Thực Phẩm & An Toàn', url: 'https://images.unsplash.com/photo-1556910103-1c02745aae4d?auto=format&fit=crop&q=80&w=800' },
  { title: 'Nhà Máy & Sản Xuất', url: 'https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?auto=format&fit=crop&q=80&w=800' },
  { title: 'Chuyên Gia & Phòng Lab', url: 'https://images.unsplash.com/photo-1582719508461-905c673771fd?auto=format&fit=crop&q=80&w=800' },
  { title: 'Môi Trường & Đô Thị', url: 'https://images.unsplash.com/photo-1500651230702-0e2d8a49d4ad?auto=format&fit=crop&q=80&w=800' }
];

export const ComboManagement: React.FC = () => {
  const toast = useToast();

  // Navigation tabs: 'list' | 'add' | 'edit'
  const [activeTab, setActiveTab] = useState<'list' | 'add' | 'edit'>('list');
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');

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
  const [expandedComboIds, setExpandedComboIds] = useState<Record<string, boolean>>({
    'combo-basic': true,
    'combo-pro': true
  });

  // Editing / Creating states
  const [editingComboId, setEditingComboId] = useState<string>('');
  const [title, setTitle] = useState('');
  const [price, setPrice] = useState('1.200.000đ');
  const [originalPrice, setOriginalPrice] = useState('2.400.000đ');
  const [discountPercent, setDiscountPercent] = useState<number>(50);
  const [image, setImage] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState<'active' | 'inactive'>('active');
  const [selectedCourseIds, setSelectedCourseIds] = useState<string[]>([]);
  const [benefits, setBenefits] = useState<string[]>([]);
  const [benefitInput, setBenefitInput] = useState('');
  const [courseSearchFilter, setCourseSearchFilter] = useState('');
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string>('all');

  // Helper functions for automatic Sale Off % calculations
  const parsePriceNumber = (str: string): number => {
    if (!str) return 0;
    const digits = str.replace(/[^\d]/g, '');
    return parseInt(digits, 10) || 0;
  };

  const formatVndPrice = (num: number): string => {
    if (num <= 0) return '0đ';
    return num.toLocaleString('vi-VN') + 'đ';
  };

  const handleOriginalPriceChange = (newOrigStr: string) => {
    setOriginalPrice(newOrigStr);
    const numOrig = parsePriceNumber(newOrigStr);
    if (numOrig > 0) {
      const discountedNum = Math.round(numOrig * (1 - (discountPercent || 0) / 100));
      setPrice(formatVndPrice(discountedNum));
    }
  };

  const handleDiscountPercentChange = (pct: number) => {
    const clampedPct = Math.min(99, Math.max(0, pct));
    setDiscountPercent(clampedPct);
    const numOrig = parsePriceNumber(originalPrice);
    if (numOrig > 0) {
      const discountedNum = Math.round(numOrig * (1 - clampedPct / 100));
      setPrice(formatVndPrice(discountedNum));
    }
  };

  const handleDiscountedPriceChange = (newPriceStr: string) => {
    setPrice(newPriceStr);
    const numOrig = parsePriceNumber(originalPrice);
    const numPrice = parsePriceNumber(newPriceStr);
    if (numOrig > 0 && numPrice > 0 && numOrig >= numPrice) {
      const calculatedPct = Math.round(((numOrig - numPrice) / numOrig) * 100);
      setDiscountPercent(calculatedPct);
    }
  };

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

  // Map courses by ID for quick lookups
  const courseMap = useMemo(() => {
    const map = new Map<string, Course>();
    courses.forEach(c => map.set(c.id, c));
    return map;
  }, [courses]);

  // Extract all categories from available courses
  const categories = useMemo(() => {
    const set = new Set<string>();
    courses.forEach(c => {
      if (c.category) set.add(c.category);
    });
    return Array.from(set);
  }, [courses]);

  // 1. Sync Courses & Combos in Real-Time
  useEffect(() => {
    const allCoursesList = getMergedCourses([]);
    const selectable = allCoursesList.filter(
      c => c.id !== 'khoa-vip' && c.id !== 'combo-basic' && c.id !== 'combo-pro' && c.category !== 'Gói VIP' && c.status !== 'inactive' && c.status !== 'draft'
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

    const syncLocalCombosToFirestore = async (currentFsList: ComboItem[]) => {
      try {
        const cached = localStorage.getItem('combo_cache_all');
        if (!cached) return;
        const localList: ComboItem[] = JSON.parse(cached);
        if (!Array.isArray(localList) || localList.length === 0) return;

        const defaultIds = DEFAULT_COMBOS.map(d => d.id);
        const fsMap = new Map(currentFsList.map(c => [c.id, c]));

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
          }
        }
      } catch (e) {
        console.warn("Lỗi auto-sync local combo sang cloud:", e);
      }
    };

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
    setOriginalPrice('2.400.000đ');
    setDiscountPercent(50);
    setPrice('1.200.000đ');
    setImage('https://images.unsplash.com/photo-1556910103-1c02745aae4d?auto=format&fit=crop&q=80&w=800');
    setDescription('');
    setStatus('active');
    setSelectedCourseIds([]);
    setBenefits(['Tài liệu hướng dẫn chuyên sâu đính kèm', 'Cấp chứng nhận hoàn thành']);
    setBenefitInput('');
    setCourseSearchFilter('');
    setSelectedCategoryFilter('all');
    setActiveTab('add');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Helper: Open Edit Mode
  const handleOpenEdit = (combo: ComboItem) => {
    setEditingComboId(combo.id);
    setTitle(combo.title);
    setPrice(combo.price);
    const orig = combo.originalPrice || (combo.price === '1.200.000đ' ? '2.400.000đ' : combo.price === '1.800.000đ' ? '3.600.000đ' : combo.price === '2.500.000đ' ? '5.000.000đ' : '2.400.000đ');
    setOriginalPrice(orig);
    const numOrig = parsePriceNumber(orig);
    const numPrice = parsePriceNumber(combo.price);
    let pct = 50;
    if (numOrig > 0 && numPrice > 0 && numOrig > numPrice) {
      pct = Math.round(((numOrig - numPrice) / numOrig) * 100);
    }
    setDiscountPercent(pct);
    setImage(combo.image || 'https://images.unsplash.com/photo-1556910103-1c02745aae4d?auto=format&fit=crop&q=80&w=800');
    setDescription(combo.description || '');
    setStatus(combo.status || 'active');
    setSelectedCourseIds(combo.courseIds || []);
    setBenefits(combo.benefits || ['Tài liệu hướng dẫn chuyên sâu đính kèm', 'Cấp chứng nhận hoàn thành']);
    setBenefitInput('');
    setCourseSearchFilter('');
    setSelectedCategoryFilter('all');
    setActiveTab('edit');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Toggle card expanded state for viewing inner courses
  const toggleComboExpand = (comboId: string) => {
    setExpandedComboIds(prev => ({
      ...prev,
      [comboId]: !prev[comboId]
    }));
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
      originalPrice: originalPrice.trim(),
      savings: discountPercent > 0 ? `Tiết kiệm ${discountPercent}%` : 'Tiết kiệm 50%',
      image: image.trim() || 'https://images.unsplash.com/photo-1556910103-1c02745aae4d?auto=format&fit=crop&q=80&w=800',
      description: description.trim(),
      status,
      courseIds: targetId === 'khoa-vip' ? [] : selectedCourseIds,
      benefits: benefits.filter(b => b.trim().length > 0),
      updatedAt: now
    };

    try {
      setCombos(prev => {
        const idx = prev.findIndex(c => c.id === targetId);
        if (idx >= 0) {
          const updated = [...prev];
          updated[idx] = comboData;
          return updated;
        }
        return [...prev, comboData];
      });

      await broadcastComboUpdate('upsert', { comboId: targetId, combo: comboData });

      const firestorePromise = setDoc(doc(db, 'combos', targetId), comboData, { merge: true });
      const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 2500));

      try {
        await Promise.race([firestorePromise, timeoutPromise]);
      } catch (fErr: any) {
        console.warn(`[Combo Save] Firestore notice for ${targetId}:`, fErr?.message || fErr);
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

    setCombos(prev => prev.map(c => c.id === comboId ? { ...c, status: newStatus } : c));
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

  // Delete Combo Prompt
  const promptDeleteCombo = (combo: ComboItem, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();

    const isSystemCombo = ['combo-basic', 'combo-pro', 'khoa-vip'].includes(combo.id);

    setConfirmModal({
      isOpen: true,
      title: isSystemCombo ? 'Xóa gói Combo hệ thống' : 'Xác nhận xóa gói Combo',
      message: isSystemCombo
        ? `Gói "${combo.title}" là gói mặc định. Bạn có chắc chắn muốn ẩn khỏi giao diện học viên không?`
        : `Bạn có chắc chắn muốn xóa vĩnh viễn gói combo "${combo.title}" khỏi hệ thống?`,
      confirmText: 'Xác nhận xóa',
      onConfirm: async () => {
        setConfirmModal(prev => ({ ...prev, isOpen: false }));
        setIsSaving(true);
        try {
          setCombos(prev => prev.filter(c => c.id !== combo.id));
          await broadcastComboUpdate('delete', { comboId: combo.id });
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
    const filtered = courses.filter(c => selectedCategoryFilter === 'all' || c.category === selectedCategoryFilter);
    const filteredIds = filtered.map(c => c.id);
    setSelectedCourseIds(prev => Array.from(new Set([...prev, ...filteredIds])));
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
  const totalLinkedCourses = combos.reduce((acc, c) => acc + (c.courseIds?.length || 0), 0);

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* 1. TOP HEADER & DASHBOARD STATS */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6 pb-6 border-b border-gray-150">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl sm:text-3xl font-black text-gray-800 uppercase tracking-tight flex items-center gap-3">
              <Layers className="w-8 h-8 text-[#007c76] shrink-0" />
              Quản Lý Gói Combo Khóa Học
            </h1>
            <span className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full text-[10px] font-extrabold uppercase tracking-wider">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              Realtime Sync
            </span>
          </div>
          <p className="text-gray-400 text-xs font-bold uppercase tracking-wider mt-1">
            Tạo gói combo ưu đãi, liên kết các khóa học tiêu chuẩn ISO/HACCP và tùy chỉnh mã thanh toán VietQR
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
            <span>Danh sách ({combos.length})</span>
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
            <span>Tạo Combo Mới</span>
          </button>
        </div>
      </div>

      {/* STATS OVERVIEW CARDS */}
      {activeTab === 'list' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white p-5 rounded-2xl border border-gray-150 shadow-2xs flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-[#007c76]/10 text-[#007c76] flex items-center justify-center shrink-0">
              <Layers className="w-6 h-6" />
            </div>
            <div>
              <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Tổng số Gói Combo</p>
              <p className="text-xl font-black text-gray-800">{combos.length} gói</p>
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-gray-150 shadow-2xs flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
              <Eye className="w-6 h-6" />
            </div>
            <div>
              <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Đang Hiển Thị</p>
              <p className="text-xl font-black text-emerald-600">{activeCount} gói</p>
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-gray-150 shadow-2xs flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-gray-100 text-gray-500 flex items-center justify-center shrink-0">
              <EyeOff className="w-6 h-6" />
            </div>
            <div>
              <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Đã Ẩn Nội Bộ</p>
              <p className="text-xl font-black text-gray-700">{inactiveCount} gói</p>
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-gray-150 shadow-2xs flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-teal-50 text-teal-700 flex items-center justify-center shrink-0">
              <BookOpen className="w-6 h-6" />
            </div>
            <div>
              <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Tổng Khóa Liên Kết</p>
              <p className="text-xl font-black text-[#007c76]">{totalLinkedCourses} lượt khóa</p>
            </div>
          </div>
        </div>
      )}

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
          {/* Toolbar: Search, Filters, View Mode Toggle & Bulk Status */}
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-white p-4 sm:p-5 rounded-[28px] border border-gray-150 shadow-sm">
            {/* Search Input */}
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 text-gray-400 absolute left-4 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Tìm gói combo theo tên, ID hoặc từ khóa..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-11 pr-10 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs sm:text-sm font-semibold text-gray-700 placeholder-gray-400 focus:outline-none focus:bg-white focus:border-[#007c76] transition-all"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-1 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Filter Buttons & View Switcher */}
            <div className="flex flex-wrap items-center gap-3">
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
                  Hiện ({activeCount})
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
                  Ẩn ({inactiveCount})
                </button>
              </div>

              {/* View Mode Toggle: Grid Cards vs Compact Table */}
              <div className="inline-flex p-1 bg-gray-100 rounded-xl border border-gray-200 text-xs">
                <button
                  type="button"
                  onClick={() => setViewMode('grid')}
                  title="Chế độ xem Thẻ sinh động"
                  className={`p-2 rounded-lg transition-all cursor-pointer ${
                    viewMode === 'grid'
                      ? 'bg-white text-[#007c76] shadow-xs'
                      : 'text-gray-400 hover:text-gray-700'
                  }`}
                >
                  <LayoutGrid className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode('table')}
                  title="Chế độ xem Bảng tóm tắt"
                  className={`p-2 rounded-lg transition-all cursor-pointer ${
                    viewMode === 'table'
                      ? 'bg-white text-[#007c76] shadow-xs'
                      : 'text-gray-400 hover:text-gray-700'
                  }`}
                >
                  <TableIcon className="w-4 h-4" />
                </button>
              </div>

              {/* Bulk Action Buttons */}
              <div className="flex items-center gap-1.5 ml-auto sm:ml-0">
                <button
                  type="button"
                  onClick={() => handleBulkStatusChange('active')}
                  title="Hiện tất cả gói combo"
                  className="px-3 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-xl text-[11px] font-bold uppercase tracking-wider flex items-center gap-1.5 transition-all cursor-pointer"
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Hiện tất cả</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleBulkStatusChange('inactive')}
                  title="Ẩn tất cả gói combo"
                  className="px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-600 border border-gray-200 rounded-xl text-[11px] font-bold uppercase tracking-wider flex items-center gap-1.5 transition-all cursor-pointer"
                >
                  <EyeOff className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Ẩn tất cả</span>
                </button>
              </div>
            </div>
          </div>

          {/* COMBOS DISPLAY AREA */}
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
                  ? `Không có kết quả khớp với từ khóa "${searchQuery}".`
                  : 'Chưa có gói combo nào trong danh mục đã chọn.'}
              </p>
              <button
                type="button"
                onClick={handleOpenAdd}
                className="px-5 py-2.5 bg-[#007c76] hover:bg-[#005f5b] text-white text-xs font-bold uppercase tracking-wider rounded-xl transition-all inline-flex items-center gap-2 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                Tạo gói Combo đầu tiên
              </button>
            </div>
          ) : viewMode === 'grid' ? (
            /* --- GRID CARDS VIEW WITH VISUAL INNER COURSES --- */
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {filteredCombos.map((combo) => {
                const isActive = combo.status !== 'inactive';
                const isVip = combo.id === 'khoa-vip' || combo.id.includes('vip');
                const isExpanded = !!expandedComboIds[combo.id];

                // Get inner course objects
                const innerCourses = isVip
                  ? courses
                  : (combo.courseIds || []).map(id => courseMap.get(id)).filter((c): c is Course => c !== undefined);

                return (
                  <div
                    key={combo.id}
                    className={`bg-white rounded-[32px] border transition-all duration-300 shadow-sm hover:shadow-md overflow-hidden flex flex-col justify-between ${
                      isActive ? 'border-gray-200 hover:border-[#007c76]/40' : 'border-gray-200 bg-gray-50/60 opacity-80'
                    }`}
                  >
                    <div>
                      {/* Combo Header Image & Badge */}
                      <div className="relative aspect-[16/7] overflow-hidden bg-gray-100 group">
                        <img
                          src={combo.image}
                          alt={combo.title}
                          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src =
                              'https://images.unsplash.com/photo-1556910103-1c02745aae4d?auto=format&fit=crop&q=80&w=800';
                          }}
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />

                        {/* Top Badges */}
                        <div className="absolute top-4 left-4 right-4 flex items-center justify-between">
                          <span
                            className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider backdrop-blur-md border ${
                              isActive
                                ? 'bg-emerald-500/90 text-white border-emerald-400'
                                : 'bg-gray-800/80 text-gray-300 border-gray-600'
                            }`}
                          >
                            {isActive ? '🟢 Đang hiển thị' : '⚪ Đã ẩn'}
                          </span>

                          <div className="flex items-center gap-2">
                            {isVip && (
                              <span className="px-3 py-1 bg-amber-500 text-white rounded-full text-[10px] font-black uppercase tracking-wider flex items-center gap-1 shadow-sm">
                                <Crown className="w-3 h-3" /> VIP All-Access
                              </span>
                            )}
                            <button
                              type="button"
                              onClick={() => setQrModalCombo(combo)}
                              title="Xem mã VietQR"
                              className="p-1.5 bg-white/90 hover:bg-white text-[#007c76] rounded-xl transition-all shadow-sm cursor-pointer"
                            >
                              <QrCode className="w-4 h-4" />
                            </button>
                          </div>
                        </div>

                        {/* Title & Price overlay */}
                        <div className="absolute bottom-4 left-4 right-4 text-white">
                          <p className="text-[10px] font-extrabold uppercase tracking-widest text-teal-300">
                            MÃ COMBO: {combo.id}
                          </p>
                          <h3 className="text-lg font-black leading-snug drop-shadow-sm">
                            {combo.title}
                          </h3>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-xl font-black text-amber-300">
                              {combo.price}
                            </span>
                            <span className="text-xs text-gray-300">
                              ({isVip ? 'Tất cả khóa học' : `${innerCourses.length} khóa bao gồm`})
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Combo Details Content */}
                      <div className="p-6 space-y-5">
                        {/* Description */}
                        {combo.description && (
                          <p className="text-xs font-medium text-gray-600 leading-relaxed">
                            {combo.description}
                          </p>
                        )}

                        {/* VISUAL INNER COURSES LIST */}
                        <div className="bg-gray-50/80 p-4 rounded-2xl border border-gray-150 space-y-3">
                          <div
                            onClick={() => toggleComboExpand(combo.id)}
                            className="flex items-center justify-between cursor-pointer group/toggle"
                          >
                            <span className="text-xs font-black text-gray-800 uppercase tracking-tight flex items-center gap-2">
                              <BookOpen className="w-4 h-4 text-[#007c76]" />
                              Khóa học nằm trong Combo ({isVip ? 'Toàn bộ khóa' : innerCourses.length})
                            </span>
                            <div className="flex items-center gap-1 text-[11px] font-bold text-[#007c76] group-hover/toggle:underline">
                              <span>{isExpanded ? 'Thu gọn' : 'Xem danh sách'}</span>
                              {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                            </div>
                          </div>

                          {isExpanded && (
                            <div className="space-y-2 pt-2 border-t border-gray-200/60 animate-in fade-in duration-200">
                              {isVip ? (
                                <div className="p-3 bg-amber-50/80 border border-amber-200 rounded-xl text-xs text-amber-900 font-semibold flex items-center gap-2">
                                  <Crown className="w-4 h-4 text-amber-600 shrink-0" />
                                  <span>Gói VIP tự động kích hoạt tất cả các khóa học hiện có và các khóa học thêm mới trong tương lai.</span>
                                </div>
                              ) : innerCourses.length === 0 ? (
                                <p className="text-xs text-gray-400 italic py-1">Chưa liên kết khóa học nào.</p>
                              ) : (
                                <div className="space-y-2 max-h-[220px] overflow-y-auto custom-scrollbar pr-1">
                                  {innerCourses.map((c, idx) => (
                                    <div
                                      key={c.id || idx}
                                      className="flex items-center justify-between p-2.5 bg-white rounded-xl border border-gray-200/80 shadow-2xs hover:border-[#007c76]/30 transition-all"
                                    >
                                      <div className="flex items-center gap-2.5 min-w-0 pr-2">
                                        <img
                                          src={c.image}
                                          alt={c.title}
                                          className="w-9 h-7 object-cover rounded-lg border border-gray-200 shrink-0"
                                          onError={(e) => {
                                            (e.target as HTMLImageElement).src =
                                              'https://images.unsplash.com/photo-1513104890138-7c749659a591';
                                          }}
                                        />
                                        <div className="min-w-0">
                                          <p className="text-xs font-bold text-gray-800 line-clamp-1">
                                            {c.title}
                                          </p>
                                          <span className="text-[10px] font-bold text-gray-400">
                                            {c.category} • {c.price}
                                          </span>
                                        </div>
                                      </div>
                                      <span className="text-[10px] font-extrabold px-2 py-0.5 bg-teal-50 text-[#007c76] rounded-md shrink-0">
                                        Đã gồm
                                      </span>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          )}
                        </div>

                        {/* Benefits Chips */}
                        {combo.benefits && combo.benefits.length > 0 && (
                          <div className="space-y-1.5">
                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Quyền lợi đi kèm:</p>
                            <div className="flex flex-wrap gap-1.5">
                              {combo.benefits.map((b, bIdx) => (
                                <span
                                  key={bIdx}
                                  className="px-2.5 py-1 bg-[#007c76]/10 text-[#007c76] rounded-lg text-[11px] font-bold inline-flex items-center gap-1 border border-[#007c76]/20"
                                >
                                  <Check className="w-3 h-3 text-[#007c76]" /> {b}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Combo Footer Actions */}
                    <div className="p-4 sm:p-6 bg-gray-50/50 border-t border-gray-150 flex items-center justify-between gap-3">
                      <button
                        type="button"
                        onClick={(e) => handleToggleStatus(combo, e)}
                        className={`px-3.5 py-2 rounded-xl text-xs font-extrabold uppercase tracking-wider inline-flex items-center gap-1.5 border transition-all cursor-pointer ${
                          isActive
                            ? 'bg-white text-emerald-700 border-emerald-300 hover:bg-emerald-50'
                            : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-100'
                        }`}
                      >
                        {isActive ? <Eye className="w-3.5 h-3.5 text-emerald-600" /> : <EyeOff className="w-3.5 h-3.5 text-gray-400" />}
                        <span>{isActive ? 'Ẩn gói' : 'Hiện gói'}</span>
                      </button>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => handleOpenEdit(combo)}
                          className="px-4 py-2 bg-[#007c76] hover:bg-[#005f5b] text-white rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
                        >
                          <Edit className="w-3.5 h-3.5" />
                          <span>Sửa Combo</span>
                        </button>

                        <button
                          type="button"
                          onClick={(e) => promptDeleteCombo(combo, e)}
                          className="p-2 bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 rounded-xl transition-all cursor-pointer"
                          title="Xóa Combo"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            /* --- COMPACT TABLE VIEW --- */
            <div className="overflow-x-auto rounded-[28px] border border-gray-150 bg-white shadow-sm custom-scrollbar pb-1">
              <table className="w-full text-left border-collapse min-w-[980px] whitespace-nowrap">
                <thead>
                  <tr className="bg-gray-50/80 border-b border-gray-150 text-gray-500 text-[10px] sm:text-xs font-bold uppercase tracking-widest">
                    <th className="py-4 px-6">Ảnh bìa</th>
                    <th className="py-4 px-6 min-w-[280px]">Tiêu đề Gói Combo</th>
                    <th className="py-4 px-6">Học phí</th>
                    <th className="py-4 px-6">Khóa học liên kết</th>
                    <th className="py-4 px-6 text-center">Trạng thái</th>
                    <th className="py-4 px-6 text-right">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredCombos.map((combo) => {
                    const isActive = combo.status !== 'inactive';
                    const isVip = combo.id === 'khoa-vip' || combo.id.includes('vip');

                    return (
                      <tr
                        key={combo.id}
                        className="hover:bg-[#007c76]/[0.035] transition-colors text-xs sm:text-sm text-gray-700"
                      >
                        <td className="py-4 px-6">
                          <img
                            src={combo.image}
                            alt={combo.title}
                            className="w-16 h-11 rounded-xl object-cover border border-gray-200"
                            onError={(e) => {
                              (e.target as HTMLImageElement).src =
                                'https://images.unsplash.com/photo-1556910103-1c02745aae4d?auto=format&fit=crop&q=80&w=800';
                            }}
                          />
                        </td>
                        <td className="py-4 px-6 min-w-[280px]">
                          <p className="font-black text-gray-900">{combo.title}</p>
                          <span className="text-[10px] font-bold text-gray-400 block uppercase">ID: {combo.id}</span>
                        </td>
                        <td className="py-4 px-6 font-black text-[#007c76] text-sm sm:text-base">
                          {combo.price}
                        </td>
                        <td className="py-4 px-6">
                          <span className="px-3 py-1 bg-teal-50 text-[#007c76] border border-teal-200 rounded-xl text-xs font-extrabold inline-flex items-center gap-1.5">
                            <BookOpen className="w-3.5 h-3.5" />
                            {isVip ? 'Toàn bộ khóa học' : `${combo.courseIds?.length || 0} khóa`}
                          </span>
                        </td>
                        <td className="py-4 px-6 text-center">
                          <button
                            type="button"
                            onClick={(e) => handleToggleStatus(combo, e)}
                            className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border cursor-pointer ${
                              isActive ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-gray-100 text-gray-500 border-gray-200'
                            }`}
                          >
                            {isActive ? 'Đang hiện' : 'Đã ẩn'}
                          </button>
                        </td>
                        <td className="py-4 px-6 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              type="button"
                              onClick={() => handleOpenEdit(combo)}
                              className="px-3 py-1.5 bg-[#007c76] text-white rounded-xl text-xs font-bold cursor-pointer"
                            >
                              Sửa
                            </button>
                            <button
                              type="button"
                              onClick={(e) => promptDeleteCombo(combo, e)}
                              className="p-1.5 bg-red-50 text-red-600 rounded-xl cursor-pointer"
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
                    {activeTab === 'add' ? 'Tạo Gói Combo Khóa Học Mới' : `Chỉnh Sửa Gói: ${title || 'Chưa đặt tên'}`}
                  </h2>
                  <p className="text-gray-500 text-xs font-medium">
                    Thiết lập tên gói, định giá VietQR, liên kết các khóa học tiêu chuẩn và cấu hình quyền lợi đi kèm
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setActiveTab('list')}
                  className="px-4 py-2.5 bg-white hover:bg-gray-50 text-gray-700 border border-gray-200 rounded-xl text-xs font-bold uppercase tracking-wider transition-all cursor-pointer"
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
              {/* LEFT COLUMN: Main Info, Presets & VietQR Preview (7 cols) */}
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

                    {/* INTERACTIVE SALE OFF CALCULATOR WIDGET */}
                    <div className="bg-gradient-to-br from-[#007c76]/[0.05] via-teal-50/50 to-emerald-50/40 p-5 rounded-2xl border border-teal-200/80 space-y-4">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span className="p-1.5 bg-[#007c76] text-white rounded-lg text-xs font-black">⚡</span>
                          <h4 className="text-xs font-black uppercase tracking-wider text-gray-800">
                            Cấu Hình Sale Off &amp; Tự Động Tính Giá Sau Giảm
                          </h4>
                        </div>
                        <span className="text-[11px] font-black text-[#007c76] bg-teal-100/90 px-3 py-1 rounded-full border border-teal-300 shadow-2xs">
                          🏷️ {discountPercent > 0 ? `Tiết kiệm ${discountPercent}%` : 'Đang bán giá gốc'} ({formatVndPrice(Math.max(0, parsePriceNumber(originalPrice) - parsePriceNumber(price)))})
                        </span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div>
                          <label className="block text-[11px] font-bold uppercase tracking-wider text-gray-500 mb-1">
                            Giá Gốc (Chưa Giảm)
                          </label>
                          <input
                            type="text"
                            value={originalPrice}
                            onChange={(e) => handleOriginalPriceChange(e.target.value)}
                            placeholder="VD: 2.400.000đ"
                            className="w-full px-3.5 py-2.5 bg-white border border-gray-200 rounded-xl font-bold text-gray-700 text-xs focus:outline-none focus:border-[#007c76]"
                          />
                        </div>

                        <div>
                          <label className="block text-[11px] font-bold uppercase tracking-wider text-gray-500 mb-1">
                            % Sale Off (Giảm Giá)
                          </label>
                          <div className="relative">
                            <input
                              type="number"
                              min={0}
                              max={99}
                              value={discountPercent}
                              onChange={(e) => handleDiscountPercentChange(Number(e.target.value))}
                              className="w-full px-3.5 py-2.5 bg-white border border-gray-200 rounded-xl font-extrabold text-red-600 text-xs focus:outline-none focus:border-[#007c76] pr-8"
                            />
                            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-black text-red-500">%</span>
                          </div>
                        </div>

                        <div>
                          <label className="block text-[11px] font-bold uppercase tracking-wider text-gray-500 mb-1">
                            Giá Khuyến Mãi (Bán Ra) <span className="text-red-500">*</span>
                          </label>
                          <input
                            type="text"
                            required
                            value={price}
                            onChange={(e) => handleDiscountedPriceChange(e.target.value)}
                            placeholder="VD: 1.200.000đ"
                            className="w-full px-3.5 py-2.5 bg-white border-2 border-emerald-500/80 rounded-xl font-black text-[#007c76] text-xs focus:outline-none focus:border-[#007c76]"
                          />
                        </div>
                      </div>

                      {/* Quick % Sale Off Buttons */}
                      <div className="flex flex-wrap items-center gap-1.5 pt-1">
                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mr-1">Chọn % nhanh:</span>
                        {[10, 20, 30, 40, 50, 60, 70, 80].map((pct) => (
                          <button
                            key={pct}
                            type="button"
                            onClick={() => handleDiscountPercentChange(pct)}
                            className={`px-2.5 py-1 rounded-lg text-[11px] font-black transition-all cursor-pointer ${
                              discountPercent === pct
                                ? 'bg-red-600 text-white shadow-xs scale-105'
                                : 'bg-white text-gray-700 hover:bg-teal-50 border border-gray-200'
                            }`}
                          >
                            -{pct}%
                          </button>
                        ))}
                      </div>

                      {/* LIVE ANIMATED PRICE COUNTER PREVIEW STRIP */}
                      <div className="pt-3 border-t border-teal-200/60 flex flex-wrap items-center justify-between gap-3">
                        <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500 flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                          <span>XEM TRƯỚC ĐẾM SỐ TỰ ĐỘNG:</span>
                        </span>
                        <div className="flex flex-wrap items-center gap-2">
                          <AnimatedPriceCounter
                            label="Giá gốc"
                            priceStr={originalPrice || '0đ'}
                            variant="original"
                            size="sm"
                          />
                          <span className="text-gray-300 font-black">➔</span>
                          <AnimatedPriceCounter
                            label="Giá khuyến mãi"
                            priceStr={price || '0đ'}
                            variant="sale"
                            size="md"
                            showBadge={discountPercent > 0}
                            badgeText={`-${discountPercent}%`}
                          />
                          <AnimatedPriceCounter
                            label="Tiết kiệm"
                            priceStr={formatVndPrice(Math.max(0, parsePriceNumber(originalPrice) - parsePriceNumber(price)))}
                            variant="savings"
                            size="sm"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Status Select */}
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
                                  'https://images.unsplash.com/photo-1556910103-1c02745aae4d?auto=format&fit=crop&q=80&w=800';
                              }}
                            />
                          </div>
                        )}
                      </div>

                      {/* Quick Image Presets */}
                      <div className="mt-2.5 flex flex-wrap items-center gap-2">
                        <span className="text-[10px] font-bold text-gray-400 uppercase">Gợi ý mẫu ảnh:</span>
                        {UNSPLASH_IMAGE_PRESETS.map((preset, pIdx) => (
                          <button
                            key={pIdx}
                            type="button"
                            onClick={() => setImage(preset.url)}
                            className="px-2.5 py-1 bg-gray-100 hover:bg-teal-50 hover:text-[#007c76] text-gray-600 rounded-lg text-[11px] font-semibold border border-gray-200 transition-all cursor-pointer"
                          >
                            + {preset.title}
                          </button>
                        ))}
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
                        placeholder="Mô tả tóm tắt nội dung, đối tượng phù hợp và giá trị gói combo..."
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

              {/* RIGHT COLUMN: Interactive Linking Courses Selector (5 cols) */}
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
                      {/* Search & Category Filter for Courses */}
                      <div className="space-y-2">
                        <div className="relative">
                          <Search className="w-3.5 h-3.5 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                          <input
                            type="text"
                            placeholder="Tìm khóa học theo tên..."
                            value={courseSearchFilter}
                            onChange={(e) => setCourseSearchFilter(e.target.value)}
                            className="w-full pl-9 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-medium text-gray-700 focus:outline-none focus:bg-white focus:border-[#007c76]"
                          />
                        </div>

                        {/* Category Filter Pills */}
                        <div className="flex flex-wrap gap-1.5 pt-1">
                          <button
                            type="button"
                            onClick={() => setSelectedCategoryFilter('all')}
                            className={`px-2.5 py-1 rounded-lg text-[11px] font-bold cursor-pointer transition-all ${
                              selectedCategoryFilter === 'all'
                                ? 'bg-[#007c76] text-white shadow-2xs'
                                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                            }`}
                          >
                            Tất cả
                          </button>
                          {categories.map((cat, catIdx) => (
                            <button
                              key={catIdx}
                              type="button"
                              onClick={() => setSelectedCategoryFilter(cat)}
                              className={`px-2.5 py-1 rounded-lg text-[11px] font-bold cursor-pointer transition-all ${
                                selectedCategoryFilter === cat
                                  ? 'bg-[#007c76] text-white shadow-2xs'
                                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                              }`}
                            >
                              {cat}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Selected Courses Counter Banner */}
                      <div className="p-3 bg-teal-50/80 border border-teal-200/80 rounded-2xl flex items-center justify-between text-xs text-teal-900 font-bold">
                        <span className="flex items-center gap-1.5">
                          <Tag className="w-4 h-4 text-[#007c76]" />
                          Khóa học trong gói này:
                        </span>
                        <span className="px-2.5 py-0.5 bg-[#007c76] text-white rounded-full text-[11px] font-black">
                          {selectedCourseIds.length} khóa
                        </span>
                      </div>

                      {/* Course Selection List */}
                      <div className="max-h-[480px] overflow-y-auto custom-scrollbar divide-y divide-gray-100 border border-gray-150 rounded-2xl p-1 bg-gray-50/50">
                        {courses
                          .filter(c => {
                            const matchesName = c.title.toLowerCase().includes(courseSearchFilter.toLowerCase());
                            const matchesCat = selectedCategoryFilter === 'all' || c.category === selectedCategoryFilter;
                            return matchesName && matchesCat;
                          })
                          .map((course) => {
                            const isChecked = selectedCourseIds.includes(course.id);
                            return (
                              <button
                                key={course.id}
                                type="button"
                                onClick={() => handleToggleCourse(course.id)}
                                className={`w-full p-3 flex items-center justify-between text-left rounded-xl transition-all cursor-pointer group ${
                                  isChecked
                                    ? 'bg-[#007c76]/[0.08] text-gray-900 font-bold border border-[#007c76]/20'
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
                                      {course.price} • {course.category}
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
          <div className="fixed inset-0 z-[999999] w-screen h-screen min-h-screen flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-md backdrop-grayscale-[30%]">
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
          <div className="fixed inset-0 z-[999999] w-screen h-screen min-h-screen flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-md backdrop-grayscale-[30%]">
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
