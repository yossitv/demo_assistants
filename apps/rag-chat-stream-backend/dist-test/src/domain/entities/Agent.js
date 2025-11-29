"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Agent = void 0;
var Agent = /** @class */ (function () {
    function Agent(tenantId, agentId, name, knowledgeSpaceIds, strictRAG, description, createdAt) {
        if (createdAt === void 0) { createdAt = new Date(); }
        this.tenantId = tenantId;
        this.agentId = agentId;
        this.name = name;
        this.knowledgeSpaceIds = knowledgeSpaceIds;
        this.strictRAG = strictRAG;
        this.description = description;
        this.createdAt = createdAt;
        this.validate();
    }
    Agent.prototype.validate = function () {
        if (!this.tenantId || !this.agentId) {
            throw new Error('Agent must have tenantId and agentId');
        }
        if (this.knowledgeSpaceIds.length === 0) {
            throw new Error('Agent must be linked to at least one KnowledgeSpace');
        }
    };
    Agent.prototype.canAnswerQuery = function () {
        return this.knowledgeSpaceIds.length > 0;
    };
    return Agent;
}());
exports.Agent = Agent;
