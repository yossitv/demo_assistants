"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ChatCompletionsStreamController = void 0;
const validation_1 = require("../../shared/validation");
const errors_1 = require("../../shared/errors");
const CloudWatchLogger_1 = require("../../infrastructure/services/CloudWatchLogger");
const streaming_1 = require("../../shared/streaming");
const sse_1 = require("../../shared/sse");
const cors_1 = require("../../shared/cors");
const apiKeyCheck_1 = require("../../shared/apiKeyCheck");
const jwtVerify_1 = require("../../shared/jwtVerify");
const noopLogger = { debug: () => { }, info: () => { }, warn: () => { }, error: () => { } };
class ChatCompletionsStreamController {
    useCase;
    logger;
    structuredLogger;
    constructor(useCase, logger) {
        this.useCase = useCase;
        this.logger = logger || noopLogger;
        if (logger instanceof CloudWatchLogger_1.CloudWatchLogger) {
            this.structuredLogger = logger;
        }
    }
    async handle(event, responseStream) {
        const requestId = event.requestContext.requestId;
        const startTime = Date.now();
        let authContext = null;
        try {
            authContext = this.extractAuthenticationContext(event);
            if (!authContext) {
                this.writeJsonError(responseStream, 401, 'Unauthorized');
                return;
            }
            const { tenantId, userId, authMethod } = authContext;
            const validatedBody = (0, validation_1.validateChatRequestBody)(event.body);
            const isStreaming = validatedBody.stream === true;
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
            this.logger.info('Streaming chat request received', {
                tenantId,
                userId,
                requestId,
                agentId: validatedBody.model,
                messageCount: validatedBody.messages.length,
                authMethod
            });
            const result = await this.useCase.execute({
                tenantId,
                userId,
                agentId: validatedBody.model,
                messages: validatedBody.messages,
                requestId
            });
            if (!isStreaming) {
                this.writeJsonSuccess(responseStream, result);
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
                this.logger.info('Non-streaming chat request completed', {
                    tenantId,
                    userId,
                    requestId,
                    agentId: validatedBody.model,
                    citedUrlCount: result.choices[0]?.message?.cited_urls?.length || 0,
                    conversationId: result.id,
                    durationMs,
                    authMethod
                });
                return;
            }
            const stream = this.createSSEStream(responseStream);
            this.streamCompletion(stream, result);
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
            this.logger.info('Streaming chat request completed', {
                tenantId,
                userId,
                requestId,
                agentId: validatedBody.model,
                citedUrlCount: result.choices[0]?.message?.cited_urls?.length || 0,
                conversationId: result.id,
                durationMs,
                authMethod
            });
        }
        catch (error) {
            const durationMs = Date.now() - startTime;
            if (error instanceof errors_1.ValidationError) {
                this.logger.info('Validation error', {
                    requestId,
                    error: error.message,
                    durationMs
                });
                this.writeJsonError(responseStream, 400, error.message);
                return;
            }
            const tenantId = authContext?.tenantId;
            const userId = authContext?.userId;
            const authMethod = authContext?.authMethod || 'none';
            if (this.structuredLogger && tenantId) {
                this.structuredLogger.logErrorWithContext('Error in ChatCompletionsStreamController', error, {
                    requestId,
                    tenantId,
                    userId,
                    path: event.path,
                    method: event.httpMethod,
                    authMethod
                });
            }
            else {
                this.logger.error('Error in ChatCompletionsStreamController', error, {
                    requestId,
                    path: event.path,
                    method: event.httpMethod,
                    tenantId,
                    userId,
                    durationMs,
                    authMethod
                });
            }
            this.writeJsonError(responseStream, 500, 'Internal server error');
        }
    }
    createSSEStream(responseStream) {
        const streamWithHeaders = awslambda.HttpResponseStream.from(responseStream, {
            statusCode: 200,
            headers: (0, streaming_1.buildSSEHeaders)(cors_1.CORS_HEADERS)
        });
        streamWithHeaders.setContentType(streaming_1.SSE_HEADERS['Content-Type']);
        return streamWithHeaders;
    }
    writeJsonError(responseStream, statusCode, message) {
        const stream = awslambda.HttpResponseStream.from(responseStream, {
            statusCode,
            headers: {
                ...cors_1.CORS_HEADERS,
                'Content-Type': 'application/json'
            }
        });
        stream.write(JSON.stringify({ error: { message } }));
        stream.end();
    }
    writeJsonSuccess(responseStream, body) {
        const stream = awslambda.HttpResponseStream.from(responseStream, {
            statusCode: 200,
            headers: {
                ...cors_1.CORS_HEADERS,
                'Content-Type': 'application/json'
            }
        });
        stream.write(JSON.stringify(body));
        stream.end();
    }
    streamCompletion(stream, result) {
        const choice = result.choices[0]?.message;
        const content = choice?.content || '';
        const citedUrls = choice?.cited_urls || [];
        const created = Math.floor(Date.now() / 1000);
        const initialChunk = (0, sse_1.createInitialChunk)({ id: result.id, model: result.model, created });
        stream.write((0, sse_1.formatSseEvent)(initialChunk));
        this.chunkContent(content).forEach(chunk => {
            const payload = (0, sse_1.createContentChunk)({
                id: result.id,
                model: result.model,
                content: chunk,
                created
            });
            stream.write((0, sse_1.formatSseEvent)(payload));
        });
        const finalChunk = (0, sse_1.createFinalChunk)({ id: result.id, model: result.model, created });
        const finalDelta = finalChunk.choices[0].delta;
        if (citedUrls.length > 0) {
            finalDelta.cited_urls = citedUrls;
        }
        if (typeof choice?.isRag === 'boolean') {
            finalDelta.isRag = choice.isRag;
        }
        finalChunk.choices[0].delta = finalDelta;
        stream.write((0, sse_1.formatSseEvent)(finalChunk));
        stream.write(sse_1.SSE_DONE_EVENT);
        stream.end();
    }
    chunkContent(content) {
        return (0, sse_1.splitAnswerIntoChunks)(content, streaming_1.STREAM_CHUNK_SIZE);
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
}
exports.ChatCompletionsStreamController = ChatCompletionsStreamController;
//# sourceMappingURL=ChatCompletionsStreamController.js.map