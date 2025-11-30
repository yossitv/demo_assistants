'use client';

import React from 'react';
import { ChatProvider } from '@/lib/context/ChatContext';
import ChatWidget from '@/components/ChatWidget';

/**
 * EmbedChatClient component props
 */
interface EmbedChatClientProps {
  /** The agent ID for this chat session */
  agentId: string;
}

/**
 * EmbedChatClient Component
 *
 * Minimal client component for embedded chat widget.
 * Designed to be embedded in iframes on external websites.
 *
 * Features:
 * - ChatProvider for state management
 * - ChatWidget in embed mode
 * - Transparent background
 * - No extra UI chrome
 * - Optimized for iframe dimensions
 *
 * This component is minimal by design - it only renders
 * the chat widget without any navigation, headers, or
 * surrounding layout elements.
 *
 * @example
 * ```tsx
 * <EmbedChatClient agentId="agent-123" />
 * ```
 */
const EmbedChatClient: React.FC<EmbedChatClientProps> = ({ agentId }) => {
  return (
    <div
      className="w-full min-h-[100dvh]"
      style={{ background: 'transparent' }}
      role="main"
      aria-label="Embedded chat"
    >
      <ChatProvider>
        <ChatWidget agentId={agentId} embedMode={true} />
      </ChatProvider>
    </div>
  );
};

export default EmbedChatClient;
