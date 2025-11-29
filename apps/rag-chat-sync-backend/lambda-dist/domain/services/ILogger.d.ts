export interface ILogger {
    /**
     * Logs debug-level messages with optional context
     * @param message - The log message
     * @param context - Optional context object with additional data
     */
    debug(message: string, context?: any): void;
    /**
     * Logs info-level messages with optional context
     * @param message - The log message
     * @param context - Optional context object with additional data
     */
    info(message: string, context?: any): void;
    /**
     * Logs warning-level messages with optional context
     * @param message - The log message
     * @param context - Optional context object with additional data
     */
    warn(message: string, context?: any): void;
    /**
     * Logs error-level messages with optional error and context
     * @param message - The log message
     * @param error - Optional error object
     * @param context - Optional context object with additional data
     */
    error(message: string, error?: Error, context?: any): void;
}
//# sourceMappingURL=ILogger.d.ts.map