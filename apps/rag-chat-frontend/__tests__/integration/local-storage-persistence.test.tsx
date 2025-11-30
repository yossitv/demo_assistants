/**
 * Integration test for local storage persistence across page reloads
 * Tests: Agent persistence, recent agents, selected agent, and data recovery
 *
 * @jest-environment jsdom
 */

import '@testing-library/jest-dom';
import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AgentProvider, useAgent } from '@/lib/context/KnowledgeContext';
import { ChatProvider } from '@/lib/context/ChatContext';
import {
  saveAgent,
  getAgents,
  getRecentAgents,
  clearAgents,
} from '@/lib/utils/storage';
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

describe('Integration: Local Storage Persistence', () => {
  const mockedApiClient = apiClient as jest.Mocked<typeof apiClient>;

  const mockAgents: Agent[] = [
    {
      id: 'agent-1',
      name: 'Agent One',
      description: 'First agent',
      strictRAG: true,
      knowledgeSpaceId: 'ks-1',
      createdAt: '2024-01-01T00:00:00.000Z',
    },
    {
      id: 'agent-2',
      name: 'Agent Two',
      description: 'Second agent',
      strictRAG: false,
      knowledgeSpaceId: 'ks-2',
      createdAt: '2024-01-02T00:00:00.000Z',
    },
    {
      id: 'agent-3',
      name: 'Agent Three',
      description: 'Third agent',
      strictRAG: true,
      knowledgeSpaceId: 'ks-3',
      createdAt: '2024-01-03T00:00:00.000Z',
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    clearAgents();
    localStorage.clear();
  });

  describe('Agent Persistence', () => {
    it('should persist agents to localStorage when saved', () => {
      // Initially no agents
      expect(getAgents()).toHaveLength(0);

      // Save agents
      mockAgents.forEach(agent => saveAgent(agent));

      // Should be persisted
      const savedAgents = getAgents();
      expect(savedAgents).toHaveLength(3);
      expect(savedAgents.map(a => a.id)).toEqual(['agent-1', 'agent-2', 'agent-3']);
    });

    it('should load agents from localStorage on mount', () => {
      // Pre-populate localStorage
      mockAgents.forEach(agent => saveAgent(agent));

      // Test component that loads agents
      const AgentListComponent = () => {
        const [agents, setAgents] = React.useState<Agent[]>([]);

        React.useEffect(() => {
          setAgents(getAgents());
        }, []);

        return (
          <div>
            <h1>Agents</h1>
            {agents.map(agent => (
              <div key={agent.id} data-testid={`agent-${agent.id}`}>
                {agent.name}
              </div>
            ))}
          </div>
        );
      };

      render(
        <AgentProvider>
          <AgentListComponent />
        </AgentProvider>
      );

      // All agents should be loaded and displayed
      expect(screen.getByText('Agent One')).toBeInTheDocument();
      expect(screen.getByText('Agent Two')).toBeInTheDocument();
      expect(screen.getByText('Agent Three')).toBeInTheDocument();
    });

    it('should update existing agent when saving with same ID', () => {
      // Save initial agent
      saveAgent(mockAgents[0]);

      expect(getAgents()).toHaveLength(1);
      expect(getAgents()[0].description).toBe('First agent');

      // Update the agent
      const updatedAgent: Agent = {
        ...mockAgents[0],
        description: 'Updated description',
      };

      saveAgent(updatedAgent);

      // Should still have only one agent with updated data
      const agents = getAgents();
      expect(agents).toHaveLength(1);
      expect(agents[0].description).toBe('Updated description');
    });

    it('should preserve agent data across simulated page reloads', () => {
      // Save agents
      mockAgents.forEach(agent => saveAgent(agent));

      // Simulate page reload by creating new component instance
      const { unmount } = render(
        <AgentProvider>
          <div>First Mount</div>
        </AgentProvider>
      );

      unmount();

      // Second mount - should load from localStorage
      const AgentDisplayComponent = () => {
        const [agents, setAgents] = React.useState<Agent[]>([]);

        React.useEffect(() => {
          setAgents(getAgents());
        }, []);

        return (
          <div>
            <p>Agent Count: {agents.length}</p>
            {agents.map(agent => (
              <div key={agent.id}>{agent.name}</div>
            ))}
          </div>
        );
      };

      render(
        <AgentProvider>
          <AgentDisplayComponent />
        </AgentProvider>
      );

      // Data should persist
      expect(screen.getByText('Agent Count: 3')).toBeInTheDocument();
      expect(screen.getByText('Agent One')).toBeInTheDocument();
    });
  });

  describe('Recent Agents Tracking', () => {
    it('should track recently used agents', async () => {
      const user = userEvent.setup();

      // Only save the agent we're going to use
      saveAgent(mockAgents[0]);

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

      // Chat with agent 1
      render(
        <ChatProvider>
          <ChatWidget agentId={mockAgents[0].id} />
        </ChatProvider>
      );

      const input = screen.getByPlaceholderText('Type your message...');
      await user.type(input, 'Hello');

      const sendButton = screen.getByRole('button', { name: /send message/i });
      await user.click(sendButton);

      await waitFor(() => {
        expect(screen.getByText('Response')).toBeInTheDocument();
      });

      // Agent should be in recent agents
      const recentAgents = getRecentAgents();
      expect(recentAgents).toHaveLength(1);
      expect(recentAgents[0].id).toBe('agent-1');
    });

    it('should maintain recent agents list in order of usage', () => {
      // Save agents in specific order
      saveAgent(mockAgents[2]); // agent-3
      saveAgent(mockAgents[0]); // agent-1
      saveAgent(mockAgents[1]); // agent-2

      // Most recent should be agent-2, then agent-1, then agent-3
      const recentAgents = getRecentAgents();
      expect(recentAgents.map(a => a.id)).toEqual(['agent-2', 'agent-1', 'agent-3']);
    });

    it('should limit recent agents list to specified number', () => {
      // Create more than 5 agents
      const manyAgents: Agent[] = Array.from({ length: 10 }, (_, i) => ({
        id: `agent-${i}`,
        name: `Agent ${i}`,
        description: `Agent ${i}`,
        strictRAG: true,
        knowledgeSpaceId: `ks-${i}`,
        createdAt: new Date().toISOString(),
      }));

      // Save all agents
      manyAgents.forEach(agent => saveAgent(agent));

      // Should only return 5 most recent
      const recentAgents = getRecentAgents(5);
      expect(recentAgents).toHaveLength(5);
    });

    it('should move agent to top of recent list when accessed again', () => {
      // Save agents
      saveAgent(mockAgents[0]); // agent-1
      saveAgent(mockAgents[1]); // agent-2
      saveAgent(mockAgents[2]); // agent-3

      // Access agent-1 again
      saveAgent(mockAgents[0]);

      // agent-1 should now be most recent
      const recentAgents = getRecentAgents();
      expect(recentAgents[0].id).toBe('agent-1');
    });
  });

  describe('Selected Agent Persistence', () => {
    it('should persist selected agent ID to localStorage', async () => {
      const user = userEvent.setup();

      // Save agents
      mockAgents.forEach(agent => saveAgent(agent));

      // Component that uses AgentContext
      const SelectAgentComponent = () => {
        const { selectAgent, selectedAgent } = useAgent();

        return (
          <div>
            <button onClick={() => selectAgent(mockAgents[1])}>
              Select Agent Two
            </button>
            <div>
              Selected: {selectedAgent ? selectedAgent.name : 'None'}
            </div>
          </div>
        );
      };

      render(
        <AgentProvider>
          <SelectAgentComponent />
        </AgentProvider>
      );

      // Initially no selection
      expect(screen.getByText('Selected: None')).toBeInTheDocument();

      // Select an agent
      const selectButton = screen.getByText('Select Agent Two');
      await user.click(selectButton);

      // Wait for state update
      await waitFor(() => {
        expect(screen.getByText('Selected: Agent Two')).toBeInTheDocument();
      });

      // Check localStorage
      const selectedAgentId = localStorage.getItem('assistants_selected_agent');
      expect(selectedAgentId).toBe('agent-2');
    });

    it('should restore selected agent on mount', () => {
      // Pre-populate localStorage
      mockAgents.forEach(agent => saveAgent(agent));
      localStorage.setItem('assistants_selected_agent', 'agent-2');

      // Component that displays selected agent
      const DisplaySelectedComponent = () => {
        const { selectedAgent } = useAgent();

        return (
          <div>
            {selectedAgent ? (
              <p>Selected: {selectedAgent.name}</p>
            ) : (
              <p>No selection</p>
            )}
          </div>
        );
      };

      render(
        <AgentProvider>
          <DisplaySelectedComponent />
        </AgentProvider>
      );

      // Selected agent should be restored
      expect(screen.getByText('Selected: Agent Two')).toBeInTheDocument();
    });

    it('should handle missing selected agent gracefully', () => {
      // Set selected agent that doesn't exist in agents list
      localStorage.setItem('assistants_selected_agent', 'non-existent-agent');

      const DisplaySelectedComponent = () => {
        const { selectedAgent } = useAgent();

        return (
          <div>
            {selectedAgent ? (
              <p>Selected: {selectedAgent.name}</p>
            ) : (
              <p>No selection</p>
            )}
          </div>
        );
      };

      render(
        <AgentProvider>
          <DisplaySelectedComponent />
        </AgentProvider>
      );

      // Should handle gracefully
      expect(screen.getByText('No selection')).toBeInTheDocument();
    });
  });

  describe('Data Recovery and Cleanup', () => {
    it('should handle corrupted localStorage data gracefully', () => {
      // Set invalid JSON in localStorage
      localStorage.setItem('assistants_agents', 'invalid json{');

      // Should not crash and return empty array
      const agents = getAgents();
      expect(agents).toEqual([]);
    });

    it('should clear all agent data when clearAgents is called', () => {
      // Save agents and set selected agent
      mockAgents.forEach(agent => saveAgent(agent));
      localStorage.setItem('assistants_selected_agent', 'agent-1');

      // Verify data exists
      expect(getAgents()).toHaveLength(3);
      expect(localStorage.getItem('assistants_selected_agent')).toBe('agent-1');

      // Clear all
      clearAgents();

      // Should be empty
      expect(getAgents()).toHaveLength(0);
      expect(localStorage.getItem('assistants_agents')).toBeNull();
      expect(localStorage.getItem('assistants_recent_agents')).toBeNull();
    });

    it('should preserve agent data after errors', async () => {
      const user = userEvent.setup();

      // Save an agent
      saveAgent(mockAgents[0]);

      // Mock error response
      mockedApiClient.chat.mockRejectedValueOnce(new Error('Network error'));

      render(
        <ChatProvider>
          <ChatWidget agentId={mockAgents[0].id} />
        </ChatProvider>
      );

      // Try to send message (will fail)
      const input = screen.getByPlaceholderText('Type your message...');
      await user.type(input, 'Test');

      const sendButton = screen.getByRole('button', { name: /send message/i });
      await user.click(sendButton);

      await waitFor(() => {
        expect(screen.getByRole('alert')).toBeInTheDocument();
      });

      // Agent should still be in localStorage
      const agents = getAgents();
      expect(agents).toHaveLength(1);
      expect(agents[0].id).toBe('agent-1');
    });
  });

  describe('Cross-Component Persistence', () => {
    it('should share agent data across multiple component instances', () => {
      // Save agents
      mockAgents.forEach(agent => saveAgent(agent));

      // First component
      const ComponentA = () => {
        const agents = getAgents();
        return <div>Component A sees {agents.length} agents</div>;
      };

      // Second component
      const ComponentB = () => {
        const agents = getAgents();
        return <div>Component B sees {agents.length} agents</div>;
      };

      render(
        <AgentProvider>
          <ComponentA />
          <ComponentB />
        </AgentProvider>
      );

      // Both components should see the same data
      expect(screen.getByText('Component A sees 3 agents')).toBeInTheDocument();
      expect(screen.getByText('Component B sees 3 agents')).toBeInTheDocument();
    });

    it('should update all components when agent data changes', async () => {
      const user = userEvent.setup();

      // Initial agent
      saveAgent(mockAgents[0]);

      const ComponentWithActions = () => {
        const [agents, setAgents] = React.useState(getAgents());

        const addAgent = () => {
          saveAgent(mockAgents[1]);
          setAgents(getAgents());
        };

        return (
          <div>
            <p>Agent count: {agents.length}</p>
            <button onClick={addAgent}>Add Agent</button>
            {agents.map(agent => (
              <div key={agent.id}>{agent.name}</div>
            ))}
          </div>
        );
      };

      render(
        <AgentProvider>
          <ComponentWithActions />
        </AgentProvider>
      );

      // Initially 1 agent
      expect(screen.getByText('Agent count: 1')).toBeInTheDocument();
      expect(screen.getByText('Agent One')).toBeInTheDocument();

      // Add another agent
      const addButton = screen.getByText('Add Agent');
      await user.click(addButton);

      // Should update
      await waitFor(() => {
        expect(screen.getByText('Agent count: 2')).toBeInTheDocument();
      });
      expect(screen.getByText('Agent Two')).toBeInTheDocument();
    });
  });

  describe('Date Serialization', () => {
    it('should properly serialize and deserialize Date objects', () => {
      const agent: Agent = {
        id: 'test-agent',
        name: 'Test Agent',
        description: 'Test',
        strictRAG: true,
        knowledgeSpaceId: 'ks-1',
        createdAt: '2024-01-15T10:30:00.000Z',
      };

      // Save agent
      saveAgent(agent);

      // Retrieve agent
      const savedAgents = getAgents();
      expect(savedAgents).toHaveLength(1);

      // Date should be properly stored as string
      expect(typeof savedAgents[0].createdAt).toBe('string');
      expect(savedAgents[0].createdAt).toBe('2024-01-15T10:30:00.000Z');
    });

    it('should handle agents without createdAt date', () => {
      const agentWithoutDate = {
        id: 'test-agent',
        name: 'Test Agent',
        description: 'Test',
        strictRAG: true,
        knowledgeSpaceId: 'ks-1',
      };

      // Manually save to localStorage
      localStorage.setItem('assistants_agents', JSON.stringify([agentWithoutDate]));

      // Should not crash when loading
      const agents = getAgents();
      expect(agents).toHaveLength(1);
    });
  });
});
