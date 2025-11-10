import type { ActionFunctionArgs } from "react-router";
import { authenticate } from "~/shopify.server";
import crypto from "crypto";

const verifyWebhook = async (request: Request): Promise<boolean> => {
  try {
    const rawBody = await request.text();
    const hmac = request.headers.get("x-shopify-hmac-sha256");
    
    console.log("🔍 === HMAC DEBUG START ===");
    console.log("🔍 HMAC Header:", hmac);
    console.log("🔍 Body length:", rawBody.length);
    console.log("🔍 Body (first 100 chars):", rawBody.substring(0, 100));
    console.log("🔍 Body (last 50 chars):", rawBody.substring(rawBody.length - 50));
    
    const secret = process.env.SHOPIFY_API_SECRET;
    console.log("🔍 Secret exists:", !!secret);
    console.log("🔍 Secret length:", secret?.length);
    console.log("🔍 Secret prefix:", secret?.substring(0, 10));
    
    if (!hmac || !secret) {
      console.error("❌ Missing HMAC or secret");
      return false;
    }
    
    // Test avec plusieurs encodings
    const hash1 = crypto.createHmac("sha256", secret).update(rawBody, "utf8").digest("base64");
    const hash2 = crypto.createHmac("sha256", secret).update(Buffer.from(rawBody, "utf8")).digest("base64");
    const hash3 = crypto.createHmac("sha256", secret).update(rawBody).digest("base64");
    
    console.log("🔍 HMAC calc (utf8):", hash1);
    console.log("🔍 HMAC calc (buffer):", hash2);
    console.log("🔍 HMAC calc (default):", hash3);
    console.log("🔍 HMAC received:", hmac);
    console.log("🔍 Match utf8?", hash1 === hmac);
    console.log("🔍 Match buffer?", hash2 === hmac);
    console.log("🔍 Match default?", hash3 === hmac);
    console.log("🔍 === HMAC DEBUG END ===");
    
    return hash1 === hmac || hash2 === hmac || hash3 === hmac;
  } catch (error) {
    console.error("❌ [HMAC] Error:", error);
    return false;
  }
};

export const action = async ({ request }: ActionFunctionArgs) => {
  if (request.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  try {
    const clonedRequest = request.clone();
    const trustworthy = await verifyWebhook(clonedRequest);
    
    if (!trustworthy) {
      console.error("❌ [WEBHOOK] Invalid HMAC - Rejected");
      return new Response("Invalid HMAC", { status: 401 });
    }

    const { topic, shop, payload } = await authenticate.webhook(request);
    
    console.log(`✅ [WEBHOOK] ${topic} from ${shop}`);

    switch (topic) {
      case "customers/data_request":
        console.log("[GDPR] Customer data request");
        break;
      case "customers/redact":
        console.log("[GDPR] Customer redact");
        break;
      case "shop/redact":
        console.log("[GDPR] Shop redact");
        break;
    }

    return new Response(JSON.stringify({ received: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" }
    });
    
  } catch (error) {
    console.error("❌ [WEBHOOK] Error:", error);
    return new Response(JSON.stringify({ error: "Internal error" }), {
      status: 200,
      headers: { "Content-Type": "application/json" }
    });
  }
};