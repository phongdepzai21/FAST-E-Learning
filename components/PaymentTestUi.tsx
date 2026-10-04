import React, { useState, useEffect } from 'react';
import { useToast } from '../contexts/ToastContext';
import { PaymentDebugLogTable } from './PaymentDebugLogTable';

async function computeHmacSha256(secret: string, message: string): Promise<string> {
  const encoder = new TextEncoder();
  const keyData = encoder.encode(secret);
  const messageData = encoder.encode(message);

  const key = await window.crypto.subtle.importKey(
    "raw",
    keyData,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );

  const signatureBuffer = await window.crypto.subtle.sign(
    "HMAC",
    key,
    messageData
  );

  const hashArray = Array.from(new Uint8Array(signatureBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

export const PaymentTestUi: React.FC = () => {
  const toast = useToast();
  
  // Form fields
  const [gateway, setGateway] = useState('Vietcombank');
  const [accountNumber, setAccountNumber] = useState('102148293');
  const [transferType, setTransferType] = useState('in');
  const [transferAmount, setTransferAmount] = useState('1200000');
  const [content, setContent] = useState('FAST 128492');
  const [referenceId, setReferenceId] = useState('');
  const [secretKey, setSecretKey] = useState('X85V4RCQQ6CMMMZ8K2P3BOKAOTRPIZ7RYLY7HSVHUG3ZXW95VTUPKDUTRAQXWBNG');

  // Diagnostic states
  const [rawPayload, setRawPayload] = useState('');
  const [calculatedSignature, setCalculatedSignature] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [serverResponse, setServerResponse] = useState<any>(null);
  const [serverStatus, setServerStatus] = useState<number | null>(null);

  // Generate a mock reference ID on load
  useEffect(() => {
    setReferenceId("TEST_HMAC_" + Math.random().toString(36).substring(7).toUpperCase());
  }, []);

  // Recalculate raw body and signature whenever inputs change
  useEffect(() => {
    const payloadObj = {
      gateway,
      accountNumber,
      transferType,
      transferAmount: Number(transferAmount) || 0,
      content,
      referenceId,
      transactionDate: new Date().toISOString().replace('T', ' ').substring(0, 19)
    };

    const payloadString = JSON.stringify(payloadObj, null, 2);
    setRawPayload(payloadString);

    // Compute signature using exact web crypto API
    computeHmacSha256(secretKey, JSON.stringify(payloadObj))
      .then(sig => setCalculatedSignature(sig))
      .catch(err => console.error("Error computing signature:", err));
  }, [gateway, accountNumber, transferType, transferAmount, content, referenceId, secretKey]);

  const handleSendSimulatedRequest = async () => {
    setIsSending(true);
    setServerResponse(null);
    setServerStatus(null);

    try {
      console.log("[PaymentTestUi:Debug] Sending simulated webhook to /api/sepay/webhook with signature:", calculatedSignature);
      const res = await fetch("/api/sepay/webhook", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-sepay-signature": calculatedSignature
        },
        body: rawPayload
      });

      setServerStatus(res.status);
      const data = await res.json();
      setServerResponse(data);

      if (res.ok && data.success) {
        toast.success("Giả lập Webhook bảo mật HMAC-SHA256 thành công rực rỡ!");
      } else {
        toast.error(`Máy chủ từ chối: ${data.error || 'Lỗi không xác định'}`);
      }
    } catch (err: any) {
      console.error(err);
      toast.error("Lỗi kết nối khi gửi yêu cầu giả lập.");
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="space-y-8 animate-in slide-in-from-bottom-5 duration-500">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-2xl font-black text-gray-800 tracking-tight flex items-center gap-3 uppercase">
            <span className="w-2 h-8 bg-[#007c76] rounded-full shrink-0"></span>
            Giao diện Kiểm thử Webhook bảo mật HMAC-SHA256
          </h3>
          <p className="text-gray-500 text-xs font-semibold mt-1">
            Mô phỏng quy trình xử lý ký số bảo mật đầu-cuối của SePay và kiểm thử tính toàn vẹn của thuật toán mã hóa trên Server.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column: Form Controls */}
        <div className="lg:col-span-5 bg-white p-6 rounded-3xl border border-gray-150 shadow-sm space-y-4">
          <h4 className="font-extrabold text-sm text-gray-800 uppercase tracking-wider pb-2 border-b border-gray-100 font-sans">Thông tin chuyển khoản giả lập</h4>
          
          <div className="space-y-3 text-xs font-semibold">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-gray-400 font-bold">Ngân hàng nhận</label>
                <input
                  type="text"
                  value={gateway}
                  onChange={(e) => setGateway(e.target.value)}
                  className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl"
                />
              </div>
              <div className="space-y-1">
                <label className="text-gray-400 font-bold">Số tài khoản nhận</label>
                <input
                  type="text"
                  value={accountNumber}
                  onChange={(e) => setAccountNumber(e.target.value)}
                  className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-gray-400 font-bold">Loại giao dịch</label>
                <select
                  value={transferType}
                  onChange={(e) => setTransferType(e.target.value)}
                  className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl outline-none"
                >
                  <option value="in">Tiền vào (Có)</option>
                  <option value="out">Tiền ra (Nợ)</option>
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-gray-400 font-bold">Số tiền chuyển (VND)</label>
                <input
                  type="number"
                  value={transferAmount}
                  onChange={(e) => setTransferAmount(e.target.value)}
                  className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-gray-400 font-bold">Nội dung chuyển khoản (Memo)</label>
              <input
                type="text"
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Ví dụ: FAST 128492"
                className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl text-sm font-bold text-[#007c76]"
              />
            </div>

            <div className="space-y-1">
              <label className="text-gray-400 font-bold">Mã tham chiếu SePay (Reference ID)</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={referenceId}
                  onChange={(e) => setReferenceId(e.target.value)}
                  className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl"
                />
                <button
                  type="button"
                  onClick={() => setReferenceId("TEST_HMAC_" + Math.random().toString(36).substring(7).toUpperCase())}
                  className="px-3 bg-gray-100 border border-gray-200 hover:bg-gray-200 rounded-xl transition-all cursor-pointer"
                  title="Tạo mã ngẫu nhiên"
                >
                  🔄
                </button>
              </div>
            </div>

            <div className="space-y-1 pt-2">
              <label className="text-[#007c76] flex items-center gap-1.5 font-black uppercase tracking-wider">
                <span>🔐</span> Khóa bí mật (HMAC Webhook Secret)
              </label>
              <input
                type="text"
                value={secretKey}
                onChange={(e) => setSecretKey(e.target.value)}
                className="w-full p-3 bg-teal-50/50 border-2 border-teal-200 focus:border-[#007c76] rounded-xl font-mono text-xs text-teal-900 select-all"
              />
              <p className="text-[10px] text-gray-400 font-medium leading-normal">Bản mã hash SHA-256 sẽ tự động thay đổi khi bạn chỉnh sửa khóa bí mật này.</p>
            </div>
          </div>
        </div>

        {/* Right Column: HMAC Steps and Logs */}
        <div className="lg:col-span-7 bg-white p-6 md:p-8 rounded-3xl border border-gray-150 shadow-sm space-y-6">
          <h4 className="font-extrabold text-sm text-gray-800 uppercase tracking-wider pb-2 border-b border-gray-100 font-sans">Các bước xử lý ký số bảo mật</h4>

          {/* Steps list */}
          <div className="space-y-5 text-xs">
            {/* Step 1: Raw payload */}
            <div className="space-y-1.5">
              <p className="font-bold text-gray-700">Bước 1: Payload dữ liệu thô (JSON Body)</p>
              <pre className="p-3 bg-slate-50 border border-slate-200 rounded-2xl overflow-x-auto text-[10px] font-mono leading-relaxed text-slate-800 max-h-40">
                {rawPayload}
              </pre>
            </div>

            {/* Step 2: Signature display */}
            <div className="space-y-1.5">
              <p className="font-bold text-gray-700">Bước 2: Kết quả Ký số HMAC-SHA256 HEX</p>
              <div className="p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-2xl font-mono text-xs font-bold select-all break-all">
                {calculatedSignature || 'Đang tạo khóa...'}
              </div>
            </div>

            {/* Step 3: Action Trigger */}
            <div className="space-y-3 pt-2">
              <button
                onClick={handleSendSimulatedRequest}
                disabled={isSending}
                className="w-full py-3.5 bg-[#007c76] hover:bg-[#00605b] text-white rounded-xl font-black uppercase tracking-wider transition-all disabled:opacity-50 cursor-pointer flex items-center justify-center gap-2"
              >
                {isSending ? (
                  <>
                    <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <span>Đang truyền phát gói tin ký số...</span>
                  </>
                ) : (
                  <span>🚀 Phát thử yêu cầu giả lập SePay HMAC-SHA256</span>
                )}
              </button>
            </div>

            {/* Step 4: Server response logs */}
            {serverResponse && (
              <div className="space-y-2 animate-in fade-in duration-300">
                <p className="font-bold text-gray-700">Phản hồi của Máy chủ (Response Logs)</p>
                <div className={`p-4 rounded-2xl border ${serverStatus === 200 && serverResponse.success ? 'bg-green-50 border-green-200 text-green-800' : 'bg-red-50 border-red-200 text-red-800'}`}>
                  <div className="flex justify-between items-center mb-2">
                    <span className="font-extrabold text-sm uppercase">HTTP STATUS: {serverStatus}</span>
                    <span className={`px-2 py-0.5 rounded text-[9px] font-black ${serverStatus === 200 && serverResponse.success ? 'bg-green-200 text-green-950' : 'bg-red-200 text-red-950'}`}>
                      {serverStatus === 200 && serverResponse.success ? 'ACCEPTED' : 'REJECTED'}
                    </span>
                  </div>
                  <pre className="text-[10px] font-mono whitespace-pre-wrap leading-relaxed select-all">
                    {JSON.stringify(serverResponse, null, 2)}
                  </pre>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Real-time Webhook Debug Failure Logs */}
      <PaymentDebugLogTable />
    </div>
  );
};
