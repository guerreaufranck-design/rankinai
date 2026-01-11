import { useState } from "react";

export default function Tutorial() {
  const [activeSection, setActiveSection] = useState("intro");

  const sections = [
    { id: "intro", label: "Introduction", icon: "👋" },
    { id: "how-it-works", label: "How It Works", icon: "⚙️" },
    { id: "products", label: "Products", icon: "📦" },
    { id: "scanning", label: "AI Scanning", icon: "🔍" },
    { id: "optimization", label: "Optimization", icon: "✨" },
    { id: "analytics", label: "Analytics", icon: "📊" },
    { id: "credits", label: "Credits & Plans", icon: "💳" },
    { id: "faq", label: "FAQ", icon: "❓" },
  ];

  return (
    <div style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif', background: "#f8fafc", minHeight: "100vh" }}>
      {/* Header */}
      <header style={{ background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)", color: "white", padding: "60px 20px", textAlign: "center" }}>
        <div style={{ maxWidth: "800px", margin: "0 auto" }}>
          <div style={{ fontSize: "60px", marginBottom: "20px" }}>🤖</div>
          <h1 style={{ fontSize: "42px", fontWeight: "800", margin: "0 0 16px", letterSpacing: "-1px" }}>RankInAI Tutorial</h1>
          <p style={{ fontSize: "20px", opacity: 0.9, margin: 0, lineHeight: 1.6 }}>
            Learn how to optimize your Shopify products for AI-powered search engines like ChatGPT and Gemini
          </p>
        </div>
      </header>

      <div style={{ display: "flex", maxWidth: "1200px", margin: "0 auto", padding: "40px 20px", gap: "40px" }}>
        {/* Sidebar Navigation */}
        <nav style={{ width: "250px", flexShrink: 0, position: "sticky", top: "20px", alignSelf: "flex-start" }}>
          <div style={{ background: "white", borderRadius: "16px", padding: "20px", boxShadow: "0 4px 20px rgba(0,0,0,0.08)" }}>
            <h3 style={{ margin: "0 0 16px", fontSize: "14px", fontWeight: "600", color: "#64748b", textTransform: "uppercase", letterSpacing: "0.5px" }}>Contents</h3>
            {sections.map((section) => (
              <button
                key={section.id}
                onClick={() => setActiveSection(section.id)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "10px",
                  width: "100%",
                  padding: "12px 14px",
                  border: "none",
                  borderRadius: "10px",
                  background: activeSection === section.id ? "linear-gradient(135deg, #667eea 0%, #764ba2 100%)" : "transparent",
                  color: activeSection === section.id ? "white" : "#475569",
                  fontSize: "14px",
                  fontWeight: activeSection === section.id ? "600" : "500",
                  cursor: "pointer",
                  marginBottom: "4px",
                  textAlign: "left",
                  transition: "all 0.2s ease",
                }}
              >
                <span style={{ fontSize: "18px" }}>{section.icon}</span>
                {section.label}
              </button>
            ))}
          </div>

          {/* CTA */}
          <div style={{ background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)", borderRadius: "16px", padding: "24px", marginTop: "20px", color: "white", textAlign: "center" }}>
            <p style={{ margin: "0 0 16px", fontSize: "15px", fontWeight: "500" }}>Ready to boost your AI visibility?</p>
            
              href="https://apps.shopify.com/rankinai-ai-seo-9x7k"
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: "inline-block",
                background: "white",
                color: "#667eea",
                padding: "12px 24px",
                borderRadius: "10px",
                fontWeight: "600",
                fontSize: "14px",
                textDecoration: "none",
              }}
            >
              Install RankInAI →
            </a>
          </div>
        </nav>

        {/* Main Content */}
        <main style={{ flex: 1, minWidth: 0 }}>
          {activeSection === "intro" && <IntroSection />}
          {activeSection === "how-it-works" && <HowItWorksSection />}
          {activeSection === "products" && <ProductsSection />}
          {activeSection === "scanning" && <ScanningSection />}
          {activeSection === "optimization" && <OptimizationSection />}
          {activeSection === "analytics" && <AnalyticsSection />}
          {activeSection === "credits" && <CreditsSection />}
          {activeSection === "faq" && <FAQSection />}
        </main>
      </div>

      {/* Footer */}
      <footer style={{ background: "#1e293b", color: "white", padding: "40px 20px", textAlign: "center", marginTop: "60px" }}>
        <p style={{ margin: 0, opacity: 0.7 }}>© 2026 RankInAI. All rights reserved.</p>
      </footer>
    </div>
  );
}

function ContentCard({ children, title, icon }: { children: React.ReactNode; title?: string; icon?: string }) {
  return (
    <div style={{ background: "white", borderRadius: "16px", padding: "32px", marginBottom: "24px", boxShadow: "0 4px 20px rgba(0,0,0,0.08)" }}>
      {title && (
        <h2 style={{ display: "flex", alignItems: "center", gap: "12px", fontSize: "24px", fontWeight: "700", margin: "0 0 20px", color: "#0f172a" }}>
          {icon && <span style={{ fontSize: "28px" }}>{icon}</span>}
          {title}
        </h2>
      )}
      {children}
    </div>
  );
}

function StepCard({ number, title, description, icon }: { number: number; title: string; description: string; icon: string }) {
  return (
    <div style={{ display: "flex", gap: "20px", padding: "24px", background: "#f8fafc", borderRadius: "12px", marginBottom: "16px" }}>
      <div style={{ width: "50px", height: "50px", borderRadius: "12px", background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "24px", flexShrink: 0 }}>
        {icon}
      </div>
      <div>
        <div style={{ fontSize: "12px", fontWeight: "600", color: "#667eea", marginBottom: "4px" }}>STEP {number}</div>
        <h3 style={{ margin: "0 0 8px", fontSize: "18px", fontWeight: "600", color: "#0f172a" }}>{title}</h3>
        <p style={{ margin: 0, color: "#64748b", lineHeight: 1.6 }}>{description}</p>
      </div>
    </div>
  );
}

function FeatureBox({ icon, title, description }: { icon: string; title: string; description: string }) {
  return (
    <div style={{ background: "#f8fafc", borderRadius: "12px", padding: "24px", textAlign: "center" }}>
      <div style={{ fontSize: "36px", marginBottom: "12px" }}>{icon}</div>
      <h3 style={{ margin: "0 0 8px", fontSize: "16px", fontWeight: "600", color: "#0f172a" }}>{title}</h3>
      <p style={{ margin: 0, fontSize: "14px", color: "#64748b", lineHeight: 1.5 }}>{description}</p>
    </div>
  );
}

function IntroSection() {
  return (
    <>
      <ContentCard title="What is RankInAI?" icon="👋">
        <p style={{ fontSize: "17px", color: "#475569", lineHeight: 1.8, margin: "0 0 20px" }}>
          <strong>RankInAI</strong> is a Shopify app that helps your products get recommended by AI assistants like <strong>ChatGPT</strong> and <strong>Google Gemini</strong>.
        </p>
        <p style={{ fontSize: "17px", color: "#475569", lineHeight: 1.8, margin: "0 0 20px" }}>
          When customers ask AI assistants "What's the best laptop for video editing?" or "Recommend a yoga mat", the AI pulls from its training data and web knowledge. <strong>RankInAI ensures your products are part of that conversation.</strong>
        </p>
        <div style={{ background: "linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)", borderRadius: "12px", padding: "20px", marginTop: "24px" }}>
          <p style={{ margin: 0, fontSize: "15px", color: "#92400e" }}>
            <strong>💡 Did you know?</strong> Over 100 million people use ChatGPT weekly. If your products aren't optimized for AI, you're missing a massive discovery channel.
          </p>
        </div>
      </ContentCard>

      <ContentCard title="Why AI Optimization Matters" icon="🎯">
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "16px" }}>
          <FeatureBox icon="🔍" title="New Discovery Channel" description="AI assistants are becoming the new search engines for product discovery" />
          <FeatureBox icon="📈" title="Higher Trust" description="AI recommendations feel more personalized and trustworthy to consumers" />
          <FeatureBox icon="🏆" title="Competitive Edge" description="Most merchants aren't optimizing for AI yet - be first!" />
          <FeatureBox icon="💰" title="More Sales" description="Products cited by AI get direct traffic and higher conversion" />
        </div>
      </ContentCard>
    </>
  );
}

function HowItWorksSection() {
  return (
    <>
      <ContentCard title="How RankInAI Works" icon="⚙️">
        <p style={{ fontSize: "17px", color: "#475569", lineHeight: 1.8, margin: "0 0 24px" }}>
          RankInAI uses a simple 3-step process to improve your products' visibility in AI responses:
        </p>

        <StepCard
          number={1}
          icon="📦"
          title="Import Your Products"
          description="We automatically sync your Shopify products including titles, descriptions, tags, and images. No manual data entry required."
        />

        <StepCard
          number={2}
          icon="🔍"
          title="Scan with AI"
          description="We query ChatGPT and Gemini with real customer questions about your product category. We analyze if and how your products are mentioned, tracking citation rate and positioning."
        />

        <StepCard
          number={3}
          icon="✨"
          title="Optimize & Improve"
          description="Based on scan results, our AI generates optimized titles, descriptions, and tags. Apply them with one click to boost your citation rate."
        />
      </ContentCard>

      <ContentCard title="The AI Citation Cycle" icon="🔄">
        <div style={{ background: "#f8fafc", borderRadius: "12px", padding: "24px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "20px" }}>
            {["Scan Products", "Analyze Results", "Generate Suggestions", "Apply Optimizations", "Re-scan to Verify"].map((step, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                <div style={{ width: "36px", height: "36px", borderRadius: "50%", background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)", color: "white", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: "600", fontSize: "14px" }}>
                  {i + 1}
                </div>
                <span style={{ fontSize: "14px", fontWeight: "500", color: "#374151" }}>{step}</span>
                {i < 4 && <span style={{ color: "#94a3b8", marginLeft: "8px" }}>→</span>}
              </div>
            ))}
          </div>
        </div>
      </ContentCard>
    </>
  );
}

function ProductsSection() {
  return (
    <>
      <ContentCard title="Managing Products" icon="📦">
        <p style={{ fontSize: "17px", color: "#475569", lineHeight: 1.8, margin: "0 0 24px" }}>
          The Products page is your command center for managing which products to optimize for AI visibility.
        </p>

        <h3 style={{ fontSize: "18px", fontWeight: "600", color: "#0f172a", margin: "24px 0 16px" }}>Product List View</h3>
        <p style={{ fontSize: "15px", color: "#475569", lineHeight: 1.7, margin: "0 0 16px" }}>
          Each product shows key metrics at a glance:
        </p>
        <ul style={{ margin: "0 0 24px", paddingLeft: "24px", color: "#475569", lineHeight: 2 }}>
          <li><strong>Citation Rate</strong> - Percentage of AI queries that mention your product (0-100%)</li>
          <li><strong>ChatGPT Rate</strong> - Specific citation rate on ChatGPT</li>
          <li><strong>Gemini Rate</strong> - Specific citation rate on Google Gemini</li>
          <li><strong>Total Scans</strong> - How many times the product has been scanned</li>
          <li><strong>Last Scan</strong> - When the product was last analyzed</li>
        </ul>

        <h3 style={{ fontSize: "18px", fontWeight: "600", color: "#0f172a", margin: "24px 0 16px" }}>Product Actions</h3>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))", gap: "16px" }}>
          <div style={{ background: "#ecfdf5", borderRadius: "12px", padding: "20px" }}>
            <div style={{ fontSize: "24px", marginBottom: "8px" }}>🔍</div>
            <h4 style={{ margin: "0 0 8px", color: "#065f46" }}>Scan Product</h4>
            <p style={{ margin: 0, fontSize: "14px", color: "#047857" }}>Query AI assistants to check if your product is being recommended</p>
          </div>
          <div style={{ background: "#fef3c7", borderRadius: "12px", padding: "20px" }}>
            <div style={{ fontSize: "24px", marginBottom: "8px" }}>✨</div>
            <h4 style={{ margin: "0 0 8px", color: "#92400e" }}>Optimize</h4>
            <p style={{ margin: 0, fontSize: "14px", color: "#b45309" }}>Generate AI-optimized titles, descriptions, and tags</p>
          </div>
          <div style={{ background: "#ede9fe", borderRadius: "12px", padding: "20px" }}>
            <div style={{ fontSize: "24px", marginBottom: "8px" }}>📊</div>
            <h4 style={{ margin: "0 0 8px", color: "#5b21b6" }}>View Details</h4>
            <p style={{ margin: 0, fontSize: "14px", color: "#6d28d9" }}>See full scan history, competitor analysis, and recommendations</p>
          </div>
        </div>
      </ContentCard>

      <ContentCard title="Understanding Citation Rate" icon="📈">
        <p style={{ fontSize: "17px", color: "#475569", lineHeight: 1.8, margin: "0 0 20px" }}>
          The <strong>Citation Rate</strong> is the most important metric in RankInAI. It measures how often AI assistants mention your product when asked relevant questions.
        </p>
        
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "16px", marginTop: "24px" }}>
          <div style={{ textAlign: "center", padding: "20px", background: "#fef2f2", borderRadius: "12px" }}>
            <div style={{ fontSize: "32px", fontWeight: "700", color: "#dc2626" }}>0-30%</div>
            <div style={{ fontSize: "14px", color: "#b91c1c", marginTop: "8px" }}>Needs Work</div>
            <p style={{ fontSize: "13px", color: "#991b1b", margin: "8px 0 0" }}>Product rarely mentioned by AI</p>
          </div>
          <div style={{ textAlign: "center", padding: "20px", background: "#fef9c3", borderRadius: "12px" }}>
            <div style={{ fontSize: "32px", fontWeight: "700", color: "#ca8a04" }}>30-70%</div>
            <div style={{ fontSize: "14px", color: "#a16207", marginTop: "8px" }}>Good</div>
            <p style={{ fontSize: "13px", color: "#854d0e", margin: "8px 0 0" }}>Product mentioned sometimes</p>
          </div>
          <div style={{ textAlign: "center", padding: "20px", background: "#dcfce7", borderRadius: "12px" }}>
            <div style={{ fontSize: "32px", fontWeight: "700", color: "#16a34a" }}>70-100%</div>
            <div style={{ fontSize: "14px", color: "#15803d", marginTop: "8px" }}>Excellent</div>
            <p style={{ fontSize: "13px", color: "#166534", margin: "8px 0 0" }}>Product frequently recommended</p>
          </div>
        </div>
      </ContentCard>
    </>
  );
}

function ScanningSection() {
  return (
    <>
      <ContentCard title="AI Scanning Explained" icon="🔍">
        <p style={{ fontSize: "17px", color: "#475569", lineHeight: 1.8, margin: "0 0 24px" }}>
          Scanning is how RankInAI checks if your products are being recommended by AI assistants. Here's what happens when you scan:
        </p>

        <div style={{ background: "#f8fafc", borderRadius: "12px", padding: "24px", marginBottom: "24px" }}>
          <h3 style={{ margin: "0 0 16px", fontSize: "16px", fontWeight: "600", color: "#374151" }}>The Scanning Process</h3>
          <ol style={{ margin: 0, paddingLeft: "24px", color: "#475569", lineHeight: 2 }}>
            <li>RankInAI crafts a natural question like "What's the best [product category]?"</li>
            <li>We send this question to ChatGPT (GPT-4o-mini) and Google Gemini</li>
            <li>We analyze the AI responses to check if your product/brand is mentioned</li>
            <li>We record detailed metrics: citation position, competitors mentioned, sentiment</li>
            <li>Results are saved to track your progress over time</li>
          </ol>
        </div>

        <h3 style={{ fontSize: "18px", fontWeight: "600", color: "#0f172a", margin: "24px 0 16px" }}>What We Analyze</h3>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "16px" }}>
          <div style={{ background: "#f0f9ff", borderRadius: "10px", padding: "16px" }}>
            <strong style={{ color: "#0369a1" }}>🎯 Citation Detection</strong>
            <p style={{ margin: "8px 0 0", fontSize: "14px", color: "#0c4a6e" }}>Is your product/brand mentioned in the response?</p>
          </div>
          <div style={{ background: "#f0fdf4", borderRadius: "10px", padding: "16px" }}>
            <strong style={{ color: "#15803d" }}>📍 Position Tracking</strong>
            <p style={{ margin: "8px 0 0", fontSize: "14px", color: "#166534" }}>Where in the response are you mentioned? (1st, 2nd, etc.)</p>
          </div>
          <div style={{ background: "#fef3c7", borderRadius: "10px", padding: "16px" }}>
            <strong style={{ color: "#b45309" }}>🏆 Competitor Analysis</strong>
            <p style={{ margin: "8px 0 0", fontSize: "14px", color: "#92400e" }}>Which competitors are mentioned alongside you?</p>
          </div>
          <div style={{ background: "#fae8ff", borderRadius: "10px", padding: "16px" }}>
            <strong style={{ color: "#a21caf" }}>💭 Sentiment Score</strong>
            <p style={{ margin: "8px 0 0", fontSize: "14px", color: "#86198f" }}>Is the AI's mention positive, neutral, or negative?</p>
          </div>
        </div>
      </ContentCard>

      <ContentCard title="Supported AI Platforms" icon="🤖">
        <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "24px" }}>
          <div style={{ background: "#f8fafc", borderRadius: "12px", padding: "24px", textAlign: "center" }}>
            <div style={{ fontSize: "48px", marginBottom: "12px" }}>💬</div>
            <h3 style={{ margin: "0 0 8px", fontSize: "20px", fontWeight: "600" }}>ChatGPT</h3>
            <p style={{ margin: 0, color: "#64748b", fontSize: "14px" }}>OpenAI's GPT-4o-mini model</p>
            <div style={{ marginTop: "16px", padding: "8px 16px", background: "#dcfce7", borderRadius: "20px", display: "inline-block" }}>
              <span style={{ color: "#16a34a", fontSize: "13px", fontWeight: "500" }}>✓ Active</span>
            </div>
          </div>
          <div style={{ background: "#f8fafc", borderRadius: "12px", padding: "24px", textAlign: "center" }}>
            <div style={{ fontSize: "48px", marginBottom: "12px" }}>✨</div>
            <h3 style={{ margin: "0 0 8px", fontSize: "20px", fontWeight: "600" }}>Google Gemini</h3>
            <p style={{ margin: 0, color: "#64748b", fontSize: "14px" }}>Google's Gemini 2.0 Flash model</p>
            <div style={{ marginTop: "16px", padding: "8px 16px", background: "#dcfce7", borderRadius: "20px", display: "inline-block" }}>
              <span style={{ color: "#16a34a", fontSize: "13px", fontWeight: "500" }}>✓ Active</span>
            </div>
          </div>
        </div>
      </ContentCard>

      <ContentCard title="Credit Cost" icon="💳">
        <div style={{ background: "#eff6ff", borderRadius: "12px", padding: "20px" }}>
          <p style={{ margin: 0, fontSize: "16px", color: "#1e40af" }}>
            <strong>Each scan costs 1 credit.</strong> A single scan queries both ChatGPT and Gemini, giving you results from both platforms.
          </p>
        </div>
      </ContentCard>
    </>
  );
}

function OptimizationSection() {
  return (
    <>
      <ContentCard title="AI-Powered Optimization" icon="✨">
        <p style={{ fontSize: "17px", color: "#475569", lineHeight: 1.8, margin: "0 0 24px" }}>
          The Optimize feature uses Google Gemini to analyze your product and generate improvements that make it more likely to be cited by AI assistants.
        </p>

        <h3 style={{ fontSize: "18px", fontWeight: "600", color: "#0f172a", margin: "0 0 16px" }}>What Gets Optimized</h3>
        
        <div style={{ display: "grid", gap: "16px", marginBottom: "24px" }}>
          <div style={{ display: "flex", gap: "16px", padding: "20px", background: "#f8fafc", borderRadius: "12px" }}>
            <div style={{ fontSize: "32px" }}>📝</div>
            <div>
              <h4 style={{ margin: "0 0 8px", color: "#0f172a" }}>Product Title</h4>
              <p style={{ margin: 0, fontSize: "14px", color: "#64748b" }}>We suggest titles that include searchable keywords while remaining natural and compelling. AI assistants prefer descriptive, specific titles.</p>
            </div>
          </div>
          
          <div style={{ display: "flex", gap: "16px", padding: "20px", background: "#f8fafc", borderRadius: "12px" }}>
            <div style={{ fontSize: "32px" }}>📄</div>
            <div>
              <h4 style={{ margin: "0 0 8px", color: "#0f172a" }}>Product Description</h4>
              <p style={{ margin: 0, fontSize: "14px", color: "#64748b" }}>Optimized descriptions highlight key features, use cases, and benefits. We structure content to be easily parsed by AI models.</p>
            </div>
          </div>
          
          <div style={{ display: "flex", gap: "16px", padding: "20px", background: "#f8fafc", borderRadius: "12px" }}>
            <div style={{ fontSize: "32px" }}>🏷️</div>
            <div>
              <h4 style={{ margin: "0 0 8px", color: "#0f172a" }}>Product Tags</h4>
              <p style={{ margin: 0, fontSize: "14px", color: "#64748b" }}>We generate relevant tags that help AI understand your product category, use cases, and target audience.</p>
            </div>
          </div>
          
          <div style={{ display: "flex", gap: "16px", padding: "20px", background: "#f8fafc", borderRadius: "12px" }}>
            <div style={{ fontSize: "32px" }}>❓</div>
            <div>
              <h4 style={{ margin: "0 0 8px", color: "#0f172a" }}>FAQ Generation</h4>
              <p style={{ margin: 0, fontSize: "14px", color: "#64748b" }}>We create relevant Q&A pairs that address common customer questions, which AI assistants often use as reference material.</p>
            </div>
          </div>
        </div>

        <h3 style={{ fontSize: "18px", fontWeight: "600", color: "#0f172a", margin: "24px 0 16px" }}>How to Apply Optimizations</h3>
        <ol style={{ margin: 0, paddingLeft: "24px", color: "#475569", lineHeight: 2 }}>
          <li>Go to the <strong>Optimize</strong> page or click "Optimize" on any product</li>
          <li>Select a product from the dropdown</li>
          <li>Click <strong>"Generate Suggestions"</strong> (costs 1 credit)</li>
          <li>Review the AI-generated improvements</li>
          <li>Click <strong>"Apply to Shopify"</strong> to update your product</li>
          <li>Re-scan the product to verify improved citation rate</li>
        </ol>
      </ContentCard>

      <ContentCard title="Best Practices" icon="💡">
        <div style={{ display: "grid", gap: "12px" }}>
          {[
            { tip: "Always review suggestions before applying - AI isn't perfect!", icon: "👀" },
            { tip: "Focus on low citation rate products first for maximum impact", icon: "🎯" },
            { tip: "Re-scan after optimization to measure improvement", icon: "🔄" },
            { tip: "Keep your brand voice - edit suggestions to match your style", icon: "✍️" },
            { tip: "Update regularly - AI models evolve and so should your content", icon: "📅" },
          ].map((item, i) => (
            <div key={i} style={{ display: "flex", gap: "12px", alignItems: "center", padding: "16px", background: "#f8fafc", borderRadius: "10px" }}>
              <span style={{ fontSize: "24px" }}>{item.icon}</span>
              <span style={{ color: "#374151", fontSize: "15px" }}>{item.tip}</span>
            </div>
          ))}
        </div>
      </ContentCard>
    </>
  );
}

function AnalyticsSection() {
  return (
    <>
      <ContentCard title="Analytics Dashboard" icon="📊">
        <p style={{ fontSize: "17px", color: "#475569", lineHeight: 1.8, margin: "0 0 24px" }}>
          The Analytics page gives you a complete view of your AI visibility performance across all products.
        </p>

        <h3 style={{ fontSize: "18px", fontWeight: "600", color: "#0f172a", margin: "0 0 16px" }}>Key Metrics</h3>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "16px", marginBottom: "24px" }}>
          <div style={{ background: "#f0f9ff", borderRadius: "12px", padding: "20px", textAlign: "center" }}>
            <div style={{ fontSize: "28px", fontWeight: "700", color: "#0369a1" }}>Avg. Citation</div>
            <p style={{ margin: "8px 0 0", fontSize: "14px", color: "#0c4a6e" }}>Average citation rate across all products</p>
          </div>
          <div style={{ background: "#f0fdf4", borderRadius: "12px", padding: "20px", textAlign: "center" }}>
            <div style={{ fontSize: "28px", fontWeight: "700", color: "#16a34a" }}>Total Scans</div>
            <p style={{ margin: "8px 0 0", fontSize: "14px", color: "#166534" }}>Number of AI queries performed</p>
          </div>
          <div style={{ background: "#fef3c7", borderRadius: "12px", padding: "20px", textAlign: "center" }}>
            <div style={{ fontSize: "28px", fontWeight: "700", color: "#ca8a04" }}>Optimizations</div>
            <p style={{ margin: "8px 0 0", fontSize: "14px", color: "#854d0e" }}>Products optimized this month</p>
          </div>
        </div>

        <h3 style={{ fontSize: "18px", fontWeight: "600", color: "#0f172a", margin: "24px 0 16px" }}>What You Can Track</h3>
        <ul style={{ margin: 0, paddingLeft: "24px", color: "#475569", lineHeight: 2 }}>
          <li><strong>Scan History</strong> - Complete log of all AI queries with results</li>
          <li><strong>Platform Comparison</strong> - ChatGPT vs Gemini performance</li>
          <li><strong>Competitor Mentions</strong> - See who else is being recommended</li>
          <li><strong>Optimization History</strong> - Track which products were optimized and when</li>
          <li><strong>Trend Analysis</strong> - See how your citation rate changes over time</li>
        </ul>
      </ContentCard>
    </>
  );
}

function CreditsSection() {
  return (
    <>
      <ContentCard title="Credits System" icon="💳">
        <p style={{ fontSize: "17px", color: "#475569", lineHeight: 1.8, margin: "0 0 24px" }}>
          RankInAI uses a credit-based system. Credits are consumed when you perform actions that use AI.
        </p>

        <h3 style={{ fontSize: "18px", fontWeight: "600", color: "#0f172a", margin: "0 0 16px" }}>Credit Costs</h3>
        <div style={{ display: "grid", gap: "12px", marginBottom: "24px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "16px 20px", background: "#f8fafc", borderRadius: "10px" }}>
            <span style={{ color: "#374151" }}>🔍 Scan a product (ChatGPT + Gemini)</span>
            <strong style={{ color: "#667eea" }}>1 credit</strong>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "16px 20px", background: "#f8fafc", borderRadius: "10px" }}>
            <span style={{ color: "#374151" }}>✨ Generate optimization suggestions</span>
            <strong style={{ color: "#667eea" }}>1 credit</strong>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "16px 20px", background: "#f8fafc", borderRadius: "10px" }}>
            <span style={{ color: "#374151" }}>📝 Generate blog post for product</span>
            <strong style={{ color: "#667eea" }}>2 credits</strong>
          </div>
        </div>
      </ContentCard>

      <ContentCard title="Pricing Plans" icon="💎">
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "20px" }}>
          <div style={{ border: "2px solid #e2e8f0", borderRadius: "16px", padding: "24px", textAlign: "center" }}>
            <h3 style={{ margin: "0 0 8px", fontSize: "20px", fontWeight: "600" }}>Lite</h3>
            <div style={{ fontSize: "36px", fontWeight: "700", color: "#667eea" }}>$14.90<span style={{ fontSize: "16px", fontWeight: "400", color: "#64748b" }}>/mo</span></div>
            <div style={{ margin: "16px 0", padding: "12px", background: "#f8fafc", borderRadius: "8px" }}>
              <strong>30 credits</strong>/month
            </div>
            <p style={{ margin: 0, fontSize: "14px", color: "#64748b" }}>Perfect for small stores getting started</p>
          </div>
          
          <div style={{ border: "2px solid #667eea", borderRadius: "16px", padding: "24px", textAlign: "center", position: "relative" }}>
            <div style={{ position: "absolute", top: "-12px", left: "50%", transform: "translateX(-50%)", background: "#667eea", color: "white", padding: "4px 16px", borderRadius: "20px", fontSize: "12px", fontWeight: "600" }}>POPULAR</div>
            <h3 style={{ margin: "0 0 8px", fontSize: "20px", fontWeight: "600" }}>Starter</h3>
            <div style={{ fontSize: "36px", fontWeight: "700", color: "#667eea" }}>$29.90<span style={{ fontSize: "16px", fontWeight: "400", color: "#64748b" }}>/mo</span></div>
            <div style={{ margin: "16px 0", padding: "12px", background: "#eff6ff", borderRadius: "8px" }}>
              <strong>100 credits</strong>/month
            </div>
            <p style={{ margin: 0, fontSize: "14px", color: "#64748b" }}>Best for growing businesses</p>
          </div>
          
          <div style={{ border: "2px solid #e2e8f0", borderRadius: "16px", padding: "24px", textAlign: "center" }}>
            <h3 style={{ margin: "0 0 8px", fontSize: "20px", fontWeight: "600" }}>Growth</h3>
            <div style={{ fontSize: "36px", fontWeight: "700", color: "#667eea" }}>$49.90<span style={{ fontSize: "16px", fontWeight: "400", color: "#64748b" }}>/mo</span></div>
            <div style={{ margin: "16px 0", padding: "12px", background: "#f8fafc", borderRadius: "8px" }}>
              <strong>300 credits</strong>/month
            </div>
            <p style={{ margin: 0, fontSize: "14px", color: "#64748b" }}>For stores with large catalogs</p>
          </div>
          
          <div style={{ border: "2px solid #e2e8f0", borderRadius: "16px", padding: "24px", textAlign: "center" }}>
            <h3 style={{ margin: "0 0 8px", fontSize: "20px", fontWeight: "600" }}>Pro</h3>
            <div style={{ fontSize: "36px", fontWeight: "700", color: "#667eea" }}>$99.90<span style={{ fontSize: "16px", fontWeight: "400", color: "#64748b" }}>/mo</span></div>
            <div style={{ margin: "16px 0", padding: "12px", background: "#f8fafc", borderRadius: "8px" }}>
              <strong>1000 credits</strong>/month
            </div>
            <p style={{ margin: 0, fontSize: "14px", color: "#64748b" }}>Maximum power for large operations</p>
          </div>
        </div>
      </ContentCard>
    </>
  );
}

function FAQSection() {
  const faqs = [
    {
      q: "How long does it take to see results?",
      a: "Most users see improved citation rates within 1-2 weeks of applying optimizations. AI models don't update instantly, but optimized content typically performs better in subsequent scans."
    },
    {
      q: "Will this affect my Google SEO?",
      a: "Yes, positively! The optimizations we suggest (better titles, descriptions, structured content) are also beneficial for traditional SEO. It's a win-win."
    },
    {
      q: "How often should I scan my products?",
      a: "We recommend scanning each product at least once a month to track changes. After applying optimizations, wait 1-2 weeks before re-scanning to see improvements."
    },
    {
      q: "Do unused credits roll over?",
      a: "Credits reset each billing cycle and don't roll over. Use them to continuously monitor and improve your products' AI visibility."
    },
    {
      q: "Can I optimize products in bulk?",
      a: "Currently, optimizations are done one product at a time to ensure quality. We're working on bulk features for future updates."
    },
    {
      q: "Which AI platforms do you support?",
      a: "We currently scan ChatGPT (GPT-4o-mini) and Google Gemini (2.0 Flash). We're planning to add more platforms including Perplexity and Claude."
    },
    {
      q: "Is my product data secure?",
      a: "Yes! We only read your product titles and descriptions. We never modify your Shopify store without your explicit approval when you click 'Apply'."
    },
    {
      q: "What if my products aren't being cited?",
      a: "Don't worry - that's exactly what RankInAI helps with! Use our optimization suggestions to improve your content. Focus on detailed descriptions, relevant keywords, and clear use cases."
    },
  ];

  const [openIndex, setOpenIndex] = useState<number | null>(null);

  return (
    <ContentCard title="Frequently Asked Questions" icon="❓">
      <div style={{ display: "grid", gap: "12px" }}>
        {faqs.map((faq, i) => (
          <div key={i} style={{ background: "#f8fafc", borderRadius: "12px", overflow: "hidden" }}>
            <button
              onClick={() => setOpenIndex(openIndex === i ? null : i)}
              style={{
                width: "100%",
                padding: "20px",
                border: "none",
                background: "none",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                cursor: "pointer",
                textAlign: "left",
              }}
            >
              <span style={{ fontSize: "16px", fontWeight: "600", color: "#0f172a" }}>{faq.q}</span>
              <span style={{ fontSize: "20px", color: "#64748b", transform: openIndex === i ? "rotate(180deg)" : "none", transition: "transform 0.2s" }}>▼</span>
            </button>
            {openIndex === i && (
              <div style={{ padding: "0 20px 20px" }}>
                <p style={{ margin: 0, color: "#475569", lineHeight: 1.7 }}>{faq.a}</p>
              </div>
            )}
          </div>
        ))}
      </div>
    </ContentCard>
  );
}
