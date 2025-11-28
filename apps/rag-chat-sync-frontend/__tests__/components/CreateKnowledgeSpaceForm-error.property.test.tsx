/**
 * Property-based tests for knowledge base error handling
 * Test Property 8: Knowledge base error handling (validates Requirement 2.5)
 *
 * Requirement 2.5: IF the knowledge base creation fails THEN the System SHALL display 
 * an error message to the User
 *
 * Feature: web-mvp, Property 8: Knowledge base error handling
 */

/**
 * @jest-environment jsdom
 */

import '@testing-library/jest-dom';
import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import * as fc from 'fast-check';
import CreateKnowledgeSpaceForm from '@/components/CreateKnowledgeSpaceForm';
import { apiClient } from '@/lib/api/client';
import { ApiError } from '@/lib/api/error';

// Mock the API client
jest.mock('@/lib/api/client');

describe('Property 8: Knowledge Base Error Handling', () => {
  const mockedApiClient = apiClient as jest.Mocked<typeof apiClient>;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  /**
   * Helper function to fill and submit the form using direct DOM manipulation
   * This is faster than userEvent for property-based tests with many iterations
   */
  const fillAndSubmitForm = async (name: string, url: string, container: HTMLElement) => {
    // Fill in the name using direct input events (faster than userEvent)
    const nameInput = container.querySelector('input[placeholder="Enter knowledge space name"]') as HTMLInputElement;
    if (nameInput) {
      fireEvent.change(nameInput, { target: { value: name } });
    }

    // Fill in the URL using direct input events
    const urlInput = container.querySelector('input[placeholder="https://example.com"]') as HTMLInputElement;
    if (urlInput) {
      fireEvent.change(urlInput, { target: { value: url } });
    }

    // Submit the form
    const form = container.querySelector('form') as HTMLFormElement;
    if (form) {
      fireEvent.submit(form);
    }
  };

  describe('Property: Requirement 2.5 - Error Message Display', () => {
    it('Property: For any error, system SHALL display error message to user', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 10, maxLength: 50 }).filter(s => s.trim().length >= 10 && /[a-zA-Z]/.test(s)),
          async (errorMessage) => {
            jest.clearAllMocks();

            // Mock API to reject with error
            mockedApiClient.createKnowledgeSpace.mockRejectedValue(
              new Error(errorMessage)
            );

            const { unmount, container } = render(<CreateKnowledgeSpaceForm />);

            try {
              await fillAndSubmitForm('Test Space', 'https://example.com', container);

              // Verify error message is displayed (Requirement 2.5)
              await waitFor(() => {
                expect(screen.getByText(errorMessage)).toBeInTheDocument();
              }, { timeout: 2000 });
            } finally {
              unmount();
            }
          }
        ),
        { numRuns: 100 }
      );
    }, 120000);

    it('Property: For any HTTP error status, system SHALL display error message to user', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.integer({ min: 400, max: 599 }),
          fc.string({ minLength: 10, maxLength: 50 }).filter(s => s.trim().length >= 10 && /[a-zA-Z]/.test(s)),
          async (statusCode, errorMessage) => {
            jest.clearAllMocks();

            // Mock API to reject with ApiError
            const apiError = new ApiError(errorMessage, statusCode);
            mockedApiClient.createKnowledgeSpace.mockRejectedValue(apiError);

            const { unmount, container } = render(<CreateKnowledgeSpaceForm />);

            try {
              await fillAndSubmitForm('Test Space', 'https://example.com', container);

              // Verify error message is displayed (Requirement 2.5)
              await waitFor(() => {
                expect(screen.getByText(errorMessage)).toBeInTheDocument();
              }, { timeout: 2000 });
            } finally {
              unmount();
            }
          }
        ),
        { numRuns: 100 }
      );
    }, 120000);

    it('Property: Error message has assertive aria-live for accessibility', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 10, maxLength: 50 }).filter(s => s.trim().length >= 10 && /[a-zA-Z]/.test(s)),
          async (errorMessage) => {
            jest.clearAllMocks();

            // Mock API to reject with error
            mockedApiClient.createKnowledgeSpace.mockRejectedValue(
              new Error(errorMessage)
            );

            const { unmount, container } = render(<CreateKnowledgeSpaceForm />);

            try {
              await fillAndSubmitForm('Test Space', 'https://example.com', container);

              // Verify error has proper accessibility attributes
              await waitFor(() => {
                const errorContainer = container.querySelector('[aria-live="assertive"]');
                expect(errorContainer).toBeInTheDocument();
                expect(errorContainer?.textContent).toContain(errorMessage);
              }, { timeout: 2000 });
            } finally {
              unmount();
            }
          }
        ),
        { numRuns: 100 }
      );
    }, 120000);
  });

  describe('Property: Error Recovery', () => {
    it('Property: Retry button clears error and retries operation', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 10, maxLength: 50 }).filter(s => s.trim().length >= 10 && /[a-zA-Z]/.test(s)),
          async (errorMessage) => {
            jest.clearAllMocks();

            // First attempt fails
            mockedApiClient.createKnowledgeSpace.mockRejectedValueOnce(
              new Error(errorMessage)
            );

            // Second attempt succeeds
            mockedApiClient.createKnowledgeSpace.mockResolvedValueOnce({
              knowledgeSpace: {
                id: 'ks-success',
                name: 'Test Space',
                type: 'web',
                lastUpdatedAt: new Date().toISOString(),
              },
            });

            const { unmount, container } = render(<CreateKnowledgeSpaceForm />);

            try {
              await fillAndSubmitForm('Test Space', 'https://example.com', container);

              // Wait for error to appear
              await waitFor(() => {
                expect(screen.getByText(errorMessage)).toBeInTheDocument();
              }, { timeout: 2000 });

              // Click retry button using fireEvent (faster than userEvent)
              const retryButton = screen.getByRole('button', { name: /retry the failed operation/i });
              fireEvent.click(retryButton);

              // Error should be cleared and success message shown
              await waitFor(() => {
                expect(screen.queryByText(errorMessage)).not.toBeInTheDocument();
                expect(screen.getByText(/knowledge space created successfully/i)).toBeInTheDocument();
              }, { timeout: 2000 });

              // Verify API was called twice
              expect(mockedApiClient.createKnowledgeSpace).toHaveBeenCalledTimes(2);
            } finally {
              unmount();
            }
          }
        ),
        { numRuns: 100 }
      );
    }, 120000);

    it('Property: Dismiss button clears error message', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 10, maxLength: 50 }).filter(s => s.trim().length >= 10 && /[a-zA-Z]/.test(s)),
          async (errorMessage) => {
            jest.clearAllMocks();

            // Mock API to reject
            mockedApiClient.createKnowledgeSpace.mockRejectedValue(
              new Error(errorMessage)
            );

            const { unmount, container } = render(<CreateKnowledgeSpaceForm />);

            try {
              await fillAndSubmitForm('Test Space', 'https://example.com', container);

              // Wait for error to appear
              await waitFor(() => {
                expect(screen.getByText(errorMessage)).toBeInTheDocument();
              }, { timeout: 2000 });

              // Click dismiss button using fireEvent (faster than userEvent)
              const dismissButton = screen.getByRole('button', { name: /dismiss this error message/i });
              fireEvent.click(dismissButton);

              // Error should be cleared
              await waitFor(() => {
                expect(screen.queryByText(errorMessage)).not.toBeInTheDocument();
              }, { timeout: 2000 });
            } finally {
              unmount();
            }
          }
        ),
        { numRuns: 100 }
      );
    }, 120000);
  });

  describe('Property: Form State After Error', () => {
    it('Property: For any error, form remains editable', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 10, maxLength: 50 }).filter(s => s.trim().length >= 10 && /[a-zA-Z]/.test(s)),
          async (errorMessage) => {
            jest.clearAllMocks();

            // Mock API to reject
            mockedApiClient.createKnowledgeSpace.mockRejectedValue(
              new Error(errorMessage)
            );

            const { unmount, container } = render(<CreateKnowledgeSpaceForm />);

            try {
              await fillAndSubmitForm('Test Space', 'https://example.com', container);

              // Wait for error to appear
              await waitFor(() => {
                expect(screen.getByText(errorMessage)).toBeInTheDocument();
              }, { timeout: 2000 });

              // Form should remain editable
              const nameInput = container.querySelector('input[placeholder="Enter knowledge space name"]') as HTMLInputElement;
              expect(nameInput).not.toBeNull();
              expect(nameInput).not.toBeDisabled();
            } finally {
              unmount();
            }
          }
        ),
        { numRuns: 100 }
      );
    }, 120000);

    it('Property: For any error, form controls remain enabled', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 10, maxLength: 50 }).filter(s => s.trim().length >= 10 && /[a-zA-Z]/.test(s)),
          async (errorMessage) => {
            jest.clearAllMocks();

            // Mock API to reject
            mockedApiClient.createKnowledgeSpace.mockRejectedValue(
              new Error(errorMessage)
            );

            const { unmount, container } = render(<CreateKnowledgeSpaceForm />);

            try {
              await fillAndSubmitForm('Test Space', 'https://example.com', container);

              // Wait for error to appear
              await waitFor(() => {
                expect(screen.getByText(errorMessage)).toBeInTheDocument();
              }, { timeout: 2000 });

              // All form controls should remain enabled
              const nameInput = screen.getByPlaceholderText('Enter knowledge space name');
              const urlInput = screen.getByDisplayValue('https://example.com');
              const addUrlButton = screen.getByLabelText('Add another URL');
              const submitButton = container.querySelector('button[type="submit"]') as HTMLButtonElement;

              expect(nameInput).not.toBeDisabled();
              expect(urlInput).not.toBeDisabled();
              expect(addUrlButton).not.toBeDisabled();
              expect(submitButton).not.toBeDisabled();
            } finally {
              unmount();
            }
          }
        ),
        { numRuns: 100 }
      );
    }, 120000);
  });

  describe('Property: Error Type Handling', () => {
    it('Property: For any error type (network, API, generic), error is displayed', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.constantFrom(
            'Network request failed',
            'API error 400',
            'API error 500',
            'Generic error message'
          ),
          fc.oneof(
            fc.constant('Error'),
            fc.constant('ApiError')
          ),
          async (errorMessage, errorType) => {
            jest.clearAllMocks();

            // Create appropriate error type
            const error = errorType === 'ApiError'
              ? new ApiError(errorMessage, 500)
              : new Error(errorMessage);

            // Mock API to reject with the error
            mockedApiClient.createKnowledgeSpace.mockRejectedValue(error);

            const { unmount, container } = render(<CreateKnowledgeSpaceForm />);

            try {
              await fillAndSubmitForm('Test Space', 'https://example.com', container);

              // Verify error is displayed
              await waitFor(() => {
                const errorContainer = container.querySelector('[aria-live="assertive"]');
                expect(errorContainer).toBeInTheDocument();
              }, { timeout: 2000 });
            } finally {
              unmount();
            }
          }
        ),
        { numRuns: 100 }
      );
    }, 120000);
  });
});
