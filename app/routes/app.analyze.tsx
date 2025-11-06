import type { LoaderFunctionArgs } from "react-router";
import { json } from "@remix-run/node";
import { useLoaderData, Link } from "react-router";
import { authenticate } from "~/shopify.server";
import { prisma } from "~/db.server";
import { useState, useMemo } from "react";
import AppHeader from "~/components/AppHeader";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session } = await authenticate.admin(request);

  const shop = await prisma.shop.findFirst({
    where: { shopifyDomain: session.shop },
  });

  if (!shop) {
    return json({ 
      products: [],
      scans: [],
      optimizations: [],
      shop: null,
    });
  }

  // Récupérer tous les produits avec leurs données
  const products = await prisma.product.findMany({
    where: { shopId: shop.id },
    select: {
      id: true,
      title: true,
      citationRate: true,
      chatgptRate: true,
      geminiRate: true,
      totalScans: true,
      lastOptimizedAt: true,
      createdAt: true,
      tags: true,
    },
    orderBy: { citationRate: "desc" },
  });

  // Récupérer les scans récents pour l'historique
  const scans = await prisma.scan.findMany({
    where: { shopId: shop.id },
    select: {
      id: true,
      platform: true,
      isCited: true,
      confidence: true,
      competitors: true,
      createdAt: true,
      productId: true,
    },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  // Récupérer l'historique des optimisations
  const optimizations = await prisma.optimization.findMany({
    where: { shopId: shop.id },
    select: {
      id: true,
      productId: true,
      field: true,
      oldValue: true,
      newValue: true,
      appliedAt: true,
    },
    orderBy: { appliedAt: "desc" },
    take: 50,
  });

  return json({
    products,
    scans,
    optimizations,
    shop: {
      id: shop.id,
      shopName: shop.shopName,
      credits: shop.credits,
      maxCredits: shop.maxCredits,
    },
  });
};

export default function Analyze() {
  const { products, scans, optimizations, shop } = useLoaderData<typeof loader>();
  const [timeRange, setTimeRange] = useState<"7d" | "30d" | "all">("30d");
  const [selectedMetric, setSelectedMetric] = useState<"citations" | "optimizations" | "roi">("citations");

  // Fonction sécurisée pour filtrer par période
  const filterByTimeRange = (date: string | null | undefined) => {
    if (!date) return timeRange === "all"; // Si pas de date et "all" sélectionné, inclure
    
    try {
      const d = new Date(date);
      if (isNaN(d.getTime())) return false; // Date invalide
      
      const now = new Date();
      const diff = now.getTime() - d.getTime();
      const days = diff / (1000 * 60 * 60 * 24);
      
      if (timeRange === "7d") return days <= 7;
      if (timeRange === "30d") return days <= 30;
      return true;
    } catch {
      return false;
    }
  };

  // Calculs des métriques clés avec gestion des erreurs
  const metrics = useMemo(() => {
    const optimizedProducts = products.filter(p => p.lastOptimizedAt);
    const nonOptimizedProducts = products.filter(p => !p.lastOptimizedAt);
    
    // Calculs sécurisés des moyennes
    const avgOptimizedScore = optimizedProducts.length > 0
      ? optimizedProducts.reduce((sum, p) => sum + (p.citationRate || 0), 0) / optimizedProducts.length
      : 0;
    
    const avgNonOptimizedScore = nonOptimizedProducts.length > 0
      ? nonOptimizedProducts.reduce((sum, p) => sum + (p.citationRate || 0), 0) / nonOptimizedProducts.length
      : 0;

    const improvement = avgOptimizedScore - avgNonOptimizedScore;

    // Calcul du ROI estimé
    const estimatedROI = optimizedProducts.length > 0
      ? (improvement / 100) * optimizedProducts.length * 100
      : 0;

    // Tendances sur la période sélectionnée
    const recentScans = scans.filter(s => filterByTimeRange(s.createdAt));
    const citationTrend = recentScans.length > 0
      ? (recentScans.filter(s => s.isCited).length / recentScans.length) * 100
      : 0;

    // Analyse des concurrents
    const competitorAnalysis = scans.reduce((acc, scan) => {
      if (scan.competitors && Array.isArray(scan.competitors) && scan.competitors.length > 0) {
        scan.competitors.forEach((comp: any) => {
          if (typeof comp === 'string' && comp.trim()) {
            acc[comp] = (acc[comp] || 0) + 1;
          }
        });
      }
      return acc;
    }, {} as Record<string, number>);

    const topCompetitors = Object.entries(competitorAnalysis)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5);

    // Produits nécessitant une attention
    const needsAttention = products
      .filter(p => (p.citationRate || 0) < 30 && !p.lastOptimizedAt)
      .slice(0, 5);

    // Meilleurs performers
    const topPerformers = products
      .filter(p => p.lastOptimizedAt)
      .sort((a, b) => (b.citationRate || 0) - (a.citationRate || 0))
      .slice(0, 5);

    // Calcul du taux d'optimisation par plateforme
    const chatgptPerformance = products.length > 0
      ? products.reduce((sum, p) => sum + (p.chatgptRate || 0), 0) / products.length
      : 0;
    
    const geminiPerformance = products.length > 0
      ? products.reduce((sum, p) => sum + (p.geminiRate || 0), 0) / products.length
      : 0;

    return {
      optimizedProducts: optimizedProducts.length,
      nonOptimizedProducts: nonOptimizedProducts.length,
      avgOptimizedScore,
      avgNonOptimizedScore,
      improvement,
      estimatedROI,
      citationTrend,
      topCompetitors,
      needsAttention,
      topPerformers,
      totalScans: scans.length,
      successfulCitations: scans.filter(s => s.isCited).length,
      chatgptPerformance,
      geminiPerformance,
    };
  }, [products, scans, timeRange]);

  // Graphique de tendance avec gestion des dates
  const trendData = useMemo(() => {
    const last7Days = Array.from({ length: 7 }, (_, i) => {
      const date = new Date();
      date.setDate(date.getDate() - (6 - i));
      return date.toISOString().split('T')[0];
    });

    return last7Days.map(date => {
      const dayScans = scans.filter(s => {
        if (!s.createdAt) return false;
        try {
          return s.createdAt.startsWith(date);
        } catch {
          return false;
        }
      });
      
      return {
        date,
        citations: dayScans.filter(s => s.isCited).length,
        total: dayScans.length,
        rate: dayScans.length > 0 
          ? Math.round((dayScans.filter(s => s.isCited).length / dayScans.length) * 100)
          : 0,
      };
    });
  }, [scans]);

  const getScoreColor = (score: number) => {
    if (score >= 70) return "#4caf50";
    if (score >= 40) return "#ff9800";
    return "#f44336";
  };

  const getImprovementColor = (improvement: number) => {
    if (improvement > 0) return "#4caf50";
    if (improvement === 0) return "#ff9800";
    return "#f44336";
  };

  const formatDate = (date: string | null | undefined) => {
    if (!date) return "N/A";
    try {
      return new Date(date).toLocaleDateString();
    } catch {
      return "N/A";
    }
  };

  return (
    <div style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif', background: "#f6f6f7", minHeight: "100vh" }}>
      <AppHeader />
      
      <div style={{ padding: "0 24px 24px 24px" }}>
        <div style={{ marginBottom: "32px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
            <div>
              <h1 style={{ fontSize: "28px", fontWeight: "600", margin: "0 0 8px 0", color: "#202223" }}>
                📊 Analytics Dashboard
              </h1>
              <p style={{ fontSize: "16px", color: "#6d7175", margin: 0 }}>
                Optimization impact & performance insights
              </p>
            </div>
            <div style={{ display: "flex", gap: "8px" }}>
              {(["7d", "30d", "all"] as const).map(range => (
                <button
                  key={range}
                  onClick={() => setTimeRange(range)}
                  style={{
                    padding: "8px 16px",
                    background: timeRange === range ? "#2196f3" : "white",
                    color: timeRange === range ? "white" : "#6d7175",
                    border: "1px solid #e0e0e0",
                    borderRadius: "6px",
                    fontSize: "14px",
                    fontWeight: "500",
                    cursor: "pointer",
                  }}
                >
                  {range === "7d" ? "7 Days" : range === "30d" ? "30 Days" : "All Time"}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Impact des Optimisations */}
        <div style={{ 
          background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)", 
          borderRadius: "16px", 
          padding: "32px", 
          marginBottom: "32px",
          color: "white",
          boxShadow: "0 4px 20px rgba(0,0,0,0.15)"
        }}>
          <h2 style={{ fontSize: "20px", fontWeight: "600", margin: "0 0 24px 0", opacity: 0.9 }}>
            🚀 Optimization Impact Analysis
          </h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "24px" }}>
            <div>
              <div style={{ fontSize: "14px", opacity: 0.8, marginBottom: "8px" }}>Optimized Products</div>
              <div style={{ fontSize: "36px", fontWeight: "700" }}>{metrics.optimizedProducts}</div>
              <div style={{ fontSize: "13px", opacity: 0.8 }}>
                Avg Score: {Math.round(metrics.avgOptimizedScore)}%
              </div>
            </div>
            <div>
              <div style={{ fontSize: "14px", opacity: 0.8, marginBottom: "8px" }}>Non-Optimized</div>
              <div style={{ fontSize: "36px", fontWeight: "700" }}>{metrics.nonOptimizedProducts}</div>
              <div style={{ fontSize: "13px", opacity: 0.8 }}>
                Avg Score: {Math.round(metrics.avgNonOptimizedScore)}%
              </div>
            </div>
            <div>
              <div style={{ fontSize: "14px", opacity: 0.8, marginBottom: "8px" }}>Performance Gain</div>
              <div style={{ fontSize: "36px", fontWeight: "700" }}>
                {metrics.improvement > 0 ? "+" : ""}{Math.round(metrics.improvement)}%
              </div>
              <div style={{ fontSize: "13px", opacity: 0.8 }}>
                After optimization
              </div>
            </div>
            <div>
              <div style={{ fontSize: "14px", opacity: 0.8, marginBottom: "8px" }}>Estimated Value</div>
              <div style={{ fontSize: "36px", fontWeight: "700" }}>
                €{Math.round(metrics.estimatedROI)}
              </div>
              <div style={{ fontSize: "13px", opacity: 0.8 }}>
                Monthly impact
              </div>
            </div>
          </div>
          
          {metrics.improvement > 0 && (
            <div style={{ 
              marginTop: "24px", 
              padding: "16px", 
              background: "rgba(255,255,255,0.2)", 
              borderRadius: "8px" 
            }}>
              <p style={{ margin: 0, fontSize: "14px" }}>
                💡 <strong>Key Insight:</strong> Your optimized products perform {Math.round(metrics.improvement)}% better than non-optimized ones. 
                {metrics.nonOptimizedProducts > 0 && ` Optimizing your remaining ${metrics.nonOptimizedProducts} products could increase overall performance by ${Math.round((metrics.improvement * metrics.nonOptimizedProducts) / Math.max(products.length, 1))}%.`}
              </p>
            </div>
          )}
        </div>

        {/* Métriques principales */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "20px", marginBottom: "32px" }}>
          <div style={{ background: "white", borderRadius: "12px", padding: "20px", boxShadow: "0 1px 3px rgba(0,0,0,0.1)" }}>
            <div style={{ fontSize: "13px", color: "#6d7175", marginBottom: "8px" }}>📈 Citation Trend</div>
            <div style={{ fontSize: "28px", fontWeight: "700", color: getScoreColor(metrics.citationTrend) }}>
              {Math.round(metrics.citationTrend)}%
            </div>
            <div style={{ fontSize: "12px", color: "#6d7175", marginTop: "4px" }}>
              Last {timeRange === "7d" ? "7 days" : timeRange === "30d" ? "30 days" : "all time"}
            </div>
          </div>

          <div style={{ background: "white", borderRadius: "12px", padding: "20px", boxShadow: "0 1px 3px rgba(0,0,0,0.1)" }}>
            <div style={{ fontSize: "13px", color: "#6d7175", marginBottom: "8px" }}>✅ Success Rate</div>
            <div style={{ fontSize: "28px", fontWeight: "700", color: "#4caf50" }}>
              {metrics.totalScans > 0 ? Math.round((metrics.successfulCitations / metrics.totalScans) * 100) : 0}%
            </div>
            <div style={{ fontSize: "12px", color: "#6d7175", marginTop: "4px" }}>
              {metrics.successfulCitations}/{metrics.totalScans} citations
            </div>
          </div>

          <div style={{ background: "white", borderRadius: "12px", padding: "20px", boxShadow: "0 1px 3px rgba(0,0,0,0.1)" }}>
            <div style={{ fontSize: "13px", color: "#6d7175", marginBottom: "8px" }}>💳 Credits Used</div>
            <div style={{ fontSize: "28px", fontWeight: "700", color: "#2196f3" }}>
              {metrics.optimizedProducts}
            </div>
            <div style={{ fontSize: "12px", color: "#6d7175", marginTop: "4px" }}>
              {shop?.credits || 0} remaining
            </div>
          </div>

          <div style={{ background: "white", borderRadius: "12px", padding: "20px", boxShadow: "0 1px 3px rgba(0,0,0,0.1)" }}>
            <div style={{ fontSize: "13px", color: "#6d7175", marginBottom: "8px" }}>🎯 Optimization Rate</div>
            <div style={{ fontSize: "28px", fontWeight: "700", color: getImprovementColor(metrics.improvement) }}>
              {products.length > 0 ? Math.round((metrics.optimizedProducts / products.length) * 100) : 0}%
            </div>
            <div style={{ fontSize: "12px", color: "#6d7175", marginTop: "4px" }}>
              Products optimized
            </div>
          </div>

          <div style={{ background: "white", borderRadius: "12px", padding: "20px", boxShadow: "0 1px 3px rgba(0,0,0,0.1)" }}>
            <div style={{ fontSize: "13px", color: "#6d7175", marginBottom: "8px" }}>🤖 ChatGPT Perf</div>
            <div style={{ fontSize: "28px", fontWeight: "700", color: "#1976d2" }}>
              {Math.round(metrics.chatgptPerformance)}%
            </div>
            <div style={{ fontSize: "12px", color: "#6d7175", marginTop: "4px" }}>
              Average rate
            </div>
          </div>

          <div style={{ background: "white", borderRadius: "12px", padding: "20px", boxShadow: "0 1px 3px rgba(0,0,0,0.1)" }}>
            <div style={{ fontSize: "13px", color: "#6d7175", marginBottom: "8px" }}>💎 Gemini Perf</div>
            <div style={{ fontSize: "28px", fontWeight: "700", color: "#388e3c" }}>
              {Math.round(metrics.geminiPerformance)}%
            </div>
            <div style={{ fontSize: "12px", color: "#6d7175", marginTop: "4px" }}>
              Average rate
            </div>
          </div>
        </div>

        {/* Graphique de tendance */}
        <div style={{ background: "white", borderRadius: "12px", padding: "24px", boxShadow: "0 1px 3px rgba(0,0,0,0.1)", marginBottom: "32px" }}>
          <h2 style={{ fontSize: "20px", fontWeight: "600", margin: "0 0 24px 0", color: "#202223" }}>
            📈 Citation Rate Trend (Last 7 Days)
          </h2>
          <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", height: "200px", paddingBottom: "20px" }}>
            {trendData.map((day, index) => (
              <div key={index} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center" }}>
                <div style={{ flex: 1, width: "100%", display: "flex", alignItems: "flex-end", justifyContent: "center" }}>
                  <div 
                    style={{
                      width: "60%",
                      background: day.rate >= 70 ? "#4caf50" : day.rate >= 40 ? "#ff9800" : "#f44336",
                      height: `${Math.max(day.rate, 5)}%`,
                      minHeight: "5px",
                      borderRadius: "4px 4px 0 0",
                      position: "relative",
                    }}
                  >
                    {day.total > 0 && (
                      <span style={{
                        position: "absolute",
                        top: "-20px",
                        left: "50%",
                        transform: "translateX(-50%)",
                        fontSize: "12px",
                        fontWeight: "600",
                        color: "#202223",
                      }}>
                        {day.rate}%
                      </span>
                    )}
                  </div>
                </div>
                <div style={{ fontSize: "11px", color: "#6d7175", marginTop: "8px" }}>
                  {new Date(day.date).toLocaleDateString('en', { weekday: 'short' })}
                </div>
                <div style={{ fontSize: "10px", color: "#9e9e9e" }}>
                  {day.citations}/{day.total}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "24px", marginBottom: "32px" }}>
          {/* Produits nécessitant une attention */}
          <div style={{ background: "white", borderRadius: "12px", padding: "24px", boxShadow: "0 1px 3px rgba(0,0,0,0.1)" }}>
            <h2 style={{ fontSize: "20px", fontWeight: "600", margin: "0 0 24px 0", color: "#202223" }}>
              ⚠️ Needs Optimization
            </h2>
            {metrics.needsAttention.length === 0 ? (
              <p style={{ fontSize: "14px", color: "#9e9e9e", margin: 0 }}>
                All low-performing products have been optimized! 🎉
              </p>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                {metrics.needsAttention.map(product => (
                  <div key={product.id} style={{ padding: "12px", background: "#fff3e0", borderRadius: "8px", borderLeft: "4px solid #ff9800" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <div>
                        <div style={{ fontSize: "14px", fontWeight: "600", color: "#202223", marginBottom: "4px" }}>
                          {product.title}
                        </div>
                        <div style={{ fontSize: "12px", color: "#6d7175" }}>
                          Current score: {product.citationRate || 0}%
                        </div>
                      </div>
                      <Link 
                        to="/app/optimize"
                        style={{
                          background: "#ff9800",
                          color: "white",
                          padding: "6px 12px",
                          borderRadius: "6px",
                          fontSize: "12px",
                          fontWeight: "600",
                          textDecoration: "none",
                        }}
                      >
                        Optimize
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Top performers */}
          <div style={{ background: "white", borderRadius: "12px", padding: "24px", boxShadow: "0 1px 3px rgba(0,0,0,0.1)" }}>
            <h2 style={{ fontSize: "20px", fontWeight: "600", margin: "0 0 24px 0", color: "#202223" }}>
              🏆 Top Performers
            </h2>
            {metrics.topPerformers.length === 0 ? (
              <p style={{ fontSize: "14px", color: "#9e9e9e", margin: 0 }}>
                Optimize products to see top performers
              </p>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                {metrics.topPerformers.map((product, index) => (
                  <div key={product.id} style={{ padding: "12px", background: "#e8f5e9", borderRadius: "8px", borderLeft: "4px solid #4caf50" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                        <div style={{ fontSize: "20px" }}>
                          {index === 0 ? "🥇" : index === 1 ? "🥈" : index === 2 ? "🥉" : `#${index + 1}`}
                        </div>
                        <div>
                          <div style={{ fontSize: "14px", fontWeight: "600", color: "#202223", marginBottom: "4px" }}>
                            {product.title}
                          </div>
                          <div style={{ fontSize: "12px", color: "#6d7175" }}>
                            Optimized {formatDate(product.lastOptimizedAt)}
                          </div>
                        </div>
                      </div>
                      <div style={{ fontSize: "20px", fontWeight: "700", color: getScoreColor(product.citationRate || 0) }}>
                        {product.citationRate || 0}%
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Analyse des concurrents */}
        {metrics.topCompetitors.length > 0 && (
          <div style={{ background: "white", borderRadius: "12px", padding: "24px", boxShadow: "0 1px 3px rgba(0,0,0,0.1)", marginBottom: "32px" }}>
            <h2 style={{ fontSize: "20px", fontWeight: "600", margin: "0 0 24px 0", color: "#202223" }}>
              🏢 Competitor Mentions
            </h2>
            <p style={{ fontSize: "14px", color: "#6d7175", marginBottom: "16px" }}>
              These competitors are being mentioned instead of your store:
            </p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "12px" }}>
              {metrics.topCompetitors.map(([name, count]) => (
                <div 
                  key={name}
                  style={{ 
                    padding: "12px 20px", 
                    background: "#ffebee", 
                    borderRadius: "8px",
                    border: "1px solid #ffcdd2"
                  }}
                >
                  <div style={{ fontSize: "14px", fontWeight: "600", color: "#c62828", marginBottom: "4px" }}>
                    {name}
                  </div>
                  <div style={{ fontSize: "12px", color: "#6d7175" }}>
                    {count} mentions
                  </div>
                </div>
              ))}
            </div>
            <div style={{ 
              marginTop: "16px", 
              padding: "12px", 
              background: "#fff3e0", 
              borderRadius: "8px",
              fontSize: "13px",
              color: "#856404"
            }}>
              💡 <strong>Tip:</strong> Optimize products frequently mentioned with competitors to reclaim this traffic.
            </div>
          </div>
        )}

        {/* Recommandations */}
        <div style={{ background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)", borderRadius: "12px", padding: "24px", color: "white" }}>
          <h2 style={{ fontSize: "20px", fontWeight: "600", margin: "0 0 16px 0" }}>
            💡 Actionable Insights
          </h2>
          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            {metrics.nonOptimizedProducts > 0 && (
              <div style={{ padding: "12px", background: "rgba(255,255,255,0.2)", borderRadius: "8px" }}>
                <strong>Optimization Opportunity:</strong> You have {metrics.nonOptimizedProducts} products not yet optimized. 
                Based on current performance, optimizing them could increase your overall citation rate by {Math.round((metrics.improvement * metrics.nonOptimizedProducts) / Math.max(products.length, 1))}%.
              </div>
            )}
            
            {metrics.citationTrend < 50 && (
              <div style={{ padding: "12px", background: "rgba(255,255,255,0.2)", borderRadius: "8px" }}>
                <strong>Performance Alert:</strong> Your citation rate is below 50%. 
                Focus on optimizing products with the lowest scores first for maximum impact.
              </div>
            )}
            
            {metrics.topCompetitors.length > 0 && (
              <div style={{ padding: "12px", background: "rgba(255,255,255,0.2)", borderRadius: "8px" }}>
                <strong>Competitive Threat:</strong> {metrics.topCompetitors[0][0]} is mentioned {metrics.topCompetitors[0][1]} times. 
                Ensure your optimizations emphasize your store name and unique value proposition.
              </div>
            )}

            {metrics.improvement > 20 && (
              <div style={{ padding: "12px", background: "rgba(255,255,255,0.2)", borderRadius: "8px" }}>
                <strong>Success Story:</strong> Your optimizations are showing excellent results with {Math.round(metrics.improvement)}% improvement! 
                Continue optimizing remaining products to maximize this success.
              </div>
            )}

            {shop?.credits && shop.credits < 10 && metrics.nonOptimizedProducts > shop.credits && (
              <div style={{ padding: "12px", background: "rgba(255,100,100,0.3)", borderRadius: "8px" }}>
                <strong>Credits Alert:</strong> You have {shop.credits} credits remaining but {metrics.nonOptimizedProducts} products to optimize. 
                Consider upgrading your plan to optimize all products.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}