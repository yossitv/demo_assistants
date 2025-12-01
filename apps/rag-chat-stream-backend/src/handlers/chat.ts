import { APIGatewayProxyEvent, APIGatewayProxyResult } from '../shared/types';
import { DIContainer } from '../infrastructure/di/DIContainer';

/**
 * Lambda handler for POST /v1/chat/completions
 * 
 * Processes chat requests with RAG (Retrieval-Augmented Generation).
 * Requires Cognito JWT with custom:tenant_id and sub claims.
 * Returns OpenAI-compatible chat completion with cited sources.
 */
export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  const container = DIContainer.getInstance();
  const controller = container.getChatController();
  return controller.handle(event);
};
