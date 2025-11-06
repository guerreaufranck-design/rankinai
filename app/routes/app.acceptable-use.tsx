import AppHeader from "~/components/AppHeader";

export default function AcceptableUse() {
  return (
    <div style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif', background: "#f6f6f7", minHeight: "100vh" }}>
      <AppHeader />
      
      <div style={{ padding: "0 24px 48px 24px", maxWidth: "900px", margin: "0 auto" }}>
        <div style={{ marginBottom: "32px" }}>
          <h1 style={{ fontSize: "32px", fontWeight: "700", margin: "32px 0 8px 0", color: "#202223" }}>
            Acceptable Use Policy
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
                This Acceptable Use Policy ("AUP") governs the use of RankInAI services provided by Oddballtrip LLC. 
                By using our application, you agree to comply with this policy. Violation may result in suspension or 
                termination of your access to RankInAI.
              </p>
              <p style={{ margin: "0 0 16px 0" }}>
                This policy applies to all users, including trial and paid subscribers, and covers all features and 
                functionalities of the RankInAI platform.
              </p>
            </section>

            <section style={{ marginBottom: "40px" }}>
              <h2 style={{ fontSize: "24px", fontWeight: "600", margin: "0 0 20px 0", color: "#202223" }}>
                Permitted Use
              </h2>
              <p style={{ margin: "0 0 16px 0" }}>
                You may use RankInAI for legitimate business purposes, including:
              </p>
              <ul style={{ margin: "0 0 16px 0", paddingLeft: "24px" }}>
                <li>Scanning and analyzing your own Shopify store products</li>
                <li>Optimizing product descriptions for AI visibility</li>
                <li>Tracking citation performance across AI platforms</li>
                <li>Conducting competitive analysis within legal bounds</li>
                <li>Generating reports for business intelligence</li>
                <li>Implementing optimization recommendations</li>
                <li>Exporting data for further analysis</li>
                <li>Testing product variations and improvements</li>
              </ul>
            </section>

            <section style={{ marginBottom: "40px" }}>
              <h2 style={{ fontSize: "24px", fontWeight: "600", margin: "0 0 20px 0", color: "#202223" }}>
                Prohibited Activities
              </h2>
              
              <h3 style={{ fontSize: "18px", fontWeight: "600", margin: "24px 0 16px 0", color: "#202223" }}>
                Illegal and Harmful Activities
              </h3>
              <ul style={{ margin: "0 0 16px 0", paddingLeft: "24px" }}>
                <li>Violating any applicable laws or regulations</li>
                <li>Infringing intellectual property rights</li>
                <li>Facilitating fraud or deceptive practices</li>
                <li>Promoting illegal products or services</li>
                <li>Engaging in harassment or discrimination</li>
                <li>Distributing malware or harmful code</li>
              </ul>

              <h3 style={{ fontSize: "18px", fontWeight: "600", margin: "24px 0 16px 0", color: "#202223" }}>
                Service Abuse
              </h3>
              <ul style={{ margin: "0 0 16px 0", paddingLeft: "24px" }}>
                <li>Attempting to bypass credit limits or usage restrictions</li>
                <li>Using automated scripts without authorization</li>
                <li>Creating multiple accounts to exploit trial periods</li>
                <li>Sharing account credentials with unauthorized users</li>
                <li>Reselling or redistributing RankInAI services</li>
                <li>Reverse engineering or copying our technology</li>
                <li>Interfering with service operations or infrastructure</li>
                <li>Conducting excessive scans that impact system performance</li>
              </ul>

              <h3 style={{ fontSize: "18px", fontWeight: "600", margin: "24px 0 16px 0", color: "#202223" }}>
                Data and Content Violations
              </h3>
              <ul style={{ margin: "0 0 16px 0", paddingLeft: "24px" }}>
                <li>Scanning products you don't have rights to</li>
                <li>Submitting false or misleading product information</li>
                <li>Using competitors' data without authorization</li>
                <li>Scraping or harvesting data from AI platforms</li>
                <li>Manipulating AI systems with deceptive content</li>
                <li>Creating fake products or listings</li>
              </ul>

              <h3 style={{ fontSize: "18px", fontWeight: "600", margin: "24px 0 16px 0", color: "#202223" }}>
                Platform Manipulation
              </h3>
              <ul style={{ margin: "0 0 16px 0", paddingLeft: "24px" }}>
                <li>Gaming AI citation systems through artificial means</li>
                <li>Keyword stuffing or spam techniques</li>
                <li>Creating misleading product descriptions</li>
                <li>Manipulating competitor analysis results</li>
                <li>Using black-hat SEO techniques</li>
              </ul>
            </section>

            <section style={{ marginBottom: "40px" }}>
              <h2 style={{ fontSize: "24px", fontWeight: "600", margin: "0 0 20px 0", color: "#202223" }}>
                Fair Use Guidelines
              </h2>
              <p style={{ margin: "0 0 16px 0" }}>
                To ensure service quality for all users:
              </p>
              <ul style={{ margin: "0 0 16px 0", paddingLeft: "24px" }}>
                <li>Use credits responsibly and avoid unnecessary duplicate scans</li>
                <li>Respect rate limits (max 10 scans per minute)</li>
                <li>Report bugs instead of exploiting them</li>
                <li>Provide accurate business information</li>
                <li>Keep your account information up to date</li>
                <li>Use appropriate language in support communications</li>
                <li>Respect intellectual property of others</li>
              </ul>
            </section>

            <section style={{ marginBottom: "40px" }}>
              <h2 style={{ fontSize: "24px", fontWeight: "600", margin: "0 0 20px 0", color: "#202223" }}>
                Content Standards
              </h2>
              <p style={{ margin: "0 0 16px 0" }}>
                Products scanned through RankInAI must not contain:
              </p>
              <ul style={{ margin: "0 0 16px 0", paddingLeft: "24px" }}>
                <li>Illegal or regulated items without proper authorization</li>
                <li>Adult content or explicit material</li>
                <li>Hate speech or discriminatory content</li>
                <li>Misleading health claims</li>
                <li>Copyright or trademark violations</li>
                <li>Personal information of third parties</li>
                <li>Malicious links or phishing attempts</li>
              </ul>
            </section>

            <section style={{ marginBottom: "40px" }}>
              <h2 style={{ fontSize: "24px", fontWeight: "600", margin: "0 0 20px 0", color: "#202223" }}>
                Security Requirements
              </h2>
              <p style={{ margin: "0 0 16px 0" }}>You are responsible for:</p>
              <ul style={{ margin: "0 0 16px 0", paddingLeft: "24px" }}>
                <li>Maintaining the security of your account credentials</li>
                <li>Using strong, unique passwords</li>
                <li>Enabling two-factor authentication when available</li>
                <li>Promptly reporting any security breaches</li>
                <li>Not sharing API keys or access tokens</li>
                <li>Keeping your Shopify store secure</li>
                <li>Regularly reviewing account activity</li>
              </ul>
            </section>

            <section style={{ marginBottom: "40px" }}>
              <h2 style={{ fontSize: "24px", fontWeight: "600", margin: "0 0 20px 0", color: "#202223" }}>
                Compliance with Third-Party Terms
              </h2>
              <p style={{ margin: "0 0 16px 0" }}>
                When using RankInAI, you must also comply with:
              </p>
              <ul style={{ margin: "0 0 16px 0", paddingLeft: "24px" }}>
                <li><strong>Shopify Terms of Service:</strong> As a Shopify app user</li>
                <li><strong>OpenAI Usage Policies:</strong> For ChatGPT scanning</li>
                <li><strong>Google AI Principles:</strong> For Gemini scanning</li>
                <li><strong>Platform-specific guidelines:</strong> For each AI service</li>
              </ul>
            </section>

            <section style={{ marginBottom: "40px" }}>
              <h2 style={{ fontSize: "24px", fontWeight: "600", margin: "0 0 20px 0", color: "#202223" }}>
                Monitoring and Enforcement
              </h2>
              <p style={{ margin: "0 0 16px 0" }}>
                We may monitor usage to ensure compliance with this policy. We reserve the right to:
              </p>
              <ul style={{ margin: "0 0 16px 0", paddingLeft: "24px" }}>
                <li>Investigate suspected violations</li>
                <li>Remove or disable content that violates this policy</li>
                <li>Suspend or terminate accounts for violations</li>
                <li>Report illegal activities to law enforcement</li>
                <li>Cooperate with legal investigations</li>
              </ul>
            </section>

            <section style={{ marginBottom: "40px" }}>
              <h2 style={{ fontSize: "24px", fontWeight: "600", margin: "0 0 20px 0", color: "#202223" }}>
                Consequences of Violations
              </h2>
              <p style={{ margin: "0 0 16px 0" }}>
                Violations may result in:
              </p>
              <ol style={{ margin: "0 0 16px 0", paddingLeft: "24px" }}>
                <li><strong>First Offense:</strong> Warning and request to cease violation</li>
                <li><strong>Second Offense:</strong> Temporary suspension (7-30 days)</li>
                <li><strong>Third Offense:</strong> Permanent account termination</li>
                <li><strong>Severe Violations:</strong> Immediate termination without warning</li>
              </ol>
              <p style={{ margin: "0 0 16px 0" }}>
                We reserve the right to take legal action for serious violations causing damage to our service or users.
              </p>
            </section>

            <section style={{ marginBottom: "40px" }}>
              <h2 style={{ fontSize: "24px", fontWeight: "600", margin: "0 0 20px 0", color: "#202223" }}>
                Reporting Violations
              </h2>
              <p style={{ margin: "0 0 16px 0" }}>
                To report AUP violations or abuse:
              </p>
              <ul style={{ margin: "0 0 16px 0", paddingLeft: "24px" }}>
                <li>Email: abuse@rank-in-ai.com</li>
                <li>Include evidence and specific details</li>
                <li>Provide your contact information</li>
                <li>We investigate reports within 48 hours</li>
              </ul>
            </section>

            <section style={{ marginBottom: "40px" }}>
              <h2 style={{ fontSize: "24px", fontWeight: "600", margin: "0 0 20px 0", color: "#202223" }}>
                Appeal Process
              </h2>
              <p style={{ margin: "0 0 16px 0" }}>
                If your account is suspended or terminated, you may appeal by:
              </p>
              <ol style={{ margin: "0 0 16px 0", paddingLeft: "24px" }}>
                <li>Emailing appeals@rank-in-ai.com within 30 days</li>
                <li>Explaining the circumstances</li>
                <li>Providing supporting documentation</li>
                <li>Committing to future compliance</li>
              </ol>
              <p style={{ margin: "0 0 16px 0" }}>
                Appeals are reviewed within 5 business days. Decisions are final.
              </p>
            </section>

            <section style={{ marginBottom: "40px" }}>
              <h2 style={{ fontSize: "24px", fontWeight: "600", margin: "0 0 20px 0", color: "#202223" }}>
                Updates to This Policy
              </h2>
              <p style={{ margin: "0 0 16px 0" }}>
                We may update this AUP to address new issues or changes in law. Updates will be posted with a new 
                "Last Updated" date. Material changes will be notified via email. Continued use after updates 
                indicates acceptance.
              </p>
            </section>

            <section>
              <h2 style={{ fontSize: "24px", fontWeight: "600", margin: "0 0 20px 0", color: "#202223" }}>
                Contact Information
              </h2>
              <div style={{ background: "#f9f9f9", padding: "24px", borderRadius: "8px" }}>
                <p style={{ margin: "0 0 12px 0", fontSize: "16px", fontWeight: "600" }}>Report Violations</p>
                <p style={{ margin: "0 0 8px 0" }}><strong>Abuse Reports:</strong> abuse@rank-in-ai.com</p>
                <p style={{ margin: "0 0 8px 0" }}><strong>Appeals:</strong> appeals@rank-in-ai.com</p>
                <p style={{ margin: "0 0 8px 0" }}><strong>General Support:</strong> support@rank-in-ai.com</p>
                <p style={{ margin: "0 0 16px 0" }}><strong>Response Time:</strong> 24-48 hours</p>
                
                <p style={{ margin: "0 0 8px 0", fontSize: "16px", fontWeight: "600" }}>Oddballtrip LLC</p>
                <p style={{ margin: "0 0 8px 0" }}>30 N GOULD ST STE R</p>
                <p style={{ margin: "0 0 8px 0" }}>SHERIDAN, WYOMING 82801</p>
                <p style={{ margin: "0 0 8px 0" }}>United States</p>
                <p style={{ margin: "0" }}>EIN: 38-4361347</p>
              </div>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}
