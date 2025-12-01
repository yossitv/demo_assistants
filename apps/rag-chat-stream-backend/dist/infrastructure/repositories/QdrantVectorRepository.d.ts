import { QdrantClient } from '@qdrant/js-client-rest';
import { IVectorRepository, SearchResult } from '../../domain/repositories/IVectorRepository';
import { Namespace } from '../../domain/value-objects/Namespace';
import { Chunk } from '../../domain/entities/Chunk';
import { Embedding } from '../../domain/value-objects/Embedding';
import { ILogger } from '../../domain/services/ILogger';
export declare class QdrantVectorRepository implements IVectorRepository {
    private readonly qdrantClient;
    private readonly logger;
    private readonly circuitBreaker;
    constructor(qdrantClient: QdrantClient, logger: ILogger);
    upsertChunks(namespace: Namespace, chunks: Chunk[]): Promise<void>;
    searchSimilar(namespace: Namespace, queryEmbedding: Embedding, topK: number): Promise<SearchResult[]>;
    private ensureCollection;
    deleteCollection(collectionName: string): Promise<void>;
}
//# sourceMappingURL=QdrantVectorRepository.d.ts.map