import { APIGatewayProxyEvent, APIGatewayProxyResult } from '../shared/types';
/**
 * Lambda handler for POST /v1/chat/completions
 *
 * Processes chat requests with RAG (Retrieval-Augmented Generation).
 * Requires Cognito JWT with custom:tenant_id and sub claims.
 * Returns OpenAI-compatible chat completion with cited sources.
 */
export declare const handler: (event: APIGatewayProxyEvent) => Promise<APIGatewayProxyResult>;
//# sourceMappingURL=chat.d.ts.map