import "@shopify/shopify-app-react-router/adapters/node";
import {
  ApiVersion,
  AppDistribution,
  shopifyApp,
} from "@shopify/shopify-app-react-router/server";
import { PrismaSessionStorage } from "@shopify/shopify-app-session-storage-prisma";
import { prisma } from "./db.server";

const shopify = shopifyApp({
  apiKey: process.env.SHOPIFY_API_KEY,
  apiSecretKey: process.env.SHOPIFY_API_SECRET || "",
  apiVersion: ApiVersion.October25,
  scopes: process.env.SCOPES?.split(","),
  appUrl: process.env.SHOPIFY_APP_URL || "",
  authPathPrefix: "/auth",
  sessionStorage: new PrismaSessionStorage(prisma),
  distribution: AppDistribution.AppStore,
  
  // AJOUT DU AFTERAUTH CALLBACK SELON LA DOC 2025
  afterAuth: async (request, session, admin) => {
    const shop = session.shop;
    
    // Vérifier si le Shop existe déjà
    const existingShop = await prisma.shop.findUnique({
      where: { shopifyDomain: shop },
    });
    
    if (!existingShop) {
      // Créer le Shop s'il n'existe pas
      await prisma.shop.create({
        data: {
          id: `shop_${Date.now()}`,
          shopifyDomain: shop,
          shopName: shop.replace('.myshopify.com', ''),
          accessToken: session.accessToken,
          scope: session.scope || "read_products,write_products",
          plan: "TRIAL",
          credits: 25,
          maxCredits: 25,
          isInstalled: true,
          billingStatus: "INACTIVE",
          createdAt: new Date(),
          updatedAt: new Date()
        },
      });
      console.log(`✅ Shop créé automatiquement via afterAuth: ${shop}`);
    }
    
    return true; // Retourner true pour continuer l'authentification
  },
  
  ...(process.env.SHOP_CUSTOM_DOMAIN
    ? { customShopDomains: [process.env.SHOP_CUSTOM_DOMAIN] }
    : {}),
});

export default shopify;
export const apiVersion = ApiVersion.October25;
export const addDocumentResponseHeaders = shopify.addDocumentResponseHeaders;
export const authenticate = shopify.authenticate;
export const unauthenticated = shopify.unauthenticated;
export const login = shopify.login;
export const registerWebhooks = shopify.registerWebhooks;
export const sessionStorage = shopify.sessionStorage;
