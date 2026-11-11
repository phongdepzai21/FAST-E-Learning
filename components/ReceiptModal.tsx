import React, { useState } from 'react';
import { X, Printer, Download, CheckCircle2, Building, Mail, Phone, Calendar, ShieldCheck, FileText, Sparkles } from 'lucide-react';
import { useToast } from '../contexts/ToastContext';
import { generateTenDigitId, toTenDigitId } from '../utils/idGenerator';

export interface ReceiptData {
  receiptNo: string;
  issueDate: string;
  studentName: string;
  phone: string;
  email: string;
  companyName?: string;
  courseTitle: string;
  amount: number | string;
  amountText?: string;
  paymentMethod?: string;
  trainingType?: string;
  status?: string;
}

export interface ReceiptModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialData?: Partial<ReceiptData> | null;
}

export const ReceiptModal: React.FC<ReceiptModalProps> = ({
  isOpen,
  onClose,
  initialData
}) => {
  const toast = useToast();

  const todayStr = new Date().toISOString().slice(0, 10);
  const defaultReceiptNo = generateTenDigitId();

  const [studentName, setStudentName] = useState(initialData?.studentName || '');
  const [phone, setPhone] = useState(initialData?.phone || '');
  const [email, setEmail] = useState(initialData?.email || '');
  const [companyName, setCompanyName] = useState(initialData?.companyName || '');
  const [courseTitle, setCourseTitle] = useState(initialData?.courseTitle || 'Đào tạo An toàn Vệ sinh Thực phẩm (199K)');
  const [amount, setAmount] = useState<string>(initialData?.amount ? String(initialData.amount) : '199.000đ');
  const [issueDate, setIssueDate] = useState(initialData?.issueDate || todayStr);
  const [receiptNo, setReceiptNo] = useState(initialData?.receiptNo ? toTenDigitId(initialData.receiptNo) : defaultReceiptNo);
  const [isGenerated, setIsGenerated] = useState<boolean>(!!initialData?.studentName);

  if (!isOpen) return null;

  const handleGenerateReceipt = (e: React.FormEvent) => {
    e.preventDefault();
    if (!studentName.trim() || !phone.trim() || !email.trim()) {
      toast.showToast('Vui lòng điền đầy đủ Họ tên, Số điện thoại và Email!', 'error');
      return;
    }
    setIsGenerated(true);
    toast.showToast('Đã tạo Biên lai thu học phí thành công!', 'success');
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm overflow-y-auto">
      <div className="bg-white rounded-3xl max-w-2xl w-full border border-slate-200 shadow-2xl overflow-hidden my-8 animate-fade-in relative">
        {/* Header Bar */}
        <div className="bg-gradient-to-r from-slate-900 via-[#005c56] to-[#007c76] p-5 text-white flex items-center justify-between no-print">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center border border-white/20">
              <FileText className="w-5 h-5 text-teal-300" />
            </div>
            <div>
              <h3 className="font-black text-base text-white">Biên Lai Thu Học Phí Chính Thức</h3>
              <p className="text-[11px] text-teal-100 font-medium">Viện Đào Tạo & Kiểm Định ATTP FAST E-Learning</p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition border border-white/20 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form nhập thông tin nếu chưa khởi tạo biên lai */}
        {!isGenerated ? (
          <form onSubmit={handleGenerateReceipt} className="p-6 space-y-5 no-print">
            <div className="p-4 bg-teal-50 border border-teal-200 rounded-2xl text-xs text-teal-900 space-y-1">
              <p className="font-black uppercase tracking-wider text-[#007c76] flex items-center gap-1.5">
                <Sparkles className="w-4 h-4" />
                <span>TẠO BIÊN LAI NHANH CHO HỌC VIÊN / DOANH NGHIỆP</span>
              </p>
              <p className="font-medium text-slate-600">
                Chỉ cần điền <strong>Họ tên, SĐT, Email</strong> và <strong>Tên Cơ sở/Doanh nghiệp</strong> (nếu có), hệ thống tự động xuất Biên lai điện tử kèm con dấu Viện Đào Tạo FAST.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-black text-slate-700 mb-1">
                  Họ và tên học viên <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ví dụ: Nguyễn Văn An"
                  value={studentName}
                  onChange={(e) => setStudentName(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#007c76]"
                />
              </div>

              <div>
                <label className="block text-xs font-black text-slate-700 mb-1">
                  Số điện thoại <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ví dụ: 0987 654 321"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#007c76]"
                />
              </div>

              <div>
                <label className="block text-xs font-black text-slate-700 mb-1">
                  Email nhận biên lai <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  required
                  placeholder="hocvien@gmail.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#007c76]"
                />
              </div>

              <div>
                <label className="block text-xs font-black text-slate-700 mb-1">
                  Tên Cơ sở / Doanh nghiệp (Tùy chọn)
                </label>
                <input
                  type="text"
                  placeholder="Ví dụ: Công ty Thực phẩm An Bình"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#007c76]"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-black text-slate-700 mb-1">
                  Tên khóa đào tạo
                </label>
                <input
                  type="text"
                  value={courseTitle}
                  onChange={(e) => setCourseTitle(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#007c76]"
                />
              </div>

              <div>
                <label className="block text-xs font-black text-slate-700 mb-1">Số tiền học phí</label>
                <input
                  type="text"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-[#007c76] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#007c76]"
                />
              </div>

              <div>
                <label className="block text-xs font-black text-slate-700 mb-1">Ngày lập biên lai</label>
                <input
                  type="date"
                  value={issueDate}
                  onChange={(e) => setIssueDate(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#007c76]"
                />
              </div>
            </div>

            <button
              type="submit"
              className="w-full py-3.5 bg-[#007c76] hover:bg-[#005c56] text-white font-black text-xs uppercase tracking-widest rounded-2xl shadow-lg shadow-[#007c76]/20 transition cursor-pointer"
            >
              Xuất Biên Lai Ngay
            </button>
          </form>
        ) : (
          /* Khối Biên lai thu học phí có thể in */
          <div className="p-6 sm:p-8 space-y-6">
            <div className="receipt-paper border-4 border-slate-900 p-6 sm:p-8 rounded-2xl bg-gradient-to-b from-amber-50/20 via-white to-teal-50/20 relative shadow-inner space-y-6">
              {/* Top Receipt Header */}
              <div className="flex flex-col sm:flex-row justify-between items-start border-b-2 border-slate-900 pb-4 gap-4">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="w-8 h-8 rounded-lg bg-[#007c76] text-white font-black text-sm flex items-center justify-center">F</span>
                    <h2 className="font-black text-lg text-slate-900 uppercase tracking-tight">VIỆN ĐÀO TẠO FAST E-LEARNING</h2>
                  </div>
                  <p className="text-[11px] text-slate-600 font-medium">Trung Tâm Kiểm Định & Tập Huấn An Toàn Thực Phẩm Quốc Gia</p>
                  <p className="text-[10px] text-slate-500">Số 18 Phố Nguyễn Cơ Thạch, Q. Nam Từ Liêm, TP. Hà Nội • Hotline: 0927 002 668</p>
                </div>

                <div className="text-left sm:text-right font-mono">
                  <span className="inline-block bg-slate-900 text-white font-black text-xs px-3 py-1 rounded">
                    MÃ BL: {receiptNo}
                  </span>
                  <p className="text-[10px] text-slate-500 font-bold mt-1">Ngày: {issueDate}</p>
                </div>
              </div>

              {/* Title */}
              <div className="text-center space-y-1">
                <h1 className="text-xl sm:text-2xl font-black text-slate-900 uppercase tracking-wider">BIÊN LAI THU HỌC PHÍ</h1>
                <p className="text-xs text-[#007c76] font-bold italic">(Xác nhận đã thanh toán hoàn tất)</p>
              </div>

              {/* Information Table */}
              <div className="space-y-3 text-xs sm:text-sm">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-4 bg-slate-50 rounded-xl border border-slate-200">
                  <div>
                    <span className="text-slate-500 font-bold block text-[11px]">Họ tên học viên:</span>
                    <span className="font-black text-slate-900 text-sm uppercase">{studentName}</span>
                  </div>

                  <div>
                    <span className="text-slate-500 font-bold block text-[11px]">Số điện thoại / Zalo:</span>
                    <span className="font-black text-slate-900 font-mono">{phone}</span>
                  </div>

                  <div>
                    <span className="text-slate-500 font-bold block text-[11px]">Email nhận biên lai:</span>
                    <span className="font-bold text-slate-800">{email}</span>
                  </div>

                  <div>
                    <span className="text-slate-500 font-bold block text-[11px]">Cơ sở / Doanh nghiệp:</span>
                    <span className="font-bold text-slate-800">{companyName || 'Cá nhân'}</span>
                  </div>
                </div>

                <div className="p-4 bg-teal-50/60 rounded-xl border border-teal-200 space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-slate-600 font-bold">Khóa đào tạo:</span>
                    <span className="font-black text-[#007c76] text-right">{courseTitle}</span>
                  </div>

                  <div className="flex justify-between items-center border-t border-teal-100 pt-2">
                    <span className="text-slate-600 font-bold">Số tiền học phí:</span>
                    <span className="font-black text-slate-900 text-base">{amount}</span>
                  </div>

                  <div className="flex justify-between items-center text-[11px] text-teal-800 italic">
                    <span>Bằng chữ:</span>
                    <span className="font-bold">Một trăm chín mươi chín nghìn đồng chẵn</span>
                  </div>
                </div>
              </div>

              {/* Signatures */}
              <div className="pt-6 border-t border-slate-200 grid grid-cols-2 text-center text-xs">
                <div>
                  <p className="font-bold text-slate-600">Người nộp tiền</p>
                  <p className="text-[10px] text-slate-400 italic">(Ký, ghi rõ họ tên)</p>
                  <div className="h-16 flex items-end justify-center font-bold text-slate-800">{studentName}</div>
                </div>

                <div>
                  <p className="font-bold text-slate-600">Đại diện Trung Tâm FAST</p>
                  <p className="text-[10px] text-slate-400 italic">(Đã xác nhận chuyển khoản)</p>
                  <div className="h-16 flex items-center justify-center">
                    <span className="px-3 py-1 bg-emerald-100 text-emerald-800 border border-emerald-300 font-black rounded-lg text-[10px] uppercase tracking-wider flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      ĐÃ DỤYỆT THU HỌC PHÍ
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex flex-wrap gap-3 no-print">
              <button
                type="button"
                onClick={() => setIsGenerated(false)}
                className="px-4 py-2.5 rounded-xl border border-slate-300 text-slate-700 font-bold text-xs uppercase tracking-wider hover:bg-slate-50 transition cursor-pointer"
              >
                Chỉnh sửa thông tin
              </button>

              <button
                type="button"
                onClick={handlePrint}
                className="flex-1 py-2.5 bg-[#007c76] hover:bg-[#005c56] text-white font-black text-xs uppercase tracking-wider rounded-xl shadow-lg shadow-[#007c76]/20 transition flex items-center justify-center gap-2 cursor-pointer"
              >
                <Printer className="w-4 h-4" />
                <span>In / Tải về Biên Lai PDF</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
