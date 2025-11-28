# Requirements Document

## Introduction

This document specifies the requirements for an MVP RAG (Retrieval-Augmented Generation) chat backend system. The system enables users to create knowledge bases from web URLs, configure AI agents that leverage these knowledge bases, and interact with those agents through a chat API. The backend uses AWS managed services and provides OpenAI-compatible chat completions with cited sources.

## Glossary

- **System**: The RAG chat backend application
- **KnowledgeSpace**: A collection of web content crawled from URLs and stored as vector embeddings
- **Agent**: A configured AI assistant linked to one or more KnowledgeSpaces
- **RAG**: Retrieval-Augmented Generation - technique combining vector search with LLM generation
- **Tenant**: An organizational unit identified by tenant_id from Cognito JWT
- **User**: An authenticated individual identified by Cognito sub (userId)
- **Chunk**: A text segment of 400-600 tokens extracted from crawled content
- **Namespace**: A vector database partition identifier in format t_{tenantId}_ks_{knowledgeSpaceId}_{date}
- **Embedding**: A numerical vector representation of text content
- **Cognito JWT**: JSON Web Token issued by AWS Cognito for authentication
- **Vector DB**: Database optimized for similarity search over embeddings (Weaviate, Qdrant, or OpenSearch)
- **Cited URLs**: Source URLs referenced in the agent's response
- **Strict RAG**: Mode where agent only answers from available context, never hallucinates

## Requirements

### Requirement 1

**User Story:** As a tenant administrator, I want to create a KnowledgeSpace from web URLs, so that my agents can answer questions based on that content.

#### Acceptance Criteria

1. WHEN a user submits valid URLs via POST /v1/knowledge/create, THE System SHALL create a new KnowledgeSpace record with a unique knowledgeSpaceId
2. WHEN creating a KnowledgeSpace, THE System SHALL extract the tenantId from the Cognito JWT custom:tenant_id claim
3. WHEN a KnowledgeSpace is created, THE System SHALL crawl each provided URL and extract the main text content
4. WHEN text content is extracted, THE System SHALL split the content into chunks of 400-600 tokens with 50-100 tokens overlap
5. WHEN chunks are created, THE System SHALL generate embeddings for each chunk using a consistent embedding model
6. WHEN embeddings are generated, THE System SHALL upsert all chunks into the Vector DB using namespace format t_{tenantId}_ks_{knowledgeSpaceId}_{currentVersion}
7. WHEN the KnowledgeSpace creation completes, THE System SHALL return the knowledgeSpaceId and status "completed"
8. WHEN storing a KnowledgeSpace, THE System SHALL set currentVersion to today's date in YYYY-MM-DD format

### Requirement 2

**User Story:** As a tenant administrator, I want to list all my KnowledgeSpaces, so that I can see what knowledge bases are available for my agents.

#### Acceptance Criteria

1. WHEN a user calls GET /v1/knowledge/list, THE System SHALL extract tenantId from the Cognito JWT
2. WHEN listing KnowledgeSpaces, THE System SHALL query the KnowledgeSpaces table for all items matching the tenantId
3. WHEN returning KnowledgeSpaces, THE System SHALL include knowledgeSpaceId, name, type, and lastUpdatedAt for each item

### Requirement 3

**User Story:** As a tenant administrator, I want to create an Agent linked to KnowledgeSpaces, so that users can chat with an AI that knows our content.

#### Acceptance Criteria

1. WHEN a user submits agent configuration via POST /v1/agent/create, THE System SHALL create a new Agent record with a unique agentId
2. WHEN creating an Agent, THE System SHALL extract tenantId from the Cognito JWT custom:tenant_id claim
3. WHEN an Agent is created, THE System SHALL store the provided knowledgeSpaceIds array linking the Agent to one or more KnowledgeSpaces
4. WHEN an Agent is created, THE System SHALL store the strictRAG boolean flag
5. WHEN the Agent creation completes, THE System SHALL return the agentId and status "created"

### Requirement 4

**User Story:** As an end user, I want to chat with an Agent using an OpenAI-compatible API, so that I can get answers based on the knowledge base.

#### Acceptance Criteria

1. WHEN a user sends a chat request to POST /v1/chat/completions, THE System SHALL extract tenantId and userId from the Cognito JWT
2. WHEN processing a chat request, THE System SHALL interpret the model field as the agentId
3. WHEN the agentId is identified, THE System SHALL load the Agent configuration from the Agents table matching tenantId and agentId
4. WHEN the Agent is loaded, THE System SHALL retrieve all linked KnowledgeSpaces using the Agent's knowledgeSpaceIds
5. WHEN KnowledgeSpaces are retrieved, THE System SHALL construct namespace identifiers using format t_{tenantId}_ks_{knowledgeSpaceId}_{currentVersion}
6. WHEN processing messages, THE System SHALL extract the last user message as the query text
7. WHEN the query text is extracted, THE System SHALL generate an embedding for the query using the same embedding model as chunk embeddings
8. WHEN the query embedding is generated, THE System SHALL perform vector search across all namespaces with top_k equal to 8
9. WHEN search results are returned, THE System SHALL merge hits across namespaces and filter by similarity threshold of 0.3 to 0.4
10. WHEN strictRAG is true and no hits meet the threshold, THE System SHALL return the fixed response "このサイトには情報がありませんでした。"
11. WHEN hits meet the threshold, THE System SHALL select the top 5 chunks as RAG context
12. WHEN RAG context is selected, THE System SHALL build a Markdown context block with numbered sources and URLs
13. WHEN building the final prompt, THE System SHALL include tenant system prompt, agent policy, context markdown, conversation history, and latest user message
14. WHEN the prompt is complete, THE System SHALL call the LLM API to generate the assistant's response
15. WHEN the LLM response is received, THE System SHALL extract up to 3 unique URLs from the selected chunks as cited_urls
16. WHEN the response is ready, THE System SHALL create a Conversations record with conversationId, tenantId, agentId, userId, messages, and referencedUrls
17. WHEN returning the response, THE System SHALL format it as an OpenAI-compatible chat completion with cited_urls in the message object

### Requirement 5

**User Story:** As a system operator, I want all API endpoints to require Cognito JWT authentication, so that only authorized users can access the system.

#### Acceptance Criteria

1. WHEN any API endpoint receives a request, THE System SHALL validate the Cognito JWT token via API Gateway authorizer
2. WHEN the JWT is invalid or missing, THE System SHALL reject the request with an authentication error
3. WHEN the JWT is valid, THE System SHALL extract the sub claim as userId
4. WHEN the JWT is valid, THE System SHALL extract the custom:tenant_id claim as tenantId

### Requirement 6

**User Story:** As a developer, I want the system to store conversation logs, so that we can debug issues and track usage.

#### Acceptance Criteria

1. WHEN a chat completion is generated, THE System SHALL create a Conversations record with a unique conversationId
2. WHEN storing a conversation, THE System SHALL include tenantId, agentId, userId, lastUserMessage, lastAssistantMessage, referencedUrls, and createdAt
3. WHEN storing referencedUrls, THE System SHALL include all URLs that were used as context for the response

### Requirement 7

**User Story:** As a developer, I want the system to log RAG operations to CloudWatch, so that I can debug search quality and prompt construction.

#### Acceptance Criteria

1. WHEN processing a chat request, THE System SHALL log the tenantId, agentId, and latest user message to CloudWatch
2. WHEN RAG search completes, THE System SHALL log the hit count and top URLs from search results to CloudWatch
3. WHEN in non-production environments, THE System SHALL optionally log the final constructed prompt to CloudWatch

### Requirement 8

**User Story:** As a system architect, I want vector database operations to use consistent namespace conventions, so that data isolation between tenants and versions is maintained.

#### Acceptance Criteria

1. WHEN upserting chunks to Vector DB, THE System SHALL use namespace format t_{tenantId}_ks_{knowledgeSpaceId}_{date} where date is YYYY-MM-DD
2. WHEN searching Vector DB, THE System SHALL use the same namespace format with the currentVersion from the KnowledgeSpace record
3. WHEN storing chunks, THE System SHALL include tenantId, knowledgeSpaceId, url, domain, crawlDate, content, metadata, and embedding in each document

### Requirement 9

**User Story:** As a system architect, I want the chat API to follow OpenAI's chat completions format, so that clients can easily integrate with standard libraries.

#### Acceptance Criteria

1. WHEN accepting chat requests, THE System SHALL parse the messages array following OpenAI format with role and content fields
2. WHEN returning chat responses, THE System SHALL format the response with id, object, model, and choices fields matching OpenAI structure
3. WHEN returning the assistant message, THE System SHALL include an additional cited_urls field in the message object

### Requirement 10

**User Story:** As a content manager, I want the system to parse and chunk web content intelligently, so that retrieval quality is high.

#### Acceptance Criteria

1. WHEN crawling a URL, THE System SHALL fetch the HTML content and extract the main text
2. WHEN chunking text, THE System SHALL create chunks between 400 and 600 tokens in length
3. WHEN chunking text, THE System SHALL overlap consecutive chunks by 50 to 100 tokens
4. WHEN storing chunks, THE System SHALL include metadata with title, section, and version fields
