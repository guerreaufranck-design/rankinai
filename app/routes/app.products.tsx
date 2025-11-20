import type { LoaderFunctionArgs, ActionFunctionArgs } from "react-router";
import { json } from "~/utils/response";
import { useLoaderData, useFetcher } from "react-router";
import { authenticate } from "~/shopify.server";
import { prisma } from "~/db.server";
import { useState } from "react";
import OpenAI from "openai";
import { GoogleGenerativeAI } from "@google/generative-ai";
import AppHeader from "~/components/AppHeader";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

// 🆕 BUSINESS CONTEXT BUILDER
interface BusinessContext {
  businessModel: string; // 'ecommerce', 'rental', 'marketplace', 'service', 'subscription'
  geography: string; // 'Canary Islands', 'Spain', 'Europe', 'Worldwide'
  niche: string; // 'baby products', 'fashion', 'electronics', etc.
  targetMarket: string; // 'local', 'regional', 'national', 'international'
  serviceType: string; // 'buy', 'rent', 'lease', 'subscribe', 'service'
}

/**
 * 🎯 BUILD BUSINESS CONTEXT FROM SHOP DATA
 * This function analyzes the shop to understand its real business model
 */
function buildBusinessContext(shop: any, product: any): BusinessContext {
  // Analyze shop domain and name for clues
  const shopDomain = shop.shopifyDomain.toLowerCase();
  const shopName = shop.shopName.toLowerCase();
  const productTitle = product.title.toLowerCase();
  const productDesc = (product.description || "").toLowerCase();
  
  // 🔍 DETECT BUSINESS MODEL
  let businessModel = 'ecommerce'; // default
  if (
    shopName.includes('rental') || shopName.includes('rent') || shopName.includes('hire') ||
    productDesc.includes('rental') || productDesc.includes('for rent') || productDesc.includes('hire')
  ) {
    businessModel = 'rental';
  } else if (
    shopName.includes('subscription') || shopName.includes('subscribe') ||
    productDesc.includes('subscription') || productDesc.includes('monthly box')
  ) {
    businessModel = 'subscription';
  } else if (
    shopName.includes('marketplace') || shopName.includes('platform')
  ) {
    businessModel = 'marketplace';
  } else if (
    shopName.includes('service') || shopName.includes('booking') ||
    productDesc.includes('service') || productDesc.includes('appointment')
  ) {
    businessModel = 'service';
  }
  
  // 🌍 DETECT GEOGRAPHY (from shop data or domain)
  let geography = 'Worldwide';
  let targetMarket = 'international';
  
  // If shop has location data (will be added to Prisma)
  if (shop.shopCountry) {
    geography = shop.shopCountry;
    targetMarket = 'national';
    
    if (shop.shopRegion) {
      geography = `${shop.shopRegion}, ${shop.shopCountry}`;
      targetMarket = 'regional';
    }
    
    if (shop.shopCity) {
      geography = `${shop.shopCity}, ${shop.shopRegion || shop.shopCountry}`;
      targetMarket = 'local';
    }
  } else {
    // Detect from domain
    if (shopDomain.includes('.es') || shopName.includes('spain') || shopName.includes('españa')) {
      geography = 'Spain';
      targetMarket = 'national';
    } else if (shopDomain.includes('.uk') || shopName.includes('uk')) {
      geography = 'United Kingdom';
      targetMarket = 'national';
    } else if (shopDomain.includes('.de') || shopName.includes('germany')) {
      geography = 'Germany';
      targetMarket = 'national';
    } else if (shopDomain.includes('.fr') || shopName.includes('france')) {
      geography = 'France';
      targetMarket = 'national';
    }
    
    // Check for regional mentions
    if (shopName.includes('canary') || shopName.includes('canarias') || shopName.includes('tenerife')) {
      geography = 'Canary Islands, Spain';
      targetMarket = 'regional';
    }
  }
  
  // 🎯 DETECT NICHE (from product catalog)
  let niche = 'general';
  const keywords = (productTitle + ' ' + productDesc).toLowerCase();
  
  if (keywords.includes('baby') || keywords.includes('infant') || keywords.includes('toddler') || keywords.includes('kids')) {
    niche = 'baby products';
  } else if (keywords.includes('fashion') || keywords.includes('clothing') || keywords.includes('apparel')) {
    niche = 'fashion';
  } else if (keywords.includes('electronics') || keywords.includes('tech') || keywords.includes('gadget')) {
    niche = 'electronics';
  } else if (keywords.includes('home') || keywords.includes('furniture') || keywords.includes('decor')) {
    niche = 'home goods';
  } else if (keywords.includes('beauty') || keywords.includes('cosmetic') || keywords.includes('skincare')) {
    niche = 'beauty';
  } else if (keywords.includes('sport') || keywords.includes('fitness') || keywords.includes('gym')) {
    niche = 'sports equipment';
  }
  
  // 🛒 DETECT SERVICE TYPE
  let serviceType = 'buy';
  if (businessModel === 'rental') {
    serviceType = 'rent';
  } else if (businessModel === 'subscription') {
    serviceType = 'subscribe';
  } else if (businessModel === 'service') {
    serviceType = 'book';
  } else if (businessModel === 'marketplace') {
    serviceType = 'buy';
  }
  
  return {
    businessModel,
    geography,
    niche,
    targetMarket,
    serviceType,
  };
}

/**
 * 🎯 BUILD CONTEXTUAL PROMPT
 * Creates AI prompts that understand the shop's real business model
 */
function buildContextualPrompt(productTitle: string, context: BusinessContext): string {
  const { businessModel, geography, niche, targetMarket, serviceType } = context;
  
  // Build location context
  let locationPhrase = '';
  if (targetMarket === 'local' || targetMarket === 'regional') {
    locationPhrase = ` in ${geography}`;
  } else if (targetMarket === 'national') {
    locationPhrase = ` in ${geography}`;
  }
  // For international, no location phrase needed
  
  // Build business model context
  let actionVerb = serviceType; // 'buy', 'rent', 'subscribe', 'book'
  let businessPhrase = '';
  
  if (businessModel === 'rental') {
    businessPhrase = 'I need to rent temporarily, not buy permanently.';
  } else if (businessModel === 'subscription') {
    businessPhrase = 'I want a subscription service, not a one-time purchase.';
  } else if (businessModel === 'service') {
    businessPhrase = 'I need to book a service, not buy a product.';
  }
  
  // Build competitor context
  let competitorGuidance = '';
  if (businessModel === 'rental') {
    competitorGuidance = ' Focus on rental services and shops that offer this for rent, not stores that sell it.';
  } else if (targetMarket === 'local' || targetMarket === 'regional') {
    competitorGuidance = ` Focus on local or regional businesses${locationPhrase}, not large international platforms.`;
  }
  
  // 🎯 FINAL CONTEXTUAL PROMPT
  const prompt = `I'm looking to ${actionVerb} ${productTitle}${locationPhrase}. ${businessPhrase}${competitorGuidance} Can you recommend where to ${actionVerb} it? Please suggest specific ${businessModel === 'rental' ? 'rental services' : businessModel === 'subscription' ? 'subscription services' : businessModel === 'service' ? 'service providers' : 'retailers'} with their website URLs if possible.`;
  
  return prompt;
}

/**
 * 🆕 CONTEXT-AWARE COMPETITOR ANALYZER
 * Filters competitors based on shop's business context
 */
class ContextAwareCompetitorAnalyzer {
  /**
   * 🎯 EXTRACT CONTEXTUAL COMPETITORS
   * Only extracts competitors that match the shop's business model
   */
  static extractContextualCompetitors(
    response: string,
    shopDomain: string,
    shopName: string,
    productTitle: string,
    businessContext: BusinessContext
  ): {
    competitors: string[];
    competitorPositions: { [name: string]: number };
    shopPosition: number;
    nonCompetitors: string[]; // Generic platforms we filtered out
  } {
    const responseLower = response.toLowerCase();
    const allMentions = new Set<string>();
    const competitorPositions: { [name: string]: number } = {};
    const nonCompetitors: string[] = [];
    
    // 🚫 GENERIC PLATFORMS TO FILTER OUT (they're not real competitors)
    const genericPlatforms = new Set([
      'amazon', 'ebay', 'aliexpress', 'wish', 'etsy',
      'walmart', 'target', 'bestbuy', 'alibaba',
      'shein', 'temu', 'joom', 'banggood',
    ]);
    
    // 🔍 EXTRACT ALL POTENTIAL COMPETITOR MENTIONS
    
    // Pattern 1: "Shop at X" or "Available at X"
    const shopPatterns = [
      /(?:shop\s+at|available\s+at|buy\s+(?:from|at)|rent\s+(?:from|at)|check\s+out)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)/gi,
      /([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)\s+(?:offers?|provides?|rents?|sells?)/gi,
    ];
    
    shopPatterns.forEach(pattern => {
      const matches = response.matchAll(pattern);
      for (const match of matches) {
        if (match[1]) {
          const name = match[1].trim().toLowerCase();
          if (name.length > 2 && !name.includes(productTitle.toLowerCase())) {
            allMentions.add(name);
            if (!competitorPositions[name]) {
              competitorPositions[name] = responseLower.indexOf(name);
            }
          }
        }
      }
    });
    
    // Pattern 2: Domain mentions (website URLs)
    const domainPattern = /(?:https?:\/\/)?(?:www\.)?([a-z0-9-]+)\.(com|net|org|shop|store|co|io|es|uk|de|fr)/gi;
    const domainMatches = response.matchAll(domainPattern);
    for (const match of domainMatches) {
      const domain = match[1].toLowerCase();
      if (domain && domain.length > 2 && !domain.includes(shopDomain.toLowerCase())) {
        allMentions.add(domain);
        if (!competitorPositions[domain]) {
          competitorPositions[domain] = responseLower.indexOf(domain);
        }
      }
    }
    
    // 🎯 FILTER BASED ON BUSINESS CONTEXT
    const realCompetitors: string[] = [];
    
    allMentions.forEach(mention => {
      const isGeneric = genericPlatforms.has(mention);
      
      if (isGeneric) {
        // Filter out generic platforms (they're not real competitors)
        nonCompetitors.push(mention);
        delete competitorPositions[mention];
        return;
      }
      
      // Check if mention matches our business context
      const isRelevant = this.isRelevantCompetitor(
        mention,
        businessContext,
        responseLower
      );
      
      if (isRelevant) {
        realCompetitors.push(mention);
      } else {
        nonCompetitors.push(mention);
        delete competitorPositions[mention];
      }
    });
    
    // Find shop position
    const shopPosition = Math.min(
      responseLower.indexOf(shopDomain.toLowerCase()) >= 0 ? responseLower.indexOf(shopDomain.toLowerCase()) : Infinity,
      responseLower.indexOf(shopName.toLowerCase()) >= 0 ? responseLower.indexOf(shopName.toLowerCase()) : Infinity
    );
    
    return {
      competitors: realCompetitors,
      competitorPositions,
      shopPosition: shopPosition === Infinity ? -1 : shopPosition,
      nonCompetitors,
    };
  }
  
  /**
   * 🎯 CHECK IF MENTION IS RELEVANT COMPETITOR
   * Based on business model and context
   */
  static isRelevantCompetitor(
    mention: string,
    context: BusinessContext,
    fullResponse: string
  ): boolean {
    const mentionContext = this.extractMentionContext(mention, fullResponse);
    
    // For rental businesses, only rental services are competitors
    if (context.businessModel === 'rental') {
      return mentionContext.includes('rental') || 
             mentionContext.includes('rent') || 
             mentionContext.includes('hire') ||
             mentionContext.includes('lease');
    }
    
    // For subscription businesses, only subscription services are competitors
    if (context.businessModel === 'subscription') {
      return mentionContext.includes('subscription') || 
             mentionContext.includes('subscribe') || 
             mentionContext.includes('monthly box');
    }
    
    // For local/regional shops, check if competitor is also local
    if (context.targetMarket === 'local' || context.targetMarket === 'regional') {
      // If mention includes location keywords matching our geography, it's relevant
      const geographyKeywords = context.geography.toLowerCase().split(/,\s*/);
      const hasLocationMatch = geographyKeywords.some(keyword => 
        mentionContext.includes(keyword) || mention.includes(keyword)
      );
      
      if (hasLocationMatch) {
        return true;
      }
      
      // If no location mentioned, it's probably a generic platform (not relevant)
      return false;
    }
    
    // For niche-specific businesses, check niche relevance
    if (context.niche !== 'general') {
      const nicheKeywords = context.niche.split(/\s+/);
      const hasNicheMatch = nicheKeywords.some(keyword => 
        mentionContext.includes(keyword) || mention.includes(keyword)
      );
      
      return hasNicheMatch;
    }
    
    // Default: it's relevant
    return true;
  }
  
  /**
   * 🎯 EXTRACT CONTEXT AROUND A MENTION
   * Get the sentence or paragraph where the mention appears
   */
  static extractMentionContext(mention: string, fullResponse: string, contextLength: number = 150): string {
    const lowerResponse = fullResponse.toLowerCase();
    const mentionIndex = lowerResponse.indexOf(mention);
    
    if (mentionIndex === -1) {
      return '';
    }
    
    const start = Math.max(0, mentionIndex - contextLength);
    const end = Math.min(fullResponse.length, mentionIndex + mention.length + contextLength);
    
    return fullResponse.substring(start, end).toLowerCase();
  }
}

// 🆕 ENHANCED INTELLIGENCE LAYER FOR DYNAMIC COMPETITOR DETECTION
class AIResponseAnalyzer {
  /**
   * 🎯 EXTRACT KEYWORDS WITH CONTEXT
   */
  static extractKeywordsFromResponse(text: string): string[] {
    const stopwords = new Set([
      "the", "a", "an", "and", "or", "but", "is", "are", "was", "were", "to", "for", 
      "of", "in", "on", "at", "by", "with", "from", "as", "this", "that", "it", 
      "you", "be", "have", "has", "had", "can", "could", "will", "would", "should", 
      "may", "might", "must", "shall", "do", "does", "did"
    ]);

    const words = text.toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(w => w.length > 3 && !stopwords.has(w));
    
    // Count frequency
    const frequency: { [key: string]: number } = {};
    words.forEach(word => {
      frequency[word] = (frequency[word] || 0) + 1;
    });
    
    // Return top 15 most frequent words
    return Object.entries(frequency)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 15)
      .map(([word]) => word);
  }

  /**
   * 🎯 TOPIC COVERAGE ANALYSIS
   */
  static extractTopicsCovered(text: string): string[] {
    const topicPatterns: { [key: string]: RegExp[] } = {
      "warranty": [/warrant/i, /guarantee/i, /protect/i, /coverage/i],
      "shipping": [/ship/i, /deliver/i, /arrival/i, /transit/i],
      "materials": [/material/i, /leather/i, /plastic/i, /fabric/i, /metal/i, /wood/i],
      "pricing": [/price/i, /cost/i, /afford/i, /expensive/i, /cheap/i, /value/i, /budget/i],
      "reviews": [/review/i, /rating/i, /star/i, /customer/i, /feedback/i, /testimonial/i],
      "returns": [/return/i, /refund/i, /exchange/i, /money\s+back/i],
      "quality": [/quality/i, /durable/i, /premium/i, /reliable/i, /sturdy/i],
      "customer-service": [/support/i, /service/i, /help/i, /assistance/i, /contact/i],
      "eco-friendly": [/eco/i, /sustain/i, /green/i, /environment/i, /recycl/i],
      "customization": [/custom/i, /personal/i, /tailor/i, /modify/i],
      "availability": [/stock/i, /available/i, /sold out/i, /in stock/i],
      "authenticity": [/authentic/i, /genuine/i, /original/i, /real/i],
      "size-fit": [/size/i, /fit/i, /dimension/i, /measurement/i],
      "color-options": [/color/i, /colour/i, /shade/i, /hue/i],
      "brand-reputation": [/brand/i, /reputation/i, /trusted/i, /known/i],
    };
    
    const found = new Set<string>();
    const textLower = text.toLowerCase();
    
    for (const [topic, patterns] of Object.entries(topicPatterns)) {
      if (patterns.some(pattern => pattern.test(textLower))) {
        found.add(topic);
      }
    }
    
    return Array.from(found);
  }

  /**
   * 🎯 MISSING TOPICS DETECTION
   */
  static findMissingTopics(productDescription: string, aiResponse: string): string[] {
    const descTopics = this.extractTopicsCovered(productDescription);
    const responseTopics = this.extractTopicsCovered(aiResponse);
    
    return descTopics.filter(t => !responseTopics.includes(t));
  }

  /**
   * 🎯 FEATURE MENTION ANALYSIS
   */
  static analyzeFeatureMentions(
    productDescription: string,
    aiResponse: string
  ): {
    mentionedFeatures: string[];
    ignoredFeatures: string[];
  } {
    // Extract potential features from product description
    const featurePatterns = [
      /(\w+)\s+(?:feature|capability|function)/gi,
      /(?:includes?|features?|offers?|provides?)\s+(\w+(?:\s+\w+)?)/gi,
      /(?:with|has)\s+(\w+(?:\s+\w+)?)/gi,
    ];
    
    const productFeatures = new Set<string>();
    featurePatterns.forEach(pattern => {
      const matches = productDescription.matchAll(pattern);
      for (const match of matches) {
        if (match[1]) {
          productFeatures.add(match[1].toLowerCase());
        }
      }
    });
    
    const responseLower = aiResponse.toLowerCase();
    const mentionedFeatures: string[] = [];
    const ignoredFeatures: string[] = [];
    
    productFeatures.forEach(feature => {
      if (responseLower.includes(feature)) {
        mentionedFeatures.push(feature);
      } else {
        ignoredFeatures.push(feature);
      }
    });
    
    return { mentionedFeatures, ignoredFeatures };
  }

  /**
   * 🎯 SENTIMENT ANALYSIS
   */
  static calculateSentimentScore(text: string): number {
    const sentimentWords = {
      positive: [
        { word: "excellent", score: 25 },
        { word: "recommended", score: 30 },
        { word: "best", score: 25 },
        { word: "amazing", score: 25 },
        { word: "great", score: 20 },
        { word: "perfect", score: 25 },
        { word: "outstanding", score: 30 },
        { word: "superior", score: 25 },
        { word: "exceptional", score: 30 },
        { word: "fantastic", score: 25 },
        { word: "premium", score: 20 },
        { word: "quality", score: 15 },
        { word: "reliable", score: 20 },
        { word: "trusted", score: 20 },
        { word: "popular", score: 15 },
      ],
      negative: [
        { word: "poor", score: -25 },
        { word: "bad", score: -25 },
        { word: "avoid", score: -30 },
        { word: "disappointing", score: -25 },
        { word: "terrible", score: -30 },
        { word: "worst", score: -30 },
        { word: "mediocre", score: -20 },
        { word: "cheap", score: -15 },
        { word: "unreliable", score: -25 },
        { word: "problematic", score: -20 },
        { word: "inferior", score: -25 },
        { word: "subpar", score: -20 },
      ],
    };
    
    const textLower = text.toLowerCase();
    let score = 0;
    
    sentimentWords.positive.forEach(({ word, score: points }) => {
      const regex = new RegExp(`\\b${word}\\b`, 'gi');
      const matches = textLower.match(regex);
      if (matches) {
        score += points * matches.length;
      }
    });
    
    sentimentWords.negative.forEach(({ word, score: points }) => {
      const regex = new RegExp(`\\b${word}\\b`, 'gi');
      const matches = textLower.match(regex);
      if (matches) {
        score += points * matches.length;
      }
    });
    
    return Math.max(-100, Math.min(100, score));
  }

  /**
   * 🎯 TERM PREFERENCE DETECTION
   */
  static detectPreferredTerms(
    productDescription: string,
    aiResponse: string
  ): { [ourTerm: string]: string } {
    const preferredTerms: { [ourTerm: string]: string } = {};
    
    // Common term variations to check
    const termVariations = [
      ["backpack", "rucksack", "pack", "bag"],
      ["sneakers", "trainers", "shoes", "footwear"],
      ["laptop", "notebook", "computer", "device"],
      ["phone", "smartphone", "mobile", "device"],
      ["jacket", "coat", "outerwear"],
      ["sunglasses", "shades", "eyewear"],
      ["watch", "timepiece", "wristwatch"],
    ];
    
    const descLower = productDescription.toLowerCase();
    const responseLower = aiResponse.toLowerCase();
    
    termVariations.forEach(variations => {
      const ourTerm = variations.find(term => descLower.includes(term));
      if (ourTerm) {
        const aiTerm = variations.find(term => term !== ourTerm && responseLower.includes(term));
        if (aiTerm) {
          preferredTerms[ourTerm] = aiTerm;
        }
      }
    });
    
    return preferredTerms;
  }
}

/**
 * 🎯 COMPREHENSIVE RESPONSE ANALYSIS WITH CONTEXT
 */
function analyzeResponseWithIntelligence(
  fullResponse: string,
  productTitle: string,
  shopDomain: string,
  shopName: string,
  productHandle: string,
  productDescription: string,
  businessContext: BusinessContext
) {
  const responseLower = fullResponse.toLowerCase();
  const productLower = productTitle.toLowerCase();
  
  // Basic detection
  const isProductMentioned = responseLower.includes(productLower);
  const isShopMentioned = 
    responseLower.includes(shopDomain.toLowerCase()) ||
    responseLower.includes(shopName.toLowerCase());
  
  // Citation analysis
  const sentences = fullResponse.split(/[.!?]+/).filter(s => s.trim().length > 10);
  let citationPosition = -1;
  let citationSentence = null;
  
  for (let i = 0; i < sentences.length; i++) {
    if (sentences[i].toLowerCase().includes(productLower) || 
        sentences[i].toLowerCase().includes(shopName.toLowerCase())) {
      citationPosition = i + 1;
      citationSentence = sentences[i].trim();
      break;
    }
  }
  
  // 🆕 CONTEXT-AWARE COMPETITOR ANALYSIS
  const competitorAnalysis = ContextAwareCompetitorAnalyzer.extractContextualCompetitors(
    fullResponse,
    shopDomain,
    shopName,
    productTitle,
    businessContext
  );
  
  const shopBeforeCompetitors = competitorAnalysis.shopPosition >= 0 && 
    (Object.values(competitorAnalysis.competitorPositions).length === 0 ||
     competitorAnalysis.shopPosition < Math.min(...Object.values(competitorAnalysis.competitorPositions)));
  
  // 🆕 ENHANCED CONTEXT EXTRACTION
  const keywordsInResponse = AIResponseAnalyzer.extractKeywordsFromResponse(fullResponse);
  const topicsCovered = AIResponseAnalyzer.extractTopicsCovered(fullResponse);
  const topicsMissing = AIResponseAnalyzer.findMissingTopics(productDescription, fullResponse);
  const sentimentScore = citationSentence 
    ? AIResponseAnalyzer.calculateSentimentScore(citationSentence)
    : AIResponseAnalyzer.calculateSentimentScore(fullResponse.substring(0, 500));
  
  // 🆕 FEATURE ANALYSIS
  const featureAnalysis = AIResponseAnalyzer.analyzeFeatureMentions(productDescription, fullResponse);
  const preferredTerms = AIResponseAnalyzer.detectPreferredTerms(productDescription, fullResponse);
  
  // Score calculation with intelligent weighting
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
  } else if (citationPosition > 0 && citationPosition <= 5) {
    score += 10;
    breakdown.push(`⚠️ Cited in position ${citationPosition} (+10)`);
  } else if (citationPosition > 0) {
    score += 5;
    breakdown.push(`⚠️ Cited but position ${citationPosition} (+5)`);
  } else {
    breakdown.push("❌ Not in top positions (0)");
  }
  
  if (competitorAnalysis.competitors.length === 0) {
    score += 10;
    breakdown.push("✅ No real competitors mentioned (+10)");
    if (competitorAnalysis.nonCompetitors.length > 0) {
      breakdown.push(`   (Filtered out generic platforms: ${competitorAnalysis.nonCompetitors.slice(0, 3).join(', ')})`);
    }
  } else if (competitorAnalysis.competitors.length <= 2) {
    score += 5;
    breakdown.push(`⚠️ ${competitorAnalysis.competitors.length} relevant competitors: ${competitorAnalysis.competitors.join(', ')} (+5)`);
  } else {
    breakdown.push(`❌ ${competitorAnalysis.competitors.length} relevant competitors: ${competitorAnalysis.competitors.slice(0, 5).join(', ')}... (0)`);
  }
  
  if (shopBeforeCompetitors) {
    score += 10;
    breakdown.push("✅ Your shop mentioned BEFORE competitors (+10)");
  } else if (competitorAnalysis.competitors.length > 0 && isShopMentioned) {
    breakdown.push("⚠️ Your shop mentioned AFTER competitors (0)");
  }
  
  // 🆕 Additional intelligence scoring
  if (sentimentScore > 50) {
    score += 5;
    breakdown.push("✅ Very positive sentiment (+5)");
  } else if (sentimentScore < -20) {
    score -= 5;
    breakdown.push("❌ Negative sentiment (-5)");
  }
  
  if (featureAnalysis.ignoredFeatures.length > 3) {
    breakdown.push(`⚠️ ${featureAnalysis.ignoredFeatures.length} product features ignored`);
  }
  
  if (topicsMissing.length > 2) {
    breakdown.push(`⚠️ Missing important topics: ${topicsMissing.slice(0, 3).join(', ')}`);
  }
  
  const finalScore = Math.max(0, Math.min(100, score));
  
  return {
    // Core metrics
    score: finalScore,
    isProductMentioned,
    isShopMentioned,
    citationPosition,
    citationSentence,
    shopBeforeCompetitors,
    breakdown: breakdown.join('\n'),
    
    // 🆕 ENHANCED INTELLIGENCE DATA
    competitors: competitorAnalysis.competitors,
    competitorPositions: competitorAnalysis.competitorPositions,
    nonCompetitors: competitorAnalysis.nonCompetitors,
    keywordsInResponse,
    topicsCovered,
    topicsMissing,
    sentimentScore,
    mentionedFeatures: featureAnalysis.mentionedFeatures,
    ignoredFeatures: featureAnalysis.ignoredFeatures,
    preferredTerms,
  };
}

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
      description: true, // 🆕 Need this for context
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
          // 🆕 Include enhanced fields
          shopMentioned: true,
          shopBeforeCompetitors: true,
          topicsCovered: true,
          topicsMissing: true,
          sentimentScore: true,
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
      // 🆕 Add context fields (will need Prisma update)
      shopCountry: shop.shopCountry || null,
      shopRegion: shop.shopRegion || null,
      shopCity: shop.shopCity || null,
    },
    products: productsWithScans,
  });
};

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

  // Handle product scan with enhanced intelligence
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
    
    // 🆕 BUILD CONTEXTUAL PROMPT
    const businessContext = buildBusinessContext(shop, product);
    const smartPrompt = buildContextualPrompt(product.title, businessContext);

    let fullResponse = "";
    const startTime = Date.now();

    console.log(`\n🔍 Scanning ${platform} for: ${product.title}`);
    console.log(`🎯 Business Context:`, JSON.stringify(businessContext, null, 2));
    console.log(`📝 Contextual Prompt: ${smartPrompt}`);

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

    // 🆕 ENHANCED ANALYSIS WITH CONTEXT
    const analysis = analyzeResponseWithIntelligence(
      fullResponse,
      product.title,
      shop.shopifyDomain,
      shop.shopName,
      product.handle,
      product.description || "",
      businessContext
    );

    console.log(`\n📊 Context-Aware Analysis:`);
    console.log(analysis.breakdown);
    console.log(`\n🎯 SCORE: ${analysis.score}/100`);
    console.log(`\n🆕 CONTEXTUAL INTELLIGENCE:`);
    console.log(`Business Model: ${businessContext.businessModel}`);
    console.log(`Geography: ${businessContext.geography}`);
    console.log(`Target Market: ${businessContext.targetMarket}`);
    console.log(`Real Competitors Detected: ${analysis.competitors.join(', ') || 'None ✅'}`);
    console.log(`Generic Platforms Filtered: ${analysis.nonCompetitors.join(', ') || 'None'}`);
    console.log(`Keywords: ${analysis.keywordsInResponse.slice(0, 10).join(', ')}`);
    console.log(`Topics Missing: ${analysis.topicsMissing.join(', ')}`);
    console.log(`Sentiment: ${analysis.sentimentScore > 0 ? '😊 Positive' : analysis.sentimentScore < 0 ? '😔 Negative' : '😐 Neutral'} (${analysis.sentimentScore})`);

    const scanId = `scan_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

    // 🆕 SAVE ENHANCED SCAN DATA WITH FULL CONTEXT
    const newScan = await prisma.scan.create({
      data: {
        id: scanId,
        shopId: shop.id,
        productId: product.id,
        platform,
        question: smartPrompt,
        fullResponse,
        isCited: analysis.isShopMentioned,
        citation: analysis.citationSentence,
        citationPosition: analysis.citationPosition > 0 ? analysis.citationPosition : null,
        confidence: analysis.score / 100,
        creditsUsed: 1,
        scanDuration,
        
        // 🆕 CONTEXTUAL INTELLIGENCE FIELDS
        shopMentioned: analysis.isShopMentioned,
        shopBeforeCompetitors: analysis.shopBeforeCompetitors,
        competitors: analysis.competitors,
        competitorPositions: analysis.competitorPositions,
        keywordsInResponse: analysis.keywordsInResponse,
        topicsCovered: analysis.topicsCovered,
        topicsMissing: analysis.topicsMissing,
        sentimentScore: analysis.sentimentScore,
        mentionedFeatures: analysis.mentionedFeatures,
        ignoredFeatures: analysis.ignoredFeatures,
        preferredTerms: analysis.preferredTerms,
      },
    });

    // Calculate platform-specific scores
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

    // 🆕 LINK PRODUCT TO LATEST SCAN FOR CONTEXT
    await prisma.product.update({
      where: { id: product.id },
      data: {
        chatgptRate: platform === "CHATGPT" ? platformScore : chatgptRate,
        geminiRate: platform === "GEMINI" ? platformScore : geminiRate,
        citationRate,
        totalScans: { increment: 1 },
        lastScanAt: new Date(),
        lastScanId: newScan.id,
      },
    });

    await prisma.shop.update({
      where: { id: shop.id },
      data: { credits: { decrement: 1 } },
    });

    // 🆕 CREATE CONTEXTUAL ALERT
    if (analysis.score < 20) {
      let alertMessage = `The product was not mentioned in ${platform}'s response.`;
      
      if (analysis.competitors.length > 0) {
        alertMessage += ` ${analysis.competitors.length} relevant competitor(s) mentioned instead: ${analysis.competitors.slice(0, 3).join(', ')}.`;
      } else if (analysis.nonCompetitors.length > 0) {
        alertMessage += ` Only generic platforms mentioned (${analysis.nonCompetitors.slice(0, 2).join(', ')}), not real competitors.`;
      }
      
      alertMessage += ' Consider optimizing product description and business context.';
      
      await prisma.alert.create({
        data: {
          id: `alert_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
          shopId: shop.id,
          type: "CITATION_DROP",
          severity: "CRITICAL",
          title: `⚠️ ${product.title} not cited by ${platform}`,
          message: alertMessage,
          productId: product.id,
          metadata: {
            scanId: newScan.id,
            businessContext: businessContext,
            competitors: analysis.competitors,
            nonCompetitors: analysis.nonCompetitors,
            missingTopics: analysis.topicsMissing,
          },
        },
      });
    }

    console.log(`\n✅ Context-aware scan completed!`);
    console.log(`Platform Score: ${platformScore}%`);
    console.log(`Global Citation Rate: ${citationRate}%\n`);

    return json({ 
      success: true, 
      score: analysis.score,
      breakdown: analysis.breakdown,
      platformScore,
      citationRate,
      // 🆕 Return contextual intelligence to frontend
      intelligence: {
        businessContext,
        competitors: analysis.competitors,
        nonCompetitors: analysis.nonCompetitors,
        topicsMissing: analysis.topicsMissing,
        sentimentScore: analysis.sentimentScore,
      },
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

  const generateIntelligentBreakdown = (scan: any) => {
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
    const isShopMentioned = scan.isCited || scan.shopMentioned;
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
      lines.push(`✅ No real competitors mentioned (+10)`);
    } else {
      lines.push(`⚠️ ${competitors.length} relevant competitors: ${competitors.slice(0, 5).join(', ')} (0)`);
    }
    
    // 🆕 Enhanced context if available
    if (scan.topicsMissing && scan.topicsMissing.length > 0) {
      lines.push(``);
      lines.push(`📌 Topics Missing: ${scan.topicsMissing.join(', ')}`);
    }
    
    if (scan.topicsCovered && scan.topicsCovered.length > 0) {
      lines.push(`✅ Topics Covered: ${scan.topicsCovered.slice(0, 5).join(', ')}`);
    }
    
    if (scan.sentimentScore) {
      const sentiment = scan.sentimentScore > 0 ? "Positive 😊" : scan.sentimentScore < 0 ? "Negative 😔" : "Neutral 😐";
      lines.push(`💭 Sentiment: ${sentiment} (${scan.sentimentScore})`);
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
              maxWidth: "700px",
              maxHeight: "80vh",
              overflow: "auto",
              boxShadow: "0 4px 20px rgba(0,0,0,0.2)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px" }}>
              <h2 style={{ fontSize: "24px", fontWeight: "600", margin: 0, color: "#202223" }}>
                🎯 Context-Aware Analysis
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
                Intelligent scan report with real competitor detection
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
                  {generateIntelligentBreakdown(selectedProduct.lastScan)}
                </pre>

                <div style={{ marginTop: "24px", padding: "16px", background: "#e8f5e9", borderRadius: "8px" }}>
                  <p style={{ fontSize: "14px", color: "#2e7d32", margin: 0 }}>
                    <strong>💡 Contextual Insight:</strong> {
                      selectedProduct.lastScan.competitors && selectedProduct.lastScan.competitors.length > 0
                        ? `Focus on differentiating from ${selectedProduct.lastScan.competitors[0]} - they're a real competitor in your niche.`
                        : selectedProduct.lastScan.topicsMissing && selectedProduct.lastScan.topicsMissing.length > 0
                        ? `Add content about ${selectedProduct.lastScan.topicsMissing[0]} to improve visibility.`
                        : "No relevant competitors detected - great positioning! Focus on maintaining unique value."
                    }
                  </p>
                </div>

                {fetcher.data?.intelligence && (
                  <div style={{ marginTop: "16px", padding: "16px", background: "#e3f2fd", borderRadius: "8px" }}>
                    <h4 style={{ fontSize: "14px", fontWeight: "600", margin: "0 0 8px 0", color: "#1976d2" }}>
                      🆕 Latest Context-Aware Update:
                    </h4>
                    <ul style={{ fontSize: "13px", margin: 0, paddingLeft: "20px", color: "#1565c0" }}>
                      <li>Business Model: {fetcher.data.intelligence.businessContext?.businessModel}</li>
                      <li>Geography: {fetcher.data.intelligence.businessContext?.geography}</li>
                      {fetcher.data.intelligence.competitors?.length > 0 ? (
                        <li>Real competitors: {fetcher.data.intelligence.competitors.join(', ')}</li>
                      ) : (
                        <li>✅ No relevant competitors detected</li>
                      )}
                      {fetcher.data.intelligence.nonCompetitors?.length > 0 && (
                        <li>Filtered out: {fetcher.data.intelligence.nonCompetitors.join(', ')}</li>
                      )}
                      {fetcher.data.intelligence.topicsMissing?.length > 0 && (
                        <li>Topics to add: {fetcher.data.intelligence.topicsMissing.join(', ')}</li>
                      )}
                    </ul>
                  </div>
                )}
              </div>
            ) : (
              <div style={{ textAlign: "center", padding: "40px 20px" }}>
                <p style={{ fontSize: "16px", color: "#9e9e9e" }}>
                  No scan data available yet. Run a scan to see context-aware analysis!
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
                📦 Products with Contextual Intelligence
              </h1>
              <p style={{ fontSize: "16px", color: "#6d7175", margin: 0 }}>
                {products.length} products • {shop?.credits || 0} credits • Real competitor detection (not Amazon/eBay)
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
                          {product.lastScan?.competitors && product.lastScan.competitors.length > 0 && (
                            <span style={{ marginLeft: "8px", color: "#ff9800" }}>
                              • {product.lastScan.competitors.length} real competitors
                            </span>
                          )}
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
                              🎯 View Context
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