import { useLoaderData, useNavigate } from "react-router";
import {
  AppProvider,
  Page,
  Layout,
  Card,
  Text,
  Badge,
  Button,
  ProgressBar,
  EmptyState,
  Banner,
  BlockStack
} from "@shopify/polaris";
import enTranslations from '@shopify/polaris/locales/en.json';
import { authenticate } from "../shopify.server";
import { useState } from "react";

// Données mockées pour le développement
const MOCK_DATA = {
  shop: {
    name: "Store du 29 octobre",
    plan: "TRIAL",
    credits: 50,
    maxCredits: 50
  },
  stats: {
    totalProducts: 0,
    analyzedProducts: 0,
    averageCitationRate: 0,
    lastScanDate: null,
    topProduct: null
  }
};

export const loader = async ({ request }: { request: Request }) => {
  const { admin, session } = await authenticate.admin(request);
  
  return {
    ...MOCK_DATA,
    shop: {
      ...MOCK_DATA.shop,
      name: session.shop.replace(".myshopify.com", "")
    }
  };
};

export default function Dashboard() {
  const data = useLoaderData<typeof loader>();
  const navigate = useNavigate();
  const [isRefreshing, setIsRefreshing] = useState(false);

  const creditsUsed = data.shop.maxCredits - data.shop.credits;
  const creditsPercentage = (creditsUsed / data.shop.maxCredits) * 100;
  
  const handleRefresh = () => {
    setIsRefreshing(true);
    setTimeout(() => setIsRefreshing(false), 2000);
  };

  return (
    <AppProvider i18n={enTranslations}>
      <Page
        title="Tableau de bord RankInAI"
        titleMetadata={<Badge tone="attention">Plan {data.shop.plan}</Badge>}
        primaryAction={{
          content: "Scanner un produit",
          onAction: () => navigate("/app/products")
        }}
        secondaryActions={[
          {
            content: "Actualiser",
            onAction: handleRefresh,
            loading: isRefreshing
          }
        ]}
      >
        <Layout>
          {/* Bannière de bienvenue */}
          {data.stats.totalProducts === 0 && (
            <Layout.Section>
              <Banner
                title="Bienvenue sur RankInAI ! 🎉"
                tone="info"
                onDismiss={() => {}}
              >
                <p>
                  Optimisez vos produits pour être cités par ChatGPT et Gemini.
                  Commencez par ajouter des produits à votre boutique Shopify.
                </p>
              </Banner>
            </Layout.Section>
          )}

          {/* Cartes métriques */}
          <Layout.Section>
            <Layout>
              <Layout.Section oneThird>
                <Card>
                  <BlockStack gap="200">
                    <Text variant="headingMd" as="h3">
                      ✨ Crédits disponibles
                    </Text>
                    <Text variant="heading2xl" as="p">
                      {data.shop.credits}
                      <Text as="span" variant="headingMd" tone="subdued">
                        /{data.shop.maxCredits}
                      </Text>
                    </Text>
                    <ProgressBar 
                      progress={100 - creditsPercentage} 
                      tone="primary"
                      size="small"
                    />
                    <Text variant="bodySm" tone="subdued">
                      {creditsUsed} crédits utilisés ce mois
                    </Text>
                    {data.shop.credits < 20 && (
                      <Button 
                        size="slim" 
                        tone="critical"
                        fullWidth
                        onClick={() => navigate("/app/pricing")}
                      >
                        Recharger
                      </Button>
                    )}
                  </BlockStack>
                </Card>
              </Layout.Section>

              <Layout.Section oneThird>
                <Card>
                  <BlockStack gap="200">
                    <Text variant="headingMd" as="h3">
                      📊 Citation Rate moyen
                    </Text>
                    <Text variant="heading2xl" as="p">
                      {data.stats.averageCitationRate > 0 
                        ? `${data.stats.averageCitationRate}%`
                        : "—"
                      }
                    </Text>
                    <Text variant="bodySm" tone="subdued">
                      {data.stats.analyzedProducts > 0 
                        ? `Sur ${data.stats.analyzedProducts} produits`
                        : "Lancez votre premier scan"
                      }
                    </Text>
                    {data.stats.averageCitationRate === 0 && (
                      <Button 
                        size="slim" 
                        fullWidth
                        onClick={() => navigate("/app/products")}
                      >
                        Commencer
                      </Button>
                    )}
                  </BlockStack>
                </Card>
              </Layout.Section>

              <Layout.Section oneThird>
                <Card>
                  <BlockStack gap="200">
                    <Text variant="headingMd" as="h3">
                      📦 Produits analysés
                    </Text>
                    <Text variant="heading2xl" as="p">
                      {data.stats.analyzedProducts}
                      <Text as="span" variant="headingMd" tone="subdued">
                        /{data.stats.totalProducts}
                      </Text>
                    </Text>
                    {data.stats.totalProducts > 0 && (
                      <ProgressBar 
                        progress={(data.stats.analyzedProducts / data.stats.totalProducts) * 100} 
                        tone="success"
                        size="small"
                      />
                    )}
                    <Button 
                      size="slim" 
                      fullWidth
                      onClick={() => navigate("/app/products")}
                    >
                      Voir les produits
                    </Button>
                  </BlockStack>
                </Card>
              </Layout.Section>
            </Layout>
          </Layout.Section>

          {/* État vide */}
          {data.stats.totalProducts === 0 && (
            <Layout.Section>
              <Card>
                <EmptyState
                  heading="Commencez à optimiser vos produits"
                  image="https://cdn.shopify.com/s/files/1/0262/4071/2726/files/emptystate-files.png"
                  action={{
                    content: "Ajouter des produits dans Shopify",
                    onAction: () => window.open(`https://admin.shopify.com/store/${data.shop.name}/products/new`, '_blank'),
                    external: true
                  }}
                >
                  <p>
                    Ajoutez des produits à votre boutique Shopify. 
                    Ils seront automatiquement synchronisés avec RankInAI.
                  </p>
                </EmptyState>
              </Card>
            </Layout.Section>
          )}

          {/* Conseils */}
          <Layout.Section>
            <Card>
              <BlockStack gap="400">
                <Text variant="headingMd" as="h3">
                  💡 Conseils pour bien démarrer
                </Text>
                
                <BlockStack gap="200">
                  <Text variant="bodyMd">
                    <strong>✅ 1. Ajoutez vos produits</strong>
                  </Text>
                  <Text variant="bodySm" tone="subdued">
                    Créez des produits dans votre admin Shopify, ils apparaîtront automatiquement ici.
                  </Text>

                  <Text variant="bodyMd">
                    <strong>🔍 2. Lancez votre premier scan</strong>
                  </Text>
                  <Text variant="bodySm" tone="subdued">
                    Testez si vos produits sont cités par ChatGPT et Gemini (coût : 3 crédits).
                  </Text>

                  <Text variant="bodyMd">
                    <strong>🚀 3. Appliquez les optimisations</strong>
                  </Text>
                  <Text variant="bodySm" tone="subdued">
                    Suivez les recommandations IA pour améliorer votre citation rate.
                  </Text>
                </BlockStack>
              </BlockStack>
            </Card>
          </Layout.Section>
        </Layout>
      </Page>
    </AppProvider>
  );
}
