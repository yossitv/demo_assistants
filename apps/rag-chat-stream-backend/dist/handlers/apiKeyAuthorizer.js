"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handler = void 0;
const apiKey_1 = require("../shared/apiKey");
/**
 * Lambda authorizer handler for API key authentication
 * Extracts API key from Authorization or x-api-key header and returns IAM policy
 */
const handler = async (event) => {
    const { apiKey, hasAuthorizationHeader, hasXApiKeyHeader } = (0, apiKey_1.extractApiKeyFromHeaders)(event.headers);
    // Secure logging - never log actual API key values
    console.log(JSON.stringify({
        requestId: event.requestContext?.requestId || 'unknown',
        hasAuthorizationHeader,
        hasXApiKeyHeader,
        timestamp: new Date().toISOString(),
    }));
    // Validate API key exists and is not empty
    if (!apiKey || apiKey.length === 0) {
        throw new Error('Unauthorized');
    }
    const resourceArn = buildResourceArn(event.methodArn);
    // Return IAM policy allowing access to all API methods
    // Add context with tenant information for Lambda handlers
    const policy = {
        principalId: 'api-key-user',
        policyDocument: {
            Version: '2012-10-17',
            Statement: [
                {
                    Action: 'execute-api:Invoke',
                    Effect: 'Allow',
                    Resource: resourceArn,
                },
            ],
        },
        context: {
            tenantId: 'default', // Dedicated tenant ID for API key authentication
            userId: 'api-key-user', // User ID for API key authenticated requests
            authType: 'api-key', // Mark this as API key authentication
        },
        usageIdentifierKey: apiKey,
    };
    return policy;
};
exports.handler = handler;
/**
 * Build an IAM resource ARN that covers all methods/resources in the same stage.
 * Example input: arn:aws:execute-api:us-east-1:123456789012:apiId/prod/POST/resource
 * Output:         arn:aws:execute-api:us-east-1:123456789012:apiId/prod/* (method/resource wildcards)
 */
const buildResourceArn = (methodArn) => {
    const arnParts = methodArn.split(':');
    const apiGatewayPart = arnParts[5]?.split('/') ?? [];
    const [restApiId, stage] = apiGatewayPart;
    if (!restApiId || !stage) {
        return methodArn;
    }
    return `arn:${arnParts[1]}:execute-api:${arnParts[3]}:${arnParts[4]}:${restApiId}/${stage}/*/*`;
};
//# sourceMappingURL=apiKeyAuthorizer.js.map