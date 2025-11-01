import type { ActionFunction } from "react-router";
import { json } from "@remix-run/node";
import { prisma } from "~/db.server";
import { GeminiService } from "~/services/gemini.service";
import crypto from "crypto";

// Verify webhook signature
function verifyWebhookSignature(
  rawBody: string,
  signature: string | null
): boolean {
  if (!signature) return false;
  
  const hmac = crypto
    .createHmac("sha256", process.env.SHOPIFY_WEBHOOK_SECRET || "")
    .update(rawBody, "utf8")
    .digest("base64");
  
  return hmac === signature;
}

export const action: ActionFunction = async ({ request }) => {
  const topic = request.headers.get("X-Shopify-Topic");
  const shopDomain = request.headers.get("X-Shopify-Shop-Domain");
  const signature = request.headers.get("X-Shopify-Hmac-Sha256");
  
  const rawBody = await request.text();
  
  // Verify webhook
  if (!verifyWebhookSignature(rawBody, signature)) {
    return json({ error: "Unauthorized" }, { status: 401 });
  }
  
  const body = JSON.parse(rawBody);
  
  console.log(`Webhook received: ${topic} from ${shopDomain}`);
  
  // Find shop
  const shop = await prisma.shop.findUnique({
    where: { shopifyDomain: shopDomain || "" }
  });
  
  if (!shop) {
    return json({ error: "Shop not found" }, { status: 404 });
  }
  
  switch (topic) {
    case "products/create":
      await handleProductCreate(shop.id, body);
      break;
      
    case "products/update":
      await handleProductUpdate(shop.id, body);
      break;
      
    case "products/delete":
      await handleProductDelete(body);
      break;
      
    case "app/uninstalled":
      await handleAppUninstalled(shop.id);
      break;
      
    case "customers/data_request":
      await handleCustomerDataRequest(shop.id, body);
      break;
      
    case "customers/redact":
      await handleCustomerRedact(shop.id, body);
      break;
      
    case "shop/redact":
      await handleShopRedact(shop.id);
      break;
      
    default:
      console.log(`Unhandled webhook topic: ${topic}`);
  }
  
  return json({ success: true });
};

async function handleProductCreate(shopId: string, data: any) {
  const product = await prisma.product.create({
    data: {
      shopId,
      shopifyProductId: data.id.toString(),
      title: data.title,
      handle: data.handle,
      description: data.body_html || "",
      vendor: data.vendor,
      productType: data.product_type,
      tags: data.tags ? data.tags.split(", ") : [],
      priceAmount: data.variants?.[0]?.price ? parseFloat(data.variants[0].price) : 0,
      featuredImageUrl: data.image?.src,
      status: data.status === 'active' ? 'ACTIVE' : 'DRAFT'
    }
  });
  
  // Analyze with Gemini
  const analysis = await GeminiService.analyzeProduct(product);
  if (analysis) {
    await prisma.product.update({
      where: { id: product.id },
      data: {
        keywords: analysis.keywords,
        targetAudience: analysis.targetAudience,
        category: analysis.category,
        aiSummary: analysis.summary
      }
    });
  }
}

async function handleProductUpdate(shopId: string, data: any) {
  await prisma.product.update({
    where: { shopifyProductId: data.id.toString() },
    data: {
      title: data.title,
      handle: data.handle,
      description: data.body_html || "",
      vendor: data.vendor,
      productType: data.product_type,
      tags: data.tags ? data.tags.split(", ") : [],
      priceAmount: data.variants?.[0]?.price ? parseFloat(data.variants[0].price) : 0,
      featuredImageUrl: data.image?.src,
      status: data.status === 'active' ? 'ACTIVE' : 'DRAFT',
      syncedAt: new Date()
    }
  });
}

async function handleProductDelete(data: any) {
  await prisma.product.delete({
    where: { shopifyProductId: data.id.toString() }
  }).catch(err => console.error("Product delete failed:", err));
}

async function handleAppUninstalled(shopId: string) {
  await prisma.shop.update({
    where: { id: shopId },
    data: {
      isInstalled: false,
      uninstalledAt: new Date()
    }
  });
  
  // Create event
  await prisma.event.create({
    data: {
      shopId,
      type: 'SHOP_UNINSTALLED',
      data: { timestamp: new Date() }
    }
  });
}

async function handleCustomerDataRequest(shopId: string, data: any) {
  console.log("GDPR: Customer data request", data);
  // Return customer data if any
  return {};
}

async function handleCustomerRedact(shopId: string, data: any) {
  console.log("GDPR: Customer redact request", data);
  // Delete customer data if any
}

async function handleShopRedact(shopId: string) {
  console.log("GDPR: Shop redact request");
  // Delete all shop data after 48 hours
  // This is usually handled by a scheduled job
}
