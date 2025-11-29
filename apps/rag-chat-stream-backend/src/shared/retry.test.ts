import { CircuitBreaker, retryWithBackoff, isRetryableError } from './retry';
import { ExternalServiceError } from './errors';
import { ILogger } from '../domain/services/ILogger';

describe('isRetryableError', () => {
  it('returns true for network errors (ECONNRESET)', () => {
    const error = { code: 'ECONNRESET', message: 'Connection reset' };
    expect(isRetryableError(error)).toBe(true);
  });

  it('returns true for network errors (ETIMEDOUT)', () => {
    const error = { code: 'ETIMEDOUT', message: 'Connection timed out' };
    expect(isRetryableError(error)).toBe(true);
  });

  it('returns true for network errors (ENOTFOUND)', () => {
    const error = { code: 'ENOTFOUND', message: 'DNS lookup failed' };
    expect(isRetryableError(error)).toBe(true);
  });

  it('returns true for 429 rate limit errors', () => {
    const error = { status: 429, message: 'Too Many Requests' };
    expect(isRetryableError(error)).toBe(true);
  });

  it('returns true for 503 service unavailable errors', () => {
    const error = { statusCode: 503, message: 'Service Unavailable' };
    expect(isRetryableError(error)).toBe(true);
  });

  it('returns true for 502 bad gateway errors', () => {
    const error = { response: { status: 502 }, message: 'Bad Gateway' };
    expect(isRetryableError(error)).toBe(true);
  });

  it('returns true for 504 gateway timeout errors', () => {
    const error = { status: 504, message: 'Gateway Timeout' };
    expect(isRetryableError(error)).toBe(true);
  });

  it('returns false for 400 bad request errors', () => {
    const error = { status: 400, message: 'Bad Request' };
    expect(isRetryableError(error)).toBe(false);
  });

  it('returns false for 401 unauthorized errors', () => {
    const error = { statusCode: 401, message: 'Unauthorized' };
    expect(isRetryableError(error)).toBe(false);
  });

  it('returns false for 403 forbidden errors', () => {
    const error = { status: 403, message: 'Forbidden' };
    expect(isRetryableError(error)).toBe(false);
  });

  it('returns false for 404 not found errors', () => {
    const error = { statusCode: 404, message: 'Not Found' };
    expect(isRetryableError(error)).toBe(false);
  });

  it('returns false for circuit breaker errors', () => {
    const error = new ExternalServiceError('Circuit breaker open, skipping external call');
    expect(isRetryableError(error)).toBe(false);
  });

  it('returns true for errors with timeout in message', () => {
    const error = new Error('Request timeout occurred');
    expect(isRetryableError(error)).toBe(true);
  });

  it('returns true for unknown errors (conservative approach)', () => {
    const error = new Error('Something went wrong');
    expect(isRetryableError(error)).toBe(true);
  });
});

describe('retryWithBackoff', () => {
  it('succeeds on first attempt without retry', async () => {
    let attempts = 0;

    const result = await retryWithBackoff(
      async () => {
        attempts += 1;
        return 'success';
      },
      { maxAttempts: 3, initialDelayMs: 0, maxDelayMs: 0 }
    );

    expect(result).toBe('success');
    expect(attempts).toBe(1);
  });

  it('retries until the operation succeeds', async () => {
    let attempts = 0;

    const result = await retryWithBackoff(
      async () => {
        attempts += 1;
        if (attempts < 3) {
          throw new Error('temporary failure');
        }
        return 'ok';
      },
      { maxAttempts: 3, initialDelayMs: 0, maxDelayMs: 0 }
    );

    expect(result).toBe('ok');
    expect(attempts).toBe(3);
  });

  it('throws after max attempts are exhausted', async () => {
    let attempts = 0;

    await expect(
      retryWithBackoff(
        async () => {
          attempts += 1;
          throw new Error('persistent error');
        },
        { maxAttempts: 3, initialDelayMs: 0, maxDelayMs: 0 }
      )
    ).rejects.toThrow('persistent error');

    expect(attempts).toBe(3);
  });

  it('stops retrying immediately on non-retryable errors (4xx)', async () => {
    let attempts = 0;
    const error = { status: 400, message: 'Bad Request' };

    await expect(
      retryWithBackoff(
        async () => {
          attempts += 1;
          throw error;
        },
        { maxAttempts: 3, initialDelayMs: 0, maxDelayMs: 0 }
      )
    ).rejects.toEqual(error);

    expect(attempts).toBe(1);
  });

  it('stops retrying on circuit breaker errors', async () => {
    let attempts = 0;

    await expect(
      retryWithBackoff(
        async () => {
          attempts += 1;
          throw new ExternalServiceError('Circuit breaker open, skipping external call');
        },
        { maxAttempts: 3, initialDelayMs: 0, maxDelayMs: 0 }
      )
    ).rejects.toBeInstanceOf(ExternalServiceError);

    expect(attempts).toBe(1);
  });

  it('retries on rate limit errors (429)', async () => {
    let attempts = 0;

    await expect(
      retryWithBackoff(
        async () => {
          attempts += 1;
          const error: any = new Error('Rate limited');
          error.status = 429;
          throw error;
        },
        { maxAttempts: 3, initialDelayMs: 0, maxDelayMs: 0 }
      )
    ).rejects.toThrow('Rate limited');

    expect(attempts).toBe(3);
  });

  it('retries on network errors (ECONNRESET)', async () => {
    let attempts = 0;

    await expect(
      retryWithBackoff(
        async () => {
          attempts += 1;
          const error: any = new Error('Connection reset');
          error.code = 'ECONNRESET';
          throw error;
        },
        { maxAttempts: 3, initialDelayMs: 0, maxDelayMs: 0 }
      )
    ).rejects.toThrow('Connection reset');

    expect(attempts).toBe(3);
  });

  it('uses exponential backoff for delays', async () => {
    const delays: number[] = [];
    let attempts = 0;
    const startTime = Date.now();

    await expect(
      retryWithBackoff(
        async () => {
          if (attempts > 0) {
            delays.push(Date.now() - startTime);
          }
          attempts += 1;
          throw new Error('always fails');
        },
        { maxAttempts: 3, initialDelayMs: 100, maxDelayMs: 1000 }
      )
    ).rejects.toThrow('always fails');

    expect(attempts).toBe(3);
    expect(delays.length).toBe(2);
    // First retry: ~100ms delay (100 * 2^0)
    // Second retry: ~200ms delay (100 * 2^1)
    expect(delays[0]).toBeGreaterThanOrEqual(90);
    expect(delays[0]).toBeLessThan(150);
    expect(delays[1]).toBeGreaterThanOrEqual(280); // Cumulative: 100 + 200
    expect(delays[1]).toBeLessThan(350);
  });

  it('respects maxDelayMs cap', async () => {
    jest.useFakeTimers();
    const setTimeoutSpy = jest.spyOn(global, 'setTimeout');

    try {
      let attempts = 0;

      const retryPromise = retryWithBackoff(
        async () => {
          attempts += 1;
          throw new Error('always fails');
        },
        { maxAttempts: 4, initialDelayMs: 1000, maxDelayMs: 1500 }
      );

      const rejection = expect(retryPromise).rejects.toThrow('always fails');
      await jest.runAllTimersAsync();
      await rejection;
      expect(attempts).toBe(4);
      expect(setTimeoutSpy).toHaveBeenCalledTimes(3);
      expect(setTimeoutSpy).toHaveBeenNthCalledWith(
        1,
        expect.any(Function),
        1000
      );
      expect(setTimeoutSpy).toHaveBeenNthCalledWith(
        2,
        expect.any(Function),
        1500
      );
      expect(setTimeoutSpy).toHaveBeenNthCalledWith(
        3,
        expect.any(Function),
        1500
      );
    } finally {
      setTimeoutSpy.mockRestore();
      jest.useRealTimers();
    }
  });

  it('logs retry attempts when logger is provided', async () => {
    const mockLogger: ILogger = {
      debug: jest.fn(),
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn()
    };

    let attempts = 0;
    await expect(
      retryWithBackoff(
        async () => {
          attempts += 1;
          throw new Error('always fails');
        },
        { maxAttempts: 3, initialDelayMs: 0, maxDelayMs: 0, logger: mockLogger }
      )
    ).rejects.toThrow('always fails');

    expect(attempts).toBe(3);
    // Should log retry attempts (attempts 2 and 3)
    expect(mockLogger.info).toHaveBeenCalledWith('Retry attempt 2/3');
    expect(mockLogger.info).toHaveBeenCalledWith('Retry attempt 3/3');
    expect(mockLogger.error).toHaveBeenCalledWith(
      'Max retry attempts exhausted',
      expect.any(Error),
      expect.objectContaining({
        totalAttempts: 3,
        error: 'always fails'
      })
    );
  });

  it('logs when error is not retryable', async () => {
    const mockLogger: ILogger = {
      debug: jest.fn(),
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn()
    };

    const error = { status: 400, message: 'Bad Request' };

    await expect(
      retryWithBackoff(
        async () => {
          throw error;
        },
        { maxAttempts: 3, initialDelayMs: 0, maxDelayMs: 0, logger: mockLogger }
      )
    ).rejects.toEqual(error);

    expect(mockLogger.info).toHaveBeenCalledWith(
      'Error is not retryable, failing immediately',
      { error }
    );
  });
});

describe('CircuitBreaker', () => {
  it('allows successful operations', async () => {
    const breaker = new CircuitBreaker(3, 1000);
    const result = await breaker.execute(async () => 'success');
    expect(result).toBe('success');
    expect(breaker.isOpen).toBe(false);
  });

  it('opens after consecutive failures reach threshold', async () => {
    const breaker = new CircuitBreaker(3, 1000);
    const failingCall = () => breaker.execute(async () => {
      throw new Error('boom');
    });

    // First two failures don't open the circuit
    await expect(failingCall()).rejects.toThrow('boom');
    expect(breaker.isOpen).toBe(false);

    await expect(failingCall()).rejects.toThrow('boom');
    expect(breaker.isOpen).toBe(false);

    // Third failure opens the circuit
    await expect(failingCall()).rejects.toThrow('boom');
    expect(breaker.isOpen).toBe(true);
  });

  it('rejects calls when circuit is open', async () => {
    const breaker = new CircuitBreaker(1, 1000);

    // Trigger circuit to open
    await expect(
      breaker.execute(async () => {
        throw new Error('boom');
      })
    ).rejects.toThrow('boom');

    expect(breaker.isOpen).toBe(true);

    // Next call should be rejected immediately
    await expect(
      breaker.execute(async () => 'should not run')
    ).rejects.toBeInstanceOf(ExternalServiceError);
  });

  it('resets failure count on successful operation', async () => {
    const breaker = new CircuitBreaker(3, 1000);

    // Two failures
    await expect(
      breaker.execute(async () => {
        throw new Error('fail');
      })
    ).rejects.toThrow('fail');

    await expect(
      breaker.execute(async () => {
        throw new Error('fail');
      })
    ).rejects.toThrow('fail');

    // Success resets the counter
    await breaker.execute(async () => 'success');

    // Circuit should still be closed after 2 more failures
    await expect(
      breaker.execute(async () => {
        throw new Error('fail');
      })
    ).rejects.toThrow('fail');

    await expect(
      breaker.execute(async () => {
        throw new Error('fail');
      })
    ).rejects.toThrow('fail');

    expect(breaker.isOpen).toBe(false);
  });
});
