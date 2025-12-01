/**
 * Custom error class for API-related errors
 */
export class ApiError extends Error {
  statusCode?: number;
  originalError?: unknown;

  constructor(message: string, statusCode?: number, originalError?: unknown) {
    super(message);
    this.name = 'ApiError';
    this.statusCode = statusCode;
    this.originalError = originalError;

    // Maintains proper stack trace for where our error was thrown (only available on V8)
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, ApiError);
    }
  }

  /**
   * Extract error message from API response
   * Handles various error response formats
   */
  static extractErrorMessage(error: unknown): string {
    // Handle ApiError instances
    if (error instanceof ApiError) {
      return error.message;
    }

    // Handle standard Error instances
    if (error instanceof Error) {
      return error.message;
    }

    // Handle API error response objects
    if (error && typeof error === 'object') {
      const errorObj = error as Record<string, unknown>;

      // Try common error message fields
      if (typeof errorObj.message === 'string') {
        return errorObj.message;
      }
      if (typeof errorObj.error === 'string') {
        return errorObj.error;
      }
      if (typeof errorObj.detail === 'string') {
        return errorObj.detail;
      }

      // Handle nested error objects
      if (errorObj.error && typeof errorObj.error === 'object') {
        const nestedError = errorObj.error as Record<string, unknown>;
        if (typeof nestedError.message === 'string') {
          return nestedError.message;
        }
      }
    }

    // Handle string errors
    if (typeof error === 'string') {
      return error;
    }

    // Fallback for unknown error types
    return 'An unknown error occurred';
  }

  /**
   * Create ApiError from fetch response
   */
  static async fromResponse(response: Response): Promise<ApiError> {
    let message = `HTTP ${response.status}: ${response.statusText}`;
    let errorData: unknown;

    try {
      const contentType = response.headers.get('content-type');
      if (contentType?.includes('application/json')) {
        errorData = await response.json();
        const extractedMessage = this.extractErrorMessage(errorData);
        if (extractedMessage !== 'An unknown error occurred') {
          message = extractedMessage;
        }
      } else {
        const text = await response.text();
        if (text) {
          message = text;
        }
      }
    } catch (parseError) {
      // If we can't parse the error response, use the default message
      console.error('Failed to parse error response:', parseError);
    }

    return new ApiError(message, response.status, errorData);
  }

  /**
   * Create ApiError from network error
   */
  static fromNetworkError(error: unknown): ApiError {
    const message = this.extractErrorMessage(error);
    return new ApiError(
      `Network error: ${message}`,
      undefined,
      error
    );
  }

  /**
   * Check if error is a network error (no response from server)
   */
  isNetworkError(): boolean {
    return this.statusCode === undefined;
  }

  /**
   * Check if error is a client error (4xx)
   */
  isClientError(): boolean {
    return this.statusCode !== undefined && this.statusCode >= 400 && this.statusCode < 500;
  }

  /**
   * Check if error is a server error (5xx)
   */
  isServerError(): boolean {
    return this.statusCode !== undefined && this.statusCode >= 500;
  }

  /**
   * Check if error is an authentication error (401)
   */
  isAuthError(): boolean {
    return this.statusCode === 401;
  }

  /**
   * Check if error is a not found error (404)
   */
  isNotFoundError(): boolean {
    return this.statusCode === 404;
  }
}
