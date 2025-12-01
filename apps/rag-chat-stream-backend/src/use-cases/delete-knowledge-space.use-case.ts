import { IKnowledgeSpaceRepository } from '../domain/repositories/IKnowledgeSpaceRepository';
import { IVectorRepository } from '../domain/repositories/IVectorRepository';
import { ILogger } from '../domain/services/ILogger';

export class DeleteKnowledgeSpaceUseCase {
  constructor(
    private readonly knowledgeSpaceRepository: IKnowledgeSpaceRepository,
    private readonly vectorRepository: IVectorRepository | null,
    private readonly logger: ILogger
  ) {}

  async execute(tenantId: string, knowledgeSpaceId: string): Promise<void> {
    this.logger.info('Deleting knowledge space', { tenantId, knowledgeSpaceId });

    // Check if knowledge space exists
    const knowledgeSpace = await this.knowledgeSpaceRepository.findByTenantAndId(tenantId, knowledgeSpaceId);
    if (!knowledgeSpace) {
      throw new Error(`Knowledge space not found: ${knowledgeSpaceId}`);
    }

    // Delete from Qdrant (ignore if collection doesn't exist)
    const collectionName = knowledgeSpace.getNamespace().toString();
    if (this.vectorRepository) {
      try {
        await this.vectorRepository.deleteCollection(collectionName);
      } catch (error) {
        this.logger.warn('Failed to delete Qdrant collection, continuing', { knowledgeSpaceId, collectionName, error });
      }
    } else {
      this.logger.warn('Vector repository not configured, skipping Qdrant deletion', { knowledgeSpaceId, collectionName });
    }

    // Delete from DynamoDB
    await this.knowledgeSpaceRepository.delete(tenantId, knowledgeSpaceId);

    this.logger.info('Knowledge space deleted successfully', { tenantId, knowledgeSpaceId });
  }
}
