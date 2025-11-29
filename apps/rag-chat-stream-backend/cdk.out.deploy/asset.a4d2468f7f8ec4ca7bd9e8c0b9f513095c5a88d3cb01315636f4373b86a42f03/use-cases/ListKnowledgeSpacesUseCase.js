"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ListKnowledgeSpacesUseCase = void 0;
class ListKnowledgeSpacesUseCase {
    knowledgeSpaceRepo;
    logger;
    constructor(knowledgeSpaceRepo, logger) {
        this.knowledgeSpaceRepo = knowledgeSpaceRepo;
        this.logger = logger;
    }
    async execute(input) {
        this.logger.info('Listing knowledge spaces', {
            tenantId: input.tenantId
        });
        try {
            const knowledgeSpaces = await this.knowledgeSpaceRepo.findByTenant(input.tenantId);
            this.logger.info('Knowledge spaces listed successfully', {
                tenantId: input.tenantId,
                count: knowledgeSpaces.length,
                knowledgeSpaceIds: knowledgeSpaces.map(ks => ks.knowledgeSpaceId)
            });
            return {
                knowledgeSpaces: knowledgeSpaces.map(ks => ({
                    knowledgeSpaceId: ks.knowledgeSpaceId,
                    name: ks.name,
                    type: ks.type,
                    lastUpdatedAt: ks.createdAt.toISOString()
                }))
            };
        }
        catch (error) {
            this.logger.error('Failed to list knowledge spaces', error, {
                tenantId: input.tenantId
            });
            throw error;
        }
    }
}
exports.ListKnowledgeSpacesUseCase = ListKnowledgeSpacesUseCase;
//# sourceMappingURL=ListKnowledgeSpacesUseCase.js.map