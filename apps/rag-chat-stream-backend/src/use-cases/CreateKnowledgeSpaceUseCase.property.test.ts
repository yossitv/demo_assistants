import * as fc from 'fast-check';
import { CreateKnowledgeSpaceUseCase } from './CreateKnowledgeSpaceUseCase';
import { IKnowledgeSpaceRepository } from '../domain/repositories/IKnowledgeSpaceRepository';
import { IVectorRepository } from '../domain/repositories/IVectorRepository';
import { ICrawlerService, CrawledContent } from '../domain/services/ICrawlerService';
import { IChunkingService } from '../domain/services/IChunkingService';
import { IEmbeddingService } from '../domain/services/IEmbeddingService';
import { ILogger } from '../domain/services/ILogger';
import { Embedding } from '../domain/value-objects/Embedding';
import { KnowledgeSpace } from '../domain/entities/KnowledgeSpace';
import { Chunk } from '../domain/entities/Chunk';
import { Namespace } from '../domain/value-objects/Namespace';

/**
 * Feature: rag-chat-backend-mvp, Property 1: KnowledgeSpace creation produces searchable chunks
 * Validates: Requirements 1.1, 1.3, 1.4, 1.5, 1.6
 * 
 * For any valid URL and tenant, when a KnowledgeSpace is created, then searching 
 * the corresponding vector collection should return chunks with content from that URL.
 */
describe('Property 1: KnowledgeSpace creation produces searchable chunks', () => {
  const numRuns = 100;

  // Helper to create a mock embedding
  const createMockEmbedding = (): Embedding => {
    const vector = new Array(1536).fill(0).map(() => Math.random());
    return new Embedding(vector);
  };

  // Helper to create mock repositories and services
  const createMockServices = () => {
    const savedKnowledgeSpaces: KnowledgeSpace[] = [];
    const upsertedChunks: Map<string, Chunk[]> = new Map();

    const knowledgeSpaceRepo: IKnowledgeSpaceRepository = {
      save: jest.fn(async (ks: KnowledgeSpace) => {
        savedKnowledgeSpaces.push(ks);
      }),
      findByTenant: jest.fn(),
      findByTenantAndId: jest.fn(),
      delete: jest.fn(async (tenantId: string, ksId: string) => {
        const index = savedKnowledgeSpaces.findIndex(
          ks => ks.tenantId === tenantId && ks.knowledgeSpaceId === ksId
        );
        if (index !== -1) {
          savedKnowledgeSpaces.splice(index, 1);
        }
      })
    };

    const vectorRepo: IVectorRepository = {
      upsertChunks: jest.fn(async (namespace: Namespace, chunks: Chunk[]) => {
        upsertedChunks.set(namespace.toString(), chunks);
      }),
      searchSimilar: jest.fn(async (namespace: Namespace, _queryEmbedding: Embedding, topK: number) => {
        const chunks = upsertedChunks.get(namespace.toString()) || [];
        // Return chunks with mock scores
        return chunks.slice(0, topK).map(chunk => ({
          chunk,
          score: 0.9
        }));
      }),
      deleteCollection: jest.fn(async (collectionName: string) => {
        upsertedChunks.delete(collectionName);
      })
    };

    const crawlerService: ICrawlerService = {
      crawlUrl: jest.fn()
    };

    const chunkingService: IChunkingService = {
      chunkText: jest.fn()
    };

    const embeddingService: IEmbeddingService = {
      generateEmbedding: jest.fn(async () => createMockEmbedding()),
      generateEmbeddings: jest.fn()
    };

    const logger: ILogger = {
      debug: jest.fn(),
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn()
    };

    return {
      knowledgeSpaceRepo,
      vectorRepo,
      crawlerService,
      chunkingService,
      embeddingService,
      logger,
      savedKnowledgeSpaces,
      upsertedChunks
    };
  };

  it('should create chunks that are searchable in the vector repository', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate random tenant ID
        fc.string({ minLength: 5, maxLength: 20 }).filter(s => s.trim().length > 0),
        // Generate random knowledge space name
        fc.string({ minLength: 3, maxLength: 50 }).filter(s => s.trim().length > 0),
        // Generate random URL
        fc.webUrl(),
        // Generate random content
        fc.string({ minLength: 100, maxLength: 1000 }).filter(s => s.trim().length > 0),
        async (tenantId, name, url, content) => {
          const mocks = createMockServices();
          const useCase = new CreateKnowledgeSpaceUseCase(
            mocks.knowledgeSpaceRepo,
            mocks.vectorRepo,
            mocks.crawlerService,
            mocks.chunkingService,
            mocks.embeddingService,
            mocks.logger
          );

          // Setup crawler to return the generated content
          const crawlDate = new Date();
          const domain = new URL(url).hostname;
          (mocks.crawlerService.crawlUrl as jest.Mock).mockResolvedValue({
            url,
            domain,
            title: 'Test Title',
            content,
            crawlDate
          } as CrawledContent);

          // Setup chunking to split content into 2-3 chunks
          const chunkCount = Math.floor(Math.random() * 2) + 2; // 2 or 3 chunks
          const chunkSize = Math.floor(content.length / chunkCount);
          const chunks = Array.from({ length: chunkCount }, (_, i) => 
            content.substring(i * chunkSize, (i + 1) * chunkSize)
          );
          (mocks.chunkingService.chunkText as jest.Mock).mockReturnValue(chunks);

          // Execute the use case
          const result = await useCase.execute({
            tenantId,
            name,
            sourceUrls: [url]
          });

          // Verify KnowledgeSpace was created
          expect(result.status).toBe('completed');
          expect(result.knowledgeSpaceId).toBeTruthy();
          expect(mocks.savedKnowledgeSpaces).toHaveLength(1);

          const savedKs = mocks.savedKnowledgeSpaces[0];
          expect(savedKs.tenantId).toBe(tenantId);
          expect(savedKs.name).toBe(name);
          expect(savedKs.sourceUrls).toContain(url);

          // Verify chunks were upserted to vector repository
          const namespace = savedKs.getNamespace();
          const upsertedChunks = mocks.upsertedChunks.get(namespace.toString());
          expect(upsertedChunks).toBeDefined();
          expect(upsertedChunks!.length).toBe(chunkCount);

          // Verify all chunks have the correct metadata
          for (const chunk of upsertedChunks!) {
            expect(chunk.tenantId).toBe(tenantId);
            expect(chunk.knowledgeSpaceId).toBe(savedKs.knowledgeSpaceId);
            expect(chunk.url).toBe(url);
            expect(chunk.domain).toBe(domain);
            expect(chunk.embedding.isValid()).toBe(true);
            expect(chunk.content).toBeTruthy();
          }

          // Property: Verify chunks are searchable
          const queryEmbedding = createMockEmbedding();
          const searchResults = await mocks.vectorRepo.searchSimilar(
            namespace,
            queryEmbedding,
            10
          );

          // All upserted chunks should be searchable
          expect(searchResults.length).toBe(chunkCount);
          
          // All search results should contain content from the original URL
          for (const result of searchResults) {
            expect(result.chunk.url).toBe(url);
            expect(result.chunk.tenantId).toBe(tenantId);
            expect(result.chunk.knowledgeSpaceId).toBe(savedKs.knowledgeSpaceId);
          }

          return true;
        }
      ),
      { numRuns }
    );
  });

  it('should create chunks with valid embeddings for all content', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 5, maxLength: 20 }).filter(s => s.trim().length > 0),
        fc.string({ minLength: 3, maxLength: 50 }).filter(s => s.trim().length > 0),
        fc.webUrl(),
        fc.string({ minLength: 100, maxLength: 1000 }).filter(s => s.trim().length > 0),
        async (tenantId, name, url, content) => {
          const mocks = createMockServices();
          const useCase = new CreateKnowledgeSpaceUseCase(
            mocks.knowledgeSpaceRepo,
            mocks.vectorRepo,
            mocks.crawlerService,
            mocks.chunkingService,
            mocks.embeddingService,
            mocks.logger
          );

          const crawlDate = new Date();
          const domain = new URL(url).hostname;
          (mocks.crawlerService.crawlUrl as jest.Mock).mockResolvedValue({
            url,
            domain,
            title: 'Test Title',
            content,
            crawlDate
          } as CrawledContent);

          const chunks = [content.substring(0, content.length / 2), content.substring(content.length / 2)];
          (mocks.chunkingService.chunkText as jest.Mock).mockReturnValue(chunks);

          await useCase.execute({
            tenantId,
            name,
            sourceUrls: [url]
          });

          // Verify embeddings were generated for each chunk
          expect(mocks.embeddingService.generateEmbedding).toHaveBeenCalledTimes(chunks.length);

          // Verify all upserted chunks have valid embeddings
          const savedKs = mocks.savedKnowledgeSpaces[0];
          const namespace = savedKs.getNamespace();
          const upsertedChunks = mocks.upsertedChunks.get(namespace.toString());

          for (const chunk of upsertedChunks!) {
            expect(chunk.embedding.isValid()).toBe(true);
            expect(chunk.embedding.vector.length).toBe(1536);
          }

          return true;
        }
      ),
      { numRuns }
    );
  });

  it('should handle multiple URLs and create searchable chunks for each', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 5, maxLength: 20 }).filter(s => s.trim().length > 0),
        fc.string({ minLength: 3, maxLength: 50 }).filter(s => s.trim().length > 0),
        fc.array(fc.webUrl(), { minLength: 2, maxLength: 3 }),
        async (tenantId, name, urls) => {
          const mocks = createMockServices();
          const useCase = new CreateKnowledgeSpaceUseCase(
            mocks.knowledgeSpaceRepo,
            mocks.vectorRepo,
            mocks.crawlerService,
            mocks.chunkingService,
            mocks.embeddingService,
            mocks.logger
          );

          // Setup crawler for each URL
          const urlContents = new Map<string, string>();
          for (const url of urls) {
            const content = `Content for ${url} - ${Math.random()}`;
            urlContents.set(url, content);
            
            (mocks.crawlerService.crawlUrl as jest.Mock).mockImplementation(async (crawlUrl: string) => {
              const domain = new URL(crawlUrl).hostname;
              return {
                url: crawlUrl,
                domain,
                title: `Title for ${crawlUrl}`,
                content: urlContents.get(crawlUrl),
                crawlDate: new Date()
              } as CrawledContent;
            });
          }

          // Setup chunking to return 2 chunks per URL
          (mocks.chunkingService.chunkText as jest.Mock).mockImplementation((content: string) => {
            return [content.substring(0, content.length / 2), content.substring(content.length / 2)];
          });

          await useCase.execute({
            tenantId,
            name,
            sourceUrls: urls
          });

          // Verify chunks from all URLs are searchable
          const savedKs = mocks.savedKnowledgeSpaces[0];
          const namespace = savedKs.getNamespace();
          const upsertedChunks = mocks.upsertedChunks.get(namespace.toString());

          // Should have 2 chunks per URL
          expect(upsertedChunks!.length).toBe(urls.length * 2);

          // Verify each URL has chunks in the vector store
          for (const url of urls) {
            const chunksForUrl = upsertedChunks!.filter(chunk => chunk.url === url);
            expect(chunksForUrl.length).toBe(2);
            
            // All chunks for this URL should be searchable
            for (const chunk of chunksForUrl) {
              expect(chunk.tenantId).toBe(tenantId);
              expect(chunk.knowledgeSpaceId).toBe(savedKs.knowledgeSpaceId);
            }
          }

          return true;
        }
      ),
      { numRuns }
    );
  });

  it('should create chunks with correct namespace format', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 5, maxLength: 20 }).filter(s => s.trim().length > 0),
        fc.string({ minLength: 3, maxLength: 50 }).filter(s => s.trim().length > 0),
        fc.webUrl(),
        fc.string({ minLength: 100, maxLength: 500 }).filter(s => s.trim().length > 0),
        async (tenantId, name, url, content) => {
          const mocks = createMockServices();
          const useCase = new CreateKnowledgeSpaceUseCase(
            mocks.knowledgeSpaceRepo,
            mocks.vectorRepo,
            mocks.crawlerService,
            mocks.chunkingService,
            mocks.embeddingService,
            mocks.logger
          );

          const domain = new URL(url).hostname;
          (mocks.crawlerService.crawlUrl as jest.Mock).mockResolvedValue({
            url,
            domain,
            title: 'Test',
            content,
            crawlDate: new Date()
          } as CrawledContent);

          (mocks.chunkingService.chunkText as jest.Mock).mockReturnValue([content]);

          await useCase.execute({
            tenantId,
            name,
            sourceUrls: [url]
          });

          // Verify namespace format
          const savedKs = mocks.savedKnowledgeSpaces[0];
          const namespace = savedKs.getNamespace();
          const namespaceStr = namespace.toString();

          // Namespace should follow format: t_{tenantId}_ks_{knowledgeSpaceId}_{version}
          expect(namespaceStr).toMatch(/^t_.+_ks_.+_\d{4}-\d{2}-\d{2}$/);
          expect(namespaceStr).toContain(`t_${tenantId}_ks_${savedKs.knowledgeSpaceId}`);

          // Verify chunks were upserted with this namespace
          expect(mocks.upsertedChunks.has(namespaceStr)).toBe(true);

          return true;
        }
      ),
      { numRuns }
    );
  });
});
