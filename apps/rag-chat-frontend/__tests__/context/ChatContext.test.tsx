import React from 'react';
import { renderHook, act, waitFor } from '@testing-library/react';
import { ChatProvider, useChat } from '../../lib/context/ChatContext';
import { apiClient } from '../../lib/api/client';
import { ApiError } from '../../lib/api/errors';
import { ChatResponse } from '../../lib/api/types';

// Mock the API client
jest.mock('../../lib/api/client', () => ({
  apiClient: {
    chat: jest.fn(),
  },
}));

const mockedApiClient = apiClient as jest.Mocked<typeof apiClient>;

describe('ChatContext', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <ChatProvider>{children}</ChatProvider>
  );

  describe('useChat hook', () => {
    it('should throw error when used outside ChatProvider', () => {
      // Suppress console.error for this test
      const consoleError = jest.spyOn(console, 'error').mockImplementation();

      expect(() => {
        renderHook(() => useChat());
      }).toThrow('useChat must be used within a ChatProvider');

      consoleError.mockRestore();
    });

    it('should provide initial state', () => {
      const { result } = renderHook(() => useChat(), { wrapper });

      expect(result.current.messages).toEqual([]);
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBe(null);
      expect(result.current.conversationId).toBeUndefined();
    });
  });

  describe('sendMessage', () => {
    it('should successfully send a message', async () => {
      const mockResponse: ChatResponse = {
        message: {
          id: 'assistant-1',
          role: 'assistant',
          content: 'Hello! How can I help you?',
          createdAt: new Date().toISOString(),
        },
        conversationId: 'conv-123',
        agentId: 'agent-123',
      };

      mockedApiClient.chat.mockResolvedValueOnce(mockResponse);

      const { result } = renderHook(() => useChat(), { wrapper });

      await act(async () => {
        await result.current.sendMessage('agent-123', 'Hello');
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.messages).toHaveLength(2);
      expect(result.current.messages[0].role).toBe('user');
      expect(result.current.messages[0].content).toBe('Hello');
      expect(result.current.messages[1].role).toBe('assistant');
      expect(result.current.messages[1].content).toBe('Hello! How can I help you?');
      expect(result.current.conversationId).toBe('conv-123');
      expect(result.current.error).toBe(null);
    });

    it('should handle validation errors for empty agentId', async () => {
      const { result } = renderHook(() => useChat(), { wrapper });

      await act(async () => {
        await result.current.sendMessage('', 'Hello');
      });

      expect(result.current.error).toBe('Agent ID is required');
      expect(result.current.messages).toHaveLength(0);
      expect(mockedApiClient.chat).not.toHaveBeenCalled();
    });

    it('should handle validation errors for empty message', async () => {
      const { result } = renderHook(() => useChat(), { wrapper });

      await act(async () => {
        await result.current.sendMessage('agent-123', '');
      });

      expect(result.current.error).toBe('Message content is required');
      expect(result.current.messages).toHaveLength(0);
      expect(mockedApiClient.chat).not.toHaveBeenCalled();
    });

    it('should handle network errors', async () => {
      const networkError = new ApiError('Network request failed', 0, true);
      mockedApiClient.chat.mockRejectedValueOnce(networkError);

      const { result } = renderHook(() => useChat(), { wrapper });

      await act(async () => {
        await result.current.sendMessage('agent-123', 'Hello');
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.error).toContain('Network error');
      expect(result.current.messages).toHaveLength(0); // User message removed on error
    });

    it('should handle API errors', async () => {
      const apiError = new ApiError('Agent not found', 404);
      mockedApiClient.chat.mockRejectedValueOnce(apiError);

      const { result } = renderHook(() => useChat(), { wrapper });

      await act(async () => {
        await result.current.sendMessage('agent-123', 'Hello');
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.error).toContain('Agent not found');
      expect(result.current.messages).toHaveLength(0);
    });

    it('should set loading state during API call', async () => {
      const mockResponse: ChatResponse = {
        message: {
          id: 'assistant-1',
          role: 'assistant',
          content: 'Response',
          createdAt: new Date().toISOString(),
        },
        agentId: 'agent-123',
      };

      // Create a promise that we can control
      let resolvePromise: (value: ChatResponse) => void;
      const controlledPromise = new Promise<ChatResponse>((resolve) => {
        resolvePromise = resolve;
      });

      mockedApiClient.chat.mockReturnValueOnce(controlledPromise);

      const { result } = renderHook(() => useChat(), { wrapper });

      // Start sending message
      act(() => {
        result.current.sendMessage('agent-123', 'Hello');
      });

      // Check loading state is true
      await waitFor(() => {
        expect(result.current.isLoading).toBe(true);
      });

      // Resolve the promise
      await act(async () => {
        resolvePromise!(mockResponse);
      });

      // Check loading state is false after completion
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });
    });
  });

  describe('clearError', () => {
    it('should clear error state', async () => {
      const { result } = renderHook(() => useChat(), { wrapper });

      // Create an error first
      await act(async () => {
        await result.current.sendMessage('', 'Hello');
      });

      expect(result.current.error).toBe('Agent ID is required');

      // Clear the error
      act(() => {
        result.current.clearError();
      });

      expect(result.current.error).toBe(null);
    });
  });

  describe('resetChat', () => {
    it('should reset all chat state', async () => {
      const mockResponse: ChatResponse = {
        message: {
          id: 'assistant-1',
          role: 'assistant',
          content: 'Response',
          createdAt: new Date().toISOString(),
        },
        conversationId: 'conv-123',
        agentId: 'agent-123',
      };

      mockedApiClient.chat.mockResolvedValueOnce(mockResponse);

      const { result } = renderHook(() => useChat(), { wrapper });

      // Send a message first
      await act(async () => {
        await result.current.sendMessage('agent-123', 'Hello');
      });

      await waitFor(() => {
        expect(result.current.messages.length).toBeGreaterThan(0);
      });

      // Reset chat
      act(() => {
        result.current.resetChat();
      });

      expect(result.current.messages).toEqual([]);
      expect(result.current.error).toBe(null);
      expect(result.current.isLoading).toBe(false);
      expect(result.current.conversationId).toBeUndefined();
    });
  });

  describe('initialMessages', () => {
    it('should support initial messages', () => {
      const initialMessages = [
        {
          id: 'msg-1',
          role: 'user' as const,
          content: 'Initial message',
          createdAt: new Date().toISOString(),
        },
      ];

      const wrapperWithInitialMessages = ({ children }: { children: React.ReactNode }) => (
        <ChatProvider initialMessages={initialMessages}>{children}</ChatProvider>
      );

      const { result } = renderHook(() => useChat(), { wrapper: wrapperWithInitialMessages });

      expect(result.current.messages).toEqual(initialMessages);
    });
  });
});
