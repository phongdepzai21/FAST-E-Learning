import { adminDb } from "./utils/firebaseAdmin.mjs";

export async function handler(event, context) {
  // CORS headers
  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Content-Type": "application/json",
  };

  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 200, headers, body: "" };
  }

  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ success: false, error: "Method Not Allowed" }),
    };
  }

  try {
    const body = JSON.parse(event.body || "{}");
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
    } = body;

    if (!courseId && !registrationId) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ success: false, error: "Missing required fields: courseId or registrationId" }),
      };
    }

    const normalizedEmail = (email || (phone ? `${String(phone).replace(/[^\d]/g, "")}@fast-training.local` : "")).toLowerCase().trim();
    const numericAmount = Number(amount) || 0;
    const orderId = "ORD_" + Date.now() + "_" + Math.floor(Math.random() * 1000);
    
    // Generate unique payment code with single FAST prefix (e.g. FAST3AGSF5K0R)
    const chars = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ";
    let paymentCode = "";
    let randomSuffix = "";

    if (requestedPaymentCode && typeof requestedPaymentCode === "string") {
      let cleanReq = requestedPaymentCode.trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
      while (cleanReq.startsWith("FASTFAST")) {
        cleanReq = cleanReq.substring(4);
      }
      if (!cleanReq.startsWith("FAST")) {
        cleanReq = `FAST${cleanReq}`;
      }
      if (cleanReq.length >= 8 && cleanReq.length <= 16) {
        paymentCode = cleanReq;
        randomSuffix = cleanReq.replace(/^FAST/, "");
      }
    }

    let isUnique = false;
    let attempts = 0;

    while (!paymentCode && !isUnique && attempts < 5) {
      attempts++;
      const suffixLength = 8;
      randomSuffix = "";
      for (let i = 0; i < suffixLength; i++) {
        randomSuffix += chars.charAt(Math.floor(Math.random() * chars.length));
      }
      // Guaranteed single FAST prefix
      paymentCode = `FAST${randomSuffix}`;

      // Check uniqueness in Firestore orders collection
      const existingSnap = await adminDb.collection("orders").where("paymentCode", "==", paymentCode).limit(1).get();
      if (existingSnap.empty) {
        isUnique = true;
      } else {
        paymentCode = "";
      }
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

    const pendingData = {
      code: paymentCode,
      suffix: randomSuffix,
      email: normalizedEmail,
      courseId: courseId || registrationId,
      amount: numericAmount,
      orderId,
      registrationId: registrationId || "",
      orderType: orderData.orderType,
      createdAt: new Date().toISOString(),
    };

    // Save to Firestore orders collection and pending_payments collection
    const batch = adminDb.batch();
    const orderRef = adminDb.collection("orders").doc(orderId);
    batch.set(orderRef, orderData);

    // Write to pending_payments using BOTH randomSuffix and paymentCode keys for 100% lookup resilience
    const pendingRefSuffix = adminDb.collection("pending_payments").doc(randomSuffix);
    batch.set(pendingRefSuffix, pendingData);

    const pendingRefCode = adminDb.collection("pending_payments").doc(paymentCode);
    batch.set(pendingRefCode, pendingData);

    await batch.commit();

    console.log(`[CreateOrder] Created order ${orderId} with paymentCode ${paymentCode} for ${normalizedEmail}`);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        orderId,
        paymentCode,
        amount: numericAmount,
        bankCode,
        bankAccount,
        bankAccountName,
        message: "Order created successfully",
      }),
    };
  } catch (err) {
    console.error("[CreateOrder] Exception:", err);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ success: false, error: err.message || "Internal server error" }),
    };
  }
}
