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
    const body = JSON.parse(event.body || "{}");
    const { name, email, phone, company, topic, preferredContact, message, ticketId } = body;

    if (!name || !phone) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ success: false, error: "Họ tên và số điện thoại là bắt buộc." }),
      };
    }

    const genId = ticketId || Math.floor(1000000000 + Math.random() * 9000000000).toString();
    const inquiryData = {
      id: genId,
      name: name.trim(),
      email: email ? email.trim() : 'khong-co@email.com',
      phone: phone.trim(),
      company: company ? company.trim() : 'Cá nhân',
      topic: topic || 'Tư vấn chung',
      preferredContact: preferredContact || 'phone',
      message: message ? message.trim() : '',
      createdAt: new Date().toISOString()
    };

    // Save to Firestore contact_inquiries
    try {
      await adminDb.collection("contact_inquiries").doc(genId).set(inquiryData);
    } catch (err) {
      console.warn("Failed to save contact inquiry to Firestore via adminDb:", err.message);
    }

    // Send via Resend API if RESEND_API_KEY is available
    const resendApiKey = process.env.RESEND_API_KEY || '';
    let emailSent = false;
    if (resendApiKey) {
      try {
        const resendRes = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${resendApiKey}`
          },
          body: JSON.stringify({
            from: "FAST E-Learning <onboarding@resend.dev>",
            to: ["hkc.qms@gmail.com", "support@fastelearning.com.vn"],
            subject: `[Tư vấn #${genId}] ${topic} - ${name}`,
            text: `[MÃ TIẾP NHẬN: #${genId}]
- Họ tên: ${name}
- Số điện thoại: ${phone}
- Email: ${email || 'Không có'}
- Doanh nghiệp: ${company || 'Cá nhân'}
- Chủ đề: ${topic}
- Kênh liên hệ ưu tiên: ${preferredContact}
- Nội dung: ${message || 'Yêu cầu tư vấn nhanh'}`
          })
        });
        if (resendRes.ok) {
          emailSent = true;
        }
      } catch (resendErr) {
        console.warn("Resend API error:", resendErr.message);
      }
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        ticketId: genId,
        emailSent,
        message: "Gửi yêu cầu hỗ trợ thành công!"
      }),
    };
  } catch (err) {
    console.error("Netlify send-contact error:", err);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ success: false, error: err.message }),
    };
  }
}
