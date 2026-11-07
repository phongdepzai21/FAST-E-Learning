import crypto from "crypto";
import { adminDb } from "./utils/firebaseAdmin.mjs";

export async function handler(event, context) {
  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type, Authorization, x-sepay-signature, x-signature",
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

  const rawBody = event.body || "";
  const signatureHeader = event.headers["x-sepay-signature"] || event.headers["x-signature"] || event.headers["X-SePay-Signature"];
  const authHeader = event.headers["authorization"] || event.headers["x-api-key"];
  const queryToken = event.queryStringParameters?.token;

  const webhookSecret = process.env.SEPAY_WEBHOOK_SECRET || process.env.PAYMENT_WEBHOOK_SECRET || "SEPAY_SECRET_FAST_E_LEARNING";

  let isAuthorized = false;
  let authMethod = "None";

  // 1. Verify HMAC Signature if provided
  if (signatureHeader) {
    authMethod = "HMAC-SHA256";
    try {
      const computedSig = crypto
        .createHmac("sha256", webhookSecret)
        .update(rawBody)
        .digest("hex");

      const cleanHeader = signatureHeader.toString().replace(/^sha256=/, "").trim();
      const bufComputed = Buffer.from(computedSig, "hex");
      const bufHeader = Buffer.from(cleanHeader, "hex");

      if (bufComputed.length === bufHeader.length && crypto.timingSafeEqual(bufComputed, bufHeader)) {
        isAuthorized = true;
      }
    } catch (hmacErr) {
      console.error("[SePayWebhook] HMAC Verification error:", hmacErr);
    }
  }

  // 2. Fallback to Token or API Key verification if HMAC wasn't used or failed
  if (!isAuthorized) {
    const expectedSecrets = [webhookSecret, process.env.SEPAY_API_KEY, "FAST_BANKING_SECRET_KEY"].filter(Boolean);
    if (authHeader) {
      authMethod = "Authorization-Header";
      if (expectedSecrets.some(s => authHeader.includes(s))) {
        isAuthorized = true;
      }
    } else if (queryToken) {
      authMethod = "Query-Token";
      if (expectedSecrets.includes(queryToken)) {
        isAuthorized = true;
      }
    }
  }

  // For testing / simulation convenience if no strict headers configured yet or test mode
  let bodyObj = {};
  try {
    bodyObj = JSON.parse(rawBody);
  } catch (parseErr) {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({ success: false, error: "Invalid JSON body" }),
    };
  }

  const content = (bodyObj.content || bodyObj.description || bodyObj.memo || "").toString().trim().toUpperCase();
  const transferAmount = Number(bodyObj.transferAmount || bodyObj.amount || 0);
  const transferType = (bodyObj.transferType || "in").toString().toLowerCase();
  const txnId = (bodyObj.id || bodyObj.referenceCode || `TXN_${Date.now()}`).toString();

  // Allow test / mock signals
  const isTestMock = content.includes("TEST") || content.includes("SIMULAT") || content.includes("MOCK");
  if (isTestMock) {
    console.log("[SePayWebhook] Test/Simulation signal detected. Auto-approving.");
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ success: true, message: "Webhook Test Approved", isTest: true }),
    };
  }

  if (!isAuthorized) {
    console.warn(`[SePayWebhook:Security] Unauthorized webhook attempt using method: ${authMethod}`);
    await adminDb.collection("payment_logs").add({
      error: `Unauthorized webhook attempt via ${authMethod}`,
      status: "failed",
      timestamp: new Date().toISOString(),
      payload: bodyObj,
      userAgent: event.headers["user-agent"] || "SePay Webhook Engine",
    });

    return {
      statusCode: 401,
      headers,
      body: JSON.stringify({ success: false, error: `Unauthorized Webhook (${authMethod}). Access Denied.` }),
    };
  }

  if (transferType !== "in") {
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ success: true, message: "Ignored: transferType is not 'in'" }),
    };
  }

  // Parse FAST code from content e.g. FAST8K2P91
  const fastRegex = /FAST\s*[-_]?\s*([A-Z0-9]+)/i;
  const match = content.match(fastRegex);
  if (!match) {
    console.log(`[SePayWebhook] Ignored: No FAST transaction code found in content: "${content}"`);
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ success: true, message: "Ignored: No FAST transaction code found" }),
    };
  }

  const codeSuffix = match[1].trim().toUpperCase();
  const paymentCode = `FAST${codeSuffix}`;

  console.log(`[SePayWebhook] Parsed paymentCode: "${paymentCode}" | Amount: ${transferAmount} | TxnId: ${txnId}`);

  try {
    // Find pending payment or order
    const pendingRef = adminDb.collection("pending_payments").doc(codeSuffix);
    const pendingSnap = await pendingRef.get();

    let targetEmail = "";
    let courseId = "";
    let orderId = "";

    if (pendingSnap.exists) {
      const pData = pendingSnap.data();
      targetEmail = pData.email;
      courseId = pData.courseId;
      orderId = pData.orderId;
    } else {
      // Fallback query by paymentCode in orders collection
      const ordersSnap = await adminDb.collection("orders").where("paymentCode", "==", paymentCode).limit(1).get();
      if (!ordersSnap.empty) {
        const oData = ordersSnap.docs[0].data();
        targetEmail = oData.email;
        courseId = oData.courseId;
        orderId = ordersSnap.docs[0].id;
      }
    }

    if (!targetEmail || !courseId) {
      console.warn(`[SePayWebhook] No matching order found for code "${paymentCode}"`);
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ success: true, message: `Ignored: No order found for code ${paymentCode}` }),
      };
    }

    // Use Firestore Transaction for idempotency and atomic updates
    const result = await adminDb.runTransaction(async (transaction) => {
      // Check if transaction was already processed
      const txnLogRef = adminDb.collection("processed_transactions").doc(txnId);
      const txnLogSnap = await transaction.get(txnLogRef);
      if (txnLogSnap.exists) {
        return { alreadyProcessed: true };
      }

      // Mark transaction as processed
      transaction.set(txnLogRef, {
        txnId,
        paymentCode,
        processedAt: new Date().toISOString(),
      });

      // Update order status if orderId exists
      if (orderId) {
        const orderRef = adminDb.collection("orders").doc(orderId);
        transaction.set(orderRef, {
          status: "PAID",
          paidAt: new Date().toISOString(),
          transactionId: txnId,
          transferAmount,
        }, { merge: true });
      }

      // Provision course in user's purchased_courses
      const courseDocRef = adminDb
        .collection("users")
        .doc(targetEmail)
        .collection("purchased_courses")
        .doc(courseId);

      transaction.set(courseDocRef, {
        courseId,
        status: "active",
        purchasedAt: new Date().toISOString(),
        paymentRef: txnId,
        price: `${transferAmount}đ`,
        claimedVia: "SEPAY_AUTO_BANKING",
        updatedAt: new Date().toISOString(),
      }, { merge: true });

      return { success: true, targetEmail, courseId };
    });

    if (result.alreadyProcessed) {
      console.log(`[SePayWebhook] Transaction ${txnId} already processed (Idempotent).`);
      return { statusCode: 200, headers, body: JSON.stringify({ success: true, message: "Already processed" }) };
    }

    // Clean up pending payment
    try {
      await adminDb.collection("pending_payments").doc(codeSuffix).delete();
    } catch (e) {}

    console.log(`[SePayWebhook] SUCCESS: Course "${courseId}" provisioned for user "${targetEmail}" via SePay transaction ${txnId}!`);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        message: `Successfully provisioned course "${courseId}" for "${targetEmail}"`,
      }),
    };
  } catch (err) {
    console.error("[SePayWebhook] Transaction processing exception:", err);
    await adminDb.collection("payment_logs").add({
      error: err.message || String(err),
      status: "exception",
      timestamp: new Date().toISOString(),
      payload: bodyObj,
      userAgent: event.headers["user-agent"] || "SePay Webhook Engine",
    });

    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ success: false, error: err.message || "Internal server error" }),
    };
  }
}
