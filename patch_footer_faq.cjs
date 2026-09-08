const fs = require('fs');
let code = fs.readFileSync('components/Footer.tsx', 'utf8');

const supportTarget = `                <li><Link to="/lien-he" className="hover:text-[#007c76] transition-colors">Liên hệ</Link></li>`;
const supportNew = `                <li><Link to="/lien-he" className="hover:text-[#007c76] transition-colors">Liên hệ</Link></li>
                <li><Link to="/faq" className="hover:text-[#007c76] transition-colors">Câu hỏi thường gặp (FAQ)</Link></li>`;

code = code.replace(supportTarget, supportNew);

fs.writeFileSync('components/Footer.tsx', code);
