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

export class CloudWatchLogger implements ILogger {
  debug(message: string, context?: any): void {
    console.log(this.format('DEBUG', message, context));
  }

  info(message: string, context?: any): void {
    console.log(this.format('INFO', message, context));
  }

  warn(message: string, context?: any): void {
    console.warn(this.format('WARN', message, context));
  }

  error(message: string, error?: Error, context?: any): void {
    console.error(this.format('ERROR', message, context, error));
  }

  /**
   * Log incoming HTTP request with correlation ID
   */
  logRequest(context: RequestLogContext): void {
    this.info('Request received', this.sanitizeContext(context));
  }

  /**
   * Log HTTP response with status and duration
   */
  logResponse(context: ResponseLogContext): void {
    this.info('Request completed', this.sanitizeContext(context));
  }

  /**
   * Log RAG search results with similarity scores and matched URLs
   */
  logRAGSearch(context: RAGSearchLogContext): void {
    const sanitized = this.sanitizeContext(context);
    this.debug('RAG search completed', sanitized);
  }

  /**
   * Log crawl progress for knowledge space creation
   */
  logCrawlProgress(context: CrawlProgressLogContext): void {
    const sanitized = this.sanitizeContext(context);
    if (context.status === 'failed') {
      this.error('Crawl failed', undefined, sanitized);
    } else {
      this.info(`Crawl ${context.status}`, sanitized);
    }
  }

  /**
   * Log agent creation with configuration
   */
  logAgentCreation(context: AgentCreationLogContext): void {
    this.info('Agent created', this.sanitizeContext(context));
  }

  /**
   * Log error with full context including stack trace
   */
  logErrorWithContext(message: string, error: Error, context: RequestLogContext): void {
    this.error(message, error, context);
  }

  private format(level: 'DEBUG' | 'INFO' | 'WARN' | 'ERROR', message: string, context?: any, error?: Error): string {
    const entry: Record<string, unknown> = {
      timestamp: new Date().toISOString(),
      level,
      message
    };

    if (context) {
      entry.context = this.sanitizeContext(context);
    }

    if (error) {
      entry.error = {
        message: error.message,
        stack: error.stack,
        name: error.name
      };
    }

    return JSON.stringify(entry);
  }

  /**
   * Sanitize context to remove sensitive data
   */
  private sanitizeContext(context: any): any {
    if (!context) return context;

    const sanitized = { ...context };

    // Remove common sensitive field patterns
    const sensitivePatterns = [
      'password', 'token', 'secret', 'apikey', 'api_key',
      'authorization', 'auth', 'key', 'credential'
    ];

    for (const key in sanitized) {
      const lowerKey = key.toLowerCase();
      if (key === 'authMethod') {
        continue;
      }
      if (sensitivePatterns.some(pattern => lowerKey.includes(pattern))) {
        sanitized[key] = '[REDACTED]';
      }
    }

    return sanitized;
  }
}
