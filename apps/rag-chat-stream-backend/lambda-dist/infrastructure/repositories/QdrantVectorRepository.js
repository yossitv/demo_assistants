"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.QdrantVectorRepository = void 0;
const Chunk_1 = require("../../domain/entities/Chunk");
const Embedding_1 = require("../../domain/value-objects/Embedding");
const retry_1 = require("../../shared/retry");
const errors_1 = require("../../shared/errors");
class QdrantVectorRepository {
    qdrantClient;
    logger;
    circuitBreaker = new retry_1.CircuitBreaker();
    constructor(qdrantClient, logger) {
        this.qdrantClient = qdrantClient;
        this.logger = logger;
    }
    async upsertChunks(namespace, chunks) {
        const collectionName = namespace.toString();
        try {
            this.logger.debug('Upserting chunks to Qdrant', {
                collection: collectionName,
                chunkCount: chunks.length
            });
            await (0, retry_1.retryWithBackoff)(async () => this.circuitBreaker.execute(async () => {
                await this.ensureCollection(collectionName);
                const points = chunks.map(chunk => ({
                    id: chunk.id, // Chunk ID should already be a UUID
                    vector: chunk.embedding.vector,
                    payload: {
                        chunkId: chunk.id, // Store original ID in payload for reference
                        tenantId: chunk.tenantId,
                        knowledgeSpaceId: chunk.knowledgeSpaceId,
                        url: chunk.url,
                        domain: chunk.domain,
                        crawlDate: chunk.crawlDate.toISOString(),
                        content: chunk.content,
                        metadata: chunk.metadata
                    }
                }));
                await this.qdrantClient.upsert(collectionName, {
                    wait: true,
                    points
                });
            }));
            this.logger.debug('Successfully upserted chunks to Qdrant', {
                collection: collectionName,
                chunkCount: chunks.length
            });
        }
        catch (error) {
            this.logger.error('Failed to upsert chunks to Qdrant', error instanceof Error ? error : new Error(String(error)), {
                collection: collectionName,
                chunkCount: chunks.length
            });
            if (error instanceof errors_1.ExternalServiceError) {
                throw error;
            }
            throw new errors_1.ExternalServiceError('Failed to upsert chunks to vector store', 503);
        }
    }
    async searchSimilar(namespace, queryEmbedding, topK) {
        const collectionName = namespace.toString();
        try {
            // Ensure collection exists for read paths as well to avoid NotFound errors on cold-started namespaces
            await this.ensureCollection(collectionName);
            this.logger.debug('Searching similar chunks in Qdrant', {
                collection: collectionName,
                topK,
                vectorDimension: queryEmbedding.vector.length
            });
            const results = await (0, retry_1.retryWithBackoff)(async () => this.circuitBreaker.execute(() => this.qdrantClient.search(collectionName, {
                vector: queryEmbedding.vector,
                limit: topK,
                with_payload: true,
                with_vector: true
            })));
            this.logger.debug('Successfully retrieved similar chunks from Qdrant', {
                collection: collectionName,
                resultCount: results.length
            });
            return results.map(result => ({
                chunk: new Chunk_1.Chunk(result.id, result.payload.tenantId, result.payload.knowledgeSpaceId, result.payload.url, result.payload.domain, result.payload.content, new Embedding_1.Embedding(result.vector), result.payload.metadata, new Date(result.payload.crawlDate)),
                score: result.score
            }));
        }
        catch (error) {
            this.logger.error('Failed to search similar chunks in Qdrant', error instanceof Error ? error : new Error(String(error)), {
                collection: collectionName,
                topK
            });
            if (error instanceof errors_1.ExternalServiceError) {
                throw error;
            }
            throw new errors_1.ExternalServiceError('Failed to search similar chunks', 503);
        }
    }
    async ensureCollection(collectionName) {
        try {
            await this.qdrantClient.getCollection(collectionName);
        }
        catch {
            this.logger.debug('Creating new Qdrant collection', {
                collection: collectionName,
                vectorSize: 1536,
                distance: 'Cosine'
            });
            await this.qdrantClient.createCollection(collectionName, {
                vectors: {
                    size: 1536,
                    distance: 'Cosine'
                }
            });
            this.logger.debug('Successfully created Qdrant collection', {
                collection: collectionName
            });
        }
    }
    async deleteCollection(collectionName) {
        this.logger.info('Deleting Qdrant collection', { collection: collectionName });
        try {
            await this.qdrantClient.deleteCollection(collectionName);
            this.logger.info('Successfully deleted Qdrant collection', { collection: collectionName });
        }
        catch (error) {
            // Ignore 404 errors (collection doesn't exist)
            if (error?.status === 404) {
                this.logger.warn('Qdrant collection not found, skipping deletion', { collection: collectionName });
                return;
            }
            throw error;
        }
    }
}
exports.QdrantVectorRepository = QdrantVectorRepository;
//# sourceMappingURL=QdrantVectorRepository.js.map