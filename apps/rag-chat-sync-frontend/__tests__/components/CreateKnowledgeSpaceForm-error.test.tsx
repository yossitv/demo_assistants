/**
 * @jest-environment jsdom
 */

import '@testing-library/jest-dom';
import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import * as fc from 'fast-check';
import CreateKnowledgeSpaceForm from '@/components/CreateKnowledgeSpaceForm';
import { apiClient } from '@/lib/api/client';
import { ApiError } from '@/lib/api/error';

// Mock the API client
jest.mock('@/lib/api/client');

describe('CreateKnowledgeSpaceForm - Property 8: Error Handling', () => {
  const mockedApiClient = apiClient as jest.Mocked<typeof apiClient>;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  /**
   * Helper function to render the form
   */
  const renderForm = (props = {}) => {
    return render(<CreateKnowledgeSpaceForm {...props} />);
  };

  /**
   * Helper function to fill and submit the form
   */
  const fillAndSubmitForm = async (name: string, urls: string[]) => {
    const user = userEvent.setup();

    // Fill in the name
    const nameInput = screen.getAllByPlaceholderText('Enter knowledge space name')[0];
    await user.clear(nameInput);
    await user.paste(name);

    // Fill in the first URL
    const urlInputs = screen.getAllByPlaceholderText('https://example.com');
    await user.clear(urlInputs[0]);
    await user.type(urlInputs[0], urls[0]);

    // Add additional URLs if needed
    for (let i = 1; i < urls.length; i++) {
      const addButton = screen.getByLabelText('Add another URL');
      await user.click(addButton);

      const updatedUrlInputs = screen.getAllByPlaceholderText('https://example.com');
      await user.type(updatedUrlInputs[i], urls[i]);
    }

    // Submit the form
    const submitButton = screen.getByRole('button', { name: /create knowledge space/i });
    await user.click(submitButton);
  };

  describe('Error Message Display', () => {
    it('should display error message when API call fails', async () => {
      const errorMessage = 'Failed to create knowledge space';
      mockedApiClient.createKnowledgeSpace.mockRejectedValue(new Error(errorMessage));

      renderForm();
      await fillAndSubmitForm('Test Space', ['https://example.com']);

      await waitFor(() => {
        expect(screen.getByRole('alert')).toBeInTheDocument();
        expect(screen.getByText(errorMessage)).toBeInTheDocument();
      });
    });

    it('should display error with proper accessibility attributes', async () => {
      mockedApiClient.createKnowledgeSpace.mockRejectedValue(new Error('Test error'));

      renderForm();
      await fillAndSubmitForm('Test Space', ['https://example.com']);

      await waitFor(() => {
        const alert = screen.getByRole('alert');
        expect(alert).toHaveAttribute('aria-live', 'assertive');
      });
    });

    it('should display ApiError with status code', async () => {
      const apiError = new ApiError('Server error occurred', 500);
      mockedApiClient.createKnowledgeSpace.mockRejectedValue(apiError);

      renderForm();
      await fillAndSubmitForm('Test Space', ['https://example.com']);

      await waitFor(() => {
        expect(screen.getByText('Server error occurred')).toBeInTheDocument();
      });
    });
  });

  describe('Retry Functionality', () => {
    it('should clear error when retry button is clicked', async () => {
      const user = userEvent.setup();

      // First attempt fails
      mockedApiClient.createKnowledgeSpace.mockRejectedValueOnce(
        new Error('Network error')
      );

      // Second attempt succeeds
      mockedApiClient.createKnowledgeSpace.mockResolvedValueOnce({
        knowledgeSpace: {
          id: 'ks-123',
          name: 'Test Space',
          type: 'web',
          lastUpdatedAt: new Date().toISOString(),
        },
      });

      renderForm();
      await fillAndSubmitForm('Test Space', ['https://example.com']);

      // Wait for error to appear
      await waitFor(() => {
        expect(screen.getByText('Network error')).toBeInTheDocument();
      });

      // Click retry button
      const retryButton = screen.getByRole('button', { name: /retry the failed operation/i });
      await user.click(retryButton);

      // Error should be cleared and API should be called again
      // Note: The form is cleared on success, so we check for success message
      await waitFor(() => {
        expect(screen.queryByText('Network error')).not.toBeInTheDocument();
        expect(screen.getByText(/knowledge space created successfully/i)).toBeInTheDocument();
      });
    });

    it('should retry with the same form data', async () => {
      const user = userEvent.setup();
      const testName = 'Test Space';
      const testUrls = ['https://example.com', 'https://test.com'];

      mockedApiClient.createKnowledgeSpace.mockRejectedValueOnce(
        new Error('Temporary error')
      );

      mockedApiClient.createKnowledgeSpace.mockResolvedValueOnce({
        knowledgeSpace: {
          id: 'ks-456',
          name: testName,
          type: 'web',
          lastUpdatedAt: new Date().toISOString(),
        },
      });

      renderForm();
      await fillAndSubmitForm(testName, testUrls);

      await waitFor(() => {
        expect(screen.getByText('Temporary error')).toBeInTheDocument();
      });

      const retryButton = screen.getByRole('button', { name: /retry the failed operation/i });
      await user.click(retryButton);

      await waitFor(() => {
        expect(mockedApiClient.createKnowledgeSpace).toHaveBeenLastCalledWith(
          testName,
          testUrls
        );
      });
    });

    it('should show error again if retry also fails', async () => {
      const user = userEvent.setup();

      // Both attempts fail
      mockedApiClient.createKnowledgeSpace.mockRejectedValue(
        new Error('Persistent error')
      );

      renderForm();
      await fillAndSubmitForm('Test Space', ['https://example.com']);

      await waitFor(() => {
        expect(screen.getByText('Persistent error')).toBeInTheDocument();
      });

      const retryButton = screen.getByRole('button', { name: /retry the failed operation/i });
      await user.click(retryButton);

      // Error should still be displayed (error clears briefly but comes back)
      await waitFor(() => {
        expect(screen.getByText('Persistent error')).toBeInTheDocument();
      });
    });
  });

  describe('Form Editability After Error', () => {
    it('should keep form editable after error occurs', async () => {
      const user = userEvent.setup();
      mockedApiClient.createKnowledgeSpace.mockRejectedValue(
        new Error('Test error')
      );

      renderForm();
      await fillAndSubmitForm('Test Space', ['https://example.com']);

      await waitFor(() => {
        expect(screen.getByText('Test error')).toBeInTheDocument();
      });

      // Form fields should be editable
      const nameInput = screen.getByPlaceholderText('Enter knowledge space name');
      expect(nameInput).not.toBeDisabled();

      // Should be able to edit the name
      await user.clear(nameInput);
      await user.type(nameInput, 'Updated Name');
      expect(nameInput).toHaveValue('Updated Name');
    });

    it('should allow adding URLs after error', async () => {
      const user = userEvent.setup();
      mockedApiClient.createKnowledgeSpace.mockRejectedValue(
        new Error('Test error')
      );

      renderForm();
      await fillAndSubmitForm('Test Space', ['https://example.com']);

      await waitFor(() => {
        expect(screen.getByText('Test error')).toBeInTheDocument();
      });

      // Should be able to add more URLs
      const addButton = screen.getByLabelText('Add another URL');
      expect(addButton).not.toBeDisabled();

      await user.click(addButton);
      const urlInputs = screen.getAllByPlaceholderText('https://example.com');
      expect(urlInputs).toHaveLength(2);
    });

    it('should allow removing URLs after error', async () => {
      const user = userEvent.setup();
      mockedApiClient.createKnowledgeSpace.mockRejectedValue(
        new Error('Test error')
      );

      renderForm();
      await fillAndSubmitForm('Test Space', ['https://example.com', 'https://test.com']);

      await waitFor(() => {
        expect(screen.getByText('Test error')).toBeInTheDocument();
      });

      // Should be able to remove URLs
      const removeButtons = screen.getAllByLabelText(/remove url/i);
      expect(removeButtons[0]).not.toBeDisabled();

      await user.click(removeButtons[0]);
      const urlInputs = screen.getAllByPlaceholderText('https://example.com');
      expect(urlInputs).toHaveLength(1);
    });

    it('should allow resubmission with modified data after error', async () => {
      const user = userEvent.setup();

      // First attempt fails
      mockedApiClient.createKnowledgeSpace.mockRejectedValueOnce(
        new Error('Initial error')
      );

      // Second attempt succeeds
      mockedApiClient.createKnowledgeSpace.mockResolvedValueOnce({
        knowledgeSpace: {
          id: 'ks-789',
          name: 'Modified Space',
          type: 'web',
          lastUpdatedAt: new Date().toISOString(),
        },
      });

      renderForm();
      await fillAndSubmitForm('Original Space', ['https://example.com']);

      await waitFor(() => {
        expect(screen.getByText('Initial error')).toBeInTheDocument();
      });

      // Modify the form
      const nameInput = screen.getByPlaceholderText('Enter knowledge space name');
      await user.clear(nameInput);
      await user.type(nameInput, 'Modified Space');

      // Dismiss error and resubmit
      const dismissButton = screen.getByRole('button', { name: /dismiss this error message/i });
      await user.click(dismissButton);

      const submitButton = screen.getByRole('button', { name: /create knowledge space/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockedApiClient.createKnowledgeSpace).toHaveBeenLastCalledWith(
          'Modified Space',
          ['https://example.com']
        );
      });
    });
  });

  describe('Various Error Types', () => {
    it('should handle network errors', async () => {
      const networkError = new Error('Network request failed');
      networkError.name = 'NetworkError';
      mockedApiClient.createKnowledgeSpace.mockRejectedValue(networkError);

      renderForm();
      await fillAndSubmitForm('Test Space', ['https://example.com']);

      await waitFor(() => {
        expect(screen.getByText('Network request failed')).toBeInTheDocument();
      });
    });

    it('should handle 400 Bad Request errors', async () => {
      const apiError = new ApiError('Invalid request data', 400);
      mockedApiClient.createKnowledgeSpace.mockRejectedValue(apiError);

      renderForm();
      await fillAndSubmitForm('Test Space', ['https://example.com']);

      await waitFor(() => {
        expect(screen.getByText('Invalid request data')).toBeInTheDocument();
      });
    });

    it('should handle 401 Unauthorized errors', async () => {
      const apiError = new ApiError('Unauthorized access', 401);
      mockedApiClient.createKnowledgeSpace.mockRejectedValue(apiError);

      renderForm();
      await fillAndSubmitForm('Test Space', ['https://example.com']);

      await waitFor(() => {
        expect(screen.getByText('Unauthorized access')).toBeInTheDocument();
      });
    });

    it('should handle 404 Not Found errors', async () => {
      const apiError = new ApiError('Resource not found', 404);
      mockedApiClient.createKnowledgeSpace.mockRejectedValue(apiError);

      renderForm();
      await fillAndSubmitForm('Test Space', ['https://example.com']);

      await waitFor(() => {
        expect(screen.getByText('Resource not found')).toBeInTheDocument();
      });
    });

    it('should handle 500 Internal Server errors', async () => {
      const apiError = new ApiError('Internal server error', 500);
      mockedApiClient.createKnowledgeSpace.mockRejectedValue(apiError);

      renderForm();
      await fillAndSubmitForm('Test Space', ['https://example.com']);

      await waitFor(() => {
        expect(screen.getByText('Internal server error')).toBeInTheDocument();
      });
    });

    it('should handle 503 Service Unavailable errors', async () => {
      const apiError = new ApiError('Service temporarily unavailable', 503);
      mockedApiClient.createKnowledgeSpace.mockRejectedValue(apiError);

      renderForm();
      await fillAndSubmitForm('Test Space', ['https://example.com']);

      await waitFor(() => {
        expect(screen.getByText('Service temporarily unavailable')).toBeInTheDocument();
      });
    });

    it('should handle timeout errors', async () => {
      const timeoutError = new Error('Request timeout after 30000ms');
      timeoutError.name = 'TimeoutError';
      mockedApiClient.createKnowledgeSpace.mockRejectedValue(timeoutError);

      renderForm();
      await fillAndSubmitForm('Test Space', ['https://example.com']);

      await waitFor(() => {
        expect(screen.getByText('Request timeout after 30000ms')).toBeInTheDocument();
      });
    });

    it('should handle generic errors with default message', async () => {
      mockedApiClient.createKnowledgeSpace.mockRejectedValue(
        'String error message'
      );

      renderForm();
      await fillAndSubmitForm('Test Space', ['https://example.com']);

      await waitFor(() => {
        expect(screen.getByRole('alert')).toBeInTheDocument();
      });
    });
  });

  describe('Error Dismissal', () => {
    it('should dismiss error when dismiss button is clicked', async () => {
      const user = userEvent.setup();
      mockedApiClient.createKnowledgeSpace.mockRejectedValue(
        new Error('Dismissible error')
      );

      renderForm();
      await fillAndSubmitForm('Test Space', ['https://example.com']);

      await waitFor(() => {
        expect(screen.getByText('Dismissible error')).toBeInTheDocument();
      });

      const dismissButton = screen.getByRole('button', { name: /dismiss this error message/i });
      await user.click(dismissButton);

      // Wait a bit for the state update to propagate
      await waitFor(() => {
        expect(screen.queryByText('Dismissible error')).not.toBeInTheDocument();
      }, { timeout: 2000 });
    });

    it('should not show error after successful retry', async () => {
      const user = userEvent.setup();

      mockedApiClient.createKnowledgeSpace.mockRejectedValueOnce(
        new Error('First attempt failed')
      );

      mockedApiClient.createKnowledgeSpace.mockResolvedValueOnce({
        knowledgeSpace: {
          id: 'ks-success',
          name: 'Test Space',
          type: 'web',
          lastUpdatedAt: new Date().toISOString(),
        },
      });

      renderForm();
      await fillAndSubmitForm('Test Space', ['https://example.com']);

      await waitFor(() => {
        expect(screen.getByText('First attempt failed')).toBeInTheDocument();
      });

      const retryButton = screen.getByRole('button', { name: /retry the failed operation/i });
      await user.click(retryButton);

      await waitFor(() => {
        expect(screen.queryByText('First attempt failed')).not.toBeInTheDocument();
        expect(screen.queryByRole('alert', { name: /error/i })).not.toBeInTheDocument();
      });
    });
  });

  describe('Property-Based Testing: Error Handling', () => {
    it('should handle arbitrary error messages', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 5, maxLength: 100 }).filter(s => s.trim().length >= 5),
          async (errorMessage) => {
            jest.clearAllMocks();

            mockedApiClient.createKnowledgeSpace.mockRejectedValue(
              new Error(errorMessage)
            );

            const { unmount } = renderForm();
            await fillAndSubmitForm('Test Space', ['https://example.com']);

            await waitFor(() => {
              expect(screen.queryByText(errorMessage)).toBeInTheDocument();
            }, { timeout: 3000 });

            unmount();
          }
        ),
        { numRuns: 5, timeout: 10000 }
      );
    }, 15000);

    it('should handle arbitrary HTTP status codes', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.integer({ min: 400, max: 599 }),
          fc.string({ minLength: 5, maxLength: 50 }).filter(s => s.trim().length >= 5),
          async (statusCode, message) => {
            jest.clearAllMocks();

            const apiError = new ApiError(message, statusCode);
            mockedApiClient.createKnowledgeSpace.mockRejectedValue(apiError);

            const { unmount } = renderForm();
            await fillAndSubmitForm('Test Space', ['https://example.com']);

            await waitFor(() => {
              expect(screen.queryByText(message)).toBeInTheDocument();
            }, { timeout: 3000 });

            unmount();
          }
        ),
        { numRuns: 5, timeout: 10000 }
      );
    }, 15000);

    it('should maintain form state across multiple error-retry cycles', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.integer({ min: 1, max: 2 }),
          fc.string({ minLength: 5, maxLength: 30 }).filter(s => s.trim().length >= 5),
          fc.array(fc.webUrl(), { minLength: 1, maxLength: 1 }),
          async (numRetries, spaceName, urls) => {
            jest.clearAllMocks();
            const user = userEvent.setup();

            // Fail multiple times, then succeed
            for (let i = 0; i < numRetries; i++) {
              mockedApiClient.createKnowledgeSpace.mockRejectedValueOnce(
                new Error(`Attempt ${i + 1} failed`)
              );
            }

            mockedApiClient.createKnowledgeSpace.mockResolvedValueOnce({
              knowledgeSpace: {
                id: 'ks-final',
                name: spaceName,
                type: 'web',
                lastUpdatedAt: new Date().toISOString(),
              },
            });

            const { unmount } = renderForm();
            await fillAndSubmitForm(spaceName, urls);

            // Retry multiple times
            for (let i = 0; i < numRetries; i++) {
              await waitFor(() => {
                expect(screen.queryByText(`Attempt ${i + 1} failed`)).toBeInTheDocument();
              }, { timeout: 3000 });

              const retryButton = screen.getByRole('button', { name: /retry the failed operation/i });
              await user.click(retryButton);
            }

            // Final attempt should succeed - form is cleared on success
            await waitFor(() => {
              expect(screen.queryByText(/knowledge space created successfully/i)).toBeInTheDocument();
            }, { timeout: 3000 });

            unmount();
          }
        ),
        { numRuns: 3, timeout: 15000 }
      );
    }, 20000);

    it('should allow form editing after any type of error', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.oneof(
            fc.constant(new Error('Generic error')),
            fc.integer({ min: 400, max: 599 }).map(code => new ApiError('API error', code))
          ),
          fc.string({ minLength: 5, maxLength: 30 }).filter(s => s.trim().length >= 5),
          async (error, newName) => {
            jest.clearAllMocks();

            mockedApiClient.createKnowledgeSpace.mockRejectedValue(error);

            const { unmount, container } = renderForm();
            
            try {
              const user = userEvent.setup();
              await fillAndSubmitForm('Original Name', ['https://example.com']);

              await waitFor(() => {
                const alerts = screen.queryAllByRole('alert');
                expect(alerts.length).toBeGreaterThan(0);
              }, { timeout: 3000 });

              // Form should remain editable - use container to scope the query
              const nameInput = container.querySelector('input[placeholder="Enter knowledge space name"]') as HTMLInputElement;
              expect(nameInput).not.toBeNull();
              expect(nameInput).not.toBeDisabled();

              await user.clear(nameInput);
              // Use paste instead of type to handle special characters
              await user.click(nameInput);
              await user.paste(newName);
              expect(nameInput).toHaveValue(newName);
            } finally {
              unmount();
            }
          }
        ),
        { numRuns: 5, timeout: 10000 }
      );
    }, 15000);

    it('should handle rapid error dismiss and retry cycles', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.integer({ min: 2, max: 2 }),
          async (numCycles) => {
            jest.clearAllMocks();
            const user = userEvent.setup();

            // All attempts fail
            mockedApiClient.createKnowledgeSpace.mockRejectedValue(
              new Error('Persistent error')
            );

            const { unmount } = renderForm();
            await fillAndSubmitForm('Test Space', ['https://example.com']);

            for (let i = 0; i < numCycles; i++) {
              await waitFor(() => {
                expect(screen.queryByText('Persistent error')).toBeInTheDocument();
              }, { timeout: 3000 });

              if (i % 2 === 0) {
                // Dismiss on even cycles
                const dismissButton = screen.getByRole('button', { name: /dismiss this error message/i });
                await user.click(dismissButton);

                await waitFor(() => {
                  expect(screen.queryByText('Persistent error')).not.toBeInTheDocument();
                }, { timeout: 2000 });

                // Resubmit
                const submitButton = screen.getByRole('button', { name: /create knowledge space/i });
                await user.click(submitButton);
              } else {
                // Retry on odd cycles
                const retryButton = screen.getByRole('button', { name: /retry the failed operation/i });
                await user.click(retryButton);
              }
            }

            unmount();
          }
        ),
        { numRuns: 3, timeout: 15000 }
      );
    }, 20000);
  });

  describe('Requirement 2.5: Knowledge Base Error Handling', () => {
    it('validates that error messages are displayed when API call fails', async () => {
      const errorMessage = 'Knowledge base creation failed';
      mockedApiClient.createKnowledgeSpace.mockRejectedValue(new Error(errorMessage));

      renderForm();
      await fillAndSubmitForm('Test Space', ['https://example.com']);

      await waitFor(() => {
        const alerts = screen.queryAllByRole('alert');
        const errorAlert = alerts.find(alert =>
          alert.getAttribute('aria-live') === 'assertive'
        );
        expect(errorAlert).toBeInTheDocument();
        expect(errorAlert).toHaveAttribute('aria-live', 'assertive');
        expect(screen.getByText(errorMessage)).toBeInTheDocument();
      });
    });

    it('validates that retry functionality works (error clears on retry)', async () => {
      const user = userEvent.setup();

      mockedApiClient.createKnowledgeSpace.mockRejectedValueOnce(
        new Error('First attempt error')
      );

      mockedApiClient.createKnowledgeSpace.mockResolvedValueOnce({
        knowledgeSpace: {
          id: 'ks-retry-success',
          name: 'Test Space',
          type: 'web',
          lastUpdatedAt: new Date().toISOString(),
        },
      });

      renderForm();
      await fillAndSubmitForm('Test Space', ['https://example.com']);

      await waitFor(() => {
        expect(screen.getByText('First attempt error')).toBeInTheDocument();
      });

      const retryButton = screen.getByRole('button', { name: /retry the failed operation/i });
      await user.click(retryButton);

      await waitFor(() => {
        expect(screen.queryByText('First attempt error')).not.toBeInTheDocument();
        const errorAlerts = screen.queryAllByRole('alert').filter(alert =>
          alert.getAttribute('aria-live') === 'assertive'
        );
        expect(errorAlerts).toHaveLength(0);
        expect(screen.getByText(/knowledge space created successfully/i)).toBeInTheDocument();
      });
    });

    it('validates that form remains editable after error', async () => {
      const user = userEvent.setup();
      mockedApiClient.createKnowledgeSpace.mockRejectedValue(
        new Error('Validation error')
      );

      renderForm();
      await fillAndSubmitForm('Original Space', ['https://example.com']);

      await waitFor(() => {
        expect(screen.getByText('Validation error')).toBeInTheDocument();
      });

      // All form controls should remain enabled
      const nameInput = screen.getByPlaceholderText('Enter knowledge space name');
      const urlInput = screen.getByDisplayValue('https://example.com');
      const addUrlButton = screen.getByLabelText('Add another URL');
      const submitButton = screen.getByRole('button', { name: /create knowledge space/i });

      expect(nameInput).not.toBeDisabled();
      expect(urlInput).not.toBeDisabled();
      expect(addUrlButton).not.toBeDisabled();
      expect(submitButton).not.toBeDisabled();

      // Should be able to edit and resubmit
      await user.clear(nameInput);
      await user.type(nameInput, 'Updated Space');
      expect(nameInput).toHaveValue('Updated Space');
    });

    it('validates that various error types are handled correctly', async () => {
      const errorTypes = [
        { error: new Error('Network error'), type: 'Network' },
        { error: new ApiError('Bad Request', 400), type: 'API 400' },
        { error: new ApiError('Unauthorized', 401), type: 'API 401' },
        { error: new ApiError('Forbidden', 403), type: 'API 403' },
        { error: new ApiError('Not Found', 404), type: 'API 404' },
        { error: new ApiError('Server Error', 500), type: 'API 500' },
        { error: new ApiError('Service Unavailable', 503), type: 'API 503' },
      ];

      for (const { error, type } of errorTypes) {
        jest.clearAllMocks();
        mockedApiClient.createKnowledgeSpace.mockRejectedValue(error);

        const { unmount } = renderForm();
        await fillAndSubmitForm('Test Space', ['https://example.com']);

        await waitFor(() => {
          const alerts = screen.queryAllByRole('alert');
          const errorAlert = alerts.find(alert =>
            alert.getAttribute('aria-live') === 'assertive'
          );
          expect(errorAlert).toBeInTheDocument();
          expect(errorAlert).toHaveAttribute('aria-live', 'assertive');
        }, { timeout: 3000 });

        unmount();
      }
    }, 15000);
  });
});
