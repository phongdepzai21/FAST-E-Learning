
import React, { useState, useEffect } from 'react';
import { Link } from "react-router-dom";
import Hero from '../components/Hero';
import CourseCard from '../components/CourseCard';
import { COURSES as HARDCODED_COURSES, CONSULTING_SERVICES } from '../constants';
import { auth, db } from '../firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { collection, onSnapshot, QuerySnapshot, DocumentData, getDocs } from 'firebase/firestore';
import { Course } from '../types';

const Home: React.FC = () => {
  const mainWebsite = "https://2fast.com.vn";
  const [ownedCourseIds, setOwnedCourseIds] = useState<string[]>([]);
  const [allCourses, setAllCourses] = useState<Course[]>(HARDCODED_COURSES);

  // --- FETCH ALL COURSES FROM FIRESTORE (REAL-TIME SNAPSHOT) ---
  useEffect(() => {
    const unsubscribeSnapshot = onSnapshot(
      collection(db, 'courses'),
      (querySnapshot) => {
        const firestoreCourses: Course[] = [];
        querySnapshot.forEach((doc) => {
          const data = doc.data();
          firestoreCourses.push({
            id: doc.id,
            title: data.title || '',
            price: data.price || '0đ',
            image: data.image || '',
            category: data.category || '',
            description: data.description || '',
            status: data.status || 'active',
            curriculum: data.curriculum || undefined,
          });
        });
        
        // Merge hardcoded courses with firestore courses (allowing firestore updates to override hardcoded fields)
        const combined = [...HARDCODED_COURSES];
        firestoreCourses.forEach(fc => {
          const index = combined.findIndex(c => c.id === fc.id);
          if (index !== -1) {
            combined[index] = {
              ...combined[index],
              ...fc
            };
          } else {
            combined.push(fc);
          }
        });

        // Merge local custom courses from LocalStorage
        try {
          const localStr = localStorage.getItem('local_custom_courses');
          if (localStr) {
            const localList: Course[] = JSON.parse(localStr);
            localList.forEach(lc => {
              const idx = combined.findIndex(c => c.id === lc.id);
              if (idx !== -1) {
                combined[idx] = { ...combined[idx], ...lc };
              } else {
                combined.push(lc);
              }
            });
          }
        } catch (e) {}

        setAllCourses(combined);
      },
      (error) => {
        console.error("Lỗi đồng bộ danh sách khóa học ở trang chủ:", error);
      }
    );

    return () => {
      unsubscribeSnapshot();
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
            const ids = snapshot.docs.map(doc => doc.data().courseId);
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
      <Hero />

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
              <span className="text-[#007c76] font-black uppercase tracking-[0.3em] text-[10px] md:text-xs">Đào tạo chuẩn quốc tế</span>
              <h2 className="text-3xl md:text-5xl font-black text-[#374151] uppercase tracking-tighter leading-none">Khóa học nổi bật</h2>
            </div>
            <Link to="/khoa-hoc" className="hidden md:inline-block bg-white text-[#007c76] px-10 py-5 rounded-2xl font-black uppercase tracking-widest text-sm shadow-xl border border-gray-100 hover:shadow-2xl transition-all">Xem tất cả khóa học</Link>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-10">
            {allCourses.filter(c => c.status !== 'draft').slice(0, 3).map(course => (
              <CourseCard 
                key={course.id} 
                course={course} 
                isOwned={ownedCourseIds.includes(course.id)}
                progress={ownedCourseIds.includes(course.id) ? 0 : undefined}
              />
            ))}
          </div>
          <div className="mt-8 text-center md:hidden">
              <Link to="/khoa-hoc" className="inline-block bg-white text-[#007c76] px-8 py-4 rounded-xl font-black uppercase tracking-widest text-xs shadow-lg border border-gray-100 hover:shadow-xl transition-all">Xem tất cả khóa học</Link>
          </div>
        </div>
      </section>

      {/* 3. VIP MEMBERSHIP SECTION (Thành viên VIP) */}
      <section className="bg-gray-900 py-12 md:py-20 border-b border-gray-800">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="bg-gradient-to-br from-yellow-500 to-yellow-700 rounded-[40px] p-8 md:p-16 relative overflow-hidden shadow-2xl group">
                  <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10"></div>
                  <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-white/10 rounded-full blur-[80px] -mr-32 -mt-32"></div>
                  
                  <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-10">
                      <div className="text-center md:text-left space-y-4 md:max-w-xl">
                          <div className="inline-flex items-center gap-2 bg-black/20 backdrop-blur-sm px-4 py-2 rounded-full border border-black/10">
                              <svg className="w-4 h-4 text-yellow-200" fill="currentColor" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" /></svg>
                              <span className="text-xs font-black uppercase tracking-widest text-white">Thành viên VIP</span>
                          </div>
                          <h2 className="text-3xl md:text-5xl font-black text-white uppercase tracking-tighter leading-none">
                              Học không giới hạn <br/> chỉ với 1 lần đóng phí
                          </h2>
                          <p className="text-white/90 text-lg font-medium">
                              Sở hữu trọn đời kho tài liệu và khóa học ISO, HACCP, QA/QC. Tiết kiệm 60% so với mua lẻ từng khóa.
                          </p>
                      </div>
                      
                      <div className="shrink-0">
                          <Link 
                            to="/account/vip-upgrade" 
                            className="bg-black text-white px-10 py-5 rounded-2xl font-black uppercase tracking-widest text-sm hover:scale-105 transition-all shadow-xl flex items-center gap-3 hover:bg-gray-900"
                          >
                              <span>Nâng cấp ngay</span>
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 8l4 4m0 0l-4 4m4-4H3" /></svg>
                          </Link>
                      </div>
                  </div>
              </div>
          </div>
      </section>

      {/* 4. CTA Section - BRAND MEANING HIGHLIGHT (Bắt đầu hành trình) */}
      <section className="py-12 md:py-24 bg-white px-4">
        <div className="max-w-6xl mx-auto bg-gray-900 rounded-[30px] md:rounded-[50px] p-8 md:p-24 text-center text-white relative overflow-hidden shadow-2xl">
          <div className="absolute top-0 right-0 w-64 h-64 md:w-96 md:h-96 bg-[#007c76]/10 rounded-full -mr-32 -mt-32 md:-mr-48 md:-mt-48 blur-3xl"></div>
          <div className="absolute bottom-0 left-0 w-48 h-48 md:w-64 md:h-64 bg-amber-500/5 rounded-full -ml-24 -mb-24 md:-ml-32 md:-mb-32 blur-2xl"></div>
          
          <div className="relative z-10 space-y-8 md:space-y-12">
            <h2 className="text-2xl md:text-5xl font-black uppercase leading-[1.1] md:leading-[1.1] tracking-tighter text-gray-200">
              Bắt đầu hành trình <br className="md:hidden" /> Khám Phá cùng
            </h2>
            
            {/* FAST DEFINITION BLOCK */}
            <div className="py-2 md:py-4">
               <h1 className="text-7xl md:text-[10rem] font-black leading-none text-transparent bg-clip-text bg-gradient-to-b from-[#007c76] to-[#004e4a] tracking-tighter drop-shadow-sm select-none">
                 FAST
               </h1>
               <div className="flex items-center justify-center gap-4 mt-2 md:mt-4">
                  <div className="h-[1px] w-12 md:w-24 bg-gray-700"></div>
                  <p className="text-white font-bold text-xs md:text-2xl uppercase tracking-[0.3em] md:tracking-[0.5em] text-center">
                    Food All Standard & Training
                  </p>
                  <div className="h-[1px] w-12 md:w-24 bg-gray-700"></div>
               </div>
            </div>

            <p className="text-base md:text-xl text-gray-400 font-medium max-w-2xl mx-auto leading-relaxed">
              Truy cập Website chính thức để xem đầy đủ các giải pháp tư vấn ISO, HACCP và các dự án thực tế của chúng tôi.
            </p>
            <div className="flex flex-col sm:flex-row justify-center gap-4 md:gap-6 pt-4 md:pt-6">
              <a 
                href={mainWebsite} 
                target="_blank" 
                rel="noopener noreferrer" 
                className="bg-[#007c76] text-white px-8 py-4 md:px-12 md:py-6 rounded-2xl font-black uppercase tracking-widest text-sm md:text-lg hover:bg-[#005f5a] hover:scale-105 transition-all shadow-2xl shadow-[#007c76]/20 flex items-center justify-center gap-3"
              >
                Ghé thăm Website
                <svg className="w-5 h-5 md:w-6 md:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
              </a>
              <Link to="/khoa-hoc" className="bg-white/5 backdrop-blur-xl text-white px-8 py-4 md:px-12 md:py-6 rounded-2xl font-black uppercase tracking-widest text-sm md:text-lg hover:bg-white/10 transition-all border border-white/10">Khám phá học liệu</Link>
            </div>
          </div>
        </div>
      </section>

    </div>
  );
};

export default Home;
