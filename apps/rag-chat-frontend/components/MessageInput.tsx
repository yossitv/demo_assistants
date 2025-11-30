'use client';

import React, {
  useState,
  useCallback,
  useEffect,
  useId,
  useRef,
  FormEvent,
  KeyboardEvent,
} from 'react';

/**
 * MessageInput component props
 */
interface MessageInputProps {
  /** Callback function to handle message submission */
  onSendMessage: (message: string) => void;
  /** Loading state to disable input during message sending */
  isLoading: boolean;
  /** Placeholder text for the input field */
  placeholder?: string;
  /** Additional CSS classes to apply to the form container */
  className?: string;
  /** Additional disabled state (combined with isLoading) */
  disabled?: boolean;
  /** Optional id of element that describes the input (e.g. error message) */
  describedById?: string;
  /** Optional id of region the input controls (e.g. message log) */
  ariaControls?: string;
}

/**
 * MessageInput Component
 *
 * A responsive chat input component with the following features:
 * - Text input field with auto-expanding textarea
 * - Send button with loading state
 * - Enter key submission (Shift+Enter for new line)
 * - Automatic input clearing after successful send
 * - Disabled state during loading
 * - Tailwind CSS styling with focus states and transitions
 *
 * @example
 * ```tsx
 * import MessageInput from '@/components/MessageInput';
 * import { useChat } from '@/lib/context/ChatContext';
 *
 * function ChatPage() {
 *   const { sendMessage, isLoading } = useChat();
 *
 *   const handleSendMessage = async (message: string) => {
 *     await sendMessage('agent-id', message);
 *   };
 *
 *   return (
 *     <MessageInput
 *       onSendMessage={handleSendMessage}
 *       isLoading={isLoading}
 *       placeholder="Type your message..."
 *     />
 *   );
 * }
 * ```
 */

const MessageInput: React.FC<MessageInputProps> = ({
  onSendMessage,
  isLoading,
  placeholder = 'Type your message...',
  className = '',
  disabled = false,
  describedById,
  ariaControls,
}) => {
  const [message, setMessage] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const inputId = useId();
  const hintId = `${inputId}-hint`;
  const combinedDescriptions = [hintId, describedById].filter(Boolean).join(' ') || undefined;

  const resetTextareaHeight = useCallback(() => {
    if (!textareaRef.current) return;
    textareaRef.current.style.height = 'auto';
    const nextHeight = Math.max(Math.min(textareaRef.current.scrollHeight, 200), 48);
    textareaRef.current.style.height = `${nextHeight}px`;
  }, []);

  const focusTextarea = useCallback(() => {
    if (textareaRef.current) {
      textareaRef.current.focus({ preventScroll: true });
    }
  }, []);

  /**
   * Handle form submission
   */
  const handleSubmit = useCallback(
    (e: FormEvent<HTMLFormElement>) => {
      e.preventDefault();

      // Trim the message and check if it's not empty
      const trimmedMessage = message.trim();
      if (!trimmedMessage || isLoading || disabled) {
        return;
      }

      // Send the message
      onSendMessage(trimmedMessage);

      // Clear the input field after successful send
      setMessage('');
      resetTextareaHeight();
      focusTextarea();
    },
    [message, onSendMessage, isLoading, disabled, resetTextareaHeight, focusTextarea]
  );

  /**
   * Handle Enter key press for submission
   * Submit on Enter, new line on Shift+Enter
   */
  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();

        const trimmedMessage = message.trim();
        if (!trimmedMessage || isLoading || disabled) {
          return;
        }

        // Send the message
        onSendMessage(trimmedMessage);

        // Clear the input field
        setMessage('');
        resetTextareaHeight();
        focusTextarea();
      }
    },
    [message, onSendMessage, isLoading, disabled, resetTextareaHeight, focusTextarea]
  );

  useEffect(() => {
    resetTextareaHeight();
  }, [message, resetTextareaHeight]);

  /**
   * Check if send button should be disabled
   */
  const isSendDisabled = !message.trim() || isLoading || disabled;

  return (
    <form
      onSubmit={handleSubmit}
      className={`flex flex-col sm:flex-row sm:items-end gap-3 sm:gap-2 p-3 sm:p-4 bg-white border-t border-gray-200 pb-[env(safe-area-inset-bottom,0px)] ${className}`}
      role="form"
      aria-label="Send message"
    >
      {/* Text Input Area */}
      <div className="flex-1 relative">
        <label htmlFor={inputId} className="sr-only">
          Message input
        </label>
        <p id={hintId} className="sr-only">
          Press Enter to send. Use Shift plus Enter to add a new line.
        </p>
        <textarea
          id={inputId}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={isLoading || disabled}
          rows={1}
          ref={textareaRef}
          className={`
            w-full
            px-3 sm:px-4 py-3
            pr-3 sm:pr-12
            text-base sm:text-base
            border border-gray-300
            rounded-lg
            resize-none
            overflow-hidden
            focus:outline-none
            focus:ring-2
            focus:ring-blue-500
            focus:border-transparent
            disabled:bg-gray-100
            disabled:cursor-not-allowed
            disabled:text-gray-500
            transition-colors
            min-h-[48px]
            max-h-[200px]
            touch-manipulation
          `}
          style={{
            height: 'auto',
            minHeight: '48px',
            maxHeight: '200px',
          }}
          onInput={resetTextareaHeight}
          aria-disabled={isLoading || disabled}
          aria-required="true"
          aria-describedby={combinedDescriptions}
          aria-controls={ariaControls}
          autoComplete="off"
          autoCorrect="on"
          autoCapitalize="sentences"
          inputMode="text"
        />

        {/* Character counter (optional, hidden for now) */}
        {/* <div className="absolute bottom-2 right-2 text-xs text-gray-400">
          {message.length}
        </div> */}
      </div>

      {/* Send Button */}
      <button
        type="submit"
        disabled={isSendDisabled}
        className={`
          flex-shrink-0
          w-full sm:w-auto
          px-4 sm:px-6 py-3
          min-w-[56px] sm:min-w-[80px]
          min-h-[48px]
          bg-blue-600
          hover:bg-blue-700
          active:bg-blue-800
          disabled:bg-gray-300
          disabled:cursor-not-allowed
          text-white
          font-medium
          rounded-lg
          transition-colors
          focus:outline-none
          focus:ring-2
          focus:ring-blue-500
          focus:ring-offset-2
          flex items-center justify-center
          gap-2
          touch-manipulation
        `}
        aria-label={isLoading ? 'Sending message...' : 'Send message'}
        aria-disabled={isSendDisabled}
      >
        {isLoading ? (
          <>
            {/* Loading Spinner */}
            <div
              className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"
              role="status"
              aria-hidden="true"
            />
            <span className="hidden sm:inline">Sending...</span>
          </>
        ) : (
          <>
            <span className="hidden sm:inline">Send</span>
            {/* Send Icon */}
            <svg
              className="w-5 h-5 sm:w-5 sm:h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
              />
            </svg>
          </>
        )}
      </button>
    </form>
  );
};

export default MessageInput;
