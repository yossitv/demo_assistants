import React from 'react';

interface ErrorMessageProps {
  message: string;
  onRetry?: () => void;
  onDismiss?: () => void;
}

const ErrorMessage: React.FC<ErrorMessageProps> = ({ message, onRetry, onDismiss }) => {
  return (
    <div
      className="bg-red-50 border border-red-200 rounded-lg p-4 shadow-sm"
      role="alert"
      aria-live="assertive"
    >
      <div className="flex items-start gap-3">
        {/* Error Icon */}
        <div className="flex-shrink-0">
          <svg
            className="w-6 h-6 text-red-600"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        </div>

        {/* Error Message Content */}
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-medium text-red-800">Error</h3>
          <p className="mt-1 text-sm text-red-700">{message}</p>

          {/* Action Buttons */}
          {(onRetry || onDismiss) && (
            <div className="mt-3 flex flex-col sm:flex-row gap-2 sm:gap-3">
              {onRetry && (
                <button
                  onClick={onRetry}
                  type="button"
                  className="inline-flex items-center justify-center px-4 py-2.5 min-h-[44px] text-sm font-medium text-red-700 bg-red-100 hover:bg-red-200 active:bg-red-300 rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 touch-manipulation"
                  aria-label="Retry the failed operation"
                >
                  <svg
                    className="w-4 h-4 mr-1.5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                    />
                  </svg>
                  Retry
                </button>
              )}

              {onDismiss && (
                <button
                  onClick={onDismiss}
                  type="button"
                  className="inline-flex items-center justify-center px-4 py-2.5 min-h-[44px] text-sm font-medium text-red-700 bg-transparent hover:bg-red-100 active:bg-red-200 rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 touch-manipulation"
                  aria-label="Dismiss this error message"
                >
                  Dismiss
                </button>
              )}
            </div>
          )}
        </div>

        {/* Dismiss Icon Button (alternative to dismiss text button) */}
        {onDismiss && !onRetry && (
          <button
            onClick={onDismiss}
            type="button"
            className="flex-shrink-0 p-2 min-w-[44px] min-h-[44px] text-red-400 hover:text-red-600 active:text-red-700 transition-colors focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 rounded touch-manipulation flex items-center justify-center"
            aria-label="Dismiss error"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        )}
      </div>
    </div>
  );
};

export default ErrorMessage;
