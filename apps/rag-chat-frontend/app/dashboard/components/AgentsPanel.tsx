'use client';

import React, { useState } from 'react';
import CreateAgentForm from '@/components/CreateAgentForm';
import { AgentManagementList } from '@/components/dashboard/AgentManagementList';
import { Modal } from '@/components/dashboard/Modal';
import { Agent, AgentUpdateRequest, KnowledgeSpace } from '@/types';

interface AgentsPanelProps {
  knowledgeSpaces: KnowledgeSpace[];
  agents: Agent[];
  loading?: boolean;
  error?: string | null;
  onRefreshAgents: () => void;
  onGoToChat: (agent: Agent) => void;
  onAgentCreated: (agentId?: string) => void;
  onUpdateAgent?: (id: string, data: AgentUpdateRequest) => Promise<void>;
  onDeleteAgent?: (id: string) => Promise<void>;
}

export function AgentsPanel({
  knowledgeSpaces,
  agents,
  loading,
  error,
  onRefreshAgents,
  onGoToChat,
  onAgentCreated,
  onUpdateAgent,
  onDeleteAgent,
}: AgentsPanelProps) {
  const [agentModalOpen, setAgentModalOpen] = useState(false);

  return (
    <section aria-label="Agents panel" className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h2 className="text-2xl font-semibold text-gray-900">Agents</h2>
          <p className="text-sm text-gray-600">Create agents and manage existing ones. Link them to knowledge spaces and jump into chat.</p>
        </div>
        <button
          onClick={() => setAgentModalOpen(true)}
          className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-gray-100 text-gray-800 hover:bg-gray-200 border border-gray-300"
          aria-label="Create Agent"
        >
          <span className="text-xl leading-none">+</span>
        </button>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
        <AgentManagementList
          knowledgeSpaces={knowledgeSpaces}
          agents={agents}
          loading={loading}
          error={error}
          onRefresh={onRefreshAgents}
          onUpdateAgent={onUpdateAgent}
          onDeleteAgent={onDeleteAgent}
          onGoToChat={onGoToChat}
        />
      </div>

      <Modal
        title="Create Agent"
        isOpen={agentModalOpen}
        onClose={() => setAgentModalOpen(false)}
      >
        <CreateAgentForm
          onCreated={(agentId) => {
            onAgentCreated(agentId);
            setAgentModalOpen(false);
          }}
        />
      </Modal>
    </section>
  );
}
