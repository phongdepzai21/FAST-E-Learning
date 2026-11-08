import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, getDocs, doc, setDoc } from 'firebase/firestore';
import { useToast } from '../contexts/ToastContext';
import { fetchLatestCombosFromServer, fetchLatestCoursesFromServer } from '../utils/courseSyncService';
import { Layers, BookOpen, RefreshCw, Trash2, Database, ShieldAlert, CheckCircle, Activity, HardDrive } from 'lucide-react';

export const AdminDiagnosticConsole: React.FC = () => {
  const toast = useToast();
  const [loading, setLoading] = useState<boolean>(false);
  const [stats, setStats] = useState<{
    combosCount: number;
    customCombosCount: number;
    coursesCount: number;
    usersCount: number;
    localStorageKeys: { key: string; sizeKb: string; preview: string }[];
  }>({
    combosCount: 0,
    customCombosCount: 0,
    coursesCount: 0,
    usersCount: 0,
    localStorageKeys: []
  });

  const loadDiagnosticData = async () => {
    setLoading(true);
    try {
      // 1. Fetch Firestore collection counts
      let combosCount = 0;
      let customCombosCount = 0;
      let coursesCount = 0;
      let usersCount = 0;

      try {
        const cSnap = await getDocs(collection(db, 'combos'));
        combosCount = cSnap.size;
      } catch (e) {}

      try {
        const ccSnap = await getDocs(collection(db, 'customCombos'));
        customCombosCount = ccSnap.size;
      } catch (e) {}

      try {
        const courseSnap = await getDocs(collection(db, 'courses'));
        coursesCount = courseSnap.size;
      } catch (e) {}

      try {
        const uSnap = await getDocs(collection(db, 'users'));
        usersCount = uSnap.size;
      } catch (e) {}

      // 2. Read LocalStorage keys
      const lsKeys = [
        'combo_cache_all',
        'fast_custom_combos_backup',
        'deleted_combo_ids',
        'local_custom_courses',
        'server_custom_courses',
        'cached_firestore_courses',
        'deleted_course_ids'
      ];

      const lsData = lsKeys.map(key => {
        const val = localStorage.getItem(key);
        const sizeKb = val ? (val.length / 1024).toFixed(2) + ' KB' : '0 KB';
        let preview = val ? val.substring(0, 120) + '...' : '(Trống)';
        return { key, sizeKb, preview };
      });

      setStats({
        combosCount,
        customCombosCount,
        coursesCount,
        usersCount,
        localStorageKeys: lsData
      });
      toast.success('Đã làm mới dữ liệu chẩn đoán Firestore & LocalStorage!');
    } catch (err: any) {
      toast.error(`Lỗi khi quét chẩn đoán: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDiagnosticData();
  }, []);

  const handleForceResyncCombos = async () => {
    setLoading(true);
    try {
      await fetchLatestCombosFromServer();
      // Touch sync_control
      await setDoc(doc(db, 'sync_control', 'combos'), { updatedAt: new Date().toISOString() }, { merge: true });
      window.dispatchEvent(new CustomEvent('combos_updated'));
      toast.success('Đã ép đồng bộ lại tất cả gói Combo thành công!');
      await loadDiagnosticData();
    } catch (err: any) {
      toast.error(`Lỗi đồng bộ combo: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleForceResyncCourses = async () => {
    setLoading(true);
    try {
      await fetchLatestCoursesFromServer();
      await setDoc(doc(db, 'sync_control', 'courses'), { updatedAt: new Date().toISOString() }, { merge: true });
      window.dispatchEvent(new CustomEvent('courses_updated'));
      toast.success('Đã ép đồng bộ lại tất cả Khóa học thành công!');
      await loadDiagnosticData();
    } catch (err: any) {
      toast.error(`Lỗi đồng bộ khóa học: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleClearCache = () => {
    if (window.confirm('Bạn có chắc chắn muốn xóa bộ nhớ đệm LocalStorage (không bao gồm ID đã xóa)?')) {
      localStorage.removeItem('combo_cache_all');
      localStorage.removeItem('fast_custom_combos_backup');
      localStorage.removeItem('cached_firestore_courses');
      toast.success('Đã xóa bộ nhớ đệm thành công. Đang tải lại dữ liệu...');
      loadDiagnosticData();
    }
  };

  return (
    <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-xl space-y-8 font-sans">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-6">
        <div>
          <h2 className="text-2xl font-black text-slate-900 flex items-center gap-2.5">
            <Activity className="w-7 h-7 text-[#007c76]" />
            <span>Trung Tâm Chẩn Đoán &amp; Đồng Bộ Firestore</span>
          </h2>
          <p className="text-slate-500 text-sm font-medium mt-1">
            Kiểm tra trạng thái bộ nhớ đệm LocalStorage, dữ liệu Firestore và thực thi ép đồng bộ (Force-Resync) khi real-time listener bị trễ.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={loadDiagnosticData}
            disabled={loading}
            className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-black text-xs uppercase tracking-wider transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            <span>Làm Mới</span>
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <div className="p-5 bg-teal-50/70 border border-teal-200/80 rounded-2xl flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-[#007c76] text-white flex items-center justify-center font-black shadow-md">
            <Layers className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-bold text-teal-800 uppercase tracking-wider">Combos Firestore</p>
            <h3 className="text-2xl font-black text-slate-900 mt-0.5">{stats.combosCount}</h3>
          </div>
        </div>

        <div className="p-5 bg-blue-50/70 border border-blue-200/80 rounded-2xl flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-blue-600 text-white flex items-center justify-center font-black shadow-md">
            <Database className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-bold text-blue-800 uppercase tracking-wider">Custom Combos</p>
            <h3 className="text-2xl font-black text-slate-900 mt-0.5">{stats.customCombosCount}</h3>
          </div>
        </div>

        <div className="p-5 bg-amber-50/70 border border-amber-200/80 rounded-2xl flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-amber-600 text-white flex items-center justify-center font-black shadow-md">
            <BookOpen className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-bold text-amber-800 uppercase tracking-wider">Khóa học Firestore</p>
            <h3 className="text-2xl font-black text-slate-900 mt-0.5">{stats.coursesCount}</h3>
          </div>
        </div>

        <div className="p-5 bg-emerald-50/70 border border-emerald-200/80 rounded-2xl flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-black shadow-md">
            <CheckCircle className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-bold text-emerald-800 uppercase tracking-wider">Tài khoản</p>
            <h3 className="text-2xl font-black text-slate-900 mt-0.5">{stats.usersCount}</h3>
          </div>
        </div>
      </div>

      {/* Force Resync Action Buttons */}
      <div className="p-6 bg-slate-50 border border-slate-200/80 rounded-2xl space-y-4">
        <h3 className="text-base font-black text-slate-900 uppercase tracking-wider flex items-center gap-2">
          <span>⚡ Công Cụ Ép Đồng Bộ &amp; Quản Trị Cache</span>
        </h3>
        <p className="text-xs text-slate-600 font-medium leading-relaxed">
          Nếu các gói combo tự tạo bị chậm phản hồi hoặc không hiển thị trên các trang khác, hãy bấm các nút bên dưới để ép tải lại toàn bộ dữ liệu từ server và kích hoạt sự kiện phát tán thời gian thực.
        </p>

        <div className="flex flex-wrap items-center gap-4 pt-2">
          <button
            type="button"
            onClick={handleForceResyncCombos}
            disabled={loading}
            className="px-5 py-3 bg-[#007c76] hover:bg-[#00605b] text-white rounded-xl font-bold text-xs uppercase tracking-wider transition-all shadow-md flex items-center gap-2 cursor-pointer disabled:opacity-50 active:scale-95"
          >
            <RefreshCw className="w-4 h-4" />
            <span>Ép Đồng Bộ Toàn Bộ Combo</span>
          </button>

          <button
            type="button"
            onClick={handleForceResyncCourses}
            disabled={loading}
            className="px-5 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-xs uppercase tracking-wider transition-all shadow-md flex items-center gap-2 cursor-pointer disabled:opacity-50 active:scale-95"
          >
            <RefreshCw className="w-4 h-4" />
            <span>Ép Đồng Bộ Toàn Bộ Khóa Học</span>
          </button>

          <button
            type="button"
            onClick={handleClearCache}
            disabled={loading}
            className="px-5 py-3 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-bold text-xs uppercase tracking-wider transition-all shadow-md flex items-center gap-2 cursor-pointer disabled:opacity-50 active:scale-95"
          >
            <Trash2 className="w-4 h-4" />
            <span>Xóa Cache Cục Bộ (Clear Cache)</span>
          </button>
        </div>
      </div>

      {/* LocalStorage Cache Table */}
      <div className="space-y-4">
        <h3 className="text-base font-black text-slate-900 uppercase tracking-wider flex items-center gap-2">
          <HardDrive className="w-5 h-5 text-slate-700" />
          <span>Trạng Thái Bộ Nhớ Đệm LocalStorage Hiện Tại</span>
        </h3>

        <div className="overflow-x-auto border border-slate-200 rounded-2xl">
          <table className="w-full text-left border-collapse text-xs sm:text-sm">
            <thead>
              <tr className="bg-slate-100 text-slate-700 uppercase font-black tracking-wider text-[11px] border-b border-slate-200">
                <th className="p-4">Key LocalStorage</th>
                <th className="p-4">Kích Thước</th>
                <th className="p-4">Nội Dung Xem Trước (Preview)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-mono text-xs">
              {stats.localStorageKeys.map((item, idx) => (
                <tr key={idx} className="hover:bg-slate-50/80">
                  <td className="p-4 font-bold text-[#007c76]">{item.key}</td>
                  <td className="p-4 text-slate-600 font-bold">{item.sizeKb}</td>
                  <td className="p-4 text-slate-500 truncate max-w-xs sm:max-w-md">{item.preview}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default AdminDiagnosticConsole;
