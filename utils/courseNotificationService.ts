import { Course } from '../types';

export type NotificationType = 'new' | 'updated' | 'approval';

export interface CourseNotification {
  id: string;
  courseId?: string;
  courseTitle: string;
  courseCategory?: string;
  courseImage?: string;
  type: NotificationType;
  message: string;
  timestamp: string; // ISO string
  isRead: boolean;
  price?: string;
  userEmail?: string;
  rolesSummary?: string;
}

const STORAGE_KEY = 'fast_course_notifications';
const SEEN_COURSES_KEY = 'fast_seen_course_ids';

// Initial sample notification if empty so users can experience the badge and bell in action
const SEED_NOTIFICATIONS: CourseNotification[] = [
  {
    id: 'seed-iso-22000-update',
    courseId: 'iso-22000',
    courseTitle: 'ISO 22000 - Quản lý An toàn thực phẩm',
    courseCategory: 'ISO',
    courseImage: 'https://images.unsplash.com/photo-1533777857889-4be7c70b33f7?auto=format&fit=crop&q=80&w=800',
    type: 'updated',
    message: 'Khóa học vừa được cập nhật bài giảng mới về Phân tích mối nguy chuỗi cung ứng thực phẩm.',
    timestamp: new Date(Date.now() - 35 * 60 * 1000).toISOString(), // 35 mins ago
    isRead: false,
    price: '599.000đ',
  }
];

export function getStoredNotifications(): CourseNotification[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(SEED_NOTIFICATIONS));
      return SEED_NOTIFICATIONS;
    }
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (e) {
    return [];
  }
}

export function saveNotifications(list: CourseNotification[]) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
    window.dispatchEvent(new CustomEvent('course_notifications_updated'));
  } catch (e) {
    console.warn('Could not save notifications to localStorage:', e);
  }
}

export function getUnreadNotifications(): CourseNotification[] {
  return getStoredNotifications().filter(n => !n.isRead);
}

export function getUnreadCount(): number {
  return getUnreadNotifications().length;
}

export function markNotificationAsRead(id: string) {
  const current = getStoredNotifications();
  const updated = current.map(item => item.id === id ? { ...item, isRead: true } : item);
  saveNotifications(updated);
}

export function markAllNotificationsAsRead() {
  const current = getStoredNotifications();
  const updated = current.map(item => ({ ...item, isRead: true }));
  saveNotifications(updated);
}

export function addCourseNotification(course: Partial<Course>, type: 'new' | 'updated'): CourseNotification {
  const id = `notif_${course.id || Date.now()}_${Date.now()}`;
  const title = course.title || 'Khóa học mới';
  const newNotif: CourseNotification = {
    id,
    courseId: course.id || '',
    courseTitle: title,
    courseCategory: course.category,
    courseImage: course.image,
    type,
    message: type === 'new' 
      ? `Khóa học mới "${title}" vừa được cập nhật trên hệ thống.`
      : `Khóa học "${title}" vừa được cập nhật thêm nội dung mới.`,
    timestamp: new Date().toISOString(),
    isRead: false,
    price: course.price,
  };

  const current = getStoredNotifications();
  // Filter duplicate within 60s
  const filtered = current.filter(n => !(n.courseId === course.id && n.type === type && (Date.now() - new Date(n.timestamp).getTime() < 60000)));
  const updated = [newNotif, ...filtered].slice(0, 25);
  saveNotifications(updated);
  return newNotif;
}

export function addApprovalNotification(params: {
  userEmail: string;
  userName?: string;
  roles: { isAdmin: boolean; isTeacher: boolean; isVip: boolean };
}): CourseNotification {
  const roleNames: string[] = [];
  if (params.roles.isAdmin) roleNames.push('Quản trị viên (Admin)');
  if (params.roles.isTeacher) roleNames.push('Giảng viên');
  if (params.roles.isVip) roleNames.push('Thành viên VIP');
  if (roleNames.length === 0) roleNames.push('Học viên');

  const roleSummary = roleNames.join(', ');
  const title = `Phê duyệt phân quyền: ${params.userEmail}`;
  const message = `Tài khoản ${params.userName ? `${params.userName} (${params.userEmail})` : params.userEmail} đã được phê duyệt và cập nhật vai trò: ${roleSummary}.`;

  const newNotif: CourseNotification = {
    id: `approval_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    courseTitle: title,
    courseCategory: 'Phê duyệt',
    type: 'approval',
    message,
    timestamp: new Date().toISOString(),
    isRead: false,
    userEmail: params.userEmail,
    rolesSummary: roleSummary,
  };

  const current = getStoredNotifications();
  const updated = [newNotif, ...current].slice(0, 30);
  saveNotifications(updated);
  return newNotif;
}

export function getSeenCourseIds(): string[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(SEEN_COURSES_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    return [];
  }
}

export function markCourseAsSeen(courseId: string) {
  if (typeof window === 'undefined' || !courseId) return;
  try {
    const seen = new Set(getSeenCourseIds());
    seen.add(courseId);
    localStorage.setItem(SEEN_COURSES_KEY, JSON.stringify(Array.from(seen)));
    
    // Also mark related notifications as read
    const current = getStoredNotifications();
    const updated = current.map(n => n.courseId === courseId ? { ...n, isRead: true } : n);
    saveNotifications(updated);
  } catch (e) {}
}

export function isCourseNewOrUpdated(courseId: string): boolean {
  const unread = getUnreadNotifications();
  return unread.some(n => n.courseId === courseId);
}

export function formatTimeAgo(isoString: string): string {
  try {
    const diff = Date.now() - new Date(isoString).getTime();
    const minutes = Math.floor(diff / 60000);
    if (minutes < 1) return 'Vừa xong';
    if (minutes < 60) return `${minutes} phút trước`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours} giờ trước`;
    const days = Math.floor(hours / 24);
    if (days < 30) return `${days} ngày trước`;
    return new Date(isoString).toLocaleDateString('vi-VN');
  } catch (e) {
    return 'Gần đây';
  }
}
