
import React, { useState, useEffect } from 'react';
// Use standard named exports for useNavigate and useLocation from react-router-dom
import { useNavigate, useLocation } from "react-router-dom";
import { auth, storage, db } from '../firebase';
// Fix: Standardizing modular Firebase imports and resolving member export errors by consolidating them
import { 
  updateProfile, 
  updatePassword, 
  deleteUser,
  onAuthStateChanged,
  type User
} from 'firebase/auth';

import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { doc, setDoc, deleteDoc, collection, getDocs } from 'firebase/firestore'; 
import { useTheme } from '../contexts/ThemeContext';
import { useToast } from '../contexts/ToastContext';

const AccountSettings: React.FC<{ embed?: boolean }> = ({ embed = false }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { theme, toggleTheme } = useTheme();
  const toast = useToast();
  
  // Fix: User type is correctly resolved from consolidated named import
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Tab State
  const [activeTab, setActiveTab] = useState<'profile' | 'security' | 'appearance'>('profile');

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

  useEffect(() => {
    if (location.state && location.state.section === 'security') {
        setActiveTab('security');
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

  // Cleanup preview URL to prevent memory leaks
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

      // Validate file type
      if (!validTypes.includes(file.type)) {
        toast.error('Vui lòng chọn định dạng ảnh hợp lệ (JPG, PNG, GIF).');
        setMessage({ type: 'error', text: 'Vui lòng chọn định dạng ảnh hợp lệ (JPG, PNG, GIF).' });
        return;
      }

      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        toast.error('Kích thước ảnh quá lớn (Tối đa 5MB).');
        setMessage({ type: 'error', text: 'Kích thước ảnh quá lớn (Tối đa 5MB).' });
        return;
      }

      setImageFile(file);
      // Create local preview URL
      const objectUrl = URL.createObjectURL(file);
      setPreviewUrl(objectUrl);
      setMessage(null); // Clear previous errors
      toast.info('Đã tải ảnh đại diện lên bộ nhớ tạm. Hãy nhấn "Lưu thay đổi" để áp dụng.');
    }
  };

  // Hủy bỏ xem trước (Revert về ảnh cũ)
  const handleCancelPreview = () => {
      setImageFile(null);
      setPreviewUrl(null);
      setMessage(null);
      toast.info('Đã hủy ảnh đại diện mới.');
  };

  // Xóa ảnh đại diện (Set về rỗng)
  const handleDeleteAvatar = () => {
      if (window.confirm("Bạn có chắc chắn muốn xóa ảnh đại diện không?")) {
          setImageFile(null);
          setPreviewUrl(null);
          setPhotoURL(''); // Đánh dấu là đã xóa
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

      // 1. Upload Image if a new file exists
      if (imageFile) {
        try {
          // Create a unique reference: avatars/USER_ID/profile_pic_[timestamp]
          // Timestamp ensures caching is busted when a new image is uploaded
          const timestamp = Date.now();
          const fileRef = ref(storage, `avatars/${user.uid}/profile_${timestamp}`);
          
          // Upload
          const snapshot = await uploadBytes(fileRef, imageFile);
          
          // Get URL
          finalPhotoURL = await getDownloadURL(snapshot.ref);
        } catch (storageError: any) {
          console.error('Storage upload error:', storageError);
          throw new Error('Lỗi tải ảnh lên Storage (Vui lòng kiểm tra Storage Rules): ' + storageError.message);
        }
      }

      // 2. Update Firebase Auth Profile (Core Identity)
      await updateProfile(user, {
        displayName: displayName,
        photoURL: finalPhotoURL
      });

      // 3. ĐỒNG BỘ XUỐNG FIRESTORE (PERSISTENT DATABASE)
      if (user.email) {
          try {
              // CRITICAL FIX: Normalize email to lowercase
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

      // 4. Update Local State & UI immediately
      // Force reload user to ensure local token has new claims/data
      await user.reload(); 
      const updatedUser = auth.currentUser;
      if (updatedUser) {
          setUser(updatedUser);
          setPhotoURL(updatedUser.photoURL || '');
      } else {
          // Fallback if auth.currentUser is null for some reason
          setPhotoURL(finalPhotoURL);
      }

      setPreviewUrl(null); 
      setImageFile(null);  

      setMessage({ type: 'success', text: 'Lưu thay đổi thành công! Hồ sơ đã được cập nhật vĩnh viễn.' });
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
      // NOTE: Removed email update logic as requested. Email is now read-only.
      
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
        const requireLoginMsg = 'Để bảo mật, vui lòng Đăng xuất và Đăng nhập lại trước khi thực hiện thay đổi này.';
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

  // --- USER FUNCTION: DELETE OWN ACCOUNT ---
  const handleDeleteMyAccount = async () => {
    if (!user || !user.email) return;

    if (deleteSelfEmail.toLowerCase() !== user.email.toLowerCase()) {
        const notMatchMsg = 'Email xác nhận không khớp. Vui lòng nhập đúng email của bạn.';
        setMessage({ type: 'error', text: notMatchMsg });
        toast.error(notMatchMsg);
        return;
    }
    
    if (!window.confirm("CẢNH BÁO CUỐI CÙNG: Tài khoản của bạn sẽ bị xóa vĩnh viễn. Bạn chắc chắn chứ?")) return;

    setIsLoading(true);
    setMessage(null);

    try {
        const email = user.email.toLowerCase();
        
        // 1. Delete Firestore Data
        await deleteDoc(doc(db, "users", email));
        
        // 2. Delete Auth User
        await deleteUser(user);
        
        toast.success('Tài khoản của bạn đã được xóa vĩnh viễn khỏi hệ thống!');
        // 3. Redirect
        navigate('/');
    } catch (e: any) {
        console.error(e);
        if (e.code === 'auth/requires-recent-login') {
             const requireLoginMsg = 'Để bảo mật, vui lòng Đăng xuất và Đăng nhập lại để thực hiện hành động này.';
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

  const isAdmin = user.email === 'h1h4phong@gmail.com';

  return (
    <div className={embed ? "animate-fade-in" : "min-h-screen bg-background py-8 md:py-20 px-4 animate-fade-in transition-colors duration-300"}>
      <div className={embed ? "space-y-4 md:space-y-6" : "max-w-3xl mx-auto space-y-4 md:space-y-6"}>
        
        {/* Header */}
        {!embed && (
          <div className="flex items-center justify-between mb-2">
            <button 
              onClick={() => navigate('/account')}
              className="flex items-center text-text-muted hover:text-primary font-bold transition-colors text-sm md:text-base"
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" /></svg>
              QUAY LẠI TÀI KHOẢN
            </button>
          </div>
        )}

        {/* Tab Navigation */}
        <div className="bg-surface p-1.5 md:p-2 rounded-2xl shadow-sm border border-primary/10 flex space-x-2">
            <button 
                onClick={() => setActiveTab('profile')}
                className={`flex-1 py-2.5 md:py-3 rounded-xl text-xs md:text-sm font-black uppercase tracking-wider transition-all ${activeTab === 'profile' ? 'bg-primary text-primary-foreground shadow-md' : 'bg-transparent text-text-muted hover:bg-background'}`}
            >
                Hồ sơ
            </button>
            <button 
                onClick={() => setActiveTab('security')}
                className={`flex-1 py-2.5 md:py-3 rounded-xl text-xs md:text-sm font-black uppercase tracking-wider transition-all ${activeTab === 'security' ? 'bg-primary text-primary-foreground shadow-md' : 'bg-transparent text-text-muted hover:bg-background'}`}
            >
                Mật khẩu
            </button>
            <button 
                onClick={() => setActiveTab('appearance')}
                className={`flex-1 py-2.5 md:py-3 rounded-xl text-xs md:text-sm font-black uppercase tracking-wider transition-all ${activeTab === 'appearance' ? 'bg-primary text-primary-foreground shadow-md' : 'bg-transparent text-text-muted hover:bg-background'}`}
            >
                Giao diện
            </button>
        </div>

        {message && (
          <div className={`p-4 rounded-xl text-sm font-bold border flex items-start gap-2 ${message.type === 'success' ? 'bg-green-50 text-green-700 border-green-200' : 'bg-red-50 text-red-700 border-red-200'} animate-fade-in`}>
             {message.type === 'success' ? (
                <svg className="w-5 h-5 mt-0.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" /></svg>
             ) : (
                <svg className="w-5 h-5 mt-0.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
             )}
             <span>{message.text}</span>
          </div>
        )}

        <div className="bg-surface p-6 md:p-10 rounded-[24px] md:rounded-[32px] shadow-xl border border-primary/10 transition-colors duration-300">
          
          {/* CONTENT: PROFILE TAB */}
          {activeTab === 'profile' && (
            <div className="animate-fade-in">
                <h2 className="text-xl md:text-2xl font-black text-text mb-6 md:mb-8 uppercase tracking-wider border-l-4 border-primary pl-3 md:pl-4">Chỉnh sửa hồ sơ</h2>
                <form onSubmit={handleUpdateProfile} className="space-y-6 md:space-y-8">
                
                <div className="flex flex-col items-center mb-6 md:mb-8 p-6 bg-gray-50 rounded-3xl border border-dashed border-gray-200 relative">
                    <div className="relative">
                        {/* Ảnh hiển thị */}
                        <div className="w-32 h-32 md:w-36 md:h-36 rounded-full overflow-hidden border-4 border-white shadow-xl bg-white mb-4">
                            <img 
                                src={previewUrl || photoURL || "https://www.gravatar.com/avatar/00000000000000000000000000000000?d=mp&f=y"} 
                                alt="Avatar Preview" 
                                className="w-full h-full object-cover transition-all" 
                            />
                        </div>

                        {/* Nếu đang Preview ảnh mới: Hiển thị Badge "Mới" */}
                        {previewUrl && (
                             <span className="absolute top-0 right-0 bg-green-500 text-white text-[10px] font-bold px-2 py-1 rounded-full shadow-md animate-bounce">
                                 Mới
                             </span>
                        )}
                    </div>
                    
                    {/* CÁC NÚT ĐIỀU KHIỂN */}
                    <div className="flex items-center gap-3">
                         {/* Nút Upload (Label) */}
                         <div className="relative">
                             <input 
                                type="file" 
                                id="avatar-upload"
                                accept="image/png, image/jpeg, image/gif, image/webp"
                                onChange={handleFileChange}
                                className="hidden"
                            />
                            <label 
                                htmlFor="avatar-upload"
                                className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 text-text font-bold text-xs uppercase tracking-wide rounded-full cursor-pointer hover:bg-primary hover:text-white hover:border-primary transition-all shadow-sm"
                            >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                                Tải ảnh
                            </label>
                         </div>

                         {/* Nút Hủy (Chỉ hiện khi đang Preview) */}
                         {previewUrl && (
                             <button
                                type="button"
                                onClick={handleCancelPreview}
                                className="flex items-center gap-2 px-4 py-2 bg-gray-200 text-gray-600 font-bold text-xs uppercase tracking-wide rounded-full hover:bg-gray-300 transition-all shadow-sm"
                                title="Hủy bỏ ảnh vừa chọn"
                             >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                                Hủy
                             </button>
                         )}

                         {/* Nút Xóa (Chỉ hiện khi đã có ảnh gốc và không đang preview) */}
                         {!previewUrl && photoURL && (
                             <button
                                type="button"
                                onClick={handleDeleteAvatar}
                                className="flex items-center gap-2 px-4 py-2 bg-white border border-red-100 text-red-500 font-bold text-xs uppercase tracking-wide rounded-full hover:bg-red-50 hover:border-red-200 transition-all shadow-sm"
                                title="Gỡ ảnh đại diện"
                             >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                Xóa
                             </button>
                         )}
                    </div>
                    <p className="mt-3 text-[10px] text-text-muted font-medium">Hỗ trợ JPG, PNG (Tối đa 5MB)</p>
                </div>

                <div>
                    <label className="block text-[10px] md:text-xs font-black text-text-muted uppercase tracking-wider mb-2">Tên hiển thị</label>
                    <input
                    type="text"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    className="w-full p-3 md:p-4 bg-background border border-primary/20 rounded-xl font-bold text-text focus:outline-none focus:border-primary focus:bg-surface transition-all text-sm md:text-base placeholder-text-muted/50"
                    placeholder="Nhập tên hiển thị"
                    />
                </div>

                <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full bg-primary text-primary-foreground py-3 md:py-4 rounded-xl font-black uppercase tracking-widest text-xs md:text-sm hover:brightness-110 transition-all shadow-lg shadow-primary/20 flex items-center justify-center space-x-2"
                >
                    {isLoading && <svg className="animate-spin h-5 w-5 text-current" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>}
                    <span>{isLoading ? 'Đang lưu...' : 'Lưu thay đổi'}</span>
                </button>
                </form>
            </div>
          )}

          {/* CONTENT: SECURITY TAB */}
          {activeTab === 'security' && (
            <div className="animate-fade-in">
                <h2 className="text-xl md:text-2xl font-black text-text mb-6 md:mb-8 uppercase tracking-wider border-l-4 border-red-500 pl-3 md:pl-4">Cài đặt mật khẩu</h2>
                <form onSubmit={handleUpdateSecurity} className="space-y-6 md:space-y-8">
                
                <div>
                    <label className="block text-[10px] md:text-xs font-black text-text-muted uppercase tracking-wider mb-2">Email đăng nhập</label>
                    <input
                    type="email"
                    value={email}
                    disabled={true}
                    className="w-full p-3 md:p-4 bg-gray-100 border border-gray-200 rounded-xl font-bold text-gray-500 cursor-not-allowed focus:outline-none transition-all text-sm md:text-base opacity-70"
                    />
                </div>

                <div className="bg-yellow-500/10 p-4 md:p-6 rounded-2xl border border-yellow-500/20 space-y-4">
                    {/* Mật khẩu mới */}
                    <div>
                        <label className="block text-[10px] md:text-xs font-black text-text-muted uppercase tracking-wider mb-2">Mật khẩu mới</label>
                        <div className="relative">
                            <input
                                type={showPassword ? "text" : "password"}
                                value={newPassword}
                                onChange={(e) => setNewPassword(e.target.value)}
                                className="w-full p-3 md:p-4 pr-12 bg-surface border border-primary/20 rounded-xl font-bold text-text focus:outline-none focus:border-primary transition-all placeholder-text-muted/50 text-sm md:text-base"
                                placeholder="Nhập mật khẩu mới (ít nhất 6 ký tự)"
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute inset-y-0 right-0 pr-4 flex items-center text-text-muted hover:text-primary transition-colors focus:outline-none"
                            >
                                {showPassword ? (
                                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268-2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" /></svg>
                                ) : (
                                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268-2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                                )}
                            </button>
                        </div>
                    </div>

                    {/* Nhập lại mật khẩu */}
                    <div>
                        <label className="block text-[10px] md:text-xs font-black text-text-muted uppercase tracking-wider mb-2">Nhập lại mật khẩu mới</label>
                        <div className="relative">
                            <input
                                type={showConfirmPassword ? "text" : "password"}
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                className={`w-full p-3 md:p-4 pr-12 bg-surface border rounded-xl font-bold text-text focus:outline-none transition-all placeholder-text-muted/50 text-sm md:text-base ${newPassword && confirmPassword && newPassword !== confirmPassword ? 'border-red-500 focus:border-red-500' : 'border-primary/20 focus:border-primary'}`}
                                placeholder="Xác nhận mật khẩu mới"
                            />
                            <button
                                type="button"
                                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                className="absolute inset-y-0 right-0 pr-4 flex items-center text-text-muted hover:text-primary transition-colors focus:outline-none"
                            >
                                {showConfirmPassword ? (
                                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268-2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" /></svg>
                                ) : (
                                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268-2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                                )}
                            </button>
                        </div>
                         {newPassword && confirmPassword && newPassword !== confirmPassword && (
                            <p className="text-red-500 text-[10px] mt-1 font-bold">Mật khẩu nhập lại không khớp</p>
                         )}
                    </div>
                    
                    <p className="text-[10px] md:text-[11px] text-text-muted mt-3 font-medium flex items-center">
                        <svg className="w-4 h-4 mr-1 text-yellow-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                        Lưu ý: Nếu đổi mật khẩu, bạn có thể cần đăng nhập lại.
                    </p>
                </div>

                <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full bg-red-500 text-white py-3 md:py-4 rounded-xl font-black uppercase tracking-widest text-xs md:text-sm hover:bg-red-600 transition-all shadow-lg shadow-red-500/20 flex items-center justify-center space-x-2"
                >
                    {isLoading && <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>}
                    <span>{isLoading ? 'Đang xử lý...' : 'Cập nhật mật khẩu'}</span>
                </button>
                </form>

                {/* DANGER ZONE - XÓA TÀI KHOẢN */}
                <div className="mt-12 pt-8 border-t-2 border-dashed border-red-200">
                    <h3 className="text-xl font-black text-red-600 uppercase tracking-wide mb-4 flex items-center gap-2">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                        Vùng Nguy Hiểm
                    </h3>
                    
                    {!showDeleteZone ? (
                        <button 
                            onClick={() => setShowDeleteZone(true)}
                            className="text-red-500 font-bold hover:text-red-700 underline text-sm transition-colors"
                        >
                            Tôi muốn xóa tài khoản này
                        </button>
                    ) : (
                        <div className="bg-red-50 p-6 rounded-2xl border border-red-200 animate-in fade-in zoom-in-95">
                            <p className="text-sm font-bold text-red-800 mb-4">
                                Hành động này sẽ xóa vĩnh viễn tài khoản của bạn và không thể hoàn tác. 
                                Vui lòng nhập email <strong>{user.email}</strong> để xác nhận.
                            </p>
                            <div className="flex flex-col sm:flex-row gap-3">
                                <input 
                                    type="text" 
                                    placeholder={user.email || ''}
                                    value={deleteSelfEmail}
                                    onChange={(e) => setDeleteSelfEmail(e.target.value)}
                                    className="flex-1 p-3 border border-red-200 rounded-xl focus:outline-none focus:border-red-500 text-sm font-bold"
                                />
                                <button 
                                    onClick={handleDeleteMyAccount}
                                    disabled={deleteSelfEmail !== user.email || isLoading}
                                    className="bg-red-600 text-white px-6 py-3 rounded-xl font-black text-sm uppercase tracking-wider hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                                >
                                    {isLoading ? 'Đang xóa...' : 'Xóa vĩnh viễn'}
                                </button>
                                <button 
                                    onClick={() => setShowDeleteZone(false)}
                                    className="bg-white text-gray-600 border border-gray-200 px-6 py-3 rounded-xl font-bold text-sm hover:bg-gray-50 transition-all"
                                >
                                    Hủy
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
          )}

          {/* CONTENT: APPEARANCE TAB */}
          {activeTab === 'appearance' && (
            <div className="animate-fade-in">
              <h2 className="text-xl md:text-2xl font-black text-text mb-6 md:mb-8 uppercase tracking-wider border-l-4 border-primary pl-3 md:pl-4">Tùy chỉnh giao diện</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                 {/* Default Theme Card */}
                 <div 
                    onClick={() => theme !== 'default' && toggleTheme()}
                    className={`cursor-pointer group relative overflow-hidden rounded-2xl border-2 transition-all duration-300 ${theme === 'default' ? 'border-primary ring-2 ring-primary/20' : 'border-gray-200 hover:border-primary/50'}`}
                 >
                    <div className="p-6 bg-[#f8fafc] h-full flex flex-col items-center">
                       <div className="w-full aspect-video bg-white rounded-lg border border-gray-200 shadow-sm mb-4 p-3 flex flex-col gap-2">
                           <div className="w-1/3 h-2 bg-[#007c76] rounded-full"></div>
                           <div className="w-full h-1 bg-gray-100 rounded-full"></div>
                           <div className="w-2/3 h-1 bg-gray-100 rounded-full"></div>
                           <div className="mt-auto flex justify-end">
                               <div className="w-6 h-6 rounded-full bg-[#007c76]"></div>
                           </div>
                       </div>
                       <h3 className="text-[#374151] font-bold text-lg mb-1">Mặc định (Sáng)</h3>
                       <p className="text-gray-500 text-xs text-center">Nền trắng, chữ xanh FAST.</p>
                       
                       {theme === 'default' && (
                         <div className="absolute top-3 right-3 text-[#007c76]">
                           <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"/></svg>
                         </div>
                       )}
                    </div>
                 </div>

                 {/* Inverted Theme Card */}
                 <div 
                    onClick={() => theme !== 'inverted' && toggleTheme()}
                    className={`cursor-pointer group relative overflow-hidden rounded-2xl border-2 transition-all duration-300 ${theme === 'inverted' ? 'border-white ring-2 ring-white/30' : 'border-gray-200 hover:border-[#007c76]/50'}`}
                 >
                    <div className="p-6 bg-[#007c76] h-full flex flex-col items-center">
                       <div className="w-full aspect-video bg-[#00605b] rounded-lg border border-white/10 shadow-sm mb-4 p-3 flex flex-col gap-2">
                           <div className="w-1/3 h-2 bg-white rounded-full"></div>
                           <div className="w-full h-1 bg-white/20 rounded-full"></div>
                           <div className="w-2/3 h-1 bg-white/20 rounded-full"></div>
                           <div className="mt-auto flex justify-end">
                               <div className="w-6 h-6 rounded-full bg-white"></div>
                           </div>
                       </div>
                       <h3 className="text-white font-bold text-lg mb-1">FAST Signature</h3>
                       <p className="text-white/70 text-xs text-center">Nền xanh, chữ trắng chuyên nghiệp.</p>
                       
                       {theme === 'inverted' && (
                         <div className="absolute top-3 right-3 text-white">
                           <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"/></svg>
                         </div>
                       )}
                    </div>
                 </div>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
};

export default AccountSettings;
