import type { HeadersFunction, LoaderFunctionArgs } from "react-router";
import { Outlet, useLoaderData, useRouteError } from "react-router";
import { boundary } from "@shopify/shopify-app-react-router/server";
import { AppProvider } from "@shopify/shopify-app-react-router/react";
import { authenticate } from "../shopify.server";
import { prisma } from "../db.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const url = new URL(request.url);
  
  // ✅ SKIP authentication pour TOUS les webhooks
  if (url.pathname.startsWith("/webhooks")) {
    return { apiKey: process.env.SHOPIFY_API_KEY || "", credits: 0, maxCredits: 25 };
  }

  const { session } = await authenticate.admin(request);
  
  // Charger le shop pour obtenir les crédits
  let shop = await prisma.shop.findUnique({
    where: { shopifyDomain: session.shop },
  });

  // Créer le shop s'il n'existe pas
  if (!shop) {
    shop = await prisma.shop.create({
      data: {
        shopifyDomain: session.shop,
        shopName: session.shop.replace('.myshopify.com', ''),
        accessToken: session.accessToken,
      },
    });
  }

  return { 
    apiKey: process.env.SHOPIFY_API_KEY || "",
    credits: shop.credits ?? 0,
    maxCredits: shop.maxCredits ?? 25
  };
};

export const shouldRevalidate = () => false;

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
  
  console.error("❌ ErrorBoundary triggered:", error);
  
  return (
    <div style={{ padding: "20px", fontFamily: "sans-serif" }}>
      <h2>⚠️ Une erreur est survenue</h2>
      <p>L'application a rencontré un problème temporaire.</p>
      <details style={{ marginTop: "10px" }}>
        <summary>Détails techniques</summary>
        <pre style={{ background: "#f0f0f0", padding: "10px", marginTop: "10px", overflow: "auto" }}>
          {error instanceof Error ? error.message : JSON.stringify(error, null, 2)}
        </pre>
      </details>
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
        Rafraîchir la page
      </button>
    </div>
  );
}

export const headers: HeadersFunction = (headersArgs) => {
  return boundary.headers(headersArgs);
};
