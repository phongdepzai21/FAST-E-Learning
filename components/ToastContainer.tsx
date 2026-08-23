import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useToast, Toast, ToastType } from '../contexts/ToastContext';
import { CheckCircle2, AlertCircle, Info, AlertTriangle, X } from 'lucide-react';

const icons: Record<ToastType, React.ReactNode> = {
  success: <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />,
  error: <AlertCircle className="w-5 h-5 text-rose-500 shrink-0" />,
  info: <Info className="w-5 h-5 text-[#007c76] shrink-0" />,
  warning: <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0" />,
};

const bgColors: Record<ToastType, string> = {
  success: 'bg-white border-emerald-100 dark:bg-zinc-900 dark:border-emerald-950/50 shadow-emerald-100/10',
  error: 'bg-white border-rose-100 dark:bg-zinc-900 dark:border-rose-950/50 shadow-rose-100/10',
  info: 'bg-white border-[#007c76]/10 dark:bg-zinc-900 dark:border-[#007c76]/20 shadow-[#007c76]/5',
  warning: 'bg-white border-amber-100 dark:bg-zinc-900 dark:border-amber-950/50 shadow-amber-100/10',
};

const borderAccentColors: Record<ToastType, string> = {
  success: 'bg-emerald-500',
  error: 'bg-rose-500',
  info: 'bg-[#007c76]',
  warning: 'bg-amber-500',
};

const ToastItem: React.FC<{ toast: Toast; onDismiss: (id: string) => void }> = ({ toast, onDismiss }) => {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: -20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.15 } }}
      transition={{ type: 'spring', damping: 25, stiffness: 350 }}
      id={`toast-${toast.id}`}
      className={`relative flex items-start gap-3 w-full max-w-sm p-4 rounded-2xl border backdrop-blur-md shadow-xl ${bgColors[toast.type]} overflow-hidden`}
    >
      {/* Accent Indicator Bar */}
      <div className={`absolute top-0 bottom-0 left-0 w-1.5 ${borderAccentColors[toast.type]}`} />

      {/* Icon */}
      <div className="pl-1.5 mt-0.5">
        {icons[toast.type]}
      </div>

      {/* Message and Controls */}
      <div className="flex-grow pr-4">
        <p className="text-sm font-semibold text-gray-800 dark:text-zinc-100 leading-snug whitespace-pre-line">
          {toast.message}
        </p>
      </div>

      {/* Close button */}
      <button
        onClick={() => onDismiss(toast.id)}
        className="text-gray-400 hover:text-gray-600 dark:text-zinc-500 dark:hover:text-zinc-300 transition-colors p-1 hover:bg-gray-50 dark:hover:bg-zinc-800 rounded-lg absolute top-3 right-3"
        id={`toast-close-${toast.id}`}
        aria-label="Close toast"
      >
        <X className="w-4 h-4" />
      </button>

      {/* Visual Progress Bar Timer Effect */}
      {toast.duration > 0 && (
        <motion.div
          initial={{ width: '100%' }}
          animate={{ width: '0%' }}
          transition={{ duration: toast.duration / 1000, ease: 'linear' }}
          className={`absolute bottom-0 left-1.5 right-0 h-0.5 opacity-40 ${borderAccentColors[toast.type]}`}
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
      className="fixed z-[9999] top-4 right-4 left-4 sm:left-auto flex flex-col gap-3 w-auto max-w-sm pointer-events-none"
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
