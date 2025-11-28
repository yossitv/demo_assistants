/**
 * Custom API Error class for handling various API error formats
 * Supports extracting error messages from different response structures
 */
export class ApiError extends Error {
  public statusCode: number;
  public isNetworkError: boolean;
  public originalError?: unknown;

  constructor(
    message: string,
    statusCode: number = 500,
    isNetworkError: boolean = false,
    originalError?: unknown
  ) {
    super(message);
    this.name = 'ApiError';
    this.statusCode = statusCode;
    this.isNetworkError = isNetworkError;
    this.originalError = originalError;

    // Maintains proper stack trace for where our error was thrown (only available on V8)
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, ApiError);
    }
  }

  /**
   * Extract error message from various API response formats
   * Supports:
   * - { error: string }
   * - { error: { message: string } }
   * - { message: string }
   * - { errors: [{ message: string }] }
   * - { errors: string[] }
   * - Plain string responses
   */
  static extractErrorMessage(response: unknown): string {
    // Handle null/undefined
    if (response == null) {
      return 'An unknown error occurred';
    }

    // Handle plain string
    if (typeof response === 'string') {
      return response || 'An unknown error occurred';
    }

    // Handle non-object types
    if (typeof response !== 'object') {
      return String(response);
    }

    const data = response as Record<string, unknown>;

    // Handle { error: string }
    if (typeof data.error === 'string' && data.error.length > 0) {
      return data.error;
    }

    // Handle { error: { message: string } }
    if (
      typeof data.error === 'object' &&
      data.error !== null &&
      'message' in data.error &&
      typeof (data.error as Record<string, unknown>).message === 'string'
    ) {
      const msg = (data.error as Record<string, unknown>).message as string;
      if (msg.length > 0) {
        return msg;
      }
    }

    // Handle { message: string }
    if (typeof data.message === 'string' && data.message.length > 0) {
      return data.message;
    }

    // Handle { errors: [{ message: string }] }
    if (Array.isArray(data.errors) && data.errors.length > 0) {
      const firstError = data.errors[0];
      if (
        typeof firstError === 'object' &&
        firstError !== null &&
        'message' in firstError &&
        typeof (firstError as Record<string, unknown>).message === 'string'
      ) {
        const msg = (firstError as Record<string, unknown>).message as string;
        if (msg.length > 0) {
          return msg;
        }
      }
      // Handle { errors: string[] }
      if (typeof firstError === 'string' && firstError.length > 0) {
        return firstError;
      }
    }

    // Fallback
    return 'An unknown error occurred';
  }

  /**
   * Create ApiError from a fetch Response object
   */
  static async fromResponse(response: Response): Promise<ApiError> {
    let message = 'An unknown error occurred';
    let data: unknown;

    try {
      const contentType = response.headers.get('content-type');
      if (contentType?.includes('application/json')) {
        data = await response.json();
        message = ApiError.extractErrorMessage(data);
      } else {
        const text = await response.text();
        message = text || `HTTP ${response.status}: ${response.statusText}`;
      }
    } catch (error) {
      message = `HTTP ${response.status}: ${response.statusText}`;
    }

    return new ApiError(message, response.status, false, data);
  }

  /**
   * Create ApiError from a network error (fetch failure, timeout, etc.)
   */
  static fromNetworkError(error: unknown): ApiError {
    let message = 'Network request failed';

    if (error instanceof Error) {
      message = error.message;
    } else if (typeof error === 'string') {
      message = error;
    }

    return new ApiError(message, 0, true, error);
  }

  /**
   * Create ApiError from any error
   */
  static fromError(error: unknown, defaultMessage?: string): ApiError {
    if (error instanceof ApiError) {
      return error;
    }

    // Check if it's a Response object (only available in browser/fetch contexts)
    if (typeof Response !== 'undefined' && error instanceof Response) {
      // Note: This returns a Promise, should use fromResponse instead
      throw new Error('Use ApiError.fromResponse for Response objects');
    }

    if (error instanceof Error) {
      // Check if it's a network-related error
      const isNetworkError =
        error.name === 'TypeError' ||
        error.message.includes('fetch') ||
        error.message.includes('network') ||
        error.message.includes('Failed to fetch');

      return new ApiError(
        error.message || defaultMessage || 'An error occurred',
        isNetworkError ? 0 : 500,
        isNetworkError,
        error
      );
    }

    return new ApiError(
      defaultMessage || 'An unknown error occurred',
      500,
      false,
      error
    );
  }

  /**
   * Check if an error is a network error
   */
  static isNetworkError(error: unknown): boolean {
    if (error instanceof ApiError) {
      return error.isNetworkError;
    }

    if (error instanceof Error) {
      return (
        error.name === 'TypeError' ||
        error.message.includes('fetch') ||
        error.message.includes('network') ||
        error.message.includes('Failed to fetch')
      );
    }

    return false;
  }

  /**
   * Get status code from error
   */
  static getStatusCode(error: unknown): number {
    if (error instanceof ApiError) {
      return error.statusCode;
    }

    return 500;
  }
}
