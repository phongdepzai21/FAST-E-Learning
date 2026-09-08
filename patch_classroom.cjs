const fs = require('fs');

let code = fs.readFileSync('pages/Classroom.tsx', 'utf8');

// 1. Import ReactPlayer
if (!code.includes("import ReactPlayer")) {
    code = code.replace(
        "import { PersonalNotesSidebar } from '../components/PersonalNotesSidebar';",
        "import { PersonalNotesSidebar } from '../components/PersonalNotesSidebar';\nimport ReactPlayer from 'react-player';"
    );
}

// 2. Add video timestamps state
if (!code.includes("const [videoTimestamps")) {
    code = code.replace(
        "const videoRef = useRef<HTMLVideoElement>(null);",
        "const videoRef = useRef<HTMLVideoElement>(null);\n  const reactPlayerRef = useRef<any>(null);\n  const [videoTimestamps, setVideoTimestamps] = useState<Record<string, number>>({});\n  const videoTimestampsRef = useRef<Record<string, number>>({});\n  const lastSyncedTimestampRef = useRef<number>(0);"
    );
}

// 3. Update state from firestore
if (code.includes("setCourseProgress(data.progress || 0);")) {
    code = code.replace(
        "setCourseProgress(data.progress || 0);",
        "setCourseProgress(data.progress || 0);\n              if (data.videoTimestamps) {\n                setVideoTimestamps(data.videoTimestamps);\n                videoTimestampsRef.current = data.videoTimestamps;\n              }"
    );
}

// 4. Implement handleTimestampUpdate
if (!code.includes("handleTimestampUpdate")) {
    code = code.replace(
        "const togglePiP = async () => {",
        `const handleTimestampUpdate = (time: number) => {
    if (Math.abs(time - (videoTimestampsRef.current[\`\${currentIdx}\`] || 0)) < 1) return;
    
    setVideoTimestamps(prev => {
      const next = { ...prev, [\`\${currentIdx}\`]: time };
      videoTimestampsRef.current = next;
      return next;
    });

    if (Math.abs(time - lastSyncedTimestampRef.current) >= 5) {
      lastSyncedTimestampRef.current = time;
      if (currentUser?.email && courseId) {
        const userDocRef = doc(db, "users", currentUser.email, "purchased_courses", courseId);
        setDoc(userDocRef, {
          videoTimestamps: videoTimestampsRef.current
        }, { merge: true }).catch(e => console.error("Error syncing timestamp:", e));
      }
    }
  };

  const parsedVideoUrl = useMemo(() => {
    let url = activeVideoUrl;
    const match = url.match(/<iframe[^>]*\\ssrc=["']([^"']+)["'][^>]*>/i);
    if (match) url = match[1];
    return url;
  }, [activeVideoUrl]);

  const canUseReactPlayer = ReactPlayer.canPlay(parsedVideoUrl);

  const togglePiP = async () => {`
    );
}

// 5. Replace render block
const renderRegex = /<iframe[^>]*\ssrc=\{videoEmbed.embedUrl\}[^>]*>[\s\S]*?(?=\) : \(\s*<div className="flex flex-col items-center justify-center gap-2)/;
const replacement = `{canUseReactPlayer ? (
                <ReactPlayer
                  ref={reactPlayerRef}
                  key={parsedVideoUrl}
                  url={parsedVideoUrl}
                  width="100%"
                  height="100%"
                  controls
                  playing
                  playsinline
                  onReady={(player) => {
                    const savedTime = videoTimestampsRef.current[\`\${currentIdx}\`] || 0;
                    if (savedTime > 0) {
                      player.seekTo(savedTime, 'seconds');
                    }
                  }}
                  onProgress={(state) => {
                    handleTimestampUpdate(state.playedSeconds);
                  }}
                  onEnded={() => {
                    handleUpdateProgress(currentIdx);
                    if (currentIdx < curriculum.length - 1) {
                      setCurrentIdx(currentIdx + 1);
                    }
                  }}
                />
              ) : videoEmbed.isEmbed && videoEmbed.embedUrl ? (
                <iframe 
                  key={videoEmbed.embedUrl}
                  src={videoEmbed.embedUrl} 
                  className="w-full h-full border-0"
                  title={currentLesson?.title || "Video bài giảng"}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share; fullscreen; speaker-selection; screen-wake-lock; execution-while-out-of-viewport; execution-while-not-rendered"
                  allowFullScreen
                  referrerPolicy="strict-origin-when-cross-origin"
                />
              ) : activeVideoUrl ? (
                <video 
                  ref={videoRef}
                  key={activeVideoUrl}
                  src={videoEmbed.embedUrl || activeVideoUrl} 
                  controls 
                  autoPlay
                  playsInline
                  // @ts-ignore
                  webkit-playsinline="true"
                  x5-playsinline="true"
                  className="w-full h-full object-contain"
                  poster={course?.image}
                  onTimeUpdate={(e) => {
                    handleTimestampUpdate(e.currentTarget.currentTime);
                  }}
                  onLoadedMetadata={(e) => {
                    const savedTime = videoTimestampsRef.current[\`\${currentIdx}\`] || 0;
                    if (savedTime > 0 && e.currentTarget.seekable.length > 0) {
                      e.currentTarget.currentTime = savedTime;
                    }
                  }}
                  onPlay={() => {
                    if ('mediaSession' in navigator) navigator.mediaSession.playbackState = 'playing';
                  }}
                  onPause={() => {
                    if ('mediaSession' in navigator) navigator.mediaSession.playbackState = 'paused';
                  }}
                  onEnterPictureInPicture={() => setIsPiPActive(true)}
                  onLeavePictureInPicture={() => setIsPiPActive(false)}
                  onEnded={() => {
                    handleUpdateProgress(currentIdx);
                    if (currentIdx < curriculum.length - 1) {
                      setCurrentIdx(currentIdx + 1);
                    }
                  }}
                />
              `;

code = code.replace(
  /videoEmbed\.isEmbed && videoEmbed\.embedUrl \? \([\s\S]*?(?=\) : \(\s*<div className="flex flex-col items-center justify-center gap-2 p-8 text-center text-slate-400">)/,
  replacement
);

fs.writeFileSync('pages/Classroom.tsx', code);
