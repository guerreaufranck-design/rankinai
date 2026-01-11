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
  return { plan: "LITE", credits: 30 }; // Default au plan le moins cher
}

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const url = new URL(request.url);
  
  // SKIP authentication pour webhooks
  if (url.pathname.startsWith("/webhooks")) {
    return { apiKey: process.env.SHOPIFY_API_KEY || "", credits: 0, maxCredits: 30 };
  }

  try {
    const { billing, session } = await authenticate.admin(request);
    
    const storeHandle = session.shop.replace('.myshopify.com', '');
    const pricingUrl = `https://admin.shopify.com/store/${storeHandle}/charges/${APP_HANDLE}/pricing_plans`;
    
    // 1. Vérifier si subscription active via billing.check()
    let hasActivePayment = false;
    let appSubscriptions: any[] = [];
    
    try {
      const billingCheck = await billing.check({
        plans: ["Lite", "Starter", "Growth", "Pro"],
        isTest: true,
      });
      hasActivePayment = billingCheck.hasActivePayment;
      appSubscriptions = billingCheck.appSubscriptions || [];
      
      console.log("[APP.TSX] billing.check():", { hasActivePayment, plans: appSubscriptions.map((s: any) => s.name) });
    } catch (billingError) {
      if (billingError instanceof Response) {
        throw billingError;
      }
      console.error("[APP.TSX] billing.check() failed:", billingError);
    }
    
    // 2. Si PAS de subscription → REDIRECT via exit-iframe
    if (!hasActivePayment) {
      console.log("[APP.TSX] No active payment - redirecting via exit-iframe to:", pricingUrl);
      const exitIframeUrl = `/auth/exit-iframe?exitIframe=${encodeURIComponent(pricingUrl)}`;
      throw redirect(exitIframeUrl);
    }
    
    // 3. Déterminer le plan depuis Shopify (source de vérité)
    const activePlanName = appSubscriptions[0]?.name || "Lite";
    const mappedPlan = getPlanFromName(activePlanName);
    
    console.log("[APP.TSX] Active plan:", { shopifyName: activePlanName, mapped: mappedPlan });
    
    // 4. Charger ou créer le shop
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
      // Sync plan si différent
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
