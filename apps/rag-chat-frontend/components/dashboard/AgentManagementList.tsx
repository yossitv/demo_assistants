'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAgentManagement } from '@/lib/hooks/useAgentManagement';
import { DeleteConfirmDialog } from './DeleteConfirmDialog';
import { AgentEditModal } from './AgentEditModal';
import { Agent, KnowledgeSpace } from '@/types';

interface AgentManagementListProps {
  knowledgeSpaces: KnowledgeSpace[];
}

export function AgentManagementList({ knowledgeSpaces }: AgentManagementListProps) {
  const router = useRouter();
  const { agents, loading, error, refetch, updateAgent, deleteAgent } = useAgentManagement();
  const [editingAgent, setEditingAgent] = useState<Agent | null>(null);
  const [deletingAgent, setDeletingAgent] = useState<Agent | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

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
    if (!deletingAgent) return;

    setDeleteLoading(true);
    try {
      await deleteAgent(deletingAgent.id);
      setToast({ message: 'Agent deleted (local only)', type: 'success' });
      setDeletingAgent(null);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to delete';
      setToast({ message, type: 'error' });
    } finally {
      setDeleteLoading(false);
    }
  };

  const handleUpdate = async (data: any) => {
    if (!editingAgent) return;

    try {
      await updateAgent(editingAgent.id, data);
      setToast({ message: 'Agent updated', type: 'success' });
      setEditingAgent(null);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to update';
      // Check if it's a 404 error (API not implemented)
      if (message.includes('404') || message.includes('Not Found')) {
        setToast({ message: 'Backend API not implemented. Please implement update API.', type: 'error' });
      } else {
        setToast({ message, type: 'error' });
      }
      throw err;
    }
  };

  const getKnowledgeSpaceName = (id: string) => {
    return knowledgeSpaces.find(ks => ks.id === id)?.name || id;
  };

  if (loading && agents.length === 0) {
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
        <h2 className="text-2xl font-bold">Agents</h2>
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

      {agents.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          No agents found
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full bg-white border border-gray-200 rounded-lg">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Description</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Knowledge Space</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Created</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {agents.map((agent, idx) => {
                const rowKey = agent.id || `${agent.name}-${agent.createdAt}-${idx}`;
                return (
                <tr key={rowKey} className="hover:bg-gray-50">
                  <td className="px-6 py-4 text-sm font-medium text-gray-900">{agent.name}</td>
                  <td className="px-6 py-4 text-sm text-gray-500 max-w-xs truncate">
                    {agent.description || '-'}
                  </td>
                  <td className="px-6 py-4">
                    <span className="px-2 py-1 text-xs font-semibold bg-blue-100 text-blue-800 rounded">
                      {getKnowledgeSpaceName(agent.knowledgeSpaceId)}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    {new Date(agent.createdAt).toLocaleDateString('ja-JP')}
                  </td>
                  <td className="px-6 py-4 text-right space-x-2">
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(agent.id);
                        setToast({ message: 'Agent ID copied', type: 'success' });
                      }}
                      className="px-3 py-1 text-sm text-gray-700 bg-gray-200 rounded hover:bg-gray-300"
                      title="Copy Agent ID"
                    >
                      ID
                    </button>
                    <button
                      onClick={() => router.push(`/agents/${agent.id}`)}
                      className="px-3 py-1 text-sm text-white bg-green-600 rounded hover:bg-green-700"
                    >
                      Chat
                    </button>
                    <button
                      onClick={() => setEditingAgent(agent)}
                      className="px-3 py-1 text-sm text-white bg-blue-600 rounded hover:bg-blue-700"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => setDeletingAgent(agent)}
                      className="px-3 py-1 text-sm text-white bg-red-600 rounded hover:bg-red-700"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              )})}
            </tbody>
          </table>
        </div>
      )}

      {editingAgent && (
        <AgentEditModal
          agent={editingAgent}
          knowledgeSpaces={knowledgeSpaces}
          isOpen={!!editingAgent}
          onClose={() => setEditingAgent(null)}
          onSave={handleUpdate}
        />
      )}

      <DeleteConfirmDialog
        isOpen={!!deletingAgent}
        title="Delete Agent"
        message={`Are you sure you want to delete "${deletingAgent?.name}"?`}
        onConfirm={handleDelete}
        onCancel={() => setDeletingAgent(null)}
        loading={deleteLoading}
      />
    </div>
  );
}
