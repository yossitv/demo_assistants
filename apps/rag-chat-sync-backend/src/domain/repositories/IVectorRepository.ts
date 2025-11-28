import { Chunk } from '../entities/Chunk';
import { Namespace } from '../value-objects/Namespace';
import { Embedding } from '../value-objects/Embedding';

/**
 * Result of a vector similarity search operation.
 * Contains the matched chunk and its similarity score.
 */
export interface SearchResult {
  /** The chunk that matched the search query */
  chunk: Chunk;
  /** Similarity score (typically cosine similarity, range 0-1) */
  score: number;
}

/**
 * Repository interface for vector database operations.
 * Defines the contract for storing and searching vector embeddings.
 */
export interface IVectorRepository {
  /**
   * Inserts or updates chunks in the vector database within a specific namespace.
   * Creates the collection if it doesn't exist.
   * @param namespace - The namespace (collection) to store chunks in
   * @param chunks - Array of Chunk entities with embeddings to upsert
   */
  upsertChunks(namespace: Namespace, chunks: Chunk[]): Promise<void>;

  /**
   * Performs similarity search to find chunks similar to the query embedding.
   * @param namespace - The namespace (collection) to search within
   * @param queryEmbedding - The embedding vector to search for
   * @param topK - Maximum number of results to return
   * @returns Array of search results sorted by similarity score (highest first)
   */
  searchSimilar(
    namespace: Namespace,
    queryEmbedding: Embedding,
    topK: number
  ): Promise<SearchResult[]>;
}
