/**
 * @jest-environment jsdom
 *
 * Property-based tests for CreateAgentForm flow
 * Properties 15.1–15.5: multi-step progression, validation, API calls, error handling, and navigation
 */

import '@testing-library/jest-dom';
import * as fc from 'fast-check';
import { render, screen, waitFor, cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import CreateAgentForm from '@/components/CreateAgentForm';
import { Agent } from '@/types';

let mockKnowledgeSpaceId = 'ks-default';
const mockCreateAgent = jest.fn();
const mockRouterPush = jest.fn();

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

describe('CreateAgentForm Property Tests (15.1–15.5)', () => {
  beforeEach(() => {
    mockCreateAgent.mockReset();
    mockRouterPush.mockReset();
    mockKnowledgeSpaceId = 'ks-default';
    cleanup();
  });

  afterEach(() => {
    cleanup();
  });

  const renderForm = () => render(<CreateAgentForm />);

  it('Property 15.1: advances to agent configuration after knowledge space success', async () => {
    await fc.assert(
      fc.asyncProperty(fc.uuid(), async (knowledgeSpaceId) => {
        mockCreateAgent.mockReset();
        mockRouterPush.mockReset();
        mockKnowledgeSpaceId = knowledgeSpaceId;
        const user = userEvent.setup();

        try {
          renderForm();

          await user.click(screen.getByLabelText('complete-knowledge-space'));

          await waitFor(() => {
            expect(screen.getByText('Configure Your Agent')).toBeInTheDocument();
          });
        } finally {
          cleanup();
        }
      }),
      { numRuns: 10 }
    );
  });

  it('Property 15.2: prevents submission when agent name is missing', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc
          .string({ minLength: 1, maxLength: 10 })
          .map((spaces) => spaces.split('').map(() => ' ').join('')),
        async (invalidName) => {
          mockCreateAgent.mockReset();
          mockRouterPush.mockReset();
          const user = userEvent.setup();

          try {
            renderForm();
            await user.click(screen.getByLabelText('complete-knowledge-space'));

            await waitFor(() => {
              expect(screen.getByText('Configure Your Agent')).toBeInTheDocument();
            });

            const nameInput = screen.getByLabelText(/agent name/i);
            await user.clear(nameInput);
            await user.type(nameInput, invalidName);

            await user.click(screen.getByRole('button', { name: /create agent/i }));

            expect(
              await screen.findByText('Agent name is required and must be 100 characters or less')
            ).toBeInTheDocument();
            expect(mockCreateAgent).not.toHaveBeenCalled();
          } finally {
            cleanup();
          }
        }
      ),
      { numRuns: 6 }
    );
  });

  // Feature: web-mvp, Property 11: Agent creation success display
  it('Property 15.3: displays agentId and navigation button on successful agent creation', async () => {
    await fc.assert(
      fc.asyncProperty(
        safeText(3, 40),
        safeText(3, 60),
        fc.boolean(),
        fc.uuid(),
        async (agentName, description, strictRAG, knowledgeSpaceId) => {
          mockCreateAgent.mockReset();
          mockRouterPush.mockReset();
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

          mockCreateAgent.mockResolvedValueOnce(returnedAgent);

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
              expect(mockCreateAgent).toHaveBeenCalledWith(
                agentName.trim(),
                [knowledgeSpaceId],
                strictRAG,
                description.trim()
              );
            });

            // Verify success message is displayed
            expect(await screen.findByText('Agent Created Successfully!')).toBeInTheDocument();
            
            // Verify agentId is displayed
            expect(screen.getByText(`Agent ID: ${createdAgentId}`)).toBeInTheDocument();
            
            // Verify navigation button is present
            expect(screen.getByText('Start Chatting')).toBeInTheDocument();
          } finally {
            cleanup();
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  // Feature: web-mvp, Property 13: Agent creation error handling
  it('Property 15.5: displays error message for any failed agent creation', async () => {
    await fc.assert(
      fc.asyncProperty(
        safeText(3, 40),
        safeText(5, 80),
        fc.uuid(),
        async (agentName, errorMessage, knowledgeSpaceId) => {
          mockCreateAgent.mockReset();
          mockRouterPush.mockReset();
          mockKnowledgeSpaceId = knowledgeSpaceId;
          const user = userEvent.setup();

          // Normalize whitespace in error message (trim and collapse multiple spaces)
          const normalizedErrorMessage = errorMessage.trim().replace(/\s+/g, ' ');

          // Mock agent creation to fail with the generated error message
          mockCreateAgent.mockRejectedValueOnce(new Error(normalizedErrorMessage));

          try {
            renderForm();
            await user.click(screen.getByLabelText('complete-knowledge-space'));

            await waitFor(() => {
              expect(screen.getByText('Configure Your Agent')).toBeInTheDocument();
            });

            const nameInput = screen.getByLabelText(/agent name/i);
            await user.clear(nameInput);
            await user.type(nameInput, agentName);

            await user.click(screen.getByRole('button', { name: /create agent/i }));

            // Verify error message is displayed (using flexible text matcher for whitespace)
            expect(await screen.findByText((content, element) => {
              // Normalize the displayed text for comparison
              const normalizedContent = content.replace(/\s+/g, ' ').trim();
              return normalizedContent === normalizedErrorMessage;
            })).toBeInTheDocument();
            
            // Verify retry button is available
            expect(screen.getByText('Retry')).toBeInTheDocument();
          } finally {
            cleanup();
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('Property 15.5: navigates to chat with created agent on success', async () => {
    await fc.assert(
      fc.asyncProperty(
        safeText(3, 40),
        fc.uuid(),
        async (agentName, knowledgeSpaceId) => {
          mockCreateAgent.mockReset();
          mockRouterPush.mockReset();
          mockKnowledgeSpaceId = knowledgeSpaceId;
          const user = userEvent.setup();

          const createdAgentId = `agent-${knowledgeSpaceId}`;
          mockCreateAgent.mockResolvedValueOnce({
            id: createdAgentId,
            name: agentName.trim(),
            description: '',
            strictRAG: true,
            knowledgeSpaceId,
            createdAt: new Date().toISOString(),
          });

          try {
            renderForm();
            await user.click(screen.getByLabelText('complete-knowledge-space'));

            await waitFor(() => {
              expect(screen.getByText('Configure Your Agent')).toBeInTheDocument();
            });

            const nameInput = screen.getByLabelText(/agent name/i);
            await user.clear(nameInput);
            await user.type(nameInput, agentName);

            await user.click(screen.getByRole('button', { name: /create agent/i }));

            await waitFor(() =>
              expect(screen.getByText('Agent Created Successfully!')).toBeInTheDocument()
            );

            await user.click(screen.getByText('Start Chatting'));

            expect(mockRouterPush).toHaveBeenCalledWith(`/agents/${createdAgentId}`);
          } finally {
            cleanup();
          }
        }
      ),
      { numRuns: 5 }
    );
  });
});
