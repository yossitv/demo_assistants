"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.StreamingChatController = void 0;
const validation_1 = require("../../shared/validation");
const cors_1 = require("../../shared/cors");
const errors_1 = require("../../shared/errors");
const CloudWatchLogger_1 = require("../../infrastructure/services/CloudWatchLogger");
const streaming_1 = require("../../shared/streaming");
const apiKeyCheck_1 = require("../../shared/apiKeyCheck");
const jwtVerify_1 = require("../../shared/jwtVerify");
class StreamingChatController {
    useCase;
    logger;
    structuredLogger;
    constructor(useCase, logger) {
        this.useCase = useCase;
        this.logger = logger || { debug: () => { }, info: () => { }, warn: () => { }, error: () => { } };
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
            const { chatRequest, stream } = this.validateRequest(event.body);
            const { tenantId, userId, authMethod } = authContext;
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
                agentId: chatRequest.model,
                messageCount: chatRequest.messages.length,
                stream,
                authMethod
            });
            const result = await this.useCase.execute({
                tenantId,
                userId,
                agentId: chatRequest.model,
                messages: chatRequest.messages,
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
            this.logger.info(stream ? 'Streaming chat response generated' : 'Chat response generated', {
                tenantId,
                userId,
                requestId,
                agentId: chatRequest.model,
                durationMs,
                stream,
                authMethod
            });
            if (stream) {
                return this.buildStreamResult(result);
            }
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
            const tenantId = authContext?.tenantId;
            const userId = authContext?.userId;
            const authMethod = authContext?.authMethod || 'none';
            if (this.structuredLogger && tenantId) {
                this.structuredLogger.logErrorWithContext('Error in StreamingChatController', error, {
                    requestId,
                    tenantId,
                    userId,
                    path: event.path,
                    method: event.httpMethod,
                    authMethod
                });
            }
            else {
                this.logger.error('Error in StreamingChatController', error, {
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
    validateRequest(body) {
        const parsed = this.parseJsonBody(body);
        const stream = this.extractStreamFlag(parsed.stream);
        const result = validation_1.chatRequestSchema.safeParse(parsed);
        if (!result.success) {
            throw new errors_1.ValidationError(result.error.errors[0]?.message || 'Invalid request body');
        }
        return { chatRequest: result.data, stream };
    }
    parseJsonBody(body) {
        try {
            return JSON.parse(body || '{}');
        }
        catch {
            throw new errors_1.ValidationError('Request body must be valid JSON');
        }
    }
    extractStreamFlag(value) {
        if (value === undefined) {
            return false;
        }
        if (typeof value === 'boolean') {
            return value;
        }
        throw new errors_1.ValidationError('stream must be a boolean');
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
    buildStreamResult(result) {
        const message = result.choices[0]?.message;
        const content = message?.content ?? '';
        const chunks = this.chunkContent(content);
        const streamEvents = chunks.map(chunk => (0, streaming_1.formatSSEData)({
            id: result.id,
            object: 'chat.completion.chunk',
            model: result.model,
            choices: [{
                    index: 0,
                    delta: { content: chunk },
                    finish_reason: null
                }]
        }));
        const finalChunk = (0, streaming_1.formatSSEData)({
            id: result.id,
            object: 'chat.completion.chunk',
            model: result.model,
            choices: [{
                    index: 0,
                    delta: {
                        cited_urls: message?.cited_urls ?? [],
                        isRag: message?.isRag ?? false
                    },
                    finish_reason: 'stop'
                }]
        });
        const body = [...streamEvents, finalChunk, streaming_1.DONE_SSE_EVENT].join('');
        return {
            statusCode: 200,
            headers: (0, streaming_1.buildSSEHeaders)(cors_1.CORS_HEADERS),
            body
        };
    }
    chunkContent(content) {
        if (!content) {
            return [''];
        }
        const chunks = [];
        for (let i = 0; i < content.length; i += streaming_1.STREAM_CHUNK_SIZE) {
            chunks.push(content.slice(i, i + streaming_1.STREAM_CHUNK_SIZE));
        }
        return chunks;
    }
    logUnauthorizedAttempt(requestId, path) {
        this.logger.info('Unauthorized access attempt', {
            requestId,
            path,
            reason: 'Missing authentication credentials'
        });
    }
}
exports.StreamingChatController = StreamingChatController;
//# sourceMappingURL=StreamingChatController.js.map