import { useLoaderData, useNavigate } from "react-router";
import {
  AppProvider,
  Page,
  Layout,
  LegacyCard,
  Text,
  Badge,
  Button,
  ProgressBar,
  Banner,
  BlockStack,
  InlineGrid,
  Box,
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
        compactTitle
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
          {/* Statut du plan */}
          <Layout.Section>
            <Box paddingBlockEnd="400">
              <InlineGrid columns="1fr auto" gap="400" alignItems="center">
                <Text variant="bodyMd" as="p">
                  Bienvenue dans votre espace RankInAI
                </Text>
                <Badge tone="attention">Plan {data.shop.plan}</Badge>
              </InlineGrid>
            </Box>
          </Layout.Section>

          {/* Bannière d'information si pas de produits */}
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

          {/* Métriques principales */}
          <Layout.Section>
            <InlineGrid columns={{xs: 1, sm: 2, md: 3}} gap="400">
              {/* Carte Crédits */}
              <LegacyCard>
                <Box padding="400">
                  <BlockStack gap="300">
                    <Text variant="headingSm" as="h3" tone="subdued">
                      Crédits disponibles
                    </Text>
                    <Text variant="heading3xl" as="p">
                      {data.shop.credits}
                      <Text as="span" variant="headingMd" tone="subdued">
                        {" "}sur {data.shop.maxCredits}
                      </Text>
                    </Text>
                    <Box paddingBlockStart="200">
                      <ProgressBar 
                        progress={100 - creditsPercentage} 
                        tone="primary"
                        size="small"
                      />
                    </Box>
                    <Text variant="bodySm" tone="subdued">
                      {creditsUsed} utilisés ce mois
                    </Text>
                  </BlockStack>
                </Box>
                {data.shop.credits < 20 && (
                  <>
                    <Divider />
                    <Box padding="400">
                      <Button 
                        fullWidth
                        onClick={() => navigate("/app/pricing")}
                      >
                        Recharger les crédits
                      </Button>
                    </Box>
                  </>
                )}
              </LegacyCard>

              {/* Carte Citation Rate */}
              <LegacyCard>
                <Box padding="400">
                  <BlockStack gap="300">
                    <Text variant="headingSm" as="h3" tone="subdued">
                      Citation Rate moyen
                    </Text>
                    <Text variant="heading3xl" as="p">
                      {data.stats.averageCitationRate > 0 
                        ? `${data.stats.averageCitationRate}%`
                        : "—"
                      }
                    </Text>
                    <Box paddingBlockStart="200">
                      <Text variant="bodySm" tone="subdued">
                        {data.stats.analyzedProducts > 0 
                          ? `Basé sur ${data.stats.analyzedProducts} produits`
                          : "Aucune analyse disponible"
                        }
                      </Text>
                    </Box>
                  </BlockStack>
                </Box>
                {data.stats.averageCitationRate === 0 && (
                  <>
                    <Divider />
                    <Box padding="400">
                      <Button 
                        fullWidth
                        onClick={() => navigate("/app/products")}
                      >
                        Lancer une analyse
                      </Button>
                    </Box>
                  </>
                )}
              </LegacyCard>

              {/* Carte Produits */}
              <LegacyCard>
                <Box padding="400">
                  <BlockStack gap="300">
                    <Text variant="headingSm" as="h3" tone="subdued">
                      Produits analysés
                    </Text>
                    <Text variant="heading3xl" as="p">
                      {data.stats.analyzedProducts}
                      <Text as="span" variant="headingMd" tone="subdued">
                        {" "}sur {data.stats.totalProducts}
                      </Text>
                    </Text>
                    {data.stats.totalProducts > 0 && (
                      <Box paddingBlockStart="200">
                        <ProgressBar 
                          progress={(data.stats.analyzedProducts / data.stats.totalProducts) * 100} 
                          tone="success"
                          size="small"
                        />
                      </Box>
                    )}
                  </BlockStack>
                </Box>
                <Divider />
                <Box padding="400">
                  <Button 
                    fullWidth
                    onClick={() => navigate("/app/products")}
                  >
                    Gérer les produits
                  </Button>
                </Box>
              </LegacyCard>
            </InlineGrid>
          </Layout.Section>

          {/* Guide de démarrage */}
          <Layout.Section>
            <LegacyCard title="Guide de démarrage rapide">
              <Box padding="400">
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
                      <Box paddingBlockStart="200">
                        <Button
                          primary
                          onClick={() => window.open(`https://admin.shopify.com/store/${data.shop.name}/products/new`, '_blank')}
                        >
                          Créer mon premier produit dans Shopify
                        </Button>
                      </Box>
                    </>
                  )}
                </BlockStack>
              </Box>
            </LegacyCard>
          </Layout.Section>
        </Layout>
      </Page>
    </AppProvider>
  );
}
