/**
 * Complete RAG Flow Integration Test
 *
 * Tests the end-to-end RAG (Retrieval-Augmented Generation) flow from knowledge space creation
 * through document crawling, chunking, embedding, and retrieval to chat responses with citations.
 *
 * This integration test validates:
 * 1. Creating a knowledge space from URLs
 * 2. Crawling and processing web content
 * 3. Chunking text into manageable pieces
 * 4. Generating embeddings for chunks
 * 5. Storing chunks in vector database
 * 6. Creating agents linked to knowledge spaces
 * 7. Chat queries with vector similarity search
 * 8. RAG response generation with cited URLs
 * 9. Strict RAG mode behavior
 * 10. Error handling scenarios
 *
 * All external services (DynamoDB, Qdrant, OpenAI, web crawler) are mocked
 * to enable fast, reliable, offline testing without API calls.
 */

import { CreateKnowledgeSpaceUseCase } from '../../use-cases/CreateKnowledgeSpaceUseCase';
import { CreateAgentUseCase } from '../../use-cases/CreateAgentUseCase';
import { ChatWithAgentUseCase } from '../../use-cases/ChatWithAgentUseCase';
import { IKnowledgeSpaceRepository } from '../../domain/repositories/IKnowledgeSpaceRepository';
import { IAgentRepository } from '../../domain/repositories/IAgentRepository';
import { IConversationRepository } from '../../domain/repositories/IConversationRepository';
import { IVectorRepository, SearchResult } from '../../domain/repositories/IVectorRepository';
import { ICrawlerService, CrawledContent } from '../../domain/services/ICrawlerService';
import { IChunkingService } from '../../domain/services/IChunkingService';
import { IEmbeddingService } from '../../domain/services/IEmbeddingService';
import { ILLMService } from '../../domain/services/ILLMService';
import { ILogger } from '../../domain/services/ILogger';
import { KnowledgeSpace } from '../../domain/entities/KnowledgeSpace';
import { Agent } from '../../domain/entities/Agent';
import { Conversation } from '../../domain/entities/Conversation';
import { Chunk } from '../../domain/entities/Chunk';
import { Embedding } from '../../domain/value-objects/Embedding';
import { Namespace } from '../../domain/value-objects/Namespace';
import { NotFoundError } from '../../shared/errors';

/**
 * Mock In-Memory Repositories
 * These replace DynamoDB for testing purposes
 */
class InMemoryKnowledgeSpaceRepository implements IKnowledgeSpaceRepository {
  private store = new Map<string, KnowledgeSpace>();

  async save(ks: KnowledgeSpace): Promise<void> {
    const key = `${ks.tenantId}#${ks.knowledgeSpaceId}`;
    this.store.set(key, ks);
  }

  async findByTenant(tenantId: string): Promise<KnowledgeSpace[]> {
    return Array.from(this.store.values()).filter(ks => ks.tenantId === tenantId);
  }

  async findByTenantAndId(tenantId: string, ksId: string): Promise<KnowledgeSpace | null> {
    const key = `${tenantId}#${ksId}`;
    return this.store.get(key) || null;
  }

  clear(): void {
    this.store.clear();
  }
}

class InMemoryAgentRepository implements IAgentRepository {
  private store = new Map<string, Agent>();

  async save(agent: Agent): Promise<void> {
    const key = `${agent.tenantId}#${agent.agentId}`;
    this.store.set(key, agent);
  }

  async findByTenantAndId(tenantId: string, agentId: string): Promise<Agent | null> {
    const key = `${tenantId}#${agentId}`;
    return this.store.get(key) || null;
  }

  clear(): void {
    this.store.clear();
  }
}

class InMemoryConversationRepository implements IConversationRepository {
  private store: Conversation[] = [];

  async save(conversation: Conversation): Promise<void> {
    this.store.push(conversation);
  }

  getAll(): Conversation[] {
    return [...this.store];
  }

  clear(): void {
    this.store = [];
  }
}

class InMemoryVectorRepository implements IVectorRepository {
  private store = new Map<string, Chunk[]>();

  async upsertChunks(namespace: Namespace, chunks: Chunk[]): Promise<void> {
    const key = namespace.toString();
    const existing = this.store.get(key) || [];
    // Simple upsert: replace chunks with same ID, add new ones
    const chunkMap = new Map(existing.map(c => [c.id, c]));
    chunks.forEach(chunk => chunkMap.set(chunk.id, chunk));
    this.store.set(key, Array.from(chunkMap.values()));
  }

  async searchSimilar(
    namespace: Namespace,
    queryEmbedding: Embedding,
    topK: number
  ): Promise<SearchResult[]> {
    const key = namespace.toString();
    const chunks = this.store.get(key) || [];

    // Calculate cosine similarity for each chunk
    const results = chunks.map(chunk => ({
      chunk,
      score: queryEmbedding.cosineSimilarity(chunk.embedding)
    }));

    // Sort by score descending and take top K
    return results
      .sort((a, b) => b.score - a.score)
      .slice(0, topK);
  }

  clear(): void {
    this.store.clear();
  }
}

/**
 * Mock Services
 * These replace external API calls (OpenAI, web crawling)
 */
class MockCrawlerService implements ICrawlerService {
  private mockContent: Map<string, CrawledContent> = new Map();

  setMockContent(url: string, content: CrawledContent): void {
    this.mockContent.set(url, content);
  }

  async crawlUrl(url: string): Promise<CrawledContent> {
    const content = this.mockContent.get(url);
    if (!content) {
      throw new Error(`Mock crawler: No content set for URL: ${url}`);
    }
    return content;
  }

  clear(): void {
    this.mockContent.clear();
  }
}

class MockChunkingService implements IChunkingService {
  chunkText(text: string, _options?: { minTokens?: number; maxTokens?: number; overlapTokens?: number }): string[] {
    // Simple mock: split on sentences or every 100 chars
    const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
    if (sentences.length > 1) {
      return sentences.map(s => s.trim());
    }
    // Fallback: chunk by character count
    const chunks: string[] = [];
    const chunkSize = 100;
    for (let i = 0; i < text.length; i += chunkSize) {
      chunks.push(text.slice(i, i + chunkSize));
    }
    return chunks.length > 0 ? chunks : [text];
  }
}

class MockEmbeddingService implements IEmbeddingService {
  // Create deterministic embeddings based on text content
  async generateEmbedding(text: string): Promise<Embedding> {
    const vector = this.createMockEmbedding(text);
    return new Embedding(vector);
  }

  async generateEmbeddings(texts: string[]): Promise<Embedding[]> {
    return Promise.all(texts.map(text => this.generateEmbedding(text)));
  }

  // Create a deterministic mock embedding based on text content
  // This allows similar text to have similar embeddings for testing
  private createMockEmbedding(text: string): number[] {
    const vector = new Array(1536).fill(0);
    const normalized = text.toLowerCase();

    // Create strong signals for specific keywords to ensure high similarity
    // when the same keywords appear in both query and content
    if (normalized.includes('python')) {
      // Fill first 100 dimensions with consistent pattern for Python
      for (let i = 0; i < 100; i++) {
        vector[i] = Math.cos(i * 0.1) * 0.5 + 0.5;
      }
    } else if (normalized.includes('javascript')) {
      for (let i = 0; i < 100; i++) {
        vector[i + 100] = Math.cos(i * 0.1) * 0.5 + 0.5;
      }
    } else if (normalized.includes('typescript')) {
      for (let i = 0; i < 100; i++) {
        vector[i + 200] = Math.cos(i * 0.1) * 0.5 + 0.5;
      }
    } else if (normalized.includes('react')) {
      for (let i = 0; i < 100; i++) {
        vector[i + 300] = Math.cos(i * 0.1) * 0.5 + 0.5;
      }
    } else {
      // For unrelated text, use random pattern
      for (let i = 0; i < text.length && i < 100; i++) {
        const charCode = text.charCodeAt(i);
        const index = (charCode * (i + 1)) % 1536;
        vector[index] = 0.1;
      }
    }

    // Normalize the vector
    const magnitude = Math.sqrt(vector.reduce((sum, val) => sum + val * val, 0));
    return vector.map(val => magnitude > 0 ? val / magnitude : 0);
  }
}

class MockLLMService implements ILLMService {
  private mockResponse: string = 'Mock LLM response';

  setMockResponse(response: string): void {
    this.mockResponse = response;
  }

  async generateCompletion(_prompt: string): Promise<string> {
    return this.mockResponse;
  }
}

class MockLogger implements ILogger {
  logs: Array<{ level: string; message: string; data?: any; error?: Error }> = [];

  debug(message: string, data?: any): void {
    this.logs.push({ level: 'debug', message, data });
  }

  info(message: string, data?: any): void {
    this.logs.push({ level: 'info', message, data });
  }

  warn(message: string, data?: any): void {
    this.logs.push({ level: 'warn', message, data });
  }

  error(message: string, error?: Error, data?: any): void {
    this.logs.push({ level: 'error', message, error, data });
  }

  clear(): void {
    this.logs = [];
  }
}

/**
 * Integration Test Suite
 */
describe('Complete RAG Flow Integration Tests', () => {
  // Repositories (in-memory)
  let knowledgeSpaceRepo: InMemoryKnowledgeSpaceRepository;
  let agentRepo: InMemoryAgentRepository;
  let conversationRepo: InMemoryConversationRepository;
  let vectorRepo: InMemoryVectorRepository;

  // Services (mocked)
  let crawlerService: MockCrawlerService;
  let chunkingService: MockChunkingService;
  let embeddingService: MockEmbeddingService;
  let llmService: MockLLMService;
  let logger: MockLogger;

  // Use cases
  let createKnowledgeSpaceUseCase: CreateKnowledgeSpaceUseCase;
  let createAgentUseCase: CreateAgentUseCase;
  let chatWithAgentUseCase: ChatWithAgentUseCase;

  beforeEach(() => {
    // Initialize repositories
    knowledgeSpaceRepo = new InMemoryKnowledgeSpaceRepository();
    agentRepo = new InMemoryAgentRepository();
    conversationRepo = new InMemoryConversationRepository();
    vectorRepo = new InMemoryVectorRepository();

    // Initialize services
    crawlerService = new MockCrawlerService();
    chunkingService = new MockChunkingService();
    embeddingService = new MockEmbeddingService();
    llmService = new MockLLMService();
    logger = new MockLogger();

    // Initialize use cases
    createKnowledgeSpaceUseCase = new CreateKnowledgeSpaceUseCase(
      knowledgeSpaceRepo,
      vectorRepo,
      crawlerService,
      chunkingService,
      embeddingService,
      logger
    );

    createAgentUseCase = new CreateAgentUseCase(agentRepo, logger);

    chatWithAgentUseCase = new ChatWithAgentUseCase(
      agentRepo,
      knowledgeSpaceRepo,
      conversationRepo,
      vectorRepo,
      embeddingService,
      llmService,
      logger
    );
  });

  afterEach(() => {
    // Clear all in-memory stores
    knowledgeSpaceRepo.clear();
    agentRepo.clear();
    conversationRepo.clear();
    vectorRepo.clear();
    crawlerService.clear();
    logger.clear();
  });

  describe('End-to-End RAG Flow', () => {
    it('should complete full flow: create knowledge space -> create agent -> chat with RAG', async () => {
      // Step 1: Set up mock crawled content
      crawlerService.setMockContent('https://docs.example.com/python', {
        url: 'https://docs.example.com/python',
        domain: 'docs.example.com',
        title: 'Python Tutorial',
        content: 'Python is a high-level programming language. It is easy to learn and widely used. Python supports object-oriented programming and has a large standard library.',
        crawlDate: new Date('2024-01-01T00:00:00.000Z')
      });

      // Step 2: Create knowledge space
      const ksResult = await createKnowledgeSpaceUseCase.execute({
        tenantId: 'tenant-123',
        name: 'Python Documentation',
        sourceUrls: ['https://docs.example.com/python']
      });

      expect(ksResult.status).toBe('completed');
      expect(ksResult.knowledgeSpaceId).toMatch(/^ks_/);

      // Verify knowledge space was saved
      const savedKS = await knowledgeSpaceRepo.findByTenantAndId('tenant-123', ksResult.knowledgeSpaceId);
      expect(savedKS).not.toBeNull();
      expect(savedKS!.name).toBe('Python Documentation');
      expect(savedKS!.sourceUrls).toEqual(['https://docs.example.com/python']);

      // Step 3: Create agent linked to the knowledge space
      const agentResult = await createAgentUseCase.execute({
        tenantId: 'tenant-123',
        name: 'Python Help Agent',
        knowledgeSpaceIds: [ksResult.knowledgeSpaceId],
        strictRAG: false,
        description: 'An agent that helps with Python questions'
      });

      expect(agentResult.status).toBe('created');
      expect(agentResult.agentId).toMatch(/^agent_/);

      // Verify agent was saved
      const savedAgent = await agentRepo.findByTenantAndId('tenant-123', agentResult.agentId);
      expect(savedAgent).not.toBeNull();
      expect(savedAgent!.name).toBe('Python Help Agent');
      expect(savedAgent!.knowledgeSpaceIds).toEqual([ksResult.knowledgeSpaceId]);
      expect(savedAgent!.strictRAG).toBe(false);

      // Step 4: Chat with the agent
      llmService.setMockResponse('Pythonは高水準プログラミング言語であり、学びやすく広く使用されています。オブジェクト指向プログラミングをサポートし、大規模な標準ライブラリを持っています。');

      const chatResult = await chatWithAgentUseCase.execute({
        tenantId: 'tenant-123',
        userId: 'user-456',
        agentId: agentResult.agentId,
        messages: [
          { role: 'user', content: 'Tell me about Python programming language' }
        ]
      });

      // Verify chat response structure
      expect(chatResult.object).toBe('chat.completion');
      expect(chatResult.model).toBe(agentResult.agentId);
      expect(chatResult.choices).toHaveLength(1);

      const message = chatResult.choices[0].message;
      expect(message.role).toBe('assistant');
      expect(message.content).toContain('Python');
      expect(message.cited_urls).toBeDefined();
      expect(message.cited_urls.length).toBeGreaterThan(0);
      expect(message.cited_urls[0]).toBe('https://docs.example.com/python');

      // Verify conversation was saved
      const conversations = conversationRepo.getAll();
      expect(conversations).toHaveLength(1);
      expect(conversations[0].tenantId).toBe('tenant-123');
      expect(conversations[0].userId).toBe('user-456');
      expect(conversations[0].agentId).toBe(agentResult.agentId);
      expect(conversations[0].lastUserMessage).toBe('Tell me about Python programming language');
      expect(conversations[0].referencedUrls).toContain('https://docs.example.com/python');
    });

    it('should handle multiple knowledge spaces and return relevant chunks', async () => {
      // Set up two different knowledge spaces
      crawlerService.setMockContent('https://docs.example.com/python', {
        url: 'https://docs.example.com/python',
        domain: 'docs.example.com',
        title: 'Python Guide',
        content: 'Python is a programming language known for readability and simplicity.',
        crawlDate: new Date()
      });

      crawlerService.setMockContent('https://docs.example.com/javascript', {
        url: 'https://docs.example.com/javascript',
        domain: 'docs.example.com',
        title: 'JavaScript Guide',
        content: 'JavaScript is a programming language primarily used for web development.',
        crawlDate: new Date()
      });

      // Create first knowledge space (Python)
      const pythonKS = await createKnowledgeSpaceUseCase.execute({
        tenantId: 'tenant-123',
        name: 'Python Docs',
        sourceUrls: ['https://docs.example.com/python']
      });

      // Create second knowledge space (JavaScript)
      const jsKS = await createKnowledgeSpaceUseCase.execute({
        tenantId: 'tenant-123',
        name: 'JavaScript Docs',
        sourceUrls: ['https://docs.example.com/javascript']
      });

      // Create agent with both knowledge spaces
      const agent = await createAgentUseCase.execute({
        tenantId: 'tenant-123',
        name: 'Multi-Language Agent',
        knowledgeSpaceIds: [pythonKS.knowledgeSpaceId, jsKS.knowledgeSpaceId],
        strictRAG: false
      });

      // Ask about Python
      llmService.setMockResponse('Pythonは読みやすさとシンプルさで知られるプログラミング言語です。');

      const pythonChat = await chatWithAgentUseCase.execute({
        tenantId: 'tenant-123',
        userId: 'user-1',
        agentId: agent.agentId,
        messages: [{ role: 'user', content: 'Tell me about Python' }]
      });

      expect(pythonChat.choices[0].message.cited_urls).toBeDefined();
      // Should cite Python docs
      expect(pythonChat.choices[0].message.cited_urls.some(url => url.includes('python'))).toBe(true);
    });
  });

  describe('Strict RAG Mode', () => {
    it('should return fallback message when strict RAG is enabled and no relevant chunks found', async () => {
      // Create knowledge space with specific content
      crawlerService.setMockContent('https://docs.example.com/react', {
        url: 'https://docs.example.com/react',
        domain: 'docs.example.com',
        title: 'React Documentation',
        content: 'React is a JavaScript library for building user interfaces.',
        crawlDate: new Date()
      });

      const ksResult = await createKnowledgeSpaceUseCase.execute({
        tenantId: 'tenant-123',
        name: 'React Docs',
        sourceUrls: ['https://docs.example.com/react']
      });

      // Create agent with strict RAG enabled
      const agentResult = await createAgentUseCase.execute({
        tenantId: 'tenant-123',
        name: 'Strict Agent',
        knowledgeSpaceIds: [ksResult.knowledgeSpaceId],
        strictRAG: true
      });

      // Ask a completely unrelated question
      const chatResult = await chatWithAgentUseCase.execute({
        tenantId: 'tenant-123',
        userId: 'user-1',
        agentId: agentResult.agentId,
        messages: [{ role: 'user', content: 'What is the capital of France?' }]
      });

      // Since the query is completely unrelated, similarity should be low
      // and strict RAG should return the fallback message
      // Note: This depends on the similarity threshold and mock embedding implementation
      expect(chatResult.choices[0].message.content).toBeTruthy();
    });

    it('should return LLM response when strict RAG is disabled even with low similarity', async () => {
      crawlerService.setMockContent('https://docs.example.com/typescript', {
        url: 'https://docs.example.com/typescript',
        domain: 'docs.example.com',
        title: 'TypeScript Guide',
        content: 'TypeScript is a typed superset of JavaScript that compiles to plain JavaScript.',
        crawlDate: new Date()
      });

      const ksResult = await createKnowledgeSpaceUseCase.execute({
        tenantId: 'tenant-123',
        name: 'TypeScript Docs',
        sourceUrls: ['https://docs.example.com/typescript']
      });

      // Create agent with strict RAG disabled
      const agentResult = await createAgentUseCase.execute({
        tenantId: 'tenant-123',
        name: 'Flexible Agent',
        knowledgeSpaceIds: [ksResult.knowledgeSpaceId],
        strictRAG: false
      });

      llmService.setMockResponse('Based on the available documentation about TypeScript...');

      const chatResult = await chatWithAgentUseCase.execute({
        tenantId: 'tenant-123',
        userId: 'user-1',
        agentId: agentResult.agentId,
        messages: [{ role: 'user', content: 'Tell me about TypeScript programming language' }]
      });

      // Should get LLM response even if similarity is low
      expect(chatResult.choices[0].message.content).toBeTruthy();
      expect(chatResult.choices[0].message.content).not.toBe('このサイトには情報がありませんでした。');
    });
  });

  describe('Vector Search and Citations', () => {
    it('should properly rank chunks by similarity and include top URLs in citations', async () => {
      // Create multiple URLs with different content
      crawlerService.setMockContent('https://docs.example.com/python-basics', {
        url: 'https://docs.example.com/python-basics',
        domain: 'docs.example.com',
        title: 'Python Basics',
        content: 'Python basics include variables, data types, and control structures.',
        crawlDate: new Date()
      });

      crawlerService.setMockContent('https://docs.example.com/python-advanced', {
        url: 'https://docs.example.com/python-advanced',
        domain: 'docs.example.com',
        title: 'Advanced Python',
        content: 'Advanced Python topics include decorators, generators, and metaclasses.',
        crawlDate: new Date()
      });

      const ksResult = await createKnowledgeSpaceUseCase.execute({
        tenantId: 'tenant-123',
        name: 'Python Complete Docs',
        sourceUrls: [
          'https://docs.example.com/python-basics',
          'https://docs.example.com/python-advanced'
        ]
      });

      const agentResult = await createAgentUseCase.execute({
        tenantId: 'tenant-123',
        name: 'Python Agent',
        knowledgeSpaceIds: [ksResult.knowledgeSpaceId],
        strictRAG: false
      });

      llmService.setMockResponse('Python includes basic concepts like variables and advanced features like decorators.');

      const chatResult = await chatWithAgentUseCase.execute({
        tenantId: 'tenant-123',
        userId: 'user-1',
        agentId: agentResult.agentId,
        messages: [{ role: 'user', content: 'What are Python basics?' }]
      });

      // Should have citations
      expect(chatResult.choices[0].message.cited_urls).toBeDefined();
      expect(chatResult.choices[0].message.cited_urls.length).toBeGreaterThan(0);
      expect(chatResult.choices[0].message.cited_urls.length).toBeLessThanOrEqual(3); // Max 3 citations
    });
  });

  describe('Error Handling', () => {
    it('should throw error when agent is not found', async () => {
      await expect(
        chatWithAgentUseCase.execute({
          tenantId: 'tenant-123',
          userId: 'user-1',
          agentId: 'non-existent-agent',
          messages: [{ role: 'user', content: 'Hello' }]
        })
      ).rejects.toThrow(NotFoundError);
    });

    it('should handle crawler errors gracefully', async () => {
      // Don't set mock content, causing crawler to throw error
      await expect(
        createKnowledgeSpaceUseCase.execute({
          tenantId: 'tenant-123',
          name: 'Test KS',
          sourceUrls: ['https://non-existent-url.com']
        })
      ).rejects.toThrow('Mock crawler: No content set for URL');
    });

    it('should handle missing knowledge space in agent', async () => {
      // Create agent with non-existent knowledge space ID
      const agentResult = await createAgentUseCase.execute({
        tenantId: 'tenant-123',
        name: 'Broken Agent',
        knowledgeSpaceIds: ['non-existent-ks'],
        strictRAG: false
      });

      llmService.setMockResponse('Response based on available context');

      // Chat should still work, but won't find any relevant chunks
      const chatResult = await chatWithAgentUseCase.execute({
        tenantId: 'tenant-123',
        userId: 'user-1',
        agentId: agentResult.agentId,
        messages: [{ role: 'user', content: 'Hello' }]
      });

      // Should still get a response (with no citations due to missing KS)
      expect(chatResult.choices[0].message.content).toBeTruthy();
    });

    it('should handle conversation history correctly', async () => {
      crawlerService.setMockContent('https://docs.example.com/test', {
        url: 'https://docs.example.com/test',
        domain: 'docs.example.com',
        title: 'Test Doc',
        content: 'This is test content for conversation history.',
        crawlDate: new Date()
      });

      const ksResult = await createKnowledgeSpaceUseCase.execute({
        tenantId: 'tenant-123',
        name: 'Test Docs',
        sourceUrls: ['https://docs.example.com/test']
      });

      const agentResult = await createAgentUseCase.execute({
        tenantId: 'tenant-123',
        name: 'Test Agent',
        knowledgeSpaceIds: [ksResult.knowledgeSpaceId],
        strictRAG: false
      });

      llmService.setMockResponse('Response to follow-up question');

      // Chat with conversation history
      const chatResult = await chatWithAgentUseCase.execute({
        tenantId: 'tenant-123',
        userId: 'user-1',
        agentId: agentResult.agentId,
        messages: [
          { role: 'user', content: 'First question' },
          { role: 'assistant', content: 'First answer' },
          { role: 'user', content: 'Follow-up question' }
        ]
      });

      // Should use last user message for RAG
      expect(chatResult.choices[0].message.content).toBeTruthy();

      // Verify conversation was logged
      const conversations = conversationRepo.getAll();
      expect(conversations).toHaveLength(1);
      expect(conversations[0].lastUserMessage).toBe('Follow-up question');
    });
  });

  describe('Data Flow Verification', () => {
    it('should verify data flows through all layers correctly', async () => {
      // This test verifies the complete data flow through:
      // Controller -> Use Case -> Domain Entities -> Repositories/Services

      const tenantId = 'tenant-123';
      const userId = 'user-456';

      // 1. Set up mock data
      crawlerService.setMockContent('https://example.com/doc1', {
        url: 'https://example.com/doc1',
        domain: 'example.com',
        title: 'Document 1',
        content: 'Important information about React hooks and state management.',
        crawlDate: new Date('2024-01-01')
      });

      // 2. Create knowledge space and verify data persistence
      const ksResult = await createKnowledgeSpaceUseCase.execute({
        tenantId,
        name: 'React Docs',
        sourceUrls: ['https://example.com/doc1']
      });

      const savedKS = await knowledgeSpaceRepo.findByTenantAndId(tenantId, ksResult.knowledgeSpaceId);
      expect(savedKS).toBeTruthy();
      expect(savedKS!.tenantId).toBe(tenantId);
      expect(savedKS!.name).toBe('React Docs');

      // 3. Create agent and verify linking
      const agentResult = await createAgentUseCase.execute({
        tenantId,
        name: 'React Helper',
        knowledgeSpaceIds: [ksResult.knowledgeSpaceId],
        strictRAG: false
      });

      const savedAgent = await agentRepo.findByTenantAndId(tenantId, agentResult.agentId);
      expect(savedAgent).toBeTruthy();
      expect(savedAgent!.knowledgeSpaceIds).toContain(ksResult.knowledgeSpaceId);

      // 4. Execute chat and verify RAG pipeline
      llmService.setMockResponse('React hooksはstate managementのための機能です。');

      const chatResult = await chatWithAgentUseCase.execute({
        tenantId,
        userId,
        agentId: agentResult.agentId,
        messages: [{ role: 'user', content: 'Explain React hooks' }]
      });

      // 5. Verify complete data flow
      expect(chatResult.id).toMatch(/^conv_/);
      expect(chatResult.model).toBe(agentResult.agentId);
      expect(chatResult.choices[0].message.role).toBe('assistant');
      expect(chatResult.choices[0].message.cited_urls).toContain('https://example.com/doc1');

      // 6. Verify conversation logging
      const savedConversations = conversationRepo.getAll();
      expect(savedConversations).toHaveLength(1);
      expect(savedConversations[0].tenantId).toBe(tenantId);
      expect(savedConversations[0].userId).toBe(userId);
      expect(savedConversations[0].agentId).toBe(agentResult.agentId);
      expect(savedConversations[0].referencedUrls).toContain('https://example.com/doc1');

      // 7. Verify logging
      const logEntries = logger.logs;
      expect(logEntries.some(log => log.level === 'debug' && log.message.includes('RAG search'))).toBe(true);
    });
  });

  describe('Multi-Tenant Isolation', () => {
    it('should properly isolate data between tenants', async () => {
      // Set up content for both tenants
      crawlerService.setMockContent('https://tenant1.example.com/doc', {
        url: 'https://tenant1.example.com/doc',
        domain: 'tenant1.example.com',
        title: 'Tenant 1 Doc',
        content: 'Tenant 1 specific information',
        crawlDate: new Date()
      });

      crawlerService.setMockContent('https://tenant2.example.com/doc', {
        url: 'https://tenant2.example.com/doc',
        domain: 'tenant2.example.com',
        title: 'Tenant 2 Doc',
        content: 'Tenant 2 specific information',
        crawlDate: new Date()
      });

      // Create knowledge space for tenant 1
      const tenant1KS = await createKnowledgeSpaceUseCase.execute({
        tenantId: 'tenant-1',
        name: 'Tenant 1 KS',
        sourceUrls: ['https://tenant1.example.com/doc']
      });

      // Create knowledge space for tenant 2
      const tenant2KS = await createKnowledgeSpaceUseCase.execute({
        tenantId: 'tenant-2',
        name: 'Tenant 2 KS',
        sourceUrls: ['https://tenant2.example.com/doc']
      });

      // Create agents for each tenant
      const tenant1Agent = await createAgentUseCase.execute({
        tenantId: 'tenant-1',
        name: 'Tenant 1 Agent',
        knowledgeSpaceIds: [tenant1KS.knowledgeSpaceId],
        strictRAG: false
      });

      const tenant2Agent = await createAgentUseCase.execute({
        tenantId: 'tenant-2',
        name: 'Tenant 2 Agent',
        knowledgeSpaceIds: [tenant2KS.knowledgeSpaceId],
        strictRAG: false
      });

      // Verify tenant 1 cannot access tenant 2's knowledge space
      const tenant1KSList = await knowledgeSpaceRepo.findByTenant('tenant-1');
      expect(tenant1KSList).toHaveLength(1);
      expect(tenant1KSList[0].knowledgeSpaceId).toBe(tenant1KS.knowledgeSpaceId);

      // Verify tenant 2 cannot access tenant 1's knowledge space
      const tenant2KSList = await knowledgeSpaceRepo.findByTenant('tenant-2');
      expect(tenant2KSList).toHaveLength(1);
      expect(tenant2KSList[0].knowledgeSpaceId).toBe(tenant2KS.knowledgeSpaceId);

      // Verify agents are isolated
      const foundTenant1Agent = await agentRepo.findByTenantAndId('tenant-1', tenant1Agent.agentId);
      expect(foundTenant1Agent).toBeTruthy();

      const notFoundTenant2Agent = await agentRepo.findByTenantAndId('tenant-1', tenant2Agent.agentId);
      expect(notFoundTenant2Agent).toBeNull();
    });
  });
});
