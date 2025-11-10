import type { ActionFunctionArgs } from "react-router";
import { authenticate } from "~/shopify.server";
import crypto from "crypto";

// ✅ Vérification manuelle AVANT authenticate.webhook()
const verifyWebhook = async (request: Request): Promise<boolean> => {
  try {
    const rawBody = await request.text();
    const hmac = request.headers.get("x-shopify-hmac-sha256");
    
    if (!hmac) {
      console.error("[HMAC] Header missing");
      return false;
    }
    
    const secret = process.env.SHOPIFY_API_SECRET;
    if (!secret) {
      console.error("[HMAC] Secret missing");
      return false;
    }
    
    const hash = crypto
      .createHmac("sha256", secret)
      .update(rawBody, "utf8")
      .digest("base64");
    
    const isValid = hash === hmac;
    console.log("[HMAC] Valid:", isValid);
    
    return isValid;
  } catch (error) {
    console.error("[HMAC] Error:", error);
    return false;
  }
};

export const action = async ({ request }: ActionFunctionArgs) => {
  if (request.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  try {
    // ✅ Clone pour vérification manuelle
    const clonedRequest = request.clone();
    const trustworthy = await verifyWebhook(clonedRequest);
    
    if (!trustworthy) {
      console.error("[WEBHOOK] Invalid HMAC - Rejected");
      return new Response("Invalid HMAC", { status: 401 });
    }

    // ✅ Puis authenticate avec request original
    const { topic, shop, payload } = await authenticate.webhook(request);
    
    console.log(`✅ [WEBHOOK] ${topic} from ${shop}`);

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
      default:
        console.log(`[WEBHOOK] Unknown topic: ${topic}`);
    }

    return new Response(JSON.stringify({ received: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" }
    });
    
  } catch (error) {
    console.error("[WEBHOOK] Error:", error);
    // ✅ Retourner 200 même en erreur pour éviter retries
    return new Response(JSON.stringify({ error: "Internal error" }), {
      status: 200,
      headers: { "Content-Type": "application/json" }
    });
  }
};