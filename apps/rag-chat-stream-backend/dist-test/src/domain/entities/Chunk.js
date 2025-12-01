"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Chunk = void 0;
var Chunk = /** @class */ (function () {
    function Chunk(id, tenantId, knowledgeSpaceId, url, domain, content, embedding, metadata, crawlDate) {
        this.id = id;
        this.tenantId = tenantId;
        this.knowledgeSpaceId = knowledgeSpaceId;
        this.url = url;
        this.domain = domain;
        this.content = content;
        this.embedding = embedding;
        this.metadata = metadata;
        this.crawlDate = crawlDate;
        this.validate();
    }
    Chunk.prototype.validate = function () {
        if (this.content.length === 0) {
            throw new Error('Chunk content cannot be empty');
        }
        if (!this.embedding.isValid()) {
            throw new Error('Chunk must have valid embedding');
        }
    };
    return Chunk;
}());
exports.Chunk = Chunk;
