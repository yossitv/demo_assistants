# ChatWidget Component

## Overview

The `ChatWidget` component is a complete chat interface that combines MessageList and MessageInput components with full state management via ChatContext. It provides a production-ready chat experience with loading states, error handling, and support for both normal and embed modes.

## Location

`/Users/ys/Documents/GitHub/assistants/web/components/ChatWidget.tsx`

## Features

- **Message History Display**: Shows user and assistant messages with auto-scroll functionality
- **Message Input**: Text input with send button, supports Enter to send (Shift+Enter for new line)
- **Loading Indicator**: Visual feedback during message processing
- **Error Handling**: Displays errors with retry and dismiss functionality
- **Embed Mode**: Optimized UI for iframe embedding
- **Responsive Design**: Built with Tailwind CSS for all screen sizes
- **Accessibility**: Proper ARIA labels and screen reader support

## Props

```typescript
interface ChatWidgetProps {
  /** Required agent ID for the chat session */
  agentId: string;

  /** Enable embed mode for iframe optimization (more compact UI) */
  embedMode?: boolean;

  /** Additional CSS classes to apply to the container */
  className?: string;
}
```

## Usage

### Normal Mode

```tsx
import ChatWidget from '@/components/ChatWidget';
import { ChatProvider } from '@/lib/context/ChatContext';

function ChatPage() {
  return (
    <ChatProvider>
      <ChatWidget agentId="agent-123" />
    </ChatProvider>
  );
}
```

### Embed Mode (for iframe)

```tsx
import ChatWidget from '@/components/ChatWidget';
import { ChatProvider } from '@/lib/context/ChatContext';

function EmbedChatPage() {
  return (
    <ChatProvider>
      <ChatWidget agentId="agent-123" embedMode />
    </ChatProvider>
  );
}
```

### With Custom Styling

```tsx
<ChatProvider>
  <ChatWidget
    agentId="agent-123"
    className="max-w-2xl mx-auto"
  />
</ChatProvider>
```

## Dependencies

The ChatWidget component relies on the following components and utilities:

- **MessageList** (`/web/components/MessageList.tsx`): Displays message history
- **MessageInput** (`/web/components/MessageInput.tsx`): Handles message input
- **LoadingSpinner** (`/web/components/LoadingSpinner.tsx`): Shows loading state
- **ErrorMessage** (`/web/components/ErrorMessage.tsx`): Displays errors
- **ChatContext** (`/web/lib/context/ChatContext.tsx`): Manages chat state
- **useChat Hook** (from ChatContext): Provides access to chat state and actions

## ChatContext Integration

The component uses the `useChat` hook from ChatContext which provides:

```typescript
interface ChatContextType {
  // State
  messages: Message[];
  isLoading: boolean;
  error: string | null;
  conversationId?: string;

  // Actions
  sendMessage: (agentId: string, message: string) => Promise<void>;
  clearError: () => void;
  resetChat: () => void;
}
```

## Component Structure

```
ChatWidget
├── Header (only in normal mode)
│   ├── Title: "Chat Assistant"
│   └── Subtitle: "Ask me anything!"
├── Messages Area
│   ├── Error Display (when error exists)
│   ├── MessageList (scrollable)
│   └── Loading Indicator (when isLoading)
├── MessageInput
└── Footer (only in embed mode)
    └── "Powered by AI Assistant"
```

## Styling

The component uses Tailwind CSS with the following key styling features:

- **Normal Mode**: Rounded corners, shadow, border, header with gradient
- **Embed Mode**: No rounded corners, minimal padding, compact footer
- **Responsive**: Adjusts layout and spacing based on screen size
- **Height**: Configurable via className, defaults to `min-h-[600px]` in normal mode, `h-screen` in embed mode

## Error Handling

When an error occurs:
1. Error message is displayed at the top of the messages area
2. Retry button appears if a previous message exists
3. Dismiss button allows users to clear the error
4. Error announcement for screen readers via `aria-live="assertive"`

## Loading State

When a message is being processed:
1. Loading spinner appears below messages
2. Input field is disabled
3. Loading message displayed ("Processing your message..." or "Thinking..." in embed mode)
4. Status announcement for screen readers via `aria-live="polite"`

## Accessibility Features

- `aria-label="Chat widget"` on main container
- `aria-live` regions for loading and error states
- Proper role attributes (`status`, `alert`)
- Keyboard navigation support
- Screen reader announcements for state changes

## Testing

Comprehensive test suite available at:
`/Users/ys/Documents/GitHub/assistants/web/__tests__/components/ChatWidget.test.tsx`

Test coverage includes:
- Component rendering (normal and embed modes)
- Message sending functionality
- Loading state behavior
- Error handling and retry mechanism
- Message display
- Accessibility features
- ChatContext integration

Run tests with:
```bash
npm test -- ChatWidget.test.tsx
```

## Example Integration

The ChatWidget is already integrated in the application at:
`/Users/ys/Documents/GitHub/assistants/web/app/agents/[agentId]/ChatPageClient.tsx`

## Requirements Covered

This component fulfills the following MVP requirements:

- **1.1**: Chat interface implementation
- **1.2**: Message input and display
- **1.3**: Loading indicators
- **1.4**: Error handling with retry
- **1.5**: Message history display
- **5.3**: Client-side state management
- **8.1**: Component composition
- **8.2**: Responsive design
- **9.4**: Error boundaries
- **10.1**: Production-ready UI

## Browser Support

The component supports all modern browsers:
- Chrome/Edge (latest)
- Firefox (latest)
- Safari (latest)
- Mobile browsers (iOS Safari, Chrome Mobile)

## Notes

- The component requires `ChatProvider` to be wrapped around it in the component tree
- Messages are automatically scrolled to the latest when new messages arrive
- The `agentId` prop is required and must be a valid agent ID
- In embed mode, the UI is optimized for smaller spaces (iframes)
