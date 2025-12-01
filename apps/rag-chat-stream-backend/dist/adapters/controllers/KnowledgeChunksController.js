"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.KnowledgeChunksController = void 0;
const cors_1 = require("../../shared/cors");
const apiKeyCheck_1 = require("../../shared/apiKeyCheck");
const jwtVerify_1 = require("../../shared/jwtVerify");
class KnowledgeChunksController {
    qdrantClient;
    logger;
    constructor(qdrantClient, logger) {
        this.qdrantClient = qdrantClient;
        this.logger = logger;
    }
    async handle(event) {
        try {
            const authContext = this.extractAuthenticationContext(event);
            if (!authContext) {
                return (0, cors_1.errorResponse)(401, 'Unauthorized');
            }
            const knowledgeSpaceId = event.pathParameters?.knowledgeSpaceId;
            if (!knowledgeSpaceId) {
                return (0, cors_1.errorResponse)(400, 'Knowledge Space ID is required');
            }
            const { tenantId } = authContext;
            const version = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
            const collectionName = `t_${tenantId}_ks_${knowledgeSpaceId}_${version}`;
            this.logger.info('Fetching chunks', { tenantId, knowledgeSpaceId, collectionName });
            // Check if collection exists
            try {
                await this.qdrantClient.getCollection(collectionName);
            }
            catch (error) {
                this.logger.warn('Collection not found', { collectionName });
                return (0, cors_1.successResponse)(200, {
                    knowledgeSpaceId,
                    chunkCount: 0,
                    chunks: [],
                    message: 'No data found in this knowledge space. It may not have been indexed yet.',
                });
            }
            // Scroll through all points in the collection
            const chunks = [];
            let offset = null;
            const limit = 100;
            do {
                const response = await this.qdrantClient.scroll(collectionName, {
                    limit,
                    offset: offset !== null ? offset : undefined,
                    with_payload: true,
                    with_vector: false,
                });
                chunks.push(...response.points.map(p => ({
                    id: p.id,
                    content: p.payload?.content,
                    url: p.payload?.url,
                    domain: p.payload?.domain,
                    metadata: p.payload?.metadata,
                })));
                offset = (response.next_page_offset !== null && response.next_page_offset !== undefined && typeof response.next_page_offset !== 'object')
                    ? response.next_page_offset
                    : null;
            } while (offset !== null);
            return (0, cors_1.successResponse)(200, {
                knowledgeSpaceId,
                chunkCount: chunks.length,
                chunks,
            });
        }
        catch (error) {
            this.logger.error('Failed to fetch chunks', error);
            return (0, cors_1.errorResponse)(500, 'Failed to fetch chunks');
        }
    }
    extractAuthenticationContext(event) {
        const authorizerContext = event.requestContext.authorizer;
        if (authorizerContext?.tenantId && authorizerContext?.userId) {
            return {
                tenantId: authorizerContext.tenantId,
                userId: authorizerContext.userId,
                authMethod: 'apikey'
            };
        }
        const authHeader = Object.entries(event.headers || {}).find(([headerName]) => headerName.toLowerCase() === 'authorization')?.[1];
        if (authHeader) {
            const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : authHeader;
            const jwtResult = (0, jwtVerify_1.verifyJwt)(token, this.logger);
            if (jwtResult.isValid && jwtResult.payload) {
                return {
                    tenantId: jwtResult.payload['custom:tenant_id'],
                    userId: jwtResult.payload.sub,
                    authMethod: 'jwt'
                };
            }
        }
        const apiKeyResult = (0, apiKeyCheck_1.validateApiKey)(event.headers || {}, this.logger);
        if (apiKeyResult.isValid && apiKeyResult.tenantId && apiKeyResult.userId) {
            return {
                tenantId: apiKeyResult.tenantId,
                userId: apiKeyResult.userId,
                authMethod: 'apikey'
            };
        }
        return null;
    }
}
exports.KnowledgeChunksController = KnowledgeChunksController;
//# sourceMappingURL=KnowledgeChunksController.js.map