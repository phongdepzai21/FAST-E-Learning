import React, { useEffect, useState } from 'react';
import { collection, getDocs, orderBy, query } from 'firebase/firestore';
import { db, auth } from '../firebase';
import { Link } from 'react-router-dom';

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

  useEffect(() => {
    const fetchPurchases = async () => {
      setIsLoading(true);
      setError(null);
      
      const currentUser = auth.currentUser;
      if (!currentUser || !currentUser.email) {
        setError('Vui lòng đăng nhập để xem lịch sử mua hàng.');
        setIsLoading(false);
        return;
      }

      try {
        const userEmail = currentUser.email.toLowerCase();
        const purchasesRef = collection(db, "users", userEmail, "purchased_courses");
        const q = query(purchasesRef); // Firestore might not have an index for ordering right away if not created, but we can sort client side or rely on default.
        const snapshot = await getDocs(q);
        
        const records: PurchaseRecord[] = [];
        snapshot.forEach((doc) => {
          const data = doc.data();
          records.push({
            id: doc.id,
            courseId: data.courseId,
            courseTitle: data.courseTitle,
            purchasedAt: data.purchasedAt,
            price: data.price,
            status: data.status,
          });
        });

        // Sort descending by date
        records.sort((a, b) => new Date(b.purchasedAt).getTime() - new Date(a.purchasedAt).getTime());
        
        setPurchases(records);
      } catch (err: any) {
        console.error("Lỗi lấy lịch sử mua hàng:", err);
        setError('Không thể tải lịch sử mua hàng. Vui lòng thử lại sau.');
      } finally {
        setIsLoading(false);
      }
    };

    fetchPurchases();
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
        <table className="w-full text-left border-collapse min-w-[650px] whitespace-nowrap">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-100 text-gray-500 text-xs uppercase tracking-wider whitespace-nowrap">
              <th className="p-4 font-bold whitespace-nowrap">Khóa học</th>
              <th className="p-4 font-bold whitespace-nowrap">Ngày mua</th>
              <th className="p-4 font-bold whitespace-nowrap">Giá</th>
              <th className="p-4 font-bold whitespace-nowrap">Trạng thái</th>
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
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-green-100 text-green-700 whitespace-nowrap">
                    <span className="w-1.5 h-1.5 rounded-full bg-green-500"></span>
                    Thành công
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
