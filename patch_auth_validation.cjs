const fs = require('fs');
let code = fs.readFileSync('pages/Account.tsx', 'utf8');

// Replace handleAuthAction start
const targetAuthAction = `  const handleAuthAction = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsAuthenticating(true);
    setError(null);

    const cleanEmail = email.toLowerCase().trim();
    setEmail(cleanEmail);`;

const newAuthAction = `  const handleAuthAction = async (e: React.FormEvent) => {
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

code = code.replace(targetAuthAction, newAuthAction);

code = code.replace('} else if (err.code === \'auth/invalid-email\') {', `} else if (err.code === 'auth/missing-email' || err.code === 'auth/missing-password') {
        errMsg = "Thiếu thông tin.";
        msg = "Vui lòng điền đầy đủ email và mật khẩu của bạn.";
      } else if (err.code === 'auth/invalid-email') {`);

// Remove required attributes from the inputs in the form
// The easiest way is to use a regex or just replace "required\n" around line 1947, 1961, 1975.
// Let's replace 'required' with '' where it matches `<input\n                                required\n`
code = code.replace(/<input\s*\n\s*required/g, '<input\n');

fs.writeFileSync('pages/Account.tsx', code);
