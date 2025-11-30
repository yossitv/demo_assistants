/**
 * @jest-environment jsdom
 *
 * Property-based tests for ChatContext state updates
 * Test Property 17: Chat state updates (validates Requirement 6.1)
 *
 * Requirement 6.1: WHEN a chat message is sent or received THEN the System SHALL update the global chat state
 *
 * Feature: web-mvp, Property 17: Chat state updates
 */

import React from 'react';
import * as fc from 'fast-check';
import { renderHook, act, waitFor } from '@testing-library/react';
import { ChatProvider, useChat } from '../../lib/context/ChatContext';
import { apiClient } from '../../lib/api/client';
import { ChatResponse, Message } from '../../lib/api/types';

// Mock the API client
jest.mock('../../lib/api/client', () => ({
  apiClient: {
    chat: jest.fn(),
  },
}));

const mockedApiClient = apiClient as jest.Mocked<typeof apiClient>;

describe('Property 17: Chat State Updates', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <ChatProvider>{children}</ChatProvider>
  );

  describe('Message State Updates', () => {
    it('Property: For any message sent, the chat state includes the user message', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 1, maxLength: 500 }), // message content
          fc.uuid(), // agentId
          async (messageContent, agentId) => {
            // Pre-condition: message must not be whitespace-only
            fc.pre(messageContent.trim().length > 0);

            // Clear mocks for each property run
            mockedApiClient.chat.mockClear();

            // Mock successful response
            const mockResponse: ChatResponse = {
              message: {
                id: 'assistant-1',
                role: 'assistant',
                content: 'Response',
                createdAt: new Date().toISOString(),
              },
              conversationId: 'conv-123',
              agentId: agentId,
            };
            mockedApiClient.chat.mockResolvedValueOnce(mockResponse);

            const { result } = renderHook(() => useChat(), { wrapper });

            // Send message
            await act(async () => {
              await result.current.sendMessage(agentId, messageContent);
            });

            await waitFor(() => {
              expect(result.current.isLoading).toBe(false);
            });

            // Verify user message is in state
            const userMessages = result.current.messages.filter(m => m.role === 'user');
            expect(userMessages.length).toBeGreaterThan(0);

            const lastUserMessage = userMessages[userMessages.length - 1];
            expect(lastUserMessage.content).toBe(messageContent.trim());
            expect(lastUserMessage.role).toBe('user');
          }
        ),
        { numRuns: 100 }
      );
    });

    it('Property: For any message received, the chat state includes the assistant message', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 1, maxLength: 500 }), // user message
          fc.string({ minLength: 1, maxLength: 1000 }), // assistant response
          fc.uuid(), // agentId
          async (userMessage, assistantResponse, agentId) => {
            // Pre-condition: messages must not be whitespace-only
            fc.pre(userMessage.trim().length > 0);
            fc.pre(assistantResponse.trim().length > 0);

            // Clear mocks for each property run
            mockedApiClient.chat.mockClear();

            // Mock successful response
            const mockResponse: ChatResponse = {
              message: {
                id: 'assistant-1',
                role: 'assistant',
                content: assistantResponse,
                createdAt: new Date().toISOString(),
              },
              conversationId: 'conv-123',
              agentId: agentId,
            };
            mockedApiClient.chat.mockResolvedValueOnce(mockResponse);

            const { result } = renderHook(() => useChat(), { wrapper });

            // Send message
            await act(async () => {
              await result.current.sendMessage(agentId, userMessage);
            });

            await waitFor(() => {
              expect(result.current.isLoading).toBe(false);
            });

            // Verify assistant message is in state
            const assistantMessages = result.current.messages.filter(m => m.role === 'assistant');
            expect(assistantMessages.length).toBeGreaterThan(0);

            const lastAssistantMessage = assistantMessages[assistantMessages.length - 1];
            expect(lastAssistantMessage.content).toBe(assistantResponse);
            expect(lastAssistantMessage.role).toBe('assistant');
          }
        ),
        { numRuns: 100 }
      );
    });

    it('Property: Message count increases by 2 for each successful send (user + assistant)', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 1, maxLength: 500 }),
          fc.uuid(),
          async (message, agentId) => {
            // Pre-condition: message must not be whitespace-only
            fc.pre(message.trim().length > 0);

            // Clear mocks for each property run
            mockedApiClient.chat.mockClear();

            // Mock successful response
            const mockResponse: ChatResponse = {
              message: {
                id: 'assistant-1',
                role: 'assistant',
                content: 'Response',
                createdAt: new Date().toISOString(),
              },
              conversationId: 'conv-123',
              agentId: agentId,
            };
            mockedApiClient.chat.mockResolvedValueOnce(mockResponse);

            const { result } = renderHook(() => useChat(), { wrapper });

            const initialCount = result.current.messages.length;

            // Send message
            await act(async () => {
              await result.current.sendMessage(agentId, message);
            });

            await waitFor(() => {
              expect(result.current.isLoading).toBe(false);
            });

            // Verify message count increased by 2
            expect(result.current.messages.length).toBe(initialCount + 2);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('Property: Multiple messages accumulate in state in order', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(fc.string({ minLength: 1, maxLength: 200 }), { minLength: 1, maxLength: 5 }),
          fc.uuid(),
          async (messages, agentId) => {
            // Pre-condition: all messages must not be whitespace-only
            fc.pre(messages.every(m => m.trim().length > 0));

            // Clear mocks for each property run
            mockedApiClient.chat.mockClear();

            const { result } = renderHook(() => useChat(), { wrapper });

            // Send messages sequentially
            for (let i = 0; i < messages.length; i++) {
              const mockResponse: ChatResponse = {
                message: {
                  id: `assistant-${i}`,
                  role: 'assistant',
                  content: `Response ${i}`,
                  createdAt: new Date().toISOString(),
                },
                conversationId: 'conv-123',
                agentId: agentId,
              };
              mockedApiClient.chat.mockResolvedValueOnce(mockResponse);

              await act(async () => {
                await result.current.sendMessage(agentId, messages[i]);
              });

              await waitFor(() => {
                expect(result.current.isLoading).toBe(false);
              });
            }

            // Verify all messages are in state
            expect(result.current.messages.length).toBe(messages.length * 2);

            // Verify order: user, assistant, user, assistant, ...
            for (let i = 0; i < messages.length; i++) {
              const userMsgIndex = i * 2;
              const assistantMsgIndex = i * 2 + 1;

              expect(result.current.messages[userMsgIndex].role).toBe('user');
              expect(result.current.messages[userMsgIndex].content).toBe(messages[i].trim());

              expect(result.current.messages[assistantMsgIndex].role).toBe('assistant');
              expect(result.current.messages[assistantMsgIndex].content).toBe(`Response ${i}`);
            }
          }
        ),
        { numRuns: 50 }
      );
    });
  });

  describe('State Update Invariants', () => {
    it('Property: User message is always added before API call completes', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 1, maxLength: 500 }),
          fc.uuid(),
          async (message, agentId) => {
            // Pre-condition: message must not be whitespace-only
            fc.pre(message.trim().length > 0);

            // Clear mocks for each property run
            mockedApiClient.chat.mockClear();

            // Create a controlled promise to delay response
            let resolvePromise: (value: ChatResponse) => void;
            const controlledPromise = new Promise<ChatResponse>((resolve) => {
              resolvePromise = resolve;
            });
            mockedApiClient.chat.mockReturnValueOnce(controlledPromise);

            const { result } = renderHook(() => useChat(), { wrapper });

            // Start sending message
            act(() => {
              result.current.sendMessage(agentId, message);
            });

            // Wait for loading state
            await waitFor(() => {
              expect(result.current.isLoading).toBe(true);
            });

            // Verify user message is already in state (optimistic update)
            const userMessages = result.current.messages.filter(m => m.role === 'user');
            expect(userMessages.length).toBe(1);
            expect(userMessages[0].content).toBe(message.trim());

            // Resolve the promise
            await act(async () => {
              resolvePromise!({
                message: {
                  id: 'assistant-1',
                  role: 'assistant',
                  content: 'Response',
                  createdAt: new Date().toISOString(),
                },
                conversationId: 'conv-123',
                agentId: agentId,
              });
            });

            await waitFor(() => {
              expect(result.current.isLoading).toBe(false);
            });
          }
        ),
        { numRuns: 50 }
      );
    });

    it('Property: Failed messages are removed from state', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 1, maxLength: 500 }),
          fc.uuid(),
          fc.integer({ min: 400, max: 599 }), // HTTP error codes
          async (message, agentId, errorCode) => {
            // Pre-condition: message must not be whitespace-only
            fc.pre(message.trim().length > 0);

            // Clear mocks for each property run
            mockedApiClient.chat.mockClear();

            // Mock error response
            const error = new Error('API Error');
            (error as any).statusCode = errorCode;
            mockedApiClient.chat.mockRejectedValueOnce(error);

            const { result } = renderHook(() => useChat(), { wrapper });

            const initialCount = result.current.messages.length;

            // Send message
            await act(async () => {
              await result.current.sendMessage(agentId, message);
            });

            await waitFor(() => {
              expect(result.current.isLoading).toBe(false);
            });

            // Verify message count is unchanged (user message was removed)
            expect(result.current.messages.length).toBe(initialCount);
            expect(result.current.error).not.toBeNull();
          }
        ),
        { numRuns: 50 }
      );
    });

    it('Property: ConversationId is updated when received from API', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 1, maxLength: 500 }),
          fc.uuid(), // agentId
          fc.uuid(), // conversationId
          async (message, agentId, conversationId) => {
            // Pre-condition: message must not be whitespace-only
            fc.pre(message.trim().length > 0);

            // Clear mocks for each property run
            mockedApiClient.chat.mockClear();

            // Mock successful response with conversationId
            const mockResponse: ChatResponse = {
              message: {
                id: 'assistant-1',
                role: 'assistant',
                content: 'Response',
                createdAt: new Date().toISOString(),
              },
              conversationId: conversationId,
              agentId: agentId,
            };
            mockedApiClient.chat.mockResolvedValueOnce(mockResponse);

            const { result } = renderHook(() => useChat(), { wrapper });

            // Initially no conversationId
            expect(result.current.conversationId).toBeUndefined();

            // Send message
            await act(async () => {
              await result.current.sendMessage(agentId, message);
            });

            await waitFor(() => {
              expect(result.current.isLoading).toBe(false);
            });

            // Verify conversationId is updated
            expect(result.current.conversationId).toBe(conversationId);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('Property: ConversationId persists across multiple messages', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(fc.string({ minLength: 1, maxLength: 200 }), { minLength: 2, maxLength: 5 }),
          fc.uuid(), // agentId
          fc.uuid(), // conversationId
          async (messages, agentId, conversationId) => {
            // Pre-condition: all messages must not be whitespace-only
            fc.pre(messages.every(m => m.trim().length > 0));

            // Clear mocks for each property run
            mockedApiClient.chat.mockClear();

            const { result } = renderHook(() => useChat(), { wrapper });

            // Send first message with conversationId
            const firstResponse: ChatResponse = {
              message: {
                id: 'assistant-0',
                role: 'assistant',
                content: 'Response 0',
                createdAt: new Date().toISOString(),
              },
              conversationId: conversationId,
              agentId: agentId,
            };
            mockedApiClient.chat.mockResolvedValueOnce(firstResponse);

            await act(async () => {
              await result.current.sendMessage(agentId, messages[0]);
            });

            await waitFor(() => {
              expect(result.current.isLoading).toBe(false);
            });

            // Verify conversationId is set
            expect(result.current.conversationId).toBe(conversationId);

            // Send subsequent messages
            for (let i = 1; i < messages.length; i++) {
              const mockResponse: ChatResponse = {
                message: {
                  id: `assistant-${i}`,
                  role: 'assistant',
                  content: `Response ${i}`,
                  createdAt: new Date().toISOString(),
                },
                conversationId: conversationId,
                agentId: agentId,
              };
              mockedApiClient.chat.mockResolvedValueOnce(mockResponse);

              await act(async () => {
                await result.current.sendMessage(agentId, messages[i]);
              });

              await waitFor(() => {
                expect(result.current.isLoading).toBe(false);
              });

              // Verify conversationId persists
              expect(result.current.conversationId).toBe(conversationId);
            }
          }
        ),
        { numRuns: 30 }
      );
    });
  });

  describe('State Reset Behavior', () => {
    it('Property: Reset clears all messages regardless of count', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(fc.string({ minLength: 1, maxLength: 200 }), { minLength: 0, maxLength: 10 }),
          fc.uuid(),
          async (messages, agentId) => {
            // Pre-condition: all messages must not be whitespace-only
            fc.pre(messages.every(m => m.trim().length > 0));

            // Clear mocks for each property run
            mockedApiClient.chat.mockClear();

            const { result } = renderHook(() => useChat(), { wrapper });

            // Send all messages
            for (let i = 0; i < messages.length; i++) {
              const mockResponse: ChatResponse = {
                message: {
                  id: `assistant-${i}`,
                  role: 'assistant',
                  content: `Response ${i}`,
                  createdAt: new Date().toISOString(),
                },
                conversationId: 'conv-123',
                agentId: agentId,
              };
              mockedApiClient.chat.mockResolvedValueOnce(mockResponse);

              await act(async () => {
                await result.current.sendMessage(agentId, messages[i]);
              });

              await waitFor(() => {
                expect(result.current.isLoading).toBe(false);
              });
            }

            // Reset chat
            act(() => {
              result.current.resetChat();
            });

            // Verify all state is cleared
            expect(result.current.messages).toEqual([]);
            expect(result.current.error).toBeNull();
            expect(result.current.isLoading).toBe(false);
            expect(result.current.conversationId).toBeUndefined();
          }
        ),
        { numRuns: 50 }
      );
    });
  });

  describe('Initial State with Messages', () => {
    it('Property: Initial messages are preserved in state', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(
            fc.record({
              id: fc.uuid(),
              role: fc.constantFrom('user' as const, 'assistant' as const),
              content: fc.string({ minLength: 1, maxLength: 500 }),
              createdAt: fc.date().map(d => d.toISOString()),
            }),
            { minLength: 1, maxLength: 10 }
          ),
          async (initialMessages) => {
            const wrapperWithInitial = ({ children }: { children: React.ReactNode }) => (
              <ChatProvider initialMessages={initialMessages}>{children}</ChatProvider>
            );

            const { result } = renderHook(() => useChat(), { wrapper: wrapperWithInitial });

            // Verify initial messages are in state
            expect(result.current.messages).toEqual(initialMessages);
            expect(result.current.messages.length).toBe(initialMessages.length);
          }
        ),
        { numRuns: 50 }
      );
    });

    it('Property: New messages append to initial messages', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(
            fc.record({
              id: fc.uuid(),
              role: fc.constantFrom('user' as const, 'assistant' as const),
              content: fc.string({ minLength: 1, maxLength: 500 }),
              createdAt: fc.date().map(d => d.toISOString()),
            }),
            { minLength: 1, maxLength: 5 }
          ),
          fc.string({ minLength: 1, maxLength: 500 }),
          fc.uuid(),
          async (initialMessages, newMessage, agentId) => {
            // Pre-condition: new message must not be whitespace-only
            fc.pre(newMessage.trim().length > 0);

            // Clear mocks for each property run
            mockedApiClient.chat.mockClear();

            const wrapperWithInitial = ({ children }: { children: React.ReactNode }) => (
              <ChatProvider initialMessages={initialMessages}>{children}</ChatProvider>
            );

            const mockResponse: ChatResponse = {
              message: {
                id: 'assistant-new',
                role: 'assistant',
                content: 'New response',
                createdAt: new Date().toISOString(),
              },
              conversationId: 'conv-123',
              agentId: agentId,
            };
            mockedApiClient.chat.mockResolvedValueOnce(mockResponse);

            const { result } = renderHook(() => useChat(), { wrapper: wrapperWithInitial });

            const initialCount = result.current.messages.length;

            // Send new message
            await act(async () => {
              await result.current.sendMessage(agentId, newMessage);
            });

            await waitFor(() => {
              expect(result.current.isLoading).toBe(false);
            });

            // Verify new messages are appended
            expect(result.current.messages.length).toBe(initialCount + 2);

            // Verify initial messages are still there
            for (let i = 0; i < initialMessages.length; i++) {
              expect(result.current.messages[i]).toEqual(initialMessages[i]);
            }
          }
        ),
        { numRuns: 30 }
      );
    });
  });
});
