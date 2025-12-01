"use strict";
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.splitAnswerIntoChunks = exports.formatSseEvent = exports.createFinalChunk = exports.createContentChunk = exports.createInitialChunk = exports.generateChunkId = exports.SSE_DONE_EVENT = void 0;
var streamingConfig_1 = require("./streamingConfig");
exports.SSE_DONE_EVENT = 'data: [DONE]\n\n';
var generateChunkId = function () { return "chatcmpl-".concat(Math.random().toString(36).slice(2, 15)); };
exports.generateChunkId = generateChunkId;
var epochSeconds = function () { return Math.floor(Date.now() / 1000); };
var baseChunk = function (id, model, created) { return ({
    id: id,
    object: 'chat.completion.chunk',
    created: created !== null && created !== void 0 ? created : epochSeconds(),
    model: model,
}); };
var createInitialChunk = function (params) { return (__assign(__assign({}, baseChunk(params.id, params.model, params.created)), { choices: [
        {
            index: 0,
            delta: { role: 'assistant' },
            finish_reason: null,
        },
    ] })); };
exports.createInitialChunk = createInitialChunk;
var createContentChunk = function (params) { return (__assign(__assign({}, baseChunk(params.id, params.model, params.created)), { choices: [
        {
            index: 0,
            delta: { content: params.content },
            finish_reason: null,
        },
    ] })); };
exports.createContentChunk = createContentChunk;
var createFinalChunk = function (params) { return (__assign(__assign({}, baseChunk(params.id, params.model, params.created)), { choices: [
        {
            index: 0,
            delta: {},
            finish_reason: 'stop',
        },
    ] })); };
exports.createFinalChunk = createFinalChunk;
var formatSseEvent = function (payload) { return "data: ".concat(JSON.stringify(payload), "\n\n"); };
exports.formatSseEvent = formatSseEvent;
var splitAnswerIntoChunks = function (answer, requestedChunkSize) {
    if (requestedChunkSize === void 0) { requestedChunkSize = streamingConfig_1.STREAMING_CONFIG.CHUNK_SIZE; }
    var normalizedSize = (0, streamingConfig_1.clampChunkSize)(requestedChunkSize);
    var characters = Array.from(answer);
    if (characters.length === 0) {
        return [];
    }
    var chunks = [];
    for (var index = 0; index < characters.length; index += normalizedSize) {
        chunks.push(characters.slice(index, index + normalizedSize).join(''));
    }
    return chunks;
};
exports.splitAnswerIntoChunks = splitAnswerIntoChunks;
