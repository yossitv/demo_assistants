# Implementation Plan

- [ ] 1. Create shared authentication utilities
  - Create centralized utilities for API key and JWT validation
  - Implement fail-closed validation logic
  - Add secure logging that never exposes credentials
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 2.1, 2.2, 2.3, 2.4, 2.6, 4.1, 4.2, 4.3, 4.4, 4.5, 5.1, 5.2, 5.3, 5.4, 5.5_

- [ ] 1.1 Install jsonwebtoken dependency
  - Add jsonwebtoken and @types/jsonwebtoken to package.json
  - Run npm install
  - _Requirements: 2.2, 2.3, 2.6_

- [ ] 1.2 Create authentication types and errors
  - Create src/shared/auth.ts with AuthenticationContext interface
  - Add AuthenticationError class
  - Export types for use across the application
  - _Requirements: 4.3, 4.5_

- [ ] 1.3 Implement API key validation utility
  - Create src/shared/apiKeyCheck.ts
  - Implement validateApiKey function with fail-closed logic
  - Validate against EXPECTED_API_KEY environment variable
  - Return structured validation result with context
  - Add secure logging without exposing key values
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 4.1, 4.3, 4.4, 5.1, 5.2, 5.4_

- [ ]* 1.4 Write property test for API key validation
  - **Property 1: Invalid API keys are always rejected**
  - **Property 2: API key values are never logged**
  - **Validates: Requirements 1.3, 1.5, 5.2**

- [ ] 1.5 Implement JWT verification utility
  - Create src/shared/jwtVerify.ts
  - Implement verifyJwt function using jsonwebtoken library
  - Verify HS256 signatures using JWT_SECRET
  - Reject non-HS256 algorithms
  - Extract tenantId and userId from payload
  - Handle malformed JWTs gracefully
  - Add secure logging without exposing token values
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.6, 4.2, 4.3, 4.4, 5.1, 5.3, 5.4_

- [ ]* 1.6 Write property tests for JWT verification
  - **Property 3: Invalid JWT signatures are rejected**
  - **Property 4: JWT verification round trip**
  - **Property 5: Malformed JWTs are rejected**
  - **Property 6: Non-HS256 algorithms are rejected**
  - **Validates: Requirements 2.2, 2.3, 2.4, 2.6**

- [ ]* 1.7 Write unit tests for authentication utilities
  - Test API key validation with valid/invalid keys
  - Test JWT verification with valid/invalid signatures
  - Test environment variable validation
  - Test error handling and typed errors
  - Test logging behavior
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 2.1, 2.2, 2.3, 2.4, 4.3, 4.5_

- [ ] 2. Update API Key Authorizer with fail-closed validation
  - Modify authorizer to use new validation utility
  - Implement fail-closed logic (Deny by default)
  - Remove hardcoded default tenant context
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 3.2, 3.3, 3.4_

- [ ] 2.1 Refactor apiKeyAuthorizer handler
  - Import validateApiKey utility
  - Replace current validation logic with validateApiKey call
  - Return Deny when EXPECTED_API_KEY is not set
  - Return Deny when API key is missing or invalid
  - Return Allow only when validation succeeds
  - Remove tenantId: "default" from context
  - Use validated tenantId and userId from validation result
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 3.2, 3.3, 3.4_

- [ ]* 2.2 Write property tests for authorizer
  - **Property 1: Invalid API keys are always rejected**
  - **Property 2: API key values are never logged**
  - **Validates: Requirements 1.3, 1.5**

- [ ]* 2.3 Write unit tests for authorizer
  - Test Deny when EXPECTED_API_KEY not set
  - Test Deny when API key missing
  - Test Deny when API key invalid
  - Test Allow when API key valid
  - Test context contains correct tenantId and userId
  - _Requirements: 1.1, 1.2, 1.3, 1.4_

- [ ] 3. Update ChatController authentication
  - Replace decodeJwtWithoutVerification with verifyJwt
  - Use centralized authentication utilities
  - Remove default tenant fallback
  - Return 401 on authentication failure
  - _Requirements: 2.2, 2.3, 2.4, 2.5, 2.6, 3.1, 3.2, 3.3, 3.5, 4.1, 4.2, 6.1, 6.4, 6.5_

- [ ] 3.1 Refactor extractAuthenticationContext method
  - Import verifyJwt and validateApiKey utilities
  - Remove decodeJwtWithoutVerification method
  - Use verifyJwt for JWT authentication
  - Use validateApiKey for API key authentication
  - Remove all default tenant fallback logic
  - Return null when authentication fails
  - _Requirements: 2.2, 2.3, 2.4, 2.5, 2.6, 3.2, 3.3, 3.5, 4.1, 4.2, 6.1_

- [ ] 3.2 Update handle method error handling
  - Ensure 401 is returned immediately when authContext is null
  - Verify no business logic executes on auth failure
  - Update logging to use secure practices
  - _Requirements: 3.1, 5.1, 5.2, 5.3, 5.4, 5.5, 6.4_

- [ ]* 3.3 Write property tests for ChatController authentication
  - **Property 7: Authentication failures prevent business logic execution**
  - **Property 8: Default tenant is never used on auth failure**
  - **Property 14: Successful authentication provides complete context**
  - **Validates: Requirements 3.1, 3.2, 3.3, 6.4, 6.5**

- [ ] 4. Update StreamingChatController authentication
  - Replace decodeJwtWithoutVerification with verifyJwt
  - Use centralized authentication utilities
  - Remove default tenant fallback
  - Return 401 on authentication failure
  - _Requirements: 2.2, 2.3, 2.4, 2.5, 2.6, 3.1, 3.2, 3.3, 3.5, 4.1, 4.2, 6.2, 6.4, 6.5_

- [ ] 4.1 Refactor extractAuthenticationContext method
  - Import verifyJwt and validateApiKey utilities
  - Remove decodeJwtWithoutVerification method
  - Use verifyJwt for JWT authentication
  - Use validateApiKey for API key authentication
  - Remove all default tenant fallback logic
  - Return null when authentication fails
  - _Requirements: 2.2, 2.3, 2.4, 2.5, 2.6, 3.2, 3.3, 3.5, 4.1, 4.2, 6.2_

- [ ] 4.2 Update handle method error handling
  - Ensure 401 is returned immediately when authContext is null
  - Verify no business logic executes on auth failure
  - Update logging to use secure practices
  - _Requirements: 3.1, 5.1, 5.2, 5.3, 5.4, 5.5, 6.4_

- [ ]* 4.3 Write property tests for StreamingChatController authentication
  - **Property 7: Authentication failures prevent business logic execution**
  - **Property 8: Default tenant is never used on auth failure**
  - **Property 14: Successful authentication provides complete context**
  - **Validates: Requirements 3.1, 3.2, 3.3, 6.4, 6.5**

- [ ] 5. Update ChatCompletionsStreamController authentication
  - Replace decodeJwtWithoutVerification with verifyJwt
  - Use centralized authentication utilities
  - Remove default tenant fallback
  - Return 401 on authentication failure
  - _Requirements: 2.2, 2.3, 2.4, 2.5, 2.6, 3.1, 3.2, 3.3, 3.5, 4.1, 4.2, 6.3, 6.4, 6.5_

- [ ] 5.1 Refactor extractAuthenticationContext method
  - Import verifyJwt and validateApiKey utilities
  - Remove decodeJwtWithoutVerification method
  - Use verifyJwt for JWT authentication
  - Use validateApiKey for API key authentication
  - Remove all default tenant fallback logic
  - Return null when authentication fails
  - _Requirements: 2.2, 2.3, 2.4, 2.5, 2.6, 3.2, 3.3, 3.5, 4.1, 4.2, 6.3_

- [ ] 5.2 Update handle method error handling
  - Ensure 401 is returned immediately when authContext is null
  - Verify no business logic executes on auth failure
  - Update logging to use secure practices
  - _Requirements: 3.1, 5.1, 5.2, 5.3, 5.4, 5.5, 6.4_

- [ ]* 5.3 Write property tests for ChatCompletionsStreamController authentication
  - **Property 7: Authentication failures prevent business logic execution**
  - **Property 8: Default tenant is never used on auth failure**
  - **Property 14: Successful authentication provides complete context**
  - **Validates: Requirements 3.1, 3.2, 3.3, 6.4, 6.5**

- [ ] 6. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [ ]* 7. Add integration tests for end-to-end authentication flows
  - Test API Gateway → Authorizer → Handler flow with valid API key
  - Test API Gateway → Authorizer → Handler flow with invalid API key
  - Test Controller → Use Case flow with valid JWT
  - Test Controller → Use Case flow with invalid JWT
  - Test multi-controller consistency
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 2.2, 2.3, 3.1, 6.1, 6.2, 6.3, 6.4, 6.5_

- [ ]* 8. Add comprehensive property-based tests
  - **Property 9: Authentication utilities return valid context or throw**
  - **Property 10: Token values are never logged**
  - **Property 11: Authentication errors are typed**
  - **Property 12: Authentication logs include metadata**
  - **Property 13: Failure logs are informative but secure**
  - **Validates: Requirements 4.3, 4.4, 4.5, 5.1, 5.3, 5.4, 5.5**

- [ ] 9. Update environment configuration documentation
  - Document EXPECTED_API_KEY requirement
  - Document JWT_SECRET requirement
  - Add migration guide for existing deployments
  - Update .env.example file
  - _Requirements: 1.1, 2.1_

- [ ] 10. Final checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.
