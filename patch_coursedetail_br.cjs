const fs = require('fs');
let code = fs.readFileSync('pages/CourseDetail.tsx', 'utf8');

if (!code.includes('Breadcrumbs')) {
    code = code.replace(
        "import PaymentModal from '../components/PaymentModal';",
        "import PaymentModal from '../components/PaymentModal';\nimport { Breadcrumbs } from '../components/Breadcrumbs';"
    );
    
    const targetNav = `<nav className="flex items-center gap-2 text-sm font-bold text-gray-400 mb-6 uppercase tracking-widest">
              <Link to="/khoa-hoc" className="hover:text-primary transition-colors">Khóa học</Link>
              <span>/</span>
              <span className="text-primary">{course.category}</span>
            </nav>`;
            
    code = code.replace(targetNav, `<div className="mb-6"><Breadcrumbs theme="dark" items={[{ label: 'Trang chủ', path: '/' }, { label: 'Khóa học', path: '/khoa-hoc' }, { label: course.title }]} /></div>`);
    
    fs.writeFileSync('pages/CourseDetail.tsx', code);
}
