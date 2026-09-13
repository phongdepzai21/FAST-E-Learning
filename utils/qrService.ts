export interface PaymentAccountConfig {
  bankId: string;
  bankName: string;
  accountNo: string;
  accountName: string;
  momoPhone: string;
  momoName: string;
}

export const POPULAR_BANKS = [
  { id: 'MB', name: 'MB Bank (Quân Đội)', shortName: 'MBBank' },
  { id: 'VCB', name: 'Vietcombank (Ngoại Thương)', shortName: 'Vietcombank' },
  { id: 'TCB', name: 'Techcombank (Kỹ Thương)', shortName: 'Techcombank' },
  { id: 'ACB', name: 'ACB (Á Châu)', shortName: 'ACB' },
  { id: 'VPB', name: 'VPBank (Việt Nam Thịnh Vượng)', shortName: 'VPBank' },
  { id: 'BIDV', name: 'BIDV (Đầu tư & Phát triển)', shortName: 'BIDV' },
  { id: 'CTG', name: 'VietinBank (Công Thương)', shortName: 'VietinBank' },
  { id: 'TPB', name: 'TPBank (Tiên Phong)', shortName: 'TPBank' },
  { id: 'VIB', name: 'VIB (Quốc Tế)', shortName: 'VIB' },
  { id: 'SHB', name: 'SHB (Sài Gòn - Hà Nội)', shortName: 'SHB' },
  { id: 'STB', name: 'Sacombank (Sài Gòn Thương Tín)', shortName: 'Sacombank' },
  { id: 'HDB', name: 'HDBank (Phát Triển TP.HCM)', shortName: 'HDBank' },
];

export const DEFAULT_PAYMENT_CONFIG: PaymentAccountConfig = {
  bankId: 'MB',
  bankName: 'MB Bank (Quân Đội)',
  accountNo: '0927002668',
  accountName: 'CONG TY TNHH DAO TAO FAST',
  momoPhone: '0927002668',
  momoName: 'CÔNG TY TNHH ĐÀO TẠO FAST',
};

/**
 * Get configured payment accounts with fallback to defaults
 */
export function getPaymentConfig(): PaymentAccountConfig {
  if (typeof window === 'undefined') return DEFAULT_PAYMENT_CONFIG;
  try {
    const saved = localStorage.getItem('fast_payment_account_config');
    if (saved) {
      const parsed = JSON.parse(saved);
      return { ...DEFAULT_PAYMENT_CONFIG, ...parsed };
    }
  } catch (e) {
    console.warn('Could not read payment config:', e);
  }
  return DEFAULT_PAYMENT_CONFIG;
}

/**
 * Save updated payment account config
 */
export function savePaymentConfig(config: Partial<PaymentAccountConfig>) {
  if (typeof window === 'undefined') return;
  try {
    const current = getPaymentConfig();
    const updated = { ...current, ...config };
    localStorage.setItem('fast_payment_account_config', JSON.stringify(updated));
    window.dispatchEvent(new CustomEvent('payment_config_updated', { detail: updated }));
  } catch (e) {
    console.warn('Could not save payment config:', e);
  }
}

/**
 * Parse any price string (e.g., "500k", "1.5tr", "2.000.000đ", "599", "Miễn phí") into a pure number
 */
export function parseNumericPrice(rawPrice: string | number | undefined | null): number {
  if (rawPrice === undefined || rawPrice === null) return 0;
  if (typeof rawPrice === 'number') return Math.max(0, Math.round(rawPrice));

  const clean = String(rawPrice).trim().toLowerCase();
  if (!clean || clean === 'miễn phí' || clean === 'free' || clean === '0đ' || clean === '0' || clean === '0 vnd') {
    return 0;
  }

  // 1. Check for 'tỷ' / 'ty' / 'b'
  if (/(?:tỷ|ty|b)$/i.test(clean)) {
    const numPart = clean.replace(/(?:tỷ|ty|b)$/i, '').replace(/,/g, '.').replace(/[^\d.]/g, '');
    const val = parseFloat(numPart);
    if (!isNaN(val) && val > 0) return Math.round(val * 1000000000);
  }

  // 2. Check for 'tr', 'triệu', 'm'
  if (/(?:tr|triệu|trieu|m)$/i.test(clean)) {
    const numPart = clean.replace(/(?:tr|triệu|trieu|m)$/i, '').replace(/,/g, '.').replace(/[^\d.]/g, '');
    const val = parseFloat(numPart);
    if (!isNaN(val) && val > 0) return Math.round(val * 1000000);
  }

  // 2b. Case like "1tr5" -> 1.5 million
  const trMatches = clean.match(/^(\d+)tr(\d+)$/i);
  if (trMatches) {
    const main = parseInt(trMatches[1], 10);
    const sub = parseInt(trMatches[2], 10);
    return main * 1000000 + sub * 100000;
  }

  // 3. Check for 'k', 'nghìn', 'ngàn'
  if (/(?:nghìn|ngàn|ngan|k)$/i.test(clean)) {
    const numPart = clean.replace(/(?:nghìn|ngàn|ngan|k)$/i, '').replace(/,/g, '.').replace(/[^\d.]/g, '');
    const val = parseFloat(numPart);
    if (!isNaN(val) && val > 0) return Math.round(val * 1000);
  }

  // 4. Currency symbol 'đ' or 'vnd'
  if (clean.endsWith('đ') || clean.endsWith('vnd')) {
    const digitsAndDots = clean.replace(/[^\d.,]/g, '');
    const numPart = digitsAndDots.replace(/\./g, '').replace(/,/g, '.');
    const val = parseFloat(numPart);
    if (!isNaN(val) && val > 0) return Math.round(val);
  }

  // 5. Raw digits or dotted format like "1.500.000" or "500000"
  const digitsOnly = clean.replace(/[^\d]/g, '');
  if (digitsOnly.length > 0) {
    const num = parseInt(digitsOnly, 10);
    if (num < 10) return num * 1000000; // "2" -> 2.000.000
    if (num >= 10 && num < 1000) return num * 1000; // "599" -> 599.000
    return num;
  }

  return 0;
}

/**
 * Format numeric amount into Vietnamese currency format (e.g. 500.000đ)
 */
export function formatVND(amount: number): string {
  if (amount <= 0) return 'Miễn phí';
  return amount.toLocaleString('vi-VN') + 'đ';
}

/**
 * Generate official VietQR dynamic QR code image URL
 * Template options: 'compact2' (with bank frame & info), 'compact', 'qr_only'
 */
export function getVietQrUrl(params: {
  bankId?: string;
  accountNo?: string;
  accountName?: string;
  amount: number;
  memo: string;
  template?: 'compact2' | 'compact' | 'qr_only';
}): string {
  const cfg = getPaymentConfig();
  const bankId = params.bankId || cfg.bankId || 'MB';
  const accountNo = (params.accountNo || cfg.accountNo || '0927002668').replace(/\s+/g, '');
  const accountName = params.accountName || cfg.accountName || 'CONG TY TNHH DAO TAO FAST';
  const template = params.template || 'compact2';
  const amount = Math.max(0, Math.round(params.amount));
  const memo = params.memo || 'FAST DANG KY KHOA HOC';

  return `https://img.vietqr.io/image/${bankId}-${accountNo}-${template}.png?amount=${amount}&addInfo=${encodeURIComponent(memo)}&accountName=${encodeURIComponent(accountName)}`;
}

/**
 * Generate MoMo dynamic QR code image URL
 */
export function getMomoQrUrl(params: {
  phone?: string;
  name?: string;
  amount: number;
  memo: string;
}): string {
  const cfg = getPaymentConfig();
  const phone = (params.phone || cfg.momoPhone || '0927002668').replace(/\s+/g, '');
  const name = params.name || cfg.momoName || 'CÔNG TY TNHH ĐÀO TẠO FAST';
  const amount = Math.max(0, Math.round(params.amount));
  const memo = params.memo || 'FAST DANG KY KHOA HOC';

  // MoMo transfer protocol payload
  const momoPayload = `2|99|${phone}|${name}||0|0|${amount}|${memo}|transfer_myqr`;
  return `https://api.qrserver.com/v1/create-qr-code/?size=350x350&data=${encodeURIComponent(momoPayload)}&margin=10`;
}

/**
 * Create a clean payment transfer memo from course id or title
 */
export function generatePaymentMemo(courseId: string, courseTitle?: string): string {
  const cleanId = (courseId || 'KHOAHOC')
    .replace(/[^a-zA-Z0-9]/g, '')
    .slice(0, 8)
    .toUpperCase();
  return `FAST ${cleanId}`;
}
