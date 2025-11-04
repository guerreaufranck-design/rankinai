import React, { useState, useEffect, useRef } from 'react';
import { useChat } from '~/hooks/useChat';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  rating?: number;
  retryCount?: number;
}

export function ChatBot() {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [inputMessage, setInputMessage] = useState('');
  const [showNotification, setShowNotification] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  const {
    messages,
    isLoading,
    error,
    sendMessage,
    retryMessage,
    clearMessages,
    exportConversation,
    rateMessage
  } = useChat();

  const quickActions = [
    { label: "How to improve my products?", message: "How can I optimize my product listings to be better referenced by AI?" },
    { label: "View my scans", message: "Show me my latest AI citation scan results" },
    { label: "Manage credits", message: "What's my credit balance and how can I optimize it?" },
    { label: "Quick guide", message: "Give me a quick guide to get started with RankInAI" }
  ];

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (!isOpen) {
        setShowNotification(true);
      }
    }, 10000);
    return () => clearTimeout(timer);
  }, [isOpen]);

  const handleSendMessage = async (content: string = inputMessage) => {
    if (!content.trim()) return;
    setInputMessage('');
    await sendMessage(content);
  };

  const handleExport = () => {
    const content = exportConversation();
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `rankinai-chat-${new Date().toISOString()}.txt`;
    a.click();
  };

  // Bouton flottant
  if (!isOpen) {
    return (
      <div style={{
        position: 'fixed',
        bottom: '24px',
        right: '24px',
        zIndex: 9999
      }}>
        {showNotification && (
          <div style={{
            position: 'absolute',
            bottom: '70px',
            right: '0',
            background: 'white',
            borderRadius: '12px',
            padding: '12px 16px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
            minWidth: '250px',
            animation: 'slideIn 0.3s ease'
          }}>
            <button
              onClick={() => setShowNotification(false)}
              style={{
                position: 'absolute',
                top: '8px',
                right: '8px',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                padding: '4px',
                fontSize: '16px'
              }}
            >
              ✕
            </button>
            <p style={{ margin: 0, fontWeight: 600 }}>
              💡 Need help?
            </p>
            <p style={{ margin: '4px 0 0 0', fontSize: '14px', color: '#666' }}>
              I can help you optimize your products for AI!
            </p>
          </div>
        )}
        
        <button
          onClick={() => setIsOpen(true)}
          style={{
            width: '60px',
            height: '60px',
            borderRadius: '50%',
            background: 'linear-gradient(135deg, #5C6AC4 0%, #4A5BC4 100%)',
            border: 'none',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 4px 12px rgba(92, 106, 196, 0.4)',
            position: 'relative',
            animation: 'pulse 2s infinite',
            color: 'white',
            fontSize: '24px'
          }}
        >
          💬
          {messages.length > 0 && (
            <span style={{
              position: 'absolute',
              top: '-5px',
              right: '-5px',
              background: '#ff6b6b',
              color: 'white',
              borderRadius: '50%',
              width: '20px',
              height: '20px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '12px',
              fontWeight: 'bold'
            }}>
              {messages.length}
            </span>
          )}
        </button>

        <style>{`
          @keyframes pulse {
            0% { transform: scale(1); }
            50% { transform: scale(1.05); }
            100% { transform: scale(1); }
          }
          @keyframes slideIn {
            from {
              opacity: 0;
              transform: translateY(10px);
            }
            to {
              opacity: 1;
              transform: translateY(0);
            }
          }
        `}</style>
      </div>
    );
  }

  // Chat ouvert
  return (
    <div style={{
      position: 'fixed',
      bottom: '24px',
      right: '24px',
      width: isMinimized ? '320px' : '380px',
      height: isMinimized ? '60px' : '600px',
      background: 'white',
      borderRadius: '12px',
      boxShadow: '0 4px 24px rgba(0,0,0,0.15)',
      display: 'flex',
      flexDirection: 'column',
      zIndex: 9999,
      transition: 'all 0.3s ease'
    }}>
      {/* Header */}
      <div style={{
        background: 'linear-gradient(135deg, #5C6AC4 0%, #4A5BC4 100%)',
        padding: '16px',
        borderRadius: '12px 12px 0 0',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        color: 'white'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span>💬</span>
          <h3 style={{ margin: 0, fontSize: '16px' }}>RankInAI Assistant</h3>
          {isLoading && <span>⏳</span>}
        </div>
        
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            onClick={clearMessages}
            style={{
              background: 'none',
              border: 'none',
              color: 'white',
              cursor: 'pointer',
              fontSize: '18px'
            }}
            title="Clear"
          >
            🔄
          </button>
          <button
            onClick={handleExport}
            style={{
              background: 'none',
              border: 'none',
              color: 'white',
              cursor: 'pointer',
              fontSize: '18px'
            }}
            title="Export"
          >
            💾
          </button>
          <button
            onClick={() => setIsMinimized(!isMinimized)}
            style={{
              background: 'none',
              border: 'none',
              color: 'white',
              cursor: 'pointer',
              fontSize: '18px'
            }}
          >
            {isMinimized ? '⬆' : '⬇'}
          </button>
          <button
            onClick={() => setIsOpen(false)}
            style={{
              background: 'none',
              border: 'none',
              color: 'white',
              cursor: 'pointer',
              fontSize: '18px'
            }}
          >
            ✕
          </button>
        </div>
      </div>

      {!isMinimized && (
        <>
          {/* Messages */}
          <div style={{
            flex: 1,
            overflowY: 'auto',
            padding: '16px',
            background: '#f9fafb'
          }}>
            {messages.length === 0 && (
              <div style={{ textAlign: 'center' }}>
                <p style={{ fontSize: '16px' }}>👋 Hi! I'm your RankInAI AI assistant.</p>
                <p style={{ color: '#666', fontSize: '14px' }}>How can I help you today?</p>
                
                <div style={{ marginTop: '20px' }}>
                  {quickActions.map((action, index) => (
                    <button
                      key={index}
                      onClick={() => handleSendMessage(action.message)}
                      style={{
                        display: 'block',
                        width: '100%',
                        padding: '10px',
                        margin: '8px 0',
                        background: '#f3f4f6',
                        border: '1px solid #e5e7eb',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        textAlign: 'left',
                        fontSize: '14px'
                      }}
                    >
                      {action.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {messages.map((message) => (
              <div
                key={message.id}
                style={{
                  marginBottom: '12px',
                  display: 'flex',
                  justifyContent: message.role === 'user' ? 'flex-end' : 'flex-start'
                }}
              >
                <div style={{
                  maxWidth: '70%',
                  padding: '10px 14px',
                  borderRadius: '12px',
                  background: message.role === 'user' ? '#5C6AC4' : '#ffffff',
                  color: message.role === 'user' ? 'white' : 'black',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
                }}>
                  <p style={{ margin: 0 }}>{message.content}</p>
                  
                  {message.role === 'assistant' && (
                    <div style={{ marginTop: '8px', display: 'flex', gap: '4px' }}>
                      {[1, 2, 3, 4, 5].map((star) => (
                        <button
                          key={star}
                          onClick={() => rateMessage(message.id, star)}
                          style={{
                            background: 'none',
                            border: 'none',
                            cursor: 'pointer',
                            fontSize: '16px',
                            filter: (message.rating && star <= message.rating) ? 'none' : 'grayscale(100%)',
                            opacity: (message.rating && star <= message.rating) ? 1 : 0.3
                          }}
                        >
                          ⭐
                        </button>
                      ))}
                    </div>
                  )}
                  
                  {error && message.id === messages[messages.length - 1]?.id && (
                    <button
                      onClick={() => retryMessage(message.id)}
                      style={{
                        marginTop: '8px',
                        background: 'none',
                        border: 'none',
                        color: message.role === 'user' ? 'white' : '#5C6AC4',
                        cursor: 'pointer',
                        textDecoration: 'underline',
                        fontSize: '14px'
                      }}
                    >
                      🔄 Retry
                    </button>
                  )}
                </div>
              </div>
            ))}

            {isLoading && (
              <div style={{
                display: 'flex',
                alignItems: 'center',
                padding: '10px 14px',
                background: '#ffffff',
                borderRadius: '12px',
                width: 'fit-content',
                boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
              }}>
                <span>Typing...</span>
              </div>
            )}

            {error && !messages.length && (
              <div style={{ color: 'red', textAlign: 'center' }}>
                {error}
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div style={{
            padding: '16px',
            borderTop: '1px solid #e0e0e0',
            background: 'white',
            borderRadius: '0 0 12px 12px'
          }}>
            <div style={{ display: 'flex', gap: '8px' }}>
              <input
                type="text"
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSendMessage();
                  }
                }}
                placeholder="Type your message..."
                style={{
                  flex: 1,
                  padding: '10px',
                  border: '1px solid #ddd',
                  borderRadius: '6px',
                  fontSize: '14px',
                  outline: 'none'
                }}
              />
              <button
                onClick={() => handleSendMessage()}
                disabled={!inputMessage.trim() || isLoading}
                style={{
                  padding: '10px 20px',
                  background: !inputMessage.trim() || isLoading ? '#ccc' : '#5C6AC4',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: !inputMessage.trim() || isLoading ? 'not-allowed' : 'pointer',
                  fontSize: '14px',
                  fontWeight: '500'
                }}
              >
                Send
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}