import type { LoaderFunctionArgs } from "react-router";
import { json } from "@remix-run/node";
import { useLoaderData, Link } from "react-router";
import { authenticate } from "~/shopify.server";
import { prisma } from "~/db.server";
import AppHeader from "~/components/AppHeader";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session } = await authenticate.admin(request);

  const shop = await prisma.shop.findFirst({
    where: { shopifyDomain: session.shop },
  });

  if (!shop) {
    return json({
      shop: { shopName: "Store", credits: 25, maxCredits: 25 },
      stats: { totalProducts: 0, avgCitationRate: 0, needsAttention: 0 },
      topPerformers: [],
    });
  }

  const products = await prisma.product.findMany({
    where: { shopId: shop.id },
    select: {
      id: true,
      title: true,
      citationRate: true,
      chatgptRate: true,
      geminiRate: true,
      totalScans: true,
    },
    orderBy: { citationRate: "desc" },
  });

  const totalProducts = products.length;
  const avgCitationRate = totalProducts > 0
    ? Math.round(products.reduce((sum, p) => sum + p.citationRate, 0) / totalProducts)
    : 0;
  const needsAttention = products.filter(p => p.citationRate < 40).length;

  const topPerformers = products.slice(0, 5);

  return json({
    shop: {
      shopName: shop.shopName,
      credits: shop.credits,
      maxCredits: shop.maxCredits,
    },
    stats: { totalProducts, avgCitationRate, needsAttention },
    topPerformers,
  });
};

export default function Dashboard() {
  const { shop, stats, topPerformers } = useLoaderData<typeof loader>();

  const getStatusColor = (rate: number) => {
    if (rate >= 70) return "#4caf50";
    if (rate >= 40) return "#ff9800";
    return "#f44336";
  };

  const getStatusEmoji = (rate: number) => {
    if (rate >= 70) return "🔥";
    if (rate >= 40) return "📈";
    return "⚠️";
  };

  return (
    <div style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif', background: "#f6f6f7", minHeight: "100vh" }}>
      <AppHeader />
      
      <div style={{ padding: "0 24px 24px 24px" }}>
        <div style={{ marginBottom: "32px" }}>
          <h1 style={{ fontSize: "28px", fontWeight: "600", margin: "0 0 8px 0", color: "#202223" }}>
            RankInAI Dashboard
          </h1>
          <p style={{ fontSize: "16px", color: "#6d7175", margin: 0 }}>
            Welcome back, {shop.shopName}! 👋
          </p>
        </div>

        {/* Stats Cards */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))", gap: "24px", marginBottom: "32px" }}>
          <div style={{ background: "white", borderRadius: "12px", padding: "24px", boxShadow: "0 1px 3px rgba(0,0,0,0.1)" }}>
            <div style={{ fontSize: "14px", color: "#6d7175", marginBottom: "8px" }}>💳 Credits</div>
            <div style={{ fontSize: "32px", fontWeight: "700", color: "#202223", marginBottom: "8px" }}>
              {shop.credits}/{shop.maxCredits}
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <div style={{ flex: 1, height: "8px", background: "#e0e0e0", borderRadius: "4px", overflow: "hidden" }}>
                <div style={{ width: `${(shop.credits / shop.maxCredits) * 100}%`, height: "100%", background: shop.credits > 10 ? "#4caf50" : "#f44336", borderRadius: "4px" }} />
              </div>
            </div>
            <div style={{ fontSize: "13px", color: "#6d7175", marginTop: "8px" }}>
              {shop.credits > 10 ? "✅ All good" : "⚠️ Running low"}
            </div>
          </div>

          <div style={{ background: "white", borderRadius: "12px", padding: "24px", boxShadow: "0 1px 3px rgba(0,0,0,0.1)" }}>
            <div style={{ fontSize: "14px", color: "#6d7175", marginBottom: "8px" }}>📊 Avg Citation Rate</div>
            <div style={{ fontSize: "32px", fontWeight: "700", color: getStatusColor(stats.avgCitationRate), marginBottom: "8px" }}>
              {stats.avgCitationRate}%
            </div>
            <div style={{ fontSize: "13px", color: "#6d7175" }}>
              {getStatusEmoji(stats.avgCitationRate)} {stats.avgCitationRate >= 70 ? "Excellent!" : stats.avgCitationRate >= 40 ? "Good progress" : "Needs improvement"}
            </div>
          </div>

          <div style={{ background: "white", borderRadius: "12px", padding: "24px", boxShadow: "0 1px 3px rgba(0,0,0,0.1)" }}>
            <div style={{ fontSize: "14px", color: "#6d7175", marginBottom: "8px" }}>📦 Products</div>
            <div style={{ fontSize: "32px", fontWeight: "700", color: "#202223", marginBottom: "8px" }}>
              {stats.totalProducts}
            </div>
            <Link to="/app/products" style={{ fontSize: "13px", color: "#2196f3", textDecoration: "none", fontWeight: "500" }}>
              View all →
            </Link>
          </div>

          <div style={{ background: "white", borderRadius: "12px", padding: "24px", boxShadow: "0 1px 3px rgba(0,0,0,0.1)" }}>
            <div style={{ fontSize: "14px", color: "#6d7175", marginBottom: "8px" }}>⚠️ Needs Attention</div>
            <div style={{ fontSize: "32px", fontWeight: "700", color: stats.needsAttention > 0 ? "#f44336" : "#4caf50", marginBottom: "8px" }}>
              {stats.needsAttention}
            </div>
            <div style={{ fontSize: "13px", color: "#6d7175" }}>
              {stats.needsAttention === 0 ? "🎉 All good!" : "Products below 40%"}
            </div>
          </div>
        </div>

        {/* Top Performers */}
        <div style={{ background: "white", borderRadius: "12px", padding: "24px", boxShadow: "0 1px 3px rgba(0,0,0,0.1)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px" }}>
            <h2 style={{ fontSize: "20px", fontWeight: "600", margin: 0, color: "#202223" }}>
              🏆 Top Performers
            </h2>
            <Link to="/app/products" style={{ fontSize: "14px", color: "#2196f3", textDecoration: "none", fontWeight: "500" }}>
              View all →
            </Link>
          </div>

          {topPerformers.length === 0 ? (
            <div style={{ textAlign: "center", padding: "40px 20px" }}>
              <p style={{ fontSize: "16px", color: "#9e9e9e", margin: 0 }}>
                No products scanned yet. Start scanning to see your top performers!
              </p>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              {topPerformers.map((product, index) => (
                <div key={product.id} style={{ display: "flex", alignItems: "center", gap: "16px", padding: "16px", background: "#f9f9f9", borderRadius: "8px" }}>
                  <div style={{ fontSize: "20px", fontWeight: "700", color: "#9e9e9e", minWidth: "40px" }}>
                    #{index + 1}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: "15px", fontWeight: "600", color: "#202223", marginBottom: "4px" }}>
                      {product.title}
                    </div>
                    <div style={{ display: "flex", gap: "12px", fontSize: "13px" }}>
                      <span style={{ background: "#e3f2fd", color: "#1976d2", padding: "2px 8px", borderRadius: "4px" }}>
                        ChatGPT: {product.chatgptRate}%
                      </span>
                      <span style={{ background: "#e8f5e9", color: "#388e3c", padding: "2px 8px", borderRadius: "4px" }}>
                        Gemini: {product.geminiRate}%
                      </span>
                      <span style={{ color: "#6d7175" }}>
                        {product.totalScans} scans
                      </span>
                    </div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontSize: "24px", fontWeight: "700", color: getStatusColor(product.citationRate) }}>
                      {product.citationRate}%
                    </div>
                    <div style={{ fontSize: "11px", color: "#6d7175" }}>Citation Rate</div>
                  </div>
                  <Link
                    to="/app/products"
                    style={{
                      background: "#2196f3",
                      color: "white",
                      border: "none",
                      padding: "8px 16px",
                      borderRadius: "6px",
                      fontSize: "13px",
                      fontWeight: "600",
                      textDecoration: "none",
                      display: "inline-block",
                    }}
                  >
                    Optimize
                  </Link>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
