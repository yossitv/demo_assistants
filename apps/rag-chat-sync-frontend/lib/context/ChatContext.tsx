'use client';

import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { apiClient } from '../api/client';
import { ApiError } from '../api/errors';
import { Message } from '../api/types';

/**
 * Chat state interface
 */
export interface ChatState {
  messages: Message[];
  isLoading: boolean;
  error: string | null;
  conversationId?: string;
}

/**
 * Chat context type interface
 */
export interface ChatContextType {
  // State
  messages: Message[];
  isLoading: boolean;
  error: string | null;
  conversationId?: string;

  // Actions
  sendMessage: (agentId: string, message: string) => Promise<void>;
  clearError: () => void;
  resetChat: () => void;
}

/**
 * Chat context
 */
const ChatContext = createContext<ChatContextType | undefined>(undefined);

/**
 * Chat provider props interface
 */
export interface ChatProviderProps {
  children: ReactNode;
  initialMessages?: Message[];
}

/**
 * Chat provider component that manages chat state
 */
export function ChatProvider({ children, initialMessages = [] }: ChatProviderProps) {
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [conversationId, setConversationId] = useState<string | undefined>(undefined);

  /**
   * Send a message to the agent
   */
  const sendMessage = useCallback(async (agentId: string, message: string) => {
    // Validate inputs
    if (!agentId || agentId.trim() === '') {
      setError('Agent ID is required');
      return;
    }

    if (!message || message.trim() === '') {
      setError('Message content is required');
      return;
    }

    // Clear any previous errors
    setError(null);

    // Set loading state
    setIsLoading(true);

    // Create user message
    const userMessage: Message = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: message.trim(),
      createdAt: new Date().toISOString(),
    };

    // Optimistically add user message to the UI
    setMessages(prev => [...prev, userMessage]);

    try {
      // Build conversation history for better context
      // Include previous messages plus the new user message
      const conversationHistory = messages.concat([userMessage]).map(msg => ({
        role: msg.role as 'user' | 'assistant' | 'system',
        content: msg.content,
      }));

      // Call the chat API with full conversation history
      const response = await apiClient.chat(agentId, conversationHistory, conversationId);

      // Update conversation ID if provided
      if (response.conversationId) {
        setConversationId(response.conversationId);
      }

      // Add assistant message to the UI
      setMessages(prev => [...prev, response.message]);
    } catch (err) {
      // Handle different types of errors
      if (err instanceof ApiError) {
        // Handle API errors with proper error messages
        if (err.isNetworkError) {
          setError('Network error: Unable to connect to the server. Please check your connection and try again.');
        } else if (err.statusCode === 401) {
          setError('Authentication error: Please check your credentials.');
        } else if (err.statusCode === 403) {
          setError('Access denied: You do not have permission to access this resource.');
        } else if (err.statusCode === 404) {
          setError('Agent not found: The requested agent does not exist.');
        } else if (err.statusCode === 429) {
          setError('Rate limit exceeded: Please wait a moment before trying again.');
        } else if (err.statusCode >= 500) {
          setError('Server error: The server encountered an error. Please try again later.');
        } else {
          // Use the error message from the API
          setError(err.message || 'An error occurred while sending your message.');
        }
      } else if (err instanceof Error) {
        // Handle generic JavaScript errors
        if (err.name === 'TimeoutError' || err.message.includes('timeout')) {
          setError('Request timeout: The server took too long to respond. Please try again.');
        } else {
          setError(`Error: ${err.message}`);
        }
      } else {
        // Handle unexpected error types
        setError('An unexpected error occurred. Please try again.');
      }

      // Remove the optimistic user message on error
      setMessages(prev => prev.filter(msg => msg.id !== userMessage.id));
    } finally {
      // Always clear loading state
      setIsLoading(false);
    }
  }, [conversationId, messages]);

  /**
   * Clear error state
   */
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  /**
   * Reset chat state (clear messages and conversation)
   */
  const resetChat = useCallback(() => {
    setMessages([]);
    setError(null);
    setIsLoading(false);
    setConversationId(undefined);
  }, []);

  // Context value
  const value: ChatContextType = {
    messages,
    isLoading,
    error,
    conversationId,
    sendMessage,
    clearError,
    resetChat,
  };

  return <ChatContext.Provider value={value}>{children}</ChatContext.Provider>;
}

/**
 * Custom hook to use chat context
 * @throws Error if used outside of ChatProvider
 */
export function useChat(): ChatContextType {
  const context = useContext(ChatContext);

  if (context === undefined) {
    throw new Error('useChat must be used within a ChatProvider');
  }

  return context;
}
