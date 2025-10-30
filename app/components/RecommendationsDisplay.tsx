import {
  Card,
  BlockStack,
  Text,
  Badge,
  Button,
  InlineStack,
  Box,
  Divider,
  List
} from "@shopify/polaris";
import { useState } from "react";

interface RecommendationsProps {
  recommendations: any;
  currentScore: number;
  potentialScore: number;
  onApply?: () => void;
  canAutoApply: boolean;
}

export function RecommendationsDisplay({
  recommendations,
  currentScore,
  potentialScore,
  onApply,
  canAutoApply
}: RecommendationsProps) {
  const [copiedField, setCopiedField] = useState<string | null>(null);
  
  const handleCopy = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  };
  
  const improvement = potentialScore - currentScore;
  
  return (
    <BlockStack gap="400">
      {/* Score Improvement */}
      <Card>
        <InlineStack align="space-between" blockAlign="center">
          <BlockStack gap="200">
            <Text variant="headingSm">Potential Improvement</Text>
            <InlineStack gap="400">
              <Badge size="large" tone="base">
                Current: {currentScore}%
              </Badge>
              <Text variant="bodyLg">→</Text>
              <Badge size="large" tone="success">
                Potential: {potentialScore}%
              </Badge>
            </InlineStack>
          </BlockStack>
          
          <Text variant="heading2xl" tone="success">
            +{improvement}%
          </Text>
        </InlineStack>
      </Card>
      
      {/* Title Optimization */}
      {recommendations.title && (
        <Card title="Title Optimization">
          <BlockStack gap="300">
            <Box padding="200" background="bg-surface-secondary" borderRadius="100">
              <BlockStack gap="100">
                <Text variant="bodySm" tone="subdued">Current:</Text>
                <Text variant="bodyMd">{recommendations.title.current}</Text>
              </BlockStack>
            </Box>
            
            <Box padding="200" background="bg-surface-success" borderRadius="100">
              <BlockStack gap="100">
                <Text variant="bodySm" tone="subdued">Suggested:</Text>
                <Text variant="bodyMd" fontWeight="semibold">
                  {recommendations.title.suggested}
                </Text>
              </BlockStack>
            </Box>
            
            <InlineStack align="space-between">
              <Text variant="bodySm" tone="subdued">
                {recommendations.title.reason}
              </Text>
              <Button
                size="slim"
                onClick={() => handleCopy(recommendations.title.suggested, 'title')}
              >
                {copiedField === 'title' ? '✓ Copied' : 'Copy'}
              </Button>
            </InlineStack>
          </BlockStack>
        </Card>
      )}
      
      {/* Description Points */}
      {recommendations.description && (
        <Card title="Description Improvements">
          <BlockStack gap="300">
            <Text variant="bodySm" tone="subdued">
              Key points to add:
            </Text>
            <List>
              {recommendations.description.keyPoints.map((point: string, i: number) => (
                <List.Item key={i}>{point}</List.Item>
              ))}
            </List>
            <Text variant="bodySm" tone="subdued">
              {recommendations.description.reason}
            </Text>
          </BlockStack>
        </Card>
      )}
      
      {/* Tags */}
      {recommendations.tags && (
        <Card title="Tag Optimization">
          <BlockStack gap="300">
            {recommendations.tags.add && recommendations.tags.add.length > 0 && (
              <BlockStack gap="200">
                <Text variant="bodySm" tone="subdued">Tags to add:</Text>
                <InlineStack gap="100">
                  {recommendations.tags.add.map((tag: string) => (
                    <Badge key={tag} tone="success">+ {tag}</Badge>
                  ))}
                </InlineStack>
              </BlockStack>
            )}
            
            {recommendations.tags.remove && recommendations.tags.remove.length > 0 && (
              <BlockStack gap="200">
                <Text variant="bodySm" tone="subdued">Tags to remove:</Text>
                <InlineStack gap="100">
                  {recommendations.tags.remove.map((tag: string) => (
                    <Badge key={tag} tone="critical">- {tag}</Badge>
                  ))}
                </InlineStack>
              </BlockStack>
            )}
            
            <Text variant="bodySm" tone="subdued">
              {recommendations.tags.reason}
            </Text>
          </BlockStack>
        </Card>
      )}
      
      {/* Quick Wins */}
      {recommendations.quickWins && recommendations.quickWins.length > 0 && (
        <Card title="🎯 Quick Wins">
          <List type="number">
            {recommendations.quickWins.map((win: string, i: number) => (
              <List.Item key={i}>{win}</List.Item>
            ))}
          </List>
        </Card>
      )}
      
      {/* Apply Button */}
      <Card>
        {canAutoApply ? (
          <Button primary fullWidth onClick={onApply}>
            ✨ Apply All Changes Automatically
          </Button>
        ) : (
          <BlockStack gap="200">
            <Button fullWidth disabled>
              Manual Application Required
            </Button>
            <Text variant="bodySm" tone="subdued" alignment="center">
              Upgrade to Growth or Pro plan for automatic application
            </Text>
          </BlockStack>
        )}
      </Card>
    </BlockStack>
  );
}
