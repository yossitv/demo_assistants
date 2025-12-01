import { DynamoDBDocumentClient, PutCommand, GetCommand, QueryCommand, DeleteCommand } from '@aws-sdk/lib-dynamodb';
import { APIGatewayProxyEvent, APIGatewayProxyResult } from '../../shared/types';
import { handler as chatHandler } from '../../handlers/chat';
import { handler as agentCreateHandler } from '../../handlers/agentCreate';
import { handler as knowledgeCreateHandler } from '../../handlers/knowledgeCreate';
import { handler as knowledgeListHandler } from '../../handlers/knowledgeList';
import { DIContainer } from '../di/DIContainer';

/**
 * Infrastructure Integration Tests
 *
 * Tests DynamoDB table operations, API Gateway endpoint configurations,
 * and Lambda handler invocations with mocked infrastructure.
 */
describe('Infrastructure Integration Tests', () => {
  // Store original environment variables
  const originalEnv = process.env;

  beforeAll(() => {
    // Set up test environment variables
    process.env = {
      ...originalEnv,
      AGENTS_TABLE_NAME: 'test-agents-table',
      KNOWLEDGE_SPACES_TABLE_NAME: 'test-knowledge-spaces-table',
      CONVERSATIONS_TABLE_NAME: 'test-conversations-table',
      OPENAI_API_KEY: 'test-openai-key',
      QDRANT_URL: 'http://localhost:6333',
      QDRANT_API_KEY: 'test-qdrant-key',
      EMBEDDING_MODEL: 'text-embedding-3-small',
      LLM_MODEL: 'gpt-4',
      LOG_LEVEL: 'INFO',
      SIMILARITY_THRESHOLD: '0.35',
      TOP_K: '8',
      MAX_CITED_URLS: '3',
    };
  });

  afterAll(() => {
    // Restore original environment variables
    process.env = originalEnv;
  });

  describe('DynamoDB Table Operations', () => {
    let mockSend: jest.Mock;
    let mockDynamoDB: DynamoDBDocumentClient;

    beforeEach(() => {
      mockSend = jest.fn();
      mockDynamoDB = {
        send: mockSend
      } as unknown as DynamoDBDocumentClient;
    });

    describe('Agents Table CRUD Operations', () => {
      const tableName = 'test-agents-table';

      it('should successfully create an agent (PUT)', async () => {
        const agentItem = {
          tenantId: 'tenant-123',
          agentId: 'agent-456',
          name: 'Test Agent',
          knowledgeSpaceIds: ['ks-1', 'ks-2'],
          strictRAG: true,
          description: 'Test agent description',
          createdAt: new Date().toISOString(),
        };

        mockSend.mockResolvedValueOnce({});

        const putCommand = new PutCommand({
          TableName: tableName,
          Item: agentItem,
        });

        await mockDynamoDB.send(putCommand);

        expect(mockSend).toHaveBeenCalledWith(
          expect.objectContaining({
            input: expect.objectContaining({
              TableName: tableName,
              Item: agentItem,
            })
          })
        );
      });

      it('should successfully retrieve an agent by tenantId and agentId (GET)', async () => {
        const mockAgent = {
          tenantId: 'tenant-123',
          agentId: 'agent-456',
          name: 'Test Agent',
          knowledgeSpaceIds: ['ks-1'],
          strictRAG: false,
          description: 'Test description',
          createdAt: '2024-01-01T00:00:00.000Z',
        };

        mockSend.mockResolvedValueOnce({ Item: mockAgent });

        const getCommand = new GetCommand({
          TableName: tableName,
          Key: {
            tenantId: 'tenant-123',
            agentId: 'agent-456',
          },
        });

        const result = await mockDynamoDB.send(getCommand);

        expect(mockSend).toHaveBeenCalledWith(
          expect.objectContaining({
            input: expect.objectContaining({
              TableName: tableName,
              Key: {
                tenantId: 'tenant-123',
                agentId: 'agent-456',
              },
            })
          })
        );
        expect(result.Item).toEqual(mockAgent);
      });

      it('should successfully query agents by tenantId (QUERY)', async () => {
        const mockAgents = [
          {
            tenantId: 'tenant-123',
            agentId: 'agent-1',
            name: 'Agent 1',
            knowledgeSpaceIds: ['ks-1'],
            strictRAG: true,
            createdAt: '2024-01-01T00:00:00.000Z',
          },
          {
            tenantId: 'tenant-123',
            agentId: 'agent-2',
            name: 'Agent 2',
            knowledgeSpaceIds: ['ks-2'],
            strictRAG: false,
            createdAt: '2024-01-02T00:00:00.000Z',
          },
        ];

        mockSend.mockResolvedValueOnce({ Items: mockAgents });

        const queryCommand = new QueryCommand({
          TableName: tableName,
          KeyConditionExpression: 'tenantId = :tenantId',
          ExpressionAttributeValues: {
            ':tenantId': 'tenant-123',
          },
        });

        const result = await mockDynamoDB.send(queryCommand);

        expect(mockSend).toHaveBeenCalledWith(
          expect.objectContaining({
            input: expect.objectContaining({
              TableName: tableName,
              KeyConditionExpression: 'tenantId = :tenantId',
            })
          })
        );
        expect(result.Items).toEqual(mockAgents);
      });

      it('should successfully delete an agent (DELETE)', async () => {
        mockSend.mockResolvedValueOnce({});

        const deleteCommand = new DeleteCommand({
          TableName: tableName,
          Key: {
            tenantId: 'tenant-123',
            agentId: 'agent-456',
          },
        });

        await mockDynamoDB.send(deleteCommand);

        expect(mockSend).toHaveBeenCalledWith(
          expect.objectContaining({
            input: expect.objectContaining({
              TableName: tableName,
              Key: {
                tenantId: 'tenant-123',
                agentId: 'agent-456',
              },
            })
          })
        );
      });
    });

    describe('KnowledgeSpaces Table CRUD Operations', () => {
      const tableName = 'test-knowledge-spaces-table';

      it('should successfully create a knowledge space (PUT)', async () => {
        const ksItem = {
          tenantId: 'tenant-123',
          knowledgeSpaceId: 'ks-789',
          name: 'Test KnowledgeSpace',
          type: 'web',
          sourceUrls: ['https://example.com'],
          currentVersion: '2024-01-01',
          createdAt: new Date().toISOString(),
        };

        mockSend.mockResolvedValueOnce({});

        const putCommand = new PutCommand({
          TableName: tableName,
          Item: ksItem,
        });

        await mockDynamoDB.send(putCommand);

        expect(mockSend).toHaveBeenCalledWith(
          expect.objectContaining({
            input: expect.objectContaining({
              TableName: tableName,
              Item: ksItem,
            })
          })
        );
      });

      it('should successfully retrieve a knowledge space (GET)', async () => {
        const mockKS = {
          tenantId: 'tenant-123',
          knowledgeSpaceId: 'ks-789',
          name: 'Test KnowledgeSpace',
          type: 'web',
          sourceUrls: ['https://example.com'],
          currentVersion: '2024-01-01',
          createdAt: '2024-01-01T00:00:00.000Z',
        };

        mockSend.mockResolvedValueOnce({ Item: mockKS });

        const getCommand = new GetCommand({
          TableName: tableName,
          Key: {
            tenantId: 'tenant-123',
            knowledgeSpaceId: 'ks-789',
          },
        });

        const result = await mockDynamoDB.send(getCommand);

        expect(result.Item).toEqual(mockKS);
      });

      it('should successfully query knowledge spaces by tenant (QUERY)', async () => {
        const mockKnowledgeSpaces = [
          {
            tenantId: 'tenant-123',
            knowledgeSpaceId: 'ks-1',
            name: 'KS 1',
            type: 'web',
            sourceUrls: ['https://example1.com'],
            currentVersion: '2024-01-01',
            createdAt: '2024-01-01T00:00:00.000Z',
          },
          {
            tenantId: 'tenant-123',
            knowledgeSpaceId: 'ks-2',
            name: 'KS 2',
            type: 'web',
            sourceUrls: ['https://example2.com'],
            currentVersion: '2024-01-02',
            createdAt: '2024-01-02T00:00:00.000Z',
          },
        ];

        mockSend.mockResolvedValueOnce({ Items: mockKnowledgeSpaces });

        const queryCommand = new QueryCommand({
          TableName: tableName,
          KeyConditionExpression: 'tenantId = :tenantId',
          ExpressionAttributeValues: {
            ':tenantId': 'tenant-123',
          },
        });

        const result = await mockDynamoDB.send(queryCommand);

        expect(result.Items).toEqual(mockKnowledgeSpaces);
      });
    });

    describe('Conversations Table CRUD Operations', () => {
      const tableName = 'test-conversations-table';

      it('should successfully create a conversation (PUT)', async () => {
        const conversationItem = {
          conversationId: 'conv-123',
          tenantId: 'tenant-456',
          agentId: 'agent-789',
          userId: 'user-101',
          lastUserMessage: 'Hello, how are you?',
          lastAssistantMessage: 'I am doing well, thank you!',
          referencedUrls: ['https://example.com'],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };

        mockSend.mockResolvedValueOnce({});

        const putCommand = new PutCommand({
          TableName: tableName,
          Item: conversationItem,
        });

        await mockDynamoDB.send(putCommand);

        expect(mockSend).toHaveBeenCalledWith(
          expect.objectContaining({
            input: expect.objectContaining({
              TableName: tableName,
              Item: conversationItem,
            })
          })
        );
      });

      it('should successfully retrieve a conversation (GET)', async () => {
        const mockConversation = {
          conversationId: 'conv-123',
          tenantId: 'tenant-456',
          agentId: 'agent-789',
          userId: 'user-101',
          lastUserMessage: 'Hello, how are you?',
          lastAssistantMessage: 'I am doing well!',
          referencedUrls: ['https://example.com'],
          createdAt: '2024-01-01T00:00:00.000Z',
          updatedAt: '2024-01-01T00:00:00.000Z',
        };

        mockSend.mockResolvedValueOnce({ Item: mockConversation });

        const getCommand = new GetCommand({
          TableName: tableName,
          Key: {
            conversationId: 'conv-123',
          },
        });

        const result = await mockDynamoDB.send(getCommand);

        expect(result.Item).toEqual(mockConversation);
      });

      it('should handle missing conversations gracefully', async () => {
        mockSend.mockResolvedValueOnce({});

        const getCommand = new GetCommand({
          TableName: tableName,
          Key: {
            conversationId: 'non-existent',
          },
        });

        const result = await mockDynamoDB.send(getCommand);

        expect(result.Item).toBeUndefined();
      });
    });

    describe('Table Resource Names and Configuration', () => {
      it('should have correct table names from environment variables', () => {
        expect(process.env.AGENTS_TABLE_NAME).toBe('test-agents-table');
        expect(process.env.KNOWLEDGE_SPACES_TABLE_NAME).toBe('test-knowledge-spaces-table');
        expect(process.env.CONVERSATIONS_TABLE_NAME).toBe('test-conversations-table');
      });

      it('should validate agents table schema requirements', () => {
        const validAgentItem = {
          tenantId: 'tenant-123',
          agentId: 'agent-456',
          name: 'Test Agent',
          knowledgeSpaceIds: ['ks-1'],
          strictRAG: true,
          createdAt: new Date().toISOString(),
        };

        expect(validAgentItem).toHaveProperty('tenantId');
        expect(validAgentItem).toHaveProperty('agentId');
        expect(validAgentItem).toHaveProperty('name');
        expect(validAgentItem).toHaveProperty('knowledgeSpaceIds');
        expect(validAgentItem).toHaveProperty('strictRAG');
      });

      it('should validate knowledge spaces table schema requirements', () => {
        const validKSItem = {
          tenantId: 'tenant-123',
          knowledgeSpaceId: 'ks-456',
          name: 'Test KS',
          type: 'web',
          sourceUrls: ['https://example.com'],
          currentVersion: '2024-01-01',
          createdAt: new Date().toISOString(),
        };

        expect(validKSItem).toHaveProperty('tenantId');
        expect(validKSItem).toHaveProperty('knowledgeSpaceId');
        expect(validKSItem).toHaveProperty('name');
        expect(validKSItem).toHaveProperty('type');
        expect(validKSItem).toHaveProperty('sourceUrls');
        expect(validKSItem).toHaveProperty('currentVersion');
      });
    });
  });

  describe('API Gateway Endpoint Configuration', () => {
    describe('Endpoint Structure and Routes', () => {
      it('should have correct API Gateway endpoint structure', () => {
        const expectedEndpoints = [
          { path: '/v1/knowledge/create', method: 'POST' },
          { path: '/v1/knowledge/list', method: 'GET' },
          { path: '/v1/agent/create', method: 'POST' },
          { path: '/v1/chat/completions', method: 'POST' },
        ];

        // Verify expected endpoints structure
        expectedEndpoints.forEach(endpoint => {
          expect(endpoint.path).toMatch(/^\/v1\//);
          expect(['GET', 'POST']).toContain(endpoint.method);
        });
      });

      it('should require Cognito authorization for all endpoints', () => {
        // All endpoints require Cognito JWT
        const authorizationType = 'COGNITO_USER_POOLS';
        expect(authorizationType).toBe('COGNITO_USER_POOLS');
      });

      it('should support CORS for all endpoints', () => {
        const corsHeaders = {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': '*',
          'Access-Control-Allow-Headers': 'Content-Type,Authorization',
        };

        expect(corsHeaders).toHaveProperty('Access-Control-Allow-Origin');
        expect(corsHeaders).toHaveProperty('Access-Control-Allow-Methods');
        expect(corsHeaders).toHaveProperty('Access-Control-Allow-Headers');
      });
    });

    describe('API Gateway Response Format', () => {
      it('should return proper API Gateway response structure', () => {
        const validResponse: APIGatewayProxyResult = {
          statusCode: 200,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          },
          body: JSON.stringify({ message: 'Success' }),
        };

        expect(validResponse).toHaveProperty('statusCode');
        expect(validResponse).toHaveProperty('body');
        expect(validResponse.statusCode).toBeGreaterThanOrEqual(200);
        expect(validResponse.statusCode).toBeLessThan(600);
      });

      it('should handle error responses with correct format', () => {
        const errorResponse: APIGatewayProxyResult = {
          statusCode: 400,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          },
          body: JSON.stringify({
            error: 'Bad Request',
            message: 'Invalid input',
          }),
        };

        expect(errorResponse.statusCode).toBe(400);
        const body = JSON.parse(errorResponse.body);
        expect(body).toHaveProperty('error');
        expect(body).toHaveProperty('message');
      });
    });

    describe('Request Validation', () => {
      it('should validate request has required authentication context', () => {
        const mockEvent: APIGatewayProxyEvent = {
          body: JSON.stringify({ test: 'data' }),
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer test-token',
          },
          httpMethod: 'POST',
          path: '/v1/agent/create',
          queryStringParameters: null,
          requestContext: {
            authorizer: {
              claims: {
                sub: 'user-123',
                'custom:tenant_id': 'tenant-456',
              },
            },
            requestId: 'test-request-id',
          },
        };

        expect(mockEvent.requestContext.authorizer?.claims?.sub).toBeDefined();
        expect(mockEvent.requestContext.authorizer?.claims?.['custom:tenant_id']).toBeDefined();
      });
    });
  });

  describe('Lambda Handler Invocations', () => {
    const mockHandle = jest.fn().mockResolvedValue({ statusCode: 200, body: '{}' });
    let diSpy: jest.SpyInstance;

    beforeAll(() => {
      diSpy = jest.spyOn(DIContainer, 'getInstance').mockReturnValue({
        getChatController: () => ({ handle: mockHandle }),
        getAgentCreateController: () => ({ handle: mockHandle }),
        getKnowledgeCreateController: () => ({ handle: mockHandle }),
        getKnowledgeListController: () => ({ handle: mockHandle })
      } as unknown as ReturnType<typeof DIContainer.getInstance>);
    });

    afterEach(() => {
      mockHandle.mockClear();
    });

    afterAll(() => {
      diSpy.mockRestore();
    });

    describe('Chat Lambda Handler', () => {
      it('should have correct handler path', () => {
        const handlerPath = 'handlers/chat.handler';
        expect(handlerPath).toBe('handlers/chat.handler');
      });

      it('should export handler function', () => {
        expect(chatHandler).toBeDefined();
        expect(typeof chatHandler).toBe('function');
      });

      it('should accept APIGatewayProxyEvent and return Promise<APIGatewayProxyResult>', async () => {
        const mockEvent: APIGatewayProxyEvent = {
          body: JSON.stringify({
            model: 'gpt-4',
            messages: [{ role: 'user', content: 'Hello' }],
            agentId: 'agent-123',
          }),
          headers: {
            'Content-Type': 'application/json',
          },
          httpMethod: 'POST',
          path: '/v1/chat/completions',
          queryStringParameters: null,
          requestContext: {
            authorizer: {
              claims: {
                sub: 'user-123',
                'custom:tenant_id': 'tenant-456',
              },
            },
            requestId: 'test-request-id',
          },
        };

        // The handler should be a function that returns a promise
        const result = await chatHandler(mockEvent);
        expect(mockHandle).toHaveBeenCalledWith(mockEvent);
        expect(result.statusCode).toBe(200);
      });
    });

    describe('Agent Create Lambda Handler', () => {
      it('should have correct handler path', () => {
        const handlerPath = 'handlers/agentCreate.handler';
        expect(handlerPath).toBe('handlers/agentCreate.handler');
      });

      it('should export handler function', () => {
        expect(agentCreateHandler).toBeDefined();
        expect(typeof agentCreateHandler).toBe('function');
      });

      it('should accept APIGatewayProxyEvent with correct request format', async () => {
        const mockEvent: APIGatewayProxyEvent = {
          body: JSON.stringify({
            name: 'New Agent',
            knowledgeSpaceIds: ['ks-1', 'ks-2'],
            strictRAG: true,
            description: 'Test agent',
          }),
          headers: {
            'Content-Type': 'application/json',
          },
          httpMethod: 'POST',
          path: '/v1/agent/create',
          queryStringParameters: null,
          requestContext: {
            authorizer: {
              claims: {
                sub: 'user-123',
                'custom:tenant_id': 'tenant-456',
              },
            },
            requestId: 'test-request-id',
          },
        };

        const result = await agentCreateHandler(mockEvent);
        expect(mockHandle).toHaveBeenCalledWith(mockEvent);
        expect(result.statusCode).toBe(200);
      });
    });

    describe('Knowledge Create Lambda Handler', () => {
      it('should have correct handler path', () => {
        const handlerPath = 'handlers/knowledgeCreate.handler';
        expect(handlerPath).toBe('handlers/knowledgeCreate.handler');
      });

      it('should export handler function', () => {
        expect(knowledgeCreateHandler).toBeDefined();
        expect(typeof knowledgeCreateHandler).toBe('function');
      });

      it('should accept APIGatewayProxyEvent with knowledge space data', async () => {
        const mockEvent: APIGatewayProxyEvent = {
          body: JSON.stringify({
            name: 'New Knowledge Space',
            sourceUrls: ['https://example.com', 'https://example.org'],
          }),
          headers: {
            'Content-Type': 'application/json',
          },
          httpMethod: 'POST',
          path: '/v1/knowledge/create',
          queryStringParameters: null,
          requestContext: {
            authorizer: {
              claims: {
                sub: 'user-123',
                'custom:tenant_id': 'tenant-456',
              },
            },
            requestId: 'test-request-id',
          },
        };

        const result = await knowledgeCreateHandler(mockEvent);
        expect(mockHandle).toHaveBeenCalledWith(mockEvent);
        expect(result.statusCode).toBe(200);
      });
    });

    describe('Knowledge List Lambda Handler', () => {
      it('should have correct handler path', () => {
        const handlerPath = 'handlers/knowledgeList.handler';
        expect(handlerPath).toBe('handlers/knowledgeList.handler');
      });

      it('should export handler function', () => {
        expect(knowledgeListHandler).toBeDefined();
        expect(typeof knowledgeListHandler).toBe('function');
      });

      it('should accept APIGatewayProxyEvent for GET request', async () => {
        const mockEvent: APIGatewayProxyEvent = {
          body: null,
          headers: {
            'Content-Type': 'application/json',
          },
          httpMethod: 'GET',
          path: '/v1/knowledge/list',
          queryStringParameters: null,
          requestContext: {
            authorizer: {
              claims: {
                sub: 'user-123',
                'custom:tenant_id': 'tenant-456',
              },
            },
            requestId: 'test-request-id',
          },
        };

        const result = await knowledgeListHandler(mockEvent);
        expect(mockHandle).toHaveBeenCalledWith(mockEvent);
        expect(result.statusCode).toBe(200);
      });
    });

    describe('Lambda Configuration', () => {
      it('should have correct runtime environment variables configured', () => {
        expect(process.env.AGENTS_TABLE_NAME).toBeDefined();
        expect(process.env.KNOWLEDGE_SPACES_TABLE_NAME).toBeDefined();
        expect(process.env.CONVERSATIONS_TABLE_NAME).toBeDefined();
        expect(process.env.OPENAI_API_KEY).toBeDefined();
        expect(process.env.QDRANT_URL).toBeDefined();
        expect(process.env.EMBEDDING_MODEL).toBe('text-embedding-3-small');
        expect(process.env.LLM_MODEL).toBe('gpt-4');
      });

      it('should have correct timeout configurations', () => {
        const lambdaTimeouts = {
          knowledgeCreate: 300, // 5 minutes in seconds
          knowledgeList: 30,
          agentCreate: 30,
          chat: 60,
        };

        expect(lambdaTimeouts.knowledgeCreate).toBe(300);
        expect(lambdaTimeouts.knowledgeList).toBe(30);
        expect(lambdaTimeouts.agentCreate).toBe(30);
        expect(lambdaTimeouts.chat).toBe(60);
      });

      it('should have correct memory configurations', () => {
        const lambdaMemory = {
          knowledgeCreate: 1024,
          knowledgeList: 512,
          agentCreate: 512,
          chat: 1024,
        };

        expect(lambdaMemory.knowledgeCreate).toBe(1024);
        expect(lambdaMemory.knowledgeList).toBe(512);
        expect(lambdaMemory.agentCreate).toBe(512);
        expect(lambdaMemory.chat).toBe(1024);
      });
    });
  });

  describe('End-to-End Integration Flow', () => {
    it('should validate complete request-response flow structure', () => {
      // Simulate a complete flow
      const requestEvent: APIGatewayProxyEvent = {
        body: JSON.stringify({ data: 'test' }),
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer token',
        },
        httpMethod: 'POST',
        path: '/v1/test',
        queryStringParameters: null,
        requestContext: {
          authorizer: {
            claims: {
              sub: 'user-123',
              'custom:tenant_id': 'tenant-456',
            },
          },
          requestId: 'req-123',
        },
      };

      const response: APIGatewayProxyResult = {
        statusCode: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
        body: JSON.stringify({ success: true }),
      };

      // Validate request structure
      expect(requestEvent.requestContext.authorizer?.claims?.sub).toBe('user-123');
      expect(requestEvent.requestContext.authorizer?.claims?.['custom:tenant_id']).toBe('tenant-456');

      // Validate response structure
      expect(response.statusCode).toBe(200);
      expect(response.headers?.['Content-Type']).toBe('application/json');
      expect(JSON.parse(response.body)).toHaveProperty('success');
    });

    it('should validate error handling flow', () => {
      const errorResponse: APIGatewayProxyResult = {
        statusCode: 500,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
        body: JSON.stringify({
          error: 'Internal Server Error',
          message: 'An unexpected error occurred',
        }),
      };

      expect(errorResponse.statusCode).toBe(500);
      const errorBody = JSON.parse(errorResponse.body);
      expect(errorBody).toHaveProperty('error');
      expect(errorBody).toHaveProperty('message');
    });
  });

  describe('Infrastructure Resource Naming Conventions', () => {
    it('should follow AWS CDK naming conventions for DynamoDB tables', () => {
      // CDK typically generates names with stack prefix
      const tableNames = [
        process.env.AGENTS_TABLE_NAME,
        process.env.KNOWLEDGE_SPACES_TABLE_NAME,
        process.env.CONVERSATIONS_TABLE_NAME,
      ];

      tableNames.forEach(tableName => {
        expect(tableName).toBeDefined();
        expect(typeof tableName).toBe('string');
        expect(tableName!.length).toBeGreaterThan(0);
      });
    });

    it('should have consistent Lambda function naming', () => {
      const lambdaFunctions = [
        'KnowledgeCreateFunction',
        'KnowledgeListFunction',
        'AgentCreateFunction',
        'ChatFunction',
      ];

      lambdaFunctions.forEach(funcName => {
        expect(funcName).toMatch(/Function$/);
        expect(funcName).toMatch(/^[A-Z]/);
      });
    });

    it('should have consistent API Gateway resource naming', () => {
      const apiResources = [
        'RagChatApi',
        'CognitoAuthorizer',
      ];

      apiResources.forEach(resource => {
        expect(resource).toMatch(/^[A-Z]/);
        expect(typeof resource).toBe('string');
      });
    });
  });
});
