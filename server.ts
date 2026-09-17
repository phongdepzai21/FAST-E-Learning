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

  // In-memory OTP storage
  const otpStore = new Map<string, { otp: string, expiresAt: number, attempts: number }>();
  const otpSendCooldowns = new Map<string, number>();

  // OTP Send Endpoint
  app.post("/api/otp/send", async (req, res) => {
    try {
      const { email, name } = req.body;
      if (!email) return res.status(400).json({ error: "Email is required" });

      const emailKey = email.toLowerCase();
      const now = Date.now();
      
      // Rate limit: 60 seconds cooldown between emails
      const cooldownEnd = otpSendCooldowns.get(emailKey) || 0;
      if (now < cooldownEnd) {
        const waitSecs = Math.ceil((cooldownEnd - now) / 1000);
        return res.status(429).json({ error: `Vui lòng đợi ${waitSecs}s trước khi gửi lại.` });
      }

      const otp = Math.floor(100000 + Math.random() * 900000).toString();
      const expiresAt = Date.now() + 5 * 60 * 1000; // 5 minutes

      const serviceId = process.env.VITE_EMAILJS_SERVICE_ID || "service_rzb3ipm";
      const templateId = process.env.VITE_EMAILJS_TEMPLATE_ID || "template_1nq488j";
      const publicKey = process.env.VITE_EMAILJS_PUBLIC_KEY || "P5IG0fzzQJSm5e4P-";

      if (!serviceId || !templateId || !publicKey) {
        return res.status(500).json({ error: "EmailJS configuration is missing" });
      }

      const payload = {
        service_id: serviceId,
        template_id: templateId,
        user_id: publicKey,
        template_params: {
          to_name: name || "Học viên",
          to_email: email,
          otp_code: otp
        }
      };

      const response = await fetch("https://api.emailjs.com/api/v1.0/email/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const text = await response.text();
        console.error("EmailJS API Error:", text);
        return res.status(500).json({ error: "Lỗi hệ thống gửi email. Vui lòng thử lại sau.", details: text });
      }

      otpStore.set(emailKey, { otp, expiresAt, attempts: 0 });
      otpSendCooldowns.set(emailKey, now + 60000); // 60s cooldown
      res.json({ success: true, message: "OTP sent successfully" });
    } catch (error: any) {
      console.error("Server OTP Send Error:", error);
      res.status(500).json({ error: "Server error sending OTP" });
    }
  });

  // OTP Verify Endpoint
  app.post("/api/otp/verify", (req, res) => {
    try {
      const { email, otp } = req.body;
      if (!email || !otp) return res.status(400).json({ error: "Email and OTP are required" });

      const record = otpStore.get(email.toLowerCase());
      if (!record) {
        return res.status(400).json({ error: "Mã OTP không tồn tại hoặc chưa được gửi." });
      }

      if (Date.now() > record.expiresAt) {
        otpStore.delete(email.toLowerCase());
        return res.status(400).json({ error: "Mã OTP đã hết hạn." });
      }

      if (record.otp !== otp) {
        record.attempts += 1;
        if (record.attempts >= 5) {
          otpStore.delete(email.toLowerCase());
          otpSendCooldowns.set(email.toLowerCase(), Date.now() + 10 * 60 * 1000); // 10 minutes
          return res.status(429).json({ error: "Bạn đã nhập sai quá 5 lần. Tính năng OTP bị khóa trong 600s." });
        }
        return res.status(400).json({ error: `Mã OTP không chính xác. Bạn còn ${5 - record.attempts} lần thử.` });
      }

      otpStore.delete(email.toLowerCase());
      res.json({ success: true, message: "Xác minh thành công" });
    } catch (error: any) {
      console.error("Server OTP Verify Error:", error);
      res.status(500).json({ error: "Server error verifying OTP" });
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
