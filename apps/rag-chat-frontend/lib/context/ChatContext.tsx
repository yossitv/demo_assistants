'use client';

import React, { createContext, useContext, useState, useCallback, ReactNode, useRef } from 'react';
import { apiClient } from '../api/client';
import { ApiError } from '../api/errors';
import { Message } from '../api/types';

export interface ChatState {
  messages: Message[];
  isLoading: boolean;
  error: string | null;
  conversationId?: string;
}

export interface ChatContextType {
  messages: Message[];
  isLoading: boolean;
  error: string | null;
  conversationId?: string;
  sendMessage: (agentId: string, message: string) => Promise<void>;
  stopStreaming: () => void;
  clearError: () => void;
  resetChat: () => void;
}

const ChatContext = createContext<ChatContextType | undefined>(undefined);

export interface ChatProviderProps {
  children: ReactNode;
  initialMessages?: Message[];
  useStreaming?: boolean;
}

export function ChatProvider({ children, initialMessages = [], useStreaming = true }: ChatProviderProps) {
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [conversationId, setConversationId] = useState<string | undefined>(undefined);
  const abortControllerRef = useRef<AbortController | null>(null);

  const sendMessage = useCallback(async (agentId: string, message: string) => {
    if (!agentId || agentId.trim() === '') {
      setError('Agent ID is required');
      return;
    }

    if (!message || message.trim() === '') {
      setError('Message content is required');
      return;
    }

    setError(null);
    setIsLoading(true);

    const userMessage: Message = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: message.trim(),
      createdAt: new Date().toISOString(),
    };

    setMessages(prev => [...prev, userMessage]);

    const assistantMessageId = `assistant-${Date.now()}`;
    const assistantMessage: Message = {
      id: assistantMessageId,
      role: 'assistant',
      content: '',
      cited_urls: [],
      createdAt: new Date().toISOString(),
    };

    try {
      const conversationHistory = messages.concat([userMessage]).map(msg => ({
        role: msg.role as 'user' | 'assistant' | 'system',
        content: msg.content,
      }));

      if (useStreaming) {
        abortControllerRef.current = new AbortController();
        setMessages(prev => [...prev, assistantMessage]);

        for await (const chunk of apiClient.chatStream(
          agentId,
          conversationHistory,
          abortControllerRef.current.signal
        )) {
          setMessages(prev =>
            prev.map(msg =>
              msg.id === assistantMessageId
                ? {
                    ...msg,
                    content: msg.content + (chunk.content || ''),
                    cited_urls: chunk.citedUrls ?? msg.cited_urls,
                  }
                : msg
            )
          );
        }
      } else {
        const response = await apiClient.chat(agentId, conversationHistory, conversationId);
        if (response.conversationId) {
          setConversationId(response.conversationId);
        }
        setMessages(prev => [...prev, response.message]);
      }
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') {
        // Stream was stopped by user
        return;
      }

      if (err instanceof ApiError) {
        if (err.isNetworkError) {
          setError('Network error: Unable to connect to the server.');
        } else if (err.statusCode === 401) {
          setError('Authentication error: Please check your credentials.');
        } else if (err.statusCode === 403) {
          setError('Access denied.');
        } else if (err.statusCode === 404) {
          setError('Agent not found.');
        } else if (err.statusCode === 429) {
          setError('Rate limit exceeded. Please wait.');
        } else if (err.statusCode && err.statusCode >= 500) {
          setError('Server error. Please try again later.');
        } else {
          setError(err.message || 'An error occurred.');
        }
      } else if (err instanceof Error) {
        if (err.name === 'TimeoutError' || err.message.includes('timeout')) {
          setError('Request timeout. Please try again.');
        } else {
          setError(`Error: ${err.message}`);
        }
      } else {
        setError('An unexpected error occurred.');
      }

      setMessages(prev => prev.filter(msg => msg.id !== userMessage.id && msg.id !== assistantMessageId));
    } finally {
      setIsLoading(false);
      abortControllerRef.current = null;
    }
  }, [conversationId, messages, useStreaming]);

  const stopStreaming = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
      setIsLoading(false);
    }
  }, []);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const resetChat = useCallback(() => {
    setMessages([]);
    setError(null);
    setIsLoading(false);
    setConversationId(undefined);
  }, []);

  const value: ChatContextType = {
    messages,
    isLoading,
    error,
    conversationId,
    sendMessage,
    stopStreaming,
    clearError,
    resetChat,
  };

  return <ChatContext.Provider value={value}>{children}</ChatContext.Provider>;
}

export function useChat(): ChatContextType {
  const context = useContext(ChatContext);

  if (context === undefined) {
    throw new Error('useChat must be used within a ChatProvider');
  }

  return context;
}
