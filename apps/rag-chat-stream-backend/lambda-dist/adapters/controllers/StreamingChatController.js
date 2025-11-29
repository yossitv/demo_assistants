"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.StreamingChatController = void 0;
const validation_1 = require("../../shared/validation");
const cors_1 = require("../../shared/cors");
const errors_1 = require("../../shared/errors");
const CloudWatchLogger_1 = require("../../infrastructure/services/CloudWatchLogger");
const streaming_1 = require("../../shared/streaming");
const apiKey_1 = require("../../shared/apiKey");
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
            const tenantId = authContext?.tenantId || event.requestContext.authorizer?.claims?.['custom:tenant_id'];
            const userId = authContext?.userId || event.requestContext.authorizer?.claims?.sub;
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
        const headers = event.headers || {};
        const authHeader = Object.entries(headers).find(([headerName]) => headerName.toLowerCase() === 'authorization')?.[1];
        const bearerToken = authHeader?.match(/^Bearer\s+(.+)$/i)?.[1]?.trim();
        if (bearerToken) {
            const decodedClaims = this.decodeJwtWithoutVerification(bearerToken);
            const tenantId = decodedClaims?.['custom:tenant_id'];
            const userId = decodedClaims?.sub;
            if (tenantId && userId) {
                return { tenantId, userId, authMethod: 'jwt' };
            }
        }
        const authorizerContext = event.requestContext.authorizer;
        if (authorizerContext?.tenantId && authorizerContext?.userId) {
            return {
                tenantId: authorizerContext.tenantId,
                userId: authorizerContext.userId,
                authMethod: 'apikey'
            };
        }
        const claims = authorizerContext?.claims;
        const tenantId = claims?.['custom:tenant_id'];
        const userId = claims?.sub;
        if (tenantId && userId) {
            return { tenantId, userId, authMethod: 'jwt' };
        }
        const { apiKey } = (0, apiKey_1.extractApiKeyFromHeaders)(headers);
        const expectedApiKey = process.env.TAVUS_API_KEY || process.env.TEST_API_KEY;
        if (apiKey && (!expectedApiKey || apiKey === expectedApiKey)) {
            return {
                tenantId: 'default',
                userId: 'default',
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
exports.StreamingChatController = StreamingChatController;
//# sourceMappingURL=StreamingChatController.js.map