# Requirements Document

## Introduction

本システムは、既存のRAG Chat Sync Backendに対して、OpenAI互換の `/v1/chat/completions` エンドポイントにSSE（Server-Sent Events）ストリーミング対応を追加するバックエンドサービスです。tauvs連携を主目的とし、既存のRAGロジック（DynamoDB / Qdrant / OpenAI Embedding）は変更せず、LLM出力の返し方のみをストリーミング対応させます。

本フェーズでは「疑似ストリーミング」方式を採用し、既存UseCaseから得られた完成回答文字列をチャンク分割してSSE形式で送信します。将来的には本物のトークンストリーミングへの拡張を想定した設計とします。

## Glossary

- **SSE (Server-Sent Events)**: HTTPを用いたサーバープッシュ技術。`text/event-stream` 形式でデータを送信
- **Lambda Response Streaming**: AWS Lambdaの機能。Node.js 20.x以降で `awslambda.streamifyResponse` を利用
- **API Gateway Streaming Integration**: API Gatewayの統合レスポンスモードを `STREAM` に設定する機能
- **ChatWithAgentUseCase**: 既存のRAGチャット処理を行うユースケース層のクラス
- **疑似ストリーミング**: 完成した回答文字列を後からチャンク分割して送信する方式
- **tauvs**: 本システムを利用するクライアントアプリケーション
- **Bearer Token**: `Authorization: Bearer <token>` 形式の認証トークン
- **OpenAI Chat Completions API**: OpenAIが提供するチャットAPI仕様。本システムはこれと互換性を持つ
- **Regional Endpoint**: API Gatewayのエンドポイントタイプ。CloudFrontを経由しない
- **Chunk**: ストリーミング送信時の分割単位
- **TTFB (Time To First Byte)**: 最初のレスポンスバイトがクライアントに到達するまでの時間
- **DynamoDB**: AWSのNoSQLデータベースサービス。メタデータ永続化に使用
- **Qdrant**: ベクトル検索エンジン。RAG処理に使用
- **DIContainer**: 依存性注入コンテナ。既存システムで使用

## Requirements

### Requirement 1

**User Story:** As a tauvs application developer, I want to call the backend using OpenAI-compatible `/v1/chat/completions` endpoint with SSE streaming, so that I can integrate the RAG backend seamlessly with tauvs's LLM layer.

#### Acceptance Criteria

1. WHEN a client sends a POST request to `/v1/chat/completions` with `stream: true` in the request body, THEN the System SHALL return responses in SSE format with `Content-Type: text/event-stream`
2. WHEN a client sends a POST request to `/v1/chat/completions` with `stream: false` or without the `stream` field, THEN the System SHALL return a single JSON response as in the existing implementation
3. WHEN the System receives a request, THEN the System SHALL parse the `model` field as the Agent ID
4. WHEN the System receives a request, THEN the System SHALL pass the `messages` array to the existing ChatWithAgentUseCase without modification
5. WHEN the System processes a streaming request, THEN the System SHALL use the same RAG logic (DynamoDB, Qdrant, OpenAI Embedding) as the existing sync implementation

### Requirement 2

**User Story:** As a tauvs application, I want the backend to authenticate requests using Bearer token, so that only authorized clients can access the streaming endpoint.

#### Acceptance Criteria

1. WHEN a client sends a request without an `Authorization` header, THEN the System SHALL return HTTP 401 with a JSON error response
2. WHEN a client sends a request with an `Authorization` header that does not start with "Bearer ", THEN the System SHALL return HTTP 401 with a JSON error response
3. WHEN a client sends a request with a Bearer token that does not match the configured `TAUVS_API_KEY`, THEN the System SHALL return HTTP 403 with a JSON error response
4. WHEN the System validates the Bearer token, THEN the System SHALL retrieve the expected token from environment variables or secure storage
5. WHEN the System logs authentication events, THEN the System SHALL NOT log the full Authorization header or token value

### Requirement 3

**User Story:** As a system operator, I want the backend to send SSE responses in OpenAI Chat Completions compatible format, so that tauvs and other OpenAI-compatible clients can consume the stream without modification.

#### Acceptance Criteria

1. WHEN the System sends an SSE event, THEN the System SHALL format each event as `data: {JSON}\n\n` where JSON is an OpenAI-compatible chunk object
2. WHEN the System sends the first SSE chunk, THEN the System SHALL include `delta: { "role": "assistant" }` in the chunk
3. WHEN the System sends subsequent SSE chunks, THEN the System SHALL include `delta: { "content": "<partial_text>" }` in each chunk
4. WHEN the System sends the final SSE chunk, THEN the System SHALL include `delta: {}` and `finish_reason: "stop"` in the chunk
5. WHEN the System completes the SSE stream, THEN the System SHALL send `data: [DONE]\n\n` as the final event
6. WHEN the System generates SSE chunks, THEN the System SHALL use the same `id` value (format: `chatcmpl-<random>`) across all chunks in a single stream
7. WHEN the System generates SSE chunks, THEN the System SHALL include `object: "chat.completion.chunk"` in each chunk
8. WHEN the System generates SSE chunks, THEN the System SHALL include a `created` field with Unix epoch seconds in each chunk
9. WHEN the System generates SSE chunks, THEN the System SHALL include a `model` field with the Agent ID or model name in each chunk
10. WHEN the System generates SSE chunks, THEN the System SHALL include a `choices` array with a single element at `index: 0` in each chunk

### Requirement 4

**User Story:** As a system developer, I want the backend to split the complete answer string into chunks for pseudo-streaming, so that the response appears to stream even though the full answer is generated before sending.

#### Acceptance Criteria

1. WHEN the System receives a complete answer string from ChatWithAgentUseCase, THEN the System SHALL split the string into chunks of 20 to 50 characters each
2. WHEN the System splits the answer string, THEN the System SHALL split by character boundaries to avoid breaking UTF-8 multibyte characters
3. WHEN the System sends chunks, THEN the System SHALL send them sequentially via `responseStream.write()` in the Lambda handler
4. WHEN the System completes sending all chunks, THEN the System SHALL call `responseStream.end()` to close the stream
5. WHEN the System determines chunk size, THEN the System SHALL use a configurable constant value for the chunk size

### Requirement 5

**User Story:** As a system architect, I want the backend to use AWS Lambda Response Streaming with API Gateway streaming integration, so that SSE responses can be delivered efficiently without buffering.

#### Acceptance Criteria

1. WHEN the System implements the Lambda handler, THEN the System SHALL use `awslambda.streamifyResponse` wrapper function
2. WHEN the System runs the Lambda function, THEN the System SHALL use Node.js 20.x runtime
3. WHEN the System configures API Gateway, THEN the System SHALL set the integration response transfer mode to `STREAM` for the `/v1/chat/completions` endpoint
4. WHEN the System uses API Gateway, THEN the System SHALL use a Regional endpoint type
5. WHEN the System sends SSE responses, THEN the System SHALL set `Content-Type: text/event-stream; charset=utf-8` header
6. WHEN the System sends SSE responses, THEN the System SHALL set `Cache-Control: no-cache` header
7. WHEN the System sends SSE responses, THEN the System SHALL set `Connection: keep-alive` header

### Requirement 6

**User Story:** As a system developer, I want the backend to handle errors before starting the SSE stream, so that error responses are delivered as standard HTTP JSON errors rather than mid-stream failures.

#### Acceptance Criteria

1. WHEN the System encounters an authentication error, THEN the System SHALL return a JSON error response with appropriate HTTP status code before starting the SSE stream
2. WHEN the System encounters a validation error in the request body, THEN the System SHALL return a JSON error response with appropriate HTTP status code before starting the SSE stream
3. WHEN the System encounters an exception from ChatWithAgentUseCase, THEN the System SHALL return a JSON error response with appropriate HTTP status code before starting the SSE stream
4. WHEN the System returns an error response, THEN the System SHALL set `Content-Type: application/json` header
5. WHEN the System successfully completes ChatWithAgentUseCase execution, THEN the System SHALL start the SSE stream

### Requirement 7

**User Story:** As a system operator, I want the backend to reuse existing DI container and use cases, so that the streaming implementation requires minimal changes to the existing codebase.

#### Acceptance Criteria

1. WHEN the System initializes dependencies, THEN the System SHALL obtain ChatWithAgentUseCase from the existing DIContainer
2. WHEN the System initializes dependencies, THEN the System SHALL obtain Agent and KnowledgeSpace repositories from the existing DIContainer
3. WHEN the System initializes dependencies, THEN the System SHALL obtain Qdrant Vector Store from the existing DIContainer
4. WHEN the System initializes dependencies, THEN the System SHALL obtain OpenAI Embedding Service from the existing DIContainer
5. WHEN the System calls ChatWithAgentUseCase, THEN the System SHALL pass the same input format as the existing sync implementation
6. WHEN the System receives output from ChatWithAgentUseCase, THEN the System SHALL expect the same output format (including `answer`, `conversationId`, `agentId`) as the existing sync implementation

### Requirement 8

**User Story:** As a system operator, I want the backend to log request and response metadata to CloudWatch, so that I can monitor and troubleshoot the streaming endpoint.

#### Acceptance Criteria

1. WHEN the System processes a request, THEN the System SHALL log the request ID to CloudWatch
2. WHEN the System processes a request, THEN the System SHALL log the model (Agent ID) to CloudWatch
3. WHEN the System processes a request, THEN the System SHALL log the tenant ID to CloudWatch
4. WHEN the System processes a request, THEN the System SHALL log the success or failure status to CloudWatch
5. WHEN the System processes a request, THEN the System SHALL log the ChatWithAgentUseCase processing time to CloudWatch
6. WHEN the System processes a request, THEN the System SHALL log the chunk sending time to CloudWatch
7. WHEN the System logs authentication events, THEN the System SHALL NOT log the full Authorization header value to CloudWatch
8. WHEN the System logs request events, THEN the System SHALL NOT log the complete message content to CloudWatch unless explicitly configured for debugging

### Requirement 9

**User Story:** As a system architect, I want the backend to support future extension to real token streaming, so that the implementation can evolve from pseudo-streaming to true streaming with minimal refactoring.

#### Acceptance Criteria

1. WHEN the System is designed, THEN the System SHALL separate the chunk generation logic from the SSE sending logic
2. WHEN the System is designed, THEN the System SHALL use a configurable chunk size constant that can be adjusted without code changes
3. WHEN the System is designed, THEN the System SHALL structure the code to allow future replacement of the pseudo-streaming logic with AsyncIterable-based real streaming
4. WHEN the System stores conversation history, THEN the System SHALL store the complete answer string regardless of streaming mode

### Requirement 10

**User Story:** As a Next.js frontend developer, I want the existing non-streaming JSON endpoint to remain unchanged, so that the frontend can continue to work without modifications.

#### Acceptance Criteria

1. WHEN the System receives a request with `stream: false`, THEN the System SHALL return the same JSON response format as the existing sync implementation
2. WHEN the System receives a request without a `stream` field, THEN the System SHALL return the same JSON response format as the existing sync implementation
3. WHEN the System processes a non-streaming request, THEN the System SHALL use the same ChatWithAgentUseCase execution flow as the existing sync implementation
4. WHEN the System processes a non-streaming request, THEN the System SHALL use the same error handling logic as the existing sync implementation
