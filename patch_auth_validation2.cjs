const fs = require('fs');
let code = fs.readFileSync('pages/Account.tsx', 'utf8');

const targetStr = `  const handleAuthAction = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsAuthenticating(true);
    setError(null);
    const cleanEmail = email.toLowerCase().trim();
    setEmail(cleanEmail);`;

const newStr = `  const handleAuthAction = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsAuthenticating(true);
    setError(null);
    const cleanEmail = email.toLowerCase().trim();
    setEmail(cleanEmail);

    if (!cleanEmail || !password) {
      setIsAuthenticating(false);
      let errMsg = "Thiếu thông tin";
      let msg = "";
      
      if (!cleanEmail && !password) {
        msg = "Vui lòng nhập địa chỉ email và mật khẩu của bạn.";
        errMsg = "Vui lòng nhập đầy đủ thông tin!";
      } else if (!cleanEmail) {
        msg = "Bạn chưa nhập địa chỉ email. Vui lòng kiểm tra lại.";
        errMsg = "Thiếu địa chỉ email!";
      } else if (!password) {
        msg = "Bạn chưa nhập mật khẩu. Vui lòng kiểm tra lại.";
        errMsg = "Thiếu mật khẩu!";
      }
      
      setError(msg);
      toast.error(errMsg);
      return;
    }`;

code = code.replace(targetStr, newStr);

// I will also check if `required` is removed.
// It might be like this in the file:
// <input 
//     type="email" 

code = code.replace(/<input[\s]*required/g, '<input');
code = code.replace(/<input\n\s*required/g, '<input\n');
code = code.replace(/<input\s*required\s/g, '<input ');

fs.writeFileSync('pages/Account.tsx', code);
