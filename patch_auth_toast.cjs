const fs = require('fs');
let code = fs.readFileSync('pages/Account.tsx', 'utf8');

const actionTarget = `    if (hasError) {
        setIsAuthenticating(false);
        return;
    }`;

const actionNew = `    if (hasError) {
        setIsAuthenticating(false);
        toast.error("Vui lòng điền đầy đủ thông tin vào các trường được đánh dấu đỏ.");
        return;
    }`;

code = code.replace(actionTarget, actionNew);

fs.writeFileSync('pages/Account.tsx', code);
