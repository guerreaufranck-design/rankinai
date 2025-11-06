import AppHeader from "~/components/AppHeader";

export default function CookiePolicy() {
  return (
    <div style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif', background: "#f6f6f7", minHeight: "100vh" }}>
      <AppHeader />
      
      <div style={{ padding: "0 24px 48px 24px", maxWidth: "900px", margin: "0 auto" }}>
        <div style={{ marginBottom: "32px" }}>
          <h1 style={{ fontSize: "32px", fontWeight: "700", margin: "32px 0 8px 0", color: "#202223" }}>
            Cookie Policy
          </h1>
          <p style={{ fontSize: "16px", color: "#6d7175", margin: 0 }}>
            Last Updated: January 1, 2025
          </p>
        </div>

        <div style={{ background: "white", borderRadius: "12px", padding: "40px", boxShadow: "0 1px 3px rgba(0,0,0,0.1)" }}>
          <div style={{ fontSize: "15px", color: "#202223", lineHeight: "1.8" }}>
            
            <section style={{ marginBottom: "40px" }}>
              <h2 style={{ fontSize: "24px", fontWeight: "600", margin: "0 0 20px 0", color: "#202223" }}>
                Introduction
              </h2>
              <p style={{ margin: "0 0 16px 0" }}>
                This Cookie Policy explains how Oddballtrip LLC ("RankInAI," "we," "our," or "us") uses cookies 
                and similar tracking technologies when you use the RankInAI application. As a Shopify app, 
                our cookie usage is primarily managed through Shopify's infrastructure.
              </p>
            </section>

            <section style={{ marginBottom: "40px" }}>
              <h2 style={{ fontSize: "24px", fontWeight: "600", margin: "0 0 20px 0", color: "#202223" }}>
                What Are Cookies?
              </h2>
              <p style={{ margin: "0 0 16px 0" }}>
                Cookies are small text files placed on your device when you visit a website or use an application. 
                They help services remember your preferences, improve functionality, and understand usage patterns.
              </p>
            </section>

            <section style={{ marginBottom: "40px" }}>
              <h2 style={{ fontSize: "24px", fontWeight: "600", margin: "0 0 20px 0", color: "#202223" }}>
                Shopify App Context
              </h2>
              <p style={{ margin: "0 0 16px 0" }}>
                As a Shopify embedded app, RankInAI operates within Shopify's admin interface. This means:
              </p>
              <ul style={{ margin: "0 0 16px 0", paddingLeft: "24px" }}>
                <li>Authentication is handled through Shopify's OAuth system</li>
                <li>Session management uses Shopify's session tokens</li>
                <li>Most cookies are set and managed by Shopify, not directly by RankInAI</li>
                <li>We use Shopify App Bridge for secure communication</li>
              </ul>
            </section>

            <section style={{ marginBottom: "40px" }}>
              <h2 style={{ fontSize: "24px", fontWeight: "600", margin: "0 0 20px 0", color: "#202223" }}>
                Types of Cookies We Use
              </h2>
              
              <h3 style={{ fontSize: "18px", fontWeight: "600", margin: "24px 0 16px 0", color: "#202223" }}>
                Essential Cookies
              </h3>
              <p style={{ margin: "0 0 12px 0" }}>Required for the app to function properly:</p>
              <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: "16px" }}>
                <thead>
                  <tr style={{ background: "#f5f5f5" }}>
                    <th style={{ padding: "12px", textAlign: "left", border: "1px solid #e0e0e0" }}>Cookie Name</th>
                    <th style={{ padding: "12px", textAlign: "left", border: "1px solid #e0e0e0" }}>Purpose</th>
                    <th style={{ padding: "12px", textAlign: "left", border: "1px solid #e0e0e0" }}>Duration</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td style={{ padding: "12px", border: "1px solid #e0e0e0" }}>shopify_app_session</td>
                    <td style={{ padding: "12px", border: "1px solid #e0e0e0" }}>Authentication token</td>
                    <td style={{ padding: "12px", border: "1px solid #e0e0e0" }}>Session</td>
                  </tr>
                  <tr>
                    <td style={{ padding: "12px", border: "1px solid #e0e0e0" }}>_secure_session_id</td>
                    <td style={{ padding: "12px", border: "1px solid #e0e0e0" }}>Secure session identifier</td>
                    <td style={{ padding: "12px", border: "1px solid #e0e0e0" }}>24 hours</td>
                  </tr>
                </tbody>
              </table>

              <h3 style={{ fontSize: "18px", fontWeight: "600", margin: "24px 0 16px 0", color: "#202223" }}>
                Functional Cookies
              </h3>
              <p style={{ margin: "0 0 12px 0" }}>Enhance user experience:</p>
              <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: "16px" }}>
                <thead>
                  <tr style={{ background: "#f5f5f5" }}>
                    <th style={{ padding: "12px", textAlign: "left", border: "1px solid #e0e0e0" }}>Cookie Name</th>
                    <th style={{ padding: "12px", textAlign: "left", border: "1px solid #e0e0e0" }}>Purpose</th>
                    <th style={{ padding: "12px", textAlign: "left", border: "1px solid #e0e0e0" }}>Duration</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td style={{ padding: "12px", border: "1px solid #e0e0e0" }}>rankinai_prefs</td>
                    <td style={{ padding: "12px", border: "1px solid #e0e0e0" }}>User preferences</td>
                    <td style={{ padding: "12px", border: "1px solid #e0e0e0" }}>30 days</td>
                  </tr>
                  <tr>
                    <td style={{ padding: "12px", border: "1px solid #e0e0e0" }}>locale</td>
                    <td style={{ padding: "12px", border: "1px solid #e0e0e0" }}>Language preference</td>
                    <td style={{ padding: "12px", border: "1px solid #e0e0e0" }}>1 year</td>
                  </tr>
                </tbody>
              </table>

              <h3 style={{ fontSize: "18px", fontWeight: "600", margin: "24px 0 16px 0", color: "#202223" }}>
                Analytics Cookies
              </h3>
              <p style={{ margin: "0 0 12px 0" }}>Help us understand usage (only with consent):</p>
              <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: "16px" }}>
                <thead>
                  <tr style={{ background: "#f5f5f5" }}>
                    <th style={{ padding: "12px", textAlign: "left", border: "1px solid #e0e0e0" }}>Cookie Name</th>
                    <th style={{ padding: "12px", textAlign: "left", border: "1px solid #e0e0e0" }}>Purpose</th>
                    <th style={{ padding: "12px", textAlign: "left", border: "1px solid #e0e0e0" }}>Duration</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td style={{ padding: "12px", border: "1px solid #e0e0e0" }}>_ga</td>
                    <td style={{ padding: "12px", border: "1px solid #e0e0e0" }}>Google Analytics</td>
                    <td style={{ padding: "12px", border: "1px solid #e0e0e0" }}>2 years</td>
                  </tr>
                  <tr>
                    <td style={{ padding: "12px", border: "1px solid #e0e0e0" }}>_gid</td>
                    <td style={{ padding: "12px", border: "1px solid #e0e0e0" }}>Google Analytics</td>
                    <td style={{ padding: "12px", border: "1px solid #e0e0e0" }}>24 hours</td>
                  </tr>
                </tbody>
              </table>
            </section>

            <section style={{ marginBottom: "40px" }}>
              <h2 style={{ fontSize: "24px", fontWeight: "600", margin: "0 0 20px 0", color: "#202223" }}>
                Third-Party Cookies
              </h2>
              <p style={{ margin: "0 0 16px 0" }}>
                Our service providers may set cookies:
              </p>
              <ul style={{ margin: "0 0 16px 0", paddingLeft: "24px" }}>
                <li><strong>Shopify:</strong> Session management and authentication</li>
                <li><strong>Vercel:</strong> Performance monitoring and optimization</li>
                <li><strong>Google Analytics:</strong> Usage analytics (if consented)</li>
                <li><strong>Intercom:</strong> Customer support chat (if enabled)</li>
              </ul>
            </section>

            <section style={{ marginBottom: "40px" }}>
              <h2 style={{ fontSize: "24px", fontWeight: "600", margin: "0 0 20px 0", color: "#202223" }}>
                Cookie Consent (GDPR/CCPA)
              </h2>
              <p style={{ margin: "0 0 16px 0" }}>
                For users in jurisdictions requiring cookie consent:
              </p>
              <ul style={{ margin: "0 0 16px 0", paddingLeft: "24px" }}>
                <li><strong>Essential cookies:</strong> Used without consent (necessary for service)</li>
                <li><strong>Non-essential cookies:</strong> Only set after obtaining consent</li>
                <li><strong>Consent withdrawal:</strong> Can be done anytime through settings</li>
                <li><strong>Granular control:</strong> Accept/reject specific cookie categories</li>
              </ul>
            </section>

            <section style={{ marginBottom: "40px" }}>
              <h2 style={{ fontSize: "24px", fontWeight: "600", margin: "0 0 20px 0", color: "#202223" }}>
                Managing Cookies
              </h2>
              
              <h3 style={{ fontSize: "18px", fontWeight: "600", margin: "24px 0 16px 0", color: "#202223" }}>
                Browser Settings
              </h3>
              <p style={{ margin: "0 0 16px 0" }}>
                You can control cookies through your browser:
              </p>
              <ul style={{ margin: "0 0 16px 0", paddingLeft: "24px" }}>
                <li><a href="https://support.google.com/chrome/answer/95647" style={{ color: "#2196f3" }}>Chrome</a></li>
                <li><a href="https://support.mozilla.org/en-US/kb/cookies" style={{ color: "#2196f3" }}>Firefox</a></li>
                <li><a href="https://support.apple.com/guide/safari/manage-cookies-sfri11471" style={{ color: "#2196f3" }}>Safari</a></li>
                <li><a href="https://support.microsoft.com/en-us/microsoft-edge/delete-cookies" style={{ color: "#2196f3" }}>Edge</a></li>
              </ul>

              <h3 style={{ fontSize: "18px", fontWeight: "600", margin: "24px 0 16px 0", color: "#202223" }}>
                App Settings
              </h3>
              <p style={{ margin: "0 0 16px 0" }}>
                Within RankInAI, go to Settings → Privacy to manage your cookie preferences.
              </p>

              <h3 style={{ fontSize: "18px", fontWeight: "600", margin: "24px 0 16px 0", color: "#202223" }}>
                Opt-Out Links
              </h3>
              <ul style={{ margin: "0 0 16px 0", paddingLeft: "24px" }}>
                <li><a href="https://tools.google.com/dlpage/gaoptout" style={{ color: "#2196f3" }}>Google Analytics Opt-Out</a></li>
                <li><a href="https://www.aboutads.info/choices/" style={{ color: "#2196f3" }}>Digital Advertising Alliance</a></li>
                <li><a href="https://www.youronlinechoices.eu/" style={{ color: "#2196f3" }}>European Digital Advertising Alliance</a></li>
              </ul>
            </section>

            <section style={{ marginBottom: "40px" }}>
              <h2 style={{ fontSize: "24px", fontWeight: "600", margin: "0 0 20px 0", color: "#202223" }}>
                Local Storage and Similar Technologies
              </h2>
              <p style={{ margin: "0 0 16px 0" }}>
                In addition to cookies, we may use:
              </p>
              <ul style={{ margin: "0 0 16px 0", paddingLeft: "24px" }}>
                <li><strong>Local Storage:</strong> Store preferences and settings</li>
                <li><strong>Session Storage:</strong> Temporary data during your session</li>
                <li><strong>IndexedDB:</strong> Cache data for offline functionality</li>
                <li><strong>Web Beacons:</strong> Track email opens and interactions</li>
              </ul>
            </section>

            <section style={{ marginBottom: "40px" }}>
              <h2 style={{ fontSize: "24px", fontWeight: "600", margin: "0 0 20px 0", color: "#202223" }}>
                Do Not Track (DNT)
              </h2>
              <p style={{ margin: "0 0 16px 0" }}>
                RankInAI respects Do Not Track browser signals. When DNT is enabled, we:
              </p>
              <ul style={{ margin: "0 0 16px 0", paddingLeft: "24px" }}>
                <li>Do not load analytics cookies</li>
                <li>Do not track user behavior</li>
                <li>Only use essential cookies for functionality</li>
              </ul>
            </section>

            <section style={{ marginBottom: "40px" }}>
              <h2 style={{ fontSize: "24px", fontWeight: "600", margin: "0 0 20px 0", color: "#202223" }}>
                Impact of Blocking Cookies
              </h2>
              <p style={{ margin: "0 0 16px 0" }}>
                Blocking certain cookies may affect functionality:
              </p>
              <ul style={{ margin: "0 0 16px 0", paddingLeft: "24px" }}>
                <li><strong>Essential cookies:</strong> App will not function</li>
                <li><strong>Functional cookies:</strong> Reduced personalization</li>
                <li><strong>Analytics cookies:</strong> No impact on functionality</li>
              </ul>
            </section>

            <section style={{ marginBottom: "40px" }}>
              <h2 style={{ fontSize: "24px", fontWeight: "600", margin: "0 0 20px 0", color: "#202223" }}>
                Children's Privacy
              </h2>
              <p style={{ margin: "0 0 16px 0" }}>
                RankInAI is not intended for users under 18. We do not knowingly collect cookies from children.
              </p>
            </section>

            <section style={{ marginBottom: "40px" }}>
              <h2 style={{ fontSize: "24px", fontWeight: "600", margin: "0 0 20px 0", color: "#202223" }}>
                Updates to This Policy
              </h2>
              <p style={{ margin: "0 0 16px 0" }}>
                We may update this Cookie Policy periodically. Changes will be posted with a new "Last Updated" date. 
                Continued use after changes indicates acceptance.
              </p>
            </section>

            <section>
              <h2 style={{ fontSize: "24px", fontWeight: "600", margin: "0 0 20px 0", color: "#202223" }}>
                Contact Us
              </h2>
              <div style={{ background: "#f9f9f9", padding: "24px", borderRadius: "8px" }}>
                <p style={{ margin: "0 0 12px 0", fontSize: "16px", fontWeight: "600" }}>Cookie Questions?</p>
                <p style={{ margin: "0 0 8px 0" }}><strong>Email:</strong> privacy@rank-in-ai.com</p>
                <p style={{ margin: "0 0 8px 0" }}><strong>GDPR:</strong> gdpr@rank-in-ai.com</p>
                <p style={{ margin: "0 0 16px 0" }}><strong>Support:</strong> support@rank-in-ai.com</p>
                
                <p style={{ margin: "0 0 8px 0", fontSize: "16px", fontWeight: "600" }}>Oddballtrip LLC</p>
                <p style={{ margin: "0 0 8px 0" }}>30 N GOULD ST STE R</p>
                <p style={{ margin: "0 0 8px 0" }}>SHERIDAN, WYOMING 82801</p>
                <p style={{ margin: "0" }}>United States</p>
              </div>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}
