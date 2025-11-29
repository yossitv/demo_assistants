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
 * Feature: rag-chat-backend-mvp, Property 5: Strict RAG enforcement
 * Validates: Requirements 4.10
 * 
 * For any agent with strictRAG=true, when no search results meet the similarity threshold,
 * the response content should be exactly "このサイトには情報がありませんでした。"
 */
describe('Property 5: Strict RAG enforcement', () => {
  const numRuns = 100;
  const NO_INFO_MESSAGE = 'このサイトには情報がありませんでした。';

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

  it('should return fixed message when strictRAG=true and no search results', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate random tenant ID
        fc.string({ minLength: 5, maxLength: 20 }).filter(s => s.trim().length > 0),
        // Generate random user ID
        fc.string({ minLength: 5, maxLength: 20 }).filter(s => s.trim().length > 0),
        // Generate random agent ID
        fc.string({ minLength: 5, maxLength: 20 }).filter(s => s.trim().length > 0),
        // Generate random agent name
        fc.string({ minLength: 3, maxLength: 50 }).filter(s => s.trim().length > 0),
        // Generate random knowledge space IDs (1-3)
        fc.array(
          fc.string({ minLength: 5, maxLength: 20 }).filter(s => s.trim().length > 0),
          { minLength: 1, maxLength: 3 }
        ),
        // Generate random user message
        fc.string({ minLength: 5, maxLength: 200 }).filter(s => s.trim().length > 0),
        async (tenantId, userId, agentId, agentName, knowledgeSpaceIds, userMessage) => {
          const mocks = createMockServices();

          // Create agent with strictRAG=true
          const agent = new Agent(
            tenantId,
            agentId,
            agentName,
            knowledgeSpaceIds,
            true // strictRAG = true
          );

          // Setup agent repository to return the agent
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

          // Setup vector repository to return empty results (no matches)
          mocks.vectorRepo.searchSimilar.mockResolvedValue([]);

          // Setup embedding service
          mocks.embeddingService.generateEmbedding.mockResolvedValue(createMockEmbedding());

          // Create use case
          const useCase = new ChatWithAgentUseCase(
            mocks.agentRepo,
            mocks.knowledgeSpaceRepo,
            mocks.conversationRepo,
            mocks.vectorRepo,
            mocks.embeddingService,
            mocks.llmService,
            mocks.logger
          );

          // Execute chat request
          const input: ChatWithAgentInput = {
            tenantId,
            userId,
            agentId,
            messages: [{ role: 'user', content: userMessage }]
          };

          const result = await useCase.execute(input);

          // Property: Response content should be exactly the fixed message
          expect(result.choices[0].message.content).toBe(NO_INFO_MESSAGE);
          expect(result.choices[0].message.isRag).toBe(false);

          // Additional assertions
          expect(result.choices[0].message.cited_urls).toEqual([]);
          expect(result.object).toBe('chat.completion');
          expect(result.model).toBe(agentId);

          // Verify conversation was saved
          expect(mocks.conversationRepo.save).toHaveBeenCalledTimes(1);
          const savedConversation = (mocks.conversationRepo.save as jest.Mock).mock.calls[0][0];
          expect(savedConversation.lastUserMessage).toBe(userMessage);
          expect(savedConversation.lastAssistantMessage).toBe(NO_INFO_MESSAGE);
          expect(savedConversation.referencedUrls).toEqual([]);

          // Verify LLM was NOT called (strict RAG should short-circuit)
          expect(mocks.llmService.generateCompletion).not.toHaveBeenCalled();

          return true;
        }
      ),
      { numRuns }
    );
  });

  it('should return fixed message when strictRAG=true and results below threshold', async () => {
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
        // Generate low similarity scores (below 0.35 threshold)
        fc.array(
          fc.float({ min: Math.fround(0), max: Math.fround(0.34) }),
          { minLength: 1, maxLength: 5 }
        ),
        async (tenantId, userId, agentId, agentName, knowledgeSpaceIds, userMessage, lowScores) => {
          const mocks = createMockServices();

          const agent = new Agent(tenantId, agentId, agentName, knowledgeSpaceIds, true);
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

          // Return results with scores below threshold
          const lowScoreResults = lowScores.map((score, idx) => ({
            chunk: new Chunk(
              `chunk-${idx}`,
              tenantId,
              knowledgeSpaceIds[0],
              `https://example.com/doc${idx}`,
              'example.com',
              `Content ${idx}`,
              createMockEmbedding(),
              { title: `Doc ${idx}`, version: '2024-01-01' },
              new Date()
            ),
            score
          }));

          mocks.vectorRepo.searchSimilar.mockResolvedValue(lowScoreResults);
          mocks.embeddingService.generateEmbedding.mockResolvedValue(createMockEmbedding());

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

          // Property: When all scores are below threshold, should return fixed message
          expect(result.choices[0].message.content).toBe(NO_INFO_MESSAGE);
          expect(result.choices[0].message.isRag).toBe(false);
          expect(result.choices[0].message.cited_urls).toEqual([]);
          expect(mocks.llmService.generateCompletion).not.toHaveBeenCalled();

          return true;
        }
      ),
      { numRuns }
    );
  });

  it('should call LLM when strictRAG=true but results meet threshold', async () => {
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
        // Generate high similarity scores (above 0.35 threshold)
        fc.array(
          fc.float({ min: Math.fround(0.36), max: Math.fround(1.0) }),
          { minLength: 1, maxLength: 5 }
        ),
        fc.string({ minLength: 10, maxLength: 200 }).filter(s => s.trim().length > 0), // LLM response
        async (tenantId, userId, agentId, agentName, knowledgeSpaceIds, userMessage, highScores, llmResponse) => {
          const mocks = createMockServices();

          const agent = new Agent(tenantId, agentId, agentName, knowledgeSpaceIds, true);
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

          // Return results with scores above threshold
          const highScoreResults = highScores.map((score, idx) => ({
            chunk: new Chunk(
              `chunk-${idx}`,
              tenantId,
              knowledgeSpaceIds[0],
              `https://example.com/doc${idx}`,
              'example.com',
              `Content ${idx}`,
              createMockEmbedding(),
              { title: `Doc ${idx}`, version: '2024-01-01' },
              new Date()
            ),
            score
          }));

          mocks.vectorRepo.searchSimilar.mockResolvedValue(highScoreResults);
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

          // Property: When results meet threshold, should NOT return fixed message
          expect(result.choices[0].message.content).not.toBe(NO_INFO_MESSAGE);
          expect(result.choices[0].message.content).toBe(llmResponse);
          expect(result.choices[0].message.isRag).toBe(true);

          // LLM should have been called
          expect(mocks.llmService.generateCompletion).toHaveBeenCalledTimes(1);

          // Should have cited URLs
          expect(result.choices[0].message.cited_urls.length).toBeGreaterThan(0);

          return true;
        }
      ),
      { numRuns }
    );
  });

  it('should NOT return fixed message when strictRAG=false and no results', async () => {
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
        fc.string({ minLength: 10, maxLength: 200 }).filter(s => s.trim().length > 0), // LLM response
        async (tenantId, userId, agentId, agentName, knowledgeSpaceIds, userMessage, llmResponse) => {
          const mocks = createMockServices();

          // Create agent with strictRAG=false
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

          // Return empty results
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

          const result = await useCase.execute(input);

          // Property: When strictRAG=false, should call LLM even with no results
          expect(mocks.llmService.generateCompletion).toHaveBeenCalledTimes(1);
          expect(result.choices[0].message.content).toBe(llmResponse);
          expect(result.choices[0].message.content).not.toBe(NO_INFO_MESSAGE);
          expect(result.choices[0].message.isRag).toBe(true);

          return true;
        }
      ),
      { numRuns }
    );
  });

  it('should handle multiple knowledge spaces with no results in strict mode', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 5, maxLength: 20 }).filter(s => s.trim().length > 0),
        fc.string({ minLength: 5, maxLength: 20 }).filter(s => s.trim().length > 0),
        fc.string({ minLength: 5, maxLength: 20 }).filter(s => s.trim().length > 0),
        fc.string({ minLength: 3, maxLength: 50 }).filter(s => s.trim().length > 0),
        // Generate 2-5 knowledge space IDs
        fc.array(
          fc.string({ minLength: 5, maxLength: 20 }).filter(s => s.trim().length > 0),
          { minLength: 2, maxLength: 5 }
        ),
        fc.string({ minLength: 5, maxLength: 200 }).filter(s => s.trim().length > 0),
        async (tenantId, userId, agentId, agentName, knowledgeSpaceIds, userMessage) => {
          const mocks = createMockServices();

          const agent = new Agent(tenantId, agentId, agentName, knowledgeSpaceIds, true);
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

          // All knowledge spaces return empty results
          mocks.vectorRepo.searchSimilar.mockResolvedValue([]);
          mocks.embeddingService.generateEmbedding.mockResolvedValue(createMockEmbedding());

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

          // Property: Should return fixed message even when searching multiple KS
          expect(result.choices[0].message.content).toBe(NO_INFO_MESSAGE);
          expect(result.choices[0].message.cited_urls).toEqual([]);
          expect(result.choices[0].message.isRag).toBe(false);

          // Verify search was called for each knowledge space
          expect(mocks.vectorRepo.searchSimilar).toHaveBeenCalledTimes(knowledgeSpaceIds.length);

          return true;
        }
      ),
      { numRuns }
    );
  });

  it('should preserve exact message format in strict RAG mode', async () => {
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
        async (tenantId, userId, agentId, agentName, knowledgeSpaceIds, userMessage) => {
          const mocks = createMockServices();

          const agent = new Agent(tenantId, agentId, agentName, knowledgeSpaceIds, true);
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

          // Property: Message must be EXACTLY the fixed string (no variations)
          const content = result.choices[0].message.content;
          expect(content).toBe(NO_INFO_MESSAGE);
          expect(content.length).toBe(NO_INFO_MESSAGE.length);
          expect(content).toStrictEqual(NO_INFO_MESSAGE);

          // No whitespace variations
          expect(content.trim()).toBe(NO_INFO_MESSAGE);

          return true;
        }
      ),
      { numRuns }
    );
  });
});
