import { APIGatewayProxyEvent, APIGatewayProxyResult } from '../shared/types';
import { DIContainer } from '../infrastructure/di/DIContainer';

/**
 * Lambda handler for GET /v1/knowledge/list
 * 
 * Lists all KnowledgeSpaces for a tenant.
 * Requires Cognito JWT with custom:tenant_id claim.
 */
export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  const container = DIContainer.getInstance();
  const controller = container.getKnowledgeListController();
  return controller.handle(event);
};
