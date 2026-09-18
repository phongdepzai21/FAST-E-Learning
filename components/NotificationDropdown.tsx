import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Bell, 
  CheckCheck, 
  Sparkles, 
  BookOpen, 
  ExternalLink, 
  Clock, 
  X,
  PlusCircle,
  Shield,
  UserCheck
} from 'lucide-react';
import { 
  getStoredNotifications, 
  getUnreadCount, 
  markNotificationAsRead, 
  markAllNotificationsAsRead, 
  formatTimeAgo,
  CourseNotification,
  markCourseAsSeen
} from '../utils/courseNotificationService';

interface NotificationDropdownProps {
  isMobile?: boolean;
  onItemClick?: () => void;
}

export const NotificationDropdown: React.FC<NotificationDropdownProps> = ({ 
  isMobile = false,
  onItemClick 
}) => {
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<CourseNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const refresh = () => {
    const list = getStoredNotifications();
    setNotifications(list);
    setUnreadCount(getUnreadCount());
  };

  useEffect(() => {
    refresh();

    const handleUpdate = () => refresh();
    window.addEventListener('course_notifications_updated', handleUpdate);
    window.addEventListener('storage', handleUpdate);

    return () => {
      window.removeEventListener('course_notifications_updated', handleUpdate);
      window.removeEventListener('storage', handleUpdate);
    };
  }, []);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  const handleSelectNotification = (notif: CourseNotification) => {
    markNotificationAsRead(notif.id);
    if (notif.courseId) {
      markCourseAsSeen(notif.courseId);
    }
    setIsOpen(false);
    onItemClick?.();
    if (notif.type === 'approval') {
      navigate('/account', { state: { tab: 'user-management' } });
    } else if (notif.courseId) {
      navigate(`/khoa-hoc/${notif.courseId}`);
    } else {
      navigate('/khoa-hoc');
    }
  };

  const handleMarkAllRead = (e: React.MouseEvent) => {
    e.stopPropagation();
    markAllNotificationsAsRead();
    refresh();
  };

  const handleTriggerDemoNotification = (e: React.MouseEvent) => {
    e.stopPropagation();
    const demoId = `demo-course-${Date.now()}`;
    window.dispatchEvent(new CustomEvent('courses_updated', {
      detail: {
        action: 'upsert',
        course: {
          id: demoId,
          title: 'Khóa học Chuyên sâu: Kiểm soát Vi sinh vật trong Chế biến Thực phẩm',
          price: '699.000đ',
          category: 'QA/QC',
          image: 'https://images.unsplash.com/photo-1576086213369-97a306d36557?auto=format&fit=crop&q=80&w=800',
          description: 'Cập nhật kỹ thuật kiểm nghiệm nhanh và tiêu chuẩn phòng ngừa ô nhiễm chéo vi sinh vật.',
          updatedAt: new Date().toISOString()
        }
      }
    }));
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell Trigger Button */}
      <button
        id="notification-bell-button"
        onClick={() => setIsOpen(!isOpen)}
        aria-label="Thông báo khóa học"
        className={`relative p-2 rounded-xl transition-all cursor-pointer flex items-center justify-center ${
          isOpen 
            ? 'bg-[#007c76]/10 text-[#007c76]' 
            : 'text-gray-600 hover:text-[#007c76] hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-slate-800'
        }`}
      >
        <Bell className="w-5 h-5 md:w-6 md:h-6" />

        {/* Unread Badge */}
        {unreadCount > 0 && (
          <span 
            id="notification-badge-count"
            className="absolute -top-1 -right-1 flex h-5 min-w-[20px] px-1 items-center justify-center text-[10px] font-black text-white bg-rose-500 rounded-full ring-2 ring-white shadow-xs animate-in zoom-in-50 duration-200"
          >
            {unreadCount > 9 ? '9+' : unreadCount}
            <span className="absolute inset-0 rounded-full bg-rose-500 animate-ping opacity-60 pointer-events-none" />
          </span>
        )}
      </button>

      {/* Dropdown Popover */}
      {isOpen && (
        <div 
          id="notification-dropdown-menu"
          className={`absolute ${
            isMobile ? 'left-0 right-0 mt-2 mx-auto w-[92vw] max-w-[380px]' : 'right-0 mt-3 w-80 sm:w-96'
          } bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-gray-100 dark:border-slate-800 z-[110] overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200`}
        >
          {/* Header */}
          <div className="px-4 py-3.5 bg-gradient-to-r from-gray-50 to-teal-50/40 dark:from-slate-800 dark:to-slate-800/80 border-b border-gray-100 dark:border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-sm text-gray-900 dark:text-white">
                Thông báo khóa học
              </span>
              {unreadCount > 0 && (
                <span className="px-2 py-0.5 text-[10px] font-black bg-rose-500 text-white rounded-full">
                  {unreadCount} mới
                </span>
              )}
            </div>

            <div className="flex items-center gap-2">
              {unreadCount > 0 && (
                <button
                  onClick={handleMarkAllRead}
                  title="Đánh dấu tất cả đã đọc"
                  className="text-[11px] font-bold text-[#007c76] hover:text-[#005a56] flex items-center gap-1 cursor-pointer transition-colors"
                >
                  <CheckCheck className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Đã đọc hết</span>
                </button>
              )}
              <button
                onClick={() => setIsOpen(false)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 p-1 rounded-lg"
                aria-label="Đóng"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Notification List */}
          <div className="max-h-[360px] overflow-y-auto divide-y divide-gray-100 dark:divide-slate-800">
            {notifications.length === 0 ? (
              <div className="py-10 px-4 text-center">
                <BookOpen className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                <p className="text-xs font-bold text-gray-500">Chưa có thông báo khóa học nào</p>
                <p className="text-[11px] text-gray-400 mt-0.5">Các khóa học mới và nội dung cập nhật sẽ xuất hiện tại đây.</p>
              </div>
            ) : (
              notifications.map((notif) => (
                <div
                  key={notif.id}
                  onClick={() => handleSelectNotification(notif)}
                  className={`p-3.5 transition-colors cursor-pointer flex gap-3 items-start group ${
                    notif.isRead 
                      ? 'bg-white dark:bg-slate-900 hover:bg-gray-50 dark:hover:bg-slate-800/60' 
                      : 'bg-teal-50/40 dark:bg-teal-950/20 hover:bg-teal-50/70'
                  }`}
                >
                  {/* Thumbnail / Icon */}
                  <div className="relative shrink-0 mt-0.5">
                    {notif.type === 'approval' ? (
                      <div className="w-11 h-11 rounded-xl bg-indigo-100 dark:bg-indigo-950/70 border border-indigo-200 dark:border-indigo-800 flex items-center justify-center text-indigo-600 dark:text-indigo-400 shadow-xs">
                        <Shield className="w-5 h-5" />
                      </div>
                    ) : notif.courseImage ? (
                      <img 
                        src={notif.courseImage} 
                        alt="" 
                        className="w-11 h-11 rounded-xl object-cover border border-gray-200 dark:border-slate-700 shadow-xs"
                        onError={(e) => { (e.target as HTMLElement).style.display = 'none'; }}
                      />
                    ) : (
                      <div className="w-11 h-11 rounded-xl bg-teal-100 dark:bg-teal-900/60 flex items-center justify-center text-[#007c76]">
                        <BookOpen className="w-5 h-5" />
                      </div>
                    )}
                    {!notif.isRead && (
                      <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-rose-500 rounded-full ring-2 ring-white" />
                    )}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 mb-1">
                      <span className={`px-1.5 py-0.5 rounded text-[9px] font-black uppercase tracking-wider ${
                        notif.type === 'new' 
                          ? 'bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300' 
                          : notif.type === 'approval'
                            ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300'
                            : 'bg-teal-100 text-teal-800 dark:bg-teal-950/60 dark:text-teal-300'
                      }`}>
                        {notif.type === 'new' ? 'Mới' : notif.type === 'approval' ? 'Phê duyệt' : 'Cập nhật'}
                      </span>
                      {notif.courseCategory && (
                        <span className="text-[10px] font-semibold text-gray-500">
                          {notif.courseCategory}
                        </span>
                      )}
                      <span className="text-[10px] text-gray-400 ml-auto flex items-center gap-1 shrink-0">
                        <Clock className="w-2.5 h-2.5" />
                        {formatTimeAgo(notif.timestamp)}
                      </span>
                    </div>

                    <h5 className="text-xs font-bold text-gray-900 dark:text-white leading-snug group-hover:text-[#007c76] transition-colors line-clamp-2">
                      {notif.courseTitle}
                    </h5>

                    <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-1 line-clamp-1">
                      {notif.message}
                    </p>

                    {notif.price && (
                      <div className="mt-1 flex items-center justify-between">
                        <span className="text-[11px] font-extrabold text-[#007c76]">
                          {notif.price}
                        </span>
                        <span className="text-[10px] font-bold text-gray-400 group-hover:text-[#007c76] flex items-center gap-0.5">
                          Xem khóa học <ExternalLink className="w-2.5 h-2.5" />
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Footer with Actions */}
          <div className="p-3 bg-gray-50 dark:bg-slate-800 border-t border-gray-100 dark:border-slate-800 flex items-center justify-between gap-2">
            <button
              onClick={handleTriggerDemoNotification}
              title="Kích hoạt thông báo đẩy mẫu để kiểm thử tính năng Toast và Huy hiệu"
              className="text-[11px] font-bold text-gray-500 hover:text-[#007c76] flex items-center gap-1 px-2 py-1 rounded-lg hover:bg-gray-200/60 dark:hover:bg-slate-700 transition-colors cursor-pointer"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              <span>Thử thông báo</span>
            </button>

            <button
              onClick={() => {
                setIsOpen(false);
                navigate('/khoa-hoc');
              }}
              className="text-[11px] font-extrabold text-[#007c76] hover:text-[#005a56] flex items-center gap-1 px-2 py-1 rounded-lg hover:bg-teal-50 dark:hover:bg-slate-700 transition-colors cursor-pointer"
            >
              <span>Xem tất cả khóa học →</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
