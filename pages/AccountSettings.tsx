import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { auth, storage, db } from '../firebase';
import { 
  updateProfile, 
  updatePassword, 
  deleteUser,
  onAuthStateChanged,
  type User
} from 'firebase/auth';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { doc, setDoc, deleteDoc, collection, getDocs, onSnapshot, getDoc } from 'firebase/firestore'; 
import { useTheme } from '../contexts/ThemeContext';
import { useToast } from '../contexts/ToastContext';
import { ADMIN_EMAILS, TEACHER_EMAILS, getMergedCombos, ComboItem } from '../constants';
import { 
  User as UserIcon, 
  ShieldCheck, 
  Award, 
  Crown, 
  BookOpen, 
  Layers, 
  KeyRound, 
  Palette, 
  CheckCircle2, 
  Sparkles, 
  Save, 
  RefreshCw, 
  Target, 
  Briefcase,
  AlertTriangle,
  ArrowLeft,
  Upload,
  Trash2,
  X,
  Check,
  Calendar,
  Mail,
  Zap,
  Lock,
  Eye,
  EyeOff
} from 'lucide-react';

const SECTOR_OPTIONS = [
  'ISO 22000 (An toàn thực phẩm)',
  'HACCP Codex & TCVN',
  'QA/QC Kiểm soát chất lượng',
  'BRCGS Food Safety',
  'FSSC 22000 International',
  'VietGAP Nông nghiệp sạch',
  'Lean & 5S Vận hành nhà máy',
  'An toàn lao động & Môi trường ISO 14001',
  'Quản trị nhà hàng & Khách sạn F&B'
];

const AccountSettings: React.FC<{ embed?: boolean }> = ({ embed = false }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { theme, toggleTheme } = useTheme();
  const toast = useToast();
  
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Tab State: 'profile' | 'security' | 'combo' | 'appearance'
  const [activeTab, setActiveTab] = useState<'profile' | 'security' | 'combo' | 'appearance'>('profile');

  // Form states
  const [displayName, setDisplayName] = useState('');
  const [photoURL, setPhotoURL] = useState('');
  const [email, setEmail] = useState('');
  
  // Password states
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  
  // File upload state
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  // Delete Account States
  const [deleteSelfEmail, setDeleteSelfEmail] = useState('');
  const [showDeleteZone, setShowDeleteZone] = useState(false);

  // Personalized Combo Management States
  const [preferredSectors, setPreferredSectors] = useState<string[]>(['ISO 22000 (An toàn thực phẩm)', 'HACCP Codex & TCVN']);
  const [comboGoal, setComboGoal] = useState('Chinh phục chứng chỉ Chuyên gia Vận hành An toàn Thực phẩm & ISO 22000');
  const [comboNotes, setComboNotes] = useState('');
  const [unlockedCombos, setUnlockedCombos] = useState<ComboItem[]>([]);

  // User status for Avatar color rules & Status Card
  const [userStatus, setUserStatus] = useState<{ 
    isVip: boolean; 
    isAdmin: boolean; 
    isTeacher: boolean; 
    coursesCount: number;
    unlockedCombosCount: number;
    joinedDate?: string;
  }>({
    isVip: false,
    isAdmin: false,
    isTeacher: false,
    coursesCount: 0,
    unlockedCombosCount: 0
  });

  // Listen to User Profile & Status Real-time
  useEffect(() => {
    if (!user || !user.email) return;
    const normalizedEmail = user.email.toLowerCase();

    let localIsAdmin = ADMIN_EMAILS.includes(normalizedEmail);
    let localIsTeacher = TEACHER_EMAILS.includes(normalizedEmail);
    let localIsVip = false;

    try {
      const localRoles = localStorage.getItem(`user_roles_${normalizedEmail}`);
      if (localRoles) {
        const parsed = JSON.parse(localRoles);
        if (parsed.isVip) localIsVip = true;
        if (parsed.isAdmin) localIsAdmin = true;
        if (parsed.isTeacher) localIsTeacher = true;
      }
    } catch (e) {}

    let currentIsVip = localIsVip;
    let currentIsAdmin = localIsAdmin;
    let currentIsTeacher = localIsTeacher;
    let currentCount = 0;
    let currentCombosCount = 0;

    const updateStats = () => {
      const creationTime = user.metadata.creationTime 
        ? new Date(user.metadata.creationTime).toLocaleDateString('vi-VN')
        : '2026';

      setUserStatus({
        isVip: currentIsVip,
        isAdmin: currentIsAdmin,
        isTeacher: currentIsTeacher,
        coursesCount: currentCount,
        unlockedCombosCount: currentCombosCount,
        joinedDate: creationTime
      });
    };

    const unsubUser = onSnapshot(doc(db, "users", normalizedEmail), (docSnap) => {
      if (docSnap.exists()) {
        const d = docSnap.data();
        if (d.isVip !== undefined) currentIsVip = !!d.isVip;
        if (d.isAdmin !== undefined) currentIsAdmin = !!d.isAdmin || ADMIN_EMAILS.includes(normalizedEmail);
        if (d.isTeacher !== undefined) currentIsTeacher = !!d.isTeacher || TEACHER_EMAILS.includes(normalizedEmail);

        // Load personalized combo preferences
        if (d.comboPreferences) {
          if (Array.isArray(d.comboPreferences.preferredSectors)) {
            setPreferredSectors(d.comboPreferences.preferredSectors);
          }
          if (d.comboPreferences.goal) setComboGoal(d.comboPreferences.goal);
          if (d.comboPreferences.notes) setComboNotes(d.comboPreferences.notes);
        }
      }
      updateStats();
    }, () => updateStats());

    const unsubPurchased = onSnapshot(collection(db, "users", normalizedEmail, "purchased_courses"), (snap) => {
      const isVipDoc = snap.docs.some(d => d.id === 'vip-lifetime-access');
      const courseDocs = snap.docs.filter(d => d.id !== 'vip-lifetime-access' && !d.id.startsWith('combo-'));
      const comboDocs = snap.docs.filter(d => d.id.startsWith('combo-'));

      currentCount = courseDocs.length;
      currentCombosCount = comboDocs.length;
      if (isVipDoc) currentIsVip = true;

      // Filter unlocked combos
      const comboIds = comboDocs.map(d => d.id);
      const allCombos = getMergedCombos([], { includeInactive: true });
      const owned = allCombos.filter(c => comboIds.includes(c.id));
      setUnlockedCombos(owned);

      updateStats();
    }, () => updateStats());

    return () => {
      unsubUser();
      unsubPurchased();
    };
  }, [user]);

  // Avatar border styling
  const avatarBorderClass = useMemo(() => {
    if (userStatus.isAdmin || userStatus.isTeacher) {
      return 'border-4 border-blue-500 ring-4 ring-blue-500/30 shadow-blue-500/20';
    }
    if (userStatus.isVip) {
      return 'border-4 border-amber-400 ring-4 ring-amber-400/30 shadow-amber-500/20';
    }
    if (userStatus.coursesCount >= 5) {
      return 'border-4 border-[#007c76] ring-4 ring-[#007c76]/30 shadow-[#007c76]/20';
    }
    return 'border-4 border-white ring-2 ring-slate-200 shadow-xl';
  }, [userStatus]);

  // Role display badge
  const avatarBadgeInfo = useMemo(() => {
    if (userStatus.isAdmin) {
      return { bg: 'bg-blue-600 text-white', label: 'Quản trị viên (Admin)' };
    }
    if (userStatus.isTeacher) {
      return { bg: 'bg-blue-600 text-white', label: 'Giảng viên Chuyên môn' };
    }
    if (userStatus.isVip) {
      return { bg: 'bg-amber-400 text-gray-900 font-extrabold', label: 'Học viên VIP All-Access' };
    }
    if (userStatus.coursesCount >= 5) {
      return { bg: 'bg-[#007c76] text-white', label: `Học viên Cao cấp (${userStatus.coursesCount} khóa)` };
    }
    return { bg: 'bg-slate-700 text-white', label: 'Học viên Tiêu chuẩn' };
  }, [userStatus]);

  useEffect(() => {
    if (location.state && location.state.section === 'security') {
      setActiveTab('security');
    }
    if (location.state && location.state.section === 'combo') {
      setActiveTab('combo');
    }

    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      if (currentUser) {
        setUser(currentUser);
        setDisplayName(currentUser.displayName || '');
        setPhotoURL(currentUser.photoURL || '');
        setEmail(currentUser.email || '');
      } else if (!embed) {
        navigate('/account');
      }
    });
    return () => unsubscribe();
  }, [navigate, location, embed]);

  // Cleanup preview URL
  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const validTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];

      if (!validTypes.includes(file.type)) {
        toast.error('Vui lòng chọn định dạng ảnh hợp lệ (JPG, PNG, GIF, WEBP).');
        setMessage({ type: 'error', text: 'Vui lòng chọn định dạng ảnh hợp lệ (JPG, PNG, GIF, WEBP).' });
        return;
      }

      if (file.size > 5 * 1024 * 1024) {
        toast.error('Kích thước ảnh quá lớn (Tối đa 5MB).');
        setMessage({ type: 'error', text: 'Kích thước ảnh quá lớn (Tối đa 5MB).' });
        return;
      }

      setImageFile(file);
      const objectUrl = URL.createObjectURL(file);
      setPreviewUrl(objectUrl);
      setMessage(null);
      toast.info('Đã chọn ảnh đại diện mới. Nhấn "Lưu thay đổi" để hoàn tất.');
    }
  };

  const handleCancelPreview = () => {
    setImageFile(null);
    setPreviewUrl(null);
    setMessage(null);
    toast.info('Đã hủy chọn ảnh mới.');
  };

  const handleDeleteAvatar = () => {
    if (window.confirm("Bạn có chắc chắn muốn gỡ ảnh đại diện hiện tại không?")) {
      setImageFile(null);
      setPreviewUrl(null);
      setPhotoURL('');
      setMessage({ type: 'success', text: 'Đã gỡ ảnh. Nhấn "Lưu thay đổi" để áp dụng.' });
      toast.success('Đã gỡ ảnh. Nhấn "Lưu thay đổi" để áp dụng.');
    }
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setIsLoading(true);
    setMessage(null);

    try {
      let finalPhotoURL = photoURL;

      if (imageFile) {
        try {
          const timestamp = Date.now();
          const fileRef = ref(storage, `avatars/${user.uid}/profile_${timestamp}`);
          const snapshot = await uploadBytes(fileRef, imageFile);
          finalPhotoURL = await getDownloadURL(snapshot.ref);
        } catch (storageError: any) {
          console.error('Storage upload error:', storageError);
          throw new Error('Lỗi tải ảnh lên Storage: ' + storageError.message);
        }
      }

      await updateProfile(user, {
        displayName: displayName,
        photoURL: finalPhotoURL
      });

      if (user.email) {
        try {
          const normalizedEmail = user.email.toLowerCase();
          const userRef = doc(db, "users", normalizedEmail);
          await setDoc(userRef, {
            displayName: displayName,
            photoURL: finalPhotoURL,
            email: normalizedEmail,
            updatedAt: new Date().toISOString()
          }, { merge: true });
        } catch (err) {
          console.error("Lỗi đồng bộ Firestore:", err);
        }
      }

      await user.reload(); 
      const updatedUser = auth.currentUser;
      if (updatedUser) {
        setUser(updatedUser);
        setPhotoURL(updatedUser.photoURL || '');
      } else {
        setPhotoURL(finalPhotoURL);
      }

      setPreviewUrl(null); 
      setImageFile(null);  

      setMessage({ type: 'success', text: 'Lưu thay đổi thành công! Hồ sơ cá nhân đã được cập nhật.' });
      toast.success('Hồ sơ cá nhân của bạn đã được cập nhật thành công!');

    } catch (error: any) {
      console.error("Update Profile Error:", error);
      const errMsg = error.message || 'Vui lòng thử lại.';
      setMessage({ type: 'error', text: 'Lỗi cập nhật: ' + errMsg });
      toast.error('Cập nhật hồ sơ thất bại: ' + errMsg);
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateSecurity = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setIsLoading(true);
    setMessage(null);

    try {
      if (newPassword) {
        if (newPassword.length < 6) throw new Error("Mật khẩu mới phải có ít nhất 6 ký tự.");
        if (newPassword !== confirmPassword) throw new Error("Mật khẩu nhập lại không khớp.");
        
        await updatePassword(user, newPassword);
      }
      setMessage({ type: 'success', text: 'Cập nhật mật khẩu thành công! Bạn có thể cần đăng nhập lại.' });
      toast.success('Cập nhật mật khẩu thành công!');
      setNewPassword('');
      setConfirmPassword('');
    } catch (error: any) {
      if (error.code === 'auth/requires-recent-login') {
        const requireLoginMsg = 'Để bảo mật, vui lòng Đăng xuất và Đăng nhập lại trước khi đổi mật khẩu.';
        setMessage({ type: 'error', text: requireLoginMsg });
        toast.error(requireLoginMsg);
      } else {
        setMessage({ type: 'error', text: 'Lỗi: ' + error.message });
        toast.error('Cập nhật mật khẩu thất bại: ' + error.message);
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Toggle Preferred Sector
  const handleToggleSector = (sector: string) => {
    setPreferredSectors(prev =>
      prev.includes(sector) ? prev.filter(s => s !== sector) : [...prev, sector]
    );
  };

  // Save Personalized Combo Preferences
  const handleSaveComboPreferences = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !user.email) return;
    setIsLoading(true);
    setMessage(null);

    try {
      const normalizedEmail = user.email.toLowerCase();
      await setDoc(doc(db, 'users', normalizedEmail), {
        comboPreferences: {
          preferredSectors,
          goal: comboGoal.trim(),
          notes: comboNotes.trim(),
          updatedAt: new Date().toISOString()
        }
      }, { merge: true });

      toast.success('Đã cập nhật cấu hình quản lý Combo cá nhân thành công!');
      setMessage({ type: 'success', text: 'Cấu hình quản lý Combo cá nhân đã được lưu vĩnh viễn.' });
    } catch (err: any) {
      console.error('Lỗi lưu cấu hình Combo:', err);
      toast.error('Cập nhật thất bại: ' + (err.message || ''));
      setMessage({ type: 'error', text: 'Không thể lưu cấu hình Combo cá nhân.' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteMyAccount = async () => {
    if (!user || !user.email) return;

    if (deleteSelfEmail.toLowerCase() !== user.email.toLowerCase()) {
      const notMatchMsg = 'Email xác nhận không khớp. Vui lòng nhập đúng email của bạn.';
      setMessage({ type: 'error', text: notMatchMsg });
      toast.error(notMatchMsg);
      return;
    }
    
    if (!window.confirm("CẢNH BÁO: Tài khoản sẽ bị xóa vĩnh viễn. Bạn chắc chắn chứ?")) return;

    setIsLoading(true);
    setMessage(null);

    try {
      const email = user.email.toLowerCase();
      await deleteDoc(doc(db, "users", email));
      await deleteUser(user);
      toast.success('Tài khoản của bạn đã được xóa vĩnh viễn!');
      navigate('/');
    } catch (e: any) {
      console.error(e);
      if (e.code === 'auth/requires-recent-login') {
        const requireLoginMsg = 'Vui lòng Đăng xuất và Đăng nhập lại trước khi thực hiện hành động này.';
        setMessage({ type: 'error', text: requireLoginMsg });
        toast.error(requireLoginMsg);
      } else {
        setMessage({ type: 'error', text: 'Lỗi: ' + e.message });
        toast.error('Xóa tài khoản thất bại: ' + e.message);
      }
    } finally {
      setIsLoading(false);
    }
  };

  if (!user) return null;

  return (
    <div className={embed ? "animate-in fade-in duration-300" : "min-h-screen bg-slate-50 py-8 md:py-16 px-4 sm:px-6 transition-colors duration-300 animate-in fade-in duration-300"}>
      <div className={embed ? "space-y-6 md:space-y-8" : "max-w-4xl mx-auto space-y-6 md:space-y-8"}>
        
        {/* Back Button */}
        {!embed && (
          <div className="flex items-center justify-between mb-2">
            <button 
              type="button"
              onClick={() => navigate('/account')}
              className="flex items-center gap-2 text-slate-600 hover:text-[#007c76] font-bold transition-colors text-xs sm:text-sm uppercase tracking-wider cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Quay Lại Trang Tài Khoản</span>
            </button>
          </div>
        )}

        {/* HIGH-END USER STATUS BANNER CARD */}
        <div className="bg-gradient-to-r from-slate-900 via-[#004e4a] to-[#007c76] rounded-[32px] p-6 sm:p-8 text-white shadow-xl relative overflow-hidden border border-teal-500/30">
          <div className="absolute top-0 right-0 w-80 h-80 bg-teal-400/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20"></div>
          
          <div className="relative z-10 flex flex-col sm:flex-row items-center sm:items-start gap-6 text-center sm:text-left">
            {/* Avatar Circle with Dynamic Colored Ring */}
            <div className="relative shrink-0">
              <div className={`w-28 h-28 sm:w-32 sm:h-32 rounded-full overflow-hidden bg-white shadow-2xl transition-all ${avatarBorderClass}`}>
                <img 
                  src={previewUrl || photoURL || "https://www.gravatar.com/avatar/00000000000000000000000000000000?d=mp&f=y"} 
                  alt="Avatar" 
                  className="w-full h-full object-cover" 
                />
              </div>
              <span className={`absolute -bottom-2 left-1/2 -translate-x-1/2 text-[10px] font-black px-3 py-1 rounded-full shadow-md uppercase tracking-wider whitespace-nowrap border border-white/20 ${avatarBadgeInfo.bg}`}>
                {avatarBadgeInfo.label}
              </span>
            </div>

            {/* Profile Info & Activity Badges */}
            <div className="flex-1 space-y-3 min-w-0">
              <div>
                <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                  <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                    {displayName || 'Học viên FAST'}
                  </h1>
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 rounded-full text-[10px] font-bold">
                    <ShieldCheck className="w-3 h-3 text-emerald-400" />
                    Đã xác thực
                  </span>
                </div>
                <p className="text-xs text-teal-100 font-mono mt-1 flex items-center justify-center sm:justify-start gap-1.5 opacity-90">
                  <Mail className="w-3.5 h-3.5 text-teal-300" />
                  <span>{user.email}</span>
                </p>
              </div>

              {/* Status & Stats Badges Strip */}
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 pt-1">
                <div className="px-3 py-1 bg-white/10 backdrop-blur-md rounded-xl text-[11px] font-bold text-teal-100 border border-white/10 flex items-center gap-1.5">
                  <BookOpen className="w-3.5 h-3.5 text-teal-300" />
                  <span>{userStatus.coursesCount} khóa học sở hữu</span>
                </div>
                <div className="px-3 py-1 bg-white/10 backdrop-blur-md rounded-xl text-[11px] font-bold text-amber-200 border border-white/10 flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5 text-amber-300" />
                  <span>{userStatus.unlockedCombosCount} gói Combo kích hoạt</span>
                </div>
                {userStatus.joinedDate && (
                  <div className="px-3 py-1 bg-white/10 backdrop-blur-md rounded-xl text-[11px] font-bold text-slate-300 border border-white/10 flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-slate-300" />
                    <span>Gia nhập: {userStatus.joinedDate}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* TAB NAVIGATION BAR */}
        <div className="bg-white p-1.5 sm:p-2 rounded-2xl shadow-sm border border-slate-200 flex flex-wrap gap-1 sm:gap-2">
          <button 
            type="button"
            onClick={() => setActiveTab('profile')}
            className={`flex-1 min-w-[120px] py-2.5 sm:py-3 px-3 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center justify-center gap-2 cursor-pointer ${
              activeTab === 'profile' ? 'bg-[#007c76] text-white shadow-md' : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <UserIcon className="w-4 h-4" />
            <span>Hồ sơ</span>
          </button>

          <button 
            type="button"
            onClick={() => setActiveTab('combo')}
            className={`flex-1 min-w-[140px] py-2.5 sm:py-3 px-3 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center justify-center gap-2 cursor-pointer ${
              activeTab === 'combo' ? 'bg-[#007c76] text-white shadow-md' : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <Layers className="w-4 h-4 text-amber-300" />
            <span>Quản Lý Combo</span>
          </button>

          <button 
            type="button"
            onClick={() => setActiveTab('security')}
            className={`flex-1 min-w-[120px] py-2.5 sm:py-3 px-3 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center justify-center gap-2 cursor-pointer ${
              activeTab === 'security' ? 'bg-[#007c76] text-white shadow-md' : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <KeyRound className="w-4 h-4" />
            <span>Bảo mật</span>
          </button>

          <button 
            type="button"
            onClick={() => setActiveTab('appearance')}
            className={`flex-1 min-w-[120px] py-2.5 sm:py-3 px-3 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center justify-center gap-2 cursor-pointer ${
              activeTab === 'appearance' ? 'bg-[#007c76] text-white shadow-md' : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <Palette className="w-4 h-4" />
            <span>Giao diện</span>
          </button>
        </div>

        {/* SYSTEM MESSAGE BANNER */}
        {message && (
          <div className={`p-4 rounded-2xl text-xs sm:text-sm font-bold border flex items-center gap-3 animate-in fade-in ${
            message.type === 'success' ? 'bg-emerald-50 text-emerald-800 border-emerald-200' : 'bg-rose-50 text-rose-800 border-rose-200'
          }`}>
            {message.type === 'success' ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            ) : (
              <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0" />
            )}
            <span>{message.text}</span>
          </div>
        )}

        {/* TAB 1: PROFILE EDIT */}
        {activeTab === 'profile' && (
          <div className="bg-white p-6 sm:p-8 rounded-[32px] border border-slate-200 shadow-sm space-y-6">
            <h2 className="text-lg sm:text-xl font-black text-slate-800 uppercase tracking-tight flex items-center gap-2">
              <span className="w-1.5 h-5 bg-[#007c76] rounded-full"></span>
              Chỉnh Sửa Hồ Sơ Cá Nhân
            </h2>

            <form onSubmit={handleUpdateProfile} className="space-y-6">
              {/* Avatar Uploader Section */}
              <div className="flex flex-col items-center p-6 bg-slate-50 rounded-3xl border border-dashed border-slate-200 relative">
                <div className="relative mb-3">
                  <div className={`w-32 h-32 rounded-full overflow-hidden bg-white shadow-md ${avatarBorderClass}`}>
                    <img 
                      src={previewUrl || photoURL || "https://www.gravatar.com/avatar/00000000000000000000000000000000?d=mp&f=y"} 
                      alt="Avatar Preview" 
                      className="w-full h-full object-cover" 
                    />
                  </div>
                  {previewUrl && (
                    <span className="absolute top-0 right-0 bg-emerald-500 text-white text-[10px] font-black px-2 py-0.5 rounded-full shadow-sm animate-bounce">
                      Mới
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <input 
                    type="file" 
                    id="avatar-upload"
                    accept="image/png, image/jpeg, image/gif, image/webp"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                  <label 
                    htmlFor="avatar-upload"
                    className="px-4 py-2 bg-white hover:bg-teal-50 text-[#007c76] border border-teal-200 font-bold text-xs uppercase tracking-wider rounded-xl cursor-pointer transition-all flex items-center gap-1.5 shadow-xs"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    <span>Tải ảnh từ thiết bị</span>
                  </label>

                  {previewUrl && (
                    <button
                      type="button"
                      onClick={handleCancelPreview}
                      className="px-3 py-2 bg-slate-200 text-slate-700 font-bold text-xs uppercase tracking-wider rounded-xl hover:bg-slate-300 transition-all cursor-pointer"
                    >
                      Hủy
                    </button>
                  )}

                  {!previewUrl && photoURL && (
                    <button
                      type="button"
                      onClick={handleDeleteAvatar}
                      className="px-3 py-2 bg-rose-50 text-rose-600 font-bold text-xs uppercase tracking-wider rounded-xl hover:bg-rose-100 transition-all cursor-pointer"
                    >
                      Gỡ ảnh
                    </button>
                  )}
                </div>
                <p className="mt-2 text-[10px] text-slate-400 font-medium">Định dạng JPG, PNG, WEBP (Tối đa 5MB)</p>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">Tên hiển thị trên hệ thống *</label>
                <input
                  type="text"
                  required
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-slate-800 text-sm focus:outline-none focus:bg-white focus:border-[#007c76] transition-all"
                  placeholder="Nhập tên hiển thị của bạn..."
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Email đăng nhập (Cố định)</label>
                <input
                  type="email"
                  disabled
                  value={email}
                  className="w-full px-4 py-3 bg-slate-100 border border-slate-200 rounded-2xl font-bold text-slate-500 text-sm cursor-not-allowed"
                />
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3.5 bg-[#007c76] hover:bg-[#005f5b] text-white rounded-2xl font-black uppercase tracking-wider text-xs shadow-md shadow-[#007c76]/20 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {isLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                <span>Lưu Thay Đổi Hồ Sơ</span>
              </button>
            </form>
          </div>
        )}

        {/* TAB 2: PERSONALIZED COMBO MANAGEMENT */}
        {activeTab === 'combo' && (
          <div className="bg-white p-6 sm:p-8 rounded-[32px] border border-slate-200 shadow-sm space-y-8 animate-in fade-in duration-250">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-150 pb-5">
              <div>
                <h2 className="text-lg sm:text-xl font-black text-slate-800 uppercase tracking-tight flex items-center gap-2">
                  <span className="w-1.5 h-5 bg-amber-500 rounded-full"></span>
                  Quản Lý Gói Combo Cá Nhân Hóa
                </h2>
                <p className="text-xs text-slate-500 font-medium mt-0.5">
                  Cấu hình định hướng học tập, ngành nghề ưu tiên và quản lý danh sách các gói Combo đã mở khóa
                </p>
              </div>
              <span className="px-3 py-1 bg-amber-50 text-amber-800 border border-amber-200 rounded-full text-[10px] font-black uppercase tracking-wider self-start sm:self-auto">
                ⚡ Personalized Combo Engine
              </span>
            </div>

            {/* Section A: Registered / Unlocked Combos */}
            <div className="space-y-4">
              <h3 className="text-xs font-black uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
                <Crown className="w-4 h-4 text-amber-500" />
                Gói Combo Đã Mở Khóa ({unlockedCombos.length})
              </h3>

              {unlockedCombos.length === 0 ? (
                <div className="p-6 bg-slate-50 rounded-2xl border border-dashed border-slate-200 text-center space-y-3">
                  <Layers className="w-8 h-8 text-slate-300 mx-auto" />
                  <p className="text-xs text-slate-500 font-bold">Bạn chưa đăng ký gói Combo nào.</p>
                  <button
                    type="button"
                    onClick={() => navigate('/khoa-hoc')}
                    className="px-4 py-2 bg-[#007c76] text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all shadow-xs cursor-pointer inline-flex items-center gap-1.5"
                  >
                    <span>Khám phá các gói Combo ưu đãi</span>
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {unlockedCombos.map(combo => (
                    <div key={combo.id} className="p-4 bg-teal-50/50 border border-teal-200 rounded-2xl flex items-center justify-between gap-3 shadow-2xs">
                      <div className="min-w-0">
                        <span className="text-[10px] font-black uppercase text-teal-700 bg-teal-100 px-2 py-0.5 rounded">
                          Đã sở hữu
                        </span>
                        <h4 className="text-xs font-black text-slate-900 mt-1 line-clamp-1">{combo.title}</h4>
                        <p className="text-[11px] font-bold text-[#007c76]">{combo.price}</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => navigate('/khoa-hoc')}
                        className="px-3 py-1.5 bg-[#007c76] text-white rounded-xl text-[11px] font-bold shrink-0 cursor-pointer"
                      >
                        Vào học ngay
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Section B: Sector Preferences & Custom Learning Roadmap */}
            <form onSubmit={handleSaveComboPreferences} className="space-y-6 pt-4 border-t border-slate-150">
              {/* Sector Selection */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2.5 flex items-center gap-1.5">
                  <Briefcase className="w-4 h-4 text-[#007c76]" />
                  Phân loại Ngành nghề Ưu tiên ghép Combo <span className="text-slate-400 font-normal">(Chọn nhiều)</span>
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                  {SECTOR_OPTIONS.map((sec) => {
                    const isSelected = preferredSectors.includes(sec);
                    return (
                      <button
                        key={sec}
                        type="button"
                        onClick={() => handleToggleSector(sec)}
                        className={`p-3 rounded-2xl border text-left text-xs font-bold transition-all cursor-pointer flex items-center justify-between gap-2 ${
                          isSelected
                            ? 'bg-teal-50/90 text-[#007c76] border-teal-300 shadow-2xs'
                            : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        <span className="line-clamp-1">{sec}</span>
                        {isSelected ? (
                          <CheckCircle2 className="w-4 h-4 text-[#007c76] shrink-0" />
                        ) : (
                          <span className="w-4 h-4 rounded-full border border-slate-300 shrink-0"></span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Learning Goal Target */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2 flex items-center gap-1.5">
                  <Target className="w-4 h-4 text-[#007c76]" />
                  Mục tiêu Học tập &amp; Phát triển Năng lực Combo
                </label>
                <input
                  type="text"
                  value={comboGoal}
                  onChange={(e) => setComboGoal(e.target.value)}
                  placeholder="VD: Đạt chứng chỉ Trưởng đoàn Đánh giá ISO 22000 trong 6 tháng..."
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs sm:text-sm font-bold text-slate-800 focus:outline-none focus:bg-white focus:border-[#007c76] transition-all"
                />
              </div>

              {/* Personal Notes / Custom Request */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
                  Ghi chú &amp; Yêu cầu Cấu hình Combo Thiết kế Riêng
                </label>
                <textarea
                  rows={3}
                  value={comboNotes}
                  onChange={(e) => setComboNotes(e.target.value)}
                  placeholder="Ghi chú các khóa học bạn muốn ghép thành Combo ưu đãi riêng biệt với Chuyên gia FAST..."
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs sm:text-sm font-medium text-slate-800 focus:outline-none focus:bg-white focus:border-[#007c76] transition-all leading-relaxed"
                />
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3.5 bg-[#007c76] hover:bg-[#005f5b] text-white rounded-2xl font-black uppercase tracking-wider text-xs shadow-md shadow-[#007c76]/20 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {isLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                <span>Lưu Cấu Hình Combo Cá Nhân</span>
              </button>
            </form>
          </div>
        )}

        {/* TAB 3: SECURITY TAB */}
        {activeTab === 'security' && (
          <div className="bg-white p-6 sm:p-8 rounded-[32px] border border-slate-200 shadow-sm space-y-6">
            <h2 className="text-lg sm:text-xl font-black text-slate-800 uppercase tracking-tight flex items-center gap-2">
              <span className="w-1.5 h-5 bg-rose-500 rounded-full"></span>
              Cài Đặt Mật Khẩu &amp; Bảo Mật
            </h2>

            <form onSubmit={handleUpdateSecurity} className="space-y-6">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Email tài khoản</label>
                <input
                  type="email"
                  disabled
                  value={email}
                  className="w-full px-4 py-3 bg-slate-100 border border-slate-200 rounded-2xl font-bold text-slate-500 text-sm cursor-not-allowed opacity-70"
                />
              </div>

              <div className="bg-amber-50 p-5 rounded-2xl border border-amber-200 space-y-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-amber-900 mb-2">Mật khẩu mới</label>
                  <div className="relative">
                    <input
                      type={showPassword ? "text" : "password"}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="w-full px-4 py-3 pr-11 bg-white border border-amber-300 rounded-xl font-bold text-slate-800 text-sm focus:outline-none focus:border-[#007c76]"
                      placeholder="Nhập mật khẩu mới (ít nhất 6 ký tự)"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-amber-900 mb-2">Xác nhận mật khẩu mới</label>
                  <div className="relative">
                    <input
                      type={showConfirmPassword ? "text" : "password"}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="w-full px-4 py-3 pr-11 bg-white border border-amber-300 rounded-xl font-bold text-slate-800 text-sm focus:outline-none focus:border-[#007c76]"
                      placeholder="Xác nhận lại mật khẩu mới"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                    >
                      {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  {newPassword && confirmPassword && newPassword !== confirmPassword && (
                    <p className="text-rose-600 text-[11px] mt-1 font-bold">Mật khẩu xác nhận không khớp.</p>
                  )}
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3.5 bg-rose-600 hover:bg-rose-700 text-white rounded-2xl font-black uppercase tracking-wider text-xs shadow-md shadow-rose-600/20 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {isLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Lock className="w-4 h-4" />}
                <span>Cập Nhật Mật Khẩu</span>
              </button>
            </form>

            {/* Danger Zone */}
            <div className="pt-8 border-t border-rose-200">
              <h3 className="text-base font-black text-rose-600 uppercase tracking-tight flex items-center gap-2 mb-3">
                <AlertTriangle className="w-4 h-4 text-rose-600" />
                Vùng Nguy Hiểm - Xóa Tài Khoản
              </h3>
              
              {!showDeleteZone ? (
                <button 
                  type="button"
                  onClick={() => setShowDeleteZone(true)}
                  className="text-rose-600 font-bold hover:underline text-xs cursor-pointer"
                >
                  Tôi muốn xóa tài khoản này khỏi hệ thống
                </button>
              ) : (
                <div className="bg-rose-50 p-5 rounded-2xl border border-rose-200 space-y-3 animate-in fade-in">
                  <p className="text-xs font-bold text-rose-900 leading-relaxed">
                    Hành động này sẽ xóa vĩnh viễn tài khoản của bạn khỏi hệ thống. Vui lòng nhập email <strong className="text-slate-900">{user.email}</strong> để xác nhận.
                  </p>
                  <div className="flex flex-col sm:flex-row gap-2">
                    <input 
                      type="text" 
                      placeholder={user.email || ''}
                      value={deleteSelfEmail}
                      onChange={(e) => setDeleteSelfEmail(e.target.value)}
                      className="flex-1 px-3.5 py-2.5 bg-white border border-rose-300 rounded-xl text-xs font-bold text-slate-800"
                    />
                    <button 
                      type="button"
                      onClick={handleDeleteMyAccount}
                      disabled={deleteSelfEmail !== user.email || isLoading}
                      className="px-4 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-black text-xs uppercase tracking-wider disabled:opacity-50 cursor-pointer"
                    >
                      Xóa Vĩnh Viễn
                    </button>
                    <button 
                      type="button"
                      onClick={() => setShowDeleteZone(false)}
                      className="px-4 py-2.5 bg-white text-slate-700 border border-slate-200 rounded-xl font-bold text-xs hover:bg-slate-50 cursor-pointer"
                    >
                      Hủy
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 4: APPEARANCE TAB */}
        {activeTab === 'appearance' && (
          <div className="bg-white p-6 sm:p-8 rounded-[32px] border border-slate-200 shadow-sm space-y-6">
            <h2 className="text-lg sm:text-xl font-black text-slate-800 uppercase tracking-tight flex items-center gap-2">
              <span className="w-1.5 h-5 bg-[#007c76] rounded-full"></span>
              Tùy Chỉnh Giao Diện Ứng Dụng
            </h2>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div 
                onClick={() => theme !== 'default' && toggleTheme()}
                className={`cursor-pointer rounded-2xl border-2 p-5 transition-all ${
                  theme === 'default' ? 'border-[#007c76] bg-teal-50/40 shadow-xs' : 'border-slate-200 hover:border-teal-300'
                }`}
              >
                <h3 className="text-sm font-black text-slate-800 mb-1">Mặc định (Giao diện Sáng)</h3>
                <p className="text-xs text-slate-500 font-medium">Nền sáng chuẩn mực FAST CONSULTING.</p>
              </div>

              <div 
                onClick={() => theme !== 'inverted' && toggleTheme()}
                className={`cursor-pointer rounded-2xl border-2 p-5 transition-all ${
                  theme === 'inverted' ? 'border-[#007c76] bg-[#007c76] text-white shadow-xs' : 'border-slate-200 hover:border-teal-300'
                }`}
              >
                <h3 className={`text-sm font-black mb-1 ${theme === 'inverted' ? 'text-white' : 'text-slate-800'}`}>FAST Signature (Giao diện Đậm)</h3>
                <p className={`text-xs font-medium ${theme === 'inverted' ? 'text-teal-100' : 'text-slate-500'}`}>Nền xanh ngọc đậm thương hiệu.</p>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};

export default AccountSettings;
