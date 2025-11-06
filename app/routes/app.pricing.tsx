import type { LoaderFunctionArgs, ActionFunctionArgs } from "react-router";
import { json } from "@remix-run/node";
import { useLoaderData, useFetcher, useNavigate } from "react-router";
import { authenticate } from "~/shopify.server";
import { prisma } from "~/db.server";
import { useState } from "react";
import AppHeader from "~/components/AppHeader";

// Configuration des plans conformes Shopify Billing API
const PLANS = {
  TRIAL: {
    id: "TRIAL",
    name: "Free Trial",
    price: 0,
    interval: "one_time",
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
  STARTER: {
    id: "STARTER",
    name: "Starter",
    price: 29,
    priceAnnual: 290, // 2 months free
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
  GROWTH: {
    id: "GROWTH",
    name: "Growth",
    price: 79,
    priceAnnual: 790,
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
  PRO: {
    id: "PRO",
    name: "Professional",
    price: 199,
    priceAnnual: 1990,
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
  }
};

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  
  // Get shop information
  const shop = await prisma.shop.findFirst({
    where: { shopifyDomain: session.shop },
    select: {
      id: true,
      shopName: true,
      shopifyDomain: true,
      plan: true,
      credits: true,
      maxCredits: true,
    }
  });

  return json({
    shop: shop || {
      plan: "TRIAL",
      credits: 25,
      maxCredits: 25,
      shopName: "Store",
    },
    confirmationUrl: null,
  });
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const formData = await request.formData();
  const planId = formData.get("planId") as string;

  try {
    const shop = await prisma.shop.findFirst({
      where: { shopifyDomain: session.shop }
    });

    if (!shop) {
      return json({ error: "Shop not found" }, { status: 404 });
    }

    // Don't process if trying to "upgrade" to current plan
    if (shop.plan === planId) {
      return json({ error: "Already on this plan" }, { status: 400 });
    }

    // Handle trial plan (no billing required)
    if (planId === "TRIAL") {
      return json({ error: "Cannot downgrade to trial" }, { status: 400 });
    }

    const plan = PLANS[planId as keyof typeof PLANS];
    if (!plan) {
      return json({ error: "Invalid plan" }, { status: 400 });
    }

    // For now, just update the plan in the database
    // In production, you would integrate with Shopify Billing API here
    await prisma.shop.update({
      where: { id: shop.id },
      data: {
        plan: planId,
        credits: plan.credits,
        maxCredits: plan.credits,
      }
    });

    return json({ 
      success: true,
      message: `Successfully upgraded to ${plan.name} plan!`
    });

  } catch (error: any) {
    console.error("Plan upgrade error:", error);
    return json({ 
      error: error.message || "Failed to upgrade plan" 
    }, { status: 500 });
  }
};

export default function Pricing() {
  const { shop, confirmationUrl } = useLoaderData<typeof loader>();
  const [billingPeriod, setBillingPeriod] = useState<"monthly" | "annual">("monthly");
  const [isLoading, setIsLoading] = useState<string | null>(null);
  const fetcher = useFetcher();
  const navigate = useNavigate();

  // Redirect to billing confirmation if needed
  if (confirmationUrl) {
    window.top?.location.assign(confirmationUrl);
  }

  const handleUpgrade = async (planId: string) => {
    if (shop.plan === planId) return;
    
    setIsLoading(planId);
    
    const formData = new FormData();
    formData.append("planId", planId);
    
    fetcher.submit(formData, { method: "post" });
  };

  // Show success message after upgrade
  if (fetcher.data?.success) {
    setTimeout(() => {
      navigate("/app");
    }, 2000);
  }

  // Calculate savings for annual billing
  const calculateSavings = (monthlyPrice: number) => {
    const annual = monthlyPrice * 10; // 2 months free
    const regularAnnual = monthlyPrice * 12;
    return Math.round(regularAnnual - annual);
  };

  return (
    <div style={{ 
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif', 
      background: "linear-gradient(180deg, #f6f6f7 0%, #ffffff 100%)", 
      minHeight: "100vh" 
    }}>
      <AppHeader />
      
      <div style={{ maxWidth: "1200px", margin: "0 auto", padding: "40px 24px" }}>
        {/* Header */}
        <div style={{ textAlign: "center", marginBottom: "48px" }}>
          <h1 style={{ 
            fontSize: "36px", 
            fontWeight: "700", 
            margin: "0 0 16px 0", 
            color: "#202223",
            background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
            backgroundClip: "text",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent"
          }}>
            Choose Your RankInAI Plan
          </h1>
          <p style={{ 
            fontSize: "18px", 
            color: "#6d7175", 
            margin: "0 0 32px 0",
            maxWidth: "600px",
            marginLeft: "auto",
            marginRight: "auto"
          }}>
            Boost your products' visibility in AI assistants like ChatGPT and Gemini. 
            Get more organic traffic from AI-powered searches.
          </p>

          {/* Billing Toggle */}
          <div style={{ 
            display: "inline-flex", 
            alignItems: "center", 
            gap: "16px",
            background: "white",
            padding: "8px",
            borderRadius: "12px",
            boxShadow: "0 2px 8px rgba(0,0,0,0.08)"
          }}>
            <button
              onClick={() => setBillingPeriod("monthly")}
              style={{
                padding: "10px 20px",
                background: billingPeriod === "monthly" ? "#2196f3" : "transparent",
                color: billingPeriod === "monthly" ? "white" : "#6d7175",
                border: "none",
                borderRadius: "8px",
                fontSize: "14px",
                fontWeight: "600",
                cursor: "pointer",
                transition: "all 0.2s ease"
              }}
            >
              Monthly Billing
            </button>
            <button
              onClick={() => setBillingPeriod("annual")}
              style={{
                padding: "10px 20px",
                background: billingPeriod === "annual" ? "#2196f3" : "transparent",
                color: billingPeriod === "annual" ? "white" : "#6d7175",
                border: "none",
                borderRadius: "8px",
                fontSize: "14px",
                fontWeight: "600",
                cursor: "pointer",
                transition: "all 0.2s ease",
                position: "relative"
              }}
            >
              Annual Billing
              <span style={{
                position: "absolute",
                top: "-8px",
                right: "-8px",
                background: "#4caf50",
                color: "white",
                fontSize: "10px",
                fontWeight: "700",
                padding: "2px 6px",
                borderRadius: "10px"
              }}>
                SAVE 17%
              </span>
            </button>
          </div>
        </div>

        {/* Current Plan Alert */}
        {shop.plan !== "TRIAL" && (
          <div style={{
            background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
            color: "white",
            padding: "16px 24px",
            borderRadius: "12px",
            marginBottom: "32px",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center"
          }}>
            <div>
              <strong style={{ fontSize: "16px" }}>Your Current Plan: {PLANS[shop.plan as keyof typeof PLANS]?.name}</strong>
              <p style={{ margin: "4px 0 0 0", opacity: 0.9, fontSize: "14px" }}>
                You have {shop.credits} of {shop.maxCredits} credits remaining this month
              </p>
            </div>
            <button
              onClick={() => navigate("/app/settings")}
              style={{
                background: "rgba(255,255,255,0.2)",
                color: "white",
                border: "1px solid rgba(255,255,255,0.3)",
                padding: "8px 16px",
                borderRadius: "8px",
                fontSize: "14px",
                fontWeight: "600",
                cursor: "pointer"
              }}
            >
              Manage Billing
            </button>
          </div>
        )}

        {/* Pricing Cards */}
        <div style={{ 
          display: "grid", 
          gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", 
          gap: "24px",
          marginBottom: "48px"
        }}>
          {Object.values(PLANS).map((plan) => {
            const isCurrentPlan = shop.plan === plan.id;
            const price = billingPeriod === "annual" && plan.priceAnnual 
              ? plan.priceAnnual / 12 
              : plan.price;
            
            return (
              <div
                key={plan.id}
                style={{
                  background: "white",
                  borderRadius: "16px",
                  padding: "32px 24px",
                  position: "relative",
                  border: plan.popular ? "2px solid #2196f3" : "1px solid #e0e0e0",
                  boxShadow: plan.popular 
                    ? "0 8px 32px rgba(33, 150, 243, 0.2)" 
                    : "0 2px 8px rgba(0,0,0,0.08)",
                  transform: plan.popular ? "scale(1.05)" : "none",
                  transition: "all 0.3s ease"
                }}
              >
                {/* Badge */}
                {plan.popular && plan.badge && (
                  <div style={{
                    position: "absolute",
                    top: "-12px",
                    left: "50%",
                    transform: "translateX(-50%)",
                    background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                    color: "white",
                    padding: "6px 20px",
                    borderRadius: "20px",
                    fontSize: "12px",
                    fontWeight: "700",
                    letterSpacing: "0.5px"
                  }}>
                    ⭐ {plan.badge}
                  </div>
                )}

                {/* Plan Name */}
                <h3 style={{
                  fontSize: "24px",
                  fontWeight: "600",
                  margin: "0 0 8px 0",
                  color: "#202223"
                }}>
                  {plan.name}
                </h3>

                {/* Price */}
                <div style={{ marginBottom: "24px" }}>
                  <div style={{ display: "flex", alignItems: "baseline", gap: "8px" }}>
                    <span style={{ fontSize: "40px", fontWeight: "700", color: plan.color }}>
                      {plan.price === 0 ? "Free" : `€${Math.round(price)}`}
                    </span>
                    {plan.price > 0 && (
                      <span style={{ fontSize: "16px", color: "#6d7175" }}>
                        /month
                      </span>
                    )}
                  </div>
                  
                  {billingPeriod === "annual" && plan.priceAnnual && (
                    <div style={{ fontSize: "14px", color: "#4caf50", marginTop: "4px" }}>
                      Save €{calculateSavings(plan.price)} per year
                    </div>
                  )}
                  
                  <div style={{ 
                    fontSize: "16px", 
                    color: "#202223", 
                    marginTop: "8px",
                    fontWeight: "600" 
                  }}>
                    {plan.credits} optimization credits
                    {plan.id !== "TRIAL" && " per month"}
                  </div>
                </div>

                {/* Features */}
                <ul style={{ 
                  listStyle: "none", 
                  padding: 0, 
                  margin: "0 0 24px 0",
                  borderTop: "1px solid #e0e0e0",
                  paddingTop: "24px"
                }}>
                  {plan.features.map((feature, index) => (
                    <li key={index} style={{ 
                      fontSize: "14px", 
                      color: "#202223", 
                      marginBottom: "12px",
                      display: "flex",
                      alignItems: "flex-start",
                      gap: "8px"
                    }}>
                      <span style={{ color: "#4caf50", flexShrink: 0 }}>✓</span>
                      <span>{feature}</span>
                    </li>
                  ))}
                  
                  {plan.limitations.map((limitation, index) => (
                    <li key={`limit-${index}`} style={{ 
                      fontSize: "14px", 
                      color: "#9e9e9e", 
                      marginBottom: "12px",
                      display: "flex",
                      alignItems: "flex-start",
                      gap: "8px"
                    }}>
                      <span style={{ color: "#9e9e9e", flexShrink: 0 }}>–</span>
                      <span>{limitation}</span>
                    </li>
                  ))}
                </ul>

                {/* CTA Button */}
                <button
                  onClick={() => handleUpgrade(plan.id)}
                  disabled={isCurrentPlan || isLoading === plan.id}
                  style={{
                    width: "100%",
                    padding: "14px 24px",
                    background: isCurrentPlan 
                      ? "#e0e0e0" 
                      : plan.popular 
                        ? "linear-gradient(135deg, #667eea 0%, #764ba2 100%)"
                        : plan.color,
                    color: isCurrentPlan ? "#9e9e9e" : "white",
                    border: "none",
                    borderRadius: "10px",
                    fontSize: "16px",
                    fontWeight: "600",
                    cursor: isCurrentPlan ? "not-allowed" : "pointer",
                    transition: "all 0.2s ease"
                  }}
                  onMouseEnter={(e) => {
                    if (!isCurrentPlan && isLoading !== plan.id) {
                      e.currentTarget.style.transform = "translateY(-2px)";
                      e.currentTarget.style.boxShadow = "0 4px 12px rgba(0,0,0,0.15)";
                    }
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = "translateY(0)";
                    e.currentTarget.style.boxShadow = "none";
                  }}
                >
                  {isLoading === plan.id 
                    ? "Processing..." 
                    : isCurrentPlan 
                      ? "Current Plan" 
                      : plan.cta}
                </button>

                {/* Trial info */}
                {shop.plan === "TRIAL" && plan.id !== "TRIAL" && (
                  <p style={{
                    fontSize: "12px",
                    color: "#4caf50",
                    textAlign: "center",
                    marginTop: "12px",
                    margin: "12px 0 0 0"
                  }}>
                    🎁 7-day free trial included
                  </p>
                )}
              </div>
            );
          })}
        </div>

        {/* Features Comparison */}
        <div style={{
          background: "white",
          borderRadius: "16px",
          padding: "32px",
          boxShadow: "0 2px 8px rgba(0,0,0,0.08)"
        }}>
          <h2 style={{
            fontSize: "24px",
            fontWeight: "600",
            margin: "0 0 24px 0",
            color: "#202223",
            textAlign: "center"
          }}>
            Why Choose RankInAI?
          </h2>
          
          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))",
            gap: "24px"
          }}>
            <div>
              <div style={{ fontSize: "32px", marginBottom: "8px" }}>🚀</div>
              <h3 style={{ fontSize: "18px", fontWeight: "600", margin: "0 0 8px 0" }}>
                Increase AI Visibility
              </h3>
              <p style={{ fontSize: "14px", color: "#6d7175", margin: 0, lineHeight: "1.6" }}>
                Get your products recommended by ChatGPT, Gemini, and other AI assistants
              </p>
            </div>
            
            <div>
              <div style={{ fontSize: "32px", marginBottom: "8px" }}>📊</div>
              <h3 style={{ fontSize: "18px", fontWeight: "600", margin: "0 0 8px 0" }}>
                Track Performance
              </h3>
              <p style={{ fontSize: "14px", color: "#6d7175", margin: 0, lineHeight: "1.6" }}>
                Monitor citation rates and competitor mentions in real-time
              </p>
            </div>
            
            <div>
              <div style={{ fontSize: "32px", marginBottom: "8px" }}>💡</div>
              <h3 style={{ fontSize: "18px", fontWeight: "600", margin: "0 0 8px 0" }}>
                AI-Powered Optimization
              </h3>
              <p style={{ fontSize: "14px", color: "#6d7175", margin: 0, lineHeight: "1.6" }}>
                Get specific recommendations to improve your product descriptions
              </p>
            </div>
            
            <div>
              <div style={{ fontSize: "32px", marginBottom: "8px" }}>🎯</div>
              <h3 style={{ fontSize: "18px", fontWeight: "600", margin: "0 0 8px 0" }}>
                Stay Ahead
              </h3>
              <p style={{ fontSize: "14px", color: "#6d7175", margin: 0, lineHeight: "1.6" }}>
                Be first in the new era of AI-driven product discovery
              </p>
            </div>
          </div>
        </div>

        {/* Trust Badges */}
        <div style={{
          marginTop: "48px",
          padding: "24px",
          textAlign: "center"
        }}>
          <div style={{
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            gap: "32px",
            flexWrap: "wrap"
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", color: "#6d7175" }}>
              <span style={{ fontSize: "20px" }}>🔒</span>
              <span style={{ fontSize: "14px" }}>Secure Checkout</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", color: "#6d7175" }}>
              <span style={{ fontSize: "20px" }}>💳</span>
              <span style={{ fontSize: "14px" }}>Processed by Shopify</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", color: "#6d7175" }}>
              <span style={{ fontSize: "20px" }}>🔄</span>
              <span style={{ fontSize: "14px" }}>Cancel Anytime</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", color: "#6d7175" }}>
              <span style={{ fontSize: "20px" }}>🏆</span>
              <span style={{ fontSize: "14px" }}>Built for Shopify</span>
            </div>
          </div>
        </div>

        {/* Error Messages */}
        {fetcher.data?.error && (
          <div style={{
            position: "fixed",
            bottom: "24px",
            right: "24px",
            background: "#f44336",
            color: "white",
            padding: "16px 24px",
            borderRadius: "8px",
            boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
            zIndex: 1000
          }}>
            ❌ {fetcher.data.error}
          </div>
        )}
        
        {/* Success Message */}
        {fetcher.data?.success && (
          <div style={{
            position: "fixed",
            bottom: "24px",
            right: "24px",
            background: "#4caf50",
            color: "white",
            padding: "16px 24px",
            borderRadius: "8px",
            boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
            zIndex: 1000
          }}>
            ✅ {fetcher.data.message}
          </div>
        )}
      </div>
    </div>
  );
}