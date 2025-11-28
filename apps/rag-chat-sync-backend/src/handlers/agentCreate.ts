import { APIGatewayProxyEvent, APIGatewayProxyResult } from '../shared/types';
import { DIContainer } from '../infrastructure/di/DIContainer';

/**
 * Lambda handler for POST /v1/agent/create
 * 
 * Creates a new Agent linked to one or more KnowledgeSpaces.
 * Requires Cognito JWT with custom:tenant_id claim.
 */
export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  const container = DIContainer.getInstance();
  const controller = container.getAgentCreateController();
  return controller.handle(event);
};
