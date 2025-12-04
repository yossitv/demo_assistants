# Requirements Document

## Introduction

This document specifies the requirements for redesigning the RAG Chat Frontend dashboard with a sidebar-based navigation layout. The redesign aims to improve user experience by organizing features into distinct sections: Chat, Vector Knowledge, Agents, and API Keys. The system will maintain existing functionality while providing a cleaner, more intuitive interface with white-based styling.

## Glossary

- **Dashboard**: The main application interface containing the sidebar and content panels
- **Sidebar**: The persistent left navigation panel containing tabs for different features
- **Agent**: An AI assistant configuration that combines a language model with knowledge spaces and custom prompts
- **Knowledge Space**: A collection of documents or data sources used for RAG (Retrieval-Augmented Generation)
- **Vector Knowledge**: The feature area for managing knowledge spaces and their data sources
- **Strict RAG**: A toggle option that restricts agent responses to only information found in linked knowledge spaces
- **API Key**: An authentication token used to access the backend API endpoints
- **Local Storage**: Browser-based persistent storage for agent configurations

## Requirements

### Requirement 1: Dashboard Layout

**User Story:** As a user, I want a clean sidebar-based dashboard layout, so that I can easily navigate between different features.

#### Acceptance Criteria

1. THE Dashboard SHALL display a white base color scheme
2. THE Dashboard SHALL organize the interface into a persistent left sidebar and a main content area
3. THE Sidebar SHALL display four preloaded tabs labeled "Chat", "Vector Knowledge", "Agents", and "API Keys"
4. WHEN a user clicks a sidebar tab, THEN THE Dashboard SHALL display the corresponding content panel in the main area

### Requirement 2: Chat Interface

**User Story:** As a user, I want to select an agent and start chatting, so that I can interact with AI assistants without managing conversation history.

#### Acceptance Criteria

1. THE Chat panel SHALL provide a dropdown select box for choosing an existing Agent
2. THE Chat panel SHALL allow users to send messages to the selected Agent
3. THE Chat panel SHALL display responses from the selected Agent
4. THE Chat panel SHALL NOT persist conversation history to storage

### Requirement 3: Vector Knowledge Management

**User Story:** As a user, I want to create knowledge spaces from multiple sources, so that I can provide context for my agents.

#### Acceptance Criteria

1. THE Vector Knowledge panel SHALL provide a textarea input for multiple URLs separated by newlines
2. THE Vector Knowledge panel SHALL provide a sitemap crawl feature with auto-collect and preview functionality
3. THE Vector Knowledge panel SHALL provide a file upload feature with mode selection from "product_recommend", "qa", "document", and "description"
4. WHEN a user submits URL, sitemap, or file inputs, THEN THE Dashboard SHALL create a new Knowledge Space from the provided data
5. THE Vector Knowledge panel SHALL display a list of existing Knowledge Spaces below the creation interface
6. THE Knowledge Space list SHALL display the name, type, status, document count, and last updated date for each Knowledge Space
7. THE Knowledge Space list SHALL provide actions to view data (chunks/original) and delete a Knowledge Space
8. WHEN a user clicks delete, THEN THE Knowledge Space SHALL be removed (using the existing delete API if available)

### Requirement 4: Agent Management

**User Story:** As a user, I want to create and manage AI agents with custom configurations, so that I can tailor assistants to specific use cases.

#### Acceptance Criteria

1. THE Agents panel SHALL display an agent creation component in the top area
2. THE agent creation component SHALL provide a preset selector for quick configuration
3. THE agent creation component SHALL provide checkboxes for selecting linked Knowledge Spaces
4. THE agent creation component SHALL provide a textarea for entering custom prompts
5. THE agent creation component SHALL provide a toggle for enabling Strict RAG mode
6. THE Agents panel SHALL display a list of existing Agents below the creation component
7. THE Agent list SHALL display the name, description, linked knowledge, and creation date for each Agent
8. THE Agent list SHALL provide icon-based actions for edit, delete, and "go to chat" for each Agent
9. WHEN a user clicks the edit icon, THEN THE Dashboard SHALL display a modal dialog for editing the Agent configuration
10. WHEN a user clicks the delete icon, THEN THE Dashboard SHALL remove the Agent from the list
11. WHEN a user clicks the "go to chat" icon, THEN THE Dashboard SHALL navigate to the Chat panel with the Agent preselected
12. THE Dashboard SHALL persist Agent configurations to Local Storage
13. THE Dashboard SHALL retrieve Agent configurations from Local Storage on page load

### Requirement 5: API Key Display

**User Story:** As a user, I want to view and copy my API key with usage examples, so that I can integrate the API into my applications.

#### Acceptance Criteria

1. THE API Keys panel SHALL display an existing API key retrieved from the NEXT_PUBLIC_JWT_TOKEN environment variable
2. THE API Keys panel SHALL mask the API key display showing only the last four characters
3. WHEN a user clicks the copy icon, THEN THE Dashboard SHALL copy the full unmasked API key value to the clipboard
4. THE API Keys panel SHALL display a curl command example using the NEXT_PUBLIC_API_BASE_URL environment variable
5. THE curl example SHALL include the API key in the Authorization header
6. THE API Keys panel SHALL provide a copy button for the curl example
7. THE API Keys panel SHALL NOT provide functionality for creating new API keys

### Requirement 6: Agent Selection in Chat

**User Story:** As a user, I want to select agents from a dropdown, so that I can easily switch between configured assistants.

#### Acceptance Criteria

1. THE Chat panel SHALL provide agent selection via dropdown menu only
2. THE Chat panel SHALL NOT provide manual Agent ID text entry
3. THE dropdown menu SHALL populate with Agents from Local Storage
4. WHEN no Agents exist, THEN THE dropdown SHALL display a message prompting the user to create an Agent
