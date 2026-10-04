import React, { useState } from 'react';
import { useToast } from '../contexts/ToastContext';

interface LookupResult {
  success: boolean;
  suffix: string;
  targetCode: string;
  studentEmail: string | null;
  studentProfile: any;
  pendingOrder: any;
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
    if (!inputCode.trim()) {
      toast.error("Vui lòng nhập mã thanh toán.");
      return;
    }

    setIsLoading(true);
    setResult(null);

    try {
      const url = `/api/payment/lookup?code=${encodeURIComponent(inputCode.trim())}`;
      const res = await fetch(url);
      const data = await res.json();

      if (res.ok && data.success) {
        setResult(data);
        if (data.studentEmail) {
          toast.success("Đã tìm thấy học viên tương ứng!");
        } else {
          toast.info("Mã hợp lệ nhưng chưa gắn với thông tin thanh toán hoặc học viên nào.");
        }
      } else {
        toast.error(data.error || "Có lỗi xảy ra khi tra cứu.");
      }
    } catch (err: any) {
      console.error(err);
      toast.error("Lỗi kết nối đến máy chủ.");
    } finally {
      setIsLoading(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Đã sao chép vào bộ nhớ tạm!");
  };

  return (
    <div className="space-y-6 animate-in slide-in-from-bottom-5 duration-500">
      {/* Title Header */}
      <div>
        <h3 className="text-2xl font-black text-slate-800 tracking-tight flex items-center gap-3 uppercase">
          <span className="w-2 h-8 bg-teal-500 rounded-full shrink-0"></span>
          Truy Vết Giao Dịch & Thanh Toán (Payment Trace)
        </h3>
        <p className="text-gray-500 text-xs font-semibold mt-1">
          Hệ thống truy vết chéo thời gian thực tìm kiếm qua bộ sưu tập 'payment_logs' và 'users' để tìm Email học viên liên kết cùng trạng thái giao dịch hiện tại dựa trên mã chuyển khoản.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Side: Search Form */}
        <div className="lg:col-span-5 bg-white p-6 rounded-3xl border border-gray-150 shadow-sm space-y-4 h-fit">
          <h4 className="font-extrabold text-sm text-gray-800 uppercase tracking-wider pb-2 border-b border-gray-100">Truy vết Giao dịch</h4>
          
          <form onSubmit={handleLookup} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Mã chuyển khoản hoặc Số đuôi FAST</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={inputCode}
                  onChange={(e) => setInputCode(e.target.value)}
                  placeholder="Ví dụ: FAST 128492 hoặc 128492"
                  className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl text-sm font-bold focus:outline-none focus:border-teal-500 text-slate-800"
                />
                <button
                  type="submit"
                  disabled={isLoading}
                  className="px-6 bg-[#007c76] hover:bg-[#00605b] text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all disabled:opacity-50 flex items-center justify-center cursor-pointer shrink-0"
                >
                  {isLoading ? (
                    <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                  ) : (
                    "Tìm kiếm"
                  )}
                </button>
              </div>
              <p className="text-[10px] text-gray-400 font-semibold leading-normal">Hệ thống chấp nhận mã thô tự do. Các tiền tố, khoảng trắng hoặc ký tự phân cách sẽ được tự động làm sạch.</p>
            </div>
          </form>

          {/* Quick Preset Buttons for testing */}
          <div className="space-y-2 pt-2">
            <span className="text-[10px] font-black uppercase text-gray-400 tracking-wider block">Mẹo nhanh:</span>
            <div className="flex flex-wrap gap-2 text-[10px] font-bold">
              <button
                onClick={() => setInputCode("FAST 128492")}
                className="px-2.5 py-1.5 bg-gray-100 hover:bg-gray-200 text-slate-700 rounded-lg cursor-pointer transition-colors"
              >
                FAST 128492
              </button>
              <button
                onClick={() => setInputCode("128492")}
                className="px-2.5 py-1.5 bg-gray-100 hover:bg-gray-200 text-slate-700 rounded-lg cursor-pointer transition-colors"
              >
                Chỉ nhập số "128492"
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
                  <span className="text-[9px] font-black uppercase text-slate-400 tracking-wider">Mã nhận diện chuẩn hóa</span>
                  <h4 className="text-xl font-black text-slate-800 font-mono tracking-tight mt-0.5">{result.targetCode}</h4>
                </div>
                
                {/* Status Badges */}
                {result.status === 'pending_payment' ? (
                  <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-xl text-[10px] font-black uppercase tracking-wider border border-blue-200">
                    Pending (Chờ chuyển khoản)
                  </span>
                ) : result.status === 'completed' ? (
                  <span className="px-3 py-1 bg-green-100 text-green-800 rounded-xl text-[10px] font-black uppercase tracking-wider border border-green-200">
                    Completed (Kích hoạt thành công)
                  </span>
                ) : (
                  <span className="px-3 py-1 bg-gray-100 text-gray-600 rounded-xl text-[10px] font-black uppercase tracking-wider border border-gray-200">
                    No Order (Chưa có đơn hàng)
                  </span>
                )}
              </div>

              {/* Step 1: Student Email Found */}
              <div className="p-4 bg-teal-50/55 rounded-2xl border border-teal-100 space-y-2 relative overflow-hidden">
                <span className="text-[9px] font-black text-[#007c76] uppercase tracking-wider block">Học viên kết nối (Student Email Link)</span>
                {result.studentEmail ? (
                  <div className="flex items-center justify-between gap-4">
                    <p className="font-mono text-base font-black text-teal-950 select-all">{result.studentEmail}</p>
                    <button
                      onClick={() => copyToClipboard(result.studentEmail || '')}
                      className="px-3 py-1.5 bg-[#007c76] hover:bg-[#00605b] text-white text-[10px] font-black uppercase tracking-wider rounded-lg shadow-sm transition-colors cursor-pointer shrink-0"
                    >
                      Sao chép Email
                    </button>
                  </div>
                ) : (
                  <p className="text-sm font-bold text-gray-400 italic">Không tìm thấy địa chỉ Email liên kết trực tiếp với mã này.</p>
                )}
              </div>

              {/* Student profile details if found */}
              {result.studentProfile && (
                <div className="space-y-2">
                  <h5 className="font-extrabold text-xs text-gray-700 uppercase tracking-wider">Hồ sơ Học viên</h5>
                  <div className="grid grid-cols-2 gap-4 text-xs font-semibold text-slate-600 bg-gray-50 p-4 rounded-2xl border border-gray-100">
                    <p>Họ tên: <span className="font-extrabold text-slate-800">{result.studentProfile.displayName || result.studentProfile.fullName || "N/A"}</span></p>
                    <p>Vai trò: <span className="font-extrabold text-slate-800 uppercase text-[10px] bg-slate-200 px-1.5 py-0.5 rounded">{result.studentProfile.role || "N/A"}</span></p>
                    <p>Trạng thái tài khoản: <span className="font-extrabold text-teal-700 uppercase">{result.studentProfile.status || "approved"}</span></p>
                    <p>Ngày tạo: <span className="font-extrabold text-slate-800 font-mono">{result.studentProfile.createdAt ? new Date(result.studentProfile.createdAt).toLocaleDateString('vi-VN') : "N/A"}</span></p>
                  </div>
                </div>
              )}

              {/* Pending payment details if found */}
              {result.pendingOrder && (
                <div className="space-y-2">
                  <h5 className="font-extrabold text-xs text-blue-800 uppercase tracking-wider flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></span>
                    Thông tin Đơn hàng Chờ duyệt
                  </h5>
                  <div className="text-xs font-semibold text-slate-600 bg-blue-50/40 p-4 rounded-2xl border border-blue-100 space-y-1.5">
                    <p>Khóa học mua: <span className="font-extrabold text-slate-800">{result.pendingOrder.courseId}</span></p>
                    <p>Số tiền phải trả: <span className="font-black text-blue-700">{Number(result.pendingOrder.amount || 0).toLocaleString('vi-VN')} VND</span></p>
                    <p>Thời gian khởi tạo đơn: <span className="font-mono text-slate-800">{new Date(result.pendingOrder.createdAt).toLocaleString('vi-VN')}</span></p>
                  </div>
                </div>
              )}

              {/* logs history if found */}
              {result.logsCount > 0 && (
                <div className="space-y-2">
                  <h5 className="font-extrabold text-xs text-slate-700 uppercase tracking-wider">Lịch sử tín hiệu ghi nhận ({result.logsCount} bản ghi)</h5>
                  <div className="border border-gray-100 rounded-2xl overflow-hidden divide-y divide-gray-100 text-[10px] font-semibold text-slate-500">
                    {result.logs.map((log: any, idx: number) => (
                      <div key={idx} className="p-3 flex items-center justify-between gap-3 bg-slate-50/30">
                        <div className="truncate pr-4">
                          <span className={`px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-wider ${
                            log.status === 'success' ? 'bg-green-100 text-green-800' : 'bg-rose-100 text-rose-800'
                          }`}>
                            {log.status}
                          </span>
                          <span className="font-extrabold text-slate-700 pl-2">{log.errorMessage || "Giao dịch thanh toán tự động"}</span>
                        </div>
                        <span className="font-mono text-[9px] text-gray-400 shrink-0">{new Date(log.timestamp).toLocaleTimeString('vi-VN')}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-16 text-center text-gray-400 space-y-3 flex-1">
              <span className="text-4xl">🔍</span>
              <div className="space-y-1">
                <p className="font-black text-xs uppercase tracking-wider text-slate-700">Chưa có kết quả tìm kiếm</p>
                <p className="text-[10px] font-semibold text-gray-400 max-w-xs">Nhập mã chuyển khoản FAST ở ô bên trái để tiến hành rà soát chéo dữ liệu thời gian thực.</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
