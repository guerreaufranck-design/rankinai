import { useLoaderData, useNavigate } from "react-router";
import {
  AppProvider,
  Page,
  Layout,
  Card,
  Text,
  Badge,
  BlockStack,
  InlineStack,
  Divider,
  Button,
  Box
} from "@shopify/polaris";
import enTranslations from '@shopify/polaris/locales/en.json';
import { authenticate } from "../shopify.server";
import { prisma } from "~/db.server";

export const loader = async ({ request, params }: { request: Request, params: any }) => {
  const { admin } = await authenticate.admin(request);
  const { id } = params;
  
  const scan = await prisma.scan.findUnique({
    where: { id },
    include: {
      product: true
    }
  });
  
  if (!scan) {
    throw new Response("Scan not found", { status: 404 });
  }
  
  return { scan };
};

export default function ScanDetail() {
  const { scan } = useLoaderData<typeof loader>();
  const navigate = useNavigate();
  
  const getSentimentColor = (sentiment: string | null) => {
    switch (sentiment) {
      case 'POSITIVE': return 'success';
      case 'NEGATIVE': return 'critical';
      default: return 'base';
    }
  };
  
  return (
    <AppProvider i18n={enTranslations}>
      <Page
        title="Scan Results"
        subtitle={`${scan.product.title} - ${scan.platform}`}
        backAction={{
          content: "Back to product",
          onAction: () => navigate(`/app/products/${scan.productId}`)
        }}
      >
        <Layout>
          {/* Summary */}
          <Layout.Section>
            <Card>
              <BlockStack gap="400">
                <InlineStack align="space-between">
                  <Badge size="large" tone={scan.platform === 'CHATGPT' ? 'info' : 'success'}>
                    {scan.platform}
                  </Badge>
                  <Badge size="large" tone={scan.isCited ? 'success' : 'critical'}>
                    {scan.isCited ? '✅ Product Cited' : '❌ Not Cited'}
                  </Badge>
                </InlineStack>
                
                <InlineGrid columns={3} gap="400">
                  <BlockStack gap="100">
                    <Text variant="bodySm" tone="subdued">Position</Text>
                    <Text variant="headingLg">
                      {scan.citationPosition ? `#${scan.citationPosition}` : 'N/A'}
                    </Text>
                  </BlockStack>
                  
                  <BlockStack gap="100">
                    <Text variant="bodySm" tone="subdued">Sentiment</Text>
                    <Badge tone={getSentimentColor(scan.sentiment)}>
                      {scan.sentiment || 'N/A'}
                    </Badge>
                  </BlockStack>
                  
                  <BlockStack gap="100">
                    <Text variant="bodySm" tone="subdued">Confidence</Text>
                    <Text variant="headingLg">
                      {(scan.confidence * 100).toFixed(0)}%
                    </Text>
                  </BlockStack>
                </InlineGrid>
              </BlockStack>
            </Card>
          </Layout.Section>
          
          {/* Question Asked */}
          <Layout.Section>
            <Card title="Question Asked">
              <Box padding="200" background="bg-surface-secondary" borderRadius="100">
                <Text variant="bodyMd">{scan.question}</Text>
              </Box>
            </Card>
          </Layout.Section>
          
          {/* AI Response */}
          <Layout.Section>
            <Card title="AI Response">
              <BlockStack gap="300">
                <Box padding="200" background="bg-surface-secondary" borderRadius="100">
                  <Text variant="bodyMd">{scan.fullResponse}</Text>
                </Box>
                
                {scan.citation && (
                  <>
                    <Divider />
                    <BlockStack gap="200">
                      <Text variant="headingSm">Citation Extract:</Text>
                      <Box padding="200" background="bg-surface-success" borderRadius="100">
                        <Text variant="bodyMd">"{scan.citation}"</Text>
                      </Box>
                    </BlockStack>
                  </>
                )}
              </BlockStack>
            </Card>
          </Layout.Section>
          
          {/* Competitors Mentioned */}
          {scan.competitors && scan.competitors.length > 0 && (
            <Layout.Section>
              <Card title="Competitors Mentioned">
                <InlineStack gap="200">
                  {scan.competitors.map(competitor => (
                    <Badge key={competitor}>{competitor}</Badge>
                  ))}
                </InlineStack>
              </Card>
            </Layout.Section>
          )}
          
          {/* Scan Metadata */}
          <Layout.Section>
            <Card title="Scan Information">
              <BlockStack gap="200">
                <InlineStack align="space-between">
                  <Text variant="bodyMd">Scan Date</Text>
                  <Text variant="bodyMd">{new Date(scan.createdAt).toLocaleString()}</Text>
                </InlineStack>
                <InlineStack align="space-between">
                  <Text variant="bodyMd">Duration</Text>
                  <Text variant="bodyMd">{(scan.scanDuration / 1000).toFixed(2)}s</Text>
                </InlineStack>
                <InlineStack align="space-between">
                  <Text variant="bodyMd">Credits Used</Text>
                  <Text variant="bodyMd">{scan.creditsUsed}</Text>
                </InlineStack>
              </BlockStack>
            </Card>
          </Layout.Section>
        </Layout>
      </Page>
    </AppProvider>
  );
}
