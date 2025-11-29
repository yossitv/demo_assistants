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
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ChatCompletionsStreamController = void 0;
var validation_1 = require("../../shared/validation");
var errors_1 = require("../../shared/errors");
var CloudWatchLogger_1 = require("../../infrastructure/services/CloudWatchLogger");
var streaming_1 = require("../../shared/streaming");
var sse_1 = require("../../shared/sse");
var apiKey_1 = require("../../shared/apiKey");
var cors_1 = require("../../shared/cors");
var noopLogger = { debug: function () { }, info: function () { }, warn: function () { }, error: function () { } };
var ChatCompletionsStreamController = /** @class */ (function () {
    function ChatCompletionsStreamController(useCase, logger) {
        this.useCase = useCase;
        this.logger = logger || noopLogger;
        if (logger instanceof CloudWatchLogger_1.CloudWatchLogger) {
            this.structuredLogger = logger;
        }
    }
    ChatCompletionsStreamController.prototype.handle = function (event, responseStream) {
        return __awaiter(this, void 0, void 0, function () {
            var requestId, startTime, authContext, tenantId, userId, authMethod, validatedBody, result, stream, durationMs, error_1, durationMs, tenantId, userId, authMethod;
            var _a, _b, _c, _d, _e, _f, _g;
            return __generator(this, function (_h) {
                switch (_h.label) {
                    case 0:
                        requestId = event.requestContext.requestId;
                        startTime = Date.now();
                        authContext = null;
                        _h.label = 1;
                    case 1:
                        _h.trys.push([1, 3, , 4]);
                        authContext = this.extractAuthenticationContext(event);
                        if (!authContext) {
                            this.writeJsonError(responseStream, 401, 'Unauthorized');
                            return [2 /*return*/];
                        }
                        tenantId = authContext.tenantId, userId = authContext.userId, authMethod = authContext.authMethod;
                        validatedBody = (0, validation_1.validateChatRequestBody)(event.body);
                        if (this.structuredLogger) {
                            this.structuredLogger.logRequest({
                                requestId: requestId,
                                tenantId: tenantId,
                                userId: userId,
                                path: event.path,
                                method: event.httpMethod,
                                authMethod: authMethod
                            });
                        }
                        this.logger.info('Streaming chat request received', {
                            tenantId: tenantId,
                            userId: userId,
                            requestId: requestId,
                            agentId: validatedBody.model,
                            messageCount: validatedBody.messages.length,
                            authMethod: authMethod
                        });
                        return [4 /*yield*/, this.useCase.execute({
                                tenantId: tenantId,
                                userId: userId,
                                agentId: validatedBody.model,
                                messages: validatedBody.messages,
                                requestId: requestId
                            })];
                    case 2:
                        result = _h.sent();
                        stream = this.createSSEStream(responseStream);
                        this.streamCompletion(stream, result);
                        durationMs = Date.now() - startTime;
                        if (this.structuredLogger) {
                            this.structuredLogger.logResponse({
                                requestId: requestId,
                                tenantId: tenantId,
                                userId: userId,
                                path: event.path,
                                statusCode: 200,
                                durationMs: durationMs,
                                authMethod: authMethod
                            });
                        }
                        this.logger.info('Streaming chat request completed', {
                            tenantId: tenantId,
                            userId: userId,
                            requestId: requestId,
                            agentId: validatedBody.model,
                            citedUrlCount: ((_c = (_b = (_a = result.choices[0]) === null || _a === void 0 ? void 0 : _a.message) === null || _b === void 0 ? void 0 : _b.cited_urls) === null || _c === void 0 ? void 0 : _c.length) || 0,
                            conversationId: result.id,
                            durationMs: durationMs,
                            authMethod: authMethod
                        });
                        return [3 /*break*/, 4];
                    case 3:
                        error_1 = _h.sent();
                        durationMs = Date.now() - startTime;
                        if (error_1 instanceof errors_1.ValidationError) {
                            this.logger.info('Validation error', {
                                requestId: requestId,
                                error: error_1.message,
                                durationMs: durationMs
                            });
                            this.writeJsonError(responseStream, 400, error_1.message);
                            return [2 /*return*/];
                        }
                        tenantId = (authContext === null || authContext === void 0 ? void 0 : authContext.tenantId) || ((_e = (_d = event.requestContext.authorizer) === null || _d === void 0 ? void 0 : _d.claims) === null || _e === void 0 ? void 0 : _e['custom:tenant_id']);
                        userId = (authContext === null || authContext === void 0 ? void 0 : authContext.userId) || ((_g = (_f = event.requestContext.authorizer) === null || _f === void 0 ? void 0 : _f.claims) === null || _g === void 0 ? void 0 : _g.sub);
                        authMethod = (authContext === null || authContext === void 0 ? void 0 : authContext.authMethod) || 'none';
                        if (this.structuredLogger && tenantId) {
                            this.structuredLogger.logErrorWithContext('Error in ChatCompletionsStreamController', error_1, {
                                requestId: requestId,
                                tenantId: tenantId,
                                userId: userId,
                                path: event.path,
                                method: event.httpMethod,
                                authMethod: authMethod
                            });
                        }
                        else {
                            this.logger.error('Error in ChatCompletionsStreamController', error_1, {
                                requestId: requestId,
                                path: event.path,
                                method: event.httpMethod,
                                tenantId: tenantId,
                                userId: userId,
                                durationMs: durationMs,
                                authMethod: authMethod
                            });
                        }
                        this.writeJsonError(responseStream, 500, 'Internal server error');
                        return [3 /*break*/, 4];
                    case 4: return [2 /*return*/];
                }
            });
        });
    };
    ChatCompletionsStreamController.prototype.createSSEStream = function (responseStream) {
        var streamWithHeaders = awslambda.HttpResponseStream.from(responseStream, {
            statusCode: 200,
            headers: (0, streaming_1.buildSSEHeaders)(cors_1.CORS_HEADERS)
        });
        streamWithHeaders.setContentType(streaming_1.SSE_HEADERS['Content-Type']);
        return streamWithHeaders;
    };
    ChatCompletionsStreamController.prototype.writeJsonError = function (responseStream, statusCode, message) {
        var stream = awslambda.HttpResponseStream.from(responseStream, {
            statusCode: statusCode,
            headers: __assign(__assign({}, cors_1.CORS_HEADERS), { 'Content-Type': 'application/json' })
        });
        stream.write(JSON.stringify({ error: { message: message } }));
        stream.end();
    };
    ChatCompletionsStreamController.prototype.streamCompletion = function (stream, result) {
        var _a;
        var choice = (_a = result.choices[0]) === null || _a === void 0 ? void 0 : _a.message;
        var content = (choice === null || choice === void 0 ? void 0 : choice.content) || '';
        var citedUrls = (choice === null || choice === void 0 ? void 0 : choice.cited_urls) || [];
        var created = Math.floor(Date.now() / 1000);
        var initialChunk = (0, sse_1.createInitialChunk)({ id: result.id, model: result.model, created: created });
        stream.write((0, sse_1.formatSseEvent)(initialChunk));
        this.chunkContent(content).forEach(function (chunk) {
            var payload = (0, sse_1.createContentChunk)({
                id: result.id,
                model: result.model,
                content: chunk,
                created: created
            });
            stream.write((0, sse_1.formatSseEvent)(payload));
        });
        var finalChunk = (0, sse_1.createFinalChunk)({ id: result.id, model: result.model, created: created });
        var finalDelta = finalChunk.choices[0].delta;
        if (citedUrls.length > 0) {
            finalDelta.cited_urls = citedUrls;
        }
        if (typeof (choice === null || choice === void 0 ? void 0 : choice.isRag) === 'boolean') {
            finalDelta.isRag = choice.isRag;
        }
        finalChunk.choices[0].delta = finalDelta;
        stream.write((0, sse_1.formatSseEvent)(finalChunk));
        stream.write(sse_1.SSE_DONE_EVENT);
        stream.end();
    };
    ChatCompletionsStreamController.prototype.chunkContent = function (content) {
        return (0, sse_1.splitAnswerIntoChunks)(content, streaming_1.STREAM_CHUNK_SIZE);
    };
    ChatCompletionsStreamController.prototype.extractAuthenticationContext = function (event) {
        var _a;
        var authorizerContext = event.requestContext.authorizer;
        if ((authorizerContext === null || authorizerContext === void 0 ? void 0 : authorizerContext.tenantId) && (authorizerContext === null || authorizerContext === void 0 ? void 0 : authorizerContext.userId)) {
            return {
                tenantId: authorizerContext.tenantId,
                userId: authorizerContext.userId,
                authMethod: 'apikey'
            };
        }
        var claims = authorizerContext === null || authorizerContext === void 0 ? void 0 : authorizerContext.claims;
        var tenantId = claims === null || claims === void 0 ? void 0 : claims['custom:tenant_id'];
        var userId = claims === null || claims === void 0 ? void 0 : claims.sub;
        var authHeader = (_a = Object.entries(event.headers || {}).find(function (_a) {
            var headerName = _a[0];
            return headerName.toLowerCase() === 'authorization';
        })) === null || _a === void 0 ? void 0 : _a[1];
        if (!tenantId || !userId) {
            var bearerToken = (authHeader === null || authHeader === void 0 ? void 0 : authHeader.startsWith('Bearer ')) ? authHeader.slice(7) : undefined;
            var decodedClaims = bearerToken ? this.decodeJwtWithoutVerification(bearerToken) : null;
            var decodedTenantId = decodedClaims === null || decodedClaims === void 0 ? void 0 : decodedClaims['custom:tenant_id'];
            var decodedUserId = decodedClaims === null || decodedClaims === void 0 ? void 0 : decodedClaims.sub;
            if (decodedTenantId && decodedUserId) {
                return { tenantId: decodedTenantId, userId: decodedUserId, authMethod: 'jwt' };
            }
        }
        if (tenantId && userId) {
            return { tenantId: tenantId, userId: userId, authMethod: 'jwt' };
        }
        var apiKey = (0, apiKey_1.extractApiKeyFromHeaders)(event.headers).apiKey;
        var expectedApiKey = process.env.TAVUS_API_KEY || process.env.TEST_API_KEY;
        var apiKeyIsValid = apiKey && (!expectedApiKey || apiKey === expectedApiKey);
        if (apiKeyIsValid) {
            return {
                tenantId: 'default',
                userId: 'default',
                authMethod: 'apikey'
            };
        }
        return null;
    };
    ChatCompletionsStreamController.prototype.decodeJwtWithoutVerification = function (token) {
        var parts = token.split('.');
        if (parts.length < 2) {
            return null;
        }
        try {
            var payload = Buffer.from(parts[1].replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf8');
            return JSON.parse(payload);
        }
        catch (_a) {
            return null;
        }
    };
    return ChatCompletionsStreamController;
}());
exports.ChatCompletionsStreamController = ChatCompletionsStreamController;
