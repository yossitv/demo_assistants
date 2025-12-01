import { IKnowledgeSpaceRepository } from '../domain/repositories/IKnowledgeSpaceRepository';
import { IVectorRepository } from '../domain/repositories/IVectorRepository';
import { ICrawlerService } from '../domain/services/ICrawlerService';
import { IChunkingService } from '../domain/services/IChunkingService';
import { IEmbeddingService } from '../domain/services/IEmbeddingService';
import { ILogger } from '../domain/services/ILogger';
export interface CreateKnowledgeSpaceInput {
    tenantId: string;
    name: string;
    sourceUrls: string[];
    requestId?: string;
}
export interface CreateKnowledgeSpaceOutput {
    knowledgeSpaceId: string;
    status: 'completed' | 'partial';
    successfulUrls: number;
    failedUrls: number;
    errors?: Array<{
        url: string;
        error: string;
    }>;
}
export declare class CreateKnowledgeSpaceUseCase {
    private readonly knowledgeSpaceRepo;
    private readonly vectorRepo;
    private readonly crawlerService;
    private readonly chunkingService;
    private readonly embeddingService;
    private readonly logger;
    private readonly structuredLogger?;
    constructor(knowledgeSpaceRepo: IKnowledgeSpaceRepository, vectorRepo: IVectorRepository, crawlerService: ICrawlerService, chunkingService: IChunkingService, embeddingService: IEmbeddingService, logger: ILogger);
    execute(input: CreateKnowledgeSpaceInput): Promise<CreateKnowledgeSpaceOutput>;
    private generateId;
    private generateChunkId;
    private getCurrentVersion;
}
//# sourceMappingURL=CreateKnowledgeSpaceUseCase.d.ts.map