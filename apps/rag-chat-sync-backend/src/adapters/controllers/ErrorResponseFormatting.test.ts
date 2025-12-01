import { KnowledgeCreateController } from './KnowledgeCreateController';
import { KnowledgeListController } from './KnowledgeListController';
import { AgentCreateController } from './AgentCreateController';
import { ChatController } from './ChatController';
import {
  ValidationError,
  NotFoundError,
  ExternalServiceError,
  InternalError
} from '../../shared/errors';
import { APIGatewayProxyEvent } from '../../shared/types';

const mockLogger = () => ({
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn()
});

const createBaseEvent = (overrides: Partial<APIGatewayProxyEvent> = {}): APIGatewayProxyEvent => ({
  body: null,
  headers: {},
  httpMethod: 'POST',
  path: '/test',
  queryStringParameters: null,
  requestContext: {
    requestId: 'req-123',
    authorizer: {
      claims: {
        'custom:tenant_id': 'tenant-1',
        sub: 'user-1'
      }
    }
  },
  ...overrides
});

describe('Error Response Formatting', () => {
  describe('Authentication Errors (401)', () => {
    it('KnowledgeCreateController returns 401 when tenantId is missing', async () => {
      const useCase = { execute: jest.fn() };
      const logger = mockLogger();
      const controller = new KnowledgeCreateController(useCase as any, logger as any);

      const event = createBaseEvent({
        requestContext: {
          requestId: 'req-123',
          authorizer: { claims: {} }
        }
      });

      const response = await controller.handle(event);
      
      expect(response.statusCode).toBe(401);
      const body = JSON.parse(response.body);
      expect(body.error).toBeDefined();
      expect(body.error.message).toContain('Unauthorized');
    });

    it('ChatController returns 401 when userId is missing', async () => {
      const useCase = { execute: jest.fn() };
      const logger = mockLogger();
      const controller = new ChatController(useCase as any, logger as any);

      const event = createBaseEvent({
        requestContext: {
          requestId: 'req-123',
          authorizer: {
            claims: { 'custom:tenant_id': 'tenant-1' }
          }
        }
      });

      const response = await controller.handle(event);
      
      expect(response.statusCode).toBe(401);
      const body = JSON.parse(response.body);
      expect(body.error).toBeDefined();
      expect(body.error.message).toBeDefined();
    });

    it('AgentCreateController returns 401 without authentication', async () => {
      const useCase = { execute: jest.fn() };
      const logger = mockLogger();
      const controller = new AgentCreateController(useCase as any, logger as any);

      const event = createBaseEvent({
        requestContext: {
          requestId: 'req-123',
          authorizer: { claims: {} }
        }
      });

      const response = await controller.handle(event);
      
      expect(response.statusCode).toBe(401);
      const body = JSON.parse(response.body);
      expect(body.error.message).toBeDefined();
    });
  });

  describe('Validation Errors (400)', () => {
    it('KnowledgeCreateController returns 400 for invalid JSON', async () => {
      const useCase = { execute: jest.fn() };
      const logger = mockLogger();
      const controller = new KnowledgeCreateController(useCase as any, logger as any);

      const event = createBaseEvent({
        body: '{invalid json}',
        requestContext: {
          requestId: 'req-123',
          authorizer: {
            claims: { 'custom:tenant_id': 'tenant-1', sub: 'user-1' }
          }
        }
      });

      const response = await controller.handle(event);
      
      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body);
      expect(body.error).toBeDefined();
      expect(body.error.message).toContain('JSON');
    });

    it('KnowledgeCreateController returns 400 for missing required fields', async () => {
      const useCase = { execute: jest.fn() };
      const logger = mockLogger();
      const controller = new KnowledgeCreateController(useCase as any, logger as any);

      const event = createBaseEvent({
        body: JSON.stringify({ name: 'Test' }),
        requestContext: {
          requestId: 'req-123',
          authorizer: {
            claims: { 'custom:tenant_id': 'tenant-1', sub: 'user-1' }
          }
        }
      });

      const response = await controller.handle(event);
      
      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body);
      expect(body.error.message).toBeDefined();
    });

    it('AgentCreateController returns 400 for empty knowledgeSpaceIds', async () => {
      const useCase = { execute: jest.fn() };
      const logger = mockLogger();
      const controller = new AgentCreateController(useCase as any, logger as any);

      const event = createBaseEvent({
        body: JSON.stringify({ name: 'Agent', knowledgeSpaceIds: [] }),
        requestContext: {
          requestId: 'req-123',
          authorizer: {
            claims: { 'custom:tenant_id': 'tenant-1', sub: 'user-1' }
          }
        }
      });

      const response = await controller.handle(event);
      
      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body);
      expect(body.error.message).toContain('cannot be empty');
    });

    it('ChatController returns 400 for missing user message', async () => {
      const useCase = { execute: jest.fn() };
      const logger = mockLogger();
      const controller = new ChatController(useCase as any, logger as any);

      const event = createBaseEvent({
        body: JSON.stringify({
          model: 'agent-1',
          messages: [{ role: 'system', content: 'You are helpful' }]
        })
      });

      const response = await controller.handle(event);
      
      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body);
      expect(body.error.message).toContain('user message');
    });

    it('error response includes error object with message field', async () => {
      const useCase = { execute: jest.fn() };
      const logger = mockLogger();
      const controller = new ChatController(useCase as any, logger as any);

      const event = createBaseEvent({
        body: JSON.stringify({ model: '', messages: [] })
      });

      const response = await controller.handle(event);
      
      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body);
      expect(body).toHaveProperty('error');
      expect(body.error).toHaveProperty('message');
      expect(typeof body.error.message).toBe('string');
    });
  });

  describe('Not Found Errors', () => {
    it('ChatController returns 500 for NotFoundError (current implementation)', async () => {
      const useCase = {
        execute: jest.fn().mockRejectedValue(new NotFoundError('Agent not found'))
      };
      const logger = mockLogger();
      const controller = new ChatController(useCase as any, logger as any);

      const event = createBaseEvent({
        body: JSON.stringify({
          model: 'nonexistent-agent',
          messages: [{ role: 'user', content: 'hello' }]
        })
      });

      const response = await controller.handle(event);
      
      // Current implementation returns 500 for all non-validation errors
      expect(response.statusCode).toBe(500);
      const body = JSON.parse(response.body);
      expect(body.error).toBeDefined();
      expect(logger.error).toHaveBeenCalled();
    });

    it('logs NotFoundError with context', async () => {
      const useCase = {
        execute: jest.fn().mockRejectedValue(new NotFoundError('Resource not found'))
      };
      const logger = mockLogger();
      const controller = new KnowledgeListController(useCase as any, logger as any);

      const event = createBaseEvent({
        requestContext: {
          requestId: 'req-123',
          authorizer: {
            claims: { 'custom:tenant_id': 'tenant-1', sub: 'user-1' }
          }
        }
      });

      await controller.handle(event);

      expect(logger.error).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(Error),
        expect.any(Object)
      );
    });
  });

  describe('External Service Errors', () => {
    it('returns 500 for ExternalServiceError (current implementation)', async () => {
      const useCase = {
        execute: jest.fn().mockRejectedValue(
          new ExternalServiceError('OpenAI API failed')
        )
      };
      const logger = mockLogger();
      const controller = new ChatController(useCase as any, logger as any);

      const event = createBaseEvent({
        body: JSON.stringify({
          model: 'agent-1',
          messages: [{ role: 'user', content: 'hello' }]
        })
      });

      const response = await controller.handle(event);
      
      // Current implementation returns 500 for all non-validation errors
      expect(response.statusCode).toBe(500);
      const body = JSON.parse(response.body);
      expect(body.error).toBeDefined();
    });

    it('returns 500 for service unavailable errors (current implementation)', async () => {
      const useCase = {
        execute: jest.fn().mockRejectedValue(
          new ExternalServiceError('Qdrant unavailable', 503)
        )
      };
      const logger = mockLogger();
      const controller = new KnowledgeCreateController(useCase as any, logger as any);

      const event = createBaseEvent({
        body: JSON.stringify({
          name: 'Test',
          sourceUrls: ['https://example.com']
        }),
        requestContext: {
          requestId: 'req-123',
          authorizer: {
            claims: { 'custom:tenant_id': 'tenant-1', sub: 'user-1' }
          }
        }
      });

      const response = await controller.handle(event);
      
      // Current implementation returns 500 for all non-validation errors
      expect(response.statusCode).toBe(500);
      const body = JSON.parse(response.body);
      expect(body.error).toBeDefined();
    });

    it('logs external service errors', async () => {
      const useCase = {
        execute: jest.fn().mockRejectedValue(
          new ExternalServiceError('Vector DB timeout', 504)
        )
      };
      const logger = mockLogger();
      const controller = new AgentCreateController(useCase as any, logger as any);

      const event = createBaseEvent({
        body: JSON.stringify({
          name: 'Agent',
          knowledgeSpaceIds: ['ks-1']
        }),
        requestContext: {
          requestId: 'req-123',
          authorizer: {
            claims: { 'custom:tenant_id': 'tenant-1', sub: 'user-1' }
          }
        }
      });

      await controller.handle(event);

      expect(logger.error).toHaveBeenCalled();
    });
  });

  describe('Internal Errors (500)', () => {
    it('returns 500 for unexpected errors', async () => {
      const useCase = {
        execute: jest.fn().mockRejectedValue(new Error('Unexpected error'))
      };
      const logger = mockLogger();
      const controller = new ChatController(useCase as any, logger as any);

      const event = createBaseEvent({
        body: JSON.stringify({
          model: 'agent-1',
          messages: [{ role: 'user', content: 'hello' }]
        })
      });

      const response = await controller.handle(event);
      
      expect(response.statusCode).toBe(500);
      const body = JSON.parse(response.body);
      expect(body.error.message).toBeDefined();
    });

    it('returns 500 for InternalError', async () => {
      const useCase = {
        execute: jest.fn().mockRejectedValue(
          new InternalError('Database connection failed')
        )
      };
      const logger = mockLogger();
      const controller = new KnowledgeListController(useCase as any, logger as any);

      const event = createBaseEvent({
        requestContext: {
          requestId: 'req-123',
          authorizer: {
            claims: { 'custom:tenant_id': 'tenant-1', sub: 'user-1' }
          }
        }
      });

      const response = await controller.handle(event);

      expect(response.statusCode).toBe(500);
      const body = JSON.parse(response.body);
      // Current implementation returns generic error message
      expect(body.error.message).toBe('Internal server error');
    });

    it('logs internal errors with full context', async () => {
      const error = new InternalError('Critical failure');
      const useCase = {
        execute: jest.fn().mockRejectedValue(error)
      };
      const logger = mockLogger();
      const controller = new AgentCreateController(useCase as any, logger as any);

      const event = createBaseEvent({
        body: JSON.stringify({
          name: 'Agent',
          knowledgeSpaceIds: ['ks-1']
        }),
        requestContext: {
          requestId: 'req-123',
          authorizer: {
            claims: { 'custom:tenant_id': 'tenant-1', sub: 'user-1' }
          }
        }
      });

      await controller.handle(event);

      expect(logger.error).toHaveBeenCalledWith(
        expect.stringContaining('Error'),
        expect.any(Error),
        expect.any(Object)
      );
    });

    it('does not expose internal error details in production', async () => {
      const useCase = {
        execute: jest.fn().mockRejectedValue(
          new Error('Internal database password: secret123')
        )
      };
      const logger = mockLogger();
      const controller = new ChatController(useCase as any, logger as any);

      const event = createBaseEvent({
        body: JSON.stringify({
          model: 'agent-1',
          messages: [{ role: 'user', content: 'hello' }]
        })
      });

      const response = await controller.handle(event);
      
      expect(response.statusCode).toBe(500);
      const body = JSON.parse(response.body);
      // Should return generic message, not expose internal details
      expect(body.error.message).not.toContain('password');
      expect(body.error.message).not.toContain('secret123');
    });
  });

  describe('Error Response Structure', () => {
    it('all error responses have consistent structure', async () => {
      const testCases = [
        {
          controller: new ChatController({ execute: jest.fn() } as any, mockLogger() as any),
          event: createBaseEvent({ requestContext: { requestId: 'req-123', authorizer: { claims: {} } } }),
          expectedStatus: 401
        },
        {
          controller: new KnowledgeCreateController({ execute: jest.fn() } as any, mockLogger() as any),
          event: createBaseEvent({
            body: '{}',
            requestContext: { requestId: 'req-123', authorizer: { claims: { 'custom:tenant_id': 't1', sub: 'user-1' } } }
          }),
          expectedStatus: 400
        }
      ];

      for (const { controller, event, expectedStatus } of testCases) {
        const response = await controller.handle(event);
        
        expect(response.statusCode).toBe(expectedStatus);
        const body = JSON.parse(response.body);
        expect(body).toHaveProperty('error');
        expect(body.error).toHaveProperty('message');
        expect(typeof body.error.message).toBe('string');
      }
    });

    it('error responses are valid JSON', async () => {
      const useCase = { execute: jest.fn() };
      const logger = mockLogger();
      const controller = new ChatController(useCase as any, logger as any);

      const event = createBaseEvent({
        requestContext: {
          requestId: 'req-123',
          authorizer: { claims: {} }
        }
      });

      const response = await controller.handle(event);
      
      expect(() => JSON.parse(response.body)).not.toThrow();
    });

    it('error responses include appropriate HTTP status codes (current implementation)', async () => {
      const statusCodeTests = [
        { error: new ValidationError('test'), expectedStatus: 400 },
        { error: new NotFoundError('test'), expectedStatus: 500 }, // Current: all non-validation = 500
        { error: new ExternalServiceError('test', 502), expectedStatus: 500 },
        { error: new ExternalServiceError('test', 503), expectedStatus: 500 },
        { error: new InternalError('test'), expectedStatus: 500 }
      ];

      for (const { error, expectedStatus } of statusCodeTests) {
        const useCase = { execute: jest.fn().mockRejectedValue(error) };
        const logger = mockLogger();
        const controller = new ChatController(useCase as any, logger as any);

        const event = createBaseEvent({
          body: JSON.stringify({
            model: 'agent-1',
            messages: [{ role: 'user', content: 'test' }]
          })
        });

        const response = await controller.handle(event);
        expect(response.statusCode).toBe(expectedStatus);
      }
    });
  });
});
