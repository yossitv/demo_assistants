"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.OpenAIEmbeddingService = void 0;
const Embedding_1 = require("../../domain/value-objects/Embedding");
const retry_1 = require("../../shared/retry");
const errors_1 = require("../../shared/errors");
class OpenAIEmbeddingService {
    openai;
    logger;
    model;
    circuitBreaker = new retry_1.CircuitBreaker();
    retryOptions;
    constructor(openai, logger, model = 'text-embedding-3-small', retryOptions = {}) {
        this.openai = openai;
        this.logger = logger;
        this.model = model;
        this.retryOptions = retryOptions;
    }
    async generateEmbedding(text) {
        const startTime = Date.now();
        const textLength = text.length;
        this.logger.debug('Generating embedding', {
            model: this.model,
            textLength
        });
        try {
            return await (0, retry_1.retryWithBackoff)(async () => {
                const response = await this.circuitBreaker.execute(() => this.openai.embeddings.create({
                    model: this.model,
                    input: text
                }));
                const duration = Date.now() - startTime;
                this.logger.debug('Embedding generated successfully', {
                    model: this.model,
                    textLength,
                    embeddingDimensions: response.data[0].embedding.length,
                    durationMs: duration
                });
                return new Embedding_1.Embedding(response.data[0].embedding);
            }, this.retryOptions);
        }
        catch (error) {
            const duration = Date.now() - startTime;
            this.logger.error('Failed to generate embedding', error, {
                model: this.model,
                textLength,
                durationMs: duration
            });
            if (error instanceof errors_1.ExternalServiceError) {
                throw error;
            }
            throw new errors_1.ExternalServiceError('Failed to generate embedding', 503);
        }
    }
    async generateEmbeddings(texts) {
        const startTime = Date.now();
        const textCount = texts.length;
        const totalTextLength = texts.reduce((sum, text) => sum + text.length, 0);
        this.logger.debug('Generating embeddings batch', {
            model: this.model,
            textCount,
            totalTextLength,
            averageTextLength: Math.round(totalTextLength / textCount)
        });
        try {
            return await (0, retry_1.retryWithBackoff)(async () => {
                const response = await this.circuitBreaker.execute(() => this.openai.embeddings.create({
                    model: this.model,
                    input: texts
                }));
                const duration = Date.now() - startTime;
                this.logger.debug('Embeddings batch generated successfully', {
                    model: this.model,
                    textCount,
                    totalTextLength,
                    embeddingDimensions: response.data[0].embedding.length,
                    durationMs: duration
                });
                return response.data.map(item => new Embedding_1.Embedding(item.embedding));
            }, this.retryOptions);
        }
        catch (error) {
            const duration = Date.now() - startTime;
            this.logger.error('Failed to generate embeddings batch', error, {
                model: this.model,
                textCount,
                totalTextLength,
                durationMs: duration
            });
            if (error instanceof errors_1.ExternalServiceError) {
                throw error;
            }
            throw new errors_1.ExternalServiceError('Failed to generate embeddings', 503);
        }
    }
}
exports.OpenAIEmbeddingService = OpenAIEmbeddingService;
//# sourceMappingURL=OpenAIEmbeddingService.js.map