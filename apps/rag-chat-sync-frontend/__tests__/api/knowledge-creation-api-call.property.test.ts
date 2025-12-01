/**
 * Property-based tests for knowledge base creation API call
 * Test Property 5: Knowledge base creation API call (validates Requirement 2.2)
 *
 * Requirement 2.2: WHEN the User submits the form THEN the System SHALL send a POST request 
 * to `/v1/knowledge/create` with the name and sourceUrls array
 *
 * Feature: web-mvp, Property 5: Knowledge base creation API call
 */

import * as fc from 'fast-check';
import { ApiClient } from '@/lib/api/client';

// Mock global fetch
global.fetch = jest.fn();

describe('Property 5: Knowledge Base Creation API Call', () => {
  let mockFetch: jest.MockedFunction<typeof fetch>;
  let originalEnv: NodeJS.ProcessEnv;

  beforeEach(() => {
    // Save and clear environment variables
    originalEnv = process.env;
    process.env = { ...originalEnv };
    delete process.env.NEXT_PUBLIC_JWT_TOKEN;
    delete process.env.NEXT_PUBLIC_API_BASE_URL;

    // Reset all mocks
    jest.clearAllMocks();
    mockFetch = global.fetch as jest.MockedFunction<typeof fetch>;

    // Mock AbortSignal.timeout if not available (Jest environment)
    if (!AbortSignal.timeout) {
      (AbortSignal as any).timeout = (ms: number) => {
        const controller = new AbortController();
        return controller.signal;
      };
    }

    // Setup default successful response
    const mockResponse = {
      knowledgeSpaceId: 'ks-123',
      status: 'completed',
      successfulUrls: 1,
      failedUrls: 0,
      errors: [],
    };

    mockFetch.mockResolvedValue({
      ok: true,
      status: 200,
      statusText: 'OK',
      headers: new Headers({ 'content-type': 'application/json' }),
      json: async () => mockResponse,
      text: async () => JSON.stringify(mockResponse),
      clone: function() { return this; },
    } as Response);
  });

  afterEach(() => {
    // Restore original environment
    process.env = originalEnv;
  });

  describe('API Endpoint and Method', () => {
    it('Property: For any knowledge space name and URLs, request is sent to /v1/knowledge/create', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 1, maxLength: 100 }), // name
          fc.array(fc.webUrl(), { minLength: 1, maxLength: 5 }), // URLs
          fc.uuid(), // JWT token
          async (name, urls, token) => {
            // Pre-condition: name must not be whitespace-only
            fc.pre(name.trim().length > 0);

            // Clear mocks for each property run
            mockFetch.mockClear();

            const apiClient = new ApiClient({ 
              jwtToken: token,
              baseUrl: 'http://test-api.example.com'
            });

            try {
              await apiClient.createKnowledgeSpace(name, urls);
            } catch {
              // Ignore errors, we're testing the request format
            }

            // Verify fetch was called
            expect(mockFetch).toHaveBeenCalledTimes(1);

            // Get the call arguments
            const [url, options] = mockFetch.mock.calls[0];

            // Verify URL ends with /v1/knowledge/create
            expect(url).toMatch(/\/v1\/knowledge\/create$/);

            // Verify method is POST
            expect(options?.method).toBe('POST');
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Request Body Structure', () => {
    it('Property: For any name and URLs, request body contains name field', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 1, maxLength: 100 }),
          fc.array(fc.webUrl(), { minLength: 1, maxLength: 5 }),
          fc.uuid(),
          async (name, urls, token) => {
            // Pre-condition: name must not be whitespace-only
            fc.pre(name.trim().length > 0);

            // Clear mocks
            mockFetch.mockClear();

            const apiClient = new ApiClient({ 
              jwtToken: token,
              baseUrl: 'http://test-api.example.com'
            });

            try {
              await apiClient.createKnowledgeSpace(name, urls);
            } catch {
              // Ignore errors
            }

            // Get the request body
            const [, options] = mockFetch.mock.calls[0];
            const body = JSON.parse(options?.body as string);

            // Verify name field is present and matches input (trimmed)
            expect(body).toHaveProperty('name');
            expect(body.name).toBe(name.trim());
          }
        ),
        { numRuns: 100 }
      );
    });

    it('Property: For any name and URLs, request body contains sourceUrls array', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 1, maxLength: 100 }),
          fc.array(fc.webUrl(), { minLength: 1, maxLength: 5 }),
          fc.uuid(),
          async (name, urls, token) => {
            // Pre-condition: name must not be whitespace-only
            fc.pre(name.trim().length > 0);

            // Clear mocks
            mockFetch.mockClear();

            const apiClient = new ApiClient({ 
              jwtToken: token,
              baseUrl: 'http://test-api.example.com'
            });

            try {
              await apiClient.createKnowledgeSpace(name, urls);
            } catch {
              // Ignore errors
            }

            // Get the request body
            const [, options] = mockFetch.mock.calls[0];
            const body = JSON.parse(options?.body as string);

            // Verify sourceUrls field is present and is an array
            expect(body).toHaveProperty('sourceUrls');
            expect(Array.isArray(body.sourceUrls)).toBe(true);
            expect(body.sourceUrls.length).toBeGreaterThan(0);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('Property: For any URLs array, all valid URLs are included in sourceUrls', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 1, maxLength: 100 }),
          fc.array(fc.webUrl(), { minLength: 1, maxLength: 5 }),
          fc.uuid(),
          async (name, urls, token) => {
            // Pre-condition: name must not be whitespace-only
            fc.pre(name.trim().length > 0);

            // Clear mocks
            mockFetch.mockClear();

            const apiClient = new ApiClient({ 
              jwtToken: token,
              baseUrl: 'http://test-api.example.com'
            });

            try {
              await apiClient.createKnowledgeSpace(name, urls);
            } catch {
              // Ignore errors
            }

            // Get the request body
            const [, options] = mockFetch.mock.calls[0];
            const body = JSON.parse(options?.body as string);

            // Verify all URLs are in sourceUrls
            expect(body.sourceUrls).toHaveLength(urls.length);
            urls.forEach(url => {
              expect(body.sourceUrls).toContain(url);
            });
          }
        ),
        { numRuns: 100 }
      );
    });

    it('Property: Request body contains only name and sourceUrls fields', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 1, maxLength: 100 }),
          fc.array(fc.webUrl(), { minLength: 1, maxLength: 5 }),
          fc.uuid(),
          async (name, urls, token) => {
            // Pre-condition: name must not be whitespace-only
            fc.pre(name.trim().length > 0);

            // Clear mocks
            mockFetch.mockClear();

            const apiClient = new ApiClient({ 
              jwtToken: token,
              baseUrl: 'http://test-api.example.com'
            });

            try {
              await apiClient.createKnowledgeSpace(name, urls);
            } catch {
              // Ignore errors
            }

            // Get the request body
            const [, options] = mockFetch.mock.calls[0];
            const body = JSON.parse(options?.body as string);

            // Verify only expected fields are present
            const keys = Object.keys(body);
            expect(keys).toHaveLength(2);
            expect(keys).toContain('name');
            expect(keys).toContain('sourceUrls');
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Input Validation and Sanitization', () => {
    it('Property: Name is trimmed before sending', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 1, maxLength: 100 }),
          fc.integer({ min: 0, max: 10 }), // leading spaces
          fc.integer({ min: 0, max: 10 }), // trailing spaces
          fc.array(fc.webUrl(), { minLength: 1, maxLength: 5 }),
          fc.uuid(),
          async (name, leadingSpaces, trailingSpaces, urls, token) => {
            // Pre-condition: name must not be whitespace-only
            fc.pre(name.trim().length > 0);

            // Add whitespace
            const paddedName = ' '.repeat(leadingSpaces) + name + ' '.repeat(trailingSpaces);

            // Clear mocks
            mockFetch.mockClear();

            const apiClient = new ApiClient({ 
              jwtToken: token,
              baseUrl: 'http://test-api.example.com'
            });

            try {
              await apiClient.createKnowledgeSpace(paddedName, urls);
            } catch {
              // Ignore errors
            }

            // Get the request body
            const [, options] = mockFetch.mock.calls[0];
            const body = JSON.parse(options?.body as string);

            // Verify name is trimmed
            expect(body.name).toBe(name.trim());
            expect(body.name).not.toMatch(/^\s/);
            expect(body.name).not.toMatch(/\s$/);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('Property: Invalid URLs are filtered out before sending', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 1, maxLength: 100 }),
          fc.array(fc.webUrl(), { minLength: 1, maxLength: 3 }),
          fc.array(fc.string({ minLength: 1, maxLength: 50 }), { minLength: 1, maxLength: 3 }), // invalid URLs
          fc.uuid(),
          async (name, validUrls, invalidUrls, token) => {
            // Pre-condition: name must not be whitespace-only
            fc.pre(name.trim().length > 0);
            // Pre-condition: invalid URLs should not be valid URLs
            fc.pre(invalidUrls.every(url => {
              try {
                new URL(url);
                return false; // If it's valid, skip this test case
              } catch {
                return true; // If it's invalid, continue
              }
            }));

            // Mix valid and invalid URLs
            const mixedUrls = [...validUrls, ...invalidUrls];

            // Clear mocks
            mockFetch.mockClear();

            const apiClient = new ApiClient({ 
              jwtToken: token,
              baseUrl: 'http://test-api.example.com'
            });

            try {
              await apiClient.createKnowledgeSpace(name, mixedUrls);
            } catch {
              // Ignore errors
            }

            // Get the request body
            const [, options] = mockFetch.mock.calls[0];
            const body = JSON.parse(options?.body as string);

            // Verify only valid URLs are in sourceUrls
            expect(body.sourceUrls).toHaveLength(validUrls.length);
            validUrls.forEach(url => {
              expect(body.sourceUrls).toContain(url);
            });
            invalidUrls.forEach(url => {
              expect(body.sourceUrls).not.toContain(url);
            });
          }
        ),
        { numRuns: 50 }
      );
    });

    it('Property: Empty name throws error before making request', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(fc.webUrl(), { minLength: 1, maxLength: 5 }),
          fc.uuid(),
          async (urls, token) => {
            // Clear mocks
            mockFetch.mockClear();

            const apiClient = new ApiClient({ 
              jwtToken: token,
              baseUrl: 'http://test-api.example.com'
            });

            // Test with empty name
            await expect(apiClient.createKnowledgeSpace('', urls)).rejects.toThrow();

            // Verify no request was made
            expect(mockFetch).not.toHaveBeenCalled();
          }
        ),
        { numRuns: 50 }
      );
    });

    it('Property: Whitespace-only name throws error before making request', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.integer({ min: 1, max: 20 }),
          fc.array(fc.webUrl(), { minLength: 1, maxLength: 5 }),
          fc.uuid(),
          async (numSpaces, urls, token) => {
            // Clear mocks
            mockFetch.mockClear();

            const apiClient = new ApiClient({ 
              jwtToken: token,
              baseUrl: 'http://test-api.example.com'
            });

            // Test with whitespace-only name
            const whitespaceName = ' '.repeat(numSpaces);
            await expect(apiClient.createKnowledgeSpace(whitespaceName, urls)).rejects.toThrow();

            // Verify no request was made
            expect(mockFetch).not.toHaveBeenCalled();
          }
        ),
        { numRuns: 50 }
      );
    });

    it('Property: Empty URLs array throws error before making request', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 1, maxLength: 100 }),
          fc.uuid(),
          async (name, token) => {
            // Pre-condition: name must not be whitespace-only
            fc.pre(name.trim().length > 0);

            // Clear mocks
            mockFetch.mockClear();

            const apiClient = new ApiClient({ 
              jwtToken: token,
              baseUrl: 'http://test-api.example.com'
            });

            // Test with empty URLs array
            await expect(apiClient.createKnowledgeSpace(name, [])).rejects.toThrow();

            // Verify no request was made
            expect(mockFetch).not.toHaveBeenCalled();
          }
        ),
        { numRuns: 50 }
      );
    });

    it('Property: All invalid URLs throws error before making request', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 1, maxLength: 100 }),
          fc.array(fc.string({ minLength: 1, maxLength: 50 }), { minLength: 1, maxLength: 5 }),
          fc.uuid(),
          async (name, invalidUrls, token) => {
            // Pre-condition: name must not be whitespace-only
            fc.pre(name.trim().length > 0);
            // Pre-condition: all URLs should be invalid
            fc.pre(invalidUrls.every(url => {
              try {
                new URL(url);
                return false;
              } catch {
                return true;
              }
            }));

            // Clear mocks
            mockFetch.mockClear();

            const apiClient = new ApiClient({ 
              jwtToken: token,
              baseUrl: 'http://test-api.example.com'
            });

            // Test with all invalid URLs
            await expect(apiClient.createKnowledgeSpace(name, invalidUrls)).rejects.toThrow();

            // Verify no request was made
            expect(mockFetch).not.toHaveBeenCalled();
          }
        ),
        { numRuns: 50 }
      );
    });
  });

  describe('URL Handling', () => {
    it('Property: URLs order is preserved in sourceUrls array', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 1, maxLength: 100 }),
          fc.array(fc.webUrl(), { minLength: 2, maxLength: 10 }),
          fc.uuid(),
          async (name, urls, token) => {
            // Pre-condition: name must not be whitespace-only
            fc.pre(name.trim().length > 0);

            // Clear mocks
            mockFetch.mockClear();

            const apiClient = new ApiClient({ 
              jwtToken: token,
              baseUrl: 'http://test-api.example.com'
            });

            try {
              await apiClient.createKnowledgeSpace(name, urls);
            } catch {
              // Ignore errors
            }

            // Get the request body
            const [, options] = mockFetch.mock.calls[0];
            const body = JSON.parse(options?.body as string);

            // Verify order is preserved
            expect(body.sourceUrls).toEqual(urls);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('Property: Duplicate URLs are preserved (not deduplicated)', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 1, maxLength: 100 }),
          fc.webUrl(),
          fc.integer({ min: 2, max: 5 }),
          fc.uuid(),
          async (name, url, duplicateCount, token) => {
            // Pre-condition: name must not be whitespace-only
            fc.pre(name.trim().length > 0);

            // Create array with duplicates
            const urls = Array(duplicateCount).fill(url);

            // Clear mocks
            mockFetch.mockClear();

            const apiClient = new ApiClient({ 
              jwtToken: token,
              baseUrl: 'http://test-api.example.com'
            });

            try {
              await apiClient.createKnowledgeSpace(name, urls);
            } catch {
              // Ignore errors
            }

            // Get the request body
            const [, options] = mockFetch.mock.calls[0];
            const body = JSON.parse(options?.body as string);

            // Verify duplicates are preserved
            expect(body.sourceUrls).toHaveLength(duplicateCount);
            expect(body.sourceUrls.every((u: string) => u === url)).toBe(true);
          }
        ),
        { numRuns: 50 }
      );
    });

    it('Property: URLs with special characters are preserved', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 1, maxLength: 100 }),
          fc.array(
            fc.webUrl().map(url => url + '?param=value&special=!@#$%'),
            { minLength: 1, maxLength: 5 }
          ),
          fc.uuid(),
          async (name, urls, token) => {
            // Pre-condition: name must not be whitespace-only
            fc.pre(name.trim().length > 0);

            // Clear mocks
            mockFetch.mockClear();

            const apiClient = new ApiClient({ 
              jwtToken: token,
              baseUrl: 'http://test-api.example.com'
            });

            try {
              await apiClient.createKnowledgeSpace(name, urls);
            } catch {
              // Ignore errors
            }

            // Get the request body
            const [, options] = mockFetch.mock.calls[0];
            const body = JSON.parse(options?.body as string);

            // Verify special characters are preserved
            expect(body.sourceUrls).toEqual(urls);
          }
        ),
        { numRuns: 50 }
      );
    });
  });

  describe('Request Consistency', () => {
    it('Property: Multiple calls with same inputs produce identical requests', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 1, maxLength: 100 }),
          fc.array(fc.webUrl(), { minLength: 1, maxLength: 5 }),
          fc.uuid(),
          fc.integer({ min: 2, max: 5 }),
          async (name, urls, token, numCalls) => {
            // Pre-condition: name must not be whitespace-only
            fc.pre(name.trim().length > 0);

            // Clear mocks
            mockFetch.mockClear();

            const apiClient = new ApiClient({ 
              jwtToken: token,
              baseUrl: 'http://test-api.example.com'
            });

            // Make multiple calls
            for (let i = 0; i < numCalls; i++) {
              try {
                await apiClient.createKnowledgeSpace(name, urls);
              } catch {
                // Ignore errors
              }
            }

            // Get all request bodies
            const bodies = mockFetch.mock.calls.map(call => {
              const [, options] = call;
              return JSON.parse(options?.body as string);
            });

            // Verify all requests are identical
            for (let i = 1; i < bodies.length; i++) {
              expect(bodies[i]).toEqual(bodies[0]);
            }
          }
        ),
        { numRuns: 50 }
      );
    });

    it('Property: Name in request exactly matches trimmed input', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 1, maxLength: 100 }),
          fc.array(fc.webUrl(), { minLength: 1, maxLength: 5 }),
          fc.uuid(),
          async (name, urls, token) => {
            // Pre-condition: name must not be whitespace-only
            fc.pre(name.trim().length > 0);

            // Clear mocks
            mockFetch.mockClear();

            const apiClient = new ApiClient({ 
              jwtToken: token,
              baseUrl: 'http://test-api.example.com'
            });

            try {
              await apiClient.createKnowledgeSpace(name, urls);
            } catch {
              // Ignore errors
            }

            // Get the request body
            const [, options] = mockFetch.mock.calls[0];
            const body = JSON.parse(options?.body as string);

            // Verify exact match with trimmed input
            expect(body.name).toBe(name.trim());
            expect(body.name).toHaveLength(name.trim().length);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Special Characters and Unicode', () => {
    it('Property: Special characters in name are preserved', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 1, maxLength: 100 }).map(s =>
            s + '!@#$%^&*()_+-=[]{}|;:,.<>?'
          ),
          fc.array(fc.webUrl(), { minLength: 1, maxLength: 5 }),
          fc.uuid(),
          async (name, urls, token) => {
            // Pre-condition: name must not be whitespace-only
            fc.pre(name.trim().length > 0);

            // Clear mocks
            mockFetch.mockClear();

            const apiClient = new ApiClient({ 
              jwtToken: token,
              baseUrl: 'http://test-api.example.com'
            });

            try {
              await apiClient.createKnowledgeSpace(name, urls);
            } catch {
              // Ignore errors
            }

            // Get the request body
            const [, options] = mockFetch.mock.calls[0];
            const body = JSON.parse(options?.body as string);

            // Verify special characters are preserved
            expect(body.name).toBe(name.trim());
          }
        ),
        { numRuns: 50 }
      );
    });

    it('Property: Unicode characters in name are preserved', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 1, maxLength: 100 }).map(s =>
            s + '你好世界🌍🚀'
          ),
          fc.array(fc.webUrl(), { minLength: 1, maxLength: 5 }),
          fc.uuid(),
          async (name, urls, token) => {
            // Pre-condition: name must not be whitespace-only
            fc.pre(name.trim().length > 0);

            // Clear mocks
            mockFetch.mockClear();

            const apiClient = new ApiClient({ 
              jwtToken: token,
              baseUrl: 'http://test-api.example.com'
            });

            try {
              await apiClient.createKnowledgeSpace(name, urls);
            } catch {
              // Ignore errors
            }

            // Get the request body
            const [, options] = mockFetch.mock.calls[0];
            const body = JSON.parse(options?.body as string);

            // Verify unicode characters are preserved
            expect(body.name).toBe(name.trim());
          }
        ),
        { numRuns: 50 }
      );
    });
  });
});
