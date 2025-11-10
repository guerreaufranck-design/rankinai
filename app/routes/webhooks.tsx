import type { ActionFunctionArgs } from "react-router";
import { authenticate } from "~/shopify.server";
import crypto from "crypto";

const verifyWebhook = async (request: Request): Promise<boolean> => {
  try {
    const rawBody = await request.text();
    const hmac = request.headers.get("x-shopify-hmac-sha256");
    
    if (!hmac) return false;
    
    const secret = process.env.SHOPIFY_API_SECRET;
    if (!secret) return false;
    
    const hash = crypto
      .createHmac("sha256", secret)
      .update(rawBody, "utf8")
      .digest("base64");
    
    return hash === hmac;
  } catch (error) {
    console.error("[Webhook] HMAC verification error:", error);
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
      return new Response("Unauthorized", { status: 401 });
    }

    const { topic, shop, payload } = await authenticate.webhook(request);

    switch (topic) {
      case "customers/data_request":
        // TODO: Send customer data to merchant
        console.log("[GDPR] Customer data request for shop:", shop);
        break;
        
      case "customers/redact":
        // TODO: Delete customer data from database
        console.log("[GDPR] Customer redact for shop:", shop);
        break;
        
      case "shop/redact":
        // TODO: Delete all shop data from database
        console.log("[GDPR] Shop redact for shop:", shop);
        break;
        
      case "app/uninstalled":
        console.log("[APP] App uninstalled from shop:", shop);
        break;
    }

    return new Response(JSON.stringify({ received: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" }
    });
    
  } catch (error) {
    console.error("[Webhook] Processing error:", error);
    return new Response(JSON.stringify({ error: "Internal error" }), {
      status: 200,
      headers: { "Content-Type": "application/json" }
    });
  }
};