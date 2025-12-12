import type { HeadersFunction, LoaderFunctionArgs } from "react-router";
import { Outlet, useLoaderData, useRouteError } from "react-router";
import { boundary } from "@shopify/shopify-app-react-router/server";
import { AppProvider } from "@shopify/shopify-app-react-router/react";
import { authenticate } from "../shopify.server";
import { prisma } from "../db.server";

// Mapping des plans par HANDLE exact (depuis Partner Dashboard)
const PLAN_BY_HANDLE: Record<string, { plan: string; credits: number }> = {
  "free-plan": { plan: "TRIAL", credits: 25 },
  "starter": { plan: "STARTER", credits: 100 },
  "growth": { plan: "GROWTH", credits: 300 },
  "pro": { plan: "PRO", credits: 1000 },
};

// Fallback: mapping par nom (si handle non trouvé)
function getPlanFromName(planName: string): { plan: string; credits: number } {
  const name = planName.toLowerCase();
  if (name.includes("pro")) return { plan: "PRO", credits: 1000 };
  if (name.includes("growth")) return { plan: "GROWTH", credits: 300 };
  if (name.includes("starter")) return { plan: "STARTER", credits: 100 };
  return { plan: "TRIAL", credits: 25 };
}

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const url = new URL(request.url);
  
  // SKIP authentication pour webhooks
  if (url.pathname.startsWith("/webhooks")) {
    return { apiKey: process.env.SHOPIFY_API_KEY || "", credits: 0, maxCredits: 25 };
  }

  try {
    const { admin, session } = await authenticate.admin(request);
    
    // 1. Query Shopify pour le plan ACTUEL (avec handle)
    let activeSubscriptions: any[] = [];
    
    try {
      const response = await admin.graphql(
        `query {
          currentAppInstallation {
            activeSubscriptions {
              name
              status
            }
          }
        }`
      );
      
      const result = await response.json();
      
      if (result.errors) {
        console.error("[APP.TSX] GraphQL errors:", result.errors);
      } else {
        activeSubscriptions = result.data?.currentAppInstallation?.activeSubscriptions || [];
      }
    } catch (graphqlError) {
      console.error("[APP.TSX] GraphQL query failed:", graphqlError);
    }
    
    console.log("[APP.TSX] Active subscriptions:", JSON.stringify(activeSubscriptions));
    
    // 2. Charger ou créer le shop
    let shop = await prisma.shop.findUnique({
      where: { shopifyDomain: session.shop },
    });

    if (!shop) {
      shop = await prisma.shop.create({
        data: {
          shopifyDomain: session.shop,
          shopName: session.shop.replace('.myshopify.com', ''),
          accessToken: session.accessToken,
          plan: "TRIAL",
          credits: 25,
          maxCredits: 25,
        },
      });
      console.log("[APP.TSX] Shop créé:", shop.shopName);
    }

    // 3. Déterminer le plan
    let mappedPlan = { plan: "TRIAL", credits: 25 };
    
    if (activeSubscriptions.length > 0) {
      const activePlan = activeSubscriptions[0];
      const planHandle = activePlan.plan?.handle || "";
      const planName = activePlan.name || "";
      
      // Chercher par handle d'abord, puis par nom en fallback
      if (planHandle && PLAN_BY_HANDLE[planHandle]) {
        mappedPlan = PLAN_BY_HANDLE[planHandle];
        console.log("[APP.TSX] Matched by handle:", planHandle);
      } else {
        mappedPlan = getPlanFromName(planName);
        console.log("[APP.TSX] Matched by name:", planName);
      }
      
      console.log("[APP.TSX] Plan mapping:", { 
        shopifyPlanName: planName,
        shopifyPlanHandle: planHandle,
        mappedTo: mappedPlan 
      });
    } else {
      console.log("[APP.TSX] No active subscription - using TRIAL");
    }
    
    // 4. Mettre à jour si nécessaire
    if (shop.plan !== mappedPlan.plan) {
      console.log("[APP.TSX] Syncing plan:", { 
        from: { plan: shop.plan, credits: shop.credits },
        to: mappedPlan
      });
      
      shop = await prisma.shop.update({
        where: { shopifyDomain: session.shop },
        data: {
          plan: mappedPlan.plan as any,
          credits: mappedPlan.credits,
          maxCredits: mappedPlan.credits,
        },
      });
      
      console.log("[APP.TSX] Plan synchronized!");
    }

    return { 
      apiKey: process.env.SHOPIFY_API_KEY || "",
      credits: shop.credits ?? 0,
      maxCredits: shop.maxCredits ?? 25
    };
  } catch (error) {
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
