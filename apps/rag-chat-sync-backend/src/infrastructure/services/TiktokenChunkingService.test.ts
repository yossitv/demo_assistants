import { TiktokenChunkingService } from './TiktokenChunkingService';
import { ChunkingConfig } from '../../domain/services/IChunkingService';

describe('TiktokenChunkingService', () => {
  let service: TiktokenChunkingService;

  beforeAll(() => {
    service = new TiktokenChunkingService();
  });

  it('should chunk text into multiple pieces', () => {
    const text = 'This is a test. '.repeat(200); // Create a long text
    const config: ChunkingConfig = {
      minTokens: 400,
      maxTokens: 600,
      overlapTokens: 75
    };

    const chunks = service.chunkText(text, config);

    expect(chunks.length).toBeGreaterThan(0);
    expect(chunks[0]).toBeTruthy();
  });

  it('should handle short text', () => {
    const text = 'Short text';
    const config: ChunkingConfig = {
      minTokens: 400,
      maxTokens: 600,
      overlapTokens: 75
    };

    const chunks = service.chunkText(text, config);

    expect(chunks.length).toBeGreaterThanOrEqual(1);
    expect(chunks[0]).toContain('Short text');
  });

  it('should handle empty text', () => {
    const text = '';
    const config: ChunkingConfig = {
      minTokens: 400,
      maxTokens: 600,
      overlapTokens: 75
    };

    const chunks = service.chunkText(text, config);

    expect(chunks.length).toBe(1);
    expect(chunks[0]).toBe('');
  });
});
