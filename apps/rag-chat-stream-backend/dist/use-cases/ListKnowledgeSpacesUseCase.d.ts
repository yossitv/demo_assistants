import { IKnowledgeSpaceRepository } from '../domain/repositories/IKnowledgeSpaceRepository';
import { ILogger } from '../domain/services/ILogger';
export interface ListKnowledgeSpacesInput {
    tenantId: string;
}
export interface ListKnowledgeSpacesOutput {
    knowledgeSpaces: Array<{
        knowledgeSpaceId: string;
        name: string;
        type: 'web';
        lastUpdatedAt: string;
    }>;
}
export declare class ListKnowledgeSpacesUseCase {
    private readonly knowledgeSpaceRepo;
    private readonly logger;
    constructor(knowledgeSpaceRepo: IKnowledgeSpaceRepository, logger: ILogger);
    execute(input: ListKnowledgeSpacesInput): Promise<ListKnowledgeSpacesOutput>;
}
//# sourceMappingURL=ListKnowledgeSpacesUseCase.d.ts.map