import { IKnowledgeSpaceRepository } from '../domain/repositories/IKnowledgeSpaceRepository';
import { IVectorRepository } from '../domain/repositories/IVectorRepository';
import { IEmbeddingService } from '../domain/services/IEmbeddingService';
import { IContentExtractionService } from '../domain/services/IContentExtractionService';
import { ILogger } from '../domain/services/ILogger';
import { KnowledgeSpaceMode } from '../domain/entities/KnowledgeSpaceMode';
export interface CreateProductKnowledgeSpaceInput {
    tenantId: string;
    name: string;
    fileContent: string;
    mode?: KnowledgeSpaceMode;
    requestId?: string;
}
export interface CreateProductKnowledgeSpaceOutput {
    knowledgeSpaceId: string;
    name: string;
    type: 'product';
    status: 'completed' | 'partial' | 'error';
    documentCount: number;
    summary: {
        successCount: number;
        failureCount: number;
        errors: string[];
    };
}
export declare class CreateProductKnowledgeSpaceUseCase {
    private readonly knowledgeSpaceRepo;
    private readonly vectorRepo;
    private readonly extractionService;
    private readonly embeddingService;
    private readonly logger;
    constructor(knowledgeSpaceRepo: IKnowledgeSpaceRepository, vectorRepo: IVectorRepository, extractionService: IContentExtractionService, embeddingService: IEmbeddingService, logger: ILogger);
    execute(input: CreateProductKnowledgeSpaceInput): Promise<CreateProductKnowledgeSpaceOutput>;
    private getCurrentVersion;
}
//# sourceMappingURL=CreateProductKnowledgeSpaceUseCase.d.ts.map