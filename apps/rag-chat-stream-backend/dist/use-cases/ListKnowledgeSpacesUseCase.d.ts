import { IKnowledgeSpaceRepository } from '../domain/repositories/IKnowledgeSpaceRepository';
import { ILogger } from '../domain/services/ILogger';
import { KnowledgeSpaceType, KnowledgeSpaceStatus } from '../domain/entities/KnowledgeSpace';
export interface ListKnowledgeSpacesInput {
    tenantId: string;
}
export interface ListKnowledgeSpacesOutput {
    knowledgeSpaces: Array<{
        knowledgeSpaceId: string;
        name: string;
        type: KnowledgeSpaceType;
        status?: KnowledgeSpaceStatus;
        documentCount?: number;
        lastUpdatedAt: string;
        metadata?: any;
    }>;
}
export declare class ListKnowledgeSpacesUseCase {
    private readonly knowledgeSpaceRepo;
    private readonly logger;
    constructor(knowledgeSpaceRepo: IKnowledgeSpaceRepository, logger: ILogger);
    execute(input: ListKnowledgeSpacesInput): Promise<ListKnowledgeSpacesOutput>;
}
//# sourceMappingURL=ListKnowledgeSpacesUseCase.d.ts.map