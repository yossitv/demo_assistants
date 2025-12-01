import { Embedding } from '../domain/value-objects/Embedding';
import { CreateKnowledgeSpaceUseCase } from './CreateKnowledgeSpaceUseCase';
import { IKnowledgeSpaceRepository } from '../domain/repositories/IKnowledgeSpaceRepository';
import { IVectorRepository } from '../domain/repositories/IVectorRepository';
import { ICrawlerService } from '../domain/services/ICrawlerService';
import { IChunkingService } from '../domain/services/IChunkingService';
import { IEmbeddingService } from '../domain/services/IEmbeddingService';
import { ILogger } from '../domain/services/ILogger';
import { KnowledgeSpace } from '../domain/entities/KnowledgeSpace';
import { Chunk } from '../domain/entities/Chunk';

describe('CreateKnowledgeSpaceUseCase', () => {
  const vector = new Array(1536).fill(0);
  let knowledgeSpaceRepo: jest.Mocked<IKnowledgeSpaceRepository>;
  let vectorRepo: jest.Mocked<IVectorRepository>;
  let crawlerService: jest.Mocked<ICrawlerService>;
  let chunkingService: jest.Mocked<IChunkingService>;
  let embeddingService: jest.Mocked<IEmbeddingService>;
  let logger: jest.Mocked<ILogger>;

  beforeEach(() => {
    knowledgeSpaceRepo = {
      save: jest.fn(),
      findByTenant: jest.fn(),
      findByTenantAndId: jest.fn()
    } as unknown as jest.Mocked<IKnowledgeSpaceRepository>;

    vectorRepo = {
      upsertChunks: jest.fn(),
      searchSimilar: jest.fn()
    } as unknown as jest.Mocked<IVectorRepository>;

    crawlerService = {
      crawlUrl: jest.fn()
    } as unknown as jest.Mocked<ICrawlerService>;

    chunkingService = {
      chunkText: jest.fn()
    } as unknown as jest.Mocked<IChunkingService>;

    embeddingService = {
      generateEmbedding: jest.fn(),
      generateEmbeddings: jest.fn()
    } as unknown as jest.Mocked<IEmbeddingService>;

    logger = {
      debug: jest.fn(),
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn()
    } as unknown as jest.Mocked<ILogger>;
  });

  it('creates knowledge space, chunks, and upserts vectors using injected services', async () => {
    const useCase = new CreateKnowledgeSpaceUseCase(
      knowledgeSpaceRepo,
      vectorRepo,
      crawlerService,
      chunkingService,
      embeddingService,
      logger
    );

    const crawlDate = new Date('2024-01-01T00:00:00.000Z');
    crawlerService.crawlUrl.mockResolvedValue({
      url: 'https://example.com',
      domain: 'example.com',
      title: 'Example',
      content: 'example content',
      crawlDate
    });

    chunkingService.chunkText.mockReturnValue(['part-1', 'part-2']);
    embeddingService.generateEmbedding.mockResolvedValue(new Embedding(vector));

    const result = await useCase.execute({
      tenantId: 'tenant-1',
      name: 'My KS',
      sourceUrls: ['https://example.com']
    });

    expect(result.status).toBe('completed');
    expect(result.knowledgeSpaceId).toMatch(/ks_/);

    const savedKs = (knowledgeSpaceRepo.save as jest.Mock).mock.calls[0][0] as KnowledgeSpace;
    expect(savedKs.tenantId).toBe('tenant-1');
    expect(savedKs.sourceUrls).toEqual(['https://example.com']);

    const upsertArgs = (vectorRepo.upsertChunks as jest.Mock).mock.calls[0];
    expect(upsertArgs[0].toString()).toContain(`t_${savedKs.tenantId}_ks_${savedKs.knowledgeSpaceId}`);

    const chunks = upsertArgs[1] as Chunk[];
    expect(chunks).toHaveLength(2);
    expect(embeddingService.generateEmbedding).toHaveBeenCalledTimes(2);
    expect(chunks[0].metadata.title).toBe('Example');
    expect(chunks[0].knowledgeSpaceId).toBe(savedKs.knowledgeSpaceId);
  });
});
