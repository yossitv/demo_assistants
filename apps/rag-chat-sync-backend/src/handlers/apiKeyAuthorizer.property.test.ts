import * as fc from 'fast-check';
import { APIGatewayRequestAuthorizerEvent } from 'aws-lambda';
import { handler } from './apiKeyAuthorizer';

/**
 * Property-based tests for API Key Authorizer
 *
 * These tests validate the authorizer implementation against requirements
 * for Authorization header extraction, backward compatibility, logging,
 * and security.
 */
describe('API Key Authorizer - Property Tests', () => {
  const numRuns = 100;

  // Helper to create a mock APIGatewayRequestAuthorizerEvent
  const createAuthorizerEvent = (
    headers: Record<string, string> = {},
    requestId: string = 'test-request-id'
  ): APIGatewayRequestAuthorizerEvent => ({
    type: 'REQUEST',
    methodArn: 'arn:aws:execute-api:us-east-1:123456789012:abcdefghij/prod/POST/v1/chat/completions',
    resource: '/v1/chat/completions',
    path: '/v1/chat/completions',
    httpMethod: 'POST',
    headers,
    multiValueHeaders: {},
    pathParameters: null,
    queryStringParameters: null,
    multiValueQueryStringParameters: null,
    stageVariables: null,
    requestContext: {
      accountId: '123456789012',
      apiId: 'abcdefghij',
      protocol: 'HTTP/1.1',
      httpMethod: 'POST',
      path: '/v1/chat/completions',
      stage: 'prod',
      requestId,
      requestTimeEpoch: Date.now(),
      resourceId: 'resource-id',
      resourcePath: '/v1/chat/completions',
      identity: {
        sourceIp: '192.0.2.1',
        userAgent: 'test-agent',
        accessKey: null,
        accountId: null,
        apiKey: null,
        apiKeyId: null,
        caller: null,
        clientCert: null,
        cognitoAuthenticationProvider: null,
        cognitoAuthenticationType: null,
        cognitoIdentityId: null,
        cognitoIdentityPoolId: null,
        principalOrgId: null,
        user: null,
        userArn: null
      }
    }
  } as any);

  /**
   * Property 1: Authorization header extraction (1.2)
   * Validates requirements 1.1, 1.2, 5.1
   *
   * Test that Authorization header is extracted correctly (case-insensitive)
   * and that usageIdentifierKey matches the input API key
   */
  describe('Property 1: Authorization header extraction', () => {
    it('should extract API key from Authorization header correctly', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 1, maxLength: 100 }).filter(s => s.trim().length > 0),
          async (apiKey) => {
            const event = createAuthorizerEvent({
              'Authorization': apiKey
            });

            const result = await handler(event);

            // Verify usageIdentifierKey matches the input (trimmed)
            return result.usageIdentifierKey === apiKey.trim() &&
                   result.principalId === 'api-key-user';
          }
        ),
        { numRuns }
      );
    });

    it('should extract API key from authorization header (lowercase) correctly', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 1, maxLength: 100 }).filter(s => s.trim().length > 0),
          async (apiKey) => {
            const event = createAuthorizerEvent({
              'authorization': apiKey
            });

            const result = await handler(event);

            // Verify case-insensitive extraction works
            return result.usageIdentifierKey === apiKey.trim() &&
                   result.principalId === 'api-key-user';
          }
        ),
        { numRuns }
      );
    });

    it('should handle mixed-case Authorization header variants', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 1, maxLength: 100 }).filter(s => s.trim().length > 0),
          fc.constantFrom('Authorization', 'authorization'),
          async (apiKey, headerName) => {
            const event = createAuthorizerEvent({
              [headerName]: apiKey
            });

            const result = await handler(event);

            return result.usageIdentifierKey === apiKey.trim();
          }
        ),
        { numRuns }
      );
    });
  });

  /**
   * Property 2: No prefix required (1.3)
   * Validates requirement 1.4
   *
   * Test that API keys work without "Bearer " prefix
   * Test with various string formats
   */
  describe('Property 2: No prefix required', () => {
    it('should accept API keys without Bearer prefix', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 1, maxLength: 100 }).filter(s => s.trim().length > 0),
          async (apiKey) => {
            const event = createAuthorizerEvent({
              'Authorization': apiKey
            });

            const result = await handler(event);

            // The API key should be used as-is (after trimming)
            return result.usageIdentifierKey === apiKey.trim();
          }
        ),
        { numRuns }
      );
    });

    it('should strip optional Bearer prefix if provided', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 1, maxLength: 100 }).filter(s => s.trim().length > 0),
          async (apiKey) => {
            const event = createAuthorizerEvent({
              'Authorization': `Bearer ${apiKey}`
            });

            const result = await handler(event);

            return result.usageIdentifierKey === apiKey.trim();
          }
        ),
        { numRuns }
      );
    });

    it('should accept API keys with various formats', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.oneof(
            fc.string({ minLength: 1, maxLength: 50 }), // Plain string
            fc.hexaString({ minLength: 16, maxLength: 64 }), // Hex format
            fc.uuid(), // UUID format
            fc.base64String({ minLength: 16, maxLength: 64 }), // Base64 format
            fc.stringOf(fc.constantFrom('a', 'b', 'c', '0', '1', '2', '-', '_'), { minLength: 1, maxLength: 50 }) // Custom alphabet
          ),
          async (apiKey) => {
            const event = createAuthorizerEvent({
              'Authorization': apiKey
            });

            const result = await handler(event);

            // Any format should work without prefix requirement
            return result.usageIdentifierKey === apiKey.trim() &&
                   result.principalId === 'api-key-user';
          }
        ),
        { numRuns }
      );
    });

    it('should handle API keys with leading/trailing whitespace', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0),
          fc.stringOf(fc.constantFrom(' ', '\t'), { maxLength: 5 }),
          fc.stringOf(fc.constantFrom(' ', '\t'), { maxLength: 5 }),
          async (apiKey, leadingWs, trailingWs) => {
            const paddedKey = leadingWs + apiKey + trailingWs;
            const event = createAuthorizerEvent({
              'Authorization': paddedKey
            });

            const result = await handler(event);

            // Should trim whitespace
            return result.usageIdentifierKey === paddedKey.trim();
          }
        ),
        { numRuns }
      );
    });
  });

  /**
   * Property 3: Backward compatibility with x-api-key (1.4)
   * Validates requirement 1.5
   *
   * Test that x-api-key header works as fallback
   * Test case-insensitive variants
   */
  describe('Property 3: Backward compatibility with x-api-key', () => {
    it('should extract API key from x-api-key header as fallback', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 1, maxLength: 100 }).filter(s => s.trim().length > 0),
          async (apiKey) => {
            const event = createAuthorizerEvent({
              'x-api-key': apiKey
            });

            const result = await handler(event);

            return result.usageIdentifierKey === apiKey.trim() &&
                   result.principalId === 'api-key-user';
          }
        ),
        { numRuns }
      );
    });

    it('should handle case-insensitive x-api-key variants', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 1, maxLength: 100 }).filter(s => s.trim().length > 0),
          fc.constantFrom('x-api-key', 'X-API-Key', 'X-Api-Key', 'x-Api-key'),
          async (apiKey, headerName) => {
            const event = createAuthorizerEvent({
              [headerName]: apiKey
            });

            const result = await handler(event);

            return result.usageIdentifierKey === apiKey.trim();
          }
        ),
        { numRuns }
      );
    });

    it('should prioritize Authorization header over x-api-key', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 1, maxLength: 100 }).filter(s => s.trim().length > 0),
          fc.string({ minLength: 1, maxLength: 100 }).filter(s => s.trim().length > 0),
          async (authKey, xApiKey) => {
            // Make sure keys are different
            if (authKey.trim() === xApiKey.trim()) {
              return true; // Skip this case
            }

            const event = createAuthorizerEvent({
              'Authorization': authKey,
              'x-api-key': xApiKey
            });

            const result = await handler(event);

            // Authorization should take priority
            return result.usageIdentifierKey === authKey.trim();
          }
        ),
        { numRuns }
      );
    });
  });

  /**
   * Property 4: UsageIdentifierKey matches extracted key (1.5)
   * Validates requirements 3.2, 5.2
   *
   * Test that usageIdentifierKey in response equals the extracted API key
   */
  describe('Property 4: UsageIdentifierKey matches extracted key', () => {
    it('should set usageIdentifierKey to match extracted Authorization header key', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 1, maxLength: 100 }).filter(s => s.trim().length > 0),
          async (apiKey) => {
            const event = createAuthorizerEvent({
              'Authorization': apiKey
            });

            const result = await handler(event);

            // UsageIdentifierKey must match exactly (after trimming)
            return result.usageIdentifierKey === apiKey.trim();
          }
        ),
        { numRuns }
      );
    });

    it('should set usageIdentifierKey to match extracted x-api-key header key', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 1, maxLength: 100 }).filter(s => s.trim().length > 0),
          async (apiKey) => {
            const event = createAuthorizerEvent({
              'x-api-key': apiKey
            });

            const result = await handler(event);

            // UsageIdentifierKey must match exactly (after trimming)
            return result.usageIdentifierKey === apiKey.trim();
          }
        ),
        { numRuns }
      );
    });

    it('should maintain consistent usageIdentifierKey for same API key across multiple calls', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 1, maxLength: 100 }).filter(s => s.trim().length > 0),
          async (apiKey) => {
            const event1 = createAuthorizerEvent({ 'Authorization': apiKey });
            const event2 = createAuthorizerEvent({ 'Authorization': apiKey });
            const event3 = createAuthorizerEvent({ 'x-api-key': apiKey });

            const result1 = await handler(event1);
            const result2 = await handler(event2);
            const result3 = await handler(event3);

            // All results should have the same usageIdentifierKey
            return result1.usageIdentifierKey === result2.usageIdentifierKey &&
                   result2.usageIdentifierKey === result3.usageIdentifierKey &&
                   result1.usageIdentifierKey === apiKey.trim();
          }
        ),
        { numRuns }
      );
    });
  });

  /**
   * Property 5: Fixed principal ID (1.6)
   * Validates requirement 5.3
   *
   * Test that principalId is always "api-key-user" regardless of input
   */
  describe('Property 5: Fixed principal ID', () => {
    it('should always return principalId as "api-key-user" for Authorization header', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 1, maxLength: 100 }).filter(s => s.trim().length > 0),
          async (apiKey) => {
            const event = createAuthorizerEvent({
              'Authorization': apiKey
            });

            const result = await handler(event);

            // PrincipalId must always be the fixed value
            return result.principalId === 'api-key-user';
          }
        ),
        { numRuns }
      );
    });

    it('should always return principalId as "api-key-user" for x-api-key header', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 1, maxLength: 100 }).filter(s => s.trim().length > 0),
          async (apiKey) => {
            const event = createAuthorizerEvent({
              'x-api-key': apiKey
            });

            const result = await handler(event);

            // PrincipalId must always be the fixed value
            return result.principalId === 'api-key-user';
          }
        ),
        { numRuns }
      );
    });

    it('should return same principalId regardless of API key value', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 1, maxLength: 100 }).filter(s => s.trim().length > 0),
          fc.string({ minLength: 1, maxLength: 100 }).filter(s => s.trim().length > 0),
          async (apiKey1, apiKey2) => {
            const event1 = createAuthorizerEvent({ 'Authorization': apiKey1 });
            const event2 = createAuthorizerEvent({ 'Authorization': apiKey2 });

            const result1 = await handler(event1);
            const result2 = await handler(event2);

            // PrincipalId should be the same regardless of API key
            return result1.principalId === result2.principalId &&
                   result1.principalId === 'api-key-user';
          }
        ),
        { numRuns }
      );
    });
  });

  /**
   * Property 6: API key not logged (1.8)
   * Validates requirement 4.1
   *
   * Mock console.log/console.info/console.error
   * Verify API key value never appears in logs
   */
  describe('Property 6: API key not logged', () => {
    let consoleLogSpy: jest.SpyInstance;
    let consoleInfoSpy: jest.SpyInstance;
    let consoleErrorSpy: jest.SpyInstance;

    beforeEach(() => {
      consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();
      consoleInfoSpy = jest.spyOn(console, 'info').mockImplementation();
      consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
    });

    afterEach(() => {
      consoleLogSpy.mockRestore();
      consoleInfoSpy.mockRestore();
      consoleErrorSpy.mockRestore();
    });

    it('should never log the API key value from Authorization header', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 1, maxLength: 100 }).filter(s => s.trim().length > 0),
          async (apiKey) => {
            consoleLogSpy.mockClear();
            consoleInfoSpy.mockClear();
            consoleErrorSpy.mockClear();

            const event = createAuthorizerEvent({
              'Authorization': apiKey
            });

            await handler(event);

            // Check all console calls
            const allCalls = [
              ...consoleLogSpy.mock.calls,
              ...consoleInfoSpy.mock.calls,
              ...consoleErrorSpy.mock.calls
            ];

            // Convert all logged values to strings and check
            // Skip very short keys (< 3 chars) as they may appear in timestamps or JSON syntax
            const trimmedKey = apiKey.trim();
            if (trimmedKey.length < 3) {
              return true; // Skip validation for very short keys
            }

            for (const call of allCalls) {
              for (const arg of call) {
                const stringified = typeof arg === 'string' ? arg : JSON.stringify(arg);
                // API key should not appear in any log output
                if (stringified.includes(trimmedKey)) {
                  return false;
                }
              }
            }

            return true;
          }
        ),
        { numRuns }
      );
    });

    it('should never log the API key value from x-api-key header', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 1, maxLength: 100 }).filter(s => s.trim().length > 0),
          async (apiKey) => {
            consoleLogSpy.mockClear();
            consoleInfoSpy.mockClear();
            consoleErrorSpy.mockClear();

            const event = createAuthorizerEvent({
              'x-api-key': apiKey
            });

            await handler(event);

            // Check all console calls
            const allCalls = [
              ...consoleLogSpy.mock.calls,
              ...consoleInfoSpy.mock.calls,
              ...consoleErrorSpy.mock.calls
            ];

            // Convert all logged values to strings and check
            // Skip very short keys (< 3 chars) as they may appear in timestamps or JSON syntax
            const trimmedKey = apiKey.trim();
            if (trimmedKey.length < 3) {
              return true; // Skip validation for very short keys
            }

            for (const call of allCalls) {
              for (const arg of call) {
                const stringified = typeof arg === 'string' ? arg : JSON.stringify(arg);
                // API key should not appear in any log output
                if (stringified.includes(trimmedKey)) {
                  return false;
                }
              }
            }

            return true;
          }
        ),
        { numRuns }
      );
    });

    it('should not log API key even with special characters', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 1, maxLength: 100 }).filter(s => s.trim().length > 0),
          async (apiKey) => {
            consoleLogSpy.mockClear();

            const event = createAuthorizerEvent({
              'Authorization': apiKey
            });

            await handler(event);

            const allCalls = consoleLogSpy.mock.calls;

            // Skip very short keys (< 3 chars) as they may appear in timestamps or JSON syntax
            const trimmedKey = apiKey.trim();
            if (trimmedKey.length < 3) {
              return true; // Skip validation for very short keys
            }

            for (const call of allCalls) {
              for (const arg of call) {
                const stringified = typeof arg === 'string' ? arg : JSON.stringify(arg);
                if (stringified.includes(trimmedKey)) {
                  return false;
                }
              }
            }

            return true;
          }
        ),
        { numRuns }
      );
    });
  });

  /**
   * Property 7: Request ID logged (1.9)
   * Validates requirement 4.2
   *
   * Verify requestId appears in logs
   */
  describe('Property 7: Request ID logged', () => {
    let consoleLogSpy: jest.SpyInstance;

    beforeEach(() => {
      consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();
    });

    afterEach(() => {
      consoleLogSpy.mockRestore();
    });

    it('should log requestId for every authorization attempt', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 1, maxLength: 100 }).filter(s => s.trim().length > 0),
          fc.hexaString({ minLength: 8, maxLength: 32 }),
          async (apiKey, requestId) => {
            consoleLogSpy.mockClear();

            const event = createAuthorizerEvent({
              'Authorization': apiKey
            }, requestId);

            await handler(event);

            // Check if requestId was logged
            const allCalls = consoleLogSpy.mock.calls;
            let requestIdLogged = false;

            for (const call of allCalls) {
              for (const arg of call) {
                const stringified = typeof arg === 'string' ? arg : JSON.stringify(arg);
                if (stringified.includes(requestId)) {
                  requestIdLogged = true;
                  break;
                }
              }
            }

            return requestIdLogged;
          }
        ),
        { numRuns }
      );
    });

    it('should log requestId even when using x-api-key fallback', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 1, maxLength: 100 }).filter(s => s.trim().length > 0),
          fc.hexaString({ minLength: 8, maxLength: 32 }),
          async (apiKey, requestId) => {
            consoleLogSpy.mockClear();

            const event = createAuthorizerEvent({
              'x-api-key': apiKey
            }, requestId);

            await handler(event);

            // Check if requestId was logged
            const allCalls = consoleLogSpy.mock.calls;
            let requestIdLogged = false;

            for (const call of allCalls) {
              for (const arg of call) {
                const stringified = typeof arg === 'string' ? arg : JSON.stringify(arg);
                if (stringified.includes(requestId)) {
                  requestIdLogged = true;
                  break;
                }
              }
            }

            return requestIdLogged;
          }
        ),
        { numRuns }
      );
    });

    it('should log different requestIds for different requests', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 1, maxLength: 100 }).filter(s => s.trim().length > 0),
          fc.hexaString({ minLength: 8, maxLength: 32 }),
          fc.hexaString({ minLength: 8, maxLength: 32 }),
          async (apiKey, requestId1, requestId2) => {
            // Skip if requestIds are the same
            if (requestId1 === requestId2) {
              return true;
            }

            consoleLogSpy.mockClear();

            const event1 = createAuthorizerEvent({ 'Authorization': apiKey }, requestId1);
            await handler(event1);

            const calls1 = [...consoleLogSpy.mock.calls];

            consoleLogSpy.mockClear();

            const event2 = createAuthorizerEvent({ 'Authorization': apiKey }, requestId2);
            await handler(event2);

            const calls2 = [...consoleLogSpy.mock.calls];

            // Check first call logged requestId1
            let found1 = false;
            for (const call of calls1) {
              const stringified = JSON.stringify(call);
              if (stringified.includes(requestId1)) {
                found1 = true;
                break;
              }
            }

            // Check second call logged requestId2
            let found2 = false;
            for (const call of calls2) {
              const stringified = JSON.stringify(call);
              if (stringified.includes(requestId2)) {
                found2 = true;
                break;
              }
            }

            return found1 && found2;
          }
        ),
        { numRuns }
      );
    });
  });

  /**
   * Property 8: Header presence logged (1.10)
   * Validates requirement 4.3
   *
   * Verify hasAuthorizationHeader and hasXApiKeyHeader flags are logged
   */
  describe('Property 8: Header presence logged', () => {
    let consoleLogSpy: jest.SpyInstance;

    beforeEach(() => {
      consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();
    });

    afterEach(() => {
      consoleLogSpy.mockRestore();
    });

    it('should log hasAuthorizationHeader: true when Authorization header present', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 1, maxLength: 100 }).filter(s => s.trim().length > 0),
          async (apiKey) => {
            consoleLogSpy.mockClear();

            const event = createAuthorizerEvent({
              'Authorization': apiKey
            });

            await handler(event);

            // Check if hasAuthorizationHeader: true was logged
            const allCalls = consoleLogSpy.mock.calls;
            let flagLogged = false;

            for (const call of allCalls) {
              for (const arg of call) {
                const stringified = typeof arg === 'string' ? arg : JSON.stringify(arg);
                if (stringified.includes('hasAuthorizationHeader') && stringified.includes('true')) {
                  flagLogged = true;
                  break;
                }
              }
            }

            return flagLogged;
          }
        ),
        { numRuns }
      );
    });

    it('should log hasXApiKeyHeader: true when x-api-key header present', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 1, maxLength: 100 }).filter(s => s.trim().length > 0),
          async (apiKey) => {
            consoleLogSpy.mockClear();

            const event = createAuthorizerEvent({
              'x-api-key': apiKey
            });

            await handler(event);

            // Check if hasXApiKeyHeader: true was logged
            const allCalls = consoleLogSpy.mock.calls;
            let flagLogged = false;

            for (const call of allCalls) {
              for (const arg of call) {
                const stringified = typeof arg === 'string' ? arg : JSON.stringify(arg);
                if (stringified.includes('hasXApiKeyHeader') && stringified.includes('true')) {
                  flagLogged = true;
                  break;
                }
              }
            }

            return flagLogged;
          }
        ),
        { numRuns }
      );
    });

    it('should log both flags when both headers present', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 1, maxLength: 100 }).filter(s => s.trim().length > 0),
          fc.string({ minLength: 1, maxLength: 100 }).filter(s => s.trim().length > 0),
          async (authKey, xApiKey) => {
            consoleLogSpy.mockClear();

            const event = createAuthorizerEvent({
              'Authorization': authKey,
              'x-api-key': xApiKey
            });

            await handler(event);

            // Check if both flags were logged as true
            const allCalls = consoleLogSpy.mock.calls;
            let hasAuthLogged = false;
            let hasXApiKeyLogged = false;

            for (const call of allCalls) {
              for (const arg of call) {
                const stringified = typeof arg === 'string' ? arg : JSON.stringify(arg);
                if (stringified.includes('hasAuthorizationHeader') && stringified.includes('true')) {
                  hasAuthLogged = true;
                }
                if (stringified.includes('hasXApiKeyHeader') && stringified.includes('true')) {
                  hasXApiKeyLogged = true;
                }
              }
            }

            return hasAuthLogged && hasXApiKeyLogged;
          }
        ),
        { numRuns }
      );
    });

    it('should log hasAuthorizationHeader: false when only x-api-key present', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 1, maxLength: 100 }).filter(s => s.trim().length > 0),
          async (apiKey) => {
            consoleLogSpy.mockClear();

            const event = createAuthorizerEvent({
              'x-api-key': apiKey
            });

            await handler(event);

            // Check if hasAuthorizationHeader: false was logged
            const allCalls = consoleLogSpy.mock.calls;
            let flagLogged = false;

            for (const call of allCalls) {
              for (const arg of call) {
                const stringified = typeof arg === 'string' ? arg : JSON.stringify(arg);
                if (stringified.includes('hasAuthorizationHeader') && stringified.includes('false')) {
                  flagLogged = true;
                  break;
                }
              }
            }

            return flagLogged;
          }
        ),
        { numRuns }
      );
    });

    it('should log hasXApiKeyHeader: false when only Authorization present', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 1, maxLength: 100 }).filter(s => s.trim().length > 0),
          async (apiKey) => {
            consoleLogSpy.mockClear();

            const event = createAuthorizerEvent({
              'Authorization': apiKey
            });

            await handler(event);

            // Check if hasXApiKeyHeader: false was logged
            const allCalls = consoleLogSpy.mock.calls;
            let flagLogged = false;

            for (const call of allCalls) {
              for (const arg of call) {
                const stringified = typeof arg === 'string' ? arg : JSON.stringify(arg);
                if (stringified.includes('hasXApiKeyHeader') && stringified.includes('false')) {
                  flagLogged = true;
                  break;
                }
              }
            }

            return flagLogged;
          }
        ),
        { numRuns }
      );
    });
  });

  /**
   * Additional property tests for edge cases and policy structure
   */
  describe('Additional Properties', () => {
    it('should return valid IAM policy structure', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 1, maxLength: 100 }).filter(s => s.trim().length > 0),
          async (apiKey) => {
            const event = createAuthorizerEvent({
              'Authorization': apiKey
            });

            const result = await handler(event);

            // Verify policy structure
            const statement = result.policyDocument.Statement[0] as any;
            return result.policyDocument &&
                   result.policyDocument.Version === '2012-10-17' &&
                   Array.isArray(result.policyDocument.Statement) &&
                   result.policyDocument.Statement.length > 0 &&
                   statement.Effect === 'Allow' &&
                   statement.Action === 'execute-api:Invoke' &&
                   typeof statement.Resource === 'string';
          }
        ),
        { numRuns }
      );
    });

    it('should generate consistent resource ARN format', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 1, maxLength: 100 }).filter(s => s.trim().length > 0),
          async (apiKey) => {
            const event = createAuthorizerEvent({
              'Authorization': apiKey
            });

            const result = await handler(event);

            // Resource ARN should end with /*
            const statement = result.policyDocument.Statement[0] as any;
            const resource = statement.Resource;
            return typeof resource === 'string' && resource.endsWith('/*/*');
          }
        ),
        { numRuns }
      );
    });

    it('should trim whitespace from API keys consistently', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0),
          fc.nat(5),
          fc.nat(5),
          async (apiKey, leadingSpaces, trailingSpaces) => {
            const paddedKey = ' '.repeat(leadingSpaces) + apiKey + ' '.repeat(trailingSpaces);
            const event = createAuthorizerEvent({
              'Authorization': paddedKey
            });

            const result = await handler(event);

            // UsageIdentifierKey should have whitespace trimmed
            return result.usageIdentifierKey === paddedKey.trim() &&
                   !result.usageIdentifierKey.startsWith(' ') &&
                   !result.usageIdentifierKey.endsWith(' ');
          }
        ),
        { numRuns }
      );
    });
  });
});
