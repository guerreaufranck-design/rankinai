import type { LoaderFunctionArgs } from "react-router";
import { json } from "@remix-run/node";
import { useLoaderData } from "react-router";
import { authenticate } from "~/shopify.server";
import { prisma } from "~/db.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session } = await authenticate.admin(request);

  const shop = await prisma.shop.findUnique({
    where: { shopifyDomain: session.shop },
    select: {
      shopName: true,
      credits: true,
      maxCredits: true,
      Product: {
        select: {
          id: true,
          title: true,
          citationRate: true,
        },
        take: 10,
      },
    },
  });

  return json({
    shop: shop || { shopName: "Store", credits: 0, maxCredits: 25, Product: [] },
  });
};

export default function Index() {
  const { shop } = useLoaderData<typeof loader>();

  return (
    <div style={{ padding: "20px", fontFamily: "system-ui" }}>
      <h1>RankInAI Dashboard</h1>
      <div style={{ marginTop: "20px" }}>
        <h2>Welcome back, {shop.shopName}!</h2>
        <p>Credits: {shop.credits}/{shop.maxCredits}</p>
        <p>Products: {shop.Product.length}</p>
      </div>
    </div>
  );
}
