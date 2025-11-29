"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.KnowledgeSpace = void 0;
var Namespace_1 = require("../value-objects/Namespace");
var KnowledgeSpace = /** @class */ (function () {
    function KnowledgeSpace(tenantId, knowledgeSpaceId, name, type, sourceUrls, currentVersion, createdAt) {
        if (createdAt === void 0) { createdAt = new Date(); }
        this.tenantId = tenantId;
        this.knowledgeSpaceId = knowledgeSpaceId;
        this.name = name;
        this.type = type;
        this.sourceUrls = sourceUrls;
        this.currentVersion = currentVersion;
        this.createdAt = createdAt;
        this.validate();
    }
    KnowledgeSpace.prototype.validate = function () {
        if (!this.tenantId || !this.knowledgeSpaceId) {
            throw new Error('KnowledgeSpace must have tenantId and knowledgeSpaceId');
        }
        if (this.sourceUrls.length === 0) {
            throw new Error('KnowledgeSpace must have at least one source URL');
        }
        if (!this.isValidVersion(this.currentVersion)) {
            throw new Error('currentVersion must be in YYYY-MM-DD format');
        }
    };
    KnowledgeSpace.prototype.isValidVersion = function (version) {
        return /^\d{4}-\d{2}-\d{2}$/.test(version);
    };
    KnowledgeSpace.prototype.getNamespace = function () {
        return new Namespace_1.Namespace(this.tenantId, this.knowledgeSpaceId, this.currentVersion);
    };
    return KnowledgeSpace;
}());
exports.KnowledgeSpace = KnowledgeSpace;
