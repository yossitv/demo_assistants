import { APIGatewayProxyEvent, APIGatewayProxyResult } from '../../shared/types';
import { ILogger } from '../../domain/services/ILogger';
import { QdrantClient } from '@qdrant/js-client-rest';
export declare class KnowledgeChunksController {
    private readonly qdrantClient;
    private readonly logger;
    constructor(qdrantClient: QdrantClient, logger: ILogger);
    handle(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult>;
    private extractAuthenticationContext;
}
//# sourceMappingURL=KnowledgeChunksController.d.ts.map