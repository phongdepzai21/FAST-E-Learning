import { useEffect } from 'react';
import { db } from '../firebase';
import { doc, setDoc } from 'firebase/firestore';

/**
 * Hook to monitor and batch-sync student lesson progress to Firestore every 5 seconds.
 */
export const useLessonProgressSync = (userEmail: string | undefined, progressData: any) => {
  useEffect(() => {
    if (!userEmail) return;

    const interval = setInterval(async () => {
      if (progressData) {
        try {
          await setDoc(doc(db, 'student_progress', userEmail), {
            ...progressData,
            updatedAt: new Date().toISOString()
          }, { merge: true });
        } catch (e) {
          console.error("Lỗi sync progress:", e);
        }
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [userEmail, progressData]);
};
