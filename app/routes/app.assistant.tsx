import { useState } from "react";
import { useNavigate } from "react-router";
import {
  AppProvider,
  Page,
  Layout,
  Card,
  Text,
  TextField,
  Button,
  BlockStack,
  Box,
  Badge,
  Divider
} from "@shopify/polaris";
import enTranslations from '@shopify/polaris/locales/en.json';

type Message = {
  id: string;
  text: string;
  sender: 'user' | 'bot';
  timestamp: Date;
};

export default function Assistant() {
  const navigate = useNavigate();
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      text: "👋 Hello! I'm the RankInAI assistant. How can I help you optimize your products for ChatGPT and Gemini?",
      sender: 'bot',
      timestamp: new Date()
    }
  ]);
  const [inputMessage, setInputMessage] = useState("");
  const [isTyping, setIsTyping] = useState(false);

  const suggestions = [
    "How can I improve my citation rate?",
    "What is citation rate?",
    "How does a scan work?",
    "How many credits do I have?",
    "Which plan do you recommend?"
  ];

  const handleSendMessage = async () => {
    if (!inputMessage.trim()) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      text: inputMessage,
      sender: 'user',
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputMessage("");
    setIsTyping(true);

    // Simulate bot response
    setTimeout(() => {
      const botResponse: Message = {
        id: (Date.now() + 1).toString(),
        text: getBotResponse(inputMessage),
        sender: 'bot',
        timestamp: new Date()
      };
      setMessages(prev => [...prev, botResponse]);
      setIsTyping(false);
    }, 1500);
  };

  const getBotResponse = (message: string): string => {
    const lowerMessage = message.toLowerCase();
    
    if (lowerMessage.includes("citation rate")) {
      return "Citation Rate is the percentage of times your product is mentioned by ChatGPT and Gemini when asked about your product category. The higher it is, the more visible your product becomes!";
    }
    if (lowerMessage.includes("credit")) {
      return "You currently have 50 credits. Each simple scan costs 1 credit, and a complete scan costs 3 credits.";
    }
    if (lowerMessage.includes("scan")) {
      return "A scan tests whether your product is cited by ChatGPT and Gemini. The complete scan (3 credits) includes both AIs plus personalized recommendations.";
    }
    if (lowerMessage.includes("plan")) {
      return "I recommend the Growth plan at €79/month if you have between 50 and 200 products. It offers 500 credits/month and automatic optimization application!";
    }
    if (lowerMessage.includes("improve")) {
      return "To improve your citation rate: 1) Optimize your titles with precise keywords, 2) Add detailed descriptions, 3) Use relevant tags, 4) Follow our AI recommendations after each scan.";
    }
    
    return "Great question! For a more precise answer, feel free to run a scan of your products or check our documentation. What else can I explain for you?";
  };

  const handleSuggestionClick = (suggestion: string) => {
    setInputMessage(suggestion);
  };

  return (
    <AppProvider i18n={enTranslations}>
      <Page
        title="AI Assistant"
        subtitle="Your expert in AI optimization"
        backAction={{
          content: "Back",
          onAction: () => navigate("/app")
        }}
      >
        <Layout>
          <Layout.Section>
            <Card>
              {/* Messages area */}
              <Box minHeight="400px" maxHeight="500px" overflow="auto" padding="400">
                <BlockStack gap="400">
                  {messages.map((message) => (
                    <Box 
                      key={message.id}
                      padding="300"
                      background={message.sender === 'user' ? 'bg-surface-selected' : 'bg-surface-secondary'}
                      borderRadius="100"
                    >
                      <BlockStack gap="200">
                        <Badge tone={message.sender === 'user' ? 'info' : 'success'}>
                          {message.sender === 'user' ? 'You' : 'Assistant'}
                        </Badge>
                        <Text variant="bodyMd">{message.text}</Text>
                        <Text variant="bodySm" tone="subdued">
                          {message.timestamp.toLocaleTimeString()}
                        </Text>
                      </BlockStack>
                    </Box>
                  ))}
                  
                  {isTyping && (
                    <Box padding="300" background="bg-surface-secondary" borderRadius="100">
                      <Text variant="bodyMd" tone="subdued">
                        Assistant is typing...
                      </Text>
                    </Box>
                  )}
                </BlockStack>
              </Box>
              
              <Divider />
              
              {/* Quick suggestions */}
              <Box padding="300">
                <BlockStack gap="200">
                  <Text variant="bodySm" tone="subdued">Suggested questions:</Text>
                  <Box>
                    {suggestions.map((suggestion, i) => (
                      <Button
                        key={i}
                        plain
                        monochrome
                        size="slim"
                        onClick={() => handleSuggestionClick(suggestion)}
                      >
                        {suggestion}
                      </Button>
                    ))}
                  </Box>
                </BlockStack>
              </Box>
              
              <Divider />
              
              {/* Input area */}
              <Box padding="400">
                <BlockStack gap="300">
                  <TextField
                    label=""
                    value={inputMessage}
                    onChange={setInputMessage}
                    placeholder="Ask your question..."
                    autoComplete="off"
                    connectedRight={
                      <Button primary onClick={handleSendMessage}>
                        Send
                      </Button>
                    }
                  />
                </BlockStack>
              </Box>
            </Card>
          </Layout.Section>
        </Layout>
      </Page>
    </AppProvider>
  );
}
