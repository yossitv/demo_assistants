'use client';

import { useState, useCallback } from 'react';
import { apiClient } from '../api/client';
import { KnowledgeSpace } from '@/types';

export function useKnowledgeManagement() {
  const [knowledgeSpaces, setKnowledgeSpaces] = useState<KnowledgeSpace[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await apiClient.listKnowledgeSpaces();
      setKnowledgeSpaces(response.knowledgeSpaces);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch knowledge spaces');
    } finally {
      setLoading(false);
    }
  }, []);

  const deleteKnowledgeSpace = useCallback(async (id: string) => {
    setLoading(true);
    setError(null);
    try {
      await apiClient.deleteKnowledgeSpace(id);
      setKnowledgeSpaces(prev => prev.filter(ks => ks.id !== id));
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to delete knowledge space';
      setError(message);
      throw new Error(message);
    } finally {
      setLoading(false);
    }
  }, []);

  const getLinkedAgentCount = useCallback((id: string) => {
    // TODO: Implement when agent list API is available
    return 0;
  }, []);

  return {
    knowledgeSpaces,
    loading,
    error,
    refetch,
    deleteKnowledgeSpace,
    getLinkedAgentCount,
  };
}
