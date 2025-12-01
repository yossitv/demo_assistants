/**
 * @jest-environment jsdom
 */

import '@testing-library/jest-dom';
import React from 'react';
import { render, screen, cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import * as fc from 'fast-check';
import KnowledgeSpaceList from '@/components/KnowledgeSpaceList';
import { KnowledgeSpace } from '@/lib/api/types';

describe('KnowledgeSpaceList Error Handling - Property-Based Tests', () => {
  describe('Property 16: Agent list error handling (validates Requirement 4.5)', () => {
    /**
     * Arbitrary generator for knowledge space data with unique IDs
     */
    const knowledgeSpaceArbitrary = fc.record({
      id: fc.uuid(),
      name: fc
        .stringMatching(/^[a-zA-Z0-9][a-zA-Z0-9 _-]{0,48}[a-zA-Z0-9]$/)
        .filter((s) => s.length >= 2),
      type: fc.constant('web' as const),
      lastUpdatedAt: fc
        .integer({ min: new Date('2020-01-01').getTime(), max: new Date('2025-01-01').getTime() })
        .map((timestamp) => new Date(timestamp).toISOString()),
    });

    const knowledgeSpacesArrayArbitrary = fc.array(knowledgeSpaceArbitrary, {
      minLength: 0,
      maxLength: 10,
    }).map((arr) => {
      // Ensure unique IDs by adding index to generated IDs
      return arr.map((item, index) => ({
        ...item,
        id: `${item.id}-${index}`,
      }));
    });

    /**
     * Arbitrary generator for error messages
     */
    const errorMessageArbitrary = fc
      .string({ minLength: 1, maxLength: 200 })
      .filter((s) => s.trim().length > 0);

    describe('Error Message Display', () => {
      it('should always display error message when error is provided', () => {
        fc.assert(
          fc.property(errorMessageArbitrary, (errorMessage) => {
            // Arrange & Act
            render(
              <KnowledgeSpaceList
                knowledgeSpaces={[]}
                loading={false}
                error={errorMessage}
              />
            );

            try {
              // Assert - Error should be shown in an alert element
              const alert = screen.getByRole('alert');
              expect(alert).toBeInTheDocument();
              expect(alert).toHaveAttribute('aria-live', 'assertive');

              // Assert - Error message content should be visible
              const errorParagraph = alert.querySelector('p');
              expect(errorParagraph).toBeInTheDocument();
              expect(errorParagraph?.textContent).toBe(errorMessage);
            } finally {
              cleanup();
            }
          })
        );
      });

      it('should display error component correctly with proper structure', () => {
        fc.assert(
          fc.property(errorMessageArbitrary, (errorMessage) => {
            // Arrange & Act
            const { container } = render(
              <KnowledgeSpaceList
                knowledgeSpaces={[]}
                loading={false}
                error={errorMessage}
              />
            );

            try {
              // Assert - Should have proper container structure
              const errorContainer = container.querySelector('.max-w-3xl.mx-auto');
              expect(errorContainer).toBeInTheDocument();

              // Assert - Should have error icon
              const alert = screen.getByRole('alert');
              const svg = alert.querySelector('svg');
              expect(svg).toBeInTheDocument();

              // Assert - Should have "Error" heading
              expect(screen.getByText('Error')).toBeInTheDocument();

              // Assert - Should have the actual error message
              const errorParagraph = alert.querySelector('p');
              expect(errorParagraph).toBeInTheDocument();
              expect(errorParagraph?.textContent).toBe(errorMessage);
            } finally {
              cleanup();
            }
          })
        );
      });
    });

    describe('Retry Button Functionality', () => {
      it('should show retry button when onRetry is provided', () => {
        fc.assert(
          fc.property(errorMessageArbitrary, (errorMessage) => {
            // Arrange
            const onRetry = jest.fn();

            // Act
            render(
              <KnowledgeSpaceList
                knowledgeSpaces={[]}
                loading={false}
                error={errorMessage}
                onRetry={onRetry}
              />
            );

            try {
              // Assert - Retry button should be visible
              const retryButton = screen.getByRole('button', {
                name: /retry the failed operation/i,
              });
              expect(retryButton).toBeInTheDocument();

              // Assert - Retry button should have proper accessibility attributes
              expect(retryButton).toHaveAttribute('aria-label', 'Retry the failed operation');
            } finally {
              cleanup();
            }
          })
        );
      });

      it('should call onRetry when retry button is clicked', async () => {
        await fc.assert(
          fc.asyncProperty(errorMessageArbitrary, async (errorMessage) => {
            // Arrange
            const user = userEvent.setup();
            const onRetry = jest.fn();

            render(
              <KnowledgeSpaceList
                knowledgeSpaces={[]}
                loading={false}
                error={errorMessage}
                onRetry={onRetry}
              />
            );

            try {
              // Act - Click the retry button
              const retryButton = screen.getByRole('button', {
                name: /retry the failed operation/i,
              });
              await user.click(retryButton);

              // Assert - onRetry should have been called exactly once
              expect(onRetry).toHaveBeenCalledTimes(1);
            } finally {
              cleanup();
            }
          }),
          { numRuns: 10 }
        );
      }, 15000);

      it('should not show retry button when onRetry is not provided', () => {
        fc.assert(
          fc.property(errorMessageArbitrary, (errorMessage) => {
            // Arrange & Act
            render(
              <KnowledgeSpaceList
                knowledgeSpaces={[]}
                loading={false}
                error={errorMessage}
              />
            );

            try {
              // Assert - Retry button should not be visible
              const retryButton = screen.queryByRole('button', {
                name: /retry the failed operation/i,
              });
              expect(retryButton).not.toBeInTheDocument();
            } finally {
              cleanup();
            }
          })
        );
      });

      it('should allow multiple retry attempts', async () => {
        await fc.assert(
          fc.asyncProperty(
            errorMessageArbitrary,
            fc.integer({ min: 1, max: 3 }),
            async (errorMessage, numRetries) => {
              // Arrange
              const user = userEvent.setup();
              const onRetry = jest.fn();

              const { rerender } = render(
                <KnowledgeSpaceList
                  knowledgeSpaces={[]}
                  loading={false}
                  error={errorMessage}
                  onRetry={onRetry}
                />
              );

              try {
                // Act & Assert - Click retry button multiple times
                for (let i = 0; i < numRetries; i++) {
                  const retryButton = screen.getByRole('button', {
                    name: /retry the failed operation/i,
                  });
                  await user.click(retryButton);

                  // Re-render with same props to keep the button available
                  // (simulating that the error persists after retry)
                  rerender(
                    <KnowledgeSpaceList
                      knowledgeSpaces={[]}
                      loading={false}
                      error={errorMessage}
                      onRetry={onRetry}
                    />
                  );
                }

                // Assert - onRetry should have been called the correct number of times
                expect(onRetry).toHaveBeenCalledTimes(numRetries);
              } finally {
                cleanup();
              }
            }
          ),
          { numRuns: 5 }
        );
      }, 15000);
    });

    describe('Error State Precedence', () => {
      it('should take precedence over loading state', () => {
        fc.assert(
          fc.property(
            errorMessageArbitrary,
            knowledgeSpacesArrayArbitrary,
            (errorMessage, knowledgeSpaces) => {
              // Arrange & Act - Both error and loading are true
              const { container } = render(
                <KnowledgeSpaceList
                  knowledgeSpaces={knowledgeSpaces}
                  loading={true}
                  error={errorMessage}
                />
              );

              try {
                // Assert - Error should be displayed
                const alert = screen.getByRole('alert');
                expect(alert).toBeInTheDocument();
                const errorParagraph = alert.querySelector('p');
                expect(errorParagraph?.textContent).toBe(errorMessage);

                // Assert - Loading indicator should NOT be visible
                const loadingContainer = container.querySelector(
                  '[role="status"][aria-label="Loading knowledge spaces"]'
                );
                expect(loadingContainer).not.toBeInTheDocument();

                // Assert - Loading skeletons should NOT be visible
                const skeletons = screen.queryAllByLabelText('Loading knowledge space');
                expect(skeletons.length).toBe(0);
              } finally {
                cleanup();
              }
            }
          )
        );
      });

      it('should take precedence over data display', () => {
        fc.assert(
          fc.property(
            errorMessageArbitrary,
            fc
              .array(knowledgeSpaceArbitrary, { minLength: 1, maxLength: 10 })
              .map((arr) => {
                return arr.map((item, index) => ({
                  ...item,
                  id: `${item.id}-data-${index}`,
                }));
              })
              .filter((arr) => arr.length > 0),
            (errorMessage, knowledgeSpaces) => {
              // Arrange & Act - Both error and data are provided
              render(
                <KnowledgeSpaceList
                  knowledgeSpaces={knowledgeSpaces}
                  loading={false}
                  error={errorMessage}
                />
              );

              try {
                // Assert - Error should be displayed
                const alert = screen.getByRole('alert');
                expect(alert).toBeInTheDocument();
                const errorParagraph = alert.querySelector('p');
                expect(errorParagraph?.textContent).toBe(errorMessage);

                // Assert - Knowledge space list should NOT be visible
                const listContainer = screen.queryByRole('list', {
                  name: /knowledge spaces/i,
                });
                expect(listContainer).not.toBeInTheDocument();

                // Assert - Knowledge space data should NOT be rendered
                knowledgeSpaces.forEach((space) => {
                  const cards = screen.queryAllByRole('article', {
                    name: new RegExp(`knowledge space: ${space.name}`, 'i'),
                  });
                  expect(cards.length).toBe(0);
                });
              } finally {
                cleanup();
              }
            }
          )
        );
      });

      it('should take precedence over empty state', () => {
        fc.assert(
          fc.property(errorMessageArbitrary, (errorMessage) => {
            // Arrange & Act - Error with empty data
            render(
              <KnowledgeSpaceList
                knowledgeSpaces={[]}
                loading={false}
                error={errorMessage}
              />
            );

            try {
              // Assert - Error should be displayed
              const alert = screen.getByRole('alert');
              expect(alert).toBeInTheDocument();
              const errorParagraph = alert.querySelector('p');
              expect(errorParagraph?.textContent).toBe(errorMessage);

              // Assert - Empty state should NOT be visible
              const emptyStateText = screen.queryByText(/no knowledge spaces found/i);
              expect(emptyStateText).not.toBeInTheDocument();
            } finally {
              cleanup();
            }
          })
        );
      });

      it('should prioritize error over all other states simultaneously', () => {
        fc.assert(
          fc.property(
            errorMessageArbitrary,
            knowledgeSpacesArrayArbitrary,
            fc.boolean(),
            (errorMessage, knowledgeSpaces, loading) => {
              // Arrange & Act - Error with all possible state combinations
              const { container } = render(
                <KnowledgeSpaceList
                  knowledgeSpaces={knowledgeSpaces}
                  loading={loading}
                  error={errorMessage}
                />
              );

              try {
                // Assert - Only error should be visible
                const alert = screen.getByRole('alert');
                expect(alert).toBeInTheDocument();

                // Assert - No loading state
                const loadingContainer = container.querySelector(
                  '[role="status"][aria-label="Loading knowledge spaces"]'
                );
                expect(loadingContainer).not.toBeInTheDocument();

                // Assert - No data display
                const listContainer = screen.queryByRole('list', {
                  name: /knowledge spaces/i,
                });
                expect(listContainer).not.toBeInTheDocument();

                // Assert - No empty state
                const emptyStateText = screen.queryByText(/no knowledge spaces found/i);
                expect(emptyStateText).not.toBeInTheDocument();
              } finally {
                cleanup();
              }
            }
          )
        );
      });
    });

    describe('Error State Transitions', () => {
      it('should transition from loading to error state', () => {
        fc.assert(
          fc.property(
            errorMessageArbitrary,
            knowledgeSpacesArrayArbitrary,
            (errorMessage, knowledgeSpaces) => {
              // Arrange - Initial loading state
              const { rerender, container } = render(
                <KnowledgeSpaceList
                  knowledgeSpaces={[]}
                  loading={true}
                  error={undefined}
                />
              );

              try {
                // Assert - Loading state
                let loadingContainer = container.querySelector(
                  '[role="status"][aria-label="Loading knowledge spaces"]'
                );
                expect(loadingContainer).toBeInTheDocument();

                // Act - Transition to error state
                rerender(
                  <KnowledgeSpaceList
                    knowledgeSpaces={knowledgeSpaces}
                    loading={false}
                    error={errorMessage}
                  />
                );

                // Assert - Error state
                const alert = screen.getByRole('alert');
                expect(alert).toBeInTheDocument();
                const errorParagraph = alert.querySelector('p');
                expect(errorParagraph?.textContent).toBe(errorMessage);

                // Assert - Loading should be gone
                loadingContainer = container.querySelector(
                  '[role="status"][aria-label="Loading knowledge spaces"]'
                );
                expect(loadingContainer).not.toBeInTheDocument();
              } finally {
                cleanup();
              }
            }
          )
        );
      });

      it('should transition from data to error state', () => {
        fc.assert(
          fc.property(
            errorMessageArbitrary,
            fc
              .array(knowledgeSpaceArbitrary, { minLength: 1, maxLength: 5 })
              .map((arr) => {
                return arr.map((item, index) => ({
                  ...item,
                  id: `${item.id}-trans-${index}`,
                }));
              })
              .filter((arr) => arr.length > 0),
            (errorMessage, knowledgeSpaces) => {
              // Arrange - Initial data state
              const { rerender } = render(
                <KnowledgeSpaceList
                  knowledgeSpaces={knowledgeSpaces}
                  loading={false}
                  error={undefined}
                />
              );

              try {
                // Assert - Data state
                const listContainer = screen.getByRole('list', {
                  name: /knowledge spaces/i,
                });
                expect(listContainer).toBeInTheDocument();

                // Act - Transition to error state
                rerender(
                  <KnowledgeSpaceList
                    knowledgeSpaces={knowledgeSpaces}
                    loading={false}
                    error={errorMessage}
                  />
                );

                // Assert - Error state
                const alert = screen.getByRole('alert');
                expect(alert).toBeInTheDocument();
                const errorParagraph = alert.querySelector('p');
                expect(errorParagraph?.textContent).toBe(errorMessage);

                // Assert - Data should be hidden
                const hiddenListContainer = screen.queryByRole('list', {
                  name: /knowledge spaces/i,
                });
                expect(hiddenListContainer).not.toBeInTheDocument();
              } finally {
                cleanup();
              }
            }
          )
        );
      });

      it('should transition from error to success state when error is cleared', () => {
        fc.assert(
          fc.property(
            errorMessageArbitrary,
            fc
              .array(knowledgeSpaceArbitrary, { minLength: 1, maxLength: 5 })
              .map((arr) => {
                return arr.map((item, index) => ({
                  ...item,
                  id: `${item.id}-clear-${index}`,
                }));
              })
              .filter((arr) => arr.length > 0),
            (errorMessage, knowledgeSpaces) => {
              // Arrange - Initial error state
              const { rerender } = render(
                <KnowledgeSpaceList
                  knowledgeSpaces={[]}
                  loading={false}
                  error={errorMessage}
                />
              );

              try {
                // Assert - Error state
                expect(screen.getByRole('alert')).toBeInTheDocument();

                // Act - Clear error and add data
                rerender(
                  <KnowledgeSpaceList
                    knowledgeSpaces={knowledgeSpaces}
                    loading={false}
                    error={undefined}
                  />
                );

                // Assert - Success state with data
                const listContainer = screen.getByRole('list', {
                  name: /knowledge spaces/i,
                });
                expect(listContainer).toBeInTheDocument();

                // Assert - Error should be gone
                const alert = screen.queryByRole('alert');
                expect(alert).not.toBeInTheDocument();

                // Assert - Data should be visible
                knowledgeSpaces.forEach((space) => {
                  expect(
                    screen.getByText((content, element) => {
                      const normalizedContent = content.replace(/\s+/g, ' ');
                      const normalizedName = space.name.replace(/\s+/g, ' ');
                      return normalizedContent === normalizedName;
                    })
                  ).toBeInTheDocument();
                });
              } finally {
                cleanup();
              }
            }
          )
        );
      });
    });

    describe('Error Message Edge Cases', () => {
      it('should handle very long error messages', () => {
        fc.assert(
          fc.property(
            fc.string({ minLength: 100, maxLength: 500 }).filter((s) => s.trim().length >= 100),
            (longErrorMessage) => {
              // Arrange & Act
              render(
                <KnowledgeSpaceList
                  knowledgeSpaces={[]}
                  loading={false}
                  error={longErrorMessage}
                />
              );

              try {
                // Assert - Error should still be displayed
                const alert = screen.getByRole('alert');
                expect(alert).toBeInTheDocument();
                const errorParagraph = alert.querySelector('p');
                expect(errorParagraph?.textContent).toBe(longErrorMessage);
              } finally {
                cleanup();
              }
            }
          )
        );
      });

      it('should handle error messages with special characters', () => {
        fc.assert(
          fc.property(
            fc.string({ minLength: 10, maxLength: 100 }).filter((s) => s.trim().length >= 10),
            (errorMessage) => {
              // Add special characters
              const specialError = `Error: ${errorMessage.trim()} <>&"'`;

              // Arrange & Act
              render(
                <KnowledgeSpaceList
                  knowledgeSpaces={[]}
                  loading={false}
                  error={specialError}
                />
              );

              try {
                // Assert - Error should be displayed correctly
                const alert = screen.getByRole('alert');
                expect(alert).toBeInTheDocument();
                // HTML entities are escaped in React, so we check for the actual rendered content
                const errorParagraph = alert.querySelector('p');
                expect(errorParagraph?.textContent).toBe(specialError);
              } finally {
                cleanup();
              }
            }
          )
        );
      });

      it('should handle error messages with newlines and whitespace', () => {
        fc.assert(
          fc.property(
            fc.string({ minLength: 5, maxLength: 50 }),
            fc.string({ minLength: 5, maxLength: 50 }),
            (part1, part2) => {
              const errorMessage = `${part1}\n${part2}`;

              // Arrange & Act
              render(
                <KnowledgeSpaceList
                  knowledgeSpaces={[]}
                  loading={false}
                  error={errorMessage}
                />
              );

              try {
                // Assert - Error should be displayed
                const alert = screen.getByRole('alert');
                expect(alert).toBeInTheDocument();
              } finally {
                cleanup();
              }
            }
          )
        );
      });
    });

    describe('Accessibility', () => {
      it('should maintain proper ARIA attributes in error state', () => {
        fc.assert(
          fc.property(errorMessageArbitrary, (errorMessage) => {
            // Arrange & Act
            render(
              <KnowledgeSpaceList
                knowledgeSpaces={[]}
                loading={false}
                error={errorMessage}
              />
            );

            try {
              // Assert - Alert role
              const alert = screen.getByRole('alert');
              expect(alert).toHaveAttribute('role', 'alert');

              // Assert - Assertive aria-live
              expect(alert).toHaveAttribute('aria-live', 'assertive');
            } finally {
              cleanup();
            }
          })
        );
      });

      it('should have accessible retry button when onRetry is provided', () => {
        fc.assert(
          fc.property(errorMessageArbitrary, (errorMessage) => {
            // Arrange
            const onRetry = jest.fn();

            // Act
            render(
              <KnowledgeSpaceList
                knowledgeSpaces={[]}
                loading={false}
                error={errorMessage}
                onRetry={onRetry}
              />
            );

            try {
              // Assert - Retry button should have proper aria-label
              const retryButton = screen.getByRole('button', {
                name: /retry the failed operation/i,
              });
              expect(retryButton).toHaveAttribute(
                'aria-label',
                'Retry the failed operation'
              );

              // Assert - Button should be keyboard accessible
              expect(retryButton).toHaveClass('focus:outline-none');
              expect(retryButton).toHaveClass('focus:ring-2');
            } finally {
              cleanup();
            }
          })
        );
      });
    });

    describe('Requirement 4.5: Agent List Error Handling Validation', () => {
      it('validates that error messages are displayed when provided', () => {
        const testErrorMessage = 'Failed to load knowledge spaces';

        // Arrange & Act
        render(
          <KnowledgeSpaceList
            knowledgeSpaces={[]}
            loading={false}
            error={testErrorMessage}
          />
        );

        // Assert - Error message component is shown
        const alert = screen.getByRole('alert');
        expect(alert).toBeInTheDocument();
        expect(alert).toHaveAttribute('aria-live', 'assertive');

        // Assert - Error message content is displayed
        expect(screen.getByText('Error')).toBeInTheDocument();
        expect(screen.getByText(testErrorMessage)).toBeInTheDocument();
      });

      it('validates that retry button works when onRetry is provided', async () => {
        const user = userEvent.setup();
        const onRetry = jest.fn();
        const errorMessage = 'Network error occurred';

        // Arrange
        render(
          <KnowledgeSpaceList
            knowledgeSpaces={[]}
            loading={false}
            error={errorMessage}
            onRetry={onRetry}
          />
        );

        // Act - Find and click retry button
        const retryButton = screen.getByRole('button', {
          name: /retry the failed operation/i,
        });
        expect(retryButton).toBeInTheDocument();

        await user.click(retryButton);

        // Assert - onRetry callback was called
        expect(onRetry).toHaveBeenCalledTimes(1);
      });

      it('validates that error state takes precedence over loading state', () => {
        const errorMessage = 'Error loading data';

        // Arrange & Act - Both loading=true and error present
        const { container } = render(
          <KnowledgeSpaceList
            knowledgeSpaces={[]}
            loading={true}
            error={errorMessage}
          />
        );

        // Assert - Error is displayed
        const alert = screen.getByRole('alert');
        expect(alert).toBeInTheDocument();
        expect(screen.getByText(errorMessage)).toBeInTheDocument();

        // Assert - Loading indicator is NOT displayed
        const loadingContainer = container.querySelector(
          '[role="status"][aria-label="Loading knowledge spaces"]'
        );
        expect(loadingContainer).not.toBeInTheDocument();

        const skeletons = screen.queryAllByLabelText('Loading knowledge space');
        expect(skeletons.length).toBe(0);
      });

      it('validates that error state takes precedence over data display', () => {
        const errorMessage = 'Error occurred';
        const knowledgeSpaces: KnowledgeSpace[] = [
          {
            id: 'ks-1',
            name: 'Test Space 1',
            type: 'web',
            lastUpdatedAt: new Date().toISOString(),
          },
          {
            id: 'ks-2',
            name: 'Test Space 2',
            type: 'web',
            lastUpdatedAt: new Date().toISOString(),
          },
        ];

        // Arrange & Act - Both data and error present
        render(
          <KnowledgeSpaceList
            knowledgeSpaces={knowledgeSpaces}
            loading={false}
            error={errorMessage}
          />
        );

        // Assert - Error is displayed
        const alert = screen.getByRole('alert');
        expect(alert).toBeInTheDocument();
        expect(screen.getByText(errorMessage)).toBeInTheDocument();

        // Assert - Data is NOT displayed
        const listContainer = screen.queryByRole('list', {
          name: /knowledge spaces/i,
        });
        expect(listContainer).not.toBeInTheDocument();

        // Assert - Individual knowledge space names should not be visible
        expect(screen.queryByText('Test Space 1')).not.toBeInTheDocument();
        expect(screen.queryByText('Test Space 2')).not.toBeInTheDocument();
      });
    });
  });
});
