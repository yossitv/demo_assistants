# Design Document

## Overview

This design adds API Key authentication as an alternative to JWT authentication for the `/v1/chat/completions` endpoint. The implementation enables external services like Tavus to use the RAG chat backend as a custom LLM while maintaining full backward compatibility with existing JWT-based authentication.

The design follows a minimal modification approach, limiting changes to the API Gateway configuration and ChatController authentication logic. No changes are required to domain entities, use cases, or repositories.

## Architecture

### Authentication Flow

```
┌─────────────────┐
│  External       │
│  Service        │
│  (Tavus)        │
└────────┬────────┘
         │ x-api-key: xxx
         ▼
┌─────────────────────────────────────────┐
│  API Gateway                            │
│  ┌───────────────────────────────────┐ │
│  │ API Key Validation                │ │
│  │ (Usage Plan)                      │ │
│  └───────────────┬───────────────────┘ │
│                  │ Valid                │
│                  ▼                      │
│  ┌───────────────────────────────────┐ │
│  │ Cognito Authorizer (Optional)     │ │
│  └───────────────┬───────────────────┘ │
└──────────────────┼─────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────┐
│  Lambda: chat.handler                   │
│  ┌───────────────────────────────────┐ │
│  │ ChatController                    │ │
│  │                                   │ │
│  │ 1. Check JWT claims               │ │
│  │    ├─ Valid? → Use JWT flow       │ │
│  │    └─ Invalid? → Check API Key    │ │
│  │                                   │ │
│  │ 2. API Key fallback               │ │
│  │    ├─ Present? → Use fixed IDs    │ │
│  │    └─ Missing? → 401 Unauthorized │ │
│  │                                   │ │
│  │ 3. Execute ChatWithAgentUseCase   │ │
│  └───────────────────────────────────┘ │
└─────────────────────────────────────────┘
```

### Dual Authentication Strategy

The system supports two authentication methods with the following priority:

1. **JWT Authentication (Primary)**: If valid JWT claims exist, use them
2. **API Key Authentication (Fallback)**: If JWT is invalid/missing but API Key is present, use fixed tenant/user IDs
3. **Unauthorized**: If both are invalid/missing, reject with 401

This approach ensures zero impact on existing JWT users while enabling API Key access.

## Components and Interfaces

### Modified Components

#### 1. API Gateway Configuration (CDK)

**File**: `infrastructure/lib/rag-chat-backend-stack.ts`

**Changes**:
- Create API Key resource
- Create Usage Plan and associate with API Key
- Link Usage Plan to `/v1/chat/completions` endpoint
- Add `apiKeyRequired: true` to the chat endpoint method options
- Maintain existing Cognito authorizer configuration

**New CDK Resources**:
```typescript
// API Key (simple, no usage plan)
const apiKey = api.addApiKey('TavusApiKey', {
  apiKeyName: 'tavus-llm-key',
  description: 'API Key for Tavus custom LLM integration'
});

// Usage Plan (minimal, no rate limiting)
const usagePlan = api.addUsagePlan('TavusUsagePlan', {
  name: 'Tavus LLM Usage Plan',
  description: 'Usage plan for Tavus API Key access'
});

// Associate API Key with Usage Plan
usagePlan.addApiKey(apiKey);

// Associate Usage Plan with API stage
usagePlan.addApiStage({
  stage: api.deploymentStage
});
```

**Method Configuration**:
```typescript
chatCompletions.addMethod('POST', new apigateway.LambdaIntegration(chatLambda), {
  authorizer,
  authorizationType: apigateway.AuthorizationType.COGNITO,
  apiKeyRequired: true  // NEW: Enable API Key authentication
});
```

#### 2. ChatController Authentication Logic

**File**: `src/adapters/controllers/ChatController.ts`

**Changes**:
- Add API Key detection from headers
- Implement fallback authentication logic
- Assign fixed tenant/user IDs for API Key requests
- Maintain all existing JWT logic unchanged

**New Method**:
```typescript
private extractAuthenticationContext(event: APIGatewayProxyEvent): {
  tenantId: string;
  userId: string;
  authMethod: 'jwt' | 'apikey';
} | null {
  // Try JWT first
  const jwtTenantId = event.requestContext.authorizer?.claims?.['custom:tenant_id'];
  const jwtUserId = event.requestContext.authorizer?.claims?.sub;
  
  if (jwtTenantId && jwtUserId) {
    return {
      tenantId: jwtTenantId,
      userId: jwtUserId,
      authMethod: 'jwt'
    };
  }
  
  // Fallback to API Key
  const apiKey = event.headers['x-api-key'] || event.headers['X-API-Key'];
  
  if (apiKey) {
    return {
      tenantId: 'default',
      userId: 'default',
      authMethod: 'apikey'
    };
  }
  
  return null;
}
```

**Modified handle() method**:
```typescript
async handle(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  const requestId = event.requestContext.requestId;
  const startTime = Date.now();

  try {
    const authContext = this.extractAuthenticationContext(event);
    
    if (!authContext) {
      this.logUnauthorizedAttempt(requestId, event.path);
      return errorResponse(401, 'Unauthorized');
    }
    
    const { tenantId, userId, authMethod } = authContext;
    
    // Log authentication method
    this.logger.info('Request authenticated', {
      requestId,
      authMethod,
      tenantId,
      userId
    });
    
    // Rest of the existing logic remains unchanged
    const validatedBody = validateChatRequestBody(event.body);
    
    // ... existing code ...
  }
}
```

### Unchanged Components

The following components require **no modifications**:

- **Domain Layer**: All entities, value objects, and interfaces
- **Use Cases**: ChatWithAgentUseCase and all other use cases
- **Repositories**: All DynamoDB and Qdrant repository implementations
- **Other Controllers**: KnowledgeCreateController, KnowledgeListController, AgentCreateController
- **Infrastructure Services**: OpenAI, Cheerio, Tiktoken services

## Data Models

No changes to existing data models. The system uses existing entities:

- **Agent**: Unchanged
- **KnowledgeSpace**: Unchanged
- **Conversation**: Unchanged
- **Chunk**: Unchanged
- **Embedding**: Unchanged

For API Key authenticated requests, the system uses a single fixed identifier:
- `tenantId`: "default"
- `userId`: "default"
- `agentId`: Provided in request body as `model` field (OpenAI-compatible)

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system—essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: JWT authentication continues to work

*For any* request with valid JWT claims containing `custom:tenant_id` and `sub`, the ChatController should extract and use those values for authentication, regardless of whether an API Key is also present.

**Validates: Requirements 2.1, 2.2, 2.3**

### Property 2: API Key authentication succeeds when JWT is absent

*For any* request without valid JWT claims but with a valid `x-api-key` or `X-API-Key` header, the ChatController should authenticate successfully using fixed tenant ID "default" and user ID "default".

**Validates: Requirements 1.1, 1.4**

### Property 3: Dual authentication rejection

*For any* request without valid JWT claims and without an API Key header, the ChatController should reject the request with 401 Unauthorized status.

**Validates: Requirements 1.3**

### Property 4: Fixed ID assignment for API Key requests

*For any* request authenticated via API Key, the system should assign tenantId="default" and userId="default" before invoking ChatWithAgentUseCase.

**Validates: Requirements 1.4**

### Property 5: Response format compatibility

*For any* successful chat request (JWT or API Key), the response should contain the same OpenAI-compatible structure with a completion field accessible via `choices[0].message.content`.

**Validates: Requirements 3.1, 3.2**

### Property 6: Use case execution consistency

*For any* authenticated request (JWT or API Key), the ChatController should invoke ChatWithAgentUseCase with the same parameter structure: tenantId, userId, agentId, messages, and requestId.

**Validates: Requirements 1.5, 2.5**

### Property 7: API Gateway key validation

*For any* request to `/v1/chat/completions` with an invalid API Key, API Gateway should reject the request with 403 Forbidden before reaching the Lambda function.

**Validates: Requirements 1.2, 4.5**

### Property 8: No domain layer modifications

*For any* code change in this feature, no files in `src/domain/` should be modified.

**Validates: Requirements 5.3**

### Property 9: No use case modifications

*For any* code change in this feature, the ChatWithAgentUseCase file should remain unchanged.

**Validates: Requirements 5.3**

### Property 10: No repository modifications

*For any* code change in this feature, no files in `src/infrastructure/repositories/` should be modified.

**Validates: Requirements 5.4**

## Error Handling

### API Gateway Level

| Error Condition | Status Code | Response | Handler |
|----------------|-------------|----------|---------|
| Invalid API Key | 403 Forbidden | `{"message": "Forbidden"}` | API Gateway |
| Missing API Key (when required) | 403 Forbidden | `{"message": "Forbidden"}` | API Gateway |
| Rate limit exceeded | 429 Too Many Requests | `{"message": "Too Many Requests"}` | API Gateway |

### Lambda/Controller Level

| Error Condition | Status Code | Response | Handler |
|----------------|-------------|----------|---------|
| No JWT and no API Key | 401 Unauthorized | `{"error": "Unauthorized"}` | ChatController |
| Invalid request body | 400 Bad Request | `{"error": "<validation message>"}` | ChatController |
| Agent not found | 500 Internal Server Error | `{"error": "Internal server error"}` | ChatController |
| Use case execution error | 500 Internal Server Error | `{"error": "Internal server error"}` | ChatController |

### Error Logging

All errors are logged with context:
- `requestId`: API Gateway request ID
- `authMethod`: "jwt", "apikey", or "none"
- `tenantId`: Extracted or fixed tenant ID (if available)
- `userId`: Extracted or fixed user ID (if available)
- `path`: Request path
- `error`: Error message and stack trace

## Testing Strategy

### Unit Tests

Unit tests verify specific authentication scenarios and edge cases:

1. **JWT Authentication Tests**:
   - Valid JWT with tenant_id and sub claims → Success
   - JWT with missing tenant_id → Falls back to API Key check
   - JWT with missing sub → Falls back to API Key check

2. **API Key Authentication Tests**:
   - Valid API Key in `x-api-key` header → Success with fixed IDs
   - Valid API Key in `X-API-Key` header → Success with fixed IDs
   - Missing API Key → 401 Unauthorized

3. **Priority Tests**:
   - Both JWT and API Key present → JWT takes priority
   - Invalid JWT + valid API Key → API Key succeeds

4. **Error Response Tests**:
   - No authentication → 401 with correct error message
   - Validation error → 400 with correct error message

### Property-Based Tests

Property-based tests verify universal properties across all inputs using the fast-check library with a minimum of 100 iterations per property.

Each property-based test must:
- Run at least 100 iterations
- Include a comment tag referencing the design document property
- Test the general behavior across randomized inputs

**Test File**: `src/adapters/controllers/ChatController.apikey.property.test.ts`

1. **Property 1: JWT Priority**
   - **Tag**: `**Feature: api-key-auth, Property 1: JWT authentication continues to work**`
   - **Test**: Generate random valid JWT claims and random API Keys, verify JWT values are always used

2. **Property 2: API Key Fallback**
   - **Tag**: `**Feature: api-key-auth, Property 2: API Key authentication succeeds when JWT is absent**`
   - **Test**: Generate random API Key strings, verify fixed IDs are assigned when JWT is absent

3. **Property 4: Fixed ID Assignment**
   - **Tag**: `**Feature: api-key-auth, Property 4: Fixed ID assignment for API Key requests**`
   - **Test**: Generate random API Keys, verify tenantId="default" and userId="default" are always assigned

4. **Property 6: Use Case Consistency**
   - **Tag**: `**Feature: api-key-auth, Property 6: Use case execution consistency**`
   - **Test**: Generate random auth contexts (JWT or API Key), verify ChatWithAgentUseCase is called with correct parameters

### Integration Tests

Integration tests verify end-to-end behavior with real AWS services:

1. **API Gateway + Lambda Integration**:
   - Deploy to test environment
   - Send request with valid API Key → Verify 200 response
   - Send request with invalid API Key → Verify 403 response
   - Send request with valid JWT → Verify 200 response
   - Send request with no auth → Verify 401 response

2. **Tavus Compatibility Test**:
   - Configure Tavus with test API Key
   - Send chat request from Tavus
   - Verify response format matches Tavus expectations
   - Verify `completion` field is accessible

### Manual Testing

1. **API Key Generation**:
   - Deploy CDK stack
   - Extract API Key from CloudFormation outputs
   - Test with curl/Postman

2. **Tavus Configuration**:
   - Configure Tavus persona with API endpoint and key
   - Test conversation flow
   - Verify cited URLs appear correctly

## Implementation Notes

### API Key Management

- API Keys are created and managed through AWS CDK
- Keys are output in CloudFormation stack outputs
- Simple single-key approach for MVP

### Security Considerations

1. **API Key Exposure**: Keys should be transmitted over HTTPS only
2. **Fixed Tenant**: All API Key requests use tenantId="default" and userId="default"
3. **Logging**: Avoid logging full API Keys (log only last 4 characters if needed)

### Backward Compatibility

This design guarantees zero breaking changes:
- Existing JWT authentication flow is unchanged
- No modifications to domain, use cases, or repositories
- Web application continues to work without any changes
- All existing tests continue to pass
