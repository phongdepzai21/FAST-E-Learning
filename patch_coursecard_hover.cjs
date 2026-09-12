const fs = require('fs');
let code = fs.readFileSync('components/CourseCard.tsx', 'utf8');

const imageTarget = `            {/* Image Container */}
            <div className="relative aspect-[16/10] overflow-hidden bg-gray-100">`;
const imageNew = `            {/* Image Container */}
            <div className="relative aspect-[16/10] overflow-hidden bg-gray-100 group/image">`;
code = code.replace(imageTarget, imageNew);

const badgeTarget = `                {/* VIP Available Badge */}
                {!isOwned && isVipAvailable && (
                   <div className="absolute top-4 right-4 bg-gradient-to-r from-amber-500 to-yellow-500 text-white px-3 py-1.5 rounded-full z-10 shadow-md text-[10px] font-black uppercase tracking-widest flex items-center gap-1 border border-white/40 animate-pulse">
                      <span>⭐</span> VIP Free
                   </div>
                )}
            </div>`;
const badgeNew = `                {/* VIP Available Badge */}
                {!isOwned && isVipAvailable && (
                   <div className="absolute top-4 right-4 bg-gradient-to-r from-amber-500 to-yellow-500 text-white px-3 py-1.5 rounded-full z-10 shadow-md text-[10px] font-black uppercase tracking-widest flex items-center gap-1 border border-white/40 animate-pulse">
                      <span>⭐</span> VIP Free
                   </div>
                )}

                {/* ADVANCED HOVER OVERLAY */}
                <div className="absolute inset-0 bg-black/70 opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-20 flex flex-col items-center justify-center p-6 text-center backdrop-blur-[2px]">
                    {course.description && (
                        <p className="text-white/90 text-sm line-clamp-3 mb-5 opacity-0 translate-y-4 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-300 delay-100 font-medium">
                            {course.description}
                        </p>
                    )}
                    <div className="inline-flex items-center gap-2 bg-[#007c76] text-white px-6 py-3 rounded-full font-black text-xs uppercase tracking-widest shadow-xl transform translate-y-4 opacity-0 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-300 delay-150 hover:bg-[#005f5a] hover:scale-105">
                        Xem chi tiết
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>
                    </div>
                </div>
            </div>`;
code = code.replace(badgeTarget, badgeNew);

fs.writeFileSync('components/CourseCard.tsx', code);
