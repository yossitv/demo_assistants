import {
  AuthenticationError,
  AuthorizationError,
  ValidationError,
  NotFoundError,
  ExternalServiceError,
  InternalError
} from './errors';

describe('Error Classes', () => {
  describe('AuthenticationError', () => {
    it('creates error with default message', () => {
      const error = new AuthenticationError();
      expect(error.message).toBe('Authentication failed');
      expect(error.name).toBe('AuthenticationError');
      expect(error).toBeInstanceOf(Error);
    });

    it('creates error with custom message', () => {
      const error = new AuthenticationError('Invalid JWT token');
      expect(error.message).toBe('Invalid JWT token');
      expect(error.name).toBe('AuthenticationError');
    });

    it('maintains error stack trace', () => {
      const error = new AuthenticationError('Test error');
      expect(error.stack).toBeDefined();
      expect(error.stack).toContain('AuthenticationError');
    });
  });

  describe('AuthorizationError', () => {
    it('creates error with default message', () => {
      const error = new AuthorizationError();
      expect(error.message).toBe('Authorization failed');
      expect(error.name).toBe('AuthorizationError');
      expect(error).toBeInstanceOf(Error);
    });

    it('creates error with custom message', () => {
      const error = new AuthorizationError('Insufficient permissions');
      expect(error.message).toBe('Insufficient permissions');
      expect(error.name).toBe('AuthorizationError');
    });
  });

  describe('ValidationError', () => {
    it('creates error with message', () => {
      const error = new ValidationError('Invalid input format');
      expect(error.message).toBe('Invalid input format');
      expect(error.name).toBe('ValidationError');
      expect(error).toBeInstanceOf(Error);
    });

    it('preserves detailed validation messages', () => {
      const error = new ValidationError('name is required');
      expect(error.message).toBe('name is required');
    });
  });

  describe('NotFoundError', () => {
    it('creates error with message', () => {
      const error = new NotFoundError('Agent not found');
      expect(error.message).toBe('Agent not found');
      expect(error.name).toBe('NotFoundError');
      expect(error).toBeInstanceOf(Error);
    });

    it('creates error for different resource types', () => {
      const agentError = new NotFoundError('Agent not found');
      const ksError = new NotFoundError('KnowledgeSpace not found');
      
      expect(agentError.message).toBe('Agent not found');
      expect(ksError.message).toBe('KnowledgeSpace not found');
    });
  });

  describe('ExternalServiceError', () => {
    it('creates error with default status code', () => {
      const error = new ExternalServiceError('OpenAI API failed');
      expect(error.message).toBe('OpenAI API failed');
      expect(error.name).toBe('ExternalServiceError');
      expect(error.statusCode).toBe(502);
      expect(error).toBeInstanceOf(Error);
    });

    it('creates error with custom status code', () => {
      const error = new ExternalServiceError('Service unavailable', 503);
      expect(error.message).toBe('Service unavailable');
      expect(error.statusCode).toBe(503);
    });

    it('creates error for different external services', () => {
      const openaiError = new ExternalServiceError('OpenAI timeout', 504);
      const qdrantError = new ExternalServiceError('Qdrant connection failed', 502);
      
      expect(openaiError.statusCode).toBe(504);
      expect(qdrantError.statusCode).toBe(502);
    });

    it('preserves status code as public property', () => {
      const error = new ExternalServiceError('Test', 503);
      expect(error.statusCode).toBe(503);
      // Verify it's accessible
      const code: number = error.statusCode;
      expect(code).toBe(503);
    });
  });

  describe('InternalError', () => {
    it('creates error with message', () => {
      const error = new InternalError('Unexpected internal error');
      expect(error.message).toBe('Unexpected internal error');
      expect(error.name).toBe('InternalError');
      expect(error).toBeInstanceOf(Error);
    });

    it('creates error for different internal failures', () => {
      const dbError = new InternalError('Database connection failed');
      const configError = new InternalError('Configuration error');
      
      expect(dbError.message).toBe('Database connection failed');
      expect(configError.message).toBe('Configuration error');
    });
  });

  describe('Error inheritance', () => {
    it('all custom errors extend Error', () => {
      expect(new AuthenticationError()).toBeInstanceOf(Error);
      expect(new AuthorizationError()).toBeInstanceOf(Error);
      expect(new ValidationError('test')).toBeInstanceOf(Error);
      expect(new NotFoundError('test')).toBeInstanceOf(Error);
      expect(new ExternalServiceError('test')).toBeInstanceOf(Error);
      expect(new InternalError('test')).toBeInstanceOf(Error);
    });

    it('errors can be caught as Error type', () => {
      const errors = [
        new AuthenticationError(),
        new AuthorizationError(),
        new ValidationError('test'),
        new NotFoundError('test'),
        new ExternalServiceError('test'),
        new InternalError('test')
      ];

      errors.forEach(error => {
        try {
          throw error;
        } catch (e) {
          expect(e).toBeInstanceOf(Error);
        }
      });
    });

    it('errors can be distinguished by name', () => {
      const errors = [
        { error: new AuthenticationError(), name: 'AuthenticationError' },
        { error: new AuthorizationError(), name: 'AuthorizationError' },
        { error: new ValidationError('test'), name: 'ValidationError' },
        { error: new NotFoundError('test'), name: 'NotFoundError' },
        { error: new ExternalServiceError('test'), name: 'ExternalServiceError' },
        { error: new InternalError('test'), name: 'InternalError' }
      ];

      errors.forEach(({ error, name }) => {
        expect(error.name).toBe(name);
      });
    });
  });

  describe('Error serialization', () => {
    it('errors can be serialized to JSON', () => {
      const error = new ValidationError('Invalid input');
      const serialized = JSON.stringify({
        name: error.name,
        message: error.message
      });
      
      expect(serialized).toContain('ValidationError');
      expect(serialized).toContain('Invalid input');
    });

    it('ExternalServiceError includes statusCode in serialization', () => {
      const error = new ExternalServiceError('Service failed', 503);
      const serialized = JSON.stringify({
        name: error.name,
        message: error.message,
        statusCode: error.statusCode
      });
      
      expect(serialized).toContain('503');
    });
  });
});
