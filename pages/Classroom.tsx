import React, { useEffect, useState, useMemo } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { COURSES, ADMIN_EMAILS, getMergedCourses, getVideoEmbedInfo, extractLessonsFlat, DEFAULT_LESSONS } from '../constants';
import { auth, db } from '../firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, setDoc, getDoc, onSnapshot } from 'firebase/firestore';
import { Course } from '../types';
import Handbook from './Handbook';

const Classroom: React.FC = () => {
  const { courseId } = useParams<{ courseId: string }>();
  const navigate = useNavigate();

  const [course, setCourse] = useState<Course | undefined>(undefined);
  const [curriculum, setCurriculum] = useState<Array<{ title: string; videoUrl: string }>>([]);
  const [currentUser, setCurrentUser] = useState<{ name: string; email: string } | null>(null);
  const [isOwned, setIsOwned] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [courseProgress, setCourseProgress] = useState(0);
  const [completedLessons, setCompletedLessons] = useState<string[]>([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [isLiked, setIsLiked] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'notes' | 'discussion'>('overview');
  const [userNote, setUserNote] = useState('');
  const [savedNotes, setSavedNotes] = useState<{ id: string; text: string; date: string }[]>([]);
  const [searchQuery, setSearchQuery] = useState('');

  // Load Course
  useEffect(() => {
    if (!courseId) return;

    let cachedDocData: any = null;

    const loadCourseData = (docData?: any) => {
      if (docData !== undefined) cachedDocData = docData;
      const fsList = cachedDocData ? [{ id: courseId, ...cachedDocData }] : [];
      const allMerged = getMergedCourses(fsList);
      const found = allMerged.find(c => c.id === courseId);

      if (found) {
        setCourse(found);
        const curr = cachedDocData?.curriculum || found.curriculum;
        const flatList = extractLessonsFlat(curr);
        setCurriculum(flatList.length > 0 ? flatList : DEFAULT_LESSONS);
      } else {
        setCourse({
          id: courseId,
          title: 'Khóa học Fast E-Learning',
          price: 'Miễn phí',
          image: 'https://images.unsplash.com/photo-1533777857889-4be7c70b33f7',
          category: 'Chung',
          description: 'Nội dung khóa học đào tạo chuyên sâu'
        });
        setCurriculum(DEFAULT_LESSONS);
      }
    };

    const docRef = doc(db, "courses", courseId);
    const unsubscribeSnapshot = onSnapshot(docRef, (docSnap) => {
      if (docSnap.exists()) {
        loadCourseData(docSnap.data());
      } else {
        loadCourseData();
      }
    }, () => loadCourseData());

    const handleCustomUpdate = () => loadCourseData();
    window.addEventListener('courses_updated', handleCustomUpdate);
    window.addEventListener('storage', handleCustomUpdate);

    return () => {
      unsubscribeSnapshot();
      window.removeEventListener('courses_updated', handleCustomUpdate);
      window.removeEventListener('storage', handleCustomUpdate);
    };
  }, [courseId]);

  // Auth & Ownership Listener
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user && user.email) {
        setCurrentUser({
          name: user.displayName || user.email.split('@')[0],
          email: user.email
        });

        const normalizedEmail = user.email.toLowerCase();
        if (ADMIN_EMAILS.includes(normalizedEmail)) {
          setIsAdmin(true);
        }

        // Local storage unlock check
        if (courseId && localStorage.getItem(`course_unlocked_${courseId}`) === 'true') {
          setIsOwned(true);
        }

        // Realtime Firestore Check
        if (courseId) {
          const userDocRef = doc(db, "users", normalizedEmail, "purchased_courses", courseId);
          onSnapshot(userDocRef, (docSnap) => {
            if (docSnap.exists()) {
              setIsOwned(true);
              setCourseProgress(docSnap.data().progress || 0);
              setCompletedLessons(docSnap.data().completedLessons || []);
              localStorage.setItem(`course_unlocked_${courseId}`, 'true');
            }
          });
        }
      } else {
        setCurrentUser(null);
        if (courseId && localStorage.getItem(`course_unlocked_${courseId}`) === 'true') {
          setIsOwned(true);
        } else {
          setIsOwned(false);
        }
      }
    });

    return () => unsubscribe();
  }, [courseId]);

  // Saved Notes from LocalStorage
  useEffect(() => {
    if (courseId) {
      const notes = localStorage.getItem(`notes_${courseId}`);
      if (notes) {
        try {
          const parsed = JSON.parse(notes);
          if (Array.isArray(parsed)) {
            // Support legacy string arrays or object array
            const formatted = parsed.map((item: any, i: number) => {
              if (typeof item === 'string') {
                return { id: `note-${i}`, text: item, date: 'Gần đây' };
              }
              return item;
            });
            setSavedNotes(formatted);
          }
        } catch (e) {}
      }
    }
  }, [courseId]);

  const currentLesson = useMemo(() => curriculum[currentIdx] || curriculum[0], [curriculum, currentIdx]);
  const isCurrentCompleted = useMemo(() => 
    completedLessons.includes(`${currentIdx}`) || completedLessons.includes(`0-${currentIdx}`),
    [completedLessons, currentIdx]
  );

  const handleUpdateProgress = async (lessonIndex: number) => {
    const lessonKey = `${lessonIndex}`;
    let newCompleted = [...completedLessons];

    if (!newCompleted.includes(lessonKey)) {
      newCompleted.push(lessonKey);
    }

    const total = curriculum.length;
    const newProgress = total > 0 ? Math.min(Math.round((newCompleted.length / total) * 100), 100) : 100;

    setCompletedLessons(newCompleted);
    setCourseProgress(newProgress);

    if (currentUser?.email && courseId) {
      try {
        const userDocRef = doc(db, "users", currentUser.email.toLowerCase(), "purchased_courses", courseId);
        await setDoc(userDocRef, {
          progress: newProgress,
          completedLessons: newCompleted
        }, { merge: true });
      } catch (err) {
        console.error("Lỗi cập nhật tiến độ:", err);
      }
    }
  };

  const handleSaveNote = () => {
    if (!userNote.trim() || !courseId) return;
    const newNoteObj = {
      id: `${Date.now()}`,
      text: userNote.trim(),
      date: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) + ', ' + new Date().toLocaleDateString('vi-VN')
    };
    const updated = [newNoteObj, ...savedNotes];
    setSavedNotes(updated);
    localStorage.setItem(`notes_${courseId}`, JSON.stringify(updated));
    setUserNote('');
  };

  const [selectedSource, setSelectedSource] = useState<'primary' | 'vdohide'>('primary');

  const activeVideoUrl = useMemo(() => {
    if (selectedSource === 'vdohide' && currentLesson?.vdohide) {
      return currentLesson.vdohide;
    }
    return currentLesson?.videoUrl || currentLesson?.vdohide || "https://www.w3schools.com/html/mov_bbb.mp4";
  }, [currentLesson, selectedSource]);

  const videoEmbed = useMemo(() => {
    if (!activeVideoUrl) return { isEmbed: false, embedUrl: "https://www.w3schools.com/html/mov_bbb.mp4" };
    return getVideoEmbedInfo(activeVideoUrl, true);
  }, [activeVideoUrl]);

  const filteredCurriculum = useMemo(() => {
    if (!searchQuery.trim()) return curriculum;
    const q = searchQuery.toLowerCase().trim();
    return curriculum.filter((item, idx) => 
      item.title.toLowerCase().includes(q) || `bài ${idx + 1}`.includes(q)
    );
  }, [curriculum, searchQuery]);

  return (
    <div className="min-h-screen bg-[#090d16] text-slate-100 flex flex-col font-sans selection:bg-teal-500 selection:text-white">
      
      {/* GLOWING AMBIENT BACKGROUND ACCENTS */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute top-0 left-1/4 w-[600px] h-[300px] bg-teal-600/10 rounded-full blur-3xl transform -translate-y-1/2"></div>
        <div className="absolute top-1/3 right-10 w-[500px] h-[500px] bg-emerald-600/5 rounded-full blur-3xl"></div>
      </div>

      {/* MODERN GLASS TOP NAVBAR */}
      <header className="sticky top-0 z-50 bg-[#0f172a]/85 backdrop-blur-xl border-b border-white/[0.08] px-4 md:px-8 py-3.5 flex items-center justify-between shadow-2xl transition-all">
        <div className="flex items-center gap-3 md:gap-5">
          <button 
            onClick={() => navigate('/account')} 
            className="flex items-center gap-2 text-xs md:text-sm font-bold bg-white/[0.06] hover:bg-white/[0.12] text-slate-200 hover:text-white px-3.5 py-2 rounded-xl transition-all border border-white/[0.08] shadow-sm active:scale-95"
          >
            <svg className="w-4 h-4 text-teal-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 19l-7-7 7-7" /></svg>
            <span>Trang cá nhân</span>
          </button>
          
          <div className="h-6 w-[1px] bg-white/[0.1] hidden sm:block"></div>

          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[9px] uppercase font-black tracking-widest bg-teal-500/15 text-teal-300 border border-teal-500/30">
                <span className="w-1.5 h-1.5 rounded-full bg-teal-400 animate-pulse"></span>
                Phòng học trực tuyến
              </span>
              {course?.category && (
                <span className="hidden md:inline text-[10px] font-bold text-slate-400 bg-white/[0.04] px-2 py-0.5 rounded border border-white/[0.06]">
                  {course.category}
                </span>
              )}
            </div>
            <h1 className="text-sm md:text-base font-black text-white line-clamp-1 mt-0.5 tracking-tight">
              {course?.title || 'Khóa học'}
            </h1>
          </div>
        </div>

        {/* PROGRESS & PROFILE BADGE */}
        <div className="flex items-center gap-3 md:gap-6">
          <div className="hidden sm:flex flex-col items-end min-w-[130px]">
            <div className="flex items-center gap-2 text-xs font-bold">
              <span className="text-slate-400">Tiến độ khóa:</span>
              <span className="text-teal-400 font-extrabold">{courseProgress}%</span>
            </div>
            <div className="w-32 bg-slate-800/80 h-2 rounded-full overflow-hidden mt-1.5 border border-white/[0.08] p-0.5">
              <div 
                className="bg-gradient-to-r from-teal-500 to-emerald-400 h-full transition-all duration-500 rounded-full shadow-[0_0_8px_rgba(20,184,166,0.5)]" 
                style={{ width: `${courseProgress}%` }}
              ></div>
            </div>
          </div>

          {currentUser ? (
            <div className="flex items-center gap-2.5 bg-white/[0.06] hover:bg-white/[0.09] px-3.5 py-1.5 rounded-full border border-white/[0.08] transition-all">
              <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-teal-500 to-emerald-400 text-slate-950 flex items-center justify-center font-black text-xs uppercase shadow-md">
                {currentUser.name.charAt(0)}
              </div>
              <div className="hidden md:flex flex-col text-left">
                <span className="text-xs font-bold text-slate-200 leading-tight max-w-[110px] truncate">{currentUser.name}</span>
                <span className="text-[9px] font-medium text-teal-400/90 leading-tight">Học viên</span>
              </div>
            </div>
          ) : (
            <Link to="/account" className="bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-500 hover:to-emerald-500 text-white text-xs font-black px-4 py-2 rounded-xl transition-all shadow-lg shadow-teal-900/30">
              Đăng nhập
            </Link>
          )}
        </div>
      </header>

      {/* NOT OWNED NOTICE BANNER */}
      {!isOwned && (
        <div className="relative z-10 bg-gradient-to-r from-amber-500/15 via-amber-600/10 to-transparent border-b border-amber-500/20 px-4 py-2.5 text-center flex items-center justify-center gap-3">
          <span className="text-amber-300 font-bold text-xs md:text-sm flex items-center gap-2">
            <svg className="w-4 h-4 text-amber-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
            Bạn đang xem thử bài giảng mẫu. Hãy đăng ký khóa học để lưu tiến độ và nhận chứng chỉ hoàn thành!
          </span>
          <Link to={`/khoa-hoc/${courseId}`} className="bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-xs px-3.5 py-1.5 rounded-lg transition-all shadow hover:shadow-amber-400/20 active:scale-95 shrink-0">
            Đăng ký ngay
          </Link>
        </div>
      )}

      {/* MAIN WORKSPACE GRID */}
      <main className="relative z-10 flex-1 max-w-[1720px] w-full mx-auto p-4 md:p-6 lg:p-8 grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8">
        
        {/* LEFT COLUMN: THEATER PLAYER & DETAILS (8 COLS) */}
        <div className="lg:col-span-8 flex flex-col space-y-6">
          
          {/* MODERN THEATER SCREEN CHASSIS */}
          <div className="bg-[#111827] rounded-3xl overflow-hidden border border-white/[0.08] shadow-[0_20px_60px_-15px_rgba(0,0,0,0.8)] relative group">
            <div className={`w-full ${courseId === 'basic-principles' ? 'min-h-[550px] md:min-h-[650px] bg-slate-950 overflow-y-auto' : 'aspect-video bg-black flex items-center justify-center'}`}>
              {courseId === 'basic-principles' ? (
                <div className="h-full w-full bg-white text-slate-900 relative">
                  <Handbook />
                </div>
              ) : videoEmbed.isEmbed ? (
                <iframe 
                  key={videoEmbed.embedUrl}
                  src={videoEmbed.embedUrl} 
                  className="w-full h-full border-0"
                  title={currentLesson?.title || "Video bài giảng"}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share; fullscreen"
                  allowFullScreen
                  referrerPolicy="no-referrer"
                />
              ) : (
                <video 
                  key={videoEmbed.embedUrl || currentLesson?.videoUrl}
                  src={videoEmbed.embedUrl || currentLesson?.videoUrl} 
                  controls 
                  autoPlay
                  className="w-full h-full object-contain"
                  onEnded={() => {
                    handleUpdateProgress(currentIdx);
                    if (currentIdx < curriculum.length - 1) {
                      setCurrentIdx(currentIdx + 1);
                    }
                  }}
                />
              )}
            </div>
          </div>

          {/* SLEEK LESSON CONTROL TOOLBAR */}
          <div className="bg-[#111827]/90 backdrop-blur-md p-5 rounded-2xl border border-white/[0.08] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-xl">
            <div className="min-w-0">
              <div className="flex items-center gap-2.5 mb-1.5">
                <span className="text-[10px] font-black text-teal-400 uppercase tracking-widest bg-teal-500/10 px-2.5 py-0.5 rounded-full border border-teal-500/20">
                  Bài {currentIdx + 1} / {curriculum.length}
                </span>
                <span className="text-[11px] font-bold text-slate-400">
                  {isCurrentCompleted ? '• Đã xem xong' : '• Đang tiếp tục'}
                </span>
              </div>
              <h2 className="text-lg md:text-xl font-extrabold text-white line-clamp-1 tracking-tight">
                {currentLesson?.title || 'Bài giảng'}
              </h2>
            </div>

            {/* ACTION CONTROLS */}
            <div className="flex items-center gap-2.5 flex-wrap w-full sm:w-auto justify-end shrink-0">
              {currentLesson?.vdohide && (
                <div className="flex items-center bg-white/[0.06] p-1 rounded-xl border border-white/[0.08] text-xs">
                  <button
                    type="button"
                    onClick={() => setSelectedSource('primary')}
                    className={`px-2.5 py-1 rounded-lg font-bold transition-all ${
                      selectedSource === 'primary' 
                        ? 'bg-teal-500 text-slate-950 shadow-sm' 
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Server 1
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedSource('vdohide')}
                    className={`px-2.5 py-1 rounded-lg font-bold flex items-center gap-1 transition-all ${
                      selectedSource === 'vdohide' 
                        ? 'bg-amber-400 text-slate-950 shadow-sm' 
                        : 'text-amber-400 hover:text-amber-300'
                    }`}
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-current"></span>
                    vdohide
                  </button>
                </div>
              )}

              <button
                disabled={currentIdx === 0}
                onClick={() => {
                  if (currentIdx > 0) setCurrentIdx(currentIdx - 1);
                }}
                className="px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all bg-white/[0.06] hover:bg-white/[0.1] text-slate-300 disabled:opacity-30 disabled:cursor-not-allowed border border-white/[0.08] active:scale-95"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 19l-7-7 7-7" /></svg>
                <span>Bài trước</span>
              </button>

              <button
                onClick={() => handleUpdateProgress(currentIdx)}
                className={`px-4 py-2 rounded-xl text-xs font-black flex items-center gap-2 transition-all shadow-lg active:scale-95 ${
                  isCurrentCompleted 
                    ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 shadow-emerald-950/40' 
                    : 'bg-gradient-to-r from-teal-500 to-emerald-500 hover:from-teal-400 hover:to-emerald-400 text-slate-950 shadow-teal-900/40'
                }`}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" /></svg>
                <span>{isCurrentCompleted ? 'Đã hoàn thành' : 'Đánh dấu hoàn thành'}</span>
              </button>

              <button
                disabled={currentIdx >= curriculum.length - 1}
                onClick={() => {
                  if (currentIdx < curriculum.length - 1) setCurrentIdx(currentIdx + 1);
                }}
                className="px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all bg-white/[0.06] hover:bg-white/[0.1] text-slate-300 disabled:opacity-30 disabled:cursor-not-allowed border border-white/[0.08] active:scale-95"
              >
                <span>Bài tiếp</span>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 5l7 7-7 7" /></svg>
              </button>

              <button
                onClick={() => setIsLiked(!isLiked)}
                className={`p-2.5 rounded-xl border transition-all active:scale-95 ${
                  isLiked 
                    ? 'bg-rose-500/20 text-rose-400 border-rose-500/30 shadow-[0_0_12px_rgba(244,63,94,0.3)]' 
                    : 'bg-white/[0.06] text-slate-400 border-white/[0.08] hover:text-rose-400 hover:bg-white/[0.1]'
                }`}
                title={isLiked ? 'Bỏ thích' : 'Yêu thích bài học'}
              >
                <svg className={`w-4 h-4 ${isLiked ? 'fill-current text-rose-400' : 'fill-none'}`} stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" /></svg>
              </button>
            </div>
          </div>

          {/* MODERN LESSON TABS: OVERVIEW, NOTES, DISCUSSION */}
          <div className="bg-[#111827]/90 backdrop-blur-md rounded-3xl border border-white/[0.08] p-6 shadow-xl space-y-6">
            <div className="flex border-b border-white/[0.08] gap-8">
              {[
                { id: 'overview', label: 'Tổng quan bài học', icon: 'M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z' },
                { id: 'notes', label: `Ghi chú cá nhân (${savedNotes.length})`, icon: 'M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z' },
                { id: 'discussion', label: 'Hỗ trợ & Hỏi đáp', icon: 'M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z' }
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`pb-3.5 text-xs sm:text-sm font-extrabold flex items-center gap-2 border-b-2 transition-all ${
                    activeTab === tab.id 
                      ? 'border-teal-400 text-teal-300 shadow-[0_2px_12px_rgba(45,212,191,0.2)]' 
                      : 'border-transparent text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <svg className="w-4 h-4 opacity-80" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d={tab.icon} /></svg>
                  <span>{tab.label}</span>
                </button>
              ))}
            </div>

            {/* TAB CONTENT: OVERVIEW */}
            {activeTab === 'overview' && (
              <div className="space-y-4 text-slate-300 text-sm leading-relaxed">
                <div className="flex items-start gap-3 p-4 bg-white/[0.03] rounded-2xl border border-white/[0.06]">
                  <div className="w-8 h-8 rounded-xl bg-teal-500/10 text-teal-400 flex items-center justify-center shrink-0 mt-0.5 border border-teal-500/20">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg>
                  </div>
                  <div>
                    <h4 className="text-white font-bold text-sm mb-1">Mục tiêu học tập bài học này:</h4>
                    <p className="text-slate-400 text-xs sm:text-sm">
                      Nắm vững các thuật ngữ chuyên môn, hiểu rõ phương pháp triển khai thực tế theo tiêu chuẩn ISO/HACCP và ứng dụng ngay vào doanh nghiệp.
                    </p>
                  </div>
                </div>

                <div className="p-4 bg-white/[0.03] rounded-2xl border border-white/[0.06] flex items-center justify-between gap-4">
                  <div className="space-y-1">
                    <span className="text-[10px] font-black uppercase tracking-wider text-teal-400">Tài liệu tham khảo chuyên ngành</span>
                    <p className="text-xs text-slate-300">Đọc cẩm nang tiêu chuẩn hoặc xem bài viết bổ trợ đi kèm khóa học.</p>
                  </div>
                  <Link to="/cam-nang" className="px-3.5 py-2 rounded-xl bg-white/[0.06] hover:bg-white/[0.12] text-teal-300 text-xs font-bold border border-white/[0.08] transition-all shrink-0">
                    Xem cẩm nang
                  </Link>
                </div>
              </div>
            )}

            {/* TAB CONTENT: NOTES */}
            {activeTab === 'notes' && (
              <div className="space-y-5">
                <div className="flex gap-2.5">
                  <input
                    type="text"
                    value={userNote}
                    onChange={(e) => setUserNote(e.target.value)}
                    placeholder="Viết ghi chú quan trọng cho bài học này (Nhấn Enter để lưu)..."
                    className="flex-1 bg-[#090d16] border border-white/[0.1] rounded-2xl px-4 py-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-teal-400 focus:ring-2 focus:ring-teal-500/20 transition-all"
                    onKeyDown={(e) => e.key === 'Enter' && handleSaveNote()}
                  />
                  <button
                    onClick={handleSaveNote}
                    className="bg-gradient-to-r from-teal-500 to-emerald-500 hover:from-teal-400 hover:to-emerald-400 text-slate-950 px-5 py-3 rounded-2xl font-black text-xs transition-all shadow-lg active:scale-95 shrink-0"
                  >
                    Lưu ghi chú
                  </button>
                </div>

                {savedNotes.length > 0 ? (
                  <div className="space-y-2.5 max-h-60 overflow-y-auto pr-1">
                    {savedNotes.map((note) => (
                      <div key={note.id} className="p-3.5 bg-white/[0.03] hover:bg-white/[0.05] rounded-2xl border border-white/[0.06] text-xs text-slate-200 flex justify-between items-start gap-4 transition-all">
                        <div className="space-y-1">
                          <p className="leading-relaxed font-medium">{note.text}</p>
                          <span className="text-[10px] text-slate-500 block">{note.date}</span>
                        </div>
                        <button 
                          onClick={() => {
                            const updated = savedNotes.filter(n => n.id !== note.id);
                            setSavedNotes(updated);
                            localStorage.setItem(`notes_${courseId}`, JSON.stringify(updated));
                          }}
                          className="text-slate-500 hover:text-rose-400 p-1 rounded transition-colors"
                          title="Xóa ghi chú này"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 border border-dashed border-white/[0.08] rounded-2xl bg-white/[0.01]">
                    <svg className="w-8 h-8 text-slate-600 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                    <p className="text-xs text-slate-400 font-medium">Chưa có ghi chú nào cho bài học này.</p>
                    <p className="text-[11px] text-slate-500 mt-0.5">Nhập nội dung ở khung phía trên để lưu lại kiến thức bổ ích.</p>
                  </div>
                )}
              </div>
            )}

            {/* TAB CONTENT: DISCUSSION & SUPPORT */}
            {activeTab === 'discussion' && (
              <div className="p-6 bg-white/[0.02] rounded-2xl border border-white/[0.06] text-center space-y-4">
                <div className="w-12 h-12 rounded-2xl bg-teal-500/10 text-teal-400 flex items-center justify-center mx-auto border border-teal-500/20">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 8h2a2 2 0 012 2v6a2 2 0 01-2 2h-2v4l-4-4H9a1.994 1.994 0 01-1.414-.586m0 0L11 14h4a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2v4l.586-.586z" /></svg>
                </div>
                <div>
                  <h4 className="text-sm font-black text-white">Bạn gặp vướng mắc cần giải đáp chuyên môn?</h4>
                  <p className="text-xs text-slate-400 max-w-md mx-auto mt-1">
                    Đội ngũ chuyên gia tiêu chuẩn ISO & HACCP tại Fast E-Learning luôn sẵn sàng hỗ trợ trực tiếp để giúp bạn áp dụng thành công.
                  </p>
                </div>
                <Link
                  to="/tu-van"
                  className="inline-flex items-center gap-2 bg-gradient-to-r from-teal-500 to-emerald-500 hover:from-teal-400 hover:to-emerald-400 text-slate-950 text-xs font-black px-6 py-3 rounded-xl transition-all shadow-lg shadow-teal-950/40 active:scale-95"
                >
                  <span>Gửi câu hỏi hỗ trợ giảng viên</span>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>
                </Link>
              </div>
            )}
          </div>
        </div>

        {/* RIGHT COLUMN: REFINED PLAYLIST SIDEBAR (4 COLS) */}
        <div className="lg:col-span-4 flex flex-col space-y-6">
          <div className="bg-[#111827]/90 backdrop-blur-md rounded-3xl p-5 md:p-6 border border-white/[0.08] shadow-2xl flex flex-col h-full min-h-[550px]">
            
            {/* PLAYLIST HEADER */}
            <div className="pb-4 border-b border-white/[0.08] mb-4 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-extrabold text-white text-base flex items-center gap-2 tracking-tight">
                    <span className="w-1.5 h-4 bg-teal-400 rounded-full"></span>
                    Danh sách bài giảng
                  </h3>
                  <span className="text-[11px] font-bold text-slate-400">{curriculum.length} bài học video</span>
                </div>
                <span className="text-[11px] font-black text-teal-400 bg-teal-500/10 px-2.5 py-1 rounded-lg border border-teal-500/20">
                  {completedLessons.length}/{curriculum.length} Đã xong
                </span>
              </div>

              {/* SEARCH LESSONS */}
              <div className="relative">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Tìm bài học..."
                  className="w-full bg-[#090d16] border border-white/[0.08] rounded-xl px-3.5 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-teal-400 transition-all pl-9"
                />
                <svg className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
              </div>
            </div>

            {/* LESSON ITEMS LIST */}
            <div className="space-y-2.5 flex-1 overflow-y-auto pr-1 max-h-[620px] custom-scrollbar">
              {filteredCurriculum.map((lesson, originalIdx) => {
                // Find actual index in real curriculum array
                const idx = curriculum.findIndex(c => c.title === lesson.title);
                const actualIdx = idx !== -1 ? idx : originalIdx;
                const isCompleted = completedLessons.includes(`${actualIdx}`) || completedLessons.includes(`0-${actualIdx}`);
                const isPlaying = currentIdx === actualIdx;

                return (
                  <div
                    key={actualIdx}
                    onClick={() => setCurrentIdx(actualIdx)}
                    className={`p-3.5 rounded-2xl cursor-pointer border transition-all duration-200 flex items-center justify-between gap-3 group relative overflow-hidden ${
                      isPlaying 
                        ? 'bg-gradient-to-r from-teal-950/60 to-slate-900/90 border-teal-500/40 shadow-lg shadow-teal-950/30' 
                        : 'bg-white/[0.02] hover:bg-white/[0.06] border-white/[0.06]'
                    }`}
                  >
                    {isPlaying && (
                      <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-teal-400 to-emerald-400"></div>
                    )}

                    <div className="flex items-center gap-3 min-w-0">
                      <span className={`w-7 h-7 rounded-xl flex items-center justify-center text-xs font-black shrink-0 transition-all ${
                        isPlaying 
                          ? 'bg-teal-400 text-slate-950 shadow-md shadow-teal-400/20 font-black' 
                          : isCompleted
                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                          : 'bg-white/[0.05] text-slate-400 border border-white/[0.08] group-hover:text-slate-200'
                      }`}>
                        {actualIdx + 1}
                      </span>

                      <div className="min-w-0">
                        <p className={`text-xs md:text-sm font-bold line-clamp-1 transition-colors ${
                          isPlaying ? 'text-teal-300 font-extrabold' : 'text-slate-200 group-hover:text-white'
                        }`}>
                          {lesson.title}
                        </p>
                        <p className="text-[10px] font-medium text-slate-400 mt-0.5 flex items-center gap-1.5">
                          {isPlaying ? (
                            <span className="text-teal-400 font-bold flex items-center gap-1">
                              <span className="w-1.5 h-1.5 rounded-full bg-teal-400 animate-ping"></span>
                              Đang phát
                            </span>
                          ) : isCompleted ? (
                            <span className="text-emerald-400 font-bold">✓ Đã học xong</span>
                          ) : (
                            'Chưa học'
                          )}
                        </p>
                      </div>
                    </div>

                    <div className="shrink-0">
                      {isCompleted ? (
                        <div className="w-6 h-6 rounded-full bg-emerald-500/15 text-emerald-400 flex items-center justify-center border border-emerald-500/30">
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" /></svg>
                        </div>
                      ) : isPlaying ? (
                        <div className="flex items-end gap-0.5 h-4 px-1">
                          <span className="w-1 h-3.5 bg-teal-400 rounded-full animate-pulse"></span>
                          <span className="w-1 h-2 bg-teal-300 rounded-full animate-pulse delay-75"></span>
                          <span className="w-1 h-4 bg-teal-400 rounded-full animate-pulse delay-150"></span>
                        </div>
                      ) : (
                        <div className="w-6 h-6 rounded-full bg-white/[0.04] group-hover:bg-white/[0.1] text-slate-500 group-hover:text-slate-300 flex items-center justify-center transition-all">
                          <svg className="w-3 h-3 translate-x-0.5" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" /></svg>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

      </main>
    </div>
  );
};

export default Classroom;
