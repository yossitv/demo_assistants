/**
 * Shared helpers for extracting and normalizing API keys from HTTP headers.
 */
export type HeaderMap = Record<string, string | undefined> | undefined | null;

/**
 * Normalize an API key value by trimming whitespace and stripping common auth prefixes.
 * Supports keys provided as plain strings or with prefixes like "Bearer ".
 */
export const normalizeApiKey = (value?: string | null): string | undefined => {
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

/**
 * Extract a normalized API key from headers, checking Authorization first, then x-api-key.
 * Also returns presence flags for logging without exposing key material.
 */
export const extractApiKeyFromHeaders = (headers: HeaderMap) => {
  const normalizedHeaders = Object.entries(headers ?? {}).reduce<Record<string, string | undefined>>((acc, [key, val]) => {
    acc[key.toLowerCase()] = val;
    return acc;
  }, {});

  const rawAuthorization = normalizedHeaders['authorization'];
  const rawXApiKey = normalizedHeaders['x-api-key'];

  const apiKey = normalizeApiKey(rawAuthorization) ?? normalizeApiKey(rawXApiKey);

  return {
    apiKey,
    hasAuthorizationHeader: !!rawAuthorization,
    hasXApiKeyHeader: !!rawXApiKey,
  };
};
