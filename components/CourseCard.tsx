
import React, { useState, useMemo } from 'react';
import { Course } from '../types';
import { Link } from "react-router-dom";

interface CourseCardProps {
  course: Course;
  isOwned?: boolean;
  isVipAvailable?: boolean;
  progress?: number;
  onSelect?: (course: Course) => void;
  onClaimCourse?: (course: Course) => void;
  isClaiming?: boolean;
}

const getOptimizedUrl = (url: string, width: number) => {
  if (!url) return '';
  if (url.includes('images.unsplash.com')) {
      const baseUrl = url.split('?')[0];
      return `${baseUrl}?auto=format&fit=crop&q=80&w=${width}`;
  }
  return url;
};

// Định nghĩa màu sắc badge dựa trên danh mục
const CATEGORY_STYLES: Record<string, { bg: string, text: string }> = {
  'ISO': { bg: 'bg-[#007c76]/10', text: 'text-[#007c76]' },
  'HACCP': { bg: 'bg-orange-50', text: 'text-orange-600' },
  'QA/QC': { bg: 'bg-blue-50', text: 'text-blue-600' },
  'LEAN': { bg: 'bg-amber-50', text: 'text-amber-600' },
  'SẢN XUẤT': { bg: 'bg-emerald-50', text: 'text-emerald-600' },
  'QUẢN TRỊ': { bg: 'bg-slate-50', text: 'text-slate-600' },
};

const CourseCard: React.FC<CourseCardProps> = React.memo(({ 
  course, 
  isOwned = false, 
  isVipAvailable = false, 
  progress = 0, 
  onSelect,
  onClaimCourse,
  isClaiming = false
}) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);
  
  const style = useMemo(() => {
    const cat = (course.category || 'ISO').toUpperCase();
    return CATEGORY_STYLES[cat] || { bg: 'bg-gray-50', text: 'text-gray-600' };
  }, [course.category]);

  const stats = useMemo(() => ({
    lessons: Math.floor(Math.random() * 10) + 15,
    hours: Math.floor(Math.random() * 5) + 3
  }), [course.id]);

  const handleClick = (e: React.MouseEvent) => {
    if (onSelect) {
      e.preventDefault();
      onSelect(course);
    }
  };

  const handleClaimClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (onClaimCourse && !isClaiming) {
      onClaimCourse(course);
    }
  };

  const targetUrl = isOwned ? `/hoc/${course.id}` : `/khoa-hoc/${course.id}`;

  return (
    <Link to={targetUrl} onClick={handleClick} className="block h-full group relative">
        <div className="bg-white rounded-[24px] overflow-hidden shadow-sm hover-lift border border-gray-100 flex flex-col h-full">
            {/* Image Container */}
            <div className="relative aspect-[16/10] overflow-hidden bg-gray-100">
                <div className={`absolute inset-0 bg-gray-200 animate-pulse transition-opacity duration-500 ${isLoaded ? 'opacity-0' : 'opacity-100'}`} />
                
                <img
                    src={getOptimizedUrl(course.image, 600)}
                    alt={course.title}
                    loading="lazy"
                    decoding="async"
                    onLoad={() => setIsLoaded(true)}
                    onError={() => setHasError(true)}
                    className={`w-full h-full object-cover transition-all duration-700 group-hover:scale-110 ${isLoaded ? 'opacity-100 blur-0' : 'opacity-0 blur-sm'}`}
                />
                
                {/* Floating Category Badge */}
                <div className={`absolute top-4 left-4 ${style.bg} ${style.text} backdrop-blur-md px-3 py-1.5 rounded-full z-10 shadow-sm text-[10px] font-black uppercase tracking-widest border border-white/50`}>
                    {course.category}
                </div>

                {/* Owned Badge */}
                {isOwned && (
                   <div className="absolute top-4 right-4 bg-emerald-500 text-white px-3 py-1.5 rounded-full z-10 shadow-md text-[10px] font-black uppercase tracking-widest flex items-center gap-1">
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" /></svg>
                      Đã sở hữu
                   </div>
                )}

                {/* VIP Available Badge */}
                {!isOwned && isVipAvailable && (
                   <div className="absolute top-4 right-4 bg-gradient-to-r from-amber-500 to-yellow-500 text-white px-3 py-1.5 rounded-full z-10 shadow-md text-[10px] font-black uppercase tracking-widest flex items-center gap-1 border border-white/40 animate-pulse">
                      <span>⭐</span> VIP Free
                   </div>
                )}
            </div>
            
            {/* Card Content */}
            <div className="p-5 flex flex-col flex-grow">
                <div className="flex items-center gap-3 mb-3">
                    <div className="flex items-center text-[11px] font-bold text-gray-400">
                        <svg className="w-3.5 h-3.5 mr-1 text-[#007c76]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg>
                        {stats.lessons} bài học
                    </div>
                </div>

                <h3 className="font-black text-lg text-gray-800 mb-4 line-clamp-2 leading-[1.3] group-hover:text-[#007c76] transition-colors">
                    {course.title}
                </h3>
                
                {isOwned ? (
                    <div className="mt-auto pt-4 border-t border-gray-50 flex items-center justify-between">
                        <span className="text-xs font-bold text-emerald-600 uppercase tracking-widest flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                          Vào phòng học ngay
                        </span>
                        <div className="w-10 h-10 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center group-hover:bg-emerald-600 group-hover:text-white transition-colors">
                            <svg className="w-5 h-5 transform group-hover:translate-x-0.5 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 12h14M12 5l7 7-7 7" /></svg>
                        </div>
                    </div>
                ) : isVipAvailable ? (
                    <div className="mt-auto pt-4 border-t border-gray-50 flex items-center justify-between gap-2">
                        {onClaimCourse ? (
                          <button
                            type="button"
                            onClick={handleClaimClick}
                            disabled={isClaiming}
                            className="w-full py-2.5 px-4 bg-gradient-to-r from-amber-500 via-yellow-500 to-amber-600 hover:from-amber-600 hover:to-yellow-600 text-white rounded-xl font-black text-xs uppercase tracking-wider shadow-md shadow-amber-500/20 hover:shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-95"
                          >
                            {isClaiming ? (
                              <>
                                <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                <span>Đang nhận...</span>
                              </>
                            ) : (
                              <>
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 4v16m8-8H4" /></svg>
                                <span>Nhận khóa học ngay</span>
                              </>
                            )}
                          </button>
                        ) : (
                          <>
                            <span className="text-xs font-bold text-yellow-600 uppercase tracking-widest">Nhận khóa học</span>
                            <div className="w-10 h-10 bg-yellow-50 text-yellow-600 rounded-xl flex items-center justify-center group-hover:bg-yellow-500 group-hover:text-white transition-colors shadow-sm">
                                <svg className="w-5 h-5 transform group-hover:scale-110 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" /></svg>
                            </div>
                          </>
                        )}
                    </div>
                ) : (
                    <div className="mt-auto flex items-center justify-between pt-4 border-t border-gray-50">
                        <div className="flex flex-col">
                            <span className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Học phí</span>
                            <p className="text-[#007c76] font-black text-lg md:text-xl">
                                {course.price || 'Miễn phí'}
                            </p>
                        </div>
                        <div className="w-10 h-10 rounded-2xl bg-[#007c76] text-white flex items-center justify-center shadow-lg shadow-[#007c76]/20 transform transition-all group-hover:scale-110 group-hover:rotate-6">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M12 4v16m8-8H4" /></svg>
                        </div>
                    </div>
                )}
            </div>
        </div>
    </Link>
  );
});

export default CourseCard;
