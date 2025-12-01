export interface StreamingMetricsData {
    useCaseDurationMs: number;
    chunkSendingDurationMs: number;
    statusCode: number;
    agentId: string;
}
export declare class StreamingMetrics {
    private cloudwatch;
    private namespace;
    constructor(namespace?: string);
    emitStreamingRequest(data: StreamingMetricsData): Promise<void>;
    private getErrorType;
}
//# sourceMappingURL=StreamingMetrics.d.ts.map