
import React, { useState, useEffect, Suspense, lazy } from 'react';
import { useNavigate } from 'react-router-dom';
import { auth, db } from '../firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, setDoc, getDoc, onSnapshot } from 'firebase/firestore';
import { Course } from '../types';
import { COURSES, getMergedCourses } from '../constants';
import PaymentModal from '../components/PaymentModal';
import PurchaseModal from '../components/PurchaseModal';
import { useToast } from '../contexts/ToastContext';
import { Lock, ShieldAlert, Sparkles, CheckCircle2, AlertTriangle } from 'lucide-react';

// VIP Package Definition - Combo VIP Trọn Đời
const VIP_PACKAGE: Course = {
  id: 'khoa-vip',
  title: 'Gói Combo VIP (Toàn Bộ Khóa Học)',
  price: '2.500.000đ',
  image: 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&q=80&w=800',
  category: 'Gói VIP',
  description: 'Đặc quyền Gói Combo VIP trọn đời: Sở hữu toàn bộ kho học liệu ISO, HACCP, QA/QC, Lean, bộ tài liệu biểu mẫu SOP chuẩn hóa và cập nhật tất cả khóa học mới trọn đời.'
};

const VipUpgrade: React.FC = () => {
  const navigate = useNavigate();
  const { success } = useToast();
  const [currentUser, setCurrentUser] = useState<{name: string, email: string} | null>(null);
  const [isVip, setIsVip] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showPurchaseModal, setShowPurchaseModal] = useState(false);

  // VIP Course sync state
  const [vipCourse, setVipCourse] = useState<Course>(() => {
    const list = getMergedCourses([]);
    const found = list.find(c => c.id === 'khoa-vip');
    return found || VIP_PACKAGE;
  });

  // Check if VIP combo is inactive or draft (hidden by teacher/admin)
  const isVipHiddenOrInactive = vipCourse.status === 'draft' || vipCourse.status === 'inactive';

  useEffect(() => {
    const syncVipCourse = () => {
      const list = getMergedCourses([]);
      const found = list.find(c => c.id === 'khoa-vip');
      if (found) {
        setVipCourse(found);
      }
    };
    syncVipCourse();

    const unsubDoc = onSnapshot(doc(db, 'courses', 'khoa-vip'), (snap) => {
      if (snap.exists()) {
        const data = snap.data() as Course;
        setVipCourse(prev => ({
          ...prev,
          ...data,
          id: 'khoa-vip'
        }));
      }
    }, () => {});

    window.addEventListener('courses_updated', syncVipCourse);
    window.addEventListener('storage', syncVipCourse);

    return () => {
      unsubDoc();
      window.removeEventListener('courses_updated', syncVipCourse);
      window.removeEventListener('storage', syncVipCourse);
    };
  }, []);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user && user.email) {
        setCurrentUser({
          name: user.displayName || 'Học viên',
          email: user.email
        });

        // Check VIP status from Firestore
        // CRITICAL FIX: Normalize email to lowercase for consistent reads
        const userEmail = user.email.toLowerCase();

        const localRolesStr = localStorage.getItem(`user_roles_${userEmail}`);
        if (localRolesStr) {
          try {
            const localRoles = JSON.parse(localRolesStr);
            if (localRoles.isVip) {
              setIsVip(true);
            }
          } catch (e) {}
        }

        try {
          const userDoc = await getDoc(doc(db, "users", userEmail));
          if (userDoc.exists() && (userDoc.data() as any).isVip) {
            setIsVip(true);
            
            // Sync to local roles backup
            const existingRoles = localRolesStr ? JSON.parse(localRolesStr) : {};
            localStorage.setItem(`user_roles_${userEmail}`, JSON.stringify({
              ...existingRoles,
              isVip: true
            }));
          }
        } catch (error) {
          console.error("Error checking VIP status", error);
        }
      } else {
        setCurrentUser(null);
      }
    });
    return () => unsubscribe();
  }, []);

  const handlePaymentSuccess = async () => {
    if (!currentUser) return;
    const userEmail = currentUser.email.toLowerCase();
    
    try {
      // 1. Update User Profile to VIP
      await setDoc(doc(db, "users", userEmail), {
        isVip: true,
        vipSince: new Date().toISOString()
      }, { merge: true });

      // 2. Record Transaction
      await setDoc(doc(db, "users", userEmail, "purchased_courses", "khoa-vip"), {
        courseId: "khoa-vip",
        courseTitle: vipCourse.title || "Gói Combo VIP (Toàn Bộ Khóa Học)",
        purchasedAt: new Date().toISOString(),
        price: vipCourse.price || "2.500.000đ",
        status: 'active'
      });
      localStorage.setItem('course_unlocked_khoa-vip', 'true');
      localStorage.setItem('course_unlocked_vip-lifetime-access', 'true');

      // Save to local roles backup
      const localRolesStr = localStorage.getItem(`user_roles_${userEmail}`);
      const existingRoles = localRolesStr ? JSON.parse(localRolesStr) : {};
      localStorage.setItem(`user_roles_${userEmail}`, JSON.stringify({
        ...existingRoles,
        isVip: true
      }));

      setIsVip(true);
      setShowPaymentModal(false);
      success('Chúc mừng! Bạn đã trở thành Thành viên VIP.', 5000, 'Thành công');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (error: any) {
      console.error("Error activating VIP in Firestore:", error);
      const errorMsg = error instanceof Error ? error.message : String(error);

      // Save locally to keep the user unblocked
      const localRolesStr = localStorage.getItem(`user_roles_${userEmail}`);
      const existingRoles = localRolesStr ? JSON.parse(localRolesStr) : {};
      localStorage.setItem(`user_roles_${userEmail}`, JSON.stringify({
        ...existingRoles,
        isVip: true
      }));

      setIsVip(true);
      setShowPaymentModal(false);
      success('Kích hoạt dự phòng gói VIP ngoại tuyến thành công!', 5000, 'Thành công');
      window.scrollTo({ top: 0, behavior: 'smooth' });

      console.warn(`Lưu trữ VIP dự phòng ngoại tuyến được kích hoạt thành công (Hot reload local storage fallback). Nhật ký lỗi Firestore: "${errorMsg}"`);
    }
  };

  const handleUpgradeClick = async () => {
    if (isVipHiddenOrInactive) {
      return;
    }
    if (!currentUser) {
      navigate('/account', { state: { message: 'Vui lòng đăng nhập để nâng cấp VIP', from: '/account/vip-upgrade' } });
      return;
    }
    setShowPurchaseModal(true);
  };

  return (
    <div className="min-h-screen bg-gray-900 font-sans text-white selection:bg-yellow-500 selection:text-black animate-fade-in pb-20">
      
      {/* Hero Section */}
      <div className="relative overflow-hidden pt-16 pb-16 md:pt-24 md:pb-24">
        {/* Background Effects */}
        <div className="absolute top-0 left-0 w-full h-full pointer-events-none">
            <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-yellow-500/20 rounded-full blur-[100px] -mr-32 -mt-32"></div>
            <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-[#007c76]/20 rounded-full blur-[100px] -ml-32 -mb-32"></div>
            <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-30"></div>
        </div>

        <div className="relative z-10 max-w-7xl mx-auto px-4 text-center">
            
            {/* VIP Locked / Inactive System Banner */}
            {isVipHiddenOrInactive && (
              <div className="max-w-3xl mx-auto mb-10 text-left">
                <div className="bg-amber-950/60 border-2 border-amber-500/50 rounded-3xl p-6 sm:p-8 backdrop-blur-md flex flex-col sm:flex-row items-center gap-5 shadow-2xl shadow-amber-500/10">
                  <div className="w-16 h-16 rounded-2xl bg-amber-500/20 text-amber-400 flex items-center justify-center shrink-0 border border-amber-500/30">
                    <Lock className="w-8 h-8" />
                  </div>
                  <div className="flex-1 text-center sm:text-left">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/20 text-amber-300 text-[11px] font-black uppercase tracking-wider mb-2">
                      <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse"></span>
                      Trạng thái Gói VIP
                    </div>
                    <h3 className="text-xl sm:text-2xl font-black text-white uppercase tracking-tight">
                      Gói VIP không hoạt động hoặc đã bị khóa
                    </h3>
                    <p className="text-gray-300 text-sm mt-2 leading-relaxed font-medium">
                      Lưu ý: <strong className="text-yellow-400">Gói VIP là combo trọn bộ toàn bộ các khóa học</strong> (bao gồm toàn bộ bài giảng, tài liệu SOP và cập nhật trọn đời), <span className="underline">không phải là 1 khóa học đơn lẻ</span>. Hiện tại gói Combo VIP này đang tạm ẩn / tạm ngừng hoạt động hoặc đã bị khóa bởi người quản trị.
                    </p>
                    {isVip && (
                      <p className="text-emerald-400 text-xs font-bold mt-2.5 flex items-center gap-1.5 justify-center sm:justify-start">
                        <CheckCircle2 className="w-4 h-4" />
                        Tài khoản của bạn đã là Thành viên VIP từ trước và vẫn được bảo lưu toàn bộ đặc quyền.
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )}

            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-yellow-500/30 bg-yellow-500/10 backdrop-blur-md mb-8 animate-in zoom-in duration-700">
                <Sparkles className="w-4 h-4 text-yellow-400" />
                <span className="text-xs md:text-sm font-bold text-yellow-400 uppercase tracking-widest">
                  {isVipHiddenOrInactive ? 'Gói Combo VIP Tạm Khóa' : 'Combo VIP Trọn Bộ Toàn Bộ Khóa Học'}
                </span>
            </div>
            
            <h1 className="text-4xl md:text-7xl font-black uppercase tracking-tighter leading-none mb-6">
                Nâng Tầm <br/> <span className="text-transparent bg-clip-text bg-gradient-to-r from-yellow-300 via-yellow-500 to-yellow-200">Sự Nghiệp Của Bạn</span>
            </h1>
            
            <p className="text-gray-400 text-lg md:text-xl font-medium max-w-2xl mx-auto mb-10 leading-relaxed">
                {isVipHiddenOrInactive 
                  ? 'Gói Combo VIP (Toàn bộ khóa học) hiện đang tạm ngừng kích hoạt hoặc đã bị khóa bởi người quản trị. Bạn có thể tham gia các khóa học lẻ.'
                  : 'Sở hữu trọn bộ combo toàn bộ các khóa học ISO, HACCP, QA/QC, Lean và nhận đặc quyền tư vấn 1-1 trọn đời.'
                }
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                {isVipHiddenOrInactive ? (
                  <button 
                    disabled={true}
                    className="px-10 py-5 rounded-2xl font-black text-sm md:text-base uppercase tracking-widest transition-all bg-gray-800/90 text-gray-400 border border-gray-700 cursor-not-allowed flex items-center justify-center gap-2.5 shadow-inner"
                  >
                    <Lock className="w-5 h-5 text-amber-400" />
                    <span>Gói VIP không hoạt động / Đã bị khóa</span>
                  </button>
                ) : (
                  <button 
                    onClick={handleUpgradeClick}
                    disabled={isVip}
                    className={`px-10 py-5 rounded-2xl font-black text-lg uppercase tracking-widest transition-all shadow-2xl ${isVip ? 'bg-gray-700 text-gray-400 cursor-not-allowed' : 'bg-gradient-to-r from-yellow-400 to-yellow-600 text-black hover:scale-105 hover:shadow-yellow-500/40 cursor-pointer'}`}
                  >
                      {isVip ? 'Bạn đã là VIP' : 'Nâng cấp Combo VIP - 2.5tr'}
                  </button>
                )}
                <button onClick={() => navigate('/khoa-hoc')} className="px-10 py-5 rounded-2xl font-black text-lg uppercase tracking-widest bg-white/5 border border-white/10 hover:bg-white/10 transition-all text-white cursor-pointer">
                    Xem danh sách khóa học
                </button>
            </div>
        </div>
      </div>

      {/* Benefits Grid */}
      <div className="max-w-7xl mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
                {
                    title: "Combo Trọn Bộ Tất Cả Khóa Học",
                    desc: "Học mọi lúc, mọi nơi với toàn bộ kho học liệu ISO, HACCP, QA/QC hiện có và tất cả các khóa học mới phát hành trong tương lai.",
                    icon: "M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
                },
                {
                    title: "Tài liệu biểu mẫu chuyên sâu",
                    desc: "Tải xuống không giới hạn toàn bộ tài liệu biểu mẫu, quy trình SOP chuẩn hóa về ISO/HACCP cực kỳ giá trị.",
                    icon: "M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                },
                {
                    title: "Đặc quyền Hỗ trợ 1-1",
                    desc: "Được ưu tiên giải đáp thắc mắc chuyên môn trực tiếp bởi đội ngũ chuyên gia và ban cố vấn của FAST trong vòng 24h.",
                    icon: "M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                }
            ].map((item, idx) => (
                <div key={idx} className="bg-gray-800/50 backdrop-blur-md p-8 rounded-[32px] border border-gray-700 hover:border-yellow-500/50 transition-colors group">
                    <div className="w-16 h-16 bg-yellow-500/10 rounded-2xl flex items-center justify-center mb-6 group-hover:bg-yellow-500 group-hover:text-black transition-all text-yellow-500">
                        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d={item.icon} /></svg>
                    </div>
                    <h3 className="text-xl font-black uppercase mb-3 text-white">{item.title}</h3>
                    <p className="text-gray-400 font-medium leading-relaxed">{item.desc}</p>
                </div>
            ))}
        </div>
      </div>

      {/* Pricing Section */}
      <div className="max-w-4xl mx-auto px-4 py-12">
        <div className="bg-gradient-to-b from-gray-800 to-gray-900 rounded-[48px] p-8 md:p-16 border border-gray-700 relative overflow-hidden shadow-2xl">
             <div className="absolute top-0 right-0 w-64 h-64 bg-yellow-500/10 rounded-full blur-[80px] -mr-32 -mt-32"></div>
             
             <div className="relative z-10 text-center">
                 <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-yellow-500/10 border border-yellow-500/30 text-yellow-400 text-xs font-black uppercase tracking-wider mb-4">
                    <span>⭐</span> GÓI COMBO TOÀN BỘ KHÓA HỌC (KHÔNG PHẢI 1 KHÓA)
                 </div>

                 <h2 className="text-3xl md:text-5xl font-black uppercase mb-6">Đặc Quyền Thành Viên VIP</h2>
                 
                 <div className="flex items-center justify-center gap-4 mb-4">
                     <span className="text-2xl text-gray-500 line-through font-bold">5.000.000đ</span>
                     <div className="bg-yellow-500 text-black px-4 py-1 rounded-full font-black text-sm uppercase tracking-wider">ƯU ĐÃI COMBO 50%</div>
                 </div>
                 
                 <div className="text-6xl md:text-8xl font-black text-transparent bg-clip-text bg-gradient-to-b from-white to-gray-300 tracking-tighter mb-2">
                     2.500.000đ
                 </div>
                 <p className="text-yellow-400/90 uppercase tracking-widest font-black text-sm mb-4">
                     (2.5 triệu VNĐ - Thanh toán 1 lần duy nhất, sở hữu trọn đời)
                 </p>

                 {/* Clarification Box that VIP is a full COMBO, not a single course */}
                 <div className="bg-gray-800/80 border border-yellow-500/20 rounded-2xl p-4 max-w-lg mx-auto mb-10 text-left">
                    <p className="text-yellow-300 text-xs font-bold leading-relaxed flex items-start gap-2">
                      <span className="text-base leading-none">💡</span>
                      <span>
                        <strong>Khóa VIP là gói Combo toàn diện:</strong> Khi kích hoạt gói này, bạn được mở khóa toàn bộ tất cả khóa học ISO, HACCP, Lean... và tự động cập nhật mọi khóa học mới sau này mà không phải mua từng khóa lẻ.
                      </span>
                    </p>
                 </div>

                 <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-left max-w-lg mx-auto mb-12">
                     {[
                        "Toàn bộ 20+ khóa học hiện có trong hệ thống",
                        "Tự động mở khóa tất cả các khóa học mới",
                        "Kho tài liệu biểu mẫu quy trình ISO/HACCP",
                        "Hỗ trợ giải đáp chuyên môn trực tiếp từ chuyên gia",
                        "Ưu đãi 20% khi dùng dịch vụ tư vấn doanh nghiệp"
                     ].map((feat, i) => (
                         <div key={i} className="flex items-center gap-3">
                             <svg className="w-5 h-5 text-yellow-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" /></svg>
                             <span className="text-gray-300 font-bold text-sm">{feat}</span>
                         </div>
                     ))}
                 </div>

                 {isVipHiddenOrInactive ? (
                   <div className="space-y-4">
                     <button 
                        disabled={true}
                        className="w-full md:w-auto px-12 py-6 rounded-2xl font-black text-base md:text-lg uppercase tracking-widest transition-all bg-gray-800 text-gray-400 border border-gray-700 cursor-not-allowed flex items-center justify-center gap-3 mx-auto shadow-inner"
                     >
                        <Lock className="w-6 h-6 text-amber-400" />
                        <span>Gói VIP không hoạt động hoặc đã bị khóa</span>
                     </button>
                     <p className="text-xs text-amber-400/90 font-bold uppercase tracking-wider max-w-md mx-auto">
                        Gói Combo VIP hiện đang tạm khóa hoặc không hoạt động. Vui lòng quay lại sau hoặc liên hệ bộ phận hỗ trợ.
                     </p>
                   </div>
                 ) : (
                   <>
                     <button 
                        onClick={handleUpgradeClick}
                        disabled={isVip}
                        className={`w-full md:w-auto px-16 py-6 rounded-2xl font-black text-xl uppercase tracking-widest transition-all shadow-2xl ${isVip ? 'bg-gray-700 text-gray-500 cursor-not-allowed' : 'bg-gradient-to-r from-yellow-400 to-yellow-600 text-black hover:scale-105 hover:shadow-yellow-500/40 cursor-pointer'}`}
                     >
                        {isVip ? 'Đã kích hoạt trọn đời' : 'Đăng ký Combo VIP - 2.500.000đ'}
                     </button>
                     {!isVip && <p className="mt-6 text-xs text-gray-500 font-bold uppercase tracking-wider">Mở khóa trọn bộ kiến thức tức thì</p>}
                   </>
                 )}
             </div>
        </div>
      </div>

      {/* FAQ Section */}
      <div className="max-w-3xl mx-auto px-4 py-12">
         <h3 className="text-2xl font-black uppercase text-center mb-10 text-gray-500">Câu hỏi thường gặp</h3>
         <div className="space-y-6">
             {[
                 { 
                   q: "Khóa VIP là 1 khóa học hay gói combo nhiều khóa?", 
                   a: "Khóa VIP là một gói Combo đặc quyền trọn bộ. Khi đăng ký gói VIP (2.500.000đ), bạn sẽ được sở hữu toàn bộ các khóa học hiện có trên nền tảng (ISO, HACCP, QA/QC, Lean, Quản trị...) và bất kỳ khóa học nào ra mắt trong tương lai mà không cần trả thêm phí." 
                 },
                 { 
                   q: "Tôi có cần trả thêm phí cho các khóa học mới không?", 
                   a: "Không. Với gói VIP Trọn Đời, bạn sẽ được tự động truy cập vào tất cả các khóa học mới mà FAST E-Learning phát hành trong tương lai mà không tốn thêm bất kỳ chi phí nào." 
                 },
                 { 
                   q: "Tôi có thể tải tài liệu học tập không?", 
                   a: "Có. Tất cả các tài liệu hướng dẫn, biểu mẫu ISO/HACCP đính kèm khóa học đều có thể tải xuống trọn đời để phục vụ cho công việc thực tế." 
                 },
                 { 
                   q: "Hỗ trợ 1-1 hoạt động ra sao?", 
                   a: "Bạn sẽ được kết nối trực tiếp với đội ngũ chuyên gia đào tạo của chúng tôi để được giải đáp thắc mắc chuyên môn trong vòng 24h làm việc." 
                 }
             ].map((faq, i) => (
                 <div key={i} className="bg-gray-800/30 rounded-2xl p-6 border border-gray-700">
                     <h4 className="font-black text-lg text-white mb-2">{faq.q}</h4>
                     <p className="text-gray-400 leading-relaxed">{faq.a}</p>
                 </div>
             ))}
         </div>
      </div>

      <PurchaseModal
          isOpen={showPurchaseModal}
          onClose={() => setShowPurchaseModal(false)}
          onSuccess={() => {
              setShowPurchaseModal(false);
              setShowPaymentModal(true);
          }}
          userEmail={currentUser?.email || ''}
          userName={currentUser?.name || ''}
          courseName={vipCourse.title || VIP_PACKAGE.title}
      />
      <PaymentModal
          course={vipCourse}
          isOpen={showPaymentModal}
          onClose={() => setShowPaymentModal(false)}
          onSuccess={handlePaymentSuccess}
      />

    </div>
  );
};

export default VipUpgrade;
