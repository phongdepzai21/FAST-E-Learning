import React, { useEffect, useMemo, useRef, useState } from 'react';
import { X, Printer, Download, CheckCircle2, FileText, Sparkles, Clock, Mail, Edit3 } from 'lucide-react';
import { useToast } from '../contexts/ToastContext';
import { generateTenDigitId, toTenDigitId } from '../utils/idGenerator';
import {
  amountToVietnameseWords,
  downloadWhiteReceiptPdf,
  FAST_COMPANY_LOGO_URL,
  formatReceiptAmount,
  formatWebhookDateTime,
  ReceiptLineItem,
  resolveReceiptLineItems,
} from '../utils/receiptPdf';

export interface ReceiptData {
  receiptNo: string;
  issueDate: string;
  paidAt?: string;
  webhookReceivedAt?: string;
  paymentCode?: string;
  transactionId?: string;
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
  participantCount?: number;
  items?: ReceiptLineItem[];
  subtotalAmount?: number;
  discountAmount?: number;
  taxAmount?: number;
}

export interface ReceiptModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialData?: Partial<ReceiptData> | null;
  readOnly?: boolean;
}

export const ReceiptModal: React.FC<ReceiptModalProps> = ({
  isOpen,
  onClose,
  initialData,
  readOnly = false,
}) => {
  const toast = useToast();
  const sheetScrollRef = useRef<HTMLDivElement>(null);
  const isImmutable = Boolean(readOnly);

  const [studentName, setStudentName] = useState(initialData?.studentName || '');
  const [phone, setPhone] = useState(initialData?.phone || '');
  const [email, setEmail] = useState(initialData?.email || '');
  const [companyName, setCompanyName] = useState(initialData?.companyName || '');
  const [courseTitle, setCourseTitle] = useState(
    initialData?.courseTitle || 'Đào tạo An toàn Vệ sinh Thực phẩm Chuyên sâu'
  );
  const [amount, setAmount] = useState<string>(
    initialData?.amount !== undefined && initialData?.amount !== null ? String(initialData.amount) : '299.000đ'
  );
  const [issueDate, setIssueDate] = useState(initialData?.issueDate || new Date().toISOString().slice(0, 10));
  const [paidAt, setPaidAt] = useState(
    initialData?.webhookReceivedAt || initialData?.paidAt || initialData?.issueDate || new Date().toISOString()
  );
  const [paymentCode, setPaymentCode] = useState(initialData?.paymentCode || '');
  const [transactionId, setTransactionId] = useState(initialData?.transactionId || '');
  const [paymentMethod, setPaymentMethod] = useState(
    initialData?.paymentMethod || 'Chuyển khoản VietQR (SePay · ACB 0989499568)'
  );
  const [receiptNo, setReceiptNo] = useState(
    initialData?.receiptNo ? toTenDigitId(initialData.receiptNo) : generateTenDigitId()
  );
  const [participantCount, setParticipantCount] = useState<number>(initialData?.participantCount || 1);
  const [logoError, setLogoError] = useState(false);
  const [isGenerated, setIsGenerated] = useState<boolean>(
    Boolean(initialData?.email || initialData?.studentName)
  );
  const [isDownloadingPdf, setIsDownloadingPdf] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    const nowIso = new Date().toISOString();
    const resolvedPaidAt =
      initialData?.webhookReceivedAt ||
      initialData?.paidAt ||
      initialData?.issueDate ||
      nowIso;

    setStudentName(initialData?.studentName || '');
    setPhone(initialData?.phone || '');
    setEmail(initialData?.email || '');
    setCompanyName(initialData?.companyName || '');
    setCourseTitle(initialData?.courseTitle || 'Đào tạo An toàn Vệ sinh Thực phẩm Chuyên sâu');
    setAmount(
      initialData?.amount !== undefined && initialData?.amount !== null
        ? String(initialData.amount)
        : '299.000đ'
    );
    setIssueDate(initialData?.issueDate || resolvedPaidAt.slice(0, 10));
    setPaidAt(resolvedPaidAt);
    setPaymentCode(initialData?.paymentCode || '');
    setTransactionId(initialData?.transactionId || '');
    setPaymentMethod(initialData?.paymentMethod || 'Chuyển khoản VietQR (SePay · ACB 0989499568)');
    setReceiptNo(initialData?.receiptNo ? toTenDigitId(initialData.receiptNo) : generateTenDigitId());
    setParticipantCount(initialData?.participantCount || 1);
    setIsGenerated(Boolean(readOnly || initialData?.email || initialData?.studentName));
    setTimeout(() => {
      sheetScrollRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
    }, 60);
  }, [isOpen, initialData, readOnly]);

  const summaryData = useMemo(() => {
    return resolveReceiptLineItems({
      courseTitle,
      amount,
      trainingType: initialData?.trainingType,
      participantCount,
      items: initialData?.items,
      subtotalAmount: initialData?.subtotalAmount,
      discountAmount: initialData?.discountAmount,
      taxAmount: initialData?.taxAmount,
    });
  }, [
    courseTitle,
    amount,
    participantCount,
    initialData?.trainingType,
    initialData?.items,
    initialData?.subtotalAmount,
    initialData?.discountAmount,
    initialData?.taxAmount,
  ]);

  if (!isOpen) return null;

  const formattedPaidTime = formatWebhookDateTime(paidAt || issueDate);
  const effectiveTotal = summaryData.grandTotal > 0 ? summaryData.grandTotal : amount;
  const formattedAmount = formatReceiptAmount(effectiveTotal);
  const amountWords = initialData?.amountText || amountToVietnameseWords(effectiveTotal);
  const displayReceiptCode = (paymentCode || receiptNo).toUpperCase();
  const displayStudentName = studentName.trim() || (email ? email.split('@')[0] : 'Học viên FAST');

  const handleGenerateReceipt = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !studentName.trim()) {
      toast.showToast('Vui lòng điền Họ tên học viên và Email nhận biên lai!', 'error');
      return;
    }
    setIsGenerated(true);
    toast.showToast('Đã khởi tạo Biên lai điện tử thành công!', 'success');
  };

  const handleDownloadPdf = async () => {
    try {
      setIsDownloadingPdf(true);
      await downloadWhiteReceiptPdf({
        receiptNo,
        studentName: displayStudentName,
        email: email.trim() || '—',
        phone: phone.trim(),
        companyName: companyName.trim(),
        courseTitle,
        amount,
        paidAt: paidAt || issueDate,
        paymentCode: paymentCode || receiptNo,
        transactionId,
        paymentMethod,
        trainingType: initialData?.trainingType,
        status: initialData?.status,
        participantCount,
        items: initialData?.items,
        subtotalAmount: initialData?.subtotalAmount,
        discountAmount: initialData?.discountAmount,
        taxAmount: initialData?.taxAmount,
      });
      toast.showToast('Đã tải xuống Biên lai PDF nền trắng thành công!', 'success');
    } catch (err) {
      console.error('Error downloading receipt PDF:', err);
      toast.showToast('Không thể tạo file PDF lúc này. Vui lòng thử lại.', 'error');
    } finally {
      setIsDownloadingPdf(false);
    }
  };

  const handlePrint = () => {
    document.body.classList.add('printing-receipt');
    const cleanUp = () => {
      document.body.classList.remove('printing-receipt');
      window.removeEventListener('afterprint', cleanUp);
    };
    window.addEventListener('afterprint', cleanUp);
    setTimeout(() => {
      window.print();
      setTimeout(cleanUp, 2500);
    }, 120);
  };

  return (
    <div
      ref={sheetScrollRef}
      className="fixed inset-0 z-[1000] flex items-start sm:items-center justify-center p-3 sm:p-6 bg-slate-900/75 backdrop-blur-sm overflow-y-auto receipt-modal-backdrop"
    >
      <div className="bg-white rounded-2xl sm:rounded-3xl max-w-3xl w-full border border-slate-200 shadow-2xl overflow-hidden my-4 sm:my-8 animate-fade-in relative receipt-modal-shell">
        {/* Clean Minimal White Modal Chrome */}
        <div className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between no-print">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-center">
              <FileText className="w-4.5 h-4.5 text-[#007c76]" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-slate-900 tracking-tight">Biên lai thu học phí điện tử</h3>
              <p className="text-[11px] text-slate-500">
                {isImmutable
                  ? 'Bản gốc đã xác nhận thanh toán · Chỉ xem và tải xuống (Không chỉnh sửa)'
                  : 'Bố cục in ấn chuyên nghiệp trên nền trắng'}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Đóng biên lai"
            className="w-8 h-8 rounded-lg bg-slate-50 hover:bg-slate-100 text-slate-500 hover:text-slate-900 flex items-center justify-center transition border border-slate-200 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {!isGenerated && !isImmutable ? (
          <form onSubmit={handleGenerateReceipt} className="p-6 space-y-5 bg-white no-print">
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 space-y-1">
              <p className="font-bold uppercase tracking-wider text-[#007c76] flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Tạo biên lai thu học phí</span>
              </p>
              <p className="text-slate-600">
                Điền <strong>Email học viên</strong>, <strong>Họ tên</strong> và chi tiết mặt hàng để xuất biên lai điện tử nền trắng kèm logo công ty và bảng tổng kết tiền.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Họ và tên học viên <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ví dụ: Nguyễn Văn An"
                  value={studentName}
                  onChange={(e) => setStudentName(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#007c76]/25 focus:border-[#007c76]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Email nhận biên lai <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  required
                  placeholder="hocvien@gmail.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#007c76]/25 focus:border-[#007c76]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Số điện thoại
                </label>
                <input
                  type="text"
                  placeholder="Ví dụ: 0987 654 321"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#007c76]/25 focus:border-[#007c76]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Tên Cơ sở / Doanh nghiệp (Tùy chọn)
                </label>
                <input
                  type="text"
                  placeholder="Ví dụ: Công ty Thực phẩm An Bình"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#007c76]/25 focus:border-[#007c76]"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Tên khóa đào tạo / Mặt hàng
                </label>
                <input
                  type="text"
                  value={courseTitle}
                  onChange={(e) => setCourseTitle(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#007c76]/25 focus:border-[#007c76]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Số tiền thanh toán</label>
                <input
                  type="text"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-bold text-[#007c76] focus:outline-none focus:ring-2 focus:ring-[#007c76]/25 focus:border-[#007c76]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Mã giao dịch / Tham chiếu</label>
                <input
                  type="text"
                  placeholder="Ví dụ: FAST123456"
                  value={paymentCode}
                  onChange={(e) => setPaymentCode(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-mono font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#007c76]/25 focus:border-[#007c76]"
                />
              </div>
            </div>

            <button
              type="submit"
              className="w-full py-3 bg-[#007c76] hover:bg-[#005c56] text-white font-bold text-xs uppercase tracking-wider rounded-xl transition cursor-pointer"
            >
              Xuất Biên Lai Điện Tử
            </button>
          </form>
        ) : (
          <div className="p-4 sm:p-6 bg-slate-50/50 space-y-5">
            {/* Pure White Crisp Printable Receipt Sheet */}
            <div
              id="receipt-print-sheet"
              className="receipt-paper bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs"
            >
              <div className="h-1.5 bg-[#007c76] w-full" />

              <div className="p-6 sm:p-8 space-y-6 bg-white">
                {/* 1. Top Header: Company Logo Top-Left + Metadata Top-Right */}
                <div className="flex flex-col sm:flex-row justify-between items-start gap-4 pb-5 border-b border-slate-200">
                  <div className="flex items-start gap-3.5">
                    {!logoError ? (
                      <img
                        src={FAST_COMPANY_LOGO_URL}
                        alt="Công ty TNHH Tư vấn FAST"
                        onError={() => setLogoError(true)}
                        className="h-12 sm:h-14 w-auto object-contain shrink-0"
                      />
                    ) : (
                      <div className="w-12 h-12 rounded-lg bg-[#007c76] text-white font-black text-xl flex items-center justify-center shrink-0">
                        F
                      </div>
                    )}
                    <div>
                      <h2 className="font-bold text-sm sm:text-base text-slate-900 tracking-tight uppercase leading-snug">
                        CÔNG TY TNHH TƯ VẤN FAST
                      </h2>
                      <p className="text-[11px] font-semibold text-[#007c76] mt-0.5">
                        VIỆN ĐÀO TẠO &amp; KIỂM ĐỊNH ATTP FAST E-LEARNING
                      </p>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        Số 18 Nguyễn Cơ Thạch, Nam Từ Liêm, Hà Nội · Hotline: 0927 002 668
                      </p>
                      <p className="text-[11px] text-slate-500">
                        Email: hotro@fastelearning.com.vn · Website: fastelearning.com.vn
                      </p>
                    </div>
                  </div>

                  <div className="text-left sm:text-right shrink-0 sm:border-l sm:border-slate-100 sm:pl-5">
                    <span className="block text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                      Mã biên lai điện tử
                    </span>
                    <span className="font-mono font-bold text-sm sm:text-base text-slate-900 tabular-nums">
                      #{displayReceiptCode}
                    </span>
                    <p className="text-[11px] text-slate-500 mt-1 tabular-nums">
                      Ngày giờ: {formattedPaidTime}
                    </p>
                  </div>
                </div>

                {/* 2. Centered Title */}
                <div className="text-center space-y-1">
                  <h1 className="text-lg sm:text-2xl font-bold text-slate-900 uppercase tracking-wide">
                    BIÊN LAI THU HỌC PHÍ ĐIỆN TỬ
                  </h1>
                  <p className="text-xs text-[#007c76] font-medium">
                    Xác nhận thanh toán tự động từ hệ thống ngân hàng (Webhook)
                  </p>
                </div>

                {/* 3. Two-Column Buyer & Transaction Info Card (White Background) */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 sm:p-5 bg-white border border-slate-200 rounded-xl text-xs">
                  <div className="space-y-2.5 sm:pr-4 sm:border-r sm:border-slate-100">
                    <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      Thông tin học viên / Người mua
                    </div>
                    <div className="flex justify-between gap-2">
                      <span className="text-slate-500">Họ và tên:</span>
                      <span className="font-semibold text-slate-900 text-right">{displayStudentName}</span>
                    </div>
                    <div className="flex justify-between gap-2">
                      <span className="text-slate-500 inline-flex items-center gap-1 shrink-0">
                        <Mail className="w-3 h-3 text-slate-400" />
                        <span>Email nhận biên lai:</span>
                      </span>
                      <span className="font-semibold text-[#007c76] text-right break-all">
                        {email || '—'}
                      </span>
                    </div>
                    {phone && (
                      <div className="flex justify-between gap-2">
                        <span className="text-slate-500">Số điện thoại:</span>
                        <span className="font-mono font-medium text-slate-800 text-right tabular-nums">{phone}</span>
                      </div>
                    )}
                    {companyName && (
                      <div className="flex justify-between gap-2">
                        <span className="text-slate-500">Đơn vị:</span>
                        <span className="font-medium text-slate-800 text-right">{companyName}</span>
                      </div>
                    )}
                  </div>

                  <div className="space-y-2.5">
                    <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      Thông tin đối soát thanh toán
                    </div>
                    <div className="flex justify-between gap-2">
                      <span className="text-slate-500 inline-flex items-center gap-1 shrink-0">
                        <Clock className="w-3 h-3 text-slate-400" />
                        <span>Thời gian Webhook:</span>
                      </span>
                      <span className="font-semibold text-[#007c76] text-right tabular-nums">
                        {formattedPaidTime}
                      </span>
                    </div>
                    <div className="flex justify-between gap-2">
                      <span className="text-slate-500">Mã đối soát / GD:</span>
                      <span className="font-mono font-semibold text-slate-900 text-right tabular-nums">
                        {(paymentCode || transactionId || receiptNo).toUpperCase()}
                      </span>
                    </div>
                    <div className="flex justify-between gap-2">
                      <span className="text-slate-500">Phương thức:</span>
                      <span className="font-medium text-slate-800 text-right">{paymentMethod}</span>
                    </div>
                  </div>
                </div>

                {/* 4. Itemized Purchase List Table */}
                <div className="space-y-2.5">
                  <div className="text-[11px] font-bold uppercase tracking-wider text-slate-700">
                    Chi tiết các mặt hàng / Khóa đào tạo đã mua
                  </div>
                  <div className="overflow-x-auto border border-slate-200 rounded-xl bg-white">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 uppercase text-[10px] tracking-wider">
                          <th className="py-2.5 px-3 text-center w-12 font-bold">STT</th>
                          <th className="py-2.5 px-3 font-bold">Tên mặt hàng / Khóa học</th>
                          <th className="py-2.5 px-3 text-center w-14 font-bold">SL</th>
                          <th className="py-2.5 px-3 text-right w-28 font-bold">Đơn giá</th>
                          <th className="py-2.5 px-3 text-right w-32 font-bold">Thành tiền</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 bg-white">
                        {summaryData.items.map((item, idx) => (
                          <tr key={`${item.name}_${idx}`} className="bg-white">
                            <td className="py-3 px-3 text-center font-semibold text-slate-600 tabular-nums align-top">
                              {idx + 1}
                            </td>
                            <td className="py-3 px-3 align-top">
                              <div className="font-semibold text-slate-900 leading-snug">{item.name}</div>
                              {item.category && (
                                <div className="text-[11px] text-slate-500 mt-0.5">{item.category}</div>
                              )}
                            </td>
                            <td className="py-3 px-3 text-center font-semibold text-slate-800 tabular-nums align-top">
                              {item.quantity}
                            </td>
                            <td className="py-3 px-3 text-right text-slate-700 tabular-nums align-top">
                              {formatReceiptAmount(item.unitPrice)}
                            </td>
                            <td className="py-3 px-3 text-right font-bold text-slate-900 tabular-nums align-top">
                              {formatReceiptAmount(item.totalPrice)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* 5. Summary Table & Amount in Words */}
                <div className="grid grid-cols-1 sm:grid-cols-12 gap-4 items-start">
                  <div className="sm:col-span-6 p-4 bg-white border border-slate-200 rounded-xl space-y-1.5 text-xs">
                    <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      Số tiền bằng chữ
                    </span>
                    <p className="italic font-medium text-slate-800 leading-relaxed">
                      {amountWords}
                    </p>
                    <p className="text-[11px] text-slate-500 pt-1">
                      Biên lai điện tử hợp lệ xác nhận đã thanh toán hoàn tất học phí tại FAST E-Learning.
                    </p>
                  </div>

                  <div className="sm:col-span-6 border border-slate-200 rounded-xl bg-white overflow-hidden text-xs">
                    <table className="w-full border-collapse">
                      <tbody className="divide-y divide-slate-100">
                        <tr>
                          <td className="py-2 px-4 text-slate-500">Tạm tính (Subtotal)</td>
                          <td className="py-2 px-4 text-right font-semibold text-slate-900 tabular-nums">
                            {formatReceiptAmount(summaryData.subtotal)}
                          </td>
                        </tr>
                        <tr>
                          <td className="py-2 px-4 text-slate-500">Giảm giá / Ưu đãi</td>
                          <td className="py-2 px-4 text-right font-semibold text-slate-900 tabular-nums">
                            {summaryData.discount > 0 ? `-${formatReceiptAmount(summaryData.discount)}` : '0 đ'}
                          </td>
                        </tr>
                        <tr>
                          <td className="py-2 px-4 text-slate-500">Thuế GTGT (VAT)</td>
                          <td className="py-2 px-4 text-right font-medium text-slate-700 tabular-nums">
                            {summaryData.tax > 0 ? formatReceiptAmount(summaryData.tax) : 'Đã bao gồm'}
                          </td>
                        </tr>
                        <tr className="bg-slate-50/70">
                          <td className="py-3 px-4 font-bold text-slate-900 uppercase text-[11px]">
                            Tổng thanh toán
                          </td>
                          <td className="py-3 px-4 text-right font-bold text-base sm:text-lg text-[#007c76] tabular-nums">
                            {formattedAmount}
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* 6. Signatures & Electronic Verification Stamp */}
                <div className="pt-4 border-t border-slate-100 grid grid-cols-2 gap-4 text-center text-xs">
                  <div className="space-y-1">
                    <p className="font-semibold text-slate-700">Học viên / Người nộp tiền</p>
                    <p className="text-[11px] text-slate-400 italic truncate px-2">
                      {email || '(Xác thực tài khoản)'}
                    </p>
                    <div className="h-14 flex items-end justify-center font-bold text-slate-900">
                      {displayStudentName}
                    </div>
                  </div>

                  <div className="space-y-1">
                    <p className="font-semibold text-slate-700">Đại diện Công ty TNHH Tư vấn FAST</p>
                    <p className="text-[11px] text-slate-400 italic">(Biên lai điện tử tự động)</p>
                    <div className="h-14 flex items-center justify-center">
                      <div className="px-3.5 py-1.5 bg-white text-[#007c76] border-2 border-[#007c76] rounded-lg text-[10px] font-bold uppercase tracking-wider inline-flex items-center gap-1.5">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>ĐÃ XÁC NHẬN THANH TOÁN</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Action Bar */}
            <div className="flex flex-wrap items-center justify-between gap-3 no-print">
              {!isImmutable ? (
                <button
                  type="button"
                  onClick={() => setIsGenerated(false)}
                  className="px-4 py-2.5 rounded-xl bg-white border border-slate-200 text-slate-700 font-semibold text-xs hover:bg-slate-50 transition flex items-center gap-1.5 cursor-pointer"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  <span>Chỉnh sửa</span>
                </button>
              ) : (
                <span className="text-[11px] font-medium text-slate-500">
                  Biên lai bản gốc đã khóa chỉnh sửa theo quy định đối soát
                </span>
              )}

              <div className="flex flex-1 sm:flex-initial items-center gap-2.5 justify-end">
                <button
                  type="button"
                  onClick={handlePrint}
                  className="px-4 py-2.5 rounded-xl bg-white border border-slate-200 text-slate-700 font-semibold text-xs hover:bg-slate-50 transition flex items-center gap-1.5 cursor-pointer"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>In biên lai</span>
                </button>

                <button
                  type="button"
                  disabled={isDownloadingPdf}
                  onClick={handleDownloadPdf}
                  className="px-5 py-2.5 bg-[#007c76] hover:bg-[#005c56] disabled:opacity-60 text-white font-bold text-xs rounded-xl transition flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Download className="w-4 h-4" />
                  <span>{isDownloadingPdf ? 'Đang tạo PDF...' : 'Tải Biên lai PDF'}</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ReceiptModal;
