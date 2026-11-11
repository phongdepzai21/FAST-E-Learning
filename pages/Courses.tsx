
import React, { useMemo, useState, useEffect } from 'react';
import { Link } from "react-router-dom";
import CourseCard from '../components/CourseCard';
import { Breadcrumbs } from '../components/Breadcrumbs';
import { COURSES as HARDCODED_COURSES, getMergedCourses, getMergedCombos, DEFAULT_COMBOS, getMergedTrainingCourses } from '../constants';
import { auth, db } from '../firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { collection, doc, setDoc, onSnapshot, QuerySnapshot, DocumentData, getDocs } from 'firebase/firestore';
import { useToast } from '../contexts/ToastContext';
import { Course, TrainingCourse } from '../types';
import { parseFirestoreError, logFirestoreError } from '../utils/firestoreDiagnostics';
import { Helmet } from 'react-helmet-async';
import { isCourseNewOrUpdated, getUnreadCount } from '../utils/courseNotificationService';
import { trackCourseView } from '../utils/courseTrackingService';
import { TrainingRegistrationModal } from '../components/TrainingRegistrationModal';
import { Calendar, Clock, MapPin, Video, Award, Users, ArrowRight, Sparkles, CheckCircle2 } from 'lucide-react';

const Categories = ['Tất cả', 'Khóa Đào Tạo', 'ISO', 'HACCP', 'QA/QC', 'VietGAP', 'Sản xuất', 'Lean', 'Quản trị'];

const Courses: React.FC = () => {
  const toast = useToast();
  const [searchTerm, setSearchTerm] = useState('');
  const [activeCategory, setActiveCategory] = useState('Tất cả');
  const [isDirectModalOpen, setIsDirectModalOpen] = useState(false);
  const [trainingCourses, setTrainingCourses] = useState<TrainingCourse[]>(() => getMergedTrainingCourses([], { includeInactive: false }));
  const [selectedTrainingCourse, setSelectedTrainingCourse] = useState<TrainingCourse | null>(null);
  const [isTrainingModalOpen, setIsTrainingModalOpen] = useState(false);
  const [ownedCourseIds, setOwnedCourseIds] = useState<string[]>([]);
  const [isLoadingOwnership, setIsLoadingOwnership] = useState(true);
  const [allCourses, setAllCourses] = useState<Course[]>(() => getMergedCourses([]));
  const allCoursesRef = React.useRef(allCourses);
  React.useEffect(() => { allCoursesRef.current = allCourses; }, []);
  const [isVipOrAdmin, setIsVipOrAdmin] = useState(false);
  const [currentUserEmail, setCurrentUserEmail] = useState<string | null>(null);
  const [claimingId, setClaimingId] = useState<string | null>(null);
  const [combos, setCombos] = useState<any[]>(() => getMergedCombos([], { includeInactive: false }));
  const [expandedComboIds, setExpandedComboIds] = useState<{ [id: string]: boolean }>({});
  const toggleComboExpand = (id: string) => {
    setExpandedComboIds(prev => ({ ...prev, [id]: !prev[id] }));
  };

  // --- REAL-TIME SYNC TRAINING COURSES FROM FIRESTORE ---
  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'training_courses'), (snapshot) => {
      const fsList: TrainingCourse[] = [];
      snapshot.forEach((docSnap) => {
        fsList.push({ id: docSnap.id, ...docSnap.data() } as TrainingCourse);
      });
      setTrainingCourses(getMergedTrainingCourses(fsList, { includeInactive: false }));
    }, (err) => {
      console.warn("Lỗi snapshot Firestore training_courses ở Courses.tsx:", err);
    });
    return () => unsub();
  }, []);

  // --- REAL-TIME SYNC ALL COMBOS FROM FIRESTORE & API ---
  useEffect(() => {
    const combosCollMap = new Map<string, any>();
    const customCombosCollMap = new Map<string, any>();

    const syncCombosList = () => {
      const combined = [...combosCollMap.values(), ...customCombosCollMap.values()];
      const all = getMergedCombos(combined, { includeInactive: false });
      setCombos(all);
    };

    // 1. Listen on Firestore real-time snapshots (both combos and customCombos)
    const unsub1 = onSnapshot(collection(db, 'combos'), (snapshot) => {
      combosCollMap.clear();
      snapshot.forEach((docSnap) => {
        combosCollMap.set(docSnap.id, { id: docSnap.id, ...docSnap.data() });
      });
      syncCombosList();
    }, (err) => {
      console.warn("Lỗi snapshot Firestore combos ở Courses.tsx:", err);
      syncCombosList();
    });

    const unsub2 = onSnapshot(collection(db, 'customCombos'), (snapshot) => {
      customCombosCollMap.clear();
      snapshot.forEach((docSnap) => {
        customCombosCollMap.set(docSnap.id, { id: docSnap.id, ...docSnap.data() });
      });
      syncCombosList();
    }, (err) => {
      console.warn("Lỗi snapshot Firestore customCombos ở Courses.tsx:", err);
      syncCombosList();
    });

    // 2. Also listen for custom combo events
    const handleSync = () => {
      syncCombosList();
    };

    window.addEventListener('combos_updated', handleSync);
    window.addEventListener('storage', handleSync);

    return () => {
      unsub1();
      unsub2();
      window.removeEventListener('combos_updated', handleSync);
      window.removeEventListener('storage', handleSync);
    };
  }, []);

  // --- FETCH ALL COURSES FROM SERVER API ---
  useEffect(() => {
    const loadCourses = async () => {
      try {
        const response = await fetch('/api/courses');
        if (response.ok) {
          const data = await response.json();
          if (data && Array.isArray(data.courses)) {
            setAllCourses(getMergedCourses(data.courses));
          }
        }
      } catch (error) {
        console.error("Lỗi đồng bộ danh sách khóa học từ API:", error);
      }
    };

    loadCourses();

    // Listen for global sync updates via meta-document
    const unsubSync = onSnapshot(doc(db, "sync_control", "courses"), () => {
      loadCourses();
    });

    const handleCustomUpdate = () => loadCourses();
    window.addEventListener('courses_updated', handleCustomUpdate);
    window.addEventListener('storage', handleCustomUpdate);

    return () => {
      unsubSync();
      window.removeEventListener('courses_updated', handleCustomUpdate);
      window.removeEventListener('storage', handleCustomUpdate);
    };
  }, [currentUserEmail]);

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
            
            // Check real Admin/VIP status from ADMIN_EMAILS
            import('../constants').then(({ ADMIN_EMAILS }) => {
                const isPrivileged = ADMIN_EMAILS.includes(normalizedEmail);
                setIsVipOrAdmin(isPrivileged);
            });

            // Fast local storage cache preload
            try {
              const cachedStr = localStorage.getItem(`user_courses_${normalizedEmail}`);
              if (cachedStr) {
                const cachedIds = JSON.parse(cachedStr);
                if (Array.isArray(cachedIds) && cachedIds.length > 0) {
                  setOwnedCourseIds(cachedIds);
                }
              }
            } catch (e) {}

            // Real-time listener for purchased courses
            unsubscribeSnapshot = onSnapshot(
              collection(db, "users", normalizedEmail, "purchased_courses"),
              (snapshot) => {
                const ids = snapshot.docs.map(doc => doc.data().courseId || doc.id);
                setOwnedCourseIds(ids);
                setIsLoadingOwnership(false);
                try {
                  localStorage.setItem(`user_courses_${normalizedEmail}`, JSON.stringify(ids));
                } catch (e) {}
              },
              (error) => {
                console.error("Lỗi đồng bộ khóa học realtime:", error);
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
        window.removeEventListener('courses_updated', handleStorageChange);
        window.removeEventListener('storage', handleStorageChange);
    };
  }, [allCourses]);



  const [hideOwned, setHideOwned] = useState<boolean>(false);

  // Logic lọc khóa học
  const filteredCourses = useMemo(() => {
    const sourceCourses = allCourses.length > 0 ? allCourses : HARDCODED_COURSES;
    const seenIds = new Set<string>();
    return sourceCourses.filter(course => {
      if (!course || !course.id || seenIds.has(course.id)) return false;
      seenIds.add(course.id);

      const isDraft = course.status === 'draft' || course.status === 'inactive';
      if (isDraft) return false; // Hide drafts & inactive courses for general view

      // Hide VIP package / Combos from regular single courses list
      if (course.id === 'khoa-vip' || course.category === 'Gói VIP' || course.id.startsWith('combo-')) {
        return false;
      }

      // Hide purchased courses ONLY if user explicitly checked hideOwned (defaults to false)
      if (hideOwned && ownedCourseIds.includes(course.id)) {
        return false;
      }

      const term = searchTerm.toLowerCase();
      const matchesSearch = !term || course.title.toLowerCase().includes(term) || (course.category && course.category.toLowerCase().includes(term));
      
      let matchesCategory = false;
      if (activeCategory === 'Tất cả') {
        matchesCategory = true;
      } else if (activeCategory === 'Khóa Đào Tạo') {
        return false;
      } else {
        matchesCategory = Boolean(course.category && course.category.toUpperCase().includes(activeCategory.toUpperCase()));
      }

      return matchesSearch && matchesCategory;
    });
  }, [searchTerm, activeCategory, allCourses, ownedCourseIds, hideOwned]);

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
                {filteredCourses.map((course, idx) => {
                    const isOwned = ownedCourseIds.includes(course.id);
                    return (
                        <CourseCard 
                            key={`course-${course.id}-${idx}`} 
                            course={course}
                            isOwned={isOwned} 
                            progress={isOwned ? 0 : undefined} 
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

        {/* DEDICATED SECTION: CHƯƠNG TRÌNH ĐÀO TẠO TRỰC TIẾP & ONLINE ZOOM */}
        <div id="khoa-dao-tao-section" className="mt-16 mb-14">
          <div className="bg-white rounded-3xl p-6 sm:p-10 border border-slate-200/90 shadow-sm text-slate-800">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-8 border-b border-slate-100 pb-6">
              <div className="space-y-2">
                <div className="inline-flex items-center gap-2 bg-teal-50 border border-teal-200 px-3.5 py-1 rounded-full text-xs font-black uppercase tracking-wider text-[#007c76]">
                  <span className="w-2 h-2 rounded-full bg-[#007c76] animate-pulse" />
                  Chương Trình Đào Tạo Trực Tiếp &amp; Online Zoom
                </div>
                <h3 className="text-2xl sm:text-3xl font-black text-slate-900 leading-tight">
                  Khóa Đào Tạo Tập Huấn &amp; Cấp Chứng Nhận
                </h3>
                <p className="text-slate-500 text-xs sm:text-sm font-medium max-w-2xl leading-relaxed">
                  Đào tạo bài bản theo quy chuẩn Bộ Y tế, ISO 22000 &amp; Codex. Tương tác trực tiếp 1-1 cùng chuyên gia QMS/ATTP, cấp chứng nhận định danh điện tử 10 số.
                </p>
              </div>

              <div className="shrink-0 flex items-center gap-2">
                <span className="text-xs font-bold text-slate-600 bg-slate-100 px-3.5 py-2 rounded-xl border border-slate-200">
                  {trainingCourses.length} khóa đào tạo có sẵn
                </span>
              </div>
            </div>

            {/* Grid Khóa Đào Tạo với ảnh bìa như khóa thường */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 relative z-10">
              {trainingCourses.map((tc) => {
                const formatLabel = tc.trainingFormat === 'zoom' 
                  ? 'Online qua Zoom' 
                  : tc.trainingFormat === 'direct' 
                    ? 'Trực tiếp Hội trường' 
                    : 'Trực tiếp & Online Zoom';
                return (
                  <div 
                    key={tc.id}
                    className="bg-white rounded-2xl overflow-hidden shadow-lg border border-slate-200/80 flex flex-col group hover:shadow-2xl hover:border-teal-400 transition-all duration-300 text-slate-800"
                  >
                    {/* Ảnh bìa như khóa thường */}
                    <div className="relative h-44 overflow-hidden bg-slate-100">
                      <img 
                        src={tc.image} 
                        alt={tc.title} 
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1556910103-1c02745aae4d?auto=format&fit=crop&q=80&w=800';
                        }}
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-slate-950/70 via-transparent to-transparent pointer-events-none" />
                      <div className="absolute top-3 left-3">
                        <span className="px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider bg-teal-600/90 text-white backdrop-blur-xs border border-white/20 flex items-center gap-1 shadow-xs">
                          {tc.trainingFormat === 'zoom' ? <Video className="w-3 h-3" /> : <MapPin className="w-3 h-3" />}
                          {formatLabel}
                        </span>
                      </div>
                      <div className="absolute top-3 right-3">
                        <span className="px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider bg-slate-900/80 text-teal-200 backdrop-blur-xs border border-white/10">
                          {tc.category}
                        </span>
                      </div>
                      <div className="absolute bottom-2.5 left-3 right-3 flex items-center justify-between text-white text-[11px] font-bold">
                        <span className="flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5 text-teal-300" />
                          {tc.duration}
                        </span>
                        <span className="text-teal-300 font-mono text-[10px]">
                          ID: {tc.id}
                        </span>
                      </div>
                    </div>

                    {/* Nội dung card */}
                    <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                      <div className="space-y-2">
                        <h4 className="font-black text-slate-900 text-sm sm:text-base leading-snug line-clamp-2 group-hover:text-[#007c76] transition-colors">
                          {tc.title}
                        </h4>
                        <p className="text-xs text-slate-500 font-medium line-clamp-2 leading-relaxed">
                          {tc.description}
                        </p>

                        <div className="pt-2 space-y-1.5 text-xs text-slate-600">
                          <div className="flex items-center gap-1.5 text-slate-700 font-semibold truncate">
                            <Calendar className="w-3.5 h-3.5 text-teal-600 shrink-0" />
                            <span className="truncate">{tc.startDate}</span>
                          </div>
                          <div className="flex items-center gap-1.5 text-slate-500 truncate">
                            <Users className="w-3.5 h-3.5 text-teal-600 shrink-0" />
                            <span className="truncate">{tc.instructor}</span>
                          </div>
                        </div>
                      </div>

                      {/* Giá & Nút đăng ký */}
                      <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-3">
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="text-base sm:text-lg font-black text-[#007c76]">
                              {tc.price}
                            </span>
                            {tc.originalPrice && tc.originalPrice !== tc.price && (
                              <span className="text-xs text-slate-400 line-through font-semibold">
                                {tc.originalPrice}
                              </span>
                            )}
                          </div>
                          <span className="text-[10px] text-emerald-700 font-bold block">
                            Học phí trọn gói
                          </span>
                        </div>

                        <button
                          type="button"
                          onClick={() => {
                            setSelectedTrainingCourse(tc);
                            setIsTrainingModalOpen(true);
                          }}
                          className="px-4 py-2.5 bg-gradient-to-r from-emerald-600 to-[#007c76] hover:from-emerald-700 hover:to-[#005c56] text-white rounded-xl text-xs font-black uppercase tracking-wider shadow-md shadow-teal-700/20 hover:shadow-lg transition-all transform hover:scale-[1.02] active:scale-95 flex items-center gap-1.5 cursor-pointer shrink-0"
                        >
                          <span>Đăng ký</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* COMBO PACKAGES SECTION */}
        <div className="mt-20 space-y-8">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-l-4 border-[#007c76] pl-4">
                <div>
                    <h2 className="text-2xl md:text-3xl font-black text-gray-800 uppercase tracking-tight flex items-center gap-2">
                        <span>🎁 Gói Combo Đào Tạo Trọn Gói</span>
                    </h2>
                    <p className="text-gray-500 text-xs sm:text-sm font-medium mt-1">
                        Lộ trình chuẩn hóa trọn gói, tiết kiệm chi phí tối đa so với mua lẻ từng khóa học
                    </p>
                </div>
                <Link to="/account/vip-upgrade" className="text-xs font-bold text-[#007c76] hover:underline flex items-center gap-1 shrink-0">
                    Xem tất cả ưu đãi &amp; nâng cấp VIP →
                </Link>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {combos.map((combo) => {
                    const isVip = combo.id === 'khoa-vip' || combo.id.includes('vip');
                    const isPro = combo.id === 'combo-pro' || combo.id.includes('pro');
                    const savingsBadge = combo.savings || 'Tiết kiệm 50%';
                    const originalPriceStr = combo.originalPrice || (combo.price === '1.200.000đ' ? '2.400.000đ' : combo.price === '1.800.000đ' ? '3.600.000đ' : combo.price === '2.500.000đ' ? '5.000.000đ' : '');

                    return (
                        <div key={combo.id} className={`bg-white rounded-3xl border-2 transition-all duration-300 overflow-hidden flex flex-col hover:shadow-2xl hover:-translate-y-1.5 group relative ${
                            isVip 
                                ? 'border-amber-400/90 shadow-md shadow-amber-500/10 hover:border-amber-500' 
                                : isPro 
                                    ? 'border-teal-400/80 shadow-md shadow-teal-500/10 hover:border-teal-500' 
                                    : 'border-slate-200/90 hover:border-teal-500/60 shadow-sm'
                        }`}>
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

                                {/* Badge Tiết Kiệm Prominent Overlay */}
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

                            <div className="p-6 flex-1 flex flex-col space-y-4">
                                <div className="space-y-1.5">
                                    <h3 className="text-base sm:text-lg font-black text-gray-900 group-hover:text-[#007c76] transition-colors leading-snug line-clamp-1">
                                        {combo.title}
                                    </h3>
                                    <p className="text-xs text-slate-500 font-medium leading-relaxed line-clamp-2">
                                        {combo.description}
                                    </p>
                                </div>

                                {/* Interactive Hide/Show Courses Toggle for Combo */}
                                {(() => {
                                    const cIds: string[] = Array.isArray(combo.courseIds) ? combo.courseIds : [];
                                    const comboCourses = allCourses.filter(c => cIds.includes(c.id));
                                    const isExpanded = !!expandedComboIds[combo.id];

                                    return (
                                        <div className="space-y-2 pt-1">
                                            <button
                                                type="button"
                                                onClick={() => toggleComboExpand(combo.id)}
                                                className="w-full py-2 px-3 rounded-xl bg-slate-50 hover:bg-teal-50/70 border border-slate-200/80 text-[#007c76] text-xs font-black flex items-center justify-between transition cursor-pointer"
                                            >
                                                <span>{isExpanded ? 'Ẩn danh sách khóa học' : `Xem khóa học trong combo (${cIds.length})`}</span>
                                                <span className="text-xs transition-transform duration-200">{isExpanded ? '▲' : '▼'}</span>
                                            </button>

                                            {isExpanded && (
                                                <div className="space-y-1.5 p-2.5 bg-slate-50/80 rounded-2xl border border-slate-200/60 max-h-48 overflow-y-auto custom-scrollbar">
                                                    {comboCourses.length > 0 ? (
                                                        comboCourses.map((c, cIdx) => (
                                                            <div 
                                                                key={c.id || cIdx} 
                                                                onClick={() => trackCourseView(c, currentUserEmail)}
                                                                className="p-2 rounded-xl bg-white border border-slate-100 flex items-center justify-between gap-2 text-xs shadow-2xs hover:border-teal-300 transition"
                                                            >
                                                                <span className="font-bold text-slate-800 truncate">{c.title}</span>
                                                                <span className="text-[10px] px-1.5 py-0.5 rounded bg-teal-50 text-[#007c76] font-bold shrink-0">
                                                                    {c.category || 'ISO'}
                                                                </span>
                                                            </div>
                                                        ))
                                                    ) : (
                                                        <div className="text-[11px] text-slate-400 p-2 text-center font-medium">
                                                            Gói gồm {cIds.length} chuyên đề đào tạo thực tế
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    );
                                })()}

                                <div className="pt-3 border-t border-slate-100 flex justify-between items-center mt-auto">
                                    <div className="flex flex-col">
                                        <div className="flex items-center gap-1.5">
                                            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Giá combo</span>
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
                                        <span>Đăng ký gói ngay</span>
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
                <p className="text-gray-400 font-bold max-w-md">Liên hệ ngay để chuyên gia FAST thiết kế chương trình chuyên sâu riêng cho doanh nghiệp của bạn.</p>
            </div>
            <div className="flex flex-col sm:flex-row gap-4">
                <a href="tel:0927002668" className="bg-[#007c76] text-white px-10 py-5 rounded-2xl font-black uppercase text-xs tracking-widest hover:scale-105 transition-all shadow-xl shadow-[#007c76]/20">Gọi ngay: 0927 002 668</a>
                <button className="bg-white/5 backdrop-blur-xl border border-white/10 text-white px-10 py-5 rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-white/10 transition-all">Nhận tư vấn qua Email</button>
            </div>
        </section>
      </div>

      {/* Modal Đăng Ký Khóa Đào Tạo Trực Tiếp & Online Zoom */}
      <TrainingRegistrationModal
        isOpen={isTrainingModalOpen || isDirectModalOpen}
        onClose={() => {
          setIsTrainingModalOpen(false);
          setIsDirectModalOpen(false);
        }}
        course={selectedTrainingCourse || (trainingCourses.length > 0 ? trainingCourses[0] : null)}
      />
    </main>
  );
};

export default Courses;
