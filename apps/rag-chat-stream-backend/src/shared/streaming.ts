export const MIN_STREAM_CHUNK_SIZE = 20;
export const MAX_STREAM_CHUNK_SIZE = 50;
export const DEFAULT_STREAM_CHUNK_SIZE = 32;

/**
 * Resolve the chunk size from an optional input, falling back to a sane default
 * while keeping the value inside the allowed bounds.
 */
export const resolveStreamChunkSize = (value?: string | number | null): number => {
  const parsed = typeof value === 'number'
    ? value
    : typeof value === 'string' && value.trim() !== ''
      ? Number(value)
      : NaN;

  if (Number.isFinite(parsed) && parsed >= MIN_STREAM_CHUNK_SIZE && parsed <= MAX_STREAM_CHUNK_SIZE) {
    return Math.floor(parsed);
  }

  return DEFAULT_STREAM_CHUNK_SIZE;
};

export const STREAM_CHUNK_SIZE = resolveStreamChunkSize(process.env.STREAM_CHUNK_SIZE);

export const SSE_HEADERS = Object.freeze({
  'Content-Type': 'text/event-stream; charset=utf-8',
  'Cache-Control': 'no-cache',
  Connection: 'keep-alive'
});

/**
 * Build the headers for an SSE response, guaranteeing required values even when
 * caller-provided headers include conflicting keys.
 */
export const buildSSEHeaders = (additionalHeaders: Record<string, string> = {}): Record<string, string> => ({
  ...additionalHeaders,
  ...SSE_HEADERS
});

export const DONE_SSE_EVENT = 'data: [DONE]\n\n';

/**
 * Format a payload as an SSE data event (`data: <payload>\\n\\n`).
 */
export const formatSSEData = (payload: unknown): string => {
  const serialized = typeof payload === 'string' ? payload : JSON.stringify(payload);
  return `data: ${serialized}\n\n`;
};
