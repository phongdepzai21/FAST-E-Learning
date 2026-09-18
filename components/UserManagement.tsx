import React, { useState, useEffect } from 'react';
import { collection, getDocs, doc, setDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { User as UserIcon, Shield, GraduationCap, Crown, Search, Mail, BookOpen, Clock, Activity, X, Save, Bell, CheckCheck, Check } from 'lucide-react';
import { useToast } from '../contexts/ToastContext';
import { ADMIN_EMAILS, TEACHER_EMAILS } from '../constants';
import { addApprovalNotification } from '../utils/courseNotificationService';

interface UserData {
  id: string; // The email
  email: string;
  displayName?: string;
  photoURL?: string;
  isAdmin?: boolean;
  isTeacher?: boolean;
  isVip?: boolean;
  createdAt?: string;
  lastLoginAt?: string;
  purchasedCoursesCount: number;
}

export const UserManagement: React.FC = () => {
  const [users, setUsers] = useState<UserData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedUser, setSelectedUser] = useState<UserData | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);
  const [editRoles, setEditRoles] = useState({ isAdmin: false, isTeacher: false, isVip: false });
  const { success, error } = useToast();

  useEffect(() => {
    fetchUsers();
  }, []);

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

  const fetchUsers = async () => {
    setIsLoading(true);
    try {
      const usersRef = collection(db, 'users');
      const snapshot = await getDocs(usersRef);
      
      const userData: UserData[] = [];
      
      for (const docSnap of snapshot.docs) {
        const data = docSnap.data();
        const normalizedEmail = docSnap.id.toLowerCase().trim();
        const isHardcodedAdmin = ADMIN_EMAILS.some(e => e.toLowerCase() === normalizedEmail);
        const isHardcodedTeacher = TEACHER_EMAILS.some(e => e.toLowerCase() === normalizedEmail);
        
        // Count purchased courses
        let purchasedCoursesCount = 0;
        try {
          const purchasedRef = collection(db, 'users', docSnap.id, 'purchased_courses');
          const purchasedSnap = await getDocs(purchasedRef);
          purchasedCoursesCount = purchasedSnap.size;
        } catch (e) {
          console.error(`Could not fetch courses for ${docSnap.id}`);
        }
        
        userData.push({
          id: normalizedEmail,
          email: data.email || normalizedEmail,
          displayName: data.displayName || 'Học viên',
          photoURL: data.photoURL,
          isAdmin: data.isAdmin === true || isHardcodedAdmin,
          isTeacher: data.isTeacher === true || isHardcodedTeacher || data.isAdmin === true || isHardcodedAdmin,
          isVip: data.isVip || false,
          createdAt: data.createdAt,
          lastLoginAt: data.lastLoginAt,
          purchasedCoursesCount
        });
      }
      
      setUsers(userData);
    } catch (error) {
      console.error('Error fetching users:', error);
      // Fallback data if permissions fail
    } finally {
      setIsLoading(false);
    }
  };

  const filteredUsers = users.filter(user => 
    user.email.toLowerCase().includes(searchTerm.toLowerCase()) || 
    (user.displayName && user.displayName.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-gray-900 tracking-tight">Quản lý & Phê duyệt Tài khoản</h2>
          <p className="text-sm font-semibold text-gray-500 mt-1">
            Tổng cộng: {users.length} tài khoản. Cập nhật phân quyền sẽ tự động gửi thông báo phê duyệt đến người dùng.
          </p>
        </div>
        
        <div className="relative w-full sm:w-auto">
          <Search className="w-5 h-5 absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Tìm theo email, tên..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full sm:w-80 pl-11 pr-4 py-3 bg-white border border-gray-200 rounded-2xl text-sm font-bold text-gray-700 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#007c76]/20 focus:border-[#007c76] transition-all shadow-sm"
          />
        </div>
      </div>

      {isLoading ? (
        <div className="py-20 flex flex-col items-center justify-center gap-4">
          <div className="w-10 h-10 border-4 border-[#007c76] border-t-transparent rounded-full animate-spin"></div>
          <p className="text-gray-400 text-xs font-bold uppercase tracking-wider animate-pulse">Đang tải danh sách tài khoản...</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-[24px] border border-gray-100 bg-white shadow-sm">
          <table className="w-full text-left border-collapse min-w-[800px]">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100 text-gray-500 text-[10px] sm:text-xs font-bold uppercase tracking-widest">
                <th className="py-4 px-6">Tài khoản</th>
                <th className="py-4 px-6">Vai trò</th>
                <th className="py-4 px-6 text-center">Khóa học</th>
                <th className="py-4 px-6 whitespace-nowrap">Tham gia ngày</th>
                <th className="py-4 px-6 text-right">Chi tiết</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filteredUsers.length > 0 ? filteredUsers.map((user) => (
                <tr key={user.id} className="hover:bg-gray-50/40 transition-colors text-xs sm:text-sm text-gray-700 group">
                  <td className="py-4 px-6">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-gray-100 border-2 border-white shadow-sm overflow-hidden flex items-center justify-center shrink-0">
                        {user.photoURL ? (
                          <img src={user.photoURL} alt={user.email} className="w-full h-full object-cover" />
                        ) : (
                          <UserIcon className="w-5 h-5 text-gray-400" />
                        )}
                      </div>
                      <div>
                        <div className="font-extrabold text-gray-900 group-hover:text-[#007c76] transition-colors">{user.displayName}</div>
                        <div className="font-semibold text-gray-400 text-xs mt-0.5 flex items-center gap-1">
                          <Mail className="w-3 h-3" />
                          {user.email}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="py-4 px-6">
                    <div className="flex flex-wrap items-center gap-1.5">
                      {user.isAdmin && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-indigo-50 border border-indigo-100 text-indigo-700 text-[10px] font-black uppercase tracking-wider">
                          <Shield className="w-3 h-3" /> Admin
                        </span>
                      )}
                      {user.isTeacher && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-teal-50 border border-teal-100 text-teal-700 text-[10px] font-black uppercase tracking-wider">
                          <GraduationCap className="w-3 h-3" /> Giảng viên
                        </span>
                      )}
                      {user.isVip && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-50 border border-amber-100 text-amber-600 text-[10px] font-black uppercase tracking-wider shadow-sm shadow-amber-500/10">
                          <Crown className="w-3 h-3" /> VIP
                        </span>
                      )}
                      {!user.isAdmin && !user.isTeacher && !user.isVip && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-gray-100 text-gray-500 text-[10px] font-black uppercase tracking-wider">
                          Học viên
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="py-4 px-6 text-center">
                    <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 border border-blue-100 text-blue-700 font-black text-xs">
                      <BookOpen className="w-3.5 h-3.5" />
                      {user.purchasedCoursesCount}
                    </div>
                  </td>
                  <td className="py-4 px-6 font-semibold text-gray-500">
                    <div className="flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-gray-400" />
                      {user.createdAt ? new Date(user.createdAt).toLocaleDateString('vi-VN') : 'Không rõ'}
                    </div>
                  </td>
                  <td className="py-4 px-6 text-right">
                    <button 
                      onClick={() => {
                        setSelectedUser(user);
                        setEditRoles({
                          isAdmin: user.isAdmin || false,
                          isTeacher: user.isTeacher || false,
                          isVip: user.isVip || false
                        });
                      }}
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-[#007c76]/5 hover:bg-[#007c76] text-[#007c76] hover:text-white border border-[#007c76]/20 hover:border-[#007c76] rounded-xl text-[11px] font-black uppercase tracking-wider transition-all cursor-pointer shadow-xs"
                    >
                      <Shield className="w-3.5 h-3.5" />
                      Phê duyệt & Phân quyền
                    </button>
                  </td>
                </tr>
              )) : (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-gray-400 font-bold text-sm">
                    Không tìm thấy tài khoản nào khớp với tìm kiếm.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

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
