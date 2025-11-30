import { IKnowledgeSpaceRepository } from '../domain/repositories/IKnowledgeSpaceRepository';
import { IVectorRepository } from '../domain/repositories/IVectorRepository';
import { IEmbeddingService } from '../domain/services/IEmbeddingService';
import { IProductParserService } from '../domain/services/IProductParserService';
import { ILogger } from '../domain/services/ILogger';
import { ParseError } from '../domain/entities/Product';
export interface CreateProductKnowledgeSpaceInput {
    tenantId: string;
    name: string;
    fileContent: string;
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
        errors: ParseError[];
    };
}
export declare class CreateProductKnowledgeSpaceUseCase {
    private readonly knowledgeSpaceRepo;
    private readonly vectorRepo;
    private readonly parserService;
    private readonly embeddingService;
    private readonly logger;
    constructor(knowledgeSpaceRepo: IKnowledgeSpaceRepository, vectorRepo: IVectorRepository, parserService: IProductParserService, embeddingService: IEmbeddingService, logger: ILogger);
    execute(input: CreateProductKnowledgeSpaceInput): Promise<CreateProductKnowledgeSpaceOutput>;
    private formatProductAsChunk;
    private getCurrentVersion;
}
//# sourceMappingURL=CreateProductKnowledgeSpaceUseCase.d.ts.map