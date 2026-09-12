const fs = require('fs');

function patch(file, title) {
    if (!fs.existsSync(file)) return;
    let code = fs.readFileSync(file, 'utf8');
    if (!code.includes('Helmet')) {
        code = code.replace(
            "import React",
            "import React"
        );
        // Find first import and insert after
        code = code.replace(/import .*(['"]react['"]|['"]react-router-dom['"]);?/, `$& \nimport { Helmet } from 'react-helmet-async';`);
        
        // Find main wrapper
        code = code.replace(
            /(<div className="[^"]*animate-fade-in[^"]*">|<main className="[^"]*animate-fade-in[^"]*">|<div className="[^"]*min-h-screen[^"]*">|<main className="[^"]*min-h-screen[^"]*">)/,
            `$1\n      <Helmet>\n        <title>${title}</title>\n      </Helmet>`
        );
        fs.writeFileSync(file, code);
    }
}

patch('pages/About.tsx', 'Về Chúng Tôi | FAST E-Learning');
patch('pages/Contact.tsx', 'Liên Hệ | FAST E-Learning');
patch('pages/FAQ.tsx', 'Hỏi Đáp (FAQ) | FAST E-Learning');
patch('pages/Consulting.tsx', 'Tư Vấn Doanh Nghiệp | FAST E-Learning');
patch('pages/Handbook.tsx', 'Cẩm Nang ATTP | FAST E-Learning');
