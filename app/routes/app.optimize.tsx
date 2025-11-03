import type { LoaderFunctionArgs, ActionFunctionArgs } from "react-router";
import { json } from "@remix-run/node";
import { useLoaderData, useFetcher } from "react-router";
import { authenticate } from "~/shopify.server";
import { prisma } from "~/db.server";
import { useState } from "react";
import { GoogleGenerativeAI } from "@google/generative-ai";
import AppHeader from "~/components/AppHeader";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session } = await authenticate.admin(request);

  const shop = await prisma.shop.findFirst({
    where: { shopifyDomain: session.shop },
  });

  if (!shop) {
    return json({ 
      shop: { credits: 0 },
      products: [],
    });
  }

  const products = await prisma.product.findMany({
    where: { shopId: shop.id },
    select: {
      id: true,
      shopifyGid: true,
      title: true,
      description: true,
      tags: true,
      citationRate: true,
      chatgptRate: true,
      geminiRate: true,
      totalScans: true,
    },
    orderBy: { citationRate: "asc" },
  });

  return json({
    shop: {
      shopName: shop.shopName,
      credits: shop.credits,
      maxCredits: shop.maxCredits,
    },
    products,
  });
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const { session, admin } = await authenticate.admin(request);
  const formData = await request.formData();
  const action = formData.get("action") as string;
  const productId = formData.get("productId") as string;

  try {
    const shop = await prisma.shop.findFirst({
      where: { shopifyDomain: session.shop },
    });

    if (!shop) {
      return json({ error: "Shop not found" }, { status: 404 });
    }

    const product = await prisma.product.findUnique({
      where: { id: productId },
    });

    if (!product) {
      return json({ error: "Product not found" }, { status: 404 });
    }

    if (action === "generateSuggestions") {
      if (shop.credits <= 0) {
        return json({ error: "No credits remaining" }, { status: 402 });
      }

      const prompt = `You are an SEO and e-commerce expert. Analyze this product and provide optimization suggestions to improve its visibility in AI recommendations (ChatGPT, Gemini) AND traditional search engines.

Product Title: ${product.title}
Current Description: ${product.description || "No description"}
Current Tags: ${product.tags || "No tags"}
Current AI Citation Rate: ${product.citationRate}%

Provide comprehensive suggestions in JSON format (respond ONLY with valid JSON, no markdown, no explanations):
{
  "title": "Improved title (concise, add key benefits)",
  "description": "SEO-optimized description (300-500 words, include benefits, features, use cases, natural keywords)",
  "tags": ["tag1", "tag2", "tag3", "tag4", "tag5"],
  "faq": [
    {"question": "Question 1?", "answer": "Answer 1"},
    {"question": "Question 2?", "answer": "Answer 2"},
    {"question": "Question 3?", "answer": "Answer 3"}
  ],
  "metaTitle": "SEO meta title (max 60 characters)",
  "metaDescription": "SEO meta description (max 160 characters)",
  "blogPostTitle": "Engaging blog post title about this product",
  "reasoning": "Why these changes will improve both AI visibility and SEO"
}`;

      const model = genAI.getGenerativeModel({ 
        model: "gemini-2.0-flash-exp",
        generationConfig: {
          temperature: 0.7,
          topK: 40,
          topP: 0.95,
          maxOutputTokens: 2048,
        },
      });

      const result = await model.generateContent(prompt);
      const response = result.response;
      const text = response.text();
      
      // Clean response (remove markdown code blocks if present)
      let cleanText = text.trim();
      if (cleanText.startsWith("```json")) {
        cleanText = cleanText.replace(/```json\n?/g, "").replace(/```\n?/g, "");
      } else if (cleanText.startsWith("```")) {
        cleanText = cleanText.replace(/```\n?/g, "");
      }
      
      const suggestions = JSON.parse(cleanText);

      await prisma.shop.update({
        where: { id: shop.id },
        data: { credits: { decrement: 1 } },
      });

      console.log(`✨ Optimization suggestions generated for ${product.title} - 1 credit used`);

      return json({ 
        success: true, 
        suggestions,
        creditsRemaining: shop.credits - 1,
      });
    }

    if (action === "applyOptimizations") {
      const selectedOptimizations = JSON.parse(formData.get("selectedOptimizations") as string);

      if (!product.shopifyGid) {
        return json({ error: "Product not synced with Shopify. Please sync products first." }, { status: 400 });
      }

      let updatedFields: string[] = [];

      // Apply selected optimizations
      const productInput: any = {
        id: product.shopifyGid,
      };

      if (selectedOptimizations.title) {
        productInput.title = selectedOptimizations.title;
        updatedFields.push("title");
      }

      if (selectedOptimizations.description) {
        let descriptionHtml = selectedOptimizations.description;
        
        // Add FAQ to description if selected
        if (selectedOptimizations.faq && selectedOptimizations.faq !== "null") {
          const faqData = typeof selectedOptimizations.faq === 'string' 
            ? JSON.parse(selectedOptimizations.faq) 
            : selectedOptimizations.faq;
          
          descriptionHtml += `
            <hr style="margin: 40px 0; border: none; border-top: 2px solid #e0e0e0;">
            
            <h3 style="font-size: 24px; font-weight: 600; margin-bottom: 24px; color: #202223;">
              ❓ Frequently Asked Questions
            </h3>
            
            ${faqData.map((item: any) => `
              <div style="margin-bottom: 24px; padding: 16px; background: #f9f9f9; border-radius: 8px; border-left: 4px solid #2196f3;">
                <h4 style="font-size: 16px; font-weight: 600; margin: 0 0 8px 0; color: #202223;">
                  ${item.question}
                </h4>
                <p style="font-size: 14px; line-height: 1.6; margin: 0; color: #6d7175;">
                  ${item.answer}
                </p>
              </div>
            `).join('')}
          `;
        }
        
        productInput.descriptionHtml = descriptionHtml;
        updatedFields.push("description with FAQ");
      }

      if (selectedOptimizations.tags) {
        productInput.tags = selectedOptimizations.tags.split(",").map((t: string) => t.trim()).filter((t: string) => t.length > 0);
        updatedFields.push("tags");
      }

      // Add SEO fields (native Shopify fields)
      if (selectedOptimizations.metaTitle || selectedOptimizations.metaDescription) {
        productInput.seo = {};
        
        if (selectedOptimizations.metaTitle) {
          productInput.seo.title = selectedOptimizations.metaTitle;
          updatedFields.push("SEO title");
        }

        if (selectedOptimizations.metaDescription) {
          productInput.seo.description = selectedOptimizations.metaDescription;
          updatedFields.push("SEO description");
        }
      }

      // Update product in Shopify
      if (Object.keys(productInput).length > 1) {
        const mutation = `
          mutation productUpdate($input: ProductInput!) {
            productUpdate(input: $input) {
              product {
                id
                title
                descriptionHtml
                tags
              }
              userErrors {
                field
                message
              }
            }
          }
        `;

        const variables = { input: productInput };
        const response = await admin.graphql(mutation, { variables });
        const data = await response.json();

        if (data.data?.productUpdate?.userErrors?.length > 0) {
          return json({ 
            error: data.data.productUpdate.userErrors[0].message 
          }, { status: 400 });
        }

        // Update in our DB
        await prisma.product.update({
          where: { id: productId },
          data: {
            title: selectedOptimizations.title || product.title,
            description: selectedOptimizations.description || product.description,
            tags: selectedOptimizations.tags || product.tags,
          },
        });
      }

      // Create blog post if selected
      if (selectedOptimizations.blogPost) {
        try {
          console.log(`📝 Generating blog post: ${selectedOptimizations.blogPost}`);

          const blogPrompt = `Write a comprehensive, SEO-optimized blog post:

Product: ${product.title}
Description: ${product.description}
Blog Title: ${selectedOptimizations.blogPost}

Requirements:
- 800-1200 words
- Include product benefits and use cases
- SEO-optimized with natural keyword placement
- Engaging and informative tone
- Include a call-to-action at the end
- HTML formatted with proper paragraphs and headings
- Use <h2> for section titles, <h3> for subsections
- Use <p> tags for paragraphs
- Include <strong> and <em> for emphasis where appropriate

Return ONLY valid JSON (no markdown, no code blocks):
{
  "title": "Blog post title",
  "bodyHtml": "Full HTML content with proper formatting (800-1200 words)",
  "summary": "Brief 2-3 sentence summary for meta description"
}`;

          const blogModel = genAI.getGenerativeModel({ 
            model: "gemini-2.0-flash-exp",
            generationConfig: {
              temperature: 0.8,
              topK: 40,
              topP: 0.95,
              maxOutputTokens: 4096,
            },
          });

          const blogResult = await blogModel.generateContent(blogPrompt);
          const blogResponse = blogResult.response;
          let blogText = blogResponse.text().trim();
          
          // Clean response
          if (blogText.startsWith("```json")) {
            blogText = blogText.replace(/```json\n?/g, "").replace(/```\n?/g, "");
          } else if (blogText.startsWith("```")) {
            blogText = blogText.replace(/```\n?/g, "");
          }
          
          const blogPost = JSON.parse(blogText);

          console.log(`✅ Blog post generated: ${blogPost.title} (${blogPost.bodyHtml.length} chars)`);

          updatedFields.push("blog post generated");
          
          // Save to DB for user to copy
          const savedBlogPost = await prisma.blogPost.create({
            data: {
              id: `blog_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
              shopId: shop.id,
              productId: product.id,
              title: blogPost.title,
              content: blogPost.bodyHtml,
              slug: `blog-${Date.now()}`,
              status: "DRAFT",
              publishedAt: null,
            },
          });

          console.log(`💾 Blog post saved to database: ${savedBlogPost.id}`);
          
          // Return blog post data to frontend
          return json({ 
            success: true, 
            message: `Successfully updated: ${updatedFields.join(", ")}`,
            updatedFields,
            shopDomain: session.shop,
            blogPost: {
              id: savedBlogPost.id,
              title: blogPost.title,
              content: blogPost.bodyHtml,
              summary: blogPost.summary,
            },
          });
        } catch (blogError: any) {
          console.error("❌ Blog post generation error:", blogError);
          updatedFields.push("blog post (generation failed)");
        }
      }

      console.log(`✅ Optimizations applied for ${product.title}: ${updatedFields.join(", ")}`);

      return json({ 
        success: true, 
        message: `Successfully updated: ${updatedFields.join(", ")}`,
        updatedFields,
      });
    }

    return json({ error: "Invalid action" }, { status: 400 });
  } catch (error: any) {
    console.error("Optimize error:", error);
    return json({ error: error.message }, { status: 500 });
  }
};

export default function Optimize() {
  const { shop, products } = useLoaderData<typeof loader>();
  const [selectedProduct, setSelectedProduct] = useState<any>(null);
  const [suggestions, setSuggestions] = useState<any>(null);
  const [selectedOptimizations, setSelectedOptimizations] = useState({
    title: true,
    description: true,
    tags: true,
    faq: true,
    metaTitle: true,
    metaDescription: true,
    blogPost: true,
  });
  const fetcher = useFetcher();

  const handleGenerateSuggestions = (product: any) => {
    setSelectedProduct(product);
    setSuggestions(null);
    setSelectedOptimizations({
      title: true,
      description: true,
      tags: true,
      faq: true,
      metaTitle: true,
      metaDescription: true,
      blogPost: true,
    });
    
    const formData = new FormData();
    formData.append("action", "generateSuggestions");
    formData.append("productId", product.id);
    
    fetcher.submit(formData, { method: "post" });
  };

  if (fetcher.data?.suggestions && !suggestions) {
    setSuggestions(fetcher.data.suggestions);
  }

  const handleApplyOptimizations = () => {
    if (!suggestions) return;

    const optimizationsToApply: any = {};

    if (selectedOptimizations.title) optimizationsToApply.title = suggestions.title;
    if (selectedOptimizations.description) optimizationsToApply.description = suggestions.description;
    if (selectedOptimizations.tags) optimizationsToApply.tags = suggestions.tags.join(", ");
    if (selectedOptimizations.faq) optimizationsToApply.faq = JSON.stringify(suggestions.faq);
    if (selectedOptimizations.metaTitle) optimizationsToApply.metaTitle = suggestions.metaTitle;
    if (selectedOptimizations.metaDescription) optimizationsToApply.metaDescription = suggestions.metaDescription;
    if (selectedOptimizations.blogPost) optimizationsToApply.blogPost = suggestions.blogPostTitle;

    const formData = new FormData();
    formData.append("action", "applyOptimizations");
    formData.append("productId", selectedProduct.id);
    formData.append("selectedOptimizations", JSON.stringify(optimizationsToApply));
    formData.append("shopDomain", shop.shopName); // Pass shop domain for blog link
    
    fetcher.submit(formData, { method: "post" });
  };

  const getScoreColor = (rate: number) => {
    if (rate >= 70) return "#4caf50";
    if (rate >= 40) return "#ff9800";
    return "#f44336";
  };

  const canOptimize = shop && shop.credits > 0;

  return (
    <div style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif', background: "#f6f6f7", minHeight: "100vh" }}>
      <AppHeader />

      {selectedProduct && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(0,0,0,0.5)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
            padding: "24px",
          }}
          onClick={() => {
            setSelectedProduct(null);
            setSuggestions(null);
          }}
        >
          <div
            style={{
              background: "white",
              borderRadius: "12px",
              padding: "32px",
              maxWidth: "900px",
              maxHeight: "90vh",
              overflow: "auto",
              boxShadow: "0 4px 20px rgba(0,0,0,0.2)",
              width: "100%",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px" }}>
              <h2 style={{ fontSize: "24px", fontWeight: "600", margin: 0, color: "#202223" }}>
                ✨ Optimization Suggestions
              </h2>
              <button
                onClick={() => {
                  setSelectedProduct(null);
                  setSuggestions(null);
                }}
                style={{
                  background: "none",
                  border: "none",
                  fontSize: "24px",
                  cursor: "pointer",
                  color: "#6d7175",
                }}
              >
                ×
              </button>
            </div>

            <div style={{ marginBottom: "24px", padding: "16px", background: "#f9f9f9", borderRadius: "8px" }}>
              <h3 style={{ fontSize: "18px", fontWeight: "600", margin: "0 0 8px 0", color: "#202223" }}>
                {selectedProduct.title}
              </h3>
              <div style={{ fontSize: "14px", color: "#6d7175" }}>
                Current Score: <span style={{ fontSize: "20px", fontWeight: "700", color: getScoreColor(selectedProduct.citationRate) }}>
                  {selectedProduct.citationRate}%
                </span>
              </div>
            </div>

            {fetcher.state === "submitting" && fetcher.formData?.get("action") === "generateSuggestions" && !suggestions ? (
              <div style={{ textAlign: "center", padding: "60px 20px" }}>
                <div style={{ fontSize: "48px", marginBottom: "16px" }}>🤖</div>
                <p style={{ fontSize: "16px", color: "#6d7175", margin: 0 }}>
                  Generating AI-powered suggestions with Gemini 2.0 Flash... (1 credit)
                </p>
              </div>
            ) : suggestions ? (
              <div>
                <p style={{ fontSize: "14px", color: "#6d7175", marginBottom: "24px" }}>
                  Select which optimizations to apply (all checked by default):
                </p>

                {/* Title */}
                <div style={{ marginBottom: "16px", padding: "16px", background: "#e8f5e9", borderRadius: "8px", border: "1px solid #4caf50" }}>
                  <label style={{ display: "flex", alignItems: "flex-start", gap: "12px", cursor: "pointer" }}>
                    <input
                      type="checkbox"
                      checked={selectedOptimizations.title}
                      onChange={(e) => setSelectedOptimizations({...selectedOptimizations, title: e.target.checked})}
                      style={{ marginTop: "4px", width: "18px", height: "18px", cursor: "pointer" }}
                    />
                    <div style={{ flex: 1 }}>
                      <h4 style={{ fontSize: "16px", fontWeight: "600", margin: "0 0 8px 0", color: "#202223" }}>
                        📝 AI-Optimized Title
                      </h4>
                      <div style={{ fontSize: "14px", color: "#2e7d32", marginBottom: "8px", fontWeight: "500" }}>
                        {suggestions.title}
                      </div>
                      <div style={{ fontSize: "13px", color: "#6d7175" }}>
                        Original: {selectedProduct.title}
                      </div>
                    </div>
                  </label>
                </div>

                {/* Description */}
                <div style={{ marginBottom: "16px", padding: "16px", background: "#e3f2fd", borderRadius: "8px", border: "1px solid #2196f3" }}>
                  <label style={{ display: "flex", alignItems: "flex-start", gap: "12px", cursor: "pointer" }}>
                    <input
                      type="checkbox"
                      checked={selectedOptimizations.description}
                      onChange={(e) => setSelectedOptimizations({...selectedOptimizations, description: e.target.checked})}
                      style={{ marginTop: "4px", width: "18px", height: "18px", cursor: "pointer" }}
                    />
                    <div style={{ flex: 1 }}>
                      <h4 style={{ fontSize: "16px", fontWeight: "600", margin: "0 0 12px 0", color: "#202223" }}>
                        📄 AI-Optimized Description
                      </h4>
                      <div 
                        style={{ 
                          fontSize: "14px", 
                          color: "#1976d2", 
                          lineHeight: "1.6",
                          maxHeight: "150px",
                          overflow: "auto",
                          padding: "12px",
                          background: "white",
                          borderRadius: "4px",
                        }}
                      >
                        {suggestions.description}
                      </div>
                    </div>
                  </label>
                </div>

                {/* Tags */}
                <div style={{ marginBottom: "16px", padding: "16px", background: "#fff3e0", borderRadius: "8px", border: "1px solid #ff9800" }}>
                  <label style={{ display: "flex", alignItems: "flex-start", gap: "12px", cursor: "pointer" }}>
                    <input
                      type="checkbox"
                      checked={selectedOptimizations.tags}
                      onChange={(e) => setSelectedOptimizations({...selectedOptimizations, tags: e.target.checked})}
                      style={{ marginTop: "4px", width: "18px", height: "18px", cursor: "pointer" }}
                    />
                    <div style={{ flex: 1 }}>
                      <h4 style={{ fontSize: "16px", fontWeight: "600", margin: "0 0 8px 0", color: "#202223" }}>
                        🏷️ Optimized Tags
                      </h4>
                      <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                        {suggestions.tags.map((tag: string, index: number) => (
                          <span 
                            key={index}
                            style={{
                              background: "#ff9800",
                              color: "white",
                              padding: "4px 12px",
                              borderRadius: "12px",
                              fontSize: "13px",
                              fontWeight: "500",
                            }}
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    </div>
                  </label>
                </div>

                {/* FAQ */}
                {suggestions.faq && (
                  <div style={{ marginBottom: "16px", padding: "16px", background: "#f3e5f5", borderRadius: "8px", border: "1px solid #9c27b0" }}>
                    <label style={{ display: "flex", alignItems: "flex-start", gap: "12px", cursor: "pointer" }}>
                      <input
                        type="checkbox"
                        checked={selectedOptimizations.faq}
                        onChange={(e) => setSelectedOptimizations({...selectedOptimizations, faq: e.target.checked})}
                        style={{ marginTop: "4px", width: "18px", height: "18px", cursor: "pointer" }}
                      />
                      <div style={{ flex: 1 }}>
                        <h4 style={{ fontSize: "16px", fontWeight: "600", margin: "0 0 12px 0", color: "#202223" }}>
                          ❓ Product FAQ ({suggestions.faq.length} questions)
                        </h4>
                        {suggestions.faq.map((item: any, index: number) => (
                          <div key={index} style={{ marginBottom: "12px" }}>
                            <div style={{ fontSize: "14px", fontWeight: "600", color: "#7b1fa2", marginBottom: "4px" }}>
                              Q: {item.question}
                            </div>
                            <div style={{ fontSize: "13px", color: "#6d7175", paddingLeft: "12px" }}>
                              A: {item.answer}
                            </div>
                          </div>
                        ))}
                        <div style={{ fontSize: "12px", color: "#7b1fa2", marginTop: "8px" }}>
                          → Will be added at bottom of description
                        </div>
                      </div>
                    </label>
                  </div>
                )}

                {/* Blog Post */}
                {suggestions.blogPostTitle && (
                  <div style={{ marginBottom: "16px", padding: "16px", background: "#e0f2f1", borderRadius: "8px", border: "1px solid #009688" }}>
                    <label style={{ display: "flex", alignItems: "flex-start", gap: "12px", cursor: "pointer" }}>
                      <input
                        type="checkbox"
                        checked={selectedOptimizations.blogPost}
                        onChange={(e) => setSelectedOptimizations({...selectedOptimizations, blogPost: e.target.checked})}
                        style={{ marginTop: "4px", width: "18px", height: "18px", cursor: "pointer" }}
                      />
                      <div style={{ flex: 1 }}>
                        <h4 style={{ fontSize: "16px", fontWeight: "600", margin: "0 0 8px 0", color: "#202223" }}>
                          📝 SEO Blog Post (800-1200 words)
                        </h4>
                        <div style={{ fontSize: "14px", color: "#00796b", fontWeight: "500" }}>
                          {suggestions.blogPostTitle}
                        </div>
                        <div style={{ fontSize: "12px", color: "#00796b", marginTop: "8px" }}>
                          → Will be published on your Shopify blog
                        </div>
                      </div>
                    </label>
                  </div>
                )}

                {/* Meta Title */}
                {suggestions.metaTitle && (
                  <div style={{ marginBottom: "16px", padding: "16px", background: "#fce4ec", borderRadius: "8px", border: "1px solid #e91e63" }}>
                    <label style={{ display: "flex", alignItems: "flex-start", gap: "12px", cursor: "pointer" }}>
                      <input
                        type="checkbox"
                        checked={selectedOptimizations.metaTitle}
                        onChange={(e) => setSelectedOptimizations({...selectedOptimizations, metaTitle: e.target.checked})}
                        style={{ marginTop: "4px", width: "18px", height: "18px", cursor: "pointer" }}
                      />
                      <div style={{ flex: 1 }}>
                        <h4 style={{ fontSize: "16px", fontWeight: "600", margin: "0 0 8px 0", color: "#202223" }}>
                          📊 SEO Meta Title
                        </h4>
                        <div style={{ fontSize: "14px", color: "#c2185b", fontWeight: "500" }}>
                          {suggestions.metaTitle}
                        </div>
                        <div style={{ fontSize: "12px", color: "#6d7175", marginTop: "4px" }}>
                          For Google search results
                        </div>
                      </div>
                    </label>
                  </div>
                )}

                {/* Meta Description */}
                {suggestions.metaDescription && (
                  <div style={{ marginBottom: "16px", padding: "16px", background: "#e8eaf6", borderRadius: "8px", border: "1px solid #3f51b5" }}>
                    <label style={{ display: "flex", alignItems: "flex-start", gap: "12px", cursor: "pointer" }}>
                      <input
                        type="checkbox"
                        checked={selectedOptimizations.metaDescription}
                        onChange={(e) => setSelectedOptimizations({...selectedOptimizations, metaDescription: e.target.checked})}
                        style={{ marginTop: "4px", width: "18px", height: "18px", cursor: "pointer" }}
                      />
                      <div style={{ flex: 1 }}>
                        <h4 style={{ fontSize: "16px", fontWeight: "600", margin: "0 0 8px 0", color: "#202223" }}>
                          📊 SEO Meta Description
                        </h4>
                        <div style={{ fontSize: "14px", color: "#303f9f", lineHeight: "1.6" }}>
                          {suggestions.metaDescription}
                        </div>
                        <div style={{ fontSize: "12px", color: "#6d7175", marginTop: "4px" }}>
                          For Google search results snippet
                        </div>
                      </div>
                    </label>
                  </div>
                )}

                {/* Reasoning */}
                <div style={{ marginBottom: "24px", padding: "16px", background: "#f5f5f5", borderRadius: "8px" }}>
                  <h4 style={{ fontSize: "16px", fontWeight: "600", margin: "0 0 8px 0", color: "#202223" }}>
                    💡 Why These Changes?
                  </h4>
                  <p style={{ fontSize: "14px", color: "#6d7175", margin: 0, lineHeight: "1.6" }}>
                    {suggestions.reasoning}
                  </p>
                </div>

                {/* Action Buttons */}
                <div style={{ display: "flex", gap: "12px", justifyContent: "flex-end" }}>
                  <button
                    onClick={() => {
                      setSelectedProduct(null);
                      setSuggestions(null);
                    }}
                    style={{
                      background: "#e0e0e0",
                      color: "#6d7175",
                      border: "none",
                      padding: "12px 24px",
                      borderRadius: "8px",
                      fontSize: "14px",
                      fontWeight: "600",
                      cursor: "pointer",
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleApplyOptimizations}
                    disabled={fetcher.state !== "idle"}
                    style={{
                      background: fetcher.state === "idle" ? "#4caf50" : "#e0e0e0",
                      color: "white",
                      border: "none",
                      padding: "12px 24px",
                      borderRadius: "8px",
                      fontSize: "14px",
                      fontWeight: "600",
                      cursor: fetcher.state === "idle" ? "pointer" : "not-allowed",
                    }}
                  >
                    {fetcher.state === "submitting" && fetcher.formData?.get("action") === "applyOptimizations" ? "Applying..." : "✅ Apply Selected Changes"}
                  </button>
                </div>

                {fetcher.data?.success && fetcher.data?.message && fetcher.formData?.get("action") === "applyOptimizations" && (
                  <div style={{ marginTop: "16px", padding: "16px", background: "#e8f5e9", borderRadius: "8px", border: "1px solid #4caf50" }}>
                    <p style={{ fontSize: "14px", color: "#2e7d32", margin: 0 }}>
                      ✅ {fetcher.data.message}
                    </p>
                  </div>
                )}

                {fetcher.data?.blogPost && (
                  <div style={{ marginTop: "16px", padding: "16px", background: "#e0f2f1", borderRadius: "8px", border: "1px solid #009688" }}>
                    <h4 style={{ fontSize: "16px", fontWeight: "600", margin: "0 0 12px 0", color: "#202223" }}>
                      📝 Blog Post Generated!
                    </h4>
                    <div style={{ marginBottom: "12px" }}>
                      <div style={{ fontSize: "14px", fontWeight: "600", color: "#00796b", marginBottom: "8px" }}>
                        Title: {fetcher.data.blogPost.title}
                      </div>
                      <div style={{ fontSize: "12px", color: "#6d7175", marginBottom: "8px" }}>
                        {fetcher.data.blogPost.summary}
                      </div>
                    </div>
                    <div style={{ marginBottom: "12px" }}>
                      <label style={{ fontSize: "12px", fontWeight: "600", color: "#202223", display: "block", marginBottom: "4px" }}>
                        Copy this content and paste it into your Shopify blog:
                      </label>
                      <textarea
                        readOnly
                        value={fetcher.data.blogPost.content}
                        style={{
                          width: "100%",
                          height: "200px",
                          padding: "12px",
                          border: "1px solid #ddd",
                          borderRadius: "4px",
                          fontSize: "12px",
                          fontFamily: "monospace",
                          resize: "vertical",
                        }}
                      />
                    </div>
                    <div style={{ display: "flex", gap: "8px" }}>
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(fetcher.data.blogPost.content);
                          shopify.toast.show('✅ Blog post copied to clipboard!');
                        }}
                        style={{
                          background: "#009688",
                          color: "white",
                          border: "none",
                          padding: "8px 16px",
                          borderRadius: "4px",
                          fontSize: "13px",
                          fontWeight: "600",
                          cursor: "pointer",
                        }}
                      >
                        📋 Copy Content
                      </button>
                      <a
                        href={`https://${fetcher.data.shopDomain}/admin/articles/new`}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                          background: "#2196f3",
                          color: "white",
                          border: "none",
                          padding: "8px 16px",
                          borderRadius: "4px",
                          fontSize: "13px",
                          fontWeight: "600",
                          textDecoration: "none",
                          display: "inline-block",
                        }}
                      >
                        🔗 Open Shopify Blog Editor
                      </a>
                    </div>
                    <div style={{ fontSize: "11px", color: "#6d7175", marginTop: "12px" }}>
                      💡 Tip: Copy the content, click "Open Shopify Blog Editor", paste into the body, add the title, and publish!
                    </div>
                  </div>
                )}

                {fetcher.data?.error && (
                  <div style={{ marginTop: "16px", padding: "16px", background: "#ffebee", borderRadius: "8px", border: "1px solid #f44336" }}>
                    <p style={{ fontSize: "14px", color: "#c62828", margin: 0 }}>
                      ❌ {fetcher.data.error}
                    </p>
                  </div>
                )}
              </div>
            ) : null}
          </div>
        </div>
      )}
      
      <div style={{ padding: "0 24px 24px 24px" }}>
        <div style={{ marginBottom: "32px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
            <div>
              <h1 style={{ fontSize: "28px", fontWeight: "600", margin: "0 0 8px 0", color: "#202223" }}>
                ✨ Optimize
              </h1>
              <p style={{ fontSize: "16px", color: "#6d7175", margin: 0 }}>
                AI-powered suggestions to boost your product visibility
              </p>
            </div>
            <div
              style={{
                background: shop && shop.credits > 10 ? "#e8f5e9" : "#ffebee",
                color: shop && shop.credits > 10 ? "#2e7d32" : "#c62828",
                padding: "8px 16px",
                borderRadius: "8px",
                fontSize: "14px",
                fontWeight: "600",
              }}
            >
              💳 {shop?.credits || 0}/{shop?.maxCredits || 25} credits
            </div>
          </div>
        </div>

        <div style={{ background: "#fff3cd", padding: "16px", borderRadius: "8px", marginBottom: "24px", border: "1px solid #ffeaa7" }}>
          <p style={{ fontSize: "14px", color: "#856404", margin: 0 }}>
            <strong>💡 How it works:</strong> Click "Get Suggestions" (1 credit) on any product. Review AI-generated optimizations (all checked by default) and uncheck what you don't want. Click "Apply Selected Changes" to update your Shopify store instantly!
          </p>
        </div>

        {products.length === 0 ? (
          <div style={{ background: "white", borderRadius: "12px", padding: "60px 20px", boxShadow: "0 1px 3px rgba(0,0,0,0.1)", textAlign: "center" }}>
            <p style={{ fontSize: "16px", color: "#9e9e9e", margin: 0 }}>
              No products found. Products will appear here automatically.
            </p>
          </div>
        ) : (
          <div style={{ background: "white", borderRadius: "12px", boxShadow: "0 1px 3px rgba(0,0,0,0.1)", overflow: "hidden" }}>
            <div style={{ display: "flex", flexDirection: "column", gap: "0" }}>
              {products.map((product, index) => (
                <div 
                  key={product.id} 
                  style={{ 
                    padding: "24px",
                    borderBottom: index < products.length - 1 ? "1px solid #f0f0f0" : "none",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    gap: "24px",
                  }}
                >
                  <div style={{ flex: 1 }}>
                    <h3 style={{ fontSize: "18px", fontWeight: "600", margin: "0 0 8px 0", color: "#202223" }}>
                      {product.title}
                    </h3>
                    <div style={{ display: "flex", gap: "12px", fontSize: "13px", marginBottom: "8px" }}>
                      <span style={{ background: "#e3f2fd", color: "#1976d2", padding: "2px 8px", borderRadius: "4px", fontWeight: "500" }}>
                        ChatGPT: {product.chatgptRate}%
                      </span>
                      <span style={{ background: "#e8f5e9", color: "#388e3c", padding: "2px 8px", borderRadius: "4px", fontWeight: "500" }}>
                        Gemini: {product.geminiRate}%
                      </span>
                      <span style={{ color: "#6d7175" }}>
                        {product.totalScans} scans
                      </span>
                    </div>
                    {product.citationRate < 40 && (
                      <div style={{ fontSize: "13px", color: "#f44336", fontWeight: "500" }}>
                        ⚠️ Low visibility - Optimization recommended
                      </div>
                    )}
                  </div>

                  <div style={{ textAlign: "right", display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "12px" }}>
                    <div>
                      <div style={{ fontSize: "32px", fontWeight: "700", color: getScoreColor(product.citationRate) }}>
                        {product.citationRate}%
                      </div>
                      <div style={{ fontSize: "11px", color: "#6d7175" }}>Citation Rate</div>
                    </div>
                    <button
                      onClick={() => handleGenerateSuggestions(product)}
                      disabled={!canOptimize || fetcher.state !== "idle"}
                      style={{
                        background: canOptimize && fetcher.state === "idle" ? "#2196f3" : "#e0e0e0",
                        color: "white",
                        border: "none",
                        padding: "10px 20px",
                        borderRadius: "8px",
                        fontSize: "14px",
                        fontWeight: "600",
                        cursor: canOptimize && fetcher.state === "idle" ? "pointer" : "not-allowed",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {fetcher.state === "submitting" && fetcher.formData?.get("action") === "generateSuggestions" ? "⏳ Generating..." : "✨ Get Suggestions (1 💳)"}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}