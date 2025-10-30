import { useNavigate } from "react-router";
import {
  AppProvider,
  Page,
  Layout,
  Card,
  Text,
  Button,
  BlockStack,
  InlineGrid,
  Badge,
  List
} from "@shopify/polaris";
import enTranslations from '@shopify/polaris/locales/en.json';

const PLANS = [
  {
    name: "Trial",
    price: "Gratuit",
    credits: 25,
    features: [
      "25 crédits uniques",
      "Import produits illimité",
      "Scans ChatGPT & Gemini",
      "Recommandations basiques"
    ],
    current: true
  },
  {
    name: "Starter",
    price: "29€/mois",
    credits: 100,
    features: [
      "100 crédits/mois",
      "Analytics détaillés",
      "Support email prioritaire",
      "Historique complet"
    ]
  },
  {
    name: "Growth",
    price: "79€/mois",
    credits: 500,
    features: [
      "500 crédits/mois",
      "Application automatique",
      "Alertes automatiques",
      "Support prioritaire"
    ],
    popular: true
  },
  {
    name: "Pro",
    price: "199€/mois",
    credits: 2000,
    features: [
      "2000 crédits/mois",
      "Application automatique",
      "Export CSV/PDF",
      "Support 24/7"
    ]
  }
];

export default function Pricing() {
  const navigate = useNavigate();
  
  return (
    <AppProvider i18n={enTranslations}>
      <Page
        title="Plans et tarifs"
        backAction={{
          content: "Retour",
          onAction: () => navigate("/app")
        }}
      >
        <Layout>
          <Layout.Section>
            <InlineGrid columns={{ xs: 1, sm: 2, md: 4 }} gap="400">
              {PLANS.map((plan) => (
                <Card key={plan.name}>
                  <BlockStack gap="400">
                    {plan.popular && <Badge tone="attention">Populaire</Badge>}
                    {plan.current && <Badge tone="success">Plan actuel</Badge>}
                    
                    <Text variant="headingLg">{plan.name}</Text>
                    <Text variant="heading2xl">{plan.price}</Text>
                    <Text variant="bodyMd" tone="subdued">
                      {plan.credits} crédits/mois
                    </Text>
                    
                    <List>
                      {plan.features.map((feature, i) => (
                        <List.Item key={i}>{feature}</List.Item>
                      ))}
                    </List>
                    
                    <Button 
                      primary={plan.popular}
                      fullWidth
                      disabled={plan.current}
                    >
                      {plan.current ? "Plan actuel" : "Choisir ce plan"}
                    </Button>
                  </BlockStack>
                </Card>
              ))}
            </InlineGrid>
          </Layout.Section>
        </Layout>
      </Page>
    </AppProvider>
  );
}
