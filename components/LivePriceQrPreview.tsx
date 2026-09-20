import React, { useState, useEffect } from 'react';
import {
  parseNumericPrice,
  formatVND,
  getVietQrUrl,
  
  generatePaymentMemo,
  getPaymentConfig,
  savePaymentConfig,
  POPULAR_BANKS,
  PaymentAccountConfig,
} from '../utils/qrService';

interface LivePriceQrPreviewProps {
  price: string;
  onPriceChange?: (newPrice: string) => void;
  courseId?: string;
  courseTitle?: string;
  readOnly?: boolean;
}

export const LivePriceQrPreview: React.FC<LivePriceQrPreviewProps> = ({
  price,
  onPriceChange,
  courseId = 'NEW',
  courseTitle = '',
  readOnly = false,
}) => {
  const [config, setConfig] = useState<PaymentAccountConfig>(getPaymentConfig);
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [qrLoaded, setQrLoaded] = useState(false);

  useEffect(() => {
    const handleConfigUpdate = (e: any) => {
      if (e.detail) setConfig(e.detail);
    };
    window.addEventListener('payment_config_updated', handleConfigUpdate);
    return () => window.removeEventListener('payment_config_updated', handleConfigUpdate);
  }, []);

  const amount = parseNumericPrice(price);
  const memo = generatePaymentMemo(courseId, courseTitle);

  const vietQrUrl = getVietQrUrl({
    bankId: config.bankId,
    accountNo: config.accountNo,
    accountName: config.accountName,
    amount,
    memo,
    template: 'compact2',
  });


  const currentQrUrl = vietQrUrl;

  const copyToClipboard = (text: string, fieldName: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(fieldName);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const [isCustomPriceOpen, setIsCustomPriceOpen] = useState(false);
  const [customPriceInput, setCustomPriceInput] = useState('');

  const pricePresets = [
    { label: '199.000đ', val: '199.000đ' },
    { label: '399.000đ', val: '399.000đ' },
    { label: '499.000đ', val: '499.000đ' },
    { label: '599.000đ', val: '599.000đ' },
  ];

  return (
    <div className="bg-gradient-to-br from-teal-50/70 via-emerald-50/40 to-slate-50 rounded-2xl p-4 sm:p-5 border border-teal-200/80 shadow-sm space-y-4">
      {/* Header & Status */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-teal-100 pb-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-[#007c76] text-white flex items-center justify-center font-bold text-sm shadow-sm">
            QR
          </div>
          <div>
            <h4 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
              Cập nhật mã QR thanh toán động
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
            </h4>
            <p className="text-[11px] text-slate-500">Tự động đồng bộ theo giá tiền bạn nhập trong thời gian thực</p>
          </div>
        </div>

        {!readOnly && (
          <button
            type="button"
            onClick={() => setShowConfigModal(!showConfigModal)}
            className="text-xs font-semibold text-[#007c76] hover:text-[#005f5a] hover:bg-teal-100/60 px-2.5 py-1.5 rounded-lg border border-teal-200/60 transition-colors flex items-center gap-1"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
            </svg>
            <span>{showConfigModal ? 'Đóng cấu hình STK' : 'Cấu hình STK nhận tiền'}</span>
          </button>
        )}
      </div>

      {/* Account Configuration Drawer / Box */}
      {showConfigModal && !readOnly && (
        <div className="bg-white rounded-xl p-4 border border-teal-200 shadow-sm space-y-3 animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="flex items-center justify-between border-b border-gray-100 pb-2">
            <span className="text-xs font-bold text-slate-800 uppercase tracking-wide">
              Thông tin tài khoản nhận học phí
            </span>
            <span className="text-[11px] text-teal-600 font-medium">Lưu tự động vào hệ thống</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div>
              <label className="font-semibold text-slate-700 block mb-1">Ngân hàng (VietQR)</label>
              <select
                value={config.bankId}
                onChange={(e) => {
                  const b = POPULAR_BANKS.find((x) => x.id === e.target.value);
                  const updated = { bankId: e.target.value, bankName: b?.name || e.target.value };
                  setConfig((prev) => ({ ...prev, ...updated }));
                  savePaymentConfig(updated);
                }}
                className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg font-medium text-slate-800"
              >
                {POPULAR_BANKS.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name} ({b.id})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="font-semibold text-slate-700 block mb-1">Số tài khoản ngân hàng</label>
              <input
                type="text"
                value={config.accountNo}
                onChange={(e) => {
                  const val = e.target.value;
                  setConfig((prev) => ({ ...prev, accountNo: val }));
                  savePaymentConfig({ accountNo: val });
                }}
                placeholder="VD: 0927002668"
                className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg font-medium text-slate-800"
              />
            </div>

            <div>
              <label className="font-semibold text-slate-700 block mb-1">Tên chủ tài khoản ngân hàng</label>
              <input
                type="text"
                value={config.accountName}
                onChange={(e) => {
                  const val = e.target.value.toUpperCase();
                  setConfig((prev) => ({ ...prev, accountName: val }));
                  savePaymentConfig({ accountName: val });
                }}
                placeholder="VD: CONG TY TNHH DAO TAO FAST"
                className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg font-medium text-slate-800 uppercase"
              />
            </div>

          </div>
        </div>
      )}

      {/* Quick Price Preset Chips (If editable) */}
      {!readOnly && onPriceChange && (
        <div className="flex flex-wrap items-center gap-1.5 pb-1 text-xs">
          <span className="text-[11px] font-bold text-slate-500 shrink-0">Chọn nhanh:</span>
          {pricePresets.map((preset) => {
            const isSelected =
              price === preset.val ||
              parseNumericPrice(preset.val) === amount;
            return (
              <button
                key={preset.val}
                type="button"
                onClick={() => {
                  setIsCustomPriceOpen(false);
                  onPriceChange(preset.val);
                }}
                className={`px-2.5 py-1 rounded-lg font-bold transition-all text-xs shrink-0 cursor-pointer ${
                  isSelected && !isCustomPriceOpen
                    ? 'bg-[#007c76] text-white shadow-sm scale-102'
                    : 'bg-white hover:bg-teal-50 text-slate-700 border border-slate-200'
                }`}
              >
                {preset.label}
              </button>
            );
          })}

          {/* Tùy chỉnh giá */}
          {!isCustomPriceOpen ? (
            <button
              type="button"
              onClick={() => {
                setIsCustomPriceOpen(true);
                setCustomPriceInput(amount > 0 ? formatVND(amount) : '');
              }}
              className={`px-2.5 py-1 rounded-lg font-bold transition-all text-xs shrink-0 cursor-pointer flex items-center gap-1 ${
                !pricePresets.some(p => parseNumericPrice(p.val) === amount) && amount > 0
                  ? 'bg-amber-500 text-white shadow-sm'
                  : 'bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200'
              }`}
            >
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4"/></svg>
              <span>{(!pricePresets.some(p => parseNumericPrice(p.val) === amount) && amount > 0) ? `Tùy chỉnh: ${formatVND(amount)}` : 'Chỉnh sửa thêm tùy'}</span>
            </button>
          ) : (
            <div className="flex items-center gap-1.5 bg-white p-1 rounded-lg border border-[#007c76] shadow-sm animate-in fade-in">
              <input
                type="text"
                autoFocus
                value={customPriceInput}
                onChange={(e) => setCustomPriceInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    const num = parseNumericPrice(customPriceInput);
                    if (num > 0) {
                      onPriceChange(formatVND(num));
                      setIsCustomPriceOpen(false);
                    }
                  } else if (e.key === 'Escape') {
                    setIsCustomPriceOpen(false);
                  }
                }}
                placeholder="Nhập giá (VD: 699.000)..."
                className="px-2 py-0.5 text-xs font-bold text-slate-800 focus:outline-none w-36"
              />
              <button
                type="button"
                onClick={() => {
                  const num = parseNumericPrice(customPriceInput);
                  if (num > 0) {
                    onPriceChange(formatVND(num));
                    setIsCustomPriceOpen(false);
                  }
                }}
                className="px-2 py-0.5 bg-[#007c76] text-white rounded font-bold text-xs hover:bg-[#00625d] cursor-pointer"
              >
                Áp dụng
              </button>
              <button
                type="button"
                onClick={() => setIsCustomPriceOpen(false)}
                className="px-1.5 py-0.5 text-slate-400 hover:text-slate-600 text-xs font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>
          )}
        </div>
      )}

      {/* QR Content Area */}
      {amount === 0 ? (
        <div className="bg-emerald-50/80 rounded-xl p-4 border border-emerald-200 flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-emerald-500 text-white flex items-center justify-center shrink-0">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <div>
            <h5 className="text-sm font-bold text-emerald-900">Khóa học Miễn Phí (0đ)</h5>
            <p className="text-xs text-emerald-700 mt-0.5">
              Học viên sẽ được nhận khóa học và vào học ngay lập tức chỉ với 1 click, không phát sinh giao dịch QR chuyển khoản.
            </p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
          {/* Method tabs + QR Box */}
          <div className="md:col-span-5 flex flex-col items-center">

            {/* QR Image Frame */}
            <div className="relative w-48 h-48 bg-white p-2.5 rounded-2xl shadow-md border-2 border-teal-200 flex items-center justify-center overflow-hidden">
              <img
                src={currentQrUrl}
                alt={`Mã QR ${formatVND(amount)}`}
                key={`${currentQrUrl}-${amount}`}
                onLoad={() => setQrLoaded(true)}
                className={`w-full h-full object-contain transition-opacity duration-300 ${
                  qrLoaded ? 'opacity-100' : 'opacity-40 blur-xs'
                }`}
              />

              {!qrLoaded && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/70 backdrop-blur-xs">
                  <svg className="w-6 h-6 animate-spin text-[#007c76]" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    />
                  </svg>
                  <span className="text-[10px] font-semibold text-slate-500 mt-1">Đang tạo mã QR...</span>
                </div>
              )}
            </div>

            <div className="mt-2 text-center">
              <a
                href={currentQrUrl}
                target="_blank"
                rel="noreferrer"
                download={`QR_${memo}_${amount}.png`}
                className="text-[11px] font-bold text-[#007c76] hover:underline inline-flex items-center gap-1"
              >
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                Tải ảnh mã QR này
              </a>
            </div>
          </div>

          {/* Details & Copy Actions */}
          <div className="md:col-span-7 space-y-2.5 text-xs">
            {/* Amount tag */}
            <div className="bg-white p-3 rounded-xl border border-teal-100 shadow-xs flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  Số tiền thanh toán tự động
                </span>
                <span className="text-base font-black text-[#007c76]">{formatVND(amount)}</span>
              </div>
              <button
                type="button"
                onClick={() => copyToClipboard(String(amount), 'amount')}
                className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-lg text-[11px] transition-colors"
              >
                {copiedField === 'amount' ? '✓ Đã chép' : 'Sao chép số'}
              </button>
            </div>

            {/* Transfer memo */}
            <div className="bg-white p-3 rounded-xl border border-teal-100 shadow-xs flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  Nội dung chuyển khoản (Tự động gắn mã)
                </span>
                <span className="text-xs font-mono font-bold text-slate-900">{memo}</span>
              </div>
              <button
                type="button"
                onClick={() => copyToClipboard(memo, 'memo')}
                className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-lg text-[11px] transition-colors"
              >
                {copiedField === 'memo' ? '✓ Đã chép' : 'Sao chép mã'}
              </button>
            </div>

            {/* Account Info */}
            <div className="bg-white p-3 rounded-xl border border-teal-100 shadow-xs space-y-1.5">
                  <div className="flex justify-between items-center text-[11px]">
                    <span className="text-slate-500">Ngân hàng thụ hưởng:</span>
                    <span className="font-bold text-slate-800">{config.bankName} ({config.bankId})</span>
                  </div>
                  <div className="flex justify-between items-center text-[11px]">
                    <span className="text-slate-500">Số tài khoản:</span>
                    <span className="font-mono font-bold text-[#007c76] flex items-center gap-1">
                      {config.accountNo}
                      <button
                        type="button"
                        onClick={() => copyToClipboard(config.accountNo, 'accNo')}
                        className="text-[10px] bg-teal-50 text-teal-700 px-1 rounded hover:bg-teal-100"
                      >
                        {copiedField === 'accNo' ? '✓' : 'Copy'}
                      </button>
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-[11px]">
                    <span className="text-slate-500">Chủ tài khoản:</span>
                    <span className="font-bold text-slate-800 uppercase">{config.accountName}</span>
                  </div>
</div>
            <div className="text-[11px] text-slate-500 italic">
              💡 Học viên mở bất kỳ ứng dụng ngân hàng quét mã QR trên là số tiền <strong>{formatVND(amount)}</strong> và nội dung sẽ được điền chuẩn xác 100%.
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LivePriceQrPreview;
