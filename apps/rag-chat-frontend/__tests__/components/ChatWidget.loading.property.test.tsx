/**
 * @jest-environment jsdom
 *
 * Property-based tests for ChatWidget loading indicator
 * Property 8.2: loading state reflects chat API promise lifecycle
 */

import '@testing-library/jest-dom';
import React from 'react';
import * as fc from 'fast-check';
import { render, screen, waitFor, cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ChatWidget from '@/components/ChatWidget';
import { ChatProvider } from '@/lib/context/ChatContext';
import { apiClient } from '@/lib/api/client';

jest.mock('@/lib/api/client', () => ({
  apiClient: {
    chat: jest.fn(),
  },
}));

jest.mock('react-markdown', () => {
  return function MockReactMarkdown({ children }: { children: string }) {
    return <div>{children}</div>;
  };
});

const mockedApiClient = apiClient as jest.Mocked<typeof apiClient>;

jest.setTimeout(20000);

describe('ChatWidget Property Tests (8.2)', () => {
  beforeAll(() => {
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: jest.fn().mockImplementation((query) => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: jest.fn(),
        removeListener: jest.fn(),
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
        dispatchEvent: jest.fn(),
      })),
    });
  });

  afterEach(() => {
    cleanup();
    mockedApiClient.chat.mockReset();
  });

  const renderWidget = (embedMode: boolean) =>
    render(
      <ChatProvider>
        <ChatWidget agentId="agent-prop" embedMode={embedMode} />
      </ChatProvider>
    );

  it('Property 8.2: shows loading while chat promise is pending and hides after resolve', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc
          .string({ minLength: 1, maxLength: 200 })
          .filter((value) => value.trim().length > 0),
        fc.boolean(),
        async (message, embedMode) => {
          mockedApiClient.chat.mockReset();
          cleanup();

          let resolveChat: (value: unknown) => void;
          const chatPromise = new Promise((resolve) => {
            resolveChat = resolve;
          });
          mockedApiClient.chat.mockReturnValueOnce(chatPromise as any);

          const user = userEvent.setup();
          try {
            renderWidget(embedMode);

            const input = screen.getByPlaceholderText(
              embedMode ? 'Type here...' : 'Type your message...'
            );
            await user.type(input, message);
            await user.click(screen.getByRole('button', { name: /send message/i }));

            const loadingText = embedMode ? 'Thinking...' : 'Processing your message...';

            await waitFor(() => {
              expect(screen.getByText(loadingText)).toBeInTheDocument();
            });

            resolveChat!({
              message: {
                id: 'assistant-1',
                role: 'assistant',
                content: 'ok',
                createdAt: new Date().toISOString(),
              },
              agentId: 'agent-prop',
            });

            await waitFor(() => {
              expect(screen.queryByText(loadingText)).not.toBeInTheDocument();
            });
          } finally {
            cleanup();
          }
        }
      ),
      { numRuns: 10 }
    );
  });
});
