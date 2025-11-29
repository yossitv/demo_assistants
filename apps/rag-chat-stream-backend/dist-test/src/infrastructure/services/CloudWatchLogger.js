"use strict";
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CloudWatchLogger = void 0;
var CloudWatchLogger = /** @class */ (function () {
    function CloudWatchLogger() {
    }
    CloudWatchLogger.prototype.debug = function (message, context) {
        console.log(this.format('DEBUG', message, context));
    };
    CloudWatchLogger.prototype.info = function (message, context) {
        console.log(this.format('INFO', message, context));
    };
    CloudWatchLogger.prototype.warn = function (message, context) {
        console.warn(this.format('WARN', message, context));
    };
    CloudWatchLogger.prototype.error = function (message, error, context) {
        console.error(this.format('ERROR', message, context, error));
    };
    /**
     * Log incoming HTTP request with correlation ID
     */
    CloudWatchLogger.prototype.logRequest = function (context) {
        this.info('Request received', this.sanitizeContext(context));
    };
    /**
     * Log HTTP response with status and duration
     */
    CloudWatchLogger.prototype.logResponse = function (context) {
        this.info('Request completed', this.sanitizeContext(context));
    };
    /**
     * Log RAG search results with similarity scores and matched URLs
     */
    CloudWatchLogger.prototype.logRAGSearch = function (context) {
        var sanitized = this.sanitizeContext(context);
        this.debug('RAG search completed', sanitized);
    };
    /**
     * Log crawl progress for knowledge space creation
     */
    CloudWatchLogger.prototype.logCrawlProgress = function (context) {
        var sanitized = this.sanitizeContext(context);
        if (context.status === 'failed') {
            this.error('Crawl failed', undefined, sanitized);
        }
        else {
            this.info("Crawl ".concat(context.status), sanitized);
        }
    };
    /**
     * Log agent creation with configuration
     */
    CloudWatchLogger.prototype.logAgentCreation = function (context) {
        this.info('Agent created', this.sanitizeContext(context));
    };
    /**
     * Log error with full context including stack trace
     */
    CloudWatchLogger.prototype.logErrorWithContext = function (message, error, context) {
        this.error(message, error, context);
    };
    CloudWatchLogger.prototype.format = function (level, message, context, error) {
        var entry = {
            timestamp: new Date().toISOString(),
            level: level,
            message: message
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
    };
    /**
     * Sanitize context to remove sensitive data
     */
    CloudWatchLogger.prototype.sanitizeContext = function (context) {
        if (!context)
            return context;
        var sanitized = __assign({}, context);
        // Remove common sensitive field patterns
        var sensitivePatterns = [
            'password', 'token', 'secret', 'apikey', 'api_key',
            'authorization', 'auth', 'key', 'credential'
        ];
        var _loop_1 = function (key) {
            var lowerKey = key.toLowerCase();
            if (key === 'authMethod') {
                return "continue";
            }
            if (sensitivePatterns.some(function (pattern) { return lowerKey.includes(pattern); })) {
                sanitized[key] = '[REDACTED]';
            }
        };
        for (var key in sanitized) {
            _loop_1(key);
        }
        return sanitized;
    };
    return CloudWatchLogger;
}());
exports.CloudWatchLogger = CloudWatchLogger;
