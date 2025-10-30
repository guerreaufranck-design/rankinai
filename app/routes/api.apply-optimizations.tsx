import { json } from "react-router";
import type { ActionFunction } from "react-router";
import { authenticate } from "../shopify.server";
import { prisma } from "~/db.server";

export const action: ActionFunction = async ({ request }) => {
  const { admin, session } = await authenticate.admin(request);
  const formData = await request.formData();
  const optimizationId = formData.get("optimizationId") as string;
  
  try {
    // Get optimization with product
    const optimization = await prisma.optimization.findUnique({
      where: { id: optimizationId },
      include: { product: true }
    });
    
    if (!optimization) {
      return json({ error: "Optimization not found" }, { status: 404 });
    }
    
    const recommendations = optimization.recommendations as any;
    
    // Apply to Shopify via GraphQL
    const mutation = `
      mutation updateProduct($input: ProductInput!) {
        productUpdate(input: $input) {
          product {
            id
            title
            descriptionHtml
            seo {
              title
              description
            }
            tags
          }
          userErrors {
            field
            message
          }
        }
      }
    `;
    
    // Build the update input based on recommendations
    const updateInput = {
      id: `gid://shopify/Product/${optimization.product.shopifyProductId}`,
      title: recommendations.title?.suggested || optimization.product.title,
      descriptionHtml: buildEnhancedDescription(
        optimization.product.description,
        recommendations.description?.keyPoints || []
      ),
      tags: [...(optimization.product.tags || []), ...(recommendations.tags?.add || [])],
      seo: {
        title: recommendations.seo?.metaTitle,
        description: recommendations.seo?.metaDescription
      }
    };
    
    const response = await admin.graphql(mutation, {
      variables: { input: updateInput }
    });
    
    const result = await response.json();
    
    if (result.data?.productUpdate?.userErrors?.length > 0) {
      return json({ 
        error: "Shopify update failed", 
        details: result.data.productUpdate.userErrors 
      }, { status: 400 });
    }
    
    // Mark optimization as applied
    await prisma.optimization.update({
      where: { id: optimizationId },
      data: {
        isApplied: true,
        appliedAt: new Date(),
        appliedMethod: 'AUTO'
      }
    });
    
    // Track event
    await prisma.event.create({
      data: {
        shopId: optimization.product.shopId,
        type: 'OPTIMIZATION_APPLIED_AUTO',
        data: {
          productId: optimization.productId,
          optimizationId: optimization.id
        }
      }
    });
    
    return json({ 
      success: true,
      message: "Optimizations applied successfully to Shopify"
    });
    
  } catch (error) {
    console.error("Apply optimizations error:", error);
    return json({ error: "Failed to apply optimizations" }, { status: 500 });
  }
};

function buildEnhancedDescription(
  currentDescription: string | null, 
  keyPoints: string[]
): string {
  let enhanced = currentDescription || "";
  
  // Add key points as structured content
  if (keyPoints.length > 0) {
    enhanced += "\n\n<h3>Key Features</h3>\n<ul>\n";
    keyPoints.forEach(point => {
      enhanced += `<li>${point}</li>\n`;
    });
    enhanced += "</ul>";
  }
  
  return enhanced;
}
