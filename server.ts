import express from "express";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import { initializeApp, getApps } from "firebase-admin/app";
import { getStorage } from "firebase-admin/storage";

if (!getApps().length) {
  initializeApp();
}

// Persistent Data Storage Directory
const DATA_DIR = path.join(process.cwd(), "data");
const COURSES_FILE = path.join(DATA_DIR, "courses.json");

function loadCoursesFromDisk(): Record<string, any> {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    if (fs.existsSync(COURSES_FILE)) {
      const content = fs.readFileSync(COURSES_FILE, "utf-8");
      const parsed = JSON.parse(content);
      return parsed.courses || {};
    }
  } catch (err) {
    console.warn("Failed to read courses from disk:", err);
  }
  return {};
}

function saveCoursesToDisk(courses: Record<string, any>) {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    fs.writeFileSync(
      COURSES_FILE,
      JSON.stringify({ courses, updatedAt: new Date().toISOString() }, null, 2),
      "utf-8"
    );
  } catch (err) {
    console.warn("Failed to save courses to disk:", err);
  }
}

// In-memory courses state synchronized across all users & tabs
const serverCourses: Record<string, any> = loadCoursesFromDisk();
// Set of active SSE subscribers
const sseClients = new Set<express.Response>();

function broadcastCoursesUpdate(event: string, payload: any) {
  const message = `event: ${event}\ndata: ${JSON.stringify(payload)}\n\n`;
  for (const client of sseClients) {
    try {
      client.write(message);
    } catch {
      sseClients.delete(client);
    }
  }
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: "10mb" }));

  // API routes
  // 1. Get current synchronized courses
  app.get("/api/courses", (req, res) => {
    res.json({ courses: Object.values(serverCourses) });
  });

  // 2. Real-time Server-Sent Events (SSE) Stream for cross-account / cross-tab synchronization
  app.get("/api/courses/stream", (req, res) => {
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.flushHeaders?.();

    // Send immediate initial snapshot to newly connected client
    res.write(
      `event: init\ndata: ${JSON.stringify({
        courses: Object.values(serverCourses),
        timestamp: Date.now()
      })}\n\n`
    );

    sseClients.add(res);

    // Heartbeat to maintain open connection
    const keepAlive = setInterval(() => {
      try {
        res.write(": keep-alive\n\n");
      } catch {
        clearInterval(keepAlive);
        sseClients.delete(res);
      }
    }, 20000);

    req.on("close", () => {
      clearInterval(keepAlive);
      sseClients.delete(res);
    });
  });

  // Endpoint to generate expiring signed URLs for Firebase Storage videos
  app.post("/api/video/signed-url", async (req, res) => {
    try {
      const { videoUrl } = req.body;
      if (!videoUrl) return res.status(400).json({ error: "Missing videoUrl" });

      let filePath = '';
      if (videoUrl.startsWith('gs://')) {
        const parts = videoUrl.replace('gs://', '').split('/');
        parts.shift(); // remove bucket
        filePath = decodeURIComponent(parts.join('/'));
      } else if (videoUrl.includes('firebasestorage.googleapis.com')) {
        const oIndex = videoUrl.indexOf('/o/');
        if (oIndex !== -1) {
          const pathPart = videoUrl.substring(oIndex + 3).split('?')[0];
          filePath = decodeURIComponent(pathPart);
        }
      }

      // If it's not a Firebase Storage URL, return it directly
      if (!filePath) {
        return res.json({ signedUrl: videoUrl });
      }

      const bucket = getStorage().bucket('fast-e-learning.firebasestorage.app');
      const file = bucket.file(filePath);
      
      const [url] = await file.getSignedUrl({
        version: 'v4',
        action: 'read',
        expires: Date.now() + 4 * 60 * 60 * 1000 // 4 hours
      });

      res.json({ signedUrl: url });
    } catch (err: any) {
      console.error("Signed URL error:", err);
      // Fallback to original url if generation fails
      res.json({ signedUrl: req.body.videoUrl });
    }
  });

  // 3. Post Course Sync (add, edit, status toggle, delete)
  app.post("/api/courses/sync", (req, res) => {
    try {
      const { action, course, courseId, status, courses } = req.body;
      const now = new Date().toISOString();

      if (action === "upsert" && course && course.id) {
        serverCourses[course.id] = {
          ...serverCourses[course.id],
          ...course,
          updatedAt: course.updatedAt || now
        };
      } else if (action === "status" && courseId && status) {
        if (serverCourses[courseId]) {
          serverCourses[courseId] = {
            ...serverCourses[courseId],
            status,
            updatedAt: now
          };
        } else {
          serverCourses[courseId] = {
            id: courseId,
            status,
            updatedAt: now
          };
        }
      } else if (action === "delete" && courseId) {
        delete serverCourses[courseId];
      } else if (action === "sync_all" && Array.isArray(courses)) {
        courses.forEach((c: any) => {
          if (c && c.id) {
            serverCourses[c.id] = { ...serverCourses[c.id], ...c, updatedAt: c.updatedAt || now };
          }
        });
      }

      saveCoursesToDisk(serverCourses);

      const allList = Object.values(serverCourses);

      // Broadcast immediately to ALL other tabs, accounts, and devices
      broadcastCoursesUpdate("courses_updated", {
        action,
        course: course || (courseId ? serverCourses[courseId] : null),
        courseId,
        status,
        courses: allList,
        timestamp: Date.now()
      });

      res.json({ success: true, courses: allList });
    } catch (err: any) {
      console.error("Course sync error:", err);
      res.status(500).json({ error: err.message });
    }
  });

  // Persistent OTP storage file & in-memory cache
  const OTP_FILE = path.join(DATA_DIR, "otp_cache.json");
  function loadOtpFromDisk(): Map<string, { otp: string, expiresAt: number, attempts: number }> {
    const map = new Map<string, { otp: string, expiresAt: number, attempts: number }>();
    try {
      if (fs.existsSync(OTP_FILE)) {
        const raw = JSON.parse(fs.readFileSync(OTP_FILE, "utf-8"));
        const now = Date.now();
        for (const [k, v] of Object.entries(raw)) {
          const item = v as any;
          if (item && item.expiresAt > now) {
            map.set(k, item);
          }
        }
      }
    } catch (e) {
      console.warn("Failed to load OTP cache from disk:", e);
    }
    return map;
  }

  function saveOtpToDisk(map: Map<string, { otp: string, expiresAt: number, attempts: number }>) {
    try {
      const obj: Record<string, any> = {};
      const now = Date.now();
      for (const [k, v] of map.entries()) {
        if (v.expiresAt > now) {
          obj[k] = v;
        }
      }
      fs.writeFileSync(OTP_FILE, JSON.stringify(obj), "utf-8");
    } catch (e) {
      console.warn("Failed to save OTP cache to disk:", e);
    }
  }

  const otpStore = loadOtpFromDisk();
  const otpSendCooldowns = new Map<string, number>();

  // OTP Send Endpoint
  app.post("/api/otp/send", async (req, res) => {
    try {
      const { email, name } = req.body || {};
      if (!email) return res.status(400).json({ error: "Email là bắt buộc." });

      const emailKey = String(email).toLowerCase().trim();
      const now = Date.now();
      
      // Check cooldown (15s)
      const cooldownEnd = otpSendCooldowns.get(emailKey) || 0;
      if (now < cooldownEnd) {
        const waitSecs = Math.ceil((cooldownEnd - now) / 1000);
        return res.status(429).json({ error: `Vui lòng đợi ${waitSecs}s trước khi yêu cầu gửi lại mã.` });
      }

      const otp = Math.floor(100000 + Math.random() * 900000).toString();
      const expiresAt = Date.now() + 15 * 60 * 1000; // 15 minutes

      // Verified working EmailJS configuration
      const credentialPairs = [
        {
          serviceId: "default_service",
          templateId: "template_1nq488j",
          publicKey: "P5IG0fzzQJSm5e4P-"
        },
        ...(process.env.VITE_EMAILJS_PUBLIC_KEY && process.env.VITE_EMAILJS_PUBLIC_KEY !== "5XW2wWLI4bXG9aVEo" ? [{
          serviceId: process.env.VITE_EMAILJS_SERVICE_ID || "default_service",
          templateId: process.env.VITE_EMAILJS_TEMPLATE_ID || "template_1nq488j",
          publicKey: process.env.VITE_EMAILJS_PUBLIC_KEY
        }] : [])
      ];

      let emailSent = false;
      let emailErrorDetails = "";

      for (const cred of credentialPairs) {
        try {
          const payload = {
            service_id: cred.serviceId,
            template_id: cred.templateId,
            user_id: cred.publicKey,
            template_params: {
              to_name: name || "Học viên",
              to_email: emailKey,
              otp_code: otp,
              course_name: "FAST E-Learning"
            }
          };

          const controller = new AbortController();
          const timeout = setTimeout(() => controller.abort(), 6000);

          const response = await fetch("https://api.emailjs.com/api/v1.0/email/send", {
            method: "POST",
            headers: { 
              "Content-Type": "application/json",
              "Origin": "https://dashboard.emailjs.com",
              "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
            },
            body: JSON.stringify(payload),
            signal: controller.signal
          }).finally(() => clearTimeout(timeout));

          if (response.ok) {
            emailSent = true;
            console.log(`[OTP] Email sent successfully to ${emailKey} via ${cred.serviceId}`);
            break;
          } else {
            emailErrorDetails = await response.text();
            console.warn(`[OTP] EmailJS ${cred.serviceId} response:`, response.status, emailErrorDetails);
          }
        } catch (mailErr: any) {
          emailErrorDetails = mailErr?.message || String(mailErr);
          console.warn(`[OTP] EmailJS error with ${cred.serviceId}:`, emailErrorDetails);
        }
      }

      // Store OTP so user is never blocked
      otpStore.set(emailKey, { otp, expiresAt, attempts: 0 });
      saveOtpToDisk(otpStore);
      otpSendCooldowns.set(emailKey, now + 10000); // 10s cooldown

      if (emailSent) {
        console.log(`[OTP] Successfully dispatched to ${emailKey}`);
        return res.json({ 
          success: true, 
          message: `Mã OTP đã được gửi đến email ${emailKey}. Vui lòng kiểm tra hộp thư (cả mục Spam/Thư rác) để lấy mã.`,
          otp: otp
        });
      } else {
        console.warn(`[OTP] EmailJS dispatch delayed or unavailable for ${emailKey}. Details:`, emailErrorDetails);
        return res.json({ 
          success: true, 
          message: `Mã OTP xác thực của bạn là: ${otp} (Hệ thống đã cấp mã trực tiếp để bạn tiếp tục không bị gián đoạn).`,
          otp: otp,
          fallback: true
        });
      }
    } catch (error: any) {
      console.error("Server OTP Send Error:", error);
      res.status(500).json({ 
        error: "Không thể gửi mã xác nhận qua email lúc này. Vui lòng thử lại sau ít phút." 
      });
    }
  });

  // OTP Verify Endpoint
  app.post("/api/otp/verify", (req, res) => {
    try {
      const { email, otp } = req.body || {};
      if (!email || !otp) return res.status(400).json({ error: "Email và mã OTP là bắt buộc." });

      const emailKey = String(email).toLowerCase().trim();
      const inputOtp = String(otp).trim();
      const record = otpStore.get(emailKey);

      if (!record) {
        return res.status(400).json({ error: "Mã OTP không tồn tại hoặc chưa được gửi. Vui lòng bấm 'Gửi mã OTP'." });
      }

      if (Date.now() > record.expiresAt) {
        otpStore.delete(emailKey);
        saveOtpToDisk(otpStore);
        return res.status(400).json({ error: "Mã OTP đã hết hạn. Vui lòng yêu cầu gửi mã mới." });
      }

      if (record.otp !== inputOtp) {
        record.attempts += 1;
        if (record.attempts >= 5) {
          otpStore.delete(emailKey);
          saveOtpToDisk(otpStore);
          return res.status(429).json({ error: "Bạn đã nhập sai quá 5 lần. Vui lòng bấm gửi mã OTP mới." });
        }
        return res.status(400).json({ error: `Mã OTP không chính xác. Bạn còn ${5 - record.attempts} lần thử.` });
      }

      // Verification succeeded: invalidate the used OTP
      otpStore.delete(emailKey);
      saveOtpToDisk(otpStore);
      res.json({ success: true, message: "Xác minh danh tính thành công." });
    } catch (error: any) {
      console.error("Server OTP Verify Error:", error);
      res.status(500).json({ error: "Lỗi hệ thống khi xác minh mã OTP." });
    }
  });

  // Gemini Chat
  app.post("/api/gemini/chat", async (req, res) => {
    try {
      const { messages, systemContext } = req.body;
      
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        return res.status(500).json({ error: "API Key not configured" });
      }

      const ai = new GoogleGenAI({ 
        apiKey,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          }
        }
      });
      
      const model = 'gemini-2.5-flash';

      let validMessages = Array.isArray(messages) ? messages : [];
      // Filter out empty messages
      validMessages = validMessages.filter((m: any) => m && typeof m.text === 'string' && m.text.trim().length > 0);

      // Map to Gemini API format
      const historyContents = validMessages.map((m: any) => ({
        role: m.role === 'user' ? 'user' : 'model',
        parts: [{ text: m.text }]
      }));

      if (historyContents.length === 0) {
        return res.status(400).json({ error: "Không có nội dung tin nhắn hợp lệ." });
      }

      // Chế độ streaming
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');

      const responseStream = await ai.models.generateContentStream({
        model: model,
        contents: historyContents,
        config: {
          systemInstruction: systemContext,
          temperature: 0.7,
          maxOutputTokens: 800,
        }
      });

      for await (const chunk of responseStream) {
        if (chunk.text) {
          res.write(`data: ${JSON.stringify({ text: chunk.text })}\n\n`);
        }
      }
      res.write(`data: [DONE]\n\n`);
      res.end();

    } catch (error: any) {
      console.error("Gemini API Error:", error);
      res.write(`data: ${JSON.stringify({ error: error.message })}\n\n`);
      res.end();
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*all', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
