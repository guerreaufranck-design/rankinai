import OpenAI from 'openai';
import { prisma } from "~/db.server";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || ""
});

export class OpenAIService {
  static async testProductCitation(product: any): Promise<any> {
    // Generate a natural question about the product
    const questions = [
      `What are the best ${product.productType || 'products'} for ${product.targetAudience || 'consumers'} in 2025?`,
      `Can you recommend high-quality ${product.productType || 'items'} from brands like ${product.vendor}?`,
      `I'm looking for ${product.category || product.productType}. What do you suggest?`,
      `What ${product.productType} would you recommend for someone who values quality and sustainability?`
    ];
    
    const question = questions[Math.floor(Math.random() * questions.length)];
    
    try {
      // Ask ChatGPT the question
      const completion = await openai.chat.completions.create({
        model: "gpt-3.5-turbo", // ou gpt-4 si tu veux
        messages: [
          {
            role: "system",
            content: "You are a helpful shopping assistant. Provide specific product recommendations when asked."
          },
          {
            role: "user",
            content: question
          }
        ],
        temperature: 0.7,
        max_tokens: 500
      });
      
      const response = completion.choices[0].message.content || "";
      
      // Analyze if the product is mentioned
      const productMentioned = this.checkProductMention(response, product);
      const competitors = this.extractCompetitors(response, product.vendor);
      const sentiment = this.analyzeSentiment(response, product);
      const position = this.findPosition(response, product);
      
      return {
        question,
        fullResponse: response,
        isCited: productMentioned,
        citation: productMentioned ? this.extractCitation(response, product) : null,
        position,
        sentiment,
        competitors,
        confidence: productMentioned ? 0.85 : 0.15,
        usage: completion.usage // Pour tracker les coûts
      };
      
    } catch (error) {
      console.error("OpenAI API error:", error);
      throw error;
    }
  }
  
  private static checkProductMention(response: string, product: any): boolean {
    const lowerResponse = response.toLowerCase();
    const productName = product.title.toLowerCase();
    const brand = product.vendor?.toLowerCase();
    
    // Check for exact product mention
    if (lowerResponse.includes(productName)) return true;
    
    // Check for brand + type mention
    if (brand && lowerResponse.includes(brand) && 
        lowerResponse.includes(product.productType?.toLowerCase())) {
      return true;
    }
    
    // Check for partial matches (at least 70% of words)
    const productWords = productName.split(' ').filter(w => w.length > 3);
    const matchedWords = productWords.filter(word => 
      lowerResponse.includes(word)
    );
    
    return matchedWords.length >= productWords.length * 0.7;
  }
  
  private static extractCitation(response: string, product: any): string {
    // Find the sentence mentioning the product
    const sentences = response.split(/[.!?]/);
    const productName = product.title.toLowerCase();
    
    for (const sentence of sentences) {
      if (sentence.toLowerCase().includes(productName) ||
          sentence.toLowerCase().includes(product.vendor?.toLowerCase())) {
        return sentence.trim();
      }
    }
    
    return "";
  }
  
  private static findPosition(response: string, product: any): number | null {
    // Check if response has a numbered list
    const listItems = response.match(/\d+\.\s+([^\n]+)/g);
    if (!listItems) return null;
    
    const productName = product.title.toLowerCase();
    const brand = product.vendor?.toLowerCase();
    
    for (let i = 0; i < listItems.length; i++) {
      const item = listItems[i].toLowerCase();
      if (item.includes(productName) || (brand && item.includes(brand))) {
        return i + 1;
      }
    }
    
    return null;
  }
  
  private static extractCompetitors(response: string, currentBrand: string): string[] {
    // Common competitor brands
    const brands = [
      'Nike', 'Adidas', 'Puma', 'Reebok', 'Under Armour',
      'Patagonia', 'North Face', 'Columbia', 'Arc\'teryx',
      'Apple', 'Samsung', 'Google', 'Microsoft', 'Sony',
      'Zara', 'H&M', 'Uniqlo', 'Gap', 'Forever 21'
    ];
    
    const competitors = brands.filter(brand => 
      brand.toLowerCase() !== currentBrand?.toLowerCase() &&
      response.includes(brand)
    );
    
    return competitors;
  }
  
  private static analyzeSentiment(response: string, product: any): 'POSITIVE' | 'NEUTRAL' | 'NEGATIVE' | null {
    if (!this.checkProductMention(response, product)) return null;
    
    const positiveWords = ['excellent', 'great', 'best', 'recommend', 'perfect', 'top', 'quality', 'premium'];
    const negativeWords = ['avoid', 'poor', 'bad', 'worst', 'not recommend', 'disappointing'];
    
    const lowerResponse = response.toLowerCase();
    const positiveScore = positiveWords.filter(word => lowerResponse.includes(word)).length;
    const negativeScore = negativeWords.filter(word => lowerResponse.includes(word)).length;
    
    if (positiveScore > negativeScore) return 'POSITIVE';
    if (negativeScore > positiveScore) return 'NEGATIVE';
    return 'NEUTRAL';
  }
}
