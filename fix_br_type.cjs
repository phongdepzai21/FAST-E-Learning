const fs = require('fs');

function fix(file, theme) {
    if (!fs.existsSync(file)) return;
    let code = fs.readFileSync(file, 'utf8');
    
    // The broken code looks like: theme={file === 'pages/FAQ.tsx' || file === 'pages/Handbook.tsx' ? 'light' : 'dark'}
    code = code.replace(
        /theme=\{file === 'pages\/FAQ.tsx' \|\| file === 'pages\/Handbook.tsx' \? 'light' : 'dark'\}/g,
        `theme="${theme}"`
    );
    
    fs.writeFileSync(file, code);
}

fix('pages/About.tsx', 'dark');
fix('pages/Contact.tsx', 'dark');
fix('pages/FAQ.tsx', 'light');
fix('pages/Consulting.tsx', 'dark');
fix('pages/Handbook.tsx', 'light');

