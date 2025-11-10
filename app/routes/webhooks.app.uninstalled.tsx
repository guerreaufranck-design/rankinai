import type { ActionFunctionArgs } from "react-router";
import { authenticate } from "~/shopify.server";
import { prisma } from "~/db.server";

export const loader = () => {
  return new Response("Method Not Allowed", { status: 405 });
};

export const action = async ({ request }: ActionFunctionArgs) => {
  try {
    const { shop, topic } = await authenticate.webhook(request);
    console.log("[WEBHOOK] App uninstalled for shop:", shop);
    
    // Optionnel : supprimer les données du shop
    await prisma.shop.updateMany({
      where: { shopifyDomain: shop },
      data: { plan: "TRIAL", credits: 0 }
    });
    
    return new Response();
  } catch (error) {
    console.error("[WEBHOOK] Error:", error);
    return new Response("Unauthorized", { status: 401 });
  }
};
