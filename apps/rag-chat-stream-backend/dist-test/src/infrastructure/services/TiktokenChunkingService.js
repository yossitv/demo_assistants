"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TiktokenChunkingService = void 0;
var tiktoken_1 = require("tiktoken");
var errors_1 = require("../../shared/errors");
var TiktokenChunkingService = /** @class */ (function () {
    function TiktokenChunkingService() {
        this.encoding = (0, tiktoken_1.encoding_for_model)('gpt-4');
    }
    TiktokenChunkingService.prototype.chunkText = function (text, config) {
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
        var tokens = this.encoding.encode(text);
        var chunks = [];
        var i = 0;
        // Handle empty text
        if (tokens.length === 0) {
            return [''];
        }
        while (i < tokens.length) {
            // Determine the size of this chunk
            var remainingTokens = tokens.length - i;
            var chunkSize = Math.min(config.maxTokens, remainingTokens);
            // Extract and decode the chunk
            var chunkTokens = tokens.slice(i, i + chunkSize);
            var chunkBytes = this.encoding.decode(chunkTokens);
            var chunkText = new TextDecoder().decode(chunkBytes);
            chunks.push(chunkText);
            // Calculate step size: move forward by (chunkSize - overlap)
            // But ensure we always move forward by at least 1 token to avoid infinite loops
            // Also, if this is the last chunk (we've consumed all remaining tokens), break
            if (i + chunkSize >= tokens.length) {
                break; // We've reached the end
            }
            var step = Math.max(1, chunkSize - config.overlapTokens);
            i += step;
        }
        return chunks;
    };
    return TiktokenChunkingService;
}());
exports.TiktokenChunkingService = TiktokenChunkingService;
