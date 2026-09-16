import React, { useState, useEffect } from 'react';
import { collection, getDocs, doc, setDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { User as UserIcon, Shield, GraduationCap, Crown, Search, Mail, BookOpen, Clock, Activity } from 'lucide-react';
import { useToast } from '../contexts/ToastContext';

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
  const { toast } = useToast();

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    setIsLoading(true);
    try {
      const usersRef = collection(db, 'users');
      const snapshot = await getDocs(usersRef);
      
      const userData: UserData[] = [];
      
      for (const docSnap of snapshot.docs) {
        const data = docSnap.data();
        
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
          id: docSnap.id,
          email: data.email || docSnap.id,
          displayName: data.displayName || 'Học viên',
          photoURL: data.photoURL,
          isAdmin: data.isAdmin || false,
          isTeacher: data.isTeacher || false,
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
          <h2 className="text-xl sm:text-2xl font-black text-gray-900 tracking-tight">Quản lý Tài khoản</h2>
          <p className="text-sm font-semibold text-gray-500 mt-1">
            Tổng cộng: {users.length} tài khoản trong hệ thống
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
                    <button className="px-4 py-2 bg-gray-50 hover:bg-[#007c76]/10 text-gray-600 hover:text-[#007c76] rounded-xl text-[11px] font-black uppercase tracking-wider transition-all">
                      Xem chi tiết
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
    </div>
  );
};
