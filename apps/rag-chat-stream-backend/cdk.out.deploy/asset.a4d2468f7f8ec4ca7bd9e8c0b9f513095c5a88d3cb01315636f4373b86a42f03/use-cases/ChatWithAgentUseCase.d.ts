import { IAgentRepository } from '../domain/repositories/IAgentRepository';
import { IKnowledgeSpaceRepository } from '../domain/repositories/IKnowledgeSpaceRepository';
import { IConversationRepository } from '../domain/repositories/IConversationRepository';
import { IVectorRepository } from '../domain/repositories/IVectorRepository';
import { IEmbeddingService } from '../domain/services/IEmbeddingService';
import { ILLMService } from '../domain/services/ILLMService';
import { ILogger } from '../domain/services/ILogger';
export interface ChatMessage {
    role: 'system' | 'user' | 'assistant';
    content: string;
}
export interface ChatWithAgentInput {
    tenantId: string;
    userId: string;
    agentId: string;
    messages: ChatMessage[];
    requestId?: string;
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
            isRag: boolean;
        };
    }>;
}
export declare class ChatWithAgentUseCase {
    private readonly agentRepo;
    private readonly knowledgeSpaceRepo;
    private readonly conversationRepo;
    private readonly vectorRepo;
    private readonly embeddingService;
    private readonly llmService;
    private readonly logger;
    private readonly SIMILARITY_THRESHOLD;
    private readonly TOP_K;
    private readonly MAX_CONTEXT_CHUNKS;
    private readonly MAX_CITED_URLS;
    private readonly NO_INFO_MESSAGE;
    private readonly structuredLogger?;
    constructor(agentRepo: IAgentRepository, knowledgeSpaceRepo: IKnowledgeSpaceRepository, conversationRepo: IConversationRepository, vectorRepo: IVectorRepository, embeddingService: IEmbeddingService, llmService: ILLMService, logger: ILogger);
    execute(input: ChatWithAgentInput): Promise<ChatWithAgentOutput>;
    private extractLastUserMessage;
    private buildContextMarkdown;
    private extractCitedUrls;
    private buildPrompt;
    private generateConversationId;
}
//# sourceMappingURL=ChatWithAgentUseCase.d.ts.map