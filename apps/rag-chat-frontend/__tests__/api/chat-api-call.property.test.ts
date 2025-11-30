/**
 * Property-based tests for chat API call correctness
 * Test Property 1: Chat API call correctness (validates Requirement 1.2)
 *
 * Requirement 1.2: WHEN the User submits a message THEN the System SHALL send a POST request 
 * to `/v1/chat/completions` with model set to agentId and messages array in OpenAI format
 *
 * Feature: web-mvp, Property 1: Chat API call correctness
 */

import * as fc from 'fast-check';
import { ApiClient } from '@/lib/api/client';

// Mock global fetch
global.fetch = jest.fn();

describe('Property 1: Chat API Call Correctness', () => {
  let mockFetch: jest.MockedFunction<typeof fetch>;
  let originalEnv: NodeJS.ProcessEnv;

  beforeEach(() => {
    // Save and clear environment variables
    originalEnv = process.env;
    process.env = { ...originalEnv };
    delete process.env.NEXT_PUBLIC_JWT_TOKEN;
    delete process.env.NEXT_PUBLIC_API_BASE_URL;

    // Reset all mocks
    jest.clearAllMocks();
    mockFetch = global.fetch as jest.MockedFunction<typeof fetch>;

    // Mock AbortSignal.timeout if not available (Jest environment)
    if (!AbortSignal.timeout) {
      (AbortSignal as any).timeout = (ms: number) => {
        const controller = new AbortController();
        return controller.signal;
      };
    }

    // Setup default successful response
    const mockResponse = {
      id: 'conv-123',
      object: 'chat.completion',
      model: 'agent-123',
      choices: [
        {
          message: {
            role: 'assistant',
            content: 'Response',
            cited_urls: [],
          },
        },
      ],
    };

    mockFetch.mockResolvedValue({
      ok: true,
      status: 200,
      statusText: 'OK',
      headers: new Headers({ 'content-type': 'application/json' }),
      json: async () => mockResponse,
      text: async () => JSON.stringify(mockResponse),
      clone: function() { return this; },
    } as Response);
  });

  afterEach(() => {
    // Restore original environment
    process.env = originalEnv;
  });

  describe('OpenAI Format Compliance', () => {
    it('Property: For any user message and agentId, chat sends POST to /v1/chat/completions', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 1, maxLength: 500 }), // message content
          fc.uuid(), // agentId
          fc.uuid(), // JWT token
          async (message, agentId, token) => {
            // Pre-condition: message must not be whitespace-only
            fc.pre(message.trim().length > 0);

            // Clear mocks for each property run
            mockFetch.mockClear();

            const apiClient = new ApiClient({ 
              jwtToken: token,
              baseUrl: 'http://test-api.example.com'
            });

            try {
              await apiClient.chat(agentId, message);
            } catch {
              // Ignore errors, we're testing the request format
            }

            // Verify fetch was called
            expect(mockFetch).toHaveBeenCalledTimes(1);

            // Get the call arguments
            const [url, options] = mockFetch.mock.calls[0];

            // Verify URL ends with /v1/chat/completions
            expect(url).toMatch(/\/v1\/chat\/completions$/);

            // Verify method is POST
            expect(options?.method).toBe('POST');
          }
        ),
        { numRuns: 100 }
      );
    });

    it('Property: For any message, request body contains model field set to agentId', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 1, maxLength: 500 }),
          fc.uuid(),
          fc.uuid(),
          async (message, agentId, token) => {
            // Pre-condition: message must not be whitespace-only
            fc.pre(message.trim().length > 0);

            // Clear mocks
            mockFetch.mockClear();

            const apiClient = new ApiClient({ 
              jwtToken: token,
              baseUrl: 'http://test-api.example.com'
            });

            try {
              await apiClient.chat(agentId, message);
            } catch {
              // Ignore errors
            }

            // Get the request body
            const [, options] = mockFetch.mock.calls[0];
            const body = JSON.parse(options?.body as string);

            // Verify model field is set to agentId
            expect(body.model).toBe(agentId);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('Property: For any message, request body contains messages array in OpenAI format', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 1, maxLength: 500 }),
          fc.uuid(),
          fc.uuid(),
          async (message, agentId, token) => {
            // Pre-condition: message must not be whitespace-only
            fc.pre(message.trim().length > 0);

            // Clear mocks
            mockFetch.mockClear();

            const apiClient = new ApiClient({ 
              jwtToken: token,
              baseUrl: 'http://test-api.example.com'
            });

            try {
              await apiClient.chat(agentId, message);
            } catch {
              // Ignore errors
            }

            // Get the request body
            const [, options] = mockFetch.mock.calls[0];
            const body = JSON.parse(options?.body as string);

            // Verify messages array exists
            expect(body.messages).toBeDefined();
            expect(Array.isArray(body.messages)).toBe(true);
            expect(body.messages.length).toBeGreaterThan(0);

            // Verify each message has role and content
            body.messages.forEach((msg: any) => {
              expect(msg).toHaveProperty('role');
              expect(msg).toHaveProperty('content');
              expect(['user', 'assistant', 'system']).toContain(msg.role);
              expect(typeof msg.content).toBe('string');
            });
          }
        ),
        { numRuns: 100 }
      );
    });

    it('Property: For single message string, messages array contains one user message', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 1, maxLength: 500 }),
          fc.uuid(),
          fc.uuid(),
          async (message, agentId, token) => {
            // Pre-condition: message must not be whitespace-only
            fc.pre(message.trim().length > 0);

            // Clear mocks
            mockFetch.mockClear();

            const apiClient = new ApiClient({ 
              jwtToken: token,
              baseUrl: 'http://test-api.example.com'
            });

            try {
              await apiClient.chat(agentId, message);
            } catch {
              // Ignore errors
            }

            // Get the request body
            const [, options] = mockFetch.mock.calls[0];
            const body = JSON.parse(options?.body as string);

            // Verify messages array has exactly one message
            expect(body.messages).toHaveLength(1);

            // Verify the message is a user message with correct content
            expect(body.messages[0].role).toBe('user');
            expect(body.messages[0].content).toBe(message.trim());
          }
        ),
        { numRuns: 100 }
      );
    });

    it('Property: For conversation history array, all messages are preserved in request', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(
            fc.record({
              role: fc.constantFrom('user' as const, 'assistant' as const, 'system' as const),
              content: fc.string({ minLength: 1, maxLength: 200 }),
            }),
            { minLength: 1, maxLength: 10 }
          ),
          fc.uuid(),
          fc.uuid(),
          async (messages, agentId, token) => {
            // Pre-condition: all messages must have non-empty content
            fc.pre(messages.every(m => m.content.trim().length > 0));

            // Clear mocks
            mockFetch.mockClear();

            const apiClient = new ApiClient({ 
              jwtToken: token,
              baseUrl: 'http://test-api.example.com'
            });

            try {
              await apiClient.chat(agentId, messages);
            } catch {
              // Ignore errors
            }

            // Get the request body
            const [, options] = mockFetch.mock.calls[0];
            const body = JSON.parse(options?.body as string);

            // Verify all messages are in the request
            expect(body.messages).toHaveLength(messages.length);

            // Verify each message matches the input
            messages.forEach((msg, index) => {
              expect(body.messages[index].role).toBe(msg.role);
              expect(body.messages[index].content).toBe(msg.content);
            });
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Request Structure Invariants', () => {
    it('Property: Request body always contains both model and messages fields', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 1, maxLength: 500 }),
          fc.uuid(),
          fc.uuid(),
          async (message, agentId, token) => {
            // Pre-condition: message must not be whitespace-only
            fc.pre(message.trim().length > 0);

            // Clear mocks
            mockFetch.mockClear();

            const apiClient = new ApiClient({ 
              jwtToken: token,
              baseUrl: 'http://test-api.example.com'
            });

            try {
              await apiClient.chat(agentId, message);
            } catch {
              // Ignore errors
            }

            // Get the request body
            const [, options] = mockFetch.mock.calls[0];
            const body = JSON.parse(options?.body as string);

            // Verify both required fields are present
            expect(body).toHaveProperty('model');
            expect(body).toHaveProperty('messages');
            expect(typeof body.model).toBe('string');
            expect(Array.isArray(body.messages)).toBe(true);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('Property: Request body contains only model and messages fields (no extra fields)', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 1, maxLength: 500 }),
          fc.uuid(),
          fc.uuid(),
          async (message, agentId, token) => {
            // Pre-condition: message must not be whitespace-only
            fc.pre(message.trim().length > 0);

            // Clear mocks
            mockFetch.mockClear();

            const apiClient = new ApiClient({ 
              jwtToken: token,
              baseUrl: 'http://test-api.example.com'
            });

            try {
              await apiClient.chat(agentId, message);
            } catch {
              // Ignore errors
            }

            // Get the request body
            const [, options] = mockFetch.mock.calls[0];
            const body = JSON.parse(options?.body as string);

            // Verify only expected fields are present
            const keys = Object.keys(body);
            expect(keys).toHaveLength(2);
            expect(keys).toContain('model');
            expect(keys).toContain('messages');
          }
        ),
        { numRuns: 100 }
      );
    });

    it('Property: Message content is trimmed before sending', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 1, maxLength: 500 }),
          fc.integer({ min: 0, max: 10 }), // leading spaces
          fc.integer({ min: 0, max: 10 }), // trailing spaces
          fc.uuid(),
          fc.uuid(),
          async (message, leadingSpaces, trailingSpaces, agentId, token) => {
            // Pre-condition: message must not be whitespace-only
            fc.pre(message.trim().length > 0);

            // Add whitespace
            const paddedMessage = ' '.repeat(leadingSpaces) + message + ' '.repeat(trailingSpaces);

            // Clear mocks
            mockFetch.mockClear();

            const apiClient = new ApiClient({ 
              jwtToken: token,
              baseUrl: 'http://test-api.example.com'
            });

            try {
              await apiClient.chat(agentId, paddedMessage);
            } catch {
              // Ignore errors
            }

            // Get the request body
            const [, options] = mockFetch.mock.calls[0];
            const body = JSON.parse(options?.body as string);

            // Verify content is trimmed
            expect(body.messages[0].content).toBe(message.trim());
            expect(body.messages[0].content).not.toMatch(/^\s/);
            expect(body.messages[0].content).not.toMatch(/\s$/);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('Property: Empty agentId throws error before making request', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 1, maxLength: 500 }),
          fc.uuid(),
          async (message, token) => {
            // Pre-condition: message must not be whitespace-only
            fc.pre(message.trim().length > 0);

            // Clear mocks
            mockFetch.mockClear();

            const apiClient = new ApiClient({ 
              jwtToken: token,
              baseUrl: 'http://test-api.example.com'
            });

            // Test with empty agentId
            await expect(apiClient.chat('', message)).rejects.toThrow();

            // Verify no request was made
            expect(mockFetch).not.toHaveBeenCalled();
          }
        ),
        { numRuns: 50 }
      );
    });

    it('Property: Whitespace-only message throws error before making request', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.integer({ min: 1, max: 20 }),
          fc.uuid(),
          fc.uuid(),
          async (numSpaces, agentId, token) => {
            // Clear mocks
            mockFetch.mockClear();

            const apiClient = new ApiClient({ 
              jwtToken: token,
              baseUrl: 'http://test-api.example.com'
            });

            // Test with whitespace-only message
            const whitespaceMessage = ' '.repeat(numSpaces);
            await expect(apiClient.chat(agentId, whitespaceMessage)).rejects.toThrow();

            // Verify no request was made
            expect(mockFetch).not.toHaveBeenCalled();
          }
        ),
        { numRuns: 50 }
      );
    });

    it('Property: Empty messages array throws error before making request', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.uuid(),
          fc.uuid(),
          async (agentId, token) => {
            // Clear mocks
            mockFetch.mockClear();

            const apiClient = new ApiClient({ 
              jwtToken: token,
              baseUrl: 'http://test-api.example.com'
            });

            // Test with empty messages array
            await expect(apiClient.chat(agentId, [])).rejects.toThrow();

            // Verify no request was made
            expect(mockFetch).not.toHaveBeenCalled();
          }
        ),
        { numRuns: 50 }
      );
    });

    it('Property: Special characters in message content are preserved', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 1, maxLength: 500 }).map(s =>
            s + '!@#$%^&*()_+-=[]{}|;:,.<>?'
          ),
          fc.uuid(),
          fc.uuid(),
          async (message, agentId, token) => {
            // Pre-condition: message must not be whitespace-only
            fc.pre(message.trim().length > 0);

            // Clear mocks
            mockFetch.mockClear();

            const apiClient = new ApiClient({ 
              jwtToken: token,
              baseUrl: 'http://test-api.example.com'
            });

            try {
              await apiClient.chat(agentId, message);
            } catch {
              // Ignore errors
            }

            // Get the request body
            const [, options] = mockFetch.mock.calls[0];
            const body = JSON.parse(options?.body as string);

            // Verify special characters are preserved
            expect(body.messages[0].content).toBe(message.trim());
          }
        ),
        { numRuns: 50 }
      );
    });

    it('Property: Unicode characters in message content are preserved', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 1, maxLength: 500 }).map(s =>
            s + '你好世界🌍🚀'
          ),
          fc.uuid(),
          fc.uuid(),
          async (message, agentId, token) => {
            // Pre-condition: message must not be whitespace-only
            fc.pre(message.trim().length > 0);

            // Clear mocks
            mockFetch.mockClear();

            const apiClient = new ApiClient({ 
              jwtToken: token,
              baseUrl: 'http://test-api.example.com'
            });

            try {
              await apiClient.chat(agentId, message);
            } catch {
              // Ignore errors
            }

            // Get the request body
            const [, options] = mockFetch.mock.calls[0];
            const body = JSON.parse(options?.body as string);

            // Verify unicode characters are preserved
            expect(body.messages[0].content).toBe(message.trim());
          }
        ),
        { numRuns: 50 }
      );
    });
  });

  describe('Conversation History Handling', () => {
    it('Property: Conversation history maintains message order', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(
            fc.record({
              role: fc.constantFrom('user' as const, 'assistant' as const),
              content: fc.string({ minLength: 1, maxLength: 200 }),
            }),
            { minLength: 2, maxLength: 10 }
          ),
          fc.uuid(),
          fc.uuid(),
          async (messages, agentId, token) => {
            // Pre-condition: all messages must have non-empty content
            fc.pre(messages.every(m => m.content.trim().length > 0));

            // Clear mocks
            mockFetch.mockClear();

            const apiClient = new ApiClient({ 
              jwtToken: token,
              baseUrl: 'http://test-api.example.com'
            });

            try {
              await apiClient.chat(agentId, messages);
            } catch {
              // Ignore errors
            }

            // Get the request body
            const [, options] = mockFetch.mock.calls[0];
            const body = JSON.parse(options?.body as string);

            // Verify order is preserved
            for (let i = 0; i < messages.length; i++) {
              expect(body.messages[i].role).toBe(messages[i].role);
              expect(body.messages[i].content).toBe(messages[i].content);
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('Property: Mixed role types in conversation history are all preserved', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(
            fc.record({
              role: fc.constantFrom('user' as const, 'assistant' as const, 'system' as const),
              content: fc.string({ minLength: 1, maxLength: 200 }),
            }),
            { minLength: 1, maxLength: 10 }
          ),
          fc.uuid(),
          fc.uuid(),
          async (messages, agentId, token) => {
            // Pre-condition: all messages must have non-empty content
            fc.pre(messages.every(m => m.content.trim().length > 0));

            // Clear mocks
            mockFetch.mockClear();

            const apiClient = new ApiClient({ 
              jwtToken: token,
              baseUrl: 'http://test-api.example.com'
            });

            try {
              await apiClient.chat(agentId, messages);
            } catch {
              // Ignore errors
            }

            // Get the request body
            const [, options] = mockFetch.mock.calls[0];
            const body = JSON.parse(options?.body as string);

            // Verify all role types are preserved
            const inputRoles = messages.map(m => m.role);
            const outputRoles = body.messages.map((m: any) => m.role);
            expect(outputRoles).toEqual(inputRoles);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Request Consistency', () => {
    it('Property: Multiple calls with same inputs produce identical requests', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 1, maxLength: 500 }),
          fc.uuid(),
          fc.uuid(),
          fc.integer({ min: 2, max: 5 }),
          async (message, agentId, token, numCalls) => {
            // Pre-condition: message must not be whitespace-only
            fc.pre(message.trim().length > 0);

            // Clear mocks
            mockFetch.mockClear();

            const apiClient = new ApiClient({ 
              jwtToken: token,
              baseUrl: 'http://test-api.example.com'
            });

            // Make multiple calls
            for (let i = 0; i < numCalls; i++) {
              try {
                await apiClient.chat(agentId, message);
              } catch {
                // Ignore errors
              }
            }

            // Get all request bodies
            const bodies = mockFetch.mock.calls.map(call => {
              const [, options] = call;
              return JSON.parse(options?.body as string);
            });

            // Verify all requests are identical
            for (let i = 1; i < bodies.length; i++) {
              expect(bodies[i]).toEqual(bodies[0]);
            }
          }
        ),
        { numRuns: 50 }
      );
    });

    it('Property: AgentId in model field exactly matches input agentId', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 1, maxLength: 500 }),
          fc.uuid(),
          fc.uuid(),
          async (message, agentId, token) => {
            // Pre-condition: message must not be whitespace-only
            fc.pre(message.trim().length > 0);

            // Clear mocks
            mockFetch.mockClear();

            const apiClient = new ApiClient({ 
              jwtToken: token,
              baseUrl: 'http://test-api.example.com'
            });

            try {
              await apiClient.chat(agentId, message);
            } catch {
              // Ignore errors
            }

            // Get the request body
            const [, options] = mockFetch.mock.calls[0];
            const body = JSON.parse(options?.body as string);

            // Verify exact match (no trimming or modification)
            expect(body.model).toBe(agentId);
            expect(body.model).toHaveLength(agentId.length);
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
