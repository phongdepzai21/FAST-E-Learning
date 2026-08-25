import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  AlertTriangle, 
  Trash2, 
  Eye, 
  EyeOff, 
  RotateCcw, 
  CheckCircle2, 
  Sparkles, 
  Cloud, 
  BookOpen, 
  DollarSign, 
  Layers, 
  X,
  ArrowRight
} from 'lucide-react';

export type ConfirmActionType = 'delete' | 'reset' | 'status-hide' | 'status-show' | 'discard';

export interface ConfirmModalProps {
  isOpen: boolean;
  type: ConfirmActionType;
  title: string;
  courseTitle: string;
  category?: string;
  price?: string;
  description?: string;
  isProcessing?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export interface SuccessNotificationProps {
  isOpen: boolean;
  action: 'create' | 'update' | 'status-change' | 'import-lessons';
  courseTitle: string;
  details?: {
    price?: string;
    category?: string;
    lessonsCount?: number;
    status?: string;
  };
  onClose: () => void;
  onViewCourse?: () => void;
}

export const CourseConfirmModal: React.FC<ConfirmModalProps> = ({
  isOpen,
  type,
  title,
  courseTitle,
  category,
  price,
  description,
  isProcessing = false,
  onConfirm,
  onCancel,
}) => {
  if (!isOpen) return null;

  const isDelete = type === 'delete';
  const isReset = type === 'reset';
  const isHide = type === 'status-hide';
  const isShow = type === 'status-show';

  const getTheme = () => {
    if (isDelete || isReset) {
      return {
        icon: isReset ? <RotateCcw className="w-6 h-6 text-rose-600" /> : <Trash2 className="w-6 h-6 text-rose-600" />,
        iconBg: 'bg-rose-50 border-rose-200/80 text-rose-600',
        badgeBg: 'bg-rose-100 text-rose-800 border-rose-200',
        badgeText: isReset ? 'Reset Khóa học' : 'Xóa Khóa học',
        btnConfirm: 'bg-rose-600 hover:bg-rose-700 text-white shadow-rose-600/20',
        confirmLabel: isReset ? 'Xác nhận Reset' : 'Xác nhận Xóa',
      };
    }
    if (isHide) {
      return {
        icon: <EyeOff className="w-6 h-6 text-amber-600" />,
        iconBg: 'bg-amber-50 border-amber-200/80 text-amber-600',
        badgeBg: 'bg-amber-100 text-amber-800 border-amber-200',
        badgeText: 'Ẩn Khóa học',
        btnConfirm: 'bg-amber-600 hover:bg-amber-700 text-white shadow-amber-600/20',
        confirmLabel: 'Xác nhận Ẩn',
      };
    }
    return {
      icon: <Eye className="w-6 h-6 text-emerald-600" />,
      iconBg: 'bg-emerald-50 border-emerald-200/80 text-emerald-600',
      badgeBg: 'bg-emerald-100 text-emerald-800 border-emerald-200',
      badgeText: 'Kích hoạt Khóa học',
      btnConfirm: 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-600/20',
      confirmLabel: 'Kích hoạt ngay',
    };
  };

  const theme = getTheme();

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onCancel}
          className="absolute inset-0 bg-slate-950/60 backdrop-blur-xs"
        />

        {/* Modal Card */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          transition={{ type: 'spring', damping: 25, stiffness: 350 }}
          className="relative w-full max-w-lg bg-white dark:bg-slate-900 rounded-[32px] p-6 sm:p-8 border border-gray-100 dark:border-slate-800 shadow-2xl space-y-6 overflow-hidden"
        >
          {/* Header */}
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <div className={`w-12 h-12 rounded-2xl border flex items-center justify-center shadow-xs ${theme.iconBg}`}>
                {theme.icon}
              </div>
              <div>
                <span className={`inline-block text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-lg border mb-1 ${theme.badgeBg}`}>
                  {theme.badgeText}
                </span>
                <h3 className="text-xl font-black text-gray-900 dark:text-zinc-100 tracking-tight">
                  {title}
                </h3>
              </div>
            </div>

            <button
              onClick={onCancel}
              className="w-8 h-8 rounded-xl bg-gray-100 hover:bg-gray-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-gray-500 flex items-center justify-center transition-all cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Context Course Card */}
          <div className="p-4 rounded-2xl bg-gray-50 dark:bg-slate-800/60 border border-gray-100 dark:border-slate-800 space-y-2">
            <div className="text-xs font-bold text-gray-500 uppercase tracking-wider">Khóa học áp dụng:</div>
            <div className="text-sm font-extrabold text-gray-900 dark:text-zinc-100 leading-snug">
              {courseTitle}
            </div>

            {(category || price) && (
              <div className="flex flex-wrap items-center gap-2 pt-1">
                {category && (
                  <span className="text-[11px] font-bold text-gray-600 dark:text-zinc-300 bg-white dark:bg-slate-800 px-2.5 py-1 rounded-lg border border-gray-200 dark:border-slate-700 flex items-center gap-1">
                    <Layers className="w-3 h-3 text-[#007c76]" />
                    {category}
                  </span>
                )}
                {price && (
                  <span className="text-[11px] font-bold text-gray-600 dark:text-zinc-300 bg-white dark:bg-slate-800 px-2.5 py-1 rounded-lg border border-gray-200 dark:border-slate-700 flex items-center gap-1">
                    <DollarSign className="w-3 h-3 text-emerald-600" />
                    {price}
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Description / Explanation */}
          {description && (
            <p className="text-xs sm:text-[13px] font-medium text-gray-600 dark:text-zinc-400 leading-relaxed">
              {description}
            </p>
          )}

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onCancel}
              disabled={isProcessing}
              className="px-5 py-3 rounded-xl bg-gray-100 hover:bg-gray-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-gray-700 dark:text-zinc-300 font-extrabold text-xs uppercase tracking-wider transition-all cursor-pointer"
            >
              Hủy bỏ
            </button>

            <button
              type="button"
              onClick={onConfirm}
              disabled={isProcessing}
              className={`px-6 py-3 rounded-xl font-black text-xs uppercase tracking-wider transition-all shadow-lg flex items-center gap-2 cursor-pointer ${theme.btnConfirm} disabled:opacity-50`}
            >
              {isProcessing ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Đang xử lý...</span>
                </>
              ) : (
                <span>{theme.confirmLabel}</span>
              )}
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export const CourseSuccessBannerModal: React.FC<SuccessNotificationProps> = ({
  isOpen,
  action,
  courseTitle,
  details,
  onClose,
  onViewCourse,
}) => {
  if (!isOpen) return null;

  const getTitle = () => {
    switch (action) {
      case 'create':
        return 'Tạo khóa học thành công!';
      case 'update':
        return 'Cập nhật khóa học thành công!';
      case 'status-change':
        return 'Thay đổi trạng thái thành công!';
      case 'import-lessons':
        return 'Nhập giáo trình bài giảng thành công!';
      default:
        return 'Thao tác thành công!';
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-slate-950/60 backdrop-blur-xs"
        />

        {/* Modal Content */}
        <motion.div
          initial={{ opacity: 0, scale: 0.92, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.92, y: 20 }}
          transition={{ type: 'spring', damping: 25, stiffness: 350 }}
          className="relative w-full max-w-md bg-white dark:bg-slate-900 rounded-[36px] p-6 sm:p-8 border border-teal-100 dark:border-teal-900/40 shadow-2xl space-y-6 text-center overflow-hidden"
        >
          {/* Top Decorative Gradient */}
          <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-teal-400 via-emerald-500 to-[#007c76]" />

          {/* Icon Badge */}
          <div className="relative inline-block pt-2">
            <div className="w-20 h-20 rounded-3xl bg-gradient-to-tr from-teal-50 to-emerald-50 dark:from-teal-950/50 dark:to-emerald-950/50 border-2 border-teal-200/80 dark:border-teal-700/60 mx-auto flex items-center justify-center text-4xl shadow-xl shadow-teal-500/10">
              <Sparkles className="w-10 h-10 text-[#007c76]" />
            </div>
            <div className="absolute bottom-0 right-0 w-6 h-6 rounded-full bg-emerald-500 text-white flex items-center justify-center text-xs font-black shadow-md">
              ✓
            </div>
          </div>

          {/* Heading */}
          <div className="space-y-1.5">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-teal-50 border border-teal-200/60 text-[#007c76] text-[11px] font-black uppercase tracking-wider">
              <Cloud className="w-3.5 h-3.5" />
              <span>Đồng bộ Cloud Firestore & Thiết bị</span>
            </div>
            <h3 className="text-2xl font-black text-gray-900 dark:text-zinc-100 tracking-tight">
              {getTitle()}
            </h3>
            <p className="text-xs font-semibold text-gray-500 dark:text-zinc-400">
              Dữ liệu khóa học đã được lưu và phát hành ngay lập tức.
            </p>
          </div>

          {/* Course Details Preview */}
          <div className="bg-gray-50 dark:bg-slate-800/80 rounded-2xl p-4 text-left border border-gray-100 dark:border-slate-800 space-y-3">
            <div className="flex items-start gap-2.5">
              <BookOpen className="w-4 h-4 text-[#007c76] shrink-0 mt-0.5" />
              <div>
                <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Tên khóa học</div>
                <div className="text-sm font-extrabold text-gray-900 dark:text-zinc-100">{courseTitle}</div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-2 border-t border-gray-200/60 dark:border-slate-700">
              {details?.price && (
                <div>
                  <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Học phí</div>
                  <div className="text-xs font-black text-emerald-600">{details.price}</div>
                </div>
              )}
              {details?.category && (
                <div>
                  <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Danh mục</div>
                  <div className="text-xs font-black text-gray-700 dark:text-zinc-300">{details.category}</div>
                </div>
              )}
              {typeof details?.lessonsCount === 'number' && (
                <div>
                  <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Bài giảng</div>
                  <div className="text-xs font-black text-indigo-600">{details.lessonsCount} bài học</div>
                </div>
              )}
              {details?.status && (
                <div>
                  <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Trạng thái</div>
                  <div className="text-xs font-black text-[#007c76] capitalize">
                    {details.status === 'active' ? 'Đang hoạt động' : details.status === 'inactive' ? 'Đã ẩn' : 'Bản nháp'}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              className="w-full py-3.5 px-4 bg-gray-100 hover:bg-gray-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-gray-700 dark:text-zinc-300 rounded-2xl font-black text-xs uppercase tracking-wider transition-all cursor-pointer"
            >
              Quay lại danh sách
            </button>

            {onViewCourse && (
              <button
                type="button"
                onClick={onViewCourse}
                className="w-full py-3.5 px-4 bg-[#007c76] hover:bg-[#00625d] text-white rounded-2xl font-black text-xs uppercase tracking-wider transition-all shadow-lg shadow-[#007c76]/20 flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <span>Xem khóa học</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
