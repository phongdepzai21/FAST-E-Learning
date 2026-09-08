const fs = require('fs');
let code = fs.readFileSync('App.tsx', 'utf8');

const importTarget = "const Contact = lazy(() => import('./pages/Contact'));";
const importNew = "const Contact = lazy(() => import('./pages/Contact'));\nconst FAQ = lazy(() => import('./pages/FAQ'));";
if (code.includes(importTarget)) {
    code = code.replace(importTarget, importNew);
} else {
    code = code.replace("const PrivacyPolicy = lazy(() => import('./pages/PrivacyPolicy'));", "const PrivacyPolicy = lazy(() => import('./pages/PrivacyPolicy'));\nconst FAQ = lazy(() => import('./pages/FAQ'));");
}

const routeTarget = '<Route path="/lien-he" element={<Contact />} />';
const routeNew = '<Route path="/lien-he" element={<Contact />} />\n            <Route path="/faq" element={<FAQ />} />';
code = code.replace(routeTarget, routeNew);

fs.writeFileSync('App.tsx', code);
