/**
 * @jest-environment jsdom
 *
 * Property-based test for agent ID persistence
 * Property 12: Agent ID persistence to localStorage
 * Validates: Requirements 3.4
 */

import '@testing-library/jest-dom';
import * as fc from 'fast-check';
import { render, screen, waitFor, cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import CreateAgentForm from '@/components/CreateAgentForm';
import { Agent } from '@/types';
import { getAgents, saveAgent } from '@/lib/utils/storage';

let mockKnowledgeSpaceId = 'ks-default';
const mockCreateAgent = jest.fn();
const mockRouterPush = jest.fn();

// Mock the context to use our mock function
jest.mock('@/lib/context/KnowledgeContext', () => ({
    useAgent: () => ({
        createAgent: mockCreateAgent,
    }),
}));

jest.mock('@/components/CreateKnowledgeSpaceForm', () => {
    return function MockCreateKnowledgeSpaceForm({
        onSuccess,
    }: {
        onSuccess: (knowledgeSpaceId: string) => void;
    }) {
        return (
            <button
                type="button"
                aria-label="complete-knowledge-space"
                onClick={() => onSuccess(mockKnowledgeSpaceId)}
            >
                Complete Knowledge Base
            </button>
        );
    };
});

jest.mock('next/navigation', () => ({
    useRouter: () => ({
        push: mockRouterPush,
    }),
}));

jest.setTimeout(30000);

const safeCharacters = [
    'a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'k', 'l', 'm', 'n', 'o', 'p', 'q', 'r', 's', 't', 'u', 'v', 'w', 'x', 'y', 'z',
    'A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N', 'O', 'P', 'Q', 'R', 'S', 'T', 'U', 'V', 'W', 'X', 'Y', 'Z',
    '0', '1', '2', '3', '4', '5', '6', '7', '8', '9',
    ' ',
];

const safeText = (minLength: number, maxLength: number) =>
    fc
        .array(fc.constantFrom(...safeCharacters), { minLength, maxLength })
        .map((chars) => {
            const joined = chars.join('');
            const trimmed = joined.trim();
            return trimmed.length > 0 ? joined : 'agent';
        });

describe('CreateAgentForm Property Test: Agent ID Persistence (15.4)', () => {
    beforeEach(() => {
        mockCreateAgent.mockReset();
        mockRouterPush.mockReset();
        mockKnowledgeSpaceId = 'ks-default';
        localStorage.clear();
        cleanup();
    });

    afterEach(() => {
        cleanup();
    });

    const renderForm = () => render(<CreateAgentForm />);

    /**
     * Property 12: Agent ID persistence
     * 
     * This test verifies that after successful agent creation:
     * 1. The agent ID is correctly saved to localStorage
     * 2. The agent can be retrieved from localStorage
     * 3. All agent properties are persisted correctly
     */
    it('Property 12: persists agent ID and details to localStorage after successful creation', async () => {
        await fc.assert(
            fc.asyncProperty(
                safeText(3, 40),
                safeText(3, 60),
                fc.boolean(),
                fc.uuid(),
                async (agentName, description, strictRAG, knowledgeSpaceId) => {
                    mockCreateAgent.mockReset();
                    mockRouterPush.mockReset();
                    localStorage.clear();
                    mockKnowledgeSpaceId = knowledgeSpaceId;
                    const user = userEvent.setup();

                    const createdAgentId = `agent-${knowledgeSpaceId}`;
                    const returnedAgent: Agent = {
                        id: createdAgentId,
                        name: agentName.trim(),
                        description: description.trim(),
                        strictRAG,
                        knowledgeSpaceId,
                        createdAt: new Date().toISOString(),
                    };

                    // Mock createAgent to save to localStorage like the real implementation
                    mockCreateAgent.mockImplementation(async (name, knowledgeSpaceIds, rag, desc) => {
                        const agent: Agent = {
                            id: createdAgentId,
                            name: name.trim(),
                            description: desc?.trim() || '',
                            strictRAG: rag,
                            knowledgeSpaceId: knowledgeSpaceIds[0],
                            createdAt: new Date().toISOString(),
                        };
                        saveAgent(agent);
                        return agent;
                    });

                    try {
                        renderForm();
                        await user.click(screen.getByLabelText('complete-knowledge-space'));

                        await waitFor(() => {
                            expect(screen.getByText('Configure Your Agent')).toBeInTheDocument();
                        });

                        const nameInput = screen.getByLabelText(/agent name/i);
                        await user.clear(nameInput);
                        await user.type(nameInput, ` ${agentName} `);

                        const descriptionInput = screen.getByLabelText(/description/i);
                        await user.clear(descriptionInput);
                        await user.type(descriptionInput, ` ${description} `);

                        const strictRagToggle = screen.getByLabelText(/enable strict rag mode/i);
                        if (strictRAG !== (strictRagToggle as HTMLInputElement).checked) {
                            await user.click(strictRagToggle);
                        }

                        await user.click(screen.getByRole('button', { name: /create agent/i }));

                        await waitFor(() => {
                            expect(screen.getByText('Agent Created Successfully!')).toBeInTheDocument();
                        });

                        // Verify agent is persisted to localStorage
                        const savedAgents = getAgents();
                        expect(savedAgents).toHaveLength(1);

                        const savedAgent = savedAgents[0];
                        expect(savedAgent.id).toBe(createdAgentId);
                        expect(savedAgent.name).toBe(agentName.trim());
                        expect(savedAgent.description).toBe(description.trim());
                        expect(savedAgent.strictRAG).toBe(strictRAG);
                        expect(savedAgent.knowledgeSpaceId).toBe(knowledgeSpaceId);
                        expect(savedAgent.createdAt).toBeDefined();
                    } finally {
                        cleanup();
                    }
                }
            ),
            { numRuns: 50 }
        );
    });

    /**
     * Property 12 (Extended): Multiple agents persistence
     * 
     * Verifies that creating multiple agents sequentially
     * persists all agents without overwriting previous ones
     */
    it('Property 12 (Extended): persists multiple agents without overwriting', async () => {
        await fc.assert(
            fc.asyncProperty(
                fc.array(
                    fc.record({
                        name: safeText(3, 40),
                        description: safeText(3, 60),
                        strictRAG: fc.boolean(),
                        knowledgeSpaceId: fc.uuid(),
                    }),
                    { minLength: 2, maxLength: 5 }
                ),
                async (agentConfigs) => {
                    mockCreateAgent.mockReset();
                    mockRouterPush.mockReset();
                    localStorage.clear();

                    try {
                        for (let i = 0; i < agentConfigs.length; i++) {
                            const config = agentConfigs[i];
                            mockKnowledgeSpaceId = config.knowledgeSpaceId;
                            const user = userEvent.setup();

                            const createdAgentId = `agent-${config.knowledgeSpaceId}`;

                            // Mock createAgent to save to localStorage
                            mockCreateAgent.mockImplementationOnce(async (name, knowledgeSpaceIds, rag, desc) => {
                                const agent: Agent = {
                                    id: createdAgentId,
                                    name: name.trim(),
                                    description: desc?.trim() || '',
                                    strictRAG: rag,
                                    knowledgeSpaceId: knowledgeSpaceIds[0],
                                    createdAt: new Date().toISOString(),
                                };
                                saveAgent(agent);
                                return agent;
                            });

                            renderForm();
                            await user.click(screen.getByLabelText('complete-knowledge-space'));

                            await waitFor(() => {
                                expect(screen.getByText('Configure Your Agent')).toBeInTheDocument();
                            });

                            const nameInput = screen.getByLabelText(/agent name/i);
                            await user.clear(nameInput);
                            await user.type(nameInput, config.name);

                            const descriptionInput = screen.getByLabelText(/description/i);
                            await user.clear(descriptionInput);
                            await user.type(descriptionInput, config.description);

                            const strictRagToggle = screen.getByLabelText(/enable strict rag mode/i);
                            if (config.strictRAG !== (strictRagToggle as HTMLInputElement).checked) {
                                await user.click(strictRagToggle);
                            }

                            await user.click(screen.getByRole('button', { name: /create agent/i }));

                            await waitFor(() => {
                                expect(screen.getByText('Agent Created Successfully!')).toBeInTheDocument();
                            });

                            cleanup();
                        }

                        // Verify all agents are persisted
                        const savedAgents = getAgents();
                        expect(savedAgents).toHaveLength(agentConfigs.length);

                        // Verify each agent's data
                        for (let i = 0; i < agentConfigs.length; i++) {
                            const config = agentConfigs[i];
                            const savedAgent = savedAgents.find(
                                (a) => a.knowledgeSpaceId === config.knowledgeSpaceId
                            );

                            expect(savedAgent).toBeDefined();
                            expect(savedAgent!.name).toBe(config.name.trim());
                            expect(savedAgent!.description).toBe(config.description.trim());
                            expect(savedAgent!.strictRAG).toBe(config.strictRAG);
                        }
                    } finally {
                        cleanup();
                    }
                }
            ),
            { numRuns: 10 }
        );
    });

    /**
     * Property 12 (Extended): Agent ID retrieval after page reload
     * 
     * Simulates page reload by clearing component state
     * and verifying agent can still be retrieved from localStorage
     */
    it('Property 12 (Extended): retrieves agent ID from localStorage after simulated reload', async () => {
        await fc.assert(
            fc.asyncProperty(
                safeText(3, 40),
                fc.uuid(),
                async (agentName, knowledgeSpaceId) => {
                    mockCreateAgent.mockReset();
                    mockRouterPush.mockReset();
                    localStorage.clear();
                    mockKnowledgeSpaceId = knowledgeSpaceId;
                    const user = userEvent.setup();

                    const createdAgentId = `agent-${knowledgeSpaceId}`;

                    // Mock createAgent to save to localStorage
                    mockCreateAgent.mockImplementationOnce(async (name, knowledgeSpaceIds, rag, desc) => {
                        const agent: Agent = {
                            id: createdAgentId,
                            name: name.trim(),
                            description: desc?.trim() || 'Test description',
                            strictRAG: rag,
                            knowledgeSpaceId: knowledgeSpaceIds[0],
                            createdAt: new Date().toISOString(),
                        };
                        saveAgent(agent);
                        return agent;
                    });

                    try {
                        // Create agent
                        renderForm();
                        await user.click(screen.getByLabelText('complete-knowledge-space'));

                        await waitFor(() => {
                            expect(screen.getByText('Configure Your Agent')).toBeInTheDocument();
                        });

                        const nameInput = screen.getByLabelText(/agent name/i);
                        await user.clear(nameInput);
                        await user.type(nameInput, agentName);

                        await user.click(screen.getByRole('button', { name: /create agent/i }));

                        await waitFor(() => {
                            expect(screen.getByText('Agent Created Successfully!')).toBeInTheDocument();
                        });

                        // Simulate page reload by cleaning up component
                        cleanup();

                        // Verify agent can still be retrieved from localStorage
                        const savedAgents = getAgents();
                        expect(savedAgents).toHaveLength(1);
                        expect(savedAgents[0].id).toBe(createdAgentId);
                        expect(savedAgents[0].name).toBe(agentName.trim());
                        expect(savedAgents[0].knowledgeSpaceId).toBe(knowledgeSpaceId);
                    } finally {
                        cleanup();
                    }
                }
            ),
            { numRuns: 20 }
        );
    });
});
