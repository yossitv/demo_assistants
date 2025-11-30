"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CreateProductKnowledgeSpaceUseCase = void 0;
const KnowledgeSpace_1 = require("../domain/entities/KnowledgeSpace");
const Chunk_1 = require("../domain/entities/Chunk");
const Product_1 = require("../domain/entities/Product");
const crypto_1 = require("crypto");
class CreateProductKnowledgeSpaceUseCase {
    knowledgeSpaceRepo;
    vectorRepo;
    parserService;
    embeddingService;
    logger;
    constructor(knowledgeSpaceRepo, vectorRepo, parserService, embeddingService, logger) {
        this.knowledgeSpaceRepo = knowledgeSpaceRepo;
        this.vectorRepo = vectorRepo;
        this.parserService = parserService;
        this.embeddingService = embeddingService;
        this.logger = logger;
    }
    async execute(input) {
        this.logger.info('Creating product knowledge space', {
            tenantId: input.tenantId,
            name: input.name,
            requestId: input.requestId
        });
        // Parse products from markdown
        const parseResult = this.parserService.parseMarkdown(input.fileContent);
        this.logger.info('Parsed products', {
            totalItems: parseResult.summary.totalItems,
            successCount: parseResult.summary.successCount,
            failureCount: parseResult.summary.failureCount
        });
        // Determine status
        let status;
        if (parseResult.summary.failureCount === 0) {
            status = 'completed';
        }
        else if (parseResult.summary.successCount > 0) {
            status = 'partial';
        }
        else {
            status = 'error';
        }
        const knowledgeSpaceId = (0, crypto_1.randomUUID)();
        const currentVersion = this.getCurrentVersion();
        // Create chunks from products
        const chunks = [];
        if (parseResult.products.length > 0) {
            this.logger.info('Embedding products', { count: parseResult.products.length });
            const texts = parseResult.products.map(p => this.formatProductAsChunk(p));
            const embeddings = await this.embeddingService.generateEmbeddings(texts);
            for (let i = 0; i < parseResult.products.length; i++) {
                const product = parseResult.products[i];
                const chunk = new Chunk_1.Chunk((0, crypto_1.randomUUID)(), input.tenantId, knowledgeSpaceId, product.productUrl || '', product.brand || 'product', texts[i], embeddings[i], {
                    title: product.name,
                    version: currentVersion,
                    productId: product.id,
                    productName: product.name
                }, new Date());
                chunks.push(chunk);
            }
            this.logger.info('Storing product vectors', { count: chunks.length });
            const namespace = { tenantId: input.tenantId, knowledgeSpaceId, version: currentVersion };
            await this.vectorRepo.upsertChunks(namespace, chunks);
        }
        // Create and save knowledge space
        const knowledgeSpace = new KnowledgeSpace_1.KnowledgeSpace(input.tenantId, knowledgeSpaceId, input.name, 'product', [], currentVersion, new Date(), status, parseResult.products.length, {
            sourceType: 'file',
            schemaVersion: Product_1.SCHEMA_VERSION,
            summary: {
                successCount: parseResult.summary.successCount,
                failureCount: parseResult.summary.failureCount,
                errors: parseResult.errors
            }
        });
        await this.knowledgeSpaceRepo.save(knowledgeSpace);
        this.logger.info('Product knowledge space created', {
            knowledgeSpaceId,
            status,
            documentCount: parseResult.products.length
        });
        return {
            knowledgeSpaceId,
            name: input.name,
            type: 'product',
            status,
            documentCount: parseResult.products.length,
            summary: {
                successCount: parseResult.summary.successCount,
                failureCount: parseResult.summary.failureCount,
                errors: parseResult.errors
            }
        };
    }
    formatProductAsChunk(product) {
        const parts = [
            product.name,
            product.description
        ];
        if (product.category)
            parts.push(`Category: ${product.category}`);
        if (product.brand)
            parts.push(`Brand: ${product.brand}`);
        if (product.price)
            parts.push(`Price: ${product.price} ${product.currency || 'USD'}`);
        if (product.availability)
            parts.push(`Availability: ${product.availability}`);
        if (product.tags?.length)
            parts.push(`Tags: ${product.tags.join(', ')}`);
        return parts.join('\n');
    }
    getCurrentVersion() {
        const now = new Date();
        return now.toISOString().split('T')[0];
    }
}
exports.CreateProductKnowledgeSpaceUseCase = CreateProductKnowledgeSpaceUseCase;
//# sourceMappingURL=CreateProductKnowledgeSpaceUseCase.js.map