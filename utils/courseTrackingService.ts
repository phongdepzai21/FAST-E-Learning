/**
 * Course View History Tracking Service
 * Tracks which courses the user has explored/viewed across the application.
 */

export interface ViewedCourseRecord {
  id: string;
  title: string;
  image?: string;
  price?: string;
  category?: string;
  description?: string;
  viewedAt: string;
  viewCount?: number;
}

const STORAGE_KEY_PREFIX = 'fast_viewed_courses_';
const GLOBAL_STORAGE_KEY = 'fast_viewed_courses_global_v1';

export const trackCourseView = (course: {
  id: string;
  title: string;
  image?: string;
  price?: string;
  category?: string;
  description?: string;
}, userEmail?: string | null) => {
  if (!course || !course.id) return;

  const nowIso = new Date().toISOString();
  const normalizedEmail = userEmail ? userEmail.trim().toLowerCase() : null;
  const userKey = normalizedEmail ? `${STORAGE_KEY_PREFIX}${normalizedEmail}` : GLOBAL_STORAGE_KEY;

  const saveToKey = (key: string) => {
    try {
      const raw = localStorage.getItem(key);
      let list: ViewedCourseRecord[] = raw ? JSON.parse(raw) : [];
      if (!Array.isArray(list)) list = [];

      const existingIndex = list.findIndex(item => item.id === course.id);
      if (existingIndex !== -1) {
        const currentCount = list[existingIndex].viewCount || 1;
        list[existingIndex] = {
          ...list[existingIndex],
          title: course.title || list[existingIndex].title,
          image: course.image || list[existingIndex].image,
          price: course.price || list[existingIndex].price,
          category: course.category || list[existingIndex].category,
          description: course.description || list[existingIndex].description,
          viewedAt: nowIso,
          viewCount: currentCount + 1,
        };
        // Move to front
        const [item] = list.splice(existingIndex, 1);
        list.unshift(item);
      } else {
        list.unshift({
          id: course.id,
          title: course.title,
          image: course.image,
          price: course.price,
          category: course.category,
          description: course.description,
          viewedAt: nowIso,
          viewCount: 1,
        });
      }

      // Keep max 50 items
      list = list.slice(0, 50);
      localStorage.setItem(key, JSON.stringify(list));
    } catch (e) {
      console.warn('[CourseTracking] Error saving view:', e);
    }
  };

  saveToKey(userKey);
  if (normalizedEmail) {
    saveToKey(GLOBAL_STORAGE_KEY);
  }

  // Dispatch custom event so Account or other components update live
  window.dispatchEvent(new CustomEvent('course_viewed', {
    detail: { courseId: course.id, userEmail: normalizedEmail, viewedAt: nowIso }
  }));
};

export const getViewedCourses = (userEmail?: string | null): ViewedCourseRecord[] => {
  const normalizedEmail = userEmail ? userEmail.trim().toLowerCase() : null;
  const userKey = normalizedEmail ? `${STORAGE_KEY_PREFIX}${normalizedEmail}` : GLOBAL_STORAGE_KEY;

  try {
    const raw = localStorage.getItem(userKey);
    if (raw) {
      const list = JSON.parse(raw);
      if (Array.isArray(list) && list.length > 0) return list;
    }
    // Fallback to global if user key empty
    const globalRaw = localStorage.getItem(GLOBAL_STORAGE_KEY);
    if (globalRaw) {
      const gList = JSON.parse(globalRaw);
      if (Array.isArray(gList)) return gList;
    }
  } catch (e) {
    console.warn('[CourseTracking] Error reading view history:', e);
  }
  return [];
};

export const clearViewedCourses = (userEmail?: string | null): void => {
  const normalizedEmail = userEmail ? userEmail.trim().toLowerCase() : null;
  const userKey = normalizedEmail ? `${STORAGE_KEY_PREFIX}${normalizedEmail}` : GLOBAL_STORAGE_KEY;

  try {
    localStorage.removeItem(userKey);
    if (!normalizedEmail) {
      localStorage.removeItem(GLOBAL_STORAGE_KEY);
    }
  } catch (e) {}

  window.dispatchEvent(new CustomEvent('course_viewed', { detail: { cleared: true } }));
};
