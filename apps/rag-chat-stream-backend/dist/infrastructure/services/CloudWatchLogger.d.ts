import { ILogger } from '../../domain/services/ILogger';
export interface RequestLogContext {
    requestId: string;
    tenantId: string;
    userId?: string;
    path?: string;
    method?: string;
    authMethod?: 'jwt' | 'apikey' | 'none';
}
export interface ResponseLogContext extends RequestLogContext {
    statusCode: number;
    durationMs?: number;
}
export interface RAGSearchLogContext extends RequestLogContext {
    agentId: string;
    query?: string;
    hitCount: number;
    topUrls: string[];
    topScores?: number[];
    threshold?: number;
}
export interface CrawlProgressLogContext extends RequestLogContext {
    url: string;
    urlIndex?: number;
    totalUrls?: number;
    chunkCount?: number;
    status: 'started' | 'completed' | 'failed';
    errorMessage?: string;
}
export interface AgentCreationLogContext extends RequestLogContext {
    agentId?: string;
    agentName?: string;
    knowledgeSpaceIds: string[];
    strictRAG?: boolean;
}
export declare class CloudWatchLogger implements ILogger {
    debug(message: string, context?: any): void;
    info(message: string, context?: any): void;
    warn(message: string, context?: any): void;
    error(message: string, error?: Error, context?: any): void;
    /**
     * Log incoming HTTP request with correlation ID
     */
    logRequest(context: RequestLogContext): void;
    /**
     * Log HTTP response with status and duration
     */
    logResponse(context: ResponseLogContext): void;
    /**
     * Log RAG search results with similarity scores and matched URLs
     */
    logRAGSearch(context: RAGSearchLogContext): void;
    /**
     * Log crawl progress for knowledge space creation
     */
    logCrawlProgress(context: CrawlProgressLogContext): void;
    /**
     * Log agent creation with configuration
     */
    logAgentCreation(context: AgentCreationLogContext): void;
    /**
     * Log error with full context including stack trace
     */
    logErrorWithContext(message: string, error: Error, context: RequestLogContext): void;
    private format;
    /**
     * Sanitize context to remove sensitive data
     */
    private sanitizeContext;
}
//# sourceMappingURL=CloudWatchLogger.d.ts.map