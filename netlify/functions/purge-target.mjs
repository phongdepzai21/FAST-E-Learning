import { adminDb } from "./utils/firebaseAdmin.mjs";

export async function handler(event, context) {
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
    const targetId = "course-1792154795450";
    const targetNumeric = "1792154795450";
    let deletedCount = 0;
    const actions = [];

    // 1. Delete from orders collection
    const ordersSnap = await adminDb.collection("orders").get();
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
        await adminDb.collection("orders").doc(doc.id).delete();
        deletedCount++;
        actions.push(`Deleted order: ${doc.id}`);
      }
    }

    // 2. Delete from pending_payments collection
    const pendingSnap = await adminDb.collection("pending_payments").get();
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
        await adminDb.collection("pending_payments").doc(doc.id).delete();
        deletedCount++;
        actions.push(`Deleted pending_payment: ${doc.id}`);
      }
    }

    // 3. Delete from payment_logs collection
    const logsSnap = await adminDb.collection("payment_logs").get();
    for (const doc of logsSnap.docs) {
      const data = doc.data();
      const str = JSON.stringify(data);
      if (str.includes(targetId) || str.includes(targetNumeric)) {
        await adminDb.collection("payment_logs").doc(doc.id).delete();
        deletedCount++;
        actions.push(`Deleted payment_log: ${doc.id}`);
      }
    }

    // 4. Delete from all users' purchased_courses subcollections
    const usersSnap = await adminDb.collection("users").get();
    for (const userDoc of usersSnap.docs) {
      const purchasedSnap = await adminDb.collection("users").doc(userDoc.id).collection("purchased_courses").get();
      for (const pDoc of purchasedSnap.docs) {
        const pData = pDoc.data();
        if (
          pDoc.id === targetId ||
          pDoc.id.includes(targetNumeric) ||
          pData.courseId === targetId ||
          pData.orderId === targetId ||
          JSON.stringify(pData).includes(targetNumeric)
        ) {
          await adminDb.collection("users").doc(userDoc.id).collection("purchased_courses").doc(pDoc.id).delete();
          deletedCount++;
          actions.push(`Deleted purchased_course ${pDoc.id} for user ${userDoc.id}`);
        }
      }
    }

    console.log(`[PurgeTarget] Successfully purged target ${targetId}. Deleted records: ${deletedCount}`);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        message: `Permanently deleted all receipts and records matching ${targetId}`,
        deletedCount,
        actions,
      }),
    };
  } catch (err) {
    console.error("[PurgeTarget] Exception:", err);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ success: false, error: err.message || "Internal server error" }),
    };
  }
}
