import OpenAI from 'openai';
import { ILLMService } from '../../domain/services/ILLMService';
import { ILogger } from '../../domain/services/ILogger';
import { CircuitBreaker, retryWithBackoff, RetryOptions } from '../../shared/retry';
import { ExternalServiceError } from '../../shared/errors';

export class OpenAILLMService implements ILLMService {
  private readonly circuitBreaker = new CircuitBreaker();
  private readonly retryOptions: RetryOptions;

  constructor(
    private readonly openai: OpenAI,
    private readonly logger: ILogger,
    private readonly model: string = 'gpt-4',
    retryOptions: RetryOptions = {}
  ) {
    this.retryOptions = retryOptions;
  }

  async generateCompletion(prompt: string): Promise<string> {
    const startTime = Date.now();
    const promptLength = prompt.length;

    this.logger.debug('Generating completion', {
      model: this.model,
      promptLength
    });

    try {
      return await retryWithBackoff(async () => {
        const response = await this.circuitBreaker.execute(() =>
          this.openai.chat.completions.create({
            model: this.model,
            messages: [{ role: 'user', content: prompt }],
            temperature: 0.7
          })
        );

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
    } catch (error) {
      const duration = Date.now() - startTime;
      this.logger.error('Failed to generate completion', error as Error, {
        model: this.model,
        promptLength,
        durationMs: duration
      });

      if (error instanceof ExternalServiceError) {
        throw error;
      }
      throw new ExternalServiceError('Failed to generate completion', 503);
    }
  }
}
