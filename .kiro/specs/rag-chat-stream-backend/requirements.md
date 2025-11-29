# Requirements Document

## Introduction

本システムは、既存の RAG Chat Sync Backend に対して、OpenAI 互換の `/v1/chat/completions` エンドポイントに SSE（Server-Sent Events）ストリーミング機能を追加するバックエンドサービスである。tauvs の LLM レイヤーから OpenAI 互換形式で呼び出し可能とし、既存の RAG ロジック（DynamoDB / Qdrant / OpenAI Embedding）は変更せず、LLM 出力の返し方のみをストリーミング対応させる。

本フェーズでは「疑似ストリーミング」として、UseCase 完了後に回答文字列をチャンク分割して SSE 送信する最小構成を実装する。

## Glossary

- **System**: RAG Chat Stream Backend
- **SSE**: Server-Sent Events - HTTP 上でサーバーからクライアントへ一方向のイベントストリームを送信するプロトコル
- **Lambda Response Streaming**: AWS Lambda の機能で、レスポンスをストリーム形式で返すことができる機能
- **疑似ストリーミング**: UseCase 完了後に得られた完全な回答文字列を、チャンク分割して順次送信する方式
- **tauvs**: 本システムを利用するクライアントアプリケーション
- **OpenAI Chat Completions API**: OpenAI が提供するチャット補完 API の仕様
- **Bearer Token**: Authorization ヘッダで使用される認証トークン形式
- **TAUVS_API_KEY**: tauvs 専用の API 認証キー
- **ChatWithAgentUseCase**: 既存の RAG チャット処理を行うユースケースクラス
- **Agent**: RAG システムにおける会話エージェント
- **KnowledgeSpace**: RAG で使用するナレッジベース
- **Chunk**: ストリーミング送信時の分割単位
- **TTFB**: Time To First Byte - 最初のレスポンスバイトが到達するまでの時間
- **Regional Endpoint**: AWS API Gateway のリージョナルエンドポイント
- **Edge-optimized Endpoint**: CloudFront を経由する API Gateway エンドポイント

## Requirements

### Requirement 1

**User Story:** As a tauvs developer, I want to call the backend using OpenAI-compatible `/v1/chat/completions` endpoint with SSE streaming, so that I can integrate it seamlessly with OpenAI SDK.

#### Acceptance Criteria

1. WHEN a client sends a POST request to `/v1/chat/completions` with `stream: true` in the request body, THEN the System SHALL return a response with Content-Type `text/event-stream`
2. WHEN a client sends a POST request to `/v1/chat/completions` with `stream: false` or without the stream field, THEN the System SHALL return a JSON response with Content-Type `application/json`
3. WHEN the System receives a request, THEN the System SHALL accept a request body containing `model`, `messages`, and `stream` fields in OpenAI Chat Completions compatible format
4. WHEN the System processes the `model` field, THEN the System SHALL treat it as an Agent ID internally
5. WHEN the System processes the `messages` field, THEN the System SHALL pass it directly to ChatWithAgentUseCase without special processing

### Requirement 2

**User Story:** As a tauvs developer, I want to authenticate API requests using Bearer token, so that only authorized clients can access the streaming endpoint.

#### Acceptance Criteria

1. WHEN a client sends a request without an Authorization header, THEN the System SHALL return HTTP 401 with a JSON error response
2. WHEN a client sends a request with an Authorization header that does not start with "Bearer ", THEN the System SHALL return HTTP 401 with a JSON error response
3. WHEN a client sends a request with a Bearer token that does not match TAUVS_API_KEY, THEN the System SHALL return HTTP 403 with a JSON error response
4. WHEN the System validates the Bearer token successfully, THEN the System SHALL proceed to process the chat completion request
5. WHEN the System logs authentication events, THEN the System SHALL NOT log the complete Authorization header value

### Requirement 3

**User Story:** As a tauvs developer, I want to receive SSE events in OpenAI Chat Completions chunk format, so that I can use standard OpenAI SDK to parse the response.

#### Acceptance Criteria

1. WHEN the System sends SSE events, THEN the System SHALL format each event as `data: {JSON}\n\n` where JSON is an OpenAI-compatible chat completion chunk
2. WHEN the System sends the first SSE chunk, THEN the System SHALL include `delta: { "role": "assistant" }` in the choices array
3. WHEN the System sends subsequent SSE chunks, THEN the System SHALL include `delta: { "content": "<partial_text>" }` in the choices array
4. WHEN the System sends the final SSE chunk, THEN the System SHALL include `delta: {}` and `finish_reason: "stop"` in the choices array
5. WHEN the System completes the SSE stream, THEN the System SHALL send `data: [DONE]\n\n` as the final event
6. WHEN the System generates SSE chunks, THEN the System SHALL use the same `id` value (format: `chatcmpl-<random>`) across all chunks in a single stream
7. WHEN the System generates SSE chunks, THEN the System SHALL include `object: "chat.completion.chunk"`, `created` timestamp, and `model` name in each chunk

### Requirement 4

**User Story:** As a system architect, I want to split the complete answer string into chunks for pseudo-streaming, so that the response appears to stream while maintaining simplicity.

#### Acceptance Criteria

1. WHEN ChatWithAgentUseCase returns a complete answer string, THEN the System SHALL split it into chunks of 20-50 characters each
2. WHEN the System splits text into chunks, THEN the System SHALL ensure UTF-8 multibyte characters are not split in the middle
3. WHEN the System sends chunks, THEN the System SHALL send them sequentially via SSE events
4. WHEN the System completes sending all chunks, THEN the System SHALL send a final chunk with `finish_reason: "stop"`

### Requirement 5

**User Story:** As a backend developer, I want to use AWS Lambda Response Streaming, so that I can send SSE responses efficiently.

#### Acceptance Criteria

1. WHEN the System implements the Lambda handler, THEN the System SHALL use `awslambda.streamifyResponse` wrapper
2. WHEN the System starts SSE streaming, THEN the System SHALL set Content-Type to `text/event-stream; charset=utf-8` using `responseStream.setContentType`
3. WHEN the System sends SSE data, THEN the System SHALL use `responseStream.write` method
4. WHEN the System completes streaming, THEN the System SHALL call `responseStream.end` to close the stream
5. WHEN the System encounters an error before streaming starts, THEN the System SHALL set Content-Type to `application/json` and return a JSON error response

### Requirement 6

**User Story:** As a backend developer, I want to reuse existing RAG logic without modification, so that I can minimize changes to the proven codebase.

#### Acceptance Criteria

1. WHEN the System processes a chat request, THEN the System SHALL use the existing ChatWithAgentUseCase without modification
2. WHEN the System retrieves dependencies, THEN the System SHALL use the existing DIContainer
3. WHEN the System accesses data stores, THEN the System SHALL use existing DynamoDB repositories for Agent and KnowledgeSpace
4. WHEN the System performs vector search, THEN the System SHALL use the existing Qdrant Vector Store integration
5. WHEN the System generates embeddings, THEN the System SHALL use the existing OpenAI Embedding Service

### Requirement 7

**User Story:** As a DevOps engineer, I want to configure API Gateway for streaming integration, so that SSE responses can pass through without modification.

#### Acceptance Criteria

1. WHEN API Gateway is configured for the `/v1/chat/completions` endpoint, THEN the System SHALL set the integration response transfer mode to STREAM
2. WHEN API Gateway is deployed, THEN the System SHALL use a Regional endpoint type
3. WHEN the System sends streaming responses, THEN the System SHALL NOT apply response transformation, VTL templates, compression, or caching at API Gateway level
4. WHEN the System handles `text/event-stream` content, THEN the System SHALL NOT apply base64 encoding

### Requirement 8

**User Story:** As a system operator, I want proper error handling before streaming starts, so that clients receive clear error messages.

#### Acceptance Criteria

1. WHEN authentication fails, THEN the System SHALL return an HTTP error response before starting SSE streaming
2. WHEN request validation fails, THEN the System SHALL return an HTTP error response before starting SSE streaming
3. WHEN ChatWithAgentUseCase throws an exception, THEN the System SHALL return an HTTP error response before starting SSE streaming
4. WHEN the System returns an error response, THEN the System SHALL use Content-Type `application/json` and include error details in the response body
5. WHEN the System successfully obtains an answer string from ChatWithAgentUseCase, THEN the System SHALL start SSE streaming

### Requirement 9

**User Story:** As a security engineer, I want API keys stored securely, so that credentials are not exposed in code or logs.

#### Acceptance Criteria

1. WHEN the System retrieves TAUVS_API_KEY, THEN the System SHALL read it from environment variables or AWS Secrets Manager
2. WHEN the System logs events, THEN the System SHALL NOT log the complete Authorization header value
3. WHEN the System logs authentication events, THEN the System MAY log a hash or prefix of the token for debugging purposes
4. WHEN the System stores configuration, THEN the System SHALL NOT include API keys in source code

### Requirement 10

**User Story:** As a system operator, I want comprehensive logging and monitoring, so that I can troubleshoot issues and track usage.

#### Acceptance Criteria

1. WHEN the System processes a request, THEN the System SHALL log the request ID, model, tenantId, and agentId to CloudWatch
2. WHEN the System completes a request, THEN the System SHALL log the success or failure status to CloudWatch
3. WHEN the System processes a request, THEN the System SHALL log the ChatWithAgentUseCase processing time to CloudWatch
4. WHEN the System sends chunks, THEN the System SHALL log the chunk sending time to CloudWatch
5. WHEN the System logs events, THEN the System SHALL NOT log sensitive information such as complete message content or Authorization tokens

### Requirement 11

**User Story:** As a backend developer, I want to set appropriate Lambda configuration, so that streaming responses work reliably.

#### Acceptance Criteria

1. WHEN the Lambda function is deployed, THEN the System SHALL use Node.js 20.x runtime
2. WHEN the Lambda function is configured, THEN the System SHALL set a timeout of 120-300 seconds to accommodate streaming duration
3. WHEN the Lambda function streams responses, THEN the System SHALL ensure the total response size does not exceed 200MB
4. WHEN the Lambda function completes streaming, THEN the System SHALL call `responseStream.end()` to prevent resource leaks

### Requirement 12

**User Story:** As a frontend developer, I want backward compatibility with non-streaming requests, so that existing Next.js frontend continues to work without changes.

#### Acceptance Criteria

1. WHEN a request is received with `stream: false`, THEN the System SHALL return a response in the existing JSON format
2. WHEN a request is received without a `stream` field, THEN the System SHALL return a response in the existing JSON format
3. WHEN the System returns a non-streaming response, THEN the System SHALL use the existing `successResponse()` function format
4. WHEN the System encounters an error in non-streaming mode, THEN the System SHALL use the existing `errorResponse()` function format

### Requirement 13

**User Story:** As a system architect, I want to save conversation history consistently, so that chat history is preserved regardless of streaming mode.

#### Acceptance Criteria

1. WHEN the System completes a chat request in streaming mode, THEN the System SHALL save the complete answer string to conversation history
2. WHEN the System completes a chat request in non-streaming mode, THEN the System SHALL save the answer string to conversation history
3. WHEN the System saves conversation history, THEN the System SHALL use the same timing and method as the existing implementation
4. WHEN the System saves conversation history, THEN the System SHALL include conversationId, agentId, and the complete answer text
