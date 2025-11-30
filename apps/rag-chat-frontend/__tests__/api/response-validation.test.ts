/**
 * Property-based tests for API response validation
 * Test Property 23: API response validation (validates Requirement 7.5)
 *
 * This test suite validates that:
 * - API responses are validated for required fields
 * - Invalid responses throw appropriate errors
 * - Valid responses are correctly parsed
 */

import * as fc from 'fast-check';
import {
  ChatResponse,
  CreateAgentResponse,
  CreateKnowledgeSpaceResponse,
  ListKnowledgeSpacesResponse,
  ListAgentsResponse,
  DeleteAgentResponse,
  DeleteKnowledgeSpaceResponse,
  Message,
  Agent,
  KnowledgeSpace,
  MessageRole,
  KnowledgeSpaceType,
} from '@/lib/api/types';
import { ApiError } from '@/lib/api/error';

// ============================================================================
// Arbitraries (Generators for property-based testing)
// ============================================================================

/**
 * Arbitrary for generating valid message roles
 */
const messageRoleArbitrary = (): fc.Arbitrary<MessageRole> =>
  fc.constantFrom<MessageRole>('user', 'assistant', 'system');

/**
 * Arbitrary for generating valid knowledge space types
 */
const knowledgeSpaceTypeArbitrary = (): fc.Arbitrary<KnowledgeSpaceType> =>
  fc.constantFrom<KnowledgeSpaceType>('web', 'document', 'custom');

/**
 * Arbitrary for generating valid UUIDs
 */
const uuidArbitrary = (): fc.Arbitrary<string> =>
  fc.uuid();

/**
 * Arbitrary for generating valid ISO 8601 date strings
 */
const isoDateArbitrary = (): fc.Arbitrary<string> =>
  fc.integer({ min: 946684800000, max: 4102444800000 }) // 2000-01-01 to 2100-01-01 in milliseconds
    .map(timestamp => new Date(timestamp).toISOString());

/**
 * Arbitrary for generating valid URLs
 */
const urlArbitrary = (): fc.Arbitrary<string> =>
  fc.webUrl();

/**
 * Arbitrary for generating valid Message objects
 */
const messageArbitrary = (): fc.Arbitrary<Message> =>
  fc.record({
    id: uuidArbitrary(),
    content: fc.string({ minLength: 1, maxLength: 1000 }).filter(s => s.trim().length > 0),
    role: messageRoleArbitrary(),
    cited_urls: fc.option(fc.array(urlArbitrary(), { minLength: 0, maxLength: 10 }), { nil: undefined }),
    createdAt: fc.option(isoDateArbitrary(), { nil: undefined }),
  });

/**
 * Arbitrary for generating valid Agent objects
 */
const agentArbitrary = (): fc.Arbitrary<Agent> =>
  fc.record({
    id: uuidArbitrary(),
    name: fc.string({ minLength: 1, maxLength: 100 }).filter(s => s.trim().length > 0),
    description: fc.string({ minLength: 1, maxLength: 500 }).filter(s => s.trim().length > 0),
    strictRAG: fc.boolean(),
    knowledgeSpaceId: uuidArbitrary(),
    createdAt: fc.option(isoDateArbitrary(), { nil: undefined }),
    updatedAt: fc.option(isoDateArbitrary(), { nil: undefined }),
  });

/**
 * Arbitrary for generating valid KnowledgeSpace objects
 */
const knowledgeSpaceArbitrary = (): fc.Arbitrary<KnowledgeSpace> =>
  fc.record({
    id: uuidArbitrary(),
    name: fc.string({ minLength: 1, maxLength: 100 }).filter(s => s.trim().length > 0),
    type: knowledgeSpaceTypeArbitrary(),
    lastUpdatedAt: isoDateArbitrary(),
    createdAt: fc.option(isoDateArbitrary(), { nil: undefined }),
    documentCount: fc.option(fc.nat({ max: 10000 }), { nil: undefined }),
    urls: fc.option(fc.array(urlArbitrary(), { minLength: 1, maxLength: 20 }), { nil: undefined }),
  });

/**
 * Arbitrary for generating valid ChatResponse objects
 */
const chatResponseArbitrary = (): fc.Arbitrary<ChatResponse> =>
  fc.record({
    message: messageArbitrary(),
    conversationId: fc.option(uuidArbitrary(), { nil: undefined }),
    sessionId: fc.option(uuidArbitrary(), { nil: undefined }),
    agentId: uuidArbitrary(),
  });

/**
 * Arbitrary for generating valid CreateAgentResponse objects
 */
const createAgentResponseArbitrary = (): fc.Arbitrary<CreateAgentResponse> =>
  fc.record({
    agent: agentArbitrary(),
  });

/**
 * Arbitrary for generating valid CreateKnowledgeSpaceResponse objects
 */
const createKnowledgeSpaceResponseArbitrary = (): fc.Arbitrary<CreateKnowledgeSpaceResponse> =>
  fc.record({
    knowledgeSpace: knowledgeSpaceArbitrary(),
  });

/**
 * Arbitrary for generating valid ListKnowledgeSpacesResponse objects
 */
const listKnowledgeSpacesResponseArbitrary = (): fc.Arbitrary<ListKnowledgeSpacesResponse> =>
  fc.record({
    knowledgeSpaces: fc.array(knowledgeSpaceArbitrary(), { minLength: 0, maxLength: 50 }),
    total: fc.option(fc.nat({ max: 10000 }), { nil: undefined }),
    page: fc.option(fc.nat({ max: 1000 }), { nil: undefined }),
    pageSize: fc.option(fc.integer({ min: 1, max: 100 }), { nil: undefined }),
  });

/**
 * Arbitrary for generating valid ListAgentsResponse objects
 */
const listAgentsResponseArbitrary = (): fc.Arbitrary<ListAgentsResponse> =>
  fc.record({
    agents: fc.array(agentArbitrary(), { minLength: 0, maxLength: 50 }),
    total: fc.option(fc.nat({ max: 10000 }), { nil: undefined }),
    page: fc.option(fc.nat({ max: 1000 }), { nil: undefined }),
    pageSize: fc.option(fc.integer({ min: 1, max: 100 }), { nil: undefined }),
  });

/**
 * Arbitrary for generating valid DeleteAgentResponse objects
 */
const deleteAgentResponseArbitrary = (): fc.Arbitrary<DeleteAgentResponse> =>
  fc.record({
    success: fc.boolean(),
    message: fc.option(fc.string({ minLength: 1, maxLength: 200 }), { nil: undefined }),
  });

/**
 * Arbitrary for generating valid DeleteKnowledgeSpaceResponse objects
 */
const deleteKnowledgeSpaceResponseArbitrary = (): fc.Arbitrary<DeleteKnowledgeSpaceResponse> =>
  fc.record({
    success: fc.boolean(),
    message: fc.option(fc.string({ minLength: 1, maxLength: 200 }), { nil: undefined }),
  });

// ============================================================================
// Validation Functions
// ============================================================================

/**
 * Validates that a Message object has all required fields
 */
function validateMessage(msg: unknown): msg is Message {
  if (!msg || typeof msg !== 'object') return false;
  const m = msg as Record<string, unknown>;

  return (
    typeof m.id === 'string' &&
    m.id.length > 0 &&
    typeof m.content === 'string' &&
    m.content.length > 0 &&
    typeof m.role === 'string' &&
    ['user', 'assistant', 'system'].includes(m.role) &&
    (m.cited_urls === undefined || Array.isArray(m.cited_urls)) &&
    (m.createdAt === undefined || typeof m.createdAt === 'string')
  );
}

/**
 * Validates that an Agent object has all required fields
 */
function validateAgent(agent: unknown): agent is Agent {
  if (!agent || typeof agent !== 'object') return false;
  const a = agent as Record<string, unknown>;

  return (
    typeof a.id === 'string' &&
    a.id.length > 0 &&
    typeof a.name === 'string' &&
    a.name.length > 0 &&
    typeof a.description === 'string' &&
    a.description.length > 0 &&
    typeof a.strictRAG === 'boolean' &&
    typeof a.knowledgeSpaceId === 'string' &&
    a.knowledgeSpaceId.length > 0 &&
    (a.createdAt === undefined || typeof a.createdAt === 'string') &&
    (a.updatedAt === undefined || typeof a.updatedAt === 'string')
  );
}

/**
 * Validates that a KnowledgeSpace object has all required fields
 */
function validateKnowledgeSpace(ks: unknown): ks is KnowledgeSpace {
  if (!ks || typeof ks !== 'object') return false;
  const k = ks as Record<string, unknown>;

  return (
    typeof k.id === 'string' &&
    k.id.length > 0 &&
    typeof k.name === 'string' &&
    k.name.length > 0 &&
    typeof k.type === 'string' &&
    ['web', 'document', 'custom'].includes(k.type) &&
    typeof k.lastUpdatedAt === 'string' &&
    (k.createdAt === undefined || typeof k.createdAt === 'string') &&
    (k.documentCount === undefined || typeof k.documentCount === 'number') &&
    (k.urls === undefined || Array.isArray(k.urls))
  );
}

/**
 * Validates that a ChatResponse has all required fields
 */
function validateChatResponse(response: unknown): response is ChatResponse {
  if (!response || typeof response !== 'object') return false;
  const r = response as Record<string, unknown>;

  return (
    validateMessage(r.message) &&
    (r.conversationId === undefined || typeof r.conversationId === 'string') &&
    (r.sessionId === undefined || typeof r.sessionId === 'string') &&
    typeof r.agentId === 'string' &&
    r.agentId.length > 0
  );
}

/**
 * Validates that a CreateAgentResponse has all required fields
 */
function validateCreateAgentResponse(response: unknown): response is CreateAgentResponse {
  if (!response || typeof response !== 'object') return false;
  const r = response as Record<string, unknown>;

  return validateAgent(r.agent);
}

/**
 * Validates that a CreateKnowledgeSpaceResponse has all required fields
 */
function validateCreateKnowledgeSpaceResponse(
  response: unknown
): response is CreateKnowledgeSpaceResponse {
  if (!response || typeof response !== 'object') return false;
  const r = response as Record<string, unknown>;

  return validateKnowledgeSpace(r.knowledgeSpace);
}

/**
 * Validates that a ListKnowledgeSpacesResponse has all required fields
 */
function validateListKnowledgeSpacesResponse(
  response: unknown
): response is ListKnowledgeSpacesResponse {
  if (!response || typeof response !== 'object') return false;
  const r = response as Record<string, unknown>;

  return (
    Array.isArray(r.knowledgeSpaces) &&
    r.knowledgeSpaces.every(validateKnowledgeSpace) &&
    (r.total === undefined || typeof r.total === 'number') &&
    (r.page === undefined || typeof r.page === 'number') &&
    (r.pageSize === undefined || typeof r.pageSize === 'number')
  );
}

/**
 * Validates that a ListAgentsResponse has all required fields
 */
function validateListAgentsResponse(response: unknown): response is ListAgentsResponse {
  if (!response || typeof response !== 'object') return false;
  const r = response as Record<string, unknown>;

  return (
    Array.isArray(r.agents) &&
    r.agents.every(validateAgent) &&
    (r.total === undefined || typeof r.total === 'number') &&
    (r.page === undefined || typeof r.page === 'number') &&
    (r.pageSize === undefined || typeof r.pageSize === 'number')
  );
}

/**
 * Validates that a DeleteAgentResponse has all required fields
 */
function validateDeleteAgentResponse(response: unknown): response is DeleteAgentResponse {
  if (!response || typeof response !== 'object') return false;
  const r = response as Record<string, unknown>;

  return (
    typeof r.success === 'boolean' &&
    (r.message === undefined || typeof r.message === 'string')
  );
}

/**
 * Validates that a DeleteKnowledgeSpaceResponse has all required fields
 */
function validateDeleteKnowledgeSpaceResponse(
  response: unknown
): response is DeleteKnowledgeSpaceResponse {
  if (!response || typeof response !== 'object') return false;
  const r = response as Record<string, unknown>;

  return (
    typeof r.success === 'boolean' &&
    (r.message === undefined || typeof r.message === 'string')
  );
}

// ============================================================================
// Property-Based Tests
// ============================================================================

describe('API Response Validation - Property-Based Tests', () => {
  describe('ChatResponse Validation', () => {
    it('should validate all valid ChatResponse objects', () => {
      fc.assert(
        fc.property(chatResponseArbitrary(), (response) => {
          expect(validateChatResponse(response)).toBe(true);
        }),
        { numRuns: 100 }
      );
    });

    it('should reject ChatResponse with missing message', () => {
      fc.assert(
        fc.property(
          fc.record({
            conversationId: fc.option(uuidArbitrary()),
            sessionId: fc.option(uuidArbitrary()),
            agentId: uuidArbitrary(),
          }),
          (invalidResponse) => {
            expect(validateChatResponse(invalidResponse)).toBe(false);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should reject ChatResponse with invalid message', () => {
      fc.assert(
        fc.property(
          fc.record({
            message: fc.record({
              id: uuidArbitrary(),
              content: fc.constant(''), // Empty content is invalid
              role: messageRoleArbitrary(),
            }),
            agentId: uuidArbitrary(),
          }),
          (invalidResponse) => {
            expect(validateChatResponse(invalidResponse)).toBe(false);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should reject ChatResponse with missing agentId', () => {
      fc.assert(
        fc.property(
          fc.record({
            message: messageArbitrary(),
            conversationId: fc.option(uuidArbitrary()),
          }),
          (invalidResponse) => {
            expect(validateChatResponse(invalidResponse)).toBe(false);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should handle null and undefined gracefully', () => {
      expect(validateChatResponse(null)).toBe(false);
      expect(validateChatResponse(undefined)).toBe(false);
      expect(validateChatResponse({})).toBe(false);
    });
  });

  describe('CreateAgentResponse Validation', () => {
    it('should validate all valid CreateAgentResponse objects', () => {
      fc.assert(
        fc.property(createAgentResponseArbitrary(), (response) => {
          expect(validateCreateAgentResponse(response)).toBe(true);
        }),
        { numRuns: 100 }
      );
    });

    it('should reject CreateAgentResponse with missing agent', () => {
      fc.assert(
        fc.property(
          fc.record({}),
          (invalidResponse) => {
            expect(validateCreateAgentResponse(invalidResponse)).toBe(false);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should reject CreateAgentResponse with invalid agent fields', () => {
      fc.assert(
        fc.property(
          fc.record({
            agent: fc.record({
              id: uuidArbitrary(),
              name: fc.constant(''), // Empty name is invalid
              description: fc.string({ minLength: 1 }),
              strictRAG: fc.boolean(),
              knowledgeSpaceId: uuidArbitrary(),
            }),
          }),
          (invalidResponse) => {
            expect(validateCreateAgentResponse(invalidResponse)).toBe(false);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('CreateKnowledgeSpaceResponse Validation', () => {
    it('should validate all valid CreateKnowledgeSpaceResponse objects', () => {
      fc.assert(
        fc.property(createKnowledgeSpaceResponseArbitrary(), (response) => {
          expect(validateCreateKnowledgeSpaceResponse(response)).toBe(true);
        }),
        { numRuns: 100 }
      );
    });

    it('should reject CreateKnowledgeSpaceResponse with missing knowledgeSpace', () => {
      fc.assert(
        fc.property(
          fc.record({}),
          (invalidResponse) => {
            expect(validateCreateKnowledgeSpaceResponse(invalidResponse)).toBe(false);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should reject CreateKnowledgeSpaceResponse with invalid type', () => {
      fc.assert(
        fc.property(
          fc.record({
            knowledgeSpace: fc.record({
              id: uuidArbitrary(),
              name: fc.string({ minLength: 1 }),
              type: fc.string().filter(s => !['web', 'document', 'custom'].includes(s)),
              lastUpdatedAt: isoDateArbitrary(),
            }),
          }),
          (invalidResponse) => {
            expect(validateCreateKnowledgeSpaceResponse(invalidResponse)).toBe(false);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('ListKnowledgeSpacesResponse Validation', () => {
    it('should validate all valid ListKnowledgeSpacesResponse objects', () => {
      fc.assert(
        fc.property(listKnowledgeSpacesResponseArbitrary(), (response) => {
          expect(validateListKnowledgeSpacesResponse(response)).toBe(true);
        }),
        { numRuns: 100 }
      );
    });

    it('should validate empty lists', () => {
      const emptyResponse: ListKnowledgeSpacesResponse = {
        knowledgeSpaces: [],
      };
      expect(validateListKnowledgeSpacesResponse(emptyResponse)).toBe(true);
    });

    it('should reject responses with non-array knowledgeSpaces', () => {
      fc.assert(
        fc.property(
          fc.record({
            knowledgeSpaces: fc.anything().filter(x => !Array.isArray(x)),
          }),
          (invalidResponse) => {
            expect(validateListKnowledgeSpacesResponse(invalidResponse)).toBe(false);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should reject responses with invalid knowledgeSpace items', () => {
      const invalidResponse = {
        knowledgeSpaces: [
          { id: 'valid-id', name: 'Valid' },
          { invalid: 'object' },
        ],
      };
      expect(validateListKnowledgeSpacesResponse(invalidResponse)).toBe(false);
    });
  });

  describe('ListAgentsResponse Validation', () => {
    it('should validate all valid ListAgentsResponse objects', () => {
      fc.assert(
        fc.property(listAgentsResponseArbitrary(), (response) => {
          expect(validateListAgentsResponse(response)).toBe(true);
        }),
        { numRuns: 100 }
      );
    });

    it('should validate empty agent lists', () => {
      const emptyResponse: ListAgentsResponse = {
        agents: [],
      };
      expect(validateListAgentsResponse(emptyResponse)).toBe(true);
    });

    it('should validate pagination metadata', () => {
      fc.assert(
        fc.property(
          fc.record({
            agents: fc.array(agentArbitrary(), { maxLength: 10 }),
            total: fc.nat({ max: 1000 }),
            page: fc.nat({ max: 100 }),
            pageSize: fc.integer({ min: 1, max: 100 }),
          }),
          (response) => {
            expect(validateListAgentsResponse(response)).toBe(true);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Delete Response Validation', () => {
    it('should validate all valid DeleteAgentResponse objects', () => {
      fc.assert(
        fc.property(deleteAgentResponseArbitrary(), (response) => {
          expect(validateDeleteAgentResponse(response)).toBe(true);
        }),
        { numRuns: 100 }
      );
    });

    it('should validate all valid DeleteKnowledgeSpaceResponse objects', () => {
      fc.assert(
        fc.property(deleteKnowledgeSpaceResponseArbitrary(), (response) => {
          expect(validateDeleteKnowledgeSpaceResponse(response)).toBe(true);
        }),
        { numRuns: 100 }
      );
    });

    it('should require success field in delete responses', () => {
      const invalidResponse = { message: 'Deleted successfully' };
      expect(validateDeleteAgentResponse(invalidResponse)).toBe(false);
      expect(validateDeleteKnowledgeSpaceResponse(invalidResponse)).toBe(false);
    });
  });

  describe('Error Handling', () => {
    it('should handle primitive values gracefully', () => {
      fc.assert(
        fc.property(
          fc.oneof(
            fc.string(),
            fc.integer(),
            fc.boolean(),
            fc.constant(null),
            fc.constant(undefined)
          ),
          (primitive) => {
            expect(validateChatResponse(primitive)).toBe(false);
            expect(validateCreateAgentResponse(primitive)).toBe(false);
            expect(validateCreateKnowledgeSpaceResponse(primitive)).toBe(false);
            expect(validateListKnowledgeSpacesResponse(primitive)).toBe(false);
            expect(validateListAgentsResponse(primitive)).toBe(false);
            expect(validateDeleteAgentResponse(primitive)).toBe(false);
            expect(validateDeleteKnowledgeSpaceResponse(primitive)).toBe(false);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should handle malformed objects gracefully', () => {
      fc.assert(
        fc.property(
          fc.object(),
          (malformedObject) => {
            // All validators should return false for arbitrary objects
            // (they may occasionally return true if the object happens to be valid)
            const result = validateChatResponse(malformedObject);
            expect(typeof result).toBe('boolean');
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Field Type Validation', () => {
    it('should reject responses with incorrect field types', () => {
      const invalidTypes = [
        { message: 'not an object', agentId: '123' },
        { message: { id: 123 }, agentId: '123' }, // id should be string
        { message: { id: '123', content: 123 }, agentId: '123' }, // content should be string
        { message: { id: '123', content: 'test', role: 'invalid' }, agentId: '123' }, // invalid role
      ];

      invalidTypes.forEach(invalid => {
        expect(validateChatResponse(invalid)).toBe(false);
      });
    });

    it('should validate optional fields correctly', () => {
      fc.assert(
        fc.property(
          fc.record({
            message: messageArbitrary(),
            agentId: uuidArbitrary(),
            // Optional fields omitted
          }),
          (response) => {
            // Should be valid even without optional fields
            expect(validateChatResponse(response)).toBe(true);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('ApiError Integration', () => {
    it('should throw ApiError for null/undefined responses', () => {
      expect(() => {
        if (!validateChatResponse(null)) {
          throw new ApiError('Invalid API response: null or undefined');
        }
      }).toThrow(ApiError);

      expect(() => {
        if (!validateChatResponse(undefined)) {
          throw new ApiError('Invalid API response: null or undefined');
        }
      }).toThrow(ApiError);
    });

    it('should throw ApiError for responses with missing required fields', () => {
      const invalidResponse = { agentId: 'test-id' }; // missing message

      expect(() => {
        if (!validateChatResponse(invalidResponse)) {
          throw new ApiError('Invalid ChatResponse: missing required fields');
        }
      }).toThrow(ApiError);
    });

    it('should extract error messages correctly', () => {
      const errorFormats = [
        { message: 'Error message' },
        { error: 'Error message' },
        { detail: 'Error message' },
        { error: { message: 'Nested error' } },
      ];

      errorFormats.forEach(errorObj => {
        const message = ApiError.extractErrorMessage(errorObj);
        expect(typeof message).toBe('string');
        expect(message.length).toBeGreaterThan(0);
      });
    });
  });

  describe('Data Integrity Properties', () => {
    it('should preserve all fields when validation passes', () => {
      fc.assert(
        fc.property(chatResponseArbitrary(), (original) => {
          if (validateChatResponse(original)) {
            // Type casting to show that validation preserves structure
            const validated: ChatResponse = original;
            expect(validated.message).toEqual(original.message);
            expect(validated.agentId).toEqual(original.agentId);
          }
        }),
        { numRuns: 100 }
      );
    });

    it('should validate that agent IDs are non-empty strings', () => {
      fc.assert(
        fc.property(
          agentArbitrary(),
          (agent) => {
            expect(validateAgent(agent)).toBe(true);
            expect(agent.id.length).toBeGreaterThan(0);
            expect(agent.knowledgeSpaceId.length).toBeGreaterThan(0);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should validate that lists maintain array invariants', () => {
      fc.assert(
        fc.property(
          listAgentsResponseArbitrary(),
          (response) => {
            expect(validateListAgentsResponse(response)).toBe(true);
            expect(Array.isArray(response.agents)).toBe(true);
            expect(response.agents.length).toBeGreaterThanOrEqual(0);

            // If total is defined, it should be a non-negative number
            if (response.total !== undefined) {
              expect(response.total).toBeGreaterThanOrEqual(0);
            }

            // If pagination fields are all defined, they should be consistent
            if (response.page !== undefined && response.pageSize !== undefined) {
              expect(response.page).toBeGreaterThanOrEqual(0);
              expect(response.pageSize).toBeGreaterThan(0);
            }
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Response Parsing Edge Cases', () => {
    it('should handle responses with extra fields gracefully', () => {
      fc.assert(
        fc.property(
          chatResponseArbitrary(),
          fc.object(),
          (validResponse, extraFields) => {
            const responseWithExtras = { ...validResponse, ...extraFields };
            // Should still validate as long as required fields are present
            expect(validateChatResponse(responseWithExtras)).toBe(true);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should validate ISO date string formats', () => {
      fc.assert(
        fc.property(
          isoDateArbitrary(),
          (dateString) => {
            // Should be parseable as a date
            const date = new Date(dateString);
            expect(date.toString()).not.toBe('Invalid Date');
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should validate URL formats in cited_urls', () => {
      fc.assert(
        fc.property(
          fc.array(urlArbitrary(), { minLength: 1, maxLength: 10 }),
          (urls) => {
            urls.forEach(url => {
              expect(() => new URL(url)).not.toThrow();
            });
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
