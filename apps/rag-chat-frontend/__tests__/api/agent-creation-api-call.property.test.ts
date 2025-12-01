/**
 * Property-based test for agent creation API call
 * Feature: web-mvp, Property 10: Agent creation API call
 * Validates: Requirements 3.2
 *
 * This test verifies that for any agent creation, the system sends a POST request
 * to /v1/agent/create with the correct format including name, knowledgeSpaceIds array,
 * and optional description and strictRAG flag.
 */

import * as fc from 'fast-check';
import { ApiClient } from '@/lib/api/client';
import { ApiError } from '@/lib/api/error';

// Mock fetch globally
const mockFetch = jest.fn();
global.fetch = mockFetch;

describe('Agent Creation API Call Property Test', () => {
  let apiClient: ApiClient;

  beforeEach(() => {
    mockFetch.mockReset();
    
    // Mock AbortSignal.timeout if not available (Jest environment)
    if (!AbortSignal.timeout) {
      (AbortSignal as any).timeout = () => {
        const controller = new AbortController();
        return controller.signal;
      };
    }
    
    apiClient = new ApiClient({
      baseUrl: 'https://test-api.example.com',
      jwtToken: 'test-jwt-token',
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  /**
   * Feature: web-mvp, Property 10: Agent creation API call
   *
   * For any agent creation, the system should send a POST request to /v1/agent/create
   * with a name, knowledgeSpaceIds array, and optional description and strictRAG flag.
   */
  it('Property 10: sends correct POST request format for agent creation', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 1, maxLength: 100 }).filter(s => s.trim().length > 0), // name
        fc.uuid(), // knowledgeSpaceId
        fc.option(fc.string({ minLength: 0, maxLength: 500 }), { nil: undefined }), // optional description
        fc.boolean(), // strictRAG
        async (name, knowledgeSpaceId, description, strictRAG) => {
          // Clear mock for each property run
          mockFetch.mockClear();
          
          // Setup mock response
          const mockAgentId = `agent-${Date.now()}`;
          mockFetch.mockResolvedValueOnce({
            ok: true,
            status: 200,
            headers: new Headers({ 'content-type': 'application/json' }),
            json: async () => ({
              agentId: mockAgentId,
              status: 'created',
            }),
          } as Response);

          // Call the API client
          await apiClient.createAgent(
            knowledgeSpaceId,
            name,
            description || '',
            strictRAG
          );

          // Verify fetch was called
          expect(mockFetch).toHaveBeenCalledTimes(1);

          // Get the actual call arguments
          const [url, options] = mockFetch.mock.calls[0];

          // Verify URL
          expect(url).toBe('https://test-api.example.com/v1/agent/create');

          // Verify HTTP method
          expect(options.method).toBe('POST');

          // Verify headers include Authorization
          expect(options.headers['Authorization']).toBe('Bearer test-jwt-token');
          expect(options.headers['Content-Type']).toBe('application/json');

          // Verify request body structure
          const requestBody = JSON.parse(options.body);
          expect(requestBody).toHaveProperty('name');
          expect(requestBody).toHaveProperty('knowledgeSpaceIds');
          expect(requestBody).toHaveProperty('strictRAG');

          // Verify name is trimmed
          expect(requestBody.name).toBe(name.trim());

          // Verify knowledgeSpaceIds is an array containing the provided ID
          expect(Array.isArray(requestBody.knowledgeSpaceIds)).toBe(true);
          expect(requestBody.knowledgeSpaceIds).toContain(knowledgeSpaceId);
          expect(requestBody.knowledgeSpaceIds.length).toBe(1);

          // Verify strictRAG flag
          expect(requestBody.strictRAG).toBe(strictRAG);

          // Verify description handling
          if (description && description.trim().length > 0) {
            expect(requestBody.description).toBe(description.trim());
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Additional property: Validates that required fields are enforced
   */
  it('Property 10a: rejects agent creation with missing required fields', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.constantFrom('', '   ', '\t\n'), // invalid names (empty or whitespace)
        fc.uuid(), // valid knowledgeSpaceId
        async (invalidName, knowledgeSpaceId) => {
          // Clear mock for each property run
          mockFetch.mockClear();
          
          // Should throw ApiError for invalid name
          await expect(
            apiClient.createAgent(knowledgeSpaceId, invalidName, '', true)
          ).rejects.toThrow(ApiError);

          // Verify fetch was NOT called
          expect(mockFetch).not.toHaveBeenCalled();
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Additional property: Validates that knowledgeSpaceId is required
   */
  it('Property 10b: rejects agent creation with missing knowledgeSpaceId', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 1, maxLength: 100 }).filter(s => s.trim().length > 0), // valid name
        fc.constantFrom('', '   ', '\t\n'), // invalid knowledgeSpaceId
        async (name, invalidKsId) => {
          // Clear mock for each property run
          mockFetch.mockClear();
          
          // Should throw ApiError for invalid knowledgeSpaceId
          await expect(
            apiClient.createAgent(invalidKsId, name, '', true)
          ).rejects.toThrow(ApiError);

          // Verify fetch was NOT called
          expect(mockFetch).not.toHaveBeenCalled();
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Additional property: Validates response transformation
   */
  it('Property 10c: correctly transforms backend response to frontend format', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 1, maxLength: 100 }).filter(s => s.trim().length > 0), // name
        fc.uuid(), // knowledgeSpaceId
        fc.option(fc.string({ minLength: 1, maxLength: 500 }), { nil: undefined }), // description
        fc.boolean(), // strictRAG
        fc.uuid(), // agentId from backend
        async (name, knowledgeSpaceId, description, strictRAG, backendAgentId) => {
          // Clear mock for each property run
          mockFetch.mockClear();
          
          // Setup mock response with backend format
          mockFetch.mockResolvedValueOnce({
            ok: true,
            status: 200,
            headers: new Headers({ 'content-type': 'application/json' }),
            json: async () => ({
              agentId: backendAgentId,
              status: 'created',
            }),
          } as Response);

          // Call the API client
          const response = await apiClient.createAgent(
            knowledgeSpaceId,
            name,
            description || '',
            strictRAG
          );

          // Verify response structure matches frontend format
          expect(response).toHaveProperty('agent');
          expect(response).toHaveProperty('status');

          // Verify agent object structure
          expect(response.agent.id).toBe(backendAgentId);
          expect(response.agent.name).toBe(name.trim());
          expect(response.agent.knowledgeSpaceId).toBe(knowledgeSpaceId);
          expect(response.agent.strictRAG).toBe(strictRAG);

          if (description && description.trim().length > 0) {
            expect(response.agent.description).toBe(description.trim());
          } else {
            expect(response.agent.description).toBe('');
          }

          // Verify status
          expect(response.status).toBe('created');
        }
      ),
      { numRuns: 100 }
    );
  });
});
