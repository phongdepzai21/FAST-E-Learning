const fs = require('fs');
let code = fs.readFileSync('pages/Account.tsx', 'utf8');

const target = `    if (!cleanEmail || !password) {
      setIsAuthenticating(false);`;

const newCode = `    if (isRegistering && !fullName.trim()) {
      setIsAuthenticating(false);
      setError("Bạn chưa nhập họ và tên. Vui lòng kiểm tra lại.");
      toast.error("Thiếu họ và tên!");
      return;
    }

    if (!cleanEmail || !password) {
      setIsAuthenticating(false);`;

code = code.replace(target, newCode);
fs.writeFileSync('pages/Account.tsx', code);
