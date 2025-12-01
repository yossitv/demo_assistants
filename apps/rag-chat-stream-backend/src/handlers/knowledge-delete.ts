import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';
import { QdrantClient } from '@qdrant/js-client-rest';
import { DeleteKnowledgeSpaceUseCase } from '../use-cases/delete-knowledge-space.use-case';
import { DynamoDBKnowledgeSpaceRepository } from '../infrastructure/repositories/DynamoDBKnowledgeSpaceRepository';
import { QdrantVectorRepository } from '../infrastructure/repositories/QdrantVectorRepository';
import { CloudWatchLogger } from '../infrastructure/services/CloudWatchLogger';
import { IVectorRepository } from '../domain/repositories/IVectorRepository';

const logger = new CloudWatchLogger();
const corsHeaders = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': '*',
  'Access-Control-Allow-Methods': '*',
};
let deleteKnowledgeSpaceUseCase: DeleteKnowledgeSpaceUseCase | null = null;

const buildVectorRepository = (): IVectorRepository | null => {
  const qdrantUrl = process.env.QDRANT_URL;
  if (!qdrantUrl) {
    logger.warn('QDRANT_URL is not configured, skipping vector store deletion', {});
    return null;
  }

  const qdrantClient = new QdrantClient({
    url: qdrantUrl,
    apiKey: process.env.QDRANT_API_KEY,
  });

  return new QdrantVectorRepository(qdrantClient, logger);
};

const getDeleteKnowledgeSpaceUseCase = (): DeleteKnowledgeSpaceUseCase => {
  if (deleteKnowledgeSpaceUseCase) {
    return deleteKnowledgeSpaceUseCase;
  }

  const tableName = process.env.KNOWLEDGE_SPACES_TABLE_NAME;
  if (!tableName) {
    throw new Error('KNOWLEDGE_SPACES_TABLE_NAME is not configured');
  }

  const dynamoClient = DynamoDBDocumentClient.from(new DynamoDBClient({}));
  const knowledgeRepo = new DynamoDBKnowledgeSpaceRepository(dynamoClient, tableName, logger);
  deleteKnowledgeSpaceUseCase = new DeleteKnowledgeSpaceUseCase(
    knowledgeRepo,
    buildVectorRepository(),
    logger
  );

  return deleteKnowledgeSpaceUseCase;
};

export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  try {
    const deleteKnowledgeSpace = getDeleteKnowledgeSpaceUseCase();

    logger.info('Knowledge space delete request received', {
      pathParameters: event.pathParameters,
    });

    // Extract knowledgeSpaceId from path
    const knowledgeSpaceId = event.pathParameters?.knowledgeSpaceId;
    if (!knowledgeSpaceId) {
      return {
        statusCode: 400,
        headers: corsHeaders,
        body: JSON.stringify({ error: 'Knowledge space ID is required' }),
      };
    }

    // Get tenant ID (from authorizer context or default)
    const tenantId = event.requestContext?.authorizer?.tenantId || 'default';

    // Execute use case
    await deleteKnowledgeSpace.execute(tenantId, knowledgeSpaceId);

    logger.info('Knowledge space deleted successfully', { tenantId, knowledgeSpaceId });

    return {
      statusCode: 204,
      headers: corsHeaders,
      body: '',
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logger.error('Failed to delete knowledge space', error instanceof Error ? error : new Error(message));

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
        body: JSON.stringify({ error: 'Server configuration error. Please verify KNOWLEDGE_SPACES_TABLE_NAME and QDRANT_URL.' }),
      };
    }

    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({ error: 'Internal server error' }),
    };
  }
};
