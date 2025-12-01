import * as fc from 'fast-check';
import { CloudWatchLogger } from './CloudWatchLogger';

/**
 * Feature: rag-chat-backend-mvp, Property 13: CloudWatch logging presence
 * Validates: Requirements 7.1, 7.2
 * 
 * For any chat request processed, CloudWatch logs should contain entries with
 * tenantId, agentId, latest user message, hit count, and top URLs.
 */
describe('Property 13: CloudWatch logging presence', () => {
  let logger: CloudWatchLogger;
  let consoleLogSpy: jest.SpyInstance;
  let consoleErrorSpy: jest.SpyInstance;

  beforeEach(() => {
    logger = new CloudWatchLogger();
    consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
  });

  afterEach(() => {
    consoleLogSpy.mockRestore();
    consoleErrorSpy.mockRestore();
  });

  it('logs chat request with required fields (Requirement 7.1)', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 5, maxLength: 20 }), // tenantId
        fc.string({ minLength: 5, maxLength: 20 }), // agentId
        fc.string({ minLength: 5, maxLength: 20 }), // userId
        fc.string({ minLength: 10, maxLength: 200 }), // user message
        fc.string({ minLength: 5, maxLength: 20 }), // requestId
        async (tenantId, agentId, userId, userMessage, requestId) => {
          consoleLogSpy.mockClear();
          
          // Simulate logging a chat request as done in ChatWithAgentUseCase
          logger.info('Processing chat request', {
            tenantId,
            agentId,
            userId,
            userMessage: userMessage.substring(0, 200) + (userMessage.length > 200 ? '...' : ''),
            requestId
          });
          
          // Verify the log was emitted
          expect(consoleLogSpy).toHaveBeenCalledTimes(1);
          
          const logOutput = consoleLogSpy.mock.calls[0][0];
          const payload = JSON.parse(logOutput);
          
          // Verify required fields are present
          expect(payload.level).toBe('INFO');
          expect(payload.message).toBe('Processing chat request');
          expect(payload.context.tenantId).toBe(tenantId);
          expect(payload.context.agentId).toBe(agentId);
          expect(payload.context.userId).toBe(userId);
          expect(payload.context.userMessage).toBeDefined();
          expect(payload.context.requestId).toBe(requestId);
          expect(payload.timestamp).toBeDefined();
        }
      ),
      { numRuns: 100 }
    );
  });

  it('logs RAG search results with hit count and top URLs (Requirement 7.2)', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 5, maxLength: 20 }), // tenantId
        fc.string({ minLength: 5, maxLength: 20 }), // agentId
        fc.integer({ min: 0, max: 10 }), // hit count
        fc.array(fc.webUrl(), { minLength: 0, maxLength: 5 }), // top URLs
        fc.string({ minLength: 5, maxLength: 20 }), // requestId
        async (tenantId, agentId, hitCount, topUrls, requestId) => {
          consoleLogSpy.mockClear();
          
          // Simulate logging RAG search results as done in ChatWithAgentUseCase
          logger.debug('RAG search completed', {
            tenantId,
            agentId,
            hitCount,
            topUrls: topUrls.slice(0, 3), // Only top 3 URLs
            requestId
          });
          
          // Verify the log was emitted
          expect(consoleLogSpy).toHaveBeenCalledTimes(1);
          
          const logOutput = consoleLogSpy.mock.calls[0][0];
          const payload = JSON.parse(logOutput);
          
          // Verify required fields are present
          expect(payload.level).toBe('DEBUG');
          expect(payload.message).toBe('RAG search completed');
          expect(payload.context.tenantId).toBe(tenantId);
          expect(payload.context.agentId).toBe(agentId);
          expect(payload.context.hitCount).toBe(hitCount);
          expect(Array.isArray(payload.context.topUrls)).toBe(true);
          expect(payload.context.topUrls.length).toBeLessThanOrEqual(3);
          expect(payload.context.requestId).toBe(requestId);
          expect(payload.timestamp).toBeDefined();
        }
      ),
      { numRuns: 100 }
    );
  });

  it('logs structured RAG search with logRAGSearch method', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 5, maxLength: 20 }), // requestId
        fc.string({ minLength: 5, maxLength: 20 }), // tenantId
        fc.string({ minLength: 5, maxLength: 20 }), // agentId
        fc.integer({ min: 0, max: 10 }), // hit count
        fc.array(fc.webUrl(), { minLength: 0, maxLength: 5 }), // top URLs
        async (requestId, tenantId, agentId, hitCount, topUrls) => {
          consoleLogSpy.mockClear();
          
          // Use the structured logging method
          logger.logRAGSearch({
            requestId,
            tenantId,
            agentId,
            hitCount,
            topUrls: topUrls.slice(0, 3)
          });
          
          // Verify the log was emitted
          expect(consoleLogSpy).toHaveBeenCalledTimes(1);
          
          const logOutput = consoleLogSpy.mock.calls[0][0];
          const payload = JSON.parse(logOutput);
          
          // Verify required fields are present
          expect(payload.level).toBe('DEBUG');
          expect(payload.message).toBe('RAG search completed');
          expect(payload.context.requestId).toBe(requestId);
          expect(payload.context.tenantId).toBe(tenantId);
          expect(payload.context.agentId).toBe(agentId);
          expect(payload.context.hitCount).toBe(hitCount);
          expect(Array.isArray(payload.context.topUrls)).toBe(true);
          expect(payload.timestamp).toBeDefined();
        }
      ),
      { numRuns: 100 }
    );
  });

  it('emits structured JSON for all log levels', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 1, maxLength: 80 }),
        fc.dictionary(
          fc.string({ minLength: 1, maxLength: 10 }),
          fc.oneof(fc.string(), fc.integer(), fc.boolean())
        ),
        async (message, context) => {
          consoleLogSpy.mockClear();
          logger.info(message, context as Record<string, unknown>);
          
          const logOutput = consoleLogSpy.mock.calls[0][0];
          const payload = JSON.parse(logOutput);

          expect(typeof payload.timestamp).toBe('string');
          expect(payload.level).toBe('INFO');
          expect(payload.message).toBe(message);
          
          // Verify context is present and sanitized correctly
          const sensitivePatterns = [
            'password', 'token', 'secret', 'apikey', 'api_key',
            'authorization', 'auth', 'key', 'credential'
          ];
          
          const expectedContext = { ...context };
          for (const key in expectedContext) {
            const lowerKey = key.toLowerCase();
            if (sensitivePatterns.some(pattern => lowerKey.includes(pattern))) {
              expectedContext[key] = '[REDACTED]';
            }
          }
          
          expect(payload.context).toEqual(expectedContext);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('includes error details on error logs', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 1, maxLength: 80 }),
        fc.string({ minLength: 1, maxLength: 80 }),
        async (message, errorText) => {
          consoleErrorSpy.mockClear();
          const error = new Error(errorText);
          logger.error(message, error, { requestId: 'req-123' });
          
          const logOutput = consoleErrorSpy.mock.calls[0][0];
          const payload = JSON.parse(logOutput);

          expect(payload.level).toBe('ERROR');
          expect(payload.message).toBe(message);
          expect(payload.error?.message).toBe(errorText);
          expect(payload.context).toEqual({ requestId: 'req-123' });
        }
      ),
      { numRuns: 100 }
    );
  });
});
