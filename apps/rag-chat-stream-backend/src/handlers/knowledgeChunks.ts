import { APIGatewayProxyEvent, APIGatewayProxyResult } from '../shared/types';
import { KnowledgeChunksController } from '../adapters/controllers/KnowledgeChunksController';
import { QdrantClient } from '@qdrant/js-client-rest';
import { CloudWatchLogger } from '../infrastructure/services/CloudWatchLogger';

const qdrantClient = new QdrantClient({
  url: process.env.QDRANT_URL!,
  apiKey: process.env.QDRANT_API_KEY!,
});

const logger = new CloudWatchLogger();
const controller = new KnowledgeChunksController(qdrantClient, logger);

export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  return controller.handle(event);
};
