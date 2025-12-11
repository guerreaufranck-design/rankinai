import { useEffect } from "react";
import { useLoaderData } from "react-router";
import type { LoaderFunctionArgs } from "react-router";
import { json } from "~/utils/response";
import { authenticate } from "~/shopify.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  
  // URL vers la page de pricing Shopify (Managed Pricing)
  const pricingUrl = `https://${session.shop}/admin/charges/rankinai/pricing_plans`;
  
  return json({ pricingUrl });
};

export default function Upgrade() {
  const { pricingUrl } = useLoaderData<typeof loader>();
  
  useEffect(() => {
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
