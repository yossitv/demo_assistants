import { APIGatewayProxyEvent, APIGatewayProxyResult } from '../../shared/types';
import { successResponse, errorResponse } from '../../shared/cors';
import { ILogger } from '../../domain/services/ILogger';
import { QdrantClient } from '@qdrant/js-client-rest';
import { AuthenticationContext } from '../../shared/auth';
import { validateApiKey } from '../../shared/apiKeyCheck';
import { verifyJwt } from '../../shared/jwtVerify';

export class KnowledgeChunksController {
  constructor(
    private readonly qdrantClient: QdrantClient,
    private readonly logger: ILogger
  ) {}

  async handle(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
    try {
      const authContext = this.extractAuthenticationContext(event);
      if (!authContext) {
        return errorResponse(401, 'Unauthorized');
      }

      const knowledgeSpaceId = event.pathParameters?.knowledgeSpaceId;
      if (!knowledgeSpaceId) {
        return errorResponse(400, 'Knowledge Space ID is required');
      }

      const { tenantId } = authContext;
      const version = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
      const collectionName = `t_${tenantId}_ks_${knowledgeSpaceId}_${version}`;

      this.logger.info('Fetching chunks', { tenantId, knowledgeSpaceId, collectionName });

      // Check if collection exists
      try {
        await this.qdrantClient.getCollection(collectionName);
      } catch (error) {
        this.logger.warn('Collection not found', { collectionName });
        return successResponse(200, {
          knowledgeSpaceId,
          chunkCount: 0,
          chunks: [],
          message: 'No data found in this knowledge space. It may not have been indexed yet.',
        });
      }

      // Scroll through all points in the collection
      const chunks: any[] = [];
      let offset: string | number | null = null;
      const limit = 100;

      do {
        const response = await this.qdrantClient.scroll(collectionName, {
          limit,
          offset: offset !== null ? offset : undefined,
          with_payload: true,
          with_vector: false,
        });

        chunks.push(...response.points.map(p => ({
          id: p.id,
          content: p.payload?.content,
          url: p.payload?.url,
          domain: p.payload?.domain,
          metadata: p.payload?.metadata,
        })));

        offset = (response.next_page_offset !== null && response.next_page_offset !== undefined && typeof response.next_page_offset !== 'object')
          ? response.next_page_offset 
          : null;
      } while (offset !== null);

      return successResponse(200, {
        knowledgeSpaceId,
        chunkCount: chunks.length,
        chunks,
      });
    } catch (error) {
      this.logger.error('Failed to fetch chunks', error as Error);
      return errorResponse(500, 'Failed to fetch chunks');
    }
  }

  private extractAuthenticationContext(event: APIGatewayProxyEvent): AuthenticationContext | null {
    const authorizerContext = event.requestContext.authorizer as any;
    if (authorizerContext?.tenantId && authorizerContext?.userId) {
      return {
        tenantId: authorizerContext.tenantId,
        userId: authorizerContext.userId,
        authMethod: 'apikey'
      };
    }

    const authHeader = Object.entries(event.headers || {}).find(
      ([headerName]) => headerName.toLowerCase() === 'authorization'
    )?.[1];

    if (authHeader) {
      const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : authHeader;
      const jwtResult = verifyJwt(token, this.logger);
      
      if (jwtResult.isValid && jwtResult.payload) {
        return {
          tenantId: jwtResult.payload['custom:tenant_id'],
          userId: jwtResult.payload.sub,
          authMethod: 'jwt'
        };
      }
    }

    const apiKeyResult = validateApiKey(event.headers || {}, this.logger);
    if (apiKeyResult.isValid && apiKeyResult.tenantId && apiKeyResult.userId) {
      return {
        tenantId: apiKeyResult.tenantId,
        userId: apiKeyResult.userId,
        authMethod: 'apikey'
      };
    }

    return null;
  }
}
