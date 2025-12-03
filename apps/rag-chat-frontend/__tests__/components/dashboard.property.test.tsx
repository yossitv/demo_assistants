/**
 * **Feature: apps--rag-chat-frontend--dashboar-renew**
 */
import React from 'react';
import { render, screen, fireEvent, cleanup, act } from '@testing-library/react';
import fc from 'fast-check';
import { Sidebar, SidebarTab } from '@/app/dashboard/components/Sidebar';
import { ChatPanel } from '@/app/dashboard/components/ChatPanel';
import { APIKeysPanel } from '@/app/dashboard/components/APIKeysPanel';
import { KnowledgeManagementList } from '@/components/dashboard/KnowledgeManagementList';
import { AgentManagementList } from '@/components/dashboard/AgentManagementList';
import { Agent, KnowledgeSpace } from '@/types';

jest.mock('@/components/ChatWidget', () => ({
  __esModule: true,
  default: () => <div data-testid="chat-widget" />,
}));
jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: jest.fn() }),
}));

describe('Dashboard UI properties', () => {
  // **Feature: apps--rag-chat-frontend--dashboar-renew, Property 1: Tab navigation consistency**
  it('Property 1: tab navigation consistency', () => {
    fc.assert(
      fc.property(fc.constantFrom<SidebarTab>('chat', 'vector-knowledge', 'agents', 'api-keys'), (tab) => {
        cleanup();
        const onTabChange = jest.fn();
        const { rerender } = render(
          <Sidebar activeTab="chat" onTabChange={onTabChange} isOpen onClose={() => {}} />
        );

        const labelMap: Record<SidebarTab, string> = {
          chat: 'Chat',
          'vector-knowledge': 'Vector Knowledge',
          agents: 'Agents',
          'api-keys': 'API Keys',
        };
        const matcher = new RegExp(`^${labelMap[tab]}`, 'i');
        const [target] = screen.getAllByRole('button', { name: matcher });
        fireEvent.click(target);
        expect(onTabChange).toHaveBeenCalledWith(tab);

        rerender(<Sidebar activeTab={tab} onTabChange={onTabChange} isOpen onClose={() => {}} />);
        expect(screen.getAllByRole('button', { name: matcher })[0].getAttribute('aria-current')).toBe('page');
      }),
      { numRuns: 20 }
    );
  });

  // **Feature: apps--rag-chat-frontend--dashboar-renew, Property 2: Agent dropdown population**
  it('Property 2: agent dropdown population', () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.record({
            id: fc.uuid(),
            name: fc
              .string({ minLength: 1, maxLength: 20 })
              .filter((value) => /^[A-Za-z]+$/.test(value)),
            description: fc.string({ maxLength: 30 }),
          }),
          { minLength: 1, maxLength: 5 }
        ),
        (items) => {
          cleanup();
          const agents: Agent[] = items.map((item) => ({
            ...item,
            strictRAG: true,
            knowledgeSpaceId: 'ks',
            createdAt: new Date().toISOString(),
          }));

          render(
            <ChatPanel
              agents={agents}
              selectedAgentId={agents[0].id}
              onAgentChange={() => {}}
              onRequestCreateAgent={() => {}}
            />
          );

          agents.forEach((agent) => {
            expect(screen.getByRole('option', { name: agent.name })).toBeInTheDocument();
          });
        }
      ),
      { numRuns: 15 }
    );
  });

  // **Feature: apps--rag-chat-frontend--dashboar-renew, Property 7: Knowledge space information display**
  it('Property 7: knowledge space information display', () => {
    fc.assert(
      fc.property(
        fc.record({
          id: fc.uuid(),
          name: fc
            .string({ minLength: 1, maxLength: 20 })
            .filter((value) => /^[A-Za-z]+$/.test(value)),
          type: fc.constantFrom<KnowledgeSpace['type']>('web', 'document', 'product', 'custom'),
          status: fc.constantFrom<NonNullable<KnowledgeSpace['status']>>('processing', 'completed', 'partial', 'error'),
          documentCount: fc.nat({ max: 100 }),
          lastUpdatedAt: fc.date().map((d) => d.toISOString()),
        }),
        (ks) => {
          cleanup();
          render(
            <KnowledgeManagementList
              knowledgeSpaces={[ks]}
              loading={false}
              error={null}
              onRefresh={() => {}}
              onDeleteKnowledge={() => Promise.resolve()}
              getLinkedAgentCount={() => 0}
            />
          );

          expect(screen.getByText(ks.name)).toBeInTheDocument();
          expect(screen.getByText(ks.type)).toBeInTheDocument();
          if (ks.status) {
            expect(screen.getByText(ks.status)).toBeInTheDocument();
          }
          expect(screen.getByText(String(ks.documentCount))).toBeInTheDocument();
        }
      ),
      { numRuns: 10 }
    );
  });

  // **Feature: apps--rag-chat-frontend--dashboar-renew, Property 8: Complete agent information display**
  it('Property 8: complete agent information display and go-to-chat action', () => {
    cleanup();
    const knowledgeSpaces: KnowledgeSpace[] = [
      { id: 'ks-1', name: 'Docs', type: 'document', status: 'completed', documentCount: 2, lastUpdatedAt: new Date().toISOString() },
    ];

    const agents: Agent[] = [
      {
        id: 'agent-1',
        name: 'Helper',
        description: 'Assists with docs',
        strictRAG: true,
        knowledgeSpaceId: 'ks-1',
        createdAt: new Date().toISOString(),
      },
    ];

    const onGoToChat = jest.fn();

    render(
      <AgentManagementList
        knowledgeSpaces={knowledgeSpaces}
        agents={agents}
        loading={false}
        error={null}
        onRefresh={() => {}}
        onGoToChat={onGoToChat}
      />
    );

    expect(screen.getByText('Helper')).toBeInTheDocument();
    expect(screen.getByText('Assists with docs')).toBeInTheDocument();
    expect(screen.getByText('Docs')).toBeInTheDocument();

    fireEvent.click(screen.getByLabelText('Go to chat'));
    expect(onGoToChat).toHaveBeenCalledWith(agents[0]);
  });

  // **Feature: apps--rag-chat-frontend--dashboar-renew, Property 13: API key masking**
  it('Property 13: API key masking hides all characters on UI', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 4, maxLength: 32 }).filter((key) => /^[A-Za-z0-9]+$/.test(key)),
        (key) => {
          cleanup();
          render(<APIKeysPanel apiKey={key} apiBaseUrl="https://api.example.com" modelExample="agent_demo" />);
          const masked = screen.getByTestId('masked-key').textContent || '';
          expect(masked).toBe('*'.repeat(Math.max(key.length, 4)));
        }
      ),
      { numRuns: 15 }
    );
  });

  // **Feature: apps--rag-chat-frontend--dashboar-renew, Property 14: Full key clipboard copy**
  it('Property 14: full key clipboard copy', async () => {
    const writeText = jest.fn().mockResolvedValue(undefined);
    Object.assign(window.navigator as unknown as { clipboard: { writeText: typeof writeText } }, { clipboard: { writeText } });

    cleanup();
    render(<APIKeysPanel apiKey="abcd1234" apiBaseUrl="https://api.example.com" modelExample="agent_demo" />);
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /copy full api key/i }));
    });
    expect(writeText).toHaveBeenCalledWith('abcd1234');
  });

  // **Feature: apps--rag-chat-frontend--dashboar-renew, Property 15: Curl example format**
  it('Property 15: curl example format', () => {
    cleanup();
    render(<APIKeysPanel apiKey="abcd1234" apiBaseUrl="https://api.example.com" modelExample="agent_demo" />);
    const content = screen.getByTestId('curl-example').textContent || '';
    expect(content).toContain('Authorization: Bearer ********');
    expect(content).toContain('"model":"agent_demo"');
  });
});
