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
exports.STREAMING_CORS_HEADERS = exports.SSE_HEADERS = exports.STREAMING_CONFIG = exports.resolveChunkSize = exports.clampChunkSize = exports.MAX_CHUNK_SIZE = exports.MIN_CHUNK_SIZE = void 0;
var cors_1 = require("./cors");
var DEFAULT_CHUNK_SIZE = 32;
exports.MIN_CHUNK_SIZE = 20;
exports.MAX_CHUNK_SIZE = 50;
var parseChunkSize = function (value) {
    if (!value) {
        return undefined;
    }
    var parsed = Number.parseInt(value, 10);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : undefined;
};
var clampChunkSize = function (size) {
    var rounded = Math.floor(size);
    return Math.min(exports.MAX_CHUNK_SIZE, Math.max(exports.MIN_CHUNK_SIZE, rounded));
};
exports.clampChunkSize = clampChunkSize;
var resolveChunkSize = function (rawValue) {
    var parsed = parseChunkSize(rawValue !== null && rawValue !== void 0 ? rawValue : process.env.CHUNK_SIZE);
    var baseSize = parsed !== null && parsed !== void 0 ? parsed : DEFAULT_CHUNK_SIZE;
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
exports.STREAMING_CORS_HEADERS = __assign(__assign({}, cors_1.CORS_HEADERS), exports.SSE_HEADERS);
