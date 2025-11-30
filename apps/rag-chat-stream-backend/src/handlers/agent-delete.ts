import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';
import { DeleteAgentUseCase } from '../use-cases/delete-agent.use-case';
import { DynamoDBAgentRepository } from '../infrastructure/repositories/DynamoDBAgentRepository';
import { CloudWatchLogger } from '../infrastructure/services/CloudWatchLogger';

const logger = new CloudWatchLogger();
const corsHeaders = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': '*',
  'Access-Control-Allow-Methods': '*',
};
let deleteAgentUseCase: DeleteAgentUseCase | null = null;

const getDeleteAgentUseCase = (): DeleteAgentUseCase => {
  if (deleteAgentUseCase) {
    return deleteAgentUseCase;
  }

  const tableName = process.env.AGENTS_TABLE_NAME;
  if (!tableName) {
    throw new Error('AGENTS_TABLE_NAME is not configured');
  }

  const dynamoClient = DynamoDBDocumentClient.from(new DynamoDBClient({}));
  const agentRepository = new DynamoDBAgentRepository(dynamoClient, tableName, logger);
  deleteAgentUseCase = new DeleteAgentUseCase(agentRepository, logger);
  return deleteAgentUseCase;
};

export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  try {
    const deleteAgent = getDeleteAgentUseCase();

    logger.info('Agent delete request received', {
      pathParameters: event.pathParameters,
    });

    // Extract agentId from path
    const agentId = event.pathParameters?.agentId;
    if (!agentId) {
      return {
        statusCode: 400,
        headers: corsHeaders,
        body: JSON.stringify({ error: 'Agent ID is required' }),
      };
    }

    // Get tenant ID (from authorizer context or default)
    const tenantId = event.requestContext?.authorizer?.tenantId || 'default';

    // Execute use case
    await deleteAgent.execute(tenantId, agentId);

    logger.info('Agent deleted successfully', { tenantId, agentId });

    return {
      statusCode: 204,
      headers: corsHeaders,
      body: '',
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logger.error('Failed to delete agent', error instanceof Error ? error : new Error(message));

    if (message.includes('not found')) {
      return {
        statusCode: 404,
        headers: corsHeaders,
        body: JSON.stringify({ error: message }),
      };
    }

    if (message.includes('not configured')) {
      return {
        statusCode: 500,
        headers: corsHeaders,
        body: JSON.stringify({ error: 'Server configuration error. Please verify AGENTS_TABLE_NAME and credentials.' }),
      };
    }

    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({ error: 'Internal server error' }),
    };
  }
};
