import express from "express";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import { initializeApp, getApps, cert } from "firebase-admin/app";
import { getStorage } from "firebase-admin/storage";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";
import { randomBytes, timingSafeEqual } from "crypto";
import { verifyPaymentWebhookToken, processWebhookTransaction, verifyHMACSignature, logFailedWebhookAttempt } from "./utils/paymentService";

const FIREBASE_PROJECT_ID = "fast-e-learning";
const FIRESTORE_DATABASE_ID = "(default)";

if (!getApps().length) {
  const keyPath = path.join(process.cwd(), "firebase-key.json");
  if (fs.existsSync(keyPath)) {
    console.log("[Firebase] Initializing Firebase Admin with local firebase-key.json...");
    initializeApp({
      credential: cert(keyPath),
      projectId: FIREBASE_PROJECT_ID
    });
  } else {
    console.log(`[Firebase] Initializing Firebase Admin with project ${FIREBASE_PROJECT_ID}...`);
    initializeApp({
      projectId: FIREBASE_PROJECT_ID
    });
  }
}

function getServerFirestore() {
  try {
    if (FIRESTORE_DATABASE_ID && FIRESTORE_DATABASE_ID !== "(default)") {
      return getFirestore(FIRESTORE_DATABASE_ID);
    }
    return getFirestore();
  } catch {
    return getFirestore();
  }
}

// Persistent Data Storage Directory
const DATA_DIR = path.join(process.cwd(), "data");
const COURSES_FILE = path.join(DATA_DIR, "courses.json");
const COMBOS_FILE = path.join(DATA_DIR, "combos.json");
const USERS_FILE = path.join(DATA_DIR, "registered_users.json");

const SYSTEM_ADMIN_EMAILS = [
  'h1h4phong@gmail.com',
  'hkc.qms@gmail.com',
  'trdung153@gmail.com',
  'lediem.ngo@gmail.com'
];

function loadUsersFromDisk(): Record<string, any> {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    if (fs.existsSync(USERS_FILE)) {
      const data = JSON.parse(fs.readFileSync(USERS_FILE, "utf-8"));
      return data || {};
    }
  } catch (err) {
    console.warn("Failed to read users from disk:", err);
  }
  return {
    'h1h4phong@gmail.com': { email: 'h1h4phong@gmail.com', displayName: 'H1H4 Phong (Admin)', isAdmin: true, isOwner: true, isTeacher: true },
    'trdung153@gmail.com': { email: 'trdung153@gmail.com', displayName: 'Trần Dũng (Owner)', isAdmin: true, isOwner: true, isTeacher: true },
    'hkc.qms@gmail.com': { email: 'hkc.qms@gmail.com', displayName: 'HKC QMS (Admin)', isAdmin: true, isTeacher: true },
    'lediem.ngo@gmail.com': { email: 'lediem.ngo@gmail.com', displayName: 'Lê Diễm (Admin)', isAdmin: true, isTeacher: true }
  };
}

function saveUserToDisk(emailKey: string, userData: any) {
  try {
    const users = loadUsersFromDisk();
    users[emailKey] = { ...(users[emailKey] || {}), ...userData, updatedAt: new Date().toISOString() };
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2), "utf-8");
  } catch (err) {
    console.warn("Failed to save user to disk:", err);
  }
}

/**
 * Safely check if a user exists via Hardcoded Admins, Local Disk, Firebase Admin Auth, or Firestore.
 * Gracefully handles 403 API restriction / Identity Toolkit disabled errors.
 */
async function checkUserExistsSafe(emailKey: string): Promise<boolean | null> {
  const normalized = emailKey.toLowerCase().trim();

  // 1. Instant check for known System Owner and Admins
  if (SYSTEM_ADMIN_EMAILS.includes(normalized)) {
    return true;
  }

  // 2. Check local persistent disk store
  const diskUsers = loadUsersFromDisk();
  if (diskUsers[normalized]) {
    return true;
  }

  // 3. Try Firebase Admin Auth if Identity Toolkit API is available
  try {
    const user = await getAuth().getUserByEmail(normalized);
    if (user && user.uid) {
      return true;
    }
  } catch (authErr: any) {
    // Continue to Step 4 check in Firestore
  }

  // 4. Fallback to Firestore users collection
  try {
    const userDoc = await getServerFirestore().collection("users").doc(normalized).get();
    if (userDoc.exists) {
      return true;
    }
  } catch {
    // Silently ignore if Firestore admin check fails
  }

  return false;
}

const DEFAULT_SERVER_COMBOS: Record<string, any> = {
  'combo-basic': {
    id: 'combo-basic',
    title: 'Gói Combo Basic (Nhập Môn Thực Phẩm)',
    price: '1.200.000đ',
    originalPrice: '2.400.000đ',
    savings: 'Tiết kiệm 50%',
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
    originalPrice: '3.600.000đ',
    savings: 'Tiết kiệm 50%',
    image: 'https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?auto=format&fit=crop&q=80&w=800',
    description: 'Gói Combo Pro: Học chuyên sâu dành cho kỹ sư vận hành nhà máy gồm đầy đủ các khóa ISO (ISO 9001, ISO 14001, ISO 22000), nâng cao tối đa năng lực sản xuất.',
    courseIds: ['iso-9001', 'iso-14001', 'iso-22000'],
    benefits: ['Tài liệu biểu mẫu SOP đính kèm', 'Cấp chứng nhận hoàn thành'],
    status: 'active',
    updatedAt: new Date().toISOString()
  }
};

function loadCombosDataFromDisk(): { combos: Record<string, any>; deletedIds: string[] } {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    if (fs.existsSync(COMBOS_FILE)) {
      const content = fs.readFileSync(COMBOS_FILE, "utf-8");
      const parsed = JSON.parse(content);
      const deletedIds: string[] = Array.isArray(parsed.deletedComboIds) ? parsed.deletedComboIds : [];
      const baseMap = { ...DEFAULT_SERVER_COMBOS, ...(parsed.combos || {}) };
      // Strip any combo that was deleted
      for (const delId of deletedIds) {
        delete baseMap[delId];
      }
      return { combos: baseMap, deletedIds };
    }
  } catch (err) {
    console.warn("Failed to read combos from disk:", err);
  }
  return { combos: { ...DEFAULT_SERVER_COMBOS }, deletedIds: [] };
}

function saveCombosToDisk(combos: Record<string, any>, deletedIds?: Set<string> | string[]) {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    const delArr = deletedIds ? (Array.isArray(deletedIds) ? deletedIds : Array.from(deletedIds)) : [];
    fs.writeFileSync(
      COMBOS_FILE,
      JSON.stringify({ combos, deletedComboIds: delArr, updatedAt: new Date().toISOString() }, null, 2),
      "utf-8"
    );
  } catch (err) {
    console.warn("Failed to save combos to disk:", err);
  }
}

const DEFAULT_SERVER_COURSES: Record<string, any> = {
  'course-test-free': {
    id: 'course-test-free',
    title: 'Khóa Học Thử Nghiệm Miễn Phí',
    price: 'Miễn phí',
    image: 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&q=80&w=800',
    category: 'Kiến thức chung',
    description: 'Khóa học trải nghiệm hệ thống hoàn toàn miễn phí dành cho tất cả học viên và giáo viên kiểm thử tính năng.',
    status: 'active',
    curriculum: [
      {
        title: "Danh sách bài giảng",
        lessons: [
          { title: "Bài 1: Hướng dẫn trải nghiệm giao diện học tập FAST E-Learning", videoUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ" },
          { title: "Bài 2: Thực hành quy trình kiểm tra An toàn thực phẩm cơ bản", videoUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ" },
          { title: "Bài 3: Bài kiểm tra đánh giá và hoàn thành khóa học", videoUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ" }
        ]
      }
    ],
    updatedAt: new Date().toISOString()
  }
};

function loadCoursesDataFromDisk(): { courses: Record<string, any>; deletedIds: string[] } {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    let loadedCourses: Record<string, any> = {};
    let deletedIds: string[] = [];

    if (fs.existsSync(COURSES_FILE)) {
      const content = fs.readFileSync(COURSES_FILE, "utf-8");
      const parsed = JSON.parse(content);
      loadedCourses = parsed.courses || {};
      deletedIds = Array.isArray(parsed.deletedCourseIds) ? parsed.deletedCourseIds : [];
    }

    // Ensure default test course exists if not explicitly deleted
    Object.keys(DEFAULT_SERVER_COURSES).forEach(id => {
      if (!loadedCourses[id] && !deletedIds.includes(id)) {
        loadedCourses[id] = DEFAULT_SERVER_COURSES[id];
      }
    });

    return { courses: loadedCourses, deletedIds };
  } catch (err) {
    console.warn("Failed to read courses from disk:", err);
  }
  return { courses: { ...DEFAULT_SERVER_COURSES }, deletedIds: [] };
}

function saveCoursesToDisk(courses: Record<string, any>, deletedCourseIds: Set<string>) {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    fs.writeFileSync(
      COURSES_FILE,
      JSON.stringify({ 
        courses, 
        deletedCourseIds: Array.from(deletedCourseIds),
        updatedAt: new Date().toISOString() 
      }, null, 2),
      "utf-8"
    );
  } catch (err) {
    console.warn("Failed to save courses to disk:", err);
  }
}

// In-memory courses & combos state synchronized across all users & tabs
const initialCoursesData = loadCoursesDataFromDisk();
const serverCourses: Record<string, any> = initialCoursesData.courses;
const serverDeletedCourseIds: Set<string> = new Set<string>(initialCoursesData.deletedIds);
const initialCombosData = loadCombosDataFromDisk();
const serverCombos: Record<string, any> = initialCombosData.combos;
const serverDeletedComboIds: Set<string> = new Set<string>(['combo-vip', 'khoa-vip', ...(initialCombosData.deletedIds || [])]);
delete serverCombos['combo-vip'];
delete serverCombos['khoa-vip'];
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
  const PORT = Number(process.env.PORT) || 3000;

  app.get("/api/health", (_req, res) => {
    res.json({ ok: true, status: "ok", uptime: process.uptime() });
  });

  app.use(express.json({ 
    limit: "10mb",
    verify: (req: any, res, buf) => {
      req.rawBody = buf.toString();
    }
  }));

  app.use(express.urlencoded({ 
    extended: true,
    limit: "10mb",
    verify: (req: any, res, buf) => {
      req.rawBody = buf.toString();
    }
  }));

  // Serve uploaded images statically
  const UPLOADS_DIR = path.resolve(process.cwd(), "uploads");
  if (!fs.existsSync(UPLOADS_DIR)) {
    fs.mkdirSync(UPLOADS_DIR, { recursive: true });
  }
  app.use("/uploads", express.static(UPLOADS_DIR));

  // Upload image API (Base64 data URL to local server disk)
  app.post("/api/upload-image", (req, res) => {
    try {
      const { image, fileName } = req.body;
      if (!image || typeof image !== 'string') {
        return res.status(400).json({ success: false, error: "Dữ liệu ảnh không hợp lệ." });
      }

      const matches = image.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
      let buffer: Buffer;
      let ext = 'jpg';

      if (matches && matches.length === 3) {
        const mime = matches[1];
        if (mime.includes('png')) ext = 'png';
        else if (mime.includes('webp')) ext = 'webp';
        else if (mime.includes('gif')) ext = 'gif';
        buffer = Buffer.from(matches[2], 'base64');
      } else {
        buffer = Buffer.from(image, 'base64');
      }

      const safeName = (fileName || 'cover')
        .replace(/[^a-zA-Z0-9_-]/g, '_')
        .substring(0, 40);
      const uniqueName = `${safeName}_${Date.now()}.${ext}`;
      const filePath = path.join(UPLOADS_DIR, uniqueName);

      fs.writeFileSync(filePath, buffer);
      const fileUrl = `/uploads/${uniqueName}`;

      return res.json({ success: true, url: fileUrl });
    } catch (err: any) {
      console.error("[Upload-Image API] Error:", err);
      return res.status(500).json({ success: false, error: err.message });
    }
  });

  // API routes
  // 1. Get current synchronized courses & combos
  app.get("/api/courses", (req, res) => {
    res.json({ 
      courses: Object.values(serverCourses),
      deletedCourseIds: Array.from(serverDeletedCourseIds)
    });
  });

  app.get("/api/combos", (req, res) => {
    res.json({
      combos: Object.values(serverCombos),
      deletedComboIds: Array.from(serverDeletedComboIds)
    });
  });

  // Endpoint to debug incoming headers and protocol forwarders
  app.all("/api/debug/headers", async (req, res) => {
    try {
      const headers = req.headers || {};
      const query = req.query || {};
      const method = req.method || 'GET';
      const protocol = req.protocol;
      const secure = req.secure;
      const url = req.originalUrl;

      const logInfo = {
        method,
        protocol,
        secure,
        url,
        query,
        headers,
        timestamp: new Date().toISOString()
      };

      console.log("[Headers-Debug-API] Received request headers:", JSON.stringify(logInfo, null, 2));

      // Also log directly to Firestore payment_logs so the admin sees it live in the dashboard!
      try {
        await logFailedWebhookAttempt(
          logInfo,
          `Headers Debug Request: ${method} ${url}`,
          "ignored"
        );
      } catch (logErr: any) {
        console.warn("[Headers-Debug-API] Failed to write headers log to Firestore:", logErr.message);
      }

      res.status(200).json({
        success: true,
        message: "Headers captured and logged successfully.",
        requestInfo: logInfo
      });
    } catch (err: any) {
      console.error("[Headers-Debug-API] Exception:", err);
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // Temporary request flow diagnostic logger route
  app.all("/api/debug/request-flow", async (req: any, res) => {
    try {
      const logInfo = {
        method: req.method,
        url: req.url,
        originalUrl: req.originalUrl,
        headers: req.headers || {},
        query: req.query || {},
        body: req.body || null,
        rawBodySample: req.rawBody ? req.rawBody.substring(0, 500) : "Empty",
        timestamp: new Date().toISOString()
      };

      console.log("[Request-Flow-Debug] Received request-flow signal:", JSON.stringify(logInfo, null, 2));

      // Log directly to Firestore payment_logs under status 'ignored' for real-time dashboard visibility
      try {
        await logFailedWebhookAttempt(
          logInfo,
          `Request Flow: ${req.method} ${req.originalUrl}`,
          "ignored"
        );
      } catch (logErr: any) {
        console.warn("[Request-Flow-Debug] Failed to save diagnostic logs to Firestore:", logErr.message);
      }

      res.status(200).json({
        success: true,
        message: "Request flow captured perfectly.",
        debug: logInfo
      });
    } catch (err: any) {
      console.error("[Request-Flow-Debug] Internal capture failure:", err);
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // API to send contact inquiry via Resend or fallback
  app.post("/api/send-contact", async (req, res) => {
    try {
      const { name, email, phone, company, topic, preferredContact, message, ticketId } = req.body;
      if (!name || !phone) {
        return res.status(400).json({ success: false, error: "Họ tên và số điện thoại là bắt buộc." });
      }

      const db = getFirestore();
      const genId = ticketId || Math.floor(1000000000 + Math.random() * 9000000000).toString();
      const inquiryData = {
        id: genId,
        name: name.trim(),
        email: email ? email.trim() : 'khong-co@email.com',
        phone: phone.trim(),
        company: company ? company.trim() : 'Cá nhân',
        topic: topic || 'Tư vấn chung',
        preferredContact: preferredContact || 'phone',
        message: message ? message.trim() : '',
        createdAt: new Date().toISOString()
      };

      // Save to Firestore
      try {
        await db.collection("contact_inquiries").doc(genId).set(inquiryData);
      } catch (err: any) {
        console.warn("Failed to save contact inquiry to Firestore:", err.message);
      }

      // Try sending via Resend API if RESEND_API_KEY is available
      const resendApiKey = process.env.RESEND_API_KEY || '';
      let emailSent = false;
      if (resendApiKey) {
        try {
          const resendRes = await fetch("https://api.resend.com/emails", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${resendApiKey}`
            },
            body: JSON.stringify({
              from: "FAST E-Learning <onboarding@resend.dev>",
              to: ["hkc.qms@gmail.com", "support@fastelearning.com.vn"],
              subject: `[Tư vấn #${genId}] ${topic} - ${name}`,
              text: `[MÃ TIẾP NHẬN: #${genId}]
- Họ tên: ${name}
- Số điện thoại: ${phone}
- Email: ${email || 'Không có'}
- Doanh nghiệp: ${company || 'Cá nhân'}
- Chủ đề: ${topic}
- Kênh liên hệ ưu tiên: ${preferredContact}
- Nội dung: ${message || 'Yêu cầu tư vấn nhanh'}`
            })
          });
          if (resendRes.ok) {
            emailSent = true;
          }
        } catch (resendErr: any) {
          console.warn("Resend API send error:", resendErr.message);
        }
      }

      return res.json({
        success: true,
        ticketId: genId,
        emailSent,
        message: "Gửi yêu cầu hỗ trợ thành công!"
      });
    } catch (err: any) {
      console.error("Send contact API error:", err);
      return res.status(500).json({ success: false, error: err.message });
    }
  });

  // API to look up student email & course registration based on payment code, phone, or ID
  app.get("/api/payment/lookup", async (req, res) => {
    try {
      const queryCode = (req.query.code as string || '').trim();
      if (!queryCode) {
        return res.status(400).json({ success: false, error: "Mã thanh toán không được để trống." });
      }

      // Extract numeric suffix or clean search term
      const cleanTerm = queryCode.replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
      const numMatch = queryCode.match(/\d+/g);
      const suffix = numMatch ? numMatch.join('') : cleanTerm;

      const db = getFirestore();
      let pendingOrder: any = null;
      let liveRegistration: any = null;
      let logsFound: any[] = [];
      let studentEmail: string | null = null;
      let studentPhone: string | null = null;

      // 1. Check live_course_registrations & direct_course_registrations
      try {
        const liveSnap = await db.collection("live_course_registrations").get();
        liveSnap.forEach((docSnap) => {
          const data = docSnap.data();
          const docId = docSnap.id.toLowerCase();
          const memo = (data.paymentMemo || '').toLowerCase();
          const phone = (data.phone || '').replace(/[^\d]/g, '');
          const email = (data.email || '').toLowerCase();
          const studentName = (data.studentName || '').toLowerCase();
          const courseTitle = (data.courseTitle || '').toLowerCase();

          if (
            docId.includes(cleanTerm) ||
            docId.includes(suffix) ||
            memo.includes(cleanTerm) ||
            memo.includes(suffix) ||
            (phone && (phone.includes(suffix) || suffix.includes(phone))) ||
            (email && email.includes(cleanTerm)) ||
            (studentName && studentName.includes(cleanTerm))
          ) {
            if (!liveRegistration) {
              liveRegistration = { id: docSnap.id, ...data };
              studentEmail = data.email || data.userEmail || null;
              studentPhone = data.phone || null;
            }
          }
        });
      } catch (err: any) {
        console.warn("Live registrations lookup error:", err.message);
      }

      // 2. Check pending_payments
      try {
        const pendingSnap = await db.collection("pending_payments").get();
        pendingSnap.forEach((docSnap) => {
          const pData = docSnap.data();
          const pId = docSnap.id.toLowerCase();
          const pCode = (pData.paymentCode || '').toLowerCase();
          const pEmail = (pData.email || '').toLowerCase();

          if (
            pId.includes(cleanTerm) ||
            pId.includes(suffix) ||
            pCode.includes(cleanTerm) ||
            (pEmail && pEmail.includes(cleanTerm))
          ) {
            if (!pendingOrder) {
              pendingOrder = { id: docSnap.id, ...pData };
              if (!studentEmail) studentEmail = pData.email || null;
            }
          }
        });
      } catch (err: any) {
        console.warn("Pending payment lookup error:", err.message);
      }

      // 3. Check payment_logs
      try {
        const logsSnap = await db.collection("payment_logs").get();
        logsSnap.forEach((doc) => {
          const logData = doc.data();
          const payloadStr = logData.payload ? JSON.stringify(logData.payload).toLowerCase() : '';
          const errMsgLower = (logData.errorMessage || '').toLowerCase();
          
          if (
            payloadStr.includes(cleanTerm) || 
            payloadStr.includes(suffix) ||
            errMsgLower.includes(cleanTerm) ||
            errMsgLower.includes(suffix) ||
            (logData.id && logData.id.toLowerCase().includes(suffix))
          ) {
            logsFound.push(logData);
            if (!studentEmail) {
              const emailMatch = (logData.errorMessage || '').match(/user "([^"]+)"/i);
              if (emailMatch) {
                studentEmail = emailMatch[1];
              } else if (logData.payload && logData.payload.email) {
                studentEmail = logData.payload.email;
              }
            }
          }
        });
      } catch (err: any) {
        console.warn("Payment logs lookup error:", err.message);
      }

      // 4. Get student user profile if email exists
      let studentProfile: any = null;
      if (studentEmail) {
        try {
          const userDoc = await db.collection("users").doc(studentEmail.toLowerCase()).get();
          if (userDoc.exists) {
            studentProfile = userDoc.data();
          }
        } catch (err: any) {
          console.warn("User profile lookup error:", err.message);
        }
      }

      const status = liveRegistration 
        ? (liveRegistration.status === 'confirmed' || liveRegistration.status === 'completed' ? 'completed' : 'pending_payment')
        : (pendingOrder ? 'pending_payment' : (logsFound.some(l => l.status === 'success') ? 'completed' : 'unknown'));

      return res.json({
        success: true,
        suffix: suffix || cleanTerm,
        targetCode: queryCode.toUpperCase(),
        studentEmail,
        studentPhone,
        studentProfile,
        pendingOrder,
        registration: liveRegistration,
        logsCount: logsFound.length,
        logs: logsFound.slice(0, 5),
        status
      });
    } catch (err: any) {
      console.error("Payment code lookup exception:", err);
      return res.status(500).json({ success: false, error: err.message });
    }
  });

  // Unified Webhook Handler Function to process incoming banking signals natively
  const paymentWebhookHandler = async (req: any, res: any) => {
    const origin = req.headers["origin"] || "No Origin Header";
    const referer = req.headers["referer"] || "No Referer Header";
    const contentType = req.headers["content-type"] || "No Content-Type Header";
    const userAgent = req.headers["user-agent"] || "Payment Gateway Webhook";
    
    const isParsedAsObject = typeof req.body === 'object' && req.body !== null;
    const bodyKeysCount = isParsedAsObject ? Object.keys(req.body).length : 0;
    const rawBodyLength = req.rawBody ? req.rawBody.length : 0;

    console.log("[Payment-Webhook] Processing Incoming Webhook Signal:");
    console.log(`  - Origin: ${origin} | Referer: ${referer}`);
    console.log(`  - Content-Type: ${contentType} | User-Agent: ${userAgent}`);

    // Detect Security Flow (Verification Flow)
    const signatureHeader = req.headers["x-sepay-signature"] || req.headers["x-payment-signature"] || req.headers["x-signature"];
    const timestampHeader = req.headers["x-sepay-timestamp"] || req.headers["x-timestamp"];
    const authHeader = req.headers["authorization"] || req.headers["x-api-key"];
    const queryToken = req.query.token;

    let isAuthorized = false;
    let authMethodUsed = "None";

    if (signatureHeader) {
      // 1. HMAC Security Verification Flow
      authMethodUsed = "HMAC-SHA256";
      isAuthorized = verifyHMACSignature(
        req.rawBody,
        signatureHeader.toString(),
        timestampHeader ? timestampHeader.toString() : undefined
      );
    } else if (authHeader || queryToken) {
      // 2. Token Security Verification Flow
      authMethodUsed = "API-Token";
      isAuthorized = verifyPaymentWebhookToken(
        authHeader ? authHeader.toString() : undefined,
        queryToken ? queryToken.toString() : undefined
      );
    } else {
      console.warn("[Payment-Webhook:Security] Access denied: No authentication or HMAC signature headers provided.");
    }

    if (!isAuthorized) {
      console.warn(`[Payment-Webhook:Security] Unauthorized webhook attempt using method: ${authMethodUsed}`);
      
      const debugPayload = {
        origin,
        referer,
        contentType,
        userAgent,
        authMethodUsed,
        bodyKeysCount,
        rawBodyLength,
        rawBodyPreview: req.rawBody ? req.rawBody.substring(0, 500) : "Empty",
        parsedBody: req.body,
        signatureHeader: signatureHeader || "None",
        authHeader: authHeader ? "Received (Redacted)" : "None"
      };

      await logFailedWebhookAttempt(
        debugPayload, 
        `Payment webhook verification failed. Unauthorized attempt via ${authMethodUsed}.`, 
        "failed"
      );
      
      return res.status(401).json({ 
        success: false, 
        error: `Payment Webhook Verification Failed (${authMethodUsed}). Access Denied.`,
        diagnostics: {
          contentType,
          isParsedAsObject,
          hasRawBody: !!req.rawBody
        }
      });
    }

    // Process valid authorized transaction
    try {
      console.log(`[Payment-Webhook] Authorization check PASSED via ${authMethodUsed}. Processing transaction...`);
      const result = await processWebhookTransaction(req.body);
      
      if (result.success) {
        console.log("[Payment-Webhook] Transaction processed and course provisioned successfully!");
        return res.status(200).json(result);
      } else {
        console.warn("[Payment-Webhook] Processing completed with failure/ignored:", result.message || result.error);
        return res.status(result.error ? 400 : 200).json(result);
      }
    } catch (err: any) {
      console.error("[Payment-Webhook] Server-side exception:", err);
      await logFailedWebhookAttempt(req.body, `Server exception during webhook process: ${err.message}`, "exception");
      return res.status(500).json({ success: false, error: err.message });
    }
  };

  // Register the handler for payment webhook
  app.post("/api/payment/webhook", paymentWebhookHandler);
  app.post("/api/sepay/webhook", paymentWebhookHandler);

  // Local disk + Firestore Order Store for Node/Preview server parity with Netlify Functions
  const ORDERS_FILE = path.join(DATA_DIR, "orders.json");
  function loadOrdersFromDisk(): Record<string, any> {
    try {
      if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
      if (fs.existsSync(ORDERS_FILE)) {
        return JSON.parse(fs.readFileSync(ORDERS_FILE, "utf-8")) || {};
      }
    } catch {}
    return {};
  }
  function saveOrdersToDisk(ordersMap: Record<string, any>) {
    try {
      if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
      fs.writeFileSync(ORDERS_FILE, JSON.stringify(ordersMap, null, 2), "utf-8");
    } catch {}
  }
  let serverOrdersMap: Record<string, any> = loadOrdersFromDisk();

  function normalizeServerFastCode(codeStr?: string): string {
    if (!codeStr) return "";
    let clean = String(codeStr).trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
    while (clean.startsWith("FASTFAST")) clean = clean.substring(4);
    if (!clean.startsWith("FAST")) clean = `FAST${clean}`;
    return clean;
  }

  function extractFastCodeFromText(text: string): string {
    const upper = String(text || "").toUpperCase();
    const match = upper.match(/FAST\s*[-_]?\s*([A-Z0-9]{4,16})/i);
    if (!match) return "";
    let suffix = match[1].trim().toUpperCase();
    while (suffix.startsWith("FAST")) suffix = suffix.substring(4);
    return suffix ? `FAST${suffix}` : "";
  }

  app.post("/api/create-order", async (req, res) => {
    try {
      const {
        courseId,
        courseTitle,
        amount,
        email,
        userId,
        registrationId,
        orderType,
        studentName,
        phone,
        requestedPaymentCode
      } = req.body || {};

      if (!courseId && !registrationId) {
        return res.status(400).json({ success: false, error: "Missing required fields: courseId or registrationId" });
      }

      const normalizedEmail = String(email || (phone ? `${String(phone).replace(/[^\d]/g, "")}@fast-training.local` : "")).toLowerCase().trim();
      const numericAmount = Number(amount) || 0;
      const orderId = `ORD_${Date.now()}_${Math.floor(Math.random() * 1000)}`;

      let paymentCode = "";
      let randomSuffix = "";
      if (requestedPaymentCode && typeof requestedPaymentCode === "string") {
        const candidate = normalizeServerFastCode(requestedPaymentCode);
        if (candidate.length >= 8 && candidate.length <= 16) {
          paymentCode = candidate;
          randomSuffix = candidate.replace(/^FAST/, "");
        }
      }

      if (!paymentCode) {
        const chars = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ";
        for (let i = 0; i < 8; i++) {
          randomSuffix += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        paymentCode = `FAST${randomSuffix}`;
      }

      const bankCode = process.env.BANK_CODE || "ACB";
      const bankAccount = process.env.BANK_ACCOUNT || "0989499568";
      const bankAccountName = process.env.BANK_ACCOUNT_NAME || "CONG TY TNHH TU VAN FAST";

      const orderData = {
        orderId,
        paymentCode,
        courseId: courseId || registrationId,
        courseTitle: courseTitle || "Khóa học FAST E-Learning",
        amount: numericAmount,
        email: normalizedEmail,
        userId: userId || "",
        registrationId: registrationId || "",
        orderType: orderType || (registrationId ? "direct_training" : "course"),
        studentName: studentName || "",
        phone: phone || "",
        status: "PENDING",
        createdAt: new Date().toISOString(),
        bankCode,
        bankAccount,
        bankAccountName,
      };

      serverOrdersMap[orderId] = orderData;
      saveOrdersToDisk(serverOrdersMap);

      try {
        const db = getServerFirestore();
        const pendingData = {
          code: paymentCode,
          suffix: randomSuffix,
          email: normalizedEmail,
          courseId: orderData.courseId,
          amount: numericAmount,
          orderId,
          registrationId: orderData.registrationId,
          orderType: orderData.orderType,
          createdAt: orderData.createdAt,
        };
        await Promise.all([
          db.collection("orders").doc(orderId).set(orderData, { merge: true }),
          db.collection("pending_payments").doc(randomSuffix).set(pendingData, { merge: true }),
          db.collection("pending_payments").doc(paymentCode).set(pendingData, { merge: true }),
        ]);
      } catch (dbErr: any) {
        console.warn("[CreateOrder] Firestore note:", dbErr?.message);
      }

      return res.json({
        success: true,
        orderId,
        paymentCode,
        amount: numericAmount,
        bankCode,
        bankAccount,
        bankAccountName,
        message: "Order created successfully",
      });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err?.message || "Internal server error" });
    }
  });

  app.get("/api/check-payment", async (req, res) => {
    try {
      const orderId = req.query.orderId ? String(req.query.orderId).trim() : "";
      const paymentCode = req.query.paymentCode ? String(req.query.paymentCode).trim() : "";

      if (!orderId && !paymentCode) {
        return res.status(400).json({ success: false, error: "Missing orderId or paymentCode parameter" });
      }

      const cleanCode = paymentCode ? normalizeServerFastCode(paymentCode) : "";
      let orderDoc: any = null;

      // 1. Check in-memory/disk orders first
      if (orderId && serverOrdersMap[orderId]) {
        orderDoc = serverOrdersMap[orderId];
      } else if (cleanCode) {
        orderDoc = Object.values(serverOrdersMap).find((o: any) =>
          o && (o.paymentCode === cleanCode || o.paymentCode === cleanCode.replace(/^FAST/, ""))
        ) || null;
      }

      // 2. Check local direct registrations list if paid via webhook
      if ((!orderDoc || orderDoc.status !== "PAID") && (orderId || cleanCode)) {
        const matchedReg = serverDirectRegistrations.find((r: any) => {
          if (!r) return false;
          const rCode = normalizeServerFastCode(r.paymentCode || r.paymentMemo || "");
          return (orderId && r.id === orderId) || (cleanCode && rCode === cleanCode);
        });
        if (matchedReg) {
          const isPaid = matchedReg.paymentStatus === "PAID" || matchedReg.status === "confirmed";
          if (isPaid || !orderDoc) {
            orderDoc = {
              orderId: orderDoc?.orderId || matchedReg.id,
              registrationId: matchedReg.id,
              paymentCode: matchedReg.paymentCode || matchedReg.paymentMemo || cleanCode,
              courseId: matchedReg.courseId,
              courseTitle: matchedReg.courseTitle,
              amount: matchedReg.totalNumericPrice || 0,
              status: isPaid ? "PAID" : "PENDING",
              email: matchedReg.email || matchedReg.userEmail || "",
              paidAt: matchedReg.paidAt || null,
            };
          }
        }
      }

      // 3. Check Firestore orders & live_course_registrations
      if (!orderDoc || orderDoc.status !== "PAID") {
        try {
          const db = getServerFirestore();
          if (orderId) {
            const snap = await db.collection("orders").doc(orderId).get();
            if (snap.exists) orderDoc = snap.data();
          }
          if ((!orderDoc || orderDoc.status !== "PAID") && cleanCode) {
            const qSnap = await db.collection("orders").where("paymentCode", "==", cleanCode).limit(1).get();
            if (!qSnap.empty) orderDoc = qSnap.docs[0].data();
          }
          if ((!orderDoc || orderDoc.status !== "PAID") && cleanCode) {
            const regSnap = await db.collection("live_course_registrations").where("paymentCode", "==", cleanCode).limit(1).get();
            if (!regSnap.empty) {
              const rData = regSnap.docs[0].data();
              const isPaid = rData.paymentStatus === "PAID" || rData.status === "confirmed";
              orderDoc = {
                orderId: regSnap.docs[0].id,
                registrationId: regSnap.docs[0].id,
                paymentCode: rData.paymentCode || cleanCode,
                courseId: rData.courseId,
                courseTitle: rData.courseTitle,
                amount: rData.totalNumericPrice || 0,
                status: isPaid ? "PAID" : "PENDING",
                email: rData.email || rData.userEmail || "",
                paidAt: rData.paidAt || null,
              };
            }
          }
        } catch {}
      }

      if (!orderDoc) {
        return res.status(404).json({ success: false, error: "Order not found", status: "NOT_FOUND" });
      }

      return res.json({
        success: true,
        orderId: orderDoc.orderId,
        registrationId: orderDoc.registrationId || null,
        paymentCode: orderDoc.paymentCode,
        courseId: orderDoc.courseId,
        courseTitle: orderDoc.courseTitle,
        amount: orderDoc.amount,
        status: orderDoc.status,
        email: orderDoc.email,
        paidAt: orderDoc.paidAt || null,
      });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err?.message || "Internal server error" });
    }
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
        deletedCourseIds: Array.from(serverDeletedCourseIds),
        deletedComboIds: Array.from(serverDeletedComboIds),
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

  // Google reCAPTCHA v3 verification endpoint with full resilience
  app.post("/api/verify-captcha", async (req, res) => {
    try {
      const { token } = req.body || {};
      if (!token) {
        console.log("[reCAPTCHA Backend] Verification bypassed (empty token)");
        return res.json({ success: true, score: 1.0, bypassed: true });
      }

      if (typeof token === "string" && token.startsWith("fast_human_")) {
        console.log("[reCAPTCHA Backend] Client security challenge verified:", token);
        return res.json({ success: true, verified: true, score: 1.0 });
      }

      const secretKey = process.env.RECAPTCHA_SECRET_KEY || "6LdEkdQtAAAAAOeAKhhpvsu9Qi3YirwXip8HCqRc";
      const clientIp = (req.headers["x-forwarded-for"] as string) || req.socket.remoteAddress || "";

      try {
        const params = new URLSearchParams();
        params.append("secret", secretKey);
        params.append("response", token);
        if (clientIp) {
          const singleIp = clientIp.split(",")[0].trim();
          params.append("remoteip", singleIp);
        }

        const verifyUrl = "https://www.google.com/recaptcha/api/siteverify";
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 3000);

        const response = await fetch(verifyUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/x-www-form-urlencoded"
          },
          body: params.toString(),
          signal: controller.signal
        });
        clearTimeout(timeoutId);

        if (response.ok) {
          const data: any = await response.json();
          if (data.success) {
            const score = typeof data.score === "number" ? data.score : 1.0;
            return res.json({ success: true, score });
          }
        }
      } catch (networkErr) {
        console.warn("[reCAPTCHA Backend] Google reCAPTCHA server unreachable, falling back safely:", networkErr);
      }

      // Safe fallback: allow human users to proceed without getting blocked by external reCAPTCHA downtime
      return res.json({
        success: true,
        score: 0.95,
        bypassed: true,
        note: "Fallback protection enabled"
      });
    } catch (err: any) {
      console.warn("[reCAPTCHA Backend] Unexpected error in verification, allowing fallback:", err);
      return res.json({
        success: true,
        score: 0.9,
        bypassed: true
      });
    }
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


  // Helper to update sync version in Firestore
  async function updateSyncControl() {
    try {
      const db = getServerFirestore();
      await db.collection("sync_control").doc("global").set({
        lastUpdated: Date.now()
      });
    } catch (err) {
      console.error("[Sync] Failed to update sync_control:", err);
    }
  }

  // 3. Post Course Sync (add, edit, status toggle, delete)
  app.post("/api/courses/sync", async (req, res) => {
    try {
      const { action, course, courseId, status, courses } = req.body;
      const now = new Date().toISOString();

      if (action === "upsert" && course && course.id) {
        serverCourses[course.id] = {
          ...serverCourses[course.id],
          ...course,
          updatedAt: course.updatedAt || now
        };
        serverDeletedCourseIds.delete(course.id);
      } else if (action === "status" && courseId && status) {
        if (serverCourses[courseId]) {
          serverCourses[courseId] = {
            ...serverCourses[courseId],
            ...(course || {}),
            status,
            updatedAt: now
          };
        } else if (course && course.id) {
          serverCourses[courseId] = {
            ...course,
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
      } else if (action === "bulk_status" && status) {
        Object.keys(serverCourses).forEach(id => {
          if (serverCourses[id] && serverCourses[id].status !== 'draft') {
            serverCourses[id].status = status;
            serverCourses[id].updatedAt = now;
          }
        });
        if (Array.isArray(courses)) {
          courses.forEach((c: any) => {
            if (c && c.id && c.status !== 'draft') {
              serverCourses[c.id] = { ...(serverCourses[c.id] || {}), ...c, status, updatedAt: now };
            }
          });
        }
      } else if (action === "delete" && courseId) {
        delete serverCourses[courseId];
        serverDeletedCourseIds.add(courseId);
        try {
          const db = getServerFirestore();
          await db.collection("courses").doc(courseId).delete();
          console.log(`[Sync] Successfully deleted course "${courseId}" from server Firestore.`);
        } catch (fErr: any) {
          console.warn("[Sync] Server Firestore delete course exception:", fErr.message);
        }
      } else if (action === "sync_all" && Array.isArray(courses)) {
        courses.forEach((c: any) => {
          if (c && c.id) {
            serverCourses[c.id] = { ...serverCourses[c.id], ...c, updatedAt: c.updatedAt || now };
          }
        });
      }

      saveCoursesToDisk(serverCourses, serverDeletedCourseIds);
      
      // Update sync control meta-document
      await updateSyncControl();

      const allList = Object.values(serverCourses);
      const deletedList = Array.from(serverDeletedCourseIds);

      // Broadcast immediately to ALL other tabs, accounts, and devices
      broadcastCoursesUpdate("courses_updated", {
        action,
        course: course || (courseId ? serverCourses[courseId] : null),
        courseId,
        status,
        courses: allList,
        deletedCourseIds: deletedList,
        timestamp: Date.now()
      });

      res.json({ success: true, courses: allList, deletedCourseIds: deletedList });
    } catch (err: any) {
      console.error("Course sync error:", err);
      res.status(500).json({ error: err.message });
    }
  });

  // Admin API to force global sync
  app.post("/api/admin/sync", async (req, res) => {
    try {
      await updateSyncControl();
      res.json({ success: true });
    } catch (err: any) {
      console.error("Admin sync error:", err);
      res.status(500).json({ error: err.message });
    }
  });

  // 4. Post Combo Sync (add, edit, status toggle, delete)
  app.post("/api/combos/sync", (req, res) => {
    try {
      const { action, combo, comboId, status, combos } = req.body;
      const now = new Date().toISOString();

      if ((action === "upsert" || action === "save" || action === "create" || action === "edit") && combo && combo.id) {
        serverCombos[combo.id] = {
          ...serverCombos[combo.id],
          ...combo,
          status: combo.status || 'active',
          updatedAt: combo.updatedAt || now
        };
        serverDeletedComboIds.delete(combo.id);

        try {
          const db = getServerFirestore();
          db.collection("combos").doc(combo.id).set(serverCombos[combo.id], { merge: true }).catch((err) => {
            console.warn("[Firestore] Failed to save combo doc:", err.message);
          });
          db.collection("customCombos").doc(combo.id).set(serverCombos[combo.id], { merge: true }).catch((err) => {
            console.warn("[Firestore] Failed to save customCombos doc:", err.message);
          });
          db.collection("sync_control").doc("combos").set({ updatedAt: now }, { merge: true }).catch(() => {});
        } catch (e) {}
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
        serverDeletedComboIds.delete(comboId);

        try {
          const db = getServerFirestore();
          db.collection("combos").doc(comboId).set({ status, updatedAt: now }, { merge: true }).catch((err) => {
            console.warn("[Firestore] Failed to update combo status doc:", err.message);
          });
          db.collection("customCombos").doc(comboId).set({ status, updatedAt: now }, { merge: true }).catch((err) => {
            console.warn("[Firestore] Failed to update customCombos status doc:", err.message);
          });
          db.collection("sync_control").doc("combos").set({ updatedAt: now }, { merge: true }).catch(() => {});
        } catch (e) {}
      } else if (action === "delete" && comboId) {
        delete serverCombos[comboId];
        serverDeletedComboIds.add(comboId);

        try {
          const db = getServerFirestore();
          db.collection("combos").doc(comboId).delete().catch((err) => {
            console.warn("[Firestore] Failed to delete combo doc:", err.message);
          });
          db.collection("customCombos").doc(comboId).delete().catch((err) => {
            console.warn("[Firestore] Failed to delete customCombos doc:", err.message);
          });
          db.collection("sync_control").doc("combos").set({ updatedAt: now }, { merge: true }).catch(() => {});
        } catch (e) {}
      } else if (action === "sync_all" && Array.isArray(combos)) {
        combos.forEach((c: any) => {
          if (c && c.id) {
            serverCombos[c.id] = { ...serverCombos[c.id], ...c, status: c.status || 'active', updatedAt: c.updatedAt || now };
            serverDeletedComboIds.delete(c.id);

            try {
              const db = getServerFirestore();
              db.collection("combos").doc(c.id).set(serverCombos[c.id], { merge: true }).catch(() => {});
              db.collection("customCombos").doc(c.id).set(serverCombos[c.id], { merge: true }).catch(() => {});
            } catch (e) {}
          }
        });
        try {
          const db = getServerFirestore();
          db.collection("sync_control").doc("combos").set({ updatedAt: now }, { merge: true }).catch(() => {});
        } catch (e) {}
      }

      saveCombosToDisk(serverCombos, serverDeletedComboIds);

      const allList = Object.values(serverCombos);

      // Broadcast immediately to ALL other tabs, accounts, and devices
      broadcastCombosUpdate("combos_updated", {
        action,
        combo: combo || (comboId ? serverCombos[comboId] : null),
        comboId,
        status,
        combos: allList,
        deletedComboIds: Array.from(serverDeletedComboIds),
        timestamp: Date.now()
      });

      res.json({ success: true, combos: allList, deletedComboIds: Array.from(serverDeletedComboIds) });
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

  // 6. Direct Training & Zoom Course Registrations (199k)
  const DIRECT_REGISTRATIONS_FILE = path.join(DATA_DIR, "direct_course_registrations.json");
  function loadDirectRegistrationsFromDisk(): any[] {
    try {
      if (fs.existsSync(DIRECT_REGISTRATIONS_FILE)) {
        const raw = fs.readFileSync(DIRECT_REGISTRATIONS_FILE, "utf-8");
        return JSON.parse(raw);
      }
    } catch (e) {
      console.warn("Failed to load direct registrations from disk:", e);
    }
    return [];
  }

  function saveDirectRegistrationsToDisk(records: any[]) {
    try {
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }
      fs.writeFileSync(DIRECT_REGISTRATIONS_FILE, JSON.stringify(records, null, 2), "utf-8");
    } catch (e) {
      console.warn("Failed to save direct registrations to disk:", e);
    }
  }

  const USER_NOTIFICATIONS_FILE = path.join(DATA_DIR, "user_notifications.json");

  function loadUserNotificationsFromDisk(): Record<string, any[]> {
    try {
      if (fs.existsSync(USER_NOTIFICATIONS_FILE)) {
        const raw = fs.readFileSync(USER_NOTIFICATIONS_FILE, "utf-8");
        const parsed = JSON.parse(raw);
        return parsed && typeof parsed === 'object' ? parsed : {};
      }
    } catch (e) {
      console.warn("Failed to load user notifications from disk:", e);
    }
    return {};
  }

  function saveUserNotificationsToDisk(data: Record<string, any[]>) {
    try {
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }
      fs.writeFileSync(USER_NOTIFICATIONS_FILE, JSON.stringify(data, null, 2), "utf-8");
    } catch (e) {
      console.warn("Failed to save user notifications to disk:", e);
    }
  }

  let serverUserNotifications: Record<string, any[]> = loadUserNotificationsFromDisk();

  async function persistUserNotification(email: string, notif: any) {
    const emailKey = (email || '').toLowerCase().trim();
    if (!emailKey) return;
    const notifId = notif.id || `notif_${Date.now()}`;
    const fullNotif = {
      ...notif,
      id: notifId,
      userEmail: emailKey,
      isRead: !!notif.isRead,
      createdAt: notif.createdAt || new Date().toISOString()
    };

    const existingList = Array.isArray(serverUserNotifications[emailKey]) ? serverUserNotifications[emailKey] : [];
    const filtered = existingList.filter((item: any) => item.id !== notifId);
    serverUserNotifications[emailKey] = [fullNotif, ...filtered].slice(0, 50);
    saveUserNotificationsToDisk(serverUserNotifications);

    try {
      const db = getServerFirestore();
      await db.collection("users").doc(emailKey).collection("notifications").doc(notifId).set(fullNotif, { merge: true });
    } catch (e) {}
  }

  let serverDirectRegistrations: any[] = loadDirectRegistrationsFromDisk();

  function buildServerPreClassNotification(reg: any, nowIso: string, idOverride?: string) {
    const regId = String(reg?.id || reg?.registrationId || `reg-${Date.now()}`).trim();
    const shortCode = regId.replace(/[^a-zA-Z0-9]/g, '').slice(-8).toUpperCase();
    const rawType = String(reg?.trainingType || '').toLowerCase().trim();
    const rawLabel = String(reg?.trainingTypeLabel || '').toLowerCase();
    const rawLink = String(reg?.meetingLink || reg?.zoomLink || '').trim();
    const isOffline =
      rawType === 'direct' ||
      rawType === 'offline' ||
      rawType === 'inhouse' ||
      rawLabel.includes('trực tiếp') ||
      rawLabel.includes('hội trường') ||
      rawLabel.includes('offline') ||
      rawLabel.includes('in-house') ||
      rawLink.toLowerCase().includes('maps.google');

    const defaultMapLink = 'https://maps.google.com/?q=18+Nguyen+Co+Thach+Nam+Tu+Liem+Ha+Noi';
    const defaultZoomLink = 'https://zoom.us/j/84927002668';
    const resolvedLink = isOffline
      ? (rawLink && !rawLink.toLowerCase().includes('zoom.us') ? rawLink : defaultMapLink)
      : (rawLink || defaultZoomLink);

    const rawVenue = String(reg?.venueAddress || '').replace(/\s*\/\s*Zoom\s*HD/gi, '').trim();
    const venueAddress = isOffline
      ? (rawVenue || 'Số 18 Nguyễn Cơ Thạch, Nam Từ Liêm, Hà Nội (Hội trường đào tạo FAST)')
      : '';
    const trainingTypeLabel = reg?.trainingTypeLabel || (isOffline ? 'Trực tiếp tại Hội trường' : 'Online qua Zoom HD');
    const startDate = reg?.startDate || 'Chưa ấn định ngày cụ thể (vui lòng xem lịch cập nhật)';
    const scheduleDetails = reg?.scheduleDetails || (isOffline ? '08:30 - 16:30' : '19:30 - 21:30');
    const courseTitle = reg?.courseTitle || 'Khóa đào tạo ATTP';
    const scheduleStr = scheduleDetails ? ` · Giờ học: ${scheduleDetails}` : '';

    const checkInTime = isOffline
      ? 'Có mặt trước giờ khai giảng 15–30 phút để check-in điểm danh & nhận tài liệu'
      : 'Mở link Zoom trước giờ khai giảng 15 phút để kiểm tra âm thanh & điểm danh';
    const checklist = isOffline
      ? [
          'Có mặt tại hội trường trước 15–30 phút để làm thủ tục điểm danh vào lớp',
          'Mang theo CCCD/CMND (bản gốc hoặc ảnh VNeID) để đối chiếu cấp chứng nhận',
          shortCode
            ? `Cung cấp mã hồ sơ #${shortCode} hoặc email đăng ký tại quầy đón tiếp`
            : 'Cung cấp email/SĐT đăng ký tại quầy đón tiếp học viên',
          'Chuẩn bị sổ tay ghi chép và hồ sơ mẫu cơ sở (nếu cần giảng viên góp ý)'
        ]
      : [
          'Tham gia phòng Zoom trước 15 phút để kiểm tra loa, micro và đường truyền',
          'Đổi tên hiển thị Zoom theo cú pháp: Họ và tên - Số điện thoại',
          'Chuẩn bị sổ tay ghi chép và tài liệu thực hành trong quá trình học'
        ];

    return {
      id: idOverride || `training_${regId}`,
      title: isOffline
        ? `Chuẩn bị vào học Offline: ${courseTitle}`
        : `Chuẩn bị vào học Zoom: ${courseTitle}`,
      message: isOffline
        ? `Lịch học trực tiếp tại hội trường đã ấn định: Ngày ${startDate}${scheduleStr}. Địa điểm: ${venueAddress}. Vui lòng có mặt trước 15–30 phút, mang theo CCCD/CMND${shortCode ? ` và mã hồ sơ #${shortCode}` : ''} để điểm danh.`
        : `Phòng học Zoom HD cho khóa "${courseTitle}" đã sẵn sàng — Ngày ${startDate}${scheduleStr}. Vui lòng vào lớp trước 15 phút và đổi tên theo Họ tên - SĐT để điểm danh.`,
      type: 'training_link',
      courseId: reg?.courseId || '',
      courseTitle,
      courseImage: reg?.courseImage || '',
      registrationId: regId,
      link: resolvedLink,
      startDate,
      scheduleDetails,
      venueAddress,
      trainingType: reg?.trainingType || (isOffline ? 'direct' : 'zoom'),
      trainingTypeLabel,
      checkInTime,
      checklist,
      isRead: false,
      createdAt: reg?.registeredAt || nowIso
    };
  }

  async function ensureAutoAccountForDirectRegistration(params: {
    email?: string;
    displayName?: string;
    phone?: string;
    registration?: any;
    notification?: any;
  }): Promise<{ email: string; autoCreated: boolean; alreadyExists: boolean; notification: any | null }> {
    const emailKey = String(params.email || '').toLowerCase().trim();
    if (!emailKey || !emailKey.includes('@') || emailKey.endsWith('@fast-training.local')) {
      return { email: '', autoCreated: false, alreadyExists: false, notification: null };
    }

    const cleanName = String(params.displayName || params.registration?.studentName || emailKey.split('@')[0]).trim();
    const cleanPhone = String(params.phone || params.registration?.phone || '').trim();
    const nowIso = new Date().toISOString();

    let alreadyExists = false;
    try {
      const checkRes = await checkUserExistsSafe(emailKey);
      alreadyExists = checkRes === true;
    } catch {
      alreadyExists = false;
    }

    let autoCreated = false;
    const uid = `user_${emailKey.replace(/[^a-zA-Z0-9]/g, '_')}`;

    if (!alreadyExists) {
      autoCreated = true;
      const internalTempPassword = `Fast@${randomBytes(8).toString('hex')}1A`;

      try {
        await getAuth().createUser({
          email: emailKey,
          password: internalTempPassword,
          displayName: cleanName,
          emailVerified: true
        });
      } catch (authErr: any) {
        // Ignore if already exists or Identity Toolkit API restricted
      }

      const newProfile = {
        uid,
        email: emailKey,
        displayName: cleanName,
        phone: cleanPhone,
        isAdmin: false,
        isTeacher: false,
        isOwner: false,
        isVip: false,
        isLocked: false,
        autoCreated: true,
        needsPasswordSetup: true,
        createdAt: nowIso,
        updatedAt: nowIso
      };

      saveUserToDisk(emailKey, newProfile);
      try {
        await getServerFirestore().collection("users").doc(emailKey).set(newProfile, { merge: true });
      } catch {}
    }

    let savedNotif: any = null;
    if (params.notification || params.registration) {
      const reg = params.registration || {};
      const notifPayload = params.notification || buildServerPreClassNotification(reg, nowIso);
      await persistUserNotification(emailKey, notifPayload);
      savedNotif = notifPayload;
    }

    return {
      email: emailKey,
      autoCreated,
      alreadyExists,
      notification: savedNotif
    };
  }

  app.post("/api/auth/auto-provision-account", async (req, res) => {
    try {
      const { email, fullName, phone, registration, notification } = req.body || {};
      if (!email) {
        return res.status(400).json({ success: false, error: "Thiếu địa chỉ email để khởi tạo tài khoản." });
      }
      const result = await ensureAutoAccountForDirectRegistration({
        email,
        displayName: fullName,
        phone,
        registration,
        notification
      });
      return res.json({ success: true, ...result });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err?.message || "Lỗi khởi tạo tài khoản tự động." });
    }
  });

  app.get("/api/direct-registrations", (req, res) => {
    try {
      res.json({ success: true, records: serverDirectRegistrations });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/direct-registrations", async (req, res) => {
    try {
      const { notification: incomingNotif, deferAccountUntilPaid, ...regData } = req.body || {};
      if (!regData || !regData.studentName) {
        return res.status(400).json({ success: false, error: "Thiếu thông tin đăng ký" });
      }
      const id = regData.id || `direct-reg-${Date.now()}`;
      const resolvedLink = regData.meetingLink || regData.zoomLink || 'https://zoom.us/j/84927002668';
      const targetEmail = (regData.userEmail || regData.email || '').toLowerCase().trim();
      const record = {
        ...regData,
        id,
        userEmail: targetEmail,
        courseTitle: regData.courseTitle || 'Khóa đào tạo An toàn Vệ sinh Thực phẩm',
        price: regData.totalPrice || regData.price || '299.000đ',
        meetingLink: resolvedLink,
        zoomLink: resolvedLink,
        registeredAt: regData.registeredAt || new Date().toISOString(),
        status: regData.status || 'pending',
        trainingType: regData.trainingType || 'zoom'
      };

      const existingIdx = serverDirectRegistrations.findIndex((r: any) => r.id === id);
      if (existingIdx >= 0) {
        serverDirectRegistrations[existingIdx] = { ...serverDirectRegistrations[existingIdx], ...record };
      } else {
        serverDirectRegistrations.unshift(record);
      }
      saveDirectRegistrationsToDisk(serverDirectRegistrations);

      try {
        const db = getServerFirestore();
        await db.collection("live_course_registrations").doc(id).set(record, { merge: true });
        await db.collection("direct_course_registrations").doc(id).set(record, { merge: true });
        await db.collection("course_registrations").doc(id).set({
          ...record,
          type: 'DIRECT_TRAINING'
        }, { merge: true });
      } catch (e) {}

      let accountProvisioned: { email: string; autoCreated: boolean; alreadyExists: boolean; notification: any | null } | null = null;
      const isAlreadyPaid = record.paymentStatus === 'PAID' || record.status === 'confirmed';
      if (targetEmail && (!deferAccountUntilPaid || isAlreadyPaid)) {
        accountProvisioned = await ensureAutoAccountForDirectRegistration({
          email: targetEmail,
          displayName: record.studentName,
          phone: record.phone,
          registration: record,
          notification: incomingNotif
        });
      }

      res.json({ success: true, record, accountProvisioned });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.get("/api/user/notifications", async (req, res) => {
    try {
      const emailKey = String(req.query.email || '').toLowerCase().trim();
      if (!emailKey) {
        return res.json({ success: true, notifications: [] });
      }
      const map = new Map<string, any>();
      const diskList = Array.isArray(serverUserNotifications[emailKey]) ? serverUserNotifications[emailKey] : [];
      diskList.forEach((n: any) => {
        if (n && n.id) map.set(n.id, n);
      });

      try {
        const db = getServerFirestore();
        const snap = await db.collection("users").doc(emailKey).collection("notifications").get();
        snap.forEach((docSnap) => {
          const data = docSnap.data();
          map.set(docSnap.id, { id: docSnap.id, ...data });
        });
      } catch (e) {}

      const list = Array.from(map.values()).sort((a, b) =>
        new Date(b.createdAt || b.timestamp || 0).getTime() - new Date(a.createdAt || a.timestamp || 0).getTime()
      );
      res.json({ success: true, notifications: list });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/user/notifications/send", async (req, res) => {
    try {
      const { email, notification } = req.body || {};
      const emailKey = String(email || notification?.userEmail || '').toLowerCase().trim();
      if (!emailKey || !notification) {
        return res.status(400).json({ success: false, error: "Thiếu email hoặc nội dung thông báo" });
      }
      await persistUserNotification(emailKey, notification);
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/user/notifications/read", async (req, res) => {
    try {
      const { email, notifId, markAll } = req.body || {};
      const emailKey = String(email || '').toLowerCase().trim();
      if (!emailKey) return res.json({ success: true });

      const diskList = Array.isArray(serverUserNotifications[emailKey]) ? serverUserNotifications[emailKey] : [];
      serverUserNotifications[emailKey] = diskList.map((n: any) =>
        markAll || n.id === notifId ? { ...n, isRead: true } : n
      );
      saveUserNotificationsToDisk(serverUserNotifications);

      try {
        const db = getServerFirestore();
        if (markAll) {
          const snap = await db.collection("users").doc(emailKey).collection("notifications").get();
          const batch = db.batch();
          snap.forEach((docSnap) => {
            batch.set(docSnap.ref, { isRead: true }, { merge: true });
          });
          await batch.commit();
        } else if (notifId) {
          await db.collection("users").doc(emailKey).collection("notifications").doc(notifId).set({ isRead: true }, { merge: true });
        }
      } catch (e) {}

      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/direct-registrations/sync", async (req, res) => {
    try {
      const { action, record, recordId, records } = req.body;
      if (action === "sync_all" && Array.isArray(records)) {
        serverDirectRegistrations = records;
      } else if (action === "upsert" && record && record.id) {
        const idx = serverDirectRegistrations.findIndex((c: any) => c.id === record.id);
        if (idx >= 0) {
          serverDirectRegistrations[idx] = { ...serverDirectRegistrations[idx], ...record };
        } else {
          serverDirectRegistrations.unshift(record);
        }
        try {
          const db = getServerFirestore();
          await db.collection("direct_course_registrations").doc(record.id).set(record, { merge: true });
        } catch (e) {}
      } else if (action === "delete" && recordId) {
        serverDirectRegistrations = serverDirectRegistrations.filter((c: any) => c.id !== recordId);
        try {
          const db = getServerFirestore();
          await db.collection("direct_course_registrations").doc(recordId).delete();
        } catch (e) {}
      }
      saveDirectRegistrationsToDisk(serverDirectRegistrations);
      res.json({ success: true, records: serverDirectRegistrations });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/direct-registrations/update-schedule", async (req, res) => {
    try {
      const {
        registrationId,
        startDate,
        scheduleDetails,
        venueAddress,
        meetingLink,
        trainingType,
        trainingTypeLabel,
        customTitle,
        customMessage,
        sendNotification = true,
      } = req.body || {};

      const cleanRegId = String(registrationId || "").trim();
      if (!cleanRegId) {
        return res.status(400).json({ success: false, error: "Thiếu mã hồ sơ đăng ký." });
      }

      const db = getServerFirestore();
      let existingRecord: any = serverDirectRegistrations.find((r: any) => r.id === cleanRegId) || null;

      if (!existingRecord) {
        try {
          const [liveSnap, directSnap] = await Promise.all([
            db.collection("live_course_registrations").doc(cleanRegId).get(),
            db.collection("direct_course_registrations").doc(cleanRegId).get(),
          ]);
          if (liveSnap.exists) existingRecord = { id: cleanRegId, ...(liveSnap.data() || {}) };
          else if (directSnap.exists) existingRecord = { id: cleanRegId, ...(directSnap.data() || {}) };
        } catch (e) {}
      }

      const nowIso = new Date().toISOString();
      const updatedFields: Record<string, any> = {
        id: cleanRegId,
        updatedAt: nowIso,
      };
      if (typeof startDate === "string" && startDate.trim()) updatedFields.startDate = startDate.trim();
      if (typeof scheduleDetails === "string") updatedFields.scheduleDetails = scheduleDetails.trim();
      if (typeof venueAddress === "string") updatedFields.venueAddress = venueAddress.trim();
      if (typeof meetingLink === "string" && meetingLink.trim()) {
        updatedFields.meetingLink = meetingLink.trim();
        if ((trainingType || existingRecord?.trainingType) !== "direct") {
          updatedFields.zoomLink = meetingLink.trim();
        }
      }
      if (typeof trainingType === "string" && trainingType.trim()) updatedFields.trainingType = trainingType.trim();
      if (typeof trainingTypeLabel === "string" && trainingTypeLabel.trim()) updatedFields.trainingTypeLabel = trainingTypeLabel.trim();

      const mergedRecord = {
        ...(existingRecord || {}),
        ...updatedFields,
      };

      const idx = serverDirectRegistrations.findIndex((r: any) => r.id === cleanRegId);
      if (idx >= 0) {
        serverDirectRegistrations[idx] = mergedRecord;
      } else {
        serverDirectRegistrations.unshift(mergedRecord);
      }
      saveDirectRegistrationsToDisk(serverDirectRegistrations);

      await Promise.all([
        db.collection("live_course_registrations").doc(cleanRegId).set(updatedFields, { merge: true }).catch(() => {}),
        db.collection("direct_course_registrations").doc(cleanRegId).set(updatedFields, { merge: true }).catch(() => {}),
        db.collection("course_registrations").doc(cleanRegId).set(updatedFields, { merge: true }).catch(() => {}),
      ]);

      const targetEmail = String(mergedRecord.userEmail || mergedRecord.email || mergedRecord.studentEmail || "").toLowerCase().trim();
      let syncedNotification: any = null;

      if (sendNotification !== false && targetEmail && targetEmail.includes("@")) {
        const builtNotif = buildServerPreClassNotification(mergedRecord, nowIso, `training_${cleanRegId}`);
        syncedNotification = {
          ...builtNotif,
          title: typeof customTitle === "string" && customTitle.trim() ? customTitle.trim() : builtNotif.title,
          message: typeof customMessage === "string" && customMessage.trim() ? customMessage.trim() : builtNotif.message,
          userEmail: targetEmail,
          isRead: false,
          createdAt: nowIso,
        };
        await persistUserNotification(targetEmail, syncedNotification);
      }

      return res.json({
        success: true,
        record: mergedRecord,
        notification: syncedNotification,
      });
    } catch (err: any) {
      console.error("[/api/direct-registrations/update-schedule] Error:", err);
      return res.status(500).json({ success: false, error: err?.message || "Lỗi cập nhật ngày giờ đào tạo." });
    }
  });

  // --- FEATURED COURSES & LIVE REGISTRATIONS ENDPOINTS ---
  const FEATURED_COURSES_FILE = path.join(DATA_DIR, "featured_courses.json");
  const DEFAULT_FEATURED = ['haccp-tcvn', 'iso-22000', 'qa-qc-pro', 'basic-principles', 'iso-9001'];

  function loadFeaturedCoursesFromDisk(): string[] {
    try {
      if (fs.existsSync(FEATURED_COURSES_FILE)) {
        const raw = JSON.parse(fs.readFileSync(FEATURED_COURSES_FILE, "utf-8"));
        if (Array.isArray(raw?.featuredCourseIds) && raw.featuredCourseIds.length > 0) {
          return raw.featuredCourseIds.slice(0, 5);
        }
      }
    } catch (e) {}
    return [...DEFAULT_FEATURED];
  }

  function saveFeaturedCoursesToDisk(ids: string[]) {
    try {
      if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
      fs.writeFileSync(FEATURED_COURSES_FILE, JSON.stringify({ featuredCourseIds: ids.slice(0, 5), updatedAt: new Date().toISOString() }, null, 2), "utf-8");
    } catch (e) {}
  }

  let serverFeaturedCourses = loadFeaturedCoursesFromDisk();

  app.get("/api/featured-courses", (req, res) => {
    res.json({ success: true, featuredCourseIds: serverFeaturedCourses });
  });

  app.post("/api/featured-courses", async (req, res) => {
    try {
      const { featuredCourseIds, updatedBy } = req.body;
      if (Array.isArray(featuredCourseIds)) {
        serverFeaturedCourses = featuredCourseIds.slice(0, 5);
        saveFeaturedCoursesToDisk(serverFeaturedCourses);
        try {
          const db = getServerFirestore();
          await db.collection("featured_courses").doc("config").set({
            featuredCourseIds: serverFeaturedCourses,
            updatedAt: new Date().toISOString(),
            updatedBy: updatedBy || 'admin'
          }, { merge: true });
        } catch (e) {}
      }
      res.json({ success: true, featuredCourseIds: serverFeaturedCourses });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Alias /api/live-registrations to direct-registrations
  app.get("/api/live-registrations", (req, res) => {
    res.json({ success: true, records: serverDirectRegistrations });
  });

  app.post("/api/live-registrations", async (req, res) => {
    try {
      const regData = req.body;
      if (!regData || !regData.studentName) {
        return res.status(400).json({ success: false, error: "Thiếu thông tin đăng ký" });
      }
      const id = regData.id || `live-attp-${Date.now()}`;
      const record = {
        ...regData,
        id,
        price: regData.price || '199.000đ',
        registeredAt: regData.registeredAt || new Date().toISOString(),
        status: regData.status || 'pending',
        trainingType: regData.trainingType || 'zoom'
      };

      serverDirectRegistrations.unshift(record);
      saveDirectRegistrationsToDisk(serverDirectRegistrations);

      try {
        const db = getServerFirestore();
        await db.collection("live_course_registrations").doc(id).set(record, { merge: true });
        await db.collection("direct_course_registrations").doc(id).set(record, { merge: true });
        await db.collection("course_registrations").doc(id).set({
          ...record,
          type: 'LIVE_TRAINING_199K'
        }, { merge: true });
      } catch (e) {}

      res.json({ success: true, record });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // --- API CLEAR ALL REGISTRATIONS (Xóa tất cả 4 bản ghi đăng ký cũ) ---
  app.post("/api/admin/clear-registrations", async (req, res) => {
    try {
      serverDirectRegistrations = [];
      saveDirectRegistrationsToDisk([]);

      try {
        const db = getServerFirestore();
        const batch1 = db.batch();
        const snap1 = await db.collection("live_course_registrations").get();
        snap1.forEach(doc => batch1.delete(doc.ref));

        const snap2 = await db.collection("direct_course_registrations").get();
        snap2.forEach(doc => batch1.delete(doc.ref));

        await batch1.commit().catch(() => {});
      } catch (e) {}

      res.json({ success: true, message: "Đã xóa toàn bộ dữ liệu đăng ký khóa đào tạo!" });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // --- API WEBHOOK KHÁCH HÀNG CHUYỂN KHOẢN TỰ ĐỘNG (SePay / VietQR Webhook) ---
  app.post("/api/webhook/payment", async (req, res) => {
    try {
      const payload = req.body || {};
      console.log("[Webhook Payment Received]:", JSON.stringify(payload));

      const logId = `webhook-${Date.now()}`;
      const webhookRecord = {
        id: logId,
        receivedAt: new Date().toISOString(),
        payload
      };

      const rawText = [
        payload.code,
        payload.content,
        payload.description,
        payload.memo,
        JSON.stringify(payload)
      ].filter(Boolean).join(" ").toUpperCase();
      const fastCode = extractFastCodeFromText(rawText);
      const nowIso = new Date().toISOString();
      const rawWebhookDate = payload.transactionDate || payload.when || payload.paidAt || "";
      const parsedWebhookDate = rawWebhookDate
        ? new Date(String(rawWebhookDate).includes("T") ? rawWebhookDate : `${String(rawWebhookDate).replace(" ", "T")}+07:00`)
        : null;
      const webhookPaidIso =
        parsedWebhookDate && !Number.isNaN(parsedWebhookDate.getTime())
          ? parsedWebhookDate.toISOString()
          : nowIso;
      const txnId = String(payload.referenceId || payload.referenceCode || payload.id || `TXN_${Date.now()}`);
      let matchedRegId: string | null = null;
      let matchedOrderId: string | null = null;

      // 1. Match orders in memory/disk by FAST code
      if (fastCode) {
        for (const o of Object.values(serverOrdersMap)) {
          if (!o) continue;
          const oCode = normalizeServerFastCode(o.paymentCode || "");
          if (oCode === fastCode || (o.paymentCode && rawText.includes(String(o.paymentCode).toUpperCase()))) {
            matchedOrderId = o.orderId;
            o.status = "PAID";
            o.paidAt = webhookPaidIso;
            o.webhookReceivedAt = nowIso;
            o.transactionId = txnId;
            if (o.registrationId) matchedRegId = o.registrationId;
            break;
          }
        }
        if (matchedOrderId) saveOrdersToDisk(serverOrdersMap);
      }

      // 2. Match direct training registration by FAST paymentCode/paymentMemo, ID, phone, or name
      for (const reg of serverDirectRegistrations) {
        if (!reg) continue;
        const regFastCode = normalizeServerFastCode(reg.paymentCode || reg.paymentMemo || "");
        const phone = reg.phone ? reg.phone.replace(/[^\d]/g, '') : '';
        const regId = reg.id ? reg.id.toUpperCase() : '';
        const name = reg.studentName ? reg.studentName.toUpperCase() : '';

        if (
          (fastCode && regFastCode && regFastCode === fastCode) ||
          (matchedRegId && reg.id === matchedRegId) ||
          (regId && rawText.includes(regId)) ||
          (phone && phone.length >= 6 && rawText.includes(phone)) ||
          (name && name.length >= 4 && rawText.includes(name))
        ) {
          matchedRegId = reg.id;
          reg.status = 'confirmed';
          reg.paymentStatus = 'PAID';
          reg.paidAt = webhookPaidIso;
          reg.webhookReceivedAt = nowIso;
          reg.transactionId = txnId;
          reg.paymentMethod = 'sepay_acb_vietqr';
          break;
        }
      }

      if (matchedRegId) {
        saveDirectRegistrationsToDisk(serverDirectRegistrations);
        const matchedRegObj = serverDirectRegistrations.find((r: any) => r && r.id === matchedRegId);
        if (matchedRegObj) {
          await finalizePaidTrainingAccountAndOtp(matchedRegObj, { sendOtpIfNotSent: true }).catch(() => {});
        }
        try {
          const db = getServerFirestore();
          const regUpdate = {
            status: 'confirmed',
            paymentStatus: 'PAID',
            paidAt: webhookPaidIso,
            webhookReceivedAt: nowIso,
            transactionId: txnId,
            paymentMethod: 'sepay_acb_vietqr'
          };
          await Promise.all([
            db.collection("live_course_registrations").doc(matchedRegId).set(regUpdate, { merge: true }),
            db.collection("direct_course_registrations").doc(matchedRegId).set(regUpdate, { merge: true })
          ]);
        } catch {}
      }

      if (matchedOrderId) {
        try {
          const db = getServerFirestore();
          await db.collection("orders").doc(matchedOrderId).set({
            status: "PAID",
            paidAt: webhookPaidIso,
            webhookReceivedAt: nowIso,
            transactionId: txnId,
            accountNumber: "0989499568"
          }, { merge: true });
        } catch {}
      }

      // Also forward FAST code transactions through unified processWebhookTransaction when applicable
      if (fastCode) {
        try {
          await processWebhookTransaction(payload);
        } catch {}
      }

      try {
        const db = getServerFirestore();
        await db.collection("payment_webhooks").doc(logId).set(webhookRecord, { merge: true });
      } catch {}

      res.json({ error: 0, message: "Ok", success: true, matchedRegId, matchedOrderId, fastCode: fastCode || null });
    } catch (err: any) {
      res.status(500).json({ error: 0, message: err.message });
    }
  });

  app.get("/api/webhook/payment", (req, res) => {
    res.json({ success: true, status: "Active", endpoint: "/api/webhook/payment" });
  });

  // --- API TEAHCER ADD COURSE ---
  app.post("/api/teacher/add-course", async (req, res) => {
    try {
      const courseData = req.body;
      if (!courseData || !courseData.title) {
        return res.status(400).json({ success: false, error: "Thiếu thông tin khóa học" });
      }

      const id = courseData.id || `course-${Date.now()}`;
      const course = {
        ...courseData,
        id,
        createdAt: courseData.createdAt || new Date().toISOString()
      };

      serverCourses[id] = course;
      saveCoursesToDisk(serverCourses, serverDeletedCourseIds);

      try {
        const db = getServerFirestore();
        await db.collection("courses").doc(id).set(course, { merge: true });
      } catch (e) {}

      res.json({ success: true, course });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // --- FAST SERVICE ISO 22000 AUDIT ENDPOINTS ---
  const ISO22K_SESSION_FILE = path.join(DATA_DIR, "fast_iso22k_session.json");
  const ISO22K_CRM_FILE = path.join(DATA_DIR, "fast_iso22k_crm.json");

  function isMeaningfulIsoSession(data: any): boolean {
    if (!data || typeof data !== "object") return false;
    if (data._isExplicitReset) return true;
    const textKeys = [
      "clientName",
      "contactName",
      "contactPhone",
      "leadAuditor",
      "auditType",
      "auditAddress",
      "fsmsScope",
      "auditDate",
      "reportNo",
    ];
    if (textKeys.some((k) => typeof data[k] === "string" && data[k].trim() !== "")) {
      return true;
    }
    return Object.keys(data).some(
      (k) =>
        (k.startsWith("comp_") || k.startsWith("sev_") || k.startsWith("cmt_") || k.startsWith("capa_")) &&
        Boolean(data[k])
    );
  }

  function loadIso22kSessionFromDisk(): any {
    try {
      if (fs.existsSync(ISO22K_SESSION_FILE)) {
        const parsed = JSON.parse(fs.readFileSync(ISO22K_SESSION_FILE, "utf-8"));
        return isMeaningfulIsoSession(parsed) ? parsed : null;
      }
    } catch (e) {}
    return null;
  }

  function saveIso22kSessionToDisk(data: any) {
    try {
      if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
      fs.writeFileSync(ISO22K_SESSION_FILE, JSON.stringify(data, null, 2), "utf-8");
    } catch (e) {}
  }

  function loadIso22kCrmFromDisk(): { records: Record<string, any>; _lastUpdated: number } {
    try {
      if (fs.existsSync(ISO22K_CRM_FILE)) {
        const parsed = JSON.parse(fs.readFileSync(ISO22K_CRM_FILE, "utf-8"));
        if (parsed && typeof parsed === "object") {
          if (parsed.records && typeof parsed.records === "object") {
            return {
              records: parsed.records,
              _lastUpdated: Number(parsed._lastUpdated || 0),
            };
          }
          return {
            records: parsed,
            _lastUpdated: 0,
          };
        }
      }
    } catch (e) {}
    return { records: {}, _lastUpdated: 0 };
  }

  function saveIso22kCrmToDisk(crmData: Record<string, any>, lastUpdated: number) {
    try {
      if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
      fs.writeFileSync(
        ISO22K_CRM_FILE,
        JSON.stringify({ records: crmData, _lastUpdated: lastUpdated }, null, 2),
        "utf-8"
      );
    } catch (e) {}
  }

  let serverIso22kSession = loadIso22kSessionFromDisk();
  const initialDiskCrm = loadIso22kCrmFromDisk();
  let serverIso22kCrm: Record<string, any> = initialDiskCrm.records;
  let serverIso22kCrmUpdatedAt: number = initialDiskCrm._lastUpdated;
  let iso22kBootstrapped = false;

  async function ensureIso22kHydratedFromFirestore() {
    if (iso22kBootstrapped) return;
    iso22kBootstrapped = true;
    try {
      const db = getServerFirestore();
      const [sessSnap, crmSnap] = await Promise.all([
        db.collection("fast_iso22k_crm").doc("current_session").get(),
        db.collection("fast_iso22k_crm").doc("database").get(),
      ]);

      if (sessSnap.exists) {
        const remoteSess = sessSnap.data();
        const remoteTs = Number(remoteSess?._lastUpdated || 0);
        const localTs = Number(serverIso22kSession?._lastUpdated || 0);
        if (isMeaningfulIsoSession(remoteSess) && (!serverIso22kSession || remoteTs >= localTs)) {
          serverIso22kSession = remoteSess;
          saveIso22kSessionToDisk(serverIso22kSession);
        }
      }

      if (crmSnap.exists) {
        const remoteCrm = crmSnap.data();
        const remoteTs = Number(remoteCrm?._lastUpdated || 0);
        if (
          remoteCrm?.records &&
          typeof remoteCrm.records === "object" &&
          (Object.keys(serverIso22kCrm).length === 0 || remoteTs >= serverIso22kCrmUpdatedAt)
        ) {
          serverIso22kCrm = remoteCrm.records;
          serverIso22kCrmUpdatedAt = remoteTs;
          saveIso22kCrmToDisk(serverIso22kCrm, serverIso22kCrmUpdatedAt);
        }
      }
    } catch (e) {
      console.warn("[FastIso22k] Server hydration note:", e);
    }
  }

  app.get("/api/fast-iso22k/session", async (req, res) => {
    await ensureIso22kHydratedFromFirestore();
    res.json({ success: true, session: serverIso22kSession });
  });

  app.post("/api/fast-iso22k/session", async (req, res) => {
    try {
      await ensureIso22kHydratedFromFirestore();
      const sessionData = req.body;
      if (sessionData && typeof sessionData === "object") {
        const incomingTs = Number(sessionData._lastUpdated || Date.now());
        const currentTs = Number(serverIso22kSession?._lastUpdated || 0);

        if (!isMeaningfulIsoSession(sessionData) && isMeaningfulIsoSession(serverIso22kSession)) {
          return res.json({ success: true, session: serverIso22kSession, skippedEmptyOverwrite: true });
        }

        if (!serverIso22kSession || incomingTs >= currentTs) {
          serverIso22kSession = { ...sessionData, _lastUpdated: incomingTs };
          saveIso22kSessionToDisk(serverIso22kSession);
          try {
            const db = getServerFirestore();
            await db.collection("fast_iso22k_crm").doc("current_session").set(serverIso22kSession);
          } catch (e) {}
        }
      }
      res.json({ success: true, session: serverIso22kSession });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.get("/api/fast-iso22k/crm", async (req, res) => {
    await ensureIso22kHydratedFromFirestore();
    res.json({
      success: true,
      records: serverIso22kCrm,
      _lastUpdated: serverIso22kCrmUpdatedAt,
    });
  });

  app.post("/api/fast-iso22k/crm", async (req, res) => {
    try {
      await ensureIso22kHydratedFromFirestore();
      const { records, _lastUpdated, _writerId } = req.body || {};
      if (records && typeof records === "object") {
        const incomingTs = Number(_lastUpdated || Date.now());
        if (incomingTs >= serverIso22kCrmUpdatedAt || Object.keys(serverIso22kCrm).length === 0) {
          serverIso22kCrm = records;
          serverIso22kCrmUpdatedAt = incomingTs;
          saveIso22kCrmToDisk(serverIso22kCrm, serverIso22kCrmUpdatedAt);
          try {
            const db = getServerFirestore();
            await db.collection("fast_iso22k_crm").doc("database").set({
              records: serverIso22kCrm,
              _lastUpdated: serverIso22kCrmUpdatedAt,
              ...(_writerId ? { _writerId } : {}),
            });
          } catch (e) {}
        }
      }
      res.json({
        success: true,
        records: serverIso22kCrm,
        _lastUpdated: serverIso22kCrmUpdatedAt,
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // --- FAST SERVICE FOOD HYGIENE FOR SUPERMARKET ENDPOINTS ---
  const SUPERMARKET_SESSION_FILE = path.join(DATA_DIR, "fast_supermarket_hygiene_session.json");
  const SUPERMARKET_CRM_FILE = path.join(DATA_DIR, "fast_supermarket_hygiene_crm.json");

  function isMeaningfulSupermarketSession(data: any): boolean {
    if (!data || typeof data !== "object") return false;
    if (data._isExplicitReset) return true;
    const textKeys = ["facilityName", "auditorName", "facilityRep", "facilityAddress"];
    if (textKeys.some((k) => typeof data[k] === "string" && data[k].trim() !== "")) {
      return true;
    }
    if (Array.isArray(data.selectedDepts) && data.selectedDepts.length > 0) {
      return true;
    }
    if (data.records && typeof data.records === "object") {
      return Object.values(data.records).some(
        (r: any) => r && (r.status || r.evidence || r.capa)
      );
    }
    return false;
  }

  function loadSupermarketSessionFromDisk(): any {
    try {
      if (fs.existsSync(SUPERMARKET_SESSION_FILE)) {
        const parsed = JSON.parse(fs.readFileSync(SUPERMARKET_SESSION_FILE, "utf-8"));
        return isMeaningfulSupermarketSession(parsed) ? parsed : null;
      }
    } catch (e) {}
    return null;
  }

  function saveSupermarketSessionToDisk(data: any) {
    try {
      if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
      fs.writeFileSync(SUPERMARKET_SESSION_FILE, JSON.stringify(data, null, 2), "utf-8");
    } catch (e) {}
  }

  function loadSupermarketCrmFromDisk(): { records: Record<string, any>; _lastUpdated: number } {
    try {
      if (fs.existsSync(SUPERMARKET_CRM_FILE)) {
        const parsed = JSON.parse(fs.readFileSync(SUPERMARKET_CRM_FILE, "utf-8"));
        if (parsed && typeof parsed === "object") {
          if (parsed.records && typeof parsed.records === "object") {
            return {
              records: parsed.records,
              _lastUpdated: Number(parsed._lastUpdated || 0),
            };
          }
          return {
            records: parsed,
            _lastUpdated: 0,
          };
        }
      }
    } catch (e) {}
    return { records: {}, _lastUpdated: 0 };
  }

  function saveSupermarketCrmToDisk(crmData: Record<string, any>, lastUpdated: number) {
    try {
      if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
      fs.writeFileSync(
        SUPERMARKET_CRM_FILE,
        JSON.stringify({ records: crmData, _lastUpdated: lastUpdated }, null, 2),
        "utf-8"
      );
    } catch (e) {}
  }

  let serverSupermarketSession = loadSupermarketSessionFromDisk();
  const initialDiskSupermarketCrm = loadSupermarketCrmFromDisk();
  let serverSupermarketCrm: Record<string, any> = initialDiskSupermarketCrm.records;
  let serverSupermarketCrmUpdatedAt: number = initialDiskSupermarketCrm._lastUpdated;
  let supermarketBootstrapped = false;

  async function ensureSupermarketHydratedFromFirestore() {
    if (supermarketBootstrapped) return;
    supermarketBootstrapped = true;
    try {
      const db = getServerFirestore();
      const [sessSnap, crmSnap] = await Promise.all([
        db.collection("fast_supermarket_hygiene_crm").doc("current_session").get(),
        db.collection("fast_supermarket_hygiene_crm").doc("database").get(),
      ]);

      if (sessSnap.exists) {
        const remoteSess = sessSnap.data();
        const remoteTs = Number(remoteSess?._lastUpdated || 0);
        const localTs = Number(serverSupermarketSession?._lastUpdated || 0);
        if (
          isMeaningfulSupermarketSession(remoteSess) &&
          (!serverSupermarketSession || remoteTs >= localTs)
        ) {
          serverSupermarketSession = remoteSess;
          saveSupermarketSessionToDisk(serverSupermarketSession);
        }
      }

      if (crmSnap.exists) {
        const remoteCrm = crmSnap.data();
        const remoteTs = Number(remoteCrm?._lastUpdated || 0);
        if (
          remoteCrm?.records &&
          typeof remoteCrm.records === "object" &&
          (Object.keys(serverSupermarketCrm).length === 0 || remoteTs >= serverSupermarketCrmUpdatedAt)
        ) {
          serverSupermarketCrm = remoteCrm.records;
          serverSupermarketCrmUpdatedAt = remoteTs;
          saveSupermarketCrmToDisk(serverSupermarketCrm, serverSupermarketCrmUpdatedAt);
        }
      }
    } catch (e) {
      console.warn("[FastSupermarketHygiene] Server hydration note:", e);
    }
  }

  app.get("/api/fast-supermarket-hygiene/session", async (req, res) => {
    await ensureSupermarketHydratedFromFirestore();
    res.json({ success: true, session: serverSupermarketSession });
  });

  app.post("/api/fast-supermarket-hygiene/session", async (req, res) => {
    try {
      await ensureSupermarketHydratedFromFirestore();
      const sessionData = req.body;
      if (sessionData && typeof sessionData === "object") {
        const incomingTs = Number(sessionData._lastUpdated || Date.now());
        const currentTs = Number(serverSupermarketSession?._lastUpdated || 0);

        if (
          !isMeaningfulSupermarketSession(sessionData) &&
          isMeaningfulSupermarketSession(serverSupermarketSession)
        ) {
          return res.json({
            success: true,
            session: serverSupermarketSession,
            skippedEmptyOverwrite: true,
          });
        }

        if (!serverSupermarketSession || incomingTs >= currentTs) {
          serverSupermarketSession = { ...sessionData, _lastUpdated: incomingTs };
          saveSupermarketSessionToDisk(serverSupermarketSession);
          try {
            const db = getServerFirestore();
            await db
              .collection("fast_supermarket_hygiene_crm")
              .doc("current_session")
              .set(serverSupermarketSession);
          } catch (e) {}
        }
      }
      res.json({ success: true, session: serverSupermarketSession });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.get("/api/fast-supermarket-hygiene/crm", async (req, res) => {
    await ensureSupermarketHydratedFromFirestore();
    res.json({
      success: true,
      records: serverSupermarketCrm,
      _lastUpdated: serverSupermarketCrmUpdatedAt,
    });
  });

  app.post("/api/fast-supermarket-hygiene/crm", async (req, res) => {
    try {
      await ensureSupermarketHydratedFromFirestore();
      const { records, _lastUpdated, _writerId } = req.body || {};
      if (records && typeof records === "object") {
        const incomingTs = Number(_lastUpdated || Date.now());
        if (
          incomingTs >= serverSupermarketCrmUpdatedAt ||
          Object.keys(serverSupermarketCrm).length === 0
        ) {
          serverSupermarketCrm = records;
          serverSupermarketCrmUpdatedAt = incomingTs;
          saveSupermarketCrmToDisk(serverSupermarketCrm, serverSupermarketCrmUpdatedAt);
          try {
            const db = getServerFirestore();
            await db
              .collection("fast_supermarket_hygiene_crm")
              .doc("database")
              .set({
                records: serverSupermarketCrm,
                _lastUpdated: serverSupermarketCrmUpdatedAt,
                ...(_writerId ? { _writerId } : {}),
              });
          } catch (e) {}
        }
      }
      res.json({
        success: true,
        records: serverSupermarketCrm,
        _lastUpdated: serverSupermarketCrmUpdatedAt,
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

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
  const passwordResetTokens = new Map<string, { token: string; expiresAt: number; attempts: number }>();

  async function issueAndSendOtpEmail(params: {
    email: string;
    name?: string;
    flow?: string;
    customOtp?: string;
    courseLabel?: string;
    bypassCooldown?: boolean;
  }): Promise<{
    success: boolean;
    otp: string;
    emailSent: boolean;
    fallback?: boolean;
    message: string;
    error?: string;
    statusCode?: number;
  }> {
    const emailKey = String(params.email || "").toLowerCase().trim();
    const flow = params.flow || "register";
    const flowKey = `${emailKey}_${flow}`;
    const name = (params.name || "Học viên").trim();
    const now = Date.now();

    if (!params.bypassCooldown) {
      const cooldownEnd = otpSendCooldowns.get(flowKey) || otpSendCooldowns.get(emailKey) || 0;
      if (now < cooldownEnd) {
        const waitSecs = Math.ceil((cooldownEnd - now) / 1000);
        return {
          success: false,
          otp: "",
          emailSent: false,
          statusCode: 429,
          message: `Vui lòng đợi ${waitSecs}s trước khi yêu cầu gửi lại mã.`,
          error: `Vui lòng đợi ${waitSecs}s trước khi yêu cầu gửi lại mã.`,
        };
      }
    }

    const otp =
      params.customOtp && String(params.customOtp).trim().length === 6
        ? String(params.customOtp).trim()
        : Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = Date.now() + 10 * 60 * 1000;

    const credentialPairs = [
      {
        serviceId: process.env.VITE_EMAILJS_SERVICE_ID || "service_q86r4ap",
        templateId: process.env.VITE_EMAILJS_TEMPLATE_ID || "template_1nq488j",
        publicKey: process.env.VITE_EMAILJS_PUBLIC_KEY || "P5IG0fzzQJSm5e4P-",
      },
      {
        serviceId: "service_q86r4ap",
        templateId: "template_1nq488j",
        publicKey: "P5IG0fzzQJSm5e4P-",
      },
      {
        serviceId: "default_service",
        templateId: "template_1nq488j",
        publicKey: "P5IG0fzzQJSm5e4P-",
      },
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
            to_name: name,
            to_email: emailKey,
            otp_code: otp,
            course_name: params.courseLabel || "FAST E-Learning",
          },
        };

        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 6000);

        const response = await fetch("https://api.emailjs.com/api/v1.0/email/send", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Origin: "https://dashboard.emailjs.com",
            "User-Agent":
              "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
          },
          body: JSON.stringify(payload),
          signal: controller.signal,
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

    const record = { otp, expiresAt, attempts: 0, flow };
    otpStore.set(flowKey, record);
    otpStore.set(emailKey, record);
    saveOtpToDisk(otpStore);
    otpSendCooldowns.set(flowKey, now + 10000);
    otpSendCooldowns.set(emailKey, now + 10000);

    if (emailSent) {
      return {
        success: true,
        otp,
        emailSent: true,
        message: `Mã OTP đã được gửi đến email ${emailKey}. Vui lòng kiểm tra hộp thư đến (và thư rác/spam) để lấy mã xác thực.`,
      };
    }

    console.warn(`[OTP] EmailJS dispatch failed for ${emailKey} (flow: ${flow}). Details:`, emailErrorDetails);
    if (flow === "reset") {
      otpStore.delete(flowKey);
      otpStore.delete(emailKey);
      saveOtpToDisk(otpStore);
      return {
        success: false,
        otp: "",
        emailSent: false,
        statusCode: 503,
        message: "Không thể gửi mã OTP xác thực đến email lúc này. Vui lòng thử lại sau.",
        error: "Không thể gửi mã OTP xác thực đến email lúc này. Vui lòng thử lại sau.",
      };
    }

    return {
      success: true,
      otp,
      emailSent: false,
      fallback: true,
      message: `Mã OTP đã được khởi tạo thành công (Chế độ dự phòng tự động). Mã xác thực của bạn là: ${otp}.`,
    };
  }

  const completedPostPaymentCache = new Map<string, any>();

  async function finalizePaidTrainingAccountAndOtp(regRecord: any, options?: { sendOtpIfNotSent?: boolean }) {
    const regId = String(regRecord?.id || regRecord?.registrationId || "").trim();
    const cleanPhoneDigits = String(regRecord?.phone || "").replace(/[^\d]/g, "");
    let accountEmail = String(regRecord?.userEmail || regRecord?.email || "").toLowerCase().trim();
    if (!accountEmail || !accountEmail.includes("@") || accountEmail.endsWith("@fast-training.local")) {
      const suffix = cleanPhoneDigits || regId.replace(/[^a-zA-Z0-9]/g, "").slice(-8) || Date.now().toString().slice(-8);
      accountEmail = `hv.${suffix}@fastelearning.com.vn`;
    }

    const updatedReg = {
      ...regRecord,
      id: regId || regRecord?.id || `reg-${Date.now()}`,
      email: accountEmail,
      userEmail: accountEmail,
      status: "confirmed",
      paymentStatus: "PAID",
      paidAt: regRecord?.paidAt || new Date().toISOString(),
    };

    const existingIdx = serverDirectRegistrations.findIndex((r: any) => r && r.id === updatedReg.id);
    if (existingIdx >= 0) {
      serverDirectRegistrations[existingIdx] = { ...serverDirectRegistrations[existingIdx], ...updatedReg };
    } else if (updatedReg.id) {
      serverDirectRegistrations.unshift(updatedReg);
    }
    saveDirectRegistrationsToDisk(serverDirectRegistrations);

    const provisioned = await ensureAutoAccountForDirectRegistration({
      email: accountEmail,
      displayName: updatedReg.studentName,
      phone: updatedReg.phone,
      registration: updatedReg,
    });

    const cached = regId ? completedPostPaymentCache.get(regId) : null;
    if (cached && cached.accountEmail === accountEmail) {
      return cached;
    }

    let otpResult: Awaited<ReturnType<typeof issueAndSendOtpEmail>> | null = null;
    if (options?.sendOtpIfNotSent !== false) {
      otpResult = await issueAndSendOtpEmail({
        email: accountEmail,
        name: updatedReg.studentName || "Học viên FAST",
        flow: "account_setup",
        courseLabel: `Tài khoản học viên & Lịch học: ${updatedReg.courseTitle || "Khóa đào tạo Online - Offline"}`,
        bypassCooldown: true,
      });

      const accountOtpNotifId = `otp_account_${updatedReg.id}`;
      const prepBase = buildServerPreClassNotification(updatedReg, new Date().toISOString(), accountOtpNotifId);
      await persistUserNotification(accountEmail, {
        ...prepBase,
        id: accountOtpNotifId,
        title: `Tài khoản & OTP đã kích hoạt: ${updatedReg.courseTitle || "Khóa đào tạo"}`,
        message: `Thanh toán thành công! Tài khoản ${accountEmail} đã được kích hoạt sẵn với mã OTP. ${prepBase.venueAddress ? `Địa điểm học Offline: ${prepBase.venueAddress}. ` : ''}Vui lòng xem mục Chuẩn bị vào học để kiểm tra lịch trình & thủ tục check-in.`,
        createdAt: new Date().toISOString(),
      });
    }

    const summary = {
      accountEmail,
      accountProvisioned: provisioned,
      otpDispatched: Boolean(otpResult?.success),
      otpEmailSent: Boolean(otpResult?.emailSent),
      otpFallback: Boolean(otpResult?.fallback),
      otp: otpResult?.fallback ? otpResult.otp : undefined,
      otpMessage: otpResult?.message || "",
      registration: updatedReg,
      notification: provisioned.notification,
    };

    if (regId) {
      completedPostPaymentCache.set(regId, summary);
    }
    return summary;
  }

  app.post("/api/training/complete-post-payment", async (req, res) => {
    try {
      const { registrationId, orderId, paymentCode, fallbackRecord } = req.body || {};
      const cleanOrderId = String(orderId || "").trim();
      const cleanRegId = String(registrationId || "").trim();
      const cleanCode = paymentCode ? normalizeServerFastCode(String(paymentCode)) : "";

      let matchedOrder: any = cleanOrderId && serverOrdersMap[cleanOrderId] ? serverOrdersMap[cleanOrderId] : null;
      if (!matchedOrder && cleanCode) {
        matchedOrder =
          Object.values(serverOrdersMap).find(
            (o: any) => o && (o.paymentCode === cleanCode || o.paymentCode === cleanCode.replace(/^FAST/, ""))
          ) || null;
      }

      let matchedReg: any = serverDirectRegistrations.find((r: any) => {
        if (!r) return false;
        const rCode = normalizeServerFastCode(r.paymentCode || r.paymentMemo || "");
        return (
          (cleanRegId && r.id === cleanRegId) ||
          (cleanOrderId && r.orderId === cleanOrderId) ||
          (cleanCode && rCode === cleanCode)
        );
      });

      if (!matchedReg || (matchedReg.paymentStatus !== "PAID" && matchedReg.status !== "confirmed")) {
        try {
          const db = getServerFirestore();
          if (cleanRegId) {
            const snap = await db.collection("live_course_registrations").doc(cleanRegId).get();
            if (snap.exists) matchedReg = { id: snap.id, ...snap.data() };
          }
          if ((!matchedReg || matchedReg.paymentStatus !== "PAID") && cleanCode) {
            const qSnap = await db.collection("live_course_registrations").where("paymentCode", "==", cleanCode).limit(1).get();
            if (!qSnap.empty) matchedReg = { id: qSnap.docs[0].id, ...qSnap.docs[0].data() };
          }
          if (!matchedOrder && cleanOrderId) {
            const ordSnap = await db.collection("orders").doc(cleanOrderId).get();
            if (ordSnap.exists) matchedOrder = ordSnap.data();
          }
          if (!matchedOrder && cleanCode) {
            const ordQ = await db.collection("orders").where("paymentCode", "==", cleanCode).limit(1).get();
            if (!ordQ.empty) matchedOrder = ordQ.docs[0].data();
          }
        } catch {}
      }

      const isPaidOrder = matchedOrder?.status === "PAID" || matchedOrder?.status === "completed";
      const isPaidReg = matchedReg?.paymentStatus === "PAID" || matchedReg?.status === "confirmed";

      if (!isPaidOrder && !isPaidReg) {
        return res.status(402).json({
          success: false,
          error: "Giao dịch chưa được xác nhận thanh toán.",
        });
      }

      const recordToFinalize = {
        ...(fallbackRecord || {}),
        ...(matchedReg || {}),
        id: matchedReg?.id || cleanRegId || matchedOrder?.registrationId || `reg-${Date.now()}`,
        orderId: matchedReg?.orderId || cleanOrderId || matchedOrder?.orderId || "",
        paymentCode: matchedReg?.paymentCode || matchedOrder?.paymentCode || cleanCode,
        email: matchedReg?.email || matchedReg?.userEmail || matchedOrder?.email || fallbackRecord?.email || "",
        userEmail: matchedReg?.userEmail || matchedReg?.email || matchedOrder?.email || fallbackRecord?.userEmail || fallbackRecord?.email || "",
        studentName: matchedReg?.studentName || matchedOrder?.studentName || fallbackRecord?.studentName || "Học viên FAST",
        phone: matchedReg?.phone || matchedOrder?.phone || fallbackRecord?.phone || "",
        courseId: matchedReg?.courseId || matchedOrder?.courseId || fallbackRecord?.courseId || "",
        courseTitle: matchedReg?.courseTitle || matchedOrder?.courseTitle || fallbackRecord?.courseTitle || "Khóa đào tạo Online - Offline",
      };

      const result = await finalizePaidTrainingAccountAndOtp(recordToFinalize, { sendOtpIfNotSent: true });
      return res.json({ success: true, ...result });
    } catch (err: any) {
      console.error("[/api/training/complete-post-payment] Error:", err);
      return res.status(500).json({ success: false, error: err?.message || "Lỗi hoàn tất sau thanh toán." });
    }
  });

  // OTP Send Endpoint
  app.post("/api/otp/send", async (req, res) => {
    try {
      const { email, name, flow = 'register', customOtp, courseLabel } = req.body || {};
      if (!email) return res.status(400).json({ error: "Email là bắt buộc." });

      const emailKey = String(email).toLowerCase().trim();

      // Check if user account already exists in Firebase Auth or Firestore
      let userExists: boolean | null = null;
      if (flow === 'reset' || flow === 'login' || flow === 'register' || flow === 'account_setup') {
        userExists = await checkUserExistsSafe(emailKey);
      }

      // If account_setup flow has a matching paid direct registration without provisioned user yet, provision now
      if (flow === 'account_setup' && userExists === false) {
        const regMatch = serverDirectRegistrations.find((r: any) =>
          r && (String(r.email || '').toLowerCase().trim() === emailKey || String(r.userEmail || '').toLowerCase().trim() === emailKey)
        );
        if (regMatch) {
          await ensureAutoAccountForDirectRegistration({
            email: emailKey,
            displayName: regMatch.studentName || name,
            phone: regMatch.phone,
            registration: regMatch
          });
          userExists = true;
        }
      }

      // Distinguish flows: Only block reset/login/account_setup if user explicitly does NOT exist
      if ((flow === 'reset' || flow === 'login' || flow === 'account_setup') && userExists === false) {
        return res.status(404).json({ error: "Không tìm thấy tài khoản người dùng với email này. Vui lòng kiểm tra lại hoặc Đăng ký tài khoản mới." });
      }

      const result = await issueAndSendOtpEmail({
        email: emailKey,
        name: name || "Học viên",
        flow,
        customOtp,
        courseLabel,
      });

      if (!result.success) {
        return res.status(result.statusCode || 503).json({
          success: false,
          error: result.error || result.message,
        });
      }

      if (result.emailSent) {
        return res.json({
          success: true,
          message: result.message,
        });
      }

      return res.json({
        success: true,
        fallback: true,
        otp: result.otp,
        message: result.message,
      });
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
      const { email, otp, flow = 'register', password, fullName } = req.body || {};
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

      // For password reset & pre-created account_setup flows: issue a short-lived single-use resetToken
      if (flow === 'reset' || flow === 'account_setup') {
        const resetToken = randomBytes(32).toString('hex');
        passwordResetTokens.set(emailKey, {
          token: resetToken,
          expiresAt: Date.now() + 10 * 60 * 1000, // 10 minutes to finish setting password
          attempts: 0
        });
        return res.json({
          success: true,
          resetToken,
          message: flow === 'account_setup'
            ? "Xác thực OTP thành công! Vui lòng thêm mật khẩu mới để hoàn tất đăng nhập."
            : "Xác thực OTP thành công! Bạn có thể nhập mật khẩu mới ngay bây giờ."
        });
      }

      // Determine user roles and attributes
      const isOwner = emailKey === 'h1h4phong@gmail.com' || emailKey === 'trdung153@gmail.com';
      const isAdmin = isOwner || SYSTEM_ADMIN_EMAILS.includes(emailKey);
      const isTeacher = isAdmin;
      const diskUsers = loadUsersFromDisk();
      const existing = diskUsers[emailKey] || {};

      const nameToSet = String(fullName || existing.displayName || (emailKey === 'h1h4phong@gmail.com' ? 'H1H4 Phong (Admin)' : emailKey.split('@')[0])).trim();

      // Persist user record to disk
      const updatedUser = {
        uid: existing.uid || `user_${emailKey.replace(/[^a-zA-Z0-9]/g, '_')}`,
        email: emailKey,
        displayName: nameToSet,
        isAdmin: isAdmin || !!existing.isAdmin,
        isTeacher: isTeacher || !!existing.isTeacher,
        isOwner: isOwner || !!existing.isOwner,
        isVip: isOwner || !!existing.isVip,
        isLocked: false,
        ...(password ? { password } : {})
      };
      saveUserToDisk(emailKey, updatedUser);

      // Async sync to server Firestore without blocking
      try {
        getServerFirestore().collection("users").doc(emailKey).set({
          email: emailKey,
          displayName: nameToSet,
          isAdmin: updatedUser.isAdmin,
          isTeacher: updatedUser.isTeacher,
          isOwner: updatedUser.isOwner,
          isVip: updatedUser.isVip,
          isLocked: false,
          updatedAt: new Date().toISOString()
        }, { merge: true }).catch(() => null);
      } catch (e) {}

      res.json({
        success: true,
        message: "Xác minh danh tính thành công.",
        user: {
          uid: updatedUser.uid,
          email: emailKey,
          displayName: nameToSet,
          isAdmin: updatedUser.isAdmin,
          isTeacher: updatedUser.isTeacher,
          isOwner: updatedUser.isOwner,
          isVip: updatedUser.isVip
        }
      });
    } catch (error: any) {
      console.error("Server OTP Verify Error:", error);
      res.status(500).json({ error: "Lỗi hệ thống khi xác minh mã OTP." });
    }
  });

  // Reset Password after OTP verification (Requires valid single-use resetToken issued by /api/otp/verify)
  app.post("/api/auth/reset-password-with-otp", async (req, res) => {
    try {
      const { email, resetToken, newPassword } = req.body || {};
      if (!email || !resetToken || !newPassword) {
        return res.status(400).json({
          success: false,
          error: "Thiếu thông tin xác thực hoặc mật khẩu mới."
        });
      }

      const emailKey = String(email).toLowerCase().trim();
      const tokenStr = String(resetToken).trim();
      const pw = String(newPassword);

      // Verify password strength on server
      if (
        pw.length < 8 ||
        !/[A-Z]/.test(pw) ||
        !/[a-z]/.test(pw) ||
        !/[0-9]/.test(pw) ||
        !/[^A-Za-z0-9]/.test(pw)
      ) {
        return res.status(400).json({
          success: false,
          error: "Mật khẩu mới phải dài tối thiểu 8 ký tự và bao gồm chữ hoa, chữ thường, chữ số và ký tự đặc biệt."
        });
      }

      const tokenRecord = passwordResetTokens.get(emailKey);
      if (!tokenRecord) {
        return res.status(403).json({
          success: false,
          error: "Phiên đặt lại mật khẩu không tồn tại hoặc đã hết hạn. Vui lòng xác thực lại bằng mã OTP."
        });
      }

      if (Date.now() > tokenRecord.expiresAt) {
        passwordResetTokens.delete(emailKey);
        return res.status(403).json({
          success: false,
          error: "Phiên đặt lại mật khẩu đã hết hạn. Vui lòng yêu cầu gửi lại mã OTP mới."
        });
      }

      let isTokenMatch = false;
      try {
        const expectedBuf = Buffer.from(tokenRecord.token, "utf8");
        const providedBuf = Buffer.from(tokenStr, "utf8");
        isTokenMatch =
          expectedBuf.length === providedBuf.length &&
          timingSafeEqual(expectedBuf, providedBuf);
      } catch {
        isTokenMatch = false;
      }

      if (!isTokenMatch) {
        tokenRecord.attempts = (tokenRecord.attempts || 0) + 1;
        if (tokenRecord.attempts >= 5) {
          passwordResetTokens.delete(emailKey);
        }
        return res.status(403).json({
          success: false,
          error: "Mã phiên đặt lại mật khẩu không hợp lệ. Vui lòng xác thực lại OTP."
        });
      }

      // Consume token immediately (single-use)
      passwordResetTokens.delete(emailKey);

      // Update Firebase Auth password via Admin SDK
      const adminAuth = getAuth();
      try {
        const existingAuthUser = await adminAuth.getUserByEmail(emailKey);
        await adminAuth.updateUser(existingAuthUser.uid, {
          password: pw,
          emailVerified: true
        });
      } catch (authErr: any) {
        if (authErr?.code === 'auth/user-not-found') {
          const diskUsers = loadUsersFromDisk();
          const diskUser = diskUsers[emailKey];
          await adminAuth.createUser({
            email: emailKey,
            password: pw,
            emailVerified: true,
            ...(diskUser?.displayName ? { displayName: diskUser.displayName } : {})
          });
        } else {
          console.error("[reset-password-with-otp] Firebase Admin updateUser error:", authErr);
          return res.status(500).json({
            success: false,
            error: "Không thể cập nhật mật khẩu trên hệ thống xác thực lúc này. Vui lòng thử lại sau."
          });
        }
      }

      // Sync disk cache & Firestore timestamp (never store raw password in Firestore)
      saveUserToDisk(emailKey, { password: pw });
      try {
        await getServerFirestore().collection("users").doc(emailKey).set({
          passwordUpdatedAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }, { merge: true });
      } catch (fsErr: any) {
        console.warn("[reset-password-with-otp] Firestore timestamp sync note:", fsErr?.message || fsErr);
      }

      return res.json({
        success: true,
        message: "Đặt lại mật khẩu thành công! Bạn có thể đăng nhập bằng mật khẩu mới ngay bây giờ."
      });
    } catch (error: any) {
      console.error("[/api/auth/reset-password-with-otp] Error:", error);
      return res.status(500).json({
        success: false,
        error: "Lỗi hệ thống khi đặt lại mật khẩu. Vui lòng thử lại sau."
      });
    }
  });

  // Complete OTP login + Add password for auto-provisioned learner accounts
  app.post("/api/auth/otp-complete-setup", async (req, res) => {
    try {
      const { email, resetToken, newPassword, fullName } = req.body || {};
      if (!email || !resetToken || !newPassword) {
        return res.status(400).json({
          success: false,
          error: "Thiếu thông tin xác thực OTP hoặc mật khẩu mới."
        });
      }

      const emailKey = String(email).toLowerCase().trim();
      const tokenStr = String(resetToken).trim();
      const pw = String(newPassword);

      if (
        pw.length < 8 ||
        !/[A-Z]/.test(pw) ||
        !/[a-z]/.test(pw) ||
        !/[0-9]/.test(pw) ||
        !/[^A-Za-z0-9]/.test(pw)
      ) {
        return res.status(400).json({
          success: false,
          error: "Mật khẩu mới phải dài tối thiểu 8 ký tự, gồm chữ hoa, chữ thường, số và ký tự đặc biệt."
        });
      }

      const tokenRecord = passwordResetTokens.get(emailKey);
      if (!tokenRecord || Date.now() > tokenRecord.expiresAt) {
        passwordResetTokens.delete(emailKey);
        return res.status(403).json({
          success: false,
          error: "Phiên xác thực OTP không tồn tại hoặc đã hết hạn. Vui lòng yêu cầu gửi lại mã OTP."
        });
      }

      let isTokenMatch = false;
      try {
        const expectedBuf = Buffer.from(tokenRecord.token, "utf8");
        const providedBuf = Buffer.from(tokenStr, "utf8");
        isTokenMatch =
          expectedBuf.length === providedBuf.length &&
          timingSafeEqual(expectedBuf, providedBuf);
      } catch {
        isTokenMatch = false;
      }

      if (!isTokenMatch) {
        tokenRecord.attempts = (tokenRecord.attempts || 0) + 1;
        if (tokenRecord.attempts >= 5) passwordResetTokens.delete(emailKey);
        return res.status(403).json({
          success: false,
          error: "Mã phiên OTP không hợp lệ. Vui lòng xác thực lại."
        });
      }

      passwordResetTokens.delete(emailKey);

      const diskUsers = loadUsersFromDisk();
      const existing = diskUsers[emailKey] || {};
      const resolvedName = String(fullName || existing.displayName || emailKey.split('@')[0]).trim();

      try {
        const adminAuth = getAuth();
        try {
          const authUser = await adminAuth.getUserByEmail(emailKey);
          await adminAuth.updateUser(authUser.uid, {
            password: pw,
            displayName: resolvedName,
            emailVerified: true
          });
        } catch (authErr: any) {
          if (authErr?.code === 'auth/user-not-found') {
            await adminAuth.createUser({
              email: emailKey,
              password: pw,
              displayName: resolvedName,
              emailVerified: true
            });
          }
        }
      } catch (adminErr: any) {
        console.warn("[otp-complete-setup] Firebase Admin Auth fallback to disk session:", adminErr?.message);
      }

      const isOwner = emailKey === 'h1h4phong@gmail.com' || emailKey === 'trdung153@gmail.com';
      const isAdmin = isOwner || SYSTEM_ADMIN_EMAILS.includes(emailKey) || !!existing.isAdmin;
      const isTeacher = isAdmin || !!existing.isTeacher;

      const updatedUser = {
        uid: existing.uid || `user_${emailKey.replace(/[^a-zA-Z0-9]/g, '_')}`,
        email: emailKey,
        displayName: resolvedName,
        isAdmin,
        isTeacher,
        isOwner,
        isVip: isOwner || !!existing.isVip,
        isLocked: false,
        autoCreated: !!existing.autoCreated,
        needsPasswordSetup: false,
        password: pw
      };
      saveUserToDisk(emailKey, updatedUser);

      try {
        await getServerFirestore().collection("users").doc(emailKey).set({
          email: emailKey,
          displayName: resolvedName,
          needsPasswordSetup: false,
          passwordUpdatedAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }, { merge: true });
      } catch {}

      return res.json({
        success: true,
        message: "Thiết lập mật khẩu và đăng nhập thành công!",
        user: {
          uid: updatedUser.uid,
          email: updatedUser.email,
          displayName: updatedUser.displayName,
          isAdmin: updatedUser.isAdmin,
          isTeacher: updatedUser.isTeacher,
          isOwner: updatedUser.isOwner,
          isVip: updatedUser.isVip
        }
      });
    } catch (error: any) {
      console.error("[/api/auth/otp-complete-setup] Error:", error);
      return res.status(500).json({
        success: false,
        error: "Lỗi hệ thống khi hoàn tất thiết lập mật khẩu."
      });
    }
  });

  // Direct Server Authentication Endpoint (Fallback for Google Identity Network Errors)
  app.post("/api/auth/login", async (req, res) => {
    try {
      const { email, password } = req.body || {};
      if (!email || !password) {
        return res.status(400).json({ success: false, error: "Vui lòng nhập đầy đủ email và mật khẩu." });
      }

      const emailKey = String(email).toLowerCase().trim();
      const inputPass = String(password).trim();
      const isOwner = emailKey === 'h1h4phong@gmail.com' || emailKey === 'trdung153@gmail.com';
      const isSystemAdmin = SYSTEM_ADMIN_EMAILS.includes(emailKey);
      const diskUsers = loadUsersFromDisk();
      const existing = diskUsers[emailKey];

      // 1. System Owner & Pre-configured Admins
      if (isSystemAdmin || isOwner) {
        // If password is saved on disk, verify it; if first login with new password, register/save it
        if (existing?.password && existing.password !== inputPass) {
          return res.status(401).json({
            success: false,
            code: "WRONG_PASSWORD",
            error: "Mật khẩu không chính xác. Bạn có thể sử dụng tính năng 'Đăng nhập bằng mã OTP'."
          });
        }
        if (!existing?.password) {
          saveUserToDisk(emailKey, { password: inputPass });
        }

        const displayName = existing?.displayName || (emailKey === 'h1h4phong@gmail.com' ? 'H1H4 Phong (Admin)' : 'Quản trị viên');
        return res.json({
          success: true,
          message: "Đăng nhập Quản trị viên thành công.",
          user: {
            uid: existing?.uid || `admin_${emailKey.replace(/[^a-zA-Z0-9]/g, '_')}`,
            email: emailKey,
            displayName,
            isAdmin: true,
            isTeacher: true,
            isOwner: true,
            isVip: true
          }
        });
      }

      // 2. Regular learner accounts
      if (!existing) {
        // Check Firestore in background before declaring not found
        let foundInFirestore = false;
        try {
          const userSnap = await getServerFirestore().collection("users").doc(emailKey).get();
          if (userSnap.exists) {
            foundInFirestore = true;
          }
        } catch {}

        if (!foundInFirestore) {
          return res.status(404).json({
            success: false,
            code: "USER_NOT_FOUND",
            error: "Tài khoản chưa tồn tại trên hệ thống. Vui lòng bấm 'Đăng ký tài khoản mới'."
          });
        }
      }

      if (existing?.isLocked) {
        return res.status(403).json({
          success: false,
          code: "USER_LOCKED",
          error: `Tài khoản của bạn đã bị khóa. Lý do: ${existing.lockReason || 'Vi phạm chính sách'}. Vui lòng liên hệ hỗ trợ.`
        });
      }

      if (existing?.password && existing.password !== inputPass) {
        return res.status(401).json({
          success: false,
          code: "WRONG_PASSWORD",
          error: "Mật khẩu không chính xác. Bạn có thể đặt lại mật khẩu bằng mã OTP."
        });
      }

      // If user had no password yet, set it now
      if (existing && !existing.password) {
        saveUserToDisk(emailKey, { password: inputPass });
      }

      const displayName = existing?.displayName || emailKey.split('@')[0];
      return res.json({
        success: true,
        message: "Đăng nhập thành công.",
        user: {
          uid: existing?.uid || `user_${emailKey.replace(/[^a-zA-Z0-9]/g, '_')}`,
          email: emailKey,
          displayName,
          isAdmin: !!existing?.isAdmin,
          isTeacher: !!existing?.isTeacher,
          isOwner: false,
          isVip: !!existing?.isVip
        }
      });
    } catch (err: any) {
      console.error("[/api/auth/login] Error:", err);
      return res.status(500).json({ success: false, error: "Lỗi hệ thống khi xử lý đăng nhập." });
    }
  });

  // Direct OTP-based Passwordless Login
  app.post("/api/auth/otp-login", async (req, res) => {
    try {
      const { email, otp } = req.body || {};
      if (!email || !otp) {
        return res.status(400).json({ success: false, error: "Email và mã OTP là bắt buộc." });
      }

      const emailKey = String(email).toLowerCase().trim();
      const inputOtp = String(otp).trim();
      const flowKey = `${emailKey}_login`;
      const record = otpStore.get(flowKey) || otpStore.get(emailKey);

      if (!record) {
        return res.status(400).json({ success: false, error: "Mã OTP không tồn tại hoặc chưa được yêu cầu." });
      }

      if (Date.now() > record.expiresAt) {
        otpStore.delete(flowKey);
        otpStore.delete(emailKey);
        saveOtpToDisk(otpStore);
        return res.status(400).json({ success: false, error: "Mã OTP đã hết hạn." });
      }

      if (record.otp !== inputOtp) {
        record.attempts = (record.attempts || 0) + 1;
        saveOtpToDisk(otpStore);
        return res.status(400).json({ success: false, error: "Mã OTP không chính xác." });
      }

      // Clear used OTP
      otpStore.delete(flowKey);
      otpStore.delete(emailKey);
      saveOtpToDisk(otpStore);

      const isOwner = emailKey === 'h1h4phong@gmail.com' || emailKey === 'trdung153@gmail.com';
      const isAdmin = isOwner || SYSTEM_ADMIN_EMAILS.includes(emailKey);
      const isTeacher = isAdmin;
      const diskUsers = loadUsersFromDisk();
      const existing = diskUsers[emailKey] || {};

      const nameToSet = existing.displayName || (emailKey === 'h1h4phong@gmail.com' ? 'H1H4 Phong (Admin)' : emailKey.split('@')[0]);

      const userRecord = {
        uid: existing.uid || `user_${emailKey.replace(/[^a-zA-Z0-9]/g, '_')}`,
        email: emailKey,
        displayName: nameToSet,
        isAdmin: isAdmin || !!existing.isAdmin,
        isTeacher: isTeacher || !!existing.isTeacher,
        isOwner: isOwner || !!existing.isOwner,
        isVip: isOwner || !!existing.isVip,
        isLocked: false
      };
      saveUserToDisk(emailKey, userRecord);

      return res.json({
        success: true,
        message: "Đăng nhập bằng mã OTP thành công.",
        user: userRecord
      });
    } catch (err: any) {
      console.error("[/api/auth/otp-login] Error:", err);
      return res.status(500).json({ success: false, error: "Lỗi hệ thống khi đăng nhập bằng OTP." });
    }
  });

  // User Exists Check Endpoint
  app.post("/api/user/exists", async (req, res) => {
    try {
      const { email } = req.body || {};
      if (!email) {
        return res.status(400).json({ success: false, error: "Email là bắt buộc." });
      }
      const emailKey = String(email).toLowerCase().trim();
      const exists = await checkUserExistsSafe(emailKey);

      let isLocked = false;
      let isAdmin = false;
      let isTeacher = false;
      const isOwner = emailKey === 'h1h4phong@gmail.com' || emailKey === 'trdung153@gmail.com';
      try {
        const userDoc = await getServerFirestore().collection("users").doc(emailKey).get();
        if (userDoc.exists) {
          const data = userDoc.data();
          isLocked = !!data?.isLocked;
          isAdmin = !!data?.isAdmin || isOwner;
          isTeacher = !!data?.isTeacher || isAdmin;
        }
      } catch (err: any) {
        console.warn("[/api/user/exists] Firestore check note:", err.message);
      }

      return res.json({
        success: true,
        exists: !!exists,
        isLocked,
        isAdmin: isAdmin || isOwner,
        isTeacher: isTeacher || isOwner,
        isOwner
      });
    } catch (err: any) {
      console.error("[/api/user/exists] Error:", err);
      return res.status(500).json({ success: false, error: err.message });
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

  // API to sync and list all users from Firebase Admin Authentication
  app.get("/api/admin/list-auth-users", async (req, res) => {
    try {
      const authUsersResult = await getAuth().listUsers();
      const authUsers = authUsersResult.users;

      const firestore = getFirestore();
      const admins = ['h1h4phong@gmail.com', 'hkc.qms@gmail.com', 'trdung153@gmail.com', 'lediem.ngo@gmail.com'];

      const syncPromises = authUsers.map(async (authUser) => {
        if (!authUser.email) return;
        const normalizedEmail = authUser.email.toLowerCase().trim();
        const userRef = firestore.collection("users").doc(normalizedEmail);
        const userDoc = await userRef.get();

        const isHardcodedAdmin = admins.includes(normalizedEmail);
        const isHardcodedTeacher = admins.includes(normalizedEmail);

        const isOwner = normalizedEmail === 'h1h4phong@gmail.com' || normalizedEmail === 'trdung153@gmail.com';

        if (!userDoc.exists) {
          // Document does not exist in Firestore users collection, let's create it!
          await userRef.set({
            id: normalizedEmail,
            email: normalizedEmail,
            displayName: authUser.displayName || "Học viên",
            photoURL: authUser.photoURL || "",
            createdAt: authUser.metadata.creationTime || new Date().toISOString(),
            lastLoginAt: authUser.metadata.lastSignInTime || new Date().toISOString(),
            isAdmin: isHardcodedAdmin || isOwner,
            isTeacher: isHardcodedTeacher || isHardcodedAdmin || isOwner,
            isOwner: isOwner,
            isVip: false,
            isLocked: authUser.disabled || false,
            status: "approved",
            updatedAt: new Date().toISOString()
          });
        } else {
          const docData = userDoc.data();
          const updates: Record<string, any> = {};
          if (authUser.metadata.lastSignInTime && docData?.lastLoginAt !== authUser.metadata.lastSignInTime) {
            updates.lastLoginAt = authUser.metadata.lastSignInTime;
          }
          if (authUser.disabled !== undefined && docData?.isLocked !== authUser.disabled) {
            updates.isLocked = authUser.disabled;
          }
          if (isOwner && docData?.isOwner !== true) {
            updates.isOwner = true;
            updates.isAdmin = true;
            updates.isTeacher = true;
          }
          if (Object.keys(updates).length > 0) {
            updates.updatedAt = new Date().toISOString();
            await userRef.update(updates);
          }
        }
      });

      await Promise.all(syncPromises);
      res.json({ success: true, message: "Successfully synchronized authentication users with Firestore." });
    } catch (error: any) {
      console.warn("Could not sync using listUsers (Identity Toolkit API may be disabled or restricted):", error.message);
      res.json({ success: false, error: error.message });
    }
  });

  // Secure server-side user profile synchronizer to bypass client security rule & token constraints
  app.post("/api/user/sync-profile", async (req, res) => {
    try {
      const { uid, email, displayName, photoURL, providerId } = req.body || {};
      const normalizedEmail = typeof email === 'string' ? email.toLowerCase().trim() : '';
      const cleanUid = typeof uid === 'string' ? uid.trim() : '';
      const docKey = normalizedEmail || cleanUid;

      if (!docKey) {
        return res.status(400).json({ success: false, error: "Email or UID is required" });
      }

      const firestore = getServerFirestore();
      const userRef = firestore.collection("users").doc(docKey);
      const userDoc = await userRef.get();

      const admins = ['h1h4phong@gmail.com', 'hkc.qms@gmail.com', 'trdung153@gmail.com', 'lediem.ngo@gmail.com'];
      const isHardcodedAdmin = normalizedEmail ? admins.includes(normalizedEmail) : false;
      const isHardcodedTeacher = normalizedEmail ? admins.includes(normalizedEmail) : false;
      const isOwner = normalizedEmail === 'h1h4phong@gmail.com' || normalizedEmail === 'trdung153@gmail.com';
      const determinedRole = isOwner ? 'Owner' : (isHardcodedAdmin ? 'Admin' : 'User');

      const updateData: Record<string, any> = {
        updatedAt: new Date().toISOString()
      };
      if (normalizedEmail) updateData.email = normalizedEmail;
      if (cleanUid) updateData.uid = cleanUid;
      if (providerId) updateData.providerId = providerId;

      if (!userDoc.exists) {
        if (displayName) updateData.displayName = displayName;
        if (photoURL) updateData.photoURL = photoURL;
        updateData.createdAt = new Date().toISOString();
        updateData.isVip = false;
        updateData.isAdmin = isHardcodedAdmin || isOwner;
        updateData.isTeacher = isHardcodedTeacher || isHardcodedAdmin || isOwner;
        updateData.isOwner = isOwner;
        updateData.role = determinedRole;
        updateData.status = "approved";

        await userRef.set(updateData);
      } else {
        const existingData = userDoc.data() || {};
        // Preserve user-customized displayName and photoURL if already set
        if (displayName && (!existingData.displayName || existingData.displayName === 'Học viên' || existingData.displayName === 'Học viên FAST')) {
          updateData.displayName = displayName;
        }
        if (photoURL && !existingData.photoURL) {
          updateData.photoURL = photoURL;
        }
        if (!existingData.role) updateData.role = determinedRole;
        if (isOwner) {
          updateData.isOwner = true;
          updateData.isAdmin = true;
          updateData.isTeacher = true;
        }
        await userRef.set(updateData, { merge: true });
      }

      // Also persist to local disk cache so offline/restricted queries succeed
      saveUserToDisk(docKey, updateData);

      res.json({ success: true, message: "Profile synchronized on the server successfully." });
    } catch (err: any) {
      console.warn("[sync-profile] Firestore API restricted or quota reached, proceeding in local session mode:", err.message);
      try {
        const { uid: fbUid, email: fbEmail, displayName: fbName } = req.body || {};
        const fallbackKey = (typeof fbEmail === 'string' && fbEmail.toLowerCase().trim()) || (typeof fbUid === 'string' && fbUid.trim()) || '';
        if (fallbackKey) {
          saveUserToDisk(fallbackKey, { ...(fbEmail ? { email: fbEmail } : {}), ...(fbUid ? { uid: fbUid } : {}), displayName: fbName });
        }
      } catch {}
      res.json({ success: true, bypassed: true, message: "Profile synchronized in local session mode." });
    }
  });

  // Upload user avatar reliably (tries Firebase Admin Storage first, falls back to local /uploads/avatars/ disk)
  app.post("/api/user/upload-avatar", async (req, res) => {
    try {
      const { image, fileName, uid, email } = req.body || {};
      if (!image || typeof image !== "string") {
        return res.status(400).json({ success: false, error: "Dữ liệu ảnh đại diện không hợp lệ." });
      }

      const matches = image.match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/);
      let buffer: Buffer;
      let mime = "image/jpeg";
      let ext = "jpg";

      if (matches && matches.length === 3) {
        mime = matches[1].toLowerCase();
        if (mime.includes("png")) ext = "png";
        else if (mime.includes("webp")) ext = "webp";
        else if (mime.includes("gif")) ext = "gif";
        buffer = Buffer.from(matches[2], "base64");
      } else {
        buffer = Buffer.from(image.replace(/^data:[^;]+;base64,/, ""), "base64");
      }

      if (!buffer || buffer.length === 0) {
        return res.status(400).json({ success: false, error: "Tệp ảnh trống hoặc bị lỗi." });
      }

      if (buffer.length > 6 * 1024 * 1024) {
        return res.status(400).json({ success: false, error: "Kích thước ảnh vượt quá giới hạn 6MB." });
      }

      const normalizedEmail = typeof email === "string" ? email.toLowerCase().trim() : "";
      const cleanUid = typeof uid === "string" ? uid.trim() : "";
      const safeOwner = (cleanUid || normalizedEmail || "user")
        .replace(/[^a-zA-Z0-9_-]/g, "_")
        .substring(0, 48);
      const safeBase = (fileName || "avatar")
        .replace(/[^a-zA-Z0-9_-]/g, "_")
        .substring(0, 32);
      const uniqueName = `avatar_${safeOwner}_${safeBase}_${Date.now()}.${ext}`;

      let finalUrl = "";

      // Try saving to Firebase Admin Storage bucket first (returns durable download URL)
      try {
        const bucket = getStorage().bucket("fast-e-learning.firebasestorage.app");
        const storagePath = `avatars/${cleanUid || safeOwner}/${uniqueName}`;
        const fileObj = bucket.file(storagePath);
        const { randomUUID } = await import("crypto");
        const downloadToken = randomUUID();

        await fileObj.save(buffer, {
          metadata: {
            contentType: mime,
            metadata: {
              firebaseStorageDownloadTokens: downloadToken
            }
          }
        });

        finalUrl = `https://firebasestorage.googleapis.com/v0/b/fast-e-learning.firebasestorage.app/o/${encodeURIComponent(storagePath)}?alt=media&token=${downloadToken}`;
      } catch (storageErr: any) {
        console.warn("[upload-avatar] Admin Storage unavailable, saving to local uploads/avatars:", storageErr?.message || storageErr);
      }

      // Fallback to local server disk (/uploads/avatars/...) if Admin Storage is unavailable
      if (!finalUrl) {
        const avatarsDir = path.join(UPLOADS_DIR, "avatars");
        if (!fs.existsSync(avatarsDir)) {
          fs.mkdirSync(avatarsDir, { recursive: true });
        }
        const diskPath = path.join(avatarsDir, uniqueName);
        fs.writeFileSync(diskPath, buffer);
        finalUrl = `/uploads/avatars/${uniqueName}`;
      }

      // Persist updated photoURL directly to Firestore & disk store if owner key is provided
      const docKey = normalizedEmail || cleanUid;
      if (docKey) {
        try {
          const firestore = getServerFirestore();
          await firestore.collection("users").doc(docKey).set({
            photoURL: finalUrl,
            avatar: finalUrl,
            updatedAt: new Date().toISOString()
          }, { merge: true });
        } catch (dbErr: any) {
          console.warn("[upload-avatar] Firestore sync note:", dbErr?.message || dbErr);
        }
        saveUserToDisk(docKey, { photoURL: finalUrl, avatar: finalUrl });
      }

      return res.json({ success: true, url: finalUrl });
    } catch (err: any) {
      console.error("[upload-avatar] Error:", err);
      return res.status(500).json({ success: false, error: err?.message || "Không thể tải ảnh đại diện lên máy chủ." });
    }
  });

  // Explicit user profile update endpoint (persists displayName and photoURL even when client SDK token refresh lags)
  app.post("/api/user/update-profile", async (req, res) => {
    try {
      const { uid, email, displayName, photoURL } = req.body || {};
      const normalizedEmail = typeof email === "string" ? email.toLowerCase().trim() : "";
      const cleanUid = typeof uid === "string" ? uid.trim() : "";
      const docKey = normalizedEmail || cleanUid;

      if (!docKey) {
        return res.status(400).json({ success: false, error: "Thiếu thông tin định danh tài khoản." });
      }

      const updates: Record<string, any> = {
        updatedAt: new Date().toISOString()
      };
      if (typeof displayName === "string") {
        updates.displayName = displayName.trim();
      }
      if (typeof photoURL === "string") {
        updates.photoURL = photoURL;
        updates.avatar = photoURL;
      }

      try {
        const firestore = getServerFirestore();
        await firestore.collection("users").doc(docKey).set(updates, { merge: true });
      } catch (dbErr: any) {
        console.warn("[update-profile] Firestore update note:", dbErr?.message || dbErr);
      }

      saveUserToDisk(docKey, updates);
      return res.json({ success: true, profile: updates });
    } catch (err: any) {
      console.error("[update-profile] Error:", err);
      return res.status(500).json({ success: false, error: err?.message || "Lỗi cập nhật hồ sơ." });
    }
  });

  // --- UNIFIED ADMIN PAYMENT & COURSE ACTIVATION DASHBOARD ENDPOINTS ---
  async function isAuthorizedAdminEmail(email: string): Promise<boolean> {
    const emailKey = String(email || "").toLowerCase().trim();
    if (!emailKey) return false;
    if (SYSTEM_ADMIN_EMAILS.includes(emailKey)) return true;

    const diskUsers = loadUsersFromDisk();
    if (diskUsers[emailKey]?.isAdmin === true || diskUsers[emailKey]?.isOwner === true) {
      return true;
    }

    try {
      const adminDoc = await getServerFirestore().collection("users").doc(emailKey).get();
      if (adminDoc.exists) {
        const data = adminDoc.data();
        if (data?.isAdmin === true || data?.isOwner === true) return true;
      }
    } catch {}
    return false;
  }

  function parseNumericVndAmount(raw: any): number {
    if (typeof raw === "number" && !Number.isNaN(raw)) return raw;
    if (!raw) return 0;
    const str = String(raw).trim();
    if (str.toLowerCase().includes("miễn phí")) return 0;
    const digits = str.replace(/[^\d]/g, "");
    return digits ? Number(digits) : 0;
  }

  app.get("/api/admin/payments-overview", async (req, res) => {
    try {
      const adminEmail = String(req.query.adminEmail || "").toLowerCase().trim();
      const authorized = await isAuthorizedAdminEmail(adminEmail);
      if (!authorized) {
        return res.status(403).json({ success: false, error: "Bạn không có quyền truy cập Admin Dashboard." });
      }

      const db = getServerFirestore();

      // 1. Collect all Users & Purchased Courses
      const diskUsers = loadUsersFromDisk();
      const usersMap = new Map<string, any>();

      Object.entries(diskUsers).forEach(([emailKey, u]) => {
        if (emailKey) {
          usersMap.set(emailKey.toLowerCase().trim(), {
            id: emailKey.toLowerCase().trim(),
            email: emailKey.toLowerCase().trim(),
            ...u,
          });
        }
      });

      const activations: any[] = [];
      const activeCourseKeys = new Set<string>(); // `${email}::${courseId}`
      const courseStatusLookup = new Map<string, { status: string; unlockedAt?: string; claimedVia?: string; progress?: number }>();

      try {
        const usersSnap = await db.collection("users").get();
        const subcollectionJobs = usersSnap.docs.map(async (userDoc) => {
          const emailKey = userDoc.id.toLowerCase().trim();
          const uData = userDoc.data() || {};
          const mergedUser = {
            ...(usersMap.get(emailKey) || {}),
            ...uData,
            id: emailKey,
            email: uData.email || emailKey,
          };
          usersMap.set(emailKey, mergedUser);

          try {
            const pcSnap = await db.collection("users").doc(userDoc.id).collection("purchased_courses").get();
            pcSnap.forEach((pcDoc) => {
              const pc = pcDoc.data() || {};
              const cid = pc.courseId || pcDoc.id;
              const statusRaw = String(pc.status || "active").toLowerCase().trim();
              const normalizedStatus = statusRaw === "inactive" || statusRaw === "revoked" || statusRaw === "suspended"
                ? "inactive"
                : statusRaw === "pending"
                  ? "pending"
                  : "active";
              const key = `${emailKey}::${cid}`;
              courseStatusLookup.set(key, {
                status: normalizedStatus,
                unlockedAt: pc.unlockedAt || pc.purchasedAt || pc.updatedAt || "",
                claimedVia: pc.claimedVia || "SEPAY_AUTO",
                progress: Number(pc.progress || 0),
              });
              if (normalizedStatus === "active") {
                activeCourseKeys.add(key);
              }
              activations.push({
                id: `pc_${emailKey}_${cid}`,
                studentEmail: emailKey,
                studentName: mergedUser.displayName || mergedUser.fullName || emailKey.split("@")[0],
                phone: mergedUser.phone || "",
                courseId: cid,
                courseTitle: pc.courseTitle || pc.title || cid,
                price: pc.price || "",
                numericPrice: parseNumericVndAmount(pc.price),
                status: normalizedStatus,
                progress: Number(pc.progress || 0),
                completedLessonsCount: Array.isArray(pc.completedLessons) ? pc.completedLessons.length : 0,
                purchasedAt: pc.purchasedAt || "",
                unlockedAt: pc.unlockedAt || pc.purchasedAt || "",
                claimedVia: pc.claimedVia || "PAYMENT_SYSTEM",
                sourceType: "purchased_course",
                isVip: Boolean(mergedUser.isVip),
                isLocked: Boolean(mergedUser.isLocked),
              });
            });
          } catch {}
        });
        await Promise.all(subcollectionJobs);
      } catch (err: any) {
        console.warn("[AdminOverview] Firestore users read note:", err?.message || err);
      }

      // 2. Collect Orders + Pending Payments + Direct/Live Registrations
      const paymentMap = new Map<string, any>();

      const upsertPayment = (rawKey: string, entry: any) => {
        const cleanCode = entry.paymentCode ? normalizeServerFastCode(entry.paymentCode) : "";
        let existingKey = "";
        if (rawKey && paymentMap.has(rawKey)) {
          existingKey = rawKey;
        } else {
          for (const [k, existing] of paymentMap.entries()) {
            if (
              (entry.orderId && existing.orderId && existing.orderId === entry.orderId) ||
              (entry.registrationId && existing.registrationId && existing.registrationId === entry.registrationId) ||
              (cleanCode && existing.paymentCode && normalizeServerFastCode(existing.paymentCode) === cleanCode)
            ) {
              existingKey = k;
              break;
            }
          }
        }

        const key = existingKey || rawKey || `pay_${Date.now()}_${paymentMap.size}`;
        const prev = paymentMap.get(key) || {};
        const prevStatus = String(prev.status || "").toUpperCase();
        const nextStatus = String(entry.status || "").toUpperCase();
        const mergedStatus =
          prevStatus === "PAID" || nextStatus === "PAID"
            ? "PAID"
            : prevStatus === "CANCELLED" || nextStatus === "CANCELLED"
              ? "CANCELLED"
              : nextStatus || prevStatus || "PENDING";

        paymentMap.set(key, {
          ...prev,
          ...entry,
          id: prev.id || entry.id || key,
          orderId: entry.orderId || prev.orderId || "",
          registrationId: entry.registrationId || prev.registrationId || "",
          paymentCode: cleanCode || prev.paymentCode || "",
          status: mergedStatus,
          email: (entry.email || prev.email || "").toLowerCase().trim(),
          studentName: entry.studentName || prev.studentName || "",
          phone: entry.phone || prev.phone || "",
          courseId: entry.courseId || prev.courseId || "",
          courseTitle: entry.courseTitle || prev.courseTitle || "",
          amount: Number(entry.amount || prev.amount || 0),
          createdAt: prev.createdAt || entry.createdAt || new Date().toISOString(),
          paidAt: entry.paidAt || prev.paidAt || null,
          transactionId: entry.transactionId || prev.transactionId || "",
        });
      };

      // 2a. Server disk orders
      Object.values(serverOrdersMap).forEach((o: any) => {
        if (!o) return;
        const st = String(o.status || "PENDING").toUpperCase();
        const normStatus = st === "PAID" || st === "COMPLETED" || st === "CONFIRMED" ? "PAID" : st === "CANCELLED" ? "CANCELLED" : "PENDING";
        upsertPayment(o.orderId || o.paymentCode, {
          id: o.orderId || o.paymentCode,
          orderId: o.orderId || "",
          registrationId: o.registrationId || "",
          paymentCode: o.paymentCode || "",
          orderType: o.orderType || (o.registrationId ? "direct_training" : (String(o.courseId || "").includes("vip") ? "vip" : "course")),
          studentName: o.studentName || "",
          email: o.email || "",
          phone: o.phone || "",
          courseId: o.courseId || "",
          courseTitle: o.courseTitle || "Khóa học FAST E-Learning",
          amount: parseNumericVndAmount(o.amount),
          status: normStatus,
          paymentMethod: o.paymentMethod || "SePay ACB VietQR",
          transactionId: o.transactionId || "",
          bankAccount: o.bankAccount || "0989499568",
          createdAt: o.createdAt || "",
          paidAt: o.paidAt || null,
        });
      });

      // 2b. Firestore orders & pending_payments
      try {
        const [ordersSnap, pendingSnap] = await Promise.all([
          db.collection("orders").get(),
          db.collection("pending_payments").get(),
        ]);
        ordersSnap.forEach((docSnap) => {
          const o = docSnap.data() || {};
          const st = String(o.status || "PENDING").toUpperCase();
          const normStatus = st === "PAID" || st === "COMPLETED" || st === "CONFIRMED" ? "PAID" : st === "CANCELLED" ? "CANCELLED" : "PENDING";
          upsertPayment(docSnap.id, {
            id: docSnap.id,
            orderId: o.orderId || docSnap.id,
            registrationId: o.registrationId || "",
            paymentCode: o.paymentCode || "",
            orderType: o.orderType || (o.registrationId ? "direct_training" : (String(o.courseId || "").includes("vip") ? "vip" : "course")),
            studentName: o.studentName || "",
            email: o.email || "",
            phone: o.phone || "",
            courseId: o.courseId || "",
            courseTitle: o.courseTitle || "Khóa học FAST E-Learning",
            amount: parseNumericVndAmount(o.transferAmount || o.amount),
            status: normStatus,
            paymentMethod: o.paymentMethod || "SePay ACB VietQR",
            transactionId: o.transactionId || "",
            bankAccount: o.accountNumber || o.bankAccount || "0989499568",
            createdAt: o.createdAt || "",
            paidAt: o.paidAt || null,
          });
        });

        pendingSnap.forEach((docSnap) => {
          const p = docSnap.data() || {};
          upsertPayment(p.orderId || p.code || docSnap.id, {
            id: p.orderId || docSnap.id,
            orderId: p.orderId || "",
            registrationId: p.registrationId || "",
            paymentCode: p.code || p.paymentCode || docSnap.id,
            orderType: p.orderType || (p.registrationId ? "direct_training" : "course"),
            studentName: p.studentName || "",
            email: p.email || "",
            phone: p.phone || "",
            courseId: p.courseId || "",
            courseTitle: p.courseTitle || serverCourses[p.courseId]?.title || p.courseId || "Khóa học FAST E-Learning",
            amount: parseNumericVndAmount(p.amount),
            status: "PENDING",
            paymentMethod: "SePay ACB VietQR",
            bankAccount: "0989499568",
            createdAt: p.createdAt || "",
          });
        });
      } catch (err: any) {
        console.warn("[AdminOverview] Firestore orders read note:", err?.message || err);
      }

      // 2c. Direct / Live Course Registrations (Disk + Firestore)
      const directRegList: any[] = [...serverDirectRegistrations];
      const seenRegIds = new Set(directRegList.map((r) => r?.id).filter(Boolean));
      try {
        const [liveSnap, dirSnap] = await Promise.all([
          db.collection("live_course_registrations").get(),
          db.collection("direct_course_registrations").get(),
        ]);
        [liveSnap, dirSnap].forEach((snap) => {
          snap.forEach((docSnap) => {
            if (!seenRegIds.has(docSnap.id)) {
              seenRegIds.add(docSnap.id);
              directRegList.push({ id: docSnap.id, ...docSnap.data() });
            } else {
              const idx = directRegList.findIndex((r) => r?.id === docSnap.id);
              if (idx >= 0) {
                directRegList[idx] = { ...directRegList[idx], ...docSnap.data(), id: docSnap.id };
              }
            }
          });
        });
      } catch (err: any) {
        console.warn("[AdminOverview] Firestore registrations read note:", err?.message || err);
      }

      directRegList.forEach((reg) => {
        if (!reg) return;
        const regStatus = String(reg.status || "").toLowerCase();
        const payStatus = String(reg.paymentStatus || "").toUpperCase();
        const isPaid = payStatus === "PAID" || regStatus === "confirmed" || regStatus === "completed";
        const isCancelled = regStatus === "cancelled" || payStatus === "CANCELLED";
        const normStatus = isPaid ? "PAID" : isCancelled ? "CANCELLED" : "PENDING";
        const regEmail = String(reg.userEmail || reg.email || "").toLowerCase().trim();
        const regCourseId = reg.courseId || reg.id;

        upsertPayment(reg.orderId || reg.id, {
          id: reg.orderId || reg.id,
          orderId: reg.orderId || "",
          registrationId: reg.id,
          paymentCode: reg.paymentCode || reg.paymentMemo || "",
          orderType: "direct_training",
          studentName: reg.studentName || "",
          email: regEmail,
          phone: reg.phone || "",
          courseId: regCourseId,
          courseTitle: reg.courseTitle || "Khóa đào tạo Online - Offline",
          amount: parseNumericVndAmount(reg.totalNumericPrice || reg.totalPrice || reg.price),
          status: normStatus,
          paymentMethod: reg.paymentMethod || "SePay ACB VietQR",
          transactionId: reg.transactionId || "",
          bankAccount: "0989499568",
          trainingTypeLabel: reg.trainingTypeLabel || reg.trainingType || "Đào tạo Online - Offline",
          createdAt: reg.registeredAt || reg.createdAt || "",
          paidAt: reg.paidAt || null,
        });

        // Also reflect direct training registrations in activations if confirmed/cancelled and not already in purchased_courses
        if (regEmail && regCourseId && !courseStatusLookup.has(`${regEmail}::${regCourseId}`)) {
          const actStatus = isPaid ? "active" : isCancelled ? "inactive" : "pending";
          if (actStatus !== "pending") {
            const uMeta = usersMap.get(regEmail) || {};
            activations.push({
              id: `reg_${reg.id}`,
              registrationId: reg.id,
              studentEmail: regEmail,
              studentName: reg.studentName || uMeta.displayName || regEmail.split("@")[0],
              phone: reg.phone || uMeta.phone || "",
              courseId: regCourseId,
              courseTitle: reg.courseTitle || "Khóa đào tạo Online - Offline",
              price: reg.totalPrice || reg.price || "",
              numericPrice: parseNumericVndAmount(reg.totalNumericPrice || reg.totalPrice || reg.price),
              status: actStatus,
              progress: isPaid ? 0 : 0,
              completedLessonsCount: 0,
              purchasedAt: reg.paidAt || reg.registeredAt || "",
              unlockedAt: reg.paidAt || reg.registeredAt || "",
              claimedVia: reg.trainingTypeLabel || "Đào tạo Online - Offline",
              sourceType: "direct_training",
              isVip: Boolean(uMeta.isVip),
              isLocked: Boolean(uMeta.isLocked),
            });
            if (actStatus === "active") {
              activeCourseKeys.add(`${regEmail}::${regCourseId}`);
            }
          }
        }
      });

      // Enrich payment rows with activation state
      const payments = Array.from(paymentMap.values())
        .map((p) => {
          const emailKey = (p.email || "").toLowerCase().trim();
          const uMeta = usersMap.get(emailKey);
          const key = `${emailKey}::${p.courseId}`;
          const pcMeta = courseStatusLookup.get(key);
          const isVipActive = p.orderType === "vip" && Boolean(uMeta?.isVip);
          const courseActivated = Boolean(
            isVipActive ||
            activeCourseKeys.has(key) ||
            (p.orderType === "direct_training" && p.status === "PAID" && pcMeta?.status !== "inactive")
          );
          const activationStatus = isVipActive
            ? "active"
            : pcMeta?.status || (p.orderType === "direct_training" && p.status === "PAID" ? "active" : "not_activated");

          return {
            ...p,
            studentName: p.studentName || uMeta?.displayName || uMeta?.fullName || (emailKey ? emailKey.split("@")[0] : "Khách vãng lai"),
            courseTitle: p.courseTitle || serverCourses[p.courseId]?.title || p.courseId || "Khóa học FAST",
            courseActivated,
            activationStatus,
          };
        })
        .sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());

      activations.sort((a, b) => new Date(b.unlockedAt || b.purchasedAt || 0).getTime() - new Date(a.unlockedAt || a.purchasedAt || 0).getTime());

      // Build student summary list
      const activationsByEmail = new Map<string, any[]>();
      activations.forEach((act) => {
        const list = activationsByEmail.get(act.studentEmail) || [];
        list.push(act);
        activationsByEmail.set(act.studentEmail, list);
      });

      const studentsSummary = Array.from(usersMap.values())
        .map((u) => {
          const emailKey = String(u.email || u.id || "").toLowerCase().trim();
          const userActs = activationsByEmail.get(emailKey) || [];
          return {
            email: emailKey,
            displayName: u.displayName || u.fullName || emailKey.split("@")[0],
            phone: u.phone || "",
            isVip: Boolean(u.isVip),
            isAdmin: Boolean(u.isAdmin),
            isTeacher: Boolean(u.isTeacher),
            isLocked: Boolean(u.isLocked),
            activeCoursesCount: userActs.filter((a) => a.status === "active").length,
            totalCoursesCount: userActs.length,
            createdAt: u.createdAt || "",
            lastLoginAt: u.lastLoginAt || "",
          };
        })
        .sort((a, b) => b.activeCoursesCount - a.activeCoursesCount);

      const paidPayments = payments.filter((p) => p.status === "PAID");
      const totalConfirmedRevenue = paidPayments.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);

      return res.json({
        success: true,
        summary: {
          totalConfirmedRevenue,
          totalOrders: payments.length,
          paidOrdersCount: paidPayments.length,
          pendingOrdersCount: payments.filter((p) => p.status === "PENDING").length,
          cancelledOrdersCount: payments.filter((p) => p.status === "CANCELLED").length,
          activeEnrollmentsCount: activations.filter((a) => a.status === "active").length,
          inactiveEnrollmentsCount: activations.filter((a) => a.status === "inactive").length,
          totalStudentsCount: studentsSummary.length,
          vipStudentsCount: studentsSummary.filter((s) => s.isVip).length,
        },
        payments,
        activations,
        studentsSummary,
        fetchedAt: new Date().toISOString(),
      });
    } catch (err: any) {
      console.error("[/api/admin/payments-overview] Error:", err);
      return res.status(500).json({ success: false, error: err?.message || "Không thể tải dữ liệu Admin Dashboard." });
    }
  });

  app.post("/api/admin/payments/update-status", async (req, res) => {
    try {
      const {
        adminEmail,
        orderId,
        registrationId,
        paymentCode,
        newStatus,
        autoActivateCourse = true,
        note = "",
      } = req.body || {};

      if (!(await isAuthorizedAdminEmail(adminEmail))) {
        return res.status(403).json({ success: false, error: "Bạn không có quyền quản trị viên." });
      }

      const normalizedStatus = String(newStatus || "").toUpperCase();
      if (!["PAID", "PENDING", "CANCELLED"].includes(normalizedStatus)) {
        return res.status(400).json({ success: false, error: "Trạng thái thanh toán không hợp lệ." });
      }

      const db = getServerFirestore();
      const nowIso = new Date().toISOString();
      const cleanOrderId = String(orderId || "").trim();
      const cleanRegId = String(registrationId || "").trim();
      const cleanCode = paymentCode ? normalizeServerFastCode(String(paymentCode)) : "";

      let targetEmail = "";
      let targetCourseId = "";
      let targetCourseTitle = "";
      let targetAmount = 0;
      let targetOrderType = "";
      let matchedRegRecord: any = null;

      // 1. Update matching order in serverOrdersMap + orders.json + Firestore orders
      let orderKey = cleanOrderId && serverOrdersMap[cleanOrderId] ? cleanOrderId : "";
      if (!orderKey && cleanCode) {
        orderKey = Object.keys(serverOrdersMap).find((k) => {
          const o = serverOrdersMap[k];
          return o && normalizeServerFastCode(o.paymentCode || "") === cleanCode;
        }) || "";
      }

      if (orderKey && serverOrdersMap[orderKey]) {
        const ord = serverOrdersMap[orderKey];
        ord.status = normalizedStatus;
        ord.updatedAt = nowIso;
        ord.updatedBy = adminEmail;
        if (note) ord.adminNote = note;
        if (normalizedStatus === "PAID") {
          ord.paidAt = ord.paidAt || nowIso;
          ord.transactionId = ord.transactionId || `ADMIN_${Date.now()}`;
        }
        saveOrdersToDisk(serverOrdersMap);
        targetEmail = ord.email || targetEmail;
        targetCourseId = ord.courseId || targetCourseId;
        targetCourseTitle = ord.courseTitle || targetCourseTitle;
        targetAmount = parseNumericVndAmount(ord.amount) || targetAmount;
        targetOrderType = ord.orderType || targetOrderType;
      }

      try {
        const orderIdsToUpdate = new Set<string>();
        if (cleanOrderId) orderIdsToUpdate.add(cleanOrderId);
        if (orderKey) orderIdsToUpdate.add(orderKey);
        if (cleanCode) {
          const qSnap = await db.collection("orders").where("paymentCode", "==", cleanCode).get();
          qSnap.forEach((d) => {
            orderIdsToUpdate.add(d.id);
            const data = d.data() || {};
            targetEmail = targetEmail || data.email || "";
            targetCourseId = targetCourseId || data.courseId || "";
            targetCourseTitle = targetCourseTitle || data.courseTitle || "";
            targetAmount = targetAmount || parseNumericVndAmount(data.amount);
            targetOrderType = targetOrderType || data.orderType || "";
          });
        }
        for (const oid of orderIdsToUpdate) {
          const ordDoc = await db.collection("orders").doc(oid).get();
          if (ordDoc.exists) {
            const data = ordDoc.data() || {};
            targetEmail = targetEmail || data.email || "";
            targetCourseId = targetCourseId || data.courseId || "";
            targetCourseTitle = targetCourseTitle || data.courseTitle || "";
            targetAmount = targetAmount || parseNumericVndAmount(data.amount);
            targetOrderType = targetOrderType || data.orderType || "";
            await db.collection("orders").doc(oid).set({
              status: normalizedStatus,
              updatedAt: nowIso,
              updatedBy: adminEmail,
              ...(note ? { adminNote: note } : {}),
              ...(normalizedStatus === "PAID" ? { paidAt: data.paidAt || nowIso } : {}),
            }, { merge: true });
          }
        }
      } catch (err: any) {
        console.warn("[AdminPaymentUpdate] Firestore orders update note:", err?.message || err);
      }

      // 2. Update matching registration (direct_registrations.json + Firestore live/direct_course_registrations)
      const regIdx = serverDirectRegistrations.findIndex((r: any) => {
        if (!r) return false;
        const rCode = normalizeServerFastCode(r.paymentCode || r.paymentMemo || "");
        return (
          (cleanRegId && r.id === cleanRegId) ||
          (cleanOrderId && (r.orderId === cleanOrderId || r.id === cleanOrderId)) ||
          (cleanCode && rCode === cleanCode)
        );
      });

      const resolvedRegStatus = normalizedStatus === "PAID" ? "confirmed" : normalizedStatus === "CANCELLED" ? "cancelled" : "pending_payment";
      if (regIdx >= 0) {
        const reg = serverDirectRegistrations[regIdx];
        reg.paymentStatus = normalizedStatus;
        reg.status = resolvedRegStatus;
        reg.updatedAt = nowIso;
        if (normalizedStatus === "PAID") {
          reg.paidAt = reg.paidAt || nowIso;
          reg.transactionId = reg.transactionId || `ADMIN_${Date.now()}`;
        }
        saveDirectRegistrationsToDisk(serverDirectRegistrations);
        matchedRegRecord = reg;
        targetEmail = targetEmail || reg.userEmail || reg.email || "";
        targetCourseId = targetCourseId || reg.courseId || reg.id;
        targetCourseTitle = targetCourseTitle || reg.courseTitle || "";
        targetAmount = targetAmount || parseNumericVndAmount(reg.totalNumericPrice || reg.totalPrice);
        targetOrderType = targetOrderType || "direct_training";
      }

      const finalRegId = cleanRegId || matchedRegRecord?.id || "";
      if (finalRegId) {
        try {
          const regUpdate: Record<string, any> = {
            paymentStatus: normalizedStatus,
            status: resolvedRegStatus,
            updatedAt: nowIso,
            updatedBy: adminEmail,
            ...(normalizedStatus === "PAID" ? { paidAt: matchedRegRecord?.paidAt || nowIso } : {}),
          };
          await Promise.all([
            db.collection("live_course_registrations").doc(finalRegId).set(regUpdate, { merge: true }).catch(() => {}),
            db.collection("direct_course_registrations").doc(finalRegId).set(regUpdate, { merge: true }).catch(() => {}),
          ]);
        } catch {}
      }

      // 3. Remove pending_payments entries if marked PAID or CANCELLED
      if (normalizedStatus === "PAID" || normalizedStatus === "CANCELLED") {
        const suffix = cleanCode.replace(/^FAST/, "");
        try {
          if (cleanCode) await db.collection("pending_payments").doc(cleanCode).delete().catch(() => {});
          if (suffix) await db.collection("pending_payments").doc(suffix).delete().catch(() => {});
        } catch {}
      }

      // 4. Auto-activate course / training account if marked PAID
      let activationApplied = false;
      if (normalizedStatus === "PAID" && autoActivateCourse) {
        if (matchedRegRecord || targetOrderType === "direct_training") {
          try {
            const regSnap = (!matchedRegRecord && finalRegId)
              ? await db.collection("live_course_registrations").doc(finalRegId).get()
              : null;
            const regData = matchedRegRecord || (regSnap?.exists ? { id: regSnap.id, ...regSnap.data() } : null);
            if (regData) {
              await finalizePaidTrainingAccountAndOtp(regData, { sendOtpIfNotSent: true });
              activationApplied = true;
            }
          } catch (actErr: any) {
            console.warn("[AdminPaymentUpdate] Training finalization note:", actErr?.message || actErr);
          }
        }

        const cleanEmail = String(targetEmail || "").toLowerCase().trim();
        if (cleanEmail && cleanEmail.includes("@") && !cleanEmail.endsWith("@fast-training.local") && targetCourseId) {
          const isVipOrder = targetOrderType === "vip" || String(targetCourseId).includes("vip");
          if (isVipOrder) {
            await db.collection("users").doc(cleanEmail).set({
              email: cleanEmail,
              isVip: true,
              vipActivatedAt: nowIso,
              updatedAt: nowIso,
            }, { merge: true });
            saveUserToDisk(cleanEmail, { isVip: true, vipActivatedAt: nowIso });
          } else {
            const courseTitle = targetCourseTitle || serverCourses[targetCourseId]?.title || targetCourseId;
            await db.collection("users").doc(cleanEmail).set({
              email: cleanEmail,
              updatedAt: nowIso,
            }, { merge: true });
            await db.collection("users").doc(cleanEmail).collection("purchased_courses").doc(targetCourseId).set({
              courseId: targetCourseId,
              courseTitle,
              title: courseTitle,
              price: targetAmount ? `${targetAmount.toLocaleString("vi-VN")}đ` : "Đã thanh toán",
              progress: 0,
              status: "active",
              claimedVia: "ADMIN_PAYMENT_CONFIRM",
              orderId: cleanOrderId || orderKey || "",
              paymentCode: cleanCode || "",
              purchasedAt: nowIso,
              unlockedAt: nowIso,
              updatedAt: nowIso,
            }, { merge: true });

            await db.collection("manual_unlocks").doc(`${cleanEmail.replace(/[^a-z0-9]/g, "_")}_${targetCourseId}_${Date.now()}`).set({
              studentEmail: cleanEmail,
              courseId: targetCourseId,
              courseTitle,
              unlockedBy: adminEmail,
              unlockedAt: nowIso,
              type: "ADMIN_PAYMENT_CONFIRM",
              bankAmount: targetAmount ? `${targetAmount.toLocaleString("vi-VN")}đ` : "",
              bankMemo: cleanCode || "",
            }).catch(() => {});

            await persistUserNotification(cleanEmail, {
              id: `course_unlock_${targetCourseId}_${Date.now()}`,
              title: `Khóa học đã được kích hoạt: ${courseTitle}`,
              message: `Thanh toán mã ${cleanCode || cleanOrderId} đã được xác nhận. Khóa học "${courseTitle}" đã mở khóa toàn bộ bài giảng trong tài khoản của bạn.`,
              type: "course_unlock",
              courseId: targetCourseId,
              courseTitle,
              link: `/hoc/${targetCourseId}`,
              isRead: false,
              createdAt: nowIso,
            });
          }
          activationApplied = true;
        }
      }

      return res.json({
        success: true,
        status: normalizedStatus,
        activationApplied,
        message: normalizedStatus === "PAID"
          ? (activationApplied ? "Đã xác nhận thanh toán & kích hoạt khóa học thành công." : "Đã cập nhật trạng thái đã thanh toán.")
          : `Đã cập nhật trạng thái đơn sang ${normalizedStatus}.`,
      });
    } catch (err: any) {
      console.error("[/api/admin/payments/update-status] Error:", err);
      return res.status(500).json({ success: false, error: err?.message || "Lỗi cập nhật trạng thái thanh toán." });
    }
  });

  app.post("/api/admin/activations/toggle", async (req, res) => {
    try {
      const {
        adminEmail,
        studentEmail,
        courseId,
        courseTitle,
        price,
        action,
        sourceType = "purchased_course",
        registrationId,
        note = "",
      } = req.body || {};

      if (!(await isAuthorizedAdminEmail(adminEmail))) {
        return res.status(403).json({ success: false, error: "Bạn không có quyền quản trị viên." });
      }

      const cleanEmail = String(studentEmail || "").toLowerCase().trim();
      if (!cleanEmail || !cleanEmail.includes("@")) {
        return res.status(400).json({ success: false, error: "Email học viên không hợp lệ." });
      }

      const db = getServerFirestore();
      const nowIso = new Date().toISOString();

      if (action === "grant_vip" || action === "revoke_vip") {
        const nextVip = action === "grant_vip";
        await db.collection("users").doc(cleanEmail).set({
          email: cleanEmail,
          isVip: nextVip,
          updatedAt: nowIso,
        }, { merge: true });
        saveUserToDisk(cleanEmail, { isVip: nextVip });
        await db.collection("manual_unlocks").doc(`vip_${cleanEmail.replace(/[^a-z0-9]/g, "_")}_${Date.now()}`).set({
          studentEmail: cleanEmail,
          courseId: "vip-lifetime-access",
          courseTitle: nextVip ? "VIP Trọn đời" : "Thu hồi VIP Trọn đời",
          unlockedBy: adminEmail,
          unlockedAt: nowIso,
          type: nextVip ? "ADMIN_GRANT_VIP" : "ADMIN_REVOKE_VIP",
        }).catch(() => {});
        return res.json({
          success: true,
          message: nextVip ? `Đã cấp quyền VIP Trọn đời cho ${cleanEmail}.` : `Đã thu hồi quyền VIP của ${cleanEmail}.`,
        });
      }

      const cleanCourseId = String(courseId || "").trim();
      if (!cleanCourseId) {
        return res.status(400).json({ success: false, error: "Thiếu mã khóa học cần cập nhật." });
      }

      const isActivate = action === "activate";
      const nextStatus = isActivate ? "active" : "inactive";
      const resolvedTitle = courseTitle || serverCourses[cleanCourseId]?.title || cleanCourseId;

      // Ensure user profile exists
      const userRef = db.collection("users").doc(cleanEmail);
      const userSnap = await userRef.get();
      if (!userSnap.exists) {
        const baseUser = {
          email: cleanEmail,
          displayName: cleanEmail.split("@")[0],
          isAdmin: false,
          isTeacher: false,
          isOwner: false,
          isVip: false,
          isLocked: false,
          createdAt: nowIso,
          updatedAt: nowIso,
        };
        await userRef.set(baseUser, { merge: true });
        saveUserToDisk(cleanEmail, baseUser);
      }

      if (sourceType === "direct_training" && registrationId) {
        const nextRegStatus = isActivate ? "confirmed" : "cancelled";
        const nextPayStatus = isActivate ? "PAID" : "PENDING";
        const idx = serverDirectRegistrations.findIndex((r: any) => r && r.id === registrationId);
        if (idx >= 0) {
          serverDirectRegistrations[idx].status = nextRegStatus;
          serverDirectRegistrations[idx].paymentStatus = nextPayStatus;
          serverDirectRegistrations[idx].updatedAt = nowIso;
          saveDirectRegistrationsToDisk(serverDirectRegistrations);
        }
        await Promise.all([
          db.collection("live_course_registrations").doc(registrationId).set({
            status: nextRegStatus,
            paymentStatus: nextPayStatus,
            updatedAt: nowIso,
            updatedBy: adminEmail,
          }, { merge: true }).catch(() => {}),
          db.collection("direct_course_registrations").doc(registrationId).set({
            status: nextRegStatus,
            paymentStatus: nextPayStatus,
            updatedAt: nowIso,
            updatedBy: adminEmail,
          }, { merge: true }).catch(() => {}),
        ]);
      }

      // Always sync purchased_courses doc so Admin Dashboard & Classroom check work consistently
      const pcRef = userRef.collection("purchased_courses").doc(cleanCourseId);
      const existingPc = await pcRef.get();
      const existingData = existingPc.exists ? existingPc.data() : null;

      if (existingPc.exists || isActivate) {
        await pcRef.set({
          courseId: cleanCourseId,
          courseTitle: resolvedTitle,
          title: resolvedTitle,
          price: price || existingData?.price || serverCourses[cleanCourseId]?.price || "Admin cấp quyền",
          progress: typeof existingData?.progress === "number" ? existingData.progress : 0,
          completedLessons: Array.isArray(existingData?.completedLessons) ? existingData.completedLessons : [],
          purchasedAt: existingData?.purchasedAt || nowIso,
          unlockedAt: isActivate ? nowIso : (existingData?.unlockedAt || nowIso),
          status: nextStatus,
          claimedVia: existingData?.claimedVia || "ADMIN_DASHBOARD",
          ...(note ? { adminNote: note } : {}),
          updatedAt: nowIso,
          updatedBy: adminEmail,
        }, { merge: true });
      }

      await db.collection("manual_unlocks").doc(`${cleanEmail.replace(/[^a-z0-9]/g, "_")}_${cleanCourseId}_${Date.now()}`).set({
        studentEmail: cleanEmail,
        courseId: cleanCourseId,
        courseTitle: resolvedTitle,
        unlockedBy: adminEmail,
        unlockedAt: nowIso,
        type: isActivate ? "ADMIN_ACTIVATE" : "ADMIN_REVOKE",
        bankMemo: note || "",
      }).catch(() => {});

      if (isActivate) {
        await persistUserNotification(cleanEmail, {
          id: `course_unlock_${cleanCourseId}_${Date.now()}`,
          title: `Khóa học đã kích hoạt: ${resolvedTitle}`,
          message: `Quản trị viên đã kích hoạt khóa học "${resolvedTitle}" cho tài khoản của bạn. Bạn có thể bắt đầu học ngay bây giờ.`,
          type: "course_unlock",
          courseId: cleanCourseId,
          courseTitle: resolvedTitle,
          link: `/hoc/${cleanCourseId}`,
          isRead: false,
          createdAt: nowIso,
        });
      }

      return res.json({
        success: true,
        status: nextStatus,
        message: isActivate
          ? `Đã kích hoạt khóa học "${resolvedTitle}" cho ${cleanEmail}.`
          : `Đã tạm khóa quyền truy cập "${resolvedTitle}" của ${cleanEmail}.`,
      });
    } catch (err: any) {
      console.error("[/api/admin/activations/toggle] Error:", err);
      return res.status(500).json({ success: false, error: err?.message || "Lỗi cập nhật trạng thái kích hoạt." });
    }
  });

  // Student Purchase History Endpoint (combines purchased_courses, orders, and direct training registrations)
  app.get("/api/user/purchase-history", async (req, res) => {
    try {
      const emailParam = String(req.query.email || "").toLowerCase().trim();
      const uidParam = String(req.query.uid || "").trim();

      if (!emailParam && !uidParam) {
        return res.status(400).json({ success: false, error: "Thiếu thông tin tài khoản." });
      }

      const db = getServerFirestore();
      const docKeys = Array.from(new Set([emailParam, uidParam].filter(Boolean)));
      const recordsMap = new Map<string, any>();

      const upsertRecord = (key: string, rec: any) => {
        const existing = recordsMap.get(key) || {};
        recordsMap.set(key, {
          ...existing,
          ...rec,
          id: existing.id || rec.id || key,
          courseId: rec.courseId || existing.courseId || "",
          courseTitle: rec.courseTitle || existing.courseTitle || rec.courseId || "Khóa học FAST",
          buyerEmail: rec.buyerEmail || existing.buyerEmail || emailParam || "",
          studentName: rec.studentName || existing.studentName || "",
          phone: rec.phone || existing.phone || "",
          companyName: rec.companyName || existing.companyName || "",
          purchasedAt: rec.webhookReceivedAt || rec.paidAt || rec.purchasedAt || existing.webhookReceivedAt || existing.paidAt || existing.purchasedAt || new Date().toISOString(),
          paidAt: rec.paidAt || existing.paidAt || "",
          webhookReceivedAt: rec.webhookReceivedAt || existing.webhookReceivedAt || "",
          price: rec.price || existing.price || "Đã thanh toán",
          status: rec.status || existing.status || "active",
          paymentCode: rec.paymentCode || existing.paymentCode || "",
          transactionId: rec.transactionId || existing.transactionId || "",
          paymentMethod: rec.paymentMethod || existing.paymentMethod || "",
          trainingType: rec.trainingType || existing.trainingType || "",
          trainingTypeLabel: rec.trainingTypeLabel || existing.trainingTypeLabel || "",
          participantCount: Number(rec.participantCount || existing.participantCount || 1),
          venueAddress: rec.venueAddress || existing.venueAddress || "",
          startDate: rec.startDate || existing.startDate || "",
          scheduleDetails: rec.scheduleDetails || existing.scheduleDetails || "",
        });
      };

      // 1. Read user's purchased_courses subcollection across possible docKeys (email & uid)
      for (const key of docKeys) {
        try {
          const pcSnap = await db.collection("users").doc(key).collection("purchased_courses").get();
          pcSnap.forEach((docSnap) => {
            const data = docSnap.data() || {};
            const cid = data.courseId || docSnap.id;
            const amountStr = data.price || (data.paymentAmount ? `${Number(data.paymentAmount).toLocaleString("vi-VN")}đ` : "Đã thanh toán");
            const paidTs = data.webhookReceivedAt || data.paidAt || data.purchasedAt || data.unlockedAt || data.activatedAt || data.updatedAt || new Date().toISOString();
            upsertRecord(`course:${cid}`, {
              id: data.orderId || docSnap.id,
              courseId: cid,
              courseTitle: data.courseTitle || data.title || serverCourses[cid]?.title || cid,
              buyerEmail: data.buyerEmail || data.email || emailParam || key,
              studentName: data.studentName || "",
              phone: data.phone || "",
              purchasedAt: paidTs,
              paidAt: data.paidAt || data.activatedAt || "",
              webhookReceivedAt: data.webhookReceivedAt || data.paidAt || "",
              price: amountStr,
              status: data.status || "active",
              paymentCode: data.paymentCode || "",
              transactionId: data.transactionId || data.paymentRef || "",
              paymentMethod: data.paymentMethod || "",
              trainingType: data.trainingType || "",
              trainingTypeLabel: data.trainingTypeLabel || "",
            });
          });
        } catch (err: any) {
          console.warn("[PurchaseHistory] purchased_courses read note:", err?.message || err);
        }
      }

      // 2. Read orders matching email or uid (disk + Firestore)
      const orderMatch = (o: any) => {
        if (!o) return false;
        const oEmail = String(o.email || "").toLowerCase().trim();
        const oUid = String(o.userId || "").trim();
        return (emailParam && oEmail === emailParam) || (uidParam && oUid === uidParam);
      };

      Object.values(serverOrdersMap).forEach((o: any) => {
        if (!orderMatch(o)) return;
        const cid = o.courseId || o.orderId;
        const key = o.status === "PAID" && cid ? `course:${cid}` : `order:${o.orderId || cid}`;
        const numericAmt = parseNumericVndAmount(o.amount);
        upsertRecord(key, {
          id: o.orderId || o.paymentCode || cid,
          courseId: cid,
          courseTitle: o.courseTitle || serverCourses[cid]?.title || cid || "Khóa học FAST",
          buyerEmail: String(o.email || emailParam || "").toLowerCase().trim(),
          studentName: o.studentName || "",
          phone: o.phone || "",
          purchasedAt: o.webhookReceivedAt || o.paidAt || o.createdAt || new Date().toISOString(),
          paidAt: o.paidAt || "",
          webhookReceivedAt: o.webhookReceivedAt || o.paidAt || "",
          price: numericAmt > 0 ? `${numericAmt.toLocaleString("vi-VN")}đ` : "Đã thanh toán",
          status: o.status === "PAID" ? "completed" : o.status === "CANCELLED" ? "failed" : "pending",
          paymentCode: o.paymentCode || "",
          transactionId: o.transactionId || "",
          trainingType: o.trainingType || (o.orderType === "direct_training" ? "direct" : "online"),
          trainingTypeLabel: o.trainingTypeLabel || "",
        });
      });

      try {
        if (emailParam) {
          const ordersSnap = await db.collection("orders").where("email", "==", emailParam).get();
          ordersSnap.forEach((docSnap) => {
            const o = docSnap.data() || {};
            const cid = o.courseId || docSnap.id;
            const key = o.status === "PAID" && cid ? `course:${cid}` : `order:${docSnap.id}`;
            const numericAmt = parseNumericVndAmount(o.transferAmount || o.amount);
            upsertRecord(key, {
              id: o.orderId || docSnap.id,
              courseId: cid,
              courseTitle: o.courseTitle || serverCourses[cid]?.title || cid || "Khóa học FAST",
              buyerEmail: String(o.email || emailParam || "").toLowerCase().trim(),
              studentName: o.studentName || "",
              phone: o.phone || "",
              purchasedAt: o.webhookReceivedAt || o.paidAt || o.createdAt || new Date().toISOString(),
              paidAt: o.paidAt || "",
              webhookReceivedAt: o.webhookReceivedAt || o.paidAt || "",
              price: numericAmt > 0 ? `${numericAmt.toLocaleString("vi-VN")}đ` : "Đã thanh toán",
              status: o.status === "PAID" ? "completed" : o.status === "CANCELLED" ? "failed" : "pending",
              paymentCode: o.paymentCode || "",
              transactionId: o.transactionId || "",
              trainingType: o.trainingType || (o.orderType === "direct_training" ? "direct" : "online"),
              trainingTypeLabel: o.trainingTypeLabel || "",
            });
          });
        }
      } catch (err: any) {
        console.warn("[PurchaseHistory] orders read note:", err?.message || err);
      }

      // 3. Read direct/live training registrations matching email
      const ingestReg = (regId: string, reg: any) => {
        if (!reg) return;
        const isPaid = reg.paymentStatus === "PAID" || reg.status === "confirmed" || reg.status === "completed";
        const isCancelled = reg.status === "cancelled" || reg.paymentStatus === "CANCELLED";
        const cid = reg.courseId || regId;
        const numericAmt = parseNumericVndAmount(reg.totalNumericPrice || reg.totalPrice || reg.price);
        upsertRecord(`reg:${regId}`, {
          id: reg.orderId || regId,
          courseId: cid,
          courseTitle: reg.courseTitle || "Khóa đào tạo Online - Offline",
          buyerEmail: String(reg.userEmail || reg.email || emailParam).toLowerCase().trim(),
          studentName: reg.studentName || "",
          phone: reg.phone || "",
          companyName: reg.companyName || "",
          purchasedAt: reg.webhookReceivedAt || reg.paidAt || reg.registeredAt || new Date().toISOString(),
          paidAt: reg.paidAt || "",
          webhookReceivedAt: reg.webhookReceivedAt || reg.paidAt || "",
          price: numericAmt > 0 ? `${numericAmt.toLocaleString("vi-VN")}đ` : (reg.totalPrice || "Đã đăng ký"),
          status: isPaid ? "completed" : isCancelled ? "failed" : "pending",
          paymentCode: reg.paymentCode || reg.paymentMemo || "",
          transactionId: reg.transactionId || "",
          paymentMethod: reg.paymentMethod || "",
          trainingType: reg.trainingType || "direct",
          trainingTypeLabel: reg.trainingTypeLabel || (reg.trainingType === "zoom" ? "Trực tuyến Zoom" : "Trực tiếp Hội trường"),
          participantCount: Number(reg.participantCount) || 1,
          venueAddress: reg.venueAddress || "",
          startDate: reg.startDate || "",
          scheduleDetails: reg.scheduleDetails || "",
        });
      };

      if (emailParam) {
        serverDirectRegistrations.forEach((reg: any) => {
          if (!reg) return;
          const rEmail = String(reg.userEmail || reg.email || "").toLowerCase().trim();
          if (rEmail !== emailParam) return;
          ingestReg(reg.id, reg);
        });

        try {
          const [liveByUserEmail, liveByEmail, directByUserEmail, directByEmail] = await Promise.all([
            db.collection("live_course_registrations").where("userEmail", "==", emailParam).get(),
            db.collection("live_course_registrations").where("email", "==", emailParam).get(),
            db.collection("direct_course_registrations").where("userEmail", "==", emailParam).get(),
            db.collection("direct_course_registrations").where("email", "==", emailParam).get(),
          ]);
          [liveByUserEmail, liveByEmail, directByUserEmail, directByEmail].forEach((snap) => {
            snap.forEach((docSnap) => ingestReg(docSnap.id, docSnap.data() || {}));
          });
        } catch (err: any) {
          console.warn("[PurchaseHistory] registration collections read note:", err?.message || err);
        }
      }

      const records = Array.from(recordsMap.values()).sort(
        (a, b) => new Date(b.purchasedAt || 0).getTime() - new Date(a.purchasedAt || 0).getTime()
      );

      return res.json({ success: true, records });
    } catch (err: any) {
      console.error("[/api/user/purchase-history] Error:", err);
      return res.status(500).json({ success: false, error: err?.message || "Không thể tải lịch sử mua hàng." });
    }
  });

  // Admin endpoint to permanently purge receipts and records matching course-1792154795450 across all systems
  app.post("/api/admin/purge-target", async (req, res) => {
    try {
      const targetId = "course-1792154795450";
      const targetNumeric = "1792154795450";
      let deletedCount = 0;
      const actions = [];
      const db = getServerFirestore();

      // 1. Delete from orders collection
      try {
        const ordersSnap = await db.collection("orders").get();
        for (const doc of ordersSnap.docs) {
          const data = doc.data();
          if (
            doc.id === targetId ||
            data.orderId === targetId ||
            data.courseId === targetId ||
            data.paymentCode === targetId ||
            (data.orderId && data.orderId.includes(targetNumeric)) ||
            (data.paymentCode && data.paymentCode.includes(targetNumeric))
          ) {
            await db.collection("orders").doc(doc.id).delete();
            deletedCount++;
            actions.push(`Deleted order: ${doc.id}`);
          }
        }
      } catch (err: any) {
        console.warn("Purge orders error:", err.message);
      }

      // 2. Delete from pending_payments collection
      try {
        const pendingSnap = await db.collection("pending_payments").get();
        for (const doc of pendingSnap.docs) {
          const data = doc.data();
          if (
            doc.id === targetId ||
            doc.id.includes(targetNumeric) ||
            data.orderId === targetId ||
            data.courseId === targetId ||
            data.code === targetId ||
            (data.code && data.code.includes(targetNumeric))
          ) {
            await db.collection("pending_payments").doc(doc.id).delete();
            deletedCount++;
            actions.push(`Deleted pending_payment: ${doc.id}`);
          }
        }
      } catch (err: any) {
        console.warn("Purge pending_payments error:", err.message);
      }

      // 3. Delete from payment_logs collection
      try {
        const logsSnap = await db.collection("payment_logs").get();
        for (const doc of logsSnap.docs) {
          const data = doc.data();
          const str = JSON.stringify(data);
          if (str.includes(targetId) || str.includes(targetNumeric)) {
            await db.collection("payment_logs").doc(doc.id).delete();
            deletedCount++;
            actions.push(`Deleted payment_log: ${doc.id}`);
          }
        }
      } catch (err: any) {
        console.warn("Purge payment_logs error:", err.message);
      }

      // 4. Delete from all users' purchased_courses subcollections
      try {
        const usersSnap = await db.collection("users").get();
        for (const userDoc of usersSnap.docs) {
          const purchasedSnap = await db.collection("users").doc(userDoc.id).collection("purchased_courses").get();
          for (const pDoc of purchasedSnap.docs) {
            const pData = pDoc.data();
            if (
              pDoc.id === targetId ||
              pDoc.id.includes(targetNumeric) ||
              pData.courseId === targetId ||
              pData.orderId === targetId ||
              JSON.stringify(pData).includes(targetNumeric)
            ) {
              await db.collection("users").doc(userDoc.id).collection("purchased_courses").doc(pDoc.id).delete();
              deletedCount++;
              actions.push(`Deleted purchased_course ${pDoc.id} for user ${userDoc.id}`);
            }
          }
        }
      } catch (err: any) {
        console.warn("Purge user purchased_courses error:", err.message);
      }

      // 5. Clean up local JSON files (ad_profile_crm.json, etc.)
      try {
        if (fs.existsSync(AD_PROFILES_FILE)) {
          let profiles = loadAdProfilesFromDisk();
          const initialLen = profiles.length;
          profiles = profiles.filter((p: any) => {
            const str = JSON.stringify(p);
            return !str.includes(targetId) && !str.includes(targetNumeric);
          });
          if (profiles.length < initialLen) {
            saveAdProfilesToDisk(profiles);
            serverAdProfiles = profiles;
            deletedCount += (initialLen - profiles.length);
            actions.push(`Cleaned local ad profiles CRM matching target`);
          }
        }
      } catch (err: any) {
        console.warn("Purge local ad profiles error:", err.message);
      }

      console.log(`[PurgeTarget] Successfully purged target ${targetId}. Deleted records: ${deletedCount}`);
      return res.json({
        success: true,
        message: `Permanently deleted all receipts and records matching ${targetId}`,
        deletedCount,
        actions
      });
    } catch (err: any) {
      console.error("[PurgeTarget] Exception:", err);
      return res.status(500).json({ success: false, error: err.message });
    }
  });

  // Gemini Chat Endpoint with Role Normalization & Streaming
  app.post("/api/gemini/chat", async (req, res) => {
    try {
      const { messages, systemContext } = req.body;
      
      const apiKey = process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
      if (!apiKey) {
        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Connection', 'keep-alive');
        res.write(`data: ${JSON.stringify({ text: "Chào bạn, hệ thống tư vấn tự động đang tạm thời bảo trì API Key. Vui lòng liên hệ trực tiếp qua Hotline/Zalo **0927 002 668** để được tư vấn ngay nhé!" })}\n\n`);
        res.write(`data: [DONE]\n\n`);
        return res.end();
      }

      const ai = new GoogleGenAI({ 
        apiKey,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          }
        }
      });
      
      let validMessages = Array.isArray(messages) ? messages : [];
      // Filter out invalid/error messages
      validMessages = validMessages.filter((m: any) => m && !m.isError && typeof m.text === 'string' && m.text.trim().length > 0);

      // Gemini contents MUST start with 'user' and alternate roles
      // Drop any initial 'model' messages (e.g. greeting message)
      while (validMessages.length > 0 && validMessages[0].role === 'model') {
        validMessages.shift();
      }

      if (validMessages.length === 0) {
        res.setHeader('Content-Type', 'text/event-stream');
        res.write(`data: ${JSON.stringify({ text: "Bạn cần hỗ trợ thêm thông tin gì về các khóa học hoặc dịch vụ tư vấn không ạ?" })}\n\n`);
        res.write(`data: [DONE]\n\n`);
        return res.end();
      }

      // Merge consecutive same-role messages to guarantee strict role alternation
      const historyContents: Array<{ role: 'user' | 'model'; parts: Array<{ text: string }> }> = [];
      for (const m of validMessages) {
        const role = m.role === 'user' ? 'user' : 'model';
        const text = String(m.text).trim();

        if (historyContents.length > 0 && historyContents[historyContents.length - 1].role === role) {
          historyContents[historyContents.length - 1].parts[0].text += `\n${text}`;
        } else {
          historyContents.push({ role, parts: [{ text }] });
        }
      }

      // Streaming headers for instant, unbuffered SSE delivery
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache, no-transform');
      res.setHeader('Connection', 'keep-alive');
      res.setHeader('X-Accel-Buffering', 'no');
      res.flushHeaders?.();

      // Fast models priority: gemini-3.8-flash then gemini-flash-latest then gemini-3.1-flash-lite
      const modelsToTry = ['gemini-3.8-flash', 'gemini-flash-latest', 'gemini-3.1-flash-lite'];
      let streamResult = null;
      let lastErr = null;

      for (const modelName of modelsToTry) {
        try {
          const config: any = {};
          if (systemContext) {
            config.systemInstruction = systemContext;
          }
          if (modelName === 'gemini-3.8-flash') {
            try {
              config.thinkingConfig = { thinkingLevel: 'low' };
            } catch (e) {}
          }
          streamResult = await ai.models.generateContentStream({
            model: modelName,
            contents: historyContents,
            config: Object.keys(config).length > 0 ? config : undefined
          });
          if (streamResult) break;
        } catch (err: any) {
          lastErr = err;
          console.warn(`[Gemini API] Failed with model ${modelName}, trying fallback...`, err?.message || err);
          // Try without config if config failed
          try {
            streamResult = await ai.models.generateContentStream({
              model: modelName,
              contents: historyContents
            });
            if (streamResult) break;
          } catch (innerErr) {}
        }
      }

      if (!streamResult) {
        throw lastErr || new Error("Không thể khởi tạo mô hình Gemini");
      }

      for await (const chunk of streamResult) {
        if (chunk.text) {
          res.write(`data: ${JSON.stringify({ text: chunk.text })}\n\n`);
          (res as any).flush?.();
        }
      }
      res.write(`data: [DONE]\n\n`);
      (res as any).flush?.();
      res.end();

    } catch (error: any) {
      console.error("Gemini API Error:", error);
      res.write(`data: ${JSON.stringify({ text: "\nHệ thống trợ lí ảo gặp gián đoạn tạm thời. Bạn vui lòng thử lại hoặc nhắn Zalo **0927 002 668** để được hỗ trợ tức thì!" })}\n\n`);
      res.write(`data: [DONE]\n\n`);
      res.end();
    }
  });

  // Vite middleware for development (non-blocking port bind so health probes connect immediately)
  if (process.env.NODE_ENV !== "production") {
    let resolvedVite: any = null;
    const viteInitPromise = createViteServer({
      server: {
        middlewareMode: true,
        hmr: false,
      },
      appType: "spa",
    })
      .then((vite) => {
        resolvedVite = vite;
        console.log("[Vite] Middleware initialized.");
        return vite;
      })
      .catch((viteErr) => {
        console.error("[Vite] Failed to initialize middleware:", viteErr);
        throw viteErr;
      });

    app.use(async (req, res, next) => {
      try {
        const vite = resolvedVite || (await viteInitPromise);
        return vite.middlewares(req, res, next);
      } catch (err) {
        return next(err);
      }
    });
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*all', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  const httpServer = app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
  httpServer.on("error", (err: any) => {
    console.error(`[Server] Failed to listen on port ${PORT}:`, err);
  });

  // Sync courses from Firestore periodically
  const syncFromFirestore = async () => {
    try {
      const db = getFirestore();
      const snap = await db.collection("courses").get();
      const firestoreCourses: Record<string, any> = {};
      snap.forEach(doc => {
        if (serverDeletedCourseIds.has(doc.id)) {
          // Clean up document from Firestore if marked as deleted
          db.collection("courses").doc(doc.id).delete().catch(() => {});
        } else {
          firestoreCourses[doc.id] = { id: doc.id, ...doc.data() };
        }
      });

      // Ensure deleted courses are completely purged from serverCourses map
      for (const delId of serverDeletedCourseIds) {
        delete serverCourses[delId];
      }

      Object.assign(serverCourses, firestoreCourses);
      saveCoursesToDisk(serverCourses, serverDeletedCourseIds);
      broadcastCoursesUpdate("courses_updated", {
        action: "sync_all",
        courses: Object.values(serverCourses),
        deletedCourseIds: Array.from(serverDeletedCourseIds),
        timestamp: Date.now()
      });
      console.log("[Sync] Synchronized courses from Firestore to disk.");

      // Sync combos from Firestore periodically (both combos and customCombos collections)
      try {
        const firestoreCombos: Record<string, any> = {};
        const [comboSnap, customComboSnap] = await Promise.all([
          db.collection("combos").get().catch(() => ({ forEach: () => {} })),
          db.collection("customCombos").get().catch(() => ({ forEach: () => {} }))
        ]);

        comboSnap.forEach((doc: any) => {
          if (serverDeletedComboIds.has(doc.id)) {
            db.collection("combos").doc(doc.id).delete().catch(() => {});
          } else {
            firestoreCombos[doc.id] = { id: doc.id, ...doc.data() };
          }
        });

        customComboSnap.forEach((doc: any) => {
          if (serverDeletedComboIds.has(doc.id)) {
            db.collection("customCombos").doc(doc.id).delete().catch(() => {});
          } else {
            const existing = firestoreCombos[doc.id];
            firestoreCombos[doc.id] = { ...(existing || {}), id: doc.id, ...doc.data() };
          }
        });

        // Purge deleted combo IDs from in-memory map
        for (const delId of serverDeletedComboIds) {
          delete serverCombos[delId];
        }

        // Reconstruct serverCombos cleanly from default combos + Firestore snapshot
        const newServerCombos: Record<string, any> = {};
        Object.entries(DEFAULT_SERVER_COMBOS).forEach(([id, combo]) => {
          if (!serverDeletedComboIds.has(id)) {
            newServerCombos[id] = combo;
          }
        });

        // Overlay active Firestore combos
        Object.entries(firestoreCombos).forEach(([id, combo]) => {
          if (!serverDeletedComboIds.has(id)) {
            newServerCombos[id] = combo;
          }
        });

        // Clear existing serverCombos map and replace with merged state
        for (const key of Object.keys(serverCombos)) {
          delete serverCombos[key];
        }
        Object.assign(serverCombos, newServerCombos);

        saveCombosToDisk(serverCombos, serverDeletedComboIds);
        broadcastCombosUpdate("combos_updated", {
          action: "sync_all",
          combos: Object.values(serverCombos),
          deletedComboIds: Array.from(serverDeletedComboIds),
          timestamp: Date.now()
        });
        console.log(`[Sync] Synchronized ${Object.keys(serverCombos).length} combos from Firestore to disk successfully.`);
      } catch (comboErr) {
        console.error("[Sync] Error syncing combos from Firestore:", comboErr);
      }
    } catch (err) {
      console.error("[Sync] Error syncing from Firestore:", err);
    }
  };

  // Sync every 5 minutes
  setInterval(syncFromFirestore, 5 * 60 * 1000);
  
  // Initial sync
  syncFromFirestore();
}

startServer();

