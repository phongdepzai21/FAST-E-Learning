const fs = require('fs');

// 1. Update server.ts
let serverCode = fs.readFileSync('server.ts', 'utf8');
serverCode = serverCode.replace(
  /if \(record\.attempts >= 5\) \{\n\s*otpStore\.delete\(email\.toLowerCase\(\)\);\n\s*return res\.status\(429\)\.json\(\{ error: "Bạn đã nhập sai quá nhiều lần\. Vui lòng yêu cầu mã OTP mới\." \}\);\n\s*\}/,
  `if (record.attempts >= 5) {
          otpStore.delete(email.toLowerCase());
          otpSendCooldowns.set(email.toLowerCase(), Date.now() + 10 * 60 * 1000); // 10 minutes
          return res.status(429).json({ error: "Bạn đã nhập sai quá 5 lần. Tính năng OTP bị khóa trong 600s." });
        }`
);
fs.writeFileSync('server.ts', serverCode);

// 2. Update PurchaseModal.tsx
let modalCode = fs.readFileSync('components/PurchaseModal.tsx', 'utf8');
modalCode = modalCode.replace(
  /if \(response\.status === 429\) \{ \/\/ Too many attempts\n\s*setOtpSent\(false\); \/\/ Reset to send form\n\s*setOtpCode\(""\);\n\s*setCooldownTimer\(0\);\n\s*\}/,
  `if (response.status === 429) {
          setOtpSent(false); 
          setOtpCode("");
          const match = data.error && data.error.match(/(\\d+)s/);
          if (match && match[1]) {
            setCooldownTimer(parseInt(match[1], 10));
          } else {
            setCooldownTimer(0);
          }
        }`
);

// Update button text to be more friendly if it's over 60s
modalCode = modalCode.replace(
  /\{cooldownTimer > 0 \? \`Gửi lại mã sau \$\{cooldownTimer\}s\` : "Gửi lại mã"\}/,
  `{cooldownTimer > 0 
                ? (cooldownTimer > 60 ? \`Thử lại sau \${Math.ceil(cooldownTimer / 60)} phút\` : \`Gửi lại mã sau \${cooldownTimer}s\`) 
                : "Gửi lại mã"}`
);

fs.writeFileSync('components/PurchaseModal.tsx', modalCode);

console.log("Done updating cooldown logic.");
