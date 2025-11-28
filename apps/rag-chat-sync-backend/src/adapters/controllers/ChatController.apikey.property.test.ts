import * as fc from 'fast-check';
import { ChatController } from './ChatController';
import { APIGatewayProxyEvent } from '../../shared/types';

const numRuns = 100;

const chatResponse = (agentId: string) => ({
  id: 'conv-1',
  object: 'chat.completion',
  model: agentId,
  choices: [{
    message: {
      role: 'assistant' as const,
      content: 'hello',
      cited_urls: [],
      isRag: true
    }
  }]
});

const createCapturingUseCase = () => {
  let capturedInput: any;

  return {
    execute: jest.fn().mockImplementation(async (input: any) => {
      capturedInput = input;
      return chatResponse(input.agentId);
    }),
    getCapturedInput: () => capturedInput
  };
};

const createEvent = (overrides: Partial<APIGatewayProxyEvent> = {}): APIGatewayProxyEvent => ({
  body: JSON.stringify({
    model: 'agent-1',
    messages: [{ role: 'user', content: 'hi' }]
  }),
  headers: {},
  httpMethod: 'POST',
  path: '/v1/chat/completions',
  queryStringParameters: null,
  requestContext: {
    requestId: 'req-1',
    authorizer: { claims: {} }
  },
  ...overrides
} as any);

/**
 * Feature: api-key-auth, Property 1: JWT authentication continues to work
 * Validates: Requirements 2.1, 2.2, 2.3
 */
describe('Property 1: JWT authentication continues to work', () => {
  it('prioritizes JWT claims even when API Key header is present', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 1, maxLength: 50 }),
        fc.string({ minLength: 1, maxLength: 50 }),
        fc.option(fc.string({ minLength: 1, maxLength: 60 }), { nil: '' }),
        async (tenantId, userId, apiKey) => {
          const useCase = createCapturingUseCase();
          const controller = new ChatController(useCase as any);

          const headers: Record<string, string> = {};
          if (apiKey) {
            headers['x-api-key'] = apiKey;
          }

          const event = createEvent({
            headers,
            requestContext: {
              requestId: `req-${tenantId}`,
              authorizer: {
                claims: { 'custom:tenant_id': tenantId, sub: userId }
              }
            }
          });

          const response = await controller.handle(event);
          const captured = useCase.getCapturedInput();

          return response.statusCode === 200 &&
            captured?.tenantId === tenantId &&
            captured?.userId === userId &&
            captured?.requestId === `req-${tenantId}`;
        }
      ),
      { numRuns }
    );
  });
});

/**
 * Feature: api-key-auth, Property 2: API Key authentication succeeds when JWT is absent
 * Validates: Requirements 1.1, 1.4
 */
describe('Property 2: API Key authentication succeeds when JWT is absent', () => {
  it('authenticates with fixed IDs when only API Key header is provided', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 1, maxLength: 60 }),
        fc.constantFrom<'x-api-key' | 'X-API-Key'>('x-api-key', 'X-API-Key'),
        async (apiKey, headerName) => {
          const useCase = createCapturingUseCase();
          const controller = new ChatController(useCase as any);

          const event = createEvent({
            headers: { [headerName]: apiKey },
            requestContext: { requestId: 'req-apikey', authorizer: { claims: {} } }
          });

          const response = await controller.handle(event);
          const captured = useCase.getCapturedInput();

          return response.statusCode === 200 &&
            captured?.tenantId === 'default' &&
            captured?.userId === 'default' &&
            captured?.requestId === 'req-apikey';
        }
      ),
      { numRuns }
    );
  });
});

/**
 * Feature: api-key-auth, Property 4: Fixed ID assignment for API Key requests
 * Validates: Requirements 1.4
 */
describe('Property 4: Fixed ID assignment for API Key requests', () => {
  it('always assigns default tenant and user IDs for API Key authentication', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 1, maxLength: 60 }),
        fc.string({ minLength: 1, maxLength: 40 }),
        async (apiKey, agentId) => {
          const useCase = createCapturingUseCase();
          const controller = new ChatController(useCase as any);

          const event = createEvent({
            body: JSON.stringify({
              model: agentId,
              messages: [{ role: 'user', content: 'ping' }]
            }),
            headers: { 'x-api-key': apiKey },
            requestContext: { requestId: 'req-fixed', authorizer: { claims: {} } }
          });

          await controller.handle(event);
          const captured = useCase.getCapturedInput();

          return captured?.tenantId === 'default' &&
            captured?.userId === 'default' &&
            captured?.agentId === agentId;
        }
      ),
      { numRuns }
    );
  });
});

/**
 * Feature: api-key-auth, Property 6: Use case execution consistency
 * Validates: Requirements 1.5, 2.5
 */
describe('Property 6: Use case execution consistency', () => {
  it('passes consistent arguments to the use case for both auth methods', async () => {
    const messageContent = fc.string({ minLength: 1, maxLength: 100 });

    await fc.assert(
      fc.asyncProperty(
        fc.oneof(
          fc.record({
            mode: fc.constant<'jwt'>('jwt'),
            tenantId: fc.string({ minLength: 1, maxLength: 40 }),
            userId: fc.string({ minLength: 1, maxLength: 40 }),
            apiKey: fc.option(fc.string({ minLength: 1, maxLength: 60 }), { nil: '' })
          }),
          fc.record({
            mode: fc.constant<'apikey'>('apikey'),
            apiKey: fc.string({ minLength: 1, maxLength: 60 }),
            header: fc.constantFrom<'x-api-key' | 'X-API-Key'>('x-api-key', 'X-API-Key')
          })
        ),
        fc.string({ minLength: 1, maxLength: 40 }),
        messageContent,
        async (authConfig, agentId, content) => {
          const useCase = createCapturingUseCase();
          const controller = new ChatController(useCase as any);

          const headers: Record<string, string> = {};
          let requestContext: APIGatewayProxyEvent['requestContext'] = {
            requestId: `req-${agentId}`,
            authorizer: { claims: {} }
          };

          if (authConfig.mode === 'jwt') {
            requestContext = {
              requestId: `req-${agentId}`,
              authorizer: {
                claims: {
                  'custom:tenant_id': authConfig.tenantId,
                  sub: authConfig.userId
                }
              }
            };
            if (authConfig.apiKey) {
              headers['x-api-key'] = authConfig.apiKey;
            }
          } else {
            headers[authConfig.header] = authConfig.apiKey;
          }

          const event = createEvent({
            body: JSON.stringify({
              model: agentId,
              messages: [{ role: 'user', content }]
            }),
            headers,
            requestContext
          });

          const response = await controller.handle(event);
          const captured = useCase.getCapturedInput();

          if (response.statusCode !== 200) {
            return false;
          }

          const expectedTenant = authConfig.mode === 'jwt' ? authConfig.tenantId : 'default';
          const expectedUser = authConfig.mode === 'jwt' ? authConfig.userId : 'default';

          return captured?.tenantId === expectedTenant &&
            captured?.userId === expectedUser &&
            captured?.agentId === agentId &&
            captured?.messages?.[0]?.content === content &&
            captured?.requestId === `req-${agentId}`;
        }
      ),
      { numRuns }
    );
  });
});
