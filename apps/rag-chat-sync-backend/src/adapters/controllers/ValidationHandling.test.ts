import { ChatController } from './ChatController';
import { KnowledgeCreateController } from './KnowledgeCreateController';
import { AgentCreateController } from './AgentCreateController';
import { APIGatewayProxyEvent } from '../../shared/types';

const baseRequestContext = {
  requestId: 'req-123',
  authorizer: {
    claims: {
      'custom:tenant_id': 'tenant-1',
      sub: 'user-1'
    }
  }
};

const mockLogger = () => ({
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn()
});

describe('Controller validation and error handling', () => {
  it('returns 400 for invalid chat payloads', async () => {
    const useCase = { execute: jest.fn() };
    const logger = mockLogger();
    const controller = new ChatController(useCase as any, logger as any);

    const event: APIGatewayProxyEvent = {
      body: JSON.stringify({ model: 'agent-1', messages: [{ role: 'assistant', content: 'hi' }] }),
      headers: {},
      httpMethod: 'POST',
      path: '/v1/chat/completions',
      queryStringParameters: null,
      requestContext: baseRequestContext
    };

    const response = await controller.handle(event);
    expect(response.statusCode).toBe(400);
    expect(logger.error).not.toHaveBeenCalled();
  });

  it('returns 400 when knowledge create body is invalid JSON', async () => {
    const useCase = { execute: jest.fn() };
    const logger = mockLogger();
    const controller = new KnowledgeCreateController(useCase as any, logger as any);

    const event: APIGatewayProxyEvent = {
      body: '{bad json}',
      headers: {},
      httpMethod: 'POST',
      path: '/v1/knowledge/create',
      queryStringParameters: null,
      requestContext: baseRequestContext
    };

    const response = await controller.handle(event);
    expect(response.statusCode).toBe(400);
  });

  it('logs server errors in AgentCreateController', async () => {
    const useCase = { execute: jest.fn().mockRejectedValue(new Error('boom')) };
    const logger = mockLogger();
    const controller = new AgentCreateController(useCase as any, logger as any);

    const event: APIGatewayProxyEvent = {
      body: JSON.stringify({ name: 'Agent', knowledgeSpaceIds: ['ks-1'], strictRAG: true }),
      headers: {},
      httpMethod: 'POST',
      path: '/v1/agent/create',
      queryStringParameters: null,
      requestContext: baseRequestContext
    };

    const response = await controller.handle(event);
    expect(response.statusCode).toBe(500);
    expect(logger.error).toHaveBeenCalled();
  });
});
