import { KnowledgeCreateController } from './KnowledgeCreateController';
import { KnowledgeListController } from './KnowledgeListController';
import { AgentCreateController } from './AgentCreateController';
import { ChatController } from './ChatController';

describe('Controllers - validation and auth', () => {
  const baseEvent = {
    body: null,
    headers: {},
    httpMethod: 'POST',
    path: '/test',
    queryStringParameters: null,
    requestContext: { requestId: 'req-1', authorizer: { claims: {} } }
  } as any;

  it('KnowledgeCreateController returns 401 without tenant claim (Property 4)', async () => {
    const controller = new KnowledgeCreateController({ execute: jest.fn() } as any);
    const res = await controller.handle(baseEvent);
    expect(res.statusCode).toBe(401);
  });

  it('KnowledgeCreateController returns 400 on invalid body', async () => {
    const controller = new KnowledgeCreateController({ execute: jest.fn() } as any);
    const event = { ...baseEvent, requestContext: { authorizer: { claims: { 'custom:tenant_id': 't1', sub: 'user-1' } } }, body: '{}' } as any;
    const res = await controller.handle(event);
    expect(res.statusCode).toBe(400);
  });

  it('KnowledgeCreateController calls use case on valid input', async () => {
    const useCase = { execute: jest.fn().mockResolvedValue({ knowledgeSpaceId: 'ks-1', status: 'completed', successfulUrls: 1, failedUrls: 0 }) } as any;
    const controller = new KnowledgeCreateController(useCase);
    const event = {
      ...baseEvent,
      requestContext: { requestId: 'req-1', authorizer: { claims: { 'custom:tenant_id': 't1', sub: 'user-1' } } },
      body: JSON.stringify({ name: 'KS', sourceUrls: ['https://example.com'] })
    } as any;
    const res = await controller.handle(event);
    expect(useCase.execute).toHaveBeenCalledWith({ tenantId: 't1', name: 'KS', sourceUrls: ['https://example.com'], requestId: 'req-1' });
    expect(res.statusCode).toBe(200);
  });

  it('KnowledgeListController returns 401 without tenant claim', async () => {
    const controller = new KnowledgeListController({ execute: jest.fn() } as any);
    const res = await controller.handle(baseEvent);
    expect(res.statusCode).toBe(401);
  });

  it('AgentCreateController validates body', async () => {
    const controller = new AgentCreateController({ execute: jest.fn() } as any);
    const event = { ...baseEvent, requestContext: { authorizer: { claims: { 'custom:tenant_id': 't1', sub: 'user-1' } } }, body: '{}' } as any;
    const res = await controller.handle(event);
    expect(res.statusCode).toBe(400);
  });

  it('ChatController enforces auth (Property 4)', async () => {
    const controller = new ChatController({ execute: jest.fn() } as any);
    const res = await controller.handle(baseEvent);
    expect(res.statusCode).toBe(401);
  });

  it('ChatController validates body', async () => {
    const controller = new ChatController({ execute: jest.fn() } as any);
    const event = { ...baseEvent, requestContext: { authorizer: { claims: { 'custom:tenant_id': 't1', sub: 'u1' } } }, body: '{}' } as any;
    const res = await controller.handle(event);
    expect(res.statusCode).toBe(400);
  });

  it('ChatController returns OpenAI-compatible payload passthrough (Property 8)', async () => {
    const payload = {
      id: 'conv_1',
      object: 'chat.completion',
      model: 'agent-1',
      choices: [{ message: { role: 'assistant', content: 'hi', cited_urls: [] } }]
    };
    const controller = new ChatController({ execute: jest.fn().mockResolvedValue(payload) } as any);
    const event = {
      ...baseEvent,
      requestContext: { authorizer: { claims: { 'custom:tenant_id': 't1', sub: 'u1' } } },
      body: JSON.stringify({ model: 'agent-1', messages: [{ role: 'user', content: 'hello' }] })
    } as any;
    const res = await controller.handle(event);
    expect(res.statusCode).toBe(200);
    const parsed = JSON.parse(res.body);
    expect(parsed).toMatchObject(payload);
  });
});
