'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { apiClient } from '../api/client';
import { Agent as ApiAgent, KnowledgeSpace as ApiKnowledgeSpace } from '../api/types';
import { Agent, KnowledgeSpace } from '@/types';
import { ApiError } from '../api/error';
import { saveAgent, getAgents } from '../utils/storage';

/**
 * Selected agent ID storage key
 */
const SELECTED_AGENT_KEY = 'assistants_selected_agent';

/**
 * Convert API Agent to local Agent type
 */
function apiAgentToAgent(apiAgent: ApiAgent): Agent {
  return {
    id: apiAgent.id,
    name: apiAgent.name,
    description: apiAgent.description,
    strictRAG: apiAgent.strictRAG,
    knowledgeSpaceId: apiAgent.knowledgeSpaceId,
    createdAt: apiAgent.createdAt ? new Date(apiAgent.createdAt) : new Date(),
  };
}

/**
 * Convert API KnowledgeSpace to local KnowledgeSpace type
 */
function apiKnowledgeSpaceToKnowledgeSpace(apiKnowledgeSpace: ApiKnowledgeSpace): KnowledgeSpace {
  return {
    id: apiKnowledgeSpace.id,
    name: apiKnowledgeSpace.name,
    type: apiKnowledgeSpace.type === 'web' ? 'web' : 'web', // Default to 'web' for MVP
    lastUpdatedAt: apiKnowledgeSpace.lastUpdatedAt ? new Date(apiKnowledgeSpace.lastUpdatedAt) : new Date(),
  };
}

/**
 * Agent state interface
 */
interface AgentState {
  agents: Agent[];
  knowledgeSpaces: KnowledgeSpace[];
  selectedAgent: Agent | null;
  isLoading: boolean;
  error: string | null;
}

/**
 * Agent context type with state and actions
 */
interface AgentContextType extends AgentState {
  loadKnowledgeSpaces: () => Promise<void>;
  createKnowledgeSpace: (name: string, sourceUrls: string[]) => Promise<KnowledgeSpace>;
  createAgent: (
    name: string,
    knowledgeSpaceIds: string[],
    strictRAG: boolean,
    description?: string
  ) => Promise<Agent>;
  selectAgent: (agent: Agent | null) => void;
  clearError: () => void;
  refreshAgents: () => void;
}

/**
 * Agent context
 */
const AgentContext = createContext<AgentContextType | undefined>(undefined);

/**
 * Agent provider props
 */
interface AgentProviderProps {
  children: ReactNode;
}

/**
 * Get selected agent ID from localStorage
 */
function getSelectedAgentId(): string | null {
  if (typeof window === 'undefined') {
    return null;
  }

  try {
    return localStorage.getItem(SELECTED_AGENT_KEY);
  } catch (error) {
    console.error('Error retrieving selected agent ID from localStorage:', error);
    return null;
  }
}

/**
 * Save selected agent ID to localStorage
 */
function saveSelectedAgentId(agentId: string | null): void {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    if (agentId) {
      localStorage.setItem(SELECTED_AGENT_KEY, agentId);
    } else {
      localStorage.removeItem(SELECTED_AGENT_KEY);
    }
  } catch (error) {
    console.error('Error saving selected agent ID to localStorage:', error);
  }
}

/**
 * Agent provider component
 */
export function AgentProvider({ children }: AgentProviderProps) {
  const [state, setState] = useState<AgentState>({
    agents: [],
    knowledgeSpaces: [],
    selectedAgent: null,
    isLoading: false,
    error: null,
  });

  /**
   * Load agents from localStorage on mount
   */
  useEffect(() => {
    const storedAgents = getAgents();
    const selectedAgentId = getSelectedAgentId();

    let selectedAgent: Agent | null = null;
    if (selectedAgentId) {
      selectedAgent = storedAgents.find((agent) => agent.id === selectedAgentId) || null;
    }

    setState((prev) => ({
      ...prev,
      agents: storedAgents,
      selectedAgent,
    }));
  }, []);

  /**
   * Refresh agents from localStorage
   */
  const refreshAgents = useCallback(() => {
    const storedAgents = getAgents();
    setState((prev) => ({
      ...prev,
      agents: storedAgents,
    }));
  }, []);

  /**
   * Load knowledge spaces from API
   */
  const loadKnowledgeSpaces = useCallback(async () => {
    setState((prev) => ({ ...prev, isLoading: true, error: null }));

    try {
      const response = await apiClient.listKnowledgeSpaces();

      // Convert API knowledge spaces to local type
      const knowledgeSpaces = response.knowledgeSpaces.map(apiKnowledgeSpaceToKnowledgeSpace);

      setState((prev) => ({
        ...prev,
        knowledgeSpaces,
        isLoading: false,
        error: null,
      }));
    } catch (error) {
      const errorMessage = error instanceof ApiError
        ? error.message
        : 'Failed to load knowledge spaces. Please try again.';

      setState((prev) => ({
        ...prev,
        isLoading: false,
        error: errorMessage,
      }));

      throw error;
    }
  }, []);

  /**
   * Create a new knowledge space
   */
  const createKnowledgeSpace = useCallback(async (
    name: string,
    sourceUrls: string[]
  ): Promise<KnowledgeSpace> => {
    setState((prev) => ({ ...prev, isLoading: true, error: null }));

    try {
      // Validate inputs
      if (!name || name.trim() === '') {
        throw new Error('Knowledge space name is required');
      }

      if (!sourceUrls || sourceUrls.length === 0) {
        throw new Error('At least one source URL is required');
      }

      // Filter out empty URLs
      const validUrls = sourceUrls.filter((url) => url && url.trim() !== '');

      if (validUrls.length === 0) {
        throw new Error('At least one valid source URL is required');
      }

      // Create knowledge space via API
      const response = await apiClient.createKnowledgeSpace(name, validUrls);

      // Convert API knowledge space to local type
      const knowledgeSpace = apiKnowledgeSpaceToKnowledgeSpace(response.knowledgeSpace);

      // Update state with new knowledge space
      setState((prev) => ({
        ...prev,
        knowledgeSpaces: [...prev.knowledgeSpaces, knowledgeSpace],
        isLoading: false,
        error: null,
      }));

      return knowledgeSpace;
    } catch (error) {
      const errorMessage = error instanceof ApiError
        ? error.message
        : error instanceof Error
        ? error.message
        : 'Failed to create knowledge space. Please try again.';

      setState((prev) => ({
        ...prev,
        isLoading: false,
        error: errorMessage,
      }));

      throw error;
    }
  }, []);

  /**
   * Create a new agent
   */
  const createAgent = useCallback(async (
    name: string,
    knowledgeSpaceIds: string[],
    strictRAG: boolean,
    description?: string
  ): Promise<Agent> => {
    const trimmedName = name?.trim();
    const trimmedDescription = description?.trim();

    setState((prev) => ({ ...prev, isLoading: true, error: null }));

    try {
      // Validate inputs
      if (!trimmedName) {
        throw new Error('Agent name is required');
      }

      if (!knowledgeSpaceIds || knowledgeSpaceIds.length === 0) {
        throw new Error('At least one knowledge space is required');
      }

      // For MVP, we only support single knowledge space per agent
      // Use a default description if not provided
      const agentDescription = trimmedDescription && trimmedDescription !== ''
        ? trimmedDescription
        : `AI assistant powered by ${trimmedName} knowledge base`;

      // Create agent via API
      const response = await apiClient.createAgent(
        knowledgeSpaceIds,
        trimmedName,
        agentDescription,
        strictRAG
      );

      // Convert API agent to local type
      const agent = apiAgentToAgent(response.agent);

      // Save agent to localStorage
      saveAgent(agent);

      // Update state with new agent
      setState((prev) => ({
        ...prev,
        agents: [...prev.agents, agent],
        isLoading: false,
        error: null,
      }));

      return agent;
    } catch (error) {
      const errorMessage = error instanceof ApiError
        ? error.message
        : error instanceof Error
        ? error.message
        : 'Failed to create agent. Please try again.';

      setState((prev) => ({
        ...prev,
        isLoading: false,
        error: errorMessage,
      }));

      throw error;
    }
  }, []);

  /**
   * Select an agent
   */
  const selectAgent = useCallback((agent: Agent | null) => {
    setState((prev) => ({
      ...prev,
      selectedAgent: agent,
    }));

    // Persist selected agent ID to localStorage
    saveSelectedAgentId(agent?.id || null);

    // If an agent is selected, save it to the agents list (for recent agents tracking)
    if (agent) {
      saveAgent(agent);

      // Refresh agents list to update with the newly saved agent
      const storedAgents = getAgents();
      setState((prev) => ({
        ...prev,
        agents: storedAgents,
      }));
    }
  }, []);

  /**
   * Clear error state
   */
  const clearError = useCallback(() => {
    setState((prev) => ({ ...prev, error: null }));
  }, []);

  const contextValue: AgentContextType = {
    ...state,
    loadKnowledgeSpaces,
    createKnowledgeSpace,
    createAgent,
    selectAgent,
    clearError,
    refreshAgents,
  };

  return (
    <AgentContext.Provider value={contextValue}>
      {children}
    </AgentContext.Provider>
  );
}

/**
 * Custom hook to use agent context
 */
export function useAgent(): AgentContextType {
  const context = useContext(AgentContext);

  if (context === undefined) {
    throw new Error('useAgent must be used within an AgentProvider');
  }

  return context;
}
