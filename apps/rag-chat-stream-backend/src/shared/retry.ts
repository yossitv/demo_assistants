import { ExternalServiceError } from './errors';
import { ILogger } from '../domain/services/ILogger';

export interface RetryOptions {
  maxAttempts?: number;
  initialDelayMs?: number;
  maxDelayMs?: number;
  logger?: ILogger;
}

const defaultRetryOptions = {
  maxAttempts: 3,
  initialDelayMs: 1000,
  maxDelayMs: 10000
};

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Determines if an error is retryable based on error type and status code
 * Retries on:
 * - Network errors (ECONNRESET, ETIMEDOUT, ENOTFOUND, etc.)
 * - 429 (Rate Limit)
 * - 503 (Service Unavailable)
 * - 502 (Bad Gateway)
 * - 504 (Gateway Timeout)
 *
 * Does NOT retry on:
 * - 4xx errors (except 429)
 * - Circuit breaker errors
 */
export function isRetryableError(error: unknown): boolean {
  // Don't retry circuit breaker errors
  if (error instanceof ExternalServiceError && error.message.includes('Circuit breaker')) {
    return false;
  }

  // Check for network errors
  if (error && typeof error === 'object') {
    const err = error as any;

    // Common network error codes
    const networkErrorCodes = [
      'ECONNRESET',
      'ETIMEDOUT',
      'ENOTFOUND',
      'ECONNREFUSED',
      'ENETUNREACH',
      'EAI_AGAIN'
    ];

    if (err.code && networkErrorCodes.includes(err.code)) {
      return true;
    }

    // Check HTTP status codes
    const statusCode = err.status || err.statusCode || err.response?.status;
    if (statusCode) {
      // Retry on rate limits and service unavailable
      if (statusCode === 429 || statusCode === 503 || statusCode === 502 || statusCode === 504) {
        return true;
      }

      // Don't retry on 4xx errors (except 429)
      if (statusCode >= 400 && statusCode < 500) {
        return false;
      }
    }

    // Retry on timeout errors
    if (err.message && (
      err.message.includes('timeout') ||
      err.message.includes('ETIMEDOUT') ||
      err.message.includes('ECONNRESET')
    )) {
      return true;
    }
  }

  // Default: retry on unknown errors (conservative approach)
  return true;
}

export class CircuitBreaker {
  private failureCount = 0;
  private openUntil = 0;

  constructor(
    private readonly failureThreshold: number = 5,
    private readonly cooldownMs: number = 30000,
    private readonly logger?: ILogger
  ) {}

  get isOpen(): boolean {
    return Date.now() < this.openUntil;
  }

  async execute<T>(operation: () => Promise<T>): Promise<T> {
    if (this.isOpen) {
      if (this.logger) {
        this.logger.info('Circuit breaker is open, skipping external call', {
          cooldownMs: this.cooldownMs,
          opensUntil: new Date(this.openUntil).toISOString()
        });
      }
      throw new ExternalServiceError('Circuit breaker open, skipping external call');
    }

    try {
      const result = await operation();
      // Reset failure count on success
      if (this.failureCount > 0 && this.logger) {
        this.logger.info('Circuit breaker operation succeeded, resetting failure count', {
          previousFailureCount: this.failureCount
        });
      }
      this.failureCount = 0;
      return result;
    } catch (error) {
      this.failureCount += 1;
      if (this.failureCount >= this.failureThreshold) {
        this.openUntil = Date.now() + this.cooldownMs;
        if (this.logger) {
          this.logger.error('Circuit breaker opened due to consecutive failures',
            error instanceof Error ? error : new Error(String(error)), {
            failureThreshold: this.failureThreshold,
            cooldownMs: this.cooldownMs,
            opensUntil: new Date(this.openUntil).toISOString()
          });
        }
        this.failureCount = 0;
      } else if (this.logger) {
        this.logger.info('Circuit breaker operation failed', {
          failureCount: this.failureCount,
          failureThreshold: this.failureThreshold,
          error: error instanceof Error ? error.message : String(error)
        });
      }
      throw error;
    }
  }
}

/**
 * Retries an operation with exponential backoff
 *
 * @param operation - The async operation to retry
 * @param options - Retry configuration options
 * @returns The result of the operation
 *
 * Exponential backoff formula: delay = initialDelayMs * (2 ** attempt)
 * - attempt 0: initialDelayMs * 1 = 1000ms
 * - attempt 1: initialDelayMs * 2 = 2000ms
 * - attempt 2: initialDelayMs * 4 = 4000ms
 */
export const retryWithBackoff = async <T>(
  operation: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> => {
  const { maxAttempts, initialDelayMs, maxDelayMs, logger } = {
    ...defaultRetryOptions,
    ...options
  };

  let lastError: unknown;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      if (attempt > 0 && logger) {
        logger.info(`Retry attempt ${attempt + 1}/${maxAttempts}`);
      }
      return await operation();
    } catch (error) {
      lastError = error;

      // Don't retry on non-retryable errors
      if (!isRetryableError(error)) {
        if (logger) {
          logger.info('Error is not retryable, failing immediately', { error });
        }
        throw error;
      }

      // Don't retry if we've exhausted attempts
      if (attempt === maxAttempts - 1) {
        if (logger) {
          logger.error('Max retry attempts exhausted',
            error instanceof Error ? error : new Error(String(error)), {
            totalAttempts: maxAttempts,
            error: error instanceof Error ? error.message : String(error)
          });
        }
        break;
      }

      // Calculate exponential backoff delay: initialDelay * (2 ** attempt)
      const delay = Math.min(maxDelayMs, initialDelayMs * Math.pow(2, attempt));

      if (logger) {
        logger.info(`Retry attempt ${attempt + 1}/${maxAttempts} failed, retrying in ${delay}ms`, {
          attemptNumber: attempt + 1,
          maxAttempts,
          delayMs: delay,
          error: error instanceof Error ? error.message : String(error)
        });
      }

      await sleep(delay);
    }
  }

  throw lastError;
};
