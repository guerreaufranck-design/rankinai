export default function Privacy() {
  return (
    <div style={{ maxWidth: "800px", margin: "0 auto", padding: "40px 20px", fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif", lineHeight: "1.7", color: "#333" }}>
      <h1 style={{ fontSize: "32px", marginBottom: "8px" }}>RankInAI Privacy Policy</h1>
      <p style={{ color: "#666", marginBottom: "40px" }}>Last updated: December 30, 2025</p>

      <section style={{ marginBottom: "36px" }}>
        <p>RankInAI ("the App") provides AI citation optimization and product visibility analysis services ("the Service") to merchants who use Shopify to power their stores. This Privacy Policy describes how personal information is collected, used, and shared when you install or use the App in connection with your Shopify-supported store.</p>
      </section>

      <section style={{ marginBottom: "36px" }}>
        <h2 style={{ fontSize: "24px", marginBottom: "16px", borderBottom: "2px solid #eee", paddingBottom: "8px" }}>Personal Information the App Collects</h2>
        <p>When you install the App, we are automatically able to access certain types of information from your Shopify account:</p>
        <ul style={{ marginTop: "12px", paddingLeft: "24px" }}>
          <li><strong>Product Information:</strong> Product titles, descriptions, images, pricing, and metadata (via <code>read_products</code> and <code>write_products</code> API scopes)</li>
          <li><strong>Product Listings:</strong> Active product listings information (via <code>read_product_listings</code> and <code>write_product_listings</code> API scopes)</li>
          <li><strong>Store Information:</strong> Store name, domain, and contact email</li>
        </ul>
        <p style={{ marginTop: "16px" }}>Additionally, we collect the following types of personal information once you have installed the App:</p>
        <ul style={{ marginTop: "12px", paddingLeft: "24px" }}>
          <li><strong>Account Information:</strong> Information about you and others who may access the App on behalf of your store, such as your name, email address, and billing information</li>
          <li><strong>Usage Data:</strong> Information about how you use the App, including scan history, optimization actions, and feature usage</li>
        </ul>
        <p style={{ marginTop: "16px" }}>We collect personal information directly from you, through your Shopify account, or using the following technologies:</p>
        <ul style={{ marginTop: "12px", paddingLeft: "24px" }}>
          <li><strong>Cookies:</strong> Data files placed on your device that include an anonymous unique identifier. For more information about cookies and how to disable them, visit <a href="http://www.allaboutcookies.org" style={{ color: "#6366f1" }}>www.allaboutcookies.org</a></li>
          <li><strong>Log Files:</strong> Track actions occurring on the App, collecting data including your IP address, browser type, Internet service provider, referring/exit pages, and date/time stamps</li>
        </ul>
        <p style={{ marginTop: "16px" }}><strong>Important:</strong> We do not collect personal information about your customers. The App only accesses product data, not customer or order data.</p>
      </section>

      <section style={{ marginBottom: "36px" }}>
        <h2 style={{ fontSize: "24px", marginBottom: "16px", borderBottom: "2px solid #eee", paddingBottom: "8px" }}>How Do We Use Your Personal Information?</h2>
        <p>We use the personal information we collect from you in order to provide the Service and to operate the App. Additionally, we use this personal information to:</p>
        <ul style={{ marginTop: "12px", paddingLeft: "24px" }}>
          <li>Analyze your products for AI citation potential across platforms like ChatGPT and Google Gemini</li>
          <li>Generate optimization recommendations to improve product visibility in AI responses</li>
          <li>Track citation rates and provide analytics on your product performance</li>
          <li>Communicate with you about your account, including subscription updates and service notifications</li>
          <li>Optimize and improve the App based on usage patterns</li>
          <li>Provide customer support</li>
        </ul>
      </section>

      <section style={{ marginBottom: "36px" }}>
        <h2 style={{ fontSize: "24px", marginBottom: "16px", borderBottom: "2px solid #eee", paddingBottom: "8px" }}>Sharing Your Personal Information</h2>
        <p>We share your information with the following third parties to provide our Service:</p>
        <ul style={{ marginTop: "12px", paddingLeft: "24px" }}>
          <li><strong>OpenAI:</strong> Product information is sent to OpenAI's API (ChatGPT) to analyze AI citation potential</li>
          <li><strong>Google:</strong> Product information is sent to Google's Gemini API to analyze AI citation potential</li>
          <li><strong>Vercel:</strong> Our hosting provider that processes requests to deliver the App</li>
          <li><strong>Supabase:</strong> Our database provider that stores your account and product data</li>
        </ul>
        <p style={{ marginTop: "16px" }}>We do not sell, rent, or trade your personal information to third parties for their marketing purposes.</p>
        <p style={{ marginTop: "12px" }}>Finally, we may also share your Personal Information to comply with applicable laws and regulations, to respond to a subpoena, search warrant or other lawful request for information we receive, or to otherwise protect our rights.</p>
      </section>

      <section style={{ marginBottom: "36px" }}>
        <h2 style={{ fontSize: "24px", marginBottom: "16px", borderBottom: "2px solid #eee", paddingBottom: "8px" }}>Data Retention</h2>
        <p>We retain your information for as long as you have the App installed and your account is active. When you uninstall the App, we will delete or anonymize your data within 30 days, unless we are required to retain it for legal or legitimate business purposes.</p>
        <p style={{ marginTop: "12px" }}>Scan history and analytics data may be retained in anonymized form for statistical purposes.</p>
      </section>

      <section style={{ marginBottom: "36px" }}>
        <h2 style={{ fontSize: "24px", marginBottom: "16px", borderBottom: "2px solid #eee", paddingBottom: "8px" }}>Your Rights (GDPR)</h2>
        <p>If you are a European resident, you have the right to:</p>
        <ul style={{ marginTop: "12px", paddingLeft: "24px" }}>
          <li><strong>Access:</strong> Request access to the personal information we hold about you</li>
          <li><strong>Correction:</strong> Request that your personal information be corrected or updated</li>
          <li><strong>Deletion:</strong> Request that your personal information be deleted</li>
          <li><strong>Portability:</strong> Request a copy of your data in a portable format</li>
          <li><strong>Objection:</strong> Object to the processing of your personal information</li>
        </ul>
        <p style={{ marginTop: "16px" }}>To exercise any of these rights, please contact us at support@rank-in-ai.com.</p>
        <p style={{ marginTop: "12px" }}>Additionally, if you are a European resident, we note that we are processing your information in order to fulfill contracts we might have with you (for example, if you subscribe to a paid plan), or otherwise to pursue our legitimate business interests listed above. Please note that your information may be transferred outside of Europe, including to the United States.</p>
      </section>

      <section style={{ marginBottom: "36px" }}>
        <h2 style={{ fontSize: "24px", marginBottom: "16px", borderBottom: "2px solid #eee", paddingBottom: "8px" }}>California Privacy Rights (CCPA)</h2>
        <p>If you are a California resident, you have the right to:</p>
        <ul style={{ marginTop: "12px", paddingLeft: "24px" }}>
          <li>Know what personal information is being collected about you</li>
          <li>Know whether your personal information is sold or disclosed and to whom</li>
          <li>Say no to the sale of personal information</li>
          <li>Access your personal information</li>
          <li>Request deletion of your personal information</li>
          <li>Not be discriminated against for exercising your privacy rights</li>
        </ul>
        <p style={{ marginTop: "16px" }}>We do not sell your personal information. To exercise your rights, contact us at support@rank-in-ai.com.</p>
      </section>

      <section style={{ marginBottom: "36px" }}>
        <h2 style={{ fontSize: "24px", marginBottom: "16px", borderBottom: "2px solid #eee", paddingBottom: "8px" }}>Security</h2>
        <p>We implement appropriate technical and organizational security measures to protect your personal information against unauthorized access, alteration, disclosure, or destruction. These measures include:</p>
        <ul style={{ marginTop: "12px", paddingLeft: "24px" }}>
          <li>Encryption of data in transit (HTTPS/TLS)</li>
          <li>Encryption of data at rest</li>
          <li>Regular security audits</li>
          <li>Access controls and authentication</li>
        </ul>
      </section>

      <section style={{ marginBottom: "36px" }}>
        <h2 style={{ fontSize: "24px", marginBottom: "16px", borderBottom: "2px solid #eee", paddingBottom: "8px" }}>Changes</h2>
        <p>We may update this privacy policy from time to time in order to reflect changes to our practices or for other operational, legal, or regulatory reasons. We will notify you of any material changes by posting the new policy on this page and updating the "Last updated" date.</p>
      </section>

      <section style={{ marginBottom: "36px" }}>
        <h2 style={{ fontSize: "24px", marginBottom: "16px", borderBottom: "2px solid #eee", paddingBottom: "8px" }}>Contact Us</h2>
        <p>For more information about our privacy practices, if you have questions, or if you would like to make a complaint, please contact us:</p>
        <div style={{ marginTop: "16px", padding: "20px", background: "#f8f9fa", borderRadius: "8px" }}>
          <p style={{ margin: "0 0 8px" }}><strong>Email:</strong> support@rank-in-ai.com</p>
          <p style={{ margin: "0 0 8px" }}><strong>Company:</strong> OddBallTrip LLC</p>
          <p style={{ margin: "0" }}><strong>Address:</strong> United States</p>
        </div>
      </section>

      <footer style={{ marginTop: "48px", paddingTop: "24px", borderTop: "1px solid #eee", textAlign: "center", color: "#666", fontSize: "14px" }}>
        <p>&copy; {new Date().getFullYear()} RankInAI by OddBallTrip LLC. All rights reserved.</p>
      </footer>
    </div>
  );
}
