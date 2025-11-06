import AppHeader from "~/components/AppHeader";

export default function TermsOfService() {
  return (
    <div style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif', background: "#f6f6f7", minHeight: "100vh" }}>
      <AppHeader />
      
      <div style={{ padding: "0 24px 48px 24px", maxWidth: "900px", margin: "0 auto" }}>
        <div style={{ marginBottom: "32px" }}>
          <h1 style={{ fontSize: "32px", fontWeight: "700", margin: "32px 0 8px 0", color: "#202223" }}>
            Terms of Service
          </h1>
          <p style={{ fontSize: "16px", color: "#6d7175", margin: 0 }}>
            Effective Date: January 1, 2025 | Last Updated: January 1, 2025
          </p>
        </div>

        <div style={{ background: "white", borderRadius: "12px", padding: "40px", boxShadow: "0 1px 3px rgba(0,0,0,0.1)" }}>
          <div style={{ fontSize: "15px", color: "#202223", lineHeight: "1.8" }}>
            
            <section style={{ marginBottom: "40px" }}>
              <h2 style={{ fontSize: "24px", fontWeight: "600", margin: "0 0 20px 0", color: "#202223" }}>
                1. Agreement to Terms
              </h2>
              <p style={{ margin: "0 0 16px 0" }}>
                These Terms of Service ("Terms") constitute a legally binding agreement between you ("Merchant," "you," or "your") 
                and Oddballtrip LLC, a Wyoming limited liability company ("RankInAI," "we," "us," or "our"), concerning your 
                use of the RankInAI application available through the Shopify App Store.
              </p>
              <p style={{ margin: "0 0 16px 0" }}>
                By installing, accessing, or using RankInAI, you acknowledge that you have read, understood, and agree to be 
                bound by these Terms. If you do not agree to these Terms, you must not install or use our application.
              </p>
            </section>

            <section style={{ marginBottom: "40px" }}>
              <h2 style={{ fontSize: "24px", fontWeight: "600", margin: "0 0 20px 0", color: "#202223" }}>
                2. Description of Service
              </h2>
              <p style={{ margin: "0 0 16px 0" }}>
                RankInAI is a Shopify application that helps merchants optimize their products for visibility in AI-powered 
                shopping assistants. Our services include:
              </p>
              <ul style={{ margin: "0 0 16px 0", paddingLeft: "24px" }}>
                <li>Scanning products on AI platforms (ChatGPT, Google Gemini)</li>
                <li>Providing citation scores and visibility metrics</li>
                <li>Generating optimization recommendations</li>
                <li>Tracking performance over time</li>
                <li>Competitor analysis and benchmarking</li>
              </ul>
            </section>

            <section style={{ marginBottom: "40px" }}>
              <h2 style={{ fontSize: "24px", fontWeight: "600", margin: "0 0 20px 0", color: "#202223" }}>
                3. Account Requirements
              </h2>
              <ul style={{ margin: "0 0 16px 0", paddingLeft: "24px" }}>
                <li>You must have an active Shopify store</li>
                <li>You must be 18 years or older</li>
                <li>You must provide accurate and complete information</li>
                <li>You are responsible for maintaining account security</li>
                <li>You must comply with Shopify's Terms of Service</li>
                <li>One RankInAI account per Shopify store</li>
              </ul>
            </section>

            <section style={{ marginBottom: "40px" }}>
              <h2 style={{ fontSize: "24px", fontWeight: "600", margin: "0 0 20px 0", color: "#202223" }}>
                4. Subscription and Billing
              </h2>
              <h3 style={{ fontSize: "18px", fontWeight: "600", margin: "24px 0 16px 0", color: "#202223" }}>
                4.1 Subscription Plans
              </h3>
              <p style={{ margin: "0 0 16px 0" }}>RankInAI offers multiple subscription tiers:</p>
              <ul style={{ margin: "0 0 16px 0", paddingLeft: "24px" }}>
                <li><strong>Trial:</strong> 25 credits, limited features</li>
                <li><strong>Starter:</strong> €39/month, 100 credits</li>
                <li><strong>Growth:</strong> €79/month, 300 credits</li>
                <li><strong>Scale:</strong> €149/month, 700 credits</li>
                <li><strong>Pro:</strong> €199/month, unlimited credits</li>
              </ul>

              <h3 style={{ fontSize: "18px", fontWeight: "600", margin: "24px 0 16px 0", color: "#202223" }}>
                4.2 Billing Process
              </h3>
              <ul style={{ margin: "0 0 16px 0", paddingLeft: "24px" }}>
                <li>Billing is processed through Shopify's billing system</li>
                <li>Charges appear on your Shopify invoice</li>
                <li>Subscriptions auto-renew monthly unless canceled</li>
                <li>Credits reset monthly and do not roll over</li>
                <li>Upgrades take effect immediately with prorated billing</li>
                <li>Downgrades take effect at the next billing cycle</li>
              </ul>

              <h3 style={{ fontSize: "18px", fontWeight: "600", margin: "24px 0 16px 0", color: "#202223" }}>
                4.3 Refund Policy
              </h3>
              <p style={{ margin: "0 0 16px 0" }}>
                Due to the nature of our service, refunds are generally not provided. However, we may offer refunds 
                at our discretion for technical issues preventing service use.
              </p>
            </section>

            <section style={{ marginBottom: "40px" }}>
              <h2 style={{ fontSize: "24px", fontWeight: "600", margin: "0 0 20px 0", color: "#202223" }}>
                5. Use of Service
              </h2>
              <h3 style={{ fontSize: "18px", fontWeight: "600", margin: "24px 0 16px 0", color: "#202223" }}>
                5.1 Permitted Use
              </h3>
              <p style={{ margin: "0 0 12px 0" }}>You may use RankInAI to:</p>
              <ul style={{ margin: "0 0 16px 0", paddingLeft: "24px" }}>
                <li>Scan your legitimate Shopify products</li>
                <li>Access optimization recommendations</li>
                <li>Track performance metrics</li>
                <li>Export your data for analysis</li>
              </ul>

              <h3 style={{ fontSize: "18px", fontWeight: "600", margin: "24px 0 16px 0", color: "#202223" }}>
                5.2 Prohibited Use
              </h3>
              <p style={{ margin: "0 0 12px 0" }}>You must NOT:</p>
              <ul style={{ margin: "0 0 16px 0", paddingLeft: "24px" }}>
                <li>Share account credentials with others</li>
                <li>Use automated systems to bypass credit limits</li>
                <li>Reverse engineer or copy the service</li>
                <li>Scan products you don't own</li>
                <li>Submit false or misleading information</li>
                <li>Violate any applicable laws or regulations</li>
                <li>Interfere with service operations</li>
                <li>Resell or redistribute the service</li>
              </ul>
            </section>

            <section style={{ marginBottom: "40px" }}>
              <h2 style={{ fontSize: "24px", fontWeight: "600", margin: "0 0 20px 0", color: "#202223" }}>
                6. Intellectual Property
              </h2>
              <p style={{ margin: "0 0 16px 0" }}>
                All rights, title, and interest in RankInAI, including software, algorithms, designs, and content, 
                remain the exclusive property of Oddballtrip LLC. These Terms do not grant you any rights to our 
                trademarks, trade secrets, or other intellectual property.
              </p>
              <p style={{ margin: "0 0 16px 0" }}>
                You retain ownership of your product data. By using RankInAI, you grant us a limited license to 
                process your data solely for providing our services.
              </p>
            </section>

            <section style={{ marginBottom: "40px" }}>
              <h2 style={{ fontSize: "24px", fontWeight: "600", margin: "0 0 20px 0", color: "#202223" }}>
                7. Disclaimers and Warranties
              </h2>
              <p style={{ margin: "0 0 16px 0" }}>
                RANKINAI IS PROVIDED "AS IS" AND "AS AVAILABLE" WITHOUT WARRANTIES OF ANY KIND, WHETHER EXPRESS, 
                IMPLIED, OR STATUTORY. WE SPECIFICALLY DISCLAIM ALL IMPLIED WARRANTIES OF MERCHANTABILITY, FITNESS 
                FOR A PARTICULAR PURPOSE, AND NON-INFRINGEMENT.
              </p>
              <p style={{ margin: "0 0 16px 0" }}>We do not guarantee that:</p>
              <ul style={{ margin: "0 0 16px 0", paddingLeft: "24px" }}>
                <li>The service will be uninterrupted or error-free</li>
                <li>Results will improve your sales or visibility</li>
                <li>AI platforms will cite your products</li>
                <li>Recommendations will achieve specific outcomes</li>
              </ul>
            </section>

            <section style={{ marginBottom: "40px" }}>
              <h2 style={{ fontSize: "24px", fontWeight: "600", margin: "0 0 20px 0", color: "#202223" }}>
                8. Limitation of Liability
              </h2>
              <p style={{ margin: "0 0 16px 0" }}>
                TO THE MAXIMUM EXTENT PERMITTED BY LAW, ODDBALLTRIP LLC SHALL NOT BE LIABLE FOR ANY INDIRECT, 
                INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, OR ANY LOSS OF PROFITS OR REVENUES, 
                WHETHER INCURRED DIRECTLY OR INDIRECTLY, OR ANY LOSS OF DATA, USE, GOODWILL, OR OTHER INTANGIBLE LOSSES.
              </p>
              <p style={{ margin: "0 0 16px 0" }}>
                Our total liability shall not exceed the amount paid by you for the service in the twelve (12) months 
                preceding the claim.
              </p>
            </section>

            <section style={{ marginBottom: "40px" }}>
              <h2 style={{ fontSize: "24px", fontWeight: "600", margin: "0 0 20px 0", color: "#202223" }}>
                9. Indemnification
              </h2>
              <p style={{ margin: "0 0 16px 0" }}>
                You agree to indemnify, defend, and hold harmless Oddballtrip LLC, its officers, directors, employees, 
                and agents from any claims, damages, losses, liabilities, costs, and expenses arising from:
              </p>
              <ul style={{ margin: "0 0 16px 0", paddingLeft: "24px" }}>
                <li>Your violation of these Terms</li>
                <li>Your violation of any third-party rights</li>
                <li>Your use or misuse of the service</li>
                <li>Your product content or data</li>
              </ul>
            </section>

            <section style={{ marginBottom: "40px" }}>
              <h2 style={{ fontSize: "24px", fontWeight: "600", margin: "0 0 20px 0", color: "#202223" }}>
                10. Termination
              </h2>
              <p style={{ margin: "0 0 16px 0" }}>
                Either party may terminate these Terms at any time:
              </p>
              <ul style={{ margin: "0 0 16px 0", paddingLeft: "24px" }}>
                <li><strong>By You:</strong> Uninstall RankInAI from your Shopify admin</li>
                <li><strong>By Us:</strong> For violation of Terms or at our discretion with notice</li>
              </ul>
              <p style={{ margin: "0 0 16px 0" }}>
                Upon termination, your access to RankInAI will cease immediately. We will delete your data within 
                30 days unless legally required to retain it longer.
              </p>
            </section>

            <section style={{ marginBottom: "40px" }}>
              <h2 style={{ fontSize: "24px", fontWeight: "600", margin: "0 0 20px 0", color: "#202223" }}>
                11. Governing Law and Disputes
              </h2>
              <p style={{ margin: "0 0 16px 0" }}>
                These Terms are governed by the laws of Wyoming, United States, without regard to conflict of law principles. 
                Any disputes shall be resolved through binding arbitration in Wyoming, except for claims seeking injunctive relief.
              </p>
            </section>

            <section style={{ marginBottom: "40px" }}>
              <h2 style={{ fontSize: "24px", fontWeight: "600", margin: "0 0 20px 0", color: "#202223" }}>
                12. Changes to Terms
              </h2>
              <p style={{ margin: "0 0 16px 0" }}>
                We may modify these Terms at any time. We will notify you of material changes via email or in-app notification. 
                Continued use after changes constitutes acceptance of the modified Terms.
              </p>
            </section>

            <section>
              <h2 style={{ fontSize: "24px", fontWeight: "600", margin: "0 0 20px 0", color: "#202223" }}>
                13. Contact Information
              </h2>
              <div style={{ background: "#f9f9f9", padding: "24px", borderRadius: "8px" }}>
                <p style={{ margin: "0 0 12px 0", fontSize: "16px", fontWeight: "600" }}>Oddballtrip LLC</p>
                <p style={{ margin: "0 0 8px 0" }}>30 N GOULD ST STE R</p>
                <p style={{ margin: "0 0 8px 0" }}>SHERIDAN, WYOMING 82801</p>
                <p style={{ margin: "0 0 8px 0" }}>United States</p>
                <p style={{ margin: "0 0 8px 0" }}>EIN: 38-4361347</p>
                <p style={{ margin: "0 0 8px 0" }}><strong>Email:</strong> support@rank-in-ai.com</p>
                <p style={{ margin: "0" }}><strong>Legal:</strong> legal@rank-in-ai.com</p>
              </div>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}
