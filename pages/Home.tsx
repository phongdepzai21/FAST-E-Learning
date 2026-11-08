
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Link } from "react-router-dom";
import Hero from '../components/Hero';
import { COURSES as HARDCODED_COURSES, getMergedCourses, getMergedCombos, extractLessonsFlat } from '../constants';
import { auth, db } from '../firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { collection, onSnapshot, QuerySnapshot, DocumentData } from 'firebase/firestore';
import { Course } from '../types';
import CountUp from 'react-countup';
import { Helmet } from 'react-helmet-async';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ChevronLeft, 
  ChevronRight, 
  ChevronUp,
  CheckCircle2, 
  Sparkles, 
  BookOpen, 
  Clock, 
  ArrowRight, 
  ArrowDown,
  ShieldCheck, 
  Check, 
  X, 
  Eye, 
  Compass,
  Laptop,
  FileCheck,
  Award,
  Layers,
  GraduationCap,
  Zap,
  ArrowUpRight,
  FileText,
  Users,
  Target,
  Star,
  Filter
} from 'lucide-react';

const getOptimizedCourseImage = (url?: string, width = 720) => {
  if (!url) return 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?auto=format&fit=crop&q=80&w=720';
  if (url.includes('images.unsplash.com')) {
    const baseUrl = url.split('?')[0];
    return `${baseUrl}?auto=format&fit=crop&q=80&w=${width}`;
  }
  return url;
};

const DEFAULT_COMBOS_HOME = [
  {
    id: 'combo-basic',
    title: 'Gói Combo Basic (Nhập Môn Thực Phẩm)',
    price: '1.200.000đ',
    originalPrice: '2.400.000đ',
    savings: 'Tiết kiệm 50%',
    image: 'https://images.unsplash.com/photo-1556910103-1c02745aae4d?auto=format&fit=crop&q=80&w=800',
    description: 'Gói Combo Basic: Học trọn gói các kiến thức cơ bản về HACCP Codex, 5 nguyên tắc vàng của WHO và quy trình tự kiểm soát an toàn thực phẩm.',
    courseIds: ['basic-principles', 'truy-xuat-nguon-goc'],
    benefits: ['Tài liệu biểu mẫu SOP đính kèm', 'Cấp chứng nhận hoàn thành']
  },
  {
    id: 'combo-pro',
    title: 'Gói Combo Pro (Chuyên Gia Vận Hành)',
    price: '1.800.000đ',
    originalPrice: '3.600.000đ',
    savings: 'Tiết kiệm 50%',
    image: 'https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?auto=format&fit=crop&q=80&w=800',
    description: 'Gói Combo Pro: Học chuyên sâu dành cho kỹ sư & quản lý vận hành nhà máy gồm trọn bộ ISO 9001, ISO 14001 & ISO 22000.',
    courseIds: ['iso-9001', 'iso-14001', 'iso-22000'],
    benefits: ['Tài liệu hướng dẫn chuyên sâu', 'Hỗ trợ giải đáp chuyên gia 24/7']
  }
];

const Home: React.FC = () => {
  const mainWebsite = "https://2fast.com.vn";
  const [ownedCourseIds, setOwnedCourseIds] = useState<string[]>([]);
  const [allCourses, setAllCourses] = useState<Course[]>(() => getMergedCourses([]));
  const [homeCombos, setHomeCombos] = useState<any[]>(DEFAULT_COMBOS_HOME);
  const [activeHoverCard, setActiveHoverCard] = useState<string | null>(null);

  // Helper calculation for original price line-through and discount percentage badges
  const getCoursePriceDisplay = (course: Course) => {
    const price = course.price || 'Miễn phí';
    let originalPrice = course.originalPrice;
    let discountBadge = course.discountPercent ? `-${course.discountPercent}%` : null;

    if (!originalPrice && price && price !== 'Miễn phí' && price.includes('đ')) {
      const num = parseInt(price.replace(/[^0-9]/g, ''), 10);
      if (!isNaN(num) && num > 0) {
        originalPrice = (num * 2).toLocaleString('vi-VN') + 'đ';
        discountBadge = '-50%';
      }
    } else if (originalPrice && !discountBadge && originalPrice !== price) {
      const priceNum = parseInt(price.replace(/[^0-9]/g, ''), 10);
      const origNum = parseInt(originalPrice.replace(/[^0-9]/g, ''), 10);
      if (!isNaN(priceNum) && !isNaN(origNum) && origNum > priceNum) {
        const pct = Math.round(((origNum - priceNum) / origNum) * 100);
        discountBadge = `-${pct}%`;
      }
    }

    return { price, originalPrice, discountBadge };
  };

  // Curated list of featured courses (deduplicated & active)
  const featuredCourses = useMemo(() => {
    const seen = new Set<string>();
    const list: Course[] = [];
    for (const c of allCourses) {
      if (!c || !c.id || c.id === 'test-course-2k' || c.status === 'draft' || c.status === 'inactive') continue;
      if (!seen.has(c.id)) {
        seen.add(c.id);
        list.push(c);
      }
    }
    if (list.length === 0) {
      return HARDCODED_COURSES;
    }
    return list;
  }, [allCourses]);

  // Top 5 Featured Prominent Courses (HACCP, ISO 22000, ISO 9001, ISO 14001, VietGAP)
  const top5Courses = useMemo(() => {
    const famousCourseIds = ['haccp-tcvn', 'iso-22000', 'iso-9001', 'iso-14001', 'vietgap'];
    const list: Course[] = [];

    // 1. Lấy từ allCourses theo thứ tự ưu tiên (chỉ lấy khóa đang hoạt động, bỏ qua khóa ẩn/nháp)
    for (const id of famousCourseIds) {
      const found = allCourses.find(c => c.id === id && c.status !== 'draft' && c.status !== 'inactive');
      if (found && !list.some(item => item.id === found.id)) {
        list.push(found);
      }
    }

    // 2. Nếu thiếu 5 khóa do có khóa bị ẩn, bù từ các khóa học đang hoạt động khác trong featuredCourses
    for (const c of featuredCourses) {
      if (!list.some(item => item.id === c.id)) {
        list.push(c);
      }
      if (list.length >= 5) break;
    }

    return list.slice(0, 5);
  }, [allCourses, featuredCourses]);

  const marqueeContainerRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState<number>(1200);
  const currentXRef = useRef<number>(0);
  const targetXRef = useRef<number | null>(null);
  const isHoveringRef = useRef<boolean>(false);
  const hoveredCardKeyRef = useRef<string | null>(null);
  const rafIdRef = useRef<number | null>(null);

  useEffect(() => {
    const el = marqueeContainerRef.current;
    if (!el) return;
    const updateSize = () => {
      if (el) {
        const w = el.clientWidth || el.getBoundingClientRect().width;
        if (w > 0) setContainerWidth(w);
      }
    };
    updateSize();
    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) {
        if (entry.contentRect.width > 0) {
          setContainerWidth(entry.contentRect.width);
        }
      }
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const marqueeGap = containerWidth < 640 ? 14 : 20;
  // Trên desktop hiển thị 3 trang/lượt nhìn, trên màn hình nhỏ điều chỉnh kích thước vừa vặn dễ đọc
  const cardWidth = containerWidth >= 768 
    ? Math.floor((containerWidth - 2 * marqueeGap) / 3) 
    : Math.max(270, Math.min(330, containerWidth - 40));
  const groupWidth = 5 * cardWidth + 5 * marqueeGap;

  // Tự động trôi chậm và mượt mà kéo card ra chính giữa vùng di chuyển khi lia chuột
  useEffect(() => {
    const track = trackRef.current;
    if (!track || groupWidth <= 0) return;

    const minX = -groupWidth * 2.5;
    const maxX = -groupWidth * 0.5;

    if (currentXRef.current === 0 || isNaN(currentXRef.current)) {
      currentXRef.current = -groupWidth * 1.5;
    }

    let lastTime = performance.now();

    const loop = (now: number) => {
      const dt = Math.min((now - lastTime) / 1000, 0.1);
      lastTime = now;

      if (isHoveringRef.current && targetXRef.current !== null) {
        // Tự động kéo card ra đúng chính giữa phần di chuyển mượt mà
        const diff = targetXRef.current - currentXRef.current;
        if (Math.abs(diff) > 0.4) {
          currentXRef.current += diff * 0.12;
        } else {
          currentXRef.current = targetXRef.current;
        }
      } else {
        // Trôi chậm tự nhiên từ trái sang phải (~36px/s)
        const speed = 36 * dt;
        currentXRef.current += speed;

        // Vòng lặp liên tục giữa các nhóm card
        if (currentXRef.current > maxX) {
          currentXRef.current -= groupWidth;
          if (targetXRef.current !== null) targetXRef.current -= groupWidth;
        } else if (currentXRef.current < minX) {
          currentXRef.current += groupWidth;
          if (targetXRef.current !== null) targetXRef.current += groupWidth;
        }
      }

      if (track) {
        track.style.transform = `translate3d(${currentXRef.current}px, 0, 0)`;
      }

      rafIdRef.current = requestAnimationFrame(loop);
    };

    rafIdRef.current = requestAnimationFrame(loop);
    return () => {
      if (rafIdRef.current) cancelAnimationFrame(rafIdRef.current);
    };
  }, [groupWidth]);

  // Handler: Lia chuột hoặc chạm vào card -> tính toán vị trí để kéo thẳng ra giữa
  const handleCardFocusOrHover = (cardKey: string, cardEl: HTMLElement) => {
    setActiveHoverCard(cardKey);
    isHoveringRef.current = true;
    hoveredCardKeyRef.current = cardKey;

    if (!marqueeContainerRef.current) return;
    const containerRect = marqueeContainerRef.current.getBoundingClientRect();
    const cardRect = cardEl.getBoundingClientRect();

    const containerCenter = containerRect.left + containerRect.width / 2;
    const cardCenter = cardRect.left + cardRect.width / 2;
    const delta = containerCenter - cardCenter;

    targetXRef.current = currentXRef.current + delta;
  };

  const handleCardMouseLeave = () => {
    setActiveHoverCard(null);
    hoveredCardKeyRef.current = null;
  };

  const handleContainerMouseLeave = () => {
    setActiveHoverCard(null);
    hoveredCardKeyRef.current = null;
    isHoveringRef.current = false;
    targetXRef.current = null;
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

  // Sync combos real-time from Firestore and local caches
  useEffect(() => {
    let latestFsCombos: any[] = [];
    const syncCombos = (fsList?: any[]) => {
      if (fsList) latestFsCombos = fsList;
      const merged = getMergedCombos(latestFsCombos, { includeInactive: false })
        .filter(c => c.id !== 'combo-vip' && c.id !== 'khoa-vip');
      setHomeCombos(merged);
    };

    const unsub = onSnapshot(collection(db, 'combos'), (snapshot) => {
      const dbCombos: any[] = [];
      snapshot.forEach(docSnap => {
        dbCombos.push({ id: docSnap.id, ...docSnap.data() });
      });
      syncCombos(dbCombos);
    }, () => {
      syncCombos();
    });

    const handleSync = () => syncCombos();
    window.addEventListener('combos_updated', handleSync);
    window.addEventListener('storage', handleSync);

    return () => {
      unsub();
      window.removeEventListener('combos_updated', handleSync);
      window.removeEventListener('storage', handleSync);
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
      
      {/* 0. Core Pillars (Cam kết thực chiến & Giá trị cốt lõi - Trung thực, chuẩn hóa, không số liệu ảo) */}
      <section className="py-10 md:py-16 bg-[#007c76] text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-12 text-center divide-y md:divide-y-0 md:divide-x divide-white/20">
            <div className="py-4 md:py-0 group flex flex-col items-center">
              <div className="w-12 h-12 rounded-2xl bg-white/10 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                <BookOpen className="w-6 h-6 text-teal-200" />
              </div>
              <h3 className="text-lg md:text-xl font-black mb-1 tracking-tight">Chuẩn Hóa Quốc Tế</h3>
              <p className="text-white/80 font-medium text-xs md:text-sm max-w-xs">
                Chương trình bám sát tiêu chuẩn ISO 22000 &amp; Codex của Bộ Y Tế
              </p>
            </div>
            <div className="py-4 md:py-0 group flex flex-col items-center">
              <div className="w-12 h-12 rounded-2xl bg-white/10 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                <Laptop className="w-6 h-6 text-teal-200" />
              </div>
              <h3 className="text-lg md:text-xl font-black mb-1 tracking-tight">Học E-Learning 24/7</h3>
              <p className="text-white/80 font-medium text-xs md:text-sm max-w-xs">
                Video bài giảng 15-20 phút cô đọng, tự do học mọi lúc mọi nơi
              </p>
            </div>
            <div className="py-4 md:py-0 group flex flex-col items-center">
              <div className="w-12 h-12 rounded-2xl bg-white/10 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                <Award className="w-6 h-6 text-teal-200" />
              </div>
              <h3 className="text-lg md:text-xl font-black mb-1 tracking-tight">Nhận Chứng Nhận Ngay &amp; Liền</h3>
              <p className="text-white/80 font-medium text-xs md:text-sm max-w-xs">
                Nhận chứng nhận ngay và liền (không nhận chứng nhận online), xác thực năng lực chuyên môn
              </p>
            </div>
          </div>
        </div>
      </section>


      {/* 2. Featured Courses (Cấu trúc Khóa Học Nổi Bật Hiện Đại, Bắt Mắt, Layout 3 Cột, Filter Tabs, Sale Off & Dynamic Syllabus Preview) */}
      <section 
        className="py-14 md:py-20 bg-gradient-to-b from-slate-50 via-teal-950/[0.02] to-white border-t border-slate-200/80 relative overflow-hidden"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          {/* Section Header */}
          <div className="text-center mb-8 md:mb-12">
            <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-teal-50 border border-teal-200/70 text-teal-800 text-xs font-bold uppercase tracking-wider mb-3 shadow-2xs">
              <Sparkles className="w-3.5 h-3.5 text-[#007c76]" />
              <span>Chương Trình Đào Tạo Thực Chiến</span>
            </div>
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-black text-slate-900 tracking-tight leading-snug">
              Khóa Học <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#007c76] to-emerald-600">Nổi Bật</span>
            </h2>
            <p className="text-slate-500 font-medium text-xs sm:text-sm md:text-base max-w-2xl mx-auto mt-2.5 leading-relaxed">
              Chuẩn hóa quy trình ISO, HACCP Codex &amp; VietGAP cùng các chuyên gia hàng đầu. Đầy đủ bộ biểu mẫu SOP thực tế và cấp chứng nhận toàn quốc.
            </p>
          </div>

          {/* Featured Courses 3-Column Modern Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {featuredCourses.map((c) => {
              const cLessons = extractLessonsFlat(c.curriculum);
              const { price, originalPrice, discountBadge } = getCoursePriceDisplay(c);
              const isOwned = ownedCourseIds.includes(c.id);
              const cardKey = `home-featured-${c.id}`;
              const isHoveredOrActive = activeHoverCard === cardKey;

              return (
                <div
                  key={c.id}
                  className="bg-white rounded-3xl border border-slate-200/90 shadow-sm hover:shadow-xl hover:border-teal-500/60 transition-all duration-300 flex flex-col overflow-hidden group relative hover:-translate-y-1.5"
                  onMouseEnter={() => setActiveHoverCard(cardKey)}
                  onMouseLeave={() => setActiveHoverCard(null)}
                >
                  {/* Image Container with scrim overlay & status badges */}
                  <div className="relative h-52 sm:h-56 overflow-hidden bg-slate-100 shrink-0">
                    <img
                      src={getOptimizedCourseImage(c.image, 600)}
                      alt={c.title}
                      loading="lazy"
                      decoding="async"
                      className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?auto=format&fit=crop&q=80&w=600';
                      }}
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-slate-950/20 to-transparent pointer-events-none" />

                    {/* Top Left Category Tag */}
                    <div className="absolute top-3 left-3 z-10">
                      <span className="bg-slate-900/90 backdrop-blur-xs text-teal-200 font-bold px-2.5 py-1 rounded-lg text-[11px] uppercase tracking-wider shadow-sm border border-teal-500/30">
                        {c.category || 'Tiêu chuẩn ISO'}
                      </span>
                    </div>

                    {/* Top Right Sale Off Discount Badge */}
                    {discountBadge && (
                      <div className="absolute top-3 right-3 z-10">
                        <span className="bg-gradient-to-r from-red-600 to-emerald-600 text-white font-black px-2.5 py-1 rounded-lg text-[11px] uppercase tracking-wider shadow-md border border-white/20 flex items-center gap-1 animate-pulse">
                          🏷️ {discountBadge}
                        </span>
                      </div>
                    )}

                    {/* Owned status indicator */}
                    {isOwned && (
                      <div className="absolute bottom-3 left-3 z-10">
                        <span className="bg-emerald-500 text-slate-950 font-black px-2.5 py-0.5 rounded-md text-[10px] uppercase tracking-wider shadow-md flex items-center gap-1">
                          <CheckCircle2 className="w-3.0 h-3.0" />
                          Đã sở hữu
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Body Content */}
                  <div className="p-5 sm:p-6 flex-1 flex flex-col justify-between space-y-4 bg-white">
                    <div className="space-y-2">
                      <Link to={`/khoa-hoc/${c.id}`} className="block group-hover:text-[#007c76] transition-colors">
                        <h3 className="text-base sm:text-lg font-black text-slate-900 leading-snug line-clamp-2">
                          {c.title}
                        </h3>
                      </Link>

                      {c.description && (
                        <p className="text-xs text-slate-500 font-medium leading-relaxed line-clamp-2">
                          {c.description}
                        </p>
                      )}
                    </div>

                    {/* Side-by-side Pricing & Action Buttons */}
                    <div className="pt-4 border-t border-slate-100 flex items-center justify-between mt-auto">
                      <div className="flex flex-col">
                        <div className="flex items-center gap-1.5">
                          <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Học phí</span>
                          {originalPrice && originalPrice !== price && (
                            <span className="text-xs text-slate-400 line-through font-medium">
                              {originalPrice}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-lg font-black text-[#007c76]">
                            {price}
                          </span>
                          {discountBadge && (
                            <span className="text-[10px] font-bold text-red-600 bg-red-50 border border-red-200/60 px-1.5 py-0.5 rounded">
                              {discountBadge}
                            </span>
                          )}
                        </div>
                      </div>

                      <Link
                        to={`/khoa-hoc/${c.id}`}
                        className="px-4 py-2.5 bg-[#007c76] hover:bg-[#005c56] text-white rounded-xl text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 shadow-xs hover:shadow-md transition-all active:scale-[0.98]"
                      >
                        <span>{isOwned ? 'Vào Học' : 'Xem Chi Tiết'}</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </Link>
                    </div>
                  </div>

                  {/* Interactive Dynamic Syllabus Preview Slide-Up (Triggered on hover/focus) */}
                  <div
                    className={`absolute inset-0 z-20 bg-white flex flex-col transition-all duration-300 ease-out ${
                      isHoveredOrActive
                        ? 'translate-y-0 opacity-100 pointer-events-auto'
                        : 'translate-y-full opacity-0 pointer-events-none'
                    }`}
                  >
                    {/* Drawer Header */}
                    <div className="bg-gradient-to-r from-slate-950 via-teal-950 to-slate-900 text-white p-4 shrink-0 border-b border-teal-800/40">
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-teal-300 bg-teal-500/20 border border-teal-400/30 px-2 py-0.5 rounded">
                          {c.category || 'Tiêu chuẩn'}
                        </span>
                        <span className="text-[10px] font-bold text-emerald-300 bg-emerald-950/80 border border-emerald-500/30 px-2.5 py-0.5 rounded-full flex items-center gap-1">
                          <BookOpen className="w-3 h-3 text-emerald-400" />
                          {cLessons.length} bài thực chiến
                        </span>
                      </div>
                      <Link to={`/khoa-hoc/${c.id}`} className="block">
                        <h4 className="text-xs sm:text-sm font-black text-white hover:text-teal-200 transition-colors line-clamp-1 leading-snug">
                          {c.title}
                        </h4>
                      </Link>
                    </div>

                    {/* Lesson Scroll List */}
                    <div className="p-3.5 flex-1 min-h-0 flex flex-col bg-slate-50/80">
                      <div className="flex items-center justify-between pb-1.5 mb-2 border-b border-slate-200/80">
                        <span className="text-[11px] font-black text-slate-800 uppercase tracking-wide flex items-center gap-1.5">
                          <Sparkles className="w-3.5 h-3.5 text-teal-600" />
                          Nội Dung Đào Tạo Trọng Tâm
                        </span>
                        <span className="text-[10px] text-slate-400 font-medium">Cuộn để xem</span>
                      </div>

                      <div className="space-y-1.5 overflow-y-auto custom-scrollbar flex-1 pr-1">
                        {cLessons.length > 0 ? (
                          cLessons.map((lesson, lIdx) => (
                            <Link
                              key={lIdx}
                              to={`/khoa-hoc/${c.id}`}
                              className="flex items-start gap-2 p-2 rounded-lg bg-white hover:bg-teal-50/60 border border-slate-200/80 hover:border-teal-300 transition-all text-left group/item"
                            >
                              <div className="w-5 h-5 rounded-md bg-teal-100/90 text-teal-800 text-[10px] font-black flex items-center justify-center shrink-0 mt-0.5 group-hover/item:bg-teal-600 group-hover/item:text-white transition-colors">
                                {String(lIdx + 1).padStart(2, '0')}
                              </div>
                              <div className="min-w-0 flex-grow">
                                <p className="text-[11px] sm:text-xs font-bold text-slate-800 line-clamp-1 group-hover/item:text-teal-900 transition-colors">
                                  {lesson.title}
                                </p>
                                {lesson.content && (
                                  <p className="text-[10px] text-slate-500 line-clamp-1 mt-0.5 font-medium">
                                    {lesson.content}
                                  </p>
                                )}
                              </div>
                            </Link>
                          ))
                        ) : (
                          <div className="p-3 text-xs text-slate-500 text-center italic">
                            Chương trình đào tạo chi tiết được cập nhật liên tục.
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Drawer Footer CTA */}
                    <div className="p-3.5 bg-white rounded-b-3xl border-t border-slate-100 shrink-0 flex items-center justify-between gap-3">
                      <div className="flex flex-col">
                        <span className="text-[10px] text-slate-400 font-bold uppercase">Học phí ưu đãi</span>
                        <span className="text-base font-black text-[#007c76]">{price}</span>
                      </div>
                      <Link
                        to={`/khoa-hoc/${c.id}`}
                        className="py-2.5 px-5 bg-[#007c76] hover:bg-[#005c56] text-white text-xs font-bold uppercase tracking-wider rounded-xl flex items-center justify-center gap-1.5 shadow-xs hover:shadow-md transition-all active:scale-[0.98]"
                      >
                        <span>Vào Học Ngay</span>
                        <ArrowRight className="w-4 h-4" />
                      </Link>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {featuredCourses.length === 0 && (
            <div className="text-center py-12 bg-white rounded-3xl border border-slate-200/80 p-8">
              <p className="text-slate-500 font-medium text-sm">
                Đang cập nhật danh sách khóa học nổi bật.
              </p>
            </div>
          )}
        </div>
      </section>

      {/* 2.5. Gói Combo & Ưu Đãi Sale Off 50% (Layout Lưới 3 Cột Hiện Đại, Đổ Bóng Hover & Badge Tiết Kiệm) */}
      <section className="py-14 md:py-20 bg-gradient-to-b from-white via-slate-50 to-teal-950/[0.02] border-t border-slate-200/80 relative overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          {/* Flash Sale Banner Header */}
          <div className="bg-gradient-to-r from-slate-950 via-teal-950 to-slate-900 text-white rounded-3xl p-6 sm:p-8 mb-10 border border-teal-500/30 shadow-xl flex flex-col md:flex-row items-center justify-between gap-6 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-72 h-72 bg-teal-500/10 rounded-full blur-3xl pointer-events-none" />
            <div className="space-y-2 text-center md:text-left relative z-10">
              <div className="inline-flex items-center gap-2 px-3 py-1 bg-red-600/90 text-white rounded-xl text-xs font-black uppercase tracking-wider shadow-md animate-pulse">
                <span>🔥 SIÊU ƯU ĐÃI SALE OFF 50%</span>
              </div>
              <h3 className="text-2xl sm:text-3xl font-black uppercase tracking-tight text-white leading-tight">
                Gói Combo Đào Tạo Trọn Gói Tiết Kiệm
              </h3>
              <p className="text-slate-300 text-xs sm:text-sm font-medium max-w-xl">
                Đăng ký học trọn bộ tiêu chuẩn ISO, HACCP &amp; VietGAP với chi phí ưu đãi nhất. Tiết kiệm đến 50% so với đăng ký riêng lẻ.
              </p>
            </div>
            <Link
              to="/account/vip-upgrade"
              className="px-6 py-3.5 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white rounded-2xl font-black text-xs uppercase tracking-wider shadow-lg hover:scale-105 transition-all shrink-0 cursor-pointer flex items-center gap-2"
            >
              <span>Đăng Ký Nhận Sale Off</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          {/* 3-Column Combo Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {homeCombos.map((combo) => {
              const isVip = combo.id === 'khoa-vip' || combo.id.includes('vip');
              const isPro = combo.id === 'combo-pro' || combo.id.includes('pro');
              const savingsBadge = combo.savings || 'Tiết kiệm 50%';
              const originalPriceStr = combo.originalPrice || (combo.price === '1.200.000đ' ? '2.400.000đ' : combo.price === '1.800.000đ' ? '3.600.000đ' : combo.price === '2.500.000đ' ? '5.000.000đ' : '');
              const cIds: string[] = Array.isArray(combo.courseIds) ? combo.courseIds : [];
              const comboCourses = allCourses.filter(c => cIds.includes(c.id));

              return (
                <div
                  key={combo.id}
                  className={`bg-white rounded-3xl border-2 transition-all duration-300 overflow-hidden flex flex-col hover:shadow-2xl hover:-translate-y-1.5 group relative ${
                    isVip 
                      ? 'border-amber-400/90 shadow-md shadow-amber-500/10 hover:border-amber-500' 
                      : isPro 
                        ? 'border-teal-400/80 shadow-md shadow-teal-500/10 hover:border-teal-500' 
                        : 'border-slate-200/90 hover:border-teal-500/60 shadow-sm'
                  }`}
                >
                  {/* Image & Badges */}
                  <div className="relative h-48 overflow-hidden shrink-0">
                    <img
                      src={combo.image}
                      alt={combo.title}
                      className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&q=80&w=800';
                      }}
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-slate-950/20 to-transparent pointer-events-none" />

                    {/* Status Badge 'Tiết kiệm' */}
                    <div className="absolute top-3 right-3 z-10">
                      <span className="bg-gradient-to-r from-red-600 via-emerald-600 to-teal-600 text-white font-black px-3 py-1 rounded-xl text-[11px] uppercase tracking-wider shadow-lg border border-white/20 flex items-center gap-1 backdrop-blur-xs">
                        🏷️ {savingsBadge}
                      </span>
                    </div>

                    {isVip && (
                      <div className="absolute top-3 left-3 z-10">
                        <span className="bg-amber-500 text-amber-950 font-black px-3 py-1 rounded-xl text-[10px] uppercase tracking-widest shadow-md flex items-center gap-1 border border-amber-300/40">
                          ⭐ Đặc Quyền VIP
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Body Info */}
                  <div className="p-6 flex-1 flex flex-col justify-between space-y-4">
                    <div className="space-y-2">
                      <h3 className="text-base sm:text-lg font-black text-slate-900 group-hover:text-[#007c76] transition-colors leading-snug line-clamp-1">
                        {combo.title}
                      </h3>
                      <p className="text-xs text-slate-500 font-medium leading-relaxed line-clamp-2">
                        {combo.description}
                      </p>
                    </div>

                    {/* Inner Courses List */}
                    <div className="space-y-1.5 p-3 bg-slate-50 rounded-2xl border border-slate-200/60 max-h-40 overflow-y-auto custom-scrollbar">
                      <div className="text-[10px] font-black uppercase text-slate-400 tracking-wider mb-1 flex items-center justify-between">
                        <span>Gồm {isVip ? 'Tất cả' : comboCourses.length} chuyên đề:</span>
                        <span className="text-[#007c76]">ISO &amp; HACCP</span>
                      </div>
                      {comboCourses.length > 0 ? (
                        comboCourses.map((c, cIdx) => (
                          <div key={c.id || cIdx} className="flex items-center justify-between gap-2 text-xs font-bold text-slate-800 bg-white p-2 rounded-xl border border-slate-100 shadow-2xs">
                            <span className="truncate">{c.title}</span>
                            <span className="text-[9px] px-1.5 py-0.5 rounded bg-teal-50 text-[#007c76] font-bold shrink-0">{c.category || 'ISO'}</span>
                          </div>
                        ))
                      ) : (
                        <div className="text-[11px] text-slate-500 font-medium italic">
                          Mở khóa trọn bộ kiến thức đào tạo an toàn thực phẩm.
                        </div>
                      )}
                    </div>

                    {/* Price & CTA */}
                    <div className="pt-3 border-t border-slate-100 flex items-center justify-between mt-auto">
                      <div className="flex flex-col">
                        <div className="flex items-center gap-1.5">
                          <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Học phí</span>
                          {originalPriceStr && (
                            <span className="text-[11px] text-slate-400 line-through font-medium">
                              {originalPriceStr}
                            </span>
                          )}
                        </div>
                        <span className="text-lg font-black text-[#007c76]">{combo.price}</span>
                      </div>

                      <Link
                        to="/account/vip-upgrade"
                        className={`px-5 py-2.5 rounded-xl font-black text-[11px] uppercase tracking-widest transition-all cursor-pointer shadow-sm flex items-center gap-1 ${
                          isVip 
                            ? 'bg-amber-500 text-amber-950 hover:bg-amber-600 shadow-amber-500/20' 
                            : isPro 
                              ? 'bg-teal-600 text-white hover:bg-teal-700 shadow-teal-900/20' 
                              : 'bg-[#007c76] text-white hover:bg-[#005f5b] shadow-[#007c76]/20'
                        }`}
                      >
                        <span>Đăng ký gói</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </Link>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* 3. BẮT ĐẦU CÙNG FAST (Rút ngắn tinh gọn, lộ trình 4 bước chuẩn hóa thực chiến) */}
      <section className="py-12 md:py-16 bg-white overflow-hidden relative border-t border-slate-200/80">
        {/* Soft background ambient gradient */}
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-teal-50/40 rounded-full blur-3xl -mr-40 -mt-40 pointer-events-none"></div>
        <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-emerald-50/30 rounded-full blur-3xl -ml-40 -mb-40 pointer-events-none"></div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          {/* Header */}
          <div className="text-center mb-10 sm:mb-12">
            <span className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-teal-50 border border-teal-200/70 text-teal-700 text-xs font-bold uppercase tracking-wider mb-2.5 shadow-2xs">
              <Sparkles className="w-3.5 h-3.5 text-teal-600" />
              Lộ trình chuẩn hóa thực chiến
            </span>
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-black text-slate-900 mb-3 tracking-tight uppercase">
              Bắt Đầu Cùng <span className="text-transparent bg-clip-text bg-gradient-to-r from-teal-700 to-emerald-600">FAST</span>
            </h2>
            <p className="text-slate-500 font-medium text-sm sm:text-base max-w-2xl mx-auto leading-relaxed">
              Quy trình tinh gọn từ khảo sát nhu cầu đến vận hành đạt chuẩn và cấp chứng nhận QR số hóa.
            </p>
          </div>

          {/* Connected Roadmap - Tinh gọn, thanh thoát, không số bước và không nút tích rườm rà */}
          <div className="relative">
            {/* Center Gradient Spine with Animated Glowing Light Beam for Desktop */}
            <div className="hidden md:block absolute left-1/2 top-6 bottom-6 w-1.5 -translate-x-1/2 bg-gradient-to-b from-teal-200 via-teal-300 to-emerald-200 rounded-full pointer-events-none overflow-hidden">
              <div className="w-full h-24 bg-gradient-to-b from-transparent via-teal-600 to-transparent spine-beam-light rounded-full opacity-90" />
            </div>
            
            {/* Left Gradient Spine for Mobile */}
            <div className="md:hidden absolute left-6 top-6 bottom-6 w-1.5 bg-gradient-to-b from-teal-200 via-teal-300 to-emerald-200 rounded-full pointer-events-none overflow-hidden">
              <div className="w-full h-20 bg-gradient-to-b from-transparent via-teal-600 to-transparent spine-beam-light rounded-full opacity-90" />
            </div>

            <div className="space-y-6 md:space-y-8">
              {[
                {
                  phase: 'Khảo sát & Định hướng',
                  icon: Compass,
                  label: 'Giới thiệu chung về tiêu chuẩn',
                  desc: 'Khảo sát nhanh nhu cầu và đặc thù cơ sở để xác định đúng tiêu chuẩn mục tiêu: HACCP Codex, ISO 22000 hay QA/QC chuyên sâu, tránh học dàn trải lãng phí chi phí.',
                  accentGradient: 'from-teal-500 to-emerald-500'
                },
                {
                  phase: 'Học tập & Thực hành',
                  icon: GraduationCap,
                  label: 'Lập phương án & Hướng dẫn thực hành',
                  desc: 'Học qua video bài giảng cô đọng 15-20 phút linh hoạt mọi lúc mọi nơi; hệ thống hóa toàn bộ quy trình kiểm soát an toàn và chất lượng thực tế.',
                  accentGradient: 'from-emerald-500 to-teal-600'
                },
                {
                  phase: 'Thực địa & Cố vấn',
                  icon: ShieldCheck,
                  label: 'Áp dụng thực địa & Cố vấn 1-1',
                  desc: 'Đưa kiến thức vào dây chuyền vận hành thực tế, thiết lập các điểm kiểm soát tới hạn (CCP) và kết nối trao đổi 1-1 với chuyên gia FAST để khắc phục điểm yếu thanh tra.',
                  accentGradient: 'from-teal-600 to-cyan-600'
                },
                {
                  phase: 'Đánh giá & Chứng nhận',
                  icon: Award,
                  label: 'Nhận Chứng Nhận Ngay & Liền',
                  desc: 'Hoàn thành bài kiểm tra năng lực, nhận chứng nhận ngay và liền (không nhận chứng nhận online), xác thực chuẩn năng lực chuyên môn toàn quốc.',
                  accentGradient: 'from-amber-500 to-teal-600'
                }
              ].map((item, idx) => {
                const isEven = idx % 2 === 0;
                const IconComponent = item.icon;
                return (
                  <div 
                    key={idx} 
                    className={`relative flex flex-col md:flex-row items-center ${isEven ? 'md:flex-row-reverse' : ''} group`}
                  >
                    {/* Horizontal Connector Arm for Desktop */}
                    <div 
                      className={`hidden md:block absolute top-1/2 -translate-y-1/2 h-0.5 ${
                        isEven ? 'right-1/2 w-12 lg:w-16 bg-gradient-to-l from-teal-400 to-transparent' : 'left-1/2 w-12 lg:w-16 bg-gradient-to-r from-teal-400 to-transparent'
                      } pointer-events-none z-10`}
                    />

                    {/* Mobile Node */}
                    <div className="md:hidden absolute left-6 top-6 -translate-x-1/2 w-9 h-9 bg-white border-2 border-teal-500 rounded-lg shadow-sm z-20 flex items-center justify-center group-hover:scale-105 group-hover:border-teal-600 transition-transform">
                      <IconComponent className="w-4 h-4 text-teal-600" />
                    </div>

                    {/* Desktop Center Node - Tinh tế, không số bước rườm rà */}
                    <div className="hidden md:flex absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-11 h-11 rounded-xl bg-white border-2 border-teal-500 shadow-md shadow-teal-500/15 ring-2 ring-teal-500/10 z-20 items-center justify-center group-hover:scale-110 group-hover:border-teal-600 transition-all duration-300">
                      <IconComponent className="w-5 h-5 text-teal-600" />
                    </div>

                    {/* Content Box */}
                    <div className={`w-full pl-14 md:pl-0 md:w-1/2 ${isEven ? 'md:pl-10 lg:pl-14' : 'md:pr-10 lg:pr-14 text-left'}`}>
                      <div className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-200/90 shadow-xs hover:shadow-lg hover:border-teal-400 hover:-translate-y-0.5 transition-all duration-300 relative overflow-hidden">
                        {/* Glowing Edge Accent */}
                        <div className={`absolute top-0 left-0 w-1.5 h-full bg-gradient-to-b ${item.accentGradient}`}></div>

                        {/* Top Phase Header */}
                        <div className="flex items-center justify-between gap-2 mb-2">
                          <span className="text-xs font-black text-teal-700 uppercase tracking-wider">
                            {item.phase}
                          </span>
                        </div>

                        {/* Title */}
                        <h4 className="text-base sm:text-lg font-black text-slate-900 group-hover:text-teal-700 transition-colors mb-2 leading-snug">
                          {item.label}
                        </h4>

                        {/* Description */}
                        <p className="text-slate-600 font-medium text-xs sm:text-sm leading-relaxed">
                          {item.desc}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Bottom Bento Action Banner - Xóa số liệu ảo tránh lừa dối khách hàng */}
          <div className="mt-10 sm:mt-14 bg-gradient-to-r from-slate-950 via-teal-950 to-slate-900 text-white rounded-3xl p-6 sm:p-10 lg:p-12 border border-teal-500/30 shadow-2xl relative overflow-hidden">
            {/* Ambient subtle glow */}
            <div className="absolute top-0 right-0 w-80 h-80 bg-teal-500/15 rounded-full blur-3xl pointer-events-none"></div>

            <div className="relative z-10 flex flex-col lg:flex-row items-center justify-between gap-8">
              <div className="space-y-3 text-center lg:text-left max-w-2xl">
                <span className="text-teal-400 font-bold uppercase tracking-[0.25em] text-xs inline-flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  Đồng Hành Toàn Diện Cùng FAST E-Learning
                </span>
                <h3 className="text-2xl sm:text-3xl lg:text-4xl font-black uppercase tracking-tight text-white leading-tight">
                  Sẵn Sàng Nâng Tầm Năng Lực Cùng FAST?
                </h3>
                <p className="text-xs sm:text-sm text-slate-300 font-medium leading-relaxed">
                  Khám phá ngay kho bài giảng thực tế và kiến thức chuẩn hóa vận hành an toàn thực phẩm. Kích hoạt tài khoản để vào học ngay trong hôm nay.
                </p>

                {/* 3 Cam kết thực tế chuẩn hóa (Đã xóa số liệu ảo tránh lừa dối khách hàng) */}
                <div className="pt-4 grid grid-cols-1 sm:grid-cols-3 gap-4 border-t border-white/10 text-center sm:text-left">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-teal-500/20 border border-teal-400/30 flex items-center justify-center shrink-0">
                      <CheckCircle2 className="w-5 h-5 text-teal-300" />
                    </div>
                    <div>
                      <div className="text-xs sm:text-sm font-bold text-white">Chuẩn Quốc Tế</div>
                      <div className="text-[10px] text-teal-200/80 font-medium">ISO 22000 &amp; Codex</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-emerald-500/20 border border-emerald-400/30 flex items-center justify-center shrink-0">
                      <ShieldCheck className="w-5 h-5 text-emerald-300" />
                    </div>
                    <div>
                      <div className="text-xs sm:text-sm font-bold text-white">Kiến Thức Thực Tế</div>
                      <div className="text-[10px] text-emerald-200/80 font-medium">Biểu mẫu áp dụng trực tiếp</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-amber-500/20 border border-amber-400/30 flex items-center justify-center shrink-0">
                      <Award className="w-5 h-5 text-amber-300" />
                    </div>
                    <div>
                      <div className="text-xs sm:text-sm font-bold text-white">Nhận Chứng Nhận Ngay &amp; Liền</div>
                      <div className="text-[10px] text-amber-200/80 font-medium">Không nhận chứng nhận online</div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row items-center gap-3.5 shrink-0 w-full sm:w-auto">
                <Link
                  to="/khoa-hoc"
                  className="w-full sm:w-auto px-7 py-4 bg-[#007c76] hover:bg-[#00605b] text-white rounded-2xl text-xs font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-2 cursor-pointer shadow-lg hover:scale-105 active:scale-95"
                >
                  <span>Khám Phá Khóa Học</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>
                <Link
                  to="/account"
                  className="w-full sm:w-auto px-7 py-4 bg-white/10 hover:bg-white/20 text-white border border-white/20 rounded-2xl text-xs font-bold uppercase tracking-wider transition-all flex items-center justify-center cursor-pointer hover:border-white/40"
                >
                  <span>Vào Phòng Học</span>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Highlights & Guarantees Strip */}
      <section className="py-12 bg-slate-50 border-t border-slate-200/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
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
                <h4 className="text-xs font-black uppercase text-slate-800 tracking-wide">Nhận Chứng Nhận Ngay &amp; Liền</h4>
                <p className="text-[11px] text-slate-500 font-medium mt-0.5 leading-snug">Cấp Giấy chứng nhận hoàn thành ngay và liền, không nhận chứng nhận online.</p>
              </div>
            </div>

            <div className="flex items-start gap-3.5 p-4 rounded-2xl bg-white border border-slate-200/80 shadow-2xs hover:border-teal-300 transition-colors">
              <div className="w-10 h-10 rounded-xl bg-teal-50 text-[#007c76] flex items-center justify-center shrink-0 border border-teal-100 font-bold">
                📁
              </div>
              <div>
                <h4 className="text-xs font-black uppercase text-slate-800 tracking-wide">Tài Liệu Hướng Dẫn Đính Kèm</h4>
                <p className="text-[11px] text-slate-500 font-medium mt-0.5 leading-snug">Trọn gói tài liệu bài giảng, quy trình tự kiểm và checklist thực hành tại chỗ.</p>
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
      </section>

    </div>
  );
};

export default Home;
