"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.splitAnswerIntoChunks = exports.formatSseEvent = exports.createFinalChunk = exports.createContentChunk = exports.createInitialChunk = exports.generateChunkId = exports.SSE_DONE_EVENT = void 0;
const streamingConfig_1 = require("./streamingConfig");
exports.SSE_DONE_EVENT = 'data: [DONE]\n\n';
const generateChunkId = () => `chatcmpl-${Math.random().toString(36).slice(2, 15)}`;
exports.generateChunkId = generateChunkId;
const epochSeconds = () => Math.floor(Date.now() / 1000);
const baseChunk = (id, model, created) => ({
    id,
    object: 'chat.completion.chunk',
    created: created ?? epochSeconds(),
    model,
});
const createInitialChunk = (params) => ({
    ...baseChunk(params.id, params.model, params.created),
    choices: [
        {
            index: 0,
            delta: { role: 'assistant' },
            finish_reason: null,
        },
    ],
});
exports.createInitialChunk = createInitialChunk;
const createContentChunk = (params) => ({
    ...baseChunk(params.id, params.model, params.created),
    choices: [
        {
            index: 0,
            delta: { content: params.content },
            finish_reason: null,
        },
    ],
});
exports.createContentChunk = createContentChunk;
const createFinalChunk = (params) => ({
    ...baseChunk(params.id, params.model, params.created),
    choices: [
        {
            index: 0,
            delta: {},
            finish_reason: 'stop',
        },
    ],
});
exports.createFinalChunk = createFinalChunk;
const formatSseEvent = (payload) => `data: ${JSON.stringify(payload)}\n\n`;
exports.formatSseEvent = formatSseEvent;
const splitAnswerIntoChunks = (answer, requestedChunkSize = streamingConfig_1.STREAMING_CONFIG.CHUNK_SIZE) => {
    const normalizedSize = (0, streamingConfig_1.clampChunkSize)(requestedChunkSize);
    const characters = Array.from(answer);
    if (characters.length === 0) {
        return [];
    }
    const chunks = [];
    for (let index = 0; index < characters.length; index += normalizedSize) {
        chunks.push(characters.slice(index, index + normalizedSize).join(''));
    }
    return chunks;
};
exports.splitAnswerIntoChunks = splitAnswerIntoChunks;
//# sourceMappingURL=sse.js.map