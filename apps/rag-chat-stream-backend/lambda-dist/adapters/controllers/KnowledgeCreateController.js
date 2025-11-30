"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.KnowledgeCreateController = void 0;
const validation_1 = require("../../shared/validation");
const errors_1 = require("../../shared/errors");
const cors_1 = require("../../shared/cors");
const CloudWatchLogger_1 = require("../../infrastructure/services/CloudWatchLogger");
const apiKeyCheck_1 = require("../../shared/apiKeyCheck");
const jwtVerify_1 = require("../../shared/jwtVerify");
class KnowledgeCreateController {
    useCase;
    productUseCase;
    logger;
    structuredLogger;
    constructor(useCase, productUseCase, logger) {
        this.useCase = useCase;
        this.productUseCase = productUseCase;
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
            // Check if this is a multipart request
            const contentType = event.headers['content-type'] || event.headers['Content-Type'] || '';
            if (contentType.includes('multipart/form-data')) {
                return await this.handleMultipartUpload(event, tenantId, userId, requestId, authMethod, startTime);
            }
            // Handle JSON request (existing logic)
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
    async handleMultipartUpload(event, tenantId, userId, requestId, authMethod, startTime) {
        try {
            const { name, fileContent, mode } = this.parseMultipartFormData(event);
            if (!name || !fileContent) {
                return (0, cors_1.errorResponse)(400, 'Missing required fields: name and file');
            }
            const knowledgeMode = (mode || 'product_recommend');
            this.logger.info('Knowledge space creation request (file upload)', {
                tenantId,
                userId,
                requestId,
                name,
                fileSize: fileContent.length,
                mode: knowledgeMode,
                authMethod
            });
            const result = await this.productUseCase.execute({
                tenantId,
                name,
                fileContent,
                mode: knowledgeMode,
                requestId
            });
            const durationMs = Date.now() - startTime;
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
            this.logger.info('Product knowledge space created', {
                tenantId,
                userId,
                requestId,
                knowledgeSpaceId: result.knowledgeSpaceId,
                status: result.status,
                documentCount: result.documentCount,
                durationMs,
                authMethod
            });
            return (0, cors_1.successResponse)(200, result);
        }
        catch (error) {
            this.logger.error('Failed to create product knowledge space', error, {
                tenantId,
                userId,
                requestId
            });
            return (0, cors_1.errorResponse)(500, 'Internal server error');
        }
    }
    parseMultipartFormData(event) {
        const contentType = event.headers['content-type'] || event.headers['Content-Type'] || '';
        if (!contentType.includes('multipart/form-data')) {
            return {};
        }
        const body = event.isBase64Encoded
            ? Buffer.from(event.body || '', 'base64').toString('utf-8')
            : event.body || '';
        const boundaryMatch = contentType.match(/boundary=([^;]+)/);
        if (!boundaryMatch) {
            return {};
        }
        const boundary = boundaryMatch[1];
        const parts = body.split(`--${boundary}`);
        let name;
        let fileContent;
        let mode;
        for (const part of parts) {
            if (part.includes('Content-Disposition')) {
                const nameMatch = part.match(/name="([^"]+)"/);
                if (!nameMatch)
                    continue;
                const fieldName = nameMatch[1];
                const contentStart = part.indexOf('\r\n\r\n') + 4;
                const contentEnd = part.lastIndexOf('\r\n');
                const content = part.substring(contentStart, contentEnd);
                if (fieldName === 'name') {
                    name = content.trim();
                }
                else if (fieldName === 'file') {
                    fileContent = content;
                }
                else if (fieldName === 'mode') {
                    mode = content.trim();
                }
            }
        }
        return { name, fileContent, mode };
    }
}
exports.KnowledgeCreateController = KnowledgeCreateController;
//# sourceMappingURL=KnowledgeCreateController.js.map