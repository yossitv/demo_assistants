import OpenAI from 'openai';
import { IEmbeddingService } from '../../domain/services/IEmbeddingService';
import { ILogger } from '../../domain/services/ILogger';
import { Embedding } from '../../domain/value-objects/Embedding';
import { RetryOptions } from '../../shared/retry';
export declare class OpenAIEmbeddingService implements IEmbeddingService {
    private readonly openai;
    private readonly logger;
    private readonly model;
    private readonly circuitBreaker;
    private readonly retryOptions;
    constructor(openai: OpenAI, logger: ILogger, model?: string, retryOptions?: RetryOptions);
    generateEmbedding(text: string): Promise<Embedding>;
    generateEmbeddings(texts: string[]): Promise<Embedding[]>;
}
//# sourceMappingURL=OpenAIEmbeddingService.d.ts.map