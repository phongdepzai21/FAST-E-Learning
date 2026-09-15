import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';

export type ToastType = 'success' | 'error' | 'info' | 'warning';

export interface Toast {
  id: string;
  title?: string;
  message: string | React.ReactNode;
  solution?: string;
  type: ToastType;
  duration: number; // in ms
  actionLabel?: string;
  onAction?: () => void;
}

interface ToastContextType {
  toasts: Toast[];
  show: (message: string | React.ReactNode, type?: ToastType, duration?: number, title?: string, solution?: string, actionLabel?: string, onAction?: () => void) => void;
  showToast: (message: string, type?: ToastType, duration?: number) => void;
  success: (message: string | React.ReactNode, duration?: number, title?: string, actionLabel?: string, onAction?: () => void) => void;
  error: (message: string | React.ReactNode, duration?: number, title?: string, solution?: string) => void;
  info: (message: string | React.ReactNode, duration?: number, title?: string) => void;
  warning: (message: string | React.ReactNode, duration?: number, title?: string, solution?: string) => void;
  dismiss: (id: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const ToastProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  }, []);

  const show = useCallback((
    message: string | React.ReactNode, 
    type: ToastType = 'info', 
    duration: number = 4500,
    title?: string,
    solution?: string,
    actionLabel?: string,
    onAction?: () => void
  ) => {
    const id = Math.random().toString(36).substring(2, 9);
    const newToast: Toast = { id, message, type, duration, title, solution, actionLabel, onAction };
    setToasts((prev) => [...prev, newToast]);

    if (duration > 0) {
      setTimeout(() => {
        dismiss(id);
      }, duration);
    }
  }, [dismiss]);

  const showToast = useCallback((message: string, type: ToastType = 'info', duration: number = 4500) => {
    show(message, type, duration);
  }, [show]);

  const success = useCallback((message: string | React.ReactNode, duration?: number, title?: string, actionLabel?: string, onAction?: () => void) => {
    show(message, 'success', duration ?? 4000, title, undefined, actionLabel, onAction);
  }, [show]);

  const error = useCallback((message: string | React.ReactNode, duration?: number, title?: string, solution?: string) => {
    show(message, 'error', duration ?? 6000, title, solution);
  }, [show]);

  const info = useCallback((message: string | React.ReactNode, duration?: number, title?: string) => {
    show(message, 'info', duration ?? 4000, title);
  }, [show]);

  const warning = useCallback((message: string | React.ReactNode, duration?: number, title?: string, solution?: string) => {
    show(message, 'warning', duration ?? 5000, title, solution);
  }, [show]);

  return (
    <ToastContext.Provider value={{ toasts, show, showToast, success, error, info, warning, dismiss }}>
      {children}
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const context = useContext(ToastContext);
  if (context === undefined) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};

