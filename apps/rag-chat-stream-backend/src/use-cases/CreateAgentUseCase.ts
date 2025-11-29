import { Agent } from '../domain/entities/Agent';
import { IAgentRepository } from '../domain/repositories/IAgentRepository';
import { ILogger } from '../domain/services/ILogger';
import { CloudWatchLogger } from '../infrastructure/services/CloudWatchLogger';

export interface CreateAgentInput {
  tenantId: string;
  name: string;
  knowledgeSpaceIds: string[];
  strictRAG: boolean;
  description?: string;
  requestId?: string;
}

export interface CreateAgentOutput {
  agentId: string;
  status: 'created';
}

export class CreateAgentUseCase {
  private readonly structuredLogger?: CloudWatchLogger;

  constructor(
    private readonly agentRepo: IAgentRepository,
    private readonly logger: ILogger
  ) {
    // Check if logger is CloudWatchLogger for structured logging
    if (logger instanceof CloudWatchLogger) {
      this.structuredLogger = logger;
    }
  }

  async execute(input: CreateAgentInput): Promise<CreateAgentOutput> {
    this.logger.info('Creating agent', {
      tenantId: input.tenantId,
      name: input.name,
      knowledgeSpaceCount: input.knowledgeSpaceIds.length,
      strictRAG: input.strictRAG,
      requestId: input.requestId
    });

    try {
      const agent = new Agent(
        input.tenantId,
        this.generateId(),
        input.name,
        input.knowledgeSpaceIds,
        input.strictRAG,
        input.description,
        new Date()
      );

      await this.agentRepo.save(agent);

      // Log agent creation with structured logging
      if (this.structuredLogger && input.requestId) {
        this.structuredLogger.logAgentCreation({
          requestId: input.requestId,
          tenantId: input.tenantId,
          agentId: agent.agentId,
          agentName: agent.name,
          knowledgeSpaceIds: agent.knowledgeSpaceIds,
          strictRAG: agent.strictRAG
        });
      } else {
        this.logger.info('Agent created successfully', {
          tenantId: input.tenantId,
          agentId: agent.agentId,
          name: input.name,
          knowledgeSpaceIds: input.knowledgeSpaceIds,
          strictRAG: input.strictRAG,
          requestId: input.requestId
        });
      }

      return {
        agentId: agent.agentId,
        status: 'created'
      };
    } catch (error) {
      this.logger.error('Failed to create agent', error as Error, {
        tenantId: input.tenantId,
        name: input.name,
        requestId: input.requestId
      });
      throw error;
    }
  }

  private generateId(): string {
    return `agent_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
  }
}
