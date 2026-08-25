import { doc, setDoc, getDoc } from 'firebase/firestore';
import { db } from '../firebase';

export interface LastLessonState {
  lastLessonIdx: number;
  lastLessonTitle?: string;
  lastAccessedAt?: string;
}

/**
 * Tự động lưu vị trí bài học cuối cùng vào Firestore và LocalStorage
 */
export async function saveLastAccessedLesson(
  courseId: string,
  lessonIdx: number,
  lessonTitle?: string,
  userEmail?: string | null
): Promise<void> {
  if (!courseId || lessonIdx < 0) return;

  const normalizedEmail = userEmail ? userEmail.trim().toLowerCase() : null;
  const nowIso = new Date().toISOString();

  // 1. Lưu tức thời vào LocalStorage (hỗ trợ offline và load tức thì)
  try {
    localStorage.setItem(`last_lesson_${courseId}`, String(lessonIdx));
    if (lessonTitle) {
      localStorage.setItem(`last_lesson_title_${courseId}`, lessonTitle);
    }
    localStorage.setItem(`last_lesson_time_${courseId}`, nowIso);

    if (normalizedEmail) {
      localStorage.setItem(`last_lesson_${courseId}_${normalizedEmail}`, String(lessonIdx));
      if (lessonTitle) {
        localStorage.setItem(`last_lesson_title_${courseId}_${normalizedEmail}`, lessonTitle);
      }
    }
  } catch (e) {
    console.warn('Không thể lưu last_lesson vào localStorage:', e);
  }

  // Phát event đồng bộ giữa các tabs và components
  try {
    window.dispatchEvent(
      new CustomEvent('lesson_accessed', {
        detail: { courseId, lessonIdx, lessonTitle, userEmail: normalizedEmail, timestamp: nowIso }
      })
    );
  } catch (e) {}

  // 2. Lưu bền vững vào Cloud Firestore nếu người dùng đã đăng nhập
  if (normalizedEmail) {
    try {
      const docRef = doc(db, 'users', normalizedEmail, 'purchased_courses', courseId);
      await setDoc(
        docRef,
        {
          lastLessonIdx: lessonIdx,
          lastLessonTitle: lessonTitle || '',
          lastAccessedAt: nowIso
        },
        { merge: true }
      );
    } catch (err) {
      console.warn('Lỗi lưu vị trí bài học lên Cloud Firestore:', err);
    }
  }
}

/**
 * Lấy vị trí bài học đã lưu từ LocalStorage (đồng bộ, không chờ mạng)
 */
export function getCachedLastLessonIdx(
  courseId: string,
  userEmail?: string | null,
  maxLessons?: number
): number {
  if (!courseId) return 0;
  const normalizedEmail = userEmail ? userEmail.trim().toLowerCase() : null;

  let stored: string | null = null;
  if (normalizedEmail) {
    stored = localStorage.getItem(`last_lesson_${courseId}_${normalizedEmail}`);
  }
  if (stored === null) {
    stored = localStorage.getItem(`last_lesson_${courseId}`);
  }

  if (stored !== null) {
    const parsed = parseInt(stored, 10);
    if (!isNaN(parsed) && parsed >= 0) {
      if (maxLessons !== undefined && maxLessons > 0) {
        return Math.min(parsed, maxLessons - 1);
      }
      return parsed;
    }
  }

  return 0;
}

/**
 * Lấy vị trí bài học cuối cùng từ Firestore (hoặc fallback LocalStorage)
 */
export async function fetchLastAccessedLesson(
  courseId: string,
  userEmail?: string | null,
  maxLessons?: number
): Promise<LastLessonState | null> {
  if (!courseId) return null;
  const normalizedEmail = userEmail ? userEmail.trim().toLowerCase() : null;

  // Thử đọc từ Firestore
  if (normalizedEmail) {
    try {
      const docRef = doc(db, 'users', normalizedEmail, 'purchased_courses', courseId);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        const data = docSnap.data();
        if (typeof data.lastLessonIdx === 'number' && data.lastLessonIdx >= 0) {
          let validIdx = data.lastLessonIdx;
          if (maxLessons !== undefined && maxLessons > 0) {
            validIdx = Math.min(validIdx, maxLessons - 1);
          }
          // Cập nhật lại cache cục bộ
          localStorage.setItem(`last_lesson_${courseId}`, String(validIdx));
          localStorage.setItem(`last_lesson_${courseId}_${normalizedEmail}`, String(validIdx));
          if (data.lastLessonTitle) {
            localStorage.setItem(`last_lesson_title_${courseId}`, data.lastLessonTitle);
          }

          return {
            lastLessonIdx: validIdx,
            lastLessonTitle: data.lastLessonTitle,
            lastAccessedAt: data.lastAccessedAt
          };
        }
      }
    } catch (err) {
      console.warn('Lỗi đọc lastLessonIdx từ Firestore:', err);
    }
  }

  // Fallback đọc LocalStorage
  const cachedIdx = getCachedLastLessonIdx(courseId, normalizedEmail, maxLessons);
  const cachedTitle = localStorage.getItem(`last_lesson_title_${courseId}`) || undefined;
  const cachedTime = localStorage.getItem(`last_lesson_time_${courseId}`) || undefined;

  return {
    lastLessonIdx: cachedIdx,
    lastLessonTitle: cachedTitle,
    lastAccessedAt: cachedTime
  };
}
