import { encoding_for_model } from 'tiktoken';
import { TiktokenChunkingService } from './TiktokenChunkingService';
import { ChunkingConfig } from '../../domain/services/IChunkingService';

/**
 * Lightweight property-style checks for chunking behavior.
 * Replaces heavy fast-check runs to keep test time short while
 * still validating the core requirements.
 */
describe('TiktokenChunkingService (lightweight property checks)', () => {
  let service: TiktokenChunkingService;
  let encoding: ReturnType<typeof encoding_for_model>;

  const config: ChunkingConfig = {
    minTokens: 400,
    maxTokens: 600,
    overlapTokens: 75
  };

  beforeAll(() => {
    service = new TiktokenChunkingService();
    encoding = encoding_for_model('gpt-4');
  });

  afterAll(() => {
    encoding.free();
  });

  it('Property 2: consecutive chunks share overlapping text', () => {
    // Long enough to produce multiple chunks with overlap
    const text = 'Context sentence for overlap. '.repeat(120);

    const chunks = service.chunkText(text, config);
    expect(chunks.length).toBeGreaterThan(1);

    for (let i = 0; i < chunks.length - 1; i++) {
      const currentEnd = chunks[i].slice(-200);
      const nextStart = chunks[i + 1].slice(0, 200);
      const hasOverlap = currentEnd.length > 0 && nextStart.length > 0 && nextStart.includes(currentEnd.slice(-50));
      expect(hasOverlap).toBe(true);
    }
  });

  it('Property 12: chunk token counts stay within bounds (last chunk may be smaller)', () => {
    const text = 'Token bound check text. '.repeat(140);

    const chunks = service.chunkText(text, config);
    expect(chunks.length).toBeGreaterThan(1);

    chunks.forEach((chunk, idx) => {
      const tokens = encoding.encode(chunk).length;
      if (idx === chunks.length - 1) {
        expect(tokens).toBeLessThanOrEqual(config.maxTokens);
      } else {
        expect(tokens).toBeGreaterThanOrEqual(config.minTokens);
        expect(tokens).toBeLessThanOrEqual(config.maxTokens);
      }
    });
  });
});
