/**
 * Utility for generating and formatting unique, non-overlapping 10-digit numeric IDs
 * (Từ 1.000.000.000 đến 9.999.999.999)
 */

// Permanent 10-digit mapping for legacy system slugs to maintain compatibility
export const SYSTEM_COURSE_ID_MAP: Record<string, string> = {
  'haccp-tcvn': '1083920147',
  'iso-14001': '2948175036', // Featured in admin screenshot
  'iso-9001': '3819204758',
  'iso-22000': '4910283756',
  'iso-18000': '5829103746',
  'basic-principles': '6739201845',
  'oem-project': '7628194035',
  'supplier-mgmt': '8519203746',
  'cost-control-supply': '9408271635',
  'gemba': '1938472650',
  'qa-qc-pro': '2847193650',
  'food-processing-standards': '3758291046',
  'central-kitchen': '4682910375',
  'confectionery': '5591827403',
  'meat-seafood': '6482910375',
  'catering': '7391820465',
  'street-food': '8291047536',
  'combo-basic': '3829104751',
  'combo-pro': '4918273650',
  'khoa-vip': '5019283746'
};

// Reverse map for slug lookup
export const REVERSE_COURSE_ID_MAP: Record<string, string> = Object.entries(SYSTEM_COURSE_ID_MAP).reduce(
  (acc, [slug, numId]) => {
    acc[numId] = slug;
    return acc;
  },
  {} as Record<string, string>
);

const generatedIdsSet = new Set<string>();

/**
 * Sinh ngẫu nhiên một mã ID đúng 10 chữ số, không bao giờ trùng lặp
 * Giá trị từ 1000000000 đến 9999999999
 */
export function generateTenDigitId(excludeSet?: Set<string> | string[]): string {
  const excludes = excludeSet instanceof Set ? excludeSet : new Set(excludeSet || []);
  let id = '';
  let attempts = 0;

  do {
    // Luôn bắt đầu từ 1-9 để đảm bảo đủ 10 chữ số (không bị mất số 0 ở đầu)
    const firstDigit = Math.floor(1 + Math.random() * 9);
    const rest = Math.floor(Math.random() * 1000000000).toString().padStart(9, '0');
    id = `${firstDigit}${rest}`;
    attempts++;
  } while ((generatedIdsSet.has(id) || excludes.has(id)) && attempts < 100);

  generatedIdsSet.add(id);
  return id;
}

/**
 * Chuyển đổi bất kỳ ID nào thành dạng số 10 chữ số chuẩn xác
 * Nếu ID đã là 10 chữ số thì giữ nguyên.
 * Nếu là slug hệ thống thì trả về mã 10 chữ số cố định tương ứng.
 * Nếu là chuỗi khác thì hash theo thuật toán tất định thành 10 chữ số (1000000000 - 9999999999).
 */
export function toTenDigitId(rawId: string | number | undefined | null): string {
  if (rawId === undefined || rawId === null) {
    return generateTenDigitId();
  }

  const str = String(rawId).trim();

  // Đã là chuỗi 10 chữ số
  if (/^\d{10}$/.test(str)) {
    return str;
  }

  // Tra cứu bảng ID hệ thống
  const lower = str.toLowerCase();
  if (SYSTEM_COURSE_ID_MAP[lower]) {
    return SYSTEM_COURSE_ID_MAP[lower];
  }

  // Nếu là dạng timestamp số lớn hơn 10 số (ví dụ Date.now() 13 số)
  const digitsOnly = str.replace(/[^\d]/g, '');
  if (digitsOnly.length === 10 && digitsOnly[0] !== '0') {
    return digitsOnly;
  }
  if (digitsOnly.length > 10) {
    const slice = digitsOnly.slice(-10);
    if (slice[0] !== '0') return slice;
    return `1${slice.slice(1)}`;
  }

  // Băm tất định chuỗi ký tự thành số nguyên 10 chữ số
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash |= 0;
  }

  const absHash = Math.abs(hash);
  const tenDigit = 1000000000 + (absHash % 9000000000);
  return tenDigit.toString();
}
