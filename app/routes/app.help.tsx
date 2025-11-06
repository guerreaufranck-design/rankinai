import AppHeader from "~/components/AppHeader";
import { useState } from "react";

export default function Help() {
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  const faqs = [
    {
      question: "How does RankInAI work?",
      answer: "RankInAI scans your products by asking AI assistants (ChatGPT and Google Gemini) where to buy them online. We analyze if your store is recommended and provide a score based on visibility, position, and competition."
    },
    {
      question: "What is a Citation Score?",
      answer: "Your Citation Score (0-100%) measures how often AI assistants recommend YOUR store when asked about your products. Scores above 70% are excellent, 40-70% are good, and below 40% need optimization."
    },
    {
      question: "How are credits used?",
      answer: "Each AI scan (ChatGPT or Gemini) costs 1 credit. Your plan determines how many scans you can run per month. Credits reset at the beginning of each billing cycle."
    },
    {
      question: "Why is my shop not being cited?",
      answer: "AI assistants rely on public web data. If your shop is new or has low SEO, they won't recommend it. Use the Optimize feature to improve your product descriptions, create blog content, and build authority."
    },
    {
      question: "What does the Optimize feature do?",
      answer: "The Optimize feature analyzes your products and generates AI-powered suggestions to improve your SEO and visibility. This includes better titles, descriptions, meta tags, and even blog post ideas."
    },
    {
      question: "Can I add custom domains?",
      answer: "Yes! In Settings, you can add alternative domains (like www.mystore.com) so we track citations accurately across all your domains, not just your Shopify URL."
    },
    {
      question: "How often should I scan my products?",
      answer: "Scan products weekly to track progress. After making optimizations, wait 2-4 weeks before rescanning to allow search engines to index your changes."
    },
    {
      question: "What's the difference between ChatGPT and Gemini scores?",
      answer: "Different AI models use different training data. ChatGPT might favor certain sources while Gemini prefers others. Aim for high scores on both for maximum visibility."
    },
  ];

  const userJourney = [
    {
      step: 1,
      title: "Install & Sync",
      description: "Install RankInAI from the Shopify App Store. Your products automatically sync to our dashboard.",
      icon: "📦"
    },
    {
      step: 2,
      title: "Run Your First Scan",
      description: "Go to Products and click 'ChatGPT' or 'Gemini' to scan a product. Wait 5-10 seconds for results.",
      icon: "🔍"
    },
    {
      step: 3,
      title: "Analyze Results",
      description: "Check your Citation Score. Click 'View Analysis' to see detailed breakdowns: product mentions, shop citations, competitor analysis.",
      icon: "📊"
    },
    {
      step: 4,
      title: "Optimize Your Products",
      description: "Go to Optimize to get AI-powered suggestions. Apply recommended changes to improve your SEO and visibility.",
      icon: "✨"
    },
    {
      step: 5,
      title: "Track Progress",
      description: "Rescan products after 2-4 weeks to see improvements. Monitor trends in your Dashboard.",
      icon: "📈"
    },
    {
      step: 6,
      title: "Scale Up",
      description: "Upgrade your plan for more scans, automated optimization, and API access as your store grows.",
      icon: "🚀"
    },
  ];

  return (
    <div style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif', background: "#f6f6f7", minHeight: "100vh" }}>
      <AppHeader />
      
      <div style={{ padding: "0 24px 24px 24px", maxWidth: "1200px", margin: "0 auto" }}>
        <div style={{ marginBottom: "32px" }}>
          <h1 style={{ fontSize: "28px", fontWeight: "600", margin: "0 0 8px 0", color: "#202223" }}>
            ❓ Help & Support
          </h1>
          <p style={{ fontSize: "16px", color: "#6d7175", margin: 0 }}>
            Everything you need to know about RankInAI
          </p>
        </div>

        {/* Quick Start Guide */}
        <div style={{ background: "white", borderRadius: "12px", padding: "24px", boxShadow: "0 1px 3px rgba(0,0,0,0.1)", marginBottom: "32px" }}>
          <h2 style={{ fontSize: "22px", fontWeight: "600", margin: "0 0 24px 0", color: "#202223" }}>
            🚀 Quick Start Guide
          </h2>
          
          <div style={{ display: "grid", gap: "24px" }}>
            {userJourney.map((item) => (
              <div key={item.step} style={{ display: "flex", gap: "16px", padding: "16px", background: "#f9f9f9", borderRadius: "8px" }}>
                <div style={{ 
                  fontSize: "32px", 
                  minWidth: "60px", 
                  height: "60px", 
                  background: "white", 
                  borderRadius: "50%", 
                  display: "flex", 
                  alignItems: "center", 
                  justifyContent: "center",
                  boxShadow: "0 2px 8px rgba(0,0,0,0.1)"
                }}>
                  {item.icon}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "8px" }}>
                    <span style={{ 
                      background: "#2196f3", 
                      color: "white", 
                      padding: "4px 12px", 
                      borderRadius: "12px", 
                      fontSize: "12px", 
                      fontWeight: "600" 
                    }}>
                      STEP {item.step}
                    </span>
                    <h3 style={{ fontSize: "18px", fontWeight: "600", margin: 0, color: "#202223" }}>
                      {item.title}
                    </h3>
                  </div>
                  <p style={{ fontSize: "14px", color: "#6d7175", margin: 0, lineHeight: "1.6" }}>
                    {item.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Feature Overview */}
        <div style={{ background: "white", borderRadius: "12px", padding: "24px", boxShadow: "0 1px 3px rgba(0,0,0,0.1)", marginBottom: "32px" }}>
          <h2 style={{ fontSize: "22px", fontWeight: "600", margin: "0 0 24px 0", color: "#202223" }}>
            🎯 Feature Overview
          </h2>
          
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: "24px" }}>
            <div style={{ padding: "16px", borderLeft: "4px solid #2196f3" }}>
              <h3 style={{ fontSize: "16px", fontWeight: "600", margin: "0 0 8px 0", color: "#202223" }}>
                📊 Dashboard
              </h3>
              <p style={{ fontSize: "14px", color: "#6d7175", margin: 0, lineHeight: "1.6" }}>
                Overview of your AI visibility performance. See credits, average citation rate, top performers, and products needing attention.
              </p>
            </div>

            <div style={{ padding: "16px", borderLeft: "4px solid #4caf50" }}>
              <h3 style={{ fontSize: "16px", fontWeight: "600", margin: "0 0 8px 0", color: "#202223" }}>
                📦 Products
              </h3>
              <p style={{ fontSize: "14px", color: "#6d7175", margin: 0, lineHeight: "1.6" }}>
                Scan products with ChatGPT and Gemini. View citation scores, detailed analysis, and track performance over time.
              </p>
            </div>

            <div style={{ padding: "16px", borderLeft: "4px solid #ff9800" }}>
              <h3 style={{ fontSize: "16px", fontWeight: "600", margin: "0 0 8px 0", color: "#202223" }}>
                🔍 Analyze
              </h3>
              <p style={{ fontSize: "14px", color: "#6d7175", margin: 0, lineHeight: "1.6" }}>
                Deep dive into citation history, competitor mentions, AI response patterns, and performance trends.
              </p>
            </div>

            <div style={{ padding: "16px", borderLeft: "4px solid #9c27b0" }}>
              <h3 style={{ fontSize: "16px", fontWeight: "600", margin: "0 0 8px 0", color: "#202223" }}>
                ✨ Optimize
              </h3>
              <p style={{ fontSize: "14px", color: "#6d7175", margin: 0, lineHeight: "1.6" }}>
                Get AI-powered optimization suggestions. Apply changes to product titles, descriptions, tags, and generate SEO-optimized blog posts.
              </p>
            </div>

            <div style={{ padding: "16px", borderLeft: "4px solid #f44336" }}>
              <h3 style={{ fontSize: "16px", fontWeight: "600", margin: "0 0 8px 0", color: "#202223" }}>
                ⚙️ Settings
              </h3>
              <p style={{ fontSize: "14px", color: "#6d7175", margin: 0, lineHeight: "1.6" }}>
                Manage store info, add custom domains for accurate tracking, and upgrade your plan for more scans.
              </p>
            </div>
          </div>
        </div>

        {/* FAQ */}
        <div style={{ background: "white", borderRadius: "12px", padding: "24px", boxShadow: "0 1px 3px rgba(0,0,0,0.1)", marginBottom: "32px" }}>
          <h2 style={{ fontSize: "22px", fontWeight: "600", margin: "0 0 24px 0", color: "#202223" }}>
            💬 Frequently Asked Questions
          </h2>
          
          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            {faqs.map((faq, index) => (
              <div key={index} style={{ border: "1px solid #e0e0e0", borderRadius: "8px", overflow: "hidden" }}>
                <button
                  onClick={() => setOpenFaq(openFaq === index ? null : index)}
                  style={{
                    width: "100%",
                    padding: "16px",
                    background: openFaq === index ? "#f5f5f5" : "white",
                    border: "none",
                    textAlign: "left",
                    cursor: "pointer",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    fontSize: "15px",
                    fontWeight: "600",
                    color: "#202223",
                  }}
                >
                  {faq.question}
                  <span style={{ fontSize: "20px", color: "#6d7175" }}>
                    {openFaq === index ? "−" : "+"}
                  </span>
                </button>
                {openFaq === index && (
                  <div style={{ padding: "16px", background: "#f9f9f9", borderTop: "1px solid #e0e0e0" }}>
                    <p style={{ fontSize: "14px", color: "#6d7175", margin: 0, lineHeight: "1.6" }}>
                      {faq.answer}
                    </p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Contact Support */}
        <div style={{ background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)", borderRadius: "12px", padding: "32px", boxShadow: "0 4px 20px rgba(0,0,0,0.1)", textAlign: "center" }}>
          <h2 style={{ fontSize: "24px", fontWeight: "600", margin: "0 0 12px 0", color: "white" }}>
            Still need help?
          </h2>
          <p style={{ fontSize: "16px", color: "rgba(255,255,255,0.9)", margin: "0 0 24px 0" }}>
            Our support team is here to help you succeed
          </p>
          <button
            onClick={() => window.open("mailto:support@rank-in-ai.com", "_blank")}
            style={{
              background: "white",
              color: "#667eea",
              border: "none",
              padding: "12px 32px",
              borderRadius: "8px",
              fontSize: "16px",
              fontWeight: "600",
              cursor: "pointer",
              boxShadow: "0 2px 8px rgba(0,0,0,0.2)",
            }}
          >
            📧 Contact Support
          </button>
        </div>
      </div>
    </div>
  );
}
