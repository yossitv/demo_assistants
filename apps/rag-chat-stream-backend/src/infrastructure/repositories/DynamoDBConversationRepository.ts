import { DynamoDBDocumentClient, PutCommand } from '@aws-sdk/lib-dynamodb';
import { IConversationRepository } from '../../domain/repositories/IConversationRepository';
import { Conversation } from '../../domain/entities/Conversation';
import { ILogger } from '../../domain/services/ILogger';
import { retryWithBackoff } from '../../shared/retry';

export class DynamoDBConversationRepository implements IConversationRepository {
  constructor(
    private readonly dynamoDB: DynamoDBDocumentClient,
    private readonly tableName: string,
    private readonly logger: ILogger
  ) {}

  async save(conversation: Conversation): Promise<void> {
    this.logger.info('Saving conversation to DynamoDB', {
      conversationId: conversation.conversationId,
      tenantId: conversation.tenantId,
      agentId: conversation.agentId,
      tableName: this.tableName
    });

    try {
      await retryWithBackoff(
        async () => {
          await this.dynamoDB.send(new PutCommand({
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
        },
        { logger: this.logger }
      );

      this.logger.info('Successfully saved conversation to DynamoDB', {
        conversationId: conversation.conversationId,
        tenantId: conversation.tenantId,
        agentId: conversation.agentId
      });
    } catch (error) {
      this.logger.error(
        'Failed to save conversation to DynamoDB',
        error instanceof Error ? error : new Error(String(error)),
        {
          conversationId: conversation.conversationId,
          tenantId: conversation.tenantId,
          agentId: conversation.agentId,
          tableName: this.tableName
        }
      );
      throw error;
    }
  }
}
