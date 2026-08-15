import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { useLocation } from 'react-router-dom';

export interface ActiveVideoInfo {
  videoUrl: string;
  title: string;
  courseId?: string;
  courseTitle?: string;
  lessonIndex?: number;
}

interface GlobalPlayerContextType {
  activeVideo: ActiveVideoInfo | null;
  isPlaying: boolean;
  isMinimized: boolean;
  playVideo: (info: ActiveVideoInfo) => void;
  stopVideo: () => void;
  toggleMinimize: () => void;
  setIsMinimized: (val: boolean) => void;
  shouldShowFloatingPlayer: boolean;
}

const GlobalPlayerContext = createContext<GlobalPlayerContextType | undefined>(undefined);

export const GlobalPlayerProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [activeVideo, setActiveVideo] = useState<ActiveVideoInfo | null>(() => {
    try {
      const saved = sessionStorage.getItem('active_floating_video');
      if (saved) return JSON.parse(saved);
    } catch {
      // ignore
    }
    return null;
  });

  const [isPlaying, setIsPlaying] = useState<boolean>(() => {
    return !!activeVideo;
  });

  const [isMinimized, setIsMinimized] = useState<boolean>(false);
  const location = useLocation();

  // Save active video in session for page reload continuity
  useEffect(() => {
    if (activeVideo) {
      sessionStorage.setItem('active_floating_video', JSON.stringify(activeVideo));
    } else {
      sessionStorage.removeItem('active_floating_video');
    }
  }, [activeVideo]);

  const playVideo = useCallback((info: ActiveVideoInfo) => {
    if (!info || !info.videoUrl) return;
    setActiveVideo(info);
    setIsPlaying(true);
  }, []);

  const stopVideo = useCallback(() => {
    setActiveVideo(null);
    setIsPlaying(false);
    sessionStorage.removeItem('active_floating_video');
  }, []);

  const toggleMinimize = useCallback(() => {
    setIsMinimized(prev => !prev);
  }, []);

  // Determine if the floating player should be displayed
  // If the user is currently inside the Classroom page of the SAME course,
  // we suppress the floating player to let the main classroom theater player take over.
  // When they navigate to ANY other page (Home, Account, Courses, Consulting, etc.),
  // the floating player automatically surfaces and continues playing without interruption!
  const isCurrentCourseClassroom = activeVideo?.courseId 
    ? (location.pathname === `/hoc/${activeVideo.courseId}` || location.pathname === `/hoc-bai/${activeVideo.courseId}`)
    : false;

  const shouldShowFloatingPlayer = !!activeVideo && isPlaying && !isCurrentCourseClassroom;

  return (
    <GlobalPlayerContext.Provider
      value={{
        activeVideo,
        isPlaying,
        isMinimized,
        playVideo,
        stopVideo,
        toggleMinimize,
        setIsMinimized,
        shouldShowFloatingPlayer
      }}
    >
      {children}
    </GlobalPlayerContext.Provider>
  );
};

export const useGlobalPlayer = () => {
  const context = useContext(GlobalPlayerContext);
  if (!context) {
    throw new Error('useGlobalPlayer must be used within a GlobalPlayerProvider');
  }
  return context;
};
