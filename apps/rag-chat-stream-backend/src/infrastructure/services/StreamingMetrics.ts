import { CloudWatchClient, PutMetricDataCommand, PutMetricDataInput } from '@aws-sdk/client-cloudwatch';

export interface StreamingMetricsData {
  useCaseDurationMs: number;
  chunkSendingDurationMs: number;
  statusCode: number;
  agentId: string;
}

export class StreamingMetrics {
  private cloudwatch: CloudWatchClient;
  private namespace: string;

  constructor(namespace = 'RAGChatBackend/Streaming') {
    this.cloudwatch = new CloudWatchClient({});
    this.namespace = namespace;
  }

  async emitStreamingRequest(data: StreamingMetricsData): Promise<void> {
    const timestamp = new Date();

    const metrics: PutMetricDataInput = {
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
      metrics.MetricData!.push({
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
      await this.cloudwatch.send(new PutMetricDataCommand(metrics));
    } catch (error) {
      console.error('Failed to emit CloudWatch metrics:', error);
      // Don't throw - metrics emission should not break the request
    }
  }

  private getErrorType(statusCode: number): string {
    if (statusCode === 401) return 'Unauthorized';
    if (statusCode === 403) return 'Forbidden';
    if (statusCode === 400) return 'BadRequest';
    if (statusCode >= 500) return 'ServerError';
    return 'Unknown';
  }
}
