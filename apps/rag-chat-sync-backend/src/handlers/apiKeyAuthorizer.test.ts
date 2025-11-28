import { APIGatewayRequestAuthorizerEvent } from 'aws-lambda';
import { handler } from './apiKeyAuthorizer';

/**
 * Unit tests for API Key Authorizer Lambda function
 * Tests error cases and various header configurations
 */

const createAuthorizerEvent = (
  headers: { [key: string]: string } = {},
  methodArn: string = 'arn:aws:execute-api:us-east-1:123456789012:abcdef123/prod/POST/v1/chat/completions'
): APIGatewayRequestAuthorizerEvent => ({
  type: 'REQUEST',
  methodArn,
  headers,
  requestContext: {
    accountId: '123456789012',
    apiId: 'abcdef123',
    requestId: 'test-request-id',
    stage: 'prod',
    requestTimeEpoch: Date.now(),
    identity: {
      sourceIp: '127.0.0.1',
      userAgent: 'test-agent'
    }
  } as any,
  resource: '',
  path: '',
  httpMethod: 'POST',
  queryStringParameters: null,
  pathParameters: null,
  stageVariables: null
} as APIGatewayRequestAuthorizerEvent);

describe('apiKeyAuthorizer - Error Cases', () => {
  beforeEach(() => {
    // Clear console.log to avoid cluttering test output
    jest.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('Missing API Key', () => {
    it('should throw error when no headers are provided', async () => {
      const event = createAuthorizerEvent({});

      await expect(handler(event)).rejects.toThrow('Unauthorized');
    });

    it('should throw error when headers object is empty', async () => {
      const event = createAuthorizerEvent({});

      await expect(handler(event)).rejects.toThrow('Unauthorized');
    });

    it('should throw error when neither Authorization nor x-api-key headers are present', async () => {
      const event = createAuthorizerEvent({
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      });

      await expect(handler(event)).rejects.toThrow('Unauthorized');
    });
  });

  describe('Empty or Invalid API Keys', () => {
    it('should throw error when Authorization header is empty string', async () => {
      const event = createAuthorizerEvent({
        'Authorization': ''
      });

      await expect(handler(event)).rejects.toThrow('Unauthorized');
    });

    it('should throw error when x-api-key header is empty string', async () => {
      const event = createAuthorizerEvent({
        'x-api-key': ''
      });

      await expect(handler(event)).rejects.toThrow('Unauthorized');
    });

    it('should throw error when Authorization header contains only whitespace', async () => {
      const event = createAuthorizerEvent({
        'Authorization': '   '
      });

      await expect(handler(event)).rejects.toThrow('Unauthorized');
    });

    it('should throw error when x-api-key header contains only whitespace', async () => {
      const event = createAuthorizerEvent({
        'x-api-key': '  \t  \n  '
      });

      await expect(handler(event)).rejects.toThrow('Unauthorized');
    });
  });

  describe('Header Priority', () => {
    it('should prioritize Authorization header when both Authorization and x-api-key are present', async () => {
      const event = createAuthorizerEvent({
        'Authorization': 'auth-key-123',
        'x-api-key': 'x-api-key-456'
      });

      const result = await handler(event);

      expect(result.principalId).toBe('api-key-user');
      expect(result.usageIdentifierKey).toBe('auth-key-123');
      expect(result.policyDocument.Statement[0].Effect).toBe('Allow');
    });

    it('should use Authorization header even if x-api-key has different casing', async () => {
      const event = createAuthorizerEvent({
        'Authorization': 'primary-key',
        'X-API-Key': 'secondary-key'
      });

      const result = await handler(event);

      expect(result.usageIdentifierKey).toBe('primary-key');
    });
  });

  describe('Case-Insensitive Header Names', () => {
    it('should accept lowercase "authorization" header', async () => {
      const event = createAuthorizerEvent({
        'authorization': 'test-key-lowercase'
      });

      const result = await handler(event);

      expect(result.principalId).toBe('api-key-user');
      expect(result.usageIdentifierKey).toBe('test-key-lowercase');
      expect(result.policyDocument.Statement[0].Effect).toBe('Allow');
    });

    it('should accept mixed-case "Authorization" header', async () => {
      const event = createAuthorizerEvent({
        'Authorization': 'test-key-mixedcase'
      });

      const result = await handler(event);

      expect(result.principalId).toBe('api-key-user');
      expect(result.usageIdentifierKey).toBe('test-key-mixedcase');
      expect(result.policyDocument.Statement[0].Effect).toBe('Allow');
    });

    it('should accept lowercase "x-api-key" header', async () => {
      const event = createAuthorizerEvent({
        'x-api-key': 'test-key-xapi-lower'
      });

      const result = await handler(event);

      expect(result.principalId).toBe('api-key-user');
      expect(result.usageIdentifierKey).toBe('test-key-xapi-lower');
      expect(result.policyDocument.Statement[0].Effect).toBe('Allow');
    });

    it('should accept "X-API-Key" header with capital letters', async () => {
      const event = createAuthorizerEvent({
        'X-API-Key': 'test-key-xapi-upper'
      });

      const result = await handler(event);

      expect(result.principalId).toBe('api-key-user');
      expect(result.usageIdentifierKey).toBe('test-key-xapi-upper');
      expect(result.policyDocument.Statement[0].Effect).toBe('Allow');
    });

    it('should accept "X-Api-Key" header with mixed case', async () => {
      const event = createAuthorizerEvent({
        'X-Api-Key': 'test-key-xapi-mixed'
      });

      const result = await handler(event);

      expect(result.principalId).toBe('api-key-user');
      expect(result.usageIdentifierKey).toBe('test-key-xapi-mixed');
      expect(result.policyDocument.Statement[0].Effect).toBe('Allow');
    });

    it('should accept "x-Api-key" header with unusual casing', async () => {
      const event = createAuthorizerEvent({
        'x-Api-key': 'test-key-xapi-unusual'
      });

      const result = await handler(event);

      expect(result.principalId).toBe('api-key-user');
      expect(result.usageIdentifierKey).toBe('test-key-xapi-unusual');
      expect(result.policyDocument.Statement[0].Effect).toBe('Allow');
    });
  });
});

describe('apiKeyAuthorizer - Success Cases', () => {
  beforeEach(() => {
    jest.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('Valid Authorization Header', () => {
    it('should return correct policy for valid Authorization header', async () => {
      const event = createAuthorizerEvent({
        'Authorization': 'valid-api-key-123'
      });

      const result = await handler(event);

      expect(result).toMatchObject({
        principalId: 'api-key-user',
        usageIdentifierKey: 'valid-api-key-123',
        policyDocument: {
          Version: '2012-10-17',
          Statement: [
            {
              Action: 'execute-api:Invoke',
              Effect: 'Allow',
              Resource: expect.stringMatching(/^arn:aws:execute-api:.+:\d+:.+\/\*\/\*$/)
            }
          ]
        }
      });
    });

    it('should trim whitespace from Authorization header value', async () => {
      const event = createAuthorizerEvent({
        'Authorization': '  api-key-with-spaces  '
      });

      const result = await handler(event);

      expect(result.usageIdentifierKey).toBe('api-key-with-spaces');
    });

    it('should generate correct resource ARN wildcard from methodArn', async () => {
      const methodArn = 'arn:aws:execute-api:us-west-2:987654321098:xyz789/stage/GET/resource';
      const event = createAuthorizerEvent({
        'Authorization': 'test-key'
      }, methodArn);

      const result = await handler(event);
      const statement: any = result.policyDocument.Statement[0];

      expect(statement.Resource).toBe(
        'arn:aws:execute-api:us-west-2:987654321098:xyz789/stage/*/*'
      );
    });

    it('should accept Bearer-prefixed Authorization header', async () => {
      const event = createAuthorizerEvent({
        'Authorization': 'Bearer bearer-key-987'
      });

      const result = await handler(event);

      expect(result.usageIdentifierKey).toBe('bearer-key-987');
      expect(result.policyDocument.Statement[0]).toMatchObject({
        Effect: 'Allow',
        Action: 'execute-api:Invoke'
      });
    });
  });

  describe('Valid x-api-key Header', () => {
    it('should return correct policy for valid x-api-key header', async () => {
      const event = createAuthorizerEvent({
        'x-api-key': 'valid-x-api-key-456'
      });

      const result = await handler(event);

      expect(result).toMatchObject({
        principalId: 'api-key-user',
        usageIdentifierKey: 'valid-x-api-key-456',
        policyDocument: {
          Version: '2012-10-17',
          Statement: [
            {
              Action: 'execute-api:Invoke',
              Effect: 'Allow',
              Resource: expect.stringMatching(/^arn:aws:execute-api:.+:\d+:.+\/\*\/\*$/)
            }
          ]
        }
      });
    });

    it('should trim whitespace from x-api-key header value', async () => {
      const event = createAuthorizerEvent({
        'x-api-key': '\t\txapi-key-tabs\t\t'
      });

      const result = await handler(event);

      expect(result.usageIdentifierKey).toBe('xapi-key-tabs');
    });

    it('should handle API keys with special characters', async () => {
      const complexKey = 'sk_test_1234567890abcdefABCDEF-_';
      const event = createAuthorizerEvent({
        'x-api-key': complexKey
      });

      const result = await handler(event);

      expect(result.usageIdentifierKey).toBe(complexKey);
    });
  });

  describe('Policy Document Structure', () => {
    it('should always return Allow effect in policy', async () => {
      const event = createAuthorizerEvent({
        'Authorization': 'any-valid-key'
      });

      const result = await handler(event);

      expect(result.policyDocument.Statement[0].Effect).toBe('Allow');
    });

    it('should always use execute-api:Invoke action', async () => {
      const event = createAuthorizerEvent({
        'x-api-key': 'any-valid-key'
      });

      const result = await handler(event);
      const statement: any = result.policyDocument.Statement[0];

      expect(statement.Action).toBe('execute-api:Invoke');
    });

    it('should set principalId to "api-key-user"', async () => {
      const event = createAuthorizerEvent({
        'Authorization': 'any-key'
      });

      const result = await handler(event);

      expect(result.principalId).toBe('api-key-user');
    });

    it('should include usageIdentifierKey in response', async () => {
      const apiKey = 'usage-tracking-key';
      const event = createAuthorizerEvent({
        'x-api-key': apiKey
      });

      const result = await handler(event);

      expect(result.usageIdentifierKey).toBe(apiKey);
    });
  });

  describe('Logging', () => {
    it('should log security metadata without exposing API key', async () => {
      const consoleLogSpy = jest.spyOn(console, 'log');
      const event = createAuthorizerEvent({
        'Authorization': 'secret-key-should-not-be-logged'
      });

      await handler(event);

      const logCalls = consoleLogSpy.mock.calls;
      const loggedStrings = logCalls.map(call => JSON.stringify(call));

      // Verify API key is not in logs
      loggedStrings.forEach(logStr => {
        expect(logStr).not.toContain('secret-key-should-not-be-logged');
      });

      // Verify metadata is logged
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('hasAuthorizationHeader')
      );
    });

    it('should log presence of headers as boolean flags', async () => {
      const consoleLogSpy = jest.spyOn(console, 'log');
      const event = createAuthorizerEvent({
        'Authorization': 'test-key'
      });

      await handler(event);

      const loggedData = JSON.parse(consoleLogSpy.mock.calls[0][0]);
      expect(loggedData).toHaveProperty('hasAuthorizationHeader', true);
      expect(loggedData).toHaveProperty('hasXApiKeyHeader', false);
      expect(loggedData).toHaveProperty('requestId');
      expect(loggedData).toHaveProperty('timestamp');
    });
  });
});
