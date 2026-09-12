const fs = require('fs');
let code = fs.readFileSync('pages/Courses.tsx', 'utf8');

if (!code.includes('Helmet')) {
    code = code.replace(
        "import { parseFirestoreError, logFirestoreError } from '../utils/firestoreErrors';",
        "import { parseFirestoreError, logFirestoreError } from '../utils/firestoreErrors';\nimport { Helmet } from 'react-helmet-async';"
    );
    
    code = code.replace(
        "<main className=\"min-h-screen bg-[#f8fafc] pb-20 animate-fade-in\">",
        "<main className=\"min-h-screen bg-[#f8fafc] pb-20 animate-fade-in\">\n      <Helmet>\n        <title>Danh Sách Khóa Học | FAST E-Learning</title>\n        <meta name=\"description\" content=\"Khám phá các khóa học an toàn thực phẩm, quản lý chất lượng chuyên sâu từ FAST E-Learning.\" />\n      </Helmet>"
    );
    
    fs.writeFileSync('pages/Courses.tsx', code);
}
