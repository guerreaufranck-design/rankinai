import { useState } from "react";
import { useLoaderData, useNavigate, useFetcher } from "react-router";
import {
  AppProvider,
  Page,
  Layout,
  Card,
  Text,
  Button,
  Badge,
  BlockStack,
  InlineGrid,
  ProgressBar,
  Banner,
  Modal,
  Spinner,
  InlineStack,
  Divider
} from "@shopify/polaris";
import enTranslations from '@shopify/polaris/locales/en.json';
import { authenticate } from "../shopify.server";
import { prisma } from "~/db.server";
import { formatDate, formatPrice, getCitationRateTone } from "~/utils/helpers";

export const loader = async ({ request, params }: { request: Request, params: any }) => {
  const { admin, session } = await authenticate.admin(request);
  const { id } = params;
  
  const shop = await prisma.shop.findUnique({
    where: { shopifyDomain: session.shop }
  });
  
  const product = await prisma.product.findUnique({
    where: { id },
    include: {
      scans: {
        orderBy: { createdAt: 'desc' },
        take: 10
      },
      optimizations: {
        orderBy: { createdAt: 'desc' },
        take: 1
      }
    }
  });
  
  if (!product) {
    throw new Response("Product not found", { status: 404 });
  }
  
  return {
    product,
    shop: {
      credits: shop?.credits || 0,
      plan: shop?.plan || 'TRIAL'
    },
    latestOptimization: product.optimizations[0] || null
  };
};

export default function ProductDetail() {
  const { product, shop, latestOptimization } = useLoaderData<typeof loader>();
  const navigate = useNavigate();
  const fetcher = useFetcher();
  
  const [scanningChatGPT, setScanningChatGPT] = useState(false);
  const [scanningGemini, setScanningGemini] = useState(false);
  const [generatingRecs, setGeneratingRecs] = useState(false);
  const [showRecommendations, setShowRecommendations] = useState(false);
  
  const handleChatGPTScan = async () => {
    if (shop.credits < 1) {
      navigate('/app/pricing');
      return;
    }
    
    setScanningChatGPT(true);
    fetcher.submit(
      { productId: product.id },
      { method: "post", action: "/api/scan/chatgpt" }
    );
  };
  
  const handleGeminiScan = async () => {
    if (shop.credits < 1) {
      navigate('/app/pricing');
      return;
    }
    
    setScanningGemini(true);
    fetcher.submit(
      { productId: product.id },
      { method: "post", action: "/api/scan/gemini" }
    );
  };
  
  const handleGenerateRecommendations = async () => {
    if (shop.credits < 1) {
      navigate('/app/pricing');
      return;
    }
    
    setGeneratingRecs(true);
    fetcher.submit(
      { productId: product.id },
      { method: "post", action: "/api/recommendations" }
    );
  };
  
  // Reset loading states when fetcher completes
  if (fetcher.data && scanningChatGPT) {
    setScanningChatGPT(false);
  }
  if (fetcher.data && scanningGemini) {
    setScanningGemini(false);
  }
  if (fetcher.data && generatingRecs) {
    setGeneratingRecs(false);
    setShowRecommendations(true);
  }
  
  return (
    <AppProvider i18n={enTranslations}>
      <Page
        title={product.title}
        subtitle={`by ${product.vendor || 'Unknown'}`}
        backAction={{
          content: "Products",
          onAction: () => navigate("/app/products")
        }}
      >
        <Layout>
          {/* Credits warning */}
          {shop.credits <= 5 && shop.credits > 0 && (
            <Layout.Section>
              <Banner
                title="Low credits"
                tone="warning"
                action={{ content: "Upgrade plan", onAction: () => navigate('/app/pricing') }}
              >
                <p>You have only {shop.credits} credits remaining.</p>
              </Banner>
            </Layout.Section>
          )}
          
          {/* Main stats */}
          <Layout.Section>
            <Card>
              <BlockStack gap="400">
                <Text variant="headingLg">Performance Overview</Text>
                
                <InlineGrid columns={4} gap="400">
                  <BlockStack gap="200">
                    <Text variant="bodySm" tone="subdued">Overall Citation Rate</Text>
                    <Badge size="large" tone={getCitationRateTone(product.citationRate)}>
                      {product.citationRate.toFixed(1)}%
                    </Badge>
                  </BlockStack>
                  
                  <BlockStack gap="200">
                    <Text variant="bodySm" tone="subdued">ChatGPT Rate</Text>
                    <Text variant="heading2xl">{product.chatgptRate.toFixed(1)}%</Text>
                  </BlockStack>
                  
                  <BlockStack gap="200">
                    <Text variant="bodySm" tone="subdued">Gemini Rate</Text>
                    <Text variant="heading2xl">{product.geminiRate.toFixed(1)}%</Text>
                  </BlockStack>
                  
                  <BlockStack gap="200">
                    <Text variant="bodySm" tone="subdued">Total Scans</Text>
                    <Text variant="heading2xl">{product.totalScans}</Text>
                  </BlockStack>
                </InlineGrid>
                
                {product.lastScanAt && (
                  <Text variant="bodySm" tone="subdued">
                    Last scanned: {formatDate(product.lastScanAt)}
                  </Text>
                )}
              </BlockStack>
            </Card>
          </Layout.Section>
          
          {/* Scan Actions - Separate buttons */}
          <Layout.Section>
            <Card>
              <BlockStack gap="400">
                <Text variant="headingLg">Run Individual Scans</Text>
                <Text variant="bodyMd" tone="subdued">
                  Test how your product appears in AI search results. Each scan costs 1 credit.
                </Text>
                
                <InlineGrid columns={2} gap="400">
                  <Card>
                    <BlockStack gap="300">
                      <InlineStack blockAlign="center" gap="200">
                        <div style={{ fontSize: '24px' }}>🤖</div>
                        <BlockStack gap="100">
                          <Text variant="headingMd">ChatGPT Scan</Text>
                          <Text variant="bodySm" tone="subdued">
                            Test visibility on OpenAI's ChatGPT
                          </Text>
                        </BlockStack>
                      </InlineStack>
                      
                      <Button
                        primary
                        fullWidth
                        loading={scanningChatGPT}
                        disabled={shop.credits < 1}
                        onClick={handleChatGPTScan}
                      >
                        {scanningChatGPT ? "Scanning..." : "Scan with ChatGPT (1 credit)"}
                      </Button>
                      
                      {product.chatgptRate > 0 && (
                        <Text variant="bodySm" tone="success">
                          Last result: {product.chatgptRate.toFixed(1)}% citation rate
                        </Text>
                      )}
                    </BlockStack>
                  </Card>
                  
                  <Card>
                    <BlockStack gap="300">
                      <InlineStack blockAlign="center" gap="200">
                        <div style={{ fontSize: '24px' }}>✨</div>
                        <BlockStack gap="100">
                          <Text variant="headingMd">Gemini Scan</Text>
                          <Text variant="bodySm" tone="subdued">
                            Test visibility on Google's Gemini
                          </Text>
                        </BlockStack>
                      </InlineStack>
                      
                      <Button
                        primary
                        fullWidth
                        loading={scanningGemini}
                        disabled={shop.credits < 1}
                        onClick={handleGeminiScan}
                      >
                        {scanningGemini ? "Scanning..." : "Scan with Gemini (1 credit)"}
                      </Button>
                      
                      {product.geminiRate > 0 && (
                        <Text variant="bodySm" tone="success">
                          Last result: {product.geminiRate.toFixed(1)}% citation rate
                        </Text>
                      )}
                    </BlockStack>
                  </Card>
                </InlineGrid>
                
                <Divider />
                
                {/* Recommendations button */}
                <Card>
                  <BlockStack gap="300">
                    <InlineStack blockAlign="center" gap="200">
                      <div style={{ fontSize: '24px' }}>💡</div>
                      <BlockStack gap="100">
                        <Text variant="headingMd">AI Recommendations</Text>
                        <Text variant="bodySm" tone="subdued">
                          Get optimization suggestions powered by Gemini AI
                        </Text>
                      </BlockStack>
                    </InlineStack>
                    
                    <Button
                      fullWidth
                      loading={generatingRecs}
                      disabled={shop.credits < 1 || product.totalScans === 0}
                      onClick={handleGenerateRecommendations}
                    >
                      {generatingRecs ? "Generating..." : "Generate Recommendations (1 credit)"}
                    </Button>
                    
                    {product.totalScans === 0 && (
                      <Text variant="bodySm" tone="subdued">
                        Run at least one scan before generating recommendations
                      </Text>
                    )}
                  </BlockStack>
                </Card>
              </BlockStack>
            </Card>
          </Layout.Section>
          
          {/* Scan History */}
          <Layout.Section>
            <Card title="Recent Scan History">
              <BlockStack gap="300">
                {product.scans.length === 0 ? (
                  <Text tone="subdued">No scans yet. Run your first scan above.</Text>
                ) : (
                  product.scans.map(scan => (
                    <InlineStack key={scan.id} align="space-between" blockAlign="center">
                      <InlineStack gap="200">
                        <Badge tone={scan.platform === 'CHATGPT' ? 'info' : 'success'}>
                          {scan.platform}
                        </Badge>
                        <Text variant="bodyMd">
                          {scan.isCited ? '✅ Cited' : '❌ Not cited'}
                        </Text>
                        {scan.position && (
                          <Badge>Position #{scan.position}</Badge>
                        )}
                      </InlineStack>
                      <Text variant="bodySm" tone="subdued">
                        {formatDate(scan.createdAt)}
                      </Text>
                    </InlineStack>
                  ))
                )}
              </BlockStack>
            </Card>
          </Layout.Section>
          
          {/* Recommendations Modal */}
          {latestOptimization && (
            <Modal
              open={showRecommendations}
              onClose={() => setShowRecommendations(false)}
              title="AI Optimization Recommendations"
              primaryAction={{
                content: "Apply Changes",
                onAction: () => console.log("Apply changes")
              }}
              secondaryActions={[{
                content: "Close",
                onAction: () => setShowRecommendations(false)
              }]}
            >
              <Modal.Section>
                <BlockStack gap="400">
                  {/* Display recommendations here */}
                  <Text variant="headingMd">Quick Wins:</Text>
                  {/* ... */}
                </BlockStack>
              </Modal.Section>
            </Modal>
          )}
        </Layout>
      </Page>
    </AppProvider>
  );
}
