"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Conversation = void 0;
class Conversation {
    conversationId;
    tenantId;
    agentId;
    userId;
    lastUserMessage;
    lastAssistantMessage;
    referencedUrls;
    createdAt;
    isRag;
    constructor(conversationId, tenantId, agentId, userId, lastUserMessage, lastAssistantMessage, referencedUrls, createdAt = new Date(), isRag = true) {
        this.conversationId = conversationId;
        this.tenantId = tenantId;
        this.agentId = agentId;
        this.userId = userId;
        this.lastUserMessage = lastUserMessage;
        this.lastAssistantMessage = lastAssistantMessage;
        this.referencedUrls = referencedUrls;
        this.createdAt = createdAt;
        this.isRag = isRag;
    }
}
exports.Conversation = Conversation;
//# sourceMappingURL=Conversation.js.map