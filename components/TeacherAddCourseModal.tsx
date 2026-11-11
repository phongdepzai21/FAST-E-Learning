import React, { useState } from 'react';
import { X, Plus, BookOpen, Video, DollarSign, Image as ImageIcon, CheckCircle2, UserCheck, Calendar } from 'lucide-react';
import { db } from '../firebase';
import { doc, setDoc } from 'firebase/firestore';
import { useToast } from '../contexts/ToastContext';
import { Course } from '../types';
import { generateTenDigitId } from '../utils/idGenerator';

export interface TeacherAddCourseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCourseAdded?: (course: Course) => void;
}

export const TeacherAddCourseModal: React.FC<TeacherAddCourseModalProps> = ({
  isOpen,
  onClose,
  onCourseAdded
}) => {
  const toast = useToast();

  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('ATTP');
  const [price, setPrice] = useState('599.000đ');
  const [summary, setSummary] = useState('');
  const [description, setDescription] = useState('');
  const [instructor, setInstructor] = useState('Ban Giảng Viên FAST E-Learning');
  const [image, setImage] = useState('https://images.unsplash.com/photo-1512621776951-a57141f2eefd?auto=format&fit=crop&q=80&w=600');
  const [videoUrl, setVideoUrl] = useState('');
  const [duration, setDuration] = useState('4 Buổi (Tập huấn chuẩn)');
  const [level, setLevel] = useState<'Cơ bản' | 'Trung cấp' | 'Chuyên sâu'>('Cơ bản');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !summary.trim()) {
      toast.showToast('Vui lòng nhập Tên khóa học và Mô tả tóm tắt!', 'error');
      return;
    }

    setIsSubmitting(true);
    const courseId = generateTenDigitId();
    const newCourse: Course = {
      id: courseId,
      title: title.trim(),
      category: category.trim(),
      price: price.trim() || '599.000đ',
      description: description.trim() || summary.trim(),
      image: image.trim() || 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?auto=format&fit=crop&q=80&w=600',
      duration: duration.trim(),
      status: 'active',
      createdAt: new Date().toISOString()
    };

    try {
      // 1. Lưu vào Firestore courses collection
      await setDoc(doc(db, 'courses', courseId), newCourse, { merge: true });

      // 2. Gửi API backend server
      await fetch('/api/courses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'create', course: newCourse })
      }).catch(() => {});

      toast.showToast(`Đã thêm khóa học "${title}" thành công!`, 'success');
      if (onCourseAdded) onCourseAdded(newCourse);
      onClose();
    } catch (err: any) {
      toast.showToast('Lỗi khi thêm khóa học: ' + (err?.message || 'Không xác định'), 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm overflow-y-auto">
      <div className="bg-white rounded-3xl max-w-2xl w-full border border-slate-200 shadow-2xl overflow-hidden my-8 animate-fade-in relative">
        {/* Header Bar */}
        <div className="bg-gradient-to-r from-emerald-900 via-[#005c56] to-[#007c76] p-6 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center border border-white/20">
              <BookOpen className="w-5 h-5 text-emerald-300" />
            </div>
            <div>
              <h3 className="font-black text-lg text-white">Thêm Khóa Học Mới Cho Giảng Viên</h3>
              <p className="text-xs text-emerald-100 font-medium">Khóa học sau khi tạo sẽ tự động có mặt trên hệ thống & có thể bật nổi bật</p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition border border-white/20 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 sm:p-8 space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-xs font-black text-slate-700 mb-1">
                Tên khóa học <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="Ví dụ: Đào tạo Kỹ thuật viên Kiểm nghiệm Vi sinh ATTP"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#007c76]"
              />
            </div>

            <div>
              <label className="block text-xs font-black text-slate-700 mb-1">Danh mục chuyên ngành</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#007c76]"
              >
                <option value="ATTP">An toàn vệ sinh thực phẩm (ATTP)</option>
                <option value="ISO 22000">ISO 22000:2018 (Quản lý ATTP)</option>
                <option value="HACCP">HACCP Codices (Mối nguy ATTP)</option>
                <option value="QA-QC">QA/QC Thực phẩm Chuyên nghiệp</option>
                <option value="ISO 9001">ISO 9001:2015 (Quản lý Chất lượng)</option>
                <option value="BRCGS">BRCGS Food Safety Version 9</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-black text-slate-700 mb-1">Học phí niêm yết (Gốc)</label>
              <input
                type="text"
                placeholder="Ví dụ: 599.000đ"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#007c76]"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-black text-slate-700 mb-1">
                Mô tả ngắn khóa học <span className="text-red-500">*</span>
              </label>
              <textarea
                required
                rows={2}
                placeholder="Tóm tắt ngắn gọn nội dung và giá trị khóa học mang lại..."
                value={summary}
                onChange={(e) => setSummary(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#007c76]"
              />
            </div>

            <div>
              <label className="block text-xs font-black text-slate-700 mb-1">Giảng viên đảm nhận</label>
              <input
                type="text"
                placeholder="Tên chuyên gia / ThS / TS"
                value={instructor}
                onChange={(e) => setInstructor(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#007c76]"
              />
            </div>

            <div>
              <label className="block text-xs font-black text-slate-700 mb-1">Thời lượng tập huấn</label>
              <input
                type="text"
                placeholder="Ví dụ: 4 Buổi (12 giờ)"
                value={duration}
                onChange={(e) => setDuration(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#007c76]"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-black text-slate-700 mb-1">Link Ảnh Banner Khóa Học (URL)</label>
              <input
                type="url"
                placeholder="https://..."
                value={image}
                onChange={(e) => setImage(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#007c76]"
              />
            </div>
          </div>

          <div className="pt-4 flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 border border-slate-300 rounded-xl text-xs font-bold text-slate-700 uppercase tracking-wider hover:bg-slate-50 transition cursor-pointer"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 py-3 bg-[#007c76] hover:bg-[#005c56] text-white font-black text-xs uppercase tracking-wider rounded-xl shadow-lg shadow-[#007c76]/20 transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {isSubmitting ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <Plus className="w-4 h-4" />
              )}
              <span>Tạo Khóa Học Ngay</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
