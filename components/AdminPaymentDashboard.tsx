import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { onSnapshot, collection } from 'firebase/firestore';
import {
  ArrowLeft,
  BookOpen,
  Check,
  CheckCircle2,
  Clock,
  Crown,
  Download,
  ExternalLink,
  Eye,
  Lock,
  Plus,
  RefreshCw,
  RotateCcw,
  Search,
  ShieldAlert,
  ShieldCheck,
  Unlock,
  Users,
  Wallet,
  X,
  XCircle,
} from 'lucide-react';
import { auth, db } from '../firebase';
import { ADMIN_EMAILS, getMergedCourses } from '../constants';
import { Course } from '../types';
import { useToast } from '../contexts/ToastContext';
import { getFastSessionUser } from '../utils/sessionAuth';
import { useSmoothScrollTo } from '../hooks/useSmoothScrollTo';

export enum OperationType {
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
    userId: string | undefined;
    email: string | null | undefined;
    emailVerified: boolean | undefined;
    isAnonymous: boolean | undefined;
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
  console.warn('[AdminPaymentDashboard Firestore Note]:', JSON.stringify(errInfo));
  return errInfo;
}

export interface PaymentRecord {
  id: string;
  orderId: string;
  registrationId: string;
  paymentCode: string;
  orderType: 'course' | 'direct_training' | 'vip' | string;
  studentName: string;
  email: string;
  phone: string;
  courseId: string;
  courseTitle: string;
  amount: number;
  status: 'PAID' | 'PENDING' | 'CANCELLED' | string;
  paymentMethod: string;
  transactionId: string;
  bankAccount: string;
  trainingTypeLabel?: string;
  createdAt: string;
  paidAt: string | null;
  courseActivated: boolean;
  activationStatus: string;
}

export interface ActivationRecord {
  id: string;
  registrationId?: string;
  studentEmail: string;
  studentName: string;
  phone: string;
  courseId: string;
  courseTitle: string;
  price: string;
  numericPrice: number;
  status: 'active' | 'inactive' | 'pending' | string;
  progress: number;
  completedLessonsCount: number;
  purchasedAt: string;
  unlockedAt: string;
  claimedVia: string;
  sourceType: 'purchased_course' | 'direct_training';
  isVip: boolean;
  isLocked: boolean;
}

export interface StudentSummaryRecord {
  email: string;
  displayName: string;
  phone: string;
  isVip: boolean;
  isAdmin: boolean;
  isTeacher: boolean;
  isLocked: boolean;
  activeCoursesCount: number;
  totalCoursesCount: number;
  createdAt: string;
  lastLoginAt: string;
}

interface OverviewSummary {
  totalConfirmedRevenue: number;
  totalOrders: number;
  paidOrdersCount: number;
  pendingOrdersCount: number;
  cancelledOrdersCount: number;
  activeEnrollmentsCount: number;
  inactiveEnrollmentsCount: number;
  totalStudentsCount: number;
  vipStudentsCount: number;
}

interface AdminPaymentDashboardProps {
  standalone?: boolean;
  userEmail?: string;
}

function formatVnd(amount: number): string {
  const num = Number(amount) || 0;
  return `${num.toLocaleString('vi-VN')} đ`;
}

function formatDateTime(isoStr?: string | null): string {
  if (!isoStr) return '—';
  try {
    const d = new Date(isoStr);
    if (Number.isNaN(d.getTime())) return '—';
    return d.toLocaleString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return '—';
  }
}

function getOrderTypeLabel(orderType: string, trainingTypeLabel?: string): string {
  if (orderType === 'direct_training') {
    return trainingTypeLabel || 'Đào tạo Online - Offline';
  }
  if (orderType === 'vip') {
    return 'Gói VIP Trọn đời';
  }
  return 'Khóa học Online';
}

function getClaimSourceLabel(claimedVia: string): string {
  const raw = String(claimedVia || '').toUpperCase();
  if (raw.includes('SEPAY')) return 'SePay Tự động';
  if (raw.includes('PAYMENT_CONFIRM')) return 'Duyệt thanh toán';
  if (raw.includes('BANK_TRANSFER')) return 'Chuyển khoản ngân hàng';
  if (raw.includes('ADMIN')) return 'Admin kích hoạt';
  if (raw.includes('MANUAL')) return 'Cấp thủ công';
  if (!claimedVia) return 'Hệ thống';
  return claimedVia;
}

export const AdminPaymentDashboard: React.FC<AdminPaymentDashboardProps> = ({
  standalone = false,
  userEmail: propUserEmail,
}) => {
  const toast = useToast();

  // Resolve current admin email from prop, Firebase Auth, or Fast Session
  const resolvedAdminEmail = useMemo(() => {
    const fastUser = getFastSessionUser();
    const raw = propUserEmail || auth.currentUser?.email || fastUser?.email || '';
    return raw.toLowerCase().trim();
  }, [propUserEmail]);

  const isKnownAdmin = useMemo(() => {
    if (!resolvedAdminEmail) return false;
    return ADMIN_EMAILS.map((e) => e.toLowerCase()).includes(resolvedAdminEmail);
  }, [resolvedAdminEmail]);

  const [activeView, setActiveView] = useState<'payments' | 'activations' | 'students'>('payments');
  const { scrollTo: scrollToPaymentWorkspace } = useSmoothScrollTo({
    targetId: 'admin-payment-workspace-table',
    triggerKey: activeView,
    scrollOnMount: false,
    offset: 16,
    detectDynamicReveal: true,
  });
  const handleSelectView = (view: 'payments' | 'activations' | 'students') => {
    if (view === activeView) {
      scrollToPaymentWorkspace('admin-payment-workspace-table');
      return;
    }
    setActiveView(view);
  };
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [lastSyncedAt, setLastSyncedAt] = useState<string>('');

  const [summary, setSummary] = useState<OverviewSummary>({
    totalConfirmedRevenue: 0,
    totalOrders: 0,
    paidOrdersCount: 0,
    pendingOrdersCount: 0,
    cancelledOrdersCount: 0,
    activeEnrollmentsCount: 0,
    inactiveEnrollmentsCount: 0,
    totalStudentsCount: 0,
    vipStudentsCount: 0,
  });
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [activations, setActivations] = useState<ActivationRecord[]>([]);
  const [students, setStudents] = useState<StudentSummaryRecord[]>([]);
  const [allCourses, setAllCourses] = useState<Course[]>(() => getMergedCourses([]));

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [paymentStatusFilter, setPaymentStatusFilter] = useState<'ALL' | 'PAID' | 'PENDING' | 'CANCELLED'>('ALL');
  const [paymentTypeFilter, setPaymentTypeFilter] = useState<'ALL' | 'course' | 'direct_training' | 'vip'>('ALL');
  const [activationStatusFilter, setActivationStatusFilter] = useState<'ALL' | 'active' | 'inactive'>('ALL');
  const [studentFilter, setStudentFilter] = useState<'ALL' | 'vip' | 'active'>('ALL');

  // Row mutations & drawers
  const [busyRowId, setBusyRowId] = useState<string | null>(null);
  const [selectedPayment, setSelectedPayment] = useState<PaymentRecord | null>(null);
  const [isGrantModalOpen, setIsGrantModalOpen] = useState(false);
  const [grantEmail, setGrantEmail] = useState('');
  const [grantCourseId, setGrantCourseId] = useState('');
  const [grantNote, setGrantNote] = useState('');
  const [grantSubmitting, setGrantSubmitting] = useState(false);

  const fetchOverview = useCallback(async (isSilent = false) => {
    if (!resolvedAdminEmail) {
      setLoading(false);
      return;
    }
    if (!isSilent) {
      setLoading((prev) => (payments.length === 0 ? true : prev));
    }
    setRefreshing(true);
    setErrorMsg(null);

    try {
      const res = await fetch(`/api/admin/payments-overview?adminEmail=${encodeURIComponent(resolvedAdminEmail)}`, {
        cache: 'no-store',
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Không thể tải dữ liệu thanh toán và kích hoạt.');
      }

      setSummary(data.summary);
      setPayments(Array.isArray(data.payments) ? data.payments : []);
      setActivations(Array.isArray(data.activations) ? data.activations : []);
      setStudents(Array.isArray(data.studentsSummary) ? data.studentsSummary : []);
      setLastSyncedAt(data.fetchedAt || new Date().toISOString());
    } catch (err: any) {
      setErrorMsg(err?.message || 'Lỗi kết nối máy chủ khi tải dữ liệu quản trị.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [resolvedAdminEmail, payments.length]);

  useEffect(() => {
    fetchOverview();
  }, [resolvedAdminEmail]);

  // Load latest catalog courses for Grant modal
  useEffect(() => {
    fetch('/api/courses')
      .then((r) => r.json())
      .then((d) => {
        if (d?.courses && Array.isArray(d.courses)) {
          setAllCourses(getMergedCourses(d.courses));
        }
      })
      .catch(() => {});
  }, []);

  // Real-time Firestore listener to auto-refresh overview when new live registrations arrive
  useEffect(() => {
    if (!resolvedAdminEmail) return;
    let isFirst = true;
    const unsubLive = onSnapshot(
      collection(db, 'live_course_registrations'),
      () => {
        if (isFirst) {
          isFirst = false;
          return;
        }
        fetchOverview(true);
      },
      (err) => {
        handleFirestoreError(err, OperationType.LIST, 'live_course_registrations');
      }
    );

    return () => {
      unsubLive();
    };
  }, [resolvedAdminEmail]);

  const handleUpdatePaymentStatus = async (
    payment: PaymentRecord,
    newStatus: 'PAID' | 'PENDING' | 'CANCELLED',
    autoActivateCourse = true
  ) => {
    if (!resolvedAdminEmail) return;
    setBusyRowId(payment.id);
    try {
      const res = await fetch('/api/admin/payments/update-status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          adminEmail: resolvedAdminEmail,
          orderId: payment.orderId,
          registrationId: payment.registrationId,
          paymentCode: payment.paymentCode,
          newStatus,
          autoActivateCourse,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Cập nhật thất bại.');
      }
      toast.success(data.message || 'Đã cập nhật trạng thái thanh toán.');
      await fetchOverview(true);
      if (selectedPayment?.id === payment.id) {
        setSelectedPayment((prev) =>
          prev
            ? {
                ...prev,
                status: newStatus,
                courseActivated: newStatus === 'PAID' && autoActivateCourse ? true : prev.courseActivated,
                activationStatus: newStatus === 'PAID' && autoActivateCourse ? 'active' : prev.activationStatus,
              }
            : null
        );
      }
    } catch (err: any) {
      toast.error(err?.message || 'Không thể cập nhật trạng thái thanh toán.');
    } finally {
      setBusyRowId(null);
    }
  };

  const handleToggleActivation = async (
    act: {
      id: string;
      studentEmail: string;
      courseId: string;
      courseTitle: string;
      price?: string;
      sourceType?: 'purchased_course' | 'direct_training';
      registrationId?: string;
    },
    action: 'activate' | 'revoke'
  ) => {
    if (!resolvedAdminEmail) return;
    setBusyRowId(act.id);
    try {
      const res = await fetch('/api/admin/activations/toggle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          adminEmail: resolvedAdminEmail,
          studentEmail: act.studentEmail,
          courseId: act.courseId,
          courseTitle: act.courseTitle,
          price: act.price,
          action,
          sourceType: act.sourceType || 'purchased_course',
          registrationId: act.registrationId,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Không thể cập nhật trạng thái kích hoạt.');
      }
      toast.success(data.message);
      await fetchOverview(true);
    } catch (err: any) {
      toast.error(err?.message || 'Lỗi cập nhật trạng thái kích hoạt.');
    } finally {
      setBusyRowId(null);
    }
  };

  const handleToggleVip = async (student: StudentSummaryRecord) => {
    if (!resolvedAdminEmail) return;
    setBusyRowId(`vip_${student.email}`);
    try {
      const action = student.isVip ? 'revoke_vip' : 'grant_vip';
      const res = await fetch('/api/admin/activations/toggle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          adminEmail: resolvedAdminEmail,
          studentEmail: student.email,
          action,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Không thể cập nhật quyền VIP.');
      }
      toast.success(data.message);
      await fetchOverview(true);
    } catch (err: any) {
      toast.error(err?.message || 'Lỗi cập nhật quyền VIP.');
    } finally {
      setBusyRowId(null);
    }
  };

  const handleGrantSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanEmail = grantEmail.toLowerCase().trim();
    if (!cleanEmail || !cleanEmail.includes('@')) {
      toast.error('Vui lòng nhập email học viên hợp lệ.');
      return;
    }
    if (!grantCourseId) {
      toast.error('Vui lòng chọn khóa học hoặc gói VIP.');
      return;
    }

    setGrantSubmitting(true);
    try {
      const isVipSelect = grantCourseId === 'vip-lifetime-access';
      const selectedCourse = allCourses.find((c) => c.id === grantCourseId);
      const res = await fetch('/api/admin/activations/toggle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          adminEmail: resolvedAdminEmail,
          studentEmail: cleanEmail,
          courseId: grantCourseId,
          courseTitle: isVipSelect ? 'VIP Trọn đời' : selectedCourse?.title || grantCourseId,
          price: isVipSelect ? 'VIP' : selectedCourse?.price || 'Admin kích hoạt',
          action: isVipSelect ? 'grant_vip' : 'activate',
          note: grantNote.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Kích hoạt thất bại.');
      }
      toast.success(data.message);
      setIsGrantModalOpen(false);
      setGrantEmail('');
      setGrantCourseId('');
      setGrantNote('');
      await fetchOverview(true);
    } catch (err: any) {
      toast.error(err?.message || 'Không thể kích hoạt khóa học.');
    } finally {
      setGrantSubmitting(false);
    }
  };

  // Filtered datasets
  const filteredPayments = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    return payments.filter((p) => {
      if (paymentStatusFilter !== 'ALL' && p.status !== paymentStatusFilter) return false;
      if (paymentTypeFilter !== 'ALL' && p.orderType !== paymentTypeFilter) return false;
      if (!q) return true;
      return (
        (p.paymentCode || '').toLowerCase().includes(q) ||
        (p.orderId || '').toLowerCase().includes(q) ||
        (p.email || '').toLowerCase().includes(q) ||
        (p.studentName || '').toLowerCase().includes(q) ||
        (p.phone || '').toLowerCase().includes(q) ||
        (p.courseTitle || '').toLowerCase().includes(q) ||
        (p.transactionId || '').toLowerCase().includes(q)
      );
    });
  }, [payments, searchQuery, paymentStatusFilter, paymentTypeFilter]);

  const filteredActivations = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    return activations.filter((a) => {
      if (activationStatusFilter !== 'ALL' && a.status !== activationStatusFilter) return false;
      if (!q) return true;
      return (
        (a.studentEmail || '').toLowerCase().includes(q) ||
        (a.studentName || '').toLowerCase().includes(q) ||
        (a.phone || '').toLowerCase().includes(q) ||
        (a.courseTitle || '').toLowerCase().includes(q) ||
        (a.courseId || '').toLowerCase().includes(q)
      );
    });
  }, [activations, searchQuery, activationStatusFilter]);

  const filteredStudents = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    return students.filter((s) => {
      if (studentFilter === 'vip' && !s.isVip) return false;
      if (studentFilter === 'active' && s.activeCoursesCount === 0 && !s.isVip) return false;
      if (!q) return true;
      return (
        (s.email || '').toLowerCase().includes(q) ||
        (s.displayName || '').toLowerCase().includes(q) ||
        (s.phone || '').toLowerCase().includes(q)
      );
    });
  }, [students, searchQuery, studentFilter]);

  const handleExportCsv = () => {
    try {
      let headers: string[] = [];
      let rows: string[][] = [];
      let filename = 'fast-admin-export.csv';

      if (activeView === 'payments') {
        filename = `fast-thanh-toan-${new Date().toISOString().slice(0, 10)}.csv`;
        headers = ['Ma FAST', 'Ma don', 'Hoc vien', 'Email', 'So dien thoai', 'Khoa hoc', 'Loai don', 'So tien VND', 'Trang thai TT', 'Da kich hoat', 'Ngay tao'];
        rows = filteredPayments.map((p) => [
          p.paymentCode || '',
          p.orderId || p.registrationId || '',
          p.studentName || '',
          p.email || '',
          p.phone || '',
          p.courseTitle || '',
          getOrderTypeLabel(p.orderType, p.trainingTypeLabel),
          String(p.amount || 0),
          p.status || '',
          p.courseActivated ? 'Co' : 'Chua',
          formatDateTime(p.createdAt),
        ]);
      } else if (activeView === 'activations') {
        filename = `fast-kich-hoat-khoa-hoc-${new Date().toISOString().slice(0, 10)}.csv`;
        headers = ['Email hoc vien', 'Ho ten', 'Ma khoa hoc', 'Ten khoa hoc', 'Trang thai', 'Tien do %', 'Nguon cap', 'Ngay kich hoat'];
        rows = filteredActivations.map((a) => [
          a.studentEmail || '',
          a.studentName || '',
          a.courseId || '',
          a.courseTitle || '',
          a.status === 'active' ? 'Dang kich hoat' : 'Tam khoa',
          String(a.progress || 0),
          getClaimSourceLabel(a.claimedVia),
          formatDateTime(a.unlockedAt || a.purchasedAt),
        ]);
      } else {
        filename = `fast-hoc-vien-${new Date().toISOString().slice(0, 10)}.csv`;
        headers = ['Email', 'Ho ten', 'SĐT', 'So khoa dang hoc', 'VIP', 'Khoa tai khoan'];
        rows = filteredStudents.map((s) => [
          s.email,
          s.displayName,
          s.phone || '',
          String(s.activeCoursesCount),
          s.isVip ? 'Co' : 'Khong',
          s.isLocked ? 'Bi khoa' : 'Binh thuong',
        ]);
      }

      const escapeCsv = (val: string) => `"${String(val || '').replace(/"/g, '""')}"`;
      const csvContent = '\uFEFF' + [headers.map(escapeCsv).join(','), ...rows.map((r) => r.map(escapeCsv).join(','))].join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      toast.success('Đã xuất file CSV thành công.');
    } catch {
      toast.error('Không thể xuất file CSV.');
    }
  };

  // Unauthorized guard for standalone /admin route
  if (standalone && (!resolvedAdminEmail || (!isKnownAdmin && errorMsg?.includes('quyền')))) {
    return (
      <div className="min-h-screen bg-[#f8fafc] flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-white border border-slate-200 rounded-2xl p-8 text-center space-y-5">
          <div className="w-12 h-12 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center mx-auto">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <div className="space-y-2">
            <h1 className="text-xl font-bold text-slate-900">Yêu cầu quyền Quản trị viên</h1>
            <p className="text-sm text-slate-600 leading-relaxed">
              {resolvedAdminEmail
                ? `Tài khoản ${resolvedAdminEmail} hiện chưa được cấp quyền truy cập Dashboard Quản trị.`
                : 'Vui lòng đăng nhập bằng tài khoản Quản trị viên để xem danh sách thanh toán và trạng thái kích hoạt khóa học.'}
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-2.5 justify-center pt-1">
            <Link
              to="/account"
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-[#007c76] text-white text-sm font-semibold hover:bg-[#006661] transition-colors"
            >
              Đăng nhập tài khoản
            </Link>
            <Link
              to="/"
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg border border-slate-200 bg-white text-slate-700 text-sm font-semibold hover:bg-slate-50 transition-colors"
            >
              Về trang chủ
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={standalone ? 'min-h-screen bg-[#f8fafc] text-slate-900' : 'space-y-6'}>
      {/* Standalone Top Header Bar */}
      {standalone && (
        <header className="sticky top-0 z-30 bg-white border-b border-slate-200 px-4 sm:px-8 h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <Link
              to="/account"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 transition-colors whitespace-nowrap"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Tài khoản</span>
            </Link>
            <span className="text-slate-300 hidden sm:inline">/</span>
            <div className="min-w-0">
              <h1 className="text-sm sm:text-base font-bold text-slate-900 truncate">
                Dashboard Admin · Thanh toán &amp; Kích hoạt Khóa học
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            <span className="hidden md:inline-block text-xs text-slate-500 font-medium">
              {resolvedAdminEmail}
            </span>
            <Link
              to="/khoa-hoc"
              className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors whitespace-nowrap"
            >
              <span>Danh mục khóa học</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </Link>
          </div>
        </header>
      )}

      <div className={standalone ? 'max-w-[1440px] mx-auto px-4 sm:px-8 py-6 sm:py-8 space-y-6' : 'space-y-6'}>
        {/* Workspace Header */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            {!standalone && (
              <h2 className="text-2xl font-bold text-slate-900 tracking-tight">
                Quản lý Thanh toán &amp; Kích hoạt Khóa học
              </h2>
            )}
            {standalone && (
              <h2 className="text-2xl font-bold text-slate-900 tracking-tight">
                Tổng quan Giao dịch &amp; Học viên
              </h2>
            )}
            <p className="text-sm text-slate-500 mt-1">
              Theo dõi giao dịch SePay VietQR, đối soát mã FAST và bật/tắt trạng thái kích hoạt khóa học của học viên.
              {lastSyncedAt && (
                <span className="ml-2 text-xs text-slate-400 tabular-nums">
                  · Cập nhật lúc {formatDateTime(lastSyncedAt)}
                </span>
              )}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              onClick={() => fetchOverview(false)}
              disabled={refreshing}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-slate-200 bg-white text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60 transition-colors cursor-pointer whitespace-nowrap"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
              <span>Làm mới</span>
            </button>
            <button
              type="button"
              onClick={handleExportCsv}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-slate-200 bg-white text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer whitespace-nowrap"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Xuất CSV</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setGrantEmail('');
                setGrantCourseId('');
                setGrantNote('');
                setIsGrantModalOpen(true);
              }}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#007c76] text-white text-xs font-semibold hover:bg-[#00645f] transition-colors cursor-pointer whitespace-nowrap"
            >
              <Plus className="w-4 h-4" />
              <span>Kích hoạt khóa học</span>
            </button>
          </div>
        </div>

        {/* KPI Summary Strip (Clean hairline 1px grid, tabular-nums, single elevation) */}
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 bg-white border border-slate-200 rounded-xl overflow-hidden divide-y sm:divide-y-0 sm:divide-x divide-slate-200">
            {[1, 2, 3, 4].map((idx) => (
              <div key={idx} className="p-5 space-y-2.5 animate-pulse">
                <div className="h-3.5 w-28 bg-slate-100 rounded" />
                <div className="h-7 w-36 bg-slate-200 rounded" />
                <div className="h-3 w-24 bg-slate-100 rounded" />
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 bg-white border border-slate-200 rounded-xl overflow-hidden divide-y sm:divide-y-0 sm:divide-x divide-slate-200">
            <div className="p-5 space-y-1.5">
              <div className="flex items-center justify-between text-xs font-medium text-slate-500">
                <span>Doanh thu đã xác nhận</span>
                <Wallet className="w-4 h-4 text-[#007c76]" />
              </div>
              <p className="text-2xl font-bold text-slate-900 tabular-nums tracking-tight">
                {formatVnd(summary.totalConfirmedRevenue)}
              </p>
              <p className="text-xs text-slate-500 tabular-nums">
                {summary.paidOrdersCount} giao dịch đã thanh toán
              </p>
            </div>

            <div className="p-5 space-y-1.5">
              <div className="flex items-center justify-between text-xs font-medium text-slate-500">
                <span>Đơn chờ thanh toán</span>
                <Clock className="w-4 h-4 text-amber-600" />
              </div>
              <p className="text-2xl font-bold text-slate-900 tabular-nums tracking-tight">
                {summary.pendingOrdersCount}
              </p>
              <p className="text-xs text-slate-500 tabular-nums">
                Trên tổng {summary.totalOrders} đơn ghi nhận
              </p>
            </div>

            <div className="p-5 space-y-1.5">
              <div className="flex items-center justify-between text-xs font-medium text-slate-500">
                <span>Khóa học đang kích hoạt</span>
                <BookOpen className="w-4 h-4 text-emerald-600" />
              </div>
              <p className="text-2xl font-bold text-slate-900 tabular-nums tracking-tight">
                {summary.activeEnrollmentsCount}
              </p>
              <p className="text-xs text-slate-500 tabular-nums">
                {summary.inactiveEnrollmentsCount} lượt tạm khóa / thu hồi
              </p>
            </div>

            <div className="p-5 space-y-1.5">
              <div className="flex items-center justify-between text-xs font-medium text-slate-500">
                <span>Tài khoản học viên</span>
                <Users className="w-4 h-4 text-slate-600" />
              </div>
              <p className="text-2xl font-bold text-slate-900 tabular-nums tracking-tight">
                {summary.totalStudentsCount}
              </p>
              <p className="text-xs text-slate-500 tabular-nums">
                {summary.vipStudentsCount} tài khoản VIP trọn đời
              </p>
            </div>
          </div>
        )}

        {/* Error Banner */}
        {errorMsg && (
          <div className="bg-white border border-rose-200 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 text-sm text-rose-700">
              <XCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
            <button
              type="button"
              onClick={() => fetchOverview(false)}
              className="px-3.5 py-1.5 rounded-lg border border-rose-200 bg-rose-50 text-xs font-semibold text-rose-700 hover:bg-rose-100 transition-colors cursor-pointer whitespace-nowrap self-start sm:self-auto"
            >
              Thử lại
            </button>
          </div>
        )}

        {/* Main Workspace Card */}
        <div id="admin-payment-workspace-table" className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          {/* Primary View Tabs & Search/Filter Toolbar */}
          <div className="p-4 sm:px-5 border-b border-slate-200 flex flex-col xl:flex-row xl:items-center justify-between gap-4">
            {/* Segmented View Tabs */}
            <div className="inline-flex items-center bg-slate-100 p-1 rounded-lg self-start overflow-x-auto max-w-full">
              <button
                type="button"
                onClick={() => handleSelectView('payments')}
                className={`px-3.5 py-1.5 rounded-md text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap ${
                  activeView === 'payments'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Danh sách Thanh toán <span className="ml-1 text-slate-400 tabular-nums">({payments.length})</span>
              </button>
              <button
                type="button"
                onClick={() => handleSelectView('activations')}
                className={`px-3.5 py-1.5 rounded-md text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap ${
                  activeView === 'activations'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Trạng thái Kích hoạt Khóa học <span className="ml-1 text-slate-400 tabular-nums">({activations.length})</span>
              </button>
              <button
                type="button"
                onClick={() => handleSelectView('students')}
                className={`px-3.5 py-1.5 rounded-md text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap ${
                  activeView === 'students'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Học viên <span className="ml-1 text-slate-400 tabular-nums">({students.length})</span>
              </button>
            </div>

            {/* Search & Contextual Filters */}
            <div className="flex flex-col sm:flex-row sm:items-center gap-2.5 flex-1 xl:justify-end">
              <div className="relative flex-1 sm:max-w-xs">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={
                    activeView === 'payments'
                      ? 'Tìm mã FAST, email, SĐT, khóa học...'
                      : activeView === 'activations'
                        ? 'Tìm email, tên học viên, khóa học...'
                        : 'Tìm email, tên, SĐT học viên...'
                  }
                  className="w-full pl-9 pr-8 py-2 bg-white border border-slate-200 rounded-lg text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-[#007c76]"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    aria-label="Xóa tìm kiếm"
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {activeView === 'payments' && (
                <>
                  <select
                    value={paymentStatusFilter}
                    onChange={(e) => setPaymentStatusFilter(e.target.value as any)}
                    className="px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-medium text-slate-700 focus:outline-none focus:border-[#007c76] cursor-pointer"
                  >
                    <option value="ALL">Tất cả trạng thái</option>
                    <option value="PAID">Đã thanh toán</option>
                    <option value="PENDING">Chờ thanh toán</option>
                    <option value="CANCELLED">Đã hủy</option>
                  </select>
                  <select
                    value={paymentTypeFilter}
                    onChange={(e) => setPaymentTypeFilter(e.target.value as any)}
                    className="px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-medium text-slate-700 focus:outline-none focus:border-[#007c76] cursor-pointer"
                  >
                    <option value="ALL">Tất cả loại đơn</option>
                    <option value="course">Khóa học Online</option>
                    <option value="direct_training">Đào tạo Online - Offline</option>
                    <option value="vip">Gói VIP Trọn đời</option>
                  </select>
                </>
              )}

              {activeView === 'activations' && (
                <select
                  value={activationStatusFilter}
                  onChange={(e) => setActivationStatusFilter(e.target.value as any)}
                  className="px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-medium text-slate-700 focus:outline-none focus:border-[#007c76] cursor-pointer"
                >
                  <option value="ALL">Tất cả trạng thái</option>
                  <option value="active">Đang kích hoạt</option>
                  <option value="inactive">Đã tạm khóa</option>
                </select>
              )}

              {activeView === 'students' && (
                <select
                  value={studentFilter}
                  onChange={(e) => setStudentFilter(e.target.value as any)}
                  className="px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-medium text-slate-700 focus:outline-none focus:border-[#007c76] cursor-pointer"
                >
                  <option value="ALL">Tất cả học viên</option>
                  <option value="active">Đã có khóa học</option>
                  <option value="vip">Tài khoản VIP</option>
                </select>
              )}
            </div>
          </div>

          {/* Table Content Area */}
          {loading ? (
            <div className="divide-y divide-slate-100">
              {[1, 2, 3, 4, 5, 6].map((r) => (
                <div key={r} className="px-5 py-4 flex items-center justify-between gap-4 animate-pulse">
                  <div className="h-4 w-28 bg-slate-100 rounded" />
                  <div className="h-4 w-48 bg-slate-100 rounded" />
                  <div className="h-4 w-40 bg-slate-100 rounded hidden md:block" />
                  <div className="h-4 w-20 bg-slate-100 rounded" />
                  <div className="h-4 w-24 bg-slate-100 rounded" />
                </div>
              ))}
            </div>
          ) : activeView === 'payments' ? (
            filteredPayments.length === 0 ? (
              <div className="py-16 px-6 text-center space-y-3">
                <p className="text-sm font-semibold text-slate-800">Không có giao dịch thanh toán nào khớp bộ lọc</p>
                <p className="text-xs text-slate-500 max-w-md mx-auto">
                  Thử thay đổi từ khóa tìm kiếm hoặc đặt lại bộ lọc trạng thái để xem toàn bộ lịch sử đơn hàng.
                </p>
                {(searchQuery || paymentStatusFilter !== 'ALL' || paymentTypeFilter !== 'ALL') && (
                  <button
                    type="button"
                    onClick={() => {
                      setSearchQuery('');
                      setPaymentStatusFilter('ALL');
                      setPaymentTypeFilter('ALL');
                    }}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Đặt lại bộ lọc</span>
                  </button>
                )}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse min-w-[960px]">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50/70 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                      <th className="py-3 px-4">Mã thanh toán</th>
                      <th className="py-3 px-4">Học viên</th>
                      <th className="py-3 px-4">Khóa học / Hình thức</th>
                      <th className="py-3 px-4 text-right">Số tiền</th>
                      <th className="py-3 px-4">Thanh toán</th>
                      <th className="py-3 px-4">Kích hoạt khóa</th>
                      <th className="py-3 px-4">Thời gian</th>
                      <th className="py-3 px-4 text-right">Thao tác</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-xs">
                    {filteredPayments.map((p) => {
                      const isBusy = busyRowId === p.id;
                      const isPaid = p.status === 'PAID';
                      const isCancelled = p.status === 'CANCELLED';

                      return (
                        <tr key={p.id} className="hover:bg-slate-50/80 transition-colors">
                          <td className="py-3 px-4 align-top">
                            <div className="font-mono font-semibold text-slate-900 tabular-nums">
                              {p.paymentCode || '—'}
                            </div>
                            <div className="text-[11px] text-slate-400 font-mono truncate max-w-[140px] mt-0.5">
                              {p.orderId || p.registrationId}
                            </div>
                          </td>

                          <td className="py-3 px-4 align-top">
                            <div className="font-semibold text-slate-900">{p.studentName || 'Khách vãng lai'}</div>
                            <div className="text-[11px] text-slate-500 mt-0.5">
                              {p.email || 'Chưa có email'}
                              {p.phone ? ` · ${p.phone}` : ''}
                            </div>
                          </td>

                          <td className="py-3 px-4 align-top max-w-[260px]">
                            <div className="font-medium text-slate-800 line-clamp-1" title={p.courseTitle}>
                              {p.courseTitle}
                            </div>
                            <div className="text-[11px] text-slate-500 mt-0.5">
                              {getOrderTypeLabel(p.orderType, p.trainingTypeLabel)}
                            </div>
                          </td>

                          <td className="py-3 px-4 align-top text-right font-semibold text-slate-900 tabular-nums whitespace-nowrap">
                            {formatVnd(p.amount)}
                          </td>

                          <td className="py-3 px-4 align-top whitespace-nowrap">
                            {isPaid ? (
                              <span className="inline-flex items-center gap-1.5 font-semibold text-emerald-700">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-600" />
                                Đã thanh toán
                              </span>
                            ) : isCancelled ? (
                              <span className="inline-flex items-center gap-1.5 font-medium text-rose-700">
                                <span className="w-1.5 h-1.5 rounded-full bg-rose-600" />
                                Đã hủy
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1.5 font-medium text-amber-700">
                                <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                                Chờ thanh toán
                              </span>
                            )}
                          </td>

                          <td className="py-3 px-4 align-top whitespace-nowrap">
                            {p.courseActivated ? (
                              <span className="inline-flex items-center gap-1 text-emerald-700 font-medium">
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                Đã kích hoạt
                              </span>
                            ) : p.activationStatus === 'inactive' ? (
                              <span className="inline-flex items-center gap-1 text-rose-600 font-medium">
                                <Lock className="w-3.5 h-3.5" />
                                Đã tạm khóa
                              </span>
                            ) : (
                              <span className="text-slate-400">Chưa kích hoạt</span>
                            )}
                          </td>

                          <td className="py-3 px-4 align-top text-slate-500 tabular-nums whitespace-nowrap">
                            <div>{formatDateTime(p.paidAt || p.createdAt)}</div>
                            {p.transactionId && (
                              <div className="text-[11px] text-slate-400 font-mono truncate max-w-[120px] mt-0.5">
                                Ref: {p.transactionId}
                              </div>
                            )}
                          </td>

                          <td className="py-3 px-4 align-top text-right whitespace-nowrap">
                            <div className="inline-flex items-center gap-1.5">
                              {!isPaid && (
                                <button
                                  type="button"
                                  disabled={isBusy}
                                  onClick={() => handleUpdatePaymentStatus(p, 'PAID', true)}
                                  className="px-2.5 py-1.5 rounded-md bg-[#007c76] text-white text-[11px] font-semibold hover:bg-[#00635e] disabled:opacity-50 transition-colors cursor-pointer"
                                >
                                  {isBusy ? 'Đang xử lý...' : 'Duyệt & Kích hoạt'}
                                </button>
                              )}
                              {isPaid && !p.courseActivated && (
                                <button
                                  type="button"
                                  disabled={isBusy}
                                  onClick={() => handleUpdatePaymentStatus(p, 'PAID', true)}
                                  className="px-2.5 py-1.5 rounded-md bg-emerald-600 text-white text-[11px] font-semibold hover:bg-emerald-700 disabled:opacity-50 transition-colors cursor-pointer"
                                >
                                  {isBusy ? 'Đang xử lý...' : 'Kích hoạt khóa'}
                                </button>
                              )}
                              <button
                                type="button"
                                onClick={() => setSelectedPayment(p)}
                                className="px-2.5 py-1.5 rounded-md border border-slate-200 bg-white text-slate-700 text-[11px] font-medium hover:bg-slate-50 transition-colors cursor-pointer inline-flex items-center gap-1"
                              >
                                <Eye className="w-3 h-3" />
                                <span>Chi tiết</span>
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )
          ) : activeView === 'activations' ? (
            filteredActivations.length === 0 ? (
              <div className="py-16 px-6 text-center space-y-3">
                <p className="text-sm font-semibold text-slate-800">Chưa có dữ liệu kích hoạt khóa học phù hợp</p>
                <p className="text-xs text-slate-500 max-w-md mx-auto">
                  Bạn có thể kích hoạt trực tiếp khóa học cho học viên hoặc xóa bộ lọc hiện tại.
                </p>
                <div className="flex items-center justify-center gap-2 pt-1">
                  {(searchQuery || activationStatusFilter !== 'ALL') && (
                    <button
                      type="button"
                      onClick={() => {
                        setSearchQuery('');
                        setActivationStatusFilter('ALL');
                      }}
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
                    >
                      Đặt lại bộ lọc
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setIsGrantModalOpen(true)}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-[#007c76] text-white text-xs font-semibold hover:bg-[#00635e] cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Kích hoạt khóa học mới</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse min-w-[920px]">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50/70 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                      <th className="py-3 px-4">Học viên</th>
                      <th className="py-3 px-4">Khóa học</th>
                      <th className="py-3 px-4">Nguồn kích hoạt</th>
                      <th className="py-3 px-4 text-right">Tiến độ</th>
                      <th className="py-3 px-4">Ngày kích hoạt</th>
                      <th className="py-3 px-4">Trạng thái</th>
                      <th className="py-3 px-4 text-right">Thao tác</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-xs">
                    {filteredActivations.map((act) => {
                      const isBusy = busyRowId === act.id;
                      const isActive = act.status === 'active';
                      return (
                        <tr key={act.id} className="hover:bg-slate-50/80 transition-colors">
                          <td className="py-3 px-4 align-top">
                            <div className="font-semibold text-slate-900 flex items-center gap-1.5">
                              <span>{act.studentName}</span>
                              {act.isVip && (
                                <span className="text-[11px] font-semibold text-amber-600 inline-flex items-center gap-0.5">
                                  · VIP
                                </span>
                              )}
                            </div>
                            <div className="text-[11px] text-slate-500 mt-0.5">
                              {act.studentEmail}
                              {act.phone ? ` · ${act.phone}` : ''}
                            </div>
                          </td>

                          <td className="py-3 px-4 align-top max-w-[280px]">
                            <div className="font-medium text-slate-800 line-clamp-1" title={act.courseTitle}>
                              {act.courseTitle}
                            </div>
                            <div className="text-[11px] text-slate-400 font-mono mt-0.5">
                              {act.courseId}
                              {act.price ? ` · ${act.price}` : ''}
                            </div>
                          </td>

                          <td className="py-3 px-4 align-top text-slate-600">
                            {getClaimSourceLabel(act.claimedVia)}
                          </td>

                          <td className="py-3 px-4 align-top text-right tabular-nums text-slate-700 font-medium">
                            {act.progress}%
                          </td>

                          <td className="py-3 px-4 align-top text-slate-500 tabular-nums whitespace-nowrap">
                            {formatDateTime(act.unlockedAt || act.purchasedAt)}
                          </td>

                          <td className="py-3 px-4 align-top whitespace-nowrap">
                            {isActive ? (
                              <span className="inline-flex items-center gap-1.5 font-semibold text-emerald-700">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-600" />
                                Đang kích hoạt
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1.5 font-medium text-rose-700">
                                <span className="w-1.5 h-1.5 rounded-full bg-rose-600" />
                                Đã tạm khóa
                              </span>
                            )}
                          </td>

                          <td className="py-3 px-4 align-top text-right whitespace-nowrap">
                            {isActive ? (
                              <button
                                type="button"
                                disabled={isBusy}
                                onClick={() => handleToggleActivation(act, 'revoke')}
                                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md border border-slate-200 bg-white text-slate-700 text-[11px] font-semibold hover:border-rose-200 hover:bg-rose-50 hover:text-rose-700 disabled:opacity-50 transition-colors cursor-pointer"
                              >
                                <Lock className="w-3 h-3" />
                                <span>{isBusy ? 'Đang xử lý...' : 'Tạm khóa'}</span>
                              </button>
                            ) : (
                              <button
                                type="button"
                                disabled={isBusy}
                                onClick={() => handleToggleActivation(act, 'activate')}
                                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md bg-[#007c76] text-white text-[11px] font-semibold hover:bg-[#00635e] disabled:opacity-50 transition-colors cursor-pointer"
                              >
                                <Unlock className="w-3 h-3" />
                                <span>{isBusy ? 'Đang xử lý...' : 'Kích hoạt lại'}</span>
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )
          ) : filteredStudents.length === 0 ? (
            <div className="py-16 px-6 text-center space-y-3">
              <p className="text-sm font-semibold text-slate-800">Không tìm thấy học viên phù hợp</p>
              <button
                type="button"
                onClick={() => {
                  setSearchQuery('');
                  setStudentFilter('ALL');
                }}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
              >
                Đặt lại bộ lọc
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-[840px]">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50/70 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                    <th className="py-3 px-4">Học viên</th>
                    <th className="py-3 px-4">Số điện thoại</th>
                    <th className="py-3 px-4 text-right">Khóa đã kích hoạt</th>
                    <th className="py-3 px-4">Gói VIP</th>
                    <th className="py-3 px-4">Trạng thái TK</th>
                    <th className="py-3 px-4 text-right">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {filteredStudents.map((st) => {
                    const isVipBusy = busyRowId === `vip_${st.email}`;
                    return (
                      <tr key={st.email} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3 px-4 align-top">
                          <div className="font-semibold text-slate-900">{st.displayName}</div>
                          <div className="text-[11px] text-slate-500 mt-0.5">{st.email}</div>
                        </td>
                        <td className="py-3 px-4 align-top text-slate-600 tabular-nums">
                          {st.phone || '—'}
                        </td>
                        <td className="py-3 px-4 align-top text-right tabular-nums font-semibold text-slate-900">
                          {st.activeCoursesCount}
                          {st.totalCoursesCount > st.activeCoursesCount && (
                            <span className="text-slate-400 font-normal"> / {st.totalCoursesCount}</span>
                          )}
                        </td>
                        <td className="py-3 px-4 align-top whitespace-nowrap">
                          {st.isVip ? (
                            <span className="inline-flex items-center gap-1 font-semibold text-amber-700">
                              <Crown className="w-3.5 h-3.5" />
                              VIP Trọn đời
                            </span>
                          ) : (
                            <span className="text-slate-400">Thường</span>
                          )}
                        </td>
                        <td className="py-3 px-4 align-top whitespace-nowrap">
                          {st.isLocked ? (
                            <span className="inline-flex items-center gap-1.5 font-medium text-rose-700">
                              <span className="w-1.5 h-1.5 rounded-full bg-rose-600" />
                              Đang bị khóa
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 font-medium text-emerald-700">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-600" />
                              Hoạt động
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4 align-top text-right whitespace-nowrap">
                          <div className="inline-flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => {
                                setGrantEmail(st.email);
                                setGrantCourseId('');
                                setGrantNote('');
                                setIsGrantModalOpen(true);
                              }}
                              className="px-2.5 py-1.5 rounded-md border border-slate-200 bg-white text-slate-700 text-[11px] font-semibold hover:bg-slate-50 transition-colors cursor-pointer"
                            >
                              + Cấp khóa học
                            </button>
                            <button
                              type="button"
                              disabled={isVipBusy}
                              onClick={() => handleToggleVip(st)}
                              className={`px-2.5 py-1.5 rounded-md text-[11px] font-semibold transition-colors cursor-pointer disabled:opacity-50 ${
                                st.isVip
                                  ? 'border border-slate-200 bg-white text-slate-700 hover:bg-rose-50 hover:text-rose-700 hover:border-rose-200'
                                  : 'bg-amber-500 text-white hover:bg-amber-600'
                              }`}
                            >
                              {isVipBusy ? '...' : st.isVip ? 'Gỡ VIP' : 'Cấp VIP'}
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Payment Detail Drawer */}
      {selectedPayment && (
        <div
          className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-[1px] flex justify-end"
          onClick={() => setSelectedPayment(null)}
        >
          <div
            className="w-full max-w-lg bg-white h-full border-l border-slate-200 flex flex-col justify-between overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6 space-y-6">
              <div className="flex items-start justify-between gap-4 border-b border-slate-100 pb-4">
                <div>
                  <p className="text-xs font-medium text-slate-500">Chi tiết giao dịch thanh toán</p>
                  <h3 className="text-lg font-bold text-slate-900 font-mono mt-0.5 tabular-nums">
                    {selectedPayment.paymentCode || selectedPayment.orderId || selectedPayment.registrationId}
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedPayment(null)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-4 text-sm">
                <div className="grid grid-cols-2 gap-4 py-3 border-b border-slate-100">
                  <div>
                    <p className="text-xs text-slate-500">Số tiền giao dịch</p>
                    <p className="text-lg font-bold text-slate-900 tabular-nums mt-0.5">
                      {formatVnd(selectedPayment.amount)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">Trạng thái thanh toán</p>
                    <p className="font-semibold text-slate-900 mt-1">
                      {selectedPayment.status === 'PAID'
                        ? 'Đã thanh toán'
                        : selectedPayment.status === 'CANCELLED'
                          ? 'Đã hủy'
                          : 'Chờ thanh toán'}
                    </p>
                  </div>
                </div>

                <dl className="space-y-3 text-xs">
                  <div className="flex justify-between gap-4">
                    <dt className="text-slate-500">Học viên</dt>
                    <dd className="font-semibold text-slate-900 text-right">{selectedPayment.studentName}</dd>
                  </div>
                  <div className="flex justify-between gap-4">
                    <dt className="text-slate-500">Email</dt>
                    <dd className="font-medium text-slate-800 text-right break-all">{selectedPayment.email || '—'}</dd>
                  </div>
                  <div className="flex justify-between gap-4">
                    <dt className="text-slate-500">Số điện thoại</dt>
                    <dd className="font-medium text-slate-800 tabular-nums text-right">{selectedPayment.phone || '—'}</dd>
                  </div>
                  <div className="flex justify-between gap-4">
                    <dt className="text-slate-500">Khóa học</dt>
                    <dd className="font-semibold text-slate-900 text-right">{selectedPayment.courseTitle}</dd>
                  </div>
                  <div className="flex justify-between gap-4">
                    <dt className="text-slate-500">Hình thức</dt>
                    <dd className="text-slate-800 text-right">
                      {getOrderTypeLabel(selectedPayment.orderType, selectedPayment.trainingTypeLabel)}
                    </dd>
                  </div>
                  <div className="flex justify-between gap-4">
                    <dt className="text-slate-500">Tài khoản nhận</dt>
                    <dd className="font-mono text-slate-800 tabular-nums text-right">
                      ACB · {selectedPayment.bankAccount || '0989499568'}
                    </dd>
                  </div>
                  <div className="flex justify-between gap-4">
                    <dt className="text-slate-500">Mã đối soát ngân hàng</dt>
                    <dd className="font-mono text-slate-800 text-right">{selectedPayment.transactionId || '—'}</dd>
                  </div>
                  <div className="flex justify-between gap-4">
                    <dt className="text-slate-500">Thời gian tạo đơn</dt>
                    <dd className="tabular-nums text-slate-800 text-right">{formatDateTime(selectedPayment.createdAt)}</dd>
                  </div>
                  <div className="flex justify-between gap-4">
                    <dt className="text-slate-500">Thời gian thanh toán</dt>
                    <dd className="tabular-nums text-slate-800 text-right">{formatDateTime(selectedPayment.paidAt)}</dd>
                  </div>
                  <div className="flex justify-between gap-4">
                    <dt className="text-slate-500">Trạng thái kích hoạt</dt>
                    <dd className={`font-semibold text-right ${selectedPayment.courseActivated ? 'text-emerald-700' : 'text-slate-600'}`}>
                      {selectedPayment.courseActivated ? 'Đã kích hoạt quyền học' : 'Chưa kích hoạt'}
                    </dd>
                  </div>
                </dl>
              </div>
            </div>

            <div className="p-6 border-t border-slate-200 bg-slate-50 space-y-2.5">
              <p className="text-xs font-semibold text-slate-700">Thao tác quản trị</p>
              <div className="flex flex-col gap-2">
                <button
                  type="button"
                  disabled={busyRowId === selectedPayment.id}
                  onClick={() => handleUpdatePaymentStatus(selectedPayment, 'PAID', true)}
                  className="w-full py-2.5 px-4 rounded-lg bg-[#007c76] text-white text-xs font-semibold hover:bg-[#00635e] disabled:opacity-50 transition-colors cursor-pointer inline-flex items-center justify-center gap-1.5"
                >
                  <Check className="w-4 h-4" />
                  <span>
                    {selectedPayment.status === 'PAID'
                      ? 'Đồng bộ lại & Kích hoạt khóa học'
                      : 'Xác nhận Đã thanh toán & Kích hoạt khóa học'}
                  </span>
                </button>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    disabled={busyRowId === selectedPayment.id || selectedPayment.status === 'PENDING'}
                    onClick={() => handleUpdatePaymentStatus(selectedPayment, 'PENDING', false)}
                    className="py-2 px-3 rounded-lg border border-slate-200 bg-white text-slate-700 text-xs font-semibold hover:bg-slate-100 disabled:opacity-40 transition-colors cursor-pointer"
                  >
                    Đặt về Chờ thanh toán
                  </button>
                  <button
                    type="button"
                    disabled={busyRowId === selectedPayment.id || selectedPayment.status === 'CANCELLED'}
                    onClick={() => handleUpdatePaymentStatus(selectedPayment, 'CANCELLED', false)}
                    className="py-2 px-3 rounded-lg border border-rose-200 bg-white text-rose-700 text-xs font-semibold hover:bg-rose-50 disabled:opacity-40 transition-colors cursor-pointer"
                  >
                    Hủy giao dịch
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Grant / Activate Course Modal */}
      {isGrantModalOpen && (
        <div
          className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-[1px] flex items-center justify-center p-4"
          onClick={() => setIsGrantModalOpen(false)}
        >
          <div
            className="w-full max-w-md bg-white border border-slate-200 rounded-xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900">Kích hoạt khóa học cho học viên</h3>
              <button
                type="button"
                onClick={() => setIsGrantModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleGrantSubmit} className="p-5 space-y-4">
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-slate-700">Email học viên</label>
                <input
                  type="email"
                  required
                  list="fast-student-email-suggestions"
                  value={grantEmail}
                  onChange={(e) => setGrantEmail(e.target.value)}
                  placeholder="hocvien@gmail.com"
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs text-slate-900 focus:outline-none focus:border-[#007c76]"
                />
                <datalist id="fast-student-email-suggestions">
                  {students.map((s) => (
                    <option key={s.email} value={s.email}>
                      {s.displayName}
                    </option>
                  ))}
                </datalist>
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-slate-700">Chọn khóa học / gói truy cập</label>
                <select
                  required
                  value={grantCourseId}
                  onChange={(e) => setGrantCourseId(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs text-slate-900 focus:outline-none focus:border-[#007c76]"
                >
                  <option value="">-- Chọn khóa học cần kích hoạt --</option>
                  <option value="vip-lifetime-access">VIP Trọn đời (Toàn bộ khóa học)</option>
                  {allCourses
                    .filter((c) => !String(c.id).includes('vip'))
                    .map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.title} ({c.price || 'Miễn phí'})
                      </option>
                    ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-slate-700">Ghi chú đối soát (tùy chọn)</label>
                <input
                  type="text"
                  value={grantNote}
                  onChange={(e) => setGrantNote(e.target.value)}
                  placeholder="VD: Chuyển khoản ACB ngày 17/11 hoặc ưu đãi học viên"
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs text-slate-900 focus:outline-none focus:border-[#007c76]"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsGrantModalOpen(false)}
                  className="px-4 py-2 rounded-lg border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={grantSubmitting}
                  className="px-4 py-2 rounded-lg bg-[#007c76] text-white text-xs font-semibold hover:bg-[#00635e] disabled:opacity-50 transition-colors cursor-pointer inline-flex items-center gap-1.5"
                >
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>{grantSubmitting ? 'Đang kích hoạt...' : 'Xác nhận kích hoạt'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminPaymentDashboard;
