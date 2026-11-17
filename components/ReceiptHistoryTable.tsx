import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { collection, onSnapshot } from 'firebase/firestore';
import { Link } from 'react-router-dom';
import {
  CheckCircle2,
  Download,
  Eye,
  FileText,
  Lock,
  Search,
  RefreshCw,
} from 'lucide-react';
import { auth, db } from '../firebase';
import { getFastSessionUser } from '../utils/sessionAuth';
import { useToast } from '../contexts/ToastContext';
import { ReceiptModal, ReceiptData } from './ReceiptModal';
import {
  downloadWhiteReceiptPdf,
  formatWebhookDateTime,
  parseNumericAmount,
} from '../utils/receiptPdf';
import { toTenDigitId } from '../utils/idGenerator';

interface PaidReceiptRecord {
  id: string;
  courseId: string;
  courseTitle: string;
  purchasedAt: string;
  paidAt?: string;
  webhookReceivedAt?: string;
  price: string;
  status: string;
  paymentCode?: string;
  transactionId?: string;
  buyerEmail?: string;
  studentName?: string;
  phone?: string;
  companyName?: string;
  paymentMethod?: string;
  trainingType?: string;
  trainingTypeLabel?: string;
  participantCount?: number;
}

interface ReceiptHistoryTableProps {
  userEmail?: string | null;
  userUid?: string | null;
  userName?: string | null;
}

const PAID_STATUS_SET = new Set([
  'active',
  'completed',
  'confirmed',
  'verified',
  'success',
  'paid',
]);

function isPaidStatus(status?: string): boolean {
  const s = String(status || '').toLowerCase().trim();
  return PAID_STATUS_SET.has(s);
}

function isOfflineOrLiveRecord(rec: PaidReceiptRecord): boolean {
  const tt = String(rec.trainingType || '').toLowerCase();
  const label = String(rec.trainingTypeLabel || '').toLowerCase();
  const title = String(rec.courseTitle || '').toLowerCase();
  return (
    tt === 'direct' ||
    tt === 'offline' ||
    tt === 'zoom' ||
    tt === 'inhouse' ||
    label.includes('trực tiếp') ||
    label.includes('hội trường') ||
    label.includes('zoom') ||
    label.includes('offline') ||
    title.includes('online - offline') ||
    title.includes('trực tiếp')
  );
}

export const ReceiptHistoryTable: React.FC<ReceiptHistoryTableProps> = ({
  userEmail: propEmail,
  userUid: propUid,
  userName: propName,
}) => {
  const toast = useToast();
  const [serverReceipts, setServerReceipts] = useState<PaidReceiptRecord[]>([]);
  const [realtimeReceipts, setRealtimeReceipts] = useState<PaidReceiptRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | 'online' | 'live'>('all');
  const [selectedReceipt, setSelectedReceipt] = useState<Partial<ReceiptData> | null>(null);
  const [isReceiptModalOpen, setIsReceiptModalOpen] = useState(false);

  const sessionInfo = useMemo(() => {
    const fastUser = getFastSessionUser();
    const resolvedEmail = (
      propEmail ||
      auth.currentUser?.email ||
      fastUser?.email ||
      ''
    )
      .toLowerCase()
      .trim();
    const resolvedUid = (
      propUid ||
      auth.currentUser?.uid ||
      fastUser?.uid ||
      ''
    ).trim();
    const resolvedName =
      propName || auth.currentUser?.displayName || fastUser?.displayName || '';
    const accountDocKey = resolvedEmail || resolvedUid;
    return {
      email: resolvedEmail,
      uid: resolvedUid,
      name: resolvedName,
      accountDocKey,
      hasFirebaseAuth: Boolean(auth.currentUser),
    };
  }, [propEmail, propUid, propName]);

  const fetchServerReceipts = useCallback(
    async (manual = false) => {
      if (!sessionInfo.email && !sessionInfo.uid) {
        setError('Vui lòng đăng nhập để xem lịch sử biên lai.');
        setIsLoading(false);
        return false;
      }

      if (manual) setIsRefreshing(true);
      try {
        const params = new URLSearchParams();
        if (sessionInfo.email) params.set('email', sessionInfo.email);
        if (sessionInfo.uid) params.set('uid', sessionInfo.uid);
        const res = await fetch(`/api/user/purchase-history?${params.toString()}`, {
          cache: 'no-store',
        });
        const data = await res.json();
        if (res.ok && data.success && Array.isArray(data.records)) {
          const paidOnly = (data.records as PaidReceiptRecord[]).filter((r) =>
            isPaidStatus(r.status)
          );
          setServerReceipts(paidOnly);
          setError(null);
          setIsLoading(false);
          return true;
        }
        return false;
      } catch {
        return false;
      } finally {
        if (manual) setIsRefreshing(false);
      }
    },
    [sessionInfo.email, sessionInfo.uid]
  );

  useEffect(() => {
    let active = true;
    setIsLoading(true);
    setError(null);

    if (!sessionInfo.accountDocKey) {
      setError('Vui lòng đăng nhập để xem lịch sử biên lai.');
      setIsLoading(false);
      return;
    }

    fetchServerReceipts().then((ok) => {
      if (!active) return;
      if (!ok && !sessionInfo.hasFirebaseAuth) {
        setError('Không thể tải danh sách biên lai lúc này. Vui lòng thử lại sau.');
        setIsLoading(false);
      }
    });

    let unsubscribe = () => {};
    if (sessionInfo.hasFirebaseAuth && sessionInfo.accountDocKey) {
      const purchasesRef = collection(
        db,
        'users',
        sessionInfo.accountDocKey,
        'purchased_courses'
      );
      unsubscribe = onSnapshot(
        purchasesRef,
        (snapshot) => {
          if (!active) return;
          const list: PaidReceiptRecord[] = [];
          snapshot.forEach((docSnap) => {
            const data = docSnap.data();
            const status = String(data.status || 'active');
            if (!isPaidStatus(status)) return;
            const webhookTime =
              data.webhookReceivedAt ||
              data.paidAt ||
              data.purchasedAt ||
              data.unlockedAt ||
              data.activatedAt ||
              new Date().toISOString();
            list.push({
              id: data.orderId || docSnap.id,
              courseId: data.courseId || docSnap.id,
              courseTitle:
                data.courseTitle || data.title || data.courseId || docSnap.id,
              purchasedAt: webhookTime,
              paidAt: data.paidAt || webhookTime,
              webhookReceivedAt: data.webhookReceivedAt || data.paidAt || '',
              price:
                data.price ||
                (data.paymentAmount
                  ? `${Number(data.paymentAmount).toLocaleString('vi-VN')}đ`
                  : 'Đã thanh toán'),
              status,
              paymentCode: data.paymentCode || data.paymentMemo || '',
              transactionId: data.transactionId || data.paymentRef || '',
              buyerEmail:
                data.buyerEmail || data.email || sessionInfo.email || '',
              studentName: data.studentName || sessionInfo.name || '',
              phone: data.phone || '',
              companyName: data.companyName || '',
              paymentMethod: data.paymentMethod || '',
              trainingType: data.trainingType || '',
              trainingTypeLabel: data.trainingTypeLabel || '',
              participantCount: Number(data.participantCount) || 1,
            });
          });
          setRealtimeReceipts(list);
          setError(null);
          setIsLoading(false);
        },
        () => {
          if (active) {
            fetchServerReceipts().then((ok) => {
              if (!active) return;
              if (!ok) {
                setError('Không thể tải danh sách biên lai. Vui lòng thử lại sau.');
              }
              setIsLoading(false);
            });
          }
        }
      );
    }

    return () => {
      active = false;
      unsubscribe();
    };
  }, [
    sessionInfo.accountDocKey,
    sessionInfo.hasFirebaseAuth,
    sessionInfo.email,
    sessionInfo.name,
    fetchServerReceipts,
  ]);

  const paidReceipts = useMemo(() => {
    const mergedMap = new Map<string, PaidReceiptRecord>();
    serverReceipts.forEach((item) => {
      if (!isPaidStatus(item.status)) return;
      const key = item.courseId ? `course:${item.courseId}` : `id:${item.id}`;
      mergedMap.set(key, item);
    });
    realtimeReceipts.forEach((item) => {
      if (!isPaidStatus(item.status)) return;
      const key = item.courseId ? `course:${item.courseId}` : `id:${item.id}`;
      const prev = mergedMap.get(key);
      mergedMap.set(key, {
        ...(prev || {}),
        ...item,
        paymentCode: item.paymentCode || prev?.paymentCode || '',
        transactionId: item.transactionId || prev?.transactionId || '',
        buyerEmail:
          item.buyerEmail || prev?.buyerEmail || sessionInfo.email || '',
        studentName:
          item.studentName || prev?.studentName || sessionInfo.name || '',
        phone: item.phone || prev?.phone || '',
        companyName: item.companyName || prev?.companyName || '',
        paymentMethod: item.paymentMethod || prev?.paymentMethod || '',
        trainingType: item.trainingType || prev?.trainingType || '',
        trainingTypeLabel:
          item.trainingTypeLabel || prev?.trainingTypeLabel || '',
        participantCount:
          item.participantCount || prev?.participantCount || 1,
        webhookReceivedAt:
          item.webhookReceivedAt || prev?.webhookReceivedAt || '',
        paidAt: item.paidAt || prev?.paidAt || item.purchasedAt,
        purchasedAt:
          item.webhookReceivedAt ||
          item.paidAt ||
          prev?.webhookReceivedAt ||
          prev?.paidAt ||
          item.purchasedAt,
        price:
          item.price && item.price !== 'Đã thanh toán'
            ? item.price
            : prev?.price || item.price,
      });
    });

    return Array.from(mergedMap.values()).sort(
      (a, b) =>
        new Date(
          b.webhookReceivedAt || b.paidAt || b.purchasedAt || 0
        ).getTime() -
        new Date(
          a.webhookReceivedAt || a.paidAt || a.purchasedAt || 0
        ).getTime()
    );
  }, [serverReceipts, realtimeReceipts, sessionInfo.email, sessionInfo.name]);

  const filteredReceipts = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    return paidReceipts.filter((rec) => {
      const liveFlag = isOfflineOrLiveRecord(rec);
      if (typeFilter === 'online' && liveFlag) return false;
      if (typeFilter === 'live' && !liveFlag) return false;
      if (!q) return true;
      const receiptCode = toTenDigitId(rec.id).toLowerCase();
      return (
        receiptCode.includes(q) ||
        rec.courseTitle.toLowerCase().includes(q) ||
        (rec.paymentCode || '').toLowerCase().includes(q) ||
        (rec.transactionId || '').toLowerCase().includes(q) ||
        (rec.buyerEmail || '').toLowerCase().includes(q)
      );
    });
  }, [paidReceipts, searchTerm, typeFilter]);

  const summaryStats = useMemo(() => {
    const totalPaidVnd = paidReceipts.reduce((sum, rec) => {
      return sum + parseNumericAmount(rec.price);
    }, 0);
    const latestReceipt = paidReceipts[0];
    const latestTime = latestReceipt
      ? formatWebhookDateTime(
          latestReceipt.webhookReceivedAt ||
            latestReceipt.paidAt ||
            latestReceipt.purchasedAt
        )
      : '—';
    return {
      count: paidReceipts.length,
      totalPaidVnd,
      latestTime,
    };
  }, [paidReceipts]);

  const buildImmutableReceiptPayload = (
    rec: PaidReceiptRecord
  ): Partial<ReceiptData> => {
    const buyerEmail = rec.buyerEmail || sessionInfo.email || '';
    const webhookTime =
      rec.webhookReceivedAt ||
      rec.paidAt ||
      rec.purchasedAt ||
      new Date().toISOString();
    const studentName =
      rec.studentName ||
      sessionInfo.name ||
      (buyerEmail ? buyerEmail.split('@')[0] : 'Học viên FAST');

    return {
      receiptNo: toTenDigitId(rec.id),
      paymentCode: rec.paymentCode || '',
      transactionId: rec.transactionId || '',
      issueDate: webhookTime.slice(0, 10),
      paidAt: webhookTime,
      webhookReceivedAt: rec.webhookReceivedAt || webhookTime,
      email: buyerEmail,
      studentName,
      phone: rec.phone || '',
      companyName: rec.companyName || '',
      courseTitle: rec.courseTitle,
      trainingType:
        rec.trainingTypeLabel ||
        (isOfflineOrLiveRecord(rec)
          ? 'Đào tạo Trực tiếp / Zoom'
          : 'Khóa học Online'),
      amount: rec.price,
      participantCount: rec.participantCount || 1,
      paymentMethod:
        rec.paymentMethod || 'Chuyển khoản VietQR (SePay · ACB 0989499568)',
      status: 'Đã thanh toán thành công',
    };
  };

  const handleOpenReadOnlyReceipt = (rec: PaidReceiptRecord) => {
    setSelectedReceipt(buildImmutableReceiptPayload(rec));
    setIsReceiptModalOpen(true);
  };

  const handleDownloadPdf = async (rec: PaidReceiptRecord) => {
    try {
      const payload = buildImmutableReceiptPayload(rec);
      await downloadWhiteReceiptPdf({
        receiptNo: payload.receiptNo || toTenDigitId(rec.id),
        studentName: payload.studentName || 'Học viên FAST',
        email: payload.email || '—',
        phone: payload.phone,
        companyName: payload.companyName,
        courseTitle: rec.courseTitle,
        trainingType: payload.trainingType,
        amount: rec.price,
        participantCount: rec.participantCount || 1,
        paidAt: payload.paidAt || rec.purchasedAt,
        paymentCode: payload.paymentCode,
        transactionId: payload.transactionId,
        paymentMethod: payload.paymentMethod,
        status: 'Đã thanh toán thành công',
      });
      toast.showToast('Đã tải xuống bản PDF biên lai gốc!', 'success');
    } catch (err) {
      console.error('Error generating receipt PDF:', err);
      toast.showToast(
        'Không thể tải biên lai PDF lúc này. Vui lòng thử lại sau.',
        'error'
      );
    }
  };

  if (isLoading) {
    return (
      <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 space-y-6">
        <div className="h-7 w-64 bg-slate-100 rounded-lg animate-pulse" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-20 bg-slate-50 border border-slate-100 rounded-2xl animate-pulse"
            />
          ))}
        </div>
        <div className="space-y-3">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="h-14 bg-slate-50 rounded-xl animate-pulse"
            />
          ))}
        </div>
      </div>
    );
  }

  if (error && paidReceipts.length === 0) {
    return (
      <div className="bg-white border border-red-200 text-red-700 p-8 rounded-3xl text-center space-y-3">
        <p className="font-bold text-sm">{error}</p>
        <button
          type="button"
          onClick={() => {
            setIsLoading(true);
            setError(null);
            fetchServerReceipts(true).then((ok) => {
              if (!ok) {
                setError(
                  'Không thể tải danh sách biên lai. Vui lòng thử lại sau.'
                );
                setIsLoading(false);
              }
            });
          }}
          className="px-4 py-2 rounded-xl bg-red-50 border border-red-200 text-xs font-bold text-red-700 hover:bg-red-100 transition-colors cursor-pointer"
        >
          Thử tải lại
        </button>
      </div>
    );
  }

  if (paidReceipts.length === 0) {
    return (
      <div className="bg-white rounded-3xl border border-slate-200 p-12 sm:p-16 text-center space-y-4">
        <div className="w-16 h-16 bg-slate-50 border border-slate-200 rounded-2xl flex items-center justify-center mx-auto text-slate-400">
          <FileText className="w-8 h-8" />
        </div>
        <h3 className="text-xl font-bold text-slate-900">
          Chưa có biên lai thanh toán thành công
        </h3>
        <p className="text-sm text-slate-500 max-w-md mx-auto leading-relaxed">
          Hệ thống chỉ lưu trữ và xuất biên lai điện tử chính thức cho các giao
          dịch đã được webhook ngân hàng xác nhận thanh toán thành công.
        </p>
        <div className="pt-2">
          <Link
            to="/khoa-hoc"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#007c76] hover:bg-[#005f5b] text-white text-xs font-bold uppercase tracking-wider transition-colors"
          >
            Khám phá khóa học
          </Link>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-xs">
        {/* Header & Read-Only Ledger Notice */}
        <div className="p-6 sm:p-8 border-b border-slate-200 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-[#007c76]">
              <Lock className="w-3.5 h-3.5" />
              <span>Chứng từ nguyên bản · Không cho phép chỉnh sửa</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              Quản lý lịch sử biên lai thanh toán
            </h2>
            <p className="text-xs text-slate-500">
              Hiển thị toàn bộ biên lai đã xác nhận thanh toán qua Webhook cho tài
              khoản{' '}
              <span className="font-semibold text-slate-700">
                {sessionInfo.email || sessionInfo.accountDocKey}
              </span>
              .
            </p>
          </div>

          <button
            type="button"
            onClick={() => fetchServerReceipts(true)}
            disabled={isRefreshing}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold transition-colors cursor-pointer self-start lg:self-auto"
          >
            <RefreshCw
              className={`w-3.5 h-3.5 text-[#007c76] ${
                isRefreshing ? 'animate-spin' : ''
              }`}
            />
            <span>{isRefreshing ? 'Đang đồng bộ...' : 'Đồng bộ biên lai'}</span>
          </button>
        </div>

        {/* Summary KPI Strip */}
        <div className="grid grid-cols-1 sm:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x divide-slate-200 bg-slate-50/50 border-b border-slate-200">
          <div className="px-6 py-4">
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              Biên lai đã phát hành
            </p>
            <p className="text-2xl font-black text-slate-900 mt-1 tabular-nums">
              {summaryStats.count}
            </p>
          </div>
          <div className="px-6 py-4">
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              Tổng giá trị đã thanh toán
            </p>
            <p className="text-2xl font-black text-[#007c76] mt-1 tabular-nums">
              {summaryStats.totalPaidVnd > 0
                ? `${summaryStats.totalPaidVnd.toLocaleString('vi-VN')}đ`
                : 'Đã xác nhận'}
            </p>
          </div>
          <div className="px-6 py-4">
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              Thanh toán gần nhất
            </p>
            <p className="text-sm font-bold text-slate-900 mt-2 tabular-nums">
              {summaryStats.latestTime}
            </p>
          </div>
        </div>

        {/* Search & Filter Toolbar */}
        <div className="px-6 py-4 border-b border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-3 bg-white">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Tìm theo mã biên lai, tên khóa học, mã GD..."
              className="w-full pl-10 pr-4 py-2 text-xs font-medium bg-slate-50 border border-slate-200 rounded-xl text-slate-800 placeholder:text-slate-400 focus:bg-white focus:border-[#007c76] outline-none transition-colors"
            />
          </div>

          <div className="inline-flex items-center gap-1 p-1 rounded-xl bg-slate-100 border border-slate-200/80 self-start md:self-auto">
            {[
              { id: 'all', label: 'Tất cả' },
              { id: 'online', label: 'Khóa học Online' },
              { id: 'live', label: 'Đào tạo Offline / Zoom' },
            ].map((tab) => {
              const active = typeFilter === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setTypeFilter(tab.id as any)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                    active
                      ? 'bg-white text-slate-900 shadow-2xs border border-slate-200/70'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Receipts Table */}
        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-left border-collapse min-w-[920px]">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 text-[11px] font-bold uppercase tracking-wider">
                <th className="py-3.5 px-5 whitespace-nowrap">Mã biên lai</th>
                <th className="py-3.5 px-5 whitespace-nowrap">Khóa học &amp; Hình thức</th>
                <th className="py-3.5 px-5 whitespace-nowrap">Người mua &amp; Email</th>
                <th className="py-3.5 px-5 whitespace-nowrap">Thời gian Webhook</th>
                <th className="py-3.5 px-5 whitespace-nowrap">Tổng thanh toán</th>
                <th className="py-3.5 px-5 whitespace-nowrap text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200/80 text-sm">
              {filteredReceipts.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 px-6 text-center text-xs text-slate-500 font-medium">
                    Không tìm thấy biên lai phù hợp với bộ lọc hiện tại.
                  </td>
                </tr>
              ) : (
                filteredReceipts.map((rec) => {
                  const receiptNo = toTenDigitId(rec.id);
                  const effectiveTime =
                    rec.webhookReceivedAt || rec.paidAt || rec.purchasedAt;
                  const buyerEmail = rec.buyerEmail || sessionInfo.email || '—';
                  const buyerName =
                    rec.studentName ||
                    sessionInfo.name ||
                    (buyerEmail.includes('@') ? buyerEmail.split('@')[0] : 'Học viên FAST');
                  const liveFlag = isOfflineOrLiveRecord(rec);

                  return (
                    <tr
                      key={`${rec.id}_${rec.courseId}`}
                      className="hover:bg-slate-50/70 transition-colors"
                    >
                      <td className="py-4 px-5 whitespace-nowrap align-top">
                        <div className="font-mono font-bold text-slate-900 tabular-nums">
                          #{receiptNo}
                        </div>
                        {(rec.paymentCode || rec.transactionId) && (
                          <div className="text-[11px] font-mono text-slate-500 mt-1 tabular-nums">
                            {rec.paymentCode || rec.transactionId}
                          </div>
                        )}
                      </td>

                      <td className="py-4 px-5 align-top max-w-[300px]">
                        <div className="font-bold text-slate-900 leading-snug line-clamp-2">
                          {rec.courseTitle}
                        </div>
                        <div className="text-[11px] text-slate-500 mt-1 font-medium tabular-nums">
                          {liveFlag
                            ? rec.trainingTypeLabel || 'Đào tạo Trực tiếp / Zoom'
                            : 'Khóa học Online'}
                          {' · '}
                          SL: {rec.participantCount || 1} học viên
                        </div>
                      </td>

                      <td className="py-4 px-5 whitespace-nowrap align-top">
                        <div className="font-semibold text-slate-900">
                          {buyerName}
                        </div>
                        <div className="text-xs text-slate-500 mt-0.5">
                          {buyerEmail}
                        </div>
                      </td>

                      <td className="py-4 px-5 whitespace-nowrap align-top tabular-nums">
                        <div className="font-semibold text-slate-800">
                          {formatWebhookDateTime(effectiveTime)}
                        </div>
                        <div className="text-[11px] text-slate-500 mt-0.5">
                          {rec.webhookReceivedAt
                            ? 'Đã đối soát Webhook'
                            : 'Thời điểm xác nhận'}
                        </div>
                      </td>

                      <td className="py-4 px-5 whitespace-nowrap align-top tabular-nums">
                        <div className="font-black text-slate-900">
                          {rec.price}
                        </div>
                        <div className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 mt-1">
                          <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                          <span>Đã thanh toán</span>
                        </div>
                      </td>

                      <td className="py-4 px-5 whitespace-nowrap text-right align-top">
                        <div className="inline-flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => handleOpenReadOnlyReceipt(rec)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-white text-slate-700 hover:text-[#007c76] hover:border-[#007c76] transition-colors border border-slate-200 cursor-pointer"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>Xem biên lai</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDownloadPdf(rec)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-[#007c76] text-white hover:bg-[#005c56] transition-colors cursor-pointer"
                          >
                            <Download className="w-3.5 h-3.5" />
                            <span>Tải PDF</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      <ReceiptModal
        isOpen={isReceiptModalOpen}
        onClose={() => setIsReceiptModalOpen(false)}
        initialData={selectedReceipt}
        readOnly={true}
      />
    </>
  );
};

export default ReceiptHistoryTable;
