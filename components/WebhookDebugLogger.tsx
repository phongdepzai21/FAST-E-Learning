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

export const WebhookDebugLogger: React.FC = () => {
  const [logs, setLogs] = useState<WebhookLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedLog, setSelectedLog] = useState<WebhookLog | null>(null);
  const [isLive, setIsLive] = useState(true);

  useEffect(() => {
    if (!isLive) return;

    setIsLoading(true);
    const logsRef = collection(db, "payment_logs");
    const q = query(logsRef, orderBy("timestamp", "desc"), limit(20));

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
      setIsLoading(false);
    }, (err) => {
      console.error("Error subscribing to WebhookDebugLogger:", err);
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, [isLive, selectedLog]);

  // Extract critical routing headers safely
  const getHeader = (log: WebhookLog | null, headerName: string): string => {
    if (!log || !log.payload) return 'N/A';
    
    // Look in payload.headers or top level headers
    const headers = log.payload.headers || log.payload;
    if (!headers) return 'N/A';

    // Search case-insensitively
    const key = Object.keys(headers).find(k => k.toLowerCase() === headerName.toLowerCase());
    return key ? String(headers[key]) : 'N/A';
  };

  return (
    <div className="space-y-6 animate-in slide-in-from-bottom-5 duration-500">
      {/* Title Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-2xl font-black text-slate-800 tracking-tight flex items-center gap-3 uppercase">
            <span className="w-2 h-8 bg-purple-600 rounded-full shrink-0"></span>
            Giám sát Webhook Thời gian thực (Webhook Live Log Viewer)
          </h3>
          <p className="text-gray-500 text-xs font-semibold mt-1">
            Bảng điều khiển thanh tra mạng thời gian thực chuyên biệt để rà soát Header và phân tích nguyên nhân lỗi Chuyển hướng 302 trên Proxy biên.
          </p>
        </div>
        
        {/* Live streaming switch */}
        <div className="flex items-center gap-2 self-start sm:self-center">
          <span className="relative flex h-2 w-2">
            <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${isLive ? 'bg-green-400' : 'bg-gray-400'}`}></span>
            <span className={`relative inline-flex rounded-full h-2 w-2 ${isLive ? 'bg-green-500' : 'bg-gray-500'}`}></span>
          </span>
          <button
            onClick={() => setIsLive(!isLive)}
            className={`px-3.5 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer ${
              isLive ? 'bg-green-600 text-white shadow-sm' : 'bg-gray-200 text-gray-700'
            }`}
          >
            {isLive ? 'Live Streaming Active' : 'Live Suspended'}
          </button>
        </div>
      </div>

      {/* 302 Redirection Diagnosis Matrix Card */}
      <div className="bg-gradient-to-br from-slate-900 to-slate-950 text-slate-100 rounded-3xl p-6 border border-slate-950 shadow-xl space-y-4">
        <h4 className="font-extrabold text-sm text-purple-400 uppercase tracking-wider flex items-center gap-2 font-sans">
          <span>⚙️</span> Ma trận Chẩn Đoán Lỗi Chuyển Hướng 302 (302 Redirection Diagnosis)
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-xs font-semibold">
          <div className="bg-slate-900/80 p-4 rounded-2xl border border-slate-800/60 space-y-1">
            <span className="text-purple-400 text-[10px] uppercase font-black tracking-wider block">Giao thức HTTPS (Proto)</span>
            <p className="text-[10px] text-slate-400 leading-normal">
              Nếu <code className="text-yellow-400 font-mono">X-Forwarded-Proto</code> là <code className="text-rose-500 font-mono">"http"</code>, Google Cloud Run hoặc Cloudflare sẽ phát hành một phản hồi <strong className="text-amber-500">302 Redirect</strong> về HTTPS trước khi chạm tới code máy chủ.
            </p>
          </div>
          
          <div className="bg-slate-900/80 p-4 rounded-2xl border border-slate-800/60 space-y-1">
            <span className="text-purple-400 text-[10px] uppercase font-black tracking-wider block">Ký tự Slash "/"</span>
            <p className="text-[10px] text-slate-400 leading-normal">
              Việc gọi URL kết thúc bằng dấu gạch chéo (ví dụ: <code className="text-rose-400 font-mono">/api/sepay/webhook/</code>) sẽ kích hoạt quy trình chuẩn hóa đường dẫn của router, phản hồi <strong className="text-amber-500">302 Redirect</strong> về bản không có dấu gạch chéo.
            </p>
          </div>

          <div className="bg-slate-900/80 p-4 rounded-2xl border border-slate-800/60 space-y-1">
            <span className="text-purple-400 text-[10px] uppercase font-black tracking-wider block">Host & Port Mismatch</span>
            <p className="text-[10px] text-slate-400 leading-normal">
              Khi <code className="text-yellow-400 font-mono">Host</code> của webhook gọi lệch Port (ví dụ localhost:3000 vs localhost), proxy cân bằng tải sẽ thực thi Redirect để tự chuyển đổi đúng cổng mạng tương thích.
            </p>
          </div>

          <div className="bg-slate-900/80 p-4 rounded-2xl border border-slate-800/60 space-y-1">
            <span className="text-purple-400 text-[10px] uppercase font-black tracking-wider block">Bản chất của Lỗi 302</span>
            <p className="text-[10px] text-slate-400 leading-normal">
              Lỗi <strong className="text-rose-500">302</strong> xảy ra hoàn toàn ở các lớp cân bằng tải mạng (Proxy, Cloudflare, Netlify). <strong className="text-green-400">Yêu cầu SePay không bao giờ chạm tới code Express</strong> khi dính lỗi này!
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Side: Real-time Live Log Feed */}
        <div className="lg:col-span-5 bg-slate-950 border border-slate-900 rounded-3xl overflow-hidden shadow-2xl flex flex-col h-[580px]">
          <div className="p-4 bg-slate-900/60 border-b border-slate-900 flex justify-between items-center shrink-0">
            <span className="text-xs font-black text-slate-300 font-mono uppercase tracking-widest flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-ping"></span>
              Live Network Stream
            </span>
            <span className="text-[10px] text-slate-500 font-mono font-bold">20 Logs Limit</span>
          </div>

          {isLoading ? (
            <div className="flex-1 flex justify-center items-center">
              <svg className="animate-spin h-6 w-6 text-purple-500" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            </div>
          ) : logs.length === 0 ? (
            <div className="flex-1 flex items-center justify-center text-slate-500 font-bold text-xs italic">
              Console empty. No webhook traffic recorded yet.
            </div>
          ) : (
            <div className="flex-1 overflow-y-auto divide-y divide-slate-900/70 font-mono text-xs">
              {logs.map((log) => {
                const isSelected = selectedLog?.id === log.id;
                
                return (
                  <div
                    key={log.id}
                    onClick={() => setSelectedLog(log)}
                    className={`p-3.5 transition-all cursor-pointer text-left ${
                      isSelected 
                        ? 'bg-purple-950/20 border-l-4 border-purple-500 text-purple-300' 
                        : 'text-slate-400 hover:bg-slate-900/30'
                    }`}
                  >
                    <div className="flex justify-between items-center text-[10px] pb-1 font-bold">
                      <span className={`px-1.5 py-0.5 rounded text-[8px] font-black ${
                        log.status === 'success' ? 'bg-emerald-950 text-emerald-400' : 'bg-rose-950 text-rose-400'
                      }`}>
                        {log.status.toUpperCase()}
                      </span>
                      <span className="text-slate-600">
                        {new Date(log.timestamp).toLocaleTimeString('vi-VN')}
                      </span>
                    </div>
                    <p className="truncate text-[11px] font-extrabold text-slate-300">
                      {log.errorMessage || "Approved Transaction webhook"}
                    </p>
                    <div className="flex justify-between text-[10px] pt-1 text-slate-500 font-bold">
                      <span>Ref: {log.payload?.referenceId || 'N/A'}</span>
                      <span>{log.payload?.gateway || 'DEBUG'}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right Side: Network Header Inspector Visualizer */}
        <div className="lg:col-span-7 bg-slate-900 rounded-3xl p-6 border border-slate-950 text-slate-200 shadow-xl h-[580px] flex flex-col justify-between overflow-hidden">
          {selectedLog ? (
            <div className="flex-1 flex flex-col justify-between h-full overflow-hidden">
              <div className="space-y-4 flex-1 overflow-y-auto pr-1">
                <div className="flex justify-between items-start pb-3 border-b border-slate-800 shrink-0">
                  <div>
                    <h5 className="font-extrabold text-sm text-white uppercase tracking-wider font-sans">Bảng Phân Tích Tiêu Đề Mạng (Network Header Analyzer)</h5>
                    <p className="text-[10px] text-slate-500 font-mono mt-0.5">ID: {selectedLog.id}</p>
                  </div>
                  <span className="px-2.5 py-1 bg-slate-950 text-purple-400 font-mono text-[9px] font-black border border-slate-800 rounded">
                    HTTP POST
                  </span>
                </div>

                {/* VISUAL HEADERS INDICATORS MATRIX */}
                <div className="space-y-2">
                  <span className="text-[10px] font-black uppercase text-purple-400 tracking-wider block font-sans">Các Header bảo mật & Định tuyến nhạy cảm:</span>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {/* Host Header */}
                    <div className="bg-slate-950 p-3 rounded-2xl border border-slate-800 font-mono text-[11px] space-y-0.5 shadow-inner">
                      <span className="text-slate-500 text-[9px] font-bold uppercase block">1. Host (Đích đến)</span>
                      <p className="text-slate-200 font-bold select-all truncate">{getHeader(selectedLog, 'Host')}</p>
                      <p className="text-[9px] text-slate-500 leading-normal">Máy chủ biên tiếp nhận gói tin gốc.</p>
                    </div>

                    {/* Origin Header */}
                    <div className="bg-slate-950 p-3 rounded-2xl border border-slate-800 font-mono text-[11px] space-y-0.5 shadow-inner">
                      <span className="text-slate-500 text-[9px] font-bold uppercase block">2. Origin (Nguồn phát CORS)</span>
                      <p className="text-slate-200 font-bold select-all truncate">{getHeader(selectedLog, 'Origin')}</p>
                      <p className="text-[9px] text-slate-500 leading-normal">Nguồn gửi yêu cầu, quyết định giấy phép CORS.</p>
                    </div>

                    {/* Referer Header */}
                    <div className="bg-slate-950 p-3 rounded-2xl border border-slate-800 font-mono text-[11px] space-y-0.5 shadow-inner">
                      <span className="text-slate-500 text-[9px] font-bold uppercase block">3. Referer (Trang dẫn nguồn)</span>
                      <p className="text-slate-200 font-bold select-all truncate">{getHeader(selectedLog, 'Referer')}</p>
                      <p className="text-[9px] text-slate-500 leading-normal">Địa chỉ trang web giới thiệu cuộc gọi.</p>
                    </div>

                    {/* X-Forwarded-Proto Header */}
                    <div className="bg-slate-950 p-3 rounded-2xl border border-slate-800 font-mono text-[11px] space-y-0.5 shadow-inner">
                      <span className="text-slate-500 text-[9px] font-bold uppercase block">4. X-Forwarded-Proto (Giao thức thực tế)</span>
                      <p className={`font-black select-all truncate ${getHeader(selectedLog, 'x-forwarded-proto') === 'http' ? 'text-rose-500' : 'text-emerald-400'}`}>
                        {getHeader(selectedLog, 'x-forwarded-proto').toUpperCase()}
                      </p>
                      <p className="text-[9px] text-slate-500 leading-normal">Giao thức truyền của proxy. HTTP sẽ kích hoạt lỗi 302!</p>
                    </div>
                  </div>
                </div>

                {/* User Agent Row */}
                <div className="bg-slate-950 p-3 rounded-2xl border border-slate-800 font-mono text-[11px] space-y-0.5 shadow-inner">
                  <span className="text-slate-500 text-[9px] font-bold uppercase block">User-Agent (Trình duyệt/Công cụ gọi)</span>
                  <p className="text-slate-300 font-semibold select-all break-all">{selectedLog.userAgent || 'Unknown Caller'}</p>
                </div>

                {/* Raw Body Payload view */}
                <div className="space-y-1.5 shrink-0">
                  <span className="text-[10px] font-black uppercase text-purple-400 tracking-wider block font-sans">Dữ liệu Payload Thô nhận về (Raw Body):</span>
                  <pre className="p-3 bg-slate-950 text-cyan-400 font-mono text-[10px] rounded-2xl overflow-auto leading-relaxed border border-slate-950 max-h-44 shadow-inner">
                    {JSON.stringify(selectedLog.payload, null, 2)}
                  </pre>
                </div>
              </div>

              {/* Console Footbar */}
              <div className="pt-3 border-t border-slate-800 flex justify-between items-center text-[9px] text-slate-500 font-semibold shrink-0">
                <span>Timestamp: {new Date(selectedLog.timestamp).toISOString()}</span>
                <span className="font-mono text-purple-400">Ready</span>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-24 text-slate-500 text-xs font-bold leading-normal h-full">
              <span>👈 Chọn một cuộc gọi webhook bên trái để kích hoạt máy quét Header phân tích mạng.</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
