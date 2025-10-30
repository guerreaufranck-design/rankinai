import { useNavigate } from "react-router";
import {
  AppProvider,
  Page,
  Layout,
  Card,
  Text,
  Button,
  BlockStack,
  TextField,
  Select
} from "@shopify/polaris";
import enTranslations from '@shopify/polaris/locales/en.json';
import { useState } from "react";

export default function Settings() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [notifications, setNotifications] = useState("all");
  
  return (
    <AppProvider i18n={enTranslations}>
      <Page
        title="Paramètres"
        backAction={{
          content: "Retour",
          onAction: () => navigate("/app")
        }}
        primaryAction={{
          content: "Sauvegarder",
          onAction: () => console.log("Save settings")
        }}
      >
        <Layout>
          <Layout.Section>
            <Card title="Notifications">
              <BlockStack gap="400">
                <Select
                  label="Recevoir les notifications"
                  options={[
                    { label: "Toutes les notifications", value: "all" },
                    { label: "Importantes seulement", value: "important" },
                    { label: "Aucune notification", value: "none" }
                  ]}
                  value={notifications}
                  onChange={setNotifications}
                />
                
                <TextField
                  label="Email de notification"
                  type="email"
                  value={email}
                  onChange={setEmail}
                  autoComplete="email"
                />
              </BlockStack>
            </Card>
          </Layout.Section>
          
          <Layout.Section>
            <Card title="Compte">
              <BlockStack gap="400">
                <Text variant="bodyMd">
                  <strong>Shop:</strong> store-du-29-octobre.myshopify.com
                </Text>
                <Text variant="bodyMd">
                  <strong>Plan:</strong> Trial (25 crédits)
                </Text>
                <Text variant="bodyMd">
                  <strong>Membre depuis:</strong> 29 octobre 2025
                </Text>
              </BlockStack>
            </Card>
          </Layout.Section>
        </Layout>
      </Page>
    </AppProvider>
  );
}
