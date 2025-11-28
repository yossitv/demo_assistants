"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.KnowledgeSpace = void 0;
const Namespace_1 = require("../value-objects/Namespace");
class KnowledgeSpace {
    tenantId;
    knowledgeSpaceId;
    name;
    type;
    sourceUrls;
    currentVersion;
    createdAt;
    constructor(tenantId, knowledgeSpaceId, name, type, sourceUrls, currentVersion, createdAt = new Date()) {
        this.tenantId = tenantId;
        this.knowledgeSpaceId = knowledgeSpaceId;
        this.name = name;
        this.type = type;
        this.sourceUrls = sourceUrls;
        this.currentVersion = currentVersion;
        this.createdAt = createdAt;
        this.validate();
    }
    validate() {
        if (!this.tenantId || !this.knowledgeSpaceId) {
            throw new Error('KnowledgeSpace must have tenantId and knowledgeSpaceId');
        }
        if (this.sourceUrls.length === 0) {
            throw new Error('KnowledgeSpace must have at least one source URL');
        }
        if (!this.isValidVersion(this.currentVersion)) {
            throw new Error('currentVersion must be in YYYY-MM-DD format');
        }
    }
    isValidVersion(version) {
        return /^\d{4}-\d{2}-\d{2}$/.test(version);
    }
    getNamespace() {
        return new Namespace_1.Namespace(this.tenantId, this.knowledgeSpaceId, this.currentVersion);
    }
}
exports.KnowledgeSpace = KnowledgeSpace;
//# sourceMappingURL=KnowledgeSpace.js.map