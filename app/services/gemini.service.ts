import { GoogleGenerativeAI } from "@google/generative-ai";
import { prisma } from "~/db.server";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

export class GeminiService {
  private static model = genAI.getGenerativeModel({ model: "gemini-pro" });
  
  static async testProductCitation(product: any): Promise<any> {
    const questions = [
      `What are the best ${product.productType || 'products'} to buy in 2025?`,
      `Recommend me ${product.category || product.productType} from top brands`,
      `I need ${product.productType}. What are the top options available?`
    ];
    
    const question = questions[Math.floor(Math.random() * questions.length)];
    
    try {
      const result = await this.model.generateContent(question);
      const response = await result.response;
      const fullResponse = response.text();
      
      // Analyze response
      const productMentioned = this.checkProductMention(fullResponse, product);
      
      return {
        question,
        fullResponse,
        isCited: productMentioned,
        citation: productMentioned ? this.extractCitation(fullResponse, product) : null,
        position: this.findPosition(fullResponse, product),
        sentiment: this.analyzeSentiment(fullResponse, product),
        competitors: this.extractCompetitors(fullResponse, product.vendor),
        confidence: productMentioned ? 0.80 : 0.20
      };
      
    } catch (error) {
      console.error("Gemini API error:", error);
      throw error;
    }
  }
  
  static async generateOptimizationRecommendations(
    product: any, 
    chatGPTResult: any,
    geminiResult: any
  ) {
    const prompt = `
      As an SEO and AI optimization expert, analyze this product and provide specific recommendations:
      
      Product Information:
      - Title: ${product.title}
      - Description: ${product.description}
      - Brand: ${product.vendor}
      - Category: ${product.productType}
      - Current Tags: ${product.tags?.join(', ')}
      - Price: €${product.priceAmount}
      
      Test Results:
      - ChatGPT cited: ${chatGPTResult?.isCited ? 'Yes' : 'No'}
      - Gemini cited: ${geminiResult?.isCited ? 'Yes' : 'No'}
      - Current citation rate: ${product.citationRate}%
      
      Provide SPECIFIC recommendations:
      1. Optimized title (exact suggestion)
      2. Key points to add to description
      3. 5-10 tags to add
      4. SEO meta title and description
      5. 3 quick wins for immediate improvement
      
      Format your response as JSON with these exact keys:
      {
        "title": { "current": "", "suggested": "", "reason": "" },
        "description": { "keyPoints": [], "reason": "" },
        "tags": { "add": [], "remove": [], "reason": "" },
        "seo": { "metaTitle": "", "metaDescription": "", "reason": "" },
        "quickWins": []
      }
    `;
    
    try {
      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();
      
      // Extract JSON from response
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
      
      throw new Error("Failed to parse recommendations");
    } catch (error) {
      console.error("Failed to generate recommendations:", error);
      
      // Return fallback recommendations
      return {
        title: {
          current: product.title,
          suggested: `${product.title} - Premium Quality ${product.productType}`,
          reason: "Adding descriptive keywords improves AI recognition"
        },
        description: {
          keyPoints: [
            "Add specific product benefits",
            "Include use cases and target audience",
            "Mention unique features"
          ],
          reason: "Detailed descriptions increase citation probability"
        },
        tags: {
          add: ['premium', 'bestseller', '2025', 'sustainable'],
          remove: [],
          reason: "Trending tags help AI categorization"
        },
        seo: {
          metaTitle: `${product.title} | Best ${product.productType} 2025`,
          metaDescription: `Discover ${product.title} - Premium ${product.productType} for discerning customers.`,
          reason: "SEO optimization improves overall visibility"
        },
        quickWins: [
          "Add trending keywords to title",
          "Include customer benefits in first line of description",
          "Add current year to tags"
        ]
      };
    }
  }
  
  // Mêmes méthodes helper que OpenAIService
  private static checkProductMention(response: string, product: any): boolean {
    const lowerResponse = response.toLowerCase();
    return lowerResponse.includes(product.title.toLowerCase()) ||
           lowerResponse.includes(product.vendor?.toLowerCase());
  }
  
  private static extractCitation(response: string, product: any): string {
    const sentences = response.split(/[.!?]/);
    for (const sentence of sentences) {
      if (sentence.toLowerCase().includes(product.title.toLowerCase())) {
        return sentence.trim();
      }
    }
    return "";
  }
  
  private static findPosition(response: string, product: any): number | null {
    const listItems = response.match(/\d+\.\s+([^\n]+)/g);
    if (!listItems) return null;
    
    for (let i = 0; i < listItems.length; i++) {
      if (listItems[i].toLowerCase().includes(product.title.toLowerCase())) {
        return i + 1;
      }
    }
    return null;
  }
  
  private static extractCompetitors(response: string, currentBrand: string): string[] {
    const brands = response.match(/([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)/g) || [];
    return brands.filter(brand => 
      brand !== currentBrand && brand.length > 3
    ).slice(0, 5);
  }
  
  private static analyzeSentiment(response: string, product: any): 'POSITIVE' | 'NEUTRAL' | 'NEGATIVE' | null {
    if (!this.checkProductMention(response, product)) return null;
    
    const context = response.toLowerCase();
    if (context.includes('recommend') || context.includes('best') || context.includes('excellent')) {
      return 'POSITIVE';
    }
    if (context.includes('avoid') || context.includes('poor') || context.includes('not recommend')) {
      return 'NEGATIVE';
    }
    return 'NEUTRAL';
  }
}
