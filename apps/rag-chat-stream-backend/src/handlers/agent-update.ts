import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { DIContainer } from '../infrastructure/di/DIContainer';

const container = DIContainer.getInstance();

export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  const logger = container.getLogger();

  try {
    logger.info('Agent update request received', {
      pathParameters: event.pathParameters,
      body: event.body,
    });

    // Extract agentId from path
    const agentId = event.pathParameters?.agentId;
    if (!agentId) {
      return {
        statusCode: 400,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'Agent ID is required' }),
      };
    }

    // Parse request body
    if (!event.body) {
      return {
        statusCode: 400,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'Request body is required' }),
      };
    }

    const request = JSON.parse(event.body);

    // Get tenant ID (from authorizer context or default)
    const tenantId = event.requestContext?.authorizer?.tenantId || 'default';

    // Execute use case
    const updateAgentUseCase = container.getUpdateAgentUseCase();
    const updatedAgent = await updateAgentUseCase.execute(tenantId, agentId, request);

    logger.info('Agent updated successfully', { tenantId, agentId });

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        agentId: updatedAgent.agentId,
        status: 'updated',
      }),
    };
  } catch (error) {
    logger.error('Failed to update agent', error instanceof Error ? error : new Error(String(error)));

    if (error instanceof Error && error.message.includes('not found')) {
      return {
        statusCode: 404,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: error.message }),
      };
    }

    if (error instanceof Error && error.name === 'ZodError') {
      return {
        statusCode: 400,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: error.message }),
      };
    }

    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Internal server error' }),
    };
  }
};
