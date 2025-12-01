'use client';

import React from 'react';
import { ChatProvider } from '@/lib/context/ChatContext';
import ChatWidget from '@/components/ChatWidget';

/**
 * ChatPageClient component props
 */
interface ChatPageClientProps {
  /** The agent ID for this chat session */
  agentId: string;
}

/**
 * ChatPageClient Component
 *
 * Client component that wraps the ChatWidget with ChatProvider.
 * This component is responsible for:
 * - Providing chat state management via ChatProvider
 * - Rendering the ChatWidget with the appropriate agentId
 * - Displaying the page title and layout
 *
 * This is a client component because:
 * - ChatProvider uses React hooks and state
 * - ChatWidget is interactive and uses hooks
 *
 * @example
 * ```tsx
 * <ChatPageClient agentId="agent-123" />
 * ```
 */
const ChatPageClient: React.FC<ChatPageClientProps> = ({ agentId }) => {
  return (
    <main className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100" role="main">
      <div className="container mx-auto px-4 py-8">
        {/* Page Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Chat Interface
          </h1>
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <span className="font-medium">Agent ID:</span>
            <code className="px-2 py-1 bg-gray-200 rounded font-mono text-xs break-all">
              {agentId}
            </code>
          </div>
        </div>

        {/* Chat Widget with Provider */}
        <div className="max-w-4xl mx-auto">
          <ChatProvider>
            <ChatWidget agentId={agentId} />
          </ChatProvider>
        </div>

        {/* Footer */}
        <div className="mt-8 text-center">
          <a
            href="/"
            className="inline-flex items-center justify-center gap-2 text-sm text-gray-700 hover:text-gray-900 transition-colors px-4 py-2 rounded-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 min-h-[44px]"
            aria-label="Back to Home"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M10 19l-7-7m0 0l7-7m-7 7h18"
              />
            </svg>
            Back to Home
          </a>
        </div>
      </div>
    </main>
  );
};

export default ChatPageClient;
