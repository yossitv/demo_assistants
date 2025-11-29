import { APIGatewayProxyEvent, APIGatewayProxyResult } from '../shared/types';
/**
 * Lambda handler for GET /v1/knowledge/list
 *
 * Lists all KnowledgeSpaces for a tenant.
 * Requires Cognito JWT with custom:tenant_id claim.
 */
export declare const handler: (event: APIGatewayProxyEvent) => Promise<APIGatewayProxyResult>;
//# sourceMappingURL=knowledgeList.d.ts.map