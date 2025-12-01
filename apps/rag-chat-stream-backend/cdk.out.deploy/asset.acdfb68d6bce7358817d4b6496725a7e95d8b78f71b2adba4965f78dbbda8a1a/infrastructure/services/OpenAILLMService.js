"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.OpenAILLMService = void 0;
const retry_1 = require("../../shared/retry");
const errors_1 = require("../../shared/errors");
class OpenAILLMService {
    openai;
    logger;
    model;
    circuitBreaker = new retry_1.CircuitBreaker();
    retryOptions;
    constructor(openai, logger, model = 'gpt-4', retryOptions = {}) {
        this.openai = openai;
        this.logger = logger;
        this.model = model;
        this.retryOptions = retryOptions;
    }
    async generateCompletion(prompt) {
        const startTime = Date.now();
        const promptLength = prompt.length;
        this.logger.debug('Generating completion', {
            model: this.model,
            promptLength
        });
        try {
            return await (0, retry_1.retryWithBackoff)(async () => {
                const response = await this.circuitBreaker.execute(() => this.openai.chat.completions.create({
                    model: this.model,
                    messages: [{ role: 'user', content: prompt }],
                    temperature: 0.7
                }));
                const completion = response.choices[0].message.content || '';
                const duration = Date.now() - startTime;
                this.logger.debug('Completion generated successfully', {
                    model: this.model,
                    promptLength,
                    completionLength: completion.length,
                    promptTokens: response.usage?.prompt_tokens,
                    completionTokens: response.usage?.completion_tokens,
                    totalTokens: response.usage?.total_tokens,
                    finishReason: response.choices[0].finish_reason,
                    durationMs: duration
                });
                return completion;
            }, this.retryOptions);
        }
        catch (error) {
            const duration = Date.now() - startTime;
            this.logger.error('Failed to generate completion', error, {
                model: this.model,
                promptLength,
                durationMs: duration
            });
            if (error instanceof errors_1.ExternalServiceError) {
                throw error;
            }
            throw new errors_1.ExternalServiceError('Failed to generate completion', 503);
        }
    }
}
exports.OpenAILLMService = OpenAILLMService;
//# sourceMappingURL=OpenAILLMService.js.map