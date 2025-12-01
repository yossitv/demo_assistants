import { APIGatewayRequestAuthorizerEvent, APIGatewayAuthorizerResult } from 'aws-lambda';
/**
 * Lambda authorizer handler for API key authentication
 * Extracts API key from Authorization or x-api-key header and returns IAM policy
 */
export declare const handler: (event: APIGatewayRequestAuthorizerEvent) => Promise<APIGatewayAuthorizerResult>;
//# sourceMappingURL=apiKeyAuthorizer.d.ts.map