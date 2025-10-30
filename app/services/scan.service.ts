import { prisma } from "~/db.server";
import { generateScanQuestion } from "~/utils/helpers";

interface ScanResult {
  platform: 'CHATGPT' | 'GEMINI';
  isCited: boolean;
  citation?: string;
  position?: number;
  sentiment?: 'POSITIVE' | 'NEUTRAL' | 'NEGATIVE';
  competitors: string[];
  confidence: number;
}

export async function performScan(
  productId: string,
  platform: 'CHATGPT' | 'GEMINI'
): Promise<ScanResult> {
  // Mock scan for now - will integrate real scanning later
  const mockResult: ScanResult = {
    platform,
    isCited: Math.random() > 0.5,
    citation: "This product is highly recommended for its quality and value.",
    position: Math.floor(Math.random() * 5) + 1,
    sentiment: 'POSITIVE',
    competitors: ['Competitor A', 'Competitor B'],
    confidence: Math.random() * 0.5 + 0.5 // 0.5 to 1.0
  };
  
  // Save scan to database
  const product = await prisma.product.findUnique({
    where: { id: productId }
  });
  
  if (!product) throw new Error('Product not found');
  
  const scan = await prisma.scan.create({
    data: {
      shopId: product.shopId,
      productId: productId,
      platform: platform,
      question: generateScanQuestion(product),
      fullResponse: JSON.stringify(mockResult),
      isCited: mockResult.isCited,
      citation: mockResult.citation,
      citationPosition: mockResult.position,
      sentiment: mockResult.sentiment,
      competitors: mockResult.competitors,
      confidence: mockResult.confidence,
      creditsUsed: 1,
      scanDuration: Math.floor(Math.random() * 30000) + 10000 // 10-40 seconds
    }
  });
  
  // Update product stats
  await updateProductStats(productId);
  
  return mockResult;
}

export async function performCompleteScan(productId: string) {
  const chatgptResult = await performScan(productId, 'CHATGPT');
  const geminiResult = await performScan(productId, 'GEMINI');
  
  // Generate recommendations based on results
  const recommendations = await generateRecommendations(
    productId,
    chatgptResult,
    geminiResult
  );
  
  return {
    chatgpt: chatgptResult,
    gemini: geminiResult,
    recommendations
  };
}

async function updateProductStats(productId: string) {
  const scans = await prisma.scan.findMany({
    where: { productId }
  });
  
  const chatgptScans = scans.filter(s => s.platform === 'CHATGPT');
  const geminiScans = scans.filter(s => s.platform === 'GEMINI');
  
  const chatgptRate = chatgptScans.length > 0
    ? (chatgptScans.filter(s => s.isCited).length / chatgptScans.length) * 100
    : 0;
    
  const geminiRate = geminiScans.length > 0
    ? (geminiScans.filter(s => s.isCited).length / geminiScans.length) * 100
    : 0;
    
  const overallRate = scans.length > 0
    ? (scans.filter(s => s.isCited).length / scans.length) * 100
    : 0;
  
  await prisma.product.update({
    where: { id: productId },
    data: {
      citationRate: overallRate,
      chatgptRate: chatgptRate,
      geminiRate: geminiRate,
      totalScans: scans.length,
      lastScanAt: new Date()
    }
  });
}

async function generateRecommendations(
  productId: string,
  chatgptResult: ScanResult,
  geminiResult: ScanResult
) {
  const product = await prisma.product.findUnique({
    where: { id: productId }
  });
  
  if (!product) throw new Error('Product not found');
  
  // Mock recommendations for now
  const recommendations = {
    title: {
      current: product.title,
      suggested: `${product.title} - Premium Quality ${product.productType}`,
      score: 85,
      reason: "Adding descriptive keywords improves AI recognition"
    },
    description: {
      current: product.description,
      suggested: "Enhanced description with key features and benefits...",
      score: 78,
      reason: "Detailed descriptions increase citation probability"
    },
    tags: {
      current: product.tags || [],
      suggested: [...(product.tags || []), 'premium', 'bestseller', '2025'],
      score: 92,
      reason: "Relevant tags help AI categorize your product"
    },
    seo: {
      metaTitle: `${product.title} | Best ${product.productType} 2025`,
      metaDescription: `Discover ${product.title} - The ultimate ${product.productType} for discerning customers.`,
      score: 88,
      reason: "SEO optimization improves overall visibility"
    }
  };
  
  // Save to database
  await prisma.optimization.create({
    data: {
      productId: productId,
      currentScore: Math.round((chatgptResult.confidence + geminiResult.confidence) * 50),
      potentialScore: 85,
      recommendations: recommendations,
      quickWins: {
        wins: [
          "Add more specific keywords to title",
          "Include customer benefits in description",
          "Add trending tags for your category"
        ]
      }
    }
  });
  
  return recommendations;
}
