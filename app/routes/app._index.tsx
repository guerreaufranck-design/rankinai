import { useLoaderData, useNavigate } from "react-router";
import {
  Page,
  Layout,
  Card,
  Text,
  Badge,
  Button,
  Icon,
  ProgressBar,
  EmptyState,
  Banner
} from "@shopify/polaris";
import {
  TrendingUpIcon,
  SearchIcon,
  StarIcon,
  PackageIcon,
  SparklesIcon,
  RefreshCwIcon
} from "@shopify/polaris-icons";
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
  
  // Au lieu de json(), on retourne directement l'objet
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

  const creditsPercentage = ((data.shop.maxCredits - data.shop.credits) / data.shop.maxCredits) * 100;
  
  const planColors = {
    TRIAL: "critical",
    STARTER: "info",
    PLUS: "success",
    GROWTH: "warning",
    PRO: "magic"
  };

  const handleRefresh = () => {
    setIsRefreshing(true);
    setTimeout(() => setIsRefreshing(false), 2000);
  };

  return (
    <Page
      title={
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span>Tableau de bord RankInAI</span>
          <Badge tone={planColors[data.shop.plan]}>
            Plan {data.shop.plan}
          </Badge>
        </div>
      }
      primaryAction={{
        content: "Scanner un produit",
        icon: SearchIcon,
        onAction: () => navigate("/app/products")
      }}
      secondaryActions={[
        {
          content: "Actualiser",
          icon: RefreshCwIcon,
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
              title="🎉 Bienvenue sur RankInAI !"
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
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
            gap: '1rem',
            marginBottom: '1.5rem'
          }}>
            {/* Carte Crédits */}
            <Card>
              <div style={{
                padding: '1.5rem',
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                borderRadius: '0.5rem',
                color: 'white'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <Text as="p" variant="bodyMd" tone="subdued" style={{ color: 'rgba(255,255,255,0.8)' }}>
                      Crédits disponibles
                    </Text>
                    <Text as="h2" variant="heading2xl" style={{ color: 'white', margin: '0.5rem 0' }}>
                      {data.shop.credits}
                      <span style={{ fontSize: '0.5em', opacity: 0.8 }}>/{data.shop.maxCredits}</span>
                    </Text>
                  </div>
                  <div style={{ 
                    background: 'rgba(255,255,255,0.2)', 
                    borderRadius: '50%', 
                    padding: '0.75rem'
                  }}>
                    <Icon source={SparklesIcon} tone="base" />
                  </div>
                </div>
                <div style={{ marginTop: '1rem' }}>
                  <ProgressBar 
                    progress={100 - creditsPercentage} 
                    tone="primary"
                    size="small"
                  />
                  <Text as="p" variant="bodySm" style={{ color: 'rgba(255,255,255,0.8)', marginTop: '0.5rem' }}>
                    {Math.round(creditsPercentage)}% utilisés ce mois
                  </Text>
                </div>
              </div>
            </Card>

            {/* Carte Citation Rate */}
            <Card>
              <div style={{
                padding: '1.5rem',
                background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
                borderRadius: '0.5rem',
                color: 'white'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <Text as="p" variant="bodyMd" style={{ color: 'rgba(255,255,255,0.8)' }}>
                      Citation Rate moyen
                    </Text>
                    <Text as="h2" variant="heading2xl" style={{ color: 'white', margin: '0.5rem 0' }}>
                      —
                    </Text>
                  </div>
                  <div style={{ 
                    background: 'rgba(255,255,255,0.2)', 
                    borderRadius: '50%', 
                    padding: '0.75rem'
                  }}>
                    <Icon source={StarIcon} tone="base" />
                  </div>
                </div>
                <Text as="p" variant="bodySm" style={{ color: 'rgba(255,255,255,0.8)', marginTop: '1rem' }}>
                  Lancez votre premier scan
                </Text>
              </div>
            </Card>

            {/* Carte Produits */}
            <Card>
              <div style={{
                padding: '1.5rem',
                background: 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)',
                borderRadius: '0.5rem',
                color: 'white'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <Text as="p" variant="bodyMd" style={{ color: 'rgba(255,255,255,0.8)' }}>
                      Produits analysés
                    </Text>
                    <Text as="h2" variant="heading2xl" style={{ color: 'white', margin: '0.5rem 0' }}>
                      0/0
                    </Text>
                  </div>
                  <div style={{ 
                    background: 'rgba(255,255,255,0.2)', 
                    borderRadius: '50%', 
                    padding: '0.75rem'
                  }}>
                    <Icon source={PackageIcon} tone="base" />
                  </div>
                </div>
                <Button 
                  size="slim" 
                  fullWidth
                  onClick={() => navigate("/app/products")}
                  style={{ marginTop: '1rem' }}
                >
                  Voir tous les produits
                </Button>
              </div>
            </Card>
          </div>
        </Layout.Section>

        {/* État vide */}
        <Layout.Section>
          <Card>
            <EmptyState
              heading="Commencez à optimiser vos produits"
              image="https://cdn.shopify.com/s/files/1/0262/4071/2726/files/emptystate-files.png"
              action={{
                content: "Ajouter des produits",
                onAction: () => window.open('https://admin.shopify.com/store/store-du-29-octobre/products', '_blank')
              }}
            >
              <p>
                Ajoutez des produits à votre boutique Shopify pour commencer à les optimiser 
                pour ChatGPT et Gemini.
              </p>
            </EmptyState>
          </Card>
        </Layout.Section>

        {/* Alertes */}
        <Layout.Section>
          <Card>
            <div style={{ padding: '1.5rem' }}>
              <Text as="h3" variant="headingMd">
                🔔 Conseils pour bien démarrer
              </Text>
              
              <div style={{ marginTop: '1rem', display: 'grid', gap: '0.75rem' }}>
                <div style={{
                  padding: '0.75rem',
                  background: '#F0FDF4',
                  border: '1px solid #86EFAC',
                  borderRadius: '0.5rem',
                  display: 'flex',
                  gap: '0.75rem',
                  alignItems: 'flex-start'
                }}>
                  <Icon source={TrendingUpIcon} tone="positive" />
                  <div>
                    <Text as="p" variant="bodySm" fontWeight="semibold">
                      Conseil d'optimisation
                    </Text>
                    <Text as="p" variant="bodySm" tone="subdued">
                      Commencez par analyser vos produits best-sellers pour maximiser l'impact.
                    </Text>
                  </div>
                </div>
              </div>
            </div>
          </Card>
        </Layout.Section>
      </Layout>
    </Page>
  );
}
