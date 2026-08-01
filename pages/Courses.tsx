
import React, { useMemo, useState, useEffect } from 'react';
import { Link } from "react-router-dom";
import CourseCard from '../components/CourseCard';
import { COURSES as HARDCODED_COURSES } from '../constants';
import { auth, db } from '../firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { collection, onSnapshot, QuerySnapshot, DocumentData, getDocs } from 'firebase/firestore';
import { Course } from '../types';

const Categories = ['Tất cả', 'ISO', 'HACCP', 'QA/QC', 'VietGAP', 'Sản xuất', 'Lean', 'Quản trị'];

const Courses: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [activeCategory, setActiveCategory] = useState('Tất cả');
  const [ownedCourseIds, setOwnedCourseIds] = useState<string[]>([]);
  const [isLoadingOwnership, setIsLoadingOwnership] = useState(true);
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
        console.error("Lỗi đồng bộ danh sách khóa học:", error);
      }
    );

    return () => {
      unsubscribeSnapshot();
    };
  }, []);

  const [isVipOrAdmin, setIsVipOrAdmin] = useState(false);

  // --- LOGIC ĐỒNG BỘ KHÓA HỌC ĐÃ SỞ HỮU (REAL-TIME) ---
  useEffect(() => {
    let unsubscribeSnapshot: (() => void) | null = null;
    const unsubscribeAuth = onAuthStateChanged(auth, async (user) => {
        if (unsubscribeSnapshot) {
            unsubscribeSnapshot();
            unsubscribeSnapshot = null;
        }
        if (user && user.email) {
            // CRITICAL FIX: Normalize email to lowercase
            const normalizedEmail = user.email.toLowerCase();
            if (!normalizedEmail) {
                setOwnedCourseIds([]);
                setIsLoadingOwnership(false);
                setIsVipOrAdmin(false);
                return;
            }
            
            // Check VIP/Admin status
            import('../constants').then(({ ADMIN_EMAILS }) => {
                let isPrivileged = ADMIN_EMAILS.includes(normalizedEmail);
                if (!isPrivileged) {
                   const localRolesStr = localStorage.getItem(`user_roles_${normalizedEmail}`);
                   if (localRolesStr) {
                       try {
                           const localRoles = JSON.parse(localRolesStr);
                           if (localRoles.isVip || localRoles.isAdmin) isPrivileged = true;
                       } catch (e) {}
                   }
                }
                setIsVipOrAdmin(isPrivileged);
            });

            unsubscribeSnapshot = onSnapshot(
                collection(db, "users", normalizedEmail, "purchased_courses"),
                (snapshot: QuerySnapshot<DocumentData>) => {
                    const ids = snapshot.docs.map(doc => doc.data().courseId);
                    setOwnedCourseIds(ids);
                    setIsLoadingOwnership(false);
                },
                (error) => {
                    console.error("Lỗi đồng bộ khóa học:", error);
                    setIsLoadingOwnership(false);
                }
            );
        } else {
            setOwnedCourseIds([]);
            setIsLoadingOwnership(false);
            setIsVipOrAdmin(false);
        }
    });
    return () => {
        unsubscribeAuth();
        if (unsubscribeSnapshot) {
            unsubscribeSnapshot();
        }
    };
  }, []);

  // Logic lọc khóa học
  const filteredCourses = useMemo(() => {
    return allCourses.filter(course => {
      const isDraft = course.status === 'draft';
      if (isDraft) return false; // Hide drafts for general view

      const matchesSearch = course.title.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCategory = activeCategory === 'Tất cả' || 
                             course.category.toUpperCase().includes(activeCategory.toUpperCase());
      return matchesSearch && matchesCategory;
    });
  }, [searchTerm, activeCategory, allCourses]);

  return (
    <main className="min-h-screen bg-[#f8fafc] pb-20 animate-fade-in">
      {/* Search & Hero Header */}
      <div className="bg-[#007c76] pt-16 pb-32 md:pb-40 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-white/5 rounded-full blur-3xl -mr-48 -mt-48"></div>
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-green-400/10 rounded-full blur-3xl -ml-32 -mb-32"></div>
        
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10">
          <span className="text-white/70 font-black uppercase tracking-[0.4em] text-[10px] md:text-xs mb-4 block">Học viện FAST E-Learning</span>
          <h1 className="text-3xl md:text-6xl font-black text-white mb-8 md:mb-12 uppercase tracking-tighter leading-none">
            Nâng tầm kiến thức <br/> <span className="text-green-300">An toàn thực phẩm</span>
          </h1>

          {/* Search Bar Container */}
          <div className="max-w-2xl mx-auto relative group">
             <div className="absolute inset-y-0 left-0 pl-6 flex items-center pointer-events-none">
                <svg className="h-5 w-5 text-[#007c76]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
             </div>
             <input 
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Tìm khóa học bạn đang quan tâm..."
                className="w-full pl-14 pr-6 py-5 md:py-6 bg-white rounded-3xl shadow-2xl text-gray-800 font-bold focus:outline-none focus:ring-4 focus:ring-green-400/20 transition-all text-sm md:text-base border-none"
             />
             <div className="absolute right-3 inset-y-3 hidden md:block">
                <button className="h-full bg-[#007c76] text-white px-8 rounded-2xl font-black text-xs uppercase tracking-widest hover:brightness-110 transition-all">Tìm kiếm</button>
             </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-16 relative z-20">
        {/* Category Pills */}
        <div className="flex overflow-x-auto no-scrollbar gap-3 mb-12 py-2">
            {Categories.map((cat) => (
                <button
                    key={cat}
                    onClick={() => setActiveCategory(cat)}
                    className={`whitespace-nowrap px-6 py-3.5 rounded-2xl font-black text-xs uppercase tracking-widest transition-all duration-300 border-2 ${
                        activeCategory === cat 
                        ? 'bg-[#007c76] text-white border-[#007c76] shadow-lg shadow-[#007c76]/30 translate-y-[-2px]' 
                        : 'bg-white text-gray-400 border-gray-100 hover:border-[#007c76]/30 hover:text-[#007c76]'
                    }`}
                >
                    {cat}
                </button>
            ))}
        </div>

        {/* Course Grid Results */}
        <div className="flex items-center justify-between mb-8">
            <h2 className="text-xl md:text-2xl font-black text-gray-800 uppercase tracking-tight flex items-center gap-3">
                <span className="w-2 h-8 bg-[#007c76] rounded-full"></span>
                {activeCategory === 'Tất cả' ? 'Tất cả bài học' : `Khóa học ${activeCategory}`}
                <span className="text-sm font-bold text-gray-300 ml-2">({filteredCourses.length})</span>
            </h2>
        </div>

        {filteredCourses.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
                {filteredCourses.map((course) => (
                    <CourseCard 
                        key={course.id} 
                        course={course}
                        // Truyền trạng thái sở hữu xuống Card
                        isOwned={ownedCourseIds.includes(course.id)} 
                        isVipAvailable={!ownedCourseIds.includes(course.id) && isVipOrAdmin}
                        // Nếu đã sở hữu, mặc định progress 0 (hoặc lấy từ DB nếu muốn chi tiết hơn)
                        progress={ownedCourseIds.includes(course.id) ? 0 : undefined} 
                    />
                ))}
            </div>
        ) : (
            <div className="bg-white rounded-[40px] p-20 text-center border-2 border-dashed border-gray-100 flex flex-col items-center">
                <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mb-6 text-gray-200">
                    <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9.172 9.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                </div>
                <h3 className="text-xl font-bold text-gray-400 mb-2">Không tìm thấy khóa học phù hợp</h3>
                <p className="text-gray-400 text-sm">Vui lòng thử từ khóa khác hoặc chọn danh mục khác.</p>
                <button 
                    onClick={() => { setSearchTerm(''); setActiveCategory('Tất cả'); }}
                    className="mt-8 text-[#007c76] font-black uppercase text-xs tracking-widest hover:underline"
                >
                    Xóa tất cả bộ lọc
                </button>
            </div>
        )}

        {/* VIP PROMOTION BANNER (Moved Here) */}
        <div className="mt-20 mb-12 bg-gradient-to-r from-yellow-400 via-yellow-500 to-yellow-600 rounded-[32px] p-8 md:p-10 shadow-2xl shadow-yellow-500/30 flex flex-col md:flex-row items-center justify-between gap-8 relative overflow-hidden group">
            <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-10"></div>
            <div className="absolute -right-20 -top-20 w-64 h-64 bg-white/20 rounded-full blur-3xl group-hover:bg-white/30 transition-all"></div>
            
            <div className="relative z-10 text-center md:text-left">
                <div className="inline-block bg-black/20 text-black px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest mb-3 border border-black/10">
                    ★ Best Value
                </div>
                <h3 className="text-2xl md:text-4xl font-black text-white uppercase tracking-tighter leading-none mb-2">
                    Sở hữu trọn bộ 20+ Khóa học
                </h3>
                <p className="text-black/70 font-bold text-sm md:text-base max-w-xl">
                    Tiết kiệm đến 60% học phí khi đăng ký gói Thành viên VIP trọn đời ngay hôm nay.
                </p>
            </div>
            
            <div className="relative z-10 shrink-0">
                <Link 
                    to="/account/vip-upgrade" 
                    className="inline-flex items-center gap-2 bg-black text-white px-8 py-4 rounded-2xl font-black text-sm uppercase tracking-widest hover:scale-105 transition-all shadow-xl hover:bg-gray-900"
                >
                    <span>Xem chi tiết gói VIP</span>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 8l4 4m0 0l-4 4m4-4H3" /></svg>
                </Link>
            </div>
        </div>

        {/* Support Section */}
        <section className="mt-12 bg-gray-900 rounded-[48px] p-8 md:p-16 text-white flex flex-col md:flex-row items-center justify-between gap-10">
            <div className="space-y-4 text-center md:text-left">
                <h3 className="text-3xl md:text-4xl font-black uppercase tracking-tight leading-none">Bạn cần lộ trình <br/> <span className="text-[#007c76]">Riêng Biệt?</span></h3>
                <p className="text-gray-400 font-bold max-w-md">Liên hệ ngay để chuyên gia FAST thiết kế khóa học đào tạo riêng cho doanh nghiệp của bạn.</p>
            </div>
            <div className="flex flex-col sm:flex-row gap-4">
                <a href="tel:0898419149" className="bg-[#007c76] text-white px-10 py-5 rounded-2xl font-black uppercase text-xs tracking-widest hover:scale-105 transition-all shadow-xl shadow-[#007c76]/20">Gọi ngay: 0898 419 149</a>
                <button className="bg-white/5 backdrop-blur-xl border border-white/10 text-white px-10 py-5 rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-white/10 transition-all">Nhận tư vấn qua Email</button>
            </div>
        </section>
      </div>
    </main>
  );
};

export default Courses;
