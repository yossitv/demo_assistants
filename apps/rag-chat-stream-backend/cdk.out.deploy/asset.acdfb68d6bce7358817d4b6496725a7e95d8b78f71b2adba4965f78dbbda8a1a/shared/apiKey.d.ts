/**
 * Shared helpers for extracting and normalizing API keys from HTTP headers.
 */
export type HeaderMap = Record<string, string | undefined> | undefined | null;
/**
 * Normalize an API key value by trimming whitespace and stripping common auth prefixes.
 * Supports keys provided as plain strings or with prefixes like "Bearer ".
 */
export declare const normalizeApiKey: (value?: string | null) => string | undefined;
/**
 * Extract a normalized API key from headers, checking Authorization first, then x-api-key.
 * Also returns presence flags for logging without exposing key material.
 */
export declare const extractApiKeyFromHeaders: (headers: HeaderMap) => {
    apiKey: string | undefined;
    hasAuthorizationHeader: boolean;
    hasXApiKeyHeader: boolean;
};
//# sourceMappingURL=apiKey.d.ts.map