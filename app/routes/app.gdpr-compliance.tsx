import AppHeader from "~/components/AppHeader";

export default function GDPRCompliance() {
  return (
    <div style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif', background: "#f6f6f7", minHeight: "100vh" }}>
      <AppHeader />
      
      <div style={{ padding: "0 24px 48px 24px", maxWidth: "900px", margin: "0 auto" }}>
        <div style={{ marginBottom: "32px" }}>
          <h1 style={{ fontSize: "32px", fontWeight: "700", margin: "32px 0 8px 0", color: "#202223" }}>
            GDPR Compliance Statement
          </h1>
          <p style={{ fontSize: "16px", color: "#6d7175", margin: 0 }}>
            General Data Protection Regulation (EU) 2016/679
          </p>
        </div>

        <div style={{ background: "white", borderRadius: "12px", padding: "40px", boxShadow: "0 1px 3px rgba(0,0,0,0.1)" }}>
          <div style={{ fontSize: "15px", color: "#202223", lineHeight: "1.8" }}>
            
            <section style={{ marginBottom: "40px" }}>
              <h2 style={{ fontSize: "24px", fontWeight: "600", margin: "0 0 20px 0", color: "#202223" }}>
                Our GDPR Commitment
              </h2>
              <p style={{ margin: "0 0 16px 0" }}>
                Oddballtrip LLC and RankInAI are fully committed to compliance with the General Data Protection Regulation (GDPR). 
                We respect the privacy rights of all individuals in the European Economic Area (EEA), United Kingdom, and Switzerland.
              </p>
              <p style={{ margin: "0 0 16px 0" }}>
                This document outlines how we ensure GDPR compliance and protect your fundamental rights to privacy and data protection.
              </p>
            </section>

            <section style={{ marginBottom: "40px" }}>
              <h2 style={{ fontSize: "24px", fontWeight: "600", margin: "0 0 20px 0", color: "#202223" }}>
                Data Controller Information
              </h2>
              <div style={{ background: "#f9f9f9", padding: "20px", borderRadius: "8px", marginBottom: "16px" }}>
                <p style={{ margin: "0 0 8px 0" }}><strong>Company:</strong> Oddballtrip LLC</p>
                <p style={{ margin: "0 0 8px 0" }}><strong>Address:</strong> 30 N GOULD ST STE R, SHERIDAN, WY 82801, USA</p>
                <p style={{ margin: "0 0 8px 0" }}><strong>Data Protection Officer:</strong> privacy@rank-in-ai.com</p>
                <p style={{ margin: "0" }}><strong>GDPR Representative (EU):</strong> gdpr-eu@rank-in-ai.com</p>
              </div>
            </section>

            <section style={{ marginBottom: "40px" }}>
              <h2 style={{ fontSize: "24px", fontWeight: "600", margin: "0 0 20px 0", color: "#202223" }}>
                Your GDPR Rights
              </h2>
              
              <h3 style={{ fontSize: "18px", fontWeight: "600", margin: "24px 0 16px 0", color: "#202223" }}>
                1. Right to Access (Article 15)
              </h3>
              <p style={{ margin: "0 0 16px 0" }}>
                You have the right to obtain confirmation of whether we process your personal data and access to that data, 
                including information about purposes, categories, recipients, retention periods, and your rights.
              </p>

              <h3 style={{ fontSize: "18px", fontWeight: "600", margin: "24px 0 16px 0", color: "#202223" }}>
                2. Right to Rectification (Article 16)
              </h3>
              <p style={{ margin: "0 0 16px 0" }}>
                You can request correction of inaccurate personal data and completion of incomplete data.
              </p>

              <h3 style={{ fontSize: "18px", fontWeight: "600", margin: "24px 0 16px 0", color: "#202223" }}>
                3. Right to Erasure - "Right to be Forgotten" (Article 17)
              </h3>
              <p style={{ margin: "0 0 16px 0" }}>
                You can request deletion of your personal data when:
              </p>
              <ul style={{ margin: "0 0 16px 0", paddingLeft: "24px" }}>
                <li>Data is no longer necessary for original purposes</li>
                <li>You withdraw consent (where consent is the legal basis)</li>
                <li>You object to processing and no overriding legitimate grounds exist</li>
                <li>Data has been unlawfully processed</li>
                <li>Deletion is required by law</li>
              </ul>

              <h3 style={{ fontSize: "18px", fontWeight: "600", margin: "24px 0 16px 0", color: "#202223" }}>
                4. Right to Restriction of Processing (Article 18)
              </h3>
              <p style={{ margin: "0 0 16px 0" }}>
                You can request restriction of processing when:
              </p>
              <ul style={{ margin: "0 0 16px 0", paddingLeft: "24px" }}>
                <li>You contest data accuracy (during verification period)</li>
                <li>Processing is unlawful but you oppose erasure</li>
                <li>We no longer need data but you require it for legal claims</li>
                <li>You've objected to processing (during verification of legitimate grounds)</li>
              </ul>

              <h3 style={{ fontSize: "18px", fontWeight: "600", margin: "24px 0 16px 0", color: "#202223" }}>
                5. Right to Data Portability (Article 20)
              </h3>
              <p style={{ margin: "0 0 16px 0" }}>
                You can receive your personal data in a structured, commonly used, machine-readable format and transmit 
                it to another controller where processing is based on consent or contract and carried out by automated means.
              </p>

              <h3 style={{ fontSize: "18px", fontWeight: "600", margin: "24px 0 16px 0", color: "#202223" }}>
                6. Right to Object (Article 21)
              </h3>
              <p style={{ margin: "0 0 16px 0" }}>
                You can object to processing based on legitimate interests or public task, including profiling. 
                For direct marketing, your right to object is absolute.
              </p>

              <h3 style={{ fontSize: "18px", fontWeight: "600", margin: "24px 0 16px 0", color: "#202223" }}>
                7. Rights Related to Automated Decision-Making (Article 22)
              </h3>
              <p style={{ margin: "0 0 16px 0" }}>
                You have the right not to be subject to decisions based solely on automated processing that produce 
                legal or significant effects, except when necessary for contract, authorized by law, or based on explicit consent.
              </p>
            </section>

            <section style={{ marginBottom: "40px" }}>
              <h2 style={{ fontSize: "24px", fontWeight: "600", margin: "0 0 20px 0", color: "#202223" }}>
                How to Exercise Your Rights
              </h2>
              <p style={{ margin: "0 0 16px 0" }}>To exercise any of your GDPR rights:</p>
              <ol style={{ margin: "0 0 16px 0", paddingLeft: "24px" }}>
                <li>Email gdpr@rank-in-ai.com with "GDPR Request" in the subject</li>
                <li>Specify which right(s) you wish to exercise</li>
                <li>Provide identification to verify your identity</li>
                <li>We will respond within 30 days (extendable by 60 days for complex requests)</li>
              </ol>
              <p style={{ margin: "0 0 16px 0" }}>
                All requests are free of charge unless manifestly unfounded or excessive.
              </p>
            </section>

            <section style={{ marginBottom: "40px" }}>
              <h2 style={{ fontSize: "24px", fontWeight: "600", margin: "0 0 20px 0", color: "#202223" }}>
                Our Data Processing Principles
              </h2>
              <ul style={{ margin: "0 0 16px 0", paddingLeft: "24px" }}>
                <li><strong>Lawfulness, Fairness, Transparency:</strong> Clear about data processing</li>
                <li><strong>Purpose Limitation:</strong> Collected for specified, explicit, legitimate purposes</li>
                <li><strong>Data Minimization:</strong> Adequate, relevant, limited to necessary</li>
                <li><strong>Accuracy:</strong> Accurate and kept up to date</li>
                <li><strong>Storage Limitation:</strong> Kept only as long as necessary</li>
                <li><strong>Integrity and Confidentiality:</strong> Processed securely</li>
                <li><strong>Accountability:</strong> Responsible for demonstrating compliance</li>
              </ul>
            </section>

            <section style={{ marginBottom: "40px" }}>
              <h2 style={{ fontSize: "24px", fontWeight: "600", margin: "0 0 20px 0", color: "#202223" }}>
                Shopify GDPR Webhooks
              </h2>
              <p style={{ margin: "0 0 16px 0" }}>
                RankInAI implements mandatory Shopify GDPR webhooks for automated compliance:
              </p>
              <div style={{ background: "#f9f9f9", padding: "20px", borderRadius: "8px" }}>
                <p style={{ margin: "0 0 12px 0" }}><strong>customers/data_request</strong></p>
                <p style={{ margin: "0 0 16px 0", paddingLeft: "20px", fontSize: "14px", color: "#6d7175" }}>
                  Triggered when a customer requests their data. We compile and provide all personal data within 30 days.
                </p>
                
                <p style={{ margin: "0 0 12px 0" }}><strong>customers/redact</strong></p>
                <p style={{ margin: "0 0 16px 0", paddingLeft: "20px", fontSize: "14px", color: "#6d7175" }}>
                  Triggered 10 days after order cancellation. We delete or anonymize customer data within 30 days.
                </p>
                
                <p style={{ margin: "0 0 12px 0" }}><strong>shop/redact</strong></p>
                <p style={{ margin: "0", paddingLeft: "20px", fontSize: "14px", color: "#6d7175" }}>
                  Triggered 48 hours after app uninstall. We delete all shop data within 30 days.
                </p>
              </div>
            </section>

            <section style={{ marginBottom: "40px" }}>
              <h2 style={{ fontSize: "24px", fontWeight: "600", margin: "0 0 20px 0", color: "#202223" }}>
                Data Protection Measures
              </h2>
              <ul style={{ margin: "0 0 16px 0", paddingLeft: "24px" }}>
                <li>Encryption at rest and in transit (TLS 1.3)</li>
                <li>Regular security audits and penetration testing</li>
                <li>Access controls and authentication</li>
                <li>Data processing agreements with sub-processors</li>
                <li>Privacy by design and default</li>
                <li>Data protection impact assessments (DPIA)</li>
                <li>Incident response and breach notification procedures</li>
                <li>Employee training on data protection</li>
              </ul>
            </section>

            <section style={{ marginBottom: "40px" }}>
              <h2 style={{ fontSize: "24px", fontWeight: "600", margin: "0 0 20px 0", color: "#202223" }}>
                International Data Transfers
              </h2>
              <p style={{ margin: "0 0 16px 0" }}>
                When transferring data outside the EEA, we ensure appropriate safeguards:
              </p>
              <ul style={{ margin: "0 0 16px 0", paddingLeft: "24px" }}>
                <li>Standard Contractual Clauses (SCC) approved by the European Commission</li>
                <li>Supplementary measures for data security</li>
                <li>Regular assessments of third-country data protection laws</li>
              </ul>
            </section>

            <section style={{ marginBottom: "40px" }}>
              <h2 style={{ fontSize: "24px", fontWeight: "600", margin: "0 0 20px 0", color: "#202223" }}>
                Data Breach Notification
              </h2>
              <p style={{ margin: "0 0 16px 0" }}>
                In case of a personal data breach, we will:
              </p>
              <ul style={{ margin: "0 0 16px 0", paddingLeft: "24px" }}>
                <li>Notify supervisory authorities within 72 hours (if risk exists)</li>
                <li>Notify affected individuals without undue delay (if high risk)</li>
                <li>Document all breaches and responses</li>
                <li>Implement measures to prevent recurrence</li>
              </ul>
            </section>

            <section style={{ marginBottom: "40px" }}>
              <h2 style={{ fontSize: "24px", fontWeight: "600", margin: "0 0 20px 0", color: "#202223" }}>
                Supervisory Authority
              </h2>
              <p style={{ margin: "0 0 16px 0" }}>
                You have the right to lodge a complaint with your local supervisory authority if you believe 
                your data protection rights have been violated. Find your authority at: 
                <a href="https://edpb.europa.eu/about-edpb/board/members_en" 
                   style={{ color: "#2196f3", textDecoration: "none" }}> edpb.europa.eu</a>
              </p>
            </section>

            <section>
              <h2 style={{ fontSize: "24px", fontWeight: "600", margin: "0 0 20px 0", color: "#202223" }}>
                Contact for GDPR Matters
              </h2>
              <div style={{ background: "#f9f9f9", padding: "24px", borderRadius: "8px" }}>
                <p style={{ margin: "0 0 12px 0", fontSize: "16px", fontWeight: "600" }}>Data Protection Officer</p>
                <p style={{ margin: "0 0 8px 0" }}><strong>Email:</strong> gdpr@rank-in-ai.com</p>
                <p style={{ margin: "0 0 8px 0" }}><strong>Response Time:</strong> Within 30 days</p>
                <p style={{ margin: "0 0 16px 0" }}><strong>Languages:</strong> English, French, German, Spanish</p>
                
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
