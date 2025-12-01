import { APIGatewayProxyEvent } from '../shared/types';
import { DIContainer } from '../infrastructure/di/DIContainer';

/**
 * Lambda handler for streaming chat completions (/v1/chat/completions/stream)
 */
export const handler = awslambda.streamifyResponse(
  async (event: APIGatewayProxyEvent, responseStream: awslambda.HttpResponseStream): Promise<void> => {
    const container = DIContainer.getInstance();
    const controller = container.getChatCompletionsStreamController();
    await controller.handle(event, responseStream);
  }
);
