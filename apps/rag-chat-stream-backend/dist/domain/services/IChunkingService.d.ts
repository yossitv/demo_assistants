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
//# sourceMappingURL=IChunkingService.d.ts.map