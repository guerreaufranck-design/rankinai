// app/routes/app._index.tsx
// REMPLACE TOUT LE CONTENU PAR CECI :

import { json } from "@remix-run/node";
import { useLoaderData, useNavigate } from "@remix-run/react";
import {
  Page,
  Layout,
  Card,
  Text,
  Badge,
  Button,
  Icon,
  Avatar,
  ProgressBar,
  EmptyState,
  Thumbnail,
  ButtonGroup,
  Tooltip,
  Banner
} from "@shopify/polaris";
import {
  TrendingUpIcon,
  TrendingDownIcon,
  SearchIcon,
  StarIcon,
  AlertCircleIcon,
  PackageIcon,
  SparklesIcon,
  ChevronRightIcon,
  RefreshCwIcon
} from "@shopify/polaris-icons";
import { authenticate } from "../shopify.server";
import { useState, useEffect } from "react";
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from "recharts";

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
  },
  recentScans: [],
  citationTrend: [
    { date: "Lun", rate: 0 },
    { date: "Mar", rate: 0 },
    { date: "Mer", rate: 0 },
    { date: "Jeu", rate: 0 },
    { date: "Ven", rate: 0 },
    { date: "Sam", rate: 0 },
    { date: "Dim", rate: 0 }
  ],
  platformComparison: [
    { name: "ChatGPT", value: 0, color: "#10B981" },
    { name: "Gemini", value: 0, color: "#8B5CF6" }
  ]
};

export const loader = async ({ request }) => {
  const { admin, session } = await authenticate.admin(request);
  
  // Pour l'instant on retourne les données mockées
  // Plus tard on récupérera depuis la DB
  return json({
    ...MOCK_DATA,
    shop: {
      ...MOCK_DATA.shop,
      name: session.shop.replace(".myshopify.com", "")
    }
  });
};

export default function Dashboard() {
  const data = useLoaderData<typeof loader>();
  const navigate = useNavigate();
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Calcul du pourcentage de crédits utilisés
  const creditsPercentage = ((data.shop.maxCredits - data.shop.credits) / data.shop.maxCredits) * 100;
  
  // Couleur selon le plan
  const planColors = {
    TRIAL: "critical",
    STARTER: "info",
    PLUS: "success",
    GROWTH: "warning",
    PRO: "magic"
  };

  // Animation de refresh
  const handleRefresh = () => {
    setIsRefreshing(true);
    setTimeout(() => setIsRefreshing(false), 2000);
  };

  return (
    <Page
      title={
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span>Tableau de bord</span>
          <Badge tone={planColors[data.shop.plan] as any}>
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
        {/* Bannière de bienvenue pour les nouveaux */}
        {data.stats.totalProducts === 0 && (
          <Layout.Section>
            <Banner
              title="🎉 Bienvenue sur RankInAI !"
              tone="info"
              onDismiss={() => {}}
            >
              <p>
                Commencez par ajouter des produits à votre boutique Shopify. 
                Ils seront automatiquement synchronisés ici pour l'analyse.
              </p>
              <Button onClick={() => navigate("/app/tutorial")}>
                Voir le tutoriel
              </Button>
            </Banner>
          </Layout.Section>
        )}

        {/* Métriques principales */}
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
                    padding: '0.75rem',
                    backdropFilter: 'blur(10px)'
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
                {data.shop.credits < 20 && (
                  <Button 
                    size="slim" 
                    tone="critical"
                    variant="primary"
                    fullWidth
                    onClick={() => navigate("/app/pricing")}
                    style={{ marginTop: '1rem' }}
                  >
                    Recharger les crédits
                  </Button>
                )}
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
                      {data.stats.averageCitationRate > 0 ? (
                        <>
                          {data.stats.averageCitationRate}%
                          {data.stats.averageCitationRate > 50 ? (
                            <Icon source={TrendingUpIcon} tone="positive" />
                          ) : (
                            <Icon source={TrendingDownIcon} tone="critical" />
                          )}
                        </>
                      ) : (
                        "—"
                      )}
                    </Text>
                  </div>
                  <div style={{ 
                    background: 'rgba(255,255,255,0.2)', 
                    borderRadius: '50%', 
                    padding: '0.75rem',
                    backdropFilter: 'blur(10px)'
                  }}>
                    <Icon source={StarIcon} tone="base" />
                  </div>
                </div>
                <Text as="p" variant="bodySm" style={{ color: 'rgba(255,255,255,0.8)', marginTop: '1rem' }}>
                  {data.stats.analyzedProducts > 0 
                    ? `Basé sur ${data.stats.analyzedProducts} produits analysés`
                    : "Lancez votre premier scan"
                  }
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
                      {data.stats.analyzedProducts}/{data.stats.totalProducts}
                    </Text>
                  </div>
                  <div style={{ 
                    background: 'rgba(255,255,255,0.2)', 
                    borderRadius: '50%', 
                    padding: '0.75rem',
                    backdropFilter: 'blur(10px)'
                  }}>
                    <Icon source={PackageIcon} tone="base" />
                  </div>
                </div>
                <div style={{ marginTop: '1rem' }}>
                  <ProgressBar 
                    progress={data.stats.totalProducts > 0 
                      ? (data.stats.analyzedProducts / data.stats.totalProducts) * 100 
                      : 0
                    } 
                    tone="success"
                    size="small"
                  />
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

        {/* Graphiques */}
        <Layout.Section>
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fit, minmax(500px, 1fr))',
            gap: '1rem'
          }}>
            {/* Evolution Citation Rate */}
            <Card>
              <div style={{ padding: '1.5rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                  <Text as="h3" variant="headingMd">
                    📈 Évolution du Citation Rate
                  </Text>
                  <ButtonGroup variant="segmented">
                    <Button size="slim">7 jours</Button>
                    <Button size="slim">30 jours</Button>
                    <Button size="slim">90 jours</Button>
                  </ButtonGroup>
                </div>
                <ResponsiveContainer width="100%" height={250}>
                  <AreaChart data={data.citationTrend}>
                    <defs>
                      <linearGradient id="colorRate" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#8B5CF6" stopOpacity={0.8}/>
                        <stop offset="95%" stopColor="#8B5CF6" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
                    <XAxis dataKey="date" stroke="#666" />
                    <YAxis stroke="#666" />
                    <RechartsTooltip />
                    <Area 
                      type="monotone" 
                      dataKey="rate" 
                      stroke="#8B5CF6" 
                      fillOpacity={1} 
                      fill="url(#colorRate)" 
                      strokeWidth={2}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </Card>

            {/* Comparaison Plateformes */}
            <Card>
              <div style={{ padding: '1.5rem' }}>
                <Text as="h3" variant="headingMd" style={{ marginBottom: '1rem' }}>
                  🤖 Performance par Plateforme
                </Text>
                <ResponsiveContainer width="100%" height={250}>
                  <PieChart>
                    <Pie
                      data={data.platformComparison}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={(entry) => `${entry.name}: ${entry.value}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {data.platformComparison.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <RechartsTooltip />
                  </PieChart>
                </ResponsiveContainer>
                <div style={{ display: 'flex', justifyContent: 'center', gap: '2rem', marginTop: '1rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <div style={{ width: 12, height: 12, borderRadius: '50%', background: '#10B981' }} />
                    <Text as="span" variant="bodySm">ChatGPT</Text>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <div style={{ width: 12, height: 12, borderRadius: '50%', background: '#8B5CF6' }} />
                    <Text as="span" variant="bodySm">Gemini</Text>
                  </div>
                </div>
              </div>
            </Card>
          </div>
        </Layout.Section>

        {/* Produits récents / Actions rapides */}
        <Layout.Section>
          <Card>
            <div style={{ padding: '1.5rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                <Text as="h3" variant="headingMd">
                  ⚡ Actions rapides
                </Text>
                <Button onClick={() => navigate("/app/products")} variant="plain">
                  Voir tout
                  <Icon source={ChevronRightIcon} />
                </Button>
              </div>
              
              {data.stats.totalProducts === 0 ? (
                <EmptyState
                  heading="Aucun produit synchronisé"
                  image="https://cdn.shopify.com/s/files/1/0262/4071/2726/files/emptystate-files.png"
                  action={{
                    content: "Ajouter des produits",
                    onAction: () => window.open('https://admin.shopify.com/store/store-du-29-octobre/products', '_blank')
                  }}
                >
                  <p>Ajoutez des produits à votre boutique Shopify pour commencer l'analyse.</p>
                </EmptyState>
              ) : (
                <div style={{ display: 'grid', gap: '1rem' }}>
                  {/* Liste des produits récents */}
                  <div style={{
                    padding: '1rem',
                    border: '1px solid #e0e0e0',
                    borderRadius: '0.5rem',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    ':hover': {
                      boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
                    }
                  }}>
                    <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                      <Thumbnail
                        source="https://cdn.shopify.com/s/files/1/0262/4071/2726/files/emptystate-files.png"
                        alt="Product"
                        size="small"
                      />
                      <div>
                        <Text as="p" variant="bodyMd" fontWeight="semibold">
                          Produit exemple
                        </Text>
                        <Text as="p" variant="bodySm" tone="subdued">
                          Jamais analysé
                        </Text>
                      </div>
                    </div>
                    <Button size="slim" variant="primary">
                      Scanner maintenant
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </Card>
        </Layout.Section>

        {/* Alertes et notifications */}
        <Layout.Section>
          <Card>
            <div style={{ padding: '1.5rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <Text as="h3" variant="headingMd">
                  🔔 Alertes & Insights
                </Text>
                <Badge tone="attention">3 nouvelles</Badge>
              </div>
              
              <div style={{ display: 'grid', gap: '0.75rem' }}>
                {data.shop.credits < 20 && (
                  <div style={{
                    padding: '0.75rem',
                    background: '#FEF2F2',
                    border: '1px solid #FCA5A5',
                    borderRadius: '0.5rem',
                    display: 'flex',
                    gap: '0.75rem',
                    alignItems: 'flex-start'
                  }}>
                    <Icon source={AlertCircleIcon} tone="critical" />
                    <div style={{ flex: 1 }}>
                      <Text as="p" variant="bodySm" fontWeight="semibold">
                        Crédits bientôt épuisés
                      </Text>
                      <Text as="p" variant="bodySm" tone="subdued">
                        Il vous reste seulement {data.shop.credits} crédits. Pensez à recharger.
                      </Text>
                    </div>
                    <Button size="slim" onClick={() => navigate("/app/pricing")}>
                      Recharger
                    </Button>
                  </div>
                )}
                
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
                      Analysez vos produits best-sellers en premier pour maximiser l'impact.
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
