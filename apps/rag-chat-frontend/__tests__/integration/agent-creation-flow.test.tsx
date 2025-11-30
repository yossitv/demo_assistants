/**
 * Integration test for complete agent creation flow
 * Tests: URLs → Knowledge Base → Agent → Chat
 *
 * @jest-environment jsdom
 */

import '@testing-library/jest-dom';
import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AgentProvider } from '@/lib/context/KnowledgeContext';
import CreateAgentForm from '@/components/CreateAgentForm';
import { apiClient } from '@/lib/api/client';
import { clearAgents } from '@/lib/utils/storage';

// Mock the API client
jest.mock('@/lib/api/client');

// Mock react-markdown
jest.mock('react-markdown', () => {
  return function ReactMarkdown({ children }: { children: string }) {
    return <div>{children}</div>;
  };
});

// Mock router for navigation tests
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
  usePathname: () => '/agents/create',
  useSearchParams: () => new URLSearchParams(),
}));

describe('Integration: Complete Agent Creation Flow', () => {
  const mockedApiClient = apiClient as jest.Mocked<typeof apiClient>;

  beforeEach(() => {
    jest.clearAllMocks();
    mockPush.mockClear();
    // Clear localStorage before each test
    clearAgents();
    localStorage.clear();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should complete full agent creation flow: URLs → Knowledge Base → Agent → Navigate to Chat', async () => {
    const user = userEvent.setup();

    // Mock successful knowledge space creation
    const mockKnowledgeSpace = {
      knowledgeSpace: {
        id: 'ks-test-123',
        name: 'Test Knowledge Base',
        type: 'web' as const,
        lastUpdatedAt: new Date().toISOString(),
        urls: ['https://example.com'],
      },
    };

    mockedApiClient.createKnowledgeSpace.mockResolvedValueOnce(mockKnowledgeSpace);

    // Mock successful agent creation
    const mockAgent = {
      agent: {
        id: 'agent-test-456',
        name: 'Test Agent',
        description: 'A test agent',
        strictRAG: true,
        knowledgeSpaceId: 'ks-test-123',
        createdAt: new Date().toISOString(),
      },
    };

    mockedApiClient.createAgent.mockResolvedValueOnce(mockAgent);

    // Render the component
    render(
      <AgentProvider>
        <CreateAgentForm />
      </AgentProvider>
    );

    // Step 1: Fill in knowledge space creation form
    await waitFor(() => {
      expect(screen.getByText('Create Knowledge Space')).toBeInTheDocument();
    });

    const nameInput = screen.getByLabelText(/knowledge space name/i);
    await user.type(nameInput, 'Test Knowledge Base');

    // Add a URL
    const urlInput = screen.getByLabelText(/url/i);
    await user.type(urlInput, 'https://example.com');

    // Submit knowledge base form
    const createKBButton = screen.getByRole('button', { name: /create knowledge space/i });
    await user.click(createKBButton);

    // Wait for knowledge space to be created
    await waitFor(() => {
      expect(mockedApiClient.createKnowledgeSpace).toHaveBeenCalledWith(
        'Test Knowledge Base',
        ['https://example.com']
      );
    });

    // Step 2: Agent form should appear automatically
    await waitFor(() => {
      expect(screen.getByText(/configure.*agent/i)).toBeInTheDocument();
    }, { timeout: 3000 });

    // Fill in agent details
    const agentNameInput = screen.getByLabelText(/agent name/i);
    await user.type(agentNameInput, 'Test Agent');

    const agentDescInput = screen.getByLabelText(/description/i);
    await user.type(agentDescInput, 'A test agent');

    // Verify strictRAG toggle is present (enabled by default)
    const strictRAGToggle = screen.getByRole('checkbox', { name: /strict rag/i });
    expect(strictRAGToggle).toBeChecked();

    // Submit agent form
    const createAgentButton = screen.getByRole('button', { name: /create agent/i });
    await user.click(createAgentButton);

    // Wait for agent to be created
    await waitFor(() => {
      expect(mockedApiClient.createAgent).toHaveBeenCalledWith(
        'ks-test-123',
        'Test Agent',
        'A test agent',
        true
      );
    });

    // Step 3: Success message should appear
    await waitFor(() => {
      expect(screen.getByText(/agent created successfully/i)).toBeInTheDocument();
    });

    // Step 4: Navigate to chat button should be present
    const navigateToChatButton = screen.getByRole('button', { name: /start chatting/i });
    expect(navigateToChatButton).toBeInTheDocument();

    // Click navigate to chat
    await user.click(navigateToChatButton);

    // Verify navigation to chat page
    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/agents/agent-test-456');
    });

    // Verify agent was saved to localStorage
    const savedAgents = JSON.parse(localStorage.getItem('assistants_agents') || '[]');
    expect(savedAgents).toHaveLength(1);
    expect(savedAgents[0]).toMatchObject({
      id: 'agent-test-456',
      name: 'Test Agent',
      description: 'A test agent',
      strictRAG: true,
      knowledgeSpaceId: 'ks-test-123',
    });
  });

  it('should handle errors during knowledge base creation', async () => {
    const user = userEvent.setup();

    // Mock failed knowledge space creation
    mockedApiClient.createKnowledgeSpace.mockRejectedValueOnce(
      new Error('Failed to create knowledge space')
    );

    render(
      <AgentProvider>
        <CreateAgentForm />
      </AgentProvider>
    );

    // Fill in knowledge space form
    const nameInput = screen.getByLabelText(/knowledge space name/i);
    await user.type(nameInput, 'Test Knowledge Base');

    const urlInput = screen.getByLabelText(/url/i);
    await user.type(urlInput, 'https://example.com');

    // Submit form
    const createKBButton = screen.getByRole('button', { name: /create knowledge space/i });
    await user.click(createKBButton);

    // Error message should appear
    await waitFor(() => {
      expect(screen.getByText(/failed to create knowledge space/i)).toBeInTheDocument();
    });

    // Agent form should NOT appear
    expect(screen.queryByText(/configure.*agent/i)).not.toBeInTheDocument();

    // Retry button should be present
    expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument();
  });

  it('should handle errors during agent creation', async () => {
    const user = userEvent.setup();

    // Mock successful knowledge space creation
    const mockKnowledgeSpace = {
      knowledgeSpace: {
        id: 'ks-test-123',
        name: 'Test KB',
        type: 'web' as const,
        lastUpdatedAt: new Date().toISOString(),
        urls: ['https://example.com'],
      },
    };

    mockedApiClient.createKnowledgeSpace.mockResolvedValueOnce(mockKnowledgeSpace);

    // Mock failed agent creation
    mockedApiClient.createAgent.mockRejectedValueOnce(
      new Error('Failed to create agent')
    );

    render(
      <AgentProvider>
        <CreateAgentForm />
      </AgentProvider>
    );

    // Create knowledge base first
    const nameInput = screen.getByLabelText(/knowledge space name/i);
    await user.type(nameInput, 'Test KB');

    const urlInput = screen.getByLabelText(/url/i);
    await user.type(urlInput, 'https://example.com');

    const createKBButton = screen.getByRole('button', { name: /create knowledge space/i });
    await user.click(createKBButton);

    // Wait for agent form to appear
    await waitFor(() => {
      expect(screen.getByText(/configure.*agent/i)).toBeInTheDocument();
    });

    // Fill in agent form
    const agentNameInput = screen.getByLabelText(/agent name/i);
    await user.type(agentNameInput, 'Test Agent');

    const agentDescInput = screen.getByLabelText(/description/i);
    await user.type(agentDescInput, 'Test description');

    // Submit agent form
    const createAgentButton = screen.getByRole('button', { name: /create agent/i });
    await user.click(createAgentButton);

    // Error message should appear
    await waitFor(() => {
      expect(screen.getByText(/failed to create agent/i)).toBeInTheDocument();
    });

    // Retry button should be present
    expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument();

    // Agent should NOT be saved to localStorage
    const savedAgents = JSON.parse(localStorage.getItem('assistants_agents') || '[]');
    expect(savedAgents).toHaveLength(0);
  });

  it('should validate knowledge base form inputs', async () => {
    const user = userEvent.setup();

    render(
      <AgentProvider>
        <CreateAgentForm />
      </AgentProvider>
    );

    // Try to submit without name
    const createKBButton = screen.getByRole('button', { name: /create knowledge space/i });
    await user.click(createKBButton);

    // Should show validation error
    await waitFor(() => {
      expect(screen.getByText(/name is required/i)).toBeInTheDocument();
    });

    // API should not be called
    expect(mockedApiClient.createKnowledgeSpace).not.toHaveBeenCalled();
  });

  it('should validate agent form inputs', async () => {
    const user = userEvent.setup();

    // Mock successful knowledge space creation
    const mockKnowledgeSpace = {
      knowledgeSpace: {
        id: 'ks-test-123',
        name: 'Test KB',
        type: 'web' as const,
        lastUpdatedAt: new Date().toISOString(),
        urls: ['https://example.com'],
      },
    };

    mockedApiClient.createKnowledgeSpace.mockResolvedValueOnce(mockKnowledgeSpace);

    render(
      <AgentProvider>
        <CreateAgentForm />
      </AgentProvider>
    );

    // Create knowledge base first
    const nameInput = screen.getByLabelText(/knowledge space name/i);
    await user.type(nameInput, 'Test KB');

    const urlInput = screen.getByLabelText(/url/i);
    await user.type(urlInput, 'https://example.com');

    const createKBButton = screen.getByRole('button', { name: /create knowledge space/i });
    await user.click(createKBButton);

    // Wait for agent form
    await waitFor(() => {
      expect(screen.getByText(/configure.*agent/i)).toBeInTheDocument();
    });

    // Try to submit without agent name
    const createAgentButton = screen.getByRole('button', { name: /create agent/i });
    await user.click(createAgentButton);

    // Should show validation error
    await waitFor(() => {
      expect(screen.getByText(/agent name is required/i)).toBeInTheDocument();
    });

    // API should not be called
    expect(mockedApiClient.createAgent).not.toHaveBeenCalled();
  });

  it('should allow adding multiple URLs to knowledge base', async () => {
    const user = userEvent.setup();

    const mockKnowledgeSpace = {
      knowledgeSpace: {
        id: 'ks-test-123',
        name: 'Test KB',
        type: 'web' as const,
        lastUpdatedAt: new Date().toISOString(),
        urls: ['https://example.com', 'https://test.com'],
      },
    };

    mockedApiClient.createKnowledgeSpace.mockResolvedValueOnce(mockKnowledgeSpace);

    render(
      <AgentProvider>
        <CreateAgentForm />
      </AgentProvider>
    );

    // Fill in name
    const nameInput = screen.getByLabelText(/knowledge space name/i);
    await user.type(nameInput, 'Test KB');

    // Add first URL
    const urlInput = screen.getByLabelText(/url/i);
    await user.type(urlInput, 'https://example.com');

    // Add another URL
    const addUrlButton = screen.getByRole('button', { name: /add.*url/i });
    await user.click(addUrlButton);

    // Type in second URL field
    const urlInputs = screen.getAllByLabelText(/url/i);
    await user.type(urlInputs[1], 'https://test.com');

    // Submit
    const createKBButton = screen.getByRole('button', { name: /create knowledge space/i });
    await user.click(createKBButton);

    // Verify both URLs were sent
    await waitFor(() => {
      expect(mockedApiClient.createKnowledgeSpace).toHaveBeenCalledWith(
        'Test KB',
        ['https://example.com', 'https://test.com']
      );
    });
  });

  it('should toggle strictRAG setting', async () => {
    const user = userEvent.setup();

    // Mock successful knowledge space creation
    const mockKnowledgeSpace = {
      knowledgeSpace: {
        id: 'ks-test-123',
        name: 'Test KB',
        type: 'web' as const,
        lastUpdatedAt: new Date().toISOString(),
        urls: ['https://example.com'],
      },
    };

    mockedApiClient.createKnowledgeSpace.mockResolvedValueOnce(mockKnowledgeSpace);

    const mockAgent = {
      agent: {
        id: 'agent-test-456',
        name: 'Test Agent',
        description: 'Test',
        strictRAG: false,
        knowledgeSpaceId: 'ks-test-123',
        createdAt: new Date().toISOString(),
      },
    };

    mockedApiClient.createAgent.mockResolvedValueOnce(mockAgent);

    render(
      <AgentProvider>
        <CreateAgentForm />
      </AgentProvider>
    );

    // Create knowledge base
    const nameInput = screen.getByLabelText(/knowledge space name/i);
    await user.type(nameInput, 'Test KB');

    const urlInput = screen.getByLabelText(/url/i);
    await user.type(urlInput, 'https://example.com');

    const createKBButton = screen.getByRole('button', { name: /create knowledge space/i });
    await user.click(createKBButton);

    // Wait for agent form
    await waitFor(() => {
      expect(screen.getByText(/configure.*agent/i)).toBeInTheDocument();
    });

    // Fill in agent details
    const agentNameInput = screen.getByLabelText(/agent name/i);
    await user.type(agentNameInput, 'Test Agent');

    const agentDescInput = screen.getByLabelText(/description/i);
    await user.type(agentDescInput, 'Test');

    // Toggle strictRAG off
    const strictRAGToggle = screen.getByRole('checkbox', { name: /strict rag/i });
    await user.click(strictRAGToggle);
    expect(strictRAGToggle).not.toBeChecked();

    // Submit
    const createAgentButton = screen.getByRole('button', { name: /create agent/i });
    await user.click(createAgentButton);

    // Verify strictRAG was set to false
    await waitFor(() => {
      expect(mockedApiClient.createAgent).toHaveBeenCalledWith(
        'ks-test-123',
        'Test Agent',
        'Test',
        false
      );
    });
  });
});
