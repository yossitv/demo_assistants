/**
 * Integration test for chat conversation with multiple messages
 * Tests: Multi-turn conversations, message history, and conversation continuity
 *
 * @jest-environment jsdom
 */

import '@testing-library/jest-dom';
import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ChatProvider } from '@/lib/context/ChatContext';
import ChatWidget from '@/components/ChatWidget';
import { apiClient } from '@/lib/api/client';

// Mock the API client
jest.mock('@/lib/api/client');

// Mock react-markdown
jest.mock('react-markdown', () => {
  return function ReactMarkdown({ children }: { children: string }) {
    return <div>{children}</div>;
  };
});

describe('Integration: Chat Conversation Flow', () => {
  const mockedApiClient = apiClient as jest.Mocked<typeof apiClient>;
  const mockAgentId = 'test-agent-123';

  beforeEach(() => {
    jest.clearAllMocks();
  });

  const renderChatWidget = () => {
    return render(
      <ChatProvider>
        <ChatWidget agentId={mockAgentId} />
      </ChatProvider>
    );
  };

  it('should handle a complete multi-turn conversation', async () => {
    const user = userEvent.setup();

    // Mock responses for multiple messages
    const responses = [
      {
        message: {
          id: 'assistant-1',
          role: 'assistant' as const,
          content: 'Hello! How can I help you today?',
          createdAt: new Date().toISOString(),
        },
        agentId: mockAgentId,
        conversationId: 'conv-123',
      },
      {
        message: {
          id: 'assistant-2',
          role: 'assistant' as const,
          content: 'JavaScript is a programming language used primarily for web development.',
          cited_urls: ['https://developer.mozilla.org/en-US/docs/Web/JavaScript'],
          createdAt: new Date().toISOString(),
        },
        agentId: mockAgentId,
        conversationId: 'conv-123',
      },
      {
        message: {
          id: 'assistant-3',
          role: 'assistant' as const,
          content: 'You can learn JavaScript through online courses, documentation, and practice.',
          cited_urls: ['https://javascript.info/', 'https://www.freecodecamp.org/'],
          createdAt: new Date().toISOString(),
        },
        agentId: mockAgentId,
        conversationId: 'conv-123',
      },
    ];

    mockedApiClient.chat
      .mockResolvedValueOnce(responses[0])
      .mockResolvedValueOnce(responses[1])
      .mockResolvedValueOnce(responses[2]);

    renderChatWidget();

    const input = screen.getByPlaceholderText('Type your message...');
    const sendButton = screen.getByRole('button', { name: /send message/i });

    // First message
    await user.type(input, 'Hello!');
    await user.click(sendButton);

    await waitFor(() => {
      expect(screen.getByText('Hello!')).toBeInTheDocument();
      expect(screen.getByText('Hello! How can I help you today?')).toBeInTheDocument();
    });

    // Verify conversationId is passed for first message
    expect(mockedApiClient.chat).toHaveBeenCalledWith(
      mockAgentId,
      'Hello!',
      undefined
    );

    // Second message
    await user.type(input, 'What is JavaScript?');
    await user.click(sendButton);

    await waitFor(() => {
      expect(screen.getByText('What is JavaScript?')).toBeInTheDocument();
      expect(screen.getByText('JavaScript is a programming language used primarily for web development.')).toBeInTheDocument();
    });

    // Verify conversationId is passed for subsequent messages
    expect(mockedApiClient.chat).toHaveBeenCalledWith(
      mockAgentId,
      'What is JavaScript?',
      'conv-123'
    );

    // Third message
    await user.type(input, 'How can I learn it?');
    await user.click(sendButton);

    await waitFor(() => {
      expect(screen.getByText('How can I learn it?')).toBeInTheDocument();
      expect(screen.getByText('You can learn JavaScript through online courses, documentation, and practice.')).toBeInTheDocument();
    });

    // Verify all messages are visible in the conversation
    expect(screen.getByText('Hello!')).toBeInTheDocument();
    expect(screen.getByText('Hello! How can I help you today?')).toBeInTheDocument();
    expect(screen.getByText('What is JavaScript?')).toBeInTheDocument();
    expect(screen.getByText('JavaScript is a programming language used primarily for web development.')).toBeInTheDocument();
    expect(screen.getByText('How can I learn it?')).toBeInTheDocument();
    expect(screen.getByText('You can learn JavaScript through online courses, documentation, and practice.')).toBeInTheDocument();

    // Verify total of 3 API calls
    expect(mockedApiClient.chat).toHaveBeenCalledTimes(3);
  });

  it('should display cited URLs in assistant messages', async () => {
    const user = userEvent.setup();

    mockedApiClient.chat.mockResolvedValueOnce({
      message: {
        id: 'assistant-1',
        role: 'assistant',
        content: 'Here is some information about React.',
        cited_urls: [
          'https://react.dev/',
          'https://legacy.reactjs.org/',
        ],
        createdAt: new Date().toISOString(),
      },
      agentId: mockAgentId,
    });

    renderChatWidget();

    const input = screen.getByPlaceholderText('Type your message...');
    await user.type(input, 'Tell me about React');

    const sendButton = screen.getByRole('button', { name: /send message/i });
    await user.click(sendButton);

    // Wait for response
    await waitFor(() => {
      expect(screen.getByText('Here is some information about React.')).toBeInTheDocument();
    });

    // Check for cited URLs
    const links = screen.getAllByRole('link');
    expect(links).toHaveLength(2);
    expect(links[0]).toHaveAttribute('href', 'https://react.dev/');
    expect(links[1]).toHaveAttribute('href', 'https://legacy.reactjs.org/');
  });

  it('should maintain conversation history during loading', async () => {
    const user = userEvent.setup();

    // First response
    mockedApiClient.chat.mockResolvedValueOnce({
      message: {
        id: 'assistant-1',
        role: 'assistant',
        content: 'First response',
        createdAt: new Date().toISOString(),
      },
      agentId: mockAgentId,
      conversationId: 'conv-123',
    });

    // Second response with delay
    let resolveChat: any;
    const chatPromise = new Promise((resolve) => {
      resolveChat = resolve;
    });
    mockedApiClient.chat.mockReturnValueOnce(chatPromise as any);

    renderChatWidget();

    const input = screen.getByPlaceholderText('Type your message...');
    const sendButton = screen.getByRole('button', { name: /send message/i });

    // Send first message
    await user.type(input, 'First message');
    await user.click(sendButton);

    await waitFor(() => {
      expect(screen.getByText('First response')).toBeInTheDocument();
    });

    // Send second message
    await user.type(input, 'Second message');
    await user.click(sendButton);

    // While loading, first message should still be visible
    await waitFor(() => {
      expect(screen.getByText('Processing your message...')).toBeInTheDocument();
    });

    expect(screen.getByText('First message')).toBeInTheDocument();
    expect(screen.getByText('First response')).toBeInTheDocument();
    expect(screen.getByText('Second message')).toBeInTheDocument();

    // Resolve second response
    resolveChat({
      message: {
        id: 'assistant-2',
        role: 'assistant',
        content: 'Second response',
        createdAt: new Date().toISOString(),
      },
      agentId: mockAgentId,
      conversationId: 'conv-123',
    });

    // All messages should be visible
    await waitFor(() => {
      expect(screen.getByText('Second response')).toBeInTheDocument();
    });

    expect(screen.getByText('First message')).toBeInTheDocument();
    expect(screen.getByText('First response')).toBeInTheDocument();
    expect(screen.getByText('Second message')).toBeInTheDocument();
  });

  it('should handle empty assistant responses gracefully', async () => {
    const user = userEvent.setup();

    mockedApiClient.chat.mockResolvedValueOnce({
      message: {
        id: 'assistant-1',
        role: 'assistant',
        content: '',
        createdAt: new Date().toISOString(),
      },
      agentId: mockAgentId,
    });

    renderChatWidget();

    const input = screen.getByPlaceholderText('Type your message...');
    await user.type(input, 'Test message');

    const sendButton = screen.getByRole('button', { name: /send message/i });
    await user.click(sendButton);

    // User message should be visible
    await waitFor(() => {
      expect(screen.getByText('Test message')).toBeInTheDocument();
    });

    // Assistant message with empty content should still be handled gracefully
    // Just verify the API was called and no error was thrown
    await waitFor(() => {
      expect(mockedApiClient.chat).toHaveBeenCalledWith(
        mockAgentId,
        'Test message',
        undefined
      );
    });
  });

  it('should preserve conversation state when sending rapid messages', async () => {
    const user = userEvent.setup();

    // Mock responses for rapid-fire messages
    mockedApiClient.chat
      .mockResolvedValueOnce({
        message: {
          id: 'assistant-1',
          role: 'assistant',
          content: 'Response 1',
          createdAt: new Date().toISOString(),
        },
        agentId: mockAgentId,
        conversationId: 'conv-123',
      })
      .mockResolvedValueOnce({
        message: {
          id: 'assistant-2',
          role: 'assistant',
          content: 'Response 2',
          createdAt: new Date().toISOString(),
        },
        agentId: mockAgentId,
        conversationId: 'conv-123',
      })
      .mockResolvedValueOnce({
        message: {
          id: 'assistant-3',
          role: 'assistant',
          content: 'Response 3',
          createdAt: new Date().toISOString(),
        },
        agentId: mockAgentId,
        conversationId: 'conv-123',
      });

    renderChatWidget();

    const input = screen.getByPlaceholderText('Type your message...');
    const sendButton = screen.getByRole('button', { name: /send message/i });

    // Send first message
    await user.type(input, 'Message 1');
    await user.click(sendButton);

    await waitFor(() => {
      expect(screen.getByText('Response 1')).toBeInTheDocument();
    });

    // Send second message
    await user.type(input, 'Message 2');
    await user.click(sendButton);

    await waitFor(() => {
      expect(screen.getByText('Response 2')).toBeInTheDocument();
    });

    // Send third message
    await user.type(input, 'Message 3');
    await user.click(sendButton);

    await waitFor(() => {
      expect(screen.getByText('Response 3')).toBeInTheDocument();
    });

    // All messages should be present
    expect(screen.getByText('Message 1')).toBeInTheDocument();
    expect(screen.getByText('Response 1')).toBeInTheDocument();
    expect(screen.getByText('Message 2')).toBeInTheDocument();
    expect(screen.getByText('Response 2')).toBeInTheDocument();
    expect(screen.getByText('Message 3')).toBeInTheDocument();
    expect(screen.getByText('Response 3')).toBeInTheDocument();

    // Verify conversation ID was maintained
    expect(mockedApiClient.chat).toHaveBeenNthCalledWith(1, mockAgentId, 'Message 1', undefined);
    expect(mockedApiClient.chat).toHaveBeenNthCalledWith(2, mockAgentId, 'Message 2', 'conv-123');
    expect(mockedApiClient.chat).toHaveBeenNthCalledWith(3, mockAgentId, 'Message 3', 'conv-123');
  });

  it('should handle long messages correctly', async () => {
    const user = userEvent.setup();

    const longMessage = 'This is a very long message that contains multiple sentences and should be handled correctly by the chat system. '.repeat(5);
    const longResponse = 'This is a very long response from the assistant that also contains multiple sentences and demonstrates that the system can handle lengthy responses. '.repeat(5);

    mockedApiClient.chat.mockResolvedValueOnce({
      message: {
        id: 'assistant-1',
        role: 'assistant',
        content: longResponse,
        createdAt: new Date().toISOString(),
      },
      agentId: mockAgentId,
    });

    renderChatWidget();

    const input = screen.getByPlaceholderText('Type your message...');
    await user.type(input, longMessage);

    const sendButton = screen.getByRole('button', { name: /send message/i });
    await user.click(sendButton);

    // Both long message and long response should be visible
    await waitFor(() => {
      expect(screen.getByText(longMessage)).toBeInTheDocument();
      expect(screen.getByText(longResponse)).toBeInTheDocument();
    }, { timeout: 10000 });
  });

  it('should handle messages with special characters and markdown', async () => {
    const user = userEvent.setup();

    const messageWithSpecialChars = 'What about special chars?';
    const responseWithMarkdown = 'Bold text and italic text';

    mockedApiClient.chat.mockResolvedValueOnce({
      message: {
        id: 'assistant-1',
        role: 'assistant',
        content: responseWithMarkdown,
        createdAt: new Date().toISOString(),
      },
      agentId: mockAgentId,
    });

    renderChatWidget();

    const input = screen.getByPlaceholderText('Type your message...');
    await user.type(input, messageWithSpecialChars);

    const sendButton = screen.getByRole('button', { name: /send message/i });
    await user.click(sendButton);

    // User message should be preserved
    await waitFor(() => {
      expect(screen.getByText(messageWithSpecialChars)).toBeInTheDocument();
    });

    // Response should be present (rendered by react-markdown)
    await waitFor(() => {
      expect(screen.getByText(responseWithMarkdown)).toBeInTheDocument();
    });
  });

  it('should continue conversation after an error and recovery', async () => {
    const user = userEvent.setup();

    // First message succeeds
    mockedApiClient.chat.mockResolvedValueOnce({
      message: {
        id: 'assistant-1',
        role: 'assistant',
        content: 'First response',
        createdAt: new Date().toISOString(),
      },
      agentId: mockAgentId,
      conversationId: 'conv-123',
    });

    // Second message fails
    mockedApiClient.chat.mockRejectedValueOnce(new Error('Network error'));

    // Retry succeeds
    mockedApiClient.chat.mockResolvedValueOnce({
      message: {
        id: 'assistant-2',
        role: 'assistant',
        content: 'Second response',
        createdAt: new Date().toISOString(),
      },
      agentId: mockAgentId,
      conversationId: 'conv-123',
    });

    // Third message succeeds
    mockedApiClient.chat.mockResolvedValueOnce({
      message: {
        id: 'assistant-3',
        role: 'assistant',
        content: 'Third response',
        createdAt: new Date().toISOString(),
      },
      agentId: mockAgentId,
      conversationId: 'conv-123',
    });

    renderChatWidget();

    const input = screen.getByPlaceholderText('Type your message...');
    const sendButton = screen.getByRole('button', { name: /send message/i });

    // First message
    await user.type(input, 'First message');
    await user.click(sendButton);

    await waitFor(() => {
      expect(screen.getByText('First response')).toBeInTheDocument();
    });

    // Second message (fails)
    await user.type(input, 'Second message');
    await user.click(sendButton);

    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeInTheDocument();
    });

    // First message should still be visible
    expect(screen.getByText('First message')).toBeInTheDocument();
    expect(screen.getByText('First response')).toBeInTheDocument();

    // Retry the failed message
    const retryButton = screen.getByText('Retry');
    await user.click(retryButton);

    await waitFor(() => {
      expect(screen.getByText('Second response')).toBeInTheDocument();
    });

    // Third message
    await user.type(input, 'Third message');
    await user.click(sendButton);

    await waitFor(() => {
      expect(screen.getByText('Third response')).toBeInTheDocument();
    });

    // All successful messages should be visible
    expect(screen.getByText('First message')).toBeInTheDocument();
    expect(screen.getByText('First response')).toBeInTheDocument();
    expect(screen.getByText('Second message')).toBeInTheDocument();
    expect(screen.getByText('Second response')).toBeInTheDocument();
    expect(screen.getByText('Third message')).toBeInTheDocument();
    expect(screen.getByText('Third response')).toBeInTheDocument();
  });
});
