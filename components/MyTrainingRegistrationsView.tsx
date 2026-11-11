import React, { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db, auth } from '../firebase';
import { Calendar, MapPin, Video, CheckCircle2, Clock, FileText, Sparkles, ExternalLink, Users } from 'lucide-react';
import { toTenDigitId } from '../utils/idGenerator';
import { ReceiptModal, ReceiptData } from './ReceiptModal';

export const MyTrainingRegistrationsView: React.FC<{ userEmail?: string | null }> = ({ userEmail }) => {
  const [registrations, setRegistrations] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedReceipt, setSelectedReceipt] = useState<Partial<ReceiptData> | null>(null);
  const [isReceiptModalOpen, setIsReceiptModalOpen] = useState(false);

  useEffect(() => {
    const email = userEmail || auth.currentUser?.email;
    const uid = auth.currentUser?.uid;

    if (!email && !uid) {
      setIsLoading(false);
      return;
    }

    let unsub = () => {};
    try {
      unsub = onSnapshot(collection(db, 'live_course_registrations'), (snapshot) => {
        const list: any[] = [];
        snapshot.forEach((docSnap) => {
          const data = docSnap.data();
          const matchEmail = email && data.email && data.email.toLowerCase() === email.toLowerCase();
          const matchUserEmail = email && data.userEmail && data.userEmail.toLowerCase() === email.toLowerCase();
          const matchUid = uid && data.userId === uid;

          if (matchEmail || matchUserEmail || matchUid) {
            list.push({ id: docSnap.id, ...data });
          }
        });
        setRegistrations(list.sort((a, b) => new Date(b.registeredAt || 0).getTime() - new Date(a.registeredAt || 0).getTime()));
        setIsLoading(false);
      }, (err) => {
        console.warn('Lỗi đọc live_course_registrations học viên:', err);
        setIsLoading(false);
      });
    } catch (e) {
      setIsLoading(false);
    }

    return () => unsub();
  }, [userEmail]);

  if (isLoading) {
    return (
      <div className="bg-white rounded-3xl p-8 border border-slate-200 text-center space-y-3">
        <div className="w-8 h-8 border-3 border-[#007c76] border-t-transparent rounded-full animate-spin mx-auto"></div>
        <p className="text-xs text-slate-500 font-bold">Đang tải danh sách lịch học Zoom / Trực tiếp...</p>
      </div>
    );
  }

  if (registrations.length === 0) {
    return null; // Keep clean if user hasn't registered for live training
  }

  const handleViewReceipt = (reg: any) => {
    const numericPrice = typeof reg.totalNumericPrice === 'number'
      ? reg.totalNumericPrice
      : parseInt((reg.totalPrice || reg.price || '299000').replace(/[^\d]/g, ''), 10) || 299000;

    setSelectedReceipt({
      receiptNo: toTenDigitId(reg.id),
      studentName: reg.studentName || 'Học viên FAST',
      phone: reg.phone || '',
      email: reg.email || '',
      companyName: reg.companyName || '',
      courseTitle: reg.courseTitle || 'Khóa đào tạo',
      trainingType: reg.trainingTypeLabel || (reg.trainingType === 'zoom' ? 'Trực tuyến Zoom' : 'Trực tiếp Hội trường'),
      amount: numericPrice,
      issueDate: new Date(reg.registeredAt || Date.now()).toISOString().slice(0, 10),
      paymentMethod: 'Chuyển khoản VietQR',
      status: reg.status === 'confirmed' || reg.status === 'completed' ? 'Đã thanh toán' : 'Chờ xác nhận'
    });
    setIsReceiptModalOpen(true);
  };

  return (
    <section className="bg-gradient-to-br from-[#007c76]/5 via-white to-[#007c76]/10 rounded-3xl p-6 sm:p-8 border border-[#007c76]/20 shadow-sm space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200/80 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-[#007c76] animate-pulse"></span>
            <span className="text-[10px] font-black uppercase tracking-widest text-[#007c76]">
              Lịch Học Trực Tiếp &amp; Zoom Đã Đăng Ký
            </span>
          </div>
          <h3 className="text-xl sm:text-2xl font-black text-slate-900 uppercase tracking-tight mt-1">
            Khóa Đào Tạo Của Tôi ({registrations.length})
          </h3>
        </div>
        <a
          href="https://zalo.me/0927002668"
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black uppercase tracking-wider transition shadow-sm"
        >
          <span>Hỗ trợ Zalo học vụ</span>
          <ExternalLink className="w-3.5 h-3.5" />
        </a>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {registrations.map((reg) => (
          <div
            key={reg.id}
            className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs hover:border-[#007c76] transition-all space-y-4"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="space-y-1">
                <span className="text-[10px] font-mono font-black text-slate-400 block">
                  MÃ HỒ SƠ: #{toTenDigitId(reg.id)}
                </span>
                <h4 className="font-black text-base text-slate-900 line-clamp-2">
                  {reg.courseTitle}
                </h4>
              </div>

              <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase shrink-0 ${
                reg.status === 'confirmed' || reg.status === 'completed'
                  ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                  : 'bg-amber-100 text-amber-900 border border-amber-200'
              }`}>
                {reg.status === 'confirmed' ? 'Đã xếp lớp' : reg.status === 'completed' ? 'Hoàn thành' : 'Đã đăng ký'}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs bg-slate-50 p-3 rounded-xl border border-slate-100">
              <div className="space-y-0.5">
                <span className="text-[10px] text-slate-400 font-bold uppercase block">Hình thức học</span>
                <span className="font-bold text-slate-800 flex items-center gap-1">
                  {reg.trainingType === 'zoom' ? <Video className="w-3.5 h-3.5 text-blue-600" /> : <MapPin className="w-3.5 h-3.5 text-amber-600" />}
                  {reg.trainingTypeLabel || (reg.trainingType === 'zoom' ? 'Zoom HD' : 'Trực tiếp')}
                </span>
              </div>

              <div className="space-y-0.5">
                <span className="text-[10px] text-slate-400 font-bold uppercase block">Số học viên</span>
                <span className="font-bold text-slate-800 flex items-center gap-1">
                  <Users className="w-3.5 h-3.5 text-[#007c76]" />
                  {reg.participantCount || 1} người
                </span>
              </div>

              <div className="space-y-0.5 col-span-2 pt-1 border-t border-slate-200/60">
                <span className="text-[10px] text-slate-400 font-bold uppercase block">Lịch giảng dạy</span>
                <span className="font-bold text-slate-900 flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5 text-[#007c76]" />
                  {reg.startDate}
                </span>
              </div>
            </div>

            <div className="flex items-center justify-between pt-1">
              <div className="text-xs">
                <span className="text-slate-400 font-bold block text-[10px]">TỔNG HỌC PHÍ</span>
                <strong className="text-emerald-700 font-black text-sm">
                  {reg.totalPrice || reg.price}
                </strong>
              </div>

              <button
                type="button"
                onClick={() => handleViewReceipt(reg)}
                className="px-3 py-2 bg-slate-100 hover:bg-teal-50 text-slate-700 hover:text-[#007c76] rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer border border-slate-200"
              >
                <FileText className="w-4 h-4 text-[#007c76]" />
                <span>Xem Phiếu / Biên Lai</span>
              </button>
            </div>
          </div>
        ))}
      </div>

      <ReceiptModal
        isOpen={isReceiptModalOpen}
        onClose={() => setIsReceiptModalOpen(false)}
        initialData={selectedReceipt}
      />
    </section>
  );
};

export default MyTrainingRegistrationsView;
