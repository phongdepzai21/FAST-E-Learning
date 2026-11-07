import crypto from "crypto";
import { adminDb } from "./utils/firebaseAdmin.mjs";

/**
 * Case-insensitive header value extraction helper
 */
function getHeader(headers, headerName) {
  if (!headers || typeof headers !== "object") return "";
  const target = headerName.toLowerCase();
  for (const [key, value] of Object.entries(headers)) {
    if (key.toLowerCase() === target) {
      return (value || "").toString().trim();
    }
  }
  return "";
}

/**
 * Robust payment code extractor ensuring EXACTLY ONE 'FAST' prefix.
 * Eliminates duplicate prefixes like FASTFAST3AGSF5K0R or FAST FAST3AGSF5K0R.
 */
function extractPaymentCode(bodyObj) {
  // 1. Check direct 'code' field sent by SePay if present
  let directCode = (bodyObj.code || "").toString().trim().toUpperCase();
  if (directCode) {
    directCode = directCode.replace(/\s+/g, "").replace(/^FAST[-_]+/, "FAST");
    while (directCode.startsWith("FASTFAST")) {
      directCode = directCode.substring(4);
    }
    if (!directCode.startsWith("FAST")) {
      directCode = "FAST" + directCode;
    }
    return directCode;
  }

  // 2. Parse from transfer content / description / memo
  const content = (bodyObj.content || bodyObj.description || bodyObj.memo || "").toString().trim().toUpperCase();
  if (!content) return "";

  // Tokenize content by whitespace
  const tokens = content.split(/\s+/);
  for (const token of tokens) {
    let cleanToken = token.trim().toUpperCase().replace(/^FAST[-_]+/, "FAST");
    while (cleanToken.startsWith("FASTFAST")) {
      cleanToken = cleanToken.substring(4);
    }

    const match = cleanToken.match(/^FAST[-_]?([A-Z0-9]{6,12})$/i);
    if (match) {
      let suffix = match[1].trim().toUpperCase();
      while (suffix.startsWith("FAST")) {
        suffix = suffix.substring(4);
      }
      return `FAST${suffix}`;
    }
  }

  // Fallback: If space was inserted between FAST and code, e.g. "FAST 3AGSF5K0R" or "FAST FAST3AGSF5K0R"
  const spacedMatch = content.match(/FAST\s*[-_]?\s*(FAST)?([A-Z0-9]{6,12})/i);
  if (spacedMatch) {
    let suffix = (spacedMatch[2] || "").trim().toUpperCase();
    while (suffix.startsWith("FAST")) {
      suffix = suffix.substring(4);
    }
    return `FAST${suffix}`;
  }

  return "";
}

export async function handler(event, context) {
  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type, Authorization, X-SePay-Signature, X-SePay-Timestamp, x-sepay-signature, x-sepay-timestamp",
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

  // 1. Extract raw request body directly from Netlify event WITHOUT prior JSON parsing
  let rawBody = "";
  if (event.isBase64Encoded) {
    try {
      rawBody = Buffer.from(event.body || "", "base64").toString("utf-8");
    } catch (b64Err) {
      console.error("[SePayWebhook:Security] Failed to decode base64 body:", b64Err.message);
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ success: false, error: "Invalid base64 payload" }),
      };
    }
  } else {
    rawBody = event.body || "";
  }

  // 2. Read headers (case-insensitive)
  const signatureHeader = getHeader(event.headers, "x-sepay-signature");
  const timestampHeader = getHeader(event.headers, "x-sepay-timestamp");

  // 3. Retrieve Secret from process.env.SEPAY_WEBHOOK_SECRET
  const webhookSecret = process.env.SEPAY_WEBHOOK_SECRET;

  if (!webhookSecret) {
    console.error("[SePayWebhook:Security] Error: SEPAY_WEBHOOK_SECRET environment variable is not configured.");
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        success: false,
        error: "Server configuration error: SEPAY_WEBHOOK_SECRET is not set",
      }),
    };
  }

  if (!signatureHeader || !timestampHeader) {
    console.warn(
      `[SePayWebhook:Security] Missing required headers. Has Signature: ${Boolean(signatureHeader)}, Has Timestamp: ${Boolean(timestampHeader)}`
    );
    return {
      statusCode: 401,
      headers,
      body: JSON.stringify({
        success: false,
        error: "Unauthorized Webhook: Missing X-SePay-Signature or X-SePay-Timestamp header",
      }),
    };
  }

  // 4. Validate timestamp: max allowable drift 300 seconds (5 minutes)
  const timestamp = parseInt(timestampHeader, 10);
  if (isNaN(timestamp)) {
    console.warn("[SePayWebhook:Security] Invalid timestamp format in X-SePay-Timestamp.");
    return {
      statusCode: 401,
      headers,
      body: JSON.stringify({
        success: false,
        error: "Unauthorized Webhook: Invalid X-SePay-Timestamp header",
      }),
    };
  }

  const currentTimestamp = Math.floor(Date.now() / 1000);
  const timeDifference = Math.abs(currentTimestamp - timestamp);
  if (timeDifference > 300) {
    console.warn(
      `[SePayWebhook:Security] Timestamp drift too large (${timeDifference}s > 300s). Potential replay attack rejected.`
    );
    return {
      statusCode: 401,
      headers,
      body: JSON.stringify({
        success: false,
        error: "Unauthorized Webhook: Timestamp drift exceeds 300 seconds",
      }),
    };
  }

  // 5. Calculate expected HMAC-SHA256 signature:
  // Formula: "sha256=" + HMAC-SHA256(secret, `${timestamp}.${rawBody}`)
  const payloadToSign = `${timestampHeader}.${rawBody}`;
  const calculatedHex = crypto
    .createHmac("sha256", webhookSecret)
    .update(payloadToSign)
    .digest("hex");
  const expectedSignatureWithPrefix = `sha256=${calculatedHex}`;

  // 6. Compare signatures using constant-time comparison (crypto.timingSafeEqual)
  const cleanReceived = signatureHeader.trim();
  const targetExpected = cleanReceived.startsWith("sha256=")
    ? expectedSignatureWithPrefix
    : calculatedHex;

  const bufExpected = Buffer.from(targetExpected, "utf-8");
  const bufReceived = Buffer.from(cleanReceived, "utf-8");

  const isSignatureValid =
    bufExpected.length === bufReceived.length &&
    crypto.timingSafeEqual(bufExpected, bufReceived);

  if (!isSignatureValid) {
    console.warn(
      `[SePayWebhook:Security] HMAC-SHA256 verification failed. Received length: ${cleanReceived.length}. Access Denied.`
    );
    return {
      statusCode: 401,
      headers,
      body: JSON.stringify({
        success: false,
        error: "Unauthorized Webhook (HMAC-SHA256). Access Denied.",
      }),
    };
  }

  // 7. Parse JSON ONLY AFTER HMAC verification succeeds
  let bodyObj = {};
  try {
    bodyObj = JSON.parse(rawBody);
  } catch (parseErr) {
    console.error("[SePayWebhook] Invalid JSON body despite valid HMAC signature:", parseErr.message);
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({ success: false, error: "Invalid JSON body format" }),
    };
  }

  const transferType = (bodyObj.transferType || "in").toString().toLowerCase();
  if (transferType !== "in") {
    console.log(`[SePayWebhook] Ignored transaction: transferType is '${transferType}' (not 'in')`);
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ success: true, message: "Ignored: transferType is not 'in'" }),
    };
  }

  const transferAmount = Number(bodyObj.transferAmount || bodyObj.amount || 0);
  const txnId = (bodyObj.id || bodyObj.referenceCode || `TXN_${Date.now()}`).toString();
  const receivedAccount = (bodyObj.subAccount || bodyObj.accountNumber || bodyObj.bankAccount || "").toString().trim();
  const expectedAccount = (process.env.BANK_ACCOUNT || "22888868").toString().trim();

  // Validate receiving account if specified in payload
  if (receivedAccount && expectedAccount && receivedAccount !== expectedAccount && receivedAccount !== "989499568") {
    console.warn(`[SePayWebhook] Account notice: received account ${receivedAccount}, configured primary ${expectedAccount}`);
  }

  // Extract payment code ensuring single FAST prefix
  const paymentCode = extractPaymentCode(bodyObj);
  if (!paymentCode) {
    const rawContent = (bodyObj.content || bodyObj.description || bodyObj.memo || "").toString();
    console.log(`[SePayWebhook] Ignored: No FAST transaction code found in content: "${rawContent}"`);
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ success: true, message: "Ignored: No FAST transaction code found" }),
    };
  }

  const codeSuffix = paymentCode.replace(/^FAST/i, "").trim().toUpperCase();

  console.log(`[SePayWebhook] HMAC Verified. Parsed paymentCode: "${paymentCode}" | Suffix: "${codeSuffix}" | Amount: ${transferAmount} | TxnId: ${txnId}`);

  try {
    // Multi-tier order lookup: try pending_payments doc by paymentCode & suffix, then orders query
    let targetEmail = "";
    let courseId = "";
    let orderId = "";
    let expectedAmount = 0;

    // 1. Try pending_payments doc by paymentCode (e.g. FAST3AGSF5K0R)
    let pendingSnap = await adminDb.collection("pending_payments").doc(paymentCode).get();
    
    // 2. Fallback to pending_payments doc by suffix (e.g. 3AGSF5K0R)
    if (!pendingSnap.exists) {
      pendingSnap = await adminDb.collection("pending_payments").doc(codeSuffix).get();
    }

    if (pendingSnap.exists) {
      const pData = pendingSnap.data();
      targetEmail = (pData.email || "").toLowerCase().trim();
      courseId = pData.courseId;
      orderId = pData.orderId;
      expectedAmount = Number(pData.amount || 0);
    } else {
      // 3. Query orders collection by paymentCode
      let ordersSnap = await adminDb.collection("orders").where("paymentCode", "==", paymentCode).limit(1).get();
      
      // 4. Fallback query by codeSuffix in case stored under suffix
      if (ordersSnap.empty) {
        ordersSnap = await adminDb.collection("orders").where("paymentCode", "==", codeSuffix).limit(1).get();
      }

      if (!ordersSnap.empty) {
        const oData = ordersSnap.docs[0].data();
        targetEmail = (oData.email || "").toLowerCase().trim();
        courseId = oData.courseId;
        orderId = ordersSnap.docs[0].id;
        expectedAmount = Number(oData.amount || 0);
      }
    }

    if (!targetEmail || !courseId) {
      console.warn(`[SePayWebhook] No matching order or pending payment found for code "${paymentCode}"`);
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ success: true, message: `Ignored: No order found for code ${paymentCode}` }),
      };
    }

    // Amount sanity check: warn if transferred amount is less than expected
    if (expectedAmount > 0 && transferAmount < expectedAmount) {
      console.warn(`[SePayWebhook] Warning: Transfer amount (${transferAmount}) is less than expected (${expectedAmount}) for ${paymentCode}`);
    }

    // Use Firestore Transaction for idempotency and atomic updates
    const result = await adminDb.runTransaction(async (transaction) => {
      // Idempotency: Check if transaction was already processed
      const txnLogRef = adminDb.collection("processed_transactions").doc(txnId);
      const txnLogSnap = await transaction.get(txnLogRef);
      if (txnLogSnap.exists) {
        return { alreadyProcessed: true };
      }

      // Mark transaction as processed
      transaction.set(txnLogRef, {
        txnId,
        paymentCode,
        transferAmount,
        receivedAccount,
        processedAt: new Date().toISOString(),
      });

      // Update order status if orderId exists
      if (orderId) {
        const orderRef = adminDb.collection("orders").doc(orderId);
        transaction.set(
          orderRef,
          {
            status: "PAID",
            paidAt: new Date().toISOString(),
            transactionId: txnId,
            transferAmount,
            accountNumber: receivedAccount || expectedAccount,
          },
          { merge: true }
        );
      }

      // Provision course in user's purchased_courses collection
      const courseDocRef = adminDb
        .collection("users")
        .doc(targetEmail)
        .collection("purchased_courses")
        .doc(courseId);

      transaction.set(
        courseDocRef,
        {
          courseId,
          status: "active",
          purchasedAt: new Date().toISOString(),
          paymentRef: txnId,
          price: `${transferAmount}đ`,
          claimedVia: "SEPAY_AUTO_BANKING",
          updatedAt: new Date().toISOString(),
        },
        { merge: true }
      );

      return { success: true, targetEmail, courseId };
    });

    if (result.alreadyProcessed) {
      console.log(`[SePayWebhook] Transaction ${txnId} already processed (Idempotent).`);
      return { statusCode: 200, headers, body: JSON.stringify({ success: true, message: "Already processed" }) };
    }

    // Clean up pending payment record from both potential keys
    try {
      await adminDb.collection("pending_payments").doc(codeSuffix).delete();
      await adminDb.collection("pending_payments").doc(paymentCode).delete();
    } catch (cleanErr) {
      console.warn("[SePayWebhook] Non-critical error removing pending payment:", cleanErr.message);
    }

    console.log(`[SePayWebhook] SUCCESS: Course "${courseId}" provisioned for user "${targetEmail}" via SePay transaction ${txnId}!`);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        message: `Successfully provisioned course "${courseId}" for "${targetEmail}"`,
        txnId,
      }),
    };
  } catch (err) {
    console.error("[SePayWebhook] Transaction processing exception:", err.message);
    try {
      await adminDb.collection("payment_logs").add({
        error: err.message || String(err),
        status: "exception",
        timestamp: new Date().toISOString(),
        paymentCode,
        txnId,
      });
    } catch (logErr) {}

    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ success: false, error: err.message || "Internal server error" }),
    };
  }
}
