const fs = require('fs');
let code = fs.readFileSync('components/PaymentModal.tsx', 'utf8');

const oldHandleStart = \`  const handleStartVerification = async () => {
    setIsVerifying(true);
    const user = auth.currentUser;
    if (user && user.email) {
      const code = Math.floor(100000 + Math.random() * 900000).toString();
      setGeneratedOtp(code);
      const emailResult = await sendOtpViaEmailJS(user.email, user.displayName || 'Học viên', code);
      
      if (emailResult.success) {
        setShowOtpForm(true);
        setIsVerifying(false);
      } else {
        console.warn("Failed to send OTP via EmailJS", emailResult.error);
        setIsVerifying(false);
        // Bỏ qua OTP nếu lỗi cấu hình email (để không block luồng dev)
        setIsCompleted(true);
        setTimeout(() => {
          onSuccess();
          setIsCompleted(false);
        }, 1000);
      }
    } else {
      setIsVerifying(false);
    }
  };\`;

const newHandleStart = \`  const handleStartVerification = async () => {
    setIsVerifying(true);
    const user = auth.currentUser;
    if (user && user.email) {
      try {
        const response = await fetch('/api/otp/send', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: user.email, name: user.displayName || 'Học viên' })
        });
        const data = await response.json();
        
        if (response.ok) {
          setShowOtpForm(true);
        } else {
          console.warn("Failed to send OTP via backend", data.error);
          // If 429 or other error, show it
          setOtpError(data.error || "Lỗi gửi mã OTP");
        }
      } catch (err) {
        console.warn("Failed to send OTP", err);
        setOtpError("Lỗi kết nối máy chủ");
      }
    }
    setIsVerifying(false);
  };\`;

code = code.replace(oldHandleStart, newHandleStart);

const oldHandleVerify = \`  const handleVerifyOtp = async () => {
    setIsVerifying(true);
    try {
      const response = await fetch('/api/otp/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: auth.currentUser?.email || '', otp: otpCode })
      });
      if (response.ok) {
        setIsCompleted(true);
        setTimeout(() => {
          onSuccess();
        }, 2000);
      } else {
        alert("Mã OTP không chính xác.");
      }
    } catch (err) {
      alert("Lỗi xác minh. Vui lòng thử lại sau.");
    }
    setIsVerifying(false);
  };\`;

const newHandleVerify = \`  const handleVerifyOtp = async () => {
    setIsVerifying(true);
    try {
      const response = await fetch('/api/otp/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: auth.currentUser?.email || '', otp: userInputOtp })
      });
      const data = await response.json();
      if (response.ok) {
        setOtpError('');
        setIsCompleted(true);
        setTimeout(() => {
          onSuccess();
          setIsCompleted(false);
        }, 2000);
      } else {
        setOtpError(data.error || "Mã OTP không chính xác.");
        if (response.status === 429) {
          setTimeout(() => setShowOtpForm(false), 2000); // go back
        }
      }
    } catch (err) {
      setOtpError("Lỗi xác minh. Vui lòng thử lại sau.");
    }
    setIsVerifying(false);
  };\`;

code = code.replace(oldHandleVerify, newHandleVerify);

fs.writeFileSync('components/PaymentModal.tsx', code);
console.log('Fixed PaymentModal');
