const fs = require('fs');
let code = fs.readFileSync('pages/Classroom.tsx', 'utf8');

// Fix onProgress
code = code.replace(
    'onProgress={(state) => {',
    '// @ts-ignore\n                  onProgress={(state) => {'
);

fs.writeFileSync('pages/Classroom.tsx', code);
