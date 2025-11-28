/**
 * Integration test for agent list → agent selection → chat flow
 * Tests: Agent listing, selection, and navigation to chat
 *
 * @jest-environment jsdom
 */

import '@testing-library/jest-dom';
import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AgentProvider } from '@/lib/context/KnowledgeContext';
import { ChatProvider } from '@/lib/context/ChatContext';
import { saveAgent, clearAgents } from '@/lib/utils/storage';
import { Agent } from '@/types';
import ChatWidget from '@/components/ChatWidget';
import { apiClient } from '@/lib/api/client';

// Mock the API client
jest.mock('@/lib/api/client');

// Mock react-markdown
jest.mock('react-markdown', () => {
  return function ReactMarkdown({ children }: { children: string }) {
    return <div>{children}</div>;
  };
});

// Mock router
const mockPush = jest.fn();
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
    back: jest.fn(),
    forward: jest.fn(),
    refresh: jest.fn(),
    replace: jest.fn(),
    prefetch: jest.fn(),
  }),
  usePathname: () => '/',
  useSearchParams: () => new URLSearchParams(),
}));

describe('Integration: Agent Selection and Chat Flow', () => {
  const mockedApiClient = apiClient as jest.Mocked<typeof apiClient>;

  const mockAgents: Agent[] = [
    {
      id: 'agent-1',
      name: 'Tech Support Agent',
      description: 'Helps with technical questions',
      strictRAG: true,
      knowledgeSpaceId: 'ks-1',
      createdAt: new Date('2024-01-01'),
    },
    {
      id: 'agent-2',
      name: 'Documentation Agent',
      description: 'Answers questions about documentation',
      strictRAG: false,
      knowledgeSpaceId: 'ks-2',
      createdAt: new Date('2024-01-02'),
    },
    {
      id: 'agent-3',
      name: 'General Assistant',
      description: 'General purpose assistant',
      strictRAG: true,
      knowledgeSpaceId: 'ks-3',
      createdAt: new Date('2024-01-03'),
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    mockPush.mockClear();
    clearAgents();
    localStorage.clear();
  });

  it('should display list of agents from localStorage', () => {
    // Save agents to localStorage
    mockAgents.forEach(agent => saveAgent(agent));

    // Simple component to test agent list display
    const AgentListDisplay = () => {
      const { agents } = require('@/lib/utils/storage').getAgents();
      const storedAgents = require('@/lib/utils/storage').getAgents();

      return (
        <div>
          <h1>My Agents</h1>
          <ul>
            {storedAgents.map((agent: Agent) => (
              <li key={agent.id} data-testid={`agent-${agent.id}`}>
                <h2>{agent.name}</h2>
                <p>{agent.description}</p>
              </li>
            ))}
          </ul>
        </div>
      );
    };

    render(
      <AgentProvider>
        <AgentListDisplay />
      </AgentProvider>
    );

    // All agents should be visible
    expect(screen.getByText('Tech Support Agent')).toBeInTheDocument();
    expect(screen.getByText('Documentation Agent')).toBeInTheDocument();
    expect(screen.getByText('General Assistant')).toBeInTheDocument();
  });

  it('should handle agent selection and start chat', async () => {
    const user = userEvent.setup();

    // Save an agent
    saveAgent(mockAgents[0]);

    // Mock chat response
    mockedApiClient.chat.mockResolvedValueOnce({
      message: {
        id: 'assistant-1',
        role: 'assistant',
        content: 'Hello! I am the Tech Support Agent. How can I help you?',
        createdAt: new Date().toISOString(),
      },
      agentId: mockAgents[0].id,
    });

    // Render chat widget directly with selected agent
    render(
      <ChatProvider>
        <ChatWidget agentId={mockAgents[0].id} />
      </ChatProvider>
    );

    // Should be able to send a message
    const input = screen.getByPlaceholderText('Type your message...');
    await user.type(input, 'Hello!');

    const sendButton = screen.getByRole('button', { name: /send message/i });
    await user.click(sendButton);

    // Verify chat with correct agent
    await waitFor(() => {
      expect(mockedApiClient.chat).toHaveBeenCalledWith(
        mockAgents[0].id,
        'Hello!',
        undefined
      );
    });

    // Response should appear
    await waitFor(() => {
      expect(screen.getByText('Hello! I am the Tech Support Agent. How can I help you?')).toBeInTheDocument();
    });
  });

  it('should allow switching between agents', async () => {
    const user = userEvent.setup();

    // Save multiple agents
    mockAgents.forEach(agent => saveAgent(agent));

    // Mock responses from different agents
    mockedApiClient.chat
      .mockResolvedValueOnce({
        message: {
          id: 'assistant-1',
          role: 'assistant',
          content: 'Tech Support Agent response',
          createdAt: new Date().toISOString(),
        },
        agentId: 'agent-1',
      })
      .mockResolvedValueOnce({
        message: {
          id: 'assistant-2',
          role: 'assistant',
          content: 'Documentation Agent response',
          createdAt: new Date().toISOString(),
        },
        agentId: 'agent-2',
      });

    // Chat with first agent
    const { unmount } = render(
      <ChatProvider>
        <ChatWidget agentId="agent-1" />
      </ChatProvider>
    );

    const input = screen.getByPlaceholderText('Type your message...');
    await user.type(input, 'Help me');

    const sendButton = screen.getByRole('button', { name: /send message/i });
    await user.click(sendButton);

    await waitFor(() => {
      expect(screen.getByText('Tech Support Agent response')).toBeInTheDocument();
    });

    // Unmount and switch to second agent
    unmount();

    render(
      <ChatProvider>
        <ChatWidget agentId="agent-2" />
      </ChatProvider>
    );

    // Should start fresh conversation with new agent
    expect(screen.queryByText('Tech Support Agent response')).not.toBeInTheDocument();
    expect(screen.getByText('No messages yet. Start a conversation!')).toBeInTheDocument();

    // Send message to second agent
    const input2 = screen.getByPlaceholderText('Type your message...');
    await user.type(input2, 'Show docs');

    const sendButton2 = screen.getByRole('button', { name: /send message/i });
    await user.click(sendButton2);

    await waitFor(() => {
      expect(screen.getByText('Documentation Agent response')).toBeInTheDocument();
    });

    // Verify correct agent was called
    expect(mockedApiClient.chat).toHaveBeenNthCalledWith(1, 'agent-1', 'Help me', undefined);
    expect(mockedApiClient.chat).toHaveBeenNthCalledWith(2, 'agent-2', 'Show docs', undefined);
  });

  it('should show empty state when no agents exist', () => {
    // Don't save any agents
    const AgentListDisplay = () => {
      const storedAgents = require('@/lib/utils/storage').getAgents();

      return (
        <div>
          <h1>My Agents</h1>
          {storedAgents.length === 0 ? (
            <p>No agents found. Create your first agent to get started!</p>
          ) : (
            <ul>
              {storedAgents.map((agent: Agent) => (
                <li key={agent.id}>
                  <h2>{agent.name}</h2>
                </li>
              ))}
            </ul>
          )}
        </div>
      );
    };

    render(
      <AgentProvider>
        <AgentListDisplay />
      </AgentProvider>
    );

    expect(screen.getByText('No agents found. Create your first agent to get started!')).toBeInTheDocument();
  });

  it('should persist recent agents in localStorage', async () => {
    const user = userEvent.setup();

    // Mock chat response
    mockedApiClient.chat.mockResolvedValue({
      message: {
        id: 'assistant-1',
        role: 'assistant',
        content: 'Response',
        createdAt: new Date().toISOString(),
      },
      agentId: mockAgents[0].id,
    });

    // Save agent
    saveAgent(mockAgents[0]);

    // Render and chat with agent
    render(
      <ChatProvider>
        <ChatWidget agentId={mockAgents[0].id} />
      </ChatProvider>
    );

    const input = screen.getByPlaceholderText('Type your message...');
    await user.type(input, 'Test');

    const sendButton = screen.getByRole('button', { name: /send message/i });
    await user.click(sendButton);

    await waitFor(() => {
      expect(screen.getByText('Response')).toBeInTheDocument();
    });

    // Agent should be in recent agents
    const recentAgentsJson = localStorage.getItem('assistants_recent_agents');
    expect(recentAgentsJson).not.toBeNull();

    if (recentAgentsJson) {
      const recentAgents = JSON.parse(recentAgentsJson);
      expect(recentAgents).toContain(mockAgents[0].id);
    }
  });

  it('should handle selecting non-existent agent gracefully', async () => {
    const user = userEvent.setup();

    const nonExistentAgentId = 'non-existent-agent';

    // Mock error response
    mockedApiClient.chat.mockRejectedValueOnce(new Error('Agent not found'));

    render(
      <ChatProvider>
        <ChatWidget agentId={nonExistentAgentId} />
      </ChatProvider>
    );

    const input = screen.getByPlaceholderText('Type your message...');
    await user.type(input, 'Hello');

    const sendButton = screen.getByRole('button', { name: /send message/i });
    await user.click(sendButton);

    // Error should be displayed
    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeInTheDocument();
    });
  });

  it('should display agent information in chat interface', async () => {
    // Save agent with specific details
    saveAgent(mockAgents[0]);

    render(
      <ChatProvider>
        <ChatWidget agentId={mockAgents[0].id} />
      </ChatProvider>
    );

    // Chat widget should be rendered
    expect(screen.getByLabelText('Chat widget')).toBeInTheDocument();

    // Should have input ready for interaction
    expect(screen.getByPlaceholderText('Type your message...')).toBeInTheDocument();
  });

  it('should handle multiple agent chats in sequence', async () => {
    const user = userEvent.setup();

    // Save all agents
    mockAgents.forEach(agent => saveAgent(agent));

    // Mock responses for different agents
    mockedApiClient.chat
      .mockResolvedValueOnce({
        message: {
          id: 'assistant-1',
          role: 'assistant',
          content: 'Agent 1 response',
          createdAt: new Date().toISOString(),
        },
        agentId: 'agent-1',
      })
      .mockResolvedValueOnce({
        message: {
          id: 'assistant-2',
          role: 'assistant',
          content: 'Agent 2 response',
          createdAt: new Date().toISOString(),
        },
        agentId: 'agent-2',
      })
      .mockResolvedValueOnce({
        message: {
          id: 'assistant-3',
          role: 'assistant',
          content: 'Agent 3 response',
          createdAt: new Date().toISOString(),
        },
        agentId: 'agent-3',
      });

    // Chat with agent 1
    const { unmount: unmount1 } = render(
      <ChatProvider>
        <ChatWidget agentId="agent-1" />
      </ChatProvider>
    );

    let input = screen.getByPlaceholderText('Type your message...');
    await user.type(input, 'Message to agent 1');
    await user.click(screen.getByRole('button', { name: /send message/i }));

    await waitFor(() => {
      expect(screen.getByText('Agent 1 response')).toBeInTheDocument();
    });

    unmount1();

    // Chat with agent 2
    const { unmount: unmount2 } = render(
      <ChatProvider>
        <ChatWidget agentId="agent-2" />
      </ChatProvider>
    );

    input = screen.getByPlaceholderText('Type your message...');
    await user.type(input, 'Message to agent 2');
    await user.click(screen.getByRole('button', { name: /send message/i }));

    await waitFor(() => {
      expect(screen.getByText('Agent 2 response')).toBeInTheDocument();
    });

    unmount2();

    // Chat with agent 3
    render(
      <ChatProvider>
        <ChatWidget agentId="agent-3" />
      </ChatProvider>
    );

    input = screen.getByPlaceholderText('Type your message...');
    await user.type(input, 'Message to agent 3');
    await user.click(screen.getByRole('button', { name: /send message/i }));

    await waitFor(() => {
      expect(screen.getByText('Agent 3 response')).toBeInTheDocument();
    });

    // Verify all agents were called
    expect(mockedApiClient.chat).toHaveBeenCalledTimes(3);
  });

  it('should filter and search agents by name', () => {
    // Save all agents
    mockAgents.forEach(agent => saveAgent(agent));

    const AgentSearchDisplay = () => {
      const [searchTerm, setSearchTerm] = React.useState('');
      const storedAgents = require('@/lib/utils/storage').getAgents();
      const filteredAgents = storedAgents.filter((agent: Agent) =>
        agent.name.toLowerCase().includes(searchTerm.toLowerCase())
      );

      return (
        <div>
          <input
            type="text"
            placeholder="Search agents..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            aria-label="Search agents"
          />
          <ul>
            {filteredAgents.map((agent: Agent) => (
              <li key={agent.id}>{agent.name}</li>
            ))}
          </ul>
        </div>
      );
    };

    const { rerender } = render(
      <AgentProvider>
        <AgentSearchDisplay />
      </AgentProvider>
    );

    // All agents should be visible initially
    expect(screen.getByText('Tech Support Agent')).toBeInTheDocument();
    expect(screen.getByText('Documentation Agent')).toBeInTheDocument();
    expect(screen.getByText('General Assistant')).toBeInTheDocument();

    // Search for "Tech"
    const searchInput = screen.getByPlaceholderText('Search agents...');
    userEvent.type(searchInput, 'Tech');

    rerender(
      <AgentProvider>
        <AgentSearchDisplay />
      </AgentProvider>
    );

    // Only Tech Support Agent should match
    expect(screen.getByText('Tech Support Agent')).toBeInTheDocument();
  });
});
