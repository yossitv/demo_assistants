# Implementation Plan: Product Recommendation Feature

## Phase 1: Backend - Product Parser and Schema

- [ ] 1. Implement Product schema and types
  - Create Product interface with all schema fields (id, name, description, category, price, currency, availability, tags, imageUrl, productUrl, brand, updatedAt)
  - Create ParseResult interface (products, errors, summary)
  - Create ParseError interface (itemIndex, field, reason)
  - Add schemaVersion constant ('v1')
  - _Requirements: 8.1, 8.2_

- [ ] 2. Implement ProductParserService
  - Create IProductParserService interface
  - Implement parseMarkdown method with delimiter-based parsing
  - _Requirements: 2.1, 2.2_

- [ ] 2.1 Implement delimiter and field extraction
  - Split content by `--- item start ---` and `--- item end ---`
  - Extract single-line fields with `key: value` pattern
  - Handle tags array format `[a, b, c]`
  - _Requirements: 2.1, 2.2, 8.5_

- [ ] 2.2 Implement description block parsing
  - Detect `### description` marker
  - Capture multi-line content until next `###` or `---`
  - Priority: Use block if exists, fallback to `description:` line
  - _Requirements: 2.2_

- [ ] 2.3 Implement validation and error handling
  - Check for required fields (name, description)
  - Skip invalid items and record errors with itemIndex
  - Generate UUID for items without id
  - Truncate name to 200 chars, description to 2000 chars
  - _Requirements: 2.3, 2.4, 8.3, 8.4_

- [ ] 2.4 Implement parse summary generation
  - Calculate totalItems, successCount, failureCount
  - Ensure successCount + failureCount = totalItems
  - Return products array and errors array
  - _Requirements: 2.5_

- [ ]* 2.5 Write property tests for ProductParserService
  - **Property 5: Delimiter-based parsing finds all items**
  - **Validates: Requirements 2.1**
  - **Property 6: Key-value extraction completeness**
  - **Validates: Requirements 2.2**
  - **Property 7: Missing required fields trigger skip and error**
  - **Validates: Requirements 2.3**
  - **Property 8: Missing ID generates unique identifier**
  - **Validates: Requirements 2.4**
  - **Property 9: Parse summary accuracy**
  - **Validates: Requirements 2.5**
  - **Property 36: Name field length validation**
  - **Validates: Requirements 8.3**
  - **Property 37: Description field length validation**
  - **Validates: Requirements 8.4**
  - **Property 38: Tag array parsing**
  - **Validates: Requirements 8.5**

- [ ]* 2.6 Write unit tests for ProductParserService
  - Test valid product parsing
  - Test missing required fields
  - Test ID generation
  - Test field truncation
  - Test tag parsing
  - Test error recording
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5_

## Phase 2: Backend - API Extension and Knowledge Space

- [ ] 3. Extend Knowledge Space entity and repository
  - Add `type` field to KnowledgeSpace entity ('web' | 'product' | 'document')
  - Add `status` field ('processing' | 'completed' | 'partial' | 'error')
  - Add `metadata` field with sourceType, schemaVersion, summary
  - Update DynamoDB table schema (backward compatible)
  - _Requirements: 3.1, 3.2, 7.1, 7.3, 8.2_


- [ ] 4. Extend KnowledgeCreateController for multipart support
  - Add multipart/form-data parsing to existing `/v1/knowledge/create` endpoint
  - Add sourceType field validation ('url' | 'file')
  - Handle file upload and extract content
  - Maintain backward compatibility with JSON requests
  - _Requirements: 1.2, 9.1_

- [ ] 4.1 Integrate ProductParserService
  - Call ProductParserService.parseMarkdown for file uploads
  - Handle ParseResult and extract products/errors
  - Set type='product' for product uploads
  - _Requirements: 2.1, 3.1_

- [ ] 4.2 Implement product embedding flow
  - Create one chunk per product using existing embedding service
  - Format chunk text: `${name}\n${description}\nCategory: ${category}\n...`
  - Store productId and productName in chunk metadata
  - _Requirements: 3.3_

- [ ] 4.3 Implement Qdrant upsert with namespace
  - Use namespace format `${tenantId}#${knowledgeSpaceId}`
  - Batch upsert products (100 vectors per batch)
  - Handle partial failures
  - _Requirements: 3.4_

- [ ] 4.4 Implement status and metadata updates
  - Set status='completed' if all products succeed
  - Set status='partial' if some products fail
  - Set status='error' if all products fail
  - Store summary (successCount, failureCount, errors) in metadata
  - Store schemaVersion='v1' in metadata
  - _Requirements: 3.2, 3.5, 8.2_

- [ ] 4.5 Update response format
  - Return knowledgeSpaceId, name, type, status, documentCount
  - Include summary with successCount, failureCount, errors
  - _Requirements: 1.3, 2.5_

- [ ]* 4.6 Write property tests for Knowledge Space creation
  - **Property 10: Product Knowledge Space type assignment**
  - **Validates: Requirements 3.1**
  - **Property 11: Knowledge Space metadata completeness**
  - **Validates: Requirements 3.2**
  - **Property 12: One chunk per product**
  - **Validates: Requirements 3.3**
  - **Property 13: Namespace format consistency**
  - **Validates: Requirements 3.4**
  - **Property 14: Partial failure status marking**
  - **Validates: Requirements 3.5**

- [ ]* 4.7 Write unit tests for KnowledgeCreateController
  - Test multipart file upload
  - Test product parsing integration
  - Test embedding flow
  - Test status updates
  - Test error handling
  - _Requirements: 1.2, 2.1, 3.1, 3.2, 3.3, 3.4, 3.5_

- [ ] 5. Checkpoint - Backend core functionality
  - Ensure all tests pass
  - Verify product upload creates Knowledge Space with type='product'
  - Verify products are searchable in Qdrant
  - Ask user if questions arise

## Phase 3: Backend - Agent Preset Configuration

- [ ] 6. Implement Product Recommendation Agent preset
  - Add PRODUCT_RECOMMENDATION preset to Agent entity
  - Set strictRAG=true by default
  - Set description: "AI assistant specialized in product recommendations"
  - _Requirements: 4.1, 4.2, 4.3_

- [ ] 6.1 Create system prompt template
  - Include instructions for asking clarifying questions
  - Include instructions for providing reasoning
  - Include JSON response format contract
  - Add example of expected JSON structure with products array
  - _Requirements: 4.4_

- [ ]* 6.2 Write property tests for agent preset
  - **Property 15: Preset selection sets strictRAG**
  - **Validates: Requirements 4.2**
  - **Property 16: Preset populates description**
  - **Validates: Requirements 4.3**
  - **Property 17: Preset applies system prompt template**
  - **Validates: Requirements 4.4**
  - **Property 18: Agent-Knowledge Space linking**
  - **Validates: Requirements 4.5**

- [ ]* 6.3 Write unit tests for agent preset
  - Test preset configuration values
  - Test system prompt content
  - Test Knowledge Space linking
  - _Requirements: 4.2, 4.3, 4.4, 4.5_

## Phase 4: Frontend - Product Upload UI

- [ ] 7. Create ProductUploadForm component
  - Create component file at `apps/rag-chat-sync-frontend/components/ProductUploadForm.tsx`
  - Implement file selection (input and drag-and-drop)
  - Implement upload state management
  - _Requirements: 1.1, 1.2, 9.2_

- [ ] 7.1 Implement client-side validation
  - Validate file extension (.md, .markdown)
  - Validate file size (≤ 10MB)
  - Display validation errors
  - Disable upload button for invalid files
  - _Requirements: 1.1, 9.3_

- [ ] 7.2 Implement file upload logic
  - Create multipart/form-data request
  - Call `/v1/knowledge/create` with sourceType='file'
  - Handle upload progress
  - Display loading indicator during upload
  - _Requirements: 1.2, 9.4_

- [ ] 7.3 Implement upload result display
  - Display success message with product counts
  - Display partial success with error details
  - Display failure message with retry option
  - Redirect to Knowledge Space list on success
  - _Requirements: 1.3, 1.4, 9.5_

- [ ] 7.4 Implement error handling
  - Handle network errors and preserve form state
  - Handle 401/403 authentication errors
  - Handle timeout errors
  - Display clear error messages
  - Enable retry after errors
  - _Requirements: 10.3, 10.4, 10.5_

- [ ]* 7.5 Write property tests for ProductUploadForm
  - **Property 1: File validation rejects invalid files**
  - **Validates: Requirements 1.1**
  - **Property 2: Valid file upload triggers API call**
  - **Validates: Requirements 1.2**
  - **Property 39: File selection display**
  - **Validates: Requirements 9.2**
  - **Property 40: Client-side validation before upload**
  - **Validates: Requirements 9.3**
  - **Property 45: Network error form preservation**
  - **Validates: Requirements 10.3**

- [ ]* 7.6 Write unit tests for ProductUploadForm
  - Test file selection
  - Test validation
  - Test upload flow
  - Test error handling
  - Test form state preservation
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 9.2, 9.3, 9.4, 9.5_


- [ ] 8. Update Knowledge Space creation page
  - Add "File Upload" tab to existing Knowledge creation page
  - Integrate ProductUploadForm component
  - Maintain existing "URL" tab functionality
  - _Requirements: 9.1_

- [ ] 9. Extend KnowledgeSpaceList component
  - Add type badge display (web/product/document)
  - Add status indicator (processing/completed/partial/error)
  - Add document count display
  - _Requirements: 7.1, 7.2, 7.3_

- [ ] 9.1 Implement type filtering
  - Add filter dropdown for type selection
  - Filter Knowledge Spaces by selected type
  - _Requirements: 7.5_

- [ ] 9.2 Implement error details display
  - Add "View Errors" button for partial/error status
  - Display error details in modal or expandable section
  - Show itemIndex, field, and reason for each error
  - _Requirements: 7.4_

- [ ]* 9.3 Write property tests for KnowledgeSpaceList
  - **Property 29: Type field display in list**
  - **Validates: Requirements 7.1**
  - **Property 30: Document count display for product KS**
  - **Validates: Requirements 7.2**
  - **Property 31: Status indicator display**
  - **Validates: Requirements 7.3**
  - **Property 32: Error details access for partial status**
  - **Validates: Requirements 7.4**
  - **Property 33: Type-based filtering**
  - **Validates: Requirements 7.5**

- [ ]* 9.4 Write unit tests for KnowledgeSpaceList
  - Test type badge rendering
  - Test status indicator rendering
  - Test document count display
  - Test filtering functionality
  - Test error details display
  - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5_

## Phase 5: Frontend - Agent Creation with Preset

- [ ] 10. Extend CreateAgentForm component
  - Add "Preset" dropdown with options: None, Product Recommendation
  - Implement preset selection handler
  - _Requirements: 4.1_

- [ ] 10.1 Implement preset auto-population
  - Auto-fill description when preset selected
  - Auto-check strictRAG checkbox
  - Auto-populate system prompt with template
  - Allow manual override of all fields
  - _Requirements: 4.2, 4.3, 4.4_

- [ ] 10.2 Implement Knowledge Space filtering
  - Filter Knowledge Space dropdown to show only type='product' when preset selected
  - Show all Knowledge Spaces when no preset selected
  - _Requirements: 4.5_

- [ ]* 10.3 Write unit tests for CreateAgentForm preset
  - Test preset selection
  - Test auto-population
  - Test Knowledge Space filtering
  - Test manual override
  - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5_

- [ ] 11. Checkpoint - Upload and agent creation complete
  - Ensure all tests pass
  - Verify file upload creates product Knowledge Space
  - Verify agent creation with preset works
  - Ask user if questions arise

## Phase 6: Frontend - Product Display in Chat

- [ ] 12. Create ProductCard component
  - Create component file at `apps/rag-chat-sync-frontend/components/ProductCard.tsx`
  - Implement card layout with all product fields
  - _Requirements: 6.2_

- [ ] 12.1 Implement product field display
  - Display name (bold, prominent)
  - Display price with currency
  - Display description (truncated with "Read more")
  - Display image or placeholder
  - Display category and brand badges
  - Display availability status
  - Display "View Product" link if productUrl exists
  - _Requirements: 6.2_

- [ ] 12.2 Implement placeholder handling
  - Show placeholder for missing image
  - Show "Price not available" for missing price
  - Disable link for missing productUrl
  - Handle all optional fields gracefully
  - _Requirements: 6.5_

- [ ] 12.3 Implement citation display
  - Display source information if citedUrls present
  - Show "Source: [URL]" below product details
  - _Requirements: 6.4_

- [ ]* 12.4 Write property tests for ProductCard
  - **Property 25: Product card field completeness**
  - **Validates: Requirements 6.2**
  - **Property 27: Cited URLs display**
  - **Validates: Requirements 6.4**
  - **Property 28: Missing field placeholder handling**
  - **Validates: Requirements 6.5**

- [ ]* 12.5 Write unit tests for ProductCard
  - Test complete product rendering
  - Test partial product rendering
  - Test placeholder display
  - Test citation display
  - _Requirements: 6.2, 6.4, 6.5_

- [ ] 13. Extend ChatWidget component
  - Implement product extraction from messages
  - Integrate ProductCard rendering
  - _Requirements: 6.1_

- [ ] 13.1 Implement extractProducts function
  - Parse message for ```json code blocks
  - Extract products array from JSON
  - Handle parsing errors gracefully
  - Return empty array if no products found
  - _Requirements: 6.1_

- [ ] 13.2 Implement product card rendering
  - Render ProductCard for each extracted product
  - Display multiple products in grid layout (2+ products)
  - Display single product in full width
  - Maintain existing message display for non-product content
  - _Requirements: 6.2, 6.3_

- [ ]* 13.3 Write property tests for ChatWidget product extraction
  - **Property 24: Product data extraction from responses**
  - **Validates: Requirements 6.1**
  - **Property 26: Multiple products trigger grid layout**
  - **Validates: Requirements 6.3**

- [ ]* 13.4 Write unit tests for ChatWidget product features
  - Test product extraction
  - Test ProductCard rendering
  - Test grid layout
  - Test error handling
  - _Requirements: 6.1, 6.2, 6.3_


## Phase 7: Streaming Chat Integration

- [ ] 14. Verify streaming API integration
  - Ensure chat requests include `stream: true`
  - Verify SSE data is decoded correctly
  - Verify tokens are displayed incrementally
  - _Requirements: 5.1, 5.2_

- [ ] 14.1 Implement stream completion handling
  - Detect `data: [DONE]` marker
  - Mark message as complete
  - Stop processing further chunks
  - _Requirements: 5.3_

- [ ] 14.2 Implement stream abort functionality
  - Add stop button to chat interface
  - Use AbortController to cancel stream
  - Clean up resources on abort
  - _Requirements: 5.4_

- [ ] 14.3 Implement streaming error handling
  - Display error message on stream failure
  - Provide retry button
  - Maintain conversation state
  - _Requirements: 5.5_

- [ ]* 14.4 Write property tests for streaming
  - **Property 19: Streaming API call includes stream flag**
  - **Validates: Requirements 5.1**
  - **Property 20: Incremental token display**
  - **Validates: Requirements 5.2**
  - **Property 21: Stream completion handling**
  - **Validates: Requirements 5.3**
  - **Property 22: Stream abort on stop**
  - **Validates: Requirements 5.4**
  - **Property 23: Streaming error display with retry**
  - **Validates: Requirements 5.5**

- [ ]* 14.5 Write unit tests for streaming features
  - Test stream flag inclusion
  - Test incremental display
  - Test completion handling
  - Test abort functionality
  - Test error handling
  - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5_

## Phase 8: Error Handling and Edge Cases

- [ ] 15. Implement comprehensive error handling
  - Backend: Parse errors, embedding errors, storage errors
  - Frontend: Upload errors, streaming errors, display errors
  - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5_

- [ ] 15.1 Implement partial failure handling
  - Continue processing remaining products on parse errors
  - Return status='partial' with error details
  - Display partial success in UI
  - _Requirements: 10.1, 10.2_

- [ ]* 15.2 Write property tests for error handling
  - **Property 43: Partial failure continuation**
  - **Validates: Requirements 10.1**
  - **Property 44: Partial status with error details**
  - **Validates: Requirements 10.2**
  - **Property 46: Authentication error messaging**
  - **Validates: Requirements 10.4**
  - **Property 47: Timeout graceful handling**
  - **Validates: Requirements 10.5**

- [ ]* 15.3 Write unit tests for error scenarios
  - Test parse errors
  - Test embedding errors
  - Test network errors
  - Test authentication errors
  - Test timeout errors
  - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5_

## Phase 9: Integration Testing and Polish

- [ ] 16. End-to-end integration tests
  - Test complete upload flow (Markdown → KS → searchable)
  - Test partial failure flow (mixed valid/invalid products)
  - Test recommendation flow (agent → chat → product cards)
  - Test error recovery flow (network error → retry → success)
  - _Requirements: All_

- [ ] 17. Performance optimization
  - Implement batch embedding (10 products per API call)
  - Implement batch DynamoDB writes (25 per batch)
  - Implement batch Qdrant upserts (100 vectors per batch)
  - Add React.memo to ProductCard
  - Add useMemo for product extraction
  - _Design: Performance Considerations_

- [ ] 18. Documentation updates
  - Update API documentation with multipart examples
  - Create user guide for product upload
  - Create Markdown format guide
  - Update developer documentation
  - _Design: Documentation_

- [ ] 19. Database migration
  - Create migration script for existing Knowledge Spaces
  - Backfill type='web' for existing records
  - Backfill status='completed' for existing records
  - Test migration on staging environment
  - _Design: Migration and Deployment_

- [ ] 20. Final checkpoint - Complete feature verification
  - Ensure all tests pass
  - Verify complete user flow: Upload → Create Agent → Chat → See Products
  - Verify error handling works correctly
  - Verify performance meets requirements
  - Ask user for final approval

## Notes

- Tasks marked with `*` are optional (tests, documentation, polish)
- P0 properties (Must Have) should be implemented first
- Each phase builds on the previous phase
- Checkpoints ensure stability before moving forward
- All requirements are referenced in task details
