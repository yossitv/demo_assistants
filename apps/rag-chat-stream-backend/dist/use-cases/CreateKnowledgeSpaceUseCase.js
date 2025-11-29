"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CreateKnowledgeSpaceUseCase = void 0;
const KnowledgeSpace_1 = require("../domain/entities/KnowledgeSpace");
const Chunk_1 = require("../domain/entities/Chunk");
const CloudWatchLogger_1 = require("../infrastructure/services/CloudWatchLogger");
class CreateKnowledgeSpaceUseCase {
    knowledgeSpaceRepo;
    vectorRepo;
    crawlerService;
    chunkingService;
    embeddingService;
    logger;
    structuredLogger;
    constructor(knowledgeSpaceRepo, vectorRepo, crawlerService, chunkingService, embeddingService, logger) {
        this.knowledgeSpaceRepo = knowledgeSpaceRepo;
        this.vectorRepo = vectorRepo;
        this.crawlerService = crawlerService;
        this.chunkingService = chunkingService;
        this.embeddingService = embeddingService;
        this.logger = logger;
        // Check if logger is CloudWatchLogger for structured logging
        if (logger instanceof CloudWatchLogger_1.CloudWatchLogger) {
            this.structuredLogger = logger;
        }
    }
    async execute(input) {
        this.logger.info('Creating knowledge space', {
            tenantId: input.tenantId,
            name: input.name,
            sourceUrlCount: input.sourceUrls.length,
            sourceUrls: input.sourceUrls,
            requestId: input.requestId
        });
        try {
            // 1. Create KnowledgeSpace entity
            const knowledgeSpace = new KnowledgeSpace_1.KnowledgeSpace(input.tenantId, this.generateId(), input.name, 'web', input.sourceUrls, this.getCurrentVersion(), new Date());
            // 2. Crawl URLs and create chunks
            const allChunks = [];
            const errors = [];
            let successfulUrls = 0;
            for (let i = 0; i < input.sourceUrls.length; i++) {
                const url = input.sourceUrls[i];
                // Log crawl start with structured logging
                if (this.structuredLogger && input.requestId) {
                    this.structuredLogger.logCrawlProgress({
                        requestId: input.requestId,
                        tenantId: input.tenantId,
                        url,
                        urlIndex: i + 1,
                        totalUrls: input.sourceUrls.length,
                        status: 'started'
                    });
                }
                try {
                    const crawled = await this.crawlerService.crawlUrl(url);
                    const textChunks = this.chunkingService.chunkText(crawled.content, {
                        minTokens: 400,
                        maxTokens: 600,
                        overlapTokens: 75
                    });
                    for (const text of textChunks) {
                        const embedding = await this.embeddingService.generateEmbedding(text);
                        const chunk = new Chunk_1.Chunk(this.generateChunkId(), knowledgeSpace.tenantId, knowledgeSpace.knowledgeSpaceId, crawled.url, crawled.domain, text, embedding, { title: crawled.title, version: knowledgeSpace.currentVersion }, crawled.crawlDate);
                        allChunks.push(chunk);
                    }
                    successfulUrls++;
                    // Log crawl completion with structured logging
                    if (this.structuredLogger && input.requestId) {
                        this.structuredLogger.logCrawlProgress({
                            requestId: input.requestId,
                            tenantId: input.tenantId,
                            url,
                            urlIndex: i + 1,
                            totalUrls: input.sourceUrls.length,
                            chunkCount: textChunks.length,
                            status: 'completed'
                        });
                    }
                    else {
                        this.logger.debug('URL processed successfully', {
                            tenantId: input.tenantId,
                            knowledgeSpaceId: knowledgeSpace.knowledgeSpaceId,
                            url,
                            urlIndex: i + 1,
                            totalUrls: input.sourceUrls.length,
                            chunksCreated: textChunks.length,
                            requestId: input.requestId
                        });
                    }
                }
                catch (error) {
                    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
                    errors.push({ url, error: errorMessage });
                    // Log crawl failure with structured logging
                    if (this.structuredLogger && input.requestId) {
                        this.structuredLogger.logCrawlProgress({
                            requestId: input.requestId,
                            tenantId: input.tenantId,
                            url,
                            urlIndex: i + 1,
                            totalUrls: input.sourceUrls.length,
                            status: 'failed',
                            errorMessage
                        });
                    }
                    else {
                        this.logger.error('Failed to process URL', error, {
                            tenantId: input.tenantId,
                            knowledgeSpaceId: knowledgeSpace.knowledgeSpaceId,
                            url,
                            urlIndex: i + 1,
                            totalUrls: input.sourceUrls.length,
                            requestId: input.requestId
                        });
                    }
                }
            }
            // Check if at least one URL succeeded
            if (successfulUrls === 0) {
                this.logger.error('All URLs failed to process', new Error('All URLs failed'), {
                    tenantId: input.tenantId,
                    knowledgeSpaceId: knowledgeSpace.knowledgeSpaceId,
                    totalUrls: input.sourceUrls.length,
                    failedUrls: errors.length,
                    errors,
                    requestId: input.requestId
                });
                throw new Error(`All URLs failed to process. Failed URLs: ${errors.length}. ` +
                    `Errors: ${errors.map(f => `${f.url}: ${f.error}`).join('; ')}`);
            }
            this.logger.info('URL processing summary', {
                tenantId: input.tenantId,
                knowledgeSpaceId: knowledgeSpace.knowledgeSpaceId,
                successfulUrls,
                failedUrls: errors.length,
                totalUrls: input.sourceUrls.length,
                requestId: input.requestId
            });
            // 3. Store chunks in vector DB
            if (allChunks.length > 0) {
                await this.vectorRepo.upsertChunks(knowledgeSpace.getNamespace(), allChunks);
                this.logger.debug('Chunks stored in vector DB', {
                    tenantId: input.tenantId,
                    knowledgeSpaceId: knowledgeSpace.knowledgeSpaceId,
                    chunkCount: allChunks.length,
                    requestId: input.requestId
                });
            }
            // 4. Save KnowledgeSpace metadata
            await this.knowledgeSpaceRepo.save(knowledgeSpace);
            const status = errors.length > 0 && errors.length < input.sourceUrls.length
                ? 'partial'
                : errors.length === 0
                    ? 'completed'
                    : 'completed';
            this.logger.info('Knowledge space created successfully', {
                tenantId: input.tenantId,
                knowledgeSpaceId: knowledgeSpace.knowledgeSpaceId,
                name: input.name,
                status,
                totalUrls: input.sourceUrls.length,
                successfulUrls,
                failedUrls: errors.length,
                totalChunks: allChunks.length,
                requestId: input.requestId
            });
            return {
                knowledgeSpaceId: knowledgeSpace.knowledgeSpaceId,
                status,
                successfulUrls,
                failedUrls: errors.length,
                errors: errors.length > 0 ? errors : undefined
            };
        }
        catch (error) {
            this.logger.error('Failed to create knowledge space', error, {
                tenantId: input.tenantId,
                name: input.name,
                sourceUrls: input.sourceUrls,
                requestId: input.requestId
            });
            throw error;
        }
    }
    generateId() {
        return `ks_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
    }
    generateChunkId() {
        // Generate UUID v4 for Qdrant compatibility
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
            const r = Math.random() * 16 | 0;
            const v = c === 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
        });
    }
    getCurrentVersion() {
        const now = new Date();
        return now.toISOString().split('T')[0]; // YYYY-MM-DD
    }
}
exports.CreateKnowledgeSpaceUseCase = CreateKnowledgeSpaceUseCase;
//# sourceMappingURL=CreateKnowledgeSpaceUseCase.js.map