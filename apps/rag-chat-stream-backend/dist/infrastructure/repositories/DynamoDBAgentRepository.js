"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DynamoDBAgentRepository = void 0;
const lib_dynamodb_1 = require("@aws-sdk/lib-dynamodb");
const Agent_1 = require("../../domain/entities/Agent");
const retry_1 = require("../../shared/retry");
class DynamoDBAgentRepository {
    dynamoDB;
    tableName;
    logger;
    constructor(dynamoDB, tableName, logger) {
        this.dynamoDB = dynamoDB;
        this.tableName = tableName;
        this.logger = logger;
    }
    async save(agent) {
        this.logger.info('Saving agent to DynamoDB', {
            tenantId: agent.tenantId,
            agentId: agent.agentId,
            tableName: this.tableName
        });
        try {
            await (0, retry_1.retryWithBackoff)(async () => {
                await this.dynamoDB.send(new lib_dynamodb_1.PutCommand({
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
            }, { logger: this.logger });
            this.logger.info('Successfully saved agent to DynamoDB', {
                tenantId: agent.tenantId,
                agentId: agent.agentId
            });
        }
        catch (error) {
            this.logger.error('Failed to save agent to DynamoDB', error instanceof Error ? error : new Error(String(error)), {
                tenantId: agent.tenantId,
                agentId: agent.agentId,
                tableName: this.tableName
            });
            throw error;
        }
    }
    async findByTenantAndId(tenantId, agentId) {
        this.logger.info('Finding agent in DynamoDB', {
            tenantId,
            agentId,
            tableName: this.tableName
        });
        try {
            const result = await (0, retry_1.retryWithBackoff)(async () => {
                return await this.dynamoDB.send(new lib_dynamodb_1.GetCommand({
                    TableName: this.tableName,
                    Key: { tenantId, agentId }
                }));
            }, { logger: this.logger });
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
            return new Agent_1.Agent(result.Item.tenantId, result.Item.agentId, result.Item.name, result.Item.knowledgeSpaceIds, result.Item.strictRAG, result.Item.description, result.Item.systemPrompt, result.Item.preset, new Date(result.Item.createdAt));
        }
        catch (error) {
            this.logger.error('Failed to find agent in DynamoDB', error instanceof Error ? error : new Error(String(error)), {
                tenantId,
                agentId,
                tableName: this.tableName
            });
            throw error;
        }
    }
    async update(agent) {
        this.logger.info('Updating agent in DynamoDB', {
            tenantId: agent.tenantId,
            agentId: agent.agentId,
            tableName: this.tableName
        });
        try {
            await (0, retry_1.retryWithBackoff)(async () => {
                await this.dynamoDB.send(new lib_dynamodb_1.PutCommand({
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
            }, { logger: this.logger });
            this.logger.info('Successfully updated agent in DynamoDB', {
                tenantId: agent.tenantId,
                agentId: agent.agentId
            });
        }
        catch (error) {
            this.logger.error('Failed to update agent in DynamoDB', error instanceof Error ? error : new Error(String(error)), {
                tenantId: agent.tenantId,
                agentId: agent.agentId,
                tableName: this.tableName
            });
            throw error;
        }
    }
    async delete(tenantId, agentId) {
        this.logger.info('Deleting agent from DynamoDB', {
            tenantId,
            agentId,
            tableName: this.tableName
        });
        try {
            await (0, retry_1.retryWithBackoff)(async () => {
                await this.dynamoDB.send(new lib_dynamodb_1.DeleteCommand({
                    TableName: this.tableName,
                    Key: { tenantId, agentId }
                }));
            }, { logger: this.logger });
            this.logger.info('Successfully deleted agent from DynamoDB', {
                tenantId,
                agentId
            });
        }
        catch (error) {
            this.logger.error('Failed to delete agent from DynamoDB', error instanceof Error ? error : new Error(String(error)), {
                tenantId,
                agentId,
                tableName: this.tableName
            });
            throw error;
        }
    }
}
exports.DynamoDBAgentRepository = DynamoDBAgentRepository;
//# sourceMappingURL=DynamoDBAgentRepository.js.map