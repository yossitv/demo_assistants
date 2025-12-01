import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';
import { IKnowledgeSpaceRepository } from '../../domain/repositories/IKnowledgeSpaceRepository';
import { KnowledgeSpace } from '../../domain/entities/KnowledgeSpace';
import { ILogger } from '../../domain/services/ILogger';
export declare class DynamoDBKnowledgeSpaceRepository implements IKnowledgeSpaceRepository {
    private readonly dynamoDB;
    private readonly tableName;
    private readonly logger;
    constructor(dynamoDB: DynamoDBDocumentClient, tableName: string, logger: ILogger);
    save(ks: KnowledgeSpace): Promise<void>;
    findByTenant(tenantId: string): Promise<KnowledgeSpace[]>;
    findByTenantAndId(tenantId: string, ksId: string): Promise<KnowledgeSpace | null>;
}
//# sourceMappingURL=DynamoDBKnowledgeSpaceRepository.d.ts.map