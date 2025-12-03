'use client';

import React from 'react';
import CreateAgentForm from '@/components/CreateAgentForm';
import { AgentManagementList } from '@/components/dashboard/AgentManagementList';
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
  return (
    <section aria-label="Agents panel" className="space-y-6">
      <div className="space-y-2">
        <h2 className="text-2xl font-semibold text-gray-900">Agents</h2>
        <p className="text-sm text-gray-600">Create agents and manage existing ones. Link them to knowledge spaces and jump into chat.</p>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
        <CreateAgentForm onAgentCreated={onAgentCreated} />
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
    </section>
  );
}
