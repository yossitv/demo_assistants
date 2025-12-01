export type SSEChunkMetadata = {
    id: string;
    model: string;
    created?: number;
};
export type SSEChunkOptions = {
    includeDoneMessage?: boolean;
    citedUrls?: string[];
};
export declare class SSEChunkGenerator {
    private readonly maxChunkBytes;
    private readonly encoder;
    constructor(maxChunkBytes?: number);
    generateFromText(content: string, metadata: SSEChunkMetadata, options?: SSEChunkOptions): string[];
    private splitUtf8Safe;
    private buildChunk;
    private formatChunk;
}
//# sourceMappingURL=SSEChunkGenerator.d.ts.map