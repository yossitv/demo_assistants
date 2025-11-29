# Requirements Document

## Introduction

This feature extends the existing RAG chat system to support product recommendation capabilities. The system will allow users to upload product information (initially in Markdown format), automatically structure and embed this data into the knowledge base, and provide AI-powered product recommendations through conversational chat with streaming responses.

## Glossary

- **RAG System**: Retrieval-Augmented Generation system that combines vector search with LLM responses
- **Knowledge Space (KS)**: A collection of embedded documents stored in the vector database
- **Product Schema**: Standardized data structure for product information (id, name, description, price, etc.)
- **SSE**: Server-Sent Events, a protocol for streaming data from server to client
- **Qdrant**: Vector database used for similarity search
- **Streaming Backend**: The existing `apps/rag-chat-stream-backend` service
- **Sync Frontend**: The existing `apps/rag-chat-sync-frontend` Next.js application
- **Product Parser**: Component that transforms uploaded Markdown into standardized product schema
- **Recommendation Agent**: AI agent configured specifically for product recommendations

## Requirements

### Requirement 1

**User Story:** As a system administrator, I want to upload product information files, so that the system can use this data for product recommendations.

#### Acceptance Criteria

1. WHEN a user selects a Markdown file (up to 10MB) THEN the system SHALL validate the file extension and size before upload
2. WHEN a user uploads a valid product Markdown file THEN the system SHALL send the file to the backend API endpoint
3. WHEN the upload completes successfully THEN the system SHALL display the number of products processed and any errors encountered
4. WHEN the upload fails THEN the system SHALL display a clear error message and allow retry
5. WHERE drag-and-drop is supported THEN the system SHALL accept files dropped onto the upload area

### Requirement 2

**User Story:** As a system administrator, I want uploaded product data to be automatically structured, so that it can be used effectively for recommendations.

#### Acceptance Criteria

1. WHEN the backend receives a product Markdown file THEN the system SHALL parse items delimited by `--- item start ---` and `--- item end ---`
2. WHEN parsing product data THEN the system SHALL extract key-value pairs (name, price, category, etc.) from each item block
3. WHEN a product item lacks a required field (name or description) THEN the system SHALL skip that item and record the error
4. WHEN a product item lacks an id field THEN the system SHALL generate a unique identifier automatically
5. WHEN parsing completes THEN the system SHALL return a summary with success count, failure count, and error details

### Requirement 3

**User Story:** As a system administrator, I want parsed product data to be stored in a Knowledge Space, so that it can be searched and retrieved during conversations.

#### Acceptance Criteria

1. WHEN product data is successfully parsed THEN the system SHALL create a new Knowledge Space with type 'product'
2. WHEN creating the Knowledge Space THEN the system SHALL store metadata including sourceType, documentCount, and schemaVersion
3. WHEN embedding products THEN the system SHALL create one chunk per product using the existing embedding service
4. WHEN upserting to Qdrant THEN the system SHALL use the namespace format `tenantId#knowledgeSpaceId`
5. WHEN some products fail to embed THEN the system SHALL mark the Knowledge Space status as 'partial' and record failed items

### Requirement 4

**User Story:** As a user, I want to create a recommendation agent linked to product knowledge, so that I can get personalized product suggestions.

#### Acceptance Criteria

1. WHEN creating an agent THEN the system SHALL provide a "Product Recommendation Preset" option
2. WHEN the preset is selected THEN the system SHALL set strictRAG to true by default
3. WHEN the preset is selected THEN the system SHALL populate the description field with recommendation-focused text
4. WHEN the preset is selected THEN the system SHALL apply a prompt template that asks clarifying questions and provides reasoning
5. WHEN creating the agent THEN the system SHALL link it to one or more product Knowledge Spaces

### Requirement 5

**User Story:** As a user, I want to chat with the recommendation agent using streaming responses, so that I can see recommendations appear in real-time.

#### Acceptance Criteria

1. WHEN a user sends a message to the agent THEN the system SHALL call the streaming API with `stream: true`
2. WHEN receiving SSE data THEN the system SHALL decode and display tokens incrementally as they arrive
3. WHEN the stream contains `data: [DONE]` THEN the system SHALL mark the message as complete
4. WHEN the user clicks a stop button THEN the system SHALL abort the stream using AbortController
5. WHEN a streaming error occurs THEN the system SHALL display the error and provide a retry option

### Requirement 6

**User Story:** As a user, I want to see recommended products displayed as cards, so that I can easily review and compare options.

#### Acceptance Criteria

1. WHEN the agent response includes product information THEN the system SHALL parse and extract product data
2. WHEN displaying products THEN the system SHALL show name, price, description, image, and product URL in card format
3. WHEN multiple products are recommended THEN the system SHALL display them in a grid or horizontal layout
4. WHEN a product has citedUrls THEN the system SHALL display the source information
5. WHEN a product card is displayed THEN the system SHALL ensure all required fields are present or show placeholders

### Requirement 7

**User Story:** As a system administrator, I want to view Knowledge Space details including product count and type, so that I can manage the system effectively.

#### Acceptance Criteria

1. WHEN viewing the Knowledge Space list THEN the system SHALL display the type field (web/product/document)
2. WHEN viewing a product Knowledge Space THEN the system SHALL display the document count
3. WHEN viewing a Knowledge Space THEN the system SHALL display the status (processing/completed/partial/error)
4. WHEN a Knowledge Space has partial status THEN the system SHALL provide access to error details
5. WHEN filtering Knowledge Spaces THEN the system SHALL allow filtering by type

### Requirement 8

**User Story:** As a developer, I want the product schema to be standardized and versioned, so that the system can handle schema evolution.

#### Acceptance Criteria

1. WHEN storing product data THEN the system SHALL use a standard schema with id, name, description, category, price, currency, availability, tags, imageUrl, productUrl, brand, and updatedAt
2. WHEN creating a Knowledge Space THEN the system SHALL record the schemaVersion in metadata
3. WHEN the name field exceeds 200 characters THEN the system SHALL truncate or reject the product
4. WHEN the description field exceeds 2000 characters THEN the system SHALL truncate or reject the product
5. WHEN parsing tags THEN the system SHALL convert the `tags: [a, b, c]` format into a string array

### Requirement 9

**User Story:** As a user, I want the upload UI to be intuitive and provide clear feedback, so that I can successfully upload product data without confusion.

#### Acceptance Criteria

1. WHEN accessing the Knowledge creation page THEN the system SHALL display tabs for "URL" and "File Upload" options
2. WHEN selecting files THEN the system SHALL display a list showing filename, size, and extension
3. WHEN files are selected THEN the system SHALL perform client-side validation before upload
4. WHEN upload is in progress THEN the system SHALL display a loading indicator
5. WHEN upload completes THEN the system SHALL show a success message and redirect to the Knowledge Space list

### Requirement 10

**User Story:** As a system operator, I want proper error handling and partial success support, so that one bad product doesn't fail the entire upload.

#### Acceptance Criteria

1. WHEN some products fail to parse THEN the system SHALL continue processing remaining products
2. WHEN the upload completes with failures THEN the system SHALL return status 'partial' with error details
3. WHEN a network error occurs during upload THEN the system SHALL display the error and preserve the form state
4. WHEN authentication fails THEN the system SHALL display a 401/403 error with clear messaging
5. WHEN the backend times out THEN the system SHALL handle the timeout gracefully and allow retry
