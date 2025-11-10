import type { ActionFunctionArgs } from "react-router";
import { json } from "~/utils/response";
import { authenticate } from "~/shopify.server";
import { prisma } from "~/db.server";
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

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
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: "You are a helpful shopping assistant." },
        { role: "user", content: `Tell me about ${product.title}` },
      ],
      max_tokens: 300,
    });

    const fullResponse = completion.choices[0]?.message?.content || "";
    const scanDuration = Date.now() - startTime;
    const isCited = fullResponse.toLowerCase().includes(product.title.toLowerCase());

    await prisma.scan.create({
      data: {
        shopId: shop.id,
        productId: product.id,
        platform: "CHATGPT",
        question: `Tell me about ${product.title}`,
        fullResponse,
        isCited,
        creditsUsed: 1,
        scanDuration,
      },
    });

    const allScans = await prisma.scan.count({
      where: { productId: product.id, platform: "CHATGPT" },
    });
    const citedScans = await prisma.scan.count({
      where: { productId: product.id, platform: "CHATGPT", isCited: true },
    });

    const chatgptRate = allScans > 0 ? Math.round((citedScans / allScans) * 100) : 0;

    await prisma.product.update({
      where: { id: product.id },
      data: {
        chatgptRate,
        totalScans: { increment: 1 },
        lastScanAt: new Date(),
      },
    });

    await prisma.shop.update({
      where: { id: shop.id },
      data: { credits: { decrement: 1 } },
    });

    return json({ success: true, chatgptRate });
  } catch (error: any) {
    console.error("ChatGPT error:", error);
    return json({ error: error.message }, { status: 500 });
  }
};
