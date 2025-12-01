import { APIGatewayRequestAuthorizerEvent, APIGatewayAuthorizerResult } from 'aws-lambda';
/**
 * Lambda authorizer handler for API key authentication
 * Uses fail-closed validation - denies access unless API key is valid
 */
export declare const handler: (event: APIGatewayRequestAuthorizerEvent) => Promise<APIGatewayAuthorizerResult>;
//# sourceMappingURL=apiKeyAuthorizer.d.ts.map