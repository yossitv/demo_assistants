"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Chunk = void 0;
class Chunk {
    id;
    tenantId;
    knowledgeSpaceId;
    url;
    domain;
    content;
    embedding;
    metadata;
    crawlDate;
    constructor(id, tenantId, knowledgeSpaceId, url, domain, content, embedding, metadata, crawlDate) {
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
    validate() {
        if (this.content.length === 0) {
            throw new Error('Chunk content cannot be empty');
        }
        if (!this.embedding.isValid()) {
            throw new Error('Chunk must have valid embedding');
        }
    }
}
exports.Chunk = Chunk;
//# sourceMappingURL=Chunk.js.map