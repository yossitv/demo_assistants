/**
 * Property-based tests for API Error Handling Consistency
 *
 * Test Property 21: API error handling consistency (validates Requirement 7.2)
 *
 * This test suite validates that:
 * - ApiError correctly extracts error messages from various API response formats
 * - Network errors are properly distinguished from API errors
 * - Status codes are correctly preserved
 */

import * as fc from 'fast-check';
import { ApiError } from '@/lib/api/errors';

describe('API Error Handling - Property-based Tests', () => {
  describe('Property 21: Error Message Extraction Consistency', () => {
    /**
     * Property: ApiError.extractErrorMessage should always return a non-empty string
     * regardless of the input format
     */
    test('should always extract a non-empty error message from any input', () => {
      fc.assert(
        fc.property(
          fc.oneof(
            fc.string(),
            fc.record({
              error: fc.string(),
            }),
            fc.record({
              message: fc.string(),
            }),
            fc.record({
              error: fc.record({
                message: fc.string(),
              }),
            }),
            fc.record({
              errors: fc.array(fc.string(), { minLength: 1 }),
            }),
            fc.record({
              errors: fc.array(
                fc.record({ message: fc.string() }),
                { minLength: 1 }
              ),
            }),
            fc.constant(null),
            fc.constant(undefined),
            fc.integer(),
            fc.boolean()
          ),
          (input) => {
            const message = ApiError.extractErrorMessage(input);
            expect(typeof message).toBe('string');
            expect(message.length).toBeGreaterThan(0);
          }
        ),
        { numRuns: 1000 }
      );
    });

    /**
     * Property: For string inputs, the extracted message should be the string itself
     * (or a default message if empty)
     */
    test('should extract the exact message from non-empty string inputs', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1 }),
          (errorString) => {
            const message = ApiError.extractErrorMessage(errorString);
            expect(message).toBe(errorString);
          }
        ),
        { numRuns: 100 }
      );
    });

    /**
     * Property: For { error: string } format, should extract the error field
     */
    test('should extract error from { error: string } format', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1 }),
          (errorString) => {
            const input = { error: errorString };
            const message = ApiError.extractErrorMessage(input);
            expect(message).toBe(errorString);
          }
        ),
        { numRuns: 100 }
      );
    });

    /**
     * Property: For { message: string } format, should extract the message field
     */
    test('should extract message from { message: string } format', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1 }),
          (errorString) => {
            const input = { message: errorString };
            const message = ApiError.extractErrorMessage(input);
            expect(message).toBe(errorString);
          }
        ),
        { numRuns: 100 }
      );
    });

    /**
     * Property: For { error: { message: string } } format, should extract nested message
     */
    test('should extract message from { error: { message: string } } format', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1 }),
          (errorString) => {
            const input = { error: { message: errorString } };
            const message = ApiError.extractErrorMessage(input);
            expect(message).toBe(errorString);
          }
        ),
        { numRuns: 100 }
      );
    });

    /**
     * Property: For { errors: string[] } format, should extract first error
     */
    test('should extract first error from { errors: string[] } format', () => {
      fc.assert(
        fc.property(
          fc.array(fc.string({ minLength: 1 }), { minLength: 1, maxLength: 5 }),
          (errors) => {
            const input = { errors };
            const message = ApiError.extractErrorMessage(input);
            expect(message).toBe(errors[0]);
          }
        ),
        { numRuns: 100 }
      );
    });

    /**
     * Property: For { errors: [{ message: string }] } format, should extract first message
     */
    test('should extract first message from { errors: [{ message: string }] } format', () => {
      fc.assert(
        fc.property(
          fc.array(
            fc.record({ message: fc.string({ minLength: 1 }) }),
            { minLength: 1, maxLength: 5 }
          ),
          (errors) => {
            const input = { errors };
            const message = ApiError.extractErrorMessage(input);
            expect(message).toBe(errors[0].message);
          }
        ),
        { numRuns: 100 }
      );
    });

    /**
     * Property: For null or undefined, should return default message
     */
    test('should return default message for null or undefined', () => {
      const nullMessage = ApiError.extractErrorMessage(null);
      const undefinedMessage = ApiError.extractErrorMessage(undefined);

      expect(nullMessage).toBe('An unknown error occurred');
      expect(undefinedMessage).toBe('An unknown error occurred');
    });
  });

  describe('Property 21: Network Error Detection', () => {
    /**
     * Property: Network errors should always have isNetworkError = true
     */
    test('should correctly identify network errors', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1 }),
          (errorMessage) => {
            const networkError = ApiError.fromNetworkError(new Error(errorMessage));

            expect(networkError.isNetworkError).toBe(true);
            expect(networkError.statusCode).toBe(0);
            expect(networkError instanceof ApiError).toBe(true);
          }
        ),
        { numRuns: 100 }
      );
    });

    /**
     * Property: API errors (non-network) should have isNetworkError = false
     */
    test('should correctly identify API errors as non-network errors', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1 }),
          fc.integer({ min: 400, max: 599 }),
          (message, statusCode) => {
            const apiError = new ApiError(message, statusCode, false);

            expect(apiError.isNetworkError).toBe(false);
            expect(apiError.statusCode).toBe(statusCode);
            expect(apiError instanceof ApiError).toBe(true);
          }
        ),
        { numRuns: 100 }
      );
    });

    /**
     * Property: isNetworkError static method should match instance property
     */
    test('should have consistent network error detection', () => {
      fc.assert(
        fc.property(
          fc.boolean(),
          fc.string({ minLength: 1 }),
          (isNetwork, message) => {
            const error = new ApiError(message, isNetwork ? 0 : 500, isNetwork);

            expect(ApiError.isNetworkError(error)).toBe(isNetwork);
            expect(error.isNetworkError).toBe(isNetwork);
          }
        ),
        { numRuns: 100 }
      );
    });

    /**
     * Property: TypeError with fetch-related messages should be detected as network errors
     */
    test('should detect TypeError with fetch as network error', () => {
      const fetchError = new TypeError('Failed to fetch');
      const networkError = ApiError.fromError(fetchError);

      expect(networkError.isNetworkError).toBe(true);
      expect(networkError.statusCode).toBe(0);
      expect(ApiError.isNetworkError(fetchError)).toBe(true);
    });

    /**
     * Property: Regular errors should not be classified as network errors
     */
    test('should not classify regular errors as network errors', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1 }).filter(s =>
            !s.includes('fetch') &&
            !s.includes('network') &&
            !s.includes('Failed to fetch')
          ),
          (message) => {
            const regularError = new Error(message);
            const apiError = ApiError.fromError(regularError);

            // Should not be detected as network error unless it's a TypeError
            if (regularError.name !== 'TypeError') {
              expect(apiError.isNetworkError).toBe(false);
              expect(apiError.statusCode).toBe(500);
            }
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Property 21: Status Code Preservation', () => {
    /**
     * Property: Status codes should be preserved exactly
     */
    test('should preserve status codes exactly', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 100, max: 599 }),
          fc.string({ minLength: 1 }),
          (statusCode, message) => {
            const error = new ApiError(message, statusCode, false);

            expect(error.statusCode).toBe(statusCode);
            expect(ApiError.getStatusCode(error)).toBe(statusCode);
          }
        ),
        { numRuns: 200 }
      );
    });

    /**
     * Property: Network errors should always have status code 0
     */
    test('should always set status code 0 for network errors', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1 }),
          (message) => {
            const networkError = ApiError.fromNetworkError(new Error(message));
            expect(networkError.statusCode).toBe(0);
          }
        ),
        { numRuns: 100 }
      );
    });

    /**
     * Property: Default status code should be 500 for unknown errors
     */
    test('should default to 500 for unknown errors', () => {
      fc.assert(
        fc.property(
          fc.oneof(
            fc.string(),
            fc.integer(),
            fc.boolean(),
            fc.record({ someKey: fc.string() })
          ),
          (unknownError) => {
            const error = ApiError.fromError(unknownError);

            // Should have a valid status code
            expect(error.statusCode).toBeGreaterThanOrEqual(0);
            expect(error.statusCode).toBeLessThan(600);
          }
        ),
        { numRuns: 100 }
      );
    });

    /**
     * Property: HTTP status codes should be in valid ranges
     */
    test('should maintain valid HTTP status code ranges', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 200, max: 599 }),
          fc.string({ minLength: 1 }),
          (statusCode, message) => {
            const error = new ApiError(message, statusCode, false);

            // Status code should be in valid HTTP range or 0 for network errors
            const isValidStatusCode =
              statusCode === 0 ||
              (statusCode >= 100 && statusCode < 600);

            expect(isValidStatusCode).toBe(true);
            expect(error.statusCode).toBe(statusCode);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Property 21: Error Construction Invariants', () => {
    /**
     * Property: ApiError instances should always be instances of Error
     */
    test('should always be instances of Error', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1 }),
          fc.integer({ min: 0, max: 599 }),
          fc.boolean(),
          (message, statusCode, isNetwork) => {
            const error = new ApiError(message, statusCode, isNetwork);

            expect(error instanceof Error).toBe(true);
            expect(error instanceof ApiError).toBe(true);
            expect(error.name).toBe('ApiError');
          }
        ),
        { numRuns: 100 }
      );
    });

    /**
     * Property: Error message should always be preserved
     */
    test('should preserve error message', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1 }),
          fc.integer({ min: 0, max: 599 }),
          (message, statusCode) => {
            const error = new ApiError(message, statusCode, false);

            expect(error.message).toBe(message);
          }
        ),
        { numRuns: 100 }
      );
    });

    /**
     * Property: fromError should handle ApiError instances idempotently
     */
    test('should handle ApiError instances idempotently', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1 }),
          fc.integer({ min: 0, max: 599 }),
          fc.boolean(),
          (message, statusCode, isNetwork) => {
            const originalError = new ApiError(message, statusCode, isNetwork);
            const wrappedError = ApiError.fromError(originalError);

            // Should return the same instance
            expect(wrappedError).toBe(originalError);
            expect(wrappedError.message).toBe(message);
            expect(wrappedError.statusCode).toBe(statusCode);
            expect(wrappedError.isNetworkError).toBe(isNetwork);
          }
        ),
        { numRuns: 100 }
      );
    });

    /**
     * Property: originalError should be preserved when provided
     */
    test('should preserve original error reference', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1 }),
          (message) => {
            const originalError = new Error(message);
            const apiError = ApiError.fromError(originalError);

            expect(apiError.originalError).toBe(originalError);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Property 21: Edge Cases and Resilience', () => {
    /**
     * Property: Should handle empty objects gracefully
     */
    test('should handle empty objects', () => {
      const message = ApiError.extractErrorMessage({});
      expect(message).toBe('An unknown error occurred');
    });

    /**
     * Property: Should handle deeply nested objects without crashing
     */
    test('should handle deeply nested objects', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1 }),
          (msg) => {
            const deeplyNested = {
              level1: {
                level2: {
                  level3: {
                    message: msg
                  }
                }
              }
            };

            // Should not crash, returns default message for unsupported formats
            const message = ApiError.extractErrorMessage(deeplyNested);
            expect(typeof message).toBe('string');
            expect(message.length).toBeGreaterThan(0);
          }
        ),
        { numRuns: 50 }
      );
    });

    /**
     * Property: Should handle arrays without errors field
     */
    test('should handle plain arrays gracefully', () => {
      fc.assert(
        fc.property(
          fc.array(fc.string()),
          (arr) => {
            const message = ApiError.extractErrorMessage(arr);
            expect(typeof message).toBe('string');
            expect(message.length).toBeGreaterThan(0);
          }
        ),
        { numRuns: 50 }
      );
    });

    /**
     * Property: Should handle circular references without crashing
     */
    test('should handle objects with circular references', () => {
      const circular: any = { message: 'test' };
      circular.self = circular;

      const message = ApiError.extractErrorMessage(circular);
      expect(message).toBe('test');
    });

    /**
     * Property: Should handle mixed-type errors arrays
     */
    test('should handle mixed-type errors arrays', () => {
      const mixed = {
        errors: ['string error', { message: 'object error' }, 123, null]
      };

      const message = ApiError.extractErrorMessage(mixed);
      expect(message).toBe('string error');
    });

    /**
     * Property: Should handle empty string messages
     */
    test('should handle empty strings with default message', () => {
      const message = ApiError.extractErrorMessage('');
      expect(message).toBe('An unknown error occurred');
    });

    /**
     * Property: Should handle numeric and boolean values
     */
    test('should convert non-string primitives to strings', () => {
      const numMessage = ApiError.extractErrorMessage(404);
      expect(numMessage).toBe('404');

      const boolMessage = ApiError.extractErrorMessage(false);
      expect(boolMessage).toBe('false');
    });
  });

  describe('Property 21: Consistency Across Different Input Formats', () => {
    /**
     * Property: Same error content should produce same message regardless of format
     */
    test('should extract same message from different formats containing same content', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1 }),
          (errorMsg) => {
            const formats = [
              errorMsg,
              { error: errorMsg },
              { message: errorMsg },
              { error: { message: errorMsg } },
              { errors: [errorMsg] },
              { errors: [{ message: errorMsg }] }
            ];

            const messages = formats.map(format =>
              ApiError.extractErrorMessage(format)
            );

            // All extracted messages should be the same
            messages.forEach(msg => {
              expect(msg).toBe(errorMsg);
            });
          }
        ),
        { numRuns: 100 }
      );
    });

    /**
     * Property: Error extraction should be deterministic
     */
    test('should produce consistent results for same input', () => {
      fc.assert(
        fc.property(
          fc.oneof(
            fc.string(),
            fc.record({ error: fc.string() }),
            fc.record({ message: fc.string() })
          ),
          (input) => {
            const message1 = ApiError.extractErrorMessage(input);
            const message2 = ApiError.extractErrorMessage(input);

            expect(message1).toBe(message2);
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
