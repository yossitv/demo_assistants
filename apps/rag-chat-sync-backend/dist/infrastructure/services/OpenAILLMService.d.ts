import OpenAI from 'openai';
import { ILLMService } from '../../domain/services/ILLMService';
import { ILogger } from '../../domain/services/ILogger';
import { RetryOptions } from '../../shared/retry';
export declare class OpenAILLMService implements ILLMService {
    private readonly openai;
    private readonly logger;
    private readonly model;
    private readonly circuitBreaker;
    private readonly retryOptions;
    constructor(openai: OpenAI, logger: ILogger, model?: string, retryOptions?: RetryOptions);
    generateCompletion(prompt: string): Promise<string>;
}
//# sourceMappingURL=OpenAILLMService.d.ts.map