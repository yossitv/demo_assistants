# Streaming Chat API Documentation

## Overview

The `/v1/chat/completions` endpoint supports both streaming and non-streaming responses, compatible with OpenAI's Chat Completions API format.

## Authentication

### Bearer Token (for external clients like Tauvs)

```http
POST /v1/chat/completions
Authorization: Bearer <TEST_API_KEY>
Content-Type: application/json
```

The Lambda function validates the Bearer token against the `TEST_API_KEY` environment variable.

### API Key (for other clients)

```http
POST /v1/chat/completions
Authorization: <API_KEY>
Content-Type: application/json
```

## Endpoint

```
POST /v1/chat/completions
```

## Request Format

### Streaming Request

```json
{
  "model": "agent-123",
  "messages": [
    {
      "role": "user",
      "content": "What is RAG?"
    }
  ],
  "stream": true
}
```

### Non-Streaming Request

```json
{
  "model": "agent-123",
  "messages": [
    {
      "role": "user",
      "content": "What is RAG?"
    }
  ],
  "stream": false
}
```

## Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `model` | string | Yes | Agent ID to use for the chat |
| `messages` | array | Yes | Array of message objects with `role` and `content` |
| `stream` | boolean | No | If `true`, returns SSE stream. If `false`, returns JSON. Default: `false` |

### Ignored Parameters

The following OpenAI parameters are accepted but ignored:
- `temperature`
- `top_p`
- `n`
- `max_tokens`
- `presence_penalty`
- `frequency_penalty`

## Response Format

### Streaming Response (SSE)

When `stream: true`, the response is sent as Server-Sent Events (SSE):

```
Content-Type: text/event-stream
Cache-Control: no-cache
Connection: keep-alive
Access-Control-Allow-Origin: *

data: {"id":"chatcmpl-123","object":"chat.completion.chunk","created":1234567890,"model":"agent-123","choices":[{"index":0,"delta":{"role":"assistant","content":""},"finish_reason":null}]}

data: {"id":"chatcmpl-123","object":"chat.completion.chunk","created":1234567890,"model":"agent-123","choices":[{"index":0,"delta":{"content":"RAG"},"finish_reason":null}]}

data: {"id":"chatcmpl-123","object":"chat.completion.chunk","created":1234567890,"model":"agent-123","choices":[{"index":0,"delta":{"content":" stands"},"finish_reason":null}]}

data: {"id":"chatcmpl-123","object":"chat.completion.chunk","created":1234567890,"model":"agent-123","choices":[{"index":0,"delta":{"content":" for"},"finish_reason":null}]}

data: {"id":"chatcmpl-123","object":"chat.completion.chunk","created":1234567890,"model":"agent-123","choices":[{"index":0,"delta":{"content":"...","citedUrls":["https://example.com"],"isRag":true},"finish_reason":"stop"}]}

data: [DONE]
```

### Non-Streaming Response (JSON)

When `stream: false` or omitted:

```json
{
  "id": "chatcmpl-123",
  "object": "chat.completion",
  "created": 1234567890,
  "model": "agent-123",
  "choices": [
    {
      "index": 0,
      "message": {
        "role": "assistant",
        "content": "RAG stands for Retrieval-Augmented Generation...",
        "citedUrls": ["https://example.com"],
        "isRag": true
      },
      "finish_reason": "stop"
    }
  ],
  "usage": {
    "prompt_tokens": 0,
    "completion_tokens": 0,
    "total_tokens": 0
  }
}
```

## Error Responses

Errors before streaming starts return JSON:

```json
{
  "error": {
    "message": "Invalid request",
    "type": "invalid_request_error",
    "code": "invalid_request"
  }
}
```

### Error Status Codes

- `400` - Invalid request (validation error)
- `401` - Unauthorized (missing or invalid Bearer token)
- `403` - Forbidden (invalid API key)
- `500` - Internal server error

## Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `TEST_API_KEY` | Bearer token for Lambda authentication | Yes |
| `OPENAI_API_KEY` | OpenAI API key for LLM | Yes |
| `QDRANT_URL` | Qdrant vector database URL | Yes |
| `QDRANT_API_KEY` | Qdrant API key | Yes |
| `AGENTS_TABLE_NAME` | DynamoDB agents table | Yes |
| `KNOWLEDGE_SPACES_TABLE_NAME` | DynamoDB knowledge spaces table | Yes |
| `CONVERSATIONS_TABLE_NAME` | DynamoDB conversations table | Yes |

## Examples

### cURL - Streaming

```bash
curl -X POST https://api.example.com/v1/chat/completions \
  -H "Authorization: Bearer ${TEST_API_KEY}" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "agent-123",
    "messages": [{"role": "user", "content": "Hello"}],
    "stream": true
  }'
```

### cURL - Non-Streaming

```bash
curl -X POST https://api.example.com/v1/chat/completions \
  -H "Authorization: Bearer ${TEST_API_KEY}" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "agent-123",
    "messages": [{"role": "user", "content": "Hello"}],
    "stream": false
  }'
```

### JavaScript/TypeScript

```typescript
const response = await fetch('https://api.example.com/v1/chat/completions', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${process.env.TEST_API_KEY}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    model: 'agent-123',
    messages: [{ role: 'user', content: 'Hello' }],
    stream: true,
  }),
});

const reader = response.body.getReader();
const decoder = new TextDecoder();

while (true) {
  const { done, value } = await reader.read();
  if (done) break;
  
  const chunk = decoder.decode(value);
  const lines = chunk.split('\n');
  
  for (const line of lines) {
    if (line.startsWith('data: ')) {
      const data = line.slice(6);
      if (data === '[DONE]') {
        console.log('Stream complete');
        break;
      }
      const json = JSON.parse(data);
      console.log(json.choices[0].delta.content);
    }
  }
}
```

## CORS

All endpoints support CORS with the following headers:
- `Access-Control-Allow-Origin: *`
- `Access-Control-Allow-Headers: *`
- `Access-Control-Allow-Methods: *`

## Rate Limiting

Rate limiting is managed through API Gateway usage plans. Contact your administrator for current limits.
