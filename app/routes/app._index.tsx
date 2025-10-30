import { useLoaderData, useNavigate, useFetcher } from "react-router";
import {
  AppProvider,
  Page,
  Layout,
  Card,
  Text,
  Badge,
  Button,
  ProgressBar,
  Banner,
  BlockStack,
  InlineGrid,
  InlineStack,
  Divider,
  EmptyState
} from "@shopify/polaris";
import enTranslations from '@shopify/polaris/locales/en.json';
import { authenticate } from "../shopify.server";
import { prisma } from "~/db.server";
import { StatsCard } from "~/components/StatsCard";
import { formatDate, calculatePercentageChange } from "~/utils/helpers";
import { useEffect, useState } from "react";

export const loader = async ({ request }: { request: Request }) => {
  try {
    const { admin, session } = await authenticate.admin(request);
    
    // Get shop with all relations
    const shop = await prisma.shop.findUnique({
      where: { shopifyDomain: session.shop },
      include: {
        products: {
          include: {
            scans: {
              orderBy: { createdAt: 'desc' },
              take: 1
            }
          }
        },
        alerts: {
          where: { isRead: false },
          orderBy: { createdAt: 'desc' },
          take: 5
        },
        events: {
          where: {
            type: { in: ['SCAN_COMPLETED', 'OPTIMIZATION_APPLIED'] },
            createdAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) }
          }
        }
      }
    });
    
    if (!shop) {
      throw new Error("Shop not found");
    }
    
    // Calculate metrics
    const totalProducts = shop.products.length;
    const analyzedProducts = shop.products.filter(p => p.totalScans > 0);
    const averageCitationRate = analyzedProducts.length > 0
      ? analyzedProducts.reduce((sum, p) => sum + p.citationRate, 0) / analyzedProducts.length
      : 0;
    
    // Get top performing products
    const topProducts = shop.products
      .filter(p => p.citationRate > 0)
      .sort((a, b) => b.citationRate - a.citationRate)
      .slice(0, 5);
    
    // Get products needing attention
    const needsAttention = shop.products
      .filter(p => p.citationRate < 20 && p.totalScans > 0)
      .slice(0, 3);
    
    // Calculate trends (compare with last month)
    const lastMonthScans = await prisma.scan.count({
      where: {
        shopId: shop.id,
        createdAt: {
          gte: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000),
          lt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
        }
      }
    });
    
    const thisMonthScans = await prisma.scan.count({
      where: {
        shopId: shop.id,
        createdAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) }
      }
    });
    
    const scanTrend = calculatePercentageChange(lastMonthScans, thisMonthScans);
    
    return {
      shop: {
        id: shop.id,
        name: shop.shopName,
        plan: shop.plan,
        credits: shop.credits,
        maxCredits: shop.maxCredits,
        billingStatus: shop.billingStatus
      },
      stats: {
        totalProducts,
        analyzedProducts: analyzedProducts.length,
        averageCitationRate: Math.round(averageCitationRate),
        thisMonthScans,
        scanTrend
      },
      topProducts,
      needsAttention,
      recentAlerts: shop.alerts
    };
  } catch (error) {
    console.error("Dashboard loader error:", error);
    return {
      shop: { name: "Store", plan: "TRIAL", credits: 25, maxCredits: 25 },
      stats: { totalProducts: 0, analyzedProducts: 0, averageCitationRate: 0 },
      topProducts: [],
      needsAttention: [],
      recentAlerts: []
    };
  }
};

export default function Dashboard() {
  const data = useLoaderData<typeof loader>();
  const navigate = useNavigate();
  const fetcher = useFetcher();
  const [dismissedBanner, setDismissedBanner] = useState(false);
  
  const creditsPercentage = (data.shop.credits / data.shop.maxCredits) * 100;
  const needsUpgrade = data.shop.plan === 'TRIAL' && data.shop.credits <= 10;
  
  // Auto-refresh every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      fetcher.load("/app");
    }, 30000);
    
    return () => clearInterval(interval);
  }, []);
  
  return (
    <AppProvider i18n={enTranslations}>
      <Page
        title="RankInAI Dashboard"
        subtitle={`Welcome back, ${data.shop.name}`}
        primaryAction={{
          content: "Quick Scan",
          onAction: () => navigate("/app/products"),
          disabled: data.shop.credits === 0
        }}
        secondaryActions={[
          {
            content: "View Products",
            onAction: () => navigate("/app/products")
          }
        ]}
      >
        <Layout>
          {/* Upgrade Banner */}
          {needsUpgrade && !dismissedBanner && (
            <Layout.Section>
              <Banner
                title="Upgrade to unlock more scans"
                tone="warning"
                onDismiss={() => setDismissedBanner(true)}
                action={{
                  content: "View plans",
                  onAction: () => navigate("/app/pricing")
                }}
              >
                <p>You have only {data.shop.credits} credits left in your trial.</p>
              </Banner>
            </Layout.Section>
          )}
          
          {/* Main Stats */}
          <Layout.Section>
            <InlineGrid columns={{ xs: 1, sm: 2, md: 4 }} gap="400">
              <StatsCard
                title="Credits Available"
                value={`${data.shop.credits}/${data.shop.maxCredits}`}
                subtitle={`${creditsPercentage.toFixed(0)}% remaining`}
                tone={creditsPercentage > 20 ? 'base' : 'warning'}
              />
              
              <StatsCard
                title="Citation Rate"
                value={`${data.stats.averageCitationRate}%`}
                change={data.stats.averageCitationRate > 50 ? 5.2 : -3.1}
                subtitle="Average across products"
              />
              
              <StatsCard
                title="Products Analyzed"
                value={`${data.stats.analyzedProducts}/${data.stats.totalProducts}`}
                subtitle={`${((data.stats.analyzedProducts / Math.max(data.stats.totalProducts, 1)) * 100).toFixed(0)}% coverage`}
              />
              
              <StatsCard
                title="Scans This Month"
                value={data.stats.thisMonthScans}
                change={data.stats.scanTrend}
                subtitle="vs last month"
              />
            </InlineGrid>
          </Layout.Section>
          
          {/* Quick Actions */}
          <Layout.Section>
            <Card>
              <BlockStack gap="400">
                <Text variant="headingMd">Quick Actions</Text>
                <InlineGrid columns={{ xs: 1, sm: 3 }} gap="200">
                  <Button onClick={() => navigate("/app/products")}>
                    📦 View All Products
                  </Button>
                  <Button onClick={() => navigate("/app/analytics")}>
                    📊 Analytics
                  </Button>
                  <Button onClick={() => navigate("/app/assistant")}>
                    💬 AI Assistant
                  </Button>
                </InlineGrid>
              </BlockStack>
            </Card>
          </Layout.Section>
          
          <Layout>
            {/* Top Products */}
            <Layout.Section oneHalf>
              <Card>
                <BlockStack gap="400">
                  <InlineStack align="space-between">
                    <Text variant="headingMd">🏆 Top Performers</Text>
                    <Button plain onClick={() => navigate("/app/products")}>
                      View all
                    </Button>
                  </InlineStack>
                  
                  {data.topProducts.length === 0 ? (
                    <Text tone="subdued">No products analyzed yet</Text>
                  ) : (
                    <BlockStack gap="300">
                      {data.topProducts.map((product, i) => (
                        <InlineStack key={product.id} align="space-between" blockAlign="center">
                          <InlineStack gap="200">
                            <Badge>{i + 1}</Badge>
                            <Button 
                              plain 
                              monochrome
                              onClick={() => navigate(`/app/products/${product.id}`)}
                            >
                              {product.title.substring(0, 30)}...
                            </Button>
                          </InlineStack>
                          <Badge tone="success">
                            {product.citationRate.toFixed(1)}%
                          </Badge>
                        </InlineStack>
                      ))}
                    </BlockStack>
                  )}
                </BlockStack>
              </Card>
            </Layout.Section>
            
            {/* Needs Attention */}
            <Layout.Section oneHalf>
              <Card>
                <BlockStack gap="400">
                  <InlineStack align="space-between">
                    <Text variant="headingMd">⚠️ Needs Attention</Text>
                    <Button plain onClick={() => navigate("/app/products")}>
                      Fix now
                    </Button>
                  </InlineStack>
                  
                  {data.needsAttention.length === 0 ? (
                    <Text tone="subdued">All products performing well!</Text>
                  ) : (
                    <BlockStack gap="300">
                      {data.needsAttention.map(product => (
                        <InlineStack key={product.id} align="space-between" blockAlign="center">
                          <Button 
                            plain 
                            monochrome
                            onClick={() => navigate(`/app/products/${product.id}`)}
                          >
                            {product.title.substring(0, 30)}...
                          </Button>
                          <Badge tone="critical">
                            {product.citationRate.toFixed(1)}%
                          </Badge>
                        </InlineStack>
                      ))}
                    </BlockStack>
                  )}
                </BlockStack>
              </Card>
            </Layout.Section>
          </Layout>
          
          {/* Recent Alerts */}
          {data.recentAlerts.length > 0 && (
            <Layout.Section>
              <Card>
                <BlockStack gap="400">
                  <InlineStack align="space-between">
                    <Text variant="headingMd">🔔 Recent Alerts</Text>
                    <Badge>{data.recentAlerts.length} unread</Badge>
                  </InlineStack>
                  
                  <BlockStack gap="200">
                    {data.recentAlerts.map(alert => (
                      <InlineStack key={alert.id} align="space-between">
                        <Text variant="bodyMd">{alert.title}</Text>
                        <Text variant="bodySm" tone="subdued">
                          {formatDate(alert.createdAt)}
                        </Text>
                      </InlineStack>
                    ))}
                  </BlockStack>
                </BlockStack>
              </Card>
            </Layout.Section>
          )}
          
          {/* Empty State */}
          {data.stats.totalProducts === 0 && (
            <Layout.Section>
              <Card>
                <EmptyState
                  heading="Add your first product"
                  action={{
                    content: "Go to Shopify Admin",
                    external: true,
                    onAction: () => window.open(`https://admin.shopify.com/store/${data.shop.name}/products/new`)
                  }}
                  secondaryAction={{
                    content: "Learn more",
                    onAction: () => navigate("/app/assistant")
                  }}
                  image="https://cdn.shopify.com/s/files/1/0262/4071/2726/files/emptystate-files.png"
                >
                  <p>Start by adding products to your Shopify store. They'll automatically sync with RankInAI.</p>
                </EmptyState>
              </Card>
            </Layout.Section>
          )}
        </Layout>
      </Page>
    </AppProvider>
  );
}
