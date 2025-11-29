export declare const MIN_STREAM_CHUNK_SIZE = 20;
export declare const MAX_STREAM_CHUNK_SIZE = 50;
export declare const DEFAULT_STREAM_CHUNK_SIZE = 32;
/**
 * Resolve the chunk size from an optional input, falling back to a sane default
 * while keeping the value inside the allowed bounds.
 */
export declare const resolveStreamChunkSize: (value?: string | number | null) => number;
export declare const STREAM_CHUNK_SIZE: number;
export declare const SSE_HEADERS: Readonly<{
    'Content-Type': "text/event-stream; charset=utf-8";
    'Cache-Control': "no-cache";
    Connection: "keep-alive";
}>;
/**
 * Build the headers for an SSE response, guaranteeing required values even when
 * caller-provided headers include conflicting keys.
 */
export declare const buildSSEHeaders: (additionalHeaders?: Record<string, string>) => Record<string, string>;
export declare const DONE_SSE_EVENT = "data: [DONE]\n\n";
/**
 * Format a payload as an SSE data event (`data: <payload>\\n\\n`).
 */
export declare const formatSSEData: (payload: unknown) => string;
//# sourceMappingURL=streaming.d.ts.map