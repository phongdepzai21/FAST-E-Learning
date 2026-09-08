const fs = require('fs');
let code = fs.readFileSync('pages/Account.tsx', 'utf8');

// 1. Add state variables for field errors
const stateTarget = "  const [error, setError] = useState<React.ReactNode | null>(null);";
const stateNew = "  const [error, setError] = useState<React.ReactNode | null>(null);\n  const [emailError, setEmailError] = useState<string>('');\n  const [passwordError, setPasswordError] = useState<string>('');\n  const [nameError, setNameError] = useState<string>('');";
code = code.replace(stateTarget, stateNew);

// 2. Update handleAuthAction to set field errors
const actionTarget = `  const handleAuthAction = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsAuthenticating(true);
    setError(null);
    const cleanEmail = email.toLowerCase().trim();
    setEmail(cleanEmail);

    if (isRegistering && !fullName.trim()) {
      setIsAuthenticating(false);
      setError("Bạn chưa nhập họ và tên. Vui lòng kiểm tra lại.");
      toast.error("Thiếu họ và tên!");
      return;
    }

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

const actionNew = `  const handleAuthAction = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsAuthenticating(true);
    setError(null);
    setEmailError('');
    setPasswordError('');
    setNameError('');
    
    const cleanEmail = email.toLowerCase().trim();
    setEmail(cleanEmail);

    let hasError = false;
    
    if (isRegistering && !fullName.trim()) {
      setNameError("Vui lòng nhập họ và tên đầy đủ.");
      hasError = true;
    }
    
    if (!cleanEmail) {
      setEmailError("Vui lòng nhập địa chỉ email.");
      hasError = true;
    }
    
    if (!password) {
      setPasswordError("Vui lòng nhập mật khẩu.");
      hasError = true;
    }
    
    if (hasError) {
        setIsAuthenticating(false);
        return;
    }`;

code = code.replace(actionTarget, actionNew);

// 3. Update inputs to use these errors
// Name Input
const nameInputTarget = `<input 
                                    value={fullName}
                                    onChange={e => setFullName(e.target.value)}
                                    placeholder="Họ và tên đầy đủ"
                                    className="w-full py-4 pl-12 pr-4 bg-gray-50 border border-transparent rounded-2xl font-bold text-gray-700 focus:bg-white focus:border-[#007c76] focus:ring-4 focus:ring-[#007c76]/10 outline-none transition-all placeholder-gray-400"
                                />`;
const nameInputNew = `<input 
                                    value={fullName}
                                    onChange={e => { setFullName(e.target.value); setNameError(''); }}
                                    placeholder="Họ và tên đầy đủ"
                                    className={\`w-full py-4 pl-12 pr-4 bg-gray-50 border rounded-2xl font-bold text-gray-700 focus:bg-white focus:ring-4 outline-none transition-all placeholder-gray-400 \${nameError ? 'border-red-400 focus:border-red-500 focus:ring-red-100 bg-red-50/30' : 'border-transparent focus:border-[#007c76] focus:ring-[#007c76]/10'}\`}
                                />
                                {nameError && <p className="text-red-500 text-xs font-bold mt-2 ml-1 flex items-center gap-1"><svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>{nameError}</p>}`;
code = code.replace(nameInputTarget, nameInputNew);

// Email Input
const emailInputTarget = `<input 
                                type="email" 
                                value={email}
                                onChange={e => setEmail(e.target.value)}
                                placeholder="Email đăng nhập"
                                className="w-full py-4 pl-12 pr-4 bg-gray-50 border border-transparent rounded-2xl font-bold text-gray-700 focus:bg-white focus:border-[#007c76] focus:ring-4 focus:ring-[#007c76]/10 outline-none transition-all placeholder-gray-400"
                            />`;
const emailInputNew = `<input 
                                type="email" 
                                value={email}
                                onChange={e => { setEmail(e.target.value); setEmailError(''); }}
                                placeholder="Email đăng nhập"
                                className={\`w-full py-4 pl-12 pr-4 bg-gray-50 border rounded-2xl font-bold text-gray-700 focus:bg-white focus:ring-4 outline-none transition-all placeholder-gray-400 \${emailError ? 'border-red-400 focus:border-red-500 focus:ring-red-100 bg-red-50/30' : 'border-transparent focus:border-[#007c76] focus:ring-[#007c76]/10'}\`}
                            />
                            {emailError && <p className="text-red-500 text-xs font-bold mt-2 ml-1 flex items-center gap-1"><svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>{emailError}</p>}`;
code = code.replace(emailInputTarget, emailInputNew);

// Password Input
const passwordInputTarget = `<input 
                                type={showPassword ? "text" : "password"}
                                value={password}
                                onChange={e => setPassword(e.target.value)}
                                placeholder="Mật khẩu"
                                className="w-full py-4 pl-12 pr-12 bg-gray-50 border border-transparent rounded-2xl font-bold text-gray-700 focus:bg-white focus:border-[#007c76] focus:ring-4 focus:ring-[#007c76]/10 outline-none transition-all placeholder-gray-400"
                            />`;
const passwordInputNew = `<input 
                                type={showPassword ? "text" : "password"}
                                value={password}
                                onChange={e => { setPassword(e.target.value); setPasswordError(''); }}
                                placeholder="Mật khẩu"
                                className={\`w-full py-4 pl-12 pr-12 bg-gray-50 border rounded-2xl font-bold text-gray-700 focus:bg-white focus:ring-4 outline-none transition-all placeholder-gray-400 \${passwordError ? 'border-red-400 focus:border-red-500 focus:ring-red-100 bg-red-50/30' : 'border-transparent focus:border-[#007c76] focus:ring-[#007c76]/10'}\`}
                            />
                            {passwordError && <p className="text-red-500 text-xs font-bold mt-2 ml-1 flex items-center gap-1"><svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>{passwordError}</p>}`;
code = code.replace(passwordInputTarget, passwordInputNew);

fs.writeFileSync('pages/Account.tsx', code);
