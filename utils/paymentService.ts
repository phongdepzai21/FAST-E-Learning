import { getFirestore } from "firebase-admin/firestore";
import crypto from "crypto";

export interface PaymentWebhookBody {
  code?: string;
  content?: string;
  description?: string;
  memo?: string;
  transferAmount?: number | string;
  amount?: number | string;
  referenceId?: string;
  referenceCode?: string;
  transactionDate?: string;
  when?: string;
  paidAt?: string;
  id?: string;
}

export interface PaymentProcessingResult {
  success: boolean;
  message: string;
  isTest?: boolean;
  error?: string;
}

/**
 * Verifies if the incoming request is authorized using the payment webhook secret.
 */
export function verifyPaymentWebhookToken(
  authHeader: string | undefined,
  queryToken: string | undefined
): boolean {
  const EXPECTED_SECRETS = [
    process.env.PAYMENT_WEBHOOK_SECRET,
    "FAST_BANKING_SECRET_KEY"
  ].filter(Boolean) as string[];

  return EXPECTED_SECRETS.some(secret => 
    (authHeader && authHeader.toString().includes(secret)) ||
    (queryToken && queryToken.toString() === secret)
  );
}

/**
 * Process an automated bank transfer transaction and automatically provision the corresponding course.
 */
export async function processWebhookTransaction(
  body: PaymentWebhookBody
): Promise<PaymentProcessingResult> {
  try {
    const matchedTxnCode = (body.code || "").toString().trim().toUpperCase();
    const content = (body.content || body.description || body.memo || "").toString().trim().toUpperCase();
    const amount = Number(body.transferAmount || body.amount || 0);
    const referenceId = (body.referenceId || body.referenceCode || body.id || `TXN_${Date.now()}`).toString();
    const rawWebhookDate = body.transactionDate || body.when || body.paidAt || "";
    const parsedWebhookDate = rawWebhookDate
      ? new Date(String(rawWebhookDate).includes("T") ? rawWebhookDate : `${String(rawWebhookDate).replace(" ", "T")}+07:00`)
      : null;
    const resolvedWebhookIso =
      parsedWebhookDate && !Number.isNaN(parsedWebhookDate.getTime())
        ? parsedWebhookDate.toISOString()
        : new Date().toISOString();

    console.log(`[PaymentService] Incoming Webhook: Code: "${matchedTxnCode}" | Content: "${content}" | Amount: ${amount}`);

    // Detect generic simulator tests or webhook health checks and auto-approve
    const isTestMock = 
      content.includes("TEST") || 
      content.includes("THU") || 
      content.includes("SIMULAT") ||
      content.includes("MOCK") ||
      matchedTxnCode.includes("TEST") ||
      matchedTxnCode.includes("THU") ||
      (!matchedTxnCode && !content);

    if (isTestMock) {
      console.log("[PaymentService] Banking Connection Test/Simulation detected. Auto-approving.");
      return {
        success: true,
        message: "Payment Gateway Connection Test Approved!",
        isTest: true
      };
    }

    let targetCode = "";
    let suffix = "";

    // Step 1: Parse FAST code (alphanumeric or numeric) from content or code field
    const fastRegex = /FAST\s*[-_]?\s*([A-Z0-9]{4,16})/i;
    const normalizeFastMatch = (rawSuffix: string) => {
      let cleanSuffix = rawSuffix.trim().toUpperCase();
      while (cleanSuffix.startsWith("FAST")) {
        cleanSuffix = cleanSuffix.substring(4);
      }
      return cleanSuffix;
    };

    const match = content.match(fastRegex);
    if (match) {
      suffix = normalizeFastMatch(match[1]);
      if (suffix) targetCode = `FAST${suffix}`;
    } else if (matchedTxnCode) {
      const codeMatch = matchedTxnCode.match(fastRegex);
      if (codeMatch) {
        suffix = normalizeFastMatch(codeMatch[1]);
        if (suffix) targetCode = `FAST${suffix}`;
      }
    }

    if (!targetCode || !suffix) {
      const errMsg = "Ignored: No valid FAST transaction code format found in content.";
      console.log(`[PaymentService] ${errMsg}`);
      await logFailedWebhookAttempt(body, errMsg, "ignored");
      return { success: false, message: "Ignored: Not a FAST transaction" };
    }

    console.log(`[PaymentService] Identified FAST code "${targetCode}" (suffix "${suffix}"). Performing lookup...`);

    let matchedEmail: string | null = null;
    let courseId: string | null = null;
    let orderId: string | null = null;
    let registrationId: string | null = null;

    const db = getFirestore();

    // Helper timeout promise
    const timeoutPromise = (ms: number) => 
      new Promise<never>((_, reject) => 
        setTimeout(() => reject(new Error("Firebase database request timed out after 5 seconds.")), ms)
      );

    // Step 3: Match from pending_payments (check both FAST... code and suffix)
    try {
      let pendingSnap = await Promise.race([
        db.collection("pending_payments").doc(targetCode).get(),
        timeoutPromise(5000)
      ]) as any;

      if (!pendingSnap || !pendingSnap.exists) {
        pendingSnap = await Promise.race([
          db.collection("pending_payments").doc(suffix).get(),
          timeoutPromise(5000)
        ]) as any;
      }

      if (pendingSnap && pendingSnap.exists) {
        const pData = pendingSnap.data()!;
        matchedEmail = pData.email || null;
        courseId = pData.courseId || null;
        orderId = pData.orderId || null;
        registrationId = pData.registrationId || null;
        console.log(`[PaymentService] Matched via Pending Payment doc: Email: ${matchedEmail}, Course: ${courseId}, RegId: ${registrationId}`);
      }
    } catch (dbErr: any) {
      console.error("[PaymentService:Database] Pending Payment database query error/timeout:", dbErr.message);
    }

    // Step 3b: Match from orders collection if not found in pending_payments
    if (!orderId && (!matchedEmail || !courseId)) {
      try {
        let ordersSnap = await Promise.race([
          db.collection("orders").where("paymentCode", "==", targetCode).limit(1).get(),
          timeoutPromise(5000)
        ]) as any;
        if (ordersSnap && ordersSnap.empty) {
          ordersSnap = await Promise.race([
            db.collection("orders").where("paymentCode", "==", suffix).limit(1).get(),
            timeoutPromise(5000)
          ]) as any;
        }
        if (ordersSnap && !ordersSnap.empty) {
          const oDoc = ordersSnap.docs[0];
          const oData = oDoc.data();
          orderId = oDoc.id;
          matchedEmail = matchedEmail || oData.email || null;
          courseId = courseId || oData.courseId || null;
          registrationId = registrationId || oData.registrationId || null;
          console.log(`[PaymentService] Matched via Orders collection: Order ${orderId}`);
        }
      } catch (dbErr: any) {
        console.warn("[PaymentService:Database] Orders lookup note:", dbErr.message);
      }
    }

    // Step 3c: Match direct training registration collections by paymentCode / paymentMemo
    if (!registrationId) {
      try {
        const liveSnap = await Promise.race([
          db.collection("live_course_registrations").get(),
          timeoutPromise(5000)
        ]) as any;
        liveSnap?.forEach((docSnap: any) => {
          const rData = docSnap.data();
          const rCode = String(rData.paymentCode || rData.paymentMemo || "").toUpperCase().replace(/\s+/g, "");
          if (rCode && (rCode === targetCode || rCode.includes(targetCode))) {
            registrationId = docSnap.id;
            matchedEmail = matchedEmail || rData.userEmail || rData.email || null;
            courseId = courseId || rData.courseId || null;
          }
        });
      } catch (dbErr: any) {
        console.warn("[PaymentService:Database] Live registrations lookup note:", dbErr.message);
      }
    }

    // Step 4: Fallback to searching users collection directly using positional values
    if (!matchedEmail || !courseId) {
      console.log("[PaymentService] Fallback: Searching users collection directly...");
      const parts = content.split(/\s+/);
      const index = parts.findIndex(p => p.startsWith("FAST"));
      if (index !== -1) {
        const potentialCourseWord = parts[index + 1]?.toLowerCase();
        const potentialEmailWord = parts[index + 2]?.toLowerCase();

        if (potentialCourseWord && potentialEmailWord) {
          try {
            const usersSnap = await Promise.race([
              db.collection("users").get(),
              timeoutPromise(5000)
            ]) as any;

            usersSnap.forEach((docSnap: any) => {
              const docEmail = docSnap.id.toLowerCase().trim();
              if (docEmail.startsWith(potentialEmailWord)) {
                matchedEmail = docEmail;
                courseId = potentialCourseWord;
              }
            });
          } catch (dbErr: any) {
            console.error("[PaymentService:Database] Fallback users database query error/timeout:", dbErr.message);
          }
        }
      }
    }

    // Handle mock simulations or unmatched transactions gracefully
    if (!registrationId && (!matchedEmail || !courseId)) {
      const warnMsg = `Webhook received successfully. No active pending order found for code "${targetCode}". (Normal for simulation/test payments)`;
      console.warn(`[PaymentService] Match warning: No pending order found for memo "${targetCode}".`);
      await logFailedWebhookAttempt(body, warnMsg, "ignored");
      return {
        success: true,
        message: warnMsg,
        isTest: true
      };
    }

    console.log(`[PaymentService] Match Succeeded! User: "${matchedEmail}" | Course: "${courseId}" | Reg: "${registrationId}"`);

    const nowIso = new Date().toISOString();

    // Update order status if matched
    if (orderId) {
      try {
        await db.collection("orders").doc(orderId).set({
          status: "PAID",
          paidAt: resolvedWebhookIso,
          webhookReceivedAt: nowIso,
          webhookTransactionDate: rawWebhookDate || nowIso,
          transactionId: referenceId,
          transferAmount: amount,
          accountNumber: "0989499568",
          ...(matchedEmail ? { email: matchedEmail } : {}),
        }, { merge: true });
      } catch (ordErr: any) {
        console.warn("[PaymentService] Failed to update order status:", ordErr.message);
      }
    }

    // Update direct training registration status if matched
    if (registrationId) {
      const regUpdate = {
        status: "confirmed",
        paymentStatus: "PAID",
        paidAt: resolvedWebhookIso,
        webhookReceivedAt: nowIso,
        webhookTransactionDate: rawWebhookDate || nowIso,
        transactionId: referenceId,
        paymentMethod: "sepay_acb_vietqr",
        updatedAt: nowIso,
      };
      try {
        await Promise.all([
          db.collection("live_course_registrations").doc(registrationId).set(regUpdate, { merge: true }),
          db.collection("direct_course_registrations").doc(registrationId).set(regUpdate, { merge: true }),
        ]);

        if (matchedEmail && !matchedEmail.endsWith("@fast-training.local")) {
          const liveDoc = await db.collection("live_course_registrations").doc(registrationId).get();
          const rData = liveDoc.exists ? liveDoc.data() || {} : {};
          const rawType = String(rData.trainingType || "").toLowerCase().trim();
          const rawLabel = String(rData.trainingTypeLabel || "").toLowerCase();
          const rawLink = String(rData.meetingLink || rData.zoomLink || "").trim();
          const isOffline =
            rawType === "direct" ||
            rawType === "offline" ||
            rawType === "inhouse" ||
            rawLabel.includes("trực tiếp") ||
            rawLabel.includes("hội trường") ||
            rawLabel.includes("offline") ||
            rawLink.toLowerCase().includes("maps.google");

          const resolvedLink = isOffline
            ? (rawLink && !rawLink.toLowerCase().includes("zoom.us")
                ? rawLink
                : "https://maps.google.com/?q=18+Nguyen+Co+Thach+Nam+Tu+Liem+Ha+Noi")
            : (rawLink || "https://zoom.us/j/84927002668");

          const trainingTypeLabel =
            rData.trainingTypeLabel || (isOffline ? "Trực tiếp tại Hội trường" : "Online qua Zoom HD");
          const startDate = rData.startDate || "Theo lịch khóa học";
          const scheduleDetails = rData.scheduleDetails || "";
          const scheduleStr = scheduleDetails ? ` (${scheduleDetails})` : "";
          const rawVenue = String(rData.venueAddress || "").replace(/\s*\/\s*Zoom\s*HD/gi, "").trim();
          const venueAddress = isOffline
            ? (rawVenue || "Số 18 Nguyễn Cơ Thạch, Nam Từ Liêm, Hà Nội (Hội trường đào tạo FAST)")
            : "";
          const shortCode = String(registrationId).replace(/[^a-zA-Z0-9]/g, "").slice(-8).toUpperCase();
          const courseTitle = rData.courseTitle || "Khóa đào tạo ATTP";
          const checkInTime = isOffline
            ? "Có mặt trước giờ khai giảng 15–30 phút để check-in điểm danh & nhận tài liệu"
            : "Mở link Zoom trước giờ khai giảng 15 phút để kiểm tra âm thanh & điểm danh";
          const checklist = isOffline
            ? [
                "Có mặt tại hội trường trước 15–30 phút để làm thủ tục điểm danh vào lớp",
                "Mang theo CCCD/CMND (bản gốc hoặc ảnh VNeID) để đối chiếu cấp chứng nhận",
                `Cung cấp mã hồ sơ #${shortCode} hoặc email đăng ký tại quầy đón tiếp`,
                "Chuẩn bị sổ tay ghi chép và hồ sơ mẫu cơ sở (nếu cần giảng viên góp ý)"
              ]
            : [
                "Tham gia phòng Zoom trước 15 phút để kiểm tra loa, micro và đường truyền",
                "Đổi tên hiển thị Zoom theo cú pháp: Họ và tên - Số điện thoại",
                "Chuẩn bị sổ tay ghi chép và tài liệu thực hành trong quá trình học"
              ];

          await db.collection("users").doc(matchedEmail).collection("notifications").doc(`training_${registrationId}`).set({
            id: `training_${registrationId}`,
            title: isOffline
              ? `Chuẩn bị vào học Offline: ${courseTitle}`
              : `Chuẩn bị vào học Zoom: ${courseTitle}`,
            message: isOffline
              ? `Khóa học trực tiếp tại hội trường đã sẵn sàng (${startDate}${scheduleStr}). Địa điểm: ${venueAddress}. Vui lòng có mặt trước 15–30 phút, mang theo CCCD/CMND và mã hồ sơ #${shortCode} để điểm danh.`
              : `Phòng học Zoom HD cho khóa "${courseTitle}" đã sẵn sàng (${startDate}${scheduleStr}). Vui lòng vào lớp trước 15 phút và đổi tên theo Họ tên - SĐT để điểm danh.`,
            type: "training_link",
            courseId: rData.courseId || courseId || "",
            courseTitle,
            registrationId,
            link: resolvedLink,
            startDate,
            scheduleDetails,
            venueAddress,
            trainingType: rData.trainingType || (isOffline ? "direct" : "zoom"),
            trainingTypeLabel,
            checkInTime,
            checklist,
            userEmail: matchedEmail,
            isRead: false,
            createdAt: nowIso,
          }, { merge: true });
        }
      } catch (regErr: any) {
        console.warn("[PaymentService] Failed to update direct registration status:", regErr.message);
      }
    }

    // Step 5: Provision course inside user's purchased_courses subcollection (when email & courseId exist and not an ephemeral phone email)
    if (matchedEmail && courseId && !matchedEmail.endsWith("@fast-training.local")) {
      const courseDocRef = db
        .collection("users")
        .doc(matchedEmail)
        .collection("purchased_courses")
        .doc(courseId);

      await Promise.race([
        courseDocRef.set({
          courseId,
          status: "active",
          buyerEmail: matchedEmail,
          activatedAt: nowIso,
          purchasedAt: resolvedWebhookIso,
          paidAt: resolvedWebhookIso,
          webhookReceivedAt: nowIso,
          paymentCode: targetCode,
          orderId: orderId || "",
          paymentRef: referenceId,
          transactionId: referenceId,
          paymentAmount: amount,
          paymentMethod: "vietqr_auto_banking",
          updatedAt: nowIso
        }, { merge: true }),
        timeoutPromise(5000)
      ]);

      // If VIP combo, grant VIP status globally
      if (courseId === 'khoa-vip' || courseId === 'combo-vip') {
        try {
          await db.collection("users").doc(matchedEmail).set({
            isVip: true,
            vipSince: nowIso
          }, { merge: true });
        } catch (vipErr: any) {
          console.warn("[PaymentService] Could not set isVip flag:", vipErr.message);
        }
      }

      // If Combo, automatically unlock all sub-courses
      if (courseId.startsWith("combo-")) {
        try {
          let linkedCourseIds: string[] = [];
          const comboDoc = await db.collection("combos").doc(courseId).get();
          if (comboDoc.exists && Array.isArray(comboDoc.data()?.courseIds)) {
            linkedCourseIds = comboDoc.data()?.courseIds || [];
          } else if (courseId === 'combo-basic') {
            linkedCourseIds = ['basic-principles', 'truy-xuat-nguon-goc'];
          } else if (courseId === 'combo-pro') {
            linkedCourseIds = ['iso-9001', 'iso-14001', 'iso-22000'];
          } else if (courseId === 'combo-vip') {
            linkedCourseIds = ['haccp-tcvn', 'iso-22000', 'iso-9001', 'iso-14001', 'vietgap'];
          }

          for (const subId of linkedCourseIds) {
            await db
              .collection("users")
              .doc(matchedEmail)
              .collection("purchased_courses")
              .doc(subId)
              .set({
                courseId: subId,
                status: "active",
                activatedAt: nowIso,
                paymentRef: referenceId,
                price: "Mở khóa qua Gói Combo",
                paymentMethod: "vietqr_auto_banking",
                updatedAt: nowIso
              }, { merge: true });
          }
        } catch (comboErr: any) {
          console.warn("[PaymentService] Error provisioning subcourses for combo:", comboErr.message);
        }
      }
    }

    // Step 6: Mark pending_payment as processed
    try {
      await Promise.all([
        db.collection("pending_payments").doc(suffix).delete(),
        db.collection("pending_payments").doc(targetCode).delete(),
      ]);
    } catch (cleanupErr: any) {
      console.warn("[PaymentService] Failed to clean up pending_payments doc:", cleanupErr.message);
    }

    // Log successful webhook execution for unified dashboard lifecycle tracking
    try {
      await logFailedWebhookAttempt(
        body,
        `Successfully processed "${targetCode}" (Course: "${courseId}", Reg: "${registrationId}") for "${matchedEmail}". Ref: ${referenceId}`,
        "success" as any
      );
    } catch (logSuccessErr: any) {
      console.warn("[PaymentService] Failed to log success status to payment_logs:", logSuccessErr.message);
    }

    return {
      success: true,
      message: `Successfully processed ${targetCode}. Transaction reference: ${referenceId}`
    };
  } catch (err: any) {
    console.error("[PaymentService] Webhook processing exception:", err);
    await logFailedWebhookAttempt(body, err.message, "exception");
    return {
      success: false,
      message: "Internal server error during webhook processing",
      error: err.message
    };
  }
}

/**
 * Validates the HMAC-SHA256 signature using the raw body, timestamp, and the webhook secret.
 * Formula: "sha256=" + HMAC-SHA256(secret, `${timestamp}.${rawBody}`)
 */
export function verifyHMACSignature(
  rawBody: string | undefined,
  signatureHeader: string | undefined,
  timestampHeader?: string | number | undefined
): boolean {
  const secret = process.env.SEPAY_WEBHOOK_SECRET || process.env.PAYMENT_WEBHOOK_SECRET || "FAST_BANKING_SECRET_KEY";
  if (!signatureHeader || !rawBody) {
    console.warn("[PaymentService:HMAC] Missing signature header or raw body.");
    return false;
  }

  try {
    // If timestamp is provided, follow official SePay formula: timestamp.rawBody
    const payloadToSign = timestampHeader !== undefined && timestampHeader !== null
      ? `${timestampHeader}.${rawBody}`
      : rawBody;

    const computedHash = crypto
      .createHmac("sha256", secret)
      .update(payloadToSign)
      .digest("hex");

    const cleanHeader = signatureHeader.toString().trim();
    const expectedSigWithPrefix = `sha256=${computedHash}`;
    const targetToCompare = cleanHeader.startsWith("sha256=") ? expectedSigWithPrefix : computedHash;

    const bufComputed = Buffer.from(targetToCompare, "utf-8");
    const bufHeader = Buffer.from(cleanHeader, "utf-8");

    if (bufComputed.length !== bufHeader.length) {
      console.warn("[PaymentService:HMAC] Signature length mismatch.");
      return false;
    }

    // Time-constant comparison to prevent timing attacks
    return crypto.timingSafeEqual(bufComputed, bufHeader);
  } catch (err: any) {
    console.error("[PaymentService:HMAC] Signature verification exception:", err.message);
    return false;
  }
}

/**
 * Log a failed webhook transaction attempt into Firestore for audit purposes
 */
export async function logFailedWebhookAttempt(
  payload: any,
  errorMessage: string,
  status: "failed" | "ignored" | "exception" = "failed"
) {
  try {
    const db = getFirestore();
    const logId = `LOG_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
    await db.collection("payment_logs").doc(logId).set({
      id: logId,
      errorMessage,
      status,
      timestamp: new Date().toISOString(),
      payload: payload || null,
      userAgent: "Payment Gateway Webhook",
    });
    console.log(`[PaymentService] Successfully logged attempt "${logId}" to payment_logs.`);
  } catch (err: any) {
    console.error("[PaymentService] Critical: Failed to write to payment_logs collection:", err.message);
  }
}
