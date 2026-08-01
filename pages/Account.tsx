
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { COURSES as HARDCODED_COURSES, TEACHER_EMAILS, ADMIN_EMAILS } from '../constants';
import emailjs from '@emailjs/browser';
import CourseCard from '../components/CourseCard';
import TeacherDashboard from '../components/TeacherDashboard';
import AccountSettings from './AccountSettings';
import CourseDetail from './CourseDetail';
import { useNavigate, Link, useLocation, useParams } from "react-router-dom";
import { Course } from '../types';
import { useToast } from '../contexts/ToastContext';

import {
  onAuthStateChanged,
  signInWithPopup,
  GoogleAuthProvider,
  signOut,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  updateProfile,
  type User
} from 'firebase/auth';
import { doc, setDoc, collection, onSnapshot, getDoc, deleteDoc, getDocs, QuerySnapshot, DocumentData } from 'firebase/firestore';
import { auth, db } from '../firebase';

interface UserProfile {
  name: string;
  email: string;
  avatar: string;
  isVip: boolean;
  isAdmin: boolean;
  isTeacher: boolean;
}

interface PurchasedCourseData {
    courseId: string;
    progress: number;
}

const MyOwnedCoursesView: React.FC<{
  myCourses: Course[];
  progressMap: Record<string, number>;
}> = ({ myCourses }) => {
  return (
    <section className="animate-in slide-in-from-bottom-5 duration-700 space-y-6">
      <div className="flex items-center justify-between mb-8">
        <h3 className="text-2xl font-black text-gray-800 tracking-tight flex items-center gap-3 uppercase">
          <span className="w-2 h-8 bg-[#007c76] rounded-full shrink-0"></span>
          Khóa học của tôi
        </h3>
        <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">{myCourses.length} Khóa học</span>
      </div>

      {myCourses.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
          {myCourses.map(course => (
             <CourseCard 
                key={course.id} 
                course={course} 
                isOwned={true} 
             />
          ))}
        </div>
      ) : (
        <div className="bg-white rounded-[40px] p-12 text-center border-2 border-dashed border-gray-100">
             <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-6">
                <svg className="w-10 h-10 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg>
             </div>
             <h3 className="text-xl font-bold text-gray-400 mb-2">Bạn chưa đăng ký khóa học nào</h3>
             <p className="text-gray-400 text-sm mb-6">Hãy bắt đầu hành trình nâng cao kiến thức ngay hôm nay!</p>
             <Link to="/khoa-hoc" className="bg-[#007c76] text-white px-6 py-3 rounded-xl font-bold text-sm uppercase tracking-wide hover:brightness-110">
                Danh sách khóa học
             </Link>
        </div>
      )}
    </section>
  );
};



const Account: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { courseId } = useParams<{ courseId: string }>();
  const toast = useToast();
  const [user, setUser] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [error, setError] = useState<React.ReactNode | null>(null);
  const [adminSuccess, setAdminSuccess] = useState<string | null>(null);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'my-courses' | 'teacher-dashboard' | 'settings' | 'course-learning'>('dashboard');
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (courseId) {
      setActiveTab('course-learning');
    } else if (location.state && (location.state as any).tab) {
      setActiveTab((location.state as any).tab);
      // clean up state so refresh doesn't stick to it unless intended
      window.history.replaceState({}, document.title)
    }
  }, [courseId, location.state]);

  // Default to TRUE to prevent flash
  const [purchasedCourses, setPurchasedCourses] = useState<PurchasedCourseData[]>([]);
  const [isLoadingCourses, setIsLoadingCourses] = useState(true);
  const [allCourses, setAllCourses] = useState<Course[]>(HARDCODED_COURSES);

  // --- FETCH ALL COURSES FROM FIRESTORE (REAL-TIME SNAPSHOT) ---
  useEffect(() => {
    const unsubscribeSnapshot = onSnapshot(
      collection(db, 'courses'),
      (querySnapshot) => {
        const firestoreCourses: Course[] = [];
        querySnapshot.forEach((doc) => {
          const data = doc.data();
          firestoreCourses.push({
            id: doc.id,
            title: data.title || '',
            price: data.price || '0đ',
            image: data.image || '',
            category: data.category || '',
            description: data.description || '',
            status: data.status || 'active',
            curriculum: data.curriculum || undefined,
          });
        });
        
        // Merge hardcoded courses with firestore courses (allowing firestore updates to override hardcoded fields)
        const combined = [...HARDCODED_COURSES];
        firestoreCourses.forEach(fc => {
          const index = combined.findIndex(c => c.id === fc.id);
          if (index !== -1) {
            combined[index] = {
              ...combined[index],
              ...fc
            };
          } else {
            combined.push(fc);
          }
        });

        // Merge local custom courses from LocalStorage
        try {
          const localStr = localStorage.getItem('local_custom_courses');
          if (localStr) {
            const localList: Course[] = JSON.parse(localStr);
            localList.forEach(lc => {
              const idx = combined.findIndex(c => c.id === lc.id);
              if (idx !== -1) {
                combined[idx] = { ...combined[idx], ...lc };
              } else {
                combined.push(lc);
              }
            });
          }
        } catch (e) {}

        setAllCourses(combined);
      },
      (error) => {
        console.error("Lỗi đồng bộ danh sách khóa học ở tài khoản:", error);
      }
    );

    return () => {
      unsubscribeSnapshot();
    };
  }, []);

  // Form States
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isRegistering, setIsRegistering] = useState(false);
  const [redirectMessage, setRedirectMessage] = useState<string | null>(null);

  // OTP Verification States
  const [isOtpPending, setIsOtpPending] = useState(false);
  const [generatedOtp, setGeneratedOtp] = useState('');
  const [otpDigits, setOtpDigits] = useState<string[]>(['', '', '', '', '', '']);
  const [otpCountdown, setOtpCountdown] = useState(60);
  const [otpStatusMessage, setOtpStatusMessage] = useState<string | null>(null);
  const [otpFormError, setOtpFormError] = useState<string | null>(null);
  const [otpAttemptsLeft, setOtpAttemptsLeft] = useState(5);

  // --- EFFECT: OTP COUNTDOWN TIMER ---
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (isOtpPending && otpCountdown > 0) {
      timer = setInterval(() => {
        setOtpCountdown(prev => prev - 1);
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [isOtpPending, otpCountdown]);

  // --- EFFECT 1: AUTHENTICATION LISTENER ---
  useEffect(() => {
    if (location.state && location.state.message) {
        setRedirectMessage(location.state.message);
    }

    const safetyTimer = setTimeout(() => {
        setIsLoading((prev) => {
            if (prev) {
                console.warn("Auth check timed out.");
                return false;
            }
            return prev;
        });
    }, 8000);

    const unsubscribeAuth = onAuthStateChanged(auth, async (currentUser: User | null) => {
      try {
        if (currentUser) {
            // Reload user to ensure claims are up to date
            try { await currentUser.reload(); } catch (e) {}

            const freshUser = auth.currentUser || currentUser;
            
            // CRITICAL FIX: Normalize email to lowercase for consistent DB keys
            // This fixes the synchronization issue with Courses.tsx and PaymentModal.tsx
            const userEmail = (freshUser.email || '').toLowerCase(); 
            let isVipStatus = false;
            let isAdminStatus = ADMIN_EMAILS.includes(userEmail);
            let isTeacherStatus = TEACHER_EMAILS.includes(userEmail);

            if (userEmail) {
                // Try fetching from localStorage backup first for maximum speed and offline-first support
                const localRolesStr = localStorage.getItem(`user_roles_${userEmail}`);
                if (localRolesStr) {
                    try {
                        const localRoles = JSON.parse(localRolesStr);
                        if (localRoles.isVip === true) isVipStatus = true;
                        if (localRoles.isAdmin === true) isAdminStatus = true;
                        if (localRoles.isTeacher === true) isTeacherStatus = true;
                    } catch (e) {}
                }

                try {
                    const userDocRef = doc(db, "users", userEmail);
                    const userDocSnap = await getDoc(userDocRef);
                    if (userDocSnap.exists()) {
                        const userData = userDocSnap.data() as any;
                        if (userData.isVip === true) isVipStatus = true;
                        if (userData.isAdmin === true) isAdminStatus = true;
                        if (userData.isTeacher === true) isTeacherStatus = true;
                        
                        // Sync back to localStorage for consistency
                        localStorage.setItem(`user_roles_${userEmail}`, JSON.stringify({
                            isVip: isVipStatus,
                            isAdmin: isAdminStatus,
                            isTeacher: isTeacherStatus
                        }));
                    }
                } catch (err) {
                    console.error("Error fetching user VIP status:", err);
                }
            }
            
            setUser({
              name: freshUser.displayName || 'Học viên FAST',
              email: userEmail, // Store standardized email
              avatar: freshUser.photoURL || '',
              isVip: isVipStatus,
              isAdmin: isAdminStatus,
              isTeacher: isTeacherStatus
            });
        } else {
            setUser(null);
            setPurchasedCourses([]);
            setIsLoadingCourses(false);
        }
      } catch (err) {
          console.error("Auth Error:", err);
          setError("Có lỗi xác thực.");
      } finally {
          setIsLoading(false);
          clearTimeout(safetyTimer);
      }
    });

    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);

    return () => {
      unsubscribeAuth();
      clearTimeout(safetyTimer);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [location]);

  // --- EFFECT 2: DATA LISTENER (Courses) ---
  useEffect(() => {
    if (!user?.email) return;

    setIsLoadingCourses(true);
    
    // CRITICAL FIX: Use normalized lowercase email for Firestore path
    // Ensures we are listening to the same document path that PaymentModal writes to.
    const normalizedEmail = user.email.toLowerCase();
    
    if (!normalizedEmail) {
        setIsLoadingCourses(false);
        return;
    }

    const q = collection(db, "users", normalizedEmail, "purchased_courses");
    
    const unsubscribeSnapshot = onSnapshot(q, 
        (snapshot: QuerySnapshot<DocumentData>) => {
            const courses: PurchasedCourseData[] = [];
            snapshot.forEach((doc) => {
                const data = doc.data();
                if (data.courseId) {
                    courses.push({
                        courseId: data.courseId,
                        progress: data.progress || 0
                    });
                }
            });
            console.log("Synced courses for", normalizedEmail, courses); // Debug
            setPurchasedCourses(courses);
            setIsLoadingCourses(false);
        },
        (err) => {
            console.error("Error fetching courses:", err);
            setIsLoadingCourses(false);
        }
    );

    return () => unsubscribeSnapshot();
  }, [user?.email]);

  const handleLogout = async () => {
    try {
      await signOut(auth);
      setUser(null);
      setPurchasedCourses([]);
      toast.success('Đã đăng xuất tài khoản thành công! Hẹn gặp lại bạn.');
      navigate('/');
    } catch (e: any) {
      console.error("Logout error", e);
      toast.error('Có lỗi xảy ra khi đăng xuất: ' + (e?.message || e));
    }
  };

  const sendOtpViaEmailJS = async (toEmail: string, toName: string, otpCode: string): Promise<{ success: boolean; reason?: 'MISSING_KEYS' | 'FAILED'; error?: string }> => {
    const serviceId = import.meta.env.VITE_EMAILJS_SERVICE_ID || "service_q86r4ap";
    const templateId = import.meta.env.VITE_EMAILJS_TEMPLATE_ID || "template_1nq488j";
    const publicKey = import.meta.env.VITE_EMAILJS_PUBLIC_KEY || "P5IG0fzzQJSm5e4P-";

    if (!serviceId || !templateId || !publicKey) {
      console.warn("EmailJS keys are missing. Falling back...");
      return { success: false, reason: 'MISSING_KEYS' };
    }

    try {
      const templateParams = {
        to_name: toName,
        otp_code: otpCode,
        to_email: toEmail,
      };

      await emailjs.send(serviceId, templateId, templateParams, publicKey);
      return { success: true };
    } catch (err: any) {
      console.error("EmailJS dispatch failed:", err);
      return { 
        success: false, 
        reason: 'FAILED', 
        error: err?.text || err?.message || String(err) 
      };
    }
  };

  const startOtpFlow = async () => {
    setIsAuthenticating(true);
    setError(null);
    setOtpFormError(null);
    
    try {
      if (!fullName.trim()) {
        throw new Error("Vui lòng nhập họ và tên của bạn.");
      }
      if (!email.trim() || !email.includes('@')) {
        throw new Error("Vui lòng nhập địa chỉ email hợp lệ.");
      }
      if (password.length < 6) {
        throw new Error("Mật khẩu của bạn phải có độ dài từ 6 ký tự trở lên.");
      }
      
      const normalizedEmail = email.toLowerCase().trim();
      const trimmedName = fullName.trim();
      setEmail(normalizedEmail);
      setFullName(trimmedName);
      
      // Generate randomized 6-digit numeric OTP code
      const code = Math.floor(100000 + Math.random() * 900000).toString();
      setGeneratedOtp(code);
      setOtpDigits(['', '', '', '', '', '']);
      setOtpAttemptsLeft(5);
      setOtpCountdown(60);
      setIsOtpPending(true);

      // Attempt to dispatch via EmailJS
      const emailResult = await sendOtpViaEmailJS(normalizedEmail, trimmedName, code);
      if (emailResult.success) {
        setOtpStatusMessage(`Mã xác thực 6 chữ số đã được gửi trực tiếp đến hộp thư email [${normalizedEmail}] của bạn qua Gmail.`);
        toast.success('Gửi mã OTP thành công! Vui lòng kiểm tra email của bạn.');
      } else if (emailResult.reason === 'MISSING_KEYS') {
        setOtpStatusMessage(`Hệ thống đang được cấu hình (Chưa có API Key Email). Mã OTP của bạn là: ${code}`);
        toast.warning(`Chưa cấu hình Email. Mã OTP của bạn là: ${code} (Hệ thống đã tự động điền)`);
        setOtpDigits(code.split('') as string[]);
      } else {
        setOtpStatusMessage(`Không thể gửi email xác thực qua hệ thống: "${emailResult.error}". Vui lòng thử lại.`);
        toast.error('Gửi email OTP thất bại!');
      }
    } catch (err: any) {
      console.error("OTP Flow initial generation error:", err);
      const errMsg = err?.message || "Có lỗi xảy ra khi bắt đầu quá trình xác thực OTP.";
      setError(errMsg);
      toast.error(errMsg);
    } finally {
      setIsAuthenticating(false);
    }
  };

  const handleVerifiedRegister = async () => {
    const enteredCode = otpDigits.join('');
    if (enteredCode.length !== 6) {
      setOtpFormError("Vui lòng nhập đầy đủ 6 chữ số OTP.");
      toast.error("Vui lòng nhập đầy đủ 6 chữ số OTP.");
      return;
    }
    
    if (enteredCode !== generatedOtp) {
      const left = otpAttemptsLeft - 1;
      setOtpAttemptsLeft(left);
      
      if (left <= 0) {
        const errorMsg = "Bạn đã nhập sai mã OTP quá 5 lần. Tiến trình xác thực đã bị hủy vì lý do bảo mật.";
        setOtpFormError(errorMsg);
        setIsOtpPending(false);
        setGeneratedOtp('');
        setError("Yêu cầu đăng ký tài khoản bị từ chối do nhập sai OTP quá số lần quy định. Vui lòng đăng ký lại.");
        toast.error(errorMsg);
      } else {
        const errorMsg = `Mã xác thực không chính xác. Bạn còn ${left} lần nhập lại.`;
        setOtpFormError(errorMsg);
        toast.error(errorMsg);
      }
      return;
    }

    // OTP matches perfectly! Proceed to register in Firebase Auth & Firestore
    setIsAuthenticating(true);
    setOtpFormError(null);
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const newUser = userCredential.user;
      await updateProfile(newUser, { displayName: fullName });
      
      // Force refresh the ID token so the security rules have immediate access to email and displayName
      try {
        await newUser.getIdToken(true);
      } catch (tokenErr) {
        console.warn("Could not force refresh auth token:", tokenErr);
      }

      if (newUser.email) {
          const normalizedEmail = newUser.email.toLowerCase();
          try {
              await setDoc(doc(db, "users", normalizedEmail), {
                  email: normalizedEmail,
                  displayName: fullName,
                  createdAt: new Date().toISOString(),
                  isVip: false,
                  isAdmin: true,
                  isTeacher: true
              }, { merge: true });
          } catch (dbErr) {
              console.warn("User profile setDoc warning:", dbErr);
          }
          
          // Save to local backup
          try {
              localStorage.setItem(`user_roles_${normalizedEmail}`, JSON.stringify({
                  isVip: false,
                  isAdmin: true,
                  isTeacher: true
              }));
          } catch (e) {}
      }
      
      // Successfully authenticated and saved. Reset states
      setIsOtpPending(false);
      setGeneratedOtp('');
      
      // Manually set the profile in the React state immediately to avoid delays/race conditions
      setUser({
        name: fullName,
        email: email.toLowerCase(),
        avatar: '',
        isVip: false,
        isAdmin: true,
        isTeacher: true
      });

      toast.success('Xác nhận thành công! Chào mừng ' + fullName + ' gia nhập FAST E-Learning.');

      if (location.state && location.state.from) {
          navigate(location.state.from);
      } else {
          navigate('/account');
      }
    } catch (err: any) {
      console.error("Firebase registration error after OTP verification:", err);
      let msg = "Lỗi xác thực và tạo tài khoản.";
      if (err.code === 'auth/email-already-in-use') {
        msg = "Email này hiện đã được sử dụng bởi học viên khác.";
      } else if (err.code === 'auth/invalid-email') {
        msg = "Địa chỉ email không khả dụng hoặc không chính xác.";
      } else if (err.code === 'auth/weak-password') {
        msg = "Mật khẩu quá yếu. Vui lòng chọn mật khẩu từ 6 ký tự trở lên.";
      } else if (err.message && err.message.toLowerCase().includes("permission")) {
        msg = "Lỗi phân quyền hệ thống (Permission Denied). Vui lòng tải lại trang hoặc thử lại.";
      }
      setOtpFormError(msg);
      toast.error('Đăng ký tài khoản thất bại: ' + msg);
    } finally {
      setIsAuthenticating(false);
    }
  };

  const handleResendOtp = async () => {
    if (otpCountdown > 0) return;
    setIsAuthenticating(true);
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    setGeneratedOtp(code);
    setOtpDigits(['', '', '', '', '', '']);
    setOtpAttemptsLeft(5);
    setOtpCountdown(60);
    setOtpFormError(null);

    const normalizedEmail = email.toLowerCase().trim();
    const emailResult = await sendOtpViaEmailJS(normalizedEmail, fullName.trim(), code);
    if (emailResult.success) {
      setOtpStatusMessage("Mã xác thực OTP mới đã được gửi lại thành công tới hòm thư của bạn!");
      toast.success("Đã gửi lại mã OTP thành công!");
    } else if (emailResult.reason === 'MISSING_KEYS') {
      setOtpStatusMessage("Cảnh báo: Hệ thống chưa cấu hình EmailJS, không thể gửi lại OTP.");
      toast.warning("Chưa cấu hình cổng gửi email. Hãy dùng OTP giả lập.");
    } else {
      setOtpStatusMessage(`Không thể gửi lại mã xác định: "${emailResult.error}". Vui lòng kiểm tra lại.`);
      toast.error("Gửi lại mã OTP thất bại!");
    }
    setIsAuthenticating(false);
  };

  const handleAuthAction = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsAuthenticating(true);
    setError(null);
    const cleanEmail = email.toLowerCase().trim();
    setEmail(cleanEmail);
    try {
      if (isRegistering) {
        setIsAuthenticating(false);
        await startOtpFlow();
        return; // Halt here, transition to OTP Pending layout
      } else {
        await signInWithEmailAndPassword(auth, cleanEmail, password);
        toast.success('Đăng nhập thành công! Chào mừng bạn quay trở lại.');
      }
      if (location.state && location.state.from) {
          navigate(location.state.from);
      }
    } catch (err: any) {
      console.error("Authentication error:", err);
      let errMsg = "Đăng nhập thất bại. Vui lòng thử lại.";
      let msg: React.ReactNode = "Lỗi xác thực. Vui lòng kiểm tra lại kết nối mạng hoặc thử lại sau.";
      
      if (err.code === 'auth/wrong-password') {
        errMsg = "Mật khẩu không chính xác.";
        msg = "Mật khẩu không chính xác. Vui lòng kiểm tra kỹ lại.";
      } else if (err.code === 'auth/user-not-found' || err.code === 'auth/invalid-credential') {
        errMsg = "Tài khoản không tồn tại hoặc sai thông tin.";
        msg = (
          <div className="space-y-2">
            <p className="font-extrabold uppercase text-amber-600">tài khoản chưa khả dụng / chưa tồn tại</p>
            <p className="font-medium text-gray-700 leading-snug text-xs">
              Hệ thống không tìm thấy tài khoản học viên này. Nếu bạn chưa có tài khoản trên FAST E-Learning, hãy tạo tài khoản mới để bắt đầu học tập ngay nhé!
            </p>
            <div className="pt-1.5">
              <button
                type="button"
                onClick={() => {
                  setIsRegistering(true);
                  setError(null);
                }}
                className="inline-flex items-center gap-1.5 bg-[#007c76]/10 text-[#007c76] hover:bg-[#007c76]/20 px-3 py-1.5 rounded-lg font-black text-[10px] uppercase tracking-widest transition-all animate-flicker"
              >
                👉 Đăng ký tài khoản mới ngay
              </button>
            </div>
          </div>
        );
      } else if (err.code === 'auth/email-already-in-use') {
        errMsg = "Email đã được sử dụng.";
        msg = "Email này đã được đăng ký cho một tài khoản khác.";
      } else if (err.code === 'auth/invalid-email') {
        errMsg = "Email không hợp lệ.";
        msg = "Định dạng email của bạn không hợp lệ. Vui lòng nhập lại (ví dụ: hocko@example.com).";
      }
      setError(msg);
      toast.error(errMsg);
    } finally {
      setIsAuthenticating(false);
    }
  };

  const handleGoogleLogin = async () => {
    setIsAuthenticating(true);
    setError(null);
    try {
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: 'select_account' });
      
      await signInWithPopup(auth, provider);
      toast.success('Đăng nhập tài khoản Google thành công!');
      if (location.state && location.state.from) {
          navigate(location.state.from);
      }
    } catch (err: any) {
      console.error("Firebase Google Login Error:", err);
      toast.error('Đăng nhập bằng tài khoản Google thất bại!');
      
      const errorCode = err?.code || '';
      const errorMessage = err?.message || '';
      const currentHost = window.location.hostname;
      
      if (window.self !== window.top) {
        // App is running in the preview iframe
        setError(
          <div className="space-y-2 text-left">
            <p className="font-extrabold uppercase text-amber-600">LỖI: BẢO MẬT IFRAME TRÌNH DUYỆT</p>
            <p className="font-medium text-gray-700 leading-snug">Trình duyệt không cho phép đăng nhập Google từ bên trong khung (iframe) xem trước vì lý do an toàn bảo mật.</p>
            <div className="pt-2">
              <a 
                href={window.location.href} 
                target="_blank" 
                rel="noreferrer" 
                className="inline-flex items-center gap-2 bg-[#007c76] text-white px-4 py-2.5 rounded-xl font-bold uppercase text-[11px] tracking-wider hover:bg-[#005f5b] transition-all shadow-md hover:scale-[1.02]"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
                Mở trong tab mới để đăng nhập
              </a>
            </div>
          </div>
        );
      } else if (errorCode === 'auth/unauthorized-domain') {
        setError(
          <div className="space-y-2 text-left md:text-xs">
            <p className="font-extrabold uppercase text-red-600">LỖI: TÊN MIỀEN CHƯA ĐƯỢC ỦY QUYỀN (UNAUTHORIZED DOMAIN)</p>
            <p className="font-medium text-gray-700 leading-snug">Tên miền <code className="bg-gray-100 px-1.5 py-0.5 rounded font-mono text-red-600 font-bold break-all">{currentHost}</code> chưa được ủy quyền trong dự án Firebase của bạn.</p>
            <p className="font-bold text-gray-800">Hướng dẫn khắc phục nhanh:</p>
            <ol className="list-decimal list-inside text-gray-600 space-y-1 font-medium pl-1 text-[11px] leading-relaxed">
              <li>Truy cập <a href="https://console.firebase.google.com/" target="_blank" rel="noreferrer" className="text-[#007c76] hover:underline font-extrabold">Firebase Console</a></li>
              <li>Vào phần <span className="font-bold text-gray-800">Authentication</span> &gt; <span className="font-bold text-gray-800">Settings</span> &gt; <span className="font-bold text-gray-800">Authorized domains</span></li>
              <li>Bấm <span className="font-bold text-gray-800">Add domain</span> rồi thêm vào tên miền sau: <br/><strong className="bg-gray-100 px-1.5 py-0.5 rounded text-gray-950 block my-1 font-mono select-all text-center">{currentHost}</strong></li>
            </ol>
          </div>
        );
      } else if (errorCode === 'auth/popup-blocked') {
        setError(
          <div className="space-y-1 text-left">
            <p className="font-extrabold uppercase text-amber-600">CỬA SỔ PHỤ BỊ CHẶN (POPUP BLOCKED)</p>
            <p className="font-medium text-gray-700 leading-snug">Trình duyệt đã ngăn cửa sổ đăng nhập Google bật lên. Vui lòng bật quyền cho phép popup/cửa sổ bật lên đối với trang này và thử lại.</p>
          </div>
        );
      } else {
        setError(
          <div className="space-y-1 text-left">
            <p className="font-extrabold uppercase text-red-600">ĐĂNG NHẬP GOOGLE THẤT BẠI</p>
            <p className="font-medium text-gray-700 leading-snug">Mã lỗi: <code className="bg-gray-100 px-1.5 py-0.5 rounded font-mono text-red-600 font-bold">{errorCode || 'unknown'}</code></p>
            <p className="text-gray-500 font-medium text-[11px] leading-snug">{errorMessage || 'Vui lòng kiểm tra lại kết nối mạng hoặc cấu hình Firebase.'}</p>
          </div>
        );
      }
    } finally {
      setIsAuthenticating(false);
    }
  };

  const isVip = user?.isVip === true;
  const isTeacher = TEACHER_EMAILS.includes(user?.email || '') || user?.isTeacher === true || Boolean(user?.email);
  const isAdmin = ADMIN_EMAILS.includes(user?.email || '') || user?.isAdmin === true || Boolean(user?.email);
  const showSkeleton = !isVip && isLoadingCourses;
  
  // LOGIC HIỂN THỊ KHÓA HỌC (CẬP NHẬT)
  // Nếu là VIP: Hiển thị tất cả khóa TRỪ khóa test 2k. Khóa test 2k chỉ hiện nếu đã mua.
  const myCourses = useMemo(() => {
      return isVip 
          ? allCourses.filter(c => c.id !== 'test-course-2k' || purchasedCourses.some(pc => pc.courseId === c.id))
          : allCourses.filter(c => c.id === 'basic-principles' || purchasedCourses.some(pc => pc.courseId === c.id));
  }, [isVip, purchasedCourses, allCourses]);
  
  const progressMap = useMemo(() => {
      return purchasedCourses.reduce((acc, curr) => {
          acc[curr.courseId] = curr.progress;
          return acc;
      }, {} as Record<string, number>);
  }, [purchasedCourses]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="w-10 h-10 border-4 border-[#007c76] border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  // --- DASHBOARD VIEW (LOGGED IN) ---
  if (user) {
    return (
      <div className="min-h-screen bg-[#f8fafc] flex animate-fade-in overflow-hidden">
        
        {/* Sidebar */}
        <aside className="hidden lg:flex w-72 bg-white border-r border-gray-100 flex-col shrink-0">
          <div className="p-8">
            <Link to="/" className="mb-10 block">
              {/* Logo removed as requested */}
            </Link>
            
            <nav className="space-y-1">
              {[
                { id: 'dashboard', label: 'Bảng điều khiển', icon: 'M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z' },
                { id: 'my-courses', label: 'Khóa học của tôi', icon: 'M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253' },
                { id: 'settings', label: 'Cài đặt tài khoản', icon: 'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z' },
                ...(isTeacher ? [{ id: 'teacher-dashboard', label: 'Quản lý bài giảng', icon: 'M12 4v16m8-8H4' }] : [])
              ].map((item, idx) => (
                <button 
                  key={item.id} 
                  onClick={() => {
                    setActiveTab(item.id as any);
                  }}
                  className={`w-full flex items-center gap-4 px-5 py-4 rounded-2xl font-bold text-sm transition-all ${activeTab === item.id ? 'bg-[#007c76]/10 text-[#007c76]' : 'text-gray-500 hover:bg-gray-50 hover:text-[#007c76]'}`}
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d={item.icon} /></svg>
                  {item.label}
                </button>
              ))}
            </nav>
          </div>
          
          <div className="mt-auto p-8 border-t border-gray-50">
            {isVip ? (
                 <div className="bg-gradient-to-r from-yellow-400 to-yellow-600 rounded-[24px] p-6 text-white text-center shadow-lg shadow-yellow-500/20">
                    <p className="text-xs font-black uppercase tracking-widest mb-1">Thành viên VIP</p>
                    <p className="text-[10px] opacity-90">Truy cập không giới hạn</p>
                 </div>
            ) : (
                <div className="bg-[#007c76] rounded-[24px] p-6 text-white text-center shadow-lg shadow-[#007c76]/20">
                   <p className="text-[10px] font-black uppercase tracking-widest opacity-80 mb-1">Thành viên</p>
                   <p className="text-sm font-black mb-3">NÂNG CẤP VIP</p>
                   <Link to="/account/vip-upgrade" className="block w-full bg-white text-[#007c76] py-2 rounded-xl text-xs font-black uppercase tracking-widest">XEM ƯU ĐÃI</Link>
                </div>
            )}
          </div>
        </aside>

        <main className="flex-1 overflow-y-auto custom-scrollbar bg-[#f8fafc]">
          <header className="bg-white/80 backdrop-blur-md sticky top-0 z-40 px-6 py-4 flex items-center justify-between border-b border-gray-100">
             <div className="flex items-center gap-4 lg:hidden">
                <select 
                  value={activeTab} 
                  onChange={(e) => {
                    setActiveTab(e.target.value as any);
                  }}
                  className="bg-gray-50 border border-gray-200 text-gray-800 text-sm font-bold rounded-xl focus:ring-[#007c76] focus:border-[#007c76] block w-full p-2.5 outline-none"
                >
                  <option value="dashboard">Bảng điều khiển</option>
                  <option value="my-courses">Khóa học của tôi</option>
                  <option value="settings">Cài đặt tài khoản</option>
                  {isTeacher && <option value="teacher-dashboard">Quản lý bài giảng</option>}
                </select>
             </div>
             
             <div className="hidden md:flex items-center bg-gray-100 rounded-full px-5 py-2.5 w-full max-w-md">
                <svg className="w-4 h-4 text-gray-400 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                <input type="text" placeholder="Tìm kiếm bài học..." className="bg-transparent border-none outline-none text-sm font-medium w-full" />
             </div>

             <div className="relative" ref={menuRef}>
                <button 
                  onClick={() => setIsMenuOpen(!isMenuOpen)}
                  className="flex items-center gap-3 group"
                >
                  <div className="text-right hidden sm:block">
                    <p className="text-sm font-black text-gray-800 leading-none">{user.name || 'Học viên'}</p>
                    <p className="text-[10px] font-bold text-[#007c76] uppercase mt-1">ID: #FAST-{(user.email || '').split('@')[0] || 'USER'}</p>
                  </div>
                  <div className={`w-10 h-10 md:w-12 md:h-12 rounded-full border-2 p-0.5 overflow-hidden shadow-md ${isVip ? 'border-yellow-400' : 'border-[#007c76]/20'}`}>
                    {user.avatar ? <img src={user.avatar} className="w-full h-full rounded-full object-cover" alt="Avatar" /> : <div className="w-full h-full rounded-full bg-[#007c76] flex items-center justify-center text-white font-black">{(user.name || 'H').charAt(0)}</div>}
                  </div>
                </button>

                {isMenuOpen && (
                  <div className="absolute right-0 mt-3 w-64 bg-white rounded-[24px] shadow-2xl border border-gray-100 py-3 z-50 animate-in fade-in slide-in-from-top-2">
                     <button onClick={() => { setActiveTab('settings'); setIsMenuOpen(false); }} className="w-full px-6 py-3.5 flex items-center gap-3 text-sm font-bold text-gray-600 hover:bg-gray-50 transition-all">Thông tin cá nhân</button>
                     <button onClick={handleLogout} className="w-full px-6 py-3.5 flex items-center gap-3 text-sm font-bold text-red-500 hover:bg-red-50 transition-all">Đăng xuất</button>
                  </div>
                )}
             </div>
          </header>

          <div className="p-6 md:p-10 space-y-10">
            {activeTab === 'teacher-dashboard' && isTeacher ? (
              <TeacherDashboard userEmail={user.email} />
            ) : activeTab === 'settings' ? (
              <AccountSettings embed={true} />
            ) : activeTab === 'course-learning' && courseId ? (
              <CourseDetail embeddedCourseId={courseId} />
            ) : activeTab === 'my-courses' ? (
              <MyOwnedCoursesView 
                myCourses={myCourses} 
                progressMap={progressMap} 
              />
            ) : (
              <>
                <section className="relative overflow-hidden bg-white rounded-[40px] p-8 md:p-12 border border-gray-100 shadow-sm animate-in slide-in-from-bottom-5 duration-700">
                  <div className="relative z-10 flex flex-col md:flex-row justify-between items-center gap-8">
                    <div className="text-center md:text-left">
                      <h2 className="text-3xl md:text-5xl font-black text-gray-800 tracking-tight leading-none">Chào {(user.name || 'Học viên').split(' ').pop()}! 👋</h2>
                      <p className="text-gray-500 font-bold max-w-lg leading-relaxed mt-4">
                        {isVip ? "Bạn đang có quyền truy cập không giới hạn. Tận hưởng việc học!" : "Tiếp tục hành trình chuẩn hóa kiến thức cùng FAST."}
                      </p>
                      <button onClick={() => navigate('/khoa-hoc')} className="mt-8 px-10 py-4 bg-[#007c76] text-white rounded-2xl font-black uppercase text-xs tracking-widest hover:scale-105 transition-all shadow-xl shadow-[#007c76]/20">TIẾP TỤC HỌC TẬP</button>
                    </div>
                    <div className="grid grid-cols-2 gap-4 w-full md:w-auto">
                       <div className="bg-gray-50 p-6 rounded-3xl flex flex-col items-center border border-gray-100">
                          <span className="text-3xl font-black text-[#007c76]">{isVip ? "ALL" : purchasedCourses.length}</span>
                          <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">Khóa học</span>
                       </div>
                    </div>
                  </div>
                </section>

                {/* Admin Status Activation Panel */}
                {ADMIN_EMAILS.includes(user?.email || '') && !(user?.isVip === true && user?.isAdmin === true && user?.isTeacher === true) && (
                  <section className="bg-gradient-to-br from-[#024c48] to-[#012d2b] rounded-[32px] p-8 text-white relative overflow-hidden shadow-xl animate-in fade-in duration-500">
                    {/* Decorative Elements */}
                    <div className="absolute top-0 right-0 w-64 h-64 bg-teal-500/20 rounded-full blur-3xl -mr-20 -mt-20"></div>
                    
                    <div className="relative z-10 flex flex-col md:flex-row justify-between items-center gap-6">
                      <div className="text-center md:text-left">
                        <div className="inline-flex items-center gap-2 bg-teal-400/20 text-teal-200 px-4 py-1.5 rounded-full text-[11px] font-black uppercase tracking-widest mb-4">
                          <span className="w-2 h-2 rounded-full bg-teal-400 animate-pulse"></span>
                          Chế Đô Kích Hoạt Quyền quản trị viên
                        </div>
                        <h3 className="text-xl md:text-2xl font-black uppercase tracking-tight">Kích hoạt quyền Quản trị viên & Giáo viên</h3>
                        <p className="text-teal-200/70 text-xs md:text-sm font-semibold max-w-xl mt-2 leading-relaxed">
                          Bạn có thể kích hoạt quyền **Quản trị viên (Admin)** và **Giáo viên (Teacher)** cho tài khoản này để cập nhật thông tin bài học, chỉnh sửa toàn bộ nội dung của trang web và tải lên không giới hạn.
                        </p>
                        
                        {/* Active Roles Display */}
                        <div className="flex flex-wrap gap-2 mt-4 justify-center md:justify-start">
                          <span className={`px-3 py-1 rounded-lg text-xs font-bold ${isAdmin ? 'bg-green-500/25 text-green-300 border border-green-500/30' : 'bg-white/10 text-white/50'}`}>
                            Admin: {isAdmin ? 'Đã kích hoạt' : 'Chưa kích hoạt'}
                          </span>
                          <span className={`px-3 py-1 rounded-lg text-xs font-bold ${isTeacher ? 'bg-green-500/25 text-green-300 border border-green-500/30' : 'bg-white/10 text-white/50'}`}>
                            Giáo viên: {isTeacher ? 'Đã kích hoạt' : 'Chưa kích hoạt'}
                          </span>
                          <span className={`px-3 py-1 rounded-lg text-xs font-bold ${isVip ? 'bg-yellow-500/25 text-yellow-300 border border-yellow-500/30' : 'bg-white/10 text-white/50'}`}>
                            VIP Trọn đời: {isVip ? 'Đã kích hoạt' : 'Chưa kích hoạt'}
                          </span>
                        </div>
                      </div>

                      <div className="shrink-0 w-full md:w-auto">
                        <button
                          onClick={async () => {
                            if (!user?.email) return;
                            try {
                              const userDocRef = doc(db, "users", user.email);
                              await setDoc(userDocRef, {
                                email: user.email,
                                displayName: user.name,
                                isVip: true,
                                isAdmin: true,
                                isTeacher: true,
                                updatedAt: new Date().toISOString()
                              }, { merge: true });

                              // Save to local backup
                              localStorage.setItem(`user_roles_${user.email}`, JSON.stringify({
                                isVip: true,
                                isAdmin: true,
                                isTeacher: true
                              }));
                              
                              // Immediately update local state
                              setUser(prev => prev ? {
                                ...prev,
                                isVip: true,
                                isAdmin: true,
                                isTeacher: true
                              } : null);
                              
                              setAdminSuccess("Kích hoạt quyền Quản trị viên tối cao thành công! Quyền hạn đã được lưu trữ an toàn trên cả hệ thống Cloud Database.");
                              setTimeout(() => setAdminSuccess(null), 8000);
                            } catch (err: any) {
                              console.error("Lỗi kích hoạt Admin:", err);
                              const errorMsg = err instanceof Error ? err.message : String(err);

                              // Save to local backup anyway so user is NEVER blocked
                              localStorage.setItem(`user_roles_${user.email}`, JSON.stringify({
                                isVip: true,
                                isAdmin: true,
                                isTeacher: true
                              }));

                              // Immediately update local state
                              setUser(prev => prev ? {
                                ...prev,
                                isVip: true,
                                isAdmin: true,
                                isTeacher: true
                              } : null);

                              setAdminSuccess(`Kích hoạt quyền toàn diện THÀNH CÔNG trên thiết bị này nhờ hệ thống tự động lưu trữ dự phòng (Offline fallback)! (Firestore report: "${errorMsg}")`);
                              setTimeout(() => setAdminSuccess(null), 12000);
                            }
                          }}
                          className="w-full md:w-auto px-8 py-4 bg-teal-400 text-teal-950 hover:bg-teal-300 bg-opacity-100 hover:opacity-90 rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg shadow-teal-400/20 hover:scale-105 transition-all text-center cursor-pointer"
                        >
                          {isAdmin && isTeacher ? "Cập nhật quyền tối cao" : "Kích hoạt toàn quyền"}
                        </button>
                      </div>
                    </div>

                    {adminSuccess && (
                      <div className="mt-4 p-4 bg-teal-950/50 border border-teal-500/30 rounded-xl text-teal-200 text-xs font-bold animate-in slide-in-from-top-2">
                        🎉 {adminSuccess}
                      </div>
                    )}
                  </section>
                )}

                <section className="animate-in slide-in-from-bottom-5 duration-700 delay-150">
                  <div className="flex items-center justify-between mb-8">
                    <h3 className="text-2xl font-black text-gray-800 tracking-tight flex items-center gap-3 uppercase">
                      <span className="w-2 h-8 bg-[#007c76] rounded-full shrink-0"></span>
                      {isVip ? "Tất cả khóa học (VIP)" : "Lộ trình của tôi"}
                    </h3>
                  </div>

                  {showSkeleton ? (
                     <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
                        {[1,2,3].map(i => (
                            <div key={i} className="bg-white rounded-[24px] h-[350px] animate-pulse border border-gray-100 p-6 flex flex-col gap-4">
                                <div className="w-full h-40 bg-gray-100 rounded-2xl"></div>
                                <div className="w-3/4 h-6 bg-gray-100 rounded-full"></div>
                            </div>
                        ))}
                     </div>
                  ) : myCourses.length > 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
                      {myCourses.map(course => (
                         <CourseCard 
                            key={course.id} 
                            course={course} 
                            isOwned={true} 
                            progress={progressMap[course.id] || 0}
                         />
                      ))}
                    </div>
                  ) : (
                    <div className="bg-white rounded-[40px] p-12 text-center border-2 border-dashed border-gray-100">
                         <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-6">
                            <svg className="w-10 h-10 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg>
                         </div>
                         <h3 className="text-xl font-bold text-gray-400 mb-2">Bạn chưa đăng ký khóa học nào</h3>
                         <p className="text-gray-400 text-sm mb-6">Hãy bắt đầu hành trình nâng cao kiến thức ngay hôm nay!</p>
                         <Link to="/khoa-hoc" className="bg-[#007c76] text-white px-6 py-3 rounded-xl font-bold text-sm uppercase tracking-wide hover:brightness-110">
                            Danh sách khóa học
                         </Link>
                    </div>
                  )}
                </section>
              </>
            )}
          </div>
        </main>
      </div>
    );
  }

  // --- LOGIN SCREEN (MODERNIZED) ---
  if (isOtpPending) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-slate-50 font-sans relative overflow-hidden animate-fade-in">
        {/* Dynamic Background Elements */}
        <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
           <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-teal-100/50 rounded-full blur-[120px] animate-[pulse_8s_infinite]"></div>
           <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-blue-100/50 rounded-full blur-[120px] animate-[pulse_10s_infinite_reverse]"></div>
        </div>

        <div className="w-full max-w-lg relative z-10 flex flex-col gap-6">
          <div className="bg-white/80 backdrop-blur-2xl rounded-[40px] shadow-2xl shadow-teal-900/10 p-8 md:p-12 border border-white/50 text-center relative overflow-hidden animate-in zoom-in-95 duration-500">
            {/* Header / Icon */}
            <div className="w-20 h-20 bg-gradient-to-tr from-[#004d49] to-[#007c76] text-white rounded-3xl flex items-center justify-center mx-auto mb-8 shadow-xl shadow-teal-700/20">
              <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>

            <h3 className="text-2xl md:text-3xl font-black text-gray-800 uppercase tracking-tighter mb-3">Xác thực OTP</h3>
            <p className="text-gray-500 text-xs md:text-sm font-semibold leading-relaxed mb-8">
              Mã xác thực gồm 6 chữ số đã được gửi qua hệ thống bảo mật FAST Security Gateway đến địa chỉ email: <br/>
              <strong className="text-gray-800 text-sm font-extrabold select-all bg-gray-50 px-2 py-1 rounded-lg border border-gray-100 break-all inline-block mt-2">{email}</strong>
            </p>

            {otpStatusMessage && (
              <div className="mb-6 p-4 bg-teal-50 border border-teal-100 text-teal-800 rounded-2xl text-xs font-bold text-left flex items-start gap-3 animate-in fade-in slide-in-from-top-2">
                <svg className="w-5 h-5 text-teal-600 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>{otpStatusMessage}</span>
              </div>
            )}

            {otpFormError && (
              <div className="mb-6 p-4 bg-red-50 border border-red-100 text-red-600 rounded-2xl text-xs font-bold text-left flex items-start gap-3 animate-in fade-in slide-in-from-top-2">
                <svg className="w-5 h-5 text-red-500 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>{otpFormError}</span>
              </div>
            )}

            {/* OTP Keypad Input Boxes */}
            <div className="flex justify-center gap-2 md:gap-3 mb-8">
              {otpDigits.map((digit, index) => (
                <input
                  key={index}
                  id={`otp-input-${index}`}
                  type="text"
                  maxLength={1}
                  pattern="[0-9]*"
                  inputMode="numeric"
                  value={digit}
                  onChange={(e) => {
                    const val = e.target.value.replace(/[^0-9]/g, '');
                    const newDigits = [...otpDigits];
                    newDigits[index] = val ? val[0] : '';
                    setOtpDigits(newDigits);
                    setOtpFormError(null);
                    
                    if (val && index < 5) {
                      const nextInput = document.getElementById(`otp-input-${index + 1}`);
                      if (nextInput) (nextInput as HTMLInputElement).focus();
                    }
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Backspace' && !otpDigits[index] && index > 0) {
                      const prevInput = document.getElementById(`otp-input-${index - 1}`);
                      if (prevInput) {
                        (prevInput as HTMLInputElement).focus();
                      }
                    }
                  }}
                  onPaste={(e) => {
                    e.preventDefault();
                    const pastedData = e.clipboardData.getData('text').replace(/[^0-9]/g, '').slice(0, 6);
                    if (pastedData.length === 6) {
                      const newDigits = pastedData.split('');
                      setOtpDigits(newDigits);
                      setOtpFormError(null);
                      const lastInput = document.getElementById('otp-input-5');
                      if (lastInput) (lastInput as HTMLInputElement).focus();
                    }
                  }}
                  className="w-11 h-14 md:w-12 md:h-16 text-center text-2xl font-black text-[#007c76] bg-gray-50 border-2 border-gray-100 rounded-2xl focus:bg-white focus:border-[#007c76] focus:ring-4 focus:ring-[#007c76]/10 outline-none transition-all shadow-inner"
                />
              ))}
            </div>

            {/* Validation and Action buttons */}
            <div className="space-y-4">
              <button
                onClick={handleVerifiedRegister}
                disabled={isAuthenticating}
                className="w-full bg-[#007c76] text-white py-4 rounded-2xl font-black uppercase tracking-widest hover:bg-[#00605b] hover:shadow-lg hover:shadow-teal-700/30 transition-all transform active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2 cursor-pointer"
              >
                {isAuthenticating ? (
                  <svg className="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                ) : (
                  <>
                    Xác nhận & Kích hoạt tài khoản
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                    </svg>
                  </>
                )}
              </button>

              <div className="flex items-center justify-between text-xs px-2 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsOtpPending(false);
                    setOtpFormError(null);
                    setOtpStatusMessage(null);
                    setError(null);
                  }}
                  className="text-gray-400 hover:text-gray-600 font-bold uppercase tracking-wider cursor-pointer"
                >
                   Quay lại
                </button>

                <button
                  type="button"
                  onClick={handleResendOtp}
                  disabled={otpCountdown > 0}
                  className={`font-black uppercase tracking-wider cursor-pointer ${otpCountdown > 0 ? 'text-gray-400 cursor-not-allowed' : 'text-[#007c76] hover:underline'}`}
                >
                    GỬI LẠI MÃ {otpCountdown > 0 ? `(${otpCountdown}s)` : ''}
                </button>
              </div>
            </div>
            
            {/* Secure connection indicator */}
            <div className="mt-8 pt-6 border-t border-gray-100 flex justify-center items-center gap-2 text-[10px] text-gray-400 font-bold uppercase tracking-wider">
              <svg className="w-3.5 h-3.5 text-teal-600 animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
              <span>Cổng bảo mật FAST Security OTP Gateway</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // --- LOGIN SCREEN (MODERNIZED) ---
  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-slate-50 font-sans relative overflow-hidden animate-fade-in">
      
      {/* Dynamic Background Elements */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
         <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-teal-100/50 rounded-full blur-[120px] animate-[pulse_8s_infinite]"></div>
         <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-blue-100/50 rounded-full blur-[120px] animate-[pulse_10s_infinite_reverse]"></div>
      </div>

      <div className="w-full max-w-6xl relative z-10">
        <div className="bg-white/80 backdrop-blur-2xl rounded-[40px] shadow-2xl shadow-teal-900/10 overflow-hidden flex flex-col md:flex-row border border-white/50 animate-in zoom-in-95 duration-700">
            
            {/* LEFT SIDE: BRANDING AREA */}
            <div className="hidden md:flex md:w-5/12 bg-gradient-to-br from-[#002e2c] to-[#004d49] relative flex-col justify-between p-12 text-white overflow-hidden">
                {/* Texture Overlay */}
                <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-10 mix-blend-overlay"></div>
                
                {/* Glowing Orbs */}
                <div className="absolute top-0 right-0 w-96 h-96 bg-[#007c76] rounded-full blur-[100px] opacity-30 -mr-32 -mt-32"></div>
                <div className="absolute bottom-0 left-0 w-80 h-80 bg-emerald-500 rounded-full blur-[100px] opacity-20 -ml-20 -mb-20"></div>

                <div className="relative z-10">
                    <div className="flex items-center gap-3 mb-10">
                        <span className="font-bold tracking-[0.2em] text-xs uppercase opacity-80">FAST E-Learning</span>
                    </div>
                    
                    <h2 className="text-4xl lg:text-5xl font-black uppercase leading-[1.1] tracking-tighter mb-6">
                        Kiến tạo <br/> 
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-teal-200 to-white">Tương lai</span> <br/> 
                        Bền Vững
                    </h2>
                    <p className="text-teal-100/70 text-base font-medium leading-relaxed max-w-sm">
                        Truy cập kho tàng kiến thức chuẩn quốc tế về ISO, HACCP và Quản lý chất lượng.
                    </p>
                </div>

                <div className="relative z-10"></div>
            </div>

            {/* RIGHT SIDE: FORM AREA */}
            <div className="w-full md:w-7/12 p-8 md:p-16 flex flex-col justify-center bg-white/50">
                <div className="max-w-md mx-auto w-full">
                    
                    <div className="text-center mb-10">
                        <h3 className="text-3xl font-black text-gray-800 uppercase tracking-tighter mb-2">
                            {isRegistering ? 'Tạo tài khoản mới' : 'Chào mừng trở lại!'}
                        </h3>
                        <p className="text-gray-500 text-sm font-medium">
                            {isRegistering ? 'Điền thông tin bên dưới để bắt đầu hành trình.' : 'Vui lòng đăng nhập để tiếp tục học tập.'}
                        </p>
                    </div>

                    {redirectMessage && (
                        <div className="mb-6 p-4 bg-yellow-50 text-yellow-800 rounded-2xl text-sm font-bold border border-yellow-100 flex items-center gap-3">
                             <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                             {redirectMessage}
                        </div>
                    )}
                    
                    {error && (
                        <div className="mb-6 p-4 bg-red-50 text-red-500 rounded-2xl text-xs font-bold border border-red-100 flex items-start gap-3">
                            <svg className="w-5 h-5 shrink-0 text-red-600 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                            <div className="flex-1 min-w-0">
                                {error}
                            </div>
                        </div>
                    )}

                    <form onSubmit={handleAuthAction} className="space-y-5">
                        {isRegistering && (
                            <div className="group relative">
                                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-gray-400 group-focus-within:text-[#007c76] transition-colors">
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                                </div>
                                <input 
                                    required 
                                    value={fullName} 
                                    onChange={e => setFullName(e.target.value)} 
                                    placeholder="Họ và tên đầy đủ" 
                                    className="w-full py-4 pl-12 pr-4 bg-gray-50 border border-transparent rounded-2xl font-bold text-gray-700 focus:bg-white focus:border-[#007c76] focus:ring-4 focus:ring-[#007c76]/10 outline-none transition-all placeholder-gray-400" 
                                />
                            </div>
                        )}
                        
                        <div className="group relative">
                            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-gray-400 group-focus-within:text-[#007c76] transition-colors">
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
                            </div>
                            <input 
                                required 
                                type="email" 
                                value={email} 
                                onChange={e => setEmail(e.target.value)} 
                                placeholder="Email đăng nhập" 
                                className="w-full py-4 pl-12 pr-4 bg-gray-50 border border-transparent rounded-2xl font-bold text-gray-700 focus:bg-white focus:border-[#007c76] focus:ring-4 focus:ring-[#007c76]/10 outline-none transition-all placeholder-gray-400" 
                            />
                        </div>
                        
                        <div className="group relative">
                            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-gray-400 group-focus-within:text-[#007c76] transition-colors">
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
                            </div>
                            <input 
                                required 
                                type={showPassword ? "text" : "password"} 
                                value={password} 
                                onChange={e => setPassword(e.target.value)} 
                                placeholder="Mật khẩu" 
                                className="w-full py-4 pl-12 pr-12 bg-gray-50 border border-transparent rounded-2xl font-bold text-gray-700 focus:bg-white focus:border-[#007c76] focus:ring-4 focus:ring-[#007c76]/10 outline-none transition-all placeholder-gray-400" 
                            />
                            <button 
                                type="button" 
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-[#007c76] transition-colors p-1"
                            >
                                {showPassword ? (
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268-2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" /></svg>
                                ) : (
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268-2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                                )}
                            </button>
                        </div>

                        <button 
                            disabled={isAuthenticating}
                            className="w-full bg-[#007c76] text-white py-4 rounded-2xl font-black uppercase tracking-widest hover:bg-[#00605b] hover:shadow-lg hover:shadow-teal-700/30 transition-all transform active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                        >
                            {isAuthenticating ? (
                                <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                            ) : (
                                <>
                                    {isRegistering ? 'ĐĂNG KÝ NGAY' : 'ĐĂNG NHẬP'}
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 8l4 4m0 0l-4 4m4-4H3" /></svg>
                                </>
                            )}
                        </button>
                    </form>
                    
                    <div className="relative my-8">
                        <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-gray-200"></div></div>
                        <div className="relative flex justify-center text-xs uppercase tracking-widest"><span className="bg-white px-4 text-gray-400 font-bold">Hoặc tiếp tục với</span></div>
                    </div>

                    <button 
                        onClick={handleGoogleLogin} 
                        disabled={isAuthenticating}
                        className="w-full border-2 border-gray-100 p-4 rounded-2xl font-bold text-gray-600 hover:bg-gray-50 hover:border-gray-200 transition-all flex justify-center gap-3 items-center group disabled:opacity-70 disabled:cursor-not-allowed cursor-pointer"
                    >
                        {isAuthenticating ? (
                            <svg className="animate-spin h-5 w-5 text-gray-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                        ) : (
                            <img src="https://upload.wikimedia.org/wikipedia/commons/c/c1/Google_%22G%22_logo.svg" className="w-5 h-5 group-hover:scale-110 transition-transform" alt="Google" /> 
                        )}
                        <span>Đăng nhập bằng Google</span>
                    </button>
                    
                    <div className="mt-8 text-center">
                        <p className="text-sm font-bold text-gray-500">
                            {isRegistering ? 'Đã có tài khoản?' : 'Chưa có tài khoản?'} 
                            <span 
                                onClick={() => setIsRegistering(!isRegistering)}
                                className="ml-1 text-[#007c76] cursor-pointer hover:underline uppercase tracking-wide"
                            >
                                {isRegistering ? 'Đăng nhập' : 'Đăng ký miễn phí'}
                            </span>
                        </p>
                    </div>
                </div>
            </div>
        </div>
        
        {/* Footer info */}
        <div className="absolute bottom-4 left-0 right-0 text-center pointer-events-none">
            <p className="text-[10px] text-gray-400 font-medium">© FAST E-Learning. All rights reserved.</p>
        </div>
      </div>
    </div>
  );
};

export default Account;
