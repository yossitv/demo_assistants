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
    private readonly createKnowledgeSpaceUseCase;
    private readonly listKnowledgeSpacesUseCase;
    private readonly createAgentUseCase;
    private readonly chatWithAgentUseCase;
    private readonly knowledgeCreateController;
    private readonly knowledgeListController;
    private readonly agentCreateController;
    private readonly chatController;
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
}
//# sourceMappingURL=DIContainer.d.ts.map