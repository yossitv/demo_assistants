# Implementation Plan

- [x] Port Tavus server utilities
  - Copy `server/tavus` modules (`config`, `service`, `handler`, `errors`, `types`) and `server/x/domain/models.ts` for shared types
  - Ensure path alias `@/* -> ./*` can resolve these modules in `tsconfig.json`
  - _Requirements: 1.5, 3.1_

- [x] Implement conversation start route
  - Add `app/api/conversations/route.ts` to parse JSON, build context when `context_seed` is provided, call `handleCreateConversation`, and return `conversation_url` (plus any Tavus fields) as JSON
  - Return structured errors for invalid JSON, Tavus errors, and unexpected failures
  - _Requirements: 1.1, 1.2, 1.3, 1.4_

- [x] Implement conversation end route
  - Add `app/api/conversations/[conversation_id]/end/route.ts` to POST to Tavus end API using `TAVUS_API_KEY`/`TAVUS_API_BASE`
  - Propagate Tavus status/errors in JSON and guard against missing API key
  - _Requirements: 2.1, 2.2, 2.3, 2.4_

- [x] Verify frontend contract
  - Confirm responses include `conversation_url` and JSON body so `AgentMeeting`’s `.json()` call succeeds without changes to UI
  - Keep request payload compatibility with current casher_2 frontend
  - _Requirements: 3.1, 3.2, 3.3, 3.4_

- [ ] Optional checks
  - Document required env vars (`TAVUS_API_KEY`, `TAVUS_API_BASE`, `REPLICA_ID`, `PERSONA_ID`, `CONTEXT_PROVIDER`, builder-specific keys)
  - Smoke-test `POST /api/conversations` and `/api/conversations/:id/end` locally with sample payloads
