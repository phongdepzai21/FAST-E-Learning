const fs = require('fs');
let code = fs.readFileSync('pages/Classroom.tsx', 'utf8');

if (!code.includes('isFocusMode')) {
    code = code.replace(
        "const [isPiPActive, setIsPiPActive] = useState(false);",
        "const [isPiPActive, setIsPiPActive] = useState(false);\n  const [isFocusMode, setIsFocusMode] = useState(false);"
    );

    code = code.replace(
        "if (e.key === 'Escape') {",
        "if (e.key === 'Escape') {"
    );
    
    // Insert into keyboard shortcuts
    const kbTarget = `      // 3. Mark completed: 'm' or 'M'
      if (e.key === 'm' || e.key === 'M') {`;
    const kbNew = `      // Focus mode: 'f' or 'F'
      if (e.key === 'f' || e.key === 'F') {
        e.preventDefault();
        setIsFocusMode(prev => {
          const next = !prev;
          triggerFeedback(next ? 'Đã bật chế độ tập trung' : 'Đã tắt chế độ tập trung', '🎯');
          return next;
        });
        return;
      }

      // 3. Mark completed: 'm' or 'M'
      if (e.key === 'm' || e.key === 'M') {`;
    code = code.replace(kbTarget, kbNew);

    // Header hiding and Focus button
    const headerTarget = `<header className="sticky top-0 z-50 bg-[#0f172a]/85 backdrop-blur-xl border-b border-white/[0.08] px-4 md:px-8 py-3.5 flex items-center justify-between shadow-2xl transition-all">`;
    const headerNew = `{!isFocusMode && (<header className="sticky top-0 z-50 bg-[#0f172a]/85 backdrop-blur-xl border-b border-white/[0.08] px-4 md:px-8 py-3.5 flex items-center justify-between shadow-2xl transition-all">`;
    code = code.replace(headerTarget, headerNew);
    
    const shortcutsBtnTarget = `<button
            onClick={() => setShowShortcutsModal(true)}`;
    const focusBtnCode = `<button
            onClick={() => {
              setIsFocusMode(true);
              triggerFeedback('Đã bật chế độ tập trung (Nhấn F để tắt)', '🎯');
            }}
            className="hidden sm:flex items-center gap-1.5 text-xs font-bold text-slate-300 hover:text-white bg-white/[0.05] hover:bg-white/[0.1] px-3 py-1.5 rounded-xl border border-white/[0.08] transition-all"
            title="Bật chế độ tập trung (Phím tắt: F)"
          >
            <span className="text-sm">🎯</span>
            <span className="hidden md:inline">Tập trung</span>
            <kbd className="text-[10px] font-mono px-1.5 py-0.5 bg-black/40 rounded border border-white/20 text-teal-300">F</kbd>
          </button>
          
          <button
            onClick={() => setShowShortcutsModal(true)}`;
    code = code.replace(shortcutsBtnTarget, focusBtnCode);
    
    const headerEndTarget = `</div>
      </header>

      {/* MAIN WORKSPACE GRID */}
      <main className="relative z-10 flex-1 max-w-[1720px] w-full mx-auto p-4 md:p-6 lg:p-8 grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8">
        
        {/* LEFT COLUMN: THEATER PLAYER & DETAILS (8 COLS) */}
        <div className="lg:col-span-8 flex flex-col space-y-6">`;
    const headerEndNew = `</div>
      </header>)}

      {/* EXIT FOCUS MODE FLOATING BUTTON */}
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
        <div className={\`\${isFocusMode ? 'w-full max-w-6xl mx-auto' : 'lg:col-span-8'} flex flex-col space-y-6 transition-all duration-500\`}>`;
    code = code.replace(headerEndTarget, headerEndNew);
    
    const rightColTarget = `{/* RIGHT COLUMN: REFINED PLAYLIST & PERSONAL NOTES SIDEBAR (4 COLS) */}
        <div className="lg:col-span-4 flex flex-col space-y-4">`;
    const rightColNew = `{/* RIGHT COLUMN: REFINED PLAYLIST & PERSONAL NOTES SIDEBAR (4 COLS) */}
        {!isFocusMode && (<div className="lg:col-span-4 flex flex-col space-y-4">`;
    code = code.replace(rightColTarget, rightColNew);
    
    const rightColEndTarget = `</div>
          )}
        </div>
      </main>`;
    const rightColEndNew = `</div>
          )}
        </div>)}
      </main>`;
    code = code.replace(rightColEndTarget, rightColEndNew);
    
    const modalShortcutsTarget = `{ keys: ['?'], label: 'Mở / Đóng bảng phím tắt', desc: 'Hiển thị trợ giúp phím tắt bất kỳ lúc nào' },`;
    const modalShortcutsNew = `{ keys: ['F'], label: 'Bật / Tắt chế độ tập trung', desc: 'Mở rộng bài học, ẩn toàn bộ thanh bên' },
                { keys: ['?'], label: 'Mở / Đóng bảng phím tắt', desc: 'Hiển thị trợ giúp phím tắt bất kỳ lúc nào' },`;
    code = code.replace(modalShortcutsTarget, modalShortcutsNew);

    fs.writeFileSync('pages/Classroom.tsx', code);
}
