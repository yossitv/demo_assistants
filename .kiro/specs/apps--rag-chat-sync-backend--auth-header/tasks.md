# Implementation Plan

- [x] 1. Create custom Lambda authorizer
  - [x] 1.1 Implement authorizer handler function
    - Create `src/handlers/apiKeyAuthorizer.ts` file
    - Implement handler that accepts APIGatewayAuthorizerEvent
    - Extract API key from Authorization header (case-insensitive)
    - Fallback to x-api-key header if Authorization not present
    - Return IAM policy with usageIdentifierKey set to extracted key
    - Use fixed principalId "api-key-user"
    - Throw Error('Unauthorized') if no API key found or empty
    - _Requirements: 1.1, 1.2, 1.4, 1.5, 5.1, 5.2, 5.3_

  - [x]* 1.2 Write property test for Authorization header extraction
    - **Property 1: Authorization header extraction**
    - **Validates: Requirements 1.1, 1.2, 5.1**

  - [x]* 1.3 Write property test for no prefix requirement
    - **Property 2: No prefix required**
    - **Validates: Requirements 1.4**

  - [x]* 1.4 Write property test for x-api-key fallback
    - **Property 3: Backward compatibility with x-api-key**
    - **Validates: Requirements 1.5**

  - [x]* 1.5 Write property test for usageIdentifierKey correctness
    - **Property 4: UsageIdentifierKey matches extracted key**
    - **Validates: Requirements 3.2, 5.2**

  - [x]* 1.6 Write property test for fixed principal ID
    - **Property 5: Fixed principal ID**
    - **Validates: Requirements 5.3**

  - [x] 1.7 Implement secure logging
    - Add logging for requestId
    - Add logging for header presence (hasAuthorizationHeader, hasXApiKeyHeader)
    - Ensure API key value is never logged
    - Add timestamp to log entries
    - _Requirements: 2.5, 4.1, 4.2, 4.3_

  - [x]* 1.8 Write property test for API key not logged
    - **Property 6: API key not logged**
    - **Validates: Requirements 4.1**

  - [x]* 1.9 Write property test for request ID logged
    - **Property 7: Request ID logged**
    - **Validates: Requirements 4.2**

  - [x]* 1.10 Write property test for header presence logged
    - **Property 8: Header presence logged**
    - **Validates: Requirements 4.3**

  - [x]* 1.11 Write unit tests for error cases
    - Test no headers → Throws error
    - Test empty Authorization header → Throws error
    - Test whitespace-only key → Throws error
    - Test both headers present → Authorization takes priority
    - _Requirements: 2.1, 2.2_

- [x] 2. Update CDK stack for custom authorizer
  - [x] 2.1 Create authorizer Lambda function resource
    - Add Lambda function for apiKeyAuthorizer handler
    - Set runtime to Node.js 20.x
    - Set timeout to 5 seconds
    - Set memory to 128 MB
    - Use existing lambda-dist asset path
    - _Requirements: 5.5, 7.1_

  - [x] 2.2 Create IAM role for authorizer
    - Create IAM role with Lambda service principal
    - Attach AWSLambdaBasicExecutionRole managed policy
    - Verify CloudWatch Logs permissions included
    - _Requirements: 7.1, 7.2, 7.3_

  - [x] 2.3 Create API Gateway custom authorizer
    - Create RequestAuthorizer with authorizer Lambda
    - Set identitySources to Authorization header
    - Set resultsCacheTtl to 0 (disable caching for MVP)
    - _Requirements: 1.1, 1.5_

  - [x] 2.4 Configure API Gateway with AUTHORIZER source
    - Set apiKeySourceType to AUTHORIZER in RestApi configuration
    - Maintain existing CORS configuration
    - Maintain existing access log configuration
    - _Requirements: 3.1, 4.5_

  - [x] 2.5 Update all endpoint method configurations
    - Update /v1/chat/completions to use custom authorizer
    - Update /v1/knowledge/create to use custom authorizer
    - Update /v1/knowledge/list to use custom authorizer
    - Update /v1/agent/create to use custom authorizer
    - Set authorizationType to CUSTOM for all endpoints
    - Set apiKeyRequired to false (authorizer handles validation)
    - _Requirements: 6.1, 6.2, 6.3, 6.4_

- [x] 3. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [-] 4. Deploy and verify
  - [x] 4.1 Build and deploy CDK stack
    - Run npm run build to compile TypeScript
    - Run scripts/prepare-lambda.sh to prepare Lambda package
    - Run npm run cdk:deploy to deploy stack
    - Verify deployment completes successfully
    - _Requirements: 3.1, 7.1_

  - [ ]* 4.2 Manual testing with Authorization header
    - Test POST to /v1/chat/completions with valid API key in Authorization header
    - Verify 200 response with chat completion
    - Test with invalid API key → Verify 403 response
    - Test with no auth headers → Verify 401 response
    - _Requirements: 1.3, 2.1, 2.3, 8.1, 8.2, 8.3_

  - [ ]* 4.3 Manual testing with x-api-key header
    - Test POST to /v1/chat/completions with valid API key in x-api-key header
    - Verify 200 response (backward compatibility)
    - _Requirements: 1.5_

  - [ ]* 4.4 Verify CloudWatch Logs
    - Check authorizer Lambda logs in CloudWatch
    - Verify logs contain requestId
    - Verify logs contain header presence flags
    - Verify logs do NOT contain API key values
    - _Requirements: 4.1, 4.2, 4.3, 7.3_

  - [ ]* 4.5 Verify API Gateway access logs
    - Check API Gateway access logs in CloudWatch
    - Verify logs show 200, 401, 403 status codes
    - Verify logs contain authorizer principal
    - _Requirements: 4.4, 8.4_
