import type { ActionFunctionArgs, LoaderFunctionArgs } from "react-router";
import { authenticate } from "~/shopify.server";

export const loader = ({ request }: LoaderFunctionArgs) => {
  return new Response("Method Not Allowed", { status: 405 });
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const { shop, topic } = await authenticate.webhook(request);
  console.log("Received webhook: " + topic + " for shop: " + shop);
  return new Response(null, { status: 200 });
};
