
import React, { Suspense, lazy, useState, useEffect } from 'react';
import { HelmetProvider } from 'react-helmet-async';
// Migration: Switch from HashRouter to BrowserRouter for clean production URLs (e.g. /home) without #
import { BrowserRouter as Router, Routes, Route, useLocation, useNavigate } from "react-router-dom";
import { onAuthStateChanged, onIdTokenChanged, getIdTokenResult, User } from 'firebase/auth';
import { auth, db } from './firebase';
import { getFastSessionUser, createSyntheticFirebaseUser } from './utils/sessionAuth';
import Header from './components/Header';
import ScrollToTop from './components/ScrollToTop';
import { ThemeProvider } from './contexts/ThemeContext';
import { ToastProvider } from './contexts/ToastContext';
import { ToastContainer } from './components/ToastContainer';
import { initCourseSyncService } from './utils/courseSyncService';
import { LessonUpdateNotifier } from './components/LessonUpdateNotifier';
import { CourseUpdateNotifier } from './components/CourseUpdateNotifier';
import { NetworkStatusNotifier } from './components/NetworkStatusNotifier';
import { authDebugger } from './utils/authDebugger';
import { otpLogger } from './auth/otp-logger';
import { subscribeToPaymentConfig } from './utils/qrService';
// Direct import for Critical LCP Page
import Home from './pages/Home'; 

// Resilient lazy loader that retries on dynamic import failures (e.g. during server restart/redeployment)
const lazyWithRetry = <T extends React.ComponentType<any>>(
  factory: () => Promise<{ default: T }>
): React.LazyExoticComponent<T> => {
  return lazy(async () => {
    try {
      return await factory();
    } catch (err: any) {
      console.warn('[App] Retrying dynamic import...', err);
      try {
        await new Promise((res) => setTimeout(res, 350));
        return await factory();
      } catch (retryErr: any) {
        const msg = retryErr?.message || '';
        if (
          msg.includes('dynamically imported module') ||
          msg.includes('Failed to fetch') ||
          retryErr?.name === 'ChunkLoadError'
        ) {
          const key = 'chunk_reload_' + (typeof window !== 'undefined' ? window.location.pathname : '');
          if (typeof sessionStorage !== 'undefined' && !sessionStorage.getItem(key)) {
            sessionStorage.setItem(key, '1');
            window.location.reload();
          }
        }
        throw retryErr;
      }
    }
  });
};

// Lazy load các trang con với cơ chế tự phục hồi
const Courses = lazyWithRetry(() => import('./pages/Courses'));
const CourseDetail = lazyWithRetry(() => import('./pages/CourseDetail'));
const About = lazyWithRetry(() => import('./pages/About'));
const Contact = lazyWithRetry(() => import('./pages/Contact'));
const FAQ = lazyWithRetry(() => import('./pages/FAQ'));
const Consulting = lazyWithRetry(() => import('./pages/Consulting'));
const Handbook = lazyWithRetry(() => import('./pages/Handbook'));
const Account = lazyWithRetry(() => import('./pages/Account'));
const AccountSettings = lazyWithRetry(() => import('./pages/AccountSettings'));
const VipUpgrade = lazyWithRetry(() => import('./pages/VipUpgrade'));
const TermsOfService = lazyWithRetry(() => import('./pages/TermsOfService'));
const PrivacyPolicy = lazyWithRetry(() => import('./pages/PrivacyPolicy'));
const Classroom = lazyWithRetry(() => import('./pages/Classroom'));
const NotFound = lazyWithRetry(() => import('./pages/NotFound'));

// Lazy load Components phụ trợ & Footer
const FloatingContact = lazyWithRetry(() => import('./components/FloatingContact'));
const Footer = lazyWithRetry(() => import('./components/Footer'));

// Loading Fallback Component
const PageLoader = () => (
  <div className="min-h-[60vh] flex flex-col items-center justify-center space-y-4">
    <div className="w-10 h-10 border-4 border-[#007c76] border-t-transparent rounded-full animate-spin"></div>
    <div className="font-bold text-gray-400 text-sm tracking-widest uppercase">Đang tải...</div>
  </div>
);

const AppLayout: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const isAccountPath = location.pathname.startsWith('/account');
  const isClassroomPath = location.pathname.startsWith('/hoc');
  const [isDelayedLoaded, setIsDelayedLoaded] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [authResolved, setAuthResolved] = useState(false);

  // Real-time Firestore Banking Settings Sync
  useEffect(() => {
    const unsubscribe = subscribeToPaymentConfig();
    return () => unsubscribe();
  }, []);

  // Auto clean legacy #/ hash URLs to clean pathname (e.g. /home)
  useEffect(() => {
    if (window.location.hash && window.location.hash.startsWith('#/')) {
      const targetPath = window.location.hash.slice(1); // e.g. "/home"
      navigate(targetPath, { replace: true });
    }
  }, [navigate]);

  useEffect(() => {
    initCourseSyncService();

    // Safely delete legacy 'khoa-vip' from local caches and log notice
    const executeGlobalVipCleanup = async () => {
      try {
        localStorage.removeItem('course_unlocked_khoa-vip');
        // Only attempt Firestore cleanup if user is an authenticated administrator
        if (auth.currentUser && auth.currentUser.email) {
          const userEmail = auth.currentUser.email.toLowerCase();
          const admins = ['h1h4phong@gmail.com', 'hkc.qms@gmail.com', 'trdung153@gmail.com', 'lediem.ngo@gmail.com'];
          if (admins.includes(userEmail)) {
            const { doc, deleteDoc } = await import('firebase/firestore');
            await deleteDoc(doc(db, 'courses', 'khoa-vip')).catch(() => null);
          }
        }
      } catch (err) {
        console.warn('[Cleanup] Note on VIP course cleanup:', err);
      }
    };
    executeGlobalVipCleanup();
  }, []);

  // --- COMPREHENSIVE FIREBASE AUTH TRANSITION LOGGER ---
  useEffect(() => {
    const initTimestamp = Date.now();
    console.log("[AuthTransition:Init] Initializing Firebase Auth State Listeners...", {
      authDomain: auth.config?.authDomain,
      projectId: (auth.app.options as any)?.projectId,
      isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
      initialUser: auth.currentUser ? auth.currentUser.email : null,
      timestamp: new Date().toISOString()
    });

    // Ring buffer history for runtime diagnostics (accessible in browser console via window.__FAST_AUTH_TRANSITIONS__)
    if (typeof window !== 'undefined') {
      (window as any).__FAST_AUTH_TRANSITIONS__ = (window as any).__FAST_AUTH_TRANSITIONS__ || [];
    }

    const logTransition = async (
      type: 'LOGGED_IN' | 'LOGGED_OUT' | 'ID_TOKEN_REFRESH' | 'AUTH_ERROR',
      currentUser: User | null,
      errorObj?: any
    ) => {
      let tokenMetadata: any = null;
      if (currentUser) {
        try {
          const tokenResult = await getIdTokenResult(currentUser).catch(() => null);
          if (tokenResult) {
            tokenMetadata = {
              authTime: tokenResult.authTime,
              issuedAtTime: tokenResult.issuedAtTime,
              expirationTime: tokenResult.expirationTime,
              signInProvider: tokenResult.signInProvider
            };
          }
        } catch (tErr) {
          console.warn("[AuthTransition] Could not extract token claims:", tErr);
        }
      }

      const transitionRecord = {
        id: `auth_tx_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        timestamp: new Date().toISOString(),
        elapsedMs: Date.now() - initTimestamp,
        type,
        user: currentUser ? {
          uid: currentUser.uid,
          email: currentUser.email,
          displayName: currentUser.displayName,
          emailVerified: currentUser.emailVerified,
          isAnonymous: currentUser.isAnonymous,
          providerIds: currentUser.providerData?.map(p => p.providerId) || []
        } : null,
        tokenMetadata,
        networkOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
        error: errorObj ? {
          code: errorObj.code,
          message: errorObj.message,
          name: errorObj.name
        } : null
      };

      if (typeof window !== 'undefined') {
        const history = (window as any).__FAST_AUTH_TRANSITIONS__;
        history.push(transitionRecord);
        if (history.length > 50) history.shift();
      }

      // High-visibility Console Logging
      if (type === 'LOGGED_IN') {
        console.log("%c[AuthTransition:LOGGED_IN] User session established", "color: #059669; font-weight: bold; font-size: 11px;", {
          email: transitionRecord.user?.email,
          uid: transitionRecord.user?.uid,
          providers: transitionRecord.user?.providerIds,
          tokenExpires: tokenMetadata?.expirationTime,
          elapsed: `${transitionRecord.elapsedMs}ms`
        });
      } else if (type === 'LOGGED_OUT') {
        console.log("%c[AuthTransition:LOGGED_OUT] User is unauthenticated (Guest)", "color: #d97706; font-weight: bold; font-size: 11px;", {
          elapsed: `${transitionRecord.elapsedMs}ms`
        });
      } else if (type === 'ID_TOKEN_REFRESH') {
        console.log("%c[AuthTransition:ID_TOKEN_REFRESH] ID Token refreshed", "color: #0284c7; font-weight: bold; font-size: 11px;", {
          email: transitionRecord.user?.email,
          tokenExpires: tokenMetadata?.expirationTime
        });
      } else if (type === 'AUTH_ERROR') {
        console.error("%c[AuthTransition:AUTH_ERROR] Auth listener error", "color: #dc2626; font-weight: bold; font-size: 12px;", {
          error: transitionRecord.error,
          networkOnline: transitionRecord.networkOnline
        });
      }
    };

    // 1. Primary onAuthStateChanged listener
    const unsubscribeAuth = onAuthStateChanged(
      auth,
      async (currentUser) => {
        if (currentUser) {
          otpLogger.logAuthListenerEvent(currentUser, true, "User authenticated state changed: LOGGED_IN");
          await logTransition('LOGGED_IN', currentUser);

          // Automatically sync the authenticated user profile with backend
          if (currentUser.email) {
            fetch('/api/user/sync-profile', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                email: currentUser.email,
                displayName: currentUser.displayName || 'Học viên',
                photoURL: currentUser.photoURL || ''
              })
            }).catch((err) => {
              console.warn("[AuthTransition] sync-profile notification note:", err);
            });
          }
        } else {
          otpLogger.logAuthListenerEvent(null, true, "User authenticated state changed: LOGGED_OUT");
          await logTransition('LOGGED_OUT', null);
        }

        if (currentUser) {
          setUser(currentUser);
        } else {
          const fastUser = getFastSessionUser();
          if (fastUser) {
            setUser(createSyntheticFirebaseUser(fastUser) as unknown as User);
          } else {
            setUser(null);
          }
        }
        setAuthResolved(true);
      },
      (authError) => {
        logTransition('AUTH_ERROR', null, authError);
        const fastUser = getFastSessionUser();
        if (fastUser) {
          setUser(createSyntheticFirebaseUser(fastUser) as unknown as User);
        }
        setAuthResolved(true); // Ensure UI never hangs indefinitely on auth error
      }
    );

    // Listener for custom fast session events
    const handleFastAuthChanged = () => {
      if (!auth.currentUser) {
        const fastUser = getFastSessionUser();
        if (fastUser) {
          setUser(createSyntheticFirebaseUser(fastUser) as unknown as User);
        } else {
          setUser(null);
        }
      }
    };
    window.addEventListener('fast_auth_changed', handleFastAuthChanged);

    // 2. Secondary onIdTokenChanged listener to track token refresh and session longevity
    const unsubscribeToken = onIdTokenChanged(
      auth,
      async (currentUser) => {
        if (currentUser) {
          await logTransition('ID_TOKEN_REFRESH', currentUser);
        }
      },
      (tokenError) => {
        logTransition('AUTH_ERROR', null, tokenError);
      }
    );

    return () => {
      console.log("[AuthTransition:Cleanup] Unsubscribing auth listeners...");
      unsubscribeAuth();
      unsubscribeToken();
      window.removeEventListener('fast_auth_changed', handleFastAuthChanged);
    };
  }, []);

  // DIAGNOSTIC HOOK: Logs Firebase Auth user states using the debugging utility
  useEffect(() => {
    authDebugger.debugAuthAndOtpSync(user, authResolved, false);
  }, [user, authResolved]);

  // OPTIMIZATION: Defer loading of heavy non-critical components (Chatbot)
  // until after the main content has likely finished loading (3 seconds delay).
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsDelayedLoaded(true);
    }, 3000);
    return () => clearTimeout(timer);
  }, []);

  const shouldHideBars = (isAccountPath && user) || isClassroomPath;
  const hideBarsTemporarily = isAccountPath && !authResolved;
  const showBars = !shouldHideBars && !hideBarsTemporarily;

  return (
    <div className="flex flex-col min-h-screen bg-background text-text transition-colors duration-300">
      <ToastContainer />
      <NetworkStatusNotifier />
      <LessonUpdateNotifier />
      <CourseUpdateNotifier />
      {showBars && <Header />}
      <main className="flex-grow">
        <Suspense fallback={<PageLoader />}>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/home" element={<Home />} />
            <Route path="/khoa-hoc" element={<Courses />} />
            <Route path="/khoa-hoc/:id" element={<CourseDetail />} />
            <Route path="/hoc/:courseId" element={<Classroom />} />
            <Route path="/hoc-bai/:courseId" element={<Classroom />} />
            <Route path="/tu-van" element={<Consulting />} />
            <Route path="/cam-nang" element={<Handbook />} />
            <Route path="/ve-chung-toi" element={<About />} />
            <Route path="/lien-he" element={<Contact />} />
            <Route path="/faq" element={<FAQ />} />
            <Route path="/account" element={<Account />} />
            <Route path="/teacher-dashboard" element={<Account />} />
            <Route path="/account/course/:courseId" element={<Account />} />
            <Route path="/account/settings" element={<AccountSettings />} />
            <Route path="/account/vip-upgrade" element={<VipUpgrade />} />
            <Route path="/dieu-khoan-su-dung" element={<TermsOfService />} />
            <Route path="/chinh-sach-bao-mat" element={<PrivacyPolicy />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Suspense>
      </main>
      
      {showBars && (
        <Suspense fallback={<div className="h-20 bg-gray-50 animate-pulse" />}>
          <Footer />
        </Suspense>
      )}
      
      {/* Các thành phần nổi (Floating) chỉ load sau khi trang đã ổn định */}
      {isDelayedLoaded && (
        <Suspense fallback={null}>
          <FloatingContact />
        </Suspense>
      )}
    </div>
  );
};

const App: React.FC = () => (
  <HelmetProvider>
    <ThemeProvider>
      <ToastProvider>
        <Router>
          <ScrollToTop />
          <AppLayout />
        </Router>
      </ToastProvider>
    </ThemeProvider>
  </HelmetProvider>
);

export default App;
