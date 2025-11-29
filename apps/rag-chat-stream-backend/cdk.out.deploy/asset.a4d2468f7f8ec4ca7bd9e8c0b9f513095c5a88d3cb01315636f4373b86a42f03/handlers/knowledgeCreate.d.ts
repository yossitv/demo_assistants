import { APIGatewayProxyEvent, APIGatewayProxyResult } from '../shared/types';
/**
 * Lambda handler for POST /v1/knowledge/create
 *
 * Creates a new KnowledgeSpace by crawling URLs and storing embeddings.
 * Requires Cognito JWT with custom:tenant_id claim.
 */
export declare const handler: (event: APIGatewayProxyEvent) => Promise<APIGatewayProxyResult>;
//# sourceMappingURL=knowledgeCreate.d.ts.map