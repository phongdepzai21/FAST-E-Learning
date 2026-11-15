import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  getViewedCourses, 
  clearViewedCourses, 
  ViewedCourseRecord 
} from '../utils/courseTrackingService';
import { getMergedCourses, getVideoEmbedInfo, extractLessonsFlat } from '../constants';
import { CustomVideoPlayer } from '../components/CustomVideoPlayer';
import { Course } from '../types';
import { 
  Eye, 
  Trash2, 
  Search, 
  Clock, 
  ArrowRight, 
  BookOpen, 
  Mail, 
  Phone, 
  Sparkles, 
  HelpCircle,
  ExternalLink,
  X,
  PlayCircle
} from 'lucide-react';
import { useToast } from '../contexts/ToastContext';

interface ViewedCoursesViewProps {
  userEmail?: string | null;
}

export const ViewedCoursesView: React.FC<ViewedCoursesViewProps> = ({ userEmail }) => {
  const navigate = useNavigate();
  const toast = useToast();
  const [courses, setCourses] = useState<ViewedCourseRecord[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [previewCourseId, setPreviewCourseId] = useState<string | null>(null);

  const loadViewedCourses = () => {
    const list = getViewedCourses(userEmail);
    setCourses(list);
  };

  useEffect(() => {
    loadViewedCourses();

    const handleUpdate = () => {
      loadViewedCourses();
    };

    window.addEventListener('course_viewed', handleUpdate);
    window.addEventListener('storage', handleUpdate);

    return () => {
      window.removeEventListener('course_viewed', handleUpdate);
      window.removeEventListener('storage', handleUpdate);
    };
  }, [userEmail]);

  const handleClear = () => {
    if (window.confirm('Bạn có chắc chắn muốn xóa toàn bộ lịch sử các khóa học đã xem?')) {
      clearViewedCourses(userEmail);
      setCourses([]);
      toast.success('Đã xóa sạch lịch sử khóa học đã xem.');
    }
  };

  const filteredCourses = courses.filter(c => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      (c.title && c.title.toLowerCase().includes(q)) ||
      (c.category && c.category.toLowerCase().includes(q)) ||
      (c.description && c.description.toLowerCase().includes(q))
    );
  });

  const formatViewTime = (isoString: string) => {
    try {
      const d = new Date(isoString);
      return d.toLocaleString('vi-VN', {
        hour: '2-digit',
        minute: '2-digit',
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      });
    } catch (e) {
      return isoString;
    }
  };

  // Find full course object for modal preview
  const allMergedCourses = useMemo(() => getMergedCourses([]), []);
  const activePreviewCourse = useMemo((): Course | null => {
    if (!previewCourseId) return null;
    const found = allMergedCourses.find(c => c.id === previewCourseId) || courses.find(c => c.id === previewCourseId);
    if (!found) return null;
    return {
      id: found.id,
      title: found.title,
      price: found.price || '599.000đ',
      image: found.image || 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3',
      category: found.category || 'ISO',
      description: found.description || '',
      curriculum: (found as any).curriculum
    };
  }, [previewCourseId, allMergedCourses, courses]);

  const previewLessons = useMemo(() => {
    if (!activePreviewCourse || !activePreviewCourse.curriculum) {
      return [{ title: 'Bài giảng Preview: Giới thiệu khóa học', videoUrl: 'https://www.youtube.com/watch?v=ScMzIvxBSi4', isPreview: true }];
    }
    const flat = extractLessonsFlat(activePreviewCourse.curriculum);
    return flat.length > 0 ? flat : [{ title: 'Bài giảng Preview: Giới thiệu khóa học', videoUrl: 'https://www.youtube.com/watch?v=ScMzIvxBSi4', isPreview: true }];
  }, [activePreviewCourse]);

  const [selectedLessonIdx, setSelectedLessonIdx] = useState(0);
  const currentPreviewLesson = previewLessons[selectedLessonIdx] || previewLessons[0];
  const videoUrlToPlay = currentPreviewLesson?.videoUrl || 'https://www.youtube.com/watch?v=ScMzIvxBSi4';

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      
      {/* Header Banner */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="px-3 py-1 rounded-full bg-teal-50 text-[#007c76] border border-teal-200/60 text-[11px] font-black uppercase tracking-wider flex items-center gap-1.5">
              <Eye className="w-3.5 h-3.5" />
              <span>Lịch sử duyệt khóa học</span>
            </span>
            <span className="text-xs font-bold text-slate-400">
              Tổng số: <strong className="text-slate-800">{courses.length}</strong> khóa
            </span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-black text-slate-900 uppercase tracking-tight">
            Khóa Học Bạn Đã Xem
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 font-medium">
            Hệ thống tự động theo dõi và ghi nhận các bài giảng bạn đã quan tâm tìm hiểu trên toàn nền tảng.
          </p>
        </div>

        {courses.length > 0 && (
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleClear}
              className="px-4 py-2.5 rounded-2xl bg-slate-50 hover:bg-rose-50 text-slate-600 hover:text-rose-600 border border-slate-200 hover:border-rose-200 text-xs font-bold transition flex items-center gap-2 cursor-pointer"
              title="Xóa danh sách lịch sử đã xem"
            >
              <Trash2 className="w-4 h-4" />
              <span>Xóa lịch sử</span>
            </button>
            <button
              type="button"
              onClick={() => navigate('/khoa-hoc')}
              className="px-5 py-2.5 rounded-2xl bg-[#007c76] hover:bg-[#00605c] text-white text-xs font-black uppercase tracking-wider transition shadow-sm flex items-center gap-2 cursor-pointer"
            >
              <span>Xem thêm khóa</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      {/* Filter / Search Bar */}
      {courses.length > 0 && (
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-4 top-3.5 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Tìm kiếm trong danh sách khóa học bạn đã xem..."
            className="w-full pl-11 pr-4 py-3 bg-white border border-slate-200 rounded-2xl text-xs sm:text-sm font-semibold text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[#007c76] shadow-2xs transition"
          />
        </div>
      )}

      {/* Courses Grid */}
      {filteredCourses.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredCourses.map((c) => (
            <div
              key={c.id}
              className="bg-white rounded-3xl border border-slate-200/80 overflow-hidden shadow-xs hover:shadow-lg transition-all duration-300 flex flex-col group hover:-translate-y-1"
            >
              {/* Thumbnail */}
              <div 
                className="relative h-44 overflow-hidden bg-slate-100 shrink-0 cursor-pointer"
                onClick={() => {
                  setSelectedLessonIdx(0);
                  setPreviewCourseId(c.id);
                }}
              >
                <img
                  src={c.image || 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&q=80&w=800'}
                  alt={c.title}
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&q=80&w=800';
                  }}
                />
                <div className="absolute top-3 left-3 flex items-center gap-1.5">
                  <span className="px-2.5 py-1 rounded-xl bg-slate-950/70 backdrop-blur-md text-white text-[10px] font-black uppercase tracking-wider">
                    {c.category || 'ISO'}
                  </span>
                </div>
                <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <span className="px-4 py-2 bg-teal-500 text-slate-950 font-black text-xs rounded-xl shadow-lg flex items-center gap-1.5">
                    <PlayCircle className="w-4 h-4" />
                    <span>Xem bản xem trước</span>
                  </span>
                </div>
                {c.viewCount && c.viewCount > 1 && (
                  <div className="absolute bottom-3 left-3 bg-teal-950/80 backdrop-blur-md text-teal-200 px-2.5 py-1 rounded-xl text-[10px] font-black uppercase tracking-wider flex items-center gap-1">
                    <Eye className="w-3 h-3 text-teal-300" />
                    <span>Đã xem {c.viewCount} lần</span>
                  </div>
                )}
              </div>

              {/* Content */}
              <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                <div className="space-y-1.5">
                  <h3 
                    onClick={() => {
                      setSelectedLessonIdx(0);
                      setPreviewCourseId(c.id);
                    }}
                    className="w-full text-base font-black text-slate-900 leading-[1.5] tracking-[0.015em] break-words [overflow-wrap:break-word] hover:text-[#007c76] transition-colors cursor-pointer"
                  >
                    {c.title}
                  </h3>
                  {c.description && (
                    <p className="text-xs text-slate-500 font-medium line-clamp-2 leading-relaxed">
                      {c.description}
                    </p>
                  )}
                </div>

                <div className="pt-3 border-t border-slate-100 space-y-3">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-[11px] text-slate-400 flex items-center gap-1 font-medium">
                      <Clock className="w-3 h-3" />
                      <span>{formatViewTime(c.viewedAt)}</span>
                    </span>
                    <span className="font-extrabold text-[#007c76]">
                      {c.price || '599.000đ'}
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setSelectedLessonIdx(0);
                      setPreviewCourseId(c.id);
                    }}
                    className="w-full py-2.5 bg-[#007c76] hover:bg-[#00605c] text-white rounded-xl text-xs font-black uppercase tracking-wider transition flex items-center justify-center gap-2 cursor-pointer shadow-2xs"
                  >
                    <PlayCircle className="w-4 h-4" />
                    <span>Xem bản xem trước</span>
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-white rounded-3xl p-12 text-center border border-slate-200 space-y-4">
          <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mx-auto text-slate-400">
            <BookOpen className="w-8 h-8" />
          </div>
          <h3 className="text-lg font-bold text-slate-800">
            {searchQuery ? 'Không tìm thấy kết quả phù hợp' : 'Bạn chưa xem khóa học nào'}
          </h3>
          <p className="text-xs sm:text-sm text-slate-500 max-w-md mx-auto">
            {searchQuery 
              ? 'Hãy thử tìm kiếm với từ khóa khác.'
              : 'Hãy duyệt qua trang Khóa học của FAST để tìm các chương trình đào tạo chuẩn hóa ISO, HACCP & VietGAP.'}
          </p>
          <button
            type="button"
            onClick={() => navigate('/khoa-hoc')}
            className="px-6 py-3 bg-[#007c76] hover:bg-[#00605c] text-white rounded-2xl text-xs font-black uppercase tracking-wider transition shadow-sm cursor-pointer"
          >
            Khám phá danh sách khóa học
          </button>
        </div>
      )}

      {/* COURSE PREVIEW MODAL DIRECTLY AT ACCOUNT PAGE */}
      {previewCourseId && activePreviewCourse && (
        <div 
          className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200"
          onClick={() => setPreviewCourseId(null)}
        >
          <div 
            className="bg-[#0f172a] border border-white/10 rounded-3xl max-w-4xl w-full max-h-[90vh] overflow-y-auto shadow-2xl text-slate-100 p-6 sm:p-8 space-y-6 relative"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setPreviewCourseId(null)}
              className="absolute top-6 right-6 p-2 rounded-full bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Modal Header */}
            <div className="space-y-2 pr-10">
              <div className="flex items-center gap-2">
                <span className="px-3 py-1 rounded-md text-[10px] font-black uppercase tracking-wider bg-teal-500/20 text-teal-300 border border-teal-500/30">
                  {activePreviewCourse.category || 'ISO / HACCP'}
                </span>
                <span className="text-xs font-bold text-teal-400">Xem bản xem trước trực tiếp</span>
              </div>
              <h3 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                {activePreviewCourse.title}
              </h3>
              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed font-medium">
                {activePreviewCourse.description}
              </p>
            </div>

            {/* Video Player Box */}
            <div className="bg-black rounded-2xl overflow-hidden aspect-video relative shadow-2xl border border-white/10 flex items-center justify-center">
              <CustomVideoPlayer
                key={videoUrlToPlay}
                parsedVideoUrl={videoUrlToPlay}
                course={activePreviewCourse}
                savedTime={0}
                onProgress={() => {}}
                onEnded={() => {}}
                onError={() => {}}
              />
            </div>

            {/* Preview Lessons Selector */}
            <div className="space-y-3">
              <h4 className="text-xs font-black uppercase tracking-wider text-teal-400 flex items-center gap-2">
                <PlayCircle className="w-4 h-4" />
                <span>Danh sách bài giảng xem trước ({previewLessons.length} bài)</span>
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto pr-1">
                {previewLessons.map((l: any, idx: number) => (
                  <button
                    key={idx}
                    onClick={() => setSelectedLessonIdx(idx)}
                    className={`p-3 rounded-xl text-left text-xs font-bold transition flex items-center justify-between border cursor-pointer ${
                      selectedLessonIdx === idx
                        ? 'bg-teal-500 text-slate-950 border-teal-400 shadow-md'
                        : 'bg-white/5 hover:bg-white/10 text-slate-200 border-white/10'
                    }`}
                  >
                    <span className="line-clamp-1">{idx + 1}. {l.title || `Bài ${idx + 1}`}</span>
                    <span className={`text-[10px] font-mono px-2 py-0.5 rounded shrink-0 ${
                      selectedLessonIdx === idx ? 'bg-black/20 text-slate-950' : 'bg-teal-500/20 text-teal-300'
                    }`}>
                      Preview
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Modal Actions */}
            <div className="pt-4 border-t border-white/10 flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium text-slate-400">Học phí:</span>
                <span className="text-base font-black text-teal-400">{activePreviewCourse.price || '599.000đ'}</span>
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setPreviewCourseId(null)}
                  className="px-5 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold transition cursor-pointer"
                >
                  Đóng
                </button>
                <button
                  onClick={() => {
                    setPreviewCourseId(null);
                    navigate(`/khoa-hoc/${activePreviewCourse.id}`);
                  }}
                  className="px-6 py-2.5 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 text-xs font-black uppercase tracking-wider transition shadow-lg cursor-pointer flex items-center gap-2"
                >
                  <span>Đăng ký / Vào học chi tiết</span>
                  <ExternalLink className="w-4 h-4" />
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* Support & Contact Footer Block */}
      <div className="bg-gradient-to-br from-slate-900 to-[#004d49] text-white rounded-3xl p-6 sm:p-8 shadow-lg flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2 text-teal-300">
            <HelpCircle className="w-4 h-4" />
            <span className="text-xs font-black uppercase tracking-widest">Hỗ Trợ Học Viên &amp; Kích Hoạt Khóa Học</span>
          </div>
          <p className="text-xs text-slate-300 max-w-xl leading-relaxed">
            Bạn cần kích hoạt khóa học nhanh, xuất hóa đơn VAT công ty hoặc tư vấn chuyên môn? Đội ngũ hỗ trợ FAST luôn sẵn sàng 24/7.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full md:w-auto shrink-0">
          <a
            href="mailto:hkc.qms@gmail.com"
            className="px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 text-xs font-bold text-teal-200 transition flex items-center justify-center gap-2"
          >
            <Mail className="w-3.5 h-3.5 text-teal-300" />
            <span>hkc.qms@gmail.com</span>
          </a>
          <a
            href="mailto:support@fastelearning.com.vn"
            className="px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 text-xs font-bold text-teal-200 transition flex items-center justify-center gap-2"
          >
            <Mail className="w-3.5 h-3.5 text-teal-300" />
            <span>support@fastelearning.com.vn</span>
          </a>
          <a
            href="tel:0927002668"
            className="px-4 py-2.5 rounded-xl bg-[#007c76] hover:bg-[#00928b] text-white text-xs font-black uppercase tracking-wider transition flex items-center justify-center gap-2 shadow-sm"
          >
            <Phone className="w-3.5 h-3.5" />
            <span>0927 002 668</span>
          </a>
        </div>
      </div>

    </div>
  );
};
