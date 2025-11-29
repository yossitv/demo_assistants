# Design Document

## Overview

This system extends the existing RAG Chat Sync Backend to support OpenAI-compatible SSE (Server-Sent Events) streaming for the `/v1/chat/completions` endpoint. The primary goal is to enable tauvs integration while maintaining backward compatibility with the existing Next.js frontend.

### Key Design Principles

1. **Minimal Changes**: Reuse existing RAG logic (DynamoDB, Qdrant, OpenAI Embedding) without modification
2. **Pseudo-Streaming**: Split complete answer strings into chunks after UseCase execution (Phase 1)
3. **Protocol Compatibility**: Full OpenAI Chat Completions API compatibility for streaming and non-streaming modes
4. **Error-First**: Handle all errors before starting SSE stream to avoid mid-stream failures
5. **Future-Ready**: Design for easy migration to real token streaming (Phase 2)

### Architecture Decision

We implement a **new Lambda handler** (`chatCompletionsStreamHandler.ts`) that uses AWS Lambda Response Streaming (`awslambda.streamifyResponse`). This handler:
- Shares the same DIContainer and ChatWithAgentUseCase as the existing sync handler
- Branches behavior based on `request.body.stream` field
- Returns SSE format when `stream: true`, JSON format otherwise

## Architecture

### High-Level Architecture

```
┌─────────────┐
│   Client    │
│  (tauvs /   │
│  Frontend)  │
└──────┬──────┘
       │ POST /v1/chat/completions
       │ Authorization: Bearer <token>
       │ { model, messages, stream }
       ▼
┌─────────────────────────────────────┐
│      API Gateway (Regional)         │
│  Integration: STREAM mode           │
└──────────────┬──────────────────────┘
               │
               ▼
┌──────────────────────────────────────┐
│  Lambda (Node.js 20.x)               │
│  chatCompletionsStreamHandler        │
│  ┌────────────────────────────────┐  │
│  │ 1. Bearer Token Auth           │  │
│  │ 2. Parse & Validate Request    │  │
│  │ 3. Branch on stream field      │  │
│  └────────────────────────────────┘  │
│           │                           │
│           ├─ stream: false ──────────┐│
│           │                          ││
│           └─ stream: true ───────┐  ││
│                                  │  ││
│  ┌───────────────────────────┐  │  ││
│  │ ChatWithAgentUseCase      │◄─┴──┘│
│  │ (Existing, Unchanged)     │      │
│  └───────────┬───────────────┘      │
│              │                       │
│              ▼                       │
│  ┌───────────────────────────┐      │
│  │ Complete Answer String    │      │
│  └───────────┬───────────────┘      │
│              │                       │
│              ├─ JSON Response ───────┤
│              │                       │
│              └─ SSE Chunking ────────┤
│                 (Pseudo-streaming)   │
└──────────────────────────────────────┘
       │                    │
       ▼                    ▼
   JSON Response      SSE Stream
   (Existing)         (New)
```


### Component Interaction Flow

#### Non-Streaming Flow (stream: false or undefined)
```
Client → API Gateway → Lambda Handler
  → Bearer Auth Check
  → Parse Request Body
  → ChatWithAgentUseCase.execute()
  → Return JSON Response (existing format)
```

#### Streaming Flow (stream: true)
```
Client → API Gateway → Lambda Handler
  → Bearer Auth Check
  → Parse Request Body
  → ChatWithAgentUseCase.execute()
  → Get Complete Answer String
  → Split into Chunks (20-50 chars)
  → Send SSE Events:
      1. data: { delta: { role: "assistant" } }
      2. data: { delta: { content: "chunk1" } }
      3. data: { delta: { content: "chunk2" } }
      ...
      N. data: { delta: {}, finish_reason: "stop" }
      N+1. data: [DONE]
```

## Components and Interfaces

### 1. Lambda Handler: `chatCompletionsStreamHandler.ts`

**Purpose**: Entry point for streaming-capable chat completions endpoint

**Key Responsibilities**:
- Use `awslambda.streamifyResponse` wrapper
- Authenticate requests via Bearer token
- Parse and validate request body
- Branch on `stream` field
- Coordinate SSE chunk generation and sending
- Handle errors before stream starts

**Interface**:
```typescript
export const handler = awslambda.streamifyResponse(
  async (
    event: APIGatewayProxyEvent,
    responseStream: ResponseStream
  ): Promise<void> => {
    // Implementation
  }
);
```

### 2. StreamingChatController

**Purpose**: Controller layer for streaming chat logic

**Key Responsibilities**:
- Extract and validate Bearer token from headers
- Validate request body (model, messages, stream)
- Call ChatWithAgentUseCase
- Generate SSE chunks from complete answer
- Write chunks to responseStream
- Log request/response metadata

**Interface**:
```typescript
class StreamingChatController {
  constructor(
    private readonly useCase: ChatWithAgentUseCase,
    private readonly logger: ILogger
  );

  async handleStreaming(
    event: APIGatewayProxyEvent,
    responseStream: ResponseStream
  ): Promise<void>;

  async handleNonStreaming(
    event: APIGatewayProxyEvent,
    responseStream: ResponseStream
  ): Promise<void>;
}
```


### 3. SSEChunkGenerator

**Purpose**: Generate OpenAI-compatible SSE chunks from complete answer string

**Key Responsibilities**:
- Split answer string into character-based chunks (20-50 chars)
- Respect UTF-8 multibyte character boundaries
- Generate chunk ID (chatcmpl-<random>)
- Format chunks as OpenAI Chat Completion chunks
- Generate first chunk with role
- Generate content chunks
- Generate final chunk with finish_reason

**Interface**:
```typescript
interface SSEChunk {
  id: string;
  object: 'chat.completion.chunk';
  created: number;
  model: string;
  choices: Array<{
    index: number;
    delta: {
      role?: 'assistant';
      content?: string;
    };
    finish_reason: null | 'stop';
  }>;
}

class SSEChunkGenerator {
  constructor(private readonly chunkSize: number = 32);

  generateChunks(
    answer: string,
    model: string,
    conversationId: string
  ): SSEChunk[];

  formatChunkAsSSE(chunk: SSEChunk): string;
}
```

### 4. BearerTokenAuthenticator

**Purpose**: Authenticate requests using Bearer token

**Key Responsibilities**:
- Extract Authorization header (case-insensitive)
- Validate Bearer token format
- Compare token with TAUVS_API_KEY
- Return authentication context (tenantId, userId)
- Log authentication attempts (without exposing tokens)

**Interface**:
```typescript
interface AuthContext {
  tenantId: string;
  userId: string;
  authMethod: 'bearer';
}

class BearerTokenAuthenticator {
  authenticate(headers: Record<string, string>): AuthContext;
}
```

### 5. Reused Components (Existing)

- **ChatWithAgentUseCase**: Unchanged, returns complete answer string
- **DIContainer**: Extended to provide StreamingChatController
- **CloudWatchLogger**: Reused for logging
- **All Repositories**: DynamoDB Agent, KnowledgeSpace, Conversation, Qdrant Vector
- **All Services**: OpenAI Embedding, LLM, Chunking, Crawler

## Data Models

### Request Body (OpenAI Compatible)

```typescript
interface ChatCompletionRequest {
  model: string;              // Agent ID
  messages: Array<{
    role: 'system' | 'user' | 'assistant';
    content: string;
  }>;
  stream?: boolean;           // true = SSE, false/undefined = JSON
  
  // Ignored in Phase 1 (future extension)
  temperature?: number;
  top_p?: number;
  frequency_penalty?: number;
  tools?: any[];
  tool_choice?: any;
  extra_body?: Record<string, any>;
}
```

### SSE Response Format

Each SSE event follows this format:
```
data: <JSON>\n\n
```

**First Chunk**:
```json
{
  "id": "chatcmpl-abc123",
  "object": "chat.completion.chunk",
  "created": 1700000000,
  "model": "agent-xyz",
  "choices": [{
    "index": 0,
    "delta": { "role": "assistant" },
    "finish_reason": null
  }]
}
```

**Content Chunks**:
```json
{
  "id": "chatcmpl-abc123",
  "object": "chat.completion.chunk",
  "created": 1700000000,
  "model": "agent-xyz",
  "choices": [{
    "index": 0,
    "delta": { "content": "partial text" },
    "finish_reason": null
  }]
}
```

**Final Chunk**:
```json
{
  "id": "chatcmpl-abc123",
  "object": "chat.completion.chunk",
  "created": 1700000000,
  "model": "agent-xyz",
  "choices": [{
    "index": 0,
    "delta": {},
    "finish_reason": "stop"
  }]
}
```

**Stream Terminator**:
```
data: [DONE]\n\n
```


### Non-Streaming JSON Response (Existing Format)

```typescript
interface ChatCompletionResponse {
  id: string;                 // Conversation ID
  object: 'chat.completion';
  model: string;              // Agent ID
  choices: Array<{
    message: {
      role: 'assistant';
      content: string;
      cited_urls: string[];
      isRag: boolean;
    };
  }>;
}
```

### Error Response Format

```typescript
interface ErrorResponse {
  error: {
    message: string;
    type?: string;
    code?: string;
  };
}
```

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system-essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property Reflection

Before defining properties, we identify and eliminate redundancy:

**Redundancy Analysis**:
- Properties 3.1, 3.6, 3.7, 3.8, 3.9, 3.10 all verify SSE chunk format → Can be combined into a single comprehensive property
- Properties 5.5, 5.6, 5.7 all verify SSE response headers → Can be combined into a single property
- Properties 8.1, 8.2, 8.3, 8.4, 8.5, 8.6 all verify logging behavior → Can be combined into fewer comprehensive properties
- Properties 12.1-12.6 all verify ignored fields → Can be combined into a single property

After reflection, we consolidate to the following unique, non-redundant properties:

### Property 1: Stream mode determines response format
*For any* valid chat completion request, when `stream: true` is set, the response Content-Type should be `text/event-stream`, and when `stream: false` or undefined, the response Content-Type should be `application/json`
**Validates: Requirements 1.1, 1.2**

### Property 2: Model field is parsed as Agent ID
*For any* valid chat completion request, the `model` field value should be used as the Agent ID when calling ChatWithAgentUseCase
**Validates: Requirements 1.3**

### Property 3: Messages are passed through unchanged
*For any* valid chat completion request, the `messages` array should be passed to ChatWithAgentUseCase without modification
**Validates: Requirements 1.4**

### Property 4: Authorization header is case-insensitive
*For any* request with an Authorization header, the system should accept both `Authorization` and `authorization` header keys
**Validates: Requirements 2.5**

### Property 5: Authentication tokens are not logged
*For any* authentication event logged to CloudWatch, the log entry should not contain the full Authorization header value or Bearer token
**Validates: Requirements 2.6, 8.7**

### Property 6: SSE chunks follow OpenAI format
*For any* SSE stream, all chunks should have the same `id` (format `chatcmpl-<random>`), include `object: "chat.completion.chunk"`, include a valid `created` timestamp, include the `model` field, and include a `choices` array with a single element at index 0
**Validates: Requirements 3.1, 3.6, 3.7, 3.8, 3.9, 3.10**

### Property 7: SSE content chunks contain partial text
*For any* SSE stream (excluding first and last chunks), each content chunk should include `delta: { "content": "<text>" }` where text is non-empty
**Validates: Requirements 3.3**

### Property 8: Chunk splitting respects UTF-8 boundaries
*For any* answer string containing multibyte UTF-8 characters, when split into chunks, no chunk should contain partial multibyte characters
**Validates: Requirements 4.2**

### Property 9: Chunk sizes are within configured range
*For any* answer string split into chunks, each chunk (except possibly the last) should contain between 20 and 50 characters
**Validates: Requirements 4.1**


### Property 10: SSE responses include required headers
*For any* SSE response, the response should include `Content-Type: text/event-stream; charset=utf-8`, `Cache-Control: no-cache`, and `Connection: keep-alive` headers
**Validates: Requirements 5.5, 5.6, 5.7**

### Property 11: Error responses are JSON before stream starts
*For any* request that encounters an error (authentication, validation, or UseCase exception), the response should have `Content-Type: application/json` and should not start an SSE stream
**Validates: Requirements 6.4**

### Property 12: UseCase input format matches existing implementation
*For any* chat completion request, the input passed to ChatWithAgentUseCase should match the format used by the existing sync implementation (tenantId, userId, agentId, messages, requestId)
**Validates: Requirements 7.5**

### Property 13: Request metadata is logged
*For any* processed request, CloudWatch logs should contain the request ID, model (Agent ID), tenant ID, success/failure status, and processing time
**Validates: Requirements 8.1, 8.2, 8.3, 8.4, 8.5**

### Property 14: Streaming timing is logged
*For any* streaming request, CloudWatch logs should contain the chunk sending time in addition to UseCase processing time
**Validates: Requirements 8.6**

### Property 15: Message content logging respects configuration
*For any* request, complete message content should only be logged to CloudWatch when explicitly configured for debugging (e.g., LOG_LEVEL=DEBUG)
**Validates: Requirements 8.8**

### Property 16: Conversation storage is complete
*For any* chat completion request (streaming or non-streaming), the stored conversation should contain the complete answer string, not partial chunks
**Validates: Requirements 9.4**

### Property 17: Non-streaming responses match existing format
*For any* request with `stream: false` or undefined, the JSON response format should match the existing sync implementation's ChatCompletionResponse format
**Validates: Requirements 10.1, 10.2**

### Property 18: Optional OpenAI parameters are ignored
*For any* request containing `temperature`, `top_p`, `frequency_penalty`, `tools`, `tool_choice`, or `extra_body` fields, these fields should be ignored and not affect the response
**Validates: Requirements 12.1, 12.2, 12.3, 12.4, 12.5, 12.6**

### Property 19: CORS headers are included in SSE responses
*For any* SSE response, CORS headers should be included according to the existing CORS policy (Access-Control-Allow-Origin, etc.)
**Validates: Requirements 13.1, 13.2**

## Error Handling

### Error Handling Strategy

**Principle**: All errors are handled **before** starting the SSE stream. Once the stream starts, it will complete successfully.

### Error Types and Responses

#### 1. Authentication Errors (HTTP 401)
- Missing Authorization header
- Authorization header without "Bearer " prefix
- Malformed Bearer token

**Response**:
```json
{
  "error": {
    "message": "Unauthorized",
    "type": "authentication_error"
  }
}
```

#### 2. Authorization Errors (HTTP 403)
- Bearer token does not match TAUVS_API_KEY

**Response**:
```json
{
  "error": {
    "message": "Forbidden",
    "type": "authorization_error"
  }
}
```

#### 3. Validation Errors (HTTP 400)
- Missing required fields (model, messages)
- Invalid message format
- Empty messages array

**Response**:
```json
{
  "error": {
    "message": "Invalid request: <details>",
    "type": "validation_error"
  }
}
```

#### 4. Not Found Errors (HTTP 404)
- Agent not found
- KnowledgeSpace not found

**Response**:
```json
{
  "error": {
    "message": "Agent not found",
    "type": "not_found_error"
  }
}
```

#### 5. Internal Errors (HTTP 500)
- UseCase execution failures
- Database errors
- External service errors

**Response**:
```json
{
  "error": {
    "message": "Internal server error",
    "type": "internal_error"
  }
}
```


### Error Handling Flow

```
Request → Handler
  ↓
Authentication Check
  ├─ Fail → Return 401/403 JSON
  └─ Pass
      ↓
  Request Validation
      ├─ Fail → Return 400 JSON
      └─ Pass
          ↓
      ChatWithAgentUseCase.execute()
          ├─ Throw NotFoundError → Return 404 JSON
          ├─ Throw ValidationError → Return 400 JSON
          ├─ Throw Other Error → Return 500 JSON
          └─ Success
              ↓
          Start SSE Stream (if stream: true)
          OR
          Return JSON Response (if stream: false)
```

### Logging Strategy for Errors

All errors are logged with:
- Request ID
- Tenant ID (if available)
- User ID (if available)
- Error type and message
- Stack trace (for internal errors)
- Request path and method
- Duration until error

**Security Note**: Authorization header values are never logged. Only token hashes or first 4 characters may be logged if necessary for debugging.

## Testing Strategy

### Dual Testing Approach

This system uses both unit testing and property-based testing to ensure comprehensive coverage:

- **Unit tests** verify specific examples, edge cases, and error conditions
- **Property tests** verify universal properties that should hold across all inputs
- Together they provide comprehensive coverage: unit tests catch concrete bugs, property tests verify general correctness

### Property-Based Testing

**Library**: fast-check (TypeScript/JavaScript property-based testing library)

**Configuration**: Each property-based test should run a minimum of 100 iterations to ensure thorough coverage of the input space.

**Tagging Convention**: Each property-based test must be tagged with a comment explicitly referencing the correctness property in this design document:
```typescript
// Feature: apps--rag-chat-stream-backend, Property 1: Stream mode determines response format
```

**Property Test Coverage**:

1. **Property 1**: Generate random requests with varying `stream` values, verify Content-Type header
2. **Property 2**: Generate random `model` values, verify they are passed as Agent ID
3. **Property 3**: Generate random `messages` arrays, verify they are passed unchanged
4. **Property 4**: Generate requests with different Authorization header casings, verify all work
5. **Property 5**: Generate authentication events, verify logs don't contain tokens
6. **Property 6**: Generate SSE streams, verify all chunks have consistent ID and required fields
7. **Property 7**: Generate SSE streams, verify content chunks have non-empty delta.content
8. **Property 8**: Generate answer strings with emoji and multibyte characters, verify chunks don't break them
9. **Property 9**: Generate answer strings of various lengths, verify chunk sizes are within range
10. **Property 10**: Generate SSE responses, verify required headers are present
11. **Property 11**: Generate error conditions, verify JSON responses before stream
12. **Property 12**: Generate requests, verify UseCase input format matches existing implementation
13. **Property 13**: Generate requests, verify logs contain required metadata
14. **Property 14**: Generate streaming requests, verify logs contain chunk timing
15. **Property 15**: Generate requests with different LOG_LEVEL settings, verify message content logging
16. **Property 16**: Generate requests, verify stored conversations have complete answers
17. **Property 17**: Generate non-streaming requests, verify response format matches existing
18. **Property 18**: Generate requests with optional OpenAI parameters, verify they are ignored
19. **Property 19**: Generate SSE responses, verify CORS headers are present

### Unit Testing

Unit tests should cover:

**Authentication**:
- Missing Authorization header returns 401
- Malformed Authorization header returns 401
- Invalid Bearer token returns 403
- Valid Bearer token succeeds

**Request Validation**:
- Missing model field returns 400
- Missing messages field returns 400
- Empty messages array returns 400
- Valid request passes validation

**SSE Chunk Generation**:
- First chunk has role in delta
- Content chunks have content in delta
- Final chunk has empty delta and finish_reason: "stop"
- Stream ends with [DONE]

**Error Handling**:
- NotFoundError returns 404
- ValidationError returns 400
- Generic errors return 500
- All errors return JSON before stream starts

**Integration Points**:
- DIContainer provides correct dependencies
- ChatWithAgentUseCase is called with correct parameters
- Conversation is saved with complete answer


### Test Utilities

**Generators for Property Tests**:
```typescript
// Generate random chat completion requests
function arbitraryChatRequest(): fc.Arbitrary<ChatCompletionRequest>;

// Generate random answer strings with multibyte characters
function arbitraryAnswerString(): fc.Arbitrary<string>;

// Generate random Authorization headers with various casings
function arbitraryAuthHeader(): fc.Arbitrary<Record<string, string>>;

// Generate random Bearer tokens
function arbitraryBearerToken(): fc.Arbitrary<string>;
```

**Mock Utilities**:
```typescript
// Mock ResponseStream for testing
class MockResponseStream implements ResponseStream {
  private chunks: string[] = [];
  
  write(chunk: string): void;
  end(): void;
  setContentType(type: string): void;
  getChunks(): string[];
}

// Mock ChatWithAgentUseCase for testing
class MockChatWithAgentUseCase {
  execute(input: ChatWithAgentInput): Promise<ChatWithAgentOutput>;
}
```

## Infrastructure Requirements

### AWS Lambda Configuration

**Runtime**: Node.js 20.x

**Handler**: `src/handlers/chatCompletionsStreamHandler.handler`

**Timeout**: 120-300 seconds (configurable based on expected response times)

**Memory**: 512 MB - 1024 MB (same as existing chat handler)

**Environment Variables**:
- `TAUVS_API_KEY`: Bearer token for tauvs authentication
- `AGENTS_TABLE_NAME`: DynamoDB table for agents
- `KNOWLEDGE_SPACES_TABLE_NAME`: DynamoDB table for knowledge spaces
- `CONVERSATIONS_TABLE_NAME`: DynamoDB table for conversations
- `QDRANT_URL`: Qdrant endpoint URL
- `QDRANT_API_KEY`: Qdrant API key
- `OPENAI_API_KEY`: OpenAI API key
- `EMBEDDING_MODEL`: OpenAI embedding model (default: text-embedding-3-small)
- `LLM_MODEL`: OpenAI LLM model (default: gpt-4)
- `LOG_LEVEL`: Logging level (INFO, DEBUG, etc.)
- `NODE_ENV`: Environment (production, development, etc.)

**IAM Permissions**:
- DynamoDB: GetItem, PutItem, Query on all tables
- CloudWatch Logs: CreateLogGroup, CreateLogStream, PutLogEvents
- Qdrant: Network access to Qdrant endpoint

### API Gateway Configuration

**Endpoint Type**: Regional

**Path**: `/v1/chat/completions`

**Method**: POST

**Integration Type**: Lambda Proxy

**Integration Response Transfer Mode**: **STREAM** (critical for SSE support)

**CORS Configuration**:
```yaml
Access-Control-Allow-Origin: '*'
Access-Control-Allow-Headers: 'Content-Type,Authorization,x-api-key,X-API-Key'
Access-Control-Allow-Methods: 'POST,OPTIONS'
```

**Binary Media Types**: Not required (text/event-stream is text)

**Timeout**: Use Regional endpoint (5 minute timeout) instead of Edge-optimized (30 second timeout)

### CDK Infrastructure Code

```typescript
// Lambda Function
const streamingChatHandler = new lambda.Function(this, 'StreamingChatHandler', {
  runtime: lambda.Runtime.NODEJS_20_X,
  handler: 'handlers/chatCompletionsStreamHandler.handler',
  code: lambda.Code.fromAsset('lambda-dist'),
  timeout: cdk.Duration.seconds(180),
  memorySize: 1024,
  environment: {
    TAUVS_API_KEY: process.env.TAUVS_API_KEY!,
    AGENTS_TABLE_NAME: agentsTable.tableName,
    KNOWLEDGE_SPACES_TABLE_NAME: knowledgeSpacesTable.tableName,
    CONVERSATIONS_TABLE_NAME: conversationsTable.tableName,
    QDRANT_URL: process.env.QDRANT_URL!,
    QDRANT_API_KEY: process.env.QDRANT_API_KEY!,
    OPENAI_API_KEY: process.env.OPENAI_API_KEY!,
    EMBEDDING_MODEL: 'text-embedding-3-small',
    LLM_MODEL: 'gpt-4',
    LOG_LEVEL: 'INFO',
    NODE_ENV: 'production'
  }
});

// API Gateway Integration with STREAM mode
const streamingIntegration = new apigateway.LambdaIntegration(
  streamingChatHandler,
  {
    proxy: true,
    // Enable streaming response
    integrationResponses: [{
      statusCode: '200',
      responseParameters: {
        'method.response.header.Content-Type': "'text/event-stream'",
        'method.response.header.Cache-Control': "'no-cache'",
        'method.response.header.Connection': "'keep-alive'",
      }
    }]
  }
);

// Add method to API Gateway
const chatCompletionsResource = api.root
  .resourceForPath('v1/chat/completions');

chatCompletionsResource.addMethod('POST', streamingIntegration, {
  methodResponses: [{
    statusCode: '200',
    responseParameters: {
      'method.response.header.Content-Type': true,
      'method.response.header.Cache-Control': true,
      'method.response.header.Connection': true,
    }
  }]
});
```


## Implementation Details

### Chunk Size Configuration

**Default**: 32 characters per chunk

**Rationale**:
- Balance between UX (smooth streaming appearance) and CloudWatch costs
- Small enough to create streaming effect
- Large enough to avoid excessive API Gateway overhead

**Configuration**:
```typescript
// src/shared/constants.ts
export const STREAMING_CONFIG = {
  CHUNK_SIZE: parseInt(process.env.CHUNK_SIZE || '32', 10),
  MIN_CHUNK_SIZE: 20,
  MAX_CHUNK_SIZE: 50
};
```

### UTF-8 Character Boundary Handling

JavaScript strings are UTF-16 encoded internally, but we need to ensure chunks don't break UTF-8 multibyte characters when sent over the wire.

**Strategy**:
1. Split by JavaScript string character boundaries (which respects UTF-16 surrogate pairs)
2. JavaScript's string indexing automatically handles emoji and multibyte characters correctly
3. No additional encoding logic needed

**Example**:
```typescript
function splitIntoChunks(text: string, chunkSize: number): string[] {
  const chunks: string[] = [];
  for (let i = 0; i < text.length; i += chunkSize) {
    chunks.push(text.slice(i, i + chunkSize));
  }
  return chunks;
}

// This correctly handles:
// "Hello 👋 World" → ["Hello 👋", " World"]
// "こんにちは世界" → ["こんにちは", "世界"]
```

### Conversation ID Generation

Reuse existing conversation ID generation from ChatWithAgentUseCase:
```typescript
private generateConversationId(): string {
  return `conv_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
}
```

### Chunk ID Generation

Generate unique ID for each streaming request:
```typescript
function generateChunkId(): string {
  return `chatcmpl-${Math.random().toString(36).substring(2, 15)}`;
}
```

### Timestamp Generation

Use Unix epoch seconds (consistent with OpenAI):
```typescript
const created = Math.floor(Date.now() / 1000);
```

## Security Considerations

### Bearer Token Storage

**Requirement**: TAUVS_API_KEY must be stored securely

**Options**:
1. **Environment Variable** (Phase 1): Simple, suitable for single-key scenario
2. **AWS Secrets Manager** (Phase 2): Better for multiple keys or rotation

**Phase 1 Implementation**:
```typescript
const expectedToken = process.env.TAUVS_API_KEY;
if (!expectedToken) {
  throw new Error('TAUVS_API_KEY environment variable not set');
}
```

### Token Validation

```typescript
function validateBearerToken(headers: Record<string, string>): boolean {
  const authHeader = headers['Authorization'] || headers['authorization'];
  
  if (!authHeader) {
    return false;
  }
  
  if (!authHeader.startsWith('Bearer ')) {
    return false;
  }
  
  const token = authHeader.substring(7);
  const expectedToken = process.env.TAUVS_API_KEY;
  
  return token === expectedToken;
}
```

### Logging Security

**Rules**:
1. Never log full Authorization header
2. Never log Bearer token value
3. If debugging requires token info, log only:
   - First 4 characters: `Bear...`
   - SHA-256 hash of token

**Example**:
```typescript
function logAuthAttempt(headers: Record<string, string>, success: boolean) {
  const authHeader = headers['Authorization'] || headers['authorization'];
  const tokenPreview = authHeader 
    ? authHeader.substring(0, 8) + '...' 
    : 'none';
  
  logger.info('Authentication attempt', {
    tokenPreview,  // "Bearer a..." not full token
    success
  });
}
```

### Rate Limiting

**Phase 1**: Not implemented (rely on API Gateway throttling)

**Phase 2**: Consider implementing per-tenant rate limiting using DynamoDB or Redis

### CORS Security

Reuse existing CORS configuration:
```typescript
const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type,Authorization,x-api-key,X-API-Key',
  'Access-Control-Allow-Methods': 'POST,OPTIONS'
};
```

**Note**: `Access-Control-Allow-Origin: *` is acceptable for public API. For stricter security, configure specific origins.


## Performance Considerations

### Time To First Byte (TTFB)

**Components**:
1. Lambda cold start: ~1-3 seconds (first request)
2. Lambda warm start: ~50-200ms (subsequent requests)
3. Bearer token validation: <1ms
4. ChatWithAgentUseCase execution: 2-10 seconds (dominant factor)
   - Embedding generation: ~200-500ms
   - Vector search: ~100-300ms
   - LLM generation: 1-8 seconds
5. Chunk generation: <10ms
6. First chunk send: <50ms

**Total TTFB**: Dominated by UseCase execution time (2-10 seconds)

**Optimization Opportunities** (Phase 2):
- Real token streaming: Reduce TTFB to ~2-3 seconds (start streaming before LLM completes)
- Provisioned concurrency: Eliminate cold starts
- Caching: Cache embeddings for common queries

### Throughput

**Chunk Sending Rate**:
- 32 character chunks
- ~1ms per chunk write
- For 1000 character response: ~31 chunks, ~31ms total sending time
- Negligible compared to UseCase execution time

**Concurrent Requests**:
- Lambda concurrency: Default 1000 (configurable)
- API Gateway: 10,000 requests per second (Regional)
- Bottleneck: Likely Qdrant or OpenAI API rate limits

### Memory Usage

**Lambda Memory**: 512 MB - 1024 MB

**Memory Breakdown**:
- Node.js runtime: ~50 MB
- Dependencies (OpenAI SDK, Qdrant client, etc.): ~100 MB
- DIContainer and services: ~50 MB
- Request/response buffers: ~10 MB
- Available for processing: ~300-800 MB

**Streaming Benefit**: Response streaming doesn't buffer entire response in memory, allowing larger responses without increasing memory requirements.

## Monitoring and Observability

### CloudWatch Metrics

**Custom Metrics to Emit**:
```typescript
// Request metrics
putMetric('ChatCompletions.Requests', 1, 'Count');
putMetric('ChatCompletions.StreamingRequests', 1, 'Count');
putMetric('ChatCompletions.NonStreamingRequests', 1, 'Count');

// Timing metrics
putMetric('ChatCompletions.UseCaseDuration', durationMs, 'Milliseconds');
putMetric('ChatCompletions.ChunkSendingDuration', chunkDurationMs, 'Milliseconds');
putMetric('ChatCompletions.TotalDuration', totalDurationMs, 'Milliseconds');

// Error metrics
putMetric('ChatCompletions.AuthenticationErrors', 1, 'Count');
putMetric('ChatCompletions.ValidationErrors', 1, 'Count');
putMetric('ChatCompletions.InternalErrors', 1, 'Count');

// Response metrics
putMetric('ChatCompletions.ChunkCount', chunkCount, 'Count');
putMetric('ChatCompletions.ResponseLength', responseLength, 'Bytes');
```

### CloudWatch Logs

**Structured Logging Format**:
```typescript
// Request start
logger.info('Streaming chat request received', {
  requestId,
  tenantId,
  userId,
  agentId,
  messageCount,
  stream: true,
  authMethod: 'bearer'
});

// UseCase completion
logger.info('ChatWithAgentUseCase completed', {
  requestId,
  tenantId,
  agentId,
  answerLength,
  citedUrlCount,
  durationMs
});

// Chunk sending
logger.debug('Sending SSE chunks', {
  requestId,
  chunkCount,
  totalChars
});

// Request completion
logger.info('Streaming chat request completed', {
  requestId,
  tenantId,
  agentId,
  totalDurationMs,
  chunkSendingDurationMs,
  chunkCount
});

// Error
logger.error('Error in streaming chat handler', error, {
  requestId,
  tenantId,
  agentId,
  errorType: error.name,
  durationMs
});
```

### CloudWatch Dashboards

**Recommended Widgets**:
1. Request rate (streaming vs non-streaming)
2. Error rate by type (401, 403, 400, 404, 500)
3. P50, P90, P99 latency
4. UseCase execution time distribution
5. Chunk sending time distribution
6. Lambda concurrent executions
7. Lambda errors and throttles

### Alarms

**Critical Alarms**:
```typescript
// High error rate
new cloudwatch.Alarm(this, 'HighErrorRate', {
  metric: errorMetric,
  threshold: 5,  // 5% error rate
  evaluationPeriods: 2,
  datapointsToAlarm: 2
});

// High latency
new cloudwatch.Alarm(this, 'HighLatency', {
  metric: latencyMetric,
  threshold: 15000,  // 15 seconds
  evaluationPeriods: 3,
  statistic: 'p99'
});

// Lambda throttling
new cloudwatch.Alarm(this, 'LambdaThrottles', {
  metric: throttleMetric,
  threshold: 10,
  evaluationPeriods: 1
});
```


## Migration and Deployment Strategy

### Phase 1: Pseudo-Streaming (Current Scope)

**Deployment Steps**:
1. Deploy new Lambda function with streaming handler
2. Configure API Gateway integration with STREAM mode
3. Set TAUVS_API_KEY environment variable
4. Test with tauvs client
5. Monitor CloudWatch logs and metrics
6. Verify existing frontend still works (non-streaming mode)

**Rollback Plan**:
- Keep existing sync handler as fallback
- Route traffic using API Gateway stages
- Can switch back to sync handler if issues arise

### Phase 2: Real Token Streaming (Future)

**Changes Required**:
1. Modify OpenAILLMService to support streaming:
   ```typescript
   async generateCompletionStream(prompt: string): AsyncIterable<string> {
     const stream = await this.openai.chat.completions.create({
       model: this.model,
       messages: [{ role: 'user', content: prompt }],
       stream: true
     });
     
     for await (const chunk of stream) {
       const content = chunk.choices[0]?.delta?.content;
       if (content) {
         yield content;
       }
     }
   }
   ```

2. Modify ChatWithAgentUseCase to support streaming:
   ```typescript
   async *executeStream(input: ChatWithAgentInput): AsyncIterable<string> {
     // ... existing logic up to LLM call ...
     
     for await (const token of this.llmService.generateCompletionStream(prompt)) {
       yield token;
     }
     
     // Save conversation after stream completes
   }
   ```

3. Modify StreamingChatController to consume AsyncIterable:
   ```typescript
   for await (const token of this.useCase.executeStream(input)) {
     const chunk = this.generateChunk(token);
     responseStream.write(formatSSE(chunk));
   }
   ```

**Benefits of Phase 2**:
- True streaming: First token arrives in ~2-3 seconds instead of 5-10 seconds
- Better UX: Users see response building in real-time
- Lower perceived latency

**Backward Compatibility**:
- Non-streaming mode still works (buffer entire stream before returning)
- Existing frontend unaffected

## Future Enhancements

### 1. Usage Tracking

Add token usage information to SSE stream:
```json
{
  "id": "chatcmpl-abc123",
  "object": "chat.completion.chunk",
  "created": 1700000000,
  "model": "agent-xyz",
  "choices": [{
    "index": 0,
    "delta": {},
    "finish_reason": "stop"
  }],
  "usage": {
    "prompt_tokens": 150,
    "completion_tokens": 75,
    "total_tokens": 225
  }
}
```

### 2. Multi-Tenant API Keys

Support multiple API keys with tenant isolation:
```typescript
interface APIKeyConfig {
  key: string;
  tenantId: string;
  userId: string;
  rateLimit?: number;
}

// Store in DynamoDB or Secrets Manager
const apiKeys: Map<string, APIKeyConfig> = loadAPIKeys();
```

### 3. Streaming Heartbeat

For long-running streams, send periodic heartbeat to prevent timeout:
```typescript
// Every 20 seconds, send SSE comment
: ping\n\n
```

### 4. Stream Cancellation

Handle client disconnection gracefully:
```typescript
responseStream.on('close', () => {
  logger.info('Client disconnected', { requestId });
  // Cancel ongoing LLM request
  abortController.abort();
});
```

### 5. Response Caching

Cache responses for identical queries:
```typescript
const cacheKey = hash({ agentId, messages });
const cached = await cache.get(cacheKey);
if (cached) {
  return cached;
}
```

### 6. A/B Testing

Test different chunk sizes or streaming strategies:
```typescript
const chunkSize = experiment.getVariant('chunk-size', {
  control: 32,
  variant: 50
});
```

## Appendix

### OpenAI Chat Completions API Reference

**Non-Streaming Request**:
```bash
curl https://api.openai.com/v1/chat/completions \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $OPENAI_API_KEY" \
  -d '{
    "model": "gpt-4",
    "messages": [{"role": "user", "content": "Hello!"}]
  }'
```

**Streaming Request**:
```bash
curl https://api.openai.com/v1/chat/completions \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $OPENAI_API_KEY" \
  -d '{
    "model": "gpt-4",
    "messages": [{"role": "user", "content": "Hello!"}],
    "stream": true
  }'
```

### AWS Lambda Response Streaming Documentation

**Node.js Example**:
```typescript
import { streamifyResponse } from 'lambda-stream';

export const handler = streamifyResponse(async (event, responseStream) => {
  responseStream.setContentType('text/event-stream');
  
  responseStream.write('data: {"message": "Hello"}\n\n');
  responseStream.write('data: {"message": "World"}\n\n');
  
  responseStream.end();
});
```

**Key Points**:
- Must use `streamifyResponse` wrapper
- Must call `responseStream.end()` to close stream
- Cannot use traditional `return` statement
- API Gateway must be configured with STREAM integration mode

### Glossary of Terms

- **SSE**: Server-Sent Events, a standard for server-to-client streaming over HTTP
- **Pseudo-Streaming**: Splitting a complete response into chunks after generation
- **Real Streaming**: Streaming tokens as they are generated by the LLM
- **Bearer Token**: Authentication token passed in Authorization header
- **Chunk**: A portion of the response sent as a single SSE event
- **TTFB**: Time To First Byte, latency until first response data arrives
- **Regional Endpoint**: API Gateway endpoint type without CloudFront CDN
- **Edge-Optimized**: API Gateway endpoint type with CloudFront CDN (30s timeout)
