const fs = require('fs');
let code = fs.readFileSync('pages/Account.tsx', 'utf8');

if (!code.includes('Helmet')) {
    code = code.replace(
        "import { auth, db } from '../firebase';",
        "import { auth, db } from '../firebase';\nimport { Helmet } from 'react-helmet-async';"
    );
    
    code = code.replace(
        "<main className=\"min-h-screen bg-gray-50 pb-20 animate-fade-in\">",
        "<main className=\"min-h-screen bg-gray-50 pb-20 animate-fade-in\">\n      <Helmet>\n        <title>Trang Tổng Quan Học Tập | FAST E-Learning</title>\n      </Helmet>"
    );
    
    fs.writeFileSync('pages/Account.tsx', code);
}
