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
    const { courseId, courseTitle, amount, email, userId } = body;

    if (!courseId || !email) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ success: false, error: "Missing required fields: courseId or email" }),
      };
    }

    const numericAmount = Number(amount) || 0;
    const orderId = "ORD_" + Date.now() + "_" + Math.floor(Math.random() * 1000);
    
    // Generate unique payment code with single FAST prefix (e.g. FAST3AGSF5K0R)
    const chars = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ";
    let paymentCode = "";
    let randomSuffix = "";
    let isUnique = false;
    let attempts = 0;

    while (!isUnique && attempts < 5) {
      attempts++;
      const suffixLength = 9;
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
      }
    }

    const bankCode = process.env.BANK_CODE || "ACB";
    const bankAccount = process.env.BANK_ACCOUNT || "22888868";
    const bankAccountName = process.env.BANK_ACCOUNT_NAME || "CÔNG TY TNHH TƯ VẤN VÀ ĐÀO TẠO FAST";

    const orderData = {
      orderId,
      paymentCode, // Exact code stored: FAST3AGSF5K0R
      courseId,
      courseTitle: courseTitle || "Khóa học FAST E-Learning",
      amount: numericAmount,
      email: email.toLowerCase().trim(),
      userId: userId || "",
      status: "PENDING",
      createdAt: new Date().toISOString(),
      bankCode,
      bankAccount,
      bankAccountName,
    };

    const pendingData = {
      code: paymentCode,
      suffix: randomSuffix,
      email: email.toLowerCase().trim(),
      courseId,
      amount: numericAmount,
      orderId,
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

    console.log(`[CreateOrder] Created order ${orderId} with paymentCode ${paymentCode} for ${email}`);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        orderId,
        paymentCode, // Returns exact paymentCode: FAST3AGSF5K0R
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
