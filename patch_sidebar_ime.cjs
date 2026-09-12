const fs = require('fs');
let code = fs.readFileSync('components/PersonalNotesSidebar.tsx', 'utf8');

const target = `            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleAddNote();
              }
            }}`;

const replacement = `            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                // Prevent duplicate firing during IME composition (Vietnamese typing)
                if (e.nativeEvent.isComposing || e.keyCode === 229) {
                  return;
                }
                e.preventDefault();
                handleAddNote();
              }
            }}`;

code = code.replace(target, replacement);
fs.writeFileSync('components/PersonalNotesSidebar.tsx', code);
