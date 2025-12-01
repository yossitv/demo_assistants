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

const vector = new Array(1536).fill(0);

describe('ChatWithAgentUseCase Property tests', () => {
  let agentRepo: jest.Mocked<IAgentRepository>;
  let knowledgeSpaceRepo: jest.Mocked<IKnowledgeSpaceRepository>;
  let conversationRepo: jest.Mocked<IConversationRepository>;
  let vectorRepo: jest.Mocked<IVectorRepository>;
  let embeddingService: jest.Mocked<IEmbeddingService>;
  let llmService: jest.Mocked<ILLMService>;
  let logger: jest.Mocked<ILogger>;

  const baseInput: ChatWithAgentInput = {
    tenantId: 'tenant-1',
    userId: 'user-1',
    agentId: 'agent-1',
    messages: [{ role: 'user', content: 'Hello?' }]
  };

  beforeEach(() => {
    agentRepo = {
      save: jest.fn(),
      findByTenantAndId: jest.fn()
    } as unknown as jest.Mocked<IAgentRepository>;

    knowledgeSpaceRepo = {
      save: jest.fn(),
      findByTenant: jest.fn(),
      findByTenantAndId: jest.fn()
    } as unknown as jest.Mocked<IKnowledgeSpaceRepository>;

    conversationRepo = {
      save: jest.fn()
    } as unknown as jest.Mocked<IConversationRepository>;

    vectorRepo = {
      upsertChunks: jest.fn(),
      searchSimilar: jest.fn()
    } as unknown as jest.Mocked<IVectorRepository>;

    embeddingService = {
      generateEmbedding: jest.fn(),
      generateEmbeddings: jest.fn()
    } as unknown as jest.Mocked<IEmbeddingService>;

    llmService = { generateCompletion: jest.fn() } as unknown as jest.Mocked<ILLMService>;

    logger = {
      debug: jest.fn(),
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn()
    } as unknown as jest.Mocked<ILogger>;

    embeddingService.generateEmbedding.mockResolvedValue(new Embedding(vector));
  });

  it('Property 5: Strict RAG enforcement returns fallback when no results', async () => {
    const agent = new Agent('tenant-1', 'agent-1', 'A', ['ks-1'], true);
    const ks = new KnowledgeSpace('tenant-1', 'ks-1', 'KS', 'web', ['https://example.com'], '2024-01-01');
    agentRepo.findByTenantAndId.mockResolvedValue(agent);
    knowledgeSpaceRepo.findByTenantAndId.mockResolvedValue(ks);
    vectorRepo.searchSimilar.mockResolvedValue([]);

    const useCase = new ChatWithAgentUseCase(
      agentRepo,
      knowledgeSpaceRepo,
      conversationRepo,
      vectorRepo,
      embeddingService,
      llmService,
      logger
    );

    const result = await useCase.execute(baseInput);

    expect(result.choices[0].message.content).toBe('このサイトには情報がありませんでした。');
    expect(conversationRepo.save).toHaveBeenCalled();
  });

  it('Property 6 & 7: Cited URLs subset of context and deduped', async () => {
    const agent = new Agent('tenant-1', 'agent-1', 'A', ['ks-1'], false);
    const ks = new KnowledgeSpace('tenant-1', 'ks-1', 'KS', 'web', ['https://example.com'], '2024-01-01');
    agentRepo.findByTenantAndId.mockResolvedValue(agent);
    knowledgeSpaceRepo.findByTenantAndId.mockResolvedValue(ks);

    const chunkA = new Chunk(
      'chunk-1',
      'tenant-1',
      'ks-1',
      'https://example.com/doc',
      'example.com',
      'Content A',
      new Embedding(vector),
      { title: 'Doc A', version: '2024-01-01' },
      new Date('2024-01-01T00:00:00.000Z')
    );
    const chunkB = new Chunk(
      'chunk-2',
      'tenant-1',
      'ks-1',
      'https://example.com/doc', // duplicate URL
      'example.com',
      'Content B',
      new Embedding(vector),
      { title: 'Doc B', version: '2024-01-01' },
      new Date('2024-01-01T00:00:00.000Z')
    );

    vectorRepo.searchSimilar.mockResolvedValue([
      { chunk: chunkA, score: 0.9 },
      { chunk: chunkB, score: 0.85 }
    ]);

    llmService.generateCompletion.mockResolvedValue('Answer');

    const useCase = new ChatWithAgentUseCase(
      agentRepo,
      knowledgeSpaceRepo,
      conversationRepo,
      vectorRepo,
      embeddingService,
      llmService,
      logger
    );

    const result = await useCase.execute(baseInput);

    expect(result.choices[0].message.cited_urls).toEqual(['https://example.com/doc']);
    // Ensure cited URL came from the context results
    expect(result.choices[0].message.cited_urls[0]).toBe(chunkA.url);
  });

  it('Property 11: Agent-KnowledgeSpace linking limits searches to linked KS', async () => {
    const agent = new Agent('tenant-1', 'agent-1', 'A', ['ks-allowed'], false);
    const ksAllowed = new KnowledgeSpace('tenant-1', 'ks-allowed', 'KS', 'web', ['https://example.com'], '2024-01-01');
    agentRepo.findByTenantAndId.mockResolvedValue(agent);
    knowledgeSpaceRepo.findByTenantAndId.mockImplementation(async (_tenantId, ksId) =>
      ksId === 'ks-allowed' ? ksAllowed : null
    );

    vectorRepo.searchSimilar.mockResolvedValue([]);
    llmService.generateCompletion.mockResolvedValue('Answer');

    const useCase = new ChatWithAgentUseCase(
      agentRepo,
      knowledgeSpaceRepo,
      conversationRepo,
      vectorRepo,
      embeddingService,
      llmService,
      logger
    );

    await useCase.execute(baseInput);

    // searchSimilar should be called exactly once for the linked KS
    expect(vectorRepo.searchSimilar).toHaveBeenCalledTimes(1);
    expect((vectorRepo.searchSimilar as jest.Mock).mock.calls[0][0].toString()).toContain('ks-allowed');
  });
});
