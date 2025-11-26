import type { LoaderFunctionArgs } from "react-router";
import { json } from "~/utils/response";
import { authenticate } from "~/shopify.server";
import { prisma } from "~/db.server";

const BILLING_PLANS = {
  TRIAL: { id: "TRIAL", credits: 25 },
  STARTER_MONTHLY: { id: "STARTER_MONTHLY", credits: 100 },
  GROWTH_MONTHLY: { id: "GROWTH_MONTHLY", credits: 300 },
  PRO_MONTHLY: { id: "PRO_MONTHLY", credits: 1000 },
};

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  
  const url = new URL(request.url);
  const planId = url.searchParams.get("plan");

  if (!planId) {
    return json({ 
      error: "Missing plan parameter",
      usage: "Visit /app/test-upgrade?plan=GROWTH_MONTHLY to test upgrade",
      availablePlans: Object.keys(BILLING_PLANS)
    });
  }

  const plan = BILLING_PLANS[planId as keyof typeof BILLING_PLANS];

  if (!plan) {
    return json({ 
      error: "Invalid plan", 
      availablePlans: Object.keys(BILLING_PLANS) 
    });
  }

  const shop = await prisma.shop.findFirst({
    where: { shopifyDomain: session.shop }
  });

  if (!shop) {
    return json({ error: "Shop not found" }, { status: 404 });
  }

  console.log("[TEST UPGRADE] Before:", {
    plan: shop.plan,
    credits: shop.credits,
    maxCredits: shop.maxCredits
  });

  await prisma.shop.update({
    where: { id: shop.id },
    data: {
      plan: planId,
      credits: plan.credits,
      maxCredits: plan.credits,
    }
  });

  console.log("[TEST UPGRADE] After:", {
    plan: planId,
    credits: plan.credits,
    maxCredits: plan.credits
  });

  return json({
    success: true,
    message: `Shop upgraded to ${planId}`,
    before: {
      plan: shop.plan,
      credits: shop.credits,
      maxCredits: shop.maxCredits
    },
    after: {
      plan: planId,
      credits: plan.credits,
      maxCredits: plan.credits
    },
    nextStep: "Go to /app/pricing to see the changes"
  });
};

export default function TestUpgrade() {
  return (
    <div style={{ padding: "40px", fontFamily: "monospace" }}>
      <h1>⚙️ Test Upgrade Endpoint</h1>
      <p>This route is for testing plan upgrades without Shopify billing.</p>
      <h2>Usage:</h2>
      <ul>
        <li><a href="/app/test-upgrade?plan=TRIAL">/app/test-upgrade?plan=TRIAL</a></li>
        <li><a href="/app/test-upgrade?plan=STARTER_MONTHLY">/app/test-upgrade?plan=STARTER_MONTHLY</a></li>
        <li><a href="/app/test-upgrade?plan=GROWTH_MONTHLY">/app/test-upgrade?plan=GROWTH_MONTHLY</a></li>
        <li><a href="/app/test-upgrade?plan=PRO_MONTHLY">/app/test-upgrade?plan=PRO_MONTHLY</a></li>
      </ul>
    </div>
  );
}
