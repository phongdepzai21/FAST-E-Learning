import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { collection, onSnapshot } from 'firebase/firestore';
import { db, auth } from '../firebase';
import { Link } from 'react-router-dom';
import { Eye, Download, CheckCircle2, Clock, XCircle, Lock } from 'lucide-react';
import { getFastSessionUser } from '../utils/sessionAuth';
import { useToast } from '../contexts/ToastContext';
import { ReceiptModal, ReceiptData } from './ReceiptModal';
import { downloadWhiteReceiptPdf, formatWebhookDateTime } from '../utils/receiptPdf';
import { toTenDigitId } from '../utils/idGenerator';

enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
  };
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null): FirestoreErrorInfo {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
    },
    operationType,
    path,
  };
  console.warn('[PurchaseHistory Firestore Note]:', JSON.stringify(errInfo));
  return errInfo;
}

interface PurchaseRecord {
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
}

interface PurchaseHistoryProps {
  userEmail?: string | null;
  userUid?: string | null;
  userName?: string | null;
}

export const PurchaseHistory: React.FC<PurchaseHistoryProps> = ({
  userEmail: propEmail,
  userUid: propUid,
  userName: propName,
}) => {
  const toast = useToast();
  const [serverPurchases, setServerPurchases] = useState<PurchaseRecord[]>([]);
  const [realtimePurchases, setRealtimePurchases] = useState<PurchaseRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedReceipt, setSelectedReceipt] = useState<Partial<ReceiptData> | null>(null);
  const [isReceiptModalOpen, setIsReceiptModalOpen] = useState(false);

  const sessionInfo = useMemo(() => {
    const fastUser = getFastSessionUser();
    const resolvedEmail = (propEmail || auth.currentUser?.email || fastUser?.email || '').toLowerCase().trim();
    const resolvedUid = (propUid || auth.currentUser?.uid || fastUser?.uid || '').trim();
    const resolvedName = propName || auth.currentUser?.displayName || fastUser?.displayName || '';
    const accountDocKey = resolvedEmail || resolvedUid;
    return {
      email: resolvedEmail,
      uid: resolvedUid,
      name: resolvedName,
      accountDocKey,
      hasFirebaseAuth: Boolean(auth.currentUser),
    };
  }, [propEmail, propUid, propName]);

  const fetchServerHistory = useCallback(async () => {
    if (!sessionInfo.email && !sessionInfo.uid) {
      setError('Vui lòng đăng nhập để xem lịch sử mua hàng.');
      setIsLoading(false);
      return false;
    }

    try {
      const params = new URLSearchParams();
      if (sessionInfo.email) params.set('email', sessionInfo.email);
      if (sessionInfo.uid) params.set('uid', sessionInfo.uid);
      const res = await fetch(`/api/user/purchase-history?${params.toString()}`, { cache: 'no-store' });
      const data = await res.json();
      if (res.ok && data.success && Array.isArray(data.records)) {
        setServerPurchases(data.records);
        setError(null);
        setIsLoading(false);
        return true;
      }
      return false;
    } catch {
      return false;
    }
  }, [sessionInfo.email, sessionInfo.uid]);

  useEffect(() => {
    let active = true;
    setIsLoading(true);
    setError(null);

    if (!sessionInfo.accountDocKey) {
      setError('Vui lòng đăng nhập để xem lịch sử mua hàng.');
      setIsLoading(false);
      return;
    }

    fetchServerHistory().then((ok) => {
      if (!active) return;
      if (!ok && !sessionInfo.hasFirebaseAuth) {
        setError('Không thể tải lịch sử mua hàng lúc này. Vui lòng thử lại sau.');
        setIsLoading(false);
      }
    });

    let unsubscribe = () => {};
    if (sessionInfo.hasFirebaseAuth && sessionInfo.accountDocKey) {
      const path = `users/${sessionInfo.accountDocKey}/purchased_courses`;
      const purchasesRef = collection(db, 'users', sessionInfo.accountDocKey, 'purchased_courses');
      unsubscribe = onSnapshot(
        purchasesRef,
        (snapshot) => {
          if (!active) return;
          const records: PurchaseRecord[] = [];
          snapshot.forEach((docSnap) => {
            const data = docSnap.data();
            const webhookTime = data.webhookReceivedAt || data.paidAt || data.purchasedAt || data.unlockedAt || data.activatedAt || new Date().toISOString();
            records.push({
              id: data.orderId || docSnap.id,
              courseId: data.courseId || docSnap.id,
              courseTitle: data.courseTitle || data.title || data.courseId || docSnap.id,
              purchasedAt: webhookTime,
              paidAt: data.paidAt || webhookTime,
              webhookReceivedAt: data.webhookReceivedAt || data.paidAt || '',
              price: data.price || (data.paymentAmount ? `${Number(data.paymentAmount).toLocaleString('vi-VN')}đ` : 'Đã thanh toán'),
              status: data.status || 'active',
              paymentCode: data.paymentCode || data.paymentMemo || '',
              transactionId: data.transactionId || data.paymentRef || '',
              buyerEmail: data.buyerEmail || data.email || sessionInfo.email || '',
              studentName: data.studentName || sessionInfo.name || '',
              phone: data.phone || '',
            });
          });
          setRealtimePurchases(records);
          setError(null);
          setIsLoading(false);
        },
        (err) => {
          handleFirestoreError(err, OperationType.LIST, path);
          if (active) {
            fetchServerHistory().then((ok) => {
              if (!active) return;
              if (!ok) {
                setError('Không thể tải lịch sử mua hàng. Vui lòng thử lại sau.');
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
  }, [sessionInfo.accountDocKey, sessionInfo.hasFirebaseAuth, sessionInfo.email, sessionInfo.name, fetchServerHistory]);

  const purchases = useMemo(() => {
    const mergedMap = new Map<string, PurchaseRecord>();
    serverPurchases.forEach((item) => {
      const key = item.courseId ? `course:${item.courseId}` : `id:${item.id}`;
      mergedMap.set(key, item);
    });
    realtimePurchases.forEach((item) => {
      const key = item.courseId ? `course:${item.courseId}` : `id:${item.id}`;
      const prev = mergedMap.get(key);
      mergedMap.set(key, {
        ...(prev || {}),
        ...item,
        paymentCode: item.paymentCode || prev?.paymentCode || '',
        transactionId: item.transactionId || prev?.transactionId || '',
        buyerEmail: item.buyerEmail || prev?.buyerEmail || sessionInfo.email || '',
        studentName: item.studentName || prev?.studentName || sessionInfo.name || '',
        phone: item.phone || prev?.phone || '',
        webhookReceivedAt: item.webhookReceivedAt || prev?.webhookReceivedAt || '',
        paidAt: item.paidAt || prev?.paidAt || item.purchasedAt,
        purchasedAt: item.webhookReceivedAt || item.paidAt || prev?.webhookReceivedAt || prev?.paidAt || item.purchasedAt,
        price: item.price && item.price !== 'Đã thanh toán' ? item.price : (prev?.price || item.price),
      });
    });

    return Array.from(mergedMap.values()).sort(
      (a, b) => new Date(b.webhookReceivedAt || b.paidAt || b.purchasedAt || 0).getTime() - new Date(a.webhookReceivedAt || a.paidAt || a.purchasedAt || 0).getTime()
    );
  }, [serverPurchases, realtimePurchases, sessionInfo.email, sessionInfo.name]);

  const isPaidRecord = (status: string) => {
    const s = (status || '').toLowerCase().trim();
    return ['active', 'completed', 'confirmed', 'verified', 'success', 'paid'].includes(s);
  };

  const renderStatusBadge = (status: string) => {
    const s = (status || '').toLowerCase().trim();
    switch (s) {
      case 'active':
      case 'completed':
      case 'confirmed':
      case 'verified':
      case 'success':
      case 'paid':
        return (
          <span className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-700">
            <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
            <span>Đã xác nhận thanh toán</span>
          </span>
        );
      case 'pending':
      case 'processing':
      case 'pending_payment':
        return (
          <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-amber-700">
            <Clock className="w-3.5 h-3.5 shrink-0" />
            <span>Đang chờ đối soát</span>
          </span>
        );
      case 'failed':
      case 'rejected':
      case 'cancelled':
      case 'inactive':
        return (
          <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-red-700">
            <XCircle className="w-3.5 h-3.5 shrink-0" />
            <span>{s === 'inactive' ? 'Tạm khóa' : 'Đã hủy / Thất bại'}</span>
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-700">
            <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
            <span>Đã thanh toán</span>
          </span>
        );
    }
  };

  const buildReceiptPayload = (purchase: PurchaseRecord): Partial<ReceiptData> => {
    const buyerEmail = purchase.buyerEmail || sessionInfo.email || '';
    const webhookTime = purchase.webhookReceivedAt || purchase.paidAt || purchase.purchasedAt || new Date().toISOString();
    const studentName =
      purchase.studentName ||
      sessionInfo.name ||
      (buyerEmail ? buyerEmail.split('@')[0] : 'Học viên FAST');

    return {
      receiptNo: toTenDigitId(purchase.id),
      paymentCode: purchase.paymentCode || '',
      transactionId: purchase.transactionId || '',
      issueDate: webhookTime.slice(0, 10),
      paidAt: webhookTime,
      webhookReceivedAt: purchase.webhookReceivedAt || webhookTime,
      email: buyerEmail,
      studentName,
      phone: purchase.phone || '',
      courseTitle: purchase.courseTitle,
      amount: purchase.price,
      participantCount: 1,
      paymentMethod: 'Chuyển khoản VietQR (SePay · ACB 0989499568)',
      status: purchase.status,
    };
  };

  const handleOpenReceiptModal = (purchase: PurchaseRecord) => {
    setSelectedReceipt(buildReceiptPayload(purchase));
    setIsReceiptModalOpen(true);
  };

  const handleDownloadReceipt = async (purchase: PurchaseRecord) => {
    try {
      const payload = buildReceiptPayload(purchase);
      await downloadWhiteReceiptPdf({
        receiptNo: payload.receiptNo || toTenDigitId(purchase.id),
        studentName: payload.studentName || 'Học viên FAST',
        email: payload.email || '—',
        phone: payload.phone,
        courseTitle: purchase.courseTitle,
        amount: purchase.price,
        participantCount: 1,
        paidAt: payload.paidAt || purchase.purchasedAt,
        paymentCode: payload.paymentCode,
        transactionId: payload.transactionId,
        paymentMethod: payload.paymentMethod,
        status: purchase.status,
      });
      toast.showToast('Đã tải xuống Biên lai PDF nền trắng!', 'success');
    } catch (err) {
      console.error('Error generating PDF:', err);
      toast.showToast('Không thể tải biên lai PDF lúc này. Vui lòng thử lại sau.', 'error');
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-20">
        <svg className="animate-spin h-8 w-8 text-[#007c76]" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
      </div>
    );
  }

  if (error && purchases.length === 0) {
    return (
      <div className="bg-red-50 text-red-700 p-6 rounded-2xl text-center space-y-3 border border-red-100">
        <p className="font-semibold text-sm">{error}</p>
        <button
          type="button"
          onClick={() => {
            setIsLoading(true);
            setError(null);
            fetchServerHistory().then((ok) => {
              if (!ok) {
                setError('Không thể tải lịch sử mua hàng. Vui lòng thử lại sau.');
                setIsLoading(false);
              }
            });
          }}
          className="px-4 py-2 rounded-xl bg-white border border-red-200 text-xs font-bold text-red-700 hover:bg-red-100 transition-colors cursor-pointer"
        >
          Thử tải lại
        </button>
      </div>
    );
  }

  if (purchases.length === 0) {
    return (
      <div className="text-center py-16 bg-white rounded-3xl shadow-sm border border-gray-100">
        <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg className="w-10 h-10 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
          </svg>
        </div>
        <h3 className="text-xl font-bold text-gray-800 mb-2">Chưa có giao dịch nào</h3>
        <p className="text-gray-500 max-w-md mx-auto">Bạn chưa mua khóa học nào. Hãy khám phá các khóa học của chúng tôi để bắt đầu học tập nhé.</p>
      </div>
    );
  }

  return (
    <>
      <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-white">
          <div>
            <h2 className="text-xl font-bold text-slate-900">Lịch sử giao dịch &amp; Biên lai</h2>
            {sessionInfo.email && (
              <p className="text-xs text-slate-500 mt-0.5">
                Email nhận biên lai: <span className="font-semibold text-slate-700">{sessionInfo.email}</span>
              </p>
            )}
          </div>
          <span className="text-xs font-semibold text-slate-500 tabular-nums">{purchases.length} giao dịch</span>
        </div>

        <div className="overflow-x-auto custom-scrollbar pb-1">
          <table className="w-full text-left border-collapse min-w-[820px] whitespace-nowrap">
            <thead>
              <tr className="bg-slate-50/70 border-b border-slate-100 text-slate-500 text-xs uppercase tracking-wider whitespace-nowrap">
                <th className="p-4 font-bold whitespace-nowrap">Khóa học &amp; Mã GD</th>
                <th className="p-4 font-bold whitespace-nowrap">Thời gian thanh toán</th>
                <th className="p-4 font-bold whitespace-nowrap">Số tiền</th>
                <th className="p-4 font-bold whitespace-nowrap">Trạng thái</th>
                <th className="p-4 font-bold whitespace-nowrap text-right">Biên lai điện tử</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {purchases.map((purchase) => {
                const effectiveTime = purchase.webhookReceivedAt || purchase.paidAt || purchase.purchasedAt;
                const displayEmail = purchase.buyerEmail || sessionInfo.email;
                return (
                  <tr key={`${purchase.id}_${purchase.courseId}`} className="hover:bg-slate-50/60 transition-colors whitespace-nowrap">
                    <td className="p-4 whitespace-nowrap">
                      {purchase.courseId ? (
                        <Link to={`/khoa-hoc/${purchase.courseId}`} className="font-bold text-slate-900 hover:text-[#007c76] transition-colors whitespace-nowrap">
                          {purchase.courseTitle}
                        </Link>
                      ) : (
                        <span className="font-bold text-slate-900">{purchase.courseTitle}</span>
                      )}
                      <div className="text-xs text-slate-500 mt-1 whitespace-nowrap flex items-center gap-2">
                        <span className="font-mono">
                          {purchase.paymentCode ? `Mã GD: ${purchase.paymentCode}` : `ID: ${purchase.courseId || purchase.id}`}
                        </span>
                        {displayEmail && (
                          <span className="text-slate-400">· {displayEmail}</span>
                        )}
                      </div>
                    </td>
                    <td className="p-4 text-sm text-slate-700 whitespace-nowrap tabular-nums">
                      <div className="font-medium text-slate-900">
                        {formatWebhookDateTime(effectiveTime)}
                      </div>
                      <div className="text-[11px] text-slate-400">
                        {purchase.webhookReceivedAt ? 'Đồng bộ từ Webhook' : 'Thời gian ghi nhận'}
                      </div>
                    </td>
                    <td className="p-4 whitespace-nowrap tabular-nums">
                      <span className="font-bold text-slate-900 whitespace-nowrap">{purchase.price}</span>
                    </td>
                    <td className="p-4 whitespace-nowrap">
                      {renderStatusBadge(purchase.status)}
                    </td>
                    <td className="p-4 text-right whitespace-nowrap">
                      {isPaidRecord(purchase.status) ? (
                        <div className="inline-flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => handleOpenReceiptModal(purchase)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-white text-slate-700 hover:text-[#007c76] hover:border-[#007c76] transition-colors border border-slate-200 cursor-pointer"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>Xem biên lai</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDownloadReceipt(purchase)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-[#007c76] text-white hover:bg-[#005c56] transition-colors cursor-pointer"
                          >
                            <Download className="w-3.5 h-3.5" />
                            <span>Tải PDF</span>
                          </button>
                        </div>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-400">
                          <Lock className="w-3 h-3" />
                          <span>Chưa phát hành biên lai</span>
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
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
