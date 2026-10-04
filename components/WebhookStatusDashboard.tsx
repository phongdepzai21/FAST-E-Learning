import React, { useEffect, useState } from 'react';
import { collection, query, orderBy, limit, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';

interface WebhookLog {
  id: string;
  errorMessage: string;
  status: 'success' | 'failed' | 'exception' | 'ignored';
  timestamp: string;
  payload: any;
  userAgent?: string;
}

export const WebhookStatusDashboard: React.FC = () => {
  const [logs, setLogs] = useState<WebhookLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'success' | 'failed' | 'ignored'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedLog, setSelectedLog] = useState<WebhookLog | null>(null);

  useEffect(() => {
    setIsLoading(true);
    const logsRef = collection(db, "payment_logs");
    const q = query(logsRef, orderBy("timestamp", "desc"), limit(50));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetched: WebhookLog[] = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        fetched.push({
          id: doc.id,
          errorMessage: data.errorMessage || '',
          status: (data.status || 'failed') as any,
          timestamp: data.timestamp || new Date().toISOString(),
          payload: data.payload || null,
          userAgent: data.userAgent || 'SePay Webhook Engine'
        });
      });
      setLogs(fetched);
      
      // Auto-select the first log on load if none selected
      if (fetched.length > 0 && !selectedLog) {
        setSelectedLog(fetched[0]);
      }
      setIsLoading(false);
    }, (err) => {
      console.error("Error subscribing to payment logs in dashboard:", err);
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, [selectedLog]);

  // Statistics calculation
  const totalLogs = logs.length;
  const successCount = logs.filter(l => l.status === 'success').length;
  const failedCount = logs.filter(l => l.status === 'failed' || l.status === 'exception').length;
  const ignoredCount = logs.filter(l => l.status === 'ignored').length;
  
  // Success rate ignoring "ignored" (debug/headers) requests
  const relevantTotal = successCount + failedCount;
  const successRate = relevantTotal > 0 ? Math.round((successCount / relevantTotal) * 100) : 100;

  // Filter & Search logic
  const filteredLogs = logs.filter((log) => {
    const matchesStatus = 
      filter === 'all' || 
      (filter === 'success' && log.status === 'success') ||
      (filter === 'failed' && (log.status === 'failed' || log.status === 'exception')) ||
      (filter === 'ignored' && log.status === 'ignored');

    const rawPayloadStr = log.payload ? JSON.stringify(log.payload).toLowerCase() : '';
    const errStr = log.errorMessage.toLowerCase();
    const searchLower = searchTerm.toLowerCase();
    
    const matchesSearch = 
      rawPayloadStr.includes(searchLower) || 
      errStr.includes(searchLower) || 
      log.id.toLowerCase().includes(searchLower);

    return matchesStatus && matchesSearch;
  });

  const renderLifecycleTrace = (log: WebhookLog) => {
    const isSuccess = log.status === 'success';
    const isIgnored = log.status === 'ignored';
    const isFailed = log.status === 'failed' || log.status === 'exception';

    // Step 1: Receiving Status
    const step1Status = 'success'; // Requests received are always logged
    // Step 2: Parsing Status
    const step2Status = log.payload ? 'success' : 'failed';
    // Step 3: HMAC Verification
    let step3Status: 'success' | 'failed' | 'pending' = 'pending';
    if (isSuccess || isIgnored) {
      step3Status = 'success';
    } else if (isFailed) {
      // Check if signature specifically failed
      const msg = log.errorMessage.toLowerCase();
      if (msg.includes('signature') || msg.includes('chữ ký') || msg.includes('unauthorized') || msg.includes('token')) {
        step3Status = 'failed';
      } else {
        step3Status = 'success'; // Signature passed, failed in other stages
      }
    }

    // Step 4: Transaction Matching (Matching the transfer content memo with a pending code or user activation)
    let step4Status: 'success' | 'failed' | 'ignored' | 'pending' = 'pending';
    if (isSuccess) {
      step4Status = 'success';
    } else if (isIgnored) {
      step4Status = 'ignored';
    } else if (isFailed) {
      if (step3Status === 'failed') {
        step4Status = 'pending'; // Blocked before matching
      } else {
        step4Status = 'failed'; // Failed during match (e.g. invalid memo/amount)
      }
    }

    // Step 5: Activation (Course Provisioning & Delivery)
    let step5Status: 'success' | 'failed' | 'pending' = 'pending';
    if (isSuccess) {
      step5Status = 'success';
    } else if (isFailed && step4Status === 'failed') {
      step5Status = 'failed';
    }

    const getStepColorClass = (status: 'success' | 'failed' | 'ignored' | 'pending') => {
      if (status === 'success') return 'bg-emerald-500 border-emerald-500 text-white';
      if (status === 'failed') return 'bg-rose-500 border-rose-500 text-white';
      if (status === 'ignored') return 'bg-amber-500 border-amber-500 text-white';
      return 'bg-gray-100 border-gray-300 text-gray-400';
    };

    return (
      <div className="bg-slate-50 rounded-3xl p-6 border border-slate-100 space-y-6">
        <div className="flex justify-between items-center pb-2 border-b border-slate-200">
          <div>
            <h5 className="font-extrabold text-sm text-slate-800 uppercase tracking-wider font-sans">Sơ đồ Luồng xử lý giao dịch (Lifecycle Trace)</h5>
            <p className="text-[10px] text-slate-400 font-semibold mt-0.5">Mã Giao dịch: <span className="font-mono text-slate-600">{log.id}</span></p>
          </div>
          <span className={`px-2.5 py-1 rounded-xl text-[10px] font-black uppercase tracking-wider ${
            isSuccess ? 'bg-emerald-100 text-emerald-800' : isIgnored ? 'bg-amber-100 text-amber-800' : 'bg-rose-100 text-rose-800'
          }`}>
            {log.status}
          </span>
        </div>

        {/* Horizontal visual stepper chart */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 md:gap-2 relative pt-2">
          {/* Step 1 */}
          <div className="flex flex-col items-center text-center space-y-2 relative">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center font-black border-2 text-sm z-10 transition-all ${getStepColorClass(step1Status)}`}>
              1
            </div>
            <div>
              <p className="font-extrabold text-[11px] text-slate-800">📥 Nhận Yêu Cầu</p>
              <p className="text-[9px] text-slate-400 font-medium leading-normal">HTTP Webhook Inbound</p>
            </div>
            {step1Status === 'success' && (
              <span className="text-[9px] text-emerald-600 font-black">ACTIVE</span>
            )}
          </div>

          {/* Step 2 */}
          <div className="flex flex-col items-center text-center space-y-2 relative">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center font-black border-2 text-sm z-10 transition-all ${getStepColorClass(step2Status)}`}>
              2
            </div>
            <div>
              <p className="font-extrabold text-[11px] text-slate-800">📁 Giải Mã Gói Tin</p>
              <p className="text-[9px] text-slate-400 font-medium leading-normal">JSON / Form-Data</p>
            </div>
            {step2Status === 'success' && (
              <span className="text-[9px] text-emerald-600 font-black">PASSED</span>
            )}
          </div>

          {/* Step 3 */}
          <div className="flex flex-col items-center text-center space-y-2 relative">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center font-black border-2 text-sm z-10 transition-all ${getStepColorClass(step3Status)}`}>
              3
            </div>
            <div>
              <p className="font-extrabold text-[11px] text-slate-800">🔐 Bảo Mật Chữ Ký</p>
              <p className="text-[9px] text-slate-400 font-medium leading-normal">HMAC / Token Auth</p>
            </div>
            {step3Status === 'success' ? (
              <span className="text-[9px] text-emerald-600 font-black">VERIFIED</span>
            ) : step3Status === 'failed' ? (
              <span className="text-[9px] text-rose-600 font-black">SIGNATURE_ERR</span>
            ) : null}
          </div>

          {/* Step 4 */}
          <div className="flex flex-col items-center text-center space-y-2 relative">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center font-black border-2 text-sm z-10 transition-all ${getStepColorClass(step4Status)}`}>
              4
            </div>
            <div>
              <p className="font-extrabold text-[11px] text-slate-800">⚡ Đối Soát Giao Dịch</p>
              <p className="text-[9px] text-slate-400 font-medium leading-normal">Khớp Memo & Số Tiền</p>
            </div>
            {step4Status === 'success' ? (
              <span className="text-[9px] text-emerald-600 font-black">MATCHED</span>
            ) : step4Status === 'failed' ? (
              <span className="text-[9px] text-rose-600 font-black">MATCH_ERR</span>
            ) : step4Status === 'ignored' ? (
              <span className="text-[9px] text-amber-600 font-black">DEBUG_FLOW</span>
            ) : null}
          </div>

          {/* Step 5 */}
          <div className="flex flex-col items-center text-center space-y-2 relative">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center font-black border-2 text-sm z-10 transition-all ${getStepColorClass(step5Status)}`}>
              5
            </div>
            <div>
              <p className="font-extrabold text-[11px] text-slate-800">🎓 Kích Hoạt Khóa Học</p>
              <p className="text-[9px] text-slate-400 font-medium leading-normal">Cấp Quyền Học Viên</p>
            </div>
            {step5Status === 'success' ? (
              <span className="text-[9px] text-emerald-600 font-black">PROVISIONED</span>
            ) : step5Status === 'failed' ? (
              <span className="text-[9px] text-rose-600 font-black">FAILED</span>
            ) : null}
          </div>
        </div>

        {/* Message Log Console Output */}
        <div className="bg-slate-950 text-emerald-400 p-4 rounded-2xl font-mono text-xs leading-relaxed space-y-1.5 border border-slate-900 shadow-inner">
          <p className="text-slate-400 text-[10px] font-sans font-bold uppercase tracking-wider pb-1.5 border-b border-slate-800">Dòng phản hồi chi tiết từ Máy chủ:</p>
          <div className="pt-1 select-all break-words">
            <span className="text-emerald-600">&gt;</span> {log.errorMessage || 'Xử lý hoàn tất thành công. Khóa học được đồng bộ an toàn.'}
          </div>
          {log.payload && (
            <div className="pt-2 border-t border-slate-900 mt-2">
              <span className="text-slate-400 text-[10px] font-sans font-bold uppercase tracking-wider block mb-1">Payload dữ liệu truyền tới:</span>
              <pre className="text-[10px] text-teal-300 max-h-40 overflow-y-auto leading-normal whitespace-pre-wrap">
                {JSON.stringify(log.payload, null, 2)}
              </pre>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Visual Analytics Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total stats */}
        <div className="bg-white p-5 rounded-2xl border border-gray-150 shadow-sm">
          <p className="text-[10px] font-black uppercase tracking-wider text-gray-400">Tổng Giao dịch Webhook</p>
          <h4 className="text-2xl font-black text-gray-800 mt-1 leading-none font-sans">{totalLogs}</h4>
          <p className="text-[10px] text-gray-400 font-medium mt-1">Cập nhật thời gian thực</p>
        </div>

        {/* Success Rate */}
        <div className="bg-white p-5 rounded-2xl border border-gray-150 shadow-sm relative overflow-hidden">
          <p className="text-[10px] font-black uppercase tracking-wider text-emerald-600">Tỷ lệ Thành Công</p>
          <h4 className="text-2xl font-black text-emerald-700 mt-1 leading-none font-sans">{successRate}%</h4>
          <div className="w-full bg-gray-100 h-1.5 rounded-full mt-2 overflow-hidden">
            <div className="bg-emerald-500 h-full rounded-full" style={{ width: `${successRate}%` }}></div>
          </div>
          <p className="text-[10px] text-gray-400 font-medium mt-1">Ngoại trừ cổng test ẩn</p>
        </div>

        {/* Success count */}
        <div className="bg-white p-5 rounded-2xl border border-gray-150 shadow-sm">
          <p className="text-[10px] font-black uppercase tracking-wider text-blue-600">Giao dịch Thành Công</p>
          <h4 className="text-2xl font-black text-blue-700 mt-1 leading-none font-sans">{successCount}</h4>
          <p className="text-[10px] text-gray-400 font-medium mt-1">Đã kích hoạt khóa học</p>
        </div>

        {/* Failed count */}
        <div className="bg-white p-5 rounded-2xl border border-gray-150 shadow-sm">
          <p className="text-[10px] font-black uppercase tracking-wider text-rose-600">Lỗi / Chữ ký Sai</p>
          <h4 className="text-2xl font-black text-rose-700 mt-1 leading-none font-sans">{failedCount}</h4>
          <p className="text-[10px] text-gray-400 font-medium mt-1">Cảnh báo bảo mật chặn đứng</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Side: Logs List */}
        <div className="lg:col-span-7 bg-white rounded-3xl border border-gray-150 shadow-sm overflow-hidden flex flex-col">
          {/* Controls bar */}
          <div className="p-4 bg-gray-50/50 border-b border-gray-100 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <h5 className="font-extrabold text-xs text-gray-700 uppercase tracking-wider font-sans">Danh sách bản ghi trực tuyến</h5>
              
              {/* Search input */}
              <input
                type="text"
                placeholder="Tìm memo, tiền, ngân hàng..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="p-2 border border-gray-200 rounded-xl bg-white text-xs font-semibold focus:outline-none focus:border-[#007c76] w-full sm:w-48 placeholder-gray-400"
              />
            </div>

            {/* Filter buttons */}
            <div className="flex flex-wrap gap-1.5">
              {(['all', 'success', 'failed', 'ignored'] as const).map((opt) => (
                <button
                  key={opt}
                  onClick={() => setFilter(opt)}
                  className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all cursor-pointer ${
                    filter === opt 
                      ? 'bg-[#007c76] text-white shadow-sm' 
                      : 'bg-white border border-gray-200 text-gray-500 hover:bg-gray-100'
                  }`}
                >
                  {opt === 'all' ? 'Tất cả' : opt === 'success' ? 'Thành công' : opt === 'failed' ? 'Lỗi/Sai Chữ ký' : 'Nhật ký Test'}
                </button>
              ))}
            </div>
          </div>

          {/* Logs table list */}
          {isLoading ? (
            <div className="flex justify-center items-center py-20">
              <svg className="animate-spin h-6 w-6 text-[#007c76]" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            </div>
          ) : filteredLogs.length === 0 ? (
            <div className="p-16 text-center text-gray-400 font-bold text-xs">
              📭 Không tìm thấy kết quả phù hợp với điều kiện lọc.
            </div>
          ) : (
            <div className="overflow-y-auto max-h-[480px] divide-y divide-gray-100">
              {filteredLogs.map((log) => {
                const isSelected = selectedLog?.id === log.id;
                
                return (
                  <div
                    key={log.id}
                    onClick={() => setSelectedLog(log)}
                    className={`p-4 flex items-center justify-between cursor-pointer transition-colors ${
                      isSelected ? 'bg-teal-50/45 border-l-4 border-[#007c76]' : 'hover:bg-gray-50/40'
                    }`}
                  >
                    <div className="space-y-1 pr-4 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-wider ${
                          log.status === 'success' 
                            ? 'bg-green-100 text-green-800' 
                            : log.status === 'ignored' 
                              ? 'bg-amber-100 text-amber-800' 
                              : 'bg-rose-100 text-rose-800'
                        }`}>
                          {log.status}
                        </span>
                        <span className="font-mono text-[9px] text-gray-400 font-bold">
                          {new Date(log.timestamp).toLocaleTimeString('vi-VN')}
                        </span>
                      </div>
                      <p className="font-extrabold text-xs text-slate-700 truncate max-w-xs" title={log.errorMessage}>
                        {log.errorMessage || 'Giao dịch được phê duyệt tự động'}
                      </p>
                      <p className="text-[10px] text-slate-400 font-medium truncate max-w-xs">
                        Memo: <span className="font-mono text-slate-600 font-bold">{log.payload?.content || log.payload?.memo || 'N/A'}</span>
                      </p>
                    </div>
                    
                    <div className="text-right shrink-0">
                      {log.payload?.transferAmount || log.payload?.amount ? (
                        <p className="font-black text-xs text-slate-800">
                          {Number(log.payload?.transferAmount || log.payload?.amount).toLocaleString('vi-VN')}đ
                        </p>
                      ) : (
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">DEBUG</p>
                      )}
                      <p className="text-[9px] text-slate-400 font-semibold">
                        {new Date(log.timestamp).toLocaleDateString('vi-VN')}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right Side: Selected Lifecycle Detail Visualizer */}
        <div className="lg:col-span-5 space-y-6">
          {selectedLog ? (
            renderLifecycleTrace(selectedLog)
          ) : (
            <div className="bg-white rounded-3xl border border-gray-150 p-8 text-center text-gray-400 font-bold text-xs shadow-sm">
              👈 Hãy chọn một dòng log bên trái để kiểm toán chi tiết luồng vòng đời giao dịch!
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
