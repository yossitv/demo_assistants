import { Embedding } from '../value-objects/Embedding';
import { ChunkMetadata } from '../value-objects/ChunkMetadata';

export class Chunk {
  constructor(
    public readonly id: string,
    public readonly tenantId: string,
    public readonly knowledgeSpaceId: string,
    public readonly url: string,
    public readonly domain: string,
    public readonly content: string,
    public readonly embedding: Embedding,
    public readonly metadata: ChunkMetadata,
    public readonly crawlDate: Date
  ) {
    this.validate();
  }

  private validate(): void {
    if (this.content.length === 0) {
      throw new Error('Chunk content cannot be empty');
    }
    if (!this.embedding.isValid()) {
      throw new Error('Chunk must have valid embedding');
    }
  }
}
