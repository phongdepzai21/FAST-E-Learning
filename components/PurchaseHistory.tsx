import React, { useEffect, useState } from 'react';
import { collection, onSnapshot, orderBy, query } from 'firebase/firestore';
import { db, auth } from '../firebase';
import { Link } from 'react-router-dom';
import { jsPDF } from 'jspdf';

interface PurchaseRecord {
  id: string;
  courseId: string;
  courseTitle: string;
  purchasedAt: string;
  price: string;
  status: string;
}

export const PurchaseHistory: React.FC = () => {
  const [purchases, setPurchases] = useState<PurchaseRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const renderStatusBadge = (status: string) => {
    const s = (status || "").toLowerCase();
    switch (s) {
      case 'active':
      case 'completed':
      case 'verified':
      case 'success':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-green-50 text-green-700 shadow-sm border border-green-200/60">
            <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></span>
            Đã xác thực
          </span>
        );
      case 'pending':
      case 'processing':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-700 shadow-sm border border-amber-200/60 animate-pulse">
            <svg className="animate-spin h-3 w-3 text-amber-600 mr-0.5" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            Đang xử lý
          </span>
        );
      case 'failed':
      case 'rejected':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-red-50 text-red-700 shadow-sm border border-red-200/60">
            <span className="w-1.5 h-1.5 rounded-full bg-red-500"></span>
            Thất bại
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-gray-50 text-gray-700 border border-gray-200/60">
            <span className="w-1.5 h-1.5 rounded-full bg-gray-400"></span>
            Đã thanh toán
          </span>
        );
    }
  };

  const handleDownloadReceipt = (purchase: PurchaseRecord) => {
    try {
      const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a5' // A5 is standard and looks exceptionally elegant for invoice PDFs!
      });

      const userEmail = auth.currentUser?.email || 'N/A';
      const userName = auth.currentUser?.displayName || userEmail.split('@')[0];

      // Helper to strip diacritics for safe vector PDF rendering without bulky custom fonts
      const cleanText = (str: string) => {
        if (!str) return '';
        return str
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '')
          .replace(/đ/g, 'd')
          .replace(/Đ/g, 'D');
      };

      const cleanCourseTitle = cleanText(purchase.courseTitle);
      const cleanUserName = cleanText(userName);
      const cleanPrice = cleanText(purchase.price);
      
      // Draw Border Frame
      doc.setDrawColor(0, 124, 118); // Teal brand color
      doc.setLineWidth(1);
      doc.rect(5, 5, 138, 200); // Frame fitting A5 size (148 x 210)

      // Header Title
      doc.setTextColor(0, 124, 118);
      doc.setFont('Helvetica', 'bold');
      doc.setFontSize(14);
      doc.text('FAST ACADEMY', 74, 20, { align: 'center' });
      
      doc.setTextColor(100, 100, 100);
      doc.setFont('Helvetica', 'normal');
      doc.setFontSize(8);
      doc.text('CONG TY TNHH TU VAN FAST', 74, 25, { align: 'center' });
      doc.text('Email: hotro@fastelearning.com.vn | Web: fastelearning.com.vn', 74, 29, { align: 'center' });

      // Decorative Line
      doc.setDrawColor(220, 220, 220);
      doc.setLineWidth(0.5);
      doc.line(15, 35, 133, 35);

      // Invoice Header
      doc.setTextColor(50, 50, 50);
      doc.setFont('Helvetica', 'bold');
      doc.setFontSize(12);
      doc.text('BIEN LAI NHAN HOC PHI', 74, 45, { align: 'center' });
      doc.setFontSize(8);
      doc.setFont('Helvetica', 'normal');
      doc.text('(TUITION FEES RECEIPT)', 74, 49, { align: 'center' });

      // Info Table Grid
      doc.setFontSize(9);
      
      const startXLabel = 15;
      const startXValue = 55;
      let currentY = 62;
      const stepY = 8;

      const items = [
        { label: 'Ma bien lai (ID):', val: purchase.id.slice(0, 12).toUpperCase() },
        { label: 'Ngay thanh toan:', val: new Date(purchase.purchasedAt).toLocaleDateString('vi-VN') },
        { label: 'Hoc vien (Student):', val: cleanUserName },
        { label: 'Email dang ky:', val: userEmail },
        { label: 'Khoa hoc (Course):', val: cleanCourseTitle },
        { label: 'So tien (Amount):', val: cleanPrice },
        { label: 'Phuong thuc:', val: 'Chuyen khoan ngan hang tu dong (VietQR)' },
        { label: 'Trang thai (Status):', val: 'DA THANH TOAN (PAID)' }
      ];

      items.forEach(item => {
        doc.setFont('Helvetica', 'bold');
        doc.text(item.label, startXLabel, currentY);
        doc.setFont('Helvetica', 'normal');
        doc.text(item.val, startXValue, currentY);
        currentY += stepY;
      });

      // Decorative Divider Line
      doc.line(15, currentY + 3, 133, currentY + 3);
      currentY += 12;

      // Signature / Stamp Info
      doc.setFontSize(8);
      doc.setFont('Helvetica', 'bold');
      doc.text('DAI DIEN NHA TRUONG', 105, currentY, { align: 'center' });
      doc.setFont('Helvetica', 'italic');
      doc.text('(Ky va dong dau dien tu)', 105, currentY + 4, { align: 'center' });

      // Visual Digital Signature Seal
      doc.setDrawColor(220, 50, 50); // Official Red Stamp color
      doc.setLineWidth(0.8);
      doc.rect(90, currentY + 8, 30, 16);
      doc.setTextColor(220, 50, 50);
      doc.setFont('Helvetica', 'bold');
      doc.setFontSize(7);
      doc.text('FAST ACADEMY', 105, currentY + 13, { align: 'center' });
      doc.text('DA THANH TOAN', 105, currentY + 18, { align: 'center' });

      // Greeting Footer
      doc.setTextColor(120, 120, 120);
      doc.setFont('Helvetica', 'normal');
      doc.setFontSize(8);
      doc.text('Cam on quy hoc vien da tin tuong dong hanh cung FAST Academy!', 74, 192, { align: 'center' });

      // File download execution
      doc.save(`Receipt_FAST_${purchase.id.slice(0, 8).toUpperCase()}.pdf`);
    } catch (err: any) {
      console.error('Error generating PDF:', err);
      alert('Khong the tai hoa don PDF luc nay. Vui long thu lai sau.');
    }
  };

  useEffect(() => {
    const currentUser = auth.currentUser;
    if (!currentUser || !currentUser.email) {
      setError('Vui lòng đăng nhập để xem lịch sử mua hàng.');
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    const userEmail = currentUser.email.toLowerCase();
    const purchasesRef = collection(db, "users", userEmail, "purchased_courses");

    // Real-time listener using onSnapshot for direct UI reactivity
    const unsubscribe = onSnapshot(purchasesRef, (snapshot) => {
      const records: PurchaseRecord[] = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        records.push({
          id: doc.id,
          courseId: data.courseId,
          courseTitle: data.courseTitle || data.courseId,
          purchasedAt: data.purchasedAt || data.activatedAt || new Date().toISOString(),
          price: data.price || (data.paymentAmount ? `${Number(data.paymentAmount).toLocaleString('vi-VN')}đ` : "Đã thanh toán"),
          status: data.status || "active",
        });
      });

      records.sort((a, b) => new Date(b.purchasedAt).getTime() - new Date(a.purchasedAt).getTime());
      setPurchases(records);
      setIsLoading(false);
    }, (err) => {
      console.error("Lỗi đồng bộ lịch sử mua hàng:", err);
      setError('Không thể tải lịch sử mua hàng thời gian thực.');
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, []);

  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-20">
        <svg className="animate-spin h-8 w-8 text-[#007c76]" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 text-red-600 p-4 rounded-2xl text-center font-medium">
        {error}
      </div>
    );
  }

  if (purchases.length === 0) {
    return (
      <div className="text-center py-16 bg-white rounded-3xl shadow-sm border border-gray-100">
        <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg className="w-10 h-10 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
          </svg>
        </div>
        <h3 className="text-xl font-bold text-gray-800 mb-2">Chưa có giao dịch nào</h3>
        <p className="text-gray-500 max-w-md mx-auto">Bạn chưa mua khóa học nào. Hãy khám phá các khóa học của chúng tôi để bắt đầu học tập nhé.</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
      <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
        <h2 className="text-xl font-bold text-gray-800">Lịch sử giao dịch</h2>
      </div>
      <div className="overflow-x-auto custom-scrollbar pb-1">
        <table className="w-full text-left border-collapse min-w-[750px] whitespace-nowrap">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-100 text-gray-500 text-xs uppercase tracking-wider whitespace-nowrap">
              <th className="p-4 font-bold whitespace-nowrap">Khóa học</th>
              <th className="p-4 font-bold whitespace-nowrap">Ngày mua</th>
              <th className="p-4 font-bold whitespace-nowrap">Giá</th>
              <th className="p-4 font-bold whitespace-nowrap">Trạng thái</th>
              <th className="p-4 font-bold whitespace-nowrap text-center">Hành động</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {purchases.map((purchase) => (
              <tr key={purchase.id} className="hover:bg-gray-50/50 transition-colors whitespace-nowrap">
                <td className="p-4 whitespace-nowrap">
                  <Link to={`/course/${purchase.courseId}`} className="font-bold text-gray-800 hover:text-[#007c76] transition-colors whitespace-nowrap">
                    {purchase.courseTitle}
                  </Link>
                  <div className="text-xs text-gray-500 mt-1 whitespace-nowrap">ID: {purchase.courseId}</div>
                </td>
                <td className="p-4 text-sm text-gray-600 whitespace-nowrap">
                  {new Date(purchase.purchasedAt).toLocaleDateString('vi-VN', {
                    day: '2-digit',
                    month: '2-digit',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </td>
                <td className="p-4 whitespace-nowrap">
                  <span className="font-bold text-gray-800 whitespace-nowrap">{purchase.price}</span>
                </td>
                <td className="p-4 whitespace-nowrap">
                  {renderStatusBadge(purchase.status)}
                </td>
                <td className="p-4 text-center whitespace-nowrap">
                  <button
                    onClick={() => handleDownloadReceipt(purchase)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-teal-50 text-[#007c76] hover:bg-[#007c76] hover:text-white transition-all border border-teal-200/50 cursor-pointer shadow-sm"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    <span>Tải Biên lai PDF</span>
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
