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
  onSnapshot 
} from 'firebase/firestore';
import { getMergedCourses } from '../constants';
import { Course } from '../types';
import { useToast } from '../contexts/ToastContext';
import { 
  Unlock, 
  UserCheck, 
  Clock, 
  AlertCircle, 
  Loader2,
  Mail,
  BookOpen,
  DollarSign,
  FileText,
  CheckCircle2,
  Gift,
  HelpCircle,
  FileCheck,
  CreditCard,
  History
} from 'lucide-react';

interface UnifiedUnlockLog {
  id: string;
  studentEmail: string;
  courseId: string;
  courseTitle: string;
  unlockedBy: string;
  unlockedAt: string;
  type: 'MANUAL_UNLOCK' | 'BANK_TRANSFER' | 'GIFT';
  bankAmount?: string;
  bankMemo?: string;
  bankRefId?: string;
}

export const AdminManualUnlock: React.FC = () => {
  const toast = useToast();
  const [studentEmail, setStudentEmail] = useState('');
  const [selectedCourseId, setSelectedCourseId] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activationType, setActivationType] = useState<'MANUAL_UNLOCK' | 'BANK_TRANSFER' | 'GIFT'>('BANK_TRANSFER');
  
  // Bank transfer specific fields
  const [bankAmount, setBankAmount] = useState('599.000đ');
  const [bankMemo, setBankMemo] = useState('');
  const [bankRefId, setBankRefId] = useState('');

  // Unified audit log state
  const [unlockLogs, setUnlockLogs] = useState<UnifiedUnlockLog[]>([]);
  const [isLoadingLogs, setIsLoadingLogs] = useState(true);
  
  // Dynamic courses catalog
  const [courses, setCourses] = useState<Course[]>([]);

  useEffect(() => {
    const syncCatalog = () => {
      setCourses(getMergedCourses([]));
    };
    syncCatalog();
    
    window.addEventListener('courses_updated', syncCatalog);
    window.addEventListener('storage', syncCatalog);
    return () => {
      window.removeEventListener('courses_updated', syncCatalog);
      window.removeEventListener('storage', syncCatalog);
    };
  }, []);

  // Set default bank memo content when user selects a course
  useEffect(() => {
    if (selectedCourseId && studentEmail) {
      const emailPrefix = studentEmail.split('@')[0].toUpperCase();
      const coursePrefix = selectedCourseId.toUpperCase().replace(/[^A-Z0-9]/g, '');
      setBankMemo(`FAST ${coursePrefix} ${emailPrefix}`);
      
      const found = courses.find(c => c.id === selectedCourseId);
      if (found) {
        setBankAmount(found.price || '599.000đ');
      }
    }
  }, [selectedCourseId, studentEmail, courses]);

  // Real-time listener for unified manual/bank transfer unlocks (last 15 records)
  useEffect(() => {
    setIsLoadingLogs(true);
    const logsRef = collection(db, 'manual_unlocks');
    const q = query(logsRef, orderBy('unlockedAt', 'desc'), limit(15));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const logs: UnifiedUnlockLog[] = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        logs.push({
          id: doc.id,
          studentEmail: data.studentEmail || '',
          courseId: data.courseId || '',
          courseTitle: data.courseTitle || '',
          unlockedBy: data.unlockedBy || '',
          unlockedAt: data.unlockedAt || '',
          type: data.type || 'MANUAL_UNLOCK',
          bankAmount: data.bankAmount || '',
          bankMemo: data.bankMemo || '',
          bankRefId: data.bankRefId || ''
        });
      });
      setUnlockLogs(logs);
      setIsLoadingLogs(false);
    }, (error) => {
      console.error("Error listening to unified manual unlocks:", error);
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

    if (activationType === 'BANK_TRANSFER' && !bankRefId) {
      toast.error('Vui lòng nhập mã tham chiếu giao dịch ngân hàng.');
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
        completedLessons: [],
        claimedVia: activationType
      }, { merge: true });

      // 3. Log this action to manual_unlocks collection
      const unlockLogId = `${email.replace(/[^a-z0-9]/g, '_')}_${selectedCourseId}_${Date.now()}`;
      const logRef = doc(db, 'manual_unlocks', unlockLogId);
      const adminEmail = auth.currentUser?.email || 'Hệ thống';
      
      const payload: any = {
        studentEmail: email,
        courseId: targetCourse.id,
        courseTitle: targetCourse.title,
        unlockedBy: adminEmail,
        unlockedAt: new Date().toISOString(),
        type: activationType
      };

      if (activationType === 'BANK_TRANSFER') {
        payload.bankAmount = bankAmount;
        payload.bankMemo = bankMemo;
        payload.bankRefId = bankRefId;
      }

      await setDoc(logRef, payload);

      // 4. Record dynamic registration notice for Admin student console
      try {
        const regId = `${email.replace(/[^a-z0-9]/g, '_')}_${targetCourse.id}_${Date.now()}`;
        await setDoc(doc(db, 'course_registrations', regId), {
          studentEmail: email,
          studentName: email.split('@')[0],
          courseId: targetCourse.id,
          courseTitle: targetCourse.title,
          registeredAt: new Date().toISOString(),
          price: activationType === 'BANK_TRANSFER' ? bankAmount : 'Miễn phí',
          status: 'active',
          type: activationType
        });
      } catch (e) {
        console.warn('Lỗi đồng bộ course_registrations:', e);
      }

      toast.success(
        activationType === 'BANK_TRANSFER' 
          ? `Đã duyệt thành công giao dịch chuyển khoản và kích hoạt khóa học "${targetCourse.title}" cho ${email}!`
          : `Đã kích hoạt thành công khóa học "${targetCourse.title}" cho ${email}!`
      );
      
      // Clean inputs
      setStudentEmail('');
      setSelectedCourseId('');
      setBankRefId('');
      setBankMemo('');
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
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      });
    } catch {
      return isoStr;
    }
  };

  const getTypeBadge = (type: string) => {
    switch (type) {
      case 'BANK_TRANSFER':
        return <span className="bg-emerald-100 text-emerald-800 text-[10px] px-2.5 py-1 rounded-lg font-black uppercase tracking-wider">Duyệt Chuyển Khoản</span>;
      case 'GIFT':
        return <span className="bg-amber-100 text-amber-800 text-[10px] px-2.5 py-1 rounded-lg font-black uppercase tracking-wider">Quà Tặng Tri Ân</span>;
      default:
        return <span className="bg-purple-100 text-purple-800 text-[10px] px-2.5 py-1 rounded-lg font-black uppercase tracking-wider">Hệ Thống / Manual</span>;
    }
  };

  return (
    <div className="space-y-10 animate-in fade-in slide-in-from-bottom-5 duration-500">
      
      {/* Header section */}
      <div>
        <h3 className="text-2xl font-black text-gray-800 tracking-tight flex items-center gap-3 uppercase">
          <span className="w-2 h-8 bg-[#007c76] rounded-full shrink-0"></span>
          Kích hoạt & Duyệt khóa học chuyển khoản
        </h3>
        <p className="text-gray-500 text-xs font-semibold mt-1">Cấp quyền học tập tức thì cho học viên qua chuyển khoản ngân hàng hoặc kích hoạt thủ công</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* Unified Issuance Form */}
        <div className="lg:col-span-5 bg-white p-6 md:p-8 rounded-[32px] border border-gray-100 shadow-sm space-y-6">
          
          {/* Activation Type Switcher Tabs */}
          <div className="grid grid-cols-3 gap-2 p-1.5 bg-gray-50 rounded-2xl border border-gray-150">
            <button
              type="button"
              onClick={() => setActivationType('BANK_TRANSFER')}
              className={`py-2.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all flex flex-col items-center justify-center gap-1 cursor-pointer ${activationType === 'BANK_TRANSFER' ? 'bg-white text-[#007c76] shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
            >
              <CreditCard className="w-3.5 h-3.5" />
              <span>Duyệt CK</span>
            </button>
            <button
              type="button"
              onClick={() => setActivationType('MANUAL_UNLOCK')}
              className={`py-2.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all flex flex-col items-center justify-center gap-1 cursor-pointer ${activationType === 'MANUAL_UNLOCK' ? 'bg-white text-[#007c76] shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
            >
              <Unlock className="w-3.5 h-3.5" />
              <span>Thủ Công</span>
            </button>
            <button
              type="button"
              onClick={() => setActivationType('GIFT')}
              className={`py-2.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all flex flex-col items-center justify-center gap-1 cursor-pointer ${activationType === 'GIFT' ? 'bg-white text-[#007c76] shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
            >
              <Gift className="w-3.5 h-3.5" />
              <span>Tặng Quà</span>
            </button>
          </div>

          <form onSubmit={handleGrantAccess} className="space-y-5">
            
            {/* Student Email */}
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
                  placeholder="hocvien_chuyenkhoan@gmail.com"
                  disabled={isSubmitting}
                  className="w-full pl-11 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-[#007c76]/20 focus:border-[#007c76] disabled:opacity-60 transition-all"
                />
              </div>
            </div>

            {/* Course Selector */}
            <div className="space-y-2">
              <label className="text-xs font-black text-gray-500 uppercase tracking-wider block">Khóa học Kích hoạt</label>
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
                  <option value="" className="font-semibold text-gray-400">-- Chọn khóa học học viên đã mua --</option>
                  {courses.map(course => (
                    <option key={course.id} value={course.id} className="text-gray-800 font-bold">
                      {course.title} ({course.price || 'Miễn phí'})
                    </option>
                  ))}
                </select>
                <div className="absolute inset-y-0 right-0 pr-4 flex items-center pointer-events-none text-gray-400">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 9l-7 7-7-7" /></svg>
                </div>
              </div>
            </div>

            {/* Bank Transfer Details Form Area */}
            {activationType === 'BANK_TRANSFER' && (
              <div className="p-5 rounded-3xl bg-emerald-50/30 border border-emerald-100 space-y-4 animate-in zoom-in-95 duration-200">
                <div className="flex items-center gap-2 border-b border-emerald-50 pb-2">
                  <span className="text-sm">💵</span>
                  <p className="text-[10px] font-black text-emerald-800 uppercase tracking-wider">Chi tiết biên lai chuyển khoản ngân hàng</p>
                </div>

                {/* Amount Paid */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider">Số tiền nhận</label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400 text-xs">
                        đ
                      </div>
                      <input 
                        type="text" 
                        value={bankAmount}
                        onChange={(e) => setBankAmount(e.target.value)}
                        placeholder="599.000đ"
                        className="w-full pl-7 pr-3 py-2 bg-white border border-gray-200 rounded-xl text-xs font-bold focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500"
                      />
                    </div>
                  </div>

                  {/* Ref bank ID */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider">Mã giao dịch (Ref)</label>
                    <input 
                      type="text" 
                      value={bankRefId}
                      onChange={(e) => setBankRefId(e.target.value)}
                      placeholder="FT2609304321"
                      className="w-full px-3 py-2 bg-white border border-gray-200 rounded-xl text-xs font-mono font-bold focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500"
                    />
                  </div>
                </div>

                {/* Bank Memo */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider">Nội dung chuyển khoản đối soát</label>
                  <input 
                    type="text" 
                    value={bankMemo}
                    onChange={(e) => setBankMemo(e.target.value)}
                    placeholder="FAST HACCP HOCVIEN"
                    className="w-full px-3 py-2 bg-white border border-gray-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500"
                  />
                </div>
              </div>
            )}

            {/* Note alert */}
            <div className="p-4 rounded-2xl bg-slate-50 border border-gray-150 flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-gray-400 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="text-[11px] font-black text-gray-600 uppercase tracking-wider">Nhật ký kiểm toán</p>
                <p className="text-[10px] text-gray-500 font-bold leading-normal">
                  Hành động này sẽ được lưu dấu lịch sử để phục vụ quyết toán tài chính giữa Quản trị viên và Kế toán. Vui lòng đối soát kĩ số tiền chuyển khoản thực tế.
                </p>
              </div>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-[#007c76] hover:bg-[#00605b] disabled:bg-gray-300 text-white py-4 rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg shadow-[#007c76]/10 hover:shadow-xl transition-all hover:scale-[1.02] flex items-center justify-center gap-2 cursor-pointer disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Đang xử lý kích hoạt...
                </>
              ) : (
                <>
                  <UserCheck className="w-4 h-4" />
                  {activationType === 'BANK_TRANSFER' ? 'Duyệt Chuyển Khoản & Cấp Khóa' : 'Kích hoạt truy cập ngay'}
                </>
              )}
            </button>

          </form>
        </div>

        {/* Central Audit Journal Table (Manually Activated & Bank Approvals) */}
        <div className="lg:col-span-7 bg-white p-6 md:p-8 rounded-[32px] border border-gray-100 shadow-sm space-y-6">
          <div className="flex items-center justify-between border-b border-gray-50 pb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#007c76]/5 flex items-center justify-center text-[#007c76]">
                <History className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-extrabold text-gray-800 uppercase text-sm tracking-wide">Sổ Nhật Ký Kích Hoạt & Chuyển Khoản</h4>
                <p className="text-[10px] text-gray-400 font-medium">Danh sách các tài khoản được duyệt chuyển khoản hoặc kích hoạt hệ thống</p>
              </div>
            </div>
          </div>

          {isLoadingLogs ? (
            <div className="py-16 flex flex-col items-center justify-center space-y-3">
              <Loader2 className="w-8 h-8 text-[#007c76] animate-spin" />
              <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Đang tải sổ nhật ký...</p>
            </div>
          ) : unlockLogs.length > 0 ? (
            <div className="space-y-4">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-gray-100 text-[10px] font-black text-gray-400 uppercase tracking-wider">
                      <th className="py-3 px-2">Chi tiết học viên / Giao dịch</th>
                      <th className="py-3 px-2">Hình thức cấp</th>
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
                            <div className="flex flex-wrap items-center gap-1.5 text-[10px] text-gray-500 font-bold">
                              <span>📚 {log.courseTitle}</span>
                              {log.type === 'BANK_TRANSFER' && (
                                <>
                                  <span className="text-gray-300">|</span>
                                  <span className="text-emerald-600 font-extrabold">{log.bankAmount}</span>
                                  <span className="text-gray-300">|</span>
                                  <span className="font-mono text-slate-500 bg-slate-50 px-1 py-0.2 rounded border border-gray-100 text-[9px] uppercase">Ref: {log.bankRefId}</span>
                                </>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="py-3.5 px-2 whitespace-nowrap">
                          {getTypeBadge(log.type)}
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
              <p className="text-gray-400 font-bold text-sm">Chưa có giao dịch kích hoạt thủ công hay duyệt chuyển khoản nào.</p>
            </div>
          )}

        </div>
        
      </div>
    </div>
  );
};
