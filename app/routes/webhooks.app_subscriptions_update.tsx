import type { ActionFunctionArgs } from "react-router";
import { authenticate } from "~/shopify.server";
import { prisma } from "~/db.server";

export const action = async ({ request }: ActionFunctionArgs) => {
  const { shop, payload } = await authenticate.webhook(request);

  console.log("📬 Subscription update received for shop:", shop);
  console.log("Payload:", JSON.stringify(payload, null, 2));

  try {
    const subscription = payload as any;
    
    const dbShop = await prisma.shop.findFirst({
      where: { shopifyDomain: shop }
    });

    if (!dbShop) {
      console.log("⚠️ Shop not found:", shop);
      return new Response("Shop not found", { status: 404 });
    }

    // Log l'événement pour traçabilité
    await prisma.event.create({
      data: {
        type: "SUBSCRIPTION_UPDATE",
        title: `Subscription updated: ${subscription.status}`,
        description: `Subscription status changed to ${subscription.status} for shop: ${shop}`,
        metadata: JSON.stringify(payload),
      },
    });

    // Gérer les différents statuts
    const status = subscription.status?.toUpperCase();

    if (status === "CANCELLED" || status === "FROZEN" || status === "EXPIRED") {
      // Abonnement annulé/gelé → Reset à Trial
      await prisma.shop.update({
        where: { id: dbShop.id },
        data: {
          plan: "TRIAL",
          credits: 25,
          maxCredits: 25,
          billingId: null,
        }
      });
      console.log(`✅ Shop reset to TRIAL (status: ${status})`);
      
    } else if (status === "ACTIVE") {
      // Abonnement actif → Synchroniser les infos si nécessaire
      const updateData: any = {};
      
      if (subscription.id && subscription.id !== dbShop.billingId) {
        updateData.billingId = subscription.id;
      }

      // Mettre à jour si des changements détectés
      if (Object.keys(updateData).length > 0) {
        await prisma.shop.update({
          where: { id: dbShop.id },
          data: updateData
        });
        console.log(`✅ Shop subscription synced (status: ${status})`);
      } else {
        console.log(`✅ Subscription confirmed active (no changes needed)`);
      }
    } else {
      console.log(`ℹ️ Subscription status: ${status} - no action taken`);
    }

    return new Response("OK", { status: 200 });
    
  } catch (error) {
    console.error("❌ Error processing subscription update:", error);
    
    // Log l'erreur dans la base de données
    try {
      await prisma.event.create({
        data: {
          type: "SUBSCRIPTION_UPDATE_ERROR",
          title: `Subscription update failed for ${shop}`,
          description: error instanceof Error ? error.message : "Unknown error",
          metadata: JSON.stringify({ shop, error: String(error) }),
        },
      });
    } catch (logError) {
      console.error("Failed to log error:", logError);
    }
    
    return new Response("Error", { status: 500 });
  }
};