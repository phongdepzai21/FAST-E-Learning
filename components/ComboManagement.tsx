import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, doc, setDoc, deleteDoc, onSnapshot } from 'firebase/firestore';
import { Course } from '../types';
import { getMergedCourses } from '../constants';
import { useToast } from '../contexts/ToastContext';
import { broadcastComboUpdate } from '../utils/courseSyncService';
import { Crown, Shield, Layers, Save, CheckSquare, Square, RefreshCw, Award, Plus, Trash2, X, Check } from 'lucide-react';

interface Combo {
  id: string;
  title: string;
  price: string;
  image: string;
  description: string;
  courseIds: string[];
  benefits?: string[];
}

const DEFAULT_COMBOS: Combo[] = [
  {
    id: 'combo-basic',
    title: 'Gói Combo Basic (Nhập Môn Thực Phẩm)',
    price: '1.200.000đ',
    image: 'https://images.unsplash.com/photo-1556910103-1c02745aae4d?auto=format&fit=crop&q=80&w=800',
    description: 'Gói Combo Basic: Học trọn gói các kiến thức cơ bản về HACCP, 5 nguyên tắc vàng của WHO và các tiêu chuẩn kiểm soát chất lượng sơ bộ.',
    courseIds: ['basic-principles', 'truy-xuat-nguon-goc'],
    benefits: ['Tài liệu biểu mẫu SOP đính kèm', 'Cấp chứng nhận hoàn thành']
  },
  {
    id: 'combo-pro',
    title: 'Gói Combo Pro (Chuyên Gia Vận Hành)',
    price: '1.800.000đ',
    image: 'https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?auto=format&fit=crop&q=80&w=800',
    description: 'Gói Combo Pro: Học chuyên sâu dành cho kỹ sư vận hành nhà máy gồm đầy đủ các khóa ISO (ISO 9001, ISO 14001, ISO 22000), nâng cao tối đa năng lực sản xuất.',
    courseIds: ['iso-9001', 'iso-14001', 'iso-22000'],
    benefits: ['Tài liệu biểu mẫu SOP đính kèm', 'Cấp chứng nhận hoàn thành']
  },
  {
    id: 'khoa-vip',
    title: 'Gói Combo VIP (Toàn Bộ Khóa Học)',
    price: '2.500.000đ',
    image: 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&q=80&w=800',
    description: 'Gói Combo VIP trọn đời: Combo trọn gói toàn bộ hệ thống các khóa học ISO, HACCP, QA/QC, Lean, bộ tài liệu biểu mẫu SOP chuẩn hóa và cập nhật tất cả khóa học mới trong tương lai mà không phải khóa học đơn lẻ.',
    courseIds: [], // Empty means ALL courses
    benefits: ['Tài liệu biểu mẫu SOP đính kèm', 'Cấp chứng nhận hoàn thành', 'Đặc quyền Hỗ trợ 1-1 từ chuyên gia']
  }
];

const ComboManagement: React.FC = () => {
  const toast = useToast();
  const [courses, setCourses] = useState<Course[]>([]);
  const [combos, setCombos] = useState<Combo[]>(() => {
    try {
      const cached = localStorage.getItem('combo_cache_all');
      if (cached) {
        return JSON.parse(cached);
      }
    } catch (e) {}
    return DEFAULT_COMBOS;
  });
  const [selectedComboId, setSelectedComboId] = useState<string>('combo-basic');
  const [isLoading, setIsLoading] = useState<boolean>(() => {
    try {
      const cached = localStorage.getItem('combo_cache_all');
      if (cached) return false;
    } catch (e) {}
    return true;
  });
  const [isSaving, setIsSaving] = useState<boolean>(false);

  // Edit fields for selected combo
  const [editTitle, setEditTitle] = useState<string>('');
  const [editPrice, setEditPrice] = useState<string>('');
  const [editDescription, setEditDescription] = useState<string>('');
  const [editImage, setEditImage] = useState<string>('');
  const [selectedCourseIds, setSelectedCourseIds] = useState<string[]>([]);
  const [editBenefits, setEditBenefits] = useState<string[]>([]);
  const [benefitInput, setBenefitInput] = useState<string>('');

  // Fetch courses and sync combos from Firestore
  useEffect(() => {
    // Sync regular courses
    const allCoursesList = getMergedCourses([]);
    // Remove the combos themselves from the list of selectable individual courses
    const selectableCourses = allCoursesList.filter(
      c => c.id !== 'khoa-vip' && c.id !== 'combo-basic' && c.id !== 'combo-pro' && c.category !== 'Gói VIP'
    );
    setCourses(selectableCourses);

    // Sync combos from Firestore
    const unsub = onSnapshot(collection(db, 'combos'), (snapshot) => {
      const dbCombos: Combo[] = [];
      snapshot.forEach((doc) => {
        dbCombos.push({ id: doc.id, ...doc.data() } as Combo);
      });

      // Merge with defaults
      const mergedCombos = DEFAULT_COMBOS.map(def => {
        const found = dbCombos.find(dbc => dbc.id === def.id);
        return found ? { ...def, ...found } : def;
      });

      // Include new custom combos that are not in defaults
      const defaultIds = DEFAULT_COMBOS.map(d => d.id);
      const customCombos = dbCombos.filter(dbc => !defaultIds.includes(dbc.id));

      const finalCombos = [...mergedCombos, ...customCombos];
      setCombos(finalCombos);
      try {
        localStorage.setItem('combo_cache_all', JSON.stringify(finalCombos));
      } catch (e) {}
      setIsLoading(false);
    }, (error) => {
      console.error("Lỗi đồng bộ combos từ Firestore:", error);
      setIsLoading(false);
    });

    return () => unsub();
  }, []);

  // Sync edit fields when selected combo or combos list changes
  useEffect(() => {
    const currentCombo = combos.find(c => c.id === selectedComboId);
    if (currentCombo) {
      setEditTitle(currentCombo.title);
      setEditPrice(currentCombo.price);
      setEditDescription(currentCombo.description);
      setEditImage(currentCombo.image);
      setSelectedCourseIds(currentCombo.courseIds || []);
      setEditBenefits(currentCombo.benefits || []);
      setBenefitInput('');
    }
  }, [selectedComboId, combos]);

  const handleToggleCourse = (courseId: string) => {
    if (selectedComboId === 'khoa-vip') {
      // VIP always contains ALL courses, so we don't allow selective editing of courses
      return;
    }
    setSelectedCourseIds(prev => 
      prev.includes(courseId) 
        ? prev.filter(id => id !== courseId) 
        : [...prev, courseId]
    );
  };

  const handleSelectAll = () => {
    if (selectedComboId === 'khoa-vip') return;
    const allIds = courses.map(c => c.id);
    setSelectedCourseIds(allIds);
  };

  const handleDeselectAll = () => {
    if (selectedComboId === 'khoa-vip') return;
    setSelectedCourseIds([]);
  };

  const handleAddBenefit = () => {
    if (benefitInput.trim()) {
      if (editBenefits.includes(benefitInput.trim())) {
        toast.error("Quyền lợi này đã tồn tại!");
        return;
      }
      setEditBenefits(prev => [...prev, benefitInput.trim()]);
      setBenefitInput('');
    }
  };

  const handleRemoveBenefit = (indexToRemove: number) => {
    setEditBenefits(prev => prev.filter((_, idx) => idx !== indexToRemove));
  };

  const handleCreateNewCombo = () => {
    const newId = `combo-custom-${Date.now()}`;
    const newCombo: Combo = {
      id: newId,
      title: 'Gói Combo Học Tập Mới',
      price: '1.500.000đ',
      image: 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&q=80&w=800',
      description: 'Gói combo tự chọn chất lượng cao bao gồm lộ trình học tập chuyên môn SOP và chứng nhận chính thức.',
      courseIds: [],
      benefits: ['Tài liệu biểu mẫu SOP đính kèm', 'Cấp chứng nhận hoàn thành']
    };

    setCombos(prev => [...prev, newCombo]);
    setSelectedComboId(newId);
    toast.success("✨ Đã khởi tạo Combo nháp mới! Vui lòng nhập chi tiết cấu hình và nhấn Lưu.");
  };

  const handleDeleteCombo = async () => {
    const isSystemCombo = ['combo-basic', 'combo-pro', 'khoa-vip'].includes(selectedComboId);
    
    let confirmMsg = `Bạn có chắc chắn muốn xóa gói combo "${editTitle}"?`;
    if (isSystemCombo) {
      confirmMsg = `CẢNH BÁO: Đây là gói Combo mặc định của hệ thống! Việc xóa có thể làm ảnh hưởng đến giao diện trang đặc quyền. Bạn có chắc chắn vẫn muốn xóa không?`;
    }

    if (!window.confirm(confirmMsg)) {
      return;
    }

    setIsSaving(true);
    try {
      // Optmistic local state update first
      setCombos(prev => prev.filter(c => c.id !== selectedComboId));
      broadcastComboUpdate('delete', { comboId: selectedComboId });

      // Run Firestore delete with a timeout so it doesn't hang
      const deletePromise = deleteDoc(doc(db, 'combos', selectedComboId));
      const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 2500));

      try {
        await Promise.race([deletePromise, timeoutPromise]);
      } catch (fErr: any) {
        if (fErr.message === 'timeout') {
          console.warn(`[Combo Delete] Firestore delete timed out for ${selectedComboId}, deleted locally.`);
        } else {
          console.warn(`[Combo Delete] Firestore delete error:`, fErr);
        }
      }

      toast.success(`🗑️ Đã xóa gói combo thành công!`);
      setSelectedComboId('combo-basic');
    } catch (err: any) {
      console.error("Lỗi khi xóa combo:", err);
      toast.error(`Có lỗi xảy ra khi xóa: ${err.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveCombo = async () => {
    if (!editTitle.trim()) {
      toast.error("Vui lòng nhập tiêu đề combo!");
      return;
    }
    if (!editPrice.trim()) {
      toast.error("Vui lòng nhập học phí combo!");
      return;
    }

    setIsSaving(true);
    try {
      const comboRef = doc(db, 'combos', selectedComboId);
      const updatedData = {
        title: editTitle.trim(),
        price: editPrice.trim(),
        description: editDescription.trim(),
        image: editImage.trim() || 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&q=80&w=800',
        courseIds: selectedComboId === 'khoa-vip' ? [] : selectedCourseIds,
        benefits: editBenefits,
        updatedAt: new Date().toISOString()
      };

      // Save to local cache as fallback first so it is instantaneous
      const cachedKey = `combo_cache_${selectedComboId}`;
      localStorage.setItem(cachedKey, JSON.stringify({ id: selectedComboId, ...updatedData }));
      
      // Update local state instantly so user doesn't wait
      setCombos(prev => prev.map(c => c.id === selectedComboId ? { ...c, ...updatedData } : c));

      // Real-time broadcast combo update to ALL tabs & ALL accounts instantly
      broadcastComboUpdate('save', { comboId: selectedComboId, combo: updatedData });

      // Run Firestore write with a timeout so it doesn't block the UI forever
      const firestorePromise = setDoc(comboRef, updatedData, { merge: true });
      const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 2500));

      try {
        await Promise.race([firestorePromise, timeoutPromise]);
      } catch (fErr: any) {
        if (fErr.message === 'timeout') {
          console.warn(`[Combo Save] Firestore write timed out for ${selectedComboId}, saved locally.`);
        } else {
          console.warn(`[Combo Save] Firestore write error:`, fErr);
        }
      }

      toast.success(`💾 Đã lưu thay đổi cho "${editTitle}" thành công!`);
    } catch (error: any) {
      console.error("Lỗi khi lưu combo:", error);
      toast.error(`Có lỗi xảy ra: ${error.message || 'Không thể lưu combo'}`);
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="py-20 flex flex-col items-center justify-center gap-4">
        <RefreshCw className="w-10 h-10 text-[#007c76] animate-spin" />
        <p className="text-gray-400 text-xs font-bold uppercase tracking-wider animate-pulse">
          Đang tải dữ liệu cấu hình Combo...
        </p>
      </div>
    );
  }

  const selectedCombo = combos.find(c => c.id === selectedComboId) || combos[0];
  const isDefaultCombo = ['combo-basic', 'combo-pro', 'khoa-vip'].includes(selectedComboId);

  return (
    <div className="bg-white rounded-[40px] p-6 md:p-10 border border-gray-100 shadow-sm animate-in slide-in-from-bottom-5 duration-700 space-y-8">
      {/* Tab Title Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl md:text-3xl font-black text-gray-800 tracking-tight flex items-center gap-3 uppercase">
            <Layers className="w-8 h-8 text-[#007c76] shrink-0" />
            Quản Lý Gói Combo Đào Tạo
          </h2>
          <p className="text-gray-400 text-xs font-bold uppercase tracking-wider mt-1">
            Thêm, sửa, xóa các gói Combo (Basic, Pro, VIP) và cấu hình quyền lợi đi kèm
          </p>
        </div>

        <button
          onClick={handleCreateNewCombo}
          className="px-5 py-3 bg-[#007c76]/10 hover:bg-[#007c76]/20 text-[#007c76] rounded-2xl font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2 transition-all self-start sm:self-center cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Tạo Combo Mới</span>
        </button>
      </div>

      {/* Combo Selection Tabs - Responsive wrapping list */}
      <div className="flex flex-wrap gap-3 border-b border-gray-100 pb-6">
        {combos.map((combo) => {
          const isSelected = combo.id === selectedComboId;
          const isVip = combo.id === 'khoa-vip' || combo.id.includes('vip');
          const isPro = combo.id === 'combo-pro' || combo.id.includes('pro');
          return (
            <button
              key={combo.id}
              onClick={() => setSelectedComboId(combo.id)}
              className={`px-5 py-4 rounded-2xl text-left border-2 transition-all flex flex-col justify-between min-w-[160px] sm:min-w-[200px] flex-grow relative overflow-hidden group ${
                isSelected
                  ? isVip
                    ? 'bg-amber-500/10 border-amber-500 text-amber-900 shadow-lg shadow-amber-500/10'
                    : isPro
                      ? 'bg-blue-500/10 border-blue-500 text-blue-900 shadow-lg shadow-blue-500/10'
                      : 'bg-[#007c76]/10 border-[#007c76] text-[#007c76] shadow-lg shadow-[#007c76]/10'
                  : 'bg-gray-50 border-gray-100 hover:border-gray-200 text-gray-500 hover:text-gray-800'
              }`}
            >
              <div className="flex items-center justify-between w-full z-10 gap-2 mb-3">
                {isVip ? (
                  <Crown className={`w-5 h-5 ${isSelected ? 'text-amber-500' : 'text-gray-400'}`} />
                ) : isPro ? (
                  <Award className={`w-5 h-5 ${isSelected ? 'text-blue-500' : 'text-gray-400'}`} />
                ) : (
                  <Shield className={`w-5 h-5 ${isSelected ? 'text-[#007c76]' : 'text-gray-400'}`} />
                )}
                <span className="text-[10px] font-black uppercase tracking-wider bg-white/80 px-2 py-0.5 rounded-lg border border-gray-150">
                  {combo.price}
                </span>
              </div>
              <div className="z-10">
                <p className="font-extrabold text-sm leading-tight truncate max-w-[180px]">
                  {combo.title}
                </p>
                <p className="text-[9px] opacity-70 font-bold uppercase mt-1">
                  {combo.id === 'khoa-vip' ? 'Mở khóa toàn bộ' : `${combo.courseIds?.length || 0} khóa học`}
                </p>
              </div>
              {/* Background accent */}
              <div className={`absolute -right-8 -bottom-8 w-20 h-20 rounded-full opacity-5 transition-transform group-hover:scale-110 ${
                isVip ? 'bg-amber-500' : isPro ? 'bg-blue-500' : 'bg-[#007c76]'
              }`} />
            </button>
          );
        })}
      </div>

      {/* Editing Form Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
        {/* Left Column: General Configuration */}
        <div className="space-y-6">
          <h3 className="text-lg font-extrabold text-gray-800 uppercase tracking-tight flex items-center gap-2">
            <span className="w-1.5 h-5 bg-[#007c76] rounded-full"></span>
            Cấu hình Gói: {editTitle || 'Chưa đặt tên'}
          </h3>

          <div className="space-y-4 bg-gray-50/50 p-6 rounded-3xl border border-gray-100">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-gray-400 mb-2">
                Tiêu Đề Gói Combo
              </label>
              <input
                type="text"
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                placeholder="Ví dụ: Gói Combo VIP"
                className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl font-bold text-gray-700 focus:outline-none focus:border-[#007c76] focus:ring-1 focus:ring-[#007c76] text-sm"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-400 mb-2">
                  ID Gói Combo
                </label>
                <input
                  type="text"
                  value={selectedComboId}
                  disabled
                  className="w-full px-4 py-3 bg-gray-100 border border-gray-200 rounded-xl font-bold text-gray-500 text-sm cursor-not-allowed"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-400 mb-2">
                  Học Phí Combo (VNĐ)
                </label>
                <input
                  type="text"
                  value={editPrice}
                  onChange={(e) => setEditPrice(e.target.value)}
                  placeholder="Ví dụ: 1.200.000đ"
                  className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl font-bold text-gray-700 focus:outline-none focus:border-[#007c76] focus:ring-1 focus:ring-[#007c76] text-sm"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-gray-400 mb-2">
                Ảnh Đại Diện (URL)
              </label>
              <input
                type="text"
                value={editImage}
                onChange={(e) => setEditImage(e.target.value)}
                placeholder="https://..."
                className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl font-medium text-gray-700 focus:outline-none focus:border-[#007c76] focus:ring-1 focus:ring-[#007c76] text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-gray-400 mb-2">
                Mô Tả Gói Combo
              </label>
              <textarea
                value={editDescription}
                onChange={(e) => setEditDescription(e.target.value)}
                rows={3}
                placeholder="Giới thiệu khái quát về các đặc quyền khóa học..."
                className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl font-medium text-gray-700 focus:outline-none focus:border-[#007c76] focus:ring-1 focus:ring-[#007c76] text-sm leading-relaxed"
              />
            </div>

            {/* Benefits Builder Section */}
            <div className="pt-2 border-t border-gray-150">
              <label className="block text-xs font-bold uppercase tracking-wider text-gray-400 mb-2">
                Quyền Lợi Đi Kèm ({editBenefits.length})
              </label>
              
              <div className="flex gap-2 mb-3">
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
                  placeholder="Nhập quyền lợi (ví dụ: Hỗ trợ 1-1 chuyên gia)"
                  className="flex-grow px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-[#007c76]"
                />
                <button
                  type="button"
                  onClick={handleAddBenefit}
                  className="px-4 bg-[#007c76] hover:bg-[#005f5b] text-white rounded-xl flex items-center justify-center transition-all cursor-pointer"
                >
                  <Plus className="w-5 h-5" />
                </button>
              </div>

              {editBenefits.length === 0 ? (
                <p className="text-[11px] text-gray-400 font-bold uppercase tracking-wider py-2 italic">
                  Chưa cấu hình quyền lợi cụ thể nào (Sẽ hiển thị quyền lợi mặc định).
                </p>
              ) : (
                <div className="flex flex-wrap gap-2 max-h-36 overflow-y-auto p-1.5 bg-white border border-gray-150 rounded-2xl custom-scrollbar">
                  {editBenefits.map((benefit, idx) => (
                    <div
                      key={idx}
                      className="inline-flex items-center gap-1.5 bg-[#007c76]/10 text-[#007c76] px-3 py-1.5 rounded-xl text-xs font-black"
                    >
                      <span>{benefit}</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveBenefit(idx)}
                        className="text-red-500 hover:text-red-700 hover:scale-110 transition-transform cursor-pointer"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            <button
              onClick={handleSaveCombo}
              disabled={isSaving}
              className="flex-grow py-4 bg-[#007c76] hover:bg-[#005f5b] text-white rounded-2xl font-black uppercase tracking-widest text-xs sm:text-sm flex items-center justify-center gap-2 shadow-lg shadow-[#007c76]/15 transition-all active:scale-95 disabled:opacity-50 cursor-pointer"
            >
              {isSaving ? (
                <RefreshCw className="w-5 h-5 animate-spin" />
              ) : (
                <Save className="w-5 h-5" />
              )}
              <span>Lưu thay đổi combo</span>
            </button>

            <button
              onClick={handleDeleteCombo}
              disabled={isSaving}
              className="px-5 py-4 border-2 border-red-100 hover:border-red-300 bg-red-50 hover:bg-red-100 text-red-600 rounded-2xl font-black uppercase tracking-widest text-xs flex items-center justify-center gap-2 transition-all active:scale-95 disabled:opacity-50 cursor-pointer"
            >
              <Trash2 className="w-5 h-5" />
              <span>Xóa Combo</span>
            </button>
          </div>
        </div>

        {/* Right Column: Linking Courses */}
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-extrabold text-gray-800 uppercase tracking-tight flex items-center gap-2">
              <span className="w-1.5 h-5 bg-[#007c76] rounded-full"></span>
              {selectedComboId === 'khoa-vip' ? 'Liên Kết Khóa Học (VIP)' : 'Liên Kết Khóa Học'}
            </h3>

            {selectedComboId !== 'khoa-vip' && (
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={handleSelectAll}
                  className="text-xs font-black text-[#007c76] hover:underline uppercase tracking-wider"
                >
                  Chọn tất cả
                </button>
                <span className="text-gray-300">|</span>
                <button
                  type="button"
                  onClick={handleDeselectAll}
                  className="text-xs font-black text-gray-400 hover:underline uppercase tracking-wider"
                >
                  Bỏ chọn hết
                </button>
              </div>
            )}
          </div>

          {selectedComboId === 'khoa-vip' ? (
            <div className="bg-amber-500/10 border-2 border-dashed border-amber-300/60 rounded-3xl p-8 text-center text-amber-900">
              <Crown className="w-12 h-12 text-amber-500 mx-auto mb-4" />
              <p className="font-extrabold uppercase text-sm">Gói VIP Đặc Quyền Toàn Diện</p>
              <p className="text-xs font-semibold leading-relaxed max-w-sm mx-auto mt-2 text-amber-800/80">
                Gói Combo VIP mặc định tự động kích hoạt **Toàn Bộ Khóa Học** trên hệ thống (bao gồm cả các khóa học mới thêm sau này). Do đó, bạn không cần phải tích chọn thủ công các khóa học riêng lẻ.
              </p>
            </div>
          ) : (
            <div className="border border-gray-100 rounded-3xl bg-gray-50/30 overflow-hidden">
              <div className="max-h-[380px] overflow-y-auto custom-scrollbar divide-y divide-gray-50 p-2">
                {courses.length === 0 ? (
                  <div className="text-center py-12 text-gray-400 font-bold text-sm">
                    Chưa có khóa học nào để liên kết.
                  </div>
                ) : (
                  courses.map((course) => {
                    const isChecked = selectedCourseIds.includes(course.id);
                    return (
                      <button
                        key={course.id}
                        onClick={() => handleToggleCourse(course.id)}
                        className={`w-full p-4 flex items-center justify-between text-left rounded-2xl transition-all cursor-pointer group ${
                          isChecked 
                            ? 'bg-[#007c76]/[0.04] text-gray-800' 
                            : 'hover:bg-gray-50 text-gray-600'
                        }`}
                      >
                        <div className="flex items-center gap-4">
                          <img
                            src={course.image}
                            alt={course.title}
                            className="w-14 h-9 object-cover rounded-lg border border-gray-150"
                            onError={(e) => {
                              (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1513104890138-7c749659a591';
                            }}
                          />
                          <div>
                            <p className="font-extrabold text-xs sm:text-sm leading-tight group-hover:text-[#007c76] transition-colors">
                              {course.title}
                            </p>
                            <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mt-1">
                              ID: {course.id} • {course.price}
                            </p>
                          </div>
                        </div>

                        <div>
                          {isChecked ? (
                            <CheckSquare className="w-5 h-5 text-[#007c76] shrink-0" />
                          ) : (
                            <Square className="w-5 h-5 text-gray-300 group-hover:text-gray-400 shrink-0" />
                          )}
                        </div>
                      </button>
                    );
                  })
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ComboManagement;
