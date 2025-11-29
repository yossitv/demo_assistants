import { APIGatewayProxyEvent, APIGatewayProxyResult } from '../shared/types';
import { DIContainer } from '../infrastructure/di/DIContainer';

/**
 * Lambda handler for POST /v1/knowledge/create
 * 
 * Creates a new KnowledgeSpace by crawling URLs and storing embeddings.
 * Requires Cognito JWT with custom:tenant_id claim.
 */
export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  const container = DIContainer.getInstance();
  const controller = container.getKnowledgeCreateController();
  return controller.handle(event);
};
