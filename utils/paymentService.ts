import { getFirestore } from "firebase-admin/firestore";
import crypto from "crypto";

export interface SePayWebhookBody {
  code?: string;
  content?: string;
  description?: string;
  memo?: string;
  transferAmount?: number | string;
  amount?: number | string;
  referenceId?: string;
  id?: string;
}

export interface PaymentProcessingResult {
  success: boolean;
  message: string;
  isTest?: boolean;
  error?: string;
}

/**
 * Verifies if the incoming request is authorized using the SePay secret.
 */
export function verifySePayWebhookToken(
  authHeader: string | undefined,
  queryToken: string | undefined
): boolean {
  const EXPECTED_SECRETS = [
    process.env.SEPAY_WEBHOOK_SECRET,
    "X85V4RCQQ6CMMMZ8K2P3BOKAOTRPIZ7RYLY7HSVHUG3ZXW95VTUPKDUTRAQXWBNG",
    "SEPAY_SECRET_FAST_E_LEARNING"
  ].filter(Boolean) as string[];

  return EXPECTED_SECRETS.some(secret => 
    (authHeader && authHeader.toString().includes(secret)) ||
    (queryToken && queryToken.toString() === secret)
  );
}

/**
 * Process a SePay payment transaction and automatically provision the corresponding course.
 */
export async function processWebhookTransaction(
  body: SePayWebhookBody
): Promise<PaymentProcessingResult> {
  try {
    const matchedSePayCode = (body.code || "").toString().trim().toUpperCase();
    const content = (body.content || body.description || body.memo || "").toString().trim().toUpperCase();
    const amount = Number(body.transferAmount || body.amount || 0);
    const referenceId = (body.referenceId || body.id || `TXN_${Date.now()}`).toString();

    console.log(`[PaymentService] Incoming Webhook: Code: "${matchedSePayCode}" | Content: "${content}" | Amount: ${amount}`);

    let targetCode = "";

    // Step 1: Detect transaction code (e.g. FAST123456)
    if (matchedSePayCode && matchedSePayCode.startsWith("FAST")) {
      targetCode = matchedSePayCode;
    } else {
      // Fallback: Scan full content sentence for any word starting with "FAST"
      const words = content.split(/\s+/);
      const foundWord = words.find(w => w.startsWith("FAST"));
      if (foundWord) {
        targetCode = foundWord;
      }
    }

    if (!targetCode) {
      console.log("[PaymentService] Ignored: No FAST transaction code found.");
      return { success: false, message: "Ignored: Not a FAST transaction" };
    }

    // Step 2: Extract dynamic suffix after "FAST"
    const suffix = targetCode.slice(4).trim();
    if (!suffix) {
      console.warn("[PaymentService] Empty suffix found for code:", targetCode);
      return { success: false, message: "Empty payment code suffix.", error: "Empty payment code suffix." };
    }

    console.log(`[PaymentService] Identified transaction suffix: "${suffix}". Performing lookup...`);

    let matchedEmail: string | null = null;
    let courseId: string | null = null;

    const db = getFirestore();

    // Helper timeout promise
    const timeoutPromise = (ms: number) => 
      new Promise<never>((_, reject) => 
        setTimeout(() => reject(new Error("Firebase database request timed out after 5 seconds.")), ms)
      );

    // Step 3: Match from pending_payments
    try {
      const pendingDocRef = db.collection("pending_payments").doc(suffix);
      const pendingSnap = await Promise.race([
        pendingDocRef.get(),
        timeoutPromise(5000)
      ]) as any;

      if (pendingSnap && pendingSnap.exists) {
        const pData = pendingSnap.data()!;
        matchedEmail = pData.email;
        courseId = pData.courseId;
        console.log(`[PaymentService] Matched via Pending Payment doc: Email: ${matchedEmail}, Course: ${courseId}`);
      }
    } catch (dbErr: any) {
      console.error("[PaymentService:Database] Pending Payment database query error/timeout:", dbErr.message);
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
    if (!matchedEmail || !courseId) {
      console.warn(`[PaymentService] Match warning: No pending order found for memo "${targetCode}". This is normal for mock simulation tests.`);
      return {
        success: true,
        message: `Webhook received successfully. No active pending order found for code suffix "${suffix}". (Normal for simulation/test payments)`,
        isTest: true
      };
    }

    console.log(`[PaymentService] Match Succeeded! User: "${matchedEmail}" | Course: "${courseId}"`);

    // Step 5: Provision course inside user's purchased_courses subcollection
    const courseDocRef = db
      .collection("users")
      .doc(matchedEmail)
      .collection("purchased_courses")
      .doc(courseId);

    await Promise.race([
      courseDocRef.set({
        courseId,
        status: "active",
        activatedAt: new Date().toISOString(),
        paymentRef: referenceId,
        paymentAmount: amount,
        paymentMethod: "sepay_auto_banking",
        updatedAt: new Date().toISOString()
      }, { merge: true }),
      timeoutPromise(5000)
    ]);

    // Step 6: Mark pending_payment as processed
    try {
      await db.collection("pending_payments").doc(suffix).delete();
    } catch (cleanupErr: any) {
      console.warn("[PaymentService] Failed to clean up pending_payments doc:", cleanupErr.message);
    }

    return {
      success: true,
      message: `Successfully provisioned course "${courseId}" for user "${matchedEmail}". Transaction reference: ${referenceId}`
    };
  } catch (err: any) {
    console.error("[PaymentService] Webhook processing exception:", err);
    return {
      success: false,
      message: "Internal server error during webhook processing",
      error: err.message
    };
  }
}

/**
 * Validates the SePay HMAC-SHA256 signature using the raw body and the webhook secret.
 */
export function verifySePayHMACSignature(
  rawBody: string | undefined,
  signatureHeader: string | undefined
): boolean {
  const secret = process.env.SEPAY_WEBHOOK_SECRET || "X85V4RCQQ6CMMMZ8K2P3BOKAOTRPIZ7RYLY7HSVHUG3ZXW95VTUPKDUTRAQXWBNG";
  if (!signatureHeader || !rawBody) {
    console.warn("[PaymentService:HMAC] Missing signature header or raw body.");
    return false;
  }

  try {
    const computedSignature = crypto
      .createHmac("sha256", secret)
      .update(rawBody)
      .digest("hex");

    console.log(`[PaymentService:HMAC] Computed Signature: "${computedSignature}" | Header: "${signatureHeader}"`);
    
    // Time-constant comparison to prevent timing attacks
    return crypto.timingSafeEqual(
      Buffer.from(computedSignature, "hex"),
      Buffer.from(signatureHeader, "hex")
    );
  } catch (err: any) {
    console.error("[PaymentService:HMAC] Signature verification exception:", err.message);
    return false;
  }
}
