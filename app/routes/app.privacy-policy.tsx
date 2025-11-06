import AppHeader from "~/components/AppHeader";

export default function PrivacyPolicy() {
  return (
    <div style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif', background: "#f6f6f7", minHeight: "100vh" }}>
      <AppHeader />
      <div style={{ padding: "0 24px 24px 24px", maxWidth: "800px", margin: "0 auto" }}>
        <h1 style={{ fontSize: "28px", fontWeight: "600", margin: "32px 0 16px 0", color: "#202223" }}>Privacy Policy</h1>
        <div style={{ background: "white", borderRadius: "12px", padding: "32px", boxShadow: "0 1px 3px rgba(0,0,0,0.1)" }}>
          <p style={{ margin: "0 0 16px 0", lineHeight: "1.6" }}>Oddballtrip LLC operates RankInAI. We respect your privacy and protect your data.</p>
          <h2 style={{ fontSize: "20px", fontWeight: "600", margin: "24px 0 16px 0" }}>Data We Collect</h2>
          <ul style={{ margin: "0 0 16px 0", paddingLeft: "20px", lineHeight: "1.8" }}>
            <li>Shop information from Shopify</li>
            <li>Product data for AI scanning</li>
            <li>Usage analytics</li>
          </ul>
          <h2 style={{ fontSize: "20px", fontWeight: "600", margin: "24px 0 16px 0" }}>Contact</h2>
          <p>Email: support@rank-in-ai.com</p>
          <p>Oddballtrip LLC, 30 N GOULD ST STE R, SHERIDAN, WY 82801</p>
        </div>
      </div>
    </div>
  );
}
