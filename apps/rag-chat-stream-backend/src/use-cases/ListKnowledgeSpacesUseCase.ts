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

export class ListKnowledgeSpacesUseCase {
  constructor(
    private readonly knowledgeSpaceRepo: IKnowledgeSpaceRepository,
    private readonly logger: ILogger
  ) {}

  async execute(input: ListKnowledgeSpacesInput): Promise<ListKnowledgeSpacesOutput> {
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
    } catch (error) {
      this.logger.error('Failed to list knowledge spaces', error as Error, {
        tenantId: input.tenantId
      });
      throw error;
    }
  }
}
