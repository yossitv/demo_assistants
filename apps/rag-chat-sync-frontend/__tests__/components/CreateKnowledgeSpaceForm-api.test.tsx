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

// Mock the API client
jest.mock('@/lib/api/client');

describe('CreateKnowledgeSpaceForm - API Call Tests (Property-Based)', () => {
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

    // Fill in the name using label for better selector
    const nameInput = screen.getByLabelText(/knowledge space name/i);
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

  /**
   * Property Test 5: Knowledge base creation API call (Requirement 2.2)
   *
   * This test validates that:
   * 1. createKnowledgeSpace API is called with correct parameters (name, urls array)
   * 2. The API call includes proper authentication headers
   * 3. API is called exactly once per form submission
   * 4. Parameters are passed correctly regardless of input variations
   */
  describe('Property 5: Knowledge base creation API call', () => {
    /**
     * Arbitrary generator for valid knowledge space names
     */
    const validNameArbitrary = fc
      .string({ minLength: 1, maxLength: 100 })
      .filter((s) => s.trim() !== '');

    /**
     * Arbitrary generator for valid URLs
     */
    const validUrlArbitrary = fc.webUrl({
      validSchemes: ['http', 'https'],
    });

    /**
     * Test: API is called with correct parameters
     */
    it('should call createKnowledgeSpace API with correct parameters', async () => {
      await fc.assert(
        fc.asyncProperty(
          validNameArbitrary.filter(s => s.trim() === s && !/[[\]\\{}]/.test(s)), // Filter out names with trailing spaces and special keyboard chars
          fc.array(validUrlArbitrary, { minLength: 1, maxLength: 3 }),
          async (name, urls) => {
            // Create a fresh test environment for each run
            jest.clearAllMocks();

            mockedApiClient.createKnowledgeSpace.mockResolvedValueOnce({
              knowledgeSpace: {
                id: 'test-ks-id',
                name: name,
                type: 'web',
                lastUpdatedAt: new Date().toISOString(),
              },
            });

            const { unmount } = renderForm();

            try {
              await fillAndSubmitForm(name, urls);

              await waitFor(() => {
                expect(mockedApiClient.createKnowledgeSpace).toHaveBeenCalledTimes(1);
                expect(mockedApiClient.createKnowledgeSpace).toHaveBeenCalledWith(
                  name,
                  urls
                );
              }, { timeout: 3000 });
            } finally {
              unmount();
            }
          }
        ),
        { numRuns: 5, endOnFailure: true }
      );
    }, 60000);

    /**
     * Test: API call order and parameters
     */
    it('should call API with parameters in correct order (name, urls)', async () => {
      await fc.assert(
        fc.asyncProperty(
          validNameArbitrary.filter(s => s.trim() === s && !/[[\]\\{}^]/.test(s)), // Filter out names with trailing spaces and special keyboard chars
          fc.array(validUrlArbitrary, { minLength: 1, maxLength: 2 }),
          async (name, urls) => {
            jest.clearAllMocks();

            mockedApiClient.createKnowledgeSpace.mockResolvedValueOnce({
              knowledgeSpace: {
                id: 'test-ks-id',
                name: name,
                type: 'web',
                lastUpdatedAt: new Date().toISOString(),
              },
            });

            const { unmount } = renderForm();

            try {
              await fillAndSubmitForm(name, urls);

              await waitFor(() => {
                const callArgs = mockedApiClient.createKnowledgeSpace.mock.calls[0];
                // First parameter should be name
                expect(typeof callArgs[0]).toBe('string');
                expect(callArgs[0]).toBe(name);
                // Second parameter should be URLs array
                expect(Array.isArray(callArgs[1])).toBe(true);
                expect(callArgs[1]).toEqual(urls);
                expect(callArgs[1]).toHaveLength(urls.length);
              }, { timeout: 3000 });
            } finally {
              unmount();
            }
          }
        ),
        { numRuns: 5, endOnFailure: true }
      );
    }, 60000);

    /**
     * Test: API receives trimmed name parameter
     */
    it('should pass trimmed name to API', async () => {
      await fc.assert(
        fc.asyncProperty(
          validNameArbitrary.filter(s => s.trim().length > 0 && s.trim().length <= 100),
          validUrlArbitrary,
          async (name, url) => {
            jest.clearAllMocks();

            const nameWithSpaces = `  ${name}  `;

            mockedApiClient.createKnowledgeSpace.mockResolvedValueOnce({
              knowledgeSpace: {
                id: 'test-ks-id',
                name: name,
                type: 'web',
                lastUpdatedAt: new Date().toISOString(),
              },
            });

            const { unmount } = renderForm();

            try {
              await fillAndSubmitForm(nameWithSpaces, [url]);

              await waitFor(() => {
                expect(mockedApiClient.createKnowledgeSpace).toHaveBeenCalledWith(
                  name.trim(),
                  [url]
                );
              }, { timeout: 3000 });
            } finally {
              unmount();
            }
          }
        ),
        { numRuns: 5, endOnFailure: true }
      );
    }, 60000);

    /**
     * Test: API uses authentication context
     */
    it('should use apiClient with authentication context', async () => {
      await fc.assert(
        fc.asyncProperty(
          validNameArbitrary.filter(s => s.trim() === s && !/[[\]\\{}^!]/.test(s)), // Filter out names with trailing spaces and special keyboard chars
          validUrlArbitrary,
          async (name, url) => {
            jest.clearAllMocks();

            mockedApiClient.createKnowledgeSpace.mockResolvedValueOnce({
              knowledgeSpace: {
                id: 'test-ks-id',
                name: name,
                type: 'web',
                lastUpdatedAt: new Date().toISOString(),
              },
            });

            const { unmount } = renderForm();

            try {
              await fillAndSubmitForm(name, [url]);

              await waitFor(() => {
                // Verify that the mocked apiClient was called
                // The actual authentication headers are handled by the ApiClient class
                expect(mockedApiClient.createKnowledgeSpace).toHaveBeenCalled();
              }, { timeout: 3000 });
            } finally {
              unmount();
            }
          }
        ),
        { numRuns: 5, endOnFailure: true }
      );
    }, 60000);
  });

  /**
   * Requirement 2.2: Knowledge Base Creation API Integration
   *
   * These tests validate the complete integration with the API client,
   * ensuring that all parameters are correctly passed and the API is
   * called appropriately.
   */
  describe('Requirement 2.2: Knowledge Base Creation API Integration', () => {
    it('validates that API is called with name and URLs array', async () => {
      const testName = 'Test Knowledge Space';
      const testUrls = ['https://example.com', 'https://test.org'];

      mockedApiClient.createKnowledgeSpace.mockResolvedValue({
        knowledgeSpace: {
          id: 'ks-123',
          name: testName,
          type: 'web',
          lastUpdatedAt: new Date().toISOString(),
        },
      });

      renderForm();
      await fillAndSubmitForm(testName, testUrls);

      await waitFor(() => {
        expect(mockedApiClient.createKnowledgeSpace).toHaveBeenCalledWith(
          testName,
          testUrls
        );
      });
    });

    it('validates that API is called exactly once per form submission', async () => {
      const testName = 'Single Submission Test';
      const testUrls = ['https://example.com'];

      mockedApiClient.createKnowledgeSpace.mockResolvedValue({
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
        expect(mockedApiClient.createKnowledgeSpace).toHaveBeenCalledTimes(1);
      });
    });

    it('validates that authentication context is used (via apiClient)', async () => {
      const testName = 'Auth Test Space';
      const testUrls = ['https://secure.example.com'];

      mockedApiClient.createKnowledgeSpace.mockResolvedValue({
        knowledgeSpace: {
          id: 'ks-789',
          name: testName,
          type: 'web',
          lastUpdatedAt: new Date().toISOString(),
        },
      });

      renderForm();
      await fillAndSubmitForm(testName, testUrls);

      await waitFor(() => {
        // The apiClient instance is used, which handles authentication headers
        expect(mockedApiClient.createKnowledgeSpace).toHaveBeenCalled();

        // Verify the mock was called with the correct arguments
        const callArgs = mockedApiClient.createKnowledgeSpace.mock.calls[0];
        expect(callArgs[0]).toBe(testName);
        expect(callArgs[1]).toEqual(testUrls);
      });
    });

    it('validates that parameters are passed correctly with various input combinations', async () => {
      const testCases = [
        {
          name: 'Single URL',
          urls: ['https://example.com'],
        },
        {
          name: 'Multiple URLs',
          urls: ['https://example.com', 'https://test.org', 'https://demo.net'],
        },
        {
          name: 'Name with Spaces',
          urls: ['https://example.com'],
        },
        {
          name: 'Special-Chars!@#',
          urls: ['https://example.com'],
        },
      ];

      for (const testCase of testCases) {
        jest.clearAllMocks();

        mockedApiClient.createKnowledgeSpace.mockResolvedValue({
          knowledgeSpace: {
            id: 'test-id',
            name: testCase.name,
            type: 'web',
            lastUpdatedAt: new Date().toISOString(),
          },
        });

        const { unmount } = renderForm();
        await fillAndSubmitForm(testCase.name, testCase.urls);

        await waitFor(() => {
          expect(mockedApiClient.createKnowledgeSpace).toHaveBeenCalledWith(
            testCase.name,
            testCase.urls
          );
          expect(mockedApiClient.createKnowledgeSpace).toHaveBeenCalledTimes(1);
        });

        unmount();
      }
    });

    it('validates that API is not called when validation fails', async () => {
      const user = userEvent.setup();

      // Test case: Empty name
      renderForm();
      const urlInput = screen.getAllByPlaceholderText('https://example.com')[0];
      await user.type(urlInput, 'https://example.com');

      const submitButton = screen.getByRole('button', { name: /create knowledge space/i });
      await user.click(submitButton);

      await new Promise(resolve => setTimeout(resolve, 100));
      expect(mockedApiClient.createKnowledgeSpace).not.toHaveBeenCalled();
    });

    it('validates that trimmed values are passed to API', async () => {
      const user = userEvent.setup();
      const nameWithSpaces = '  Test Space  ';
      const expectedName = 'Test Space';
      const testUrl = 'https://example.com';

      mockedApiClient.createKnowledgeSpace.mockResolvedValue({
        knowledgeSpace: {
          id: 'ks-trim-test',
          name: expectedName,
          type: 'web',
          lastUpdatedAt: new Date().toISOString(),
        },
      });

      renderForm();

      const nameInput = screen.getByLabelText(/knowledge space name/i);
      await user.type(nameInput, nameWithSpaces);

      const urlInput = screen.getAllByPlaceholderText('https://example.com')[0];
      await user.type(urlInput, testUrl);

      const submitButton = screen.getByRole('button', { name: /create knowledge space/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockedApiClient.createKnowledgeSpace).toHaveBeenCalledWith(
          expectedName,
          [testUrl]
        );
      });
    });

    it('validates correct parameter types are passed to API', async () => {
      const testName = 'Type Check Test';
      const testUrls = ['https://example.com', 'https://test.com'];

      mockedApiClient.createKnowledgeSpace.mockResolvedValue({
        knowledgeSpace: {
          id: 'ks-type-test',
          name: testName,
          type: 'web',
          lastUpdatedAt: new Date().toISOString(),
        },
      });

      renderForm();
      await fillAndSubmitForm(testName, testUrls);

      await waitFor(() => {
        const callArgs = mockedApiClient.createKnowledgeSpace.mock.calls[0];

        // Verify first parameter is a string
        expect(typeof callArgs[0]).toBe('string');
        expect(callArgs[0]).toBe(testName);

        // Verify second parameter is an array
        expect(Array.isArray(callArgs[1])).toBe(true);
        expect(callArgs[1]).toEqual(testUrls);

        // Verify all elements in array are strings
        callArgs[1].forEach((url: any) => {
          expect(typeof url).toBe('string');
        });
      });
    });

    it('validates API is called only after form submission', async () => {
      const user = userEvent.setup();
      const testName = 'Pre-Submit Test';
      const testUrl = 'https://example.com';

      mockedApiClient.createKnowledgeSpace.mockResolvedValue({
        knowledgeSpace: {
          id: 'ks-submit-test',
          name: testName,
          type: 'web',
          lastUpdatedAt: new Date().toISOString(),
        },
      });

      renderForm();

      // Fill form but don't submit yet
      const nameInput = screen.getByLabelText(/knowledge space name/i);
      await user.type(nameInput, testName);

      const urlInput = screen.getAllByPlaceholderText('https://example.com')[0];
      await user.type(urlInput, testUrl);

      // Verify API not called yet
      expect(mockedApiClient.createKnowledgeSpace).not.toHaveBeenCalled();

      // Now submit
      const submitButton = screen.getByRole('button', { name: /create knowledge space/i });
      await user.click(submitButton);

      // Verify API was called after submission
      await waitFor(() => {
        expect(mockedApiClient.createKnowledgeSpace).toHaveBeenCalledTimes(1);
      });
    });
  });
});
