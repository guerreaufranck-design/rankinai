import type { ActionFunctionArgs } from "react-router";
import { authenticate } from "~/shopify.server";

export const action = async ({ request }: ActionFunctionArgs) => {
  try {
    const { topic, shop, payload } = await authenticate.webhook(request);
    
    console.log(`✅ Webhook received: ${topic} from ${shop}`);
    
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
        console.log("[APP] App uninstalled");
        break;
    }
    
    return new Response(JSON.stringify({ received: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" }
    });
    
  } catch (error) {
    console.error("❌ Webhook error:", error);
    
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" }
    });
  }
};