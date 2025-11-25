import "@shopify/shopify-app-react-router/adapters/node";
import {
  ApiVersion,
  AppDistribution,
  shopifyApp,
} from "@shopify/shopify-app-react-router/server";
import { PrismaSessionStorage } from "@shopify/shopify-app-session-storage-prisma";
import { prisma } from "./db.server";

const storage = new PrismaSessionStorage(prisma);

const shopify = shopifyApp({
  apiKey: process.env.SHOPIFY_API_KEY,
  apiSecretKey: process.env.SHOPIFY_API_SECRET || "",
  apiVersion: ApiVersion.October25,
  scopes: process.env.SCOPES?.split(","),
  appUrl: process.env.SHOPIFY_APP_URL || "",
  authPathPrefix: "/auth",
  sessionStorage: storage,
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
          scope: session.scope || "read_products,write_products",
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
export const login = shopify.login;
export const addDocumentResponseHeaders = shopify.addDocumentResponseHeaders;
export const MONTHLY_PLAN = "Basic Monthly";
export const ANNUAL_PLAN = "Basic Annual";
