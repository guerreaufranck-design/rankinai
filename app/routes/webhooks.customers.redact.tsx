import type { ActionFunctionArgs, LoaderFunctionArgs } from "react-router";

export const loader = () => {
  return new Response("Method Not Allowed", { status: 405 });
};

export const action = async ({ request }: ActionFunctionArgs) => {
  console.log("[WEBHOOK] customers/redact called");
  return new Response(JSON.stringify({ received: true }), {
    status: 200,
    headers: { "Content-Type": "application/json" }
  });
};
