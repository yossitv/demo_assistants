import axios from 'axios';
import * as cheerio from 'cheerio';
import { ICrawlerService, CrawledContent } from '../../domain/services/ICrawlerService';
import { CircuitBreaker, retryWithBackoff, RetryOptions } from '../../shared/retry';
import { ExternalServiceError } from '../../shared/errors';

export class CheerioCrawlerService implements ICrawlerService {
  private readonly circuitBreaker: CircuitBreaker;
  private readonly retryOptions: RetryOptions;
  private readonly requestTimeoutMs = 10000; // 10 seconds

  constructor(retryOptions: RetryOptions = {}) {
    this.circuitBreaker = new CircuitBreaker();
    this.retryOptions = retryOptions;
  }

  async crawlUrl(url: string): Promise<CrawledContent> {
    // Validate URL before making the request
    this.validateUrl(url);

    try {
      return await retryWithBackoff(async () => {
        const response = await this.circuitBreaker.execute(() =>
          axios.get(url, {
            timeout: this.requestTimeoutMs,
            headers: {
              'User-Agent': 'Mozilla/5.0 (compatible; RAG-Crawler/1.0)'
            }
          })
        );

        const $ = cheerio.load(response.data);

        // Remove script and style tags
        $('script, style').remove();

        const title = $('title').text() || 'Untitled';
        const content = $('body').text().replace(/\s+/g, ' ').trim();
        const domain = new URL(url).hostname;

        return {
          url,
          domain,
          title,
          content,
          crawlDate: new Date()
        };
      }, this.retryOptions);
    } catch (error) {
      // Handle circuit breaker errors
      if (error instanceof ExternalServiceError) {
        throw error;
      }

      // Handle axios-specific errors
      if (axios.isAxiosError(error)) {
        const statusCode = error.response?.status;
        const errorMessage = error.response?.statusText || error.message;

        throw new ExternalServiceError(
          `Failed to crawl URL ${url}: ${errorMessage}`,
          statusCode || 502
        );
      }

      // Handle unknown errors
      throw new ExternalServiceError(
        `Failed to crawl URL ${url}: ${error instanceof Error ? error.message : 'Unknown error'}`,
        502
      );
    }
  }

  private validateUrl(url: string): void {
    if (!url || typeof url !== 'string') {
      throw new ExternalServiceError('URL is required and must be a string', 400);
    }

    try {
      const parsedUrl = new URL(url);

      // Only allow HTTP and HTTPS protocols
      if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
        throw new ExternalServiceError(
          `Invalid URL protocol: ${parsedUrl.protocol}. Only HTTP and HTTPS are allowed`,
          400
        );
      }
    } catch (error) {
      if (error instanceof ExternalServiceError) {
        throw error;
      }

      throw new ExternalServiceError(
        `Invalid URL format: ${error instanceof Error ? error.message : 'Unknown error'}`,
        400
      );
    }
  }
}
