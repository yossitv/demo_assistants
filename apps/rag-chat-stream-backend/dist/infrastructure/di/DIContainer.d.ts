import { ILogger } from '../../domain/services/ILogger';
import { DeleteAgentUseCase } from '../../use-cases/delete-agent.use-case';
import { UpdateAgentUseCase } from '../../use-cases/update-agent.use-case';
import { DeleteKnowledgeSpaceUseCase } from '../../use-cases/delete-knowledge-space.use-case';
import { KnowledgeCreateController } from '../../adapters/controllers/KnowledgeCreateController';
import { ProductKnowledgeCreateController } from '../../adapters/controllers/ProductKnowledgeCreateController';
import { KnowledgeListController } from '../../adapters/controllers/KnowledgeListController';
import { AgentCreateController } from '../../adapters/controllers/AgentCreateController';
import { ChatController } from '../../adapters/controllers/ChatController';
import { ChatCompletionsStreamController } from '../../adapters/controllers/ChatCompletionsStreamController';
/**
 * Dependency Injection Container
 *
 * Implements singleton pattern to manage all application dependencies.
 * Wires together infrastructure, repositories, services, use cases, and controllers
 * following Clean Architecture principles.
 */
export declare class DIContainer {
    private static instance;
    private readonly dynamoDB;
    private readonly qdrantClient;
    private readonly openai;
    private readonly agentRepo;
    private readonly knowledgeSpaceRepo;
    private readonly conversationRepo;
    private readonly vectorRepo;
    private readonly embeddingService;
    private readonly chunkingService;
    private readonly crawlerService;
    private readonly llmService;
    private readonly logger;
    private readonly contentExtractionService;
    private readonly createKnowledgeSpaceUseCase;
    private readonly createProductKnowledgeSpaceUseCase;
    private readonly listKnowledgeSpacesUseCase;
    private readonly createAgentUseCase;
    private readonly chatWithAgentUseCase;
    private readonly knowledgeCreateController;
    private readonly productKnowledgeCreateController;
    private readonly knowledgeListController;
    private readonly agentCreateController;
    private readonly chatController;
    private readonly chatCompletionsStreamController;
    private constructor();
    /**
     * Get singleton instance of DIContainer
     */
    static getInstance(): DIContainer;
    /**
     * Get KnowledgeCreateController instance
     */
    getKnowledgeCreateController(): KnowledgeCreateController;
    /**
     * Get ProductKnowledgeCreateController instance
     */
    getProductKnowledgeCreateController(): ProductKnowledgeCreateController;
    /**
     * Get KnowledgeListController instance
     */
    getKnowledgeListController(): KnowledgeListController;
    /**
     * Get AgentCreateController instance
     */
    getAgentCreateController(): AgentCreateController;
    /**
     * Get ChatController instance
     */
    getChatController(): ChatController;
    /**
     * Get ChatCompletionsStreamController instance
     */
    getChatCompletionsStreamController(): ChatCompletionsStreamController;
    /**
     * Get DeleteAgentUseCase instance
     */
    getDeleteAgentUseCase(): DeleteAgentUseCase;
    /**
     * Get UpdateAgentUseCase instance
     */
    getUpdateAgentUseCase(): UpdateAgentUseCase;
    /**
     * Get DeleteKnowledgeSpaceUseCase instance
     */
    getDeleteKnowledgeSpaceUseCase(): DeleteKnowledgeSpaceUseCase;
    /**
     * Get Logger instance
     */
    getLogger(): ILogger;
}
//# sourceMappingURL=DIContainer.d.ts.map