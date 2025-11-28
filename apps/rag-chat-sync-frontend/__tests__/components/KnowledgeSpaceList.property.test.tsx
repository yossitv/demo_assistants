/**
 * @jest-environment jsdom
 *
 * Property-based tests for KnowledgeSpaceList error handling
 * Property 13.2: error state overrides loading and data displays
 */

import '@testing-library/jest-dom';
import React from 'react';
import * as fc from 'fast-check';
import { render, screen, cleanup } from '@testing-library/react';
import KnowledgeSpaceList from '@/components/KnowledgeSpaceList';
import { KnowledgeSpace } from '@/types';

describe('KnowledgeSpaceList Property Tests (13.2)', () => {
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

  it('Property 13.2: always renders the error state when error is provided', () => {
    fc.assert(
      fc.property(
        fc
          .string({ minLength: 3, maxLength: 200 })
          .filter((value) => value.trim().length > 0),
        fc.boolean(),
        fc.array(knowledgeSpaceArbitrary, { minLength: 0, maxLength: 4 }).map((spaces) =>
          spaces.map((space, index) => ({
            ...space,
            id: `${space.id}-${index}`,
          })) as KnowledgeSpace[]
        ),
        (errorMessage, loading, knowledgeSpaces) => {
          const { container } = render(
            <KnowledgeSpaceList
              knowledgeSpaces={knowledgeSpaces}
              loading={loading}
              error={errorMessage}
            />
          );

          try {
            const alert = screen.getByRole('alert');
            expect(alert).toBeInTheDocument();
            expect(
              screen.getByText((content) => content.trim() === errorMessage.trim())
            ).toBeInTheDocument();

            const loadingContainer = container.querySelector(
              '[role="status"][aria-label="Loading knowledge spaces"]'
            );
            expect(loadingContainer).toBeNull();
            expect(screen.queryByRole('list', { name: /knowledge spaces/i })).toBeNull();
          } finally {
            cleanup();
          }
        }
      )
    );
  });
});
