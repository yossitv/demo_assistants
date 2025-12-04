# Implementation Tasks - Agent Manager API (apps--rag-chat-stream-backend-agentmanager)

## 1. API Contracts
- [ ] Define request/response schemas for `GET /v1/agent/list` and `DELETE /v1/agent/{agentId}`.
- [ ] Align auth header parsing with existing chat/completions (Bearer token).

## 2. Infrastructure (CDK)
- [ ] Add API Gateway routes for `/v1/agent/list` (GET) and `/v1/agent/{agentId}` (DELETE).
- [ ] Wire routes to Lambda handlers (Node/TypeScript).
- [ ] Configure CORS to match existing chat endpoints.

## 3. Lambda Handlers
- [ ] Implement `listAgents` handler:
  - Validate auth.
  - Fetch agents from storage/service.
  - Return `{ agents: [...] }` with 200.
- [ ] Implement `deleteAgent` handler:
  - Validate auth and `agentId` path param.
  - Perform delete; return 204 on success, 404 if not found.
- [ ] Add error mapping (401/403/404/500) and JSON error body with `message`.

## 4. Data Access
- [ ] Implement/plug repository to fetch and delete agents (e.g., DynamoDB table or existing service).
- [ ] Ensure returned agents include required fields: `id`, `name`, `description?`, `knowledgeSpaceIds`, `createdAt`, `updatedAt?`.

## 5. Observability & Non-functional
- [ ] Add structured logging (requestId, status, latency).
- [ ] Confirm p95 < 300ms for list with ≤100 agents (smoke/load test).

## 6. Testing
- [ ] Unit tests for handlers (auth, not found, success).
- [ ] Integration tests via API Gateway with valid/invalid tokens.
- [ ] Verify delete followed by list reflects removal.

## 7. Frontend Hook Integration (optional, separate PR)
- [ ] Update `useAgentManagement` to call `GET /v1/agent/list` instead of localStorage.
- [ ] Wire delete button to `DELETE /v1/agent/{agentId}` and refresh on success.
