const fs = require('fs');
let code = fs.readFileSync('pages/Classroom.tsx', 'utf8');

if (!code.includes('Helmet')) {
    code = code.replace(
        "import ReactPlayer from 'react-player';",
        "import ReactPlayer from 'react-player';\nimport { Helmet } from 'react-helmet-async';"
    );
    
    code = code.replace(
        "<div className=\"min-h-screen bg-gray-900 text-white flex flex-col font-sans\">",
        "<div className=\"min-h-screen bg-gray-900 text-white flex flex-col font-sans\">\n      <Helmet>\n        <title>{courseData ? `Đang học: ${courseData.title} | FAST E-Learning` : 'Lớp học | FAST E-Learning'}</title>\n      </Helmet>"
    );
    
    fs.writeFileSync('pages/Classroom.tsx', code);
}
