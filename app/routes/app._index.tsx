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
  Divider
} from "@shopify/polaris";
import enTranslations from '@shopify/polaris/locales/en.json';
import { authenticate } from "../shopify.server";
import { useState } from "react";

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
    averageCitationRate: 0
  }
};

export const loader = async ({ request }: { request: Request }) => {
  try {
    const { admin, session } = await authenticate.admin(request);
    
    return {
      ...MOCK_DATA,
      shop: {
        ...MOCK_DATA.shop,
        name: session.shop.replace(".myshopify.com", "")
      }
    };
  } catch (error) {
    console.error("Dashboard loader error:", error);
    // Retour de données par défaut en cas d'erreur
    return MOCK_DATA;
  }
};

export default function Dashboard() {
  const data = useLoaderData<typeof loader>();
  const navigate = useNavigate();
  const [isRefreshing, setIsRefreshing] = useState(false);

  const creditsUsed = data.shop.maxCredits - data.shop.credits;
  const creditsPercentage = (creditsUsed / data.shop.maxCredits) * 100;

  return (
    <AppProvider i18n={enTranslations}>
      <Page
        title="Tableau de bord RankInAI"
        subtitle="Optimisation pour ChatGPT et Gemini"
        primaryAction={{
          content: "Scanner un produit",
          onAction: () => navigate("/app/products")
        }}
        secondaryActions={[
          {
            content: "Actualiser",
            onAction: () => {
              setIsRefreshing(true);
              setTimeout(() => setIsRefreshing(false), 2000);
            },
            loading: isRefreshing
          }
        ]}
      >
        <Layout>
          {/* Badge du plan */}
          <Layout.Section>
            <Badge tone="attention">Plan {data.shop.plan}</Badge>
          </Layout.Section>

          {/* Message de bienvenue */}
          {data.stats.totalProducts === 0 && (
            <Layout.Section>
              <Banner title="Bienvenue sur RankInAI !" tone="info">
                <p>
                  Pour commencer, ajoutez des produits dans votre boutique Shopify. 
                  Ils seront automatiquement synchronisés avec RankInAI.
                </p>
              </Banner>
            </Layout.Section>
          )}

          {/* Les 3 cartes principales */}
          <Layout.Section>
            <Layout>
              <Layout.Section oneThird>
                <Card>
                  <BlockStack gap="300">
                    <Text variant="headingSm" tone="subdued">Crédits disponibles</Text>
                    <Text variant="heading2xl">{data.shop.credits}/{data.shop.maxCredits}</Text>
                    <ProgressBar progress={100 - creditsPercentage} tone="primary" size="small" />
                    <Text variant="bodySm" tone="subdued">{creditsUsed} utilisés ce mois</Text>
                  </BlockStack>
                </Card>
              </Layout.Section>

              <Layout.Section oneThird>
                <Card>
                  <BlockStack gap="300">
                    <Text variant="headingSm" tone="subdued">Citation Rate moyen</Text>
                    <Text variant="heading2xl">
                      {data.stats.averageCitationRate > 0 ? `${data.stats.averageCitationRate}%` : "—"}
                    </Text>
                    <Text variant="bodySm" tone="subdued">
                      {data.stats.analyzedProducts > 0 
                        ? `Sur ${data.stats.analyzedProducts} produits`
                        : "Aucune analyse"}
                    </Text>
                  </BlockStack>
                </Card>
              </Layout.Section>

              <Layout.Section oneThird>
                <Card>
                  <BlockStack gap="300">
                    <Text variant="headingSm" tone="subdued">Produits analysés</Text>
                    <Text variant="heading2xl">
                      {data.stats.analyzedProducts}/{data.stats.totalProducts}
                    </Text>
                    <Button fullWidth onClick={() => navigate("/app/products")}>
                      Voir les produits
                    </Button>
                  </BlockStack>
                </Card>
              </Layout.Section>
            </Layout>
          </Layout.Section>

          {/* Guide simple */}
          <Layout.Section>
            <Card title="Comment ça marche ?">
              <BlockStack gap="300">
                <Text variant="bodyMd">
                  <strong>1.</strong> Ajoutez des produits dans Shopify
                </Text>
                <Text variant="bodyMd">
                  <strong>2.</strong> Lancez un scan (3 crédits)
                </Text>
                <Text variant="bodyMd">
                  <strong>3.</strong> Appliquez les optimisations
                </Text>
                {data.stats.totalProducts === 0 && (
                  <>
                    <Divider />
                    <Button 
                      primary 
                      onClick={() => window.open(`https://admin.shopify.com/store/${data.shop.name}/products/new`, '_blank')}
                    >
                      Ajouter mon premier produit
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
