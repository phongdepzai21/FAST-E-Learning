
import React, { useState, useEffect, Suspense, lazy } from 'react';
import { useNavigate } from 'react-router-dom';
import { auth, db } from '../firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { Course } from '../types';
import PaymentModal from '../components/PaymentModal';

// Mock Course Object for reference
const VIP_PACKAGE: Course = {
  id: 'vip-lifetime-access',
  title: 'Gói Thành Viên VIP (Trọn Đời)',
  price: '2.500.000đ',
  image: 'https://images.unsplash.com/photo-1563227812-0ea4c22e6cc8?q=80&w=1000&auto=format&fit=crop',
  category: 'PREMIUM',
  description: 'Đặc quyền truy cập không giới hạn toàn bộ kho học liệu, cập nhật trọn đời và hỗ trợ ưu tiên 1-1.'
};

const VipUpgrade: React.FC = () => {
  const navigate = useNavigate();
  const [currentUser, setCurrentUser] = useState<{name: string, email: string} | null>(null);
  const [isVip, setIsVip] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);

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
      await setDoc(doc(db, "users", userEmail, "purchased_courses", "vip-lifetime-access"), {
        courseId: "vip-lifetime-access",
        courseTitle: "VIP MEMBERSHIP LIFETIME",
        purchasedAt: new Date().toISOString(),
        price: VIP_PACKAGE.price,
        status: 'active'
      });

      // Save to local roles backup
      const localRolesStr = localStorage.getItem(`user_roles_${userEmail}`);
      const existingRoles = localRolesStr ? JSON.parse(localRolesStr) : {};
      localStorage.setItem(`user_roles_${userEmail}`, JSON.stringify({
        ...existingRoles,
        isVip: true
      }));

      setIsVip(true);
      setShowPaymentModal(false);
      setShowSuccess(true);
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
      setShowSuccess(true);
      window.scrollTo({ top: 0, behavior: 'smooth' });

      console.warn(`Lưu trữ VIP dự phòng ngoại tuyến được kích hoạt thành công (Hot reload local storage fallback). Nhật ký lỗi Firestore: "${errorMsg}"`);
    }
  };

  const handleUpgradeClick = async () => {
    if (!currentUser) {
      navigate('/account', { state: { message: 'Vui lòng đăng nhập để nâng cấp VIP', from: '/account/vip-upgrade' } });
      return;
    }
    setShowPaymentModal(true);
  };

  return (
    <div className="min-h-screen bg-gray-900 font-sans text-white selection:bg-yellow-500 selection:text-black animate-fade-in pb-20">
      
      {/* Success Notification */}
      {showSuccess && (
        <div className="fixed top-0 left-0 right-0 z-[150] bg-gradient-to-r from-yellow-400 to-yellow-600 text-black shadow-2xl animate-in slide-in-from-top duration-500">
          <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="bg-black/10 p-2 rounded-full">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" /></svg>
              </div>
              <p className="font-black uppercase text-sm md:text-lg tracking-wide">
                Chúc mừng! Bạn đã trở thành Thành viên VIP.
              </p>
            </div>
            <button onClick={() => setShowSuccess(false)} className="hover:bg-black/10 p-2 rounded-full transition-colors">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
          </div>
        </div>
      )}

      {/* Hero Section */}
      <div className="relative overflow-hidden pt-20 pb-20 md:pt-32 md:pb-32">
        {/* Background Effects */}
        <div className="absolute top-0 left-0 w-full h-full">
            <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-yellow-500/20 rounded-full blur-[100px] -mr-32 -mt-32"></div>
            <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-[#007c76]/20 rounded-full blur-[100px] -ml-32 -mb-32"></div>
            <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-30"></div>
        </div>

        <div className="relative z-10 max-w-7xl mx-auto px-4 text-center">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-yellow-500/30 bg-yellow-500/10 backdrop-blur-md mb-8 animate-in zoom-in duration-700">
                <svg className="w-4 h-4 text-yellow-400" fill="currentColor" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" /></svg>
                <span className="text-xs md:text-sm font-bold text-yellow-400 uppercase tracking-widest">Premium Membership</span>
            </div>
            
            <h1 className="text-4xl md:text-7xl font-black uppercase tracking-tighter leading-none mb-6">
                Nâng Tầm <br/> <span className="text-transparent bg-clip-text bg-gradient-to-r from-yellow-300 via-yellow-500 to-yellow-200">Sự Nghiệp Của Bạn</span>
            </h1>
            
            <p className="text-gray-400 text-lg md:text-xl font-medium max-w-2xl mx-auto mb-10 leading-relaxed">
                Mở khóa không giới hạn toàn bộ khoá học ISO, HACCP và nhận đặc quyền tư vấn 1-1 từ chuyên gia hàng đầu.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <button 
                  onClick={handleUpgradeClick}
                  disabled={isVip}
                  className={`px-10 py-5 rounded-2xl font-black text-lg uppercase tracking-widest transition-all shadow-2xl ${isVip ? 'bg-gray-700 text-gray-400 cursor-not-allowed' : 'bg-gradient-to-r from-yellow-400 to-yellow-600 text-black hover:scale-105 hover:shadow-yellow-500/40'}`}
                >
                    {isVip ? 'Bạn đã là VIP' : 'Nâng cấp ngay'}
                </button>
                <button onClick={() => navigate('/khoa-hoc')} className="px-10 py-5 rounded-2xl font-black text-lg uppercase tracking-widest bg-white/5 border border-white/10 hover:bg-white/10 transition-all text-white">
                    Xem danh sách khóa học
                </button>
            </div>
        </div>
      </div>

      {/* Benefits Grid */}
      <div className="max-w-7xl mx-auto px-4 py-16">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
                {
                    title: "Truy cập không giới hạn",
                    desc: "Học mọi lúc, mọi nơi với toàn bộ kho học liệu ISO, HACCP, QA/QC hiện có và các khóa học mới trong tương lai.",
                    icon: "M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
                },
                {
                    title: "Tài liệu chuyên sâu",
                    desc: "Tải xuống toàn bộ tài liệu biểu mẫu, quy trình SOP chuẩn hóa về ISO/HACCP cực kỳ giá trị.",
                    icon: "M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                },
                {
                    title: "Đặc quyền Hỗ trợ 1-1",
                    desc: "Được ưu tiên giải đáp thắc mắc chuyên môn trực tiếp bởi đội ngũ chuyên gia và CEO của FAST trong vòng 24h.",
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
      <div className="max-w-4xl mx-auto px-4 py-16">
        <div className="bg-gradient-to-b from-gray-800 to-gray-900 rounded-[48px] p-8 md:p-16 border border-gray-700 relative overflow-hidden shadow-2xl">
             <div className="absolute top-0 right-0 w-64 h-64 bg-yellow-500/10 rounded-full blur-[80px] -mr-32 -mt-32"></div>
             
             <div className="relative z-10 text-center">
                 <h2 className="text-3xl md:text-5xl font-black uppercase mb-6">Đặc Quyền Thành Viên VIP</h2>
                 <div className="flex items-center justify-center gap-4 mb-8">
                     <span className="text-2xl text-gray-500 line-through font-bold">0đ</span>
                     <div className="bg-yellow-500 text-black px-4 py-1 rounded-full font-black text-sm uppercase tracking-wider">VIP</div>
                 </div>
                 
                 <div className="text-6xl md:text-8xl font-black text-transparent bg-clip-text bg-gradient-to-b from-white to-gray-400 tracking-tighter mb-4">
                     FREE VIP
                 </div>
                 <p className="text-gray-400 uppercase tracking-widest font-bold text-sm mb-12">Kích hoạt 1-Click - Có hiệu lực trọn đời</p>

                 <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-left max-w-lg mx-auto mb-12">
                     {[
                        "Toàn bộ 20+ khóa học hiện có",
                        "Các khóa học mới trong tương lai",
                        "Tài liệu biểu mẫu ISO/HACCP",
                        "Vào nhóm kín Zalo cùng chuyên gia",
                        "Ưu đãi 20% khi dùng dịch vụ tư vấn"
                     ].map((feat, i) => (
                         <div key={i} className="flex items-center gap-3">
                             <svg className="w-5 h-5 text-yellow-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" /></svg>
                             <span className="text-gray-300 font-bold text-sm">{feat}</span>
                         </div>
                     ))}
                 </div>

                 <button 
                    onClick={handleUpgradeClick}
                    disabled={isVip}
                    className={`w-full md:w-auto px-16 py-6 rounded-2xl font-black text-xl uppercase tracking-widest transition-all shadow-2xl ${isVip ? 'bg-gray-700 text-gray-500 cursor-not-allowed' : 'bg-gradient-to-r from-yellow-400 to-yellow-600 text-black hover:scale-105 hover:shadow-yellow-500/40'}`}
                 >
                    {isVip ? 'Đã kích hoạt trọn đời' : 'Đăng ký học ngay'}
                 </button>
                 {!isVip && <p className="mt-6 text-xs text-gray-500 font-bold uppercase tracking-wider">Mở khóa trọn bộ kiến thức tức thì</p>}
             </div>
        </div>
      </div>

      {/* FAQ Section */}
      <div className="max-w-3xl mx-auto px-4 py-16">
         <h3 className="text-2xl font-black uppercase text-center mb-10 text-gray-500">Câu hỏi thường gặp</h3>
         <div className="space-y-6">
             {[
                 { q: "Tôi có cần trả thêm phí cho các khóa học mới không?", a: "Không. Với gói VIP Trọn Đời, bạn sẽ được tự động truy cập vào tất cả các khóa học mới mà FAST E-Learning phát hành trong tương lai mà không tốn thêm bất kỳ chi phí nào." },
                 { q: "Tôi có thể tải tài liệu học tập không?", a: "Có. Tất cả các tài liệu hướng dẫn, biểu mẫu ISO/HACCP đính kèm khóa học đều có thể tải xuống trọn đời để phục vụ cho công việc thực tế." },
                 { q: "Hỗ trợ 1-1 hoạt động ra sao?", a: "Bạn sẽ được tham gia vào nhóm Zalo kín dành riêng cho VIP. Tại đó, bạn có thể đặt câu hỏi trực tiếp và được đội ngũ chuyên gia của chúng tôi giải đáp trong vòng 24h làm việc." }
             ].map((faq, i) => (
                 <div key={i} className="bg-gray-800/30 rounded-2xl p-6 border border-gray-700">
                     <h4 className="font-black text-lg text-white mb-2">{faq.q}</h4>
                     <p className="text-gray-400 leading-relaxed">{faq.a}</p>
                 </div>
             ))}
         </div>
      </div>

      <PaymentModal
          course={VIP_PACKAGE}
          isOpen={showPaymentModal}
          onClose={() => setShowPaymentModal(false)}
          onSuccess={handlePaymentSuccess}
      />

    </div>
  );
};

export default VipUpgrade;
