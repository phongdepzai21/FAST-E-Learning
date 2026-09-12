const fs = require('fs');

function patchFile(file, title) {
    if (!fs.existsSync(file)) return;
    let code = fs.readFileSync(file, 'utf8');
    
    if (!code.includes('Breadcrumbs')) {
        // Find imports and insert
        code = code.replace(
            "import { Helmet } from 'react-helmet-async';",
            "import { Helmet } from 'react-helmet-async';\nimport { Breadcrumbs } from '../components/Breadcrumbs';"
        );
        
        // Find hero header layout and insert
        const headerMatcher = /(<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">|<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10 w-full">|<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 text-center">|<div className="max-w-3xl mx-auto text-center mb-12">)/;
        code = code.replace(
            headerMatcher,
            `$1\n          <div className="flex justify-center mb-6">\n            <Breadcrumbs theme={file === 'pages/FAQ.tsx' || file === 'pages/Handbook.tsx' ? 'light' : 'dark'} items={[{ label: 'Trang chủ', path: '/' }, { label: '${title}' }]} />\n          </div>`
        );
        fs.writeFileSync(file, code);
    }
}

patchFile('pages/About.tsx', 'Về chúng tôi');
patchFile('pages/Contact.tsx', 'Liên hệ');
patchFile('pages/FAQ.tsx', 'Hỏi đáp (FAQ)');
patchFile('pages/Consulting.tsx', 'Tư vấn doanh nghiệp');
patchFile('pages/Handbook.tsx', 'Cẩm nang ATTP');

