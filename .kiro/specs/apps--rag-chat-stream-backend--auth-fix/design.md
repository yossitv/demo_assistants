# Design Document

## Overview

This design implements minimum viable authentication security for the RAG Chat Stream Backend. The solution addresses critical security vulnerabilities by implementing fail-closed API key validation, JWT signature verification, and eliminating default tenant fallbacks. The design prioritizes simplicity and correctness over feature completeness, making it suitable for hackathon and demo environments where basic security is required but full production infrastructure is not available.

## Architecture

### Current State Analysis

The existing authentication implementation has several critical security flaws:

1. **API Key Authorizer Always Returns Allow**: The authorizer validates API key presence but always returns an Allow policy, making it ineffective
2. **JWT Decoded Without Verification**: Controllers use `decodeJwtWithoutVerification()` which accepts any JWT regardless of signature validity
3. **Default Tenant Fallback**: When authentication fails, the system falls back to `tenantId: "default"` and `userId: "default"`, allowing unauthorized access
4. **Inconsistent Authentication Logic**: Each controller implements its own authentication extraction logic with subtle differences
5. **Sensitive Data in Logs**: API keys and JWT tokens may be logged in plaintext

### Proposed Architecture

The solution introduces two layers of authentication:

**Layer 1: API Gateway Authorizer (API Key)**
- Validates API key against `EXPECTED_API_KEY` environment variable
- Returns Deny for any validation failure (fail-closed)
- Passes tenant/user context to Lambda handlers on success

**Layer 2: Controller Authentication (JWT + API Key)**
- Controllers validate JWT signatures using `JWT_SECRET`
- Centralized utilities ensure consistent validation logic
- No default tenant fallback - authentication failures return 401

```
┌─────────────────┐
│  API Gateway    │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Authorizer     │──── Validates API Key (fail-closed)
│  (API Key)      │──── Returns Allow/Deny
└────────┬────────┘
         │ Allow + Context
         ▼
┌─────────────────┐
│  Lambda Handler │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Controller     │──── Validates JWT signature
│                 │──── Extracts auth context
│                 │──── No default fallback
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Use Case       │──── Business logic with validated context
└─────────────────┘
```

## Components and Interfaces

### 1. API Key Validation Utility

**File**: `src/shared/apiKeyCheck.ts`

```typescript
export interface ApiKeyValidationResult {
  isValid: boolean;
  tenantId?: string;
  userId?: string;
  reason?: string;
}

export function validateApiKey(
  headers: HeaderMap,
  logger?: ILogger
): ApiKeyValidationResult
```

**Responsibilities**:
- Extract API key from Authorization header
- Compare against `EXPECTED_API_KEY` environment variable
- Return validation result with context
- Log validation attempts without exposing key values

### 2. JWT Verification Utility

**File**: `src/shared/jwtVerify.ts`

```typescript
export interface JwtPayload {
  sub: string;
  'custom:tenant_id': string;
  [key: string]: unknown;
}

export interface JwtVerificationResult {
  isValid: boolean;
  payload?: JwtPayload;
  error?: string;
}

export function verifyJwt(
  token: string,
  logger?: ILogger
): JwtVerificationResult
```

**Responsibilities**:
- Verify JWT signature using `JWT_SECRET` and HS256 algorithm
- Validate JWT structure and required claims
- Extract tenantId and userId from payload
- Reject tokens with invalid signatures or wrong algorithms
- Log verification attempts without exposing token values

### 3. Updated API Key Authorizer

**File**: `src/handlers/apiKeyAuthorizer.ts`

**Changes**:
- Use `validateApiKey()` utility
- Return Deny when `EXPECTED_API_KEY` is not set
- Return Deny when API key is missing or invalid
- Return Allow only when API key matches exactly
- Remove hardcoded `tenantId: "default"` from context

### 4. Updated Controllers

**Files**:
- `src/adapters/controllers/ChatController.ts`
- `src/adapters/controllers/StreamingChatController.ts`
- `src/adapters/controllers/ChatCompletionsStreamController.ts`

**Changes**:
- Remove `decodeJwtWithoutVerification()` method
- Use `verifyJwt()` utility for JWT authentication
- Use `validateApiKey()` utility for API key authentication
- Remove default tenant fallback logic
- Return 401 immediately when authentication fails
- Extract authentication context only from verified sources

### 5. Authentication Context Type

**File**: `src/shared/types.ts` (or new `src/shared/auth.ts`)

```typescript
export interface AuthenticationContext {
  tenantId: string;
  userId: string;
  authMethod: 'jwt' | 'apikey';
}

export class AuthenticationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AuthenticationError';
  }
}
```

## Data Models

### Environment Variables

```typescript
interface EnvironmentConfig {
  // Required for API key authentication
  EXPECTED_API_KEY?: string;
  
  // Required for JWT authentication
  JWT_SECRET?: string;
  
  // Legacy - to be removed
  TAVUS_API_KEY?: string;
  TEST_API_KEY?: string;
}
```

### API Key Authorizer Context

```typescript
interface AuthorizerContext {
  tenantId: string;      // Extracted from validated API key
  userId: string;        // Extracted from validated API key
  authType: 'api-key';   // Authentication method indicator
}
```

### JWT Claims Structure

```typescript
interface JwtClaims {
  sub: string;                    // User ID
  'custom:tenant_id': string;     // Tenant ID
  iat?: number;                   // Issued at
  exp?: number;                   // Expiration
  [key: string]: unknown;         // Other claims
}
```


## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system-essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

Based on the prework analysis, we have identified redundant properties. After property reflection, the following consolidated properties provide comprehensive coverage without duplication:

### Property 1: Invalid API keys are always rejected

*For any* API key value that does not match EXPECTED_API_KEY, the Authorizer should return Deny
**Validates: Requirements 1.3**

### Property 2: API key values are never logged

*For any* authentication attempt with an API key, captured log output should not contain the actual API key value
**Validates: Requirements 1.5, 5.2**

### Property 3: Invalid JWT signatures are rejected

*For any* JWT token with an invalid HS256 signature, the System should reject the request with 401
**Validates: Requirements 2.2**

### Property 4: JWT verification round trip

*For any* valid payload containing tenantId and userId, signing with HS256 and then verifying should return the same tenantId and userId
**Validates: Requirements 2.3**

### Property 5: Malformed JWTs are rejected

*For any* malformed JWT string (missing parts, invalid base64, invalid JSON), the System should reject the request with 401
**Validates: Requirements 2.4**

### Property 6: Non-HS256 algorithms are rejected

*For any* JWT with an algorithm other than HS256, the System should reject the request with 401
**Validates: Requirements 2.6**

### Property 7: Authentication failures prevent business logic execution

*For any* controller and any invalid authentication credentials, the response should be 401 and no business logic should execute
**Validates: Requirements 3.1, 6.4**

### Property 8: Default tenant is never used on auth failure

*For any* request that fails authentication, the tenantId should never be "default" and userId should never be "default"
**Validates: Requirements 3.2, 3.3, 3.4, 3.5**

### Property 9: Authentication utilities return valid context or throw

*For any* input to authentication utilities, the result should either be a valid AuthenticationContext with non-empty tenantId and userId, or an error should be thrown
**Validates: Requirements 4.3**

### Property 10: Token values are never logged

*For any* authentication attempt, captured log output should not contain actual JWT token values or API key values
**Validates: Requirements 4.4, 5.1, 5.3**

### Property 11: Authentication errors are typed

*For any* error condition in authentication utilities, the thrown error should be an instance of AuthenticationError
**Validates: Requirements 4.5**

### Property 12: Authentication logs include metadata

*For any* authentication event, the log output should include requestId and timestamp
**Validates: Requirements 5.4**

### Property 13: Failure logs are informative but secure

*For any* authentication failure, the log should contain a failure reason but should not contain credential values
**Validates: Requirements 5.5**

### Property 14: Successful authentication provides complete context

*For any* successful authentication, the resulting context should contain non-empty tenantId and userId
**Validates: Requirements 6.5**

## Error Handling

### Authentication Errors

All authentication failures should result in appropriate HTTP status codes:

- **401 Unauthorized**: Missing or invalid credentials
  - No API key provided
  - API key doesn't match EXPECTED_API_KEY
  - JWT signature verification fails
  - JWT is malformed
  - JWT uses wrong algorithm
  - Required environment variables not set

- **403 Forbidden**: Reserved for future authorization logic (not implemented in this phase)

### Error Response Format

```typescript
{
  "error": {
    "message": "Unauthorized"
  }
}
```

### Logging Strategy

**Success Logs**:
```typescript
{
  requestId: string;
  timestamp: string;
  authMethod: 'jwt' | 'apikey';
  hasApiKey?: boolean;
  hasJWT?: boolean;
  tenantId: string;
  userId: string;
}
```

**Failure Logs**:
```typescript
{
  requestId: string;
  timestamp: string;
  reason: string;
  hasApiKey?: boolean;
  hasJWT?: boolean;
  // Never include actual credential values
}
```

### Environment Variable Validation

Both `EXPECTED_API_KEY` and `JWT_SECRET` should be validated at startup:

```typescript
function validateEnvironment(): void {
  if (!process.env.EXPECTED_API_KEY) {
    console.warn('EXPECTED_API_KEY not set - API key authentication will fail');
  }
  
  if (!process.env.JWT_SECRET) {
    console.warn('JWT_SECRET not set - JWT authentication will fail');
  }
}
```

## Testing Strategy

### Unit Testing

Unit tests will verify specific examples and edge cases:

1. **API Key Validation**:
   - Valid API key returns success
   - Missing API key returns failure
   - Empty EXPECTED_API_KEY returns failure
   - API key with whitespace is normalized correctly

2. **JWT Verification**:
   - Valid JWT with correct signature returns payload
   - JWT with invalid signature returns error
   - Malformed JWT returns error
   - JWT with wrong algorithm returns error
   - Missing JWT_SECRET returns error

3. **Controller Authentication**:
   - Valid JWT extracts correct context
   - Valid API key extracts correct context
   - Invalid credentials return 401
   - No default tenant fallback occurs

4. **Authorizer**:
   - Valid API key returns Allow policy
   - Invalid API key returns Deny policy
   - Missing API key returns Deny policy
   - Missing EXPECTED_API_KEY returns Deny policy

### Property-Based Testing

Property-based tests will verify universal properties across many inputs using fast-check library:

1. **Property 1: Invalid API keys are always rejected**
   - Generate random API key values (excluding valid one)
   - Verify all return Deny

2. **Property 2: API key values are never logged**
   - Generate random API keys
   - Capture log output
   - Verify no log contains the actual key value

3. **Property 3: Invalid JWT signatures are rejected**
   - Generate JWTs with random invalid signatures
   - Verify all return 401

4. **Property 4: JWT verification round trip**
   - Generate random valid payloads
   - Sign and verify
   - Verify payload matches

5. **Property 5: Malformed JWTs are rejected**
   - Generate various malformed JWT strings
   - Verify all return 401

6. **Property 6: Non-HS256 algorithms are rejected**
   - Generate JWTs with different algorithms
   - Verify all return 401

7. **Property 7: Authentication failures prevent business logic**
   - Generate random invalid credentials
   - Verify 401 response and no side effects

8. **Property 8: Default tenant is never used**
   - Generate random invalid credentials
   - Verify tenantId and userId are never "default"

9. **Property 9: Authentication utilities return valid context or throw**
   - Generate random inputs
   - Verify result is either valid context or error

10. **Property 10: Token values are never logged**
    - Generate random tokens
    - Capture logs
    - Verify no logs contain token values

11. **Property 11: Authentication errors are typed**
    - Generate error conditions
    - Verify all errors are AuthenticationError instances

12. **Property 12: Authentication logs include metadata**
    - Generate random authentication attempts
    - Verify all logs include requestId and timestamp

13. **Property 13: Failure logs are informative but secure**
    - Generate authentication failures
    - Verify logs have reason but no credentials

14. **Property 14: Successful authentication provides complete context**
    - Generate valid credentials
    - Verify context has non-empty tenantId and userId

### Integration Testing

Integration tests will verify end-to-end authentication flows:

1. **API Gateway → Authorizer → Handler**:
   - Valid API key flows through to handler with context
   - Invalid API key is blocked at authorizer

2. **Controller → Use Case**:
   - Valid JWT flows through to use case with context
   - Invalid JWT is blocked at controller

3. **Multi-Controller Consistency**:
   - All three controllers handle authentication identically
   - Same credentials produce same results across controllers

## Implementation Notes

### JWT Library Selection

Use `jsonwebtoken` library for JWT operations:

```bash
npm install jsonwebtoken
npm install --save-dev @types/jsonwebtoken
```

This library provides:
- HS256 signature verification
- Algorithm validation
- Payload extraction
- Error handling for malformed tokens

### Migration Strategy

1. **Phase 1**: Add new utilities (`apiKeyCheck.ts`, `jwtVerify.ts`)
2. **Phase 2**: Update authorizer to use fail-closed validation
3. **Phase 3**: Update controllers to use new utilities
4. **Phase 4**: Remove `decodeJwtWithoutVerification` methods
5. **Phase 5**: Remove default tenant fallback logic
6. **Phase 6**: Add comprehensive tests

### Backward Compatibility

This is a breaking change that will reject previously accepted requests:

- Requests with invalid API keys will now be rejected
- Requests with unverified JWTs will now be rejected
- Requests relying on default tenant will now be rejected

**Migration Path**:
1. Ensure `EXPECTED_API_KEY` is set in all environments
2. Ensure `JWT_SECRET` is set in all environments
3. Update clients to use valid credentials
4. Deploy updated backend
5. Monitor logs for authentication failures

### Security Considerations

**What This Fixes**:
- Prevents unauthorized API access via invalid API keys
- Prevents JWT forgery and tampering
- Eliminates default tenant security hole
- Prevents credential leakage in logs

**What This Doesn't Fix** (out of scope for hackathon):
- API key rotation
- JWT expiration validation
- Rate limiting
- Brute force protection
- API key storage in secrets manager
- JWT refresh tokens
- Multi-factor authentication
- Role-based access control

### Performance Impact

Minimal performance impact expected:

- JWT verification adds ~1-2ms per request
- API key comparison is O(1) string comparison
- No additional network calls
- No database queries

### Monitoring and Observability

Add CloudWatch metrics for:

- Authentication success rate
- Authentication failure rate by reason
- API key vs JWT usage ratio
- Average authentication latency

Log aggregation should track:

- Authentication failure patterns
- Unusual authentication attempts
- Missing environment variable warnings
