import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

export class GeminiService {
  private static model = genAI.getGenerativeModel({ model: "gemini-pro" });
  
  static async analyzeProduct(product: any) {
    const prompt = `
      Analyze this e-commerce product for AI search optimization:
      
      Title: ${product.title}
      Description: ${product.description}
      Brand: ${product.vendor}
      Type: ${product.productType}
      Tags: ${product.tags?.join(', ')}
      
      Provide:
      1. Main keywords that AI would associate with this product
      2. Target audience
      3. Key selling points
      4. Category classification
      5. Brief AI-optimized summary (50 words)
      
      Format as JSON.
    `;
    
    try {
      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();
      
      // Parse JSON from response
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
      
      // Fallback structure if JSON parsing fails
      return {
        keywords: [],
        targetAudience: "General consumers",
        sellingPoints: [],
        category: product.productType || "General",
        summary: text.substring(0, 200)
      };
    } catch (error) {
      console.error("Gemini analysis failed:", error);
      return null;
    }
  }
  
  static async generateRecommendations(product: any, scanResults: any) {
    const prompt = `
      Product: ${product.title}
      Current citation rate: ${product.citationRate}%
      ChatGPT mentions: ${scanResults.chatgpt?.isCited ? 'Yes' : 'No'}
      Gemini mentions: ${scanResults.gemini?.isCited ? 'Yes' : 'No'}
      
      Provide specific recommendations to improve this product's visibility in AI searches:
      1. Title optimization (be specific)
      2. Description improvements (key points to add)
      3. Missing tags to add
      4. SEO meta improvements
      
      Be concise and actionable. Format as JSON.
    `;
    
    try {
      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();
      
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
      
      return null;
    } catch (error) {
      console.error("Recommendation generation failed:", error);
      return null;
    }
  }
}
