import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from "react-router-dom";
import { onAuthStateChanged, User } from 'firebase/auth';
import { collection, onSnapshot, doc } from 'firebase/firestore';
import { auth, db } from '../firebase';
import { NAV_LINKS, ADMIN_EMAILS, TEACHER_EMAILS } from '../constants';

const Header: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [logoError, setLogoError] = useState(false);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<{ name: string; avatar: string } | null>(null);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isVip, setIsVip] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isTeacher, setIsTeacher] = useState(false);

  useEffect(() => {
    let unsubs: Array<() => void> = [];

    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      // Clean up previous listeners
      unsubs.forEach(u => u());
      unsubs = [];

      setCurrentUser(user);
      if (user && user.email) {
        const normalizedEmail = user.email.toLowerCase();
        
        let localIsVip = false;
        let localIsAdmin = ADMIN_EMAILS.includes(normalizedEmail);
        let localIsTeacher = TEACHER_EMAILS.includes(normalizedEmail);

        try {
          const localRolesStr = localStorage.getItem(`user_roles_${normalizedEmail}`);
          if (localRolesStr) {
            const localRoles = JSON.parse(localRolesStr);
            if (localRoles.isVip) localIsVip = true;
            if (localRoles.isAdmin) localIsAdmin = true;
            if (localRoles.isTeacher) localIsTeacher = true;
          }
        } catch (e) {}

        setIsVip(localIsVip);
        setIsAdmin(localIsAdmin);
        setIsTeacher(localIsTeacher);

        // Real-time listener for user document roles
        let currentIsVip = localIsVip;
        let currentIsAdmin = localIsAdmin;
        let currentIsTeacher = localIsTeacher;

        const unsubUserDoc = onSnapshot(doc(db, "users", normalizedEmail), (docSnap) => {
          if (docSnap.exists()) {
            const data = docSnap.data();
            if (data.isVip !== undefined) {
              currentIsVip = !!data.isVip;
              setIsVip(!!data.isVip);
            }
            if (data.isAdmin !== undefined) {
              currentIsAdmin = !!data.isAdmin || ADMIN_EMAILS.includes(normalizedEmail);
              setIsAdmin(!!data.isAdmin || ADMIN_EMAILS.includes(normalizedEmail));
            }
            if (data.isTeacher !== undefined) {
              currentIsTeacher = !!data.isTeacher || TEACHER_EMAILS.includes(normalizedEmail);
              setIsTeacher(!!data.isTeacher || TEACHER_EMAILS.includes(normalizedEmail));
            }
            setUserProfile({
              name: data.fullName || data.name || user.displayName || 'Học viên',
              avatar: data.avatar || user.photoURL || ''
            });
          } else {
            setUserProfile({
              name: user.displayName || 'Học viên',
              avatar: user.photoURL || ''
            });
          }
        }, () => {});
        unsubs.push(unsubUserDoc);

        // Real-time listener for purchased courses VIP check
        const unsubPurchased = onSnapshot(collection(db, "users", normalizedEmail, "purchased_courses"), (snap) => {
          const isVipDoc = snap.docs.some(d => d.id === 'vip-lifetime-access');
          if (isVipDoc) {
            setIsVip(true);
          }
        }, () => {});
        unsubs.push(unsubPurchased);

        // Listen to local user_roles_updated
        const handleLocalRoleUpdate = () => {
          try {
            const str = localStorage.getItem(`user_roles_${normalizedEmail}`);
            if (str) {
              const r = JSON.parse(str);
              if (r.isVip !== undefined) setIsVip(!!r.isVip);
              if (r.isAdmin !== undefined) setIsAdmin(!!r.isAdmin);
              if (r.isTeacher !== undefined) setIsTeacher(!!r.isTeacher);
            }
          } catch (e) {}
        };
        window.addEventListener('user_roles_updated', handleLocalRoleUpdate);
        window.addEventListener('storage', handleLocalRoleUpdate);
        unsubs.push(() => {
          window.removeEventListener('user_roles_updated', handleLocalRoleUpdate);
          window.removeEventListener('storage', handleLocalRoleUpdate);
        });
      } else {
        setUserProfile(null);
        setIsVip(false);
        setIsAdmin(false);
        setIsTeacher(false);
      }
    });

    return () => {
      unsubscribeAuth();
      unsubs.forEach(u => u());
    };
  }, []);

  const isAccountPage = location.pathname.startsWith('/account');

  const toggleMenu = () => setIsMenuOpen(!isMenuOpen);

  const handleLogoClick = (e: React.MouseEvent) => {
    if (location.pathname === '/') {
      e.preventDefault();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      navigate('/');
    }
  };

  const handleLogout = async () => {
    await auth.signOut();
    setIsDropdownOpen(false);
    navigate('/');
  };

  const avatarConfig = {
    borderClass: isAdmin 
      ? 'border-blue-500/40 ring-2 ring-blue-100' 
      : isTeacher 
        ? 'border-indigo-500/40 ring-2 ring-indigo-100' 
        : isVip 
          ? 'border-amber-400/50 ring-2 ring-amber-100' 
          : 'border-teal-500/30',
    fallbackBg: isAdmin 
      ? 'bg-blue-500 text-white' 
      : isTeacher 
        ? 'bg-indigo-500 text-white' 
        : isVip 
          ? 'bg-amber-400 text-white' 
          : 'bg-[#007c76] text-white',
  };

  const logoUrl = "https://www.dropbox.com/scl/fi/fnnr149ucl9nymrqhchit/logonoback.png?rlkey=1h1g4j7b7d6csa3833vi1iado&st=5non0qck&dl=0";

  return (
    <header className="bg-white/85 backdrop-blur-md sticky top-0 z-[100] border-b border-gray-150/80 shadow-xs transition-all duration-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16 md:h-20">
          {/* Logo */}
          <div className="flex-shrink-0 flex items-center">
            <Link to="/" onClick={handleLogoClick} className="flex items-center group">
              {!logoError ? (
                <img 
                  src={logoUrl} 
                  alt="FAST Logo" 
                  className="h-12 md:h-20 w-auto object-contain transition-transform group-hover:scale-105"
                  onError={() => setLogoError(true)}
                  loading="eager"
                />
              ) : (
                <div className="flex flex-col">
                  <span className="text-lg md:text-xl font-black text-primary tracking-tighter leading-none">FAST</span>
                  <span className="text-[9px] font-bold text-text-muted tracking-widest uppercase">E-Learning</span>
                </div>
              )}
            </Link>
          </div>
          
          {/* Right Side Navigation and Profile Menu */}
          <div className="flex items-center gap-4 md:gap-6">
            {/* Desktop Navigation Links */}
            <nav className="hidden xl:flex items-center space-x-6">
              {NAV_LINKS.map((link) => {
                const isActive = location.pathname === link.path;
                return (
                  <Link
                    key={link.path}
                    to={link.path}
                    className={`${
                      isActive 
                        ? 'text-primary font-black border-b-2 border-primary' 
                        : 'text-text-muted hover:text-primary font-bold'
                    } text-xs py-1 transition-all duration-200 uppercase tracking-wider flex items-center gap-2`}
                  >
                    {link.label}
                  </Link>
                );
              })}
            </nav>

            {/* Profile Dropdown & Notifications (System Style) - Only shown on Account pages as requested */}
            {currentUser && isAccountPage ? (
              <div className="flex items-center gap-3 sm:gap-4 border-l border-gray-150 pl-3 sm:pl-4">
                <div className="relative">
                  <button 
                    onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                    className="flex items-center gap-2.5 group focus:outline-none focus:ring-0"
                  >
                    <div className="text-right hidden md:block">
                      <p className="text-xs font-black text-gray-800 leading-none">{userProfile?.name || 'Học viên'}</p>
                      <p className="text-[9px] font-bold text-text-muted uppercase mt-0.5">
                        ID: #FAST-{(currentUser.email || '').split('@')[0] || 'USER'}
                      </p>
                    </div>
                    
                    <div className={`w-8 h-8 rounded-full border overflow-hidden p-0.5 transition-all ${avatarConfig.borderClass}`}>
                      {userProfile?.avatar ? (
                        <img src={userProfile.avatar} className="w-full h-full rounded-full object-cover" alt="Avatar" />
                      ) : (
                        <div className={`w-full h-full rounded-full flex items-center justify-center font-black text-xs ${avatarConfig.fallbackBg}`}>
                          {userProfile?.name ? userProfile.name.charAt(0).toUpperCase() : 'H'}
                        </div>
                      )}
                    </div>
                  </button>

                  {isDropdownOpen && (
                    <div className="absolute right-0 mt-3 w-56 bg-white rounded-2xl shadow-2xl border border-gray-100 py-2.5 z-[110] animate-in fade-in slide-in-from-top-2 duration-150">
                      <div className="px-4 py-2 border-b border-gray-50 md:hidden">
                        <p className="text-xs font-black text-gray-800 leading-none">{userProfile?.name || 'Học viên'}</p>
                        <p className="text-[9px] font-bold text-gray-400 mt-1 uppercase">ID: #FAST-{(currentUser.email || '').split('@')[0] || 'USER'}</p>
                      </div>
                      <button 
                        onClick={() => { setIsDropdownOpen(false); navigate('/account'); }} 
                        className="w-full px-4 py-2 text-left text-xs font-bold text-gray-600 hover:bg-gray-50 hover:text-primary transition-all flex items-center gap-2"
                      >
                        Bảng điều khiển
                      </button>
                      <button 
                        onClick={handleLogout} 
                        className="w-full px-4 py-2 text-left text-xs font-bold text-red-500 hover:bg-red-50 transition-all flex items-center gap-2"
                      >
                        Đăng xuất
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ) : null}

            {/* Hamburger Button for Mobile */}
            <div className="xl:hidden flex items-center">
              <button 
                onClick={toggleMenu}
                className="p-1.5 text-text hover:bg-gray-100 rounded-lg transition-colors focus:outline-none"
                aria-label="Toggle Menu"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  {isMenuOpen ? (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" />
                  ) : (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M4 6h16M4 12h16M4 18h16" />
                  )}
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Navigation Menu */}
      {isMenuOpen && (
        <div className="xl:hidden bg-white border-b border-gray-150 absolute w-full shadow-xl z-50 animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="px-4 pt-3 pb-6 space-y-1.5">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.path}
                to={link.path}
                onClick={() => setIsMenuOpen(false)}
                className="block px-4 py-2.5 text-sm font-bold text-text hover:text-primary hover:bg-primary/5 rounded-lg transition-all"
              >
                {link.label}
              </Link>
            ))}
          </div>
        </div>
      )}
    </header>
  );
};

export default Header;
