# RAG Chat Frontend - Product Recommendation

Next.js web application for RAG chat with product recommendation capabilities.

## ✅ Implementation Complete

All major features have been implemented and are ready to use!

See [IMPLEMENTATION_STATUS.md](./IMPLEMENTATION_STATUS.md) for detailed implementation report.

## Features

- **Product Upload**: Upload Markdown files with product data (max 10MB)
- **Product Recommendation Agent**: AI agent specialized in product recommendations with preset configuration
- **Streaming Chat**: Real-time streaming responses with SSE
- **Product Cards**: Display recommended products in card format with images, prices, and details
- **Knowledge Space Management**: Create and manage product knowledge spaces with type filtering
- **Agent Management**: Create agents with product recommendation presets
- **Stop Button**: Ability to stop streaming responses mid-generation

## Tech Stack

- Next.js 16.x (App Router)
- React 19.x
- TypeScript 5.x
- Tailwind CSS 4.x
- Jest + React Testing Library

## Getting Started

### Prerequisites

- Node.js 18.x or later
- Access to RAG Chat Stream Backend API
- Valid API key for authentication

### Installation

```bash
cd apps/rag-chat-frontend
npm install
```

### Environment Setup

Copy `.env.example` to `.env.local` and configure:

```bash
cp .env.example .env.local
```

Required variables:
- `NEXT_PUBLIC_API_BASE_URL`: Backend API URL
- `NEXT_PUBLIC_JWT_TOKEN`: API authentication token (must match backend `RAG_STREAM_API_KEY`)

### Development

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

### Testing

```bash
npm test              # Run tests
npm run test:watch    # Watch mode
npm run test:coverage # Coverage report
```

### Build

```bash
npm run build         # Production build
npm run start         # Start production server
```

## Usage

### 1. Upload Product Data

1. Navigate to http://localhost:3000/knowledge/create
2. Click "File Upload" tab
3. Drag & drop or select a Markdown file
4. Click "Upload"
5. View upload results (success/partial/error)

### 2. Create Product Recommendation Agent

1. Navigate to http://localhost:3000/agents/create
2. Create a Knowledge Space (URL or File)
3. Select Preset: "Product Recommendation"
4. Enter agent name
5. Click "Create Agent"

### 3. Chat and Get Product Recommendations

1. Navigate to the created agent's page
2. Ask product-related questions
3. View streaming responses
4. See product cards displayed in grid layout
5. Click "Stop" to interrupt streaming if needed

## Product Data Format

Markdown format with delimiters:

```markdown
--- item start ---
id: prod-001
name: Product Name
category: Electronics
price: 99.99
currency: USD
availability: in_stock
tags: [tag1, tag2]
imageUrl: https://example.com/image.jpg
productUrl: https://example.com/product
brand: Brand Name
### description
Multi-line product description.
Can include multiple paragraphs.
--- item end ---
```

## Project Structure

```
apps/rag-chat-frontend/
├── app/                          # Next.js App Router
│   ├── agents/                   # Agent pages
│   │   ├── [agentId]/           # Chat interface
│   │   └── create/              # Agent creation
│   ├── knowledge/               # Knowledge space pages
│   │   └── create/              # Knowledge creation (with file upload)
│   ├── embed/                   # Embeddable widget
│   └── page.tsx                 # Home page
├── components/                   # React components
│   ├── ChatWidget.tsx           # Main chat component (with streaming)
│   ├── ProductCard.tsx          # Product display card ✨
│   ├── ProductUploadForm.tsx    # Product file upload ✨
│   ├── CreateAgentForm.tsx      # Agent creation with presets ✨
│   ├── KnowledgeSpaceList.tsx   # Knowledge space list (extended) ✨
│   ├── MessageList.tsx          # Message display (with product extraction) ✨
│   └── ...
├── lib/                         # Library code
│   ├── api/                     # API client (with streaming) ✨
│   ├── context/                 # React contexts (with streaming) ✨
│   └── utils/                   # Utilities
├── types/                       # TypeScript types (extended) ✨
└── __tests__/                   # Tests
```

✨ = New or significantly extended

## API Integration

Connects to `rag-chat-stream-backend`:

- `POST /v1/chat/completions` - Streaming chat (SSE)
- `POST /v1/knowledge/create` - Create knowledge space (multipart)
- `GET /v1/knowledge/list` - List knowledge spaces
- `POST /v1/agent/create` - Create agent

Authentication: `Authorization: Bearer ${NEXT_PUBLIC_JWT_TOKEN}`

## Features in Detail

### Product Upload
- Drag & drop or file selection
- Client-side validation (extension, size)
- Upload progress indication
- Detailed error reporting
- Partial success handling

### Product Display
- Responsive product cards
- Image with placeholder fallback
- Price formatting with currency
- Availability status badges
- Tags display
- Product URL links
- Citation sources

### Streaming Chat
- Real-time token-by-token display
- Stop button to interrupt generation
- Automatic product extraction from responses
- Grid layout for multiple products
- Error handling and retry

### Knowledge Space Management
- Type badges (web/product/document/custom)
- Status indicators (processing/completed/partial/error)
- Document count display
- Type filtering
- Error details expansion

## Troubleshooting

### CORS Issues
Ensure backend API Gateway has CORS configured for your frontend domain.

### Authentication Errors
- Verify `NEXT_PUBLIC_JWT_TOKEN` matches backend `RAG_STREAM_API_KEY`
- Check CloudWatch logs for authentication errors

### Build Errors
```bash
rm -rf .next
rm -rf node_modules package-lock.json
npm install
npm run type-check
```

### Streaming Not Working
- Verify backend supports SSE streaming
- Check network tab for proper SSE responses
- Ensure `stream: true` is sent in request

## Related Projects

- [rag-chat-stream-backend](../rag-chat-stream-backend) - Backend API
- [rag-chat-sync-frontend](../rag-chat-sync-frontend) - Original frontend (base)

## Documentation

- [IMPLEMENTATION_STATUS.md](./IMPLEMENTATION_STATUS.md) - Detailed implementation report
- [SETUP.md](./SETUP.md) - Setup instructions
- [Spec: requirements.md](../../.kiro/specs/apps--rag-chat-frontend-product-recommend/requirements.md)
- [Spec: design.md](../../.kiro/specs/apps--rag-chat-frontend-product-recommend/design.md)
- [Spec: tasks.md](../../.kiro/specs/apps--rag-chat-frontend-product-recommend/tasks.md)

## Coding Guidelines

- Use function components
- TypeScript type definitions required
- Comments in Japanese or English
- File naming: PascalCase (components), kebab-case (utilities)
- Minimal code implementation (avoid verbosity)

