import { adminDb } from "./utils/firebaseAdmin.mjs";

function normalizePaymentCode(codeStr) {
  if (!codeStr) return "";
  let clean = codeStr.toString().trim().toUpperCase().replace(/\s+/g, "");
  clean = clean.replace(/^FAST[-_]+/, "FAST");
  while (clean.startsWith("FASTFAST")) {
    clean = clean.substring(4);
  }
  if (!clean.startsWith("FAST")) {
    clean = "FAST" + clean;
  }
  return clean;
}

export async function handler(event, context) {
  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Content-Type": "application/json",
  };

  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 200, headers, body: "" };
  }

  try {
    const params = event.httpMethod === "GET" ? event.queryStringParameters : JSON.parse(event.body || "{}");
    const { orderId, paymentCode } = params || {};

    if (!orderId && !paymentCode) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ success: false, error: "Missing orderId or paymentCode parameter" }),
      };
    }

    let orderDoc = null;

    if (orderId) {
      const docSnap = await adminDb.collection("orders").doc(orderId).get();
      if (docSnap.exists) {
        orderDoc = docSnap.data();
      }
    }

    if (!orderDoc && paymentCode) {
      const cleanCode = normalizePaymentCode(paymentCode);
      const codeSuffix = cleanCode.replace(/^FAST/i, "");

      // 1. Query by exact normalized paymentCode (e.g. FAST3AGSF5K0R)
      let qSnap = await adminDb.collection("orders").where("paymentCode", "==", cleanCode).limit(1).get();

      // 2. Fallback query by codeSuffix (e.g. 3AGSF5K0R)
      if (qSnap.empty) {
        qSnap = await adminDb.collection("orders").where("paymentCode", "==", codeSuffix).limit(1).get();
      }

      // 3. Fallback query by raw paymentCode as provided
      if (qSnap.empty) {
        qSnap = await adminDb.collection("orders").where("paymentCode", "==", paymentCode.trim().toUpperCase()).limit(1).get();
      }

      if (!qSnap.empty) {
        orderDoc = qSnap.docs[0].data();
      }
    }

    if (!orderDoc) {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({ success: false, error: "Order not found", status: "NOT_FOUND" }),
      };
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        orderId: orderDoc.orderId,
        paymentCode: orderDoc.paymentCode,
        courseId: orderDoc.courseId,
        courseTitle: orderDoc.courseTitle,
        amount: orderDoc.amount,
        status: orderDoc.status,
        email: orderDoc.email,
        paidAt: orderDoc.paidAt || null,
      }),
    };
  } catch (err) {
    console.error("[CheckPayment] Exception:", err);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ success: false, error: err.message || "Internal server error" }),
    };
  }
}
