import { json } from "react-router";
import type { ActionFunction } from "react-router";
import { authenticate } from "../shopify.server";
import { performScan } from "~/services/scan.service";
import { prisma } from "~/db.server";

export const action: ActionFunction = async ({ request }) => {
  const { session } = await authenticate.admin(request);
  const formData = await request.formData();
  const productId = formData.get("productId") as string;
  
  // Check shop credits
  const shop = await prisma.shop.findUnique({
    where: { shopifyDomain: session.shop }
  });
  
  if (!shop || shop.credits < 1) {
    return json({ error: "Insufficient credits" }, { status: 400 });
  }
  
  // Deduct credits
  await prisma.shop.update({
    where: { id: shop.id },
    data: { credits: shop.credits - 1 }
  });
  
  try {
    const result = await performScan(productId, 'CHATGPT');
    return json({ success: true, result });
  } catch (error) {
    // Refund credit on error
    await prisma.shop.update({
      where: { id: shop.id },
      data: { credits: shop.credits }
    });
    
    return json({ error: "Scan failed" }, { status: 500 });
  }
};
