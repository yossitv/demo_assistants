"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DynamoDBKnowledgeSpaceRepository = void 0;
const lib_dynamodb_1 = require("@aws-sdk/lib-dynamodb");
const KnowledgeSpace_1 = require("../../domain/entities/KnowledgeSpace");
const retry_1 = require("../../shared/retry");
class DynamoDBKnowledgeSpaceRepository {
    dynamoDB;
    tableName;
    logger;
    constructor(dynamoDB, tableName, logger) {
        this.dynamoDB = dynamoDB;
        this.tableName = tableName;
        this.logger = logger;
    }
    async save(ks) {
        this.logger.info('Saving knowledge space to DynamoDB', {
            tenantId: ks.tenantId,
            knowledgeSpaceId: ks.knowledgeSpaceId,
            tableName: this.tableName
        });
        try {
            await (0, retry_1.retryWithBackoff)(async () => {
                await this.dynamoDB.send(new lib_dynamodb_1.PutCommand({
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
            }, { logger: this.logger });
            this.logger.info('Successfully saved knowledge space to DynamoDB', {
                tenantId: ks.tenantId,
                knowledgeSpaceId: ks.knowledgeSpaceId
            });
        }
        catch (error) {
            this.logger.error('Failed to save knowledge space to DynamoDB', error instanceof Error ? error : new Error(String(error)), {
                tenantId: ks.tenantId,
                knowledgeSpaceId: ks.knowledgeSpaceId,
                tableName: this.tableName
            });
            throw error;
        }
    }
    async findByTenant(tenantId) {
        this.logger.info('Finding knowledge spaces by tenant in DynamoDB', {
            tenantId,
            tableName: this.tableName
        });
        try {
            const result = await (0, retry_1.retryWithBackoff)(async () => {
                return await this.dynamoDB.send(new lib_dynamodb_1.QueryCommand({
                    TableName: this.tableName,
                    KeyConditionExpression: 'tenantId = :tenantId',
                    ExpressionAttributeValues: {
                        ':tenantId': tenantId
                    }
                }));
            }, { logger: this.logger });
            const knowledgeSpaces = (result.Items || []).map(item => new KnowledgeSpace_1.KnowledgeSpace(item.tenantId, item.knowledgeSpaceId, item.name, item.type, item.sourceUrls, item.currentVersion, new Date(item.createdAt)));
            this.logger.info('Successfully retrieved knowledge spaces from DynamoDB', {
                tenantId,
                count: knowledgeSpaces.length
            });
            return knowledgeSpaces;
        }
        catch (error) {
            this.logger.error('Failed to find knowledge spaces by tenant in DynamoDB', error instanceof Error ? error : new Error(String(error)), {
                tenantId,
                tableName: this.tableName
            });
            throw error;
        }
    }
    async findByTenantAndId(tenantId, ksId) {
        this.logger.info('Finding knowledge space in DynamoDB', {
            tenantId,
            knowledgeSpaceId: ksId,
            tableName: this.tableName
        });
        try {
            const result = await (0, retry_1.retryWithBackoff)(async () => {
                return await this.dynamoDB.send(new lib_dynamodb_1.GetCommand({
                    TableName: this.tableName,
                    Key: { tenantId, knowledgeSpaceId: ksId }
                }));
            }, { logger: this.logger });
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
            return new KnowledgeSpace_1.KnowledgeSpace(result.Item.tenantId, result.Item.knowledgeSpaceId, result.Item.name, result.Item.type, result.Item.sourceUrls, result.Item.currentVersion, new Date(result.Item.createdAt));
        }
        catch (error) {
            this.logger.error('Failed to find knowledge space in DynamoDB', error instanceof Error ? error : new Error(String(error)), {
                tenantId,
                knowledgeSpaceId: ksId,
                tableName: this.tableName
            });
            throw error;
        }
    }
}
exports.DynamoDBKnowledgeSpaceRepository = DynamoDBKnowledgeSpaceRepository;
//# sourceMappingURL=DynamoDBKnowledgeSpaceRepository.js.map