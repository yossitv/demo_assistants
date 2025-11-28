/**
 * @jest-environment jsdom
 *
 * Property-based tests for AgentContext localStorage initialization
 * Test Property 20: Local storage initialization (validates Requirement 6.5)
 *
 * Requirement 6.5: WHEN the application loads THEN the System SHALL restore agent state from localStorage
 *
 * Feature: web-mvp, Property 20: Local storage initialization
 */

import React from 'react';
import * as fc from 'fast-check';
import { renderHook, waitFor } from '@testing-library/react';
import { AgentProvider, useAgent } from '../../lib/context/KnowledgeContext';

// Mock the API client
jest.mock('../../lib/api/client', () => ({
  apiClient: {
    listKnowledgeSpaces: jest.fn(),
    createKnowledgeSpace: jest.fn(),
    createAgent: jest.fn(),
  },
}));

// Constants for storage keys (must match KnowledgeContext.tsx)
const AGENTS_STORAGE_KEY = 'assistants_agents';
const SELECTED_AGENT_KEY = 'assistants_selected_agent';

/**
 * Mock localStorage for testing
 */
class MockLocalStorage {
  private store: Record<string, string> = {};
  private shouldThrow = false;

  getItem(key: string): string | null {
    if (this.shouldThrow) {
      throw new Error('localStorage is disabled');
    }
    return this.store[key] || null;
  }

  setItem(key: string, value: string): void {
    if (this.shouldThrow) {
      throw new Error('localStorage is disabled');
    }
    this.store[key] = value;
  }

  removeItem(key: string): void {
    if (this.shouldThrow) {
      throw new Error('localStorage is disabled');
    }
    delete this.store[key];
  }

  clear(): void {
    this.store = {};
  }

  setShouldThrow(shouldThrow: boolean): void {
    this.shouldThrow = shouldThrow;
  }
}

// Create arbitraries for property-based testing
// Use a constrained date range to avoid invalid dates
const validDateArbitrary = fc.integer({ min: 0, max: Date.now() }).map(timestamp => new Date(timestamp));

const agentArbitrary = fc.record({
  id: fc.uuid(),
  name: fc.string({ minLength: 1, maxLength: 100 }),
  description: fc.string({ minLength: 0, maxLength: 500 }),
  strictRAG: fc.boolean(),
  knowledgeSpaceId: fc.uuid(),
  createdAt: validDateArbitrary.map(d => d.toISOString()),
});

const agentsArrayArbitrary = fc.array(agentArbitrary, { minLength: 0, maxLength: 20 });

describe('Property 20: LocalStorage Initialization', () => {
  let mockLocalStorage: MockLocalStorage;

  beforeEach(() => {
    jest.clearAllMocks();
    mockLocalStorage = new MockLocalStorage();

    // Replace global localStorage with mock
    Object.defineProperty(window, 'localStorage', {
      value: mockLocalStorage,
      writable: true,
    });
  });

  afterEach(() => {
    mockLocalStorage.clear();
  });

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <AgentProvider>{children}</AgentProvider>
  );

  describe('Empty LocalStorage Initialization', () => {
    it('Property: Empty localStorage results in empty agents array', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.constant(null), // No stored data
          async () => {
            // Ensure localStorage is empty
            mockLocalStorage.clear();

            const { result } = renderHook(() => useAgent(), { wrapper });

            // Wait for initialization effect to complete
            await waitFor(() => {
              expect(result.current.agents).toEqual([]);
              expect(result.current.selectedAgent).toBeNull();
            });
          }
        ),
        { numRuns: 10 }
      );
    });

    it('Property: Empty localStorage with null selectedAgentId results in no selected agent', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.constant(null),
          async () => {
            mockLocalStorage.clear();
            mockLocalStorage.setItem(AGENTS_STORAGE_KEY, JSON.stringify([]));
            mockLocalStorage.setItem(SELECTED_AGENT_KEY, '');

            const { result } = renderHook(() => useAgent(), { wrapper });

            await waitFor(() => {
              expect(result.current.selectedAgent).toBeNull();
            });
          }
        ),
        { numRuns: 10 }
      );
    });
  });

  describe('Valid Data Initialization', () => {
    it('Property: Valid agents in localStorage are loaded correctly', async () => {
      await fc.assert(
        fc.asyncProperty(
          agentsArrayArbitrary,
          async (agents) => {
            // Pre-condition: ensure we have valid agent data
            fc.pre(agents.length >= 0);

            mockLocalStorage.clear();
            mockLocalStorage.setItem(AGENTS_STORAGE_KEY, JSON.stringify(agents));

            const { result } = renderHook(() => useAgent(), { wrapper });

            await waitFor(() => {
              expect(result.current.agents).toHaveLength(agents.length);

              // Verify each agent is loaded with correct data
              result.current.agents.forEach((loadedAgent, index) => {
                expect(loadedAgent.id).toBe(agents[index].id);
                expect(loadedAgent.name).toBe(agents[index].name);
                expect(loadedAgent.description).toBe(agents[index].description);
                expect(loadedAgent.strictRAG).toBe(agents[index].strictRAG);
                expect(loadedAgent.knowledgeSpaceId).toBe(agents[index].knowledgeSpaceId);
                // createdAt is converted to Date object
                expect(loadedAgent.createdAt).toBeInstanceOf(Date);
              });
            });
          }
        ),
        { numRuns: 50 }
      );
    });

    it('Property: Multiple agents in localStorage are all loaded', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(agentArbitrary, { minLength: 1, maxLength: 10 }),
          async (agents) => {
            mockLocalStorage.clear();
            mockLocalStorage.setItem(AGENTS_STORAGE_KEY, JSON.stringify(agents));

            const { result } = renderHook(() => useAgent(), { wrapper });

            await waitFor(() => {
              expect(result.current.agents).toHaveLength(agents.length);

              // Verify all agent IDs are present
              const loadedIds = result.current.agents.map(a => a.id);
              const originalIds = agents.map(a => a.id);
              expect(loadedIds.sort()).toEqual(originalIds.sort());
            });
          }
        ),
        { numRuns: 50 }
      );
    });

    it('Property: Selected agent ID matching an agent in list loads selectedAgent', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(agentArbitrary, { minLength: 1, maxLength: 10 }),
          fc.nat(),
          async (agents, indexSeed) => {
            // Pre-condition: we have at least one agent
            fc.pre(agents.length > 0);

            const selectedIndex = indexSeed % agents.length;
            const selectedAgentId = agents[selectedIndex].id;

            mockLocalStorage.clear();
            mockLocalStorage.setItem(AGENTS_STORAGE_KEY, JSON.stringify(agents));
            mockLocalStorage.setItem(SELECTED_AGENT_KEY, selectedAgentId);

            const { result } = renderHook(() => useAgent(), { wrapper });

            await waitFor(() => {
              expect(result.current.selectedAgent).not.toBeNull();
              expect(result.current.selectedAgent?.id).toBe(selectedAgentId);
              expect(result.current.selectedAgent?.name).toBe(agents[selectedIndex].name);
            });
          }
        ),
        { numRuns: 50 }
      );
    });

    it('Property: Selected agent ID not in agents list results in null selectedAgent', async () => {
      await fc.assert(
        fc.asyncProperty(
          agentsArrayArbitrary,
          fc.uuid(), // Random agent ID not in the list
          async (agents, nonExistentId) => {
            // Pre-condition: the ID doesn't exist in agents
            fc.pre(!agents.some(a => a.id === nonExistentId));

            mockLocalStorage.clear();
            mockLocalStorage.setItem(AGENTS_STORAGE_KEY, JSON.stringify(agents));
            mockLocalStorage.setItem(SELECTED_AGENT_KEY, nonExistentId);

            const { result } = renderHook(() => useAgent(), { wrapper });

            await waitFor(() => {
              expect(result.current.selectedAgent).toBeNull();
            });
          }
        ),
        { numRuns: 50 }
      );
    });
  });

  describe('Invalid/Corrupted Data Handling', () => {
    it('Property: localStorage.getItem returns null is handled gracefully', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.constant(null),
          async () => {
            mockLocalStorage.clear();
            // Explicitly ensure no data is stored
            expect(mockLocalStorage.getItem(AGENTS_STORAGE_KEY)).toBeNull();

            const { result } = renderHook(() => useAgent(), { wrapper });

            await waitFor(() => {
              // Should not crash, should return empty array
              expect(result.current.agents).toEqual([]);
              expect(result.current.selectedAgent).toBeNull();
              expect(result.current.error).toBeNull();
            });
          }
        ),
        { numRuns: 10 }
      );
    });

    it('Property: localStorage.getItem throws error is handled gracefully', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.constant(null),
          async () => {
            mockLocalStorage.setShouldThrow(true);

            // Suppress console.error for this test
            const consoleError = jest.spyOn(console, 'error').mockImplementation();

            const { result } = renderHook(() => useAgent(), { wrapper });

            await waitFor(() => {
              // Should not crash, should return empty array
              expect(result.current.agents).toEqual([]);
              expect(result.current.selectedAgent).toBeNull();
            });

            consoleError.mockRestore();
            mockLocalStorage.setShouldThrow(false);
          }
        ),
        { numRuns: 10 }
      );
    });

    it('Property: Malformed JSON in localStorage is handled gracefully', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 1, maxLength: 100 }).filter(s => {
            try {
              JSON.parse(s);
              return false; // Valid JSON, skip
            } catch {
              return true; // Invalid JSON, use it
            }
          }),
          async (invalidJson) => {
            mockLocalStorage.clear();
            mockLocalStorage.setItem(AGENTS_STORAGE_KEY, invalidJson);

            // Suppress console.error for this test
            const consoleError = jest.spyOn(console, 'error').mockImplementation();

            const { result } = renderHook(() => useAgent(), { wrapper });

            await waitFor(() => {
              // Should not crash, should return empty array
              expect(result.current.agents).toEqual([]);
              expect(result.current.error).toBeNull();
            });

            consoleError.mockRestore();
          }
        ),
        { numRuns: 30 }
      );
    });

    it('Property: Valid JSON but wrong shape is handled gracefully', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.oneof(
            fc.constant({ not: 'an array' }),
            fc.constant('string instead of array'),
            fc.constant(123),
            fc.constant(true),
            fc.array(fc.record({
              // Missing required fields
              id: fc.uuid(),
              // name is missing
            }))
          ),
          async (invalidData) => {
            mockLocalStorage.clear();
            mockLocalStorage.setItem(AGENTS_STORAGE_KEY, JSON.stringify(invalidData));

            // Suppress console.error for this test
            const consoleError = jest.spyOn(console, 'error').mockImplementation();

            const { result } = renderHook(() => useAgent(), { wrapper });

            await waitFor(() => {
              // Should not crash - the implementation should handle this gracefully
              // Behavior may vary: might return empty array or partially valid data
              expect(result.current.error).toBeNull();
            });

            consoleError.mockRestore();
          }
        ),
        { numRuns: 30 }
      );
    });
  });

  describe('Edge Cases', () => {
    it('Property: Very large number of agents in localStorage loads correctly', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(agentArbitrary, { minLength: 50, maxLength: 100 }),
          async (agents) => {
            mockLocalStorage.clear();
            mockLocalStorage.setItem(AGENTS_STORAGE_KEY, JSON.stringify(agents));

            const { result } = renderHook(() => useAgent(), { wrapper });

            await waitFor(() => {
              expect(result.current.agents).toHaveLength(agents.length);
            });
          }
        ),
        { numRuns: 10 }
      );
    });

    it('Property: Agent with minimal data fields loads correctly', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.constant(null),
          async () => {
            const minimalAgent = {
              id: 'test-id',
              name: 'A',
              description: '',
              strictRAG: false,
              knowledgeSpaceId: 'ks-1',
              createdAt: new Date().toISOString(),
            };

            mockLocalStorage.clear();
            mockLocalStorage.setItem(AGENTS_STORAGE_KEY, JSON.stringify([minimalAgent]));

            const { result } = renderHook(() => useAgent(), { wrapper });

            await waitFor(() => {
              expect(result.current.agents).toHaveLength(1);
              expect(result.current.agents[0].id).toBe('test-id');
              expect(result.current.agents[0].name).toBe('A');
              expect(result.current.agents[0].description).toBe('');
            });
          }
        ),
        { numRuns: 10 }
      );
    });

    it('Property: Agent with maximum length strings loads correctly', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.constant(null),
          async () => {
            const maximalAgent = {
              id: 'x'.repeat(36), // UUID length
              name: 'N'.repeat(100),
              description: 'D'.repeat(500),
              strictRAG: true,
              knowledgeSpaceId: 'y'.repeat(36),
              createdAt: new Date().toISOString(),
            };

            mockLocalStorage.clear();
            mockLocalStorage.setItem(AGENTS_STORAGE_KEY, JSON.stringify([maximalAgent]));

            const { result } = renderHook(() => useAgent(), { wrapper });

            await waitFor(() => {
              expect(result.current.agents).toHaveLength(1);
              expect(result.current.agents[0].name.length).toBe(100);
              expect(result.current.agents[0].description.length).toBe(500);
            });
          }
        ),
        { numRuns: 10 }
      );
    });

    it('Property: Special characters in agent data are preserved', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            id: fc.uuid(),
            name: fc.string({ minLength: 1, maxLength: 50 }),
            description: fc.string({ maxLength: 200 }), // Any characters
            strictRAG: fc.boolean(),
            knowledgeSpaceId: fc.uuid(),
            createdAt: validDateArbitrary.map(d => d.toISOString()),
          }),
          async (agent) => {
            mockLocalStorage.clear();
            mockLocalStorage.setItem(AGENTS_STORAGE_KEY, JSON.stringify([agent]));

            const { result } = renderHook(() => useAgent(), { wrapper });

            await waitFor(() => {
              expect(result.current.agents).toHaveLength(1);
              expect(result.current.agents[0].name).toBe(agent.name);
              expect(result.current.agents[0].description).toBe(agent.description);
            });
          }
        ),
        { numRuns: 50 }
      );
    });

    it('Property: Date strings are converted to Date objects correctly', async () => {
      await fc.assert(
        fc.asyncProperty(
          validDateArbitrary,
          async (date) => {
            const agent = {
              id: 'test-id',
              name: 'Test Agent',
              description: 'Test',
              strictRAG: false,
              knowledgeSpaceId: 'ks-1',
              createdAt: date.toISOString(),
            };

            mockLocalStorage.clear();
            mockLocalStorage.setItem(AGENTS_STORAGE_KEY, JSON.stringify([agent]));

            const { result } = renderHook(() => useAgent(), { wrapper });

            await waitFor(() => {
              expect(result.current.agents).toHaveLength(1);
              expect(result.current.agents[0].createdAt).toBeInstanceOf(Date);
              expect(result.current.agents[0].createdAt.getTime()).toBe(date.getTime());
            });
          }
        ),
        { numRuns: 50 }
      );
    });

    it('Property: Empty string selectedAgentId is treated as no selection', async () => {
      await fc.assert(
        fc.asyncProperty(
          agentsArrayArbitrary,
          async (agents) => {
            mockLocalStorage.clear();
            mockLocalStorage.setItem(AGENTS_STORAGE_KEY, JSON.stringify(agents));
            mockLocalStorage.setItem(SELECTED_AGENT_KEY, '');

            const { result } = renderHook(() => useAgent(), { wrapper });

            await waitFor(() => {
              expect(result.current.selectedAgent).toBeNull();
            });
          }
        ),
        { numRuns: 30 }
      );
    });

    it('Property: Whitespace-only selectedAgentId is treated as no selection', async () => {
      await fc.assert(
        fc.asyncProperty(
          agentsArrayArbitrary,
          fc.array(fc.constantFrom(' ', '\t', '\n'), { minLength: 1, maxLength: 20 }).map(chars => chars.join('')),
          async (agents, whitespace) => {
            fc.pre(whitespace.length > 0);

            mockLocalStorage.clear();
            mockLocalStorage.setItem(AGENTS_STORAGE_KEY, JSON.stringify(agents));
            mockLocalStorage.setItem(SELECTED_AGENT_KEY, whitespace);

            const { result } = renderHook(() => useAgent(), { wrapper });

            await waitFor(() => {
              // Whitespace IDs won't match any agent, so selected should be null
              expect(result.current.selectedAgent).toBeNull();
            });
          }
        ),
        { numRuns: 20 }
      );
    });
  });

  describe('Initialization Invariants', () => {
    it('Property: Initialization never sets error state', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.oneof(
            agentsArrayArbitrary,
            fc.constant(null), // No data
            fc.string() // Invalid data
          ),
          async (data) => {
            mockLocalStorage.clear();
            if (data !== null && typeof data !== 'string') {
              mockLocalStorage.setItem(AGENTS_STORAGE_KEY, JSON.stringify(data));
            } else if (typeof data === 'string') {
              mockLocalStorage.setItem(AGENTS_STORAGE_KEY, data);
            }

            // Suppress console.error for this test
            const consoleError = jest.spyOn(console, 'error').mockImplementation();

            const { result } = renderHook(() => useAgent(), { wrapper });

            await waitFor(() => {
              // Initialization should never set error state
              // Errors are only set by API calls
              expect(result.current.error).toBeNull();
            });

            consoleError.mockRestore();
          }
        ),
        { numRuns: 50 }
      );
    });

    it('Property: Initialization never sets loading state', async () => {
      await fc.assert(
        fc.asyncProperty(
          agentsArrayArbitrary,
          async (agents) => {
            mockLocalStorage.clear();
            mockLocalStorage.setItem(AGENTS_STORAGE_KEY, JSON.stringify(agents));

            const { result } = renderHook(() => useAgent(), { wrapper });

            // Loading should always be false during initialization
            expect(result.current.isLoading).toBe(false);

            await waitFor(() => {
              expect(result.current.isLoading).toBe(false);
            });
          }
        ),
        { numRuns: 30 }
      );
    });

    it('Property: Agents array length never exceeds localStorage data', async () => {
      await fc.assert(
        fc.asyncProperty(
          agentsArrayArbitrary,
          async (agents) => {
            mockLocalStorage.clear();
            mockLocalStorage.setItem(AGENTS_STORAGE_KEY, JSON.stringify(agents));

            const { result } = renderHook(() => useAgent(), { wrapper });

            await waitFor(() => {
              expect(result.current.agents.length).toBeLessThanOrEqual(agents.length);
            });
          }
        ),
        { numRuns: 50 }
      );
    });

    it('Property: Selected agent is always null or in agents array', async () => {
      await fc.assert(
        fc.asyncProperty(
          agentsArrayArbitrary,
          fc.option(fc.uuid()),
          async (agents, maybeSelectedId) => {
            mockLocalStorage.clear();
            mockLocalStorage.setItem(AGENTS_STORAGE_KEY, JSON.stringify(agents));
            if (maybeSelectedId !== null) {
              mockLocalStorage.setItem(SELECTED_AGENT_KEY, maybeSelectedId);
            }

            const { result } = renderHook(() => useAgent(), { wrapper });

            await waitFor(() => {
              if (result.current.selectedAgent !== null) {
                // If there's a selected agent, it must be in the agents array
                const foundAgent = result.current.agents.find(
                  a => a.id === result.current.selectedAgent?.id
                );
                expect(foundAgent).toBeDefined();
              }
            });
          }
        ),
        { numRuns: 50 }
      );
    });
  });

  describe('Idempotency', () => {
    it('Property: Multiple renderings with same localStorage data yield same result', async () => {
      await fc.assert(
        fc.asyncProperty(
          agentsArrayArbitrary,
          fc.option(fc.uuid()),
          async (agents, maybeSelectedId) => {
            mockLocalStorage.clear();
            mockLocalStorage.setItem(AGENTS_STORAGE_KEY, JSON.stringify(agents));
            if (maybeSelectedId !== null && agents.some(a => a.id === maybeSelectedId)) {
              mockLocalStorage.setItem(SELECTED_AGENT_KEY, maybeSelectedId);
            }

            // First render
            const { result: result1, unmount: unmount1 } = renderHook(() => useAgent(), { wrapper });

            await waitFor(() => {
              expect(result1.current.agents.length).toBe(agents.length);
            });

            const agents1 = result1.current.agents;
            const selected1 = result1.current.selectedAgent;

            unmount1();

            // Second render with same data
            const { result: result2 } = renderHook(() => useAgent(), { wrapper });

            await waitFor(() => {
              expect(result2.current.agents.length).toBe(agents.length);
            });

            const agents2 = result2.current.agents;
            const selected2 = result2.current.selectedAgent;

            // Results should be identical
            expect(agents2.length).toBe(agents1.length);
            agents2.forEach((agent, i) => {
              expect(agent.id).toBe(agents1[i].id);
              expect(agent.name).toBe(agents1[i].name);
            });

            if (selected1 === null) {
              expect(selected2).toBeNull();
            } else {
              expect(selected2?.id).toBe(selected1.id);
            }
          }
        ),
        { numRuns: 30 }
      );
    });
  });

  describe('Data Consistency', () => {
    it('Property: All agent IDs in agents array are unique', async () => {
      await fc.assert(
        fc.asyncProperty(
          agentsArrayArbitrary,
          async (agents) => {
            mockLocalStorage.clear();
            mockLocalStorage.setItem(AGENTS_STORAGE_KEY, JSON.stringify(agents));

            const { result } = renderHook(() => useAgent(), { wrapper });

            await waitFor(() => {
              const ids = result.current.agents.map(a => a.id);
              const uniqueIds = new Set(ids);
              expect(uniqueIds.size).toBe(ids.length);
            });
          }
        ),
        { numRuns: 50 }
      );
    });

    it('Property: Agent data types are preserved correctly', async () => {
      await fc.assert(
        fc.asyncProperty(
          agentArbitrary,
          async (agent) => {
            mockLocalStorage.clear();
            mockLocalStorage.setItem(AGENTS_STORAGE_KEY, JSON.stringify([agent]));

            const { result } = renderHook(() => useAgent(), { wrapper });

            await waitFor(() => {
              expect(result.current.agents).toHaveLength(1);
              const loadedAgent = result.current.agents[0];

              expect(typeof loadedAgent.id).toBe('string');
              expect(typeof loadedAgent.name).toBe('string');
              expect(typeof loadedAgent.description).toBe('string');
              expect(typeof loadedAgent.strictRAG).toBe('boolean');
              expect(typeof loadedAgent.knowledgeSpaceId).toBe('string');
              expect(loadedAgent.createdAt).toBeInstanceOf(Date);
            });
          }
        ),
        { numRuns: 50 }
      );
    });
  });
});
