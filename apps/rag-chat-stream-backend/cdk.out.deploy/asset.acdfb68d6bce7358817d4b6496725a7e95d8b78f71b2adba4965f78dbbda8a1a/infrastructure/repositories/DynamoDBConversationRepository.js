"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DynamoDBConversationRepository = void 0;
const lib_dynamodb_1 = require("@aws-sdk/lib-dynamodb");
const retry_1 = require("../../shared/retry");
class DynamoDBConversationRepository {
    dynamoDB;
    tableName;
    logger;
    constructor(dynamoDB, tableName, logger) {
        this.dynamoDB = dynamoDB;
        this.tableName = tableName;
        this.logger = logger;
    }
    async save(conversation) {
        this.logger.info('Saving conversation to DynamoDB', {
            conversationId: conversation.conversationId,
            tenantId: conversation.tenantId,
            agentId: conversation.agentId,
            tableName: this.tableName
        });
        try {
            await (0, retry_1.retryWithBackoff)(async () => {
                await this.dynamoDB.send(new lib_dynamodb_1.PutCommand({
                    TableName: this.tableName,
                    Item: {
                        conversationId: conversation.conversationId,
                        tenantId: conversation.tenantId,
                        agentId: conversation.agentId,
                        userId: conversation.userId,
                        lastUserMessage: conversation.lastUserMessage,
                        lastAssistantMessage: conversation.lastAssistantMessage,
                        referencedUrls: conversation.referencedUrls,
                        createdAt: conversation.createdAt.toISOString()
                    }
                }));
            }, { logger: this.logger });
            this.logger.info('Successfully saved conversation to DynamoDB', {
                conversationId: conversation.conversationId,
                tenantId: conversation.tenantId,
                agentId: conversation.agentId
            });
        }
        catch (error) {
            this.logger.error('Failed to save conversation to DynamoDB', error instanceof Error ? error : new Error(String(error)), {
                conversationId: conversation.conversationId,
                tenantId: conversation.tenantId,
                agentId: conversation.agentId,
                tableName: this.tableName
            });
            throw error;
        }
    }
}
exports.DynamoDBConversationRepository = DynamoDBConversationRepository;
//# sourceMappingURL=DynamoDBConversationRepository.js.map