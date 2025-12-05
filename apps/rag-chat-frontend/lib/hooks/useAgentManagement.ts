'use client';

import { useState, useCallback, useEffect } from 'react';
import { apiClient } from '../api/client';
import { Agent as ApiAgent } from '../api/types';
import { Agent, AgentUpdateRequest } from '@/types';
import { getAgents, saveAgent, removeAgent } from '../utils/storage';

const mapApiAgentToAgent = (apiAgent: ApiAgent, fallbackKnowledgeSpaceId?: string): Agent => ({
  id: apiAgent.id,
  name: apiAgent.name,
  description: apiAgent.description,
  strictRAG: apiAgent.strictRAG,
  knowledgeSpaceId: apiAgent.knowledgeSpaceId || fallbackKnowledgeSpaceId || '',
  createdAt: apiAgent.createdAt || new Date().toISOString(),
});

export function useAgentManagement() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const storedAgents = getAgents();
      setAgents(storedAgents);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch agents');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refetch();
  }, [refetch]);

  const updateAgent = useCallback(async (id: string, data: AgentUpdateRequest) => {
    setLoading(true);
    setError(null);
    try {
      const response = await apiClient.updateAgent(id, data);
      saveAgent(mapApiAgentToAgent(response.agent, data.knowledgeSpaceIds[0]));
      await refetch();
    } catch (err) {
      // If API returns 403 (not implemented), update localStorage only
      if (err instanceof Error && (err.message.includes('403') || err.message.includes('Forbidden'))) {
        const updatedAgent = {
          id,
          name: data.name,
          description: data.description || '',
          strictRAG: data.strictRAG ?? true,
          knowledgeSpaceId: data.knowledgeSpaceIds[0],
          createdAt: new Date().toISOString(),
        };
        saveAgent(updatedAgent);
        await refetch();
        console.warn('API not implemented, updated localStorage only');
        return;
      }
      const message = err instanceof Error ? err.message : 'Failed to update agent';
      setError(message);
      throw new Error(message);
    } finally {
      setLoading(false);
    }
  }, [refetch]);

  const deleteAgent = useCallback(async (id: string) => {
    setLoading(true);
    setError(null);
    try {
      await apiClient.deleteAgent(id);
      removeAgent(id);
      setAgents(prev => prev.filter(a => a.id !== id));
    } catch (err) {
      // If API returns 403 (not implemented), delete from localStorage only
      if (err instanceof Error && (err.message.includes('403') || err.message.includes('Forbidden'))) {
        removeAgent(id);
        setAgents(prev => prev.filter(a => a.id !== id));
        console.warn('API not implemented, deleted from localStorage only');
        return;
      }
      const message = err instanceof Error ? err.message : 'Failed to delete agent';
      setError(message);
      throw new Error(message);
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    agents,
    loading,
    error,
    refetch,
    updateAgent,
    deleteAgent,
  };
}
