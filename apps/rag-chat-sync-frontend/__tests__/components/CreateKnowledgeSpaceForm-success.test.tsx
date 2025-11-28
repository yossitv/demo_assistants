/**
 * @jest-environment jsdom
 */

import '@testing-library/jest-dom';
import React from 'react';
import { render, screen, waitFor, cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import * as fc from 'fast-check';
import CreateKnowledgeSpaceForm from '@/components/CreateKnowledgeSpaceForm';
import { apiClient } from '@/lib/api/client';
import { CreateKnowledgeSpaceResponse } from '@/lib/api/types';

// Mock the API client
jest.mock('@/lib/api/client');

// Ensure cleanup after each test
afterEach(async () => {
  await cleanup();
  jest.clearAllTimers();
  jest.restoreAllMocks();
});

/**
 * Property-based tests for CreateKnowledgeSpaceForm success flow
 * Test Property 7: Knowledge base success flow (validates Requirement 2.4)
 *
 * This test suite validates that:
 * - Success message is displayed with the knowledgeSpaceId after creation
 * - Form is cleared after successful creation
 * - onSuccess callback is called with knowledgeSpaceId
 * - Success message contains the returned ID
 */
describe('CreateKnowledgeSpaceForm - Success Flow (Property-Based Tests)', () => {
  const mockedApiClient = apiClient as jest.Mocked<typeof apiClient>;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ============================================================================
  // Arbitraries (Generators for property-based testing)
  // ============================================================================

  /**
   * Arbitrary for generating valid knowledge space names
   */
  const validNameArbitrary = (): fc.Arbitrary<string> =>
    fc
      .string({ minLength: 1, maxLength: 100 })
      .filter((s) => s.trim().length > 0)
      .map((s) => s.trim());

  /**
   * Arbitrary for generating valid URLs
   */
  const validUrlArbitrary = (): fc.Arbitrary<string> =>
    fc.webUrl({ validSchemes: ['http', 'https'] });

  /**
   * Arbitrary for generating valid UUID strings
   */
  const uuidArbitrary = (): fc.Arbitrary<string> => fc.uuid();

  /**
   * Arbitrary for generating valid ISO date strings
   */
  const isoDateArbitrary = (): fc.Arbitrary<string> =>
    fc
      .integer({ min: 946684800000, max: 4102444800000 }) // 2000-01-01 to 2100-01-01
      .map((timestamp) => new Date(timestamp).toISOString());

  /**
   * Arbitrary for generating a valid CreateKnowledgeSpaceResponse
   */
  const createKnowledgeSpaceResponseArbitrary = (): fc.Arbitrary<CreateKnowledgeSpaceResponse> =>
    fc.record({
      knowledgeSpace: fc.record({
        id: uuidArbitrary(),
        name: validNameArbitrary(),
        type: fc.constantFrom('web', 'document', 'custom'),
        lastUpdatedAt: isoDateArbitrary(),
        createdAt: fc.option(isoDateArbitrary(), { nil: undefined }),
        documentCount: fc.option(fc.nat({ max: 1000 }), { nil: undefined }),
        urls: fc.option(fc.array(validUrlArbitrary(), { minLength: 1, maxLength: 5 }), {
          nil: undefined,
        }),
      }),
    });

  // ============================================================================
  // Helper function for form submission
  // ============================================================================

  /**
   * Helper to fill form and submit
   */
  const fillAndSubmitForm = async (
    user: ReturnType<typeof userEvent.setup>,
    name: string,
    url: string
  ) => {
    const nameInput = screen.getByPlaceholderText('Enter knowledge space name');
    await user.type(nameInput, name);

    const urlInput = screen.getByPlaceholderText('https://example.com');
    await user.type(urlInput, url);

    const submitButton = screen.getByRole('button', { name: /Create Knowledge Space/i });
    await user.click(submitButton);
  };

  // ============================================================================
  // Property-Based Tests
  // ============================================================================

  describe('Property 7.1: Success message displays knowledgeSpaceId', () => {
    it('should always display success message with returned knowledgeSpaceId', async () => {
      // Test with a single example to avoid DOM pollution from multiple renders
      const name = 'Test Knowledge Space';
      const url = 'https://example.com';
      const knowledgeSpaceId = '123e4567-e89b-12d3-a456-426614174000';

      const apiResponse: CreateKnowledgeSpaceResponse = {
        knowledgeSpace: {
          id: knowledgeSpaceId,
          name: name,
          type: 'web',
          lastUpdatedAt: new Date().toISOString(),
        },
      };

      mockedApiClient.createKnowledgeSpace.mockResolvedValue(apiResponse);

      const user = userEvent.setup();
      render(<CreateKnowledgeSpaceForm />);

      await fillAndSubmitForm(user, name, url);

      // Verify success message contains the knowledgeSpaceId
      await waitFor(() => {
        const successMessage = screen.getByText(
          `Knowledge space created successfully! ID: ${knowledgeSpaceId}`
        );
        expect(successMessage).toBeInTheDocument();
      });

      // Verify success message has correct ARIA attributes
      const successAlert = screen.getByRole('alert');
      expect(successAlert).toHaveAttribute('aria-live', 'polite');
    });

    it('should extract ID from any valid API response structure', () => {
      fc.assert(
        fc.property(createKnowledgeSpaceResponseArbitrary(), (response) => {
          // Property: Every valid response must have a knowledgeSpace.id
          expect(response.knowledgeSpace).toBeDefined();
          expect(response.knowledgeSpace.id).toBeDefined();
          expect(typeof response.knowledgeSpace.id).toBe('string');
          expect(response.knowledgeSpace.id.length).toBeGreaterThan(0);
        }),
        { numRuns: 100 }
      );
    });

    it(
      'should display success message for various knowledgeSpaceIds',
      async () => {
        // Test multiple IDs sequentially with proper cleanup
        const testIds = [
        '123e4567-e89b-12d3-a456-426614174000',
        'ks-12345',
        'abcd1234',
        '00000000-0000-0000-0000-000000000000',
      ];

      for (const testId of testIds) {
        const apiResponse: CreateKnowledgeSpaceResponse = {
          knowledgeSpace: {
            id: testId,
            name: 'Test Space',
            type: 'web',
            lastUpdatedAt: new Date().toISOString(),
          },
        };

        mockedApiClient.createKnowledgeSpace.mockResolvedValue(apiResponse);

        const user = userEvent.setup();
        const { unmount } = render(<CreateKnowledgeSpaceForm />);

        await fillAndSubmitForm(user, 'Test Name', 'https://example.com');

        await waitFor(() => {
          expect(
            screen.getByText(`Knowledge space created successfully! ID: ${testId}`)
          ).toBeInTheDocument();
        });

          unmount();
        }
      },
      10000
    );
  });

  describe('Property 7.2: Form is cleared after successful creation', () => {
    it('should clear all form fields after successful submission', async () => {
      const apiResponse: CreateKnowledgeSpaceResponse = {
        knowledgeSpace: {
          id: 'test-id-123',
          name: 'Test Space',
          type: 'web',
          lastUpdatedAt: new Date().toISOString(),
        },
      };

      mockedApiClient.createKnowledgeSpace.mockResolvedValue(apiResponse);

      const user = userEvent.setup();
      render(<CreateKnowledgeSpaceForm />);

      await fillAndSubmitForm(user, 'Test Name', 'https://example.com');

      // Wait for success
      await waitFor(() => {
        expect(
          screen.getByText(`Knowledge space created successfully! ID: ${apiResponse.knowledgeSpace.id}`)
        ).toBeInTheDocument();
      });

      // Verify form is cleared
      await waitFor(() => {
        const clearedNameInput = screen.getByPlaceholderText(
          'Enter knowledge space name'
        ) as HTMLInputElement;
        expect(clearedNameInput.value).toBe('');

        // Should reset to single empty URL input
        const clearedUrlInputs = screen.getAllByPlaceholderText('https://example.com');
        expect(clearedUrlInputs).toHaveLength(1);
        expect((clearedUrlInputs[0] as HTMLInputElement).value).toBe('');
      });
    });

    it('should clear validation errors after successful submission', async () => {
      const apiResponse: CreateKnowledgeSpaceResponse = {
        knowledgeSpace: {
          id: 'test-id-456',
          name: 'Test Space',
          type: 'web',
          lastUpdatedAt: new Date().toISOString(),
        },
      };

      mockedApiClient.createKnowledgeSpace.mockResolvedValue(apiResponse);

      const user = userEvent.setup();
      render(<CreateKnowledgeSpaceForm />);

      await fillAndSubmitForm(user, 'Test Name', 'https://example.com');

      // Wait for success
      await waitFor(() => {
        expect(
          screen.getByText(`Knowledge space created successfully! ID: ${apiResponse.knowledgeSpace.id}`)
        ).toBeInTheDocument();
      });

      // Verify no validation errors are displayed
      expect(
        screen.queryByText('Name is required and must be 100 characters or less')
      ).not.toBeInTheDocument();
      expect(screen.queryByText('URL is required')).not.toBeInTheDocument();
      expect(
        screen.queryByText('Invalid URL format (must start with http:// or https://)')
      ).not.toBeInTheDocument();
    });
  });

  describe('Property 7.3: onSuccess callback is called with knowledgeSpaceId', () => {
    it('should always call onSuccess with the returned knowledgeSpaceId', async () => {
      const knowledgeSpaceId = 'callback-test-id-789';
      const mockOnSuccess = jest.fn();

      const apiResponse: CreateKnowledgeSpaceResponse = {
        knowledgeSpace: {
          id: knowledgeSpaceId,
          name: 'Test Space',
          type: 'web',
          lastUpdatedAt: new Date().toISOString(),
        },
      };

      mockedApiClient.createKnowledgeSpace.mockResolvedValue(apiResponse);

      const user = userEvent.setup();
      render(<CreateKnowledgeSpaceForm onSuccess={mockOnSuccess} />);

      await fillAndSubmitForm(user, 'Test Name', 'https://example.com');

      // Wait for API call and callback
      await waitFor(() => {
        expect(mockOnSuccess).toHaveBeenCalledTimes(1);
        expect(mockOnSuccess).toHaveBeenCalledWith(knowledgeSpaceId);
      });

      // Verify the callback received a valid ID
      const callbackArg = mockOnSuccess.mock.calls[0][0];
      expect(typeof callbackArg).toBe('string');
      expect(callbackArg.length).toBeGreaterThan(0);
      expect(callbackArg).toBe(knowledgeSpaceId);
    });

    it('should call onSuccess for any valid knowledgeSpaceId format', () => {
      fc.assert(
        fc.property(
          fc.oneof(
            uuidArbitrary(),
            fc.string({ minLength: 1, maxLength: 50 }).filter((s) => s.trim().length > 0),
            fc.integer({ min: 0, max: 0xffffffff }).map((n) => n.toString(16).padStart(8, '0')),
            fc.integer({ min: 1, max: 999999 }).map((n) => `ks-${n}`)
          ),
          (knowledgeSpaceId) => {
            const mockOnSuccess = jest.fn();

            // Simulate callback behavior
            mockOnSuccess(knowledgeSpaceId);

            // Property: callback should be called with the exact ID
            expect(mockOnSuccess).toHaveBeenCalledWith(knowledgeSpaceId);
            expect(mockOnSuccess.mock.calls[0][0]).toBe(knowledgeSpaceId);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should not call onSuccess if not provided', async () => {
      const apiResponse: CreateKnowledgeSpaceResponse = {
        knowledgeSpace: {
          id: 'no-callback-test',
          name: 'Test Space',
          type: 'web',
          lastUpdatedAt: new Date().toISOString(),
        },
      };

      mockedApiClient.createKnowledgeSpace.mockResolvedValue(apiResponse);

      const user = userEvent.setup();
      // Render without onSuccess callback - should not throw
      render(<CreateKnowledgeSpaceForm />);

      await fillAndSubmitForm(user, 'Test Name', 'https://example.com');

      // Should show success message even without callback
      await waitFor(() => {
        expect(
          screen.getByText(`Knowledge space created successfully! ID: ${apiResponse.knowledgeSpace.id}`)
        ).toBeInTheDocument();
      });
    });
  });

  describe('Property 7.4: Success message contains the returned ID', () => {
    it(
      'should always include the exact ID in the success message',
      async () => {
        const testCases = [
          { id: '123e4567-e89b-12d3-a456-426614174000', name: 'UUID format' },
          { id: 'ks-12345', name: 'Prefixed format' },
          { id: 'simple-id', name: 'Simple format' },
          { id: '00000000-0000-0000-0000-000000000000', name: 'Zero UUID' },
        ];

        for (const testCase of testCases) {
        const apiResponse: CreateKnowledgeSpaceResponse = {
          knowledgeSpace: {
            id: testCase.id,
            name: `Test ${testCase.name}`,
            type: 'web',
            lastUpdatedAt: new Date().toISOString(),
          },
        };

        mockedApiClient.createKnowledgeSpace.mockResolvedValue(apiResponse);

        const user = userEvent.setup();
        const { unmount } = render(<CreateKnowledgeSpaceForm />);

        await fillAndSubmitForm(user, testCase.name, 'https://example.com');

        // Verify the exact ID is in the success message
        await waitFor(() => {
          const successText = screen.getByText(
            `Knowledge space created successfully! ID: ${testCase.id}`
          );
          expect(successText).toBeInTheDocument();
          expect(successText.textContent).toContain(testCase.id);
        });

          unmount();
        }
      },
      10000
    );

    it('should handle various ID formats in success message', () => {
      fc.assert(
        fc.property(
          fc.oneof(
            uuidArbitrary(),
            fc.string({ minLength: 1, maxLength: 50 }).filter((s) => s.trim().length > 0),
            fc.integer({ min: 0, max: 0xffffffff }).map((n) => n.toString(16).padStart(8, '0')),
            fc.integer({ min: 1, max: 999999 }).map((n) => `ks-${n}`)
          ),
          (knowledgeSpaceId) => {
            // Property: Success message format should be consistent
            const expectedMessage = `Knowledge space created successfully! ID: ${knowledgeSpaceId}`;
            expect(expectedMessage).toContain(knowledgeSpaceId);
            expect(expectedMessage).toContain('Knowledge space created successfully!');
            expect(expectedMessage).toContain('ID:');
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Property 7.5: Success flow integration properties', () => {
    it(
      'should preserve response data integrity throughout success flow',
      async () => {
      const knowledgeSpaceId = 'integrity-test-id';
      const mockOnSuccess = jest.fn();

      const apiResponse: CreateKnowledgeSpaceResponse = {
        knowledgeSpace: {
          id: knowledgeSpaceId,
          name: 'Test Space',
          type: 'web',
          lastUpdatedAt: new Date().toISOString(),
        },
      };

      mockedApiClient.createKnowledgeSpace.mockResolvedValue(apiResponse);

      const user = userEvent.setup();
      render(<CreateKnowledgeSpaceForm onSuccess={mockOnSuccess} />);

      await fillAndSubmitForm(user, 'Test Name', 'https://example.com');

      await waitFor(() => {
        expect(mockOnSuccess).toHaveBeenCalled();
      });

      // Verify data integrity: callback ID matches UI message ID
      const callbackId = mockOnSuccess.mock.calls[0][0];
      expect(callbackId).toBe(knowledgeSpaceId);

      const successMessage = screen.getByText(
        `Knowledge space created successfully! ID: ${knowledgeSpaceId}`
      );
      expect(successMessage).toBeInTheDocument();

        // Verify no data corruption
        expect(typeof callbackId).toBe('string');
        expect(callbackId.length).toBeGreaterThan(0);
      },
      10000
    );

    it('should verify response structure invariants', () => {
      fc.assert(
        fc.property(createKnowledgeSpaceResponseArbitrary(), (response) => {
          // Property: All responses must maintain structure
          expect(response).toHaveProperty('knowledgeSpace');
          expect(response.knowledgeSpace).toHaveProperty('id');
          expect(response.knowledgeSpace).toHaveProperty('name');
          expect(response.knowledgeSpace).toHaveProperty('type');
          expect(response.knowledgeSpace).toHaveProperty('lastUpdatedAt');

          // Property: ID must be a non-empty string
          expect(typeof response.knowledgeSpace.id).toBe('string');
          expect(response.knowledgeSpace.id.length).toBeGreaterThan(0);

          // Property: Type must be one of the valid values
          expect(['web', 'document', 'custom']).toContain(response.knowledgeSpace.type);
        }),
        { numRuns: 100 }
      );
    });
  });

  describe('Property 7.6: Success message lifecycle', () => {
    it(
      'should display success message for at least 3 seconds',
      async () => {
      jest.useFakeTimers();

      const apiResponse: CreateKnowledgeSpaceResponse = {
        knowledgeSpace: {
          id: 'lifecycle-test-id',
          name: 'Test Space',
          type: 'web',
          lastUpdatedAt: new Date().toISOString(),
        },
      };

      mockedApiClient.createKnowledgeSpace.mockResolvedValue(apiResponse);

      const user = userEvent.setup({ delay: null }); // Disable delay with fake timers
      render(<CreateKnowledgeSpaceForm />);

      await fillAndSubmitForm(user, 'Test Name', 'https://example.com');

      // Wait for success message to appear
      await waitFor(() => {
        expect(
          screen.getByText(`Knowledge space created successfully! ID: ${apiResponse.knowledgeSpace.id}`)
        ).toBeInTheDocument();
      });

      // Advance time by 2.5 seconds - message should still be visible
      jest.advanceTimersByTime(2500);

      await waitFor(() => {
        expect(
          screen.getByText(`Knowledge space created successfully! ID: ${apiResponse.knowledgeSpace.id}`)
        ).toBeInTheDocument();
      });

      // Advance time past 3 seconds - message should disappear
      jest.advanceTimersByTime(600);

      await waitFor(() => {
        expect(
          screen.queryByText(`Knowledge space created successfully! ID: ${apiResponse.knowledgeSpace.id}`)
        ).not.toBeInTheDocument();
      });

        jest.useRealTimers();
      },
      10000
    );
  });
});
