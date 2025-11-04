import type { LoaderFunctionArgs, ActionFunctionArgs } from "react-router";
import { json } from "@remix-run/node";
import { useLoaderData, useFetcher } from "react-router";
import { authenticate } from "~/shopify.server";
import { prisma } from "~/db.server";
import { useState } from "react";
import OpenAI from "openai";
import { GoogleGenerativeAI } from "@google/generative-ai";
import AppHeader from "~/components/AppHeader";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

const MAJOR_COMPETITORS = [
  'amazon', 'ebay', 'walmart', 'etsy', 'alibaba', 
  'target', 'bestbuy', 'aliexpress', 'wayfair', 'homedepot'
];

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session } = await authenticate.admin(request);

  const shop = await prisma.shop.findFirst({
    where: { shopifyDomain: session.shop },
  });

  if (!shop) {
    return json({ 
      shop: { shopName: "Store", credits: 25, maxCredits: 25 }, 
      products: [] 
    });
  }

  const products = await prisma.product.findMany({
    where: { shopId: shop.id },
    select: {
      id: true,
      title: true,
      handle: true,
      citationRate: true,
      chatgptRate: true,
      geminiRate: true,
      totalScans: true,
      lastScanAt: true,
      status: true,
    },
    orderBy: { citationRate: "desc" },
  });

  const productsWithScans = await Promise.all(
    products.map(async (product) => {
      const lastScan = await prisma.scan.findFirst({
        where: { productId: product.id },
        orderBy: { createdAt: "desc" },
        select: {
          platform: true,
          fullResponse: true,
          isCited: true,
          citation: true,
          citationPosition: true,
          competitors: true,
          confidence: true,
          createdAt: true,
        },
      });

      return {
        ...product,
        lastScan,
      };
    })
  );

  return json({
    shop: {
      shopName: shop.shopName,
      credits: shop.credits,
      maxCredits: shop.maxCredits,
      shopifyDomain: shop.shopifyDomain,
    },
    products: productsWithScans,
  });
};

function analyzeResponse(
  fullResponse: string,
  productTitle: string,
  shopDomain: string,
  shopName: string,
  productHandle: string
) {
  const responseLower = fullResponse.toLowerCase();
  const productLower = productTitle.toLowerCase();
  
  const isProductMentioned = responseLower.includes(productLower);
  
  const isShopMentioned = 
    responseLower.includes(shopDomain.toLowerCase()) ||
    responseLower.includes(shopName.toLowerCase()) ||
    responseLower.includes(productHandle.toLowerCase());
  
  const sentences = fullResponse.split(/[.!?]+/).filter(s => s.trim().length > 10);
  let citationPosition = -1;
  let citationSentence = null;
  
  for (let i = 0; i < Math.min(5, sentences.length); i++) {
    if (sentences[i].toLowerCase().includes(productLower)) {
      citationPosition = i + 1;
      citationSentence = sentences[i].trim();
      break;
    }
  }
  
  const competitorsMentioned = MAJOR_COMPETITORS.filter(comp => 
    responseLower.includes(comp)
  );
  
  const shopPosition = responseLower.indexOf(shopDomain.toLowerCase());
  const competitorPositions = competitorsMentioned.map(comp => ({
    name: comp,
    position: responseLower.indexOf(comp)
  })).filter(c => c.position > -1);
  
  const firstCompetitorPosition = competitorPositions.length > 0 
    ? Math.min(...competitorPositions.map(c => c.position))
    : Infinity;
  
  const shopBeforeCompetitors = shopPosition > -1 && shopPosition < firstCompetitorPosition;
  
  let score = 0;
  const breakdown: string[] = [];
  
  if (isProductMentioned) {
    score += 20;
    breakdown.push("✅ Product mentioned (+20)");
  } else {
    breakdown.push("❌ Product NOT mentioned (0)");
  }
  
  if (isShopMentioned) {
    score += 40;
    breakdown.push("✅ Your shop mentioned (+40)");
  } else {
    breakdown.push("❌ Your shop NOT mentioned (0)");
  }
  
  if (citationPosition > 0 && citationPosition <= 3) {
    score += 20;
    breakdown.push(`✅ Cited in top 3 (position ${citationPosition}) (+20)`);
  } else if (citationPosition > 0) {
    breakdown.push(`⚠️ Cited but position ${citationPosition} (0)`);
  } else {
    breakdown.push("❌ Not in top positions (0)");
  }
  
  if (competitorsMentioned.length === 0) {
    score += 10;
    breakdown.push("✅ No competitors mentioned (+10)");
  } else {
    breakdown.push(`⚠️ ${competitorsMentioned.length} competitors: ${competitorsMentioned.join(', ')} (0)`);
  }
  
  if (shopBeforeCompetitors) {
    score += 10;
    breakdown.push("✅ Your shop mentioned BEFORE competitors (+10)");
  } else if (competitorsMentioned.length > 0 && isShopMentioned) {
    breakdown.push("⚠️ Your shop mentioned AFTER competitors (0)");
  }
  
  const finalScore = Math.min(100, score);
  
  return {
    score: finalScore,
    isProductMentioned,
    isShopMentioned,
    citationPosition,
    citationSentence,
    competitorsMentioned,
    shopBeforeCompetitors,
    breakdown: breakdown.join('\n'),
  };
}

export const action = async ({ request }: ActionFunctionArgs) => {
  const { session, admin } = await authenticate.admin(request);
  const formData = await request.formData();
  const action = formData.get("action") as string;
  const productId = formData.get("productId") as string;
  const platform = formData.get("platform") as string;

  // Handle product sync
  if (action === "syncProducts") {
    try {
      const shop = await prisma.shop.findFirst({
        where: { shopifyDomain: session.shop },
      });

      if (!shop) {
        return json({ error: "Shop not found" }, { status: 404 });
      }

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

      console.log(`✅ Products synced: ${syncedCount} updated, ${newCount} new`);

      return json({ 
        success: true, 
        message: `Synced ${syncedCount + newCount} products (${newCount} new, ${syncedCount} updated)`,
      });
    } catch (error: any) {
      console.error("Sync error:", error);
      return json({ error: error.message }, { status: 500 });
    }
  }

  // Handle product scan
  try {
    const shop = await prisma.shop.findFirst({
      where: { shopifyDomain: session.shop },
    });

    if (!shop || shop.credits <= 0) {
      return json({ error: "No credits" }, { status: 402 });
    }

    const product = await prisma.product.findUnique({
      where: { id: productId },
    });

    if (!product) {
      return json({ error: "Product not found" }, { status: 404 });
    }

    const productUrl = `https://${shop.shopifyDomain}/products/${product.handle}`;
    const smartPrompt = `I'm looking to buy a ${product.title}. Can you recommend where to buy it online? Please suggest specific online retailers with their website URLs if possible.`;

    let fullResponse = "";
    const startTime = Date.now();

    console.log(`\n🔍 Scanning ${platform} for: ${product.title}`);
    console.log(`📝 Prompt: ${smartPrompt}`);

    if (platform === "CHATGPT") {
      const completion = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          { 
            role: "system", 
            content: "You are a helpful shopping assistant. When recommending products, suggest specific online retailers with their website URLs when possible."
          },
          { role: "user", content: smartPrompt },
        ],
        max_tokens: 500,
        temperature: 0.7,
      });
      fullResponse = completion.choices[0]?.message?.content || "";
    } else if (platform === "GEMINI") {
      const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash-exp" });
      const result = await model.generateContent(smartPrompt);
      fullResponse = result.response.text();
    }

    const scanDuration = Date.now() - startTime;

    console.log(`\n📄 Response (${fullResponse.length} chars):\n${fullResponse.substring(0, 300)}...`);

    const analysis = analyzeResponse(
      fullResponse,
      product.title,
      shop.shopifyDomain,
      shop.shopName,
      product.handle
    );

    console.log(`\n📊 Analysis:`);
    console.log(analysis.breakdown);
    console.log(`\n🎯 SCORE: ${analysis.score}/100`);

    const scanId = `scan_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

    await prisma.scan.create({
      data: {
        id: scanId,
        shopId: shop.id,
        productId: product.id,
        platform,
        question: smartPrompt,
        fullResponse,
        isCited: analysis.isShopMentioned,
        citation: analysis.citationSentence,
        citationPosition: analysis.citationPosition,
        competitors: analysis.competitorsMentioned,
        confidence: analysis.score / 100,
        creditsUsed: 1,
        scanDuration,
      },
    });

    const platformScans = await prisma.scan.findMany({
      where: { productId: product.id, platform },
      select: { confidence: true },
    });

    const platformScore = platformScans.length > 0
      ? Math.round(
          (platformScans.reduce((sum, s) => sum + (s.confidence || 0), 0) / platformScans.length) * 100
        )
      : 0;

    const chatgptScans = await prisma.scan.findMany({
      where: { productId: product.id, platform: "CHATGPT" },
      select: { confidence: true },
    });

    const geminiScans = await prisma.scan.findMany({
      where: { productId: product.id, platform: "GEMINI" },
      select: { confidence: true },
    });

    const chatgptRate = chatgptScans.length > 0
      ? Math.round(
          (chatgptScans.reduce((sum, s) => sum + (s.confidence || 0), 0) / chatgptScans.length) * 100
        )
      : 0;

    const geminiRate = geminiScans.length > 0
      ? Math.round(
          (geminiScans.reduce((sum, s) => sum + (s.confidence || 0), 0) / geminiScans.length) * 100
        )
      : 0;

    const totalScans = chatgptScans.length + geminiScans.length;
    const citationRate = totalScans > 0
      ? Math.round(((chatgptRate * chatgptScans.length) + (geminiRate * geminiScans.length)) / totalScans)
      : 0;

    await prisma.product.update({
      where: { id: product.id },
      data: {
        chatgptRate: platform === "CHATGPT" ? platformScore : chatgptRate,
        geminiRate: platform === "GEMINI" ? platformScore : geminiRate,
        citationRate,
        totalScans: { increment: 1 },
        lastScanAt: new Date(),
      },
    });

    await prisma.shop.update({
      where: { id: shop.id },
      data: { credits: { decrement: 1 } },
    });

    console.log(`\n✅ Scan completed!`);
    console.log(`Platform Score: ${platformScore}%`);
    console.log(`Global Citation Rate: ${citationRate}%\n`);

    return json({ 
      success: true, 
      score: analysis.score,
      breakdown: analysis.breakdown,
      platformScore,
      citationRate,
    });
  } catch (error: any) {
    console.error("❌ Scan error:", error);
    return json({ error: error.message }, { status: 500 });
  }
};

export default function Products() {
  const { shop, products } = useLoaderData<typeof loader>();
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [selectedProduct, setSelectedProduct] = useState<any>(null);
  const fetcher = useFetcher();

  const filteredProducts = products.filter((product) => {
    const matchesSearch = product.title.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter =
      filterStatus === "all" ||
      (filterStatus === "good" && product.citationRate >= 70) ||
      (filterStatus === "medium" && product.citationRate >= 40 && product.citationRate < 70) ||
      (filterStatus === "poor" && product.citationRate < 40);
    return matchesSearch && matchesFilter;
  });

  const getStatusColor = (rate: number) => {
    if (rate >= 70) return "#4caf50";
    if (rate >= 40) return "#ff9800";
    return "#f44336";
  };

  const getStatusText = (rate: number) => {
    if (rate >= 70) return "🔥 Excellent";
    if (rate >= 40) return "📈 Good";
    return "⚠️ Needs Help";
  };

  const canScan = shop && shop.credits > 0;

  const generateBreakdown = (scan: any) => {
    if (!scan) return "No scan data available";
    
    const lines = [];
    const score = Math.round((scan.confidence || 0) * 100);
    
    lines.push(`Platform: ${scan.platform}`);
    lines.push(`Score: ${score}/100`);
    lines.push(`Scanned: ${new Date(scan.createdAt).toLocaleString()}`);
    lines.push(``);
    lines.push(`📊 Analysis:`);
    
    const response = scan.fullResponse.toLowerCase();
    const isProductMentioned = scan.citation || response.includes("product");
    const isShopMentioned = scan.isCited;
    const position = scan.citationPosition;
    const competitors = scan.competitors || [];
    
    if (isProductMentioned) {
      lines.push(`✅ Product mentioned (+20)`);
    } else {
      lines.push(`❌ Product NOT mentioned (0)`);
    }
    
    if (isShopMentioned) {
      lines.push(`✅ Your shop mentioned (+40)`);
    } else {
      lines.push(`❌ Your shop NOT mentioned (0)`);
    }
    
    if (position > 0 && position <= 3) {
      lines.push(`✅ Cited in top 3 (position ${position}) (+20)`);
    } else if (position > 0) {
      lines.push(`⚠️ Cited but position ${position} (0)`);
    } else {
      lines.push(`❌ Not in top positions (0)`);
    }
    
    if (competitors.length === 0) {
      lines.push(`✅ No competitors mentioned (+10)`);
    } else {
      lines.push(`⚠️ ${competitors.length} competitors: ${competitors.join(', ')} (0)`);
    }
    
    return lines.join('\n');
  };

  return (
    <div style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif', background: "#f6f6f7", minHeight: "100vh" }}>
      <AppHeader />

      {selectedProduct && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(0,0,0,0.5)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
          }}
          onClick={() => setSelectedProduct(null)}
        >
          <div
            style={{
              background: "white",
              borderRadius: "12px",
              padding: "32px",
              maxWidth: "600px",
              maxHeight: "80vh",
              overflow: "auto",
              boxShadow: "0 4px 20px rgba(0,0,0,0.2)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px" }}>
              <h2 style={{ fontSize: "24px", fontWeight: "600", margin: 0, color: "#202223" }}>
                Scan Analysis
              </h2>
              <button
                onClick={() => setSelectedProduct(null)}
                style={{
                  background: "none",
                  border: "none",
                  fontSize: "24px",
                  cursor: "pointer",
                  color: "#6d7175",
                }}
              >
                ×
              </button>
            </div>

            <div style={{ marginBottom: "24px" }}>
              <h3 style={{ fontSize: "18px", fontWeight: "600", margin: "0 0 8px 0", color: "#202223" }}>
                {selectedProduct.title}
              </h3>
              <p style={{ fontSize: "14px", color: "#6d7175", margin: 0 }}>
                Last scan results
              </p>
            </div>

            {selectedProduct.lastScan ? (
              <div>
                <pre
                  style={{
                    background: "#f5f5f5",
                    padding: "16px",
                    borderRadius: "8px",
                    fontSize: "13px",
                    lineHeight: "1.6",
                    whiteSpace: "pre-wrap",
                    wordBreak: "break-word",
                    color: "#202223",
                    fontFamily: 'Monaco, Consolas, "Courier New", monospace',
                  }}
                >
                  {generateBreakdown(selectedProduct.lastScan)}
                </pre>

                <div style={{ marginTop: "24px", padding: "16px", background: "#e8f5e9", borderRadius: "8px" }}>
                  <p style={{ fontSize: "14px", color: "#2e7d32", margin: 0 }}>
                    <strong>💡 Pro Tip:</strong> To improve your score, focus on SEO optimization and building your online presence. Products with higher visibility get recommended more by AI assistants.
                  </p>
                </div>
              </div>
            ) : (
              <div style={{ textAlign: "center", padding: "40px 20px" }}>
                <p style={{ fontSize: "16px", color: "#9e9e9e" }}>
                  No scan data available yet. Run a scan to see analysis!
                </p>
              </div>
            )}
          </div>
        </div>
      )}
      
      <div style={{ padding: "0 24px 24px 24px" }}>
        <div style={{ marginBottom: "32px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
            <div>
              <h1 style={{ fontSize: "28px", fontWeight: "600", margin: "0 0 8px 0", color: "#202223" }}>
                📦 Products
              </h1>
              <p style={{ fontSize: "16px", color: "#6d7175", margin: 0 }}>
                {products.length} products • {shop?.credits || 0} credits remaining
              </p>
            </div>
            <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
              <fetcher.Form method="post">
                <input type="hidden" name="action" value="syncProducts" />
                <button
                  type="submit"
                  disabled={fetcher.state !== "idle"}
                  style={{
                    background: fetcher.state === "idle" ? "#2196f3" : "#e0e0e0",
                    color: "white",
                    border: "none",
                    padding: "10px 20px",
                    borderRadius: "8px",
                    fontSize: "14px",
                    fontWeight: "600",
                    cursor: fetcher.state === "idle" ? "pointer" : "not-allowed",
                    whiteSpace: "nowrap",
                  }}
                >
                  {fetcher.state === "submitting" && fetcher.formData?.get("action") === "syncProducts" ? "🔄 Syncing..." : "🔄 Sync Products"}
                </button>
              </fetcher.Form>
              <div
                style={{
                  background: shop && shop.credits > 10 ? "#e8f5e9" : "#ffebee",
                  color: shop && shop.credits > 10 ? "#2e7d32" : "#c62828",
                  padding: "8px 16px",
                  borderRadius: "8px",
                  fontSize: "14px",
                  fontWeight: "600",
                }}
              >
                💳 {shop?.credits || 0}/{shop?.maxCredits || 25}
              </div>
            </div>
          </div>

          {fetcher.data?.success && fetcher.data?.message && (
            <div style={{ marginBottom: "16px", padding: "16px", background: "#e8f5e9", borderRadius: "8px", border: "1px solid #4caf50" }}>
              <p style={{ fontSize: "14px", color: "#2e7d32", margin: 0 }}>
                ✅ {fetcher.data.message}
              </p>
            </div>
          )}

          <div
            style={{
              background: "white",
              borderRadius: "12px",
              padding: "16px",
              boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
              display: "flex",
              gap: "12px",
              flexWrap: "wrap",
            }}
          >
            <input
              type="text"
              placeholder="🔍 Search products..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{
                flex: 1,
                minWidth: "250px",
                padding: "10px 14px",
                border: "1px solid #e0e0e0",
                borderRadius: "8px",
                fontSize: "14px",
              }}
            />
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              style={{
                padding: "10px 14px",
                border: "1px solid #e0e0e0",
                borderRadius: "8px",
                fontSize: "14px",
                background: "white",
              }}
            >
              <option value="all">All Products</option>
              <option value="good">🔥 Excellent (70%+)</option>
              <option value="medium">📈 Good (40-70%)</option>
              <option value="poor">⚠️ Needs Help (&lt;40%)</option>
            </select>
          </div>
        </div>

        <div
          style={{
            background: "white",
            borderRadius: "12px",
            boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
            overflow: "hidden",
          }}
        >
          {filteredProducts.length === 0 ? (
            <div style={{ padding: "60px 20px", textAlign: "center" }}>
              <p style={{ fontSize: "16px", color: "#9e9e9e" }}>No products found</p>
            </div>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ background: "#f5f5f5", borderBottom: "2px solid #e0e0e0" }}>
                    <th style={{ padding: "16px", textAlign: "left", fontSize: "13px", fontWeight: "600", color: "#6d7175" }}>PRODUCT</th>
                    <th style={{ padding: "16px", textAlign: "center", fontSize: "13px", fontWeight: "600", color: "#6d7175" }}>AI SCORE</th>
                    <th style={{ padding: "16px", textAlign: "center", fontSize: "13px", fontWeight: "600", color: "#6d7175" }}>CHATGPT</th>
                    <th style={{ padding: "16px", textAlign: "center", fontSize: "13px", fontWeight: "600", color: "#6d7175" }}>GEMINI</th>
                    <th style={{ padding: "16px", textAlign: "center", fontSize: "13px", fontWeight: "600", color: "#6d7175" }}>SCANS</th>
                    <th style={{ padding: "16px", textAlign: "right", fontSize: "13px", fontWeight: "600", color: "#6d7175" }}>ACTIONS</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredProducts.map((product, index) => (
                    <tr key={product.id} style={{ borderBottom: index < filteredProducts.length - 1 ? "1px solid #f0f0f0" : "none" }}>
                      <td style={{ padding: "16px" }}>
                        <div style={{ fontSize: "15px", fontWeight: "600", color: "#202223" }}>{product.title}</div>
                        <div style={{ fontSize: "13px", color: "#9e9e9e" }}>
                          {product.totalScans > 0 ? `Last: ${new Date(product.lastScanAt || "").toLocaleDateString()}` : "Never scanned"}
                        </div>
                      </td>
                      <td style={{ padding: "16px", textAlign: "center" }}>
                        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "4px" }}>
                          <span style={{ fontSize: "24px", fontWeight: "700", color: getStatusColor(product.citationRate) }}>
                            {product.citationRate}%
                          </span>
                          <span style={{ fontSize: "11px", color: "#9e9e9e" }}>{getStatusText(product.citationRate)}</span>
                          {product.lastScan && (
                            <button
                              onClick={() => setSelectedProduct(product)}
                              style={{
                                marginTop: "4px",
                                background: "none",
                                border: "1px solid #e0e0e0",
                                padding: "4px 8px",
                                borderRadius: "4px",
                                fontSize: "11px",
                                color: "#2196f3",
                                cursor: "pointer",
                                fontWeight: "500",
                              }}
                            >
                              📊 View Analysis
                            </button>
                          )}
                        </div>
                      </td>
                      <td style={{ padding: "16px", textAlign: "center" }}>
                        <span style={{ background: "#e3f2fd", color: "#1976d2", padding: "4px 12px", borderRadius: "12px", fontSize: "14px", fontWeight: "600" }}>
                          {product.chatgptRate}%
                        </span>
                      </td>
                      <td style={{ padding: "16px", textAlign: "center" }}>
                        <span style={{ background: "#e8f5e9", color: "#388e3c", padding: "4px 12px", borderRadius: "12px", fontSize: "14px", fontWeight: "600" }}>
                          {product.geminiRate}%
                        </span>
                      </td>
                      <td style={{ padding: "16px", textAlign: "center" }}>
                        <span style={{ fontSize: "14px", color: "#6d7175" }}>{product.totalScans}</span>
                      </td>
                      <td style={{ padding: "16px" }}>
                        <div style={{ display: "flex", gap: "8px", justifyContent: "flex-end" }}>
                          <fetcher.Form method="post">
                            <input type="hidden" name="productId" value={product.id} />
                            <input type="hidden" name="platform" value="CHATGPT" />
                            <button
                              type="submit"
                              disabled={!canScan || fetcher.state !== "idle"}
                              style={{
                                background: canScan && fetcher.state === "idle" ? "#10a37f" : "#e0e0e0",
                                color: canScan && fetcher.state === "idle" ? "white" : "#9e9e9e",
                                border: "none",
                                padding: "8px 12px",
                                borderRadius: "6px",
                                fontSize: "13px",
                                fontWeight: "600",
                                cursor: canScan && fetcher.state === "idle" ? "pointer" : "not-allowed",
                              }}
                            >
                              {fetcher.state !== "idle" ? "⏳" : "🤖"} ChatGPT
                            </button>
                          </fetcher.Form>

                          <fetcher.Form method="post">
                            <input type="hidden" name="productId" value={product.id} />
                            <input type="hidden" name="platform" value="GEMINI" />
                            <button
                              type="submit"
                              disabled={!canScan || fetcher.state !== "idle"}
                              style={{
                                background: canScan && fetcher.state === "idle" ? "#4285f4" : "#e0e0e0",
                                color: canScan && fetcher.state === "idle" ? "white" : "#9e9e9e",
                                border: "none",
                                padding: "8px 12px",
                                borderRadius: "6px",
                                fontSize: "13px",
                                fontWeight: "600",
                                cursor: canScan && fetcher.state === "idle" ? "pointer" : "not-allowed",
                              }}
                            >
                              {fetcher.state !== "idle" ? "⏳" : "✨"} Gemini
                            </button>
                          </fetcher.Form>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
