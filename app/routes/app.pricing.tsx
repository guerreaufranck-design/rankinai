import type { LoaderFunctionArgs, ActionFunctionArgs } from "react-router";
import { json, redirect } from "~/utils/response";
import { useLoaderData, useFetcher, useNavigate, useRevalidator } from "react-router";
import { authenticate, MONTHLY_PLAN, ANNUAL_PLAN } from "~/shopify.server";
import { prisma } from "~/db.server";
import { useState, useEffect } from "react";
import AppHeader from "~/components/AppHeader";

const BILLING_PLANS = {
  TRIAL: {
    id: "TRIAL",
    prismaEnum: "TRIAL",
    name: "Free Trial",
    price: 0,
    interval: "ONE_TIME",
    credits: 25,
    features: [
      "25 AI optimization credits",
      "ChatGPT & Gemini analysis", 
      "Basic citation reporting",
      "Product sync from Shopify",
      "Email support"
    ],
    limitations: [
      "Limited to 25 scans total",
      "No automated scanning",
      "No API access"
    ],
    color: "#9e9e9e",
    popular: false,
    cta: "Start Free Trial"
  },
  STARTER_MONTHLY: {
    id: "STARTER_MONTHLY",
    prismaEnum: "STARTER",
    name: "Starter",
    price: 29,
    interval: "EVERY_30_DAYS",
    credits: 100,
    features: [
      "100 AI optimization credits/month",
      "ChatGPT & Gemini analysis",
      "Advanced citation reporting",
      "Competitor tracking",
      "Custom store domains",
      "Priority email support",
      "CSV export"
    ],
    limitations: [
      "No automated scanning",
      "No API access"
    ],
    color: "#2196f3",
    popular: false,
    cta: "Start Starter Plan"
  },
  STARTER_ANNUAL: {
    id: "STARTER_ANNUAL",
    prismaEnum: "STARTER",
    name: "Starter",
    price: 290,
    interval: "ANNUAL",
    credits: 100,
    features: [
      "100 AI optimization credits/month",
      "ChatGPT & Gemini analysis",
      "Advanced citation reporting",
      "Competitor tracking",
      "Custom store domains",
      "Priority email support",
      "CSV export",
      "🎁 2 months free"
    ],
    limitations: [
      "No automated scanning",
      "No API access"
    ],
    color: "#2196f3",
    popular: false,
    cta: "Start Starter Plan",
    savings: 58
  },
  GROWTH_MONTHLY: {
    id: "GROWTH_MONTHLY",
    prismaEnum: "GROWTH",
    name: "Growth",
    price: 79,
    interval: "EVERY_30_DAYS",
    credits: 300,
    features: [
      "300 AI optimization credits/month",
      "Everything in Starter, plus:",
      "Automated daily scanning",
      "Bulk optimization",
      "API access (1000 calls/month)",
      "Advanced analytics dashboard",
      "Slack notifications",
      "Priority support with SLA",
      "White-label reports"
    ],
    limitations: [],
    color: "#ff9800",
    popular: true,
    badge: "MOST POPULAR",
    cta: "Start Growth Plan"
  },
  GROWTH_ANNUAL: {
    id: "GROWTH_ANNUAL",
    prismaEnum: "GROWTH",
    name: "Growth",
    price: 790,
    interval: "ANNUAL",
    credits: 300,
    features: [
      "300 AI optimization credits/month",
      "Everything in Starter, plus:",
      "Automated daily scanning",
      "Bulk optimization",
      "API access (1000 calls/month)",
      "Advanced analytics dashboard",
      "Slack notifications",
      "Priority support with SLA",
      "White-label reports",
      "🎁 2 months free"
    ],
    limitations: [],
    color: "#ff9800",
    popular: true,
    badge: "MOST POPULAR",
    cta: "Start Growth Plan",
    savings: 158
  },
  PRO_MONTHLY: {
    id: "PRO_MONTHLY",
    prismaEnum: "PRO",
    name: "Professional",
    price: 199,
    interval: "EVERY_30_DAYS",
    credits: 1000,
    features: [
      "1,000 AI optimization credits/month",
      "Everything in Growth, plus:",
      "Unlimited API access",
      "Custom AI training for your niche",
      "Dedicated account manager",
      "Custom integrations",
      "Phone support",
      "99.9% uptime SLA",
      "Advanced security features"
    ],
    limitations: [],
    color: "#9c27b0",
    popular: false,
    cta: "Start Pro Plan"
  },
  PRO_ANNUAL: {
    id: "PRO_ANNUAL",
    prismaEnum: "PRO",
    name: "Professional",
    price: 1990,
    interval: "ANNUAL",
    credits: 1000,
    features: [
      "1,000 AI optimization credits/month",
      "Everything in Growth, plus:",
      "Unlimited API access",
      "Custom AI training for your niche",
      "Dedicated account manager",
      "Custom integrations",
      "Phone support",
      "99.9% uptime SLA",
      "Advanced security features",
      "🎁 2 months free"
    ],
    limitations: [],
    color: "#9c27b0",
    popular: false,
    cta: "Start Pro Plan",
    savings: 398
  }
} as const;

const getPrismaPlan = (planId: string): "TRIAL" | "STARTER" | "GROWTH" | "PRO" => {
  if (planId === "TRIAL") return "TRIAL";
  if (planId.startsWith("STARTER")) return "STARTER";
  if (planId.startsWith("GROWTH")) return "GROWTH";
  if (planId.startsWith("PRO")) return "PRO";
  return "TRIAL";
};

const getDisplayPlanFromPrisma = (prismaEnum: string, billingPeriod: "monthly" | "annual"): string => {
  if (prismaEnum === "TRIAL") return "TRIAL";
  if (prismaEnum === "STARTER") return billingPeriod === "annual" ? "STARTER_ANNUAL" : "STARTER_MONTHLY";
  if (prismaEnum === "GROWTH") return billingPeriod === "annual" ? "GROWTH_ANNUAL" : "GROWTH_MONTHLY";
  if (prismaEnum === "PRO") return billingPeriod === "annual" ? "PRO_ANNUAL" : "PRO_MONTHLY";
  return "TRIAL";
};

const matchSubscriptionToPlan = (subscription: any): string | null => {
  if (!subscription?.lineItems?.[0]?.plan?.pricingDetails) return null;
  
  const pricing = subscription.lineItems[0].plan.pricingDetails;
  const amount = parseFloat(pricing.price?.amount || "0");
  const interval = pricing.interval;
  
  console.log("[PRICING] Matching subscription:", { amount, interval });
  
  for (const [planId, plan] of Object.entries(BILLING_PLANS)) {
    if (plan.price === amount) {
      if (interval === "EVERY_30_DAYS" && plan.interval === "EVERY_30_DAYS") {
        console.log("[PRICING] Matched plan:", planId);
        return planId;
      }
      if (interval === "ANNUAL" && plan.interval === "ANNUAL") {
        console.log("[PRICING] Matched plan:", planId);
        return planId;
      }
    }
  }
  
  return null;
};

// ✅ MUTATION UNIQUE pour TOUS les abonnements (mensuels ET annuels)
const CREATE_SUBSCRIPTION_MUTATION = `
  mutation CreateSubscription(
    $name: String!
    $lineItems: [AppSubscriptionLineItemInput!]!
    $returnUrl: URL!
    $test: Boolean
  ) {
    appSubscriptionCreate(
      name: $name
      lineItems: $lineItems
      returnUrl: $returnUrl
      test: $test
    ) {
      appSubscription {
        id
      }
      confirmationUrl
      userErrors {
        field
        message
      }
    }
  }
`;

// ❌ SUPPRIMÉ - Ne plus utiliser pour les plans annuels
// const CREATE_PURCHASE_MUTATION = `...`

const ACTIVE_SUBSCRIPTIONS_QUERY = `
  query GetActiveSubscriptions {
    currentAppInstallation {
      activeSubscriptions {
        id
        name
        status
        lineItems {
          id
          plan {
            pricingDetails {
              ... on AppRecurringPricing {
                price {
                  amount
                  currencyCode
                }
                interval
              }
            }
          }
        }
        createdAt
        currentPeriodEnd
      }
    }
  }
`;

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { admin, session } = await authenticate.admin(request);
  
  try {
    const shop = await prisma.shop.findFirst({
      where: { shopifyDomain: session.shop },
      select: {
        id: true,
        shopName: true,
        shopifyDomain: true,
        plan: true,
        billingInterval: true,
        credits: true,
        maxCredits: true,
      }
    });

    console.log("[PRICING LOADER] Current shop state:", {
      plan: shop?.plan,
      billingInterval: shop?.billingInterval,
      credits: shop?.credits,
      maxCredits: shop?.maxCredits
    });

    const response = await admin.graphql(ACTIVE_SUBSCRIPTIONS_QUERY);
    const data = await response.json();
    
    const activeSubscriptions = data.data?.currentAppInstallation?.activeSubscriptions || [];

    console.log("[PRICING LOADER] Active subscriptions:", activeSubscriptions.length);

    const url = new URL(request.url);
    const planIdFromUrl = url.searchParams.get("plan_id");
    
    if (shop && activeSubscriptions.length > 0) {
      console.log("═══════════════════════════════════════");
      console.log("[PRICING] 🔍 CHECKING ACTIVE SUBSCRIPTIONS");
      console.log("═══════════════════════════════════════");
      
      const latestSubscription = activeSubscriptions[0];
      const matchedPlanId = matchSubscriptionToPlan(latestSubscription);
      
      if (matchedPlanId) {
        const plan = BILLING_PLANS[matchedPlanId as keyof typeof BILLING_PLANS];
        const prismaEnum = getPrismaPlan(matchedPlanId);
        const billingInterval = plan.interval === "ANNUAL" ? "ANNUAL" : "MONTHLY";
        
        const needsUpdate = shop.plan !== prismaEnum || shop.billingInterval !== billingInterval;
        
        if (needsUpdate) {
          console.log("[PRICING] 💾 Syncing DB with active subscription:");
          console.log("  - Matched Plan:", matchedPlanId);
          console.log("  - Prisma Enum:", prismaEnum);
          console.log("  - Billing Interval:", billingInterval);
          console.log("  - Credits:", plan.credits);
          
          await prisma.shop.update({
            where: { id: shop.id },
            data: {
              plan: prismaEnum as any,
              billingInterval: billingInterval,
              credits: plan.credits,
              maxCredits: plan.credits,
            }
          });
          
          console.log("[PRICING] ✅ Shop synced with active subscription");
          console.log("═══════════════════════════════════════");
          
          if (planIdFromUrl) {
            return redirect("/app/pricing?success=true");
          }
        } else {
          console.log("[PRICING] ℹ️  Shop already synced with subscription");
        }
      }
    }

    return json({
      shop: shop || {
        plan: "TRIAL",
        billingInterval: "MONTHLY",
        credits: BILLING_PLANS.TRIAL.credits,
        maxCredits: BILLING_PLANS.TRIAL.credits,
        shopName: "Store",
      },
      activeSubscriptions,
      success: url.searchParams.get("success") === "true",
      cancelled: url.searchParams.get("cancelled") === "true",
    });
  } catch (error) {
    console.error("Error loading pricing:", error);
    return json({
      shop: {
        plan: "TRIAL",
        billingInterval: "MONTHLY",
        credits: BILLING_PLANS.TRIAL.credits,
        maxCredits: BILLING_PLANS.TRIAL.credits,
        shopName: "Store",
      },
      activeSubscriptions: [],
      error: "Failed to load pricing information"
    });
  }
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const { admin, session } = await authenticate.admin(request);
  const formData = await request.formData();
  const action = formData.get("_action") as string;
  const planId = formData.get("planId") as string;

  try {
    const shop = await prisma.shop.findFirst({
      where: { shopifyDomain: session.shop }
    });

    if (!shop) {
      return json({ error: "Shop not found" }, { status: 404 });
    }

    if (action === "cancel") {
      const subscriptionId = formData.get("subscriptionId") as string;
      
      const cancelMutation = `
        mutation CancelSubscription($id: ID!) {
          appSubscriptionCancel(id: $id) {
            appSubscription {
              id
              status
            }
            userErrors {
              field
              message
            }
          }
        }
      `;

      const response = await admin.graphql(cancelMutation, {
        variables: { id: subscriptionId }
      });

      const result = await response.json();
      
      if (result.data?.appSubscriptionCancel?.userErrors?.length > 0) {
        return json({ 
          error: result.data.appSubscriptionCancel.userErrors[0].message 
        }, { status: 400 });
      }

      await prisma.shop.update({
        where: { id: shop.id },
        data: {
          plan: "TRIAL" as any,
          billingInterval: "MONTHLY",
          credits: BILLING_PLANS.TRIAL.credits,
          maxCredits: BILLING_PLANS.TRIAL.credits,
        }
      });

      return json({ success: true, message: "Subscription cancelled successfully" });
    }

    if (action === "upgrade") {
      const plan = BILLING_PLANS[planId as keyof typeof BILLING_PLANS];
      if (!plan) {
        return json({ error: "Invalid plan selected" }, { status: 400 });
      }

      const currentPrismaEnum = shop.plan;
      const targetPrismaEnum = getPrismaPlan(planId);

      const currentInterval = shop.billingInterval;
    const targetInterval = plan.interval === "ANNUAL" ? "ANNUAL" : "MONTHLY";

    if (currentPrismaEnum === targetPrismaEnum && currentInterval === targetInterval) {
        return json({ error: "Already on this plan" }, { status: 400 });
      }

      if (planId === "TRIAL") {
        return json({ error: "Cannot downgrade to trial" }, { status: 400 });
      }

      console.log("[PRICING ACTION] Creating subscription for plan:", planId);
      console.log("[PRICING ACTION] Plan interval:", plan.interval);

      const returnUrl = `https://${session.shop}/admin/apps/rankinai/pricing?plan_id=${planId}`;
      
      // ✅ CORRECTION: Utiliser appSubscriptionCreate pour TOUS les plans (mensuels ET annuels)
      // La seule différence est l'interval: EVERY_30_DAYS vs ANNUAL
      const response = await admin.graphql(CREATE_SUBSCRIPTION_MUTATION, {
        variables: {
          name: `RankInAI ${plan.name} ${plan.interval === "ANNUAL" ? "Annual" : "Monthly"} Plan`,
          lineItems: [{
            plan: {
              appRecurringPricingDetails: {
                price: {
                  amount: plan.price,
                  currencyCode: "USD"
                },
                interval: plan.interval // "EVERY_30_DAYS" ou "ANNUAL"
              }
            }
          }],
          returnUrl,
          test: process.env.NODE_ENV !== "production"
        }
      });

      const result = await response.json();
      
      console.log("[PRICING ACTION] Subscription result:", JSON.stringify(result, null, 2));
      
      if (result.data?.appSubscriptionCreate?.userErrors?.length > 0) {
        return json({ 
          error: result.data.appSubscriptionCreate.userErrors[0].message 
        }, { status: 400 });
      }

      const confirmationUrl = result.data?.appSubscriptionCreate?.confirmationUrl;

      if (!confirmationUrl) {
        return json({ error: "Failed to create billing charge" }, { status: 500 });
      }

      console.log("[PRICING ACTION] Confirmation URL generated:", confirmationUrl);

      return json({ confirmationUrl });
    }

    return json({ error: "Invalid action" }, { status: 400 });

  } catch (error: any) {
    console.error("Billing error:", error);
    return json({ 
      error: error.message || "Failed to process billing request" 
    }, { status: 500 });
  }
};

export default function Pricing() {
  const { shop, activeSubscriptions, success, cancelled } = useLoaderData<typeof loader>();
  const [billingPeriod, setBillingPeriod] = useState<"monthly" | "annual">("monthly");
  const [isLoading, setIsLoading] = useState<string | null>(null);
  const fetcher = useFetcher();
  const navigate = useNavigate();
  const revalidator = useRevalidator();

  useEffect(() => {
    if (fetcher.data?.confirmationUrl) {
      console.log("[PRICING UI] Redirecting to Shopify confirmation:", fetcher.data.confirmationUrl);
      if (window.top) {
        window.top.location.href = fetcher.data.confirmationUrl;
      } else {
        window.location.href = fetcher.data.confirmationUrl;
      }
    }
  }, [fetcher.data]);

  useEffect(() => {
    if (success) {
      console.log("[PRICING UI] ✅ Success detected - revalidating parent context");
      revalidator.revalidate();
      
      setTimeout(() => {
        console.log("[PRICING UI] Redirecting to dashboard");
        navigate("/app");
      }, 3000);
    }
  }, [success, navigate, revalidator]);

  const handleUpgrade = async (planId: string) => {
    const plan = BILLING_PLANS[planId as keyof typeof BILLING_PLANS];
    const targetPrismaEnum = getPrismaPlan(planId);
    
    if (shop.plan === targetPrismaEnum) return;
    
    console.log("[PRICING UI] Initiating upgrade to:", planId);
    setIsLoading(planId);
    
    const formData = new FormData();
    formData.append("_action", "upgrade");
    formData.append("planId", planId);
    
    fetcher.submit(formData, { method: "post" });
  };

  const handleCancelSubscription = async (subscriptionId: string) => {
    if (confirm("Are you sure you want to cancel your subscription? You will lose access to premium features.")) {
      console.log("[PRICING UI] Cancelling subscription:", subscriptionId);
      const formData = new FormData();
      formData.append("_action", "cancel");
      formData.append("subscriptionId", subscriptionId);
      
      fetcher.submit(formData, { method: "post" });
    }
  };

  const displayPlans = billingPeriod === "monthly" 
    ? [BILLING_PLANS.TRIAL, BILLING_PLANS.STARTER_MONTHLY, BILLING_PLANS.GROWTH_MONTHLY, BILLING_PLANS.PRO_MONTHLY]
    : [BILLING_PLANS.TRIAL, BILLING_PLANS.STARTER_ANNUAL, BILLING_PLANS.GROWTH_ANNUAL, BILLING_PLANS.PRO_ANNUAL];

  const isPaidPlan = shop.plan !== "TRIAL";
  const currentDisplayPlan = getDisplayPlanFromPrisma(
    shop.plan, 
    shop.billingInterval === "ANNUAL" ? "annual" : "monthly"
  );
  const currentPlanConfig = BILLING_PLANS[currentDisplayPlan as keyof typeof BILLING_PLANS];

  return (
    <div style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif', background: "linear-gradient(180deg, #f6f6f7 0%, #ffffff 100%)", minHeight: "100vh" }}>
      <AppHeader />
      
      <div style={{ maxWidth: "1200px", margin: "0 auto", padding: "40px 24px" }}>
        {success && (
          <div style={{ background: "#4caf50", color: "white", padding: "16px 24px", borderRadius: "12px", marginBottom: "32px", textAlign: "center", fontSize: "16px", fontWeight: "600" }}>
            ✅ Plan upgraded successfully! Redirecting to dashboard...
          </div>
        )}

        {cancelled && (
          <div style={{ background: "#ff9800", color: "white", padding: "16px 24px", borderRadius: "12px", marginBottom: "32px", textAlign: "center", fontSize: "16px", fontWeight: "600" }}>
            ⚠️ Billing was cancelled. No charges were made.
          </div>
        )}

        <div style={{ textAlign: "center", marginBottom: "48px" }}>
          <h1 style={{ fontSize: "36px", fontWeight: "700", margin: "0 0 16px 0", color: "#202223", background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)", backgroundClip: "text", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
            Choose Your RankInAI Plan
          </h1>
          <p style={{ fontSize: "18px", color: "#6d7175", margin: "0 0 32px 0", maxWidth: "600px", marginLeft: "auto", marginRight: "auto" }}>
            Boost your products' visibility in AI assistants like ChatGPT and Gemini. Get more organic traffic from AI-powered searches.
          </p>

          <div style={{ display: "inline-flex", alignItems: "center", gap: "16px", background: "white", padding: "8px", borderRadius: "12px", boxShadow: "0 2px 8px rgba(0,0,0,0.08)" }}>
            <button onClick={() => setBillingPeriod("monthly")} style={{ padding: "10px 20px", background: billingPeriod === "monthly" ? "#2196f3" : "transparent", color: billingPeriod === "monthly" ? "white" : "#6d7175", border: "none", borderRadius: "8px", fontSize: "14px", fontWeight: "600", cursor: "pointer", transition: "all 0.2s ease" }}>
              Monthly Billing
            </button>
            <button onClick={() => setBillingPeriod("annual")} style={{ padding: "10px 20px", background: billingPeriod === "annual" ? "#2196f3" : "transparent", color: billingPeriod === "annual" ? "white" : "#6d7175", border: "none", borderRadius: "8px", fontSize: "14px", fontWeight: "600", cursor: "pointer", transition: "all 0.2s ease", position: "relative" }}>
              Annual Billing
              <span style={{ position: "absolute", top: "-8px", right: "-8px", background: "#4caf50", color: "white", fontSize: "10px", fontWeight: "700", padding: "2px 6px", borderRadius: "10px" }}>SAVE 17%</span>
            </button>
          </div>
        </div>

        {isPaidPlan && (
          <div style={{ background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)", color: "white", padding: "20px 24px", borderRadius: "12px", marginBottom: "32px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "16px" }}>
              <div>
                <h3 style={{ margin: "0 0 8px 0", fontSize: "18px", fontWeight: "600" }}>
                  Active Subscription: {currentPlanConfig?.name || shop.plan}
                </h3>
                <p style={{ margin: 0, opacity: 0.9, fontSize: "14px" }}>
                  Status: ACTIVE | Credits: {shop.credits}/{shop.maxCredits}
                  {activeSubscriptions.length > 0 && ` | Next billing: ${new Date(activeSubscriptions[0].currentPeriodEnd).toLocaleDateString()}`}
                </p>
              </div>
              {activeSubscriptions.length > 0 && (
                <button onClick={() => handleCancelSubscription(activeSubscriptions[0].id)} style={{ background: "rgba(255,255,255,0.2)", color: "white", border: "1px solid rgba(255,255,255,0.3)", padding: "8px 16px", borderRadius: "8px", fontSize: "14px", fontWeight: "600", cursor: "pointer" }}>
                  Cancel Subscription
                </button>
              )}
            </div>
          </div>
        )}

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "24px", marginBottom: "48px" }}>
          {displayPlans.map((plan) => {
            const planPrismaEnum = getPrismaPlan(plan.id);
            const planInterval = plan.interval === "ANNUAL" ? "ANNUAL" : "MONTHLY";
            const isCurrentPlan = shop.plan === planPrismaEnum && shop.billingInterval === planInterval;
            const monthlyPrice = billingPeriod === "annual" && plan.interval === "ANNUAL" ? Math.round(plan.price / 12) : plan.price;
            
            return (
              <div key={plan.id} style={{ background: "white", borderRadius: "16px", padding: "32px 24px", position: "relative", border: plan.popular ? "2px solid #2196f3" : "1px solid #e0e0e0", boxShadow: plan.popular ? "0 8px 32px rgba(33, 150, 243, 0.2)" : "0 2px 8px rgba(0,0,0,0.08)", transform: plan.popular ? "scale(1.05)" : "none", transition: "all 0.3s ease" }}>
                {plan.popular && plan.badge && (
                  <div style={{ position: "absolute", top: "-12px", left: "50%", transform: "translateX(-50%)", background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)", color: "white", padding: "6px 20px", borderRadius: "20px", fontSize: "12px", fontWeight: "700", letterSpacing: "0.5px" }}>⭐ {plan.badge}</div>
                )}

                <h3 style={{ fontSize: "24px", fontWeight: "600", margin: "0 0 8px 0", color: "#202223" }}>{plan.name}</h3>

                <div style={{ marginBottom: "24px" }}>
                  <div style={{ display: "flex", alignItems: "baseline", gap: "8px" }}>
                    {plan.price === 0 ? (
                      <span style={{ fontSize: "40px", fontWeight: "700", color: plan.color }}>Free</span>
                    ) : (
                      <>
                        <span style={{ fontSize: "40px", fontWeight: "700", color: plan.color }}>${monthlyPrice}</span>
                        <span style={{ fontSize: "16px", color: "#6d7175" }}>/month</span>
                      </>
                    )}
                  </div>
                  
                  {billingPeriod === "annual" && plan.interval === "ANNUAL" && (
                    <>
                      <div style={{ fontSize: "14px", color: "#6d7175", marginTop: "4px" }}>${plan.price} billed annually</div>
                      {plan.savings && <div style={{ fontSize: "14px", color: "#4caf50", marginTop: "4px" }}>Save ${plan.savings} per year</div>}
                    </>
                  )}
                  
                  <div style={{ fontSize: "16px", color: "#202223", marginTop: "8px", fontWeight: "600" }}>{plan.credits} optimization credits{plan.id !== "TRIAL" && " per month"}</div>
                </div>

                <ul style={{ listStyle: "none", padding: 0, margin: "0 0 24px 0", borderTop: "1px solid #e0e0e0", paddingTop: "24px" }}>
                  {plan.features.map((feature, index) => (
                    <li key={index} style={{ fontSize: "14px", color: "#202223", marginBottom: "12px", display: "flex", alignItems: "flex-start", gap: "8px" }}>
                      <span style={{ color: "#4caf50", flexShrink: 0 }}>✓</span>
                      <span>{feature}</span>
                    </li>
                  ))}
                  
                  {plan.limitations.map((limitation, index) => (
                    <li key={`limit-${index}`} style={{ fontSize: "14px", color: "#9e9e9e", marginBottom: "12px", display: "flex", alignItems: "flex-start", gap: "8px" }}>
                      <span style={{ color: "#9e9e9e", flexShrink: 0 }}>–</span>
                      <span>{limitation}</span>
                    </li>
                  ))}
                </ul>

                <button onClick={() => handleUpgrade(plan.id)} disabled={isCurrentPlan || isLoading === plan.id} style={{ width: "100%", padding: "14px 24px", background: isCurrentPlan ? "#e0e0e0" : plan.popular ? "linear-gradient(135deg, #667eea 0%, #764ba2 100%)" : plan.color, color: isCurrentPlan ? "#9e9e9e" : "white", border: "none", borderRadius: "10px", fontSize: "16px", fontWeight: "600", cursor: isCurrentPlan ? "not-allowed" : "pointer", transition: "all 0.2s ease" }}>
                  {isLoading === plan.id ? "Processing..." : isCurrentPlan ? "Current Plan" : plan.cta}
                </button>
              </div>
            );
          })}
        </div>

        <div style={{ background: "linear-gradient(135deg, #1a237e 0%, #311b92 100%)", borderRadius: "16px", padding: "48px", textAlign: "center", color: "white", marginBottom: "48px" }}>
          <h2 style={{ fontSize: "28px", fontWeight: "700", margin: "0 0 16px 0" }}>Need a Custom Solution?</h2>
          <p style={{ fontSize: "16px", opacity: 0.95, margin: "0 0 24px 0", maxWidth: "600px", marginLeft: "auto", marginRight: "auto" }}>
            For large stores with over 10,000 products or specific enterprise needs, we offer custom plans with dedicated support and infrastructure.
          </p>
          <a href="mailto:contact@rank-in-ai.com?subject=Enterprise%20Plan%20Inquiry" style={{ display: "inline-block", background: "white", color: "#1a237e", padding: "14px 32px", borderRadius: "8px", fontSize: "16px", fontWeight: "600", textDecoration: "none", transition: "transform 0.2s ease" }}>
            Contact Enterprise Sales
          </a>
        </div>

        {fetcher.data?.error && (
          <div style={{ position: "fixed", bottom: "24px", right: "24px", background: "#f44336", color: "white", padding: "16px 24px", borderRadius: "8px", boxShadow: "0 4px 12px rgba(0,0,0,0.15)", zIndex: 1000 }}>❌ {fetcher.data.error}</div>
        )}
        
        {fetcher.data?.success && (
          <div style={{ position: "fixed", bottom: "24px", right: "24px", background: "#4caf50", color: "white", padding: "16px 24px", borderRadius: "8px", boxShadow: "0 4px 12px rgba(0,0,0,0.15)", zIndex: 1000 }}>✅ {fetcher.data.message}</div>
        )}
      </div>
    </div>
  );
}