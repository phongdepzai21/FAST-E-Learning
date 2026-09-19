import React, { useEffect, useRef } from 'react';
import { collection, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';
import { useToast } from '../contexts/ToastContext';
import { Course } from '../types';
import { useNavigate } from 'react-router-dom';
import { 
  addCourseNotification, 
  markCourseAsSeen, 
  isCourseDismissed, 
  dismissCourseNotification 
} from '../utils/courseNotificationService';
import { Sparkles, ArrowRight, BookOpen, EyeOff } from 'lucide-react';

const KNOWN_COURSES_KEY = 'fast_known_course_ids_cache';

function getStoredKnownCourseIds(): Set<string> {
  if (typeof window === 'undefined') return new Set();
  try {
    const raw = localStorage.getItem(KNOWN_COURSES_KEY);
    return raw ? new Set(JSON.parse(raw)) : new Set();
  } catch {
    return new Set();
  }
}

function saveKnownCourseId(id: string) {
  if (typeof window === 'undefined' || !id) return;
  try {
    const ids = getStoredKnownCourseIds();
    ids.add(id);
    localStorage.setItem(KNOWN_COURSES_KEY, JSON.stringify(Array.from(ids)));
  } catch {}
}

export const CourseUpdateNotifier: React.FC = () => {
  const toast = useToast();
  const navigate = useNavigate();

  // Track known course IDs and their last known updatedAt to differentiate initial load vs new updates
  const isInitialLoadRef = useRef(true);
  const knownCoursesRef = useRef<Map<string, { updatedAt?: string; title: string }>>(new Map());

  // Initialize known courses from localStorage
  useEffect(() => {
    const cachedIds = getStoredKnownCourseIds();
    cachedIds.forEach(id => {
      if (!knownCoursesRef.current.has(id)) {
        knownCoursesRef.current.set(id, { title: '' });
      }
    });
  }, []);

  // Handle showing the toast for a course update/addition
  const notifyCourse = (course: Partial<Course>, type: 'new' | 'updated') => {
    if (!course || !course.id) return;

    // Strict check: if user has already dismissed/skipped this course, NEVER show it again
    if (isCourseDismissed(course.id)) {
      return;
    }

    // Save as known
    saveKnownCourseId(course.id);

    // Add to notification store
    addCourseNotification(course, type);

    const isNew = type === 'new';
    const titleText = isNew ? 'Khóa học mới ra mắt' : 'Khóa học vừa cập nhật';
    const courseTitle = course.title || 'Khóa học mới';

    toast.show(
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-2">
          <span className={`inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md ${
            isNew 
              ? 'bg-rose-100 text-rose-700 border border-rose-200' 
              : 'bg-teal-100 text-teal-800 border border-teal-200'
          }`}>
            <Sparkles className="w-3 h-3" />
            {isNew ? 'Khóa học mới' : 'Nội dung cập nhật'}
          </span>
          {course.category && (
            <span className="text-[10px] font-bold text-gray-500 bg-gray-100 px-2 py-0.5 rounded">
              {course.category}
            </span>
          )}
        </div>

        <div className="flex gap-3 items-start mt-0.5">
          {course.image && (
            <img 
              src={course.image} 
              alt={courseTitle} 
              className="w-12 h-12 rounded-xl object-cover border border-gray-200 shadow-xs shrink-0"
              onError={(e) => { (e.target as HTMLElement).style.display = 'none'; }}
            />
          )}
          <div className="flex-1 min-w-0">
            <h4 className="font-extrabold text-sm text-gray-900 leading-snug line-clamp-2">
              {courseTitle}
            </h4>
            {course.price && (
              <span className="text-xs font-bold text-[#007c76] mt-0.5 inline-block">
                {course.price}
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center justify-between pt-1 mt-1 border-t border-gray-100">
          <button
            onClick={(e) => {
              e.stopPropagation();
              if (course.id) {
                dismissCourseNotification(course.id);
                // Also close any toast
                window.dispatchEvent(new CustomEvent('course_notifications_updated'));
              }
            }}
            title="Bỏ qua và không bao giờ hiện lại thông báo này"
            className="inline-flex items-center gap-1 text-[11px] font-bold text-gray-400 hover:text-rose-600 px-2 py-1 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer"
          >
            <EyeOff className="w-3 h-3" />
            <span>Bỏ qua</span>
          </button>

          <button
            onClick={(e) => {
              e.stopPropagation();
              if (course.id) {
                markCourseAsSeen(course.id);
                navigate(`/khoa-hoc/${course.id}`);
              }
            }}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#007c76] hover:bg-[#00605b] text-white text-[11px] font-black uppercase tracking-wider rounded-xl transition-all shadow-xs active:scale-95 cursor-pointer"
          >
            <span>Xem ngay</span>
            <ArrowRight className="w-3 h-3" />
          </button>
        </div>
      </div>,
      isNew ? 'success' : 'info',
      7000,
      titleText
    );
  };

  // 1. Listen to courses_updated custom events (triggered by SSE, BroadcastChannel, TeacherDashboard)
  useEffect(() => {
    const handleCoursesUpdated = (e: any) => {
      const detail = e.detail;
      if (!detail) return;

      // When a single course is upserted
      if (detail.action === 'upsert' && detail.course) {
        const course: Course = detail.course;
        const exists = knownCoursesRef.current.has(course.id);
        const type: 'new' | 'updated' = exists ? 'updated' : 'new';
        
        knownCoursesRef.current.set(course.id, {
          updatedAt: course.updatedAt || new Date().toISOString(),
          title: course.title
        });

        notifyCourse(course, type);
      }

      // Manual test event
      if (detail.action === 'test_notification' && detail.course) {
        notifyCourse(detail.course, detail.type || 'new');
      }
    };

    window.addEventListener('courses_updated', handleCoursesUpdated);
    return () => window.removeEventListener('courses_updated', handleCoursesUpdated);
  }, [navigate, toast]);

  // 2. Real-time listener for Firestore `courses` collection
  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, 'courses'), (snapshot) => {
      const isInitial = isInitialLoadRef.current;
      
      snapshot.docChanges().forEach((change) => {
        const data = change.doc.data() as Partial<Course>;
        const courseId = change.doc.id;
        const fullCourse: Partial<Course> = { id: courseId, ...data };

        if (change.type === 'added') {
          if (!isInitial && !knownCoursesRef.current.has(courseId)) {
            // New course added remotely
            notifyCourse(fullCourse, 'new');
          }
          knownCoursesRef.current.set(courseId, {
            updatedAt: data.updatedAt,
            title: data.title || ''
          });
        } else if (change.type === 'modified') {
          if (!isInitial) {
            const prev = knownCoursesRef.current.get(courseId);
            // Check if updatedAt changed or curriculum/price/title changed
            if (!prev || prev.updatedAt !== data.updatedAt || prev.title !== data.title) {
              notifyCourse(fullCourse, 'updated');
            }
          }
          knownCoursesRef.current.set(courseId, {
            updatedAt: data.updatedAt,
            title: data.title || ''
          });
        }
      });

      if (isInitial) {
        isInitialLoadRef.current = false;
      }
    }, (err) => {
      console.warn('CourseUpdateNotifier: Firestore listener error', err);
    });

    return () => unsubscribe();
  }, [navigate, toast]);

  return null;
};
