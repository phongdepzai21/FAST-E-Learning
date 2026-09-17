const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

// Replace otpStore
code = code.replace(
  /const otpStore = new Map<string, \{ otp: string, expiresAt: number \}>\(\);/,
  `const otpStore = new Map<string, { otp: string, expiresAt: number, attempts: number }>();
  const otpSendCooldowns = new Map<string, number>();`
);

// Replace OTP Send
code = code.replace(
  /const { email, name } = req\.body;\n\s*if \(\!email\) return res\.status\(400\)\.json\(\{ error: "Email is required" \}\);\n\n\s*const otp = Math\.floor\(100000 \+ Math\.random\(\) \* 900000\)\.toString\(\);/,
  `const { email, name } = req.body;
      if (!email) return res.status(400).json({ error: "Email is required" });

      const emailKey = email.toLowerCase();
      const now = Date.now();
      
      // Rate limit: 60 seconds cooldown between emails
      const cooldownEnd = otpSendCooldowns.get(emailKey) || 0;
      if (now < cooldownEnd) {
        const waitSecs = Math.ceil((cooldownEnd - now) / 1000);
        return res.status(429).json({ error: \`Vui lòng đợi \${waitSecs}s trước khi gửi lại.\` });
      }

      const otp = Math.floor(100000 + Math.random() * 900000).toString();`
);

// Add to cooldown map and otp store
code = code.replace(
  /otpStore\.set\(email\.toLowerCase\(\), \{ otp, expiresAt \}\);/,
  `otpStore.set(emailKey, { otp, expiresAt, attempts: 0 });
      otpSendCooldowns.set(emailKey, now + 60000); // 60s cooldown`
);

// Replace OTP Verify
code = code.replace(
  /if \(record\.otp !== otp\) \{\n\s*return res\.status\(400\)\.json\(\{ error: "Mã OTP không chính xác\." \}\);\n\s*\}/,
  `if (record.otp !== otp) {
        record.attempts += 1;
        if (record.attempts >= 5) {
          otpStore.delete(email.toLowerCase());
          return res.status(429).json({ error: "Bạn đã nhập sai quá nhiều lần. Vui lòng yêu cầu mã OTP mới." });
        }
        return res.status(400).json({ error: \`Mã OTP không chính xác. Bạn còn \${5 - record.attempts} lần thử.\` });
      }`
);

fs.writeFileSync('server.ts', code);
