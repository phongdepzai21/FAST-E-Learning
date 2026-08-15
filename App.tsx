
import React, { Suspense, lazy, useState, useEffect } from 'react';
// Fix: Clean named exports for HashRouter, Routes, Route, and useLocation
import { HashRouter as Router, Routes, Route, useLocation } from "react-router-dom";
import { onAuthStateChanged, User } from 'firebase/auth';
import { auth } from './firebase';
import Header from './components/Header';
import ScrollToTop from './components/ScrollToTop';
import { ThemeProvider } from './contexts/ThemeContext';
import { ToastProvider } from './contexts/ToastContext';
import { ToastContainer } from './components/ToastContainer';
// Direct import for Critical LCP Page
import Home from './pages/Home'; 

// Lazy load các trang con để giảm bundle size ban đầu
const Courses = lazy(() => import('./pages/Courses'));
const CourseDetail = lazy(() => import('./pages/CourseDetail'));
const About = lazy(() => import('./pages/About'));
const Contact = lazy(() => import('./pages/Contact'));
const Consulting = lazy(() => import('./pages/Consulting'));
const Handbook = lazy(() => import('./pages/Handbook'));
const Account = lazy(() => import('./pages/Account'));
const AccountSettings = lazy(() => import('./pages/AccountSettings'));
const VipUpgrade = lazy(() => import('./pages/VipUpgrade'));
const TermsOfService = lazy(() => import('./pages/TermsOfService'));
const PrivacyPolicy = lazy(() => import('./pages/PrivacyPolicy'));
const Classroom = lazy(() => import('./pages/Classroom'));

// Lazy load Components phụ trợ & Footer
const FloatingContact = lazy(() => import('./components/FloatingContact'));
const Footer = lazy(() => import('./components/Footer'));

// Loading Fallback Component
const PageLoader = () => (
  <div className="min-h-[60vh] flex flex-col items-center justify-center space-y-4">
    <div className="w-10 h-10 border-4 border-[#007c76] border-t-transparent rounded-full animate-spin"></div>
    <div className="font-bold text-gray-400 text-sm tracking-widest uppercase">Đang tải...</div>
  </div>
);

const AppLayout: React.FC = () => {
  const location = useLocation();
  const isAccountPath = location.pathname.startsWith('/account');
  const isClassroomPath = location.pathname.startsWith('/hoc');
  const [isDelayedLoaded, setIsDelayedLoaded] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [authResolved, setAuthResolved] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setAuthResolved(true);
    });
    return () => unsubscribe();
  }, []);

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
      {showBars && <Header />}
      <main className="flex-grow">
        <Suspense fallback={<PageLoader />}>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/khoa-hoc" element={<Courses />} />
            <Route path="/khoa-hoc/:id" element={<CourseDetail />} />
            <Route path="/hoc/:courseId" element={<Classroom />} />
            <Route path="/hoc-bai/:courseId" element={<Classroom />} />
            <Route path="/tu-van" element={<Consulting />} />
            <Route path="/cam-nang" element={<Handbook />} />
            <Route path="/ve-chung-toi" element={<About />} />
            <Route path="/lien-he" element={<Contact />} />
            <Route path="/account" element={<Account />} />
            <Route path="/account/course/:courseId" element={<Account />} />
            <Route path="/account/settings" element={<AccountSettings />} />
            <Route path="/account/vip-upgrade" element={<VipUpgrade />} />
            <Route path="/dieu-khoan-su-dung" element={<TermsOfService />} />
            <Route path="/chinh-sach-bao-mat" element={<PrivacyPolicy />} />
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
  <ThemeProvider>
    <ToastProvider>
      <Router>
        <ScrollToTop />
        <AppLayout />
      </Router>
    </ToastProvider>
  </ThemeProvider>
);

export default App;
