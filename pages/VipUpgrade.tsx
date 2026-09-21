import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { auth, db } from '../firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, setDoc, getDoc, getDocs, collection, onSnapshot } from 'firebase/firestore';
import { Course } from '../types';
import { getMergedCourses } from '../constants';
import PaymentModal from '../components/PaymentModal';
import PurchaseModal from '../components/PurchaseModal';
import { useToast } from '../contexts/ToastContext';
import { Lock, Sparkles, CheckCircle2, ChevronRight, Check, Award, Crown, Shield } from 'lucide-react';

interface Combo {
  id: string;
  title: string;
  price: string;
  image: string;
  description: string;
  courseIds: string[];
  benefits?: string[];
}

const DEFAULT_COMBOS: Combo[] = [
  {
    id: 'combo-basic',
    title: 'Gói Combo Basic (Nhập Môn Thực Phẩm)',
    price: '1.200.000đ',
    image: 'https://images.unsplash.com/photo-1556910103-1c02745aae4d?auto=format&fit=crop&q=80&w=800',
    description: 'Gói Combo Basic: Học trọn gói các kiến thức cơ bản về HACCP, 5 nguyên tắc vàng của WHO và các tiêu chuẩn kiểm soát chất lượng sơ bộ.',
    courseIds: ['basic-principles', 'truy-xuat-nguon-goc']
  },
  {
    id: 'combo-pro',
    title: 'Gói Combo Pro (Chuyên Gia Vận Hành)',
    price: '1.800.000đ',
    image: 'https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?auto=format&fit=crop&q=80&w=800',
    description: 'Gói Combo Pro: Học chuyên sâu dành cho kỹ sư vận hành nhà máy gồm đầy đủ các khóa ISO (ISO 9001, ISO 14001, ISO 22000), nâng cao tối đa năng lực sản xuất.',
    courseIds: ['iso-9001', 'iso-14001', 'iso-22000']
  },
  {
    id: 'khoa-vip',
    title: 'Gói Combo VIP (Toàn Bộ Khóa Học)',
    price: '2.500.000đ',
    image: 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&q=80&w=800',
    description: 'Gói Combo VIP trọn đời: Combo trọn gói toàn bộ hệ thống các khóa học ISO, HACCP, QA/QC, Lean, bộ tài liệu biểu mẫu SOP chuẩn hóa và cập nhật tất cả khóa học mới trọn đời.',
    courseIds: [] // Empty means ALL courses
  }
];

const VipUpgrade: React.FC = () => {
  const navigate = useNavigate();
  const { success, error } = useToast();
  const [currentUser, setCurrentUser] = useState<{name: string, email: string} | null>(null);
  const [isVip, setIsVip] = useState(false);
  const [purchasedComboIds, setPurchasedComboIds] = useState<string[]>([]);
  const [allCourses, setAllCourses] = useState<Course[]>([]);
  
  // Combos data
  const [combos, setCombos] = useState<Combo[]>(DEFAULT_COMBOS);
  const [selectedComboForPurchase, setSelectedComboForPurchase] = useState<Combo | null>(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showPurchaseModal, setShowPurchaseModal] = useState(false);

  // Sync combos from Firestore
  useEffect(() => {
    // Sync regular courses for reference
    const list = getMergedCourses([]);
    setAllCourses(list);

    // Sync combos
    const unsubCombos = onSnapshot(collection(db, 'combos'), (snapshot) => {
      const dbCombos: Combo[] = [];
      snapshot.forEach((doc) => {
        dbCombos.push({ id: doc.id, ...doc.data() } as Combo);
      });

      // Merge defaults with Firestore edits
      const merged = DEFAULT_COMBOS.map(def => {
        const found = dbCombos.find(dbc => dbc.id === def.id);
        return found ? { ...def, ...found } : def;
      });

      // Include new custom combos that are not in defaults
      const defaultIds = DEFAULT_COMBOS.map(d => d.id);
      const customCombos = dbCombos.filter(dbc => !defaultIds.includes(dbc.id));

      setCombos([...merged, ...customCombos]);
    }, (error) => {
      console.warn("Lỗi đồng bộ danh sách combo ở VipUpgrade:", error);
    });

    return () => unsubCombos();
  }, []);

  // Sync authentication and purchased status
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user && user.email) {
        const userEmail = user.email.toLowerCase();
        setCurrentUser({
          name: user.displayName || 'Học viên',
          email: user.email
        });

        // 1. Check VIP status
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
          if (userDoc.exists()) {
            const data = userDoc.data() as any;
            if (data.isVip) {
              setIsVip(true);
            }
          }
        } catch (err) {
          console.error("Error fetching user profile:", err);
        }

        // 2. Load other purchased combos/courses
        try {
          const purchasedSnap = await getDocs(collection(db, "users", userEmail, "purchased_courses"));
          const ids: string[] = [];
          purchasedSnap.forEach(doc => {
            ids.push(doc.id);
          });
          setPurchasedComboIds(ids.filter(id => id.startsWith('combo-') || id === 'khoa-vip'));
        } catch (err) {
          // fallback to localStorage
          const cachedCombos = ['combo-basic', 'combo-pro', 'khoa-vip'].filter(id => 
            localStorage.getItem(`course_unlocked_${id}`) === 'true'
          );
          setPurchasedComboIds(cachedCombos);
        }
      } else {
        setCurrentUser(null);
        setIsVip(false);
        setPurchasedComboIds([]);
      }
    });

    return () => unsubscribe();
  }, []);

  const handlePurchaseClick = (combo: Combo) => {
    if (!currentUser) {
      navigate('/account', { state: { message: 'Vui lòng đăng nhập để đăng ký gói combo học tập', from: '/account/vip-upgrade' } });
      return;
    }
    setSelectedComboForPurchase(combo);
    setShowPurchaseModal(true);
  };

  const handlePaymentSuccess = async () => {
    if (!currentUser || !selectedComboForPurchase) return;
    const userEmail = currentUser.email.toLowerCase();
    const combo = selectedComboForPurchase;

    try {
      // 1. Record Combo purchase in "purchased_courses" subcollection
      await setDoc(doc(db, "users", userEmail, "purchased_courses", combo.id), {
        courseId: combo.id,
        courseTitle: combo.title,
        purchasedAt: new Date().toISOString(),
        price: combo.price,
        status: 'active'
      }, { merge: true });

      try {
        localStorage.setItem(`course_unlocked_${combo.id}`, 'true');
      } catch (e) {}

      // 2. If VIP was purchased, unlock VIP profile status globally
      if (combo.id === 'khoa-vip') {
        await setDoc(doc(db, "users", userEmail), {
          isVip: true,
          vipSince: new Date().toISOString()
        }, { merge: true });

        setIsVip(true);

        const localRolesStr = localStorage.getItem(`user_roles_${userEmail}`);
        const existingRoles = localRolesStr ? JSON.parse(localRolesStr) : {};
        try {
          localStorage.setItem(`user_roles_${userEmail}`, JSON.stringify({
            ...existingRoles,
            isVip: true
          }));
        } catch (e) {}
      } else {
        // 3. For Basic or Pro, automatically unlock each linked course individually for immediate classroom access!
        const linkedCourseIds = combo.courseIds || [];
        for (const courseId of linkedCourseIds) {
          const originalCourse = allCourses.find(c => c.id === courseId);
          await setDoc(doc(db, "users", userEmail, "purchased_courses", courseId), {
            courseId: courseId,
            courseTitle: originalCourse?.title || `Khóa học thuộc ${combo.title}`,
            purchasedAt: new Date().toISOString(),
            price: 'Mở khóa qua Gói Combo',
            status: 'active'
          }, { merge: true });

          try {
            localStorage.setItem(`course_unlocked_${courseId}`, 'true');
          } catch (e) {}
        }
      }

      setPurchasedComboIds(prev => [...prev, combo.id]);
      setShowPaymentModal(false);
      success(`🎉 Chúc mừng! Bạn đã đăng ký thành công "${combo.title}"!`, 6000, 'Kích hoạt thành công');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err: any) {
      console.error("Lỗi khi lưu giao dịch combo:", err);
      // Local fallback activation to ensure robust UX
      try {
        localStorage.setItem(`course_unlocked_${combo.id}`, 'true');
      } catch (e) {}
      if (combo.id === 'khoa-vip') {
        setIsVip(true);
      } else {
        (combo.courseIds || []).forEach(id => {
          try {
            localStorage.setItem(`course_unlocked_${id}`, 'true');
          } catch (e) {}
        });
      }
      setPurchasedComboIds(prev => [...prev, combo.id]);
      setShowPaymentModal(false);
      success(`Kích hoạt dự phòng thành công cho "${combo.title}"!`, 5000);
    }
  };

  return (
    <div className="min-h-screen bg-gray-950 font-sans text-white selection:bg-[#007c76] selection:text-white pb-20">
      
      {/* Hero Header */}
      <div className="relative overflow-hidden pt-20 pb-16 md:pt-28 md:pb-24">
        {/* Gradients */}
        <div className="absolute top-0 left-0 w-full h-full pointer-events-none">
          <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-[#007c76]/10 rounded-full blur-[120px] -mr-40 -mt-40"></div>
          <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-emerald-500/10 rounded-full blur-[120px] -ml-40 -mb-40"></div>
          <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-20"></div>
        </div>

        <div className="relative z-10 max-w-7xl mx-auto px-4 text-center space-y-6">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-[#007c76]/30 bg-[#007c76]/10 backdrop-blur-md">
            <Sparkles className="w-4 h-4 text-emerald-400" />
            <span className="text-xs md:text-sm font-black text-emerald-300 uppercase tracking-widest">
              Gói Combo Đào Tạo Toàn Diện
            </span>
          </div>

          <h1 className="text-4xl md:text-7xl font-black uppercase tracking-tight leading-none">
            Nâng Tầm Sự Nghiệp <br/>
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 via-teal-300 to-emerald-200">
              Với Gói Combo Đặc Quyền
            </span>
          </h1>

          <p className="text-gray-400 text-base md:text-lg font-bold max-w-3xl mx-auto leading-relaxed">
            Học tập trọn gói, tiết kiệm đến 50% học phí so với mua riêng lẻ. Sở hữu hệ thống học liệu ISO, HACCP, QA/QC tiêu chuẩn quốc tế và nhận chứng nhận chính thức.
          </p>

          <div className="flex justify-center gap-4 pt-4">
            <button
              onClick={() => {
                const element = document.getElementById('pricing-grid');
                element?.scrollIntoView({ behavior: 'smooth' });
              }}
              className="px-8 py-4 bg-[#007c76] hover:bg-[#005f5b] text-white rounded-2xl font-black uppercase text-xs tracking-widest hover:scale-105 transition-all shadow-xl shadow-[#007c76]/20 cursor-pointer"
            >
              Xem các gói Combo
            </button>
            <button
              onClick={() => navigate('/khoa-hoc')}
              className="px-8 py-4 bg-white/5 border border-white/10 hover:bg-white/10 text-white rounded-2xl font-black uppercase text-xs tracking-widest transition-all cursor-pointer"
            >
              Danh sách khóa lẻ
            </button>
          </div>
        </div>
      </div>

      {/* Pricing Grid */}
      <div id="pricing-grid" className="max-w-7xl mx-auto px-4 py-12 scroll-mt-24">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {combos.map((combo) => {
            const isVipPackage = combo.id === 'khoa-vip';
            const isProPackage = combo.id === 'combo-pro';
            const isOwned = purchasedComboIds.includes(combo.id) || (isVip && isVipPackage);

            // Fetch course titles linked to this combo
            const linkedCourses = allCourses.filter(c => combo.courseIds?.includes(c.id));

            return (
              <div
                key={combo.id}
                className={`rounded-[36px] bg-gray-900 border transition-all flex flex-col justify-between overflow-hidden relative group ${
                  isVipPackage
                    ? 'border-amber-500/40 shadow-2xl shadow-amber-500/5 ring-2 ring-amber-500/20 md:scale-105 md:-translate-y-2'
                    : isProPackage
                      ? 'border-emerald-500/30 hover:border-emerald-500/50'
                      : 'border-gray-800 hover:border-gray-700'
                }`}
              >
                {/* Header Banner */}
                {isVipPackage && (
                  <div className="absolute top-0 left-0 w-full bg-amber-500 text-black py-2 text-center text-[10px] font-black uppercase tracking-widest z-10 flex items-center justify-center gap-1.5">
                    <Crown className="w-3.5 h-3.5 fill-black" />
                    <span>Đặc quyền VIP cao cấp nhất</span>
                  </div>
                )}

                {/* Cover Image & Info */}
                <div className="relative h-44 overflow-hidden">
                  <img
                    src={combo.image}
                    alt={combo.title}
                    className="w-full h-full object-cover transition-transform duration-750 group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-gray-900 via-gray-900/40 to-transparent" />
                  <div className="absolute bottom-4 left-6 right-6">
                    <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-wider ${
                      isVipPackage
                        ? 'bg-amber-500/25 text-amber-300'
                        : isProPackage
                          ? 'bg-emerald-500/20 text-emerald-300'
                          : 'bg-blue-500/20 text-blue-300'
                    }`}>
                      {isVipPackage ? 'Combo VIP' : isProPackage ? 'Combo Pro' : 'Combo Basic'}
                    </span>
                    <h3 className="text-xl font-black uppercase text-white mt-2 leading-tight">
                      {combo.id === 'combo-basic' ? 'Combo Basic' : combo.id === 'combo-pro' ? 'Combo Pro' : 'Combo VIP Trọn Đời'}
                    </h3>
                  </div>
                </div>

                {/* Content Details */}
                <div className="p-8 flex-grow flex flex-col justify-between space-y-6">
                  {/* Pricing and Description */}
                  <div className="space-y-4">
                    <div className="flex items-baseline gap-2">
                      <span className="text-3xl md:text-4xl font-black text-white tracking-tight">
                        {combo.price}
                      </span>
                      <span className="text-xs text-gray-400 font-bold uppercase tracking-wider">
                        / sở hữu trọn đời
                      </span>
                    </div>

                    <p className="text-gray-400 text-xs leading-relaxed font-semibold">
                      {combo.description}
                    </p>
                  </div>

                  {/* Included Courses Section */}
                  <div className="space-y-4 pt-4 border-t border-gray-800">
                    <p className="text-[10px] font-black uppercase tracking-wider text-gray-400">
                      {isVipPackage ? 'Danh sách mở khóa:' : `Bao gồm ${linkedCourses.length} khóa học chuyên môn:`}
                    </p>

                    <div className="space-y-2.5 max-h-[220px] overflow-y-auto pr-1">
                      {isVipPackage ? (
                        <div className="flex items-start gap-3 bg-amber-500/5 p-3 rounded-2xl border border-amber-500/10">
                          <Crown className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                          <p className="text-xs text-amber-300/90 font-bold leading-relaxed">
                            Mở khóa <strong>toàn bộ</strong> tất cả các khóa học hiện tại và mọi khóa học mới ra mắt trong tương lai trọn đời.
                          </p>
                        </div>
                      ) : (
                        linkedCourses.map((c) => (
                          <div key={c.id} className="flex items-center gap-2">
                            <Check className="w-4 h-4 text-emerald-500 shrink-0" />
                            <span className="text-xs text-gray-300 font-extrabold truncate">
                              {c.title}
                            </span>
                          </div>
                        ))
                      )}

                      {/* Custom Benefits or Fallback */}
                      {combo.benefits && combo.benefits.length > 0 ? (
                        combo.benefits.map((benefit, bIdx) => (
                          <div key={bIdx} className="flex items-center gap-2">
                            <Check className={`w-4 h-4 shrink-0 ${isVipPackage ? 'text-amber-500' : 'text-emerald-500'}`} />
                            <span className={`text-xs font-bold ${isVipPackage ? 'text-amber-300' : 'text-gray-300'}`}>
                              {benefit}
                            </span>
                          </div>
                        ))
                      ) : (
                        <>
                          <div className="flex items-center gap-2">
                            <Check className="w-4 h-4 text-emerald-500 shrink-0" />
                            <span className="text-xs text-gray-300 font-bold">Tài liệu biểu mẫu SOP đính kèm</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Check className="w-4 h-4 text-emerald-500 shrink-0" />
                            <span className="text-xs text-gray-300 font-bold">Cấp chứng nhận hoàn thành</span>
                          </div>
                          {isVipPackage && (
                            <div className="flex items-center gap-2">
                              <Check className="w-4 h-4 text-amber-500 shrink-0" />
                              <span className="text-xs text-amber-300 font-bold">Đặc quyền Hỗ trợ 1-1 từ chuyên gia</span>
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  </div>

                  {/* Actions Button */}
                  <div className="pt-4">
                    {isOwned ? (
                      <div className="w-full py-4 rounded-2xl font-black text-xs uppercase tracking-widest text-center bg-gray-800 text-emerald-400 border border-gray-700/80 flex items-center justify-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                        <span>Đã kích hoạt</span>
                      </div>
                    ) : (
                      <button
                        onClick={() => handlePurchaseClick(combo)}
                        className={`w-full py-4 rounded-2xl font-black text-xs uppercase tracking-widest cursor-pointer transition-all ${
                          isVipPackage
                            ? 'bg-gradient-to-r from-amber-400 to-amber-600 text-black hover:scale-105 hover:shadow-lg hover:shadow-amber-500/20'
                            : 'bg-white text-gray-950 hover:bg-gray-100 hover:scale-103'
                        }`}
                      >
                        Đăng ký gói {combo.id === 'combo-basic' ? 'Basic' : combo.id === 'combo-pro' ? 'Pro' : 'VIP'}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Benefits Grid */}
      <div className="max-w-7xl mx-auto px-4 py-16 border-t border-gray-900 mt-12">
        <div className="text-center space-y-2 mb-12">
          <p className="text-xs text-[#007c76] font-black uppercase tracking-widest">Đặc quyền học tập</p>
          <h2 className="text-3xl font-black uppercase">Tại sao nên chọn học theo Combo?</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {[
            {
              title: "Lộ trình bài bản",
              desc: "Các khóa học được sắp xếp theo đúng lộ trình nâng cao năng lực từ cơ bản đến quản lý vận hành chuyên nghiệp.",
              icon: "M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2"
            },
            {
              title: "Tiết kiệm học phí",
              desc: "Đăng ký trọn gói Combo giúp tiết kiệm đến 50% học phí so với việc đăng ký lẻ từng khóa học.",
              icon: "M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            },
            {
              title: "Tài liệu SOP độc quyền",
              desc: "Sở hữu toàn bộ tài liệu quy trình, biểu mẫu tiêu chuẩn ISO/HACCP cực kỳ giá trị để ứng dụng ngay vào doanh nghiệp.",
              icon: "M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253"
            }
          ].map((item, idx) => (
            <div key={idx} className="bg-gray-900/50 p-8 rounded-3xl border border-gray-850 hover:border-gray-800 transition-colors">
              <div className="w-12 h-12 bg-[#007c76]/10 rounded-xl flex items-center justify-center mb-6 text-[#007c76]">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d={item.icon} />
                </svg>
              </div>
              <h3 className="text-lg font-black uppercase text-white mb-2">{item.title}</h3>
              <p className="text-gray-400 text-xs font-semibold leading-relaxed">{item.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Purchase & Payment Modals */}
      {selectedComboForPurchase && (
        <>
          <PurchaseModal
            isOpen={showPurchaseModal}
            onClose={() => setShowPurchaseModal(false)}
            onSuccess={() => {
              setShowPurchaseModal(false);
              setShowPaymentModal(true);
            }}
            userEmail={currentUser?.email || ''}
            userName={currentUser?.name || ''}
            courseName={selectedComboForPurchase.title}
          />
          <PaymentModal
            course={{
              id: selectedComboForPurchase.id,
              title: selectedComboForPurchase.title,
              price: selectedComboForPurchase.price,
              image: selectedComboForPurchase.image,
              category: 'Gói Combo',
              description: selectedComboForPurchase.description
            }}
            isOpen={showPaymentModal}
            onClose={() => setShowPaymentModal(false)}
            onSuccess={handlePaymentSuccess}
          />
        </>
      )}

    </div>
  );
};

export default VipUpgrade;
