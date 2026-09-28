import React, { useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useToast } from '../contexts/ToastContext';
import { AlertCircle, ArrowLeft, Home, Compass, BookOpen, User, PhoneCall } from 'lucide-react';

const NotFound: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { error } = useToast();

  useEffect(() => {
    // Notify the user via beautiful system toast on mount
    error(
      `Đường dẫn "${location.pathname}" không hợp lệ hoặc trang này không hoạt động.`,
      6000,
      'Lỗi định tuyến (404)'
    );
  }, [location.pathname, error]);

  const activeLinks = [
    { label: 'Trang chủ', path: '/', icon: Home },
    { label: 'Khóa học', path: '/khoa-hoc', icon: BookOpen },
    { label: 'Tư vấn doanh nghiệp', path: '/tu-van', icon: Compass },
    { label: 'Tài khoản học viên', path: '/account', icon: User },
    { label: 'Hỗ trợ kỹ thuật', path: '/lien-he', icon: PhoneCall },
  ];

  return (
    <div className="min-h-[85vh] flex flex-col items-center justify-center bg-[#0a0f1d] px-6 py-12 relative overflow-hidden text-slate-100">
      {/* Background decorations */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-cyan-500/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-10 left-10 w-72 h-72 bg-emerald-500/5 rounded-full blur-[80px] pointer-events-none" />

      <div className="relative max-w-xl w-full text-center space-y-8 z-10">
        {/* Animated Warning Icon */}
        <div className="flex justify-center">
          <div className="w-24 h-24 rounded-[32px] bg-rose-500/10 border-2 border-rose-500/20 flex items-center justify-center text-rose-500 animate-bounce shadow-lg shadow-rose-500/5">
            <AlertCircle className="w-12 h-12" />
          </div>
        </div>

        {/* Heading */}
        <div className="space-y-3">
          <h1 className="text-8xl font-black tracking-tighter bg-gradient-to-r from-rose-400 via-amber-400 to-rose-400 bg-clip-text text-transparent select-none animate-pulse">
            404
          </h1>
          <h2 className="text-2xl font-black uppercase text-white tracking-wide">
            Đường dẫn không hợp lệ
          </h2>
          <p className="text-slate-400 text-sm max-w-md mx-auto leading-relaxed font-semibold">
            Đường dẫn <code className="px-2 py-1 bg-slate-900 border border-slate-800 text-rose-400 rounded font-mono text-xs">{location.pathname}</code> không phải là một trang hoạt động trên hệ thống E-Learning.
          </p>
        </div>

        {/* Suggestion links */}
        <div className="p-6 bg-slate-900/60 border border-slate-800/80 rounded-[32px] space-y-4">
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
            CÁC TRANG HOẠT ĐỘNG CHÍNH THỨC
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {activeLinks.map((link) => {
              const Icon = link.icon;
              return (
                <Link
                  key={link.path}
                  to={link.path}
                  className="flex items-center gap-3 p-3 bg-slate-950/60 hover:bg-cyan-950/20 border border-slate-800/60 hover:border-cyan-500/40 rounded-2xl transition-all group"
                >
                  <div className="w-8 h-8 rounded-xl bg-slate-900 group-hover:bg-cyan-500/15 text-slate-400 group-hover:text-cyan-400 flex items-center justify-center border border-slate-800/80 group-hover:border-cyan-500/20 transition-all">
                    <Icon className="w-4 h-4" />
                  </div>
                  <span className="text-xs font-bold text-slate-300 group-hover:text-white transition-colors">
                    {link.label}
                  </span>
                </Link>
              );
            })}
          </div>
        </div>

        {/* Primary CTA Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <button
            onClick={() => navigate(-1)}
            className="w-full sm:w-auto px-8 py-4 bg-slate-900 border border-slate-800 hover:bg-slate-800 text-slate-300 hover:text-white rounded-2xl font-black uppercase text-xs tracking-widest transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Quay lại trang trước</span>
          </button>
          <button
            onClick={() => navigate('/', { replace: true })}
            className="w-full sm:w-auto px-8 py-4 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 hover:text-white rounded-2xl font-black uppercase text-xs tracking-widest shadow-lg shadow-cyan-500/10 transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <Home className="w-4 h-4" />
            <span>Về trang chủ</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default NotFound;
