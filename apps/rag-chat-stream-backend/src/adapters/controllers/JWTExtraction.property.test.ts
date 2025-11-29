import * as fc from 'fast-check';
import { KnowledgeCreateController } from './KnowledgeCreateController';
import { KnowledgeListController } from './KnowledgeListController';
import { AgentCreateController } from './AgentCreateController';
import { ChatController } from './ChatController';
import { APIGatewayProxyEvent } from '../../shared/types';

/**
 * Feature: rag-chat-backend-mvp, Property 4: Authentication extraction consistency
 * Validates: Requirements 5.3, 5.4
 *
 * For any valid Cognito JWT, extracting tenantId and userId should always produce
 * the same values for the same token across all endpoints.
 *
 * This test verifies that JWT claim extraction is consistent and deterministic
 * across all controllers, ensuring proper authentication and tenant isolation.
 */
describe('Property 4: Authentication extraction consistency', () => {
  // Configure property tests to run 100 iterations
  const numRuns = 100;

  // Helper to create a mock API Gateway event with JWT claims
  const createEventWithClaims = (
    tenantId: string | undefined,
    userId: string | undefined,
    body: string = '{}'
  ): APIGatewayProxyEvent => ({
    body,
    headers: {},
    httpMethod: 'POST',
    path: '/test',
    queryStringParameters: null,
    requestContext: {
      requestId: 'test-request',
      authorizer: {
        claims: {
          ...(tenantId !== undefined && { 'custom:tenant_id': tenantId }),
          ...(userId !== undefined && { sub: userId })
        }
      }
    }
  } as any);

  // Mock logger
  const mockLogger = () => ({
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn()
  });

  // Mock use case that captures the extracted values
  const createCapturingUseCase = () => {
    let capturedTenantId: string | undefined;
    let capturedUserId: string | undefined;

    return {
      execute: jest.fn().mockImplementation((input: any) => {
        capturedTenantId = input.tenantId;
        capturedUserId = input.userId;
        return Promise.resolve({ success: true });
      }),
      getCapturedTenantId: () => capturedTenantId,
      getCapturedUserId: () => capturedUserId
    };
  };

  it('should extract the same tenantId from identical JWT claims across KnowledgeCreateController calls', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 1, maxLength: 100 }).filter(s => s.trim().length > 0),
        fc.string({ minLength: 1, maxLength: 100 }).filter(s => s.trim().length > 0),
        async (tenantId, userId) => {
          const useCase1 = createCapturingUseCase();
          const useCase2 = createCapturingUseCase();

          const controller1 = new KnowledgeCreateController(useCase1 as any, mockLogger() as any);
          const controller2 = new KnowledgeCreateController(useCase2 as any, mockLogger() as any);

          const event = createEventWithClaims(
            tenantId,
            userId,
            JSON.stringify({ name: 'Test', sourceUrls: ['https://example.com'] })
          );

          await Promise.all([
            controller1.handle(event),
            controller2.handle(event)
          ]);

          // Both controllers should extract the same tenantId
          return useCase1.getCapturedTenantId() === useCase2.getCapturedTenantId() &&
                 useCase1.getCapturedTenantId() === tenantId;
        }
      ),
      { numRuns }
    );
  });

  it('should extract the same tenantId and userId from identical JWT claims across ChatController calls', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 1, maxLength: 100 }),
        fc.string({ minLength: 1, maxLength: 100 }),
        async (tenantId, userId) => {
          const useCase1 = createCapturingUseCase();
          const useCase2 = createCapturingUseCase();

          const controller1 = new ChatController(useCase1 as any, mockLogger() as any);
          const controller2 = new ChatController(useCase2 as any, mockLogger() as any);

          const event = createEventWithClaims(
            tenantId,
            userId,
            JSON.stringify({
              model: 'agent-1',
              messages: [{ role: 'user', content: 'test' }]
            })
          );

          await Promise.all([
            controller1.handle(event),
            controller2.handle(event)
          ]);

          // Both controllers should extract the same tenantId and userId
          return useCase1.getCapturedTenantId() === useCase2.getCapturedTenantId() &&
                 useCase1.getCapturedUserId() === useCase2.getCapturedUserId() &&
                 useCase1.getCapturedTenantId() === tenantId &&
                 useCase1.getCapturedUserId() === userId;
        }
      ),
      { numRuns }
    );
  });

  it('should extract consistent tenantId across all controller types', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 1, maxLength: 100 }).filter(s => s.trim().length > 0),
        fc.string({ minLength: 1, maxLength: 100 }).filter(s => s.trim().length > 0),
        async (tenantId, userId) => {
          const knowledgeCreateUseCase = createCapturingUseCase();
          const knowledgeListUseCase = createCapturingUseCase();
          const agentCreateUseCase = createCapturingUseCase();

          const knowledgeCreateController = new KnowledgeCreateController(knowledgeCreateUseCase as any, mockLogger() as any);
          const knowledgeListController = new KnowledgeListController(knowledgeListUseCase as any, mockLogger() as any);
          const agentCreateController = new AgentCreateController(agentCreateUseCase as any, mockLogger() as any);

          const knowledgeCreateEvent = createEventWithClaims(
            tenantId,
            userId,
            JSON.stringify({ name: 'Test', sourceUrls: ['https://example.com'] })
          );

          const knowledgeListEvent = createEventWithClaims(tenantId, userId);

          const agentCreateEvent = createEventWithClaims(
            tenantId,
            userId,
            JSON.stringify({
              name: 'Agent',
              knowledgeSpaceIds: ['ks-1'],
              strictRAG: true
            })
          );

          await Promise.all([
            knowledgeCreateController.handle(knowledgeCreateEvent),
            knowledgeListController.handle(knowledgeListEvent),
            agentCreateController.handle(agentCreateEvent)
          ]);

          // All controllers should extract the same tenantId
          const extractedTenantIds = [
            knowledgeCreateUseCase.getCapturedTenantId(),
            knowledgeListUseCase.getCapturedTenantId(),
            agentCreateUseCase.getCapturedTenantId()
          ];

          return extractedTenantIds.every(id => id === tenantId);
        }
      ),
      { numRuns }
    );
  });

  it('should return 401 when tenantId claim is missing', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.constantFrom(
          new KnowledgeCreateController({ execute: jest.fn() } as any, mockLogger() as any),
          new KnowledgeListController({ execute: jest.fn() } as any, mockLogger() as any),
          new AgentCreateController({ execute: jest.fn() } as any, mockLogger() as any)
        ),
        async (controller) => {
          const event = createEventWithClaims(undefined, undefined);

          const response = await controller.handle(event);
          return response.statusCode === 401;
        }
      ),
      { numRuns }
    );
  });

  it('should return 401 when userId claim is missing for ChatController', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 1, maxLength: 100 }),
        async (tenantId) => {
          const controller = new ChatController({ execute: jest.fn() } as any, mockLogger() as any);

          // Event with tenantId but no userId
          const event = createEventWithClaims(
            tenantId,
            undefined,
            JSON.stringify({
              model: 'agent-1',
              messages: [{ role: 'user', content: 'test' }]
            })
          );

          const response = await controller.handle(event);
          return response.statusCode === 401;
        }
      ),
      { numRuns }
    );
  });

  it('should extract the same values when the same event is processed multiple times', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 1, maxLength: 100 }),
        fc.string({ minLength: 1, maxLength: 100 }),
        async (tenantId, userId) => {
          const useCases = Array.from({ length: 5 }, () => createCapturingUseCase());
          const controllers = useCases.map(uc => new ChatController(uc as any, mockLogger() as any));

          const event = createEventWithClaims(
            tenantId,
            userId,
            JSON.stringify({
              model: 'agent-1',
              messages: [{ role: 'user', content: 'test' }]
            })
          );

          await Promise.all(
            controllers.map(controller => controller.handle(event))
          );

          // All extractions should produce the same values
          const extractedTenantIds = useCases.map(uc => uc.getCapturedTenantId());
          const extractedUserIds = useCases.map(uc => uc.getCapturedUserId());

          return extractedTenantIds.every(id => id === tenantId) &&
                 extractedUserIds.every(id => id === userId);
        }
      ),
      { numRuns }
    );
  });

  it('should handle special characters in tenantId and userId consistently', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 1, maxLength: 100 }),
        fc.string({ minLength: 1, maxLength: 100 }),
        async (tenantId, userId) => {
          const useCase = createCapturingUseCase();
          const controller = new ChatController(useCase as any, mockLogger() as any);

          const event = createEventWithClaims(
            tenantId,
            userId,
            JSON.stringify({
              model: 'agent-1',
              messages: [{ role: 'user', content: 'test' }]
            })
          );

          await controller.handle(event);

          // Extracted values should match exactly, including special characters
          return useCase.getCapturedTenantId() === tenantId &&
                 useCase.getCapturedUserId() === userId;
        }
      ),
      { numRuns }
    );
  });

  it('should extract claims consistently regardless of other claims present', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 1, maxLength: 100 }),
        fc.string({ minLength: 1, maxLength: 100 }),
        fc.record({
          email: fc.string(),
          name: fc.string(),
          'custom:role': fc.string()
        }),
        async (tenantId, userId, extraClaims) => {
          const useCase = createCapturingUseCase();
          const controller = new ChatController(useCase as any, mockLogger() as any);

          const event: APIGatewayProxyEvent = {
            body: JSON.stringify({
              model: 'agent-1',
              messages: [{ role: 'user', content: 'test' }]
            }),
            headers: {},
            httpMethod: 'POST',
            path: '/test',
            queryStringParameters: null,
            requestContext: {
              requestId: 'test-request',
              authorizer: {
                claims: {
                  'custom:tenant_id': tenantId,
                  sub: userId,
                  ...extraClaims
                }
              }
            }
          } as any;

          await controller.handle(event);

          // Should extract correct values regardless of extra claims
          return useCase.getCapturedTenantId() === tenantId &&
                 useCase.getCapturedUserId() === userId;
        }
      ),
      { numRuns }
    );
  });
});
