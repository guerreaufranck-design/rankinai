import type { ActionFunctionArgs } from "react-router";
import crypto from "crypto";
import { prisma } from "~/db.server";

export const action = async ({ request }: ActionFunctionArgs) => {
  try {
    // 1. Récupérer headers et body
    const hmac = request.headers.get("x-shopify-hmac-sha256");
    const topic = request.headers.get("x-shopify-topic");
    const shop = request.headers.get("x-shopify-shop-domain");
    
    const body = await request.text();
    
    // 2. Valider HMAC manuellement
    const secret = process.env.SHOPIFY_API_SECRET;
    const hash = crypto
      .createHmac("sha256", secret)
      .update(body, "utf8")
      .digest("base64");
    
    if (hash !== hmac) {
      console.error("❌ Invalid HMAC");
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json" }
      });
    }
    
    console.log(`✅ Webhook validated: ${topic} from ${shop}`);
    
    // 3. Traiter selon le topic
    const payload = JSON.parse(body);
    
    switch (topic) {
      case "customers/data_request":
        console.log("[GDPR] Customer data request:", payload.customer?.email);
        // TODO: Envoyer les données au merchant
        break;
        
      case "customers/redact":
        console.log("[GDPR] Customer redact:", payload.customer?.id);
        // TODO: Supprimer les données client
        await prisma.scan.deleteMany({
          where: { 
            Shop: { shopifyDomain: shop }
          }
        });
        break;
        
      case "shop/redact":
        console.log("[GDPR] Shop redact:", payload.shop_domain);
        // TODO: Supprimer toutes les données du shop
        await prisma.shop.delete({
          where: { shopifyDomain: shop }
        });
        break;
        
      case "app/uninstalled":
        console.log("[APP] App uninstalled:", shop);
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
    return new Response(JSON.stringify({ error: error.message }), {
      status: 200,
      headers: { "Content-Type": "application/json" }
    });
  }
};