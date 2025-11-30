/**
 * @jest-environment jsdom
 *
 * Property-based tests for ChatContext chat API calls
 * Property 8.1: chat requests include full history and propagate conversationId
 */

import React from 'react';
import * as fc from 'fast-check';
import { renderHook, act, waitFor, cleanup } from '@testing-library/react';
import { ChatProvider, useChat } from '@/lib/context/ChatContext';
import { apiClient } from '@/lib/api/client';
import { Message } from '@/lib/api/types';

jest.mock('@/lib/api/client', () => ({
  apiClient: {
    chat: jest.fn(),
  },
}));

const mockedApiClient = apiClient as jest.Mocked<typeof apiClient>;

describe('ChatContext API Property Tests (8.1)', () => {
  const messageArbitrary = fc.record({
    id: fc.uuid(),
    role: fc.constantFrom('user' as const, 'assistant' as const),
    content: fc
      .string({ minLength: 1, maxLength: 200 })
      .filter((value) => value.trim().length > 0),
    createdAt: fc.date().map((date) => date.toISOString()),
  });

  afterEach(() => {
    cleanup();
    mockedApiClient.chat.mockReset();
  });

  it('Property 8.1: sendMessage calls chat with existing history plus trimmed user message', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(messageArbitrary, { minLength: 0, maxLength: 4 }),
        fc
          .string({ minLength: 1, maxLength: 200 })
          .filter((value) => value.trim().length > 0),
        fc.string({ minLength: 3, maxLength: 80 }),
        fc.uuid(),
        async (initialMessages, newUserMessage, assistantReply, agentId) => {
          mockedApiClient.chat.mockReset();
          const normalizedInitial: Message[] = initialMessages.map((message, index) => ({
            ...message,
            id: `${message.id}-${index}`,
          }));

          mockedApiClient.chat.mockResolvedValueOnce({
            message: {
              id: 'assistant-response',
              role: 'assistant',
              content: assistantReply,
              createdAt: new Date().toISOString(),
            },
            conversationId: 'conversation-1',
            agentId,
          });

          const wrapper = ({ children }: { children: React.ReactNode }) => (
            <ChatProvider initialMessages={normalizedInitial}>{children}</ChatProvider>
          );

          const { result, unmount } = renderHook(() => useChat(), { wrapper });

          await act(async () => {
            await result.current.sendMessage(agentId, ` ${newUserMessage} `);
          });

          const expectedHistory = normalizedInitial
            .map((message) => ({
              role: message.role as 'user' | 'assistant' | 'system',
              content: message.content,
            }))
            .concat([{ role: 'user' as const, content: newUserMessage.trim() }]);

          const [, historyArg, conversationArg] = mockedApiClient.chat.mock.calls[0];
          expect(historyArg).toEqual(expectedHistory);
          expect(conversationArg).toBeUndefined();

          unmount();
        }
      ),
      { numRuns: 30 }
    );
  });

  it('Property 8.1: subsequent calls reuse conversationId and expanded history', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc
          .string({ minLength: 1, maxLength: 120 })
          .filter((value) => value.trim().length > 0),
        fc
          .string({ minLength: 1, maxLength: 120 })
          .filter((value) => value.trim().length > 0),
        fc.uuid(),
        fc.uuid(),
        async (firstMessage, secondMessage, agentId, conversationId) => {
          mockedApiClient.chat.mockReset();
          mockedApiClient.chat.mockResolvedValueOnce({
            message: {
              id: 'assistant-first',
              role: 'assistant',
              content: 'first reply',
              createdAt: new Date().toISOString(),
            },
            conversationId,
            agentId,
          });

          const wrapper = ({ children }: { children: React.ReactNode }) => (
            <ChatProvider>{children}</ChatProvider>
          );

          const { result, unmount } = renderHook(() => useChat(), { wrapper });

          await act(async () => {
            await result.current.sendMessage(agentId, firstMessage);
          });

          await waitFor(() => {
            expect(result.current.conversationId).toBe(conversationId);
            expect(result.current.messages.length).toBe(2);
          });

          const historyBeforeSecond = result.current.messages.map((message) => ({
            role: message.role as 'user' | 'assistant' | 'system',
            content: message.content,
          }));

          mockedApiClient.chat.mockResolvedValueOnce({
            message: {
              id: 'assistant-second',
              role: 'assistant',
              content: 'second reply',
              createdAt: new Date().toISOString(),
            },
            conversationId,
            agentId,
          });

          await act(async () => {
            await result.current.sendMessage(agentId, ` ${secondMessage} `);
          });

          const [, historyArg, conversationArg] = mockedApiClient.chat.mock.calls[1];
          expect(historyArg).toEqual(
            historyBeforeSecond.concat([{ role: 'user' as const, content: secondMessage.trim() }])
          );
          expect(conversationArg).toBe(conversationId);

          unmount();
        }
      ),
      { numRuns: 20 }
    );
  });
});
