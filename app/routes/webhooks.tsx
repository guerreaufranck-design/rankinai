import { json, type ActionFunction } from "react-router";
import { authenticate } from "~/shopify.server";

export const action: ActionFunction = async ({ request }) => {
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

    return json({ received: true }, { status: 200 });
    
  } catch (error) {
    console.error("❌ Webhook error:", error);

    if (error.message?.includes("HMAC") || error.message?.includes("Unauthorized")) {
      return json({ error: "Unauthorized" }, { status: 401 });
    }

    return json({ error: error.message }, { status: 200 });
  }
};