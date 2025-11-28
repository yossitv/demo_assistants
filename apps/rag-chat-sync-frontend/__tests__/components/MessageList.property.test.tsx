/**
 * @jest-environment jsdom
 *
 * Property-based tests for MessageList rendering
 * Properties 7.1–7.2: markdown rendering and cited URL display
 */

import '@testing-library/jest-dom';
import React from 'react';
import * as fc from 'fast-check';
import { render, screen, cleanup } from '@testing-library/react';
import MessageList from '@/components/MessageList';
import { Message } from '@/lib/api/types';

jest.mock('react-markdown', () => {
  return function MockReactMarkdown({ children }: { children: React.ReactNode }) {
    return <div>{children}</div>;
  };
});

jest.setTimeout(15000);

const alphaNumericChars = [
  'a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'k', 'l', 'm', 'n', 'o', 'p', 'q', 'r', 's', 't', 'u', 'v', 'w', 'x', 'y', 'z',
  '0', '1', '2', '3', '4', '5', '6', '7', '8', '9',
];

const safeText = fc
  .array(fc.constantFrom(...alphaNumericChars), { minLength: 3, maxLength: 30 })
  .map((chars) => chars.join(''));

describe('MessageList Property Tests (7.1–7.2)', () => {
  afterEach(() => {
    cleanup();
  });

  it('Property 7.1: assistant messages render markdown content', async () => {
    await fc.assert(
      fc.asyncProperty(
        safeText,
        async (text) => {
          const markdownContent = `**${text}** with _details_`;
          const messages: Message[] = [
            {
              id: 'assistant-1',
              role: 'assistant',
              content: markdownContent,
              createdAt: new Date().toISOString(),
            },
          ];

          try {
            render(<MessageList messages={messages} />);

            const responseRegion = screen.getByLabelText('Assistant response');
            const normalizedContent = responseRegion.textContent?.replace(/\*/g, '').replace(/_/g, '').trim();
            expect(normalizedContent).toContain(text);
          } finally {
            cleanup();
          }
        }
      ),
      { numRuns: 20 }
    );
  });

  it('Property 7.2: cited URLs render as external links', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(
          fc
            .array(fc.constantFrom(...alphaNumericChars, '-', '_'), { minLength: 3, maxLength: 40 })
            .map((slug) => `https://example.com/${slug.join('')}`),
          { minLength: 1, maxLength: 5 }
        ),
        async (urls) => {
          const messages: Message[] = [
            {
              id: 'assistant-cited',
              role: 'assistant',
              content: 'Here are your references',
              cited_urls: urls,
              createdAt: new Date().toISOString(),
            },
          ];

          try {
            render(<MessageList messages={messages} />);

            urls.forEach((url) => {
              const link = screen.getByLabelText(`Open source: ${url}`) as HTMLAnchorElement;
              expect(link).toBeInTheDocument();
              expect(link.href).toBe(url);
              expect(link.target).toBe('_blank');
              expect(link.rel).toContain('noopener');
              expect(link.rel).toContain('noreferrer');
            });
          } finally {
            cleanup();
          }
        }
      ),
      { numRuns: 20 }
    );
  });
});
