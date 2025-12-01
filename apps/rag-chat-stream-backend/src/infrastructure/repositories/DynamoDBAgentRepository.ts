import { DynamoDBDocumentClient, PutCommand, GetCommand, DeleteCommand } from '@aws-sdk/lib-dynamodb';
import { IAgentRepository } from '../../domain/repositories/IAgentRepository';
import { Agent } from '../../domain/entities/Agent';
import { ILogger } from '../../domain/services/ILogger';
import { retryWithBackoff } from '../../shared/retry';

export class DynamoDBAgentRepository implements IAgentRepository {
  constructor(
    private readonly dynamoDB: DynamoDBDocumentClient,
    private readonly tableName: string,
    private readonly logger: ILogger
  ) {}

  async save(agent: Agent): Promise<void> {
    this.logger.info('Saving agent to DynamoDB', {
      tenantId: agent.tenantId,
      agentId: agent.agentId,
      tableName: this.tableName
    });

    try {
      await retryWithBackoff(
        async () => {
          await this.dynamoDB.send(new PutCommand({
            TableName: this.tableName,
            Item: {
              tenantId: agent.tenantId,
              agentId: agent.agentId,
              name: agent.name,
              description: agent.description,
              knowledgeSpaceIds: agent.knowledgeSpaceIds,
              strictRAG: agent.strictRAG,
              systemPrompt: agent.systemPrompt,
              preset: agent.preset,
              createdAt: agent.createdAt.toISOString()
            }
          }));
        },
        { logger: this.logger }
      );

      this.logger.info('Successfully saved agent to DynamoDB', {
        tenantId: agent.tenantId,
        agentId: agent.agentId
      });
    } catch (error) {
      this.logger.error(
        'Failed to save agent to DynamoDB',
        error instanceof Error ? error : new Error(String(error)),
        {
          tenantId: agent.tenantId,
          agentId: agent.agentId,
          tableName: this.tableName
        }
      );
      throw error;
    }
  }

  async findByTenantAndId(tenantId: string, agentId: string): Promise<Agent | null> {
    this.logger.info('Finding agent in DynamoDB', {
      tenantId,
      agentId,
      tableName: this.tableName
    });

    try {
      const result = await retryWithBackoff(
        async () => {
          return await this.dynamoDB.send(new GetCommand({
            TableName: this.tableName,
            Key: { tenantId, agentId }
          }));
        },
        { logger: this.logger }
      );

      if (!result.Item) {
        this.logger.info('Agent not found in DynamoDB', {
          tenantId,
          agentId
        });
        return null;
      }

      this.logger.info('Successfully retrieved agent from DynamoDB', {
        tenantId,
        agentId
      });

      return new Agent(
        result.Item.tenantId,
        result.Item.agentId,
        result.Item.name,
        result.Item.knowledgeSpaceIds,
        result.Item.strictRAG,
        result.Item.description,
        result.Item.systemPrompt,
        result.Item.preset,
        new Date(result.Item.createdAt)
      );
    } catch (error) {
      this.logger.error(
        'Failed to find agent in DynamoDB',
        error instanceof Error ? error : new Error(String(error)),
        {
          tenantId,
          agentId,
          tableName: this.tableName
        }
      );
      throw error;
    }
  }

  async update(agent: Agent): Promise<void> {
    this.logger.info('Updating agent in DynamoDB', {
      tenantId: agent.tenantId,
      agentId: agent.agentId,
      tableName: this.tableName
    });

    try {
      await retryWithBackoff(
        async () => {
          await this.dynamoDB.send(new PutCommand({
            TableName: this.tableName,
            Item: {
              tenantId: agent.tenantId,
              agentId: agent.agentId,
              name: agent.name,
              description: agent.description,
              knowledgeSpaceIds: agent.knowledgeSpaceIds,
              strictRAG: agent.strictRAG,
              systemPrompt: agent.systemPrompt,
              preset: agent.preset,
              createdAt: agent.createdAt.toISOString()
            }
          }));
        },
        { logger: this.logger }
      );

      this.logger.info('Successfully updated agent in DynamoDB', {
        tenantId: agent.tenantId,
        agentId: agent.agentId
      });
    } catch (error) {
      this.logger.error(
        'Failed to update agent in DynamoDB',
        error instanceof Error ? error : new Error(String(error)),
        {
          tenantId: agent.tenantId,
          agentId: agent.agentId,
          tableName: this.tableName
        }
      );
      throw error;
    }
  }

  async delete(tenantId: string, agentId: string): Promise<void> {
    this.logger.info('Deleting agent from DynamoDB', {
      tenantId,
      agentId,
      tableName: this.tableName
    });

    try {
      await retryWithBackoff(
        async () => {
          await this.dynamoDB.send(new DeleteCommand({
            TableName: this.tableName,
            Key: { tenantId, agentId }
          }));
        },
        { logger: this.logger }
      );

      this.logger.info('Successfully deleted agent from DynamoDB', {
        tenantId,
        agentId
      });
    } catch (error) {
      this.logger.error(
        'Failed to delete agent from DynamoDB',
        error instanceof Error ? error : new Error(String(error)),
        {
          tenantId,
          agentId,
          tableName: this.tableName
        }
      );
      throw error;
    }
  }
}
