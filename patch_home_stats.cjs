const fs = require('fs');
let code = fs.readFileSync('pages/Home.tsx', 'utf8');

const importTarget = "import { Course } from '../types';";
const importNew = "import { Course } from '../types';\nimport CountUp from 'react-countup';";
code = code.replace(importTarget, importNew);

const heroTarget = "<Hero />";
const heroNew = `<Hero />
      
      {/* 0. Statistics (Thống kê) */}
      <section className="py-12 md:py-20 bg-[#007c76] text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-12 text-center divide-y md:divide-y-0 md:divide-x divide-white/20">
            <div className="py-4 md:py-0 group">
              <div className="text-4xl md:text-6xl font-black mb-2 tracking-tighter group-hover:scale-110 transition-transform">
                <CountUp end={30} duration={2.5} enableScrollSpy scrollSpyOnce />+
              </div>
              <p className="text-white/80 font-bold uppercase tracking-widest text-sm md:text-base">Khóa học chuyên sâu</p>
            </div>
            <div className="py-6 md:py-0 group">
              <div className="text-4xl md:text-6xl font-black mb-2 tracking-tighter group-hover:scale-110 transition-transform">
                <CountUp end={5000} duration={2.5} separator="," enableScrollSpy scrollSpyOnce />+
              </div>
              <p className="text-white/80 font-bold uppercase tracking-widest text-sm md:text-base">Học viên tin tưởng</p>
            </div>
            <div className="py-6 md:py-0 group">
              <div className="text-4xl md:text-6xl font-black mb-2 tracking-tighter group-hover:scale-110 transition-transform">
                <CountUp end={2000} duration={2.5} separator="," enableScrollSpy scrollSpyOnce />+
              </div>
              <p className="text-white/80 font-bold uppercase tracking-widest text-sm md:text-base">Chứng chỉ đã cấp</p>
            </div>
          </div>
        </div>
      </section>
`;
code = code.replace(heroTarget, heroNew);

fs.writeFileSync('pages/Home.tsx', code);
