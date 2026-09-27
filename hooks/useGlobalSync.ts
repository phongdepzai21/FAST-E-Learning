import { useEffect, useRef } from 'react';
import { db } from '../firebase';
import { doc, onSnapshot, setDoc } from 'firebase/firestore';

export function useGlobalSync(
  channelName: string,
  docId: string,
  onReset: () => void
) {
  const channelRef = useRef<BroadcastChannel | null>(null);
  const lastTriggeredRef = useRef<number>(0);

  // Initialize BroadcastChannel for cross-tab resets in the same browser session
  useEffect(() => {
    const channel = new BroadcastChannel(channelName);
    channelRef.current = channel;

    channel.onmessage = (event) => {
      if (event.data && event.data.type === 'RESET_FORM') {
        const timestamp = event.data.timestamp;
        if (timestamp > lastTriggeredRef.current) {
          lastTriggeredRef.current = timestamp;
          onReset();
        }
      }
    };

    return () => {
      channel.close();
    };
  }, [channelName, onReset]);

  // Subscribe to real-time Firestore updates for remote sync resets across different admin sessions
  useEffect(() => {
    const docRef = doc(db, 'global_sync', docId);
    const unsubscribe = onSnapshot(docRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data();
        if (data && typeof data.timestamp === 'number') {
          if (data.timestamp > lastTriggeredRef.current) {
            lastTriggeredRef.current = data.timestamp;
            onReset();
          }
        }
      }
    }, (error) => {
      console.warn('GlobalSync Firestore listen error:', error);
    });

    return () => {
      unsubscribe();
    };
  }, [docId, onReset]);

  // Function to trigger a global reset event across all tabs & sessions
  const triggerGlobalSaveReset = async () => {
    const timestamp = Date.now();
    lastTriggeredRef.current = timestamp;

    // 1. Reset own local form instantly
    onReset();

    // 2. Broadcast to other local browser tabs
    if (channelRef.current) {
      channelRef.current.postMessage({ type: 'RESET_FORM', timestamp });
    }

    // 3. Write event to Firestore to notify other remote admins instantly
    try {
      const docRef = doc(db, 'global_sync', docId);
      await setDoc(docRef, { timestamp }, { merge: true });
    } catch (error) {
      console.warn('Failed to broadcast global sync state update:', error);
    }
  };

  return { triggerGlobalSaveReset };
}
