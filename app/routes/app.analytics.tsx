import { useNavigate } from "react-router";
import {
  AppProvider,
  Page,
  Layout,
  Card,
  Text,
  BlockStack,
  InlineGrid
} from "@shopify/polaris";
import enTranslations from '@shopify/polaris/locales/en.json';

export default function Analytics() {
  const navigate = useNavigate();
  
  return (
    <AppProvider i18n={enTranslations}>
      <Page
        title="Analytics"
        backAction={{
          content: "Retour",
          onAction: () => navigate("/app")
        }}
      >
        <Layout>
          <Layout.Section>
            <InlineGrid columns={{ xs: 1, sm: 2, md: 3 }} gap="400">
              <Card>
                <BlockStack gap="200">
                  <Text variant="bodyMd" tone="subdued">Scans ce mois</Text>
                  <Text variant="heading2xl">0</Text>
                </BlockStack>
              </Card>
              
              <Card>
                <BlockStack gap="200">
                  <Text variant="bodyMd" tone="subdued">Citation Rate moyen</Text>
                  <Text variant="heading2xl">—</Text>
                </BlockStack>
              </Card>
              
              <Card>
                <BlockStack gap="200">
                  <Text variant="bodyMd" tone="subdued">Produits optimisés</Text>
                  <Text variant="heading2xl">0</Text>
                </BlockStack>
              </Card>
            </InlineGrid>
          </Layout.Section>
          
          <Layout.Section>
            <Card title="Évolution du Citation Rate">
              <Text tone="subdued">
                Les graphiques seront disponibles après vos premiers scans.
              </Text>
            </Card>
          </Layout.Section>
        </Layout>
      </Page>
    </AppProvider>
  );
}
