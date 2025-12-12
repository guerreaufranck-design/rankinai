import type { LoaderFunctionArgs } from "react-router";
import { redirect } from "~/utils/response";
import { authenticate } from "~/shopify.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  await authenticate.admin(request);
  
  const appHandle = "rankinai";
  
  return redirect("shopify://admin/charges/" + appHandle + "/pricing_plans");
};

export default function Upgrade() {
  return (
    <div style={{ 
      padding: "60px 40px", 
      textAlign: "center",
      fontFamily: "-apple-system, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif"
    }}>
      <p style={{ fontSize: "16px", color: "#6d7175" }}>
        Redirecting to pricing plans...
      </p>
    </div>
  );
}
