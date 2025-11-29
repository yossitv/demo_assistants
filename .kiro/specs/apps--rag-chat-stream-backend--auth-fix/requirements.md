# Requirements Document

## Introduction

This specification defines the minimum authentication security improvements required for the RAG Chat Stream Backend to prevent unauthorized access in a hackathon/demo environment. The goal is to implement fail-closed authentication that blocks unauthorized requests without requiring full production-grade security infrastructure.

## Glossary

- **System**: The RAG Chat Stream Backend API service
- **API Key**: A secret token provided in the Authorization header
- **JWT**: JSON Web Token containing user identity and tenant information
- **Fail-Closed**: Security posture where authentication failures result in access denial (401/403)
- **Fail-Open**: Insecure posture where authentication failures allow access (forbidden)
- **Authorizer**: AWS Lambda function that validates requests before routing to handlers
- **Tenant ID**: Unique identifier for a customer/organization in multi-tenant system
- **User ID**: Unique identifier for an individual user within a tenant
- **HS256**: HMAC-SHA256 symmetric signature algorithm for JWT validation

## Requirements

### Requirement 1

**User Story:** As a system administrator, I want API key authentication to use fail-closed validation, so that only requests with valid API keys can access the system.

#### Acceptance Criteria

1. WHEN the EXPECTED_API_KEY environment variable is not set THEN the Authorizer SHALL return Deny
2. WHEN a request contains no API key in Authorization header THEN the Authorizer SHALL return Deny
3. WHEN a request contains an API key that does not match EXPECTED_API_KEY THEN the Authorizer SHALL return Deny
4. WHEN a request contains an API key that matches EXPECTED_API_KEY THEN the Authorizer SHALL return Allow with context
5. WHEN the Authorizer processes a request THEN the System SHALL NOT log the actual API key value

### Requirement 2

**User Story:** As a system administrator, I want JWT tokens to be cryptographically verified, so that forged or tampered tokens are rejected.

#### Acceptance Criteria

1. WHEN the JWT_SECRET environment variable is not set THEN the System SHALL reject JWT authentication with 401
2. WHEN a request contains a JWT with an invalid HS256 signature THEN the System SHALL reject the request with 401
3. WHEN a request contains a JWT with a valid HS256 signature THEN the System SHALL extract tenantId and userId from the payload
4. WHEN a request contains a malformed JWT THEN the System SHALL reject the request with 401
5. WHEN the System processes JWT tokens THEN the System SHALL NOT use decodeJwtWithoutVerification function
6. THE System SHALL accept only HS256 algorithm for JWTs and SHALL reject all other alg values

### Requirement 3

**User Story:** As a security engineer, I want to eliminate default tenant fallbacks, so that authentication failures do not grant access to a default tenant.

#### Acceptance Criteria

1. WHEN authentication fails in any controller THEN the System SHALL return 401 without executing business logic
2. WHEN no valid authentication context is established THEN the System SHALL NOT use tenantId "default"
3. WHEN no valid authentication context is established THEN the System SHALL NOT assign userId "default"
4. WHEN API key validation fails THEN the System SHALL NOT fall back to default tenant
5. WHEN JWT validation fails THEN the System SHALL NOT fall back to default tenant

### Requirement 4

**User Story:** As a developer, I want centralized authentication utilities, so that authentication logic is consistent across all controllers.

#### Acceptance Criteria

1. WHEN the System validates API keys THEN the System SHALL use a shared apiKeyCheck utility function
2. WHEN the System validates JWT tokens THEN the System SHALL use a shared jwtVerify utility function
3. WHEN authentication utilities are invoked THEN the utilities SHALL return structured authentication context or throw errors
4. WHEN authentication utilities log information THEN the utilities SHALL NOT log sensitive token values
5. WHEN authentication utilities encounter errors THEN the utilities SHALL throw typed authentication errors

### Requirement 5

**User Story:** As a system operator, I want secure logging practices, so that sensitive credentials are not exposed in logs.

#### Acceptance Criteria

1. WHEN the System logs authentication events THEN the System SHALL log only presence flags (hasApiKey, hasJWT)
2. WHEN the System logs authentication events THEN the System SHALL NOT log actual API key values
3. WHEN the System logs authentication events THEN the System SHALL NOT log actual JWT token values
4. WHEN the System logs authentication events THEN the System SHALL include request metadata (requestId, timestamp)
5. WHEN authentication fails THEN the System SHALL log the failure reason without exposing credentials

### Requirement 6

**User Story:** As a developer, I want all controllers to use consistent authentication, so that security policies are uniformly enforced.

#### Acceptance Criteria

1. WHEN ChatController processes a request THEN the controller SHALL use centralized authentication utilities
2. WHEN StreamingChatController processes a request THEN the controller SHALL use centralized authentication utilities
3. WHEN ChatCompletionsStreamController processes a request THEN the controller SHALL use centralized authentication utilities
4. WHEN any controller fails authentication THEN the controller SHALL return 401 before executing business logic
5. WHEN any controller succeeds authentication THEN the controller SHALL extract tenantId and userId from authentication context
