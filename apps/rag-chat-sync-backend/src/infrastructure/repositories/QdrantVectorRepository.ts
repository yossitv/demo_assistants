import { QdrantClient } from '@qdrant/js-client-rest';
import { IVectorRepository, SearchResult } from '../../domain/repositories/IVectorRepository';
import { Namespace } from '../../domain/value-objects/Namespace';
import { Chunk } from '../../domain/entities/Chunk';
import { Embedding } from '../../domain/value-objects/Embedding';
import { CircuitBreaker, retryWithBackoff } from '../../shared/retry';
import { ExternalServiceError } from '../../shared/errors';
import { ILogger } from '../../domain/services/ILogger';

export class QdrantVectorRepository implements IVectorRepository {
  private readonly circuitBreaker = new CircuitBreaker();

  constructor(
    private readonly qdrantClient: QdrantClient,
    private readonly logger: ILogger
  ) {}

  async upsertChunks(namespace: Namespace, chunks: Chunk[]): Promise<void> {
    const collectionName = namespace.toString();

    try {
      this.logger.debug('Upserting chunks to Qdrant', {
        collection: collectionName,
        chunkCount: chunks.length
      });

      await retryWithBackoff(async () => this.circuitBreaker.execute(async () => {
        await this.ensureCollection(collectionName);

        const points = chunks.map(chunk => ({
          id: chunk.id, // Chunk ID should already be a UUID
          vector: chunk.embedding.vector,
          payload: {
            chunkId: chunk.id, // Store original ID in payload for reference
            tenantId: chunk.tenantId,
            knowledgeSpaceId: chunk.knowledgeSpaceId,
            url: chunk.url,
            domain: chunk.domain,
            crawlDate: chunk.crawlDate.toISOString(),
            content: chunk.content,
            metadata: chunk.metadata
          }
        }));

        await this.qdrantClient.upsert(collectionName, {
          wait: true,
          points
        });
      }));

      this.logger.debug('Successfully upserted chunks to Qdrant', {
        collection: collectionName,
        chunkCount: chunks.length
      });
    } catch (error) {
      this.logger.error(
        'Failed to upsert chunks to Qdrant',
        error instanceof Error ? error : new Error(String(error)),
        {
          collection: collectionName,
          chunkCount: chunks.length
        }
      );

      if (error instanceof ExternalServiceError) {
        throw error;
      }
      throw new ExternalServiceError('Failed to upsert chunks to vector store', 503);
    }
  }

  async searchSimilar(namespace: Namespace, queryEmbedding: Embedding, topK: number): Promise<SearchResult[]> {
    const collectionName = namespace.toString();

    try {
      // Ensure collection exists for read paths as well to avoid NotFound errors on cold-started namespaces
      await this.ensureCollection(collectionName);

      this.logger.debug('Searching similar chunks in Qdrant', {
        collection: collectionName,
        topK,
        vectorDimension: queryEmbedding.vector.length
      });

      const results = await retryWithBackoff(async () => this.circuitBreaker.execute(() =>
        this.qdrantClient.search(collectionName, {
          vector: queryEmbedding.vector,
          limit: topK,
          with_payload: true,
          with_vector: true
        })
      ));

      this.logger.debug('Successfully retrieved similar chunks from Qdrant', {
        collection: collectionName,
        resultCount: results.length
      });

      return results.map(result => ({
        chunk: new Chunk(
          result.id as string,
          result.payload!.tenantId as string,
          result.payload!.knowledgeSpaceId as string,
          result.payload!.url as string,
          result.payload!.domain as string,
          result.payload!.content as string,
          new Embedding(result.vector as number[]),
          result.payload!.metadata as any,
          new Date(result.payload!.crawlDate as string)
        ),
        score: result.score
      }));
    } catch (error) {
      this.logger.error(
        'Failed to search similar chunks in Qdrant',
        error instanceof Error ? error : new Error(String(error)),
        {
          collection: collectionName,
          topK
        }
      );

      if (error instanceof ExternalServiceError) {
        throw error;
      }
      throw new ExternalServiceError('Failed to search similar chunks', 503);
    }
  }

  private async ensureCollection(collectionName: string): Promise<void> {
    try {
      await this.qdrantClient.getCollection(collectionName);
    } catch {
      this.logger.debug('Creating new Qdrant collection', {
        collection: collectionName,
        vectorSize: 1536,
        distance: 'Cosine'
      });

      await this.qdrantClient.createCollection(collectionName, {
        vectors: {
          size: 1536,
          distance: 'Cosine'
        }
      });

      this.logger.debug('Successfully created Qdrant collection', {
        collection: collectionName
      });
    }
  }
}
