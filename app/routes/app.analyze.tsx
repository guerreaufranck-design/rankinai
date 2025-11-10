import type { LoaderFunctionArgs } from "react-router";
import { json } from "~/utils/response";
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
      lastScanAt: true,
      createdAt: true,
      tags: true,
    },
    orderBy: { citationRate: "desc" },
  });

  // Récupérer TOUS les scans avec les nouvelles données enrichies
  const scans = await prisma.scan.findMany({
    where: { shopId: shop.id },
    select: {
      id: true,
      platform: true,
      isCited: true,
      confidence: true,
      createdAt: true,
      productId: true,
      // 🆕 NOUVELLES DONNÉES ENRICHIES
      shopMentioned: true,
      shopBeforeCompetitors: true,
      competitors: true,
      competitorPositions: true,
      keywordsInResponse: true,
      topicsCovered: true,
      topicsMissing: true,
      sentimentScore: true,
      mentionedFeatures: true,
      ignoredFeatures: true,
      citationPosition: true,
    },
    orderBy: { createdAt: "desc" },
    take: 200,
  });

  // Récupérer l'historique des optimisations avec le nouveau schéma
  const optimizations = await prisma.optimization.findMany({
    where: { shopId: shop.id },
    select: {
      id: true,
      productId: true,
      status: true,
      createdAt: true,
      // 🆕 NOUVEAUX CHAMPS
      originalTitle: true,
      newTitle: true,
      originalDesc: true,
      newDescription: true,
      scanContext: true,
      reasoning: true,
      improvements: true,
    },
    orderBy: { createdAt: "desc" },
    take: 100,
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

  // Fonction de filtrage par période
  const filterByTimeRange = (date: string | null | undefined) => {
    if (!date) return timeRange === "all";
    
    try {
      const d = new Date(date);
      if (isNaN(d.getTime())) return false;
      
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

  // 🆕 ANALYSE ENRICHIE AVEC TOUTES LES NOUVELLES DONNÉES
  const metrics = useMemo(() => {
    const recentScans = scans.filter(s => filterByTimeRange(s.createdAt));
    
    // Produits optimisés vs non optimisés
    const optimizedProducts = products.filter(p => p.lastOptimizedAt);
    const nonOptimizedProducts = products.filter(p => !p.lastOptimizedAt);
    
    const avgOptimizedScore = optimizedProducts.length > 0
      ? optimizedProducts.reduce((sum, p) => sum + (p.citationRate || 0), 0) / optimizedProducts.length
      : 0;
    
    const avgNonOptimizedScore = nonOptimizedProducts.length > 0
      ? nonOptimizedProducts.reduce((sum, p) => sum + (p.citationRate || 0), 0) / nonOptimizedProducts.length
      : 0;

    const improvement = avgOptimizedScore - avgNonOptimizedScore;

    // 🆕 ANALYSE DES COMPÉTITEURS (dynamique, pas hardcodé)
    const competitorAnalysis = scans.reduce((acc, scan) => {
      if (scan.competitors && Array.isArray(scan.competitors)) {
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
      .slice(0, 10);

    // 🆕 ANALYSE DES TOPICS MANQUANTS (les plus fréquents)
    const missingTopicsAnalysis = scans.reduce((acc, scan) => {
      if (scan.topicsMissing && Array.isArray(scan.topicsMissing)) {
        scan.topicsMissing.forEach((topic: any) => {
          if (typeof topic === 'string') {
            acc[topic] = (acc[topic] || 0) + 1;
          }
        });
      }
      return acc;
    }, {} as Record<string, number>);

    const topMissingTopics = Object.entries(missingTopicsAnalysis)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5);

    // 🆕 ANALYSE DU SENTIMENT
    const sentimentScans = scans.filter(s => s.sentimentScore !== null && s.sentimentScore !== undefined);
    const avgSentiment = sentimentScans.length > 0
      ? sentimentScans.reduce((sum, s) => sum + (s.sentimentScore || 0), 0) / sentimentScans.length
      : 0;

    const positiveSentiment = sentimentScans.filter(s => (s.sentimentScore || 0) > 0).length;
    const negativeSentiment = sentimentScans.filter(s => (s.sentimentScore || 0) < 0).length;

    // 🆕 ANALYSE DE LA POSITION DES CITATIONS
    const citationsWithPosition = scans.filter(s => s.citationPosition && s.citationPosition > 0);
    const avgPosition = citationsWithPosition.length > 0
      ? citationsWithPosition.reduce((sum, s) => sum + (s.citationPosition || 0), 0) / citationsWithPosition.length
      : 0;

    const top3Citations = citationsWithPosition.filter(s => (s.citationPosition || 999) <= 3).length;
    const top5Citations = citationsWithPosition.filter(s => (s.citationPosition || 999) <= 5).length;

    // 🆕 SHOP MENTIONS ANALYSIS
    const shopMentioned = scans.filter(s => s.shopMentioned).length;
    const shopBeforeCompetitors = scans.filter(s => s.shopBeforeCompetitors).length;
    const shopMentionRate = scans.length > 0 ? (shopMentioned / scans.length) * 100 : 0;

    // Taux de citation global
    const citationTrend = recentScans.length > 0
      ? (recentScans.filter(s => s.isCited || s.shopMentioned).length / recentScans.length) * 100
      : 0;

    // Performance par plateforme
    const chatgptScans = scans.filter(s => s.platform === "CHATGPT");
    const geminiScans = scans.filter(s => s.platform === "GEMINI");

    const chatgptCitationRate = chatgptScans.length > 0
      ? (chatgptScans.filter(s => s.isCited || s.shopMentioned).length / chatgptScans.length) * 100
      : 0;

    const geminiCitationRate = geminiScans.length > 0
      ? (geminiScans.filter(s => s.isCited || s.shopMentioned).length / geminiScans.length) * 100
      : 0;

    // ROI estimé basé sur l'amélioration
    const estimatedROI = optimizedProducts.length > 0
      ? (improvement / 100) * optimizedProducts.length * 150 // €150 valeur moyenne par produit optimisé
      : 0;

    // Produits nécessitant une attention
    const needsAttention = products
      .filter(p => (p.citationRate || 0) < 30)
      .sort((a, b) => (a.citationRate || 0) - (b.citationRate || 0))
      .slice(0, 5);

    // Top performers
    const topPerformers = products
      .filter(p => (p.citationRate || 0) >= 70)
      .sort((a, b) => (b.citationRate || 0) - (a.citationRate || 0))
      .slice(0, 5);

    // 🆕 FEATURES LES PLUS IGNORÉES
    const ignoredFeaturesAnalysis = scans.reduce((acc, scan) => {
      if (scan.ignoredFeatures && Array.isArray(scan.ignoredFeatures)) {
        scan.ignoredFeatures.forEach((feature: any) => {
          if (typeof feature === 'string') {
            acc[feature] = (acc[feature] || 0) + 1;
          }
        });
      }
      return acc;
    }, {} as Record<string, number>);

    const topIgnoredFeatures = Object.entries(ignoredFeaturesAnalysis)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5);

    return {
      // Métriques de base
      optimizedProducts: optimizedProducts.length,
      nonOptimizedProducts: nonOptimizedProducts.length,
      avgOptimizedScore,
      avgNonOptimizedScore,
      improvement,
      estimatedROI,
      citationTrend,
      
      // 🆕 MÉTRIQUES ENRICHIES
      topCompetitors,
      topMissingTopics,
      avgSentiment,
      positiveSentiment,
      negativeSentiment,
      avgPosition,
      top3Citations,
      top5Citations,
      shopMentioned,
      shopMentionRate,
      shopBeforeCompetitors,
      chatgptCitationRate,
      geminiCitationRate,
      topIgnoredFeatures,
      
      // Listes
      needsAttention,
      topPerformers,
      
      // Stats globales
      totalScans: scans.length,
      successfulCitations: scans.filter(s => s.isCited || s.shopMentioned).length,
      totalOptimizations: optimizations.length,
    };
  }, [products, scans, optimizations, timeRange]);

  // Graphique de tendance sur 7 jours
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
        citations: dayScans.filter(s => s.isCited || s.shopMentioned).length,
        total: dayScans.length,
        rate: dayScans.length > 0 
          ? Math.round((dayScans.filter(s => s.isCited || s.shopMentioned).length / dayScans.length) * 100)
          : 0,
      };
    });
  }, [scans]);

  const getScoreColor = (score: number) => {
    if (score >= 70) return "#4caf50";
    if (score >= 40) return "#ff9800";
    return "#f44336";
  };

  const getSentimentEmoji = (score: number) => {
    if (score > 30) return "😊";
    if (score > 0) return "🙂";
    if (score === 0) return "😐";
    if (score > -30) return "😕";
    return "😔";
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
                📊 Advanced Analytics Dashboard
              </h1>
              <p style={{ fontSize: "16px", color: "#6d7175", margin: 0 }}>
                AI-powered insights with competitor & sentiment analysis
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

        {/* 🆕 HERO STATS - Impact des Optimisations */}
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
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "24px" }}>
            <div>
              <div style={{ fontSize: "14px", opacity: 0.8, marginBottom: "8px" }}>Optimized Products</div>
              <div style={{ fontSize: "36px", fontWeight: "700" }}>{metrics.optimizedProducts}</div>
              <div style={{ fontSize: "13px", opacity: 0.8 }}>
                Avg: {Math.round(metrics.avgOptimizedScore)}%
              </div>
            </div>
            <div>
              <div style={{ fontSize: "14px", opacity: 0.8, marginBottom: "8px" }}>Performance Gain</div>
              <div style={{ fontSize: "36px", fontWeight: "700" }}>
                {metrics.improvement > 0 ? "+" : ""}{Math.round(metrics.improvement)}%
              </div>
              <div style={{ fontSize: "13px", opacity: 0.8 }}>
                vs non-optimized
              </div>
            </div>
            <div>
              <div style={{ fontSize: "14px", opacity: 0.8, marginBottom: "8px" }}>Shop Mention Rate</div>
              <div style={{ fontSize: "36px", fontWeight: "700" }}>
                {Math.round(metrics.shopMentionRate)}%
              </div>
              <div style={{ fontSize: "13px", opacity: 0.8 }}>
                {metrics.shopMentioned} mentions
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
                💡 <strong>Key Insight:</strong> Your optimized products perform {Math.round(metrics.improvement)}% better! 
                {metrics.nonOptimizedProducts > 0 && ` Optimizing the remaining ${metrics.nonOptimizedProducts} products could boost overall performance by ${Math.round((metrics.improvement * metrics.nonOptimizedProducts) / Math.max(products.length, 1))}%.`}
              </p>
            </div>
          )}
        </div>

        {/* 🆕 MÉTRIQUES PRINCIPALES ENRICHIES */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "20px", marginBottom: "32px" }}>
          <div style={{ background: "white", borderRadius: "12px", padding: "20px", boxShadow: "0 1px 3px rgba(0,0,0,0.1)" }}>
            <div style={{ fontSize: "13px", color: "#6d7175", marginBottom: "8px" }}>📈 Citation Rate</div>
            <div style={{ fontSize: "28px", fontWeight: "700", color: getScoreColor(metrics.citationTrend) }}>
              {Math.round(metrics.citationTrend)}%
            </div>
            <div style={{ fontSize: "12px", color: "#6d7175", marginTop: "4px" }}>
              {metrics.successfulCitations}/{metrics.totalScans} successful
            </div>
          </div>

          <div style={{ background: "white", borderRadius: "12px", padding: "20px", boxShadow: "0 1px 3px rgba(0,0,0,0.1)" }}>
            <div style={{ fontSize: "13px", color: "#6d7175", marginBottom: "8px" }}>🎯 Avg Position</div>
            <div style={{ fontSize: "28px", fontWeight: "700", color: metrics.avgPosition <= 3 ? "#4caf50" : "#ff9800" }}>
              #{metrics.avgPosition > 0 ? Math.round(metrics.avgPosition) : "N/A"}
            </div>
            <div style={{ fontSize: "12px", color: "#6d7175", marginTop: "4px" }}>
              {metrics.top3Citations} in top 3
            </div>
          </div>

          <div style={{ background: "white", borderRadius: "12px", padding: "20px", boxShadow: "0 1px 3px rgba(0,0,0,0.1)" }}>
            <div style={{ fontSize: "13px", color: "#6d7175", marginBottom: "8px" }}>💭 Sentiment</div>
            <div style={{ fontSize: "28px", fontWeight: "700", color: metrics.avgSentiment > 0 ? "#4caf50" : metrics.avgSentiment < 0 ? "#f44336" : "#ff9800" }}>
              {getSentimentEmoji(metrics.avgSentiment)} {Math.round(metrics.avgSentiment)}
            </div>
            <div style={{ fontSize: "12px", color: "#6d7175", marginTop: "4px" }}>
              {metrics.positiveSentiment} positive, {metrics.negativeSentiment} negative
            </div>
          </div>

          <div style={{ background: "white", borderRadius: "12px", padding: "20px", boxShadow: "0 1px 3px rgba(0,0,0,0.1)" }}>
            <div style={{ fontSize: "13px", color: "#6d7175", marginBottom: "8px" }}>🤖 ChatGPT</div>
            <div style={{ fontSize: "28px", fontWeight: "700", color: getScoreColor(metrics.chatgptCitationRate) }}>
              {Math.round(metrics.chatgptCitationRate)}%
            </div>
            <div style={{ fontSize: "12px", color: "#6d7175", marginTop: "4px" }}>
              Citation rate
            </div>
          </div>

          <div style={{ background: "white", borderRadius: "12px", padding: "20px", boxShadow: "0 1px 3px rgba(0,0,0,0.1)" }}>
            <div style={{ fontSize: "13px", color: "#6d7175", marginBottom: "8px" }}>✨ Gemini</div>
            <div style={{ fontSize: "28px", fontWeight: "700", color: getScoreColor(metrics.geminiCitationRate) }}>
              {Math.round(metrics.geminiCitationRate)}%
            </div>
            <div style={{ fontSize: "12px", color: "#6d7175", marginTop: "4px" }}>
              Citation rate
            </div>
          </div>

          <div style={{ background: "white", borderRadius: "12px", padding: "20px", boxShadow: "0 1px 3px rgba(0,0,0,0.1)" }}>
            <div style={{ fontSize: "13px", color: "#6d7175", marginBottom: "8px" }}>🏆 Before Competitors</div>
            <div style={{ fontSize: "28px", fontWeight: "700", color: "#4caf50" }}>
              {metrics.shopBeforeCompetitors}
            </div>
            <div style={{ fontSize: "12px", color: "#6d7175", marginTop: "4px" }}>
              Ahead of competition
            </div>
          </div>
        </div>

        {/* 🆕 GRAPHIQUE DE TENDANCE */}
        <div style={{ background: "white", borderRadius: "12px", padding: "24px", boxShadow: "0 1px 3px rgba(0,0,0,0.1)", marginBottom: "32px" }}>
          <h2 style={{ fontSize: "20px", fontWeight: "600", margin: "0 0 24px 0", color: "#202223" }}>
            📈 7-Day Citation Trend
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

        {/* 🆕 ANALYSE DES COMPÉTITEURS + TOPICS MANQUANTS */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "24px", marginBottom: "32px" }}>
          {/* Compétiteurs détectés dynamiquement */}
          <div style={{ background: "white", borderRadius: "12px", padding: "24px", boxShadow: "0 1px 3px rgba(0,0,0,0.1)" }}>
            <h2 style={{ fontSize: "20px", fontWeight: "600", margin: "0 0 16px 0", color: "#202223" }}>
              🏢 Top Competitors Detected
            </h2>
            <p style={{ fontSize: "13px", color: "#6d7175", marginBottom: "16px" }}>
              AI assistants mention these instead of your store
            </p>
            {metrics.topCompetitors.length === 0 ? (
              <div style={{ padding: "32px", textAlign: "center", color: "#9e9e9e" }}>
                🎉 No competitors detected yet!
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                {metrics.topCompetitors.map(([name, count], index) => (
                  <div 
                    key={name}
                    style={{ 
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      padding: "12px", 
                      background: index === 0 ? "#ffebee" : "#f5f5f5", 
                      borderRadius: "8px",
                      border: index === 0 ? "2px solid #f44336" : "1px solid #e0e0e0"
                    }}
                  >
                    <div>
                      <div style={{ fontSize: "14px", fontWeight: "600", color: "#202223" }}>
                        {index + 1}. {name}
                      </div>
                      <div style={{ fontSize: "12px", color: "#6d7175", marginTop: "2px" }}>
                        Mentioned {count} times
                      </div>
                    </div>
                    {index === 0 && (
                      <div style={{ fontSize: "20px" }}>⚠️</div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Topics manquants les plus fréquents */}
          <div style={{ background: "white", borderRadius: "12px", padding: "24px", boxShadow: "0 1px 3px rgba(0,0,0,0.1)" }}>
            <h2 style={{ fontSize: "20px", fontWeight: "600", margin: "0 0 16px 0", color: "#202223" }}>
              📌 Most Missing Topics
            </h2>
            <p style={{ fontSize: "13px", color: "#6d7175", marginBottom: "16px" }}>
              Add these to improve AI recommendations
            </p>
            {metrics.topMissingTopics.length === 0 ? (
              <div style={{ padding: "32px", textAlign: "center", color: "#9e9e9e" }}>
                ✅ All topics covered!
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                {metrics.topMissingTopics.map(([topic, count]) => (
                  <div 
                    key={topic}
                    style={{ 
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      padding: "12px", 
                      background: "#fff3e0", 
                      borderRadius: "8px",
                      border: "1px solid #ffb74d"
                    }}
                  >
                    <div style={{ fontSize: "14px", fontWeight: "600", color: "#202223" }}>
                      {topic.replace(/-/g, ' ')}
                    </div>
                    <div style={{ fontSize: "12px", color: "#6d7175" }}>
                      Missing in {count} scans
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* 🆕 FEATURES IGNORÉES + PRODUITS À ATTENTION */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "24px", marginBottom: "32px" }}>
          {/* Features les plus ignorées */}
          <div style={{ background: "white", borderRadius: "12px", padding: "24px", boxShadow: "0 1px 3px rgba(0,0,0,0.1)" }}>
            <h2 style={{ fontSize: "20px", fontWeight: "600", margin: "0 0 16px 0", color: "#202223" }}>
              ⚠️ Most Ignored Features
            </h2>
            <p style={{ fontSize: "13px", color: "#6d7175", marginBottom: "16px" }}>
              Product features AIs don't mention
            </p>
            {metrics.topIgnoredFeatures.length === 0 ? (
              <div style={{ padding: "32px", textAlign: "center", color: "#9e9e9e" }}>
                ✅ All features mentioned!
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                {metrics.topIgnoredFeatures.map(([feature, count]) => (
                  <div 
                    key={feature}
                    style={{ 
                      padding: "10px 12px", 
                      background: "#fafafa", 
                      borderRadius: "6px",
                      fontSize: "13px",
                      color: "#202223"
                    }}
                  >
                    <strong>{feature}</strong> <span style={{ color: "#6d7175" }}>({count}x)</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Produits nécessitant une attention */}
          <div style={{ background: "white", borderRadius: "12px", padding: "24px", boxShadow: "0 1px 3px rgba(0,0,0,0.1)" }}>
            <h2 style={{ fontSize: "20px", fontWeight: "600", margin: "0 0 16px 0", color: "#202223" }}>
              🚨 Needs Immediate Attention
            </h2>
            {metrics.needsAttention.length === 0 ? (
              <p style={{ fontSize: "14px", color: "#9e9e9e", margin: 0, padding: "32px", textAlign: "center" }}>
                🎉 All products performing well!
              </p>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                {metrics.needsAttention.map(product => (
                  <div key={product.id} style={{ padding: "12px", background: "#fff3e0", borderRadius: "8px", borderLeft: "4px solid #ff9800" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: "14px", fontWeight: "600", color: "#202223", marginBottom: "4px" }}>
                          {product.title.substring(0, 50)}{product.title.length > 50 ? "..." : ""}
                        </div>
                        <div style={{ fontSize: "12px", color: "#6d7175" }}>
                          Score: {product.citationRate || 0}% • {product.totalScans || 0} scans
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
                          whiteSpace: "nowrap",
                          marginLeft: "12px"
                        }}
                      >
                        Fix Now
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* 🆕 TOP PERFORMERS */}
        {metrics.topPerformers.length > 0 && (
          <div style={{ background: "white", borderRadius: "12px", padding: "24px", boxShadow: "0 1px 3px rgba(0,0,0,0.1)", marginBottom: "32px" }}>
            <h2 style={{ fontSize: "20px", fontWeight: "600", margin: "0 0 24px 0", color: "#202223" }}>
              🏆 Top Performing Products
            </h2>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: "16px" }}>
              {metrics.topPerformers.map((product, index) => (
                <div key={product.id} style={{ padding: "16px", background: "#e8f5e9", borderRadius: "8px", border: "2px solid #4caf50" }}>
                  <div style={{ display: "flex", alignItems: "start", gap: "12px" }}>
                    <div style={{ fontSize: "28px" }}>
                      {index === 0 ? "🥇" : index === 1 ? "🥈" : index === 2 ? "🥉" : "🏅"}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: "14px", fontWeight: "600", color: "#202223", marginBottom: "8px" }}>
                        {product.title}
                      </div>
                      <div style={{ display: "flex", gap: "16px", fontSize: "12px", color: "#6d7175" }}>
                        <div>Score: <strong style={{ color: "#4caf50" }}>{product.citationRate}%</strong></div>
                        <div>ChatGPT: {product.chatgptRate}%</div>
                        <div>Gemini: {product.geminiRate}%</div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 🆕 RECOMMANDATIONS INTELLIGENTES */}
        <div style={{ background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)", borderRadius: "12px", padding: "24px", color: "white" }}>
          <h2 style={{ fontSize: "20px", fontWeight: "600", margin: "0 0 16px 0" }}>
            💡 AI-Powered Recommendations
          </h2>
          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            {metrics.topCompetitors.length > 0 && (
              <div style={{ padding: "12px", background: "rgba(255,255,255,0.2)", borderRadius: "8px" }}>
                <strong>⚠️ Competitive Threat:</strong> {metrics.topCompetitors[0][0]} appears {metrics.topCompetitors[0][1]}x in recommendations. 
                Emphasize your unique value proposition and ensure product descriptions mention your store name.
              </div>
            )}
            
            {metrics.topMissingTopics.length > 0 && (
              <div style={{ padding: "12px", background: "rgba(255,255,255,0.2)", borderRadius: "8px" }}>
                <strong>📝 Content Gap:</strong> Add "{metrics.topMissingTopics[0][0].replace(/-/g, ' ')}" information to {metrics.topMissingTopics[0][1]} products. 
                This topic is frequently requested by AI assistants.
              </div>
            )}
            
            {metrics.avgSentiment < 0 && (
              <div style={{ padding: "12px", background: "rgba(255,100,100,0.3)", borderRadius: "8px" }}>
                <strong>😔 Sentiment Alert:</strong> Average sentiment is negative ({Math.round(metrics.avgSentiment)}). 
                Review product descriptions for clarity and add positive customer testimonials.
              </div>
            )}

            {metrics.improvement > 20 && (
              <div style={{ padding: "12px", background: "rgba(76,175,80,0.3)", borderRadius: "8px" }}>
                <strong>🎉 Success Story:</strong> Optimizations show {Math.round(metrics.improvement)}% improvement! 
                Continue optimizing the remaining {metrics.nonOptimizedProducts} products for maximum impact.
              </div>
            )}

            {metrics.avgPosition > 5 && metrics.citationTrend > 0 && (
              <div style={{ padding: "12px", background: "rgba(255,255,255,0.2)", borderRadius: "8px" }}>
                <strong>🎯 Position Opportunity:</strong> You're cited but average position is #{Math.round(metrics.avgPosition)}. 
                Add more trust signals (reviews, certifications) to rank higher.
              </div>
            )}

            {metrics.shopMentionRate < 50 && (
              <div style={{ padding: "12px", background: "rgba(255,255,255,0.2)", borderRadius: "8px" }}>
                <strong>🏪 Branding Alert:</strong> Your shop is only mentioned {Math.round(metrics.shopMentionRate)}% of the time. 
                Include your shop name naturally in product titles and descriptions.
              </div>
            )}

            {shop?.credits && shop.credits < 10 && metrics.nonOptimizedProducts > 0 && (
              <div style={{ padding: "12px", background: "rgba(255,193,7,0.3)", borderRadius: "8px" }}>
                <strong>💳 Credits Low:</strong> Only {shop.credits} credits left for {metrics.nonOptimizedProducts} products. 
                <Link to="/app" style={{ color: "white", textDecoration: "underline", marginLeft: "4px" }}>
                  Upgrade plan
                </Link> to complete optimization.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}