import { APIGatewayProxyEvent, APIGatewayProxyResult } from '../shared/types';
import { DIContainer } from '../infrastructure/di/DIContainer';

export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  const container = DIContainer.getInstance();
  const controller = container.getProductKnowledgeCreateController();
  return await controller.handle(event);
};
