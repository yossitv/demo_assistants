'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { AgentManagementList } from '@/components/dashboard/AgentManagementList';
import { KnowledgeManagementList } from '@/components/dashboard/KnowledgeManagementList';
import { apiClient } from '@/lib/api/client';
import { KnowledgeSpace } from '@/types';

export default function DashboardPage() {
  const [knowledgeSpaces, setKnowledgeSpaces] = useState<KnowledgeSpace[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchKnowledgeSpaces = async () => {
      try {
        const response = await apiClient.listKnowledgeSpaces();
        setKnowledgeSpaces(response.knowledgeSpaces);
      } catch (err) {
        console.error('Failed to fetch knowledge spaces:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchKnowledgeSpaces();
  }, []);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">Dashboard</h1>
          <div className="flex gap-4">
            <Link
              href="/agents/create"
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              + Create Agent
            </Link>
            <Link
              href="/knowledge/create"
              className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
            >
              + Create Knowledge Space
            </Link>
          </div>
        </div>

        <div className="space-y-8">
          <div className="bg-white rounded-lg shadow p-6">
            {loading ? (
              <div className="text-center py-8">読み込み中...</div>
            ) : (
              <AgentManagementList knowledgeSpaces={knowledgeSpaces} />
            )}
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <KnowledgeManagementList />
          </div>
        </div>
      </div>
    </div>
  );
}
