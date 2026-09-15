import React, { useRef, useState, useEffect } from 'react';
import ReactPlayer from 'react-player';
import { Play, Pause, Volume2, VolumeX, Maximize, Minimize } from 'lucide-react';
import { Course } from '../types';

interface CustomVideoPlayerProps {
  parsedVideoUrl: string;
  course?: Course;
  savedTime?: number;
  onProgress?: (playedSeconds: number) => void;
  onEnded?: () => void;
  onError?: () => void;
  onPiPToggle?: (isActive: boolean) => void;
}

export const CustomVideoPlayer: React.FC<CustomVideoPlayerProps> = ({
  parsedVideoUrl,
  course,
  savedTime = 0,
  onProgress,
  onEnded,
  onError,
  onPiPToggle
}) => {
  const playerRef = useRef<ReactPlayer>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const [playing, setPlaying] = useState(true);
  const [volume, setVolume] = useState(1);
  const [muted, setMuted] = useState(false);
  const [played, setPlayed] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showControls, setShowControls] = useState(true);

  // Time formatting
  const formatTime = (seconds: number) => {
    if (isNaN(seconds)) return '00:00';
    const date = new Date(seconds * 1000);
    const hh = date.getUTCHours();
    const mm = date.getUTCMinutes();
    const ss = date.getUTCSeconds().toString().padStart(2, '0');
    if (hh) {
      return `${hh}:${mm.toString().padStart(2, '0')}:${ss}`;
    }
    return `${mm}:${ss}`;
  };

  const handlePlayPause = () => setPlaying(!playing);
  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setVolume(parseFloat(e.target.value));
    setMuted(parseFloat(e.target.value) === 0);
  };
  const handleToggleMute = () => {
    if (muted) setVolume(1);
    setMuted(!muted);
  };
  const handleSeekChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPlayed(parseFloat(e.target.value));
  };
  const handleSeekMouseUp = (e: React.MouseEvent<HTMLInputElement>) => {
    playerRef.current?.seekTo(parseFloat((e.target as HTMLInputElement).value));
  };
  const handleToggleFullscreen = () => {
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen().catch(err => {
        console.error(`Error attempting to enable fullscreen: ${err.message}`);
      });
    } else {
      document.exitFullscreen();
    }
  };

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  return (
    <div 
      ref={containerRef} 
      className="relative w-full h-full bg-black group flex items-center justify-center overflow-hidden"
      onMouseMove={() => setShowControls(true)}
      onMouseLeave={() => setShowControls(false)}
    >
      {/* Video layer - pointer-events-none to prevent interactions with the video element itself */}
      <div className="absolute inset-0 pointer-events-none">
        <ReactPlayer
          ref={playerRef}
          url={parsedVideoUrl}
          width="100%"
          height="100%"
          controls={false}
          playing={playing}
          volume={volume}
          muted={muted}
          playsinline
          onReady={() => {
            if (savedTime > 0) {
              playerRef.current?.seekTo(savedTime, 'seconds');
            }
          }}
          onProgress={(state) => {
            setPlayed(state.played);
            if (onProgress) onProgress(state.playedSeconds);
          }}
          onDuration={(duration) => setDuration(duration)}
          onEnded={onEnded}
          onError={onError}
        />
      </div>

      {/* Overlay layer - capturing clicks and preventing default video element interactions */}
      <div 
        className="absolute inset-0 cursor-pointer"
        onClick={handlePlayPause}
      />

      {/* Controls Overlay */}
      <div 
        className={`absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent p-4 flex flex-col gap-2 transition-opacity duration-300 ${
          showControls || !playing ? 'opacity-100' : 'opacity-0'
        }`}
      >
        {/* Progress Bar */}
        <div className="flex items-center gap-2">
          <input
            type="range"
            min={0}
            max={0.999999}
            step="any"
            value={played}
            onMouseDown={() => setPlaying(false)}
            onChange={handleSeekChange}
            onMouseUp={(e) => {
              handleSeekMouseUp(e);
              setPlaying(true);
            }}
            className="w-full h-1.5 bg-white/30 rounded-lg appearance-none cursor-pointer accent-teal-500 hover:h-2 transition-all"
          />
        </div>

        {/* Controls Row */}
        <div className="flex items-center justify-between text-white mt-1">
          <div className="flex items-center gap-4">
            <button onClick={handlePlayPause} className="hover:text-teal-400 transition-colors">
              {playing ? <Pause className="w-6 h-6 fill-current" /> : <Play className="w-6 h-6 fill-current" />}
            </button>
            <div className="flex items-center gap-2 group/vol">
              <button onClick={handleToggleMute} className="hover:text-teal-400 transition-colors">
                {muted || volume === 0 ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
              </button>
              <input
                type="range"
                min={0}
                max={1}
                step="any"
                value={muted ? 0 : volume}
                onChange={handleVolumeChange}
                className="w-0 opacity-0 group-hover/vol:w-20 group-hover/vol:opacity-100 transition-all duration-300 h-1.5 bg-white/30 rounded-lg appearance-none cursor-pointer accent-teal-500"
              />
            </div>
            <div className="text-xs font-medium font-mono">
              {formatTime(played * duration)} / {formatTime(duration)}
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <button onClick={handleToggleFullscreen} className="hover:text-teal-400 transition-colors">
              {isFullscreen ? <Minimize className="w-5 h-5" /> : <Maximize className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
