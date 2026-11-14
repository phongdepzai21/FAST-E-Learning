import React, { useState } from 'react';
import { useToast } from '../contexts/ToastContext';
import { collection, getDocs, doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { toTenDigitId } from '../utils/idGenerator';
import { CheckCircle2, Search, Sparkles, User, Phone, Mail, Calendar, Video, MapPin, Copy, ShieldCheck } from 'lucide-react';

interface LookupResult {
  success: boolean;
  suffix: string;
  targetCode: string;
  studentEmail: string | null;
  studentPhone?: string | null;
  studentProfile: any;
  pendingOrder: any;
  registration?: any;
  logsCount: number;
  logs: any[];
  status: 'pending_payment' | 'completed' | 'unknown';
}

export const FastCodeLookup: React.FC = () => {
  const toast = useToast();
  const [inputCode, setInputCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<LookupResult | null>(null);

  const handleLookup = async (e: React.FormEvent) => {
    e.preventDefault();
    const queryTerm = inputCode.trim();
    if (!queryTerm) {
      toast.showToast("Vui lòng nhập mã thanh toán, mã hồ sơ hoặc số điện thoại.", "error");
      return;
    }

    setIsLoading(true);
    setResult(null);

    try {
      // 1. Call server endpoint first
      const url = `/api/payment/lookup?code=${encodeURIComponent(queryTerm)}`;
      const res = await fetch(url);
      let data: LookupResult | null = null;
      if (res.ok) {
        data = await res.json();
      }

      // 2. Client-side Firestore fallback matching if API returns empty registration & email
      if (!data || (!data.registration && !data.studentEmail && !data.pendingOrder)) {
        const cleanTerm = queryTerm.replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
        const digitsOnly = queryTerm.replace(/[^\d]/g, '');

        let foundReg: any = null;
        let foundEmail: string | null = null;
        let foundPhone: string | null = null;

        // Query live_course_registrations
        const snap = await getDocs(collection(db, 'live_course_registrations'));
        snap.forEach((docSnap) => {
          const reg = { id: docSnap.id, ...docSnap.data() } as any;
          const regId = (reg.id || '').toLowerCase();
          const memo = (reg.paymentMemo || '').toLowerCase();
          const phone = (reg.phone || '').replace(/[^\d]/g, '');
          const email = (reg.email || reg.userEmail || '').toLowerCase();
          const studentName = (reg.studentName || '').toLowerCase();

          if (
            regId.includes(cleanTerm) ||
            (digitsOnly && regId.includes(digitsOnly)) ||
            memo.includes(cleanTerm) ||
            (digitsOnly && memo.includes(digitsOnly)) ||
            (phone && digitsOnly && (phone.includes(digitsOnly) || digitsOnly.includes(phone))) ||
            (email && email.includes(cleanTerm)) ||
            (studentName && studentName.includes(cleanTerm))
          ) {
            if (!foundReg) {
              foundReg = reg;
              foundEmail = reg.email || reg.userEmail || null;
              foundPhone = reg.phone || null;
            }
          }
        });

        // Get user profile if email found
        let foundProfile: any = null;
        if (foundEmail) {
          try {
            const userSnap = await getDoc(doc(db, 'users', foundEmail.toLowerCase()));
            if (userSnap.exists()) {
              foundProfile = userSnap.data();
            }
          } catch (e) {}
        }

        data = {
          success: true,
          suffix: digitsOnly || cleanTerm,
          targetCode: queryTerm.toUpperCase(),
          studentEmail: foundEmail,
          studentPhone: foundPhone,
          studentProfile: foundProfile,
          pendingOrder: null,
          registration: foundReg,
          logsCount: data?.logsCount || 0,
          logs: data?.logs || [],
          status: foundReg ? (foundReg.status === 'confirmed' || foundReg.status === 'completed' ? 'completed' : 'pending_payment') : 'unknown'
        };
      }

      if (data && data.success) {
        setResult(data);
        if (data.registration || data.studentEmail) {
          toast.showToast("Đã tìm thấy thông tin hồ sơ giao dịch!", "success");
        } else {
          toast.showToast("Mã hợp lệ nhưng chưa gắn với thông tin thanh toán hoặc học viên nào.", "info");
        }
      } else {
        toast.showToast("Có lỗi xảy ra khi tra cứu.", "error");
      }
    } catch (err: any) {
      console.error(err);
      toast.showToast("Lỗi kết nối đến máy chủ tra cứu.", "error");
    } finally {
      setIsLoading(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.showToast("Đã sao chép vào bộ nhớ tạm!", "success");
  };

  return (
    <div className="space-y-6 animate-in slide-in-from-bottom-5 duration-500">
      {/* Title Header */}
      <div>
        <h3 className="text-2xl font-black text-slate-800 tracking-tight flex items-center gap-3 uppercase">
          <span className="w-2.5 h-8 bg-[#007c76] rounded-full shrink-0"></span>
          Truy Vết Giao Dịch &amp; Hồ Sơ Đăng Ký (Payment Trace)
        </h3>
        <p className="text-gray-500 text-xs font-semibold mt-1">
          Hệ thống rà soát thời gian thực qua mã số hồ sơ, số điện thoại, nội dung chuyển khoản và Email đăng ký.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Side: Search Form */}
        <div className="lg:col-span-5 bg-white p-6 rounded-3xl border border-gray-150 shadow-sm space-y-4 h-fit">
          <h4 className="font-extrabold text-sm text-gray-800 uppercase tracking-wider pb-2 border-b border-gray-100">
            Truy vết Hồ sơ Giao dịch
          </h4>
          
          <form onSubmit={handleLookup} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                Mã chuyển khoản / Số điện thoại / Mã 10 số
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={inputCode}
                  onChange={(e) => setInputCode(e.target.value)}
                  placeholder="VD: DAOTAO 091234 5678, SĐT hoặc Mã hồ sơ"
                  className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl text-sm font-bold focus:outline-none focus:border-[#007c76] text-slate-800"
                />
                <button
                  type="submit"
                  disabled={isLoading}
                  className="px-6 bg-[#007c76] hover:bg-[#00605b] text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all disabled:opacity-50 flex items-center justify-center cursor-pointer shrink-0 shadow-md shadow-[#007c76]/20"
                >
                  {isLoading ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  ) : (
                    "Tìm kiếm"
                  )}
                </button>
              </div>
              <p className="text-[10px] text-gray-400 font-semibold leading-normal">
                Hệ thống tự động lọc sạch các tiền tố (DAOTAO, FAST, #, khoảng trắng) để tìm chính xác hồ sơ.
              </p>
            </div>
          </form>

          {/* Quick Preset Buttons */}
          <div className="space-y-2 pt-2">
            <span className="text-[10px] font-black uppercase text-gray-400 tracking-wider block">Gợi ý tìm kiếm nhanh:</span>
            <div className="flex flex-wrap gap-2 text-[10px] font-bold">
              <button
                type="button"
                onClick={() => setInputCode("DAOTAO")}
                className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg cursor-pointer transition-colors"
              >
                DAOTAO
              </button>
              <button
                type="button"
                onClick={() => setInputCode("0927002668")}
                className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg cursor-pointer transition-colors"
              >
                Tra cứu SĐT 0927 002 668
              </button>
            </div>
          </div>
        </div>

        {/* Right Side: Analysis Results */}
        <div className="lg:col-span-7 bg-white p-6 md:p-8 rounded-3xl border border-gray-150 shadow-sm min-h-[300px] flex flex-col justify-between">
          {result ? (
            <div className="space-y-6">
              <div className="flex justify-between items-start pb-4 border-b border-gray-100 flex-wrap gap-3">
                <div>
                  <span className="text-[9px] font-black uppercase text-slate-400 tracking-wider">Từ khóa tra cứu</span>
                  <h4 className="text-xl font-black text-slate-800 font-mono tracking-tight mt-0.5">{result.targetCode}</h4>
                </div>
                
                {/* Status Badges */}
                {result.status === 'completed' ? (
                  <span className="px-3 py-1 bg-emerald-100 text-emerald-800 rounded-xl text-[10px] font-black uppercase tracking-wider border border-emerald-200">
                    Đã xác nhận thanh toán
                  </span>
                ) : result.status === 'pending_payment' ? (
                  <span className="px-3 py-1 bg-amber-100 text-amber-800 rounded-xl text-[10px] font-black uppercase tracking-wider border border-amber-200">
                    Đang chờ duyệt học phí
                  </span>
                ) : (
                  <span className="px-3 py-1 bg-gray-100 text-gray-600 rounded-xl text-[10px] font-black uppercase tracking-wider border border-gray-200">
                    Chưa có đơn hàng
                  </span>
                )}
              </div>

              {/* Matched Registration Record */}
              {result.registration && (
                <div className="p-5 bg-teal-50/70 rounded-2xl border border-teal-200 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-black text-[#007c76] uppercase tracking-wider flex items-center gap-1.5">
                      <Sparkles className="w-4 h-4" />
                      Hồ sơ Khóa Đào Tạo Tìm Thấy
                    </span>
                    <span className="font-mono font-black text-xs text-slate-900 bg-white px-2.5 py-1 rounded border border-slate-200">
                      #{toTenDigitId(result.registration.id)}
                    </span>
                  </div>

                  <div className="space-y-1.5 text-xs text-slate-700">
                    <p className="font-black text-sm text-slate-900">{result.registration.courseTitle}</p>
                    <div className="grid grid-cols-2 gap-2 pt-1 font-semibold">
                      <p>Họ tên: <strong className="text-slate-900">{result.registration.studentName}</strong></p>
                      <p>SĐT / Zalo: <strong className="font-mono text-slate-900">{result.registration.phone}</strong></p>
                      <p>Hình thức: <strong className="text-emerald-700">{result.registration.trainingTypeLabel || result.registration.trainingType}</strong></p>
                      <p>Học phí: <strong className="text-emerald-700">{result.registration.totalPrice || result.registration.price}</strong></p>
                    </div>
                  </div>
                </div>
              )}

              {/* Student Email & Phone */}
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
                <span className="text-[9px] font-black text-slate-500 uppercase tracking-wider block">Thông tin liên hệ học viên</span>
                {result.studentEmail || result.studentPhone ? (
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                    <div>
                      {result.studentEmail && <p className="font-mono font-black text-slate-900">{result.studentEmail}</p>}
                      {result.studentPhone && <p className="font-mono font-bold text-slate-600">SĐT: {result.studentPhone}</p>}
                    </div>
                    {result.studentEmail && (
                      <button
                        type="button"
                        onClick={() => copyToClipboard(result.studentEmail || '')}
                        className="px-3 py-1.5 bg-[#007c76] hover:bg-[#00605b] text-white text-[10px] font-black uppercase tracking-wider rounded-lg transition cursor-pointer self-start sm:self-auto"
                      >
                        Sao chép Email
                      </button>
                    )}
                  </div>
                ) : (
                  <p className="text-xs font-bold text-gray-400 italic">Không tìm thấy địa chỉ Email liên kết trực tiếp.</p>
                )}
              </div>

              {/* Student profile details if found */}
              {result.studentProfile && (
                <div className="space-y-2">
                  <h5 className="font-extrabold text-xs text-gray-700 uppercase tracking-wider">Tài khoản Học viên</h5>
                  <div className="grid grid-cols-2 gap-4 text-xs font-semibold text-slate-600 bg-slate-50 p-4 rounded-2xl border border-slate-200">
                    <p>Họ tên: <span className="font-extrabold text-slate-800">{result.studentProfile.displayName || result.studentProfile.fullName || "N/A"}</span></p>
                    <p>Vai trò: <span className="font-extrabold text-slate-800 uppercase text-[10px] bg-slate-200 px-1.5 py-0.5 rounded">{result.studentProfile.role || "học viên"}</span></p>
                    <p>Trạng thái: <span className="font-extrabold text-emerald-700 uppercase">{result.studentProfile.status || "đã kích hoạt"}</span></p>
                    <p>Ngày đăng ký: <span className="font-extrabold text-slate-800 font-mono">{result.studentProfile.createdAt ? new Date(result.studentProfile.createdAt).toLocaleDateString('vi-VN') : "N/A"}</span></p>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-16 text-center text-gray-400 space-y-3 flex-1">
              <span className="text-4xl">🔍</span>
              <div className="space-y-1">
                <p className="font-black text-xs uppercase tracking-wider text-slate-700">Chưa có kết quả tìm kiếm</p>
                <p className="text-[10px] font-semibold text-gray-400 max-w-xs">Nhập mã chuyển khoản, SĐT hoặc mã số hồ sơ 10 số ở ô bên trái để tiến hành rà soát chéo.</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default FastCodeLookup;
