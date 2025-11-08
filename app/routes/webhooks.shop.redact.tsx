import type { ActionFunctionArgs } from "react-router";
import { authenticate } from "~/shopify.server";
import { prisma } from "~/db.server";

export const action = async ({ request }: ActionFunctionArgs) => {
  const { shop, payload } = await authenticate.webhook(request);

  console.log("📬 GDPR Shop Redact received for shop:", shop);

  try {
    const shopDomain = (payload as any).shop_domain || shop;

    await prisma.event.create({
      data: {
        type: "GDPR_SHOP_REDACT",
        title: `Shop redaction: ${shopDomain}`,
        description: `All shop data must be deleted for: ${shopDomain}`,
        metadata: JSON.stringify(payload),
      },
    });

    const shopRecord = await prisma.shop.findFirst({
      where: { shopifyDomain: shopDomain },
    });

    if (shopRecord) {
      console.log("🗑️ Deleting all data for shop:", shopDomain);

      await prisma.optimization.deleteMany({
        where: { product: { shopId: shopRecord.id } },
      });
      await prisma.scan.deleteMany({
        where: { product: { shopId: shopRecord.id } },
      });
      await prisma.product.deleteMany({
        where: { shopId: shopRecord.id },
      });
      await prisma.alert.deleteMany({
        where: { shopId: shopRecord.id },
      });
      await prisma.shop.delete({
        where: { id: shopRecord.id },
      });

      console.log("✅ Shop data deleted");
    }

    return new Response("OK", { status: 200 });
  } catch (error) {
    console.error("❌ Error:", error);
    return new Response("Error", { status: 500 });
  }
};
