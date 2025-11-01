import { json } from "@remix-run/node";
import type { ActionFunction } from "react-router";
import { authenticate } from "../shopify.server";
import { GeminiService } from "~/services/gemini.service";
import { prisma } from "~/db.server";

export const action: ActionFunction = async ({ request }) => {
  const { session } = await authenticate.admin(request);
  const formData = await request.formData();
  const productId = formData.get("productId") as string;
  
  try {
    // Get shop and check credits
    const shop = await prisma.shop.findUnique({
      where: { shopifyDomain: session.shop }
    });
    
    if (!shop || shop.credits < 1) {
      return json({ error: "Insufficient credits" }, { status: 402 });
    }
    
    // Get product with recent scans
    const product = await prisma.product.findUnique({
      where: { id: productId },
      include: {
        scans: {
          orderBy: { createdAt: 'desc' },
          take: 2
        }
      }
    });
    
    if (!product) {
      return json({ error: "Product not found" }, { status: 404 });
    }
    
    // Get latest ChatGPT and Gemini scans
    const chatgptScan = product.scans.find(s => s.platform === 'CHATGPT');
    const geminiScan = product.scans.find(s => s.platform === 'GEMINI');
    
    // Deduct credit
    await prisma.shop.update({
      where: { id: shop.id },
      data: { credits: shop.credits - 1 }
    });
    
    // Generate recommendations with Gemini
    const recommendations = await GeminiService.generateOptimizationRecommendations(
      product,
      chatgptScan,
      geminiScan
    );
    
    // Save recommendations
    const optimization = await prisma.optimization.create({
      data: {
        productId: productId,
        currentScore: Math.round(product.citationRate),
        potentialScore: Math.min(95, Math.round(product.citationRate * 1.5)),
        recommendations: recommendations,
        quickWins: recommendations.quickWins
      }
    });
    
    return json({
      success: true,
      optimization: {
        id: optimization.id,
        recommendations,
        currentScore: optimization.currentScore,
        potentialScore: optimization.potentialScore
      },
      creditsRemaining: shop.credits - 1
    });
    
  } catch (error) {
    console.error("Recommendations generation error:", error);
    return json({ error: "Failed to generate recommendations" }, { status: 500 });
  }
};
