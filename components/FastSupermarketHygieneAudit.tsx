import React, { useState, useEffect, useRef, useMemo } from 'react';
import { auth, db } from '../firebase';
import { doc, getDoc, setDoc, onSnapshot } from 'firebase/firestore';
import { useToast } from '../contexts/ToastContext';
import { useSmoothScrollTo } from '../hooks/useSmoothScrollTo';
import {
  SUPERMARKET_DEPARTMENTS,
  SUPERMARKET_AUDIT_AREAS,
  SupermarketControlPoint,
} from '../data/supermarketHygieneData';
import {
  Check,
  X,
  Minus,
  ChevronDown,
  Search,
  Download,
  Copy,
  Printer,
  FileWarning,
  History,
  Plus,
  Save,
  Trash2,
  FolderOpen,
  Cloud,
  RefreshCw,
  AlertTriangle,
} from 'lucide-react';

enum SupermarketOperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  GET = 'get',
  WRITE = 'write',
}

interface SupermarketFirestoreErrorInfo {
  error: string;
  operationType: SupermarketOperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
  };
}

function handleSupermarketFirestoreError(
  error: unknown,
  operationType: SupermarketOperationType,
  path: string | null
) {
  const errInfo: SupermarketFirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    operationType,
    path,
    authInfo: {
      userId: auth.currentUser?.uid || null,
      email: auth.currentUser?.email || null,
      emailVerified: auth.currentUser?.emailVerified ?? null,
    },
  };
  console.warn('[FastSupermarketHygiene:Firestore]', JSON.stringify(errInfo));
}

export type AuditItemStatus = 'PASS' | 'NC' | 'NA';

export interface ControlPointRecord {
  status?: AuditItemStatus;
  evidence?: string;
  capa?: string;
  severity?: string;
  deadline?: string;
}

export interface SupermarketAuditSession {
  id: string;
  facilityName: string;
  auditorName: string;
  facilityRep: string;
  auditDate: string;
  facilityAddress: string;
  auditType: string;
  selectedDepts: string[];
  openAreas: number[];
  records: Record<string, ControlPointRecord>;
  _lastUpdated: number;
  _writerId?: string;
  _loadedFromCrmId?: string;
  _isExplicitReset?: boolean;
  summary?: {
    total: number;
    pass: number;
    nc: number;
    na: number;
    compliancePct: number;
    rank: string;
    savedAt: string;
  };
}

const LOCAL_CURRENT_KEY = 'fast_supermarket_hygiene_current';
const LOCAL_CURRENT_TS_KEY = 'fast_supermarket_hygiene_ts';
const LOCAL_CRM_KEY = 'fast_supermarket_hygiene_crm';
const LOCAL_CRM_TS_KEY = 'fast_supermarket_hygiene_crm_ts';

const AUDIT_TYPES = [
  'Đánh giá QA định kỳ',
  'Đánh giá đột xuất hiện trường',
  'Thẩm tra khắc phục (Follow-up CAPA)',
  'Tư vấn tiền thẩm định ATTP / HACCP',
];

function createEmptySession(auditorName = ''): SupermarketAuditSession {
  return {
    id: `sm_${Date.now()}`,
    facilityName: '',
    auditorName,
    facilityRep: '',
    auditDate: new Date().toISOString().split('T')[0],
    facilityAddress: '',
    auditType: AUDIT_TYPES[0],
    selectedDepts: [],
    openAreas: [1, 2, 3, 4, 5, 6, 7, 8],
    records: {},
    _lastUpdated: 0,
  };
}

function isMeaningfulSession(data: Record<string, any> | null | undefined): boolean {
  if (!data || typeof data !== 'object') return false;
  if (data._isExplicitReset) return true;
  if (
    (typeof data.facilityName === 'string' && data.facilityName.trim() !== '') ||
    (typeof data.auditorName === 'string' && data.auditorName.trim() !== '') ||
    (typeof data.facilityRep === 'string' && data.facilityRep.trim() !== '') ||
    (typeof data.facilityAddress === 'string' && data.facilityAddress.trim() !== '')
  ) {
    return true;
  }
  if (Array.isArray(data.selectedDepts) && data.selectedDepts.length > 0) return true;
  if (data.records && typeof data.records === 'object') {
    return Object.values(data.records).some((r: any) => r && (r.status || r.evidence || r.capa));
  }
  return false;
}

function formatDateVN(isoDate?: string): string {
  if (!isoDate) return '-';
  const parts = isoDate.split('-');
  return parts.length === 3 ? `${parts[2]}/${parts[1]}/${parts[0]}` : isoDate;
}

export const FastSupermarketHygieneAudit: React.FC = () => {
  const toast = useToast();

  // Form & Audit state
  const [auditId, setAuditId] = useState<string>(() => `sm_${Date.now()}`);
  const [facilityName, setFacilityName] = useState('');
  const [auditorName, setAuditorName] = useState('');
  const [facilityRep, setFacilityRep] = useState('');
  const [auditDate, setAuditDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [facilityAddress, setFacilityAddress] = useState('');
  const [auditType, setAuditType] = useState(AUDIT_TYPES[0]);
  const [selectedDepts, setSelectedDepts] = useState<string[]>([]);
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'UNRATED' | AuditItemStatus>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [openAreas, setOpenAreas] = useState<number[]>([1, 2, 3, 4, 5, 6, 7, 8]);
  const [records, setRecords] = useState<Record<string, ControlPointRecord>>({});

  // Sync & UI state
  const [syncStatus, setSyncStatus] = useState<'synced' | 'saving' | 'offline'>('synced');
  const [lastSyncedAt, setLastSyncedAt] = useState<string>('');
  const [isCrmOpen, setIsCrmOpen] = useState(false);
  const [crmRecords, setCrmRecords] = useState<Record<string, SupermarketAuditSession>>({});
  const [printMode, setPrintMode] = useState<'full' | 'nc'>('full');
  const [confirmDialog, setConfirmDialog] = useState<{
    title: string;
    message: string;
    onConfirm: () => void;
  } | null>(null);

  const { scrollTo: scrollToSection } = useSmoothScrollTo({
    offset: 16,
    detectDynamicReveal: true,
  });

  useSmoothScrollTo({
    targetId: 'supermarket-crm-panel',
    triggerKey: isCrmOpen,
    enabled: isCrmOpen,
    offset: 16,
    detectDynamicReveal: true,
  });

  // Sync refs to eliminate echo loops and stale overwrites
  const tabWriterIdRef = useRef<string>(
    `sm_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
  );
  const hasHydratedRef = useRef(false);
  const hasUserEditedRef = useRef(false);
  const isApplyingRemoteRef = useRef(false);
  const lastLocalTsRef = useRef<number>(Number(localStorage.getItem(LOCAL_CURRENT_TS_KEY) || 0));
  const lastCrmTsRef = useRef<number>(Number(localStorage.getItem(LOCAL_CRM_TS_KEY) || 0));
  const crmRecordsRef = useRef<Record<string, SupermarketAuditSession>>({});
  crmRecordsRef.current = crmRecords;
  const activeCrmIdRef = useRef<string | null>(null);
  const latestPayloadRef = useRef<SupermarketAuditSession | null>(null);
  const confirmModalRef = useRef<HTMLDivElement | null>(null);
  const shouldScrollConfirmModalRef = useRef(false);

  useEffect(() => {
    if (!confirmDialog || !shouldScrollConfirmModalRef.current) return;
    shouldScrollConfirmModalRef.current = false;

    let rafId = 0;
    let innerRafId = 0;
    rafId = window.requestAnimationFrame(() => {
      innerRafId = window.requestAnimationFrame(() => {
        confirmModalRef.current?.scrollIntoView({
          behavior: 'smooth',
          block: 'center',
        });
      });
    });

    return () => {
      if (rafId) window.cancelAnimationFrame(rafId);
      if (innerRafId) window.cancelAnimationFrame(innerRafId);
    };
  }, [confirmDialog]);

  const applySessionState = (data: Record<string, any>) => {
    if (!data || typeof data !== 'object') return;
    isApplyingRemoteRef.current = true;
    hasUserEditedRef.current = false;
    activeCrmIdRef.current = data._loadedFromCrmId || null;

    setAuditId(String(data.id || `sm_${Date.now()}`));
    setFacilityName(String(data.facilityName || ''));
    setAuditorName(String(data.auditorName || ''));
    setFacilityRep(String(data.facilityRep || ''));
    setAuditDate(String(data.auditDate || new Date().toISOString().split('T')[0]));
    setFacilityAddress(String(data.facilityAddress || ''));
    setAuditType(String(data.auditType || AUDIT_TYPES[0]));
    setSelectedDepts(Array.isArray(data.selectedDepts) ? data.selectedDepts : []);
    setOpenAreas(
      Array.isArray(data.openAreas) && data.openAreas.length > 0
        ? data.openAreas
        : [1, 2, 3, 4, 5, 6, 7, 8]
    );
    setRecords(data.records && typeof data.records === 'object' ? data.records : {});

    queueMicrotask(() => {
      isApplyingRemoteRef.current = false;
    });
  };

  const persistSessionToCloudAndServer = async (
    payload: SupermarketAuditSession,
    keepalive = false
  ) => {
    const cleanPayload = { ...payload };
    let firestoreOk = false;
    let serverOk = false;

    try {
      await setDoc(doc(db, 'fast_supermarket_hygiene_crm', 'current_session'), cleanPayload);
      firestoreOk = true;
    } catch (err) {
      handleSupermarketFirestoreError(
        err,
        SupermarketOperationType.WRITE,
        'fast_supermarket_hygiene_crm/current_session'
      );
    }

    try {
      const res = await fetch('/api/fast-supermarket-hygiene/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(cleanPayload),
        keepalive,
      });
      serverOk = res.ok;
    } catch {}

    setSyncStatus(firestoreOk || serverOk ? 'synced' : 'offline');
    if (firestoreOk || serverOk) {
      setLastSyncedAt(new Date().toLocaleTimeString('vi-VN'));
    }
    return { firestoreOk, serverOk };
  };

  // 1. Hydrate LocalStorage -> Server API -> Cloud Firestore Real-time onSnapshot
  useEffect(() => {
    let active = true;
    try {
      const rawLocal = localStorage.getItem(LOCAL_CURRENT_KEY);
      if (rawLocal) {
        const parsed = JSON.parse(rawLocal);
        if (isMeaningfulSession(parsed)) {
          applySessionState(parsed);
        } else {
          lastLocalTsRef.current = 0;
          localStorage.removeItem(LOCAL_CURRENT_KEY);
          localStorage.removeItem(LOCAL_CURRENT_TS_KEY);
        }
      } else {
        lastLocalTsRef.current = 0;
      }
    } catch {
      lastLocalTsRef.current = 0;
    }

    try {
      const rawCrm = localStorage.getItem(LOCAL_CRM_KEY);
      if (rawCrm) {
        const parsedCrm = JSON.parse(rawCrm);
        if (parsedCrm && typeof parsedCrm === 'object') {
          setCrmRecords(parsedCrm);
          crmRecordsRef.current = parsedCrm;
        }
      }
    } catch {}

    hasHydratedRef.current = true;

    const applyRemoteSessionIfNewer = (data: Record<string, any> | null | undefined) => {
      if (!active || !data || typeof data !== 'object') return;
      if (data._writerId && data._writerId === tabWriterIdRef.current) return;
      if (hasUserEditedRef.current) return;

      const remoteTs = Number(data._lastUpdated || 0);
      const meaningful = isMeaningfulSession(data);
      const shouldApply =
        remoteTs > lastLocalTsRef.current || (lastLocalTsRef.current === 0 && meaningful);

      if (shouldApply && (meaningful || lastLocalTsRef.current > 0)) {
        lastLocalTsRef.current = remoteTs || Date.now();
        applySessionState(data);
        setSyncStatus('synced');
        setLastSyncedAt(new Date().toLocaleTimeString('vi-VN'));
        try {
          localStorage.setItem(LOCAL_CURRENT_KEY, JSON.stringify(data));
          localStorage.setItem(LOCAL_CURRENT_TS_KEY, String(lastLocalTsRef.current));
        } catch {}
      }
    };

    const applyRemoteCrmIfNewer = (
      remoteRecs: Record<string, SupermarketAuditSession> | null | undefined,
      remoteTsRaw: unknown,
      writerId?: string
    ) => {
      if (!active || !remoteRecs || typeof remoteRecs !== 'object') return;
      if (writerId && writerId === tabWriterIdRef.current) return;

      const remoteTs = Number(remoteTsRaw || 0);
      const remoteCount = Object.keys(remoteRecs).length;
      const localCount = Object.keys(crmRecordsRef.current).length;

      if (remoteCount === 0 && remoteTs === 0 && localCount > 0) return;

      const shouldApply =
        remoteTs > lastCrmTsRef.current || (lastCrmTsRef.current === 0 && remoteCount > 0);

      if (shouldApply) {
        lastCrmTsRef.current = remoteTs || Date.now();
        crmRecordsRef.current = remoteRecs;
        setCrmRecords(remoteRecs);
        try {
          localStorage.setItem(LOCAL_CRM_KEY, JSON.stringify(remoteRecs));
          localStorage.setItem(LOCAL_CRM_TS_KEY, String(lastCrmTsRef.current));
        } catch {}
      }
    };

    // Server pre-load
    fetch('/api/fast-supermarket-hygiene/session', { cache: 'no-store' })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.session) applyRemoteSessionIfNewer(data.session);
      })
      .catch(() => {});

    fetch('/api/fast-supermarket-hygiene/crm', { cache: 'no-store' })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.records) applyRemoteCrmIfNewer(data.records, data._lastUpdated);
      })
      .catch(() => {});

    // Firestore Real-time listeners
    const unsubSession = onSnapshot(
      doc(db, 'fast_supermarket_hygiene_crm', 'current_session'),
      (snap) => {
        if (!active || !snap.exists()) return;
        applyRemoteSessionIfNewer(snap.data());
      },
      (err) => {
        setSyncStatus('offline');
        handleSupermarketFirestoreError(
          err,
          SupermarketOperationType.GET,
          'fast_supermarket_hygiene_crm/current_session'
        );
      }
    );

    const unsubCrm = onSnapshot(
      doc(db, 'fast_supermarket_hygiene_crm', 'database'),
      (snap) => {
        if (!active || !snap.exists()) return;
        const data = snap.data();
        if (data?.records && typeof data.records === 'object') {
          applyRemoteCrmIfNewer(data.records, data._lastUpdated, data._writerId);
        }
      },
      (err) => {
        handleSupermarketFirestoreError(
          err,
          SupermarketOperationType.GET,
          'fast_supermarket_hygiene_crm/database'
        );
      }
    );

    return () => {
      active = false;
      unsubSession();
      unsubCrm();
    };
  }, []);

  const isItemApplicable = (item: SupermarketControlPoint) => {
    if (selectedDepts.length === 0) return true;
    return item.depts.some((d) => selectedDepts.includes(d));
  };

  // Derived KPI metrics
  const kpi = useMemo(() => {
    let total = 0;
    let pass = 0;
    let nc = 0;
    let na = 0;

    SUPERMARKET_AUDIT_AREAS.forEach((area) => {
      area.items.forEach((item) => {
        if (selectedDepts.length > 0 && !item.depts.some((d) => selectedDepts.includes(d))) {
          return;
        }
        total++;
        const st = records[item.code]?.status;
        if (st === 'PASS') pass++;
        else if (st === 'NC') nc++;
        else if (st === 'NA') na++;
      });
    });

    const evaluated = pass + nc + na;
    const scorable = pass + nc;
    const compliancePct = scorable > 0 ? Math.round((pass / scorable) * 100) : 0;
    const progressPct = total > 0 ? Math.round((evaluated / total) * 100) : 0;

    let rank = 'CHƯA CHẤM';
    let rankColor = 'text-slate-500';
    if (scorable > 0) {
      if (compliancePct >= 95) {
        rank = 'XUẤT SẮC (HẠNG A)';
        rankColor = 'text-emerald-700';
      } else if (compliancePct >= 85) {
        rank = 'ĐẠT CHUẨN (HẠNG B)';
        rankColor = 'text-[#007c76]';
      } else if (compliancePct >= 70) {
        rank = 'CẦN CẢI TIẾN (C)';
        rankColor = 'text-amber-700';
      } else {
        rank = 'KHÔNG ĐẠT (D)';
        rankColor = 'text-red-700';
      }
    }

    return { total, pass, nc, na, evaluated, scorable, compliancePct, progressPct, rank, rankColor };
  }, [records, selectedDepts]);

  const buildCurrentSessionObject = (timestamp = Date.now()): SupermarketAuditSession => ({
    id: auditId,
    facilityName,
    auditorName,
    facilityRep,
    auditDate,
    facilityAddress,
    auditType,
    selectedDepts,
    openAreas,
    records,
    _lastUpdated: timestamp,
    _writerId: tabWriterIdRef.current,
    ...(activeCrmIdRef.current ? { _loadedFromCrmId: activeCrmIdRef.current } : {}),
  });

  // 2. Debounced reactive auto-save to LocalStorage + Firestore + Server
  useEffect(() => {
    if (!hasHydratedRef.current || isApplyingRemoteRef.current || !hasUserEditedRef.current) return;

    setSyncStatus('saving');
    const snapshotPayload = buildCurrentSessionObject(Date.now());
    latestPayloadRef.current = snapshotPayload;

    const timer = setTimeout(async () => {
      if (!hasUserEditedRef.current) return;
      hasUserEditedRef.current = false;
      const nowTs = Date.now();
      lastLocalTsRef.current = nowTs;
      const data: SupermarketAuditSession = { ...snapshotPayload, _lastUpdated: nowTs };
      latestPayloadRef.current = data;

      try {
        localStorage.setItem(LOCAL_CURRENT_KEY, JSON.stringify(data));
        localStorage.setItem(LOCAL_CURRENT_TS_KEY, String(nowTs));
      } catch {}

      await persistSessionToCloudAndServer(data);
    }, 350);

    return () => clearTimeout(timer);
  }, [
    auditId,
    facilityName,
    auditorName,
    facilityRep,
    auditDate,
    facilityAddress,
    auditType,
    selectedDepts,
    openAreas,
    records,
  ]);

  // Flush dirty draft on unmount/unload
  useEffect(() => {
    const flushIfDirty = () => {
      if (hasUserEditedRef.current && latestPayloadRef.current) {
        hasUserEditedRef.current = false;
        const nowTs = Date.now();
        lastLocalTsRef.current = nowTs;
        const data = { ...latestPayloadRef.current, _lastUpdated: nowTs };
        try {
          localStorage.setItem(LOCAL_CURRENT_KEY, JSON.stringify(data));
          localStorage.setItem(LOCAL_CURRENT_TS_KEY, String(nowTs));
        } catch {}
        void persistSessionToCloudAndServer(data, true);
      }
    };

    window.addEventListener('beforeunload', flushIfDirty);
    return () => {
      window.removeEventListener('beforeunload', flushIfDirty);
      flushIfDirty();
    };
  }, []);

  const markDirty = () => {
    if (!isApplyingRemoteRef.current) {
      hasUserEditedRef.current = true;
    }
  };

  // Field handlers
  const handleToggleDept = (dept: string) => {
    markDirty();
    if (dept === 'ALL') {
      setSelectedDepts([]);
      return;
    }
    setSelectedDepts((prev) =>
      prev.includes(dept) ? prev.filter((d) => d !== dept) : [...prev, dept]
    );
  };

  const handleToggleArea = (areaId: number) => {
    markDirty();
    setOpenAreas((prev) =>
      prev.includes(areaId) ? prev.filter((id) => id !== areaId) : [...prev, areaId]
    );
  };

  const handleSetItemStatus = (code: string, newStatus: AuditItemStatus) => {
    markDirty();
    setRecords((prev) => {
      const existing = prev[code] || { severity: 'Major (Lỗi nặng)' };
      if (existing.status === newStatus) {
        const nextRec = { ...existing };
        delete nextRec.status;
        return { ...prev, [code]: nextRec };
      }
      const nextRec: ControlPointRecord = {
        ...existing,
        status: newStatus,
      };
      if (newStatus === 'NC') {
        if (!nextRec.severity) nextRec.severity = 'Major (Lỗi nặng)';
        if (!nextRec.deadline) {
          const d = new Date();
          d.setDate(d.getDate() + 3);
          nextRec.deadline = d.toISOString().split('T')[0];
        }
      }
      return { ...prev, [code]: nextRec };
    });
  };

  const handleUpdateNCField = (
    code: string,
    field: 'evidence' | 'capa' | 'severity' | 'deadline',
    value: string
  ) => {
    markDirty();
    setRecords((prev) => ({
      ...prev,
      [code]: {
        ...(prev[code] || { status: 'NC' }),
        [field]: value,
      },
    }));
  };

  const handleBatchPassArea = (areaId: number) => {
    const area = SUPERMARKET_AUDIT_AREAS.find((a) => a.id === areaId);
    if (!area) return;
    const applicable = area.items.filter(isItemApplicable);
    const unrated = applicable.filter((it) => !records[it.code]?.status);
    if (unrated.length === 0) {
      toast.showToast('Tất cả tiêu chí áp dụng trong khu vực này đã được đánh giá.', 'info');
      return;
    }
    markDirty();
    setRecords((prev) => {
      const next = { ...prev };
      unrated.forEach((it) => {
        next[it.code] = { ...(next[it.code] || {}), status: 'PASS' };
      });
      return next;
    });
    toast.showToast(`Đã đánh dấu Đạt cho ${unrated.length} mục còn lại trong ${area.name}.`, 'success');
  };

  // CRM Actions
  const handleStartNewAudit = () => {
    shouldScrollConfirmModalRef.current = true;
    setConfirmDialog({
      title: 'Tạo cuộc đánh giá mới',
      message:
        'Làm mới toàn bộ biên bản hiện tại? Hãy đảm bảo bạn đã bấm "Lưu CRM" nếu cần giữ lại kết quả đang chấm.',
      onConfirm: () => {
        const resetTs = Date.now();
        lastLocalTsRef.current = resetTs;
        hasUserEditedRef.current = false;
        isApplyingRemoteRef.current = true;
        activeCrmIdRef.current = null;

        const empty = createEmptySession(auditorName);
        empty._lastUpdated = resetTs;
        empty._writerId = tabWriterIdRef.current;
        empty._isExplicitReset = true;

        applySessionState(empty);
        latestPayloadRef.current = empty;
        try {
          localStorage.setItem(LOCAL_CURRENT_KEY, JSON.stringify(empty));
          localStorage.setItem(LOCAL_CURRENT_TS_KEY, String(resetTs));
        } catch {}
        void persistSessionToCloudAndServer(empty);
        setConfirmDialog(null);
        toast.showToast('Đã khởi tạo biên bản đánh giá mới.', 'info');
        scrollToSection('#supermarket-audit-meta');
      },
    });
  };

  const handleSaveToCRM = async () => {
    if (!facilityName.trim()) {
      toast.showToast('Vui lòng nhập Tên Cơ Sở / Siêu Thị trước khi lưu biên bản CRM!', 'warning');
      scrollToSection('#supermarket-audit-meta');
      return;
    }

    setSyncStatus('saving');
    const nowTs = Date.now();
    const recordId = activeCrmIdRef.current || `sm_${nowTs}`;
    activeCrmIdRef.current = recordId;

    const currentSnapshot: SupermarketAuditSession = {
      ...buildCurrentSessionObject(nowTs),
      id: recordId,
      _loadedFromCrmId: recordId,
      summary: {
        total: kpi.total,
        pass: kpi.pass,
        nc: kpi.nc,
        na: kpi.na,
        compliancePct: kpi.compliancePct,
        rank: kpi.rank,
        savedAt: new Date().toLocaleString('vi-VN'),
      },
    };

    let latestRemoteRecords: Record<string, SupermarketAuditSession> = {};
    let latestRemoteTs = 0;
    try {
      const remoteSnap = await getDoc(doc(db, 'fast_supermarket_hygiene_crm', 'database'));
      if (
        remoteSnap.exists() &&
        remoteSnap.data()?.records &&
        typeof remoteSnap.data()?.records === 'object'
      ) {
        latestRemoteRecords = remoteSnap.data()!.records;
        latestRemoteTs = Number(remoteSnap.data()?._lastUpdated || 0);
      }
    } catch {}

    const mergedBase =
      latestRemoteTs > lastCrmTsRef.current
        ? { ...latestRemoteRecords }
        : { ...latestRemoteRecords, ...crmRecordsRef.current };

    const updatedCrm: Record<string, SupermarketAuditSession> = {
      ...mergedBase,
      [recordId]: currentSnapshot,
    };

    lastCrmTsRef.current = nowTs;
    crmRecordsRef.current = updatedCrm;
    setCrmRecords(updatedCrm);
    try {
      localStorage.setItem(LOCAL_CRM_KEY, JSON.stringify(updatedCrm));
      localStorage.setItem(LOCAL_CRM_TS_KEY, String(nowTs));
    } catch {}

    let cloudSaved = false;
    let serverSaved = false;

    try {
      await setDoc(doc(db, 'fast_supermarket_hygiene_crm', 'database'), {
        records: updatedCrm,
        _lastUpdated: nowTs,
        _writerId: tabWriterIdRef.current,
      });
      cloudSaved = true;
    } catch (e) {
      handleSupermarketFirestoreError(
        e,
        SupermarketOperationType.WRITE,
        'fast_supermarket_hygiene_crm/database'
      );
    }

    try {
      const res = await fetch('/api/fast-supermarket-hygiene/crm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          records: updatedCrm,
          _lastUpdated: nowTs,
          _writerId: tabWriterIdRef.current,
        }),
      });
      serverSaved = res.ok;
    } catch {}

    hasUserEditedRef.current = false;
    lastLocalTsRef.current = nowTs;
    try {
      localStorage.setItem(LOCAL_CURRENT_KEY, JSON.stringify(currentSnapshot));
      localStorage.setItem(LOCAL_CURRENT_TS_KEY, String(nowTs));
    } catch {}
    await persistSessionToCloudAndServer(currentSnapshot);

    if (cloudSaved || serverSaved) {
      toast.showToast(
        `Đã lưu & đồng bộ biên bản "${facilityName.trim()}" lên Cloud Firestore!`,
        'success'
      );
    } else {
      toast.showToast('Đã lưu cục bộ, nhưng chưa thể đồng bộ lên máy chủ.', 'warning');
    }
  };

  const handleLoadFromCRM = (id: string) => {
    const rec = crmRecordsRef.current[id];
    if (!rec) return;
    setConfirmDialog({
      title: 'Tải biên bản từ CRM',
      message: `Tải biên bản của "${rec.facilityName}" sẽ thay thế dữ liệu đang mở trên form. Tiếp tục?`,
      onConfirm: () => {
        const nowTs = Date.now();
        lastLocalTsRef.current = nowTs;
        hasUserEditedRef.current = false;
        const syncedRec: SupermarketAuditSession = {
          ...rec,
          _loadedFromCrmId: id,
          _lastUpdated: nowTs,
          _writerId: tabWriterIdRef.current,
        };
        applySessionState(syncedRec);
        latestPayloadRef.current = syncedRec;
        try {
          localStorage.setItem(LOCAL_CURRENT_KEY, JSON.stringify(syncedRec));
          localStorage.setItem(LOCAL_CURRENT_TS_KEY, String(nowTs));
        } catch {}
        void persistSessionToCloudAndServer(syncedRec);
        setIsCrmOpen(false);
        setConfirmDialog(null);
        toast.showToast(`Đã tải biên bản "${rec.facilityName}" từ Firestore.`, 'success');
        scrollToSection('#supermarket-audit-meta');
      },
    });
  };

  const handleDeleteFromCRM = (id: string) => {
    const targetName = crmRecordsRef.current[id]?.facilityName || 'biên bản này';
    setConfirmDialog({
      title: 'Xóa biên bản khỏi CRM',
      message: `Bạn có chắc chắn muốn xóa biên bản "${targetName}" khỏi hệ thống đồng bộ Firestore?`,
      onConfirm: async () => {
        const nowTs = Date.now();
        let baseRecords: Record<string, SupermarketAuditSession> = { ...crmRecordsRef.current };
        try {
          const remoteSnap = await getDoc(doc(db, 'fast_supermarket_hygiene_crm', 'database'));
          if (
            remoteSnap.exists() &&
            remoteSnap.data()?.records &&
            typeof remoteSnap.data()?.records === 'object'
          ) {
            const remoteTs = Number(remoteSnap.data()?._lastUpdated || 0);
            baseRecords =
              remoteTs >= lastCrmTsRef.current
                ? { ...remoteSnap.data()!.records }
                : { ...remoteSnap.data()!.records, ...baseRecords };
          }
        } catch {}

        const updated = { ...baseRecords };
        delete updated[id];
        if (activeCrmIdRef.current === id) {
          activeCrmIdRef.current = null;
        }

        lastCrmTsRef.current = nowTs;
        crmRecordsRef.current = updated;
        setCrmRecords(updated);
        try {
          localStorage.setItem(LOCAL_CRM_KEY, JSON.stringify(updated));
          localStorage.setItem(LOCAL_CRM_TS_KEY, String(nowTs));
        } catch {}

        try {
          await setDoc(doc(db, 'fast_supermarket_hygiene_crm', 'database'), {
            records: updated,
            _lastUpdated: nowTs,
            _writerId: tabWriterIdRef.current,
          });
        } catch (e) {
          handleSupermarketFirestoreError(
            e,
            SupermarketOperationType.DELETE,
            'fast_supermarket_hygiene_crm/database'
          );
        }

        try {
          await fetch('/api/fast-supermarket-hygiene/crm', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              records: updated,
              _lastUpdated: nowTs,
              _writerId: tabWriterIdRef.current,
            }),
          });
        } catch {}

        setConfirmDialog(null);
        toast.showToast(`Đã xóa biên bản "${targetName}".`, 'success');
      },
    });
  };

  // Exports & Print
  const handleExportExcel = () => {
    const facility = facilityName.trim() || 'CoSo_DanhGia';
    const esc = (val: unknown) => `"${(val ?? '').toString().replace(/"/g, '""')}"`;

    let csv = '\uFEFF';
    csv += 'BIÊN BẢN ĐÁNH GIÁ QA AUDIT CONTROL POINTS & KẾ HOẠCH KHẮC PHỤC (CAPA) - FOOD HYGIENE FOR SUPERMARKET\n';
    csv += `Cơ sở:,${esc(facility)},Chuyên gia:,${esc(auditorName)},Ngày đánh giá:,${esc(formatDateVN(auditDate))}\n\n`;
    csv +=
      'Mã Điểm KS,Nhóm Khu Vực (Area),Tiêu Chí (Criteria),Điều Kiện Lỗi (Condition),Mô Tả Chi Tiết,Ngành Hàng Áp Dụng,Kết Quả Đánh Giá,Mức Độ Lỗi,Bằng Chứng Thực Tế / Vị Trí Lỗi,Hành Động Khắc Phục (CAPA),Thời Hạn Hoàn Thành\n';

    SUPERMARKET_AUDIT_AREAS.forEach((area) => {
      area.items.forEach((item) => {
        if (!isItemApplicable(item)) return;
        const rec = records[item.code] || {};
        const statusLabel =
          rec.status === 'PASS'
            ? 'Đạt (Pass)'
            : rec.status === 'NC'
            ? 'Lỗi (NC)'
            : rec.status === 'NA'
            ? 'Không áp dụng (N/A)'
            : 'Chưa chấm';
        csv += `${esc(item.code)},${esc(area.name)},${esc(item.criteria)},${esc(item.condition)},${esc(
          item.detail
        )},${esc(item.depts.join('; '))},${esc(statusLabel)},${esc(
          rec.status === 'NC' ? rec.severity || 'Major (Lỗi nặng)' : ''
        )},${esc(rec.evidence || '')},${esc(rec.capa || '')},${esc(
          rec.deadline ? formatDateVN(rec.deadline) : ''
        )}\n`;
      });
    });

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const safeName = facility.replace(/[^a-zA-Z0-9\u00C0-\u1EF9]/g, '_');
    a.href = url;
    a.download = `FAST_Food_Hygiene_Supermarket_${safeName}_${auditDate || Date.now()}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.showToast('Đã xuất file Excel (.csv UTF-8) bảng đánh giá & CAPA!', 'success');
  };

  const handleCopyNCSummaryZalo = () => {
    const facility = facilityName.trim() || 'CƠ SỞ ĐƯỢC ĐÁNH GIÁ';
    const auditor = auditorName.trim() || 'Chuyên gia FAST';
    const dateLabel = formatDateVN(auditDate);

    const ncLines: string[] = [];
    let idx = 1;
    SUPERMARKET_AUDIT_AREAS.forEach((area) => {
      area.items.forEach((item) => {
        if (!isItemApplicable(item)) return;
        const rec = records[item.code];
        if (rec?.status === 'NC') {
          ncLines.push(
            `${idx}. [${item.code}] ${area.name.replace(/^Area \d+:\s*/, '')} - ${item.criteria}: ${item.condition}\n` +
              `   • Mức độ: ${rec.severity || 'Major (Lỗi nặng)'}\n` +
              `   • Thực tế / Vị trí: ${rec.evidence || 'Chưa ghi chi tiết'}\n` +
              `   • Khắc phục (CAPA): ${rec.capa || 'Khắc phục ngay theo chuẩn ATTP'}\n` +
              `   • Hạn hoàn thành: ${rec.deadline ? formatDateVN(rec.deadline) : 'Ngay lập tức'}`
          );
          idx++;
        }
      });
    });

    const ncBody =
      ncLines.length > 0
        ? ncLines.join('\n\n')
        : 'Không phát hiện điểm không phù hợp (NC) nào trong kỳ đánh giá này.';

    const msg = `BÁO CÁO TÓM TẮT ĐÁNH GIÁ FOOD HYGIENE FOR SUPERMARKET (FAST CONSULTING)\n- Cơ sở: ${facility.toUpperCase()}\n- Ngày đánh giá: ${dateLabel}\n- Chuyên gia đánh giá: ${auditor}\n- Tỷ lệ tuân thủ: ${kpi.compliancePct}% | Xếp loại: ${kpi.rank}\n--------------------------------------------------\nDANH SÁCH ĐIỂM KHÔNG PHÙ HỢP (NC) & YÊU CẦU KHẮC PHỤC (${ncLines.length} LỖI):\n\n${ncBody}\n--------------------------------------------------\nĐề nghị cơ sở triển khai khắc phục đúng thời hạn và gửi hình ảnh xác nhận sau khắc phục.\nTrân trọng, FAST CONSULTING • Hotline: 0927 002 668`;

    navigator.clipboard
      .writeText(msg)
      .then(() => {
        toast.showToast(
          `Đã sao chép báo cáo (${ncLines.length} lỗi NC) để gửi Zalo / Email!`,
          'success'
        );
      })
      .catch(() => {
        toast.showToast('Không thể truy cập clipboard trên trình duyệt này.', 'error');
      });
  };

  const handlePrint = (ncOnly: boolean) => {
    setPrintMode(ncOnly ? 'nc' : 'full');
    setTimeout(() => {
      window.print();
    }, 120);
  };

  const savedCrmList = useMemo(() => {
    return Object.entries(crmRecords)
      .map(([key, rec]) => ({ key, ...(rec as SupermarketAuditSession) }))
      .sort((a, b) => Number(b._lastUpdated || 0) - Number(a._lastUpdated || 0));
  }, [crmRecords]);

  const normalizedQuery = searchQuery.trim().toLowerCase();

  return (
    <div
      className={`space-y-6 text-slate-800 ${
        printMode === 'nc' ? 'print-supermarket-nc-only' : ''
      }`}
    >
      {/* Top Workspace Header */}
      <div className="bg-gradient-to-r from-[#005c56] to-[#007c76] rounded-2xl p-6 text-white border border-teal-900/20 flex flex-col lg:flex-row lg:items-center justify-between gap-4 print:bg-white print:text-black print:border-b-2 print:border-black print:rounded-none print:p-0 print:pb-3">
        <div className="space-y-1.5">
          <div className="flex flex-wrap items-center gap-2 text-xs font-semibold text-teal-100 print:text-slate-600">
            <span>FAST CONSULTING</span>
            <span aria-hidden="true">·</span>
            <span>QA Audit Control Points &amp; CAPA</span>
            <span aria-hidden="true">·</span>
            <span>08 Khu Vực · 12 Ngành Hàng Siêu Thị</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black tracking-tight text-white print:text-black">
            Food hygiene for supermarket
          </h2>
          <p className="text-xs text-teal-50/90 max-w-2xl print:hidden">
            Hệ thống chấm điểm vệ sinh an toàn thực phẩm thực địa tại siêu thị &amp; bán lẻ — đồng bộ hai chiều thời gian thực lên Cloud Firestore &amp; quản trị CAPA.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 shrink-0 print:hidden">
          <div className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/10 border border-white/20 text-xs font-bold text-white whitespace-nowrap">
            {syncStatus === 'saving' ? (
              <RefreshCw className="w-3.5 h-3.5 animate-spin text-amber-300" />
            ) : (
              <Cloud
                className={`w-3.5 h-3.5 ${
                  syncStatus === 'offline' ? 'text-amber-300' : 'text-emerald-300'
                }`}
              />
            )}
            <span>
              {syncStatus === 'saving'
                ? 'Đang đồng bộ Firestore...'
                : syncStatus === 'offline'
                ? 'Lưu cục bộ (Offline)'
                : lastSyncedAt
                ? `Firestore đồng bộ ${lastSyncedAt}`
                : 'Firestore sẵn sàng'}
            </span>
          </div>

          <button
            type="button"
            onClick={() => setIsCrmOpen((prev) => !prev)}
            className="px-4 py-2 rounded-xl bg-white text-[#005c56] hover:bg-teal-50 font-extrabold text-xs inline-flex items-center gap-1.5 transition cursor-pointer whitespace-nowrap"
          >
            <History className="w-4 h-4" />
            <span>Lịch sử CRM ({savedCrmList.length})</span>
          </button>
        </div>
      </div>

      {/* Inline CRM History Drawer */}
      {isCrmOpen && (
        <section
          id="supermarket-crm-panel"
          className="bg-white rounded-2xl border border-slate-200 p-5 space-y-4 print:hidden"
        >
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h3 className="text-sm font-black text-slate-900 uppercase tracking-wide">
                Biên bản đã lưu trên Cloud Firestore ({savedCrmList.length})
              </h3>
              <p className="text-xs text-slate-500">
                Dữ liệu đồng bộ đa thiết bị qua collection <span className="font-mono">fast_supermarket_hygiene_crm</span>.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setIsCrmOpen(false)}
              className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {savedCrmList.length === 0 ? (
            <div className="py-8 text-center text-xs text-slate-500 border border-dashed border-slate-200 rounded-xl">
              Chưa có biên bản siêu thị nào được lưu vào CRM. Bấm <strong>Lưu biên bản (CRM)</strong> để đồng bộ.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold">
                    <th className="py-2.5 px-3">Ngày đánh giá</th>
                    <th className="py-2.5 px-3">Cơ sở / Siêu thị</th>
                    <th className="py-2.5 px-3">Chuyên gia</th>
                    <th className="py-2.5 px-3 text-right tabular-nums">Đạt / Lỗi NC</th>
                    <th className="py-2.5 px-3 text-right tabular-nums">Tuân thủ</th>
                    <th className="py-2.5 px-3">Xếp loại</th>
                    <th className="py-2.5 px-3 text-right">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {savedCrmList.map((rec) => (
                    <tr key={rec.key} className="hover:bg-slate-50">
                      <td className="py-2.5 px-3 font-medium tabular-nums">
                        {formatDateVN(rec.auditDate)}
                      </td>
                      <td className="py-2.5 px-3 font-bold text-slate-900">
                        {rec.facilityName || 'Chưa đặt tên'}
                      </td>
                      <td className="py-2.5 px-3 text-slate-600">{rec.auditorName || '-'}</td>
                      <td className="py-2.5 px-3 text-right tabular-nums">
                        <span className="font-bold text-emerald-700">{rec.summary?.pass ?? 0} Đạt</span>
                        {' / '}
                        <span className="font-bold text-red-600">{rec.summary?.nc ?? 0} NC</span>
                      </td>
                      <td className="py-2.5 px-3 text-right font-extrabold text-[#007c76] tabular-nums">
                        {rec.summary?.compliancePct ?? 0}%
                      </td>
                      <td className="py-2.5 px-3 font-bold text-slate-700">
                        {rec.summary?.rank || '-'}
                      </td>
                      <td className="py-2.5 px-3 text-right space-x-1.5 whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => handleLoadFromCRM(rec.key)}
                          className="px-2.5 py-1 rounded-lg bg-[#007c76] hover:bg-[#005c56] text-white font-bold inline-flex items-center gap-1 cursor-pointer"
                        >
                          <FolderOpen className="w-3.5 h-3.5" />
                          <span>Mở</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteFromCRM(rec.key)}
                          className="px-2.5 py-1 rounded-lg bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 font-bold inline-flex items-center gap-1 cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>Xóa</span>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}

      {/* 1. Audit Metadata Section */}
      <section
        id="supermarket-audit-meta"
        className="bg-white rounded-2xl border border-slate-200 p-5 space-y-4 print:border-none print:p-0"
      >
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h3 className="text-sm font-black uppercase tracking-wide text-[#005c56]">
            1. Thông tin cuộc đánh giá &amp; Cơ sở siêu thị
          </h3>
          <div className="flex flex-wrap items-center gap-2 print:hidden">
            <button
              type="button"
              onClick={handleStartNewAudit}
              className="px-3.5 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-bold text-xs inline-flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Cuộc đánh giá mới</span>
            </button>
            <button
              type="button"
              onClick={handleSaveToCRM}
              className="px-4 py-2 rounded-xl bg-[#007c76] hover:bg-[#005c56] text-white font-extrabold text-xs inline-flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
            >
              <Save className="w-3.5 h-3.5" />
              <span>Lưu biên bản (CRM)</span>
            </button>
          </div>
        </div>

        {/* Print table summary */}
        <table className="hidden print:table w-full border-collapse text-xs">
          <tbody>
            <tr>
              <td className="border border-slate-400 p-1.5 font-bold bg-slate-100">Tên Cơ Sở / Siêu Thị:</td>
              <td className="border border-slate-400 p-1.5 font-bold">{facilityName || '-'}</td>
              <td className="border border-slate-400 p-1.5 font-bold bg-slate-100">Ngày Đánh Giá:</td>
              <td className="border border-slate-400 p-1.5">{formatDateVN(auditDate)}</td>
            </tr>
            <tr>
              <td className="border border-slate-400 p-1.5 font-bold bg-slate-100">Chuyên Gia Đánh Giá:</td>
              <td className="border border-slate-400 p-1.5">{auditorName || '-'}</td>
              <td className="border border-slate-400 p-1.5 font-bold bg-slate-100">Đại Diện Cơ Sở:</td>
              <td className="border border-slate-400 p-1.5">{facilityRep || '-'}</td>
            </tr>
            <tr>
              <td className="border border-slate-400 p-1.5 font-bold bg-slate-100">Địa Chỉ:</td>
              <td className="border border-slate-400 p-1.5">{facilityAddress || '-'}</td>
              <td className="border border-slate-400 p-1.5 font-bold bg-slate-100">Ngành Hàng:</td>
              <td className="border border-slate-400 p-1.5">
                {selectedDepts.length > 0 ? selectedDepts.join(', ') : 'Tất cả 12 ngành hàng'}
              </td>
            </tr>
          </tbody>
        </table>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5 print:hidden">
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-700 block">
              Tên Cơ Sở / Siêu Thị / Cửa Hàng <span className="text-red-600">*</span>
            </label>
            <input
              type="text"
              value={facilityName}
              onChange={(e) => {
                markDirty();
                setFacilityName(e.target.value);
              }}
              placeholder="VD: Siêu thị MM Mega Market An Phú..."
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:bg-white focus:border-[#007c76] outline-none"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-700 block">
              Chuyên Gia Đánh Giá (Lead Auditor)
            </label>
            <input
              type="text"
              value={auditorName}
              onChange={(e) => {
                markDirty();
                setAuditorName(e.target.value);
              }}
              placeholder="Họ tên chuyên gia FAST..."
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:bg-white focus:border-[#007c76] outline-none"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-700 block">
              Đại Diện Cơ Sở Tiếp Đoàn
            </label>
            <input
              type="text"
              value={facilityRep}
              onChange={(e) => {
                markDirty();
                setFacilityRep(e.target.value);
              }}
              placeholder="Quản lý cửa hàng / QA nội bộ..."
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:bg-white focus:border-[#007c76] outline-none"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-700 block">Ngày Đánh Giá</label>
            <input
              type="date"
              value={auditDate}
              onChange={(e) => {
                markDirty();
                setAuditDate(e.target.value);
              }}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium tabular-nums focus:bg-white focus:border-[#007c76] outline-none"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-700 block">Địa Chỉ Cơ Sở</label>
            <input
              type="text"
              value={facilityAddress}
              onChange={(e) => {
                markDirty();
                setFacilityAddress(e.target.value);
              }}
              placeholder="Số nhà, đường, quận/huyện, tỉnh/TP..."
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:bg-white focus:border-[#007c76] outline-none"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-700 block">Hình Thức Đánh Giá</label>
            <select
              value={auditType}
              onChange={(e) => {
                markDirty();
                setAuditType(e.target.value);
              }}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:bg-white focus:border-[#007c76] outline-none"
            >
              {AUDIT_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>
        </div>
      </section>

      {/* 2. Department Filter (12 Departments) */}
      <section className="bg-slate-50/80 rounded-2xl border border-slate-200 p-5 space-y-2.5 print:hidden">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-sm font-black uppercase tracking-wide text-[#005c56]">
            2. Chọn Ngành Hàng / Bộ Phận Đánh Giá (12 Departments)
          </h3>
          <span className="text-xs text-slate-500">
            Bấm chọn 1 hoặc nhiều ngành hàng để lọc các điểm kiểm soát tương ứng
          </span>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => handleToggleDept('ALL')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition cursor-pointer whitespace-nowrap ${
              selectedDepts.length === 0
                ? 'bg-[#005c56] text-white border-[#005c56]'
                : 'bg-white text-slate-700 border-slate-200 hover:border-[#007c76]'
            }`}
          >
            {selectedDepts.length === 0 ? '✓ ' : ''}Tất cả (12 ngành hàng)
          </button>

          {SUPERMARKET_DEPARTMENTS.map((dept) => {
            const isSelected = selectedDepts.includes(dept);
            return (
              <button
                key={dept}
                type="button"
                onClick={() => handleToggleDept(dept)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition cursor-pointer whitespace-nowrap ${
                  isSelected
                    ? 'bg-[#007c76] text-white border-[#005c56]'
                    : 'bg-white text-slate-700 border-slate-200 hover:border-[#007c76] hover:bg-teal-50/60'
                }`}
              >
                {isSelected ? '✓ ' : ''}
                {dept}
              </button>
            );
          })}
        </div>
      </section>

      {/* 3. KPI Summary Strip (5 cards, clean single-level hairline borders) */}
      <section className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <div className="bg-white rounded-2xl border border-slate-200 p-4 space-y-1">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block">
            Tổng Điểm Kiểm Soát
          </span>
          <div className="flex items-baseline gap-1.5">
            <span className="text-2xl font-black text-[#005c56] tabular-nums">{kpi.total}</span>
            <span className="text-xs text-slate-500">tiêu chí</span>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-4 space-y-1">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block">
            Số Mục Đạt (Pass)
          </span>
          <div className="flex items-baseline gap-1.5">
            <span className="text-2xl font-black text-emerald-700 tabular-nums">{kpi.pass}</span>
            <span className="text-xs text-slate-500">đạt chuẩn</span>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-4 space-y-1">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block">
            Số Lỗi NC Phát Hiện
          </span>
          <div className="flex items-baseline gap-1.5">
            <span className="text-2xl font-black text-red-600 tabular-nums">{kpi.nc}</span>
            <span className="text-xs text-slate-500">không phù hợp</span>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-4 space-y-1">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block">
            Điểm Tuân Thủ (%)
          </span>
          <div className="flex items-baseline gap-1.5">
            <span className="text-2xl font-black text-sky-700 tabular-nums">
              {kpi.compliancePct}%
            </span>
            <span className="text-[11px] text-slate-500 tabular-nums">
              ({kpi.evaluated}/{kpi.total})
            </span>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-4 space-y-1 col-span-2 md:col-span-1">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block">
            Xếp Loại Đánh Giá
          </span>
          <span className={`text-sm font-black block pt-1 ${kpi.rankColor}`}>{kpi.rank}</span>
        </div>
      </section>

      {/* 4. Progress & Action Toolbar */}
      <section className="bg-white rounded-2xl border border-slate-200 p-4 space-y-3 print:hidden">
        <div className="flex flex-wrap items-center justify-between gap-2 text-xs font-bold">
          <span className="text-[#005c56] tabular-nums">
            Tiến độ kiểm tra thực địa: {kpi.evaluated} / {kpi.total} tiêu chí ({kpi.progressPct}%)
          </span>
          <span className="text-emerald-700 tabular-nums">
            Tỷ lệ tuân thủ: {kpi.compliancePct}% · Đạt: {kpi.pass} · Lỗi NC: {kpi.nc}
          </span>
        </div>

        <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-[#007c76] to-emerald-600 transition-all duration-300"
            style={{ width: `${kpi.progressPct}%` }}
          />
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
          <div className="relative flex-1 min-w-[230px] max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Tìm mã tiêu chí, điều kiện lỗi, bằng chứng, CAPA..."
              className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:bg-white focus:border-[#007c76] outline-none"
            />
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            {(
              [
                { id: 'ALL', label: 'Tất cả' },
                { id: 'UNRATED', label: 'Chưa chấm' },
                { id: 'PASS', label: 'Đạt (Pass)' },
                { id: 'NC', label: 'Lỗi (NC)' },
                { id: 'NA', label: 'N/A' },
              ] as const
            ).map((chip) => (
              <button
                key={chip.id}
                type="button"
                onClick={() => setStatusFilter(chip.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition cursor-pointer whitespace-nowrap ${
                  statusFilter === chip.id
                    ? 'bg-[#005c56] text-white border-[#005c56]'
                    : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                }`}
              >
                {chip.label}
              </button>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handleExportExcel}
              className="px-3.5 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Xuất Excel (CAPA)</span>
            </button>

            <button
              type="button"
              onClick={handleCopyNCSummaryZalo}
              className="px-3.5 py-2 rounded-xl bg-sky-700 hover:bg-sky-800 text-white text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
            >
              <Copy className="w-3.5 h-3.5" />
              <span>Sao chép Lỗi Zalo</span>
            </button>

            <button
              type="button"
              onClick={() => handlePrint(true)}
              className="px-3.5 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
            >
              <FileWarning className="w-3.5 h-3.5" />
              <span>In Phiếu Lỗi NC</span>
            </button>

            <button
              type="button"
              onClick={() => handlePrint(false)}
              className="px-3.5 py-2 rounded-xl bg-[#007c76] hover:bg-[#005c56] text-white text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>In Toàn Bộ (PDF)</span>
            </button>
          </div>
        </div>
      </section>

      {/* 5. 08 Areas Accordions */}
      <section className="space-y-4">
        {SUPERMARKET_AUDIT_AREAS.map((area) => {
          const deptApplicable = area.items.filter(isItemApplicable);
          if (deptApplicable.length === 0) return null;

          let areaPass = 0;
          let areaNC = 0;
          deptApplicable.forEach((it) => {
            const st = records[it.code]?.status;
            if (st === 'PASS') areaPass++;
            else if (st === 'NC') areaNC++;
          });

          const visibleItems = deptApplicable.filter((it) => {
            const rec = records[it.code] || {};
            const st = rec.status || 'UNRATED';
            if (statusFilter !== 'ALL' && st !== statusFilter) return false;
            if (normalizedQuery) {
              const haystack = `${it.code} ${area.name} ${it.criteria} ${it.condition} ${it.detail} ${
                rec.evidence || ''
              } ${rec.capa || ''}`.toLowerCase();
              if (!haystack.includes(normalizedQuery)) return false;
            }
            return true;
          });

          if (visibleItems.length === 0) return null;

          const isOpen =
            openAreas.includes(area.id) || normalizedQuery !== '' || statusFilter !== 'ALL';

          if (printMode === 'nc' && areaNC === 0) {
            return null;
          }

          let lastCriteria = '';

          return (
            <div
              key={area.id}
              className={`bg-white rounded-2xl border border-slate-200 overflow-hidden ${
                areaNC === 0 ? 'no-nc-area' : ''
              }`}
            >
              {/* Area Accordion Header */}
              <div
                onClick={() => handleToggleArea(area.id)}
                className={`px-4 sm:px-5 py-3.5 flex flex-wrap items-center justify-between gap-3 cursor-pointer select-none border-b ${
                  isOpen ? 'bg-teal-50/70 border-slate-200' : 'bg-slate-50/70 border-transparent'
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <span className="w-7 h-7 rounded-lg bg-[#007c76] text-white font-black text-xs flex items-center justify-center shrink-0 tabular-nums">
                    {area.id}
                  </span>
                  <h4 className="font-black text-sm text-[#005c56] uppercase tracking-tight">
                    {area.name}
                  </h4>
                </div>

                <div
                  className="flex flex-wrap items-center gap-3 text-xs tabular-nums"
                  onClick={(e) => e.stopPropagation()}
                >
                  <span className="font-bold text-emerald-700">Đạt: {areaPass}</span>
                  <span className="text-slate-300" aria-hidden="true">
                    ·
                  </span>
                  <span className="font-bold text-red-600">Lỗi NC: {areaNC}</span>
                  <span className="text-slate-300" aria-hidden="true">
                    ·
                  </span>
                  <span className="font-semibold text-slate-600">
                    Tổng: {deptApplicable.length}
                  </span>

                  <button
                    type="button"
                    onClick={() => handleBatchPassArea(area.id)}
                    className="px-2.5 py-1 rounded-lg border border-emerald-200 bg-white hover:bg-emerald-700 hover:text-white text-emerald-700 font-bold text-[11px] transition cursor-pointer whitespace-nowrap print:hidden"
                  >
                    ✓ Đạt phần còn lại
                  </button>

                  <button
                    type="button"
                    onClick={() => handleToggleArea(area.id)}
                    aria-label={isOpen ? 'Thu gọn khu vực' : 'Mở rộng khu vực'}
                    className="p-1 text-[#005c56] cursor-pointer print:hidden"
                  >
                    <ChevronDown
                      className={`w-4 h-4 transition-transform duration-200 ${
                        isOpen ? 'rotate-180' : ''
                      }`}
                    />
                  </button>
                </div>
              </div>

              {/* Area Content */}
              {isOpen && (
                <div className="divide-y divide-slate-100">
                  {visibleItems.map((item) => {
                    const showCriteriaHeader = item.criteria !== lastCriteria;
                    lastCriteria = item.criteria;
                    const rec = records[item.code] || {};
                    const st = rec.status;
                    const isNC = st === 'NC';

                    return (
                      <React.Fragment key={item.code}>
                        {showCriteriaHeader && (
                          <div className="px-5 py-2 bg-slate-50 text-xs font-extrabold text-[#005c56] border-t border-slate-100 first:border-t-0">
                            Tiêu chí kiểm soát: {item.criteria}
                          </div>
                        )}

                        <div
                          className={`p-4 sm:px-5 transition-colors ${
                            st === 'PASS'
                              ? 'bg-emerald-50/40'
                              : isNC
                              ? 'bg-red-50/50'
                              : st === 'NA'
                              ? 'bg-slate-50/70 opacity-80'
                              : 'bg-white'
                          }`}
                        >
                          <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                            <div className="space-y-1.5 flex-1 min-w-0">
                              <div className="flex flex-wrap items-baseline gap-2">
                                <span className="font-mono text-xs font-extrabold text-[#005c56] tabular-nums">
                                  {item.code}
                                </span>
                                <span className="text-slate-300" aria-hidden="true">
                                  ·
                                </span>
                                <span className="text-sm font-bold text-slate-900">
                                  {item.condition}
                                </span>
                              </div>
                              <p className="text-xs text-slate-600 leading-relaxed">{item.detail}</p>
                              <div className="text-[11px] text-slate-500 pt-0.5 leading-relaxed print:hidden">
                                <span className="font-semibold text-slate-600">Ngành hàng: </span>
                                {item.depts.map((d, i) => (
                                  <React.Fragment key={d}>
                                    {i > 0 && (
                                      <span className="text-slate-300 mx-1" aria-hidden="true">
                                        ·
                                      </span>
                                    )}
                                    <span
                                      className={
                                        selectedDepts.includes(d)
                                          ? 'font-bold text-[#007c76]'
                                          : 'text-slate-500'
                                      }
                                    >
                                      {d}
                                    </span>
                                  </React.Fragment>
                                ))}
                              </div>
                            </div>

                            {/* Touch-friendly 3 Score Buttons */}
                            <div className="flex items-center gap-1.5 shrink-0">
                              <button
                                type="button"
                                onClick={() => handleSetItemStatus(item.code, 'PASS')}
                                className={`min-h-[40px] min-w-[78px] px-3 py-2 rounded-lg text-xs font-bold border transition inline-flex items-center justify-center gap-1 cursor-pointer whitespace-nowrap ${
                                  st === 'PASS'
                                    ? 'bg-emerald-700 text-white border-emerald-800'
                                    : 'bg-white text-slate-700 border-slate-200 hover:border-emerald-600 hover:text-emerald-700'
                                }`}
                              >
                                <Check className="w-3.5 h-3.5" />
                                <span>Đạt</span>
                              </button>

                              <button
                                type="button"
                                onClick={() => handleSetItemStatus(item.code, 'NC')}
                                className={`min-h-[40px] min-w-[84px] px-3 py-2 rounded-lg text-xs font-bold border transition inline-flex items-center justify-center gap-1 cursor-pointer whitespace-nowrap ${
                                  isNC
                                    ? 'bg-red-600 text-white border-red-700'
                                    : 'bg-white text-slate-700 border-slate-200 hover:border-red-600 hover:text-red-600'
                                }`}
                              >
                                <X className="w-3.5 h-3.5" />
                                <span>Lỗi (NC)</span>
                              </button>

                              <button
                                type="button"
                                onClick={() => handleSetItemStatus(item.code, 'NA')}
                                className={`min-h-[40px] min-w-[68px] px-3 py-2 rounded-lg text-xs font-bold border transition inline-flex items-center justify-center gap-1 cursor-pointer whitespace-nowrap ${
                                  st === 'NA'
                                    ? 'bg-slate-600 text-white border-slate-700'
                                    : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100'
                                }`}
                              >
                                <Minus className="w-3.5 h-3.5" />
                                <span>N/A</span>
                              </button>
                            </div>
                          </div>

                          {/* NC & CAPA Drawer */}
                          {isNC && (
                            <div className="mt-3 p-3.5 rounded-xl bg-white border border-red-200 space-y-3">
                              <div className="flex items-center gap-2 text-xs font-black text-red-700 uppercase tracking-wide">
                                <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                                <span>
                                  Ghi nhận Lỗi Không Phù Hợp (NC) &amp; Kế hoạch khắc phục (CAPA)
                                </span>
                              </div>

                              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                                <div className="space-y-1">
                                  <label className="text-[11px] font-bold text-slate-700 block">
                                    Bằng chứng / Vị trí lỗi <span className="text-red-600">*</span>
                                  </label>
                                  <input
                                    type="text"
                                    value={rec.evidence || ''}
                                    onChange={(e) =>
                                      handleUpdateNCField(item.code, 'evidence', e.target.value)
                                    }
                                    placeholder="VD: Quầy thịt số 2 có 3 khay rỉ dịch..."
                                    className="w-full px-3 py-2 bg-red-50/40 border border-red-200 rounded-lg text-xs text-slate-800 focus:bg-white focus:border-red-500 outline-none"
                                  />
                                </div>

                                <div className="space-y-1">
                                  <label className="text-[11px] font-bold text-slate-700 block">
                                    Hành động khắc phục (CAPA){' '}
                                    <span className="text-red-600">*</span>
                                  </label>
                                  <input
                                    type="text"
                                    value={rec.capa || ''}
                                    onChange={(e) =>
                                      handleUpdateNCField(item.code, 'capa', e.target.value)
                                    }
                                    placeholder="VD: Thu hồi khay, vệ sinh khử trùng..."
                                    className="w-full px-3 py-2 bg-red-50/40 border border-red-200 rounded-lg text-xs text-slate-800 focus:bg-white focus:border-red-500 outline-none"
                                  />
                                </div>

                                <div className="space-y-1">
                                  <label className="text-[11px] font-bold text-slate-700 block">
                                    Mức độ vi phạm
                                  </label>
                                  <select
                                    value={rec.severity || 'Major (Lỗi nặng)'}
                                    onChange={(e) =>
                                      handleUpdateNCField(item.code, 'severity', e.target.value)
                                    }
                                    className="w-full px-3 py-2 bg-red-50/40 border border-red-200 rounded-lg text-xs font-semibold text-slate-800 focus:bg-white focus:border-red-500 outline-none"
                                  >
                                    <option value="Minor (Lỗi nhẹ)">Minor (Lỗi nhẹ)</option>
                                    <option value="Major (Lỗi nặng)">Major (Lỗi nặng)</option>
                                    <option value="Critical (Nghiêm trọng)">
                                      Critical (Nghiêm trọng - Xử lý ngay)
                                    </option>
                                  </select>
                                </div>

                                <div className="space-y-1">
                                  <label className="text-[11px] font-bold text-slate-700 block">
                                    Thời hạn hoàn thành
                                  </label>
                                  <input
                                    type="date"
                                    value={rec.deadline || ''}
                                    onChange={(e) =>
                                      handleUpdateNCField(item.code, 'deadline', e.target.value)
                                    }
                                    className="w-full px-3 py-2 bg-red-50/40 border border-red-200 rounded-lg text-xs tabular-nums text-slate-800 focus:bg-white focus:border-red-500 outline-none"
                                  />
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      </React.Fragment>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </section>

      {/* In-Page Confirm Modal (no window.confirm) */}
      {confirmDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/65 backdrop-blur-xs">
          <div
            ref={confirmModalRef}
            className="bg-white rounded-2xl max-w-md w-full p-6 border border-slate-200 shadow-xl space-y-4"
          >
            <h4 className="text-base font-black text-slate-900">{confirmDialog.title}</h4>
            <p className="text-xs text-slate-600 leading-relaxed">{confirmDialog.message}</p>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setConfirmDialog(null)}
                className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50 cursor-pointer"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={confirmDialog.onConfirm}
                className="px-4 py-2 rounded-xl bg-[#007c76] hover:bg-[#005c56] text-white text-xs font-extrabold cursor-pointer"
              >
                Xác nhận
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FastSupermarketHygieneAudit;
