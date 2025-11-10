import type { ActionFunctionArgs } from "react-router";
import { authenticate } from "~/shopify.server";

export const action = async ({ request }: ActionFunctionArgs) => {
  try {
    const { topic, shop, session, payload } = await authenticate.webhook(request);

    console.log(`✅ Webhook received: ${topic} from shop: ${shop}`);

    switch (topic) {
      case "APP_UNINSTALLED":
        console.log("[APP] App uninstalled from shop:", shop);
        break;

      case "customers/data_request":
        console.log("[GDPR] Customer data request:", payload);
        break;

      case "customers/redact":
        console.log("[GDPR] Customer redact request:", payload);
        break;

      case "shop/redact":
        console.log("[GDPR] Shop redact request:", payload);
        break;

      default:
        console.log(`⚠️ Unknown topic: ${topic}`);
    }

    return new Response(JSON.stringify({ received: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" }
    });
    
  } catch (error) {
    console.error("❌ Webhook error:", error);

    if (error.message?.includes("HMAC") || error.message?.includes("Unauthorized")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json" }
      });
    }

    return new Response(JSON.stringify({ error: error.message }), {
      status: 200,
      headers: { "Content-Type": "application/json" }
    });
  }
};