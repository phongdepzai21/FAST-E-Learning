/**
 * Session Authentication Bridge for FAST E-Learning
 * Provides high-availability session persistence and fallback when client-side Google Identity Toolkit
 * encounters network restrictions (e.g. auth/network-request-failed, CORS, or iframe sandboxing).
 */

export interface SessionUser {
  uid: string;
  email: string;
  displayName: string;
  photoURL?: string;
  avatar?: string;
  isAdmin?: boolean;
  isTeacher?: boolean;
  isOwner?: boolean;
  isVip?: boolean;
  isLocked?: boolean;
}

const STORAGE_KEY = 'fast_session_user';

export function getFastSessionUser(): SessionUser | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed && parsed.email) {
      return parsed;
    }
  } catch (err) {
    console.warn('[SessionAuth] Failed to parse stored session:', err);
  }
  return null;
}

export function setFastSessionUser(user: Partial<SessionUser> & { email: string }): SessionUser {
  const email = String(user.email).toLowerCase().trim();
  const isOwner = email === 'h1h4phong@gmail.com' || email === 'trdung153@gmail.com' || !!user.isOwner;
  const isAdmin = isOwner || !!user.isAdmin;
  const isTeacher = isAdmin || !!user.isTeacher;
  const isVip = !!user.isVip;

  const sessionUser: SessionUser = {
    uid: user.uid || `user_${email.replace(/[^a-zA-Z0-9]/g, '_')}`,
    email,
    displayName: user.displayName || email.split('@')[0],
    photoURL: user.photoURL || user.avatar || '',
    avatar: user.avatar || user.photoURL || '',
    isAdmin,
    isTeacher,
    isOwner,
    isVip,
    isLocked: !!user.isLocked
  };

  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(sessionUser));
      localStorage.setItem('user_email', email);
      localStorage.setItem(`user_roles_${email}`, JSON.stringify({
        isVip,
        isAdmin,
        isTeacher,
        isOwner,
        isLocked: !!user.isLocked
      }));

      // Broadcast to all listening tabs and components
      window.dispatchEvent(new CustomEvent('fast_auth_changed', { detail: sessionUser }));
      window.dispatchEvent(new CustomEvent('user_roles_updated'));
      window.dispatchEvent(new CustomEvent('courses_updated'));
    } catch (err) {
      console.warn('[SessionAuth] Failed to store session:', err);
    }
  }

  return sessionUser;
}

export function clearFastSessionUser(): void {
  if (typeof window !== 'undefined') {
    try {
      localStorage.removeItem(STORAGE_KEY);
      localStorage.removeItem('user_email');
      window.dispatchEvent(new CustomEvent('fast_auth_changed', { detail: null }));
      window.dispatchEvent(new CustomEvent('user_roles_updated'));
      window.dispatchEvent(new CustomEvent('courses_updated'));
    } catch (err) {
      console.warn('[SessionAuth] Failed to clear session:', err);
    }
  }
}

/**
 * Creates a synthetic Firebase User-like object for components that expect User interface.
 */
export function createSyntheticFirebaseUser(session: SessionUser) {
  return {
    uid: session.uid,
    email: session.email,
    displayName: session.displayName,
    photoURL: session.photoURL || '',
    emailVerified: true,
    isAnonymous: false,
    providerData: [{
      providerId: 'password',
      uid: session.uid,
      displayName: session.displayName,
      email: session.email,
      phoneNumber: null,
      photoURL: session.photoURL || ''
    }],
    getIdToken: async () => `fast_token_${session.email}`,
    getIdTokenResult: async () => ({
      token: `fast_token_${session.email}`,
      authTime: new Date().toISOString(),
      issuedAtTime: new Date().toISOString(),
      expirationTime: new Date(Date.now() + 86400000).toISOString(),
      signInProvider: 'password',
      claims: {
        admin: !!session.isAdmin,
        teacher: !!session.isTeacher,
        owner: !!session.isOwner,
        vip: !!session.isVip
      }
    }),
    reload: async () => {}
  } as any;
}
