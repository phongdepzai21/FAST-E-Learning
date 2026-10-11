
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Link } from "react-router-dom";
import Hero from '../components/Hero';
import { COURSES as HARDCODED_COURSES, getMergedCourses, extractLessonsFlat } from '../constants';
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
  Target
} from 'lucide-react';

const getOptimizedCourseImage = (url?: string, width = 720) => {
  if (!url) return 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?auto=format&fit=crop&q=80&w=720';
  if (url.includes('images.unsplash.com')) {
    const baseUrl = url.split('?')[0];
    return `${baseUrl}?auto=format&fit=crop&q=80&w=${width}`;
  }
  return url;
};

const Home: React.FC = () => {
  const mainWebsite = "https://2fast.com.vn";
  const [ownedCourseIds, setOwnedCourseIds] = useState<string[]>([]);
  const [allCourses, setAllCourses] = useState<Course[]>(() => getMergedCourses([]));
  const [activeHoverCard, setActiveHoverCard] = useState<string | null>(null);

  // Curated list of featured courses for carousel (deduplicated & active)
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
    return list;
  }, [allCourses]);

  // Top 5 Featured Prominent Courses (Tăng thêm 2 khóa nổi bật: HACCP, ISO 22000, ISO 9001, ISO 14001, VietGAP)
  const top5Courses = useMemo(() => {
    const famousCourseIds = ['haccp-tcvn', 'iso-22000', 'iso-9001', 'iso-14001', 'vietgap'];
    const list: Course[] = [];

    // 1. Lấy từ allCourses theo thứ tự ưu tiên
    for (const id of famousCourseIds) {
      const found = allCourses.find(c => c.id === id && c.status !== 'draft' && c.status !== 'inactive');
      if (found && !list.some(item => item.id === found.id)) {
        list.push(found);
      }
    }

    // 2. Bổ sung từ HARDCODED_COURSES nếu chưa có
    for (const id of famousCourseIds) {
      if (!list.some(c => c.id === id)) {
        const foundHc = HARDCODED_COURSES.find(c => c.id === id);
        if (foundHc) list.push(foundHc);
      }
    }

    // 3. Nếu vẫn thiếu 5 khóa, bù từ danh sách featuredCourses
    for (const c of featuredCourses) {
      if (!list.some(item => item.id === c.id)) {
        list.push(c);
      }
      if (list.length >= 5) break;
    }

    return list.slice(0, 5);
  }, [allCourses, featuredCourses]);

  const marqueeContainerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState<number>(1200);

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
              <h3 className="text-lg md:text-xl font-black mb-1 tracking-tight">Chứng Nhận QR Số Hóa</h3>
              <p className="text-white/80 font-medium text-xs md:text-sm max-w-xs">
                Mã QR định danh cá nhân xác thực năng lực chuyên môn toàn quốc
              </p>
            </div>
          </div>
        </div>
      </section>


      {/* 2. Featured Courses (5 Khóa học nổi bật, Dạng 2D, Trôi Chậm, Nội Dung Trực Tiếp Trên Từng Card) */}
      <section 
        className="py-12 md:py-16 bg-gradient-to-b from-slate-50 via-teal-950/[0.02] to-white border-t border-slate-200/80 relative overflow-hidden"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          {/* Header - Nổi bật, sang trọng, đẳng cấp */}
          <div className="text-center mb-8 md:mb-10">
            <span className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-teal-50 border border-teal-200/80 text-teal-800 text-xs font-black uppercase tracking-widest shadow-2xs mb-2.5">
              <Sparkles className="w-3.5 h-3.5 text-teal-600 animate-pulse" />
              Chương trình đào tạo trọng tâm
            </span>
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-black text-slate-900 uppercase tracking-tight">
              Khóa Học <span className="text-transparent bg-clip-text bg-gradient-to-r from-teal-700 via-emerald-600 to-teal-800">Nổi Bật</span>
            </h2>
            <p className="text-slate-500 font-medium text-xs sm:text-sm md:text-base max-w-xl mx-auto mt-2">
              Chương trình chuẩn hóa ISO, HACCP & VietGAP dành cho doanh nghiệp và chuyên gia
            </p>
          </div>

          {/* 2D Horizontal Moving Stage - Trôi chậm từ trái sang phải, hiển thị 5 khóa học nổi bật */}
          <div 
            ref={marqueeContainerRef}
            className="course-marquee-viewport w-full select-none"
          >
            <div 
              className="course-marquee-track flex"
              style={{ width: `${groupWidth * 4}px` }}
            >
              {[0, 1, 2, 3].map((groupIndex) => (
                <div 
                  key={`marquee-group-${groupIndex}`}
                  className="flex shrink-0"
                  style={{ 
                    width: `${groupWidth}px`, 
                    gap: `${marqueeGap}px`, 
                    paddingRight: `${marqueeGap}px` 
                  }}
                >
                  {top5Courses.map((c, idx) => {
                    const cLessons = extractLessonsFlat(c.curriculum);
                    const cardKey = `${groupIndex}-${c.id}-${idx}`;
                    const isHoveredOrActive = activeHoverCard === cardKey;

                    return (
                      <div 
                        key={`card-${cardKey}`}
                        style={{ width: `${cardWidth}px` }}
                        className="shrink-0 select-none group course-card-wrapper"
                        onMouseEnter={() => setActiveHoverCard(cardKey)}
                        onMouseLeave={() => setActiveHoverCard(null)}
                        onClick={() => {
                          // Hỗ trợ chạm/bật trên thiết bị di động
                          setActiveHoverCard(prev => prev === cardKey ? null : cardKey);
                        }}
                      >
                        <div className="course-card-inner relative bg-white rounded-2xl border border-slate-200/90 shadow-sm flex flex-col h-[360px] sm:h-[385px] overflow-hidden transition-all duration-300">
                          {/* Shimmer sweep effect layer on hover */}
                          <div className="course-shimmer-layer pointer-events-none" />

                          {/* ======================================================== */}
                          {/* 1. MẶC ĐỊNH (LÚC ĐẦU): HIỆN TÊN VÀ ẢNH KHÓA HỌC          */}
                          {/* ======================================================== */}
                          <div className="flex flex-col h-full w-full">
                            {/* 1.1 Ảnh khóa học */}
                            <div 
                              className="relative w-full overflow-hidden bg-slate-100 shrink-0 h-[215px] sm:h-[235px]"
                            >
                              <img 
                                src={getOptimizedCourseImage(c.image, 480)}
                                alt={c.title}
                                width={480}
                                height={270}
                                loading="lazy"
                                decoding="async"
                                className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                                onError={(e) => {
                                  const target = e.currentTarget;
                                  target.src = 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?auto=format&fit=crop&q=80&w=480';
                                }}
                              />
                              <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-slate-950/20 to-transparent pointer-events-none" />
                              
                              {/* Category badge */}
                              <div className="absolute top-2.5 left-2.5 z-10 pointer-events-none">
                                <span className="bg-slate-900/85 backdrop-blur-xs text-teal-200 font-bold px-2.5 py-0.5 rounded text-[11px] uppercase tracking-wider shadow-sm border border-teal-500/20">
                                  {c.category || 'Tiêu chuẩn'}
                                </span>
                              </div>

                              {/* Price badge */}
                              <div className="absolute bottom-2.5 right-2.5 z-10 pointer-events-none">
                                <span className="bg-emerald-500/95 text-slate-950 font-black px-2.5 py-0.5 rounded-md text-xs shadow-md border border-emerald-300/40">
                                  {c.price || 'Miễn phí'}
                                </span>
                              </div>
                            </div>

                            {/* 1.2 Tên khóa học */}
                            <div className="p-4 sm:p-5 flex flex-col flex-grow justify-center bg-white">
                              <div>
                                <Link 
                                  to={`/khoa-hoc/${c.id}`}
                                  className="block"
                                >
                                  <h3 className="text-base sm:text-lg font-extrabold text-slate-900 group-hover:text-[#007c76] transition-colors line-clamp-2 leading-snug">
                                    {c.title}
                                  </h3>
                                </Link>
                                {c.description && (
                                  <p className="text-slate-500 text-xs line-clamp-2 mt-1.5 font-medium leading-relaxed">
                                    {c.description}
                                  </p>
                                )}
                              </div>
                            </div>
                          </div>

                          {/* ======================================================== */}
                          {/* 2. CHUỘT CHỈA VÔ: HIỆN NỘI DUNG NGAY TRÊN CARD            */}
                          {/*    CHUỘT CHỈ RA: ĐÓNG NỘI DUNG                            */}
                          {/* ======================================================== */}
                          <div 
                            className={`course-hover-content-panel absolute inset-0 z-20 bg-white flex flex-col transition-all duration-300 ease-out ${
                              isHoveredOrActive
                                ? 'translate-y-0 opacity-100 pointer-events-auto' 
                                : 'translate-y-full opacity-0 pointer-events-none group-hover:translate-y-0 group-hover:opacity-100 group-hover:pointer-events-auto'
                            }`}
                          >
                            {/* 2.1 Header nội dung khóa học */}
                            <div className="bg-gradient-to-r from-slate-950 via-teal-950 to-slate-900 text-white p-3.5 sm:p-4 shrink-0 border-b border-teal-800/40">
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

                            {/* 2.2 Danh sách bài học trực tiếp trên card (Cuộn mượt mà) */}
                            <div className="p-3 sm:p-3.5 flex-1 min-h-0 flex flex-col bg-slate-50/80">
                              <div className="flex items-center justify-between pb-1.5 mb-2 border-b border-slate-200/80">
                                <span className="text-[11px] font-black text-slate-800 uppercase tracking-wide flex items-center gap-1.5">
                                  <Sparkles className="w-3.5 h-3.5 text-teal-600" />
                                  Nội Dung Đào Tạo Trọng Tâm
                                </span>
                                <span className="text-[10px] text-slate-400 font-medium">
                                  Cuộn để xem
                                </span>
                              </div>

                              <div className="space-y-1.5 overflow-y-auto custom-scrollbar flex-1 pr-1">
                                {cLessons.map((lesson, lIdx) => (
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
                                ))}
                              </div>
                            </div>

                            {/* 2.3 Nút Vào Học Ngay */}
                            <div className="p-3 bg-white rounded-b-2xl border-t border-slate-100 shrink-0">
                              <Link
                                to={`/khoa-hoc/${c.id}`}
                                className="w-full py-2.5 px-4 bg-[#007c76] hover:bg-[#005c56] text-white text-xs sm:text-sm font-bold uppercase tracking-wider rounded-xl flex items-center justify-center gap-2 shadow-xs hover:shadow-md transition-all active:scale-[0.98]"
                              >
                                <span>Vào Học Ngay</span>
                                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                              </Link>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
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
              Lộ trình 4 bước chuẩn hóa
            </span>
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-black text-slate-900 mb-3 tracking-tight uppercase">
              Bắt Đầu Cùng <span className="text-transparent bg-clip-text bg-gradient-to-r from-teal-700 to-emerald-600">FAST</span>
            </h2>
            <p className="text-slate-500 font-medium text-sm sm:text-base max-w-2xl mx-auto leading-relaxed">
              Quy trình 4 bước tinh gọn từ khảo sát nhu cầu đến vận hành đạt chuẩn và cấp chứng nhận QR số hóa.
            </p>
          </div>

          {/* 4-Step Connected Roadmap - Tinh gọn, rút ngắn khoảng cách */}
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
                  step: '01',
                  phase: 'Khảo sát & Định hướng',
                  icon: Compass,
                  label: 'Giới thiệu chung về tiêu chuẩn',
                  desc: 'Khảo sát nhanh nhu cầu và đặc thù cơ sở để xác định đúng tiêu chuẩn mục tiêu: HACCP Codex, ISO 22000 hay QA/QC chuyên sâu, tránh học dàn trải lãng phí chi phí.',
                  tags: ['Khảo sát nhu cầu 1-1', 'Đúng mục tiêu cơ sở'],
                  accentGradient: 'from-teal-500 to-emerald-500'
                },
                {
                  step: '02',
                  phase: 'Học tập & Thực hành',
                  icon: GraduationCap,
                  label: 'Lập phương án & Hướng dẫn thực hành',
                  desc: 'Học qua video bài giảng cô đọng 15-20 phút linh hoạt mọi lúc mọi nơi; hệ thống hóa toàn bộ biểu mẫu SOP, quy trình vệ sinh và biểu mẫu kiểm soát an toàn thực tế.',
                  tags: ['Video bài giảng 15-20p', 'Trọn bộ biểu mẫu SOP'],
                  accentGradient: 'from-emerald-500 to-teal-600'
                },
                {
                  step: '03',
                  phase: 'Thực địa & Cố vấn',
                  icon: ShieldCheck,
                  label: 'Áp dụng thực địa & Cố vấn 1-1',
                  desc: 'Đưa kiến thức vào dây chuyền vận hành thực tế, thiết lập các điểm kiểm soát tới hạn (CCP) và kết nối trao đổi 1-1 với chuyên gia FAST để khắc phục điểm yếu thanh tra.',
                  tags: ['Thiết lập điểm CCP', 'Chuyên gia FAST kèm 1-1'],
                  accentGradient: 'from-teal-600 to-cyan-600'
                },
                {
                  step: '04',
                  phase: 'Đánh giá & Chứng nhận',
                  icon: Award,
                  label: 'Đánh giá & Nhận chứng nhận QR',
                  desc: 'Hoàn thành bài kiểm tra trắc nghiệm năng lực, nhận ngay Giấy chứng nhận hoàn thành có mã QR số hóa định danh tra cứu năng lực toàn quốc.',
                  tags: ['Kiểm tra năng lực online', 'Mã QR số hóa định danh'],
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

                    {/* Desktop Center Node - Gọn gàng, thanh thoát */}
                    <div className="hidden md:flex absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-12 h-12 rounded-xl bg-white border-2 border-teal-500 shadow-md shadow-teal-500/15 ring-2 ring-teal-500/10 z-20 flex-col items-center justify-center group-hover:scale-110 group-hover:border-teal-600 transition-all duration-300">
                      <IconComponent className="w-5 h-5 text-teal-600" />
                      <span className="text-[9px] font-black text-slate-800 leading-none mt-0.5">{item.step}</span>
                    </div>

                    {/* Content Box */}
                    <div className={`w-full pl-14 md:pl-0 md:w-1/2 ${isEven ? 'md:pl-10 lg:pl-14' : 'md:pr-10 lg:pr-14 text-left'}`}>
                      <div className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-200/90 shadow-xs hover:shadow-lg hover:border-teal-400 hover:-translate-y-0.5 transition-all duration-300 relative overflow-hidden">
                        {/* Glowing Edge Accent */}
                        <div className={`absolute top-0 left-0 w-1.5 h-full bg-gradient-to-b ${item.accentGradient}`}></div>

                        {/* Top Step Badge & Phase */}
                        <div className="flex items-center justify-between gap-2 mb-2">
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md bg-teal-50 text-teal-800 text-[11px] font-black tracking-wide border border-teal-200/60">
                            BƯỚC {item.step}
                          </span>
                          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                            {item.phase}
                          </span>
                        </div>

                        {/* Title */}
                        <h4 className="text-base sm:text-lg font-black text-slate-900 group-hover:text-teal-700 transition-colors mb-2 leading-snug">
                          {item.label}
                        </h4>

                        {/* Description */}
                        <p className="text-slate-600 font-medium text-xs sm:text-sm leading-relaxed mb-3.5">
                          {item.desc}
                        </p>

                        {/* Micro Outcome Tags */}
                        <div className="flex flex-wrap gap-2 pt-2.5 border-t border-slate-100">
                          {item.tags.map((tag, tagIdx) => (
                            <span 
                              key={tagIdx} 
                              className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-slate-700 bg-slate-50 border border-slate-200/80 rounded-md px-2.5 py-1 shadow-2xs"
                            >
                              <CheckCircle2 className="w-3.5 h-3.5 text-teal-600 shrink-0" />
                              <span>{tag}</span>
                            </span>
                          ))}
                        </div>
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
                      <div className="text-xs sm:text-sm font-bold text-white">Mã QR Định Danh</div>
                      <div className="text-[10px] text-amber-200/80 font-medium">Xác thực chứng nhận số hóa</div>
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
                <h4 className="text-xs font-black uppercase text-slate-800 tracking-wide">Giấy Chứng Nhận Hợp Lệ</h4>
                <p className="text-[11px] text-slate-500 font-medium mt-0.5 leading-snug">Cấp Giấy chứng nhận hoàn thành có mã QR xác thực năng lực chuyên môn.</p>
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
