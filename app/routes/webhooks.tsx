import type { ActionFunctionArgs } from "react-router";

export const action = async ({ request }: ActionFunctionArgs) => {
  console.log("🟢 WEBHOOK ENDPOINT HIT - NO AUTH");
  console.log("🟢 Method:", request.method);
  console.log("🟢 URL:", request.url);
  
  const hmac = request.headers.get("x-shopify-hmac-sha256");
  const topic = request.headers.get("x-shopify-topic");
  
  console.log("🟢 HMAC Header:", hmac);
  console.log("🟢 Topic:", topic);
  
  const body = await request.text();
  console.log("🟢 Body length:", body.length);
  console.log("🟢 Body:", body);
  
  return new Response(JSON.stringify({ 
    received: true, 
    bypass: true,
    topic: topic 
  }), {
    status: 200,
    headers: { "Content-Type": "application/json" }
  });
};