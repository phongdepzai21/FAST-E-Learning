const fs = require('fs');
let code = fs.readFileSync('pages/Classroom.tsx', 'utf8');

// 1. Close header
code = code.replace(
    /<\/header>\s+\{\/\* NOT OWNED NOTICE BANNER \*\//g,
    `</header>)}\n      {/* NOT OWNED NOTICE BANNER */}`
);

// 2. Fix layout
code = code.replace(
    /\{(.*?)MAIN WORKSPACE GRID(.*?)\}\s+<main className="relative z-10 flex-1 max-w-\[1720px\] w-full mx-auto p-4 md:p-6 lg:p-8 grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8">\s+\{\/\* LEFT COLUMN: THEATER PLAYER & DETAILS \(8 COLS\) \*\/\}\s+<div className="lg:col-span-8 flex flex-col space-y-6">/g,
    `{/* EXIT FOCUS MODE FLOATING BUTTON */}
      {isFocusMode && (
        <button
          onClick={() => {
            setIsFocusMode(false);
            triggerFeedback('Đã tắt chế độ tập trung', '🎯');
          }}
          className="fixed top-4 right-4 z-[100] flex items-center gap-2 text-sm font-bold bg-[#0f172a]/90 backdrop-blur-xl border border-white/[0.12] text-white px-4 py-2 rounded-2xl shadow-2xl hover:bg-[#1e293b] hover:scale-105 transition-all group animate-fade-in"
        >
          <span className="group-hover:animate-pulse">🎯</span>
          Thoát tập trung
          <kbd className="text-[10px] font-mono px-1.5 py-0.5 bg-black/40 rounded border border-white/20 text-teal-300 ml-1">F</kbd>
        </button>
      )}

      {/* MAIN WORKSPACE GRID */}
      <main className={\`relative z-10 flex-1 max-w-[1720px] w-full mx-auto p-4 md:p-6 lg:p-8 \${isFocusMode ? 'flex flex-col' : 'grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8'} transition-all duration-500\`}>
        
        {/* LEFT COLUMN: THEATER PLAYER & DETAILS (8 COLS) */}
        <div className={\`\${isFocusMode ? 'w-full max-w-6xl mx-auto' : 'lg:col-span-8'} flex flex-col space-y-6 transition-all duration-500\`}>`
);

fs.writeFileSync('pages/Classroom.tsx', code);
