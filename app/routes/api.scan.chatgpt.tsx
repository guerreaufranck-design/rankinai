import { json } from "@remix-run/node";
import type { ActionFunction } from "react-router";
import { authenticate } from "../shopify.server";
import { OpenAIService } from "~/services/openai.service";
import { prisma } from "~/db.server";
import { NotificationService } from "~/services/notification.service";

export const action: ActionFunction = async ({ request }) => {
  const { session } = await authenticate.admin(request);
  const formData = await request.formData();
  const productId = formData.get("productId") as string;
  
  try {
    // Get shop and check credits
    const shop = await prisma.shop.findUnique({
      where: { shopifyDomain: session.shop }
    });
    
    if (!shop) {
      return json({ error: "Shop not found" }, { status: 404 });
    }
    
    if (shop.credits < 1) {
      await NotificationService.createAlert(shop.id, {
        title: "Insufficient Credits",
        message: "You need at least 1 credit to run a scan. Please upgrade your plan.",
        type: "error",
        actionUrl: "/app/pricing",
        actionLabel: "Upgrade Now"
      });
      
      return json({ error: "Insufficient credits" }, { status: 402 });
    }
    
    // Get product
    const product = await prisma.product.findUnique({
      where: { id: productId }
    });
    
    if (!product) {
      return json({ error: "Product not found" }, { status: 404 });
    }
    
    // Deduct credit BEFORE scan
    await prisma.shop.update({
      where: { id: shop.id },
      data: { credits: shop.credits - 1 }
    });
    
    // Track event
    await prisma.event.create({
      data: {
        shopId: shop.id,
        type: 'SCAN_STARTED',
        data: { productId, platform: 'CHATGPT', credits: shop.credits - 1 }
      }
    });
    
    // Perform ChatGPT scan
    const startTime = Date.now();
    const result = await OpenAIService.testProductCitation(product);
    const duration = Date.now() - startTime;
    
    // Save scan result
    const scan = await prisma.scan.create({
      data: {
        shopId: shop.id,
        productId: productId,
        platform: 'CHATGPT',
        question: result.question,
        fullResponse: result.fullResponse,
        isCited: result.isCited,
        citation: result.citation,
        citationPosition: result.position,
        sentiment: result.sentiment,
        competitors: result.competitors,
        confidence: result.confidence,
        creditsUsed: 1,
        scanDuration: duration
      }
    });
    
    // Update product stats
    await updateProductChatGPTStats(productId);
    
    // Check for alerts
    await NotificationService.checkProductAlerts(productId);
    
    // Track completion
    await prisma.event.create({
      data: {
        shopId: shop.id,
        type: 'SCAN_COMPLETED',
        data: { 
          productId, 
          platform: 'CHATGPT', 
          isCited: result.isCited,
          duration,
          tokensUsed: result.usage?.total_tokens
        }
      }
    });
    
    return json({
      success: true,
      scan: {
        id: scan.id,
        isCited: result.isCited,
        citation: result.citation,
        position: result.position,
        sentiment: result.sentiment,
        competitors: result.competitors,
        confidence: result.confidence
      },
      creditsRemaining: shop.credits - 1
    });
    
  } catch (error) {
    console.error("ChatGPT scan error:", error);
    
    // Refund credit on error
    const shop = await prisma.shop.findUnique({
      where: { shopifyDomain: session.shop }
    });
    
    if (shop) {
      await prisma.shop.update({
        where: { id: shop.id },
        data: { credits: shop.credits + 1 }
      });
    }
    
    return json({ error: "Scan failed. Credit refunded." }, { status: 500 });
  }
};

async function updateProductChatGPTStats(productId: string) {
  const scans = await prisma.scan.findMany({
    where: { 
      productId,
      platform: 'CHATGPT'
    }
  });
  
  const citedScans = scans.filter(s => s.isCited);
  const citationRate = scans.length > 0 
    ? (citedScans.length / scans.length) * 100 
    : 0;
  
  await prisma.product.update({
    where: { id: productId },
    data: {
      chatgptRate: citationRate,
      lastScanAt: new Date()
    }
  });
}
