"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.KnowledgeListController = void 0;
const CloudWatchLogger_1 = require("../../infrastructure/services/CloudWatchLogger");
const cors_1 = require("../../shared/cors");
const apiKeyCheck_1 = require("../../shared/apiKeyCheck");
const jwtVerify_1 = require("../../shared/jwtVerify");
class KnowledgeListController {
    useCase;
    logger;
    structuredLogger;
    constructor(useCase, logger) {
        this.useCase = useCase;
        this.logger = logger || { debug: () => { }, info: () => { }, warn: () => { }, error: () => { } };
        // Check if logger is CloudWatchLogger for structured logging
        if (logger instanceof CloudWatchLogger_1.CloudWatchLogger) {
            this.structuredLogger = logger;
        }
    }
    async handle(event) {
        const requestId = event.requestContext.requestId;
        const startTime = Date.now();
        let authContext = null;
        try {
            authContext = this.extractAuthenticationContext(event);
            if (!authContext) {
                this.logUnauthorizedAttempt(requestId, event.path);
                return (0, cors_1.errorResponse)(401, 'Unauthorized');
            }
            const { tenantId, userId, authMethod } = authContext;
            // Log request summary with structured logging
            if (this.structuredLogger) {
                this.structuredLogger.logRequest({
                    requestId,
                    tenantId,
                    userId,
                    path: event.path,
                    method: event.httpMethod,
                    authMethod
                });
            }
            this.logger.info('Knowledge list request received', {
                tenantId,
                userId,
                requestId,
                authMethod
            });
            const result = await this.useCase.execute({ tenantId });
            const durationMs = Date.now() - startTime;
            // Log response summary with timing
            if (this.structuredLogger) {
                this.structuredLogger.logResponse({
                    requestId,
                    tenantId,
                    userId,
                    path: event.path,
                    statusCode: 200,
                    durationMs,
                    authMethod
                });
            }
            this.logger.info('Knowledge list request completed', {
                tenantId,
                userId,
                requestId,
                knowledgeSpaceCount: result.knowledgeSpaces.length,
                durationMs,
                authMethod
            });
            return (0, cors_1.successResponse)(200, result);
        }
        catch (error) {
            const durationMs = Date.now() - startTime;
            // Log error with full context
            const tenantId = authContext?.tenantId || event.requestContext.authorizer?.claims?.['custom:tenant_id'];
            const userId = authContext?.userId || event.requestContext.authorizer?.claims?.sub;
            const authMethod = authContext?.authMethod || 'none';
            if (this.structuredLogger && tenantId) {
                this.structuredLogger.logErrorWithContext('Error in KnowledgeListController', error, {
                    requestId,
                    tenantId,
                    userId,
                    path: event.path,
                    method: event.httpMethod,
                    authMethod
                });
            }
            else {
                this.logger.error('Error in KnowledgeListController', error, {
                    requestId,
                    path: event.path,
                    method: event.httpMethod,
                    tenantId,
                    userId,
                    durationMs,
                    authMethod
                });
            }
            return (0, cors_1.errorResponse)(500, 'Internal server error');
        }
    }
    extractAuthenticationContext(event) {
        // Check for custom authorizer context (API key authentication)
        const authorizerContext = event.requestContext.authorizer;
        if (authorizerContext?.tenantId && authorizerContext?.userId) {
            return {
                tenantId: authorizerContext.tenantId,
                userId: authorizerContext.userId,
                authMethod: 'apikey'
            };
        }
        // Try JWT verification
        const authHeader = Object.entries(event.headers || {}).find(([headerName]) => headerName.toLowerCase() === 'authorization')?.[1];
        if (authHeader) {
            const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : authHeader;
            const jwtResult = (0, jwtVerify_1.verifyJwt)(token, this.logger);
            if (jwtResult.isValid && jwtResult.payload) {
                return {
                    tenantId: jwtResult.payload['custom:tenant_id'],
                    userId: jwtResult.payload.sub,
                    authMethod: 'jwt'
                };
            }
        }
        // Try API key validation
        const apiKeyResult = (0, apiKeyCheck_1.validateApiKey)(event.headers || {}, this.logger);
        if (apiKeyResult.isValid && apiKeyResult.tenantId && apiKeyResult.userId) {
            return {
                tenantId: apiKeyResult.tenantId,
                userId: apiKeyResult.userId,
                authMethod: 'apikey'
            };
        }
        return null;
    }
    logUnauthorizedAttempt(requestId, path) {
        this.logger.info('Unauthorized access attempt', {
            requestId,
            path,
            reason: 'Missing tenantId in claims'
        });
    }
}
exports.KnowledgeListController = KnowledgeListController;
//# sourceMappingURL=KnowledgeListController.js.map