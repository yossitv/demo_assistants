"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.extractApiKeyFromHeaders = exports.normalizeApiKey = void 0;
/**
 * Normalize an API key value by trimming whitespace and stripping common auth prefixes.
 * Supports keys provided as plain strings or with prefixes like "Bearer ".
 */
var normalizeApiKey = function (value) {
    if (!value) {
        return undefined;
    }
    var trimmed = value.trim();
    if (!trimmed) {
        return undefined;
    }
    var prefixMatch = trimmed.match(/^(Bearer|ApiKey|Api-Key|Token)\s+(.+)$/i);
    var withoutPrefix = prefixMatch ? prefixMatch[2].trim() : trimmed;
    return withoutPrefix || undefined;
};
exports.normalizeApiKey = normalizeApiKey;
/**
 * Extract a normalized API key from headers, checking Authorization first, then x-api-key.
 * Also returns presence flags for logging without exposing key material.
 */
var extractApiKeyFromHeaders = function (headers) {
    var _a;
    var normalizedHeaders = Object.entries(headers !== null && headers !== void 0 ? headers : {}).reduce(function (acc, _a) {
        var key = _a[0], val = _a[1];
        acc[key.toLowerCase()] = val;
        return acc;
    }, {});
    var rawAuthorization = normalizedHeaders['authorization'];
    var rawXApiKey = normalizedHeaders['x-api-key'];
    var apiKey = (_a = (0, exports.normalizeApiKey)(rawAuthorization)) !== null && _a !== void 0 ? _a : (0, exports.normalizeApiKey)(rawXApiKey);
    return {
        apiKey: apiKey,
        hasAuthorizationHeader: !!rawAuthorization,
        hasXApiKeyHeader: !!rawXApiKey,
    };
};
exports.extractApiKeyFromHeaders = extractApiKeyFromHeaders;
