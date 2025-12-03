'use client';

import React, { useEffect, useState } from 'react';
import CreateKnowledgeSpaceForm from '@/components/CreateKnowledgeSpaceForm';
import { KnowledgeManagementList } from '@/components/dashboard/KnowledgeManagementList';
import { Modal } from '@/components/dashboard/Modal';
import { useKnowledgeManagement } from '@/lib/hooks/useKnowledgeManagement';

export function VectorKnowledgePanel() {
  const { knowledgeSpaces, loading, error, refetch, deleteKnowledgeSpace, getLinkedAgentCount } = useKnowledgeManagement();
  const [modalOpen, setModalOpen] = useState(false);

  useEffect(() => {
    refetch();
  }, [refetch]);

  return (
    <section aria-label="Vector knowledge panel" className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h2 className="text-2xl font-semibold text-gray-900">Vector Knowledge</h2>
          <p className="text-sm text-gray-600">
            Create knowledge spaces from URLs, sitemaps, or files. Manage existing spaces below.
          </p>
        </div>
        <button
          onClick={() => setModalOpen(true)}
          className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-gray-100 text-gray-800 hover:bg-gray-200 border border-gray-300"
          aria-label="Create Knowledge Space"
        >
          <span className="text-xl leading-none">+</span>
        </button>
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

      <Modal
        title="Create Knowledge Space"
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        maxWidthClassName="max-w-4xl"
      >
        <CreateKnowledgeSpaceForm
          onSuccess={() => {
            setModalOpen(false);
            refetch();
          }}
        />
      </Modal>
    </section>
  );
}
