import * as jwt from 'jsonwebtoken';
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
  const originalEnv = process.env;
  const testSecret = 'test-jwt-secret';

  beforeEach(() => {
    process.env = { ...originalEnv };
    process.env.JWT_SECRET = testSecret;
    process.env.EXPECTED_API_KEY = 'test-api-key';
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('authenticates with authorizer context (API key)', async () => {
    const useCase = createUseCase();
    const controller = new ChatController(useCase as any);

    const event = createEvent({
      requestContext: {
        requestId: 'req-auth-ctx',
        authorizer: { 
          tenantId: 'api-key-tenant',
          userId: 'api-key-user'
        } as any
      }
    });

    const response = await controller.handle(event);
    const captured = useCase.getCapturedInput();

    expect(response.statusCode).toBe(200);
    expect(captured).toMatchObject({
      tenantId: 'api-key-tenant',
      userId: 'api-key-user',
      agentId: 'agent-1',
      requestId: 'req-auth-ctx'
    });
  });

  it('authenticates with valid JWT token', async () => {
    const useCase = createUseCase();
    const controller = new ChatController(useCase as any);

    const token = jwt.sign(
      { sub: 'user-1', 'custom:tenant_id': 'tenant-1' },
      testSecret,
      { algorithm: 'HS256' }
    );

    const event = createEvent({
      headers: { authorization: `Bearer ${token}` },
      requestContext: { requestId: 'req-jwt', authorizer: { claims: {} } }
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

  it('authenticates with valid API key', async () => {
    const useCase = createUseCase();
    const controller = new ChatController(useCase as any);

    const event = createEvent({
      headers: { authorization: 'Bearer test-api-key' },
      requestContext: { requestId: 'req-key', authorizer: { claims: {} } }
    });

    const response = await controller.handle(event);
    const captured = useCase.getCapturedInput();

    expect(response.statusCode).toBe(200);
    expect(captured).toMatchObject({
      tenantId: 'api-key-tenant',
      userId: 'api-key-user',
      agentId: 'agent-1',
      requestId: 'req-key'
    });
  });

  it('returns 401 for invalid JWT signature', async () => {
    const useCase = createUseCase();
    const controller = new ChatController(useCase as any);

    const token = jwt.sign(
      { sub: 'user-1', 'custom:tenant_id': 'tenant-1' },
      'wrong-secret',
      { algorithm: 'HS256' }
    );

    const event = createEvent({
      headers: { authorization: `Bearer ${token}` },
      requestContext: { requestId: 'req-invalid-jwt', authorizer: { claims: {} } }
    });

    const response = await controller.handle(event);

    expect(response.statusCode).toBe(401);
    expect(useCase.getCapturedInput()).toBeUndefined();
  });

  it('returns 401 for invalid API key', async () => {
    const useCase = createUseCase();
    const controller = new ChatController(useCase as any);

    const event = createEvent({
      headers: { authorization: 'Bearer wrong-key' },
      requestContext: { requestId: 'req-invalid-key', authorizer: { claims: {} } }
    });

    const response = await controller.handle(event);

    expect(response.statusCode).toBe(401);
    expect(useCase.getCapturedInput()).toBeUndefined();
  });

  it('returns 401 when no authentication is provided', async () => {
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
