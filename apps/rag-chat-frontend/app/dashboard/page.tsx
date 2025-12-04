'use client';

import { useEffect, useState } from 'react';
import { DashboardLayout } from './components/DashboardLayout';
import { SidebarTab } from './components/Sidebar';
import { ChatPanel } from './components/ChatPanel';
import { VectorKnowledgePanel } from './components/VectorKnowledgePanel';
import { AgentsPanel } from './components/AgentsPanel';
import { APIKeysPanel } from './components/APIKeysPanel';
import { useAgentManagement } from '@/lib/hooks/useAgentManagement';
import { useKnowledgeManagement } from '@/lib/hooks/useKnowledgeManagement';
import { useAgent } from '@/lib/context/KnowledgeContext';
import { Agent } from '@/types';

export default function DashboardPage() {
  const [activeTab, setActiveTab] = useState<SidebarTab>('chat');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [selectedAgentId, setSelectedAgentId] = useState<string | null>(null);

  const agentManagement = useAgentManagement();
  const knowledgeManagement = useKnowledgeManagement();
  const { selectAgent, refreshAgents } = useAgent();

  useEffect(() => {
    agentManagement.refetch();
    knowledgeManagement.refetch();
  }, [agentManagement.refetch, knowledgeManagement.refetch]);

  useEffect(() => {
    if (!selectedAgentId && agentManagement.agents.length > 0) {
      setSelectedAgentId(agentManagement.agents[0].id);
    }
  }, [agentManagement.agents, selectedAgentId]);

  const handleAgentSelection = (agentId: string | null) => {
    setSelectedAgentId(agentId);
    const agent = agentManagement.agents.find((a) => a.id === agentId);
    if (agent) {
      selectAgent(agent);
    }
  };

  const handleGoToChat = (agent: Agent) => {
    handleAgentSelection(agent.id);
    setActiveTab('chat');
    setSidebarOpen(false);
  };

  const handleAgentCreated = async (newAgentId?: string) => {
    await agentManagement.refetch();
    refreshAgents();
    if (newAgentId) {
      setSelectedAgentId(newAgentId);
      setActiveTab('chat');
    }
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'chat':
        return (
          <ChatPanel
            agents={agentManagement.agents}
            selectedAgentId={selectedAgentId}
            onAgentChange={handleAgentSelection}
            onRequestCreateAgent={() => setActiveTab('agents')}
          />
        );
      case 'vector-knowledge':
        return <VectorKnowledgePanel />;
      case 'agents':
        return (
          <AgentsPanel
            knowledgeSpaces={knowledgeManagement.knowledgeSpaces}
            agents={agentManagement.agents}
            loading={agentManagement.loading}
            error={agentManagement.error}
            onRefreshAgents={agentManagement.refetch}
            onGoToChat={handleGoToChat}
            onAgentCreated={handleAgentCreated}
            onUpdateAgent={agentManagement.updateAgent}
            onDeleteAgent={agentManagement.deleteAgent}
          />
        );
      case 'api-keys':
        return <APIKeysPanel agents={agentManagement.agents} />;
      default:
        return null;
    }
  };

  return (
    <DashboardLayout
      activeTab={activeTab}
      onTabChange={setActiveTab}
      sidebarOpen={sidebarOpen}
      onToggleSidebar={setSidebarOpen}
    >
      {renderContent()}
    </DashboardLayout>
  );
}
