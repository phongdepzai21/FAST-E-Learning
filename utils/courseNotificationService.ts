import { Course } from '../types';

export type NotificationType = 'new' | 'updated' | 'approval' | 'training_link';

export interface CourseNotification {
  id: string;
  courseId?: string;
  courseTitle: string;
  title?: string;
  courseCategory?: string;
  courseImage?: string;
  type: NotificationType;
  message: string;
  timestamp: string; // ISO string
  isRead: boolean;
  price?: string;
  userEmail?: string;
  rolesSummary?: string;
  link?: string;
  registrationId?: string;
  startDate?: string;
  scheduleDetails?: string;
  venueAddress?: string;
  trainingType?: string;
  trainingTypeLabel?: string;
  checkInTime?: string;
  prepNotes?: string;
  checklist?: string[];
}

export const DEFAULT_OFFLINE_VENUE = 'Số 18 Nguyễn Cơ Thạch, Nam Từ Liêm, Hà Nội (Hội trường đào tạo FAST)';
export const DEFAULT_OFFLINE_MAP_LINK = 'https://maps.google.com/?q=18+Nguyen+Co+Thach+Nam+Tu+Liem+Ha+Noi';

export function isOfflineTrainingNotification(input?: {
  trainingType?: string;
  trainingTypeLabel?: string;
  link?: string;
  venueAddress?: string;
  title?: string;
  message?: string;
}): boolean {
  if (!input) return false;
  const rawType = String(input.trainingType || '').toLowerCase().trim();
  const label = String(input.trainingTypeLabel || '').toLowerCase();
  const link = String(input.link || '').toLowerCase();
  const title = String(input.title || '').toLowerCase();

  if (rawType === 'direct' || rawType === 'offline' || rawType === 'inhouse') return true;
  if (rawType === 'zoom' && !label.includes('trực tiếp') && !label.includes('hội trường')) return false;
  if (
    label.includes('trực tiếp') ||
    label.includes('hội trường') ||
    label.includes('offline') ||
    label.includes('in-house') ||
    label.includes('tại cơ sở')
  ) {
    return true;
  }
  if (link.includes('maps.google') || link.includes('goo.gl/maps') || link.includes('maps.app.goo.gl')) {
    return true;
  }
  if (title.includes('offline') || title.includes('hội trường')) {
    return true;
  }
  return false;
}

export function cleanOfflineVenueAddress(rawVenue?: string): string {
  const trimmed = String(rawVenue || '').trim();
  if (!trimmed) return DEFAULT_OFFLINE_VENUE;
  const stripped = trimmed.replace(/\s*\/\s*Zoom\s*HD/gi, '').trim();
  return stripped || DEFAULT_OFFLINE_VENUE;
}

const WEEKDAY_VI = [
  'Chủ Nhật',
  'Thứ Hai',
  'Thứ Ba',
  'Thứ Tư',
  'Thứ Năm',
  'Thứ Sáu',
  'Thứ Bảy',
];

export function formatIsoDateToVietnamese(isoDate?: string): string {
  const raw = String(isoDate || '').trim();
  const m = raw.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return raw;
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  if (Number.isNaN(d.getTime())) return `${m[3]}/${m[2]}/${m[1]}`;
  return `${WEEKDAY_VI[d.getDay()]}, ${m[3]}/${m[2]}/${m[1]}`;
}

export function extractIsoDateFromText(text?: string): string {
  const raw = String(text || '').trim();
  const isoMatch = raw.match(/(\d{4})-(\d{2})-(\d{2})/);
  if (isoMatch) return `${isoMatch[1]}-${isoMatch[2]}-${isoMatch[3]}`;
  const vnMatch = raw.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (vnMatch) {
    return `${vnMatch[3]}-${vnMatch[2].padStart(2, '0')}-${vnMatch[1].padStart(2, '0')}`;
  }
  return '';
}

export function extractTimeWindow(text?: string): { start: string; end: string } {
  const raw = String(text || '').trim();
  const rangeMatch = raw.match(/(\d{1,2}:\d{2})\s*[-–~]\s*(\d{1,2}:\d{2})/);
  if (rangeMatch) {
    return {
      start: rangeMatch[1].padStart(5, '0'),
      end: rangeMatch[2].padStart(5, '0'),
    };
  }
  return { start: '', end: '' };
}

export function formatTrainingScheduleDisplay(startDate?: string, scheduleDetails?: string): {
  dateLabel: string;
  timeLabel: string;
} {
  const rawDate = String(startDate || '').trim();
  const rawDetails = String(scheduleDetails || '').trim();

  let dateLabel = rawDate;
  const isoOnly = rawDate.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (isoOnly) {
    dateLabel = formatIsoDateToVietnamese(rawDate);
  } else if (!dateLabel || /theo lịch khóa học|theo lịch khai giảng/i.test(dateLabel)) {
    dateLabel = 'Đang chờ ấn định ngày cụ thể';
  }

  let timeLabel = rawDetails;
  if (!timeLabel) {
    const inDateTime = extractTimeWindow(rawDate);
    if (inDateTime.start && inDateTime.end) {
      timeLabel = `${inDateTime.start} - ${inDateTime.end}`;
    }
  }
  if (!timeLabel) {
    timeLabel = 'Theo khung giờ ấn định';
  }

  return { dateLabel, timeLabel };
}

export function getPreClassPreparationMeta(input: {
  courseTitle?: string;
  registrationId?: string;
  startDate?: string;
  scheduleDetails?: string;
  venueAddress?: string;
  trainingType?: string;
  trainingTypeLabel?: string;
  link?: string;
  checkInTime?: string;
  checklist?: string[];
}) {
  const isOffline = isOfflineTrainingNotification(input);
  const shortCode = String(input.registrationId || '')
    .replace(/[^a-zA-Z0-9]/g, '')
    .slice(-8)
    .toUpperCase();
  const cleanVenue = cleanOfflineVenueAddress(input.venueAddress);
  const { dateLabel: specificDateLabel, timeLabel: timeWindowLabel } = formatTrainingScheduleDisplay(
    input.startDate,
    input.scheduleDetails
  );
  const scheduleStr = input.scheduleDetails ? ` (${input.scheduleDetails})` : '';

  if (isOffline) {
    return {
      isOffline: true,
      badgeLabel: 'Thư mời Hội trường Offline',
      formatLabel: input.trainingTypeLabel || 'Đào tạo Trực tiếp tại Hội trường',
      specificDateLabel,
      timeWindowLabel,
      venueAddress: cleanVenue,
      actionLink:
        input.link && !String(input.link).includes('zoom.us')
          ? input.link
          : DEFAULT_OFFLINE_MAP_LINK,
      actionLabel: 'Chỉ đường tới Hội trường',
      checkInTime:
        input.checkInTime ||
        'Đón tiếp & Check-in trước giờ khai giảng 20 phút tại quầy Lễ tân Học viện FAST',
      hospitalityNote:
        'Trang phục lịch sự / công sở · Đã chuẩn bị sẵn bộ tài liệu in ấn & tea-break tại bàn',
      conciergeHotline: '0927 002 668',
      checklist:
        Array.isArray(input.checklist) && input.checklist.length > 0
          ? input.checklist
          : [
              'Có mặt tại sảnh Hội trường trước 20 phút để đón tiếp, check-in và nhận bộ tài liệu bản in',
              'Mang theo CCCD/CMND (bản gốc hoặc VNeID) để đối chiếu hồ sơ cấp Chứng nhận hoàn thành',
              shortCode
                ? `Xuất trình Mã hồ sơ #${shortCode} hoặc email đăng ký tại quầy Lễ tân học viên`
                : 'Xuất trình Email hoặc Số điện thoại đăng ký tại quầy Lễ tân học viên',
              'Mang theo hồ sơ mẫu cơ sở (nếu muốn Chuyên gia góp ý trực tiếp tại phiên thực hành)'
            ],
      defaultTitle: `Thư mời Tham dự Khóa học Offline: ${input.courseTitle || 'Khóa đào tạo ATTP'}`,
      defaultMessage: `Trân trọng kính mời Quý học viên tham dự khóa đào tạo trực tiếp tại Hội trường FAST vào ${specificDateLabel}${scheduleStr}. Địa điểm: ${cleanVenue}. Vui lòng có mặt trước 20 phút để check-in đón tiếp.`
    };
  }

  return {
    isOffline: false,
    badgeLabel: 'Lịch học Trực tuyến Zoom HD',
    formatLabel: input.trainingTypeLabel || 'Online qua Zoom HD',
    specificDateLabel,
    timeWindowLabel,
    venueAddress: 'Phòng học trực tuyến Zoom HD',
    actionLink: input.link || 'https://zoom.us/j/84927002668',
    actionLabel: 'Vào phòng học Zoom',
    checkInTime:
      input.checkInTime ||
      'Mở liên kết Zoom trước giờ khai giảng 15 phút để kiểm tra âm thanh & điểm danh',
    hospitalityNote: 'Khuyến nghị kết nối Wi-Fi ổn định và chuẩn bị tai nghe trong giờ thực hành',
    conciergeHotline: '0927 002 668',
    checklist:
      Array.isArray(input.checklist) && input.checklist.length > 0
        ? input.checklist
        : [
            'Tham gia phòng Zoom trước 15 phút để kiểm tra loa, micro và đường truyền',
            'Đổi tên hiển thị Zoom theo cú pháp: Họ và tên - Số điện thoại',
            'Chuẩn bị sổ tay ghi chép và tài liệu thực hành trong quá trình học'
          ],
    defaultTitle: `Chuẩn bị vào học Zoom: ${input.courseTitle || 'Khóa đào tạo ATTP'}`,
    defaultMessage: `Phòng học Zoom HD cho khóa "${input.courseTitle || 'Khóa đào tạo'}" diễn ra vào ${specificDateLabel}${scheduleStr}. Vui lòng vào lớp trước 15 phút và đổi tên theo Họ tên - SĐT để điểm danh.`
  };
}

const STORAGE_KEY = 'fast_course_notifications';
const SEEN_COURSES_KEY = 'fast_seen_course_ids';
const DISMISSED_COURSES_KEY = 'fast_dismissed_course_ids';

// Do not seed dummy notifications so old courses do not appear unexpectedly
const SEED_NOTIFICATIONS: CourseNotification[] = [];

export function getStoredNotifications(): CourseNotification[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return [];
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

export function getDismissedCourseIds(): string[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(DISMISSED_COURSES_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    return [];
  }
}

export function isCourseDismissed(courseId: string): boolean {
  if (!courseId) return false;
  return getDismissedCourseIds().includes(courseId);
}

export function dismissCourseNotification(courseId: string) {
  if (typeof window === 'undefined' || !courseId) return;
  try {
    const dismissed = new Set(getDismissedCourseIds());
    dismissed.add(courseId);
    localStorage.setItem(DISMISSED_COURSES_KEY, JSON.stringify(Array.from(dismissed)));

    // Also remove any existing notifications for this course
    const current = getStoredNotifications();
    const updated = current.filter(n => n.courseId !== courseId);
    saveNotifications(updated);
  } catch (e) {}
}

export function deleteNotification(notificationId: string) {
  if (typeof window === 'undefined' || !notificationId) return;
  try {
    const current = getStoredNotifications();
    const target = current.find(n => n.id === notificationId);
    if (target?.courseId) {
      // If user dismisses/deletes a course notification, also dismiss that course permanently
      const dismissed = new Set(getDismissedCourseIds());
      dismissed.add(target.courseId);
      localStorage.setItem(DISMISSED_COURSES_KEY, JSON.stringify(Array.from(dismissed)));
    }
    const updated = current.filter(n => n.id !== notificationId);
    saveNotifications(updated);
  } catch (e) {}
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

export function addTrainingLinkNotification(params: {
  id?: string;
  userEmail?: string;
  courseId: string;
  courseTitle: string;
  courseImage?: string;
  link?: string;
  registrationId: string;
  startDate?: string;
  scheduleDetails?: string;
  venueAddress?: string;
  trainingType?: string;
  trainingTypeLabel?: string;
  title?: string;
  message?: string;
  checkInTime?: string;
  checklist?: string[];
}): CourseNotification {
  const normalizedEmail = params.userEmail?.toLowerCase().trim() || undefined;
  const notifId = params.id || `training_${params.registrationId || Date.now()}`;
  const prepMeta = getPreClassPreparationMeta({
    courseTitle: params.courseTitle,
    registrationId: params.registrationId,
    startDate: params.startDate,
    scheduleDetails: params.scheduleDetails,
    venueAddress: params.venueAddress,
    trainingType: params.trainingType,
    trainingTypeLabel: params.trainingTypeLabel,
    link: params.link,
    checkInTime: params.checkInTime,
    checklist: params.checklist,
  });

  const title = params.title || prepMeta.defaultTitle;
  const message = params.message || prepMeta.defaultMessage;

  const newNotif: CourseNotification = {
    id: notifId,
    courseId: params.courseId,
    courseTitle: params.courseTitle,
    title,
    courseCategory: prepMeta.isOffline ? 'Chuẩn bị vào học Offline' : 'Chuẩn bị vào học Zoom',
    courseImage: params.courseImage,
    type: 'training_link',
    message,
    timestamp: new Date().toISOString(),
    isRead: false,
    userEmail: normalizedEmail,
    link: prepMeta.actionLink,
    registrationId: params.registrationId,
    startDate: params.startDate,
    scheduleDetails: params.scheduleDetails,
    venueAddress: prepMeta.isOffline ? prepMeta.venueAddress : undefined,
    trainingType: params.trainingType || (prepMeta.isOffline ? 'direct' : 'zoom'),
    trainingTypeLabel: prepMeta.formatLabel,
    checkInTime: prepMeta.checkInTime,
    checklist: prepMeta.checklist,
  };

  const current = getStoredNotifications();
  const filtered = current.filter(n => n.id !== notifId);
  const updated = [newNotif, ...filtered].slice(0, 30);
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
