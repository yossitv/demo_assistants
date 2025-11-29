import * as fc from 'fast-check';
import { ChatController } from './ChatController';
import { ChatWithAgentUseCase, ChatWithAgentOutput } from '../../use-cases/ChatWithAgentUseCase';
import { APIGatewayProxyEvent } from '../../shared/types';

/**
 * Feature: rag-chat-backend-mvp, Property 8: OpenAI format compatibility
 * Validates: Requirements 9.2
 * 
 * For any chat completion response, the response structure should be parseable 
 * by standard OpenAI client libraries (containing id, object, model, and choices fields).
 * 
 * This test verifies that the chat API response format is compatible with the 
 * OpenAI chat completions API specification, ensuring clients can use standard 
 * OpenAI libraries to interact with our system.
 */
describe('Property 8: OpenAI format compatibility', () => {
  const numRuns = 100;

  // Helper to create a mock API Gateway event with JWT claims
  const createChatEvent = (
    tenantId: string,
    userId: string,
    agentId: string,
    messages: Array<{ role: string; content: string }>
  ): APIGatewayProxyEvent => ({
    body: JSON.stringify({ model: agentId, messages }),
    headers: {},
    httpMethod: 'POST',
    path: '/v1/chat/completions',
    queryStringParameters: null,
    requestContext: {
      requestId: 'test-request',
      authorizer: {
        claims: {
          'custom:tenant_id': tenantId,
          sub: userId
        }
      }
    }
  } as any);

  // Helper to create a mock use case that returns a valid response
  const createMockUseCase = (output: ChatWithAgentOutput) => {
    return {
      execute: jest.fn().mockResolvedValue(output)
    } as unknown as jest.Mocked<ChatWithAgentUseCase>;
  };

  it('should return response with all required OpenAI fields', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 5, maxLength: 20 }).filter(s => s.trim().length > 0),
        fc.string({ minLength: 5, maxLength: 20 }).filter(s => s.trim().length > 0),
        fc.string({ minLength: 5, maxLength: 20 }).filter(s => s.trim().length > 0),
        fc.string({ minLength: 10, maxLength: 200 }).filter(s => s.trim().length > 0),
        fc.string({ minLength: 10, maxLength: 500 }).filter(s => s.trim().length > 0),
        fc.array(fc.webUrl(), { minLength: 0, maxLength: 3 }),
        async (tenantId, userId, agentId, userMessage, assistantResponse, citedUrls) => {
          const conversationId = `conv_${Date.now()}`;
          
          const mockOutput: ChatWithAgentOutput = {
            id: conversationId,
            object: 'chat.completion',
            model: agentId,
            choices: [{
              message: {
                role: 'assistant',
                content: assistantResponse,
                cited_urls: citedUrls,
                isRag: true,
              }
            }]
          };

          const useCase = createMockUseCase(mockOutput);
          const controller = new ChatController(useCase);

          const event = createChatEvent(
            tenantId,
            userId,
            agentId,
            [{ role: 'user', content: userMessage }]
          );

          const response = await controller.handle(event);

          // Parse the response body
          expect(response.statusCode).toBe(200);
          const body = JSON.parse(response.body);

          // Property: Response must have all required OpenAI fields
          expect(body).toHaveProperty('id');
          expect(body).toHaveProperty('object');
          expect(body).toHaveProperty('model');
          expect(body).toHaveProperty('choices');

          // Verify field types
          expect(typeof body.id).toBe('string');
          expect(body.object).toBe('chat.completion');
          expect(typeof body.model).toBe('string');
          expect(Array.isArray(body.choices)).toBe(true);

          return true;
        }
      ),
      { numRuns }
    );
  });

  it('should have choices array with message containing role, content, and cited_urls', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 5, maxLength: 20 }).filter(s => s.trim().length > 0),
        fc.string({ minLength: 5, maxLength: 20 }).filter(s => s.trim().length > 0),
        fc.string({ minLength: 5, maxLength: 20 }).filter(s => s.trim().length > 0),
        fc.string({ minLength: 10, maxLength: 200 }).filter(s => s.trim().length > 0),
        fc.string({ minLength: 10, maxLength: 500 }).filter(s => s.trim().length > 0),
        fc.array(fc.webUrl(), { minLength: 0, maxLength: 3 }),
        async (tenantId, userId, agentId, userMessage, assistantResponse, citedUrls) => {
          const conversationId = `conv_${Date.now()}`;
          
          const mockOutput: ChatWithAgentOutput = {
            id: conversationId,
            object: 'chat.completion',
            model: agentId,
            choices: [{
              message: {
                role: 'assistant',
                content: assistantResponse,
                cited_urls: citedUrls,
                isRag: true,
              }
            }]
          };

          const useCase = createMockUseCase(mockOutput);
          const controller = new ChatController(useCase);

          const event = createChatEvent(
            tenantId,
            userId,
            agentId,
            [{ role: 'user', content: userMessage }]
          );

          const response = await controller.handle(event);
          const body = JSON.parse(response.body);

          // Property: choices array must have at least one element
          expect(body.choices.length).toBeGreaterThan(0);

          // Property: Each choice must have a message object
          const choice = body.choices[0];
          expect(choice).toHaveProperty('message');
          expect(choice.message).toHaveProperty('role');
          expect(choice.message).toHaveProperty('content');
          expect(choice.message).toHaveProperty('cited_urls');

          // Verify message field types
          expect(choice.message.role).toBe('assistant');
          expect(typeof choice.message.content).toBe('string');
          expect(Array.isArray(choice.message.cited_urls)).toBe(true);

          return true;
        }
      ),
      { numRuns }
    );
  });

  it('should preserve model field as agentId', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 5, maxLength: 20 }).filter(s => s.trim().length > 0),
        fc.string({ minLength: 5, maxLength: 20 }).filter(s => s.trim().length > 0),
        fc.string({ minLength: 5, maxLength: 20 }).filter(s => s.trim().length > 0),
        fc.string({ minLength: 10, maxLength: 200 }).filter(s => s.trim().length > 0),
        fc.string({ minLength: 10, maxLength: 500 }).filter(s => s.trim().length > 0),
        async (tenantId, userId, agentId, userMessage, assistantResponse) => {
          const conversationId = `conv_${Date.now()}`;
          
          const mockOutput: ChatWithAgentOutput = {
            id: conversationId,
            object: 'chat.completion',
            model: agentId,
            choices: [{
              message: {
                role: 'assistant',
                content: assistantResponse,
                cited_urls: [],
                isRag: true,
              }
            }]
          };

          const useCase = createMockUseCase(mockOutput);
          const controller = new ChatController(useCase);

          const event = createChatEvent(
            tenantId,
            userId,
            agentId,
            [{ role: 'user', content: userMessage }]
          );

          const response = await controller.handle(event);
          const body = JSON.parse(response.body);

          // Property: model field should match the agentId from the request
          expect(body.model).toBe(agentId);

          return true;
        }
      ),
      { numRuns }
    );
  });

  it('should have object field set to "chat.completion"', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 5, maxLength: 20 }).filter(s => s.trim().length > 0),
        fc.string({ minLength: 5, maxLength: 20 }).filter(s => s.trim().length > 0),
        fc.string({ minLength: 5, maxLength: 20 }).filter(s => s.trim().length > 0),
        fc.string({ minLength: 10, maxLength: 200 }).filter(s => s.trim().length > 0),
        fc.string({ minLength: 10, maxLength: 500 }).filter(s => s.trim().length > 0),
        async (tenantId, userId, agentId, userMessage, assistantResponse) => {
          const conversationId = `conv_${Date.now()}`;
          
          const mockOutput: ChatWithAgentOutput = {
            id: conversationId,
            object: 'chat.completion',
            model: agentId,
            choices: [{
              message: {
                role: 'assistant',
                content: assistantResponse,
                cited_urls: [],
                isRag: true,
              }
            }]
          };

          const useCase = createMockUseCase(mockOutput);
          const controller = new ChatController(useCase);

          const event = createChatEvent(
            tenantId,
            userId,
            agentId,
            [{ role: 'user', content: userMessage }]
          );

          const response = await controller.handle(event);
          const body = JSON.parse(response.body);

          // Property: object field must be exactly "chat.completion"
          expect(body.object).toBe('chat.completion');
          expect(body.object).toStrictEqual('chat.completion');

          return true;
        }
      ),
      { numRuns }
    );
  });

  it('should have non-empty id field', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 5, maxLength: 20 }).filter(s => s.trim().length > 0),
        fc.string({ minLength: 5, maxLength: 20 }).filter(s => s.trim().length > 0),
        fc.string({ minLength: 5, maxLength: 20 }).filter(s => s.trim().length > 0),
        fc.string({ minLength: 10, maxLength: 200 }).filter(s => s.trim().length > 0),
        fc.string({ minLength: 10, maxLength: 500 }).filter(s => s.trim().length > 0),
        async (tenantId, userId, agentId, userMessage, assistantResponse) => {
          const conversationId = `conv_${Date.now()}`;
          
          const mockOutput: ChatWithAgentOutput = {
            id: conversationId,
            object: 'chat.completion',
            model: agentId,
            choices: [{
              message: {
                role: 'assistant',
                content: assistantResponse,
                cited_urls: [],
                isRag: true,
              }
            }]
          };

          const useCase = createMockUseCase(mockOutput);
          const controller = new ChatController(useCase);

          const event = createChatEvent(
            tenantId,
            userId,
            agentId,
            [{ role: 'user', content: userMessage }]
          );

          const response = await controller.handle(event);
          const body = JSON.parse(response.body);

          // Property: id field must be a non-empty string
          expect(typeof body.id).toBe('string');
          expect(body.id.length).toBeGreaterThan(0);

          return true;
        }
      ),
      { numRuns }
    );
  });

  it('should be parseable as valid JSON', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 5, maxLength: 20 }).filter(s => s.trim().length > 0),
        fc.string({ minLength: 5, maxLength: 20 }).filter(s => s.trim().length > 0),
        fc.string({ minLength: 5, maxLength: 20 }).filter(s => s.trim().length > 0),
        fc.string({ minLength: 10, maxLength: 200 }).filter(s => s.trim().length > 0),
        fc.string({ minLength: 10, maxLength: 500 }).filter(s => s.trim().length > 0),
        fc.array(fc.webUrl(), { minLength: 0, maxLength: 3 }),
        async (tenantId, userId, agentId, userMessage, assistantResponse, citedUrls) => {
          const conversationId = `conv_${Date.now()}`;
          
          const mockOutput: ChatWithAgentOutput = {
            id: conversationId,
            object: 'chat.completion',
            model: agentId,
            choices: [{
              message: {
                role: 'assistant',
                content: assistantResponse,
                cited_urls: citedUrls,
                isRag: true,
              }
            }]
          };

          const useCase = createMockUseCase(mockOutput);
          const controller = new ChatController(useCase);

          const event = createChatEvent(
            tenantId,
            userId,
            agentId,
            [{ role: 'user', content: userMessage }]
          );

          const response = await controller.handle(event);

          // Property: Response body must be valid JSON
          expect(() => JSON.parse(response.body)).not.toThrow();

          // Property: Parsed JSON should be an object
          const body = JSON.parse(response.body);
          expect(typeof body).toBe('object');
          expect(body).not.toBeNull();

          return true;
        }
      ),
      { numRuns }
    );
  });

  it('should handle multiple messages in conversation history', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 5, maxLength: 20 }).filter(s => s.trim().length > 0),
        fc.string({ minLength: 5, maxLength: 20 }).filter(s => s.trim().length > 0),
        fc.string({ minLength: 5, maxLength: 20 }).filter(s => s.trim().length > 0),
        // Generate 1-5 messages ensuring at least one user message
        fc.tuple(
          fc.array(
            fc.record({
              role: fc.constantFrom('assistant', 'system'),
              content: fc.string({ minLength: 10, maxLength: 200 }).filter(s => s.trim().length > 0)
            }),
            { minLength: 0, maxLength: 4 }
          ),
          fc.string({ minLength: 10, maxLength: 200 }).filter(s => s.trim().length > 0)
        ).map(([history, userContent]) => [
          ...history,
          { role: 'user', content: userContent }
        ]),
        fc.string({ minLength: 10, maxLength: 500 }).filter(s => s.trim().length > 0),
        async (tenantId, userId, agentId, messages, assistantResponse) => {
          const conversationId = `conv_${Date.now()}`;
          
          const mockOutput: ChatWithAgentOutput = {
            id: conversationId,
            object: 'chat.completion',
            model: agentId,
            choices: [{
              message: {
                role: 'assistant',
                content: assistantResponse,
                cited_urls: [],
                isRag: true,
              }
            }]
          };

          const useCase = createMockUseCase(mockOutput);
          const controller = new ChatController(useCase);

          const event = createChatEvent(tenantId, userId, agentId, messages);

          const response = await controller.handle(event);
          const body = JSON.parse(response.body);

          // Property: Response format should be consistent regardless of message count
          expect(body).toHaveProperty('id');
          expect(body).toHaveProperty('object');
          expect(body).toHaveProperty('model');
          expect(body).toHaveProperty('choices');
          expect(body.object).toBe('chat.completion');

          return true;
        }
      ),
      { numRuns }
    );
  });

  it('should maintain format consistency across different response contents', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 5, maxLength: 20 }).filter(s => s.trim().length > 0),
        fc.string({ minLength: 5, maxLength: 20 }).filter(s => s.trim().length > 0),
        fc.string({ minLength: 5, maxLength: 20 }).filter(s => s.trim().length > 0),
        fc.string({ minLength: 10, maxLength: 200 }).filter(s => s.trim().length > 0),
        // Generate various types of content including special characters
        fc.oneof(
          fc.string({ minLength: 10, maxLength: 500 }),
          fc.constant('このサイトには情報がありませんでした。'), // Japanese text
          fc.constant(''), // Empty string edge case
          fc.string({ minLength: 1, maxLength: 10 }) // Very short response
        ),
        fc.array(fc.webUrl(), { minLength: 0, maxLength: 3 }),
        async (tenantId, userId, agentId, userMessage, assistantResponse, citedUrls) => {
          const conversationId = `conv_${Date.now()}`;
          
          const mockOutput: ChatWithAgentOutput = {
            id: conversationId,
            object: 'chat.completion',
            model: agentId,
            choices: [{
              message: {
                role: 'assistant',
                content: assistantResponse,
                cited_urls: citedUrls,
                isRag: true,
              }
            }]
          };

          const useCase = createMockUseCase(mockOutput);
          const controller = new ChatController(useCase);

          const event = createChatEvent(
            tenantId,
            userId,
            agentId,
            [{ role: 'user', content: userMessage }]
          );

          const response = await controller.handle(event);
          const body = JSON.parse(response.body);

          // Property: Format should be consistent regardless of content
          expect(body).toMatchObject({
            id: expect.any(String),
            object: 'chat.completion',
            model: expect.any(String),
            choices: expect.arrayContaining([
              expect.objectContaining({
                message: expect.objectContaining({
                  role: 'assistant',
                  content: expect.any(String),
                  cited_urls: expect.any(Array)
                })
              })
            ])
          });

          return true;
        }
      ),
      { numRuns }
    );
  });

  it('should have cited_urls as an array in the message object', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 5, maxLength: 20 }).filter(s => s.trim().length > 0),
        fc.string({ minLength: 5, maxLength: 20 }).filter(s => s.trim().length > 0),
        fc.string({ minLength: 5, maxLength: 20 }).filter(s => s.trim().length > 0),
        fc.string({ minLength: 10, maxLength: 200 }).filter(s => s.trim().length > 0),
        fc.string({ minLength: 10, maxLength: 500 }).filter(s => s.trim().length > 0),
        fc.array(fc.webUrl(), { minLength: 0, maxLength: 3 }),
        async (tenantId, userId, agentId, userMessage, assistantResponse, citedUrls) => {
          const conversationId = `conv_${Date.now()}`;
          
          const mockOutput: ChatWithAgentOutput = {
            id: conversationId,
            object: 'chat.completion',
            model: agentId,
            choices: [{
              message: {
                role: 'assistant',
                content: assistantResponse,
                cited_urls: citedUrls,
                isRag: true,
              }
            }]
          };

          const useCase = createMockUseCase(mockOutput);
          const controller = new ChatController(useCase);

          const event = createChatEvent(
            tenantId,
            userId,
            agentId,
            [{ role: 'user', content: userMessage }]
          );

          const response = await controller.handle(event);
          const body = JSON.parse(response.body);

          // Property: cited_urls must be an array (OpenAI extension)
          expect(Array.isArray(body.choices[0].message.cited_urls)).toBe(true);

          // Property: All elements in cited_urls should be strings
          for (const url of body.choices[0].message.cited_urls) {
            expect(typeof url).toBe('string');
          }

          return true;
        }
      ),
      { numRuns }
    );
  });

  it('should maintain structure when cited_urls is empty', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 5, maxLength: 20 }).filter(s => s.trim().length > 0),
        fc.string({ minLength: 5, maxLength: 20 }).filter(s => s.trim().length > 0),
        fc.string({ minLength: 5, maxLength: 20 }).filter(s => s.trim().length > 0),
        fc.string({ minLength: 10, maxLength: 200 }).filter(s => s.trim().length > 0),
        fc.string({ minLength: 10, maxLength: 500 }).filter(s => s.trim().length > 0),
        async (tenantId, userId, agentId, userMessage, assistantResponse) => {
          const conversationId = `conv_${Date.now()}`;
          
          const mockOutput: ChatWithAgentOutput = {
            id: conversationId,
            object: 'chat.completion',
            model: agentId,
            choices: [{
              message: {
                role: 'assistant',
                content: assistantResponse,
                cited_urls: [], // Empty array
                isRag: true,
              }
            }]
          };

          const useCase = createMockUseCase(mockOutput);
          const controller = new ChatController(useCase);

          const event = createChatEvent(
            tenantId,
            userId,
            agentId,
            [{ role: 'user', content: userMessage }]
          );

          const response = await controller.handle(event);
          const body = JSON.parse(response.body);

          // Property: Structure should be valid even with empty cited_urls
          expect(body).toHaveProperty('id');
          expect(body).toHaveProperty('object');
          expect(body).toHaveProperty('model');
          expect(body).toHaveProperty('choices');
          expect(body.choices[0].message).toHaveProperty('cited_urls');
          expect(body.choices[0].message.cited_urls).toEqual([]);

          return true;
        }
      ),
      { numRuns }
    );
  });

  it('should be compatible with OpenAI TypeScript client expectations', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 5, maxLength: 20 }).filter(s => s.trim().length > 0),
        fc.string({ minLength: 5, maxLength: 20 }).filter(s => s.trim().length > 0),
        fc.string({ minLength: 5, maxLength: 20 }).filter(s => s.trim().length > 0),
        fc.string({ minLength: 10, maxLength: 200 }).filter(s => s.trim().length > 0),
        fc.string({ minLength: 10, maxLength: 500 }).filter(s => s.trim().length > 0),
        fc.array(fc.webUrl(), { minLength: 0, maxLength: 3 }),
        async (tenantId, userId, agentId, userMessage, assistantResponse, citedUrls) => {
          const conversationId = `conv_${Date.now()}`;
          
          const mockOutput: ChatWithAgentOutput = {
            id: conversationId,
            object: 'chat.completion',
            model: agentId,
            choices: [{
              message: {
                role: 'assistant',
                content: assistantResponse,
                cited_urls: citedUrls,
                isRag: true,
              }
            }]
          };

          const useCase = createMockUseCase(mockOutput);
          const controller = new ChatController(useCase);

          const event = createChatEvent(
            tenantId,
            userId,
            agentId,
            [{ role: 'user', content: userMessage }]
          );

          const response = await controller.handle(event);
          const body = JSON.parse(response.body);

          // Property: Response should match OpenAI ChatCompletion interface structure
          // This simulates what an OpenAI client library would expect
          
          // Required top-level fields
          expect(body.id).toBeDefined();
          expect(body.object).toBe('chat.completion');
          expect(body.model).toBeDefined();
          expect(body.choices).toBeDefined();
          
          // Choices structure
          expect(Array.isArray(body.choices)).toBe(true);
          expect(body.choices.length).toBeGreaterThan(0);
          
          // Message structure within choices
          const firstChoice = body.choices[0];
          expect(firstChoice.message).toBeDefined();
          expect(firstChoice.message.role).toBe('assistant');
          expect(firstChoice.message.content).toBeDefined();
          expect(typeof firstChoice.message.content).toBe('string');
          
          // Extension field (cited_urls) should not break compatibility
          expect(firstChoice.message.cited_urls).toBeDefined();
          expect(Array.isArray(firstChoice.message.cited_urls)).toBe(true);

          return true;
        }
      ),
      { numRuns }
    );
  });
});
