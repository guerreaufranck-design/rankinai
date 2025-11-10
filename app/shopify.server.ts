import "@shopify/shopify-app-react-router/adapters/node";
import {
  ApiVersion,
  AppDistribution,
  shopifyApp,
} from "@shopify/shopify-app-react-router/server";
import { PrismaSessionStorage } from "@shopify/shopify-app-session-storage-prisma";
import { MemorySessionStorage } from "@shopify/shopify-app-session-storage-memory";
import { prisma } from "./db.server";

// ✅ Utiliser MemorySessionStorage pour éviter timeout Prisma sur webhooks
const sessionStorage = process.env.NODE_ENV === "production" 
  ? new MemorySessionStorage()
  : new PrismaSessionStorage(prisma);

const shopify = shopifyApp({
  apiKey: process.env.SHOPIFY_API_KEY,
  apiSecretKey: process.env.SHOPIFY_API_SECRET || "",
  apiVersion: ApiVersion.October25,
  scopes: process.env.SCOPES?.split(","),
  appUrl: process.env.SHOPIFY_APP_URL || "",
  authPathPrefix: "/auth",
  sessionStorage: sessionStorage,
  distribution: AppDistribution.AppStore,
  
  afterAuth: async (request, session, admin) => {
    const shop = session.shop;
    
    const existingShop = await prisma.shop.findUnique({
      where: { shopifyDomain: shop },
    });
    
    if (!existingShop) {
      await prisma.shop.create({
        data: {
          id: `shop_${Date.now()}`,
          shopifyDomain: shop,
          shopName: shop.replace('.myshopify.com', ''),
          accessToken: session.accessToken,
          plan: "TRIAL",
          credits: 25,
          maxCredits: 25,
        },
      });
    }
  },
  
  webhooks: {},
  hooks: {},
  future: {},
});

export default shopify;
export const authenticate = shopify.authenticate;
export const addDocumentResponseHeaders = shopify.addDocumentResponseHeaders;
export const MONTHLY_PLAN = "Basic Monthly";
export const ANNUAL_PLAN = "Basic Annual";
