const fs = require('fs');
let code = fs.readFileSync('components/PurchaseModal.tsx', 'utf8');

// Add cooldown state
code = code.replace(
  /const \[isVerifying, setIsVerifying\] = useState\(false\);\n\s*const \[error, setError\] = useState\(""\);/,
  `const [isVerifying, setIsVerifying] = useState(false);
  const [error, setError] = useState("");
  const [cooldownTimer, setCooldownTimer] = useState(0);`
);

// Reset cooldown on open
code = code.replace(
  /setIsVerifying\(false\);\n\s*\}/,
  `setIsVerifying(false);
      setCooldownTimer(0);
    }`
);

// Add useEffect for cooldown
code = code.replace(
  /const handleSendOtp = async \(\) => \{/,
  `useEffect(() => {
    let timer;
    if (cooldownTimer > 0) {
      timer = setTimeout(() => setCooldownTimer(c => c - 1), 1000);
    }
    return () => { if (timer) clearTimeout(timer); };
  }, [cooldownTimer]);

  const handleSendOtp = async () => {`
);

// Start cooldown on success
code = code.replace(
  /if \(response\.ok\) \{\n\s*setOtpSent\(true\);/,
  `if (response.ok) {
        setOtpSent(true);
        setCooldownTimer(60);`
);

// Allow 429 response error string to show
code = code.replace(
  /setError\(data\.error \|\| "Lỗi gửi mã OTP\. Vui lòng thử lại sau\."\);/,
  `setError(data.error || "Lỗi gửi mã OTP. Vui lòng thử lại sau.");
        if (response.status === 429 && data.error && data.error.includes("s trước khi gửi lại")) {
          // Try to extract seconds and set timer if possible
          const match = data.error.match(/(\\d+)s/);
          if (match && match[1]) {
            setCooldownTimer(parseInt(match[1], 10));
          }
        }`
);

// Handle verification 429 reset
code = code.replace(
  /if \(response\.ok\) \{\n\s*onSuccess\(\);\n\s*\} else \{\n\s*setError\(data\.error \|\| "Mã OTP không chính xác\."\);/,
  `if (response.ok) {
        onSuccess();
      } else {
        setError(data.error || "Mã OTP không chính xác.");
        if (response.status === 429) { // Too many attempts
          setOtpSent(false); // Reset to send form
          setOtpCode("");
          setCooldownTimer(0);
        }`
);

// Update Resend button disabled state and text
code = code.replace(
  /disabled=\{isWorking\}\n\s*className="w-full py-2 text-sm font-medium text-blue-600 hover:text-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"\n\s*>\n\s*Gửi lại mã/,
  `disabled={isWorking || cooldownTimer > 0}
              className="w-full py-2 text-sm font-medium text-blue-600 hover:text-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {cooldownTimer > 0 ? \`Gửi lại mã sau \${cooldownTimer}s\` : "Gửi lại mã"}`
);

fs.writeFileSync('components/PurchaseModal.tsx', code);
