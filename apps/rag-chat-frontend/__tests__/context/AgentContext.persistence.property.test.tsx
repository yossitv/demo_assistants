/**
 * @jest-environment jsdom
 *
 * Property-based tests for AgentContext state persistence across navigation
 * Test Property 19: State persistence across navigation
 * Validates: Requirements 6.4
 *
 * Requirement 6.4: WHEN agents are created or selected THEN the System SHALL persist agent state across navigation
 *
 * Feature: web-mvp, Property 19: State persistence across navigation
 */

import React from 'react';
import * as fc from 'fast-check';
import { renderHook, act, waitFor } from '@testing-library/react';
import { AgentProvider, useAgent } from '../../lib/context/KnowledgeContext';
import { apiClient } from '../../lib/api/client';
import { CreateAgentResponse, CreateKnowledgeSpaceResponse } from '../../lib/api/types';
import { Agent } from '@/types';

// Mock the API client
jest.mock('../../lib/api/client', () => ({
  apiClient: {
    createAgent: jest.fn(),
    createKnowledgeSpace: jest.fn(),
    listKnowledgeSpaces: jest.fn(),
  },
}));

const mockedApiClient = apiClient as jest.Mocked<typeof apiClient>;

// Storage keys used by AgentContext
const AGENTS_STORAGE_KEY = 'assistants_agents';
const SELECTED_AGENT_KEY = 'assistants_selected_agent';
const RECENT_AGENTS_KEY = 'assistants_recent_agents';

describe('Property 19: State Persistence Across Navigation', () => {
  let localStorageData: { [key: string]: string } = {};

  beforeEach(() => {
    jest.clearAllMocks();
    localStorageData = {};

    // Mock localStorage with a working implementation
    const localStorageMock = {
      getItem: jest.fn((key: string) => localStorageData[key] || null),
      setItem: jest.fn((key: string, value: string) => {
        localStorageData[key] = value;
      }),
      removeItem: jest.fn((key: string) => {
        delete localStorageData[key];
      }),
      clear: jest.fn(() => {
        localStorageData = {};
      }),
      get length() {
        return Object.keys(localStorageData).length;
      },
      key: jest.fn((index: number) => {
        const keys = Object.keys(localStorageData);
        return keys[index] || null;
      }),
    };

    Object.defineProperty(window, 'localStorage', {
      value: localStorageMock,
      writable: true,
    });

    // Mock API client with default responses
    mockedApiClient.listKnowledgeSpaces.mockResolvedValue({
      knowledgeSpaces: [],
    });
  });

  afterEach(() => {
    localStorageData = {};
  });

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <AgentProvider>{children}</AgentProvider>
  );

  describe('Agent Creation and Storage', () => {
    it('Property: Any agent created is persisted to localStorage', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.uuid(), // agentId
          fc.string({ minLength: 1, maxLength: 100 }), // agentName
          fc.string({ minLength: 1, maxLength: 500 }), // description
          fc.uuid(), // knowledgeSpaceId
          fc.boolean(), // strictRAG
          async (agentId, agentName, description, knowledgeSpaceId, strictRAG) => {
            // Pre-condition: name and description must not be whitespace-only
            fc.pre(agentName.trim().length > 0);
            fc.pre(description.trim().length > 0);

            // Clear localStorage and mocks for each run
            localStorageData = {};
            mockedApiClient.createAgent.mockClear();

            // Mock successful agent creation
            const mockResponse: CreateAgentResponse = {
              agent: {
                id: agentId,
                name: agentName,
                description: description,
                strictRAG: strictRAG,
                knowledgeSpaceId: knowledgeSpaceId,
                createdAt: new Date().toISOString(),
              },
            };
            mockedApiClient.createAgent.mockResolvedValueOnce(mockResponse);

            const { result } = renderHook(() => useAgent(), { wrapper });

            // Create agent
            await act(async () => {
              await result.current.createAgent(agentName, [knowledgeSpaceId], strictRAG, description);
            });

            await waitFor(() => {
              expect(result.current.isLoading).toBe(false);
            });

            // Verify agent is in localStorage
            const storedAgentsJson = localStorageData[AGENTS_STORAGE_KEY];
            expect(storedAgentsJson).toBeDefined();

            const storedAgents: Agent[] = JSON.parse(storedAgentsJson);
            expect(storedAgents).toHaveLength(1);
            expect(storedAgents[0].id).toBe(agentId);
            expect(storedAgents[0].name).toBe(agentName);
            expect(storedAgents[0].description).toBe(description);
            expect(storedAgents[0].strictRAG).toBe(strictRAG);
            expect(storedAgents[0].knowledgeSpaceId).toBe(knowledgeSpaceId);
          }
        ),
        { numRuns: 50 }
      );
    });

    it('Property: Multiple agents are all persisted to localStorage', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(
            fc.record({
              id: fc.uuid(),
              name: fc.string({ minLength: 1, maxLength: 100 }),
              description: fc.string({ minLength: 1, maxLength: 500 }),
              knowledgeSpaceId: fc.uuid(),
              strictRAG: fc.boolean(),
            }),
            { minLength: 1, maxLength: 5 }
          ),
          async (agents) => {
            // Pre-condition: all names and descriptions must not be whitespace-only
            fc.pre(agents.every(a => a.name.trim().length > 0));
            fc.pre(agents.every(a => a.description.trim().length > 0));

            // Clear localStorage and mocks for each run
            localStorageData = {};
            mockedApiClient.createAgent.mockClear();

            const { result } = renderHook(() => useAgent(), { wrapper });

            // Create all agents
            for (const agent of agents) {
              const mockResponse: CreateAgentResponse = {
                agent: {
                  ...agent,
                  createdAt: new Date().toISOString(),
                },
              };
              mockedApiClient.createAgent.mockResolvedValueOnce(mockResponse);

              await act(async () => {
                await result.current.createAgent(
                  agent.name,
                  [agent.knowledgeSpaceId],
                  agent.strictRAG,
                  agent.description
                );
              });

              await waitFor(() => {
                expect(result.current.isLoading).toBe(false);
              });
            }

            // Verify all agents are in localStorage
            const storedAgentsJson = localStorageData[AGENTS_STORAGE_KEY];
            expect(storedAgentsJson).toBeDefined();

            const storedAgents: Agent[] = JSON.parse(storedAgentsJson);
            expect(storedAgents).toHaveLength(agents.length);

            // Verify each agent is stored correctly
            agents.forEach((agent, index) => {
              expect(storedAgents[index].id).toBe(agent.id);
              expect(storedAgents[index].name).toBe(agent.name);
              expect(storedAgents[index].description).toBe(agent.description);
              expect(storedAgents[index].strictRAG).toBe(agent.strictRAG);
            });
          }
        ),
        { numRuns: 30 }
      );
    }, 10000);
  });

  describe('Agent Selection Persistence', () => {
    it('Property: Selected agent ID is persisted to localStorage', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            id: fc.uuid(),
            name: fc.string({ minLength: 1, maxLength: 100 }),
            description: fc.string({ minLength: 1, maxLength: 500 }),
            knowledgeSpaceId: fc.uuid(),
            strictRAG: fc.boolean(),
          }),
          async (agentData) => {
            // Pre-condition: name and description must not be whitespace-only
            fc.pre(agentData.name.trim().length > 0);
            fc.pre(agentData.description.trim().length > 0);

            // Clear localStorage and mocks for each run
            localStorageData = {};
            mockedApiClient.createAgent.mockClear();

            const { result } = renderHook(() => useAgent(), { wrapper });

            const agent: Agent = {
              ...agentData,
              createdAt: new Date().toISOString(),
            };

            // Select agent
            act(() => {
              result.current.selectAgent(agent);
            });

            // Verify selected agent ID is in localStorage
            const storedAgentId = localStorageData[SELECTED_AGENT_KEY];
            expect(storedAgentId).toBe(agent.id);
          }
        ),
        { numRuns: 50 }
      );
    });

    it('Property: Deselecting agent removes ID from localStorage', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            id: fc.uuid(),
            name: fc.string({ minLength: 1, maxLength: 100 }),
            description: fc.string({ minLength: 1, maxLength: 500 }),
            knowledgeSpaceId: fc.uuid(),
            strictRAG: fc.boolean(),
          }),
          async (agentData) => {
            // Pre-condition: name and description must not be whitespace-only
            fc.pre(agentData.name.trim().length > 0);
            fc.pre(agentData.description.trim().length > 0);

            // Clear localStorage and mocks for each run
            localStorageData = {};

            const { result } = renderHook(() => useAgent(), { wrapper });

            const agent: Agent = {
              ...agentData,
              createdAt: new Date().toISOString(),
            };

            // Select agent first
            act(() => {
              result.current.selectAgent(agent);
            });

            expect(localStorageData[SELECTED_AGENT_KEY]).toBe(agent.id);

            // Deselect agent
            act(() => {
              result.current.selectAgent(null);
            });

            // Verify selected agent ID is removed from localStorage
            expect(localStorageData[SELECTED_AGENT_KEY]).toBeUndefined();
          }
        ),
        { numRuns: 50 }
      );
    });
  });

  describe('State Restoration on Provider Mount', () => {
    it('Property: Agents in localStorage are restored on provider mount', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(
            fc.record({
              id: fc.uuid(),
              name: fc.string({ minLength: 1, maxLength: 100 }),
              description: fc.string({ minLength: 1, maxLength: 500 }),
              knowledgeSpaceId: fc.uuid(),
              strictRAG: fc.boolean(),
              createdAt: fc.date().map(d => d.toISOString()),
            }),
            { minLength: 1, maxLength: 10 }
          ),
          async (agents) => {
            // Clear localStorage for each run
            localStorageData = {};

            // Pre-populate localStorage with agents
            const agentsToStore = agents.map(agent => ({
              ...agent,
              createdAt: agent.createdAt.toISOString(), // Store as ISO string
            }));
            localStorageData[AGENTS_STORAGE_KEY] = JSON.stringify(agentsToStore);

            // Mount provider (which should restore agents from localStorage)
            const { result } = renderHook(() => useAgent(), { wrapper });

            // Wait for useEffect to complete
            await waitFor(() => {
              expect(result.current.agents).toHaveLength(agents.length);
            });

            // Verify all agents are restored
            agents.forEach((agent, index) => {
              expect(result.current.agents[index].id).toBe(agent.id);
              expect(result.current.agents[index].name).toBe(agent.name);
              expect(result.current.agents[index].description).toBe(agent.description);
              expect(result.current.agents[index].strictRAG).toBe(agent.strictRAG);
              expect(result.current.agents[index].knowledgeSpaceId).toBe(agent.knowledgeSpaceId);
            });
          }
        ),
        { numRuns: 30 }
      );
    });

    it('Property: Selected agent is restored from localStorage on provider mount', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(
            fc.record({
              id: fc.uuid(),
              name: fc.string({ minLength: 1, maxLength: 100 }),
              description: fc.string({ minLength: 1, maxLength: 500 }),
              knowledgeSpaceId: fc.uuid(),
              strictRAG: fc.boolean(),
              createdAt: fc.date().map(d => d.toISOString()),
            }),
            { minLength: 1, maxLength: 5 }
          ),
          fc.integer({ min: 0, max: 4 }), // selectedIndex
          async (agents, selectedIndex) => {
            // Pre-condition: selectedIndex must be valid
            fc.pre(selectedIndex < agents.length);

            // Clear localStorage for each run
            localStorageData = {};

            // Pre-populate localStorage with agents
            const agentsToStore = agents.map(agent => ({
              ...agent,
              createdAt: agent.createdAt.toISOString(),
            }));
            localStorageData[AGENTS_STORAGE_KEY] = JSON.stringify(agentsToStore);

            // Set selected agent ID
            const selectedAgent = agents[selectedIndex];
            localStorageData[SELECTED_AGENT_KEY] = selectedAgent.id;

            // Mount provider (which should restore selection from localStorage)
            const { result } = renderHook(() => useAgent(), { wrapper });

            // Wait for useEffect to complete
            await waitFor(() => {
              expect(result.current.selectedAgent).not.toBeNull();
            });

            // Verify selected agent is restored
            expect(result.current.selectedAgent).not.toBeNull();
            expect(result.current.selectedAgent!.id).toBe(selectedAgent.id);
            expect(result.current.selectedAgent!.name).toBe(selectedAgent.name);
            expect(result.current.selectedAgent!.description).toBe(selectedAgent.description);
          }
        ),
        { numRuns: 30 }
      );
    });

    it('Property: Empty localStorage results in empty state on mount', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.constant(true), // Dummy property to run the test
          async (_) => {
            // Clear localStorage completely
            localStorageData = {};

            // Mount provider
            const { result } = renderHook(() => useAgent(), { wrapper });

            // Verify state is empty
            expect(result.current.agents).toEqual([]);
            expect(result.current.selectedAgent).toBeNull();
          }
        ),
        { numRuns: 10 }
      );
    });
  });

  describe('State Persistence Across Unmount/Remount Cycles', () => {
    it('Property: Single unmount/remount cycle preserves agent state', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            id: fc.uuid(),
            name: fc.string({ minLength: 1, maxLength: 100 }),
            description: fc.string({ minLength: 1, maxLength: 500 }),
            knowledgeSpaceId: fc.uuid(),
            strictRAG: fc.boolean(),
          }),
          async (agentData) => {
            // Pre-condition: name and description must not be whitespace-only
            fc.pre(agentData.name.trim().length > 0);
            fc.pre(agentData.description.trim().length > 0);

            // Clear localStorage and mocks for each run
            localStorageData = {};
            mockedApiClient.createAgent.mockClear();

            // Mock successful agent creation
            const mockResponse: CreateAgentResponse = {
              agent: {
                ...agentData,
                createdAt: new Date().toISOString(),
              },
            };
            mockedApiClient.createAgent.mockResolvedValueOnce(mockResponse);

            // First mount: create agent
            const { result: result1, unmount: unmount1 } = renderHook(() => useAgent(), { wrapper });

            await act(async () => {
              await result1.current.createAgent(
                agentData.name,
                [agentData.knowledgeSpaceId],
                agentData.strictRAG,
                agentData.description
              );
            });

            await waitFor(() => {
              expect(result1.current.isLoading).toBe(false);
            });

            expect(result1.current.agents).toHaveLength(1);

            // Unmount provider (simulating navigation away)
            unmount1();

            // Remount provider (simulating navigation back)
            const { result: result2 } = renderHook(() => useAgent(), { wrapper });

            // Wait for restoration
            await waitFor(() => {
              expect(result2.current.agents).toHaveLength(1);
            });

            // Verify agent is restored
            expect(result2.current.agents[0].id).toBe(agentData.id);
            expect(result2.current.agents[0].name).toBe(agentData.name);
            expect(result2.current.agents[0].description).toBe(agentData.description);
            expect(result2.current.agents[0].strictRAG).toBe(agentData.strictRAG);
          }
        ),
        { numRuns: 30 }
      );
    });

    it('Property: Single unmount/remount cycle preserves selected agent', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            id: fc.uuid(),
            name: fc.string({ minLength: 1, maxLength: 100 }),
            description: fc.string({ minLength: 1, maxLength: 500 }),
            knowledgeSpaceId: fc.uuid(),
            strictRAG: fc.boolean(),
          }),
          async (agentData) => {
            // Pre-condition: name and description must not be whitespace-only
            fc.pre(agentData.name.trim().length > 0);
            fc.pre(agentData.description.trim().length > 0);

            // Clear localStorage for each run
            localStorageData = {};

            const agent: Agent = {
              ...agentData,
              createdAt: new Date().toISOString(),
            };

            // First mount: select agent
            const { result: result1, unmount: unmount1 } = renderHook(() => useAgent(), { wrapper });

            act(() => {
              result1.current.selectAgent(agent);
            });

            expect(result1.current.selectedAgent).not.toBeNull();
            expect(result1.current.selectedAgent!.id).toBe(agent.id);

            // Unmount provider (simulating navigation away)
            unmount1();

            // Remount provider (simulating navigation back)
            const { result: result2 } = renderHook(() => useAgent(), { wrapper });

            // Wait for restoration
            await waitFor(() => {
              expect(result2.current.selectedAgent).not.toBeNull();
            });

            // Verify selected agent is restored
            expect(result2.current.selectedAgent!.id).toBe(agent.id);
            expect(result2.current.selectedAgent!.name).toBe(agent.name);
            expect(result2.current.selectedAgent!.description).toBe(agent.description);
          }
        ),
        { numRuns: 30 }
      );
    });

    it('Property: Multiple unmount/remount cycles preserve state correctly', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(
            fc.record({
              id: fc.uuid(),
              name: fc.string({ minLength: 1, maxLength: 100 }),
              description: fc.string({ minLength: 1, maxLength: 500 }),
              knowledgeSpaceId: fc.uuid(),
              strictRAG: fc.boolean(),
            }),
            { minLength: 2, maxLength: 5 }
          ),
          fc.integer({ min: 2, max: 5 }), // number of cycles
          async (agents, numCycles) => {
            // Pre-condition: all names and descriptions must not be whitespace-only
            fc.pre(agents.every(a => a.name.trim().length > 0));
            fc.pre(agents.every(a => a.description.trim().length > 0));

            // Clear localStorage and mocks for each run
            localStorageData = {};
            mockedApiClient.createAgent.mockClear();

            // Create all agents in first mount
            const { result: result1, unmount: unmount1 } = renderHook(() => useAgent(), { wrapper });

            for (const agent of agents) {
              const mockResponse: CreateAgentResponse = {
                agent: {
                  ...agent,
                  createdAt: new Date().toISOString(),
                },
              };
              mockedApiClient.createAgent.mockResolvedValueOnce(mockResponse);

              await act(async () => {
                await result1.current.createAgent(
                  agent.name,
                  [agent.knowledgeSpaceId],
                  agent.strictRAG,
                  agent.description
                );
              });

              await waitFor(() => {
                expect(result1.current.isLoading).toBe(false);
              });
            }

            expect(result1.current.agents).toHaveLength(agents.length);
            unmount1();

            // Perform multiple unmount/remount cycles
            for (let cycle = 0; cycle < numCycles; cycle++) {
              const { result, unmount } = renderHook(() => useAgent(), { wrapper });

              // Wait for restoration
              await waitFor(() => {
                expect(result.current.agents).toHaveLength(agents.length);
              });

              // Verify all agents are still there
              agents.forEach((agent, index) => {
                expect(result.current.agents[index].id).toBe(agent.id);
                expect(result.current.agents[index].name).toBe(agent.name);
              });

              unmount();
            }
          }
        ),
        { numRuns: 20 }
      );
    });

    it('Property: State modifications persist across remount', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(
            fc.record({
              id: fc.uuid(),
              name: fc.string({ minLength: 1, maxLength: 100 }),
              description: fc.string({ minLength: 1, maxLength: 500 }),
              knowledgeSpaceId: fc.uuid(),
              strictRAG: fc.boolean(),
            }),
            { minLength: 1, maxLength: 3 }
          ),
          fc.integer({ min: 0, max: 2 }), // index to select
          async (agents, selectIndex) => {
            // Pre-condition
            fc.pre(selectIndex < agents.length);
            fc.pre(agents.every(a => a.name.trim().length > 0));
            fc.pre(agents.every(a => a.description.trim().length > 0));

            // Clear localStorage and mocks
            localStorageData = {};
            mockedApiClient.createAgent.mockClear();

            // First mount: create agents and select one
            const { result: result1, unmount: unmount1 } = renderHook(() => useAgent(), { wrapper });

            for (const agent of agents) {
              const mockResponse: CreateAgentResponse = {
                agent: {
                  ...agent,
                  createdAt: new Date().toISOString(),
                },
              };
              mockedApiClient.createAgent.mockResolvedValueOnce(mockResponse);

              await act(async () => {
                await result1.current.createAgent(
                  agent.name,
                  [agent.knowledgeSpaceId],
                  agent.strictRAG,
                  agent.description
                );
              });

              await waitFor(() => {
                expect(result1.current.isLoading).toBe(false);
              });
            }

            // Select specific agent
            const agentToSelect: Agent = {
              ...agents[selectIndex],
              createdAt: new Date().toISOString(),
            };

            act(() => {
              result1.current.selectAgent(agentToSelect);
            });

            expect(result1.current.selectedAgent!.id).toBe(agentToSelect.id);
            unmount1();

            // Second mount: verify state is restored
            const { result: result2 } = renderHook(() => useAgent(), { wrapper });

            await waitFor(() => {
              expect(result2.current.agents).toHaveLength(agents.length);
              expect(result2.current.selectedAgent).not.toBeNull();
            });

            // Verify both agents and selection are preserved
            expect(result2.current.agents).toHaveLength(agents.length);
            expect(result2.current.selectedAgent!.id).toBe(agentToSelect.id);
          }
        ),
        { numRuns: 20 }
      );
    });
  });

  describe('LocalStorage Error Handling', () => {
    it('Property: Context handles missing localStorage gracefully', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.constant(true),
          async (_) => {
            // Mock localStorage to throw errors
            const brokenLocalStorage = {
              getItem: jest.fn(() => {
                throw new Error('localStorage error');
              }),
              setItem: jest.fn(() => {
                throw new Error('localStorage error');
              }),
              removeItem: jest.fn(),
              clear: jest.fn(),
              get length() {
                return 0;
              },
              key: jest.fn(),
            };

            Object.defineProperty(window, 'localStorage', {
              value: brokenLocalStorage,
              writable: true,
            });

            // Should not throw when mounting
            const { result } = renderHook(() => useAgent(), { wrapper });

            // Should have empty state
            expect(result.current.agents).toEqual([]);
            expect(result.current.selectedAgent).toBeNull();
          }
        ),
        { numRuns: 10 }
      );
    });

    it('Property: Context handles corrupted localStorage data gracefully', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 1, maxLength: 100 }), // corrupted data
          async (corruptedData) => {
            // Pre-condition: data must not be valid JSON
            const isInvalidJson = (() => {
              try {
                JSON.parse(corruptedData);
                return false; // Valid JSON, skip this case
              } catch {
                return true; // Invalid JSON, test this case
              }
            })();
            fc.pre(isInvalidJson);

            // Clear and corrupt localStorage
            localStorageData = {};
            localStorageData[AGENTS_STORAGE_KEY] = corruptedData;

            // Should not throw when mounting with corrupted data
            const { result } = renderHook(() => useAgent(), { wrapper });

            // Should have empty state (failed to parse corrupted data)
            expect(result.current.agents).toEqual([]);
          }
        ),
        { numRuns: 20 }
      );
    });
  });

  describe('State Refresh Functionality', () => {
    it('Property: refreshAgents reloads state from localStorage', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(
            fc.record({
              id: fc.uuid(),
              name: fc.string({ minLength: 1, maxLength: 100 }),
              description: fc.string({ minLength: 1, maxLength: 500 }),
              knowledgeSpaceId: fc.uuid(),
              strictRAG: fc.boolean(),
              createdAt: fc.date().map(d => d.toISOString()),
            }),
            { minLength: 1, maxLength: 5 }
          ),
          async (newAgents) => {
            // Clear localStorage
            localStorageData = {};

            // Initial mount with empty state
            const { result } = renderHook(() => useAgent(), { wrapper });

            expect(result.current.agents).toEqual([]);

            // Externally add agents to localStorage (simulating another tab/window)
            const agentsToStore = newAgents.map(agent => ({
              ...agent,
              createdAt: agent.createdAt.toISOString(),
            }));
            localStorageData[AGENTS_STORAGE_KEY] = JSON.stringify(agentsToStore);

            // Refresh agents
            act(() => {
              result.current.refreshAgents();
            });

            // Verify agents are now loaded
            expect(result.current.agents).toHaveLength(newAgents.length);
            newAgents.forEach((agent, index) => {
              expect(result.current.agents[index].id).toBe(agent.id);
              expect(result.current.agents[index].name).toBe(agent.name);
            });
          }
        ),
        { numRuns: 20 }
      );
    });
  });

  describe('State Clearing', () => {
    it('Property: Clearing localStorage results in empty state on remount', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(
            fc.record({
              id: fc.uuid(),
              name: fc.string({ minLength: 1, maxLength: 100 }),
              description: fc.string({ minLength: 1, maxLength: 500 }),
              knowledgeSpaceId: fc.uuid(),
              strictRAG: fc.boolean(),
            }),
            { minLength: 1, maxLength: 5 }
          ),
          async (agents) => {
            // Pre-condition
            fc.pre(agents.every(a => a.name.trim().length > 0));
            fc.pre(agents.every(a => a.description.trim().length > 0));

            // Clear localStorage and mocks
            localStorageData = {};
            mockedApiClient.createAgent.mockClear();

            // First mount: create agents
            const { result: result1, unmount: unmount1 } = renderHook(() => useAgent(), { wrapper });

            for (const agent of agents) {
              const mockResponse: CreateAgentResponse = {
                agent: {
                  ...agent,
                  createdAt: new Date().toISOString(),
                },
              };
              mockedApiClient.createAgent.mockResolvedValueOnce(mockResponse);

              await act(async () => {
                await result1.current.createAgent(
                  agent.name,
                  [agent.knowledgeSpaceId],
                  agent.strictRAG,
                  agent.description
                );
              });

              await waitFor(() => {
                expect(result1.current.isLoading).toBe(false);
              });
            }

            expect(result1.current.agents).toHaveLength(agents.length);
            unmount1();

            // Clear localStorage (simulating user clearing browser data)
            localStorageData = {};

            // Remount: should have empty state
            const { result: result2 } = renderHook(() => useAgent(), { wrapper });

            expect(result2.current.agents).toEqual([]);
            expect(result2.current.selectedAgent).toBeNull();
          }
        ),
        { numRuns: 20 }
      );
    });
  });
});
