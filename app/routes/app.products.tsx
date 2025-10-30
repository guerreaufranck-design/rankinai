import { useLoaderData } from "react-router";
import {
  AppProvider,
  Page,
  Layout,
  Card,
  Text,
  Button,
  EmptyState
} from "@shopify/polaris";
import enTranslations from '@shopify/polaris/locales/en.json';
import { authenticate } from "../shopify.server";

export const loader = async ({ request }: { request: Request }) => {
  try {
    const { admin, session } = await authenticate.admin(request);
    
    // Pour l'instant, on retourne une liste vide
    return {
      products: []
    };
  } catch (error) {
    console.error("Products loader error:", error);
    return { products: [] };
  }
};

export default function Products() {
  const { products } = useLoaderData<typeof loader>();
  
  return (
    <AppProvider i18n={enTranslations}>
      <Page
        title="Mes Produits"
        primaryAction={{
          content: "Synchroniser les produits",
          onAction: () => console.log("Sync products")
        }}
        backAction={{
          content: "Retour",
          url: "/app"
        }}
      >
        <Layout>
          <Layout.Section>
            {products.length === 0 ? (
              <Card>
                <EmptyState
                  heading="Aucun produit trouvé"
                  action={{
                    content: "Ajouter un produit dans Shopify",
                    external: true,
                    onAction: () => window.open('https://admin.shopify.com')
                  }}
                >
                  <p>Commencez par ajouter des produits dans votre boutique Shopify.</p>
                </EmptyState>
              </Card>
            ) : (
              <Card>
                <Text variant="headingMd">Produits à venir...</Text>
              </Card>
            )}
          </Layout.Section>
        </Layout>
      </Page>
    </AppProvider>
  );
}
