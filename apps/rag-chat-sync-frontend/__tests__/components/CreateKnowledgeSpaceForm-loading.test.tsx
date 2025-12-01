/**
 * @jest-environment jsdom
 */

import '@testing-library/jest-dom';
import React from 'react';
import { render, screen, waitFor, fireEvent, cleanup } from '@testing-library/react';
import * as fc from 'fast-check';
import CreateKnowledgeSpaceForm from '@/components/CreateKnowledgeSpaceForm';
import { apiClient } from '@/lib/api/client';

// Mock the API client
jest.mock('@/lib/api/client');

describe('CreateKnowledgeSpaceForm - Loading States (Property-Based Tests)', () => {
  const mockedApiClient = apiClient as jest.Mocked<typeof apiClient>;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  /**
   * Property Test 6: Loading indicator during knowledge base creation (Requirement 2.3)
   *
   * This test validates that:
   * 1. Loading indicator appears when form is submitted
   * 2. Form inputs are disabled during loading
   * 3. Submit button is disabled during loading
   * 4. Loading state persists until API completes
   */
  describe('Property 6: Loading indicator behavior', () => {
    /**
     * Arbitrary generator for valid knowledge space names
     */
    const validNameArbitrary = fc.string({ minLength: 1, maxLength: 20 }).filter((s) => s.trim() !== '');

    /**
     * Arbitrary generator for valid URLs
     */
    const validUrlArbitrary = fc.webUrl({
      validSchemes: ['http', 'https'],
    });

    /**
     * Test: Loading indicator appears immediately when form is submitted
     */
    it('should display loading indicator when form is submitted with valid data', async () => {
      await fc.assert(
        fc.asyncProperty(
          validNameArbitrary,
          validUrlArbitrary,
          async (name, url) => {
            // Setup: Create a promise that resolves after a delay
            let resolveCreate: any;
            const createPromise = new Promise((resolve) => {
              resolveCreate = resolve;
            });

            mockedApiClient.createKnowledgeSpace.mockReturnValue(createPromise as any);

            // Render component
            const { unmount, container } = render(<CreateKnowledgeSpaceForm />);

            try {
              // Fill in the name field using fireEvent for speed
              const nameInput = screen.getByLabelText(/knowledge space name/i);
              fireEvent.change(nameInput, { target: { value: name } });

              // Fill in the URL field
              const urlInputs = screen.getAllByPlaceholderText('https://example.com');
              fireEvent.change(urlInputs[0], { target: { value: url } });

              // Submit the form
              const submitButton = screen.getByRole('button', { name: /create knowledge space/i });
              fireEvent.click(submitButton);

              // Verify: Loading indicator appears
              await waitFor(() => {
                expect(screen.getByText('Creating...')).toBeInTheDocument();
                expect(screen.getByRole('status', { name: /loading/i })).toBeInTheDocument();
              }, { timeout: 1000 });

              // Resolve the promise to clean up
              resolveCreate({
                knowledgeSpace: {
                  id: 'test-ks-id',
                  name: name,
                  type: 'web',
                  lastUpdatedAt: new Date().toISOString(),
                },
              });

              await waitFor(() => {
                expect(screen.queryByText('Creating...')).not.toBeInTheDocument();
              });
            } finally {
              unmount();
            }
          }
        ),
        { numRuns: 10 }
      );
    }, 30000);

    /**
     * Test: Form inputs are disabled during loading
     */
    it('should disable all form inputs during knowledge space creation', async () => {
      await fc.assert(
        fc.asyncProperty(
          validNameArbitrary,
          validUrlArbitrary,
          async (name, url) => {
            // Setup: Create a controllable promise
            let resolveCreate: any;
            const createPromise = new Promise((resolve) => {
              resolveCreate = resolve;
            });

            mockedApiClient.createKnowledgeSpace.mockReturnValue(createPromise as any);

            // Render component
            const { unmount } = render(<CreateKnowledgeSpaceForm />);

            try {
              // Fill in the form
              const nameInput = screen.getByLabelText(/knowledge space name/i) as HTMLInputElement;
              fireEvent.change(nameInput, { target: { value: name } });

              const urlInputs = screen.getAllByPlaceholderText('https://example.com');
              fireEvent.change(urlInputs[0], { target: { value: url } });

              // Submit the form
              const submitButton = screen.getByRole('button', { name: /create knowledge space/i });
              fireEvent.click(submitButton);

              // Verify: All inputs are disabled during loading
              await waitFor(() => {
                expect(nameInput).toBeDisabled();

                const currentUrlInputs = screen.getAllByPlaceholderText('https://example.com');
                currentUrlInputs.forEach((input) => {
                  expect(input).toBeDisabled();
                });
              }, { timeout: 1000 });

              // Verify: Add URL button is disabled
              const addButton = screen.getByLabelText(/add another url/i);
              expect(addButton).toBeDisabled();

              // Resolve the promise
              resolveCreate({
                knowledgeSpace: {
                  id: 'test-ks-id',
                  name: name,
                  type: 'web',
                  lastUpdatedAt: new Date().toISOString(),
                },
              });

              // Verify: Inputs are re-enabled after completion
              await waitFor(() => {
                expect(nameInput).not.toBeDisabled();
              });
            } finally {
              unmount();
            }
          }
        ),
        { numRuns: 10 }
      );
    }, 30000);

    /**
     * Test: Submit button is disabled during loading
     */
    it('should disable submit button during knowledge space creation', async () => {
      await fc.assert(
        fc.asyncProperty(
          validNameArbitrary,
          validUrlArbitrary,
          async (name, url) => {
            // Setup: Create a controllable promise
            let resolveCreate: any;
            const createPromise = new Promise((resolve) => {
              resolveCreate = resolve;
            });

            mockedApiClient.createKnowledgeSpace.mockReturnValue(createPromise as any);

            // Render component
            const { unmount } = render(<CreateKnowledgeSpaceForm />);

            try {
              // Fill in the form
              const nameInput = screen.getByLabelText(/knowledge space name/i);
              fireEvent.change(nameInput, { target: { value: name } });

              const urlInputs = screen.getAllByPlaceholderText('https://example.com');
              fireEvent.change(urlInputs[0], { target: { value: url } });

              // Get submit button before submission
              const submitButton = screen.getByRole('button', { name: /create knowledge space/i });
              expect(submitButton).not.toBeDisabled();

              // Submit the form
              fireEvent.click(submitButton);

              // Verify: Submit button is disabled during loading
              await waitFor(() => {
                const loadingButton = screen.getByRole('button', { name: /creating/i });
                expect(loadingButton).toBeDisabled();
              }, { timeout: 1000 });

              // Resolve the promise
              resolveCreate({
                knowledgeSpace: {
                  id: 'test-ks-id',
                  name: name,
                  type: 'web',
                  lastUpdatedAt: new Date().toISOString(),
                },
              });

              // Verify: Submit button is re-enabled after completion
              await waitFor(() => {
                const submitButton = screen.getByRole('button', { name: /create knowledge space/i });
                expect(submitButton).not.toBeDisabled();
              });
            } finally {
              unmount();
            }
          }
        ),
        { numRuns: 10 }
      );
    }, 30000);

    /**
     * Test: Loading state persists until API completes
     */
    it('should maintain loading state until API call completes', async () => {
      await fc.assert(
        fc.asyncProperty(
          validNameArbitrary,
          validUrlArbitrary,
          fc.integer({ min: 200, max: 800 }), // Shorter delays for faster tests
          async (name, url, delay) => {
            // Setup: Create a promise that resolves after a specific delay
            const createPromise = new Promise((resolve) => {
              setTimeout(() => {
                resolve({
                  knowledgeSpace: {
                    id: 'test-ks-id',
                    name: name,
                    type: 'web',
                    lastUpdatedAt: new Date().toISOString(),
                  },
                });
              }, delay);
            });

            mockedApiClient.createKnowledgeSpace.mockReturnValue(createPromise as any);

            // Render component
            const { unmount } = render(<CreateKnowledgeSpaceForm />);

            try {
              // Fill in the form
              const nameInput = screen.getByLabelText(/knowledge space name/i);
              fireEvent.change(nameInput, { target: { value: name } });

              const urlInputs = screen.getAllByPlaceholderText('https://example.com');
              fireEvent.change(urlInputs[0], { target: { value: url } });

              // Submit the form
              const submitButton = screen.getByRole('button', { name: /create knowledge space/i });
              fireEvent.click(submitButton);

              // Verify: Loading state is present immediately
              await waitFor(() => {
                expect(screen.getByText('Creating...')).toBeInTheDocument();
              }, { timeout: 500 });

              // Verify: Loading state persists for at least half the delay
              await new Promise(resolve => setTimeout(resolve, delay / 2));
              expect(screen.getByText('Creating...')).toBeInTheDocument();

              // Wait for API to complete
              await waitFor(() => {
                expect(screen.queryByText('Creating...')).not.toBeInTheDocument();
              }, { timeout: delay + 2000 });

              // Verify: Success message appears after loading completes
              await waitFor(() => {
                expect(screen.getByText(/knowledge space created successfully/i)).toBeInTheDocument();
              });
            } finally {
              unmount();
            }
          }
        ),
        { numRuns: 5 }
      );
    }, 30000);

    /**
     * Test: Loading state is cleared on API error
     */
    it('should clear loading state when API call fails', async () => {
      await fc.assert(
        fc.asyncProperty(
          validNameArbitrary,
          validUrlArbitrary,
          async (name, url) => {
            // Setup: Mock API to reject after a delay
            const createPromise = new Promise((_, reject) => {
              setTimeout(() => {
                reject(new Error('API error occurred'));
              }, 200);
            });

            mockedApiClient.createKnowledgeSpace.mockReturnValue(createPromise as any);

            // Render component
            const { unmount } = render(<CreateKnowledgeSpaceForm />);

            try {
              // Fill in the form
              const nameInput = screen.getByLabelText(/knowledge space name/i);
              fireEvent.change(nameInput, { target: { value: name } });

              const urlInputs = screen.getAllByPlaceholderText('https://example.com');
              fireEvent.change(urlInputs[0], { target: { value: url } });

              // Submit the form
              const submitButton = screen.getByRole('button', { name: /create knowledge space/i });
              fireEvent.click(submitButton);

              // Verify: Loading state appears
              await waitFor(() => {
                expect(screen.getByText('Creating...')).toBeInTheDocument();
              }, { timeout: 500 });

              // Verify: Loading state is cleared after error
              await waitFor(() => {
                expect(screen.queryByText('Creating...')).not.toBeInTheDocument();
              }, { timeout: 1500 });

              // Verify: Error message is displayed
              await waitFor(() => {
                expect(screen.getByRole('alert')).toBeInTheDocument();
              });

              // Verify: Submit button is re-enabled
              const reenabledSubmitButton = screen.getByRole('button', { name: /create knowledge space/i });
              expect(reenabledSubmitButton).not.toBeDisabled();
            } finally {
              unmount();
            }
          }
        ),
        { numRuns: 10 }
      );
    }, 30000);

    /**
     * Test: Loading spinner is accessible
     */
    it('should have accessible loading indicators with proper ARIA attributes', async () => {
      await fc.assert(
        fc.asyncProperty(
          validNameArbitrary,
          validUrlArbitrary,
          async (name, url) => {
            // Setup: Create a controllable promise
            let resolveCreate: any;
            const createPromise = new Promise((resolve) => {
              resolveCreate = resolve;
            });

            mockedApiClient.createKnowledgeSpace.mockReturnValue(createPromise as any);

            // Render component
            const { unmount } = render(<CreateKnowledgeSpaceForm />);

            try {
              // Fill in the form
              const nameInput = screen.getByLabelText(/knowledge space name/i);
              fireEvent.change(nameInput, { target: { value: name } });

              const urlInputs = screen.getAllByPlaceholderText('https://example.com');
              fireEvent.change(urlInputs[0], { target: { value: url } });

              // Submit the form
              const submitButton = screen.getByRole('button', { name: /create knowledge space/i });
              fireEvent.click(submitButton);

              // Verify: Loading spinner has proper ARIA attributes
              await waitFor(() => {
                const loadingSpinner = screen.getByRole('status', { name: /loading/i });
                expect(loadingSpinner).toBeInTheDocument();
                expect(loadingSpinner).toHaveAttribute('role', 'status');
                expect(loadingSpinner).toHaveAttribute('aria-label', 'Loading');
              }, { timeout: 1000 });

              // Resolve the promise
              resolveCreate({
                knowledgeSpace: {
                  id: 'test-ks-id',
                  name: name,
                  type: 'web',
                  lastUpdatedAt: new Date().toISOString(),
                },
              });

              await waitFor(() => {
                expect(screen.queryByRole('status', { name: /loading/i })).not.toBeInTheDocument();
              });
            } finally {
              unmount();
            }
          }
        ),
        { numRuns: 10 }
      );
    }, 30000);

    /**
     * Test: Remove URL button is disabled during loading
     */
    it('should disable remove URL buttons during loading', async () => {
      await fc.assert(
        fc.asyncProperty(
          validNameArbitrary,
          fc.array(validUrlArbitrary, { minLength: 2, maxLength: 2 }),
          async (name, urls) => {
            // Setup: Create a controllable promise
            let resolveCreate: any;
            const createPromise = new Promise((resolve) => {
              resolveCreate = resolve;
            });

            mockedApiClient.createKnowledgeSpace.mockReturnValue(createPromise as any);

            // Render component
            const { unmount } = render(<CreateKnowledgeSpaceForm />);

            try {
              // Fill in the name
              const nameInput = screen.getByLabelText(/knowledge space name/i);
              fireEvent.change(nameInput, { target: { value: name } });

              // Add multiple URLs
              for (let i = 0; i < urls.length; i++) {
                if (i > 0) {
                  const addButton = screen.getByLabelText(/add another url/i);
                  fireEvent.click(addButton);
                }

                const urlInputs = screen.getAllByPlaceholderText('https://example.com');
                fireEvent.change(urlInputs[i], { target: { value: urls[i] } });
              }

              // Verify remove buttons exist before submission
              const removeButtons = screen.getAllByLabelText(/remove url/i);
              expect(removeButtons.length).toBeGreaterThan(0);
              removeButtons.forEach(button => {
                expect(button).not.toBeDisabled();
              });

              // Submit the form
              const submitButton = screen.getByRole('button', { name: /create knowledge space/i });
              fireEvent.click(submitButton);

              // Verify: All remove buttons are disabled during loading
              await waitFor(() => {
                const loadingRemoveButtons = screen.getAllByLabelText(/remove url/i);
                loadingRemoveButtons.forEach(button => {
                  expect(button).toBeDisabled();
                });
              }, { timeout: 1000 });

              // Resolve the promise
              resolveCreate({
                knowledgeSpace: {
                  id: 'test-ks-id',
                  name: name,
                  type: 'web',
                  lastUpdatedAt: new Date().toISOString(),
                },
              });

              // Wait for loading to complete
              await waitFor(() => {
                expect(screen.queryByText('Creating...')).not.toBeInTheDocument();
              });
            } finally {
              unmount();
            }
          }
        ),
        { numRuns: 5 }
      );
    }, 30000);
  });
});
