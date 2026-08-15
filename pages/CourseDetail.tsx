
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
    { title: "Quản lý rủi ro và cơ hội", videoUrl: "https://www.w3schools.com/html/mov_bbb.mp4" }
];

const extractLessonsFlat = (raw: any): Array<{ title: string; videoUrl: string }> => {
  if (!raw || !Array.isArray(raw)) return DUMMY_LESSONS;
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

  if (result.length === 0) return DUMMY_LESSONS;

  const final4 = [...result];
  let idx = 0;
  while (final4.length < 4) {
    final4.push(DUMMY_LESSONS[idx % DUMMY_LESSONS.length]);
    idx++;
  }
  return final4.slice(0, 4);
};

// Helper to detect and extract video embed URL for YouTube, Dropbox, Drive, Vimeo, and native video
export function getVideoEmbedInfo(url: string, autoPlay: boolean = false): { isEmbed: boolean; embedUrl: string } {
  if (!url) {
    return { isEmbed: false, embedUrl: "https://www.w3schools.com/html/mov_bbb.mp4" };
  }
  const cleanUrl = url.trim();

  // 1. YouTube check (watch, embed, shorts, youtu.be, m.youtube)
  const ytMatch = cleanUrl.match(/(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?|shorts)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/i);
  if (ytMatch && ytMatch[1]) {
    const videoId = ytMatch[1];
    const apParam = autoPlay ? '1' : '0';
    return {
      isEmbed: true,
      embedUrl: `https://www.youtube.com/embed/${videoId}?autoplay=${apParam}&rel=0&enablejsapi=1`
    };
  }

  // 2. Dropbox check
  if (cleanUrl.includes('dropbox.com') || cleanUrl.includes('dropboxusercontent.com')) {
    let embedUrl = cleanUrl.replace('www.dropbox.com', 'dl.dropboxusercontent.com');
    if (!embedUrl.includes('#toolbar=0')) {
      embedUrl += (embedUrl.includes('?') ? '&' : '?') + 'raw=1#toolbar=0';
    }
    return { isEmbed: true, embedUrl };
  }

  // 3. Google Drive check
  const driveMatch = cleanUrl.match(/drive\.google\.com\/file\/d\/([a-zA-Z0-9_-]+)/i);
  if (driveMatch && driveMatch[1]) {
    return {
      isEmbed: true,
      embedUrl: `https://drive.google.com/file/d/${driveMatch[1]}/preview`
    };
  }

  // 4. Vimeo check
  const vimeoMatch = cleanUrl.match(/vimeo\.com\/(?:video\/)?([0-9]+)/i);
  if (vimeoMatch && vimeoMatch[1]) {
    const apParam = autoPlay ? '1' : '0';
    return {
      isEmbed: true,
      embedUrl: `https://player.vimeo.com/video/${vimeoMatch[1]}?autoplay=${apParam}`
    };
  }

  // 5. Default native HTML5 video (.mp4, .webm, etc.)
  return { isEmbed: false, embedUrl: cleanUrl };
}

const CourseDetail: React.FC<{ embeddedCourseId?: string }> = ({ embeddedCourseId }) => {
  const { id: paramId } = useParams<{ id: string }>();
  const id = embeddedCourseId || paramId;
  const navigate = useNavigate();
  const location = useLocation();
  const [course, setCourse] = useState<Course | undefined>(() => getMergedCourses([]).find(c => c.id === id));
  
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

            // DB Real-time Check
            if (id) {
                const docRef = doc(db, "users", normalizedEmail, "purchased_courses", id);
                const unsubPurchased = onSnapshot(docRef, (docSnap) => {
                    if (docSnap.exists()) {
                        setIsOwned(true);
                        setCourseProgress(docSnap.data().progress || 0);
                        setCompletedLessons(docSnap.data().completedLessons || []);
                        localStorage.setItem(`course_unlocked_${id}`, 'true');
                    }
                }, (error) => {
                    console.error("Lỗi kiểm tra khóa học realtime:", error);
                });
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

    localStorage.setItem(`course_unlocked_${id}`, 'true');
    setIsOwned(true);
    setIsActivating(false);
    setShowPaymentModal(false);
    setShowSuccessNotification(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
    setTimeout(() => setShowSuccessNotification(false), 5000);
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

  const currentIdx = playingLesson ? playingLesson.lessonIdx : 0;
  const currentLesson = curriculum[currentIdx] || curriculum[0];
  const isCurrentCompleted = completedLessons.includes(`${currentIdx}`) || completedLessons.includes(`0-${currentIdx}`);

  const learningContent = (
    <div className="space-y-8 animate-fade-in">
        {/* VIDEO / CONTENT PLAYER SECTION */}
        <section className={`transition-all duration-1000 delay-200 transform ${isLoaded ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0'}`}>
            <div id="video-player-section" className={`rounded-[32px] overflow-hidden shadow-2xl border-4 border-white bg-black relative group hover:shadow-primary/20 transition-all duration-500 ${id === 'basic-principles' ? 'aspect-auto min-h-[500px] h-[70vh] bg-gray-50 overflow-y-auto' : 'aspect-video'}`}>
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
                            const embedInfo = getVideoEmbedInfo(currentUrl, !!playingLesson);

                            if (embedInfo.isEmbed) {
                                return (
                                    <div className="relative w-full h-full min-h-[400px] md:min-h-[500px] bg-black">
                                        <iframe 
                                            key={embedInfo.embedUrl}
                                            src={embedInfo.embedUrl} 
                                            width="100%" 
                                            height="100%" 
                                            className="w-full h-full min-h-[400px] md:min-h-[500px] border-0"
                                            title={playingLesson ? playingLesson.title : "Video bài học"}
                                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                                            allowFullScreen
                                        />
                                    </div>
                                );
                            }

                            return (
                                <div className="relative h-full w-full bg-black">
                                    <video 
                                        key={currentUrl}
                                        src={embedInfo.embedUrl} 
                                        className="w-full h-full object-contain focus:outline-none"
                                        controls
                                        controlsList="nodownload pwa-nodownload"
                                        onContextMenu={(e) => e.preventDefault()}
                                        autoPlay={!!playingLesson}
                                        poster={course.image}
                                        onEnded={() => {
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
                                </div>
                            );
                        })()
                ) : (() => {
                    const previewUrl = curriculum[0]?.videoUrl || "https://www.w3schools.com/html/mov_bbb.mp4";
                    const previewEmbed = getVideoEmbedInfo(previewUrl, false);

                    if (previewEmbed.isEmbed) {
                        return (
                            <div className="relative w-full h-full min-h-[400px] md:min-h-[500px] bg-black">
                                <iframe 
                                    src={previewEmbed.embedUrl} 
                                    width="100%" 
                                    height="100%" 
                                    className="w-full h-full min-h-[400px] md:min-h-[500px] border-0"
                                    title="Video Giới Thiệu"
                                    allow="accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                    allowFullScreen
                                />
                                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/95 via-black/60 to-transparent p-6 pt-16 flex flex-col items-center text-center pointer-events-none">
                                    <h3 className="text-white text-xl font-black uppercase tracking-widest mb-2">Video Giới Thiệu</h3>
                                    <p className="text-gray-300 font-bold max-w-md mx-auto text-sm mb-4">
                                        Vui lòng đăng ký tham gia khóa học để xem đầy đủ video và tài liệu.
                                    </p>
                                    <button onClick={(e) => { e.preventDefault(); handleRegisterClick(); }} className="bg-primary text-white px-8 py-3 rounded-xl font-black uppercase tracking-widest text-sm shadow-2xl shadow-primary/40 hover:scale-105 hover:bg-[#00605b] transition-all duration-300 pointer-events-auto">
                                        {isVip ? 'NHẬN KHÓA HỌC MIỄN PHÍ' : 'ĐĂNG KÝ MỞ KHÓA NGAY'}
                                    </button>
                                </div>
                            </div>
                        );
                    }

                    return (
                        <div className="relative h-full w-full">
                            <video 
                                src={previewEmbed.embedUrl} 
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
                    );
                })()}
            </div>

            {/* LESSON CONTROL BAR (WHEN LEARNING) */}
            {isOwned && (
                <div className="mt-4 bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div>
                        <span className="text-xs font-bold text-primary uppercase tracking-wider block mb-1">
                            Bài {currentIdx + 1} / {curriculum.length}
                        </span>
                        <h3 className="text-lg font-black text-gray-800 line-clamp-1">
                            {currentLesson ? currentLesson.title : 'Bài giảng'}
                        </h3>
                    </div>

                    <div className="flex items-center gap-2 flex-wrap w-full sm:w-auto justify-end shrink-0">
                        <button
                            disabled={currentIdx === 0}
                            onClick={() => {
                                if (currentIdx > 0) {
                                    const prev = curriculum[currentIdx - 1];
                                    setPlayingLesson({ lessonIdx: currentIdx - 1, title: prev.title, videoUrl: prev.videoUrl });
                                    setIsLiked(false);
                                }
                            }}
                            className="px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all bg-gray-100 hover:bg-gray-200 text-gray-700 disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" /></svg>
                            Bài trước
                        </button>

                        <button
                            onClick={() => handleUpdateProgress(`${currentIdx}`)}
                            className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all ${
                                isCurrentCompleted 
                                    ? 'bg-green-100 text-green-700 border border-green-200' 
                                    : 'bg-primary text-white hover:bg-[#00605b] shadow-md shadow-primary/20'
                            }`}
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" /></svg>
                            {isCurrentCompleted ? 'Đã hoàn thành' : 'Đánh dấu hoàn thành'}
                        </button>

                        <button
                            disabled={currentIdx >= curriculum.length - 1}
                            onClick={() => {
                                if (currentIdx < curriculum.length - 1) {
                                    const next = curriculum[currentIdx + 1];
                                    setPlayingLesson({ lessonIdx: currentIdx + 1, title: next.title, videoUrl: next.videoUrl });
                                    setIsLiked(false);
                                }
                            }}
                            className="px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all bg-primary/10 hover:bg-primary/20 text-primary disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                            Bài tiếp
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" /></svg>
                        </button>

                        <button
                            onClick={() => setIsLiked(!isLiked)}
                            className={`p-2 rounded-xl border transition-all ${
                                isLiked ? 'bg-red-50 text-red-500 border-red-200' : 'bg-gray-50 text-gray-400 border-gray-200 hover:text-red-500'
                            }`}
                            title="Thích bài học"
                        >
                            <svg className={`w-5 h-5 ${isLiked ? 'fill-current text-red-500' : 'fill-none'}`} stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" /></svg>
                        </button>
                    </div>
                </div>
            )}
        </section>

        {/* CURRICULUM PREVIEW SECTION (WHEN NOT OWNED) */}
        {!isOwned && (
            <section className={`transition-all duration-1000 delay-300 transform ${isLoaded ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0'}`}>
                <div className="flex items-center justify-between mb-6">
                    <h2 className="text-2xl font-black text-gray-800 uppercase tracking-tight flex items-center gap-3">
                        <span className="w-1.5 h-8 bg-primary rounded-full shrink-0"></span>
                        Danh sách bài giảng
                    </h2>
                    <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">{curriculum.length} Bài giảng</span>
                </div>

                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden p-4 md:p-6 space-y-2">
                    {curriculum.map((lesson, lIdx) => (
                        <div 
                            key={lIdx} 
                            onClick={handleRegisterClick}
                            className="flex items-center justify-between p-4 rounded-xl group cursor-pointer border transition-all duration-200 bg-gray-50/50 hover:bg-primary/5 border-gray-100 hover:border-primary/20"
                        >
                            <div className="flex items-center gap-4">
                                <span className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-black shrink-0 bg-white text-gray-500 border border-gray-200">
                                    {lIdx + 1}
                                </span>
                                <div className="flex items-center gap-3">
                                    <svg className="w-5 h-5 text-gray-400 group-hover:text-primary shrink-0" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" /></svg>
                                    <span className="font-bold text-sm md:text-base text-gray-700 group-hover:text-primary">
                                        {lesson.title}
                                    </span>
                                </div>
                            </div>
                            <span className="text-[11px] font-extrabold uppercase px-3 py-1 rounded-full bg-white text-gray-400 group-hover:text-primary border border-gray-200">
                                Xem trước
                            </span>
                        </div>
                    ))}
                </div>
            </section>
        )}
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
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                  <div className="lg:col-span-8 space-y-8">
                      {learningContent}
                  </div>
                  <div className="lg:col-span-4">
                      {/* PLAYLIST SIDEBAR WHEN OWNED */}
                      {isOwned ? (
                          <div className="bg-white rounded-[32px] p-6 shadow-xl border border-gray-100 sticky top-28 space-y-6">
                              <div className="space-y-3 pb-4 border-b border-gray-100">
                                  <div className="flex items-center justify-between">
                                      <h3 className="font-black text-gray-800 uppercase tracking-tight text-base flex items-center gap-2">
                                          <span className="w-1.5 h-5 bg-primary rounded-full"></span>
                                          Danh sách bài học
                                      </h3>
                                      <span className="text-xs font-bold text-gray-400 bg-gray-100 px-2.5 py-1 rounded-full">{curriculum.length} bài</span>
                                  </div>

                                  {/* Progress Bar */}
                                  <div className="space-y-1.5">
                                      <div className="flex justify-between items-center text-xs font-bold text-gray-600">
                                          <span>Tiến độ học tập</span>
                                          <span className="text-primary font-black">{courseProgress}%</span>
                                      </div>
                                      <div className="w-full bg-gray-100 rounded-full h-2.5 overflow-hidden">
                                          <div 
                                              className="bg-primary h-full rounded-full transition-all duration-500" 
                                              style={{ width: `${courseProgress}%` }}
                                          />
                                      </div>
                                  </div>
                              </div>

                              {isAdmin && (
                                  <div className="flex justify-end">
                                      {isEditingCurriculum ? (
                                          <div className="flex gap-2">
                                              <button onClick={handleSaveCurriculum} className="bg-green-500 text-white px-3 py-1.5 rounded-lg font-bold text-xs shadow-md">Lưu</button>
                                              <button onClick={() => setIsEditingCurriculum(false)} className="bg-gray-500 text-white px-3 py-1.5 rounded-lg font-bold text-xs shadow-md">Hủy</button>
                                          </div>
                                      ) : (
                                          <button onClick={() => { setEditData(JSON.parse(JSON.stringify(curriculum))); setIsEditingCurriculum(true); }} className="bg-blue-500 text-white px-3 py-1.5 rounded-lg font-bold text-xs shadow-md">Sửa bài giảng</button>
                                      )}
                                  </div>
                              )}

                              {isEditingCurriculum ? (
                                  <div className="space-y-3 max-h-[400px] overflow-y-auto">
                                      <button 
                                          onClick={() => setEditData([...editData, { title: "Bài giảng mới", videoUrl: "" }])}
                                          className="w-full bg-primary text-white py-2 rounded-lg text-xs font-bold"
                                      >
                                          + Thêm bài giảng
                                      </button>
                                      {editData.map((lesson, lIdx) => (
                                          <div key={lIdx} className="space-y-2 bg-gray-50 p-3 rounded-xl border border-gray-200">
                                              <input 
                                                  type="text" 
                                                  value={lesson.title} 
                                                  onChange={(e) => {
                                                      const newData = [...editData];
                                                      newData[lIdx].title = e.target.value;
                                                      setEditData(newData);
                                                  }}
                                                  className="font-bold text-xs bg-white border border-gray-200 rounded p-1.5 w-full"
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
                                                  className="text-xs bg-white border border-gray-200 rounded p-1.5 w-full"
                                                  placeholder="URL Video"
                                              />
                                          </div>
                                      ))}
                                  </div>
                              ) : (
                                  <div className="space-y-2.5 max-h-[500px] overflow-y-auto pr-1">
                                      {curriculum.map((lesson, lIdx) => {
                                          const isCompleted = completedLessons.includes(`${lIdx}`) || completedLessons.includes(`0-${lIdx}`);
                                          const isCurrentPlaying = currentIdx === lIdx;

                                          return (
                                              <div
                                                  key={lIdx}
                                                  onClick={() => {
                                                      setPlayingLesson({ lessonIdx: lIdx, title: lesson.title, videoUrl: lesson.videoUrl });
                                                      setIsLiked(false);
                                                      document.getElementById("video-player-section")?.scrollIntoView({ behavior: "smooth", block: "center" });
                                                  }}
                                                  className={`p-3.5 rounded-2xl cursor-pointer border transition-all duration-200 flex items-center justify-between gap-3 ${
                                                      isCurrentPlaying
                                                          ? 'bg-primary/10 border-primary shadow-sm ring-2 ring-primary/20'
                                                          : 'bg-gray-50/60 hover:bg-primary/5 border-gray-100 hover:border-primary/20'
                                                  }`}
                                              >
                                                  <div className="flex items-center gap-3 min-w-0">
                                                      <span className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-black shrink-0 ${
                                                          isCurrentPlaying
                                                              ? 'bg-primary text-white shadow'
                                                              : 'bg-white text-gray-500 border border-gray-200'
                                                      }`}>
                                                          {lIdx + 1}
                                                      </span>
                                                      <div className="min-w-0">
                                                          <p className={`text-xs md:text-sm font-bold line-clamp-1 ${
                                                              isCurrentPlaying ? 'text-primary font-black' : 'text-gray-700'
                                                          }`}>
                                                              {lesson.title}
                                                          </p>
                                                          <p className="text-[10px] text-gray-400 font-medium">
                                                              {isCurrentPlaying ? '▶ Đang phát' : isCompleted ? '✓ Đã học' : 'Chưa học'}
                                                          </p>
                                                      </div>
                                                  </div>

                                                  <div className="shrink-0">
                                                      {isCompleted ? (
                                                          <svg className="w-5 h-5 text-green-500" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM13.707 9.293a1 1 0 00-1.414-1.414L9 11.172 7.707 9.879a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" /></svg>
                                                      ) : isCurrentPlaying ? (
                                                          <span className="w-2.5 h-2.5 bg-primary rounded-full animate-ping block"></span>
                                                      ) : (
                                                          <svg className="w-4 h-4 text-gray-300" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" /></svg>
                                                      )}
                                                  </div>
                                              </div>
                                          );
                                      })}
                                  </div>
                              )}
                          </div>
                      ) : (
                          <div className="sticky top-28 bg-white p-8 rounded-[40px] shadow-2xl border border-gray-100 text-center space-y-8">
                              <div className="space-y-4">
                                  <div className="relative aspect-video rounded-2xl overflow-hidden shadow-lg mb-4 group"><img src={course.image} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" alt="Thumbnail" /><div className="absolute inset-0 bg-black/20 group-hover:bg-black/10 transition-colors"></div></div>
                                  <div className="space-y-2"><p className="text-4xl font-black text-primary tracking-tighter">Miễn phí</p></div>
                              </div>
                              <div className="space-y-4 pt-4 border-t border-gray-100 text-left">
                                  <h4 className="font-black text-gray-800 uppercase tracking-widest text-xs">Khóa học này bao gồm:</h4>
                                  <ul className="space-y-3">
                                      {[{ icon: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z', text: 'Tài liệu PDF chuyên sâu' }, { icon: 'M13 10V3L4 14h7v7l9-11h-7z', text: 'Truy cập trọn đời' }].map((feat, idx) => (<li key={idx} className="flex items-center gap-3 text-sm text-gray-600 font-bold group"><svg className="w-5 h-5 text-primary shrink-0 group-hover:scale-110 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d={feat.icon} /></svg>{feat.text}</li>))}
                                  </ul>
                              </div>
                              <button onClick={handleRegisterClick} className="w-full bg-[#a50064] text-white py-5 rounded-2xl font-black text-lg uppercase tracking-widest hover:scale-[1.02] transition-all shadow-xl shadow-[#a50064]/20 hover:bg-[#c40076]">{isVip ? 'NHẬN KHÓA HỌC' : 'ĐĂNG KÝ HỌC NGAY'}</button>
                          </div>
                      )}
                  </div>
              </div>
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
                {isOwned ? (
                    /* PLAYLIST SIDEBAR WHEN OWNED */
                    <div className="bg-white rounded-[32px] p-6 shadow-xl border border-gray-100 sticky top-28 space-y-6">
                        <div className="space-y-3 pb-4 border-b border-gray-100">
                            <div className="flex items-center justify-between">
                                <h3 className="font-black text-gray-800 uppercase tracking-tight text-base flex items-center gap-2">
                                    <span className="w-1.5 h-5 bg-primary rounded-full"></span>
                                    Danh sách bài học
                                </h3>
                                <span className="text-xs font-bold text-gray-400 bg-gray-100 px-2.5 py-1 rounded-full">{curriculum.length} bài</span>
                            </div>

                            {/* Progress Bar */}
                            <div className="space-y-1.5">
                                <div className="flex justify-between items-center text-xs font-bold text-gray-600">
                                    <span>Tiến độ học tập</span>
                                    <span className="text-primary font-black">{courseProgress}%</span>
                                </div>
                                <div className="w-full bg-gray-100 rounded-full h-2.5 overflow-hidden">
                                    <div 
                                        className="bg-primary h-full rounded-full transition-all duration-500" 
                                        style={{ width: `${courseProgress}%` }}
                                    />
                                </div>
                            </div>
                        </div>

                        {isAdmin && (
                            <div className="flex justify-end">
                                {isEditingCurriculum ? (
                                    <div className="flex gap-2">
                                        <button onClick={handleSaveCurriculum} className="bg-green-500 text-white px-3 py-1.5 rounded-lg font-bold text-xs shadow-md">Lưu</button>
                                        <button onClick={() => setIsEditingCurriculum(false)} className="bg-gray-500 text-white px-3 py-1.5 rounded-lg font-bold text-xs shadow-md">Hủy</button>
                                    </div>
                                ) : (
                                    <button onClick={() => { setEditData(JSON.parse(JSON.stringify(curriculum))); setIsEditingCurriculum(true); }} className="bg-blue-500 text-white px-3 py-1.5 rounded-lg font-bold text-xs shadow-md">Sửa bài giảng</button>
                                )}
                            </div>
                        )}

                        {isEditingCurriculum ? (
                            <div className="space-y-3 max-h-[400px] overflow-y-auto">
                                <button 
                                    onClick={() => setEditData([...editData, { title: "Bài giảng mới", videoUrl: "" }])}
                                    className="w-full bg-primary text-white py-2 rounded-lg text-xs font-bold"
                                >
                                    + Thêm bài giảng
                                </button>
                                {editData.map((lesson, lIdx) => (
                                    <div key={lIdx} className="space-y-2 bg-gray-50 p-3 rounded-xl border border-gray-200">
                                        <input 
                                            type="text" 
                                            value={lesson.title} 
                                            onChange={(e) => {
                                                const newData = [...editData];
                                                newData[lIdx].title = e.target.value;
                                                setEditData(newData);
                                            }}
                                            className="font-bold text-xs bg-white border border-gray-200 rounded p-1.5 w-full"
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
                                            className="text-xs bg-white border border-gray-200 rounded p-1.5 w-full"
                                            placeholder="URL Video"
                                        />
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="space-y-2.5 max-h-[500px] overflow-y-auto pr-1">
                                {curriculum.map((lesson, lIdx) => {
                                    const isCompleted = completedLessons.includes(`${lIdx}`) || completedLessons.includes(`0-${lIdx}`);
                                    const isCurrentPlaying = currentIdx === lIdx;

                                    return (
                                        <div
                                            key={lIdx}
                                            onClick={() => {
                                                setPlayingLesson({ lessonIdx: lIdx, title: lesson.title, videoUrl: lesson.videoUrl });
                                                setIsLiked(false);
                                                document.getElementById("video-player-section")?.scrollIntoView({ behavior: "smooth", block: "center" });
                                            }}
                                            className={`p-3.5 rounded-2xl cursor-pointer border transition-all duration-200 flex items-center justify-between gap-3 ${
                                                isCurrentPlaying
                                                    ? 'bg-primary/10 border-primary shadow-sm ring-2 ring-primary/20'
                                                    : 'bg-gray-50/60 hover:bg-primary/5 border-gray-100 hover:border-primary/20'
                                            }`}
                                        >
                                            <div className="flex items-center gap-3 min-w-0">
                                                <span className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-black shrink-0 ${
                                                    isCurrentPlaying
                                                        ? 'bg-primary text-white shadow'
                                                        : 'bg-white text-gray-500 border border-gray-200'
                                                }`}>
                                                    {lIdx + 1}
                                                </span>
                                                <div className="min-w-0">
                                                    <p className={`text-xs md:text-sm font-bold line-clamp-1 ${
                                                        isCurrentPlaying ? 'text-primary font-black' : 'text-gray-700'
                                                    }`}>
                                                        {lesson.title}
                                                    </p>
                                                    <p className="text-[10px] text-gray-400 font-medium">
                                                        {isCurrentPlaying ? '▶ Đang phát' : isCompleted ? '✓ Đã học' : 'Chưa học'}
                                                    </p>
                                                </div>
                                            </div>

                                            <div className="shrink-0">
                                                {isCompleted ? (
                                                    <svg className="w-5 h-5 text-green-500" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM13.707 9.293a1 1 0 00-1.414-1.414L9 11.172 7.707 9.879a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" /></svg>
                                                ) : isCurrentPlaying ? (
                                                    <span className="w-2.5 h-2.5 bg-primary rounded-full animate-ping block"></span>
                                                ) : (
                                                    <svg className="w-4 h-4 text-gray-300" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" /></svg>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                ) : (
                    /* ENROLLMENT / PURCHASE CARD WHEN NOT OWNED */
                    <div className={`sticky top-28 bg-white p-8 rounded-[40px] shadow-2xl border border-gray-100 text-center space-y-8 transition-all duration-1000 delay-500 transform ${isLoaded ? 'translate-x-0 opacity-100' : 'translate-x-10 opacity-0'}`}>
                        <div className="space-y-4">
                            <div className="relative aspect-video rounded-2xl overflow-hidden shadow-lg mb-4 group"><img src={course.image} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" alt="Thumbnail" /><div className="absolute inset-0 bg-black/20 group-hover:bg-black/10 transition-colors"></div></div>
                            <div className="space-y-2"><p className="text-4xl font-black text-primary tracking-tighter">Miễn phí</p></div>
                        </div>
                        <div className="space-y-4 pt-4 border-t border-gray-100 text-left">
                            <h4 className="font-black text-gray-800 uppercase tracking-widest text-xs">Khóa học này bao gồm:</h4>
                            <ul className="space-y-3">
                                {[{ icon: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z', text: 'Tài liệu PDF chuyên sâu' }, { icon: 'M13 10V3L4 14h7v7l9-11h-7z', text: 'Truy cập trọn đời' }].map((feat, idx) => (<li key={idx} className="flex items-center gap-3 text-sm text-gray-600 font-bold group"><svg className="w-5 h-5 text-primary shrink-0 group-hover:scale-110 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d={feat.icon} /></svg>{feat.text}</li>))}
                            </ul>
                        </div>
                        <div className="space-y-4"><button onClick={handleRegisterClick} className="w-full bg-[#a50064] text-white py-5 rounded-2xl font-black text-lg uppercase tracking-widest hover:scale-[1.02] transition-all shadow-xl shadow-[#a50064]/20 hover:bg-[#c40076]">{isVip ? 'NHẬN KHÓA HỌC' : 'ĐĂNG KÝ HỌC NGAY'}</button><p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">{isVip ? 'Nhận miễn phí với đặc quyền VIP' : 'Truy cập học tập tức thì'}</p></div>
                    </div>
                )}
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
