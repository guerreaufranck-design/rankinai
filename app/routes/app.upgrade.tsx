import { useEffect } from "react";
import { useLoaderData } from "react-router";
import type { LoaderFunctionArgs } from "react-router";
import { json } from "~/utils/response";
import { authenticate } from "~/shopify.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  
  // Extraire le store handle (sans .myshopify.com)
  const storeHandle = session.shop.replace('.myshopify.com', '');
  
  // App handle depuis shopify.app.toml
  const appHandle = "rankinai";
  
  // URL correcte vers la page de pricing Shopify (Managed Pricing)
  const pricingUrl = `https://admin.shopify.com/store/${storeHandle}/charges/${appHandle}/pricing_plans`;
  
  return json({ pricingUrl });
};

export default function Upgrade() {
  const { pricingUrl } = useLoaderData<typeof loader>();
  
  useEffect(() => {
    // Rediriger la fenêtre parent (important pour apps embedded)
    if (window.top) {
      window.top.location.href = pricingUrl;
    } else {
      window.location.href = pricingUrl;
    }
  }, [pricingUrl]);
  
  return (
    <div style={{ 
      padding: "60px 40px", 
      textAlign: "center",
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
    }}>
      <div style={{
        width: "48px",
        height: "48px",
        margin: "0 auto 20px",
        border: "3px solid #e0e0e0",
        borderTopColor: "#667eea",
        borderRadius: "50%",
        animation: "spin 1s linear infinite"
      }} />
      <p style={{ fontSize: "16px", color: "#6d7175" }}>
        Redirecting to pricing plans...
      </p>
      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
