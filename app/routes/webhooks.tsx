import type { ActionFunctionArgs } from "react-router";
import { authenticate } from "~/shopify.server";
import { prisma } from "~/db.server";

export const action = async ({ request }: ActionFunctionArgs) => {
  try {
    // Clone request pour éviter "body already consumed"
    const clonedRequest = request.clone();
    
    // Utiliser authenticate.webhook() pour validation HMAC officielle
    const { topic, shop, payload } = await authenticate.webhook(clonedRequest);
    
    console.log(`✅ Webhook validated: ${topic} from ${shop}`);
    
    // Traiter selon le topic
    switch (topic) {
      case "customers/data_request":
        console.log("[GDPR] Customer data request:", payload.customer?.email);
        // TODO: Récupérer les données du client depuis la base
        // TODO: Envoyer les données au merchant par email
        // Exemple :
        // const customerData = await prisma.scan.findMany({
        //   where: { 
        //     Shop: { shopifyDomain: shop },
        //     // Filter by customer email/id
        //   }
        // });
        // await sendEmailToMerchant(shop, customerData);
        break;
        
      case "customers/redact":
        console.log("[GDPR] Customer redact - ID:", payload.customer?.id);
        // Supprimer toutes les données liées à ce client
        try {
          await prisma.scan.deleteMany({
            where: { 
              Shop: { shopifyDomain: shop }
              // TODO: Ajouter un filtre par customer_id si tu stockes cette info
            }
          });
          console.log("✅ Customer data deleted");
        } catch (dbError) {
          console.error("❌ Error deleting customer data:", dbError);
        }
        break;
        
      case "shop/redact":
        console.log("[GDPR] Shop redact:", payload.shop_domain);
        // Supprimer TOUTES les données du shop (48h après uninstall)
        try {
          const deletedShop = await prisma.shop.delete({
            where: { shopifyDomain: shop }
          });
          console.log("✅ Shop data deleted:", deletedShop.id);
        } catch (dbError) {
          console.error("❌ Error deleting shop:", dbError);
          // Ne pas fail si le shop n'existe plus
        }
        break;
        
      case "app/uninstalled":
        console.log("[APP] App uninstalled from:", shop);
        // Optionnel : Marquer le shop comme inactif
        try {
          await prisma.shop.update({
            where: { shopifyDomain: shop },
            data: { 
              // Tu pourrais ajouter un champ "isActive: false"
            }
          });
        } catch (dbError) {
          console.error("❌ Error updating shop on uninstall:", dbError);
        }
        break;
        
      default:
        console.log(`⚠️ Unknown webhook topic: ${topic}`);
    }
    
    // Toujours retourner 200 pour confirmer réception
    return new Response(JSON.stringify({ received: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" }
    });
    
  } catch (error) {
    console.error("❌ Webhook error:", error);
    console.error("❌ Error details:", error.message);
    
    // Si erreur HMAC → 401
    if (error.message?.includes("HMAC") || error.message?.includes("Unauthorized")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json" }
      });
    }
    
    // Autres erreurs → 200 quand même (pour ne pas bloquer Shopify)
    return new Response(JSON.stringify({ 
      received: true,
      error: "Internal processing error" 
    }), {
      status: 200,
      headers: { "Content-Type": "application/json" }
    });
  }
};