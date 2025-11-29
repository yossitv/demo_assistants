import * as fc from 'fast-check';
import { validateBearerToken } from './bearerAuth';
import { AuthenticationError, AuthorizationError } from './errors';
import { ILogger } from '../domain/services/ILogger';

const numRuns = 100;
const expectedToken = 'expected-token';

const createLogger = (): ILogger => ({
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn()
});

/**
 * Feature: bearer-auth, Property 1: Missing Authorization header is rejected
 * Validates: Requirements 2.1
 */
describe('Bearer token authentication - missing header', () => {
  it('returns 401 when Authorization header is not present', async () => {
    const headersWithoutAuth = fc.dictionary(
      fc.string({ minLength: 1, maxLength: 12 }).filter(key => key.toLowerCase() !== 'authorization'),
      fc.string({ maxLength: 50 })
    );

    await fc.assert(
      fc.asyncProperty(headersWithoutAuth, async (headers) => {
        try {
          validateBearerToken(headers, createLogger(), { expectedToken });
          return false;
        } catch (error) {
          return error instanceof AuthenticationError;
        }
      }),
      { numRuns }
    );
  });
});

/**
 * Feature: bearer-auth, Property 2: Authorization scheme must be Bearer
 * Validates: Requirements 2.2
 */
describe('Bearer token authentication - invalid scheme', () => {
  it('returns 401 when Authorization header does not use Bearer scheme', async () => {
    const invalidSchemeValue = fc.string({ minLength: 1, maxLength: 50 })
      .filter(value => !/^\s*Bearer\s+/i.test(value));

    await fc.assert(
      fc.asyncProperty(
        invalidSchemeValue,
        fc.constantFrom('Authorization', 'authorization', 'AUTHORIZATION', 'AuthoriZation'),
        async (headerValue, headerName) => {
          const headers = { [headerName]: headerValue } as Record<string, string>;

          try {
            validateBearerToken(headers, createLogger(), { expectedToken });
            return false;
          } catch (error) {
            return error instanceof AuthenticationError;
          }
        }
      ),
      { numRuns }
    );
  });
});

/**
 * Feature: bearer-auth, Property 3: Mismatched Bearer token is forbidden
 * Validates: Requirements 2.3
 */
describe('Bearer token authentication - token mismatch', () => {
  it('returns 403 when provided token does not match configured value', async () => {
    const mismatchedTokens = fc.tuple(
      fc.string({ minLength: 6, maxLength: 40 }),
      fc.string({ minLength: 6, maxLength: 40 })
    ).filter(([provided, expected]) => provided !== expected);

    await fc.assert(
      fc.asyncProperty(
        mismatchedTokens,
        fc.constantFrom('Authorization', 'authorization'),
        async ([provided, expected], headerName) => {
          const headers = { [headerName]: `Bearer ${provided}` } as Record<string, string>;

          try {
            validateBearerToken(headers, createLogger(), { expectedToken: expected });
            return false;
          } catch (error) {
            return error instanceof AuthorizationError;
          }
        }
      ),
      { numRuns }
    );
  });
});
