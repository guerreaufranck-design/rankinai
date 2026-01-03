import { Link } from "react-router";

interface UpgradeBlockerProps {
  feature: "optimization" | "analyze" | "content";
}

const MESSAGES = {
  optimization: {
    icon: "🔒",
    title: "Upgrade to Unlock AI Optimization",
    message: `AI algorithms evolve constantly. What ranks today may not rank tomorrow.

Our optimization engine adapts in real-time to LLM changes. We recommend:
- Scanning your products monthly to detect visibility shifts
- Re-optimizing when scores drop below 70%
- Staying ahead of competitors who don't adapt

Monthly optimization updates keep your products visible to AI assistants.`,
  },
  analyze: {
    icon: "🔒",
    title: "Upgrade to Unlock Analysis",
    message: `Your competitors may already be optimizing for AI. Are you falling behind?

AI recommendations shift frequently. Track your performance:
- Analyze which products get cited by AIs
- Identify gaps and opportunities monthly
- Monitor your citation trends over time

Stay competitive in the AI search landscape.`,
  },
  content: {
    icon: "🔒",
    title: "Upgrade to Unlock Content Generation",
    message: `AI assistants favor fresh, structured content. Static pages get forgotten.

Our AI-generated content is designed to:
- Match how LLMs parse and cite information
- Include citation-friendly formatting
- Stay relevant as AI algorithms evolve

Monthly content updates = consistent AI visibility.`,
  },
};

export function UpgradeBlocker({ feature }: UpgradeBlockerProps) {
  const { icon, title, message } = MESSAGES[feature];

  return (
    <div style={{
      padding: "32px",
      background: "linear-gradient(135deg, #fef3c7 0%, #fef9c3 100%)",
      border: "2px solid #fcd34d",
      borderRadius: "16px",
      textAlign: "center",
      maxWidth: "500px",
      margin: "40px auto",
    }}>
      <div style={{ fontSize: "48px", marginBottom: "16px" }}>{icon}</div>
      <h3 style={{ 
        fontSize: "18px", 
        fontWeight: "700", 
        color: "#92400e", 
        margin: "0 0 16px 0" 
      }}>
        {title}
      </h3>
      <p style={{ 
        fontSize: "14px", 
        color: "#a16207", 
        margin: "0 0 24px 0",
        whiteSpace: "pre-line",
        lineHeight: "1.7",
        textAlign: "left",
      }}>
        {message}
      </p>
      <div style={{
        padding: "12px 16px",
        background: "rgba(255, 255, 255, 0.7)",
        borderRadius: "8px",
        marginBottom: "20px",
      }}>
        <div style={{ fontSize: "12px", color: "#92400e", fontWeight: "600" }}>
          💡 Pro tip: AI algorithms change frequently. Regular monthly scans and optimizations ensure you stay ahead.
        </div>
      </div>
      <Link 
        to="/app/upgrade"
        style={{ 
          display: "inline-block",
          background: "#f59e0b", 
          border: "none",
          color: "white",
          fontSize: "16px",
          padding: "12px 32px",
          borderRadius: "8px",
          cursor: "pointer",
          fontWeight: "600",
          textDecoration: "none",
        }}
      >
        ⬆️ Upgrade Now
      </Link>
      <p style={{ 
        fontSize: "11px", 
        color: "#a16207", 
        margin: "16px 0 0 0" 
      }}>
        Free trial includes AI visibility scans only
      </p>
    </div>
  );
}
