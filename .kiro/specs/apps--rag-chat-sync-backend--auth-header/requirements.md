# Requirements Document

## Introduction

This feature extends the existing API Key authentication to support API keys sent via the `Authorization` header instead of only the `x-api-key` header. This is required because Tavus cannot send the `x-api-key` header and needs to use the `Authorization` header format. The implementation uses a custom Lambda authorizer to extract the API key from the `Authorization` header and validate it against AWS API Gateway Usage Plans.

## Glossary

- **Authorization Header**: HTTP header typically used for bearer tokens, repurposed here to carry API keys
- **Custom Authorizer**: AWS Lambda function that validates authentication and returns an IAM policy
- **Usage Identifier Key**: The API key value passed to API Gateway for usage plan validation
- **API Gateway**: AWS service that validates API keys and enforces usage plans
- **Usage Plan**: AWS API Gateway feature for managing API key access and rate limiting
- **IAM Policy**: Document returned by authorizer that grants or denies access to API resources
- **Principal**: Identity value required in authorizer response (can be dummy value)
- **Request Context**: Data passed from authorizer to Lambda handler via event.requestContext.authorizer
- **Access Logs**: CloudWatch logs that record API Gateway request/response details

## Requirements

### Requirement 1

**User Story:** As an external service (Tavus), I want to send my API key in the Authorization header, so that I can authenticate with the chat API using my standard HTTP client configuration.

#### Acceptance Criteria

1. WHEN an external service sends a request with a valid API key in the `Authorization` header, THEN the system SHALL authenticate the request successfully
2. WHEN the `Authorization` header contains a valid API key, THEN the custom authorizer SHALL extract the key value and pass it to API Gateway for validation
3. WHEN the API key in the `Authorization` header is valid, THEN the system SHALL return a 200 status with the chat completion response
4. THE system SHALL support API keys in the format `Authorization: <api-key-value>` without any prefix
5. THE system SHALL continue to support the existing `x-api-key` header format for backward compatibility

### Requirement 2

**User Story:** As a system administrator, I want invalid or missing Authorization headers to be rejected, so that unauthorized access is prevented.

#### Acceptance Criteria

1. WHEN a request has no `Authorization` header and no `x-api-key` header, THEN the system SHALL reject the request with 401 Unauthorized status
2. WHEN the `Authorization` header is present but empty, THEN the system SHALL reject the request with 401 Unauthorized status
3. WHEN the `Authorization` header contains an invalid API key, THEN API Gateway SHALL reject the request with 403 Forbidden status
4. WHEN the custom authorizer fails to validate the API key, THEN the system SHALL return an appropriate error response
5. THE system SHALL log authentication failures with request ID and header presence information

### Requirement 3

**User Story:** As a system administrator, I want the custom authorizer to use the AUTHORIZER API key source, so that API Gateway validates keys from the Authorization header.

#### Acceptance Criteria

1. THE API Gateway SHALL be configured with `apiKeySourceType` set to `AUTHORIZER`
2. WHEN the custom authorizer returns a policy, THEN it SHALL include the `usageIdentifierKey` field with the extracted API key value
3. THE API Gateway SHALL use the `usageIdentifierKey` to validate against the existing Usage Plan
4. THE existing Usage Plan and API key values SHALL remain unchanged
5. THE system SHALL not require changes to existing API key values or CloudFormation outputs

### Requirement 4

**User Story:** As a security administrator, I want API keys to be handled securely in logs, so that sensitive credentials are not exposed.

#### Acceptance Criteria

1. WHEN the custom authorizer logs information, THEN it SHALL NOT log the full API key value
2. THE custom authorizer SHALL log the request ID for correlation with access logs
3. THE custom authorizer SHALL log whether the Authorization header is present or absent
4. THE access logs SHALL record request status (200, 401, 403) for monitoring
5. THE system SHALL maintain existing CloudWatch logging configuration for API Gateway

### Requirement 5

**User Story:** As a developer, I want the custom authorizer to be simple and focused, so that it is easy to maintain and debug.

#### Acceptance Criteria

1. THE custom authorizer SHALL extract the API key from the `Authorization` header
2. THE custom authorizer SHALL return an IAM policy with `usageIdentifierKey` set to the extracted API key
3. THE custom authorizer SHALL use a dummy Principal value (e.g., "api-key-user")
4. THE custom authorizer SHALL have minimal dependencies (only AWS SDK if needed)
5. THE custom authorizer SHALL complete execution quickly (under 100ms for typical requests)

### Requirement 6

**User Story:** As a system administrator, I want all chat endpoints to use the custom authorizer, so that Authorization header authentication works consistently.

#### Acceptance Criteria

1. THE `/v1/chat/completions` endpoint SHALL use the custom authorizer
2. THE `/v1/knowledge/create` endpoint SHALL use the custom authorizer
3. THE `/v1/knowledge/list` endpoint SHALL use the custom authorizer
4. THE `/v1/agent/create` endpoint SHALL use the custom authorizer
5. THE system SHALL not use Cognito authorization for these endpoints when using API key authentication

### Requirement 7

**User Story:** As a developer, I want the custom authorizer to have appropriate IAM permissions, so that it can log to CloudWatch.

#### Acceptance Criteria

1. THE custom authorizer Lambda function SHALL have an IAM role with CloudWatch Logs permissions
2. THE IAM role SHALL allow `logs:CreateLogGroup`, `logs:CreateLogStream`, and `logs:PutLogEvents` actions
3. THE custom authorizer SHALL be able to write logs to CloudWatch Logs
4. THE system SHALL maintain existing API Gateway access log configuration
5. THE custom authorizer SHALL not require any additional AWS service permissions beyond CloudWatch Logs

### Requirement 8

**User Story:** As a tester, I want clear acceptance criteria for testing, so that I can verify the implementation works correctly.

#### Acceptance Criteria

1. WHEN a request includes `Authorization: example-test-api-key-12345` header with a valid agent ID, THEN the system SHALL return 200 status
2. WHEN a request has no `Authorization` header and no `x-api-key` header, THEN the system SHALL return 401 status
3. WHEN a request includes an invalid API key in the `Authorization` header, THEN the system SHALL return 403 status
4. THE access logs SHALL show 200, 401, and 403 status codes for the respective test cases
5. THE existing API key value from CloudFormation outputs SHALL work in the `Authorization` header without modification
