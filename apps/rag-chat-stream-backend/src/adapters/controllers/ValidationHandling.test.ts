import * as jwt from 'jsonwebtoken';
import { ChatController } from './ChatController';
import { KnowledgeCreateController } from './KnowledgeCreateController';
import { AgentCreateController } from './AgentCreateController';
import { APIGatewayProxyEvent } from '../../shared/types';

const testSecret = 'test-jwt-secret';

const createAuthToken = () => {
  return jwt.sign(
    { sub: 'user-1', 'custom:tenant_id': 'tenant-1' },
    testSecret,
    { algorithm: 'HS256' }
  );
};

const mockLogger = () => ({
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn()
});

describe('Controller validation and error handling', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
    process.env.JWT_SECRET = testSecret;
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('returns 400 for invalid chat payloads', async () => {
    const useCase = { execute: jest.fn() };
    const logger = mockLogger();
    const controller = new ChatController(useCase as any, logger as any);

    const token = createAuthToken();
    const event: APIGatewayProxyEvent = {
      body: JSON.stringify({ model: 'agent-1', messages: [{ role: 'assistant', content: 'hi' }] }),
      headers: { authorization: `Bearer ${token}` },
      httpMethod: 'POST',
      path: '/v1/chat/completions',
      queryStringParameters: null,
      requestContext: { requestId: 'req-123', authorizer: { claims: {} } }
    } as any;

    const response = await controller.handle(event);
    expect(response.statusCode).toBe(400);
    expect(logger.error).not.toHaveBeenCalled();
  });

  it('returns 400 when knowledge create body is invalid JSON', async () => {
    const useCase = { execute: jest.fn() };
    const logger = mockLogger();
    const controller = new KnowledgeCreateController(useCase as any, logger as any);

    const token = createAuthToken();
    const event: APIGatewayProxyEvent = {
      body: '{bad json}',
      headers: { authorization: `Bearer ${token}` },
      httpMethod: 'POST',
      path: '/v1/knowledge/create',
      queryStringParameters: null,
      requestContext: { requestId: 'req-123', authorizer: { claims: {} } }
    } as any;

    const response = await controller.handle(event);
    expect(response.statusCode).toBe(400);
  });

  it('logs server errors in AgentCreateController', async () => {
    const useCase = { execute: jest.fn().mockRejectedValue(new Error('boom')) };
    const logger = mockLogger();
    const controller = new AgentCreateController(useCase as any, logger as any);

    const token = createAuthToken();
    const event: APIGatewayProxyEvent = {
      body: JSON.stringify({ name: 'Agent', knowledgeSpaceIds: ['ks-1'], strictRAG: true }),
      headers: { authorization: `Bearer ${token}` },
      httpMethod: 'POST',
      path: '/v1/agent/create',
      queryStringParameters: null,
      requestContext: { requestId: 'req-123', authorizer: { claims: {} } }
    } as any;

    const response = await controller.handle(event);
    expect(response.statusCode).toBe(500);
    expect(logger.error).toHaveBeenCalled();
  });
});
