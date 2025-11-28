import { Embedding } from '../value-objects/Embedding';
import { ChunkMetadata } from '../value-objects/ChunkMetadata';
export declare class Chunk {
    readonly id: string;
    readonly tenantId: string;
    readonly knowledgeSpaceId: string;
    readonly url: string;
    readonly domain: string;
    readonly content: string;
    readonly embedding: Embedding;
    readonly metadata: ChunkMetadata;
    readonly crawlDate: Date;
    constructor(id: string, tenantId: string, knowledgeSpaceId: string, url: string, domain: string, content: string, embedding: Embedding, metadata: ChunkMetadata, crawlDate: Date);
    private validate;
}
//# sourceMappingURL=Chunk.d.ts.map