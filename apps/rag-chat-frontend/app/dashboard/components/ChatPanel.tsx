'use client';

import React, { useEffect } from 'react';
import ChatWidget from '@/components/ChatWidget';
import { ChatProvider, useChat } from '@/lib/context/ChatContext';
import { Agent } from '@/types';

interface ChatPanelProps {
  agents: Agent[];
  selectedAgentId: string | null;
  onAgentChange: (agentId: string | null) => void;
  onRequestCreateAgent: () => void;
}

function ChatPanelBody({ agents, selectedAgentId, onAgentChange, onRequestCreateAgent }: ChatPanelProps) {
  const { resetChat } = useChat();

  useEffect(() => {
    resetChat();
  }, [selectedAgentId, resetChat]);

  const hasAgents = agents.length > 0;

  return (
    <section aria-label="Chat panel" className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-semibold text-gray-900">Chat</h2>
          <p className="text-sm text-gray-600">Select an agent and start chatting. History is not stored.</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="hidden sm:inline text-xs text-gray-500">Agent selection</span>
          <div className="relative">
            <select
              className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500 min-w-[200px]"
              value={selectedAgentId ?? ''}
              onChange={(e) => onAgentChange(e.target.value || null)}
              aria-label="Agent selector"
              disabled={!hasAgents}
            >
              {!hasAgents && <option value="">No agents available</option>}
              {hasAgents && <option value="">Select an agent</option>}
              {agents.map((agent) => (
                <option key={agent.id} value={agent.id}>
                  {agent.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {!hasAgents ? (
        <div className="flex flex-col items-center justify-center gap-4 rounded-lg border border-dashed border-gray-300 bg-gray-50 p-8 text-center">
          <p className="text-gray-700">Create an agent to start chatting.</p>
          <button
            type="button"
            onClick={onRequestCreateAgent}
            className="inline-flex items-center justify-center rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            Create Agent
          </button>
        </div>
      ) : selectedAgentId ? (
        <ChatWidget agentId={selectedAgentId} />
      ) : (
        <div className="rounded-lg border border-gray-200 bg-white p-6 text-center text-gray-600">
          Select an agent from the dropdown to start chatting.
        </div>
      )}
    </section>
  );
}

export function ChatPanel(props: ChatPanelProps) {
  return (
    <ChatProvider>
      <ChatPanelBody {...props} />
    </ChatProvider>
  );
}
