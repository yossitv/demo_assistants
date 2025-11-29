import { ILogger } from '../domain/services/ILogger';
export interface RetryOptions {
    maxAttempts?: number;
    initialDelayMs?: number;
    maxDelayMs?: number;
    logger?: ILogger;
}
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
export declare function isRetryableError(error: unknown): boolean;
export declare class CircuitBreaker {
    private readonly failureThreshold;
    private readonly cooldownMs;
    private readonly logger?;
    private failureCount;
    private openUntil;
    constructor(failureThreshold?: number, cooldownMs?: number, logger?: ILogger | undefined);
    get isOpen(): boolean;
    execute<T>(operation: () => Promise<T>): Promise<T>;
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
export declare const retryWithBackoff: <T>(operation: () => Promise<T>, options?: RetryOptions) => Promise<T>;
//# sourceMappingURL=retry.d.ts.map