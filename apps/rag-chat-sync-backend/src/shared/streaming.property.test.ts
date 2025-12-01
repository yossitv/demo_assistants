import * as fc from 'fast-check';
import {
  STREAM_CHUNK_SIZE,
  MIN_STREAM_CHUNK_SIZE,
  MAX_STREAM_CHUNK_SIZE,
  buildSSEHeaders,
  SSE_HEADERS,
  resolveStreamChunkSize,
  formatSSEData,
  DONE_SSE_EVENT
} from './streaming';

const numRuns = 100;

/**
 * Feature: streaming-config, Property 1: SSE headers include required values
 * Validates: Requirements 5.5, 5.6, 5.7
 */
describe('SSE header configuration', () => {
  it('always includes required SSE headers regardless of additional headers', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.dictionary(
          fc.string({ minLength: 1, maxLength: 12 }),
          fc.string({ maxLength: 60 })
        ),
        async (additional) => {
          const headers = buildSSEHeaders(additional);
          return headers['Content-Type'] === SSE_HEADERS['Content-Type'] &&
            headers['Cache-Control'] === SSE_HEADERS['Cache-Control'] &&
            headers['Connection'] === SSE_HEADERS['Connection'];
        }
      ),
      { numRuns }
    );
  });
});

/**
 * Feature: streaming-config, Property 2: Chunk size uses configured bounds
 * Validates: Requirements 4.5
 */
describe('Stream chunk size configuration', () => {
  it('resolves chunk size within allowed bounds for any input', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.oneof(
          fc.integer({ min: MIN_STREAM_CHUNK_SIZE - 200, max: MAX_STREAM_CHUNK_SIZE + 200 }),
          fc.double({ noNaN: true }),
          fc.string(),
          fc.constant(null),
          fc.constant(undefined)
        ),
        async (value) => {
          const resolved = resolveStreamChunkSize(value as any);
          return resolved >= MIN_STREAM_CHUNK_SIZE && resolved <= MAX_STREAM_CHUNK_SIZE;
        }
      ),
      { numRuns }
    );

    expect(STREAM_CHUNK_SIZE).toBeGreaterThanOrEqual(MIN_STREAM_CHUNK_SIZE);
    expect(STREAM_CHUNK_SIZE).toBeLessThanOrEqual(MAX_STREAM_CHUNK_SIZE);
  });
});

describe('SSE formatting utilities', () => {
  it('formats payloads as SSE data events', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.oneof(
          fc.string(),
          fc.integer(),
          fc.boolean(),
          fc.array(fc.string({ maxLength: 10 }), { maxLength: 3 }),
          fc.record({ text: fc.string({ maxLength: 15 }) }, { withDeletedKeys: true })
        ),
        async (payload) => {
          const formatted = formatSSEData(payload);
          return formatted.startsWith('data: ') && formatted.endsWith('\n\n');
        }
      ),
      { numRuns }
    );
  });

  it('provides a fixed DONE event marker', () => {
    expect(DONE_SSE_EVENT).toBe('data: [DONE]\n\n');
  });
});
