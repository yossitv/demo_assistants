import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';
import { QdrantClient } from '@qdrant/js-client-rest';
import OpenAI from 'openai';

// Repositories
import { IAgentRepository } from '../../domain/repositories/IAgentRepository';
import { IKnowledgeSpaceRepository } from '../../domain/repositories/IKnowledgeSpaceRepository';
import { IConversationRepository } from '../../domain/repositories/IConversationRepository';
import { IVectorRepository } from '../../domain/repositories/IVectorRepository';
import { DynamoDBAgentRepository } from '../repositories/DynamoDBAgentRepository';
import { DynamoDBKnowledgeSpaceRepository } from '../repositories/DynamoDBKnowledgeSpaceRepository';
import { DynamoDBConversationRepository } from '../repositories/DynamoDBConversationRepository';
import { QdrantVectorRepository } from '../repositories/QdrantVectorRepository';

// Services
import { IEmbeddingService } from '../../domain/services/IEmbeddingService';
import { IChunkingService } from '../../domain/services/IChunkingService';
import { ICrawlerService } from '../../domain/services/ICrawlerService';
import { ILLMService } from '../../domain/services/ILLMService';
import { ILogger } from '../../domain/services/ILogger';
import { OpenAIEmbeddingService } from '../services/OpenAIEmbeddingService';
import { TiktokenChunkingService } from '../services/TiktokenChunkingService';
import { CheerioCrawlerService } from '../services/CheerioCrawlerService';
import { OpenAILLMService } from '../services/OpenAILLMService';
import { CloudWatchLogger } from '../services/CloudWatchLogger';

// Use Cases
import { CreateKnowledgeSpaceUseCase } from '../../use-cases/CreateKnowledgeSpaceUseCase';
import { ListKnowledgeSpacesUseCase } from '../../use-cases/ListKnowledgeSpacesUseCase';
import { CreateAgentUseCase } from '../../use-cases/CreateAgentUseCase';
import { ChatWithAgentUseCase } from '../../use-cases/ChatWithAgentUseCase';

// Controllers
import { KnowledgeCreateController } from '../../adapters/controllers/KnowledgeCreateController';
import { KnowledgeListController } from '../../adapters/controllers/KnowledgeListController';
import { AgentCreateController } from '../../adapters/controllers/AgentCreateController';
import { ChatController } from '../../adapters/controllers/ChatController';

/**
 * Dependency Injection Container
 * 
 * Implements singleton pattern to manage all application dependencies.
 * Wires together infrastructure, repositories, services, use cases, and controllers
 * following Clean Architecture principles.
 */
export class DIContainer {
  private static instance: DIContainer;

  // Infrastructure clients
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
    const dynamoDBClient = new DynamoDBClient({});
    this.dynamoDB = DynamoDBDocumentClient.from(dynamoDBClient);

    this.qdrantClient = new QdrantClient({
      url: process.env.QDRANT_URL!,
      apiKey: process.env.QDRANT_API_KEY
    });

    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY!
    });

    // Initialize logger first (needed by repositories and services)
    this.logger = new CloudWatchLogger();

    // Initialize repositories (Infrastructure Layer)
    this.agentRepo = new DynamoDBAgentRepository(
      this.dynamoDB,
      process.env.AGENTS_TABLE_NAME!,
      this.logger
    );

    this.knowledgeSpaceRepo = new DynamoDBKnowledgeSpaceRepository(
      this.dynamoDB,
      process.env.KNOWLEDGE_SPACES_TABLE_NAME!,
      this.logger
    );

    this.conversationRepo = new DynamoDBConversationRepository(
      this.dynamoDB,
      process.env.CONVERSATIONS_TABLE_NAME!,
      this.logger
    );

    this.vectorRepo = new QdrantVectorRepository(this.qdrantClient, this.logger);

    // Configure retry options with logger for production monitoring
    const retryOptions = {
      maxAttempts: 3,
      initialDelayMs: 1000,
      maxDelayMs: 10000,
      logger: this.logger
    };

    // Initialize services (Infrastructure Layer)
    this.embeddingService = new OpenAIEmbeddingService(
      this.openai,
      this.logger,
      process.env.EMBEDDING_MODEL || 'text-embedding-3-small',
      retryOptions
    );

    this.chunkingService = new TiktokenChunkingService();

    this.crawlerService = new CheerioCrawlerService(retryOptions);

    this.llmService = new OpenAILLMService(
      this.openai,
      this.logger,
      process.env.LLM_MODEL || 'gpt-4',
      retryOptions
    );

    // Initialize use cases (Use Case Layer)
    this.createKnowledgeSpaceUseCase = new CreateKnowledgeSpaceUseCase(
      this.knowledgeSpaceRepo,
      this.vectorRepo,
      this.crawlerService,
      this.chunkingService,
      this.embeddingService,
      this.logger
    );

    this.listKnowledgeSpacesUseCase = new ListKnowledgeSpacesUseCase(
      this.knowledgeSpaceRepo,
      this.logger
    );

    this.createAgentUseCase = new CreateAgentUseCase(
      this.agentRepo,
      this.logger
    );

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
      this.createKnowledgeSpaceUseCase,
      this.logger
    );

    this.knowledgeListController = new KnowledgeListController(
      this.listKnowledgeSpacesUseCase,
      this.logger
    );

    this.agentCreateController = new AgentCreateController(
      this.createAgentUseCase,
      this.logger
    );

    this.chatController = new ChatController(this.chatWithAgentUseCase, this.logger);
  }

  /**
   * Get singleton instance of DIContainer
   */
  static getInstance(): DIContainer {
    if (!DIContainer.instance) {
      DIContainer.instance = new DIContainer();
    }
    return DIContainer.instance;
  }

  /**
   * Get KnowledgeCreateController instance
   */
  getKnowledgeCreateController(): KnowledgeCreateController {
    return this.knowledgeCreateController;
  }

  /**
   * Get KnowledgeListController instance
   */
  getKnowledgeListController(): KnowledgeListController {
    return this.knowledgeListController;
  }

  /**
   * Get AgentCreateController instance
   */
  getAgentCreateController(): AgentCreateController {
    return this.agentCreateController;
  }

  /**
   * Get ChatController instance
   */
  getChatController(): ChatController {
    return this.chatController;
  }
}
