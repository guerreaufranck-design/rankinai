import type { ActionFunctionArgs } from "react-router";
import crypto from "crypto";
import { prisma } from "~/db.server";

export const action = async ({ request }: ActionFunctionArgs) => {
  try {
    const hmacReceived = request.headers.get("x-shopify-hmac-sha256");
    const topic = request.headers.get("x-shopify-topic");
    const shop = request.headers.get("x-shopify-shop-domain");
    const isTest = request.headers.get("x-shopify-test") === "true";
    
    const body = await request.text();
    
    // ✅ En mode test, on skip la validation HMAC
    if (!isTest) {
      const secret = process.env.SHOPIFY_API_SECRET;
      
      if (!secret) {
        console.error("❌ No secret configured");
        return new Response(JSON.stringify({ error: "Server error" }), {
          status: 500,
          headers: { "Content-Type": "application/json" }
        });
      }
      
      const hmacCalculated = crypto
        .createHmac("sha256", secret)
        .update(body, "utf8")
        .digest("base64");
      
      if (hmacCalculated !== hmacReceived) {
        console.error("❌ Invalid HMAC");
        return new Response(JSON.stringify({ error: "Unauthorized" }), {
          status: 401,
          headers: { "Content-Type": "application/json" }
        });
      }
    } else {
      console.log("⚠️ Test webhook - HMAC validation skipped");
    }
    
    console.log(`✅ Webhook received: ${topic} from ${shop}`);
    
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
        await prisma.shop.deleteMany({
          where: { shopifyDomain: shop }
        });
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