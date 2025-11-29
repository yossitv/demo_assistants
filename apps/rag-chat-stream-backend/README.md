# RAG Chat Stream Backend

OpenAI-compatible RAG chat API with streaming support.

## Features

- ✅ **Streaming & Non-Streaming** - SSE streaming or JSON responses
- ✅ **OpenAI Compatible** - Drop-in replacement for OpenAI Chat Completions API
- ✅ **RAG Support** - Knowledge base integration with Qdrant vector search
- ✅ **Bearer Token Auth** - Tauvs integration with Bearer token authentication
- ✅ **API Key Auth** - Custom API key authentication
- ✅ **CloudWatch Monitoring** - Comprehensive metrics and alarms
- ✅ **Clean Architecture** - Domain-driven design with dependency injection

## Quick Start

### Prerequisites

- Node.js 20+
- AWS CLI configured
- OpenAI API key
- Qdrant instance

### Installation

```bash
npm install
```

### Environment Variables

Create `.env` file:

```bash
# Required
TEST_API_KEY=your-api-key-min-20-chars
OPENAI_API_KEY=sk-...
QDRANT_URL=https://your-qdrant-instance
QDRANT_API_KEY=your-qdrant-key

# Optional
COGNITO_USER_POOL_ID=CREATE_NEW
LOG_LEVEL=INFO
```

### Build

```bash
npm run build
```

### Test

```bash
npm test
```

### Deploy

```bash
set -a && source .env && set +a
npx cdk deploy
```

## API Documentation

See [docs/STREAMING_API.md](docs/STREAMING_API.md) for detailed API documentation.

### Quick Example

```bash
curl -X POST https://your-api-url/v1/chat/completions \
  -H "Authorization: Bearer ${TAUVS_API_KEY}" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "agent-123",
    "messages": [{"role": "user", "content": "Hello"}],
    "stream": true
  }'
```

## Architecture

```
src/
├── domain/           # Entities, repositories, services (interfaces)
├── use-cases/        # Business logic
├── adapters/         # Controllers (HTTP handlers)
├── infrastructure/   # External services (DynamoDB, Qdrant, OpenAI)
├── handlers/         # Lambda entry points
└── shared/           # Utilities, types, validation
```

## Key Components

### Streaming

- **StreamingChatController** - Handles streaming/non-streaming requests
- **SSEChunkGenerator** - UTF-8 safe chunk generation
- **bearerAuth** - Bearer token authentication for Tauvs

### Infrastructure

- **Lambda Functions** - Node.js 20.x, 180s timeout for streaming
- **API Gateway** - REST API with STREAM mode integration
- **DynamoDB** - Agents, knowledge spaces, conversations
- **Qdrant** - Vector search for RAG
- **CloudWatch** - Metrics and alarms

## Monitoring

### Metrics

- `StreamingRequests` - Count of streaming requests
- `UseCaseDuration` - Time spent in use case logic
- `ChunkSendingDuration` - Time spent sending SSE chunks
- `ErrorsByType` - Errors by status code (401/403/400/500)

### Alarms

- Lambda error rate > 5%
- Lambda p99 latency > 30s (streaming) / 5s (others)
- API Gateway 5xx error rate > 1%
- DynamoDB throttling

## Testing

```bash
# All tests
npm test

# Unit tests only
npm test -- --testPathIgnorePatterns=integration

# Property-based tests
npm test -- --testPathPattern=property

# Watch mode
npm test -- --watch
```

## Environment Variables Reference

| Variable | Description | Required | Default |
|----------|-------------|----------|---------|
| `TEST_API_KEY` | API key for Bearer token authentication (min 20 chars) | Yes | - |
| `OPENAI_API_KEY` | OpenAI API key | Yes | - |
| `QDRANT_URL` | Qdrant endpoint URL | Yes | - |
| `QDRANT_API_KEY` | Qdrant API key | Yes | - |
| `COGNITO_USER_POOL_ID` | Existing Cognito pool or CREATE_NEW | No | CREATE_NEW |
| `LOG_LEVEL` | Logging level | No | INFO |
| `EMBEDDING_MODEL` | OpenAI embedding model | No | text-embedding-3-small |
| `LLM_MODEL` | OpenAI LLM model | No | gpt-4o |
| `SIMILARITY_THRESHOLD` | Vector search threshold | No | 0.35 |
| `TOP_K` | Number of search results | No | 8 |
| `MAX_CITED_URLS` | Max URLs in response | No | 3 |

## Development

### Project Structure

- `src/` - TypeScript source code
- `infrastructure/` - CDK infrastructure code
- `docs/` - API documentation
- `scripts/` - Build and deployment scripts
- `dist/` - Compiled JavaScript (gitignored)
- `lambda-dist/` - Lambda deployment package (gitignored)

### Scripts

```bash
npm run build          # Compile TypeScript
npm run test           # Run tests
npm run cdk:synth      # Synthesize CDK stack
npm run cdk:deploy     # Deploy to AWS
npm run cdk:destroy    # Destroy stack
```

## Troubleshooting

### Tests Failing

```bash
# Clear Jest cache
npm test -- --clearCache

# Run with verbose output
npm test -- --verbose
```

### Deployment Issues

```bash
# Check environment variables
set -a && source .env && set +a
env | grep -E "OPENAI|QDRANT|TEST_API"

# Synthesize to check for errors
npm run cdk:synth
```

### Streaming Not Working

- Check Lambda timeout (should be 180s)
- Verify API Gateway integration mode is STREAM
- Check TAUVS_API_KEY environment variable
- Review CloudWatch logs

## License

MIT

## Related Projects

- [rag-chat-sync-backend](../rag-chat-sync-backend) - Non-streaming version
- [rag-chat-sync-frontend](../rag-chat-sync-frontend) - Web UI

## Support

For issues and questions, see [.kiro/specs/apps--rag-chat-stream-backend/](../../.kiro/specs/apps--rag-chat-stream-backend/)
