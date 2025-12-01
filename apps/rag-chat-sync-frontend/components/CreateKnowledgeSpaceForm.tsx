'use client';

import React, { useEffect, useRef, useState } from 'react';
import { apiClient } from '@/lib/api/client';
import { isValidAgentName, isValidUrl } from '@/lib/utils/validation';
import ErrorMessage from '@/components/ErrorMessage';
import LoadingSpinner from '@/components/LoadingSpinner';

interface CreateKnowledgeSpaceFormProps {
  onSuccess?: (knowledgeSpaceId: string) => void;
}

const CreateKnowledgeSpaceForm: React.FC<CreateKnowledgeSpaceFormProps> = ({ onSuccess }) => {
  const [name, setName] = useState('');
  const [urls, setUrls] = useState<string[]>(['']);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const nameInputRef = useRef<HTMLInputElement>(null);
  const urlRefs = useRef<(HTMLInputElement | null)[]>([]);
  const errorRef = useRef<HTMLDivElement>(null);
  const successRef = useRef<HTMLDivElement>(null);

  // Validation errors
  const [nameError, setNameError] = useState<string | null>(null);
  const [urlErrors, setUrlErrors] = useState<(string | null)[]>([null]);

  const handleAddUrl = () => {
    setUrls([...urls, '']);
    setUrlErrors([...urlErrors, null]);
    urlRefs.current = [...urlRefs.current, null];
  };

  const handleRemoveUrl = (index: number) => {
    if (urls.length > 1) {
      const newUrls = urls.filter((_, i) => i !== index);
      const newUrlErrors = urlErrors.filter((_, i) => i !== index);
      setUrls(newUrls);
      setUrlErrors(newUrlErrors);
      urlRefs.current = urlRefs.current.filter((_, i) => i !== index);
    }
  };

  const handleUrlChange = (index: number, value: string) => {
    const newUrls = [...urls];
    newUrls[index] = value;
    setUrls(newUrls);

    // Clear error for this URL when user starts typing
    const newUrlErrors = [...urlErrors];
    newUrlErrors[index] = null;
    setUrlErrors(newUrlErrors);
  };

  const validateForm = (): boolean => {
    let isValid = true;
    let shouldFocusName = false;
    let firstInvalidUrlIndex: number | null = null;

    // Validate name
    if (!isValidAgentName(name)) {
      setNameError('Name is required and must be 100 characters or less');
      isValid = false;
      shouldFocusName = true;
    } else {
      setNameError(null);
    }

    // Validate URLs
    const newUrlErrors: (string | null)[] = [];
    const nonEmptyUrls = urls.filter(url => url.trim() !== '');

    if (nonEmptyUrls.length === 0) {
      setError('At least one URL is required');
      isValid = false;
      firstInvalidUrlIndex = 0;
    }

    urls.forEach((url, index) => {
      const trimmedUrl = url.trim();
      if (trimmedUrl === '') {
        newUrlErrors[index] = urls.length === 1 ? 'URL is required' : null;
        if (urls.length === 1) {
          isValid = false;
          if (firstInvalidUrlIndex === null) {
            firstInvalidUrlIndex = index;
          }
        }
      } else if (!isValidUrl(trimmedUrl)) {
        newUrlErrors[index] = 'Invalid URL format (must start with http:// or https://)';
        isValid = false;
        if (firstInvalidUrlIndex === null) {
          firstInvalidUrlIndex = index;
        }
      } else {
        newUrlErrors[index] = null;
      }
    });

    setUrlErrors(newUrlErrors);

    if (!isValid) {
      if (shouldFocusName && nameInputRef.current) {
        nameInputRef.current.focus({ preventScroll: true });
      } else if (
        firstInvalidUrlIndex !== null &&
        urlRefs.current[firstInvalidUrlIndex]
      ) {
        urlRefs.current[firstInvalidUrlIndex]?.focus({ preventScroll: true });
      }
    }

    return isValid;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Clear previous messages
    setError(null);
    setSuccess(null);

    // Validate form
    if (!validateForm()) {
      return;
    }

    // Filter out empty URLs
    const validUrls = urls.filter(url => url.trim() !== '');

    setLoading(true);

    try {
      const response = await apiClient.createKnowledgeSpace(name.trim(), validUrls);
      const knowledgeSpaceId = response.knowledgeSpace.id;

      // Show success message
      setSuccess(`Knowledge space created successfully! ID: ${knowledgeSpaceId}`);

      // Clear form
      setName('');
      setUrls(['']);
      setUrlErrors([null]);
      setNameError(null);
      urlRefs.current = [null];

      // Call onSuccess callback if provided
      if (onSuccess) {
        onSuccess(knowledgeSpaceId);
      }

      // Clear success message after 3 seconds
      setTimeout(() => {
        setSuccess(null);
      }, 3000);
    } catch (err) {
      // Handle error
      const errorMessage = err instanceof Error ? err.message : 'Failed to create knowledge space';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleRetry = () => {
    setError(null);
    handleSubmit(new Event('submit') as unknown as React.FormEvent);
  };

  useEffect(() => {
    if (error && errorRef.current) {
      errorRef.current.focus({ preventScroll: true });
    }
  }, [error]);

  useEffect(() => {
    if (success && successRef.current) {
      successRef.current.focus({ preventScroll: true });
    }
  }, [success]);

  return (
    <div className="w-full max-w-2xl mx-auto px-4 sm:px-0">
      <form
        onSubmit={handleSubmit}
        className="space-y-4 sm:space-y-6"
        noValidate
        aria-busy={loading}
        aria-live="polite"
      >
        {/* Form Header */}
        <header>
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900">Create Knowledge Space</h2>
          <p className="mt-1 text-sm text-gray-600">
            Create a new knowledge space by providing a name and one or more URLs to index.
          </p>
        </header>

        {loading && (
          <p className="sr-only" role="status">
            Creating knowledge space. Please wait.
          </p>
        )}

        {/* Error Message */}
        {error && (
          <div ref={errorRef} tabIndex={-1} aria-live="assertive">
            <ErrorMessage
              message={error}
              onRetry={handleRetry}
              onDismiss={() => setError(null)}
            />
          </div>
        )}

        {/* Success Message */}
        {success && (
          <div
            className="bg-green-50 border border-green-200 rounded-lg p-4 shadow-sm"
            role="alert"
            aria-live="polite"
            ref={successRef}
            tabIndex={-1}
          >
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0">
                <svg
                  className="w-6 h-6 text-green-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </div>
              <div className="flex-1">
                <h3 className="text-sm font-medium text-green-800">Success</h3>
                <p className="mt-1 text-sm text-green-700">{success}</p>
              </div>
            </div>
          </div>
        )}

        {/* Name Input */}
        <div>
          <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
            Knowledge Space Name <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            id="name"
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              setNameError(null);
            }}
            disabled={loading}
            ref={nameInputRef}
            className={`
              w-full px-3 sm:px-4 py-3 border rounded-lg text-base
              focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent
              disabled:bg-gray-100 disabled:cursor-not-allowed
              ${nameError ? 'border-red-500' : 'border-gray-300'}
              min-h-[48px] touch-manipulation
            `}
            placeholder="Enter knowledge space name"
            aria-invalid={nameError ? 'true' : 'false'}
            aria-describedby={nameError ? 'name-error' : undefined}
            aria-required="true"
            autoComplete="off"
          />
          {nameError && (
            <p id="name-error" className="mt-1 text-sm text-red-600" role="alert">
              {nameError}
            </p>
          )}
        </div>

        {/* URLs Input */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            URLs <span className="text-red-500">*</span>
          </label>
          <div className="space-y-3">
            {urls.map((url, index) => (
              <div key={index} className="flex flex-col sm:flex-row gap-2">
                <div className="flex-1">
                  <input
                    type="url"
                    value={url}
                    onChange={(e) => handleUrlChange(index, e.target.value)}
                    disabled={loading}
                    ref={(el) => {
                      urlRefs.current[index] = el;
                    }}
                    className={`
                      w-full px-3 sm:px-4 py-3 border rounded-lg text-base
                      focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent
                      disabled:bg-gray-100 disabled:cursor-not-allowed
                      ${urlErrors[index] ? 'border-red-500' : 'border-gray-300'}
                      min-h-[48px] touch-manipulation
                    `}
                    placeholder="https://example.com"
                    aria-invalid={urlErrors[index] ? 'true' : 'false'}
                    aria-describedby={urlErrors[index] ? `url-error-${index}` : undefined}
                    aria-required="true"
                    aria-label={`URL ${index + 1}`}
                    autoComplete="url"
                  />
                  {urlErrors[index] && (
                    <p id={`url-error-${index}`} className="mt-1 text-sm text-red-600" role="alert">
                      {urlErrors[index]}
                    </p>
                  )}
                </div>
                {urls.length > 1 && (
                  <button
                    type="button"
                    onClick={() => handleRemoveUrl(index)}
                    disabled={loading}
                    className="px-4 py-3 min-h-[48px] sm:min-w-[48px] w-full sm:w-auto text-red-600 hover:bg-red-50 active:bg-red-100 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-red-500 touch-manipulation flex items-center justify-center gap-2"
                    aria-label={`Remove URL ${index + 1}`}
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
                        d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                      />
                    </svg>
                    <span className="sm:hidden">Remove</span>
                  </button>
                )}
              </div>
            ))}
          </div>
          <button
            type="button"
            onClick={handleAddUrl}
            disabled={loading}
            className="mt-3 inline-flex items-center justify-center px-4 py-3 min-h-[48px] w-full sm:w-auto text-sm font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 active:bg-blue-200 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-blue-500 touch-manipulation"
            aria-label="Add another URL"
          >
            <svg
              className="w-5 h-5 mr-2"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 4v16m8-8H4"
              />
            </svg>
            Add URL
          </button>
        </div>

        {/* Submit Button */}
        <div className="flex items-center justify-end pt-4 border-t border-gray-200">
          <button
            type="submit"
            disabled={loading}
            className="inline-flex items-center justify-center px-6 py-3 min-h-[48px] w-full sm:w-auto text-base font-medium text-white bg-blue-600 hover:bg-blue-700 active:bg-blue-800 rounded-lg shadow-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 touch-manipulation"
          >
            {loading ? (
              <>
                <LoadingSpinner size="sm" className="mr-2" />
                Creating...
              </>
            ) : (
              'Create Knowledge Space'
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

export default CreateKnowledgeSpaceForm;
