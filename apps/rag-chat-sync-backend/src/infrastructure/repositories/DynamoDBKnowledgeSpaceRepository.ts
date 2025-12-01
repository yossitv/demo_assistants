import { DynamoDBDocumentClient, PutCommand, GetCommand, QueryCommand } from '@aws-sdk/lib-dynamodb';
import { IKnowledgeSpaceRepository } from '../../domain/repositories/IKnowledgeSpaceRepository';
import { KnowledgeSpace } from '../../domain/entities/KnowledgeSpace';
import { ILogger } from '../../domain/services/ILogger';
import { retryWithBackoff } from '../../shared/retry';

export class DynamoDBKnowledgeSpaceRepository implements IKnowledgeSpaceRepository {
  constructor(
    private readonly dynamoDB: DynamoDBDocumentClient,
    private readonly tableName: string,
    private readonly logger: ILogger
  ) {}

  async save(ks: KnowledgeSpace): Promise<void> {
    this.logger.info('Saving knowledge space to DynamoDB', {
      tenantId: ks.tenantId,
      knowledgeSpaceId: ks.knowledgeSpaceId,
      tableName: this.tableName
    });

    try {
      await retryWithBackoff(
        async () => {
          await this.dynamoDB.send(new PutCommand({
            TableName: this.tableName,
            Item: {
              tenantId: ks.tenantId,
              knowledgeSpaceId: ks.knowledgeSpaceId,
              name: ks.name,
              type: ks.type,
              sourceUrls: ks.sourceUrls,
              currentVersion: ks.currentVersion,
              createdAt: ks.createdAt.toISOString()
            }
          }));
        },
        { logger: this.logger }
      );

      this.logger.info('Successfully saved knowledge space to DynamoDB', {
        tenantId: ks.tenantId,
        knowledgeSpaceId: ks.knowledgeSpaceId
      });
    } catch (error) {
      this.logger.error(
        'Failed to save knowledge space to DynamoDB',
        error instanceof Error ? error : new Error(String(error)),
        {
          tenantId: ks.tenantId,
          knowledgeSpaceId: ks.knowledgeSpaceId,
          tableName: this.tableName
        }
      );
      throw error;
    }
  }

  async findByTenant(tenantId: string): Promise<KnowledgeSpace[]> {
    this.logger.info('Finding knowledge spaces by tenant in DynamoDB', {
      tenantId,
      tableName: this.tableName
    });

    try {
      const result = await retryWithBackoff(
        async () => {
          return await this.dynamoDB.send(new QueryCommand({
            TableName: this.tableName,
            KeyConditionExpression: 'tenantId = :tenantId',
            ExpressionAttributeValues: {
              ':tenantId': tenantId
            }
          }));
        },
        { logger: this.logger }
      );

      const knowledgeSpaces = (result.Items || []).map(item => new KnowledgeSpace(
        item.tenantId,
        item.knowledgeSpaceId,
        item.name,
        item.type,
        item.sourceUrls,
        item.currentVersion,
        new Date(item.createdAt)
      ));

      this.logger.info('Successfully retrieved knowledge spaces from DynamoDB', {
        tenantId,
        count: knowledgeSpaces.length
      });

      return knowledgeSpaces;
    } catch (error) {
      this.logger.error(
        'Failed to find knowledge spaces by tenant in DynamoDB',
        error instanceof Error ? error : new Error(String(error)),
        {
          tenantId,
          tableName: this.tableName
        }
      );
      throw error;
    }
  }

  async findByTenantAndId(tenantId: string, ksId: string): Promise<KnowledgeSpace | null> {
    this.logger.info('Finding knowledge space in DynamoDB', {
      tenantId,
      knowledgeSpaceId: ksId,
      tableName: this.tableName
    });

    try {
      const result = await retryWithBackoff(
        async () => {
          return await this.dynamoDB.send(new GetCommand({
            TableName: this.tableName,
            Key: { tenantId, knowledgeSpaceId: ksId }
          }));
        },
        { logger: this.logger }
      );

      if (!result.Item) {
        this.logger.info('Knowledge space not found in DynamoDB', {
          tenantId,
          knowledgeSpaceId: ksId
        });
        return null;
      }

      this.logger.info('Successfully retrieved knowledge space from DynamoDB', {
        tenantId,
        knowledgeSpaceId: ksId
      });

      return new KnowledgeSpace(
        result.Item.tenantId,
        result.Item.knowledgeSpaceId,
        result.Item.name,
        result.Item.type,
        result.Item.sourceUrls,
        result.Item.currentVersion,
        new Date(result.Item.createdAt)
      );
    } catch (error) {
      this.logger.error(
        'Failed to find knowledge space in DynamoDB',
        error instanceof Error ? error : new Error(String(error)),
        {
          tenantId,
          knowledgeSpaceId: ksId,
          tableName: this.tableName
        }
      );
      throw error;
    }
  }
}
