"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.StreamingMetrics = void 0;
const client_cloudwatch_1 = require("@aws-sdk/client-cloudwatch");
class StreamingMetrics {
    cloudwatch;
    namespace;
    constructor(namespace = 'RAGChatBackend/Streaming') {
        this.cloudwatch = new client_cloudwatch_1.CloudWatchClient({});
        this.namespace = namespace;
    }
    async emitStreamingRequest(data) {
        const timestamp = new Date();
        const metrics = {
            Namespace: this.namespace,
            MetricData: [
                {
                    MetricName: 'StreamingRequests',
                    Value: 1,
                    Unit: 'Count',
                    Timestamp: timestamp,
                    Dimensions: [
                        { Name: 'AgentId', Value: data.agentId },
                        { Name: 'StatusCode', Value: data.statusCode.toString() },
                    ],
                },
                {
                    MetricName: 'UseCaseDuration',
                    Value: data.useCaseDurationMs,
                    Unit: 'Milliseconds',
                    Timestamp: timestamp,
                    Dimensions: [{ Name: 'AgentId', Value: data.agentId }],
                },
                {
                    MetricName: 'ChunkSendingDuration',
                    Value: data.chunkSendingDurationMs,
                    Unit: 'Milliseconds',
                    Timestamp: timestamp,
                    Dimensions: [{ Name: 'AgentId', Value: data.agentId }],
                },
            ],
        };
        // Emit error metrics by type
        if (data.statusCode >= 400) {
            metrics.MetricData.push({
                MetricName: 'ErrorsByType',
                Value: 1,
                Unit: 'Count',
                Timestamp: timestamp,
                Dimensions: [
                    { Name: 'StatusCode', Value: data.statusCode.toString() },
                    { Name: 'ErrorType', Value: this.getErrorType(data.statusCode) },
                ],
            });
        }
        try {
            await this.cloudwatch.send(new client_cloudwatch_1.PutMetricDataCommand(metrics));
        }
        catch (error) {
            console.error('Failed to emit CloudWatch metrics:', error);
            // Don't throw - metrics emission should not break the request
        }
    }
    getErrorType(statusCode) {
        if (statusCode === 401)
            return 'Unauthorized';
        if (statusCode === 403)
            return 'Forbidden';
        if (statusCode === 400)
            return 'BadRequest';
        if (statusCode >= 500)
            return 'ServerError';
        return 'Unknown';
    }
}
exports.StreamingMetrics = StreamingMetrics;
//# sourceMappingURL=StreamingMetrics.js.map