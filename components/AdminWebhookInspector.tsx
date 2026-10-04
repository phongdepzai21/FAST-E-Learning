import React, { useEffect, useState } from 'react';
import { collection, query, orderBy, limit, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';

interface WebhookLog {
  id: string;
  errorMessage: string;
  status: string;
  timestamp: string;
  payload: any;
  userAgent?: string;
}

export const AdminWebhookInspector: React.FC = () => {
  const [logs, setLogs] = useState<WebhookLog[]>([]);
  const [isLoading, setLoading] = useState(true);
  const [selectedLog, setSelectedLog] = useState<WebhookLog | null>(null);
  
  // Diagnostics filters
  const [activeFilter, setActiveFilter] = useState<'all' | '302-risks' | '5xx-errors'>('all');

  useEffect(() => {
    setLoading(true);
    const logsRef = collection(db, "payment_logs");
    const q = query(logsRef, orderBy("timestamp", "desc"), limit(10));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetched: WebhookLog[] = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        fetched.push({
          id: doc.id,
          errorMessage: data.errorMessage || '',
          status: data.status || 'failed',
          timestamp: data.timestamp || new Date().toISOString(),
          payload: data.payload || null,
          userAgent: data.userAgent || 'SePay Webhook Engine'
        });
      });
      setLogs(fetched);
      if (fetched.length > 0 && !selectedLog) {
        setSelectedLog(fetched[0]);
      }
      setLoading(false);
    }, (err) => {
      console.error("Error loading inspector logs:", err);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [selectedLog]);

  // Helper functions to identify 302 risks and 5xx errors
  const is302Risk = (log: WebhookLog) => {
    const payloadStr = log.payload ? JSON.stringify(log.payload).toLowerCase() : '';
    const errStr = log.errorMessage.toLowerCase();
    
    // Check if protocol was non-secure (http) in forwarded headers
    const hasHttpForwarded = payloadStr.includes('"x-forwarded-proto":"http"');
    // Check if trailing slash was present in url
    const hasTrailingSlash = payloadStr.includes('webhook/') || errStr.includes('webhook/');
    // Check if redirection indicator or 302 text matches
    const contains302Text = payloadStr.includes('302') || errStr.includes('302');

    return hasHttpForwarded || hasTrailingSlash || contains302Text;
  };

  const is5xxError = (log: WebhookLog) => {
    const payloadStr = log.payload ? JSON.stringify(log.payload).toLowerCase() : '';
    const errStr = log.errorMessage.toLowerCase();

    const isException = log.status.toLowerCase() === 'exception';
    const contains5xxText = errStr.includes('500') || errStr.includes('502') || errStr.includes('503') || errStr.includes('504') || errStr.includes('internal server error') || payloadStr.includes('500');

    return isException || contains5xxText;
  };

  // Filter logs list based on active filter
  const filteredLogs = logs.filter((log) => {
    if (activeFilter === '302-risks') return is302Risk(log);
    if (activeFilter === '5xx-errors') return is5xxError(log);
    return true;
  });

  // Automated audit analysis on the 10 logs
  const analyzeAuditReport = () => {
    let hasHttpIssue = false;
    let hasTrailingSlashIssue = false;
    let has5xxCrash = false;

    logs.forEach((log) => {
      const payloadStr = log.payload ? JSON.stringify(log.payload).toLowerCase() : '';
      if (payloadStr.includes('"x-forwarded-proto":"http"')) {
        hasHttpIssue = true;
      }
      if (payloadStr.includes('webhook/') || log.errorMessage.toLowerCase().includes('webhook/')) {
        hasTrailingSlashIssue = true;
      }
      if (is5xxError(log)) {
        has5xxCrash = true;
      }
    });

    return { hasHttpIssue, hasTrailingSlashIssue, has5xxCrash };
  };

  const audit = analyzeAuditReport();

  return (
    <div className="space-y-6">
      {/* Visual Title Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-2xl font-black text-slate-800 tracking-tight flex items-center gap-3 uppercase">
            <span className="w-2 h-8 bg-rose-500 rounded-full shrink-0"></span>
            Hệ thống Giám sát Webhook (Admin Webhook Inspector)
          </h3>
          <p className="text-gray-500 text-xs font-semibold mt-1">
            Bảng kiểm toán thông minh chuyên phát hiện nguy cơ lỗi Chuyển hướng 302 và Sập nguồn hệ thống 5xx từ 10 giao dịch gần nhất.
          </p>
        </div>
      </div>

      {/* Automated Diagnostic Audit Panel */}
      <div className="bg-white rounded-3xl p-6 border border-gray-150 shadow-sm space-y-4">
        <h4 className="font-extrabold text-sm text-slate-800 uppercase tracking-wider flex items-center gap-2 font-sans">
          <span>🧠</span> Báo Cáo Chẩn Đoán Tự Động (Automated Enviroment Audit)
        </h4>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Diagnostic Item 1: Protocol Checks */}
          <div className={`p-4 rounded-2xl border ${audit.hasHttpIssue ? 'bg-rose-50/50 border-rose-200' : 'bg-green-50/50 border-green-200'} transition-colors`}>
            <div className="flex items-center gap-2">
              <span className="text-lg">{audit.hasHttpIssue ? '❌' : '✅'}</span>
              <p className="font-black text-xs text-slate-800 uppercase tracking-tight">Giao thức HTTPS Webhook</p>
            </div>
            <p className="text-[10px] text-gray-500 font-semibold mt-1.5 leading-relaxed">
              {audit.hasHttpIssue 
                ? "CẢNH BÁO: Phát hiện yêu cầu gửi qua HTTP thường! Điều này kích hoạt cơ chế Redirect 302 bảo mật của Google Cloud Run. Vui lòng đổi URL SePay sang HTTPS."
                : "TỐT: Không phát hiện gói tin HTTP không an toàn. Mọi tín hiệu đều dùng SSL bảo mật."}
            </p>
          </div>

          {/* Diagnostic Item 2: Trailing Slash Checks */}
          <div className={`p-4 rounded-2xl border ${audit.hasTrailingSlashIssue ? 'bg-amber-50/50 border-amber-200' : 'bg-green-50/50 border-green-200'} transition-colors`}>
            <div className="flex items-center gap-2">
              <span className="text-lg">{audit.hasTrailingSlashIssue ? '⚠️' : '✅'}</span>
              <p className="font-black text-xs text-slate-800 uppercase tracking-tight">Ký tự gạch chéo cuối (Slash)</p>
            </div>
            <p className="text-[10px] text-gray-500 font-semibold mt-1.5 leading-relaxed">
              {audit.hasTrailingSlashIssue 
                ? "CHÚ Ý: Phát hiện URL chứa dấu gạch chéo '/' cuối cùng. Một số Proxy biên có thể tự động gửi Redirect 302 để chuẩn hóa đường link."
                : "TỐT: URL webhook được định dạng chuẩn kết thúc bằng chữ 'webhook'."}
            </p>
          </div>

          {/* Diagnostic Item 3: 5xx Exception Checks */}
          <div className={`p-4 rounded-2xl border ${audit.has5xxCrash ? 'bg-orange-50/50 border-orange-200' : 'bg-green-50/50 border-green-200'} transition-colors`}>
            <div className="flex items-center gap-2">
              <span className="text-lg">{audit.has5xxCrash ? '💥' : '✅'}</span>
              <p className="font-black text-xs text-slate-800 uppercase tracking-tight">Lỗi Sập Máy Chủ (5xx Errors)</p>
            </div>
            <p className="text-[10px] text-gray-500 font-semibold mt-1.5 leading-relaxed">
              {audit.has5xxCrash 
                ? "CẢNH BÁO: Phát hiện bản ghi sập nguồn 5xx hoặc ngoại lệ Exception hệ thống. Hãy kiểm tra tham số payload và cấu hình Firestore."
                : "TỐT: Máy chủ vận hành trơn tru, không phát hiện sự cố gián đoạn kết nối nội bộ."}
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Logs column */}
        <div className="lg:col-span-6 bg-white rounded-3xl border border-gray-150 overflow-hidden shadow-sm flex flex-col">
          <div className="p-4 bg-gray-50 border-b border-gray-100 flex items-center justify-between">
            <h5 className="font-extrabold text-xs text-slate-700 uppercase tracking-wider font-sans">10 Nhật ký Webhook mới nhất</h5>
            <span className="text-[10px] font-black uppercase text-rose-600 bg-rose-50 px-2.5 py-1 rounded-xl border border-rose-100 animate-pulse">Diagnostic Mode</span>
          </div>

          {/* Diagnostic Quick Filters */}
          <div className="p-3 bg-white border-b border-gray-100 flex gap-2">
            <button
              onClick={() => setActiveFilter('all')}
              className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer ${
                activeFilter === 'all' ? 'bg-slate-800 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              Tất cả
            </button>
            <button
              onClick={() => setActiveFilter('302-risks')}
              className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer ${
                activeFilter === '302-risks' ? 'bg-amber-500 text-white' : 'bg-amber-50 text-amber-700 border border-amber-100 hover:bg-amber-100'
              }`}
            >
              Lọc Nguy cơ 302
            </button>
            <button
              onClick={() => setActiveFilter('5xx-errors')}
              className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer ${
                activeFilter === '5xx-errors' ? 'bg-rose-600 text-white' : 'bg-rose-50 text-rose-700 border border-rose-100 hover:bg-rose-100'
              }`}
            >
              Lọc Sập nguồn 5xx
            </button>
          </div>

          {/* List items */}
          {isLoading ? (
            <div className="flex justify-center items-center py-16">
              <svg className="animate-spin h-5 w-5 text-rose-500" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            </div>
          ) : filteredLogs.length === 0 ? (
            <div className="p-12 text-center text-gray-400 font-bold text-xs">
              🎉 Không tìm thấy log nào thuộc bộ lọc này trong 10 bản ghi gần nhất.
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {filteredLogs.map((log) => {
                const isSelected = selectedLog?.id === log.id;
                const is302 = is302Risk(log);
                const is5xx = is5xxError(log);

                return (
                  <div
                    key={log.id}
                    onClick={() => setSelectedLog(log)}
                    className={`p-4 flex items-center justify-between cursor-pointer transition-colors ${
                      isSelected ? 'bg-rose-50/45 border-l-4 border-rose-500' : 'hover:bg-gray-50/40'
                    }`}
                  >
                    <div className="space-y-1 pr-4 min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {is302 && (
                          <span className="px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-wider bg-amber-100 text-amber-800 border border-amber-200">
                            302 RISK
                          </span>
                        )}
                        {is5xx && (
                          <span className="px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-wider bg-rose-100 text-rose-800 border border-rose-200">
                            5xx CRASH
                          </span>
                        )}
                        <span className="font-mono text-[9px] text-gray-400 font-bold">
                          {new Date(log.timestamp).toLocaleTimeString('vi-VN')}
                        </span>
                      </div>
                      <p className="font-bold text-xs text-slate-700 truncate max-w-xs">
                        {log.errorMessage || 'No Error Message'}
                      </p>
                      <p className="text-[10px] text-gray-400 truncate max-w-xs">
                        Ref: <span className="font-mono text-slate-600 font-semibold">{log.payload?.referenceId || log.payload?.id || 'N/A'}</span>
                      </p>
                    </div>

                    <span className="text-[10px] font-black uppercase text-slate-400 font-mono shrink-0">
                      {log.status}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Selected Log Inspector Visualizer */}
        <div className="lg:col-span-6 bg-slate-900 rounded-3xl p-6 border border-slate-950 text-slate-300 shadow-xl space-y-4 flex flex-col justify-between">
          {selectedLog ? (
            <div className="space-y-4 flex-1 flex flex-col justify-between">
              <div className="space-y-3">
                <div className="flex justify-between items-center pb-2 border-b border-slate-800">
                  <div>
                    <h5 className="font-extrabold text-sm text-white uppercase tracking-wider font-sans">Bộ Phân Tích Thuộc Tính Gói Tin</h5>
                    <p className="text-[10px] text-slate-500 font-semibold mt-0.5 font-mono">ID: {selectedLog.id}</p>
                  </div>
                  <span className="text-[9px] font-black px-2.5 py-1 rounded bg-slate-800 text-emerald-400 border border-slate-700 font-mono">
                    {new Date(selectedLog.timestamp).toLocaleTimeString('vi-VN')}
                  </span>
                </div>

                {/* Audit Analysis on Selected Log */}
                <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 text-[11px] space-y-1.5 font-medium leading-relaxed">
                  <p className="text-white font-extrabold text-[10px] uppercase tracking-wider font-sans pb-1.5 border-b border-slate-800">Phân tích chẩn đoán nhanh:</p>
                  <p className="text-slate-400">
                    - Phương thức: <span className="font-mono text-cyan-400 font-bold">{selectedLog.payload?.method || 'POST'}</span>
                  </p>
                  <p className="text-slate-400">
                    - Loại dữ liệu (Content-Type): <span className="font-mono text-pink-400 font-bold">{selectedLog.payload?.contentType || 'application/json'}</span>
                  </p>
                  <p className="text-slate-400">
                    - Tiêu đề Chuyển tiếp HTTPS: <span className="font-mono font-bold text-yellow-400">{selectedLog.payload?.headers?.['x-forwarded-proto'] || 'N/A'}</span>
                  </p>
                  <p className="text-slate-400">
                    - Nguy cơ 302: <span className={`font-mono font-black ${is302Risk(selectedLog) ? 'text-amber-500' : 'text-green-500'}`}>{is302Risk(selectedLog) ? 'CÓ (Xác suất cao)' : 'KHÔNG'}</span>
                  </p>
                  <p className="text-slate-400">
                    - Nguy cơ sập 5xx: <span className={`font-mono font-black ${is5xxError(selectedLog) ? 'text-rose-500' : 'text-green-500'}`}>{is5xxError(selectedLog) ? 'CÓ (Phát hiện lỗi)' : 'KHÔNG'}</span>
                  </p>
                </div>

                {/* JSON Tree View */}
                <div className="space-y-1.5">
                  <p className="text-white font-extrabold text-[10px] uppercase tracking-wider font-sans">Chi tiết tiêu đề & Payload thô:</p>
                  <pre className="p-3 bg-slate-950 text-cyan-400 font-mono text-[10px] rounded-xl overflow-auto leading-relaxed border border-slate-950 max-h-64 shadow-inner">
                    {JSON.stringify(selectedLog.payload, null, 2)}
                  </pre>
                </div>
              </div>

              <div className="pt-4 border-t border-slate-800 flex justify-between items-center text-[10px] text-slate-500 font-semibold font-sans">
                <span>User Agent: {selectedLog.userAgent || 'Unknown'}</span>
                <span className="font-mono">{selectedLog.status}</span>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-20 text-slate-500 text-xs font-bold leading-normal">
              <span>👈 Vui lòng chọn bản ghi log để hiển thị thanh công cụ thanh tra chuyên sâu.</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
