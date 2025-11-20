import type { LoaderFunctionArgs, ActionFunctionArgs } from "react-router";
import { json } from "~/utils/response";
import { useLoaderData, useFetcher } from "react-router";
import { authenticate } from "~/shopify.server";
import { prisma } from "~/db.server";
import { useState, useMemo } from "react";
import { GoogleGenerativeAI } from "@google/generative-ai";
import AppHeader from "~/components/AppHeader";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

// ============================================
// 🛡️ HELPERS DE SÉCURITÉ ET ROBUSTESSE
// ============================================

/**
 * Parser JSON de Gemini avec validation robuste
 */
function parseGeminiJSON(rawText: string, context: "suggestions" | "blog"): any {
  try {
    let cleanText = rawText.trim();
    
    // Supprimer les markdown code blocks
    if (cleanText.startsWith("```json")) {
      cleanText = cleanText.replace(/```json\n?/g, "").replace(/```\n?$/g, "");
    } else if (cleanText.startsWith("```")) {
      cleanText = cleanText.replace(/```\n?/g, "");
    }
    
    // Parser
    const parsed = JSON.parse(cleanText);
    
    // Validation selon le contexte
    if (context === "suggestions") {
      if (!parsed.title || typeof parsed.title !== "string") {
        throw new Error("Missing or invalid 'title' field");
      }
      if (!parsed.description || typeof parsed.description !== "string") {
        throw new Error("Missing or invalid 'description' field");
      }
      
      // S'assurer que tags est un array
      if (!Array.isArray(parsed.tags)) {
        console.warn("⚠️ tags is not an array, converting to empty array");
        parsed.tags = [];
      }
      
      // S'assurer que faq est un array
      if (!Array.isArray(parsed.faq)) {
        console.warn("⚠️ faq is not an array, converting to empty array");
        parsed.faq = [];
      }
    } else if (context === "blog") {
      if (!parsed.title || typeof parsed.title !== "string") {
        throw new Error("Missing or invalid blog 'title'");
      }
      if (!parsed.bodyHtml || typeof parsed.bodyHtml !== "string") {
        throw new Error("Missing or invalid blog 'bodyHtml'");
      }
    }
    
    return parsed;
  } catch (error: any) {
    console.error(`❌ JSON parsing error in ${context}:`, error.message);
    console.error("Raw text preview:", rawText.substring(0, 300));
    throw new Error(`Failed to parse ${context} JSON: ${error.message}`);
  }
}

/**
 * Appel Gemini avec timeout et retry
 */
async function callGeminiWithRetry(
  prompt: string,
  modelConfig: any,
  maxRetries: number = 2,
  timeoutMs: number = 45000
): Promise<string> {
  const model = genAI.getGenerativeModel(modelConfig);
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      console.log(`🤖 Gemini API call attempt ${attempt + 1}/${maxRetries + 1}`);
      
      // Créer une promesse avec timeout
      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error("Gemini API timeout")), timeoutMs)
      );
      
      const generationPromise = model.generateContent(prompt);
      
      // Race entre le timeout et l'appel réel
      const result = await Promise.race([generationPromise, timeoutPromise]);
      
      const response = result.response;
      const text = response.text();
      
      if (!text || text.trim().length === 0) {
        throw new Error("Empty response from Gemini");
      }
      
      console.log(`✅ Gemini responded successfully (${text.length} chars)`);
      return text;
      
    } catch (error: any) {
      console.error(`❌ Gemini attempt ${attempt + 1} failed:`, error.message);
      
      if (attempt === maxRetries) {
        throw new Error(`Gemini API failed after ${maxRetries + 1} attempts: ${error.message}`);
      }
      
      // Backoff exponentiel
      const waitTime = 1000 * Math.pow(2, attempt);
      console.log(`⏳ Waiting ${waitTime}ms before retry...`);
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }
  }
  
  throw new Error("Gemini API failed unexpectedly");
}

/**
 * Accès sécurisé aux valeurs optionnelles
 */
function safeGet<T>(value: T | null | undefined, fallback: T): T {
  return value ?? fallback;
}

// ============================================
// 🔄 LOADER
// ============================================

export const loader = async ({ request }: LoaderFunctionArgs) => {
  try {
    const { session } = await authenticate.admin(request);

    const shop = await prisma.shop.findFirst({
      where: { shopifyDomain: session.shop },
    });

    if (!shop) {
      return json({
        shop: { credits: 0, maxCredits: 25, shopName: "" },
        products: [],
      });
    }

    const products = await prisma.product.findMany({
      where: { shopId: shop.id },
      select: {
        id: true,
        shopifyGid: true,
        title: true,
        description: true,
        tags: true,
        citationRate: true,
        chatgptRate: true,
        geminiRate: true,
        totalScans: true,
        lastOptimizedAt: true,
      },
      orderBy: { citationRate: "asc" },
    });

    return json({
      shop: {
        shopName: safeGet(shop.shopName, ""),
        credits: safeGet(shop.credits, 0),
        maxCredits: safeGet(shop.maxCredits, 25),
      },
      products,
    });
  } catch (error: any) {
    console.error("❌ Loader error:", error);
    return json({
      shop: { credits: 0, maxCredits: 25, shopName: "" },
      products: [],
      error: "Failed to load data",
    }, { status: 500 });
  }
};

// ============================================
// ⚡ ACTION
// ============================================

export const action = async ({ request }: ActionFunctionArgs) => {
  const { session, admin } = await authenticate.admin(request);
  
  try {
    const formData = await request.formData();
    const action = formData.get("action") as string;
    const productId = formData.get("productId") as string;

    if (!action || !productId) {
      return json({ error: "Missing action or productId" }, { status: 400 });
    }

    const shop = await prisma.shop.findFirst({
      where: { shopifyDomain: session.shop },
    });

    if (!shop) {
      return json({ error: "Shop not found" }, { status: 404 });
    }

    const product = await prisma.product.findUnique({
      where: { id: productId },
    });

    if (!product) {
      return json({ error: "Product not found" }, { status: 404 });
    }

    // ============================================
    // 🎨 ACTION: GÉNÉRER LES SUGGESTIONS
    // ============================================
    if (action === "generateSuggestions") {
      if (safeGet(shop.credits, 0) <= 0) {
        return json({ error: "No credits remaining" }, { status: 402 });
      }

      try {
        // Récupérer l'historique des scans
        const historicalScans = await prisma.scan.findMany({
          where: { productId: product.id },
          orderBy: { createdAt: "desc" },
          take: 100,
        });

        // Récupérer le dernier scan enrichi
        const lastScan = await prisma.scan.findFirst({
          where: { productId: product.id },
          orderBy: { createdAt: "desc" },
          select: {
            platform: true,
            isCited: true,
            shopMentioned: true,
            shopBeforeCompetitors: true,
            competitors: true,
            topicsCovered: true,
            topicsMissing: true,
            keywordsInResponse: true,
            sentimentScore: true,
            createdAt: true,
            citationPosition: true,
          },
        });

        // Calculer les tendances temporelles
        const now = new Date();
        const oneMonthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        const twoMonthsAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);

        const scansLastMonth = historicalScans.filter(s => new Date(s.createdAt) >= oneMonthAgo);
        const scansPreviousMonth = historicalScans.filter(
          s => new Date(s.createdAt) >= twoMonthsAgo && new Date(s.createdAt) < oneMonthAgo
        );

        const citationRateLastMonth = scansLastMonth.length > 0
          ? (scansLastMonth.filter(s => s.isCited).length / scansLastMonth.length) * 100
          : 0;
        const citationRatePreviousMonth = scansPreviousMonth.length > 0
          ? (scansPreviousMonth.filter(s => s.isCited).length / scansPreviousMonth.length) * 100
          : 0;

        const trend = citationRateLastMonth - citationRatePreviousMonth;
        const trendDirection = trend > 0 ? "INCREASING 📈" : trend < 0 ? "DECLINING 📉" : "STABLE ➡️";

        // Extraire l'évolution des concurrents
        const allCompetitors = historicalScans
          .flatMap(s => s.competitors || [])
          .filter((c, i, arr) => arr.indexOf(c) === i);

        const recentCompetitors = scansLastMonth
          .flatMap(s => s.competitors || [])
          .filter((c, i, arr) => arr.indexOf(c) === i);

        const oldCompetitors = scansPreviousMonth
          .flatMap(s => s.competitors || [])
          .filter((c, i, arr) => arr.indexOf(c) === i);

        const newCompetitors = recentCompetitors.filter(c => !oldCompetitors.includes(c));

        // Analyser les positions de citation
        const recentPositions = scansLastMonth
          .filter(s => s.isCited && s.citationPosition != null)
          .map(s => s.citationPosition!);

        const avgPosition = recentPositions.length > 0
          ? Math.round(recentPositions.reduce((a, b) => a + b, 0) / recentPositions.length)
          : null;

        // Évolution ChatGPT vs Gemini
        const chatgptScansRecent = scansLastMonth.filter(s => s.platform === "CHATGPT");
        const geminiScansRecent = scansLastMonth.filter(s => s.platform === "GEMINI");

        const chatgptRateRecent = chatgptScansRecent.length > 0
          ? (chatgptScansRecent.filter(s => s.isCited).length / chatgptScansRecent.length) * 100
          : 0;
        const geminiRateRecent = geminiScansRecent.length > 0
          ? (geminiScansRecent.filter(s => s.isCited).length / geminiScansRecent.length) * 100
          : 0;

        // Construire le prompt de base
        let prompt = `🌍🌍🌍 CRITICAL LANGUAGE INSTRUCTION - READ 3 TIMES! 🌍🌍🌍

STEP 1 - LANGUAGE DETECTION (MANDATORY):
======================================
ANALYZE THIS PRODUCT:
- Title: ${product.title}
- Description: ${safeGet(product.description, "No description")}

DETECTED LANGUAGE = [IDENTIFY THE LANGUAGE HERE]

⚠️ CRITICAL RULE #1: ALL YOUR RESPONSE MUST BE IN THE EXACT SAME LANGUAGE AS THE PRODUCT!
⚠️ CRITICAL RULE #2: EVERY SINGLE FIELD IN JSON MUST BE IN THE DETECTED LANGUAGE!
⚠️ CRITICAL RULE #3: DO NOT MIX LANGUAGES - 100% OF TEXT IN DETECTED LANGUAGE!

EXAMPLES OF WHAT YOU MUST DO:
- If product is in SPANISH → ALL text in SPANISH (title, description, tags, FAQ, meta, reasoning)
- If product is in FRENCH → ALL text in FRENCH (title, description, tags, FAQ, meta, reasoning)
- If product is in GERMAN → ALL text in GERMAN (title, description, tags, FAQ, meta, reasoning)
- If product is in ENGLISH → ALL text in ENGLISH (title, description, tags, FAQ, meta, reasoning)

🚫 FORBIDDEN: Mixing languages (Spanish title with English description = WRONG!)
✅ REQUIRED: Everything in the SAME language as the original product

==========================================================
NOW PROCEED WITH OPTIMIZATION IN [${product.title.substring(0, 30)}] LANGUAGE
==========================================================

You are an AIO (AI Optimization) and e-commerce expert. Your PRIMARY GOAL is to make AI assistants (ChatGPT, Gemini) recommend THE STORE AND ITS SERVICE together with the product, driving traffic to the merchant's website.

🎯 CRITICAL OPTIMIZATION RULES:
1. Always mention the store name "${safeGet(shop.shopName, "the store")}" naturally 2-3 times in the description
2. Identify the business model from the product/store context (is it selling, renting, services, subscription?)
3. Emphasize the STORE'S VALUE PROPOSITION, not just the product features
4. Make it clear WHY users should choose THIS store over competitors or direct manufacturers

📊 PRODUCT CURRENT STATE:
========================
- Store Name: ${safeGet(shop.shopName, "the store")}
- Store Domain: ${session.shop}
- Product Title: ${product.title}
- Current Description: ${safeGet(product.description, "No description")}
- Current Tags: ${safeGet(product.tags, "No tags")}
- Current AI Citation Rate: ${safeGet(product.citationRate, 0)}%
- Total Scans: ${safeGet(product.totalScans, 0)}
- Last Optimized: ${product.lastOptimizedAt ? new Date(product.lastOptimizedAt).toLocaleDateString() : "Never"}

📈 PERFORMANCE EVOLUTION & TRENDS:
===================================
${historicalScans.length > 0 ? `
- Historical Data Available: ${historicalScans.length} scans analyzed
- Citation Rate Last Month: ${citationRateLastMonth.toFixed(1)}%
- Citation Rate Previous Month: ${citationRatePreviousMonth.toFixed(1)}%
- Trend: ${trendDirection} (${trend > 0 ? "+" : ""}${trend.toFixed(1)}% change)
${avgPosition ? `- Average Citation Position: #${avgPosition}` : "- Citation Position: Not ranked recently"}

🔍 AI PLATFORM PERFORMANCE:
- ChatGPT Recent Rate: ${chatgptRateRecent.toFixed(1)}% (${chatgptScansRecent.length} scans)
- Gemini Recent Rate: ${geminiRateRecent.toFixed(1)}% (${geminiScansRecent.length} scans)
${chatgptRateRecent > geminiRateRecent
  ? "→ ChatGPT performs BETTER - optimize more for ChatGPT patterns"
  : geminiRateRecent > chatgptRateRecent
    ? "→ Gemini performs BETTER - optimize more for Gemini patterns"
    : "→ Both platforms perform similarly"}

🏆 COMPETITIVE LANDSCAPE EVOLUTION:
- All Competitors Detected: ${allCompetitors.length > 0 ? allCompetitors.join(", ") : "None detected"}
- Recent Competitors (last month): ${recentCompetitors.length > 0 ? recentCompetitors.join(", ") : "None"}
- Previous Competitors: ${oldCompetitors.length > 0 ? oldCompetitors.join(", ") : "None"}
${newCompetitors.length > 0 ? `- ⚠️ NEW THREATS: ${newCompetitors.join(", ")} - COUNTER-ATTACK NEEDED!` : "- No new competitors detected"}

💡 STRATEGIC CONTEXT:
${trend < -5 ? "⚠️ CRITICAL: Performance is DECLINING - aggressive re-optimization needed!" : ""}
${trend > 5 ? "✅ POSITIVE: Performance is IMPROVING - reinforce what works!" : ""}
${newCompetitors.length > 0 ? `⚠️ New competitors "${newCompetitors.join(", ")}" are emerging - differentiation is critical!` : ""}
${avgPosition && avgPosition > 3 ? "⚠️ Product is cited but in lower positions - improve ranking with stronger value props!" : ""}
${chatgptRateRecent === 0 && historicalScans.length > 10 ? "⚠️ ChatGPT NEVER cites this product - major optimization needed!" : ""}
${geminiRateRecent === 0 && historicalScans.length > 10 ? "⚠️ Gemini NEVER cites this product - major optimization needed!" : ""}
` : `
- No historical data yet - this is the FIRST optimization
- Focus on establishing strong foundation for AI citations
- Emphasize unique value propositions and store benefits
`}

🎯 YOUR OPTIMIZATION MISSION:
==============================
Based on the EVOLUTION data above, provide recommendations that:

1. **Address declining trends**: If performance is dropping, identify what's missing
2. **Counter new competitors**: If new brands appeared, create differentiation strategies
3. **Optimize for best-performing platform**: Focus more on ChatGPT or Gemini based on data
4. **Improve citation position**: If cited but low-ranked, enhance value propositions
5. **Adapt to algorithm changes**: Recommendations should reflect current AI behavior patterns

OPTIMIZATION STRATEGY:
1. **Identify business model**: Look at the product title and description. Is this store SELLING products, RENTING/LEASING them, offering SERVICES, or SUBSCRIPTIONS? Adapt all content accordingly.

2. **Title optimization** (IN DETECTED LANGUAGE):
   - If SELLING: "[Product] - [Key Benefit] | ${safeGet(shop.shopName, "the store")}"
   - If RENTING/LEASING: "[Product] Rental/Location - [Service Benefit] | ${safeGet(shop.shopName, "the store")}"
   - If SERVICE: "[Service] for [Product] - [Unique Value] | ${safeGet(shop.shopName, "the store")}"

3. **Description strategy** (IN DETECTED LANGUAGE):
   - First paragraph: Mention "${safeGet(shop.shopName, "the store")}" + business model (rental/sale/service) + unique value proposition
   - Middle: Product features + how the STORE enhances the experience
   - End: Call-to-action mentioning "${safeGet(shop.shopName, "the store")}" + differentiator
   - Include phrases naturally mentioning the store
   ${newCompetitors.length > 0 ? `- COUNTER new competitors (${newCompetitors.join(", ")}) by emphasizing what ${safeGet(shop.shopName, "the store")} offers that they don't` : ""}

4. **FAQ must include** (IN DETECTED LANGUAGE):
   - Question about where to buy/rent/get this → Answer with store name + unique benefit
   - Question about why choose ${safeGet(shop.shopName, "the store")} → Answer highlighting differentiators
   ${newCompetitors.length > 0 ? `- Question comparing ${safeGet(shop.shopName, "the store")} vs ${newCompetitors[0]} → Answer with clear advantages` : ""}
   - All Q&A in the SAME LANGUAGE as the product

5. **Tags** (IN DETECTED LANGUAGE):
   - All tags must be in the same language as the product
   - Include store-related keywords when relevant

WHY THIS MATTERS:
- Without store mention = 0 traffic, product goes to manufacturer or Amazon
- With store + service mention = direct traffic to YOUR website
- Store-centric optimization = AI assistants cite "${safeGet(shop.shopName, "the store")}" when recommending
${trend < 0 ? "- Current declining trend MUST be reversed with better optimization" : ""}
${newCompetitors.length > 0 ? `- New competitors are stealing visibility - differentiation is CRITICAL` : ""}

FINAL LANGUAGE CHECK BEFORE RESPONDING:
=========================================
✓ Is the "title" field in [DETECTED LANGUAGE]? YES/NO
✓ Is the "description" field in [DETECTED LANGUAGE]? YES/NO
✓ Are all "tags" in [DETECTED LANGUAGE]? YES/NO
✓ Are all FAQ questions in [DETECTED LANGUAGE]? YES/NO
✓ Are all FAQ answers in [DETECTED LANGUAGE]? YES/NO
✓ Is "metaTitle" in [DETECTED LANGUAGE]? YES/NO
✓ Is "metaDescription" in [DETECTED LANGUAGE]? YES/NO
✓ Is "blogPostTitle" in [DETECTED LANGUAGE]? YES/NO
✓ Is "reasoning" in [DETECTED LANGUAGE]? YES/NO

If ANY answer is NO, START OVER and fix the language!`;

        // Ajouter le contexte du dernier scan si disponible
        if (lastScan) {
          console.log(`🆕 Enhancing prompt with scan context (${lastScan.platform})`);
          
          prompt += `

========================================
🎯 ADDITIONAL CONTEXT FROM RECENT SCAN (${lastScan.platform})
========================================
These findings are from a REAL AI scan performed on ${new Date(lastScan.createdAt).toLocaleDateString()} - use them to strengthen suggestions:

SCAN RESULTS:
- Product was ${lastScan.isCited ? "✅ CITED" : "❌ NOT cited"}
- Shop name was ${safeGet(lastScan.shopMentioned, false) ? "✅ MENTIONED" : "❌ NOT mentioned"}
${safeGet(lastScan.shopMentioned, false) ? `  → Shop appeared ${safeGet(lastScan.shopBeforeCompetitors, false) ? "BEFORE ✅" : "AFTER ❌"} competitors` : ""}
${lastScan.competitors && lastScan.competitors.length > 0 ? `- Competitors cited: ${lastScan.competitors.join(", ")}` : "- No competitors mentioned"}
${lastScan.topicsCovered && lastScan.topicsCovered.length > 0 ? `- Topics covered in response: ${lastScan.topicsCovered.join(", ")}` : ""}
${lastScan.topicsMissing && lastScan.topicsMissing.length > 0 ? `- Topics MISSING (should be added): ${lastScan.topicsMissing.join(", ")}` : "- All topics covered"}
${lastScan.keywordsInResponse && lastScan.keywordsInResponse.length > 0 ? `- Keywords ${lastScan.platform} used: ${lastScan.keywordsInResponse.join(", ")}` : ""}
- AI sentiment about product: ${safeGet(lastScan.sentimentScore, 0) > 0 ? "Positive ✅" : safeGet(lastScan.sentimentScore, 0) < 0 ? "Negative ❌" : "Neutral"}

OPTIMIZATION FOCUS:
${lastScan.isCited ? "✅ Product WAS cited - focus on making it RANK HIGHER" : "❌ Product NOT cited - PRIORITY: make it discoverable"}
${safeGet(lastScan.shopMentioned, false) ? `✅ Shop WAS mentioned - FOCUS: ensure it appears BEFORE competitors` : "❌ Shop NOT mentioned - PRIORITY: add shop name naturally"}
${lastScan.topicsMissing && lastScan.topicsMissing.length > 0 ? `❌ Missing topics: ${lastScan.topicsMissing.join(", ")} - ADD these to descriptions` : "✅ All important topics covered"}

FOR EACH SUGGESTION:
- Reference how it addresses the scan findings
${lastScan.topicsMissing && lastScan.topicsMissing.length > 0 ? `- Example: "This title includes '${lastScan.topicsMissing[0]}' because the scan showed it was missing"` : ""}
- Ensure suggestions fix what scan revealed as problems
- Use keywords that ${lastScan.platform} responded well to: ${lastScan.keywordsInResponse && lastScan.keywordsInResponse.length > 0 ? lastScan.keywordsInResponse.slice(0, 5).join(", ") : "N/A"}
========================================
`;
        }

        prompt += `

Provide comprehensive suggestions in JSON format (respond ONLY with valid JSON, no markdown):
{
  "detectedLanguage": "The language detected from the product (e.g., 'Spanish', 'French', 'English')",
  "title": "Optimized title in THE DETECTED LANGUAGE - Include business model and store name when natural",
  "description": "AIO-optimized description (300-500 words) IN THE DETECTED LANGUAGE - MUST mention '${safeGet(shop.shopName, "the store")}' at least 2-3 times naturally + emphasize business model + unique value proposition ${newCompetitors.length > 0 ? `+ differentiate from ${newCompetitors.join(", ")}` : ""}${lastScan && lastScan.topicsMissing && lastScan.topicsMissing.length > 0 ? ` + include missing topics: ${lastScan.topicsMissing.join(", ")}` : ""}",
  "tags": ["tag1 in detected language", "tag2 in detected language", "tag3 in detected language", "tag4 in detected language", "tag5 in detected language"],
  "faq": [
    {"question": "Question IN THE DETECTED LANGUAGE", "answer": "Answer IN THE DETECTED LANGUAGE mentioning ${safeGet(shop.shopName, "the store")}"},
    {"question": "Question IN THE DETECTED LANGUAGE about why choose ${safeGet(shop.shopName, "the store")}", "answer": "Answer IN THE DETECTED LANGUAGE with differentiators"},
    {"question": "Question IN THE DETECTED LANGUAGE about where to get this", "answer": "Answer IN THE DETECTED LANGUAGE mentioning ${safeGet(shop.shopName, "the store")} with unique benefit"}
  ],
  "metaTitle": "SEO meta title IN THE DETECTED LANGUAGE (max 60 chars) - Include product + ${safeGet(shop.shopName, "the store")}",
  "metaDescription": "SEO meta description IN THE DETECTED LANGUAGE (max 160 chars) - Include product + ${safeGet(shop.shopName, "the store")} + CTA",
  "blogPostTitle": "Blog post title IN THE DETECTED LANGUAGE mentioning product and ${safeGet(shop.shopName, "the store")}",
  "reasoning": "Explanation IN THE DETECTED LANGUAGE about how these changes will make AI assistants cite both product and ${safeGet(shop.shopName, "the store")}${trend !== 0 ? `, addressing the ${trendDirection.toLowerCase()} trend` : ""}${newCompetitors.length > 0 ? `, and differentiating from new competitors like ${newCompetitors[0]}` : ""}${lastScan ? `, and fixing issues found in the ${lastScan.platform} scan` : ""}"
}

🌍 REMINDER: 100% of your response must be in the SAME LANGUAGE as the product! 🌍`;

        // Appeler Gemini avec retry et timeout
        console.log("🚀 Calling Gemini API for suggestions...");
        const geminiResponse = await callGeminiWithRetry(
          prompt,
          {
            model: "gemini-2.0-flash-exp",
            generationConfig: {
              temperature: 0.7,
              topK: 40,
              topP: 0.95,
              maxOutputTokens: 2048,
            },
          },
          2, // 2 retries
          45000 // 45s timeout
        );

        // Parser la réponse
        const suggestions = parseGeminiJSON(geminiResponse, "suggestions");

        // Décrémenter les crédits
        await prisma.shop.update({
          where: { id: shop.id },
          data: { credits: { decrement: 1 } },
        });

        console.log(`✨ AIO suggestions generated for ${product.title} - 1 credit used`);
        console.log(`🌍 Detected language: ${suggestions.detectedLanguage}`);
        console.log(`📊 Historical context: ${historicalScans.length} scans, trend: ${trendDirection}`);
        if (lastScan) {
          console.log(`🆕 Enhanced with scan context from ${lastScan.platform}`);
        }

        return json({
          success: true,
          suggestions,
          creditsRemaining: shop.credits - 1,
          scanContextUsed: !!lastScan,
        });
      } catch (error: any) {
        console.error("❌ Error generating suggestions:", error);
        return json({
          error: `Failed to generate suggestions: ${error.message}`,
        }, { status: 500 });
      }
    }

    // ============================================
    // 📝 ACTION: APPLIQUER LES OPTIMISATIONS
    // ============================================
    if (action === "applyOptimizations") {
      try {
        const selectedOptimizationsRaw = formData.get("selectedOptimizations") as string;
        
        if (!selectedOptimizationsRaw) {
          return json({ error: "No optimizations provided" }, { status: 400 });
        }
        
        const selectedOptimizations = JSON.parse(selectedOptimizationsRaw);

        if (!product.shopifyGid) {
          return json({
            error: "Product not synced with Shopify. Please sync products first.",
          }, { status: 400 });
        }

        let updatedFields: string[] = [];

        // Préparer l'input pour Shopify
        const productInput: any = {
          id: product.shopifyGid,
        };

        // Appliquer le titre
        if (selectedOptimizations.title) {
          productInput.title = selectedOptimizations.title;
          updatedFields.push("title");
        }

        // Appliquer la description + FAQ
        if (selectedOptimizations.description) {
          let descriptionHtml = selectedOptimizations.description;

          // Ajouter FAQ si sélectionné
          if (selectedOptimizations.faq && selectedOptimizations.faq !== "null") {
            try {
              const faqData = typeof selectedOptimizations.faq === "string"
                ? JSON.parse(selectedOptimizations.faq)
                : selectedOptimizations.faq;

              if (Array.isArray(faqData) && faqData.length > 0) {
                descriptionHtml += `
            <hr style="margin: 40px 0; border: none; border-top: 2px solid #e0e0e0;">
            
            <h3 style="font-size: 24px; font-weight: 600; margin-bottom: 24px; color: #202223;">
              ❓ Frequently Asked Questions
            </h3>
            
            ${faqData.map((item: any) => `
              <div style="margin-bottom: 24px; padding: 16px; background: #f9f9f9; border-radius: 8px; border-left: 4px solid #2196f3;">
                <h4 style="font-size: 16px; font-weight: 600; margin: 0 0 8px 0; color: #202223;">
                  ${safeGet(item.question, "Question")}
                </h4>
                <p style="font-size: 14px; line-height: 1.6; margin: 0; color: #6d7175;">
                  ${safeGet(item.answer, "Answer")}
                </p>
              </div>
            `).join("")}
          `;
              }
            } catch (faqError: any) {
              console.warn("⚠️ Failed to parse FAQ:", faqError.message);
            }
          }

          productInput.descriptionHtml = descriptionHtml;
          updatedFields.push("description with FAQ");
        }

        // Appliquer les tags
        if (selectedOptimizations.tags) {
          const tagsArray = selectedOptimizations.tags
            .split(",")
            .map((t: string) => t.trim())
            .filter((t: string) => t.length > 0);
          productInput.tags = tagsArray;
          updatedFields.push("tags");
        }

        // Appliquer les champs SEO
        if (selectedOptimizations.metaTitle || selectedOptimizations.metaDescription) {
          productInput.seo = {};

          if (selectedOptimizations.metaTitle) {
            productInput.seo.title = selectedOptimizations.metaTitle;
            updatedFields.push("SEO title");
          }

          if (selectedOptimizations.metaDescription) {
            productInput.seo.description = selectedOptimizations.metaDescription;
            updatedFields.push("SEO description");
          }
        }

        // Mettre à jour dans Shopify
        if (Object.keys(productInput).length > 1) {
          const mutation = `
          mutation productUpdate($input: ProductInput!) {
            productUpdate(input: $input) {
              product {
                id
                title
                descriptionHtml
                tags
              }
              userErrors {
                field
                message
              }
            }
          }
        `;

          const variables = { input: productInput };
          const response = await admin.graphql(mutation, { variables });
          const data = await response.json();

          if (data.data?.productUpdate?.userErrors?.length > 0) {
            const errorMsg = data.data.productUpdate.userErrors[0].message;
            console.error("❌ Shopify mutation error:", errorMsg);
            return json({
              error: `Shopify error: ${errorMsg}`,
            }, { status: 400 });
          }

          // Mettre à jour dans notre DB
          await prisma.product.update({
            where: { id: productId },
            data: {
              title: selectedOptimizations.title || product.title,
              description: selectedOptimizations.description || product.description,
              tags: selectedOptimizations.tags || product.tags,
              lastOptimizedAt: new Date(),
            },
          });
        }

        // Créer le blog post si sélectionné
        if (selectedOptimizations.blogPost) {
          try {
            console.log(`📝 Generating blog post: ${selectedOptimizations.blogPost}`);

            const blogPrompt = `🌍🌍🌍 LANGUAGE INSTRUCTION - CRITICAL! 🌍🌍🌍

DETECT THE LANGUAGE FROM THIS PRODUCT:
=======================================
Product Title: ${product.title}
Product Description: ${safeGet(product.description, "")}

THE DETECTED LANGUAGE IS: [IDENTIFY IT]

⚠️ WRITE THE ENTIRE BLOG POST IN THIS DETECTED LANGUAGE!
⚠️ DO NOT MIX LANGUAGES - 100% IN THE DETECTED LANGUAGE!
⚠️ TITLE, CONTENT, AND SUMMARY MUST ALL BE IN THE SAME LANGUAGE!

Write a comprehensive, AIO and SEO-optimized blog post:

Store Name: ${safeGet(shop.shopName, "the store")}
Store Domain: ${session.shop}
Product: ${product.title}
Description: ${safeGet(product.description, "")}
Blog Title Theme: ${selectedOptimizations.blogPost}

🎯 CRITICAL:
- Write EVERYTHING in the DETECTED LANGUAGE
- Mention the store name "${safeGet(shop.shopName, "the store")}" naturally 5-8 times throughout
- Focus on the store's unique value proposition
- Explain why customers should choose ${safeGet(shop.shopName, "the store")} over competitors

CONTENT STRATEGY:
- Identify and emphasize the business model (selling/rental/service)
- Include natural phrases mentioning ${safeGet(shop.shopName, "the store")}
- Differentiate from competitors and manufacturers
- Create compelling reasons to visit ${safeGet(shop.shopName, "the store")}

Requirements:
- 800-1200 words IN THE DETECTED LANGUAGE
- Include product benefits AND store benefits
- AIO-optimized with natural keyword placement + store mentions
- Engaging and informative tone
- Include a strong call-to-action mentioning ${safeGet(shop.shopName, "the store")} at the end
- HTML formatted with proper paragraphs and headings
- Use <h2> for section titles, <h3> for subsections
- Use <p> tags for paragraphs
- Include <strong> and <em> for emphasis where appropriate

LANGUAGE VALIDATION CHECKLIST:
==============================
✓ Is the blog title in the DETECTED LANGUAGE?
✓ Is ALL blog content in the DETECTED LANGUAGE?
✓ Is the summary in the DETECTED LANGUAGE?

Return ONLY valid JSON (no markdown, no code blocks):
{
  "detectedLanguage": "The language detected from the product",
  "title": "Blog post title IN THE DETECTED LANGUAGE including ${safeGet(shop.shopName, "the store")}",
  "bodyHtml": "Full HTML content IN THE DETECTED LANGUAGE (800-1200 words) - MUST mention ${safeGet(shop.shopName, "the store")} 5-8 times naturally",
  "summary": "Brief 2-3 sentence summary IN THE DETECTED LANGUAGE mentioning ${safeGet(shop.shopName, "the store")}"
}

🌍 FINAL REMINDER: 100% of the blog post must be in the SAME LANGUAGE as the product! 🌍`;

            // Appeler Gemini pour le blog
            console.log("🚀 Calling Gemini API for blog post...");
            const blogResponse = await callGeminiWithRetry(
              blogPrompt,
              {
                model: "gemini-2.0-flash-exp",
                generationConfig: {
                  temperature: 0.8,
                  topK: 40,
                  topP: 0.95,
                  maxOutputTokens: 4096,
                },
              },
              2, // 2 retries
              60000 // 60s timeout
            );

            // Parser la réponse
            const blogPost = parseGeminiJSON(blogResponse, "blog");

            console.log(`✅ Blog post generated: ${blogPost.title} (${blogPost.bodyHtml.length} chars)`);
            console.log(`🌍 Blog language: ${safeGet(blogPost.detectedLanguage, "unknown")}`);

            updatedFields.push("blog post generated");

            // Sauvegarder dans la DB
            const savedBlogPost = await prisma.blogPost.create({
              data: {
                id: `blog_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
                shopId: shop.id,
                productId: product.id,
                title: blogPost.title,
                content: blogPost.bodyHtml,
                slug: `blog-${Date.now()}`,
                status: "DRAFT",
                publishedAt: null,
              },
            });

            console.log(`💾 Blog post saved to database: ${savedBlogPost.id}`);

            // Retourner les données du blog
            return json({
              success: true,
              message: `Successfully updated: ${updatedFields.join(", ")}`,
              updatedFields,
              shopDomain: session.shop,
              blogPost: {
                id: savedBlogPost.id,
                title: blogPost.title,
                content: blogPost.bodyHtml,
                summary: safeGet(blogPost.summary, ""),
              },
            });
          } catch (blogError: any) {
            console.error("❌ Blog post generation error:", blogError);
            updatedFields.push("blog post (generation failed)");
            // Continue quand même pour appliquer les autres changements
          }
        }

        console.log(`✅ Optimizations applied for ${product.title}: ${updatedFields.join(", ")}`);

        return json({
          success: true,
          message: `Successfully updated: ${updatedFields.join(", ")}`,
          updatedFields,
        });
      } catch (error: any) {
        console.error("❌ Error applying optimizations:", error);
        return json({
          error: `Failed to apply optimizations: ${error.message}`,
        }, { status: 500 });
      }
    }

    return json({ error: "Invalid action" }, { status: 400 });
  } catch (error: any) {
    console.error("❌ Action error:", error);
    return json({
      error: `Server error: ${error.message}`,
    }, { status: 500 });
  }
};

// ============================================
// 🎨 COMPONENT
// ============================================

export default function Optimize() {
  const { shop, products } = useLoaderData<typeof loader>();
  const [selectedProduct, setSelectedProduct] = useState<any>(null);
  const [suggestions, setSuggestions] = useState<any>(null);
  const [selectedOptimizations, setSelectedOptimizations] = useState({
    title: true,
    description: true,
    tags: true,
    faq: true,
    metaTitle: true,
    metaDescription: true,
    blogPost: true,
  });

  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState<"all" | "optimized" | "notOptimized">("all");
  const [sortBy, setSortBy] = useState<"citationRate" | "optimizationDate" | "title">("citationRate");
  const [copySuccess, setCopySuccess] = useState(false);

  const fetcher = useFetcher();

  const formatOptimizationDate = (date: string | null) => {
    if (!date) return null;
    const d = new Date(date);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - d.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return "Today";
    if (diffDays === 1) return "Yesterday";
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;

    return d.toLocaleDateString();
  };

  const filteredAndSortedProducts = useMemo(() => {
    let filtered = products;

    if (searchQuery) {
      filtered = filtered.filter(p =>
        p.title.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    if (filterStatus === "optimized") {
      filtered = filtered.filter(p => p.lastOptimizedAt);
    } else if (filterStatus === "notOptimized") {
      filtered = filtered.filter(p => !p.lastOptimizedAt);
    }

    const sorted = [...filtered].sort((a, b) => {
      switch (sortBy) {
        case "citationRate":
          return a.citationRate - b.citationRate;
        case "optimizationDate":
          if (!a.lastOptimizedAt && !b.lastOptimizedAt) return 0;
          if (!a.lastOptimizedAt) return 1;
          if (!b.lastOptimizedAt) return -1;
          return new Date(b.lastOptimizedAt).getTime() - new Date(a.lastOptimizedAt).getTime();
        case "title":
          return a.title.localeCompare(b.title);
        default:
          return 0;
      }
    });

    return sorted;
  }, [products, searchQuery, filterStatus, sortBy]);

  const stats = useMemo(() => {
    const optimized = products.filter(p => p.lastOptimizedAt).length;
    const total = products.length;
    const avgScore = products.length > 0
      ? Math.round(products.reduce((acc, p) => acc + p.citationRate, 0) / products.length)
      : 0;

    return { optimized, total, avgScore };
  }, [products]);

  const handleGenerateSuggestions = (product: any) => {
    setSelectedProduct(product);
    setSuggestions(null);
    setSelectedOptimizations({
      title: true,
      description: true,
      tags: true,
      faq: true,
      metaTitle: true,
      metaDescription: true,
      blogPost: true,
    });

    const formData = new FormData();
    formData.append("action", "generateSuggestions");
    formData.append("productId", product.id);

    fetcher.submit(formData, { method: "post" });
  };

  if (fetcher.data?.suggestions && !suggestions) {
    setSuggestions(fetcher.data.suggestions);
  }

  const handleApplyOptimizations = () => {
    if (!suggestions) return;

    const optimizationsToApply: any = {};

    if (selectedOptimizations.title) optimizationsToApply.title = suggestions.title;
    if (selectedOptimizations.description) optimizationsToApply.description = suggestions.description;
    if (selectedOptimizations.tags) optimizationsToApply.tags = suggestions.tags.join(", ");
    if (selectedOptimizations.faq) optimizationsToApply.faq = JSON.stringify(suggestions.faq);
    if (selectedOptimizations.metaTitle) optimizationsToApply.metaTitle = suggestions.metaTitle;
    if (selectedOptimizations.metaDescription) optimizationsToApply.metaDescription = suggestions.metaDescription;
    if (selectedOptimizations.blogPost) optimizationsToApply.blogPost = suggestions.blogPostTitle;

    const formData = new FormData();
    formData.append("action", "applyOptimizations");
    formData.append("productId", selectedProduct.id);
    formData.append("selectedOptimizations", JSON.stringify(optimizationsToApply));
    formData.append("shopDomain", shop.shopName);

    fetcher.submit(formData, { method: "post" });
  };

  const handleCopyBlogContent = async (content: string) => {
    try {
      await navigator.clipboard.writeText(content);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 3000);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  const getScoreColor = (rate: number) => {
    if (rate >= 70) return "#4caf50";
    if (rate >= 40) return "#ff9800";
    return "#f44336";
  };

  const canOptimize = shop && shop.credits > 0;

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
            padding: "24px",
          }}
          onClick={() => {
            setSelectedProduct(null);
            setSuggestions(null);
          }}
        >
          <div
            style={{
              background: "white",
              borderRadius: "12px",
              padding: "32px",
              maxWidth: "900px",
              maxHeight: "90vh",
              overflow: "auto",
              boxShadow: "0 4px 20px rgba(0,0,0,0.2)",
              width: "100%",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px" }}>
              <h2 style={{ fontSize: "24px", fontWeight: "600", margin: 0, color: "#202223" }}>
                ✨ AIO Suggestions
              </h2>
              <button
                onClick={() => {
                  setSelectedProduct(null);
                  setSuggestions(null);
                }}
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

            <div style={{ marginBottom: "24px", padding: "16px", background: "#f9f9f9", borderRadius: "8px" }}>
              <h3 style={{ fontSize: "18px", fontWeight: "600", margin: "0 0 8px 0", color: "#202223" }}>
                {selectedProduct.title}
              </h3>
              <div style={{ fontSize: "14px", color: "#6d7175" }}>
                Current Score: <span style={{ fontSize: "20px", fontWeight: "700", color: getScoreColor(selectedProduct.citationRate) }}>
                  {selectedProduct.citationRate}%
                </span>
              </div>
            </div>

            {fetcher.state === "submitting" && fetcher.formData?.get("action") === "generateSuggestions" && !suggestions ? (
              <div style={{ textAlign: "center", padding: "60px 20px" }}>
                <div style={{ fontSize: "48px", marginBottom: "16px" }}>🤖</div>
                <p style={{ fontSize: "16px", color: "#6d7175", margin: 0 }}>
                  Generating AIO-powered suggestions with Gemini 2.0 Flash... (1 credit)
                </p>
                {fetcher.data?.scanContextUsed && (
                  <p style={{ fontSize: "14px", color: "#2196f3", marginTop: "8px" }}>
                    🆕 Enhanced with recent scan context
                  </p>
                )}
              </div>
            ) : suggestions ? (
              <div>
                {suggestions.detectedLanguage && (
                  <div style={{
                    marginBottom: "16px",
                    padding: "12px",
                    background: "#e1f5fe",
                    borderRadius: "8px",
                    border: "1px solid #03a9f4"
                  }}>
                    <span style={{ fontSize: "14px", color: "#0288d1", fontWeight: "600" }}>
                      🌍 Detected Language: {suggestions.detectedLanguage}
                    </span>
                    {fetcher.data?.scanContextUsed && (
                      <span style={{ fontSize: "13px", color: "#0288d1", marginLeft: "12px" }}>
                        | 🆕 Enhanced with scan data
                      </span>
                    )}
                  </div>
                )}

                <p style={{ fontSize: "14px", color: "#6d7175", marginBottom: "24px" }}>
                  Select which optimizations to apply (all checked by default):
                </p>

                {/* Title */}
                <div style={{ marginBottom: "16px", padding: "16px", background: "#e8f5e9", borderRadius: "8px", border: "1px solid #4caf50" }}>
                  <label style={{ display: "flex", alignItems: "flex-start", gap: "12px", cursor: "pointer" }}>
                    <input
                      type="checkbox"
                      checked={selectedOptimizations.title}
                      onChange={(e) => setSelectedOptimizations({ ...selectedOptimizations, title: e.target.checked })}
                      style={{ marginTop: "4px", width: "18px", height: "18px", cursor: "pointer" }}
                    />
                    <div style={{ flex: 1 }}>
                      <h4 style={{ fontSize: "16px", fontWeight: "600", margin: "0 0 8px 0", color: "#202223" }}>
                        📝 AIO-Optimized Title
                      </h4>
                      <div style={{ fontSize: "14px", color: "#2e7d32", marginBottom: "8px", fontWeight: "500" }}>
                        {suggestions.title}
                      </div>
                      <div style={{ fontSize: "13px", color: "#6d7175" }}>
                        Original: {selectedProduct.title}
                      </div>
                    </div>
                  </label>
                </div>

                {/* Description */}
                <div style={{ marginBottom: "16px", padding: "16px", background: "#e3f2fd", borderRadius: "8px", border: "1px solid #2196f3" }}>
                  <label style={{ display: "flex", alignItems: "flex-start", gap: "12px", cursor: "pointer" }}>
                    <input
                      type="checkbox"
                      checked={selectedOptimizations.description}
                      onChange={(e) => setSelectedOptimizations({ ...selectedOptimizations, description: e.target.checked })}
                      style={{ marginTop: "4px", width: "18px", height: "18px", cursor: "pointer" }}
                    />
                    <div style={{ flex: 1 }}>
                      <h4 style={{ fontSize: "16px", fontWeight: "600", margin: "0 0 12px 0", color: "#202223" }}>
                        📄 AIO-Optimized Description
                      </h4>
                      <div
                        style={{
                          fontSize: "14px",
                          color: "#1976d2",
                          lineHeight: "1.6",
                          maxHeight: "150px",
                          overflow: "auto",
                          padding: "12px",
                          background: "white",
                          borderRadius: "4px",
                        }}
                      >
                        {suggestions.description}
                      </div>
                    </div>
                  </label>
                </div>

                {/* Tags */}
                <div style={{ marginBottom: "16px", padding: "16px", background: "#fff3e0", borderRadius: "8px", border: "1px solid #ff9800" }}>
                  <label style={{ display: "flex", alignItems: "flex-start", gap: "12px", cursor: "pointer" }}>
                    <input
                      type="checkbox"
                      checked={selectedOptimizations.tags}
                      onChange={(e) => setSelectedOptimizations({ ...selectedOptimizations, tags: e.target.checked })}
                      style={{ marginTop: "4px", width: "18px", height: "18px", cursor: "pointer" }}
                    />
                    <div style={{ flex: 1 }}>
                      <h4 style={{ fontSize: "16px", fontWeight: "600", margin: "0 0 8px 0", color: "#202223" }}>
                        🏷️ Optimized Tags
                      </h4>
                      <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                        {suggestions.tags.map((tag: string, index: number) => (
                          <span
                            key={index}
                            style={{
                              background: "#ff9800",
                              color: "white",
                              padding: "4px 12px",
                              borderRadius: "12px",
                              fontSize: "13px",
                              fontWeight: "500",
                            }}
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    </div>
                  </label>
                </div>

                {/* FAQ */}
                {suggestions.faq && suggestions.faq.length > 0 && (
                  <div style={{ marginBottom: "16px", padding: "16px", background: "#f3e5f5", borderRadius: "8px", border: "1px solid #9c27b0" }}>
                    <label style={{ display: "flex", alignItems: "flex-start", gap: "12px", cursor: "pointer" }}>
                      <input
                        type="checkbox"
                        checked={selectedOptimizations.faq}
                        onChange={(e) => setSelectedOptimizations({ ...selectedOptimizations, faq: e.target.checked })}
                        style={{ marginTop: "4px", width: "18px", height: "18px", cursor: "pointer" }}
                      />
                      <div style={{ flex: 1 }}>
                        <h4 style={{ fontSize: "16px", fontWeight: "600", margin: "0 0 12px 0", color: "#202223" }}>
                          ❓ Product FAQ ({suggestions.faq.length} questions)
                        </h4>
                        {suggestions.faq.map((item: any, index: number) => (
                          <div key={index} style={{ marginBottom: "12px" }}>
                            <div style={{ fontSize: "14px", fontWeight: "600", color: "#7b1fa2", marginBottom: "4px" }}>
                              Q: {item.question}
                            </div>
                            <div style={{ fontSize: "13px", color: "#6d7175", paddingLeft: "12px" }}>
                              A: {item.answer}
                            </div>
                          </div>
                        ))}
                        <div style={{ fontSize: "12px", color: "#7b1fa2", marginTop: "8px" }}>
                          → Will be added at bottom of description
                        </div>
                      </div>
                    </label>
                  </div>
                )}

                {/* Blog Post */}
                {suggestions.blogPostTitle && (
                  <div style={{ marginBottom: "16px", padding: "16px", background: "#e0f2f1", borderRadius: "8px", border: "1px solid #009688" }}>
                    <label style={{ display: "flex", alignItems: "flex-start", gap: "12px", cursor: "pointer" }}>
                      <input
                        type="checkbox"
                        checked={selectedOptimizations.blogPost}
                        onChange={(e) => setSelectedOptimizations({ ...selectedOptimizations, blogPost: e.target.checked })}
                        style={{ marginTop: "4px", width: "18px", height: "18px", cursor: "pointer" }}
                      />
                      <div style={{ flex: 1 }}>
                        <h4 style={{ fontSize: "16px", fontWeight: "600", margin: "0 0 8px 0", color: "#202223" }}>
                          📝 AIO Blog Post (800-1200 words)
                        </h4>
                        <div style={{ fontSize: "14px", color: "#00796b", fontWeight: "500" }}>
                          {suggestions.blogPostTitle}
                        </div>
                        <div style={{ fontSize: "12px", color: "#00796b", marginTop: "8px" }}>
                          → Will be saved for your Shopify blog
                        </div>
                      </div>
                    </label>
                  </div>
                )}

                {/* Meta Title */}
                {suggestions.metaTitle && (
                  <div style={{ marginBottom: "16px", padding: "16px", background: "#fce4ec", borderRadius: "8px", border: "1px solid #e91e63" }}>
                    <label style={{ display: "flex", alignItems: "flex-start", gap: "12px", cursor: "pointer" }}>
                      <input
                        type="checkbox"
                        checked={selectedOptimizations.metaTitle}
                        onChange={(e) => setSelectedOptimizations({ ...selectedOptimizations, metaTitle: e.target.checked })}
                        style={{ marginTop: "4px", width: "18px", height: "18px", cursor: "pointer" }}
                      />
                      <div style={{ flex: 1 }}>
                        <h4 style={{ fontSize: "16px", fontWeight: "600", margin: "0 0 8px 0", color: "#202223" }}>
                          📊 SEO Meta Title
                        </h4>
                        <div style={{ fontSize: "14px", color: "#c2185b", fontWeight: "500" }}>
                          {suggestions.metaTitle}
                        </div>
                        <div style={{ fontSize: "12px", color: "#6d7175", marginTop: "4px" }}>
                          For Google search results
                        </div>
                      </div>
                    </label>
                  </div>
                )}

                {/* Meta Description */}
                {suggestions.metaDescription && (
                  <div style={{ marginBottom: "16px", padding: "16px", background: "#e8eaf6", borderRadius: "8px", border: "1px solid #3f51b5" }}>
                    <label style={{ display: "flex", alignItems: "flex-start", gap: "12px", cursor: "pointer" }}>
                      <input
                        type="checkbox"
                        checked={selectedOptimizations.metaDescription}
                        onChange={(e) => setSelectedOptimizations({ ...selectedOptimizations, metaDescription: e.target.checked })}
                        style={{ marginTop: "4px", width: "18px", height: "18px", cursor: "pointer" }}
                      />
                      <div style={{ flex: 1 }}>
                        <h4 style={{ fontSize: "16px", fontWeight: "600", margin: "0 0 8px 0", color: "#202223" }}>
                          📊 SEO Meta Description
                        </h4>
                        <div style={{ fontSize: "14px", color: "#303f9f", lineHeight: "1.6" }}>
                          {suggestions.metaDescription}
                        </div>
                        <div style={{ fontSize: "12px", color: "#6d7175", marginTop: "4px" }}>
                          For Google search results snippet
                        </div>
                      </div>
                    </label>
                  </div>
                )}

                {/* Reasoning */}
                <div style={{ marginBottom: "24px", padding: "16px", background: "#f5f5f5", borderRadius: "8px" }}>
                  <h4 style={{ fontSize: "16px", fontWeight: "600", margin: "0 0 8px 0", color: "#202223" }}>
                    💡 Why These Changes?
                  </h4>
                  <p style={{ fontSize: "14px", color: "#6d7175", margin: 0, lineHeight: "1.6" }}>
                    {suggestions.reasoning}
                  </p>
                </div>

                {/* Action Buttons */}
                <div style={{ display: "flex", gap: "12px", justifyContent: "flex-end" }}>
                  <button
                    onClick={() => {
                      setSelectedProduct(null);
                      setSuggestions(null);
                    }}
                    style={{
                      background: "#e0e0e0",
                      color: "#6d7175",
                      border: "none",
                      padding: "12px 24px",
                      borderRadius: "8px",
                      fontSize: "14px",
                      fontWeight: "600",
                      cursor: "pointer",
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleApplyOptimizations}
                    disabled={fetcher.state !== "idle"}
                    style={{
                      background: fetcher.state === "idle" ? "#4caf50" : "#e0e0e0",
                      color: "white",
                      border: "none",
                      padding: "12px 24px",
                      borderRadius: "8px",
                      fontSize: "14px",
                      fontWeight: "600",
                      cursor: fetcher.state === "idle" ? "pointer" : "not-allowed",
                    }}
                  >
                    {fetcher.state === "submitting" && fetcher.formData?.get("action") === "applyOptimizations" ? "Applying..." : "✅ Apply Selected Changes"}
                  </button>
                </div>

                {fetcher.data?.success && fetcher.data?.message && fetcher.formData?.get("action") === "applyOptimizations" && (
                  <div style={{ marginTop: "16px", padding: "16px", background: "#e8f5e9", borderRadius: "8px", border: "1px solid #4caf50" }}>
                    <p style={{ fontSize: "14px", color: "#2e7d32", margin: 0 }}>
                      ✅ {fetcher.data.message}
                    </p>
                  </div>
                )}

                {fetcher.data?.blogPost && (
                  <div style={{ marginTop: "16px", padding: "16px", background: "#e0f2f1", borderRadius: "8px", border: "1px solid #009688" }}>
                    <h4 style={{ fontSize: "16px", fontWeight: "600", margin: "0 0 12px 0", color: "#202223" }}>
                      📝 Blog Post Generated!
                    </h4>
                    <div style={{ marginBottom: "12px" }}>
                      <div style={{ fontSize: "14px", fontWeight: "600", color: "#00796b", marginBottom: "8px" }}>
                        Title: {fetcher.data.blogPost.title}
                      </div>
                      <div style={{ fontSize: "12px", color: "#6d7175", marginBottom: "8px" }}>
                        {fetcher.data.blogPost.summary}
                      </div>
                    </div>
                    <div style={{ marginBottom: "12px" }}>
                      <label style={{ fontSize: "12px", fontWeight: "600", color: "#202223", display: "block", marginBottom: "4px" }}>
                        Copy this content and paste it into your Shopify blog:
                      </label>
                      <textarea
                        readOnly
                        value={fetcher.data.blogPost.content}
                        style={{
                          width: "100%",
                          height: "200px",
                          padding: "12px",
                          border: "1px solid #ddd",
                          borderRadius: "4px",
                          fontSize: "12px",
                          fontFamily: "monospace",
                          resize: "vertical",
                        }}
                      />
                    </div>
                    <div style={{ display: "flex", gap: "8px" }}>
                      <button
                        onClick={() => handleCopyBlogContent(fetcher.data.blogPost.content)}
                        style={{
                          background: copySuccess ? "#4caf50" : "#009688",
                          color: "white",
                          border: "none",
                          padding: "8px 16px",
                          borderRadius: "4px",
                          fontSize: "13px",
                          fontWeight: "600",
                          cursor: "pointer",
                        }}
                      >
                        {copySuccess ? "✅ Copied!" : "📋 Copy Content"}
                      </button>
                      <a
                        href={`https://${fetcher.data.shopDomain}/admin/articles/new`}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                          background: "#2196f3",
                          color: "white",
                          border: "none",
                          padding: "8px 16px",
                          borderRadius: "4px",
                          fontSize: "13px",
                          fontWeight: "600",
                          textDecoration: "none",
                          display: "inline-block",
                        }}
                      >
                        🔗 Open Shopify Blog Editor
                      </a>
                    </div>
                    <div style={{ fontSize: "11px", color: "#6d7175", marginTop: "12px" }}>
                      💡 Tip: Copy the content, click "Open Shopify Blog Editor", paste into the body, add the title, and publish!
                    </div>
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
            ) : null}
          </div>
        </div>
      )}

      <div style={{ padding: "0 24px 24px 24px" }}>
        <div style={{ marginBottom: "32px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
            <div>
              <h1 style={{ fontSize: "28px", fontWeight: "600", margin: "0 0 8px 0", color: "#202223" }}>
                ✨ AIO Optimize
              </h1>
              <p style={{ fontSize: "16px", color: "#6d7175", margin: 0 }}>
                AI-powered suggestions to boost your store & product visibility
              </p>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "16px", marginBottom: "24px" }}>
          <div style={{ background: "white", padding: "16px", borderRadius: "8px", boxShadow: "0 1px 3px rgba(0,0,0,0.1)" }}>
            <div style={{ fontSize: "28px", fontWeight: "700", color: "#2196f3" }}>{stats.total}</div>
            <div style={{ fontSize: "14px", color: "#6d7175" }}>Total Products</div>
          </div>
          <div style={{ background: "white", padding: "16px", borderRadius: "8px", boxShadow: "0 1px 3px rgba(0,0,0,0.1)" }}>
            <div style={{ fontSize: "28px", fontWeight: "700", color: "#4caf50" }}>{stats.optimized}</div>
            <div style={{ fontSize: "14px", color: "#6d7175" }}>Optimized</div>
          </div>
          <div style={{ background: "white", padding: "16px", borderRadius: "8px", boxShadow: "0 1px 3px rgba(0,0,0,0.1)" }}>
            <div style={{ fontSize: "28px", fontWeight: "700", color: "#ff9800" }}>{stats.total - stats.optimized}</div>
            <div style={{ fontSize: "14px", color: "#6d7175" }}>Not Optimized</div>
          </div>
          <div style={{ background: "white", padding: "16px", borderRadius: "8px", boxShadow: "0 1px 3px rgba(0,0,0,0.1)" }}>
            <div style={{ fontSize: "28px", fontWeight: "700", color: getScoreColor(stats.avgScore) }}>{stats.avgScore}%</div>
            <div style={{ fontSize: "14px", color: "#6d7175" }}>Avg Citation Rate</div>
          </div>
        </div>

        {/* Search & Filters */}
        <div style={{ background: "white", padding: "16px", borderRadius: "8px", marginBottom: "16px", boxShadow: "0 1px 3px rgba(0,0,0,0.1)" }}>
          <div style={{ display: "flex", gap: "12px", flexWrap: "wrap", alignItems: "center" }}>
            <div style={{ flex: "1 1 300px", minWidth: "200px" }}>
              <input
                type="text"
                placeholder="🔍 Search products..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{
                  width: "100%",
                  padding: "8px 12px",
                  border: "1px solid #ddd",
                  borderRadius: "6px",
                  fontSize: "14px",
                }}
              />
            </div>

            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value as any)}
              style={{
                padding: "8px 12px",
                border: "1px solid #ddd",
                borderRadius: "6px",
                fontSize: "14px",
                cursor: "pointer",
              }}
            >
              <option value="all">All Products</option>
              <option value="optimized">✅ Optimized</option>
              <option value="notOptimized">⏳ Not Optimized</option>
            </select>

            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              style={{
                padding: "8px 12px",
                border: "1px solid #ddd",
                borderRadius: "6px",
                fontSize: "14px",
                cursor: "pointer",
              }}
            >
              <option value="citationRate">Sort by: Citation Rate (Low → High)</option>
              <option value="optimizationDate">Sort by: Last Optimized</option>
              <option value="title">Sort by: Title (A → Z)</option>
            </select>

            <div style={{ marginLeft: "auto", fontSize: "14px", color: "#6d7175" }}>
              {filteredAndSortedProducts.length} products found
            </div>
          </div>
        </div>

        <div style={{ background: "#fff3cd", padding: "16px", borderRadius: "8px", marginBottom: "24px", border: "1px solid #ffeaa7" }}>
          <p style={{ fontSize: "14px", color: "#856404", margin: 0 }}>
            <strong>💡 How it works:</strong> Click "Get Suggestions" (1 credit) on any product. Review AIO-generated optimizations (all checked by default) and uncheck what you don't want. Click "Apply Selected Changes" to update your Shopify store instantly!
            <strong>🆕 NEW:</strong> Suggestions are now enhanced with scan context when available for better results.
          </p>
        </div>

        {filteredAndSortedProducts.length === 0 ? (
          <div style={{ background: "white", borderRadius: "12px", padding: "60px 20px", boxShadow: "0 1px 3px rgba(0,0,0,0.1)", textAlign: "center" }}>
            <p style={{ fontSize: "16px", color: "#9e9e9e", margin: 0 }}>
              {products.length === 0
                ? "No products found. Products will appear here automatically."
                : "No products match your search or filter criteria."}
            </p>
          </div>
        ) : (
          <div style={{ background: "white", borderRadius: "12px", boxShadow: "0 1px 3px rgba(0,0,0,0.1)", overflow: "hidden" }}>
            <div style={{ display: "flex", flexDirection: "column", gap: "0" }}>
              {filteredAndSortedProducts.map((product, index) => (
                <div
                  key={product.id}
                  style={{
                    padding: "24px",
                    borderBottom: index < filteredAndSortedProducts.length - 1 ? "1px solid #f0f0f0" : "none",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    gap: "24px",
                    position: "relative",
                  }}
                >
                  {product.lastOptimizedAt && (
                    <div
                      style={{
                        position: "absolute",
                        top: "8px",
                        right: "8px",
                        background: "#4caf50",
                        color: "white",
                        padding: "4px 8px",
                        borderRadius: "4px",
                        fontSize: "11px",
                        fontWeight: "600",
                      }}
                    >
                      ✅ Optimized {formatOptimizationDate(product.lastOptimizedAt)}
                    </div>
                  )}

                  <div style={{ flex: 1 }}>
                    <h3 style={{ fontSize: "18px", fontWeight: "600", margin: "0 0 8px 0", color: "#202223", paddingRight: "120px" }}>
                      {product.title}
                    </h3>
                    <div style={{ display: "flex", gap: "12px", fontSize: "13px", marginBottom: "8px" }}>
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
                    {product.citationRate < 40 && !product.lastOptimizedAt && (
                      <div style={{ fontSize: "13px", color: "#f44336", fontWeight: "500" }}>
                        ⚠️ Low visibility - AIO optimization recommended
                      </div>
                    )}
                  </div>

                  <div style={{ textAlign: "right", display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "12px" }}>
                    <div>
                      <div style={{ fontSize: "32px", fontWeight: "700", color: getScoreColor(product.citationRate) }}>
                        {product.citationRate}%
                      </div>
                      <div style={{ fontSize: "11px", color: "#6d7175" }}>Citation Rate</div>
                    </div>
                    <button
                      onClick={() => handleGenerateSuggestions(product)}
                      disabled={!canOptimize || fetcher.state !== "idle"}
                      style={{
                        background: canOptimize && fetcher.state === "idle" ? "#2196f3" : "#e0e0e0",
                        color: "white",
                        border: "none",
                        padding: "10px 20px",
                        borderRadius: "8px",
                        fontSize: "14px",
                        fontWeight: "600",
                        cursor: canOptimize && fetcher.state === "idle" ? "pointer" : "not-allowed",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {product.lastOptimizedAt ? "🔄 Re-optimize (1 💳)" : "✨ Get Suggestions (1 💳)"}
                    </button>
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