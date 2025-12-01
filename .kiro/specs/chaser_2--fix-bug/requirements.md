# Requirements Document

## Introduction

casher_2 の「店員を呼ぶ」フローで `/api/conversations` が 405 となりフロントが JSON パースで落ちる問題を解消する。既存 UI は変更せず、過去アーカイブの Tavus 会話作成/終了ハンドラーを移植して API を復活させ、適切なエラーハンドリングと環境変数構成を備える。

## Glossary

- **Tavus**: 外部の会話生成サービス。`TAVUS_API_KEY` と `TAVUS_API_BASE` で接続
- **Conversation**: Tavus 上の通話セッション。`conversation_url` を埋め込み表示
- **Context Builder**: `context_seed` から `conversational_context` を生成するサーバー側ユーティリティ（local / openai / dedalus）

## Requirements

### Requirement 1: 会話開始 API の復活

**User Story:** 店員呼び出しボタンを押すと会話 URL が返り、iframe に埋め込めるようにしたい。

#### Acceptance Criteria

1. WHEN `POST /api/conversations` receives JSON THEN it SHALL validate/parse the body and return 400 on invalid JSON with `{ "error": "..." }`.
2. WHEN the payload contains `context_seed` AND `conversational_context` is empty THEN the server SHALL build context via the configured Context Builder before calling Tavus.
3. WHEN Tavus responds 2xx THEN the API SHALL return JSON including `conversation_url` (and `conversation_id` if provided by Tavus) for the frontend to use.
4. WHEN Tavus responds 4xx/5xx or is unreachable THEN the API SHALL return `{ "error": "..." }` with an appropriate HTTP status (Tavus status or 500) so the frontend does not crash on `.json()`.
5. THE API SHALL honor default replica/persona from env (`REPLICA_ID`/`PERSONA_ID`) and default language fallback (`japanese`) when missing in the request.

### Requirement 2: 会話終了 API の提供

**User Story:** 支払い完了やキャンセル時に Tavus 側の会話を正常終了させたい。

#### Acceptance Criteria

1. WHEN `POST /api/conversations/:conversation_id/end` is called with a valid `TAVUS_API_KEY` THEN it SHALL forward the end request to Tavus using `TAVUS_API_BASE` (default `https://tavusapi.com`).
2. WHEN Tavus returns non-2xx THEN the API SHALL propagate the status with `{ "error": "..." }` derived from Tavus JSON if available, or a descriptive fallback.
3. WHEN `TAVUS_API_KEY` is missing THEN the route SHALL return 500 with `{ "error": "TAVUS_API_KEY not configured" }`.
4. THE route SHALL handle network/JSON parsing failures gracefully and never return a non-JSON body.

### Requirement 3: 既存フロントとの互換性

**User Story:** casher_2 の UI を変えずに店員呼び出しが動作してほしい。

#### Acceptance Criteria

1. THE `POST /api/conversations` request contract SHALL accept the current frontend payload shape (`language`, `conversational_context`, `context_seed`, etc.) without breaking changes.
2. THE response shape SHALL include `conversation_url` and, if available, `conversation_id` so existing state handling continues to work.
3. ALL API responses SHALL be JSON-encoded to avoid `Unexpected end of JSON input` in the client.
4. NO changes SHALL be required in casher_2 UI components; only server-side code is modified.
