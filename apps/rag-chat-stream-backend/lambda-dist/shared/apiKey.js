"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.extractApiKeyFromHeaders = exports.normalizeApiKey = void 0;
/**
 * Normalize an API key value by trimming whitespace and stripping common auth prefixes.
 * Supports keys provided as plain strings or with prefixes like "Bearer ".
 */
const normalizeApiKey = (value) => {
    if (!value) {
        return undefined;
    }
    const trimmed = value.trim();
    if (!trimmed) {
        return undefined;
    }
    const prefixMatch = trimmed.match(/^(Bearer|ApiKey|Api-Key|Token)\s+(.+)$/i);
    const withoutPrefix = prefixMatch ? prefixMatch[2].trim() : trimmed;
    return withoutPrefix || undefined;
};
exports.normalizeApiKey = normalizeApiKey;
/**
 * Extract a normalized API key from headers, checking Authorization first, then x-api-key.
 * Also returns presence flags for logging without exposing key material.
 */
const extractApiKeyFromHeaders = (headers) => {
    const normalizedHeaders = Object.entries(headers ?? {}).reduce((acc, [key, val]) => {
        acc[key.toLowerCase()] = val;
        return acc;
    }, {});
    const rawAuthorization = normalizedHeaders['authorization'];
    const rawXApiKey = normalizedHeaders['x-api-key'];
    const apiKey = (0, exports.normalizeApiKey)(rawAuthorization) ?? (0, exports.normalizeApiKey)(rawXApiKey);
    return {
        apiKey,
        hasAuthorizationHeader: !!rawAuthorization,
        hasXApiKeyHeader: !!rawXApiKey,
    };
};
exports.extractApiKeyFromHeaders = extractApiKeyFromHeaders;
//# sourceMappingURL=apiKey.js.map