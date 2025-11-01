import { Card, Text, BlockStack } from "@shopify/polaris";

interface StatsCardProps {
  title: string;
  value: string | number;
  change?: number;
  helpText?: string;
}

export function StatsCard({ title, value, change, helpText }: StatsCardProps) {
  return (
    <Card>
      <BlockStack gap="200">
        <Text as="h3" variant="headingSm" fontWeight="medium">
          {title}
        </Text>
        <Text as="p" variant="heading2xl">
          {value}
        </Text>
        {change !== undefined && (
          <Text as="p" variant="bodySm" tone={change > 0 ? "success" : "critical"}>
            {change > 0 ? "↑" : "↓"} {Math.abs(change)}% vs last period
          </Text>
        )}
        {helpText && (
          <Text as="p" variant="bodySm" tone="subdued">
            {helpText}
          </Text>
        )}
      </BlockStack>
    </Card>
  );
}
