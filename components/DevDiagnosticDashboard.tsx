import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Activity,
  Shield,
  Mail,
  Key,
  Terminal,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  RotateCw,
  Play,
  Copy,
  Trash2,
  Maximize2,
  Minimize2,
  X,
  ChevronRight,
  Search,
  Filter,
  Clock,
  User as UserIcon,
  Lock,
  RefreshCw,
  FileText,
  Check,
  Zap,
  Sliders,
  AlertOctagon,
  Eye,
  EyeOff,
  Award,
  Bell,
  Wifi,
  WifiOff,
  HelpCircle
} from 'lucide-react';
import { authDebugger, DiagnosticState, DiagnosticLogEntry, PromiseRecord } from '../utils/authDebugger';
import { auth, db } from '../firebase';
import { doc, onSnapshot, setDoc, getDoc } from 'firebase/firestore';
import { motion, AnimatePresence } from 'motion/react';
import { addCourseNotification, addApprovalNotification } from '../utils/courseNotificationService';

const REQUIRED_DEV_PASSWORD = 'Family2515@';

export const DevDiagnosticDashboard: React.FC = () => {
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [isMinimized, setIsMinimized] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<'stream' | 'auth' | 'modals' | 'emailjs' | 'tester' | 'sync' | 'control' | 'raw'>('stream');
  const [state, setState] = useState<DiagnosticState>(authDebugger.getState());
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Dev control panel states
  const [devRoleOverride, setDevRoleOverride] = useState<string | null>(() => localStorage.getItem('dev_role_override'));
  const [unlockedCourses, setUnlockedCourses] = useState<string[]>([]);
  const [customCourseId, setCustomCourseId] = useState<string>('');

  // Gamification Simulation States
  const [gamificationPoints, setGamificationPoints] = useState<number>(0);
  const [gamificationStreak, setGamificationStreak] = useState<number>(1);
  const [gamificationLessons, setGamificationLessons] = useState<number>(0);
  const [gamificationNotes, setGamificationNotes] = useState<number>(0);
  const [gamificationCourses, setGamificationCourses] = useState<number>(0);

  // Notification Simulation States
  const [notifType, setNotifType] = useState<'new' | 'updated' | 'approval'>('new');
  const [notifCourseTitle, setNotifCourseTitle] = useState<string>('Khóa học Quảng cáo Facebook Ads đỉnh cao');
  const [notifMessage, setNotifMessage] = useState<string>('Bài giảng số 5 vừa được cập nhật thêm tài liệu đính kèm.');

  const refreshUnlockedCourses = () => {
    const unlocked: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith('course_unlocked_')) {
        unlocked.push(key.replace('course_unlocked_', ''));
      }
    }
    setUnlockedCourses(unlocked);
  };

  const loadGamificationStats = async () => {
    const user = auth.currentUser;
    if (!user || !user.email) return;
    const email = user.email.toLowerCase().trim();
    const localKey = `gamification_${email}`;
    let stats = {
      points: 0,
      streakDays: 1,
      totalLessonsCompleted: 0,
      totalNotesCreated: 0,
      completedCoursesCount: 0
    };
    try {
      const cached = localStorage.getItem(localKey);
      if (cached) {
        stats = { ...stats, ...JSON.parse(cached) };
      }
    } catch (e) {}

    try {
      const docRef = doc(db, 'users', email, 'gamification', 'stats');
      const remoteSnap = await getDoc(docRef);
      if (remoteSnap.exists()) {
        const r = remoteSnap.data();
        stats = {
          ...stats,
          points: r.points !== undefined ? r.points : stats.points,
          streakDays: r.streakDays !== undefined ? r.streakDays : stats.streakDays,
          totalLessonsCompleted: r.totalLessonsCompleted !== undefined ? r.totalLessonsCompleted : stats.totalLessonsCompleted,
          totalNotesCreated: r.totalNotesCreated !== undefined ? r.totalNotesCreated : stats.totalNotesCreated,
          completedCoursesCount: r.completedCoursesCount !== undefined ? r.completedCoursesCount : stats.completedCoursesCount
        };
      }
    } catch (e) {}

    setGamificationPoints(stats.points);
    setGamificationStreak(stats.streakDays);
    setGamificationLessons(stats.totalLessonsCompleted);
    setGamificationNotes(stats.totalNotesCreated);
    setGamificationCourses(stats.completedCoursesCount);
  };

  const saveGamificationStats = async () => {
    const user = auth.currentUser;
    if (!user || !user.email) {
      alert('Vui lòng đăng nhập để lưu chỉ số học tập!');
      return;
    }
    const email = user.email.toLowerCase().trim();
    const localKey = `gamification_${email}`;
    
    let existing: any = {};
    try {
      const cached = localStorage.getItem(localKey);
      if (cached) existing = JSON.parse(cached);
    } catch (e) {}

    const updated = {
      ...existing,
      points: Number(gamificationPoints),
      streakDays: Number(gamificationStreak),
      totalLessonsCompleted: Number(gamificationLessons),
      totalNotesCreated: Number(gamificationNotes),
      completedCoursesCount: Number(gamificationCourses),
      lastActiveDate: new Date().toISOString().split('T')[0],
      level: Math.floor(Math.sqrt(Number(gamificationPoints) / 25)) + 1
    };

    try {
      localStorage.setItem(localKey, JSON.stringify(updated));
      window.dispatchEvent(new CustomEvent('gamification_updated', { detail: updated }));
      
      const docRef = doc(db, 'users', email, 'gamification', 'stats');
      await setDoc(docRef, updated, { merge: true });
      
      authDebugger.addLog({
        category: 'system',
        level: 'success',
        title: 'Cập nhật Gamification',
        details: `Đã lưu chỉ số giả lập (Điểm: ${gamificationPoints}, Chuỗi: ${gamificationStreak}) thành công!`
      });
      alert('Cập nhật chỉ số Gamification thành công!');
    } catch (e: any) {
      alert('Lỗi khi lưu chỉ số: ' + e.message);
    }
  };

  const handleDispatchNotification = () => {
    const user = auth.currentUser;
    if (notifType === 'approval') {
      addApprovalNotification({
        userEmail: user?.email || 'learner@fast.edu.vn',
        userName: user?.displayName || 'Học viên Danh dự',
        roles: { isAdmin: true, isTeacher: false, isVip: true }
      });
    } else {
      addCourseNotification({
        id: 'notif_' + Date.now(),
        title: notifCourseTitle,
        category: 'Marketing',
        image: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=400&q=80',
        price: '1.299.000đ',
        description: notifMessage
      } as any, notifType);
    }
    authDebugger.addLog({
      category: 'system',
      level: 'success',
      title: 'Đã phát thông báo',
      details: `Đã phát thông báo giả lập dạng "${notifType}" tới hệ thống.`
    });
    alert('Đã phát thông báo thành công! Vui lòng kiểm tra biểu tượng quả chuông trên Header.');
  };

  // Diagnostics and Sync Monitor States
  const [collectionTimestamps, setCollectionTimestamps] = useState<Record<string, string>>({
    attp_db: 'Chưa cập nhật',
    attp_session: 'Chưa cập nhật',
    ads_db: 'Chưa cập nhật',
    ads_session: 'Chưa cập nhật',
    fsa_session: 'Chưa cập nhật'
  });
  const [latencyMs, setLatencyMs] = useState<number | null>(null);
  const [isPinging, setIsPinging] = useState(false);
  const [isOnline, setIsOnline] = useState(typeof window !== 'undefined' ? window.navigator.onLine : true);

  // Security password protection state
  const [isUnlocked, setIsUnlocked] = useState<boolean>(() => {
    try {
      return sessionStorage.getItem('fast_dev_diag_unlocked') === 'true';
    } catch {
      return false;
    }
  });
  const [passwordInput, setPasswordInput] = useState<string>('');
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState<boolean>(false);

  // Filters
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [filterLevel, setFilterLevel] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [autoScroll, setAutoScroll] = useState<boolean>(true);
  const [expandedLogId, setExpandedLogId] = useState<string | null>(null);

  // Tester state
  const [testEmail, setTestEmail] = useState<string>('test.dev@example.com');
  const [testName, setTestName] = useState<string>('Test Developer');
  const [isTestingSend, setIsTestingSend] = useState<boolean>(false);
  const [testResult, setTestResult] = useState<any>(null);

  const logsEndRef = useRef<HTMLDivElement>(null);
  const keySequenceRef = useRef<string[]>([]);
  const lastKeyTimeRef = useRef<number>(0);
  const passwordInputRef = useRef<HTMLInputElement>(null);

  // Focus password input when unlock modal appears
  useEffect(() => {
    if (isOpen && !isUnlocked) {
      const timer = setTimeout(() => {
        passwordInputRef.current?.focus();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [isOpen, isUnlocked]);

  const handleUnlock = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (passwordInput === REQUIRED_DEV_PASSWORD) {
      setIsUnlocked(true);
      setPasswordError(null);
      setPasswordInput('');
      try {
        sessionStorage.setItem('fast_dev_diag_unlocked', 'true');
      } catch (err) {
        // ignore storage errors
      }
    } else {
      setPasswordError('Mật khẩu không chính xác! Vui lòng thử lại.');
    }
  };

  const handleLock = () => {
    setIsUnlocked(false);
    try {
      sessionStorage.removeItem('fast_dev_diag_unlocked');
    } catch (err) {
      // ignore
    }
  };

  // Subscribe to real-time events from authDebugger
  useEffect(() => {
    const unsubscribe = authDebugger.subscribe((newState) => {
      setState(newState);
    });
    return () => unsubscribe();
  }, []);

  // Keyboard shortcut listener: Ctrl + Shift + X, Ctrl + Shift + D, Ctrl + Shift + X Y Z, Ctrl + Shift + D E V, phong, etc.
  useEffect(() => {
    // Expose global console helper for convenience
    (window as any).openDevDiagnostic = () => setIsOpen(true);
    (window as any).closeDevDiagnostic = () => setIsOpen(false);

    const handleKeyDown = (e: KeyboardEvent) => {
      // Check for modifier (Ctrl/Meta + Shift)
      const hasModifier = (e.ctrlKey || e.metaKey) && e.shiftKey;
      const key = e.key.toLowerCase();

      // Direct single-chord shortcut: Ctrl + Shift + X or Ctrl + Shift + D or Ctrl + Alt + D
      if ((hasModifier && (key === 'x' || key === 'd')) || (e.ctrlKey && e.altKey && key === 'd')) {
        // Prevent default browser shortcuts where applicable
        if (key === 'x' || key === 'd') {
          e.preventDefault();
        }
        setIsOpen((prev) => !prev);
        return;
      }

      // Reset buffer if idle for more than 4 seconds
      const now = Date.now();
      if (now - lastKeyTimeRef.current > 4000) {
        keySequenceRef.current = [];
      }
      lastKeyTimeRef.current = now;

      if (hasModifier && /^[a-z0-9]$/.test(key)) {
        keySequenceRef.current.push(key);

        if (keySequenceRef.current.length > 15) {
          keySequenceRef.current = keySequenceRef.current.slice(-15);
        }

        const str = keySequenceRef.current.join('');
        // Supported sequences: xyz (primary), dev, otp, fst, phong
        if (
          str.endsWith('xyz') ||
          str.endsWith('dev') ||
          str.endsWith('otp') ||
          str.endsWith('fst') ||
          str.endsWith('phong')
        ) {
          e.preventDefault();
          keySequenceRef.current = [];
          setIsOpen((prev) => !prev);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      delete (window as any).openDevDiagnostic;
      delete (window as any).closeDevDiagnostic;
    };
  }, []);

  // Monitor network online/offline state
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      authDebugger.addLog({
        category: 'system',
        level: 'info',
        title: 'Trực tuyến',
        details: 'Kết nối internet được khôi phục. Đang kết nối lại Firestore...'
      });
    };
    const handleOffline = () => {
      setIsOnline(false);
      authDebugger.addLog({
        category: 'system',
        level: 'error',
        title: 'Ngoại tuyến',
        details: 'Mất kết nối internet. Dữ liệu sẽ lưu tạm vào local cache.'
      });
    };
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Set up real-time metadata listeners on key documents to generate live logs inside Ctrl+Shift+X
  useEffect(() => {
    const listeners: (() => void)[] = [];
    const configs = [
      { path: ['fast_food_safety_crm', 'database'], name: 'Hồ sơ ATTP (CSDL)', key: 'attp_db' },
      { path: ['fast_food_safety_crm', 'current_session'], name: 'Hồ sơ ATTP (Nháp)', key: 'attp_session' },
      { path: ['ad_profile_crm', 'database'], name: 'Hồ sơ Quảng cáo (CSDL)', key: 'ads_db' },
      { path: ['ad_profile_crm', 'current_session'], name: 'Hồ sơ Quảng cáo (Nháp)', key: 'ads_session' },
      { path: ['fast_standards_audits', 'current_session'], name: 'FSA-Checklist (Nháp)', key: 'fsa_session' }
    ];

    configs.forEach(cfg => {
      try {
        const docRef = doc(db, cfg.path[0], cfg.path[1]);
        const unsub = onSnapshot(docRef, (snap) => {
          if (snap.exists()) {
            const data = snap.data();
            const updateTime = data?.updatedAt || new Date().toISOString();
            const formattedTime = new Date(updateTime).toLocaleTimeString();
            
            setCollectionTimestamps(prev => ({
              ...prev,
              [cfg.key]: formattedTime
            }));

            authDebugger.addLog({
              category: 'system',
              level: 'success',
              title: `onSnapshot [${cfg.name}]`,
              details: `Nhận gói tin đồng bộ hóa từ xa lúc ${formattedTime}.`,
              payload: { path: `${cfg.path[0]}/${cfg.path[1]}`, updatedAt: updateTime }
            });
          }
        }, (err) => {
          authDebugger.addLog({
            category: 'system',
            level: 'error',
            title: `onSnapshot Error: [${cfg.name}]`,
            details: err.message
          });
        });
        listeners.push(unsub);
      } catch (e: any) {
        console.warn(`[DevDiagnostic] Failed to set up snapshot for ${cfg.name}:`, e);
      }
    });

    return () => {
      listeners.forEach(unsub => unsub());
    };
  }, []);

  useEffect(() => {
    if (isOpen && isUnlocked) {
      refreshUnlockedCourses();
      if (activeTab === 'control') {
        loadGamificationStats();
      }
    }
  }, [isOpen, isUnlocked, activeTab]);

  // Measure write-then-read Latency with a real document transaction
  const handleTestLatency = async () => {
    setIsPinging(true);
    authDebugger.addLog({
      category: 'system',
      level: 'info',
      title: 'Ping Firestore',
      details: 'Đang gửi gói tin kiểm thử độ trễ khứ hồi...'
    });
    const startTime = performance.now();
    try {
      const pingDocRef = doc(db, 'system_diagnostics', 'ping');
      await setDoc(pingDocRef, {
        testedBy: auth.currentUser?.email || 'Guest Developer',
        timestamp: new Date().toISOString()
      }, { merge: true });
      const duration = Math.round(performance.now() - startTime);
      setLatencyMs(duration);
      authDebugger.addLog({
        category: 'system',
        level: 'success',
        title: 'Ping Firestore thành công',
        details: `Độ trễ phản hồi: ${duration} ms (Khứ hồi).`
      });
    } catch (err: any) {
      console.error(err);
      authDebugger.addLog({
        category: 'system',
        level: 'error',
        title: 'Ping Firestore thất bại',
        details: err.message
      });
      setLatencyMs(null);
    } finally {
      setIsPinging(false);
    }
  };

  // Auto scroll logs
  useEffect(() => {
    if (autoScroll && logsEndRef.current && activeTab === 'stream') {
      logsEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [state.logs, autoScroll, activeTab]);

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleTestOtpDispatch = async () => {
    if (!testEmail || !testEmail.includes('@')) {
      alert('Vui lòng nhập địa chỉ email hợp lệ để kiểm tra.');
      return;
    }
    setIsTestingSend(true);
    setTestResult(null);
    try {
      const res = await authDebugger.testDispatchOtpSend(testEmail.trim(), testName.trim() || 'Học viên Test');
      setTestResult(res);
    } catch (err: any) {
      setTestResult({ success: false, error: err?.message || String(err) });
    } finally {
      setIsTestingSend(false);
    }
  };

  // Filtered logs
  const filteredLogs = useMemo(() => {
    return state.logs.filter((log) => {
      const matchCategory = filterCategory === 'all' || log.category === filterCategory;
      const matchLevel = filterLevel === 'all' || log.level === filterLevel;
      const matchSearch =
        !searchQuery ||
        log.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (log.details && log.details.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (log.payload && JSON.stringify(log.payload).toLowerCase().includes(searchQuery.toLowerCase()));
      return matchCategory && matchLevel && matchSearch;
    });
  }, [state.logs, filterCategory, filterLevel, searchQuery]);

  const unreadAnomalies = state.modals.anomalies.length;
  const isAuthLoggedIn = state.auth.status === 'logged_in';
  const activeModalCount = Object.values(state.modals.activeModals).filter((m) => m.isOpen).length;

  return (
    <>
      {/* SECURITY UNLOCK MODAL (When triggered via shortcut but not yet authenticated) */}
      <AnimatePresence>
        {isOpen && !isUnlocked && (
          <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              transition={{ duration: 0.2 }}
              className="w-full max-w-md bg-slate-900 border border-cyan-500/40 rounded-2xl shadow-2xl overflow-hidden p-6 font-sans text-slate-100 relative"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 shadow-inner">
                    <Shield className="w-5 h-5 animate-pulse" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold tracking-tight text-white flex items-center gap-2">
                      Xác thực Quyền Developer
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                        DEV ACCESS
                      </span>
                    </h3>
                    <p className="text-xs text-slate-400">
                      Nhập mã bảo mật để mở bảng chẩn đoán hệ thống
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setIsOpen(false);
                    setPasswordError(null);
                    setPasswordInput('');
                  }}
                  className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleUnlock} className="space-y-4">
                <div>
                  <label className="block text-xs font-mono text-slate-300 mb-1.5 font-medium">
                    MẬT KHẨU TRUY CẬP (DEVELOPER PASSCODE):
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                      <Lock className="w-4 h-4 text-cyan-400" />
                    </div>
                    <input
                      ref={passwordInputRef}
                      type={showPassword ? 'text' : 'password'}
                      value={passwordInput}
                      onChange={(e) => {
                        setPasswordInput(e.target.value);
                        if (passwordError) setPasswordError(null);
                      }}
                      placeholder="Nhập mật khẩu nhà phát triển..."
                      className="w-full pl-9 pr-10 py-2.5 bg-slate-950 border border-slate-700 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 rounded-xl text-sm font-mono text-white placeholder-slate-500 transition-all outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-200 cursor-pointer"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  {passwordError && (
                    <p className="mt-2 text-xs text-rose-400 font-medium flex items-center gap-1.5">
                      <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                      {passwordError}
                    </p>
                  )}
                </div>

                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setIsOpen(false);
                      setPasswordError(null);
                      setPasswordInput('');
                    }}
                    className="px-4 py-2 text-xs font-medium text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-xl transition cursor-pointer"
                  >
                    Hủy bỏ
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 text-xs font-bold text-slate-950 bg-gradient-to-r from-cyan-400 to-blue-500 hover:from-cyan-300 hover:to-blue-400 rounded-xl shadow-lg shadow-cyan-500/20 transition flex items-center gap-1.5 cursor-pointer font-mono"
                  >
                    <Key className="w-3.5 h-3.5" />
                    Mở Khóa Bảng Chẩn Đoán
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}

        {/* FULL DIAGNOSTIC DASHBOARD MODAL (Triggered via Ctrl + Shift + X Y Z / D E V) */}
        {isOpen && isUnlocked && (
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 20 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className={`fixed z-[99999] bg-slate-950/95 text-slate-100 border border-slate-800 rounded-2xl shadow-2xl backdrop-blur-xl flex flex-col font-sans overflow-hidden ${
              isMinimized
                ? 'bottom-16 left-4 w-96 h-28 border-cyan-500/40'
                : 'inset-4 md:inset-x-8 md:inset-y-6 max-w-7xl mx-auto'
            }`}
            style={{ maxHeight: isMinimized ? '120px' : 'calc(100vh - 48px)' }}
          >
            {/* TOP BAR / TITLE */}
            <div className="bg-slate-900/90 px-4 py-3 border-b border-slate-800 flex items-center justify-between gap-3 shrink-0">
              <div className="flex items-center gap-3">
                <div className="p-1.5 bg-cyan-500/10 border border-cyan-500/30 rounded-lg text-cyan-400">
                  <Activity className="w-4 h-4" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-xs font-black uppercase tracking-wider text-slate-100 flex items-center gap-2 font-mono">
                      FAST Security Gateway & Auth Diagnostic Hub
                    </h2>
                    <span className="px-2 py-0.5 rounded-full text-[9px] font-black bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 tracking-widest font-mono">
                      DEV MODE ONLY
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 hidden sm:block">
                    Giám sát thời gian thực trạng thái Firebase Auth Listener, hiển thị OTP Modal và vòng đời EmailJS Promise
                  </p>
                </div>
              </div>

              {/* Action buttons */}
              <div className="flex items-center gap-2">
                <button
                  onClick={handleLock}
                  className="px-2.5 py-1 rounded-lg bg-rose-950/40 hover:bg-rose-900/70 text-rose-300 hover:text-white text-[11px] font-medium transition-all flex items-center gap-1.5 cursor-pointer border border-rose-800/50"
                  title="Khóa bảng chẩn đoán"
                >
                  <Lock className="w-3 h-3 text-rose-400" />
                  <span className="hidden md:inline">Khóa lại</span>
                </button>

                <button
                  onClick={() => authDebugger.clearLogs()}
                  className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-[11px] font-medium transition-all flex items-center gap-1.5 cursor-pointer border border-slate-700"
                  title="Xóa lịch sử log"
                >
                  <Trash2 className="w-3 h-3 text-slate-400" />
                  <span className="hidden md:inline">Xóa Logs</span>
                </button>

                <button
                  onClick={() => copyToClipboard(JSON.stringify(state, null, 2), 'full_state')}
                  className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-[11px] font-medium transition-all flex items-center gap-1.5 cursor-pointer border border-slate-700"
                  title="Sao chép toàn bộ state JSON"
                >
                  {copiedId === 'full_state' ? (
                    <Check className="w-3 h-3 text-emerald-400" />
                  ) : (
                    <Copy className="w-3 h-3 text-slate-400" />
                  )}
                  <span className="hidden md:inline">
                    {copiedId === 'full_state' ? 'Đã chép!' : 'Copy JSON'}
                  </span>
                </button>

                <button
                  onClick={() => setIsMinimized(!isMinimized)}
                  className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-all cursor-pointer"
                  title={isMinimized ? 'Phóng to' : 'Thu nhỏ'}
                >
                  {isMinimized ? <Maximize2 className="w-3.5 h-3.5" /> : <Minimize2 className="w-3.5 h-3.5" />}
                </button>

                <button
                  onClick={() => setIsOpen(false)}
                  className="p-1.5 rounded-lg bg-slate-800 hover:bg-rose-900/60 text-slate-400 hover:text-rose-300 transition-all cursor-pointer border border-slate-700"
                  title="Đóng bảng chẩn đoán (Esc hoặc Ctrl+Shift+X Y Z)"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* MINIMIZED VIEW CONTENT */}
            {isMinimized ? (
              <div className="p-3 flex items-center justify-between text-xs font-mono">
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-1.5">
                    <span
                      className={`w-2 h-2 rounded-full ${
                        isAuthLoggedIn ? 'bg-emerald-400' : 'bg-slate-400'
                      }`}
                    />
                    <span className="text-slate-300 text-[11px]">
                      {isAuthLoggedIn ? state.auth.currentUser?.email : 'Chưa đăng nhập'}
                    </span>
                  </div>
                  <div className="text-slate-400 text-[11px]">
                    OTP Active: <strong className="text-cyan-400">{activeModalCount}</strong>
                  </div>
                  <div className="text-slate-400 text-[11px]">
                    Reqs: <strong className="text-indigo-400">{state.emailjs.totalRequests}</strong>
                  </div>
                </div>
                <button
                  onClick={() => setIsMinimized(false)}
                  className="text-cyan-400 hover:underline text-[11px] cursor-pointer"
                >
                  Mở rộng ↗
                </button>
              </div>
            ) : (
              <>
                {/* METRICS & HEALTH STRIP */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 p-3 bg-slate-900/60 border-b border-slate-800 shrink-0 text-xs">
                  {/* 1. Auth Listener Card */}
                  <div className="p-2.5 rounded-xl bg-slate-900/80 border border-slate-800/80 flex items-start gap-2.5">
                    <div
                      className={`p-2 rounded-lg shrink-0 ${
                        isAuthLoggedIn
                          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                          : 'bg-slate-800 text-slate-400'
                      }`}
                    >
                      <Shield className="w-4 h-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-1">
                        <span className="text-[10px] uppercase font-bold text-slate-400 font-mono">
                          Firebase Auth Listener
                        </span>
                        <span
                          className={`px-1.5 py-0.2 rounded text-[9px] font-black ${
                            isAuthLoggedIn
                              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                              : 'bg-slate-800 text-slate-400'
                          }`}
                        >
                          {state.auth.authResolved ? (isAuthLoggedIn ? 'LOGGED_IN' : 'LOGGED_OUT') : 'RESOLVING'}
                        </span>
                      </div>
                      <div className="text-slate-200 font-semibold truncate text-[11px] mt-0.5 font-mono">
                        {state.auth.currentUser ? state.auth.currentUser.email : 'None (Khách)'}
                      </div>
                      <div className="text-[10px] text-slate-500 truncate mt-0.5">
                        UID: {state.auth.currentUser ? state.auth.currentUser.uid.slice(0, 10) + '...' : 'N/A'}
                      </div>
                    </div>
                  </div>

                  {/* 2. OTP Modal Visibility Card */}
                  <div className="p-2.5 rounded-xl bg-slate-900/80 border border-slate-800/80 flex items-start gap-2.5">
                    <div
                      className={`p-2 rounded-lg shrink-0 ${
                        activeModalCount > 0
                          ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20'
                          : 'bg-slate-800 text-slate-400'
                      }`}
                    >
                      <Key className="w-4 h-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-1">
                        <span className="text-[10px] uppercase font-bold text-slate-400 font-mono">
                          OTP Modal Visibility
                        </span>
                        <span
                          className={`px-1.5 py-0.2 rounded text-[9px] font-black ${
                            activeModalCount > 0
                              ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 animate-pulse'
                              : 'bg-slate-800 text-slate-400'
                          }`}
                        >
                          {activeModalCount > 0 ? `${activeModalCount} ACTIVE` : 'CLOSED'}
                        </span>
                      </div>
                      <div className="text-slate-200 font-semibold truncate text-[11px] mt-0.5">
                        {Object.keys(state.modals.activeModals).length > 0
                          ? Object.keys(state.modals.activeModals).join(', ')
                          : 'Chưa có modal nào mở'}
                      </div>
                      <div className="text-[10px] text-slate-500 truncate mt-0.5">
                        Lịch sử toggle: {state.modals.history.length} sự kiện
                      </div>
                    </div>
                  </div>

                  {/* 3. EmailJS / Network Promises Card */}
                  <div className="p-2.5 rounded-xl bg-slate-900/80 border border-slate-800/80 flex items-start gap-2.5">
                    <div
                      className={`p-2 rounded-lg shrink-0 ${
                        state.emailjs.activeCount > 0
                          ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                          : 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20'
                      }`}
                    >
                      <Mail className="w-4 h-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-1">
                        <span className="text-[10px] uppercase font-bold text-slate-400 font-mono">
                          EmailJS Promises
                        </span>
                        <span
                          className={`px-1.5 py-0.2 rounded text-[9px] font-black ${
                            state.emailjs.activeCount > 0
                              ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30 animate-pulse'
                              : 'bg-slate-800 text-slate-400'
                          }`}
                        >
                          {state.emailjs.activeCount > 0 ? `${state.emailjs.activeCount} PENDING` : 'IDLE'}
                        </span>
                      </div>
                      <div className="text-slate-200 font-semibold truncate text-[11px] mt-0.5 flex items-center gap-2">
                        <span>Tổng: {state.emailjs.totalRequests}</span>
                        <span className="text-emerald-400 text-[10px]">✓ {state.emailjs.successCount}</span>
                        <span className="text-rose-400 text-[10px]">✗ {state.emailjs.rejectedCount}</span>
                        {state.emailjs.fallbackCount > 0 && (
                          <span className="text-amber-400 text-[10px]">⚡ {state.emailjs.fallbackCount} fallback</span>
                        )}
                      </div>
                      <div className="text-[10px] text-slate-500 truncate mt-0.5">
                        Độ trễ trung bình: {state.emailjs.avgDurationMs ? `${state.emailjs.avgDurationMs}ms` : '0ms'}
                      </div>
                    </div>
                  </div>

                  {/* 4. Anomaly & Diagnostic Health Card */}
                  <div className="p-2.5 rounded-xl bg-slate-900/80 border border-slate-800/80 flex items-start gap-2.5">
                    <div
                      className={`p-2 rounded-lg shrink-0 ${
                        unreadAnomalies > 0
                          ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                          : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                      }`}
                    >
                      {unreadAnomalies > 0 ? (
                        <AlertTriangle className="w-4 h-4" />
                      ) : (
                        <CheckCircle2 className="w-4 h-4" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-1">
                        <span className="text-[10px] uppercase font-bold text-slate-400 font-mono">
                          Phát Hiện Bất Thường
                        </span>
                        <span
                          className={`px-1.5 py-0.2 rounded text-[9px] font-black ${
                            unreadAnomalies > 0
                              ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                              : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                          }`}
                        >
                          {unreadAnomalies > 0 ? `${unreadAnomalies} CẢNH BÁO` : 'CHUẨN HÓA'}
                        </span>
                      </div>
                      <div className="text-slate-200 font-semibold truncate text-[11px] mt-0.5">
                        {unreadAnomalies > 0
                          ? state.modals.anomalies[0].message
                          : 'Không có xung đột logic giao diện'}
                      </div>
                      <div className="text-[10px] text-slate-500 truncate mt-0.5">
                        Nhật ký hệ thống: {state.logs.length} entries
                      </div>
                    </div>
                  </div>
                </div>

                {/* TABS NAVIGATION */}
                <div className="px-4 py-2 bg-slate-900/40 border-b border-slate-800 flex items-center justify-between gap-4 overflow-x-auto shrink-0">
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => setActiveTab('stream')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                        activeTab === 'stream'
                          ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm'
                          : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                      }`}
                    >
                      <Terminal className="w-3.5 h-3.5" />
                      <span>Live Event Stream</span>
                      <span className="px-1.5 py-0.2 rounded-full text-[9px] bg-slate-800 text-slate-300">
                        {filteredLogs.length}
                      </span>
                    </button>

                    <button
                      onClick={() => setActiveTab('auth')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                        activeTab === 'auth'
                          ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm'
                          : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                      }`}
                    >
                      <Shield className="w-3.5 h-3.5" />
                      <span>Auth Listener</span>
                    </button>

                    <button
                      onClick={() => setActiveTab('modals')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                        activeTab === 'modals'
                          ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm'
                          : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                      }`}
                    >
                      <Key className="w-3.5 h-3.5" />
                      <span>OTP Modal State</span>
                      {activeModalCount > 0 && (
                        <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
                      )}
                    </button>

                    <button
                      onClick={() => setActiveTab('emailjs')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                        activeTab === 'emailjs'
                          ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm'
                          : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                      }`}
                    >
                      <Mail className="w-3.5 h-3.5" />
                      <span>EmailJS Promises</span>
                      <span className="px-1.5 py-0.2 rounded-full text-[9px] bg-slate-800 text-slate-300">
                        {state.emailjs.recentPromises.length}
                      </span>
                    </button>

                    <button
                      onClick={() => setActiveTab('tester')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                        activeTab === 'tester'
                          ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm'
                          : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                      }`}
                    >
                      <Play className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Test Dispatcher</span>
                    </button>

                    <button
                      onClick={() => setActiveTab('sync')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                        activeTab === 'sync'
                          ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm animate-pulse'
                          : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                      }`}
                    >
                      <Activity className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Giám sát đồng bộ (Real-time)</span>
                    </button>

                    <button
                      onClick={() => setActiveTab('control')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                        activeTab === 'control'
                          ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-sm animate-pulse'
                          : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                      }`}
                    >
                      <Sliders className="w-3.5 h-3.5 text-amber-400" />
                      <span>Bảng Điều Khiển Dev</span>
                    </button>

                    <button
                      onClick={() => setActiveTab('raw')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                        activeTab === 'raw'
                          ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm'
                          : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                      }`}
                    >
                      <FileText className="w-3.5 h-3.5" />
                      <span>Raw State JSON</span>
                    </button>
                  </div>
                </div>

                {/* TAB 1: LIVE EVENT STREAM */}
                {activeTab === 'stream' && (
                  <div className="flex-1 flex flex-col min-h-0">
                    {/* Filter toolbar */}
                    <div className="px-4 py-2.5 bg-slate-900/80 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs shrink-0">
                      <div className="flex flex-wrap items-center gap-2">
                        {/* Search input */}
                        <div className="relative">
                          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                          <input
                            type="text"
                            placeholder="Lọc nhật ký..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="bg-slate-950 border border-slate-700 rounded-lg pl-8 pr-3 py-1 text-slate-200 text-xs focus:outline-none focus:border-cyan-500 w-40 sm:w-56"
                          />
                          {searchQuery && (
                            <button
                              onClick={() => setSearchQuery('')}
                              className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          )}
                        </div>

                        {/* Category filter */}
                        <select
                          value={filterCategory}
                          onChange={(e) => setFilterCategory(e.target.value)}
                          className="bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1 text-slate-200 text-xs focus:outline-none focus:border-cyan-500 cursor-pointer"
                        >
                          <option value="all">Tất cả danh mục</option>
                          <option value="auth">Firebase Auth Listener</option>
                          <option value="modal">OTP Modal Toggle</option>
                          <option value="emailjs">EmailJS / Network</option>
                          <option value="anomaly">Cảnh báo bất thường</option>
                          <option value="system">Hệ thống</option>
                        </select>

                        {/* Level filter */}
                        <select
                          value={filterLevel}
                          onChange={(e) => setFilterLevel(e.target.value)}
                          className="bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1 text-slate-200 text-xs focus:outline-none focus:border-cyan-500 cursor-pointer"
                        >
                          <option value="all">Tất cả mức độ</option>
                          <option value="info">Info</option>
                          <option value="success">Success</option>
                          <option value="warn">Warning</option>
                          <option value="error">Error</option>
                        </select>
                      </div>

                      <div className="flex items-center gap-3">
                        <label className="flex items-center gap-1.5 text-slate-400 hover:text-slate-200 cursor-pointer select-none text-[11px]">
                          <input
                            type="checkbox"
                            checked={autoScroll}
                            onChange={(e) => setAutoScroll(e.target.checked)}
                            className="rounded border-slate-700 bg-slate-950 text-cyan-500 focus:ring-0"
                          />
                          <span>Tự cuộn xuống</span>
                        </label>
                      </div>
                    </div>

                    {/* Stream table / list */}
                    <div className="flex-1 overflow-y-auto p-4 space-y-2 font-mono text-xs">
                      {filteredLogs.length === 0 ? (
                        <div className="h-48 flex flex-col items-center justify-center text-slate-500 space-y-2">
                          <Terminal className="w-8 h-8 stroke-[1.5]" />
                          <p>Chưa có sự kiện nào phù hợp với bộ lọc hiện tại.</p>
                        </div>
                      ) : (
                        filteredLogs.map((log) => {
                          const isExpanded = expandedLogId === log.id;
                          const formattedTime = new Date(log.timestamp).toLocaleTimeString('vi-VN', {
                            hour12: false,
                            hour: '2-digit',
                            minute: '2-digit',
                            second: '2-digit',
                            fractionalSecondDigits: 3,
                          });

                          let levelBg = 'bg-slate-900/60 border-slate-800 text-slate-300';
                          let badgeBg = 'bg-slate-800 text-slate-400';
                          if (log.level === 'success') {
                            levelBg = 'bg-emerald-950/20 border-emerald-500/20 text-emerald-300';
                            badgeBg = 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30';
                          } else if (log.level === 'warn') {
                            levelBg = 'bg-amber-950/20 border-amber-500/30 text-amber-300';
                            badgeBg = 'bg-amber-500/20 text-amber-300 border border-amber-500/30';
                          } else if (log.level === 'error') {
                            levelBg = 'bg-rose-950/30 border-rose-500/30 text-rose-300';
                            badgeBg = 'bg-rose-500/20 text-rose-300 border border-rose-500/30';
                          }

                          return (
                            <div
                              key={log.id}
                              className={`p-2.5 rounded-xl border transition-all ${levelBg}`}
                            >
                              <div className="flex items-start justify-between gap-3">
                                <div className="flex items-start gap-2.5 flex-1 min-w-0">
                                  <span className="text-[10px] text-slate-500 font-mono shrink-0 mt-0.5">
                                    {formattedTime}
                                  </span>

                                  <span className={`px-1.5 py-0.2 rounded text-[9px] font-bold uppercase shrink-0 font-mono ${badgeBg}`}>
                                    {log.category}
                                  </span>

                                  <div className="flex-1 min-w-0">
                                    <div className="font-bold text-xs truncate flex items-center gap-2">
                                      <span>{log.title}</span>
                                      {log.durationMs !== undefined && (
                                        <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-800/80 text-cyan-300 font-mono">
                                          {log.durationMs}ms
                                        </span>
                                      )}
                                    </div>
                                    {log.details && (
                                      <p className="text-[11px] text-slate-400 mt-0.5 truncate font-sans">
                                        {log.details}
                                      </p>
                                    )}
                                  </div>
                                </div>

                                <div className="flex items-center gap-1.5 shrink-0">
                                  {log.payload && (
                                    <button
                                      onClick={() => setExpandedLogId(isExpanded ? null : log.id)}
                                      className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-[10px] text-slate-300 flex items-center gap-1 cursor-pointer transition-all"
                                    >
                                      <span>{isExpanded ? 'Đóng JSON' : 'Xem JSON'}</span>
                                      <ChevronRight
                                        className={`w-3 h-3 transition-transform ${
                                          isExpanded ? 'rotate-90' : ''
                                        }`}
                                      />
                                    </button>
                                  )}

                                  <button
                                    onClick={() => copyToClipboard(JSON.stringify(log, null, 2), log.id)}
                                    className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-all cursor-pointer"
                                    title="Sao chép log entry"
                                  >
                                    {copiedId === log.id ? (
                                      <Check className="w-3 h-3 text-emerald-400" />
                                    ) : (
                                      <Copy className="w-3 h-3" />
                                    )}
                                  </button>
                                </div>
                              </div>

                              {/* EXPANDED JSON PAYLOAD */}
                              {isExpanded && log.payload && (
                                <div className="mt-2.5 pt-2.5 border-t border-slate-800">
                                  <div className="flex items-center justify-between text-[10px] text-slate-500 mb-1">
                                    <span>Payload Object:</span>
                                    <button
                                      onClick={() =>
                                        copyToClipboard(JSON.stringify(log.payload, null, 2), `${log.id}_payload`)
                                      }
                                      className="text-cyan-400 hover:underline flex items-center gap-1"
                                    >
                                      {copiedId === `${log.id}_payload` ? 'Đã sao chép' : 'Sao chép payload'}
                                    </button>
                                  </div>
                                  <pre className="p-2.5 rounded-lg bg-slate-950 border border-slate-800 text-[11px] text-cyan-300 overflow-x-auto max-h-48">
                                    {JSON.stringify(log.payload, null, 2)}
                                  </pre>
                                </div>
                              )}
                            </div>
                          );
                        })
                      )}
                      <div ref={logsEndRef} />
                    </div>
                  </div>
                )}

                {/* TAB 2: AUTH LISTENER DEEP DIVE */}
                {activeTab === 'auth' && (
                  <div className="flex-1 overflow-y-auto p-6 space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {/* Left Card: Current Firebase Auth Context */}
                      <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-4">
                        <div className="flex items-center justify-between">
                          <h3 className="text-sm font-black uppercase tracking-wider text-slate-200 flex items-center gap-2">
                            <Shield className="w-4 h-4 text-emerald-400" />
                            Trạng Thái Firebase Auth
                          </h3>
                          <span
                            className={`px-2.5 py-1 rounded-full text-xs font-black font-mono ${
                              isAuthLoggedIn
                                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                                : 'bg-slate-800 text-slate-400'
                            }`}
                          >
                            {state.auth.status.toUpperCase()}
                          </span>
                        </div>

                        <div className="space-y-3 font-mono text-xs">
                          <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex justify-between items-center">
                            <span className="text-slate-400">authResolved:</span>
                            <span className={state.auth.authResolved ? 'text-emerald-400 font-bold' : 'text-amber-400'}>
                              {String(state.auth.authResolved).toUpperCase()}
                            </span>
                          </div>

                          <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex justify-between items-center">
                            <span className="text-slate-400">Email người dùng:</span>
                            <span className="text-slate-200 font-bold">
                              {state.auth.currentUser?.email || 'N/A (Chưa đăng nhập)'}
                            </span>
                          </div>

                          <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex justify-between items-center">
                            <span className="text-slate-400">Tên hiển thị:</span>
                            <span className="text-slate-200">
                              {state.auth.currentUser?.displayName || 'N/A'}
                            </span>
                          </div>

                          <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex justify-between items-center">
                            <span className="text-slate-400">User UID:</span>
                            <span className="text-cyan-400 truncate max-w-[200px]" title={state.auth.currentUser?.uid}>
                              {state.auth.currentUser?.uid || 'N/A'}
                            </span>
                          </div>

                          <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex justify-between items-center">
                            <span className="text-slate-400">Email Verified:</span>
                            <span className={state.auth.currentUser?.emailVerified ? 'text-emerald-400' : 'text-slate-400'}>
                              {state.auth.currentUser ? String(state.auth.currentUser.emailVerified).toUpperCase() : 'N/A'}
                            </span>
                          </div>

                          <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex justify-between items-center">
                            <span className="text-slate-400">Thời gian cập nhật:</span>
                            <span className="text-slate-400 text-[11px]">
                              {new Date(state.auth.lastUpdated).toLocaleTimeString()}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Right Card: Real-time Live Auth Object Inspector */}
                      <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 flex flex-col">
                        <div className="flex items-center justify-between mb-3">
                          <h3 className="text-sm font-black uppercase tracking-wider text-slate-200 flex items-center gap-2">
                            <Terminal className="w-4 h-4 text-cyan-400" />
                            Live auth.currentUser Snapshot
                          </h3>
                          <button
                            onClick={() => {
                              console.log('[DevDiagnostics:AuthSnapshot]', auth.currentUser);
                              alert('Đã in auth.currentUser ra Developer Console (F12).');
                            }}
                            className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-xs text-slate-300 flex items-center gap-1 cursor-pointer"
                          >
                            <Terminal className="w-3 h-3" />
                            Log ra Console
                          </button>
                        </div>
                        <pre className="flex-1 p-3 rounded-xl bg-slate-950 border border-slate-800 text-xs text-emerald-300 font-mono overflow-y-auto max-h-72">
                          {JSON.stringify(state.auth.currentUser || { message: 'Không có phiên Firebase Auth hiện tại' }, null, 2)}
                        </pre>
                      </div>
                    </div>
                  </div>
                )}

                {/* TAB 3: OTP MODAL & LIFECYCLE MATRIX */}
                {activeTab === 'modals' && (
                  <div className="flex-1 overflow-y-auto p-6 space-y-6">
                    {/* Visual Lifecycle Flow Diagram */}
                    <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-4">
                      <h3 className="text-sm font-black uppercase tracking-wider text-slate-200 flex items-center gap-2">
                        <Zap className="w-4 h-4 text-cyan-400" />
                        Sơ Đồ Vòng Đời OTP & Hiển Thị Modal
                      </h3>
                      <div className="grid grid-cols-2 md:grid-cols-6 gap-2 text-center text-xs font-mono">
                        <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                          <div className="text-[10px] text-slate-500 mb-1">BƯỚC 1</div>
                          <div className="font-bold text-slate-200">Kích Hoạt Yêu Cầu</div>
                          <div className="text-[10px] text-cyan-400 mt-1">handleConfirmTransfer</div>
                        </div>

                        <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                          <div className="text-[10px] text-slate-500 mb-1">BƯỚC 2</div>
                          <div className="font-bold text-slate-200">Gửi OTP / EmailJS</div>
                          <div className="text-[10px] text-amber-400 mt-1">/api/otp/send</div>
                        </div>

                        <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                          <div className="text-[10px] text-slate-500 mb-1">BƯỚC 3</div>
                          <div className="font-bold text-slate-200">Mở Modal</div>
                          <div className="text-[10px] text-emerald-400 mt-1">isOpen = true</div>
                        </div>

                        <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                          <div className="text-[10px] text-slate-500 mb-1">BƯỚC 4</div>
                          <div className="font-bold text-slate-200">Hiện Form OTP</div>
                          <div className="text-[10px] text-cyan-400 mt-1">showOtpForm = true</div>
                        </div>

                        <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                          <div className="text-[10px] text-slate-500 mb-1">BƯỚC 5</div>
                          <div className="font-bold text-slate-200">Nhập 6 Số OTP</div>
                          <div className="text-[10px] text-indigo-400 mt-1">input length: 6</div>
                        </div>

                        <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                          <div className="text-[10px] text-slate-500 mb-1">BƯỚC 6</div>
                          <div className="font-bold text-slate-200">Xác Thực Thành Công</div>
                          <div className="text-[10px] text-emerald-400 mt-1">/api/otp/verify</div>
                        </div>
                      </div>
                    </div>

                    {/* Active Modal Trackers */}
                    <div className="space-y-4">
                      <h3 className="text-sm font-black uppercase tracking-wider text-slate-200 flex items-center gap-2">
                        <Key className="w-4 h-4 text-cyan-400" />
                        Trạng Thái Thực Tế Từng Component
                      </h3>

                      {Object.keys(state.modals.activeModals).length === 0 ? (
                        <div className="p-8 text-center rounded-2xl bg-slate-900/40 border border-slate-800 text-slate-500 text-xs">
                          Chưa có thành phần OTP modal nào được khởi tạo trong phiên hiện tại.
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {Object.values(state.modals.activeModals).map((modal) => (
                            <div
                              key={modal.componentName}
                              className={`p-4 rounded-2xl border ${
                                modal.isOpen
                                  ? 'bg-cyan-950/20 border-cyan-500/30'
                                  : 'bg-slate-900/50 border-slate-800'
                              }`}
                            >
                              <div className="flex items-center justify-between mb-3">
                                <div className="flex items-center gap-2">
                                  <span className="font-bold text-sm text-slate-100 font-mono">
                                    {modal.componentName}
                                  </span>
                                </div>
                                <span
                                  className={`px-2 py-0.5 rounded text-[10px] font-black font-mono ${
                                    modal.isOpen
                                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                                      : 'bg-slate-800 text-slate-400'
                                  }`}
                                >
                                  {modal.isOpen ? 'MODAL OPEN' : 'MODAL CLOSED'}
                                </span>
                              </div>

                              <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                                <div className="p-2 rounded-lg bg-slate-950 border border-slate-800">
                                  <span className="text-slate-400 text-[10px] block">Form OTP Hiển Thị:</span>
                                  <span className={modal.otpFormVisible ? 'text-emerald-400 font-bold' : 'text-slate-400'}>
                                    {modal.otpFormVisible ? 'TRUE' : 'FALSE'}
                                  </span>
                                </div>

                                <div className="p-2 rounded-lg bg-slate-950 border border-slate-800">
                                  <span className="text-slate-400 text-[10px] block">Số Ký Tự Đã Nhập:</span>
                                  <span className="text-cyan-400 font-bold">
                                    {modal.userInputLength} / 6 chữ số
                                  </span>
                                </div>

                                <div className="p-2 rounded-lg bg-slate-950 border border-slate-800">
                                  <span className="text-slate-400 text-[10px] block">Bộ Đếm Cooldown:</span>
                                  <span className={modal.countdown > 0 ? 'text-amber-400 font-bold' : 'text-slate-400'}>
                                    {modal.countdown > 0 ? `${modal.countdown}s` : 'Sẵn sàng gửi lại'}
                                  </span>
                                </div>

                                <div className="p-2 rounded-lg bg-slate-950 border border-slate-800">
                                  <span className="text-slate-400 text-[10px] block">Nguồn Kích Hoạt:</span>
                                  <span className="text-slate-300 truncate block">
                                    {modal.triggerSource || 'React Event'}
                                  </span>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* TAB 4: EMAILJS / PROMISE RESOLUTION INSPECTOR */}
                {activeTab === 'emailjs' && (
                  <div className="flex-1 overflow-y-auto p-6 space-y-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-sm font-black uppercase tracking-wider text-slate-200 flex items-center gap-2">
                          <Mail className="w-4 h-4 text-cyan-400" />
                          Lịch Sử & Độ Trễ Gửi OTP Qua EmailJS
                        </h3>
                        <p className="text-xs text-slate-400 mt-0.5">
                          Theo dõi chi tiết các bước: Khởi tạo ➔ Phát Promise Fetch ➔ Phản hồi Server / Fallback
                        </p>
                      </div>

                      <button
                        onClick={() => setActiveTab('tester')}
                        className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-lg shadow-emerald-600/20"
                      >
                        <Play className="w-3.5 h-3.5" />
                        Gửi Test Thử Nghiệm
                      </button>
                    </div>

                    <div className="overflow-x-auto rounded-2xl border border-slate-800 bg-slate-900/60">
                      <table className="w-full text-left font-mono text-xs">
                        <thead className="bg-slate-950 text-slate-400 text-[10px] uppercase border-b border-slate-800">
                          <tr>
                            <th className="p-3">Thời gian</th>
                            <th className="p-3">Email nhận</th>
                            <th className="p-3">Bước thực thi</th>
                            <th className="p-3">HTTP Status</th>
                            <th className="p-3">Độ trễ</th>
                            <th className="p-3">Dự phòng (Fallback)</th>
                            <th className="p-3">Hành động</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800/60 text-slate-300">
                          {state.emailjs.recentPromises.length === 0 ? (
                            <tr>
                              <td colSpan={7} className="p-8 text-center text-slate-500">
                                Chưa có promise EmailJS nào được kích hoạt trong phiên này.
                              </td>
                            </tr>
                          ) : (
                            state.emailjs.recentPromises.map((req) => (
                              <tr key={req.id} className="hover:bg-slate-800/40 transition-colors">
                                <td className="p-3 text-[11px] text-slate-400">
                                  {new Date(req.timestamp).toLocaleTimeString()}
                                </td>
                                <td className="p-3 font-bold text-slate-100">{req.email}</td>
                                <td className="p-3">
                                  <span
                                    className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                                      req.step === 'resolved'
                                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                                        : req.step === 'rejected'
                                        ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                                        : req.step === 'fallback_triggered'
                                        ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                                        : 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 animate-pulse'
                                    }`}
                                  >
                                    {req.step}
                                  </span>
                                </td>
                                <td className="p-3">
                                  {req.status ? (
                                    <span className={req.status === 200 ? 'text-emerald-400 font-bold' : 'text-rose-400 font-bold'}>
                                      {req.status}
                                    </span>
                                  ) : (
                                    <span className="text-slate-500">...</span>
                                  )}
                                </td>
                                <td className="p-3 text-cyan-400">
                                  {req.durationMs !== undefined ? `${req.durationMs}ms` : 'Đang xử lý...'}
                                </td>
                                <td className="p-3">
                                  {req.fallbackOtp ? (
                                    <span className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 font-bold text-[10px] border border-amber-500/30">
                                      OTP: {req.fallbackOtp}
                                    </span>
                                  ) : (
                                    <span className="text-slate-500">-</span>
                                  )}
                                </td>
                                <td className="p-3">
                                  <button
                                    onClick={() => copyToClipboard(JSON.stringify(req, null, 2), req.id)}
                                    className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-all cursor-pointer"
                                    title="Copy request JSON"
                                  >
                                    {copiedId === req.id ? (
                                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                                    ) : (
                                      <Copy className="w-3.5 h-3.5" />
                                    )}
                                  </button>
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* TAB 5: TEST DISPATCHER */}
                {activeTab === 'tester' && (
                  <div className="flex-1 overflow-y-auto p-6 space-y-6">
                    <div className="max-w-2xl mx-auto p-6 rounded-3xl bg-slate-900/80 border border-slate-800 space-y-5">
                      <div className="flex items-center gap-3">
                        <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
                          <Play className="w-5 h-5" />
                        </div>
                        <div>
                          <h3 className="text-sm font-black uppercase tracking-wider text-slate-100">
                            Công Cụ Kiểm Thử Trực Tiếp Gửi OTP & EmailJS
                          </h3>
                          <p className="text-xs text-slate-400 mt-0.5">
                            Kích hoạt luồng gửi mã OTP thực tế tới /api/otp/send và quan sát toàn bộ Promise trong tab Live Stream.
                          </p>
                        </div>
                      </div>

                      <div className="space-y-4">
                        <div>
                          <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5 font-mono">
                            Email Người Nhận Thử Nghiệm:
                          </label>
                          <input
                            type="email"
                            value={testEmail}
                            onChange={(e) => setTestEmail(e.target.value)}
                            placeholder="vd: test@gmail.com"
                            className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-slate-100 text-sm focus:outline-none focus:border-cyan-500 font-mono"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5 font-mono">
                            Tên Học Viên Hiển Thị:
                          </label>
                          <input
                            type="text"
                            value={testName}
                            onChange={(e) => setTestName(e.target.value)}
                            placeholder="vd: Nguyễn Văn Test"
                            className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-slate-100 text-sm focus:outline-none focus:border-cyan-500 font-mono"
                          />
                        </div>

                        <button
                          onClick={handleTestOtpDispatch}
                          disabled={isTestingSend}
                          className="w-full py-3 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-black text-xs uppercase tracking-widest transition-all shadow-lg shadow-cyan-600/20 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                        >
                          {isTestingSend ? (
                            <>
                              <RotateCw className="w-4 h-4 animate-spin" />
                              <span>Đang phát promise gửi OTP...</span>
                            </>
                          ) : (
                            <>
                              <Play className="w-4 h-4" />
                              <span>Phát Lệnh Gửi OTP Thử Nghiệm Ngay</span>
                            </>
                          )}
                        </button>
                      </div>

                      {/* Test Result Box */}
                      {testResult && (
                        <div
                          className={`p-4 rounded-2xl border font-mono text-xs ${
                            testResult.success
                              ? 'bg-emerald-950/30 border-emerald-500/30 text-emerald-300'
                              : 'bg-rose-950/30 border-rose-500/30 text-rose-300'
                          }`}
                        >
                          <div className="flex items-center justify-between mb-2">
                            <span className="font-bold uppercase flex items-center gap-1.5">
                              {testResult.success ? (
                                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                              ) : (
                                <XCircle className="w-4 h-4 text-rose-400" />
                              )}
                              Kết Quả Thực Thi: {testResult.success ? 'THÀNH CÔNG' : 'THẤT BẠI'}
                            </span>
                            {testResult.durationMs && (
                              <span className="text-[11px] text-cyan-400">
                                {testResult.durationMs}ms
                              </span>
                            )}
                          </div>
                          <pre className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-[11px] overflow-x-auto text-slate-200">
                            {JSON.stringify(testResult, null, 2)}
                          </pre>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* TAB: GIÁM SÁT ĐỒNG BỘ REAL-TIME */}
                {activeTab === 'sync' && (
                  <div className="flex-1 overflow-y-auto p-6 space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 flex items-center gap-4">
                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${isOnline ? 'bg-emerald-500/10 text-emerald-400 animate-pulse' : 'bg-rose-500/10 text-rose-400'}`}>
                          <Activity className="w-5 h-5" />
                        </div>
                        <div>
                          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest font-mono">Trạng thái mạng</div>
                          <div className="text-sm font-bold text-white mt-0.5">
                            {isOnline ? 'Trực tuyến (Online)' : 'Ngoại tuyến (Offline)'}
                          </div>
                        </div>
                      </div>

                      <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 flex items-center gap-4">
                        <div className="w-12 h-12 rounded-xl bg-cyan-500/10 text-cyan-400 flex items-center justify-center">
                          <Terminal className="w-5 h-5" />
                        </div>
                        <div>
                          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest font-mono">Cloud Firestore</div>
                          <div className="text-sm font-bold text-white mt-0.5 flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>
                            Đang liên kết thời gian thực
                          </div>
                        </div>
                      </div>

                      <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 flex items-center justify-between gap-4">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center">
                            <Clock className="w-5 h-5" />
                          </div>
                          <div>
                            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest font-mono">Độ trễ Firestore</div>
                            <div className="text-sm font-bold text-white mt-0.5 font-mono">
                              {latencyMs !== null ? `${latencyMs} ms` : 'Chưa kiểm tra'}
                            </div>
                          </div>
                        </div>
                        <button
                          onClick={handleTestLatency}
                          disabled={isPinging || !isOnline}
                          className="px-3.5 py-2 bg-cyan-600 hover:bg-cyan-500 text-slate-950 rounded-xl text-xs font-black uppercase tracking-wider transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-md shadow-cyan-600/10 cursor-pointer shrink-0 font-mono"
                        >
                          {isPinging ? 'Đang gửi...' : 'Test Ping'}
                        </button>
                      </div>
                    </div>

                    {/* Shared Collections Matrix */}
                    <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 space-y-4">
                      <div>
                        <h3 className="text-sm font-black uppercase tracking-wider text-slate-200 font-mono">
                          Bảng giám sát đồng bộ cơ sở dữ liệu (Firestore Sync Matrix)
                        </h3>
                        <p className="text-xs text-slate-400 mt-1">
                          Thời điểm ghi nhận dữ liệu remote được cập nhật gần nhất cho từng tập hợp dữ liệu dùng chung (Không phân biệt UID/Tài khoản).
                        </p>
                      </div>

                      <div className="overflow-x-auto rounded-xl border border-slate-800">
                        <table className="w-full text-left border-collapse whitespace-nowrap font-mono text-xs">
                          <thead>
                            <tr className="bg-slate-950 text-slate-400 text-[10px] font-bold uppercase tracking-widest border-b border-slate-800">
                              <th className="py-3 px-4">Tập hợp dữ liệu</th>
                              <th className="py-3 px-4">Đường dẫn tài liệu (Firestore Path)</th>
                              <th className="py-3 px-4">Trạng thái đồng bộ</th>
                              <th className="py-3 px-4 text-right">Cập nhật cuối (Last Updated)</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-800 text-slate-300">
                            <tr className="hover:bg-slate-900/40">
                              <td className="py-3 px-4 font-bold text-white">Hồ sơ ATTP (CSDL)</td>
                              <td className="py-3 px-4 text-slate-500">fast_food_safety_crm/database</td>
                              <td className="py-3 px-4">
                                <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] font-black uppercase">
                                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span> Active Listening
                                </span>
                              </td>
                              <td className="py-3 px-4 text-right font-bold text-cyan-400">{collectionTimestamps.attp_db}</td>
                            </tr>
                            <tr className="hover:bg-slate-900/40">
                              <td className="py-3 px-4 font-bold text-white">Hồ sơ ATTP (Nháp)</td>
                              <td className="py-3 px-4 text-slate-500">fast_food_safety_crm/current_session</td>
                              <td className="py-3 px-4">
                                <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] font-black uppercase">
                                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span> Active Listening
                                </span>
                              </td>
                              <td className="py-3 px-4 text-right font-bold text-cyan-400">{collectionTimestamps.attp_session}</td>
                            </tr>
                            <tr className="hover:bg-slate-900/40">
                              <td className="py-3 px-4 font-bold text-white">Hồ sơ Quảng cáo (CSDL)</td>
                              <td className="py-3 px-4 text-slate-500">ad_profile_crm/database</td>
                              <td className="py-3 px-4">
                                <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] font-black uppercase">
                                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span> Active Listening
                                </span>
                              </td>
                              <td className="py-3 px-4 text-right font-bold text-cyan-400">{collectionTimestamps.ads_db}</td>
                            </tr>
                            <tr className="hover:bg-slate-900/40">
                              <td className="py-3 px-4 font-bold text-white">Hồ sơ Quảng cáo (Nháp)</td>
                              <td className="py-3 px-4 text-slate-500">ad_profile_crm/current_session</td>
                              <td className="py-3 px-4">
                                <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] font-black uppercase">
                                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span> Active Listening
                                </span>
                              </td>
                              <td className="py-3 px-4 text-right font-bold text-cyan-400">{collectionTimestamps.ads_session}</td>
                            </tr>
                            <tr className="hover:bg-slate-900/40">
                              <td className="py-3 px-4 font-bold text-white">FSA-Checklist (Nháp)</td>
                              <td className="py-3 px-4 text-slate-500">fast_standards_audits/current_session</td>
                              <td className="py-3 px-4">
                                <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] font-black uppercase">
                                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span> Active Listening
                                </span>
                              </td>
                              <td className="py-3 px-4 text-right font-bold text-cyan-400">{collectionTimestamps.fsa_session}</td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                )}

                {/* TAB: BẢNG ĐIỀU KHIỂN DEV */}
                {activeTab === 'control' && (
                  <div className="flex-1 overflow-y-auto p-6 space-y-6 text-slate-100">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      
                      {/* Left Block: Role Override Control */}
                      <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 space-y-4">
                        <div className="flex items-center gap-2.5">
                          <Shield className="w-5 h-5 text-amber-400" />
                          <h3 className="text-sm font-black uppercase tracking-wider text-slate-100">
                            Giả Lập Ghi Đè Vai Trò (Local Role Override)
                          </h3>
                        </div>
                        <p className="text-xs text-slate-400">
                          Thử nghiệm tức thì giao diện Admin, Giáo viên hoặc Chủ sở hữu mà không cần sửa đổi trực tiếp tài khoản trên Database đám mây.
                        </p>

                        <div className="grid grid-cols-2 gap-2">
                          {[
                            { label: 'Không ghi đè (Mặc định)', value: null },
                            { label: 'Owner (Chủ sở hữu)', value: 'Owner' },
                            { label: 'Admin (Quản trị)', value: 'Admin' },
                            { label: 'Teacher (Giảng viên)', value: 'Teacher' },
                            { label: 'User (Học viên thường)', value: 'User' }
                          ].map((item) => (
                            <button
                              key={item.value || 'none'}
                              onClick={() => {
                                if (item.value) {
                                  localStorage.setItem('dev_role_override', item.value);
                                  setDevRoleOverride(item.value);
                                } else {
                                  localStorage.removeItem('dev_role_override');
                                  setDevRoleOverride(null);
                                }
                                // Dispatch event to Header
                                window.dispatchEvent(new Event('dev_control_updated'));
                                authDebugger.addLog({
                                  category: 'system',
                                  level: 'warn',
                                  title: 'Thay đổi Role giả lập',
                                  details: `Hệ thống đã ghi đè vai trò thành: ${item.value || 'Database mặc định'}`
                                });
                              }}
                              className={`p-3 text-left rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                                devRoleOverride === item.value
                                  ? 'bg-amber-500/25 border-amber-400 text-amber-200 ring-2 ring-amber-500/50'
                                  : 'bg-slate-950/80 border-slate-800 text-slate-300 hover:bg-slate-850'
                              }`}
                            >
                              {item.label}
                            </button>
                          ))}
                        </div>

                        <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl text-[11px] text-amber-300 font-medium">
                          <strong>💡 Lưu ý:</strong> Quyền này chỉ có tác dụng cục bộ trên trình duyệt hiện tại và không ảnh hưởng đến quyền thực của tài khoản trên cơ sở dữ liệu.
                        </div>
                      </div>

                      {/* Right Block: Instant Local Course Unlocker */}
                      <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 space-y-4">
                        <div className="flex items-center gap-2.5">
                          <Key className="w-5 h-5 text-cyan-400" />
                          <h3 className="text-sm font-black uppercase tracking-wider text-slate-100">
                            Mở khóa Khóa học tức thì (LocalStorage Bypass)
                          </h3>
                        </div>
                        <p className="text-xs text-slate-400">
                          Bypass cơ chế thanh toán để kiểm thử phòng học (Classroom) và bài giảng của bất kỳ gói Combo hoặc khóa lẻ nào.
                        </p>

                        <div className="space-y-3">
                          <div className="flex gap-2">
                            <input
                              type="text"
                              placeholder="Nhập ID khóa học (Ví dụ: combo-pro, ads-pro...)"
                              value={customCourseId}
                              onChange={(e) => setCustomCourseId(e.target.value)}
                              className="flex-1 bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-cyan-500 font-mono"
                            />
                            <button
                              onClick={() => {
                                if (!customCourseId.trim()) return;
                                const cid = customCourseId.trim().toLowerCase();
                                localStorage.setItem(`course_unlocked_${cid}`, 'true');
                                refreshUnlockedCourses();
                                setCustomCourseId('');
                                authDebugger.addLog({
                                  category: 'system',
                                  level: 'success',
                                  title: 'Đã mở khóa khóa học',
                                  details: `Đã kích hoạt khóa học "${cid}" cục bộ.`
                                });
                              }}
                              className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-slate-950 font-bold rounded-xl text-xs uppercase cursor-pointer transition-all"
                            >
                              Mở khóa
                            </button>
                          </div>

                          <div className="space-y-1.5">
                            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Các gói Combo Phổ Biến</span>
                            <div className="flex flex-wrap gap-2">
                              {[
                                { id: 'combo-basic', name: 'Combo Basic' },
                                { id: 'combo-pro', name: 'Combo Pro' },
                                { id: 'fast-basic', name: 'Khóa lẻ Basic' },
                                { id: 'ads-pro', name: 'Ads Pro' }
                              ].map(c => {
                                const isUnlockedNow = unlockedCourses.includes(c.id);
                                return (
                                  <button
                                    key={c.id}
                                    onClick={() => {
                                      if (isUnlockedNow) {
                                        localStorage.removeItem(`course_unlocked_${c.id}`);
                                      } else {
                                        localStorage.setItem(`course_unlocked_${c.id}`, 'true');
                                      }
                                      refreshUnlockedCourses();
                                      authDebugger.addLog({
                                        category: 'system',
                                        level: 'info',
                                        title: 'Cập nhật mở khóa',
                                        details: `Thay đổi mở khóa "${c.id}": ${!isUnlockedNow}`
                                      });
                                    }}
                                    className={`px-3 py-1.5 rounded-lg border text-[11px] font-bold transition-all cursor-pointer ${
                                      isUnlockedNow
                                        ? 'bg-cyan-500/25 border-cyan-400 text-cyan-200 font-black'
                                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-300'
                                    }`}
                                  >
                                    {isUnlockedNow ? '✓ ' : '+ '} {c.name}
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        </div>

                        {/* List of currently unlocked course keys */}
                        <div className="space-y-2">
                          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Danh sách ID đang mở khóa ({unlockedCourses.length})</span>
                          {unlockedCourses.length === 0 ? (
                            <div className="p-3 text-center border border-dashed border-slate-800 rounded-xl text-xs text-slate-500">
                              Chưa mở khóa thủ công khóa học nào.
                            </div>
                          ) : (
                            <div className="max-h-28 overflow-y-auto divide-y divide-slate-800/50 bg-slate-950 rounded-xl border border-slate-850 p-2 space-y-1">
                              {unlockedCourses.map(id => (
                                <div key={id} className="flex items-center justify-between py-1 px-2 text-xs font-mono">
                                  <span className="text-cyan-400 font-bold">{id}</span>
                                  <button
                                    onClick={() => {
                                      localStorage.removeItem(`course_unlocked_${id}`);
                                      refreshUnlockedCourses();
                                      authDebugger.addLog({
                                        category: 'system',
                                        level: 'warn',
                                        title: 'Khóa lại khóa học',
                                        details: `Đã thu hồi quyền truy cập khóa học "${id}" cục bộ.`
                                      });
                                    }}
                                    className="p-1 rounded hover:bg-rose-500/20 text-rose-400 hover:text-rose-300 transition-all cursor-pointer"
                                    title="Thu hồi quyền truy cập"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Card 3: Gamification Manager */}
                      <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 space-y-4">
                        <div className="flex items-center gap-2.5">
                          <Award className="w-5 h-5 text-emerald-400" />
                          <h3 className="text-sm font-black uppercase tracking-wider text-slate-100">
                            Quản Lý Gamification & Điểm Số
                          </h3>
                        </div>
                        <p className="text-xs text-slate-400 leading-relaxed font-semibold">
                          Sửa đổi và đồng bộ tức thì các điểm số, chuỗi liên tục (streak) và chỉ số học tập lên cơ sở dữ liệu để kiểm thử danh hiệu và cấp độ của bạn.
                        </p>

                        <div className="grid grid-cols-2 gap-3">
                          <div className="space-y-1">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">Điểm Tích Lũy (XP)</label>
                            <input
                              type="number"
                              value={gamificationPoints}
                              onChange={(e) => setGamificationPoints(Number(e.target.value))}
                              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-emerald-400 font-bold focus:outline-none focus:border-emerald-500 font-mono"
                            />
                          </div>

                          <div className="space-y-1">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">Chuỗi Học (Ngày)</label>
                            <input
                              type="number"
                              value={gamificationStreak}
                              onChange={(e) => setGamificationStreak(Number(e.target.value))}
                              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-orange-400 font-bold focus:outline-none focus:border-orange-500 font-mono"
                            />
                          </div>

                          <div className="space-y-1">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">Bài Học Đã Học</label>
                            <input
                              type="number"
                              value={gamificationLessons}
                              onChange={(e) => setGamificationLessons(Number(e.target.value))}
                              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-cyan-400 font-bold focus:outline-none focus:border-cyan-500 font-mono"
                            />
                          </div>

                          <div className="space-y-1">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">Ghi Chú Đã Tạo</label>
                            <input
                              type="number"
                              value={gamificationNotes}
                              onChange={(e) => setGamificationNotes(Number(e.target.value))}
                              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-purple-400 font-bold focus:outline-none focus:border-purple-500 font-mono"
                            />
                          </div>

                          <div className="col-span-2 space-y-1">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">Khóa Học Đã Hoàn Thành</label>
                            <input
                              type="number"
                              value={gamificationCourses}
                              onChange={(e) => setGamificationCourses(Number(e.target.value))}
                              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-pink-400 font-bold focus:outline-none focus:border-pink-500 font-mono"
                            />
                          </div>
                        </div>

                        <div className="flex gap-2 pt-2">
                          <button
                            onClick={loadGamificationStats}
                            className="flex-1 py-3 bg-slate-950 hover:bg-slate-850 border border-slate-800 hover:border-slate-700 text-slate-300 font-bold rounded-xl text-xs uppercase cursor-pointer transition-all"
                          >
                            Tải Lại Thực Tế
                          </button>
                          <button
                            onClick={saveGamificationStats}
                            className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-black rounded-xl text-xs uppercase cursor-pointer transition-all shadow-md shadow-emerald-500/10"
                          >
                            Đồng bộ lên Cloud
                          </button>
                        </div>
                      </div>

                      {/* Card 4: simulated Notifications dispatcher */}
                      <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 space-y-4">
                        <div className="flex items-center gap-2.5">
                          <Bell className="w-5 h-5 text-indigo-400 animate-swing" />
                          <h3 className="text-sm font-black uppercase tracking-wider text-slate-100">
                            Phát Thông Báo Thử Nghiệm (Simulated Push)
                          </h3>
                        </div>
                        <p className="text-xs text-slate-400 leading-relaxed font-semibold">
                          Gửi một thông báo hệ thống giả lập trực tiếp vào khay thông báo trên Header của bạn để kiểm nghiệm giao diện và luồng xử lý.
                        </p>

                        <div className="space-y-3">
                          <div className="space-y-1">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">Loại thông báo</label>
                            <div className="grid grid-cols-3 gap-2">
                              {[
                                { label: 'Khóa học Mới', value: 'new' },
                                { label: 'Cập nhật', value: 'updated' },
                                { label: 'Phê duyệt', value: 'approval' }
                              ].map((item) => (
                                <button
                                  key={item.value}
                                  onClick={() => {
                                    setNotifType(item.value as any);
                                    if (item.value === 'approval') {
                                      setNotifCourseTitle('Phê duyệt phân quyền hệ thống');
                                      setNotifMessage('Tài khoản của bạn đã được Admin phê duyệt phân quyền VIP!');
                                    } else if (item.value === 'updated') {
                                      setNotifCourseTitle('Khóa học Facebook Ads Pro');
                                      setNotifMessage('Giảng viên vừa cập nhật thêm 3 bài giảng mới và bộ tài liệu hướng dẫn.');
                                    } else {
                                      setNotifCourseTitle('Combo Chiến Binh Ads Thực Chiến');
                                      setNotifMessage('Khóa học mới xuất sắc đã lên sóng, giảm giá 50% hôm nay.');
                                    }
                                  }}
                                  className={`p-2 rounded-lg text-[10px] font-bold text-center border cursor-pointer transition-all ${
                                    notifType === item.value
                                      ? 'bg-indigo-500/20 border-indigo-500 text-indigo-300 font-black'
                                      : 'bg-slate-950 border-slate-850 text-slate-400 hover:text-slate-300'
                                  }`}
                                >
                                  {item.label}
                                </button>
                              ))}
                            </div>
                          </div>

                          <div className="space-y-1">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">Tiêu đề thông báo / Tên khóa học</label>
                            <input
                              type="text"
                              value={notifCourseTitle}
                              onChange={(e) => setNotifCourseTitle(e.target.value)}
                              className="w-full bg-slate-950 border border-slate-850 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                            />
                          </div>

                          <div className="space-y-1">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">Nội dung chi tiết thông báo</label>
                            <textarea
                              value={notifMessage}
                              onChange={(e) => setNotifMessage(e.target.value)}
                              rows={2}
                              className="w-full bg-slate-950 border border-slate-850 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500 resize-none"
                            />
                          </div>

                          <button
                            onClick={handleDispatchNotification}
                            className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-black rounded-xl text-xs uppercase cursor-pointer transition-all shadow-md shadow-indigo-600/15"
                          >
                            Phát Thông Báo Ngay
                          </button>
                        </div>
                      </div>

                    </div>

                    {/* Full Diagnostic & Cache Flush Actions */}
                    <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 space-y-4">
                      <div className="flex items-center gap-2.5">
                        <Zap className="w-5 h-5 text-amber-400 animate-bounce" />
                        <h3 className="text-sm font-black uppercase tracking-wider text-slate-100">
                          Thao Tác Bảo Trì & Reset Hệ Thống
                        </h3>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <button
                          onClick={() => {
                            if (window.confirm('Bạn có chắc chắn muốn dọn sạch toàn bộ LocalStorage? Mọi cài đặt, bài học tạm và token đồng bộ cục bộ sẽ bị reset.')) {
                              localStorage.clear();
                              refreshUnlockedCourses();
                              window.dispatchEvent(new Event('dev_control_updated'));
                              alert('Đã dọn dẹp sạch sẽ cache trình duyệt!');
                              window.location.reload();
                            }
                          }}
                          className="p-4 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 hover:border-rose-500/40 text-rose-300 text-xs font-bold text-left transition-all flex flex-col justify-between h-24 cursor-pointer"
                        >
                          <div className="flex justify-between items-start w-full">
                            <span className="p-1 rounded-lg bg-rose-500/10 text-rose-400"><Trash2 className="w-4 h-4" /></span>
                            <span className="text-[10px] font-black uppercase font-mono tracking-widest text-rose-400">System Danger</span>
                          </div>
                          <div>
                            <span className="block font-black uppercase">Wipe local storage</span>
                            <span className="text-[10px] text-slate-400">Xóa toàn bộ cache, unlock và tùy chọn</span>
                          </div>
                        </button>

                        <button
                          onClick={() => {
                            const dummyLogId = Date.now().toString();
                            authDebugger.addLog({
                              category: 'system',
                              level: 'warn',
                              title: 'Cảnh Báo Chẩn Đoán',
                              details: 'Đây là dòng cảnh báo thử nghiệm được kích hoạt bởi nhà phát triển.',
                              payload: { testId: dummyLogId, triggeredAt: new Date().toISOString() }
                            });
                            setActiveTab('stream');
                          }}
                          className="p-4 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/20 hover:border-amber-500/40 text-amber-300 text-xs font-bold text-left transition-all flex flex-col justify-between h-24 cursor-pointer"
                        >
                          <div className="flex justify-between items-start w-full">
                            <span className="p-1 rounded-lg bg-amber-500/10 text-amber-400"><AlertTriangle className="w-4 h-4" /></span>
                            <span className="text-[10px] font-black uppercase font-mono tracking-widest text-amber-400">Logs Trigger</span>
                          </div>
                          <div>
                            <span className="block font-black uppercase">Dispatch dummy warning</span>
                            <span className="text-[10px] text-slate-400">Tạo log cảnh báo thử nghiệm</span>
                          </div>
                        </button>

                        <button
                          onClick={() => {
                            const customEvent = new CustomEvent('course_unlocked_khoa-vip');
                            window.dispatchEvent(customEvent);
                            authDebugger.addLog({
                              category: 'system',
                              level: 'success',
                              title: 'Phát tín hiệu VIP',
                              details: 'Đã phát tín hiệu mở khóa VIP giả lập tới các phân hệ lắng nghe.'
                            });
                          }}
                          className="p-4 rounded-xl bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/20 hover:border-cyan-500/40 text-cyan-300 text-xs font-bold text-left transition-all flex flex-col justify-between h-24 cursor-pointer"
                        >
                          <div className="flex justify-between items-start w-full">
                            <span className="p-1 rounded-lg bg-cyan-500/10 text-cyan-400"><Zap className="w-4 h-4" /></span>
                            <span className="text-[10px] font-black uppercase font-mono tracking-widest text-cyan-400">Global Sync</span>
                          </div>
                          <div>
                            <span className="block font-black uppercase">Simulate global VIP purchase</span>
                            <span className="text-[10px] text-slate-400">Phát tin hiệu mở khóa trọn đời</span>
                          </div>
                        </button>
                      </div>
                    </div>

                  </div>
                )}

                {/* TAB 6: RAW STATE JSON */}
                {activeTab === 'raw' && (
                  <div className="flex-1 overflow-y-auto p-6 space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 font-mono">
                        DiagnosticStore Singleton State Dump
                      </h3>
                      <button
                        onClick={() => copyToClipboard(JSON.stringify(state, null, 2), 'raw_dump')}
                        className="px-3 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs text-cyan-300 flex items-center gap-1.5 cursor-pointer"
                      >
                        {copiedId === 'raw_dump' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                        <span>Sao chép toàn bộ JSON</span>
                      </button>
                    </div>
                    <pre className="p-4 rounded-2xl bg-slate-950 border border-slate-800 text-xs text-cyan-300 font-mono overflow-x-auto max-h-[500px]">
                      {JSON.stringify(state, null, 2)}
                    </pre>
                  </div>
                )}
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};
