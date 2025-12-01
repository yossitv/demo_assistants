import * as fc from 'fast-check';
import { Agent } from '../domain/entities/Agent';
import { KnowledgeSpace } from '../domain/entities/KnowledgeSpace';
import { Chunk } from '../domain/entities/Chunk';
import { Embedding } from '../domain/value-objects/Embedding';
import { ChatWithAgentUseCase, ChatWithAgentInput } from './ChatWithAgentUseCase';
import { IAgentRepository } from '../domain/repositories/IAgentRepository';
import { IKnowledgeSpaceRepository } from '../domain/repositories/IKnowledgeSpaceRepository';
import { IConversationRepository } from '../domain/repositories/IConversationRepository';
import { IVectorRepository } from '../domain/repositories/IVectorRepository';
import { IEmbeddingService } from '../domain/services/IEmbeddingService';
import { ILLMService } from '../domain/services/ILLMService';
import { ILogger } from '../domain/services/ILogger';

/**
 * Feature: rag-chat-backend-mvp, Property 6: Cited URLs are subset of context
 * Feature: rag-chat-backend-mvp, Property 7: Cited URLs deduplication
 * Validates: Requirements 4.15
 * 
 * Property 6: For any chat response with cited_urls, all URLs in cited_urls 
 * should appear in the chunks that were used as RAG context.
 * 
 * Property 7: For any chat response, cited_urls should contain no duplicate 
 * URLs and should contain at most 3 URLs.
 */
describe('Properties 6 & 7: Cited URLs validation', () => {
  const numRuns = 100;

  // Helper to create a mock embedding
  const createMockEmbedding = (): Embedding => {
    const vector = new Array(1536).fill(0).map(() => Math.random());
    return new Embedding(vector);
  };

  // Helper to create mock repositories and services
  const createMockServices = () => {
    const agentRepo: jest.Mocked<IAgentRepository> = {
      save: jest.fn(),
      findByTenantAndId: jest.fn()
    } as unknown as jest.Mocked<IAgentRepository>;

    const knowledgeSpaceRepo: jest.Mocked<IKnowledgeSpaceRepository> = {
      save: jest.fn(),
      findByTenant: jest.fn(),
      findByTenantAndId: jest.fn()
    } as unknown as jest.Mocked<IKnowledgeSpaceRepository>;

    const conversationRepo: jest.Mocked<IConversationRepository> = {
      save: jest.fn()
    } as unknown as jest.Mocked<IConversationRepository>;

    const vectorRepo: jest.Mocked<IVectorRepository> = {
      upsertChunks: jest.fn(),
      searchSimilar: jest.fn()
    } as unknown as jest.Mocked<IVectorRepository>;

    const embeddingService: jest.Mocked<IEmbeddingService> = {
      generateEmbedding: jest.fn(),
      generateEmbeddings: jest.fn()
    } as unknown as jest.Mocked<IEmbeddingService>;

    const llmService: jest.Mocked<ILLMService> = {
      generateCompletion: jest.fn()
    } as unknown as jest.Mocked<ILLMService>;

    const logger: jest.Mocked<ILogger> = {
      debug: jest.fn(),
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn()
    } as unknown as jest.Mocked<ILogger>;

    return {
      agentRepo,
      knowledgeSpaceRepo,
      conversationRepo,
      vectorRepo,
      embeddingService,
      llmService,
      logger
    };
  };

  describe('Property 6: Cited URLs are subset of context', () => {
    it('should only cite URLs that appear in context chunks', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 5, maxLength: 20 }).filter(s => s.trim().length > 0),
          fc.string({ minLength: 5, maxLength: 20 }).filter(s => s.trim().length > 0),
          fc.string({ minLength: 5, maxLength: 20 }).filter(s => s.trim().length > 0),
          fc.string({ minLength: 3, maxLength: 50 }).filter(s => s.trim().length > 0),
          fc.array(
            fc.string({ minLength: 5, maxLength: 20 }).filter(s => s.trim().length > 0),
            { minLength: 1, maxLength: 3 }
          ),
          fc.string({ minLength: 5, maxLength: 200 }).filter(s => s.trim().length > 0),
          // Generate 1-10 chunks with URLs
          fc.array(
            fc.record({
              url: fc.webUrl(),
              content: fc.string({ minLength: 10, maxLength: 200 }),
              score: fc.float({ min: Math.fround(0.35), max: Math.fround(1.0) })
            }),
            { minLength: 1, maxLength: 10 }
          ),
          fc.string({ minLength: 10, maxLength: 200 }).filter(s => s.trim().length > 0),
          async (tenantId, userId, agentId, agentName, knowledgeSpaceIds, userMessage, chunks, llmResponse) => {
            const mocks = createMockServices();

            const agent = new Agent(tenantId, agentId, agentName, knowledgeSpaceIds, false);
            mocks.agentRepo.findByTenantAndId.mockResolvedValue(agent);

            mocks.knowledgeSpaceRepo.findByTenantAndId.mockImplementation(async (_tid, ksId) => {
              if (knowledgeSpaceIds.includes(ksId)) {
                return new KnowledgeSpace(
                  tenantId,
                  ksId,
                  `KS-${ksId}`,
                  'web',
                  ['https://example.com'],
                  '2024-01-01'
                );
              }
              return null;
            });

            // Create search results from generated chunks
            const searchResults = chunks.map((chunk, idx) => ({
              chunk: new Chunk(
                `chunk-${idx}`,
                tenantId,
                knowledgeSpaceIds[0],
                chunk.url,
                new URL(chunk.url).hostname,
                chunk.content,
                createMockEmbedding(),
                { title: `Doc ${idx}`, version: '2024-01-01' },
                new Date()
              ),
              score: chunk.score
            }));

            mocks.vectorRepo.searchSimilar.mockResolvedValue(searchResults);
            mocks.embeddingService.generateEmbedding.mockResolvedValue(createMockEmbedding());
            mocks.llmService.generateCompletion.mockResolvedValue(llmResponse);

            const useCase = new ChatWithAgentUseCase(
              mocks.agentRepo,
              mocks.knowledgeSpaceRepo,
              mocks.conversationRepo,
              mocks.vectorRepo,
              mocks.embeddingService,
              mocks.llmService,
              mocks.logger
            );

            const input: ChatWithAgentInput = {
              tenantId,
              userId,
              agentId,
              messages: [{ role: 'user', content: userMessage }]
            };

            const result = await useCase.execute(input);

            // Extract URLs from context chunks
            const contextUrls = new Set(searchResults.map(r => r.chunk.url));
            const citedUrls = result.choices[0].message.cited_urls;

            // Property 6: All cited URLs must be in the context
            for (const citedUrl of citedUrls) {
              expect(contextUrls.has(citedUrl)).toBe(true);
            }

            return true;
          }
        ),
        { numRuns }
      );
    });

    it('should handle chunks with duplicate URLs correctly', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 5, maxLength: 20 }).filter(s => s.trim().length > 0),
          fc.string({ minLength: 5, maxLength: 20 }).filter(s => s.trim().length > 0),
          fc.string({ minLength: 5, maxLength: 20 }).filter(s => s.trim().length > 0),
          fc.string({ minLength: 3, maxLength: 50 }).filter(s => s.trim().length > 0),
          fc.array(
            fc.string({ minLength: 5, maxLength: 20 }).filter(s => s.trim().length > 0),
            { minLength: 1, maxLength: 3 }
          ),
          fc.string({ minLength: 5, maxLength: 200 }).filter(s => s.trim().length > 0),
          // Generate a few unique URLs
          fc.array(fc.webUrl(), { minLength: 1, maxLength: 5 }),
          // Generate 5-10 chunks that may reuse URLs
          fc.integer({ min: 5, max: 10 }),
          fc.string({ minLength: 10, maxLength: 200 }).filter(s => s.trim().length > 0),
          async (tenantId, userId, agentId, agentName, knowledgeSpaceIds, userMessage, uniqueUrls, numChunks, llmResponse) => {
            const mocks = createMockServices();

            const agent = new Agent(tenantId, agentId, agentName, knowledgeSpaceIds, false);
            mocks.agentRepo.findByTenantAndId.mockResolvedValue(agent);

            mocks.knowledgeSpaceRepo.findByTenantAndId.mockImplementation(async (_tid, ksId) => {
              if (knowledgeSpaceIds.includes(ksId)) {
                return new KnowledgeSpace(
                  tenantId,
                  ksId,
                  `KS-${ksId}`,
                  'web',
                  ['https://example.com'],
                  '2024-01-01'
                );
              }
              return null;
            });

            // Create chunks that reuse URLs (multiple chunks from same URL)
            const searchResults = Array.from({ length: numChunks }, (_, idx) => ({
              chunk: new Chunk(
                `chunk-${idx}`,
                tenantId,
                knowledgeSpaceIds[0],
                uniqueUrls[idx % uniqueUrls.length], // Reuse URLs cyclically
                new URL(uniqueUrls[idx % uniqueUrls.length]).hostname,
                `Content ${idx}`,
                createMockEmbedding(),
                { title: `Doc ${idx}`, version: '2024-01-01' },
                new Date()
              ),
              score: 0.5 + (idx * 0.01) // Varying scores above threshold
            }));

            mocks.vectorRepo.searchSimilar.mockResolvedValue(searchResults);
            mocks.embeddingService.generateEmbedding.mockResolvedValue(createMockEmbedding());
            mocks.llmService.generateCompletion.mockResolvedValue(llmResponse);

            const useCase = new ChatWithAgentUseCase(
              mocks.agentRepo,
              mocks.knowledgeSpaceRepo,
              mocks.conversationRepo,
              mocks.vectorRepo,
              mocks.embeddingService,
              mocks.llmService,
              mocks.logger
            );

            const input: ChatWithAgentInput = {
              tenantId,
              userId,
              agentId,
              messages: [{ role: 'user', content: userMessage }]
            };

            const result = await useCase.execute(input);

            // Extract unique URLs from context chunks
            const contextUrls = new Set(searchResults.map(r => r.chunk.url));
            const citedUrls = result.choices[0].message.cited_urls;

            // Property 6: All cited URLs must be in the context
            for (const citedUrl of citedUrls) {
              expect(contextUrls.has(citedUrl)).toBe(true);
            }

            return true;
          }
        ),
        { numRuns }
      );
    });
  });

  describe('Property 7: Cited URLs deduplication', () => {
    it('should contain no duplicate URLs', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 5, maxLength: 20 }).filter(s => s.trim().length > 0),
          fc.string({ minLength: 5, maxLength: 20 }).filter(s => s.trim().length > 0),
          fc.string({ minLength: 5, maxLength: 20 }).filter(s => s.trim().length > 0),
          fc.string({ minLength: 3, maxLength: 50 }).filter(s => s.trim().length > 0),
          fc.array(
            fc.string({ minLength: 5, maxLength: 20 }).filter(s => s.trim().length > 0),
            { minLength: 1, maxLength: 3 }
          ),
          fc.string({ minLength: 5, maxLength: 200 }).filter(s => s.trim().length > 0),
          // Generate chunks with potentially duplicate URLs
          fc.array(
            fc.record({
              url: fc.webUrl(),
              content: fc.string({ minLength: 10, maxLength: 200 }),
              score: fc.float({ min: Math.fround(0.35), max: Math.fround(1.0) })
            }),
            { minLength: 1, maxLength: 10 }
          ),
          fc.string({ minLength: 10, maxLength: 200 }).filter(s => s.trim().length > 0),
          async (tenantId, userId, agentId, agentName, knowledgeSpaceIds, userMessage, chunks, llmResponse) => {
            const mocks = createMockServices();

            const agent = new Agent(tenantId, agentId, agentName, knowledgeSpaceIds, false);
            mocks.agentRepo.findByTenantAndId.mockResolvedValue(agent);

            mocks.knowledgeSpaceRepo.findByTenantAndId.mockImplementation(async (_tid, ksId) => {
              if (knowledgeSpaceIds.includes(ksId)) {
                return new KnowledgeSpace(
                  tenantId,
                  ksId,
                  `KS-${ksId}`,
                  'web',
                  ['https://example.com'],
                  '2024-01-01'
                );
              }
              return null;
            });

            const searchResults = chunks.map((chunk, idx) => ({
              chunk: new Chunk(
                `chunk-${idx}`,
                tenantId,
                knowledgeSpaceIds[0],
                chunk.url,
                new URL(chunk.url).hostname,
                chunk.content,
                createMockEmbedding(),
                { title: `Doc ${idx}`, version: '2024-01-01' },
                new Date()
              ),
              score: chunk.score
            }));

            mocks.vectorRepo.searchSimilar.mockResolvedValue(searchResults);
            mocks.embeddingService.generateEmbedding.mockResolvedValue(createMockEmbedding());
            mocks.llmService.generateCompletion.mockResolvedValue(llmResponse);

            const useCase = new ChatWithAgentUseCase(
              mocks.agentRepo,
              mocks.knowledgeSpaceRepo,
              mocks.conversationRepo,
              mocks.vectorRepo,
              mocks.embeddingService,
              mocks.llmService,
              mocks.logger
            );

            const input: ChatWithAgentInput = {
              tenantId,
              userId,
              agentId,
              messages: [{ role: 'user', content: userMessage }]
            };

            const result = await useCase.execute(input);
            const citedUrls = result.choices[0].message.cited_urls;

            // Property 7: No duplicates
            const uniqueUrls = new Set(citedUrls);
            expect(citedUrls.length).toBe(uniqueUrls.size);

            return true;
          }
        ),
        { numRuns }
      );
    });

    it('should contain at most 3 URLs', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 5, maxLength: 20 }).filter(s => s.trim().length > 0),
          fc.string({ minLength: 5, maxLength: 20 }).filter(s => s.trim().length > 0),
          fc.string({ minLength: 5, maxLength: 20 }).filter(s => s.trim().length > 0),
          fc.string({ minLength: 3, maxLength: 50 }).filter(s => s.trim().length > 0),
          fc.array(
            fc.string({ minLength: 5, maxLength: 20 }).filter(s => s.trim().length > 0),
            { minLength: 1, maxLength: 3 }
          ),
          fc.string({ minLength: 5, maxLength: 200 }).filter(s => s.trim().length > 0),
          // Generate many chunks with different URLs
          fc.array(
            fc.record({
              url: fc.webUrl(),
              content: fc.string({ minLength: 10, maxLength: 200 }),
              score: fc.float({ min: Math.fround(0.35), max: Math.fround(1.0) })
            }),
            { minLength: 1, maxLength: 20 } // Up to 20 chunks
          ),
          fc.string({ minLength: 10, maxLength: 200 }).filter(s => s.trim().length > 0),
          async (tenantId, userId, agentId, agentName, knowledgeSpaceIds, userMessage, chunks, llmResponse) => {
            const mocks = createMockServices();

            const agent = new Agent(tenantId, agentId, agentName, knowledgeSpaceIds, false);
            mocks.agentRepo.findByTenantAndId.mockResolvedValue(agent);

            mocks.knowledgeSpaceRepo.findByTenantAndId.mockImplementation(async (_tid, ksId) => {
              if (knowledgeSpaceIds.includes(ksId)) {
                return new KnowledgeSpace(
                  tenantId,
                  ksId,
                  `KS-${ksId}`,
                  'web',
                  ['https://example.com'],
                  '2024-01-01'
                );
              }
              return null;
            });

            const searchResults = chunks.map((chunk, idx) => ({
              chunk: new Chunk(
                `chunk-${idx}`,
                tenantId,
                knowledgeSpaceIds[0],
                chunk.url,
                new URL(chunk.url).hostname,
                chunk.content,
                createMockEmbedding(),
                { title: `Doc ${idx}`, version: '2024-01-01' },
                new Date()
              ),
              score: chunk.score
            }));

            mocks.vectorRepo.searchSimilar.mockResolvedValue(searchResults);
            mocks.embeddingService.generateEmbedding.mockResolvedValue(createMockEmbedding());
            mocks.llmService.generateCompletion.mockResolvedValue(llmResponse);

            const useCase = new ChatWithAgentUseCase(
              mocks.agentRepo,
              mocks.knowledgeSpaceRepo,
              mocks.conversationRepo,
              mocks.vectorRepo,
              mocks.embeddingService,
              mocks.llmService,
              mocks.logger
            );

            const input: ChatWithAgentInput = {
              tenantId,
              userId,
              agentId,
              messages: [{ role: 'user', content: userMessage }]
            };

            const result = await useCase.execute(input);
            const citedUrls = result.choices[0].message.cited_urls;

            // Property 7: At most 3 URLs
            expect(citedUrls.length).toBeLessThanOrEqual(3);

            return true;
          }
        ),
        { numRuns }
      );
    });

    it('should deduplicate URLs from multiple chunks with same URL', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 5, maxLength: 20 }).filter(s => s.trim().length > 0),
          fc.string({ minLength: 5, maxLength: 20 }).filter(s => s.trim().length > 0),
          fc.string({ minLength: 5, maxLength: 20 }).filter(s => s.trim().length > 0),
          fc.string({ minLength: 3, maxLength: 50 }).filter(s => s.trim().length > 0),
          fc.array(
            fc.string({ minLength: 5, maxLength: 20 }).filter(s => s.trim().length > 0),
            { minLength: 1, maxLength: 3 }
          ),
          fc.string({ minLength: 5, maxLength: 200 }).filter(s => s.trim().length > 0),
          // Generate a single URL that will be used for all chunks
          fc.webUrl(),
          // Generate 5-10 chunks all with the same URL
          fc.integer({ min: 5, max: 10 }),
          fc.string({ minLength: 10, maxLength: 200 }).filter(s => s.trim().length > 0),
          async (tenantId, userId, agentId, agentName, knowledgeSpaceIds, userMessage, singleUrl, numChunks, llmResponse) => {
            const mocks = createMockServices();

            const agent = new Agent(tenantId, agentId, agentName, knowledgeSpaceIds, false);
            mocks.agentRepo.findByTenantAndId.mockResolvedValue(agent);

            mocks.knowledgeSpaceRepo.findByTenantAndId.mockImplementation(async (_tid, ksId) => {
              if (knowledgeSpaceIds.includes(ksId)) {
                return new KnowledgeSpace(
                  tenantId,
                  ksId,
                  `KS-${ksId}`,
                  'web',
                  ['https://example.com'],
                  '2024-01-01'
                );
              }
              return null;
            });

            // Create multiple chunks all with the same URL
            const searchResults = Array.from({ length: numChunks }, (_, idx) => ({
              chunk: new Chunk(
                `chunk-${idx}`,
                tenantId,
                knowledgeSpaceIds[0],
                singleUrl, // All chunks have the same URL
                new URL(singleUrl).hostname,
                `Content ${idx}`,
                createMockEmbedding(),
                { title: `Doc ${idx}`, version: '2024-01-01' },
                new Date()
              ),
              score: 0.5 + (idx * 0.01)
            }));

            mocks.vectorRepo.searchSimilar.mockResolvedValue(searchResults);
            mocks.embeddingService.generateEmbedding.mockResolvedValue(createMockEmbedding());
            mocks.llmService.generateCompletion.mockResolvedValue(llmResponse);

            const useCase = new ChatWithAgentUseCase(
              mocks.agentRepo,
              mocks.knowledgeSpaceRepo,
              mocks.conversationRepo,
              mocks.vectorRepo,
              mocks.embeddingService,
              mocks.llmService,
              mocks.logger
            );

            const input: ChatWithAgentInput = {
              tenantId,
              userId,
              agentId,
              messages: [{ role: 'user', content: userMessage }]
            };

            const result = await useCase.execute(input);
            const citedUrls = result.choices[0].message.cited_urls;

            // Property 7: Should have exactly 1 URL (deduplicated)
            expect(citedUrls.length).toBe(1);
            expect(citedUrls[0]).toBe(singleUrl);

            return true;
          }
        ),
        { numRuns }
      );
    });

    it('should respect MAX_CITED_URLS limit even with many unique URLs', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 5, maxLength: 20 }).filter(s => s.trim().length > 0),
          fc.string({ minLength: 5, maxLength: 20 }).filter(s => s.trim().length > 0),
          fc.string({ minLength: 5, maxLength: 20 }).filter(s => s.trim().length > 0),
          fc.string({ minLength: 3, maxLength: 50 }).filter(s => s.trim().length > 0),
          // Use only 1 knowledge space to avoid duplicate chunks from multiple KS
          fc.array(
            fc.string({ minLength: 5, maxLength: 20 }).filter(s => s.trim().length > 0),
            { minLength: 1, maxLength: 1 }
          ),
          fc.string({ minLength: 5, maxLength: 200 }).filter(s => s.trim().length > 0),
          // Generate 10-20 unique URLs
          fc.array(fc.webUrl(), { minLength: 10, maxLength: 20 }),
          fc.string({ minLength: 10, maxLength: 200 }).filter(s => s.trim().length > 0),
          async (tenantId, userId, agentId, agentName, knowledgeSpaceIds, userMessage, uniqueUrls, llmResponse) => {
            // Ensure URLs are actually unique
            const deduplicatedUrls = [...new Set(uniqueUrls)];
            if (deduplicatedUrls.length < 4) {
              // Skip if we don't have enough unique URLs to test the limit
              return true;
            }

            const mocks = createMockServices();

            const agent = new Agent(tenantId, agentId, agentName, knowledgeSpaceIds, false);
            mocks.agentRepo.findByTenantAndId.mockResolvedValue(agent);

            mocks.knowledgeSpaceRepo.findByTenantAndId.mockImplementation(async (_tid, ksId) => {
              if (knowledgeSpaceIds.includes(ksId)) {
                return new KnowledgeSpace(
                  tenantId,
                  ksId,
                  `KS-${ksId}`,
                  'web',
                  ['https://example.com'],
                  '2024-01-01'
                );
              }
              return null;
            });

            // Create one chunk per unique URL
            const searchResults = deduplicatedUrls.map((url, idx) => {
              let hostname;
              try {
                hostname = new URL(url).hostname;
              } catch (e) {
                // If URL parsing fails, use a fallback
                hostname = 'example.com';
              }
              return {
                chunk: new Chunk(
                  `chunk-${idx}`,
                  tenantId,
                  knowledgeSpaceIds[0],
                  url,
                  hostname,
                  `Content ${idx}`,
                  createMockEmbedding(),
                  { title: `Doc ${idx}`, version: '2024-01-01' },
                  new Date()
                ),
                score: 0.9 - (idx * 0.01) // Descending scores
              };
            });

            mocks.vectorRepo.searchSimilar.mockResolvedValue(searchResults);
            mocks.embeddingService.generateEmbedding.mockResolvedValue(createMockEmbedding());
            mocks.llmService.generateCompletion.mockResolvedValue(llmResponse);

            const useCase = new ChatWithAgentUseCase(
              mocks.agentRepo,
              mocks.knowledgeSpaceRepo,
              mocks.conversationRepo,
              mocks.vectorRepo,
              mocks.embeddingService,
              mocks.llmService,
              mocks.logger
            );

            const input: ChatWithAgentInput = {
              tenantId,
              userId,
              agentId,
              messages: [{ role: 'user', content: userMessage }]
            };

            const result = await useCase.execute(input);
            const citedUrls = result.choices[0].message.cited_urls;

            // The use case filters to top 5 chunks (MAX_CONTEXT_CHUNKS), then extracts URLs
            // So we need to simulate that filtering to get the expected URLs
            const filteredChunks = searchResults
              .filter(r => r.score >= 0.35) // SIMILARITY_THRESHOLD
              .sort((a, b) => b.score - a.score)
              .slice(0, 5); // MAX_CONTEXT_CHUNKS

            const expectedUniqueUrls = [...new Set(filteredChunks.map(r => r.chunk.url))];
            const expectedCount = Math.min(3, expectedUniqueUrls.length);
            
            // Property 7: Should have at most 3 URLs (the limit)
            expect(citedUrls.length).toBe(expectedCount);

            // Should be the first N unique URLs from the filtered context
            const expectedUrls = expectedUniqueUrls.slice(0, expectedCount);
            expect(citedUrls).toEqual(expectedUrls);

            return true;
          }
        ),
        { numRuns }
      );
    });
  });

  describe('Combined Properties 6 & 7', () => {
    it('should satisfy both properties simultaneously', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 5, maxLength: 20 }).filter(s => s.trim().length > 0),
          fc.string({ minLength: 5, maxLength: 20 }).filter(s => s.trim().length > 0),
          fc.string({ minLength: 5, maxLength: 20 }).filter(s => s.trim().length > 0),
          fc.string({ minLength: 3, maxLength: 50 }).filter(s => s.trim().length > 0),
          fc.array(
            fc.string({ minLength: 5, maxLength: 20 }).filter(s => s.trim().length > 0),
            { minLength: 1, maxLength: 3 }
          ),
          fc.string({ minLength: 5, maxLength: 200 }).filter(s => s.trim().length > 0),
          fc.array(
            fc.record({
              url: fc.webUrl(),
              content: fc.string({ minLength: 10, maxLength: 200 }),
              score: fc.float({ min: Math.fround(0.35), max: Math.fround(1.0) })
            }),
            { minLength: 1, maxLength: 15 }
          ),
          fc.string({ minLength: 10, maxLength: 200 }).filter(s => s.trim().length > 0),
          async (tenantId, userId, agentId, agentName, knowledgeSpaceIds, userMessage, chunks, llmResponse) => {
            const mocks = createMockServices();

            const agent = new Agent(tenantId, agentId, agentName, knowledgeSpaceIds, false);
            mocks.agentRepo.findByTenantAndId.mockResolvedValue(agent);

            mocks.knowledgeSpaceRepo.findByTenantAndId.mockImplementation(async (_tid, ksId) => {
              if (knowledgeSpaceIds.includes(ksId)) {
                return new KnowledgeSpace(
                  tenantId,
                  ksId,
                  `KS-${ksId}`,
                  'web',
                  ['https://example.com'],
                  '2024-01-01'
                );
              }
              return null;
            });

            const searchResults = chunks.map((chunk, idx) => ({
              chunk: new Chunk(
                `chunk-${idx}`,
                tenantId,
                knowledgeSpaceIds[0],
                chunk.url,
                new URL(chunk.url).hostname,
                chunk.content,
                createMockEmbedding(),
                { title: `Doc ${idx}`, version: '2024-01-01' },
                new Date()
              ),
              score: chunk.score
            }));

            mocks.vectorRepo.searchSimilar.mockResolvedValue(searchResults);
            mocks.embeddingService.generateEmbedding.mockResolvedValue(createMockEmbedding());
            mocks.llmService.generateCompletion.mockResolvedValue(llmResponse);

            const useCase = new ChatWithAgentUseCase(
              mocks.agentRepo,
              mocks.knowledgeSpaceRepo,
              mocks.conversationRepo,
              mocks.vectorRepo,
              mocks.embeddingService,
              mocks.llmService,
              mocks.logger
            );

            const input: ChatWithAgentInput = {
              tenantId,
              userId,
              agentId,
              messages: [{ role: 'user', content: userMessage }]
            };

            const result = await useCase.execute(input);
            const citedUrls = result.choices[0].message.cited_urls;

            // Extract URLs from context chunks
            const contextUrls = new Set(searchResults.map(r => r.chunk.url));

            // Property 6: All cited URLs must be in the context
            for (const citedUrl of citedUrls) {
              expect(contextUrls.has(citedUrl)).toBe(true);
            }

            // Property 7: No duplicates
            const uniqueUrls = new Set(citedUrls);
            expect(citedUrls.length).toBe(uniqueUrls.size);

            // Property 7: At most 3 URLs
            expect(citedUrls.length).toBeLessThanOrEqual(3);

            return true;
          }
        ),
        { numRuns }
      );
    });
  });
});
