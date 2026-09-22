import React, { useState, useEffect, useRef } from 'react';
import { collection, getDocs, doc, setDoc } from 'firebase/firestore';
import { db, auth } from '../firebase';
import { User as UserIcon, Shield, GraduationCap, Crown, Search, Mail, BookOpen, Clock, Activity, X, Save, Bell, CheckCheck, Check, Lock, Unlock, AlertTriangle, ShoppingBag, Eye, Calendar, KeyRound, ShieldAlert, RotateCw, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, MoveHorizontal, ArrowLeft, ArrowRight } from 'lucide-react';
import { useToast } from '../contexts/ToastContext';
import { ADMIN_EMAILS, TEACHER_EMAILS } from '../constants';
import { addApprovalNotification } from '../utils/courseNotificationService';
import { sendOtp, verifyOtp } from '../utils/otpService';

interface UserPurchasedCourse {
  courseId: string;
  courseTitle: string;
  purchasedAt?: string;
  price?: string;
  status?: string;
}

interface UserData {
  id: string; // The email
  email: string;
  displayName?: string;
  photoURL?: string;
  isAdmin?: boolean;
  isTeacher?: boolean;
  isVip?: boolean;
  isLocked?: boolean;
  lockedAt?: string;
  lockReason?: string;
  createdAt?: string;
  lastLoginAt?: string;
  purchasedCoursesCount: number;
  purchasedCourses?: UserPurchasedCourse[];
}

export const UserManagement: React.FC = () => {
  const [users, setUsers] = useState<UserData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedUser, setSelectedUser] = useState<UserData | null>(null);
  const [viewingUserCourses, setViewingUserCourses] = useState<UserData | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);
  const [editRoles, setEditRoles] = useState({ isAdmin: false, isTeacher: false, isVip: false });
  const [lockModalUser, setLockModalUser] = useState<UserData | null>(null);
  const [lockReasonInput, setLockReasonInput] = useState('');
  const [isLocking, setIsLocking] = useState(false);
  
  // OTP states for locking an account
  const [lockOtpSent, setLockOtpSent] = useState(false);
  const [lockOtpCode, setLockOtpCode] = useState('');
  const [lockOtpSending, setLockOtpSending] = useState(false);
  const [lockOtpError, setLockOtpError] = useState('');
  const [lockOtpNotice, setLockOtpNotice] = useState('');
  const [lockOtpCooldown, setLockOtpCooldown] = useState(0);
  const lockOtpInputRef = useRef<HTMLInputElement>(null);

  // Auto-focus lock OTP input when sent
  useEffect(() => {
    if (lockOtpSent && lockModalUser) {
      const timer = setTimeout(() => {
        lockOtpInputRef.current?.focus();
      }, 150);
      return () => clearTimeout(timer);
    }
  }, [lockOtpSent, lockModalUser]);

  // Pagination states (20 tài khoản mỗi trang)
  const PAGE_SIZE = 20;
  const [currentPage, setCurrentPage] = useState(1);

  // Custom mouse-drag horizontal scroll and smooth navigation
  const tableContainerRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const isMouseDownRef = useRef(false);
  const startXRef = useRef(0);
  const scrollLeftRef = useRef(0);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const { success, error } = useToast();

  const adminEmail = (
    auth.currentUser?.email ||
    (typeof localStorage !== 'undefined' ? localStorage.getItem('user_email') : '') ||
    'admin@fast.edu.vn'
  ).trim();

  const checkScroll = () => {
    if (tableContainerRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = tableContainerRef.current;
      setCanScrollLeft(scrollLeft > 10);
      setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 10);
    }
  };

  useEffect(() => {
    checkScroll();
    const handleResize = () => checkScroll();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [users, currentPage]);

  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if ((e.target as HTMLElement).closest('button, input, a, select, textarea')) return;
    if (!tableContainerRef.current) return;
    isMouseDownRef.current = true;
    startXRef.current = e.pageX - tableContainerRef.current.offsetLeft;
    scrollLeftRef.current = tableContainerRef.current.scrollLeft;
    setIsDragging(true);
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isMouseDownRef.current || !tableContainerRef.current) return;
    e.preventDefault();
    const x = e.pageX - tableContainerRef.current.offsetLeft;
    const walk = (x - startXRef.current) * 1.5;
    tableContainerRef.current.scrollLeft = scrollLeftRef.current - walk;
    checkScroll();
  };

  const handleMouseUpOrLeave = () => {
    isMouseDownRef.current = false;
    setIsDragging(false);
  };

  const handleSmoothScroll = (direction: 'left' | 'right') => {
    if (tableContainerRef.current) {
      const delta = direction === 'left' ? -350 : 350;
      tableContainerRef.current.scrollBy({ left: delta, behavior: 'smooth' });
      setTimeout(checkScroll, 350);
    }
  };

  // Reset page when search term changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  useEffect(() => {
    fetchUsers();
  }, []);

  // Cooldown timer for OTP resend
  useEffect(() => {
    let timer: any;
    if (lockOtpCooldown > 0) {
      timer = setTimeout(() => setLockOtpCooldown(c => c - 1), 1000);
    }
    return () => { if (timer) clearTimeout(timer); };
  }, [lockOtpCooldown]);

  // Reset OTP state when modal opens/closes
  useEffect(() => {
    if (lockModalUser) {
      setLockOtpSent(false);
      setLockOtpCode('');
      setLockOtpSending(false);
      setLockOtpError('');
      setLockOtpNotice('');
      setLockOtpCooldown(0);
      setLockReasonInput('');
    }
  }, [lockModalUser]);

  const handleSendLockOtp = async () => {
    setLockOtpSending(true);
    setLockOtpError('');
    setLockOtpNotice('');
    setLockOtpCode('');

    try {
      const result = await sendOtp({
        email: adminEmail,
        name: auth.currentUser?.displayName || 'Quản trị viên',
        flow: 'lock'
      });

      if (result.success) {
        setLockOtpSent(true);
        setLockOtpCooldown(30);
        setLockOtpNotice(result.message || `Mã OTP đã được gửi đến email ${adminEmail}. Vui lòng kiểm tra hộp thư (cả thư rác/Spam).`);
        if (result.fallback && result.otp) {
          setLockOtpCode(result.otp);
        }
      } else {
        setLockOtpError(result.error || "Không thể gửi mã OTP qua email lúc này. Vui lòng kiểm tra lại địa chỉ email.");
      }
    } catch (err: any) {
      console.error("Lock OTP send error:", err);
      setLockOtpError(err?.message || "Lỗi kết nối tới máy chủ gửi mã OTP. Vui lòng thử lại.");
    } finally {
      setLockOtpSending(false);
    }
  };

  const handleUpdateRoles = async () => {
    if (!selectedUser) return;
    setIsUpdating(true);
    try {
      const normalizedEmail = selectedUser.id.toLowerCase().trim();
      const userRef = doc(db, 'users', normalizedEmail);

      const updatedPayload = {
        email: normalizedEmail,
        displayName: selectedUser.displayName || 'Học viên',
        isAdmin: editRoles.isAdmin,
        isTeacher: editRoles.isTeacher,
        isVip: editRoles.isVip,
        rolePromotedByAdmin: true,
        status: 'approved',
        updatedAt: new Date().toISOString(),
      };

      // Use setDoc with merge so it creates document if it does not exist yet
      await setDoc(userRef, updatedPayload, { merge: true });
      
      // Update local storage cache for instant synchronization
      try {
        localStorage.setItem(`user_roles_${normalizedEmail}`, JSON.stringify({
          isAdmin: editRoles.isAdmin,
          isTeacher: editRoles.isTeacher,
          isVip: editRoles.isVip,
        }));
      } catch (e) {}

      // Dispatch event to sync components across the app
      window.dispatchEvent(new CustomEvent('user_roles_updated', {
        detail: {
          email: normalizedEmail,
          roles: editRoles
        }
      }));

      // Trigger bell notification for approval
      addApprovalNotification({
        userEmail: normalizedEmail,
        userName: selectedUser.displayName,
        roles: editRoles
      });

      // Save notification in user's notifications subcollection in Firestore
      try {
        const notifDocRef = doc(collection(db, 'users', normalizedEmail, 'notifications'));
        await setDoc(notifDocRef, {
          title: 'Phê duyệt phân quyền tài khoản',
          message: `Tài khoản của bạn đã được Admin phê duyệt vai trò: ${[
            editRoles.isAdmin ? 'Admin' : null,
            editRoles.isTeacher ? 'Giảng viên' : null,
            editRoles.isVip ? 'VIP' : null,
          ].filter(Boolean).join(', ') || 'Học viên'}`,
          type: 'approval',
          createdAt: new Date().toISOString(),
          isRead: false
        });
      } catch (notifErr) {
        console.warn('Could not persist user subcollection notification:', notifErr);
      }

      setUsers(users.map(u => 
        u.id.toLowerCase() === normalizedEmail 
          ? { ...u, isAdmin: editRoles.isAdmin, isTeacher: editRoles.isTeacher, isVip: editRoles.isVip } 
          : u
      ));
      
      const roleSummaryList: string[] = [];
      if (editRoles.isAdmin) roleSummaryList.push('Admin');
      if (editRoles.isTeacher) roleSummaryList.push('Giảng viên');
      if (editRoles.isVip) roleSummaryList.push('VIP');
      const roleSummaryText = roleSummaryList.length > 0 ? roleSummaryList.join(', ') : 'Học viên tiêu chuẩn';

      success(`Đã cập nhật & phê duyệt thành công cho tài khoản ${selectedUser.displayName ? `${selectedUser.displayName} (${normalizedEmail})` : normalizedEmail}: [${roleSummaryText}]`, 5000, 'Phê duyệt thành công');
      setSelectedUser(null);
    } catch (err) {
      console.error('Error updating user roles:', err);
      error('Không thể cập nhật quyền. Hãy chắc chắn bạn là Admin.', 5000, 'Lỗi');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleToggleLockUser = async (targetUser: UserData, shouldLock: boolean, reason?: string) => {
    if (shouldLock) {
      if (lockOtpCode.trim().length !== 6) {
        setLockOtpError('Vui lòng nhập đầy đủ mã OTP 6 số nhận từ email để xác nhận khóa tài khoản.');
        return;
      }

      setLockOtpError('');

      try {
        const verifyRes = await verifyOtp({
          email: adminEmail,
          otp: lockOtpCode.trim(),
          flow: 'lock'
        });

        if (!verifyRes.success) {
          setLockOtpError(verifyRes.error || 'Mã OTP không chính xác hoặc đã hết hạn. Vui lòng kiểm tra lại email.');
          return;
        }
      } catch (err: any) {
        console.error("OTP verify check error:", err);
        setLockOtpError(err?.message || 'Không thể xác minh OTP. Vui lòng thử lại.');
        return;
      }
    }

    setIsLocking(true);
    try {
      const normalizedEmail = targetUser.id.toLowerCase().trim();
      const userRef = doc(db, 'users', normalizedEmail);

      const updateData: Record<string, any> = {
        isLocked: shouldLock,
        updatedAt: new Date().toISOString()
      };

      if (shouldLock) {
        updateData.lockedAt = new Date().toISOString();
        updateData.lockReason = reason || 'Vi phạm điều khoản hoặc chính sách hệ thống.';
      } else {
        updateData.lockedAt = null;
        updateData.lockReason = null;
      }

      await setDoc(userRef, updateData, { merge: true });

      // Update local storage cache
      try {
        localStorage.setItem(`user_locked_${normalizedEmail}`, JSON.stringify({
          isLocked: shouldLock,
          lockedAt: updateData.lockedAt,
          lockReason: updateData.lockReason
        }));
      } catch (e) {}

      // Dispatch custom event
      window.dispatchEvent(new CustomEvent('user_lock_status_changed', {
        detail: {
          email: normalizedEmail,
          isLocked: shouldLock,
          reason: updateData.lockReason
        }
      }));

      // Update in component state
      setUsers(prev => prev.map(u => {
        if (u.id.toLowerCase() === normalizedEmail) {
          return {
            ...u,
            isLocked: shouldLock,
            lockedAt: updateData.lockedAt,
            lockReason: updateData.lockReason
          };
        }
        return u;
      }));

      if (shouldLock) {
        success(`Đã xác thực OTP và khóa tài khoản ${normalizedEmail} thành công.`, 5000, 'Khóa tài khoản');
      } else {
        success(`Đã mở khóa tài khoản ${normalizedEmail} thành công. Học viên có thể tiếp tục đăng nhập.`, 5000, 'Mở khóa thành công');
      }

      setLockModalUser(null);
      setLockReasonInput('');
      setLockOtpCode('');
      setLockOtpSent(false);
    } catch (err) {
      console.error('Lỗi khóa/mở khóa tài khoản:', err);
      error('Không thể cập nhật trạng thái khóa tài khoản. Vui lòng kiểm tra quyền Admin.', 5000, 'Lỗi');
    } finally {
      setIsLocking(false);
    }
  };

  const fetchUsers = async (forceRefresh = false) => {
    // 1. Instant cache load on initial mount to eliminate loading wait time
    if (!forceRefresh && users.length === 0) {
      try {
        const cached = sessionStorage.getItem('cached_admin_users');
        if (cached) {
          const parsed = JSON.parse(cached);
          if (Array.isArray(parsed) && parsed.length > 0) {
            setUsers(parsed);
            setIsLoading(false);
          }
        }
      } catch (e) {}
    }

    if (users.length === 0 || forceRefresh) {
      setIsLoading(true);
    }

    try {
      const usersRef = collection(db, 'users');
      const snapshot = await getDocs(usersRef);

      // Fast parallel fetch for purchased courses instead of sequential blocking loop
      const userData: UserData[] = await Promise.all(
        snapshot.docs.map(async (docSnap) => {
          const data = docSnap.data();
          const normalizedEmail = docSnap.id.toLowerCase().trim();
          const isHardcodedAdmin = ADMIN_EMAILS.some(e => e.toLowerCase() === normalizedEmail);
          const isHardcodedTeacher = TEACHER_EMAILS.some(e => e.toLowerCase() === normalizedEmail);

          // Fetch purchased courses in parallel
          const purchasedCoursesList: UserPurchasedCourse[] = [];
          try {
            const purchasedRef = collection(db, 'users', docSnap.id, 'purchased_courses');
            const purchasedSnap = await getDocs(purchasedRef);
            purchasedSnap.forEach(pDoc => {
              const pData = pDoc.data();
              purchasedCoursesList.push({
                courseId: pData.courseId || pDoc.id,
                courseTitle: pData.courseTitle || pData.title || pDoc.id,
                purchasedAt: pData.purchasedAt || pData.createdAt,
                price: pData.price || 'Đã kích hoạt',
                status: pData.status || 'active'
              });
            });
            purchasedCoursesList.sort((a, b) => {
              const timeA = a.purchasedAt ? new Date(a.purchasedAt).getTime() : 0;
              const timeB = b.purchasedAt ? new Date(b.purchasedAt).getTime() : 0;
              return timeB - timeA;
            });
          } catch (e) {
            // ignore
          }

          return {
            id: normalizedEmail,
            email: data.email || normalizedEmail,
            displayName: data.displayName || 'Học viên',
            photoURL: data.photoURL,
            isAdmin: data.isAdmin === true || isHardcodedAdmin,
            isTeacher: data.isTeacher === true || isHardcodedTeacher || data.isAdmin === true || isHardcodedAdmin,
            isVip: data.isVip || false,
            isLocked: data.isLocked === true,
            lockedAt: data.lockedAt,
            lockReason: data.lockReason,
            createdAt: data.createdAt,
            lastLoginAt: data.lastLoginAt,
            purchasedCoursesCount: purchasedCoursesList.length,
            purchasedCourses: purchasedCoursesList
          };
        })
      );

      setUsers(userData);
      try {
        sessionStorage.setItem('cached_admin_users', JSON.stringify(userData));
      } catch (e) {}

      if (forceRefresh) {
        success('Đã tải lại danh sách tài khoản thành công!');
      }
    } catch (error) {
      console.error('Error fetching users:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const filteredUsers = users.filter(user => 
    user.email.toLowerCase().includes(searchTerm.toLowerCase()) || 
    (user.displayName && user.displayName.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  // Pagination calculation (20 accounts per page)
  const totalPages = Math.max(1, Math.ceil(filteredUsers.length / PAGE_SIZE));
  const safePage = Math.min(Math.max(1, currentPage), totalPages);
  const displayedUsers = filteredUsers.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-gray-900 tracking-tight">Quản lý & Phê duyệt Tài khoản</h2>
          <p className="text-sm font-semibold text-gray-500 mt-1">
            Tổng cộng: {users.length} tài khoản. Khóa tài khoản, xem giờ mua khóa học chính xác và phê duyệt phân quyền.
          </p>
        </div>
        
        <div className="flex items-center gap-2.5 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-80">
            <Search className="w-5 h-5 absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Tìm theo email, tên..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-11 pr-4 py-2.5 sm:py-3 bg-white border border-gray-200 rounded-2xl text-sm font-bold text-gray-700 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#007c76]/20 focus:border-[#007c76] transition-all shadow-sm"
            />
          </div>

          {/* Nút tải lại mỗi trang tài khoản */}
          <button
            onClick={() => fetchUsers(true)}
            disabled={isLoading}
            title="Tải lại danh sách tài khoản ngay lập tức"
            className="px-4 py-2.5 sm:py-3 bg-white hover:bg-teal-50/60 border border-gray-200 hover:border-[#007c76] text-gray-700 hover:text-[#007c76] rounded-2xl text-xs font-black uppercase tracking-wider flex items-center gap-2 transition-all shadow-sm cursor-pointer disabled:opacity-50 shrink-0"
          >
            <RotateCw className={`w-4 h-4 ${isLoading ? 'animate-spin text-[#007c76]' : ''}`} />
            <span className="hidden sm:inline">Tải lại</span>
          </button>
        </div>
      </div>

      {/* Horizontal Scroll Bar Navigation & Mouse-Drag Tip on Desktop */}
      <div className="flex items-center justify-between text-xs text-gray-500 px-1">
        <div className="flex items-center gap-2 font-medium">
          <MoveHorizontal className="w-4 h-4 text-[#007c76]" />
          <span>Kéo chuột sang ngang hoặc dùng nút cuộn để xem đầy đủ thông tin</span>
        </div>
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => handleSmoothScroll('left')}
            disabled={!canScrollLeft}
            title="Cuộn sang trái"
            className="p-1.5 rounded-lg border border-gray-200 bg-white hover:bg-teal-50 text-gray-600 hover:text-[#007c76] disabled:opacity-30 disabled:cursor-not-allowed transition-all cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => handleSmoothScroll('right')}
            disabled={!canScrollRight}
            title="Cuộn sang phải"
            className="p-1.5 rounded-lg border border-gray-200 bg-white hover:bg-teal-50 text-gray-600 hover:text-[#007c76] disabled:opacity-30 disabled:cursor-not-allowed transition-all cursor-pointer"
          >
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {isLoading && users.length === 0 ? (
        <div className="py-16 flex flex-col items-center justify-center gap-4 bg-white rounded-3xl border border-gray-100">
          <div className="w-10 h-10 border-4 border-[#007c76] border-t-transparent rounded-full animate-spin"></div>
          <p className="text-gray-400 text-xs font-bold uppercase tracking-wider animate-pulse">Đang tải danh sách tài khoản...</p>
        </div>
      ) : (
        <div
          ref={tableContainerRef}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUpOrLeave}
          onMouseLeave={handleMouseUpOrLeave}
          onScroll={checkScroll}
          className={`overflow-x-auto rounded-[24px] border border-gray-100 bg-white shadow-sm custom-scrollbar pb-1 select-none transition-colors ${
            isDragging ? 'cursor-grabbing select-none' : 'cursor-grab'
          }`}
        >
          <table className="w-full text-left border-collapse min-w-[1050px] whitespace-nowrap">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100 text-gray-500 text-[10px] sm:text-xs font-bold uppercase tracking-widest whitespace-nowrap">
                <th className="py-4 px-6 whitespace-nowrap">Tài khoản</th>
                <th className="py-4 px-6 whitespace-nowrap">Trạng thái</th>
                <th className="py-4 px-6 whitespace-nowrap">Vai trò</th>
                <th className="py-4 px-6 text-center whitespace-nowrap">Khóa học</th>
                <th className="py-4 px-6 whitespace-nowrap">Thời gian mua gần nhất</th>
                <th className="py-4 px-6 text-right whitespace-nowrap">Hành động</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {displayedUsers.length > 0 ? displayedUsers.map((user) => {
                const latestPurchase = user.purchasedCourses && user.purchasedCourses[0];
                return (
                  <tr
                    key={user.id}
                    className={`transition-all duration-150 text-xs sm:text-sm text-gray-700 group whitespace-nowrap cursor-pointer hover:bg-teal-50/20 hover:outline hover:outline-2 hover:outline-[#007c76] hover:outline-offset-[-2px] hover:shadow-xs ${
                      user.isLocked ? 'bg-red-50/30' : ''
                    }`}
                  >
                    <td className="py-4 px-6 whitespace-nowrap">
                      <div className="flex items-center gap-3 whitespace-nowrap">
                        <div className={`w-10 h-10 rounded-full border-2 shadow-sm overflow-hidden flex items-center justify-center shrink-0 ${user.isLocked ? 'border-red-300 bg-red-50' : 'border-white bg-gray-100'}`}>
                          {user.photoURL ? (
                            <img src={user.photoURL} alt={user.email} className="w-full h-full object-cover" />
                          ) : (
                            <UserIcon className={`w-5 h-5 ${user.isLocked ? 'text-red-400' : 'text-gray-400'}`} />
                          )}
                        </div>
                        <div className="whitespace-nowrap">
                          <div className="flex items-center gap-2 whitespace-nowrap">
                            <span className="font-extrabold text-gray-900 group-hover:text-[#007c76] transition-colors whitespace-nowrap">{user.displayName || user.email.split('@')[0]}</span>
                            {user.isLocked && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-red-100 text-red-700 text-[10px] font-black uppercase whitespace-nowrap">
                                <Lock className="w-2.5 h-2.5" /> Đã khóa
                              </span>
                            )}
                          </div>
                          <div className="font-semibold text-gray-400 text-xs mt-0.5 flex items-center gap-1 whitespace-nowrap">
                            <Mail className="w-3 h-3 shrink-0" />
                            {user.email}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-6 whitespace-nowrap">
                      {user.isLocked ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-red-50 border border-red-200 text-red-700 text-[10px] font-black uppercase tracking-wider whitespace-nowrap" title={user.lockReason || 'Tài khoản bị khóa'}>
                          <Lock className="w-3 h-3" /> Bị khóa
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-700 text-[10px] font-black uppercase tracking-wider whitespace-nowrap">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span> Hoạt động
                        </span>
                      )}
                    </td>
                    <td className="py-4 px-6 whitespace-nowrap">
                      <div className="flex items-center gap-1.5 whitespace-nowrap">
                        {user.isAdmin && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-indigo-50 border border-indigo-100 text-indigo-700 text-[10px] font-black uppercase tracking-wider whitespace-nowrap">
                            <Shield className="w-3 h-3" /> Admin
                          </span>
                        )}
                        {user.isTeacher && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-teal-50 border border-teal-100 text-teal-700 text-[10px] font-black uppercase tracking-wider whitespace-nowrap">
                            <GraduationCap className="w-3 h-3" /> Giảng viên
                          </span>
                        )}
                        {user.isVip && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-50 border border-amber-100 text-amber-600 text-[10px] font-black uppercase tracking-wider shadow-sm shadow-amber-500/10 whitespace-nowrap">
                            <Crown className="w-3 h-3" /> VIP
                          </span>
                        )}
                        {!user.isAdmin && !user.isTeacher && !user.isVip && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-gray-100 text-gray-500 text-[10px] font-black uppercase tracking-wider whitespace-nowrap">
                            Học viên
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-4 px-6 text-center whitespace-nowrap">
                      <button
                        onClick={() => setViewingUserCourses(user)}
                        title="Xem chi tiết thời gian mua khóa học của học viên này"
                        className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 hover:bg-blue-100 border border-blue-200 text-blue-700 font-black text-xs cursor-pointer transition-all whitespace-nowrap"
                      >
                        <BookOpen className="w-3.5 h-3.5" />
                        <span>{user.purchasedCoursesCount}</span>
                        <Eye className="w-3 h-3 ml-0.5 text-blue-500" />
                      </button>
                    </td>
                    <td className="py-4 px-6 font-semibold text-gray-600 whitespace-nowrap">
                      {latestPurchase && latestPurchase.purchasedAt ? (
                        <div className="flex items-center gap-2 whitespace-nowrap">
                          <span className="font-extrabold text-gray-800 text-xs flex items-center gap-1 whitespace-nowrap">
                            <Clock className="w-3.5 h-3.5 text-[#007c76] shrink-0" />
                            {new Date(latestPurchase.purchasedAt).toLocaleTimeString('vi-VN', {
                              hour: '2-digit',
                              minute: '2-digit',
                              second: '2-digit'
                            })}
                          </span>
                          <span className="text-[11px] text-gray-400 whitespace-nowrap">
                            {new Date(latestPurchase.purchasedAt).toLocaleDateString('vi-VN', {
                              day: '2-digit',
                              month: '2-digit',
                              year: 'numeric'
                            })}
                          </span>
                        </div>
                      ) : (
                        <span className="text-gray-400 text-xs italic whitespace-nowrap">Chưa mua</span>
                      )}
                    </td>
                    <td className="py-4 px-6 text-right whitespace-nowrap">
                      <div className="inline-flex items-center gap-2 justify-end whitespace-nowrap">
                        {/* Lock / Unlock button */}
                        {user.isLocked ? (
                          <button
                            onClick={() => handleToggleLockUser(user, false)}
                            disabled={isLocking}
                            className="inline-flex items-center gap-1 px-3 py-2 bg-emerald-50 hover:bg-emerald-600 text-emerald-700 hover:text-white border border-emerald-200 hover:border-emerald-600 rounded-xl text-[11px] font-black uppercase tracking-wider transition-all cursor-pointer shadow-xs whitespace-nowrap"
                            title="Mở khóa tài khoản này"
                          >
                            <Unlock className="w-3.5 h-3.5" />
                            Mở khóa
                          </button>
                        ) : (
                          <button
                            onClick={() => {
                              setLockModalUser(user);
                              setLockReasonInput('');
                            }}
                            className="inline-flex items-center gap-1 px-3 py-2 bg-rose-50 hover:bg-rose-600 text-rose-700 hover:text-white border border-rose-200 hover:border-rose-600 rounded-xl text-[11px] font-black uppercase tracking-wider transition-all cursor-pointer shadow-xs whitespace-nowrap"
                            title="Khóa tài khoản này"
                          >
                            <Lock className="w-3.5 h-3.5" />
                            Khóa tài khoản
                          </button>
                        )}

                        <button 
                          onClick={() => {
                            setSelectedUser(user);
                            setEditRoles({
                              isAdmin: user.isAdmin || false,
                              isTeacher: user.isTeacher || false,
                              isVip: user.isVip || false
                            });
                          }}
                          className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-[#007c76]/5 hover:bg-[#007c76] text-[#007c76] hover:text-white border border-[#007c76]/20 hover:border-[#007c76] rounded-xl text-[11px] font-black uppercase tracking-wider transition-all cursor-pointer shadow-xs whitespace-nowrap"
                        >
                          <Shield className="w-3.5 h-3.5" />
                          Phân quyền
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              }) : (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-gray-400 font-bold text-sm">
                    Không tìm thấy tài khoản nào khớp với tìm kiếm.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* --- PHÂN TRANG (20 TÀI KHOẢN MỖI TRANG) --- */}
      {filteredUsers.length > 0 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 px-6 py-4 bg-white border border-gray-100 rounded-2xl shadow-xs">
          <div className="text-xs font-semibold text-gray-500">
            Hiển thị <span className="font-extrabold text-gray-900">{(safePage - 1) * PAGE_SIZE + 1} - {Math.min(safePage * PAGE_SIZE, filteredUsers.length)}</span> trong tổng số <span className="font-extrabold text-[#007c76]">{filteredUsers.length}</span> tài khoản
            <span className="ml-2 text-gray-400">(Trang {safePage} / {totalPages})</span>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setCurrentPage(1)}
              disabled={safePage === 1}
              title="Trang đầu"
              className="w-8 h-8 rounded-xl flex items-center justify-center border border-gray-200 bg-white hover:bg-teal-50 text-gray-600 hover:text-[#007c76] disabled:opacity-30 disabled:cursor-not-allowed transition-all cursor-pointer"
            >
              <ChevronsLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              disabled={safePage === 1}
              title="Trang trước"
              className="w-8 h-8 rounded-xl flex items-center justify-center border border-gray-200 bg-white hover:bg-teal-50 text-gray-600 hover:text-[#007c76] disabled:opacity-30 disabled:cursor-not-allowed transition-all cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            {/* Page Number Buttons */}
            {Array.from({ length: totalPages }, (_, i) => i + 1)
              .filter(p => p === 1 || p === totalPages || Math.abs(p - safePage) <= 1)
              .map((pageNum, idx, arr) => {
                const prev = arr[idx - 1];
                const isEllipsis = prev && pageNum - prev > 1;
                return (
                  <React.Fragment key={pageNum}>
                    {isEllipsis && <span className="px-1 text-gray-400 text-xs font-bold">...</span>}
                    <button
                      onClick={() => setCurrentPage(pageNum)}
                      className={`w-8 h-8 rounded-xl font-black text-xs transition-all cursor-pointer ${
                        safePage === pageNum
                          ? 'bg-[#007c76] text-white shadow-md shadow-[#007c76]/20'
                          : 'border border-gray-200 bg-white hover:bg-teal-50 text-gray-700 hover:text-[#007c76]'
                      }`}
                    >
                      {pageNum}
                    </button>
                  </React.Fragment>
                );
              })}

            <button
              onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
              disabled={safePage === totalPages}
              title="Trang sau"
              className="w-8 h-8 rounded-xl flex items-center justify-center border border-gray-200 bg-white hover:bg-teal-50 text-gray-600 hover:text-[#007c76] disabled:opacity-30 disabled:cursor-not-allowed transition-all cursor-pointer"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
            <button
              onClick={() => setCurrentPage(totalPages)}
              disabled={safePage === totalPages}
              title="Trang cuối"
              className="w-8 h-8 rounded-xl flex items-center justify-center border border-gray-200 bg-white hover:bg-teal-50 text-gray-600 hover:text-[#007c76] disabled:opacity-30 disabled:cursor-not-allowed transition-all cursor-pointer"
            >
              <ChevronsRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* --- MODAL: XEM CHI TIẾT THỜI GIAN MUA KHÓA HỌC (MẤY GIỜ) --- */}
      {viewingUserCourses && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-2xl w-full shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col max-h-[85vh]">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gradient-to-r from-gray-50 to-white">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-teal-50 text-[#007c76] flex items-center justify-center font-bold">
                  <ShoppingBag className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-gray-900 tracking-tight">Chi tiết mua khóa học & Giờ mua</h3>
                  <p className="text-xs font-semibold text-gray-500">Tài khoản: {viewingUserCourses.displayName} ({viewingUserCourses.email})</p>
                </div>
              </div>
              <button 
                onClick={() => setViewingUserCourses(null)}
                className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 text-gray-500 hover:bg-gray-200 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto flex-1 space-y-4">
              {viewingUserCourses.purchasedCourses && viewingUserCourses.purchasedCourses.length > 0 ? (
                <div className="space-y-3">
                  {viewingUserCourses.purchasedCourses.map((c, idx) => {
                    const pDate = c.purchasedAt ? new Date(c.purchasedAt) : null;
                    return (
                      <div key={c.courseId || idx} className="p-4 rounded-2xl border border-gray-100 bg-gray-50/50 hover:bg-white hover:border-[#007c76]/30 hover:shadow-md transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="space-y-1">
                          <div className="font-black text-gray-900 text-sm flex items-center gap-2">
                            <BookOpen className="w-4 h-4 text-[#007c76]" />
                            {c.courseTitle}
                          </div>
                          <div className="text-xs text-gray-400 font-medium">Mã ID: {c.courseId} • Giá: <span className="text-[#007c76] font-bold">{c.price}</span></div>
                        </div>

                        <div className="flex flex-col sm:items-end bg-white sm:bg-transparent p-2.5 sm:p-0 rounded-xl border sm:border-0 border-gray-100">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 flex items-center gap-1">
                            <Clock className="w-3 h-3 text-[#007c76]" /> Thời điểm thanh toán
                          </span>
                          {pDate ? (
                            <>
                              <span className="text-sm font-black text-[#007c76]">
                                {pDate.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                              </span>
                              <span className="text-xs font-bold text-gray-600">
                                {pDate.toLocaleDateString('vi-VN', { weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric' })}
                              </span>
                            </>
                          ) : (
                            <span className="text-xs text-gray-400 italic">Không có mốc thời gian</span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="py-12 text-center text-gray-400">
                  <BookOpen className="w-12 h-12 mx-auto text-gray-300 mb-2" />
                  <p className="font-bold text-sm">Học viên này chưa mua khóa học nào.</p>
                </div>
              )}
            </div>

            <div className="p-4 bg-gray-50 border-t border-gray-100 flex justify-between items-center text-xs text-gray-500 font-semibold">
              <span>Tổng số khóa học đã mở: <strong className="text-gray-900">{viewingUserCourses.purchasedCoursesCount}</strong></span>
              <button 
                onClick={() => setViewingUserCourses(null)}
                className="px-5 py-2 rounded-xl bg-gray-200 hover:bg-gray-300 text-gray-700 font-bold uppercase text-xs transition-colors"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- MODAL: XÁC NHẬN KHÓA TÀI KHOẢN --- */}
      {lockModalUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-md w-full shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-rose-50/50">
              <div className="flex items-center gap-2 text-rose-700">
                <AlertTriangle className="w-5 h-5" />
                <h3 className="text-lg font-black tracking-tight">Khóa tài khoản học viên</h3>
              </div>
              <button 
                onClick={() => setLockModalUser(null)}
                className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 text-gray-500 hover:bg-gray-200 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-2xl">
                <p className="text-xs font-medium text-amber-900 leading-relaxed">
                  Bạn đang yêu cầu khóa tài khoản của học viên <strong className="text-gray-900 font-bold">{lockModalUser.displayName || 'Học viên'}</strong> ({lockModalUser.email}).
                  Khi bị khóa, học viên sẽ không thể đăng nhập hoặc xem bài học.
                </p>
              </div>

              <div>
                <label className="block text-xs font-black text-gray-700 uppercase tracking-wider mb-2">Lý do khóa tài khoản (Tùy chọn)</label>
                <textarea
                  value={lockReasonInput}
                  onChange={(e) => setLockReasonInput(e.target.value)}
                  placeholder="Ví dụ: Vi phạm quy định học tập, tài khoản có hành vi bất thường..."
                  rows={2}
                  className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl text-xs font-medium text-gray-800 placeholder-gray-400 focus:outline-none focus:border-rose-500 focus:bg-white transition-all"
                />
              </div>

              {/* OTP Security Section */}
              <div className="p-4 bg-slate-50 border-2 border-slate-200 rounded-2xl space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <KeyRound className="w-4 h-4 text-[#007c76]" />
                    <span className="text-xs font-black text-gray-800 uppercase tracking-wide">
                      Mã OTP xác thực bảo mật
                    </span>
                  </div>
                  <span className="text-[10px] font-extrabold px-2 py-0.5 bg-rose-100 text-rose-700 rounded-md">
                    Bắt buộc
                  </span>
                </div>

                <p className="text-[11px] text-gray-500 leading-relaxed">
                  Mã OTP xác thực sẽ được gửi đến email quản trị: <strong className="text-gray-800">{adminEmail}</strong>
                </p>

                {lockOtpError && (
                  <div className="p-2.5 bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold rounded-xl text-center">
                    {lockOtpError}
                  </div>
                )}

                {lockOtpNotice && (
                  <div className="p-2.5 bg-teal-50 border border-teal-200 text-[#007c76] text-xs font-bold rounded-xl text-center">
                    {lockOtpNotice}
                  </div>
                )}

                {!lockOtpSent ? (
                  <button
                    type="button"
                    onClick={handleSendLockOtp}
                    disabled={lockOtpSending}
                    className="w-full py-2.5 px-4 bg-[#007c76] hover:bg-[#00605b] text-white text-xs font-black uppercase tracking-wider rounded-xl transition-all flex items-center justify-center gap-2 shadow-xs cursor-pointer disabled:opacity-50"
                  >
                    {lockOtpSending ? (
                      <>
                        <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        <span>Đang gửi mã OTP...</span>
                      </>
                    ) : (
                      <>
                        <Mail className="w-3.5 h-3.5" />
                        <span>Nhận mã OTP qua Email</span>
                      </>
                    )}
                  </button>
                ) : (
                  <div className="space-y-2 pt-1">
                    <div className="relative">
                      <input
                        ref={lockOtpInputRef}
                        type="text"
                        maxLength={6}
                        value={lockOtpCode}
                        onChange={(e) => {
                          setLockOtpCode(e.target.value.replace(/\D/g, ''));
                          setLockOtpError('');
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && lockOtpCode.trim().length === 6 && !isLocking && lockModalUser) {
                            e.preventDefault();
                            handleToggleLockUser(lockModalUser, true, lockReasonInput);
                          }
                        }}
                        placeholder="000000"
                        className="w-full text-center text-2xl font-black tracking-[0.4em] py-2.5 bg-white border-2 border-slate-300 rounded-xl focus:border-rose-500 focus:outline-none font-mono"
                      />
                    </div>
                    <div className="flex items-center justify-between px-1">
                      <button
                        type="button"
                        onClick={handleSendLockOtp}
                        disabled={lockOtpSending || lockOtpCooldown > 0}
                        className="text-[11px] font-bold text-[#007c76] hover:underline disabled:opacity-50 cursor-pointer"
                      >
                        {lockOtpCooldown > 0 ? `Gửi lại mã (${lockOtpCooldown}s)` : 'Gửi lại mã OTP'}
                      </button>
                      <span className="text-[11px] text-gray-400 font-medium">Nhập đủ 6 số</span>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="p-5 bg-gray-50 border-t border-gray-100 flex justify-end gap-3">
              <button 
                onClick={() => setLockModalUser(null)}
                className="px-5 py-2.5 rounded-xl text-xs font-black text-gray-600 hover:bg-gray-200 transition-colors cursor-pointer uppercase tracking-wider"
              >
                Hủy
              </button>
              <button 
                onClick={() => handleToggleLockUser(lockModalUser, true, lockReasonInput)}
                disabled={isLocking || lockOtpCode.trim().length !== 6}
                className="px-6 py-2.5 rounded-xl text-xs font-black text-white bg-rose-600 hover:bg-rose-700 transition-colors cursor-pointer uppercase tracking-wider flex items-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed shadow-md shadow-rose-900/10"
              >
                {isLocking ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    Đang xác thực & khóa...
                  </>
                ) : (
                  <>
                    <Lock className="w-4 h-4" />
                    Xác nhận khóa tài khoản
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- MODAL: PHÂN QUYỀN TÀI KHOẢN --- */}
      {selectedUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-md w-full shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center">
              <div className="flex items-center gap-2">
                <Shield className="w-5 h-5 text-[#007c76]" />
                <h3 className="text-lg font-black text-gray-900 tracking-tight">Phê duyệt & Phân quyền tài khoản</h3>
              </div>
              <button 
                onClick={() => setSelectedUser(null)}
                className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 text-gray-500 hover:bg-gray-200 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            
            <div className="p-6 space-y-5">
              <div className="flex items-center gap-4 p-4 rounded-2xl bg-gray-50 border border-gray-100">
                <div className="w-12 h-12 rounded-full bg-white shadow-sm overflow-hidden flex items-center justify-center shrink-0">
                  {selectedUser.photoURL ? (
                    <img src={selectedUser.photoURL} alt={selectedUser.email} className="w-full h-full object-cover" />
                  ) : (
                    <UserIcon className="w-6 h-6 text-gray-400" />
                  )}
                </div>
                <div>
                  <div className="font-extrabold text-gray-900">{selectedUser.displayName}</div>
                  <div className="font-semibold text-gray-500 text-xs mt-0.5">{selectedUser.email}</div>
                </div>
              </div>

              {/* Approval notice */}
              <div className="p-3.5 bg-teal-50/80 border border-teal-100 rounded-2xl flex items-start gap-2.5 text-xs text-teal-900">
                <Bell className="w-4 h-4 text-[#007c76] shrink-0 mt-0.5" />
                <p className="leading-relaxed">
                  Khi xác nhận phê duyệt, thay đổi vai trò sẽ có hiệu lực ngay lập tức và hệ thống tự động kích hoạt thông báo vào chuông thông báo của tài khoản.
                </p>
              </div>

              <div className="space-y-3">
                <p className="text-xs font-black text-gray-400 uppercase tracking-wider mb-2">Quyền hạn hệ thống</p>
                
                <label className="flex items-center justify-between p-4 rounded-2xl border border-gray-100 hover:bg-gray-50 cursor-pointer transition-colors group">
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-xl flex items-center justify-center transition-colors ${editRoles.isAdmin ? 'bg-indigo-100 text-indigo-700' : 'bg-gray-100 text-gray-400 group-hover:bg-gray-200'}`}>
                      <Shield className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="font-bold text-sm text-gray-900">Quản trị viên (Admin)</div>
                      <div className="text-[11px] font-semibold text-gray-500">Toàn quyền quản lý hệ thống</div>
                    </div>
                  </div>
                  <div className={`w-12 h-6 rounded-full transition-colors relative flex items-center ${editRoles.isAdmin ? 'bg-indigo-600' : 'bg-gray-300'}`}>
                    <input 
                      type="checkbox" 
                      className="sr-only" 
                      checked={editRoles.isAdmin}
                      onChange={(e) => setEditRoles({...editRoles, isAdmin: e.target.checked})}
                    />
                    <div className={`w-4 h-4 rounded-full bg-white absolute top-1 transition-transform ${editRoles.isAdmin ? 'translate-x-7' : 'translate-x-1'}`} />
                  </div>
                </label>

                <label className="flex items-center justify-between p-4 rounded-2xl border border-gray-100 hover:bg-gray-50 cursor-pointer transition-colors group">
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-xl flex items-center justify-center transition-colors ${editRoles.isTeacher ? 'bg-teal-100 text-teal-700' : 'bg-gray-100 text-gray-400 group-hover:bg-gray-200'}`}>
                      <GraduationCap className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="font-bold text-sm text-gray-900">Giảng viên</div>
                      <div className="text-[11px] font-semibold text-gray-500">Quyền đăng tải và quản lý khóa học</div>
                    </div>
                  </div>
                  <div className={`w-12 h-6 rounded-full transition-colors relative flex items-center ${editRoles.isTeacher ? 'bg-teal-600' : 'bg-gray-300'}`}>
                    <input 
                      type="checkbox" 
                      className="sr-only" 
                      checked={editRoles.isTeacher}
                      onChange={(e) => setEditRoles({...editRoles, isTeacher: e.target.checked})}
                    />
                    <div className={`w-4 h-4 rounded-full bg-white absolute top-1 transition-transform ${editRoles.isTeacher ? 'translate-x-7' : 'translate-x-1'}`} />
                  </div>
                </label>

                <label className="flex items-center justify-between p-4 rounded-2xl border border-gray-100 hover:bg-gray-50 cursor-pointer transition-colors group">
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-xl flex items-center justify-center transition-colors ${editRoles.isVip ? 'bg-amber-100 text-amber-600' : 'bg-gray-100 text-gray-400 group-hover:bg-gray-200'}`}>
                      <Crown className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="font-bold text-sm text-gray-900">Tài khoản VIP</div>
                      <div className="text-[11px] font-semibold text-gray-500">Truy cập toàn bộ khóa học miễn phí</div>
                    </div>
                  </div>
                  <div className={`w-12 h-6 rounded-full transition-colors relative flex items-center ${editRoles.isVip ? 'bg-amber-500' : 'bg-gray-300'}`}>
                    <input 
                      type="checkbox" 
                      className="sr-only" 
                      checked={editRoles.isVip}
                      onChange={(e) => setEditRoles({...editRoles, isVip: e.target.checked})}
                    />
                    <div className={`w-4 h-4 rounded-full bg-white absolute top-1 transition-transform ${editRoles.isVip ? 'translate-x-7' : 'translate-x-1'}`} />
                  </div>
                </label>
              </div>
            </div>

            <div className="p-6 bg-gray-50 border-t border-gray-100 flex justify-end gap-3">
              <button 
                onClick={() => setSelectedUser(null)}
                className="px-5 py-2.5 rounded-xl text-xs font-black text-gray-600 hover:bg-gray-200 transition-colors cursor-pointer uppercase tracking-wider"
              >
                Hủy bỏ
              </button>
              <button 
                onClick={handleUpdateRoles}
                disabled={isUpdating}
                className="px-6 py-2.5 rounded-xl text-xs font-black text-white bg-[#007c76] hover:bg-[#00605b] transition-colors cursor-pointer uppercase tracking-wider flex items-center gap-2 disabled:opacity-50"
              >
                {isUpdating ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    Đang lưu...
                  </>
                ) : (
                  <>
                    <CheckCheck className="w-4 h-4" />
                    Xác nhận & Phê duyệt
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
