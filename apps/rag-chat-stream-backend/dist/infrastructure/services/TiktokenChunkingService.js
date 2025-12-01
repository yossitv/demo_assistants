"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TiktokenChunkingService = void 0;
const tiktoken_1 = require("tiktoken");
const errors_1 = require("../../shared/errors");
class TiktokenChunkingService {
    encoding;
    constructor() {
        this.encoding = (0, tiktoken_1.encoding_for_model)('gpt-4');
    }
    chunkText(text, config) {
        // Validate text parameter
        if (text === null || text === undefined) {
            throw new errors_1.ValidationError('Text parameter cannot be null or undefined');
        }
        // Validate config parameters
        if (config.minTokens <= 0) {
            throw new errors_1.ValidationError('minTokens must be greater than 0');
        }
        if (config.maxTokens <= config.minTokens) {
            throw new errors_1.ValidationError('maxTokens must be greater than minTokens');
        }
        if (config.overlapTokens < 0) {
            throw new errors_1.ValidationError('overlapTokens must be greater than or equal to 0');
        }
        const tokens = this.encoding.encode(text);
        const chunks = [];
        let i = 0;
        // Handle empty text
        if (tokens.length === 0) {
            return [''];
        }
        while (i < tokens.length) {
            // Determine the size of this chunk
            const remainingTokens = tokens.length - i;
            const chunkSize = Math.min(config.maxTokens, remainingTokens);
            // Extract and decode the chunk
            const chunkTokens = tokens.slice(i, i + chunkSize);
            const chunkBytes = this.encoding.decode(chunkTokens);
            const chunkText = new TextDecoder().decode(chunkBytes);
            chunks.push(chunkText);
            // Calculate step size: move forward by (chunkSize - overlap)
            // But ensure we always move forward by at least 1 token to avoid infinite loops
            // Also, if this is the last chunk (we've consumed all remaining tokens), break
            if (i + chunkSize >= tokens.length) {
                break; // We've reached the end
            }
            const step = Math.max(1, chunkSize - config.overlapTokens);
            i += step;
        }
        return chunks;
    }
}
exports.TiktokenChunkingService = TiktokenChunkingService;
//# sourceMappingURL=TiktokenChunkingService.js.map