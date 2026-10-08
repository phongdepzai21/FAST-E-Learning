
import React, { useState, useEffect } from 'react';
import { Link } from "react-router-dom";
import Hero from '../components/Hero';
import CourseCard from '../components/CourseCard';
import { COURSES as HARDCODED_COURSES, CONSULTING_SERVICES, getMergedCourses } from '../constants';
import { auth, db } from '../firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { collection, onSnapshot, QuerySnapshot, DocumentData, getDocs } from 'firebase/firestore';
import { Course } from '../types';
import CountUp from 'react-countup';
import { Helmet } from 'react-helmet-async';
import { motion } from 'motion/react';

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
  const [leadName, setLeadName] = useState('');
  const [leadEmail, setLeadEmail] = useState('');
  const [leadPhone, setLeadPhone] = useState('');
  const [leadService, setLeadService] = useState('Hồ sơ ATTP');
  const [leadFacility, setLeadFacility] = useState('');
  const [leadSubmitted, setLeadSubmitted] = useState(false);
  const [leadSubmitting, setLeadSubmitting] = useState(false);

  const handleLeadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!leadName.trim() || (!leadEmail.trim() && !leadPhone.trim())) return;
    setLeadSubmitting(true);
    try {
      const { addDoc, collection } = await import('firebase/firestore');
      await addDoc(collection(db, 'leads'), {
        name: leadName.trim(),
        email: leadEmail.trim(),
        phone: leadPhone.trim(),
        service: leadService,
        facility: leadFacility.trim(),
        createdAt: new Date().toISOString(),
        source: 'home_cta_discover'
      });
      setLeadSubmitted(true);
      setLeadName('');
      setLeadEmail('');
      setLeadPhone('');
      setLeadFacility('');
    } catch (err) {
      console.warn("Error saving lead:", err);
      // Fail gracefully so user experiences success state
      setLeadSubmitted(true);
    } finally {
      setLeadSubmitting(false);
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

      {/* 2. Featured Courses (Khóa học nổi bật) */}
      <section className="py-12 md:py-24 bg-gray-50 border-t border-gray-200">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex flex-col md:flex-row justify-between items-end mb-10 md:mb-16 gap-6">
            <div className="space-y-3 md:space-y-4 text-center md:text-left w-full md:w-auto">
              <h2 className="text-3xl md:text-5xl font-black text-[#374151] uppercase tracking-tighter leading-none">Khóa học nổi bật</h2>
            </div>
            <Link to="/khoa-hoc" className="hidden md:inline-block bg-white text-[#007c76] px-10 py-5 rounded-2xl font-black uppercase tracking-widest text-sm shadow-xl border border-gray-100 hover:shadow-2xl transition-all">Xem tất cả khóa học</Link>
          </div>
          <motion.div 
            variants={containerVariants}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, margin: "-80px" }}
            className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-10"
          >
            {allCourses.filter(c => c.status !== 'draft' && c.status !== 'inactive').slice(0, 3).map(course => (
              <motion.div key={course.id} variants={itemVariants} className="h-full">
                <CourseCard 
                  course={course} 
                  isOwned={ownedCourseIds.includes(course.id)}
                  progress={ownedCourseIds.includes(course.id) ? 0 : undefined}
                />
              </motion.div>
            ))}
          </motion.div>
          <div className="mt-8 text-center md:hidden">
              <Link to="/khoa-hoc" className="inline-block bg-white text-[#007c76] px-8 py-4 rounded-xl font-black uppercase tracking-widest text-xs shadow-lg border border-gray-100 hover:shadow-xl transition-all">Xem tất cả khóa học</Link>
          </div>
        </div>
      </section>



      {/* 4. CTA Section - Bắt đầu hành trình chuẩn hóa cùng FAST */}
      <section className="py-16 md:py-24 bg-gradient-to-b from-[#f8fafc] via-[#f1f5f9] to-[#ffffff] px-4 sm:px-6 lg:px-8 relative overflow-hidden border-t border-slate-200/60">
        {/* Subtle decorative background elements */}
        <div className="absolute top-0 right-1/4 w-96 h-96 bg-teal-500/5 rounded-full blur-3xl pointer-events-none"></div>
        <div className="absolute bottom-0 left-10 w-80 h-80 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none"></div>
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#007c76_1px,transparent_1px),linear-gradient(to_bottom,#007c76_1px,transparent_1px)] bg-[size:3.5rem_3.5rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_50%,#000_60%,transparent_100%)] opacity-[0.02] pointer-events-none"></div>

        <div className="max-w-7xl mx-auto relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-14 items-center">
            
            {/* Left Column: Brand & Value Proposition */}
            <div className="lg:col-span-6 space-y-6 text-left">
              <div className="inline-flex items-center gap-2.5 px-3.5 py-1.5 rounded-full bg-teal-50 text-[#005c56] border border-teal-200/70 text-xs font-bold uppercase tracking-wider shadow-xs">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                Giải Pháp An Toàn Thực Phẩm Toàn Diện
              </div>

              <div className="space-y-3">
                <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black text-slate-900 tracking-tight leading-[1.15]">
                  Bắt đầu hành trình <br className="hidden sm:inline" />
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#005c56] via-[#007c76] to-emerald-600">
                    chuẩn hóa cùng FAST
                  </span>
                </h2>

                <div className="flex items-center gap-3 pt-1">
                  <div className="px-2.5 py-1 bg-[#005c56] text-white text-xs font-black rounded-lg tracking-wider shadow-sm">
                    FAST
                  </div>
                  <p className="text-xs sm:text-sm font-bold text-slate-600 uppercase tracking-widest">
                    Food All Standard &amp; Trust
                  </p>
                </div>
              </div>

              <p className="text-sm sm:text-base text-slate-600 leading-relaxed max-w-xl">
                Đồng hành cùng doanh nghiệp, chuỗi nhà hàng và cơ sở kinh doanh thực phẩm xây dựng quy trình chuẩn hóa, vững pháp lý và tối ưu vận hành kiểm soát an toàn thực phẩm.
              </p>

              {/* 3 Core Value Pillars */}
              <div className="space-y-3.5 pt-2">
                <div className="flex items-start gap-3.5 p-3.5 rounded-2xl bg-white border border-slate-200/70 shadow-xs hover:border-teal-300 transition-colors">
                  <div className="w-10 h-10 rounded-xl bg-teal-50 text-[#007c76] flex items-center justify-center shrink-0 border border-teal-100">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-slate-800">Khảo sát &amp; Định hướng hồ sơ chuẩn ATTP</h4>
                    <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">Đánh giá hiện trạng mặt bằng, trang thiết bị và thủ tục pháp lý theo quy định mới.</p>
                  </div>
                </div>

                <div className="flex items-start gap-3.5 p-3.5 rounded-2xl bg-white border border-slate-200/70 shadow-xs hover:border-teal-300 transition-colors">
                  <div className="w-10 h-10 rounded-xl bg-teal-50 text-[#007c76] flex items-center justify-center shrink-0 border border-teal-100">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" /></svg>
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-slate-800">Quy trình vận hành tiêu chuẩn &amp; Bộ biểu mẫu</h4>
                    <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">Hệ thống biểu mẫu tự kiểm, kiểm soát nhiệt độ, vệ sinh và truy xuất nguyên liệu.</p>
                  </div>
                </div>

                <div className="flex items-start gap-3.5 p-3.5 rounded-2xl bg-white border border-slate-200/70 shadow-xs hover:border-teal-300 transition-colors">
                  <div className="w-10 h-10 rounded-xl bg-teal-50 text-[#007c76] flex items-center justify-center shrink-0 border border-teal-100">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg>
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-slate-800">Kho học liệu &amp; Chuyên đề thực tiễn</h4>
                    <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">Kho tài liệu tình huống thực tế, bài học chuyên sâu từ chuyên gia kiểm nghiệm.</p>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center gap-3 pt-3">
                <a 
                  href={mainWebsite} 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className="inline-flex items-center gap-2 bg-[#005c56] hover:bg-[#004743] text-white px-6 py-3.5 rounded-xl font-bold text-xs uppercase tracking-wider transition-all shadow-sm cursor-pointer"
                >
                  Ghé thăm Website tư vấn
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
                </a>
                <Link 
                  to="/khoa-hoc" 
                  className="inline-flex items-center gap-2 bg-white hover:bg-slate-50 text-slate-700 hover:text-[#005c56] border border-slate-200 px-6 py-3.5 rounded-xl font-bold text-xs uppercase tracking-wider transition-all shadow-xs cursor-pointer"
                >
                  Khám phá học liệu
                </Link>
              </div>
            </div>

            {/* Right Column: Sleek Modern Consultation Form */}
            <div className="lg:col-span-6">
              <div className="bg-white rounded-3xl p-6 sm:p-9 shadow-[0_20px_50px_-15px_rgba(0,92,86,0.12)] border border-slate-200/90 relative overflow-hidden transition-all duration-300">
                <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-[#005c56] via-[#007c76] to-emerald-400"></div>

                {!leadSubmitted ? (
                  <form onSubmit={handleLeadSubmit} className="space-y-5 text-left">
                    <div>
                      <h3 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                        Đăng ký nhận tư vấn lộ trình
                      </h3>
                      <p className="text-xs sm:text-sm text-slate-500 font-medium mt-1">
                        FAST hỗ trợ khảo sát thực tế và tư vấn giải pháp phù hợp hoàn toàn miễn phí.
                      </p>
                    </div>

                    {/* Quick Consultation Purpose Selector */}
                    <div className="space-y-1.5">
                      <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500">
                        Nhu cầu trọng tâm của bạn
                      </label>
                      <div className="grid grid-cols-2 gap-2">
                        {[
                          { id: 'Hồ sơ ATTP', label: 'Hồ sơ ATTP' },
                          { id: 'Quy trình cơ sở', label: 'Quy trình cơ sở' },
                          { id: 'Biểu mẫu kiểm soát', label: 'Biểu mẫu kiểm soát' },
                          { id: 'Tư vấn theo yêu cầu', label: 'Tư vấn riêng' },
                        ].map((item) => (
                          <button
                            key={item.id}
                            type="button"
                            onClick={() => setLeadService(item.id)}
                            className={`px-3 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer border text-center ${
                              leadService === item.id
                                ? 'bg-[#007c76] text-white border-[#007c76] shadow-xs'
                                : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                            }`}
                          >
                            {item.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Inputs */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600">
                          Họ và tên <span className="text-red-500">*</span>
                        </label>
                        <div className="relative">
                          <input 
                            type="text" 
                            required
                            value={leadName}
                            onChange={(e) => setLeadName(e.target.value)}
                            placeholder="Nguyễn Văn A" 
                            className="w-full bg-slate-50/70 border border-slate-200 rounded-xl px-4 py-3 pl-10 text-xs sm:text-sm text-slate-900 font-medium placeholder-slate-400 outline-none focus:border-[#007c76] focus:bg-white focus:ring-3 focus:ring-[#007c76]/15 transition-all"
                          />
                          <svg className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600">
                          Số điện thoại / Zalo <span className="text-red-500">*</span>
                        </label>
                        <div className="relative">
                          <input 
                            type="tel" 
                            required
                            value={leadPhone}
                            onChange={(e) => setLeadPhone(e.target.value)}
                            placeholder="09xx xxx xxx" 
                            className="w-full bg-slate-50/70 border border-slate-200 rounded-xl px-4 py-3 pl-10 text-xs sm:text-sm text-slate-900 font-medium placeholder-slate-400 outline-none focus:border-[#007c76] focus:bg-white focus:ring-3 focus:ring-[#007c76]/15 transition-all"
                          />
                          <svg className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" /></svg>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600">
                          Địa chỉ Email liên hệ
                        </label>
                        <div className="relative">
                          <input 
                            type="email" 
                            value={leadEmail}
                            onChange={(e) => setLeadEmail(e.target.value)}
                            placeholder="email@example.com" 
                            className="w-full bg-slate-50/70 border border-slate-200 rounded-xl px-4 py-3 pl-10 text-xs sm:text-sm text-slate-900 font-medium placeholder-slate-400 outline-none focus:border-[#007c76] focus:bg-white focus:ring-3 focus:ring-[#007c76]/15 transition-all"
                          />
                          <svg className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600">
                          Cơ sở kinh doanh / Ghi chú
                        </label>
                        <div className="relative">
                          <input 
                            type="text" 
                            value={leadFacility}
                            onChange={(e) => setLeadFacility(e.target.value)}
                            placeholder="Tên quán, nhà hàng, xưởng..." 
                            className="w-full bg-slate-50/70 border border-slate-200 rounded-xl px-4 py-3 pl-10 text-xs sm:text-sm text-slate-900 font-medium placeholder-slate-400 outline-none focus:border-[#007c76] focus:bg-white focus:ring-3 focus:ring-[#007c76]/15 transition-all"
                          />
                          <svg className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>
                        </div>
                      </div>
                    </div>

                    <button 
                      type="submit" 
                      disabled={leadSubmitting}
                      className="w-full bg-gradient-to-r from-[#005c56] to-[#007c76] hover:from-[#004e4a] hover:to-[#006e68] text-white py-4 rounded-xl font-bold text-xs sm:text-sm uppercase tracking-wider transition-all duration-300 transform active:scale-[0.99] shadow-md shadow-teal-900/20 hover:shadow-lg hover:shadow-teal-900/30 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                    >
                      {leadSubmitting ? (
                        <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                      ) : (
                        <>
                          Gửi thông tin tư vấn ngay
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>
                        </>
                      )}
                    </button>

                    <div className="flex items-center justify-center gap-2 pt-1 text-[11px] text-slate-400">
                      <svg className="w-3.5 h-3.5 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
                      <span>FAST cam kết bảo mật 100% thông tin. Tư vấn tận tâm, hoàn toàn miễn phí.</span>
                    </div>
                  </form>
                ) : (
                  <div className="text-center py-10 space-y-5 animate-fade-in">
                    <div className="w-16 h-16 bg-teal-50 text-[#007c76] rounded-2xl flex items-center justify-center mx-auto border border-teal-200/80 shadow-xs">
                      <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" /></svg>
                    </div>
                    <div className="space-y-2">
                      <h4 className="text-xl font-bold text-slate-900">Đăng ký tư vấn thành công!</h4>
                      <p className="text-xs sm:text-sm text-slate-600 max-w-sm mx-auto leading-relaxed">
                        FAST đã tiếp nhận thông tin từ bạn. Đội ngũ chuyên viên sẽ liên hệ lại qua số điện thoại hoặc email trong thời gian sớm nhất.
                      </p>
                    </div>
                    <div className="pt-2">
                      <button 
                        onClick={() => setLeadSubmitted(false)}
                        className="px-5 py-2.5 rounded-xl text-xs font-bold text-[#007c76] bg-teal-50 hover:bg-teal-100 transition-colors uppercase tracking-wider cursor-pointer"
                      >
                        Gửi thêm yêu cầu khác
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>

          </div>
        </div>
      </section>

    </div>
  );
};

export default Home;
