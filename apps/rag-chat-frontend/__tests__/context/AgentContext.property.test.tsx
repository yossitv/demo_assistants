/**
 * @jest-environment jsdom
 *
 * Property-based tests for AgentContext state updates
 * Test Property 18: Agent state updates (validates Requirement 6.2)
 *
 * Requirement 6.2: WHEN an agent is created or selected THEN the System SHALL update the global agent state
 *
 * Feature: web-mvp, Property 18: Agent state updates
 *
 * This test suite covers:
 * - Agent creation updates state correctly
 * - Agent selection updates selectedAgent
 * - Multiple agents can be created and managed
 * - State updates are atomic and consistent
 * - Re-renders happen when state changes
 * - State persists to localStorage
 */

import React from 'react';
import * as fc from 'fast-check';
import { renderHook, act, waitFor, cleanup } from '@testing-library/react';
import { AgentProvider, useAgent } from '@/lib/context/KnowledgeContext';
import { apiClient } from '@/lib/api/client';
import { getAgents, saveAgent } from '@/lib/utils/storage';
import { Agent } from '@/types';

jest.mock('@/lib/api/client', () => ({
  apiClient: {
    createAgent: jest.fn(),
    createKnowledgeSpace: jest.fn(),
    listKnowledgeSpaces: jest.fn(),
  },
}));

const mockedApiClient = apiClient as jest.Mocked<typeof apiClient>;

describe('Property 18: Agent State Updates', () => {
  const agentArbitrary = fc.record({
    id: fc.uuid(),
    name: fc
      .string({ minLength: 2, maxLength: 60 })
      .filter((value) => value.trim().length > 0),
    description: fc
      .string({ minLength: 1, maxLength: 120 })
      .filter((value) => value.trim().length > 0),
    strictRAG: fc.boolean(),
    knowledgeSpaceId: fc.uuid(),
    createdAt: fc.date().map(d => d.toISOString()),
  });

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <AgentProvider>{children}</AgentProvider>
  );

  beforeEach(() => {
    localStorage.clear();
    jest.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  it('Property 5.1: createAgent updates state and persists the new agent', async () => {
    await fc.assert(
      fc.asyncProperty(
        agentArbitrary,
        async (agentInput) => {
          mockedApiClient.createAgent.mockClear();

          const expectedId = agentInput.id;

          mockedApiClient.createAgent.mockResolvedValueOnce({
            agent: {
              id: expectedId,
              name: agentInput.name.trim(),
              description: agentInput.description.trim(),
              strictRAG: agentInput.strictRAG,
              knowledgeSpaceId: agentInput.knowledgeSpaceId,
            },
          });

          const { result, unmount } = renderHook(() => useAgent(), { wrapper });

          await act(async () => {
            await result.current.createAgent(
              agentInput.name,
              [agentInput.knowledgeSpaceId],
              agentInput.strictRAG,
              agentInput.description
            );
          });

          await waitFor(() => expect(result.current.isLoading).toBe(false));

          const apiCall = mockedApiClient.createAgent.mock.calls[0];
          expect(apiCall[0]).toBe(agentInput.knowledgeSpaceId);
          expect(apiCall[1]).toBe(agentInput.name.trim());
          expect(apiCall[2]).toBe(agentInput.description.trim());
          expect(apiCall[3]).toBe(agentInput.strictRAG);

          const storedAgents = getAgents();

          expect(result.current.agents.some((a) => a.id === expectedId)).toBe(true);
          expect(storedAgents.some((a) => a.id === expectedId)).toBe(true);

          unmount();
        }
      ),
      { numRuns: 30 }
    );
  });

  it('Property 5.2: selectAgent updates selection and persists the ID', async () => {
    await fc.assert(
      fc.asyncProperty(agentArbitrary, async (agentInput) => {
        const agent: Agent = { ...agentInput };

        const { result, unmount } = renderHook(() => useAgent(), { wrapper });

        await act(async () => {
          result.current.selectAgent(agent);
        });

        await waitFor(() => {
          expect(result.current.selectedAgent?.id).toBe(agent.id);
        });

        expect(localStorage.getItem('assistants_selected_agent')).toBe(agent.id);
        expect(getAgents().some((stored) => stored.id === agent.id)).toBe(true);

        unmount();
      }),
      { numRuns: 30 }
    );
  });

  it('Property 5.3: initializes state from agents and selection in localStorage', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc
          .array(agentArbitrary, { minLength: 1, maxLength: 5 })
          .map((agents) =>
            agents.map((agent, index) => ({
              ...agent,
              id: `${agent.id}-${index}`,
            }))
          ),
        async (agents) => {
          localStorage.clear();

          agents.forEach((agent) => saveAgent(agent));
          const selectedAgent = agents[agents.length - 1];
          localStorage.setItem('assistants_selected_agent', selectedAgent.id);

          const { result, unmount } = renderHook(() => useAgent(), { wrapper });

          await waitFor(() => {
            expect(result.current.agents.length).toBe(agents.length);
          });

          expect(result.current.selectedAgent?.id).toBe(selectedAgent.id);

          unmount();
        }
      ),
      { numRuns: 20 }
    );
  });

  it('Property 18.1: Multiple agents can be created in sequence', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(agentArbitrary, { minLength: 2, maxLength: 5 }),
        async (agentInputs) => {
          localStorage.clear();
          mockedApiClient.createAgent.mockClear();

          const { result, unmount } = renderHook(() => useAgent(), { wrapper });

          for (const agentInput of agentInputs) {
            mockedApiClient.createAgent.mockResolvedValueOnce({
              agent: {
                id: agentInput.id,
                name: agentInput.name.trim(),
                description: agentInput.description.trim(),
                strictRAG: agentInput.strictRAG,
                knowledgeSpaceId: agentInput.knowledgeSpaceId,
              },
            });

            await act(async () => {
              await result.current.createAgent(
                agentInput.name,
                [agentInput.knowledgeSpaceId],
                agentInput.strictRAG,
                agentInput.description
              );
            });

            await waitFor(() => expect(result.current.isLoading).toBe(false));
          }

          // Verify all agents are in state
          expect(result.current.agents.length).toBeGreaterThanOrEqual(agentInputs.length);

          // Verify each agent is present
          for (const agentInput of agentInputs) {
            expect(result.current.agents.some((a) => a.id === agentInput.id)).toBe(true);
          }

          unmount();
        }
      ),
      { numRuns: 20 }
    );
  });

  it('Property 18.2: Selecting null clears selectedAgent', async () => {
    await fc.assert(
      fc.asyncProperty(agentArbitrary, async (agentInput) => {
        localStorage.clear();
        const agent: Agent = { ...agentInput };

        const { result, unmount } = renderHook(() => useAgent(), { wrapper });

        // Select agent first
        await act(async () => {
          result.current.selectAgent(agent);
        });

        expect(result.current.selectedAgent).not.toBeNull();

        // Deselect by passing null
        await act(async () => {
          result.current.selectAgent(null);
        });

        expect(result.current.selectedAgent).toBeNull();
        expect(localStorage.getItem('assistants_selected_agent')).toBeNull();

        unmount();
      }),
      { numRuns: 30 }
    );
  });

  it('Property 18.3: Agent creation with invalid name throws error', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.constantFrom('', '   ', '\t\n', '  \t  '),
        fc.uuid(),
        async (invalidName, knowledgeSpaceId) => {
          localStorage.clear();
          mockedApiClient.createAgent.mockClear();

          const { result, unmount } = renderHook(() => useAgent(), { wrapper });

          const initialCount = result.current.agents.length;

          await act(async () => {
            try {
              await result.current.createAgent(
                invalidName,
                [knowledgeSpaceId],
                true,
                'Test description'
              );
            } catch (error) {
              // Expected to throw
            }
          });

          await waitFor(() => expect(result.current.isLoading).toBe(false));

          // Verify no agent was added
          expect(result.current.agents.length).toBe(initialCount);
          expect(result.current.error).not.toBeNull();
          expect(mockedApiClient.createAgent).not.toHaveBeenCalled();

          unmount();
        }
      ),
      { numRuns: 20 }
    );
  });

  it('Property 18.4: clearError removes error state', async () => {
    await fc.assert(
      fc.asyncProperty(fc.uuid(), async (knowledgeSpaceId) => {
        localStorage.clear();
        mockedApiClient.createAgent.mockClear();

        const { result, unmount } = renderHook(() => useAgent(), { wrapper });

        // Trigger an error
        await act(async () => {
          try {
            await result.current.createAgent('', [knowledgeSpaceId], true);
          } catch (error) {
            // Expected to throw
          }
        });

        await waitFor(() => expect(result.current.error).not.toBeNull());

        // Clear error
        act(() => {
          result.current.clearError();
        });

        expect(result.current.error).toBeNull();

        unmount();
      }),
      { numRuns: 20 }
    );
  });

  it('Property 18.5: refreshAgents reloads state from localStorage', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(agentArbitrary, { minLength: 1, maxLength: 3 }),
        async (agentInputs) => {
          localStorage.clear();

          // Pre-populate localStorage
          const agents: Agent[] = agentInputs.map((input) => ({ ...input }));
          agents.forEach((agent) => saveAgent(agent));

          const { result, unmount } = renderHook(() => useAgent(), { wrapper });

          await waitFor(() => {
            expect(result.current.agents.length).toBe(agents.length);
          });

          const beforeCount = result.current.agents.length;

          // Call refreshAgents
          act(() => {
            result.current.refreshAgents();
          });

          // State should remain the same
          expect(result.current.agents.length).toBe(beforeCount);

          unmount();
        }
      ),
      { numRuns: 20 }
    );
  });

  it('Property 18.6: State updates are atomic (no partial updates)', async () => {
    await fc.assert(
      fc.asyncProperty(agentArbitrary, async (agentInput) => {
        localStorage.clear();
        mockedApiClient.createAgent.mockClear();

        const { result, unmount } = renderHook(() => useAgent(), { wrapper });

        // Mock a failure
        const error = new Error('API Error');
        mockedApiClient.createAgent.mockRejectedValueOnce(error);

        const initialCount = result.current.agents.length;

        await act(async () => {
          try {
            await result.current.createAgent(
              agentInput.name,
              [agentInput.knowledgeSpaceId],
              agentInput.strictRAG,
              agentInput.description
            );
          } catch (e) {
            // Expected to throw
          }
        });

        await waitFor(() => expect(result.current.isLoading).toBe(false));

        // Verify state is unchanged (atomic rollback)
        expect(result.current.agents.length).toBe(initialCount);
        expect(result.current.error).not.toBeNull();

        unmount();
      }),
      { numRuns: 30 }
    );
  });
});
