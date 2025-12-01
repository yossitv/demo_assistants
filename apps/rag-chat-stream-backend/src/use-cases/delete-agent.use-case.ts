import { IAgentRepository } from '../domain/repositories/IAgentRepository';
import { ILogger } from '../domain/services/ILogger';

export class DeleteAgentUseCase {
  constructor(
    private readonly agentRepository: IAgentRepository,
    private readonly logger: ILogger
  ) {}

  async execute(tenantId: string, agentId: string): Promise<void> {
    this.logger.info('Deleting agent', { tenantId, agentId });

    // Check if agent exists
    const agent = await this.agentRepository.findByTenantAndId(tenantId, agentId);
    if (!agent) {
      throw new Error(`Agent not found: ${agentId}`);
    }

    // Delete agent
    await this.agentRepository.delete(tenantId, agentId);

    this.logger.info('Agent deleted successfully', { tenantId, agentId });
  }
}
