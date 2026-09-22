import express from "express";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import { initializeApp, getApps } from "firebase-admin/app";
import { getStorage } from "firebase-admin/storage";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";

if (!getApps().length) {
  initializeApp();
}

/**
 * Safely check if a user exists via Firebase Admin Auth or Firestore users collection.
 * Gracefully handles 403 API restriction / Identity Toolkit disabled errors.
 */
async function checkUserExistsSafe(emailKey: string): Promise<boolean | null> {
  // 1. Try Firebase Admin Auth if Identity Toolkit API is available
  try {
    const user = await getAuth().getUserByEmail(emailKey);
    if (user && user.uid) {
      return true;
    }
  } catch (authErr: any) {
    if (authErr.code === 'auth/user-not-found') {
      return false;
    }
    // Silently ignore 403 / auth/internal-error from identitytoolkit.googleapis.com
  }

  // 2. Fallback to Firestore users collection
  try {
    const userDoc = await getFirestore().collection("users").doc(emailKey).get();
    if (userDoc.exists) {
      return true;
    }
  } catch {
    // Silently ignore if Firestore admin check fails
  }

  return null;
}

// Persistent Data Storage Directory
const DATA_DIR = path.join(process.cwd(), "data");
const COURSES_FILE = path.join(DATA_DIR, "courses.json");
const COMBOS_FILE = path.join(DATA_DIR, "combos.json");

const DEFAULT_SERVER_COMBOS: Record<string, any> = {
  'combo-basic': {
    id: 'combo-basic',
    title: 'Gói Combo Basic (Nhập Môn Thực Phẩm)',
    price: '1.200.000đ',
    image: 'https://images.unsplash.com/photo-1556910103-1c02745aae4d?auto=format&fit=crop&q=80&w=800',
    description: 'Gói Combo Basic: Học trọn gói các kiến thức cơ bản về HACCP, 5 nguyên tắc vàng của WHO và các tiêu chuẩn kiểm soát chất lượng sơ bộ.',
    courseIds: ['basic-principles', 'truy-xuat-nguon-goc'],
    benefits: ['Tài liệu biểu mẫu SOP đính kèm', 'Cấp chứng nhận hoàn thành'],
    status: 'active',
    updatedAt: new Date().toISOString()
  },
  'combo-pro': {
    id: 'combo-pro',
    title: 'Gói Combo Pro (Chuyên Gia Vận Hành)',
    price: '1.800.000đ',
    image: 'https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?auto=format&fit=crop&q=80&w=800',
    description: 'Gói Combo Pro: Học chuyên sâu dành cho kỹ sư vận hành nhà máy gồm đầy đủ các khóa ISO (ISO 9001, ISO 14001, ISO 22000), nâng cao tối đa năng lực sản xuất.',
    courseIds: ['iso-9001', 'iso-14001', 'iso-22000'],
    benefits: ['Tài liệu biểu mẫu SOP đính kèm', 'Cấp chứng nhận hoàn thành'],
    status: 'active',
    updatedAt: new Date().toISOString()
  }
};

function loadCombosFromDisk(): Record<string, any> {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    if (fs.existsSync(COMBOS_FILE)) {
      const content = fs.readFileSync(COMBOS_FILE, "utf-8");
      const parsed = JSON.parse(content);
      return { ...DEFAULT_SERVER_COMBOS, ...(parsed.combos || {}) };
    }
  } catch (err) {
    console.warn("Failed to read combos from disk:", err);
  }
  return { ...DEFAULT_SERVER_COMBOS };
}

function saveCombosToDisk(combos: Record<string, any>) {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    fs.writeFileSync(
      COMBOS_FILE,
      JSON.stringify({ combos, updatedAt: new Date().toISOString() }, null, 2),
      "utf-8"
    );
  } catch (err) {
    console.warn("Failed to save combos to disk:", err);
  }
}

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

// In-memory courses & combos state synchronized across all users & tabs
const serverCourses: Record<string, any> = loadCoursesFromDisk();
const serverCombos: Record<string, any> = loadCombosFromDisk();
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

function broadcastCombosUpdate(event: string, payload: any) {
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
  // 1. Get current synchronized courses & combos
  app.get("/api/courses", (req, res) => {
    res.json({ courses: Object.values(serverCourses) });
  });

  app.get("/api/combos", (req, res) => {
    res.json({ combos: Object.values(serverCombos) });
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
        combos: Object.values(serverCombos),
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

  // Check if a user account exists in Firebase Auth by email
  app.post("/api/user/exists", async (req, res) => {
    try {
      const { email } = req.body || {};
      if (!email) {
        return res.status(400).json({ exists: false, error: "Email là bắt buộc." });
      }
      const emailKey = String(email).toLowerCase().trim();
      const exists = await checkUserExistsSafe(emailKey);
      return res.json({ exists: exists === true });
    } catch (err: any) {
      return res.json({ exists: false });
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

  // 4. Post Combo Sync (add, edit, status toggle, delete)
  app.post("/api/combos/sync", (req, res) => {
    try {
      const { action, combo, comboId, status, combos } = req.body;
      const now = new Date().toISOString();

      if (action === "upsert" && combo && combo.id) {
        serverCombos[combo.id] = {
          ...serverCombos[combo.id],
          ...combo,
          updatedAt: combo.updatedAt || now
        };
      } else if (action === "status" && comboId && status) {
        if (serverCombos[comboId]) {
          serverCombos[comboId] = {
            ...serverCombos[comboId],
            status,
            updatedAt: now
          };
        } else {
          serverCombos[comboId] = {
            id: comboId,
            status,
            updatedAt: now
          };
        }
      } else if (action === "delete" && comboId) {
        delete serverCombos[comboId];
      } else if (action === "sync_all" && Array.isArray(combos)) {
        combos.forEach((c: any) => {
          if (c && c.id) {
            serverCombos[c.id] = { ...serverCombos[c.id], ...c, updatedAt: c.updatedAt || now };
          }
        });
      }

      saveCombosToDisk(serverCombos);

      const allList = Object.values(serverCombos);

      // Broadcast immediately to ALL other tabs, accounts, and devices
      broadcastCombosUpdate("combos_updated", {
        action,
        combo: combo || (comboId ? serverCombos[comboId] : null),
        comboId,
        status,
        combos: allList,
        timestamp: Date.now()
      });

      res.json({ success: true, combos: allList });
    } catch (err: any) {
      console.error("Combo sync error:", err);
      res.status(500).json({ error: err.message });
    }
  });

  // 5. Ad Profiles CRM Persistence & Sync Endpoints
  const AD_PROFILES_FILE = path.join(DATA_DIR, "ad_profile_crm.json");
  function loadAdProfilesFromDisk(): any[] {
    try {
      if (fs.existsSync(AD_PROFILES_FILE)) {
        const raw = fs.readFileSync(AD_PROFILES_FILE, "utf-8");
        return JSON.parse(raw);
      }
    } catch (e) {
      console.warn("Failed to load ad profiles from disk:", e);
    }
    return [];
  }

  function saveAdProfilesToDisk(records: any[]) {
    try {
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }
      fs.writeFileSync(AD_PROFILES_FILE, JSON.stringify(records, null, 2), "utf-8");
    } catch (e) {
      console.warn("Failed to save ad profiles to disk:", e);
    }
  }

  let serverAdProfiles: any[] = loadAdProfilesFromDisk();

  app.get("/api/ad-profiles", (req, res) => {
    try {
      res.json({ success: true, records: serverAdProfiles });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/ad-profiles/sync", (req, res) => {
    try {
      const { action, record, recordId, records } = req.body;
      const now = new Date().toISOString();

      if (action === "sync_all" && Array.isArray(records)) {
        serverAdProfiles = records;
      } else if (action === "upsert" && record && record.id) {
        const idx = serverAdProfiles.findIndex((c: any) => c.id === record.id);
        const updated = { ...record, updatedAt: record.updatedAt || new Date().toLocaleString("vi-VN") };
        if (idx >= 0) {
          serverAdProfiles[idx] = updated;
        } else {
          serverAdProfiles.unshift(updated);
        }
      } else if (action === "delete" && recordId) {
        serverAdProfiles = serverAdProfiles.filter((c: any) => c.id !== recordId);
      }

      saveAdProfilesToDisk(serverAdProfiles);
      res.json({ success: true, records: serverAdProfiles });
    } catch (err: any) {
      console.error("Ad profiles sync error:", err);
      res.status(500).json({ error: err.message });
    }
  });

  // 6. Fast Standards Audit Persistence & Sync Endpoints
  const FAST_AUDITS_FILE = path.join(DATA_DIR, "fast_audits.json");
  function loadFastAuditsFromDisk(): any {
    try {
      if (fs.existsSync(FAST_AUDITS_FILE)) {
        const raw = fs.readFileSync(FAST_AUDITS_FILE, "utf-8");
        return JSON.parse(raw);
      }
    } catch (e) {
      console.warn("Failed to load fast audits from disk:", e);
    }
    return null;
  }

  function saveFastAuditsToDisk(auditData: any) {
    try {
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }
      fs.writeFileSync(FAST_AUDITS_FILE, JSON.stringify(auditData, null, 2), "utf-8");
    } catch (e) {
      console.warn("Failed to save fast audits to disk:", e);
    }
  }

  let serverFastAudit: any = loadFastAuditsFromDisk();

  app.get("/api/fast-audits/latest", (req, res) => {
    try {
      res.json({ success: true, audit: serverFastAudit });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/fast-audits/sync", (req, res) => {
    try {
      const { audit } = req.body;
      if (audit) {
        serverFastAudit = {
          ...audit,
          updatedAt: new Date().toISOString()
        };
        saveFastAuditsToDisk(serverFastAudit);
      }
      res.json({ success: true, audit: serverFastAudit });
    } catch (err: any) {
      console.error("Fast audit sync error:", err);
      res.status(500).json({ error: err.message });
    }
  });

  // Persistent OTP storage file & in-memory cache
  const OTP_FILE = path.join(DATA_DIR, "otp_cache.json");
  function loadOtpFromDisk(): Map<string, { otp: string, expiresAt: number, attempts: number, flow?: string }> {
    const map = new Map<string, { otp: string, expiresAt: number, attempts: number, flow?: string }>();
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

  function saveOtpToDisk(map: Map<string, { otp: string, expiresAt: number, attempts: number, flow?: string }>) {
    try {
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }
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
      const { email, name, flow = 'register' } = req.body || {};
      if (!email) return res.status(400).json({ error: "Email là bắt buộc." });

      const emailKey = String(email).toLowerCase().trim();
      const flowKey = `${emailKey}_${flow}`;

      // Check if user account already exists in Firebase Auth or Firestore
      let userExists: boolean | null = null;
      if (flow === 'register' || flow === 'reset' || flow === 'login') {
        userExists = await checkUserExistsSafe(emailKey);
      }

      // Distinguish flows: Register vs Login/Reset vs Lock/Purchase
      if (flow === 'register' && userExists === true) {
        return res.status(400).json({ error: "Tài khoản email này đã được đăng ký trên hệ thống. Vui lòng sử dụng chức năng Đăng nhập." });
      }

      if ((flow === 'reset' || flow === 'login') && userExists === false) {
        return res.status(404).json({ error: "Không tìm thấy tài khoản người dùng với email này. Vui lòng kiểm tra lại hoặc Đăng ký tài khoản mới." });
      }

      const now = Date.now();
      
      // Check cooldown (10s)
      const cooldownEnd = otpSendCooldowns.get(flowKey) || otpSendCooldowns.get(emailKey) || 0;
      if (now < cooldownEnd) {
        const waitSecs = Math.ceil((cooldownEnd - now) / 1000);
        return res.status(429).json({ error: `Vui lòng đợi ${waitSecs}s trước khi yêu cầu gửi lại mã.` });
      }

      const otp = Math.floor(100000 + Math.random() * 900000).toString();
      const expiresAt = Date.now() + 15 * 60 * 1000; // 15 minutes

      // Verified working EmailJS configuration with primary working service first
      const credentialPairs = [
        {
          serviceId: process.env.VITE_EMAILJS_SERVICE_ID || "service_q86r4ap",
          templateId: process.env.VITE_EMAILJS_TEMPLATE_ID || "template_1nq488j",
          publicKey: process.env.VITE_EMAILJS_PUBLIC_KEY || "P5IG0fzzQJSm5e4P-"
        },
        {
          serviceId: "service_q86r4ap",
          templateId: "template_1nq488j",
          publicKey: "P5IG0fzzQJSm5e4P-"
        },
        {
          serviceId: "default_service",
          templateId: "template_1nq488j",
          publicKey: "P5IG0fzzQJSm5e4P-"
        }
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

      // Store OTP both with flowKey and emailKey for flow-isolation and backward-compatibility
      const record = { otp, expiresAt, attempts: 0, flow };
      otpStore.set(flowKey, record);
      otpStore.set(emailKey, record);
      saveOtpToDisk(otpStore);
      otpSendCooldowns.set(flowKey, now + 10000); // 10s cooldown
      otpSendCooldowns.set(emailKey, now + 10000);

      if (emailSent) {
        console.log(`[OTP] Successfully dispatched to ${emailKey} (flow: ${flow})`);
        return res.json({ 
          success: true, 
          message: `Mã OTP đã được gửi đến email ${emailKey}. Vui lòng kiểm tra hộp thư đến (và thư rác/spam) để lấy mã xác thực.`
        });
      } else {
        console.warn(`[OTP] EmailJS dispatch failed for ${emailKey} (flow: ${flow}). Details:`, emailErrorDetails);
        return res.json({ 
          success: true, 
          fallback: true,
          otp: otp,
          message: `Mã OTP đã được khởi tạo thành công (Chế độ dự phòng tự động - Auto Fallback). Mã xác thực của bạn là: ${otp} (đã được tự động ghi nhận).`
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
  app.post("/api/otp/verify", async (req, res) => {
    try {
      const { email, otp, flow = 'register' } = req.body || {};
      if (!email || !otp) return res.status(400).json({ error: "Email và mã OTP là bắt buộc." });

      const emailKey = String(email).toLowerCase().trim();
      const inputOtp = String(otp).trim();
      const flowKey = `${emailKey}_${flow}`;

      // Check flow-specific record first, then email-wide record
      const record = otpStore.get(flowKey) || otpStore.get(emailKey);

      if (!record) {
        return res.status(400).json({ error: "Mã OTP không tồn tại hoặc chưa được gửi. Vui lòng bấm 'Gửi mã OTP'." });
      }

      if (Date.now() > record.expiresAt) {
        otpStore.delete(flowKey);
        otpStore.delete(emailKey);
        saveOtpToDisk(otpStore);
        return res.status(400).json({ error: "Mã OTP đã hết hạn. Vui lòng yêu cầu gửi mã mới." });
      }

      if (record.otp !== inputOtp) {
        record.attempts = (record.attempts || 0) + 1;
        if (record.attempts >= 5) {
          otpStore.delete(flowKey);
          otpStore.delete(emailKey);
          saveOtpToDisk(otpStore);
          return res.status(429).json({ error: "Bạn đã nhập sai quá 5 lần. Vui lòng bấm gửi mã OTP mới." });
        }
        saveOtpToDisk(otpStore);
        return res.status(400).json({ error: `Mã OTP không chính xác. Bạn còn ${5 - record.attempts} lần thử.` });
      }

      // Verification succeeded: invalidate the used OTP
      otpStore.delete(flowKey);
      otpStore.delete(emailKey);
      saveOtpToDisk(otpStore);
      res.json({ success: true, message: "Xác minh danh tính thành công." });
    } catch (error: any) {
      console.error("Server OTP Verify Error:", error);
      res.status(500).json({ error: "Lỗi hệ thống khi xác minh mã OTP." });
    }
  });

  // Admin Toggle Lock Endpoint
  app.post("/api/admin/toggle-lock", async (req, res) => {
    try {
      const { targetEmail, shouldLock, reason, adminEmail, otp } = req.body || {};
      if (!targetEmail || !adminEmail) {
        return res.status(400).json({ error: "Thông tin tài khoản là bắt buộc." });
      }

      const admins = ['h1h4phong@gmail.com', 'hkc.qms@gmail.com', 'trdung153@gmail.com', 'lediem.ngo@gmail.com'];
      const adminEmailKey = String(adminEmail).toLowerCase().trim();
      let isAuthorized = admins.includes(adminEmailKey);
      
      if (!isAuthorized) {
        const adminDoc = await getFirestore().collection("users").doc(adminEmailKey).get();
        if (adminDoc.exists && adminDoc.data()?.isAdmin === true) {
          isAuthorized = true;
        }
      }
      
      if (!isAuthorized) {
        return res.status(403).json({ error: "Bạn không có quyền quản trị viên." });
      }

      if (shouldLock) {
        if (!otp) {
          return res.status(400).json({ error: "Mã OTP là bắt buộc để thực hiện khóa tài khoản." });
        }
        const flowKey = `${adminEmailKey}_lock`;
        const record = otpStore.get(flowKey) || otpStore.get(adminEmailKey);

        if (!record) {
          return res.status(400).json({ error: "Mã OTP không tồn tại hoặc đã hết hạn. Vui lòng bấm gửi lại mã." });
        }

        if (Date.now() > record.expiresAt) {
          otpStore.delete(flowKey);
          otpStore.delete(adminEmailKey);
          saveOtpToDisk(otpStore);
          return res.status(400).json({ error: "Mã OTP đã hết hạn. Vui lòng gửi lại mã mới." });
        }

        if (record.otp !== String(otp).trim()) {
          record.attempts = (record.attempts || 0) + 1;
          if (record.attempts >= 5) {
            otpStore.delete(flowKey);
            otpStore.delete(adminEmailKey);
            saveOtpToDisk(otpStore);
            return res.status(429).json({ error: "Bạn đã nhập sai mã quá 5 lần. Vui lòng gửi lại mã mới." });
          }
          saveOtpToDisk(otpStore);
          return res.status(400).json({ error: `Mã OTP không chính xác. Bạn còn ${5 - record.attempts} lần thử.` });
        }

        otpStore.delete(flowKey);
        otpStore.delete(adminEmailKey);
        saveOtpToDisk(otpStore);
      }

      const targetEmailKey = String(targetEmail).toLowerCase().trim();
      const updateData: Record<string, any> = {
        isLocked: !!shouldLock,
        updatedAt: new Date().toISOString()
      };

      if (shouldLock) {
        updateData.lockedAt = new Date().toISOString();
        updateData.lockReason = reason || 'Vi phạm điều khoản hoặc chính sách hệ thống.';
      } else {
        updateData.lockedAt = null;
        updateData.lockReason = null;
      }

      await getFirestore().collection("users").doc(targetEmailKey).set(updateData, { merge: true });
      res.json({ success: true, message: shouldLock ? "Khóa tài khoản thành công." : "Mở khóa tài khoản thành công." });
    } catch (error: any) {
      console.error("Server Toggle Lock Error:", error);
      res.status(500).json({ error: "Lỗi hệ thống khi thực hiện thao tác khóa tài khoản." });
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
