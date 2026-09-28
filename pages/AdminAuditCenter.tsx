import React, { useState, useEffect, useRef } from 'react';
import { Helmet } from 'react-helmet-async';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { onAuthStateChanged, User } from 'firebase/auth';
import { doc, onSnapshot } from 'firebase/firestore';
import { auth, db } from '../firebase';
import { ADMIN_EMAILS, TEACHER_EMAILS } from '../constants';
import { Breadcrumbs } from '../components/Breadcrumbs';

// Import our 3 high-fidelity auditing components
import { FastStandardsAudit } from '../components/FastStandardsAudit';
import { FastFoodSafetyManagement } from '../components/FastFoodSafetyManagement';
import { AdProfileManagement } from '../components/AdProfileManagement';

import { 
  ShieldCheck, 
  Lock, 
  ArrowLeft,
  ChevronRight,
  Bell
} from 'lucide-react';

interface UserProfile {
  uid: string;
  email: string;
  name: string;
  avatar: string;
  isAdmin: boolean;
  isTeacher: boolean;
  isVip: boolean;
  isLocked: boolean;
  lockReason?: string;
  lockedAt?: string;
}

const AdminAuditCenter: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [activeTab, setActiveTab] = useState<'fsa' | 'attp' | 'hsqc'>('fsa');
  const [user, setUser] = useState<UserProfile | null>(null);
  const [checkingAuth, setCheckingAuth] = useState<boolean>(true);
  const [isSidebarHovered, setIsSidebarHovered] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, async (currentUser) => {
      if (!currentUser) {
        setUser(null);
        setCheckingAuth(false);
        return;
      }

      const userEmail = (currentUser.email || '').toLowerCase().trim();
      const isHardcodedAdmin = ADMIN_EMAILS.some(e => e.toLowerCase() === userEmail);
      const isHardcodedTeacher = TEACHER_EMAILS.some(e => e.toLowerCase() === userEmail);

      // Real-time listener on user doc to stay consistent with Account.tsx
      const userDocRef = doc(db, 'users', userEmail);
      const unsubDoc = onSnapshot(userDocRef, (userDocSnap) => {
        let isVipStatus = false;
        let isAdminStatus = isHardcodedAdmin;
        let isTeacherStatus = isHardcodedTeacher || isHardcodedAdmin;
        let isLockedStatus = false;
        let lockReason = '';
        let lockedAt = '';

        if (userDocSnap.exists()) {
          const userData = userDocSnap.data();
          isVipStatus = userData.isVip === true;
          isAdminStatus = userData.isAdmin === true || isHardcodedAdmin;
          isTeacherStatus = userData.isTeacher === true || isAdminStatus || isHardcodedTeacher;
          isLockedStatus = userData.isLocked === true;
          lockReason = userData.lockReason || '';
          lockedAt = userData.lockedAt || '';
        }

        // Apply Developer Role Override for dev environment consistency
        const overrideRole = localStorage.getItem('dev_role_override');
        if (overrideRole === 'Admin' || overrideRole === 'Owner') {
          isAdminStatus = true;
          isTeacherStatus = true;
        } else if (overrideRole === 'Teacher') {
          isTeacherStatus = true;
        }

        setUser({
          uid: currentUser.uid,
          email: userEmail,
          name: currentUser.displayName || 'Học viên',
          avatar: currentUser.photoURL || '',
          isAdmin: isAdminStatus,
          isTeacher: isTeacherStatus,
          isVip: isVipStatus,
          isLocked: isLockedStatus,
          lockReason,
          lockedAt
        });
        setCheckingAuth(false);
      }, (err) => {
        console.warn('[AdminAuditCenter] Error sub to user doc:', err);
        setCheckingAuth(false);
      });

      return () => unsubDoc();
    });

    return () => unsubscribeAuth();
  }, []);

  // Close custom profile menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  if (checkingAuth) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center space-y-4">
        <div className="w-10 h-10 border-4 border-[#007c76] border-t-transparent rounded-full animate-spin"></div>
        <p className="text-gray-400 font-bold tracking-widest text-xs uppercase">Đang đồng bộ dữ liệu...</p>
      </div>
    );
  }

  // Secure locked page
  if (user && user.isLocked) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-3xl p-8 border border-red-100 shadow-2xl text-center space-y-6 animate-in zoom-in-95 duration-300">
          <div className="w-20 h-20 rounded-3xl bg-red-50 text-red-600 flex items-center justify-center mx-auto border-2 border-red-100">
            <Lock className="w-10 h-10" />
          </div>
          <div className="space-y-2">
            <h2 className="text-2xl font-black text-gray-900 tracking-tight">Tài khoản tạm thời bị khóa</h2>
            <p className="text-sm font-medium text-gray-500 leading-relaxed">
              Tài khoản <span className="font-bold text-gray-800">{user.email}</span> đã bị khóa quyền truy cập.
            </p>
          </div>
          <div className="pt-2 flex flex-col gap-3">
            <button
              onClick={() => auth.signOut()}
              className="w-full py-3.5 bg-gray-900 hover:bg-black text-white font-black text-xs uppercase tracking-wider rounded-2xl transition-all shadow-md cursor-pointer"
            >
              Đăng xuất tài khoản
            </button>
            <Link
              to="/"
              className="w-full py-3 bg-gray-100 hover:bg-gray-200 text-gray-600 font-bold text-xs uppercase tracking-wider rounded-2xl transition-all"
            >
              Quay về trang chủ
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Access Denied if not logged in or not admin
  if (!user || !user.isAdmin) {
    return (
      <main className="min-h-screen bg-gray-50 flex items-center justify-center p-6 relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_40%,rgba(239,68,68,0.04),transparent)] pointer-events-none"></div>
        <Helmet>
          <title>Giới Hạn Truy Cập | FAST Audit Center</title>
        </Helmet>

        <div className="bg-white border border-gray-100 rounded-[40px] p-8 md:p-12 max-w-lg w-full text-center space-y-6 shadow-xl relative z-10 animate-fade-in">
          <div className="w-20 h-20 bg-rose-500/10 border border-rose-500/20 text-rose-500 rounded-full flex items-center justify-center mx-auto shadow-lg shadow-rose-500/5 animate-pulse">
            <Lock className="w-10 h-10" />
          </div>

          <div className="space-y-2">
            <h1 className="text-xl md:text-2xl font-black text-gray-800 uppercase tracking-tight">Khu Vực Giới Hạn</h1>
            <p className="text-gray-500 text-sm leading-relaxed font-semibold">
              Hệ thống Kiểm toán chuyên sâu (FSA, ATTP & HSQC Center) chỉ dành cho thành viên Quản trị viên của FAST Consulting.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 pt-2">
            <button 
              onClick={() => navigate('/')} 
              className="flex-1 py-3.5 bg-gray-100 hover:bg-gray-200 text-gray-600 font-bold rounded-2xl text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
              Trang Chủ
            </button>
            <button 
              onClick={() => navigate('/account')} 
              className="flex-1 py-3.5 bg-[#007c76] hover:bg-[#005f5a] text-white font-black rounded-2xl text-xs uppercase tracking-wider transition-all shadow-lg shadow-[#007c76]/10 flex items-center justify-center gap-2 cursor-pointer"
            >
              Đăng Nhập Admin
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </main>
    );
  }

  // Layout parameters matching Account.tsx exactly
  const isExpanded = isSidebarHovered;
  const isVip = user.isVip;
  const isAdmin = user.isAdmin;
  const isTeacher = user.isTeacher;

  const avatarConfig = {
    borderClass: isVip ? 'border-amber-400 shadow-md shadow-amber-500/10' : 'border-gray-200',
    statusColor: isVip ? 'text-amber-500 font-black' : 'text-gray-400 font-bold',
    statusText: isVip ? 'Học viên VIP' : 'Học viên',
    fallbackBg: isVip ? 'bg-gradient-to-br from-amber-400 to-amber-600 text-white' : 'bg-gray-100 text-[#007c76]'
  };

  const handleSidebarNav = (tabId: string) => {
    navigate('/account', { state: { tab: tabId } });
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] print:bg-white flex animate-fade-in overflow-hidden print:overflow-visible">
      <Helmet>
        <title>Hệ Thống Kiểm Toán & Quản Lý Hồ Sơ | FAST Admin</title>
      </Helmet>

      {/* --- EXACT REPLICA OF THE ACCOUNT SIDEBAR --- */}
      <aside 
        onMouseEnter={() => setIsSidebarHovered(true)}
        onMouseLeave={() => setIsSidebarHovered(false)}
        className={`print:hidden hidden lg:flex flex-col shrink-0 bg-white border-r border-gray-150 transition-all duration-300 ease-in-out relative z-30 select-none ${
          isSidebarHovered ? 'w-72 shadow-2xl ring-1 ring-black/5' : 'w-20 shadow-xs'
        }`}
      >
        <div className={`transition-all duration-300 ${!isExpanded ? 'p-3' : 'p-8'}`}>
          {!isExpanded ? (
            <div className="mb-6 flex flex-col items-center justify-center pt-2">
              <div 
                className="w-10 h-10 rounded-2xl bg-teal-50 border border-teal-200/80 flex items-center justify-center text-[#007c76] cursor-pointer hover:bg-teal-100 transition-colors shadow-2xs group"
                title="Lia chuột vào để mở rộng thanh điều hướng"
              >
                <svg className="w-5 h-5 text-[#007c76] group-hover:scale-110 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </div>
            </div>
          ) : (
            <Link to="/" className="mb-10 block">
              {/* Logo placeholder */}
            </Link>
          )}
          
          <nav className="space-y-1.5">
            {[
              { id: 'dashboard', label: 'Bảng điều khiển', icon: 'M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z' },
              { id: 'my-courses', label: 'Khóa học của tôi', icon: 'M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253' },
              { id: 'badges', label: 'Huy hiệu vinh danh', icon: 'M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z' },
              { id: 'buy-courses', label: 'Mua khóa học', icon: 'M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z' },
              { id: 'purchase-history', label: 'Lịch sử mua hàng', icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01' },
              { id: 'settings', label: 'Cài đặt tài khoản', icon: 'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z' },
              ...(isTeacher || isAdmin ? [
                { id: 'teacher-dashboard', label: 'Quản lý bài giảng', icon: 'M12 4v16m8-8H4' },
                { id: 'combo-management', label: 'Quản lý combo', icon: 'M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10' },
                { id: 'user-management', label: 'Quản lý tài khoản', icon: 'M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z' }
              ] : []),
              ...(isAdmin ? [
                { id: 'admin-audit-center', label: 'Hệ thống Kiểm toán', icon: 'M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z', isCurrentPage: true }
              ] : [])
            ].map((item) => {
              const isActive = item.isCurrentPage === true;
              return (
                <button 
                  key={item.id} 
                  title={!isExpanded ? item.label : undefined}
                  onClick={() => {
                    if (isActive) return;
                    handleSidebarNav(item.id);
                  }}
                  className={`w-full flex items-center rounded-2xl font-bold text-sm transition-all cursor-pointer ${
                    !isExpanded ? 'justify-center p-3.5' : 'gap-4 px-5 py-3.5'
                  } ${isActive ? 'bg-[#007c76]/10 text-[#007c76] shadow-xs' : 'text-gray-500 hover:bg-gray-50 hover:text-[#007c76]'}`}
                >
                  <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d={item.icon} /></svg>
                  {isExpanded && <span className="whitespace-nowrap overflow-hidden text-ellipsis">{item.label}</span>}
                </button>
              );
            })}
          </nav>
        </div>
        
        <div className={`mt-auto border-t border-gray-100 transition-all duration-300 ${!isExpanded ? 'p-3 flex justify-center' : 'p-6'}`}>
          {!isExpanded ? (
            <div 
              title={isVip ? "Thành viên VIP FAST" : "Nâng cấp VIP"}
              className={`w-10 h-10 rounded-2xl flex items-center justify-center cursor-pointer shadow-xs ${
                isVip ? 'bg-gradient-to-br from-amber-400 to-amber-600 text-white' : 'bg-[#007c76] text-white'
              }`}
            >
              <span className="text-base">{isVip ? '⭐' : '👑'}</span>
            </div>
          ) : (
            <div className="bg-[#007c76] rounded-[24px] p-6 text-white text-center shadow-lg shadow-[#007c76]/20">
              <p className="text-xs font-black uppercase tracking-widest mb-1">Thành viên</p>
              <p className="text-[10px] opacity-90">Khám phá tri thức cùng FAST</p>
            </div>
          )}
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto custom-scrollbar bg-[#f8fafc] print:bg-white print:overflow-visible print:p-0 print:m-0">
        
        {/* --- EXACT REPLICA OF THE ACCOUNT HEADER --- */}
        <header className="print:hidden bg-white/80 backdrop-blur-md sticky top-0 z-40 px-6 py-4 flex items-center justify-between border-b border-gray-100">
          <div className="flex items-center gap-4 lg:hidden print:hidden">
            <select 
              value="admin-audit-center" 
              onChange={(e) => {
                if (e.target.value !== 'admin-audit-center') {
                  handleSidebarNav(e.target.value);
                }
              }}
              className="bg-gray-50 border border-gray-200 text-gray-800 text-sm font-bold rounded-xl focus:ring-[#005c56] focus:border-[#005c56] block w-full p-2.5 outline-none"
            >
              <option value="dashboard">Bảng điều khiển</option>
              <option value="my-courses">Khóa học của tôi</option>
              <option value="badges">Huy hiệu vinh danh</option>
              <option value="buy-courses">Mua khóa học</option>
              <option value="purchase-history">Lịch sử mua hàng</option>
              <option value="settings">Cài đặt tài khoản</option>
              {(isTeacher || isAdmin) && <option value="teacher-dashboard">Quản lý bài giảng</option>}
              {(isTeacher || isAdmin) && <option value="combo-management">Quản lý combo</option>}
              {(isTeacher || isAdmin) && <option value="user-management">Quản lý tài khoản</option>}
              {isAdmin && <option value="admin-audit-center">➜ Hệ thống Kiểm toán (FSA • ATTP • HSQC)</option>}
            </select>
          </div>
          
          <div className="hidden md:flex items-center bg-gray-100 rounded-full px-5 py-2.5 w-full max-w-md">
            <svg className="w-4 h-4 text-gray-400 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
            <input type="text" placeholder="Tìm kiếm bài học..." className="bg-transparent border-none outline-none text-sm font-medium w-full" />
          </div>

          <div className="flex items-center gap-3 sm:gap-5">
            <div className="text-right hidden sm:block">
              <p className="text-sm font-black text-gray-800 leading-none">{user.name || 'Học viên'}</p>
              <p className={`text-[10px] font-bold uppercase mt-1 ${avatarConfig.statusColor}`}>
                {avatarConfig.statusText} • ID: #FAST-{(user.email || '').split('@')[0] || 'USER'}
              </p>
            </div>
            
            <div className="relative" ref={menuRef}>
              <button 
                onClick={() => setIsMenuOpen(!isMenuOpen)}
                className="flex items-center gap-3 group"
              >
                <div className={`w-10 h-10 md:w-12 md:h-12 rounded-full border-2 p-0.5 overflow-hidden transition-all ${avatarConfig.borderClass}`}>
                  {user.avatar ? (
                    <img src={user.avatar} className="w-full h-full rounded-full object-cover" alt="Avatar" />
                  ) : (
                    <div className={`w-full h-full rounded-full flex items-center justify-center font-black text-xs md:text-sm ${avatarConfig.fallbackBg}`}>
                      {(user.name || 'H').charAt(0)}
                    </div>
                  )}
                </div>
              </button>

              {isMenuOpen && (
                <div className="absolute right-0 mt-3 w-56 bg-white rounded-2xl shadow-xl border border-gray-100 py-2.5 z-50 animate-in slide-in-from-top-3 duration-200">
                  <button 
                    onClick={() => { setIsMenuOpen(false); handleSidebarNav('dashboard'); }} 
                    className="w-full px-5 py-3 text-left text-sm font-bold text-gray-700 hover:bg-gray-50 flex items-center gap-3 cursor-pointer"
                  >
                    Bảng điều khiển
                  </button>
                  <button 
                    onClick={() => { setIsMenuOpen(false); handleSidebarNav('settings'); }} 
                    className="w-full px-5 py-3 text-left text-sm font-bold text-gray-700 hover:bg-gray-50 flex items-center gap-3 cursor-pointer"
                  >
                    Cài đặt tài khoản
                  </button>
                  <div className="border-t border-gray-100 my-2"></div>
                  <button 
                    onClick={async () => {
                      setIsMenuOpen(false);
                      await auth.signOut();
                      navigate('/');
                    }}
                    className="w-full px-5 py-3 text-left text-sm font-bold text-red-600 hover:bg-red-50 flex items-center gap-3 cursor-pointer"
                  >
                    Đăng xuất
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* --- ACTUAL PAGE CONTENT WRAPPED IN PREMIUM DASHBOARD BODY LAYOUT --- */}
        <div className="p-6 md:p-10 space-y-8 max-w-7xl mx-auto">
          
          {/* Breadcrumbs for navigation navigation */}
          <div className="flex items-center justify-between">
            <Breadcrumbs theme="light" items={[{ label: 'Trang chủ', path: '/' }, { label: 'Tài khoản', path: '/account' }, { label: 'Hệ thống Kiểm toán' }]} />
          </div>

          {/* Module Title Banner */}
          <div className="bg-slate-900 rounded-[32px] p-6 md:p-8 text-white relative overflow-hidden shadow-lg border border-slate-800">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_120%,rgba(0,124,118,0.25),transparent)] pointer-events-none"></div>
            <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
              <div className="space-y-2">
                <span className="text-xs font-black uppercase tracking-widest text-emerald-400 bg-emerald-950/40 px-3 py-1 rounded-full border border-emerald-800/40 inline-block">
                  Phân Hệ Quản Trị Viên (Admin Audit Portal)
                </span>
                <h1 className="text-2xl md:text-3xl font-black uppercase tracking-tight">Hệ Thống Kiểm Toán & Hồ Sơ</h1>
                <p className="text-xs md:text-sm text-slate-400 font-semibold max-w-2xl">
                  Bảng quản trị tập trung ba phân hệ: Đánh giá audit (FSA), kiểm soát hồ sơ An toàn thực phẩm (ATTP), và phê duyệt chất lượng QC.
                </p>
              </div>
              <div className="bg-slate-950/50 border border-slate-800 rounded-2xl p-4 flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#007c76]/10 text-[#007c76] flex items-center justify-center font-extrabold">
                  3
                </div>
                <div>
                  <span className="block text-[9px] font-black uppercase text-slate-500">Mô-đun Quản lý</span>
                  <span className="text-xs font-bold text-white">FSA • ATTP • QC</span>
                </div>
              </div>
            </div>
          </div>

          {/* Tab Selection Switcher inside Content */}
          <div className="bg-white border border-gray-100 rounded-3xl p-3 flex flex-col sm:flex-row gap-3 shadow-xs">
            {[
              { id: 'fsa', label: '📋 FSA-Checklist', desc: 'Đánh giá audit chuẩn ISO/HACCP' },
              { id: 'attp', label: '🛡️ Hồ sơ ATTP', desc: 'Xét duyệt hồ sơ An toàn TP' },
              { id: 'hsqc', label: '💼 Hồ sơ Quảng cáo / QC', desc: 'Phê duyệt hồ sơ quảng cáo QC' }
            ].map((tab) => {
              const isSelected = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`flex-1 p-4 rounded-2xl border text-left transition-all duration-300 cursor-pointer ${
                    isSelected 
                      ? 'bg-[#007c76]/10 border-[#007c76] text-[#007c76] ring-1 ring-[#007c76]/20' 
                      : 'bg-slate-50/50 border-gray-100 hover:bg-gray-50 text-gray-500'
                  }`}
                >
                  <span className="block font-black text-xs md:text-sm uppercase tracking-wide">{tab.label}</span>
                  <span className={`text-[10px] block mt-0.5 font-bold ${isSelected ? 'text-[#005c56]' : 'text-gray-400'}`}>
                    {tab.desc}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Render selected Audit component with clean spacing */}
          <div className="bg-white border border-gray-150 rounded-[40px] p-6 md:p-10 shadow-sm min-h-[450px]">
            {activeTab === 'fsa' && (
              <div className="space-y-4 animate-fade-in">
                <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-100/50 flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
                  <div>
                    <h4 className="text-sm font-black text-emerald-800 uppercase tracking-wide">Mô-đun: Fast Standards Audit (FSA)</h4>
                    <p className="text-xs text-emerald-600 font-medium">Bảng đánh giá kiểm toán quy trình sản xuất theo chuẩn ISO 22000, HACCP.</p>
                  </div>
                  <span className="text-[10px] font-black uppercase tracking-widest text-emerald-700 bg-emerald-100 px-3 py-1.5 rounded-xl border border-emerald-200">System Ready</span>
                </div>
                <FastStandardsAudit />
              </div>
            )}

            {activeTab === 'attp' && (
              <div className="space-y-4 animate-fade-in">
                <div className="p-4 bg-amber-50 rounded-2xl border border-amber-100/50 flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
                  <div>
                    <h4 className="text-sm font-black text-amber-800 uppercase tracking-wide">Mô-đun: Hồ sơ ATTP (An Toàn Thực Phẩm)</h4>
                    <p className="text-xs text-amber-600 font-medium">Cập nhật, phê duyệt và xử lý hồ sơ pháp lý, giấy phép ATTP cho cơ sở.</p>
                  </div>
                  <span className="text-[10px] font-black uppercase tracking-widest text-amber-700 bg-amber-100 px-3 py-1.5 rounded-xl border border-amber-200">System Ready</span>
                </div>
                <FastFoodSafetyManagement />
              </div>
            )}

            {activeTab === 'hsqc' && (
              <div className="space-y-4 animate-fade-in">
                <div className="p-4 bg-cyan-50 rounded-2xl border border-cyan-100/50 flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
                  <div>
                    <h4 className="text-sm font-black text-cyan-800 uppercase tracking-wide">Mô-đun: Hồ sơ Quảng cáo / QC</h4>
                    <p className="text-xs text-cyan-600 font-medium">Theo dõi kiểm nghiệm chất lượng, sản xuất và tự công bố sản phẩm, phê duyệt quảng cáo.</p>
                  </div>
                  <span className="text-[10px] font-black uppercase tracking-widest text-cyan-700 bg-cyan-100 px-3 py-1.5 rounded-xl border border-cyan-200">System Ready</span>
                </div>
                <AdProfileManagement />
              </div>
            )}
          </div>

        </div>
      </main>
    </div>
  );
};

export default AdminAuditCenter;
