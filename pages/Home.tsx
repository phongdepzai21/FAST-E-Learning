
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Link } from "react-router-dom";
import Hero from '../components/Hero';
import { COURSES as HARDCODED_COURSES, CONSULTING_SERVICES, getMergedCourses } from '../constants';
import { auth, db } from '../firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { collection, onSnapshot, QuerySnapshot, DocumentData, addDoc, serverTimestamp } from 'firebase/firestore';
import { Course } from '../types';
import CountUp from 'react-countup';
import { Helmet } from 'react-helmet-async';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ChevronLeft, 
  ChevronRight, 
  CheckCircle2, 
  Sparkles, 
  BookOpen, 
  Clock, 
  FileText, 
  Award, 
  Star, 
  ArrowRight, 
  ShieldCheck, 
  Flame, 
  Send, 
  Check, 
  Phone, 
  User, 
  X, 
  Eye, 
  HelpCircle,
  Play,
  Layers,
  GraduationCap
} from 'lucide-react';

// Animation variants for staggered scroll reveal
const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.18,
      delayChildren: 0.1
    }
  }
};

const itemVariants = {
  hidden: { opacity: 0, y: 48 },
  show: { 
    opacity: 1, 
    y: 0, 
    transition: { 
      type: "spring" as const, 
      stiffness: 85, 
      damping: 18 
    } 
  }
};

const Home: React.FC = () => {
  const mainWebsite = "https://2fast.com.vn";
  const [ownedCourseIds, setOwnedCourseIds] = useState<string[]>([]);
  const [allCourses, setAllCourses] = useState<Course[]>(() => getMergedCourses([]));
  const [featuredCategory, setFeaturedCategory] = useState<string>('Tất cả');

  // 3-Page Swipeable Carousel States
  const [currentPage, setCurrentPage] = useState<number>(0);
  const [slideDirection, setSlideDirection] = useState<'left' | 'right'>('right');
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);

  // Quick View Modal & Consultation Form States
  const [quickViewCourse, setQuickViewCourse] = useState<Course | null>(null);
  const consultFormRef = useRef<HTMLDivElement | null>(null);
  const [consultName, setConsultName] = useState('');
  const [consultPhone, setConsultPhone] = useState('');
  const [consultCourse, setConsultCourse] = useState('HACCP TCVN / CODEX');
  const [consultRole, setConsultRole] = useState('');
  const [isConsultSubmitting, setIsConsultSubmitting] = useState(false);
  const [consultSuccess, setConsultSuccess] = useState(false);

  const handleConsultSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!consultName.trim() || !consultPhone.trim()) return;
    setIsConsultSubmitting(true);
    try {
      await addDoc(collection(db, 'course_consultations'), {
        name: consultName.trim(),
        phone: consultPhone.trim(),
        course: consultCourse,
        role: consultRole.trim() || 'Học viên cá nhân',
        source: 'trang_chu_khoa_hoc_noi_bat',
        createdAt: serverTimestamp(),
      });
      setConsultSuccess(true);
    } catch (err) {
      console.error('Error saving consultation request:', err);
      // Fallback: save to localStorage to ensure no lead is lost
      const existing = JSON.parse(localStorage.getItem('fast_consultations') || '[]');
      existing.push({
        name: consultName.trim(),
        phone: consultPhone.trim(),
        course: consultCourse,
        role: consultRole.trim() || 'Học viên cá nhân',
        createdAt: new Date().toISOString()
      });
      localStorage.setItem('fast_consultations', JSON.stringify(existing));
      setConsultSuccess(true);
    } finally {
      setIsConsultSubmitting(false);
    }
  };

  // Divide courses into 3 distinct curated pages (3 courses per page)
  const pageCourses = useMemo(() => {
    const list = allCourses
      .filter(c => c.id !== 'test-course-2k' && c.status !== 'draft' && c.status !== 'inactive');

    // Page 1: HACCP & Food Safety Core
    const p1 = list.filter(c => 
      c.id === 'haccp-tcvn' || 
      c.id === 'iso-22000' || 
      (c.category && c.category.toUpperCase().includes('HACCP')) ||
      (c.title && c.title.toUpperCase().includes('HACCP'))
    ).slice(0, 3);

    // Page 2: QA/QC, ISO & Operations
    const p2 = list.filter(c => 
      c.id === 'qa-qc-pro' || 
      c.id === 'iso-9001' || 
      c.id === 'gemba' ||
      (c.category && (c.category.toUpperCase().includes('QA') || c.category.toUpperCase().includes('LEAN')))
    ).slice(0, 3);

    // Page 3: Supply Chain, OEM & Systems
    const p3 = list.filter(c => 
      c.id === 'supplier-mgmt' || 
      c.id === 'oem-project' || 
      c.id === 'iso-14001' || 
      c.id === 'cost-control-supply'
    ).slice(0, 3);

    const fillPage = (arr: Course[], excludeIds: string[]) => {
      if (arr.length >= 3) return arr.slice(0, 3);
      const remaining = list.filter(c => !excludeIds.includes(c.id) && !arr.some(a => a.id === c.id));
      return [...arr, ...remaining].slice(0, 3);
    };

    const finalP1 = fillPage(p1, []);
    const p1Ids = finalP1.map(c => c.id);
    const finalP2 = fillPage(p2, p1Ids);
    const p12Ids = [...p1Ids, ...finalP2.map(c => c.id)];
    const finalP3 = fillPage(p3, p12Ids);

    return [finalP1, finalP2, finalP3];
  }, [allCourses]);

  // Flat list of all 9 curated featured courses
  const allFeaturedCourses = useMemo(() => {
    return [...pageCourses[0], ...pageCourses[1], ...pageCourses[2]];
  }, [pageCourses]);

  // Mobile Carousel states & ref
  const mobileTrackRef = useRef<HTMLDivElement | null>(null);
  const [mobileCardIndex, setMobileCardIndex] = useState(0);
  const [mobileThemeFilter, setMobileThemeFilter] = useState<'all' | 'haccp' | 'iso' | 'supply'>('all');

  const filteredMobileCourses = useMemo(() => {
    if (mobileThemeFilter === 'haccp') return pageCourses[0];
    if (mobileThemeFilter === 'iso') return pageCourses[1];
    if (mobileThemeFilter === 'supply') return pageCourses[2];
    return allFeaturedCourses;
  }, [mobileThemeFilter, pageCourses, allFeaturedCourses]);

  const scrollToMobileCard = (idx: number) => {
    if (!mobileTrackRef.current) return;
    const cards = mobileTrackRef.current.children;
    if (cards[idx]) {
      (cards[idx] as HTMLElement).scrollIntoView({
        behavior: 'smooth',
        inline: 'center',
        block: 'nearest'
      });
      setMobileCardIndex(idx);
    }
  };

  const handleMobileScroll = () => {
    if (!mobileTrackRef.current) return;
    const scrollLeft = mobileTrackRef.current.scrollLeft;
    const firstCard = mobileTrackRef.current.children[0] as HTMLElement;
    const cardWidth = firstCard?.clientWidth || 290;
    const newIdx = Math.round(scrollLeft / (cardWidth + 16));
    const clamped = Math.max(0, Math.min(newIdx, filteredMobileCourses.length - 1));
    setMobileCardIndex(clamped);
  };

  const handleMobilePrev = () => {
    const nextIdx = Math.max(0, mobileCardIndex - 1);
    scrollToMobileCard(nextIdx);
  };

  const handleMobileNext = () => {
    const nextIdx = Math.min(filteredMobileCourses.length - 1, mobileCardIndex + 1);
    scrollToMobileCard(nextIdx);
  };

  const handlePrevPage = () => {
    setSlideDirection('left');
    setCurrentPage(prev => (prev > 0 ? prev - 1 : 2));
  };

  const handleNextPage = () => {
    setSlideDirection('right');
    setCurrentPage(prev => (prev < 2 ? prev + 1 : 0));
  };

  const handleSelectPage = (pageIdx: number) => {
    setSlideDirection(pageIdx > currentPage ? 'right' : 'left');
    setCurrentPage(pageIdx);
  };

  const onTouchStart = (e: React.TouchEvent) => {
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientX);
  };

  const onTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const onTouchEnd = () => {
    if (!touchStart || !touchEnd) return;
    const distance = touchStart - touchEnd;
    const minSwipeDistance = 45;
    if (distance > minSwipeDistance) {
      handleNextPage();
    } else if (distance < -minSwipeDistance) {
      handlePrevPage();
    }
  };

  // --- FETCH ALL COURSES FROM FIRESTORE (REAL-TIME SNAPSHOT) ---
  useEffect(() => {
    let latestFirestoreCourses: Course[] = [];

    const syncCourses = (fsList?: Course[]) => {
      if (fsList) latestFirestoreCourses = fsList;
      setAllCourses(getMergedCourses(latestFirestoreCourses));
    };

    const unsubscribeSnapshot = onSnapshot(
      collection(db, 'courses'),
      (querySnapshot) => {
        const firestoreCourses: Course[] = [];
        querySnapshot.forEach((doc) => {
          const data = doc.data();
          firestoreCourses.push({
            id: doc.id,
            ...data
          } as Course);
        });
        syncCourses(firestoreCourses);
      },
      (error) => {
        console.error("Lỗi đồng bộ danh sách khóa học ở trang chủ:", error);
        syncCourses();
      }
    );

    const handleCustomUpdate = () => syncCourses();
    window.addEventListener('courses_updated', handleCustomUpdate);
    window.addEventListener('storage', handleCustomUpdate);

    return () => {
      unsubscribeSnapshot();
      window.removeEventListener('courses_updated', handleCustomUpdate);
      window.removeEventListener('storage', handleCustomUpdate);
    };
  }, []);

  // Real-time ownership sync
  useEffect(() => {
    let unsubscribeSnapshot: (() => void) | null = null;
    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      if (unsubscribeSnapshot) {
        unsubscribeSnapshot();
        unsubscribeSnapshot = null;
      }
      if (user && user.email) {
        // CRITICAL FIX: Normalize email to lowercase
        const normalizedEmail = user.email.toLowerCase();
        if (!normalizedEmail) {
            setOwnedCourseIds([]);
            return;
        }
        unsubscribeSnapshot = onSnapshot(
          collection(db, "users", normalizedEmail, "purchased_courses"), 
          (snapshot: QuerySnapshot<DocumentData>) => {
            const ids = snapshot.docs.map(doc => doc.data().courseId || doc.id);
            setOwnedCourseIds(ids);
          },
          (error) => console.error("Error syncing courses:", error)
        );
      } else {
        setOwnedCourseIds([]);
      }
    });
    return () => {
      unsubscribeAuth();
      if (unsubscribeSnapshot) {
        unsubscribeSnapshot();
      }
    };
  }, []);

  return (
    <div className="animate-fade-in">
      <Helmet>
        <title>FAST E-Learning | Nền Tảng Học Trực Tuyến An Toàn Thực Phẩm</title>
        <meta name="description" content="Hệ thống học trực tuyến về quản lý chất lượng và an toàn thực phẩm. Cung cấp các khóa học chuyên sâu ISO, HACCP, VietGAP." />
      </Helmet>
      <Hero />
      
      {/* 0. Statistics (Thống kê) */}
      <section className="py-12 md:py-20 bg-[#007c76] text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-12 text-center divide-y md:divide-y-0 md:divide-x divide-white/20">
            <div className="py-4 md:py-0 group">
              <div className="text-4xl md:text-6xl font-black mb-2 tracking-tighter group-hover:scale-110 transition-transform">
                <CountUp end={30} duration={2.5} enableScrollSpy scrollSpyOnce />+
              </div>
              <p className="text-white/80 font-bold uppercase tracking-widest text-sm md:text-base">Khóa học chuyên sâu</p>
            </div>
            <div className="py-6 md:py-0 group">
              <div className="text-4xl md:text-6xl font-black mb-2 tracking-tighter group-hover:scale-110 transition-transform">
                <CountUp end={265} duration={2.5} separator="," enableScrollSpy scrollSpyOnce />+
              </div>
              <p className="text-white/80 font-bold uppercase tracking-widest text-sm md:text-base">Tiêu chuẩn kiểm toán</p>
            </div>
            <div className="py-6 md:py-0 group">
              <div className="text-4xl md:text-6xl font-black mb-2 tracking-tighter group-hover:scale-110 transition-transform">
                <CountUp end={500} duration={2.5} separator="," enableScrollSpy scrollSpyOnce />+
              </div>
              <p className="text-white/80 font-bold uppercase tracking-widest text-sm md:text-base">Doanh nghiệp đồng hành</p>
            </div>
          </div>
        </div>
      </section>


      {/* 1. Consulting Services (Giải pháp doanh nghiệp) */}
      <section className="py-12 md:py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4">
          <div className="text-center mb-10 md:mb-16 space-y-3 md:space-y-4">
            <span className="text-[#007c76] font-black uppercase tracking-[0.3em] text-[10px] md:text-xs">Giải pháp doanh nghiệp</span>
            <h2 className="text-3xl md:text-5xl font-black text-[#374151] uppercase tracking-tighter leading-none">Dịch vụ Tư vấn Chuyên sâu</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-12">
            {CONSULTING_SERVICES.map((service) => (
              <div key={service.id} className="bg-gray-50 p-6 md:p-10 rounded-[32px] md:rounded-[40px] border border-gray-100 group hover-lift">
                <div className="w-14 h-14 md:w-16 md:h-16 bg-[#007c76] text-white rounded-2xl flex items-center justify-center mb-6 shadow-xl group-hover:scale-110 transition-transform">
                  <svg className="w-6 h-6 md:w-8 md:h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>
                </div>
                <h3 className="text-xl md:text-2xl font-black text-[#374151] mb-3 md:mb-4 uppercase">{service.title}</h3>
                <p className="text-sm md:text-base text-gray-500 font-bold mb-6 md:mb-8 leading-relaxed">{service.description}</p>
                <Link to="/tu-van" className="text-[#007c76] font-black text-xs md:text-sm uppercase tracking-widest hover:underline flex items-center gap-2">Tìm hiểu thêm <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 8l4 4m0 0l-4 4m4-4H3" /></svg></Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 2. Featured Courses (Khóa học nổi bật - Form Mới & 3 Trang Vuốt Mượt Mà) */}
      <section className="py-16 md:py-24 bg-gradient-to-b from-slate-50 via-teal-950/[0.02] to-white border-t border-slate-200/80 relative overflow-hidden">
        {/* Decorative background glows */}
        <div className="absolute top-1/4 -right-24 w-96 h-96 bg-teal-500/10 rounded-full blur-3xl pointer-events-none"></div>
        <div className="absolute bottom-10 -left-24 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none"></div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          {/* Section Header */}
          <div className="flex flex-col lg:flex-row lg:items-end justify-between mb-10 gap-6">
            <div className="space-y-3 text-left">
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-teal-50 border border-teal-200 text-[#007c76] text-xs font-black uppercase tracking-widest shadow-2xs">
                <Sparkles className="w-3.5 h-3.5 text-[#007c76] animate-pulse" />
                <span>Tuyển Tập Khóa Học Trọng Tâm 2026</span>
              </div>
              <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black text-slate-900 uppercase tracking-tight leading-tight">
                Khóa Học Nổi Bật <br className="hidden sm:inline" />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#005c56] via-[#007c76] to-emerald-600">
                  Chuẩn Hóa Năng Lực Thực Chiến
                </span>
              </h2>
              <p className="text-sm sm:text-base text-slate-600 font-medium max-w-2xl leading-relaxed">
                Hệ thống 03 trang chuyên đề chọn lọc. Vuốt qua để khám phá từ nền tảng HACCP, ISO đến kỹ năng QA/QC và tối ưu chuỗi cung ứng kèm bộ tài liệu SOP thực tế.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3 shrink-0">
              <button
                type="button"
                onClick={() => {
                  consultFormRef.current?.scrollIntoView({ behavior: 'smooth' });
                }}
                className="inline-flex items-center gap-2 bg-white hover:bg-teal-50/50 text-[#005c56] border border-[#005c56]/30 px-5 py-3.5 rounded-2xl font-bold uppercase tracking-wider text-xs shadow-xs transition-all hover:scale-[1.02] cursor-pointer"
              >
                <Phone className="w-3.5 h-3.5 text-[#007c76]" />
                <span>Nhận Tư Vấn Lộ Trình</span>
              </button>
              <Link 
                to="/khoa-hoc" 
                className="inline-flex items-center gap-2 bg-[#005c56] hover:bg-[#004440] text-white px-6 py-3.5 rounded-2xl font-bold uppercase tracking-wider text-xs shadow-md shadow-teal-900/15 hover:shadow-lg transition-all hover:scale-[1.02] cursor-pointer"
              >
                <span>Xem Tất Cả 30+ Khóa</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>

          {/* DESKTOP VIEW: 3-PAGE DRAGGABLE & ANIMATED CAROUSEL (>= md) */}
          <div className="hidden md:block">
            {/* 3-Page Switcher & Controls Header */}
            <div className="bg-white p-3.5 rounded-2xl border border-slate-200/90 shadow-xs mb-6 flex items-center justify-between gap-4">
              {/* 3 Distinct Page Tabs with Descriptions */}
              <div className="grid grid-cols-3 gap-2 flex-grow">
                {[
                  { idx: 0, title: 'Trang 1: Cốt Lõi', desc: 'HACCP & An Toàn Thực Phẩm', tag: 'Nền Tảng' },
                  { idx: 1, title: 'Trang 2: Nâng Cao', desc: 'ISO, QA/QC & Hiện Trường', tag: 'Chuyên Sâu' },
                  { idx: 2, title: 'Trang 3: Toàn Diện', desc: 'Chuỗi Cung Ứng & OEM', tag: 'Quản Trị' }
                ].map((p) => {
                  const isActive = currentPage === p.idx;
                  return (
                    <button
                      key={p.idx}
                      type="button"
                      onClick={() => handleSelectPage(p.idx)}
                      className={`text-left p-3 rounded-xl transition-all cursor-pointer relative border ${
                        isActive
                          ? 'bg-[#005c56] text-white border-[#005c56] shadow-sm'
                          : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200/70'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-1 mb-1">
                        <span className={`text-[11px] font-bold uppercase tracking-wider ${isActive ? 'text-teal-200' : 'text-[#007c76]'}`}>
                          {p.title}
                        </span>
                        <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider ${
                          isActive ? 'bg-white/20 text-white' : 'bg-slate-200/80 text-slate-600'
                        }`}>
                          {p.tag}
                        </span>
                      </div>
                      <div className={`text-xs font-semibold truncate ${isActive ? 'text-white' : 'text-slate-800'}`}>
                        {p.desc}
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Navigation Arrows & Current Status */}
              <div className="flex items-center gap-3 shrink-0 pl-3 border-l border-slate-100">
                <div className="flex flex-col text-right">
                  <span className="text-[10px] font-medium text-slate-400 uppercase tracking-wider">Đang xem</span>
                  <span className="text-xs font-bold text-slate-800">
                    Trang <span className="text-[#007c76] text-sm font-black">0{currentPage + 1}</span> / 03
                  </span>
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={handlePrevPage}
                    className="w-10 h-10 rounded-xl bg-slate-100 hover:bg-teal-50 border border-slate-200 hover:border-teal-300 text-slate-700 hover:text-[#007c76] flex items-center justify-center transition-all cursor-pointer hover:scale-105 active:scale-95 shadow-xs"
                    title="Vuốt sang trang trước"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                  <button
                    type="button"
                    onClick={handleNextPage}
                    className="w-10 h-10 rounded-xl bg-[#005c56] hover:bg-[#00423e] text-white flex items-center justify-center transition-all shadow-sm cursor-pointer hover:scale-105 active:scale-95"
                    title="Vuốt sang trang tiếp theo"
                  >
                    <ChevronRight className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </div>

            {/* Desktop Carousel Viewport */}
            <div 
              className="relative overflow-hidden rounded-3xl touch-pan-y select-none pb-4"
              onTouchStart={onTouchStart}
              onTouchMove={onTouchMove}
              onTouchEnd={onTouchEnd}
            >
              <motion.div
                className="flex w-full cursor-grab active:cursor-grabbing"
                animate={{ x: `-${currentPage * 100}%` }}
                transition={{ type: "spring", stiffness: 260, damping: 28 }}
                drag="x"
                dragConstraints={{ left: 0, right: 0 }}
                dragElastic={0.15}
                onDragEnd={(_, info) => {
                  const swipeDistance = info.offset.x;
                  const swipeVelocity = info.velocity.x;
                  if (swipeDistance < -50 || swipeVelocity < -350) {
                    handleNextPage();
                  } else if (swipeDistance > 50 || swipeVelocity > 350) {
                    handlePrevPage();
                  }
                }}
              >
                {pageCourses.map((group, pageIdx) => (
                  <div 
                    key={pageIdx} 
                    className="w-full shrink-0 flex-none px-1"
                  >
                    <div className="grid grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8">
                      {group.map((course) => {
                        const isOwned = ownedCourseIds.includes(course.id);
                        return (
                          <div 
                            key={course.id}
                            className="bg-white rounded-2xl border border-slate-200/90 shadow-xs hover:shadow-lg hover:border-teal-400/60 transition-all duration-300 flex flex-col h-full overflow-hidden group/card"
                          >
                            {/* Card Media Header */}
                            <div className="relative aspect-[16/10] overflow-hidden bg-slate-100">
                              <img 
                                src={course.image || 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?auto=format&fit=crop&q=80&w=800'} 
                                alt={course.title}
                                loading="lazy"
                                className="w-full h-full object-cover transition-transform duration-500 group-hover/card:scale-105"
                              />
                              <div className="absolute inset-0 bg-gradient-to-t from-slate-950/75 via-slate-950/20 to-transparent pointer-events-none"></div>

                              {/* Quiet top metadata */}
                              <div className="absolute top-3 left-3 right-3 flex items-center justify-between text-white text-[11px] font-medium z-10 pointer-events-none">
                                <span className="font-bold tracking-wide uppercase drop-shadow-sm text-teal-200">
                                  {course.category || 'Tiêu chuẩn'} · 2026
                                </span>
                                {isOwned && (
                                  <span className="bg-emerald-600/90 text-white font-bold px-2 py-0.5 rounded text-[10px] uppercase tracking-wider">
                                    Đã sở hữu
                                  </span>
                                )}
                              </div>

                              {/* Bottom Info Bar on Image */}
                              <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between text-white text-xs z-10">
                                <div className="flex items-center gap-1.5 font-medium text-slate-200 text-[11px] drop-shadow-sm">
                                  <Clock className="w-3.5 h-3.5 text-teal-300" />
                                  <span>15–20 bài · Tự chủ tiến độ</span>
                                </div>
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    setQuickViewCourse(course);
                                  }}
                                  className="bg-white/20 hover:bg-white text-white hover:text-slate-900 backdrop-blur-md px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all flex items-center gap-1 cursor-pointer"
                                  title="Xem nhanh mục lục giáo trình"
                                >
                                  <Eye className="w-3 h-3" />
                                  <span>Xem Nhanh</span>
                                </button>
                              </div>
                            </div>

                            {/* Card Body */}
                            <div className="p-6 flex flex-col flex-grow bg-white">
                              <div className="flex items-center justify-between gap-2 mb-2 text-xs">
                                <div className="flex items-center gap-1 text-amber-500 font-bold">
                                  <Star className="w-3.5 h-3.5 fill-current" />
                                  <span>4.9</span>
                                  <span className="text-slate-400 font-normal text-[11px]">· 320+ học viên</span>
                                </div>
                                <span className="text-[11px] font-semibold text-teal-700">
                                  Thực hành hiện trường
                                </span>
                              </div>

                              <h3 className="text-base font-bold text-slate-900 group-hover/card:text-[#007c76] transition-colors line-clamp-2 leading-snug mb-2">
                                <Link to={`/khoa-hoc/${course.id}`} className="hover:underline">
                                  {course.title}
                                </Link>
                              </h3>

                              <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed mb-4">
                                {course.description || 'Chương trình chuẩn hóa kiến thức chuyên sâu, bám sát yêu cầu kiểm toán an toàn thực phẩm thực tế.'}
                              </p>

                              <div className="space-y-1.5 py-3 border-y border-slate-100 mb-4 text-[11px] text-slate-600">
                                <div className="flex items-center gap-2">
                                  <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                                  <span className="truncate">Tặng bộ biểu mẫu SOP Word/Excel</span>
                                </div>
                                <div className="flex items-center gap-2">
                                  <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                                  <span className="truncate">Cấp Giấy chứng nhận hoàn thành QR</span>
                                </div>
                                <div className="flex items-center gap-2">
                                  <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                                  <span className="truncate">Hỗ trợ hỏi đáp 1-1 với chuyên gia FAST</span>
                                </div>
                              </div>

                              <div className="mt-auto pt-1 flex items-center justify-between gap-3">
                                <div>
                                  <span className="text-[10px] font-medium uppercase text-slate-400 block tracking-wider">
                                    Học phí
                                  </span>
                                  <span className="text-lg font-black text-[#005c56]">
                                    {course.price || 'Miễn phí'}
                                  </span>
                                </div>

                                <Link
                                  to={isOwned ? `/hoc/${course.id}` : `/khoa-hoc/${course.id}`}
                                  className={`px-4 py-2.5 rounded-xl font-bold text-xs uppercase tracking-wider transition-all flex items-center gap-1.5 cursor-pointer min-h-[42px] ${
                                    isOwned
                                      ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                                      : 'bg-[#005c56] hover:bg-[#00423e] text-white hover:scale-[1.02]'
                                  }`}
                                >
                                  <span>{isOwned ? 'Vào Phòng Học' : 'Khám Phá'}</span>
                                  <ArrowRight className="w-3.5 h-3.5" />
                                </Link>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </motion.div>
            </div>

            {/* Desktop Page Indicator Dots */}
            <div className="flex items-center justify-between pt-2">
              <span className="text-xs text-slate-500 font-medium">
                👉 Kéo chuột hoặc bấm mũi tên để lướt qua các trang khóa học
              </span>
              <div className="flex items-center gap-2">
                {[0, 1, 2].map((idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleSelectPage(idx)}
                    className={`h-2 rounded-full transition-all cursor-pointer ${
                      currentPage === idx ? 'w-8 bg-[#007c76]' : 'w-2 bg-slate-300 hover:bg-slate-400'
                    }`}
                    title={`Trang ${idx + 1}`}
                  />
                ))}
              </div>
            </div>
          </div>

          {/* MOBILE VIEW: MODERN CARD CAROUSEL SLIDER (< md) - THIẾT KẾ TRƯỢT MƯỢT MÀ */}
          <div className="block md:hidden">
            {/* Mobile Header Controls & Filter Pills */}
            <div className="bg-white p-3 rounded-2xl border border-slate-200/90 shadow-xs mb-4">
              {/* Category Segmented Tabs */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar text-xs font-semibold">
                {[
                  { id: 'all', label: 'Tất Cả (09)' },
                  { id: 'haccp', label: 'HACCP & ATTP' },
                  { id: 'iso', label: 'ISO & QA/QC' },
                  { id: 'supply', label: 'Chuỗi Cung Ứng' }
                ].map((tab) => {
                  const isActive = mobileThemeFilter === tab.id;
                  return (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => {
                        setMobileThemeFilter(tab.id as any);
                        setMobileCardIndex(0);
                        if (mobileTrackRef.current) {
                          mobileTrackRef.current.scrollTo({ left: 0, behavior: 'smooth' });
                        }
                      }}
                      className={`px-3 py-1.5 rounded-lg whitespace-nowrap transition-colors cursor-pointer text-xs ${
                        isActive
                          ? 'bg-[#005c56] text-white font-bold shadow-xs'
                          : 'bg-slate-100 text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      {tab.label}
                    </button>
                  );
                })}
              </div>

              {/* Status Bar & Arrow Buttons */}
              <div className="flex items-center justify-between pt-2.5 mt-2 border-t border-slate-100">
                <div className="text-xs text-slate-600 font-medium">
                  Khóa <span className="font-bold text-[#007c76] text-sm">0{mobileCardIndex + 1}</span> / 0{filteredMobileCourses.length}
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleMobilePrev}
                    disabled={mobileCardIndex === 0}
                    className="w-10 h-10 rounded-xl bg-slate-100 hover:bg-teal-50 border border-slate-200 text-slate-700 hover:text-[#007c76] flex items-center justify-center transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed active:scale-95 shadow-xs"
                    aria-label="Khóa học trước"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                  <button
                    type="button"
                    onClick={handleMobileNext}
                    disabled={mobileCardIndex >= filteredMobileCourses.length - 1}
                    className="w-10 h-10 rounded-xl bg-[#005c56] hover:bg-[#00423e] text-white flex items-center justify-center transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed active:scale-95 shadow-sm"
                    aria-label="Khóa học tiếp theo"
                  >
                    <ChevronRight className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </div>

            {/* Mobile Horizontal Snap-Scroll Carousel Track */}
            <div 
              ref={mobileTrackRef}
              onScroll={handleMobileScroll}
              className="flex gap-4 overflow-x-auto snap-x snap-mandatory scroll-smooth no-scrollbar px-4 py-2 -mx-4 pb-4"
              style={{ WebkitOverflowScrolling: 'touch' }}
            >
              {filteredMobileCourses.map((course, idx) => {
                const isOwned = ownedCourseIds.includes(course.id);
                return (
                  <div 
                    key={course.id}
                    className="snap-center shrink-0 w-[84vw] max-w-[340px] bg-white rounded-2xl border border-slate-200/90 shadow-sm hover:border-teal-400 transition-all flex flex-col overflow-hidden"
                  >
                    {/* Media Header */}
                    <div className="relative aspect-[16/10] overflow-hidden bg-slate-100">
                      <img 
                        src={course.image || 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?auto=format&fit=crop&q=80&w=800'} 
                        alt={course.title}
                        loading="lazy"
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-slate-950/75 via-slate-950/20 to-transparent pointer-events-none"></div>

                      {/* Top status */}
                      <div className="absolute top-2.5 left-2.5 right-2.5 flex items-center justify-between text-white text-[11px] z-10 pointer-events-none">
                        <span className="font-bold tracking-wide uppercase drop-shadow-sm text-teal-200">
                          {course.category || 'Tiêu chuẩn'} · 2026
                        </span>
                        {isOwned && (
                          <span className="bg-emerald-600 text-white font-bold px-2 py-0.5 rounded text-[10px] uppercase">
                            Đã sở hữu
                          </span>
                        )}
                      </div>

                      {/* Media footer */}
                      <div className="absolute bottom-2.5 left-2.5 right-2.5 flex items-center justify-between text-white text-xs z-10">
                        <span className="text-[11px] font-medium text-slate-200 drop-shadow-sm">
                          15–20 bài · Tự chủ thời gian
                        </span>
                        <button
                          type="button"
                          onClick={() => setQuickViewCourse(course)}
                          className="bg-white/25 active:bg-white active:text-slate-900 backdrop-blur-md px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider text-white flex items-center gap-1 cursor-pointer"
                        >
                          <Eye className="w-3 h-3" />
                          <span>Xem Nhanh</span>
                        </button>
                      </div>
                    </div>

                    {/* Card Body */}
                    <div className="p-4 flex flex-col flex-grow bg-white">
                      <div className="flex items-center justify-between gap-2 mb-1.5 text-xs">
                        <div className="flex items-center gap-1 text-amber-500 font-bold">
                          <Star className="w-3.5 h-3.5 fill-current" />
                          <span>4.9</span>
                          <span className="text-slate-400 font-normal text-[11px]">· 320+ học viên</span>
                        </div>
                        <span className="text-[10px] font-bold text-teal-700 bg-teal-50 px-2 py-0.5 rounded">
                          Thực hành
                        </span>
                      </div>

                      <h3 className="text-sm font-bold text-slate-900 line-clamp-2 leading-snug mb-2">
                        <Link to={`/khoa-hoc/${course.id}`} className="hover:underline">
                          {course.title}
                        </Link>
                      </h3>

                      <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed mb-3">
                        {course.description || 'Chương trình chuẩn hóa kiến thức chuyên sâu bám sát thực tế kiểm toán an toàn thực phẩm.'}
                      </p>

                      <div className="space-y-1 py-2.5 border-y border-slate-100 mb-3 text-[11px] text-slate-600">
                        <div className="flex items-center gap-1.5">
                          <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                          <span className="truncate">Tặng bộ biểu mẫu SOP Word/Excel</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                          <span className="truncate">Cấp Giấy chứng nhận hoàn thành QR</span>
                        </div>
                      </div>

                      <div className="mt-auto pt-1 flex items-center justify-between gap-2">
                        <div>
                          <span className="text-[9px] uppercase tracking-wider text-slate-400 block font-medium">Học phí</span>
                          <span className="text-base font-black text-[#005c56]">
                            {course.price || 'Miễn phí'}
                          </span>
                        </div>

                        <Link
                          to={isOwned ? `/hoc/${course.id}` : `/khoa-hoc/${course.id}`}
                          className={`px-3.5 py-2 rounded-xl font-bold text-xs uppercase tracking-wider transition-all flex items-center gap-1 min-h-[40px] cursor-pointer ${
                            isOwned
                              ? 'bg-emerald-600 text-white'
                              : 'bg-[#005c56] text-white active:bg-[#00423e]'
                          }`}
                        >
                          <span>{isOwned ? 'Vào Học' : 'Khám Phá'}</span>
                          <ArrowRight className="w-3 h-3" />
                        </Link>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Mobile Navigation Dots & Hint */}
            <div className="flex items-center justify-between mt-2 px-1">
              <span className="text-[11px] font-medium text-slate-500">
                👉 Vuốt ngang để lướt qua các khóa học
              </span>
              <div className="flex items-center gap-1">
                {filteredMobileCourses.map((_, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => scrollToMobileCard(idx)}
                    className={`h-1.5 rounded-full transition-all cursor-pointer ${
                      mobileCardIndex === idx ? 'w-5 bg-[#007c76]' : 'w-1.5 bg-slate-300'
                    }`}
                    aria-label={`Chuyển tới khóa ${idx + 1}`}
                  />
                ))}
              </div>
            </div>
          </div>

          {/* Form Nhận Tư Vấn & Giáo Trình Khóa Học Nổi Bật (Thiết Kế Mới) */}
          <div ref={consultFormRef} className="mt-14 bg-gradient-to-br from-[#005c56] via-[#006e68] to-[#004440] text-white rounded-3xl p-6 sm:p-10 shadow-xl relative overflow-hidden">
            {/* Background pattern */}
            <div className="absolute top-0 right-0 w-80 h-80 bg-white/5 rounded-full blur-2xl pointer-events-none"></div>

            <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
              {/* Left Column: Heading & Value */}
              <div className="lg:col-span-5 space-y-4 text-left">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 border border-white/20 text-yellow-300 text-xs font-black uppercase tracking-widest">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Tư Vấn Miễn Phí 100%</span>
                </div>
                <h3 className="text-2xl sm:text-3xl font-black uppercase tracking-tight leading-snug">
                  Chưa rõ khóa học nào phù hợp với bạn?
                </h3>
                <p className="text-sm text-white/80 leading-relaxed font-medium">
                  Để lại thông tin, đội ngũ chuyên gia của FAST sẽ tư vấn lộ trình học phù hợp nhất với mô hình kinh doanh, vị trí công việc và gửi tặng bộ tài liệu SOP mẫu.
                </p>

                <div className="space-y-2 pt-2 text-xs text-white/90 font-semibold">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-300 shrink-0" />
                    <span>Lộ trình tối ưu cho cá nhân hoặc cơ sở sản xuất</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-300 shrink-0" />
                    <span>Hỗ trợ hồ sơ thẩm định an toàn thực phẩm thực tế</span>
                  </div>
                </div>
              </div>

              {/* Right Column: Interactive Consultation Form */}
              <div className="lg:col-span-7 bg-white text-slate-900 p-6 sm:p-8 rounded-2xl shadow-lg">
                {consultSuccess ? (
                  <div className="text-center py-6 space-y-3">
                    <div className="w-14 h-14 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
                      <Check className="w-8 h-8" />
                    </div>
                    <h4 className="text-xl font-black text-slate-900 uppercase">Gửi Yêu Cầu Thành Công!</h4>
                    <p className="text-xs text-slate-600 max-w-md mx-auto">
                      Chuyên viên của FAST sẽ liên hệ với bạn trong thời gian sớm nhất qua số điện thoại <strong>{consultPhone}</strong>. Cảm ơn bạn đã tin tưởng FAST!
                    </p>
                    <button
                      type="button"
                      onClick={() => setConsultSuccess(false)}
                      className="mt-4 px-5 py-2.5 bg-[#005c56] text-white rounded-xl text-xs font-bold uppercase tracking-wider hover:bg-[#00423e] transition-all cursor-pointer"
                    >
                      Gửi Yêu Cầu Khác
                    </button>
                  </div>
                ) : (
                  <form onSubmit={handleConsultSubmit} className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-black uppercase tracking-wider text-slate-700 mb-1">
                          Họ và tên *
                        </label>
                        <div className="relative">
                          <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                          <input
                            type="text"
                            required
                            value={consultName}
                            onChange={(e) => setConsultName(e.target.value)}
                            placeholder="Nguyễn Văn A"
                            className="w-full pl-10 pr-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:border-[#007c76] focus:bg-white"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-black uppercase tracking-wider text-slate-700 mb-1">
                          Số điện thoại / Zalo *
                        </label>
                        <div className="relative">
                          <Phone className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                          <input
                            type="tel"
                            required
                            value={consultPhone}
                            onChange={(e) => setConsultPhone(e.target.value)}
                            placeholder="0912 345 678"
                            className="w-full pl-10 pr-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:border-[#007c76] focus:bg-white"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-black uppercase tracking-wider text-slate-700 mb-1">
                          Khóa học quan tâm
                        </label>
                        <select
                          value={consultCourse}
                          onChange={(e) => setConsultCourse(e.target.value)}
                          className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:border-[#007c76] focus:bg-white cursor-pointer"
                        >
                          <option value="HACCP TCVN / CODEX">HACCP TCVN / CODEX</option>
                          <option value="ISO 22000 - Quản Lý ATTP">ISO 22000 - Quản Lý ATTP</option>
                          <option value="ISO 9001 - Hệ Thống QMS">ISO 9001 - Hệ Thống QMS</option>
                          <option value="Chuyên Gia QA/QC Thực Phẩm">Chuyên Gia QA/QC Thực Phẩm</option>
                          <option value="Quản Lý Nhà Cung Cấp & OEM">Quản Lý Nhà Cung Cấp &amp; OEM</option>
                          <option value="Khác - Cần Tư Vấn Lộ Trình">Khác - Cần Tư Vấn Toàn Diện</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs font-black uppercase tracking-wider text-slate-700 mb-1">
                          Mô hình / Vị trí
                        </label>
                        <input
                          type="text"
                          value={consultRole}
                          onChange={(e) => setConsultRole(e.target.value)}
                          placeholder="Bếp ăn, Cơ sở sản xuất, Nhân viên QA/QC..."
                          className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:border-[#007c76] focus:bg-white"
                        />
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={isConsultSubmitting}
                      className="w-full py-3 bg-[#005c56] hover:bg-[#00423e] text-white rounded-xl text-xs font-black uppercase tracking-widest shadow-md shadow-teal-900/15 hover:shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-70"
                    >
                      {isConsultSubmitting ? (
                        <>
                          <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                          <span>Đang gửi thông tin...</span>
                        </>
                      ) : (
                        <>
                          <Send className="w-3.5 h-3.5" />
                          <span>Gửi Yêu Cầu Nhận Tư Vấn Miễn Phí</span>
                        </>
                      )}
                    </button>
                  </form>
                )}
              </div>
            </div>
          </div>

          {/* Quick View Modal (Xem Nhanh Giáo Trình) */}
          <AnimatePresence>
            {quickViewCourse && (
              <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs">
                <motion.div
                  initial={{ opacity: 0, scale: 0.95, y: 20 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, y: 20 }}
                  className="bg-white rounded-3xl max-w-lg w-full overflow-hidden shadow-2xl border border-slate-200"
                >
                  <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50">
                    <div className="flex items-center gap-2">
                      <BookOpen className="w-4 h-4 text-[#007c76]" />
                      <span className="text-xs font-black uppercase text-slate-700 tracking-wider">
                        Mục Lục &amp; Giáo Trình Khóa Học
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setQuickViewCourse(null)}
                      className="w-8 h-8 rounded-full bg-slate-200/70 hover:bg-slate-300 flex items-center justify-center text-slate-700 cursor-pointer"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
                    <div>
                      <span className="text-[10px] font-black uppercase text-[#007c76] bg-teal-50 px-2 py-0.5 rounded">
                        {quickViewCourse.category}
                      </span>
                      <h4 className="text-lg font-black text-slate-900 mt-1">
                        {quickViewCourse.title}
                      </h4>
                      <p className="text-xs text-slate-500 font-medium mt-1 leading-relaxed">
                        {quickViewCourse.description}
                      </p>
                    </div>

                    <div className="space-y-2.5 pt-2">
                      <h5 className="text-xs font-black uppercase tracking-wider text-slate-700">
                        Chủ đề trọng tâm trong khóa học:
                      </h5>
                      <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-100 space-y-2 text-xs font-medium text-slate-700">
                        <div className="flex items-start gap-2">
                          <Check className="w-3.5 h-3.5 text-teal-600 mt-0.5 shrink-0" />
                          <span>Phân tích mối nguy sinh học, hóa học, vật lý theo chuẩn Codex mới nhất</span>
                        </div>
                        <div className="flex items-start gap-2">
                          <Check className="w-3.5 h-3.5 text-teal-600 mt-0.5 shrink-0" />
                          <span>Xây dựng sơ đồ cây quyết định xác định điểm kiểm soát tới hạn (CCP)</span>
                        </div>
                        <div className="flex items-start gap-2">
                          <Check className="w-3.5 h-3.5 text-teal-600 mt-0.5 shrink-0" />
                          <span>Thiết lập giới hạn tới hạn, hệ thống giám sát và hành động khắc phục</span>
                        </div>
                        <div className="flex items-start gap-2">
                          <Check className="w-3.5 h-3.5 text-teal-600 mt-0.5 shrink-0" />
                          <span>Thực hành lập hồ sơ lưu trữ và chuẩn bị tiếp đoàn thẩm định cơ quan nhà nước</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-4 border-t border-slate-100">
                      <div className="text-base font-black text-[#005c56]">
                        {quickViewCourse.price || 'Miễn phí'}
                      </div>
                      <Link
                        to={`/khoa-hoc/${quickViewCourse.id}`}
                        onClick={() => setQuickViewCourse(null)}
                        className="px-5 py-2.5 bg-[#005c56] hover:bg-[#00423e] text-white rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-1.5 cursor-pointer shadow-xs"
                      >
                        <span>Xem Chi Tiết &amp; Đăng Ký</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </Link>
                    </div>
                  </div>
                </motion.div>
              </div>
            )}
          </AnimatePresence>

          {/* Highlights & Guarantees Strip */}
          <div className="mt-16 pt-12 border-t border-slate-200/80">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="flex items-start gap-3.5 p-4 rounded-2xl bg-white border border-slate-200/80 shadow-2xs hover:border-teal-300 transition-colors">
                <div className="w-10 h-10 rounded-xl bg-teal-50 text-[#007c76] flex items-center justify-center shrink-0 border border-teal-100 font-bold">
                  ✓
                </div>
                <div>
                  <h4 className="text-xs font-black uppercase text-slate-800 tracking-wide">Chuẩn Hóa Quốc Tế</h4>
                  <p className="text-[11px] text-slate-500 font-medium mt-0.5 leading-snug">Hệ thống kiến thức cập nhật theo ISO 22000 &amp; HACCP Codex mới nhất.</p>
                </div>
              </div>

              <div className="flex items-start gap-3.5 p-4 rounded-2xl bg-white border border-slate-200/80 shadow-2xs hover:border-teal-300 transition-colors">
                <div className="w-10 h-10 rounded-xl bg-teal-50 text-[#007c76] flex items-center justify-center shrink-0 border border-teal-100 font-bold">
                  ★
                </div>
                <div>
                  <h4 className="text-xs font-black uppercase text-slate-800 tracking-wide">Giấy Chứng Nhận Hợp Lệ</h4>
                  <p className="text-[11px] text-slate-500 font-medium mt-0.5 leading-snug">Cấp Giấy chứng nhận hoàn thành có mã QR xác thực năng lực chuyên môn.</p>
                </div>
              </div>

              <div className="flex items-start gap-3.5 p-4 rounded-2xl bg-white border border-slate-200/80 shadow-2xs hover:border-teal-300 transition-colors">
                <div className="w-10 h-10 rounded-xl bg-teal-50 text-[#007c76] flex items-center justify-center shrink-0 border border-teal-100 font-bold">
                  📁
                </div>
                <div>
                  <h4 className="text-xs font-black uppercase text-slate-800 tracking-wide">Bộ Biểu Mẫu SOP Đính Kèm</h4>
                  <p className="text-[11px] text-slate-500 font-medium mt-0.5 leading-snug">Tải trọn gói tài liệu, quy trình tự kiểm và checklist thực hành tại chỗ.</p>
                </div>
              </div>

              <div className="flex items-start gap-3.5 p-4 rounded-2xl bg-white border border-slate-200/80 shadow-2xs hover:border-teal-300 transition-colors">
                <div className="w-10 h-10 rounded-xl bg-teal-50 text-[#007c76] flex items-center justify-center shrink-0 border border-teal-100 font-bold">
                  ⚡
                </div>
                <div>
                  <h4 className="text-xs font-black uppercase text-slate-800 tracking-wide">Truy Cập Trọn Đời</h4>
                  <p className="text-[11px] text-slate-500 font-medium mt-0.5 leading-snug">Học linh hoạt trên mọi thiết bị máy tính, điện thoại 24/7 không giới hạn.</p>
                </div>
              </div>
            </div>
          </div>

          {/* Quick CTA bottom button on Mobile */}
          <div className="mt-8 text-center lg:hidden">
            <Link 
              to="/khoa-hoc" 
              className="inline-block w-full bg-[#005c56] text-white px-8 py-4 rounded-xl font-bold uppercase tracking-wider text-xs shadow-md transition-all text-center"
            >
              Xem tất cả khóa học
            </Link>
          </div>
        </div>
      </section>

    </div>
  );
};

export default Home;
