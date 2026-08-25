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
 * Record daily activity and calculate streak
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

  try {
    const cached = localStorage.getItem(localKey);
    if (cached) {
      currentData = { ...currentData, ...JSON.parse(cached) };
    }
  } catch (e) {}

  // Update streak
  if (currentData.lastActiveDate === today) {
    // Already logged today, keep streak
  } else if (currentData.lastActiveDate === yesterday) {
    // Continued from yesterday! Increment streak
    currentData.streakDays += 1;
    currentData.lastActiveDate = today;
  } else {
    // Streak broken, reset to 1
    currentData.streakDays = 1;
    currentData.lastActiveDate = today;
  }

  // Calculate badges
  currentData = evaluateBadges(currentData, false);
  currentData.level = calculateLevel(currentData.points);

  // Save to local storage
  localStorage.setItem(localKey, JSON.stringify(currentData));

  // Sync to Firestore
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
  checkAndUnlock('first-step', (data.totalLessonsCompleted || 0) >= 1);

  // 2. Ten lessons
  checkAndUnlock('ten-lessons-completed', (data.totalLessonsCompleted || 0) >= 10);

  // 3. First course finished
  checkAndUnlock('first-course-finished', (data.completedCoursesCount || 0) >= 1);

  // 4. Master of knowledge (3 courses)
  checkAndUnlock('master-knowledge', (data.completedCoursesCount || 0) >= 3);

  // 5. Streaks
  checkAndUnlock('streak-3-days', (data.streakDays || 0) >= 3);
  checkAndUnlock('streak-7-days', (data.streakDays || 0) >= 7);
  checkAndUnlock('streak-30-days', (data.streakDays || 0) >= 30);

  // 6. Notes
  checkAndUnlock('active-notetaker', (data.totalNotesCreated || 0) >= 5);
  checkAndUnlock('pro-note-master', (data.totalNotesCreated || 0) >= 20);

  // 7. VIP
  checkAndUnlock('vip-scholar', isVip);

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
