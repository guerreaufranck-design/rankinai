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
  Banner,
  BlockStack,
  InlineGrid,
  InlineStack,
  Divider
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
        title="Tableau de bord"
        subtitle="RankInAI - Optimisation pour ChatGPT et Gemini"
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
          {/* Section statut */}
          <Layout.Section>
            <InlineStack align="space-between" blockAlign="center">
              <Text variant="bodyMd" as="p">
                Bienvenue dans votre espace RankInAI
              </Text>
              <Badge tone="attention">Plan {data.shop.plan}</Badge>
            </InlineStack>
          </Layout.Section>

          {/* Bannière d'information */}
          {data.stats.totalProducts === 0 && (
            <Layout.Section>
              <Banner
                title="Première utilisation"
                tone="info"
              >
                <p>
                  Pour commencer, ajoutez des produits dans votre boutique Shopify. 
                  Ils seront automatiquement synchronisés avec RankInAI.
                </p>
              </Banner>
            </Layout.Section>
          )}

          {/* Cartes métriques */}
          <Layout.Section>
            <InlineGrid columns={{xs: 1, sm: 2, md: 3}} gap="400">
              
              {/* Carte Crédits */}
              <Card>
                <BlockStack gap="400">
                  <BlockStack gap="200">
                    <Text variant="headingSm" as="h3" tone="subdued">
                      Crédits disponibles
                    </Text>
                    <InlineStack blockAlign="baseline" gap="200">
                      <Text variant="heading2xl" as="p">
                        {data.shop.credits}
                      </Text>
                      <Text variant="headingMd" tone="subdued">
                        sur {data.shop.maxCredits}
                      </Text>
                    </InlineStack>
                  </BlockStack>
                  
                  <BlockStack gap="100">
                    <ProgressBar 
                      progress={100 - creditsPercentage} 
                      tone="primary"
                      size="small"
                    />
                    <Text variant="bodySm" tone="subdued">
                      {creditsUsed} utilisés ce mois
                    </Text>
                  </BlockStack>
                  
                  {data.shop.credits < 20 && (
                    <>
                      <Divider />
                      <Button 
                        fullWidth
                        onClick={() => navigate("/app/pricing")}
                      >
                        Recharger les crédits
                      </Button>
                    </>
                  )}
                </BlockStack>
              </Card>

              {/* Carte Citation Rate */}
              <Card>
                <BlockStack gap="400">
                  <BlockStack gap="200">
                    <Text variant="headingSm" as="h3" tone="subdued">
                      Citation Rate moyen
                    </Text>
                    <Text variant="heading2xl" as="p">
                      {data.stats.averageCitationRate > 0 
                        ? `${data.stats.averageCitationRate}%`
                        : "—"
                      }
                    </Text>
                    <Text variant="bodySm" tone="subdued">
                      {data.stats.analyzedProducts > 0 
                        ? `Basé sur ${data.stats.analyzedProducts} produits`
                        : "Aucune analyse disponible"
                      }
                    </Text>
                  </BlockStack>
                  
                  {data.stats.averageCitationRate === 0 && (
                    <>
                      <Divider />
                      <Button 
                        fullWidth
                        onClick={() => navigate("/app/products")}
                      >
                        Lancer une analyse
                      </Button>
                    </>
                  )}
                </BlockStack>
              </Card>

              {/* Carte Produits */}
              <Card>
                <BlockStack gap="400">
                  <BlockStack gap="200">
                    <Text variant="headingSm" as="h3" tone="subdued">
                      Produits analysés
                    </Text>
                    <InlineStack blockAlign="baseline" gap="200">
                      <Text variant="heading2xl" as="p">
                        {data.stats.analyzedProducts}
                      </Text>
                      <Text variant="headingMd" tone="subdued">
                        sur {data.stats.totalProducts}
                      </Text>
                    </InlineStack>
                    
                    {data.stats.totalProducts > 0 && (
                      <ProgressBar 
                        progress={(data.stats.analyzedProducts / data.stats.totalProducts) * 100} 
                        tone="success"
                        size="small"
                      />
                    )}
                  </BlockStack>
                  
                  <Divider />
                  <Button 
                    fullWidth
                    onClick={() => navigate("/app/products")}
                  >
                    Gérer les produits
                  </Button>
                </BlockStack>
              </Card>
            </InlineGrid>
          </Layout.Section>

          {/* Guide de démarrage */}
          <Layout.Section>
            <Card title="Guide de démarrage rapide">
              <BlockStack gap="400">
                <InlineGrid columns={{xs: 1, md: 3}} gap="400">
                  <BlockStack gap="200">
                    <Text variant="headingMd" as="h4">
                      1. Synchronisation
                    </Text>
                    <Text variant="bodyMd" tone="subdued">
                      Vos produits Shopify sont automatiquement importés dans RankInAI.
                    </Text>
                  </BlockStack>
                  
                  <BlockStack gap="200">
                    <Text variant="headingMd" as="h4">
                      2. Analyse IA
                    </Text>
                    <Text variant="bodyMd" tone="subdued">
                      Testez la visibilité de vos produits sur ChatGPT et Gemini.
                    </Text>
                  </BlockStack>
                  
                  <BlockStack gap="200">
                    <Text variant="headingMd" as="h4">
                      3. Optimisation
                    </Text>
                    <Text variant="bodyMd" tone="subdued">
                      Appliquez les recommandations pour améliorer votre citation rate.
                    </Text>
                  </BlockStack>
                </InlineGrid>

                {data.stats.totalProducts === 0 && (
                  <>
                    <Divider />
                    <Button
                      primary
                      onClick={() => window.open(`https://admin.shopify.com/store/${data.shop.name}/products/new`, '_blank')}
                    >
                      Créer mon premier produit dans Shopify
                    </Button>
                  </>
                )}
              </BlockStack>
            </Card>
          </Layout.Section>
        </Layout>
      </Page>
    </AppProvider>
  );
}
