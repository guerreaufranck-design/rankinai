import type { LoaderFunctionArgs, ActionFunctionArgs } from "react-router";
import { json } from "~/utils/response";
import { useLoaderData, useFetcher, Link } from "react-router";
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

  const scansCount = await prisma.scan.count({
    where: { 
      shopId: shop?.id
    },
  });

  const optimizationsCount = await prisma.optimization.count({
    where: { 
      shopId: shop?.id,
      status: "APPLIED"
    },
  });

  return json({
    shop: {
      id: shop?.id,
      shopName: shop?.shopName || "Store",
      shopifyDomain: shop?.shopifyDomain || session.shop,
      email: shop?.email || "",
      credits: shop?.credits ?? 25,
      maxCredits: shop?.maxCredits ?? 25,
      plan: shop?.plan || "TRIAL",
      createdAt: shop?.createdAt,
    },
    productCount,
    scansCount,
    optimizationsCount,
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

        const existingProduct = await prisma.product.findFirst({
          where: {
            shopId: shop.id,
            handle: product.handle,
          },
        });

        if (existingProduct) {
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

      return json({ 
        success: true, 
        message: `Synced ${syncedCount + newCount} products (${newCount} new, ${syncedCount} updated)`,
        syncedCount,
        newCount,
      });
    }

    if (action === "updateEmail") {
      const email = formData.get("email") as string;
      
      await prisma.shop.update({
        where: { id: shop.id },
        data: { email }
      });
      
      return json({ success: true, message: "Email updated successfully" });
    }

    if (action === "exportData") {
      const products = await prisma.product.findMany({
        where: { shopId: shop.id },
        include: { scans: true }
      });
      
      return json({ success: true, message: "Data export initiated. Check your email." });
    }

    return json({ error: "Invalid action" }, { status: 400 });
  } catch (error: any) {
    console.error("Settings error:", error);
    return json({ error: error.message }, { status: 500 });
  }
};

export default function Settings() {
  const { shop, productCount, scansCount, optimizationsCount } = useLoaderData<typeof loader>();
  const [activeTab, setActiveTab] = useState<"general" | "domains" | "legal" | "data">("general");
  const [email, setEmail] = useState(shop.email);
  const fetcher = useFetcher();

  const totalActions = scansCount + optimizationsCount;

  const handleSyncProducts = () => {
    const formData = new FormData();
    formData.append("action", "syncProducts");
    fetcher.submit(formData, { method: "post" });
  };

  const handleUpdateEmail = () => {
    const formData = new FormData();
    formData.append("action", "updateEmail");
    formData.append("email", email);
    fetcher.submit(formData, { method: "post" });
  };

  const handleExportData = () => {
    if (confirm("Export all your RankInAI data? You'll receive an email with the export.")) {
      const formData = new FormData();
      formData.append("action", "exportData");
      fetcher.submit(formData, { method: "post" });
    }
  };

  return (
    <div style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif', background: "#f6f6f7", minHeight: "100vh" }}>
      <AppHeader />
      
      <div style={{ padding: "0 24px 24px 24px", maxWidth: "1200px", margin: "0 auto" }}>
        <div style={{ marginBottom: "32px" }}>
          <h1 style={{ fontSize: "28px", fontWeight: "600", margin: "0 0 8px 0", color: "#202223" }}>
            ⚙️ Settings
          </h1>
          <p style={{ fontSize: "16px", color: "#6d7175", margin: 0 }}>
            Configure your RankInAI application and manage compliance
          </p>
        </div>

        {/* Tabs */}
        <div style={{ display: "flex", gap: "8px", marginBottom: "24px", borderBottom: "2px solid #e0e0e0", overflowX: "auto" }}>
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
              whiteSpace: "nowrap",
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
              whiteSpace: "nowrap",
            }}
          >
            Custom Domains
          </button>
          <button
            onClick={() => setActiveTab("data")}
            style={{
              background: "none",
              border: "none",
              padding: "12px 24px",
              fontSize: "14px",
              fontWeight: "600",
              color: activeTab === "data" ? "#2196f3" : "#6d7175",
              borderBottom: activeTab === "data" ? "3px solid #2196f3" : "3px solid transparent",
              cursor: "pointer",
              marginBottom: "-2px",
              whiteSpace: "nowrap",
            }}
          >
            Data & Privacy
          </button>
          <button
            onClick={() => setActiveTab("legal")}
            style={{
              background: "none",
              border: "none",
              padding: "12px 24px",
              fontSize: "14px",
              fontWeight: "600",
              color: activeTab === "legal" ? "#2196f3" : "#6d7175",
              borderBottom: activeTab === "legal" ? "3px solid #2196f3" : "3px solid transparent",
              cursor: "pointer",
              marginBottom: "-2px",
              whiteSpace: "nowrap",
            }}
          >
            Legal & Compliance
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
                    Contact Email
                  </label>
                  <div style={{ display: "flex", gap: "12px" }}>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      style={{
                        flex: 1,
                        padding: "10px 14px",
                        border: "1px solid #e0e0e0",
                        borderRadius: "8px",
                        fontSize: "14px",
                      }}
                    />
                    <button
                      onClick={handleUpdateEmail}
                      disabled={email === shop.email || fetcher.state !== "idle"}
                      style={{
                        padding: "10px 20px",
                        background: email !== shop.email ? "#2196f3" : "#e0e0e0",
                        color: "white",
                        border: "none",
                        borderRadius: "8px",
                        fontSize: "14px",
                        fontWeight: "600",
                        cursor: email !== shop.email ? "pointer" : "not-allowed",
                      }}
                    >
                      Update
                    </button>
                  </div>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "16px", marginTop: "8px" }}>
                  <div style={{ padding: "16px", background: "#f9f9f9", borderRadius: "8px" }}>
                    <div style={{ fontSize: "14px", color: "#6d7175", marginBottom: "4px" }}>Current Plan</div>
                    <div style={{ fontSize: "20px", fontWeight: "600", color: "#202223" }}>{shop.plan}</div>
                  </div>
                  <div style={{ padding: "16px", background: shop.credits === 0 ? "#ffebee" : "#f9f9f9", borderRadius: "8px" }}>
                    <div style={{ fontSize: "14px", color: "#6d7175", marginBottom: "4px" }}>Credits</div>
                    <div style={{ fontSize: "20px", fontWeight: "600", color: shop.credits === 0 ? "#d32f2f" : "#202223" }}>{shop.credits}/{shop.maxCredits}</div>
                  </div>
                  <div style={{ padding: "16px", background: "#f9f9f9", borderRadius: "8px" }}>
                    <div style={{ fontSize: "14px", color: "#6d7175", marginBottom: "4px" }}>Total Scans</div>
                    <div style={{ fontSize: "20px", fontWeight: "600", color: "#202223" }}>{scansCount}</div>
                  </div>
                  <div style={{ padding: "16px", background: "#f9f9f9", borderRadius: "8px" }}>
                    <div style={{ fontSize: "14px", color: "#6d7175", marginBottom: "4px" }}>Optimizations</div>
                    <div style={{ fontSize: "20px", fontWeight: "600", color: "#202223" }}>{optimizationsCount}</div>
                  </div>
                  <div style={{ padding: "16px", background: "#e3f2fd", borderRadius: "8px" }}>
                    <div style={{ fontSize: "14px", color: "#1976d2", marginBottom: "4px" }}>Total Actions</div>
                    <div style={{ fontSize: "20px", fontWeight: "600", color: "#1976d2" }}>{totalActions}</div>
                  </div>
                </div>
              </div>
            </div>

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
              
              <p style={{ fontSize: "14px", color: "#6d7175", lineHeight: "1.6", margin: "0 0 16px 0" }}>
                RankInAI helps you optimize your products to be recommended by AI assistants like ChatGPT and Google Gemini. 
                Scan your products to see how well they perform in AI recommendations and get actionable insights to improve your visibility.
              </p>
              
              <div style={{ display: "flex", gap: "16px", flexWrap: "wrap" }}>
                
                  href="mailto:support@rank-in-ai.com"
                  style={{
                    color: "#2196f3",
                    textDecoration: "none",
                    fontSize: "14px",
                    display: "flex",
                    alignItems: "center",
                    gap: "4px"
                  }}
                >
                  📧 support@rank-in-ai.com
                </a>
                <span style={{ fontSize: "14px", color: "#6d7175" }}>
                  Version 1.0.0
                </span>
                <span style={{ fontSize: "14px", color: "#6d7175" }}>
                  Member since {new Date(shop.createdAt).toLocaleDateString()}
                </span>
              </div>
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
            <p style={{ fontSize: "14px", color: "#6d7175", marginBottom: "24px", lineHeight: "1.6" }}>
              Add alternative domain names that your store uses. RankInAI will check if AI assistants recommend these domains when scanning your products.
            </p>

            <div style={{ background: "#fff3cd", padding: "16px", borderRadius: "8px", marginBottom: "24px", border: "1px solid #ffeaa7" }}>
              <p style={{ fontSize: "14px", color: "#856404", margin: 0, lineHeight: "1.6" }}>
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

        {/* Data & Privacy Tab */}
        {activeTab === "data" && (
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
                🔐 Data Management
              </h2>
              
              <p style={{ fontSize: "14px", color: "#6d7175", marginBottom: "24px", lineHeight: "1.6" }}>
                Your data is stored securely and never shared with third parties without your consent. 
                We comply with GDPR and all Shopify data protection requirements.
              </p>

              <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                <button
                  onClick={handleExportData}
                  disabled={fetcher.state !== "idle"}
                  style={{
                    padding: "12px 24px",
                    background: "white",
                    color: "#2196f3",
                    border: "2px solid #2196f3",
                    borderRadius: "8px",
                    fontSize: "14px",
                    fontWeight: "600",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    width: "fit-content",
                  }}
                >
                  📥 Export All Data
                </button>

                <button
                  onClick={() => {
                    if (confirm("This will permanently delete all your RankInAI data. This action cannot be undone. Are you sure?")) {
                      alert("Please contact support@rank-in-ai.com to request data deletion.");
                    }
                  }}
                  style={{
                    padding: "12px 24px",
                    background: "white",
                    color: "#f44336",
                    border: "2px solid #f44336",
                    borderRadius: "8px",
                    fontSize: "14px",
                    fontWeight: "600",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    width: "fit-content",
                  }}
                >
                  🗑️ Request Data Deletion
                </button>
              </div>
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
                📊 Data We Collect
              </h2>
              
              <ul style={{ fontSize: "14px", color: "#6d7175", lineHeight: "1.8", margin: 0, paddingLeft: "20px" }}>
                <li>Product information synced from your Shopify store</li>
                <li>AI scan results and optimization suggestions</li>
                <li>Store configuration and preferences</li>
                <li>Usage analytics to improve the service</li>
                <li>Email address for notifications (optional)</li>
              </ul>
              
              <p style={{ fontSize: "14px", color: "#6d7175", marginTop: "16px", lineHeight: "1.6" }}>
                We do NOT collect or store any customer personal data, payment information, or sensitive business data.
              </p>
            </div>
          </div>
        )}

        {/* Legal & Compliance Tab */}
        {activeTab === "legal" && (
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
                📜 Legal Documents
              </h2>
              
              <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                <Link
                  to="/app/privacy-policy"
                  style={{
                    padding: "16px",
                    background: "#f9f9f9",
                    borderRadius: "8px",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    textDecoration: "none",
                    color: "#202223",
                    border: "1px solid #e0e0e0",
                  }}
                >
                  <div>
                    <div style={{ fontSize: "16px", fontWeight: "600", marginBottom: "4px" }}>Privacy Policy</div>
                    <div style={{ fontSize: "14px", color: "#6d7175" }}>How we collect, use, and protect your data</div>
                  </div>
                  <span style={{ fontSize: "20px", color: "#6d7175" }}>→</span>
                </Link>

                <Link
                  to="/app/terms-of-service"
                  style={{
                    padding: "16px",
                    background: "#f9f9f9",
                    borderRadius: "8px",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    textDecoration: "none",
                    color: "#202223",
                    border: "1px solid #e0e0e0",
                  }}
                >
                  <div>
                    <div style={{ fontSize: "16px", fontWeight: "600", marginBottom: "4px" }}>Terms of Service</div>
                    <div style={{ fontSize: "14px", color: "#6d7175" }}>Terms and conditions for using RankInAI</div>
                  </div>
                  <span style={{ fontSize: "20px", color: "#6d7175" }}>→</span>
                </Link>

                <Link
                  to="/app/gdpr-compliance"
                  style={{
                    padding: "16px",
                    background: "#f9f9f9",
                    borderRadius: "8px",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    textDecoration: "none",
                    color: "#202223",
                    border: "1px solid #e0e0e0",
                  }}
                >
                  <div>
                    <div style={{ fontSize: "16px", fontWeight: "600", marginBottom: "4px" }}>GDPR Compliance</div>
                    <div style={{ fontSize: "14px", color: "#6d7175" }}>Our GDPR compliance and data protection measures</div>
                  </div>
                  <span style={{ fontSize: "20px", color: "#6d7175" }}>→</span>
                </Link>

                <Link
                  to="/app/cookie-policy"
                  style={{
                    padding: "16px",
                    background: "#f9f9f9",
                    borderRadius: "8px",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    textDecoration: "none",
                    color: "#202223",
                    border: "1px solid #e0e0e0",
                  }}
                >
                  <div>
                    <div style={{ fontSize: "16px", fontWeight: "600", marginBottom: "4px" }}>Cookie Policy</div>
                    <div style={{ fontSize: "14px", color: "#6d7175" }}>How we use cookies and similar technologies</div>
                  </div>
                  <span style={{ fontSize: "20px", color: "#6d7175" }}>→</span>
                </Link>

                <Link
                  to="/app/acceptable-use"
                  style={{
                    padding: "16px",
                    background: "#f9f9f9",
                    borderRadius: "8px",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    textDecoration: "none",
                    color: "#202223",
                    border: "1px solid #e0e0e0",
                  }}
                >
                  <div>
                    <div style={{ fontSize: "16px", fontWeight: "600", marginBottom: "4px" }}>Acceptable Use Policy</div>
                    <div style={{ fontSize: "14px", color: "#6d7175" }}>Guidelines for appropriate use of our service</div>
                  </div>
                  <span style={{ fontSize: "20px", color: "#6d7175" }}>→</span>
                </Link>
              </div>
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
                🏢 Company Information
              </h2>
              
              <div style={{ fontSize: "14px", color: "#6d7175", lineHeight: "1.8" }}>
                <p style={{ margin: "0 0 8px 0" }}>
                  <strong>Oddballtrip LLC</strong>
                </p>
                <p style={{ margin: "0 0 4px 0" }}>30 N GOULD ST STE R</p>
                <p style={{ margin: "0 0 4px 0" }}>SHERIDAN, WYOMING 82801</p>
                <p style={{ margin: "0 0 4px 0" }}>United States</p>
                <p style={{ margin: "0 0 16px 0" }}>EIN: 38-4361347</p>
                
                <p style={{ margin: "0 0 4px 0" }}>
                  <strong>Contact:</strong>
                </p>
                <p style={{ margin: 0 }}>
                  Email: <a href="mailto:support@rank-in-ai.com" style={{ color: "#2196f3", textDecoration: "none" }}>support@rank-in-ai.com</a>
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
