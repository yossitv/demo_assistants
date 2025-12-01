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
exports.formatSSEData = exports.DONE_SSE_EVENT = exports.buildSSEHeaders = exports.SSE_HEADERS = exports.STREAM_CHUNK_SIZE = exports.resolveStreamChunkSize = exports.DEFAULT_STREAM_CHUNK_SIZE = exports.MAX_STREAM_CHUNK_SIZE = exports.MIN_STREAM_CHUNK_SIZE = void 0;
exports.MIN_STREAM_CHUNK_SIZE = 20;
exports.MAX_STREAM_CHUNK_SIZE = 50;
exports.DEFAULT_STREAM_CHUNK_SIZE = 32;
/**
 * Resolve the chunk size from an optional input, falling back to a sane default
 * while keeping the value inside the allowed bounds.
 */
var resolveStreamChunkSize = function (value) {
    var parsed = typeof value === 'number'
        ? value
        : typeof value === 'string' && value.trim() !== ''
            ? Number(value)
            : NaN;
    if (Number.isFinite(parsed) && parsed >= exports.MIN_STREAM_CHUNK_SIZE && parsed <= exports.MAX_STREAM_CHUNK_SIZE) {
        return Math.floor(parsed);
    }
    return exports.DEFAULT_STREAM_CHUNK_SIZE;
};
exports.resolveStreamChunkSize = resolveStreamChunkSize;
exports.STREAM_CHUNK_SIZE = (0, exports.resolveStreamChunkSize)(process.env.STREAM_CHUNK_SIZE);
exports.SSE_HEADERS = Object.freeze({
    'Content-Type': 'text/event-stream; charset=utf-8',
    'Cache-Control': 'no-cache',
    Connection: 'keep-alive'
});
/**
 * Build the headers for an SSE response, guaranteeing required values even when
 * caller-provided headers include conflicting keys.
 */
var buildSSEHeaders = function (additionalHeaders) {
    if (additionalHeaders === void 0) { additionalHeaders = {}; }
    return (__assign(__assign({}, additionalHeaders), exports.SSE_HEADERS));
};
exports.buildSSEHeaders = buildSSEHeaders;
exports.DONE_SSE_EVENT = 'data: [DONE]\n\n';
/**
 * Format a payload as an SSE data event (`data: <payload>\\n\\n`).
 */
var formatSSEData = function (payload) {
    var serialized = typeof payload === 'string' ? payload : JSON.stringify(payload);
    return "data: ".concat(serialized, "\n\n");
};
exports.formatSSEData = formatSSEData;
