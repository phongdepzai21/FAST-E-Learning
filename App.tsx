
import React, { Suspense, lazy, useState, useEffect } from 'react';
import { HelmetProvider } from 'react-helmet-async';
// Migration: Switch from HashRouter to BrowserRouter for clean production URLs (e.g. /home) without #
import { BrowserRouter as Router, Routes, Route, useLocation, useNavigate } from "react-router-dom";
import { onAuthStateChanged, User } from 'firebase/auth';
import { auth, db } from './firebase';
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

    // Programmatically delete 'khoa-vip' from the database and from all user purchased collections
    const executeGlobalVipCleanup = async () => {
      try {
        const { doc, collection, getDocs, deleteDoc } = await import('firebase/firestore');
        
        // 1. Delete the course document itself from the global courses collection
        await deleteDoc(doc(db, 'courses', 'khoa-vip'));
        console.log('[Cleanup] Deleted courses/khoa-vip from database successfully.');

        // 2. Fetch all users and delete the VIP course from their subcollection
        const usersSnap = await getDocs(collection(db, 'users'));
        for (const userDoc of usersSnap.docs) {
          const userEmail = userDoc.id;
          if (userEmail) {
            await deleteDoc(doc(db, 'users', userEmail, 'purchased_courses', 'khoa-vip'));
          }
        }
        console.log('[Cleanup] Deleted khoa-vip from all user accounts.');

        // 3. Clear local storage cache for the current user
        try {
          localStorage.removeItem('course_unlocked_khoa-vip');
        } catch (e) {}
      } catch (err) {
        console.warn('[Cleanup] Error executing VIP course global deletion:', err);
      }
    };
    executeGlobalVipCleanup();
  }, []);

  useEffect(() => {
    console.log("[AuthListener] Initializing Firebase Auth listener...");
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      if (currentUser) {
        otpLogger.logAuthListenerEvent(currentUser, true, "User authenticated state changed: LOGGED_IN");
        console.log("[AuthListener] User authenticated state changed: LOGGED_IN", {
          uid: currentUser.uid,
          email: currentUser.email,
          displayName: currentUser.displayName,
          emailVerified: currentUser.emailVerified
        });

        // Automatically sync the authenticated user with Firestore via server-side Admin SDK
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
            console.warn("AuthListener sync-profile fetch warning:", err);
          });
        }
      } else {
        otpLogger.logAuthListenerEvent(null, true, "User authenticated state changed: LOGGED_OUT");
        console.log("[AuthListener] User authenticated state changed: LOGGED_OUT");
      }
      setUser(currentUser);
      setAuthResolved(true);
      console.log("[AuthListener] authResolved set to true.");
    });
    return () => {
      console.log("[AuthListener] Cleaning up Firebase Auth listener...");
      unsubscribe();
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
