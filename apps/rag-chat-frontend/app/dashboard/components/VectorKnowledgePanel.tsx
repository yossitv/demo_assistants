'use client';

import React, { useEffect } from 'react';
import CreateKnowledgeSpaceForm from '@/components/CreateKnowledgeSpaceForm';
import { KnowledgeManagementList } from '@/components/dashboard/KnowledgeManagementList';
import { useKnowledgeManagement } from '@/lib/hooks/useKnowledgeManagement';

export function VectorKnowledgePanel() {
  const { knowledgeSpaces, loading, error, refetch, deleteKnowledgeSpace, getLinkedAgentCount } = useKnowledgeManagement();

  useEffect(() => {
    refetch();
  }, [refetch]);

  return (
    <section aria-label="Vector knowledge panel" className="space-y-6">
      <div className="space-y-2">
        <h2 className="text-2xl font-semibold text-gray-900">Vector Knowledge</h2>
        <p className="text-sm text-gray-600">
          Create knowledge spaces from URLs, sitemaps, or files. Manage existing spaces below.
        </p>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
        <CreateKnowledgeSpaceForm onSuccess={() => refetch()} />
      </div>

      <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
        <KnowledgeManagementList
          knowledgeSpaces={knowledgeSpaces}
          loading={loading}
          error={error}
          onRefresh={refetch}
          onDeleteKnowledge={deleteKnowledgeSpace}
          getLinkedAgentCount={getLinkedAgentCount}
        />
      </div>
    </section>
  );
}
