export interface BadgeDefinition {
  id: string;
  title: string;
  description: string;
  icon: string;
  category: 'progress' | 'streak' | 'engagement' | 'mastery' | 'special';
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
  criteriaText: string;
  points: number;
}

export interface UserGamificationData {
  streakDays: number;
  lastActiveDate: string; // YYYY-MM-DD
  totalLessonsCompleted: number;
  completedCoursesCount: number;
  totalNotesCreated: number;
  unlockedBadgeIds: string[];
  points: number;
  level: number;
  unlockedBadgeDates?: Record<string, string>; // badgeId -> ISO Date
}

export const BADGE_DEFINITIONS: BadgeDefinition[] = [
  {
    id: 'first-course-finished',
    title: 'Khởi Đầu Vinh Quang',
    description: 'Hoàn thành 100% khóa học đầu tiên trên hệ thống FAST.',
    icon: '🎓',
    category: 'progress',
    rarity: 'rare',
    criteriaText: 'Hoàn thành trọn vẹn 1 khóa học',
    points: 100,
  },
  {
    id: 'streak-7-days',
    title: 'Chiến Binh 7 Ngày',
    description: 'Duy trì chuỗi học tập liên tục trong 7 ngày không gián đoạn.',
    icon: '🔥',
    category: 'streak',
    rarity: 'epic',
    criteriaText: 'Chuỗi học tập đạt 7 ngày liên tiếp',
    points: 150,
  },
  {
    id: 'streak-3-days',
    title: 'Đà Học Tinh Nhuệ',
    description: 'Duy trì chuỗi học tập liên tục trong 3 ngày.',
    icon: '⚡',
    category: 'streak',
    rarity: 'common',
    criteriaText: 'Chuỗi học tập đạt 3 ngày liên tiếp',
    points: 50,
  },
  {
    id: 'streak-30-days',
    title: 'Huyền Thoại Bền Bỉ',
    description: 'Duy trì chuỗi học tập liên tục trong 30 ngày.',
    icon: '👑',
    category: 'streak',
    rarity: 'legendary',
    criteriaText: 'Chuỗi học tập đạt 30 ngày liên tiếp',
    points: 500,
  },
  {
    id: 'first-step',
    title: 'Bước Chân Đầu Tiên',
    description: 'Hoàn thành bài giảng video đầu tiên.',
    icon: '🌱',
    category: 'progress',
    rarity: 'common',
    criteriaText: 'Hoàn thành 1 bài giảng',
    points: 20,
  },
  {
    id: 'ten-lessons-completed',
    title: 'Người Chăm Chỉ',
    description: 'Đã hoàn thành 10 bài giảng video khác nhau.',
    icon: '📚',
    category: 'progress',
    rarity: 'rare',
    criteriaText: 'Hoàn thành 10 bài học',
    points: 80,
  },
  {
    id: 'master-knowledge',
    title: 'Bậc Thầy Kiến Thức',
    description: 'Hoàn thành từ 3 khóa học chuyên sâu trở lên.',
    icon: '🏆',
    category: 'mastery',
    rarity: 'legendary',
    criteriaText: 'Hoàn thành 3 khóa học',
    points: 300,
  },
  {
    id: 'active-notetaker',
    title: 'Ký Họa Tri Thức',
    description: 'Lưu trữ từ 5 ghi chú cá nhân hữu ích trong phòng học.',
    icon: '📝',
    category: 'engagement',
    rarity: 'common',
    criteriaText: 'Tạo từ 5 ghi chú cá nhân',
    points: 40,
  },
  {
    id: 'pro-note-master',
    title: 'Kho Sách Di Động',
    description: 'Tạo từ 20 ghi chú kiến thức chi tiết cho các bài học.',
    icon: '✍️',
    category: 'engagement',
    rarity: 'rare',
    criteriaText: 'Tạo từ 20 ghi chú bài học',
    points: 120,
  },
  {
    id: 'vip-scholar',
    title: 'Học Giả VIP',
    description: 'Gia nhập hàng ngũ học viên đặc quyền VIP Trọn Đời.',
    icon: '⭐',
    category: 'special',
    rarity: 'epic',
    criteriaText: 'Sở hữu tài khoản VIP Trọn Đời',
    points: 200,
  }
];

export const RARITY_STYLES = {
  common: {
    label: 'Phổ biến',
    border: 'border-slate-300 dark:border-slate-700',
    bg: 'bg-slate-50 dark:bg-slate-800/60',
    badgeBg: 'bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-200',
    glow: 'hover:shadow-slate-300/50',
    color: 'text-slate-600 dark:text-slate-300',
  },
  rare: {
    label: 'Hiếm',
    border: 'border-blue-300 dark:border-blue-600/40',
    bg: 'bg-gradient-to-br from-blue-50/80 to-sky-50/50 dark:from-blue-950/40 dark:to-slate-900/50',
    badgeBg: 'bg-blue-100 text-blue-800 dark:bg-blue-900/60 dark:text-blue-300',
    glow: 'hover:shadow-blue-500/20',
    color: 'text-blue-600 dark:text-blue-400',
  },
  epic: {
    label: 'Sử thi',
    border: 'border-purple-300 dark:border-purple-500/40',
    bg: 'bg-gradient-to-br from-purple-50/80 to-pink-50/50 dark:from-purple-950/40 dark:to-slate-900/50',
    badgeBg: 'bg-purple-100 text-purple-800 dark:bg-purple-900/60 dark:text-purple-300',
    glow: 'hover:shadow-purple-500/25',
    color: 'text-purple-600 dark:text-purple-400',
  },
  legendary: {
    label: 'Huyền thoại',
    border: 'border-amber-400 dark:border-amber-500/50',
    bg: 'bg-gradient-to-br from-amber-50/90 to-yellow-50/60 dark:from-amber-950/40 dark:to-slate-900/60',
    badgeBg: 'bg-gradient-to-r from-amber-500 to-yellow-500 text-slate-950 font-black',
    glow: 'hover:shadow-amber-500/30 ring-1 ring-amber-400/40',
    color: 'text-amber-600 dark:text-amber-400',
  }
};
