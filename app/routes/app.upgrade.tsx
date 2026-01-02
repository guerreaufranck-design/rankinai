import type { LoaderFunctionArgs } from "react-router";
import { useLoaderData } from "react-router";
import { useEffect } from "react";
import { authenticate } from "~/shopify.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  
  const storeHandle = session.shop.replace('.myshopify.com', '');
  const appHandle = "rankinai-ai-seo-9x7k";
  
  return { 
    pricingUrl: `https://admin.shopify.com/store/${storeHandle}/charges/${appHandle}/pricing_plans`
  };
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
    <div style={{ padding: "40px", textAlign: "center" }}>
      <p>Redirecting to pricing plans...</p>
    </div>
  );
}
