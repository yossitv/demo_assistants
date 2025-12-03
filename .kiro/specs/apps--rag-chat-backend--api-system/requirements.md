# Requirements Document - RAG Chat Backend API System (apps--rag-chat-backend--api-system)

## Introduction

This document defines the API surface for the RAG Chat Backend, covering multi-tenant knowledge and agent management plus OpenAI-compatible chat endpoints for dashboard and external integrations. The scope assumes AWS API Gateway + Lambda with DynamoDB for metadata and Qdrant for vector search, and reuses existing RAG use cases.

## Glossary

- **System**: The RAG Chat Backend service
- **KnowledgeSpace**: A tenant-scoped collection of ingested content stored as vectors
- **Agent**: An AI configuration linked to one or more KnowledgeSpaces
- **Tenant/User**: Identifiers extracted from Cognito JWT (custom:tenant_id, sub)
- **API Key**: Gateway-managed key for non-JWT clients
- **Chat Completions**: OpenAI-compatible `/v1/chat/completions` endpoint
- **SSE**: Server-Sent Events used for streaming responses
- **Namespace**: Vector store partition, e.g., `t_{tenantId}_ks_{knowledgeSpaceId}_{date}`

## Requirements

### Requirement 1: Authentication & tenancy enforcement

**User Story:** As a system operator, I want every endpoint to enforce authenticated, tenant-scoped access so that data is isolated and unauthorized calls fail closed.

#### Acceptance Criteria

1. WHEN a request lacks a valid Bearer JWT or API Key THEN the System SHALL return 401/403 and SHALL NOT invoke business logic.
2. WHEN JWT is used THEN tenantId SHALL come from `custom:tenant_id` and userId from `sub`; missing claims SHALL result in 401.
3. WHEN API Key is used THEN the key metadata/environment SHALL map to tenantId (and userId if applicable); if mapping is absent, the System SHALL reject the request (no default tenant fallback).
4. WHEN tokens or keys are processed THEN the System SHALL avoid logging secrets, logging only presence flags and requestId.
5. ALL controllers (chat, knowledge, agent) SHALL reuse shared authentication utilities for consistent behavior.

### Requirement 2: KnowledgeSpace lifecycle APIs

**User Story:** As a tenant admin, I want to create, list, inspect, and delete knowledge spaces via API so that agents can be built on curated sources.

#### Acceptance Criteria

1. POST `/v1/knowledge/create` SHALL accept `{ name, sourceUrls[], sitemapUrl?, uploadRef?, type }` and return `{ knowledgeSpaceId, status }` scoped to the caller's tenant.
2. WHEN creation starts THEN the System SHALL ingest content, chunk, embed, and upsert into Qdrant using namespace `t_{tenantId}_ks_{knowledgeSpaceId}_{date}`.
3. GET `/v1/knowledge/list` SHALL return only the caller's tenant items with `knowledgeSpaceId, name, type, status/progress, currentVersion, createdAt`.
4. GET `/v1/knowledge/{knowledgeSpaceId}/chunks` (or `/chunks` subresource) SHALL return chunk metadata (`id, title, url, excerpt, version`) with pagination controls.
5. DELETE `/v1/knowledge/{knowledgeSpaceId}` SHALL remove DynamoDB metadata and delete the corresponding Qdrant collection/namespace; on success return 204.
6. WHEN an unknown `knowledgeSpaceId` is provided THEN the System SHALL return 404 with a JSON error body.

### Requirement 3: Agent management APIs

**User Story:** As a tenant admin, I want CRUD endpoints for agents, including listing, so that agents can be managed from the dashboard and used as models.

#### Acceptance Criteria

1. POST `/v1/agent/create` SHALL create an agent with `{ name, description?, knowledgeSpaceIds[], strictRAG, systemPrompt?, preset? }` and return `{ agentId, status: "created" }`.
2. PUT `/v1/agent/{agentId}` SHALL update the same fields; WHEN `knowledgeSpaceIds` include non-existent IDs THEN the System SHALL respond with 400/404.
3. DELETE `/v1/agent/{agentId}` SHALL delete the agent and return 204; deleting a non-existent agent SHALL return 404.
4. GET `/v1/agent/list` SHALL return all agents for the tenant with `agentId, name, description, knowledgeSpaceIds, strictRAG, systemPrompt?, preset?, createdAt`.
5. Agent IDs returned SHALL be usable as the `model` field in chat/completions; list ordering SHALL be deterministic (e.g., createdAt descending).

### Requirement 4: Chat Completions API (OpenAI-compatible)

**User Story:** As an end user or integration client, I want to call an OpenAI-compatible chat endpoint with an agent model so that I can get RAG answers and citations.

#### Acceptance Criteria

1. POST `/v1/chat/completions` SHALL accept OpenAI chat payloads; `model` SHALL map to `agentId`; `messages` SHALL follow OpenAI roles.
2. WHEN `stream: true` THEN the System SHALL respond with SSE (`text/event-stream`) chunks in OpenAI `chat.completion.chunk` format; WHEN `stream` is false/absent THEN the System SHALL return a single JSON completion.
3. WHEN processing a request THEN the System SHALL load the agent for `tenantId + agentId`, fetch linked KnowledgeSpaces, and use the existing ChatWithAgentUseCase for retrieval and generation.
4. Responses SHALL include cited URLs when available and SHALL include a `conversationId` for downstream tracking.
5. Unsupported OpenAI params (temperature, tools, etc.) SHALL be ignored safely; validation errors SHALL return JSON errors before any streaming bytes are sent.

### Requirement 5: Error handling & response contract

**User Story:** As a client developer, I want consistent success and error shapes so that integration is predictable.

#### Acceptance Criteria

1. Success responses SHALL set `Content-Type: application/json` (or `text/event-stream` for streaming) and include CORS headers per gateway policy.
2. Error responses SHALL include status code and JSON body with `error` and `message`; 401 for auth failures, 403 for forbidden, 404 for missing resources, 409 for conflicts, 422/400 for validation, 500 for unexpected errors.
3. Validation errors SHALL include which field failed when practical.
4. Streaming handlers SHALL short-circuit to JSON error before writing any SSE bytes on failure.

### Requirement 6: Observability & reliability

**User Story:** As an operator, I want metrics and logs that allow monitoring of API usage and failures.

#### Acceptance Criteria

1. Each handler SHALL log `requestId, tenantId, userId (or apiKeyId), endpoint, status`; secrets (tokens/keys) SHALL never be logged.
2. Metrics SHALL capture latency and error counts per endpoint; alarms SHALL be defined for elevated 4xx/5xx and Lambda error rates.
3. Knowledge and agent writes SHALL use retries with exponential backoff on DynamoDB/Qdrant errors; failures SHALL be surfaced with contextual logs.
4. Rate limits/usage plans SHALL be enforceable via API Gateway for API Key clients; exceeding limits returns 429 with `Retry-After` when configured.

### Requirement 7: Data consistency & isolation

**User Story:** As a system architect, I want tenant isolation and consistent naming so that data does not leak across tenants.

#### Acceptance Criteria

1. All DynamoDB keys SHALL be scoped by `tenantId`; queries SHALL include `tenantId` in the key condition.
2. Qdrant collections/namespaces SHALL include `tenantId` and `knowledgeSpaceId`; agents SHALL only query namespaces for their tenant.
3. Deleting a tenant-scoped resource SHALL NOT affect data belonging to other tenants.
4. The System SHALL expose no unauthenticated endpoints; CORS SHALL restrict origins per configuration.
