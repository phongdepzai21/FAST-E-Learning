const fs = require('fs');

let code = fs.readFileSync('pages/Courses.tsx', 'utf8');

code = code.replace(
    'const matchesSearch = course.title.toLowerCase().includes(searchTerm.toLowerCase());',
    'const term = searchTerm.toLowerCase();\n      const matchesSearch = course.title.toLowerCase().includes(term) || (course.category && course.category.toLowerCase().includes(term));'
);

fs.writeFileSync('pages/Courses.tsx', code);
