# Design Document - Agent Manager API (apps--rag-chat-stream-backend-agentmanager)

## Overview
Provide API Gateway endpoints for listing and deleting agents managed in the RAG Chat backend so the frontend can rely on server data (instead of localStorage).

## Architecture
- API Gateway exposes:
  - `GET /v1/agent/list` → Lambda (Node/TypeScript) calling the Agent store/service.
  - `DELETE /v1/agent/{agentId}` → Lambda calling the Agent store/service.
- Auth: Bearer token (same token used for chat/completions). Reject without valid token.
- Data source: Agent store (e.g., DynamoDB table) that already holds agent definitions compatible with chat `model` IDs.

## Data Model
```jsonc
{
  "id": "agent_123",
  "name": "Agent name",
  "description": "Optional description",
  "knowledgeSpaceIds": ["ks_1", "ks_2"],
  "createdAt": "2025-01-01T00:00:00.000Z",
  "updatedAt": "2025-01-02T00:00:00.000Z"
}
```

## API Contracts
### GET /v1/agent/list
- Request: Bearer token required.
- Response 200:
```json
{ "agents": [ /* Agent objects */ ] }
```
- Response 200 (no agents): `{ "agents": [] }`
- Errors: 401/403 on auth failure; 500 with `{ "message": "..." }` on server errors.

### DELETE /v1/agent/{agentId}
- Request: Bearer token required; `agentId` path param.
- Response 204 on success.
- Response 404 if not found: `{ "message": "Not found" }`
- Response 401/403 on auth failure; 500 on server errors.

## Validation & Error Handling
- Validate `agentId` is non-empty; return 400 on missing/invalid path parameter.
- Map service/storage errors to 404 (not found) or 500 (generic).
- Log requestId, status, latency for observability.

## Performance
- Target p95 latency < 300ms for list with ≤100 agents.
- Pagination is optional; if needed, add `?pageToken`/`?limit` later.

## Security
- Strict Bearer token check; no anonymous access.
- Return minimal error details to avoid leaking internal info.
- CORS aligned with existing chat endpoints.

## Frontend integration notes
- Frontend can replace `useAgentManagement` localStorage fetch with `GET /v1/agent/list`.
- Delete button calls `DELETE /v1/agent/{agentId}`; on 204, remove from UI; on 404, show not-found message.

## Testing Strategy
- Unit: handler validates auth, returns 401/403; returns 200 with empty list; returns 204 on delete.
- Integration: end-to-end through API Gateway with valid/invalid tokens; delete followed by list reflects removal.
- Load: list endpoint under ≤100 agents meets p95 < 300ms.
