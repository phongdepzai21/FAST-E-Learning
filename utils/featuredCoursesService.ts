import { db } from '../firebase';
import { doc, getDoc, setDoc, onSnapshot } from 'firebase/firestore';
import { Course } from '../types';
import { DEFAULT_FEATURED_COURSE_IDS } from '../constants';

const STORAGE_KEY = 'fast_featured_course_ids';
const FIRESTORE_COLLECTION = 'featured_courses';
const FIRESTORE_DOC = 'config';

/**
 * Lấy danh sách ID 3 khóa học nổi bật từ bộ nhớ cục bộ (cache fallback)
 */
export function getCachedFeaturedCourseIds(): string[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed.slice(0, 3);
      }
    }
  } catch (e) {
    console.warn('[FeaturedCoursesService] Lỗi đọc cache local:', e);
  }
  return [...DEFAULT_FEATURED_COURSE_IDS];
}

/**
 * Tải danh sách 3 khóa học nổi bật từ Firestore / Server
 */
export async function fetchFeaturedCourseIds(): Promise<string[]> {
  try {
    // 1. Thử đọc từ Firestore
    const docRef = doc(db, FIRESTORE_COLLECTION, FIRESTORE_DOC);
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      const data = snap.data();
      if (Array.isArray(data?.featuredCourseIds) && data.featuredCourseIds.length > 0) {
        const ids = data.featuredCourseIds.slice(0, 3);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(ids));
        return ids;
      }
    }

    // 2. Thử đọc từ API backend
    const res = await fetch('/api/featured-courses');
    if (res.ok) {
      const apiData = await res.json();
      if (Array.isArray(apiData?.featuredCourseIds) && apiData.featuredCourseIds.length > 0) {
        const ids = apiData.featuredCourseIds.slice(0, 3);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(ids));
        return ids;
      }
    }
  } catch (err) {
    console.warn('[FeaturedCoursesService] Lỗi fetchFeaturedCourseIds:', err);
  }

  return getCachedFeaturedCourseIds();
}

/**
 * Lưu danh sách 3 khóa học nổi bật mới (tối đa 3 khóa)
 */
export async function saveFeaturedCourseIds(courseIds: string[], updatedBy?: string): Promise<{ success: boolean; error?: string }> {
  try {
    if (!Array.isArray(courseIds)) {
      return { success: false, error: 'Dữ liệu khóa học không hợp lệ' };
    }

    // Đảm bảo chỉ lấy tối đa 3 khóa không trùng lặp
    const uniqueIds = Array.from(new Set(courseIds.filter(id => typeof id === 'string' && id.trim().length > 0))).slice(0, 3);

    // 1. Cập nhật localStorage tức thì
    localStorage.setItem(STORAGE_KEY, JSON.stringify(uniqueIds));

    // 2. Phát event thông báo trong cùng tab & giữa các component
    window.dispatchEvent(new CustomEvent('featured_courses_updated', {
      detail: { featuredCourseIds: uniqueIds }
    }));

    // 3. Ghi vào Firestore doc
    const docRef = doc(db, FIRESTORE_COLLECTION, FIRESTORE_DOC);
    await setDoc(docRef, {
      featuredCourseIds: uniqueIds,
      updatedAt: new Date().toISOString(),
      updatedBy: updatedBy || 'admin'
    }, { merge: true });

    // 4. Đồng bộ lên Server API để lưu trữ lâu dài trên đĩa
    fetch('/api/featured-courses', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ featuredCourseIds: uniqueIds, updatedBy })
    }).catch(err => console.warn('[FeaturedCoursesService] Lưu API server cảnh báo:', err));

    return { success: true };
  } catch (err: any) {
    console.error('[FeaturedCoursesService] Lỗi lưu danh sách khóa học nổi bật:', err);
    return { success: false, error: err?.message || 'Không thể lưu cấu hình khóa học nổi bật' };
  }
}

/**
 * Lắng nghe thay đổi thời gian thực của cấu hình 3 khóa học nổi bật
 */
export function subscribeToFeaturedCourseIds(callback: (ids: string[]) => void): () => void {
  // Bắn dữ liệu cache trước
  callback(getCachedFeaturedCourseIds());

  // Lắng nghe Firestore Snapshot
  let unsubFirestore = () => {};
  try {
    const docRef = doc(db, FIRESTORE_COLLECTION, FIRESTORE_DOC);
    unsubFirestore = onSnapshot(docRef, (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        if (Array.isArray(data?.featuredCourseIds)) {
          const ids = data.featuredCourseIds.slice(0, 3);
          localStorage.setItem(STORAGE_KEY, JSON.stringify(ids));
          callback(ids);
        }
      }
    }, (err) => {
      console.warn('[FeaturedCoursesService] Lỗi snapshot Firestore:', err);
    });
  } catch (e) {
    console.warn('[FeaturedCoursesService] Không thể kết nối onSnapshot:', e);
  }

  // Lắng nghe window custom event
  const handleCustomEvent = (e: any) => {
    if (Array.isArray(e.detail?.featuredCourseIds)) {
      callback(e.detail.featuredCourseIds);
    }
  };

  // Lắng nghe storage event (đa tab)
  const handleStorageEvent = (e: StorageEvent) => {
    if (e.key === STORAGE_KEY && e.newValue) {
      try {
        const parsed = JSON.parse(e.newValue);
        if (Array.isArray(parsed)) callback(parsed.slice(0, 5));
      } catch {}
    }
  };

  window.addEventListener('featured_courses_updated', handleCustomEvent);
  window.addEventListener('storage', handleStorageEvent);

  return () => {
    unsubFirestore();
    window.removeEventListener('featured_courses_updated', handleCustomEvent);
    window.removeEventListener('storage', handleStorageEvent);
  };
}

/**
 * Trả về mảng Course đối tượng tương ứng với 5 khóa học nổi bật
 */
export function filterFeaturedCourses(allCourses: Course[], featuredIds?: string[]): Course[] {
  const ids = featuredIds && featuredIds.length > 0 ? featuredIds : getCachedFeaturedCourseIds();
  const courseMap = new Map<string, Course>();
  allCourses.forEach(c => {
    if (c && c.id) courseMap.set(c.id, c);
  });

  const result: Course[] = [];
  ids.forEach(id => {
    const found = courseMap.get(id);
    if (found) {
      result.push(found);
    }
  });

  // Nếu danh sách chưa đủ 5 khóa, bù từ danh sách chung
  if (result.length < 5) {
    for (const c of allCourses) {
      if (result.length >= 5) break;
      if (c && c.id && !ids.includes(c.id) && c.status !== 'draft' && c.status !== 'inactive' && !c.id.startsWith('combo-')) {
        result.push(c);
      }
    }
  }

  return result.slice(0, 5);
}
