'use client';

import React, { useCallback, useEffect, useId, useState, useRef } from 'react';
import { useChat } from '@/lib/context/ChatContext';
import MessageList from './MessageList';
import MessageInput from './MessageInput';
import LoadingSpinner from './LoadingSpinner';
import ErrorMessage from './ErrorMessage';

/**
 * ChatWidget component props
 */
interface ChatWidgetProps {
  /** Required agent ID for the chat session */
  agentId: string;
  /** Enable embed mode for iframe optimization (more compact UI) */
  embedMode?: boolean;
  /** Additional CSS classes to apply to the container */
  className?: string;
}

/**
 * ChatWidget Component
 *
 * A complete chat interface that combines MessageList and MessageInput components
 * with full state management via ChatContext.
 *
 * Features:
 * - Message history display with auto-scroll
 * - Message input with send functionality
 * - Loading indicator during message processing
 * - Error display with retry functionality
 * - Embed mode for iframe optimization
 * - Responsive Tailwind CSS design
 *
 * @example
 * ```tsx
 * // Normal mode
 * import ChatWidget from '@/components/ChatWidget';
 * import { ChatProvider } from '@/lib/context/ChatContext';
 *
 * function ChatPage() {
 *   return (
 *     <ChatProvider>
 *       <ChatWidget agentId="agent-123" />
 *     </ChatProvider>
 *   );
 * }
 * ```
 *
 * @example
 * ```tsx
 * // Embed mode (for iframe)
 * import ChatWidget from '@/components/ChatWidget';
 * import { ChatProvider } from '@/lib/context/ChatContext';
 *
 * function EmbedChatPage() {
 *   return (
 *     <ChatProvider>
 *       <ChatWidget agentId="agent-123" embedMode />
 *     </ChatProvider>
 *   );
 * }
 * ```
 */
const ChatWidget: React.FC<ChatWidgetProps> = ({
  agentId,
  embedMode = false,
  className = '',
}) => {
  const { messages, isLoading, error, sendMessage, stopStreaming, clearError } = useChat();
  const [lastMessage, setLastMessage] = useState<string>('');
  const containerRef = useRef<HTMLDivElement>(null);
  const errorRegionRef = useRef<HTMLDivElement>(null);
  const headingId = useId();
  const messageListId = useId();
  const errorRegionId = `${messageListId}-error`;

  /**
   * Handle sending a message to the agent
   */
  const handleSendMessage = useCallback(
    async (message: string) => {
      setLastMessage(message);
      await sendMessage(agentId, message);
    },
    [agentId, sendMessage]
  );

  /**
   * Handle retry after an error
   * Resends the last message that failed
   */
  const handleRetry = useCallback(() => {
    if (lastMessage) {
      handleSendMessage(lastMessage);
    }
  }, [lastMessage, handleSendMessage]);

  /**
   * Handle error dismissal
   */
  const handleDismissError = useCallback(() => {
    clearError();
  }, [clearError]);

  /**
   * Move focus to the error region so screen readers announce it
   */
  useEffect(() => {
    if (error && errorRegionRef.current) {
      errorRegionRef.current.focus({ preventScroll: true });
    }
  }, [error]);

  return (
    <section
      ref={containerRef}
      className={`
        flex flex-col
        ${embedMode ? 'min-h-[100dvh]' : 'h-full min-h-[500px] sm:min-h-[600px]'}
        bg-white
        ${embedMode ? '' : 'rounded-lg shadow-lg border border-gray-200'}
        overflow-hidden
        ${className}
      `}
      aria-label="Chat widget"
      aria-labelledby={!embedMode ? headingId : undefined}
      aria-describedby={error ? errorRegionId : undefined}
      role="region"
      aria-busy={isLoading}
    >
      {/* Header (only show in non-embed mode) */}
      {!embedMode && (
        <header className="flex-shrink-0 px-4 sm:px-6 py-3 sm:py-4 border-b border-gray-200 bg-gradient-to-r from-blue-600 to-blue-700">
          <h2 id={headingId} className="text-lg sm:text-xl font-semibold text-white">
            Chat Assistant
          </h2>
          <p className="text-xs sm:text-sm text-blue-100 mt-1">Ask me anything!</p>
        </header>
      )}

      {/* Messages Area */}
      <div className="flex-1 overflow-hidden flex flex-col">
        {/* Error Display */}
        {error && (
          <div
            ref={errorRegionRef}
            id={errorRegionId}
            className={`flex-shrink-0 ${embedMode ? 'p-2' : 'p-3 sm:p-4'}`}
            role="alert"
            aria-live="assertive"
            tabIndex={-1}
          >
            <ErrorMessage
              message={error}
              onRetry={lastMessage ? handleRetry : undefined}
              onDismiss={handleDismissError}
            />
          </div>
        )}

        {/* Message List */}
        <div className="flex-1 overflow-y-auto">
          <MessageList
            messages={messages}
            listId={messageListId}
            className={embedMode ? 'p-2' : ''}
          />
        </div>

        {/* Loading Indicator */}
        {isLoading && (
          <div
            className={`
              flex-shrink-0 flex items-center justify-between
              ${embedMode ? 'py-2 px-2' : 'py-3 sm:py-4 px-4'}
              bg-gray-50 border-t border-gray-100
            `}
            role="status"
            aria-live="polite"
            aria-atomic="true"
          >
            <div className="flex items-center gap-3">
              <LoadingSpinner size="sm" />
              <span className="text-xs sm:text-sm text-gray-600">
                {embedMode ? 'Thinking...' : 'Processing your message...'}
              </span>
            </div>
            <button
              onClick={stopStreaming}
              className="px-3 py-1.5 text-xs font-medium text-red-600 hover:text-red-700 hover:bg-red-50 rounded-md transition-colors"
              aria-label="Stop generating response"
            >
              Stop
            </button>
          </div>
        )}
      </div>

      {/* Message Input */}
      <div className="flex-shrink-0">
        <MessageInput
          onSendMessage={handleSendMessage}
          isLoading={isLoading}
          placeholder={embedMode ? 'Type here...' : 'Type your message...'}
          className={embedMode ? 'p-2 border-t' : ''}
          ariaControls={messageListId}
          describedById={error ? errorRegionId : undefined}
        />
      </div>

      {/* Embed Mode Footer */}
      {embedMode && (
        <footer className="flex-shrink-0 px-2 py-1 bg-gray-50 border-t border-gray-200">
          <p className="text-xs text-gray-500 text-center">
            Powered by AI Assistant
          </p>
        </footer>
      )}
    </section>
  );
};

export default ChatWidget;
