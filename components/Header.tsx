
import React, { useState, useEffect } from 'react';
// Fix: Ensure clean import of react-router-dom members
import { Link, useLocation, useNavigate } from "react-router-dom";
import { onAuthStateChanged, User } from 'firebase/auth';
import { collection, getDocs } from 'firebase/firestore';
import { auth, db } from '../firebase';
import { NAV_LINKS, ADMIN_EMAILS, TEACHER_EMAILS } from '../constants';

const Header: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [logoError, setLogoError] = useState(false);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [avatarBadgeClass, setAvatarBadgeClass] = useState<string>('bg-white border border-gray-300');

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);
      if (user && user.email) {
        const normalizedEmail = user.email.toLowerCase();
        const isAdmin = ADMIN_EMAILS.includes(normalizedEmail);
        const isTeacher = TEACHER_EMAILS.includes(normalizedEmail);

        if (isAdmin || isTeacher) {
          setAvatarBadgeClass('bg-blue-500 ring-2 ring-blue-300');
          return;
        }

        let isVip = false;
        try {
          const localRoles = localStorage.getItem(`user_roles_${normalizedEmail}`);
          if (localRoles && JSON.parse(localRoles).isVip) {
            isVip = true;
          }
        } catch (e) {}

        try {
          const snap = await getDocs(collection(db, "users", normalizedEmail, "purchased_courses"));
          const isVipDoc = snap.docs.some(d => d.id === 'vip-lifetime-access');
          const count = snap.docs.filter(d => d.id !== 'vip-lifetime-access').length;

          if (isVip || isVipDoc) {
            setAvatarBadgeClass('bg-yellow-400 ring-2 ring-yellow-200');
          } else if (count >= 5) {
            setAvatarBadgeClass('bg-[#007c76] ring-2 ring-teal-200');
          } else {
            setAvatarBadgeClass('bg-white border border-gray-300');
          }
        } catch (err) {
          setAvatarBadgeClass(isVip ? 'bg-yellow-400 ring-2 ring-yellow-200' : 'bg-white border border-gray-300');
        }
      }
    });

    return () => unsubscribe();
  }, []);

  const toggleMenu = () => setIsMenuOpen(!isMenuOpen);

  const handleLogoClick = (e: React.MouseEvent) => {
    if (location.pathname === '/') {
      e.preventDefault();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      navigate('/');
    }
  };

  // Check if we are on an Account page
  const isAccountPage = location.pathname.startsWith('/account');

  // OPTIMIZATION: Use the Rectangular Full Logo for the Header
  const logoUrl = "https://dl.dropboxusercontent.com/scl/fi/vujray2dqinzjgvifv5ic/logo-007c76.jpg?rlkey=82ta74w701800wvx50c08aoyt&st=k7c2htcn";

  return (
    <header 
      className={`
        bg-surface border-b border-primary/10 shadow-sm z-[100] transition-all duration-300
        ${isAccountPage 
            ? 'sticky top-0 opacity-95 hover:opacity-100 hover:shadow-md' 
            : 'sticky top-0 opacity-100'
        }
      `}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Adjusted header height to accommodate larger logo */}
        <div className="flex justify-between items-center h-16 md:h-24">
          <div className="flex-shrink-0 flex items-center">
            <Link to="/" onClick={handleLogoClick} className="flex items-center group">
              {!logoError ? (
                  <div>
                      <img 
                        src={logoUrl} 
                        alt="FAST Logo" 
                        className="h-12 md:h-20 w-auto object-contain transition-transform group-hover:scale-105"
                        onError={() => setLogoError(true)}
                        loading="eager"
                        // @ts-ignore
                        fetchPriority="high"
                      />
                  </div>
              ) : (
                  <div className="flex flex-col">
                    <span className="text-xl md:text-2xl font-black text-primary tracking-tighter leading-none">FAST</span>
                    <span className="text-[10px] md:text-[10px] font-bold text-text-muted tracking-widest uppercase">E-Learning</span>
                  </div>
              )}
            </Link>
          </div>
          
          <div className="flex items-center gap-4 md:gap-6">
              <nav className="hidden md:flex items-center space-x-6">
                {NAV_LINKS.map((link) => {
                    const isActive = location.pathname === link.path;
                    const isAccount = link.path === '/account';
                    return (
                        <Link
                            key={link.path}
                            to={link.path}
                            className={`${
                            isActive 
                              ? 'text-primary font-bold border-b-2 border-primary' 
                              : 'text-text-muted hover:text-primary'
                            } text-xs md:text-sm py-1 transition-all duration-200 uppercase tracking-widest font-bold flex items-center gap-2`}
                        >
                            {link.label}
                            {isAccount && currentUser && (
                              <span className={`w-2.5 h-2.5 rounded-full inline-block ${avatarBadgeClass}`} />
                            )}
                        </Link>
                    );
                })}
              </nav>

              <div className="md:hidden">
                <button 
                  onClick={toggleMenu}
                  className="p-2 text-text focus:outline-none hover:bg-primary/10 rounded-lg transition-colors"
                  aria-label="Toggle Menu"
                >
                    <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        {isMenuOpen ? (
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                        ) : (
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
                        )}
                    </svg>
                </button>
              </div>
          </div>
        </div>
      </div>

      {isMenuOpen && (
        <div className="md:hidden bg-surface border-b absolute w-full shadow-2xl z-50 animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="px-4 pt-4 pb-8 space-y-2">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.path}
                to={link.path}
                onClick={() => setIsMenuOpen(false)}
                className="block px-4 py-3 text-base font-bold text-text hover:text-primary hover:bg-primary/5 rounded-xl transition-all"
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
