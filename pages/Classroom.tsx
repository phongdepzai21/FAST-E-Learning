import React, { useEffect, useState, useMemo } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { COURSES, ADMIN_EMAILS, getMergedCourses } from '../constants';
import { auth, db } from '../firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, setDoc, getDoc, onSnapshot } from 'firebase/firestore';
import { Course } from '../types';
import Handbook from './Handbook';
import { getVideoEmbedInfo } from './CourseDetail';

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
  const [savedNotes, setSavedNotes] = useState<string[]>([]);

  // Load Course
  useEffect(() => {
    if (!courseId) return;

    const loadCourseData = (docData?: any) => {
      const fsList = docData ? [{ id: courseId, ...docData }] : [];
      const allMerged = getMergedCourses(fsList);
      const found = allMerged.find(c => c.id === courseId);

      if (found) {
        setCourse(found);
        const curr = docData?.curriculum || found.curriculum;
        const flatList = extractLessonsFlat(curr);
        setCurriculum(flatList.length > 0 ? flatList : DUMMY_LESSONS);
      } else {
        setCourse({
          id: courseId,
          title: 'Khóa học',
          price: 'Miễn phí',
          image: 'https://images.unsplash.com/photo-1533777857889-4be7c70b33f7',
          category: 'Chung',
          description: 'Nội dung khóa học'
        });
        setCurriculum(DUMMY_LESSONS);
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

    return () => unsubscribeSnapshot();
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
          const docRef = doc(db, "users", normalizedEmail, "purchased_courses", courseId);
          onSnapshot(docRef, (docSnap) => {
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
          setSavedNotes(JSON.parse(notes));
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
        const docRef = doc(db, "users", currentUser.email.toLowerCase(), "purchased_courses", courseId);
        await setDoc(docRef, {
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
    const updated = [userNote.trim(), ...savedNotes];
    setSavedNotes(updated);
    localStorage.setItem(`notes_${courseId}`, JSON.stringify(updated));
    setUserNote('');
  };

  const videoEmbed = useMemo(() => {
    if (!currentLesson?.videoUrl) return { isEmbed: false, embedUrl: "https://www.w3schools.com/html/mov_bbb.mp4" };
    return getVideoEmbedInfo(currentLesson.videoUrl, true);
  }, [currentLesson]);

  return (
    <div className="min-h-screen bg-[#0f172a] text-slate-100 flex flex-col font-sans">
      {/* CLASSROOM TOP NAVBAR */}
      <header className="sticky top-0 z-50 bg-[#1e293b]/90 backdrop-blur-md border-b border-slate-800 px-4 md:px-8 py-3.5 flex items-center justify-between shadow-xl">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => navigate('/account')} 
            className="flex items-center gap-2 text-xs md:text-sm font-bold bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white px-3.5 py-2 rounded-xl transition-all border border-slate-700"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 19l-7-7 7-7" /></svg>
            Quay lại
          </button>
          
          <div className="h-6 w-[1px] bg-slate-700 hidden sm:block"></div>

          <div className="min-w-0">
            <span className="text-[10px] uppercase font-black tracking-widest text-[#00a89d] block">
              PHÒNG HỌC FAST E-LEARNING
            </span>
            <h1 className="text-sm md:text-base font-black text-white line-clamp-1">
              {course?.title || 'Khóa học'}
            </h1>
          </div>
        </div>

        {/* PROGRESS & ACCOUNT PROFILE */}
        <div className="flex items-center gap-4 md:gap-6">
          <div className="hidden sm:flex flex-col items-end min-w-[120px]">
            <span className="text-xs font-bold text-slate-400">Tiến độ: <strong className="text-[#00a89d]">{courseProgress}%</strong></span>
            <div className="w-28 bg-slate-800 h-2 rounded-full overflow-hidden mt-1 border border-slate-700">
              <div className="bg-[#00a89d] h-full transition-all duration-500 rounded-full" style={{ width: `${courseProgress}%` }}></div>
            </div>
          </div>

          {currentUser ? (
            <div className="flex items-center gap-2 bg-slate-800 px-3 py-1.5 rounded-full border border-slate-700">
              <div className="w-7 h-7 rounded-full bg-[#00a89d] text-white flex items-center justify-center font-black text-xs uppercase shadow">
                {currentUser.name.charAt(0)}
              </div>
              <span className="text-xs font-bold text-slate-200 hidden md:inline max-w-[120px] truncate">{currentUser.name}</span>
            </div>
          ) : (
            <Link to="/account" className="bg-[#007c76] text-white text-xs font-bold px-4 py-2 rounded-xl hover:bg-[#00605b] transition-colors shadow-md">
              Đăng nhập
            </Link>
          )}
        </div>
      </header>

      {/* NOT OWNED WARNING BANNER */}
      {!isOwned && (
        <div className="bg-amber-500/10 border-b border-amber-500/20 px-4 py-3 text-center flex items-center justify-center gap-3">
          <span className="text-amber-400 font-bold text-xs md:text-sm">
            ⚠️ Bạn đang xem thử bài học. Hãy đăng ký khóa học để lưu tiến độ hoàn thành!
          </span>
          <Link to={`/khoa-hoc/${courseId}`} className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-xs px-3.5 py-1.5 rounded-lg transition-all shadow">
            Đăng ký ngay
          </Link>
        </div>
      )}

      {/* MAIN CLASSROOM WORKSPACE */}
      <div className="flex-1 max-w-[1700px] w-full mx-auto p-4 md:p-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* LEFT COLUMN: PLAYER & LESSON DETAILS (8 COLS) */}
        <div className="lg:col-span-8 flex flex-col space-y-6">
          {/* VIDEO / HANDBOOK PLAYER BOX */}
          <div className="bg-slate-900 rounded-3xl overflow-hidden border border-slate-800 shadow-2xl relative group">
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
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              ) : (
                <video 
                  key={currentLesson?.videoUrl}
                  src={currentLesson?.videoUrl} 
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

          {/* LESSON CONTROL BAR */}
          <div className="bg-[#1e293b] p-5 rounded-2xl border border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-lg">
            <div className="min-w-0">
              <span className="text-[11px] font-black text-[#00a89d] uppercase tracking-wider block mb-1">
                Bài {currentIdx + 1} / {curriculum.length}
              </span>
              <h2 className="text-lg md:text-xl font-black text-white line-clamp-1">
                {currentLesson?.title || 'Bài giảng'}
              </h2>
            </div>

            <div className="flex items-center gap-2.5 flex-wrap w-full sm:w-auto justify-end shrink-0">
              <button
                disabled={currentIdx === 0}
                onClick={() => {
                  if (currentIdx > 0) setCurrentIdx(currentIdx - 1);
                }}
                className="px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all bg-slate-800 hover:bg-slate-700 text-slate-300 disabled:opacity-30 disabled:cursor-not-allowed border border-slate-700"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 19l-7-7 7-7" /></svg>
                Bài trước
              </button>

              <button
                onClick={() => handleUpdateProgress(currentIdx)}
                className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shadow-md ${
                  isCurrentCompleted 
                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' 
                    : 'bg-[#007c76] hover:bg-[#00605b] text-white'
                }`}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" /></svg>
                {isCurrentCompleted ? 'Đã hoàn thành' : 'Đánh dấu hoàn thành'}
              </button>

              <button
                disabled={currentIdx >= curriculum.length - 1}
                onClick={() => {
                  if (currentIdx < curriculum.length - 1) setCurrentIdx(currentIdx + 1);
                }}
                className="px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all bg-slate-800 hover:bg-slate-700 text-slate-300 disabled:opacity-30 disabled:cursor-not-allowed border border-slate-700"
              >
                Bài tiếp
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 5l7 7-7 7" /></svg>
              </button>

              <button
                onClick={() => setIsLiked(!isLiked)}
                className={`p-2 rounded-xl border transition-all ${
                  isLiked ? 'bg-rose-500/20 text-rose-400 border-rose-500/30' : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-rose-400'
                }`}
                title="Thích bài học"
              >
                <svg className={`w-5 h-5 ${isLiked ? 'fill-current text-rose-400' : 'fill-none'}`} stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" /></svg>
              </button>
            </div>
          </div>

          {/* LESSON TABS / NOTES / OVERVIEW */}
          <div className="bg-[#1e293b] rounded-2xl border border-slate-800 p-6 space-y-6">
            <div className="flex border-b border-slate-800 gap-6">
              {[
                { id: 'overview', label: 'Tổng quan bài học' },
                { id: 'notes', label: 'Ghi chú cá nhân' },
                { id: 'discussion', label: 'Thảo luận & Hỏi đáp' }
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`pb-3 text-sm font-bold border-b-2 transition-all ${
                    activeTab === tab.id 
                      ? 'border-[#00a89d] text-[#00a89d]' 
                      : 'border-transparent text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {activeTab === 'overview' && (
              <div className="space-y-4 text-slate-300 text-sm leading-relaxed">
                <p>
                  <strong>Mô tả:</strong> Bài học nằm trong lộ trình đào tạo chuyên sâu của Fast E-Learning. Vui lòng xem kỹ video và ghi chú các nội dung chính.
                </p>
                <div className="p-4 bg-slate-900/60 rounded-xl border border-slate-800/80 space-y-2">
                  <span className="text-xs font-black uppercase text-[#00a89d]">Tài liệu tham khảo:</span>
                  <p className="text-xs text-slate-400">Bạn có thể truy cập cẩm nang hướng dẫn đầy đủ tại trang Cẩm nang hoặc tải tài liệu đính kèm.</p>
                </div>
              </div>
            )}

            {activeTab === 'notes' && (
              <div className="space-y-4">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={userNote}
                    onChange={(e) => setUserNote(e.target.value)}
                    placeholder="Viết ghi chú ngắn cho bài học này..."
                    className="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-[#00a89d]"
                    onKeyDown={(e) => e.key === 'Enter' && handleSaveNote()}
                  />
                  <button
                    onClick={handleSaveNote}
                    className="bg-[#007c76] hover:bg-[#00605b] text-white px-5 py-2.5 rounded-xl font-bold text-xs transition-all shadow"
                  >
                    Lưu ghi chú
                  </button>
                </div>

                {savedNotes.length > 0 ? (
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {savedNotes.map((note, i) => (
                      <div key={i} className="p-3 bg-slate-900/80 rounded-xl border border-slate-800 text-xs text-slate-300 flex justify-between items-center">
                        <span>• {note}</span>
                        <button 
                          onClick={() => {
                            const updated = savedNotes.filter((_, idx) => idx !== i);
                            setSavedNotes(updated);
                            localStorage.setItem(`notes_${courseId}`, JSON.stringify(updated));
                          }}
                          className="text-slate-500 hover:text-rose-400"
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-slate-500 italic">Chưa có ghi chú nào cho khóa học này.</p>
                )}
              </div>
            )}

            {activeTab === 'discussion' && (
              <div className="p-6 bg-slate-900/50 rounded-xl border border-slate-800 text-center space-y-3">
                <p className="text-xs font-bold text-slate-400">Hỗ trợ học tập Fast QMS & ISO</p>
                <p className="text-sm font-bold text-slate-200">Bạn có thắc mắc trong bài học này?</p>
                <p className="text-xs text-slate-400 max-w-md mx-auto">
                  Liên hệ hotline giảng viên hoặc gửi thắc mắc trực tiếp qua kênh tư vấn hỗ trợ của Fast E-Learning để được giải đáp trong 24h.
                </p>
                <Link
                  to="/tu-van"
                  className="inline-block bg-[#007c76] text-white text-xs font-bold px-5 py-2.5 rounded-xl hover:bg-[#00605b] transition-all shadow-md mt-2"
                >
                  Gửi câu hỏi hỗ trợ
                </Link>
              </div>
            )}
          </div>
        </div>

        {/* RIGHT COLUMN: PLAYLIST SIDEBAR (4 COLS) */}
        <div className="lg:col-span-4 flex flex-col space-y-6">
          <div className="bg-[#1e293b] rounded-3xl p-6 border border-slate-800 shadow-xl flex flex-col h-full min-h-[500px]">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800 mb-4">
              <div>
                <h3 className="font-black text-white text-base flex items-center gap-2 uppercase tracking-wide">
                  <span className="w-1.5 h-4 bg-[#00a89d] rounded-full"></span>
                  Danh sách bài học
                </h3>
                <span className="text-[11px] font-bold text-slate-400">{curriculum.length} Bài giảng video</span>
              </div>
            </div>

            {/* LESSON LIST */}
            <div className="space-y-2.5 flex-1 overflow-y-auto pr-1 max-h-[600px]">
              {curriculum.map((lesson, idx) => {
                  const isCompleted = completedLessons.includes(`${idx}`) || completedLessons.includes(`0-${idx}`);
                  const isPlaying = currentIdx === idx;

                  return (
                    <div
                      key={idx}
                      onClick={() => setCurrentIdx(idx)}
                      className={`p-3.5 rounded-2xl cursor-pointer border transition-all duration-200 flex items-center justify-between gap-3 ${
                        isPlaying 
                          ? 'bg-[#00a89d]/15 border-[#00a89d] shadow-lg shadow-[#00a89d]/10' 
                          : 'bg-slate-900/60 hover:bg-slate-800/80 border-slate-800/80'
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <span className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-black shrink-0 ${
                          isPlaying 
                            ? 'bg-[#00a89d] text-white shadow' 
                            : 'bg-slate-800 text-slate-400 border border-slate-700'
                        }`}>
                          {idx + 1}
                        </span>

                        <div className="min-w-0">
                          <p className={`text-xs md:text-sm font-bold line-clamp-1 ${
                            isPlaying ? 'text-[#00a89d] font-black' : 'text-slate-200'
                          }`}>
                            {lesson.title}
                          </p>
                          <p className="text-[10px] font-medium text-slate-500 mt-0.5">
                            {isPlaying ? '▶ Đang phát' : isCompleted ? '✓ Đã học' : 'Chưa học'}
                          </p>
                        </div>
                      </div>

                      <div className="shrink-0">
                        {isCompleted ? (
                          <div className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" /></svg>
                          </div>
                        ) : isPlaying ? (
                          <span className="w-2.5 h-2.5 bg-[#00a89d] rounded-full animate-ping block"></span>
                        ) : (
                          <svg className="w-4 h-4 text-slate-600" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" /></svg>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

      </div>
    </div>
  );
};

export default Classroom;
