import React, { useState } from 'react';
import { BADGE_DEFINITIONS, RARITY_STYLES, BadgeDefinition, UserGamificationData } from '../utils/gamification';
import { getLevelTitle } from '../utils/gamificationService';

interface GamificationBadgeSectionProps {
  gamificationData: UserGamificationData;
  userEmail?: string;
  isVip?: boolean;
}

export const GamificationBadgeSection: React.FC<GamificationBadgeSectionProps> = ({
  gamificationData,
  userEmail,
  isVip = false,
}) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedBadge, setSelectedBadge] = useState<BadgeDefinition | null>(null);

  const unlockedIds = new Set(gamificationData.unlockedBadgeIds || []);
  const levelTitle = getLevelTitle(gamificationData.level || 1);
  const totalBadges = BADGE_DEFINITIONS.length;
  const unlockedCount = unlockedIds.size;
  const completionPercentage = Math.round((unlockedCount / totalBadges) * 100);

  const filteredBadges = BADGE_DEFINITIONS.filter(badge => {
    if (selectedCategory === 'all') return true;
    if (selectedCategory === 'unlocked') return unlockedIds.has(badge.id);
    if (selectedCategory === 'locked') return !unlockedIds.has(badge.id);
    return badge.category === selectedCategory;
  });

  return (
    <section className="bg-white rounded-[36px] p-6 sm:p-8 md:p-10 border border-gray-100 shadow-sm animate-in slide-in-from-bottom-5 duration-700 space-y-8">
      {/* HEADER & OVERVIEW STATS */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 pb-6 border-b border-gray-100">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-teal-50 border border-teal-200/60 text-[#007c76] text-[11px] font-extrabold uppercase tracking-wider mb-2">
            <span>🎖️</span>
            <span>Hệ thống Huy hiệu & Thành tích</span>
          </div>
          <h3 className="text-2xl sm:text-3xl font-black text-gray-800 tracking-tight flex items-center gap-3">
            Huy Hiệu Vinh Danh
          </h3>
          <p className="text-gray-500 text-xs sm:text-sm font-semibold mt-1">
            Ghi nhận từng mốc son học tập, chuỗi ngày kiên trì và kiến thức bạn đã chinh phục.
          </p>
        </div>

        {/* GAMIFICATION STATS CARDS */}
        <div className="flex flex-wrap items-center gap-3 sm:gap-4">
          {/* LEVEL CARD */}
          <div className="flex items-center gap-3 bg-gradient-to-br from-slate-900 to-slate-800 text-white px-4 py-3 rounded-2xl shadow-md shadow-slate-900/10">
            <div className="w-10 h-10 rounded-xl bg-teal-500/20 text-teal-300 flex items-center justify-center font-black text-lg border border-teal-500/30">
              {gamificationData.level || 1}
            </div>
            <div>
              <div className="text-[10px] uppercase font-black tracking-widest text-teal-400">Cấp độ</div>
              <div className="text-xs font-black truncate max-w-[130px]">{levelTitle}</div>
            </div>
          </div>

          {/* STREAK CARD */}
          <div className="flex items-center gap-3 bg-gradient-to-br from-amber-500 to-orange-500 text-white px-4 py-3 rounded-2xl shadow-md shadow-amber-500/20">
            <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center text-xl">
              🔥
            </div>
            <div>
              <div className="text-[10px] uppercase font-black tracking-widest text-amber-100">Chuỗi ngày</div>
              <div className="text-sm font-black">{gamificationData.streakDays || 1} Ngày liên tiếp</div>
            </div>
          </div>

          {/* POINTS CARD */}
          <div className="flex items-center gap-3 bg-teal-50 text-[#007c76] border border-teal-100 px-4 py-3 rounded-2xl">
            <div className="w-10 h-10 rounded-xl bg-[#007c76] text-white flex items-center justify-center text-lg font-black shadow-inner">
              ⭐
            </div>
            <div>
              <div className="text-[10px] uppercase font-black tracking-widest text-gray-500">Điểm kinh nghiệm</div>
              <div className="text-sm font-black text-gray-900">{gamificationData.points || 0} EXP</div>
            </div>
          </div>
        </div>
      </div>

      {/* PROGRESS BAR SUMMARY */}
      <div className="bg-[#f8fafc] p-4 sm:p-5 rounded-2xl border border-gray-100 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <div className="w-12 h-12 rounded-2xl bg-teal-50 text-[#007c76] font-black text-sm flex items-center justify-center border border-teal-200/60 shrink-0">
            {completionPercentage}%
          </div>
          <div>
            <div className="text-xs font-bold text-gray-800">
              Đã mở khóa <strong className="text-[#007c76]">{unlockedCount}</strong> / {totalBadges} Huy hiệu
            </div>
            <div className="text-[11px] text-gray-500 font-medium">
              Tiếp tục học các bài giảng và duy trì chuỗi để nhận huy hiệu cấp cao tiếp theo!
            </div>
          </div>
        </div>

        <div className="w-full sm:w-48 bg-gray-200 h-2.5 rounded-full overflow-hidden shrink-0">
          <div
            className="bg-gradient-to-r from-teal-500 to-[#007c76] h-full rounded-full transition-all duration-700"
            style={{ width: `${completionPercentage}%` }}
          ></div>
        </div>
      </div>

      {/* CATEGORY FILTER TABS */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 custom-scrollbar">
        {[
          { id: 'all', label: 'Tất cả huy hiệu', count: totalBadges },
          { id: 'unlocked', label: 'Đã mở khóa', count: unlockedCount },
          { id: 'locked', label: 'Chưa mở khóa', count: totalBadges - unlockedCount },
          { id: 'streak', label: 'Chuỗi Streak 🔥' },
          { id: 'progress', label: 'Tiến độ học 🎓' },
          { id: 'engagement', label: 'Ghi chú 📝' },
          { id: 'mastery', label: 'Chinh phục 🏆' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setSelectedCategory(tab.id)}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex items-center gap-1.5 cursor-pointer ${
              selectedCategory === tab.id
                ? 'bg-[#007c76] text-white shadow-md shadow-[#007c76]/20 font-black scale-105'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            <span>{tab.label}</span>
            {typeof tab.count === 'number' && (
              <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
                selectedCategory === tab.id ? 'bg-white/20 text-white' : 'bg-gray-200 text-gray-600'
              }`}>
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* BADGES GRID */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-5">
        {filteredBadges.map((badge) => {
          const isUnlocked = unlockedIds.has(badge.id);
          const rarity = RARITY_STYLES[badge.rarity] || RARITY_STYLES.common;
          const unlockDate = gamificationData.unlockedBadgeDates?.[badge.id];

          return (
            <div
              key={badge.id}
              onClick={() => setSelectedBadge(badge)}
              className={`p-5 rounded-3xl border transition-all duration-300 flex flex-col justify-between cursor-pointer group relative overflow-hidden ${
                isUnlocked
                  ? `${rarity.bg} ${rarity.border} shadow-sm hover:shadow-xl ${rarity.glow} hover:-translate-y-1`
                  : 'bg-gray-50/70 border-gray-200 opacity-60 hover:opacity-90 grayscale hover:grayscale-0'
              }`}
            >
              {/* TOP RARITY & POINTS */}
              <div className="flex items-center justify-between gap-2 mb-3">
                <span className={`text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md ${rarity.badgeBg}`}>
                  {rarity.label}
                </span>

                <span className="text-[10px] font-black text-gray-500 bg-white/70 px-2 py-0.5 rounded-md border border-gray-200/60">
                  +{badge.points} EXP
                </span>
              </div>

              {/* BADGE ICON & NAME */}
              <div className="text-center py-2 space-y-2">
                <div className="relative inline-block">
                  <div className={`w-16 h-16 rounded-2xl mx-auto flex items-center justify-center text-3xl transition-transform duration-300 group-hover:scale-110 shadow-inner ${
                    isUnlocked ? 'bg-white shadow-md' : 'bg-gray-200 text-gray-400'
                  }`}>
                    {badge.icon}
                  </div>
                  {isUnlocked ? (
                    <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-emerald-500 text-white flex items-center justify-center text-[10px] font-bold shadow">
                      ✓
                    </div>
                  ) : (
                    <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-gray-400 text-white flex items-center justify-center text-[10px] font-bold shadow">
                      🔒
                    </div>
                  )}
                </div>

                <div>
                  <h4 className="font-extrabold text-gray-900 text-sm tracking-tight group-hover:text-[#007c76] transition-colors">
                    {badge.title}
                  </h4>
                  <p className="text-[11px] text-gray-500 font-medium line-clamp-2 mt-1 leading-snug">
                    {badge.description}
                  </p>
                </div>
              </div>

              {/* FOOTER STATUS */}
              <div className="mt-4 pt-3 border-t border-gray-200/50 flex items-center justify-between text-[10px]">
                {isUnlocked ? (
                  <span className="text-emerald-600 font-extrabold flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                    Đã đạt được
                  </span>
                ) : (
                  <span className="text-gray-400 font-bold">
                    {badge.criteriaText}
                  </span>
                )}

                <span className="text-gray-400 font-mono text-[9px]">
                  Chi tiết →
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* DETAIL MODAL FOR SELECTED BADGE */}
      {selectedBadge && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-300">
          <div className="bg-white rounded-[36px] max-w-md w-full p-6 sm:p-8 border border-gray-100 shadow-2xl space-y-6 relative animate-in zoom-in-95">
            <button
              onClick={() => setSelectedBadge(null)}
              className="absolute right-5 top-5 w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-600 flex items-center justify-center font-bold transition-all"
            >
              ✕
            </button>

            <div className="text-center space-y-4 pt-2">
              <div className="w-24 h-24 rounded-3xl bg-gradient-to-tr from-teal-50 to-emerald-50 border-2 border-teal-200/80 mx-auto flex items-center justify-center text-5xl shadow-xl shadow-teal-500/10">
                {selectedBadge.icon}
              </div>

              <div>
                <span className={`text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-lg ${RARITY_STYLES[selectedBadge.rarity]?.badgeBg}`}>
                  {RARITY_STYLES[selectedBadge.rarity]?.label} • +{selectedBadge.points} EXP
                </span>
                <h3 className="text-2xl font-black text-gray-900 mt-2">{selectedBadge.title}</h3>
                <p className="text-xs text-gray-600 font-medium max-w-xs mx-auto mt-2 leading-relaxed">
                  {selectedBadge.description}
                </p>
              </div>
            </div>

            <div className="bg-gray-50 rounded-2xl p-4 space-y-2 text-xs">
              <div className="flex items-center justify-between text-gray-600 font-semibold">
                <span>Điều kiện mở khóa:</span>
                <strong className="text-gray-900">{selectedBadge.criteriaText}</strong>
              </div>
              <div className="flex items-center justify-between text-gray-600 font-semibold">
                <span>Trạng thái:</span>
                {unlockedIds.has(selectedBadge.id) ? (
                  <span className="text-emerald-600 font-black">✓ Đã sở hữu</span>
                ) : (
                  <span className="text-amber-600 font-bold">🔒 Đang khóa</span>
                )}
              </div>
              {gamificationData.unlockedBadgeDates?.[selectedBadge.id] && (
                <div className="flex items-center justify-between text-gray-600 font-semibold">
                  <span>Ngày đạt được:</span>
                  <span className="text-gray-800 font-mono text-[11px]">
                    {new Date(gamificationData.unlockedBadgeDates[selectedBadge.id]).toLocaleDateString('vi-VN')}
                  </span>
                </div>
              )}
            </div>

            <button
              onClick={() => setSelectedBadge(null)}
              className="w-full py-3 bg-[#007c76] hover:bg-[#00625d] text-white rounded-xl font-black text-xs uppercase tracking-widest transition-all shadow-md shadow-[#007c76]/20"
            >
              Đóng
            </button>
          </div>
        </div>
      )}
    </section>
  );
};
