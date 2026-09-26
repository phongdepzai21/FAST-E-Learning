import { useState, useEffect, useRef } from 'react';
import { db } from '../firebase';
import { doc, onSnapshot, setDoc } from 'firebase/firestore';

/**
 * A highly reusable and generic real-time data synchronization utility hook.
 * Mirrors the exact debounced syncing pattern used in 'FSA-Checklist' to ensure
 * data is persisted both in LocalStorage (for fast local reads/offline fallback)
 * and Google Cloud Firestore (for immediate time-synchronization across all admin accounts).
 */
export function useCloudSync<T>(
  collectionName: string,
  docName: string,
  localStorageKey: string,
  initialState: T,
  debounceMs: number = 1000
) {
  const [state, setState] = useState<T>(() => {
    try {
      const saved = localStorage.getItem(localStorageKey);
      return saved ? JSON.parse(saved) : initialState;
    } catch {
      return initialState;
    }
  });

  const [isCloudSaving, setIsCloudSaving] = useState(false);
  const [syncStatus, setSyncStatus] = useState('Đã đồng bộ');

  const stateRef = useRef<T>(state);
  stateRef.current = state;

  // 1. Real-time Subscription Listener (onSnapshot)
  useEffect(() => {
    let unsubscribe: (() => void) | undefined;
    try {
      const docRef = doc(db, collectionName, docName);
      unsubscribe = onSnapshot(docRef, (docSnap) => {
        if (docSnap.exists()) {
          const remoteData = docSnap.data();
          
          // Determine the payload key dynamically based on the document or collection type
          const payload = remoteData?.records !== undefined 
            ? remoteData.records 
            : (remoteData?.activeData !== undefined 
                ? remoteData.activeData 
                : remoteData?.active);

          if (payload !== undefined) {
            const currentStr = JSON.stringify(stateRef.current);
            const remoteStr = JSON.stringify(payload);
            
            // Only update local state if it differs from the remote version (prevents cursor resetting)
            if (currentStr !== remoteStr) {
              setState(payload as T);
              try {
                localStorage.setItem(localStorageKey, remoteStr);
              } catch {}
            }
          }
        }
      }, (err) => {
        console.warn(`[useCloudSync] onSnapshot error for ${collectionName}/${docName}:`, err);
      });
    } catch (e) {
      console.warn(`[useCloudSync] Initialization error for ${collectionName}/${docName}:`, e);
    }

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [collectionName, docName, localStorageKey]);

  // 2. Debounced Uploader
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const updateState = (newValue: T | ((prev: T) => T), immediateCloudSave: boolean = false) => {
    const updated = typeof newValue === 'function' ? (newValue as Function)(stateRef.current) : newValue;
    setState(updated);
    
    const serialized = JSON.stringify(updated);
    try {
      localStorage.setItem(localStorageKey, serialized);
    } catch {}

    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    setSyncStatus('Đang đồng bộ...');

    const upload = async () => {
      setIsCloudSaving(true);
      try {
        const docRef = doc(db, collectionName, docName);
        const payloadKey = docName === 'database' 
          ? 'records' 
          : (collectionName === 'fast_food_safety_crm' ? 'activeData' : 'active');
        
        await setDoc(docRef, {
          [payloadKey]: updated,
          updatedAt: new Date().toISOString()
        }, { merge: true });
        
        setSyncStatus('Đã đồng bộ nháp ✓');
      } catch (err) {
        console.warn(`[useCloudSync] Error saving to ${collectionName}/${docName}:`, err);
        setSyncStatus('Lỗi đồng bộ');
      } finally {
        setIsCloudSaving(false);
      }
    };

    if (immediateCloudSave) {
      upload();
    } else {
      saveTimeoutRef.current = setTimeout(upload, debounceMs);
    }
  };

  return [state, updateState, isCloudSaving, syncStatus] as const;
}
