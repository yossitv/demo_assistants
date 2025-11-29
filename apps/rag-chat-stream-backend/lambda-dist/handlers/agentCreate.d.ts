import { APIGatewayProxyEvent, APIGatewayProxyResult } from '../shared/types';
/**
 * Lambda handler for POST /v1/agent/create
 *
 * Creates a new Agent linked to one or more KnowledgeSpaces.
 * Requires Cognito JWT with custom:tenant_id claim.
 */
export declare const handler: (event: APIGatewayProxyEvent) => Promise<APIGatewayProxyResult>;
//# sourceMappingURL=agentCreate.d.ts.map