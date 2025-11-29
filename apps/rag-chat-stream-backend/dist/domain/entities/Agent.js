"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Agent = void 0;
class Agent {
    tenantId;
    agentId;
    name;
    knowledgeSpaceIds;
    strictRAG;
    description;
    createdAt;
    constructor(tenantId, agentId, name, knowledgeSpaceIds, strictRAG, description, createdAt = new Date()) {
        this.tenantId = tenantId;
        this.agentId = agentId;
        this.name = name;
        this.knowledgeSpaceIds = knowledgeSpaceIds;
        this.strictRAG = strictRAG;
        this.description = description;
        this.createdAt = createdAt;
        this.validate();
    }
    validate() {
        if (!this.tenantId || !this.agentId) {
            throw new Error('Agent must have tenantId and agentId');
        }
        if (this.knowledgeSpaceIds.length === 0) {
            throw new Error('Agent must be linked to at least one KnowledgeSpace');
        }
    }
    canAnswerQuery() {
        return this.knowledgeSpaceIds.length > 0;
    }
}
exports.Agent = Agent;
//# sourceMappingURL=Agent.js.map