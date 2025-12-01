# Design Document: Product Recommendation Feature

## Overview

This feature extends the existing RAG chat system to support product recommendation capabilities. The system enables users to upload product information in Markdown format, automatically parse and embed this data into the knowledge base, and provide AI-powered product recommendations through conversational chat with streaming responses.

The design leverages the existing `apps/rag-chat-stream-backend` and `apps/rag-chat-sync-frontend` infrastructure, adding new components for product data handling, specialized UI for product display, and agent presets optimized for recommendations.

### Key Design Goals

1. **Minimal Backend Changes**: Reuse existing embedding, storage, and streaming infrastructure
2. **Type Safety**: Standardized product schema with versioning support
3. **Graceful Degradation**: Partial success handling for batch uploads
4. **Real-time Feedback**: Streaming responses for immediate user engagement
5. **Extensibility**: Schema versioning to support future product data evolution

## Architecture

### System Context

```
┌─────────────────────────────────────────────────────────────┐
│                    Frontend (Next.js)                        │
│  ┌──────────────────┐  ┌──────────────────┐                │
│  │ Product Upload   │  │ Chat Interface   │                │
│  │ Component        │  │ with Product     │                │
│  │                  │  │ Card Display     │                │
│  └────────┬─────────┘  └────────┬─────────┘                │
│           │                     │                            │
└───────────┼─────────────────────┼────────────────────────────┘
            │                     │
            │ POST /v1/knowledge/ │ POST /v1/chat/completions
            │ create (multipart)  │ (SSE stream)
            │                     │
┌───────────▼─────────────────────▼────────────────────────────┐
│              Backend (Lambda + API Gateway)                   │
│  ┌──────────────────┐  ┌──────────────────┐                │
│  │ Product Parser   │  │ Streaming Chat   │                │
│  │ Service          │  │ Controller       │                │
│  └────────┬─────────┘  └────────┬─────────┘                │
│           │                     │                            │
│  ┌────────▼─────────┐  ┌────────▼─────────┐                │
│  │ Embedding        │  │ RAG Use Case     │                │
│  │ Service          │  │                  │                │
│  └────────┬─────────┘  └────────┬─────────┘                │
└───────────┼─────────────────────┼────────────────────────────┘
            │                     │
            ▼                     ▼
   ┌──────────────┐        ┌──────────────┐
   │   Qdrant     │        │  DynamoDB    │
   │  (Vectors)   │        │  (Metadata)  │
   └──────────────┘        └──────────────┘
```

### Component Interaction Flow

**Upload Flow:**
1. User selects Markdown file in frontend
2. Frontend validates file (size, extension)
3. Frontend sends multipart/form-data to `/v1/knowledge/create`
4. Backend parses Markdown using delimiter-based parsing
5. Backend generates embeddings for each product
6. Backend stores vectors in Qdrant with namespace `tenantId#knowledgeSpaceId`
7. Backend stores metadata in DynamoDB with type='product'
8. Backend returns summary (success count, failure count, errors)

**Chat Flow:**
1. User sends message to recommendation agent
2. Frontend calls `/v1/chat/completions` with `stream: true`
3. Backend retrieves agent configuration (strictRAG=true, linked KS)
4. Backend performs vector search in product Knowledge Space
5. Backend streams LLM response via SSE
6. Frontend parses SSE chunks and extracts product data
7. Frontend renders product cards alongside chat messages

## Components and Interfaces

### Backend Components

#### 1. Product Parser Service

**Location**: `apps/rag-chat-stream-backend/src/infrastructure/services/ProductParserService.ts`

**Responsibilities**:
- Parse Markdown files with `--- item start ---` / `--- item end ---` delimiters
- Extract key-value pairs from product blocks
- Validate required fields (name, description)
- Generate unique IDs for products without explicit IDs
- Return structured product data with error details

**Interface**:
```typescript
interface IProductParserService {
  parseMarkdown(content: string): ParseResult;
}

interface ParseResult {
  products: Product[];
  errors: ParseError[];
  summary: {
    totalItems: number;
    successCount: number;
    failureCount: number;
  };
}

interface ParseError {
  itemIndex: number;
  field?: string;
  reason: string;
}
```


**Parsing Logic**:
- Split content by `--- item start ---` and `--- item end ---`
- For each block:
  - Extract single-line fields matching `key: value` pattern
  - For `description` field: Support both formats with priority rule
    - **Priority**: If `### description` block exists, use that content (multi-line)
    - **Fallback**: If no block, use `description: value` line (single-line)
    - Block format: Capture all lines after `### description` until next `###` or `---` marker
  - Handle special formats: `tags: [a, b, c]` → string array
- Truncate name (200 chars) and description (2000 chars)
- Skip items missing required fields, record error
- Generate UUID for items without `id` field

#### 2. Knowledge Space Controller Extension

**Location**: `apps/rag-chat-stream-backend/src/adapters/controllers/KnowledgeCreateController.ts`

**API Design Decision**:
We will extend the existing `/v1/knowledge/create` endpoint to support multipart/form-data for file uploads, maintaining API compatibility while adding new functionality. This approach minimizes code changes and keeps the API surface consistent.

**Changes**:
- Accept `multipart/form-data` in addition to JSON
- Add `sourceType` field to request validation (enum: 'url' | 'file')
- For file uploads, read file content and pass to ProductParserService
- Store `type: 'product'` in Knowledge Space metadata
- Return detailed summary including parse errors

**Request Schema**:
```typescript
interface CreateKnowledgeSpaceRequest {
  name: string;
  sourceType: 'url' | 'file';
  url?: string;           // for sourceType='url'
  file?: File;            // for sourceType='file'
  tenantId: string;
}
```

**Response Schema**:
```typescript
interface CreateKnowledgeSpaceResponse {
  knowledgeSpaceId: string;
  name: string;
  type: 'web' | 'product' | 'document';
  status: 'processing' | 'completed' | 'partial' | 'error';
  documentCount: number;
  summary?: {
    successCount: number;
    failureCount: number;
    errors: ParseError[];
  };
}
```

#### 3. Agent Preset Configuration

**Location**: `apps/rag-chat-stream-backend/src/domain/entities/Agent.ts`

**New Preset**: `PRODUCT_RECOMMENDATION`

**Configuration**:
```typescript
const PRODUCT_RECOMMENDATION_PRESET = {
  name: 'Product Recommendation Agent',
  description: 'AI assistant specialized in product recommendations',
  strictRAG: true,
  systemPrompt: `You are a helpful product recommendation assistant.

When a user asks for product recommendations:
1. Ask clarifying questions about their needs, preferences, and budget
2. Search the product knowledge base for relevant items
3. Provide 2-4 specific product recommendations
4. For each product, explain why it matches their needs
5. Include key details: name, price, features, availability

Always base recommendations on the product knowledge base. If no suitable products are found, explain this clearly and ask if they'd like to adjust their criteria.`,
};
```


### Frontend Components

#### 1. Product Upload Component

**Location**: `apps/rag-chat-sync-frontend/components/ProductUploadForm.tsx`

**Responsibilities**:
- File selection via input or drag-and-drop
- Client-side validation (extension, size ≤ 10MB)
- Display selected file details
- Upload progress indication
- Display upload results (success/partial/error)

**State Management**:
```typescript
interface UploadState {
  selectedFile: File | null;
  isUploading: boolean;
  uploadResult: UploadResult | null;
  error: string | null;
}

interface UploadResult {
  knowledgeSpaceId: string;
  status: 'completed' | 'partial' | 'error';
  successCount: number;
  failureCount: number;
  errors: ParseError[];
}
```

**UI Flow**:
1. Tab selection: "URL" | "File Upload"
2. File selection area (drag-drop or click)
3. File validation feedback
4. Upload button (disabled until valid file selected)
5. Progress indicator during upload
6. Results display with error details
7. Redirect to Knowledge Space list on success

#### 2. Product Card Component

**Location**: `apps/rag-chat-sync-frontend/components/ProductCard.tsx`

**Responsibilities**:
- Display product information in card format
- Handle missing fields gracefully (placeholders)
- Show cited URLs if available
- Responsive layout (grid on desktop, stack on mobile)

**Props**:
```typescript
interface ProductCardProps {
  product: {
    id: string;
    name: string;
    description: string;
    price?: number;
    currency?: string;
    category?: string;
    imageUrl?: string;
    productUrl?: string;
    brand?: string;
    availability?: string;
    tags?: string[];
  };
  citedUrls?: string[];
}
```

**Layout**:
- Image (if available) or placeholder icon
- Product name (bold, 18px)
- Price with currency
- Description (truncated to 3 lines with "Read more")
- Category and brand badges
- Availability status indicator
- "View Product" link (if productUrl available)
- Source citation (if citedUrls available)


#### 3. Chat Widget Extension

**Location**: `apps/rag-chat-sync-frontend/components/ChatWidget.tsx`

**Changes**:
- Detect product data in streaming responses
- Parse product JSON from assistant messages
- Render ProductCard components for detected products
- Maintain existing message display for non-product content

**LLM Response Format Contract**:

The recommendation agent should include product data in a structured JSON block at the end of its natural language response. This contract ensures consistent parsing between LLM output and frontend display.

**Expected Format**:
```
[Natural language explanation of recommendations]

```json
{
  "products": [
    {
      "id": "prod-001",
      "name": "Product Name",
      "description": "Product description",
      "price": 99.99,
      "currency": "USD",
      "category": "Electronics",
      "imageUrl": "https://...",
      "productUrl": "https://...",
      "brand": "Brand Name",
      "availability": "in_stock"
    }
  ]
}
```
```

**Product Detection Logic**:
```typescript
function extractProducts(message: string): Product[] {
  // Look for JSON blocks with product data
  // Pattern: ```json\n{...}\n```
  const jsonBlocks = message.match(/```json\n([\s\S]*?)\n```/g);
  
  return jsonBlocks
    ?.map(block => {
      try {
        const json = JSON.parse(block.replace(/```json\n|\n```/g, ''));
        return json.products || [json];
      } catch {
        return null;
      }
    })
    .flat()
    .filter(Boolean) || [];
}
```

**System Prompt Addition**:
The product recommendation agent's system prompt should include:
```
When recommending products, include a JSON block at the end of your response:

```json
{
  "products": [
    { "id": "...", "name": "...", "description": "...", "price": ..., ... }
  ]
}
```

This JSON should contain all relevant product details from the knowledge base.
```

#### 4. Knowledge Space List Extension

**Location**: `apps/rag-chat-sync-frontend/components/KnowledgeSpaceList.tsx`

**Changes**:
- Display `type` badge (web/product/document)
- Display `status` indicator (processing/completed/partial/error)
- Display document count
- Add filter by type
- Show error details for partial/error status

**UI Additions**:
```typescript
<div className="knowledge-space-card">
  <div className="header">
    <h3>{ks.name}</h3>
    <Badge type={ks.type} />
    <StatusIndicator status={ks.status} />
  </div>
  <div className="metadata">
    <span>{ks.documentCount} items</span>
    {ks.status === 'partial' && (
      <button onClick={() => showErrors(ks.id)}>
        View Errors ({ks.summary.failureCount})
      </button>
    )}
  </div>
</div>
```

#### 5. Agent Creation Form Extension

**Location**: `apps/rag-chat-sync-frontend/components/CreateAgentForm.tsx`

**Changes**:
- Add "Preset" dropdown with options: None, Product Recommendation
- When preset selected, auto-populate description and strictRAG
- Filter Knowledge Space selection to show only product-type KS when preset is selected
- Allow manual override of preset values

**Preset Selection Flow**:
1. User selects "Product Recommendation" preset
2. Form auto-fills:
   - Description: "AI assistant specialized in product recommendations"
   - StrictRAG: true (checked)
   - System prompt: (preset template)
3. Knowledge Space dropdown filters to type='product'
4. User can still manually edit all fields


## Data Models

### Product Schema (v1)

```typescript
interface Product {
  // Required fields
  id: string;                    // UUID or custom ID
  name: string;                  // Max 200 chars
  description: string;           // Max 2000 chars
  
  // Optional fields
  category?: string;             // e.g., "Electronics", "Clothing"
  price?: number;                // Numeric value
  currency?: string;             // ISO 4217 code (e.g., "USD", "JPY")
  availability?: string;         // e.g., "in_stock", "out_of_stock", "preorder"
  tags?: string[];               // Searchable keywords
  imageUrl?: string;             // Full URL to product image
  productUrl?: string;           // Full URL to product page
  brand?: string;                // Brand/manufacturer name
  updatedAt?: string;            // ISO 8601 timestamp
}
```

**Validation Rules**:
- `name`: Required, 1-200 characters
- `description`: Required, 1-2000 characters
- `id`: Auto-generated UUID if not provided
- `price`: If present, must be non-negative number
- `currency`: If present, must be 3-letter code
- `tags`: If present, array of strings (max 20 tags)
- URLs: If present, must be valid HTTP/HTTPS URLs

### Knowledge Space Metadata Extension

```typescript
interface KnowledgeSpace {
  id: string;
  tenantId: string;
  name: string;
  type: 'web' | 'product' | 'document';  // NEW
  status: 'processing' | 'completed' | 'partial' | 'error';  // NEW
  documentCount: number;
  createdAt: string;
  updatedAt: string;
  
  // Product-specific metadata
  metadata?: {
    sourceType?: 'url' | 'file';
    schemaVersion?: string;      // e.g., "v1"
    summary?: {
      successCount: number;
      failureCount: number;
      errors: ParseError[];
    };
  };
}
```

### Chunk Metadata for Products

```typescript
interface ProductChunkMetadata {
  chunkId: string;
  knowledgeSpaceId: string;
  productId: string;             // Reference to original product
  productName: string;           // For display in citations
  sourceUrl?: string;            // Product URL if available
  chunkType: 'product';          // Distinguish from web/document chunks
  schemaVersion: 'v1';
}
```

**Embedding Strategy**:
- One chunk per product
- Chunk text format: `${name}\n${description}\nCategory: ${category}\nPrice: ${price} ${currency}\nTags: ${tags.join(', ')}`
- This format optimizes for semantic search across all product attributes


### Markdown Format Specification

**Input Format**:

**Option A: Single-line description (simpler parsing)**
```markdown
--- item start ---
id: prod-001
name: Wireless Bluetooth Headphones
description: Premium over-ear headphones with active noise cancellation
category: Electronics
price: 199.99
currency: USD
availability: in_stock
tags: [audio, wireless, noise-cancelling]
imageUrl: https://example.com/images/headphones.jpg
productUrl: https://example.com/products/headphones
brand: AudioTech
--- item end ---
```

**Option B: Block-style description (recommended for real product data)**
```markdown
--- item start ---
id: prod-001
name: Wireless Bluetooth Headphones
category: Electronics
price: 199.99
currency: USD
availability: in_stock
tags: [audio, wireless, noise-cancelling]
imageUrl: https://example.com/images/headphones.jpg
productUrl: https://example.com/products/headphones
brand: AudioTech
### description
Premium over-ear headphones with active noise cancellation and 30-hour battery life.
Perfect for travel, work, or relaxation. Features include:
- Active noise cancellation
- 30-hour battery life
- Comfortable ear cushions
- Bluetooth 5.0 connectivity
--- item end ---
```

**Parsing Rules**:
1. Items are delimited by `--- item start ---` and `--- item end ---`
2. Single-line fields follow `key: value` format
3. Block fields (description) use `### fieldname` marker followed by multi-line content
4. **Description priority**: `### description` block takes precedence over `description:` line if both exist
5. Tags use array notation: `tags: [tag1, tag2, tag3]`
6. Whitespace around keys and values is trimmed
7. Empty lines are ignored
8. Lines without `:` separator (except block content) are ignored
9. If `id` is missing, generate UUID
10. If `name` or `description` is missing, skip item and record error

**Design Decision**: We recommend **Option B (block-style)** for v1 implementation as it better accommodates real-world product descriptions which are typically multi-paragraph. The parser supports both formats with block-style taking priority when present.

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system—essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property Testing Priority

Properties are categorized by implementation priority:

**Must Have (P0)**: Core functionality that must work correctly for the feature to be viable
- Parsing logic (Properties 5-9)
- Knowledge Space creation and metadata (Properties 10-14)
- Streaming completion handling (Property 21)
- Product card placeholder handling (Property 28)
- Partial failure handling (Properties 43-44)

**Should Have (P1)**: Important for production quality but can be implemented after core functionality
- File validation (Properties 1-4)
- Agent preset behavior (Properties 15-18)
- Streaming controls (Properties 19-20, 22-23)
- Product display (Properties 24-27)
- Schema validation (Properties 34-38)

**Nice to Have (P2)**: Quality-of-life improvements and edge case handling
- UI feedback details (Properties 39-42)
- Error recovery specifics (Properties 45-47)
- Knowledge Space management UI (Properties 29-33)

### File Upload and Validation Properties

Property 1: File validation rejects invalid files
*For any* file with extension other than `.md` or `.markdown`, or size exceeding 10MB, the validation function should return false and prevent upload
**Validates: Requirements 1.1**

Property 2: Valid file upload triggers API call
*For any* valid Markdown file (correct extension, size ≤ 10MB), uploading should result in a POST request to `/v1/knowledge/create` with multipart/form-data content type
**Validates: Requirements 1.2**

Property 3: Upload success displays summary
*For any* successful upload response, the UI should display the success count, failure count, and error details from the response
**Validates: Requirements 1.3**

Property 4: Upload failure preserves retry capability
*For any* failed upload (network error, server error), the UI should display an error message and keep the upload button enabled for retry
**Validates: Requirements 1.4**

### Product Parsing Properties

Property 5: Delimiter-based parsing finds all items
*For any* Markdown content with N pairs of `--- item start ---` and `--- item end ---` delimiters, the parser should identify exactly N product items
**Validates: Requirements 2.1**

Property 6: Key-value extraction completeness
*For any* product item block containing valid `key: value` lines, the parser should extract all key-value pairs into the product object
**Validates: Requirements 2.2**

Property 7: Missing required fields trigger skip and error
*For any* product item missing `name` or `description` fields, the parser should skip that item, not include it in the products array, and record an error with the item index
**Validates: Requirements 2.3**

Property 8: Missing ID generates unique identifier
*For any* product item without an `id` field, the parser should generate a unique UUID and assign it to the product's id field
**Validates: Requirements 2.4**

Property 9: Parse summary accuracy
*For any* parsing operation, the returned summary should have `successCount + failureCount = totalItems` and `errors.length = failureCount`
**Validates: Requirements 2.5**


### Knowledge Space and Embedding Properties

Property 10: Product Knowledge Space type assignment
*For any* successfully parsed product data, creating a Knowledge Space should result in a KS with `type: 'product'`
**Validates: Requirements 3.1**

Property 11: Knowledge Space metadata completeness
*For any* created product Knowledge Space, the metadata should include `sourceType`, `documentCount`, and `schemaVersion` fields
**Validates: Requirements 3.2**

Property 12: One chunk per product
*For any* set of N successfully parsed products, the embedding process should create exactly N chunks
**Validates: Requirements 3.3**

Property 13: Namespace format consistency
*For any* tenant ID and Knowledge Space ID, the Qdrant namespace should equal `${tenantId}#${knowledgeSpaceId}`
**Validates: Requirements 3.4**

Property 14: Partial failure status marking
*For any* embedding operation where at least one product succeeds and at least one fails, the Knowledge Space status should be set to 'partial' and failed items should be recorded in metadata
**Validates: Requirements 3.5**

### Agent Preset Properties

Property 15: Preset selection sets strictRAG
*For any* agent creation with "Product Recommendation Preset" selected, the agent's strictRAG field should be set to true
**Validates: Requirements 4.2**

Property 16: Preset populates description
*For any* agent creation with "Product Recommendation Preset" selected, the description field should contain recommendation-focused text
**Validates: Requirements 4.3**

Property 17: Preset applies system prompt template
*For any* agent creation with "Product Recommendation Preset" selected, the system prompt should contain instructions about asking clarifying questions and providing reasoning
**Validates: Requirements 4.4**

Property 18: Agent-Knowledge Space linking
*For any* agent creation with selected Knowledge Space IDs, the created agent should have those Knowledge Space IDs in its linked Knowledge Spaces array
**Validates: Requirements 4.5**

### Streaming Chat Properties

Property 19: Streaming API call includes stream flag
*For any* message sent to an agent, the API request to `/v1/chat/completions` should include `stream: true` in the request body
**Validates: Requirements 5.1**

Property 20: Incremental token display
*For any* SSE stream chunk containing a content delta, the UI should append that content to the displayed message immediately
**Validates: Requirements 5.2**

Property 21: Stream completion handling
*For any* SSE stream that sends `data: [DONE]`, the UI should mark the message as complete and stop processing further chunks
**Validates: Requirements 5.3**

Property 22: Stream abort on stop
*For any* active streaming request, clicking the stop button should call `abort()` on the AbortController and terminate the stream
**Validates: Requirements 5.4**

Property 23: Streaming error display with retry
*For any* streaming error (network failure, server error), the UI should display the error message and show a retry button
**Validates: Requirements 5.5**


### Product Display Properties

Property 24: Product data extraction from responses
*For any* agent response containing product information in JSON format, the extraction function should parse and return an array of product objects
**Validates: Requirements 6.1**

Property 25: Product card field completeness
*For any* product card rendered, the card should display name, price (or placeholder), description, image (or placeholder), and product URL (or disabled state)
**Validates: Requirements 6.2**

Property 26: Multiple products trigger grid layout
*For any* response containing 2 or more products, the UI should render them in a grid or horizontal layout (not stacked vertically)
**Validates: Requirements 6.3**

Property 27: Cited URLs display
*For any* product with non-empty citedUrls array, the product card should display source citation information
**Validates: Requirements 6.4**

Property 28: Missing field placeholder handling
*For any* product missing optional fields (price, imageUrl, productUrl), the card should display appropriate placeholders without breaking the layout
**Validates: Requirements 6.5**

### Knowledge Space Management Properties

Property 29: Type field display in list
*For any* Knowledge Space in the list view, the UI should display a badge or label showing its type (web/product/document)
**Validates: Requirements 7.1**

Property 30: Document count display for product KS
*For any* Knowledge Space with type='product', the list view should display the documentCount value
**Validates: Requirements 7.2**

Property 31: Status indicator display
*For any* Knowledge Space, the list view should display its current status (processing/completed/partial/error)
**Validates: Requirements 7.3**

Property 32: Error details access for partial status
*For any* Knowledge Space with status='partial', the UI should provide a button or link to view error details
**Validates: Requirements 7.4**

Property 33: Type-based filtering
*For any* selected type filter value, the Knowledge Space list should display only Knowledge Spaces matching that type
**Validates: Requirements 7.5**

### Schema and Validation Properties

Property 34: Product schema field presence
*For any* product stored in the system, it should have all standard schema fields: id, name, description, category, price, currency, availability, tags, imageUrl, productUrl, brand, updatedAt (with optional fields possibly null/undefined)
**Validates: Requirements 8.1**

Property 35: Schema version recording
*For any* created product Knowledge Space, the metadata should include a schemaVersion field with value "v1"
**Validates: Requirements 8.2**

Property 36: Name field length validation
*For any* product with name exceeding 200 characters, the parser should either truncate the name to 200 characters or reject the product with an error
**Validates: Requirements 8.3**

Property 37: Description field length validation
*For any* product with description exceeding 2000 characters, the parser should either truncate the description to 2000 characters or reject the product with an error
**Validates: Requirements 8.4**

Property 38: Tag array parsing
*For any* product item with tags in format `tags: [a, b, c]`, the parser should convert it to a string array `['a', 'b', 'c']`
**Validates: Requirements 8.5**


### UI Feedback and Error Handling Properties

Property 39: File selection display
*For any* selected file, the UI should display filename, size, and extension
**Validates: Requirements 9.2**

Property 40: Client-side validation before upload
*For any* file selection, validation should execute before any upload attempt is made
**Validates: Requirements 9.3**

Property 41: Loading indicator during upload
*For any* upload in progress, the UI should display a loading indicator
**Validates: Requirements 9.4**

Property 42: Success flow completion
*For any* successful upload, the UI should display a success message and navigate to the Knowledge Space list page
**Validates: Requirements 9.5**

Property 43: Partial failure continuation
*For any* batch of products where some are invalid, the parser should continue processing all items and return both successful and failed results
**Validates: Requirements 10.1**

Property 44: Partial status with error details
*For any* upload where at least one product fails, the response should have status='partial' and include an errors array with details
**Validates: Requirements 10.2**

Property 45: Network error form preservation
*For any* network error during upload, the UI should display the error and maintain the current form state (selected file, input values)
**Validates: Requirements 10.3**

Property 46: Authentication error messaging
*For any* 401 or 403 response, the UI should display a clear authentication error message
**Validates: Requirements 10.4**

Property 47: Timeout graceful handling
*For any* request timeout, the UI should display a timeout message and enable retry without losing form state
**Validates: Requirements 10.5**

## Error Handling

### Backend Error Handling

**Parse Errors**:
- Invalid delimiter structure → Return error with line numbers
- Missing required fields → Skip item, record in errors array
- Invalid field format (e.g., non-numeric price) → Skip item, record error
- File too large → Return 413 Payload Too Large
- Invalid file format → Return 400 Bad Request

**Embedding Errors**:
- OpenAI API failure → Retry with exponential backoff (3 attempts)
- Partial embedding failure → Mark KS as 'partial', record failed items
- Complete embedding failure → Mark KS as 'error', return error details

**Storage Errors**:
- DynamoDB write failure → Retry with exponential backoff
- Qdrant upsert failure → Retry, mark as partial if some succeed
- Transaction failure → Rollback, return error


### Frontend Error Handling

**Upload Errors**:
- Network failure → Display error, preserve form, enable retry
- 401/403 → Display authentication error, suggest re-login
- 413 → Display "File too large" message
- 400 → Display validation error details
- 500 → Display generic error, enable retry
- Timeout → Display timeout message, enable retry

**Streaming Errors**:
- Connection lost → Display error, show retry button
- Invalid SSE format → Log error, continue processing
- Abort by user → Clean up resources, mark as cancelled
- Backend error in stream → Display error message from stream

**Display Errors**:
- Invalid product JSON → Log warning, skip rendering that product
- Missing required fields → Show placeholder values
- Image load failure → Show placeholder image
- URL validation failure → Disable link, show text only

### Error Response Format

```typescript
interface ErrorResponse {
  error: {
    code: string;           // e.g., "PARSE_ERROR", "EMBEDDING_FAILED"
    message: string;        // Human-readable message
    details?: {
      field?: string;
      itemIndex?: number;
      reason?: string;
    }[];
  };
}
```

## Testing Strategy

### Unit Testing

**Backend Unit Tests**:
- ProductParserService: Test delimiter parsing, key-value extraction, validation
- KnowledgeCreateController: Test request validation, file handling, response formatting
- Agent preset configuration: Test preset values are correctly applied

**Frontend Unit Tests**:
- ProductUploadForm: Test file selection, validation, upload flow
- ProductCard: Test rendering with complete/incomplete data
- ChatWidget: Test product extraction from messages
- KnowledgeSpaceList: Test filtering, status display, error detail access

### Property-Based Testing

**Testing Framework**: fast-check (backend), @fast-check/jest (frontend)

**Backend Property Tests**:

Test 1: Parse result consistency
- Generate random Markdown with N items (0-100)
- Verify: successCount + failureCount = N
- Verify: products.length = successCount
- Verify: errors.length = failureCount

Test 2: ID generation uniqueness
- Generate random products without IDs
- Parse and verify all generated IDs are unique

Test 3: Field truncation
- Generate products with names/descriptions of random lengths (0-5000 chars)
- Verify: All stored names ≤ 200 chars
- Verify: All stored descriptions ≤ 2000 chars

Test 4: Namespace format
- Generate random tenantId and knowledgeSpaceId
- Verify: namespace matches `${tenantId}#${knowledgeSpaceId}`

Test 5: Tag parsing
- Generate random tag arrays in various formats
- Verify: Output is always a string array


**Frontend Property Tests**:

Test 6: File validation
- Generate random files with various extensions and sizes
- Verify: Only .md/.markdown files ≤ 10MB pass validation

Test 7: Product extraction
- Generate random chat messages with 0-10 embedded products
- Verify: Extraction returns correct number of products
- Verify: All extracted products have required fields

Test 8: Error preservation
- Generate random form states and error conditions
- Verify: Form state is preserved after errors

Test 9: Streaming chunk handling
- Generate random SSE streams with various chunk sizes
- Verify: All content is displayed
- Verify: [DONE] marker stops processing

Test 10: Filter consistency
- Generate random Knowledge Space lists with various types
- Apply type filter
- Verify: All returned items match filter type

### Integration Testing

**End-to-End Flows**:

1. **Complete Upload Flow**:
   - Upload valid product Markdown
   - Verify Knowledge Space created with type='product'
   - Verify products are searchable in Qdrant
   - Verify metadata is correct in DynamoDB

2. **Partial Failure Flow**:
   - Upload Markdown with mix of valid/invalid products
   - Verify status='partial'
   - Verify valid products are stored
   - Verify errors are recorded

3. **Recommendation Flow**:
   - Create agent with product preset
   - Link to product Knowledge Space
   - Send chat message
   - Verify streaming response
   - Verify product cards are displayed

4. **Error Recovery Flow**:
   - Simulate network error during upload
   - Verify error display
   - Verify form state preserved
   - Retry upload
   - Verify success

### Test Configuration

**Property Test Settings**:
- Minimum iterations: 100 per property
- Seed: Random (logged for reproducibility)
- Shrinking: Enabled for failure case minimization
- Timeout: 30 seconds per property

**Mock Services**:
- OpenAI API: Mock with configurable responses/errors
- Qdrant: In-memory mock for unit tests, real instance for integration
- DynamoDB: DynamoDB Local for integration tests
- File system: In-memory for unit tests

## Performance Considerations

### Backend Performance

**File Upload**:
- Max file size: 10MB (configurable)
- Streaming parse: Process file in chunks to avoid memory issues
- Parallel embedding: Batch products in groups of 10 for embedding
- Timeout: 60 seconds for upload + parse + embed

**Embedding Optimization**:
- Batch size: 10 products per OpenAI API call
- Retry strategy: Exponential backoff (1s, 2s, 4s)
- Rate limiting: Respect OpenAI rate limits
- Caching: Cache embeddings for identical product descriptions

**Database Operations**:
- DynamoDB: Batch write items (25 per batch)
- Qdrant: Batch upsert (100 vectors per batch)
- Connection pooling: Reuse connections across Lambda invocations


### Frontend Performance

**Upload UI**:
- File validation: Synchronous, < 10ms
- Progress indicator: Update every 100ms
- Debounce form inputs: 300ms
- Lazy load error details: Only fetch when user clicks

**Streaming Chat**:
- Chunk processing: < 5ms per chunk
- UI update batching: Update DOM every 50ms (not per chunk)
- Virtual scrolling: For long conversation histories
- Product card lazy loading: Load images on viewport intersection

**Rendering Optimization**:
- React.memo for ProductCard components
- useMemo for product extraction
- useCallback for event handlers
- Code splitting: Lazy load upload component

### Scalability Considerations

**Backend Scalability**:
- Lambda concurrency: Auto-scaling up to 1000 concurrent executions
- DynamoDB: On-demand capacity mode
- Qdrant: Horizontal scaling with collection sharding
- API Gateway: 10,000 requests/second limit

**Data Limits**:
- Max products per upload: 1,000 (configurable)
- Max Knowledge Spaces per tenant: 100
- Max agents per tenant: 50
- Max conversation history: 100 messages

## Security Considerations

### Authentication and Authorization

**API Authentication**:
- Bearer token authentication (existing)
- API key authentication (existing)
- Tenant isolation: All queries scoped to tenantId

**File Upload Security**:
- File type validation: Whitelist .md, .markdown only
- File size limit: 10MB hard limit
- Content scanning: Check for malicious content patterns
- Sanitization: Strip HTML/script tags from product data

### Data Privacy

**PII Handling**:
- Product data may contain sensitive information
- Encrypt at rest: DynamoDB encryption enabled
- Encrypt in transit: TLS 1.2+ required
- Access logging: CloudWatch logs for audit trail

**Tenant Isolation**:
- Namespace isolation in Qdrant: `tenantId#knowledgeSpaceId`
- DynamoDB partition key: tenantId
- Lambda environment variables: Per-tenant API keys
- No cross-tenant data access

### Input Validation

**Backend Validation**:
- File size: Reject > 10MB
- File type: Reject non-Markdown
- Field lengths: Enforce max lengths
- URL validation: Validate imageUrl and productUrl format
- Price validation: Non-negative numbers only
- Tag count: Max 20 tags per product

**Frontend Validation**:
- File selection: Client-side checks before upload
- Form inputs: Real-time validation feedback
- XSS prevention: Sanitize all user inputs
- CSRF protection: Use Next.js built-in protection


## Implementation Phases

### Phase 1: Backend Product Parsing (Week 1)

**Deliverables**:
- ProductParserService implementation
- Unit tests for parsing logic
- Property-based tests for parse consistency
- Integration with existing embedding service

**Dependencies**:
- Existing embedding service
- Existing Knowledge Space repository

### Phase 2: Backend API Extension (Week 1-2)

**Deliverables**:
- KnowledgeCreateController multipart support
- Agent preset configuration
- API endpoint updates
- Integration tests

**Dependencies**:
- Phase 1 completion
- Existing controller infrastructure

### Phase 3: Frontend Upload UI (Week 2)

**Deliverables**:
- ProductUploadForm component
- File validation logic
- Upload progress UI
- Error handling and display

**Dependencies**:
- Phase 2 completion
- Existing API client

### Phase 4: Frontend Product Display (Week 2-3)

**Deliverables**:
- ProductCard component
- Product extraction from chat messages
- ChatWidget integration
- Responsive layout

**Dependencies**:
- Existing ChatWidget component
- Phase 3 completion

### Phase 5: Knowledge Space Management UI (Week 3)

**Deliverables**:
- KnowledgeSpaceList updates (type, status, filters)
- CreateAgentForm preset support
- Error detail display
- Integration with backend

**Dependencies**:
- Phase 2 completion
- Existing management components

### Phase 6: Testing and Polish (Week 4)

**Deliverables**:
- Complete property-based test suite
- End-to-end integration tests
- Performance optimization
- Documentation updates

**Dependencies**:
- All previous phases complete

## Migration and Deployment

### Database Migration

**DynamoDB Schema Changes**:
- Add `type` field to KnowledgeSpace table (default: 'web')
- Add `status` field to KnowledgeSpace table (default: 'completed')
- Add `metadata` field for product-specific data
- Backward compatible: Existing records work without changes

**Migration Script**:
```typescript
// Backfill existing Knowledge Spaces with type='web'
async function migrateKnowledgeSpaces() {
  const spaces = await getAllKnowledgeSpaces();
  for (const space of spaces) {
    if (!space.type) {
      await updateKnowledgeSpace(space.id, {
        type: 'web',
        status: 'completed'
      });
    }
  }
}
```

### Deployment Strategy

**Backend Deployment**:
1. Deploy new Lambda functions (blue-green)
2. Update API Gateway routes
3. Run database migration script
4. Monitor CloudWatch metrics
5. Rollback if error rate > 1%

**Frontend Deployment**:
1. Build and test locally
2. Deploy to staging environment
3. Run smoke tests
4. Deploy to production (Vercel/Next.js)
5. Monitor error tracking (Sentry)

### Rollback Plan

**Backend Rollback**:
- Revert Lambda function versions
- Revert API Gateway configuration
- Database changes are backward compatible (no rollback needed)

**Frontend Rollback**:
- Revert to previous Vercel deployment
- Clear CDN cache
- Monitor for residual issues


## Monitoring and Observability

### Metrics

**Backend Metrics**:
- `ProductUploadCount`: Number of product uploads
- `ProductParseSuccessRate`: Percentage of successfully parsed products
- `ProductEmbeddingDuration`: Time to embed products
- `PartialUploadCount`: Number of uploads with partial failures
- `ProductRecommendationRequests`: Number of chat requests to product agents

**Frontend Metrics**:
- Upload success rate
- Average upload duration
- Product card render time
- Streaming message latency
- Error rate by type

### Logging

**Backend Logging**:
```typescript
logger.info('Product upload started', {
  tenantId,
  fileName,
  fileSize,
  itemCount
});

logger.warn('Product parse error', {
  tenantId,
  itemIndex,
  field,
  reason
});

logger.error('Embedding failed', {
  tenantId,
  knowledgeSpaceId,
  productId,
  error
});
```

**Frontend Logging**:
- Console errors for development
- Sentry for production errors
- Analytics events for user actions
- Performance marks for key operations

### Alerts

**CloudWatch Alarms**:
- Product parse error rate > 10%
- Embedding failure rate > 5%
- Upload duration > 60 seconds (p95)
- Lambda errors > 1%
- DynamoDB throttling

**Frontend Alerts**:
- Upload error rate > 5%
- Streaming connection failures > 10%
- Product card render errors > 1%

## Documentation

### API Documentation

**Extended Endpoint**: `POST /v1/knowledge/create` (multipart support added)

```
POST /v1/knowledge/create
Content-Type: multipart/form-data (new) or application/json (existing)

Parameters:
- name: string (required) - Knowledge Space name
- sourceType: 'url' | 'file' (required)
- file: File (required if sourceType='file')
- url: string (required if sourceType='url')
- tenantId: string (required)

Response:
{
  "knowledgeSpaceId": "ks-123",
  "name": "Product Catalog",
  "type": "product",
  "status": "completed",
  "documentCount": 42,
  "summary": {
    "successCount": 42,
    "failureCount": 3,
    "errors": [...]
  }
}
```

### User Documentation

**Upload Guide**:
1. Navigate to Knowledge Spaces page
2. Click "Create Knowledge Space"
3. Select "File Upload" tab
4. Choose or drag Markdown file
5. Review validation results
6. Click "Upload"
7. View upload summary

**Markdown Format Guide**:
```markdown
# Product Data Format

Each product should be enclosed in delimiters:

--- item start ---
id: unique-id (optional, auto-generated if missing)
name: Product Name (required, max 200 chars)
description: Product description (required, max 2000 chars)
category: Category name (optional)
price: 99.99 (optional, numeric)
currency: USD (optional, 3-letter code)
availability: in_stock (optional)
tags: [tag1, tag2, tag3] (optional, max 20 tags)
imageUrl: https://... (optional)
productUrl: https://... (optional)
brand: Brand Name (optional)
--- item end ---
```

### Developer Documentation

**Adding New Product Fields**:
1. Update Product interface in `types.ts`
2. Update ProductParserService to extract new field
3. Update schema version to v2
4. Add migration for existing products
5. Update ProductCard to display new field
6. Update tests

**Extending to Other File Formats**:
1. Create new parser service (e.g., CSVParserService)
2. Implement IProductParserService interface
3. Update KnowledgeCreateController to detect format
4. Add format-specific validation
5. Update frontend to accept new file types

## Future Enhancements

### Short-term (Next Quarter)

1. **CSV Upload Support**:
   - Add CSV parser
   - Column mapping UI
   - Preview before upload

2. **Bulk Edit**:
   - Edit multiple products at once
   - Batch update prices/availability
   - Export to Markdown/CSV

3. **Product Analytics**:
   - Most recommended products
   - Search query analysis
   - Recommendation effectiveness metrics

### Long-term (Next Year)

1. **Advanced Search**:
   - Faceted search by category, price range
   - Full-text search in descriptions
   - Fuzzy matching for product names

2. **Product Variants**:
   - Support for size/color variants
   - Variant-specific pricing
   - Inventory tracking per variant

3. **External Integrations**:
   - Shopify import
   - WooCommerce sync
   - Amazon product API

4. **AI-Powered Features**:
   - Auto-categorization
   - Price optimization suggestions
   - Demand forecasting

## Appendix

### Technology Stack Summary

**Backend**:
- TypeScript 5.x
- AWS Lambda (Node.js 20.x)
- AWS CDK for infrastructure
- DynamoDB for metadata
- Qdrant for vector search
- OpenAI API for embeddings and LLM
- Jest + fast-check for testing

**Frontend**:
- Next.js 16.x
- React 19.x
- TypeScript 5.x
- Tailwind CSS 4.x for styling
- Jest + React Testing Library
- fast-check for property testing

### Glossary

- **Chunk**: A unit of text that is embedded and stored in the vector database
- **Embedding**: A vector representation of text for semantic search
- **Knowledge Space**: A collection of related documents/products
- **Namespace**: A logical partition in Qdrant for tenant isolation
- **Preset**: Pre-configured agent settings for specific use cases
- **SSE**: Server-Sent Events, a protocol for server-to-client streaming
- **Strict RAG**: Mode where agent responses are strictly based on retrieved context
- **Tenant**: An isolated customer/organization in the multi-tenant system

### Key Design Decisions Summary

1. **API Endpoint Strategy**: Extend existing `/v1/knowledge/create` endpoint with multipart/form-data support rather than creating a new endpoint. This maintains API compatibility and minimizes code changes.

2. **Markdown Description Format**: Use block-style format with `### description` marker to support multi-line product descriptions. This better accommodates real-world product data which typically includes detailed, multi-paragraph descriptions.

3. **LLM Response Contract**: Establish explicit JSON format contract for product recommendations. The LLM includes a ```json code block at the end of natural language responses, containing structured product data that the frontend can reliably parse.

4. **Property Testing Priority**: Categorize correctness properties into P0 (Must Have), P1 (Should Have), and P2 (Nice to Have) to guide implementation scheduling and ensure core functionality is solid before adding polish.

### References

- [OpenAI Embeddings API](https://platform.openai.com/docs/guides/embeddings)
- [Qdrant Documentation](https://qdrant.tech/documentation/)
- [Server-Sent Events Specification](https://html.spec.whatwg.org/multipage/server-sent-events.html)
- [Next.js Documentation](https://nextjs.org/docs)
- [fast-check Documentation](https://fast-check.dev/)
