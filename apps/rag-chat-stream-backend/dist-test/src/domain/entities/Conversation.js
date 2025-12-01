"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Conversation = void 0;
var Conversation = /** @class */ (function () {
    function Conversation(conversationId, tenantId, agentId, userId, lastUserMessage, lastAssistantMessage, referencedUrls, createdAt, isRag) {
        if (createdAt === void 0) { createdAt = new Date(); }
        if (isRag === void 0) { isRag = true; }
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
    return Conversation;
}());
exports.Conversation = Conversation;
