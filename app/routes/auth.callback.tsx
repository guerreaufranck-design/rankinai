import type { LoaderFunctionArgs } from "@remix-run/node";
import { authenticate } from "~/shopify.server";
import { prisma } from "~/db.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session, redirect } = await authenticate.admin(request);
  
  // Vérifier si le Shop existe déjà
  let shop = await prisma.shop.findUnique({
    where: { shopifyDomain: session.shop }
  });
  
  // Si le Shop n'existe pas, le créer
  if (!shop) {
    shop = await prisma.shop.create({
      data: {
        id: `shop_${Date.now()}`,
        shopifyDomain: session.shop,
        shopName: session.shop.replace('.myshopify.com', ''),
        accessToken: session.accessToken,
        plan: 'TRIAL',
        credits: 25,
        maxCredits: 25,
        isInstalled: true,
        billingStatus: 'INACTIVE',
        createdAt: new Date(),
        updatedAt: new Date()
      }
    });
    
    console.log('✅ Shop créé automatiquement:', shop.shopName);
    
    // Créer un event d'installation
    await prisma.event.create({
      data: {
        id: `event_${Date.now()}`,
        shopId: shop.id,
        type: 'SHOP_INSTALLED',
        data: { shop: shop.shopifyDomain },
        createdAt: new Date()
      }
    });
  } else {
    // Shop existe déjà, vérifier s'il faut le réactiver
    if (!shop.isInstalled) {
      await prisma.shop.update({
        where: { id: shop.id },
        data: { 
          isInstalled: true,
          accessToken: session.accessToken,
          updatedAt: new Date()
        }
      });
      console.log('✅ Shop réactivé:', shop.shopName);
    }
  }
  
  return redirect;
};
