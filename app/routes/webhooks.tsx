import type { ActionFunctionArgs } from "react-router";
import { authenticate } from "~/shopify.server";

export const action = async ({ request }: ActionFunctionArgs) => {
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("🔵 WEBHOOK ACTION CALLED");
  
  try {
    // ✅ CLONE la request AVANT de l'envoyer à authenticate
    const clonedRequest = request.clone();
    
    // Lire le body pour debug
    const bodyText = await request.text();
    console.log("🔵 Body:", bodyText);
    
    // Recréer une nouvelle Request avec le body
    const newRequest = new Request(clonedRequest.url, {
      method: clonedRequest.method,
      headers: clonedRequest.headers,
      body: bodyText,
    });
    
    console.log("🔵 Calling authenticate.webhook...");
    const result = await authenticate.webhook(newRequest);
    console.log("✅ authenticate.webhook SUCCESS");
    
    const { topic, shop } = result;
    console.log(`✅ Webhook received: ${topic} from shop: ${shop}`);

    return new Response(JSON.stringify({ received: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" }
    });
    
  } catch (error) {
    console.error("❌ WEBHOOK ERROR:", error);
    
    return new Response(JSON.stringify({ error: error?.message || "Unknown" }), {
      status: 200,
      headers: { "Content-Type": "application/json" }
    });
  }
};