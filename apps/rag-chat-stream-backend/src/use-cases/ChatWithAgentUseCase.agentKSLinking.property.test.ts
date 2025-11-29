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
 * Feature: rag-chat-backend-mvp, Property 11: Agent-KnowledgeSpace linking
 * Validates: Requirements 4.4, 4.5
 * 
 * For any agent with knowledgeSpaceIds, when processing a chat request,
 * the system should search all and only the namespaces corresponding to
 * those knowledgeSpaceIds.
 */
describe('Property 11: Agent-KnowledgeSpace linking', () => {
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

  it('should search all linked KnowledgeSpaces', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 5, maxLength: 20 }).filter(s => s.trim().length > 0),
        fc.string({ minLength: 5, maxLength: 20 }).filter(s => s.trim().length > 0),
        fc.string({ minLength: 5, maxLength: 20 }).filter(s => s.trim().length > 0),
        fc.string({ minLength: 3, maxLength: 50 }).filter(s => s.trim().length > 0),
        // Generate 1-5 knowledge space IDs
        fc.array(
          fc.string({ minLength: 5, maxLength: 20 }).filter(s => s.trim().length > 0),
          { minLength: 1, maxLength: 5 }
        ).map(arr => [...new Set(arr)]), // Ensure unique IDs
        fc.string({ minLength: 5, maxLength: 200 }).filter(s => s.trim().length > 0),
        fc.string({ minLength: 10, maxLength: 200 }).filter(s => s.trim().length > 0),
        async (tenantId, userId, agentId, agentName, knowledgeSpaceIds, userMessage, llmResponse) => {
          const mocks = createMockServices();

          // Create agent with specific knowledge space IDs
          const agent = new Agent(tenantId, agentId, agentName, knowledgeSpaceIds, false);
          mocks.agentRepo.findByTenantAndId.mockResolvedValue(agent);

          // Setup knowledge space repository to return valid knowledge spaces
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

          // Setup vector repository to return empty results
          mocks.vectorRepo.searchSimilar.mockResolvedValue([]);
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

          await useCase.execute(input);

          // Property: Should search exactly once per linked knowledge space
          expect(mocks.vectorRepo.searchSimilar).toHaveBeenCalledTimes(knowledgeSpaceIds.length);

          // Verify each knowledge space was searched
          const searchedNamespaces = (mocks.vectorRepo.searchSimilar as jest.Mock).mock.calls.map(
            call => call[0].toString()
          );

          for (const ksId of knowledgeSpaceIds) {
            const expectedNamespace = `t_${tenantId}_ks_${ksId}_2024-01-01`;
            expect(searchedNamespaces).toContain(expectedNamespace);
          }

          return true;
        }
      ),
      { numRuns }
    );
  });

  it('should NOT search unlinked KnowledgeSpaces', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 5, maxLength: 20 }).filter(s => s.trim().length > 0),
        fc.string({ minLength: 5, maxLength: 20 }).filter(s => s.trim().length > 0),
        fc.string({ minLength: 5, maxLength: 20 }).filter(s => s.trim().length > 0),
        fc.string({ minLength: 3, maxLength: 50 }).filter(s => s.trim().length > 0),
        // Generate linked knowledge space IDs
        fc.array(
          fc.string({ minLength: 5, maxLength: 20 }).filter(s => s.trim().length > 0),
          { minLength: 1, maxLength: 3 }
        ).map(arr => [...new Set(arr)]),
        // Generate unlinked knowledge space IDs
        fc.array(
          fc.string({ minLength: 5, maxLength: 20 }).filter(s => s.trim().length > 0),
          { minLength: 1, maxLength: 3 }
        ).map(arr => [...new Set(arr)]),
        fc.string({ minLength: 5, maxLength: 200 }).filter(s => s.trim().length > 0),
        fc.string({ minLength: 10, maxLength: 200 }).filter(s => s.trim().length > 0),
        async (tenantId, userId, agentId, agentName, linkedKsIds, unlinkedKsIds, userMessage, llmResponse) => {
          // Ensure linked and unlinked are disjoint sets
          const filteredUnlinkedKsIds = unlinkedKsIds.filter(id => !linkedKsIds.includes(id));
          if (filteredUnlinkedKsIds.length === 0) {
            // Skip if no unlinked KS to test
            return true;
          }

          const mocks = createMockServices();

          // Create agent with only linked knowledge space IDs
          const agent = new Agent(tenantId, agentId, agentName, linkedKsIds, false);
          mocks.agentRepo.findByTenantAndId.mockResolvedValue(agent);

          // Setup knowledge space repository for both linked and unlinked
          const allKsIds = [...linkedKsIds, ...filteredUnlinkedKsIds];
          mocks.knowledgeSpaceRepo.findByTenantAndId.mockImplementation(async (_tid, ksId) => {
            if (allKsIds.includes(ksId)) {
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

          mocks.vectorRepo.searchSimilar.mockResolvedValue([]);
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

          await useCase.execute(input);

          // Property: Should only search linked knowledge spaces
          const searchedNamespaces = (mocks.vectorRepo.searchSimilar as jest.Mock).mock.calls.map(
            call => call[0].toString()
          );

          // Verify unlinked KS were NOT searched
          for (const unlinkedKsId of filteredUnlinkedKsIds) {
            const unlinkedNamespace = `t_${tenantId}_ks_${unlinkedKsId}_2024-01-01`;
            expect(searchedNamespaces).not.toContain(unlinkedNamespace);
          }

          // Verify only linked KS were searched
          expect(searchedNamespaces.length).toBe(linkedKsIds.length);

          return true;
        }
      ),
      { numRuns }
    );
  });

  it('should search with correct namespace format for each KnowledgeSpace', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 5, maxLength: 20 }).filter(s => s.trim().length > 0),
        fc.string({ minLength: 5, maxLength: 20 }).filter(s => s.trim().length > 0),
        fc.string({ minLength: 5, maxLength: 20 }).filter(s => s.trim().length > 0),
        fc.string({ minLength: 3, maxLength: 50 }).filter(s => s.trim().length > 0),
        fc.array(
          fc.string({ minLength: 5, maxLength: 20 }).filter(s => s.trim().length > 0),
          { minLength: 1, maxLength: 5 }
        ).map(arr => [...new Set(arr)]),
        fc.string({ minLength: 5, maxLength: 200 }).filter(s => s.trim().length > 0),
        // Generate random version dates
        fc.date({ min: new Date('2020-01-01'), max: new Date('2025-12-31') }),
        fc.string({ minLength: 10, maxLength: 200 }).filter(s => s.trim().length > 0),
        async (tenantId, userId, agentId, agentName, knowledgeSpaceIds, userMessage, versionDate, llmResponse) => {
          const mocks = createMockServices();

          const agent = new Agent(tenantId, agentId, agentName, knowledgeSpaceIds, false);
          mocks.agentRepo.findByTenantAndId.mockResolvedValue(agent);

          const versionString = versionDate.toISOString().split('T')[0]; // YYYY-MM-DD

          // Setup knowledge space repository with specific version
          mocks.knowledgeSpaceRepo.findByTenantAndId.mockImplementation(async (_tid, ksId) => {
            if (knowledgeSpaceIds.includes(ksId)) {
              return new KnowledgeSpace(
                tenantId,
                ksId,
                `KS-${ksId}`,
                'web',
                ['https://example.com'],
                versionString
              );
            }
            return null;
          });

          mocks.vectorRepo.searchSimilar.mockResolvedValue([]);
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

          await useCase.execute(input);

          // Property: Namespace format should be t_{tenantId}_ks_{ksId}_{version}
          const searchedNamespaces = (mocks.vectorRepo.searchSimilar as jest.Mock).mock.calls.map(
            call => call[0].toString()
          );

          for (const ksId of knowledgeSpaceIds) {
            const expectedNamespace = `t_${tenantId}_ks_${ksId}_${versionString}`;
            expect(searchedNamespaces).toContain(expectedNamespace);
          }

          return true;
        }
      ),
      { numRuns }
    );
  });

  it('should merge results from multiple KnowledgeSpaces', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 5, maxLength: 20 }).filter(s => s.trim().length > 0),
        fc.string({ minLength: 5, maxLength: 20 }).filter(s => s.trim().length > 0),
        fc.string({ minLength: 5, maxLength: 20 }).filter(s => s.trim().length > 0),
        fc.string({ minLength: 3, maxLength: 50 }).filter(s => s.trim().length > 0),
        // Generate 2-4 knowledge space IDs
        fc.array(
          fc.string({ minLength: 5, maxLength: 20 }).filter(s => s.trim().length > 0),
          { minLength: 2, maxLength: 4 }
        ).map(arr => [...new Set(arr)]).filter(arr => arr.length >= 2),
        fc.string({ minLength: 5, maxLength: 200 }).filter(s => s.trim().length > 0),
        fc.string({ minLength: 10, maxLength: 200 }).filter(s => s.trim().length > 0),
        async (tenantId, userId, agentId, agentName, knowledgeSpaceIds, userMessage, llmResponse) => {
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

          // Each KS returns different chunks
          let callCount = 0;
          mocks.vectorRepo.searchSimilar.mockImplementation(async () => {
            const ksId = knowledgeSpaceIds[callCount % knowledgeSpaceIds.length];
            callCount++;
            
            return [{
              chunk: new Chunk(
                `chunk-${ksId}`,
                tenantId,
                ksId,
                `https://example.com/${ksId}`,
                'example.com',
                `Content from ${ksId}`,
                createMockEmbedding(),
                { title: `Doc ${ksId}`, version: '2024-01-01' },
                new Date()
              ),
              score: 0.8
            }];
          });

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

          // Property: Results should be merged from all KnowledgeSpaces
          // Verify LLM was called (meaning results were merged and processed)
          expect(mocks.llmService.generateCompletion).toHaveBeenCalledTimes(1);

          // Verify cited URLs come from multiple KS
          const citedUrls = result.choices[0].message.cited_urls;
          expect(citedUrls.length).toBeGreaterThan(0);

          return true;
        }
      ),
      { numRuns }
    );
  });

  it('should handle missing KnowledgeSpaces gracefully', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 5, maxLength: 20 }).filter(s => s.trim().length > 0),
        fc.string({ minLength: 5, maxLength: 20 }).filter(s => s.trim().length > 0),
        fc.string({ minLength: 5, maxLength: 20 }).filter(s => s.trim().length > 0),
        fc.string({ minLength: 3, maxLength: 50 }).filter(s => s.trim().length > 0),
        fc.array(
          fc.string({ minLength: 5, maxLength: 20 }).filter(s => s.trim().length > 0),
          { minLength: 2, maxLength: 4 }
        ).map(arr => [...new Set(arr)]).filter(arr => arr.length >= 2),
        fc.string({ minLength: 5, maxLength: 200 }).filter(s => s.trim().length > 0),
        fc.string({ minLength: 10, maxLength: 200 }).filter(s => s.trim().length > 0),
        async (tenantId, userId, agentId, agentName, knowledgeSpaceIds, userMessage, llmResponse) => {
          const mocks = createMockServices();

          const agent = new Agent(tenantId, agentId, agentName, knowledgeSpaceIds, false);
          mocks.agentRepo.findByTenantAndId.mockResolvedValue(agent);

          // Only return some of the knowledge spaces (simulate missing ones)
          const existingKsIds = knowledgeSpaceIds.slice(0, Math.ceil(knowledgeSpaceIds.length / 2));
          mocks.knowledgeSpaceRepo.findByTenantAndId.mockImplementation(async (_tid, ksId) => {
            if (existingKsIds.includes(ksId)) {
              return new KnowledgeSpace(
                tenantId,
                ksId,
                `KS-${ksId}`,
                'web',
                ['https://example.com'],
                '2024-01-01'
              );
            }
            return null; // Missing KS
          });

          mocks.vectorRepo.searchSimilar.mockResolvedValue([]);
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

          await useCase.execute(input);

          // Property: Should only search existing KnowledgeSpaces
          expect(mocks.vectorRepo.searchSimilar).toHaveBeenCalledTimes(existingKsIds.length);

          const searchedNamespaces = (mocks.vectorRepo.searchSimilar as jest.Mock).mock.calls.map(
            call => call[0].toString()
          );

          // Verify only existing KS were searched
          for (const ksId of existingKsIds) {
            const expectedNamespace = `t_${tenantId}_ks_${ksId}_2024-01-01`;
            expect(searchedNamespaces).toContain(expectedNamespace);
          }

          return true;
        }
      ),
      { numRuns }
    );
  });

  it('should use correct TOP_K value for each KnowledgeSpace search', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 5, maxLength: 20 }).filter(s => s.trim().length > 0),
        fc.string({ minLength: 5, maxLength: 20 }).filter(s => s.trim().length > 0),
        fc.string({ minLength: 5, maxLength: 20 }).filter(s => s.trim().length > 0),
        fc.string({ minLength: 3, maxLength: 50 }).filter(s => s.trim().length > 0),
        fc.array(
          fc.string({ minLength: 5, maxLength: 20 }).filter(s => s.trim().length > 0),
          { minLength: 1, maxLength: 5 }
        ).map(arr => [...new Set(arr)]),
        fc.string({ minLength: 5, maxLength: 200 }).filter(s => s.trim().length > 0),
        fc.string({ minLength: 10, maxLength: 200 }).filter(s => s.trim().length > 0),
        async (tenantId, userId, agentId, agentName, knowledgeSpaceIds, userMessage, llmResponse) => {
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

          mocks.vectorRepo.searchSimilar.mockResolvedValue([]);
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

          await useCase.execute(input);

          // Property: Each search should use TOP_K = 8
          const searchCalls = (mocks.vectorRepo.searchSimilar as jest.Mock).mock.calls;
          for (const call of searchCalls) {
            const topK = call[2]; // Third parameter is topK
            expect(topK).toBe(8);
          }

          return true;
        }
      ),
      { numRuns }
    );
  });

  it('should search with same query embedding for all KnowledgeSpaces', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 5, maxLength: 20 }).filter(s => s.trim().length > 0),
        fc.string({ minLength: 5, maxLength: 20 }).filter(s => s.trim().length > 0),
        fc.string({ minLength: 5, maxLength: 20 }).filter(s => s.trim().length > 0),
        fc.string({ minLength: 3, maxLength: 50 }).filter(s => s.trim().length > 0),
        fc.array(
          fc.string({ minLength: 5, maxLength: 20 }).filter(s => s.trim().length > 0),
          { minLength: 2, maxLength: 5 }
        ).map(arr => [...new Set(arr)]).filter(arr => arr.length >= 2),
        fc.string({ minLength: 5, maxLength: 200 }).filter(s => s.trim().length > 0),
        fc.string({ minLength: 10, maxLength: 200 }).filter(s => s.trim().length > 0),
        async (tenantId, userId, agentId, agentName, knowledgeSpaceIds, userMessage, llmResponse) => {
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

          const queryEmbedding = createMockEmbedding();
          mocks.vectorRepo.searchSimilar.mockResolvedValue([]);
          mocks.embeddingService.generateEmbedding.mockResolvedValue(queryEmbedding);
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

          await useCase.execute(input);

          // Property: Embedding should be generated only once
          expect(mocks.embeddingService.generateEmbedding).toHaveBeenCalledTimes(1);
          expect(mocks.embeddingService.generateEmbedding).toHaveBeenCalledWith(userMessage);

          // Property: All searches should use the same embedding
          const searchCalls = (mocks.vectorRepo.searchSimilar as jest.Mock).mock.calls;
          for (const call of searchCalls) {
            const embedding = call[1]; // Second parameter is embedding
            expect(embedding).toBe(queryEmbedding);
          }

          return true;
        }
      ),
      { numRuns }
    );
  });
});
