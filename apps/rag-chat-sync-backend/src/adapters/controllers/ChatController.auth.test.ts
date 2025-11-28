import { ChatController } from './ChatController';
import { APIGatewayProxyEvent } from '../../shared/types';

const chatResponse = {
  id: 'conv-1',
  object: 'chat.completion',
  model: 'agent-1',
  choices: [{
    message: {
      role: 'assistant' as const,
      content: 'hello',
      cited_urls: [],
      isRag: true
    }
  }]
};

const createEvent = (overrides: Partial<APIGatewayProxyEvent> = {}): APIGatewayProxyEvent => ({
  body: JSON.stringify({
    model: 'agent-1',
    messages: [{ role: 'user', content: 'hello' }]
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

const createUseCase = () => {
  let capturedInput: any;

  return {
    execute: jest.fn().mockImplementation(async (input: any) => {
      capturedInput = input;
      return chatResponse;
    }),
    getCapturedInput: () => capturedInput
  };
};

describe('ChatController authentication', () => {
  it('authenticates with JWT claims', async () => {
    const useCase = createUseCase();
    const controller = new ChatController(useCase as any);

    const event = createEvent({
      requestContext: {
        requestId: 'req-jwt',
        authorizer: { claims: { 'custom:tenant_id': 'tenant-1', sub: 'user-1' } }
      }
    });

    const response = await controller.handle(event);
    const captured = useCase.getCapturedInput();

    expect(response.statusCode).toBe(200);
    expect(captured).toMatchObject({
      tenantId: 'tenant-1',
      userId: 'user-1',
      agentId: 'agent-1',
      requestId: 'req-jwt'
    });
  });

  it('authenticates with x-api-key header when JWT is absent', async () => {
    const useCase = createUseCase();
    const controller = new ChatController(useCase as any);

    const event = createEvent({
      headers: { 'x-api-key': 'test-key' },
      requestContext: { requestId: 'req-key', authorizer: { claims: {} } }
    });

    const response = await controller.handle(event);
    const captured = useCase.getCapturedInput();

    expect(response.statusCode).toBe(200);
    expect(captured).toMatchObject({
      tenantId: 'default',
      userId: 'default',
      agentId: 'agent-1',
      requestId: 'req-key'
    });
  });

  it('authenticates with X-API-Key header when JWT is absent', async () => {
    const useCase = createUseCase();
    const controller = new ChatController(useCase as any);

    const event = createEvent({
      headers: { 'X-API-Key': 'test-key' },
      requestContext: { requestId: 'req-key-upper', authorizer: { claims: {} } }
    });

    const response = await controller.handle(event);
    const captured = useCase.getCapturedInput();

    expect(response.statusCode).toBe(200);
    expect(captured).toMatchObject({
      tenantId: 'default',
      userId: 'default',
      agentId: 'agent-1',
      requestId: 'req-key-upper'
    });
  });

  it('prioritizes JWT when both JWT and API Key are present', async () => {
    const useCase = createUseCase();
    const controller = new ChatController(useCase as any);

    const event = createEvent({
      headers: { 'x-api-key': 'test-key' },
      requestContext: {
        requestId: 'req-both',
        authorizer: { claims: { 'custom:tenant_id': 'tenant-2', sub: 'user-2' } }
      }
    });

    const response = await controller.handle(event);
    const captured = useCase.getCapturedInput();

    expect(response.statusCode).toBe(200);
    expect(captured).toMatchObject({
      tenantId: 'tenant-2',
      userId: 'user-2',
      agentId: 'agent-1',
      requestId: 'req-both'
    });
  });

  it('returns 401 when neither JWT nor API Key is provided', async () => {
    const useCase = createUseCase();
    const controller = new ChatController(useCase as any);

    const event = createEvent({
      headers: {},
      requestContext: { requestId: 'req-unauth', authorizer: { claims: {} } }
    });

    const response = await controller.handle(event);

    expect(response.statusCode).toBe(401);
    expect(useCase.getCapturedInput()).toBeUndefined();
  });
});
