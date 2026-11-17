import { jsPDF } from 'jspdf';

export const FAST_COMPANY_LOGO_URL =
  'https://dl.dropboxusercontent.com/scl/fi/fnnr149ucl9nymrqhchit/logonoback.png?rlkey=1h1g4j7b7d6csa3833vi1iado&st=5non0qck';

export interface ReceiptLineItem {
  name: string;
  category?: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
}

export interface WhiteReceiptPdfPayload {
  receiptNo: string;
  studentName: string;
  email: string;
  phone?: string;
  companyName?: string;
  courseTitle: string;
  amount: string | number;
  paidAt: string;
  paymentCode?: string;
  transactionId?: string;
  paymentMethod?: string;
  trainingType?: string;
  status?: string;
  participantCount?: number;
  items?: ReceiptLineItem[];
  subtotalAmount?: number;
  discountAmount?: number;
  taxAmount?: number;
}

const VN_DIGITS = ['không', 'một', 'hai', 'ba', 'bốn', 'năm', 'sáu', 'bảy', 'tám', 'chín'];

function readThreeDigits(num: number, full: boolean): string {
  const hundreds = Math.floor(num / 100);
  const tens = Math.floor((num % 100) / 10);
  const ones = num % 10;
  let result = '';

  if (hundreds > 0 || full) {
    result += `${VN_DIGITS[hundreds]} trăm `;
    if (tens === 0 && ones > 0) result += 'lẻ ';
  }

  if (tens > 1) {
    result += `${VN_DIGITS[tens]} mươi `;
    if (ones === 1) result += 'mốt';
    else if (ones === 5) result += 'lăm';
    else if (ones > 0) result += VN_DIGITS[ones];
  } else if (tens === 1) {
    result += 'mười ';
    if (ones === 5) result += 'lăm';
    else if (ones > 0) result += VN_DIGITS[ones];
  } else if (ones > 0) {
    result += VN_DIGITS[ones];
  }

  return result.trim();
}

export function parseNumericAmount(rawAmount: string | number | undefined): number {
  if (typeof rawAmount === 'number') {
    return Number.isFinite(rawAmount) ? Math.max(0, Math.round(rawAmount)) : 0;
  }
  const str = String(rawAmount || '').trim();
  if (!str || str.toLowerCase().includes('miễn phí')) return 0;
  const digits = str.replace(/[^\d]/g, '');
  return digits ? Math.max(0, Number(digits)) : 0;
}

export function amountToVietnameseWords(rawAmount: string | number): string {
  const numeric = parseNumericAmount(rawAmount);
  if (numeric === 0) return 'Miễn phí (0 đồng)';

  const units = ['', ' nghìn', ' triệu', ' tỷ', ' nghìn tỷ'];
  let n = numeric;
  let unitIdx = 0;
  const parts: string[] = [];

  while (n > 0 && unitIdx < units.length) {
    const chunk = n % 1000;
    const remaining = Math.floor(n / 1000);
    if (chunk > 0) {
      const text = readThreeDigits(chunk, remaining > 0);
      parts.unshift(`${text}${units[unitIdx]}`);
    }
    n = remaining;
    unitIdx++;
  }

  const joined = parts.join(' ').replace(/\s+/g, ' ').trim();
  const capitalized = joined.charAt(0).toUpperCase() + joined.slice(1);
  return `${capitalized} đồng chẵn`;
}

export function formatWebhookDateTime(isoOrStr?: string | null): string {
  if (!isoOrStr) return '—';
  try {
    const d = new Date(isoOrStr);
    if (Number.isNaN(d.getTime())) return String(isoOrStr);
    const pad = (v: number) => String(v).padStart(2, '0');
    return `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())} · ${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`;
  } catch {
    return String(isoOrStr);
  }
}

export function formatReceiptAmount(rawAmount: string | number): string {
  if (typeof rawAmount === 'number') {
    return `${Math.max(0, Math.round(rawAmount)).toLocaleString('vi-VN')} đ`;
  }
  const str = String(rawAmount || '').trim();
  if (!str) return 'Đã thanh toán';
  if (str.toLowerCase().includes('miễn phí')) return 'Miễn phí';
  const digits = str.replace(/[^\d]/g, '');
  if (digits && !str.includes('đ') && !str.includes('VND')) {
    return `${Number(digits).toLocaleString('vi-VN')} đ`;
  }
  return str;
}

export function resolveReceiptLineItems(data: {
  courseTitle: string;
  amount: string | number;
  trainingType?: string;
  participantCount?: number;
  items?: ReceiptLineItem[];
  subtotalAmount?: number;
  discountAmount?: number;
  taxAmount?: number;
}): {
  items: ReceiptLineItem[];
  subtotal: number;
  discount: number;
  tax: number;
  grandTotal: number;
} {
  const numericTotal = parseNumericAmount(data.amount);

  if (Array.isArray(data.items) && data.items.length > 0) {
    const normalizedItems = data.items.map((item) => {
      const qty = Math.max(1, Number(item.quantity) || 1);
      const total = typeof item.totalPrice === 'number'
        ? Math.max(0, Math.round(item.totalPrice))
        : Math.max(0, Math.round((Number(item.unitPrice) || 0) * qty));
      const unit = typeof item.unitPrice === 'number'
        ? Math.max(0, Math.round(item.unitPrice))
        : Math.round(total / qty);
      return {
        name: item.name || data.courseTitle,
        category: item.category || data.trainingType || 'Đào tạo FAST E-Learning',
        quantity: qty,
        unitPrice: unit,
        totalPrice: total,
      };
    });
    const subtotal = typeof data.subtotalAmount === 'number'
      ? Math.max(0, Math.round(data.subtotalAmount))
      : normalizedItems.reduce((sum, it) => sum + it.totalPrice, 0);
    const discount = typeof data.discountAmount === 'number' ? Math.max(0, Math.round(data.discountAmount)) : 0;
    const tax = typeof data.taxAmount === 'number' ? Math.max(0, Math.round(data.taxAmount)) : 0;
    const grandTotal = numericTotal > 0 ? numericTotal : Math.max(0, subtotal - discount + tax);

    return { items: normalizedItems, subtotal, discount, tax, grandTotal };
  }

  const qty = Math.max(1, Number(data.participantCount) || 1);
  const unitPrice = qty > 1 && numericTotal > 0 ? Math.round(numericTotal / qty) : numericTotal;
  const items: ReceiptLineItem[] = [
    {
      name: data.courseTitle || 'Khóa đào tạo FAST E-Learning',
      category: data.trainingType || 'Khóa học & Tài liệu điện tử',
      quantity: qty,
      unitPrice,
      totalPrice: numericTotal,
    },
  ];
  const discount = typeof data.discountAmount === 'number' ? Math.max(0, Math.round(data.discountAmount)) : 0;
  const tax = typeof data.taxAmount === 'number' ? Math.max(0, Math.round(data.taxAmount)) : 0;
  const subtotal = typeof data.subtotalAmount === 'number'
    ? Math.max(0, Math.round(data.subtotalAmount))
    : numericTotal + discount;

  return {
    items,
    subtotal,
    discount,
    tax,
    grandTotal: numericTotal,
  };
}

function wrapCanvasText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const words = String(text || '').split(/\s+/);
  const lines: string[] = [];
  let line = '';
  for (const word of words) {
    const test = line ? `${line} ${word}` : word;
    if (ctx.measureText(test).width > maxWidth && line) {
      lines.push(line);
      line = word;
    } else {
      line = test;
    }
  }
  if (line) lines.push(line);
  return lines.length > 0 ? lines : ['—'];
}

function loadLogoImage(url: string, timeoutMs: number = 1800): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    if (typeof Image === 'undefined') {
      resolve(null);
      return;
    }
    const img = new Image();
    img.crossOrigin = 'anonymous';
    let settled = false;

    const timer = window.setTimeout(() => {
      if (!settled) {
        settled = true;
        resolve(null);
      }
    }, timeoutMs);

    img.onload = () => {
      if (!settled) {
        settled = true;
        window.clearTimeout(timer);
        resolve(img);
      }
    };
    img.onerror = () => {
      if (!settled) {
        settled = true;
        window.clearTimeout(timer);
        resolve(null);
      }
    };
    img.src = url;
  });
}

export async function downloadWhiteReceiptPdf(data: WhiteReceiptPdfPayload): Promise<void> {
  const width = 1240;
  const { items, subtotal, discount, tax, grandTotal } = resolveReceiptLineItems({
    courseTitle: data.courseTitle,
    amount: data.amount,
    trainingType: data.trainingType,
    participantCount: data.participantCount,
    items: data.items,
    subtotalAmount: data.subtotalAmount,
    discountAmount: data.discountAmount,
    taxAmount: data.taxAmount,
  });

  // Dynamic height calculation for extra itemized rows
  const extraHeight = Math.max(0, items.length - 1) * 76;
  const height = 1754 + extraHeight;

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');

  if (!ctx) {
    throw new Error('Canvas 2D không khả dụng');
  }

  const logoImg = await loadLogoImage(FAST_COMPANY_LOGO_URL);

  // 1. Crisp pure white sheet
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, width, height);

  const margin = 64;
  const innerW = width - margin * 2;

  // Crisp subtle paper frame + clean top brand bar
  ctx.strokeStyle = '#e2e8f0';
  ctx.lineWidth = 2;
  ctx.strokeRect(margin, margin, innerW, height - margin * 2);

  ctx.fillStyle = '#007c76';
  ctx.fillRect(margin, margin, innerW, 8);

  const padX = margin + 44;
  const rightX = width - margin - 44;

  // 2. Top-Left Company Logo + Details
  let logoEndX = padX;
  if (logoImg && logoImg.naturalWidth > 0 && logoImg.naturalHeight > 0) {
    const targetH = 72;
    const targetW = Math.min(180, (logoImg.naturalWidth / logoImg.naturalHeight) * targetH);
    ctx.drawImage(logoImg, padX, margin + 40, targetW, targetH);
    logoEndX = padX + targetW + 22;
  } else {
    ctx.fillStyle = '#007c76';
    ctx.fillRect(padX, margin + 44, 64, 64);
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 34px "Inter", "Segoe UI", Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('F', padX + 32, margin + 88);
    logoEndX = padX + 84;
  }

  ctx.textAlign = 'left';
  ctx.fillStyle = '#0f172a';
  ctx.font = 'bold 24px "Inter", "Segoe UI", Arial, sans-serif';
  ctx.fillText('CÔNG TY TNHH TƯ VẤN FAST', logoEndX, margin + 62);

  ctx.fillStyle = '#007c76';
  ctx.font = '600 16px "Inter", "Segoe UI", Arial, sans-serif';
  ctx.fillText('VIỆN ĐÀO TẠO & KIỂM ĐỊNH ATTP FAST E-LEARNING', logoEndX, margin + 88);

  ctx.fillStyle = '#64748b';
  ctx.font = '400 15px "Inter", "Segoe UI", Arial, sans-serif';
  ctx.fillText('Số 18 Nguyễn Cơ Thạch, Nam Từ Liêm, Hà Nội · Hotline: 0927 002 668', logoEndX, margin + 114);
  ctx.fillText('Email: hotro@fastelearning.com.vn · Website: fastelearning.com.vn', logoEndX, margin + 136);

  // Top-Right Receipt Identification Block
  const displayCode = `#${(data.paymentCode || data.receiptNo || 'RECEIPT').toUpperCase().slice(0, 18)}`;
  const formattedTime = formatWebhookDateTime(data.paidAt);

  ctx.textAlign = 'right';
  ctx.fillStyle = '#64748b';
  ctx.font = '600 13px "Inter", "Segoe UI", Arial, sans-serif';
  ctx.fillText('MÃ BIÊN LAI ĐIỆN TỬ', rightX, margin + 56);

  ctx.fillStyle = '#0f172a';
  ctx.font = 'bold 22px ui-monospace, SFMono-Regular, Menlo, monospace';
  ctx.fillText(displayCode, rightX, margin + 86);

  ctx.fillStyle = '#475569';
  ctx.font = '500 14px "Inter", "Segoe UI", Arial, sans-serif';
  ctx.fillText(`Thời gian: ${formattedTime}`, rightX, margin + 112);

  // Clean divider below header
  const headerBottomY = margin + 168;
  ctx.strokeStyle = '#cbd5e1';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(padX, headerBottomY);
  ctx.lineTo(rightX, headerBottomY);
  ctx.stroke();

  // 3. Receipt Title
  ctx.textAlign = 'center';
  ctx.fillStyle = '#0f172a';
  ctx.font = 'bold 34px "Inter", "Segoe UI", Arial, sans-serif';
  ctx.fillText('BIÊN LAI THU HỌC PHÍ ĐIỆN TỬ', width / 2, headerBottomY + 62);

  ctx.fillStyle = '#007c76';
  ctx.font = '600 16px "Inter", "Segoe UI", Arial, sans-serif';
  ctx.fillText('Xác nhận thanh toán tự động từ cổng ngân hàng (Webhook)', width / 2, headerBottomY + 94);

  // 4. Two-Column Buyer & Transaction Card on Pure White
  const infoBoxY = headerBottomY + 128;
  const infoBoxH = data.companyName ? 226 : 194;
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(padX, infoBoxY, rightX - padX, infoBoxH);
  ctx.strokeStyle = '#cbd5e1';
  ctx.lineWidth = 1.5;
  ctx.strokeRect(padX, infoBoxY, rightX - padX, infoBoxH);

  // Center vertical divider inside info card
  const midX = padX + (rightX - padX) / 2;
  ctx.strokeStyle = '#e2e8f0';
  ctx.beginPath();
  ctx.moveTo(midX, infoBoxY + 20);
  ctx.lineTo(midX, infoBoxY + infoBoxH - 20);
  ctx.stroke();

  // Left column: Buyer details
  ctx.textAlign = 'left';
  ctx.fillStyle = '#64748b';
  ctx.font = 'bold 13px "Inter", "Segoe UI", Arial, sans-serif';
  ctx.fillText('THÔNG TIN HỌC VIÊN / NGƯỜI MUA', padX + 24, infoBoxY + 34);

  let ly = infoBoxY + 66;
  const leftFields = [
    { label: 'Họ tên:', value: data.studentName || 'Học viên FAST', bold: true },
    { label: 'Email nhận biên lai:', value: data.email || '—', teal: true },
    { label: 'Số điện thoại:', value: data.phone || '—' },
    ...(data.companyName ? [{ label: 'Đơn vị:', value: data.companyName }] : []),
  ];
  leftFields.forEach((f) => {
    ctx.fillStyle = '#64748b';
    ctx.font = '500 15px "Inter", "Segoe UI", Arial, sans-serif';
    ctx.fillText(f.label, padX + 24, ly);

    ctx.fillStyle = f.teal ? '#007c76' : '#0f172a';
    ctx.font = f.bold || f.teal
      ? 'bold 16px "Inter", "Segoe UI", Arial, sans-serif'
      : '600 15px "Inter", "Segoe UI", Arial, sans-serif';
    const valLines = wrapCanvasText(ctx, f.value, midX - padX - 185);
    ctx.fillText(valLines[0], padX + 180, ly);
    ly += 34;
  });

  // Right column: Webhook & Transaction details
  ctx.fillStyle = '#64748b';
  ctx.font = 'bold 13px "Inter", "Segoe UI", Arial, sans-serif';
  ctx.fillText('THÔNG TIN ĐỐI SOÁT THANH TOÁN', midX + 24, infoBoxY + 34);

  let ry = infoBoxY + 66;
  const rightFields = [
    { label: 'Thời gian Webhook:', value: formattedTime, teal: true },
    { label: 'Mã tham chiếu:', value: (data.paymentCode || data.transactionId || data.receiptNo || '—').toUpperCase() },
    { label: 'Hình thức:', value: data.paymentMethod || 'VietQR · ACB 0989499568' },
    { label: 'Trạng thái:', value: 'ĐÃ XÁC NHẬN THANH TOÁN', bold: true },
  ];
  rightFields.forEach((f) => {
    ctx.fillStyle = '#64748b';
    ctx.font = '500 15px "Inter", "Segoe UI", Arial, sans-serif';
    ctx.fillText(f.label, midX + 24, ry);

    ctx.fillStyle = f.teal ? '#007c76' : '#0f172a';
    ctx.font = f.bold || f.teal
      ? 'bold 15px "Inter", "Segoe UI", Arial, sans-serif'
      : '600 15px "Inter", "Segoe UI", Arial, sans-serif';
    const valLines = wrapCanvasText(ctx, f.value, rightX - midX - 195);
    ctx.fillText(valLines[0], midX + 178, ry);
    ry += 34;
  });

  // 5. Itemized Purchases Table
  let tableY = infoBoxY + infoBoxH + 42;
  ctx.textAlign = 'left';
  ctx.fillStyle = '#0f172a';
  ctx.font = 'bold 16px "Inter", "Segoe UI", Arial, sans-serif';
  ctx.fillText('CHI TIẾT CÁC MẶT HÀNG / KHÓA ĐÀO TẠO ĐÃ MUA', padX, tableY);

  tableY += 18;
  const colWidths = {
    stt: 64,
    name: 540,
    qty: 76,
    unit: 165,
    total: rightX - padX - (64 + 540 + 76 + 165),
  };
  const colX = {
    stt: padX,
    name: padX + colWidths.stt,
    qty: padX + colWidths.stt + colWidths.name,
    unit: padX + colWidths.stt + colWidths.name + colWidths.qty,
    total: padX + colWidths.stt + colWidths.name + colWidths.qty + colWidths.unit,
  };

  // Table header
  ctx.fillStyle = '#f8fafc';
  ctx.fillRect(padX, tableY, rightX - padX, 46);
  ctx.strokeStyle = '#cbd5e1';
  ctx.lineWidth = 1.5;
  ctx.strokeRect(padX, tableY, rightX - padX, 46);

  ctx.fillStyle = '#334155';
  ctx.font = 'bold 14px "Inter", "Segoe UI", Arial, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('STT', colX.stt + colWidths.stt / 2, tableY + 29);
  ctx.textAlign = 'left';
  ctx.fillText('TÊN MẶT HÀNG / KHÓA HỌC', colX.name + 16, tableY + 29);
  ctx.textAlign = 'center';
  ctx.fillText('SL', colX.qty + colWidths.qty / 2, tableY + 29);
  ctx.textAlign = 'right';
  ctx.fillText('ĐƠN GIÁ', colX.unit + colWidths.unit - 14, tableY + 29);
  ctx.fillText('THÀNH TIỀN', colX.total + colWidths.total - 16, tableY + 29);

  let curRowY = tableY + 46;
  items.forEach((item, index) => {
    const titleLines = wrapCanvasText(ctx, item.name, colWidths.name - 32);
    const rowH = Math.max(70, 42 + titleLines.length * 24);

    ctx.fillStyle = '#ffffff';
    ctx.fillRect(padX, curRowY, rightX - padX, rowH);
    ctx.strokeStyle = '#e2e8f0';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(padX, curRowY, rightX - padX, rowH);

    // STT
    ctx.textAlign = 'center';
    ctx.fillStyle = '#475569';
    ctx.font = '600 15px "Inter", "Segoe UI", Arial, sans-serif';
    ctx.fillText(String(index + 1), colX.stt + colWidths.stt / 2, curRowY + 34);

    // Name + category
    ctx.textAlign = 'left';
    ctx.fillStyle = '#0f172a';
    ctx.font = 'bold 16px "Inter", "Segoe UI", Arial, sans-serif';
    titleLines.forEach((line, lIdx) => {
      ctx.fillText(line, colX.name + 16, curRowY + 30 + lIdx * 24);
    });
    if (item.category) {
      ctx.fillStyle = '#64748b';
      ctx.font = '400 13px "Inter", "Segoe UI", Arial, sans-serif';
      ctx.fillText(item.category, colX.name + 16, curRowY + 32 + titleLines.length * 22);
    }

    // Quantity
    ctx.textAlign = 'center';
    ctx.fillStyle = '#0f172a';
    ctx.font = '600 15px "Inter", "Segoe UI", Arial, sans-serif';
    ctx.fillText(String(item.quantity), colX.qty + colWidths.qty / 2, curRowY + 34);

    // Unit Price & Line Total
    ctx.textAlign = 'right';
    ctx.fillStyle = '#334155';
    ctx.font = '500 15px "Inter", "Segoe UI", Arial, sans-serif';
    ctx.fillText(formatReceiptAmount(item.unitPrice), colX.unit + colWidths.unit - 14, curRowY + 34);

    ctx.fillStyle = '#0f172a';
    ctx.font = 'bold 16px "Inter", "Segoe UI", Arial, sans-serif';
    ctx.fillText(formatReceiptAmount(item.totalPrice), colX.total + colWidths.total - 16, curRowY + 34);

    curRowY += rowH;
  });

  // 6. Financial Summary Table (right-aligned ledger + amount in words)
  const summaryY = curRowY + 26;
  const summaryW = 460;
  const summaryX = rightX - summaryW;
  const summaryH = 186;

  ctx.fillStyle = '#ffffff';
  ctx.fillRect(summaryX, summaryY, summaryW, summaryH);
  ctx.strokeStyle = '#cbd5e1';
  ctx.lineWidth = 1.5;
  ctx.strokeRect(summaryX, summaryY, summaryW, summaryH);

  const summaryRows = [
    { label: 'Tạm tính (Subtotal):', val: formatReceiptAmount(subtotal) },
    { label: 'Giảm giá / Ưu đãi:', val: discount > 0 ? `-${formatReceiptAmount(discount)}` : '0 đ' },
    { label: 'Thuế GTGT (VAT):', val: tax > 0 ? formatReceiptAmount(tax) : 'Đã bao gồm' },
  ];

  let sy = summaryY + 34;
  summaryRows.forEach((sr) => {
    ctx.textAlign = 'left';
    ctx.fillStyle = '#64748b';
    ctx.font = '500 15px "Inter", "Segoe UI", Arial, sans-serif';
    ctx.fillText(sr.label, summaryX + 20, sy);

    ctx.textAlign = 'right';
    ctx.fillStyle = '#0f172a';
    ctx.font = '600 15px "Inter", "Segoe UI", Arial, sans-serif';
    ctx.fillText(sr.val, rightX - 20, sy);
    sy += 34;
  });

  // Total divider inside summary table
  ctx.strokeStyle = '#cbd5e1';
  ctx.beginPath();
  ctx.moveTo(summaryX + 16, sy - 10);
  ctx.lineTo(rightX - 16, sy - 10);
  ctx.stroke();

  ctx.textAlign = 'left';
  ctx.fillStyle = '#0f172a';
  ctx.font = 'bold 16px "Inter", "Segoe UI", Arial, sans-serif';
  ctx.fillText('TỔNG THANH TOÁN:', summaryX + 20, sy + 24);

  ctx.textAlign = 'right';
  ctx.fillStyle = '#007c76';
  ctx.font = 'bold 24px "Inter", "Segoe UI", Arial, sans-serif';
  ctx.fillText(formatReceiptAmount(grandTotal > 0 ? grandTotal : data.amount), rightX - 20, sy + 25);

  // Left side amount in words next to summary table
  const words = amountToVietnameseWords(grandTotal > 0 ? grandTotal : data.amount);
  ctx.textAlign = 'left';
  ctx.fillStyle = '#64748b';
  ctx.font = '600 14px "Inter", "Segoe UI", Arial, sans-serif';
  ctx.fillText('SỐ TIỀN BẰNG CHỮ:', padX, summaryY + 26);

  ctx.fillStyle = '#0f172a';
  ctx.font = 'italic 16px "Inter", "Segoe UI", Arial, sans-serif';
  const wordLines = wrapCanvasText(ctx, words, summaryX - padX - 40);
  wordLines.forEach((wl, wIdx) => {
    ctx.fillText(wl, padX, summaryY + 54 + wIdx * 24);
  });

  ctx.fillStyle = '#64748b';
  ctx.font = '400 14px "Inter", "Segoe UI", Arial, sans-serif';
  ctx.fillText('Biên lai hợp lệ xác nhận thanh toán học phí điện tử tại FAST E-Learning.', padX, summaryY + 132);

  // 7. Signatures & Clean Electronic Stamp
  const sigY = summaryY + summaryH + 78;
  const leftSigX = padX + 190;
  const rightSigX = rightX - 190;

  ctx.textAlign = 'center';
  ctx.fillStyle = '#334155';
  ctx.font = 'bold 17px "Inter", "Segoe UI", Arial, sans-serif';
  ctx.fillText('HỌC VIÊN / NGƯỜI NỘP TIỀN', leftSigX, sigY);
  ctx.fillStyle = '#64748b';
  ctx.font = 'italic 14px "Inter", "Segoe UI", Arial, sans-serif';
  ctx.fillText(data.email || '(Xác thực qua tài khoản)', leftSigX, sigY + 26);
  ctx.fillStyle = '#0f172a';
  ctx.font = 'bold 18px "Inter", "Segoe UI", Arial, sans-serif';
  ctx.fillText(data.studentName || 'Học viên FAST', leftSigX, sigY + 106);

  ctx.fillStyle = '#334155';
  ctx.font = 'bold 17px "Inter", "Segoe UI", Arial, sans-serif';
  ctx.fillText('ĐẠI DIỆN CÔNG TY TNHH TƯ VẤN FAST', rightSigX, sigY);
  ctx.fillStyle = '#64748b';
  ctx.font = 'italic 14px "Inter", "Segoe UI", Arial, sans-serif';
  ctx.fillText('(Biên lai điện tử tự động)', rightSigX, sigY + 26);

  ctx.strokeStyle = '#007c76';
  ctx.lineWidth = 2.5;
  ctx.strokeRect(rightSigX - 135, sigY + 48, 270, 68);
  ctx.fillStyle = '#007c76';
  ctx.font = 'bold 15px "Inter", "Segoe UI", Arial, sans-serif';
  ctx.fillText('FAST E-LEARNING', rightSigX, sigY + 76);
  ctx.font = 'bold 14px "Inter", "Segoe UI", Arial, sans-serif';
  ctx.fillText('ĐÃ XÁC NHẬN THANH TOÁN', rightSigX, sigY + 100);

  // 8. Clean Footer
  ctx.strokeStyle = '#e2e8f0';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(padX, height - margin - 72);
  ctx.lineTo(rightX, height - margin - 72);
  ctx.stroke();

  ctx.textAlign = 'center';
  ctx.fillStyle = '#64748b';
  ctx.font = '500 14px "Inter", "Segoe UI", Arial, sans-serif';
  ctx.fillText(
    'Biên lai điện tử được khởi tạo tự động từ hệ thống thanh toán FAST E-Learning · Hotline: 0927 002 668',
    width / 2,
    height - margin - 34
  );

  const imgData = canvas.toDataURL('image/png', 1.0);
  const pdf = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });
  const pdfWidth = 210;
  const pdfHeight = Math.min(297, (height / width) * pdfWidth);
  pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
  const safeFileCode = (data.paymentCode || data.receiptNo || 'RECEIPT')
    .replace(/[^a-zA-Z0-9_-]/g, '')
    .slice(0, 16)
    .toUpperCase();
  pdf.save(`Bien_Lai_FAST_${safeFileCode}.pdf`);
}
