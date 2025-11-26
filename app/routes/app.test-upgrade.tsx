import type { LoaderFunctionArgs } from "react-router";
import { json } from "~/utils/response";
import { authenticate } from "~/shopify.server";
import { prisma } from "~/db.server";

const BILLING_PLANS = {
  TRIAL: { id: "TRIAL", prismaEnum: "TRIAL", credits: 25, interval: "MONTHLY" },
  STARTER_MONTHLY: { id: "STARTER_MONTHLY", prismaEnum: "STARTER", credits: 100, interval: "MONTHLY" },
  STARTER_ANNUAL: { id: "STARTER_ANNUAL", prismaEnum: "STARTER", credits: 100, interval: "ANNUAL" },
  GROWTH_MONTHLY: { id: "GROWTH_MONTHLY", prismaEnum: "GROWTH", credits: 300, interval: "MONTHLY" },
  GROWTH_ANNUAL: { id: "GROWTH_ANNUAL", prismaEnum: "GROWTH", credits: 300, interval: "ANNUAL" },
  PRO_MONTHLY: { id: "PRO_MONTHLY", prismaEnum: "PRO", credits: 1000, interval: "MONTHLY" },
  PRO_ANNUAL: { id: "PRO_ANNUAL", prismaEnum: "PRO", credits: 1000, interval: "ANNUAL" },
} as const;

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
    billingInterval: shop.billingInterval,
    credits: shop.credits,
    maxCredits: shop.maxCredits
  });

  await prisma.shop.update({
    where: { id: shop.id },
    data: {
      plan: plan.prismaEnum as any,
      billingInterval: plan.interval,
      credits: plan.credits,
      maxCredits: plan.credits,
    }
  });

  console.log("[TEST UPGRADE] After:", {
    plan: plan.prismaEnum,
    billingInterval: plan.interval,
    credits: plan.credits,
    maxCredits: plan.credits
  });

  return json({
    success: true,
    message: `Shop upgraded to ${planId} (Prisma: ${plan.prismaEnum}, Interval: ${plan.interval})`,
    before: {
      plan: shop.plan,
      billingInterval: shop.billingInterval,
      credits: shop.credits,
      maxCredits: shop.maxCredits
    },
    after: {
      plan: plan.prismaEnum,
      billingInterval: plan.interval,
      credits: plan.credits,
      maxCredits: plan.credits
    },
    nextStep: "Go to /app/pricing to see the changes"
  });
};

export default function TestUpgrade() {
  return (
    <div style={{ padding: "40px", fontFamily: "monospace", background: "#f5f5f5", minHeight: "100vh" }}>
      <div style={{ maxWidth: "800px", margin: "0 auto", background: "white", padding: "40px", borderRadius: "8px", boxShadow: "0 2px 8px rgba(0,0,0,0.1)" }}>
        <h1 style={{ marginTop: 0 }}>⚙️ Test Upgrade Endpoint</h1>
        <p style={{ color: "#666" }}>This route is for testing plan upgrades without Shopify billing.</p>
        
        <div style={{ background: "#fff3cd", padding: "16px", borderRadius: "8px", marginBottom: "24px", border: "1px solid #ffc107" }}>
          <strong>⚠️ Note:</strong> This maps plan IDs to Prisma enum values + billing interval:
          <ul style={{ marginBottom: 0, marginTop: "8px" }}>
            <li>STARTER_MONTHLY → STARTER + MONTHLY</li>
            <li>STARTER_ANNUAL → STARTER + ANNUAL</li>
            <li>GROWTH_MONTHLY → GROWTH + MONTHLY</li>
            <li>GROWTH_ANNUAL → GROWTH + ANNUAL</li>
            <li>PRO_MONTHLY → PRO + MONTHLY</li>
            <li>PRO_ANNUAL → PRO + ANNUAL</li>
          </ul>
        </div>

        <h2>Available Plans:</h2>
        
        <h3 style={{ marginTop: "24px", color: "#666", fontSize: "14px", textTransform: "uppercase" }}>Monthly Plans:</h3>
        <ul style={{ listStyle: "none", padding: 0 }}>
          <li style={{ marginBottom: "12px" }}>
            <a href="/app/test-upgrade?plan=TRIAL" style={{ display: "inline-block", padding: "12px 20px", background: "#9e9e9e", color: "white", textDecoration: "none", borderRadius: "6px", fontWeight: "600" }}>
              TRIAL (25 credits)
            </a>
          </li>
          <li style={{ marginBottom: "12px" }}>
            <a href="/app/test-upgrade?plan=STARTER_MONTHLY" style={{ display: "inline-block", padding: "12px 20px", background: "#2196f3", color: "white", textDecoration: "none", borderRadius: "6px", fontWeight: "600" }}>
              STARTER_MONTHLY (100 credits)
            </a>
          </li>
          <li style={{ marginBottom: "12px" }}>
            <a href="/app/test-upgrade?plan=GROWTH_MONTHLY" style={{ display: "inline-block", padding: "12px 20px", background: "#ff9800", color: "white", textDecoration: "none", borderRadius: "6px", fontWeight: "600" }}>
              GROWTH_MONTHLY (300 credits)
            </a>
          </li>
          <li style={{ marginBottom: "12px" }}>
            <a href="/app/test-upgrade?plan=PRO_MONTHLY" style={{ display: "inline-block", padding: "12px 20px", background: "#9c27b0", color: "white", textDecoration: "none", borderRadius: "6px", fontWeight: "600" }}>
              PRO_MONTHLY (1000 credits)
            </a>
          </li>
        </ul>

        <h3 style={{ marginTop: "32px", color: "#666", fontSize: "14px", textTransform: "uppercase" }}>Annual Plans (17% savings):</h3>
        <ul style={{ listStyle: "none", padding: 0 }}>
          <li style={{ marginBottom: "12px" }}>
            <a href="/app/test-upgrade?plan=STARTER_ANNUAL" style={{ display: "inline-block", padding: "12px 20px", background: "#1976d2", color: "white", textDecoration: "none", borderRadius: "6px", fontWeight: "600" }}>
              STARTER_ANNUAL (100 credits)
            </a>
          </li>
          <li style={{ marginBottom: "12px" }}>
            <a href="/app/test-upgrade?plan=GROWTH_ANNUAL" style={{ display: "inline-block", padding: "12px 20px", background: "#f57c00", color: "white", textDecoration: "none", borderRadius: "6px", fontWeight: "600" }}>
              GROWTH_ANNUAL (300 credits)
            </a>
          </li>
          <li style={{ marginBottom: "12px" }}>
            <a href="/app/test-upgrade?plan=PRO_ANNUAL" style={{ display: "inline-block", padding: "12px 20px", background: "#7b1fa2", color: "white", textDecoration: "none", borderRadius: "6px", fontWeight: "600" }}>
              PRO_ANNUAL (1000 credits)
            </a>
          </li>
        </ul>

        <div style={{ marginTop: "32px", padding: "16px", background: "#e3f2fd", borderRadius: "8px", border: "1px solid #2196f3" }}>
          <strong>📋 After clicking a plan:</strong>
          <ol style={{ marginBottom: 0, marginTop: "8px" }}>
            <li>You'll see a JSON response with before/after values</li>
            <li>Go to <a href="/app/pricing">/app/pricing</a> to verify the changes</li>
            <li>Toggle Monthly/Annual billing to test detection</li>
            <li>Verify the purple banner shows correct plan name</li>
            <li>Verify correct card shows "Current Plan"</li>
          </ol>
        </div>
      </div>
    </div>
  );
}
