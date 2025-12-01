"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CloudWatchLogger = void 0;
class CloudWatchLogger {
    debug(message, context) {
        console.log(this.format('DEBUG', message, context));
    }
    info(message, context) {
        console.log(this.format('INFO', message, context));
    }
    warn(message, context) {
        console.warn(this.format('WARN', message, context));
    }
    error(message, error, context) {
        console.error(this.format('ERROR', message, context, error));
    }
    /**
     * Log incoming HTTP request with correlation ID
     */
    logRequest(context) {
        this.info('Request received', this.sanitizeContext(context));
    }
    /**
     * Log HTTP response with status and duration
     */
    logResponse(context) {
        this.info('Request completed', this.sanitizeContext(context));
    }
    /**
     * Log RAG search results with similarity scores and matched URLs
     */
    logRAGSearch(context) {
        const sanitized = this.sanitizeContext(context);
        this.debug('RAG search completed', sanitized);
    }
    /**
     * Log crawl progress for knowledge space creation
     */
    logCrawlProgress(context) {
        const sanitized = this.sanitizeContext(context);
        if (context.status === 'failed') {
            this.error('Crawl failed', undefined, sanitized);
        }
        else {
            this.info(`Crawl ${context.status}`, sanitized);
        }
    }
    /**
     * Log agent creation with configuration
     */
    logAgentCreation(context) {
        this.info('Agent created', this.sanitizeContext(context));
    }
    /**
     * Log error with full context including stack trace
     */
    logErrorWithContext(message, error, context) {
        this.error(message, error, context);
    }
    format(level, message, context, error) {
        const entry = {
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
    sanitizeContext(context) {
        if (!context)
            return context;
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
exports.CloudWatchLogger = CloudWatchLogger;
//# sourceMappingURL=CloudWatchLogger.js.map