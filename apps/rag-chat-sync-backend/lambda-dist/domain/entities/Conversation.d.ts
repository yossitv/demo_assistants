export declare class Conversation {
    readonly conversationId: string;
    readonly tenantId: string;
    readonly agentId: string;
    readonly userId: string;
    readonly lastUserMessage: string;
    readonly lastAssistantMessage: string;
    readonly referencedUrls: string[];
    readonly createdAt: Date;
    readonly isRag: boolean;
    constructor(conversationId: string, tenantId: string, agentId: string, userId: string, lastUserMessage: string, lastAssistantMessage: string, referencedUrls: string[], createdAt?: Date, isRag?: boolean);
}
//# sourceMappingURL=Conversation.d.ts.map