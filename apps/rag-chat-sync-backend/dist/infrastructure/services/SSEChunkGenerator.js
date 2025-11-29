"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SSEChunkGenerator = void 0;
class SSEChunkGenerator {
    maxChunkBytes;
    encoder = new TextEncoder();
    constructor(maxChunkBytes = 1024) {
        if (maxChunkBytes <= 0) {
            throw new Error('maxChunkBytes must be greater than 0');
        }
        this.maxChunkBytes = maxChunkBytes;
    }
    generateFromText(content, metadata, options = {}) {
        const created = metadata.created ?? Math.floor(Date.now() / 1000);
        const includeDoneMessage = options.includeDoneMessage !== false;
        const chunks = [];
        chunks.push(this.formatChunk(this.buildChunk(metadata.id, metadata.model, created, { role: 'assistant' })));
        for (const part of this.splitUtf8Safe(content)) {
            chunks.push(this.formatChunk(this.buildChunk(metadata.id, metadata.model, created, { content: part })));
        }
        const finalDelta = {};
        if (options.citedUrls && options.citedUrls.length > 0) {
            finalDelta.cited_urls = options.citedUrls;
        }
        chunks.push(this.formatChunk(this.buildChunk(metadata.id, metadata.model, created, finalDelta, 'stop')));
        if (includeDoneMessage) {
            chunks.push('data: [DONE]\n\n');
        }
        return chunks;
    }
    splitUtf8Safe(content) {
        if (!content) {
            return [];
        }
        const parts = [];
        let current = '';
        let currentBytes = 0;
        // Avoid breaking multibyte characters across SSE payload boundaries
        for (const char of content) {
            const charBytes = this.encoder.encode(char).length;
            if (charBytes > this.maxChunkBytes) {
                throw new Error('Single character exceeds maxChunkBytes');
            }
            if (currentBytes + charBytes > this.maxChunkBytes) {
                parts.push(current);
                current = char;
                currentBytes = charBytes;
            }
            else {
                current += char;
                currentBytes += charBytes;
            }
        }
        if (current.length > 0) {
            parts.push(current);
        }
        return parts;
    }
    buildChunk(id, model, created, delta, finishReason = null) {
        return {
            id,
            object: 'chat.completion.chunk',
            created,
            model,
            choices: [
                {
                    index: 0,
                    delta,
                    finish_reason: finishReason
                }
            ]
        };
    }
    formatChunk(payload) {
        return `data: ${JSON.stringify(payload)}\n\n`;
    }
}
exports.SSEChunkGenerator = SSEChunkGenerator;
//# sourceMappingURL=SSEChunkGenerator.js.map