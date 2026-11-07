import { adminDb } from "./utils/firebaseAdmin.mjs";

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
    const { orderId, paymentCode, email } = params || {};

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
    } else if (paymentCode) {
      const qSnap = await adminDb.collection("orders").where("paymentCode", "==", paymentCode.trim().toUpperCase()).limit(1).get();
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
