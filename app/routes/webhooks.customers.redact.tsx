import type { ActionFunctionArgs, LoaderFunctionArgs } from "react-router";
import { authenticate } from "~/shopify.server";

export const loader = () => {
  return new Response("Method Not Allowed", { status: 405 });
};

export const action = async ({ request }: ActionFunctionArgs) => {
  try {
    const { shop, topic } = await authenticate.webhook(request);
    console.log("[WEBHOOK] " + topic + " for " + shop);
    return new Response();
  } catch (error) {
    console.error("[WEBHOOK] Error:", error);
    return new Response("Unauthorized", { status: 401 });
  }
};
