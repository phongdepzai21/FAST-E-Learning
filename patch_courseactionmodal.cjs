const fs = require('fs');
let code = fs.readFileSync('components/CourseActionModal.tsx', 'utf8');

code = code.replace(
    'onViewCourse?: () => void;',
    'onViewCourse?: () => void;\n  courseId?: string;\n  onViewList?: () => void;\n  onContinueEdit?: () => void;'
);

fs.writeFileSync('components/CourseActionModal.tsx', code);
