# Design Document

## Overview

This design document describes the architecture and implementation approach for redesigning the RAG Chat Frontend dashboard. The redesign transforms the existing interface into a sidebar-based navigation layout with four main sections: Chat, Vector Knowledge, Agents, and API Keys. The design maintains all existing functionality while improving usability through better organization and a cleaner visual hierarchy.

The system is a Next.js 16 application using React 19 and TypeScript, with Tailwind CSS for styling. It integrates with the rag-chat-stream-backend API for chat functionality and knowledge space management, while using browser local storage for agent configuration persistence.

## Architecture

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    Dashboard Layout                      │
│  ┌──────────┐  ┌──────────────────────────────────────┐│
│  │          │  │                                       ││
│  │ Sidebar  │  │        Main Content Area             ││
│  │          │  │                                       ││
│  │ - Chat   │  │  ┌─────────────────────────────────┐ ││
│  │ - Vector │  │  │                                  │ ││
│  │ - Agents │  │  │     Active Panel Component       │ ││
│  │ - API    │  │  │                                  │ ││
│  │          │  │  └─────────────────────────────────┘ ││
│  └──────────┘  └──────────────────────────────────────┘│
└─────────────────────────────────────────────────────────┘
         │                        │
         ├────────────────────────┼──────────────────┐
         │                        │                  │
         ▼                        ▼                  ▼
  Local Storage          Backend API         Environment Config
  (Agent configs)    (Chat, Knowledge)      (API keys, URLs)
```

### Component Hierarchy

```
DashboardLayout
├── Sidebar
│   ├── TabButton (Chat)
│   ├── TabButton (Vector Knowledge)
│   ├── TabButton (Agents)
│   └── TabButton (API Keys)
└── MainContent
    ├── ChatPanel
    │   ├── AgentSelector (dropdown)
    │   ├── MessageList
    │   └── MessageInput
    ├── VectorKnowledgePanel
    │   ├── CreateKnowledgeForm
    │   │   ├── URLInput (textarea)
    │   │   ├── SitemapCrawler
    │   │   └── FileUpload (with mode selector)
    │   └── KnowledgeSpaceList
    ├── AgentsPanel
    │   ├── CreateAgentForm
    │   │   ├── PresetSelector
    │   │   ├── KnowledgeCheckboxes
    │   │   ├── PromptTextarea
    │   │   └── StrictRAGToggle
    │   └── AgentList
    │       └── AgentListItem (with edit/delete/chat actions)
    └── APIKeysPanel
        ├── APIKeyDisplay (masked)
        └── CurlExample
```

## Visual & Responsive Notes

- Base: white background, light borders, soft shadows, rounded cards; 8/12/16px spacing rhythm.
- Sidebar (desktop): fixed left with the four tabs; main content scrolls.
- Mobile: sidebar collapses into a top tab bar (horizontally scrollable if needed) showing the same four tabs.
- Action affordances:
  - Agents list: actions are icons only (edit modal, delete, go to chat) with tooltips.
  - Knowledge list: actions are icons only (view data, delete) with tooltips; still show name/type/status/count/date. View Data opens a modal with tabs: default to RAG chunks; show “original data” tab only when upload content exists.
- Reuse existing forms/lists where possible (e.g., CreateKnowledgeSpaceForm, KnowledgeManagementList, AgentManagementList, CreateAgentForm), adjusting layout/controls to fit the new panels.

## Components and Interfaces

### Core Components

#### DashboardLayout
Main layout component that manages the sidebar and content area.

```typescript
interface DashboardLayoutProps {
  children: React.ReactNode;
}

interface DashboardState {
  activeTab: 'chat' | 'vector-knowledge' | 'agents' | 'api-keys';
}
```

#### Sidebar
Navigation component with tab buttons.

```typescript
interface SidebarProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}
```

#### ChatPanel
Chat interface with agent selection and messaging.

```typescript
interface ChatPanelProps {
  agents: Agent[];
  selectedAgentId: string | null;
  onAgentSelect: (agentId: string) => void;
}

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}
```

#### VectorKnowledgePanel
Knowledge space creation and management.

```typescript
interface VectorKnowledgePanelProps {
  knowledgeSpaces: KnowledgeSpace[];
  onCreateKnowledge: (data: CreateKnowledgeData) => Promise<void>;
  onDeleteKnowledge: (id: string) => Promise<void>;
}

interface CreateKnowledgeData {
  type: 'url' | 'sitemap' | 'file';
  urls?: string[];
  sitemapUrl?: string;
  file?: File;
  mode?: 'product_recommend' | 'qa' | 'document' | 'description';
}

interface KnowledgeSpace {
  id: string;
  name: string;
  type: 'web' | 'document' | 'product' | 'custom';
  status: 'processing' | 'completed' | 'partial' | 'error';
  documentCount: number;
  lastUpdatedAt: Date;
}
```

#### AgentsPanel
Agent creation and management.

```typescript
interface AgentsPanelProps {
  agents: Agent[];
  knowledgeSpaces: KnowledgeSpace[];
  onCreateAgent: (agent: CreateAgentData) => void;
  onUpdateAgent: (id: string, agent: Partial<Agent>) => void;
  onDeleteAgent: (id: string) => void;
  onGoToChat: (agentId: string) => void;
}

interface Agent {
  id: string;
  name: string;
  description: string;
  preset?: string;
  linkedKnowledgeIds: string[];
  prompt: string;
  strictRAG: boolean;
  createdAt: Date;
}

interface CreateAgentData {
  name: string;
  description: string;
  preset?: string;
  linkedKnowledgeIds: string[];
  prompt: string;
  strictRAG: boolean;
}
```

#### APIKeysPanel
API key display and usage examples.

```typescript
interface APIKeysPanelProps {
  apiKey: string;
  apiBaseUrl: string;
}
```

### Data Services

#### LocalStorageService
Manages agent persistence in browser storage.

```typescript
interface LocalStorageService {
  saveAgent(agent: Agent): void;
  getAgents(): Agent[];
  updateAgent(id: string, updates: Partial<Agent>): void;
  deleteAgent(id: string): void;
}
```

#### APIClient
Handles backend API communication.

```typescript
interface APIClient {
  chat(agentId: string, message: string): Promise<ReadableStream>;
  createKnowledgeSpace(data: CreateKnowledgeData): Promise<KnowledgeSpace>;
  listKnowledgeSpaces(): Promise<KnowledgeSpace[]>;
  deleteKnowledgeSpace(id: string): Promise<void>;
}
```

## Data Models

### Agent Model
```typescript
interface Agent {
  id: string;                    // UUID
  name: string;                  // Display name
  description: string;           // Brief description
  preset?: string;               // Optional preset identifier
  linkedKnowledgeIds: string[];  // Array of knowledge space IDs
  prompt: string;                // Custom system prompt
  strictRAG: boolean;            // Strict RAG mode flag
  createdAt: Date;               // Creation timestamp
}
```

### Knowledge Space Model
```typescript
interface KnowledgeSpace {
  id: string;                    // UUID
  name: string;                  // Display name
  type: 'web' | 'document' | 'product' | 'custom';
  status: 'processing' | 'completed' | 'partial' | 'error';
  documentCount: number;         // Number of documents
  lastUpdatedAt: Date;           // Last update timestamp
  metadata?: {
    sourceType?: 'url' | 'file';
    errors?: string[];
  };
}
```

### Chat Message Model
```typescript
interface ChatMessage {
  role: 'user' | 'assistant';    // Message sender
  content: string;               // Message text
  timestamp: Date;               // When sent
}
```

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system—essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property Reflection

Before defining properties, I've analyzed the testable criteria to eliminate redundancy:

- Properties 4.7 and 4.8 both test that agent list items display certain information. These can be combined into a single property about complete agent information display.
- Properties 4.12 and 4.13 form a round-trip relationship (save then load). Property 4.13 subsumes 4.12 as it validates the complete persistence cycle.
- Properties 2.2 and 2.3 are related but distinct: one tests sending, the other tests display. Both provide unique validation value.

### UI Structure Properties

Property 1: Tab navigation consistency
*For any* sidebar tab selection, clicking that tab should display the corresponding content panel and mark the tab as active
**Validates: Requirements 1.4**

Property 2: Agent dropdown population
*For any* set of agents stored in Local Storage, the chat panel dropdown should contain all those agents as selectable options
**Validates: Requirements 6.3**

### Chat Interaction Properties

Property 3: Message sending
*For any* valid message text and selected agent, submitting the message should trigger a chat request to the backend API
**Validates: Requirements 2.2**

Property 4: Response display
*For any* response received from the chat API, the message should appear in the message list with the assistant role
**Validates: Requirements 2.3**

Property 5: No history persistence
*For any* chat interaction, after the interaction completes, Local Storage should not contain conversation history entries
**Validates: Requirements 2.4**

### Knowledge Space Properties

Property 6: Knowledge space creation
*For any* valid input (URLs, sitemap, or file with mode), submitting the creation form should result in a new knowledge space being created via the API
**Validates: Requirements 3.4**

Property 7: Knowledge space information display
*For any* knowledge space in the list, the displayed item should include name, type, status, document count, and last updated date
**Validates: Requirements 3.6**

### Agent Management Properties

Property 8: Complete agent information display
*For any* agent in the agent list, the displayed item should include name, description, linked knowledge spaces, creation date, and all three action icons (edit, delete, go to chat)
**Validates: Requirements 4.7, 4.8**

Property 9: Edit modal display
*For any* agent in the list, clicking the edit icon should display a modal dialog containing the agent's current configuration
**Validates: Requirements 4.9**

Property 10: Agent deletion
*For any* agent in the list, clicking the delete icon should remove that agent from both the displayed list and Local Storage
**Validates: Requirements 4.10**

Property 11: Go to chat navigation
*For any* agent in the list, clicking the "go to chat" icon should navigate to the Chat panel and preselect that agent in the dropdown
**Validates: Requirements 4.11**

Property 12: Agent persistence round-trip
*For any* agent configuration, saving the agent to Local Storage and then reloading the page should retrieve an equivalent agent configuration
**Validates: Requirements 4.12, 4.13**

### API Key Properties

Property 13: API key masking
*For any* API key value, the displayed text should show only the last four characters with the rest masked
**Validates: Requirements 5.2**

Property 14: Full key clipboard copy
*For any* API key value, clicking the copy icon should place the complete unmasked key value into the clipboard
**Validates: Requirements 5.3**

Property 15: Curl example format
*For any* API key and base URL, the curl example should include the key in an Authorization header with Bearer scheme
**Validates: Requirements 5.5**

## Error Handling

### Client-Side Validation
- **Agent Creation**: Validate required fields (name, prompt) before submission
- **Knowledge Space Creation**: Validate input format (URLs, file type, mode selection)
- **File Upload**: Validate file size and type before upload

### API Error Handling
- **Network Errors**: Display user-friendly error messages with retry options
- **Authentication Errors**: Prompt user to check API key configuration
- **Validation Errors**: Display specific field errors from backend responses
- **Timeout Errors**: Show timeout message with option to retry

### State Management Errors
- **Local Storage Quota**: Handle quota exceeded errors gracefully
- **Parse Errors**: Handle corrupted local storage data with fallback to empty state
- **Missing Data**: Handle missing agents or knowledge spaces with appropriate empty states

### Error Display Patterns
```typescript
interface ErrorState {
  type: 'network' | 'validation' | 'auth' | 'unknown';
  message: string;
  retryable: boolean;
}
```

## Testing Strategy

### Unit Testing
The application will use Jest and React Testing Library for unit testing. Tests will focus on:

- **Component Rendering**: Verify components render with correct props
- **User Interactions**: Test button clicks, form submissions, dropdown selections
- **State Management**: Verify state updates correctly on user actions
- **Local Storage**: Test save/load/delete operations
- **Error Handling**: Verify error states display correctly

Example unit tests:
- Sidebar renders all four tabs with correct labels
- Agent dropdown shows "Create an agent" message when no agents exist
- API key display masks all but last 4 characters
- Delete confirmation removes agent from list

### Property-Based Testing
The application will use fast-check for property-based testing. The testing library will be configured to run a minimum of 100 iterations per property test.

Each property-based test will be tagged with a comment explicitly referencing the correctness property from this design document using the format: `**Feature: apps--rag-chat-frontend--dashboar-renew, Property {number}: {property_text}**`

Property tests will cover:
- Tab navigation with random tab selections
- Agent CRUD operations with random agent data
- Knowledge space display with random knowledge space data
- API key masking with random key values
- Local storage round-trip with random agent configurations

### Integration Testing
Integration tests will verify end-to-end workflows:
- Create agent → Navigate to chat → Select agent → Send message
- Create knowledge space → Link to agent → Verify in agent form
- Edit agent → Save → Verify changes persist after reload
- Copy API key → Verify clipboard contains full key

### Testing Tools
- **Jest**: Test runner and assertion library
- **React Testing Library**: Component testing utilities
- **fast-check**: Property-based testing library
- **MSW (Mock Service Worker)**: API mocking for integration tests

## Visual Design

### Color Palette
- **Base**: White (#FFFFFF)
- **Text Primary**: Gray 900 (#111827)
- **Text Secondary**: Gray 600 (#4B5563)
- **Border**: Gray 200 (#E5E7EB)
- **Accent**: Blue 600 (#2563EB)
- **Success**: Green 600 (#16A34A)
- **Error**: Red 600 (#DC2626)

### Spacing System
- **Base unit**: 4px
- **Common spacing**: 8px, 12px, 16px, 24px, 32px
- **Component padding**: 16px (mobile), 24px (desktop)
- **Card spacing**: 16px internal padding, 16px gap between cards

### Typography
- **Headings**: Font weight 600, sizes 24px/20px/18px
- **Body**: Font weight 400, size 16px
- **Small**: Font weight 400, size 14px
- **Labels**: Font weight 500, size 14px

### Component Styling
- **Cards**: Rounded corners (8px), light border, subtle shadow on hover
- **Buttons**: Rounded corners (6px), padding 12px 24px
- **Inputs**: Rounded corners (6px), border, focus ring
- **Dropdowns**: Rounded corners (6px), border, max height with scroll

### Responsive Behavior
- **Mobile (<768px)**: Single column, full-width sidebar (collapsible)
- **Tablet (768px-1024px)**: Narrow sidebar, flexible content area
- **Desktop (>1024px)**: Fixed sidebar width (240px), spacious content area

## Implementation Notes

### Technology Stack
- **Framework**: Next.js 16 (App Router)
- **UI Library**: React 19
- **Language**: TypeScript 5
- **Styling**: Tailwind CSS 4
- **State Management**: React Context + hooks
- **HTTP Client**: fetch API with custom wrapper
- **Storage**: Browser localStorage API

### File Structure
```
app/
├── dashboard/
│   ├── layout.tsx              # Dashboard layout with sidebar
│   ├── page.tsx                # Default dashboard page
│   └── components/
│       ├── Sidebar.tsx
│       ├── ChatPanel.tsx
│       ├── VectorKnowledgePanel.tsx
│       ├── AgentsPanel.tsx
│       └── APIKeysPanel.tsx
components/
├── dashboard/
│   ├── CreateAgentForm.tsx
│   ├── AgentList.tsx
│   ├── CreateKnowledgeForm.tsx
│   ├── KnowledgeSpaceList.tsx
│   ├── MessageList.tsx
│   └── MessageInput.tsx
lib/
├── services/
│   ├── localStorage.ts         # Local storage operations
│   └── apiClient.ts            # Backend API client
├── hooks/
│   ├── useAgents.ts            # Agent management hook
│   ├── useKnowledgeSpaces.ts  # Knowledge space hook
│   └── useChat.ts              # Chat functionality hook
└── types/
    └── dashboard.ts            # TypeScript interfaces
```

### Environment Configuration
```bash
NEXT_PUBLIC_API_BASE_URL=https://api.example.com
NEXT_PUBLIC_JWT_TOKEN=your-api-key-here
```

### Reusable Components
The design will leverage existing components from the current application:
- `ChatWidget` (adapted for new layout)
- `CreateAgentForm` (enhanced with presets)
- `CreateKnowledgeSpaceForm` (adapted for new layout)
- `KnowledgeSpaceList` (enhanced with status badges)
- `MessageList` and `MessageInput` (reused as-is)

### Performance Considerations
- **Lazy Loading**: Load panel components only when tab is active
- **Memoization**: Use React.memo for list items to prevent unnecessary re-renders
- **Debouncing**: Debounce search/filter inputs
- **Virtual Scrolling**: Implement for large agent/knowledge space lists
- **Code Splitting**: Split panel components into separate chunks

### Accessibility
- **Keyboard Navigation**: Full keyboard support for all interactions
- **ARIA Labels**: Proper labels for all interactive elements
- **Focus Management**: Logical focus order, visible focus indicators
- **Screen Reader**: Semantic HTML and ARIA attributes
- **Color Contrast**: WCAG AA compliance (4.5:1 for text)
