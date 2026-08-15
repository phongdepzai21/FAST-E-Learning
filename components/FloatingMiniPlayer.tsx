import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useGlobalPlayer } from '../contexts/GlobalPlayerContext';
import { getVideoEmbedInfo } from '../constants';

const FloatingMiniPlayer: React.FC = () => {
  const {
    activeVideo,
    shouldShowFloatingPlayer,
    isMinimized,
    toggleMinimize,
    stopVideo
  } = useGlobalPlayer();

  const navigate = useNavigate();

  if (!shouldShowFloatingPlayer || !activeVideo) {
    return null;
  }

  const embedInfo = getVideoEmbedInfo(activeVideo.videoUrl, true);

  const handleReturnToClassroom = () => {
    if (activeVideo.courseId) {
      navigate(`/hoc/${activeVideo.courseId}`);
    }
  };

  return (
    <div className="fixed bottom-6 left-6 z-[9990] animate-in fade-in slide-in-from-bottom-5 duration-300 pointer-events-auto max-w-[calc(100vw-3rem)]">
      {isMinimized ? (
        /* MINIMIZED COMPACT AUDIO / VIDEO BAR */
        <div className="flex items-center gap-3 bg-[#0f172a]/95 backdrop-blur-xl border border-teal-500/40 px-4 py-2.5 rounded-2xl shadow-2xl text-white hover:border-teal-400 transition-all group">
          {/* Animated sound wave */}
          <div className="flex items-end gap-0.5 h-4 w-4 shrink-0 text-teal-400">
            <span className="w-1 bg-teal-400 rounded-full animate-bounce [animation-delay:0.1s] h-full"></span>
            <span className="w-1 bg-teal-400 rounded-full animate-bounce [animation-delay:0.3s] h-3/4"></span>
            <span className="w-1 bg-teal-400 rounded-full animate-bounce [animation-delay:0.2s] h-1/2"></span>
          </div>

          <div 
            onClick={handleReturnToClassroom}
            className="cursor-pointer max-w-[180px] sm:max-w-[240px] truncate select-none"
            title="Nhấn để quay lại phòng học"
          >
            <p className="text-[11px] font-black text-teal-300 uppercase tracking-wider truncate">
              {activeVideo.courseTitle || 'Đang phát video'}
            </p>
            <p className="text-xs font-semibold text-slate-200 truncate">
              {activeVideo.title}
            </p>
          </div>

          <div className="flex items-center gap-1 shrink-0 ml-1 border-l border-white/10 pl-2">
            {/* Expand button */}
            <button
              onClick={toggleMinimize}
              className="p-1.5 hover:bg-white/10 text-slate-300 hover:text-white rounded-lg transition-all"
              title="Phóng to khung xem"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
              </svg>
            </button>

            {/* Back to Classroom Button */}
            {activeVideo.courseId && (
              <button
                onClick={handleReturnToClassroom}
                className="p-1.5 hover:bg-teal-500/20 text-teal-400 rounded-lg transition-all"
                title="Vào phòng học"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M14 5l7 7m0 0l-7 7m7-7H3" />
                </svg>
              </button>
            )}

            {/* Close / Stop button */}
            <button
              onClick={stopVideo}
              className="p-1.5 hover:bg-red-500/20 text-slate-400 hover:text-red-400 rounded-lg transition-all"
              title="Tắt video"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      ) : (
        /* EXPANDED FLOATING THEATER WINDOW (PICTURE-IN-PICTURE) */
        <div className="w-[300px] sm:w-[350px] bg-[#0b1120]/95 backdrop-blur-2xl border border-teal-500/40 rounded-2xl overflow-hidden shadow-[0_20px_50px_rgba(0,0,0,0.7)] text-white flex flex-col transition-all group">
          
          {/* HEADER BAR */}
          <div className="px-3.5 py-2.5 bg-slate-900/90 border-b border-white/10 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <span className="relative flex h-2 w-2 shrink-0">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-teal-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-teal-500"></span>
              </span>
              <div className="min-w-0">
                <p className="text-[10px] font-black text-teal-300 uppercase tracking-wider truncate">
                  {activeVideo.courseTitle || 'Đang tiếp tục phát'}
                </p>
                <p className="text-xs font-bold text-slate-100 truncate">
                  {activeVideo.title}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1 shrink-0">
              {/* Back to classroom shortcut */}
              {activeVideo.courseId && (
                <button
                  onClick={handleReturnToClassroom}
                  className="px-2 py-1 bg-teal-500/20 hover:bg-teal-500/30 text-teal-300 text-[10px] font-bold rounded-lg transition-all flex items-center gap-1 border border-teal-500/30"
                  title="Vào phòng học đầy đủ"
                >
                  <span>Phòng học</span>
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M14 5l7 7m0 0l-7 7m7-7H3" />
                  </svg>
                </button>
              )}

              {/* Minimize button */}
              <button
                onClick={toggleMinimize}
                className="p-1 hover:bg-white/10 text-slate-300 hover:text-white rounded-lg transition-all"
                title="Thu nhỏ thanh phát"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {/* Stop / Close button */}
              <button
                onClick={stopVideo}
                className="p-1 hover:bg-red-500/20 text-slate-400 hover:text-red-400 rounded-lg transition-all"
                title="Đóng video"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>

          {/* VIDEO PLAYER VIEWPORT */}
          <div className="relative aspect-video w-full bg-black flex items-center justify-center overflow-hidden">
            {embedInfo.isEmbed ? (
              <iframe
                key={embedInfo.embedUrl}
                src={embedInfo.embedUrl}
                className="w-full h-full border-0"
                title={activeVideo.title}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share; fullscreen"
                allowFullScreen
                referrerPolicy="no-referrer"
              />
            ) : (
              <video
                key={embedInfo.embedUrl || activeVideo.videoUrl}
                src={embedInfo.embedUrl || activeVideo.videoUrl}
                controls
                autoPlay
                className="w-full h-full object-contain"
              />
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default FloatingMiniPlayer;
