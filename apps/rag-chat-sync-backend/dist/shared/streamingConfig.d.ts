export declare const MIN_CHUNK_SIZE = 20;
export declare const MAX_CHUNK_SIZE = 50;
export declare const clampChunkSize: (size: number) => number;
export declare const resolveChunkSize: (rawValue?: string) => number;
export declare const STREAMING_CONFIG: {
    CHUNK_SIZE: number;
    MIN_CHUNK_SIZE: number;
    MAX_CHUNK_SIZE: number;
};
export declare const SSE_HEADERS: {
    'Content-Type': string;
    'Cache-Control': string;
    Connection: string;
};
export declare const STREAMING_CORS_HEADERS: {
    'Content-Type': string;
    'Cache-Control': string;
    Connection: string;
    'Access-Control-Allow-Origin': string;
    'Access-Control-Allow-Headers': string;
    'Access-Control-Allow-Methods': string;
};
//# sourceMappingURL=streamingConfig.d.ts.map