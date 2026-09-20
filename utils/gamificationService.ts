import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { BADGE_DEFINITIONS, UserGamificationData } from './gamification';

export function getTodayDateString(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function getYesterdayDateString(): string {
  const now = new Date();
  now.setDate(now.getDate() - 1);
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function calculateLevel(points: number): number {
  if (points <= 0) return 1;
  return Math.floor(Math.sqrt(points / 25)) + 1;
}

export function getLevelTitle(level: number): string {
  if (level >= 10) return 'Đại Tông Sư Tri Thức';
  if (level >= 7) return 'Chuyên Gia Lĩnh Vực';
  if (level >= 5) return 'Cao Thủ Học Thuật';
  if (level >= 3) return 'Học Viên Xuất Sắc';
  if (level >= 2) return 'Tân Binh Tiềm Năng';
  return 'Người Mới Bắt Đầu';
}

/**
 * Record daily activity and calculate streak with robust auto-sync
 */
export async function recordDailyLearningActivity(userEmail: string): Promise<UserGamificationData | null> {
  if (!userEmail) return null;
  const normalizedEmail = userEmail.toLowerCase().trim();
  const today = getTodayDateString();
  const yesterday = getYesterdayDateString();

  const localKey = `gamification_${normalizedEmail}`;
  let currentData: UserGamificationData = {
    streakDays: 1,
    lastActiveDate: today,
    totalLessonsCompleted: 0,
    completedCoursesCount: 0,
    totalNotesCreated: 0,
    unlockedBadgeIds: [],
    points: 0,
    level: 1,
    unlockedBadgeDates: {},
  };

  // 1. Try local cache
  try {
    const cached = localStorage.getItem(localKey);
    if (cached) {
      currentData = { ...currentData, ...JSON.parse(cached) };
    }
  } catch (e) {}

  // 2. Fetch authoritative remote Firestore data to prevent resetting streak across devices
  try {
    const docRef = doc(db, 'users', normalizedEmail, 'gamification', 'stats');
    const remoteSnap = await getDoc(docRef);
    if (remoteSnap.exists()) {
      const remoteData = remoteSnap.data() as UserGamificationData;
      // Merge smartly: keep highest values
      currentData = {
        ...currentData,
        ...remoteData,
        streakDays: Math.max(currentData.streakDays || 1, remoteData.streakDays || 1),
        lastActiveDate: remoteData.lastActiveDate || currentData.lastActiveDate || today,
        totalLessonsCompleted: Math.max(currentData.totalLessonsCompleted || 0, remoteData.totalLessonsCompleted || 0),
        completedCoursesCount: Math.max(currentData.completedCoursesCount || 0, remoteData.completedCoursesCount || 0),
        totalNotesCreated: Math.max(currentData.totalNotesCreated || 0, remoteData.totalNotesCreated || 0),
        unlockedBadgeIds: Array.from(new Set([...(currentData.unlockedBadgeIds || []), ...(remoteData.unlockedBadgeIds || [])])),
        unlockedBadgeDates: { ...(remoteData.unlockedBadgeDates || {}), ...(currentData.unlockedBadgeDates || {}) }
      };
    }
  } catch (err) {
    console.warn('Lỗi đọc Firestore gamification stats:', err);
  }

  // 3. Update streak logically
  if (currentData.lastActiveDate === today) {
    // Already logged today, maintain streak without false reset
    if (!currentData.streakDays || currentData.streakDays < 1) {
      currentData.streakDays = 1;
    }
  } else if (currentData.lastActiveDate === yesterday) {
    // Continued from yesterday! Increment streak
    currentData.streakDays = (currentData.streakDays || 0) + 1;
    currentData.lastActiveDate = today;
  } else if (!currentData.lastActiveDate) {
    // First time
    currentData.streakDays = 1;
    currentData.lastActiveDate = today;
  } else {
    // Check difference in calendar days to avoid timezone false breaks
    try {
      const lastDate = new Date(currentData.lastActiveDate);
      const currDate = new Date(today);
      const diffDays = Math.round((currDate.getTime() - lastDate.getTime()) / (1000 * 3600 * 24));
      if (diffDays <= 1) {
        currentData.streakDays = Math.max(1, currentData.streakDays || 1);
        currentData.lastActiveDate = today;
      } else {
        currentData.streakDays = 1;
        currentData.lastActiveDate = today;
      }
    } catch (e) {
      currentData.streakDays = 1;
      currentData.lastActiveDate = today;
    }
  }

  // Detect VIP status for badge evaluation
  let isVipUser = false;
  try {
    const rolesStr = localStorage.getItem(`user_roles_${normalizedEmail}`);
    if (rolesStr) {
      const roles = JSON.parse(rolesStr);
      if (roles.isVip) isVipUser = true;
    }
    if (localStorage.getItem(`user_is_vip_${normalizedEmail}`) === 'true') {
      isVipUser = true;
    }
    const coursesStr = localStorage.getItem(`user_courses_${normalizedEmail}`);
    if (coursesStr && (coursesStr.includes('khoa-vip') || coursesStr.includes('vip-lifetime-access'))) {
      isVipUser = true;
    }
  } catch (e) {}

  // 4. Calculate badges & level
  currentData = evaluateBadges(currentData, isVipUser);
  currentData.level = calculateLevel(currentData.points);

  // 5. Save to local storage & broadcast event
  localStorage.setItem(localKey, JSON.stringify(currentData));
  window.dispatchEvent(new CustomEvent('gamification_updated', { detail: currentData }));

  // 6. Sync to Firestore in background
  try {
    const docRef = doc(db, 'users', normalizedEmail, 'gamification', 'stats');
    await setDoc(docRef, currentData, { merge: true });
  } catch (err) {
    console.warn('Không thể lưu gamification lên Firestore:', err);
  }

  return currentData;
}

/**
 * Update lesson completion, note count, and courses completed
 */
export async function updateLearningMilestone(
  userEmail: string,
  updates: {
    incrementLessons?: number;
    completedCoursesCount?: number;
    totalNotesCreated?: number;
    isVip?: boolean;
  }
): Promise<{ newBadgesUnlocked: string[]; gamificationData: UserGamificationData }> {
  if (!userEmail) return { newBadgesUnlocked: [], gamificationData: {} as any };
  const normalizedEmail = userEmail.toLowerCase().trim();
  const localKey = `gamification_${normalizedEmail}`;

  let currentData: UserGamificationData = {
    streakDays: 1,
    lastActiveDate: getTodayDateString(),
    totalLessonsCompleted: 0,
    completedCoursesCount: 0,
    totalNotesCreated: 0,
    unlockedBadgeIds: [],
    points: 0,
    level: 1,
    unlockedBadgeDates: {},
  };

  try {
    const cached = localStorage.getItem(localKey);
    if (cached) {
      currentData = { ...currentData, ...JSON.parse(cached) };
    }
  } catch (e) {}

  if (typeof updates.incrementLessons === 'number' && updates.incrementLessons > 0) {
    currentData.totalLessonsCompleted = (currentData.totalLessonsCompleted || 0) + updates.incrementLessons;
  }
  if (typeof updates.completedCoursesCount === 'number') {
    currentData.completedCoursesCount = Math.max(currentData.completedCoursesCount || 0, updates.completedCoursesCount);
  }
  if (typeof updates.totalNotesCreated === 'number') {
    currentData.totalNotesCreated = Math.max(currentData.totalNotesCreated || 0, updates.totalNotesCreated);
  }

  const previousBadges = new Set(currentData.unlockedBadgeIds || []);
  currentData = evaluateBadges(currentData, updates.isVip || false);
  currentData.level = calculateLevel(currentData.points);

  const newlyUnlocked = (currentData.unlockedBadgeIds || []).filter(id => !previousBadges.has(id));

  // Save to local
  localStorage.setItem(localKey, JSON.stringify(currentData));
  window.dispatchEvent(new CustomEvent('gamification_updated', { detail: currentData }));

  // Save to Firestore
  try {
    const docRef = doc(db, 'users', normalizedEmail, 'gamification', 'stats');
    await setDoc(docRef, currentData, { merge: true });
  } catch (err) {
    console.warn('Lỗi đồng bộ Firestore gamification:', err);
  }

  return { newBadgesUnlocked: newlyUnlocked, gamificationData: currentData };
}

/**
 * Check criteria for all badges
 */
export function evaluateBadges(data: UserGamificationData, isVip: boolean): UserGamificationData {
  const unlocked = new Set(data.unlockedBadgeIds || []);
  const dates = { ...(data.unlockedBadgeDates || {}) };
  let points = 0;

  const checkAndUnlock = (badgeId: string, condition: boolean) => {
    if (condition) {
      if (!unlocked.has(badgeId)) {
        unlocked.add(badgeId);
        dates[badgeId] = new Date().toISOString();
      }
    }
  };

  // 1. First step
  checkAndUnlock('first-step', (data.totalLessonsCompleted || 0) >= 1 || unlocked.has('first-step'));

  // 2. Ten lessons
  checkAndUnlock('ten-lessons-completed', (data.totalLessonsCompleted || 0) >= 10 || unlocked.has('ten-lessons-completed'));

  // 3. First course finished
  checkAndUnlock('first-course-finished', (data.completedCoursesCount || 0) >= 1 || unlocked.has('first-course-finished'));

  // 4. Master of knowledge (3 courses)
  checkAndUnlock('master-knowledge', (data.completedCoursesCount || 0) >= 3 || unlocked.has('master-knowledge'));

  // 5. Streaks
  checkAndUnlock('streak-3-days', (data.streakDays || 0) >= 3 || unlocked.has('streak-3-days'));
  checkAndUnlock('streak-7-days', (data.streakDays || 0) >= 7 || unlocked.has('streak-7-days'));
  checkAndUnlock('streak-30-days', (data.streakDays || 0) >= 30 || unlocked.has('streak-30-days'));

  // 6. Notes
  checkAndUnlock('active-notetaker', (data.totalNotesCreated || 0) >= 5 || unlocked.has('active-notetaker'));
  checkAndUnlock('pro-note-master', (data.totalNotesCreated || 0) >= 20 || unlocked.has('pro-note-master'));

  // 7. VIP
  checkAndUnlock('vip-scholar', isVip || unlocked.has('vip-scholar'));

  // Compute total points from all unlocked badges
  BADGE_DEFINITIONS.forEach(badge => {
    if (unlocked.has(badge.id)) {
      points += badge.points;
    }
  });

  return {
    ...data,
    unlockedBadgeIds: Array.from(unlocked),
    unlockedBadgeDates: dates,
    points: points,
    level: calculateLevel(points)
  };
}
