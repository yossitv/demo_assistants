"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ChatController = void 0;
const validation_1 = require("../../shared/validation");
const cors_1 = require("../../shared/cors");
const errors_1 = require("../../shared/errors");
const CloudWatchLogger_1 = require("../../infrastructure/services/CloudWatchLogger");
const apiKey_1 = require("../../shared/apiKey");
class ChatController {
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
            const validatedBody = (0, validation_1.validateChatRequestBody)(event.body);
            // Log request summary
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
            this.logger.info('Chat request received', {
                tenantId,
                userId,
                requestId,
                agentId: validatedBody.model,
                messageCount: validatedBody.messages.length,
                hasSystemMessage: validatedBody.messages.some(m => m.role === 'system'),
                authMethod
            });
            const result = await this.useCase.execute({
                tenantId,
                userId,
                agentId: validatedBody.model,
                messages: validatedBody.messages,
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
            this.logger.info('Chat request completed', {
                tenantId,
                userId,
                requestId,
                agentId: validatedBody.model,
                citedUrlCount: result.choices[0]?.message?.cited_urls?.length || 0,
                conversationId: result.id,
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
                this.structuredLogger.logErrorWithContext('Error in ChatController', error, {
                    requestId,
                    tenantId,
                    userId,
                    path: event.path,
                    method: event.httpMethod,
                    authMethod
                });
            }
            else {
                this.logger.error('Error in ChatController', error, {
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
        const authHeader = Object.entries(event.headers || {}).find(([headerName]) => headerName.toLowerCase() === 'authorization')?.[1];
        if (!tenantId || !userId) {
            const bearerToken = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : undefined;
            const decodedClaims = bearerToken ? this.decodeJwtWithoutVerification(bearerToken) : null;
            const decodedTenantId = decodedClaims?.['custom:tenant_id'];
            const decodedUserId = decodedClaims?.sub;
            if (decodedTenantId && decodedUserId) {
                return { tenantId: decodedTenantId, userId: decodedUserId, authMethod: 'jwt' };
            }
        }
        if (tenantId && userId) {
            return { tenantId, userId, authMethod: 'jwt' };
        }
        // Fallback: validate API key from Authorization (preferred) or x-api-key (legacy)
        const { apiKey } = (0, apiKey_1.extractApiKeyFromHeaders)(event.headers);
        const expectedApiKey = process.env.TAVUS_API_KEY || process.env.TEST_API_KEY;
        const apiKeyIsValid = apiKey && (!expectedApiKey || apiKey === expectedApiKey);
        if (apiKeyIsValid) {
            return {
                tenantId: 'default',
                userId: 'default',
                authMethod: 'apikey'
            };
        }
        return null;
    }
    logUnauthorizedAttempt(requestId, path) {
        this.logger.info('Unauthorized access attempt', {
            requestId,
            path,
            reason: 'Missing authentication credentials'
        });
    }
    decodeJwtWithoutVerification(token) {
        const parts = token.split('.');
        if (parts.length < 2) {
            return null;
        }
        try {
            const payload = Buffer.from(parts[1].replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf8');
            return JSON.parse(payload);
        }
        catch {
            return null;
        }
    }
}
exports.ChatController = ChatController;
//# sourceMappingURL=ChatController.js.map