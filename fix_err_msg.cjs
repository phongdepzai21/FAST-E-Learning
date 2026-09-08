const fs = require('fs');
let code = fs.readFileSync('pages/Account.tsx', 'utf8');

const target = `      } else if (err.code === 'auth/missing-email' || err.code === 'auth/missing-password') {
        errMsg = "Thiếu thông tin.";
        msg = "Vui lòng điền đầy đủ email và mật khẩu của bạn.";
      } else if (err.code === 'auth/invalid-email') {
        msg = "Địa chỉ email không khả dụng hoặc không chính xác."`;

const replacement = `      } else if (err.code === 'auth/missing-email' || err.code === 'auth/missing-password') {
        msg = "Vui lòng điền đầy đủ email và mật khẩu của bạn.";
      } else if (err.code === 'auth/invalid-email') {
        msg = "Địa chỉ email không khả dụng hoặc không chính xác."`;

code = code.replace(target, replacement);
fs.writeFileSync('pages/Account.tsx', code);
