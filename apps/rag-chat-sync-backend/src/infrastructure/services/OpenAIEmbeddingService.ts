import OpenAI from 'openai';
import { IEmbeddingService } from '../../domain/services/IEmbeddingService';
import { ILogger } from '../../domain/services/ILogger';
import { Embedding } from '../../domain/value-objects/Embedding';
import { CircuitBreaker, retryWithBackoff, RetryOptions } from '../../shared/retry';
import { ExternalServiceError } from '../../shared/errors';

export class OpenAIEmbeddingService implements IEmbeddingService {
  private readonly circuitBreaker = new CircuitBreaker();
  private readonly retryOptions: RetryOptions;

  constructor(
    private readonly openai: OpenAI,
    private readonly logger: ILogger,
    private readonly model: string = 'text-embedding-3-small',
    retryOptions: RetryOptions = {}
  ) {
    this.retryOptions = retryOptions;
  }

  async generateEmbedding(text: string): Promise<Embedding> {
    const startTime = Date.now();
    const textLength = text.length;

    this.logger.debug('Generating embedding', {
      model: this.model,
      textLength
    });

    try {
      return await retryWithBackoff(async () => {
        const response = await this.circuitBreaker.execute(() =>
          this.openai.embeddings.create({
            model: this.model,
            input: text
          })
        );

        const duration = Date.now() - startTime;
        this.logger.debug('Embedding generated successfully', {
          model: this.model,
          textLength,
          embeddingDimensions: response.data[0].embedding.length,
          durationMs: duration
        });

        return new Embedding(response.data[0].embedding);
      }, this.retryOptions);
    } catch (error) {
      const duration = Date.now() - startTime;
      this.logger.error('Failed to generate embedding', error as Error, {
        model: this.model,
        textLength,
        durationMs: duration
      });

      if (error instanceof ExternalServiceError) {
        throw error;
      }
      throw new ExternalServiceError('Failed to generate embedding', 503);
    }
  }

  async generateEmbeddings(texts: string[]): Promise<Embedding[]> {
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
      return await retryWithBackoff(async () => {
        const response = await this.circuitBreaker.execute(() =>
          this.openai.embeddings.create({
            model: this.model,
            input: texts
          })
        );

        const duration = Date.now() - startTime;
        this.logger.debug('Embeddings batch generated successfully', {
          model: this.model,
          textCount,
          totalTextLength,
          embeddingDimensions: response.data[0].embedding.length,
          durationMs: duration
        });

        return response.data.map(item => new Embedding(item.embedding));
      }, this.retryOptions);
    } catch (error) {
      const duration = Date.now() - startTime;
      this.logger.error('Failed to generate embeddings batch', error as Error, {
        model: this.model,
        textCount,
        totalTextLength,
        durationMs: duration
      });

      if (error instanceof ExternalServiceError) {
        throw error;
      }
      throw new ExternalServiceError('Failed to generate embeddings', 503);
    }
  }
}
