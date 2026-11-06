
import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getStorage } from 'firebase/storage';
import { getFirestore, doc, getDocFromServer } from 'firebase/firestore';
import firebaseConfig from './firebase-applet-config.json';

// Ensure singleton Firebase App initialization
const isAlreadyInitialized = getApps().length > 0;
const app = isAlreadyInitialized ? getApp() : initializeApp(firebaseConfig);

import { getFastSessionUser, clearFastSessionUser, createSyntheticFirebaseUser } from './utils/sessionAuth';

// Initialize Firebase Authentication instance
const rawAuth = getAuth(app);

// Augment auth with resilient Proxy fallback for network/offline resilience
const auth = new Proxy(rawAuth, {
  get(target, prop, receiver) {
    if (prop === 'currentUser') {
      const realUser = Reflect.get(target, prop, receiver);
      if (realUser) return realUser;
      const session = getFastSessionUser();
      if (session) {
        return createSyntheticFirebaseUser(session);
      }
      return null;
    }
    if (prop === 'signOut') {
      return async () => {
        clearFastSessionUser();
        try {
          return await target.signOut();
        } catch {
          return;
        }
      };
    }
    return Reflect.get(target, prop, receiver);
  }
});

// Initialize Firebase Storage
const storage = getStorage(app);

// Initialize Cloud Firestore with the configured project database ID
const firestoreDbId = (firebaseConfig as any).firestoreDatabaseId;
const db = firestoreDbId && firestoreDbId !== '(default)'
  ? getFirestore(app, firestoreDbId)
  : getFirestore(app);

// Diagnostic startup verification
console.log('[Firebase:Init] Firebase initialized successfully:', {
  projectId: firebaseConfig.projectId,
  authDomain: firebaseConfig.authDomain,
  firestoreDatabaseId: firestoreDbId || '(default)',
  appInitialized: !!app,
  authReady: !!auth,
  timestamp: new Date().toISOString()
});

/**
 * Diagnostic health check to verify connection to Firestore and Auth
 */
export async function testFirebaseConnection(): Promise<{ ok: boolean; message: string }> {
  try {
    // Attempt reading meta doc from server to verify network & security configuration
    await getDocFromServer(doc(db, 'sync_control', 'global'));
    return { ok: true, message: 'Connected to Firestore successfully.' };
  } catch (error: any) {
    const msg = error?.message || String(error);
    console.warn('[Firebase:HealthCheck] Diagnostic ping report:', msg);
    return { ok: false, message: msg };
  }
}

// Run test connection asynchronously on boot (non-blocking)
testFirebaseConnection().catch(() => null);

export { auth, storage, db, app, firebaseConfig };
