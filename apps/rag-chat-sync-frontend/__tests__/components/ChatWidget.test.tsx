/**
 * @jest-environment jsdom
 */

import '@testing-library/jest-dom';
import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ChatWidget from '@/components/ChatWidget';
import { ChatProvider } from '@/lib/context/ChatContext';
import { apiClient } from '@/lib/api/client';

// Mock the API client
jest.mock('@/lib/api/client');

// Mock ReactMarkdown to avoid complex rendering
jest.mock('react-markdown', () => {
  return function ReactMarkdown({ children }: { children: string }) {
    return <div>{children}</div>;
  };
});

// Mock scrollIntoView for tests
beforeAll(() => {
  Element.prototype.scrollIntoView = jest.fn();
  HTMLElement.prototype.scrollIntoView = jest.fn();
});

describe('ChatWidget Component', () => {
  const mockAgentId = 'test-agent-123';
  const mockedApiClient = apiClient as jest.Mocked<typeof apiClient>;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  /**
   * Helper function to render ChatWidget with ChatProvider
   */
  const renderChatWidget = (props = {}) => {
    return render(
      <ChatProvider>
        <ChatWidget agentId={mockAgentId} {...props} />
      </ChatProvider>
    );
  };

  describe('Rendering', () => {
    it('should render the ChatWidget component', () => {
      renderChatWidget();
      expect(screen.getByLabelText('Chat widget')).toBeInTheDocument();
    });

    it('should render with header in normal mode', () => {
      renderChatWidget();
      expect(screen.getByText('Chat Assistant')).toBeInTheDocument();
      expect(screen.getByText('Ask me anything!')).toBeInTheDocument();
    });

    it('should not render header in embed mode', () => {
      renderChatWidget({ embedMode: true });
      expect(screen.queryByText('Chat Assistant')).not.toBeInTheDocument();
    });

    it('should render embed mode footer', () => {
      renderChatWidget({ embedMode: true });
      expect(screen.getByText('Powered by AI Assistant')).toBeInTheDocument();
    });

    it('should not render embed footer in normal mode', () => {
      renderChatWidget({ embedMode: false });
      expect(screen.queryByText('Powered by AI Assistant')).not.toBeInTheDocument();
    });

    it('should render MessageList component', () => {
      renderChatWidget();
      expect(screen.getByText('No messages yet. Start a conversation!')).toBeInTheDocument();
    });

    it('should render MessageInput component', () => {
      renderChatWidget();
      expect(screen.getByPlaceholderText('Type your message...')).toBeInTheDocument();
    });

    it('should use embed placeholder in embed mode', () => {
      renderChatWidget({ embedMode: true });
      expect(screen.getByPlaceholderText('Type here...')).toBeInTheDocument();
    });

    it('should apply custom className', () => {
      renderChatWidget({ className: 'custom-class' });
      const widget = screen.getByLabelText('Chat widget');
      expect(widget).toHaveClass('custom-class');
    });
  });

  describe('Message Sending', () => {
    it('should send a message when user submits input', async () => {
      const user = userEvent.setup();
      mockedApiClient.chat.mockResolvedValue({
        message: {
          id: 'assistant-1',
          role: 'assistant',
          content: 'Test response',
          createdAt: new Date().toISOString(),
        },
        agentId: mockAgentId,
      });

      renderChatWidget();

      const input = screen.getByPlaceholderText('Type your message...');
      const sendButton = screen.getByRole('button', { name: /send message/i });

      // Type and send message
      await user.type(input, 'Hello, bot!');
      await user.click(sendButton);

      // Verify API was called
      await waitFor(() => {
        expect(mockedApiClient.chat).toHaveBeenCalledWith(
          mockAgentId,
          'Hello, bot!',
          undefined
        );
      });
    });

    it('should clear input after sending message', async () => {
      const user = userEvent.setup();
      mockedApiClient.chat.mockResolvedValue({
        message: {
          id: 'assistant-1',
          role: 'assistant',
          content: 'Test response',
          createdAt: new Date().toISOString(),
        },
        agentId: mockAgentId,
      });

      renderChatWidget();

      const input = screen.getByPlaceholderText('Type your message...') as HTMLTextAreaElement;
      const sendButton = screen.getByRole('button', { name: /send message/i });

      await user.type(input, 'Hello!');
      await user.click(sendButton);

      await waitFor(() => {
        expect(input.value).toBe('');
      });
    });
  });

  describe('Loading State', () => {
    it('should show loading indicator while message is processing', async () => {
      const user = userEvent.setup();

      // Create a promise that we can control
      let resolveChat: any;
      const chatPromise = new Promise((resolve) => {
        resolveChat = resolve;
      });
      mockedApiClient.chat.mockReturnValue(chatPromise as any);

      renderChatWidget();

      const input = screen.getByPlaceholderText('Type your message...');
      await user.type(input, 'Test message');

      const sendButton = screen.getByRole('button', { name: /send message/i });
      await user.click(sendButton);

      // Loading indicator should appear
      await waitFor(() => {
        expect(screen.getByText('Processing your message...')).toBeInTheDocument();
      });

      // Resolve the promise
      resolveChat({
        message: {
          id: 'assistant-1',
          role: 'assistant',
          content: 'Response',
          createdAt: new Date().toISOString(),
        },
        agentId: mockAgentId,
      });

      // Loading indicator should disappear
      await waitFor(() => {
        expect(screen.queryByText('Processing your message...')).not.toBeInTheDocument();
      });
    });

    it('should show embed loading message in embed mode', async () => {
      const user = userEvent.setup();

      let resolveChat: any;
      const chatPromise = new Promise((resolve) => {
        resolveChat = resolve;
      });
      mockedApiClient.chat.mockReturnValue(chatPromise as any);

      renderChatWidget({ embedMode: true });

      const input = screen.getByPlaceholderText('Type here...');
      await user.type(input, 'Test');

      const sendButton = screen.getByRole('button', { name: /send message/i });
      await user.click(sendButton);

      await waitFor(() => {
        expect(screen.getByText('Thinking...')).toBeInTheDocument();
      });

      resolveChat({
        message: {
          id: 'assistant-1',
          role: 'assistant',
          content: 'Response',
          createdAt: new Date().toISOString(),
        },
        agentId: mockAgentId,
      });
    });

    it('should disable input during loading', async () => {
      const user = userEvent.setup();

      let resolveChat: any;
      const chatPromise = new Promise((resolve) => {
        resolveChat = resolve;
      });
      mockedApiClient.chat.mockReturnValue(chatPromise as any);

      renderChatWidget();

      const input = screen.getByPlaceholderText('Type your message...');
      await user.type(input, 'Test');

      const sendButton = screen.getByRole('button', { name: /send message/i });
      await user.click(sendButton);

      await waitFor(() => {
        expect(input).toBeDisabled();
      });

      resolveChat({
        message: {
          id: 'assistant-1',
          role: 'assistant',
          content: 'Response',
          createdAt: new Date().toISOString(),
        },
        agentId: mockAgentId,
      });
    });
  });

  describe('Error Handling', () => {
    it('should display error message when API call fails', async () => {
      const user = userEvent.setup();
      const errorMessage = 'Network error occurred';
      mockedApiClient.chat.mockRejectedValue(new Error(errorMessage));

      renderChatWidget();

      const input = screen.getByPlaceholderText('Type your message...');
      await user.type(input, 'Test message');

      const sendButton = screen.getByRole('button', { name: /send message/i });
      await user.click(sendButton);

      await waitFor(() => {
        expect(screen.getByRole('alert')).toBeInTheDocument();
      });
    });

    it('should show retry button when error occurs', async () => {
      const user = userEvent.setup();
      mockedApiClient.chat.mockRejectedValue(new Error('Test error'));

      renderChatWidget();

      const input = screen.getByPlaceholderText('Type your message...');
      await user.type(input, 'Test');

      const sendButton = screen.getByRole('button', { name: /send message/i });
      await user.click(sendButton);

      await waitFor(() => {
        expect(screen.getByText('Retry')).toBeInTheDocument();
      });
    });

    it('should retry sending message when retry button is clicked', async () => {
      const user = userEvent.setup();

      // First attempt fails
      mockedApiClient.chat.mockRejectedValueOnce(new Error('Test error'));

      // Second attempt succeeds
      mockedApiClient.chat.mockResolvedValueOnce({
        message: {
          id: 'assistant-1',
          role: 'assistant',
          content: 'Success',
          createdAt: new Date().toISOString(),
        },
        agentId: mockAgentId,
      });

      renderChatWidget();

      const input = screen.getByPlaceholderText('Type your message...');
      await user.type(input, 'Test message');

      const sendButton = screen.getByRole('button', { name: /send message/i });
      await user.click(sendButton);

      // Wait for error to appear
      await waitFor(() => {
        expect(screen.getByText('Retry')).toBeInTheDocument();
      });

      // Click retry
      const retryButton = screen.getByText('Retry');
      await user.click(retryButton);

      // Verify API was called twice with same message
      await waitFor(() => {
        expect(mockedApiClient.chat).toHaveBeenCalledTimes(2);
        expect(mockedApiClient.chat).toHaveBeenLastCalledWith(
          mockAgentId,
          'Test message',
          undefined
        );
      });
    });

    it('should dismiss error when dismiss button is clicked', async () => {
      const user = userEvent.setup();
      mockedApiClient.chat.mockRejectedValue(new Error('Test error'));

      renderChatWidget();

      const input = screen.getByPlaceholderText('Type your message...');
      await user.type(input, 'Test');

      const sendButton = screen.getByRole('button', { name: /send message/i });
      await user.click(sendButton);

      await waitFor(() => {
        expect(screen.getByRole('alert')).toBeInTheDocument();
      });

      const dismissButton = screen.getByText('Dismiss');
      await user.click(dismissButton);

      await waitFor(() => {
        expect(screen.queryByRole('alert')).not.toBeInTheDocument();
      });
    });
  });

  describe('Message Display', () => {
    it('should display user and assistant messages', async () => {
      const user = userEvent.setup();
      mockedApiClient.chat.mockResolvedValue({
        message: {
          id: 'assistant-1',
          role: 'assistant',
          content: 'Hello! How can I help?',
          createdAt: new Date().toISOString(),
        },
        agentId: mockAgentId,
      });

      renderChatWidget();

      const input = screen.getByPlaceholderText('Type your message...');
      await user.type(input, 'Hi there!');

      const sendButton = screen.getByRole('button', { name: /send message/i });
      await user.click(sendButton);

      await waitFor(() => {
        expect(screen.getByText('Hi there!')).toBeInTheDocument();
        expect(screen.getByText('Hello! How can I help?')).toBeInTheDocument();
      });
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA labels', () => {
      renderChatWidget();

      expect(screen.getByLabelText('Chat widget')).toBeInTheDocument();
      expect(screen.getByLabelText('Message input')).toBeInTheDocument();
    });

    it('should announce loading state to screen readers', async () => {
      const user = userEvent.setup();

      let resolveChat: any;
      const chatPromise = new Promise((resolve) => {
        resolveChat = resolve;
      });
      mockedApiClient.chat.mockReturnValue(chatPromise as any);

      renderChatWidget();

      const input = screen.getByPlaceholderText('Type your message...');
      await user.type(input, 'Test');

      const sendButton = screen.getByRole('button', { name: /send message/i });
      await user.click(sendButton);

      await waitFor(() => {
        // Look for the div with aria-live="polite" that contains loading text
        const loadingDiv = screen.getByText('Processing your message...').closest('[aria-live="polite"]');
        expect(loadingDiv).toBeInTheDocument();
        expect(loadingDiv).toHaveAttribute('role', 'status');
      });

      resolveChat({
        message: {
          id: 'assistant-1',
          role: 'assistant',
          content: 'Response',
          createdAt: new Date().toISOString(),
        },
        agentId: mockAgentId,
      });
    });

    it('should announce errors to screen readers', async () => {
      const user = userEvent.setup();
      mockedApiClient.chat.mockRejectedValue(new Error('Test error'));

      renderChatWidget();

      const input = screen.getByPlaceholderText('Type your message...');
      await user.type(input, 'Test');

      const sendButton = screen.getByRole('button', { name: /send message/i });
      await user.click(sendButton);

      await waitFor(() => {
        const alert = screen.getByRole('alert');
        expect(alert).toHaveAttribute('aria-live', 'assertive');
      });
    });
  });

  describe('Integration with ChatContext', () => {
    it('should use agentId from props in API calls', async () => {
      const user = userEvent.setup();
      const customAgentId = 'custom-agent-456';

      mockedApiClient.chat.mockResolvedValue({
        message: {
          id: 'assistant-1',
          role: 'assistant',
          content: 'Response',
          createdAt: new Date().toISOString(),
        },
        agentId: customAgentId,
      });

      render(
        <ChatProvider>
          <ChatWidget agentId={customAgentId} />
        </ChatProvider>
      );

      const input = screen.getByPlaceholderText('Type your message...');
      await user.type(input, 'Test');

      const sendButton = screen.getByRole('button', { name: /send message/i });
      await user.click(sendButton);

      await waitFor(() => {
        expect(mockedApiClient.chat).toHaveBeenCalledWith(
          customAgentId,
          'Test',
          undefined
        );
      });
    });
  });
});
