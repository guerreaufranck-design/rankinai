import { useLoaderData, useNavigate } from "react-router";
import {
  AppProvider,
  Page,
  Layout,
  Card,
  Text,
  Button,
  Badge,
  DataTable,
  Thumbnail,
  Link
} from "@shopify/polaris";
import enTranslations from '@shopify/polaris/locales/en.json';
import { authenticate } from "../shopify.server";
import { prisma } from "~/db.server";

export const loader = async ({ request }: { request: Request }) => {
  try {
    const { admin, session } = await authenticate.admin(request);
    
    // Get shop from DB
    const shop = await prisma.shop.findUnique({
      where: { shopifyDomain: session.shop }
    });

    // Get products for this shop
    const products = await prisma.product.findMany({
      where: { shopId: shop?.id },
      orderBy: { createdAt: 'desc' }
    });
    
    return {
      products: products.map(p => ({
        id: p.id,
        shopifyProductId: p.shopifyProductId,
        title: p.title,
        handle: p.handle,
        vendor: p.vendor || 'Unknown',
        productType: p.productType || 'Unknown',
        priceAmount: p.priceAmount || 0,
        citationRate: p.citationRate,
        totalScans: p.totalScans,
        featuredImageUrl: p.featuredImageUrl,
        status: p.status
      }))
    };
  } catch (error) {
    console.error("Products loader error:", error);
    return { products: [] };
  }
};

export default function Products() {
  const { products } = useLoaderData<typeof loader>();
  const navigate = useNavigate();
  
  const rows = products.map(product => [
    <Thumbnail
      source={product.featuredImageUrl || 'https://via.placeholder.com/50'}
      alt={product.title}
      size="small"
    />,
    <Link onClick={() => navigate(`/app/products/${product.id}`)}>
      {product.title}
    </Link>,
    product.vendor,
    product.productType,
    `€${product.priceAmount.toFixed(2)}`,
    product.totalScans > 0 ? (
      <Badge tone="success">{product.citationRate.toFixed(1)}%</Badge>
    ) : (
      <Badge>Not scanned</Badge>
    ),
    <Button
      size="slim"
      onClick={() => navigate(`/app/products/${product.id}`)}
    >
      View
    </Button>
  ]);
  
  return (
    <AppProvider i18n={enTranslations}>
      <Page
        title="My Products"
        subtitle={`${products.length} products synchronized`}
        primaryAction={{
          content: "Sync Products",
          onAction: () => console.log("Sync products")
        }}
        backAction={{
          content: "Back",
          onAction: () => navigate("/app")
        }}
      >
        <Layout>
          <Layout.Section>
            <Card>
              {products.length === 0 ? (
                <Text tone="subdued">
                  No products found. Add products in your Shopify store to see them here.
                </Text>
              ) : (
                <DataTable
                  columnContentTypes={[
                    'text',
                    'text',
                    'text',
                    'text',
                    'numeric',
                    'text',
                    'text'
                  ]}
                  headings={[
                    'Image',
                    'Title',
                    'Brand',
                    'Type',
                    'Price',
                    'Citation Rate',
                    'Actions'
                  ]}
                  rows={rows}
                />
              )}
            </Card>
          </Layout.Section>
        </Layout>
      </Page>
    </AppProvider>
  );
}
