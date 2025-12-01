import { IAgentRepository } from '../domain/repositories/IAgentRepository';
import { ILogger } from '../domain/services/ILogger';
import { Agent } from '../domain/entities/Agent';
import { z } from 'zod';

const UpdateAgentSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  systemPrompt: z.string().max(2000).optional(),
  knowledgeSpaceIds: z.array(z.string()).min(1),
  strictRAG: z.boolean().optional(),
});

export type UpdateAgentRequest = z.infer<typeof UpdateAgentSchema>;

export class UpdateAgentUseCase {
  constructor(
    private readonly agentRepository: IAgentRepository,
    private readonly logger: ILogger
  ) {}

  async execute(tenantId: string, agentId: string, request: UpdateAgentRequest): Promise<Agent> {
    this.logger.info('Updating agent', { tenantId, agentId, request });

    // Validate request
    const validated = UpdateAgentSchema.parse(request);

    // Check if agent exists
    const existingAgent = await this.agentRepository.findByTenantAndId(tenantId, agentId);
    if (!existingAgent) {
      throw new Error(`Agent not found: ${agentId}`);
    }

    // Create updated agent
    const updatedAgent = new Agent(
      tenantId,
      agentId,
      validated.name,
      validated.knowledgeSpaceIds,
      validated.strictRAG ?? existingAgent.strictRAG,
      validated.description,
      validated.systemPrompt,
      existingAgent.preset,
      existingAgent.createdAt
    );

    // Update agent
    await this.agentRepository.update(updatedAgent);

    this.logger.info('Agent updated successfully', { tenantId, agentId });

    return updatedAgent;
  }
}
