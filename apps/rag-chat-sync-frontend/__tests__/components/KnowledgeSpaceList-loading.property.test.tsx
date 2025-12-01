/**
 * @jest-environment jsdom
 *
 * Property-based tests for KnowledgeSpaceList loading indicator
 * Feature: web-mvp, Property 15: Agent list loading indicator
 * Validates: Requirements 4.3
 */

import '@testing-library/jest-dom';
import React from 'react';
import * as fc from 'fast-check';
import { render, screen, cleanup } from '@testing-library/react';
import KnowledgeSpaceList from '@/components/KnowledgeSpaceList';
import { KnowledgeSpace } from '@/types';

describe('KnowledgeSpaceList Property Tests (13.1)', () => {
  const knowledgeSpaceArbitrary = fc.record({
    id: fc.uuid(),
    name: fc
      .string({ minLength: 2, maxLength: 60 })
      .filter((value) => value.trim().length > 0),
    type: fc.constant('web' as const),
    lastUpdatedAt: fc.date(),
  });

  afterEach(() => {
    cleanup();
  });

  /**
   * Feature: web-mvp, Property 15: Agent list loading indicator
   * 
   * For any agent list fetch operation, the system should display a loading 
   * indicator while the request is in progress.
   * 
   * This property verifies that:
   * 1. When loading=true, a loading indicator is always displayed
   * 2. When loading=false, no loading indicator is displayed
   * 3. The loading state takes precedence over data display
   */
  it('Property 15: displays loading indicator during agent list fetch operation', () => {
    fc.assert(
      fc.property(
        fc.boolean(), // loading state
        fc.array(knowledgeSpaceArbitrary, { minLength: 0, maxLength: 10 }).map((spaces) =>
          spaces.map((space, index) => ({
            ...space,
            id: `${space.id}-${index}`,
          })) as KnowledgeSpace[]
        ),
        (loading, knowledgeSpaces) => {
          const { container } = render(
            <KnowledgeSpaceList
              knowledgeSpaces={knowledgeSpaces}
              loading={loading}
              error={undefined}
            />
          );

          try {
            const loadingContainer = container.querySelector(
              '[role="status"][aria-label="Loading knowledge spaces"]'
            );

            if (loading) {
              // When loading=true, loading indicator must be present
              expect(loadingContainer).toBeInTheDocument();
              expect(loadingContainer).toHaveAttribute('aria-busy', 'true');

              // Loading skeleton cards should be visible
              const skeletons = screen.getAllByLabelText('Loading knowledge space');
              expect(skeletons.length).toBe(6);

              // Knowledge space data should NOT be displayed during loading
              const listContainer = screen.queryByRole('list', {
                name: /knowledge spaces/i,
              });
              expect(listContainer).not.toBeInTheDocument();
            } else {
              // When loading=false, loading indicator must NOT be present
              expect(loadingContainer).not.toBeInTheDocument();

              // Loading skeleton cards should NOT be visible
              const skeletons = screen.queryAllByLabelText('Loading knowledge space');
              expect(skeletons.length).toBe(0);
            }
          } finally {
            cleanup();
          }
        }
      ),
      { numRuns: 100 }
    );
  });
});
