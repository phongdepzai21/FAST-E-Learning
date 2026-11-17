import React, { useState, useEffect } from 'react';
import { collection, onSnapshot } from 'firebase/firestore';
import { db, auth } from '../firebase';
import {
  Calendar,
  MapPin,
  Video,
  FileText,
  ExternalLink,
  Users,
  Copy,
  Check,
  Clock,
  Phone,
} from 'lucide-react';
import { toTenDigitId } from '../utils/idGenerator';
import { ReceiptModal, ReceiptData } from './ReceiptModal';
import { useToast } from '../contexts/ToastContext';
import { getPreClassPreparationMeta } from '../utils/courseNotificationService';

export const MyTrainingRegistrationsView: React.FC<{ userEmail?: string | null }> = ({
  userEmail,
}) => {
  const toast = useToast();
  const [registrations, setRegistrations] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedReceipt, setSelectedReceipt] = useState<Partial<ReceiptData> | null>(null);
  const [isReceiptModalOpen, setIsReceiptModalOpen] = useState(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  useEffect(() => {
    const email = (userEmail || auth.currentUser?.email || '').toLowerCase().trim();
    const uid = auth.currentUser?.uid;

    if (!email && !uid) {
      setIsLoading(false);
      return;
    }

    const fsMap = new Map<string, any>();
    const apiMap = new Map<string, any>();

    const syncCombined = () => {
      const merged = new Map<string, any>();
      apiMap.forEach((v, k) => merged.set(k, v));
      fsMap.forEach((v, k) => merged.set(k, { ...(merged.get(k) || {}), ...v }));
      const list = Array.from(merged.values()).sort(
        (a, b) => new Date(b.registeredAt || 0).getTime() - new Date(a.registeredAt || 0).getTime()
      );
      setRegistrations(list);
      setIsLoading(false);
    };

    const matchesUser = (data: any) => {
      const matchEmail = email && data.email && String(data.email).toLowerCase().trim() === email;
      const matchUserEmail =
        email && data.userEmail && String(data.userEmail).toLowerCase().trim() === email;
      const matchStudentEmail =
        email && data.studentEmail && String(data.studentEmail).toLowerCase().trim() === email;
      const matchUid = uid && data.userId === uid;
      return Boolean(matchEmail || matchUserEmail || matchStudentEmail || matchUid);
    };

    fetch('/api/direct-registrations')
      .then((res) => res.json())
      .then((data) => {
        if (data?.success && Array.isArray(data.records)) {
          data.records.forEach((rec: any) => {
            if (rec && rec.id && matchesUser(rec)) {
              apiMap.set(rec.id, rec);
            }
          });
          syncCombined();
        }
      })
      .catch(() => {});

    let unsub = () => {};
    try {
      unsub = onSnapshot(
        collection(db, 'live_course_registrations'),
        (snapshot) => {
          fsMap.clear();
          snapshot.forEach((docSnap) => {
            const data = docSnap.data();
            if (matchesUser(data)) {
              fsMap.set(docSnap.id, { id: docSnap.id, ...data });
            }
          });
          syncCombined();
        },
        (err) => {
          console.warn('Lỗi đọc live_course_registrations học viên:', err);
          setIsLoading(false);
        }
      );
    } catch {
      setIsLoading(false);
    }

    return () => unsub();
  }, [userEmail]);

  const handleCopyValue = (key: string, value: string, label: string) => {
    navigator.clipboard.writeText(value);
    setCopiedKey(key);
    toast.showToast(label, 'success');
    setTimeout(() => setCopiedKey(null), 2000);
  };

  if (isLoading) {
    return (
      <div className="bg-white rounded-3xl p-8 border border-slate-200 text-center space-y-3">
        <div className="w-8 h-8 border-2 border-[#007c76] border-t-transparent rounded-full animate-spin mx-auto" />
        <p className="text-xs text-slate-500 font-semibold">
          Đang tải danh sách lịch học Hội trường &amp; Zoom...
        </p>
      </div>
    );
  }

  if (registrations.length === 0) {
    return null;
  }

  const handleViewReceipt = (reg: any) => {
    const numericPrice =
      typeof reg.totalNumericPrice === 'number'
        ? reg.totalNumericPrice
        : parseInt((reg.totalPrice || reg.price || '299000').replace(/[^\d]/g, ''), 10) ||
          299000;
    const paidTimestamp =
      reg.webhookReceivedAt || reg.paidAt || reg.registeredAt || new Date().toISOString();

    setSelectedReceipt({
      receiptNo: toTenDigitId(reg.id),
      paymentCode: reg.paymentCode || reg.paymentMemo || '',
      transactionId: reg.transactionId || '',
      studentName: reg.studentName || 'Học viên FAST',
      phone: reg.phone || '',
      email: reg.userEmail || reg.email || '',
      companyName: reg.companyName || '',
      courseTitle: reg.courseTitle || 'Khóa đào tạo',
      trainingType:
        reg.trainingTypeLabel ||
        (reg.trainingType === 'zoom' ? 'Trực tuyến Zoom' : 'Trực tiếp Hội trường'),
      amount: numericPrice,
      participantCount: Number(reg.participantCount) || 1,
      paidAt: paidTimestamp,
      webhookReceivedAt: reg.webhookReceivedAt || paidTimestamp,
      issueDate: paidTimestamp.slice(0, 10),
      paymentMethod:
        reg.paymentMethod || 'Chuyển khoản VietQR (SePay · ACB 0989499568)',
      status:
        reg.paymentStatus === 'PAID' ||
        reg.status === 'confirmed' ||
        reg.status === 'completed'
          ? 'Đã thanh toán'
          : 'Chờ xác nhận',
    });
    setIsReceiptModalOpen(true);
  };

  return (
    <section className="bg-white rounded-3xl p-6 sm:p-8 border border-stone-200 shadow-xs space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-stone-200 pb-5">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#9A7B3E]">
            Hồ sơ tham dự · Hội trường &amp; Trực tuyến
          </p>
          <h3 className="font-luxury-serif text-2xl sm:text-[26px] font-bold text-[#0B1F1E] tracking-tight mt-1">
            Lịch khóa đào tạo đã đăng ký ({registrations.length})
          </h3>
        </div>
        <a
          href="https://zalo.me/0927002668"
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-2 px-4 py-2 bg-[#0B1F1E] hover:bg-[#123331] text-[#D4B475] rounded-xl text-xs font-bold tracking-wide transition-colors border border-[#D4B475]/30 self-start sm:self-auto"
        >
          <Phone className="w-3.5 h-3.5" />
          <span>Điều phối viên học vụ (Zalo)</span>
          <ExternalLink className="w-3 h-3" />
        </a>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
        {registrations.map((reg) => {
          const classLink = reg.meetingLink || reg.zoomLink || '';
          const prepMeta = getPreClassPreparationMeta({
            courseTitle: reg.courseTitle,
            registrationId: reg.id,
            startDate: reg.startDate,
            scheduleDetails: reg.scheduleDetails,
            venueAddress: reg.venueAddress,
            trainingType: reg.trainingType,
            trainingTypeLabel: reg.trainingTypeLabel,
            link: classLink,
          });
          const statusLabel =
            reg.status === 'confirmed'
              ? 'Đã xếp chỗ chính thức'
              : reg.status === 'completed'
                ? 'Đã hoàn thành'
                : 'Đã ghi nhận đăng ký';

          return (
            <div
              key={reg.id}
              className={`rounded-2xl overflow-hidden border flex flex-col justify-between ${
                prepMeta.isOffline
                  ? 'bg-white border-stone-200'
                  : 'bg-white border-slate-200'
              }`}
            >
              {/* Executive Invitation Header */}
              <div
                className={`px-5 py-4 border-b ${
                  prepMeta.isOffline
                    ? 'bg-[#0B1F1E] text-white border-[#D4B475]/30'
                    : 'bg-slate-50 text-slate-900 border-slate-200'
                }`}
              >
                <div className="flex items-center justify-between gap-3 text-[11px] font-bold uppercase tracking-[0.14em]">
                  <span
                    className={
                      prepMeta.isOffline ? 'text-[#D4B475]' : 'text-[#007c76]'
                    }
                  >
                    {prepMeta.badgeLabel}
                  </span>
                  <span
                    className={`font-mono tabular-nums ${
                      prepMeta.isOffline ? 'text-stone-300' : 'text-slate-500'
                    }`}
                  >
                    #{toTenDigitId(reg.id)}
                  </span>
                </div>

                <h4
                  className={`mt-2 text-lg leading-snug break-words [overflow-wrap:break-word] ${
                    prepMeta.isOffline
                      ? 'font-luxury-serif font-semibold text-white'
                      : 'font-bold text-slate-900'
                  }`}
                >
                  {reg.courseTitle}
                </h4>

                <div
                  className={`mt-2 text-xs flex flex-wrap items-center gap-x-2 gap-y-1 ${
                    prepMeta.isOffline ? 'text-stone-300' : 'text-slate-600'
                  }`}
                >
                  <span
                    className={
                      prepMeta.isOffline
                        ? 'text-[#D4B475] font-semibold'
                        : 'text-emerald-700 font-semibold'
                    }
                  >
                    {statusLabel}
                  </span>
                  <span>·</span>
                  <span>{prepMeta.formatLabel}</span>
                  <span>·</span>
                  <span className="inline-flex items-center gap-1 tabular-nums">
                    <Users className="w-3.5 h-3.5" />
                    {reg.participantCount || 1} học viên
                  </span>
                </div>
              </div>

              {/* Body Details */}
              <div className="p-5 space-y-4 flex-1 flex flex-col justify-between">
                <div className="space-y-4">
                  {/* Schedule & Venue Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pb-4 border-b border-stone-200/80 text-xs">
                    <div className="space-y-1.5">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-stone-500 block">
                        Ngày &amp; Giờ đào tạo ấn định
                      </span>
                      <p className="font-bold text-slate-900 flex items-center gap-1.5 tabular-nums">
                        <Calendar className="w-3.5 h-3.5 text-[#9A7B3E] shrink-0" />
                        <span>{prepMeta.specificDateLabel}</span>
                      </p>
                      <p className="text-slate-700 font-semibold flex items-center gap-1.5 pl-5 tabular-nums">
                        <Clock className="w-3.5 h-3.5 text-[#9A7B3E] shrink-0" />
                        <span>{prepMeta.timeWindowLabel}</span>
                      </p>
                    </div>

                    <div className="space-y-1.5">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-stone-500 block">
                        {prepMeta.isOffline ? 'Địa điểm hội trường' : 'Phòng học trực tuyến'}
                      </span>
                      <p className="font-semibold text-slate-900 flex items-start gap-1.5 leading-relaxed">
                        {prepMeta.isOffline ? (
                          <MapPin className="w-3.5 h-3.5 text-[#9A7B3E] shrink-0 mt-0.5" />
                        ) : (
                          <Video className="w-3.5 h-3.5 text-[#007c76] shrink-0 mt-0.5" />
                        )}
                        <span>{prepMeta.venueAddress}</span>
                      </p>
                    </div>
                  </div>

                  {/* Check-in & Numbered Preparation */}
                  <div className="space-y-2.5 text-xs">
                    <div className="flex items-start gap-2 text-slate-800 font-semibold leading-relaxed">
                      <Clock
                        className={`w-4 h-4 shrink-0 mt-0.5 ${
                          prepMeta.isOffline ? 'text-[#9A7B3E]' : 'text-[#007c76]'
                        }`}
                      />
                      <span>{prepMeta.checkInTime}</span>
                    </div>

                    {prepMeta.isOffline && prepMeta.hospitalityNote && (
                      <p className="text-[11px] text-stone-600 pl-6 leading-relaxed">
                        {prepMeta.hospitalityNote}
                      </p>
                    )}

                    <ol className="space-y-1.5 pt-1 text-[11px] text-slate-600">
                      {prepMeta.checklist.slice(0, 3).map((item: string, idx: number) => (
                        <li key={idx} className="flex items-start gap-2.5 leading-relaxed">
                          <span
                            className={`font-mono font-bold tabular-nums shrink-0 ${
                              prepMeta.isOffline ? 'text-[#9A7B3E]' : 'text-[#007c76]'
                            }`}
                          >
                            0{idx + 1}
                          </span>
                          <span>{item}</span>
                        </li>
                      ))}
                    </ol>
                  </div>
                </div>

                {/* Action Strip & Receipt */}
                <div className="pt-4 border-t border-stone-200/80 space-y-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <a
                      href={prepMeta.actionLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-colors ${
                        prepMeta.isOffline
                          ? 'bg-[#0B1F1E] text-[#D4B475] hover:bg-[#133533]'
                          : 'bg-[#007c76] text-white hover:bg-[#005c56]'
                      }`}
                    >
                      {prepMeta.isOffline ? (
                        <MapPin className="w-3.5 h-3.5" />
                      ) : (
                        <Video className="w-3.5 h-3.5" />
                      )}
                      <span>{prepMeta.actionLabel}</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>

                    <button
                      type="button"
                      onClick={() =>
                        handleCopyValue(
                          `${reg.id}_loc`,
                          prepMeta.isOffline ? prepMeta.venueAddress : prepMeta.actionLink,
                          prepMeta.isOffline
                            ? 'Đã sao chép địa chỉ hội trường!'
                            : 'Đã sao chép link tham gia Zoom!'
                        )
                      }
                      className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-stone-200 bg-white hover:bg-stone-50 text-xs font-semibold text-slate-700 transition-colors cursor-pointer"
                    >
                      {copiedKey === `${reg.id}_loc` ? (
                        <Check className="w-3.5 h-3.5 text-emerald-600" />
                      ) : (
                        <Copy className="w-3.5 h-3.5 text-slate-500" />
                      )}
                      <span>
                        {copiedKey === `${reg.id}_loc`
                          ? 'Đã sao chép'
                          : prepMeta.isOffline
                            ? 'Sao chép địa chỉ'
                            : 'Sao chép link'}
                      </span>
                    </button>
                  </div>

                  <div className="flex items-center justify-between pt-2">
                    <div className="text-xs tabular-nums">
                      <span className="text-stone-500 font-semibold block text-[10px] uppercase tracking-wider">
                        Tổng học phí đã ghi nhận
                      </span>
                      <strong className="text-slate-900 font-black text-sm">
                        {reg.totalPrice || reg.price}
                      </strong>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleViewReceipt(reg)}
                      className="px-3.5 py-2 bg-stone-50 hover:bg-stone-100 text-slate-800 rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 cursor-pointer border border-stone-200"
                    >
                      <FileText className="w-3.5 h-3.5 text-[#007c76]" />
                      <span>Xem biên lai</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <ReceiptModal
        isOpen={isReceiptModalOpen}
        onClose={() => setIsReceiptModalOpen(false)}
        initialData={selectedReceipt}
        readOnly={true}
      />
    </section>
  );
};

export default MyTrainingRegistrationsView;
