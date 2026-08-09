
import React, { useEffect, useState, useMemo, useRef, Suspense, lazy } from 'react';
import { useParams, Link, useNavigate, useLocation } from "react-router-dom";
import { COURSES, ADMIN_EMAILS, getMergedCourses, formatPriceSubmit } from '../constants';
import { auth, db, storage } from '../firebase';
// Fix: Standardizing modular Firebase imports and resolving missing exported member errors
import { onAuthStateChanged } from 'firebase/auth';
import { doc, setDoc, getDoc, collection, getDocs, onSnapshot } from 'firebase/firestore';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { Course } from '../types';
import PaymentModal from '../components/PaymentModal';
import Handbook from './Handbook';

// OPTIMIZATION: Code splitting - Lazy load PaymentModal
// Removed PaymentModal lazy load

const DUMMY_LESSONS = [
    { title: "Phân tích bối cảnh tổ chức", videoUrl: "https://www.w3schools.com/html/mov_bbb.mp4" },
    { title: "Xây dựng chính sách an toàn thực phẩm", videoUrl: "https://www.w3schools.com/html/mov_bbb.mp4" },
    { title: "Hoạch định hệ thống quản lý và 7 nguyên tắc HACCP", videoUrl: "https://www.dropbox.com/scl/fi/qv5982actdgxnzifug9sw/07-nguyen-tac-haccp.mp4?rlkey=c4gd6hqpoovsepfm04rmlulzi&st=808zm8fm&raw=1" },
    { title: "Quản lý rủi ro và cơ hội", videoUrl: "https://www.w3schools.com/html/mov_bbb.mp4" },
    { title: "Kiểm soát vệ sinh cá nhân và nhà xưởng", videoUrl: "https://www.w3schools.com/html/mov_bbb.mp4" },
    { title: "Quản lý nguồn gốc nguyên liệu (Traceability)", videoUrl: "https://www.w3schools.com/html/mov_bbb.mp4" },
    { title: "Thiết lập điểm kiểm soát tới hạn (CCP)", videoUrl: "https://www.w3schools.com/html/mov_bbb.mp4" },
    { title: "Kỹ năng đánh giá nội bộ", videoUrl: "https://www.w3schools.com/html/mov_bbb.mp4" }
];

const extractLessonsFlat = (raw: any): Array<{ title: string; videoUrl: string }> => {
  if (!raw || !Array.isArray(raw)) return [];
  const result: Array<{ title: string; videoUrl: string }> = [];

  raw.forEach((item: any) => {
    if (item && Array.isArray(item.lessons)) {
      item.lessons.forEach((l: any) => {
        const title = (typeof l === 'string' ? l : (l?.title || '')).replace(/^Chương\s*\d*[:\s-]*/i, '').replace(/^Phần\s*\d*[:\s-]*/i, '').trim();
        if (!title || title.toLowerCase().includes("giới thiệu về fast e-learning")) return;
        const videoUrl = typeof l === 'object' && l?.videoUrl ? l.videoUrl : (
          title.includes("HACCP") 
            ? "https://www.dropbox.com/scl/fi/qv5982actdgxnzifug9sw/07-nguyen-tac-haccp.mp4?rlkey=c4gd6hqpoovsepfm04rmlulzi&st=808zm8fm&raw=1" 
            : "https://www.w3schools.com/html/mov_bbb.mp4"
        );
        result.push({ title, videoUrl });
      });
    } else if (item) {
      const title = (typeof item === 'string' ? item : (item?.title || '')).replace(/^Chương\s*\d*[:\s-]*/i, '').replace(/^Phần\s*\d*[:\s-]*/i, '').trim();
      if (title && !title.toLowerCase().includes("giới thiệu về fast e-learning")) {
        const videoUrl = typeof item === 'object' && item?.videoUrl ? item.videoUrl : (
          title.includes("HACCP") 
            ? "https://www.dropbox.com/scl/fi/qv5982actdgxnzifug9sw/07-nguyen-tac-haccp.mp4?rlkey=c4gd6hqpoovsepfm04rmlulzi&st=808zm8fm&raw=1" 
            : "https://www.w3schools.com/html/mov_bbb.mp4"
        );
        result.push({ title, videoUrl });
      }
    }
  });

  return result;
};

const CourseDetail: React.FC<{ embeddedCourseId?: string }> = ({ embeddedCourseId }) => {
  const { id: paramId } = useParams<{ id: string }>();
  const id = embeddedCourseId || paramId;
  const navigate = useNavigate();
  const location = useLocation();
  const [course, setCourse] = useState<Course | undefined>(COURSES.find(c => c.id === id));
  
  const [currentUser, setCurrentUser] = useState<{name: string, email: string} | null>(null);
  const [isOwned, setIsOwned] = useState(false);
  const [isActivating, setIsActivating] = useState(false);
  const [showSuccessNotification, setShowSuccessNotification] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  const [courseProgress, setCourseProgress] = useState(0);
  const [completedLessons, setCompletedLessons] = useState<string[]>([]);
  
  // State for Video Player Modal
  const [playingLesson, setPlayingLesson] = useState<{ lessonIdx: number, title: string, videoUrl?: string } | null>(null);
  const [isLiked, setIsLiked] = useState(false);

  const [curriculum, setCurriculum] = useState<Array<{ title: string; videoUrl: string }>>([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isVip, setIsVip] = useState(false);
  const [isEditingCurriculum, setIsEditingCurriculum] = useState(false);
  const [editData, setEditData] = useState<Array<{ title: string; videoUrl: string }>>([]);
  const [showPaymentModal, setShowPaymentModal] = useState(false);

  const latestFirestoreDataRef = useRef<any>(null);

  useEffect(() => {
    if (!id) return;

    const loadFromLocalAndFallback = (firestoreData?: any) => {
      if (firestoreData) {
        latestFirestoreDataRef.current = firestoreData;
      }
      const dataToUse = firestoreData || latestFirestoreDataRef.current;
      const fsList = dataToUse ? [{ id, ...dataToUse }] : [];
      const allMerged = getMergedCourses(fsList);
      const found = allMerged.find(c => c.id === id);

      if (found) {
        setCourse(found);
        const curr = dataToUse?.curriculum || found.curriculum;
        const flatList = extractLessonsFlat(curr);
        if (flatList.length > 0) {
          setCurriculum(flatList);
        } else {
          setCurriculum(DUMMY_LESSONS);
        }
      } else {
        const fallbackBase: Course = {
          id,
          title: 'Khóa học',
          price: '599.000đ',
          image: 'https://images.unsplash.com/photo-1533777857889-4be7c70b33f7',
          category: 'Chung',
          description: 'Chi tiết khóa học'
        };
        setCourse(fallbackBase);
        setCurriculum(DUMMY_LESSONS);
      }
    };

    const docRef = doc(db, "courses", id);
    const unsubscribeSnapshot = onSnapshot(
      docRef,
      (docSnap) => {
        if (docSnap.exists()) {
          loadFromLocalAndFallback(docSnap.data());
        } else {
          loadFromLocalAndFallback();
        }
      },
      (error) => {
        console.warn("Lỗi đọc dữ liệu khóa học realtime:", error);
        loadFromLocalAndFallback();
      }
    );

    const handleCustomUpdate = () => loadFromLocalAndFallback();
    window.addEventListener('courses_updated', handleCustomUpdate);
    window.addEventListener('storage', handleCustomUpdate);

    return () => {
      unsubscribeSnapshot();
      window.removeEventListener('courses_updated', handleCustomUpdate);
      window.removeEventListener('storage', handleCustomUpdate);
    };
  }, [id]);

  const [uploadProgress, setUploadProgress] = useState<{ [key: string]: number }>({});

  const handleSaveCurriculum = async () => {
      if (!id) return;
      try {
          const docRef = doc(db, "courses", id);
          const formattedCurriculum = [{ title: "Danh sách bài giảng", lessons: editData }];
          const updatePayload: any = {
            curriculum: formattedCurriculum,
            updatedAt: new Date().toISOString()
          };
          if (course?.title) updatePayload.title = course.title;
          if (course?.price) updatePayload.price = course.price;
          if (course?.image) updatePayload.image = course.image;
          if (course?.category) updatePayload.category = course.category;
          if (course?.description) updatePayload.description = course.description;

          await setDoc(docRef, updatePayload, { merge: true });
          setCurriculum(editData);
          setIsEditingCurriculum(false);

          try {
            const localStr = localStorage.getItem('local_custom_courses');
            let localList = localStr ? JSON.parse(localStr) : [];
            const idx = localList.findIndex((c: any) => c.id === id);
            if (idx !== -1) {
              localList[idx].curriculum = formattedCurriculum;
              if (course?.title) localList[idx].title = course.title;
            } else if (course) {
              localList.push({ ...course, curriculum: formattedCurriculum });
            }
            localStorage.setItem('local_custom_courses', JSON.stringify(localList));
          } catch (e) {}

          window.dispatchEvent(new CustomEvent('courses_updated'));
          alert("Lưu danh sách bài giảng thành công!");
      } catch (error) {
          console.error("Error saving curriculum:", error);
          alert("Có lỗi xảy ra khi lưu.");
      }
  };

  useEffect(() => {
    window.scrollTo(0, 0);
    setTimeout(() => setIsLoaded(true), 100);

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
        if (user && user.email) {
            setCurrentUser({
                name: user.displayName || '',
                email: user.email || ''
            });
            
            const normalizedEmail = user.email.toLowerCase();
            let isPrivileged = ADMIN_EMAILS.includes(normalizedEmail);
            let isVipUser = false;
            
            if (isPrivileged) {
                setIsAdmin(true);
                setIsVip(true);
            } else {
               const localRolesStr = localStorage.getItem(`user_roles_${normalizedEmail}`);
               if (localRolesStr) {
                   try {
                       const localRoles = JSON.parse(localRolesStr);
                       if (localRoles.isAdmin === true && localRoles.rolePromotedByAdmin === true) {
                           setIsAdmin(true);
                           isPrivileged = true;
                       }
                       if (localRoles.isVip) {
                           setIsVip(true);
                           isVipUser = true;
                       }
                   } catch (e) {}
               }
            }

            // Local Check
            const localUnlocked = localStorage.getItem(`course_unlocked_${id}`);
            if (localUnlocked === 'true') {
                setIsOwned(true);
            }

            // DB Check
            if (id) {
                try {
                    const docRef = doc(db, "users", normalizedEmail, "purchased_courses", id);
                    const docSnap = await getDoc(docRef);
                    if (docSnap.exists()) {
                        setIsOwned(true);
                        setCourseProgress(docSnap.data().progress || 0);
                        setCompletedLessons(docSnap.data().completedLessons || []);
                        localStorage.setItem(`course_unlocked_${id}`, 'true');
                    }
                } catch (error) {
                    console.error("Lỗi kiểm tra khóa học:", error);
                }
            }
        } else {
            setCurrentUser(null);
            setIsOwned(false);
        }
    });
    return () => unsubscribe();
  }, [id]);

  const handlePaymentSuccess = async () => {
    const latestUser = auth.currentUser;
    if (latestUser && latestUser.email && id && course) {
        try {
            const userEmail = latestUser.email.toLowerCase();
            const docRef = doc(db, "users", userEmail, "purchased_courses", id);
            
            await setDoc(docRef, {
                courseId: id,
                courseTitle: course.title,
                purchasedAt: new Date().toISOString(),
                price: course.price || "Miễn phí",
                status: 'active',
                progress: 0 
            }, { merge: true });

            setCourseProgress(0);
            console.log("Course activated successfully for:", userEmail);
        } catch (error) {
            console.error("Lỗi lưu database:", error);
        }
    }

    setTimeout(() => {
        localStorage.setItem(`course_unlocked_${id}`, 'true');
        setIsOwned(true);
        setIsActivating(false);
        setShowPaymentModal(false);
        setShowSuccessNotification(true);
        window.scrollTo({ top: 0, behavior: 'smooth' });
        setTimeout(() => setShowSuccessNotification(false), 5000);
    }, 500);
  };

  const handleRegisterClick = async () => {
    if (!currentUser) {
        navigate('/account', { 
            state: { 
                message: "Vui lòng đăng nhập tài khoản để đăng ký khóa học này.", 
                from: location.pathname 
            } 
        });
        return;
    }
    
    setIsActivating(true);
    const isFree = !course?.price || course.price.toLowerCase().includes('miễn phí') || course.price === '0' || course.price === '0đ' || isVip;

    if (!isFree) {
        setShowPaymentModal(true);
        setIsActivating(false);
        return;
    }

    // Nếu miễn phí hoặc VIP, kích hoạt tức thì.
    handlePaymentSuccess();
  };

  useEffect(() => {
     if (isOwned && curriculum.length > 0 && !playingLesson) {
          let targetLesson = 0;
          for (let lIdx = 0; lIdx < curriculum.length; lIdx++) {
             if (!completedLessons.includes(`${lIdx}`) && !completedLessons.includes(`0-${lIdx}`)) {
                 targetLesson = lIdx;
                 break;
             }
          }
          const target = curriculum[targetLesson] || curriculum[0];
          setPlayingLesson({
             lessonIdx: targetLesson,
             title: target.title,
             videoUrl: target.videoUrl
          });
     }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOwned, curriculum, completedLessons.length]);

  const handleUpdateProgress = async (lessonKey: string) => {
      if (!currentUser || !id) return;
      
      try {
          const userEmail = currentUser.email.toLowerCase();
          const docRef = doc(db, "users", userEmail, "purchased_courses", id);
          
          const docSnap = await getDoc(docRef);
          let completedList: string[] = [];
          if (docSnap.exists()) {
              completedList = docSnap.data().completedLessons || [];
          }
          
          if (!completedList.includes(lessonKey)) {
              completedList.push(lessonKey);
              
              const totalLessons = curriculum.length;
              const newProgress = totalLessons > 0 ? Math.min(Math.round((completedList.length / totalLessons) * 100), 100) : 100;
              
              await setDoc(docRef, { 
                  progress: newProgress,
                  completedLessons: completedList
              }, { merge: true });
              
              setCourseProgress(newProgress);
              setCompletedLessons(completedList);
          }
      } catch (error) {
          console.error("Lỗi cập nhật tiến độ:", error);
      }
  };

  const benefits = [
    "Tài liệu hướng dẫn thực hành chuyên sâu",
    "Hỗ trợ tư vấn trực tiếp từ chuyên gia",
    "Cập nhật kiến thức pháp luật mới nhất",
    "Tham gia cộng đồng học viên FAST"
  ];

  if (!course) return (
    <div className="min-h-screen flex flex-col items-center justify-center animate-fade-in">
      <h2 className="text-2xl font-bold text-gray-400">Khóa học không tồn tại</h2>
      {embeddedCourseId ? null : <Link to="/khoa-hoc" className="mt-4 text-primary font-bold hover:underline">Quay lại danh sách</Link>}
    </div>
  );

  const learningContent = (
    <div className="space-y-12 animate-fade-in">
        {/* 1. CONTENT VIEWER SECTION */}
        <section className={`transition-all duration-1000 delay-200 transform ${isLoaded ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0'}`}>
            <div className="flex items-center justify-between mb-8">
                <h2 className="text-2xl font-black text-gray-800 uppercase tracking-tight flex items-center gap-3">
                    <span className="w-1.5 h-8 bg-primary rounded-full shrink-0"></span>
                    Nội dung bài học
                </h2>
            </div>

            {/* GIAO DIỆN MẶC ĐỊNH (VIDEO PLAYER HOẶC LOCKED STATE) */}
            <div id="video-player-section" className={`rounded-[40px] overflow-hidden shadow-2xl border-8 border-white bg-black relative group hover:shadow-primary/20 transition-all duration-500 ${id === 'basic-principles' ? 'aspect-auto min-h-[500px] h-[70vh] bg-gray-50 overflow-y-auto' : 'aspect-video'}`}>
                {isOwned ? (
                    id === 'basic-principles' ? (
                        <div className="h-full w-full bg-white relative">
                            <iframe 
                                src="https://dl.dropboxusercontent.com/scl/fi/9h8ydfiuhtfbrceoovbf4/5-ch-a-kh-a-WHO.pdf?rlkey=zbhjh9375ihr6sxs693o3xw67&st=z99hnxy2#toolbar=0" 
                                width="100%"
                                height="600px"
                                className="w-full h-full min-h-[600px] border-0"
                                title="5 Chìa Khóa WHO"
                                onContextMenu={(e) => e.preventDefault()}
                                sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
                            />
                        </div>
                    ) : (() => {
                            const currentUrl = playingLesson?.videoUrl || (curriculum[0] && curriculum[0].videoUrl) || "https://www.w3schools.com/html/mov_bbb.mp4";
                            if (currentUrl.includes('dropbox') || currentUrl.includes('dropboxusercontent')) {
                                let embedUrl = currentUrl;
                                if (currentUrl.includes('www.dropbox.com')) {
                                    embedUrl = currentUrl.replace('www.dropbox.com', 'dl.dropboxusercontent.com');
                                }
                                if (!embedUrl.includes('#toolbar=0')) {
                                    embedUrl += (embedUrl.includes('?') ? '&' : '?') + 'raw=1#toolbar=0';
                                }
                                return (
                                    <div className="relative w-full h-full min-h-[600px]">
                                        <iframe 
                                            src={embedUrl} 
                                            width="100%" 
                                            height="600px" 
                                            className="w-full h-full min-h-[600px] border-0"
                                            title={playingLesson ? playingLesson.title : "Video bài học"}
                                            allowFullScreen
                                            sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
                                        />
                                        {curriculum.length > 0 && (
                                            <div className="absolute top-4 left-4 right-4 flex justify-between items-start pointer-events-none">
                                                <div className="bg-black/60 backdrop-blur-md px-4 py-2 rounded-xl text-white">
                                                    <p className="text-xs font-bold text-gray-400 mb-0.5 line-clamp-1">Bài {playingLesson ? playingLesson.lessonIdx + 1 : 1} / {curriculum.length}</p>
                                                    <p className="font-black line-clamp-1">{playingLesson ? playingLesson.title : curriculum[0]?.title}</p>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                );
                            }
                            return (
                                <div className="relative h-full w-full bg-black">
                                    <video 
                                        key={currentUrl}
                                        src={currentUrl} 
                                        className="w-full h-full object-contain focus:outline-none"
                                        controls
                                        controlsList="nodownload pwa-nodownload"
                                        onContextMenu={(e) => e.preventDefault()}
                                        autoPlay={!!playingLesson}
                                        poster={course.image}
                                        onEnded={() => {
                                            const currentIdx = playingLesson ? playingLesson.lessonIdx : 0;
                                            handleUpdateProgress(`${currentIdx}`);
                                            if (currentIdx + 1 < curriculum.length) {
                                                const next = curriculum[currentIdx + 1];
                                                setPlayingLesson({
                                                    lessonIdx: currentIdx + 1,
                                                    title: next.title,
                                                    videoUrl: next.videoUrl
                                                });
                                            }
                                        }}
                                    />
                                    {curriculum.length > 0 && (
                                        <div className="absolute top-4 left-4 right-4 flex justify-between items-start pointer-events-none">
                                            <div className="bg-black/60 backdrop-blur-md px-4 py-2 rounded-xl text-white">
                                                <p className="text-xs font-bold text-gray-400 mb-0.5 line-clamp-1">Bài {playingLesson ? playingLesson.lessonIdx + 1 : 1} / {curriculum.length}</p>
                                                <p className="font-black line-clamp-1">{playingLesson ? playingLesson.title : curriculum[0]?.title}</p>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            );
                        })()
                ) : (
                    <div className="relative h-full w-full">
                        <video 
                            src={curriculum[0]?.videoUrl || "https://www.w3schools.com/html/mov_bbb.mp4"} 
                            className="w-full h-full object-cover focus:outline-none"
                            controls
                            controlsList="nodownload pwa-nodownload"
                            onContextMenu={(e) => e.preventDefault()}
                            poster={course.image}
                        />
                        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 to-transparent p-6 pt-20 flex flex-col items-center text-center pointer-events-none">
                            <h3 className="text-white text-xl font-black uppercase tracking-widest mb-2">Video Giới Thiệu</h3>
                            <p className="text-gray-300 font-bold max-w-md mx-auto text-sm mb-4">
                                Vui lòng đăng ký tham gia khóa học để xem đầy đủ video và tài liệu.
                            </p>
                            <button onClick={(e) => { e.preventDefault(); handleRegisterClick(); }} className="bg-primary text-white px-8 py-3 rounded-xl font-black uppercase tracking-widest text-sm shadow-2xl shadow-primary/40 hover:scale-105 hover:bg-[#00605b] transition-all duration-300 pointer-events-auto">{isVip ? 'NHẬN KHÓA HỌC MIỄN PHÍ' : 'ĐĂNG KÝ MỞ KHÓA NGAY'}</button>
                        </div>
                    </div>
                )}
            </div>
        </section>

        {/* 3. CURRICULUM SECTION */}
        <section className={`transition-all duration-1000 delay-300 transform ${isLoaded ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0'}`}>
            <div className="flex items-center justify-between mb-8">
                <h2 className="text-2xl font-black text-gray-800 uppercase tracking-tight flex items-center gap-3">
                    <span className="w-1.5 h-8 bg-primary rounded-full shrink-0"></span>
                    Danh sách bài giảng
                </h2>
                <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">{curriculum.length} Bài giảng</span>
            </div>

            {isOwned && courseProgress >= 100 && (
                <div className="mb-8 p-6 bg-green-50 rounded-2xl border border-green-100 flex items-center justify-between">
                    <p className="text-sm font-black text-green-700 uppercase flex items-center gap-2">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg> 
                        Tuyệt vời! Bạn đã hoàn thành toàn bộ khóa học.
                    </p>
                </div>
            )}
            
            {isAdmin && (
                <div className="mb-6 flex justify-end">
                    {isEditingCurriculum ? (
                        <div className="flex gap-2">
                            <button onClick={handleSaveCurriculum} className="bg-green-500 text-white px-4 py-2 rounded-lg font-bold text-sm shadow-md hover:bg-green-600">Lưu danh sách</button>
                            <button onClick={() => setIsEditingCurriculum(false)} className="bg-gray-500 text-white px-4 py-2 rounded-lg font-bold text-sm shadow-md hover:bg-gray-600">Hủy</button>
                        </div>
                    ) : (
                        <button onClick={() => { setEditData(JSON.parse(JSON.stringify(curriculum))); setIsEditingCurriculum(true); }} className="bg-blue-500 text-white px-4 py-2 rounded-lg font-bold text-sm shadow-md hover:bg-blue-600">Chỉnh sửa bài giảng</button>
                    )}
                </div>
            )}

            {isEditingCurriculum ? (
                <div className="space-y-4 bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
                    <div className="flex justify-between items-center mb-4 border-b border-gray-100 pb-3">
                        <h3 className="font-bold text-gray-800 text-lg">Quản lý bài giảng</h3>
                        <button 
                            onClick={() => setEditData([...editData, { title: "Bài giảng mới", videoUrl: "" }])}
                            className="bg-primary text-white px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-[#00605b] transition-colors flex items-center gap-1"
                        >
                            + Thêm bài giảng
                        </button>
                    </div>
                    {editData.map((lesson, lIdx) => (
                        <div key={lIdx} className="flex flex-col md:flex-row gap-3 bg-gray-50 p-4 rounded-xl border border-gray-200 items-start md:items-center">
                            <span className="w-7 h-7 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center shrink-0">{lIdx + 1}</span>
                            <input 
                                type="text" 
                                value={lesson.title} 
                                onChange={(e) => {
                                    const newData = [...editData];
                                    newData[lIdx].title = e.target.value;
                                    setEditData(newData);
                                }}
                                className="font-bold text-sm bg-white border border-gray-200 focus:border-primary rounded-lg p-2 outline-none flex-1 w-full"
                                placeholder="Tên bài giảng"
                            />
                            <input 
                                type="text" 
                                value={lesson.videoUrl || ''} 
                                onChange={(e) => {
                                    const newData = [...editData];
                                    newData[lIdx].videoUrl = e.target.value;
                                    setEditData(newData);
                                }}
                                className="text-xs text-gray-600 bg-white border border-gray-200 focus:border-primary rounded-lg p-2 outline-none flex-1 w-full"
                                placeholder="URL Video (VD: https://...mp4)"
                            />
                            <button 
                                onClick={() => {
                                    const newData = [...editData];
                                    newData.splice(lIdx, 1);
                                    setEditData(newData);
                                }} 
                                className="text-red-500 hover:text-red-700 text-xs font-bold shrink-0 bg-red-50 px-3 py-2 rounded-lg transition-colors"
                            >
                                Xóa
                            </button>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden p-4 md:p-6 space-y-2">
                    {curriculum.map((lesson, lIdx) => {
                        const isCompleted = completedLessons.includes(`${lIdx}`) || completedLessons.includes(`0-${lIdx}`);
                        const isCurrentPlaying = playingLesson?.lessonIdx === lIdx;

                        return (
                            <div 
                                key={lIdx} 
                                onClick={() => {
                                    if (isOwned) {
                                        setPlayingLesson({ lessonIdx: lIdx, title: lesson.title, videoUrl: lesson.videoUrl });
                                        setIsLiked(false);
                                        document.getElementById("video-player-section")?.scrollIntoView({ behavior: "smooth", block: "center" });
                                    } else {
                                        handleRegisterClick();
                                    }
                                }}
                                className={`flex items-center justify-between p-4 rounded-xl group cursor-pointer border transition-all duration-200 ${
                                    isCurrentPlaying 
                                        ? 'bg-primary/10 border-primary shadow-sm' 
                                        : 'bg-gray-50/50 hover:bg-primary/5 border-gray-100 hover:border-primary/20'
                                }`}
                            >
                                <div className="flex items-center gap-4">
                                    <span className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-black shrink-0 ${
                                        isCurrentPlaying 
                                            ? 'bg-primary text-white scale-105 shadow' 
                                            : 'bg-white text-gray-500 border border-gray-200'
                                    }`}>
                                        {lIdx + 1}
                                    </span>
                                    <div className="flex items-center gap-3">
                                        {isCompleted ? (
                                            <svg className="w-5 h-5 text-green-500 shrink-0" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM13.707 9.293a1 1 0 00-1.414-1.414L9 11.172 7.707 9.879a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" /></svg>
                                        ) : (
                                            <svg className={`w-5 h-5 shrink-0 ${isCurrentPlaying ? 'text-primary' : 'text-gray-400 group-hover:text-primary'}`} fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" /></svg>
                                        )}
                                        <span className={`font-bold text-sm md:text-base ${isCurrentPlaying ? 'text-primary font-black' : isCompleted ? 'text-gray-900' : 'text-gray-700 group-hover:text-primary'}`}>
                                            {lesson.title}
                                        </span>
                                    </div>
                                </div>
                                <span className={`text-[11px] font-extrabold uppercase px-3 py-1 rounded-full ${
                                    isCurrentPlaying ? 'bg-primary text-white' : 'bg-white text-gray-400 group-hover:text-primary border border-gray-200'
                                }`}>
                                    {isOwned ? (isCompleted ? 'Học lại' : isCurrentPlaying ? 'Đang xem' : 'Học ngay') : 'Xem trước'}
                                </span>
                            </div>
                        );
                    })}
                </div>
            )}
        </section>
    </div>
  );

  if (embeddedCourseId) {
      return (
          <div className="animate-in slide-in-from-bottom-5 duration-700">
              <div className="flex items-center justify-between mb-8">
                  <h3 className="text-2xl font-black text-gray-800 tracking-tight flex items-center gap-3 uppercase">
                      <span className="w-2 h-8 bg-[#007c76] rounded-full shrink-0"></span>
                      {course.title}
                  </h3>
                  <Link to="/account" state={{ tab: 'my-courses' }} className="flex items-center gap-2 text-sm font-bold text-gray-500 hover:text-primary transition-colors bg-white px-4 py-2 rounded-xl shadow-sm border border-gray-100">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
                      Quay lại
                  </Link>
              </div>
              {learningContent}
          </div>
      );
  }

  return (
    <main className="min-h-screen bg-background pb-20 relative">
      {/* CSS Block to prevent Printing and Selection */}
      <style>{`
        @media print {
            body * {
                visibility: hidden;
            }
            .no-print-overlay {
                visibility: visible;
                position: absolute;
                top: 0;
                left: 0;
                width: 100%;
                height: 100vh;
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 24px;
                font-weight: bold;
                color: black;
                background: white;
            }
            .no-print-overlay::after {
                content: "Tài liệu này được bảo vệ bản quyền. Không được phép in ấn.";
            }
        }
        .protected-content {
            -webkit-user-select: none;
            -moz-user-select: none;
            -ms-user-select: none;
            user-select: none;
        }
      `}</style>

      {/* Hidden div for Print Message */}
      <div className="no-print-overlay hidden"></div>

      {isActivating && (
          <div className="fixed inset-0 z-[200] bg-white/90 backdrop-blur-sm flex flex-col items-center justify-center animate-fade-in">
              <div className="w-16 h-16 border-4 border-[#007c76] border-t-transparent rounded-full animate-spin mb-6"></div>
              <h3 className="text-xl font-black text-[#007c76] uppercase tracking-wider animate-pulse">Đang kích hoạt khóa học...</h3>
          </div>
      )}

      {showSuccessNotification && (
          <div className="fixed top-20 left-0 right-0 z-[150] bg-green-500 text-white shadow-2xl animate-[slideDown_0.5s_ease-out]">
              <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
                  <p className="font-black uppercase text-sm md:text-lg tracking-wide flex items-center gap-2">
                    <svg className="w-6 h-6 animate-bounce" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" /></svg>
                    Đã mở khóa thành công!
                  </p>
                  <button onClick={() => setShowSuccessNotification(false)} className="text-white/80 hover:text-white p-2">
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                  </button>
              </div>
          </div>
      )}



      <div className="relative bg-gray-900 text-white pt-12 pb-20 md:pt-20 md:pb-32 overflow-hidden group">
         <div className="absolute inset-0 opacity-20 transform group-hover:scale-105 transition-transform duration-[3s]">
            <img src={course.image} alt="Background" className="w-full h-full object-cover blur-sm" loading="eager" />
         </div>
         <div className="absolute inset-0 bg-gradient-to-t from-gray-900 via-gray-900/80 to-transparent"></div>
         <div className={`max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 transition-all duration-1000 transform ${isLoaded ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0'}`}>
            <nav className="flex items-center gap-2 text-sm font-bold text-gray-400 mb-6 uppercase tracking-widest">
              <Link to="/khoa-hoc" className="hover:text-primary transition-colors">Khóa học</Link>
              <span>/</span>
              <span className="text-primary">{course.category}</span>
            </nav>
            <div className="max-w-4xl space-y-6">
              <h1 className="text-3xl md:text-5xl lg:text-6xl font-black uppercase tracking-tight leading-tight">{course.title}</h1>
              <p className="text-lg md:text-xl text-gray-300 font-medium leading-relaxed">{course.description || "Nắm vững các tiêu chuẩn và quy trình vận hành chuyên nghiệp."}</p>
            </div>
         </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-12 relative z-20 pb-20">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            <div className="lg:col-span-8 space-y-12">
                
                {learningContent}

                <section className={`bg-white rounded-[32px] p-8 md:p-10 shadow-xl border border-gray-100 transition-all duration-1000 delay-400 transform ${isLoaded ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0'}`}>
                    <h2 className="text-2xl font-black text-gray-800 mb-8 uppercase tracking-tight flex items-center gap-3"><span className="w-1.5 h-8 bg-primary rounded-full shrink-0"></span>Bạn sẽ học được gì?</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {benefits.map((benefit, i) => (<div key={i} className="flex items-start gap-3 group"><svg className="w-5 h-5 text-green-500 mt-1 shrink-0 group-hover:scale-125 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" /></svg><span className="text-gray-600 font-medium leading-tight group-hover:text-gray-900 transition-colors">{benefit}</span></div>))}
                    </div>
                </section>
            </div>
            <div className="lg:col-span-4">
                <div className={`sticky top-28 bg-white p-8 rounded-[40px] shadow-2xl border border-gray-100 text-center space-y-8 transition-all duration-1000 delay-500 transform ${isLoaded ? 'translate-x-0 opacity-100' : 'translate-x-10 opacity-0'}`}>
                    <div className="space-y-4">
                        <div className="relative aspect-video rounded-2xl overflow-hidden shadow-lg mb-4 group"><img src={course.image} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" alt="Thumbnail" /><div className="absolute inset-0 bg-black/20 group-hover:bg-black/10 transition-colors"></div></div>
                        {isOwned ? (
                             <div className="p-4 bg-green-50 rounded-2xl border border-green-100 animate-pulse"><p className="text-green-600 font-black uppercase tracking-widest text-sm mb-1">Đã sở hữu</p><p className="text-gray-500 text-xs font-bold">Khóa học này đã sẵn sàng để học.</p></div>
                        ) : (<div className="space-y-2"><p className="text-4xl font-black text-primary tracking-tighter">Miễn phí</p></div>)}
                    </div>
                    <div className="space-y-4 pt-4 border-t border-gray-100 text-left">
                        <h4 className="font-black text-gray-800 uppercase tracking-widest text-xs">Khóa học này bao gồm:</h4>
                        <ul className="space-y-3">
                            {[{ icon: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z', text: 'Tài liệu PDF chuyên sâu' }, { icon: 'M13 10V3L4 14h7v7l9-11h-7z', text: 'Truy cập trọn đời' }].map((feat, idx) => (<li key={idx} className="flex items-center gap-3 text-sm text-gray-600 font-bold group"><svg className="w-5 h-5 text-primary shrink-0 group-hover:scale-110 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d={feat.icon} /></svg>{feat.text}</li>))}
                        </ul>
                    </div>
                    {isOwned ? (
                        <div className="space-y-3">
                            <button onClick={() => {
                                if (curriculum.length > 0 && curriculum[0].lessons.length > 0) {
                                    setPlayingLesson({
                                        chapterIdx: 0,
                                        lessonIdx: 0,
                                        title: curriculum[0].lessons[0].title,
                                        videoUrl: curriculum[0].lessons[0].videoUrl
                                    });
                                }
                                document.getElementById("video-player-section")?.scrollIntoView({ behavior: "smooth", block: "center" });
                            }} className="w-full bg-[#007c76] text-white py-5 rounded-2xl font-black text-lg uppercase tracking-widest hover:scale-[1.02] transition-all shadow-xl shadow-primary/30">VÀO HỌC NGAY</button>
                        </div>
                    ) : (<div className="space-y-4"><button onClick={handleRegisterClick} className="w-full bg-[#a50064] text-white py-5 rounded-2xl font-black text-lg uppercase tracking-widest hover:scale-[1.02] transition-all shadow-xl shadow-[#a50064]/20 hover:bg-[#c40076]">{isVip ? 'NHẬN KHÓA HỌC' : 'ĐĂNG KÝ HỌC NGAY'}</button><p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">{isVip ? 'Nhận miễn phí với đặc quyền VIP' : 'Truy cập học tập tức thì'}</p></div>)}
                </div>
            </div>
        </div>
      </div>


      {course && (
          <PaymentModal
              course={course}
              isOpen={showPaymentModal}
              onClose={() => setShowPaymentModal(false)}
              onSuccess={handlePaymentSuccess}
          />
      )}
    </main>
  );
};

export default CourseDetail;
