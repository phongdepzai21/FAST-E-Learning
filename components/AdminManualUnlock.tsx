import React, { useState, useEffect } from 'react';
import { db, auth } from '../firebase';
import { 
  collection, 
  doc, 
  setDoc, 
  getDoc,
  query, 
  orderBy, 
  limit, 
  onSnapshot,
  Timestamp 
} from 'firebase/firestore';
import { getMergedCourses } from '../constants';
import { Course } from '../types';
import { useToast } from '../contexts/ToastContext';
import { 
  ShieldAlert, 
  UserCheck, 
  Unlock, 
  Search, 
  Clock, 
  AlertCircle, 
  CheckCircle2, 
  Loader2,
  Mail,
  BookOpen
} from 'lucide-react';

interface UnlockLog {
  id: string;
  studentEmail: string;
  courseId: string;
  courseTitle: string;
  unlockedBy: string;
  unlockedAt: string;
}

export const AdminManualUnlock: React.FC = () => {
  const toast = useToast();
  const [studentEmail, setStudentEmail] = useState('');
  const [selectedCourseId, setSelectedCourseId] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [unlockLogs, setUnlockLogs] = useState<UnlockLog[]>([]);
  const [isLoadingLogs, setIsLoadingLogs] = useState(true);
  
  // Get merged course catalog
  const [courses, setCourses] = useState<Course[]>([]);

  useEffect(() => {
    // Sync course catalog
    const syncCatalog = () => {
      setCourses(getMergedCourses([]));
    };
    syncCatalog();
    
    // Watch for dynamic courses updates
    window.addEventListener('courses_updated', syncCatalog);
    window.addEventListener('storage', syncCatalog);
    return () => {
      window.removeEventListener('courses_updated', syncCatalog);
      window.removeEventListener('storage', syncCatalog);
    };
  }, []);

  // Real-time listener for the last 10 manual unlocks
  useEffect(() => {
    setIsLoadingLogs(true);
    const logsRef = collection(db, 'manual_unlocks');
    const q = query(logsRef, orderBy('unlockedAt', 'desc'), limit(10));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const logs: UnlockLog[] = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        logs.push({
          id: doc.id,
          studentEmail: data.studentEmail || '',
          courseId: data.courseId || '',
          courseTitle: data.courseTitle || '',
          unlockedBy: data.unlockedBy || '',
          unlockedAt: data.unlockedAt || ''
        });
      });
      setUnlockLogs(logs);
      setIsLoadingLogs(false);
    }, (error) => {
      console.error("Error listening to manual unlocks:", error);
      setIsLoadingLogs(false);
    });

    return () => unsubscribe();
  }, []);

  const handleGrantAccess = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const email = studentEmail.toLowerCase().trim();
    if (!email) {
      toast.error('Vui lòng nhập email học viên.');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      toast.error('Định dạng email học viên không hợp lệ.');
      return;
    }

    if (!selectedCourseId) {
      toast.error('Vui lòng chọn khóa học cần kích hoạt.');
      return;
    }

    const targetCourse = courses.find(c => c.id === selectedCourseId);
    if (!targetCourse) {
      toast.error('Không tìm thấy thông tin khóa học đã chọn.');
      return;
    }

    setIsSubmitting(true);

    try {
      // 1. Check or create base student profile in users/{email}
      const studentDocRef = doc(db, 'users', email);
      const studentDocSnap = await getDoc(studentDocRef);
      
      if (!studentDocSnap.exists()) {
        await setDoc(studentDocRef, {
          email: email,
          displayName: email.split('@')[0],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          isVip: false,
          isAdmin: false,
          isTeacher: false,
          isLocked: false
        });
      }

      // 2. Add course to user's purchased subcollection
      const courseRef = doc(db, 'users', email, 'purchased_courses', selectedCourseId);
      await setDoc(courseRef, {
        courseId: targetCourse.id,
        courseTitle: targetCourse.title,
        title: targetCourse.title,
        price: targetCourse.price || 'Miễn phí',
        progress: 0,
        unlockedAt: new Date().toISOString(),
        purchasedAt: new Date().toISOString(),
        status: 'active',
        completedLessons: []
      });

      // 3. Log this action to manual_unlocks collection
      const unlockLogId = `${email.replace(/[^a-z0-9]/g, '_')}_${selectedCourseId}_${Date.now()}`;
      const logRef = doc(db, 'manual_unlocks', unlockLogId);
      
      const adminEmail = auth.currentUser?.email || 'Hệ thống';
      
      await setDoc(logRef, {
        studentEmail: email,
        courseId: targetCourse.id,
        courseTitle: targetCourse.title,
        unlockedBy: adminEmail,
        unlockedAt: new Date().toISOString()
      });


      toast.success(`Đã kích hoạt thành công khóa học "${targetCourse.title}" cho ${email}!`);
      
      // Clean inputs
      setStudentEmail('');
      setSelectedCourseId('');
    } catch (err: any) {
      console.error("Error manual unlocking course:", err);
      toast.error(`Kích hoạt thất bại: ${err?.message || 'Lỗi không xác định'}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatDate = (isoStr: string) => {
    if (!isoStr) return '';
    try {
      const d = new Date(isoStr);
      return d.toLocaleString('vi-VN', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      });
    } catch {
      return isoStr;
    }
  };

  return (
    <div className="space-y-10 animate-in fade-in slide-in-from-bottom-5 duration-500">
      
      {/* Header section */}
      <div>
        <h3 className="text-2xl font-black text-gray-800 tracking-tight flex items-center gap-3 uppercase">
          <span className="w-2 h-8 bg-[#007c76] rounded-full shrink-0"></span>
          Kích hoạt khóa học thủ công
        </h3>
        <p className="text-gray-500 text-xs font-semibold mt-1">Cấp quyền truy cập tức thì vào khóa học cho bất kỳ học viên nào qua Email</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* Unlock Form Component */}
        <div className="lg:col-span-5 bg-white p-6 md:p-8 rounded-[32px] border border-gray-100 shadow-sm space-y-6">
          <div className="flex items-center gap-3 border-b border-gray-50 pb-4">
            <div className="w-10 h-10 rounded-xl bg-teal-50 flex items-center justify-center text-[#007c76]">
              <Unlock className="w-5 h-5" />
            </div>
            <div>
              <h4 className="font-extrabold text-gray-800 uppercase text-sm tracking-wide">Nhập thông tin mở khóa</h4>
              <p className="text-[10px] text-gray-400 font-medium">Quyền lợi sẽ được đồng bộ ngay lập tức</p>
            </div>
          </div>

          <form onSubmit={handleGrantAccess} className="space-y-5">
            
            {/* Email Input */}
            <div className="space-y-2">
              <label className="text-xs font-black text-gray-500 uppercase tracking-wider block">Email Học viên</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-gray-400">
                  <Mail className="w-4 h-4" />
                </div>
                <input 
                  type="email" 
                  value={studentEmail}
                  onChange={(e) => setStudentEmail(e.target.value)}
                  placeholder="vi_du@gmail.com"
                  disabled={isSubmitting}
                  className="w-full pl-11 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-[#007c76]/20 focus:border-[#007c76] disabled:opacity-60 transition-all"
                />
              </div>
            </div>

            {/* Course Selector */}
            <div className="space-y-2">
              <label className="text-xs font-black text-gray-500 uppercase tracking-wider block">Chọn Khóa học</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-gray-400">
                  <BookOpen className="w-4 h-4" />
                </div>
                <select
                  value={selectedCourseId}
                  onChange={(e) => setSelectedCourseId(e.target.value)}
                  disabled={isSubmitting}
                  className="w-full pl-11 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl text-sm font-bold focus:outline-none focus:ring-2 focus:ring-[#007c76]/20 focus:border-[#007c76] disabled:opacity-60 transition-all appearance-none cursor-pointer"
                >
                  <option value="" className="font-semibold text-gray-400">-- Chọn từ danh sách đào tạo --</option>
                  {courses.map(course => (
                    <option key={course.id} value={course.id} className="text-gray-800 font-bold">
                      {course.title} ({course.category || 'Chung'})
                    </option>
                  ))}
                </select>
                <div className="absolute inset-y-0 right-0 pr-4 flex items-center pointer-events-none text-gray-400">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 9l-7 7-7-7" /></svg>
                </div>
              </div>
            </div>

            {/* Warn Notice */}
            <div className="p-4 rounded-2xl bg-amber-50/50 border border-amber-100 flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="text-[11px] font-black text-amber-800 uppercase tracking-wider">Lưu ý quan trọng</p>
                <p className="text-[10px] text-amber-700/80 font-bold leading-normal">
                  Kích hoạt thủ công sẽ cấp quyền truy cập vĩnh viễn trực tiếp trong dữ liệu. Hành động này sẽ được lưu nhật ký hoạt động của quản trị viên để đối chiếu kế toán.
                </p>
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-[#007c76] hover:bg-[#00605b] disabled:bg-gray-300 text-white py-4 rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg shadow-[#007c76]/10 hover:shadow-xl transition-all hover:scale-[1.02] flex items-center justify-center gap-2 cursor-pointer disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Đang kích hoạt...
                </>
              ) : (
                <>
                  <UserCheck className="w-4 h-4" />
                  Cấp quyền truy cập tức thì
                </>
              )}
            </button>

          </form>
        </div>

        {/* Audit Log / Last 10 Manual Unlocks */}
        <div className="lg:col-span-7 bg-white p-6 md:p-8 rounded-[32px] border border-gray-100 shadow-sm space-y-6">
          <div className="flex items-center justify-between border-b border-gray-50 pb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600">
                <Clock className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-extrabold text-gray-800 uppercase text-sm tracking-wide">Nhật ký mở khóa gần đây</h4>
                <p className="text-[10px] text-gray-400 font-medium">Danh sách 10 giao dịch kích hoạt thủ công mới nhất</p>
              </div>
            </div>
          </div>

          {isLoadingLogs ? (
            <div className="py-12 flex flex-col items-center justify-center space-y-3">
              <Loader2 className="w-8 h-8 text-[#007c76] animate-spin" />
              <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Đang tải lịch sử...</p>
            </div>
          ) : unlockLogs.length > 0 ? (
            <div className="space-y-4">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-gray-100 text-[10px] font-black text-gray-400 uppercase tracking-wider">
                      <th className="py-3 px-2">Học viên / Khóa học</th>
                      <th className="py-3 px-2">Thời gian kích hoạt</th>
                      <th className="py-3 px-2 text-right">Người thực hiện</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {unlockLogs.map((log) => (
                      <tr key={log.id} className="group hover:bg-gray-50/50 transition-colors">
                        <td className="py-3.5 px-2">
                          <div className="space-y-1">
                            <p className="text-xs font-extrabold text-gray-800 break-all">{log.studentEmail}</p>
                            <div className="flex items-center gap-2 text-[10px] text-gray-500 font-bold">
                              <span>📚 {log.courseTitle}</span>
                              <span className="text-gray-300">|</span>
                              <span className="font-mono text-gray-400 text-[9px] uppercase">{log.courseId}</span>
                            </div>
                          </div>
                        </td>
                        <td className="py-3.5 px-2 whitespace-nowrap">
                          <p className="text-[11px] font-bold text-gray-600">{formatDate(log.unlockedAt)}</p>
                        </td>
                        <td className="py-3.5 px-2 text-right whitespace-nowrap">
                          <p className="text-[11px] font-black text-[#007c76]">{log.unlockedBy}</p>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className="py-16 text-center border-2 border-dashed border-gray-100 rounded-3xl">
              <p className="text-gray-400 font-bold text-sm">Chưa có bản ghi mở khóa thủ công nào trong hệ thống.</p>
            </div>
          )}

        </div>
        
      </div>
    </div>
  );
};
