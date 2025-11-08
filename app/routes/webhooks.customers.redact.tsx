import type { ActionFunctionArgs } from "react-router";
import { authenticate } from "~/shopify.server";
import { prisma } from "~/db.server";

export const action = async ({ request }: ActionFunctionArgs) => {
  const { shop, payload } = await authenticate.webhook(request);

  console.log("📬 GDPR Customer Redact received for shop:", shop);

  try {
    const customerId = (payload as any).customer?.id;
    const customerEmail = (payload as any).customer?.email;

    await prisma.event.create({
      data: {
        type: "GDPR_CUSTOMER_REDACT",
        title: `Customer redaction: ${customerEmail || customerId}`,
        description: `Customer ${customerId} data must be deleted. Shop: ${shop}`,
        metadata: JSON.stringify(payload),
      },
    });

    console.log("✅ GDPR customer redaction logged");
    return new Response("OK", { status: 200 });
  } catch (error) {
    console.error("❌ Error:", error);
    return new Response("Error", { status: 500 });
  }
};
