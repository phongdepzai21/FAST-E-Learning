import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { auth, storage, db } from '../firebase';
import { 
  updateProfile, 
  updatePassword, 
  deleteUser,
  onAuthStateChanged,
  GoogleAuthProvider,
  linkWithPopup,
  type User
} from 'firebase/auth';
import {
  getLinkedProviderStatus,
  linkCurrentUserWithFacebook,
  syncLinkedProvidersMetadata,
  isRealFirebaseUser,
  type LinkedProviderStatus
} from '../utils/accountLinking';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { doc, setDoc, deleteDoc, collection, onSnapshot } from 'firebase/firestore'; 
import { useToast } from '../contexts/ToastContext';
import { ADMIN_EMAILS, TEACHER_EMAILS } from '../constants';
import {
  User as UserIcon, 
  ShieldCheck, 
  BookOpen, 
  KeyRound, 
  CheckCircle2, 
  Save, 
  RefreshCw, 
  AlertTriangle,
  ArrowLeft,
  Upload,
  Calendar,
  Mail,
  Lock,
  Eye,
  EyeOff,
  ChevronDown
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

const AccountSettings: React.FC<{ embed?: boolean }> = ({ embed = false }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const toast = useToast();
  
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Tab State: 'profile' | 'security'
  const [activeTab, setActiveTab] = useState<'profile' | 'security'>('profile');

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

  // Linked Login Providers State
  const [providerStatus, setProviderStatus] = useState<LinkedProviderStatus>({
    isGoogleLinked: false,
    isPasswordSet: false,
    isFacebookLinked: false,
    providerIds: [],
  });
  const [isLinkingProvider, setIsLinkingProvider] = useState<'facebook' | 'google' | null>(null);
  const [isLinksExpanded, setIsLinksExpanded] = useState(false);

  // User status for Avatar color rules & Status Card
  const [userStatus, setUserStatus] = useState<{ 
    isVip: boolean; 
    isAdmin: boolean; 
    isTeacher: boolean; 
    coursesCount: number;
    joinedDate?: string;
  }>({
    isVip: false,
    isAdmin: false,
    isTeacher: false,
    coursesCount: 0
  });

  // Listen to User Profile & Status Real-time
  useEffect(() => {
    if (!user || (!user.email && !user.uid)) return;
    const normalizedEmail = (user.email || '').toLowerCase().trim();
    const accountDocKey = normalizedEmail || user.uid;

    let localIsAdmin = normalizedEmail ? ADMIN_EMAILS.includes(normalizedEmail) : false;
    let localIsTeacher = normalizedEmail ? TEACHER_EMAILS.includes(normalizedEmail) : false;
    let localIsVip = false;

    try {
      const localRoles = localStorage.getItem(`user_roles_${accountDocKey}`);
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

    const updateStats = () => {
      const creationTime = user.metadata.creationTime 
        ? new Date(user.metadata.creationTime).toLocaleDateString('vi-VN')
        : '2026';

      setUserStatus({
        isVip: currentIsVip,
        isAdmin: currentIsAdmin,
        isTeacher: currentIsTeacher,
        coursesCount: currentCount,
        joinedDate: creationTime
      });
    };

    const unsubUser = onSnapshot(doc(db, "users", accountDocKey), (docSnap) => {
      if (docSnap.exists()) {
        const d = docSnap.data();
        if (d.isVip !== undefined) currentIsVip = !!d.isVip;
        if (d.isAdmin !== undefined) currentIsAdmin = !!d.isAdmin || (normalizedEmail ? ADMIN_EMAILS.includes(normalizedEmail) : false);
        if (d.isTeacher !== undefined) currentIsTeacher = !!d.isTeacher || (normalizedEmail ? TEACHER_EMAILS.includes(normalizedEmail) : false);
      }
      updateStats();
    }, () => updateStats());

    const unsubPurchased = onSnapshot(collection(db, "users", accountDocKey, "purchased_courses"), (snap) => {
      const isVipDoc = snap.docs.some(d => d.id === 'vip-lifetime-access');
      const courseDocs = snap.docs.filter(d => d.id !== 'vip-lifetime-access' && !d.id.startsWith('combo-'));

      currentCount = courseDocs.length;
      if (isVipDoc) currentIsVip = true;

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

    const refreshProviderStatus = (targetUser: User | null) => {
      setProviderStatus(getLinkedProviderStatus(targetUser));
    };

    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      if (currentUser) {
        setUser(currentUser);
        setDisplayName(currentUser.displayName || '');
        setPhotoURL(currentUser.photoURL || '');
        setEmail(currentUser.email || '');
        refreshProviderStatus(currentUser);
      } else if (!embed) {
        navigate('/account');
      }
    });

    const handleProvidersUpdated = () => {
      refreshProviderStatus(auth.currentUser);
    };
    window.addEventListener('user_providers_updated', handleProvidersUpdated);

    return () => {
      unsubscribe();
      window.removeEventListener('user_providers_updated', handleProvidersUpdated);
    };
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

      const normalizedEmail = (user.email || '').toLowerCase().trim();
      const accountDocKey = normalizedEmail || user.uid;
      if (accountDocKey) {
        try {
          const userRef = doc(db, "users", accountDocKey);
          await setDoc(userRef, {
            displayName: displayName,
            photoURL: finalPhotoURL,
            ...(normalizedEmail ? { email: normalizedEmail } : {}),
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
        await syncLinkedProvidersMetadata(user);
        setProviderStatus(getLinkedProviderStatus(auth.currentUser || user));
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

  const handleLinkFacebook = async () => {
    const activeUser = auth.currentUser || user;
    if (!activeUser || isLinkingProvider) return;

    setIsLinkingProvider('facebook');
    setMessage(null);
    try {
      const result = await linkCurrentUserWithFacebook(activeUser);
      setProviderStatus(getLinkedProviderStatus(auth.currentUser || activeUser));
      if (result.ok) {
        if (auth.currentUser) setUser(auth.currentUser);
        setMessage({ type: 'success', text: result.message });
        if (result.alreadyLinked) {
          toast.info(result.message);
        } else {
          toast.success('Đã liên kết tài khoản Facebook thành công!');
        }
      } else {
        setMessage({ type: 'error', text: result.message });
        if (result.errorCode === 'auth/popup-closed-by-user') {
          toast.info(result.message);
        } else {
          toast.error(result.title || 'Liên kết Facebook thất bại.');
        }
      }
    } finally {
      setIsLinkingProvider(null);
    }
  };

  const handleLinkGoogle = async () => {
    const activeUser = auth.currentUser || user;
    if (!activeUser || isLinkingProvider) return;

    if (!isRealFirebaseUser(activeUser)) {
      const msg = 'Phiên đăng nhập hiện tại là chế độ dự phòng ngoại tuyến. Vui lòng đăng nhập lại bằng Google hoặc Email/Mật khẩu để liên kết.';
      setMessage({ type: 'error', text: msg });
      toast.error(msg);
      return;
    }

    if (providerStatus.isGoogleLinked) {
      const msg = 'Tài khoản này đã được liên kết với Google trước đó.';
      setMessage({ type: 'success', text: msg });
      toast.info(msg);
      return;
    }

    setIsLinkingProvider('google');
    setMessage(null);
    const uidBefore = activeUser.uid;
    try {
      const googleProvider = new GoogleAuthProvider();
      googleProvider.setCustomParameters({ prompt: 'select_account' });
      const res = await linkWithPopup(activeUser, googleProvider);
      if (res.user.uid !== uidBefore) {
        throw new Error('Phát hiện thay đổi UID ngoài ý muốn.');
      }
      await syncLinkedProvidersMetadata(res.user);
      setUser(res.user);
      setProviderStatus(getLinkedProviderStatus(res.user));
      const msg = 'Đã liên kết tài khoản Google thành công! Bạn có thể dùng Google để đăng nhập tài khoản này.';
      setMessage({ type: 'success', text: msg });
      toast.success('Đã liên kết tài khoản Google thành công!');
    } catch (err: any) {
      const code = err?.code || '';
      if (code === 'auth/provider-already-linked') {
        await syncLinkedProvidersMetadata(activeUser);
        setProviderStatus(getLinkedProviderStatus(auth.currentUser || activeUser));
        toast.info('Tài khoản này đã được liên kết với Google trước đó.');
      } else if (code === 'auth/credential-already-in-use' || code === 'auth/email-already-in-use') {
        const msg = 'Tài khoản Google này đã được liên kết với một tài khoản (UID) FAST E-Learning khác. Hệ thống không tự động gộp dữ liệu và giữ nguyên phiên đăng nhập hiện tại.';
        setMessage({ type: 'error', text: msg });
        toast.error('Tài khoản Google này đang gắn với tài khoản khác.');
      } else if (code === 'auth/popup-closed-by-user') {
        const msg = 'Bạn đã đóng cửa sổ Google trước khi hoàn tất. Phiên đăng nhập hiện tại vẫn được giữ nguyên.';
        setMessage({ type: 'error', text: msg });
        toast.info(msg);
      } else if (code === 'auth/popup-blocked') {
        const msg = 'Trình duyệt đã chặn cửa sổ bật lên Google. Vui lòng bật quyền popup và thử lại.';
        setMessage({ type: 'error', text: msg });
        toast.error(msg);
      } else {
        const msg = err?.message || 'Không thể liên kết tài khoản Google lúc này.';
        setMessage({ type: 'error', text: msg });
        toast.error('Liên kết Google thất bại.');
      }
    } finally {
      setIsLinkingProvider(null);
    }
  };

  const handleDeleteMyAccount = async () => {
    if (!user) return;
    const expectedConfirmKey = (user.email || user.uid || '').toLowerCase();
    if (!expectedConfirmKey) return;

    if (deleteSelfEmail.trim().toLowerCase() !== expectedConfirmKey) {
      const notMatchMsg = user.email
        ? 'Email xác nhận không khớp. Vui lòng nhập đúng email của bạn.'
        : 'Mã UID xác nhận không khớp. Vui lòng nhập đúng mã xác nhận.';
      setMessage({ type: 'error', text: notMatchMsg });
      toast.error(notMatchMsg);
      return;
    }
    
    if (!window.confirm("CẢNH BÁO: Tài khoản sẽ bị xóa vĩnh viễn. Bạn chắc chắn chứ?")) return;

    setIsLoading(true);
    setMessage(null);

    try {
      await deleteDoc(doc(db, "users", expectedConfirmKey));
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

  const hasUnlinkedMethod =
    !providerStatus.isFacebookLinked ||
    !providerStatus.isGoogleLinked ||
    !providerStatus.isPasswordSet;

  const renderLinkedMethodsSection = () => (
    <div className="bg-slate-50/80 rounded-3xl border border-slate-200/90 overflow-hidden">
      <button
        type="button"
        onClick={() => setIsLinksExpanded((prev) => !prev)}
        className="w-full p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-left hover:bg-slate-100/70 transition-colors cursor-pointer"
      >
        <div className="space-y-1.5 min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-sm sm:text-base font-black text-slate-800 uppercase tracking-tight">
              Phương thức đăng nhập &amp; Liên kết tài khoản
            </h3>
            {hasUnlinkedMethod && (
              <span className="px-2 py-0.5 rounded-lg bg-amber-100 text-amber-800 text-[10px] font-black uppercase tracking-wider">
                Có mục chưa liên kết
              </span>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-1.5">
            <span
              className={`px-2 py-0.5 rounded-lg text-[10px] font-bold border ${
                providerStatus.isGoogleLinked
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                  : 'bg-white text-slate-500 border-slate-200'
              }`}
            >
              Google: {providerStatus.isGoogleLinked ? 'Đã liên kết' : 'Chưa liên kết'}
            </span>
            <span
              className={`px-2 py-0.5 rounded-lg text-[10px] font-bold border ${
                providerStatus.isPasswordSet
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                  : 'bg-white text-slate-500 border-slate-200'
              }`}
            >
              Email/Password: {providerStatus.isPasswordSet ? 'Đã thiết lập' : 'Chưa thiết lập'}
            </span>
            <span
              className={`px-2 py-0.5 rounded-lg text-[10px] font-bold border ${
                providerStatus.isFacebookLinked
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                  : 'bg-blue-50 text-[#1877F2] border-blue-200'
              }`}
            >
              Facebook: {providerStatus.isFacebookLinked ? 'Đã liên kết' : 'Chưa liên kết'}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-center shrink-0">
          <span className="text-[11px] font-extrabold text-[#007c76]">
            {isLinksExpanded ? 'Thu gọn' : 'Kéo xuống để liên kết'}
          </span>
          <div className="w-8 h-8 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-slate-600">
            <ChevronDown
              className={`w-4 h-4 transition-transform duration-200 ${isLinksExpanded ? 'rotate-180' : ''}`}
            />
          </div>
        </div>
      </button>

      <AnimatePresence initial={false}>
        {isLinksExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.24, ease: [0.16, 1, 0.3, 1] }}
            className="overflow-hidden"
          >
            <div className="px-4 sm:px-5 pb-5 pt-2 border-t border-slate-200/80 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-1">
                <p className="text-xs text-slate-500 font-medium">
                  Tất cả phương thức đã liên kết dùng chung một mã tài khoản (UID) và bảo toàn toàn bộ khóa học của bạn.
                </p>
                <span className="text-[10px] font-mono font-bold text-slate-500 bg-white px-2.5 py-1 rounded-lg border border-slate-200 self-start sm:self-auto shrink-0">
                  UID: {user.uid}
                </span>
              </div>

              <div className="grid grid-cols-1 gap-3">
                {/* Google */}
                <div className="bg-white p-4 rounded-2xl border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-center shrink-0">
                      <img
                        src="https://upload.wikimedia.org/wikipedia/commons/c/c1/Google_%22G%22_logo.svg"
                        alt="Google"
                        className="w-5 h-5"
                      />
                    </div>
                    <div>
                      <p className="text-sm font-black text-slate-800">Google</p>
                      <p className={`text-xs font-bold ${providerStatus.isGoogleLinked ? 'text-emerald-600' : 'text-slate-400'}`}>
                        {providerStatus.isGoogleLinked ? 'Đã liên kết' : 'Chưa liên kết'}
                      </p>
                    </div>
                  </div>

                  {providerStatus.isGoogleLinked ? (
                    <span className="px-3.5 py-2 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-bold self-start sm:self-auto">
                      Đã liên kết Google
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={handleLinkGoogle}
                      disabled={isLinkingProvider !== null}
                      className="px-4 py-2.5 rounded-xl bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 text-xs font-bold transition-all cursor-pointer disabled:opacity-60 self-start sm:self-auto"
                    >
                      {isLinkingProvider === 'google' ? 'Đang liên kết...' : 'Liên kết Google'}
                    </button>
                  )}
                </div>

                {/* Email / Password */}
                <div className="bg-white p-4 rounded-2xl border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-teal-50 border border-teal-200 text-[#007c76] flex items-center justify-center shrink-0">
                      <KeyRound className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-sm font-black text-slate-800">Email/Password</p>
                      <p className={`text-xs font-bold ${providerStatus.isPasswordSet ? 'text-emerald-600' : 'text-slate-400'}`}>
                        {providerStatus.isPasswordSet ? 'Đã thiết lập' : 'Chưa thiết lập'}
                      </p>
                    </div>
                  </div>

                  {providerStatus.isPasswordSet ? (
                    <span className="px-3.5 py-2 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-bold self-start sm:self-auto">
                      Đã thiết lập
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setActiveTab('security')}
                      className="px-4 py-2.5 rounded-xl bg-teal-50 hover:bg-teal-100 text-[#007c76] border border-teal-200 text-xs font-bold transition-all cursor-pointer self-start sm:self-auto"
                    >
                      Thiết lập mật khẩu
                    </button>
                  )}
                </div>

                {/* Facebook */}
                <div className="bg-white p-4 rounded-2xl border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-[#1877F2] text-white flex items-center justify-center shrink-0">
                      <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24" aria-hidden="true">
                        <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-sm font-black text-slate-800">Facebook</p>
                      <p className={`text-xs font-bold ${providerStatus.isFacebookLinked ? 'text-emerald-600' : 'text-slate-400'}`}>
                        {providerStatus.isFacebookLinked ? 'Đã liên kết' : 'Chưa liên kết'}
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handleLinkFacebook}
                    disabled={isLinkingProvider !== null}
                    className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer disabled:opacity-60 self-start sm:self-auto ${
                      providerStatus.isFacebookLinked
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100'
                        : 'bg-[#1877F2] hover:bg-[#166FE5] text-white shadow-sm'
                    }`}
                  >
                    {isLinkingProvider === 'facebook' ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        <span>Đang liên kết...</span>
                      </>
                    ) : (
                      <span>{providerStatus.isFacebookLinked ? 'Đã liên kết Facebook' : 'Liên kết Facebook'}</span>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );

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
                  <span>{user.email || `Tài khoản Facebook (ID: ${user.uid.slice(0, 8)})`}</span>
                </p>
              </div>

              {/* Status & Stats Badges Strip */}
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 pt-1">
                <div className="px-3 py-1 bg-white/10 backdrop-blur-md rounded-xl text-[11px] font-bold text-teal-100 border border-white/10 flex items-center gap-1.5">
                  <BookOpen className="w-3.5 h-3.5 text-teal-300" />
                  <span>{userStatus.coursesCount} khóa học sở hữu</span>
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
            className={`flex-1 min-w-[140px] py-2.5 sm:py-3 px-3 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center justify-center gap-2 cursor-pointer ${
              activeTab === 'profile' ? 'bg-[#007c76] text-white shadow-md' : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <UserIcon className="w-4 h-4" />
            <span>Hồ sơ &amp; Liên kết</span>
          </button>

          <button 
            type="button"
            onClick={() => setActiveTab('security')}
            className={`flex-1 min-w-[140px] py-2.5 sm:py-3 px-3 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center justify-center gap-2 cursor-pointer ${
              activeTab === 'security' ? 'bg-[#007c76] text-white shadow-md' : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <KeyRound className="w-4 h-4" />
            <span>Bảo mật</span>
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

        {/* TAB 1: PROFILE EDIT & LINKED ACCOUNTS */}
        {activeTab === 'profile' && (
          <div className="bg-white p-6 sm:p-8 rounded-[32px] border border-slate-200 shadow-sm space-y-6">
            {renderLinkedMethodsSection()}

            <h2 className="text-lg sm:text-xl font-black text-slate-800 uppercase tracking-tight flex items-center gap-2 pt-2">
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
                  type="text"
                  disabled
                  value={email || `Tài khoản Facebook chưa cấp email (UID: ${user.uid})`}
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

        {/* TAB 3: SECURITY TAB */}
        {activeTab === 'security' && (
          <div className="bg-white p-6 sm:p-8 rounded-[32px] border border-slate-200 shadow-sm space-y-6">
            <h2 className="text-lg sm:text-xl font-black text-slate-800 uppercase tracking-tight flex items-center gap-2">
              <span className="w-1.5 h-5 bg-rose-500 rounded-full"></span>
              Cài Đặt Mật Khẩu &amp; Bảo Mật
            </h2>

            {renderLinkedMethodsSection()}

            <form onSubmit={handleUpdateSecurity} className="space-y-6">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Email tài khoản</label>
                <input
                  type="text"
                  disabled
                  value={email || `Tài khoản Facebook chưa cấp email (UID: ${user.uid})`}
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
                    Hành động này sẽ xóa vĩnh viễn tài khoản của bạn khỏi hệ thống. Vui lòng nhập <strong className="text-slate-900">{user.email || user.uid}</strong> để xác nhận.
                  </p>
                  <div className="flex flex-col sm:flex-row gap-2">
                    <input 
                      type="text" 
                      placeholder={user.email || user.uid}
                      value={deleteSelfEmail}
                      onChange={(e) => setDeleteSelfEmail(e.target.value)}
                      className="flex-1 px-3.5 py-2.5 bg-white border border-rose-300 rounded-xl text-xs font-bold text-slate-800"
                    />
                    <button 
                      type="button"
                      onClick={handleDeleteMyAccount}
                      disabled={deleteSelfEmail.trim().toLowerCase() !== (user.email || user.uid).toLowerCase() || isLoading}
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

      </div>
    </div>
  );
};

export default AccountSettings;
