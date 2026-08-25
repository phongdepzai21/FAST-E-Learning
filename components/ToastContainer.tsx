import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useToast, Toast, ToastType } from '../contexts/ToastContext';
import { CheckCircle2, AlertCircle, Info, AlertTriangle, X, ChevronDown, Sparkles, HelpCircle } from 'lucide-react';

const icons: Record<ToastType, React.ReactNode> = {
  success: <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />,
  error: <AlertCircle className="w-5 h-5 text-rose-500 shrink-0" />,
  info: <Info className="w-5 h-5 text-[#007c76] shrink-0" />,
  warning: <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0" />,
};

const badgeStyles: Record<ToastType, { text: string; bg: string; textCol: string }> = {
  success: { text: 'Thành công', bg: 'bg-emerald-50 border-emerald-200/80', textCol: 'text-emerald-700' },
  error: { text: 'Thông báo lỗi', bg: 'bg-rose-50 border-rose-200/80', textCol: 'text-rose-700' },
  info: { text: 'Hệ thống', bg: 'bg-teal-50 border-teal-200/80', textCol: 'text-[#007c76]' },
  warning: { text: 'Cảnh báo', bg: 'bg-amber-50 border-amber-200/80', textCol: 'text-amber-800' },
};

const cardTheme: Record<ToastType, { bg: string; border: string; glow: string; bar: string }> = {
  success: {
    bg: 'bg-white/95 dark:bg-slate-900/95',
    border: 'border-emerald-200/70 dark:border-emerald-800/40',
    glow: 'shadow-xl shadow-emerald-500/10',
    bar: 'bg-gradient-to-r from-emerald-400 to-teal-500',
  },
  error: {
    bg: 'bg-white/95 dark:bg-slate-900/95',
    border: 'border-rose-200/70 dark:border-rose-800/40',
    glow: 'shadow-xl shadow-rose-500/15',
    bar: 'bg-gradient-to-r from-rose-500 to-red-600',
  },
  info: {
    bg: 'bg-white/95 dark:bg-slate-900/95',
    border: 'border-teal-200/70 dark:border-teal-800/40',
    glow: 'shadow-xl shadow-teal-500/10',
    bar: 'bg-gradient-to-r from-[#007c76] to-teal-400',
  },
  warning: {
    bg: 'bg-white/95 dark:bg-slate-900/95',
    border: 'border-amber-200/70 dark:border-amber-800/40',
    glow: 'shadow-xl shadow-amber-500/10',
    bar: 'bg-gradient-to-r from-amber-400 to-orange-500',
  },
};

const ToastItem: React.FC<{ toast: Toast; onDismiss: (id: string) => void }> = ({ toast, onDismiss }) => {
  const [isSolutionOpen, setIsSolutionOpen] = useState(false);
  const theme = cardTheme[toast.type];
  const badge = badgeStyles[toast.type];

  // If message contains solution embedded in old format (💡 Hướng dẫn khắc phục:)
  let mainMsg = toast.message;
  let detectedSolution = toast.solution;

  if (!detectedSolution && mainMsg.includes('💡 Hướng dẫn')) {
    const parts = mainMsg.split('💡 Hướng dẫn');
    mainMsg = parts[0].trim();
    detectedSolution = 'Hướng dẫn' + parts[1];
  }

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: -20, scale: 0.94 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9, y: -10, transition: { duration: 0.2 } }}
      transition={{ type: 'spring', damping: 26, stiffness: 360 }}
      id={`toast-${toast.id}`}
      className={`relative flex flex-col w-full max-w-md p-4 sm:p-5 rounded-3xl border backdrop-blur-xl ${theme.bg} ${theme.border} ${theme.glow} overflow-hidden`}
    >
      {/* Top Gradient Progress / Accent Bar */}
      <div className={`absolute top-0 left-0 right-0 h-1 ${theme.bar}`} />

      {/* Main Toast Content Header */}
      <div className="flex items-start gap-3.5">
        <div className="w-9 h-9 rounded-2xl bg-gray-50 dark:bg-slate-800 border border-gray-100 dark:border-slate-700 flex items-center justify-center shrink-0 shadow-xs mt-0.5">
          {icons[toast.type]}
        </div>

        <div className="flex-1 min-w-0 pr-6">
          <div className="flex items-center gap-2 mb-1">
            <span className={`inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md border ${badge.bg} ${badge.textCol}`}>
              {toast.type === 'success' && <Sparkles className="w-2.5 h-2.5" />}
              {toast.title || badge.text}
            </span>
          </div>

          <p className="text-xs sm:text-[13px] font-bold text-gray-800 dark:text-zinc-100 leading-relaxed break-words">
            {mainMsg}
          </p>

          {/* Collapsible Solution Helper for Friendly Guidance */}
          {detectedSolution && (
            <div className="mt-2.5 pt-2 border-t border-gray-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setIsSolutionOpen(!isSolutionOpen)}
                className="inline-flex items-center gap-1.5 text-[11px] font-extrabold text-amber-700 dark:text-amber-400 hover:text-amber-800 transition-colors"
              >
                <HelpCircle className="w-3.5 h-3.5" />
                <span>{isSolutionOpen ? 'Thu gọn gợi ý' : 'Xem hướng dẫn khắc phục'}</span>
                <ChevronDown className={`w-3 h-3 transition-transform duration-200 ${isSolutionOpen ? 'rotate-180' : ''}`} />
              </button>

              {isSolutionOpen && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="mt-2 p-2.5 rounded-xl bg-amber-50/90 dark:bg-amber-950/40 border border-amber-200/70 dark:border-amber-800/40 text-[11px] font-semibold text-amber-900 dark:text-amber-200 leading-relaxed"
                >
                  {detectedSolution}
                </motion.div>
              )}
            </div>
          )}

          {/* Action button if provided */}
          {toast.actionLabel && toast.onAction && (
            <div className="mt-3">
              <button
                onClick={() => {
                  toast.onAction?.();
                  onDismiss(toast.id);
                }}
                className="px-3 py-1.5 bg-[#007c76] hover:bg-[#00625d] text-white text-[11px] font-black uppercase tracking-wider rounded-xl transition-all shadow-xs"
              >
                {toast.actionLabel}
              </button>
            </div>
          )}
        </div>

        {/* Close button */}
        <button
          onClick={() => onDismiss(toast.id)}
          className="absolute top-4 right-4 w-7 h-7 rounded-xl bg-gray-100/80 hover:bg-gray-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-gray-400 hover:text-gray-700 dark:text-zinc-400 flex items-center justify-center transition-all cursor-pointer"
          id={`toast-close-${toast.id}`}
          aria-label="Close toast"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Visual Timer Progress Bar */}
      {toast.duration > 0 && (
        <motion.div
          initial={{ width: '100%' }}
          animate={{ width: '0%' }}
          transition={{ duration: toast.duration / 1000, ease: 'linear' }}
          className={`absolute bottom-0 left-0 right-0 h-0.5 opacity-60 ${theme.bar}`}
        />
      )}
    </motion.div>
  );
};

export const ToastContainer: React.FC = () => {
  const { toasts, dismiss } = useToast();

  return (
    <div
      id="toast-container"
      className="fixed z-[99999] top-5 right-5 left-5 sm:left-auto flex flex-col gap-3 w-auto max-w-md pointer-events-none"
    >
      <AnimatePresence mode="popLayout">
        {toasts.map((toast) => (
          <div key={toast.id} className="pointer-events-auto">
            <ToastItem toast={toast} onDismiss={dismiss} />
          </div>
        ))}
      </AnimatePresence>
    </div>
  );
};

