import { Course } from '../types';

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

/**
 * Apply updated courses into localStorage safely
 */
function updateStoredCourses(courses: Course[]) {
  if (!Array.isArray(courses)) return;
  try {
    localStorage.setItem('server_custom_courses', JSON.stringify(courses));

    // Merge into local_custom_courses so existing components get latest data
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
      if (c && c.id) mergedMap.set(c.id, c);
    });

    courses.forEach(c => {
      if (c && c.id) {
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
 * Apply updated combos into localStorage safely
 */
function updateStoredCombos(combos: any[]) {
  if (!Array.isArray(combos)) return;
  try {
    localStorage.setItem('combo_cache_all', JSON.stringify(combos));
  } catch (err) {
    console.warn('Error saving combos to local storage:', err);
  }
}

/**
 * Initialize cross-tab, cross-account, and cross-device real-time sync
 */
export function initCourseSyncService() {
  if (isInitialized || typeof window === 'undefined') return;
  isInitialized = true;

  // 1. Listen on BroadcastChannel for other open tabs in the same browser
  if (broadcastChannel) {
    broadcastChannel.onmessage = (event) => {
      const data = event.data;
      if (data && data.type === 'courses_updated') {
        if (data.courses && Array.isArray(data.courses)) {
          updateStoredCourses(data.courses);
        }
        window.dispatchEvent(new CustomEvent('courses_updated', { detail: data }));
      } else if (data && data.type === 'combos_updated') {
        if (data.combos && Array.isArray(data.combos)) {
          updateStoredCombos(data.combos);
        }
        window.dispatchEvent(new CustomEvent('combos_updated', { detail: data }));
      }
    };
  }

  // 2. Fetch initial courses & combos snapshot from backend API
  fetch('/api/courses')
    .then((res) => res.json())
    .then((data) => {
      if (data && Array.isArray(data.courses) && data.courses.length > 0) {
        updateStoredCourses(data.courses);
        window.dispatchEvent(new CustomEvent('courses_updated', { detail: { action: 'init', courses: data.courses } }));
      }
    })
    .catch((err) => {
      console.warn('Could not fetch initial /api/courses snapshot:', err);
    });

  fetch('/api/combos')
    .then((res) => res.json())
    .then((data) => {
      if (data && Array.isArray(data.combos) && data.combos.length > 0) {
        updateStoredCombos(data.combos);
        window.dispatchEvent(new CustomEvent('combos_updated', { detail: { action: 'init', combos: data.combos } }));
      }
    })
    .catch((err) => {
      console.warn('Could not fetch initial /api/combos snapshot:', err);
    });

  // 3. Connect to Server-Sent Events stream for real-time push from server
  function connectSSE() {
    if (eventSource) {
      eventSource.close();
      eventSource = null;
    }

    try {
      eventSource = new EventSource('/api/courses/stream');

      eventSource.addEventListener('init', (e: MessageEvent) => {
        try {
          const payload = JSON.parse(e.data);
          if (payload && Array.isArray(payload.courses) && payload.courses.length > 0) {
            updateStoredCourses(payload.courses);
            window.dispatchEvent(new CustomEvent('courses_updated', { detail: payload }));
          }
          if (payload && Array.isArray(payload.combos) && payload.combos.length > 0) {
            updateStoredCombos(payload.combos);
            window.dispatchEvent(new CustomEvent('combos_updated', { detail: payload }));
          }
        } catch (err) {
          console.warn('Failed to parse init SSE event:', err);
        }
      });

      eventSource.addEventListener('courses_updated', (e: MessageEvent) => {
        try {
          const payload = JSON.parse(e.data);
          if (payload && Array.isArray(payload.courses)) {
            updateStoredCourses(payload.courses);
          } else if (payload && payload.action === 'status' && payload.courseId) {
            const localStr = localStorage.getItem('local_custom_courses');
            if (localStr) {
              const list: Course[] = JSON.parse(localStr);
              const updated = list.map((c) => (c.id === payload.courseId ? { ...c, status: payload.status } : c));
              localStorage.setItem('local_custom_courses', JSON.stringify(updated));
            }
          }
          // Notify current tab's components
          window.dispatchEvent(new CustomEvent('courses_updated', { detail: payload }));

          // Also notify any sibling tabs via BroadcastChannel
          if (broadcastChannel) {
            broadcastChannel.postMessage({
              type: 'courses_updated',
              ...payload,
            });
          }
        } catch (err) {
          console.warn('Failed to parse courses_updated SSE event:', err);
        }
      });

      eventSource.addEventListener('combos_updated', (e: MessageEvent) => {
        try {
          const payload = JSON.parse(e.data);
          if (payload && Array.isArray(payload.combos)) {
            updateStoredCombos(payload.combos);
          }
          // Notify current tab's components
          window.dispatchEvent(new CustomEvent('combos_updated', { detail: payload }));

          // Also notify any sibling tabs via BroadcastChannel
          if (broadcastChannel) {
            broadcastChannel.postMessage({
              type: 'combos_updated',
              ...payload,
            });
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
        // Auto-reconnect after 3 seconds
        if (!reconnectTimer) {
          reconnectTimer = setTimeout(() => {
            reconnectTimer = null;
            connectSSE();
          }, 3000);
        }
      };
    } catch (err) {
      console.warn('Could not establish SSE connection:', err);
    }
  }

  connectSSE();

  // 4. Also listen to native storage events
  window.addEventListener('storage', (e) => {
    if (e.key === 'local_custom_courses' || e.key === 'server_custom_courses') {
      window.dispatchEvent(new CustomEvent('courses_updated'));
    }
    if (e.key === 'combo_cache_all') {
      window.dispatchEvent(new CustomEvent('combos_updated'));
    }
  });
}

/**
 * Broadcast an edit/status/delete action across ALL tabs and accounts:
 * - Instantly notifies local tab
 * - Instantly notifies all sibling tabs in the same browser (BroadcastChannel)
 * - Sends update to backend server (/api/courses/sync) which pushes SSE to other accounts/browsers/devices
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
    } else if (action === 'delete' && payload.courseId) {
      localList = localList.filter((c) => c.id !== payload.courseId);

      // Track deleted ID so it stays deleted
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
    } catch (e) {
      console.warn('BroadcastChannel postMessage error:', e);
    }
  }

  // 4. Send to server backend to propagate via SSE to all other accounts/devices
  try {
    const res = await fetch('/api/courses/sync', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        action,
        ...payload,
      }),
    });
    if (!res.ok) {
      console.warn('Server course sync responded with status', res.status);
    }
  } catch (err) {
    console.warn('Network error pushing course sync to server:', err);
  }
}

/**
 * Broadcast an edit/delete action for Combos across all tabs and devices
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

  // 1. Immediately apply to local storage
  try {
    const cached = localStorage.getItem('combo_cache_all');
    let localList: any[] = cached ? JSON.parse(cached) : [];
    if (!Array.isArray(localList)) localList = [];

    if ((action === 'save' || action === 'upsert') && (payload.combo || payload.comboId)) {
      const cId = payload.combo?.id || payload.comboId;
      const idx = localList.findIndex((c) => c.id === cId);
      const updatedItem = { ...(idx >= 0 ? localList[idx] : {}), ...(payload.combo || {}), id: cId, updatedAt: now };
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

      // Track deleted combo ID
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
    } catch (e) {
      console.warn('BroadcastChannel postMessage error for combo sync:', e);
    }
  }

  // 4. Send to server backend to propagate via SSE to all other accounts/devices
  try {
    await fetch('/api/combos/sync', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        action,
        ...payload,
      }),
    });
  } catch (err) {
    console.warn('Network error pushing combo sync to server:', err);
  }
}
