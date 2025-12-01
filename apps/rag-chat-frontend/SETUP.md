# Setup Guide - RAG Chat Frontend

## Initial Setup

### 1. Install Dependencies

```bash
cd apps/rag-chat-frontend
npm install
```

### 2. Configure Environment

Copy `.env.example` to `.env.local`:

```bash
cp .env.example .env.local
```

Edit `.env.local` and set:

```bash
NEXT_PUBLIC_API_BASE_URL=https://your-backend-api-url.execute-api.us-east-1.amazonaws.com/prod
NEXT_PUBLIC_JWT_TOKEN=your-api-key-here
```

**Note**: The API key should match `RAG_STREAM_API_KEY` configured in `rag-chat-stream-backend`.

### 3. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

## Backend Integration

This frontend connects to `rag-chat-stream-backend`. Ensure the backend is deployed and accessible.

### Required Backend Endpoints

- `POST /v1/chat/completions` - Streaming chat (SSE)
- `POST /v1/knowledge/create` - Create knowledge space
- `GET /v1/knowledge/list` - List knowledge spaces
- `POST /v1/agent/create` - Create agent

### Backend Setup

```bash
cd apps/rag-chat-stream-backend
set -a && source .env && set +a
npm run cdk:deploy
```

Get the API URL from CDK output and use it in frontend `.env.local`.

## Development Workflow

### Running Tests

```bash
npm test              # Run all tests
npm run test:watch    # Watch mode
npm run test:coverage # Coverage report
```

### Type Checking

```bash
npm run type-check
```

### Linting

```bash
npm run lint
```

### Build

```bash
npm run build
npm run start
```

## Implementation Phases

### Phase 4: Product Upload UI (Current)
- [ ] Create ProductUploadForm component
- [ ] Implement file validation
- [ ] Implement upload logic
- [ ] Display upload results

### Phase 5: Agent Creation
- [ ] Add preset dropdown to CreateAgentForm
- [ ] Implement preset auto-population
- [ ] Add Knowledge Space filtering

### Phase 6: Product Display
- [ ] Create ProductCard component
- [ ] Implement product extraction from messages
- [ ] Add grid layout for multiple products

### Phase 7: Streaming Integration
- [ ] Verify streaming works with product data
- [ ] Add stop button
- [ ] Handle streaming errors

## Troubleshooting

### CORS Issues

If you see CORS errors, ensure the backend API Gateway has CORS configured:

```typescript
// In backend CDK stack
api.addCorsPreflight({
  allowOrigins: ['http://localhost:3000', 'https://your-frontend-domain.com'],
  allowMethods: ['GET', 'POST', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization'],
});
```

### Authentication Errors

If you get 401/403 errors:
1. Verify `NEXT_PUBLIC_JWT_TOKEN` matches backend `RAG_STREAM_API_KEY`
2. Check backend CloudWatch logs for authentication errors
3. Ensure Bearer token is included in requests

### Build Errors

If build fails:
1. Clear Next.js cache: `rm -rf .next`
2. Reinstall dependencies: `rm -rf node_modules package-lock.json && npm install`
3. Check TypeScript errors: `npm run type-check`

## Next Steps

1. Implement ProductUploadForm component
2. Test file upload with backend
3. Implement ProductCard component
4. Test end-to-end product recommendation flow
