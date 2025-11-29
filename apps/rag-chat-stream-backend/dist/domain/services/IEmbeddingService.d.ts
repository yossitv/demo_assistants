import { Embedding } from '../value-objects/Embedding';
export interface IEmbeddingService {
    /**
     * Generates an embedding vector for a single text
     * @param text - The text to embed
     * @returns Promise resolving to an Embedding value object
     */
    generateEmbedding(text: string): Promise<Embedding>;
    /**
     * Generates embedding vectors for multiple texts in batch
     * @param texts - Array of texts to embed
     * @returns Promise resolving to array of Embedding value objects
     */
    generateEmbeddings(texts: string[]): Promise<Embedding[]>;
}
//# sourceMappingURL=IEmbeddingService.d.ts.map