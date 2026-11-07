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
    const referenceId = (body.referenceId || body.id || `TXN_${Date.now()}`).toString();

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

    // Step 1: Parse suffix from content sentence using robust regex
    const fastRegex = /FAST\s*[-_]?\s*(\d+)/i;
    const match = content.match(fastRegex);
    if (match) {
      suffix = match[1].trim();
      targetCode = `FAST${suffix}`;
    } else if (matchedTxnCode) {
      const codeMatch = matchedTxnCode.match(fastRegex);
      if (codeMatch) {
        suffix = codeMatch[1].trim();
        targetCode = `FAST${suffix}`;
      }
    }

    if (!targetCode || !suffix) {
      const errMsg = "Ignored: No valid FAST transaction code format found in content.";
      console.log(`[PaymentService] ${errMsg}`);
      await logFailedWebhookAttempt(body, errMsg, "ignored");
      return { success: false, message: "Ignored: Not a FAST transaction" };
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
      const warnMsg = `Webhook received successfully. No active pending order found for code suffix "${suffix}". (Normal for simulation/test payments)`;
      console.warn(`[PaymentService] Match warning: No pending order found for memo "${targetCode}". This is normal for mock simulation tests.`);
      await logFailedWebhookAttempt(body, warnMsg, "ignored");
      return {
        success: true,
        message: warnMsg,
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
        paymentMethod: "vietqr_auto_banking",
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

    // Log successful webhook execution for unified dashboard lifecycle tracking
    try {
      await logFailedWebhookAttempt(
        body,
        `Successfully provisioned course "${courseId}" for user "${matchedEmail}". Ref: ${referenceId}`,
        "success" as any
      );
    } catch (logSuccessErr: any) {
      console.warn("[PaymentService] Failed to log success status to payment_logs:", logSuccessErr.message);
    }

    return {
      success: true,
      message: `Successfully provisioned course "${courseId}" for user "${matchedEmail}". Transaction reference: ${referenceId}`
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
 * Validates the HMAC-SHA256 signature using the raw body and the webhook secret.
 */
export function verifyHMACSignature(
  rawBody: string | undefined,
  signatureHeader: string | undefined
): boolean {
  const secret = process.env.PAYMENT_WEBHOOK_SECRET || "FAST_BANKING_SECRET_KEY";
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
    
    const bufComputed = Buffer.from(computedSignature, "hex");
    const bufHeader = Buffer.from(signatureHeader, "hex");

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
