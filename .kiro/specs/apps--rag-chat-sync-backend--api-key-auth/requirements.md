# Requirements Document

## Introduction

This feature adds API Key authentication to the existing RAG chat backend to enable external services like Tavus to use the `/v1/chat/completions` endpoint as a custom LLM. The implementation maintains backward compatibility with existing JWT authentication while adding API Key as an alternative authentication method.

## Glossary

- **API Key**: A secret token used to authenticate requests from external services, managed through AWS API Gateway Usage Plans
- **JWT (JSON Web Token)**: The existing token-based authentication method using AWS Cognito
- **Tavus**: An external service that requires custom LLM integration via API
- **Chat Endpoint**: The `/v1/chat/completions` REST API endpoint that processes chat requests
- **Usage Plan**: AWS API Gateway feature for managing API Key access and rate limiting
- **ChatController**: The Lambda controller that handles chat completion requests
- **Fixed Tenant**: A hardcoded tenant identifier ("default") used for API Key authenticated requests

## Requirements

### Requirement 1

**User Story:** As an external service (Tavus), I want to authenticate using an API Key, so that I can use the chat endpoint as a custom LLM without requiring JWT tokens.

#### Acceptance Criteria

1. WHEN an external service sends a request with a valid API Key in the `x-api-key` or `X-API-Key` header, THEN the Chat Endpoint SHALL authenticate the request successfully
2. WHEN an external service sends a request with an invalid API Key, THEN the Chat Endpoint SHALL reject the request with 403 Forbidden status
3. WHEN an external service sends a request without any authentication (no JWT and no API Key), THEN the Chat Endpoint SHALL reject the request with 401 Unauthorized status
4. WHERE API Key authentication is used, the Chat Endpoint SHALL assign fixed values for tenantId ("default") and userId ("default")
5. WHERE API Key authentication is used, the Chat Endpoint SHALL process the chat request using the same ChatWithAgentUseCase as JWT requests

### Requirement 2

**User Story:** As a system administrator, I want JWT authentication to continue working unchanged, so that existing web application users are not affected by the API Key addition.

#### Acceptance Criteria

1. WHEN a request includes a valid JWT token, THEN the Chat Endpoint SHALL authenticate using the existing JWT flow
2. WHEN a request includes a valid JWT token, THEN the Chat Endpoint SHALL extract tenantId and userId from the JWT claims as before
3. WHEN both JWT and API Key are present in a request, THEN the Chat Endpoint SHALL prioritize JWT authentication
4. THE Chat Endpoint SHALL maintain backward compatibility with all existing JWT-authenticated requests
5. THE Chat Endpoint SHALL not modify the domain, use case, or repository layers

### Requirement 3

**User Story:** As a Tavus service, I want to receive responses in a compatible format, so that I can process the LLM output correctly.

#### Acceptance Criteria

1. WHEN an API Key authenticated request is processed, THEN the Chat Endpoint SHALL return a response containing a "completion" field with the LLM response text
2. WHEN an API Key authenticated request is processed, THEN the Chat Endpoint SHALL maintain OpenAI-compatible response structure
3. THE Chat Endpoint SHALL include cited URLs in the response when available from the RAG system
4. THE Chat Endpoint SHALL return appropriate error responses (4xx/5xx) with error messages when requests fail
5. WHEN the response is generated, THE Chat Endpoint SHALL use the same ChatWithAgentUseCase logic as JWT requests

### Requirement 4

**User Story:** As a system administrator, I want API Keys managed through AWS API Gateway, so that I can control access and monitor usage without building custom key management.

#### Acceptance Criteria

1. THE API Gateway SHALL create and manage API Keys through Usage Plans
2. THE API Gateway SHALL associate the `/v1/chat/completions` endpoint with API Key authentication requirement
3. THE API Gateway SHALL validate API Keys before forwarding requests to Lambda
4. THE API Gateway SHALL allow both API Key and JWT authentication methods on the same endpoint
5. THE API Gateway SHALL reject requests with invalid API Keys at the gateway level with 403 Forbidden status

### Requirement 5

**User Story:** As a developer, I want minimal changes to existing code, so that the risk of breaking existing functionality is minimized.

#### Acceptance Criteria

1. THE ChatController SHALL add API Key detection logic without modifying existing JWT authentication code
2. THE ChatController SHALL use a fallback pattern: if JWT fails, check for API Key
3. THE system SHALL not modify any domain entities, value objects, or use cases
4. THE system SHALL not modify any repository implementations
5. THE infrastructure changes SHALL be limited to API Gateway configuration and ChatController authentication logic
