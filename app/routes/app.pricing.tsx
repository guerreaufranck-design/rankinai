import type { LoaderFunctionArgs, ActionFunctionArgs } from "react-router";
import { json, redirect } from "~/utils/response";
import { useLoaderData, useFetcher, useNavigate } from "react-router";
import { authenticate, MONTHLY_PLAN, ANNUAL_PLAN } from "~/shopify.server";
import { prisma } from "~/db.server";
import { useState, useEffect } from "react";
import AppHeader from "~/components/AppHeader";

// Configuration des plans avec Shopify Billing API
const BILLING_PLANS = {
  TRIAL: {
    id: "TRIAL",
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
};

// GraphQL mutation pour créer une charge récurrente
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

// GraphQL mutation pour créer une charge unique (annual)
const CREATE_PURCHASE_MUTATION = `
  mutation CreatePurchase(
    $name: String!
    $price: MoneyInput!
    $returnUrl: URL!
    $test: Boolean
  ) {
    appPurchaseOneTimeCreate(
      name: $name
      price: $price
      returnUrl: $returnUrl
      test: $test
    ) {
      appPurchaseOneTime {
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

// GraphQL query pour vérifier les abonnements actifs
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
      oneTimePurchases(first: 10, sortKey: CREATED_AT, reverse: true) {
        edges {
          node {
            id
            name
            price {
              amount
              currencyCode
            }
            status
            createdAt
          }
        }
      }
    }
  }
`;

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { admin, session } = await authenticate.admin(request);
  
  try {
    // Get current shop from database - SANS billingId qui n'existe pas
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

    // Get shop currency from Shopify - DYNAMIQUE
    const shopInfoResponse = await admin.graphql(`
      query {
        shop {
          currencyCode
        }
      }
    `);
    const shopInfoData = await shopInfoResponse.json();
    const currency = shopInfoData.data?.shop?.currencyCode || "USD";

    // Get active subscriptions from Shopify
    const response = await admin.graphql(ACTIVE_SUBSCRIPTIONS_QUERY);
    const data = await response.json();
    
    const activeSubscriptions = data.data?.currentAppInstallation?.activeSubscriptions || [];
    const oneTimePurchases = data.data?.currentAppInstallation?.oneTimePurchases?.edges || [];

    // Check for confirmation URL in query params (after billing confirmation)
    const url = new URL(request.url);
    const charge_id = url.searchParams.get("charge_id");
    
    if (charge_id) {
      // User confirmed the charge, update database - SANS billingId
      const planId = url.searchParams.get("plan_id");
      if (planId && shop) {
        const plan = BILLING_PLANS[planId as keyof typeof BILLING_PLANS];
        await prisma.shop.update({
          where: { id: shop.id },
          data: {
            plan: planId,
            credits: plan.credits,
            maxCredits: plan.credits,
          }
        });
        return redirect("/app/pricing?success=true");
      }
    }

    return json({
      shop: shop || {
        plan: "TRIAL",
        credits: 25,
        maxCredits: 25,
        shopName: "Store",
      },
      activeSubscriptions,
      oneTimePurchases,
      currency, // DEVISE DYNAMIQUE
      success: url.searchParams.get("success") === "true",
      cancelled: url.searchParams.get("cancelled") === "true",
    });
  } catch (error) {
    console.error("Error loading pricing:", error);
    return json({
      shop: {
        plan: "TRIAL",
        credits: 25,
        maxCredits: 25,
        shopName: "Store",
      },
      activeSubscriptions: [],
      oneTimePurchases: [],
      currency: "USD",
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

    // Get shop currency from Shopify - DYNAMIQUE
    const shopInfoResponse = await admin.graphql(`
      query {
        shop {
          currencyCode
        }
      }
    `);
    const shopInfoData = await shopInfoResponse.json();
    const currency = shopInfoData.data?.shop?.currencyCode || "USD";

    // Handle cancellation
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

      // Update database to reflect cancellation - SANS billingId
      await prisma.shop.update({
        where: { id: shop.id },
        data: {
          plan: "TRIAL",
          credits: 25,
          maxCredits: 25,
        }
      });

      return json({ success: true, message: "Subscription cancelled successfully" });
    }

    // Handle upgrade/downgrade
    if (action === "upgrade") {
      const plan = BILLING_PLANS[planId as keyof typeof BILLING_PLANS];
      if (!plan) {
        return json({ error: "Invalid plan selected" }, { status: 400 });
      }

      // Don't process if trying to upgrade to current plan
      if (shop.plan === planId) {
        return json({ error: "Already on this plan" }, { status: 400 });
      }

      // Trial plan doesn't require billing
      if (planId === "TRIAL") {
        return json({ error: "Cannot downgrade to trial" }, { status: 400 });
      }

      const returnUrl = `${process.env.SHOPIFY_APP_URL}/app/pricing?charge_id={CHARGE_ID}&plan_id=${planId}`;
      
      let confirmationUrl: string | null = null;

      if (plan.interval === "ANNUAL") {
        // Create one-time purchase for annual plans - DEVISE DYNAMIQUE
        const response = await admin.graphql(CREATE_PURCHASE_MUTATION, {
          variables: {
            name: `RankInAI ${plan.name} Annual Plan`,
            price: {
              amount: plan.price,
              currencyCode: currency // DYNAMIQUE (USD, EUR, GBP, etc.)
            },
            returnUrl,
            test: process.env.NODE_ENV !== "production"
          }
        });

        const result = await response.json();
        
        if (result.data?.appPurchaseOneTimeCreate?.userErrors?.length > 0) {
          return json({ 
            error: result.data.appPurchaseOneTimeCreate.userErrors[0].message 
          }, { status: 400 });
        }

        confirmationUrl = result.data?.appPurchaseOneTimeCreate?.confirmationUrl;

      } else {
        // Create recurring subscription for monthly plans - DEVISE DYNAMIQUE
        const response = await admin.graphql(CREATE_SUBSCRIPTION_MUTATION, {
          variables: {
            name: `RankInAI ${plan.name} Plan`,
            lineItems: [{
              plan: {
                appRecurringPricingDetails: {
                  price: {
                    amount: plan.price,
                    currencyCode: currency // DYNAMIQUE (USD, EUR, GBP, etc.)
                  },
                  interval: plan.interval
                }
              }
            }],
            returnUrl,
            test: process.env.NODE_ENV !== "production"
          }
        });

        const result = await response.json();
        
        if (result.data?.appSubscriptionCreate?.userErrors?.length > 0) {
          return json({ 
            error: result.data.appSubscriptionCreate.userErrors[0].message 
          }, { status: 400 });
        }

        confirmationUrl = result.data?.appSubscriptionCreate?.confirmationUrl;
      }

      if (!confirmationUrl) {
        return json({ error: "Failed to create billing charge" }, { status: 500 });
      }

      // Return the confirmation URL for redirect
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
  const { shop, activeSubscriptions, oneTimePurchases, currency, success, cancelled } = useLoaderData<typeof loader>();
  const [billingPeriod, setBillingPeriod] = useState<"monthly" | "annual">("monthly");
  const [isLoading, setIsLoading] = useState<string | null>(null);
  const fetcher = useFetcher();
  const navigate = useNavigate();

  // Handle billing confirmation redirect
  useEffect(() => {
    if (fetcher.data?.confirmationUrl) {
      // Redirect to Shopify billing confirmation page
      if (window.top) {
        window.top.location.href = fetcher.data.confirmationUrl;
      } else {
        window.location.href = fetcher.data.confirmationUrl;
      }
    }
  }, [fetcher.data]);

  // Show success message
  useEffect(() => {
    if (success) {
      setTimeout(() => {
        navigate("/app");
      }, 3000);
    }
  }, [success, navigate]);

  const handleUpgrade = async (planId: string) => {
    if (shop.plan === planId) return;
    
    setIsLoading(planId);
    
    const formData = new FormData();
    formData.append("_action", "upgrade");
    formData.append("planId", planId);
    
    fetcher.submit(formData, { method: "post" });
  };

  const handleCancelSubscription = async (subscriptionId: string) => {
    if (confirm("Are you sure you want to cancel your subscription? You will lose access to premium features.")) {
      const formData = new FormData();
      formData.append("_action", "cancel");
      formData.append("subscriptionId", subscriptionId);
      
      fetcher.submit(formData, { method: "post" });
    }
  };

  // Get display plans based on billing period
  const displayPlans = billingPeriod === "monthly" 
    ? [BILLING_PLANS.TRIAL, BILLING_PLANS.STARTER_MONTHLY, BILLING_PLANS.GROWTH_MONTHLY, BILLING_PLANS.PRO_MONTHLY]
    : [BILLING_PLANS.TRIAL, BILLING_PLANS.STARTER_ANNUAL, BILLING_PLANS.GROWTH_ANNUAL, BILLING_PLANS.PRO_ANNUAL];

  // Currency symbol helper - SUPPORT DE 13 DEVISES
  const getCurrencySymbol = (code: string) => {
    const symbols: { [key: string]: string } = {
      USD: "$",
      EUR: "€",
      GBP: "£",
      CAD: "CA$",
      AUD: "A$",
      JPY: "¥",
      CHF: "CHF ",
      SEK: "kr",
      NOK: "kr",
      DKK: "kr",
      NZD: "NZ$",
      SGD: "S$",
      HKD: "HK$",
    };
    return symbols[currency] || currency + " ";
  };

  const currencySymbol = getCurrencySymbol(currency);

  return (
    <div style={{ 
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif', 
      background: "linear-gradient(180deg, #f6f6f7 0%, #ffffff 100%)", 
      minHeight: "100vh" 
    }}>
      <AppHeader />
      
      <div style={{ maxWidth: "1200px", margin: "0 auto", padding: "40px 24px" }}>
        {/* Success/Error Messages */}
        {success && (
          <div style={{
            background: "#4caf50",
            color: "white",
            padding: "16px 24px",
            borderRadius: "12px",
            marginBottom: "32px",
            textAlign: "center",
            fontSize: "16px",
            fontWeight: "600"
          }}>
            ✅ Plan upgraded successfully! Redirecting to dashboard...
          </div>
        )}

        {cancelled && (
          <div style={{
            background: "#ff9800",
            color: "white",
            padding: "16px 24px",
            borderRadius: "12px",
            marginBottom: "32px",
            textAlign: "center",
            fontSize: "16px",
            fontWeight: "600"
          }}>
            ⚠️ Billing was cancelled. No charges were made.
          </div>
        )}

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

        {/* Active Subscription Info */}
        {activeSubscriptions.length > 0 && (
          <div style={{
            background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
            color: "white",
            padding: "20px 24px",
            borderRadius: "12px",
            marginBottom: "32px"
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "16px" }}>
              <div>
                <h3 style={{ margin: "0 0 8px 0", fontSize: "18px", fontWeight: "600" }}>
                  Active Subscription: {activeSubscriptions[0].name}
                </h3>
                <p style={{ margin: 0, opacity: 0.9, fontSize: "14px" }}>
                  Status: {activeSubscriptions[0].status} | 
                  Credits: {shop.credits}/{shop.maxCredits} | 
                  Next billing: {new Date(activeSubscriptions[0].currentPeriodEnd).toLocaleDateString()}
                </p>
              </div>
              <button
                onClick={() => handleCancelSubscription(activeSubscriptions[0].id)}
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
                Cancel Subscription
              </button>
            </div>
          </div>
        )}

        {/* Pricing Cards */}
        <div style={{ 
          display: "grid", 
          gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", 
          gap: "24px",
          marginBottom: "48px"
        }}>
          {displayPlans.map((plan) => {
            const isCurrentPlan = shop.plan === plan.id;
            const monthlyPrice = billingPeriod === "annual" && plan.interval === "ANNUAL"
              ? Math.round(plan.price / 12)
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
                    {plan.price === 0 ? (
                      <span style={{ fontSize: "40px", fontWeight: "700", color: plan.color }}>
                        Free
                      </span>
                    ) : (
                      <>
                        <span style={{ fontSize: "40px", fontWeight: "700", color: plan.color }}>
                          {currencySymbol}{monthlyPrice}
                        </span>
                        <span style={{ fontSize: "16px", color: "#6d7175" }}>
                          /month
                        </span>
                      </>
                    )}
                  </div>
                  
                  {billingPeriod === "annual" && plan.interval === "ANNUAL" && (
                    <>
                      <div style={{ fontSize: "14px", color: "#6d7175", marginTop: "4px" }}>
                        {currencySymbol}{plan.price} billed annually
                      </div>
                      {plan.savings && (
                        <div style={{ fontSize: "14px", color: "#4caf50", marginTop: "4px" }}>
                          Save {currencySymbol}{plan.savings} per year
                        </div>
                      )}
                    </>
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
              </div>
            );
          })}
        </div>

        {/* Enterprise CTA */}
        <div style={{
          background: "linear-gradient(135deg, #1a237e 0%, #311b92 100%)",
          borderRadius: "16px",
          padding: "48px",
          textAlign: "center",
          color: "white",
          marginBottom: "48px"
        }}>
          <h2 style={{ fontSize: "28px", fontWeight: "700", margin: "0 0 16px 0" }}>
            Need a Custom Solution?
          </h2>
          <p style={{ fontSize: "16px", opacity: 0.95, margin: "0 0 24px 0", maxWidth: "600px", marginLeft: "auto", marginRight: "auto" }}>
            For large stores with over 10,000 products or specific enterprise needs, 
            we offer custom plans with dedicated support and infrastructure.
          </p>
          <a
            href="mailto:contact@rank-in-ai.com?subject=Enterprise%20Plan%20Inquiry"
            style={{
              display: "inline-block",
              background: "white",
              color: "#1a237e",
              padding: "14px 32px",
              borderRadius: "8px",
              fontSize: "16px",
              fontWeight: "600",
              textDecoration: "none",
              transition: "transform 0.2s ease"
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = "translateY(-2px)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = "translateY(0)";
            }}
          >
            Contact Enterprise Sales
          </a>
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
            zIndex: 1000,
            animation: "slideInUp 0.3s ease"
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
            zIndex: 1000,
            animation: "slideInUp 0.3s ease"
          }}>
            ✅ {fetcher.data.message}
          </div>
        )}
      </div>

      <style>{`
        @keyframes slideInUp {
          from {
            transform: translateY(100%);
            opacity: 0;
          }
          to {
            transform: translateY(0);
            opacity: 1;
          }
        }
      `}</style>
    </div>
  );
}