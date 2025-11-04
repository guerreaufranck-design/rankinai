import { useState, useEffect, useCallback, useRef } from 'react';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  rating?: number;
  retryCount?: number;
}

interface ChatState {
  messages: Message[];
  isLoading: boolean;
  error: string | null;
  sessionId: string;
  lastActivity: Date;
}

interface ChatHookReturn {
  messages: Message[];
  isLoading: boolean;
  error: string | null;
  sendMessage: (content: string) => Promise<void>;
  retryMessage: (messageId: string) => Promise<void>;
  clearMessages: () => void;
  exportConversation: () => string;
  rateMessage: (messageId: string, rating: number) => void;
}

const STORAGE_KEY = 'rankinai_chat_session';
const SESSION_DURATION = 30 * 60 * 1000; // 30 minutes

export function useChat(): ChatHookReturn {
  const messageQueue = useRef<string[]>([]);
  const isProcessing = useRef(false);

  // Initialiser l'état (gérer SSR)
  const initializeState = (): ChatState => {
    // Vérifier si on est côté client
    if (typeof window === 'undefined') {
      return {
        messages: [],
        isLoading: false,
        error: null,
        sessionId: generateSessionId(),
        lastActivity: new Date()
      };
    }

    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        const lastActivity = new Date(parsed.lastActivity);
        const now = new Date();
        
        if (now.getTime() - lastActivity.getTime() < SESSION_DURATION) {
          return {
            ...parsed,
            messages: parsed.messages.map((m: any) => ({
              ...m,
              timestamp: new Date(m.timestamp)
            }))
          };
        }
      }
    } catch (error) {
      console.error('Error loading chat session:', error);
    }

    return {
      messages: [],
      isLoading: false,
      error: null,
      sessionId: generateSessionId(),
      lastActivity: new Date()
    };
  };

  const [state, setState] = useState<ChatState>(initializeState);

  // Charger depuis localStorage après le mount
  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    // Re-charger depuis localStorage au mount
    const loadFromStorage = () => {
      try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
          const parsed = JSON.parse(stored);
          const lastActivity = new Date(parsed.lastActivity);
          const now = new Date();
          
          if (now.getTime() - lastActivity.getTime() < SESSION_DURATION) {
            setState({
              ...parsed,
              messages: parsed.messages.map((m: any) => ({
                ...m,
                timestamp: new Date(m.timestamp)
              }))
            });
          }
        }
      } catch (error) {
        console.error('Error loading chat session:', error);
      }
    };

    loadFromStorage();
  }, []);

  // Sauvegarder dans localStorage
  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        ...state,
        lastActivity: new Date()
      }));
    } catch (error) {
      console.error('Error saving chat session:', error);
    }
  }, [state]);

  // Traiter la queue de messages
  const processMessageQueue = useCallback(async () => {
    if (isProcessing.current || messageQueue.current.length === 0) return;
    
    isProcessing.current = true;
    const content = messageQueue.current.shift();
    
    if (content) {
      try {
        const userMessage: Message = {
          id: generateMessageId(),
          role: 'user',
          content,
          timestamp: new Date()
        };

        setState(prev => ({
          ...prev,
          messages: [...prev.messages, userMessage],
          isLoading: true,
          error: null
        }));

        const response = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            message: content,
            sessionId: state.sessionId,
            context: {
              messages: state.messages.slice(-10),
              shopId: getShopId()
            }
          })
        });

        if (!response.ok) {
          throw new Error(`API error: ${response.status}`);
        }

        const data = await response.json();

        const assistantMessage: Message = {
          id: generateMessageId(),
          role: 'assistant',
          content: data.response,
          timestamp: new Date()
        };

        setState(prev => ({
          ...prev,
          messages: [...prev.messages, assistantMessage],
          isLoading: false,
          error: null
        }));

        trackEvent('CHAT_MESSAGE', {
          sessionId: state.sessionId,
          messageCount: state.messages.length + 2
        });

      } catch (error) {
        console.error('Error sending message:', error);
        setState(prev => ({
          ...prev,
          isLoading: false,
          error: 'Error sending message. Please try again.'
        }));
      }
    }

    isProcessing.current = false;
    
    if (messageQueue.current.length > 0) {
      setTimeout(() => processMessageQueue(), 100);
    }
  }, [state.sessionId, state.messages]);

  const sendMessage = useCallback(async (content: string) => {
    if (!content.trim()) return;
    
    messageQueue.current.push(content);
    await processMessageQueue();
  }, [processMessageQueue]);

  const retryMessage = useCallback(async (messageId: string) => {
    const messageIndex = state.messages.findIndex(m => m.id === messageId);
    if (messageIndex === -1) return;

    let lastUserMessage = null;
    for (let i = messageIndex - 1; i >= 0; i--) {
      if (state.messages[i].role === 'user') {
        lastUserMessage = state.messages[i];
        break;
      }
    }

    if (lastUserMessage) {
      setState(prev => ({
        ...prev,
        messages: prev.messages.slice(0, messageIndex)
      }));

      await sendMessage(lastUserMessage.content);
    }
  }, [state.messages, sendMessage]);

  const clearMessages = useCallback(() => {
    setState(prev => ({
      ...prev,
      messages: [],
      error: null,
      sessionId: generateSessionId()
    }));
    
    if (typeof window !== 'undefined') {
      localStorage.removeItem(STORAGE_KEY);
    }
    
    trackEvent('CHAT_CLEAR', {
      sessionId: state.sessionId
    });
  }, [state.sessionId]);

  const exportConversation = useCallback(() => {
    const header = `RankInAI Chat Export\nSession: ${state.sessionId}\nDate: ${new Date().toISOString()}\n${'='.repeat(50)}\n\n`;
    
    const content = state.messages.map(msg => {
      const role = msg.role === 'user' ? '👤 You' : '🤖 Assistant';
      const time = new Date(msg.timestamp).toLocaleTimeString();
      return `[${time}] ${role}:\n${msg.content}\n\n`;
    }).join('');

    trackEvent('CHAT_EXPORT', {
      sessionId: state.sessionId,
      messageCount: state.messages.length
    });

    return header + content;
  }, [state.messages, state.sessionId]);

  const rateMessage = useCallback((messageId: string, rating: number) => {
    setState(prev => ({
      ...prev,
      messages: prev.messages.map(msg =>
        msg.id === messageId ? { ...msg, rating } : msg
      )
    }));

    trackEvent('CHAT_RATING', {
      sessionId: state.sessionId,
      messageId,
      rating
    });
  }, [state.sessionId]);

  return {
    messages: state.messages,
    isLoading: state.isLoading,
    error: state.error,
    sendMessage,
    retryMessage,
    clearMessages,
    exportConversation,
    rateMessage
  };
}

// Fonctions utilitaires
function generateSessionId(): string {
  return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

function generateMessageId(): string {
  return `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

function getShopId(): string {
  if (typeof window !== 'undefined') {
    const shopDomain = new URLSearchParams(window.location.search).get('shop');
    return shopDomain || 'unknown';
  }
  return 'unknown';
}

function trackEvent(type: string, metadata: any) {
  if (typeof window === 'undefined') return;
  
  try {
    fetch('/api/events', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type,
        metadata,
        timestamp: new Date().toISOString()
      })
    }).catch(console.error);
  } catch (error) {
    console.error('Error tracking event:', error);
  }
}

export type { Message, ChatState, ChatHookReturn };