// Interface for text chunking service
// Requirements: 1.4 - Split content into chunks of 400-600 tokens with 50-100 tokens overlap

export interface ChunkingConfig {
  minTokens: number;
  maxTokens: number;
  overlapTokens: number;
}

export interface IChunkingService {
  /**
   * Splits text into chunks based on token count
   * @param text - The text to chunk
   * @param config - Configuration for chunk size and overlap
   * @returns Array of text chunks
   */
  chunkText(text: string, config: ChunkingConfig): string[];
}
