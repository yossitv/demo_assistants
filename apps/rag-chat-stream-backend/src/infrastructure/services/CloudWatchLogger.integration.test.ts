import { CloudWatchLogger } from './CloudWatchLogger';

describe('CloudWatchLogger Integration Tests', () => {
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

  describe('Log Entry Creation', () => {
    it('should create log entries for debug logs', () => {
      logger.debug('Debug message');

      expect(consoleLogSpy).toHaveBeenCalledTimes(1);
      const logOutput = consoleLogSpy.mock.calls[0][0];
      expect(logOutput).toBeDefined();
      expect(typeof logOutput).toBe('string');
    });

    it('should create log entries for info logs', () => {
      logger.info('Info message');

      expect(consoleLogSpy).toHaveBeenCalledTimes(1);
      const logOutput = consoleLogSpy.mock.calls[0][0];
      expect(logOutput).toBeDefined();
      expect(typeof logOutput).toBe('string');
    });

    it('should create log entries for error logs', () => {
      const error = new Error('Test error');
      logger.error('Error message', error);

      expect(consoleErrorSpy).toHaveBeenCalledTimes(1);
      const logOutput = consoleErrorSpy.mock.calls[0][0];
      expect(logOutput).toBeDefined();
      expect(typeof logOutput).toBe('string');
    });

    it('should create multiple log entries in sequence', () => {
      logger.info('First message');
      logger.debug('Second message');
      logger.error('Third message');

      expect(consoleLogSpy).toHaveBeenCalledTimes(2);
      expect(consoleErrorSpy).toHaveBeenCalledTimes(1);
    });
  });

  describe('JSON Format Validation', () => {
    it('should output valid JSON for debug logs', () => {
      logger.debug('Test debug', { key: 'value' });

      const logOutput = consoleLogSpy.mock.calls[0][0];
      expect(() => JSON.parse(logOutput)).not.toThrow();
    });

    it('should output valid JSON for info logs', () => {
      logger.info('Test info', { userId: '123', action: 'login' });

      const logOutput = consoleLogSpy.mock.calls[0][0];
      expect(() => JSON.parse(logOutput)).not.toThrow();
    });

    it('should output valid JSON for error logs', () => {
      const error = new Error('Test error');
      logger.error('Test error log', error, { requestId: 'abc-123' });

      const logOutput = consoleErrorSpy.mock.calls[0][0];
      expect(() => JSON.parse(logOutput)).not.toThrow();
    });

    it('should contain required fields in JSON output', () => {
      logger.info('Test message', { data: 'test' });

      const logOutput = consoleLogSpy.mock.calls[0][0];
      const parsed = JSON.parse(logOutput);

      expect(parsed).toHaveProperty('timestamp');
      expect(parsed).toHaveProperty('level');
      expect(parsed).toHaveProperty('message');
    });

    it('should include context in JSON when provided', () => {
      const context = { tenantId: 'tenant-1', userId: 'user-123' };
      logger.info('Test with context', context);

      const logOutput = consoleLogSpy.mock.calls[0][0];
      const parsed = JSON.parse(logOutput);

      expect(parsed).toHaveProperty('context');
      expect(parsed.context).toEqual(context);
    });

    it('should handle complex nested context objects', () => {
      const complexContext = {
        user: {
          id: '123',
          name: 'Test User',
          metadata: {
            role: 'admin',
            permissions: ['read', 'write']
          }
        },
        request: {
          path: '/api/test',
          method: 'POST'
        }
      };

      logger.info('Complex context test', complexContext);

      const logOutput = consoleLogSpy.mock.calls[0][0];
      const parsed = JSON.parse(logOutput);

      expect(parsed.context).toEqual(complexContext);
      expect(parsed.context.user.metadata.permissions).toContain('read');
    });

    it('should validate timestamp format', () => {
      logger.info('Timestamp test');

      const logOutput = consoleLogSpy.mock.calls[0][0];
      const parsed = JSON.parse(logOutput);

      expect(parsed.timestamp).toBeDefined();
      expect(typeof parsed.timestamp).toBe('string');

      // Validate ISO 8601 format
      const isoDateRegex = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;
      expect(parsed.timestamp).toMatch(isoDateRegex);

      // Validate it's a valid date
      expect(new Date(parsed.timestamp).toString()).not.toBe('Invalid Date');
    });
  });

  describe('Error Stack Trace Validation', () => {
    it('should include stack trace in error logs', () => {
      const error = new Error('Test error with stack');
      logger.error('Error occurred', error);

      const logOutput = consoleErrorSpy.mock.calls[0][0];
      const parsed = JSON.parse(logOutput);

      expect(parsed).toHaveProperty('error');
      expect(parsed.error).toHaveProperty('stack');
      expect(parsed.error.stack).toBeDefined();
    });

    it('should include error message in error logs', () => {
      const errorMessage = 'Database connection failed';
      const error = new Error(errorMessage);
      logger.error('Database error', error);

      const logOutput = consoleErrorSpy.mock.calls[0][0];
      const parsed = JSON.parse(logOutput);

      expect(parsed.error).toHaveProperty('message');
      expect(parsed.error.message).toBe(errorMessage);
    });

    it('should capture actual stack trace from error', () => {
      const error = new Error('Stack trace test');
      const originalStack = error.stack;

      logger.error('Error with stack', error);

      const logOutput = consoleErrorSpy.mock.calls[0][0];
      const parsed = JSON.parse(logOutput);

      expect(parsed.error.stack).toBe(originalStack);
      expect(parsed.error.stack).toContain('Error: Stack trace test');
    });

    it('should handle error logs with context and stack trace', () => {
      const error = new Error('Complex error');
      const context = {
        operation: 'database.query',
        table: 'users',
        attemptNumber: 3
      };

      logger.error('Database operation failed', error, context);

      const logOutput = consoleErrorSpy.mock.calls[0][0];
      const parsed = JSON.parse(logOutput);

      expect(parsed).toHaveProperty('error');
      expect(parsed.error).toHaveProperty('message');
      expect(parsed.error).toHaveProperty('stack');
      expect(parsed).toHaveProperty('context');
      expect(parsed.context).toEqual(context);
    });

    it('should handle error logs without error object gracefully', () => {
      logger.error('Error message only', undefined, { code: 'ERR_001' });

      const logOutput = consoleErrorSpy.mock.calls[0][0];
      const parsed = JSON.parse(logOutput);

      expect(parsed.level).toBe('ERROR');
      expect(parsed.message).toBe('Error message only');
      expect(parsed.error).toBeUndefined();
      expect(parsed.context).toEqual({ code: 'ERR_001' });
    });

    it('should preserve stack trace across multiple error logs', () => {
      const error1 = new Error('First error');
      const error2 = new Error('Second error');

      logger.error('First', error1);
      logger.error('Second', error2);

      const log1 = JSON.parse(consoleErrorSpy.mock.calls[0][0]);
      const log2 = JSON.parse(consoleErrorSpy.mock.calls[1][0]);

      expect(log1.error.stack).toBeDefined();
      expect(log2.error.stack).toBeDefined();
      expect(log1.error.stack).not.toBe(log2.error.stack);
    });
  });

  describe('Real-world Integration Scenarios', () => {
    it('should handle a complete user request flow with multiple log entries', () => {
      logger.info('Request received', {
        requestId: 'req-123',
        path: '/api/chat/completions',
        method: 'POST'
      });

      logger.debug('Validating request', {
        requestId: 'req-123',
        validationSteps: ['auth', 'schema', 'permissions']
      });

      logger.info('Processing request', {
        requestId: 'req-123',
        userId: 'user-456',
        agentId: 'agent-789'
      });

      expect(consoleLogSpy).toHaveBeenCalledTimes(3);

      consoleLogSpy.mock.calls.forEach((call) => {
        const parsed = JSON.parse(call[0]);
        expect(parsed).toHaveProperty('timestamp');
        expect(parsed).toHaveProperty('level');
        expect(parsed).toHaveProperty('message');
        expect(parsed.context).toHaveProperty('requestId', 'req-123');
      });
    });

    it('should handle error recovery scenario with proper logging', () => {
      logger.info('Starting operation', { operationId: 'op-001' });

      const retryError = new Error('Network timeout');
      logger.error('Operation failed, retrying', retryError, {
        operationId: 'op-001',
        attempt: 1,
        maxRetries: 3
      });

      logger.info('Retry successful', {
        operationId: 'op-001',
        attempt: 2
      });

      expect(consoleLogSpy).toHaveBeenCalledTimes(2);
      expect(consoleErrorSpy).toHaveBeenCalledTimes(1);

      const errorLog = JSON.parse(consoleErrorSpy.mock.calls[0][0]);
      expect(errorLog.error).toHaveProperty('message', 'Network timeout');
      expect(errorLog.error).toHaveProperty('stack');
      expect(errorLog.context).toHaveProperty('attempt', 1);
    });

    it('should maintain JSON format integrity under high load simulation', () => {
      const iterations = 100;

      for (let i = 0; i < iterations; i++) {
        logger.info(`Message ${i}`, { iteration: i });
      }

      expect(consoleLogSpy).toHaveBeenCalledTimes(iterations);

      // Validate all outputs are valid JSON
      consoleLogSpy.mock.calls.forEach((call) => {
        expect(() => JSON.parse(call[0])).not.toThrow();
        const parsed = JSON.parse(call[0]);
        expect(parsed).toHaveProperty('timestamp');
        expect(parsed).toHaveProperty('level', 'INFO');
        expect(parsed).toHaveProperty('message');
      });
    });
  });
});
