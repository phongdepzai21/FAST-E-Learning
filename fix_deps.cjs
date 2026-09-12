const fs = require('fs');

function fixCourses() {
    let code = fs.readFileSync('pages/Courses.tsx', 'utf8');
    
    if (!code.includes('const allCoursesRef = React.useRef(allCourses);')) {
        code = code.replace(
            `const [allCourses, setAllCourses] = useState<Course[]>(() => getMergedCourses([]));`,
            `const [allCourses, setAllCourses] = useState<Course[]>(() => getMergedCourses([]));\n  const allCoursesRef = React.useRef(allCourses);\n  React.useEffect(() => { allCoursesRef.current = allCourses; }, [allCourses]);`
        );
        
        code = code.replace(
            `const allActiveIds = allCourses.filter(c => c.status !== 'draft' && c.status !== 'inactive').map(c => c.id);`,
            `const allActiveIds = allCoursesRef.current.filter(c => c.status !== 'draft' && c.status !== 'inactive').map(c => c.id);`
        );
        code = code.replace(
            `const allActiveIds = allCourses.filter(c => c.status !== 'draft' && c.status !== 'inactive').map(c => c.id);`,
            `const allActiveIds = allCoursesRef.current.filter(c => c.status !== 'draft' && c.status !== 'inactive').map(c => c.id);`
        );
        
        code = code.replace(`}, [allCourses]);`, `}, []);`);
        
        fs.writeFileSync('pages/Courses.tsx', code);
    }
}

function fixAccount() {
    let code = fs.readFileSync('pages/Account.tsx', 'utf8');
    
    if (!code.includes('const allCoursesRef = React.useRef(allCourses);')) {
        code = code.replace(
            `const [allCourses, setAllCourses] = useState<Course[]>(() => getMergedCourses([]));`,
            `const [allCourses, setAllCourses] = useState<Course[]>(() => getMergedCourses([]));\n  const allCoursesRef = React.useRef(allCourses);\n  React.useEffect(() => { allCoursesRef.current = allCourses; }, [allCourses]);`
        );
        
        code = code.replace(
            /const allActiveIds = allCourses\.filter/g,
            `const allActiveIds = allCoursesRef.current.filter`
        );
        code = code.replace(
            /allCourses\.length > 0/g,
            `allCoursesRef.current.length > 0`
        );
        
        code = code.replace(`}, [user?.email, allCourses]);`, `}, [user?.email]);`);
        
        fs.writeFileSync('pages/Account.tsx', code);
    }
}

fixCourses();
fixAccount();
