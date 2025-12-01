# Design Document

## Overview

The RAG chat backend is a serverless TypeScript application built on AWS that enables organizations to create AI agents powered by web-crawled knowledge bases. The system follows a three-tier architecture:

1. **API Layer**: AWS API Gateway with Cognito authorization
2. **Business Logic Layer**: AWS Lambda functions handling knowledge management, agent configuration, and chat operations
3. **Data Layer**: DynamoDB for metadata, Vector DB for embeddings, and CloudWatch for logging

The system implements RAG (Retrieval-Augmented Generation) by combining vector similarity search with LLM generation, ensuring responses are grounded in the provided knowledge base with source citations.

## Architecture

### Clean Architecture Overview

このシステムはクリーンアーキテクチャの原則に従い、依存関係が外側から内側（Domain）に向かうように設計されています。

```
┌─────────────────────────────────────────────────────────────┐
│                    Infrastructure Layer                      │
│  ┌────────────────────────────────────────────────────────┐ │
│  │ API Gateway │ Lambda │ DynamoDB │ Qdrant │ OpenAI     │ │
│  └────────────────────────────────────────────────────────┘ │
└────────────────────────┬────────────────────────────────────┘
                         │ depends on
┌────────────────────────▼────────────────────────────────────┐
│              Interface Adapters Layer                        │
│  ┌────────────────────────────────────────────────────────┐ │
│  │ Controllers (Lambda Handlers)                          │ │
│  │ Repositories (DynamoDB, Qdrant implementations)        │ │
│  │ External Services (OpenAI, Crawler)                    │ │
│  └────────────────────────────────────────────────────────┘ │
└────────────────────────┬────────────────────────────────────┘
                         │ depends on
┌────────────────────────▼────────────────────────────────────┐
│                   Use Cases Layer                            │
│  ┌────────────────────────────────────────────────────────┐ │
│  │ CreateKnowledgeSpaceUseCase                            │ │
│  │ ListKnowledgeSpacesUseCase                             │ │
│  │ CreateAgentUseCase                                     │ │
│  │ ChatWithAgentUseCase                                   │ │
│  └────────────────────────────────────────────────────────┘ │
└────────────────────────┬────────────────────────────────────┘
                         │ depends on
┌────────────────────────▼────────────────────────────────────┐
│                     Domain Layer                             │
│  ┌────────────────────────────────────────────────────────┐ │
│  │ Entities: Agent, KnowledgeSpace, Chunk, Conversation   │ │
│  │ Value Objects: Embedding, Namespace, ChunkMetadata     │ │
│  │ Repository Interfaces (Ports)                          │ │
│  │ Domain Services                                        │ │
│  └────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

### High-Level Architecture

```
┌─────────────┐
│   Client    │
└──────┬──────┘
       │ HTTPS + JWT
       ▼
┌─────────────────────────────────┐
│     API Gateway (REST)          │
│  - Cognito Authorizer           │
│  - /v1/knowledge/*              │
│  - /v1/agent/*                  │
│  - /v1/chat/completions         │
└────────┬────────────────────────┘
         │
         ▼
┌────────────────────────────────────────┐
│    Lambda Handlers (Controllers)       │
│  ┌──────────────────────────────────┐  │
│  │ KnowledgeCreateController        │  │
│  │ KnowledgeListController          │  │
│  │ AgentCreateController            │  │
│  │ ChatController                   │  │
│  └──────────────────────────────────┘  │
└───┬────────────────────────────────────┘
    │ calls
    ▼
┌────────────────────────────────────────┐
│          Use Cases                     │
│  ┌──────────────────────────────────┐  │
│  │ CreateKnowledgeSpaceUseCase      │  │
│  │ ListKnowledgeSpacesUseCase       │  │
│  │ CreateAgentUseCase               │  │
│  │ ChatWithAgentUseCase             │  │
│  └──────────────────────────────────┘  │
└───┬────────────────┬───────────────────┘
    │ uses           │ uses
    ▼                ▼
┌─────────┐    ┌──────────────────┐
│ Domain  │    │   Repositories   │
│Entities │    │  (Interfaces)    │
└─────────┘    └────────┬─────────┘
                        │ implemented by
                        ▼
               ┌─────────────────────┐
               │ Infrastructure      │
               │ - DynamoDB          │
               │ - Qdrant            │
               │ - OpenAI            │
               │ - CloudWatch        │
               └─────────────────────┘
```

### Technology Stack

- **Runtime**: Node.js 20.x with TypeScript
- **API Gateway**: AWS API Gateway REST API
- **Compute**: AWS Lambda
- **Authentication**: AWS Cognito User Pool with JWT
- **Metadata Storage**: AWS DynamoDB
- **Vector Storage**: Qdrant (managed or self-hosted)
- **Embeddings**: OpenAI text-embedding-3-small (1536 dimensions)
- **LLM**: OpenAI GPT-4
- **Web Crawling**: Cheerio for HTML parsing
- **Logging**: AWS CloudWatch Logs
- **Dependency Injection**: tsyringe or manual DI

### Deployment Strategy

- Infrastructure as Code using AWS CDK (TypeScript)
- Single stack deployment for MVP
- Environment variables for configuration (API keys, endpoints)
- Lambda layers for shared dependencies

## Components and Interfaces

### Layer 1: Domain Layer (Core Business Logic)

#### Domain Entities

```typescript
// src/domain/entities/Agent.ts
export class Agent {
  constructor(
    public readonly tenantId: string,
    public readonly agentId: string,
    public readonly name: string,
    public readonly knowledgeSpaceIds: string[],
    public readonly strictRAG: boolean,
    public readonly description?: string,
    public readonly createdAt: Date = new Date()
  ) {
    this.validate();
  }

  private validate(): void {
    if (!this.tenantId || !this.agentId) {
      throw new Error('Agent must have tenantId and agentId');
    }
    if (this.knowledgeSpaceIds.length === 0) {
      throw new Error('Agent must be linked to at least one KnowledgeSpace');
    }
  }

  canAnswerQuery(): boolean {
    return this.knowledgeSpaceIds.length > 0;
  }
}

// src/domain/entities/KnowledgeSpace.ts
export class KnowledgeSpace {
  constructor(
    public readonly tenantId: string,
    public readonly knowledgeSpaceId: string,
    public readonly name: string,
    public readonly type: 'web',
    public readonly sourceUrls: string[],
    public readonly currentVersion: string,
    public readonly createdAt: Date = new Date()
  ) {
    this.validate();
  }

  private validate(): void {
    if (!this.tenantId || !this.knowledgeSpaceId) {
      throw new Error('KnowledgeSpace must have tenantId and knowledgeSpaceId');
    }
    if (this.sourceUrls.length === 0) {
      throw new Error('KnowledgeSpace must have at least one source URL');
    }
    if (!this.isValidVersion(this.currentVersion)) {
      throw new Error('currentVersion must be in YYYY-MM-DD format');
    }
  }

  private isValidVersion(version: string): boolean {
    return /^\d{4}-\d{2}-\d{2}$/.test(version);
  }

  getNamespace(): Namespace {
    return new Namespace(this.tenantId, this.knowledgeSpaceId, this.currentVersion);
  }
}

// src/domain/entities/Chunk.ts
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

// src/domain/entities/Conversation.ts
export class Conversation {
  constructor(
    public readonly conversationId: string,
    public readonly tenantId: string,
    public readonly agentId: string,
    public readonly userId: string,
    public readonly lastUserMessage: string,
    public readonly lastAssistantMessage: string,
    public readonly referencedUrls: string[],
    public readonly createdAt: Date = new Date()
  ) {}
}
```

#### Value Objects

```typescript
// src/domain/value-objects/Embedding.ts
export class Embedding {
  constructor(public readonly vector: number[]) {
    if (vector.length !== 1536) {
      throw new Error('Embedding must have 1536 dimensions');
    }
  }

  isValid(): boolean {
    return this.vector.length === 1536 && this.vector.every(v => typeof v === 'number');
  }

  cosineSimilarity(other: Embedding): number {
    let dotProduct = 0;
    let normA = 0;
    let normB = 0;
    for (let i = 0; i < this.vector.length; i++) {
      dotProduct += this.vector[i] * other.vector[i];
      normA += this.vector[i] * this.vector[i];
      normB += other.vector[i] * other.vector[i];
    }
    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
  }
}

// src/domain/value-objects/Namespace.ts
export class Namespace {
  private readonly value: string;

  constructor(
    public readonly tenantId: string,
    public readonly knowledgeSpaceId: string,
    public readonly version: string
  ) {
    this.value = `t_${tenantId}_ks_${knowledgeSpaceId}_${version}`;
  }

  toString(): string {
    return this.value;
  }
}

// src/domain/value-objects/ChunkMetadata.ts
export interface ChunkMetadata {
  title: string;
  section?: string;
  version: string;
}
```

#### Repository Interfaces (Ports)

```typescript
// src/domain/repositories/IAgentRepository.ts
export interface IAgentRepository {
  save(agent: Agent): Promise<void>;
  findByTenantAndId(tenantId: string, agentId: string): Promise<Agent | null>;
}

// src/domain/repositories/IKnowledgeSpaceRepository.ts
export interface IKnowledgeSpaceRepository {
  save(ks: KnowledgeSpace): Promise<void>;
  findByTenant(tenantId: string): Promise<KnowledgeSpace[]>;
  findByTenantAndId(tenantId: string, ksId: string): Promise<KnowledgeSpace | null>;
}

// src/domain/repositories/IConversationRepository.ts
export interface IConversationRepository {
  save(conversation: Conversation): Promise<void>;
}

// src/domain/repositories/IVectorRepository.ts
export interface IVectorRepository {
  upsertChunks(namespace: Namespace, chunks: Chunk[]): Promise<void>;
  searchSimilar(namespace: Namespace, queryEmbedding: Embedding, topK: number): Promise<SearchResult[]>;
}

export interface SearchResult {
  chunk: Chunk;
  score: number;
}
```

#### Domain Services

```typescript
// src/domain/services/ChunkingService.ts
export interface IChunkingService {
  chunkText(text: string, config: ChunkingConfig): string[];
}

export interface ChunkingConfig {
  minTokens: number;
  maxTokens: number;
  overlapTokens: number;
}

// src/domain/services/EmbeddingService.ts
export interface IEmbeddingService {
  generateEmbedding(text: string): Promise<Embedding>;
  generateEmbeddings(texts: string[]): Promise<Embedding[]>;
}

// src/domain/services/CrawlerService.ts
export interface ICrawlerService {
  crawlUrl(url: string): Promise<CrawledContent>;
}

export interface CrawledContent {
  url: string;
  domain: string;
  title: string;
  content: string;
  crawlDate: Date;
}

// src/domain/services/LLMService.ts
export interface ILLMService {
  generateCompletion(prompt: string): Promise<string>;
}
```

### Layer 2: Use Cases (Application Business Rules)

```typescript
// src/use-cases/CreateKnowledgeSpaceUseCase.ts
export class CreateKnowledgeSpaceUseCase {
  constructor(
    private readonly knowledgeSpaceRepo: IKnowledgeSpaceRepository,
    private readonly vectorRepo: IVectorRepository,
    private readonly crawlerService: ICrawlerService,
    private readonly chunkingService: IChunkingService,
    private readonly embeddingService: IEmbeddingService
  ) {}

  async execute(input: CreateKnowledgeSpaceInput): Promise<CreateKnowledgeSpaceOutput> {
    // 1. Create KnowledgeSpace entity
    const knowledgeSpace = new KnowledgeSpace(
      input.tenantId,
      this.generateId(),
      input.name,
      'web',
      input.sourceUrls,
      this.getCurrentVersion(),
      new Date()
    );

    // 2. Crawl URLs and create chunks
    const allChunks: Chunk[] = [];
    for (const url of input.sourceUrls) {
      const crawled = await this.crawlerService.crawlUrl(url);
      const textChunks = this.chunkingService.chunkText(crawled.content, {
        minTokens: 400,
        maxTokens: 600,
        overlapTokens: 75
      });

      for (const text of textChunks) {
        const embedding = await this.embeddingService.generateEmbedding(text);
        const chunk = new Chunk(
          this.generateChunkId(),
          knowledgeSpace.tenantId,
          knowledgeSpace.knowledgeSpaceId,
          crawled.url,
          crawled.domain,
          text,
          embedding,
          { title: crawled.title, version: knowledgeSpace.currentVersion },
          crawled.crawlDate
        );
        allChunks.push(chunk);
      }
    }

    // 3. Store chunks in vector DB
    await this.vectorRepo.upsertChunks(knowledgeSpace.getNamespace(), allChunks);

    // 4. Save KnowledgeSpace metadata
    await this.knowledgeSpaceRepo.save(knowledgeSpace);

    return {
      knowledgeSpaceId: knowledgeSpace.knowledgeSpaceId,
      status: 'completed'
    };
  }

  private generateId(): string {
    return `ks_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateChunkId(): string {
    return `chunk_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private getCurrentVersion(): string {
    const now = new Date();
    return now.toISOString().split('T')[0]; // YYYY-MM-DD
  }
}

export interface CreateKnowledgeSpaceInput {
  tenantId: string;
  name: string;
  sourceUrls: string[];
}

export interface CreateKnowledgeSpaceOutput {
  knowledgeSpaceId: string;
  status: 'completed';
}

// src/use-cases/ListKnowledgeSpacesUseCase.ts
export class ListKnowledgeSpacesUseCase {
  constructor(private readonly knowledgeSpaceRepo: IKnowledgeSpaceRepository) {}

  async execute(input: ListKnowledgeSpacesInput): Promise<ListKnowledgeSpacesOutput> {
    const knowledgeSpaces = await this.knowledgeSpaceRepo.findByTenant(input.tenantId);
    
    return {
      knowledgeSpaces: knowledgeSpaces.map(ks => ({
        knowledgeSpaceId: ks.knowledgeSpaceId,
        name: ks.name,
        type: ks.type,
        lastUpdatedAt: ks.createdAt.toISOString()
      }))
    };
  }
}

export interface ListKnowledgeSpacesInput {
  tenantId: string;
}

export interface ListKnowledgeSpacesOutput {
  knowledgeSpaces: Array<{
    knowledgeSpaceId: string;
    name: string;
    type: 'web';
    lastUpdatedAt: string;
  }>;
}

// src/use-cases/CreateAgentUseCase.ts
export class CreateAgentUseCase {
  constructor(private readonly agentRepo: IAgentRepository) {}

  async execute(input: CreateAgentInput): Promise<CreateAgentOutput> {
    const agent = new Agent(
      input.tenantId,
      this.generateId(),
      input.name,
      input.knowledgeSpaceIds,
      input.strictRAG,
      input.description,
      new Date()
    );

    await this.agentRepo.save(agent);

    return {
      agentId: agent.agentId,
      status: 'created'
    };
  }

  private generateId(): string {
    return `agent_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

export interface CreateAgentInput {
  tenantId: string;
  name: string;
  knowledgeSpaceIds: string[];
  strictRAG: boolean;
  description?: string;
}

export interface CreateAgentOutput {
  agentId: string;
  status: 'created';
}

// src/use-cases/ChatWithAgentUseCase.ts
export class ChatWithAgentUseCase {
  private readonly SIMILARITY_THRESHOLD = 0.35;
  private readonly TOP_K = 8;
  private readonly MAX_CONTEXT_CHUNKS = 5;
  private readonly MAX_CITED_URLS = 3;
  private readonly NO_INFO_MESSAGE = 'このサイトには情報がありませんでした。';

  constructor(
    private readonly agentRepo: IAgentRepository,
    private readonly knowledgeSpaceRepo: IKnowledgeSpaceRepository,
    private readonly conversationRepo: IConversationRepository,
    private readonly vectorRepo: IVectorRepository,
    private readonly embeddingService: IEmbeddingService,
    private readonly llmService: ILLMService,
    private readonly logger: ILogger
  ) {}

  async execute(input: ChatWithAgentInput): Promise<ChatWithAgentOutput> {
    // 1. Load agent
    const agent = await this.agentRepo.findByTenantAndId(input.tenantId, input.agentId);
    if (!agent) {
      throw new Error('Agent not found');
    }

    // 2. Extract last user message
    const lastUserMessage = this.extractLastUserMessage(input.messages);

    // 3. Generate query embedding
    const queryEmbedding = await this.embeddingService.generateEmbedding(lastUserMessage);

    // 4. Search across all linked KnowledgeSpaces
    const allResults: SearchResult[] = [];
    for (const ksId of agent.knowledgeSpaceIds) {
      const ks = await this.knowledgeSpaceRepo.findByTenantAndId(input.tenantId, ksId);
      if (!ks) continue;

      const results = await this.vectorRepo.searchSimilar(
        ks.getNamespace(),
        queryEmbedding,
        this.TOP_K
      );
      allResults.push(...results);
    }

    // 5. Filter and sort results
    const filteredResults = allResults
      .filter(r => r.score >= this.SIMILARITY_THRESHOLD)
      .sort((a, b) => b.score - a.score)
      .slice(0, this.MAX_CONTEXT_CHUNKS);

    this.logger.debug('RAG search completed', {
      tenantId: input.tenantId,
      agentId: input.agentId,
      hitCount: filteredResults.length,
      topUrls: filteredResults.slice(0, 3).map(r => r.chunk.url)
    });

    // 6. Handle strict RAG with no results
    if (agent.strictRAG && filteredResults.length === 0) {
      const conversationId = this.generateConversationId();
      const conversation = new Conversation(
        conversationId,
        input.tenantId,
        input.agentId,
        input.userId,
        lastUserMessage,
        this.NO_INFO_MESSAGE,
        [],
        new Date()
      );
      await this.conversationRepo.save(conversation);

      return {
        id: conversationId,
        object: 'chat.completion',
        model: input.agentId,
        choices: [{
          message: {
            role: 'assistant',
            content: this.NO_INFO_MESSAGE,
            cited_urls: []
          }
        }]
      };
    }

    // 7. Build context and prompt
    const contextMarkdown = this.buildContextMarkdown(filteredResults);
    const citedUrls = this.extractCitedUrls(filteredResults);
    const prompt = this.buildPrompt(contextMarkdown, input.messages, lastUserMessage);

    // 8. Generate LLM response
    const assistantMessage = await this.llmService.generateCompletion(prompt);

    // 9. Save conversation
    const conversationId = this.generateConversationId();
    const conversation = new Conversation(
      conversationId,
      input.tenantId,
      input.agentId,
      input.userId,
      lastUserMessage,
      assistantMessage,
      citedUrls,
      new Date()
    );
    await this.conversationRepo.save(conversation);

    return {
      id: conversationId,
      object: 'chat.completion',
      model: input.agentId,
      choices: [{
        message: {
          role: 'assistant',
          content: assistantMessage,
          cited_urls: citedUrls
        }
      }]
    };
  }

  private extractLastUserMessage(messages: ChatMessage[]): string {
    const userMessages = messages.filter(m => m.role === 'user');
    if (userMessages.length === 0) {
      throw new Error('No user message found');
    }
    return userMessages[userMessages.length - 1].content;
  }

  private buildContextMarkdown(results: SearchResult[]): string {
    let markdown = '# Context Documents (DO NOT DISCARD)\n\n';
    results.forEach((result, index) => {
      markdown += `${index + 1}. [${result.chunk.metadata.title}](${result.chunk.url})\n`;
      markdown += `${result.chunk.content}\n\n`;
    });
    return markdown;
  }

  private extractCitedUrls(results: SearchResult[]): string[] {
    const urls = [...new Set(results.map(r => r.chunk.url))];
    return urls.slice(0, this.MAX_CITED_URLS);
  }

  private buildPrompt(contextMarkdown: string, messages: ChatMessage[], latestUserMessage: string): string {
    const history = messages.map(m => `${m.role.toUpperCase()}: ${m.content}`).join('\n');
    
    return `SYSTEM: あなたは公式サポートAIです。
与えられたコンテキストの範囲内のみで回答してください。
コンテキストに情報がない場合は、必ず次のように答えてください：
「このサイトには情報がありませんでした。」

AGENT POLICY:
- 丁寧なビジネス口調で回答してください。
- 推測で回答しないでください。
- 箇条書きが有効な場合は箇条書きを利用してください。

CONTEXT:
${contextMarkdown}

CONVERSATION HISTORY:
${history}

USER: ${latestUserMessage}

TASK: 上記のCONTEXTの情報だけに基づいて、ユーザーの質問に日本語で回答してください。`;
  }

  private generateConversationId(): string {
    return `conv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

export interface ChatWithAgentInput {
  tenantId: string;
  userId: string;
  agentId: string;
  messages: ChatMessage[];
}

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface ChatWithAgentOutput {
  id: string;
  object: 'chat.completion';
  model: string;
  choices: Array<{
    message: {
      role: 'assistant';
      content: string;
      cited_urls: string[];
    };
  }>;
}

// src/domain/services/ILogger.ts
export interface ILogger {
  debug(message: string, context?: any): void;
  info(message: string, context?: any): void;
  error(message: string, error?: Error, context?: any): void;
}
```

### Layer 3: Interface Adapters (Controllers & Repositories)

#### Controllers (Lambda Handlers)

```typescript
// src/adapters/controllers/KnowledgeCreateController.ts
export class KnowledgeCreateController {
  constructor(private readonly useCase: CreateKnowledgeSpaceUseCase) {}

  async handle(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
    try {
      const tenantId = event.requestContext.authorizer?.claims['custom:tenant_id'];
      if (!tenantId) {
        return this.errorResponse(401, 'Unauthorized');
      }

      const body = JSON.parse(event.body || '{}');
      const { name, sourceUrls } = body;

      if (!name || !sourceUrls || !Array.isArray(sourceUrls)) {
        return this.errorResponse(400, 'Invalid request body');
      }

      const result = await this.useCase.execute({
        tenantId,
        name,
        sourceUrls
      });

      return {
        statusCode: 200,
        body: JSON.stringify(result)
      };
    } catch (error) {
      console.error('Error in KnowledgeCreateController', error);
      return this.errorResponse(500, 'Internal server error');
    }
  }

  private errorResponse(statusCode: number, message: string): APIGatewayProxyResult {
    return {
      statusCode,
      body: JSON.stringify({ error: { message } })
    };
  }
}

// src/adapters/controllers/KnowledgeListController.ts
export class KnowledgeListController {
  constructor(private readonly useCase: ListKnowledgeSpacesUseCase) {}

  async handle(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
    try {
      const tenantId = event.requestContext.authorizer?.claims['custom:tenant_id'];
      if (!tenantId) {
        return this.errorResponse(401, 'Unauthorized');
      }

      const result = await this.useCase.execute({ tenantId });

      return {
        statusCode: 200,
        body: JSON.stringify(result)
      };
    } catch (error) {
      console.error('Error in KnowledgeListController', error);
      return this.errorResponse(500, 'Internal server error');
    }
  }

  private errorResponse(statusCode: number, message: string): APIGatewayProxyResult {
    return {
      statusCode,
      body: JSON.stringify({ error: { message } })
    };
  }
}

// src/adapters/controllers/AgentCreateController.ts
export class AgentCreateController {
  constructor(private readonly useCase: CreateAgentUseCase) {}

  async handle(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
    try {
      const tenantId = event.requestContext.authorizer?.claims['custom:tenant_id'];
      if (!tenantId) {
        return this.errorResponse(401, 'Unauthorized');
      }

      const body = JSON.parse(event.body || '{}');
      const { name, knowledgeSpaceIds, strictRAG, description } = body;

      if (!name || !knowledgeSpaceIds || !Array.isArray(knowledgeSpaceIds)) {
        return this.errorResponse(400, 'Invalid request body');
      }

      const result = await this.useCase.execute({
        tenantId,
        name,
        knowledgeSpaceIds,
        strictRAG: strictRAG ?? true,
        description
      });

      return {
        statusCode: 200,
        body: JSON.stringify(result)
      };
    } catch (error) {
      console.error('Error in AgentCreateController', error);
      return this.errorResponse(500, 'Internal server error');
    }
  }

  private errorResponse(statusCode: number, message: string): APIGatewayProxyResult {
    return {
      statusCode,
      body: JSON.stringify({ error: { message } })
    };
  }
}

// src/adapters/controllers/ChatController.ts
export class ChatController {
  constructor(private readonly useCase: ChatWithAgentUseCase) {}

  async handle(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
    try {
      const tenantId = event.requestContext.authorizer?.claims['custom:tenant_id'];
      const userId = event.requestContext.authorizer?.claims['sub'];
      
      if (!tenantId || !userId) {
        return this.errorResponse(401, 'Unauthorized');
      }

      const body = JSON.parse(event.body || '{}');
      const { model, messages } = body;

      if (!model || !messages || !Array.isArray(messages)) {
        return this.errorResponse(400, 'Invalid request body');
      }

      const result = await this.useCase.execute({
        tenantId,
        userId,
        agentId: model,
        messages
      });

      return {
        statusCode: 200,
        body: JSON.stringify(result)
      };
    } catch (error) {
      console.error('Error in ChatController', error);
      return this.errorResponse(500, 'Internal server error');
    }
  }

  private errorResponse(statusCode: number, message: string): APIGatewayProxyResult {
    return {
      statusCode,
      body: JSON.stringify({ error: { message } })
    };
  }
}
```

### Layer 4: Infrastructure (External Implementations)

#### DynamoDB Tables

```typescript
// src/infrastructure/repositories/DynamoDBAgentRepository.ts
export class DynamoDBAgentRepository implements IAgentRepository {
  constructor(
    private readonly dynamoDB: DynamoDBDocumentClient,
    private readonly tableName: string
  ) {}

  async save(agent: Agent): Promise<void> {
    await this.dynamoDB.put({
      TableName: this.tableName,
      Item: {
        tenantId: agent.tenantId,
        agentId: agent.agentId,
        name: agent.name,
        description: agent.description,
        knowledgeSpaceIds: agent.knowledgeSpaceIds,
        strictRAG: agent.strictRAG,
        createdAt: agent.createdAt.toISOString()
      }
    });
  }

  async findByTenantAndId(tenantId: string, agentId: string): Promise<Agent | null> {
    const result = await this.dynamoDB.get({
      TableName: this.tableName,
      Key: { tenantId, agentId }
    });

    if (!result.Item) return null;

    return new Agent(
      result.Item.tenantId,
      result.Item.agentId,
      result.Item.name,
      result.Item.knowledgeSpaceIds,
      result.Item.strictRAG,
      result.Item.description,
      new Date(result.Item.createdAt)
    );
  }
}

// src/infrastructure/repositories/DynamoDBKnowledgeSpaceRepository.ts
export class DynamoDBKnowledgeSpaceRepository implements IKnowledgeSpaceRepository {
  constructor(
    private readonly dynamoDB: DynamoDBDocumentClient,
    private readonly tableName: string
  ) {}

  async save(ks: KnowledgeSpace): Promise<void> {
    await this.dynamoDB.put({
      TableName: this.tableName,
      Item: {
        tenantId: ks.tenantId,
        knowledgeSpaceId: ks.knowledgeSpaceId,
        name: ks.name,
        type: ks.type,
        sourceUrls: ks.sourceUrls,
        currentVersion: ks.currentVersion,
        createdAt: ks.createdAt.toISOString()
      }
    });
  }

  async findByTenant(tenantId: string): Promise<KnowledgeSpace[]> {
    const result = await this.dynamoDB.query({
      TableName: this.tableName,
      KeyConditionExpression: 'tenantId = :tenantId',
      ExpressionAttributeValues: {
        ':tenantId': tenantId
      }
    });

    return (result.Items || []).map(item => new KnowledgeSpace(
      item.tenantId,
      item.knowledgeSpaceId,
      item.name,
      item.type,
      item.sourceUrls,
      item.currentVersion,
      new Date(item.createdAt)
    ));
  }

  async findByTenantAndId(tenantId: string, ksId: string): Promise<KnowledgeSpace | null> {
    const result = await this.dynamoDB.get({
      TableName: this.tableName,
      Key: { tenantId, knowledgeSpaceId: ksId }
    });

    if (!result.Item) return null;

    return new KnowledgeSpace(
      result.Item.tenantId,
      result.Item.knowledgeSpaceId,
      result.Item.name,
      result.Item.type,
      result.Item.sourceUrls,
      result.Item.currentVersion,
      new Date(result.Item.createdAt)
    );
  }
}

// src/infrastructure/repositories/DynamoDBConversationRepository.ts
export class DynamoDBConversationRepository implements IConversationRepository {
  constructor(
    private readonly dynamoDB: DynamoDBDocumentClient,
    private readonly tableName: string
  ) {}

  async save(conversation: Conversation): Promise<void> {
    await this.dynamoDB.put({
      TableName: this.tableName,
      Item: {
        conversationId: conversation.conversationId,
        tenantId: conversation.tenantId,
        agentId: conversation.agentId,
        userId: conversation.userId,
        lastUserMessage: conversation.lastUserMessage,
        lastAssistantMessage: conversation.lastAssistantMessage,
        referencedUrls: conversation.referencedUrls,
        createdAt: conversation.createdAt.toISOString()
      }
    });
  }
}
```

**Table Schemas:**

```typescript
// Agents Table
interface AgentRecord {
  tenantId: string;        // Partition Key
  agentId: string;         // Sort Key
  name: string;
  description?: string;
  knowledgeSpaceIds: string[];
  strictRAG: boolean;
  createdAt: string;       // ISO 8601
}

// KnowledgeSpaces Table
interface KnowledgeSpaceRecord {
  tenantId: string;        // Partition Key
  knowledgeSpaceId: string; // Sort Key
  name: string;
  type: 'web';
  sourceUrls: string[];
  currentVersion: string;  // YYYY-MM-DD
  createdAt: string;       // ISO 8601
}

// Conversations Table
interface ConversationRecord {
  conversationId: string;  // Partition Key
  tenantId: string;
  agentId: string;
  userId: string;
  lastUserMessage: string;
  lastAssistantMessage: string;
  referencedUrls: string[];
  createdAt: string;       // ISO 8601
}
```

#### Vector DB Repository (Qdrant)

```typescript
// src/infrastructure/repositories/QdrantVectorRepository.ts
export class QdrantVectorRepository implements IVectorRepository {
  constructor(private readonly qdrantClient: QdrantClient) {}

  async upsertChunks(namespace: Namespace, chunks: Chunk[]): Promise<void> {
    const collectionName = namespace.toString();

    // Create collection if not exists
    await this.ensureCollection(collectionName);

    // Upsert points
    const points = chunks.map(chunk => ({
      id: chunk.id,
      vector: chunk.embedding.vector,
      payload: {
        tenantId: chunk.tenantId,
        knowledgeSpaceId: chunk.knowledgeSpaceId,
        url: chunk.url,
        domain: chunk.domain,
        crawlDate: chunk.crawlDate.toISOString(),
        content: chunk.content,
        metadata: chunk.metadata
      }
    }));

    await this.qdrantClient.upsert(collectionName, {
      wait: true,
      points
    });
  }

  async searchSimilar(namespace: Namespace, queryEmbedding: Embedding, topK: number): Promise<SearchResult[]> {
    const collectionName = namespace.toString();

    const results = await this.qdrantClient.search(collectionName, {
      vector: queryEmbedding.vector,
      limit: topK,
      with_payload: true
    });

    return results.map(result => ({
      chunk: new Chunk(
        result.id as string,
        result.payload.tenantId,
        result.payload.knowledgeSpaceId,
        result.payload.url,
        result.payload.domain,
        result.payload.content,
        new Embedding(result.vector as number[]),
        result.payload.metadata,
        new Date(result.payload.crawlDate)
      ),
      score: result.score
    }));
  }

  private async ensureCollection(collectionName: string): Promise<void> {
    try {
      await this.qdrantClient.getCollection(collectionName);
    } catch {
      await this.qdrantClient.createCollection(collectionName, {
        vectors: {
          size: 1536,
          distance: 'Cosine'
        }
      });
    }
  }
}
```

#### External Service Implementations

```typescript
// src/infrastructure/services/OpenAIEmbeddingService.ts
export class OpenAIEmbeddingService implements IEmbeddingService {
  constructor(
    private readonly openai: OpenAI,
    private readonly model: string = 'text-embedding-3-small'
  ) {}

  async generateEmbedding(text: string): Promise<Embedding> {
    const response = await this.openai.embeddings.create({
      model: this.model,
      input: text
    });
    return new Embedding(response.data[0].embedding);
  }

  async generateEmbeddings(texts: string[]): Promise<Embedding[]> {
    const response = await this.openai.embeddings.create({
      model: this.model,
      input: texts
    });
    return response.data.map(item => new Embedding(item.embedding));
  }
}

// src/infrastructure/services/TiktokenChunkingService.ts
export class TiktokenChunkingService implements IChunkingService {
  private readonly encoding: Tiktoken;

  constructor() {
    this.encoding = encoding_for_model('gpt-4');
  }

  chunkText(text: string, config: ChunkingConfig): string[] {
    const tokens = this.encoding.encode(text);
    const chunks: string[] = [];
    let i = 0;

    while (i < tokens.length) {
      const chunkSize = Math.min(config.maxTokens, tokens.length - i);
      const chunkTokens = tokens.slice(i, i + chunkSize);
      const chunkText = this.encoding.decode(chunkTokens);
      chunks.push(chunkText);

      i += chunkSize - config.overlapTokens;
    }

    return chunks;
  }
}

// src/infrastructure/services/CheerioCrawlerService.ts
export class CheerioCrawlerService implements ICrawlerService {
  async crawlUrl(url: string): Promise<CrawledContent> {
    const response = await axios.get(url);
    const $ = cheerio.load(response.data);

    // Remove script and style tags
    $('script, style').remove();

    const title = $('title').text() || 'Untitled';
    const content = $('body').text().replace(/\s+/g, ' ').trim();
    const domain = new URL(url).hostname;

    return {
      url,
      domain,
      title,
      content,
      crawlDate: new Date()
    };
  }
}

// src/infrastructure/services/OpenAILLMService.ts
export class OpenAILLMService implements ILLMService {
  constructor(
    private readonly openai: OpenAI,
    private readonly model: string = 'gpt-4'
  ) {}

  async generateCompletion(prompt: string): Promise<string> {
    const response = await this.openai.chat.completions.create({
      model: this.model,
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.7
    });

    return response.choices[0].message.content || '';
  }
}

// src/infrastructure/services/CloudWatchLogger.ts
export class CloudWatchLogger implements ILogger {
  debug(message: string, context?: any): void {
    console.log(JSON.stringify({ level: 'DEBUG', message, ...context }));
  }

  info(message: string, context?: any): void {
    console.log(JSON.stringify({ level: 'INFO', message, ...context }));
  }

  error(message: string, error?: Error, context?: any): void {
    console.error(JSON.stringify({ 
      level: 'ERROR', 
      message, 
      error: error?.message,
      stack: error?.stack,
      ...context 
    }));
  }
}
```

## Data Models

Domain modelsは上記のDomain Layerセクションで定義されています。

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system—essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: KnowledgeSpace creation produces searchable chunks

*For any* valid URL and tenant, when a KnowledgeSpace is created, then searching the corresponding vector collection should return chunks with content from that URL.

**Validates: Requirements 1.1, 1.3, 1.4, 1.5, 1.6**

### Property 2: Chunk overlap preserves context

*For any* text content that produces multiple chunks, consecutive chunks should share overlapping tokens between 50 and 100.

**Validates: Requirements 10.3**

### Property 3: Namespace isolation

*For any* two different tenants or KnowledgeSpaces, chunks stored in one namespace should never appear in search results for another namespace.

**Validates: Requirements 8.1, 8.2**

### Property 4: Authentication extraction consistency

*For any* valid Cognito JWT, extracting tenantId and userId should always produce the same values for the same token across all endpoints.

**Validates: Requirements 5.3, 5.4**

### Property 5: Strict RAG enforcement

*For any* agent with strictRAG=true, when no search results meet the similarity threshold, the response content should be exactly "このサイトには情報がありませんでした。"

**Validates: Requirements 4.10**

### Property 6: Cited URLs are subset of context

*For any* chat response with cited_urls, all URLs in cited_urls should appear in the chunks that were used as RAG context.

**Validates: Requirements 4.15**

### Property 7: Cited URLs deduplication

*For any* chat response, cited_urls should contain no duplicate URLs and should contain at most 3 URLs.

**Validates: Requirements 4.15**

### Property 8: OpenAI format compatibility

*For any* chat completion response, the response structure should be parseable by standard OpenAI client libraries (containing id, object, model, and choices fields).

**Validates: Requirements 9.2**

### Property 9: Conversation logging completeness

*For any* successful chat completion, a Conversations record should exist with matching conversationId, containing the user message, assistant message, and referenced URLs.

**Validates: Requirements 6.1, 6.2, 6.3**

### Property 10: Embedding consistency

*For any* text, generating embeddings multiple times should produce vectors with the same dimensions (1536) and high cosine similarity (>0.99).

**Validates: Requirements 1.5**

### Property 11: Agent-KnowledgeSpace linking

*For any* agent with knowledgeSpaceIds, when processing a chat request, the system should search all and only the namespaces corresponding to those knowledgeSpaceIds.

**Validates: Requirements 4.4, 4.5**

### Property 12: Token-based chunking bounds

*For any* chunk created by the chunking service, the token count should be between 400 and 600 tokens inclusive.

**Validates: Requirements 10.2**

### Property 13: CloudWatch logging presence

*For any* chat request processed, CloudWatch logs should contain entries with tenantId, agentId, latest user message, hit count, and top URLs.

**Validates: Requirements 7.1, 7.2**

## Error Handling

### Error Categories

1. **Authentication Errors (401)**
   - Invalid or missing JWT
   - Expired token
   - Missing required claims

2. **Authorization Errors (403)**
   - Tenant mismatch (accessing another tenant's resources)
   - Invalid agentId for tenant

3. **Validation Errors (400)**
   - Invalid URL format
   - Empty required fields
   - Invalid message format

4. **Not Found Errors (404)**
   - Agent not found
   - KnowledgeSpace not found

5. **External Service Errors (502/503)**
   - Vector DB unavailable
   - OpenAI API errors
   - DynamoDB throttling

6. **Internal Errors (500)**
   - Unexpected exceptions
   - Data corruption

### Error Response Format

```typescript
interface ErrorResponse {
  error: {
    code: string;
    message: string;
    details?: any;
  };
}
```

### Error Handling Strategy

**Lambda Level:**
- Wrap all handler logic in try-catch
- Log errors to CloudWatch with full context
- Return appropriate HTTP status codes
- Never expose internal implementation details

**Service Level:**
- Retry transient failures (3 attempts with exponential backoff)
- Circuit breaker for external services
- Graceful degradation where possible

**Validation:**
- Validate all inputs at API boundary
- Use Zod for runtime type validation
- Return detailed validation errors

### Specific Error Scenarios

**Crawling Failures:**
- If URL is unreachable: Return 400 with "URL not accessible"
- If HTML parsing fails: Log warning, skip URL, continue with others
- If all URLs fail: Return 400 with "No content could be crawled"

**Vector DB Failures:**
- If upsert fails: Rollback DynamoDB record, return 503
- If search fails: Return 503 with "Search service unavailable"

**LLM Failures:**
- If OpenAI API fails: Retry 3 times, then return 502
- If rate limited: Return 429 with retry-after header

**Strict RAG Edge Cases:**
- Empty knowledge base: Return fixed message
- All chunks below threshold: Return fixed message
- No chunks in namespace: Return fixed message

## Testing Strategy

### Unit Testing

**Framework:** Jest with TypeScript

**Coverage Areas:**
- Chunking logic with various text sizes
- Namespace format generation
- JWT claim extraction
- URL validation and parsing
- Error response formatting
- Markdown context building

**Example Unit Tests:**
- Test chunking produces correct overlap
- Test namespace format matches specification
- Test cited URL deduplication
- Test strict RAG fallback message
- Test OpenAI response format compatibility

### Property-Based Testing

**Framework:** fast-check (JavaScript property-based testing library)

**Configuration:**
- Minimum 100 iterations per property test
- Each test tagged with: `Feature: rag-chat-backend, Property {N}: {description}`

**Property Tests:**

1. **Property 1: KnowledgeSpace creation produces searchable chunks**
   - Generate random URLs and content
   - Create KnowledgeSpace
   - Verify search returns chunks from that content
   - Tag: `Feature: rag-chat-backend, Property 1: KnowledgeSpace creation produces searchable chunks`

2. **Property 2: Chunk overlap preserves context**
   - Generate random text of varying lengths
   - Chunk the text
   - Verify consecutive chunks overlap by 50-100 tokens
   - Tag: `Feature: rag-chat-backend, Property 2: Chunk overlap preserves context`

3. **Property 3: Namespace isolation**
   - Generate random tenant/KS combinations
   - Store chunks in different namespaces
   - Verify searches don't cross namespace boundaries
   - Tag: `Feature: rag-chat-backend, Property 3: Namespace isolation`

4. **Property 4: Authentication extraction consistency**
   - Generate random JWTs with claims
   - Extract tenantId/userId multiple times
   - Verify consistency across extractions
   - Tag: `Feature: rag-chat-backend, Property 4: Authentication extraction consistency`

5. **Property 5: Strict RAG enforcement**
   - Generate random queries with no matching content
   - Set strictRAG=true
   - Verify response is exactly the fixed message
   - Tag: `Feature: rag-chat-backend, Property 5: Strict RAG enforcement`

6. **Property 6: Cited URLs are subset of context**
   - Generate random chat scenarios
   - Verify all cited_urls appear in context chunks
   - Tag: `Feature: rag-chat-backend, Property 6: Cited URLs are subset of context`

7. **Property 7: Cited URLs deduplication**
   - Generate random context with duplicate URLs
   - Verify cited_urls has no duplicates and ≤3 items
   - Tag: `Feature: rag-chat-backend, Property 7: Cited URLs deduplication`

8. **Property 8: OpenAI format compatibility**
   - Generate random chat responses
   - Verify structure matches OpenAI schema
   - Tag: `Feature: rag-chat-backend, Property 8: OpenAI format compatibility`

9. **Property 9: Conversation logging completeness**
   - Generate random chat completions
   - Verify Conversations record exists with all fields
   - Tag: `Feature: rag-chat-backend, Property 9: Conversation logging completeness`

10. **Property 10: Embedding consistency**
    - Generate random text samples
    - Generate embeddings multiple times
    - Verify dimension=1536 and cosine similarity >0.99
    - Tag: `Feature: rag-chat-backend, Property 10: Embedding consistency`

11. **Property 11: Agent-KnowledgeSpace linking**
    - Generate random agents with KS links
    - Process chat requests
    - Verify searches hit exactly the linked namespaces
    - Tag: `Feature: rag-chat-backend, Property 11: Agent-KnowledgeSpace linking`

12. **Property 12: Token-based chunking bounds**
    - Generate random text of varying lengths
    - Chunk the text
    - Verify all chunks have 400-600 tokens
    - Tag: `Feature: rag-chat-backend, Property 12: Token-based chunking bounds`

13. **Property 13: CloudWatch logging presence**
    - Generate random chat requests
    - Process requests
    - Verify CloudWatch contains required log entries
    - Tag: `Feature: rag-chat-backend, Property 13: CloudWatch logging presence`

### Integration Testing

**Scope:**
- End-to-end API flows
- DynamoDB operations
- Vector DB operations
- OpenAI API integration

**Test Environment:**
- LocalStack for AWS services (DynamoDB, API Gateway)
- Qdrant in Docker for vector operations
- Mock OpenAI API for deterministic testing

**Key Integration Tests:**
- Complete knowledge creation flow
- Complete chat flow with RAG
- Multi-KnowledgeSpace agent queries
- Error scenarios (missing resources, service failures)

### Manual Testing Checklist

- [ ] Create KnowledgeSpace from real website
- [ ] Verify chunks in Qdrant
- [ ] Create agent linked to KnowledgeSpace
- [ ] Send chat request and verify cited URLs
- [ ] Test strict RAG with unrelated query
- [ ] Verify CloudWatch logs
- [ ] Test with invalid JWT
- [ ] Test with cross-tenant access attempt

## Implementation Notes

### Performance Considerations

**Lambda Cold Starts:**
- Keep dependencies minimal
- Use Lambda layers for shared code
- Consider provisioned concurrency for chat endpoint

**Vector Search Optimization:**
- Use approximate nearest neighbor (ANN) for speed
- Tune top_k and threshold based on quality metrics
- Consider caching frequent queries

**Chunking Performance:**
- Process URLs in parallel (Promise.all)
- Batch embedding generation (up to 100 texts per API call)
- Stream large HTML content

### Security Considerations

**API Security:**
- All endpoints behind Cognito authorizer
- Validate tenant isolation in every operation
- Sanitize URLs before crawling
- Rate limiting on API Gateway

**Data Security:**
- Encrypt DynamoDB tables at rest
- Use VPC for Vector DB if self-hosted
- Rotate OpenAI API keys regularly
- No PII in logs

**Input Validation:**
- Validate URL schemes (https only)
- Limit URL count per KnowledgeSpace (e.g., 10 max)
- Limit message length (e.g., 4000 chars)
- Sanitize HTML content

### Scalability Considerations

**Current MVP Limits:**
- Synchronous crawling (acceptable for 1-5 URLs)
- Single-region deployment
- No caching layer

**Future Enhancements:**
- Async crawling with SQS + worker Lambdas
- ElastiCache for frequent queries
- Multi-region Vector DB replication
- Streaming responses for long generations

### Monitoring and Observability

**CloudWatch Metrics:**
- Lambda invocation count, duration, errors
- DynamoDB read/write capacity
- API Gateway 4xx/5xx rates

**Custom Metrics:**
- RAG hit rate (queries with results vs. no results)
- Average cited URL count
- Embedding generation latency
- Vector search latency

**Alarms:**
- Lambda error rate > 5%
- API Gateway 5xx rate > 1%
- DynamoDB throttling events
- Vector DB connection failures

### Configuration Management

**Environment Variables:**
```typescript
interface EnvironmentConfig {
  OPENAI_API_KEY: string;
  QDRANT_URL: string;
  QDRANT_API_KEY?: string;
  AGENTS_TABLE_NAME: string;
  KNOWLEDGE_SPACES_TABLE_NAME: string;
  CONVERSATIONS_TABLE_NAME: string;
  EMBEDDING_MODEL: string; // 'text-embedding-3-small'
  LLM_MODEL: string;       // 'gpt-4'
  LOG_LEVEL: 'DEBUG' | 'INFO' | 'WARN' | 'ERROR';
  SIMILARITY_THRESHOLD: string; // '0.35'
  TOP_K: string;                // '8'
  MAX_CITED_URLS: string;       // '3'
}
```

**Deployment Stages:**
- `dev`: Debug logging, relaxed limits
- `staging`: Production-like, test data
- `prod`: Strict logging, production limits

## Dependency Injection & Composition Root

クリーンアーキテクチャでは、依存性の注入が重要です。Lambda関数のエントリーポイントで全ての依存関係を組み立てます。

```typescript
// src/infrastructure/di/container.ts
export class DIContainer {
  private static instance: DIContainer;
  
  private readonly dynamoDB: DynamoDBDocumentClient;
  private readonly qdrantClient: QdrantClient;
  private readonly openai: OpenAI;
  
  // Repositories
  private readonly agentRepo: IAgentRepository;
  private readonly knowledgeSpaceRepo: IKnowledgeSpaceRepository;
  private readonly conversationRepo: IConversationRepository;
  private readonly vectorRepo: IVectorRepository;
  
  // Services
  private readonly embeddingService: IEmbeddingService;
  private readonly chunkingService: IChunkingService;
  private readonly crawlerService: ICrawlerService;
  private readonly llmService: ILLMService;
  private readonly logger: ILogger;
  
  // Use Cases
  private readonly createKnowledgeSpaceUseCase: CreateKnowledgeSpaceUseCase;
  private readonly listKnowledgeSpacesUseCase: ListKnowledgeSpacesUseCase;
  private readonly createAgentUseCase: CreateAgentUseCase;
  private readonly chatWithAgentUseCase: ChatWithAgentUseCase;
  
  // Controllers
  private readonly knowledgeCreateController: KnowledgeCreateController;
  private readonly knowledgeListController: KnowledgeListController;
  private readonly agentCreateController: AgentCreateController;
  private readonly chatController: ChatController;

  private constructor() {
    // Initialize infrastructure clients
    this.dynamoDB = DynamoDBDocumentClient.from(new DynamoDBClient({}));
    this.qdrantClient = new QdrantClient({ url: process.env.QDRANT_URL });
    this.openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    
    // Initialize repositories (Infrastructure Layer)
    this.agentRepo = new DynamoDBAgentRepository(
      this.dynamoDB,
      process.env.AGENTS_TABLE_NAME!
    );
    this.knowledgeSpaceRepo = new DynamoDBKnowledgeSpaceRepository(
      this.dynamoDB,
      process.env.KNOWLEDGE_SPACES_TABLE_NAME!
    );
    this.conversationRepo = new DynamoDBConversationRepository(
      this.dynamoDB,
      process.env.CONVERSATIONS_TABLE_NAME!
    );
    this.vectorRepo = new QdrantVectorRepository(this.qdrantClient);
    
    // Initialize services (Infrastructure Layer)
    this.embeddingService = new OpenAIEmbeddingService(
      this.openai,
      process.env.EMBEDDING_MODEL || 'text-embedding-3-small'
    );
    this.chunkingService = new TiktokenChunkingService();
    this.crawlerService = new CheerioCrawlerService();
    this.llmService = new OpenAILLMService(
      this.openai,
      process.env.LLM_MODEL || 'gpt-4'
    );
    this.logger = new CloudWatchLogger();
    
    // Initialize use cases (Use Case Layer)
    this.createKnowledgeSpaceUseCase = new CreateKnowledgeSpaceUseCase(
      this.knowledgeSpaceRepo,
      this.vectorRepo,
      this.crawlerService,
      this.chunkingService,
      this.embeddingService
    );
    this.listKnowledgeSpacesUseCase = new ListKnowledgeSpacesUseCase(
      this.knowledgeSpaceRepo
    );
    this.createAgentUseCase = new CreateAgentUseCase(this.agentRepo);
    this.chatWithAgentUseCase = new ChatWithAgentUseCase(
      this.agentRepo,
      this.knowledgeSpaceRepo,
      this.conversationRepo,
      this.vectorRepo,
      this.embeddingService,
      this.llmService,
      this.logger
    );
    
    // Initialize controllers (Interface Adapters Layer)
    this.knowledgeCreateController = new KnowledgeCreateController(
      this.createKnowledgeSpaceUseCase
    );
    this.knowledgeListController = new KnowledgeListController(
      this.listKnowledgeSpacesUseCase
    );
    this.agentCreateController = new AgentCreateController(
      this.createAgentUseCase
    );
    this.chatController = new ChatController(this.chatWithAgentUseCase);
  }

  static getInstance(): DIContainer {
    if (!DIContainer.instance) {
      DIContainer.instance = new DIContainer();
    }
    return DIContainer.instance;
  }

  getKnowledgeCreateController(): KnowledgeCreateController {
    return this.knowledgeCreateController;
  }

  getKnowledgeListController(): KnowledgeListController {
    return this.knowledgeListController;
  }

  getAgentCreateController(): AgentCreateController {
    return this.agentCreateController;
  }

  getChatController(): ChatController {
    return this.chatController;
  }
}

// Lambda handler entry points
// src/handlers/knowledgeCreate.ts
export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  const container = DIContainer.getInstance();
  const controller = container.getKnowledgeCreateController();
  return controller.handle(event);
};

// src/handlers/knowledgeList.ts
export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  const container = DIContainer.getInstance();
  const controller = container.getKnowledgeListController();
  return controller.handle(event);
};

// src/handlers/agentCreate.ts
export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  const container = DIContainer.getInstance();
  const controller = container.getAgentCreateController();
  return controller.handle(event);
};

// src/handlers/chat.ts
export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  const container = DIContainer.getInstance();
  const controller = container.getChatController();
  return controller.handle(event);
};
```

## Directory Structure

```
src/
├── domain/                          # Domain Layer (ビジネスロジックの中核)
│   ├── entities/
│   │   ├── Agent.ts
│   │   ├── KnowledgeSpace.ts
│   │   ├── Chunk.ts
│   │   └── Conversation.ts
│   ├── value-objects/
│   │   ├── Embedding.ts
│   │   ├── Namespace.ts
│   │   └── ChunkMetadata.ts
│   ├── repositories/                # Repository interfaces (Ports)
│   │   ├── IAgentRepository.ts
│   │   ├── IKnowledgeSpaceRepository.ts
│   │   ├── IConversationRepository.ts
│   │   └── IVectorRepository.ts
│   └── services/                    # Domain service interfaces
│       ├── IChunkingService.ts
│       ├── IEmbeddingService.ts
│       ├── ICrawlerService.ts
│       ├── ILLMService.ts
│       └── ILogger.ts
│
├── use-cases/                       # Use Case Layer (アプリケーションロジック)
│   ├── CreateKnowledgeSpaceUseCase.ts
│   ├── ListKnowledgeSpacesUseCase.ts
│   ├── CreateAgentUseCase.ts
│   └── ChatWithAgentUseCase.ts
│
├── adapters/                        # Interface Adapters Layer
│   └── controllers/
│       ├── KnowledgeCreateController.ts
│       ├── KnowledgeListController.ts
│       ├── AgentCreateController.ts
│       └── ChatController.ts
│
├── infrastructure/                  # Infrastructure Layer (外部実装)
│   ├── repositories/
│   │   ├── DynamoDBAgentRepository.ts
│   │   ├── DynamoDBKnowledgeSpaceRepository.ts
│   │   ├── DynamoDBConversationRepository.ts
│   │   └── QdrantVectorRepository.ts
│   ├── services/
│   │   ├── OpenAIEmbeddingService.ts
│   │   ├── TiktokenChunkingService.ts
│   │   ├── CheerioCrawlerService.ts
│   │   ├── OpenAILLMService.ts
│   │   └── CloudWatchLogger.ts
│   └── di/
│       └── container.ts
│
├── handlers/                        # Lambda entry points
│   ├── knowledgeCreate.ts
│   ├── knowledgeList.ts
│   ├── agentCreate.ts
│   └── chat.ts
│
└── shared/                          # Shared utilities
    ├── types.ts
    └── errors.ts
```

この構造により：
- **依存関係が内側（Domain）に向かう**
- **Domain層は外部の実装に依存しない**
- **テストが容易**（モックを使った単体テスト）
- **変更に強い**（例：DynamoDBからPostgreSQLへの移行が容易）
