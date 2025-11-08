import type { ActionFunctionArgs } from "react-router";
import { authenticate } from "~/shopify.server";
import { prisma } from "~/db.server";

export const action = async ({ request }: ActionFunctionArgs) => {
  const { shop, payload } = await authenticate.webhook(request);

  console.log("📬 App Uninstalled for shop:", shop);

  try {
    const shopDomain = (payload as any).myshopify_domain || shop;

    await prisma.event.create({
      data: {
        type: "APP_UNINSTALLED",
        title: `App uninstalled: ${shopDomain}`,
        description: `RankInAI uninstalled from: ${shopDomain}`,
        metadata: JSON.stringify(payload),
      },
    });

    const shopRecord = await prisma.shop.findFirst({
      where: { shopifyDomain: shopDomain },
    });

    if (shopRecord) {
      await prisma.shop.update({
        where: { id: shopRecord.id },
        data: {
          accessToken: "",
          plan: "TRIAL",
          credits: 0,
          maxCredits: 0,
          billingId: null,
        },
      });

      console.log("✅ Shop marked as uninstalled");
    }

    return new Response("OK", { status: 200 });
  } catch (error) {
    console.error("❌ Error:", error);
    return new Response("Error", { status: 500 });
  }
};
