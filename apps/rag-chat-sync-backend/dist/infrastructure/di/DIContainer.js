"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DIContainer = void 0;
const client_dynamodb_1 = require("@aws-sdk/client-dynamodb");
const lib_dynamodb_1 = require("@aws-sdk/lib-dynamodb");
const js_client_rest_1 = require("@qdrant/js-client-rest");
const openai_1 = __importDefault(require("openai"));
const DynamoDBAgentRepository_1 = require("../repositories/DynamoDBAgentRepository");
const DynamoDBKnowledgeSpaceRepository_1 = require("../repositories/DynamoDBKnowledgeSpaceRepository");
const DynamoDBConversationRepository_1 = require("../repositories/DynamoDBConversationRepository");
const QdrantVectorRepository_1 = require("../repositories/QdrantVectorRepository");
const OpenAIEmbeddingService_1 = require("../services/OpenAIEmbeddingService");
const TiktokenChunkingService_1 = require("../services/TiktokenChunkingService");
const CheerioCrawlerService_1 = require("../services/CheerioCrawlerService");
const OpenAILLMService_1 = require("../services/OpenAILLMService");
const CloudWatchLogger_1 = require("../services/CloudWatchLogger");
// Use Cases
const CreateKnowledgeSpaceUseCase_1 = require("../../use-cases/CreateKnowledgeSpaceUseCase");
const ListKnowledgeSpacesUseCase_1 = require("../../use-cases/ListKnowledgeSpacesUseCase");
const CreateAgentUseCase_1 = require("../../use-cases/CreateAgentUseCase");
const ChatWithAgentUseCase_1 = require("../../use-cases/ChatWithAgentUseCase");
// Controllers
const KnowledgeCreateController_1 = require("../../adapters/controllers/KnowledgeCreateController");
const KnowledgeListController_1 = require("../../adapters/controllers/KnowledgeListController");
const AgentCreateController_1 = require("../../adapters/controllers/AgentCreateController");
const ChatController_1 = require("../../adapters/controllers/ChatController");
const ChatCompletionsStreamController_1 = require("../../adapters/controllers/ChatCompletionsStreamController");
/**
 * Dependency Injection Container
 *
 * Implements singleton pattern to manage all application dependencies.
 * Wires together infrastructure, repositories, services, use cases, and controllers
 * following Clean Architecture principles.
 */
class DIContainer {
    static instance;
    // Infrastructure clients
    dynamoDB;
    qdrantClient;
    openai;
    // Repositories
    agentRepo;
    knowledgeSpaceRepo;
    conversationRepo;
    vectorRepo;
    // Services
    embeddingService;
    chunkingService;
    crawlerService;
    llmService;
    logger;
    // Use Cases
    createKnowledgeSpaceUseCase;
    listKnowledgeSpacesUseCase;
    createAgentUseCase;
    chatWithAgentUseCase;
    // Controllers
    knowledgeCreateController;
    knowledgeListController;
    agentCreateController;
    chatController;
    constructor() {
        // Initialize infrastructure clients
        const dynamoDBClient = new client_dynamodb_1.DynamoDBClient({});
        this.dynamoDB = lib_dynamodb_1.DynamoDBDocumentClient.from(dynamoDBClient);
        this.qdrantClient = new js_client_rest_1.QdrantClient({
            url: process.env.QDRANT_URL,
            apiKey: process.env.QDRANT_API_KEY
        });
        this.openai = new openai_1.default({
            apiKey: process.env.OPENAI_API_KEY
        });
        // Initialize logger first (needed by repositories and services)
        this.logger = new CloudWatchLogger_1.CloudWatchLogger();
        // Initialize repositories (Infrastructure Layer)
        this.agentRepo = new DynamoDBAgentRepository_1.DynamoDBAgentRepository(this.dynamoDB, process.env.AGENTS_TABLE_NAME, this.logger);
        this.knowledgeSpaceRepo = new DynamoDBKnowledgeSpaceRepository_1.DynamoDBKnowledgeSpaceRepository(this.dynamoDB, process.env.KNOWLEDGE_SPACES_TABLE_NAME, this.logger);
        this.conversationRepo = new DynamoDBConversationRepository_1.DynamoDBConversationRepository(this.dynamoDB, process.env.CONVERSATIONS_TABLE_NAME, this.logger);
        this.vectorRepo = new QdrantVectorRepository_1.QdrantVectorRepository(this.qdrantClient, this.logger);
        // Configure retry options with logger for production monitoring
        const retryOptions = {
            maxAttempts: 3,
            initialDelayMs: 1000,
            maxDelayMs: 10000,
            logger: this.logger
        };
        // Initialize services (Infrastructure Layer)
        this.embeddingService = new OpenAIEmbeddingService_1.OpenAIEmbeddingService(this.openai, this.logger, process.env.EMBEDDING_MODEL || 'text-embedding-3-small', retryOptions);
        this.chunkingService = new TiktokenChunkingService_1.TiktokenChunkingService();
        this.crawlerService = new CheerioCrawlerService_1.CheerioCrawlerService(retryOptions);
        this.llmService = new OpenAILLMService_1.OpenAILLMService(this.openai, this.logger, process.env.LLM_MODEL || 'gpt-4', retryOptions);
        // Initialize use cases (Use Case Layer)
        this.createKnowledgeSpaceUseCase = new CreateKnowledgeSpaceUseCase_1.CreateKnowledgeSpaceUseCase(this.knowledgeSpaceRepo, this.vectorRepo, this.crawlerService, this.chunkingService, this.embeddingService, this.logger);
        this.listKnowledgeSpacesUseCase = new ListKnowledgeSpacesUseCase_1.ListKnowledgeSpacesUseCase(this.knowledgeSpaceRepo, this.logger);
        this.createAgentUseCase = new CreateAgentUseCase_1.CreateAgentUseCase(this.agentRepo, this.logger);
        this.chatWithAgentUseCase = new ChatWithAgentUseCase_1.ChatWithAgentUseCase(this.agentRepo, this.knowledgeSpaceRepo, this.conversationRepo, this.vectorRepo, this.embeddingService, this.llmService, this.logger);
        // Initialize controllers (Interface Adapters Layer)
        this.knowledgeCreateController = new KnowledgeCreateController_1.KnowledgeCreateController(this.createKnowledgeSpaceUseCase, this.logger);
        this.knowledgeListController = new KnowledgeListController_1.KnowledgeListController(this.listKnowledgeSpacesUseCase, this.logger);
        this.agentCreateController = new AgentCreateController_1.AgentCreateController(this.createAgentUseCase, this.logger);
        this.chatController = new ChatController_1.ChatController(this.chatWithAgentUseCase, this.logger);
    }
    /**
     * Get singleton instance of DIContainer
     */
    static getInstance() {
        if (!DIContainer.instance) {
            DIContainer.instance = new DIContainer();
        }
        return DIContainer.instance;
    }
    /**
     * Get KnowledgeCreateController instance
     */
    getKnowledgeCreateController() {
        return this.knowledgeCreateController;
    }
    /**
     * Get KnowledgeListController instance
     */
    getKnowledgeListController() {
        return this.knowledgeListController;
    }
    /**
     * Get AgentCreateController instance
     */
    getAgentCreateController() {
        return this.agentCreateController;
    }
    /**
     * Get ChatController instance
     */
    getChatController() {
        return this.chatController;
    }
    chatCompletionsStreamController;
    /**
     * Get ChatCompletionsStreamController instance
     */
    getChatCompletionsStreamController() {
        if (!this.chatCompletionsStreamController) {
            this.chatCompletionsStreamController = new ChatCompletionsStreamController_1.ChatCompletionsStreamController(this.chatWithAgentUseCase, this.logger);
        }
        return this.chatCompletionsStreamController;
    }
}
exports.DIContainer = DIContainer;
//# sourceMappingURL=DIContainer.js.map