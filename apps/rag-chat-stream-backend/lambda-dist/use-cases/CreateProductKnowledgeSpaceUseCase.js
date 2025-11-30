"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CreateProductKnowledgeSpaceUseCase = void 0;
const KnowledgeSpace_1 = require("../domain/entities/KnowledgeSpace");
const Chunk_1 = require("../domain/entities/Chunk");
const Namespace_1 = require("../domain/value-objects/Namespace");
const crypto_1 = require("crypto");
class CreateProductKnowledgeSpaceUseCase {
    knowledgeSpaceRepo;
    vectorRepo;
    extractionService;
    embeddingService;
    logger;
    constructor(knowledgeSpaceRepo, vectorRepo, extractionService, embeddingService, logger) {
        this.knowledgeSpaceRepo = knowledgeSpaceRepo;
        this.vectorRepo = vectorRepo;
        this.extractionService = extractionService;
        this.embeddingService = embeddingService;
        this.logger = logger;
    }
    async execute(input) {
        const mode = input.mode || 'product_recommend';
        this.logger.info('Creating knowledge space', {
            tenantId: input.tenantId,
            name: input.name,
            mode,
            requestId: input.requestId
        });
        // Extract content using LLM
        const extractionResult = await this.extractionService.extract(input.fileContent, mode);
        this.logger.info('Content extracted', {
            totalChunks: extractionResult.summary.totalChunks,
            successCount: extractionResult.summary.successCount,
            failureCount: extractionResult.summary.failureCount
        });
        // Determine status
        let status;
        if (extractionResult.summary.failureCount === 0 && extractionResult.summary.successCount > 0) {
            status = 'completed';
        }
        else if (extractionResult.summary.successCount > 0) {
            status = 'partial';
        }
        else {
            status = 'error';
        }
        const knowledgeSpaceId = (0, crypto_1.randomUUID)();
        const currentVersion = this.getCurrentVersion();
        // Create chunks with embeddings
        const chunks = [];
        if (extractionResult.chunks.length > 0) {
            this.logger.info('Generating embeddings', { count: extractionResult.chunks.length });
            const texts = extractionResult.chunks.map(c => c.content);
            const embeddings = await this.embeddingService.generateEmbeddings(texts);
            for (let i = 0; i < extractionResult.chunks.length; i++) {
                const extractedChunk = extractionResult.chunks[i];
                const chunk = new Chunk_1.Chunk((0, crypto_1.randomUUID)(), input.tenantId, knowledgeSpaceId, '', 'file', extractedChunk.content, embeddings[i], {
                    title: extractedChunk.metadata.productName || extractedChunk.metadata.question || `Chunk ${i}`,
                    ...extractedChunk.metadata,
                    version: currentVersion,
                }, new Date());
                chunks.push(chunk);
            }
            this.logger.info('Storing vectors', { count: chunks.length });
            const namespace = new Namespace_1.Namespace(input.tenantId, knowledgeSpaceId, currentVersion);
            await this.vectorRepo.upsertChunks(namespace, chunks);
        }
        // Create and save knowledge space
        const knowledgeSpace = new KnowledgeSpace_1.KnowledgeSpace(input.tenantId, knowledgeSpaceId, input.name, 'product', [], currentVersion, new Date(), status, extractionResult.chunks.length, {
            sourceType: 'file',
            summary: {
                successCount: extractionResult.summary.successCount,
                failureCount: extractionResult.summary.failureCount,
                errors: extractionResult.errors.map((e, idx) => ({
                    itemIndex: idx,
                    reason: e,
                })),
            },
        });
        this.logger.info('Saving knowledge space to DynamoDB', {
            tenantId: input.tenantId,
            knowledgeSpaceId,
            tableName: process.env.KNOWLEDGE_SPACES_TABLE_NAME
        });
        await this.knowledgeSpaceRepo.save(knowledgeSpace);
        this.logger.info('Successfully saved knowledge space to DynamoDB', {
            tenantId: input.tenantId,
            knowledgeSpaceId
        });
        return {
            knowledgeSpaceId,
            name: input.name,
            type: 'product',
            status,
            documentCount: extractionResult.chunks.length,
            summary: {
                successCount: extractionResult.summary.successCount,
                failureCount: extractionResult.summary.failureCount,
                errors: extractionResult.errors,
            },
        };
    }
    getCurrentVersion() {
        return new Date().toISOString().split('T')[0];
    }
}
exports.CreateProductKnowledgeSpaceUseCase = CreateProductKnowledgeSpaceUseCase;
//# sourceMappingURL=CreateProductKnowledgeSpaceUseCase.js.map