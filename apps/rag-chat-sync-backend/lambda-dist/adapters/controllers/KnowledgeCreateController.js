"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.KnowledgeCreateController = void 0;
const validation_1 = require("../../shared/validation");
const errors_1 = require("../../shared/errors");
const cors_1 = require("../../shared/cors");
const CloudWatchLogger_1 = require("../../infrastructure/services/CloudWatchLogger");
const apiKey_1 = require("../../shared/apiKey");
class KnowledgeCreateController {
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
            const validatedBody = (0, validation_1.validateKnowledgeCreateBody)(event.body);
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
            this.logger.info('Knowledge space creation request received', {
                tenantId,
                userId,
                requestId,
                urlCount: validatedBody.sourceUrls.length,
                name: validatedBody.name,
                authMethod
            });
            const result = await this.useCase.execute({
                tenantId,
                name: validatedBody.name,
                sourceUrls: validatedBody.sourceUrls,
                requestId
            });
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
            this.logger.info('Knowledge space creation completed', {
                tenantId,
                userId,
                requestId,
                knowledgeSpaceId: result.knowledgeSpaceId,
                status: result.status,
                successfulUrls: result.successfulUrls,
                failedUrls: result.failedUrls,
                durationMs,
                authMethod
            });
            return (0, cors_1.successResponse)(200, result);
        }
        catch (error) {
            const durationMs = Date.now() - startTime;
            if (error instanceof errors_1.ValidationError) {
                this.logger.info('Validation error', {
                    requestId,
                    error: error.message,
                    durationMs
                });
                return (0, cors_1.errorResponse)(400, error.message);
            }
            // Log error with full context
            const tenantId = authContext?.tenantId || event.requestContext.authorizer?.claims?.['custom:tenant_id'];
            const userId = authContext?.userId || event.requestContext.authorizer?.claims?.sub;
            const authMethod = authContext?.authMethod || 'none';
            if (this.structuredLogger && tenantId) {
                this.structuredLogger.logErrorWithContext('Error in KnowledgeCreateController', error, {
                    requestId,
                    tenantId,
                    userId,
                    path: event.path,
                    method: event.httpMethod,
                    authMethod
                });
            }
            else {
                this.logger.error('Error in KnowledgeCreateController', error, {
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
        // Check for JWT claims (Cognito authentication)
        const claims = authorizerContext?.claims;
        const tenantId = claims?.['custom:tenant_id'];
        const userId = claims?.sub;
        if (tenantId && userId) {
            return { tenantId, userId, authMethod: 'jwt' };
        }
        // Fallback: validate API key from Authorization (preferred) or x-api-key (legacy)
        const { apiKey } = (0, apiKey_1.extractApiKeyFromHeaders)(event.headers);
        const expectedApiKey = process.env.TAVUS_API_KEY || process.env.TEST_API_KEY;
        if (apiKey && (!expectedApiKey || apiKey === expectedApiKey)) {
            return { tenantId: 'default', userId: 'default', authMethod: 'apikey' };
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
exports.KnowledgeCreateController = KnowledgeCreateController;
//# sourceMappingURL=KnowledgeCreateController.js.map