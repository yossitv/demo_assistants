"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.STREAMING_CORS_HEADERS = exports.SSE_HEADERS = exports.STREAMING_CONFIG = exports.resolveChunkSize = exports.clampChunkSize = exports.MAX_CHUNK_SIZE = exports.MIN_CHUNK_SIZE = void 0;
const cors_1 = require("./cors");
const DEFAULT_CHUNK_SIZE = 32;
exports.MIN_CHUNK_SIZE = 20;
exports.MAX_CHUNK_SIZE = 50;
const parseChunkSize = (value) => {
    if (!value) {
        return undefined;
    }
    const parsed = Number.parseInt(value, 10);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : undefined;
};
const clampChunkSize = (size) => {
    const rounded = Math.floor(size);
    return Math.min(exports.MAX_CHUNK_SIZE, Math.max(exports.MIN_CHUNK_SIZE, rounded));
};
exports.clampChunkSize = clampChunkSize;
const resolveChunkSize = (rawValue) => {
    const parsed = parseChunkSize(rawValue ?? process.env.CHUNK_SIZE);
    const baseSize = parsed ?? DEFAULT_CHUNK_SIZE;
    return (0, exports.clampChunkSize)(baseSize);
};
exports.resolveChunkSize = resolveChunkSize;
exports.STREAMING_CONFIG = {
    CHUNK_SIZE: (0, exports.resolveChunkSize)(),
    MIN_CHUNK_SIZE: exports.MIN_CHUNK_SIZE,
    MAX_CHUNK_SIZE: exports.MAX_CHUNK_SIZE,
};
exports.SSE_HEADERS = {
    'Content-Type': 'text/event-stream; charset=utf-8',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
};
exports.STREAMING_CORS_HEADERS = {
    ...cors_1.CORS_HEADERS,
    ...exports.SSE_HEADERS,
};
//# sourceMappingURL=streamingConfig.js.map