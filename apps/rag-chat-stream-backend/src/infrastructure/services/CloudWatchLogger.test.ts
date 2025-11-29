import { CloudWatchLogger } from './CloudWatchLogger';

describe('CloudWatchLogger', () => {
  let logger: CloudWatchLogger;
  let consoleLogSpy: jest.SpyInstance;
  let consoleWarnSpy: jest.SpyInstance;
  let consoleErrorSpy: jest.SpyInstance;

  beforeEach(() => {
    logger = new CloudWatchLogger();
    consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();
    consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
  });

  afterEach(() => {
    consoleLogSpy.mockRestore();
    consoleWarnSpy.mockRestore();
    consoleErrorSpy.mockRestore();
  });

  describe('debug', () => {
    it('should log debug messages with correct format', () => {
      logger.debug('Debug message', { userId: '123' });

      const payload = JSON.parse(consoleLogSpy.mock.calls[0][0]);
      expect(payload.level).toBe('DEBUG');
      expect(payload.message).toBe('Debug message');
      expect(payload.context).toEqual({ userId: '123' });
      expect(payload.timestamp).toBeDefined();
    });

    it('should log debug messages without context', () => {
      logger.debug('Simple debug');

      const payload = JSON.parse(consoleLogSpy.mock.calls[0][0]);
      expect(payload.level).toBe('DEBUG');
      expect(payload.message).toBe('Simple debug');
      expect(payload.context).toBeUndefined();
    });
  });

  describe('info', () => {
    it('should log info messages with correct format', () => {
      logger.info('Info message', { tenantId: 'tenant-1' });

      const payload = JSON.parse(consoleLogSpy.mock.calls[0][0]);
      expect(payload.level).toBe('INFO');
      expect(payload.message).toBe('Info message');
      expect(payload.context).toEqual({ tenantId: 'tenant-1' });
    });
  });

  describe('error', () => {
    it('should log error messages with error details', () => {
      const error = new Error('Test error');
      error.stack = 'Error stack trace';

      logger.error('Error occurred', error, { operation: 'test' });

      const payload = JSON.parse(consoleErrorSpy.mock.calls[0][0]);
      expect(payload.level).toBe('ERROR');
      expect(payload.message).toBe('Error occurred');
      expect(payload.error).toEqual({
        message: 'Test error',
        stack: 'Error stack trace',
        name: 'Error'
      });
      expect(payload.context).toEqual({ operation: 'test' });
    });

    it('should log error messages without error object', () => {
      logger.error('Error message', undefined, { code: 500 });

      const payload = JSON.parse(consoleErrorSpy.mock.calls[0][0]);
      expect(payload.level).toBe('ERROR');
      expect(payload.message).toBe('Error message');
      expect(payload.error).toBeUndefined();
      expect(payload.context).toEqual({ code: 500 });
    });
  });

  describe('warn', () => {
    it('should log warning messages with correct format', () => {
      logger.warn('Warning message', { issue: 'test-issue' });

      const payload = JSON.parse(consoleWarnSpy.mock.calls[0][0]);
      expect(payload.level).toBe('WARN');
      expect(payload.message).toBe('Warning message');
      expect(payload.context).toEqual({ issue: 'test-issue' });
    });
  });

  describe('output format', () => {
    it('should produce valid JSON output', () => {
      logger.info('Test', { data: { nested: 'value' } });

      const loggedString = consoleLogSpy.mock.calls[0][0];
      expect(() => JSON.parse(loggedString)).not.toThrow();

      const parsed = JSON.parse(loggedString);
      expect(parsed.timestamp).toBeDefined();
      expect(parsed.level).toBe('INFO');
      expect(parsed.message).toBe('Test');
      expect(parsed.context.data.nested).toBe('value');
    });
  });

  describe('structured logging methods', () => {
    describe('logRequest', () => {
      it('should log request with sanitized context', () => {
        logger.logRequest({
          requestId: 'req-123',
          tenantId: 'tenant-1',
          userId: 'user-1',
          path: '/api/chat',
          method: 'POST'
        });

        const payload = JSON.parse(consoleLogSpy.mock.calls[0][0]);
        expect(payload.level).toBe('INFO');
        expect(payload.message).toBe('Request received');
        expect(payload.context.requestId).toBe('req-123');
        expect(payload.context.tenantId).toBe('tenant-1');
        expect(payload.context.userId).toBe('user-1');
        expect(payload.context.path).toBe('/api/chat');
        expect(payload.context.method).toBe('POST');
      });
    });

    describe('logResponse', () => {
      it('should log response with status and duration', () => {
        logger.logResponse({
          requestId: 'req-123',
          tenantId: 'tenant-1',
          userId: 'user-1',
          statusCode: 200,
          durationMs: 150
        });

        const payload = JSON.parse(consoleLogSpy.mock.calls[0][0]);
        expect(payload.level).toBe('INFO');
        expect(payload.message).toBe('Request completed');
        expect(payload.context.statusCode).toBe(200);
        expect(payload.context.durationMs).toBe(150);
      });
    });

    describe('logRAGSearch', () => {
      it('should log RAG search results with URLs and scores', () => {
        logger.logRAGSearch({
          requestId: 'req-123',
          tenantId: 'tenant-1',
          agentId: 'agent-1',
          hitCount: 5,
          topUrls: ['https://example.com/page1', 'https://example.com/page2'],
          topScores: [0.95, 0.87],
          threshold: 0.35
        });

        const payload = JSON.parse(consoleLogSpy.mock.calls[0][0]);
        expect(payload.level).toBe('DEBUG');
        expect(payload.message).toBe('RAG search completed');
        expect(payload.context.hitCount).toBe(5);
        expect(payload.context.topUrls).toHaveLength(2);
        expect(payload.context.topScores).toEqual([0.95, 0.87]);
        expect(payload.context.threshold).toBe(0.35);
      });
    });

    describe('logCrawlProgress', () => {
      it('should log crawl started', () => {
        logger.logCrawlProgress({
          requestId: 'req-123',
          tenantId: 'tenant-1',
          url: 'https://example.com',
          urlIndex: 1,
          totalUrls: 3,
          status: 'started'
        });

        const payload = JSON.parse(consoleLogSpy.mock.calls[0][0]);
        expect(payload.level).toBe('INFO');
        expect(payload.message).toBe('Crawl started');
        expect(payload.context.url).toBe('https://example.com');
        expect(payload.context.urlIndex).toBe(1);
        expect(payload.context.totalUrls).toBe(3);
      });

      it('should log crawl completed with chunk count', () => {
        logger.logCrawlProgress({
          requestId: 'req-123',
          tenantId: 'tenant-1',
          url: 'https://example.com',
          urlIndex: 1,
          totalUrls: 3,
          chunkCount: 10,
          status: 'completed'
        });

        const payload = JSON.parse(consoleLogSpy.mock.calls[0][0]);
        expect(payload.level).toBe('INFO');
        expect(payload.message).toBe('Crawl completed');
        expect(payload.context.chunkCount).toBe(10);
      });

      it('should log crawl failed with error', () => {
        logger.logCrawlProgress({
          requestId: 'req-123',
          tenantId: 'tenant-1',
          url: 'https://example.com',
          urlIndex: 1,
          totalUrls: 3,
          status: 'failed',
          errorMessage: 'Connection timeout'
        });

        const payload = JSON.parse(consoleErrorSpy.mock.calls[0][0]);
        expect(payload.level).toBe('ERROR');
        expect(payload.message).toBe('Crawl failed');
        expect(payload.context.errorMessage).toBe('Connection timeout');
      });
    });

    describe('logAgentCreation', () => {
      it('should log agent creation with configuration', () => {
        logger.logAgentCreation({
          requestId: 'req-123',
          tenantId: 'tenant-1',
          agentId: 'agent-1',
          agentName: 'Support Agent',
          knowledgeSpaceIds: ['ks-1', 'ks-2'],
          strictRAG: true
        });

        const payload = JSON.parse(consoleLogSpy.mock.calls[0][0]);
        expect(payload.level).toBe('INFO');
        expect(payload.message).toBe('Agent created');
        expect(payload.context.agentId).toBe('agent-1');
        expect(payload.context.agentName).toBe('Support Agent');
        expect(payload.context.knowledgeSpaceIds).toEqual(['ks-1', 'ks-2']);
        expect(payload.context.strictRAG).toBe(true);
      });
    });

    describe('logErrorWithContext', () => {
      it('should log error with full context', () => {
        const error = new Error('Test error');
        error.stack = 'Error stack trace';

        logger.logErrorWithContext('Operation failed', error, {
          requestId: 'req-123',
          tenantId: 'tenant-1',
          userId: 'user-1',
          path: '/api/chat'
        });

        const payload = JSON.parse(consoleErrorSpy.mock.calls[0][0]);
        expect(payload.level).toBe('ERROR');
        expect(payload.message).toBe('Operation failed');
        expect(payload.error.message).toBe('Test error');
        expect(payload.error.stack).toBe('Error stack trace');
        expect(payload.context.requestId).toBe('req-123');
      });
    });
  });

  describe('sensitive data sanitization', () => {
    it('should redact password fields', () => {
      logger.info('User login', {
        username: 'john',
        password: 'secret123'
      });

      const payload = JSON.parse(consoleLogSpy.mock.calls[0][0]);
      expect(payload.context.username).toBe('john');
      expect(payload.context.password).toBe('[REDACTED]');
    });

    it('should redact API key fields', () => {
      logger.info('API call', {
        endpoint: '/api/data',
        apiKey: 'sk-123456',
        api_key: 'ak-789012'
      });

      const payload = JSON.parse(consoleLogSpy.mock.calls[0][0]);
      expect(payload.context.endpoint).toBe('/api/data');
      expect(payload.context.apiKey).toBe('[REDACTED]');
      expect(payload.context.api_key).toBe('[REDACTED]');
    });

    it('should redact token fields', () => {
      logger.info('Auth request', {
        userId: 'user-1',
        token: 'bearer-token-123',
        authorization: 'Bearer xyz'
      });

      const payload = JSON.parse(consoleLogSpy.mock.calls[0][0]);
      expect(payload.context.userId).toBe('user-1');
      expect(payload.context.token).toBe('[REDACTED]');
      expect(payload.context.authorization).toBe('[REDACTED]');
    });

    it('should redact secret fields', () => {
      logger.info('Config loaded', {
        appName: 'MyApp',
        clientSecret: 'secret-abc',
        webhookSecret: 'webhook-xyz'
      });

      const payload = JSON.parse(consoleLogSpy.mock.calls[0][0]);
      expect(payload.context.appName).toBe('MyApp');
      expect(payload.context.clientSecret).toBe('[REDACTED]');
      expect(payload.context.webhookSecret).toBe('[REDACTED]');
    });

    it('should handle case-insensitive sensitive field detection', () => {
      logger.info('Test', {
        ApiKey: 'key-123',
        PASSWORD: 'pass-456',
        Token: 'tok-789'
      });

      const payload = JSON.parse(consoleLogSpy.mock.calls[0][0]);
      expect(payload.context.ApiKey).toBe('[REDACTED]');
      expect(payload.context.PASSWORD).toBe('[REDACTED]');
      expect(payload.context.Token).toBe('[REDACTED]');
    });
  });
});
