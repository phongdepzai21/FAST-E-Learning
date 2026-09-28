import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import { useNavigate } from 'react-router-dom';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '../firebase';
import { ADMIN_EMAILS } from '../constants';
import { Breadcrumbs } from '../components/Breadcrumbs';

// Import our 3 high-fidelity auditing components
import { FastStandardsAudit } from '../components/FastStandardsAudit';
import { FastFoodSafetyManagement } from '../components/FastFoodSafetyManagement';
import { AdProfileManagement } from '../components/AdProfileManagement';

import { 
  ShieldCheck, 
  Lock, 
  FileText, 
  CheckSquare, 
  FolderLock, 
  ArrowLeft,
  ChevronRight,
  Activity,
  AlertTriangle
} from 'lucide-react';

const AdminAuditCenter: React.FC = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'fsa' | 'attp' | 'hsqc'>('fsa');
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [checkingAuth, setCheckingAuth] = useState<boolean>(true);
  const [userEmail, setUserEmail] = useState<string>('');

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (!currentUser) {
        setIsAdmin(false);
        setCheckingAuth(false);
        return;
      }

      const email = (currentUser.email || '').toLowerCase().trim();
      setUserEmail(email);

      // Check Developer Role Override first (extremely useful for test environment)
      const overrideRole = localStorage.getItem('dev_role_override');
      if (overrideRole === 'Admin' || overrideRole === 'Owner') {
        setIsAdmin(true);
        setCheckingAuth(false);
        return;
      }

      // Check hardcoded admin emails
      const isHardcoded = ADMIN_EMAILS.some(e => e.toLowerCase() === email);
      if (isHardcoded) {
        setIsAdmin(true);
        setCheckingAuth(false);
        return;
      }

      // Check Firestore document roles
      try {
        const userDocRef = doc(db, 'users', email);
        const userSnap = await getDoc(userDocRef);
        if (userSnap.exists()) {
          const userData = userSnap.data();
          if (userData.isAdmin === true) {
            setIsAdmin(true);
            setCheckingAuth(false);
            return;
          }
        }
      } catch (err) {
        console.warn('[AdminAuditCenter] Error checking Firestore role:', err);
      }

      setIsAdmin(false);
      setCheckingAuth(false);
    });

    return () => unsubscribe();
  }, []);

  if (checkingAuth) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center space-y-4">
        <div className="w-12 h-12 border-4 border-[#007c76] border-t-transparent rounded-full animate-spin"></div>
        <p className="text-slate-400 font-bold tracking-widest text-xs uppercase font-mono">Đang kiểm tra quyền truy cập...</p>
      </div>
    );
  }

  // Friendly and highly polished access denied component
  if (!isAdmin) {
    return (
      <main className="min-h-screen bg-slate-950 flex items-center justify-center p-6 relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_40%,rgba(239,68,68,0.08),transparent)] pointer-events-none"></div>
        <Helmet>
          <title>Giới Hạn Truy Cập | FAST Audit Center</title>
        </Helmet>

        <div className="bg-slate-900 border border-slate-800 rounded-[40px] p-8 md:p-12 max-w-lg w-full text-center space-y-6 shadow-2xl relative z-10 animate-fade-in">
          <div className="w-20 h-20 bg-rose-500/10 border border-rose-500/20 text-rose-500 rounded-full flex items-center justify-center mx-auto shadow-lg shadow-rose-500/5 animate-pulse">
            <Lock className="w-10 h-10" />
          </div>

          <div className="space-y-2">
            <h1 className="text-xl md:text-2xl font-black text-white uppercase tracking-tight">Khu Vực Giới Hạn</h1>
            <p className="text-slate-400 text-sm leading-relaxed font-semibold">
              Khu vực quản lý hồ sơ và audit nội bộ chuyên sâu chỉ dành cho quản trị viên và giảng viên được ủy quyền.
            </p>
          </div>

          <div className="p-4 bg-slate-950/80 rounded-2xl border border-slate-800/80 text-[11px] text-rose-300 font-mono text-left space-y-1">
            <div className="flex justify-between border-b border-slate-900 pb-1">
              <span>ĐỊA CHỈ IP:</span>
              <span>CONFIDENTIAL</span>
            </div>
            <div className="flex justify-between pt-1">
              <span>TÀI KHOẢN:</span>
              <span className="text-slate-400">{userEmail || 'CHƯA ĐĂNG NHẬP'}</span>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 pt-2">
            <button 
              onClick={() => navigate('/')} 
              className="flex-1 py-3.5 bg-slate-950 hover:bg-slate-850 text-slate-300 hover:text-white font-bold rounded-2xl text-xs uppercase tracking-wider transition-all border border-slate-800 flex items-center justify-center gap-2 cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
              Trang Chủ
            </button>
            <button 
              onClick={() => navigate('/account')} 
              className="flex-1 py-3.5 bg-[#007c76] hover:bg-[#005f5a] text-white font-black rounded-2xl text-xs uppercase tracking-wider transition-all shadow-lg shadow-[#007c76]/10 flex items-center justify-center gap-2 cursor-pointer"
            >
              Trang Cá Nhân
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-900 pb-20 animate-fade-in">
      <Helmet>
        <title>Hệ Thống Kiểm Toán & Quản Lý Hồ Sơ | FAST Admin</title>
      </Helmet>

      {/* Modern Dashboard Header */}
      <section className="bg-slate-950 border-b border-slate-850 py-10 md:py-14 text-white relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-xl">
                  <ShieldCheck className="w-6 h-6 animate-pulse" />
                </div>
                <span className="text-xs font-black uppercase tracking-widest text-[#007c76] bg-[#007c76]/10 px-3 py-1 rounded-full border border-[#007c76]/20">
                  Phân Hệ Quản Trị Viên (Admin Audit Center)
                </span>
              </div>
              <h1 className="text-2xl md:text-4xl font-black text-white uppercase tracking-tight leading-none">
                Hệ Thống Kiểm Toán & Hồ Sơ Chuyên Sâu
              </h1>
              <p className="text-xs md:text-sm text-slate-400 font-semibold leading-relaxed max-w-2xl">
                Quản lý tập trung 3 phân hệ cốt lõi: Đánh giá audit theo tiêu chuẩn (FSA), kiểm soát hồ sơ An toàn thực phẩm (ATTP), và phê duyệt chất lượng quảng cáo (QC).
              </p>
            </div>

            {/* Quick stats / diagnostic indicators */}
            <div className="flex gap-4">
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex items-center gap-3.5">
                <div className="w-10 h-10 rounded-xl bg-cyan-500/10 text-cyan-400 flex items-center justify-center font-bold text-lg">
                  3
                </div>
                <div>
                  <span className="block text-[10px] font-black uppercase tracking-wider text-slate-400">Phân hệ hoạt động</span>
                  <span className="text-xs font-bold text-white">FSA • ATTP • HSQC</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Tab Switcher Grid Menu */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-10">
        <div className="bg-slate-950 border border-slate-850 rounded-3xl p-3 md:p-4 flex flex-col md:flex-row gap-3 md:gap-4 shadow-xl">
          {[
            {
              id: 'fsa',
              label: '📋 FSA-Checklist',
              desc: 'Đánh giá audit chuẩn mực ISO / HACCP',
              color: 'hover:border-emerald-500/30'
            },
            {
              id: 'attp',
              label: '🛡️ Hồ sơ ATTP',
              desc: 'Cấp giấy chứng nhận & giấy phép an toàn',
              color: 'hover:border-amber-500/30'
            },
            {
              id: 'hsqc',
              label: '💼 Hồ sơ Quảng cáo / QC',
              desc: 'Tự công bố & kiểm nghiệm chất lượng',
              color: 'hover:border-cyan-500/30'
            }
          ].map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex-1 p-5 rounded-2xl border text-left transition-all duration-300 cursor-pointer flex flex-col justify-between ${
                  isActive 
                    ? 'bg-[#007c76]/10 border-[#007c76] text-white shadow-lg shadow-[#007c76]/5 ring-2 ring-[#007c76]/25' 
                    : `bg-slate-900/50 border-slate-850 text-slate-400 ${tab.color}`
                }`}
              >
                <div className="space-y-1.5">
                  <span className="block font-black text-xs md:text-sm uppercase tracking-wide">
                    {tab.label}
                  </span>
                  <p className={`text-[11px] leading-relaxed font-semibold ${isActive ? 'text-emerald-300' : 'text-slate-500'}`}>
                    {tab.desc}
                  </p>
                </div>
                <div className="w-full flex justify-end pt-3 border-t border-slate-850/50 mt-3 text-[10px] font-black tracking-widest text-[#007c76]">
                  {isActive ? 'MÔ-ĐUN ĐANG CHỌN • ACTIVE' : 'NHẤP ĐỂ XEM • CHỌN'}
                </div>
              </button>
            );
          })}
        </div>
      </section>

      {/* Render selected Audit module with nice container and transition */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-8">
        <div className="bg-white border border-gray-150 rounded-[32px] p-6 md:p-10 shadow-sm min-h-[500px]">
          {activeTab === 'fsa' && (
            <div className="animate-fade-in space-y-4">
              <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-100/50 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <h4 className="text-sm font-black text-emerald-800 uppercase tracking-wide">Mô-đun Đang mở: Fast Standards Audit (FSA)</h4>
                  <p className="text-xs text-emerald-600 font-medium">Bản danh mục audit tiêu chuẩn ISO 22000, HACCP và FSSC 22000 cho cơ sở.</p>
                </div>
                <span className="text-[10px] font-black uppercase tracking-widest text-emerald-700 bg-emerald-100 px-3 py-1.5 rounded-xl border border-emerald-200">System Ready</span>
              </div>
              <FastStandardsAudit />
            </div>
          )}

          {activeTab === 'attp' && (
            <div className="animate-fade-in space-y-4">
              <div className="p-4 bg-amber-50 rounded-2xl border border-amber-100/50 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <h4 className="text-sm font-black text-amber-800 uppercase tracking-wide">Mô-đun Đang mở: Hồ sơ ATTP (An Toàn Thực Phẩm)</h4>
                  <p className="text-xs text-amber-600 font-medium">Hệ thống xét duyệt, chuẩn bị giấy phép đủ điều kiện vệ sinh an toàn thực phẩm.</p>
                </div>
                <span className="text-[10px] font-black uppercase tracking-widest text-amber-700 bg-amber-100 px-3 py-1.5 rounded-xl border border-amber-200 font-mono">System Ready</span>
              </div>
              <FastFoodSafetyManagement />
            </div>
          )}

          {activeTab === 'hsqc' && (
            <div className="animate-fade-in space-y-4">
              <div className="p-4 bg-cyan-50 rounded-2xl border border-cyan-100/50 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <h4 className="text-sm font-black text-cyan-800 uppercase tracking-wide">Mô-đun Đang mở: Hồ sơ Quảng cáo / QC</h4>
                  <p className="text-xs text-cyan-600 font-medium">Quản lý kiểm nghiệm sản phẩm, tự công bố và phê duyệt hồ sơ quảng cáo thương mại.</p>
                </div>
                <span className="text-[10px] font-black uppercase tracking-widest text-cyan-700 bg-cyan-100 px-3 py-1.5 rounded-xl border border-cyan-200">System Ready</span>
              </div>
              <AdProfileManagement />
            </div>
          )}
        </div>
      </section>
    </main>
  );
};

export default AdminAuditCenter;
