# Design Document

## Overview

This design extends the existing API key authentication to support API keys sent via the `Authorization` header by implementing a custom Lambda authorizer. The current implementation only supports the `x-api-key` header, which Tavus cannot use. By changing the API Gateway's `apiKeySourceType` to `AUTHORIZER` and implementing a custom Lambda authorizer, we enable API Gateway to validate keys extracted from the `Authorization` header against existing Usage Plans.

The design maintains backward compatibility by supporting both header formats and reuses all existing API key values and Usage Plans without modification.

## Architecture

### Authentication Flow with Custom Authorizer

```
┌─────────────────┐
│  External       │
│  Service        │
│  (Tavus)        │
└────────┬────────┘
         │ Authorization: <api-key>
         ▼
┌──────────────────────────────────────────────────┐
│  API Gateway                                     │
│  ┌────────────────────────────────────────────┐ │
│  │ Custom Lambda Authorizer                   │ │
│  │                                            │ │
│  │ 1. Extract key from Authorization header  │ │
│  │ 2. Return IAM policy with                 │ │
│  │    usageIdentifierKey = <api-key>         │ │
│  │ 3. Principal = "api-key-user"             │ │
│  └────────────────┬───────────────────────────┘ │
│                   │                              │
│  ┌────────────────▼───────────────────────────┐ │
│  │ API Gateway Usage Plan Validation         │ │
│  │                                            │ │
│  │ - Validates usageIdentifierKey against    │ │
│  │   existing Usage Plan                     │ │
│  │ - Returns 403 if key invalid              │ │
│  │ - Passes request if key valid             │ │
│  └────────────────┬───────────────────────────┘ │
└───────────────────┼──────────────────────────────┘
                    │ Valid
                    ▼
┌──────────────────────────────────────────────────┐
│  Lambda: chat.handler (or other endpoints)       │
│  ┌────────────────────────────────────────────┐ │
│  │ Existing Handler Logic                     │ │
│  │                                            │ │
│  │ - Receives request with authorizer context│ │
│  │ - Processes normally                       │ │
│  │ - No changes needed                        │ │
│  └────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────┘
```

### Dual Header Support

The system will support both header formats:

1. **Authorization header** (new): `Authorization: <api-key-value>`
   - Extracted by custom authorizer
   - Passed to API Gateway via `usageIdentifierKey`
   - Validated against Usage Plan

2. **x-api-key header** (existing): `x-api-key: <api-key-value>`
   - Handled by API Gateway directly when `apiKeySourceType` is `HEADER`
   - For backward compatibility, authorizer can check this as fallback

### API Key Source Type Change

The key architectural change is setting `apiKeySourceType` to `AUTHORIZER`:

- **Before**: `apiKeySourceType: HEADER` (default)
  - API Gateway looks for `x-api-key` header
  - Validates directly against Usage Plan

- **After**: `apiKeySourceType: AUTHORIZER`
  - API Gateway calls custom authorizer first
  - Authorizer returns `usageIdentifierKey` in policy
  - API Gateway validates `usageIdentifierKey` against Usage Plan

## Components and Interfaces

### New Components

#### 1. Custom Lambda Authorizer

**File**: `src/handlers/apiKeyAuthorizer.ts`

**Purpose**: Extract API key from Authorization header and return IAM policy with usageIdentifierKey

**Interface**:
```typescript
export interface APIGatewayAuthorizerEvent {
  type: 'REQUEST';
  methodArn: string;
  headers: {
    [key: string]: string | undefined;
  };
  requestContext: {
    requestId: string;
    apiId: string;
    stage: string;
    // ... other fields
  };
}

export interface APIGatewayAuthorizerResult {
  principalId: string;
  policyDocument: {
    Version: string;
    Statement: Array<{
      Action: string;
      Effect: 'Allow' | 'Deny';
      Resource: string;
    }>;
  };
  usageIdentifierKey?: string;
  context?: {
    [key: string]: string | number | boolean;
  };
}

export async function handler(
  event: APIGatewayAuthorizerEvent
): Promise<APIGatewayAuthorizerResult>
```

**Implementation Logic**:
```typescript
export async function handler(
  event: APIGatewayAuthorizerEvent
): Promise<APIGatewayAuthorizerResult> {
  const requestId = event.requestContext.requestId;
  
  // Extract API key from Authorization header (case-insensitive)
  const authHeader = event.headers['Authorization'] || 
                     event.headers['authorization'];
  
  // Fallback to x-api-key for backward compatibility
  const xApiKey = event.headers['x-api-key'] || 
                  event.headers['X-API-Key'];
  
  const apiKey = authHeader || xApiKey;
  
  // Log header presence (not the key value)
  console.log(JSON.stringify({
    requestId,
    hasAuthorizationHeader: !!authHeader,
    hasXApiKeyHeader: !!xApiKey,
    timestamp: new Date().toISOString()
  }));
  
  // Reject if no API key found
  if (!apiKey || apiKey.trim() === '') {
    console.log(JSON.stringify({
      requestId,
      error: 'No API key provided',
      timestamp: new Date().toISOString()
    }));
    
    throw new Error('Unauthorized'); // API Gateway returns 401
  }
  
  // Return policy with usageIdentifierKey
  // API Gateway will validate this key against Usage Plan
  return {
    principalId: 'api-key-user',
    policyDocument: {
      Version: '2012-10-17',
      Statement: [
        {
          Action: 'execute-api:Invoke',
          Effect: 'Allow',
          Resource: event.methodArn
        }
      ]
    },
    usageIdentifierKey: apiKey.trim()
  };
}
```

**Key Design Decisions**:
- **Dummy Principal**: Uses fixed "api-key-user" since we don't need user identity
- **No Key Validation**: Authorizer doesn't validate the key; API Gateway does via Usage Plan
- **Fallback Support**: Checks both Authorization and x-api-key headers
- **Security Logging**: Logs header presence but never logs the actual key value
- **Error Handling**: Throws Error for missing keys, which API Gateway converts to 401

#### 2. CDK Stack Modifications

**File**: `infrastructure/lib/rag-chat-backend-stack.ts`

**Changes**:

1. **Create Authorizer Lambda**:
```typescript
// Custom API Key Authorizer Lambda
const apiKeyAuthorizerLambda = new lambda.Function(this, 'ApiKeyAuthorizerFunction', {
  runtime: lambda.Runtime.NODEJS_20_X,
  handler: 'handlers/apiKeyAuthorizer.handler',
  code: lambda.Code.fromAsset(lambdaAssetPath),
  timeout: cdk.Duration.seconds(5),
  memorySize: 128,
  role: new iam.Role(this, 'ApiKeyAuthorizerRole', {
    assumedBy: new iam.ServicePrincipal('lambda.amazonaws.com'),
    managedPolicies: [
      iam.ManagedPolicy.fromAwsManagedPolicyName('service-role/AWSLambdaBasicExecutionRole'),
    ],
  }),
});
```

2. **Create API Gateway Authorizer**:
```typescript
// Create custom authorizer for API Gateway
const apiKeyAuthorizer = new apigateway.RequestAuthorizer(this, 'ApiKeyAuthorizer', {
  handler: apiKeyAuthorizerLambda,
  identitySources: [
    apigateway.IdentitySource.header('Authorization'),
    apigateway.IdentitySource.header('x-api-key')
  ],
  resultsCacheTtl: cdk.Duration.seconds(0), // Disable caching for MVP
});
```

3. **Configure API Gateway with AUTHORIZER source**:
```typescript
// Set API key source to AUTHORIZER
const api = new apigateway.RestApi(this, 'RagChatApi', {
  restApiName: 'RAG Chat Backend API',
  description: 'OpenAI-compatible RAG chat API with knowledge management',
  apiKeySourceType: apigateway.ApiKeySourceType.AUTHORIZER, // NEW
  // ... rest of config
});
```

4. **Update Method Configurations**:
```typescript
// Update all endpoints to use custom authorizer
knowledgeCreate.addMethod('POST', new apigateway.LambdaIntegration(knowledgeCreateLambda), {
  authorizer: apiKeyAuthorizer,
  authorizationType: apigateway.AuthorizationType.CUSTOM,
  apiKeyRequired: true,
});

knowledgeList.addMethod('GET', new apigateway.LambdaIntegration(knowledgeListLambda), {
  authorizer: apiKeyAuthorizer,
  authorizationType: apigateway.AuthorizationType.CUSTOM,
  apiKeyRequired: true,
});

agentCreate.addMethod('POST', new apigateway.LambdaIntegration(agentCreateLambda), {
  authorizer: apiKeyAuthorizer,
  authorizationType: apigateway.AuthorizationType.CUSTOM,
  apiKeyRequired: true,
});

chatCompletions.addMethod('POST', new apigateway.LambdaIntegration(chatLambda), {
  authorizer: apiKeyAuthorizer,
  authorizationType: apigateway.AuthorizationType.CUSTOM,
  apiKeyRequired: true,
});
```

### Unchanged Components

The following components require **no modifications**:

- **All Lambda Handlers**: chat.ts, knowledgeCreate.ts, knowledgeList.ts, agentCreate.ts
- **All Controllers**: ChatController, KnowledgeCreateController, etc.
- **Domain Layer**: All entities, value objects, and interfaces
- **Use Cases**: All use case implementations
- **Repositories**: All repository implementations
- **Infrastructure Services**: OpenAI, Cheerio, Tiktoken services
- **API Key and Usage Plan**: Existing resources remain unchanged

## Data Models

No changes to existing data models. The authorizer uses standard AWS types:

### APIGatewayAuthorizerEvent
```typescript
{
  type: 'REQUEST',
  methodArn: string,
  headers: { [key: string]: string | undefined },
  requestContext: {
    requestId: string,
    apiId: string,
    stage: string
  }
}
```

### APIGatewayAuthorizerResult
```typescript
{
  principalId: string,
  policyDocument: {
    Version: '2012-10-17',
    Statement: [{
      Action: 'execute-api:Invoke',
      Effect: 'Allow' | 'Deny',
      Resource: string
    }]
  },
  usageIdentifierKey: string,  // The extracted API key
  context?: { [key: string]: string | number | boolean }
}
```

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system—essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*


### Property 1: Authorization header extraction

*For any* non-empty API key string in the Authorization header, the custom authorizer should extract it and include it in the usageIdentifierKey field of the returned policy.

**Validates: Requirements 1.1, 1.2, 5.1**

### Property 2: No prefix required

*For any* API key string without a "Bearer" or other prefix in the Authorization header, the custom authorizer should extract it correctly without requiring any prefix format.

**Validates: Requirements 1.4**

### Property 3: Backward compatibility with x-api-key

*For any* API key string in the x-api-key header when Authorization header is absent, the custom authorizer should extract it and include it in the usageIdentifierKey field.

**Validates: Requirements 1.5**

### Property 4: UsageIdentifierKey matches extracted key

*For any* API key provided in either Authorization or x-api-key header, the usageIdentifierKey in the returned policy should exactly match the extracted key value (trimmed).

**Validates: Requirements 3.2, 5.2**

### Property 5: Fixed principal ID

*For any* authenticated request, the custom authorizer should return principalId="api-key-user" regardless of the API key value.

**Validates: Requirements 5.3**

### Property 6: API key not logged

*For any* API key value processed by the authorizer, the log output should never contain the full API key string.

**Validates: Requirements 4.1**

### Property 7: Request ID logged

*For any* request processed by the authorizer, the log output should contain the requestId field from the event.

**Validates: Requirements 4.2**

### Property 8: Header presence logged

*For any* request processed by the authorizer, the log output should indicate whether the Authorization header and x-api-key header are present or absent.

**Validates: Requirements 4.3**

## Error Handling

### Authorizer Level

| Error Condition | Response | Behavior |
|----------------|----------|----------|
| No Authorization or x-api-key header | Throw Error('Unauthorized') | API Gateway returns 401 |
| Empty Authorization header | Throw Error('Unauthorized') | API Gateway returns 401 |
| Empty x-api-key header (no Authorization) | Throw Error('Unauthorized') | API Gateway returns 401 |
| Authorizer execution error | API Gateway default error | API Gateway returns 500 |

### API Gateway Level

| Error Condition | Status Code | Response | Handler |
|----------------|-------------|----------|---------|
| Authorizer returns error | 401 Unauthorized | `{"message": "Unauthorized"}` | API Gateway |
| Invalid usageIdentifierKey | 403 Forbidden | `{"message": "Forbidden"}` | API Gateway |
| Valid key, rate limit exceeded | 429 Too Many Requests | `{"message": "Too Many Requests"}` | API Gateway |

### Lambda Handler Level

No changes to existing error handling in Lambda handlers. They continue to work as before.

### Error Logging

Authorizer logs include:
- `requestId`: API Gateway request ID for correlation
- `hasAuthorizationHeader`: Boolean indicating Authorization header presence
- `hasXApiKeyHeader`: Boolean indicating x-api-key header presence
- `error`: Error message (if applicable)
- `timestamp`: ISO 8601 timestamp

Example log entry:
```json
{
  "requestId": "abc-123-def",
  "hasAuthorizationHeader": true,
  "hasXApiKeyHeader": false,
  "timestamp": "2025-11-25T10:30:00.000Z"
}
```

## Testing Strategy

### Unit Tests

Unit tests verify the authorizer logic in isolation:

1. **Header Extraction Tests**:
   - Authorization header with valid key → Extracts correctly
   - x-api-key header with valid key → Extracts correctly
   - Both headers present → Authorization takes priority
   - Case-insensitive header names → Works correctly

2. **Error Cases**:
   - No headers → Throws error
   - Empty Authorization header → Throws error
   - Whitespace-only key → Throws error

3. **Policy Structure Tests**:
   - Returned policy has correct structure
   - principalId is "api-key-user"
   - usageIdentifierKey matches extracted key
   - Policy allows execute-api:Invoke

4. **Logging Tests**:
   - Logs contain requestId
   - Logs contain header presence flags
   - Logs never contain actual API key value

### Property-Based Tests

Property-based tests verify universal properties across all inputs using the fast-check library with a minimum of 100 iterations per property.

Each property-based test must:
- Run at least 100 iterations
- Include a comment tag referencing the design document property
- Test the general behavior across randomized inputs

**Test File**: `src/handlers/apiKeyAuthorizer.property.test.ts`

1. **Property 1: Authorization Header Extraction**
   - **Tag**: `**Feature: authorization-header-auth, Property 1: Authorization header extraction**`
   - **Test**: Generate random API key strings, verify usageIdentifierKey matches

2. **Property 2: No Prefix Required**
   - **Tag**: `**Feature: authorization-header-auth, Property 2: No prefix required**`
   - **Test**: Generate random strings without prefixes, verify extraction works

3. **Property 3: Backward Compatibility**
   - **Tag**: `**Feature: authorization-header-auth, Property 3: Backward compatibility with x-api-key**`
   - **Test**: Generate random keys in x-api-key header, verify extraction

4. **Property 4: UsageIdentifierKey Correctness**
   - **Tag**: `**Feature: authorization-header-auth, Property 4: UsageIdentifierKey matches extracted key**`
   - **Test**: Generate random keys, verify usageIdentifierKey equals trimmed key

5. **Property 5: Fixed Principal**
   - **Tag**: `**Feature: authorization-header-auth, Property 5: Fixed principal ID**`
   - **Test**: Generate random keys, verify principalId is always "api-key-user"

6. **Property 6: Key Not Logged**
   - **Tag**: `**Feature: authorization-header-auth, Property 6: API key not logged**`
   - **Test**: Generate random keys, verify they don't appear in log output

7. **Property 7: Request ID Logged**
   - **Tag**: `**Feature: authorization-header-auth, Property 7: Request ID logged**`
   - **Test**: Generate random request IDs, verify they appear in logs

8. **Property 8: Header Presence Logged**
   - **Tag**: `**Feature: authorization-header-auth, Property 8: Header presence logged**`
   - **Test**: Generate random header combinations, verify presence flags in logs

### Integration Tests

Integration tests verify end-to-end behavior with deployed infrastructure:

1. **API Gateway Configuration**:
   - Verify apiKeySourceType is AUTHORIZER in synthesized template
   - Verify all endpoints use custom authorizer
   - Verify authorizer Lambda has correct IAM permissions

2. **End-to-End Authentication**:
   - Send request with valid API key in Authorization header → 200
   - Send request with invalid API key → 403
   - Send request with no auth → 401
   - Send request with valid x-api-key header → 200

3. **Access Log Verification**:
   - Verify access logs contain status codes
   - Verify access logs contain authorizer principal

4. **Tavus Compatibility**:
   - Test with actual Tavus API key format
   - Verify response format matches expectations

### Manual Testing

1. **Deploy and Extract Key**:
   - Deploy CDK stack
   - Extract API key from CloudFormation outputs
   - Note API Gateway endpoint URL

2. **Test with curl**:
```bash
# Test with Authorization header
curl -X POST https://api-url/v1/chat/completions \
  -H "Authorization: <api-key>" \
  -H "Content-Type: application/json" \
  -d '{"model": "agent-id", "messages": [{"role": "user", "content": "test"}]}'

# Test with x-api-key header (backward compatibility)
curl -X POST https://api-url/v1/chat/completions \
  -H "x-api-key: <api-key>" \
  -H "Content-Type: application/json" \
  -d '{"model": "agent-id", "messages": [{"role": "user", "content": "test"}]}'

# Test with no auth (should fail)
curl -X POST https://api-url/v1/chat/completions \
  -H "Content-Type: application/json" \
  -d '{"model": "agent-id", "messages": [{"role": "user", "content": "test"}]}'
```

3. **Verify Logs**:
   - Check CloudWatch Logs for authorizer
   - Verify no API keys are logged
   - Verify request IDs and header presence flags

## Implementation Notes

### API Key Source Type

The `apiKeySourceType: AUTHORIZER` setting is critical:
- Tells API Gateway to get the usage identifier from the authorizer's response
- Without this, API Gateway would only check the x-api-key header
- Must be set at the RestApi level, not per-method

### Authorizer Caching

For MVP, caching is disabled (`resultsCacheTtl: 0`):
- Simplifies testing and debugging
- Ensures authorizer runs on every request
- Can be enabled later for performance (e.g., 5 minutes)

### Identity Sources

The authorizer specifies both headers as identity sources:
```typescript
identitySources: [
  apigateway.IdentitySource.header('Authorization'),
  apigateway.IdentitySource.header('x-api-key')
]
```

This tells API Gateway which headers to pass to the authorizer. The authorizer checks both for maximum compatibility.

### Security Considerations

1. **HTTPS Only**: API keys should only be transmitted over HTTPS
2. **No Key Logging**: Authorizer never logs the actual key value
3. **Minimal Permissions**: Authorizer only needs CloudWatch Logs permissions
4. **Error Messages**: Generic error messages to avoid information leakage

### Backward Compatibility

This design maintains full backward compatibility:
- Existing x-api-key header continues to work
- No changes to Lambda handlers
- No changes to API key values
- No changes to Usage Plans
- Web application continues to work unchanged

### Migration Path

For clients currently using x-api-key:
1. No action required - x-api-key continues to work
2. Can optionally migrate to Authorization header
3. Both formats work simultaneously

For new clients (Tavus):
1. Use Authorization header with existing API key value
2. No prefix required
3. Same API key value as x-api-key clients

## Deployment Considerations

### CDK Deployment Order

1. Create authorizer Lambda function
2. Create authorizer IAM role with CloudWatch permissions
3. Create API Gateway authorizer resource
4. Update RestApi with apiKeySourceType
5. Update all method configurations to use custom authorizer

### CloudFormation Changes

The deployment will modify:
- RestApi resource (add apiKeySourceType)
- Method resources (change authorizer)
- Add new Lambda function
- Add new IAM role

No changes to:
- API Key resources
- Usage Plan resources
- Lambda handler functions
- DynamoDB tables

### Rollback Plan

If issues occur:
1. Revert CDK stack to previous version
2. API Gateway returns to x-api-key only mode
3. No data loss or corruption possible

### Testing Before Production

1. Deploy to test environment first
2. Verify all test cases pass
3. Test with actual Tavus integration
4. Monitor CloudWatch Logs for errors
5. Verify access logs show correct status codes
