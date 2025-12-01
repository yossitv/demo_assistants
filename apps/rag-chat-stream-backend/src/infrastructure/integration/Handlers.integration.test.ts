import { handler as chatHandler } from '../../handlers/chat';
import { handler as knowledgeCreateHandler } from '../../handlers/knowledgeCreate';
import { handler as knowledgeListHandler } from '../../handlers/knowledgeList';
import { handler as agentCreateHandler } from '../../handlers/agentCreate';
import { DIContainer } from '../di/DIContainer';
import { APIGatewayProxyEvent } from '../../shared/types';

describe('Lambda handler integration (DI wiring)', () => {
  const baseContext = {
    requestId: 'req-123',
    authorizer: {
      claims: {
        sub: 'user-1',
        'custom:tenant_id': 'tenant-1'
      }
    }
  };

  const buildEvent = (body: any = {}, overrides: Partial<APIGatewayProxyEvent> = {}): APIGatewayProxyEvent => ({
    body: JSON.stringify(body),
    headers: {},
    httpMethod: 'POST',
    path: '/test',
    queryStringParameters: null,
    requestContext: {
      ...baseContext,
      ...(overrides.requestContext || {})
    }
  });

  const mockHandle = jest.fn();
  const mockContainer = {
    getChatController: () => ({ handle: mockHandle }),
    getKnowledgeCreateController: () => ({ handle: mockHandle }),
    getKnowledgeListController: () => ({ handle: mockHandle }),
    getAgentCreateController: () => ({ handle: mockHandle })
  } as unknown as ReturnType<typeof DIContainer.getInstance>;

  let spy: jest.SpyInstance;

  beforeEach(() => {
    mockHandle.mockResolvedValue({ statusCode: 200, body: '{}' });
    spy = jest.spyOn(DIContainer, 'getInstance').mockReturnValue(mockContainer);
  });

  afterEach(() => {
    spy.mockRestore();
    mockHandle.mockReset();
  });

  it('invokes ChatController via DI container', async () => {
    const event = buildEvent({ model: 'agent-1', messages: [{ role: 'user', content: 'hi' }] });
    const result = await chatHandler(event);

    expect(mockHandle).toHaveBeenCalledWith(event);
    expect(result.statusCode).toBe(200);
  });

  it('invokes KnowledgeCreateController via DI container', async () => {
    const event = buildEvent({ name: 'Docs', sourceUrls: ['https://example.com'] });
    const result = await knowledgeCreateHandler(event);

    expect(mockHandle).toHaveBeenCalledWith(event);
    expect(result.statusCode).toBe(200);
  });

  it('invokes KnowledgeListController via DI container', async () => {
    const listEvent: APIGatewayProxyEvent = {
      ...buildEvent(undefined),
      body: null,
      httpMethod: 'GET'
    };
    const result = await knowledgeListHandler(listEvent);

    expect(mockHandle).toHaveBeenCalledWith(listEvent);
    expect(result.statusCode).toBe(200);
  });

  it('invokes AgentCreateController via DI container', async () => {
    const event = buildEvent({ name: 'Agent', knowledgeSpaceIds: ['ks-1'] });
    const result = await agentCreateHandler(event);

    expect(mockHandle).toHaveBeenCalledWith(event);
    expect(result.statusCode).toBe(200);
  });
});
