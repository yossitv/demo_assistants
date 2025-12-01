'use client';

import { useEffect, useState } from 'react';
import { useKnowledgeManagement } from '@/lib/hooks/useKnowledgeManagement';
import { DeleteConfirmDialog } from './DeleteConfirmDialog';
import { KnowledgeSpace } from '@/types';
import { apiClient } from '@/lib/api/client';

export function KnowledgeManagementList() {
  const { knowledgeSpaces, loading, error, refetch, deleteKnowledgeSpace, getLinkedAgentCount } = useKnowledgeManagement();
  const [deletingKnowledge, setDeletingKnowledge] = useState<KnowledgeSpace | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [selectedKnowledgeId, setSelectedKnowledgeId] = useState<string | null>(null);
  const [knowledgeChunks, setKnowledgeChunks] = useState<string[]>([]);
  const [viewMode, setViewMode] = useState<'chunks' | 'original'>('chunks');

  useEffect(() => {
    refetch();
  }, [refetch]);

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  const handleDelete = async () => {
    if (!deletingKnowledge) return;

    setDeleteLoading(true);
    try {
      await deleteKnowledgeSpace(deletingKnowledge.id);
      setToast({ message: 'Knowledge space deleted', type: 'success' });
      setDeletingKnowledge(null);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to delete';
      // Check if it's a 404 error (API not implemented)
      if (message.includes('404') || message.includes('Not Found')) {
        setToast({ message: 'Backend API not implemented. Please implement delete API.', type: 'error' });
      } else {
        setToast({ message, type: 'error' });
      }
    } finally {
      setDeleteLoading(false);
    }
  };

  const handleViewChunks = async (knowledgeId: string) => {
    setSelectedKnowledgeId(knowledgeId);
    setKnowledgeChunks([]);
    
    try {
      const result = await apiClient.getKnowledgeChunks(knowledgeId);
      
      if (result.chunks.length === 0) {
        setKnowledgeChunks(['⚠️ No chunks registered in this knowledge space.']);
        return;
      }

      const chunksDisplay = result.chunks.map((chunk, idx) => 
        `【Chunk ${idx + 1}/${result.chunkCount}】\n\n${chunk.content}\n\n---`
      );
      
      setKnowledgeChunks(chunksDisplay);
    } catch (err) {
      console.error('Chunk fetch error:', err);
      setKnowledgeChunks(['❌ Failed to fetch chunks.']);
    }
  };

  const getTypeBadge = (type: string) => {
    const colors = {
      web: 'bg-blue-100 text-blue-800',
      product: 'bg-green-100 text-green-800',
      document: 'bg-purple-100 text-purple-800',
      custom: 'bg-gray-100 text-gray-800',
    };
    return colors[type as keyof typeof colors] || colors.custom;
  };

  const getStatusBadge = (status?: string) => {
    if (!status) return null;
    const colors = {
      processing: 'bg-yellow-100 text-yellow-800',
      completed: 'bg-green-100 text-green-800',
      partial: 'bg-orange-100 text-orange-800',
      error: 'bg-red-100 text-red-800',
    };
    return colors[status as keyof typeof colors] || colors.processing;
  };

  if (loading && knowledgeSpaces.length === 0) {
    return <div className="text-center py-8">Loading...</div>;
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded">
        Error: {error}
      </div>
    );
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-2xl font-bold">Knowledge Spaces</h2>
        <button
          onClick={refetch}
          disabled={loading}
          className="px-4 py-2 text-sm bg-gray-100 rounded hover:bg-gray-200 disabled:opacity-50"
        >
          Refresh
        </button>
      </div>

      {toast && (
        <div className={`mb-4 px-4 py-3 rounded ${toast.type === 'success' ? 'bg-green-50 text-green-800 border border-green-200' : 'bg-red-50 text-red-800 border border-red-200'}`}>
          {toast.message}
        </div>
      )}

      {knowledgeSpaces.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          No knowledge spaces found
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full bg-white border border-gray-200 rounded-lg">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Documents</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Last Updated</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {knowledgeSpaces.map((ks) => (
                <tr key={ks.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 text-sm font-medium text-gray-900">{ks.name}</td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 text-xs font-semibold rounded ${getTypeBadge(ks.type)}`}>
                      {ks.type}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    {ks.status && (
                      <span className={`px-2 py-1 text-xs font-semibold rounded ${getStatusBadge(ks.status)}`}>
                        {ks.status}
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">{ks.documentCount || 0}</td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    {new Date(ks.lastUpdatedAt).toLocaleDateString('ja-JP')}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex gap-2 justify-end">
                      <button
                        onClick={() => handleViewChunks(ks.id)}
                        className="px-3 py-1 text-sm text-white bg-blue-600 rounded hover:bg-blue-700"
                      >
                        View Data
                      </button>
                      <button
                        onClick={() => setDeletingKnowledge(ks)}
                        className="px-3 py-1 text-sm text-white bg-red-600 rounded hover:bg-red-700"
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {selectedKnowledgeId && knowledgeChunks.length > 0 && (
        <div className="mt-6 p-4 bg-gray-50 rounded border border-gray-200">
          <div className="flex justify-between items-center mb-3">
            <h3 className="text-lg font-semibold">RAG Chunks</h3>
            <button
              onClick={() => setSelectedKnowledgeId(null)}
              className="px-3 py-1 text-sm bg-gray-200 rounded hover:bg-gray-300"
            >
              Close
            </button>
          </div>
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {knowledgeChunks.map((chunk, idx) => (
              <div key={idx} className="text-sm text-gray-700 whitespace-pre-wrap bg-white p-3 rounded border">
                {chunk}
              </div>
            ))}
          </div>
        </div>
      )}

      <DeleteConfirmDialog
        isOpen={!!deletingKnowledge}
        title="Delete Knowledge Space"
        message={`Are you sure you want to delete "${deletingKnowledge?.name}"?`}
        warningMessage={
          deletingKnowledge && getLinkedAgentCount(deletingKnowledge.id) > 0
            ? `This knowledge space is linked to ${getLinkedAgentCount(deletingKnowledge.id)} agent(s).`
            : undefined
        }
        onConfirm={handleDelete}
        onCancel={() => setDeletingKnowledge(null)}
        loading={deleteLoading}
      />
    </div>
  );
}
