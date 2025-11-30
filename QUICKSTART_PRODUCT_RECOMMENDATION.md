# Quick Start: Product Recommendation Feature

## Prerequisites

- Node.js 20+
- AWS Account with credentials configured
- OpenAI API key
- Qdrant instance (cloud or local)

## 1. Setup Backend

```bash
cd apps/rag-chat-stream-backend

# Install dependencies
npm install

# Create .env file
cat > .env << EOF
RAG_STREAM_API_KEY=your-secure-api-key-min-20-chars
OPENAI_API_KEY=sk-...
QDRANT_URL=https://your-qdrant-instance.com
QDRANT_API_KEY=your-qdrant-key
EOF

# Build
npm run build

# Prepare Lambda package
bash scripts/prepare-lambda.sh

# Deploy to AWS
set -a && source .env && set +a
npx cdk deploy --require-approval never
```

After deployment, note the `ApiUrl` output.

## 2. Setup Frontend

```bash
cd apps/rag-chat-frontend

# Install dependencies
npm install

# Create .env.local file
cat > .env.local << EOF
NEXT_PUBLIC_API_BASE_URL=https://xxx.execute-api.us-east-1.amazonaws.com/prod
NEXT_PUBLIC_JWT_TOKEN=your-secure-api-key-min-20-chars
EOF

# Build
npm run build

# Run locally
npm run dev
```

Open http://localhost:3000

## 3. Create Product Catalog

### Option A: Via UI

1. Navigate to "Knowledge" → "Create Knowledge Space"
2. Select "File Upload" tab
3. Upload a markdown file with products
4. Wait for processing

### Option B: Via API

```bash
# Create products.md file
cat > products.md << 'EOF'
--- item start ---
id: laptop-001
name: Dell XPS 13
category: Laptops
price: 1299.99
currency: USD
availability: in_stock
tags: [laptop, ultrabook, business]
brand: Dell
imageUrl: https://example.com/dell-xps-13.jpg
productUrl: https://example.com/products/dell-xps-13
### description
Premium ultrabook with 13.4" InfinityEdge display, 
Intel Core i7, 16GB RAM, 512GB SSD. 
Perfect for professionals on the go.
--- item end ---

--- item start ---
id: laptop-002
name: MacBook Air M2
category: Laptops
price: 1199.99
currency: USD
availability: in_stock
tags: [laptop, apple, lightweight]
brand: Apple
### description
Thin and light laptop with Apple M2 chip, 
13.6" Liquid Retina display, 8GB RAM, 256GB SSD.
All-day battery life.
--- item end ---
EOF

# Upload
curl -X POST "${API_URL}/v1/knowledge/create" \
  -H "Authorization: Bearer ${RAG_STREAM_API_KEY}" \
  -F "name=Laptop Catalog" \
  -F "file=@products.md"
```

Response:
```json
{
  "knowledgeSpaceId": "ks-xxx",
  "name": "Laptop Catalog",
  "type": "product",
  "status": "completed",
  "documentCount": 2,
  "summary": {
    "successCount": 2,
    "failureCount": 0,
    "errors": []
  }
}
```

## 4. Create Product Recommendation Agent

### Option A: Via UI

1. Navigate to "Agents" → "Create Agent"
2. Create Knowledge Space (or use existing)
3. In Agent Configuration:
   - Select "Product Recommendation" preset
   - Enter agent name
   - Description auto-fills
   - strictRAG auto-enables
4. Click "Create Agent"

### Option B: Via API

```bash
curl -X POST "${API_URL}/v1/agent/create" \
  -H "Authorization: Bearer ${RAG_STREAM_API_KEY}" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Laptop Assistant",
    "knowledgeSpaceIds": ["ks-xxx"],
    "description": "AI assistant specialized in laptop recommendations",
    "strictRAG": true,
    "preset": "product_recommendation"
  }'
```

## 5. Chat with Agent

### Via UI

1. Navigate to "Agents" → Select your agent
2. Type: "I need a laptop under $1300 for business use"
3. Agent responds with recommendations and product cards

### Via API (Streaming)

```bash
curl -N -X POST "${API_URL}/v1/chat/completions" \
  -H "Authorization: Bearer ${RAG_STREAM_API_KEY}" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "agent-xxx",
    "messages": [
      {"role": "user", "content": "I need a laptop under $1300 for business use"}
    ],
    "stream": true
  }'
```

Response (SSE stream):
```
data: {"choices":[{"delta":{"content":"Based on your budget..."}}]}

data: {"choices":[{"delta":{"content":"\n\n```json\n{\"products\":[...]}\n```"}}]}

data: [DONE]
```

## 6. View Products in UI

The chat interface automatically:
1. Extracts JSON blocks from responses
2. Parses product data
3. Renders ProductCard components
4. Displays in grid layout (2+ products) or full width (1 product)

Each ProductCard shows:
- Product name and image
- Price with currency
- Description
- Category and brand
- Availability status
- "View Product" link
- Source citation

## Product Markdown Format

```markdown
--- item start ---
id: unique-id (optional, auto-generated if missing)
name: Product Name (required)
category: Category Name
price: 99.99
currency: USD
availability: in_stock | out_of_stock | preorder
tags: [tag1, tag2, tag3]
brand: Brand Name
imageUrl: https://example.com/image.jpg
productUrl: https://example.com/product
### description
Multi-line product description.
Can include multiple paragraphs.
(required)
--- item end ---
```

### Required Fields
- `name`: Product name (max 200 chars)
- `description`: Product description (max 2000 chars)

### Optional Fields
- `id`: Auto-generated UUID if missing
- `category`, `price`, `currency`, `availability`
- `tags`, `brand`, `imageUrl`, `productUrl`

## Troubleshooting

### Upload fails with "Invalid file type"
- Ensure file extension is `.md` or `.markdown`
- Check file size is under 10MB

### Products not appearing in chat
- Verify Knowledge Space status is "completed"
- Check agent is linked to correct Knowledge Space
- Ensure agent has preset="product_recommendation"

### Authentication errors
- Verify `RAG_STREAM_API_KEY` matches in backend and frontend
- Check JWT token is set in frontend `.env.local`
- Ensure API key is at least 20 characters

### Build errors
```bash
# Backend
cd apps/rag-chat-stream-backend
rm -rf dist lambda-dist node_modules
npm install
npm run build

# Frontend
cd apps/rag-chat-frontend
rm -rf .next node_modules
npm install
npm run build
```

## Testing

### Integration Test
```bash
cd apps/rag-chat-stream-backend
export API_URL="https://xxx.execute-api.us-east-1.amazonaws.com/prod"
export RAG_STREAM_API_KEY="your-key"
./scripts/test-product-upload.sh
```

### Manual Test Checklist
- [ ] Upload product catalog (UI)
- [ ] Upload product catalog (API)
- [ ] View Knowledge Space list with type badge
- [ ] Create agent with preset (UI)
- [ ] Create agent with preset (API)
- [ ] Chat with agent
- [ ] View product cards in chat
- [ ] Click "View Product" link
- [ ] Filter Knowledge Spaces by type
- [ ] View error details for partial uploads

## Next Steps

1. Add more products to catalog
2. Create multiple agents for different product categories
3. Test with real product data
4. Customize system prompts
5. Add product images
6. Monitor CloudWatch logs and metrics

## Support

- Backend logs: CloudWatch Logs → `/aws/lambda/KnowledgeCreateFunction`
- Frontend logs: Browser console
- API errors: Check response body for details
- Integration test: `./scripts/test-product-upload.sh`
