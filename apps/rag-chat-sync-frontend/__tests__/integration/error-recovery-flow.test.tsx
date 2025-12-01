/**
 * Integration test for error recovery flows
 * Tests: Network errors, API errors, retry mechanisms, and graceful degradation
 *
 * @jest-environment jsdom
 */

import '@testing-library/jest-dom';
import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ChatProvider } from '@/lib/context/ChatContext';
import { AgentProvider } from '@/lib/context/KnowledgeContext';
import ChatWidget from '@/components/ChatWidget';
import CreateAgentForm from '@/components/CreateAgentForm';
import { apiClient } from '@/lib/api/client';
import { ApiError } from '@/lib/api/error';
import { clearAgents } from '@/lib/utils/storage';

// Mock the API client
jest.mock('@/lib/api/client');

// Mock react-markdown
jest.mock('react-markdown', () => {
  return function ReactMarkdown({ children }: { children: string }) {
    return <div>{children}</div>;
  };
});

// Mock router
const mockPush = jest.fn();
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
    back: jest.fn(),
    forward: jest.fn(),
    refresh: jest.fn(),
    replace: jest.fn(),
    prefetch: jest.fn(),
  }),
  usePathname: () => '/agents/create',
  useSearchParams: () => new URLSearchParams(),
}));

describe('Integration: Error Recovery Flows', () => {
  const mockedApiClient = apiClient as jest.Mocked<typeof apiClient>;
  const mockAgentId = 'test-agent-123';

  beforeEach(() => {
    jest.clearAllMocks();
    mockPush.mockClear();
    clearAgents();
    localStorage.clear();
  });

  describe('Chat Error Recovery', () => {
    it('should recover from network error with retry', async () => {
      const user = userEvent.setup();

      // First attempt: network error
      mockedApiClient.chat.mockRejectedValueOnce(
        new Error('Network error: Unable to connect')
      );

      // Second attempt: success
      mockedApiClient.chat.mockResolvedValueOnce({
        message: {
          id: 'assistant-1',
          role: 'assistant',
          content: 'Successfully recovered!',
          createdAt: new Date().toISOString(),
        },
        agentId: mockAgentId,
      });

      render(
        <ChatProvider>
          <ChatWidget agentId={mockAgentId} />
        </ChatProvider>
      );

      // Send message
      const input = screen.getByPlaceholderText('Type your message...');
      await user.type(input, 'Hello');

      const sendButton = screen.getByRole('button', { name: /send message/i });
      await user.click(sendButton);

      // Error should appear
      await waitFor(() => {
        expect(screen.getByRole('alert')).toBeInTheDocument();
        expect(screen.getByText(/network error/i)).toBeInTheDocument();
      });

      // User message should be removed after error
      expect(screen.queryByText('Hello')).not.toBeInTheDocument();

      // Retry
      const retryButton = screen.getByRole('button', { name: /retry/i });
      await user.click(retryButton);

      // Success message should appear
      await waitFor(() => {
        expect(screen.getByText('Successfully recovered!')).toBeInTheDocument();
      });

      // Error should be cleared
      expect(screen.queryByRole('alert')).not.toBeInTheDocument();

      // User message should now be visible
      expect(screen.getByText('Hello')).toBeInTheDocument();
    });

    it('should handle multiple consecutive errors with retries', async () => {
      const user = userEvent.setup();

      // Multiple failures followed by success
      mockedApiClient.chat
        .mockRejectedValueOnce(new Error('Network timeout'))
        .mockRejectedValueOnce(new Error('Server error'))
        .mockResolvedValueOnce({
          message: {
            id: 'assistant-1',
            role: 'assistant',
            content: 'Finally worked!',
            createdAt: new Date().toISOString(),
          },
          agentId: mockAgentId,
        });

      render(
        <ChatProvider>
          <ChatWidget agentId={mockAgentId} />
        </ChatProvider>
      );

      const input = screen.getByPlaceholderText('Type your message...');
      await user.type(input, 'Test');

      const sendButton = screen.getByRole('button', { name: /send message/i });
      await user.click(sendButton);

      // First error
      await waitFor(() => {
        expect(screen.getByText(/network timeout/i)).toBeInTheDocument();
      });

      // Retry
      let retryButton = screen.getByRole('button', { name: /retry/i });
      await user.click(retryButton);

      // Second error
      await waitFor(() => {
        expect(screen.getByText(/server error/i)).toBeInTheDocument();
      });

      // Retry again
      retryButton = screen.getByRole('button', { name: /retry/i });
      await user.click(retryButton);

      // Success
      await waitFor(() => {
        expect(screen.getByText('Finally worked!')).toBeInTheDocument();
      });

      expect(mockedApiClient.chat).toHaveBeenCalledTimes(3);
    });

    it('should allow dismissing errors and sending new messages', async () => {
      const user = userEvent.setup();

      // First message fails
      mockedApiClient.chat.mockRejectedValueOnce(new Error('Server error'));

      // Second message succeeds
      mockedApiClient.chat.mockResolvedValueOnce({
        message: {
          id: 'assistant-1',
          role: 'assistant',
          content: 'New message response',
          createdAt: new Date().toISOString(),
        },
        agentId: mockAgentId,
      });

      render(
        <ChatProvider>
          <ChatWidget agentId={mockAgentId} />
        </ChatProvider>
      );

      const input = screen.getByPlaceholderText('Type your message...');
      await user.type(input, 'First message');

      const sendButton = screen.getByRole('button', { name: /send message/i });
      await user.click(sendButton);

      // Error appears
      await waitFor(() => {
        expect(screen.getByRole('alert')).toBeInTheDocument();
      });

      // Dismiss error
      const dismissButton = screen.getByRole('button', { name: /dismiss/i });
      await user.click(dismissButton);

      // Error should be gone
      await waitFor(() => {
        expect(screen.queryByRole('alert')).not.toBeInTheDocument();
      });

      // Send new message
      await user.type(input, 'Second message');
      await user.click(sendButton);

      // Success
      await waitFor(() => {
        expect(screen.getByText('New message response')).toBeInTheDocument();
      });
    });

    it('should handle 401 authentication errors', async () => {
      const user = userEvent.setup();

      const authError = new ApiError('Unauthorized', 401);
      mockedApiClient.chat.mockRejectedValueOnce(authError);

      render(
        <ChatProvider>
          <ChatWidget agentId={mockAgentId} />
        </ChatProvider>
      );

      const input = screen.getByPlaceholderText('Type your message...');
      await user.type(input, 'Test');

      const sendButton = screen.getByRole('button', { name: /send message/i });
      await user.click(sendButton);

      // Auth error message should appear
      await waitFor(() => {
        expect(screen.getByText(/authentication error/i)).toBeInTheDocument();
      });
    });

    it('should handle 404 agent not found errors', async () => {
      const user = userEvent.setup();

      const notFoundError = new ApiError('Agent not found', 404);
      mockedApiClient.chat.mockRejectedValueOnce(notFoundError);

      render(
        <ChatProvider>
          <ChatWidget agentId={mockAgentId} />
        </ChatProvider>
      );

      const input = screen.getByPlaceholderText('Type your message...');
      await user.type(input, 'Test');

      const sendButton = screen.getByRole('button', { name: /send message/i });
      await user.click(sendButton);

      // Not found error message should appear
      await waitFor(() => {
        expect(screen.getByText(/agent not found/i)).toBeInTheDocument();
      });
    });

    it('should handle 429 rate limit errors', async () => {
      const user = userEvent.setup();

      const rateLimitError = new ApiError('Too many requests', 429);
      mockedApiClient.chat.mockRejectedValueOnce(rateLimitError);

      render(
        <ChatProvider>
          <ChatWidget agentId={mockAgentId} />
        </ChatProvider>
      );

      const input = screen.getByPlaceholderText('Type your message...');
      await user.type(input, 'Test');

      const sendButton = screen.getByRole('button', { name: /send message/i });
      await user.click(sendButton);

      // Rate limit error message should appear
      await waitFor(() => {
        expect(screen.getByText(/rate limit exceeded/i)).toBeInTheDocument();
      });
    });

    it('should handle 500 server errors', async () => {
      const user = userEvent.setup();

      const serverError = new ApiError('Internal server error', 500);
      mockedApiClient.chat.mockRejectedValueOnce(serverError);

      render(
        <ChatProvider>
          <ChatWidget agentId={mockAgentId} />
        </ChatProvider>
      );

      const input = screen.getByPlaceholderText('Type your message...');
      await user.type(input, 'Test');

      const sendButton = screen.getByRole('button', { name: /send message/i });
      await user.click(sendButton);

      // Server error message should appear
      await waitFor(() => {
        expect(screen.getByText(/server error/i)).toBeInTheDocument();
      });
    });
  });

  describe('Agent Creation Error Recovery', () => {
    it('should recover from knowledge base creation failure', async () => {
      const user = userEvent.setup();

      // First attempt fails
      mockedApiClient.createKnowledgeSpace.mockRejectedValueOnce(
        new Error('Failed to create knowledge space')
      );

      // Second attempt succeeds
      mockedApiClient.createKnowledgeSpace.mockResolvedValueOnce({
        knowledgeSpace: {
          id: 'ks-123',
          name: 'Test KB',
          type: 'web',
          lastUpdatedAt: new Date().toISOString(),
          urls: ['https://example.com'],
        },
      });

      mockedApiClient.createAgent.mockResolvedValueOnce({
        agent: {
          id: 'agent-123',
          name: 'Test Agent',
          description: 'Test',
          strictRAG: true,
          knowledgeSpaceId: 'ks-123',
        },
      });

      render(
        <AgentProvider>
          <CreateAgentForm />
        </AgentProvider>
      );

      // Fill form
      const nameInput = screen.getByLabelText(/knowledge space name/i);
      await user.type(nameInput, 'Test KB');

      const urlInput = screen.getByLabelText(/url/i);
      await user.type(urlInput, 'https://example.com');

      // Submit
      const createButton = screen.getByRole('button', { name: /create knowledge space/i });
      await user.click(createButton);

      // Error should appear
      await waitFor(() => {
        expect(screen.getByText(/failed to create knowledge space/i)).toBeInTheDocument();
      });

      // Retry
      const retryButton = screen.getByRole('button', { name: /retry/i });
      await user.click(retryButton);

      // Should proceed to agent creation
      await waitFor(() => {
        expect(screen.getByText(/configure.*agent/i)).toBeInTheDocument();
      }, { timeout: 3000 });

      expect(mockedApiClient.createKnowledgeSpace).toHaveBeenCalledTimes(2);
    });

    it('should recover from agent creation failure', async () => {
      const user = userEvent.setup();

      // Knowledge base creation succeeds
      mockedApiClient.createKnowledgeSpace.mockResolvedValueOnce({
        knowledgeSpace: {
          id: 'ks-123',
          name: 'Test KB',
          type: 'web',
          lastUpdatedAt: new Date().toISOString(),
          urls: ['https://example.com'],
        },
      });

      // First agent creation fails
      mockedApiClient.createAgent.mockRejectedValueOnce(
        new Error('Failed to create agent')
      );

      // Second agent creation succeeds
      mockedApiClient.createAgent.mockResolvedValueOnce({
        agent: {
          id: 'agent-123',
          name: 'Test Agent',
          description: 'Test',
          strictRAG: true,
          knowledgeSpaceId: 'ks-123',
        },
      });

      render(
        <AgentProvider>
          <CreateAgentForm />
        </AgentProvider>
      );

      // Create knowledge base
      const nameInput = screen.getByLabelText(/knowledge space name/i);
      await user.type(nameInput, 'Test KB');

      const urlInput = screen.getByLabelText(/url/i);
      await user.type(urlInput, 'https://example.com');

      const createKBButton = screen.getByRole('button', { name: /create knowledge space/i });
      await user.click(createKBButton);

      // Wait for agent form
      await waitFor(() => {
        expect(screen.getByText(/configure.*agent/i)).toBeInTheDocument();
      });

      // Fill agent form
      const agentNameInput = screen.getByLabelText(/agent name/i);
      await user.type(agentNameInput, 'Test Agent');

      const agentDescInput = screen.getByLabelText(/description/i);
      await user.type(agentDescInput, 'Test');

      // Submit agent form
      const createAgentButton = screen.getByRole('button', { name: /create agent/i });
      await user.click(createAgentButton);

      // Error should appear
      await waitFor(() => {
        expect(screen.getByText(/failed to create agent/i)).toBeInTheDocument();
      });

      // Retry
      const retryButton = screen.getByRole('button', { name: /retry/i });
      await user.click(retryButton);

      // Success message should appear
      await waitFor(() => {
        expect(screen.getByText(/agent created successfully/i)).toBeInTheDocument();
      });

      expect(mockedApiClient.createAgent).toHaveBeenCalledTimes(2);
    });

    it('should handle validation errors before API calls', async () => {
      const user = userEvent.setup();

      render(
        <AgentProvider>
          <CreateAgentForm />
        </AgentProvider>
      );

      // Try to submit without filling required fields
      const createButton = screen.getByRole('button', { name: /create knowledge space/i });
      await user.click(createButton);

      // Validation error should appear
      await waitFor(() => {
        expect(screen.getByText(/name is required/i)).toBeInTheDocument();
      });

      // API should not be called
      expect(mockedApiClient.createKnowledgeSpace).not.toHaveBeenCalled();

      // Fill in the name
      const nameInput = screen.getByLabelText(/knowledge space name/i);
      await user.type(nameInput, 'Test KB');

      // Try again
      await user.click(createButton);

      // Now different validation error (no URLs)
      await waitFor(() => {
        expect(screen.getByText(/at least one url is required/i)).toBeInTheDocument();
      });

      expect(mockedApiClient.createKnowledgeSpace).not.toHaveBeenCalled();
    });
  });

  describe('Graceful Degradation', () => {
    it('should continue working after partial failures in conversation', async () => {
      const user = userEvent.setup();

      // Message 1: Success
      mockedApiClient.chat.mockResolvedValueOnce({
        message: {
          id: 'assistant-1',
          role: 'assistant',
          content: 'Response 1',
          createdAt: new Date().toISOString(),
        },
        agentId: mockAgentId,
        conversationId: 'conv-123',
      });

      // Message 2: Fail
      mockedApiClient.chat.mockRejectedValueOnce(new Error('Temporary error'));

      // Message 3: Success
      mockedApiClient.chat.mockResolvedValueOnce({
        message: {
          id: 'assistant-3',
          role: 'assistant',
          content: 'Response 3',
          createdAt: new Date().toISOString(),
        },
        agentId: mockAgentId,
        conversationId: 'conv-123',
      });

      render(
        <ChatProvider>
          <ChatWidget agentId={mockAgentId} />
        </ChatProvider>
      );

      const input = screen.getByPlaceholderText('Type your message...');
      const sendButton = screen.getByRole('button', { name: /send message/i });

      // Message 1
      await user.type(input, 'Message 1');
      await user.click(sendButton);

      await waitFor(() => {
        expect(screen.getByText('Response 1')).toBeInTheDocument();
      });

      // Message 2 (fails)
      await user.type(input, 'Message 2');
      await user.click(sendButton);

      await waitFor(() => {
        expect(screen.getByRole('alert')).toBeInTheDocument();
      });

      // Dismiss error
      const dismissButton = screen.getByRole('button', { name: /dismiss/i });
      await user.click(dismissButton);

      // Message 3 (succeeds)
      await user.type(input, 'Message 3');
      await user.click(sendButton);

      await waitFor(() => {
        expect(screen.getByText('Response 3')).toBeInTheDocument();
      });

      // Both successful messages should be visible
      expect(screen.getByText('Message 1')).toBeInTheDocument();
      expect(screen.getByText('Response 1')).toBeInTheDocument();
      expect(screen.getByText('Message 3')).toBeInTheDocument();
      expect(screen.getByText('Response 3')).toBeInTheDocument();

      // Failed message should not be visible
      expect(screen.queryByText('Message 2')).not.toBeInTheDocument();
    });

    it('should handle empty or malformed API responses', async () => {
      const user = userEvent.setup();

      // Mock malformed response
      mockedApiClient.chat.mockResolvedValueOnce({
        message: {
          id: '',
          role: 'assistant',
          content: '',
          createdAt: new Date().toISOString(),
        },
        agentId: mockAgentId,
      } as any);

      render(
        <ChatProvider>
          <ChatWidget agentId={mockAgentId} />
        </ChatProvider>
      );

      const input = screen.getByPlaceholderText('Type your message...');
      await user.type(input, 'Test');

      const sendButton = screen.getByRole('button', { name: /send message/i });
      await user.click(sendButton);

      // Should not crash, message list should render
      await waitFor(() => {
        expect(screen.getByText('Test')).toBeInTheDocument();
      });
    });
  });

  describe('Connection Recovery', () => {
    it('should handle timeout errors with appropriate messaging', async () => {
      const user = userEvent.setup();

      const timeoutError = new Error('Request timeout');
      timeoutError.name = 'TimeoutError';
      mockedApiClient.chat.mockRejectedValueOnce(timeoutError);

      render(
        <ChatProvider>
          <ChatWidget agentId={mockAgentId} />
        </ChatProvider>
      );

      const input = screen.getByPlaceholderText('Type your message...');
      await user.type(input, 'Test');

      const sendButton = screen.getByRole('button', { name: /send message/i });
      await user.click(sendButton);

      // Timeout error message should appear
      await waitFor(() => {
        expect(screen.getByText(/timeout/i)).toBeInTheDocument();
      });
    });
  });
});
