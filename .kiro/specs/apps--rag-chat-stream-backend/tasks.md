# Implementation Plan

- [ ] 1. Set up streaming infrastructure and shared utilities
  - Create streaming configuration constants (chunk size, headers)
  - Create SSE formatting utilities
  - Create Bearer token authentication utilities
  - _Requirements: 2.1, 2.2, 2.3, 4.5, 5.5, 5.6, 5.7_

- [ ]* 1.1 Write property test for Bearer token authentication
  - **Property 4: Authorization header is case-insensitive**
  - **Validates: Requirements 2.5**

- [ ]* 1.2 Write property test for token logging security
  - **Property 5: Authentication tokens are not logged**
  - **Validates: Requirements 2.6, 8.7**

- [ ] 2. Implement SSE chunk generation logic
  - Create SSEChunkGenerator class with chunk splitting logic
  - Implement UTF-8 boundary-safe character splitting
  - Generate OpenAI-compatible chunk format (id, object, created, model, choices)
  - Format chunks as SSE events (data: {JSON}\n\n)
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7, 3.8, 3.9, 3.10, 4.1, 4.2_

- [ ]* 2.1 Write property test for SSE chunk format
  - **Property 6: SSE chunks follow OpenAI format**
  - **Validates: Requirements 3.1, 3.6, 3.7, 3.8, 3.9, 3.10**

- [ ]* 2.2 Write property test for SSE content chunks
  - **Property 7: SSE content chunks contain partial text**
  - **Validates: Requirements 3.3**

- [ ]* 2.3 Write property test for UTF-8 boundary handling
  - **Property 8: Chunk splitting respects UTF-8 boundaries**
  - **Validates: Requirements 4.2**

- [ ]* 2.4 Write property test for chunk size validation
  - **Property 9: Chunk sizes are within configured range**
  - **Validates: Requirements 4.1**

- [ ] 3. Implement StreamingChatController
  - Create controller class with Bearer token authentication
  - Implement request validation (model, messages, stream field)
  - Branch logic based on stream field (true/false)
  - Call ChatWithAgentUseCase for both streaming and non-streaming
  - Generate and send SSE chunks for streaming mode
  - Return JSON response for non-streaming mode
  - Implement error handling before stream starts
  - Add structured logging with CloudWatch
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 2.1, 2.2, 2.3, 2.4, 6.1, 6.2, 6.3, 6.4, 8.1, 8.2, 8.3, 8.4, 8.5, 8.6, 10.1, 10.2, 10.3, 10.4, 12.1-12.6_

- [ ]* 3.1 Write property test for stream mode response format
  - **Property 1: Stream mode determines response format**
  - **Validates: Requirements 1.1, 1.2**

- [ ]* 3.2 Write property test for model field parsing
  - **Property 2: Model field is parsed as Agent ID**
  - **Validates: Requirements 1.3**

- [ ]* 3.3 Write property test for messages passthrough
  - **Property 3: Messages are passed through unchanged**
  - **Validates: Requirements 1.4**

- [ ]* 3.4 Write property test for SSE response headers
  - **Property 10: SSE responses include required headers**
  - **Validates: Requirements 5.5, 5.6, 5.7**

- [ ]* 3.5 Write property test for error response format
  - **Property 11: Error responses are JSON before stream starts**
  - **Validates: Requirements 6.4**

- [ ]* 3.6 Write property test for UseCase input format
  - **Property 12: UseCase input format matches existing implementation**
  - **Validates: Requirements 7.5**

- [ ]* 3.7 Write property test for request metadata logging
  - **Property 13: Request metadata is logged**
  - **Validates: Requirements 8.1, 8.2, 8.3, 8.4, 8.5**

- [ ]* 3.8 Write property test for streaming timing logs
  - **Property 14: Streaming timing is logged**
  - **Validates: Requirements 8.6**

- [ ]* 3.9 Write property test for message content logging
  - **Property 15: Message content logging respects configuration**
  - **Validates: Requirements 8.8**

- [ ]* 3.10 Write property test for conversation storage
  - **Property 16: Conversation storage is complete**
  - **Validates: Requirements 9.4**

- [ ]* 3.11 Write property test for non-streaming response format
  - **Property 17: Non-streaming responses match existing format**
  - **Validates: Requirements 10.1, 10.2**

- [ ]* 3.12 Write property test for ignored OpenAI parameters
  - **Property 18: Optional OpenAI parameters are ignored**
  - **Validates: Requirements 12.1, 12.2, 12.3, 12.4, 12.5, 12.6**

- [ ]* 3.13 Write property test for CORS headers
  - **Property 19: CORS headers are included in SSE responses**
  - **Validates: Requirements 13.1, 13.2**

- [ ] 4. Create Lambda streaming handler
  - Create chatCompletionsStreamHandler.ts using awslambda.streamifyResponse
  - Wire up DIContainer to provide StreamingChatController
  - Handle responseStream lifecycle (write, end)
  - Set appropriate Content-Type and headers
  - _Requirements: 5.1, 5.2, 5.5, 5.6, 5.7, 7.1, 7.2, 7.3, 7.4_

- [ ]* 4.1 Write unit tests for Lambda handler
  - Test handler initialization with DIContainer
  - Test responseStream lifecycle management
  - Test error handling before stream starts
  - Test authentication failures return 401/403
  - Test validation failures return 400
  - _Requirements: 2.1, 2.2, 2.3, 6.1, 6.2, 6.3_

- [ ] 5. Update DIContainer for streaming support
  - Add StreamingChatController to DIContainer
  - Ensure ChatWithAgentUseCase is reusable for streaming
  - Wire up all existing dependencies (repositories, services)
  - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 7.6_

- [ ] 6. Update CDK infrastructure for streaming
  - Create new Lambda function with Node.js 20.x runtime
  - Set timeout to 180 seconds (3 minutes)
  - Set memory to 1024 MB
  - Add TAUVS_API_KEY environment variable
  - Configure API Gateway integration with STREAM mode
  - Add /v1/chat/completions endpoint with streaming integration
  - Use Regional endpoint type
  - Configure CORS headers for streaming
  - _Requirements: 5.1, 5.2, 5.3, 5.4, 11.1, 13.1, 13.2_

- [ ]* 6.1 Write integration test for complete streaming flow
  - Test end-to-end streaming with real dependencies
  - Verify SSE format and chunk delivery
  - Verify conversation persistence
  - _Requirements: 1.1, 3.1-3.10, 4.1-4.4, 9.4_

- [ ] 7. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 8. Add CloudWatch monitoring and alarms
  - Emit custom metrics for streaming requests
  - Emit timing metrics (UseCase duration, chunk sending duration)
  - Emit error metrics by type (401, 403, 400, 500)
  - Create CloudWatch alarms for high error rate
  - Create CloudWatch alarms for high latency
  - _Requirements: 8.1-8.8_

- [ ]* 8.1 Write unit tests for CloudWatch metrics
  - Test metric emission for streaming requests
  - Test timing metrics calculation
  - Test error metrics by type
  - _Requirements: 8.1-8.6_

- [ ] 9. Update documentation
  - Add API documentation for /v1/chat/completions streaming endpoint
  - Document Bearer token authentication for tauvs
  - Add examples for streaming and non-streaming requests
  - Document environment variables (TAUVS_API_KEY)
  - _Requirements: 1.1, 1.2, 2.1-2.7_

- [ ] 10. Final checkpoint - Verify all requirements
  - Ensure all tests pass, ask the user if questions arise.
