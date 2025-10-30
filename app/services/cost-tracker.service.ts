import { prisma } from "~/db.server";

interface APIUsage {
  platform: 'OPENAI' | 'GEMINI';
  tokens?: number;
  characters?: number;
  cost: number;
}

export class CostTrackerService {
  // Prix OpenAI (GPT-3.5-turbo)
  private static OPENAI_INPUT_COST = 0.0005; // per 1K tokens
  private static OPENAI_OUTPUT_COST = 0.0015; // per 1K tokens
  
  // Prix Gemini
  private static GEMINI_COST = 0.00025; // per 1K characters
  
  static calculateOpenAICost(usage: any): number {
    if (!usage) return 0;
    
    const inputCost = (usage.prompt_tokens / 1000) * this.OPENAI_INPUT_COST;
    const outputCost = (usage.completion_tokens / 1000) * this.OPENAI_OUTPUT_COST;
    
    return inputCost + outputCost;
  }
  
  static calculateGeminiCost(textLength: number): number {
    return (textLength / 1000) * this.GEMINI_COST;
  }
  
  static async trackUsage(shopId: string, usage: APIUsage) {
    // Save to events for tracking
    await prisma.event.create({
      data: {
        shopId,
        type: 'API_USAGE',
        data: {
          platform: usage.platform,
          tokens: usage.tokens,
          characters: usage.characters,
          cost: usage.cost,
          timestamp: new Date()
        }
      }
    });
  }
  
  static async getMonthlyUsage(shopId: string) {
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);
    
    const events = await prisma.event.findMany({
      where: {
        shopId,
        type: 'API_USAGE',
        createdAt: { gte: startOfMonth }
      }
    });
    
    let totalCost = 0;
    let openaiCost = 0;
    let geminiCost = 0;
    
    events.forEach(event => {
      const data = event.data as any;
      totalCost += data.cost || 0;
      
      if (data.platform === 'OPENAI') {
        openaiCost += data.cost || 0;
      } else if (data.platform === 'GEMINI') {
        geminiCost += data.cost || 0;
      }
    });
    
    return {
      totalCost,
      openaiCost,
      geminiCost,
      eventCount: events.length
    };
  }
}
