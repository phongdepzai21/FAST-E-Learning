import React, { useEffect, useState } from 'react';
import { collection, query, orderBy, limit, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';

interface PaymentLog {
  id: string;
  errorMessage: string;
  status: string;
  timestamp: string;
  payload: any;
  userAgent?: string;
}

export const PaymentDebugLogTable: React.FC = () => {
  const [logs, setLogs] = useState<PaymentLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedLogId, setExpandedLogId] = useState<string | null>(null);

  useEffect(() => {
    setIsLoading(true);
    setError(null);

    const logsRef = collection(db, "payment_logs");
    const q = query(logsRef, orderBy("timestamp", "desc"), limit(20));

    // Subscribe to live updates in real-time
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetchedLogs: PaymentLog[] = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        fetchedLogs.push({
          id: doc.id,
          errorMessage: data.errorMessage || 'No error message provided',
          status: data.status || 'failed',
          timestamp: data.timestamp || new Date().toISOString(),
          payload: data.payload || null,
          userAgent: data.userAgent || 'SePay Webhook Engine'
        });
      });

      setLogs(fetchedLogs);
      setIsLoading(false);
    }, (err) => {
      console.error("Error subscribing to payment logs:", err);
      setError("Không thể đồng bộ danh sách logs từ Cloud Firestore.");
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const renderStatusBadge = (status: string) => {
    const s = status.toLowerCase();
    if (s === 'exception') {
      return <span className="px-2.5 py-1 text-[10px] font-black uppercase tracking-wider bg-rose-50 text-rose-700 rounded-full border border-rose-200">EXCEPTION</span>;
    }
    if (s === 'ignored') {
      return <span className="px-2.5 py-1 text-[10px] font-black uppercase tracking-wider bg-gray-50 text-gray-600 rounded-full border border-gray-200">IGNORED</span>;
    }
    return <span className="px-2.5 py-1 text-[10px] font-black uppercase tracking-wider bg-amber-50 text-amber-700 rounded-full border border-amber-200">FAILED</span>;
  };

  return (
    <div className="bg-white rounded-3xl border border-gray-150 shadow-sm overflow-hidden mt-8">
      <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
        <div>
          <h4 className="font-extrabold text-base text-gray-800 uppercase tracking-tight flex items-center gap-2 font-sans">
            <span>📋</span> Nhật ký Lỗi Giao dịch Webhook (payment_logs)
          </h4>
          <p className="text-[10px] text-gray-400 font-semibold mt-0.5">Hiển thị tối đa 20 bản ghi sự kiện lỗi hoặc giao dịch bị từ chối gần nhất theo thời gian thực.</p>
        </div>
        <span className="text-[10px] font-black uppercase tracking-widest text-[#007c76] bg-[#007c76]/10 px-3 py-1 rounded-xl">Live</span>
      </div>

      {isLoading ? (
        <div className="flex justify-center items-center py-12">
          <svg className="animate-spin h-6 w-6 text-[#007c76]" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
        </div>
      ) : error ? (
        <div className="p-8 text-center text-red-500 font-bold text-xs">{error}</div>
      ) : logs.length === 0 ? (
        <div className="p-12 text-center text-gray-400 font-bold text-xs leading-normal">
          🎉 Tuyệt vời! Hiện chưa ghi nhận bất kỳ logs lỗi giao dịch nào trong Firestore.
        </div>
      ) : (
        <div className="overflow-x-auto pb-1">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100 text-gray-500 text-[10px] uppercase tracking-wider font-sans">
                <th className="p-4 font-bold">Thời gian</th>
                <th className="p-4 font-bold">Trạng thái</th>
                <th className="p-4 font-bold">Nội dung Lỗi</th>
                <th className="p-4 font-bold">Dữ liệu thô (Payload)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 font-medium">
              {logs.map((log) => {
                const payloadString = log.payload ? JSON.stringify(log.payload) : 'Null';
                const isExpanded = expandedLogId === log.id;
                
                return (
                  <React.Fragment key={log.id}>
                    <tr className="hover:bg-gray-50/40 transition-colors text-slate-700">
                      <td className="p-4 whitespace-nowrap font-mono text-[10px]">
                        {new Date(log.timestamp).toLocaleString('vi-VN')}
                      </td>
                      <td className="p-4 whitespace-nowrap">
                        {renderStatusBadge(log.status)}
                      </td>
                      <td className="p-4 text-rose-600 font-bold max-w-xs truncate" title={log.errorMessage}>
                        {log.errorMessage}
                      </td>
                      <td className="p-4">
                        <div className="flex items-center gap-2">
                          <code className="bg-slate-50 border border-slate-100 px-2 py-1 rounded text-[10px] font-mono max-w-xs truncate block text-slate-500">
                            {payloadString}
                          </code>
                          <button
                            onClick={() => setExpandedLogId(isExpanded ? null : log.id)}
                            className="px-2 py-1 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded font-bold text-[9px] uppercase tracking-wider cursor-pointer shrink-0"
                          >
                            {isExpanded ? 'Đóng' : 'Chi tiết'}
                          </button>
                        </div>
                      </td>
                    </tr>
                    {isExpanded && (
                      <tr className="bg-slate-50/50">
                        <td colSpan={4} className="p-4 border-b border-gray-100">
                          <div className="space-y-2">
                            <p className="font-bold text-[10px] text-gray-400 uppercase tracking-wider font-sans">Chi tiết Gói tin (Payload Detail)</p>
                            <pre className="p-4 bg-slate-950 text-emerald-400 font-mono text-[10px] rounded-xl overflow-x-auto leading-relaxed border border-slate-900 shadow-inner">
                              {JSON.stringify(log.payload, null, 2)}
                            </pre>
                            {log.userAgent && (
                              <p className="text-[10px] text-gray-400 font-semibold font-sans">User Agent: <span className="font-mono text-slate-600">{log.userAgent}</span></p>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
