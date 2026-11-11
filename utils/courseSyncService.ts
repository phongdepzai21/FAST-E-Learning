import { Course } from '../types';
import { db } from '../firebase';
import { collection, onSnapshot, doc, setDoc, deleteDoc, getDocs } from 'firebase/firestore';

// BroadcastChannel for instant (0ms) same-browser multi-tab synchronization
const CHANNEL_NAME = 'fast_elearning_courses_sync';
let broadcastChannel: BroadcastChannel | null = null;
try {
  if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
    broadcastChannel = new BroadcastChannel(CHANNEL_NAME);
  }
} catch (e) {
  console.warn('BroadcastChannel not supported in this environment');
}

let eventSource: EventSource | null = null;
let isInitialized = false;
let reconnectTimer: any = null;

// Track active Firestore unsubscribe functions to allow clean restarts
let unsubCourses: (() => void) | null = null;
let unsubCombos: (() => void) | null = null;
let unsubCustomCombos: (() => void) | null = null;
let unsubSyncControlCourses: (() => void) | null = null;
let unsubSyncControlCombos: (() => void) | null = null;
let unsubFeaturedCourses: (() => void) | null = null;

// Helper to purge deleted course IDs from all local caches
export function applyDeletedCourses(deletedIds: string[]) {
  if (!Array.isArray(deletedIds) || deletedIds.length === 0) return;
  try {
    const delStr = localStorage.getItem('deleted_course_ids');
    const existingDel: string[] = delStr ? JSON.parse(delStr) : [];
    const mergedDel = Array.from(new Set([...existingDel, ...deletedIds]));
    localStorage.setItem('deleted_course_ids', JSON.stringify(mergedDel));

    ['local_custom_courses', 'server_custom_courses', 'cached_firestore_courses'].forEach(key => {
      const raw = localStorage.getItem(key);
      if (raw) {
        const list = JSON.parse(raw);
        if (Array.isArray(list)) {
          const cleaned = list.filter((c: any) => c && c.id && !mergedDel.includes(c.id));
          localStorage.setItem(key, JSON.stringify(cleaned));
        }
      }
    });
  } catch (err) {
    console.warn('Error purging deleted courses:', err);
  }
}

/**
 * Apply updated courses into localStorage safely with accurate merge
 */
function updateStoredCourses(courses: Course[], deletedIds?: string[]) {
  if (Array.isArray(deletedIds) && deletedIds.length > 0) {
    applyDeletedCourses(deletedIds);
  }

  if (!Array.isArray(courses)) return;
  try {
    const delStr = localStorage.getItem('deleted_course_ids');
    const delList: string[] = delStr ? JSON.parse(delStr) : [];
    const delSet = new Set<string>(delList);

    const validCourses = courses.filter(c => c && c.id && !delSet.has(c.id));
    localStorage.setItem('server_custom_courses', JSON.stringify(validCourses));
    localStorage.setItem('cached_firestore_courses', JSON.stringify(validCourses));

    const localStr = localStorage.getItem('local_custom_courses');
    let localList: Course[] = [];
    if (localStr) {
      try {
        localList = JSON.parse(localStr);
        if (!Array.isArray(localList)) localList = [];
      } catch (e) {
        localList = [];
      }
    }

    const mergedMap = new Map<string, Course>();
    localList.forEach(c => {
      if (c && c.id && !delSet.has(c.id)) mergedMap.set(c.id, c);
    });

    validCourses.forEach(c => {
      if (c && c.id && !delSet.has(c.id)) {
        const existing = mergedMap.get(c.id);
        mergedMap.set(c.id, existing ? { ...existing, ...c } : c);
      }
    });

    localStorage.setItem('local_custom_courses', JSON.stringify(Array.from(mergedMap.values())));
  } catch (err) {
    console.warn('Error saving courses to local storage:', err);
  }
}

/**
 * Apply deleted combo IDs to localStorage
 */
export function applyDeletedCombos(deletedIds: string[]) {
  try {
    const delStr = localStorage.getItem('deleted_combo_ids');
    let delList: string[] = ['combo-vip', 'khoa-vip'];
    if (delStr) {
      const parsed = JSON.parse(delStr);
      if (Array.isArray(parsed)) delList = Array.from(new Set([...delList, ...parsed]));
    }
    if (Array.isArray(deletedIds)) {
      deletedIds.forEach((id) => {
        if (id && !delList.includes(id)) delList.push(id);
      });
    }
    localStorage.setItem('deleted_combo_ids', JSON.stringify(delList));
  } catch (e) {}
}

/**
 * Detailed comparator helper between existing and incoming combo
 */
function getComboDiff(oldCombo: any, newCombo: any): string[] {
  const diffs: string[] = [];
  if (!oldCombo) return ['Mới tạo hoàn toàn'];
  if (oldCombo.title !== newCombo.title) diffs.push(`Tên: "${oldCombo.title}" -> "${newCombo.title}"`);
  if (oldCombo.price !== newCombo.price) diffs.push(`Giá: "${oldCombo.price}" -> "${newCombo.price}"`);
  if (oldCombo.originalPrice !== newCombo.originalPrice) diffs.push(`Giá gốc: "${oldCombo.originalPrice}" -> "${newCombo.originalPrice}"`);
  if (oldCombo.savings !== newCombo.savings) diffs.push(`Tiết kiệm: "${oldCombo.savings}" -> "${newCombo.savings}"`);
  if (oldCombo.status !== newCombo.status) diffs.push(`Trạng thái: "${oldCombo.status}" -> "${newCombo.status}"`);

  const oldCourseIds = Array.isArray(oldCombo.courseIds) ? oldCombo.courseIds : [];
  const newCourseIds = Array.isArray(newCombo.courseIds) ? newCombo.courseIds : [];
  if (JSON.stringify(oldCourseIds.slice().sort()) !== JSON.stringify(newCourseIds.slice().sort())) {
    diffs.push(`Khóa liên kết: [${oldCourseIds.length} khóa] -> [${newCourseIds.length} khóa]`);
  }

  const oldBenefits = Array.isArray(oldCombo.benefits) ? oldCombo.benefits : [];
  const newBenefits = Array.isArray(newCombo.benefits) ? newCombo.benefits : [];
  if (JSON.stringify(oldBenefits) !== JSON.stringify(newBenefits)) {
    diffs.push(`Quyền lợi: [${oldBenefits.length} mục] -> [${newBenefits.length} mục]`);
  }

  if (oldCombo.image !== newCombo.image) diffs.push('Ảnh bìa đã đổi');
  if (oldCombo.description !== newCombo.description) diffs.push('Mô tả đã cập nhật');
  if (oldCombo.updatedAt !== newCombo.updatedAt) diffs.push(`Thời gian: ${oldCombo.updatedAt} -> ${newCombo.updatedAt}`);

  return diffs;
}

/**
 * Apply updated combos into localStorage safely with accurate old vs new comparison and detailed logging
 */
function updateStoredCombos(incomingCombos: any[], deletedIds?: string[], sourceName = 'Unknown') {
  if (!Array.isArray(incomingCombos)) return;
  try {
    let delList: string[] = ['combo-vip', 'khoa-vip'];
    try {
      const delStr = localStorage.getItem('deleted_combo_ids');
      if (delStr) {
        const parsed = JSON.parse(delStr);
        if (Array.isArray(parsed)) delList = Array.from(new Set([...delList, ...parsed]));
      }
    } catch (e) {}

    if (Array.isArray(deletedIds)) {
      deletedIds.forEach((id) => {
        if (id && !delList.includes(id)) delList.push(id);
      });
    }
    localStorage.setItem('deleted_combo_ids', JSON.stringify(delList));
    const delSet = new Set<string>(delList);

    // Read existing cached combos
    let existingList: any[] = [];
    try {
      const cached = localStorage.getItem('combo_cache_all');
      if (cached) existingList = JSON.parse(cached);
    } catch (e) {}

    const comboMap = new Map<string, any>();

    // 1. Put existing custom combos into Map
    if (Array.isArray(existingList)) {
      existingList.forEach((c) => {
        if (c && c.id && !delSet.has(c.id) && c.id !== 'combo-vip' && c.id !== 'khoa-vip') {
          comboMap.set(c.id, c);
        }
      });
    }

    let newlyAddedCount = 0;
    let modifiedCount = 0;
    let unchangedCount = 0;

    console.groupCollapsed(`[Firestore Sync Debug] [Snapshot Comparison] Nguồn: ${sourceName} (${new Date().toLocaleTimeString('vi-VN')})`);
    console.log(`[Firestore Sync Debug] Hiện tại trong cache: ${comboMap.size} gói | Nhận từ snapshot: ${incomingCombos.length} gói`);

    // 2. Overlay incoming combos with accurate field-level comparison
    incomingCombos.forEach((c) => {
      if (!c || !c.id || c.id === 'combo-vip' || c.id === 'khoa-vip') return;

      // If combo is present in live snapshot, ensure it is not blocked by stale deleted list
      if (delSet.has(c.id) && (!deletedIds || !deletedIds.includes(c.id))) {
        delSet.delete(c.id);
        delList = delList.filter(id => id !== c.id);
        localStorage.setItem('deleted_combo_ids', JSON.stringify(delList));
      }

      if (delSet.has(c.id)) return;

      const prev = comboMap.get(c.id);
      const diffs = getComboDiff(prev, c);

      if (!prev) {
        newlyAddedCount++;
        console.log(`%c[Firestore Sync Debug] + [MỚI] ${c.id}: "${c.title}" - ${c.price} [${c.status || 'active'}]`, 'color: #10b981; font-weight: bold;');
        comboMap.set(c.id, c);
      } else if (diffs.length > 0) {
        modifiedCount++;
        console.log(`%c[Firestore Sync Debug] ~ [CẬP NHẬT] ${c.id}: ${diffs.join(' | ')}`, 'color: #0284c7; font-weight: bold;');
        comboMap.set(c.id, { ...prev, ...c, updatedAt: c.updatedAt || new Date().toISOString() });
      } else {
        unchangedCount++;
        console.log(`[Firestore Sync Debug] = [KHÔNG ĐỔI] ${c.id} - Dữ liệu khớp 100%`);
      }
    });

    console.log(`[Firestore Sync Debug] Tổng kết: +${newlyAddedCount} mới, ~${modifiedCount} sửa đổi, =${unchangedCount} trùng khớp.`);
    console.groupEnd();

    const merged = Array.from(comboMap.values());
    localStorage.setItem('combo_cache_all', JSON.stringify(merged));
    localStorage.setItem('fast_custom_combos_backup', JSON.stringify(merged));
  } catch (err) {
    console.warn('[Firestore Sync Debug] Lỗi khi lưu combo vào local storage:', err);
  }
}

/**
 * Fetch latest combos directly from backend server (used for on-demand sync)
 */
export async function fetchLatestCombosFromServer(): Promise<any[]> {
  try {
    const res = await fetch('/api/combos');
    if (!res.ok) return [];
    const data = await res.json();
    if (data && Array.isArray(data.deletedComboIds) && data.deletedComboIds.length > 0) {
      applyDeletedCombos(data.deletedComboIds);
    }
    if (data && Array.isArray(data.combos)) {
      updateStoredCombos(data.combos, data.deletedComboIds, 'Server API');
      window.dispatchEvent(new CustomEvent('combos_updated', { detail: { action: 'poll', combos: data.combos, deletedComboIds: data.deletedComboIds } }));
      return data.combos;
    }
  } catch (e) {
    // Silent fallback
  }
  return [];
}

/**
 * Fetch latest courses directly from backend server (used for on-demand sync)
 */
export async function fetchLatestCoursesFromServer(): Promise<Course[]> {
  try {
    const res = await fetch('/api/courses');
    if (!res.ok) return [];
    const data = await res.json();
    if (data && Array.isArray(data.deletedCourseIds) && data.deletedCourseIds.length > 0) {
      applyDeletedCourses(data.deletedCourseIds);
    }
    if (data && Array.isArray(data.courses) && data.courses.length > 0) {
      updateStoredCourses(data.courses, data.deletedCourseIds);
      window.dispatchEvent(new CustomEvent('courses_updated', { detail: { action: 'poll', courses: data.courses, deletedCourseIds: data.deletedCourseIds } }));
      return data.courses;
    }
  } catch (e) {
    // Silent fallback
  }
  return [];
}

/**
 * Trigger an instant complete refresh from Firestore (courses + combos)
 */
export async function triggerManualFirestoreSync() {
  console.log('[Firestore Sync Debug] Bắt đầu đồng bộ thủ công từ Firestore...');
  try {
    const [coursesSnap, combosSnap, customCombosSnap] = await Promise.all([
      getDocs(collection(db, 'courses')),
      getDocs(collection(db, 'combos')),
      getDocs(collection(db, 'customCombos'))
    ]);

    const fsCourses: Course[] = [];
    coursesSnap.forEach(docSnap => {
      fsCourses.push({ id: docSnap.id, ...docSnap.data() } as Course);
    });
    if (fsCourses.length > 0) {
      updateStoredCourses(fsCourses);
      window.dispatchEvent(new CustomEvent('courses_updated', { detail: { action: 'manual_sync', courses: fsCourses } }));
    }

    const fsCombos: any[] = [];
    combosSnap.forEach(docSnap => fsCombos.push({ id: docSnap.id, ...docSnap.data() }));
    customCombosSnap.forEach(docSnap => fsCombos.push({ id: docSnap.id, ...docSnap.data() }));
    if (fsCombos.length > 0) {
      updateStoredCombos(fsCombos, undefined, 'Manual Firestore Read');
      window.dispatchEvent(new CustomEvent('combos_updated', { detail: { action: 'manual_sync', combos: fsCombos } }));
    }

    console.log(`[Firestore Sync Debug] Hoàn tất đồng bộ thủ công: ${fsCourses.length} khóa học, ${fsCombos.length} combo.`);
  } catch (err) {
    console.warn('[Firestore Sync Debug] Lỗi khi thực hiện đồng bộ thủ công từ Firestore:', err);
  }
}

/**
 * Initialize cross-tab, cross-account, and cross-device real-time sync via Firestore & SSE
 */
export function initCourseSyncService() {
  if (isInitialized || typeof window === 'undefined') return;
  isInitialized = true;

  console.log('%c[Firestore Sync Engine] Khởi động hệ thống đồng bộ thời gian thực đa thiết bị...', 'color: #007c76; font-weight: bold;');

  // 1. Listen on BroadcastChannel for instant sync across tabs in the same browser
  if (broadcastChannel) {
    broadcastChannel.onmessage = (event) => {
      const data = event.data;
      if (data && data.type === 'courses_updated') {
        if (data.deletedCourseIds && Array.isArray(data.deletedCourseIds)) {
          applyDeletedCourses(data.deletedCourseIds);
        }
        if (data.courses && Array.isArray(data.courses)) {
          updateStoredCourses(data.courses, data.deletedCourseIds);
        } else if (data.action === 'status' && data.courseId && data.status) {
          try {
            ['local_custom_courses', 'server_custom_courses', 'cached_firestore_courses'].forEach(key => {
              const str = localStorage.getItem(key);
              if (str) {
                const list = JSON.parse(str);
                if (Array.isArray(list)) {
                  const idx = list.findIndex((c: any) => c.id === data.courseId);
                  if (idx >= 0) {
                    list[idx] = { ...list[idx], status: data.status, updatedAt: new Date().toISOString() };
                    localStorage.setItem(key, JSON.stringify(list));
                  }
                }
              }
            });
          } catch (e) {}
        }
        window.dispatchEvent(new CustomEvent('courses_updated', { detail: data }));
      } else if (data && data.type === 'combos_updated') {
        if (data.deletedComboIds && Array.isArray(data.deletedComboIds)) {
          applyDeletedCombos(data.deletedComboIds);
        }
        if (data.combos && Array.isArray(data.combos)) {
          updateStoredCombos(data.combos, data.deletedComboIds, 'BroadcastChannel');
        }
        window.dispatchEvent(new CustomEvent('combos_updated', { detail: data }));
      }
    };
  }

  // 2. Hydrate initially from Firestore & Server in parallel
  triggerManualFirestoreSync();
  fetchLatestCoursesFromServer();
  fetchLatestCombosFromServer();

  // 3. ATTACH FULL REAL-TIME FIRESTORE SNAPSHOT LISTENERS
  // 3A. Firestore Collection: 'courses' (Cross-device, cross-machine live course sync)
  try {
    unsubCourses = onSnapshot(collection(db, 'courses'), (snapshot) => {
      const fsCourses: Course[] = [];
      const removedIds: string[] = [];

      snapshot.docChanges().forEach((change) => {
        const docId = change.doc.id;
        const data = change.doc.data() as Course;

        if (change.type === 'added') {
          console.log(`%c[Firestore Sync Debug] [courses + THÊM MỚI] ID: ${docId}`, 'color: #10b981; font-weight: bold;', {
            title: data.title,
            price: data.price,
            status: data.status,
            updatedAt: data.updatedAt
          });
        } else if (change.type === 'modified') {
          console.log(`%c[Firestore Sync Debug] [courses ~ CẬP NHẬT] ID: ${docId}`, 'color: #0284c7; font-weight: bold;', {
            title: data.title,
            price: data.price,
            status: data.status,
            updatedAt: data.updatedAt
          });
        } else if (change.type === 'removed') {
          console.log(`%c[Firestore Sync Debug] [courses - ĐÃ XÓA] ID: ${docId}`, 'color: #ef4444; font-weight: bold;');
          removedIds.push(docId);
        }
      });

      if (removedIds.length > 0) {
        applyDeletedCourses(removedIds);
      }

      snapshot.forEach((docSnap) => {
        fsCourses.push({ id: docSnap.id, ...docSnap.data() } as Course);
      });

      console.log(`[Firestore Sync Debug] Đã nhận snapshot courses từ Firestore (${fsCourses.length} khóa).`);
      updateStoredCourses(fsCourses, removedIds);
      window.dispatchEvent(new CustomEvent('courses_updated', {
        detail: { action: 'firestore_snapshot', courses: fsCourses, removedIds }
      }));
    }, (err) => {
      console.warn('[Firestore Sync Debug] Lỗi kết nối Firestore collection "courses":', err);
    });
  } catch (err) {
    console.warn('[Firestore Sync Debug] Không thể đính kèm listener courses:', err);
  }

  // 3B. Firestore Collection: 'combos' and 'customCombos' (Cross-device live combo sync)
  try {
    const handleComboSnapshot = (snapshot: any, sourceName: string) => {
      const fsCombos: any[] = [];
      const removedIds: string[] = [];

      snapshot.docChanges().forEach((change: any) => {
        const docId = change.doc.id;
        const data = change.doc.data();
        if (change.type === 'added') {
          console.log(`%c[Firestore Sync Debug] [${sourceName} + THÊM MỚI] ID: ${docId}`, 'color: #10b981; font-weight: bold;', {
            title: data?.title,
            price: data?.price,
            status: data?.status,
            courseCount: data?.courseIds?.length || 0,
            updatedAt: data?.updatedAt
          });
        } else if (change.type === 'modified') {
          console.log(`%c[Firestore Sync Debug] [${sourceName} ~ CẬP NHẬT] ID: ${docId}`, 'color: #0284c7; font-weight: bold;', {
            title: data?.title,
            price: data?.price,
            status: data?.status,
            courseCount: data?.courseIds?.length || 0,
            updatedAt: data?.updatedAt
          });
        } else if (change.type === 'removed') {
          console.log(`%c[Firestore Sync Debug] [${sourceName} - ĐÃ XÓA] ID: ${docId}`, 'color: #ef4444; font-weight: bold;');
          removedIds.push(docId);
        }
      });

      if (removedIds.length > 0) {
        applyDeletedCombos(removedIds);
      }

      snapshot.forEach((docSnap: any) => {
        fsCombos.push({ id: docSnap.id, ...docSnap.data() });
      });

      console.log(`[Firestore Sync Debug] Đã nhận snapshot combo từ [${sourceName}] (${fsCombos.length} gói).`);
      updateStoredCombos(fsCombos, removedIds, sourceName);
      window.dispatchEvent(new CustomEvent('combos_updated', {
        detail: { action: `${sourceName}_snapshot`, combos: fsCombos, removedIds }
      }));
    };

    unsubCombos = onSnapshot(collection(db, 'combos'), (snapshot) => {
      handleComboSnapshot(snapshot, 'combos');
    }, (err) => {
      console.warn('[Firestore Sync Debug] Lỗi lắng nghe collection combos:', err);
    });

    unsubCustomCombos = onSnapshot(collection(db, 'customCombos'), (snapshot) => {
      handleComboSnapshot(snapshot, 'customCombos');
    }, (err) => {
      console.warn('[Firestore Sync Debug] Lỗi lắng nghe collection customCombos:', err);
    });
  } catch (err) {
    console.warn('[Firestore Sync Debug] Không thể đính kèm listener combos:', err);
  }

  // 3C. Firestore Sync Control Triggers: 'sync_control/courses' & 'sync_control/combos'
  try {
    unsubSyncControlCourses = onSnapshot(doc(db, 'sync_control', 'courses'), (docSnap) => {
      if (docSnap.exists()) {
        console.log('[Firestore Sync Debug] Tín hiệu sync_control/courses:', docSnap.data().updatedAt);
        fetchLatestCoursesFromServer();
      }
    }, (err) => {
      console.warn('[Firestore Sync Debug] sync_control/courses notice:', err);
    });

    unsubSyncControlCombos = onSnapshot(doc(db, 'sync_control', 'combos'), (docSnap) => {
      if (docSnap.exists()) {
        console.log('[Firestore Sync Debug] Tín hiệu sync_control/combos:', docSnap.data().updatedAt);
        fetchLatestCombosFromServer();
      }
    }, (err) => {
      console.warn('[Firestore Sync Debug] sync_control/combos notice:', err);
    });
  } catch (err) {
    console.warn('[Firestore Sync Debug] Không thể đính kèm sync_control listeners:', err);
  }

  // 3D. Firestore Collection: 'featured_courses' (Top 5 khóa nổi bật live sync)
  try {
    unsubFeaturedCourses = onSnapshot(collection(db, 'featured_courses'), (snapshot) => {
      const featList: any[] = [];
      snapshot.forEach(docSnap => featList.push({ id: docSnap.id, ...docSnap.data() }));
      window.dispatchEvent(new CustomEvent('featured_courses_updated', { detail: { featured: featList } }));
    }, (err) => {
      console.warn('[Firestore Sync Debug] featured_courses snapshot notice:', err);
    });
  } catch (err) {}

  // 4. Server-Sent Events stream as real-time secondary push transport
  function connectSSE() {
    if (eventSource) {
      try {
        eventSource.close();
      } catch (e) {}
      eventSource = null;
    }

    try {
      eventSource = new EventSource('/api/courses/stream');

      eventSource.addEventListener('init', (e: MessageEvent) => {
        try {
          const payload = JSON.parse(e.data);
          if (payload && Array.isArray(payload.deletedCourseIds)) {
            applyDeletedCourses(payload.deletedCourseIds);
          }
          if (payload && Array.isArray(payload.courses)) {
            updateStoredCourses(payload.courses, payload.deletedCourseIds);
            window.dispatchEvent(new CustomEvent('courses_updated', { detail: payload }));
          }
          if (payload && Array.isArray(payload.deletedComboIds)) {
            applyDeletedCombos(payload.deletedComboIds);
          }
          if (payload && Array.isArray(payload.combos) && payload.combos.length > 0) {
            updateStoredCombos(payload.combos, payload.deletedComboIds, 'SSE Init');
            window.dispatchEvent(new CustomEvent('combos_updated', { detail: payload }));
          }
        } catch (err) {
          console.warn('Failed to parse init SSE event:', err);
        }
      });

      eventSource.addEventListener('courses_updated', (e: MessageEvent) => {
        try {
          const payload = JSON.parse(e.data);
          if (payload && Array.isArray(payload.deletedCourseIds)) {
            applyDeletedCourses(payload.deletedCourseIds);
          }
          if (payload && Array.isArray(payload.courses)) {
            updateStoredCourses(payload.courses, payload.deletedCourseIds);
          }
          window.dispatchEvent(new CustomEvent('courses_updated', { detail: payload }));
          if (broadcastChannel) {
            broadcastChannel.postMessage({ type: 'courses_updated', ...payload });
          }
        } catch (err) {
          console.warn('Failed to parse courses_updated SSE event:', err);
        }
      });

      eventSource.addEventListener('combos_updated', (e: MessageEvent) => {
        try {
          const payload = JSON.parse(e.data);
          if (payload && Array.isArray(payload.deletedComboIds)) {
            applyDeletedCombos(payload.deletedComboIds);
          }
          if (payload && Array.isArray(payload.combos)) {
            updateStoredCombos(payload.combos, payload.deletedComboIds, 'SSE Push');
          }
          window.dispatchEvent(new CustomEvent('combos_updated', { detail: payload }));
          if (broadcastChannel) {
            broadcastChannel.postMessage({ type: 'combos_updated', ...payload });
          }
        } catch (err) {
          console.warn('Failed to parse combos_updated SSE event:', err);
        }
      });

      eventSource.onerror = () => {
        if (eventSource) {
          eventSource.close();
          eventSource = null;
        }
        if (!reconnectTimer) {
          reconnectTimer = setTimeout(() => {
            reconnectTimer = null;
            connectSSE();
          }, 4000);
        }
      };
    } catch (err) {
      if (!reconnectTimer) {
        reconnectTimer = setTimeout(() => {
          reconnectTimer = null;
          connectSSE();
        }, 5000);
      }
    }
  }

  connectSSE();

  // 5. Background polling & Window focus sync
  setInterval(() => {
    if (typeof document !== 'undefined' && !document.hidden) {
      fetchLatestCoursesFromServer();
      fetchLatestCombosFromServer();
    }
  }, 5000);

  window.addEventListener('focus', () => {
    triggerManualFirestoreSync();
    fetchLatestCoursesFromServer();
    fetchLatestCombosFromServer();
  });

  // 6. Native storage event listener
  window.addEventListener('storage', (e) => {
    if (e.key === 'local_custom_courses' || e.key === 'server_custom_courses' || e.key === 'cached_firestore_courses') {
      window.dispatchEvent(new CustomEvent('courses_updated'));
    }
    if (e.key === 'combo_cache_all' || e.key === 'fast_custom_combos_backup') {
      window.dispatchEvent(new CustomEvent('combos_updated'));
    }
  });
}

/**
 * Broadcast an edit/status/delete action across ALL tabs, accounts, and devices:
 * 1. Instantly updates local storage & dispatches locally (0ms)
 * 2. Broadcasts to sibling tabs via BroadcastChannel (0ms)
 * 3. Writes directly to Firestore collection 'courses' and 'sync_control/courses' (ensures all other machines receive via onSnapshot)
 * 4. Pushes to backend server /api/courses/sync (disk backup & SSE stream)
 */
export async function broadcastCourseUpdate(
  action: 'upsert' | 'status' | 'delete' | 'sync_all',
  payload: {
    course?: Partial<Course>;
    courseId?: string;
    status?: 'active' | 'inactive' | 'draft';
    courses?: Course[];
  }
) {
  const now = new Date().toISOString();
  const cId = payload.courseId || payload.course?.id;

  // 1. Immediately apply to local storage
  try {
    const localStr = localStorage.getItem('local_custom_courses');
    let localList: Course[] = localStr ? JSON.parse(localStr) : [];
    if (!Array.isArray(localList)) localList = [];

    if (action === 'upsert' && payload.course && payload.course.id) {
      const idx = localList.findIndex((c) => c.id === payload.course!.id);
      const updatedItem = { ...(idx >= 0 ? localList[idx] : {}), ...payload.course, updatedAt: now } as Course;
      if (idx >= 0) {
        localList[idx] = updatedItem;
      } else {
        localList.push(updatedItem);
      }
    } else if (action === 'status' && payload.courseId && payload.status) {
      const idx = localList.findIndex((c) => c.id === payload.courseId);
      if (idx >= 0) {
        localList[idx] = { ...localList[idx], status: payload.status, updatedAt: now };
      } else {
        localList.push({ id: payload.courseId, status: payload.status, updatedAt: now } as Course);
      }

      ['server_custom_courses', 'cached_firestore_courses'].forEach(key => {
        try {
          const str = localStorage.getItem(key);
          if (str) {
            const list = JSON.parse(str);
            if (Array.isArray(list)) {
              const sIdx = list.findIndex((c: any) => c.id === payload.courseId);
              if (sIdx >= 0) {
                list[sIdx] = { ...list[sIdx], status: payload.status, updatedAt: now };
              } else {
                list.push({ id: payload.courseId, status: payload.status, updatedAt: now });
              }
              localStorage.setItem(key, JSON.stringify(list));
            }
          }
        } catch (e) {}
      });
    } else if (action === 'delete' && payload.courseId) {
      localList = localList.filter((c) => c.id !== payload.courseId);
      try {
        const delStr = localStorage.getItem('deleted_course_ids');
        const delList: string[] = delStr ? JSON.parse(delStr) : [];
        if (!delList.includes(payload.courseId)) {
          delList.push(payload.courseId);
          localStorage.setItem('deleted_course_ids', JSON.stringify(delList));
        }
      } catch (e) {}
    } else if (action === 'sync_all' && Array.isArray(payload.courses)) {
      localList = payload.courses;
    }

    localStorage.setItem('local_custom_courses', JSON.stringify(localList));
  } catch (err) {
    console.warn('Local storage update error in broadcastCourseUpdate:', err);
  }

  // 2. Dispatch locally
  window.dispatchEvent(new CustomEvent('courses_updated', { detail: { action, ...payload } }));

  // 3. Broadcast to all open tabs in current browser via BroadcastChannel (0ms latency)
  if (broadcastChannel) {
    try {
      broadcastChannel.postMessage({
        type: 'courses_updated',
        action,
        ...payload,
        timestamp: Date.now(),
      });
    } catch (e) {}
  }

  // 4. WRITE DIRECTLY TO FIRESTORE TO TRIGGER ONSNAPSHOT ON ALL OTHER MACHINES
  try {
    if (cId) {
      if (action === 'delete') {
        await deleteDoc(doc(db, 'courses', cId)).catch(e => console.warn('Firestore delete course notice:', e));
      } else if (action === 'status' && payload.status) {
        await setDoc(doc(db, 'courses', cId), {
          id: cId,
          status: payload.status,
          updatedAt: now
        }, { merge: true }).catch(e => console.warn('Firestore status course notice:', e));
      } else if (action === 'upsert' && payload.course) {
        await setDoc(doc(db, 'courses', cId), {
          ...payload.course,
          id: cId,
          updatedAt: now
        }, { merge: true }).catch(e => console.warn('Firestore upsert course notice:', e));
      }
    }
    // Update sync_control signal
    await setDoc(doc(db, 'sync_control', 'courses'), { updatedAt: now, action, courseId: cId || '' }, { merge: true }).catch(() => {});
  } catch (fsErr) {
    console.warn('[Firestore Sync] Lỗi ghi trực tiếp vào Firestore (tiếp tục đồng bộ qua API server):', fsErr);
  }

  // 5. Send to server backend to propagate via SSE to all other accounts/devices
  try {
    await fetch('/api/courses/sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, ...payload }),
    });
  } catch (err) {
    console.warn('Network error pushing course sync to server:', err);
  }
}

/**
 * Broadcast an edit/delete action for Combos across all tabs and devices
 * 1. Instantly updates local storage & dispatches locally (0ms)
 * 2. Broadcasts to sibling tabs via BroadcastChannel (0ms)
 * 3. Writes directly to Firestore collections 'combos', 'customCombos', and 'sync_control/combos'
 * 4. Pushes to backend server /api/combos/sync
 */
export async function broadcastComboUpdate(
  action: 'save' | 'upsert' | 'status' | 'delete' | 'sync_all',
  payload: {
    comboId?: string;
    combo?: any;
    status?: 'active' | 'inactive';
    combos?: any[];
  }
) {
  const now = new Date().toISOString();
  const cId = payload.comboId || payload.combo?.id;

  // 1. Immediately apply to local storage
  try {
    const cached = localStorage.getItem('combo_cache_all');
    let localList: any[] = cached ? JSON.parse(cached) : [];
    if (!Array.isArray(localList)) localList = [];

    if ((action === 'save' || action === 'upsert') && (payload.combo || payload.comboId)) {
      try {
        const delStr = localStorage.getItem('deleted_combo_ids');
        if (delStr) {
          const delList: string[] = JSON.parse(delStr);
          if (Array.isArray(delList)) {
            const cleanedDel = delList.filter(id => id !== cId);
            localStorage.setItem('deleted_combo_ids', JSON.stringify(cleanedDel));
          }
        }
      } catch (e) {}

      const idx = localList.findIndex((c) => c.id === cId);
      const updatedItem = { ...(idx >= 0 ? localList[idx] : {}), ...(payload.combo || {}), id: cId, status: payload.combo?.status || 'active', updatedAt: now };
      if (idx >= 0) {
        localList[idx] = updatedItem;
      } else {
        localList.push(updatedItem);
      }
    } else if (action === 'status' && payload.comboId && payload.status) {
      const idx = localList.findIndex((c) => c.id === payload.comboId);
      if (idx >= 0) {
        localList[idx] = { ...localList[idx], status: payload.status, updatedAt: now };
      }
    } else if (action === 'delete' && payload.comboId) {
      localList = localList.filter((c) => c.id !== payload.comboId);
      try {
        const delStr = localStorage.getItem('deleted_combo_ids');
        const delList: string[] = delStr ? JSON.parse(delStr) : [];
        if (!delList.includes(payload.comboId)) {
          delList.push(payload.comboId);
          localStorage.setItem('deleted_combo_ids', JSON.stringify(delList));
        }
      } catch (e) {}
    } else if (action === 'sync_all' && Array.isArray(payload.combos)) {
      localList = payload.combos;
    }

    localStorage.setItem('combo_cache_all', JSON.stringify(localList));
    localStorage.setItem('fast_custom_combos_backup', JSON.stringify(localList));
  } catch (err) {
    console.warn('Local storage update error in broadcastComboUpdate:', err);
  }

  // 2. Dispatch locally in the current tab
  window.dispatchEvent(new CustomEvent('combos_updated', { detail: { action, ...payload } }));

  // 3. Broadcast to sibling tabs
  if (broadcastChannel) {
    try {
      broadcastChannel.postMessage({
        type: 'combos_updated',
        action,
        ...payload,
        timestamp: Date.now()
      });
    } catch (e) {}
  }

  // 4. WRITE DIRECTLY TO FIRESTORE TO TRIGGER ONSNAPSHOT ON ALL OTHER MACHINES
  try {
    if (cId) {
      if (action === 'delete') {
        await Promise.all([
          deleteDoc(doc(db, 'combos', cId)).catch(() => {}),
          deleteDoc(doc(db, 'customCombos', cId)).catch(() => {})
        ]);
      } else if (action === 'status' && payload.status) {
        const statusPayload = { id: cId, status: payload.status, updatedAt: now };
        await Promise.all([
          setDoc(doc(db, 'combos', cId), statusPayload, { merge: true }).catch(() => {}),
          setDoc(doc(db, 'customCombos', cId), statusPayload, { merge: true }).catch(() => {})
        ]);
      } else if ((action === 'save' || action === 'upsert') && payload.combo) {
        const fullComboData = { ...payload.combo, id: cId, updatedAt: now };
        await Promise.all([
          setDoc(doc(db, 'combos', cId), fullComboData, { merge: true }).catch(() => {}),
          setDoc(doc(db, 'customCombos', cId), fullComboData, { merge: true }).catch(() => {})
        ]);
      }
    }
    await setDoc(doc(db, 'sync_control', 'combos'), { updatedAt: now, action, comboId: cId || '' }, { merge: true }).catch(() => {});
  } catch (fsErr) {
    console.warn('[Firestore Sync] Lỗi ghi trực tiếp combo vào Firestore:', fsErr);
  }

  // 5. Send to server backend to propagate via SSE to all other accounts/devices
  try {
    await fetch('/api/combos/sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, ...payload }),
    });
  } catch (err) {
    console.warn('Network error pushing combo sync to server:', err);
  }
}
