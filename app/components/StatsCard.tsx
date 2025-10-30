import { Card, Text, BlockStack, InlineStack, Badge, Icon } from "@shopify/polaris";
import { TrendingUpMajor, TrendingDownMajor } from "@shopify/polaris-icons";

interface StatsCardProps {
  title: string;
  value: string | number;
  change?: number;
  subtitle?: string;
  tone?: 'success' | 'warning' | 'critical' | 'base';
}

export function StatsCard({ title, value, change, subtitle, tone = 'base' }: StatsCardProps) {
  const getTrendIcon = () => {
    if (!change) return null;
    return change > 0 ? TrendingUpMajor : TrendingDownMajor;
  };
  
  const getTrendTone = () => {
    if (!change) return 'base';
    return change > 0 ? 'success' : 'critical';
  };
  
  return (
    <Card>
      <BlockStack gap="200">
        <Text variant="bodySm" tone="subdued">
          {title}
        </Text>
        
        <InlineStack align="space-between" blockAlign="baseline">
          <Text variant="heading3xl" tone={tone}>
            {value}
          </Text>
          
          {change !== undefined && (
            <InlineStack gap="100" blockAlign="center">
              <Icon source={getTrendIcon()!} tone={getTrendTone()} />
              <Badge tone={getTrendTone()}>
                {change > 0 ? '+' : ''}{change.toFixed(1)}%
              </Badge>
            </InlineStack>
          )}
        </InlineStack>
        
        {subtitle && (
          <Text variant="bodySm" tone="subdued">
            {subtitle}
          </Text>
        )}
      </BlockStack>
    </Card>
  );
}
