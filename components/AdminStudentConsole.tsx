import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Legend
} from 'recharts';
import { 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  query, 
  orderBy, 
  limit, 
  onSnapshot 
} from 'firebase/firestore';
import { 
  Search, 
  User, 
  BookOpen, 
  Bell, 
  Calendar, 
  CheckCircle, 
  XCircle, 
  Loader2, 
  Clock, 
  Mail, 
  Tag, 
  UserCheck, 
  ShieldAlert, 
  CheckCircle2, 
  Tv, 
  HelpCircle 
} from 'lucide-react';
import { useToast } from '../contexts/ToastContext';

interface StudentProfile {
  email: string;
  displayName?: string;
  createdAt?: string;
  isVip?: boolean;
  isAdmin?: boolean;
  isTeacher?: boolean;
  isLocked?: boolean;
}

interface StudentCourse {
  courseId: string;
  courseTitle: string;
  purchasedAt?: string;
  unlockedAt?: string;
  price?: string;
  status?: string;
  progress?: number;
  claimedVia?: string;
}

interface GlobalRegistrationNotice {
  id: string;
  studentEmail: string;
  studentName: string;
  courseId: string;
  courseTitle: string;
  registeredAt: string;
  price: string;
  status: string;
  type: string;
}

export const AdminStudentConsole: React.FC = () => {
  const toast = useToast();
  const [searchEmail, setSearchEmail] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  
  // Looked-up student results
  const [searchedUser, setSearchedUser] = useState<StudentProfile | null>(null);
  const [searchedCourses, setSearchedCourses] = useState<StudentCourse[]>(null);
  const [searchTriggered, setSearchTriggered] = useState(false);

  // Live registration feed
  const [liveNotices, setLiveNotices] = useState<GlobalRegistrationNotice[]>([]);
  const [isLoadingNotices, setIsLoadingNotices] = useState(true);

  // Listen to live course registrations (last 150 for high fidelity charts)
  useEffect(() => {
    setIsLoadingNotices(true);
    const noticesRef = collection(db, 'course_registrations');
    const q = query(noticesRef, orderBy('registeredAt', 'desc'), limit(150));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const list: GlobalRegistrationNotice[] = [];
      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        list.push({
          id: docSnap.id,
          studentEmail: data.studentEmail || '',
          studentName: data.studentName || '',
          courseId: data.courseId || '',
          courseTitle: data.courseTitle || '',
          registeredAt: data.registeredAt || '',
          price: data.price || 'Miễn phí',
          status: data.status || 'active',
          type: data.type || 'FREE_CLAIM'
        });
      });
      setLiveNotices(list);
      setIsLoadingNotices(false);
    }, (err) => {
      console.warn('Lỗi lắng nghe thông báo đăng ký:', err);
      setIsLoadingNotices(false);
    });

    return () => unsubscribe();
  }, []);

  // 1. Calculate chartData of last 7 days dynamically
  const chartData = React.useMemo(() => {
    const days = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' });
      days.push({
        dateStr,
        fullDate: d.toISOString().split('T')[0], // YYYY-MM-DD
        registrations: 0,
        manualUnlocks: 0,
        selfClaims: 0
      });
    }

    liveNotices.forEach(notice => {
      if (!notice.registeredAt) return;
      const regDateStr = notice.registeredAt.split('T')[0];
      const matchedDay = days.find(day => day.fullDate === regDateStr);
      if (matchedDay) {
        matchedDay.registrations++;
        if (notice.type === 'MANUAL_UNLOCK') {
          matchedDay.manualUnlocks++;
        } else {
          matchedDay.selfClaims++;
        }
      }
    });

    return days;
  }, [liveNotices]);

  // 2. Metrics calculated from chartData & liveNotices
  const totalWeeklyRegs = React.useMemo(() => {
    return chartData.reduce((acc, curr) => acc + curr.registrations, 0);
  }, [chartData]);

  const totalSelfClaims = React.useMemo(() => {
    return chartData.reduce((acc, curr) => acc + curr.selfClaims, 0);
  }, [chartData]);

  const totalManualUnlocks = React.useMemo(() => {
    return chartData.reduce((acc, curr) => acc + curr.manualUnlocks, 0);
  }, [chartData]);

  const hotCourse = React.useMemo(() => {
    if (liveNotices.length === 0) return '';
    const counts: Record<string, number> = {};
    liveNotices.forEach(n => {
      if (!n.courseTitle) return;
      counts[n.courseTitle] = (counts[n.courseTitle] || 0) + 1;
    });

    let topCourse = '';
    let maxCount = 0;
    Object.entries(counts).forEach(([title, count]) => {
      if (count > maxCount) {
        maxCount = count;
        topCourse = title;
      }
    });

    return topCourse;
  }, [liveNotices]);

  const handleLookup = async (e?: React.FormEvent, directEmail?: string) => {
    if (e) e.preventDefault();
    
    const targetEmail = (directEmail || searchEmail).toLowerCase().trim();
    if (!targetEmail) {
      toast.error('Vui lòng nhập email học viên cần tra cứu.');
      return;
    }

    setIsSearching(true);
    setSearchTriggered(true);
    setSearchedUser(null);
    setSearchedCourses(null);

    try {
      // 1. Fetch user profile
      const userRef = doc(db, 'users', targetEmail);
      const userSnap = await getDoc(userRef);

      if (!userSnap.exists()) {
        toast.info(`Học viên với email ${targetEmail} chưa đăng ký tài khoản trên Cloud Firestore.`);
        setSearchedUser({
          email: targetEmail,
          displayName: 'Chưa có tài khoản',
          isLocked: false
        });
        setSearchedCourses([]);
        setIsSearching(false);
        return;
      }

      const userData = userSnap.data();
      setSearchedUser({
        email: targetEmail,
        displayName: userData.displayName || 'Chưa đặt tên',
        createdAt: userData.createdAt || '',
        isVip: userData.isVip || false,
        isAdmin: userData.isAdmin || false,
        isTeacher: userData.isTeacher || false,
        isLocked: userData.isLocked || false
      });

      // 2. Fetch subcollection purchased_courses
      const purchasedCoursesRef = collection(db, 'users', targetEmail, 'purchased_courses');
      const coursesSnap = await getDocs(purchasedCoursesRef);
      
      const list: StudentCourse[] = [];
      coursesSnap.forEach((courseDoc) => {
        const data = courseDoc.data();
        list.push({
          courseId: courseDoc.id,
          courseTitle: data.courseTitle || data.title || '',
          purchasedAt: data.purchasedAt || data.unlockedAt || '',
          unlockedAt: data.unlockedAt || '',
          price: data.price || 'Miễn phí',
          status: data.status || 'active',
          progress: typeof data.progress === 'number' ? data.progress : 0,
          claimedVia: data.claimedVia || ''
        });
      });

      // Sort by unlocked date desc
      list.sort((a, b) => {
        const dateA = new Date(a.unlockedAt || a.purchasedAt || 0).getTime();
        const dateB = new Date(b.unlockedAt || b.purchasedAt || 0).getTime();
        return dateB - dateA;
      });

      setSearchedCourses(list);
      toast.success(`Đã hoàn tất tra cứu học viên: ${targetEmail}`);
    } catch (err: any) {
      console.error("Lỗi tra cứu thông tin học viên:", err);
      toast.error(`Tra cứu thất bại: ${err?.message || 'Lỗi không xác định'}`);
    } finally {
      setIsSearching(false);
    }
  };

  const handleQuickLookup = (email: string) => {
    setSearchEmail(email);
    handleLookup(undefined, email);
  };

  const formatDate = (isoStr: string) => {
    if (!isoStr) return 'Chưa rõ';
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

  const getClaimBadge = (type: string) => {
    switch (type) {
      case 'MANUAL_UNLOCK':
        return <span className="bg-purple-100 text-purple-700 text-[10px] px-2 py-0.5 rounded-full font-black uppercase tracking-wider">Thủ công</span>;
      case 'VIP_INSTANT':
      case 'VIP_ALL':
        return <span className="bg-amber-100 text-amber-700 text-[10px] px-2 py-0.5 rounded-full font-black uppercase tracking-wider">Thành viên VIP</span>;
      case 'ADMIN_INSTANT':
      case 'ADMIN_ALL':
        return <span className="bg-blue-100 text-blue-700 text-[10px] px-2 py-0.5 rounded-full font-black uppercase tracking-wider">Admin</span>;
      default:
        return <span className="bg-emerald-100 text-emerald-700 text-[10px] px-2 py-0.5 rounded-full font-black uppercase tracking-wider">Đăng ký tự do</span>;
    }
  };

  return (
    <div className="space-y-10 animate-in fade-in slide-in-from-bottom-5 duration-500">
      
      {/* Page Header */}
      <div>
        <h3 className="text-2xl font-black text-gray-800 tracking-tight flex items-center gap-3 uppercase">
          <span className="w-2 h-8 bg-[#007c76] rounded-full shrink-0"></span>
          Bảng kiểm tra & Thông báo học viên
        </h3>
        <p className="text-gray-500 text-xs font-semibold mt-1">Giám sát thông báo đăng ký thời gian thực và tra cứu trạng thái kích hoạt khóa học của học viên</p>
      </div>

      {/* Real-time Registrations Analytics & Chart Section */}
      <div className="bg-white p-6 md:p-8 rounded-[32px] border border-gray-100 shadow-sm space-y-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-gray-50 pb-4">
          <div>
            <h4 className="font-extrabold text-gray-800 uppercase text-sm tracking-wide flex items-center gap-2">
              <span className="w-1.5 h-4 bg-[#007c76] rounded"></span>
              Biểu đồ phân tích lượng đăng ký mới (Real-time)
            </h4>
            <p className="text-[10px] text-gray-400 font-medium">Thống kê tự đăng ký và kích hoạt trong 7 ngày qua</p>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-[#007c76] animate-pulse"></span>
            <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Đang cập nhật live</span>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Area Chart */}
          <div className="lg:col-span-2 h-[260px] relative">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorSelf" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#007c76" stopOpacity={0.2}/>
                    <stop offset="95%" stopColor="#007c76" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorManual" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#818cf8" stopOpacity={0.2}/>
                    <stop offset="95%" stopColor="#818cf8" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                <XAxis 
                  dataKey="dateStr" 
                  stroke="#94a3b8" 
                  fontSize={10} 
                  fontWeight={600} 
                  tickLine={false} 
                />
                <YAxis 
                  stroke="#94a3b8" 
                  fontSize={10} 
                  fontWeight={600} 
                  tickLine={false} 
                  allowDecimals={false} 
                />
                <Tooltip 
                  contentStyle={{ 
                    borderRadius: '16px', 
                    border: '1px solid #f1f5f9', 
                    boxShadow: '0 4px 12px rgba(0,0,0,0.03)',
                    fontSize: '11px',
                    fontWeight: 700
                  }} 
                />
                <Legend 
                  iconType="circle" 
                  iconSize={6} 
                  wrapperStyle={{ fontSize: '10px', fontWeight: 800, textTransform: 'uppercase', color: '#64748b' }} 
                />
                <Area 
                  name="Tự đăng ký" 
                  type="monotone" 
                  dataKey="selfClaims" 
                  stroke="#007c76" 
                  strokeWidth={2.5}
                  fillOpacity={1} 
                  fill="url(#colorSelf)" 
                />
                <Area 
                  name="Mở thủ công" 
                  type="monotone" 
                  dataKey="manualUnlocks" 
                  stroke="#818cf8" 
                  strokeWidth={2.5}
                  fillOpacity={1} 
                  fill="url(#colorManual)" 
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* Quick Metrics panel */}
          <div className="flex flex-col justify-between gap-4 bg-gray-50/50 p-5 rounded-2xl border border-gray-100">
            <div className="space-y-4">
              <div>
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Tổng đăng ký tuần này</p>
                <h5 className="text-3xl font-black text-gray-800 tracking-tight mt-1">{totalWeeklyRegs} <span className="text-xs text-gray-400 font-bold uppercase tracking-wider">lượt</span></h5>
              </div>

              <div className="grid grid-cols-2 gap-3 border-t border-gray-100 pt-4">
                <div>
                  <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Tự đăng ký</p>
                  <p className="text-lg font-black text-[#007c76] mt-0.5">{totalSelfClaims}</p>
                </div>
                <div>
                  <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Mở thủ công</p>
                  <p className="text-lg font-black text-indigo-500 mt-0.5">{totalManualUnlocks}</p>
                </div>
              </div>
            </div>

            <div className="border-t border-gray-100 pt-4 space-y-1">
              <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Đăng ký hot nhất tuần</p>
              {hotCourse ? (
                <div className="flex items-center gap-2">
                  <span className="text-xs">🏆</span>
                  <p className="text-[11px] font-black text-gray-800 truncate" title={hotCourse}>{hotCourse}</p>
                </div>
              ) : (
                <p className="text-[10px] font-bold text-gray-400 italic">Chưa có lượt đăng ký</p>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* Left Column: Interactive Lookup Console */}
        <div className="lg:col-span-7 bg-white p-6 md:p-8 rounded-[32px] border border-gray-100 shadow-sm space-y-6">
          <div className="flex items-center gap-3 border-b border-gray-50 pb-4">
            <div className="w-10 h-10 rounded-xl bg-[#007c76]/5 flex items-center justify-center text-[#007c76]">
              <Search className="w-5 h-5" />
            </div>
            <div>
              <h4 className="font-extrabold text-gray-800 uppercase text-sm tracking-wide">Tra cứu nhanh theo Email</h4>
              <p className="text-[10px] text-gray-400 font-medium">Nhập email học viên để kiểm tra trạng thái đăng ký của họ</p>
            </div>
          </div>

          <form onSubmit={handleLookup} className="flex gap-3">
            <div className="relative flex-1">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-gray-400">
                <Mail className="w-4 h-4" />
              </div>
              <input 
                type="email" 
                value={searchEmail}
                onChange={(e) => setSearchEmail(e.target.value)}
                placeholder="nhap_email_hoc_vien@gmail.com"
                className="w-full pl-11 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-[#007c76]/20 focus:border-[#007c76] transition-all"
              />
            </div>
            <button
              type="submit"
              disabled={isSearching}
              className="bg-[#007c76] hover:bg-[#00605b] disabled:bg-gray-300 text-white px-6 rounded-2xl font-black text-xs uppercase tracking-widest hover:scale-[1.02] transition-all flex items-center gap-2 cursor-pointer disabled:cursor-not-allowed shrink-0"
            >
              {isSearching ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Tra cứu'}
            </button>
          </form>

          {/* Results Area */}
          {isSearching ? (
            <div className="py-20 flex flex-col items-center justify-center space-y-4">
              <Loader2 className="w-10 h-10 text-[#007c76] animate-spin" />
              <p className="text-xs font-black text-gray-400 uppercase tracking-widest">Đang tải hồ sơ từ Firestore...</p>
            </div>
          ) : searchTriggered && searchedUser ? (
            <div className="space-y-6">
              
              {/* User Account Info Details */}
              <div className="p-5 rounded-2xl bg-gray-50 border border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-[#007c76] text-white flex items-center justify-center font-black text-lg">
                    {searchedUser.displayName?.charAt(0) || 'U'}
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm font-black text-gray-800">{searchedUser.displayName}</p>
                    <p className="text-xs font-mono text-gray-500 font-bold">{searchedUser.email}</p>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  {searchedUser.isVip && <span className="bg-amber-100 border border-amber-200 text-amber-800 text-[9px] px-2.5 py-1 rounded-lg font-black uppercase">⭐ VIP</span>}
                  {searchedUser.isAdmin && <span className="bg-blue-100 border border-blue-200 text-blue-800 text-[9px] px-2.5 py-1 rounded-lg font-black uppercase">🛡️ Admin</span>}
                  {searchedUser.isTeacher && <span className="bg-indigo-100 border border-indigo-200 text-indigo-800 text-[9px] px-2.5 py-1 rounded-lg font-black uppercase">🎓 Giáo viên</span>}
                  {!searchedUser.isVip && !searchedUser.isAdmin && !searchedUser.isTeacher && <span className="bg-gray-100 border border-gray-200 text-gray-600 text-[9px] px-2.5 py-1 rounded-lg font-black uppercase">Học viên</span>}
                </div>
              </div>

              {/* Status Header Checklist */}
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 rounded-xl border border-gray-100 bg-white shadow-xs flex items-center gap-3">
                  {searchedUser.displayName !== 'Chưa có tài khoản' ? (
                    <>
                      <CheckCircle className="w-5 h-5 text-emerald-500 shrink-0" />
                      <div>
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-wider">Tài khoản</p>
                        <p className="text-xs font-bold text-gray-700">Đã kích hoạt trên hệ thống</p>
                      </div>
                    </>
                  ) : (
                    <>
                      <XCircle className="w-5 h-5 text-amber-500 shrink-0" />
                      <div>
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-wider">Tài khoản</p>
                        <p className="text-xs font-bold text-gray-700">Chưa tạo tài khoản</p>
                      </div>
                    </>
                  )}
                </div>

                <div className="p-4 rounded-xl border border-gray-100 bg-white shadow-xs flex items-center gap-3">
                  <Calendar className="w-5 h-5 text-gray-400 shrink-0" />
                  <div>
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-wider">Ngày tham gia</p>
                    <p className="text-xs font-bold text-gray-700">{searchedUser.createdAt ? formatDate(searchedUser.createdAt) : 'Chưa tham gia'}</p>
                  </div>
                </div>
              </div>

              {/* User Registered Courses List */}
              <div className="space-y-3">
                <h5 className="text-xs font-black text-gray-500 uppercase tracking-wider">Danh sách khóa học đã sở hữu ({searchedCourses?.length || 0})</h5>
                
                {searchedCourses && searchedCourses.length > 0 ? (
                  <div className="border border-gray-100 rounded-2xl overflow-hidden bg-white">
                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="border-b border-gray-100 text-[10px] font-black text-gray-400 uppercase tracking-wider bg-gray-50/50">
                            <th className="py-3 px-4">Tên khóa học</th>
                            <th className="py-3 px-4">Cách thức mở</th>
                            <th className="py-3 px-4">Tiến độ</th>
                            <th className="py-3 px-4 text-right">Ngày nhận</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                          {searchedCourses.map((c) => (
                            <tr key={c.courseId} className="hover:bg-gray-50/50 transition-all">
                              <td className="py-4 px-4">
                                <div className="space-y-1">
                                  <p className="text-xs font-black text-gray-800 leading-snug">{c.courseTitle}</p>
                                  <p className="font-mono text-[9px] text-gray-400 uppercase font-semibold">{c.courseId}</p>
                                </div>
                              </td>
                              <td className="py-4 px-4 whitespace-nowrap">
                                {getClaimBadge(c.claimedVia || '')}
                              </td>
                              <td className="py-4 px-4">
                                <div className="flex items-center gap-2">
                                  <div className="w-16 bg-gray-100 rounded-full h-1.5 overflow-hidden">
                                    <div className="bg-[#007c76] h-full rounded-full" style={{ width: `${c.progress}%` }}></div>
                                  </div>
                                  <span className="text-[10px] font-black text-gray-700">{c.progress}%</span>
                                </div>
                              </td>
                              <td className="py-4 px-4 text-right whitespace-nowrap">
                                <span className="text-[11px] font-bold text-gray-600">{formatDate(c.unlockedAt || c.purchasedAt || '')}</span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ) : (
                  <div className="py-12 text-center border border-dashed border-gray-100 rounded-2xl bg-gray-50/20">
                    <p className="text-xs font-bold text-gray-400">Học viên chưa đăng ký hoặc chưa mở khóa bất kỳ khóa học nào.</p>
                  </div>
                )}
              </div>

            </div>
          ) : (
            <div className="py-24 text-center border-2 border-dashed border-gray-100 rounded-[32px] flex flex-col items-center justify-center space-y-3">
              <div className="w-12 h-12 rounded-full bg-gray-50 flex items-center justify-center text-gray-400">
                <HelpCircle className="w-6 h-6" />
              </div>
              <div>
                <p className="text-sm font-extrabold text-gray-700">Chưa bắt đầu tra cứu</p>
                <p className="text-xs font-medium text-gray-400 max-w-sm mx-auto mt-1">Hãy nhập email học viên ở ô trên để xem ngay chi tiết thông tin đăng ký của họ và hồ sơ tiến độ học tập trên đám mây.</p>
              </div>
            </div>
          )}

        </div>

        {/* Right Column: Live Course Registration Notices Feed */}
        <div className="lg:col-span-5 bg-white p-6 md:p-8 rounded-[32px] border border-gray-100 shadow-sm space-y-6">
          <div className="flex items-center justify-between border-b border-gray-50 pb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center text-amber-600">
                <Bell className="w-5 h-5 animate-pulse" />
              </div>
              <div>
                <h4 className="font-extrabold text-gray-800 uppercase text-sm tracking-wide">Thông báo đăng ký Live</h4>
                <p className="text-[10px] text-gray-400 font-medium">Báo động thời gian thực học viên mua/claim khóa học</p>
              </div>
            </div>
            <span className="bg-amber-100 text-amber-800 text-[10px] px-2.5 py-1 rounded-lg font-black uppercase tracking-wider">Hệ thống</span>
          </div>

          {isLoadingNotices ? (
            <div className="py-16 flex flex-col items-center justify-center space-y-3">
              <Loader2 className="w-8 h-8 text-amber-600 animate-spin" />
              <p className="text-xs font-black text-gray-400 uppercase tracking-widest">Đang tải luồng sự kiện...</p>
            </div>
          ) : liveNotices.length > 0 ? (
            <div className="space-y-3.5 max-h-[550px] overflow-y-auto pr-1 custom-scrollbar">
              {liveNotices.map((notice) => (
                <div 
                  key={notice.id} 
                  onClick={() => handleQuickLookup(notice.studentEmail)}
                  className="p-4 rounded-2xl border border-gray-50 bg-gray-50/40 hover:bg-[#007c76]/5 hover:border-[#007c76]/20 transition-all cursor-pointer group flex items-start gap-3.5"
                >
                  <div className="w-8 h-8 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center text-xs shrink-0 font-black">
                    🔔
                  </div>
                  <div className="space-y-1 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-xs font-extrabold text-gray-800 group-hover:text-[#007c76] transition-colors break-all pr-2">
                        {notice.studentEmail}
                      </p>
                      <span className="text-[9px] text-gray-400 font-bold whitespace-nowrap">
                        {formatTimeAgo(notice.registeredAt)}
                      </span>
                    </div>
                    <p className="text-[11px] text-gray-600 font-bold leading-relaxed">
                      Đã đăng ký khóa học: <span className="text-gray-900 font-black">"{notice.courseTitle}"</span>
                    </p>
                    <div className="flex items-center gap-2 mt-1.5 pt-1.5 border-t border-gray-100/50">
                      <span className="text-[9px] font-mono bg-white border border-gray-100 text-gray-400 px-1.5 py-0.5 rounded">
                        Mã: {notice.courseId}
                      </span>
                      {getClaimBadge(notice.type)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-24 text-center border border-dashed border-gray-100 rounded-2xl">
              <p className="text-gray-400 font-bold text-xs">Chưa ghi nhận đăng ký khóa học nào trên Cloud.</p>
            </div>
          )}

        </div>

      </div>
    </div>
  );
};

// Simple utility for friendly date representation inside cards
function formatTimeAgo(isoString: string): string {
  try {
    const diff = Date.now() - new Date(isoString).getTime();
    const minutes = Math.floor(diff / 60000);
    if (minutes < 1) return 'Vừa xong';
    if (minutes < 60) return `${minutes} phút trước`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours} giờ trước`;
    const days = Math.floor(hours / 24);
    if (days < 30) return `${days} ngày trước`;
    return new Date(isoString).toLocaleDateString('vi-VN');
  } catch (e) {
    return 'Gần đây';
  }
}
