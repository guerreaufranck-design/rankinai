import { useState } from "react";
import {
  Button,
  Modal,
  TextField,
  BlockStack,
  Box,
  Text,
  Badge
} from "@shopify/polaris";

export function ChatWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState([
    {
      text: "Hello! How can I help you?",
      isBot: true
    }
  ]);

  const handleSend = () => {
    if (!message.trim()) return;
    
    setMessages(prev => [...prev, { text: message, isBot: false }]);
    
    // Simple automatic response
    setTimeout(() => {
      setMessages(prev => [...prev, { 
        text: "Thanks for your message! I'm analyzing your question...",
        isBot: true
      }]);
    }, 1000);
    
    setMessage("");
  };

  return (
    <>
      {/* Floating button */}
      <div style={{
        position: 'fixed',
        bottom: '20px',
        right: '20px',
        zIndex: 1000
      }}>
        <Button primary onClick={() => setIsOpen(true)}>
          💬 Need help?
        </Button>
      </div>

      {/* Chat modal */}
      <Modal
        open={isOpen}
        onClose={() => setIsOpen(false)}
        title="RankInAI Assistant"
      >
        <Modal.Section>
          <BlockStack gap="400">
            <Box minHeight="300px" maxHeight="400px" overflow="auto">
              <BlockStack gap="300">
                {messages.map((msg, i) => (
                  <Box
                    key={i}
                    padding="300"
                    background={msg.isBot ? 'bg-surface-secondary' : 'bg-surface-selected'}
                    borderRadius="100"
                  >
                    <BlockStack gap="100">
                      <Badge tone={msg.isBot ? 'success' : 'info'}>
                        {msg.isBot ? 'Bot' : 'You'}
                      </Badge>
                      <Text>{msg.text}</Text>
                    </BlockStack>
                  </Box>
                ))}
              </BlockStack>
            </Box>
            
            <TextField
              label=""
              value={message}
              onChange={setMessage}
              placeholder="Type your message..."
              connectedRight={
                <Button onClick={handleSend}>Send</Button>
              }
            />
          </BlockStack>
        </Modal.Section>
      </Modal>
    </>
  );
}
