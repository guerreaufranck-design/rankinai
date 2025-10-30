import { useLoaderData, useNavigate } from "react-router";
import {
  AppProvider,
  Page,
  Layout,
  Card,
  Text,
  Button,
  Badge,
  BlockStack,
  InlineGrid,
  ProgressBar
} from "@shopify/polaris";
import enTranslations from '@shopify/polaris/locales/en.json';
import { authenticate } from "../shopify.server";

export const loader = async ({ request, params }: { request: Request, params: any }) => {
  const { id } = params;
  
  // Mock data pour l'instant
  return {
    product: {
      id,
      title: "Produit Example",
      citationRate: 0,
      lastScan: null,
      scansCount: 0
    }
  };
};

export default function ProductDetail() {
  const { product } = useLoaderData<typeof loader>();
  const navigate = useNavigate();
  
  return (
    <AppProvider i18n={enTranslations}>
      <Page
        title={product.title}
        backAction={{
          content: "Produits",
          onAction: () => navigate("/app/products")
        }}
        primaryAction={{
          content: "Scanner ce produit",
          onAction: () => console.log("Scan product")
        }}
      >
        <Layout>
          <Layout.Section>
            <Card>
              <BlockStack gap="400">
                <InlineGrid columns={3} gap="400">
                  <div>
                    <Text variant="bodyMd" tone="subdued">Citation Rate</Text>
                    <Text variant="heading2xl">
                      {product.citationRate > 0 ? `${product.citationRate}%` : "—"}
                    </Text>
                  </div>
                  <div>
                    <Text variant="bodyMd" tone="subdued">Nombre de scans</Text>
                    <Text variant="heading2xl">{product.scansCount}</Text>
                  </div>
                  <div>
                    <Text variant="bodyMd" tone="subdued">Dernier scan</Text>
                    <Text variant="headingMd">
                      {product.lastScan || "Jamais scanné"}
                    </Text>
                  </div>
                </InlineGrid>
                
                <Button primary fullWidth>
                  Lancer un scan complet (3 crédits)
                </Button>
              </BlockStack>
            </Card>
          </Layout.Section>
          
          <Layout.Section>
            <Card title="Historique des scans">
              <Text tone="subdued">Aucun scan pour l'instant</Text>
            </Card>
          </Layout.Section>
        </Layout>
      </Page>
    </AppProvider>
  );
}
