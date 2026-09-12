const fs = require('fs');
let code = fs.readFileSync('App.tsx', 'utf8');

if (!code.includes('HelmetProvider')) {
    code = code.replace(
        "import { ToastContainer } from './components/ToastContainer';",
        "import { ToastContainer } from './components/ToastContainer';\nimport { HelmetProvider } from 'react-helmet-async';"
    );
    
    code = code.replace(
        "<ThemeProvider>",
        "<HelmetProvider>\n  <ThemeProvider>"
    );
    code = code.replace(
        "</ThemeProvider>",
        "</ThemeProvider>\n  </HelmetProvider>"
    );
    
    fs.writeFileSync('App.tsx', code);
}
