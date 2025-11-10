import type { ActionFunctionArgs } from "react-router";
import { authenticate } from "~/shopify.server";

export const action = async ({ request }: ActionFunctionArgs) => {
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("🔵 WEBHOOK ACTION CALLED");
  console.log("🔵 Method:", request.method);
  console.log("🔵 URL:", request.url);
  console.log("🔵 Headers:", JSON.stringify(Object.fromEntries(request.headers.entries()), null, 2));
  
  try {
    console.log("🔵 Calling authenticate.webhook...");
    const result = await authenticate.webhook(request);
    console.log("✅ authenticate.webhook SUCCESS");
    console.log("✅ Result:", JSON.stringify(result, null, 2));
    
    const { topic, shop } = result;
    console.log(`✅ Webhook received: ${topic} from shop: ${shop}`);

    switch (topic) {
      case "APP_UNINSTALLED":
        console.log("[APP] App uninstalled from shop:", shop);
        break;

      case "customers/data_request":
        console.log("[GDPR] Customer data request");
        break;

      case "customers/redact":
        console.log("[GDPR] Customer redact request");
        break;

      case "shop/redact":
        console.log("[GDPR] Shop redact request");
        break;

      default:
        console.log(`⚠️ Unknown topic: ${topic}`);
    }

    return new Response(JSON.stringify({ received: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" }
    });
    
  } catch (error) {
    console.error("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.error("❌ WEBHOOK ERROR");
    console.error("❌ Error:", error);
    console.error("❌ Error message:", error?.message);
    console.error("❌ Error stack:", error?.stack);
    console.error("❌ Error type:", typeof error);
    console.error("❌ Error keys:", Object.keys(error || {}));
    console.error("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

    if (error?.message?.includes("HMAC") || error?.message?.includes("Unauthorized")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json" }
      });
    }

    return new Response(JSON.stringify({ error: error?.message || "Unknown error" }), {
      status: 200,
      headers: { "Content-Type": "application/json" }
    });
  }
};