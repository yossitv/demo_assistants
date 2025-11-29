"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DIContainer = void 0;
var client_dynamodb_1 = require("@aws-sdk/client-dynamodb");
var lib_dynamodb_1 = require("@aws-sdk/lib-dynamodb");
var js_client_rest_1 = require("@qdrant/js-client-rest");
var openai_1 = __importDefault(require("openai"));
var DynamoDBAgentRepository_1 = require("../repositories/DynamoDBAgentRepository");
var DynamoDBKnowledgeSpaceRepository_1 = require("../repositories/DynamoDBKnowledgeSpaceRepository");
var DynamoDBConversationRepository_1 = require("../repositories/DynamoDBConversationRepository");
var QdrantVectorRepository_1 = require("../repositories/QdrantVectorRepository");
var OpenAIEmbeddingService_1 = require("../services/OpenAIEmbeddingService");
var TiktokenChunkingService_1 = require("../services/TiktokenChunkingService");
var CheerioCrawlerService_1 = require("../services/CheerioCrawlerService");
var OpenAILLMService_1 = require("../services/OpenAILLMService");
var CloudWatchLogger_1 = require("../services/CloudWatchLogger");
// Use Cases
var CreateKnowledgeSpaceUseCase_1 = require("../../use-cases/CreateKnowledgeSpaceUseCase");
var ListKnowledgeSpacesUseCase_1 = require("../../use-cases/ListKnowledgeSpacesUseCase");
var CreateAgentUseCase_1 = require("../../use-cases/CreateAgentUseCase");
var ChatWithAgentUseCase_1 = require("../../use-cases/ChatWithAgentUseCase");
// Controllers
var KnowledgeCreateController_1 = require("../../adapters/controllers/KnowledgeCreateController");
var KnowledgeListController_1 = require("../../adapters/controllers/KnowledgeListController");
var AgentCreateController_1 = require("../../adapters/controllers/AgentCreateController");
var ChatController_1 = require("../../adapters/controllers/ChatController");
var ChatCompletionsStreamController_1 = require("../../adapters/controllers/ChatCompletionsStreamController");
/**
 * Dependency Injection Container
 *
 * Implements singleton pattern to manage all application dependencies.
 * Wires together infrastructure, repositories, services, use cases, and controllers
 * following Clean Architecture principles.
 */
var DIContainer = /** @class */ (function () {
    function DIContainer() {
        // Initialize infrastructure clients
        var dynamoDBClient = new client_dynamodb_1.DynamoDBClient({});
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
        var retryOptions = {
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
        this.chatCompletionsStreamController = new ChatCompletionsStreamController_1.ChatCompletionsStreamController(this.chatWithAgentUseCase, this.logger);
    }
    /**
     * Get singleton instance of DIContainer
     */
    DIContainer.getInstance = function () {
        if (!DIContainer.instance) {
            DIContainer.instance = new DIContainer();
        }
        return DIContainer.instance;
    };
    /**
     * Get KnowledgeCreateController instance
     */
    DIContainer.prototype.getKnowledgeCreateController = function () {
        return this.knowledgeCreateController;
    };
    /**
     * Get KnowledgeListController instance
     */
    DIContainer.prototype.getKnowledgeListController = function () {
        return this.knowledgeListController;
    };
    /**
     * Get AgentCreateController instance
     */
    DIContainer.prototype.getAgentCreateController = function () {
        return this.agentCreateController;
    };
    /**
     * Get ChatController instance
     */
    DIContainer.prototype.getChatController = function () {
        return this.chatController;
    };
    /**
     * Get ChatCompletionsStreamController instance
     */
    DIContainer.prototype.getChatCompletionsStreamController = function () {
        return this.chatCompletionsStreamController;
    };
    return DIContainer;
}());
exports.DIContainer = DIContainer;
