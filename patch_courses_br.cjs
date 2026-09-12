const fs = require('fs');
let code = fs.readFileSync('pages/Courses.tsx', 'utf8');

if (!code.includes('Breadcrumbs')) {
    code = code.replace(
        "import CourseCard from '../components/CourseCard';",
        "import CourseCard from '../components/CourseCard';\nimport { Breadcrumbs } from '../components/Breadcrumbs';"
    );
    
    code = code.replace(
        '<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10 w-full">',
        `<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10 w-full">\n          <div className="flex justify-center mb-6">\n            <Breadcrumbs theme="dark" items={[{ label: 'Trang chủ', path: '/' }, { label: 'Khóa học' }]} />\n          </div>`
    );
    fs.writeFileSync('pages/Courses.tsx', code);
}
