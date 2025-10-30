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
  BlockStack
} from "@shopify/polaris";
import enTranslations from '@shopify/polaris/locales/en.json';
import { authenticate } from "../shopify.server";

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

  return (
    <AppProvider i18n={enTranslations}>
      <Page
        title="Tableau de bord RankInAI"
        primaryAction={{
          content: "Scanner un produit",
          onAction: () => navigate("/app/products")
        }}
      >
        <Layout>
          <Layout.Section>
            <Banner title="Bienvenue !" tone="info">
              <p>Ajoutez des produits dans Shopify pour commencer.</p>
            </Banner>
          </Layout.Section>

          <Layout.Section>
            <Card>
              <Text variant="headingMd" as="h2">Crédits: {data.shop.credits}/50</Text>
            </Card>
          </Layout.Section>

          <Layout.Section>
            <Card>
              <Text variant="headingMd" as="h2">Produits: 0</Text>
            </Card>
          </Layout.Section>
        </Layout>
      </Page>
    </AppProvider>
  );
}
