import { AgentPreset } from '../domain/entities/Agent';
import { IAgentRepository } from '../domain/repositories/IAgentRepository';
import { ILogger } from '../domain/services/ILogger';
export interface CreateAgentInput {
    tenantId: string;
    name: string;
    knowledgeSpaceIds: string[];
    strictRAG: boolean;
    description?: string;
    systemPrompt?: string;
    preset?: AgentPreset;
    requestId?: string;
}
export interface CreateAgentOutput {
    agentId: string;
    status: 'created';
}
export declare class CreateAgentUseCase {
    private readonly agentRepo;
    private readonly logger;
    private readonly structuredLogger?;
    constructor(agentRepo: IAgentRepository, logger: ILogger);
    execute(input: CreateAgentInput): Promise<CreateAgentOutput>;
    private generateId;
}
//# sourceMappingURL=CreateAgentUseCase.d.ts.map