import type { ActionFunctionArgs } from "react-router";
import { json } from "~/utils/response";
import { authenticate } from "~/shopify.server";
import { prisma } from "~/db.server";
import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

export const action = async ({ request }: ActionFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const formData = await request.formData();
  const productId = formData.get("productId") as string;

  if (!productId) {
    return json({ error: "Product ID required" }, { status: 400 });
  }

  try {
    const shop = await prisma.shop.findFirst({
      where: { shopifyDomain: session.shop },
    });

    if (!shop || shop.credits <= 0) {
      return json({ error: "No credits" }, { status: 402 });
    }

    const product = await prisma.product.findUnique({
      where: { id: productId },
    });

    if (!product) {
      return json({ error: "Product not found" }, { status: 404 });
    }

    const startTime = Date.now();
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
    const result = await model.generateContent(`Tell me about ${product.title}`);
    const fullResponse = result.response.text();
    const scanDuration = Date.now() - startTime;
    const isCited = fullResponse.toLowerCase().includes(product.title.toLowerCase());

    await prisma.scan.create({
      data: {
        shopId: shop.id,
        productId: product.id,
        platform: "GEMINI",
        question: `Tell me about ${product.title}`,
        fullResponse,
        isCited,
        creditsUsed: 1,
        scanDuration,
      },
    });

    const allScans = await prisma.scan.count({
      where: { productId: product.id, platform: "GEMINI" },
    });
    const citedScans = await prisma.scan.count({
      where: { productId: product.id, platform: "GEMINI", isCited: true },
    });

    const geminiRate = allScans > 0 ? Math.round((citedScans / allScans) * 100) : 0;

    await prisma.product.update({
      where: { id: product.id },
      data: {
        geminiRate,
        totalScans: { increment: 1 },
        lastScanAt: new Date(),
      },
    });

    await prisma.shop.update({
      where: { id: shop.id },
      data: { credits: { decrement: 1 } },
    });

    return json({ success: true, geminiRate });
  } catch (error: any) {
    console.error("Gemini error:", error);
    return json({ error: error.message }, { status: 500 });
  }
};
