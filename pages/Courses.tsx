
import React, { useMemo, useState, useEffect } from 'react';
import { Link } from "react-router-dom";
import CourseCard from '../components/CourseCard';
import { Breadcrumbs } from '../components/Breadcrumbs';
import { COURSES as HARDCODED_COURSES, getMergedCourses } from '../constants';
import { auth, db } from '../firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { collection, doc, setDoc, onSnapshot, QuerySnapshot, DocumentData, getDocs } from 'firebase/firestore';
import { useToast } from '../contexts/ToastContext';
import { Course } from '../types';
import { parseFirestoreError, logFirestoreError } from '../utils/firestoreDiagnostics';
import { Helmet } from 'react-helmet-async';
import { isCourseNewOrUpdated, getUnreadCount } from '../utils/courseNotificationService';

const Categories = ['Tất cả', 'Mới cập nhật', 'ISO', 'HACCP', 'QA/QC', 'VietGAP', 'Sản xuất', 'Lean', 'Quản trị'];

const DEFAULT_COMBOS = [
  {
    id: 'combo-basic',
    title: 'Gói Combo Basic (Nhập Môn Thực Phẩm)',
    price: '1.200.000đ',
    image: 'https://images.unsplash.com/photo-1556910103-1c02745aae4d?auto=format&fit=crop&q=80&w=800',
    description: 'Gói Combo Basic: Học trọn gói các kiến thức cơ bản về HACCP, 5 nguyên tắc vàng của WHO và các tiêu chuẩn kiểm soát chất lượng sơ bộ.',
    courseIds: ['basic-principles', 'truy-xuat-nguon-goc'],
    benefits: ['Tài liệu biểu mẫu SOP đính kèm', 'Cấp chứng nhận hoàn thành']
  },
  {
    id: 'combo-pro',
    title: 'Gói Combo Pro (Chuyên Gia Vận Hành)',
    price: '1.800.000đ',
    image: 'https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?auto=format&fit=crop&q=80&w=800',
    description: 'Gói Combo Pro: Học chuyên sâu dành cho kỹ sư vận hành nhà máy gồm đầy đủ các khóa ISO (ISO 9001, ISO 14001, ISO 22000), nâng cao tối đa năng lực sản xuất.',
    courseIds: ['iso-9001', 'iso-14001', 'iso-22000'],
    benefits: ['Tài liệu biểu mẫu SOP đính kèm', 'Cấp chứng nhận hoàn thành']
  },
  {
    id: 'khoa-vip',
    title: 'Gói Combo VIP (Toàn Bộ Khóa Học)',
    price: '2.500.000đ',
    image: 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&q=80&w=800',
    description: 'Gói Combo VIP trọn đời: Combo trọn gói toàn bộ hệ thống các khóa học ISO, HACCP, QA/QC, Lean, bộ tài liệu biểu mẫu SOP chuẩn hóa và cập nhật tất cả khóa học mới trong tương lai.',
    courseIds: [],
    benefits: ['Tài liệu biểu mẫu SOP đính kèm', 'Cấp chứng nhận hoàn thành', 'Đặc quyền Hỗ trợ 1-1 từ chuyên gia']
  }
];

const Courses: React.FC = () => {
  const toast = useToast();
  const [searchTerm, setSearchTerm] = useState('');
  const [activeCategory, setActiveCategory] = useState('Tất cả');
  const [ownedCourseIds, setOwnedCourseIds] = useState<string[]>([]);
  const [isLoadingOwnership, setIsLoadingOwnership] = useState(true);
  const [allCourses, setAllCourses] = useState<Course[]>(() => getMergedCourses([]));
  const allCoursesRef = React.useRef(allCourses);
  React.useEffect(() => { allCoursesRef.current = allCourses; }, []);
  const [isVipOrAdmin, setIsVipOrAdmin] = useState(false);
  const [currentUserEmail, setCurrentUserEmail] = useState<string | null>(null);
  const [claimingId, setClaimingId] = useState<string | null>(null);
  const [combos, setCombos] = useState<any[]>(DEFAULT_COMBOS);

  // --- FETCH ALL COMBOS FROM FIRESTORE ---
  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'combos'), (snapshot) => {
      const dbCombos: any[] = [];
      snapshot.forEach(docSnap => {
        dbCombos.push({ id: docSnap.id, ...docSnap.data() });
      });

      // Merge with defaults
      const merged = DEFAULT_COMBOS.map(def => {
        const found = dbCombos.find(dbc => dbc.id === def.id);
        return found ? { ...def, ...found } : def;
      });

      // Include new custom combos that are not in defaults
      const defaultIds = DEFAULT_COMBOS.map(d => d.id);
      const customCombos = dbCombos.filter(dbc => !defaultIds.includes(dbc.id));

      setCombos([...merged, ...customCombos]);
    }, (err) => {
      console.warn("Lỗi đồng bộ danh sách combo:", err);
      setCombos(DEFAULT_COMBOS);
    });
    return () => unsub();
  }, []);

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
        console.error("Lỗi đồng bộ danh sách khóa học:", error);
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

  // --- LOGIC ĐỒNG BỘ KHÓA HỌC ĐÃ SỞ HỮU (REAL-TIME) ---
  useEffect(() => {
    let unsubscribeSnapshot: (() => void) | null = null;
    const unsubscribeAuth = onAuthStateChanged(auth, async (user) => {
        if (unsubscribeSnapshot) {
            unsubscribeSnapshot();
            unsubscribeSnapshot = null;
        }
        if (user && user.email) {
            const normalizedEmail = user.email.toLowerCase();
            setCurrentUserEmail(normalizedEmail);
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

            // Fast local storage cache preload
            try {
              const cachedStr = localStorage.getItem(`user_courses_${normalizedEmail}`);
              const hasClaimedAll = localStorage.getItem(`has_claimed_all_${normalizedEmail}`) === 'true';
              if (cachedStr) {
                const cachedIds = JSON.parse(cachedStr);
                if (Array.isArray(cachedIds) && cachedIds.length > 0) {
                  setOwnedCourseIds(cachedIds);
                }
              } else if (hasClaimedAll) {
                const allActiveIds = allCoursesRef.current.filter(c => c.status !== 'draft' && c.status !== 'inactive').map(c => c.id);
                setOwnedCourseIds(allActiveIds);
              }
            } catch (e) {}

            unsubscribeSnapshot = onSnapshot(
                collection(db, "users", normalizedEmail, "purchased_courses"),
                (snapshot: QuerySnapshot<DocumentData>) => {
                    const ids = snapshot.docs.map(doc => doc.data().courseId || doc.id);
                    const hasClaimedAll = localStorage.getItem(`has_claimed_all_${normalizedEmail}`) === 'true';
                    let mergedIds = ids;
                    if (hasClaimedAll) {
                      const allActiveIds = allCoursesRef.current.filter(c => c.status !== 'draft' && c.status !== 'inactive').map(c => c.id);
                      mergedIds = Array.from(new Set([...ids, ...allActiveIds]));
                    }
                    setOwnedCourseIds(mergedIds);
                    setIsLoadingOwnership(false);
                    try {
                      localStorage.setItem(`user_courses_${normalizedEmail}`, JSON.stringify(mergedIds));
                      mergedIds.forEach(cid => localStorage.setItem(`course_unlocked_${cid}`, 'true'));
                    } catch (e) {}
                },
                (error) => {
                    console.error("Lỗi đồng bộ khóa học:", error);
                    setIsLoadingOwnership(false);
                }
            );
        } else {
            setCurrentUserEmail(null);
            setOwnedCourseIds([]);
            setIsLoadingOwnership(false);
            setIsVipOrAdmin(false);
        }
    });

    const handleStorageChange = () => {
      const userEmail = auth.currentUser?.email?.toLowerCase();
      if (userEmail) {
        try {
          const cachedStr = localStorage.getItem(`user_courses_${userEmail}`);
          if (cachedStr) {
            setOwnedCourseIds(JSON.parse(cachedStr));
          }
        } catch (e) {}
      }
    };

    window.addEventListener('courses_updated', handleStorageChange);
    window.addEventListener('storage', handleStorageChange);

    return () => {
        unsubscribeAuth();
        if (unsubscribeSnapshot) {
            unsubscribeSnapshot();
        }
        window.removeEventListener('courses_updated', handleStorageChange);
        window.removeEventListener('storage', handleStorageChange);
    };
  }, [allCourses]);

  const [isClaimingAll, setIsClaimingAll] = useState(false);

  const handleClaimCourse = async (course: Course) => {
    if (!currentUserEmail) {
      toast.error('Vui lòng đăng nhập để nhận khóa học.');
      return;
    }
    setClaimingId(course.id);
    try {
      const courseRef = doc(db, "users", currentUserEmail, "purchased_courses", course.id);
      await setDoc(courseRef, {
        courseId: course.id,
        courseTitle: course.title || '',
        title: course.title || '',
        price: course.price || '',
        progress: 0,
        unlockedAt: new Date().toISOString(),
        purchasedAt: new Date().toISOString(),
        status: 'active',
        claimedVia: 'INSTANT_CLAIM'
      }, { merge: true });

      localStorage.setItem('course_unlocked_' + course.id, 'true');
      setOwnedCourseIds(prev => {
        const next = prev.includes(course.id) ? prev : [...prev, course.id];
        try {
          localStorage.setItem(`user_courses_${currentUserEmail}`, JSON.stringify(next));
        } catch (e) {}
        return next;
      });
      window.dispatchEvent(new CustomEvent('courses_updated'));
      window.dispatchEvent(new Event('storage'));
      toast.success(`✨ Đã mở khóa khóa học "${course.title}" thành công!`);
    } catch (err: any) {
      console.error("Lỗi nhận khóa học:", err);
      const errorInfo = logFirestoreError(`Nhận khóa học "${course.title}"`, `users/${auth.currentUser?.email}/purchased_courses/${course.id}`, err);
      
      // Fallback mở khóa cục bộ
      localStorage.setItem('course_unlocked_' + course.id, 'true');
      setOwnedCourseIds(prev => prev.includes(course.id) ? prev : [...prev, course.id]);
      window.dispatchEvent(new CustomEvent('courses_updated'));
      window.dispatchEvent(new Event('storage'));
      
      toast.success(`✨ Đã mở khóa khóa học "${course.title}" trên thiết bị của bạn!`);
      if (errorInfo.code === 'permission-denied') {
        toast.info('Lưu ý: Cloud Firestore đang chờ cấp quyền Rules trên Firebase Console. Khóa học đã được lưu ngoại tuyến để bạn vào học ngay!', 7000);
      } else {
        toast.info(errorInfo.solution, 6000);
      }
    } finally {
      setClaimingId(null);
    }
  };

  const handleClaimAllCourses = async () => {
    if (!currentUserEmail) {
      toast.error('Vui lòng đăng nhập để nhận tất cả khóa học.');
      return;
    }
    setIsClaimingAll(true);
    try {
      const unowned = allCourses.filter(c => !ownedCourseIds.includes(c.id) && c.status !== 'draft' && c.status !== 'inactive');
      if (unowned.length === 0) {
        toast.info('Bạn đã sở hữu toàn bộ các khóa học trên hệ thống!');
        setIsClaimingAll(false);
        return;
      }

      let hasFirestoreError = false;
      let firstError: any = null;

      for (const course of unowned) {
        try {
          const courseRef = doc(db, "users", currentUserEmail, "purchased_courses", course.id);
          await setDoc(courseRef, {
            courseId: course.id,
            courseTitle: course.title || '',
            title: course.title || '',
            price: course.price || '',
            progress: 0,
            unlockedAt: new Date().toISOString(),
            purchasedAt: new Date().toISOString(),
            status: 'active',
            claimedVia: 'VIP_CLAIM_ALL'
          }, { merge: true });
        } catch (e) {
          console.warn('Firestore claim error for course:', course.id, e);
          hasFirestoreError = true;
          if (!firstError) firstError = e;
        }
        localStorage.setItem('course_unlocked_' + course.id, 'true');
      }

      const allActiveIds = allCourses.filter(c => c.status !== 'draft' && c.status !== 'inactive').map(c => c.id);
      const newOwned = Array.from(new Set([...ownedCourseIds, ...allActiveIds]));
      setOwnedCourseIds(newOwned);
      try {
        localStorage.setItem(`user_courses_${currentUserEmail}`, JSON.stringify(newOwned));
        localStorage.setItem(`has_claimed_all_${currentUserEmail}`, 'true');
      } catch (e) {}
      window.dispatchEvent(new CustomEvent('courses_updated'));
      window.dispatchEvent(new Event('storage'));

      toast.success(`👑 Đã kích hoạt toàn bộ ${unowned.length} khóa học vào tài khoản của bạn!`);
      if (hasFirestoreError && firstError) {
        const errorInfo = logFirestoreError('Mở khóa toàn bộ khóa học', `users/${auth.currentUser?.email}/purchased_courses/*`, firstError);
        if (errorInfo.code === 'permission-denied') {
          toast.info('Lưu ý: Cloud Firestore đang chờ cấp quyền Rules trên Firebase Console. Dữ liệu đã sẵn sàng ngoại tuyến để bạn học ngay!', 7000);
        }
      }
    } catch (err: any) {
      console.error("Lỗi mở khóa tất cả:", err);
      const errorInfo = logFirestoreError('Mở khóa toàn bộ khóa học', `users/${auth.currentUser?.email}/purchased_courses/*`, err);
      toast.info('Lưu ý: ' + errorInfo.solution, 7000);
    } finally {
      setIsClaimingAll(false);
    }
  };

  // Danh sách khóa học chưa sở hữu (chỉ hiển thị nút nhận tất cả khi còn khóa chưa nhận và đã tải xong dữ liệu)
  const unownedCourses = useMemo(() => {
    if (isLoadingOwnership) return [];
    return allCourses.filter(c => !ownedCourseIds.includes(c.id) && c.status !== 'draft' && c.status !== 'inactive');
  }, [allCourses, ownedCourseIds, isLoadingOwnership]);

  // Logic lọc khóa học
  const filteredCourses = useMemo(() => {
    return allCourses.filter(course => {
      const isDraft = course.status === 'draft' || course.status === 'inactive';
      if (isDraft) return false; // Hide drafts & inactive courses for general view

      // Hide VIP package / Combos from regular single courses list
      if (course.id === 'khoa-vip' || course.category === 'Gói VIP' || course.id.startsWith('combo-')) {
        return false;
      }

      const term = searchTerm.toLowerCase();
      const matchesSearch = course.title.toLowerCase().includes(term) || (course.category && course.category.toLowerCase().includes(term));
      
      let matchesCategory = false;
      if (activeCategory === 'Tất cả') {
        matchesCategory = true;
      } else if (activeCategory === 'Mới cập nhật') {
        matchesCategory = isCourseNewOrUpdated(course.id);
      } else {
        matchesCategory = Boolean(course.category && course.category.toUpperCase().includes(activeCategory.toUpperCase()));
      }

      return matchesSearch && matchesCategory;
    });
  }, [searchTerm, activeCategory, allCourses]);

  return (
    <main className="min-h-screen bg-[#f8fafc] pb-20 animate-fade-in">
      <Helmet>
        <title>Danh Sách Khóa Học | FAST E-Learning</title>
        <meta name="description" content="Khám phá các khóa học an toàn thực phẩm, quản lý chất lượng chuyên sâu từ FAST E-Learning." />
      </Helmet>
      {/* Search & Hero Header */}
      <div className="bg-gradient-to-br from-[#007c76] via-[#00746f] to-[#005f5b] pt-16 pb-32 md:pb-40 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-white/10 rounded-full blur-3xl -mr-48 -mt-48"></div>
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-yellow-400/10 rounded-full blur-3xl -ml-32 -mb-32"></div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10 w-full">
          <div className="flex justify-center mb-6">
            <Breadcrumbs theme="dark" items={[{ label: 'Trang chủ', path: '/' }, { label: 'Khóa học' }]} />
          </div>
          <div className="flex justify-center mb-6">
            <span className="inline-flex items-center gap-2 bg-white/15 backdrop-blur-md px-5 py-2 text-xs md:text-sm font-black uppercase tracking-[0.2em] rounded-full border border-white/20 text-white shadow-lg">
              <span className="w-2 h-2 rounded-full bg-yellow-300 animate-pulse"></span>
              Học viện FAST E-Learning
            </span>
          </div>
          
          <h1 className="text-3xl sm:text-5xl md:text-6xl lg:text-7xl font-black uppercase tracking-tighter leading-tight mb-8 md:mb-12">
            <span className="text-white block leading-none mb-2">Nâng Tầm Kiến Thức</span>
            <span className="text-yellow-300 block leading-none">An Toàn Thực Phẩm</span>
          </h1>

          {/* Search Bar Container */}
          <div className="max-w-2xl mx-auto relative group shadow-2xl">
             <div className="absolute inset-y-0 left-0 pl-6 flex items-center pointer-events-none">
                <svg className="h-5 w-5 text-[#007c76]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
             </div>
             <input 
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Tìm khóa học bạn đang quan tâm..."
                className="w-full pl-14 pr-36 py-5 md:py-6 bg-white rounded-3xl text-gray-800 font-bold focus:outline-none focus:ring-4 focus:ring-white/30 transition-all text-sm md:text-base border-none shadow-xl"
             />
             <div className="absolute right-3 inset-y-3 hidden md:block">
                <button className="h-full bg-[#007c76]/10 hover:bg-[#007c76]/20 text-[#007c76] border border-[#007c76]/20 backdrop-blur-sm px-8 rounded-2xl font-black text-xs uppercase tracking-widest transition-all active:scale-95">Tìm kiếm</button>
             </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-16 relative z-20">
        {/* Category Pills */}
        <div className="flex overflow-x-auto no-scrollbar gap-3 mb-12 py-2">
            {Categories.map((cat) => {
                const isNewTab = cat === 'Mới cập nhật';
                const isSelected = activeCategory === cat;
                return (
                  <button
                      key={cat}
                      onClick={() => setActiveCategory(cat)}
                      className={`whitespace-nowrap px-6 py-3.5 rounded-2xl font-black text-xs uppercase tracking-widest transition-all duration-300 border-2 ${
                          isSelected 
                          ? isNewTab
                            ? 'bg-yellow-400 text-yellow-950 border-yellow-400 shadow-lg shadow-yellow-400/30 translate-y-[-2px]'
                            : 'bg-[#007c76] text-white border-[#007c76] shadow-lg shadow-[#007c76]/30 translate-y-[-2px]' 
                          : isNewTab
                            ? 'bg-yellow-50/90 text-yellow-600 border-yellow-300/90 hover:bg-yellow-100 hover:text-yellow-700 shadow-xs'
                            : 'bg-white text-gray-400 border-gray-100 hover:border-[#007c76]/30 hover:text-[#007c76]'
                      }`}
                  >
                      <span className={isNewTab && !isSelected ? 'text-yellow-600 font-black' : ''}>{cat}</span>
                  </button>
                );
            })}
        </div>

        {/* Course Grid Results */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
            <h2 className="text-xl md:text-2xl font-black text-gray-800 uppercase tracking-tight flex items-center gap-3">
                <span className="w-2 h-8 bg-[#007c76] rounded-full"></span>
                {activeCategory === 'Tất cả' ? 'Tất cả bài học' : `Khóa học ${activeCategory}`}
                <span className="text-sm font-bold text-gray-300 ml-2">({filteredCourses.length})</span>
            </h2>

            {isVipOrAdmin && unownedCourses.length > 0 && (
                <button
                    onClick={handleClaimAllCourses}
                    disabled={isClaimingAll}
                    className="inline-flex items-center justify-center gap-2.5 px-6 py-3.5 bg-gradient-to-r from-amber-500 via-yellow-500 to-amber-600 hover:from-amber-400 hover:to-yellow-400 text-slate-950 font-black text-xs uppercase tracking-wider rounded-2xl shadow-xl shadow-amber-500/20 active:scale-95 transition-all cursor-pointer disabled:opacity-50"
                >
                    {isClaimingAll ? (
                        <>
                            <svg className="w-4 h-4 animate-spin text-slate-950" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                            <span>Đang kích hoạt toàn bộ...</span>
                        </>
                    ) : (
                        <>
                            <span>👑 Nhận {unownedCourses.length} Khóa Học Còn Lại (VIP / Admin)</span>
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" /></svg>
                        </>
                    )}
                </button>
            )}
        </div>

        {isLoadingOwnership ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
                {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
                    <div key={i} className="bg-white rounded-3xl overflow-hidden shadow-sm border border-gray-100 flex flex-col h-full">
                        <div className="w-full h-48 bg-gray-200 animate-pulse"></div>
                        <div className="p-6 flex-1 flex flex-col space-y-4">
                            <div className="flex justify-between items-start">
                                <div className="h-4 w-20 bg-gray-200 rounded-full animate-pulse"></div>
                            </div>
                            <div className="h-6 w-full bg-gray-200 rounded-md animate-pulse"></div>
                            <div className="h-6 w-3/4 bg-gray-200 rounded-md animate-pulse"></div>
                            <div className="mt-auto pt-4 border-t border-gray-100 flex justify-between items-center">
                                <div className="h-4 w-24 bg-gray-200 rounded animate-pulse"></div>
                                <div className="h-10 w-28 bg-gray-200 rounded-xl animate-pulse"></div>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        ) : filteredCourses.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
                {filteredCourses.map((course) => {
                    const isOwned = ownedCourseIds.includes(course.id);
                    return (
                        <CourseCard 
                            key={course.id} 
                            course={course}
                            isOwned={isOwned} 
                            isVipAvailable={!isOwned && isVipOrAdmin}
                            progress={isOwned ? 0 : undefined} 
                            onClaimCourse={isVipOrAdmin ? handleClaimCourse : undefined}
                            isClaiming={claimingId === course.id}
                        />
                    );
                })}
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

        {/* COMBO PACKAGES SECTION */}
        <div className="mt-20 space-y-8">
            <div className="border-l-4 border-[#007c76] pl-4">
                <h2 className="text-2xl md:text-3xl font-black text-gray-800 uppercase tracking-tight">
                    🎁 Gói Combo Tiết Kiệm (Đăng ký học nhiều hơn, ưu đãi nhiều hơn)
                </h2>
                <p className="text-gray-400 text-xs font-bold uppercase tracking-wider mt-1">
                    Lộ trình đào tạo trọn gói, tiết kiệm chi phí tối đa so với mua lẻ từng khóa
                </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {combos.map((combo) => {
                    const isVip = combo.id === 'khoa-vip' || combo.id.includes('vip');
                    const isPro = combo.id === 'combo-pro' || combo.id.includes('pro');
                    return (
                        <div key={combo.id} className={`bg-white rounded-[32px] border-2 transition-all duration-300 overflow-hidden flex flex-col hover:shadow-xl hover:scale-[1.01] ${
                            isVip 
                                ? 'border-amber-500 shadow-md shadow-amber-500/5' 
                                : isPro 
                                    ? 'border-blue-500/50 shadow-md shadow-blue-500/5' 
                                    : 'border-gray-100 hover:border-[#007c76]/30'
                        }`}>
                            <div className="relative h-44 overflow-hidden shrink-0">
                                <img 
                                    src={combo.image} 
                                    alt={combo.title} 
                                    className="w-full h-full object-cover transition-transform duration-500 hover:scale-105"
                                    onError={(e) => {
                                        (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&q=80&w=800';
                                    }}
                                />
                                {isVip && (
                                    <div className="absolute top-4 left-4 bg-amber-500 text-amber-950 px-3.5 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg flex items-center gap-1">
                                        ⭐ Đặc Quyền VIP
                                    </div>
                                )}
                            </div>

                            <div className="p-6 flex-1 flex flex-col space-y-4">
                                <div className="space-y-1.5">
                                    <h3 className="text-base sm:text-lg font-black text-gray-800 leading-snug line-clamp-1">
                                        {combo.title}
                                    </h3>
                                    <p className="text-xs text-gray-500 font-medium leading-relaxed line-clamp-2">
                                        {combo.description}
                                    </p>
                                </div>

                                <div className="pt-2 border-t border-gray-150 flex justify-between items-center mt-auto">
                                    <div className="flex flex-col">
                                        <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Học phí trọn gói</span>
                                        <span className="text-lg font-extrabold text-[#007c76]">{combo.price}</span>
                                    </div>

                                    <Link 
                                        to="/account/vip-upgrade"
                                        className={`px-5 py-2.5 rounded-xl font-black text-[11px] uppercase tracking-widest transition-all ${
                                            isVip 
                                                ? 'bg-amber-500 text-amber-950 hover:bg-amber-600' 
                                                : isPro 
                                                    ? 'bg-blue-600 text-white hover:bg-blue-700' 
                                                    : 'bg-[#007c76] text-white hover:bg-[#005f5b]'
                                        }`}
                                    >
                                        Đăng ký ngay
                                    </Link>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>



        {/* Support Section */}
        <section className="mt-12 bg-gray-900 rounded-[48px] p-8 md:p-16 text-white flex flex-col md:flex-row items-center justify-between gap-10">
            <div className="space-y-4 text-center md:text-left">
                <h3 className="text-3xl md:text-4xl font-black uppercase tracking-tight leading-none">Bạn cần lộ trình <br/> <span className="text-[#007c76]">Riêng Biệt?</span></h3>
                <p className="text-gray-400 font-bold max-w-md">Liên hệ ngay để chuyên gia FAST thiết kế khóa học đào tạo riêng cho doanh nghiệp của bạn.</p>
            </div>
            <div className="flex flex-col sm:flex-row gap-4">
                <a href="tel:0927002668" className="bg-[#007c76] text-white px-10 py-5 rounded-2xl font-black uppercase text-xs tracking-widest hover:scale-105 transition-all shadow-xl shadow-[#007c76]/20">Gọi ngay: 0927 002 668</a>
                <button className="bg-white/5 backdrop-blur-xl border border-white/10 text-white px-10 py-5 rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-white/10 transition-all">Nhận tư vấn qua Email</button>
            </div>
        </section>
      </div>
    </main>
  );
};

export default Courses;
