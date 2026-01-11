import type { HeadersFunction, LoaderFunctionArgs } from "react-router";
import { Outlet, useLoaderData, useRouteError, redirect } from "react-router";
import { boundary } from "@shopify/shopify-app-react-router/server";
import { AppProvider } from "@shopify/shopify-app-react-router/react";
import { authenticate } from "../shopify.server";
import { prisma } from "../db.server";

const APP_HANDLE = "rankinai-ai-seo-9x7k";

// Mapping des plans par nom
function getPlanFromName(planName: string): { plan: string; credits: number } {
  const name = planName.toLowerCase();
  if (name.includes("pro")) return { plan: "PRO", credits: 1000 };
  if (name.includes("growth")) return { plan: "GROWTH", credits: 300 };
  if (name.includes("starter")) return { plan: "STARTER", credits: 100 };
  if (name.includes("lite") || name.includes("basic")) return { plan: "LITE", credits: 30 };
  return { plan: "LITE", credits: 30 };
}

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const url = new URL(request.url);
  
  // SKIP authentication pour webhooks
  if (url.pathname.startsWith("/webhooks")) {
    return { apiKey: process.env.SHOPIFY_API_KEY || "", credits: 0, maxCredits: 30 };
  }

  try {
    const { admin, session } = await authenticate.admin(request);
    
    const storeHandle = session.shop.replace('.myshopify.com', '');
    const pricingUrl = `https://admin.shopify.com/store/${storeHandle}/charges/${APP_HANDLE}/pricing_plans`;
    
    // Vérifier via GraphQL (plus fiable que billing.check avec Managed Pricing)
    let hasActivePayment = false;
    let appSubscriptions: any[] = [];
    
    try {
      const response = await admin.graphql(`
        query {
          currentAppInstallation {
            activeSubscriptions {
              name
              status
              test
            }
          }
        }
      `);
      const result = await response.json();
      appSubscriptions = result.data?.currentAppInstallation?.activeSubscriptions || [];
      hasActivePayment = appSubscriptions.length > 0;
      
      console.log("[APP.TSX] GraphQL activeSubscriptions:", JSON.stringify(appSubscriptions));
      console.log("[APP.TSX] hasActivePayment:", hasActivePayment);
    } catch (gqlError) {
      console.error("[APP.TSX] GraphQL error:", gqlError);
      if (gqlError instanceof Response) {
        throw gqlError;
      }
    }
    
    // Si PAS de subscription → REDIRECT via exit-iframe
    if (!hasActivePayment) {
      console.log("[APP.TSX] No active payment - redirecting via exit-iframe to:", pricingUrl);
      const exitIframeUrl = `/auth/exit-iframe?exitIframe=${encodeURIComponent(pricingUrl)}`;
      throw redirect(exitIframeUrl);
    }
    
    // Déterminer le plan depuis Shopify (source de vérité)
    const activePlanName = appSubscriptions[0]?.name || "Lite";
    const mappedPlan = getPlanFromName(activePlanName);
    
    console.log("[APP.TSX] Active plan:", { shopifyName: activePlanName, mapped: mappedPlan });
    
    // Charger ou créer le shop
    let shop = await prisma.shop.findUnique({
      where: { shopifyDomain: session.shop },
    });

    if (!shop) {
      shop = await prisma.shop.create({
        data: {
          shopifyDomain: session.shop,
          shopName: session.shop.replace('.myshopify.com', ''),
          accessToken: session.accessToken,
          plan: mappedPlan.plan,
          credits: mappedPlan.credits,
          maxCredits: mappedPlan.credits,
        },
      });
      console.log("[APP.TSX] Shop créé avec plan:", mappedPlan.plan);
    } else if (shop.plan !== mappedPlan.plan) {
      console.log("[APP.TSX] Syncing plan:", { from: shop.plan, to: mappedPlan.plan });
      
      shop = await prisma.shop.update({
        where: { shopifyDomain: session.shop },
        data: {
          plan: mappedPlan.plan as any,
          credits: mappedPlan.credits,
          maxCredits: mappedPlan.credits,
          accessToken: session.accessToken || shop.accessToken,
        },
      });
    }

    return { 
      apiKey: process.env.SHOPIFY_API_KEY || "",
      credits: shop.credits ?? 0,
      maxCredits: shop.maxCredits ?? 30
    };
  } catch (error) {
    if (error instanceof Response) {
      throw error;
    }
    console.error("[APP.TSX] Loader error:", error);
    throw error;
  }
};

export default function App() {
  const { apiKey, credits, maxCredits } = useLoaderData<typeof loader>();
  
  return (
    <AppProvider embedded apiKey={apiKey}>
      <Outlet context={{ credits, maxCredits }} />
    </AppProvider>
  );
}

export function ErrorBoundary() {
  const error = useRouteError();
  
  console.error("ErrorBoundary triggered:", error);
  
  return (
    <div style={{ padding: "20px", fontFamily: "sans-serif" }}>
      <h2>Une erreur est survenue</h2>
      <p>L application a rencontré un problème temporaire.</p>
      <button 
        onClick={() => window.location.reload()} 
        style={{ 
          marginTop: "20px", 
          padding: "10px 20px",
          background: "#008060",
          color: "white",
          border: "none",
          borderRadius: "4px",
          cursor: "pointer"
        }}
      >
        Rafraichir la page
      </button>
    </div>
  );
}

export const headers: HeadersFunction = (headersArgs) => {
  return boundary.headers(headersArgs);
};
