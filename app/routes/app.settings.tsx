import type { LoaderFunctionArgs, ActionFunctionArgs } from "react-router";
import { json } from "@remix-run/node";
import { useLoaderData, useFetcher } from "react-router";
import { authenticate } from "~/shopify.server";
import { prisma } from "~/db.server";
import { useState } from "react";
import AppHeader from "~/components/AppHeader";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session } = await authenticate.admin(request);

  const shop = await prisma.shop.findFirst({
    where: { shopifyDomain: session.shop },
  });

  const productCount = await prisma.product.count({
    where: { shopId: shop?.id },
  });

  return json({
    shop: {
      shopName: shop?.shopName || "Store",
      shopifyDomain: shop?.shopifyDomain || session.shop,
      credits: shop?.credits || 25,
      maxCredits: shop?.maxCredits || 25,
      plan: shop?.plan || "TRIAL",
    },
    productCount,
  });
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const { session, admin } = await authenticate.admin(request);
  const formData = await request.formData();
  const action = formData.get("action") as string;

  try {
    const shop = await prisma.shop.findFirst({
      where: { shopifyDomain: session.shop },
    });

    if (!shop) {
      return json({ error: "Shop not found" }, { status: 404 });
    }

    if (action === "syncProducts") {
      // Fetch products from Shopify (active only)
      const productsQuery = `
        query {
          products(first: 250, query: "status:active") {
            edges {
              node {
                id
                legacyResourceId
                title
                handle
                description
                tags
              }
            }
          }
        }
      `;

      const response = await admin.graphql(productsQuery);
      const data = await response.json();

      if (!data.data?.products?.edges) {
        return json({ error: "Failed to fetch products" }, { status: 500 });
      }

      let syncedCount = 0;
      let newCount = 0;

      for (const edge of data.data.products.edges) {
        const product = edge.node;

        // Check if product already exists
        const existingProduct = await prisma.product.findFirst({
          where: {
            shopId: shop.id,
            handle: product.handle,
          },
        });

        if (existingProduct) {
          // Update existing product
          await prisma.product.update({
            where: { id: existingProduct.id },
            data: {
              title: product.title,
              description: product.description || "",
              tags: product.tags.join(", "),
              shopifyId: product.legacyResourceId,
              shopifyGid: product.id,
            },
          });
          syncedCount++;
        } else {
          // Create new product
          await prisma.product.create({
            data: {
              id: `prod_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
              shopId: shop.id,
              shopifyId: product.legacyResourceId,
              shopifyGid: product.id,
              title: product.title,
              description: product.description || "",
              handle: product.handle,
              tags: product.tags.join(", "),
            },
          });
          newCount++;
        }
      }

      console.log(`✅ Products synced: ${syncedCount} updated, ${newCount} new`);

      return json({ 
        success: true, 
        message: `Synced ${syncedCount + newCount} products (${newCount} new, ${syncedCount} updated)`,
        syncedCount,
        newCount,
      });
    }

    if (action === "addDomain") {
      const domain = formData.get("domain") as string;
      
      // TODO: Add to CustomDomain table when we create it
      
      return json({ success: true, message: "Domain added successfully" });
    }

    return json({ error: "Invalid action" }, { status: 400 });
  } catch (error: any) {
    console.error("Settings error:", error);
    return json({ error: error.message }, { status: 500 });
  }
};

export default function Settings() {
  const { shop, productCount } = useLoaderData<typeof loader>();
  const [activeTab, setActiveTab] = useState<"general" | "domains" | "pricing">("general");
  const [newDomain, setNewDomain] = useState("");
  const fetcher = useFetcher();

  const plans = [
    {
      name: "Trial",
      id: "TRIAL",
      price: "Free",
      credits: 25,
      features: [
        "✅ 25 AI scans",
        "✅ ChatGPT & Gemini analysis",
        "✅ Basic reporting",
        "✅ Email support",
      ],
      color: "#9e9e9e",
      recommended: false,
    },
    {
      name: "Starter",
      id: "STARTER",
      price: "€29",
      priceDetail: "/ month",
      credits: 100,
      features: [
        "✅ 100 AI scans/month",
        "✅ ChatGPT & Gemini analysis",
        "✅ Advanced reporting",
        "✅ Custom domains",
        "✅ Priority email support",
      ],
      color: "#2196f3",
      recommended: false,
    },
    {
      name: "Growth",
      id: "GROWTH",
      price: "€79",
      priceDetail: "/ month",
      credits: 300,
      features: [
        "✅ 300 AI scans/month",
        "✅ ChatGPT & Gemini analysis",
        "✅ Advanced reporting",
        "✅ Custom domains",
        "✅ Automated scanning",
        "✅ API access",
        "✅ Priority support",
      ],
      color: "#ff9800",
      recommended: true,
    },
    {
      name: "Pro",
      id: "PRO",
      price: "€199",
      priceDetail: "/ month",
      credits: 1000,
      features: [
        "✅ 1000 AI scans/month",
        "✅ ChatGPT & Gemini analysis",
        "✅ Advanced reporting",
        "✅ Unlimited custom domains",
        "✅ Automated scanning",
        "✅ Full API access",
        "✅ White-label options",
        "✅ Dedicated support",
      ],
      color: "#9c27b0",
      recommended: false,
    },
  ];

  const currentPlan = plans.find(p => p.id === shop.plan) || plans[0];

  const handleSyncProducts = () => {
    const formData = new FormData();
    formData.append("action", "syncProducts");
    fetcher.submit(formData, { method: "post" });
  };

  return (
    <div style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif', background: "#f6f6f7", minHeight: "100vh" }}>
      <AppHeader />
      
      <div style={{ padding: "0 24px 24px 24px" }}>
        <div style={{ marginBottom: "32px" }}>
          <h1 style={{ fontSize: "28px", fontWeight: "600", margin: "0 0 8px 0", color: "#202223" }}>
            ⚙️ Settings
          </h1>
          <p style={{ fontSize: "16px", color: "#6d7175", margin: 0 }}>
            Configure your RankInAI application
          </p>
        </div>

        {/* Tabs */}
        <div style={{ display: "flex", gap: "8px", marginBottom: "24px", borderBottom: "2px solid #e0e0e0" }}>
          <button
            onClick={() => setActiveTab("general")}
            style={{
              background: "none",
              border: "none",
              padding: "12px 24px",
              fontSize: "14px",
              fontWeight: "600",
              color: activeTab === "general" ? "#2196f3" : "#6d7175",
              borderBottom: activeTab === "general" ? "3px solid #2196f3" : "3px solid transparent",
              cursor: "pointer",
              marginBottom: "-2px",
            }}
          >
            General
          </button>
          <button
            onClick={() => setActiveTab("domains")}
            style={{
              background: "none",
              border: "none",
              padding: "12px 24px",
              fontSize: "14px",
              fontWeight: "600",
              color: activeTab === "domains" ? "#2196f3" : "#6d7175",
              borderBottom: activeTab === "domains" ? "3px solid #2196f3" : "3px solid transparent",
              cursor: "pointer",
              marginBottom: "-2px",
            }}
          >
            Custom Domains
          </button>
          <button
            onClick={() => setActiveTab("pricing")}
            style={{
              background: "none",
              border: "none",
              padding: "12px 24px",
              fontSize: "14px",
              fontWeight: "600",
              color: activeTab === "pricing" ? "#2196f3" : "#6d7175",
              borderBottom: activeTab === "pricing" ? "3px solid #2196f3" : "3px solid transparent",
              cursor: "pointer",
              marginBottom: "-2px",
            }}
          >
            Pricing & Plans
          </button>
        </div>

        {/* General Tab */}
        {activeTab === "general" && (
          <div>
            <div
              style={{
                background: "white",
                borderRadius: "12px",
                padding: "24px",
                boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
                marginBottom: "24px",
              }}
            >
              <h2 style={{ fontSize: "20px", fontWeight: "600", margin: "0 0 16px 0", color: "#202223" }}>
                Store Information
              </h2>
              
              <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                <div>
                  <label style={{ fontSize: "14px", fontWeight: "500", color: "#6d7175", display: "block", marginBottom: "8px" }}>
                    Store Name
                  </label>
                  <input
                    type="text"
                    value={shop.shopName}
                    disabled
                    style={{
                      width: "100%",
                      padding: "10px 14px",
                      border: "1px solid #e0e0e0",
                      borderRadius: "8px",
                      fontSize: "14px",
                      background: "#f5f5f5",
                      color: "#6d7175",
                    }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: "14px", fontWeight: "500", color: "#6d7175", display: "block", marginBottom: "8px" }}>
                    Shopify Domain
                  </label>
                  <input
                    type="text"
                    value={shop.shopifyDomain}
                    disabled
                    style={{
                      width: "100%",
                      padding: "10px 14px",
                      border: "1px solid #e0e0e0",
                      borderRadius: "8px",
                      fontSize: "14px",
                      background: "#f5f5f5",
                      color: "#6d7175",
                    }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: "14px", fontWeight: "500", color: "#6d7175", display: "block", marginBottom: "8px" }}>
                    Current Plan
                  </label>
                  <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                    <span style={{ 
                      background: currentPlan.color, 
                      color: "white", 
                      padding: "8px 16px", 
                      borderRadius: "8px", 
                      fontSize: "14px", 
                      fontWeight: "600" 
                    }}>
                      {currentPlan.name}
                    </span>
                    <span style={{ fontSize: "14px", color: "#6d7175" }}>
                      {shop.credits}/{shop.maxCredits} credits remaining
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Product Sync */}
            <div
              style={{
                background: "white",
                borderRadius: "12px",
                padding: "24px",
                boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
                marginBottom: "24px",
              }}
            >
              <h2 style={{ fontSize: "20px", fontWeight: "600", margin: "0 0 16px 0", color: "#202223" }}>
                🔄 Product Synchronization
              </h2>
              
              <div style={{ marginBottom: "16px" }}>
                <p style={{ fontSize: "14px", color: "#6d7175", margin: "0 0 8px 0" }}>
                  <strong>Products in RankInAI:</strong> {productCount}
                </p>
                <p style={{ fontSize: "14px", color: "#6d7175", margin: 0, lineHeight: "1.6" }}>
                  Click the button below to sync your active products from Shopify. This will add new products and update existing ones.
                </p>
              </div>

              <button
                onClick={handleSyncProducts}
                disabled={fetcher.state !== "idle"}
                style={{
                  background: fetcher.state === "idle" ? "#2196f3" : "#e0e0e0",
                  color: "white",
                  border: "none",
                  padding: "12px 24px",
                  borderRadius: "8px",
                  fontSize: "14px",
                  fontWeight: "600",
                  cursor: fetcher.state === "idle" ? "pointer" : "not-allowed",
                }}
              >
                {fetcher.state === "submitting" ? "🔄 Syncing..." : "🔄 Sync Products from Shopify"}
              </button>

              {fetcher.data?.success && (
                <div style={{ marginTop: "16px", padding: "16px", background: "#e8f5e9", borderRadius: "8px", border: "1px solid #4caf50" }}>
                  <p style={{ fontSize: "14px", color: "#2e7d32", margin: 0 }}>
                    ✅ {fetcher.data.message}
                  </p>
                </div>
              )}

              {fetcher.data?.error && (
                <div style={{ marginTop: "16px", padding: "16px", background: "#ffebee", borderRadius: "8px", border: "1px solid #f44336" }}>
                  <p style={{ fontSize: "14px", color: "#c62828", margin: 0 }}>
                    ❌ {fetcher.data.error}
                  </p>
                </div>
              )}
            </div>

            <div
              style={{
                background: "white",
                borderRadius: "12px",
                padding: "24px",
                boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
              }}
            >
              <h2 style={{ fontSize: "20px", fontWeight: "600", margin: "0 0 16px 0", color: "#202223" }}>
                About RankInAI
              </h2>
              
              <p style={{ fontSize: "14px", color: "#6d7175", lineHeight: "1.6", margin: 0 }}>
                RankInAI helps you optimize your products to be recommended by AI assistants like ChatGPT and Google Gemini. 
                Scan your products to see how well they perform in AI recommendations and get actionable insights to improve your visibility.
              </p>
            </div>
          </div>
        )}

        {/* Custom Domains Tab */}
        {activeTab === "domains" && (
          <div
            style={{
              background: "white",
              borderRadius: "12px",
              padding: "24px",
              boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
            }}
          >
            <h2 style={{ fontSize: "20px", fontWeight: "600", margin: "0 0 8px 0", color: "#202223" }}>
              Custom Domains
            </h2>
            <p style={{ fontSize: "14px", color: "#6d7175", marginBottom: "24px" }}>
              Add alternative domain names that your store uses. RankInAI will check if AI assistants recommend these domains when scanning your products.
            </p>

            <div style={{ background: "#fff3cd", padding: "16px", borderRadius: "8px", marginBottom: "24px", border: "1px solid #ffeaa7" }}>
              <p style={{ fontSize: "14px", color: "#856404", margin: 0 }}>
                <strong>💡 Why add custom domains?</strong><br/>
                Many merchants use custom domains (like www.mystore.com) instead of their Shopify domain (mystore.myshopify.com). 
                Add all your domains here so we can accurately track AI citations.
              </p>
            </div>

            <div style={{ marginBottom: "24px" }}>
              <label style={{ fontSize: "14px", fontWeight: "500", color: "#6d7175", display: "block", marginBottom: "8px" }}>
                Primary Domain (from Shopify)
              </label>
              <input
                type="text"
                value={shop.shopifyDomain}
                disabled
                style={{
                  width: "100%",
                  padding: "10px 14px",
                  border: "1px solid #e0e0e0",
                  borderRadius: "8px",
                  fontSize: "14px",
                  background: "#f5f5f5",
                  color: "#6d7175",
                }}
              />
            </div>

            <div style={{ marginTop: "32px", padding: "16px", background: "#e3f2fd", borderRadius: "8px" }}>
              <p style={{ fontSize: "14px", color: "#1976d2", margin: 0 }}>
                <strong>🚀 Coming Soon:</strong> Custom domain management will be available in the next update. 
                For now, we use your primary Shopify domain for all scans.
              </p>
            </div>
          </div>
        )}

        {/* Pricing Tab - unchanged */}
        {activeTab === "pricing" && (
          <div>
            <div style={{ marginBottom: "32px", textAlign: "center" }}>
              <h2 style={{ fontSize: "24px", fontWeight: "600", margin: "0 0 8px 0", color: "#202223" }}>
                Choose Your Plan
              </h2>
              <p style={{ fontSize: "16px", color: "#6d7175", margin: 0 }}>
                Scale your AI visibility with the right plan for your business
              </p>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "24px" }}>
              {plans.map((plan) => (
                <div
                  key={plan.id}
                  style={{
                    background: "white",
                    borderRadius: "12px",
                    padding: "24px",
                    boxShadow: plan.recommended ? "0 4px 20px rgba(33, 150, 243, 0.3)" : "0 1px 3px rgba(0,0,0,0.1)",
                    border: plan.recommended ? "2px solid #2196f3" : "2px solid transparent",
                    position: "relative",
                  }}
                >
                  {plan.recommended && (
                    <div
                      style={{
                        position: "absolute",
                        top: "-12px",
                        left: "50%",
                        transform: "translateX(-50%)",
                        background: "#2196f3",
                        color: "white",
                        padding: "4px 16px",
                        borderRadius: "12px",
                        fontSize: "12px",
                        fontWeight: "600",
                      }}
                    >
                      ⭐ RECOMMENDED
                    </div>
                  )}

                  <div style={{ marginBottom: "16px" }}>
                    <h3 style={{ fontSize: "20px", fontWeight: "600", margin: "0 0 8px 0", color: "#202223" }}>
                      {plan.name}
                    </h3>
                    <div style={{ display: "flex", alignItems: "baseline", gap: "4px" }}>
                      <span style={{ fontSize: "32px", fontWeight: "700", color: plan.color }}>
                        {plan.price}
                      </span>
                      {plan.priceDetail && (
                        <span style={{ fontSize: "14px", color: "#6d7175" }}>
                          {plan.priceDetail}
                        </span>
                      )}
                    </div>
                    <div style={{ fontSize: "14px", color: "#6d7175", marginTop: "8px" }}>
                      {plan.credits} AI scans {plan.id !== "TRIAL" && "per month"}
                    </div>
                  </div>

                  <ul style={{ listStyle: "none", padding: 0, margin: "0 0 24px 0" }}>
                    {plan.features.map((feature, index) => (
                      <li key={index} style={{ fontSize: "14px", color: "#202223", marginBottom: "8px", lineHeight: "1.6" }}>
                        {feature}
                      </li>
                    ))}
                  </ul>

                  <button
                    disabled={shop.plan === plan.id}
                    style={{
                      width: "100%",
                      background: shop.plan === plan.id ? "#e0e0e0" : plan.color,
                      color: "white",
                      border: "none",
                      padding: "12px 24px",
                      borderRadius: "8px",
                      fontSize: "14px",
                      fontWeight: "600",
                      cursor: shop.plan === plan.id ? "not-allowed" : "pointer",
                    }}
                  >
                    {shop.plan === plan.id ? "Current Plan" : plan.id === "TRIAL" ? "Start Free Trial" : "Upgrade"}
                  </button>
                </div>
              ))}
            </div>

            <div style={{ marginTop: "32px", background: "white", borderRadius: "12px", padding: "24px", boxShadow: "0 1px 3px rgba(0,0,0,0.1)" }}>
              <h3 style={{ fontSize: "18px", fontWeight: "600", margin: "0 0 16px 0", color: "#202223" }}>
                📊 All Plans Include:
              </h3>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))", gap: "16px" }}>
                <div>
                  <strong>🤖 AI Analysis</strong>
                  <p style={{ fontSize: "14px", color: "#6d7175", margin: "4px 0 0 0" }}>
                    ChatGPT & Google Gemini scanning
                  </p>
                </div>
                <div>
                  <strong>📊 Detailed Reports</strong>
                  <p style={{ fontSize: "14px", color: "#6d7175", margin: "4px 0 0 0" }}>
                    Citation analysis & competitor tracking
                  </p>
                </div>
                <div>
                  <strong>🔄 Real-time Updates</strong>
                  <p style={{ fontSize: "14px", color: "#6d7175", margin: "4px 0 0 0" }}>
                    Instant scan results
                  </p>
                </div>
                <div>
                  <strong>📈 Performance Tracking</strong>
                  <p style={{ fontSize: "14px", color: "#6d7175", margin: "4px 0 0 0" }}>
                    Monitor your AI visibility over time
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
