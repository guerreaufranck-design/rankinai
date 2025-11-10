import type { ActionFunctionArgs } from "react-router";
import crypto from "crypto";
import { prisma } from "~/db.server";

export const action = async ({ request }: ActionFunctionArgs) => {
  try {
    const hmacReceived = request.headers.get("x-shopify-hmac-sha256");
    const topic = request.headers.get("x-shopify-topic");
    const shop = request.headers.get("x-shopify-shop-domain");
    
    const body = await request.text();
    
    // DEBUG LOGS
    console.log("🔍 HMAC Received:", hmacReceived);
    console.log("🔍 Secret exists:", !!process.env.SHOPIFY_API_SECRET);
    console.log("🔍 Secret length:", process.env.SHOPIFY_API_SECRET?.length);
    console.log("🔍 Body length:", body.length);
    console.log("🔍 Body:", body);
    
    const secret = process.env.SHOPIFY_API_SECRET;
    
    if (!secret) {
      console.error("❌ No secret found");
      return new Response(JSON.stringify({ error: "Server config error" }), {
        status: 500,
        headers: { "Content-Type": "application/json" }
      });
    }
    
    const hmacCalculated = crypto
      .createHmac("sha256", secret)
      .update(body, "utf8")
      .digest("base64");
    
    console.log("🔍 HMAC Calculated:", hmacCalculated);
    console.log("🔍 Match:", hmacCalculated === hmacReceived);
    
    if (hmacCalculated !== hmacReceived) {
      console.error("❌ Invalid HMAC");
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json" }
      });
    }
    
    console.log(`✅ Webhook validated: ${topic} from ${shop}`);
    
    const payload = JSON.parse(body);
    
    switch (topic) {
      case "customers/data_request":
        console.log("[GDPR] Customer data request:", payload.customer?.email);
        break;
        
      case "customers/redact":
        console.log("[GDPR] Customer redact:", payload.customer?.id);
        break;
        
      case "shop/redact":
        console.log("[GDPR] Shop redact:", payload.shop_domain);
        break;
        
      case "app/uninstalled":
        console.log("[APP] App uninstalled:", shop);
        break;
    }
    
    return new Response(JSON.stringify({ received: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" }
    });
    
  } catch (error) {
    console.error("❌ Webhook error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
};