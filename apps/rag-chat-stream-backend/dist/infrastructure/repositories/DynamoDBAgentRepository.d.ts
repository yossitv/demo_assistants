import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';
import { IAgentRepository } from '../../domain/repositories/IAgentRepository';
import { Agent } from '../../domain/entities/Agent';
import { ILogger } from '../../domain/services/ILogger';
export declare class DynamoDBAgentRepository implements IAgentRepository {
    private readonly dynamoDB;
    private readonly tableName;
    private readonly logger;
    constructor(dynamoDB: DynamoDBDocumentClient, tableName: string, logger: ILogger);
    save(agent: Agent): Promise<void>;
    findByTenantAndId(tenantId: string, agentId: string): Promise<Agent | null>;
    update(agent: Agent): Promise<void>;
    delete(tenantId: string, agentId: string): Promise<void>;
}
//# sourceMappingURL=DynamoDBAgentRepository.d.ts.map