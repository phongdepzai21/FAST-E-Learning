import React, { useEffect } from 'react';
import { useToast } from '../contexts/ToastContext';

export const NetworkStatusNotifier: React.FC = () => {
  const { warning, success } = useToast();

  useEffect(() => {
    const handleOnline = () => {
      success(
        'Đã khôi phục kết nối mạng. Tiến trình của bạn sẽ được tự động đồng bộ.',
        4000,
        'Đã kết nối lại'
      );
    };

    const handleOffline = () => {
      warning(
        'Bạn đang ngoại tuyến. Tiến trình học tập sẽ được lưu cục bộ và không được đồng bộ cho đến khi có kết nối lại.',
        6000,
        'Mất kết nối mạng'
      );
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Bắt trường hợp người dùng mở app lúc không có mạng
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      handleOffline();
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [warning, success]);

  return null;
};
