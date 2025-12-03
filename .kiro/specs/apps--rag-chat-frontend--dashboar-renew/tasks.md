# Implementation Plan

## Current Status Analysis
The existing dashboard at `/dashboard` has basic agent and knowledge management functionality. The redesign requires transforming this into a sidebar-based layout with four distinct panels. Many components already exist but need to be reorganized and enhanced.

## Existing Components (Reusable)
- ✅ AgentManagementList - displays agents in table format
- ✅ KnowledgeManagementList - displays knowledge spaces with type/status badges
- ✅ AgentEditModal - modal for editing agents
- ✅ DeleteConfirmDialog - confirmation dialog for deletions
- ✅ CreateAgentForm - comprehensive agent creation with presets
- ✅ CreateKnowledgeSpaceForm - knowledge space creation with sitemap crawl
- ✅ useAgentManagement hook - agent CRUD with localStorage
- ✅ useKnowledgeManagement hook - knowledge space CRUD
- ✅ apiClient - full API integration including streaming
- ✅ Local storage utilities - agent persistence (lib/utils/storage.ts)

## Implementation Tasks

- [ ] 1. Create new sidebar-based dashboard layout
- [ ] 1.1 Create DashboardLayout component with sidebar and main content area
  - Implement responsive layout with fixed sidebar (240px desktop, collapsible mobile)
  - Add white base color scheme and spacing system
  - Create Sidebar component with four tabs: Chat, Vector Knowledge, Agents, API Keys
  - Add active state styling and click handlers
  - Implement tab switching logic with state management
  - _Requirements: 1.1, 1.2, 1.3, 1.4_

- [ ]*  1.2 Write property test for tab navigation
  - **Property 1: Tab navigation consistency**
  - **Validates: Requirements 1.4**

- [ ] 2. Implement Chat panel
- [ ] 2.1 Create ChatPanel component
  - Add agent selector dropdown populated from localStorage
  - Add empty state message when no agents exist
  - Integrate MessageList and MessageInput components
  - Implement chat messaging with streaming support
  - Ensure no conversation history persistence to localStorage
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 6.1, 6.2, 6.3, 6.4_

- [ ]*  2.2 Write property tests for chat functionality
  - **Property 2: Agent dropdown population** - Validates: Requirements 6.3
  - **Property 3: Message sending** - Validates: Requirements 2.2
  - **Property 4: Response display** - Validates: Requirements 2.3
  - **Property 5: No history persistence** - Validates: Requirements 2.4

- [ ] 3. Implement Vector Knowledge panel
- [ ] 3.1 Create VectorKnowledgePanel component
  - Integrate CreateKnowledgeSpaceForm (already supports URL/sitemap/file upload)
  - Integrate KnowledgeManagementList (already has type badges, status, view data, delete)
  - Ensure form updates list after successful creation
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6_

- [ ]*  3.2 Write property tests for knowledge space functionality
  - **Property 6: Knowledge space creation** - Validates: Requirements 3.4
  - **Property 7: Knowledge space information display** - Validates: Requirements 3.6

- [ ] 4. Implement Agents panel
- [ ] 4.1 Create AgentsPanel component
  - Integrate CreateAgentForm at top (already has presets, knowledge checkboxes, strict RAG)
  - Integrate AgentManagementList below (already has edit/delete/chat actions)
  - Ensure "go to chat" navigates to Chat tab with agent preselected
  - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 4.7, 4.8, 4.9, 4.10, 4.11, 4.12, 4.13_

- [ ]*  4.2 Write property tests for agent functionality
  - **Property 8: Complete agent information display** - Validates: Requirements 4.7, 4.8
  - **Property 9: Edit modal display** - Validates: Requirements 4.9
  - **Property 10: Agent deletion** - Validates: Requirements 4.10
  - **Property 11: Go to chat navigation** - Validates: Requirements 4.11
  - **Property 12: Agent persistence round-trip** - Validates: Requirements 4.12, 4.13

- [ ] 5. Implement API Keys panel
- [ ] 5.1 Create APIKeysPanel component
  - Retrieve key from NEXT_PUBLIC_JWT_TOKEN environment variable
  - Display masked key (show only last 4 characters)
  - Add copy icon for full unmasked key
  - Show success feedback on copy
  - _Requirements: 5.1, 5.2, 5.3_

- [ ] 5.2 Implement curl example display
  - Generate curl command using NEXT_PUBLIC_API_BASE_URL
  - Include API key in Authorization header with Bearer scheme
  - Add copy button for curl example
  - Display informational message about using environment variable (no create functionality)
  - _Requirements: 5.4, 5.5, 5.6, 5.7_

- [ ]*  5.3 Write property tests for API key functionality
  - **Property 13: API key masking** - Validates: Requirements 5.2
  - **Property 14: Full key clipboard copy** - Validates: Requirements 5.3
  - **Property 15: Curl example format** - Validates: Requirements 5.5

- [ ] 6. Enhance responsive design and mobile support
- [ ] 6.1 Implement responsive sidebar behavior
  - Collapsible sidebar for mobile (<768px) with hamburger menu
  - Fixed sidebar for desktop (>1024px)
  - Smooth transitions between states
  - _Requirements: 1.2_

- [ ] 6.2 Optimize panel layouts for mobile
  - Ensure all panels stack properly on mobile
  - Verify touch targets are at least 48x48px
  - Test form layouts on small screens
  - _Requirements: 1.1, 1.2_

- [ ] 7. Enhance accessibility features
- [ ] 7.1 Add comprehensive keyboard navigation
  - Tab navigation through all interactive elements
  - Enter/Space for button activation
  - Escape to close modals and collapse sidebar
  - Arrow keys for tab navigation
  - _Requirements: 1.4, 4.9_

- [ ] 7.2 Add ARIA labels and semantic HTML
  - Add aria-label to all icon buttons
  - Use semantic HTML elements (nav, main, section, article)
  - Add aria-live regions for dynamic content updates
  - Add aria-current for active tab
  - _Requirements: 1.2, 1.3, 1.4_

- [ ] 7.3 Verify color contrast compliance
  - Audit all text for WCAG AA compliance (4.5:1)
  - Verify UI components meet 3:1 contrast
  - Ensure focus indicators have sufficient contrast
  - _Requirements: 1.1_

- [ ] 8. Add loading states and polish
- [ ] 8.1 Implement consistent loading states
  - Add loading spinners for all async operations
  - Add skeleton loaders for lists during initial load
  - Ensure loading states are accessible (aria-busy, role="status")
  - _Requirements: 3.4, 5.3_

- [ ] 8.2 Enhance error handling UI
  - Ensure ErrorMessage component is used consistently
  - Add retry buttons for recoverable errors
  - Display validation errors inline with proper ARIA
  - _Requirements: 2.2, 3.4_

- [ ] 9. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [ ]*  10. Write integration tests
  - Test complete agent creation flow from Agents panel
  - Test knowledge space creation and linking to agent
  - Test chat flow with agent selection and messaging
  - Test edit agent and verify persistence after reload
  - Test API key copy functionality
  - Test navigation between panels

- [ ]*  11. Perform accessibility audit
  - Run automated accessibility tests (axe-core)
  - Test keyboard navigation through all panels
  - Test screen reader compatibility
  - Verify color contrast ratios with tools

- [ ] 12. Final polish and optimization
- [ ] 12.1 Optimize performance
  - Implement lazy loading for panel components
  - Add React.memo for list items to prevent unnecessary re-renders
  - Consider virtual scrolling for large lists (if needed)
  - _Requirements: 3.6, 4.7_

- [ ] 12.2 Add animations and transitions
  - Add smooth transitions for tab switching
  - Add fade-in animations for modals
  - Add hover effects for interactive elements
  - Ensure animations respect prefers-reduced-motion
  - _Requirements: 1.4, 4.9_

- [ ] 12.3 Final code review and cleanup
  - Remove console.logs and debug code
  - Ensure consistent code formatting
  - Update comments and documentation
  - Remove old dashboard page if new one is complete
  - _Requirements: All_

- [ ] 13. Final Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.
