import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';
import { IConversationRepository } from '../../domain/repositories/IConversationRepository';
import { Conversation } from '../../domain/entities/Conversation';
import { ILogger } from '../../domain/services/ILogger';
export declare class DynamoDBConversationRepository implements IConversationRepository {
    private readonly dynamoDB;
    private readonly tableName;
    private readonly logger;
    constructor(dynamoDB: DynamoDBDocumentClient, tableName: string, logger: ILogger);
    save(conversation: Conversation): Promise<void>;
}
//# sourceMappingURL=DynamoDBConversationRepository.d.ts.map