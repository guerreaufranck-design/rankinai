import type { LoaderFunctionArgs } from "react-router";
import { json } from "@remix-run/node";
import { useLoaderData, Link } from "react-router";
import { authenticate } from "~/shopify.server";
import { prisma } from "~/db.server";
import { useState } from "react";
import AppHeader from "~/components/AppHeader";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session } = await authenticate.admin(request);

  const shop = await prisma.shop.findFirst({
    where: { shopifyDomain: session.shop },
  });

  if (!shop) {
    return json({ 
      products: [],
      recentScans: [],
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

  const recentScans = await prisma.scan.findMany({
    where: { shopId: shop.id },
    select: {
      id: true,
      platform: true,
      isCited: true,
      confidence: true,
      competitors: true,
      createdAt: true,
      Product: {
        select: {
          title: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  return json({
    products,
    recentScans,
  });
};

export default function Analyze() {
  const { products, recentScans } = useLoaderData<typeof loader>();
  const [selectedProduct, setSelectedProduct] = useState<string>("all");
  const [selectedPlatform, setSelectedPlatform] = useState<string>("all");

  const filteredScans = recentScans.filter(scan => {
    const matchesProduct = selectedProduct === "all" || scan.Product.title === selectedProduct;
    const matchesPlatform = selectedPlatform === "all" || scan.platform === selectedPlatform;
    return matchesProduct && matchesPlatform;
  });

  const stats = {
    totalScans: recentScans.length,
    citedScans: recentScans.filter(s => s.isCited).length,
    avgScore: recentScans.length > 0 
      ? Math.round((recentScans.reduce((sum, s) => sum + (s.confidence || 0), 0) / recentScans.length) * 100)
      : 0,
    competitorMentions: recentScans.reduce((sum, s) => sum + (s.competitors?.length || 0), 0),
  };

  const getScoreColor = (score: number) => {
    if (score >= 0.7) return "#4caf50";
    if (score >= 0.4) return "#ff9800";
    return "#f44336";
  };

  return (
    <div style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif', background: "#f6f6f7", minHeight: "100vh" }}>
      <AppHeader />
      
      <div style={{ padding: "0 24px 24px 24px" }}>
        <div style={{ marginBottom: "32px" }}>
          <h1 style={{ fontSize: "28px", fontWeight: "600", margin: "0 0 8px 0", color: "#202223" }}>
            🔍 Analyze
          </h1>
          <p style={{ fontSize: "16px", color: "#6d7175", margin: 0 }}>
            Deep dive into your AI citation performance
          </p>
        </div>

        {/* Stats Cards */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))", gap: "24px", marginBottom: "32px" }}>
          <div style={{ background: "white", borderRadius: "12px", padding: "24px", boxShadow: "0 1px 3px rgba(0,0,0,0.1)" }}>
            <div style={{ fontSize: "14px", color: "#6d7175", marginBottom: "8px" }}>📊 Total Scans</div>
            <div style={{ fontSize: "32px", fontWeight: "700", color: "#202223" }}>{stats.totalScans}</div>
          </div>

          <div style={{ background: "white", borderRadius: "12px", padding: "24px", boxShadow: "0 1px 3px rgba(0,0,0,0.1)" }}>
            <div style={{ fontSize: "14px", color: "#6d7175", marginBottom: "8px" }}>✅ Citations</div>
            <div style={{ fontSize: "32px", fontWeight: "700", color: "#4caf50" }}>{stats.citedScans}</div>
            <div style={{ fontSize: "13px", color: "#6d7175", marginTop: "4px" }}>
              {stats.totalScans > 0 ? Math.round((stats.citedScans / stats.totalScans) * 100) : 0}% success rate
            </div>
          </div>

          <div style={{ background: "white", borderRadius: "12px", padding: "24px", boxShadow: "0 1px 3px rgba(0,0,0,0.1)" }}>
            <div style={{ fontSize: "14px", color: "#6d7175", marginBottom: "8px" }}>🎯 Avg Score</div>
            <div style={{ fontSize: "32px", fontWeight: "700", color: getScoreColor(stats.avgScore / 100) }}>{stats.avgScore}%</div>
          </div>

          <div style={{ background: "white", borderRadius: "12px", padding: "24px", boxShadow: "0 1px 3px rgba(0,0,0,0.1)" }}>
            <div style={{ fontSize: "14px", color: "#6d7175", marginBottom: "8px" }}>⚠️ Competitor Mentions</div>
            <div style={{ fontSize: "32px", fontWeight: "700", color: "#f44336" }}>{stats.competitorMentions}</div>
          </div>
        </div>

        {/* Filters */}
        <div style={{ background: "white", borderRadius: "12px", padding: "16px", boxShadow: "0 1px 3px rgba(0,0,0,0.1)", marginBottom: "24px", display: "flex", gap: "12px", flexWrap: "wrap" }}>
          <select
            value={selectedProduct}
            onChange={(e) => setSelectedProduct(e.target.value)}
            style={{
              flex: 1,
              minWidth: "200px",
              padding: "10px 14px",
              border: "1px solid #e0e0e0",
              borderRadius: "8px",
              fontSize: "14px",
              background: "white",
            }}
          >
            <option value="all">All Products</option>
            {products.map(p => (
              <option key={p.id} value={p.title}>{p.title}</option>
            ))}
          </select>

          <select
            value={selectedPlatform}
            onChange={(e) => setSelectedPlatform(e.target.value)}
            style={{
              flex: 1,
              minWidth: "200px",
              padding: "10px 14px",
              border: "1px solid #e0e0e0",
              borderRadius: "8px",
              fontSize: "14px",
              background: "white",
            }}
          >
            <option value="all">All Platforms</option>
            <option value="CHATGPT">ChatGPT</option>
            <option value="GEMINI">Gemini</option>
          </select>
        </div>

        {/* Scan History */}
        <div style={{ background: "white", borderRadius: "12px", padding: "24px", boxShadow: "0 1px 3px rgba(0,0,0,0.1)" }}>
          <h2 style={{ fontSize: "20px", fontWeight: "600", margin: "0 0 24px 0", color: "#202223" }}>
            📋 Scan History
          </h2>

          {filteredScans.length === 0 ? (
            <div style={{ textAlign: "center", padding: "60px 20px" }}>
              <p style={{ fontSize: "16px", color: "#9e9e9e", margin: 0 }}>
                No scans found. <Link to="/app/products" style={{ color: "#2196f3", textDecoration: "none" }}>Start scanning products →</Link>
              </p>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              {filteredScans.map((scan) => (
                <div 
                  key={scan.id} 
                  style={{ 
                    padding: "16px", 
                    background: "#f9f9f9", 
                    borderRadius: "8px",
                    borderLeft: `4px solid ${scan.isCited ? "#4caf50" : "#f44336"}`
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "8px" }}>
                    <div>
                      <div style={{ fontSize: "15px", fontWeight: "600", color: "#202223", marginBottom: "4px" }}>
                        {scan.Product.title}
                      </div>
                      <div style={{ display: "flex", gap: "12px", fontSize: "13px", color: "#6d7175" }}>
                        <span style={{ 
                          background: scan.platform === "CHATGPT" ? "#e3f2fd" : "#e8f5e9", 
                          color: scan.platform === "CHATGPT" ? "#1976d2" : "#388e3c",
                          padding: "2px 8px",
                          borderRadius: "4px",
                          fontWeight: "500"
                        }}>
                          {scan.platform}
                        </span>
                        <span>{new Date(scan.createdAt).toLocaleString()}</span>
                      </div>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <div style={{ fontSize: "24px", fontWeight: "700", color: getScoreColor(scan.confidence || 0) }}>
                        {Math.round((scan.confidence || 0) * 100)}%
                      </div>
                      <div style={{ fontSize: "11px", color: "#6d7175" }}>
                        {scan.isCited ? "✅ Cited" : "❌ Not cited"}
                      </div>
                    </div>
                  </div>
                  
                  {scan.competitors && scan.competitors.length > 0 && (
                    <div style={{ fontSize: "13px", color: "#f44336", marginTop: "8px" }}>
                      ⚠️ Competitors mentioned: {scan.competitors.join(", ")}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Product Performance */}
        {products.length > 0 && (
          <div style={{ background: "white", borderRadius: "12px", padding: "24px", boxShadow: "0 1px 3px rgba(0,0,0,0.1)", marginTop: "24px" }}>
            <h2 style={{ fontSize: "20px", fontWeight: "600", margin: "0 0 24px 0", color: "#202223" }}>
              📊 Product Performance
            </h2>

            <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              {products.map((product) => (
                <div key={product.id} style={{ padding: "16px", background: "#f9f9f9", borderRadius: "8px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div>
                      <div style={{ fontSize: "15px", fontWeight: "600", color: "#202223", marginBottom: "8px" }}>
                        {product.title}
                      </div>
                      <div style={{ display: "flex", gap: "12px", fontSize: "13px" }}>
                        <span style={{ background: "#e3f2fd", color: "#1976d2", padding: "2px 8px", borderRadius: "4px", fontWeight: "500" }}>
                          ChatGPT: {product.chatgptRate}%
                        </span>
                        <span style={{ background: "#e8f5e9", color: "#388e3c", padding: "2px 8px", borderRadius: "4px", fontWeight: "500" }}>
                          Gemini: {product.geminiRate}%
                        </span>
                        <span style={{ color: "#6d7175" }}>
                          {product.totalScans} scans
                        </span>
                      </div>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <div style={{ fontSize: "28px", fontWeight: "700", color: getScoreColor(product.citationRate / 100) }}>
                        {product.citationRate}%
                      </div>
                      <Link 
                        to="/app/optimize"
                        style={{
                          display: "inline-block",
                          marginTop: "8px",
                          background: "#2196f3",
                          color: "white",
                          padding: "6px 16px",
                          borderRadius: "6px",
                          fontSize: "12px",
                          fontWeight: "600",
                          textDecoration: "none",
                        }}
                      >
                        Optimize →
                      </Link>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
