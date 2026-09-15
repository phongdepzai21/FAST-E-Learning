import React, { useEffect, useRef, useState } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { collection, onSnapshot, query } from 'firebase/firestore';
import { auth, db } from '../firebase';
import { useToast } from '../contexts/ToastContext';
import { getMergedCourses, extractLessonsFlat } from '../constants';
import { Course } from '../types';
import { useNavigate } from 'react-router-dom';

export const LessonUpdateNotifier: React.FC = () => {
  const toast = useToast();
  const navigate = useNavigate();
  const [ownedCourseIds, setOwnedCourseIds] = useState<string[]>([]);
  
  // Track previous lengths of curriculums: courseId -> lesson count
  const prevLengthsRef = useRef<Record<string, number>>({});
  
  // Initial load
  useEffect(() => {
    const allCourses = getMergedCourses([]);
    const initialMap: Record<string, number> = {};
    allCourses.forEach(c => {
      initialMap[c.id] = extractLessonsFlat(c.curriculum).length;
    });
    prevLengthsRef.current = initialMap;
  }, []);

  // Listen to owned courses
  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      if (user && user.email) {
        const normalizedEmail = user.email.toLowerCase().trim();
        const q = query(collection(db, "users", normalizedEmail, "purchased_courses"));
        const unsubSnap = onSnapshot(q, (snapshot) => {
          const ids = snapshot.docs.map(doc => doc.data().courseId || doc.id);
          setOwnedCourseIds(ids);
        }, (err) => {
          console.error("LessonUpdateNotifier - Error fetching purchased courses:", err);
        });
        
        return () => unsubSnap();
      } else {
        setOwnedCourseIds([]);
      }
    });

    return () => unsubscribeAuth();
  }, []);

  // Listen to global course updates
  useEffect(() => {
    const handleCoursesUpdated = (e: any) => {
      const detail = e.detail;
      
      // We only care about upsert or sync_all that might contain new lessons
      // If no detail is provided, we just fetch from local storage
      let updatedCourses: Course[] = [];
      
      if (detail && detail.action === 'upsert' && detail.course) {
        updatedCourses = [detail.course];
      } else if (detail && detail.action === 'sync_all' && Array.isArray(detail.courses)) {
        updatedCourses = detail.courses;
      } else {
        try {
          const localStr = localStorage.getItem('local_custom_courses');
          if (localStr) {
            updatedCourses = JSON.parse(localStr);
          }
        } catch (err) {}
      }
      
      if (!Array.isArray(updatedCourses)) return;

      updatedCourses.forEach(course => {
        if (!course || !course.id) return;
        
        const newFlatLessons = extractLessonsFlat(course.curriculum);
        const newLen = newFlatLessons.length;
        const oldLen = prevLengthsRef.current[course.id];
        
        // If we know the old length, and the new length is greater, and the user owns it
        if (oldLen !== undefined && newLen > oldLen && ownedCourseIds.includes(course.id)) {
          const addedCount = newLen - oldLen;
          
          toast.success(
            <div className="flex flex-col gap-1">
              <span className="font-bold text-sm">🎉 Bài giảng mới!</span>
              <span className="text-xs">
                Khóa học <span className="font-semibold">{course.title}</span> vừa cập nhật thêm {addedCount} bài giảng mới.
              </span>
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  navigate(`/hoc/${course.id}`);
                }}
                className="mt-2 text-[10px] uppercase font-black tracking-widest text-teal-600 bg-teal-50 px-3 py-1.5 rounded-lg w-fit hover:bg-teal-100 transition-colors"
              >
                Vào học ngay
              </button>
            </div>,
            7000
          );
        }
        
        // Update the tracked length
        prevLengthsRef.current[course.id] = newLen;
      });
    };

    window.addEventListener('courses_updated', handleCoursesUpdated);
    return () => window.removeEventListener('courses_updated', handleCoursesUpdated);
  }, [ownedCourseIds, navigate, toast]);

  return null; // This component doesn't render anything visibly directly
};
