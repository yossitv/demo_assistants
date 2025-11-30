/**
 * @jest-environment jsdom
 */

import '@testing-library/jest-dom';
import React from 'react';
import { render, screen, cleanup } from '@testing-library/react';
import * as fc from 'fast-check';
import KnowledgeSpaceList from '@/components/KnowledgeSpaceList';
import { KnowledgeSpace } from '@/lib/api/types';

/**
 * Escapes special regex characters in a string
 */
function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

describe('KnowledgeSpaceList Loading States - Property-Based Tests', () => {
  describe('Property 15: Agent list loading indicator (validates Requirement 4.3)', () => {
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

    it('should always show loading indicator when loading=true, regardless of data', () => {
      fc.assert(
        fc.property(knowledgeSpacesArrayArbitrary, (knowledgeSpaces) => {
          // Arrange & Act
          const { container } = render(
            <KnowledgeSpaceList
              knowledgeSpaces={knowledgeSpaces}
              loading={true}
              error={undefined}
            />
          );

          try {
            // Assert - Loading indicator should be visible
            const loadingContainer = container.querySelector('[role="status"][aria-label="Loading knowledge spaces"]');
            expect(loadingContainer).toBeInTheDocument();

            // Assert - Should have loading skeleton cards
            const skeletons = screen.getAllByLabelText('Loading knowledge space');
            expect(skeletons.length).toBe(6);
          } finally {
            cleanup();
          }
        })
      );
    });

    it('should never show knowledge space data when loading=true', () => {
      fc.assert(
        fc.property(
          fc
            .array(knowledgeSpaceArbitrary, { minLength: 1, maxLength: 10 })
            .map((arr) => {
              return arr.map((item, index) => ({
                ...item,
                id: `${item.id}-test-${index}`,
              }));
            })
            .filter((arr) => arr.length > 0),
          (knowledgeSpaces) => {
            // Arrange & Act
            const { container } = render(
              <KnowledgeSpaceList
                knowledgeSpaces={knowledgeSpaces}
                loading={true}
                error={undefined}
              />
            );

            try {
              // Assert - Knowledge space names should not be visible
              knowledgeSpaces.forEach((space) => {
                // The actual knowledge space cards should not be rendered
                const escapedName = escapeRegex(space.name);
                const cards = screen.queryAllByRole('article', {
                  name: new RegExp(`knowledge space: ${escapedName}`, 'i'),
                });
                expect(cards.length).toBe(0);
              });

              // Assert - Should not show the success state grid with list role
              const listContainer = screen.queryByRole('list', {
                name: /knowledge spaces/i,
              });
              expect(listContainer).not.toBeInTheDocument();
            } finally {
              cleanup();
            }
          }
        )
      );
    });

    it('should hide loading indicator when loading=false with data', () => {
      fc.assert(
        fc.property(
          fc
            .array(knowledgeSpaceArbitrary, { minLength: 1, maxLength: 10 })
            .map((arr) => {
              // Ensure unique IDs
              return arr.map((item, index) => ({
                ...item,
                id: `${item.id}-unique-${index}`,
              }));
            })
            .filter((arr) => arr.length > 0),
          (knowledgeSpaces) => {
            // Arrange & Act
            const { container } = render(
              <KnowledgeSpaceList
                knowledgeSpaces={knowledgeSpaces}
                loading={false}
                error={undefined}
              />
            );

            try {
              // Assert - Loading indicator should not be visible
              const loadingContainer = container.querySelector('[role="status"][aria-label="Loading knowledge spaces"]');
              expect(loadingContainer).not.toBeInTheDocument();

              // Assert - Loading skeletons should not be visible
              const skeletons = screen.queryAllByLabelText('Loading knowledge space');
              expect(skeletons.length).toBe(0);
            } finally {
              cleanup();
            }
          }
        )
      );
    });

    it('should show knowledge space data when loading=false', () => {
      fc.assert(
        fc.property(
          fc
            .array(knowledgeSpaceArbitrary, { minLength: 1, maxLength: 5 })
            .map((arr) => {
              return arr.map((item, index) => ({
                ...item,
                id: `${item.id}-data-${index}`,
              }));
            })
            .filter((arr) => arr.length > 0),
          (knowledgeSpaces) => {
            // Arrange & Act
            render(
              <KnowledgeSpaceList
                knowledgeSpaces={knowledgeSpaces}
                loading={false}
                error={undefined}
              />
            );

            try {
              // Assert - Knowledge space list should be visible
              const listContainer = screen.getByRole('list', {
                name: /knowledge spaces/i,
              });
              expect(listContainer).toBeInTheDocument();

              // Assert - Each knowledge space should be rendered
              knowledgeSpaces.forEach((space) => {
                // Use a text matcher function to handle HTML's space normalization
                expect(screen.getByText((content, element) => {
                  // Normalize spaces in both the content and our test name
                  const normalizedContent = content.replace(/\s+/g, ' ');
                  const normalizedName = space.name.replace(/\s+/g, ' ');
                  return normalizedContent === normalizedName;
                })).toBeInTheDocument();
              });
            } finally {
              cleanup();
            }
          }
        )
      );
    });

    it('should show empty state when loading=false and no data', () => {
      // Arrange & Act
      render(
        <KnowledgeSpaceList
          knowledgeSpaces={undefined}
          loading={false}
          error={undefined}
        />
      );

      // Assert - Empty state should be visible
      expect(screen.getByText(/no knowledge spaces found/i)).toBeInTheDocument();

      // Assert - Loading indicators should not be visible
      const skeletons = screen.queryAllByLabelText('Loading knowledge space');
      expect(skeletons.length).toBe(0);
    });

    it('should show empty state when loading=false and empty array', () => {
      // Arrange & Act
      render(
        <KnowledgeSpaceList
          knowledgeSpaces={[]}
          loading={false}
          error={undefined}
        />
      );

      // Assert - Empty state should be visible
      expect(screen.getByText(/no knowledge spaces found/i)).toBeInTheDocument();

      // Assert - Loading indicators should not be visible
      const skeletons = screen.queryAllByLabelText('Loading knowledge space');
      expect(skeletons.length).toBe(0);
    });

    it('should prioritize error over loading state', () => {
      fc.assert(
        fc.property(
          knowledgeSpacesArrayArbitrary,
          fc.string({ minLength: 1, maxLength: 100 }),
          (knowledgeSpaces, errorMessage) => {
            // Arrange & Act
            const { container } = render(
              <KnowledgeSpaceList
                knowledgeSpaces={knowledgeSpaces}
                loading={true}
                error={errorMessage}
              />
            );

            try {
              // Assert - Error should be shown instead of loading
              const errorElement = screen.getByRole('alert');
              expect(errorElement).toBeInTheDocument();

              // Assert - Loading indicator should not be visible when error is present
              const loadingContainer = container.querySelector('[role="status"][aria-label="Loading knowledge spaces"]');
              expect(loadingContainer).not.toBeInTheDocument();
            } finally {
              cleanup();
            }
          }
        )
      );
    });

    it('should render consistent number of skeleton cards during loading', () => {
      fc.assert(
        fc.property(knowledgeSpacesArrayArbitrary, (knowledgeSpaces) => {
          // Arrange & Act
          render(
            <KnowledgeSpaceList
              knowledgeSpaces={knowledgeSpaces}
              loading={true}
              error={undefined}
            />
          );

          try {
            // Assert - Should always show 6 skeleton cards
            const skeletons = screen.getAllByLabelText('Loading knowledge space');
            expect(skeletons.length).toBe(6);
          } finally {
            cleanup();
          }
        })
      );
    });

    it('should maintain accessibility attributes during loading', () => {
      fc.assert(
        fc.property(knowledgeSpacesArrayArbitrary, (knowledgeSpaces) => {
          // Arrange & Act
          const { container } = render(
            <KnowledgeSpaceList
              knowledgeSpaces={knowledgeSpaces}
              loading={true}
              error={undefined}
            />
          );

          try {
            // Assert - Loading container should have proper role and aria-label
            const loadingContainer = container.querySelector('[role="status"][aria-label="Loading knowledge spaces"]');
            expect(loadingContainer).toHaveAttribute('aria-label', 'Loading knowledge spaces');

            // Assert - Each skeleton should have proper accessibility
            const skeletons = screen.getAllByLabelText('Loading knowledge space');
            skeletons.forEach((skeleton) => {
              expect(skeleton).toHaveAttribute('aria-label', 'Loading knowledge space');
            });
          } finally {
            cleanup();
          }
        })
      );
    });

    it('should transition properly from loading to loaded state', () => {
      fc.assert(
        fc.property(
          fc
            .array(knowledgeSpaceArbitrary, { minLength: 1, maxLength: 5 })
            .map((arr) => {
              return arr.map((item, index) => ({
                ...item,
                id: `${item.id}-trans-${index}`,
              }));
            })
            .filter((arr) => arr.length > 0),
          (knowledgeSpaces) => {
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
              let loadingContainer = container.querySelector('[role="status"][aria-label="Loading knowledge spaces"]');
              expect(loadingContainer).toBeInTheDocument();

              // Act - Transition to loaded state
              rerender(
                <KnowledgeSpaceList
                  knowledgeSpaces={knowledgeSpaces}
                  loading={false}
                  error={undefined}
                />
              );

              // Assert - Loaded state
              loadingContainer = container.querySelector('[role="status"][aria-label="Loading knowledge spaces"]');
              expect(loadingContainer).not.toBeInTheDocument();

              // Assert - Data is now visible
              const listContainer = screen.getByRole('list', {
                name: /knowledge spaces/i,
              });
              expect(listContainer).toBeInTheDocument();

              knowledgeSpaces.forEach((space) => {
                // Use a text matcher function to handle HTML's space normalization
                expect(screen.getByText((content, element) => {
                  // Normalize spaces in both the content and our test name
                  const normalizedContent = content.replace(/\s+/g, ' ');
                  const normalizedName = space.name.replace(/\s+/g, ' ');
                  return normalizedContent === normalizedName;
                })).toBeInTheDocument();
              });
            } finally {
              cleanup();
            }
          }
        )
      );
    });
  });

  describe('Edge Cases and Boundary Conditions', () => {
    it('should handle loading state with various array sizes', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 0, max: 20 }),
          fc.boolean(),
          (arraySize, loading) => {
            const knowledgeSpaces: KnowledgeSpace[] = Array.from(
              { length: arraySize },
              (_, i) => ({
                id: `space-${i}`,
                name: `Space ${i}`,
                type: 'web' as const,
                lastUpdatedAt: new Date().toISOString(),
              })
            );

            const { container } = render(
              <KnowledgeSpaceList
                knowledgeSpaces={knowledgeSpaces}
                loading={loading}
                error={undefined}
              />
            );

            try {
              if (loading) {
                // Should show loading state regardless of array size
                const loadingContainer = container.querySelector('[role="status"][aria-label="Loading knowledge spaces"]');
                expect(loadingContainer).toBeInTheDocument();
              } else if (arraySize === 0) {
                // Should show empty state for zero items
                expect(screen.getByText(/no knowledge spaces found/i)).toBeInTheDocument();
              } else {
                // Should show list for non-zero items
                expect(
                  screen.getByRole('list', { name: /knowledge spaces/i })
                ).toBeInTheDocument();
              }
            } finally {
              cleanup();
            }
          }
        )
      );
    });
  });
});
